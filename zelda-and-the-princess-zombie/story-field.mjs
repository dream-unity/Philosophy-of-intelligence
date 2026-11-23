// Signals heard along the road depend on the same animals, wind and bell that the player sees.
export const kiln = { x: 96, z: 1164 };
export const stable = { x: 40, z: 1449 };
export const roosts = [
  { x: 75, z: 301 },
  { x: 56, z: 756 },
  { x: 96, z: 1164 },
  { x: 19, z: 1422 },
];
export const pealPeriod = 37;
export const pealPhase = (time) => (((time - 6) % pealPeriod) + pealPeriod) % pealPeriod;
export function charcoalWind(time) {
  const angle = 0.8 + 0.68 * Math.sin(time / 21) + 0.32 * Math.sin(time / 9);
  return { x: Math.cos(angle), z: Math.sin(angle) };
}
export function kilnCover(w, creature) {
  const dx = w.player.x - kiln.x,
    dz = w.player.z - kiln.z;
  if (Math.abs(dx) > 16 || Math.abs(dz) > 16) return false;
  if (creature === 'dragon') return dx > -5.45 && dx < -0.55 && Math.abs(dz) < 2.7;
  if (creature !== 'wolf') return false;
  const wind = charcoalWind(w.elapsed),
    along = dx * wind.x + dz * wind.z;
  return along > 0.7 && along < 14 && Math.abs(wind.x * dz - wind.z * dx) < 1.35 + 0.14 * along;
}
export function fieldPassable(w, x, z) {
  if (Math.abs(x - kiln.x) < 7 && Math.abs(z - kiln.z) < 4) {
    if (Math.hypot(x - kiln.x, z - kiln.z) < 1.27) return false;
    for (const sx of [-5.5, -0.5])
      for (const sz of [-2.6, 2.6]) {
        if (Math.hypot(x - kiln.x - sx, z - kiln.z - sz) < 0.31) return false;
      }
  }
  const sx = x - stable.x,
    sz = z - stable.z;
  if (Math.abs(sx) > 6.5 || Math.abs(sz) > 10) return true;
  const pony = ponyPose(w, w.elapsed);
  if (Math.hypot(x - pony.x, z - pony.z) < 0.88) return false;
  if (Math.abs(sx) > 3.25 || Math.abs(sz) > 3.25) return true;
  if (Math.abs(Math.abs(sx) - 3) < 0.29 || Math.abs(sz - 3) < 0.29) return false;
  if (
    Math.abs(sz + 3) < 0.29 &&
    (Math.abs(sx) > 1.22 || w.ponyLooseAt == null || w.elapsed - w.ponyLooseAt < 0.6)
  )
    return false;
  return true;
}
export function ponyPose(w, time) {
  const u = w.ponyLooseAt == null ? 0 : Math.min(1, Math.max(0, (time - w.ponyLooseAt - 0.7) / 5));
  // After clearing the gate the pony bends east and settles in the lee of the stable.
  return { x: stable.x + 0.3 + Math.max(0, u - 0.52) * 10, z: stable.z + 0.7 - u * 9, u };
}
export function fieldTick(w, dt, observe, sound) {
  const p = w.player,
    t = w.elapsed;
  if (Math.abs(p.x - kiln.x) < 18 && Math.abs(p.z - kiln.z) < 18) {
    if (
      kilnCover(w, 'wolf') &&
      w.actors.some((a) => a.alive && a.type === 'wolf' && Math.hypot(a.x - p.x, a.z - p.z) < 26)
    )
      observe('smoke');
    if (
      kilnCover(w, 'dragon') &&
      w.actors.some(
        (a) =>
          a.alive &&
          a.type === 'dragon' &&
          (a.alerted || a.breath || a.windupUntil > t) &&
          Math.hypot(a.x - p.x, a.z - p.z) < 32
      )
    )
      observe('roof');
  }
  // Up to one small flock is active within earshot. The last cause persists through a save.
  const i = roosts.findIndex((r) => Math.hypot(p.x - r.x, p.z - r.z) < 48);
  if (i < 0) return;
  const r = roosts[i];
  if (w.birds?.i !== i) w.birds = { i, next: t + 0.4 };
  const b = w.birds;
  const wolf = w.actors.find(
    (a) =>
      a.alive &&
      a.type === 'wolf' &&
      Math.hypot(a.x - r.x, a.z - r.z) < 19 &&
      (a.alerted || a.huntingUntil > t || Math.hypot(a.x - p.x, a.z - p.z) < 24)
  );
  if (wolf && !b.wolfNear) {
    sound('fieldbird', 'alarm', r.x, r.z);
    b.fledAt = t;
    b.reason = 'wolf';
    if (Math.hypot(p.x - r.x, p.z - r.z) < 24) observe('birdsWolf');
  }
  b.wolfNear = !!wolf;
  if (wolf) w.flockQuietUntil = t + 3;
  const sinceCall = pealPhase(t),
    heard = t >= 6 && sinceCall < dt + 0.000001;
  if (heard && !w.ropeFallen && !w.relayBraced && !(w.silentPealAt != null && t - w.silentPealAt < 1)) {
    b.fledAt = t;
    b.reason = 'bell';
    sound('fieldbird', 'wings', r.x, r.z);
    w.flockQuietUntil = t + 2.1;
    if (Math.hypot(p.x - r.x, p.z - r.z) < 24) observe('birdsBell');
  }
  if (t >= b.next && !wolf && (w.flockQuietUntil ?? -1) < t && (b.fledAt == null || t - b.fledAt > 3.5)) {
    sound('fieldbird', 'song', r.x, r.z);
    b.next = t + 4.8 + 0.6 * Math.sin(t);
  }
}
