import {
  addForage,
  throwableBottles,
  isStolenBottle,
  giveRoadBottles,
  giveStolenBottles,
  quickItem,
  selectedItem,
  takeItem,
  setCordial,
} from './inventory.mjs';
import {
  coursePoint as herdPoint,
  marchLegs as hordeLength,
  processionLength as travelled,
  skirtWreckage,
  marchPace,
  frontStation,
  roadFilePosition, castleGuestPosition, roadFileIds, nextMealAge,
  marchClock as hostClock,
  stillTheColumn,
} from './procession.mjs';
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
  allowCastlePeal,
  knockAtTable,
  stageStoryFate,
} from './story.mjs';
import { barrier, footHeight, footing, clearSegment, riverImmersion, recoverFooting } from './travel.mjs';
import { beginSwing, moveBody, strikeContacts, cue, tossPhial, advancePhial } from './swordplay.mjs';
import { advanceWildlife } from './wildlife.mjs';
import { nearbyHost, advanceHost, slidePastHost, detachedPosition, damageHost } from './host-encounters.mjs';
import { gateArrival, gateForecast, livingLead, reliefPosition } from './host-vanguard.mjs';
import { hostWithin } from './host-query.mjs';
import { fallenWitnesses } from './last-bell-witnesses.mjs';
import { MAP, LANDMARKS, roadX, terrainHeight, clamp, distance, course } from './geography.mjs';
export { bladeCoordinates } from './swordplay.mjs';
export { registerObstacle, bridgeRise } from './travel.mjs';

// World distances are metres. North is +z. All mutable state is plain JSON.
export const HORDE_COUNT = 3072;
const legacyRaceSeconds = 395;
const raceDuration = (w) => w.raceDuration ?? legacyRaceSeconds;
const GATE_Z = 1435;
const arrivalCoda = 3.25;
const gateCameras = new WeakMap();
export function arrivalView(w) {
  const restoration = w.royalPrize?.phase === 'restoring';
  if (!restoration && (!w.raceWitness || w.reducedMotion || w.ending || w.gateCrossed || w.route === 'wander')) return w;
  // A fixed sightline lets a distant throw show the change in Xero's face. The
  // observer moves to the table for this shot; Zelda's saved feet stay put.
  const subject = restoration ? w.actors.find(actor => actor.type === 'princess') : w.raceWitness;
  const shotZ = restoration ? subject.z - 2.25 : subject.z;
  let shot = gateCameras.get(w);
  if (!shot || Object.getPrototypeOf(shot.player) !== w.player) {
    shot = Object.create(w);
    shot.player = Object.create(w.player);
    gateCameras.set(w, shot);
  }
  Object.assign(shot.player, {
    x: subject.x,
    z: shotZ,
    yaw: restoration ? 0 : subject.yaw,
    pitch: restoration ? -0.27 : 0.11,
    feetY: restoration ? footHeight(w, subject.x, shotZ) : terrainHeight(subject.x, shotZ),
    gaitOffset: 0,
    speed: 0,
    vx: 0,
    vz: 0,
  });
  return shot;
}
export { MAP, LANDMARKS, roadX, trailX, terrainHeight } from './geography.mjs';
export function hordePosition(w, index) {
  return detachedPosition(w, index) || rankPosition(w, index);
}
export function rankPosition(w, index, formationOnly = false) {
  const i = clamp(Math.floor(index), 0, HORDE_COUNT - 1),
    line = Math.floor(i / 48);
  const file = i % 48,
    lane = file % 2 ? (file + 1) / 2 : -file / 2;
  const time = w.ropeFallen ? (w.dispersalAt ?? w.elapsed) : w.elapsed;
  const clock = hostClock(w, time, line),
    listen = clamp(((w.hostListeningUntil || 0) - time) / 3.5, 0, 1);
  const retreat = w.ropeFallen ? Math.max(0, w.elapsed - time) * 1.82 : 0;
  // The broad row geometry remains cheap for the thousands of ordinary feet.
  // Detached files and the guests at the table still occupy their original IDs.
  if (!formationOnly && w.gateClosedAt != null) {
    const guest = castleGuestPosition(w, i, time, retreat);
    if (guest) return guest;
  }
  if (!formationOnly && w.gateRelief?.i === i) {
    const point = reliefPosition(w, i, time, retreat);
    if (point) return point;
  }
  if (!formationOnly && roadFileIds.includes(i)) return roadFilePosition(w, i, clock, retreat);
  // Rear ranks gradually fall in behind the vanguard. Inside the approach,
  // each five-abreast file folds into consecutive places in one gate lane.
  const pace = marchPace(i, clock);
  const marchClock = pace?.clock ?? clock;
  const head = frontStation(marchClock, raceDuration(w));
  const rankSpacing = 1.65 + 4.88 * (head / travelled);
  const base = head - line * rankSpacing;
  const funnel = clamp((base - travelled + 86) / 78, 0, 1);
  const laneIndex = lane + 25,
    slot = laneIndex % 5,
    gateLane = Math.floor(laneIndex / 5) - 5;
  const sway = Math.sin(i + time * (0.72 + (i % 7) * 0.017)) * 0.055 * (1 - 0.75 * listen);
  let spread = lane * 0.9 * (1 - funnel) + gateLane * 0.83 * funnel + sway + (pace?.shoulder || 0);
  if (w.sluiceDecoyAt != null) {
    const age = time - w.sluiceDecoyAt - line * 0.033;
    if (age > 0 && age < 17 && base < travelled - 95) spread += Math.sin((Math.PI * age) / 17) * 1.4;
  }
  const stagger = Math.sin(i * 74.123) * 0.06 + Math.abs(lane) * 0.012;
  let metres = Math.min(
    travelled - slot * 1.28 - line * 6.53,
    base - stagger * (1 - funnel) - slot * 1.28 * funnel
  );
  if (marchClock > raceDuration(w) && line >= 4) {
    // Once the front reaches iron, the rest keep coming. Rear files fan into the
    // assembly ground instead of freezing hundreds of metres down the valley.
    const goal = travelled - 27 - (line - 4) * 1.16;
    const progress = clamp(
      ((marchClock - raceDuration(w)) * 1.23) / Math.max(12, (line - 4) * 4.77 + 8),
      0,
      1
    );
    metres += (goal - metres) * progress;
    spread += (lane * 0.91 + sway - spread) * progress;
  }
  if (line < 3 && marchClock > raceDuration(w) && !w.ropeFallen) {
    const waiting = marchClock - raceDuration(w);
    const press = Math.max(0, Math.cos(waiting * 1.8 - slot * 0.51 - line * 0.42));
    metres += 0.22 * Math.min(1, waiting) * press ** 4;
  }
  metres = Math.max(-117, metres - retreat);
  const point = herdPoint(metres, skirtWreckage(metres, spread));
  const reaction = w.hostReactions?.[i];
  if (reaction) {
    const elapsed = w.elapsed - reaction.at;
    if (elapsed >= 0 && elapsed < 2.5) {
      const t = Math.sin((Math.PI * elapsed) / 2.5);
      point.x += reaction.x * t;
      point.z += reaction.z * t;
      // A walking rank can catch a stationary traveller. Give its shoulder the
      // same clearance it yields when the traveller is the one moving.
      const dx = point.x - w.player.x,
        dz = point.z - w.player.z;
      const gap = Math.hypot(dx, dz);
      if (gap < 0.54) {
        const rx = gap > 0.025 ? dx / gap : Math.sign(reaction.x || 1);
        const rz = gap > 0.025 ? dz / gap : 0;
        const x = w.player.x + rx * 0.54,
          z = w.player.z + rz * 0.54;
        if (!barrier(w, x, z, 0.21, false)) {
          point.x = x;
          point.z = z;
        }
      }
    }
  }
  return point;
}
const lastHostSteps = new WeakMap();
function leaveHostTracks(w, marchers) {
  const last = lastHostSteps.get(w);
  if (last?.player === w.player && w.elapsed >= last.at && w.elapsed - last.at < 0.55) return;
  const feet = new Map();
  for (const q of marchers) {
    const a = w.hostActors?.[q.i] || q;
    if ((!w.hostActors?.[q.i] && !roadFileIds.includes(q.i)) || w.hostFallen?.[q.i]) continue;
    if (distance(w.player, a) > 19 || a.z > 1435) continue;
    const prev = last?.player === w.player && last.feet.get(q.i);
    const step = prev ? distance(prev, a) : 0;
    const prints = prev?.prints || 0;
    if (prev && step < 0.74) {
      feet.set(q.i, prev);
      continue;
    }
    feet.set(q.i, { x: a.x, z: a.z, prints: prints + 1 });
    if (!prev || step > 4.2 || !['leaves', 'grass', 'gravel'].includes(footing(w, a.x, a.z))) continue;
    const side = prints % 2 ? -0.11 : 0.11;
    const tracks = (w.hostTracks ??= []);
    tracks.push({ x: a.x + side * (a.z - prev.z) / step, z: a.z - side * (a.x - prev.x) / step });
    if (tracks.length > 64) tracks.shift();
  }
  lastHostSteps.set(w, { at: w.elapsed, player: w.player, feet });
}
// The broad tracks in the valley follow the settled column. Detached walkers
// leave prints at the places their feet actually reached on yielding ground.
export function hostFootprints(w) {
  const p = w.player;
  const marks = (w.hostTracks || []).filter((q) => distance(q, p) < 22);
  if (p.z < 1015) return marks;
  const head = frontStation(hostClock(w, w.lastBellCastAt ?? w.dispersalAt ?? w.elapsed), raceDuration(w));
  for (const leg of hordeLength) {
    const dx = p.x - leg.x,
      dz = p.z - leg.z;
    const near = clamp(dx * leg.dx + dz * leg.dz, 0, leg.length);
    if (Math.hypot(dx - near * leg.dx, dz - near * leg.dz) > 38) continue;
    const start = Math.ceil(Math.max(leg.start, leg.start + near - 22) / 1.8);
    const end = Math.floor(Math.min(leg.start + leg.length, leg.start + near + 22, head - 2) / 1.8);
    for (let i = start; i <= end; i++) {
      const taper = clamp((travelled - i * 1.8) / 65, 0.2, 1);
      for (const lane of [-12, -3.6, 5.2, 13]) {
        const q = herdPoint(
          i * 1.8,
          skirtWreckage(i * 1.8, ((i % 2 ? 0.13 : -0.13) + lane) * taper + 0.06 * Math.sin(i * 0.39))
        );
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
    entity('herb-1', 'herb', 16, 224),
    entity('herb-2', 'herb', 68, 602),
    entity('herb-3', 'herb', -147, 845),
    entity('herb-4', 'herb', 64, 1236),
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
    journeyEdition: 3,
    raceDuration: 435,
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
function retryReserve(w) {
  // A late river save must still pay for the remaining road bends. Before the
  // spring a rescue also owes the detour to the well and the crossing beyond it.
  const view = { ...w, gateClosedAt: null, gateClosed: false };
  const first = course(view);
  let metres = first?.metres;
  if (first?.goal === 'chapel') {
    const well = LANDMARKS.find((item) => item.id === 'chapel');
    const onward = course({ ...view, player: well, antidote: true });
    metres += onward?.metres ?? Math.hypot(well.x - 30, well.z - GATE_Z);
  }
  const gateDistance =
    metres == null
      ? Math.hypot(w.player.x - 30, w.player.z - GATE_Z) * 1.1
      : Math.max(0, metres - (1516 - GATE_Z));
  return gateDistance / 3.7 + (w.player.z < 1010 ? 35 : 12);
}
export function resumeCheckpoint(w) {
  let restored;
  try {
    restored = JSON.parse(w.checkpoint);
  } catch {
    restored = null;
  }
  if (!restored?.player || !Array.isArray(restored.actors)) restored = createWorld();
  const saved = restored.checkpoint || JSON.stringify(restored);
  const runId = w.runId,
    legacyCrossroads = w.legacyCrossroads;
  for (const k of Object.keys(w)) delete w[k];
  Object.assign(w, restored, { checkpoint: saved, events: [], mapOpen: false });
  if (runId) w.runId = runId;
  if (legacyCrossroads) w.legacyCrossroads = true;
  migrate(w);
  recoverFooting(w);
  if (!w.gateCrossed && w.route !== 'wander') {
    const reserve = retryReserve(w);
    if (secondsToGate(w) < reserve) {
      // Give a late retry enough daylight while preserving local animation clocks.
      // Keep the clock's position and its remaining seconds consistent on the map.
      // Reserve cannot rewind the marching feet before the start of this journey.
      const needed = Math.max(0, reserve - secondsToGate(w));
      const rewind = Math.min(needed, raceTime(w));
      w.raceGrace = (w.raceGrace || 0) + rewind;
      if (needed > rewind) w.raceDuration = raceDuration(w) + needed - rewind;
      w.gateClosedAt = null;
      delete w.gateRelief;
      delete w.gateWaitSince;
      delete w.gateVanguard;
    }
  }
  return w;
}
function retimeFate(q) {
  const progress = clamp((q.time || 0) / (q.duration || 1), 0, 1);
  q.duration = storyFates[q.id].duration;
  q.progress = progress;
  q.time = progress * q.duration;
}
function migrateBridgeCastle(w) {
  const p = w.player,
    q = w.sequence;
  // This edition's stairs rose east of the gate. Remap only the footprint of
  // the former raised floor; a traveller standing in the courtyard stays put.
  if (!q && !w.ending && p.x >= 44.5 && p.x <= 54.2 && p.z >= 1442 && p.z <= 1464.5) {
    const width = (p.x - 44.5) / 9.7;
    if (p.z < 1450) {
      p.x = 16.7 + 2.8 * width;
      p.z = 1441 + (p.z - 1442) * 2;
    } else {
      p.x = 11.4 + 8.5 * width;
      p.z = 1458 + (4.2 * (p.z - 1450)) / 14.5;
    }
  }
  // Preserve an open, already-earned conversation, including its labelled
  // number keys. Previously it could begin much farther from the table.
  const atTable = w.dialogue?.kind === 'banquet',
    tableFate = ['saved', 'feast'].includes(q?.id);
  if (atTable || tableFate) {
    const origin = tableFate ? q : p,
      xero = w.actors.find((a) => a.type === 'princess');
    if (xero && insideHall(origin.x, origin.z)) {
      const dx = origin.x - xero.homeX,
        dz = origin.z - xero.homeZ,
        d = Math.hypot(dx, dz);
      if (d > 4.5) {
        // Keep actors on the approach side of the table, clear of its solid edge.
        const x = xero.homeX + clamp((dx / d) * 2.8, -1.8, 1.8),
          z = xero.homeZ - 3;
        if (tableFate) {
          p.x += x - q.x;
          p.z += z - q.z;
        }
        origin.x = x;
        origin.z = z;
        origin.yaw = Math.atan2(xero.homeX - x, xero.homeZ - z);
        origin.pitch = -0.06;
        if (tableFate) {
          p.yaw = origin.yaw;
          p.pitch = origin.pitch;
        }
      }
      if (atTable) w.dialogue.legacyTable = true;
    } else if (atTable) {
      w.dialogue = null;
      w.milestones.reveal = false;
    }
  }
  if (q?.id === 'horde') {
    const fraction = clamp((q.time || 0) / (q.duration || 3.3), 0, 1);
    w.gateClosedAt = w.elapsed - fraction * arrivalCoda;
    w.sequence = null;
  } else {
    if (w.gateClosed && w.gateClosedAt == null) w.gateClosedAt = w.elapsed - arrivalCoda;
    if (q && storyFates[q.id]) {
      retimeFate(q);
      if (q.id === 'bound') {
        if (q.resisted && !Number.isFinite(q.resistAt)) q.resistAt = q.time;
        q.command = q.progress > 0.12;
        q.voice = q.progress > 0.46;
      }
      if (q.id === 'feast' && q.progress > 0.365) {
        q.looseCuff = true;
        const xero = w.actors.find((a) => a.type === 'princess');
        if (xero)
          w.tetherRelease ||= {
            at: w.elapsed - (q.progress - 0.365) * q.duration,
            x: xero.x - 0.2 * Math.cos(p.yaw),
            height: 1.22,
            z: xero.z + 0.2 * Math.sin(p.yaw),
            cause: 'slip',
          };
      }
      if (q.id === 'saved' && w.ropeFallen) {
        q.cure = true;
        q.release = Boolean(w.actors.find((a) => a.type === 'body')?.freed);
        w.tetherRelease ||= {
          at: w.dispersalAt ?? w.elapsed,
          x: 29.8,
          height: 1.32,
          z: 1516,
          cause: 'release',
        };
      }
    }
  }
}
export function migrate(w) {
  if (w.version !== 2) {
    w.gateCrossed = w.player.z > GATE_Z + 1.2 && w.player.z < 1554 && Math.abs(w.player.x - 30) < 25;
    w.version = 2;
    w.raceDuration = legacyRaceSeconds;
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
    if (w.sequence && storyFates[w.sequence.id]) retimeFate(w.sequence);
    for (const a of spawnActors().filter((v) => v.type === 'berries'))
      if (!w.actors.some((v) => v.id === a.id)) w.actors.push(a);
  }
  if (w.journeyEdition !== 3 || Number.isFinite(w.player.maxStamina)) {
    const p = w.player;
    if (Number.isFinite(p.maxStamina)) {
      // The November bridge release also called itself v2, but used a 0–100
      // stamina scale, another encounter clock, and different castle rooms.
      p.stamina = clamp((p.stamina ?? p.maxStamina) / Math.max(1, p.maxStamina), 0, 1);
      delete p.maxStamina;
      p.exhausted = p.exhaustedUntil > w.elapsed;
      p.speed = p.vx = p.vz = 0;
      migrateBridgeCastle(w);
      p.feetY = footHeight(w, p.x, p.z);
      p.airborne = false;
      p.vy = 0;
      w.raceDuration = 365;
      w.phialsGiven = w.phialsGiven || w.route === 'guided' || w.hasMap;
      w.bridgeRaisedAt = w.bridgeOpen ? w.elapsed - 1.8 * clamp(w.bridgeProgress ?? 1, 0, 1) : null;
      if (w.gateCrossed && p.z > 1554 && !w.milestones.reveal && !w.ending) w.gateCrossed = false;
      if (w.strikeUntil > w.elapsed + 1) w.strikeUntil = w.elapsed;
      if (w.potionUntil > w.elapsed + 1.2) w.potionUntil = w.elapsed;
      if (w.hurtUntil > w.elapsed + 1.6) w.hurtUntil = w.elapsed;
      if (w.waypoint && !w.survey)
        w.survey = { visits: {}, trace: [], pins: [{ x: w.waypoint.x, z: w.waypoint.z }] };
      if (w.discovered) {
        w.survey ||= { visits: {}, trace: [], pins: [] };
        Object.assign(w.survey.visits, w.discovered);
      }
      if (w.moonwellHealed) w.milestones.drankWell = true;
      if (w.moonwellPurified) w.reedAt ??= w.moonwellAt ?? w.elapsed - 3;
      // Preserve the words in the original notebook and the supplies it
      // actually promised. The same encounter must not add a conflicting entry.
      const entryIds = {
        'witch-offer': 'witch',
        'route-guided': 'guided',
        'route-wander': 'wander',
        'satchel-found': 'satchel',
        'moonwell-filled': 'spring',
        'banquet-truth': 'banquet',
        'bell-gallery': 'gallery',
      };
      for (const entry of w.journal || []) {
        entry.at ??= entry.time ?? w.elapsed;
        if (Object.hasOwn(entryIds, entry.id)) entry.id = entryIds[entry.id];
      }
      if (
        w.greeted &&
        w.route === 'undecided' &&
        !w.dialogue &&
        w.actors.find((a) => a.type === 'witch')?.alive
      )
        w.consideringOffers = true;
      const witch = w.actors.find((a) => a.type === 'witch' && a.alive);
      if (w.route === 'wander' && witch?.targetX != null && witch.x <= witch.homeX + 0.01)
        w.witchAsideAt = w.elapsed;
    }
    // Keep each consumed plant dead. Only add species absent in that release.
    const existing = new Set(w.actors.map((a) => a.id));
    for (const a of spawnActors())
      if (['berries', 'herb'].includes(a.type) && !existing.has(a.id)) w.actors.push(a);
    w.journeyEdition = 3;
  }
  if (w.hasMap && w.route === 'unbound') giveStolenBottles(w);
  w.player.stamina ??= 1;
  w.player.feetY ??= footHeight(w, w.player.x, w.player.z);
  return w;
}
const raceTime = (w) => hostClock(w, w.elapsed);
const event = (w, type, text) => w.events.push(text ? { type, text } : { type });
export const secondsToGate = (w) => gateForecast(w, raceDuration(w), rankPosition);
// A later, optional view of the same feast. Nothing in this view is written
// back into Zelda's journey, including ranks that died on the way to the keep.
export function feastAftermath(w) {
  if (w.ending?.id !== 'feast' || w.lastBellCastAt != null) return null;
  const arrival = w.gateClosedAt ?? w.elapsed + secondsToGate(w);
  if (!Number.isFinite(arrival)) return null;
  const age = nextMealAge(w, Math.max(0,w.elapsed - arrival));
  if (!Number.isFinite(age)) return null;
  const scene = {
    ...w, feastAftermath: true, elapsed: arrival + age,
    gateClosedAt: arrival, ending: null, sequence: null, dialogue: null, watchedTable: true,
    events: [], hostWarning: null, hostReactions: {}, recognisedAt: null,
    hostActors: Object.fromEntries(Object.entries(w.hostActors || {}).filter(([,a]) => a.state === 'fallen')),
    player: {...w.player, x: 35.3, z: 1509.8, yaw: Math.atan2(-3.9, 6.85), pitch: -0.08,
      speed: 0, vx: 0, vz: 0, gaitOffset: 0},
    actors: w.actors.map(a => a.type === 'princess' ? {...a, x: a.homeX, z: a.homeZ} : a),
  };
  scene.player.feetY = footHeight(scene, scene.player.x, scene.player.z);
  return scene;
}
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
    a = w.actors.find((v) => v.type === 'princess'),
    d = distance(p, a);
  const eye = Math.max(p.feetY ?? -Infinity, footHeight(w, p.x, p.z)) + 1.64,
    face = terrainHeight(a.x, a.z) + 1.35;
  const angle = Math.atan2(face - eye, d);
  return (
    insideHall(p.x, p.z) &&
    d <= 5 &&
    (a.x - p.x) * Math.sin(p.yaw) + (a.z - p.z) * Math.cos(p.yaw) > 0.77 * d &&
    Math.abs((p.pitch || 0) - angle) < 0.48 &&
    clearSegment(w, p.x, p.z, a.x, a.z, 0.03, eye, face)
  );
}
function banquet(w, automatic = false) {
  if (w.ending || !canSeeBanquet(w)) return false;
  if (!w.milestones.reveal) {
    w.milestones.reveal = true;
    storyBeat(w, 'banquet');
    cue(w, 'reveal');
  }
  const ready = w.route === 'unbound' && w.antidote;
  const casting = isStolenBottle(w.bag?.selected) || (w.lastBellCastAt != null && !w.bag?.selected);
  if (automatic && w.bag?.stock?.saveher > 0 && (!ready || casting)) {
    w.watchedTable = true;
    notify(w, 'The cord winds around Xero’s wrist. She looks up. “You kept the ribbon.”', 5);
    return true;
  }
  const choices = ready ? [{ id: 1, label: 'Lift the silver vial between you' }] : [];
  choices.push({ id: 2, label: 'Reach for the princess' });
  choices.push({ id: 3, label: 'Tap the old orchard knock on the oak' });
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
function beginThrownRescue(w, xero, contact) {
  if (w.ending || w.sequence || w.royalPrize || xero?.type !== 'princess' || !xero.alive || xero.cured) return false;
  w.rescueImpact = { x: contact.x, y: contact.y, z: contact.z, at: w.elapsed };
  w.royalPrize = { earnedAt: w.elapsed, phase: 'restoring', time: 0 };
  w.milestones.reveal = true;
  w.milestones.xeroSaved = true;
  w.watchedTable = true;
  storyBeat(w, 'banquet');
  beginFate(w, 'saved');
  // The catch and release are one event. No later bite or race tick can undo it.
  xero.cured = true;
  w.ropeFallen = true;
  w.dispersalAt = w.elapsed;
  w.tetherRelease = { at: w.elapsed, x: xero.x - 0.2, z: xero.z, height: 1.27, cause: 'release' };
  cue(w, 'cure', 'silver', xero);
  cue(w, 'royalprize', 'restoring', xero);
  notify(w, 'The bell cord slips from Xero’s hand. A breath catches in her throat.', 3.4);
  return true;
}
export function choose(w, n) {
  if (!w.dialogue) return false;
  n = Number(n);
  if (storyChoose(w, n)) return true;
  if (w.dialogue.kind === 'cordial') {
    if (n === 1) {
      setCordial(w, false);
      w.route = 'bound';
      cue(w, 'potion', 'drink', w.player);
      beginFate(w, 'bound');
    } else if (n === 2) {
      w.dialogue = null;
      w.consideringOffers = true;
      notify(w, 'The cork stays in place. The witch waits by the lantern.', 4);
    } else return false;
    return true;
  }
  if (w.dialogue.kind === 'banquet') {
    if (w.route === 'unbound' && w.antidote && n === 1) {
      w.antidote = false;
      cue(w, 'potion', 'cure', w.player);
      beginFate(w, 'saved');
    } else if (n === 2) beginFate(w, 'feast');
    else if (n === 3 && w.dialogue.choices.some((choice) => choice.id === 3)) {
      const watch = w.dialogue.legacyTable;
      w.dialogue = null;
      if (watch) w.watchedTable = true;
      else knockAtTable(w);
    } else return false;
    return true;
  }
  if (w.dialogue.kind !== 'witch' || ![1, 2, 3].includes(n)) return false;
  if (n === 1) {
    w.route = 'guided';
    storyBeat(w, 'guided');
    giveRoadBottles(w);
    talk(
      w,
      'directions',
      'The witch',
      'She slips three bottles into your travelling bag. “Red clay for teeth. Willow for a nose too keen. The bronze one? Throw it where you want the heavy feet to go.” She draws the road with her lantern. North, past the wolves at the fork, the troll in Briar Hollow and the dragon on the downs. At the sluice she listens, one hand lifted, until the castle calls.'
    );
  } else if (n === 2) {
    setCordial(w, true);
    talk(
      w,
      'cordial',
      'The pear cordial',
      'She lays the little green bottle in your palm. One side is warm from her hand. A drop clings to the rim. The smell is of pears left in the sun.',
      [
        { id: 1, label: 'Drink the cordial' },
        { id: 2, label: 'Keep the cork in' },
      ]
    );
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
const reachByType = {
  herb: 2.1,
  berries: 2.1,
  witch: 4.1,
  satchel: 2.6,
  bell: 2.7,
  spring: 6.2,
  princess: 5,
};
function target(w) {
  const wicket = { type: 'wicket', x: 34.05, z: 1435, label: 'Lift the wicket latch' };
  if (
    (w.gateCrossed || w.lastBellCastAt != null) &&
    w.gateClosedAt != null &&
    w.elapsed - w.gateClosedAt > 0.9 &&
    !(w.wicketHoldUntil > w.elapsed + 0.65) &&
    nearFacing(w, wicket, 3.35, 0.35)
  )
    return wicket;
  return (
    storyTarget(w) ||
    nearest(
      w,
      (a) =>
        reachByType[a.type] &&
        (a.type !== 'princess' || canSeeBanquet(w)) &&
        (Math.abs(w.player.pitch || 0) < 0.87 ||
          a.type === 'satchel' ||
          a.type === 'berries' ||
          a.type === 'herb') &&
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
    if (tone === 'low' && w.sluiceDecoyAt == null && w.gateClosedAt == null && !w.ropeFallen && livingLead(w)) {
      w.sluiceDecoyAt = w.elapsed;
      stillTheColumn(w, 14);
      const listener = livingLead(w);
      cue(w, 'answer', 'host', hordePosition(w, listener.i));
      notify(
        w,
        'The low bell speaks alone. Beyond the water a rank turns towards it. For a little while, the boots fall quiet.',
        5
      );
      return;
    }
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
  if (a.type === 'wicket') {
    w.wicketAt = w.elapsed;
    w.wicketHoldUntil = w.elapsed + 6;
    cue(w, 'chain', 'tight', a);
    notify(w, 'The counterweight lifts two bars. The small wicket is open.', 3.2);
    return true;
  }
  if (storyInteract(w, a)) return true;
  if (a.type === 'berries' || a.type === 'herb') {
    const kind = a.type === 'herb' ? 'leaf' : 'berries';
    addForage(w, kind);
    a.alive = false;
    cue(w, 'gather', kind, a);
    if (kind === 'berries' && w.player.health < w.player.maxHealth) {
      takeItem(w, kind);
      w.player.health = Math.min(w.player.maxHealth, w.player.health + 2);
      notify(w, 'The tart fruit steadies your heartbeat.');
    } else
      notify(
        w,
        kind === 'leaf'
          ? 'Moonleaf folded into the cloth pocket of your bag.'
          : 'You tuck the rowanberries into your bag.'
      );
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
    const freshBottles = giveRoadBottles(w);
    giveStolenBottles(w);
    event(w, 'loot');
    talk(
      w,
      'map',
      'The mapmaker’s hand',
      (freshBottles
        ? 'You fasten the satchel to your belt. Its loops hold a red clay jar, a stoppered reed and a hollow bronze pear. '
        : 'You fasten the satchel to your belt. Three worn loops match the bottles she gave you. ') +
        'Under the flap are two more bottles. Their labels read “Last Bell” and “Save Her”. You tuck both into your bag. ' +
        'In the lining, silver catches on a fold of paper. Pale ink traces a second trail. Beside the spring someone has drawn two reeds: one black, one in leaf.'
    );
  } else if (a.type === 'spring') {
    if (w.hasVial && !w.antidote) {
      w.antidote = true;
      storyBeat(w, 'spring');
      cue(w, 'potion', 'fill', a);
      talk(
        w,
        'spring',
        'The Moonwell',
        'Silver meets the surface. A drop slips over the rim and hangs on a black reed. Across the stones, the pale trail bends northeast.'
      );
    } else if (!w.milestones.drankWell && w.player.health < w.player.maxHealth) {
      w.player.health = Math.min(w.player.maxHealth, w.player.health + 2);
      w.milestones.drankWell = true;
      cue(w, 'potion', 'sip', a);
      notify(w, 'You drink from your cupped hands. The ache under your ribs eases.');
    } else
      notify(
        w,
        w.antidote
          ? 'The silver vial is full. Water runs over the stone into the reeds.'
          : 'Cold water runs through a cupped stone hand.'
      );
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
    if (w.dialogue.kind === 'banquet') w.watchedTable = true;
    if ((w.dialogue.kind === 'witch' || w.dialogue.kind === 'cordial') && w.route === 'undecided') {
      w.consideringOffers = true;
      notify(w, 'She waits by the lantern. You can speak again, or take the woods beyond the clearing.', 5.5);
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
  if (action === 'dodge') {
    const p = w.player;
    if (
      p.airborne ||
      p.stamina < 0.16 ||
      w.elapsed < (w.dodgeReadyAt || 0) ||
      w.elapsed < w.strikeUntil ||
      w.elapsed < (w.guardUntil || 0)
    )
      return false;
    // Keep an evasive step in its committed direction even as the player looks.
    const dir = p.speed > 0.22 ? Math.atan2(p.vx, p.vz) : p.yaw + Math.PI;
    const dx = Math.sin(dir),
      dz = Math.cos(dir);
    if (barrier(w, p.x + dx * 0.22, p.z + dz * 0.22, 0.28, true, p.x, p.z)) return false;
    p.dodgeHeading = dir;
    w.dodgeAt = w.elapsed;
    w.dodgeReadyAt = w.elapsed + 0.78;
    p.stamina -= 0.16;
    cue(w, 'dodge', p.surface, p);
    return true;
  }
  if (action === 'guard') {
    if (w.elapsed < (w.guardReadyAt || 0) || w.elapsed < w.strikeUntil || w.player.stamina < 0.06)
      return false;
    w.guardAt = w.elapsed;
    w.guardUntil = w.elapsed + 0.75;
    w.guardReadyAt = w.elapsed + 1.04;
    w.player.stamina -= 0.06;
    cue(w, 'guard');
    return true;
  }
  const pocket = quickItem(w, action);
  if (pocket || action === 'use-equipped' || action === 'potion') {
    const held = pocket || selectedItem(w);
    if (!held?.count) {
      notify(w, pocket ? pocket.name + ' pocket is empty.' : 'There is nothing ready in your bag.');
      return false;
    }
    if (throwableBottles.includes(held.id)) {
      if (w.elapsed < w.potionUntil || w.phialFlight) return false;
      return tossPhial(w, held.id);
    }
    if (held.id === 'leaf' || held.id === 'berries') {
      if (w.player.health >= w.player.maxHealth) {
        notify(w, 'Your hearts are full. You tuck it back in the bag.');
        return false;
      }
      takeItem(w, held.id);
      w.player.health = Math.min(w.player.maxHealth, w.player.health + 2);
      cue(w, 'gather', 'heal', w.player);
      notify(
        w,
        held.id === 'leaf'
          ? 'A green stain spreads across the bandage. The wound closes.'
          : 'You eat the berries and recover your strength.'
      );
      return true;
    }
    if (held.id === 'vial') {
      const here = target(w);
      if (!w.antidote && here?.type === 'spring') return interact(w, here);
      if (w.antidote && w.route === 'unbound' && canSeeBanquet(w)) {
        w.antidote = false;
        cue(w, 'potion', 'cure', w.player);
        beginFate(w, 'saved');
        return true;
      }
      notify(
        w,
        w.antidote ? 'You steady the glass. Its silver lip is wet.' : 'The empty vial catches the light.'
      );
      return true;
    }
    if (held.id === 'cordial') {
      setCordial(w, false);
      w.route = 'bound';
      cue(w, 'potion', 'drink', w.player);
      beginFate(w, 'bound');
      return true;
    }
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
  w.player.health = Math.max(0, w.player.health - (a.type === 'wolf' || a.type === 'host' ? 1 : 2));
  cue(w, 'hurt', a.type, a);
  if (!w.player.health) {
    if (a.type === 'host') {
      end(w, 'taken', 'Taken by the dead',
        'A hand catches your sword arm. Its weight drives you to your knees. When the tower calls again, your sword is lying where you fell.');
      return;
    }
    const line = {
      wolf: 'You hear a second set of paws behind you. Your boot slips on the wet roots. The second wolf is already there.',
      troll:
        'The troll’s shadow falls across your path. Your sword rings once against stone and falls silent.',
      dragon: 'Wind folds the canopy flat. In the dragon’s breath, the forest turns white.',
    }[a.type];
    end(w, 'wilds', 'Lost in the green', line);
  } else if (a.type === 'host')
    notify(w, 'Teeth catch your shoulder. You tear free of the dead hand.', 2.7);
  else notify(w, 'The ' + a.type + ' strikes. Move out of reach.', 2.7);
}
// Renderers submit only illustrated walkers from the last painted view. This
// ephemeral shortlist never enters a save or an ending-camera reconstruction.
const processionViews = new WeakMap();
export function recordProcessionView(w, poses, aspect) {
  if (w.raceWitness || w.sequence || w.ending || w.ropeFallen) return;
  processionViews.set(w.renderSource || w, { poses, aspect, at: w.elapsed });
}
function inspectProcession(w) {
  if (w.ropeFallen || w.elapsed < (w.nextHostLook || 0)) return;
  const view = processionViews.get(w);
  if (!view?.poses.length || w.elapsed < view.at || w.elapsed - view.at > 0.45) return;
  w.nextHostLook = w.elapsed + 0.19;
  const p = w.player,
    eye = Math.max(p.feetY ?? 0, footHeight(w, p.x, p.z)) + 1.64;
  const threshold = Math.cos(Math.min(0.48, Math.atan((view.aspect || 1) / 1.48) * 0.84));
  let seen = false, bowl = false, feeding = false, traveller;
  for (const a of view.poses) {
    if (a.state === 'fallen' || w.hostFallen?.[a.id]) continue;
    const loose = a.roadFile || ['pursue', 'windup', 'recover', 'stagger', 'return'].includes(a.state);
    const atFeast = a.state === 'feed' && w.milestones.reveal;
    if (!loose && !atFeast && (w.milestones.procession || seen) && (a.kind !== 0 || w.milestones.bowl)) continue;
    const dx = a.x - p.x,
      dz = a.z - p.z,
      d = Math.hypot(dx, dz);
    if (
      d < 0.3 ||
      d > (a.kind === 0 ? 13 : 48) ||
      (dx * Math.sin(p.yaw) + dz * Math.cos(p.yaw)) / d < threshold
    )
      continue;
    const detail = a.y + (a.kind === 0 ? a.h * 0.48 : a.h * 0.78);
    if (Math.abs((p.pitch || 0) - Math.atan2(detail - eye, d)) > 0.46) continue;
    if (!clearSegment(w, p.x, p.z, a.x, a.z, 0.04, eye, detail)) continue;
    const hidden = view.poses.some((b) => {
      if (b === a || b.state === 'fallen' || w.hostFallen?.[b.id]) return false;
      const bx = b.x - p.x,
        bz = b.z - p.z,
        u = (bx * dx + bz * dz) / (d * d);
      if (u <= 0.025 || u >= 0.97 || Math.hypot(bx - u * dx, bz - u * dz) > 0.32) return false;
      const height = eye + (detail - eye) * u;
      return height > b.y + 0.25 && height < b.y + b.h;
    });
    if (hidden) continue;
    if (loose && (!traveller || d < traveller.d)) traveller = { id: a.id, x: a.x, z: a.z, d };
    if (!loose && !a.castleGuest) seen = true;
    if (atFeast && d < 17) feeding = true;
    if (a.kind === 0) bowl = true;
  }
  if (traveller) {
    const old = w.hostSighting;
    if (!old || old.id !== traveller.id || w.elapsed >= old.at + 1)
      w.hostSighting = { id: traveller.id, x: traveller.x, z: traveller.z, at: w.elapsed };
    if (!w.milestones.looseWalker) {
      w.milestones.looseWalker = true;
      storyBeat(w, 'looseWalker');
    }
  }
  if (feeding && !w.milestones.guestsAtTable) {
    w.milestones.guestsAtTable = true;
    storyBeat(w, 'guestsAtTable');
  }
  if (seen && !w.milestones.procession) {
    w.milestones.procession = true;
    storyBeat(w, 'procession');
    notify(w, 'The dead file past, shoulder to shoulder, on the broken road to the keep.', 4.5);
  }
  if (bowl && !w.milestones.bowl) {
    w.milestones.bowl = true;
    storyBeat(w, 'bowl');
    notify(w, 'One of the dead carries a wooden bowl pressed against its ribs.', 4.5);
  }
}
function witnessedHost(w) {
  const p = w.player;
  if (w.lastBellCastAt != null || w.milestones.ridge || Math.hypot(p.x - 48, p.z - 480) > 28) return false;
  const eye = Math.max(p.feetY ?? 0, footHeight(w, p.x, p.z)) + 1.64;
  for (const i of [0, 674, 1570, 2544]) {
    if (w.hostFallen?.[i]) continue;
    const q = hordePosition(w, i),
      dx = q.x - p.x,
      dz = q.z - p.z,
      d = Math.hypot(dx, dz);
    if ((dx * Math.sin(p.yaw) + dz * Math.cos(p.yaw)) / d < 0.965) continue;
    const target = terrainHeight(q.x, q.z) + 1.63;
    if (Math.abs((p.pitch || 0) - Math.atan2(target - eye, d)) > 0.4) continue;
    let visible = true;
    for (let step = 2; step < d; step += 7) {
      const u = step / d;
      if (terrainHeight(p.x + dx * u, p.z + dz * u) > 0.02 + eye + (target - eye) * u) {
        visible = false;
        break;
      }
    }
    if (visible) return true;
  }
  return false;
}
function landmarkBeat(w, id, condition, text, sound) {
  if (!condition || w.milestones[id]) return;
  w.milestones[id] = true;
  notify(w, text, 5.5);
  if (sound) event(w, sound);
}
function reactToHost(w, q, quiet = false) {
  if (w.hostActors?.[q.i] || w.hostFallen?.[q.i]) return;
  const p = w.player,
    dx = q.x - p.x,
    dz = q.z - p.z,
    speed = Math.hypot(p.vx || 0, p.vz || 0);
  const forwardX = speed > 0.25 ? p.vx / speed : Math.sin(p.yaw),
    forwardZ = speed > 0.25 ? p.vz / speed : Math.cos(p.yaw);
  const cross = dx * forwardZ - dz * forwardX,
    sign = Math.abs(cross) > 0.045 ? Math.sign(cross) : q.i % 2 ? 1 : -1;
  w.hostReactions ??= {};
  for (const [i, v] of Object.entries(w.hostReactions))
    if (w.elapsed - v.at >= 2.5) delete w.hostReactions[i];
  if (!quiet && w.elapsed >= (w.nextBrush || 0)) {
    cue(w, 'brush', 'host', q);
    w.nextBrush = w.elapsed + 2.2;
  }
  const current = w.hostReactions[q.i];
  if (current) return;
  // Nearby files lean the same way as their closest shoulder. That preserves a
  // finger-width between neighbours while leaving the traveller a real passage.
  const magnitude = 0.94 * Math.exp(-Math.abs(cross) / 1.65);
  let x = forwardZ * sign * magnitude,
    z = -forwardX * sign * magnitude;
  if (barrier(w, q.x + x, q.z + z, 0.21, false)) {
    x *= -0.55;
    z *= -0.55;
  }
  if (!barrier(w, q.x + x, q.z + z, 0.21, false)) w.hostReactions[q.i] = { x, z, at: w.elapsed };
}
function avoidHost(w, nearby) {
  const p = w.player,
    v = Math.hypot(p.vx || 0, p.vz || 0),
    fx = v > 0.25 ? p.vx / v : 0,
    fz = v > 0.25 ? p.vz / v : 0;
  for (const q of nearby) {
    const dx = q.x - p.x,
      dz = q.z - p.z,
      along = dx * fx + dz * fz,
      side = Math.abs(dx * fz - dz * fx);
    if (Math.hypot(dx, dz) < 0.53) reactToHost(w, q);
    else if (v > 0.35 && along > -0.25 && along < 1.45 && side < 2) reactToHost(w, q, true);
  }
  return (x, z) =>
    nearby.some((q) => {
      const d = (x - q.x) ** 2 + (z - q.z) ** 2;
      if (d < 0.5 ** 2 && d < (p.x - q.x) ** 2 + (p.z - q.z) ** 2) {
        reactToHost(w, q);
        return true;
      }
      return false;
    });
}
function walk(w, dt, input) {
  const p = w.player;
  let f = clamp(Number(input.forward) || 0, -1, 1),
    s = clamp(Number(input.strafe) || 0, -1, 1);
  const throwLength = Math.hypot(f, s);
  if (throwLength < 0.2) {
    // Quiet the centre without making a deliberate small walking input jump.
    const gain = clamp((throwLength - 0.075) / 0.125, 0, 1);
    f *= gain;
    s *= gain;
  }
  p.yaw += (Number(input.turn) || 0) * 1.9 * dt;
  const immersion = riverImmersion(w, p.x, p.z),
    dodgeAge = w.elapsed - (w.dodgeAt ?? -1),
    dodging = dodgeAge >= 0 && dodgeAge < 0.27;
  p.immersion = immersion;
  if (p.exhausted && p.stamina > 0.45) p.exhausted = false;
  const sprint =
    !dodging &&
    !input.walk &&
    input.sprint &&
    immersion < 0.3 &&
    f > 0.45 &&
    !p.exhausted &&
    !(w.guardUntil > w.elapsed);
  const grade = terrainHeight(p.x + Math.sin(p.yaw), p.z + Math.cos(p.yaw)) - terrainHeight(p.x, p.z);
  let speed =
    (input.walk ? 1.55 : sprint ? 6.75 : 3.95) *
    (1 - 0.78 * Math.min(1, immersion)) *
    clamp(1 - grade * f * 0.48, 0.68, 1.08);
  if (w.guardUntil > w.elapsed) speed *= 0.58;
  const norm = Math.max(1, Math.hypot(f, s));
  const forward = (f * speed * (f < 0 ? 0.64 : 1)) / norm,
    side = (s * speed * 0.8) / norm;
  const sx = Math.sin(p.yaw),
    cz = Math.cos(p.yaw);
  const desiredX = forward * sx + side * cz + immersion * (0.65 + immersion * 0.6),
    desiredZ = forward * cz - side * sx;
  const response = 1 - Math.exp(-dt * (sprint ? 8.2 : 12));
  p.vx = (p.vx || 0) + (desiredX - (p.vx || 0)) * response;
  p.vz = (p.vz || 0) + (desiredZ - (p.vz || 0)) * response;
  if (dodging) {
    const burst = (2.2 + 7.5 * Math.sin((Math.PI * dodgeAge) / 0.27)) * (1 - 0.45 * Math.min(1, immersion));
    p.vx = Math.sin(p.dodgeHeading) * burst;
    p.vz = Math.cos(p.dodgeHeading) * burst;
  }
  const oldX = p.x,
    oldZ = p.z;
  const host = nearbyHost(w, rankPosition),
    avoid = host && avoidHost(w, host);
  const dx = p.vx * dt, dz = p.vz * dt;
  if (Math.hypot(p.vx, p.vz) > 0.02) {
    moveBody(w, p, dx, dz, avoid);
    if (host.length && !dodging && Math.hypot(p.x - oldX, p.z - oldZ) < Math.hypot(dx, dz) * 0.2)
      slidePastHost(w, host, dx, dz, avoid);
  }
  const ground = footHeight(w, p.x, p.z);
  // Snap to rising ground. Drop from ledges under gravity instead of snapping the camera down.
  const drop = p.feetY - ground;
  if (!Number.isFinite(p.feetY) || drop <= 0.055) {
    if (p.airborne && p.verticalSpeed < -0.9) {
      cue(w, 'land', footing(w, p.x, p.z), p);
      p.landedAt = w.elapsed;
    }
    p.airborne = false;
    p.feetY = ground;
    p.verticalSpeed = 0;
  } else {
    p.airborne = true;
    p.verticalSpeed = (p.verticalSpeed || 0) - dt * 9.81;
    p.feetY = Math.max(ground, p.feetY + p.verticalSpeed * dt);
  }
  const travelled = Math.hypot(p.x - oldX, p.z - oldZ);
  p.speed = travelled / dt;
  // Charge running effort for real progress, so holding Run against stone can
  // never exhaust the player, nor can barely grazing a post consume a full stride.
  const effort = sprint ? clamp(p.speed / Math.max(1, speed), 0, 1) : 0;
  p.stamina = clamp(p.stamina + (effort > 0.04 ? -0.082 * effort : dodging ? 0 : 0.115) * dt, 0, 1);
  if (p.stamina <= 0.002) p.exhausted = true;
  const onFoot = !p.airborne && !dodging;
  p.gaitPhase = ((p.gaitPhase || 0) + (onFoot ? travelled * 3.8 : 0)) % (Math.PI * 2);
  const amplitude = onFoot ? 0.009 * Math.min(1, p.speed / 4) : 0;
  const targetBob = Math.sin(p.gaitPhase) * amplitude;
  p.gaitOffset = (p.gaitOffset || 0) + (targetBob - (p.gaitOffset || 0)) * (1 - Math.exp(-dt * 15));
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
  return { oldZ, marchers: host || [] };
}
function silenceHost(w, impact) {
  const nearby = hostWithin(w, w.player, 38, rankPosition);
  w.lastBellWitnesses = fallenWitnesses(w, impact, nearby, rankPosition);
  w.lastBellCastAt = w.elapsed;
  w.lastBellImpact = impact;
  const fallen = {};
  for (let i = 0; i < HORDE_COUNT; i++) fallen[i] = true;
  w.hostFallen = fallen;
  w.hostActors = {};
  w.hostWounds = {};
  w.hostReactions = {};
  w.hostRosterEpoch = (w.hostRosterEpoch || 0) + 1;
  delete w.hostWarning;
  delete w.hostSighting;
  delete w.gateRelief;
  delete w.raceWitness;
  w.nextAnswer = 0;
}
const phialHost = {
  silence: silenceHost,
  rescue: (w, xero, impact) => beginThrownRescue(w, xero, impact),
  inRange: (w, point, radius) => hostWithin(w, point, radius, rankPosition),
  damage: damageHost,
};
function simulate(w, dt, input) {
  const p = w.player;
  w.elapsed += dt;
  const { oldZ, marchers } = walk(w, dt, input);
  advancePhial(w, dt, notify, phialHost);
  if (w.sequence) return;
  strikeContacts(
    w,
    { move: (a, x, z) => moveBody(w, a, x, z) },
    {
      ring,
      notify,
      drop,
      marchers,
      hitMarcher: damageHost,
    }
  );
  advanceHost(w, dt, marchers, rankPosition, injury, notify);
  leaveHostTracks(w, marchers);
  if (w.ending) return;
  storyTick(w, dt, w.lastBellCastAt == null ? rankPosition : null);
  const peal = Math.floor((w.elapsed + 31) / 37);
  if (peal > w.lastBell) {
    w.lastBell = peal;
    if (w.elapsed > 2 && allowCastlePeal(w)) {
      cue(w, 'bell', 'tower', { x: 30, z: 1530 });
      w.hostRangAt = w.elapsed;
      w.hostListeningUntil = w.elapsed + 4;
      w.nextAnswer = w.elapsed + 3.1;
    }
  }
  if (w.nextAnswer && w.elapsed >= w.nextAnswer) {
    const listener = livingLead(w);
    if (listener && !w.ropeFallen) cue(w, 'answer', 'host', hordePosition(w, listener.i));
    w.nextAnswer = 0;
  }
  advanceWildlife(w, dt, { injury, notify, marcherAt: w.lastBellCastAt == null ? rankPosition : null, nearMarchers: marchers });
  if (w.ending) return;
  if (w.route === 'undecided' && w.consideringOffers && distance(p, w.actors[0]) > 32) {
    w.route = 'wander';
    w.nextHunt = w.elapsed + 15;
    storyBeat(w, 'wander');
    notify(w, 'The lantern slips behind the last trunk. Ahead, two wolves answer one another.', 4);
  }
  if (
    !w.greeted &&
    w.actors[0].alive &&
    Math.abs(p.pitch || 0) < 0.66 &&
    nearFacing(w, w.actors[0], 4.05, 0.6)
  ) {
    meet(w);
    return;
  }
  const arrival = gateArrival(w, raceDuration(w), rankPosition);
  if (
    !w.gateCrossed &&
    (w.gateClosedAt == null || w.lastBellCastAt != null) &&
    oldZ < GATE_Z &&
    p.z >= GATE_Z &&
    Math.abs(p.x - 30) < 4.55 &&
    (!arrival || w.elapsed - dt * (p.z - GATE_Z) / (p.z - oldZ) <= arrival.at + 1e-9)
  ) {
    w.gateCrossed = true;
    w.gateCrossedAt = w.elapsed - (dt * (p.z - GATE_Z)) / (p.z - oldZ);
    w.milestones.gateSave = true;
    saveCheckpoint(w);
    notify(w, w.gateClosedAt == null
      ? 'Through the gate. You free the small wicket latch as you pass. Xero is somewhere inside.'
      : 'Through the wicket. The courtyard is silent.');
    cue(w, 'gate', 'crossed', p);
  }
  if (arrival) {
    w.gateClosedAt = arrival.at;
    w.gateVanguard = arrival.i;
    if (w.gateCrossed && Math.abs(p.x - 30) < 4.7 && Math.abs(p.z - GATE_Z) < 0.73) w.holdingGate = true;
    cue(w, 'gate', 'close', { x: 30, z: GATE_Z });
    if (!w.gateCrossed && w.route !== 'wander') {
      const gate = { x: 30, z: GATE_Z };
      if (!nearFacing(w, gate, 42, 0.65) || Math.abs(p.pitch || 0) > 0.48) {
        w.raceWitness = { x: 42, z: 1418, yaw: Math.atan2(-12, 17) };
        notify(w, 'At Castle Xero, the vanguard reaches the iron gate.', arrivalCoda);
      }
    }
  }
  if (w.holdingGate && (Math.abs(p.z - GATE_Z) >= 0.73 || Math.abs(p.x - 30) >= 4.7)) {
    w.holdingGate = false;
    w.gateFallAt = w.elapsed;
  }
  if (
    w.gateCrossed &&
    w.wicketAt != null &&
    w.wicketHoldUntil > w.elapsed &&
    Math.abs(p.x - 33.58) < 1 &&
    Math.abs(p.z - GATE_Z) < 0.85
  )
    w.wicketHoldUntil = Math.max(w.wicketHoldUntil, w.elapsed + 1.2);
  if (w.gateClosedAt != null && !w.ropeFallen && p.z > 1370 && Math.abs(p.x - 30) < 78) {
    const beat = Math.floor(((w.elapsed - w.gateClosedAt) * 1.8) / (Math.PI * 2));
    if (beat > 0 && beat !== w.gatePressBeat) {
      w.gatePressBeat = beat;
      // Only hands within reach of the iron can rattle it.
      const atGate = hostWithin(w, { x: 30, z: GATE_Z }, 6, rankPosition)
        .filter(q => !w.hostActors?.[q.i] && q.z < GATE_Z && q.z > GATE_Z - 2.5);
      if (atGate.length) cue(w, 'impact', beat % 3 ? 'wood' : 'iron', atGate[beat % atGate.length]);
    }
  }
  if (
    !w.gateCrossed &&
    w.route !== 'wander' &&
    w.lastBellCastAt == null &&
    w.gateClosedAt != null &&
    w.elapsed - w.gateClosedAt >= arrivalCoda
  ) {
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
    Math.abs(p.pitch || 0) < 0.51 && nearFacing(w, { x: roadX(220) + 7, z: 220 }, 9, 0.64),
    'On the northbound milepost, Xero’s blue ribbon hangs from an open shackle. The little iron tongue knocks against the post.'
  );
  landmarkBeat(
    w,
    'ridge',
    witnessedHost(w),
    'Across the western valley, a dark rank moves, then another. Both are following the road to Castle Xero.',
    'answer'
  );
  landmarkBeat(
    w,
    'sluice',
    Math.hypot(p.x - 30, p.z - 996) < 19,
    'Cut into the stone are three bell mouths. Beneath them: “When the keep calls, answer in kind.”',
    'bell'
  );
  inspectProcession(w);
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
  if (!w.milestones.reveal && !isStolenBottle(w.phialFlight?.kind) && p.z > 1508 && canSeeBanquet(w)) banquet(w, true);
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
    if (w.dialogue || w.ending || w.sequence) break;
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
  if (w.route === 'unbound' && !w.antidote) return 'Follow the pale ink, or take the castle road.';
  if (w.route === 'guided' && !w.bridgeOpen && w.player.z > 870 && w.player.z < 1034)
    return 'Answer the castle’s three notes at the sluice.';
  if (w.route === 'wander') return 'Find your own way through the forest.';
  if (w.route === 'undecided' && w.consideringOffers) return 'Stay by the lantern, or walk on.';
  if (w.route === 'undecided' && !w.greeted && w.actors[0].alive)
    return 'Find the castle where Princess Xero is held.';
  return w.lastBellCastAt == null ? 'Reach Princess Xero before the host reaches the gate.' : 'Reach Princess Xero in the keep.';
}
export function getHUD(w) {
  const a = target(w);
  const labels = {
    herb: 'Gather moonleaf',
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
    hordeProgress: frontStation(raceTime(w), raceDuration(w)) / travelled,
    hasMap: w.hasMap,
    gateCrossed: !!w.gateCrossed,
    secondsLeft: secondsToGate(w),
    bearing: route?.bearing ?? null,
    distance: route?.metres ?? null,
    crossing: route?.crossing || '',
  };
}
