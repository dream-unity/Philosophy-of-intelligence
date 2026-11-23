import { distance } from './geography.mjs';
import { insideHall } from './hall.mjs';
import { barrier, clearSegment } from './travel.mjs';
import { moveBody, cue } from './swordplay.mjs';
import { hostWithin } from './host-query.mjs';
import { castleGuests, guestAtTable } from './procession.mjs';

const vicinity = new WeakMap();
const sluiceBell = { x: 19, z: 996 };
const maxHunters = 3;
const turnTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const sq = (a, b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;

export function detachedPosition(w, i) {
  const a = w.hostActors?.[i];
  if (!a) return null;
  if (w.ropeFallen && a.state !== 'fallen') {
    const away = Math.max(0, w.elapsed - (w.dispersalAt ?? w.elapsed)) * 2.2;
    return { x: a.x + Math.cos(i * 2.39996) * away, z: a.z - Math.abs(Math.sin(i * 2.39996)) * away };
  }
  return { x: a.x, z: a.z };
}

// Rebuild an identity shortlist at walking intervals. Body collision and sword
// contacts always sample those identities at their current tick positions.
export function nearbyHost(w, rankAt) {
  if (w.ropeFallen) return [];
  const p = w.player;
  let cache = vicinity.get(w);
  if (
    !cache ||
    cache.player !== p ||
    w.elapsed < cache.at ||
    w.elapsed - cache.at > 0.29 ||
    sq(cache, p) > 4.5
  ) {
    const people = hostWithin(w, p, 26, rankAt);
    people.sort((a, b) => sq(a, p) - sq(b, p) || a.i - b.i);
    const ids = people.filter((q, index) => index < 12 || sq(q, p) <= 7 ** 2).map((q) => q.i);
    const lure = w.fieldMedicine?.lure;
    if (lure?.until > w.elapsed && sq(lure, p) < 60 ** 2) {
      const listeners = hostWithin(w, lure, 26, rankAt).sort((a, b) => sq(a, lure) - sq(b, lure));
      for (const q of listeners.slice(0, 4)) if (!ids.includes(q.i)) ids.push(q.i);
    }
    cache = { player: p, x: p.x, z: p.z, at: w.elapsed, ids };
    vicinity.set(w, cache);
  }
  const living = [];
  for (const i of cache.ids) {
    if (w.hostFallen?.[i]) continue;
    const q = w.hostActors?.[i] || rankAt(w, i);
    living.push({ ...q, i });
  }
  return living;
}

// A boot driven obliquely into a stationary shoulder slides along its tangent.
// Preserve the solid body; a held forward input should not glue both axes to it.
export function slidePastHost(w, people, dx, dz, blocked) {
  const p = w.player,
    step = Math.hypot(dx, dz);
  let nearest,
    d2 = 0.72 ** 2;
  for (const q of people) {
    const d = sq(p, q);
    if (d < d2 && dx * (q.x - p.x) + dz * (q.z - p.z) > 0) {
      nearest = q;
      d2 = d;
    }
  }
  if (!nearest || d2 < 0.001) return;
  const r = Math.sqrt(d2),
    tx = (nearest.z - p.z) / r,
    tz = (p.x - nearest.x) / r;
  const along = dx * tx + dz * tz;
  const side = Math.abs(along) > step * 0.05 ? Math.sign(along) : nearest.i % 2 ? 1 : -1;
  moveBody(w, p, side * tx * step * 0.68, side * tz * step * 0.68, blocked);
}

function phase(w, a, state, seconds = 0) {
  a.state = state;
  a.since = w.elapsed;
  a.until = w.elapsed + seconds;
  if (w.hostWarning?.i === a.i && state !== 'windup') delete w.hostWarning;
}
function detach(w, q) {
  w.hostActors ??= {};
  if (!w.hostActors[q.i]) w.hostRosterEpoch = (w.hostRosterEpoch || 0) + 1;
  return (w.hostActors[q.i] ??= {
    i: q.i,
    type: 'host',
    x: q.x,
    z: q.z,
    heading: turnTo(q, w.player),
    hp: w.hostWounds?.[q.i] ?? (q.i % 7 === 0 ? 3 : 2),
    state: 'pursue',
    since: w.elapsed,
    until: w.elapsed,
    seenAt: w.elapsed,
    seenX: w.player.x,
    seenZ: w.player.z,
  });
}
export function damageHost(w, q, points, source = 'sword', contact = q) {
  if (w.ropeFallen || w.hostFallen?.[q.i] || !(points > 0)) return false;
  const a = detach(w, q);
  a.hp = Math.max(0, a.hp - points);
  if (source !== 'cinder') cue(w, 'impact', 'zombie', contact);
  if (a.hp) {
    w.hostWounds ??= {};
    w.hostWounds[a.i] = a.hp;
    if (w.gateCrossed && q.z > 1435 && inCourtyard(w.player)) a.defiedInYard = w.elapsed;
    a.seenAt = w.elapsed;
    a.seenX = w.player.x;
    a.seenZ = w.player.z;
    phase(w, a, 'stagger', 0.72);
  } else {
    w.hostFallen ??= {};
    w.hostFallen[a.i] = true;
    if (w.hostWounds) delete w.hostWounds[a.i];
    phase(w, a, 'fallen', 4.2);
    if (source !== 'cinder') cue(w, 'host', 'down', a);
  }
  return true;
}
function approach(w, a, point, speed, dt) {
  const gap = distance(a, point);
  if (gap < 0.08) return;
  const centre = turnTo(a, point),
    step = Math.min(gap, speed * dt);
  const side = a.i % 2 ? 1 : -1;
  const actors = w.hostActors;
  const separate = (x, z) => {
    for (const id in actors) {
      const b = actors[id];
      if (b === a || !b.hp) continue;
      const d2 = (x - b.x) ** 2 + (z - b.z) ** 2;
      if (d2 < 0.53 ** 2 && d2 < sq(a, b)) return true;
    }
    return false;
  };
  for (const angle of [
    centre,
    centre + 0.8 * side,
    centre - 0.8 * side,
    centre + 1.46 * side,
    centre - 1.46 * side,
  ]) {
    const x = a.x,
      z = a.z;
    moveBody(w, a, Math.sin(angle) * step, Math.cos(angle) * step, separate);
    if (Math.hypot(a.x - x, a.z - z) > step * 0.15) {
      a.heading = Math.atan2(a.x - x, a.z - z);
      break;
    }
  }
}
function inCourtyard(p) {
  return Math.abs(p.x - 30) < 25 && p.z >= 1435 && p.z <= 1553;
}
function shelteredScene(w, a) {
  const p = w.player;
  return (
    w.raceWitness ||
    w.sequence ||
    w.ending ||
    (((p.z > 1496 && insideHall(p.x, p.z)) || (w.gateCrossed && inCourtyard(p))) &&
      w.elapsed - (a?.defiedInYard ?? -Infinity) >= 8)
  );
}
function masked(w) {
  const veil = w.fieldMedicine?.veil;
  return (
    veil?.until > w.elapsed &&
    sq(veil, w.player) < 4.8 ** 2 &&
    clearSegment(w, veil.x, veil.z, w.player.x, w.player.z)
  );
}
function distractingLure(w, q) {
  const lure = w.fieldMedicine?.lure;
  return lure?.until > w.elapsed && sq(lure, q) <= 28 ** 2 ? lure : null;
}
function hunt(w, nearby) {
  if (w.elapsed < (w.hostSenseAt || 0)) return;
  w.hostSenseAt = w.elapsed + 0.32;
  if (!nearby.length || shelteredScene(w)) return;
  const actors = Object.values(w.hostActors || {});
  if (
    actors.filter((a) => a.hp && a.state !== 'return').length >= maxHunters ||
    actors.filter((a) => a.hp).length >= 7
  )
    return;
  const p = w.player;
  const noise = w.attack && w.elapsed - w.attack.start < 1.1;
  const notice = masked(w) ? 1.8 : noise ? 23 : p.speed > 4.5 ? 22 : 16;
  const guests = castleGuests(w);
  for (const q of nearby) {
    if (w.hostActors?.[q.i] || w.hostFallen?.[q.i]) continue;
    if (guests.includes(q.i) && (q.z >= 1435 || guestAtTable(w, q.i))) continue;
    // Let a shoulder already moving aside finish the first half-step. A
    // marcher can then turn to hunt without freezing in the contact pose.
    const brush = w.hostReactions?.[q.i];
    const pressing = (p.vx || 0) * (q.x - p.x) + (p.vz || 0) * (q.z - p.z) > 0.02;
    if ((brush && w.elapsed - brush.at < 0.55) || (!brush && pressing && sq(q, p) < 0.8 ** 2)) continue;
    const lure = distractingLure(w, q);
    if (!lure && sq(q, p) > notice ** 2) continue;
    if (barrier(w, q.x, q.z, 0.24, true)) continue;
    if (!lure && !clearSegment(w, q.x, q.z, p.x, p.z)) continue;
    const a = detach(w, q);
    if (lure) phase(w, a, 'lured', lure.until - w.elapsed);
    else cue(w, 'host', 'notice', a);
    w.hostSenseAt = w.elapsed + (actors.some((a) => a.hp) ? 2.4 : 1.85);
    break;
  }
}
function release(w, a) {
  w.hostRosterEpoch = (w.hostRosterEpoch || 0) + 1;
  delete w.hostActors[a.i];
  if (w.hostWarning?.i === a.i) delete w.hostWarning;
}
function strike(w, a, injury, notify) {
  const p = w.player,
    dx = p.x - a.x,
    dz = p.z - a.z;
  const gap = Math.hypot(dx, dz);
  const side = Math.abs(dx * Math.cos(a.attackYaw) - dz * Math.sin(a.attackYaw));
  const ahead = dx * Math.sin(a.attackYaw) + dz * Math.cos(a.attackYaw);
  const dodging = w.dodgeAt != null && w.elapsed - w.dodgeAt >= 0 && w.elapsed - w.dodgeAt < 0.27;
  phase(w, a, 'recover', 1.35 + (a.i % 4) * 0.14);
  if (dodging || ahead < -0.22 || side > 0.96 || gap > 1.92 || !clearSegment(w, a.x, a.z, p.x, p.z)) {
    cue(w, 'host', 'miss', a);
    return;
  }
  const facing = -dx * Math.sin(p.yaw) - dz * Math.cos(p.yaw);
  if (w.guardUntil > w.elapsed && facing > 0.12 * gap) {
    const parry = w.guardAt != null && w.elapsed - w.guardAt < 0.18;
    if (parry) {
      w.parriedAt = w.elapsed;
      phase(w, a, 'stagger', 2.05);
    }
    cue(w, 'block', parry ? 'parry' : 'host', a);
    notify(
      w,
      parry ? 'The wrist catches on your guard. Its knees buckle.' : 'Dead fingers rake across your guard.',
      1.6
    );
  } else injury(w, a);
}
export function advanceHost(w, dt, nearby, rankAt, injury, notify) {
  if (w.ropeFallen) {
    delete w.hostWarning;
    return;
  }
  // Old journeys could save a warning without a physical attacker. Resume
  // with a real, interruptible wind-up only if that walker is still nearby.
  if (w.hostWarning && !w.hostActors?.[w.hostWarning.i]) {
    const q = nearby.find((q) => q.i === w.hostWarning.i && sq(q, w.player) < 3 ** 2);
    if (q && !shelteredScene(w)) {
      const a = detach(w, q);
      phase(w, a, 'windup', 1.25);
      a.attackYaw = a.heading;
      w.hostWarning.at = w.elapsed;
    } else delete w.hostWarning;
  }
  hunt(w, nearby);
  if (!w.hostActors) return;
  const p = w.player;
  const veil = masked(w);
  for (const a of Object.values(w.hostActors)) {
    const gap = distance(a, p);
    if (!a.hp) {
      if (w.elapsed >= a.until || gap > 65) release(w, a);
      continue;
    }
    const sanctuary = shelteredScene(w, a);
    if (sanctuary && a.state !== 'return') phase(w, a, 'return');
    if (a.state === 'windup') {
      // Commit the final half-step along the direction the player saw.
      if (a.until - w.elapsed < 0.23 && gap > 0.74)
        moveBody(w, a, 1.7 * dt * Math.sin(a.attackYaw), 1.7 * dt * Math.cos(a.attackYaw));
      if (w.elapsed >= a.until) strike(w, a, injury, notify);
      if (w.ending) break;
      continue;
    }
    if (a.state === 'stagger' || a.state === 'recover') {
      if (w.elapsed < a.until) continue;
      phase(w, a, 'pursue');
    }
    const decoyAge = w.elapsed - (w.sluiceDecoyAt ?? -Infinity);
    const decoy = decoyAge >= 0 && decoyAge < 7 && sq(a, sluiceBell) < 88 ** 2;
    const lure = distractingLure(w, a) || (decoy && sluiceBell);
    if (!sanctuary && lure) {
      if (a.state !== 'lured') phase(w, a, 'lured', decoy ? 7 - decoyAge : lure.until - w.elapsed);
      a.heading = turnTo(a, lure);
      if (distance(a, lure) > 0.92) approach(w, a, lure, 2.7, dt);
      continue;
    }
    if (a.state === 'lured') {
      a.recalledUntil = w.elapsed + 2.6;
      phase(w, a, 'return');
    }
    // A fraction of the listeners abandon a chase when the real tower calls.
    // A hand already in motion finishes its committed attack first.
    const call = w.hostRangAt;
    if (
      a.state === 'pursue' &&
      a.i % 3 !== 0 &&
      gap > 2.2 &&
      call != null &&
      call !== w.bellAt &&
      call > a.since + 0.65 &&
      w.elapsed - call < 2 &&
      a.heardAt !== call
    ) {
      a.heardAt = call;
      a.recalledUntil = call + 4.2;
      phase(w, a, 'return');
    }
    if (a.state === 'return') {
      const rank = rankAt(w, a.i);
      const rejoined = distance(a, rank) < 0.43 && !(a.recalledUntil > w.elapsed);
      if (rejoined || (gap > 84 && sq(rank, p) > 84 ** 2)) release(w, a);
      else approach(w, a, rank, 4.55, dt);
      continue;
    }
    // Sight checks are staggered in time. Losing sight leaves a last-known
    // position to investigate; there is no target lock through solid walls.
    if (w.elapsed >= (a.lookAt || 0)) {
      a.lookAt = w.elapsed + 0.28 + (a.i % 4) * 0.035;
      a.visible = gap < 33 && (!veil || gap < 1.8) && clearSegment(w, a.x, a.z, p.x, p.z);
      if (a.visible) {
        a.seenAt = w.elapsed;
        a.seenX = p.x;
        a.seenZ = p.z;
      }
    }
    if (gap > 39 || w.elapsed - a.seenAt > 3.2 || (veil && gap > 2.2)) {
      phase(w, a, 'return');
      continue;
    }
    if (a.visible && gap < 1.62 && !w.hostWarning && w.elapsed >= (w.hostNextWarning || 0)) {
      a.attackYaw = a.heading = turnTo(a, p);
      phase(w, a, 'windup', 1.25);
      w.hostWarning = { i: a.i, at: w.elapsed };
      w.hostNextWarning = w.elapsed + 1.92;
      cue(w, 'telegraph', 'host', a);
      continue;
    }
    if (gap < 0.92 && a.visible) {
      a.heading = turnTo(a, p);
      continue;
    }
    const lead = a.visible && gap > 4 ? Math.min(0.8, gap / 19) : 0;
    const target = {
      x: a.seenX + (p.vx || 0) * lead,
      z: a.seenZ + (p.vz || 0) * lead,
    };
    const speed = 3.05 + (a.i % 7) * 0.13;
    approach(w, a, target, speed, dt);
  }
}
