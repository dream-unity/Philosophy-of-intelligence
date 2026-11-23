// The rim is surveyed in metres and shared by footing, collision and both landscape renderers.
const limits = { west: -530, east: 530, south: -145, north: 1605 };
export const boundaryExtents = {
  minX: limits.west,
  maxX: limits.east,
  minZ: limits.south,
  maxZ: limits.north,
};
const sides = Object.keys(limits);
export function edgePoint(side, along) {
  const vertical = side === 'east' || side === 'west';
  const inward = side === 'west' || side === 'south' ? 1 : -1;
  const phase = side === 'east' ? 0.8 : side === 'north' ? 2 : side === 'west' ? 3.6 : 5.2;
  const scallop = 6.8 + 3.4 * Math.sin(along * 0.026 + phase) + 1.65 * Math.sin(along * 0.073 - phase);
  const normal = limits[side] + inward * scallop;
  return { x: vertical ? normal : along, z: vertical ? along : normal };
}
export function edgeDistance(x, z) {
  if (x > -480 && x < 480 && z > -95 && z < 1554) return 45;
  return Math.min(
    x - edgePoint('west', z).x,
    edgePoint('east', z).x - x,
    z - edgePoint('south', x).z,
    edgePoint('north', x).z - z
  );
}
export function edgeRise(x, z) {
  const d = edgeDistance(x, z);
  if (d > 19) return 0;
  const u = Math.max(0, Math.min(1, (19 - d) / 22));
  return u * u * (3 - 2 * u) * (6.7 + 1.5 * Math.sin((x + z) * 0.06));
}
export function drawForestEdge(m, g, w, ground) {
  const p = w.player;
  if (edgeDistance(p.x, p.z) > 42) return;
  for (const side of sides) {
    const vertical = side === 'east' || side === 'west',
      along = vertical ? p.z : p.x;
    if (Math.abs((vertical ? p.x : p.z) - limits[side]) > 49) continue;
    for (let k = Math.floor((along - 37) / 3); k <= Math.ceil((along + 37) / 3); k++) {
      const a = edgePoint(side, k * 3),
        b = edgePoint(side, (k + 1) * 3),
        y = ground(a.x, a.z),
        by = ground(b.x, b.z);
      const crag = side === 'north' || (side === 'west' && a.z > 900);
      const inward = side === 'west' || side === 'south' ? 1 : -1;
      const rim = { x: a.x + (vertical ? -inward * 2.4 : 0), z: a.z + (vertical ? 0 : -inward * 2.4) };
      const ridge = y + (crag ? 3.7 : 1.05) + 0.65 * Math.sin(k * 4.8);
      g.tri(
        m,
        [a.x, y - 0.06, a.z],
        [b.x, by - 0.06, b.z],
        [rim.x, ridge, rim.z],
        crag ? '61635a' : '5c5840',
        false
      );
      if (!crag) {
        const x = a.x,
          z = a.z,
          h = 1.35 + 0.38 * Math.cos(k);
        g.beam(m, [x, y - 0.18, z], [b.x, by + h * 0.92, b.z], 0.19, 0.065, '393b30', 5);
        g.beam(m, [x, y + h, z], [b.x, by - 0.08, b.z], 0.09, 0.16, '454234', 5);
        for (let j = 0; j < 3; j++) {
          const u = (j + 0.4) / 3,
            sx = x + (b.x - x) * u,
            sz = z + (b.z - z) * u,
            sy = y + 0.18 + h * u;
          g.beam(
            m,
            [sx, sy, sz],
            [sx + 0.29 * Math.sin(k + j), sy + 0.56, sz + 0.28 * Math.cos(k + j)],
            0.054,
            0.005,
            '60563e',
            4
          );
        }
      }
    }
  }
}
const herbPatches = [];
export function prepareTrailHerbs(trail) {
  if (herbPatches.length) return;
  // Station by distance so patches grow at intervals even through the diagonal final switchback.
  let station = 0,
    next = 81;
  for (let i = 1; i < trail.length; i++) {
    const [x, z] = trail[i - 1],
      [xx, zz] = trail[i],
      length = Math.hypot(xx - x, zz - z);
    while (next <= station + length) {
      const u = (next - station) / length,
        seed = herbPatches.length,
        d = Math.sin(seed * 2.3) * 1.6;
      const px = x + (xx - x) * u + ((zz - z) / length) * d,
        pz = z + (zz - z) * u - ((xx - x) / length) * d;
      if (pz < 1374) herbPatches.push({ x: px, z: pz, reach: 11.6 + Math.cos(seed * 0.88) * 0.85 });
      next += 17.8;
    }
    station += length;
  }
}
export function scentPatch(x, z) {
  if (z < 61 || z > 1385) return null;
  // Ordered by z. Local lookup stays independent of map ownership and camera direction.
  let lo = 0,
    hi = herbPatches.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (herbPatches[mid].z < z - 13) lo = mid + 1;
    else hi = mid;
  }
  for (let i = lo; i < herbPatches.length && herbPatches[i].z <= z + 13; i++) {
    const patch = herbPatches[i];
    if (Math.hypot(x - patch.x, z - patch.z) < patch.reach) return patch;
  }
  return null;
}
export function drawTrailHerbs(m, g, w, ground) {
  const p = w.player;
  if (p.z < 34 || p.z > 1410) return;
  for (const patch of herbPatches) {
    if (Math.abs(patch.z - p.z) > 44 || Math.abs(patch.x - p.x) > 44) continue;
    for (let i = 0; i < 7; i++) {
      const a = i * 2.39996,
        r = 0.22 + 0.23 * i,
        x = patch.x + Math.cos(a) * r,
        z = patch.z + Math.sin(a) * r;
      const y = ground(x, z) + 0.018,
        h = 0.39 + 0.13 * Math.sin(i);
      g.tri(
        m,
        [x - 0.09, y, z],
        [x + 0.1, y, z],
        [x + 0.17 * Math.cos(a), y + h, z + 0.16 * Math.sin(a)],
        '779176',
        false
      );
      g.tri(
        m,
        [x, y + h * 0.55, z],
        [x - 0.085, y + h * 0.8, z + 0.056],
        [x, y + h + 0.1, z + 0.07],
        'd0d8aa',
        false
      );
    }
  }
}
