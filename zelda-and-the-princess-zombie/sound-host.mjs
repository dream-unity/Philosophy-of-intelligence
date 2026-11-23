import { castleGuests, roadFileIds, guestAtTable } from './procession.mjs';
import { hordePosition, HORDE_COUNT } from './world.mjs';

// A dragged heel and the next, lighter foot distinguish the rank's gait from
// Zelda's boots. No rhythmic bells here: the tower and the sluice own that sound.
function shuffle(sound, time, pan, level, variant, stone, hurry) {
  const grain = stone ? 1280 : 740;
  sound.noise(level * 0.49, grain + variant * 41, hurry ? 0.14 : 0.31, time, pan, 0.033);
  sound.note('sine', 81 + variant * 3, level * 0.11, time + 0.04, 0.14, pan, 53, 0.012);
  const plant = time + (hurry ? 0.18 : 0.33) + variant * 0.009;
  sound.noise(level * 0.29, grain * 1.33, 0.12, plant, pan, 0.009);
}

export function hostFoley(sound, action, time, pan, level, member = 0) {
  const v = Math.abs(member * 13 + 3) % 7;
  const pitch = 131 + v * 9;
  switch (action) {
    case 'notice':
      // A single stranger interrupts the footfalls to draw breath.
      sound.noise(level * 0.40, 960 + 41 * v, 0.32, time, pan, 0.082);
      sound.note('triangle', pitch, level * 0.085, time + 0.15, 0.38, pan, pitch * 1.22, 0.073);
      break;
    case 'windup':
      // Audible before the arm falls. A squeezed vowel rises into a dry gasp.
      sound.noise(level * 0.52, 1180 + v * 43, 0.35, time, pan, 0.043);
      sound.note('triangle', pitch, level * 0.105, time + 0.035, 0.55, pan, pitch * 1.29, 0.065);
      sound.note('triangle', pitch * 3.12, level * 0.105, time + 0.09, 0.4, pan, pitch * 3.53, 0.047);
      sound.noise(level * 0.40, 1840 + v * 31, 0.18, time + 0.35, pan, 0.014);
      break;
    case 'miss':
      sound.noise(level * 0.36, 1590, 0.15, time, pan, 0.022);
      sound.noise(level * 0.24, 650, 0.10, time + 0.13, pan, 0.006);
      break;
    case 'block':
      sound.noise(level * 0.49, 1520, 0.15, time, pan, 0.007);
      sound.note('triangle', 839, level * 0.085, time + 0.018, 0.18, pan, 605);
      break;
    case 'struck':
    case 'down':
      sound.noise(level * 0.43, action === 'down' ? 460 : 780, 0.22, time, pan, 0.009);
      sound.note('triangle', pitch * 1.6, level * 0.12, time, 0.27, pan, pitch * 0.62, 0.014);
      if (action === 'down') sound.noise(level * 0.29, 1090, 0.31, time + 0.19, pan, 0.015);
      break;
    case 'feed':
      sound.noise(level * 0.31, 545 + v * 22, 0.39, time, pan, 0.10);
      sound.noise(level * 0.30, 1010, 0.13, time + 0.29, pan, 0.012);
      if (v < 3) sound.note('triangle', 296 + 12 * v, level * 0.052, time + 0.42, 0.13, pan, 205);
      break;
    case 'queue':
      sound.noise(level * 0.30, 650 + 22 * v, 0.47, time, pan, 0.12);
      sound.note('triangle', pitch * 0.83, level * 0.054, time + 0.18, 0.44, pan, pitch * 0.72, 0.095);
      break;
  }
}

export function createHostSoundscape() {
  let next = 0, nextMeal = 0, turn = 0, traveller;
  return function update(world, time, sound, acoustic) {
    if (traveller !== world.player) {
      traveller = world.player;
      next = nextMeal = time;
      turn = 0;
    }
    if (world.lastBellCastAt != null || time < next) return;
    next = time + 0.72;
    const p = world.player;
    let closest, closestD = 190, pursuer, pursuerD = 28, bank, bankD = 120, nearRanks = 0;
    let diner, dinerD = 32;
    function sample(i, mass = false) {
      if (world.hostFallen?.[i]) return;
      const active = world.hostActors?.[i];
      const q = hordePosition(world, i);
      if (active?.state === 'fallen' || !q) return;
      const d = Math.hypot(p.x - q.x, p.z - q.z);
      if (!active && d < 42 && guestAtTable(world, i)) {
        if (d < dinerD) {
          diner = { i, q };
          dinerD = d;
        }
        return;
      }
      if (mass && !active && d < 120) {
        nearRanks++;
        if (d < bankD) {
          bank = q;
          bankD = d;
        }
      }
      if (!world.ropeFallen && active?.state === 'pursue' && d < pursuerD) {
        pursuer = { i, q };
        pursuerD = d;
      } else if ((!active || active.state === 'return') && d < closestD) {
        closest = { i, q };
        closestD = d;
      }
    }
    // Each sample contains real walkers from the front, centre and tail. The
    // forest detachments and guests inside the walls remain audible separately.
    for (let row = 0; row < HORDE_COUNT / 48; row += 4)
      sample(row * 48 + ((row * 5 + turn * 7) % 48), true);
    for (const i of roadFileIds) sample(i);
    if (p.z > 1220) for (const i of castleGuests(world)) sample(i);
    for (const a of Object.values(world.hostActors || {})) sample(a.i);
    // The guest at the table can still be heard beneath a nearer person's
    // passing footsteps. At most one diner and one passer-by sound at once.
    if (diner && time >= nextMeal && !pursuer) {
      const at = acoustic(diner.q, 13);
      hostFoley(sound, 'feed', time, at.pan, 0.48 * at.gain, diner.i + turn);
      nextMeal = time + 1.12 + ((turn + diner.i) % 7) * 0.14;
    }
    const speaker = pursuer || closest;
    if (!speaker) {
      turn++;
      return;
    }
    const { i, q } = speaker;
    const v = (i + turn++) % 7;
    const at = acoustic(q, pursuer ? 10 : 19);
    const gain = at.gain * (pursuer ? 0.78 : 0.48);
    if (!pursuer && !world.ropeFallen && (world.hostPauseUntil > world.elapsed || world.hostListeningUntil > world.elapsed))
      return;
    if (pursuer) {
      shuffle(sound, time, at.pan, gain, v, q.z > 1433, true);
      next = time + 0.71 + 0.035 * v;
    } else if (!world.ropeFallen && world.gateClosedAt != null && q.z > 1422 && q.z < 1435 && at.d < 42) {
      hostFoley(sound, 'queue', time, at.pan, gain, i);
      next = time + 1.41 + v * 0.11;
    } else if (at.d < 42) {
      shuffle(sound, time, at.pan, gain, v, q.z > 1433, false);
      next = time + 0.77 + v * 0.09;
    }
    if (nearRanks > 1 && turn % 3 === 1 && !world.ropeFallen) {
      // A lateral wash of soles at a distance; individual steps emerge on approach.
      const fullness = Math.min(1, nearRanks / 7);
      const back = acoustic(bank, 58);
      sound.noise(0.24 * fullness * back.gain, 382 + 35 * v, 1.03, time + 0.08, back.pan, 0.24);
    }
  };
}
