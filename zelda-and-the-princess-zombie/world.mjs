import { hallWalkable } from './hall.mjs';

// World distances are metres. North is +z. All mutable state is plain JSON.
export const HORDE_COUNT = 3072;
const HOURGLASS = 395;
const GATE_Z = 1435;
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
export function terrainHeight(x, z) {
  // Flatten the banks, buildings and clearing so actors, stonework and feet agree.
  const swell =
    Math.sin(x * 0.014 + z * 0.008) * 2.9 +
    Math.sin(z * 0.024 - x * 0.009) * 1.55 +
    Math.cos(x * 0.042) * 0.65;
  const ridge = 17 * Math.exp(-(((z - 486) / 89) ** 2)) * Math.exp(-(((x - 7) / 290) ** 2));
  const bank = clamp((Math.abs(z - 1021) - 12) / 37, 0, 1);
  const flat = clamp((z - 30) / 70, 0, 1) * clamp((1415 - z) / 85, 0, 1);
  return (swell + ridge) * bank * flat;
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
// Average neighbouring tangents at each bend. Each lane then turns gradually
// without an individual jumping from one side of the column to the other.
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
  const width = offset * clamp((travelled - metres) / 44, 0.22, 1);
  return {
    x: leg.a[0] + leg.tangent.x * along + (a.x + (b.x - a.x) * bend) * width,
    z: leg.a[1] + leg.tangent.z * along + (a.z + (b.z - a.z) * bend) * width,
  };
}
export function hordePosition(w, index) {
  const i = clamp(Math.floor(index), 0, HORDE_COUNT - 1),
    line = Math.floor(i / 48);
  const spread = (((i * 37) % 97) / 96 - 0.5) * 37 + Math.sin(i * 2.4 + w.elapsed * 0.4) * 0.45;
  const lag = line * 2.0 + (i % 13) * 0.27;
  const time = w.ropeFallen ? (w.dispersalAt ?? w.elapsed) : w.elapsed;
  const point = herdPoint(travelled * clamp(time / HOURGLASS, 0, 1) - lag, spread);
  if (w.ropeFallen) {
    const away = w.elapsed - time;
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
const foe = (id, type, x, z, phase) =>
  entity(id, type, x, z, { phase, hp: type === 'wolf' ? 2 : type === 'troll' ? 5 : 7, attackAt: 0 });
function spawnActors() {
  return [
    entity('witch', 'witch', 0, 9, { heading: Math.PI }),
    entity('well', 'spring', -155, 850),
    entity('bell-low', 'bell', 19, 996, { tone: 'low' }),
    entity('bell-mid', 'bell', 30, 996, { tone: 'mid' }),
    entity('bell-high', 'bell', 41, 996, { tone: 'high' }),
    entity('princess', 'princess', 30, 1516, { heading: Math.PI }),
    entity('banquet', 'body', 31.3, 1517),
    foe('wolf-1', 'wolf', 80, 303, 1),
    foe('wolf-2', 'wolf', 67, 329, 4.4),
    foe('wolf-3', 'wolf', -42, 435, 0.8),
    foe('troll-1', 'troll', 79, 624, 1.9),
    foe('wolf-4', 'wolf', 57, 760, 2.7),
    foe('dragon-1', 'dragon', 92, 1184, 2.4),
    foe('troll-2', 'troll', 222, 684, 1.2),
    foe('dragon-2', 'dragon', -290, 646, 4.1),
    foe('wolf-5', 'wolf', -262, 302, 2.4),
  ];
}
export function createWorld() {
  const w = {
    version: 1,
    player: { x: 0, z: 0, yaw: 0, pitch: 0, health: 5, maxHealth: 5 },
    actors: spawnActors(),
    elapsed: 0,
    route: 'undecided',
    dialogue: null,
    ending: null,
    sequence: null,
    ropeFallen: false,
    events: [],
    mapOpen: false,
    hasMap: false,
    hasVial: false,
    antidote: false,
    potions: 0,
    bridgeOpen: false,
    bells: [],
    notice:
      'A rider saw Princess Xero taken through the castle gate in irons. You have come to bring her home.',
    noticeUntil: 10,
    lastBell: -1,
    nextAnswer: 0,
    greeted: false,
    strikeUntil: 0,
    potionUntil: 0,
    hurtUntil: 0,
    milestones: {},
    checkpoint: null,
  };
  saveCheckpoint(w);
  return w;
}
function saveCheckpoint(w) {
  const { checkpoint, events, dialogue, ending, ...rest } = w;
  // String storage keeps the save JSON-serializable without recursive checkpoints.
  w.checkpoint = JSON.stringify({ ...rest, events: [], dialogue: null, ending: null, mapOpen: false });
}
export const getCheckpoint = (w) => w.checkpoint;
export function resumeCheckpoint(w) {
  if (!w.checkpoint) return createWorld();
  const saved = w.checkpoint;
  Object.assign(w, JSON.parse(saved), { checkpoint: saved, events: [], mapOpen: false });
  return w;
}
const event = (w, type, text) => w.events.push(text ? { type, text } : { type });
function notify(w, text, seconds = 4) {
  w.notice = text;
  w.noticeUntil = w.elapsed + seconds;
}
function talk(w, kind, speaker, text, choices = [], question = '') {
  w.dialogue = { kind, speaker, text, choices, question };
  event(w, 'dialogue');
}
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
function banquet(w) {
  if (w.milestones.reveal || w.ending) return;
  w.milestones.reveal = true;
  const bellText =
    'The bell rope is tied to Xero’s wrist. She tugs it three times between mouthfuls. Under her hands the stag shudders, still alive. From the downs, thousands of throats answer her invitation.';
  event(w, 'reveal');
  const cureReady = w.route === 'unbound' && w.antidote;
  talk(
    w,
    'banquet',
    'The Long Hall',
    bellText +
      (cureReady
        ? ' A silver drop slides up the mouth of your vial toward her blackened hand.'
        : ' Xero rises. A scrap of blue ribbon hangs from a tooth.'),
    cureReady
      ? [
          { id: 1, label: 'Break the moonwater vial over Xero’s hand' },
          { id: 2, label: 'Reach for the princess' },
        ]
      : []
  );
}
const fates = {
  feast: {
    duration: 3.7,
    title: 'The guest of honour',
    text: 'You reach for the ribbon. Xero catches your wrist between her teeth and pulls you across the table. Your pulse stops under her teeth. The other dead are still outside when Xero begins her second meal.',
  },
  saved: {
    duration: 3.8,
    title: 'The fourth dawn',
    text: 'Silver water runs along Xero’s bitten hand. For the first time her fingers let the bell rope go. Outside, the host turns away. You set the injured stag loose together. At the gate, Xero takes your hand of her own accord.',
  },
  bound: {
    duration: 4.1,
    title: 'The borrowed hand',
    text: 'The potion tastes of pears. The witch lifts her hand. Yours rises with it. You try to ask what she has done, but your mouth is already thanking her in her voice. She sends you to gather another traveller.',
  },
};
function beginFate(w, id) {
  const p = w.player;
  w.dialogue = null;
  w.mapOpen = false;
  w.sequence = {
    id,
    time: 0,
    duration: fates[id].duration,
    progress: 0,
    x: p.x,
    z: p.z,
    yaw: p.yaw,
    pitch: p.pitch,
  };
  if (id === 'bound') w.actors.push(entity('traveller', 'traveller', -3, -18, { heading: 0 }));
}
const ease = (t) => t * t * (3 - 2 * t);
const shortestTurn = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
function stageFate(w, dt) {
  const q = w.sequence,
    p = w.player;
  q.time += dt;
  q.progress = clamp(q.time / q.duration, 0, 1);
  w.elapsed += dt;
  const t = q.progress;
  if (q.id === 'bound') {
    const traveller = w.actors.find((a) => a.type === 'traveller');
    const facing = Math.atan2(traveller.x - q.x, traveller.z - q.z);
    const turn = w.reducedMotion ? Number(t > 0.55) : ease(clamp((t - 0.2) / 0.52, 0, 1));
    p.yaw = q.yaw + shortestTurn(q.yaw, facing) * turn;
    p.pitch = w.reducedMotion ? q.pitch : q.pitch * (1 - t) - 0.045 * Math.sin(Math.PI * t);
    const walk = w.reducedMotion ? 0 : 2.8 * ease(clamp((t - 0.63) / 0.37, 0, 1));
    p.x = q.x + Math.sin(facing) * walk;
    p.z = q.z + Math.cos(facing) * walk;
  } else {
    const xero = w.actors.find((a) => a.type === 'princess');
    const facing = Math.atan2(xero.homeX - q.x, xero.homeZ - q.z);
    const turn = w.reducedMotion ? 1 : ease(clamp(t / 0.27, 0, 1));
    p.yaw = q.yaw + shortestTurn(q.yaw, facing) * turn;
    p.pitch = w.reducedMotion ? 0 : q.pitch * (1 - t) - 0.16 * Math.sin(Math.PI * clamp(t / 0.58, 0, 1));
    if (q.id === 'feast') {
      const lunge = ease(clamp((t - 0.33) / 0.36, 0, 1));
      xero.x = xero.homeX + (q.x - xero.homeX) * lunge - 0.58 * Math.sin(facing) * lunge;
      xero.z = xero.homeZ + (q.z - xero.homeZ) * lunge - 0.58 * Math.cos(facing) * lunge;
      const fall = w.reducedMotion ? 0 : ease(clamp((t - 0.64) / 0.34, 0, 1));
      p.pitch -= fall * 0.63;
      p.x = q.x - Math.sin(facing) * fall * 0.8;
      p.z = q.z - Math.cos(facing) * fall * 0.8;
      if (t > 0.62 && !q.contact) {
        q.contact = true;
        event(w, 'hurt');
      }
    } else if (t > 0.43 && !w.ropeFallen) {
      w.ropeFallen = true;
      w.dispersalAt = w.elapsed;
      xero.cured = true;
      event(w, 'chime');
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
      event(w, 'potion');
      beginFate(w, 'saved');
    } else if (n === 2) beginFate(w, 'feast');
    return true;
  }
  if (w.dialogue.kind !== 'witch' || ![1, 2, 3].includes(n)) return false;
  if (n === 1) {
    w.route = 'guided';
    w.potions = 3;
    talk(
      w,
      'directions',
      'The witch',
      'Three cinder phials for the road. Break one when a beast draws near. Wolves hunt the fork, a troll keeps Briar Hollow, and a dragon circles the downs. Follow the road north, repeat the castle’s peal at the three-bell sluice, then pass under the gate. Hurry, Zelda.'
    );
  } else if (n === 2) {
    w.route = 'bound';
    event(w, 'potion');
    beginFate(w, 'bound');
  } else {
    w.route = 'wander';
    w.dialogue = null;
    w.nextHunt = w.elapsed + 15;
    notify(w, 'The witch steps aside. Somewhere in the trees, a wolf answers another.', 5);
    event(w, 'howl');
  }
  return true;
}
function nearFacing(w, actor, reach, cos = 0.3) {
  const p = w.player,
    dx = actor.x - p.x,
    dz = actor.z - p.z,
    d = Math.hypot(dx, dz);
  return d <= reach && (d < 1 || (dx * Math.sin(p.yaw) + dz * Math.cos(p.yaw)) / d >= cos);
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
const reachByType = { witch: 14, satchel: 12, bell: 6, spring: 12, princess: 14 };
function target(w) {
  return nearest(w, (a) => reachByType[a.type] && nearFacing(w, a, reachByType[a.type]));
}
function ring(w, tone) {
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
    notify(w, 'The chain drops slack. Across the water, the castle answers: low, high, middle.', 6);
  } else if (w.bells.length === 3) {
    w.bridgeOpen = true;
    event(w, 'chime');
    notify(w, 'The three notes settle into place. The bridge rises from the water.', 6);
  } else
    notify(
      w,
      'The first ' +
        (w.bells.length === 1 ? 'chain' : 'two chains') +
        ' draw' +
        (w.bells.length === 1 ? 's' : '') +
        ' taut.'
    );
}
function interact(w, a) {
  if (!a) return false;
  if (a.type === 'witch') meet(w);
  else if (a.type === 'bell') ring(w, a.tone);
  else if (a.type === 'princess') banquet(w);
  else if (a.type === 'satchel') {
    a.alive = false;
    w.hasMap = true;
    w.hasVial = true;
    w.route = 'unbound';
    w.potions = 3;
    event(w, 'loot');
    talk(
      w,
      'map',
      'The mapmaker’s hand',
      'Inside her satchel lie three cinder phials, an empty silver vial and a map. A second trail is drawn beneath the road in pale ink. At its spring someone has written, “Moonwater lifts what the mouth has taken. Break the filled vial against living skin.”'
    );
  } else if (a.type === 'spring') {
    if (w.hasVial && !w.antidote) {
      w.antidote = true;
      event(w, 'potion');
      talk(
        w,
        'spring',
        'The Moonwell',
        'You fill the silver vial. Where a drop falls on a blackened reed, its green returns. The pale trail bends northeast toward a ford.'
      );
    } else
      notify(
        w,
        w.antidote ? 'The moonwater vial is full.' : 'Cold water runs through a cupped stone hand.'
      );
  }
  return true;
}
export function act(w, action) {
  if (w.ending || w.sequence) return false;
  if (action === 'close') {
    if (w.mapOpen) {
      w.mapOpen = false;
      return true;
    }
    if (!w.dialogue) return false;
    if (w.dialogue.kind === 'banquet') {
      if (w.route === 'unbound' && w.antidote) return false;
      beginFate(w, 'feast');
    } else w.dialogue = null;
    return true;
  }
  if (w.dialogue) return false;
  if (action === 'map') {
    w.mapOpen = !w.mapOpen;
    return true;
  }
  if (w.mapOpen) return false;
  if (action === 'interact') return interact(w, target(w));
  if (action === 'strike') {
    if (w.elapsed < w.strikeUntil) return false;
    w.strikeUntil = w.elapsed + 0.48;
    event(w, 'strike');
    const a = nearest(
      w,
      (a) =>
        (a.type === 'witch' || a.type === 'bell' || isEnemy(a)) &&
        nearFacing(w, a, a.type === 'witch' ? 6 : a.type === 'bell' ? 6 : 8, 0.43)
    );
    if (!a) return true;
    if (a.type === 'bell') ring(w, a.tone);
    else if (a.type === 'witch') {
      a.alive = false;
      w.actors.push(entity('satchel', 'satchel', a.x + 0.6, a.z - 0.3));
      notify(w, 'A clasp springs open in the leaves.', 4);
    } else {
      a.hp -= 1;
      if (a.hp <= 0) {
        a.alive = false;
        notify(w, 'The ' + a.type + ' falls back into the undergrowth.');
      } else {
        a.attackAt = Math.max(a.attackAt, w.elapsed + 0.55);
        a.x += Math.sin(w.player.yaw) * 1.4;
        a.z += Math.cos(w.player.yaw) * 1.4;
      }
    }
    return true;
  }
  if (action === 'potion') {
    if (w.elapsed < w.potionUntil) return false;
    if (!w.potions) {
      notify(w, 'Your belt holds no cinder phials.');
      return false;
    }
    w.potions--;
    w.potionUntil = w.elapsed + 1;
    event(w, 'potion');
    let count = 0;
    for (const a of w.actors)
      if (a.alive && isEnemy(a) && distance(a, w.player) < 44) {
        a.alive = false;
        count++;
      }
    notify(w, count ? 'Cinder light scatters the beasts.' : 'A ring of cinder light fades in the grass.');
    return true;
  }
  return false;
}
function injury(w, a) {
  if (w.elapsed < w.hurtUntil) return;
  w.hurtUntil = w.elapsed + 1.5;
  w.player.health = Math.max(0, w.player.health - (a.type === 'wolf' ? 1 : 2));
  event(w, 'hurt');
  if (!w.player.health) {
    const line = {
      wolf: 'You hear a second set of paws behind you. Your lantern rolls into the ferns.',
      troll:
        'The troll’s shadow falls across your path. Your sword rings once against stone and falls silent.',
      dragon: 'Wind folds the canopy flat. In the dragon’s breath, the forest turns white.',
    }[a.type];
    end(w, 'wilds', 'Lost in the green', line);
  } else notify(w, 'The ' + a.type + ' strikes. Move out of reach.', 2.7);
}
function advanceWildlife(w, dt) {
  const p = w.player;
  const shelter =
    Math.hypot(p.x, p.z - 9) < 36 ||
    p.z > 1428 ||
    Math.abs(p.z - 996) < 23 ||
    (w.hasMap && Math.abs(p.x - trailX(p.z)) < 17 && p.z < 1375);
  // Off the road a pack can pick up the lone traveller's scent. A howl gives
  // the player a head start; returning to the clearing or keeping moving works.
  if (w.route === 'wander' && !shelter && w.elapsed >= (w.nextHunt ?? Infinity)) {
    w.nextHunt = w.elapsed + 34;
    const members = w.actors.filter((a) => a.alive && a.type === 'wolf');
    const hunter = members.sort((a, b) => distance(a, p) - distance(b, p))[0];
    if (hunter) {
      hunter.huntingUntil = w.elapsed + 48;
      event(w, 'howl');
      notify(w, 'A wolf has caught your scent. Its answer comes from behind the trees.', 5);
    }
  }
  for (const a of w.actors) {
    if (!a.alive || !isEnemy(a)) continue;
    const d = distance(a, p);
    const range = a.type === 'dragon' ? 51 : a.type === 'wolf' ? 42 : 34;
    const alerted =
      !shelter &&
      ((a.huntingUntil || 0) > w.elapsed || (d < range && Math.hypot(p.x - a.homeX, p.z - a.homeZ) < 115));
    const radius = a.type === 'dragon' ? 20 : 6;
    const tx = alerted ? p.x : a.homeX + Math.sin(w.elapsed * 0.12 + a.phase) * radius;
    const tz = alerted ? p.z : a.homeZ + Math.cos(w.elapsed * 0.12 + a.phase) * radius;
    const gap = Math.hypot(tx - a.x, tz - a.z);
    if (gap > 0.1) {
      a.heading = Math.atan2(tx - a.x, tz - a.z);
      const speed = alerted
        ? a.type === 'wolf'
          ? 10.6
          : a.type === 'dragon'
            ? 8.4
            : 5.1
        : a.type === 'dragon'
          ? 3.1
          : 1.5;
      const s = Math.min(gap, dt * speed);
      a.x += Math.sin(a.heading) * s;
      a.z += Math.cos(a.heading) * s;
    }
    if (
      alerted &&
      d < (a.type === 'dragon' ? 13 : a.type === 'troll' ? 7.5 : 4) &&
      w.elapsed >= a.attackAt
    ) {
      a.attackAt = w.elapsed + (a.type === 'wolf' ? 2.2 : 3);
      injury(w, a);
      if (w.ending) return;
    }
  }
}
const obstacleCells = new Map();
const cellKey = (cx, cz) => cx + ',' + cz;
// Rendered tree trunks register once per generated patch, outside the save.
export function registerObstacle(x, z, radius) {
  const key = cellKey(Math.floor(x / 10), Math.floor(z / 10));
  if (!obstacleCells.has(key)) obstacleCells.set(key, new Map());
  const trunkKey = x.toFixed(2) + ',' + z.toFixed(2);
  obstacleCells.get(key).set(trunkKey, { x, z, radius });
}
function hitsProp(x, z) {
  const cx = Math.floor(x / 10),
    cz = Math.floor(z / 10);
  for (let ix = cx - 1; ix <= cx + 1; ix++)
    for (let iz = cz - 1; iz <= cz + 1; iz++) {
      const props = obstacleCells.get(cellKey(ix, iz));
      if (!props) continue;
      for (const a of props.values())
        if ((x - a.x) ** 2 + (z - a.z) ** 2 < (a.radius + 0.29) ** 2) return true;
    }
  return false;
}
function passable(w, x, z) {
  if (x < MAP.minX || x > MAP.maxX || z < MAP.minZ || z > MAP.maxZ) return false;
  if (!hallWalkable(x, z) || hitsProp(x, z)) return false;
  if (z > 1010 && z < 1032 && !(Math.abs(x + 125) < 10 || (w.bridgeOpen && Math.abs(x - 30) < 11)))
    return false;
  // The material walls correspond to the renderer's curtain-wall footprint.
  if (z >= GATE_Z - 1.6 && z <= GATE_Z + 1.6 && x >= 4 && x <= 56 && Math.abs(x - 30) > 4.7) return false;
  if (z >= GATE_Z && z <= 1554 && (Math.abs(x - 5) < 1.4 || Math.abs(x - 55) < 1.4)) return false;
  if (Math.abs(z - 1553) < 1.5 && x >= 4 && x <= 56) return false;
  return true;
}
function landmarkBeat(w, id, condition, text, sound) {
  if (!condition || w.milestones[id]) return;
  w.milestones[id] = true;
  notify(w, text, 5.5);
  if (sound) event(w, sound);
}
function simulate(w, dt, input) {
  const p = w.player;
  w.elapsed += dt;
  const f = clamp(Number(input.forward) || 0, -1, 1),
    s = clamp(Number(input.strafe) || 0, -1, 1);
  p.yaw += (Number(input.turn) || 0) * 1.9 * dt;
  const speed = input.sprint ? 12.9 : 8.2;
  const stride = (speed * dt) / Math.max(1, Math.hypot(f, s));
  const dx = stride * (Math.sin(p.yaw) * f + Math.cos(p.yaw) * s),
    dz = stride * (Math.cos(p.yaw) * f - Math.sin(p.yaw) * s);
  if (dx && passable(w, p.x + dx, p.z)) p.x += dx;
  if (dz && passable(w, p.x, p.z + dz)) p.z += dz;
  else if (Math.abs(dz) > 0.01 && Math.abs(p.z - 1021) < 20 && w.noticeUntil < w.elapsed)
    notify(
      w,
      w.hasMap
        ? 'Deep water. Your map marks a ford west of the bridge.'
        : 'Deep water. Three bells stand on the southern bank.'
    );
  const peal = Math.floor((w.elapsed + 31) / 37);
  if (peal > w.lastBell) {
    w.lastBell = peal;
    if (w.elapsed > 2) {
      event(w, 'bell');
      w.nextAnswer = w.elapsed + 3.1;
    }
  }
  if (w.nextAnswer && w.elapsed >= w.nextAnswer) {
    event(w, 'answer');
    w.nextAnswer = 0;
  }
  advanceWildlife(w, dt);
  if (w.ending) return;
  if (!w.greeted && w.actors[0].alive && distance(p, w.actors[0]) < 6.7) {
    meet(w);
    return;
  }
  if (w.elapsed >= HOURGLASS) {
    end(
      w,
      'horde',
      'The gate closes',
      'The first rank reaches the drawbridge. Iron drops into stone. Through the oak comes a bell peal and the sound of thousands answering. The way to Xero is gone.'
    );
    return;
  }
  landmarkBeat(
    w,
    'fork',
    p.z > 195 && p.z < 245,
    'On the northbound milepost, Xero’s blue ribbon hangs from an open shackle. In the western valley, a long dark line is moving.'
  );
  landmarkBeat(
    w,
    'ridge',
    p.z > 449 && p.z < 550 && Math.abs(p.x) < 235,
    'From the ridge you can see them advancing under the castle banners. There must be thousands.',
    'howl'
  );
  landmarkBeat(
    w,
    'sluice',
    p.z > 956 && p.z < 1008 && Math.abs(p.x - 30) < 55,
    'In the stone: “When the keep calls, answer in kind.” A deep toll, a high note, then the middle voice.',
    'bell'
  );
  if (!w.milestones.procession && p.z > 1000 && Math.abs(p.x) < 450 && w.elapsed > (w.nextHostLook || 0)) {
    w.nextHostLook = w.elapsed + 1.2;
    for (let i = 0; i < HORDE_COUNT; i += 240) {
      if (distance(p, hordePosition(w, i)) < 48) {
        landmarkBeat(
          w,
          'procession',
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
    p.z > 1352 && Math.abs(p.x - 30) < 56,
    'A bell rings beyond the open gate. Something heavy moves across the flagstones.'
  );
  if (!w.milestones.gateSave && p.z > 1390 && p.z < 1440 && Math.abs(p.x - 30) < 48) {
    w.milestones.gateSave = true;
    saveCheckpoint(w);
  }
  if (!w.milestones.riverSave && p.z > 1036 && p.z < 1100) {
    w.milestones.riverSave = true;
    saveCheckpoint(w);
  }
  if (Math.abs(p.x - 30) < 22 && p.z > 1504 && p.z < 1539) banquet(w);
}
// Substep so doors, water and attacks remain consistent at low frame rates.
export function tick(w, dt, input = {}) {
  if (!w || w.dialogue || w.ending || w.mapOpen || !Number.isFinite(dt) || dt <= 0) return;
  const length = Math.min(dt, 0.3);
  if (w.sequence) {
    stageFate(w, length);
    return;
  }
  const slices = Math.ceil(length / 0.05);
  for (let i = 0; i < slices; i++) {
    simulate(w, length / slices, input);
    if (w.dialogue || w.ending) break;
  }
}
function location(w) {
  const p = w.player;
  if (p.z > 1440 && Math.abs(p.x - 30) < 27) return 'The Long Hall';
  let nearestMark = LANDMARKS[0],
    best = Infinity;
  for (const place of LANDMARKS) {
    const d = distance(p, place);
    if (d < best) {
      nearestMark = place;
      best = d;
    }
  }
  return best < 235 ? nearestMark.name : p.z > 980 ? 'The Ash Downs' : 'The Deepwood';
}
function objective(w) {
  if (w.route === 'unbound' && !w.antidote) return 'Carry the silver vial to the Moonwell.';
  if (w.route === 'guided' && !w.bridgeOpen && w.player.z > 870 && w.player.z < 1034)
    return 'Answer the castle’s three notes at the sluice.';
  if (w.route === 'wander') return 'Find your own way through the forest.';
  if (w.route === 'undecided' && !w.greeted && w.actors[0].alive)
    return 'Find the castle where Princess Xero is held.';
  return 'Reach Princess Xero before the host reaches the gate.';
}
export function getHUD(w) {
  const a = target(w);
  const labels = {
    witch: 'Speak to the witch',
    satchel: 'Examine the fallen satchel',
    spring: 'Examine the spring',
    princess: 'Approach Princess Xero',
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
  return {
    location: location(w),
    objective: objective(w),
    hint,
    notice: w.elapsed < w.noticeUntil ? w.notice : '',
    health: w.player.health,
    maxHealth: w.player.maxHealth,
    potions: w.potions,
    hordeProgress: clamp(w.elapsed / HOURGLASS, 0, 1),
    hasMap: w.hasMap,
    bearing: Math.atan2(goal.x - w.player.x, goal.z - w.player.z),
    distance: Math.round(distance(w.player, goal)),
  };
}
