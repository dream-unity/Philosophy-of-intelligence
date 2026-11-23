import { distance, clamp } from './geography.mjs';
import { clearSegment, isSheltered } from './travel.mjs';
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
    moveBody(w, a, Math.sin(dir) * step, Math.cos(dir) * step);
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
    a.recoverUntil = w.elapsed + 1.3;
    cue(w, 'block', a.type, a);
    hooks.notify(w, 'The blow glances off your guard. An opening.', 1.5);
    return;
  }
  hooks.injury(w, a);
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
  for (const a of w.actors) {
    if (!a.alive || !isEnemy(a)) continue;
    const spec = profiles[a.type],
      d = distance(p, a);
    const hunt = a.huntingUntil > w.elapsed;
    a.alerted = !refuge && (hunt || (d < spec.notice && Math.hypot(p.x - a.homeX, p.z - a.homeZ) < 90));
    if (!a.alerted && d > 160) {
      a.airHeight = a.type === 'dragon' ? 3.8 : 0;
      continue;
    }
    if (a.windupUntil) {
      if (refuge) {
        a.windupUntil = 0;
        continue;
      }
      const t = clamp(1 - (a.windupUntil - w.elapsed) / spec.wind, 0, 1);
      if (a.type === 'dragon') a.airHeight = 3.4 - 2.65 * t;
      if (w.elapsed >= a.windupUntil) {
        a.windupUntil = 0;
        a.impactAt = w.elapsed;
        if (a.type === 'dragon') cue(w, 'enemy-breath', 'dragon', a);
        if (a.type === 'wolf') moveBody(w, a, Math.sin(a.attackYaw) * 0.55, Math.cos(a.attackYaw) * 0.55);
        hitPlayer(w, a, hooks);
        a.recoverUntil = w.elapsed + spec.recovery * 0.65;
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
        const flank = (Math.floor(a.phase) % 2 ? 1 : -1) * Math.min(5, d * 0.24);
        x += Math.cos(p.yaw) * flank;
        z -= Math.sin(p.yaw) * flank;
        x += Math.sin(p.yaw) * 2.5;
        z += Math.cos(p.yaw) * 2.5;
      }
    }
    steer(w, a, x, z, (a.alerted ? spec.speed : a.type === 'dragon' ? 2.8 : 1.15) * dt);
  }
}
