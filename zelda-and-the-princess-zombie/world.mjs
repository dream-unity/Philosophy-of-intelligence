import { insideHall } from './hall.mjs';
import {
  storyFates,
  banquetText,
  storyChoose,
  storyAct,
  storyTarget,
  storyInteract,
  storyBeat,
  storyTick,
  storyLocation,
  stageStoryFate,
} from './story.mjs';
import { barrier, footHeight, footing, clearSegment } from './travel.mjs';
import { beginSwing, moveBody, strikeContacts, cue, tossPhial, advancePhial } from './swordplay.mjs';
import { advanceWildlife } from './wildlife.mjs';
import { MAP, LANDMARKS, roadX, terrainHeight, clamp, distance, course } from './geography.mjs';
export { bladeCoordinates } from './swordplay.mjs';
export { registerObstacle, bridgeRise } from './travel.mjs';

// World distances are metres. North is +z. All mutable state is plain JSON.
export const HORDE_COUNT = 3072;
const HOURGLASS = 395;
const GATE_Z = 1435;
export { MAP, LANDMARKS, roadX, trailX, terrainHeight } from './geography.mjs';
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
  const width = offset;
  return {
    x: leg.a[0] + leg.tangent.x * along + (a.x + (b.x - a.x) * bend) * width,
    z: leg.a[1] + leg.tangent.z * along + (a.z + (b.z - a.z) * bend) * width,
  };
}
export function hordePosition(w, index) {
  const i = clamp(Math.floor(index), 0, HORDE_COUNT - 1),
    line = Math.floor(i / 48);
  const file = i % 48,
    lane = file % 2 ? (file + 1) / 2 : -file / 2;
  const time = w.ropeFallen ? (w.dispersalAt ?? w.elapsed) : w.elapsed;
  const clock = Math.max(0, time - (w.raceGrace || 0)),
    listen = clamp(((w.hostListeningUntil || 0) - time) / 3.5, 0, 1);
  // Rear ranks gradually fall in behind the vanguard. Inside the approach,
  // each five-abreast file folds into consecutive places in one gate lane.
  const clockFraction = clamp(clock / HOURGLASS, 0, 1);
  const rankSpacing = 1.65 + 4.88 * clockFraction;
  const head = (travelled * clock) / HOURGLASS;
  const base = head - line * rankSpacing;
  const funnel = clamp((base - travelled + 86) / 78, 0, 1);
  const laneIndex = lane + 25,
    slot = laneIndex % 5,
    gateLane = Math.floor(laneIndex / 5) - 5;
  const sway = Math.sin(i + time * (0.72 + (i % 7) * 0.017)) * 0.055 * (1 - 0.75 * listen);
  const spread = lane * 0.9 * (1 - funnel) + gateLane * 0.83 * funnel + sway;
  const stagger = Math.sin(i * 74.123) * 0.06 + Math.abs(lane) * 0.012;
  const metres = Math.min(
    travelled - slot * 1.28 - line * 6.53,
    base - stagger * (1 - funnel) - slot * 1.28 * funnel
  );
  const point = herdPoint(metres, spread);
  const reaction = w.hostReactions?.[i];
  if (reaction) {
    const elapsed = w.elapsed - reaction.at;
    if (elapsed >= 0 && elapsed < 2.5) {
      const t = Math.sin((Math.PI * elapsed) / 2.5);
      point.x += reaction.x * t;
      point.z += reaction.z * t;
    }
  }
  if (w.ropeFallen) {
    const away = w.elapsed - time;
    const angle = (i % 23) * 2.39996;
    point.x += Math.cos(angle) * away * 2.2;
    point.z -= Math.abs(Math.sin(angle)) * away * 2.2;
  }
  return point;
}
// Footfalls remain along the ground the host has crossed. They can be rebuilt
// from route distance and the march clock after loading a journey.
export function hostFootprints(w) {
  const p = w.player;
  if (p.z < 1015) return [];
  const head = Math.min(
    travelled,
    (travelled * Math.max(0, (w.dispersalAt ?? w.elapsed) - (w.raceGrace || 0))) / HOURGLASS
  );
  const marks = [];
  for (const leg of hordeLength) {
    const dx = p.x - leg.a[0],
      dz = p.z - leg.a[1];
    const near = clamp(dx * leg.tangent.x + dz * leg.tangent.z, 0, leg.len);
    if (Math.hypot(dx - near * leg.tangent.x, dz - near * leg.tangent.z) > 38) continue;
    const start = Math.ceil(Math.max(leg.start, leg.start + near - 22) / 1.8);
    const end = Math.floor(Math.min(leg.start + leg.len, leg.start + near + 22, head - 2) / 1.8);
    for (let i = start; i <= end; i++) {
      const taper = clamp((travelled - i * 1.8) / 65, 0.2, 1);
      for (const lane of [-12, -3.6, 5.2, 13]) {
        const q = herdPoint(i * 1.8, ((i % 2 ? 0.13 : -0.13) + lane) * taper + 0.06 * Math.sin(i * 0.39));
        if (distance(q, p) < 22) marks.push(q);
      }
    }
  }
  return marks;
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
    entity('rowan-fork', 'berries', 65, 331),
    entity('rowan-hollow', 'berries', 37, 738),
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
    version: 2,
    gateCrossed: false,
    gateClosedAt: null,
    bridgeRaisedAt: null,
    player: {
      x: -2.2,
      z: 0,
      yaw: 0,
      pitch: 0,
      health: 5,
      maxHealth: 5,
      stamina: 1,
      speed: 0,
      feetY: 0,
      surface: 'gravel',
    },
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
  let restored;
  try {
    restored = JSON.parse(w.checkpoint);
  } catch {
    restored = null;
  }
  if (!restored?.player || !Array.isArray(restored.actors)) restored = createWorld();
  const saved = restored.checkpoint || JSON.stringify(restored);
  for (const k of Object.keys(w)) delete w[k];
  Object.assign(w, restored, { checkpoint: saved, events: [], mapOpen: false });
  migrate(w);
  if (!w.gateCrossed && w.route !== 'wander') {
    const remainingRoad = Math.hypot(w.player.x - 30, w.player.z - GATE_Z);
    const reserve = remainingRoad / 4.65 + (w.player.z < 1010 ? 35 : 12);
    if (HOURGLASS - w.elapsed < reserve) {
      // Give a late retry enough daylight while preserving local animation clocks.
      w.raceGrace = (w.raceGrace || 0) + Math.max(0, reserve - (HOURGLASS - raceTime(w)));
      w.gateClosedAt = null;
    }
  }
  return w;
}
export function migrate(w) {
  if (w.version !== 2) {
    w.gateCrossed = w.player.z > GATE_Z + 1.2 && w.player.z < 1554 && Math.abs(w.player.x - 30) < 25;
    w.version = 2;
    w.phialsGiven = w.route === 'guided';
    if (w.route === 'undecided' && w.greeted && !w.dialogue) {
      w.route = 'wander';
      w.nextHunt = w.elapsed + 15;
    }
    if (w.dialogue?.kind === 'banquet') {
      w.dialogue = null;
      w.milestones.reveal = false;
      if (canSeeBanquet(w)) banquet(w);
    }
    if (w.sequence && fates[w.sequence.id]) {
      const q = w.sequence,
        t = clamp(q.time / (q.duration || 1), 0, 1);
      q.duration = fates[q.id].duration;
      q.time = t * q.duration;
      q.progress = t;
    }
    for (const a of spawnActors().filter((v) => v.type === 'berries'))
      if (!w.actors.some((v) => v.id === a.id)) w.actors.push(a);
  }
  w.player.stamina ??= 1;
  w.player.feetY ??= footHeight(w, w.player.x, w.player.z);
  return w;
}
const raceTime = (w) => Math.max(0, w.elapsed - (w.raceGrace || 0));
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
  storyBeat(w, 'witch');
  if (w.route === 'wander') {
    talk(w, 'directions', 'The witch', 'You chose the woods, traveller. They are yours to walk.');
    return;
  }
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
function canSeeBanquet(w) {
  const p = w.player,
    a = w.actors.find((v) => v.type === 'princess');
  return (
    insideHall(p.x, p.z) &&
    Math.abs(p.pitch || 0) < 0.82 &&
    nearFacing(w, a, 5, 0.67) &&
    clearSegment(w, p.x, p.z, a.x, a.z)
  );
}
function banquet(w) {
  if (w.ending || !canSeeBanquet(w)) return false;
  if (!w.milestones.reveal) {
    w.milestones.reveal = true;
    storyBeat(w, 'banquet');
    cue(w, 'reveal');
  }
  const ready = w.route === 'unbound' && w.antidote;
  const choices = ready ? [{ id: 1, label: 'Break the moonwater vial over Xero’s hand' }] : [];
  choices.push({ id: 2, label: 'Reach for the princess' });
  talk(w, 'banquet', 'The Long Hall', banquetText(ready), choices);
  return true;
}
const fates = storyFates;
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
export function choose(w, n) {
  if (!w.dialogue) return false;
  n = Number(n);
  if (storyChoose(w, n)) return true;
  if (w.dialogue.kind === 'banquet') {
    if (w.route === 'unbound' && w.antidote && n === 1) {
      w.antidote = false;
      cue(w, 'potion', 'cure', w.player);
      beginFate(w, 'saved');
    } else if (n === 2) beginFate(w, 'feast');
    else return false;
    return true;
  }
  if (w.dialogue.kind !== 'witch' || ![1, 2, 3].includes(n)) return false;
  if (n === 1) {
    w.route = 'guided';
    storyBeat(w, 'guided');
    w.potions = 3;
    w.phialsGiven = true;
    talk(
      w,
      'directions',
      'The witch',
      'Three cinder phials for the road. Break one when a beast draws near. Wolves hunt the fork, a troll keeps Briar Hollow, and a dragon circles the downs. Follow the road north, repeat the castle’s peal at the three-bell sluice, then pass under the gate. Hurry, Zelda.'
    );
  } else if (n === 2) {
    w.route = 'bound';
    cue(w, 'potion', 'drink', w.player);
    beginFate(w, 'bound');
  } else {
    w.route = 'wander';
    storyBeat(w, 'wander');
    w.dialogue = null;
    w.nextHunt = w.elapsed + 15;
    notify(w, 'The witch steps aside. Somewhere in the trees, a wolf answers another.', 5);
    cue(
      w,
      'howl',
      'wolf',
      w.actors.find((a) => a.type === 'wolf')
    );
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
const reachByType = { berries: 2.1, witch: 3.4, satchel: 2.6, bell: 2.7, spring: 6.2, princess: 5 };
function target(w) {
  return (
    storyTarget(w) ||
    nearest(
      w,
      (a) =>
        reachByType[a.type] &&
        (Math.abs(w.player.pitch || 0) < 0.87 || a.type === 'satchel' || a.type === 'berries') &&
        nearFacing(w, a, reachByType[a.type], 0.48) &&
        (a.type === 'spring' || clearSegment(w, w.player.x, w.player.z, a.x, a.z))
    )
  );
}
function ring(w, tone) {
  const bell = w.actors.find((a) => a.type === 'bell' && a.tone === tone);
  bell.lastRung = w.elapsed;
  w.bellAt = w.elapsed;
  w.hostRangAt = w.elapsed;
  w.hostListeningUntil = w.elapsed + 3.5;
  cue(w, 'sluice', tone, bell);
  if (w.bridgeOpen) {
    notify(w, 'The bridge holds.');
    return;
  }
  const phrase = ['low', 'high', 'mid'];
  w.bells.push(tone);
  if (w.bells.some((v, i) => v !== phrase[i])) {
    w.bells = tone === 'low' ? ['low'] : [];
    cue(w, 'chain', 'slack', bell);
    cue(w, 'bell', 'replay', { x: 30, z: 1530 });
    notify(w, 'The chain drops slack. Listen for the castle’s answer.', 4);
  } else if (w.bells.length === 3) {
    w.bridgeOpen = true;
    w.bridgeRaisedAt = w.elapsed;
    cue(w, 'chain', 'rise', bell);
    cue(w, 'chime');
    notify(w, 'The three chains haul the deck out of the river.', 5);
  } else {
    cue(w, 'chain', 'tight', bell);
    notify(w, w.bells.length === 1 ? 'The first chain draws taut.' : 'Two chains hold.', 2);
  }
}
function interact(w, a) {
  if (!a) return false;
  if (storyInteract(w, a)) return true;
  if (a.type === 'berries') {
    if (w.player.health >= w.player.maxHealth) {
      notify(w, 'Blue rowanberries glisten on the branch.');
      return true;
    }
    w.player.health = Math.min(w.player.maxHealth, w.player.health + 2);
    a.alive = false;
    cue(w, 'gather', 'berries', a);
    notify(w, 'The tart fruit steadies you. Your heartbeat settles.');
    return true;
  }
  if (a.type === 'witch') meet(w);
  else if (a.type === 'bell') ring(w, a.tone);
  else if (a.type === 'princess') return banquet(w);
  else if (a.type === 'satchel') {
    a.alive = false;
    w.hasMap = true;
    w.hasVial = true;
    w.route = 'unbound';
    storyBeat(w, 'satchel');
    if (!w.phialsGiven) w.potions = 3;
    event(w, 'loot');
    talk(
      w,
      'map',
      'The mapmaker’s hand',
      (w.phialsGiven
        ? 'Inside her satchel lie an empty silver vial and a map. '
        : 'Inside her satchel lie three cinder phials, an empty silver vial and a map. ') +
        'A second trail is drawn beneath the road in pale ink. At its spring someone has written, “Moonwater lifts what the mouth has taken. Break the filled vial against living skin.”'
    );
  } else if (a.type === 'spring') {
    if (!w.milestones.drankWell && w.player.health < w.player.maxHealth) {
      w.player.health = Math.min(w.player.maxHealth, w.player.health + 2);
      w.milestones.drankWell = true;
      cue(w, 'potion', 'drink', a);
      notify(w, 'The cool water steadies your breathing.');
    }
    if (w.hasVial && !w.antidote) {
      w.antidote = true;
      storyBeat(w, 'spring');
      cue(w, 'potion', 'fill', a);
      talk(
        w,
        'spring',
        'The Moonwell',
        'You fill the silver vial. Where a drop falls on a blackened reed, its green returns. The pale trail bends northeast toward a ford.'
      );
    } else
      notify(w, w.antidote ? 'The moonwater vial is full.' : 'Cold water runs through a cupped stone hand.');
  }
  return true;
}
export function act(w, action) {
  if (storyAct(w, action)) return true;
  if (w.ending || w.sequence) return false;
  if (action === 'close') {
    if (w.mapOpen) {
      w.mapOpen = false;
      return true;
    }
    if (!w.dialogue) return false;
    if (w.dialogue.kind === 'witch' && w.route === 'undecided') {
      w.route = 'wander';
      w.nextHunt = w.elapsed + 15;
      storyBeat(w, 'wander');
    }
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
  if (action === 'strike' || action === 'thrust')
    return beginSwing(w, action === 'strike' ? 'slash' : 'thrust');
  if (action === 'guard') {
    if (w.elapsed < (w.guardReadyAt || 0) || w.elapsed < w.strikeUntil || w.player.stamina < 0.06)
      return false;
    w.guardUntil = w.elapsed + 0.75;
    w.guardReadyAt = w.elapsed + 1.04;
    w.player.stamina -= 0.06;
    cue(w, 'guard');
    return true;
  }
  if (action === 'potion') {
    if (w.elapsed < w.potionUntil) return false;
    if (!w.potions) {
      notify(w, 'Your belt holds no cinder phials.');
      return false;
    }
    if (w.phialFlight) return false;
    tossPhial(w);
    return true;
  }
  return false;
}
function drop(w, a) {
  a.alive = false;
  w.greeted = true;
  w.actors.push(entity('satchel', 'satchel', a.x + 0.24, a.z - 0.23));
  notify(w, 'A clasp springs open in the leaves.', 4);
}
function injury(w, a) {
  if (w.elapsed < w.hurtUntil) return;
  w.hurtUntil = w.elapsed + 1.5;
  w.player.health = Math.max(0, w.player.health - (a.type === 'wolf' ? 1 : 2));
  cue(w, 'hurt', a.type, a);
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
function landmarkBeat(w, id, condition, text, sound) {
  if (!condition || w.milestones[id]) return;
  w.milestones[id] = true;
  notify(w, text, 5.5);
  if (sound) event(w, sound);
}
const contactsByWorld = new WeakMap();
function crowdContact(w) {
  const p = w.player;
  if (p.z < 955 || w.ropeFallen) return;
  const head = hordePosition(w, 0);
  if (distance(p, head) > 470) return;
  let cache = contactsByWorld.get(w);
  if (!cache || w.elapsed < cache.at || w.elapsed - cache.at > 0.18 || distance(p, cache) > 2.2) {
    cache = { x: p.x, z: p.z, at: w.elapsed, people: [] };
    contactsByWorld.set(w, cache);
    for (let start = 0; start < HORDE_COUNT; start += 48) {
      if (distance(p, hordePosition(w, start)) > 33) continue;
      for (let i = start; i < start + 48; i++) {
        const q = hordePosition(w, i);
        if (distance(p, q) < 4.8) cache.people.push({ ...q, i });
      }
    }
  }
  return cache.people;
}
function reactToHost(w, q) {
  const p = w.player,
    dx = q.x - p.x,
    dz = q.z - p.z,
    d = Math.hypot(dx, dz);
  w.hostReactions ??= {};
  for (const [i, v] of Object.entries(w.hostReactions))
    if (w.elapsed - v.at >= 2.5) delete w.hostReactions[i];
  if (w.hostReactions[q.i]) return;
  const ax = d > 0.01 ? dx / d : 1,
    az = d > 0.01 ? dz / d : 0;
  w.hostReactions[q.i] = { x: ax * 0.74, z: az * 0.74, at: w.elapsed };
  if (w.elapsed >= (w.nextBrush || 0)) {
    cue(w, 'brush', 'host', q);
    w.nextBrush = w.elapsed + 2.2;
  }
}
function avoidHost(w, nearby) {
  const p = w.player;
  for (const q of nearby) {
    const d = distance(p, q);
    if (d < 0.48) reactToHost(w, q);
    const swing = w.attack,
      t = swing ? (w.elapsed - swing.start) / swing.duration : 1;
    if (t > 0.28 && t < 0.7 && d < 1.6 && nearFacing(w, q, 1.6, 0.74) && !swing.hits.includes('host' + q.i)) {
      swing.hits.push('host' + q.i);
      reactToHost(w, q);
      cue(w, 'impact', 'zombie', q);
    }
  }
  return (x, z) =>
    nearby.some((q) => {
      const d = (x - q.x) ** 2 + (z - q.z) ** 2;
      if (d < 0.5 ** 2 && d < (p.x - q.x) ** 2 + (p.z - q.z) ** 2) {
        if (w.elapsed >= (w.nextBrush || 0)) {
          cue(w, 'brush', 'host', q);
          w.nextBrush = w.elapsed + 3;
        }
        return true;
      }
      return false;
    });
}
function walk(w, dt, input) {
  const p = w.player;
  const f = clamp(Number(input.forward) || 0, -1, 1),
    s = clamp(Number(input.strafe) || 0, -1, 1);
  p.yaw += (Number(input.turn) || 0) * 1.9 * dt;
  const surface = footing(w, p.x, p.z);
  if (p.exhausted && p.stamina > 0.45) p.exhausted = false;
  const sprint = input.sprint && f > 0.45 && !p.exhausted && !(w.guardUntil > w.elapsed);
  p.stamina = clamp(p.stamina + (sprint ? -0.082 : 0.115) * dt, 0, 1);
  if (p.stamina <= 0.002) p.exhausted = true;
  const grade = terrainHeight(p.x + Math.sin(p.yaw), p.z + Math.cos(p.yaw)) - terrainHeight(p.x, p.z);
  let speed =
    (sprint ? 6.75 : 3.95) * (surface === 'water' ? 0.65 : 1) * clamp(1 - grade * f * 0.48, 0.68, 1.08);
  if (w.guardUntil > w.elapsed) speed *= 0.58;
  const norm = Math.max(1, Math.hypot(f, s));
  const forward = (f * speed * (f < 0 ? 0.64 : 1)) / norm,
    side = (s * speed * 0.8) / norm;
  const sx = Math.sin(p.yaw),
    cz = Math.cos(p.yaw);
  const desiredX = forward * sx + side * cz,
    desiredZ = forward * cz - side * sx;
  const response = 1 - Math.exp(-dt * (sprint ? 8.2 : 12));
  p.vx = (p.vx || 0) + (desiredX - (p.vx || 0)) * response;
  p.vz = (p.vz || 0) + (desiredZ - (p.vz || 0)) * response;
  const oldX = p.x,
    oldZ = p.z;
  const host = crowdContact(w),
    avoid = host && avoidHost(w, host);
  if (Math.hypot(p.vx, p.vz) > 0.02) moveBody(w, p, p.vx * dt, p.vz * dt, avoid);
  const ground = footHeight(w, p.x, p.z);
  // Snap to rising ground. Drop from ledges under gravity instead of snapping the camera down.
  if (!Number.isFinite(p.feetY) || p.feetY <= ground + 0.08) {
    p.feetY = ground;
    p.verticalSpeed = 0;
  } else {
    p.verticalSpeed = (p.verticalSpeed || 0) - dt * 9.81;
    p.feetY = Math.max(ground, p.feetY + p.verticalSpeed * dt);
  }
  p.speed = Math.hypot(p.x - oldX, p.z - oldZ) / dt;
  p.surface = footing(w, p.x, p.z);
  if (p.speed < 0.18 && Math.abs(f) + Math.abs(s) > 0.4 && w.elapsed > w.noticeUntil) {
    const block = barrier(w, p.x + p.vx * 0.3, p.z + p.vz * 0.3);
    if (block === 'water')
      notify(
        w,
        w.hasMap ? 'The ford lies west of the bridge.' : 'Deep water. Three bells stand on the southern bank.'
      );
    if (block === 'thorns') notify(w, 'A wall of blackthorn closes the forest here.');
  }
  return oldZ;
}
function simulate(w, dt, input) {
  const p = w.player;
  w.elapsed += dt;
  const oldZ = walk(w, dt, input);
  advancePhial(w, dt, notify);
  strikeContacts(w, { move: (a, x, z) => moveBody(w, a, x, z) }, { ring, notify, drop });
  storyTick(w, dt);
  const peal = Math.floor((w.elapsed + 31) / 37);
  if (peal > w.lastBell) {
    w.lastBell = peal;
    if (w.elapsed > 2) {
      cue(w, 'bell', 'tower', { x: 30, z: 1530 });
      w.hostRangAt = w.elapsed;
      w.hostListeningUntil = w.elapsed + 4;
      w.nextAnswer = w.elapsed + 3.1;
    }
  }
  if (w.nextAnswer && w.elapsed >= w.nextAnswer) {
    cue(w, 'answer', 'host', hordePosition(w, 0));
    w.nextAnswer = 0;
  }
  advanceWildlife(w, dt, { injury, notify });
  if (w.ending) return;
  if (!w.greeted && w.actors[0].alive && distance(p, w.actors[0]) < 6.7) {
    meet(w);
    return;
  }
  if (
    !w.gateCrossed &&
    w.gateClosedAt == null &&
    oldZ < GATE_Z + 1.25 &&
    p.z >= GATE_Z + 1.25 &&
    Math.abs(p.x - 30) < 4.55 &&
    raceTime(w) <= HOURGLASS
  ) {
    w.gateCrossed = true;
    w.milestones.gateSave = true;
    saveCheckpoint(w);
    notify(w, 'Inside the gate. Xero is still somewhere in the keep.');
    cue(w, 'gate', 'crossed', p);
  }
  if (raceTime(w) >= HOURGLASS && w.gateClosedAt == null) {
    w.gateClosedAt = w.elapsed;
    cue(w, 'gate', 'close', { x: 30, z: GATE_Z });
  }
  if (!w.gateCrossed && w.route !== 'wander' && w.gateClosedAt != null && w.elapsed - w.gateClosedAt >= 2.2) {
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
    nearFacing(w, { x: roadX(220) + 7, z: 220 }, 10, 0.1),
    'On the northbound milepost, Xero’s blue ribbon hangs from an open shackle. In the western valley, a long dark line is moving.'
  );
  landmarkBeat(
    w,
    'ridge',
    p.z > 449 && p.z < 550 && Math.abs(p.x) < 235 && nearFacing(w, hordePosition(w, 0), 1300, 0.46),
    'From the ridge you can see them advancing under the castle banners. There must be thousands.',
    'howl'
  );
  landmarkBeat(
    w,
    'sluice',
    Math.hypot(p.x - 30, p.z - 996) < 19,
    'Cut into the stone are three bell mouths. Beneath them: “When the keep calls, answer in kind.”',
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
  if (!w.milestones.riverSave && p.z > 1036 && p.z < 1100) {
    w.milestones.riverSave = true;
    saveCheckpoint(w);
  }
  if (!w.milestones.reveal && p.z > 1508 && canSeeBanquet(w)) banquet(w);
}
// Substep so doors, water and attacks remain consistent at low frame rates.
export function tick(w, dt, input = {}) {
  if (!w || w.dialogue || w.ending || w.mapOpen || !Number.isFinite(dt) || dt <= 0) return;
  migrate(w);
  const length = Math.min(dt, 0.5);
  if (w.sequence) {
    stageStoryFate(w, length, input);
    storyTick(w, length);
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
  if (storyLocation(w)) return storyLocation(w);
  if (insideHall(p.x, p.z)) return 'The Long Hall';
  if (p.z > 1435 && p.z < 1553 && Math.abs(p.x - 30) < 25) return 'Castle Xero courtyard';
  let nearestMark = LANDMARKS[0],
    best = Infinity;
  for (const place of LANDMARKS) {
    const d = distance(p, place);
    if ((place.secret && !w.hasMap && d > 12) || place.id === 'hall') continue;
    if (d < best) {
      nearestMark = place;
      best = d;
    }
  }
  return best < 235 ? nearestMark.name : p.z > 980 ? 'The Ash Downs' : 'The Deepwood';
}
function objective(w) {
  if (w.gateCrossed) return 'Find Princess Xero inside the keep.';
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
    berries: 'Gather the blue rowanberries',
    witch: 'Speak to the witch',
    satchel: 'Examine the fallen satchel',
    spring: 'Examine the spring',
    princess: 'Approach Princess Xero',
  };
  const hint = a
    ? (a.type === 'bell'
        ? 'Ring the ' + { low: 'deep', high: 'high', mid: 'middle' }[a.tone] + ' bell'
        : a.label || labels[a.type]) || ''
    : '';
  const route = course(w);
  return {
    location: location(w),
    objective: objective(w),
    hint,
    notice: w.elapsed < w.noticeUntil ? w.notice : '',
    health: w.player.health,
    maxHealth: w.player.maxHealth,
    potions: w.potions,
    hordeProgress: clamp(raceTime(w) / HOURGLASS, 0, 1),
    hasMap: w.hasMap,
    gateCrossed: !!w.gateCrossed,
    secondsLeft: Math.max(0, HOURGLASS - raceTime(w)),
    bearing: route?.bearing ?? null,
    distance: route?.metres ?? null,
  };
}
