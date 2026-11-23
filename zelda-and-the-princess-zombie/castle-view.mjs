import { terrainHeight } from './geography.mjs';
export function castleShelf(m, { tri }) {
  const xs = [-95, -61, -34, -11, 6, 20, 30, 40, 55, 73, 96, 123, 151],
    zs = [1230, 1300, 1360, 1392, 1412, 1432, 1480, 1540, 1565, 1606];
  for (let j = 0; j < zs.length - 1; j++)
    for (let i = 0; i < xs.length - 1; i++) {
      const point = (i, j) => [xs[i], terrainHeight(xs[i], zs[j]) - 0.14, zs[j]];
      const a = point(i, j),
        b = point(i + 1, j),
        c = point(i + 1, j + 1),
        d = point(i, j + 1);
      if (Math.max(a[1], b[1], c[1], d[1]) < 1.2) continue;
      const ink = Math.abs(xs[i] - 30) < 28 ? '788366' : ['737c6d', '828779', '879083'][(i + j) % 3];
      tri(m, a, b, d, ink);
      tri(m, b, c, d, ink);
    }
}
// The far castle is a cached raster of the same crag, towers, windows and
// gateway approached on foot. Capture angle and distance follow the observer;
// a turn of the camera does not trigger a geometry rebuild.
export function createCastleView(meshes) {
  const cache = new Map(),
    center = [30, 55, 1482];
  function bake(yaw, pitch, dist) {
    const sy = Math.sin(yaw),
      cy = Math.cos(yaw),
      sp = Math.sin(pitch),
      cp = Math.cos(pitch);
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    const faces = [];
    for (const mesh of meshes)
      for (let i = 0; i < mesh.length; i += 18) {
        const v = [];
        let depth = 0;
        for (let n = i; n < i + 18; n += 6) {
          const x = mesh[n] - center[0],
            y = mesh[n + 1] - center[1],
            z = mesh[n + 2] - center[2],
            f = x * sy + z * cy,
            d = dist + f * cp + y * sp,
            u = ((x * cy - z * sy) * dist) / d,
            h = ((y * cp - f * sp) * dist) / d;
          if (d < 1) break;
          v.push(u, -h);
          depth += d;
        }
        if (v.length < 6) continue;
        x0 = Math.min(x0, v[0], v[2], v[4]);
        x1 = Math.max(x1, v[0], v[2], v[4]);
        y0 = Math.min(y0, v[1], v[3], v[5]);
        y1 = Math.max(y1, v[1], v[3], v[5]);
        const fog = Math.min(0.52, (1 - Math.exp(-dist * 0.0012)) * 0.63);
        const c = [0.63, 0.68, 0.67].map((air, j) => ((mesh[i + 3 + j] * (1 - fog) + air * fog) * 255) | 0);
        faces.push({ v, d: depth, ink: 'rgb(' + c.join(',') + ')' });
      }
    const scale = 1.33,
      cv = document.createElement('canvas');
    cv.width = Math.ceil((x1 - x0) * scale) + 4;
    cv.height = Math.ceil((y1 - y0) * scale) + 4;
    const c = cv.getContext('2d');
    c.setTransform(scale, 0, 0, scale, 2 - x0 * scale, 2 - y0 * scale);
    faces.sort((a, b) => b.d - a.d);
    for (const { v, ink } of faces) {
      c.beginPath();
      c.moveTo(v[0], v[1]);
      c.lineTo(v[2], v[3]);
      c.lineTo(v[4], v[5]);
      c.closePath();
      c.fillStyle = ink;
      c.fill();
    }
    return { cv, x0: x0 - 2 / scale, y0: y0 - 2 / scale, w: cv.width / scale, h: cv.height / scale };
  }
  return function draw(ray, queue, p, eye, f) {
    const at = ray(...center);
    if (!at) return;
    const dx = center[0] - p.x,
      dz = center[2] - p.z,
      d = Math.hypot(dx, dz);
    const angle = Math.round(Math.atan2(dx, dz) * 18) / 18,
      pitch = Math.round(Math.atan2(center[1] - eye, d) * 24) / 24,
      dist = Math.max(205, Math.round(d / 45) * 45),
      k = [angle, pitch, dist].join('/');
    let b = cache.get(k);
    if (!b) {
      b = bake(angle, pitch, dist);
      if (cache.size > 14) cache.delete(cache.keys().next().value);
      cache.set(k, b);
    }
    const scale = f / at[2],
      x = at[0] + b.x0 * scale,
      y = at[1] + b.y0 * scale;
    queue.push({ d: at[2], draw: (c) => c.drawImage(b.cv, x, y, b.w * scale, b.h * scale) });
  };
}
