// A small original score for bowed bass, wood and glass. Leave open bars
// between the forest phrases so birds and the tower can take the foreground.
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
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const clamp = (n) => Math.max(0, Math.min(1, n));

function pluck(voice, midi, time, pan, level) {
  const f = hz(midi);
  voice('sine', f, level, time, 1.25, pan, f * 0.9985, 0.012);
  voice('triangle', f * 2, level * 0.17, time, 0.22, pan, f * 2, 0.007);
}

// The simulation owns the environment and creatures. A separate score instance
// only retains the music's tempo and the last phrase heard on this playthrough.
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
      nextPhrase = time + 3.6;
      nextPulse = time;
      tension = 0;
      playerSeen = p;
    }
    const dt = Math.min(1, Math.max(0, time - (lastTime ?? time)));
    lastTime = time;
    if (world.ending) return;

    const approach = clamp((p.z - 1040) / 455);
    let danger = 0;
    for (const actor of world.actors) {
      if (!actor.alive || (actor.type !== 'wolf' && actor.type !== 'troll' && actor.type !== 'dragon'))
        continue;
      const reach = actor.type === 'dragon' ? 51 : actor.type === 'troll' ? 34 : 42;
      const range = Math.hypot(actor.x - p.x, actor.z - p.z);
      danger = Math.max(danger, clamp(1 - range / reach));
    }
    const target = Math.max(danger, approach * 0.6);
    // Resolve back into the woods gradually after a pursuit.
    tension += (target - tension) * (1 - Math.exp(-dt / (target > tension ? 0.85 : 4)));
    if (tension >= 0.17 && time >= nextPulse) {
      const f = hz(approach > 0.55 ? 36 : 38);
      const level = 0.023 + 0.05 * tension;
      voice('sine', f, level, time, 0.63, 0, f * 0.89, 0.035);
      if (movement++ % 3 === 2) {
        voice('triangle', f * 1.49, level * 0.42, time + 0.24, 0.76, 0.18, f * 1.43, 0.15);
      }
      nextPulse = time + 2.9 - tension * 2.1;
    }
    if (time < nextPhrase) return;
    if (tension > 0.31) {
      // Long spaced fifths replace the field melody as the walls draw near.
      if (danger < 0.5) {
        const lower = hz(phrase % 2 ? 43 : 38);
        voice('triangle', lower, 0.026, time, 1.9, -0.14, lower, 0.47);
        voice('sine', lower * 1.501, 0.021, time + 0.3, 2.1, 0.14, lower * 1.496, 0.62);
      }
      nextPhrase = time + 6.5;
    } else {
      const opening = forestPhrases[phrase % forestPhrases.length];
      for (const [offset, midi] of opening)
        pluck(voice, midi, time + offset, phrase % 2 ? -0.22 : 0.25, 0.042);
      nextPhrase = time + (phrase % 2 ? 9.25 : 6.75);
    }
    phrase++;
  };
}
