// Compile indexed, spatially bounded geometry once. A carved window covering
// twelve screen pixels should not transform every stone in the opposite tower.
const compiled = new WeakMap();
function material(r, g, b) {
  return (
    'rgb(' +
    Math.min(255, (r * 255) | 0) +
    ',' +
    Math.min(255, (g * 255) | 0) +
    ',' +
    Math.min(255, (b * 255) | 0) +
    ')'
  );
}
export function prepareSoftwareMesh(mesh) {
  if (compiled.has(mesh)) return compiled.get(mesh);
  const cells = new Map(),
    limit = mesh.length > 3000 ? 10 : 3000;
  for (let i = 0; i < mesh.length; i += 18) {
    const cx = (mesh[i] + mesh[i + 6] + mesh[i + 12]) / 3,
      cz = (mesh[i + 2] + mesh[i + 8] + mesh[i + 14]) / 3;
    const key = Math.floor(cx / limit) + ',' + Math.floor(cz / limit);
    let cell = cells.get(key);
    if (!cell) {
      cell = {
        xyz: [],
        lookup: new Map(),
        faces: [],
        colours: [],
        patinas: [],
        min: [Infinity, Infinity, Infinity],
        max: [-Infinity, -Infinity, -Infinity],
      };
      cells.set(key, cell);
    }
    const ids = [];
    for (const j of [i, i + 6, i + 12]) {
      const x = mesh[j],
        y = mesh[j + 1],
        z = mesh[j + 2],
        key = x + ',' + y + ',' + z;
      let idx = cell.lookup.get(key);
      if (idx === undefined) {
        idx = cell.xyz.length / 3;
        cell.xyz.push(x, y, z);
        cell.lookup.set(key, idx);
        cell.min[0] = Math.min(x, cell.min[0]);
        cell.max[0] = Math.max(x, cell.max[0]);
        cell.min[1] = Math.min(y, cell.min[1]);
        cell.max[1] = Math.max(y, cell.max[1]);
        cell.min[2] = Math.min(z, cell.min[2]);
        cell.max[2] = Math.max(z, cell.max[2]);
      }
      ids.push(idx);
    }
    cell.faces.push(...ids);
    cell.colours.push(material(mesh[i + 3], mesh[i + 4], mesh[i + 5]));
    let uv = null;
    if (
      mesh[i + 2] > 1375 &&
      mesh[i + 2] < 1570 &&
      Math.max(mesh[i + 3], mesh[i + 4], mesh[i + 5]) - Math.min(mesh[i + 3], mesh[i + 4], mesh[i + 5]) <
        0.085
    ) {
      const a = [mesh[i], mesh[i + 1], mesh[i + 2]],
        b = [mesh[i + 6], mesh[i + 7], mesh[i + 8]],
        c = [mesh[i + 12], mesh[i + 13], mesh[i + 14]];
      const d = b.map((n, j) => n - a[j]),
        e = c.map((n, j) => n - a[j]);
      const nx = Math.abs(d[1] * e[2] - d[2] * e[1]),
        ny = Math.abs(d[2] * e[0] - d[0] * e[2]),
        nz = Math.abs(d[0] * e[1] - d[1] * e[0]);
      uv = [a, b, c].map((p) =>
        nx > nz && nx > ny
          ? [p[2] * 54, p[1] * 54]
          : ny > nz
            ? [p[0] * 54, p[2] * 54]
            : [p[0] * 54, p[1] * 54]
      );
    }
    cell.patinas.push(uv);
  }
  for (const cell of cells.values()) {
    cell.center = cell.max.map((v, i) => (v + cell.min[i]) * 0.5);
    cell.r = Math.hypot(...cell.max.map((v, i) => (v - cell.min[i]) * 0.5));
    cell.view = Array(cell.xyz.length / 3);
    cell.lookup = null;
    cell.xyz = Float32Array.from(cell.xyz);
    cell.faces = Uint32Array.from(cell.faces);
  }
  const data = Array.from(cells.values());
  compiled.set(mesh, data);
  return data;
}
export function paintSoftwareMesh(scene, mesh, x = 0, y = 0, z = 0, rot = 0, scale = 1, own = false) {
  if (!mesh) return;
  const { ray, visible, path, W, H } = scene,
    c = Math.cos(rot),
    s = Math.sin(rot);
  for (const cell of prepareSoftwareMesh(mesh)) {
    const p = cell.center,
      cx = x + (p[0] * c + p[2] * s) * scale,
      cz = z + (-p[0] * s + p[2] * c) * scale;
    if (!own && !visible(cx, y + p[1] * scale, cz, cell.r * scale)) continue;
    const { xyz, view, faces, colours } = cell;
    for (let j = 0, k = 0; j < xyz.length; j += 3, k++) {
      const xx = xyz[j],
        zz = xyz[j + 2];
      view[k] = ray(
        x + (xx * c + zz * s) * scale,
        y + xyz[j + 1] * scale,
        z + (-xx * s + zz * c) * scale,
        own
      );
    }
    for (let j = 0, k = 0; j < faces.length; j += 3, k++) {
      const a = view[faces[j]],
        b = view[faces[j + 1]],
        d = view[faces[j + 2]];
      if (!a || !b || !d) continue;
      if (
        (a[0] < 0 && b[0] < 0 && d[0] < 0) ||
        (a[0] > W && b[0] > W && d[0] > W) ||
        (a[1] < 0 && b[1] < 0 && d[1] < 0) ||
        (a[1] > H && b[1] > H && d[1] > H)
      )
        continue;
      if (Math.abs((b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0])) < 0.16) continue;
      const depth = (a[2] + b[2] + d[2]) / 3,
        area = Math.abs((b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]));
      path([a, b, d], colours[k], depth, depth < 70 && area > 150 ? cell.patinas[k] : null);
    }
  }
}
