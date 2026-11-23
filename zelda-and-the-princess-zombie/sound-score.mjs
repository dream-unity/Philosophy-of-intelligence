import { course, LANDMARKS } from './geography.mjs';
import { secondsToGate } from './world.mjs';
import { insideHall } from './hall.mjs';
import { isSheltered } from './travel.mjs';

// The three notes of Xero's tower are Ab, D and B. The forest cadences hint at
// those intervals long before the player learns what the tower is calling for.
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const clamp = (n) => Math.max(0, Math.min(1, n));

const themes = {
  forest: [
    [62, 69, 71, 64],
    [57, 64, 67],
    [69, 65, 62],
    [64, 71, 69, 62],
    [55, 62, 66],
    [67, 64, 57],
  ],
  witch: [
    [68, 74, 71],
    [65, 68, 62, 59],
    [59, 65, 62],
  ],
  ridge: [
    [55, 62, 69, 67],
    [62, 74, 71],
    [57, 64, 69],
  ],
  water: [
    [80, 86, 83],
    [76, 71, 74, 68],
    [71, 78, 80],
  ],
  gate: [
    [44, 50, 47],
    [59, 56, 50],
    [50, 56, 59],
  ],
  hall: [
    [68, 74, 71],
    [62, 59, 56],
    [56, 62, 59],
  ],
};
const tone = {
  forest: ['sine', 0.02, 1.5, 0.054, 0.66],
  witch: ['triangle', 0.16, 1.4, 0.04, 0.54],
  ridge: ['triangle', 0.32, 2.25, 0.044, 0.86],
  water: ['sine', 0.008, 1.8, 0.063, 0.55],
  gate: ['triangle', 0.24, 1.85, 0.048, 0.74],
  hall: ['sine', 0.18, 2.35, 0.039, 0.87],
};
const hallToGate = LANDMARKS.find((l) => l.id === 'hall').z - 1435;
export function raceMargin(world, pace = 4.45) {
  // The actual route has a switchback at the ridge and two different river
  // crossings. The gate clock includes the time granted by a late checkpoint.
  const route = course({ ...world, route: 'guided', antidote: true });
  const metres = Math.max(0, route.metres - hallToGate);
  const sluice = world.player.z < 1006 && !world.hasMap && !world.bridgeOpen ? 10 : 0;
  return secondsToGate(world) - metres / pace - sluice;
}
function playPhrase(voice, place, notes, start, pan, pace = 1) {
  const [shape, attack, decay, level, spacing] = tone[place];
  const root = hz(notes[0]);
  if (place === 'forest') {
    // A short answer from the other bank of the stereo field, like a plucked string.
    voice('triangle', root * 0.75, 0.026, start + 0.34 * pace, 0.48, -pan, root * 0.747, 0.012);
  } else if (place === 'water') {
    // A glassy, slightly inharmonic rim. Its reflected pitch arrives after the attack.
    voice('sine', root * 2.71, 0.024, start + 0.025, 0.78, -pan, root * 2.7, 0.009);
    voice('sine', root * 1.5, 0.022, start + 0.29 * pace, 1.4, -pan, root * 1.498, 0.06);
  } else if (place === 'hall' || place === 'gate') {
    const pedal = root * (place === 'hall' ? 0.25 : 0.5);
    voice('triangle', pedal, 0.037, start, 2.7, -pan, pedal, 0.46);
    voice('sine', pedal * 1.5, 0.03, start + 0.13, 2.45, pan, pedal * 1.498, 0.42);
  }
  notes.forEach((midi, i) => {
    const time = start + (i * spacing + (i >= 2 ? 0.22 : 0)) * pace;
    const f = hz(midi);
    voice(shape, f, level, time, decay, pan, f * 0.999, attack);
    voice(
      place === 'water' ? 'sine' : 'triangle',
      f * (place === 'water' ? 2.997 : 2),
      level * 0.21,
      time + 0.008,
      decay * 0.49,
      pan * 0.4,
      f * (place === 'water' ? 2.99 : 2),
      attack
    );
  });
}
export function playEnding(id, time, voice) {
  const cadences = {
    saved: ['water', [68, 74, 71, 76, 80], 0.79],
    feast: ['hall', [68, 74, 71, 58, 46], 0.61],
    bound: ['witch', [68, 74, 71, 68, 65], 0.64],
    horde: ['gate', [56, 62, 59, 47, 35], 0.8],
    wilds: ['forest', [69, 64, 62, 55], 1.03],
  };
  const [place, notes, pace] = cadences[id] || cadences.wilds;
  playPhrase(voice, place, notes, time, 0, pace);
  if (id === 'saved') {
    voice('triangle', hz(52), 0.047, time + 1.8, 2.9, -0.17, hz(52), 0.38);
    voice('sine', hz(59), 0.052, time + 1.88, 2.8, 0.2, hz(59), 0.38);
  }
}
export function createScore() {
  let previousPlayer,
    lastTime = 0,
    nextPhrase = 0,
    nextPulse = 0,
    bar = 0,
    pulse = 0,
    tension = 0,
    previousPlace,
    travelPace = 4.45;
  return function update(world, time, voice) {
    const p = world.player;
    if (previousPlayer !== p || time < lastTime || time - lastTime > 3) {
      previousPlayer = p;
      previousPlace = null;
      bar = pulse = tension = 0;
      travelPace = 4.45;
      nextPhrase = time + 1.4;
      nextPulse = time;
    }
    const dt = clamp(time - lastTime);
    lastTime = time;
    if (world.ending || world.sequence || world.dialogue?.kind === 'banquet') return;
    const nearWell = Math.hypot(p.x + 155, p.z - 850) < 59;
    const place = insideHall(p.x, p.z)
      ? 'hall'
      : p.z > 1230
        ? 'gate'
        : nearWell || Math.abs(p.z - 1021) < 42
          ? 'water'
          : p.z > 425 && p.z < 552
            ? 'ridge'
            : world.greeted && world.actors[0]?.alive && Math.hypot(p.x, p.z - 9) < 28
              ? 'witch'
              : 'forest';
    if (previousPlace && previousPlace !== place) {
      bar = 0;
      nextPhrase = Math.min(nextPhrase, time + 0.65);
    }
    previousPlace = place;
    let danger = 0;
    const shelter = isSheltered(p.x, p.z);
    for (const actor of world.actors) {
      if (shelter || !actor.alive || !actor.alerted) continue;
      const d = Math.hypot(actor.x - p.x, actor.z - p.z);
      danger = Math.max(danger, clamp(1 - d / 55), actor.windupUntil > world.elapsed ? 0.96 : 0);
    }
    // Lead compares the time left with a traversable-road pace. It changes when
    // the hero hesitates or makes up ground, even in the same part of the map.
    if (p.speed > 1)
      travelPace += (Math.min(5.25, Math.max(3.65, p.speed)) - travelPace) * (1 - Math.exp(-dt / 8));
    const lead = raceMargin(world, travelPace);
    const race =
      world.gateCrossed ||
      world.gateClosedAt != null ||
      world.route === 'wander' ||
      world.route === 'undecided'
        ? 0
        : clamp((80 - lead) / 92);
    const target = Math.max(danger, race * 0.87);
    tension += (target - tension) * (1 - Math.exp(-dt / (target > tension ? 0.65 : 3.3)));
    if (tension > 0.16 && time >= nextPulse) {
      const bass = hz(race > danger ? 44 : 38);
      const level = 0.024 + 0.047 * tension;
      voice('sine', bass, level, time, 0.39, 0, bass * 0.94, 0.026);
      // An audible wooden partial carries the rhythm on small mono speakers.
      voice('triangle', bass * 3, 0.54 * level, time, 0.24, 0.13, bass * 2.93);
      voice('sine', bass * 6, 0.91 * level, time + 0.005, 0.31, -0.09, bass * 5.78, 0.013);
      if (pulse++ % 3 === 2) voice('triangle', bass * 1.5, level * 0.53, time + 0.17, 0.35, -0.22);
      nextPulse = time + 1.72 - tension * 1.07;
    }
    if (time < nextPhrase) return;
    if (danger > 0.7) {
      nextPhrase = time + 1.7;
      return;
    }
    const lines = themes[place];
    playPhrase(voice, place, lines[bar % lines.length], time, bar % 2 ? -0.2 : 0.22, 1 - 0.16 * tension);
    nextPhrase =
      time + (place === 'hall' ? 10 : place === 'witch' ? 6.2 : 6.65) + [0, 2.3, 0.8, 3.8][bar++ % 4];
  };
}
