// Rounded volumes follow the joints of the actual creature meshes. The coloured
// geometry and its collision centres run through the same skin deformation.
import { animateCreature } from './creature-motion.mjs';
import { terrainHeight } from './geography.mjs';
import { marcherHeight, marcherReach, marcherLean } from './marcher-body.mjs';
const part = (name, a, b, r) => ({ name, a, b, r });
const bodyZones = {
  wolf: [
    part('flank', [0, 1.0, -0.38], [0, 0.98, 0.49], 0.29),
    part('neck', [0, 1.11, -0.28], [0, 1.33, -0.59], 0.22),
    part('head', [0, 1.35, -0.61], [0, 1.28, -0.99], 0.19),
    part('tail', [0, 1, 0.48], [0.11, 0.72, 1.24], 0.126),
  ],
  troll: [
    part('flank', [0, 1.12, 0], [0, 2.32, 0], 0.54),
    part('armour', [-0.6, 2.34, -0.2], [0.63, 2.32, -0.22], 0.33),
    part('head', [0, 2.58, -0.11], [0, 2.89, -0.17], 0.31),
    part('club', [1.2, 0.7, -0.14], [1.09, 2.12, -0.34], 0.18),
  ],
  dragon: [
    part('flank', [0, 0.52, -0.73], [0, 0.51, 0.82], 0.47),
    part('throat', [0, 0.67, -0.8], [0, 1.13, -1.52], 0.26),
    part('head', [0, 1.14, -1.5], [0, 1.24, -2.06], 0.19),
    part('tail', [0, 0.42, 0.72], [0.14, 0.26, 1.96], 0.17),
    part('tail', [0.14, 0.26, 1.9], [0.49, 0.5, 3.22], 0.1),
  ],
  witch: [part('robe', [0, 0.4, 0], [0, 1.39, 0], 0.34), part('head', [0, 1.53, 0], [0, 1.8, 0], 0.17)],
};
for (const sign of [-1, 1]) {
  for (const z of [-0.43, 0.45])
    bodyZones.wolf.push(part('leg', [sign * 0.21, 0.18, z - 0.11], [sign * 0.19, 0.84, z], 0.085));
  bodyZones.troll.push(
    part('leg', [sign * 0.45, 0.19, -0.05], [sign * 0.36, 1.2, 0], 0.2),
    part('arm', [sign * 0.75, 2.24, 0], [sign * 1.14, 1.11, -0.15], 0.2)
  );
  bodyZones.dragon.push(
    part('wing', [sign * 0.32, 0.72, -0.4], [sign * 1.46, 1.91, -0.25], 0.16),
    part('wing', [sign * 1.5, 1.91, -0.25], [sign * 3.51, 1.52, 0.4], 0.1)
  );
}
const jointClouds = {};
for (const type of ['wolf', 'troll', 'dragon']) {
  jointClouds[type] = Float32Array.from(bodyZones[type].flatMap((s) => [...s.a, 0, 0, 0, ...s.b, 0, 0, 0]));
}
export function actorVolumes(a, time) {
  const floor = a.type === 'marcher' && Number.isFinite(a.feetY) ? a.feetY : terrainHeight(a.x, a.z);
  const originY = floor + (a.airHeight ?? (a.type === 'dragon' ? 3.25 : 0));
  const yaw = (a.attackYaw ?? a.heading ?? 0) + Math.PI,
    cs = Math.cos(yaw),
    sn = Math.sin(yaw),
    scale = a.type === 'dragon' ? 1.4 : a.type === 'marcher' ? marcherHeight(a.i) / 1.8 : 1;
  const kind = a.type;
  if (kind === 'bell') {
    const size = { low: 1.14, mid: 0.86, high: 0.59 }[a.tone] || 0.86,
      lip = 2.39 - size;
    return [
      part(
        'bronze',
        [a.x, originY + lip + 0.16 * size, a.z],
        [a.x, originY + lip + 0.4 * size, a.z],
        size * 0.53
      ),
      part(
        'bronze',
        [a.x, originY + lip + 0.52 * size, a.z],
        [a.x, originY + 2.39 - 0.1 * size, a.z],
        size * 0.31
      ),
    ];
  }
  if (kind === 'marcher') {
    const reach = marcherReach(a, time);
    const lean = marcherLean(a, time);
    const leanSin = Math.sin(lean),
      leanCos = Math.cos(lean);
    function joint(x, y, z) {
      const u = Math.max(0, Math.min(1, (y / 1.8 - 0.14) / 0.51));
      const upper = u * u * (3 - 2 * u);
      return world([x, y * (1 - (1 - leanCos) * upper) + 0.026 / scale, z - y * leanSin * upper]);
    }
    const zones = [
      part('torso', joint(0, 0.67, 0), joint(0, 1.33, 0), 0.245 * scale),
      part('head', joint(0, 1.49, -0.03), joint(0, 1.64, -0.04), 0.16 * scale),
    ];
    for (const side of [-1, 1]) {
      zones.push(
        part(
          'arm',
          joint(side * 0.22, 1.36, 0),
          joint(side * 0.28, 0.84 + ((reach - 0.12) * 0.37) / scale, -reach / scale),
          0.09 * scale
        ),
        part('leg', joint(side * 0.13, 0.7, 0), joint(side * 0.14, 0.12, 0), 0.098 * scale)
      );
    }
    return zones;
  }
  const shapes = bodyZones[kind];
  if (!shapes) return [];
  const cloud = jointClouds[kind];
  const posed = cloud ? animateCreature(cloud, new Float32Array(cloud.length), a, time) : null;
  function world(p) {
    return [
      a.x + scale * (p[0] * cs + p[2] * sn),
      originY + scale * p[1],
      a.z + scale * (-p[0] * sn + p[2] * cs),
    ];
  }
  return shapes.map((s, i) =>
    part(
      s.name,
      world(posed ? posed.subarray(i * 12, i * 12 + 3) : s.a),
      world(posed ? posed.subarray(i * 12 + 6, i * 12 + 9) : s.b),
      s.r * scale
    )
  );
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const minus = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
// Earliest finite intersection of a blade segment and a capsule, including either
// rounded endpoint. Distances are continuous, so even a thin wing finger counts.
export function capsuleEntry(base, tip, shape) {
  const s = minus(tip, base),
    len = Math.hypot(...s);
  if (len < 1e-6) return Infinity;
  const ray = s.map((c) => c / len),
    ba = minus(shape.b, shape.a),
    oa = minus(base, shape.a),
    baba = dot(ba, ba);
  const radius = shape.r + 0.025;
  const along = Math.max(0, Math.min(1, dot(ba, oa) / (baba || 1)));
  const separation = [oa[0] - ba[0] * along, oa[1] - ba[1] * along, oa[2] - ba[2] * along];
  if (dot(separation, separation) <= radius * radius) return 0;
  const bard = dot(ba, ray),
    baoa = dot(ba, oa),
    rd = dot(ray, oa);
  const A = baba - bard * bard,
    B = baba * rd - baoa * bard,
    C = baba * (dot(oa, oa) - radius * radius) - baoa * baoa;
  let nearest = Infinity;
  if (A > 1e-8 && B * B >= A * C) {
    const t = (-B - Math.sqrt(B * B - A * C)) / A,
      axis = baoa + t * bard;
    if (t >= 0 && axis >= 0 && axis <= baba) nearest = t;
  }
  for (const end of [shape.a, shape.b]) {
    const oc = minus(base, end),
      t = dot(oc, ray),
      disc = t * t - dot(oc, oc) + radius * radius;
    if (disc >= 0) {
      const n = -t - Math.sqrt(disc);
      if (n >= 0) nearest = Math.min(nearest, n);
    }
  }
  return nearest <= len ? nearest / len : Infinity;
}
