import { isPlayerSheltered, HOURGLASS } from './world.mjs';
import { insideHall } from './hall.mjs';

// Original adaptive score for bowed bass, wood, glass and stone fifths.
// Open bars leave room for birds, the castle bell and environmental cues.
const forestPhrases = [
  [
    [0, 62],
    [0.64, 69],
    [1.64, 71],
  ],
  [
    [0, 65],
    [1.08, 64],
  ],
  [
    [0, 57],
    [0.64, 64],
    [1.9, 67],
  ],
  [
    [0, 62],
    [1.3, 55],
  ],
];

const moonwellPhrases = [
  [
    [0, 74],
    [0.52, 81],
    [1.1, 83],
    [1.8, 78],
  ],
  [
    [0, 76],
    [0.62, 83],
    [1.4, 86],
  ],
];

const witchPhrases = [
  [
    [0, 62],
    [0.7, 68],
    [1.5, 67],
  ],
  [
    [0, 60],
    [0.85, 66],
    [1.7, 62],
  ],
];

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const clamp = (n) => Math.max(0, Math.min(1, n));

function pluck(voice, midi, time, pan, level, glassy = false) {
  const f = hz(midi);
  voice('sine', f, level, time, glassy ? 1.85 : 1.25, pan, f * 0.9985, 0.012);
  voice('triangle', f * 2, level * (glassy ? 0.28 : 0.17), time, glassy ? 0.55 : 0.22, pan, f * 2, 0.007);
  if (glassy) {
    voice('sine', f * 3, level * 0.1, time + 0.03, 0.4, -pan * 0.5, f * 3, 0.01);
  }
}

export function createScore() {
  let movement = 0,
    phrase = 0,
    nextPhrase = Infinity,
    nextPulse = 0;
  let playerSeen,
    lastTime,
    tension = 0;

  return function updateScore(world, time, voice) {
    const p = world?.player;
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.z) || !Number.isFinite(time)) return;
    if (p !== playerSeen || time < lastTime || time - lastTime > 3) {
      movement = 0;
      phrase = 0;
      nextPhrase = time + 3.4;
      nextPulse = time;
      tension = 0;
      playerSeen = p;
    }
    const dt = Math.min(1, Math.max(0, time - (lastTime ?? time)));
    lastTime = time;
    if (world.ending) return;

    const sheltered = isPlayerSheltered(world);
    const inHall = insideHall(p.x, p.z);
    const nearWell = Math.hypot(p.x + 155, p.z - 850) < 55;
    const witch = world.actors?.find((a) => a.type === 'witch' && a.alive);
    const nearWitch = Boolean(witch && Math.hypot(p.x - witch.x, p.z - witch.z) < 22);

    const approach = clamp((p.z - 1060) / 420);
    const urgency =
      world.gateCrossed || world.route === 'wander'
        ? 0
        : clamp(((world.elapsed || 0) / HOURGLASS - 0.52) / 0.45);

    // Gate combat danger strictly on actual threat (never pulse inside sanctuary #89).
    let danger = 0;
    if (!sheltered) {
      for (const actor of world.actors || []) {
        if (!actor.alive || (actor.type !== 'wolf' && actor.type !== 'troll' && actor.type !== 'dragon'))
          continue;
        const reach = actor.type === 'dragon' ? 54 : actor.type === 'troll' ? 34 : 42;
        const range = Math.hypot(actor.x - p.x, actor.z - p.z);
        if (range < reach || (actor.huntingUntil || 0) > world.elapsed) {
          danger = Math.max(danger, clamp(1 - range / reach));
        }
      }
    }

    const target = Math.max(danger, approach * 0.55, urgency * 0.65);
    tension += (target - tension) * (1 - Math.exp(-dt / (target > tension ? 0.85 : 3.6)));

    // Bass pulse with tablet-audible upper harmonics (#100).
    if ((tension >= 0.22 || inHall) && time >= nextPulse) {
      const f = hz(inHall ? 33 : approach > 0.55 ? 36 : 38);
      const level = 0.02 + 0.045 * Math.max(tension, inHall ? 0.3 : 0);
      voice('sine', f, level, time, 0.65, 0, f * 0.9, 0.035);
      // Warm 2nd & 3rd harmonics ensure tablet/phone speakers hear the pulse clearly
      voice('triangle', f * 2, level * 0.34, time, 0.42, 0, f * 1.94, 0.025);
      voice('sine', f * 3, level * 0.12, time + 0.02, 0.28, 0, f * 2.95, 0.02);
      if (movement++ % 3 === 2 && !inHall) {
        voice('triangle', f * 1.49, level * 0.36, time + 0.24, 0.72, 0.18, f * 1.43, 0.14);
      }
      nextPulse = time + Math.max(0.75, 2.8 - Math.max(tension, urgency) * 1.95);
    }

    if (time < nextPhrase) return;
    if (inHall) {
      // Hollow solemn fifths inside the Long Hall
      const lower = hz(phrase % 2 ? 41 : 38);
      voice('triangle', lower, 0.024, time, 2.4, -0.18, lower * 0.996, 0.45);
      voice('sine', lower * 1.5, 0.02, time + 0.35, 2.6, 0.18, lower * 1.495, 0.55);
      nextPhrase = time + 7.2;
    } else if (nearWell) {
      const notes = moonwellPhrases[phrase % moonwellPhrases.length];
      for (const [offset, midi] of notes) {
        pluck(voice, midi, time + offset, phrase % 2 ? -0.3 : 0.3, 0.036, true);
      }
      nextPhrase = time + 6.4;
    } else if (nearWitch) {
      const notes = witchPhrases[phrase % witchPhrases.length];
      for (const [offset, midi] of notes) {
        pluck(voice, midi, time + offset, phrase % 2 ? 0.22 : -0.22, 0.032, true);
      }
      nextPhrase = time + 7.6;
    } else if (tension > 0.35) {
      if (danger < 0.5) {
        const lower = hz(phrase % 2 ? 43 : 38);
        voice('triangle', lower, 0.026, time, 1.9, -0.14, lower, 0.47);
        voice('sine', lower * 1.501, 0.021, time + 0.3, 2.1, 0.14, lower * 1.496, 0.62);
      }
      nextPhrase = time + 6.2;
    } else {
      const opening = forestPhrases[phrase % forestPhrases.length];
      for (const [offset, midi] of opening) {
        pluck(voice, midi, time + offset, phrase % 2 ? -0.22 : 0.25, 0.042, false);
      }
      nextPhrase = time + (phrase % 2 ? 9.1 : 6.7);
    }
    phrase++;
  };
}
