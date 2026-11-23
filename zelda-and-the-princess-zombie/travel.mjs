import { ridgePollards } from './ridge-landscape.mjs';
import { marchObstructions, guestWicketLift } from './procession.mjs';
// All distances and collider radii are in metres. Geometry is available before the first draw.
import { edgeDistance, scentPatch } from './forest-edge.mjs';
import { roadX, trailX, terrainHeight, clamp } from './geography.mjs';
import { clearingPopulation, sceneryTrees, youngFirs, sceneryBoulders } from './woodland.mjs';
import { treeTrunkRadius, treeRootSpans } from './rooted-trees.mjs';
import { hallWalkable, insideHall } from './hall.mjs';
import { storyFloor, storyPassable } from './story.mjs';
import { roosts } from './story-field.mjs';

const bucketSize = 12;
const shapes = new Map();
const populated = new Set();
const prepared = new Set();
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
// Roots use the same yaw, taper and world coordinates as the visible tree.
function registerTree(tree) {
  registerObstacle(tree.x, tree.z, treeTrunkRadius(tree), 'wood', tree.h);
  const base = terrainHeight(tree.x, tree.z);
  for (const span of treeRootSpans(tree)) {
    const reach = Math.max(span.ar ?? span.r, span.br ?? span.r) + 1;
    const dx = span.bx - span.ax,
      dz = span.bz - span.az;
    const shape = {
      ...span,
      base,
      dx,
      dz,
      inverseLength: 1 / (dx * dx + dz * dz || 1),
      id: 'root:' + span.ax + ',' + span.az + '/' + span.bx + ',' + span.bz,
    };
    store(
      shape,
      Math.min(span.ax, span.bx) - reach,
      Math.min(span.az, span.bz) - reach,
      Math.max(span.ax, span.bx) + reach,
      Math.max(span.az, span.bz) + reach
    );
  }
}
function rootTop(span, x, z, radius = 0) {
  const u = clamp(((x - span.ax) * span.dx + (z - span.az) * span.dz) * span.inverseLength, 0, 1);
  const dx = x - (span.ax + u * span.dx),
    dz = z - (span.az + u * span.dz);
  const width = (span.ar ?? span.r) * (1 - u) + (span.br ?? span.r) * u;
  if (dx * dx + dz * dz > (width + radius) ** 2) return -Infinity;
  const distance = Math.max(0, Math.hypot(dx, dz) - radius) / Math.max(0.005, width);
  const height = (span.ah ?? span.height) * (1 - u) + (span.bh ?? span.height) * u;
  return span.base + height * Math.max(0, 1 - distance * distance);
}
function rootedFloor(x, z, ground) {
  prepare(x, z);
  let top = ground;
  const list = shapes.get(bucket(x, z));
  if (list)
    for (const shape of list.values()) {
      if (shape.ax != null) top = Math.max(top, rootTop(shape, x, z));
    }
  return top;
}
function fixedScenery() {
  registerObstacle(-3.7, 7.2, 0.39, 'metal', 0.55);
  for (const r of roosts) registerObstacle(r.x, r.z, 0.12, 'wood', 1.65);
  for (const t of ridgePollards) registerObstacle(t.x, t.z, t.radius, 'wood', t.h);
  for (const q of marchObstructions)
    registerObstacle(q.x, q.z, q.r, q.kind === 'cart' ? 'wood' : 'stone', 1.2);
  for (const tree of clearingPopulation) registerTree(tree);
  for (const tree of youngFirs) registerTree(tree);
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
  if (prepared.has(zone)) return;
  prepared.add(zone);
  for (let j = cz - 1; j <= cz + 1; j++)
    for (let i = cx - 1; i <= cx + 1; i++) {
      const cell = i + ',' + j;
      if (populated.has(cell)) continue;
      populated.add(cell);
      for (const b of sceneryBoulders(i, j)) registerObstacle(b.x, b.z, b.rad * 0.82, 'stone', b.h);
      for (const tree of sceneryTrees(i, j)) registerTree(tree);
    }
}
export function bridgeRise(w) {
  return w.bridgeOpen ? clamp((w.elapsed - (w.bridgeRaisedAt ?? -100)) / 1.8, 0, 1) : 0;
}
export const fordStoneX = (i) => -125 + Math.sin(i * 0.45) * 0.55;
const fordCenter = (z) => fordStoneX(clamp((z - 1008) / 1.76, 0, 15));
export function riverImmersion(w, x, z) {
  if (z < 1008.6 || z > 1034.4) return 0;
  if (bridgeRise(w) > 0.95 && Math.abs(x - 30) < 9.88) return 0;
  // The ford stones overlap at their broad bases. A walker's boot is supported by
  // a stone only within its tread, with shallow moving water around the edges.
  const i = Math.round((z - 1008) / 1.76);
  for (let k = Math.max(0, i - 1); k <= Math.min(15, i + 1); k++) {
    if (((x - fordStoneX(k)) / 1.18) ** 2 + ((z - (1008 + k * 1.76)) / 1.3) ** 2 < 1) return 0;
  }
  return clamp(Math.min(z - 1008.6, 1034.4 - z) * 0.39, 0, 2.1);
}
export const gateClearance = (w) =>
  w.gateClosedAt == null || w.holdingGate ? 8 : Math.max(0, 7.56 * (1 - (w.elapsed - (w.gateFallAt ?? w.gateClosedAt))));
export function wicketLift(w) {
  const manual = w.wicketAt == null ? 0 : 2.42 * clamp(Math.min((w.elapsed - w.wicketAt) / 0.55, ((w.wicketHoldUntil || 0) - w.elapsed) / 0.65), 0, 1);
  return Math.max(manual, guestWicketLift(w));
}
const bridgeTop = Math.max(terrainHeight(30, 1007), terrainHeight(30, 1035)) + 0.69;
export function footHeight(w, x, z) {
  const ground = terrainHeight(x, z);
  const gallery = storyFloor(x, z);
  if (gallery != null) return ground + gallery;
  if (insideHall(x, z)) return ground + 0.17;
  if (w.bridgeOpen && Math.abs(x - 30) < 10 && z >= 1005 && z <= 1039)
    return ground + (bridgeTop - ground) * bridgeRise(w) * clamp(Math.min(z - 1005, 1039 - z) / 1.5, 0, 1);
  if (z >= 1007 && z <= 1035) {
    const water = riverImmersion(w, x, z);
    if (!water && Math.abs(x - fordCenter(z)) < 1.3) {
      const i = clamp(Math.round((z - 1008) / 1.76), 0, 15);
      const d = Math.hypot((x - fordStoneX(i)) / 1.62, (z - 1008 - i * 1.76) / 1.42);
      return Math.max(ground, 0.41 - 0.21 * clamp(d - 0.28, 0, 1));
    }
    if (water) return ground - Math.min(0.82, water);
  }
  return rootedFloor(x, z, ground);
}
export function footing(w, x, z) {
  if (insideHall(x, z) || (z > 1435 && Math.abs(x - 30) < 25 && z < 1553)) return 'stone';
  if (w.bridgeOpen && Math.abs(x - 30) < 10 && z > 1005 && z < 1039) return 'wood';
  if (z >= 1007 && z <= 1035)
    return riverImmersion(w, x, z) > 0.03 ? 'water' : Math.abs(x - fordCenter(z)) < 1.3 ? 'stone' : 'gravel';
  const ground = terrainHeight(x, z);
  if (rootedFloor(x, z, ground) > ground + 0.045) return 'wood';
  return Math.abs(x - roadX(z)) < 5.6 ? 'gravel' : z < 850 ? 'leaves' : 'grass';
}
export function barrier(w, x, z, r = 0.29, water = true, fromX, fromZ, absoluteY) {
  if (edgeDistance(x, z) < r && (fromX == null || edgeDistance(x, z) <= edgeDistance(fromX, fromZ)))
    return 'thorns';
  if (Number.isFinite(fromX) && Number.isFinite(fromZ) && z > 1225 && z < 1430) {
    const run = Math.hypot(x - fromX, z - fromZ);
    if (run > 0.001 && terrainHeight(x, z) - terrainHeight(fromX, fromZ) > run * 0.84) return 'stone';
  }
  const localY = Number.isFinite(absoluteY) ? absoluteY - terrainHeight(x, z) : 0;
  const aboveTable = localY > 1.15 && x > 30.38 && x < 32.96 && z > 1515.45 && z < 1518.62;
  if ((!aboveTable && !hallWalkable(x, z)) || !storyPassable(x, z, w, fromX, fromZ)) return 'stone';
  if (
    Math.abs(z - 1435) < 0.32 + r &&
    Math.abs(x - 30) < 5.6 &&
    Math.max(gateClearance(w), x > 32.6 + r && x < 34.55 - r ? wicketLift(w) : 0) <
      (Number.isFinite(absoluteY) ? localY + r : 1.78)
  )
    return 'metal';
  if (
    localY < 2.0 &&
    bridgeRise(w) > 0.8 &&
    z >= 1007 - r &&
    z <= 1036 + r &&
    Math.abs(Math.abs(x - 30) - 9.88) < r + 0.13
  )
    return 'wood';
  if (water && riverImmersion(w, x, z) > 0.78) return 'water';
  prepare(x, z);
  const objects = shapes.get(bucket(x, z));
  if (objects)
    for (const a of objects.values()) {
      if (a.ax != null) {
        const top = rootTop(a, x, z, r);
        if (top === -Infinity) continue;
        if (
          Number.isFinite(absoluteY)
            ? top >= absoluteY - r && absoluteY >= a.base - r
            : top - terrainHeight(x, z) > 0.38
        )
          return 'wood';
        continue;
      }
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
// Existing journeys can place the eye where an earlier release had no trunk,
// post or root. Move only an obstructed saved position, staying on the same side
// of the castle entrance and hall wall. A successful save keeps the correction.
export function recoverFooting(w) {
  const p = w.player;
  if (!barrier(w, p.x, p.z, 0.28)) return false;
  const inside = insideHall(p.x, p.z);
  const northOfGate =
    Math.abs(p.z - 1435) < 1.4 && Math.abs(p.x - 30) < 5 ? Boolean(w.gateCrossed) : p.z >= 1435;
  for (let radius = 0.16; radius < 16; radius += 0.24) {
    const n = Math.min(96, Math.max(12, Math.ceil((2 * Math.PI * radius) / 0.28)));
    for (let i = 0; i < n; i++) {
      const angle = p.yaw + (i * 2 * Math.PI) / n;
      const x = p.x + Math.sin(angle) * radius,
        z = p.z + Math.cos(angle) * radius;
      if (z >= 1435 !== northOfGate || insideHall(x, z) !== inside || barrier(w, x, z, 0.31)) continue;
      Object.assign(p, {
        x,
        z,
        feetY: footHeight(w, x, z),
        vx: 0,
        vz: 0,
        speed: 0,
        airborne: false,
        gaitOffset: 0,
        verticalSpeed: 0,
        immersion: riverImmersion(w, x, z),
        surface: footing(w, x, z),
      });
      return true;
    }
  }
  return false;
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
    case 'host':
      return 0.28;
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
    Boolean(scentPatch(x, z))
  );
}
