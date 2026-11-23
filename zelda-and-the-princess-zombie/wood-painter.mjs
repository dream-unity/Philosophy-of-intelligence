// Canvas rasterizes the same solid trunk and roots as WebGL. One depth-tested cutout per
// visible tree avoids issuing hundreds of native canvas paths while the player turns.
const prepared = new WeakMap();
function topology(mesh) {
  if (prepared.has(mesh)) return prepared.get(mesh);
  const index = new Map(),
    points = [],
    faces = [];
  for (let k = 0; k < mesh.length; k += 18) {
    const ids = [];
    for (const n of [k, k + 6, k + 12]) {
      const tag = mesh[n] + ',' + mesh[n + 1] + ',' + mesh[n + 2];
      let i = index.get(tag);
      if (i == null) {
        i = points.length;
        points.push(mesh.slice(n, n + 3));
        index.set(tag, i);
      }
      ids.push(i);
    }
    const [p, q, r] = ids.map((i) => points[i]);
    const e = q.map((n, i) => n - p[i]),
      f = r.map((n, i) => n - p[i]);
    const nx = Math.abs(e[1] * f[2] - e[2] * f[1]),
      ny = Math.abs(e[2] * f[0] - e[0] * f[2]),
      nz = Math.abs(e[0] * f[1] - e[1] * f[0]);
    const uv = [p, q, r].map((v) => [nx > nz ? v[2] : v[0], ny > nx && ny > nz ? v[2] : -v[1]]);
    faces.push({ ids, uv, ink: mesh.slice(k + 3, k + 6).map((n) => Math.round(n * 255)) });
  }
  const model = { points, faces };
  prepared.set(mesh, model);
  return model;
}
export function createWoodPainter() {
  const pool = [];
  let active = 0,
    grain;
  function material(texture) {
    if (grain || !texture?.complete || !texture.naturalWidth) return;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(texture, 0, 0, 128, 128);
    const rgba = ctx.getImageData(0, 0, 128, 128).data;
    grain = new Uint8Array(128 * 128);
    for (let i = 0; i < grain.length; i++) grain[i] = rgba[4 * i] * 0.32 + rgba[4 * i + 1] * 0.55 + rgba[4 * i + 2] * 0.13;
  }
  function draw(queue, ray, mesh, t, angle, base, texture, W, H, detail) {
    const model = topology(mesh),
      c = Math.cos(angle) * t.h,
      s = Math.sin(angle) * t.h;
    const visible = model.points.map((v) => ray(t.x + v[0] * c + v[2] * s, base + v[1] * t.h, t.z - v[0] * s + v[2] * c));
    let x0 = W,
      x1 = 0,
      y0 = H,
      y1 = 0,
      centreZ = 0,
      n = 0;
    for (const v of visible) {
      if (!v) continue;
      x0 = Math.min(x0, v[0]);
      x1 = Math.max(x1, v[0]);
      y0 = Math.min(y0, v[1]);
      y1 = Math.max(y1, v[1]);
      centreZ += v[2];
      n++;
    }
    x0 = Math.max(0, Math.floor(x0));
    y0 = Math.max(0, Math.floor(y0));
    x1 = Math.min(W, Math.ceil(x1));
    y1 = Math.min(H, Math.ceil(y1));
    const sw = x1 - x0,
      sh = y1 - y0;
    if (!n || sw < 1 || sh < 1) return;
    material(texture);
    const factor = Math.min(1, (detail < 0.7 ? 128 : 228) / Math.max(sw, sh));
    const w = Math.max(1, Math.round(sw * factor)),
      h = Math.max(1, Math.round(sh * factor)),
      sx = w / sw,
      sy = h / sh;
    let item = pool[active];
    if (!item) {
      const cv = document.createElement('canvas');
      item = { cv, ctx: cv.getContext('2d') };
      pool[active] = item;
    }
    active++;
    if (!item.img || w > item.cv.width || h > item.cv.height) {
      item.cv.width = Math.ceil(w / 32) * 32;
      item.cv.height = Math.ceil(h / 32) * 32;
      item.img = item.ctx.createImageData(item.cv.width, item.cv.height);
      item.z = new Float32Array(item.cv.width * item.cv.height);
      item.raw = new Uint32Array(item.img.data.buffer);
    }
    const stride = item.cv.width,
      raw = item.raw,
      depth = item.z;
    raw.fill(0, 0, stride * h);
    depth.fill(0, 0, stride * h);
    const v = visible.map((p) => p && [(p[0] - x0) * sx, (p[1] - y0) * sy, 1 / p[2]]);
    for (const { ids, uv, ink } of model.faces) {
      const a = v[ids[0]],
        b = v[ids[1]],
        c = v[ids[2]];
      if (!a || !b || !c) continue;
      const dx = b[0] - a[0],
        dy = b[1] - a[1],
        ex = c[0] - a[0],
        ey = c[1] - a[1],
        det = dx * ey - dy * ex;
      if (Math.abs(det) < 0.18) continue;
      const minX = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))),
        maxX = Math.min(w - 1, Math.ceil(Math.max(a[0], b[0], c[0]))),
        minY = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))),
        maxY = Math.min(h - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
      const ix = ey / det,
        iy = -ex / det,
        jx = -dy / det,
        jy = dx / det,
        z0 = a[2],
        zi = b[2] - z0,
        zj = c[2] - z0;
      const tile = t.h * 82,
        u0 = uv[0][0] * tile,
        ui = (uv[1][0] - uv[0][0]) * tile,
        uj = (uv[2][0] - uv[0][0]) * tile,
        v0 = uv[0][1] * tile,
        vi = (uv[1][1] - uv[0][1]) * tile,
        vj = (uv[2][1] - uv[0][1]) * tile;
      for (let y = minY; y <= maxY; y++) {
        let bi = (minX + 0.5 - a[0]) * ix + (y + 0.5 - a[1]) * iy,
          bj = (minX + 0.5 - a[0]) * jx + (y + 0.5 - a[1]) * jy,
          at = y * stride + minX;
        for (let x = minX; x <= maxX; x++, bi += ix, bj += jx, at++) {
          if (bi < -0.002 || bj < -0.002 || bi + bj > 1.002) continue;
          const z = z0 + bi * zi + bj * zj;
          if (z <= depth[at]) continue;
          depth[at] = z;
          const g = grain ? grain[(((v0 + bi * vi + bj * vj) | 0) & 127) * 128 + (((u0 + bi * ui + bj * uj) | 0) & 127)] : 95;
          const light = 0.52 + g * 0.0061,
            R = Math.min(255, ink[0] * light) | 0,
            G = Math.min(255, ink[1] * light) | 0,
            B = Math.min(255, ink[2] * light) | 0;
          raw[at] = (0xff000000 | (B << 16) | (G << 8) | R) >>> 0;
        }
      }
    }
    item.ctx.putImageData(item.img, 0, 0, 0, 0, w, h);
    queue.push({
      d: centreZ / n,
      draw(ctx) {
        ctx.drawImage(item.cv, 0, 0, w, h, x0, y0, sw, sh);
      },
    });
  }
  return {
    begin() {
      active = 0;
    },
    draw,
  };
}
