import {
  HALL_BOUNDS,
  BELL_ANCHOR,
  insideHall,
  insideCloister,
  insideGallery,
  hallWalkable,
  castleSurfaceHeight,
  hallWallRayBlocked,
} from './hall.mjs';

// World distances are metres. North is +z. All mutable state is plain JSON.
export const HORDE_COUNT = 3072;
export const HOURGLASS = 365;
export const GATE_Z = 1435;
export { BELL_ANCHOR, HALL_BOUNDS };

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

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const ease = (t) => t * t * (3 - 2 * t);
const shortestTurn = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

function rng(seed) {
  let s = seed | 0;
  return () => ((s = (Math.imul(1664525, s) + 1013904223) | 0) >>> 0) / 4294967296;
}

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

export function fordCenterX(z) {
  const step = (z - 1008) / 1.76;
  return -125 + Math.sin(step * 1.3) * 2.1;
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
  // Natural steep rocky perimeter rim near world borders (no invisible flat walls).
  const borderX = Math.max(0, Math.abs(x) - (MAP.maxX - 36));
  const borderZ = Math.max(0, MAP.minZ + 32 - z, z - (MAP.maxZ - 32));
  const rim = (borderX * borderX + borderZ * borderZ) * 0.011;
  return (swell + ridge) * bank * flat + rim;
}

export function bridgeDeckHeight(progress = 1) {
  const fullY = Math.max(terrainHeight(30, 1007), terrainHeight(30, 1035)) + 0.69;
  return -0.35 + (fullY + 0.35) * clamp(progress, 0, 1);
}

export function surfaceHeight(w, x, z) {
  const base = terrainHeight(x, z);
  // Raised castle floor, hall & bell gallery steps
  if (z >= GATE_Z - 1 && z <= 1554 && x >= 5 && x <= 55) {
    return base + castleSurfaceHeight(x, z);
  }
  // Rising three-bell bridge deck with entry/exit ramps
  if (w && (w.bridgeProgress || 0) > 0.05 && Math.abs(x - 30) < 9.9 && z >= 1004.5 && z <= 1038.5) {
    const deck = bridgeDeckHeight(w.bridgeProgress ?? (w.bridgeOpen ? 1 : 0));
    const ramp =
      z < 1007.5
        ? clamp((z - 1004.5) / 3, 0, 1)
        : z > 1035.5
          ? clamp((1038.5 - z) / 3, 0, 1)
          : 1;
    return Math.max(base, base + (deck - base) * ramp);
  }
  // Pale Ford stepping stones lift
  if (z >= 1007 && z <= 1035 && Math.abs(x - fordCenterX(z)) < 2.8) {
    return Math.max(base, 0.24);
  }
  return base;
}

export function surfaceMaterial(w, x, z) {
  if (z >= GATE_Z - 2 && z <= 1556 && x >= 4 && x <= 56) return 'stone';
  if (w && (w.bridgeProgress || 0) >= 0.55 && Math.abs(x - 30) < 9.8 && z >= 1005.5 && z <= 1037.5)
    return 'wood';
  if (z >= 1007 && z <= 1035) return 'water';
  if (Math.abs(x - roadX(z)) < 5.8 && z < 1435) return 'road';
  if (Math.abs(x - trailX(z)) < 2.4 && z < 1395) return 'road';
  return 'forest';
}

// Deterministic shared trees & obstacles (used identically by headless sim & renderer).
export const clearingTrees = [
  [-8, 7, 19, 5.6],
  [9, 10, 21, 6.0],
  [-13, 20, 20, 6.5],
  [13, 23, 18, 5.8],
  [-16, -5, 19, 6.3],
  [17, -7, 22, 6.0],
];

export const youngFirs = Array.from({ length: 12 }, (_, i) => ({
  x: (10 + (i % 3) * 3.1) * (i % 2 ? 1 : -1),
  z: 17 + i * 4.1,
  h: 5.2 + (i % 4) * 1.6,
  rad: 2.1,
  oak: false,
  seed: i,
  w: 0.88,
}));

export function ridgeVista(x, z) {
  const offset = z - 475;
  return offset >= -10 && offset < 760 && x > 51 - offset * 0.93 - 14 && x < 51 + offset * 0.08 + 15;
}

const drawnGroves = new Map();
const obstacleCells = new Map();
const populatedObstacleCells = new Set();
const cellKey = (cx, cz) => cx + ',' + cz;

export function registerObstacle(x, z, radius, kind = 'prop') {
  const key = cellKey(Math.floor(x / 10), Math.floor(z / 10));
  if (!obstacleCells.has(key)) obstacleCells.set(key, new Map());
  const trunkKey = x.toFixed(2) + ',' + z.toFixed(2);
  obstacleCells.get(key).set(trunkKey, { x, z, radius, kind });
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
      ridgeVista(x, z) ||
      Math.abs(z - 1021) < 14 ||
      (z > 1424 && z < 1572 && Math.abs(x - 30) < 37) ||
      Math.abs(x - roadX(z)) < 10.0 ||
      Math.abs(x - trailX(z)) < 4.4 ||
      Math.hypot(x + 155, z - 850) < 8.5 ||
      Math.hypot(x - 30, z - 996) < 19 ||
      (z > 1128 && z < 1400 && x >= -560 && x < 73) ||
      (z > 0 && z < 660 && Math.abs(x - 0.019 * z) < 8.7)
    )
      continue;
    const tint = 0.86 + r() * 0.28;
    const widthScale = (oak ? 0.84 : 0.82) + r() * 0.16;
    registerObstacle(x, z, rad * (oak ? 0.15 : 0.11), 'tree');
    result.push({ x, z, h, rad, oak, seed, tint, w: widthScale, painted: oak || seed % 3 === 0 });
  }
  drawnGroves.set(key, result);
  return result;
}

// Register all static landmark props unconditionally in world simulation so physics is 100% honest without renderer!
function seedStaticObstacles() {
  for (const [x, z, , rad] of clearingTrees) registerObstacle(x, z, rad * 0.15, 'tree');
  for (const fir of youngFirs) registerObstacle(fir.x, fir.z, 0.42, 'tree');
  // Clearing oil-lamp posts
  for (const s of [-1, 1]) registerObstacle(s * 6.2, 8 + s * 1.4, 0.34, 'lantern');
  // Road stone mileposts
  for (const z of [220, 480, 610, 1130, 1240]) registerObstacle(roadX(z) + 7, z, 0.92, 'milepost');
  // Moonwell stone basin rim (leaving south-east drinking approach open) & two arch pillars
  for (let j = 0; j < 14; j++) {
    const a = (j * Math.PI * 2) / 14;
    registerObstacle(-155 + Math.cos(a) * 4.5, 850 + Math.sin(a) * 4.5, 0.62, 'stone');
  }
  for (const side of [-1, 1]) registerObstacle(-155 + side * 3.5, 855.4, 0.88, 'pillar');
  // Three-Bell Sluice timber support posts
  for (const bx of [19, 30, 41]) {
    for (const s of [-1, 1]) registerObstacle(bx + s * 0.87, 996, 0.32, 'bell-post');
  }
  // Castle courtyard lantern plinths (outside hall walls: z=1455, 1474, 1493, 1512 at x=13 and x=47)
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const zz = 1455 + i * 19;
      if (zz < 1465) registerObstacle(30 + s * 17, zz, 1.38, 'plinth');
    }
  }
  // West Cloister colonnade pillars
  for (let z = 1443; z <= 1463; z += 5) registerObstacle(15.6, z, 0.48, 'pillar');
  // East Bell Gallery timber posts
  registerObstacle(51.8, 1456, 0.35, 'pillar');
  registerObstacle(51.8, 1459, 0.35, 'pillar');
}
seedStaticObstacles();

function ensureCellObstacles(x, z) {
  const gcx = Math.floor(x / 80),
    gcz = Math.floor(z / 80);
  for (let dx = -1; dx <= 1; dx++)
    for (let dz = -1; dz <= 1; dz++) {
      const k = cellKey(gcx + dx, gcz + dz);
      if (!populatedObstacleCells.has(k)) {
        populatedObstacleCells.add(k);
        sceneryTrees(gcx + dx, gcz + dz);
      }
    }
}

export function hitsProp(x, z, bodyRadius = 0.32) {
  ensureCellObstacles(x, z);
  const cx = Math.floor(x / 10),
    cz = Math.floor(z / 10);
  for (let ix = cx - 1; ix <= cx + 1; ix++)
    for (let iz = cz - 1; iz <= cz + 1; iz++) {
      const props = obstacleCells.get(cellKey(ix, iz));
      if (!props) continue;
      for (const a of props.values()) {
        if ((x - a.x) ** 2 + (z - a.z) ** 2 < (a.radius + bodyRadius) ** 2) return true;
      }
    }
  return false;
}

const hordeLength = [];
let travelled = 0;
for (let i = 0; i < MAP.horde.length - 1; i++) {
  const a = MAP.horde[i],
    b = MAP.horde[i + 1];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const tangent = { x: (b[0] - a[0]) / len, z: (b[1] - a[1]) / len };
  hordeLength.push({ a, b, start: travelled, len, tangent });
  travelled += len;
}
const hordeNormals = MAP.horde.map((_, i) => {
  const prev = hordeLength[Math.max(0, i - 1)].tangent;
  const next = hordeLength[Math.min(i, hordeLength.length - 1)].tangent;
  const length = Math.hypot(prev.x + next.x, prev.z + next.z);
  return { x: (prev.z + next.z) / length, z: -(prev.x + next.x) / length };
});

function herdPoint(metres, offset) {
  let i = 0;
  while (i < hordeLength.length - 1 && metres > hordeLength[i].start + hordeLength[i].len) i++;
  const leg = hordeLength[i],
    along = metres - leg.start,
    t = clamp(along / leg.len, 0, 1);
  const bend = t * t * (3 - 2 * t),
    a = hordeNormals[i],
    b = hordeNormals[i + 1];
  // Gate bottleneck compression in the final 56 metres
  const funnel = clamp((travelled - metres) / 56, 0.14, 1);
  const width = offset * funnel;
  return {
    x: leg.a[0] + leg.tangent.x * along + (a.x + (b.x - a.x) * bend) * width,
    z: leg.a[1] + leg.tangent.z * along + (a.z + (b.z - a.z) * bend) * width,
  };
}

export function hordePosition(w, index) {
  const i = clamp(Math.floor(index), 0, HORDE_COUNT - 1),
    line = Math.floor(i / 48);
  const paceShift = Math.sin(i * 1.7 + (w.elapsed || 0) * 0.14) * 0.9;
  const spread =
    (((i * 37) % 97) / 96 - 0.5) * 37 + Math.sin(i * 2.4 + (w.elapsed || 0) * 0.4) * 0.55;
  const lag = line * 2.0 + (i % 13) * 0.27 + paceShift * 0.4;
  const time = w.ropeFallen ? (w.dispersalAt ?? w.elapsed) : w.elapsed;
  // Cap progress cleanly at the iron gate if it has slammed shut
  const maxDist = w.gateClosed ? travelled - 1.4 : travelled;
  const progress = Math.min(maxDist, travelled * clamp(time / HOURGLASS, 0, 1));
  // Slight bunching near the gate once front ranks stall
  const dist = Math.min(maxDist - line * (w.gateClosed ? 0.55 : 0), progress - lag);
  const point = herdPoint(dist, spread);
  if (w.ropeFallen) {
    const away = (w.elapsed || 0) - time;
    const angle = (i % 23) * 2.39996;
    point.x += Math.cos(angle) * away * 2.2;
    point.z -= Math.abs(Math.sin(angle)) * away * 2.2;
  }
  return point;
}

const entity = (id, type, x, z, fields = {}) => ({
  id,
  type,
  x,
  z,
  homeX: x,
  homeZ: z,
  alive: true,
  heading: 0,
  ...fields,
});

const foe = (id, type, x, z, phase, pack = '') =>
  entity(id, type, x, z, {
    phase,
    pack,
    hp: type === 'wolf' ? 2 : type === 'troll' ? 5 : 7,
    maxHp: type === 'wolf' ? 2 : type === 'troll' ? 5 : 7,
    attackAt: 0,
    state: 'idle',
    stateUntil: 0,
    poiseUntil: 0,
    parryWindowUntil: 0,
    altitude: type === 'dragon' ? 4.4 : 0,
  });

function spawnActors() {
  return [
    entity('witch', 'witch', 0, 9, { heading: Math.PI }),
    entity('well', 'spring', -155, 850),
    entity('bell-low', 'bell', 19, 996, { tone: 'low', swingAt: -10 }),
    entity('bell-mid', 'bell', 30, 996, { tone: 'mid', swingAt: -10 }),
    entity('bell-high', 'bell', 41, 996, { tone: 'high', swingAt: -10 }),
    entity('princess', 'princess', 30, 1516, { heading: Math.PI }),
    entity('banquet', 'body', 31.3, 1517),
    // Castle interior storytelling props
    entity('irons', 'irons', 8.6, 1454, { inspected: false }),
    entity('gallery-bell', 'overlook', 50.6, 1457.5, { inspected: false }),
    // Forageable hearth-herbs for healing recovery (#37)
    entity('herb-1', 'herb', 16, 224, { name: 'moonleaf' }),
    entity('herb-2', 'herb', 68, 602, { name: 'moonleaf' }),
    entity('herb-3', 'herb', -147, 845, { name: 'moonleaf' }),
    entity('herb-4', 'herb', 64, 1236, { name: 'moonleaf' }),
    // Wildlife (wolves in pairs for pack flanking, trolls, dragons)
    foe('wolf-1', 'wolf', 80, 303, 1, 'fork'),
    foe('wolf-2', 'wolf', 67, 329, 4.4, 'fork'),
    foe('wolf-3', 'wolf', -42, 435, 0.8, 'west'),
    foe('troll-1', 'troll', 79, 624, 1.9),
    foe('wolf-4', 'wolf', 57, 760, 2.7, 'road'),
    foe('dragon-1', 'dragon', 92, 1184, 2.4),
    foe('troll-2', 'troll', 222, 684, 1.2),
    foe('dragon-2', 'dragon', -290, 646, 4.1),
    foe('wolf-5', 'wolf', -262, 302, 2.4, 'west'),
  ];
}

export function createWorld() {
  const w = {
    version: 2,
    player: {
      x: 0.08,
      z: 0.45,
      y: terrainHeight(0.08, 0.45),
      vy: 0,
      grounded: true,
      yaw: 0,
      pitch: 0,
      health: 5,
      maxHealth: 5,
      stamina: 100,
      maxStamina: 100,
      exhaustedUntil: 0,
    },
    actors: spawnActors(),
    elapsed: 0,
    route: 'undecided',
    dialogue: null,
    ending: null,
    sequence: null,
    ropeFallen: false,
    gateCrossed: false,
    gateClosed: false,
    gateCloseProgress: 0,
    events: [],
    effects: [],
    journal: [
      {
        id: 'opening',
        title: 'Lanternwood',
        text: 'A rider saw Princess Xero carried through the northern gate in irons. The blue ribbon she tied to your sword-hilt still catches the wind.',
        time: 0,
      },
    ],
    discovered: { clearing: true },
    knowsRoad: false,
    mapOpen: false,
    hasMap: false,
    hasVial: false,
    antidote: false,
    moonwellPurified: false,
    moonwellAt: -10,
    moonwellHealed: false,
    potions: 0,
    bridgeOpen: false,
    bridgeProgress: 0,
    bells: [],
    notice:
      'A rider saw Princess Xero taken through the castle gate in irons. Her blue ribbon still hangs from your hilt.',
    noticeUntil: 10,
    lastBell: -1,
    nextAnswer: 0,
    castleEchoAt: 0,
    xeroTugAt: -10,
    nextBanquetCueAt: 0,
    bellDistractUntil: 0,
    crowdBrushUntil: 0,
    greeted: false,
    strikeUntil: 0,
    swing: null,
    hitstop: 0,
    guarding: false,
    guardStart: -10,
    dodgeUntil: 0,
    dodgeCooldown: 0,
    dodgeDx: 0,
    dodgeDz: 0,
    potionUntil: 0,
    hurtUntil: 0,
    shake: 0,
    waypoint: null,
    milestones: {},
    checkpoint: null,
  };
  saveCheckpoint(w, 0);
  return w;
}

function addJournal(w, id, title, text) {
  if (!w.journal) w.journal = [];
  if (w.journal.some((entry) => entry.id === id)) return;
  w.journal.push({ id, title, text, time: Math.round(w.elapsed) });
}

function saveCheckpoint(w, minMargin = 0) {
  const { checkpoint, events, dialogue, ending, sequence, ...rest } = w;
  const safeElapsed = minMargin > 0 ? Math.min(w.elapsed, Math.max(0, HOURGLASS - minMargin)) : w.elapsed;
  w.checkpoint = JSON.stringify({
    ...rest,
    elapsed: safeElapsed,
    events: [],
    effects: [],
    dialogue: null,
    ending: null,
    sequence: null,
    swing: null,
    mapOpen: false,
  });
}

export const getCheckpoint = (w) => w.checkpoint;

export function resumeCheckpoint(w) {
  if (!w.checkpoint) return createWorld();
  const saved = w.checkpoint;
  Object.assign(w, JSON.parse(saved), { checkpoint: saved, events: [], effects: [], mapOpen: false });
  return w;
}

const event = (w, type, text, extra) =>
  w.events.push(extra ? { type, ...(text ? { text } : {}), ...extra } : text ? { type, text } : { type });

function notify(w, text, seconds = 4.2) {
  w.notice = text;
  w.noticeUntil = w.elapsed + seconds;
}

function talk(w, kind, speaker, text, choices = [], question = '') {
  w.dialogue = { kind, speaker, text, choices, question };
  event(w, 'dialogue');
}

// Exact requested wording preserved verbatim (#65).
const witchText =
  'Zelda, princess Xero is in a castle about a mile away. But let me give you a warning first. Zelda, I present you with three options. Option number one is that I tell you how to find the princess who is in grave danger of being eaten by zombies followed by turning into a zombie herself. I will also warn you of monsters that lurk the path to finding the princess and give you potions to destroy the beasts that stand in your way of saving the princess. Option number two is, because of the grave danger you will put yourself in, I present you a potion instead that will make you a stronger person to deal with the loss of the princess after having chosen to not save her. Option number three is, you move on from here and continue to wander the forest how you please.';

function meet(w) {
  w.greeted = true;
  if (w.route === 'guided') {
    talk(
      w,
      'directions',
      'The witch',
      'Keep to the old road north. Listen well at the sluice. If the bridge sleeps, the castle bells will teach you how to wake it.'
    );
    return;
  }
  if (w.route === 'wander') {
    talk(
      w,
      'directions',
      'The witch',
      'You chose the open wood, Zelda. Walk where your feet take you — the wolves will not wait long for a lone lantern.'
    );
    return;
  }
  addJournal(
    w,
    'witch-offer',
    'The witch in Lanternwood',
    'A lantern-bearer barred the clearing with three offers. She watched my hilt closely and spoke of Xero turning as though she already knew the hour.'
  );
  talk(
    w,
    'witch',
    'The witch',
    witchText,
    [
      { id: 1, label: 'Show me the way to Xero' },
      { id: 2, label: 'Give me strength to let her go' },
      { id: 3, label: 'I’ll walk on alone' },
    ],
    'Do you know where Princess Xero is?'
  );
}

function end(w, id, title, text) {
  w.ending = { id, title, text };
  w.dialogue = null;
  w.sequence = null;
  w.mapOpen = false;
  event(w, 'ending', id);
}

function banquet(w, explicit = false) {
  if (w.ending || w.sequence) return;
  if (!explicit && w.milestones.reveal) return;
  const firstReveal = !w.milestones.reveal;
  w.milestones.reveal = true;
  const bellText =
    'The bell rope is tied to Xero’s wrist. She tugs it three times between mouthfuls. Under her hands the stag shudders, still alive. From the downs, thousands of throats answer her invitation.';
  if (firstReveal) {
    event(w, 'reveal');
    addJournal(
      w,
      'banquet-truth',
      'The Long Hall',
      'The bell was never a cry for rescue. Xero tied the rope to her own wrist and rang the dead in to dine beside her.'
    );
  }
  const cureReady = w.route === 'unbound' && w.antidote;
  talk(
    w,
    'banquet',
    'The Long Hall',
    bellText +
      (cureReady
        ? ' A silver drop slides up the mouth of your vial toward her blackened hand.'
        : ' Xero rises from the table. A scrap of blue ribbon hangs from a tooth.'),
    cureReady
      ? [
          { id: 1, label: 'Break the moonwater vial over Xero’s hand' },
          { id: 2, label: 'Reach for the princess' },
        ]
      : [
          { id: 2, label: 'Reach for the princess' },
          { id: 3, label: 'Step back and watch' },
        ]
  );
}

const fates = {
  feast: {
    duration: 3.8,
    title: 'The guest of honour',
    text: 'You reach for the ribbon. Xero catches your wrist between her teeth and pulls you across the table. Your pulse stops under her teeth. The other dead are still outside when Xero begins her second meal.',
  },
  saved: {
    duration: 4.1,
    title: 'The fourth dawn',
    text: 'Silver water runs along Xero’s bitten hand. For the first time her fingers let the bell rope go. Outside, the host turns away. You set the injured stag loose together. At the gate, Xero takes your hand of her own accord.',
  },
  bound: {
    duration: 4.4,
    title: 'The borrowed hand',
    text: 'The potion tastes of pears. The witch lifts her hand. Yours rises with it. You try to ask what she has done, but your mouth is already thanking her in her voice. She sends you to gather another traveller.',
  },
  horde: {
    duration: 3.3,
    title: 'The gate closes',
    text: 'The first rank reaches the drawbridge. Iron drops into stone. Through the oak comes a bell peal and the sound of thousands answering. The way to Xero is gone.',
  },
};

function beginFate(w, id) {
  const p = w.player;
  w.dialogue = null;
  w.mapOpen = false;
  w.swing = null;
  w.guarding = false;
  w.sequence = {
    id,
    time: 0,
    duration: fates[id].duration,
    progress: 0,
    x: p.x,
    z: p.z,
    yaw: p.yaw,
    pitch: p.pitch,
    resisted: false,
  };
  if (id === 'bound') {
    w.actors.push(entity('traveller', 'traveller', -3, -18, { heading: 0 }));
    event(w, 'witch_drink');
  } else if (id === 'horde') {
    w.gateClosed = true;
    event(w, 'gate_seal');
    event(w, 'bell');
    event(w, 'answer');
  }
}

function stageFate(w, dt, input = {}) {
  const q = w.sequence,
    p = w.player;
  q.time += dt;
  q.progress = clamp(q.time / q.duration, 0, 1);
  w.elapsed += dt;
  const t = q.progress;
  if (q.id === 'horde') {
    w.gateCloseProgress = ease(clamp(t / 0.55, 0, 1));
    const facing = Math.atan2(30 - q.x, GATE_Z - q.z);
    const turn = w.reducedMotion ? ease(clamp(t / 0.65, 0, 1)) : ease(clamp(t / 0.45, 0, 1));
    p.yaw = q.yaw + shortestTurn(q.yaw, facing) * turn;
    p.pitch = q.pitch * (1 - turn * 0.6);
    if (t > 0.5 && !q.contact) {
      q.contact = true;
      w.shake = 0.55;
    }
  } else if (q.id === 'bound') {
    // Brief chilling interactive beat: attempting to move or swing raises Zelda's hand in obedience (#70).
    if (t < 0.34 && (Math.abs(input.forward || 0) > 0.2 || Math.abs(input.strafe || 0) > 0.2)) {
      if (!q.resisted) {
        q.resisted = true;
        notify(w, 'You try to pull back, yet your hand lifts to match hers.', 3);
      }
    }
    const traveller = w.actors.find((a) => a.type === 'traveller');
    const facing = Math.atan2(traveller.x - q.x, traveller.z - q.z);
    const turn = w.reducedMotion
      ? ease(clamp((t - 0.35) / 0.45, 0, 1))
      : ease(clamp((t - 0.26) / 0.48, 0, 1));
    p.yaw = q.yaw + shortestTurn(q.yaw, facing) * turn;
    p.pitch = w.reducedMotion ? q.pitch * (1 - turn * 0.4) : q.pitch * (1 - t) - 0.045 * Math.sin(Math.PI * t);
    const walk = w.reducedMotion ? 0 : 2.8 * ease(clamp((t - 0.65) / 0.35, 0, 1));
    p.x = q.x + Math.sin(facing) * walk;
    p.z = q.z + Math.cos(facing) * walk;
  } else {
    const xero = w.actors.find((a) => a.type === 'princess');
    const facing = Math.atan2(xero.homeX - q.x, xero.homeZ - q.z);
    const turn = w.reducedMotion ? ease(clamp(t / 0.4, 0, 1)) : ease(clamp(t / 0.27, 0, 1));
    p.yaw = q.yaw + shortestTurn(q.yaw, facing) * turn;
    p.pitch = w.reducedMotion ? q.pitch * (1 - turn) : q.pitch * (1 - t) - 0.14 * Math.sin(Math.PI * clamp(t / 0.58, 0, 1));
    if (q.id === 'feast') {
      const lunge = ease(clamp((t - 0.32) / 0.34, 0, 1));
      xero.x = xero.homeX + (q.x - xero.homeX) * lunge - 0.58 * Math.sin(facing) * lunge;
      xero.z = xero.homeZ + (q.z - xero.homeZ) * lunge - 0.58 * Math.cos(facing) * lunge;
      const fall = w.reducedMotion ? 0 : ease(clamp((t - 0.64) / 0.34, 0, 1));
      p.pitch -= fall * 0.63;
      p.x = q.x - Math.sin(facing) * fall * 0.8;
      p.z = q.z - Math.cos(facing) * fall * 0.8;
      if (t > 0.62 && !q.contact) {
        q.contact = true;
        w.shake = 0.6;
        event(w, 'hurt');
      }
    } else if (t > 0.42 && !w.ropeFallen) {
      w.ropeFallen = true;
      w.dispersalAt = w.elapsed;
      xero.cured = true;
      event(w, 'cure_splash');
      event(w, 'chime');
      // Animate stag rising & stepping clear of the table
      const stag = w.actors.find((a) => a.type === 'body');
      if (stag) stag.freed = true;
    }
  }
  if (t >= 1) {
    if (q.id === 'feast') p.health = 0;
    end(w, q.id, fates[q.id].title, fates[q.id].text);
  }
}

export function choose(w, n) {
  if (!w.dialogue) return false;
  n = Number(n);
  if (w.dialogue.kind === 'banquet') {
    if (w.route === 'unbound' && w.antidote && n === 1) {
      w.antidote = false;
      event(w, 'cure_splash');
      beginFate(w, 'saved');
      return true;
    }
    if (n === 2) {
      beginFate(w, 'feast');
      return true;
    }
    if (n === 3) {
      w.dialogue = null;
      notify(w, 'You keep your distance. The rope twitches against her wrist.', 4.5);
      return true;
    }
    return false;
  }
  if (w.dialogue.kind !== 'witch' || ![1, 2, 3].includes(n)) return false;
  if (n === 1) {
    w.route = 'guided';
    w.potions = 3;
    w.knowsRoad = true;
    w.discovered.crossing = true;
    w.discovered.bells = true;
    w.discovered.gate = true;
    addJournal(
      w,
      'route-guided',
      'The Castle Road',
      'The witch marked the northern road and gave three cinder phials. Wolves haunt the fork, a troll keeps Briar Hollow, and a dragon circles the Ash Downs.'
    );
    talk(
      w,
      'directions',
      'The witch',
      'Three cinder phials for the road. Break one when a beast draws near. Wolves hunt the fork, a troll keeps Briar Hollow, and a dragon circles the downs. Follow the road north, repeat the castle’s peal at the three-bell sluice, then pass under the gate. Hurry, Zelda.'
    );
  } else if (n === 2) {
    w.route = 'bound';
    beginFate(w, 'bound');
  } else {
    w.route = 'wander';
    w.dialogue = null;
    w.nextHunt = w.elapsed + 18;
    // Physically step the witch aside off the road (#66).
    const witch = w.actors.find((a) => a.type === 'witch' && a.alive);
    if (witch) {
      witch.targetX = 5.4;
      witch.targetZ = 10.6;
    }
    addJournal(
      w,
      'route-wander',
      'Walking Alone',
      'I refused the witch’s bargain and took the forest on my own terms. She stepped aside into the fern shadow.'
    );
    notify(w, 'The witch steps aside. Somewhere in the trees, a wolf answers another.', 5);
    const nearestWolf = w.actors.find((a) => a.type === 'wolf' && a.alive);
    event(w, 'howl', '', nearestWolf ? { x: nearestWolf.x, z: nearestWolf.z } : undefined);
  }
  return true;
}

function nearFacing(w, actor, reach, cos = 0.35) {
  const p = w.player,
    dx = actor.x - p.x,
    dz = actor.z - p.z,
    d = Math.hypot(dx, dz);
  if (d > reach) return false;
  if (hallWallRayBlocked(p.x, p.z, actor.x, actor.z, w.gateClosed)) return false;
  return d < 1.1 || (dx * Math.sin(p.yaw) + dz * Math.cos(p.yaw)) / d >= cos;
}

function nearest(w, predicate) {
  let found = null,
    best = Infinity;
  for (const a of w.actors)
    if (a.alive && predicate(a)) {
      const d = distance(w.player, a);
      if (d < best) {
        best = d;
        found = a;
      }
    }
  return found;
}

const isEnemy = (a) => a.type === 'wolf' || a.type === 'troll' || a.type === 'dragon';
const reachByType = {
  witch: 9.5,
  satchel: 6.5,
  bell: 5.2,
  spring: 9.5,
  princess: 12,
  herb: 4.5,
  irons: 5.5,
  overlook: 6.0,
};

function target(w) {
  return nearest(w, (a) => {
    if (!reachByType[a.type]) return false;
    if (a.type === 'princess' && !insideHall(w.player.x, w.player.z)) return false;
    return nearFacing(w, a, reachByType[a.type]);
  });
}

function ring(w, tone) {
  const bellActor = w.actors.find((a) => a.type === 'bell' && a.tone === tone);
  if (bellActor) bellActor.swingAt = w.elapsed;
  w.bellDistractUntil = w.elapsed + 3.6;
  if (w.bridgeOpen) {
    event(w, 'chime', tone);
    notify(w, 'The bridge holds.');
    return;
  }
  const phrase = ['low', 'high', 'mid'];
  event(w, 'sluice', tone);
  w.bells.push(tone);
  if (w.bells.some((value, i) => value !== phrase[i])) {
    w.bells = tone === 'low' ? ['low'] : [];
    // Actually trigger the castle's 3-note audio answer so the player hears it (#58).
    w.castleEchoAt = w.elapsed + 0.72;
    notify(w, 'The chain drops slack. Across the water, the castle bells answer in three voices.', 6);
  } else if (w.bells.length === 3) {
    w.bridgeOpen = true;
    event(w, 'chime');
    addJournal(
      w,
      'sluice-solved',
      'Three-Bell Sluice',
      'Answering the keep’s three-note call raised the drowned timber bridge from the river.'
    );
    notify(w, 'The three notes settle into place. Chains groan as the bridge rises from the water.', 6);
  } else {
    notify(
      w,
      'The first ' +
        (w.bells.length === 1 ? 'chain draws' : 'two chains draw') +
        ' taut.'
    );
  }
}

function interact(w, a) {
  if (!a) return false;
  if (a.type === 'witch') meet(w);
  else if (a.type === 'bell') ring(w, a.tone);
  else if (a.type === 'princess') banquet(w, true);
  else if (a.type === 'herb') {
    a.alive = false;
    const healed = Math.min(w.player.maxHealth - w.player.health, 2);
    w.player.health = Math.min(w.player.maxHealth, w.player.health + 2);
    event(w, 'moonwell_fill');
    notify(
      w,
      healed > 0
        ? 'You crush wild moonleaf over your wounds. Warmth steadies your breath.'
        : 'You gather a sprig of moonleaf; your strength is already whole.',
      4
    );
  } else if (a.type === 'irons') {
    a.inspected = true;
    addJournal(
      w,
      'broken-irons',
      'Servants’ Cloister',
      'The heavy shackles lie snapped cleanly from the inside, beside a captor’s torn crimson cloak. Xero did not remain a prisoner once the fever took her.'
    );
    talk(
      w,
      'clue',
      'Servants’ Cloister',
      'Heavy iron manacles lie split apart beside a torn crimson cloak. The marks on the stone bench are dragged inward toward the Long Hall — Xero broke free of her captors after the bite took hold.'
    );
  } else if (a.type === 'overlook') {
    a.inspected = true;
    addJournal(
      w,
      'bell-gallery',
      'The Bell Gallery',
      'The cast-bronze bell wheel above the courtyard is wired straight through the rafters into the Long Hall. Every peal was pulled from inside the banquet room.'
    );
    talk(
      w,
      'clue',
      'The Bell Gallery',
      'A heavy bell rope runs from this courtyard pulley straight through the timber rafters into the Long Hall. From the parapet you can see the slow dark column of three thousand dead filling the Ash Downs.'
    );
  } else if (a.type === 'satchel') {
    a.alive = false;
    w.hasMap = true;
    w.hasVial = true;
    w.route = 'unbound';
    w.potions = 3;
    w.discovered.chapel = true;
    w.discovered.ford = true;
    w.discovered.gate = true;
    event(w, 'loot');
    addJournal(
      w,
      'satchel-found',
      'The Mapmaker’s Satchel',
      'Inside the witch’s satchel lay three cinder phials, an empty silver vial, and a map inked with a hidden Pale Trail leading to the Moonwell and Pale Ford.'
    );
    talk(
      w,
      'map',
      'The mapmaker’s hand',
      'Inside her satchel lie three cinder phials, an empty silver vial and a map. A second trail is drawn beneath the road in pale ink. At its spring someone has written, “Moonwater lifts what the mouth has taken. Break the filled vial against living skin.”'
    );
  } else if (a.type === 'spring') {
    w.discovered.chapel = true;
    if (w.hasVial && !w.antidote) {
      w.antidote = true;
      w.moonwellPurified = true;
      w.moonwellAt = w.elapsed;
      if (!w.moonwellHealed && w.player.health < w.player.maxHealth) {
        w.moonwellHealed = true;
        w.player.health = w.player.maxHealth;
      }
      event(w, 'moonwell_fill');
      addJournal(
        w,
        'moonwell-filled',
        'The Moonwell',
        'Filled the silver vial with moonwater. Blackened reeds turned green where a drop fell. The pale trail bends northeast to Pale Ford.'
      );
      talk(
        w,
        'spring',
        'The Moonwell',
        'You fill the silver vial. Where a drop falls on a blackened reed, its green returns. The pale trail bends northeast toward a ford.'
      );
    } else if (!w.moonwellHealed && w.player.health < w.player.maxHealth) {
      w.moonwellHealed = true;
      w.player.health = w.player.maxHealth;
      event(w, 'moonwell_fill');
      notify(w, 'You drink from the cupped stone hand. Cold moonwater restores your strength.', 4.5);
    } else {
      notify(
        w,
        w.antidote ? 'The moonwater vial is full.' : 'Cold water runs through a cupped stone hand.'
      );
    }
  }
  return true;
}

// Physical 3D target hit height band & horizontal body radius for honest melee detection (#26-#31).
function actorBodyMetrics(a) {
  if (a.type === 'wolf') return { base: 0, height: 1.55, radius: 0.72 };
  if (a.type === 'troll') return { base: 0, height: 3.1, radius: 1.25 };
  if (a.type === 'dragon') return { base: a.altitude ?? 3.4, height: 2.3, radius: 1.85 };
  if (a.type === 'witch') return { base: 0, height: 2.2, radius: 0.6 };
  if (a.type === 'bell') return { base: 0.8, height: 2.1, radius: 0.85 };
  return { base: 0, height: 1.8, radius: 0.6 };
}

export function isTargetInSwordReach(w, a, kind = 'slash') {
  const p = w.player;
  const metrics = actorBodyMetrics(a);
  const dx = a.x - p.x,
    dz = a.z - p.z;
  const dist = Math.hypot(dx, dz);
  const maxReach = (kind === 'thrust' ? 4.35 : 3.65) + metrics.radius;
  if (dist > maxReach) return false;
  if (hallWallRayBlocked(p.x, p.z, a.x, a.z, w.gateClosed)) return false;
  const minCos = kind === 'thrust' ? 0.89 : 0.75;
  if (dist > 0.65 && (dx * Math.sin(p.yaw) + dz * Math.cos(p.yaw)) / dist < minCos) return false;
  // Vertical pitch check: player's aim ray at target distance must intersect target's vertical body band
  const eyeY = surfaceHeight(w, p.x, p.z) + 1.66;
  const targetGround = surfaceHeight(w, a.x, a.z);
  const aimY = eyeY + Math.tan(clamp(p.pitch || 0, -1.1, 1.1)) * Math.max(1, dist);
  const lowY = targetGround + metrics.base - 0.95;
  const highY = targetGround + metrics.base + metrics.height + 0.95;
  return aimY >= lowY && aimY <= highY;
}

function actorPassable(w, x, z, radius = 0.55) {
  if (x < MAP.minX + 4 || x > MAP.maxX - 4 || z < MAP.minZ + 4 || z > MAP.maxZ - 4) return false;
  if (!hallWalkable(x, z, radius)) return false;
  if (hitsProp(x, z, radius)) return false;
  // River blocks ground beasts except over an open bridge
  if (z > 1009 && z < 1033 && !(w.bridgeProgress >= 0.55 && Math.abs(x - 30) < 9.1)) return false;
  // Castle curtain walls block beasts
  if (z >= GATE_Z - 1.6 && z <= GATE_Z + 1.6 && x >= 4 && x <= 56 && (w.gateClosed || Math.abs(x - 30) > 4.6))
    return false;
  if (z >= GATE_Z && z <= 1554 && (Math.abs(x - 5) < 1.6 || Math.abs(x - 55) < 1.6)) return false;
  if (Math.abs(z - 1553) < 1.6 && x >= 4 && x <= 56) return false;
  return true;
}

function resolveSwingContacts(w) {
  const sw = w.swing;
  if (!sw) return;
  if (w.elapsed < sw.activeAt || w.elapsed > sw.endAt) return;
  const p = w.player;
  const candidates = w.actors
    .filter(
      (a) =>
        a.alive &&
        !sw.hitIds.includes(a.id) &&
        (a.type === 'witch' || a.type === 'bell' || isEnemy(a)) &&
        isTargetInSwordReach(w, a, sw.kind)
    )
    .sort((a, b) => distance(p, a) - distance(p, b));

  for (const a of candidates) {
    sw.hitIds.push(a.id);
    if (a.type === 'bell') {
      event(w, 'hit_clang', '', { x: a.x, z: a.z });
      ring(w, a.tone);
    } else if (a.type === 'witch') {
      a.alive = false;
      w.hitstop = 0.05;
      event(w, 'hit_flesh', '', { x: a.x, z: a.z });
      w.actors.push(entity('satchel', 'satchel', a.x + 0.6, a.z - 0.3));
      notify(w, 'A clasp springs open in the leaves.', 4);
      addJournal(
        w,
        'witch-struck',
        'Lanternwood',
        'Something fell from the witch’s cloak as she went down — a heavy mapmaker’s satchel with a silver clasp.'
      );
    } else {
      const parryBonus = (a.parryWindowUntil || 0) > w.elapsed ? 2 : 1;
      const dmg = (sw.kind === 'thrust' ? 2 : 1) * parryBonus;
      a.hp -= dmg;
      w.hitstop = 0.048;
      w.shake = Math.max(w.shake || 0, sw.kind === 'thrust' ? 0.24 : 0.14);
      event(w, a.type === 'troll' ? 'hit_clang' : 'hit_flesh', '', { x: a.x, z: a.z });
      w.effects.push({
        type: 'spark',
        x: a.x,
        y: surfaceHeight(w, a.x, a.z) + (a.type === 'dragon' ? a.altitude + 0.6 : 1.0),
        z: a.z,
        at: w.elapsed,
        duration: 0.25,
      });
      if (a.hp <= 0) {
        a.alive = false;
        notify(w, 'The ' + a.type + ' falls back into the undergrowth.');
      } else {
        // Poise prevents infinite light-slash stunlock on trolls (#31).
        const canStagger = a.type !== 'troll' || sw.kind === 'thrust' || w.elapsed >= (a.poiseUntil || 0);
        if (canStagger) {
          a.state = 'stagger';
          a.stateUntil = w.elapsed + (a.type === 'troll' ? 0.52 : 0.45);
          a.attackAt = Math.max(a.attackAt, a.stateUntil + 0.2);
          if (a.type === 'troll') a.poiseUntil = w.elapsed + 2.8;
        }
        // Honest knockback respecting walls and trunks (#22)
        const kb = a.type === 'troll' ? 0.65 : 1.35;
        const nx = a.x + Math.sin(p.yaw) * kb,
          nz = a.z + Math.cos(p.yaw) * kb;
        if (a.type === 'dragon' || actorPassable(w, nx, nz, a.type === 'troll' ? 0.9 : 0.5)) {
          a.x = nx;
          a.z = nz;
        }
        if (parryBonus > 1) notify(w, 'Clean counter-stroke!', 2.2);
      }
    }
    // Thrust pierces 1 primary target; slash cleaves all targets in arc (#30)
    if (sw.kind === 'thrust') break;
  }
}

export function act(w, action) {
  if (w.ending) return false;
  // During the interactive opening of the 'bound' sequence, trying to swing or interact shows obedience (#70)
  if (w.sequence) {
    if (w.sequence.id === 'bound' && w.sequence.progress < 0.36 && (action === 'strike' || action === 'interact')) {
      w.sequence.resisted = true;
      notify(w, 'Your fingers refuse the hilt; your hand rises with hers.', 3);
    }
    return false;
  }
  if (action === 'close') {
    if (w.mapOpen) {
      w.mapOpen = false;
      return true;
    }
    if (!w.dialogue) return false;
    // Safe Escape at banquet (#5): never accidentally triggers death!
    w.dialogue = null;
    return true;
  }
  if (w.dialogue) return false;
  if (action === 'map') {
    w.mapOpen = !w.mapOpen;
    return true;
  }
  if (w.mapOpen) return false;
  if (action === 'interact') return interact(w, target(w));
  if (action === 'guard') {
    w.guarding = true;
    w.guardStart = w.elapsed;
    return true;
  }
  if (action === 'unguard') {
    w.guarding = false;
    return true;
  }
  if (action === 'dodge') {
    if (w.elapsed < (w.dodgeCooldown || 0) || (w.player.stamina ?? 100) < 18) return false;
    w.player.stamina = Math.max(0, (w.player.stamina ?? 100) - 22);
    w.dodgeUntil = w.elapsed + 0.24;
    w.dodgeCooldown = w.elapsed + 0.65;
    w.dodgeDx = -Math.sin(w.player.yaw);
    w.dodgeDz = -Math.cos(w.player.yaw);
    event(w, 'dodge');
    return true;
  }
  if (action === 'strike' || action === 'thrust') {
    if (w.elapsed < w.strikeUntil) return false;
    const isThrust = action === 'thrust';
    if (isThrust && (w.player.stamina ?? 100) < 12) return false;
    if (isThrust) w.player.stamina = Math.max(0, (w.player.stamina ?? 100) - 14);
    const dur = isThrust ? 0.54 : 0.46;
    w.strikeUntil = w.elapsed + dur;
    w.guarding = false;
    w.swing = {
      kind: isThrust ? 'thrust' : 'slash',
      start: w.elapsed,
      activeAt: w.elapsed + (isThrust ? 0.12 : 0.09),
      endAt: w.elapsed + (isThrust ? 0.28 : 0.24),
      end: w.elapsed + dur,
      hitIds: [],
    };
    event(w, isThrust ? 'thrust' : 'strike');
    return true;
  }
  if (action === 'potion') {
    if (w.elapsed < w.potionUntil) return false;
    if (!w.potions) {
      notify(w, 'Your belt holds no cinder phials.');
      return false;
    }
    w.potions--;
    w.potionUntil = w.elapsed + 1.1;
    event(w, 'cinder_shatter');
    const p = w.player;
    const cx = p.x + Math.sin(p.yaw) * 4.5,
      cz = p.z + Math.cos(p.yaw) * 4.5;
    w.effects.push({
      type: 'cinder',
      x: cx,
      y: surfaceHeight(w, cx, cz) + 0.4,
      z: cz,
      at: w.elapsed,
      duration: 0.9,
      radius: 17,
    });
    let count = 0;
    for (const a of w.actors) {
      if (!a.alive || !isEnemy(a)) continue;
      const distFromPlayer = distance(a, p);
      const distFromBlast = Math.hypot(a.x - cx, a.z - cz);
      if (distFromPlayer > 22 && distFromBlast > 17) continue;
      if (hallWallRayBlocked(p.x, p.z, a.x, a.z, w.gateClosed)) continue;
      if (a.type === 'wolf') {
        a.alive = false;
        count++;
      } else {
        a.hp -= 5;
        if (a.hp <= 0) {
          a.alive = false;
        } else {
          a.state = 'stagger';
          a.stateUntil = w.elapsed + 1.6;
          a.attackAt = w.elapsed + 2.2;
        }
        count++;
      }
    }
    w.shake = Math.max(w.shake || 0, 0.35);
    notify(
      w,
      count ? 'Cinder fire bursts forward, scattering the beasts.' : 'A ring of cinder sparks fades in the grass.'
    );
    return true;
  }
  return false;
}

function injury(w, a, dmgOverride) {
  if (w.elapsed < w.hurtUntil || w.elapsed < (w.dodgeUntil || 0)) return;
  const p = w.player;
  // Guard & timed Parry (#32)
  if (w.guarding) {
    const timedParry = w.elapsed - (w.guardStart || -10) <= 0.32;
    if (timedParry) {
      event(w, 'parry', '', { x: a.x, z: a.z });
      a.state = 'stagger';
      a.stateUntil = w.elapsed + 1.45;
      a.parryWindowUntil = w.elapsed + 1.65;
      a.attackAt = w.elapsed + 1.9;
      w.hitstop = 0.06;
      w.shake = 0.28;
      notify(w, 'Parried! Strike while the ' + a.type + ' reels.', 2.6);
      return;
    }
    if ((p.stamina ?? 0) >= 16) {
      p.stamina = Math.max(0, p.stamina - 22);
      w.hurtUntil = w.elapsed + 0.55;
      w.shake = 0.22;
      event(w, 'hit_clang', '', { x: a.x, z: a.z });
      notify(w, 'Your blade turns the blow aside.', 2.1);
      return;
    }
  }
  w.hurtUntil = w.elapsed + 1.35;
  const dmg = dmgOverride ?? (a.type === 'wolf' ? 1 : 2);
  p.health = Math.max(0, p.health - dmg);
  w.shake = Math.max(w.shake || 0, dmg > 1 ? 0.52 : 0.3);
  event(w, 'hurt', '', { x: a.x, z: a.z });
  if (!p.health) {
    const line = {
      wolf: 'You hear a second set of paws behind you. Your lantern rolls into the ferns.',
      troll:
        'The troll’s shadow falls across your path. Your sword rings once against stone and falls silent.',
      dragon: 'Wind folds the canopy flat. In the dragon’s breath, the forest turns white.',
    }[a.type];
    end(w, 'wilds', 'Lost in the green', line);
  } else notify(w, 'The ' + a.type + ' strikes. Guard, dodge, or step clear.', 2.7);
}

export function isPlayerSheltered(w) {
  const p = w.player;
  // Localized sanctuary: clearing, inside castle, local Three-Bell Sluice stone circle (28m radius, NOT map-wide Z-band #43),
  // or the Pale Trail's wolfbane-lined track (independent of holding the map #44).
  return (
    Math.hypot(p.x, p.z - 9) < 34 ||
    p.z > 1428 ||
    Math.hypot(p.x - 30, p.z - 996) < 28 ||
    (Math.abs(p.x - trailX(p.z)) < 11.5 && p.z > 65 && p.z < 1370)
  );
}

function advanceWildlife(w, dt) {
  const p = w.player;
  const shelter = isPlayerSheltered(w);
  const wandering = w.route === 'wander' || (w.route === 'undecided' && p.z > 42);
  if (wandering && !shelter && w.elapsed >= (w.nextHunt ?? (w.route === 'wander' ? 18 : 28))) {
    w.nextHunt = w.elapsed + 34;
    const members = w.actors.filter((a) => a.alive && a.type === 'wolf');
    const hunter = members.sort((a, b) => distance(a, p) - distance(b, p))[0];
    if (hunter) {
      hunter.huntingUntil = w.elapsed + 48;
      event(w, 'howl', '', { x: hunter.x, z: hunter.z });
      notify(w, 'A wolf has caught your scent. Its answer comes from behind the trees.', 5);
    }
  }

  // Group living wolves to assign direct pursuer vs flanker (#39)
  const alertWolves = w.actors
    .filter((a) => a.alive && a.type === 'wolf' && !shelter && ((a.huntingUntil || 0) > w.elapsed || distance(a, p) < 42))
    .sort((a, b) => distance(a, p) - distance(b, p));

  for (const a of w.actors) {
    if (!a.alive || !isEnemy(a)) continue;
    const d = distance(a, p);
    const range = a.type === 'dragon' ? 54 : a.type === 'wolf' ? 42 : 34;
    const alerted =
      !shelter &&
      ((a.huntingUntil || 0) > w.elapsed || (d < range && Math.hypot(p.x - a.homeX, p.z - a.homeZ) < 115));

    // Handle stagger, windup, strike & recovery state machine (#40-#42)
    if (a.state === 'stagger') {
      if (w.elapsed >= a.stateUntil) a.state = 'idle';
      continue;
    }
    if (a.state === 'recover') {
      if (w.elapsed >= a.stateUntil) a.state = 'idle';
      continue;
    }
    if (a.state === 'windup') {
      a.heading = Math.atan2(p.x - a.x, p.z - a.z);
      if (a.type === 'dragon') a.altitude = Math.max(2.4, (a.altitude ?? 4.4) - dt * 2.8);
      if (w.elapsed >= a.stateUntil) {
        a.state = 'recover';
        a.stateUntil = w.elapsed + (a.type === 'troll' ? 0.92 : a.type === 'dragon' ? 1.15 : 0.65);
        a.attackAt = a.stateUntil + (a.type === 'wolf' ? 0.95 : 1.35);
        if (a.type === 'wolf') {
          // Lunge forward along heading
          const lx = a.x + Math.sin(a.heading) * 2.4,
            lz = a.z + Math.cos(a.heading) * 2.4;
          if (actorPassable(w, lx, lz, 0.5)) {
            a.x = lx;
            a.z = lz;
          }
          if (distance(a, p) < 3.4 && !hallWallRayBlocked(a.x, a.z, p.x, p.z, w.gateClosed)) injury(w, a, 1);
        } else if (a.type === 'troll') {
          w.shake = Math.max(w.shake || 0, 0.42 * clamp(1 - d / 26, 0.2, 1));
          event(w, 'tremor', '', { x: a.x, z: a.z });
          if (distance(a, p) < 5.6 && !hallWallRayBlocked(a.x, a.z, p.x, p.z, w.gateClosed)) injury(w, a, 2);
        } else if (a.type === 'dragon') {
          // Sweeping fire-breath lane in front of dragon (#42)
          const fx = a.x + Math.sin(a.heading) * 7.5,
            fz = a.z + Math.cos(a.heading) * 7.5;
          w.effects.push({
            type: 'fire',
            x: a.x,
            y: surfaceHeight(w, a.x, a.z) + (a.altitude ?? 2.8),
            z: a.z,
            tx: fx,
            ty: surfaceHeight(w, fx, fz) + 0.4,
            tz: fz,
            at: w.elapsed,
            duration: 0.72,
          });
          event(w, 'dragon_fire', '', { x: a.x, z: a.z });
          const dx = p.x - a.x,
            dz = p.z - a.z,
            proj = dx * Math.sin(a.heading) + dz * Math.cos(a.heading),
            perp = Math.abs(dx * Math.cos(a.heading) - dz * Math.sin(a.heading));
          if (proj > 1 && proj < 13.5 && perp < 2.6 && !hallWallRayBlocked(a.x, a.z, p.x, p.z, w.gateClosed)) {
            injury(w, a, 2);
          }
        }
        if (w.ending) return;
      }
      continue;
    }

    // Dragon altitude gently returns to soaring height outside windup
    if (a.type === 'dragon') {
      const targetAlt = alerted ? 3.5 + Math.sin(w.elapsed * 1.4 + a.phase) * 0.55 : 4.8 + Math.sin(w.elapsed + a.phase) * 0.7;
      a.altitude = (a.altitude ?? 4.4) + (targetAlt - (a.altitude ?? 4.4)) * Math.min(1, dt * 2.2);
    }

    const radius = a.type === 'dragon' ? 20 : 6;
    let tx = alerted ? p.x : a.homeX + Math.sin(w.elapsed * 0.12 + a.phase) * radius;
    let tz = alerted ? p.z : a.homeZ + Math.cos(w.elapsed * 0.12 + a.phase) * radius;

    // Wolf pack flanking: secondary pack wolf arcs wide to cut ahead of Zelda (#39)
    if (alerted && a.type === 'wolf' && alertWolves.length >= 2 && alertWolves[0].id !== a.id && d > 5.5) {
      const flankSide = a.phase > 2.5 ? 1 : -1;
      const toPlayer = Math.atan2(p.x - a.x, p.z - a.z);
      tx = p.x + Math.cos(toPlayer) * flankSide * 6.5 + Math.sin(p.yaw) * 4;
      tz = p.z - Math.sin(toPlayer) * flankSide * 6.5 + Math.cos(p.yaw) * 4;
    }

    const gap = Math.hypot(tx - a.x, tz - a.z);
    const strikeRange = a.type === 'dragon' ? 11.5 : a.type === 'troll' ? 5.2 : 3.6;

    if (alerted && d < strikeRange && w.elapsed >= a.attackAt && !hallWallRayBlocked(a.x, a.z, p.x, p.z, w.gateClosed)) {
      a.state = 'windup';
      const windup = a.type === 'dragon' ? 0.75 : a.type === 'troll' ? 0.68 : 0.42;
      a.stateUntil = w.elapsed + windup;
      a.windupDuration = windup;
      event(w, 'telegraph_' + a.type, '', { x: a.x, z: a.z });
      continue;
    }

    if (gap > 0.15) {
      a.state = alerted ? 'chase' : 'idle';
      a.heading = Math.atan2(tx - a.x, tz - a.z);
      const speed = alerted
        ? a.type === 'wolf'
          ? 9.6
          : a.type === 'dragon'
            ? 8.8
            : 5.0
        : a.type === 'dragon'
          ? 3.2
          : 1.5;
      const step = Math.min(gap, dt * speed);
      const nx = a.x + Math.sin(a.heading) * step;
      const nz = a.z + Math.cos(a.heading) * step;
      const bodyR = a.type === 'troll' ? 0.9 : 0.48;
      if (a.type === 'dragon') {
        a.x = nx;
        a.z = nz;
      } else if (actorPassable(w, nx, nz, bodyR)) {
        a.x = nx;
        a.z = nz;
      } else if (actorPassable(w, nx, a.z, bodyR)) {
        a.x = nx;
      } else if (actorPassable(w, a.x, nz, bodyR)) {
        a.z = nz;
      }
      // Troll heavy footstep ground tremor when close (#41)
      if (a.type === 'troll' && alerted && d < 24 && Math.floor((w.elapsed + dt) * 1.4) > Math.floor(w.elapsed * 1.4)) {
        w.shake = Math.max(w.shake || 0, 0.14 * clamp(1 - d / 24, 0, 1));
      }
    }
  }
}

function hitsLivingActor(w, x, z) {
  for (const a of w.actors) {
    if (!a.alive) continue;
    if (a.type === 'witch' || a.type === 'princess') {
      if ((x - a.x) ** 2 + (z - a.z) ** 2 < 0.56 ** 2) return true;
    }
  }
  return false;
}

export function passable(w, x, z) {
  if (x < MAP.minX || x > MAP.maxX || z < MAP.minZ || z > MAP.maxZ) return false;
  if (!hallWalkable(x, z) || hitsProp(x, z, 0.32) || hitsLivingActor(w, x, z)) return false;
  // River crossing: strict stepping-stone line at Pale Ford (#19) and railing-bounded rising bridge (#17)
  if (z > 1010 && z < 1032) {
    const onFord = Math.abs(x - fordCenterX(z)) < 3.15;
    const onBridge = (w.bridgeProgress ?? (w.bridgeOpen ? 1 : 0)) >= 0.55 && Math.abs(x - 30) < 9.15;
    if (!onFord && !onBridge) return false;
  }
  // Bridge side railings on entry ramps (z: 1006.5..1010 and 1032..1036.5)
  if ((w.bridgeProgress ?? (w.bridgeOpen ? 1 : 0)) >= 0.3 && z >= 1006.5 && z <= 1036.5) {
    if (Math.abs(Math.abs(x - 30) - 9.65) < 0.45) return false;
  }
  // Castle outer curtain walls and closing iron portcullis
  if (z >= GATE_Z - 1.6 && z <= GATE_Z + 1.6 && x >= 4 && x <= 56) {
    if (w.gateClosed || Math.abs(x - 30) > 4.7) return false;
  }
  if (z >= GATE_Z && z <= 1554 && (Math.abs(x - 5) < 1.4 || Math.abs(x - 55) < 1.4)) return false;
  if (Math.abs(z - 1553) < 1.5 && x >= 4 && x <= 56) return false;
  return true;
}

function landmarkBeat(w, id, title, condition, text, sound) {
  if (!condition || w.milestones[id]) return;
  w.milestones[id] = true;
  notify(w, text, 5.5);
  addJournal(w, id, title, text);
  if (sound) event(w, sound);
}

function simulate(w, dt, input) {
  const p = w.player;
  if (w.hitstop > 0) {
    w.hitstop = Math.max(0, w.hitstop - dt);
    return;
  }
  w.elapsed += dt;
  w.shake = Math.max(0, (w.shake || 0) - dt * 1.4);

  // Prune expired visual effects
  if (w.effects?.length) {
    w.effects = w.effects.filter((ef) => w.elapsed < ef.at + ef.duration);
  }

  // Smooth bridge elevation animation (#59)
  if (w.bridgeOpen && (w.bridgeProgress || 0) < 1) {
    w.bridgeProgress = clamp((w.bridgeProgress || 0) + dt / 2.2, 0, 1);
  }
  // Smooth portcullis drop animation
  if (w.gateClosed && (w.gateCloseProgress || 0) < 1) {
    w.gateCloseProgress = clamp((w.gateCloseProgress || 0) + dt / 1.4, 0, 1);
  }

  // Smooth witch stepping aside after Option 3 (#66)
  const witch = w.actors.find((a) => a.type === 'witch' && a.alive);
  if (witch && Number.isFinite(witch.targetX)) {
    const dx = witch.targetX - witch.x,
      dz = witch.targetZ - witch.z,
      dist = Math.hypot(dx, dz);
    if (dist > 0.08) {
      const s = Math.min(dist, dt * 2.2);
      witch.x += (dx / dist) * s;
      witch.z += (dz / dist) * s;
      witch.heading = Math.atan2(p.x - witch.x, p.z - witch.z);
    }
  }

  // Guard input syncing
  if (input.guard && !w.guarding && !w.swing) {
    w.guarding = true;
    w.guardStart = w.elapsed;
  } else if (input.guard === false && w.guarding) {
    w.guarding = false;
  }

  // Active sword swing resolution (#29)
  if (w.swing) {
    resolveSwingContacts(w);
    if (w.elapsed >= w.swing.end) w.swing = null;
  }

  // Camera keyboard turn & pitch (#103)
  p.yaw += (Number(input.turn) || 0) * 1.9 * dt;
  if (input.pitch) {
    p.pitch = clamp((p.pitch || 0) + Number(input.pitch) * 1.35 * dt, -1.03, 1.04);
  }

  const f = clamp(Number(input.forward) || 0, -1, 1),
    s = clamp(Number(input.strafe) || 0, -1, 1);
  const moving = Math.hypot(f, s) > 0.05;

  // Stamina & realistic movement speed (#6, #23)
  if (p.stamina === undefined) p.stamina = 100;
  const wantsSprint = Boolean(input.sprint) && moving && !w.guarding && f >= -0.1 && w.elapsed >= (p.exhaustedUntil || 0);
  const sprinting = wantsSprint && p.stamina > 1;
  if (sprinting) {
    p.stamina = Math.max(0, p.stamina - 22 * dt);
    if (p.stamina <= 0.5) {
      p.exhaustedUntil = w.elapsed + 1.8;
      event(w, 'breath_winded');
    }
  } else {
    p.stamina = Math.min(p.maxStamina || 100, p.stamina + (moving ? 25 : 38) * dt);
  }

  let speed = sprinting ? 10.4 : 6.4;
  if (w.guarding) speed *= 0.52;
  else if (f < -0.15) speed *= 0.76;
  const mat = surfaceMaterial(w, p.x, p.z);
  if (mat === 'water') speed *= 0.84;

  let dx = 0,
    dz = 0;
  if (w.elapsed < (w.dodgeUntil || 0)) {
    const dodgeDirX = moving ? Math.sin(p.yaw) * f + Math.cos(p.yaw) * s : w.dodgeDx;
    const dodgeDirZ = moving ? Math.cos(p.yaw) * f - Math.sin(p.yaw) * s : w.dodgeDz;
    const norm = Math.hypot(dodgeDirX, dodgeDirZ) || 1;
    dx = (dodgeDirX / norm) * 14.5 * dt;
    dz = (dodgeDirZ / norm) * 14.5 * dt;
  } else {
    const stride = (speed * dt) / Math.max(1, Math.hypot(f, s));
    dx = stride * (Math.sin(p.yaw) * f + Math.cos(p.yaw) * s);
    dz = stride * (Math.cos(p.yaw) * f - Math.sin(p.yaw) * s);
  }
  // Gentle ford current nudge when wading in the river (#20)
  if (mat === 'water' && p.z > 1010 && p.z < 1032) {
    dx += 0.35 * dt;
  }

  if (dx && passable(w, p.x + dx, p.z)) p.x += dx;
  if (dz && passable(w, p.x, p.z + dz)) p.z += dz;
  else if (Math.abs(dz) > 0.01 && Math.abs(p.z - 1021) < 20 && w.noticeUntil < w.elapsed) {
    notify(
      w,
      w.hasMap
        ? 'Deep water. Keep to the stepping stones at Pale Ford, or wake the bridge.'
        : 'Deep water. Three bells stand on the southern bank.'
    );
  }

  // Vertical surface tracking & gravity step-down (#24)
  const targetY = surfaceHeight(w, p.x, p.z);
  if (p.y === undefined) p.y = targetY;
  if (targetY >= p.y - 0.38) {
    if (!p.grounded && (p.vy || 0) < -3.2) event(w, 'land');
    p.y = targetY;
    p.vy = 0;
    p.grounded = true;
  } else {
    p.grounded = false;
    p.vy = (p.vy || 0) - 18 * dt;
    p.y = Math.max(targetY, p.y + p.vy * dt);
    if (p.y <= targetY + 0.01) {
      if (p.vy < -3.2) event(w, 'land');
      p.y = targetY;
      p.vy = 0;
      p.grounded = true;
    }
  }

  // Discover landmarks organically by proximity (#50, #54)
  for (const mark of LANDMARKS) {
    if (!w.discovered[mark.id] && distance(p, mark) < 62) {
      w.discovered[mark.id] = true;
    }
  }

  // Subtle physical brush-past when walking among the 3,072 marchers (#45)
  if (!w.gateCrossed && p.z > 1060 && w.elapsed >= (w.crowdBrushUntil || 0)) {
    for (let i = 0; i < HORDE_COUNT; i += 24) {
      const m = hordePosition(w, i);
      const mdx = p.x - m.x,
        mdz = p.z - m.z,
        md = Math.hypot(mdx, mdz);
      if (md < 1.15 && md > 0.01) {
        const push = (1.15 - md) * 0.28;
        if (passable(w, p.x + (mdx / md) * push, p.z + (mdz / md) * push)) {
          p.x += (mdx / md) * push;
          p.z += (mdz / md) * push;
        }
        w.crowdBrushUntil = w.elapsed + 1.4;
        event(w, 'rustle');
        break;
      }
    }
  }

  // Track crossing the Castle Xero gate (#1)
  if (!w.gateCrossed && p.z >= GATE_Z + 1.4 && Math.abs(p.x - 30) <= 24) {
    w.gateCrossed = true;
    w.discovered.gate = true;
    addJournal(w, 'gate-crossed', 'Inside Castle Xero', 'Passed beneath the open portcullis before the host reached the drawbridge.');
  }

  // Castle bell cadence & synchronized Xero rope tug (#71, #87)
  const peal = Math.floor((w.elapsed + 31) / 37);
  if (peal > w.lastBell) {
    w.lastBell = peal;
    if (w.elapsed > 2 && !w.ropeFallen) {
      event(w, 'bell');
      w.xeroTugAt = w.elapsed;
      w.nextAnswer = w.elapsed + 3.1;
    }
  }
  if (w.castleEchoAt && w.elapsed >= w.castleEchoAt) {
    w.castleEchoAt = 0;
    event(w, 'bell');
    w.xeroTugAt = w.elapsed;
  }
  if (w.nextAnswer && w.elapsed >= w.nextAnswer) {
    event(w, 'answer');
    w.nextAnswer = 0;
  }

  // Ambient banquet audio cues inside the Long Hall before reveal (#71, #98)
  if (insideHall(p.x, p.z) && !w.ropeFallen && w.elapsed >= (w.nextBanquetCueAt || 0)) {
    w.nextBanquetCueAt = w.elapsed + 3.4;
    event(w, 'banquet_ambient', '', { x: 31.3, z: 1517 });
  }

  advanceWildlife(w, dt);
  if (w.ending) return;

  if (!w.greeted && w.actors[0].alive && distance(p, w.actors[0]) < 6.4) {
    meet(w);
    return;
  }

  // Hourglass expiration handling (#1, #8, #9)
  if (w.elapsed >= HOURGLASS && !w.gateClosed) {
    if (w.gateCrossed) {
      w.gateClosed = true;
      event(w, 'gate_seal');
      notify(
        w,
        'Behind you, the iron gate slams into stone. The host hammers at the oak, sealed outside.',
        6.5
      );
    } else if (w.route === 'wander') {
      w.gateClosed = true;
      event(w, 'gate_seal');
      notify(
        w,
        'Far to the north, the iron gate drops into stone. The castle is sealed; the greenwood remains yours to roam.',
        6.5
      );
    } else {
      beginFate(w, 'horde');
      return;
    }
  }

  // Milepost fork beat only when actually near the milepost at (roadX(220)+7, 220) (#11)
  const mileX = roadX(220) + 7;
  landmarkBeat(
    w,
    'fork',
    'Wayfarer’s Fork',
    Math.hypot(p.x - mileX, p.z - 220) < 25,
    'On the northbound milepost, Xero’s blue ribbon hangs from an open shackle. In the western valley, a long dark line is moving.'
  );
  landmarkBeat(
    w,
    'ridge',
    'Ravenback Ridge',
    p.z > 449 && p.z < 550 && Math.abs(p.x) < 235,
    'From the ridge you can see them advancing under the castle banners. There must be thousands.',
    'howl'
  );
  // Don't spoil the 3-note order in the stone text (#57)
  landmarkBeat(
    w,
    'sluice',
    'Three-Bell Sluice',
    Math.hypot(p.x - 30, p.z - 996) < 42,
    'Carved in the bank stone: “When the keep calls, answer in kind.” Listen to the castle’s three voices.',
    'bell'
  );
  // Subtle discovery of Pale Trail wolfbane markers even without map (#44)
  landmarkBeat(
    w,
    'pale-moss',
    'The Pale Trail',
    Math.abs(p.x - trailX(p.z)) < 9 && p.z > 160 && p.z < 820 && !w.hasMap,
    'Silver ash and pale wolfbane line this narrow track. Even the forest beasts seem to skirt its edge.'
  );
  if (!w.milestones.procession && p.z > 1000 && Math.abs(p.x) < 450 && w.elapsed > (w.nextHostLook || 0)) {
    w.nextHostLook = w.elapsed + 1.2;
    for (let i = 0; i < HORDE_COUNT; i += 240) {
      if (distance(p, hordePosition(w, i)) < 48) {
        landmarkBeat(
          w,
          'procession',
          'The Three Thousand',
          true,
          'A grey face turns at the toll. The dead pass within earshot without once looking at you.',
          'answer'
        );
        break;
      }
    }
  }
  landmarkBeat(
    w,
    'approach',
    'Castle Approach',
    p.z > 1352 && Math.abs(p.x - 30) < 56,
    'A bell rings beyond the open gate. Something heavy moves across the flagstones.'
  );
  if (!w.milestones.gateSave && p.z > 1390 && p.z < 1440 && Math.abs(p.x - 30) < 48) {
    w.milestones.gateSave = true;
    saveCheckpoint(w, 30);
  }
  if (!w.milestones.riverSave && p.z > 1036 && p.z < 1100) {
    w.milestones.riverSave = true;
    saveCheckpoint(w, 95);
  }

  // Banquet reveal requires being INSIDE the Long Hall, unobstructed, and looking toward Xero (#3, #4)
  const xero = w.actors.find((a) => a.type === 'princess' && a.alive);
  if (xero && insideHall(p.x, p.z) && p.z > 1492 && !w.milestones.reveal) {
    const dx = xero.x - p.x,
      dz = xero.z - p.z,
      dist = Math.hypot(dx, dz);
    const facingXero = dist < 2.2 || (dx * Math.sin(p.yaw) + dz * Math.cos(p.yaw)) / dist >= 0.45;
    if ((dist < 19 && facingXero) || dist < 5.5) {
      if (!hallWallRayBlocked(p.x, p.z, xero.x, xero.z, w.gateClosed)) {
        banquet(w, false);
      }
    }
  }
}

// Substep so doors, water, combat active windows and race clock remain accurate across frame rates (#113).
export function tick(w, dt, input = {}) {
  if (!w || w.dialogue || w.ending || w.mapOpen || !Number.isFinite(dt) || dt <= 0) return;
  const length = Math.min(dt, 0.35);
  if (w.sequence) {
    stageFate(w, length, input);
    return;
  }
  const slices = Math.ceil(length / 0.04);
  for (let i = 0; i < slices; i++) {
    simulate(w, length / slices, input);
    if (w.dialogue || w.ending || w.sequence) break;
  }
}

function location(w) {
  const p = w.player;
  if (insideHall(p.x, p.z)) return 'The Long Hall';
  if (insideCloister(p.x, p.z)) return 'Servants’ Cloister';
  if (insideGallery(p.x, p.z)) return 'The Bell Gallery';
  if (p.z >= GATE_Z && p.z <= 1554 && xBetween(p.x, 5, 55)) return 'Castle Courtyard';
  let nearestMark = LANDMARKS[0],
    best = Infinity;
  for (const place of LANDMARKS) {
    if (place.secret && !w.hasMap && !w.discovered?.[place.id]) continue;
    const d = distance(p, place);
    if (d < best) {
      nearestMark = place;
      best = d;
    }
  }
  if (best < 185) return nearestMark.name;
  if (Math.abs(p.z - 1021) < 35) return 'The Riverbank';
  return p.z > 980 ? 'The Ash Downs' : p.x < -80 ? 'The West Wood' : 'The Deepwood';
}

const xBetween = (x, a, b) => x >= a && x <= b;

function polylineLength(pts, fromZ, toZ) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x1, z1] = pts[i - 1],
      [x2, z2] = pts[i];
    if (z2 <= fromZ || z1 >= toZ) continue;
    const za = Math.max(z1, fromZ),
      zb = Math.min(z2, toZ);
    const t1 = (za - z1) / (z2 - z1),
      t2 = (zb - z1) / (z2 - z1);
    const xa = x1 + (x2 - x1) * t1,
      xb = x1 + (x2 - x1) * t2;
    total += Math.hypot(xb - xa, zb - za);
  }
  return total;
}

// Route-aware travel distance following road/trail rather than misleading straight-line distance (#51).
export function routeDistance(w) {
  const p = w.player;
  const toWell = w.hasMap && !w.antidote;
  if (toWell) {
    const well = LANDMARKS.find((l) => l.id === 'chapel');
    if (p.z >= 820) return Math.round(distance(p, well));
    const onTrailDist = Math.abs(p.x - trailX(p.z)) + polylineLength(MAP.trail, Math.max(9, p.z), 850);
    return Math.round(Math.min(distance(p, well) * 1.15, onTrailDist));
  }
  const hall = LANDMARKS.find((l) => l.id === 'hall');
  if (p.z >= GATE_Z - 20) return Math.round(distance(p, hall));
  const useTrail = w.hasMap && p.x < -25 && p.z < 1390;
  const line = useTrail ? MAP.trail : MAP.road;
  const lineX = useTrail ? trailX(p.z) : roadX(p.z);
  const tail = useTrail ? polylineLength(MAP.trail, Math.max(9, p.z), 1392) + Math.hypot(0, 1516 - 1392) : polylineLength(MAP.road, Math.max(-115, p.z), 1516);
  return Math.round(Math.abs(p.x - lineX) + tail);
}

function objective(w) {
  if (w.gateCrossed) {
    if (w.route === 'unbound' && w.antidote) return 'Enter the Long Hall and save Princess Xero.';
    return 'Explore Castle Xero and enter the Long Hall.';
  }
  if (w.route === 'unbound' && !w.antidote) return 'Carry the silver vial to the Moonwell.';
  if (w.route === 'guided' && !w.bridgeOpen && w.player.z > 870 && w.player.z < 1034)
    return 'Answer the castle’s three notes at the sluice.';
  if (w.route === 'wander') return 'Find your own way through the forest.';
  if (w.route === 'undecided' && !w.greeted && w.actors[0].alive)
    return 'Find the castle where Princess Xero is held.';
  return 'Reach Castle Xero before the host reaches the gate.';
}

export function getHUD(w) {
  const a = target(w);
  const labels = {
    witch: 'Speak to the witch',
    satchel: 'Examine the fallen satchel',
    spring: w.hasVial && !w.antidote ? 'Fill the silver vial' : 'Drink from the Moonwell',
    princess: 'Approach Princess Xero',
    herb: 'Gather moonleaf',
    irons: 'Examine the broken irons',
    overlook: 'Inspect the bell wheel',
  };
  const hint = a
    ? (a.type === 'bell'
        ? 'Ring the ' + { low: 'deep', high: 'high', mid: 'middle' }[a.tone] + ' bell'
        : labels[a.type]) || ''
    : '';
  const goal =
    w.hasMap && !w.antidote
      ? LANDMARKS.find((i) => i.id === 'chapel')
      : LANDMARKS.find((i) => i.id === 'hall');
  const inSwordRange = w.actors.some(
    (actor) => actor.alive && (isEnemy(actor) || actor.type === 'bell') && isTargetInSwordReach(w, actor, 'slash')
  );
  return {
    location: location(w),
    objective: objective(w),
    hint,
    notice: w.elapsed < w.noticeUntil ? w.notice : '',
    health: w.player.health,
    maxHealth: w.player.maxHealth,
    stamina: Math.round(w.player.stamina ?? 100),
    maxStamina: w.player.maxStamina || 100,
    potions: w.potions,
    hasVial: w.hasVial,
    antidote: w.antidote,
    guarding: Boolean(w.guarding),
    inSwordRange,
    gateCrossed: Boolean(w.gateCrossed),
    gateClosed: Boolean(w.gateClosed),
    hordeProgress: clamp(w.elapsed / HOURGLASS, 0, 1),
    hasMap: w.hasMap,
    bearing: Math.atan2(goal.x - w.player.x, goal.z - w.player.z),
    distance: routeDistance(w),
    journalCount: w.journal?.length || 0,
  };
}
