// One tree survey drives the woody mesh, the roots which stop actors, and the crown.
const tau = Math.PI * 2;
const frac = (n) => n - Math.floor(n);
const hash = (n) => frac(Math.sin(n * 17.317 + 19.51) * 37291.71);
const shapes = new Map();

export function treeSpecies(t) {
  const v = t.variant ?? Math.abs(t.seed * 17) % 11;
  return t.oak ? (v === 1 ? 'hollow' : v === 2 ? 'birch' : 'oak') : v === 1 || v === 3 ? 'cedar' : 'pine';
}
export const treeForm = (t) => treeSpecies(t) + '-' + (Math.abs(t.seed) % 3);
export const treeTurn = (t) => hash(t.seed + 1.37) * tau;
export function treeTrunkRadius(t) {
  const k = treeSpecies(t);
  return t.h * (k === 'oak' ? 0.055 : k === 'hollow' ? 0.064 : k === 'birch' ? 0.032 : 0.026);
}

function formFor(t) {
  const key = treeForm(t);
  if (shapes.has(key)) return shapes.get(key);
  const species = treeSpecies(t),
    broad = t.oak,
    variation = Math.abs(t.seed) % 3;
  const radius = treeTrunkRadius(t) / t.h,
    roots = [],
    branches = [],
    crowns = [];
  const n = broad ? 5 : 4,
    spread = broad ? (species === 'birch' ? 0.16 : 0.22) : 0.11;
  for (let j = 0; j < n; j++) {
    const a = (j * tau) / n + hash(variation * 23 + j * 13) * 0.42;
    const l = spread * (0.74 + 0.31 * hash(variation + j * 3.3));
    const curl = (hash(variation * 12 + j * 7) - 0.5) * 0.61;
    const pts = [0, 0.33, 0.64, 1].map((q, i) => {
      const r = radius * 0.72 + q * (l - radius * 0.72);
      const b = a + curl * q * q;
      return {
        x: Math.cos(b) * r,
        z: Math.sin(b) * r,
        h: [radius * 1.51, radius * 0.71, radius * 0.36, 0.002][i],
        w: [radius * 0.6, radius * 0.52, radius * 0.32, 0.003][i],
      };
    });
    roots.push(pts);
  }
  const count = broad ? (species === 'hollow' ? 4 : 5) : 4;
  for (let j = 0; j < count; j++) {
    const a = (tau * j) / count + 0.7 * variation + hash(j + variation * 7) * 0.65;
    const reach = broad ? 0.15 + 0.11 * hash(j * 5 + variation) : 0.1 + 0.07 * hash(j + variation);
    const height = 0.59 + 0.23 * hash(3 * j - variation);
    const trunkY = broad ? 0.24 + 0.17 * hash(j + variation) : 0.38 + 0.2 * hash(j + variation);
    const end = [Math.cos(a) * reach, height, Math.sin(a) * reach];
    const mid = [Math.cos(a - 0.15) * reach * 0.6, trunkY + (height - trunkY) * 0.32, Math.sin(a - 0.15) * reach * 0.6];
    branches.push([[0, trunkY, 0], mid, end]);
    crowns.push({
      x: end[0] * 0.68,
      y: height + 0.082,
      z: end[2] * 0.68,
      angle: a + 0.5,
      w: broad ? 0.53 + 0.06 * hash(j * 3) : 0.38,
      h: broad ? 0.4 : 0.43,
    });
  }
  crowns.push({ x: 0.015, y: 0.86, z: -0.006, angle: 0.45 + variation * 0.9, w: broad ? 0.53 : 0.36, h: 0.32 });
  const form = { species, radius, roots, branches, crowns, variation };
  shapes.set(key, form);
  return form;
}
export function treeRootSpans(t) {
  const form = formFor(t),
    a = treeTurn(t),
    c = Math.cos(a),
    s = Math.sin(a);
  const pt = (p) => [t.x + (p.x * c + p.z * s) * t.h, t.z + (-p.x * s + p.z * c) * t.h];
  const spans = [];
  for (const root of form.roots)
    for (let i = 1; i < root.length; i++) {
      const p = root[i - 1],
        q = root[i],
        height = (p.h + q.h) * t.h * 0.5;
      if (height < 0.14) continue;
      const [ax, az] = pt(p),
        [bx, bz] = pt(q);
      spans.push({
        ax,
        az,
        bx,
        bz,
        r: (p.w + q.w) * t.h * 0.47,
        height,
        ar: p.w * t.h,
        br: q.w * t.h,
        ah: p.h * t.h,
        bh: q.h * t.h,
      });
    }
  return spans;
}
export function makeTreeWood(t, g, simple = false) {
  const { roots, branches, radius: r, species: k, variation: v } = formFor(t);
  const wood =
    k === 'birch'
      ? ['aaa59a', 'bab6a2', '8d8a79', 'c5bca4']
      : k === 'cedar'
        ? ['70604c', '655745', '7d6952', '675743']
        : ['685b49', '796c51', '5b5546', '807554'];
  const m = [],
    lean = k === 'birch' ? 0.08 : 0.051,
    nodes = [
      [0.0, -0.022, 0, r * 1.24],
      [0, 0.065, 0, r * 1.04],
      [-lean * 0.35, 0.19, lean * 0.23, r * 0.86],
      [-lean, 0.39, 0.012, r * 0.69],
      [0.016, 0.56, -0.019, r * 0.49],
      [0.048, 0.7, -0.012, r * 0.28],
      [0.031, 0.85, 0.006, r * 0.075],
    ];
  g.rings(m, nodes, simple ? 9 : 14, (j, i) => wood[(i * 5 + (j % 2) + v) % 4], 0.18 + v * 0.6, 0.14);
  for (const root of roots) {
    const tube = root.map((p, i) => {
      const a = root[Math.min(i + 1, root.length - 1)],
        b = root[Math.max(0, i - 1)];
      const dx = a.x - b.x,
        dz = a.z - b.z,
        len = Math.hypot(dx, dz),
        nx = -dz / len,
        nz = dx / len;
      return [
        [p.x + nx * p.w, -0.004, p.z + nz * p.w],
        [p.x + nx * p.w * 0.69, p.h * 0.75, p.z + nz * p.w * 0.69],
        [p.x, p.h, p.z],
        [p.x - nx * p.w * 0.69, p.h * 0.7, p.z - nz * p.w * 0.69],
        [p.x - nx * p.w, -0.004, p.z - nz * p.w],
      ];
    });
    for (let j = 1; j < tube.length; j++)
      for (let i = 0; i < 4; i++) {
        const col = i === 1 || i === 2 ? (k === 'birch' ? '8c8a66' : '778157') : wood[(j + i) % 4];
        g.quad(m, tube[j - 1][i], tube[j - 1][i + 1], tube[j][i + 1], tube[j][i], col);
      }
  }
  for (let j = 0; j < roots.length; j++) {
    const root = roots[j],
      p = root[0],
      q = root[1],
      r0 = Math.hypot(p.x, p.z);
    const nx = p.x / r0,
      nz = p.z / r0,
      bend = 0.012 * Math.sin(v * 2 + j);
    const vtx = (u, vv, ww) => [nx * u - nz * ww, vv, nz * u + nx * ww];
    const sections = [
      [r * 0.38, 0.2, r * 0.04],
      [r * 0.88, 0.102, r * 0.24],
      [r * 1.02, 0.056, r * 0.4],
    ].map(([dist, y, width], i) => [
      vtx(dist * 0.89, y, -width + bend * i),
      vtx(dist * 1.31, y + r * 0.21, bend * i),
      vtx(dist * 0.89, y, width + bend * i),
    ]);
    sections.push([
      [q.x - nz * q.w, 0, q.z + nx * q.w],
      [q.x, q.h * 1.07, q.z],
      [q.x + nz * q.w, 0, q.z - nx * q.w],
    ]);
    for (let m0 = 1; m0 < sections.length; m0++)
      for (let k0 = 0; k0 < 2; k0++)
        g.quad(
          m,
          sections[m0 - 1][k0],
          sections[m0 - 1][k0 + 1],
          sections[m0][k0 + 1],
          sections[m0][k0],
          k0 ? '777955' : '7c7952',
        );
  }
  for (let j = 0; j < branches.length; j++) {
    const [p, q, rim] = branches[j];
    g.beam(m, p, q, r * 0.57, r * 0.32, wood[j % 4], simple ? 5 : 7);
    g.beam(m, q, rim, r * 0.34, r * 0.09, wood[(j + 2) % 4], simple ? 5 : 7);
    if (!simple) {
      const fork = [rim[0] * 1.33, rim[1] - 0.052, rim[2] * 1.26 + 0.022];
      g.beam(m, q, fork, r * 0.22, 0.0025, wood[j % 4], 5);
    }
  }
  return m;
}
const crownCache = new WeakMap();
export function crownFaces(t) {
  if (crownCache.has(t)) return crownCache.get(t);
  const { crowns, species } = formFor(t),
    turn = treeTurn(t),
    c = Math.cos(turn),
    s = Math.sin(turn);
  const faces = [],
    crop = species === 'pine' ? 0.72 : species === 'cedar' ? 0.47 : species === 'birch' ? 0.52 : 0.48;
  for (let i = 0; i < crowns.length; i++) {
    const p = crowns[i],
      cx = t.x + (p.x * c + p.z * s) * t.h,
      cz = t.z + (-p.x * s + p.z * c) * t.h;
    const a = p.angle - turn,
      dx = Math.cos(a) * p.w * t.h * 0.5,
      dz = Math.sin(a) * p.w * t.h * 0.5;
    const top = (p.y + p.h * 0.5) * t.h,
      bot = (p.y - p.h * 0.5) * t.h;
    const u0 = i % 2 === 0 ? 0.01 : 0.97,
      u1 = 1 - u0;
    faces.push([
      [cx - dx, bot, cz - dz, u0, crop],
      [cx + dx, bot, cz + dz, u1, crop],
      [cx + dx, top, cz + dz, u1, 0.012],
      [cx - dx, top, cz - dz, u0, 0.012],
    ]);
  }
  crownCache.set(t, faces);
  return faces;
}
