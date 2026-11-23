export const MAP = {
  minX: -530,
  maxX: 530,
  minZ: -145,
  maxZ: 1605,
  road: [
    [0, -115],
    [0, 9],
    [6, 110],
    [22, 220],
    [84, 338],
    [48, 480],
    [80, 610],
    [39, 738],
    [45, 843],
    [30, 990],
    [30, 1045],
    [86, 1130],
    [73, 1240],
    [30, 1375],
    [30, 1516],
  ],
  trail: [
    [0, 9],
    [-41, 108],
    [-74, 200],
    [-89, 420],
    [-144, 605],
    [-155, 850],
    [-125, 988],
    [-125, 1060],
    [-107, 1130],
    [-90, 1230],
    [-53, 1300],
    [30, 1392],
  ],
  horde: [
    [-405, 1160],
    [-361, 1192],
    [-308, 1122],
    [-230, 1154],
    [-145, 1200],
    [-65, 1264],
    [0, 1346],
    [30, 1395],
    [30, 1433],
  ],
};
export const LANDMARKS = [
  { id: 'clearing', name: 'Lanternwood', x: 0, z: 9 },
  { id: 'crossing', name: 'Wayfarer’s Fork', x: 22, z: 220 },
  { id: 'ridge', name: 'Ravenback Ridge', x: 48, z: 480 },
  { id: 'mire', name: 'Briar Hollow', x: 80, z: 610 },
  { id: 'chapel', name: 'The Moonwell', x: -155, z: 850, secret: true },
  { id: 'bells', name: 'Three-Bell Sluice', x: 30, z: 996 },
  { id: 'ford', name: 'Pale Ford', x: -125, z: 1020, secret: true },
  { id: 'downs', name: 'The Ash Downs', x: 73, z: 1240 },
  { id: 'gate', name: 'Castle Xero', x: 30, z: 1431 },
  { id: 'hall', name: 'The Long Hall', x: 30, z: 1516 },
];
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function interpolateX(points, z) {
  if (z <= points[0][1]) return points[0][0];
  for (let i = 1; i < points.length; i++) {
    const [x1, z1] = points[i - 1],
      [x2, z2] = points[i];
    if (z <= z2) {
      const t = (z - z1) / (z2 - z1);
      return x1 + (x2 - x1) * t;
    }
  }
  return points[points.length - 1][0];
}
export const roadX = (z) => interpolateX(MAP.road, z);
export const trailX = (z) => interpolateX(MAP.trail, z);
export const castleAltitude = 32;
const smooth = (a, b, n) => {
  const q = clamp((n - a) / (b - a), 0, 1);
  return q * q * (3 - 2 * q);
};
export function castleRise(x, z) {
  // A walkable spur approaches the rock shelf from the south. Its flanks steepen
  // into the crag supporting the curtain walls. Architecture uses this plateau too.
  const centre = roadX(Math.min(z, 1415));
  const lateral = Math.abs(x - centre);
  const approach = smooth(1230, 1428, z) * (1 - smooth(6, 34, lateral));
  const pilgrimSpur = smooth(1230, 1428, z) * (1 - smooth(8, 36, Math.abs(x - trailX(z))));
  const shelf = smooth(1354, 1430, z) * (1 - smooth(36, 88, Math.abs(x - 30)));
  return castleAltitude * Math.max(approach, pilgrimSpur, shelf) * (1 - smooth(1558, 1628, z));
}
export function terrainHeight(x, z) {
  // Flatten the banks, buildings and clearing so actors, stonework and feet agree.
  const swell =
    Math.sin(x * 0.014 + z * 0.008) * 2.9 +
    Math.sin(z * 0.024 - x * 0.009) * 1.55 +
    Math.cos(x * 0.042) * 0.65;
  const ridge = 17 * Math.exp(-(((z - 486) / 89) ** 2)) * Math.exp(-(((x - 7) / 290) ** 2));
  const bank = clamp((Math.abs(z - 1021) - 12) / 37, 0, 1);
  const flat = clamp((z - 30) / 70, 0, 1) * clamp((1415 - z) / 85, 0, 1);
  return (swell + ridge) * bank * flat + castleRise(x, z);
}
export function course(w) {
  if (!w.hasMap && w.route !== 'guided') return null;
  const p = w.player,
    well = w.hasMap && !w.antidote && !w.ropeFallen;
  const dest = LANDMARKS.find((l) => l.id === (well ? 'chapel' : 'hall'));
  const path = w.hasMap
    ? well
      ? MAP.trail.slice(0, MAP.trail.findIndex((v) => v[1] === dest.z) + 1)
      : [...MAP.trail, [30, 1435], [dest.x, dest.z]]
    : MAP.road;
  let nearest = Infinity,
    leg = 0,
    u = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i],
      b = path[i + 1],
      dx = b[0] - a[0],
      dz = b[1] - a[1];
    const t = clamp(((p.x - a[0]) * dx + (p.z - a[1]) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    const d = Math.hypot(p.x - a[0] - t * dx, p.z - a[1] - t * dz);
    if (d < nearest) {
      nearest = d;
      leg = i;
      u = t;
    }
  }
  let metres = nearest;
  for (let i = leg; i < path.length - 1; i++)
    metres += Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]) * (i === leg ? 1 - u : 1);
  const q = path[Math.min(leg + 1, path.length - 1)];
  return { metres: Math.round(metres), bearing: Math.atan2(q[0] - p.x, q[1] - p.z) };
}
