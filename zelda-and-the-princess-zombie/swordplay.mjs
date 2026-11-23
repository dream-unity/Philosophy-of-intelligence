import { clamp, terrainHeight } from './geography.mjs';
import { barrier, clearSegment, footHeight, bodyRadius } from './travel.mjs';

export const isEnemy = (a) => ['wolf', 'dragon', 'troll'].includes(a.type);
export function cue(w, type, text, source) {
  const ev = { type };
  if (text) ev.text = text;
  if (source) {
    ev.x = source.x;
    ev.z = source.z;
  }
  w.events.push(ev);
}
const smooth = (u) => {
  u = clamp(u, 0, 1);
  return u * u * (3 - 2 * u);
};
export function bladeCoordinates(w, fraction) {
  const p = w.player,
    a = w.attack;
  const t = clamp(fraction ?? (a ? (w.elapsed - a.start) / a.duration : 1), 0, 1);
  const side = a?.side || 1,
    thrust = a?.kind === 'thrust';
  const active = a && t < 1;
  const guard = (w.guardUntil ?? 0) > w.elapsed;
  const swing = active ? smooth((t - 0.2) / 0.48) : 0;
  const reach = active ? Math.sin(Math.PI * smooth(t)) : 0;
  const lunge = thrust ? reach : 0;
  const axes = (x, y, z) => {
    const cy = Math.cos(p.yaw),
      sy = Math.sin(p.yaw),
      lp = p.pitch || 0;
    const front = z * Math.cos(lp) - y * Math.sin(lp);
    return [
      p.x + x * cy + front * sy,
      (p.feetY ?? footHeight(w, p.x, p.z)) + 1.64 + y * Math.cos(lp) + z * Math.sin(lp),
      p.z - x * sy + front * cy,
    ];
  };
  const gripX = guard ? -0.14 : 0.31 + (active && !thrust ? side * (0.32 - swing * 0.59) : 0);
  const gripY = guard ? -0.14 : -0.37 + 0.085 * reach;
  const gripZ = 0.31 + 0.28 * reach + 0.34 * lunge;
  let tx = -0.42,
    ty = 0.65,
    tz = 0.83;
  if (guard) {
    tx = 0.82;
    ty = 0.67;
    tz = 0.4;
  } else if (active) {
    const angle = thrust ? 0.02 : side * (1.03 - 2.1 * swing);
    const mix = Math.min(smooth(t / 0.17), smooth((1 - t) / 0.21));
    tx += (Math.sin(angle) - tx) * mix;
    ty += ((thrust ? -0.06 : 0.3 - 0.67 * swing) - ty) * mix;
    tz += (Math.cos(angle) - tz) * mix;
  }
  const norm = Math.hypot(tx, ty, tz),
    length = 1.38;
  tx /= norm;
  ty /= norm;
  tz /= norm;
  const base = axes(gripX + tx * 0.12, gripY + ty * 0.12, gripZ + tz * 0.12);
  return {
    grip: axes(gripX, gripY, gripZ),
    base,
    tip: axes(gripX + tx * (length + 0.12), gripY + ty * (length + 0.12), gripZ + tz * (length + 0.12)),
  };
}
export function beginSwing(w, kind) {
  if (w.elapsed < w.strikeUntil || w.elapsed < (w.guardUntil || 0) - 0.18) return false;
  const duration = kind === 'thrust' ? 0.64 : 0.54;
  w.attack = {
    kind,
    start: w.elapsed,
    duration,
    side: -(w.attack?.side || -1),
    hits: [],
    checked: 0.24,
  };
  w.strikeUntil = w.elapsed + duration;
  cue(w, 'strike', kind);
  return true;
}
const heights = {
  wolf: [0.25, 1.58, 0.4],
  troll: [0.12, 3.06, 0.86],
  witch: [0.16, 2.08, 0.39],
  bell: [1.13, 2.46, 0.64],
  dragon: [-0.27, 1.35, 1.17],
};
export function strikeContacts(w, rig, hooks) {
  const a = w.attack;
  if (!a || a.checked >= 0.72) return;
  const fraction = clamp((w.elapsed - a.start) / a.duration, 0, 0.72);
  if (fraction <= a.checked) return;
  const candidates = w.actors.filter(
    (v) =>
      v.alive &&
      heights[v.type] &&
      !a.hits.includes(v.id) &&
      Math.hypot(v.x - w.player.x, v.z - w.player.z) < 4.6
  );
  const steps = Math.max(1, Math.ceil((fraction - a.checked) / 0.045));
  for (let j = 1; j <= steps; j++) {
    const blade = bladeCoordinates(w, a.checked + ((fraction - a.checked) * j) / steps);
    for (let k = 1; k <= 15; k++) {
      const u = k / 15,
        x = blade.base[0] + (blade.tip[0] - blade.base[0]) * u,
        y = blade.base[1] + (blade.tip[1] - blade.base[1]) * u,
        z = blade.base[2] + (blade.tip[2] - blade.base[2]) * u;
      const material = barrier(w, x, z, 0.03, false, undefined, undefined, y);
      if (material || y < terrainHeight(x, z) + 0.04) {
        if (!a.wall) {
          a.contact = { x, y, z, at: w.elapsed, material: material || 'stone' };
          cue(w, 'impact', a.contact.material, { x, z });
          a.wall = true;
        }
        break;
      }
      for (const foe of candidates) {
        if (!foe.alive || a.hits.includes(foe.id)) continue;
        const [bottom, top, r] = heights[foe.type],
          ground = terrainHeight(foe.x, foe.z) + (foe.airHeight || 0);
        if (
          Math.hypot(x - foe.x, z - foe.z) > r ||
          y < ground + bottom ||
          y > ground + top ||
          !clearSegment(w, w.player.x, w.player.z, foe.x, foe.z)
        )
          continue;
        a.hits.push(foe.id);
        a.contact = { x, y, z, at: w.elapsed, material: foe.type };
        if (foe.type === 'bell') {
          hooks.ring(w, foe.tone);
          continue;
        }
        cue(w, 'impact', foe.type, foe);
        if (foe.type === 'witch') {
          hooks.drop(w, foe);
          continue;
        }
        const opening = (foe.recoverUntil || 0) > w.elapsed;
        const damage = (a.kind === 'thrust' && opening) || y > ground + top * 0.88 ? 2 : 1;
        foe.hp -= damage;
        if (foe.hp <= 0) {
          foe.alive = false;
          hooks.notify(w, 'The ' + foe.type + ' falls.');
          continue;
        }
        if (foe.type === 'wolf' || opening) {
          foe.windupUntil = 0;
          foe.attackAt = Math.max(foe.attackAt, w.elapsed + 0.32);
        }
        const d = Math.max(0.01, Math.hypot(foe.x - w.player.x, foe.z - w.player.z));
        const impulse = foe.type === 'troll' ? 0.19 : 0.51;
        rig.move(foe, ((foe.x - w.player.x) / d) * impulse, ((foe.z - w.player.z) / d) * impulse);
      }
    }
  }
  a.checked = fraction;
}
export function moveBody(w, a, dx, dz, extraBlock) {
  const r = a === w.player ? 0.28 : bodyRadius(a);
  function legal(x, z) {
    if (barrier(w, x, z, r || 0.18, true, a.x, a.z)) return false;
    const player = a === w.player;
    for (const b of player ? w.actors : [w.player, ...w.actors]) {
      if (a === b || b.alive === false) continue;
      const br = b === w.player ? 0.28 : bodyRadius(b);
      if (!br || !r) continue;
      const d2 = (x - b.x) ** 2 + (z - b.z) ** 2;
      if (d2 < (r + br) ** 2 && d2 < (a.x - b.x) ** 2 + (a.z - b.z) ** 2) return false;
    }
    return !extraBlock?.(x, z);
  }
  const slices = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.19));
  for (let i = 0; i < slices; i++) {
    if (dx && legal(a.x + dx / slices, a.z)) a.x += dx / slices;
    if (dz && legal(a.x, a.z + dz / slices)) a.z += dz / slices;
  }
}

export function tossPhial(w) {
  const p = w.player,
    pitch = clamp(p.pitch || 0, -1.05, 1.12),
    speed = 10.9;
  w.phialFlight = {
    x: p.x,
    y: (p.feetY ?? footHeight(w, p.x, p.z)) + 1.43,
    z: p.z,
    at: w.elapsed,
    vx: speed * Math.sin(p.yaw) * Math.cos(pitch),
    vz: speed * Math.cos(p.yaw) * Math.cos(pitch),
    vy: 2 + speed * Math.sin(pitch),
  };
  w.potions--;
  w.potionUntil = w.elapsed + 1.1;
  cue(w, 'throw', 'phial', p);
}
export function advancePhial(w, dt, notify) {
  const q = w.phialFlight;
  if (!q) return;
  const slices = Math.max(1, Math.ceil((Math.hypot(q.vx, q.vy, q.vz) * dt) / 0.19));
  for (let i = 0; i < slices; i++) {
    const step = dt / slices,
      x = q.x + q.vx * step,
      z = q.z + q.vz * step,
      y = q.y + q.vy * step - 0.5 * 9.81 * step * step;
    q.vy -= 9.81 * step;
    const floor = footHeight(w, x, z);
    const blocked = barrier(w, x, z, 0.05, false, undefined, undefined, y);
    const contact = w.actors.some(
      (a) =>
        a.alive &&
        isEnemy(a) &&
        Math.hypot(a.x - x, a.z - z) < (bodyRadius(a) || 0.8) + 0.12 &&
        Math.abs(y - terrainHeight(a.x, a.z) - (a.airHeight || 0) - 0.85) < 1
    );
    if (!blocked) {
      q.x = x;
      q.y = Math.max(y, floor + 0.05);
      q.z = z;
    }
    if (!blocked && !contact && y > floor + 0.05 && w.elapsed - q.at < 3.5) continue;
    const burst = { x: q.x, y: q.y, z: q.z, at: w.elapsed };
    let struck = 0;
    for (const a of w.actors) {
      if (!a.alive || !isEnemy(a)) continue;
      const cy = terrainHeight(a.x, a.z) + (a.airHeight || 0) + 0.8;
      if (
        Math.hypot(a.x - q.x, a.z - q.z, cy - q.y) > 10.5 ||
        !clearSegment(w, q.x, q.z, a.x, a.z, 0.03, q.y + 0.18, cy)
      )
        continue;
      a.alive = false;
      struck++;
      cue(w, 'impact', a.type, a);
    }
    w.phialFlight = null;
    w.cinder = burst;
    cue(w, 'potion', 'shatter', burst);
    notify(w, struck ? 'Cinder light scatters the beasts.' : 'A ring of cinder light fades.');
    return;
  }
}
