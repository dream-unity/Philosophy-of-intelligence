import { roadX, trailX, MAP } from './geography.mjs';
function rng(seed) {
  let s = seed | 0;
  return () => ((s = (Math.imul(1664525, s) + 1013904223) | 0) >>> 0) / 4294967296;
}
export const clearingTrees = [
  [-8, 7, 19, 5.6],
  [9, 10, 21, 6.0],
  [-13, 20, 20, 6.5],
  [13, 23, 18, 5.8],
  [-16, -5, 19, 6.3],
  [17, -7, 22, 6],
];
const drawnGroves = new Map();
export function ridgeVista(x, z) {
  const offset = z - 475;
  return offset >= -10 && offset < 760 && x > 51 - offset * 0.93 - 14 && x < 51 + offset * 0.08 + 15;
}
const hostRoad = MAP.horde.map(([x, z]) => ({ x, z }));
const a = hostRoad[0],
  b = hostRoad[1],
  l = Math.hypot(b.x - a.x, b.z - a.z);
hostRoad.unshift({ x: a.x - ((b.x - a.x) * 130) / l, z: a.z - ((b.z - a.z) * 130) / l });
export function onHostRoad(x, z) {
  if (z < 1030 || z > 1460 || x > 92) return false;
  for (let i = 1; i < hostRoad.length; i++) {
    const a = hostRoad[i - 1],
      b = hostRoad[i],
      dx = b.x - a.x,
      dz = b.z - a.z;
    const u = Math.min(1, Math.max(0, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    if ((x - a.x - u * dx) ** 2 + (z - a.z - u * dz) ** 2 < 25 * 25) return true;
  }
  return false;
}
export function sceneryTrees(cx, cz) {
  const key = cx + ',' + cz;
  if (drawnGroves.has(key)) return drawnGroves.get(key);
  const result = [],
    r = rng(7731 + cx * 3851 + cz * 907),
    num = cz < 11 ? 23 : cz < 14 ? 15 : 5;
  for (let i = 0; i < num; i++) {
    const x = (cx + r()) * 80,
      z = (cz + r()) * 80,
      h = 8 + r() * 16,
      rad = h * (0.17 + r() * 0.09),
      oak = r() > 0.64 && cz < 13,
      seed = (r() * 1e6) | 0;
    if (
      onHostRoad(x, z) ||
      ridgeVista(x, z) ||
      Math.abs(z - 1021) < 14 ||
      (z > 1424 && z < 1572 && Math.abs(x - 30) < 37) ||
      Math.abs(x - roadX(z)) < 10.0 ||
      Math.abs(x - trailX(z)) < 4.4 ||
      Math.hypot(x + 155, z - 850) < 8 ||
      Math.hypot(x - 30, z - 996) < 19 ||
      (z > 1128 && z < 1400 && x >= -560 && x < 73) ||
      (z > 0 && z < 660 && Math.abs(x - 0.019 * z) < 8.7)
    )
      continue;
    result.push({ x, z, h, rad, oak, seed, variant: (seed >> 3) % 4, w: 0.78 + ((seed >> 5) % 39) * 0.009 });
  }
  drawnGroves.set(key, result);
  return result;
}

export const youngFirs = Array.from({ length: 12 }, (_, i) => ({
  x: (10 + (i % 3) * 3.1) * (i % 2 ? 1 : -1),
  z: 17 + i * 4.1,
  h: 5.2 + (i % 4) * 1.6,
  rad: 2.1,
  oak: false,
  seed: i,
  w: 0.88,
}));

const rocks = new Map();
export function sceneryBoulders(cx, cz) {
  const key = cx + ',' + cz;
  if (rocks.has(key)) return rocks.get(key);
  const random = rng(310099 + cx * 13789 + cz * 7927),
    list = [];
  for (let i = 0; i < 4; i++) {
    const x = (cx + random()) * 80,
      z = (cz + random()) * 80,
      rad = 0.65 + random() * 1.36;
    if (
      onHostRoad(x, z) ||
      Math.abs(x - roadX(z)) < 7.7 ||
      Math.abs(x - trailX(z)) < 3.3 ||
      Math.abs(z - 1021) < 16 ||
      (z > 1415 && z < 1565 && Math.abs(x - 30) < 42) ||
      Math.hypot(x + 155, z - 850) < 11 ||
      Math.hypot(x - 30, z - 996) < 22
    )
      continue;
    list.push({ x, z, rad, h: rad * (0.59 + random() * 0.35), seed: random() * 6.28 });
  }
  rocks.set(key, list);
  return list;
}

// Six individually recognizable trees frame the first encounter and the return walk.
export const clearingPopulation = clearingTrees.map(([x,z,h,rad],i)=>({
  x,z,h,rad,oak:i!==4,seed:Math.floor(x*z),variant:[0,1,2,0,3,0][i],w:.87,landmark:true
}));
