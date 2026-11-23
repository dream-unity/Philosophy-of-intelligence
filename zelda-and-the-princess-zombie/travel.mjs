// All distances and collider radii are in metres. Geometry is available before the first draw.
import { MAP, roadX, trailX, terrainHeight, clamp } from './geography.mjs';
import { clearingTrees, sceneryTrees, youngFirs, sceneryBoulders } from './woodland.mjs';
import { hallWalkable, insideHall } from './hall.mjs';
import { storyFloor, storyPassable } from './story.mjs';

const bucketSize = 12;
const shapes = new Map();
const populated = new Set();
const bucket = (x, z) => Math.floor(x / bucketSize) + ',' + Math.floor(z / bucketSize);
function store(shape, x0, z0, x1, z1) {
  for (let x = Math.floor(x0 / bucketSize); x <= Math.floor(x1 / bucketSize); x++)
    for (let z = Math.floor(z0 / bucketSize); z <= Math.floor(z1 / bucketSize); z++) {
      const key = x + ',' + z;
      if (!shapes.has(key)) shapes.set(key, new Map());
      shapes.get(key).set(shape.id, shape);
    }
}
export function registerObstacle(x, z, r, material = 'wood', height = Infinity) {
  const shape = { x, z, r, material, height, id: x.toFixed(2) + ',' + z.toFixed(2) };
  store(shape, x - r - 1, z - r - 1, x + r + 1, z + r + 1);
}
function rect(x, z, hx, hz, material = 'stone') {
  store({ x, z, hx, hz, material, id: x + ':' + z }, x - hx - 1, z - hz - 1, x + hx + 1, z + hz + 1);
}
function fixedScenery() {
  for (const [x, z, h, r] of clearingTrees) registerObstacle(x, z, r * 0.15, 'wood', h);
  for (const t of youngFirs) registerObstacle(t.x, t.z, 0.23, 'wood', t.h);
  for (const s of [-1, 1]) registerObstacle(s * 6.2, 8 + s * 1.4, 0.12, 'wood', 3.2);
  for (const z of [220, 480, 610, 1130, 1240]) registerObstacle(roadX(z) + 7, z, 0.92, 'stone', 2.25);
  for (const x of [19, 30, 41]) for (const s of [-1, 1]) rect(x + s * 0.87, 996, 0.14, 0.16, 'wood');
  for (const s of [-1, 1]) {
    rect(-155 + s * 3.5, 855.4, 0.7, 0.7);
    for (let i = 0; i < 4; i++) rect(30 + s * 17, 1455 + i * 19, 1.25, 1.25);
  }
  for (let j = 0; j < 14; j++) {
    const a = (j * Math.PI) / 7;
    registerObstacle(-155 + Math.cos(a) * 4.5, 850 + Math.sin(a) * 4.5, 0.62, 'stone', 0.88);
  }
  for (const [x, z] of [
    [27.35, 1516.8],
    [34.5, 1518.5],
    [18.4, 1492],
    [41.5, 1495],
  ])
    registerObstacle(x, z, 0.35, 'metal', 2.6);
  for (const [x, z, r] of [
    [5, 1435, 5],
    [55, 1435, 5],
    [5, 1549, 6.5],
    [55, 1549, 7],
    [15, 1538, 6.1],
    [46, 1541, 5.1],
    [30, 1555, 10.8],
  ])
    registerObstacle(x, z, r, 'stone');
  rect(30, 1534, 13.5, 3);
  rect(15, 1435, 10.3, 1);
  rect(45, 1435, 10.3, 1);
  rect(5, 1494, 0.8, 59);
  rect(55, 1494, 0.8, 59);
  rect(30, 1553, 25, 1);
}
let ready = false;
function prepare(x, z) {
  if (!ready) {
    fixedScenery();
    ready = true;
  }
  const cx = Math.floor(x / 80),
    cz = Math.floor(z / 80),
    zone = cx + ',' + cz;
  if (populated.has(zone)) return;
  populated.add(zone);
  for (let j = cz - 1; j <= cz + 1; j++)
    for (let i = cx - 1; i <= cx + 1; i++) {
      for (const b of sceneryBoulders(i, j)) registerObstacle(b.x, b.z, b.rad * 0.82, 'stone', b.h);
      for (const t of sceneryTrees(i, j))
        registerObstacle(t.x, t.z, t.rad * (t.oak ? 0.14 : 0.1), 'wood', t.h);
    }
}
export function bridgeRise(w) {
  return w.bridgeOpen ? clamp((w.elapsed - (w.bridgeRaisedAt ?? -100)) / 1.8, 0, 1) : 0;
}
export const fordStoneX = (i) => -125 + Math.sin(i * 0.45) * 0.55;
const fordCenter = (z) => fordStoneX(clamp((z - 1008) / 1.76, 0, 15));
const bridgeTop = Math.max(terrainHeight(30, 1007), terrainHeight(30, 1035)) + 0.69;
export function footHeight(w, x, z) {
  const ground = terrainHeight(x, z);
  const gallery = storyFloor(x, z);
  if (gallery != null) return ground + gallery;
  if (insideHall(x, z)) return ground + 0.17;
  if (w.bridgeOpen && Math.abs(x - 30) < 10 && z >= 1005 && z <= 1039)
    return ground + (bridgeTop - ground) * bridgeRise(w) * clamp(Math.min(z - 1005, 1039 - z) / 1.5, 0, 1);
  if (z >= 1007 && z <= 1035 && Math.abs(x - fordCenter(z)) < 1.2)
    return Math.max(ground, 0.26 + 0.04 * Math.sin(z * 3.57));
  return ground;
}
export function footing(w, x, z) {
  if (insideHall(x, z) || (z > 1435 && Math.abs(x - 30) < 25 && z < 1553)) return 'stone';
  if (w.bridgeOpen && Math.abs(x - 30) < 10 && z > 1005 && z < 1039) return 'wood';
  if (z >= 1007 && z <= 1035) return 'water';
  return Math.abs(x - roadX(z)) < 5.6 ? 'gravel' : z < 850 ? 'leaves' : 'grass';
}
export function barrier(w, x, z, r = 0.29, water = true, fromX, fromZ, absoluteY) {
  if (x < MAP.minX + r || x > MAP.maxX - r || z < MAP.minZ + r || z > MAP.maxZ - r) return 'thorns';
  if (Number.isFinite(fromX) && Number.isFinite(fromZ) && z > 1225 && z < 1430) {
    const run = Math.hypot(x - fromX, z - fromZ);
    if (run > 0.001 && terrainHeight(x, z) - terrainHeight(fromX, fromZ) > run * 0.84) return 'stone';
  }
  const localY = Number.isFinite(absoluteY) ? absoluteY - terrainHeight(x, z) : 0;
  const aboveTable = localY > 1.15 && x > 30.38 && x < 32.96 && z > 1515.45 && z < 1518.62;
  if ((!aboveTable && !hallWalkable(x, z)) || !storyPassable(x, z, w, fromX, fromZ)) return 'stone';
  if (w.gateClosedAt != null && Math.abs(z - 1435) < 1.05 + r && Math.abs(x - 30) < 5.6) return 'metal';
  if (
    localY < 2.0 &&
    bridgeRise(w) > 0.8 &&
    z >= 1007 - r &&
    z <= 1036 + r &&
    Math.abs(Math.abs(x - 30) - 9.88) < r + 0.13
  )
    return 'wood';
  if (
    water &&
    z > 1010 &&
    z < 1032 &&
    Math.abs(x - fordCenter(z)) > 1.05 &&
    !(bridgeRise(w) > 0.95 && Math.abs(x - 30) < 9.88 - r)
  )
    return 'water';
  prepare(x, z);
  const objects = shapes.get(bucket(x, z));
  if (objects)
    for (const a of objects.values()) {
      if (localY > (a.height ?? Infinity) + r) continue;
      if (
        a.r != null
          ? (x - a.x) ** 2 + (z - a.z) ** 2 < (a.r + r) ** 2
          : Math.abs(x - a.x) < a.hx + r && Math.abs(z - a.z) < a.hz + r
      )
        return a.material;
    }
  return '';
}
export function clearSegment(w, x, z, tx, tz, r = 0.03, startY, endY) {
  const n = Math.ceil(Math.hypot(tx - x, tz - z) / 0.22);
  const fromY = startY ?? terrainHeight(x, z) + 1.15,
    toY = endY ?? terrainHeight(tx, tz) + 1.05;
  for (let i = 1; i < n; i++) {
    const f = i / n,
      nx = x + (tx - x) * f,
      nz = z + (tz - z) * f,
      y = fromY + (toY - fromY) * f;
    if (y < terrainHeight(nx, nz) || barrier(w, nx, nz, r, false, undefined, undefined, y)) return false;
  }
  return true;
}
export function bodyRadius(a) {
  switch (a.type) {
    case 'bell':
      return 0.53;
    case 'berries':
      return 0.36;
    case 'witch':
    case 'princess':
    case 'traveller':
      return 0.34;
    case 'wolf':
      return 0.38;
    case 'troll':
      return 0.83;
    case 'dragon':
      return (a.airHeight ?? 3) > 1.9 ? 0 : 0.8;
    default:
      return 0;
  }
}
export function isSheltered(x, z) {
  return (
    Math.hypot(x, z - 9) < 18 ||
    (z >= 1434 && z <= 1553 && Math.abs(x - 30) < 25) ||
    Math.hypot(x - 30, z - 996) < 17 ||
    (z > 76 && z < 1375 && Math.abs(x - trailX(z)) < 7)
  );
}
