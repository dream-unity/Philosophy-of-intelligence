import { castleAltitude } from './geography.mjs';
// The great hall stands within the outer curtain wall. Eye, lights, dining table,
// doorway and all painted surfaces use the same metre coordinates as the overworld.
const west = 8,
  east = 52,
  south = 1466,
  north = 1530;
const floor = 0.17,
  ceiling = 13.7,
  openingL = 24,
  openingR = 36,
  lintel = 7.6;
const artURL = new URL('./hall.webp', import.meta.url).href;
export function insideHall(x, z) {
  return x > west && x < east && z > south && z < north;
}
export function hallWalkable(x, z) {
  const radius = 0.4;
  if (
    z >= south - radius &&
    z <= north + radius &&
    (Math.abs(x - west) < radius || Math.abs(x - east) < radius)
  )
    return false;
  if (x >= west - radius && x <= east + radius && Math.abs(z - north) < radius) return false;
  if (
    x >= west - radius &&
    x <= east + radius &&
    Math.abs(z - south) < radius &&
    (x < openingL + radius || x > openingR - radius)
  )
    return false;
  return !(x > 30.38 && x < 32.96 && z > 1515.45 && z < 1518.62);
}
function wax(m, g, x, y, z, scale = 1) {
  const { rings, beam } = g,
    r = 0.066 * scale;
  rings(
    m,
    [
      [x, y, z, r * 1.1],
      [x, y + 0.27 * scale, z, r],
      [x, y + 0.31 * scale, z, r * 0.84],
    ],
    7,
    'e9cda1'
  );
  beam(m, [x, y + 0.295 * scale, z], [x, y + 0.42 * scale, z], 0.038 * scale, 0.002, 'ffc267', 6);
  beam(m, [x, y + 0.32 * scale, z], [x, y + 0.39 * scale, z], 0.019 * scale, 0.002, 'fff3d2', 5);
}
export function bellSwing(w, t = w.elapsed) {
  if (w.ropeFallen) return 0;
  // Three pulls pivot the bronze body on the crossbeam. Each strike rings down.
  const dt = (((t - 6) % 37) + 37) % 37;
  let a = 0;
  for (const delay of [0, 0.46, 0.92]) {
    const d = dt - delay;
    if (d >= 0 && d < 3.6) a += 0.27 * Math.sin(d * 11.6) * Math.exp(-d * 2.3);
  }
  return Math.round(a * 50) / 50;
}
export function makeHangingBell(m, g, angle = 0) {
  const { beam, rings } = g,
    X = 30.46,
    Z = 1516.08,
    start = m.length;
  beam(m, [X, 6.13, Z], [X, 5.64, Z], 0.052, 0.052, '8c7253', 7);
  rings(
    m,
    [
      [X, 4.28, Z, 0.83],
      [X, 4.39, Z, 0.88],
      [X, 4.51, Z, 0.71],
      [X, 4.94, Z, 0.55],
      [X, 5.47, Z, 0.41],
      [X, 5.61, Z, 0.19],
      [X, 5.69, Z, 0.104],
    ],
    14,
    (row, k) => (k % 4 === 1 ? 'ad8554' : row <= 2 ? '956e43' : '7f5d3c'),
    0.12
  );
  rings(
    m,
    [
      [X, 4.32, Z, 0.867],
      [X, 4.365, Z, 0.892],
    ],
    14,
    'c79c60'
  );
  beam(m, [X, 4.48, Z], [X, 4.16, Z], 0.044, 0.093, '51402d', 7);

  const ca = Math.cos(angle),
    sa = Math.sin(angle);
  for (let i = start; i < m.length; i += 6) {
    const x = m[i] - X,
      y = m[i + 1] - 6.13;
    m[i] = X + ca * x - sa * y;
    m[i + 1] = castleAltitude + 6.13 + sa * x + ca * y;
  }
}
export function bellAnchorOffset(angle) {
  const y = 4.18 - 6.13;
  return [-Math.sin(angle) * y, (Math.cos(angle) - 1) * y, 0];
}
export function makeHallProps(m, g) {
  const { box, beam, rings, quad } = g;
  // A narrow woven runner joins the arch to the banquet. Its gold border and
  // repeating medallions are laid on the floor in metres, with normal parallax.
  for (let z = south + 0.3, course = 0; z < 1514.3; z += 2, course++) {
    const h = floor + 0.021,
      n = z + 2,
      x = 30;
    quad(
      m,
      [x - 1.17, h, z],
      [x - 1.17, h, n],
      [x + 1.17, h, n],
      [x + 1.17, h, z],
      course % 2 ? '354453' : '374655',
      false
    );
    for (const side of [-1, 1]) {
      const edge = x + side * 1.055;
      quad(
        m,
        [edge - 0.025, h + 0.006, z],
        [edge - 0.025, h + 0.006, n],
        [edge + 0.025, h + 0.006, n],
        [edge + 0.025, h + 0.006, z],
        'a38e61',
        false
      );
    }
    if (course % 2 === 0) {
      const mid = z + 1;
      quad(
        m,
        [x - 0.29, h + 0.009, mid],
        [x, h + 0.009, mid + 0.36],
        [x + 0.29, h + 0.009, mid],
        [x, h + 0.009, mid - 0.36],
        '8d7e56',
        false
      );
      quad(
        m,
        [x - 0.18, h + 0.011, mid],
        [x, h + 0.011, mid + 0.22],
        [x + 0.18, h + 0.011, mid],
        [x, h + 0.011, mid - 0.22],
        '46505a',
        false
      );
    }
  }
  // Black-oak trestle table beside Xero, with silver trenchers and a blue runner.
  const tx = 31.66,
    tz = 1517.03;
  box(m, tx, 0.87, tz, 2.62, 0.13, 3.18, '64412d');
  for (let i = 0; i < 5; i++)
    box(m, tx - 1.03 + i * 0.515, 0.997, tz, 0.5, 0.025, 3.12, i % 2 ? '805537' : '734d34');
  box(m, tx + 0.12, 1.019, tz, 0.55, 0.016, 3.2, '354967');
  for (const s of [-1, 1]) {
    const zz = tz + s * 1.08;
    box(m, tx, 0.19, zz, 2.13, 0.16, 0.26, '4b3227');
    for (const v of [-1, 1])
      beam(m, [tx + v * 0.83, 0.23, zz], [tx + v * 0.55, 0.9, zz], 0.115, 0.118, '67442d', 6);
    box(m, tx, 0.77, zz, 2.28, 0.13, 0.24, '714c31');
  }
  box(m, tx, 0.46, tz, 0.18, 0.17, 2.58, '543a2a');
  for (const [dx, dz] of [
    [0.85, -0.96],
    [-0.8, 1.05],
    [0.86, 0.93],
  ]) {
    rings(
      m,
      [
        [tx + dx, 1.025, tz + dz, 0.18],
        [tx + dx, 1.048, tz + dz, 0.245],
        [tx + dx, 1.066, tz + dz, 0.24],
      ],
      10,
      'a8987f'
    );
  }
  const X = 30.46,
    Z = 1516.08;
  beam(m, [X, ceiling - 0.25, Z], [X, 6.23, Z], 0.029, 0.029, '4a3b2d', 5);
  beam(m, [X - 1.35, 6.19, Z], [X + 1.35, 6.19, Z], 0.13, 0.13, '694930', 6);
  for (const [cx, cz] of [
    [27.35, 1516.8],
    [34.5, 1518.5],
    [18.4, 1492],
    [41.5, 1495],
  ]) {
    rings(
      m,
      [
        [cx, 0.18, cz, 0.33],
        [cx, 0.28, cz, 0.37],
        [cx, 0.42, cz, 0.135],
        [cx, 1.49, cz, 0.065],
        [cx, 1.56, cz, 0.15],
      ],
      8,
      '947342'
    );
    for (const side of [-1, 0, 1]) {
      const xx = cx + side * 0.3,
        yy = 1.7 + (side === 0 ? 0.21 : 0);
      if (side) beam(m, [cx, 1.39, cz], [xx, yy, cz], 0.035, 0.044, 'ae8352', 6);
      else beam(m, [cx, 1.5, cz], [xx, yy, cz], 0.048, 0.064, 'b49462', 6);
      rings(
        m,
        [
          [xx, yy - 0.05, cz, 0.068],
          [xx, yy, cz, 0.115],
          [xx, yy + 0.045, cz, 0.094],
        ],
        8,
        'b89b61'
      );
      wax(m, g, xx, yy + 0.04, cz, 1.22);
    }
  }
  // A living structure: rafters traverse the chamber rather than hovering behind it.
  for (let z = 1474; z <= 1524; z += 12) {
    for (const side of [-1, 1]) {
      const x = 30 + side * 21.74;
      beam(m, [x, 8.4, z], [x - side * 5.5, 12.15, z], 0.22, 0.17, '46342a', 6);
      beam(m, [x - side * 3.3, 11.05, z], [x - side * 3.3, 13.58, z], 0.155, 0.14, '584231', 5);
      beam(m, [x, 12.7, z], [30, 13.55, z], 0.19, 0.17, '4e382d', 6);
    }
  }
}
export function makeHall(m, g) {
  const { box, beam, tri, quad } = g;
  box(m, 30, -0.03, (south + north) / 2, 44, 0.17, north - south, '5d514c');
  box(m, west - 0.19, 0.08, (south + north) / 2, 0.38, ceiling, north - south, '605552');
  box(m, east + 0.19, 0.08, (south + north) / 2, 0.38, ceiling, north - south, '605552');
  box(m, 30, 0.08, north + 0.16, 44, ceiling, 0.32, '665a55');
  for (const [x, w] of [
    [16, 16],
    [44, 16],
  ])
    box(m, x, 0.08, south - 0.1, w, ceiling, 0.21, '726765');
  box(m, 30, lintel, south - 0.12, 12.2, ceiling - lintel, 0.28, '726765');
  for (const sign of [-1, 1]) {
    const x = 30 + sign * 6.1;
    box(m, x, 0.11, south - 0.45, 0.7, 7.6, 0.75, '9c9185');
    beam(m, [x, 7.04, south - 0.45], [30 + sign * 2.85, 9.65, south - 0.45], 0.42, 0.38, 'b0a296', 6);
    beam(m, [30 + sign * 2.85, 9.65, south - 0.45], [30, 10.45, south - 0.45], 0.39, 0.36, 'a99d92', 6);
  }
  // Steep slate roof visible from the gate and hills outside.
  const ridge = 20.6;
  for (const side of [-1, 1]) {
    const x = 30 + side * 22.5;
    quad(
      m,
      [x, ceiling + 0.1, south - 0.45],
      [30, ridge, south - 0.45],
      [30, ridge, north + 0.4],
      [x, ceiling + 0.1, north + 0.4],
      side === 1 ? '575562' : '454653'
    );
  }
  for (const z of [south - 0.43, north + 0.36])
    tri(m, [west, ceiling, z], [east, ceiling, z], [30, ridge, z], '665951');
  makeHallProps(m, g);
}
// These rectangles refer to regions of the painted interior atlas. Both renderers
// traverse precisely the same wall panels and flagstone repeats.
const roomPanels = [];
function panel(a, b, c, d, uv) {
  roomPanels.push({ a, b, c, d, uv });
}
const floorUV = [0.17, 0.976, 0.64, 0.768],
  roofUV = [0.12, 0.03, 0.45, 0.19];
const sideUV = [0.022, 0.633, 0.239, 0.101],
  northUV = [0.175, 0.634, 0.825, 0.062];
for (let x = west; x < east; x += 11)
  for (let z = south; z < north; z += 8) {
    const flipX = (x - west) % 22 !== 0,
      flipZ = (z - south) % 16 !== 0;
    for (const [level, crop] of [
      [floor, floorUV],
      [ceiling, roofUV],
    ]) {
      const [u0, v0, u1, v1] = crop;
      panel(
        [x, level, z],
        [x + 11, level, z],
        [x + 11, level, z + 8],
        [x, level, z + 8],
        [flipX ? u1 : u0, flipZ ? v1 : v0, flipX ? u0 : u1, flipZ ? v0 : v1]
      );
    }
  }
for (const x of [west + 0.018, east - 0.018])
  for (let z = south; z < north; z += 8) {
    const f = (z - south) % 16 === 0;
    panel(
      [x, floor, z],
      [x, floor, z + 8],
      [x, ceiling, z + 8],
      [x, ceiling, z],
      [f ? sideUV[0] : sideUV[2], sideUV[1], f ? sideUV[2] : sideUV[0], sideUV[3]]
    );
  }
function endPanel(x0, x1, y0, y1, z, uv) {
  panel([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], uv);
}
endPanel(west, east, floor, ceiling, north - 0.03, northUV);
endPanel(west, openingL, floor, ceiling, south + 0.03, sideUV);
endPanel(openingR, east, floor, ceiling, south + 0.03, [sideUV[2], sideUV[1], sideUV[0], sideUV[3]]);
endPanel(openingL, openingR, lintel, ceiling, south + 0.03, [0.28, 0.335, 0.72, 0.054]);
export function hallSurfaceVertices() {
  const points = [];
  for (const {
    a,
    b,
    c,
    d,
    uv: [u0, v0, u1, v1],
  } of roomPanels) {
    for (const [pt, u, v] of [
      [a, u0, v0],
      [b, u1, v0],
      [c, u1, v1],
      [a, u0, v0],
      [c, u1, v1],
      [d, u0, v1],
    ])
      points.push(pt[0], pt[1] + castleAltitude, pt[2], u, v, 1);
  }
  return new Float32Array(points);
}
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const mirror = (n) => 1 - Math.abs((((n % 2) + 2) % 2) - 1);
export function createHallPainter() {
  const image = new Image();
  image.decoding = 'async';
  let source = null,
    textureWidth = 0,
    textureHeight = 0,
    canvas = null,
    offscreen = null,
    pixels = null,
    output = null;
  let lastView = [],
    columns = null,
    rows = null,
    quality = 1,
    slowFrames = 0,
    fastFrames = 0,
    pixelsUnavailable = false;
  function unpack() {
    if (source) return true;
    if (pixelsUnavailable || !image.complete || !image.naturalWidth) return false;
    const sheet = document.createElement('canvas');
    sheet.width = image.naturalWidth;
    sheet.height = image.naturalHeight;
    try {
      const context = sheet.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      source = new Uint32Array(context.getImageData(0, 0, sheet.width, sheet.height).data.buffer);
      textureWidth = sheet.width;
      textureHeight = sheet.height;
    } catch {
      pixelsUnavailable = true;
    }
    sheet.width = sheet.height = 1;
    return Boolean(source);
  }
  image.src = artURL;
  function draw(ctx, W, H, world, ray, queue) {
    const p = world.player;
    if (!insideHall(p.x, p.z) || !unpack()) return false;
    const target = world.renderQuality === 'low' ? 0.58 : world.renderQuality === 'high' ? 1 : quality;
    const scale = Math.min(1, 568 / W, 332 / H) * target,
      sw = Math.max(2, Math.round(W * scale)),
      sh = Math.max(2, Math.round(H * scale));
    const f = H * 0.685;
    if (!canvas || canvas.width !== sw || canvas.height !== sh) {
      canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      offscreen = canvas.getContext('2d');
      pixels = offscreen.createImageData(sw, sh);
      output = new Uint32Array(pixels.data.buffer);
      columns = Float32Array.from({ length: sw }, (_, x) => (((x + 0.5) / sw - 0.5) * W) / f);
      rows = Float32Array.from({ length: sh }, (_, y) => ((0.5 - (y + 0.5) / sh) * H) / f);
      lastView = [];
    }
    const view = [p.x, p.z, p.yaw, p.pitch || 0, W / H];
    const changed = view.some((value, i) => value !== lastView[i]);
    if (changed) {
      const started = performance.now();
      const sy = Math.sin(view[2]),
        cy = Math.cos(view[2]),
        sp = Math.sin(view[3]),
        cp = Math.cos(view[3]);
      const eyeY = (p.feetY ?? castleAltitude + 0.17) - castleAltitude + 1.66;
      for (let y = 0, i = 0; y < sh; y++) {
        const front = cp - rows[y] * sp,
          ry = sp + rows[y] * cp;
        const yHit = ry < 0 ? (floor - eyeY) / ry : (ceiling - eyeY) / ry;
        for (let x = 0; x < sw; x++, i++) {
          const dx = front * sy + columns[x] * cy,
            dz = front * cy - columns[x] * sy;
          const xHit = ((dx < 0 ? west : east) - p.x) / dx;
          const zHit = ((dz < 0 ? south : north) - p.z) / dz;
          let a, b, crop;
          if (yHit <= xHit && yHit <= zHit) {
            a = mirror((p.x + dx * yHit - west) / 11);
            b = mirror((p.z + dz * yHit - south) / 8);
            crop = ry < 0 ? floorUV : roofUV;
          } else if (xHit < zHit) {
            a = mirror((p.z + dz * xHit - south) / 8);
            b = clamp((eyeY + ry * xHit - floor) / (ceiling - floor), 0, 1);
            crop = sideUV;
          } else {
            const hitX = p.x + dx * zHit,
              hitY = eyeY + ry * zHit;
            b = clamp((hitY - floor) / (ceiling - floor), 0, 1);
            if (dz > 0) {
              a = clamp((hitX - west) / (east - west), 0, 1);
              crop = northUV;
            } else if (hitX > openingL && hitX < openingR) {
              if (hitY < lintel) {
                output[i] = 0;
                continue;
              }
              a = (hitX - openingL) / (openingR - openingL);
              b = (hitY - lintel) / (ceiling - lintel);
              crop = lintelUV;
            } else {
              a = hitX < openingL ? (hitX - west) / (openingL - west) : (east - hitX) / (east - openingR);
              crop = sideUV;
            }
          }
          const u = (crop[0] + (crop[2] - crop[0]) * a) * textureWidth;
          const v = (crop[1] + (crop[3] - crop[1]) * b) * textureHeight;
          output[i] = source[(v | 0) * textureWidth + (u | 0)];
        }
      }
      offscreen.putImageData(pixels, 0, 0);
      lastView = view;
      const cost = performance.now() - started;
      if (cost > 16) {
        slowFrames++;
        fastFrames = 0;
      } else {
        slowFrames = Math.max(0, slowFrames - 1);
        fastFrames = cost < 11 ? fastFrames + 1 : 0;
      }
      if (fastFrames > 58 && quality < 1) {
        quality = Math.min(1, quality + 0.075);
        fastFrames = 0;
      }
      if (slowFrames > 3 && quality > 0.72) {
        quality = Math.max(0.7, quality - 0.12);
        slowFrames = 0;
      }
    }
    ctx.drawImage(canvas, 0, 0, W, H);
    if (queue && ray) {
      const flicker = 0.92 + 0.08 * Math.sin(world.elapsed * 7.8);
      for (const [x, z] of [
        [27.35, 1516.8],
        [34.5, 1518.5],
        [18.4, 1492],
        [41.5, 1495],
      ]) {
        const pt = ray(x, castleAltitude + 2.16, z);
        if (pt && pt[0] > -W * 0.1 && pt[0] < W * 1.1 && pt[1] > -H * 0.1 && pt[1] < H * 1.1)
          queue.push({
            glow: true,
            x: pt[0],
            y: pt[1],
            r: clamp(((f * 0.28) / pt[2]) * flicker, 1, 35),
            d: pt[2] - 0.06,
          });
      }
    }
    return true;
  }
  function dispose() {
    image.onload = null;
    source = null;
    canvas = null;
    pixels = null;
    output = null;
  }
  return { draw, dispose };
}
const lintelUV = [0.28, 0.335, 0.72, 0.054];
