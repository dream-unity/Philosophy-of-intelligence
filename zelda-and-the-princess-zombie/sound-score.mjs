import { course, LANDMARKS } from './geography.mjs';
import { secondsToGate } from './world.mjs';
import { insideHall } from './hall.mjs';
import { isSheltered } from './travel.mjs';

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const clamp = (n) => Math.max(0, Math.min(1, n));
const hallToGate = LANDMARKS.find((l) => l.id === 'hall').z - 1435;
export function raceMargin(world, pace = 4.45) {
  const route = course({ ...world, route: 'guided', antidote: true });
  const metres = Math.max(0, route.metres - hallToGate);
  const sluice = world.player.z < 1006 && !world.hasMap && !world.bridgeOpen ? 10 : 0;
  return secondsToGate(world) - metres / pace - sluice;
}

// The flute reaches D–A–B above a descending inner voice. B natural is the
// light in D minor. The witch answers with A flat, taken from Xero's bell.
// Each bar has an independently voiced bass and three upper chord tones.
// Melody entries are onset in beats, MIDI pitch, sounding length in beats.
const bar = (notes, ...melody) => ({ notes, melody });
const forest = [
  bar([50, 57, 64, 65], [0.52, 62, 0.84], [1.49, 69, 1.03], [2.79, 71, 1.14]),
  bar([47, 55, 62, 64], [0.11, 69, 1.36], [1.82, 67, 0.5], [2.46, 64, 1.34]),
  bar([48, 55, 62, 64], [0.8, 67, 0.57], [1.51, 72, 1.48], [3.28, 74, 0.82]),
  bar([45, 55, 59, 64], [0.15, 71, 2.08], [2.84, 69, 0.77]),
  bar([50, 57, 64, 65], [0.14, 65, 0.81], [1.22, 69, 0.52], [1.98, 76, 1.8]),
  bar([43, 55, 59, 62], [0.19, 74, 1.33], [1.86, 71, 0.62], [2.68, 69, 1.27]),
  bar([41, 53, 60, 64], [0.44, 67, 1.03], [1.72, 65, 0.54], [2.49, 64, 1.22]),
  bar([50, 57, 62, 65], [0.23, 62, 2.55]),
  // An answering strain starts below the first and climbs past it. Breath
  // at the end of each line lets the other player in the duet answer.
  bar([46, 53, 60, 65], [0.36, 62, 1.12], [1.8, 65, 0.64], [2.64, 69, 1.25]),
  bar([48, 55, 62, 64], [0.18, 67, 1.4], [2.26, 64, 0.55], [3.02, 67, 0.89]),
  bar([50, 57, 60, 65], [0.25, 69, 0.68], [1.12, 72, 0.55], [1.98, 77, 1.81]),
  bar([47, 55, 62, 67], [0.17, 76, 1.16], [1.62, 74, 1.89]),
  bar([43, 55, 62, 64], [0.52, 71, 0.85], [1.57, 74, 1.72]),
  bar([45, 55, 60, 64], [0.18, 72, 1.41], [1.98, 69, 1.5]),
  bar([41, 53, 60, 64], [0.73, 65, 0.91], [1.9, 64, 1.69]),
  bar([50, 57, 64, 65], [0.22, 62, 2.64]),
];
const witch = [
  bar([50, 56, 59, 65], [0.72, 62, 0.79], [1.93, 68, 1.39]),
  bar([47, 54, 62, 65], [0.72, 69, 0.85], [2.04, 65, 1.42]),
  bar([46, 53, 62, 64], [0.26, 64, 1.51], [2.33, 62, 1.18]),
  bar([45, 56, 62, 64]),
];
const ridge = [
  bar([43, 55, 59, 62], [0.16, 62, 0.98], [1.49, 69, 1.14], [2.92, 71, 1.13]),
  bar([50, 57, 62, 66], [0.12, 74, 2.08], [2.82, 69, 1.17]),
  bar([47, 54, 62, 66], [0.26, 71, 0.82], [1.42, 74, 0.85], [2.5, 76, 1.42]),
  bar([48, 55, 62, 64], [0.19, 72, 2.11]),
  bar([43, 55, 59, 62], [0.35, 71, 0.76], [1.41, 67, 0.79], [2.4, 69, 1.48]),
  bar([50, 57, 64, 65], [0.19, 65, 1.36], [2.04, 62, 1.82]),
];
const hollow = [
  bar([50, 57, 62, 65], [0.65, 69, 1.17], [2.62, 65, 1.06]),
  bar([46, 53, 60, 64], [0.4, 64, 1.45], [2.39, 62, 1.22]),
  bar([43, 53, 58, 62], [1.29, 65, 0.68], [2.38, 69, 1.27]),
  bar([45, 52, 58, 62]),
];
const water = [
  bar([43, 55, 62, 64], [0.85, 71, 0.87], [2.24, 76, 1.42]),
  bar([50, 57, 62, 66], [0.55, 74, 1.83], [3.0, 69, 0.81]),
  bar([47, 54, 62, 66], [0.66, 71, 0.61], [1.58, 74, 0.67], [2.53, 78, 1.34]),
  bar([48, 55, 62, 67], [0.31, 76, 1.7], [2.7, 72, 0.87]),
  bar([43, 55, 59, 62], [0.72, 71, 1.21], [2.55, 67, 1.3]),
  bar([50, 57, 64, 66]),
];
const gate = [
  bar([38, 50, 57, 64], [0.5, 62, 1.11], [2.05, 69, 1.51]),
  bar([44, 56, 59, 62], [0.31, 68, 1.75], [2.81, 65, 0.89]),
  bar([43, 53, 58, 62], [0.46, 67, 0.79], [1.71, 69, 0.72], [2.72, 70, 1.16]),
  bar([45, 52, 58, 64], [0.29, 64, 2.06]),
  bar([46, 53, 60, 65], [0.53, 65, 1.11], [2.16, 69, 1.55]),
  bar([38, 50, 56, 62]),
];
const hall = [
  bar([50, 56, 62, 65], [1.08, 69, 1.52]),
  bar([47, 54, 59, 65]),
  bar([46, 53, 58, 64], [0.71, 68, 1.78]),
  bar([45, 52, 59, 62]),
];
// The sluice shares the water's chords. The scored melody and plucked attacks
// drop away here so only real bells articulate a sequence.
const sluice = water.map(({ notes }) => bar(notes));

const ensemble = {
  // Pulse is in seconds per beat. Gain is relative to the player's music mix.
  forest: { bars: forest, beat: 0.77, lead: 'flute', bass: 'cello', inner: 'viola', level: 0.060, pluck: 0.035 },
  witch:  { bars: witch, beat: 0.88, lead: 'viola', bass: 'cello', inner: 'choir', level: 0.046, pluck: 0.023 },
  ridge:  { bars: ridge, beat: 0.78, lead: 'horn', bass: 'cello', inner: 'viola', level: 0.061, pluck: 0.026 },
  hollow: { bars: hollow, beat: 0.91, lead: 'viola', bass: 'cello', inner: 'flute', level: 0.044, pluck: 0.019 },
  water:  { bars: water, beat: 0.81, lead: 'flute', bass: 'viola', inner: 'choir', level: 0.050, pluck: 0.031 },
  sluice: { bars: sluice, beat: 0.86, lead: 'flute', bass: 'cello', inner: 'viola', level: 0, pluck: 0 },
  gate:   { bars: gate, beat: 0.86, lead: 'horn', bass: 'cello', inner: 'choir', level: 0.050, pluck: 0.016 },
  hall:   { bars: hall, beat: 1.01, lead: 'viola', bass: 'cello', inner: 'choir', level: 0.032, pluck: 0 },
};
const brokenChords = [
  [[0.03, 1], [0.82, 2], [2.07, 3], [3.55, 2]],
  [[0.58, 1], [1.53, 3], [2.75, 2]],
  [[0.03, 1], [1.06, 2], [1.8, 3], [3.29, 1]],
  [[0.54, 2], [2.17, 1]],
];
function arrange(place, index, start, tension) {
  const part = ensemble[place];
  const n = index % part.bars.length;
  const { notes, melody } = part.bars[n];
  // Phrase endings stretch; the breath travels with the musicians' clock.
  const beat = part.beat * (n % 4 === 3 ? 1.07 : 1) * (1 - 0.045 * tension);
  const events = [];
  function write(onset, instrument, pitch, length, gain, pan) {
    events.push({ at: start + onset * beat, instrument, pitch, length: length * beat, gain, pan });
  }
  const listening = place === 'sluice' || place === 'hall';
  if (!listening || n % 2 === 0)
    write(0, part.bass, notes[0], listening ? 2.7 : 3.95, listening ? 0.013 : 0.032, -0.12);
  if (place !== 'sluice' && (!listening || n % 2 === 1))
    write(0.27, part.inner, notes[3], listening ? 2.28 : 3.56, listening ? 0.013 : 0.020, 0.29);
  if (part.pluck) {
    const pattern = brokenChords[(index + Math.floor(index / part.bars.length)) % 4];
    for (const [i, [onset, tone]] of pattern.entries())
      write(onset, 'harp', notes[tone] + (place === 'water' ? 12 : 0), 1.34, part.pluck * (i ? 0.76 : 1), -0.32);
  }
  const answer = place === 'forest' && n >= 8 && n < 12;
  for (const [i, [onset, pitch, length]] of melody.entries()) {
    const strong = length > 1.4 ? 1.06 : i === 0 ? 0.94 : 1;
    write(onset, answer ? 'viola' : part.lead, pitch, length, part.level * strong, 0.08);
  }
  // Last two beats of a cadence belong to a different player. It answers
  // the tune only after the long lead note has had time to open.
  if (!listening && n % 4 === 3)
    write(2.74, place === 'gate' || place === 'witch' ? 'cello' : 'flute',
      notes[2] + (place === 'water' ? 12 : 0), 1.04, 0.026, -0.16);
  events.sort((a, b) => a.at - b.at);
  return { events, next: start + 4 * beat };
}

const endings = {
  // A single F sharp in the viola turns the opening minor harmony major.
  saved: [
    ['cello', 50, 0, 4.58, 0.038, -0.15], ['harp', 57, 0.08, 1.4, 0.046, -0.30],
    ['flute', 62, 0.22, 0.69, 0.064, 0.08], ['harp', 64, 0.74, 1.6, 0.035, -0.30],
    ['flute', 69, 1.03, 0.89, 0.061, 0.08], ['viola', 66, 1.15, 3.34, 0.037, 0.25],
    ['flute', 71, 2.05, 0.85, 0.061, 0.08], ['harp', 69, 2.34, 1.64, 0.038, -0.30],
    ['flute', 74, 3.08, 2.95, 0.063, 0.08], ['choir', 57, 3.19, 2.82, 0.028, -0.1],
    ['viola', 66, 4.65, 1.48, 0.027, 0.25],
  ],
  feast: [
    ['cello', 44, 0, 3.9, 0.043, -0.12], ['viola', 69, 0.08, 0.72, 0.062, 0.08],
    ['viola', 68, 0.91, 1.72, 0.059, 0.08], ['choir', 62, 1.04, 3.18, 0.038, 0.22],
    ['horn', 47, 2.82, 2.04, 0.042, 0.03],
  ],
  bound: [
    ['harp', 62, 0, 1.33, 0.059, -0.26], ['viola', 68, 0.53, 1.03, 0.060, 0.06],
    ['harp', 62, 1.61, 1.33, 0.049, -0.14], ['viola', 68, 2.14, 1.03, 0.055, 0.02],
    ['choir', 59, 2.14, 2.85, 0.04, 0.12], ['harp', 62, 3.22, 1.83, 0.041, 0],
  ],
  horde: [
    ['horn', 62, 0, 1.06, 0.059, -0.09], ['cello', 44, 0.18, 2.29, 0.037, -0.17],
    ['horn', 56, 1.39, 0.93, 0.055, -0.09], ['choir', 65, 1.6, 2.51, 0.037, 0.19],
    ['horn', 59, 2.64, 2.18, 0.056, -0.09], ['cello', 35, 2.71, 2.42, 0.039, -0.17],
  ],
  wilds: [
    ['harp', 57, 0, 1.59, 0.054, -0.28], ['flute', 69, 0.3, 1.04, 0.062, 0.08],
    ['cello', 50, 0.81, 2.89, 0.036, -0.13], ['flute', 65, 1.68, 0.91, 0.057, 0.08],
    ['flute', 64, 2.86, 1.94, 0.047, 0.08],
  ],
  taken: [
    ['cello', 38, 0, 1.84, 0.044, -0.13], ['viola', 62, 0.18, 0.57, 0.048, 0.11],
    ['viola', 61, 0.92, 0.83, 0.042, 0.09], ['choir', 56, 1.72, 2.32, 0.032, -0.11],
  ],
};
export function playEnding(id, time, voice) {
  for (const [instrument, pitch, offset, duration, gain, pan] of endings[id] || endings.wilds)
    voice(instrument, hz(pitch), gain, time + offset, duration, pan);
}

function region(world) {
  const { x, z } = world.player;
  if (insideHall(x, z)) return 'hall';
  if (z > 1220) return 'gate';
  if (Math.hypot(x - 30, z - 996) < 46 && !world.bridgeOpen) return 'sluice';
  if (Math.hypot(x + 155, z - 850) < 60 || Math.abs(z - 1021) < 45) return 'water';
  if (z > 550 && z < 780) return 'hollow';
  if (z > 405 && z < 550) return 'ridge';
  const witch = world.actors[0];
  if (world.greeted && witch?.type === 'witch' && witch.alive && Math.hypot(x - witch.x, z - witch.z) < 28)
    return 'witch';
  return 'forest';
}
export function createScore() {
  let player, place;
  let lastTime = 0, nextBar = 0, index = 0, events = [], cursor = 0;
  let nextPulse = 0, pulse = 0, tension = 0;
  let travelPace = 4.45, nextEstimate = 0, race = 0;
  return function update(world, time, voice, listeningOnly = false) {
    const p = world.player;
    const newJourney = player !== p || time < lastTime;
    const dt = clamp(time - lastTime);
    if (newJourney || time - lastTime > 1.1) {
      // A sleeping tab never catches up by firing missed notes together.
      events = [];
      cursor = 0;
      nextBar = time + 0.24;
      nextPulse = nextEstimate = time;
      if (newJourney) {
        player = p;
        place = undefined;
        index = pulse = tension = race = 0;
        travelPace = 4.45;
      }
    }
    lastTime = time;
    if (world.ending || world.sequence || world.dialogue?.kind === 'banquet') {
      events = [];
      nextBar = time + 0.28;
      return;
    }
    const where = region(world);
    const shelter = isSheltered(p.x, p.z);
    let danger = 0;
    if (!listeningOnly && !shelter) {
      for (const actor of world.actors) {
        if (!actor.alive || !actor.alerted) continue;
        const d = Math.hypot(actor.x - p.x, actor.z - p.z);
        danger = Math.max(danger, clamp(1 - d / 55), actor.windupUntil > world.elapsed ? 0.96 : 0);
      }
    }
    if (!listeningOnly && !world.ropeFallen && world.hostActors) {
      for (const a of Object.values(world.hostActors)) {
        if (a.state !== 'windup' && a.state !== 'pursue') continue;
        const d = Math.hypot(a.x - p.x, a.z - p.z);
        danger = Math.max(danger, a.state === 'windup' ? 0.98 : clamp(1 - d / 21));
      }
    }
    if (p.speed > 1)
      travelPace += (Math.min(5.25, Math.max(3.65, p.speed)) - travelPace) * (1 - Math.exp(-dt / 8));
    if (listeningOnly || world.lastBellCastAt != null || world.gateCrossed || world.gateClosedAt != null || world.route === 'wander' || world.route === 'undecided')
      race = 0;
    else if (time >= nextEstimate) {
      race = clamp((80 - raceMargin(world, travelPace)) / 92);
      nextEstimate = time + 1;
    }
    const target = Math.max(danger, race * 0.87);
    tension += (target - tension) * (1 - Math.exp(-dt / (target > tension ? 0.65 : 3.3)));
    if (!listeningOnly && tension > 0.18 && time >= nextPulse && where !== 'sluice' && where !== 'hall') {
      const bass = hz(race > danger ? 45 : 38);
      const level = 0.020 + 0.041 * tension;
      voice('sine', bass, level, time, 0.39, 0, bass * 0.97, 0.026);
      // An upper wooden overtone keeps each stroke audible on tablet speakers.
      voice('sine', bass * 6, level * 0.87, time + 0.008, 0.27, -0.09, bass * 5.86, 0.013);
      if (pulse++ % 3 === 1) voice('harp', bass * 3, level * 0.37, time + 0.26, 0.43, 0.15);
      nextPulse = time + 1.64 - tension * 0.75;
    }
    // Entering the sluice or the meal clears unsounded notes immediately.
    // Elsewhere the next downbeat takes the new colour, even on a boundary.
    if (place && where !== place && (where === 'sluice' || where === 'hall')) {
      events = [];
      nextBar = Math.min(nextBar, time + 0.18);
    }
    const horizon = time + 0.34;
    function soundNextEvents() {
      while (cursor < events.length && events[cursor].at <= horizon) {
        const e = events[cursor++];
        if (e.at < time - 0.08 || danger > 0.70) continue;
        const intensity = (1 - 0.42 * tension) * (listeningOnly ? 0.74 : 1) * (where === 'hall' && p.z > 1497 ? 0.52 : 1);
        voice(e.instrument, hz(e.pitch), e.gain * intensity, Math.max(time, e.at), e.length, e.pan);
      }
    }
    soundNextEvents();
    if (nextBar <= horizon) {
      if (where !== place) {
        place = where;
        index = 0;
      }
      const written = arrange(place, index++, Math.max(time, nextBar), tension);
      events = written.events;
      cursor = 0;
      nextBar = written.next;
      soundNextEvents();
    }
  };
}
