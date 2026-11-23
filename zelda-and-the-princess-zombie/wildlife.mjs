import { kilnCover } from './story-field.mjs';
import { distance, clamp, terrainHeight } from './geography.mjs';
import { clearSegment, isSheltered, barrier } from './travel.mjs';
import { isEnemy, cue, moveBody } from './swordplay.mjs';
const profiles = {
  wolf: { notice: 40, reach: 2.5, wind: 0.62, recovery: 1.48, speed: 7.25 },
  troll: { notice: 34, reach: 4.0, wind: 1.15, recovery: 2.4, speed: 3.15 },
  dragon: { notice: 58, reach: 15, wind: 1.55, recovery: 3.4, speed: 7.5 },
};
function steer(w, a, tx, tz, length) {
  const gap = Math.hypot(tx - a.x, tz - a.z);
  if (gap < 0.06) return;
  const angle = Math.atan2(tx - a.x, tz - a.z);
  const step = Math.min(gap, length);
  const fromX = a.x,
    fromZ = a.z;
  for (const offset of [0, a.steerSide || 0.9, -(a.steerSide || 0.9), 1.5, -1.5]) {
    const dir = angle + offset;
    const dx = Math.sin(dir) * step,
      dz = Math.cos(dir) * step;
    if (a.type === 'dragon' && a.airHeight > 1.9) {
      const x = a.x + dx,
        z = a.z + dz;
      if (!barrier(w, x, z, 0.6, false, undefined, undefined, terrainHeight(x, z) + a.airHeight)) {
        a.x = x;
        a.z = z;
      }
    } else moveBody(w, a, dx, dz);
    if (Math.hypot(a.x - fromX, a.z - fromZ) > 0.03 * step) {
      a.heading = dir;
      if (offset) a.steerSide = Math.sign(offset) * 0.9;
      break;
    }
  }
}
function hitPlayer(w, a, hooks) {
  const p = w.player,
    dx = p.x - a.x,
    dz = p.z - a.z;
  const depth = dx * Math.sin(a.attackYaw) + dz * Math.cos(a.attackYaw);
  const side = Math.abs(dx * Math.cos(a.attackYaw) - dz * Math.sin(a.attackYaw));
  const shape =
    a.type === 'wolf' ? [3.2, 1.0] : a.type === 'troll' ? [4.5, 2.6] : [18, 1.0 + Math.max(0, depth) * 0.13];
  if (depth < -0.2 || depth > shape[0] || side > shape[1] || !clearSegment(w, a.x, a.z, p.x, p.z)) return;
  const facing = dx * Math.sin(p.yaw) + dz * Math.cos(p.yaw) < -0.18 * Math.hypot(dx, dz);
  if ((w.guardUntil || 0) > w.elapsed && facing && a.type !== 'dragon') {
    const parry = Number.isFinite(w.guardAt) && w.elapsed - w.guardAt <= 0.18;
    a.recoverUntil = w.elapsed + (parry ? 2.15 : 1.3);
    if (parry) {
      a.parriedAt = w.elapsed;
      w.parriedAt = w.elapsed;
    }
    cue(w, 'block', parry ? 'parry' : a.type, a);
    hooks.notify(
      w,
      parry ? 'You turn the blow aside. The attacker reels.' : 'The blow glances off your guard. An opening.',
      1.5
    );
    return true;
  }
  hooks.injury(w, a);
  return true;
}
function dragonCast(w, a) {
  let length = 0;
  const yaw = a.attackYaw;
  for (let reach = 0.3; reach <= 18.01; reach += 0.3) {
    const x = a.x + Math.sin(yaw) * reach,
      z = a.z + Math.cos(yaw) * reach;
    if (barrier(w, x, z, 0.1, false, undefined, undefined, terrainHeight(x, z) + 1.0)) break;
    length = reach;
  }
  const breath = {
    x: a.x,
    z: a.z,
    at: w.elapsed,
    heading: yaw,
    length,
    width: 0.46 + length * 0.16,
    duration: 1.05,
    caster: a.id,
  };
  a.breath = breath;
  w.dragonBreath = breath;
  cue(w, 'enemy-breath', 'dragon', a);
}
function advancingFire(w, a, hooks) {
  const b = a.breath;
  if (!b) return;
  const t = w.elapsed - b.at;
  if (t > b.duration) {
    delete a.breath;
    return;
  }
  if (b.hit || kilnCover(w, 'dragon')) return;
  const p = w.player,
    dx = p.x - b.x,
    dz = p.z - b.z,
    depth = dx * Math.sin(b.heading) + dz * Math.cos(b.heading);
  const side = Math.abs(dx * Math.cos(b.heading) - dz * Math.sin(b.heading));
  if (
    depth < Math.max(0, (t - 0.27) * 24) - 0.28 ||
    depth > Math.min(b.length, t * 24) + 0.28 ||
    side > 0.46 + depth * 0.16
  )
    return;
  if (clearSegment(w, b.x, b.z, p.x, p.z)) {
    b.hit = true;
    hooks.injury(w, a);
  }
}
function carryMomentum(w, a, dt, hooks) {
  const move = a.trollFollowThrough || a.flyThrough;
  if (!move) return false;
  const u = (w.elapsed - move.at) / move.duration;
  if (u >= 1) {
    delete a.trollFollowThrough;
    delete a.flyThrough;
    return false;
  }
  const speed = a.type === 'troll' ? 7.8 * (1 - u) : 9.1;
  const heading = move.heading,
    oldX = a.x,
    oldZ = a.z;
  if (a.type === 'dragon') {
    a.airHeight = 0.78 + 4.2 * u;
    steer(w, a, a.x + Math.sin(heading) * 8, a.z + Math.cos(heading) * 8, dt * speed);
  } else {
    moveBody(w, a, Math.sin(heading) * speed * dt, Math.cos(heading) * speed * dt);
    if (!move.hit) move.hit = Boolean(hitPlayer(w, a, hooks));
    if (Math.hypot(a.x - oldX, a.z - oldZ) < 0.018 * dt * speed) {
      delete a.trollFollowThrough;
      a.recoverUntil = w.elapsed + 1.3;
    }
  }
  return true;
}
export function advanceWildlife(w, dt, hooks) {
  const p = w.player,
    refuge = isSheltered(p.x, p.z);
  if (w.route === 'wander' && !refuge && w.elapsed >= (w.nextHunt ?? Infinity)) {
    w.nextHunt = w.elapsed + 34;
    const wolves = w.actors
      .filter((a) => a.alive && a.type === 'wolf')
      .sort((a, b) => distance(a, p) - distance(b, p));
    for (const a of wolves.slice(0, 2)) a.huntingUntil = w.elapsed + 46;
    if (wolves[0]) {
      cue(w, 'howl', 'wolf', wolves[0]);
      hooks.notify(w, 'A howl rises behind the trees. A second answers it.', 4);
    }
  }
  const mist = w.fieldMedicine?.veil,
    lure = w.fieldMedicine?.lure;
  if (mist && mist.until > w.elapsed && distance(mist, p) < 4.8 && clearSegment(w, mist.x, mist.z, p.x, p.z))
    p.scentMaskedUntil = w.elapsed + 13;
  const pack = w.actors
    .filter((a) => a.alive && a.type === 'wolf' && (distance(a, p) < 50 || a.huntingUntil > w.elapsed))
    .sort((a, b) => distance(a, p) - distance(b, p));
  const lead = pack[0],
    leadAngle = lead ? Math.atan2(p.x - lead.x, p.z - lead.z) : 0;
  const direction = Math.hypot(p.vx || 0, p.vz || 0) > 1.2 ? Math.atan2(p.vx, p.vz) : leadAngle;
  for (const a of w.actors) {
    if (!a.alive || !isEnemy(a)) continue;
    const spec = profiles[a.type],
      d = distance(p, a);
    if (a.type === 'dragon') advancingFire(w, a, hooks);
    if (w.ending) return;
    if (carryMomentum(w, a, dt, hooks)) continue;
    if (
      (a.z > 1045 || (a.type === 'wolf' && d < 35 && hooks.nearMarchers?.length)) &&
      !w.ropeFallen &&
      hooks.marcherAt &&
      (!a.nextHostListen || w.elapsed >= a.nextHostListen)
    ) {
      a.nextHostListen = w.elapsed + 0.45;
      // Animals hear files of boots across the downs and retreat from the
      // nearest rank, even when the player stays behind cover.
      let closest,
        gap = a.type === 'dragon' ? 48 : 31;
      for (let row = 0; a.z > 1045 && row < 64; row += 4) {
        const q = hooks.marcherAt(w, row * 48);
        const d = distance(a, q);
        if (d < gap) {
          closest = q;
          gap = d;
        }
      }
      // In the woods a pack gives way only to a cluster it can actually hear.
      // One straggler across the trail is no shelter from a pursuing wolf.
      if (!closest && a.type === 'wolf' && hooks.nearMarchers) {
        let count = 0, nearest, nearestRange = 10;
        for (const q of hooks.nearMarchers) {
          if (w.hostFallen?.[q.i]) continue;
          const person = w.hostActors?.[q.i] || q;
          const range = distance(a, person);
          if (range > 10) continue;
          count++;
          if (range < nearestRange) { nearest = person; nearestRange = range; }
        }
        if (count >= 2 && nearest) { closest = nearest; gap = nearestRange; }
      }
      if (closest) {
        const scale = 27 / Math.max(0.5, gap);
        a.hostFlight = {
          until: w.elapsed + 1.8,
          x: a.x + (a.x - closest.x) * scale,
          z: a.z + (a.z - closest.z) * scale,
        };
      }
    }
    if (a.hostFlight?.until > w.elapsed) {
      a.windupUntil = 0;
      a.alerted = false;
      if (a.type === 'dragon') a.airHeight = Math.min(4.4, (a.airHeight || 1.7) + dt);
      steer(w, a, a.hostFlight.x, a.hostFlight.z, dt * spec.speed * 0.84);
      continue;
    }
    if (a.type === 'wolf' && (p.scentMaskedUntil > w.elapsed || kilnCover(w, 'wolf')) && d > 1.6) {
      a.windupUntil = 0;
      a.huntingUntil = 0;
      a.alerted = false;
      const az = Math.atan2(a.x - p.x, a.z - p.z) + Math.sin(a.phase) * 0.45;
      steer(w, a, a.x + Math.sin(az) * 4, a.z + Math.cos(az) * 4, dt * (d < 10 ? 4.8 : 1.3));
      continue;
    }
    if (
      lure &&
      lure.until > w.elapsed &&
      a.type !== 'wolf' &&
      distance(lure, a) < (a.type === 'dragon' ? 50 : 34) &&
      a.lureSpentAt !== lure.at &&
      !a.windupUntil &&
      (a.recoverUntil || 0) <= w.elapsed
    ) {
      const gap = distance(lure, a);
      a.alerted = false;
      if (gap > (a.type === 'dragon' ? 13 : 2.7)) {
        steer(w, a, lure.x, lure.z, dt * spec.speed);
      } else {
        a.heading = a.attackYaw = Math.atan2(lure.x - a.x, lure.z - a.z);
        a.windupUntil = w.elapsed + spec.wind;
        a.lureSpentAt = lure.at;
        cue(w, 'telegraph', a.type, a);
      }
      continue;
    }
    const rank = a.type === 'wolf' ? pack.indexOf(a) : -1;
    const hunt =
      a.huntingUntil > w.elapsed || (rank > 0 && lead && distance(lead, p) < 30 && distance(a, lead) < 35);
    if (rank >= 0) a.packRole = rank === 0 ? 'press' : rank % 2 ? 'left' : 'right';
    const hiddenFromCreature = refuge || kilnCover(w, a.type);
    a.alerted =
      !hiddenFromCreature && (hunt || (d < spec.notice && Math.hypot(p.x - a.homeX, p.z - a.homeZ) < 90));
    if (!a.alerted && d > 160) {
      a.airHeight = a.type === 'dragon' ? 3.8 : 0;
      continue;
    }
    if (a.windupUntil) {
      if (hiddenFromCreature && !(lure && a.lureSpentAt === lure.at)) {
        a.windupUntil = 0;
        continue;
      }
      const t = clamp(1 - (a.windupUntil - w.elapsed) / spec.wind, 0, 1);
      if (a.type === 'dragon') a.airHeight = 3.4 - 2.65 * t;
      if (w.elapsed >= a.windupUntil) {
        a.windupUntil = 0;
        a.impactAt = w.elapsed;
        if (a.type === 'dragon') {
          dragonCast(w, a);
          a.flyThrough = { at: w.elapsed, duration: 0.93, heading: a.attackYaw };
        }
        if (a.type === 'wolf') moveBody(w, a, Math.sin(a.attackYaw) * 0.55, Math.cos(a.attackYaw) * 0.55);
        const hit = a.type !== 'dragon' && Boolean(hitPlayer(w, a, hooks));
        if (a.type === 'troll' && a.parriedAt !== w.elapsed) {
          a.trollFollowThrough = { at: w.elapsed, duration: 0.62, heading: a.attackYaw, hit };
          cue(w, 'bough', 'troll', a);
        }
        a.recoverUntil = Math.max(a.recoverUntil || 0, w.elapsed + spec.recovery * 0.65);
        a.attackAt = w.elapsed + spec.recovery;
        if (w.ending) return;
      }
      continue;
    }
    if (a.recoverUntil > w.elapsed) continue;
    if (a.type === 'dragon') a.airHeight = 3.55 + Math.sin(w.elapsed * 1.13 + a.phase) * 0.57;
    if (a.alerted && d < spec.reach && w.elapsed >= a.attackAt && clearSegment(w, a.x, a.z, p.x, p.z)) {
      a.attackYaw = Math.atan2(p.x - a.x, p.z - a.z);
      a.heading = a.attackYaw;
      a.windupUntil = w.elapsed + spec.wind;
      cue(w, 'telegraph', a.type, a);
      continue;
    }
    const r = a.type === 'dragon' ? 20 : 6;
    let x = a.homeX + Math.sin(w.elapsed * 0.12 + a.phase) * r,
      z = a.homeZ + Math.cos(w.elapsed * 0.12 + a.phase) * r;
    if (a.alerted) {
      x = p.x;
      z = p.z;
      if (a.type === 'wolf' && d > 5) {
        const flank = (a.packRole === 'press' ? 0 : a.packRole === 'left' ? -1 : 1) * Math.min(6.3, d * 0.27);
        const lead = a.packRole === 'press' ? 0.5 : Math.min(4.2, d * 0.2);
        x += Math.cos(direction) * flank + Math.sin(direction) * lead;
        z += -Math.sin(direction) * flank + Math.cos(direction) * lead;
      }
    }
    steer(w, a, x, z, (a.alerted ? spec.speed : a.type === 'dragon' ? 2.8 : 1.15) * dt);
  }
}
