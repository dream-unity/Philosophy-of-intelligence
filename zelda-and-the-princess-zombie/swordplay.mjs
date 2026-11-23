import { takeItem } from './inventory.mjs';
import { clamp } from './geography.mjs';
import { barrier, footHeight, bodyRadius } from './travel.mjs';
import {
  observer,
  nominalBlade,
  shortAngle,
  interpolateEye,
  inspectBlade,
  hazardFreeBlade,
  obstruction,
  lerpPoint,
  mix,
} from './blade-pose.mjs';
import { actorVolumes, capsuleEntry } from './combat-zones.mjs';
export { bladeCoordinates, bladeFallbackGeometry, steelLength, gripToEdge } from './blade-pose.mjs';

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
export function beginSwing(w, kind) {
  if (w.elapsed < w.strikeUntil || w.elapsed < (w.guardUntil || 0)) return false;
  const duration = kind === 'thrust' ? 0.64 : 0.54;
  w.attack = {
    kind,
    start: w.elapsed,
    duration,
    side: -(w.attack?.side || -1),
    hits: [],
    checked: 0.24,
    eye: observer(w),
    eyeAt: w.elapsed,
  };
  w.strikeUntil = w.elapsed + duration;
  cue(w, 'strike', kind);
  return true;
}
function aimedEye(w, a) {
  const current = observer(w),
    previous = a.eye || current;
  const dt = clamp(w.elapsed - (a.eyeAt ?? a.start), 0, 0.2);
  // The head may turn instantly, but the hands and the weight of the sword
  // follow at a finite angular speed during a committed cut.
  return {
    ...current,
    yaw: previous.yaw + clamp(shortAngle(previous.yaw, current.yaw), -dt * 5.2, dt * 5.2),
    pitch: previous.pitch + clamp(current.pitch - previous.pitch, -dt * 4.0, dt * 4.0),
  };
}
function firstContact(w, blade, eye, targets) {
  const solid = inspectBlade(w, blade, eye);
  let best = solid ? { ...solid, order: '', actor: null } : null;
  for (const { actor, zones } of targets)
    for (const zone of zones) {
      const u = capsuleEntry(blade.base, blade.tip, zone),
        order = String(actor.id);
      if (!Number.isFinite(u)) continue;
      if (best && (u > best.u + 1e-7 || (Math.abs(u - best.u) <= 1e-7 && order >= best.order))) continue;
      best = { u, order, actor, zone: zone.name, point: lerpPoint(blade.base, blade.tip, u) };
    }
  return best;
}
function surfacePoint(w, hit, fraction, eye) {
  const pose = hazardFreeBlade(w, nominalBlade(w, fraction, eye), eye);
  // The edge rises into close guard as it meets a surface. Emit its spark
  // on the point that visibly grazes that surface, including close-range posts.
  for (const radius of [0.042, 0.075]) {
    const near = obstruction(w, pose.base, pose.tip, radius);
    if (near?.material === hit.material) return near.point;
    const hilt = obstruction(w, pose.grip, pose.base, radius);
    if (hilt?.material === hit.material) return hilt.point;
  }
  const span = pose.tip.map((v, i) => v - pose.grip[i]);
  const along = hit.point.reduce((n, v, i) => n + (v - pose.grip[i]) * span[i], 0);
  return lerpPoint(pose.grip, pose.tip, clamp(along / span.reduce((n, v) => n + v * v, 0), 0, 1));
}
function commitContact(w, hooks, rig, hit, fraction, eye) {
  const a = w.attack,
    foe = hit.actor;
  const [x, y, z] = foe ? hit.point : surfacePoint(w, hit, fraction, eye);
  const hard =
    !foe || foe.type === 'bell' || (foe.type === 'troll' && (hit.zone === 'club' || hit.zone === 'armour'));
  a.landed = true;
  if (hard) a.stopAt = fraction;
  const material = foe
    ? foe.type === 'bell'
      ? 'bronze'
      : hard
        ? hit.zone === 'club'
          ? 'wood'
          : 'stone'
        : foe.type
    : hit.material;
  a.contact = { x, y, z, at: w.elapsed, fraction, material, zone: hit.zone || 'scenery' };
  if (!foe) {
    a.wall = true;
    cue(w, 'impact', material, a.contact);
    return;
  }
  a.hits.push(foe.id);
  if (foe.type === 'bell') {
    hooks.ring(w, foe.tone);
    return;
  }
  if (foe.type === 'marcher') {
    hooks.hitMarcher?.(w, foe.marcher, a.contact);
    return;
  }
  cue(w, 'impact', material, a.contact);
  if (foe.type === 'witch') {
    hooks.drop(w, foe);
    return;
  }
  if (hard) {
    hooks.notify(
      w,
      hit.zone === 'club' ? 'Your blade catches on the club.' : 'Your edge glances off the stone shoulder.',
      1.7
    );
    return;
  }
  const opening = (foe.recoverUntil || 0) > w.elapsed;
  const precise = hit.zone === 'head' || hit.zone === 'throat';
  foe.hp -= a.kind === 'thrust' && (opening || precise) ? 2 : 1;
  if (foe.hp <= 0) {
    foe.alive = false;
    hooks.notify(w, 'The ' + foe.type + ' falls.');
    return;
  }
  if (foe.type === 'wolf' || opening) {
    foe.windupUntil = 0;
    foe.attackAt = Math.max(foe.attackAt || 0, w.elapsed + 0.32);
  }
  const dx = foe.x - w.player.x,
    dz = foe.z - w.player.z,
    length = Math.hypot(dx, dz) || 1;
  const impulse = foe.type === 'troll' ? 0.13 : 0.42;
  rig.move(foe, (dx / length) * impulse, (dz / length) * impulse);
}
export function strikeContacts(w, rig, hooks) {
  const a = w.attack;
  if (!a || w.elapsed > a.start + a.duration + 0.12) return;
  const previous = a.eye || observer(w),
    eye = aimedEye(w, a);
  a.eye = eye;
  a.eyeAt = w.elapsed;
  if (a.landed || a.wall || a.hits?.length || a.checked >= 0.72) return;
  const fraction = clamp((w.elapsed - a.start) / a.duration, 0, 0.72);
  if (fraction <= a.checked) return;
  const actors = w.actors.filter(
    (v) =>
      v.alive &&
      (isEnemy(v) || v.type === 'witch' || v.type === 'bell') &&
      Math.hypot(v.x - w.player.x, v.z - w.player.z) < (v.type === 'dragon' ? 8.3 : 4.2)
  );
  for (const q of hooks.marchers || []) {
    if (Math.hypot(q.x - eye.x, q.z - eye.z) < 3)
      actors.push({ type: 'marcher', id: 'host' + q.i, x: q.x, z: q.z, marcher: q });
  }
  const targets = actors.map((actor) => ({ actor, zones: actorVolumes(actor, w.elapsed) }));
  const steps = clamp(
    Math.ceil(
      Math.max(
        (fraction - a.checked) / 0.019,
        Math.abs(shortAngle(previous.yaw, eye.yaw)) / 0.045,
        Math.abs(previous.pitch - eye.pitch) / 0.045,
        Math.hypot(eye.x - previous.x, eye.z - previous.z) / 0.075
      )
    ),
    1,
    72
  );
  for (let i = 1; i <= steps; i++) {
    const u = i / steps,
      f = mix(a.checked, fraction, u),
      view = interpolateEye(previous, eye, u);
    const blade = nominalBlade(w, f, view);
    const hit = firstContact(w, blade, view, targets);
    if (hit) {
      let here = u,
        there = (i - 1) / steps,
        contact = hit;
      for (let k = 0; k < 5; k++) {
        const mid = (there + here) / 2,
          frame = interpolateEye(previous, eye, mid);
        const earlier = firstContact(
          w,
          nominalBlade(w, mix(a.checked, fraction, mid), frame),
          frame,
          targets
        );
        if (earlier) {
          here = mid;
          contact = earlier;
        } else there = mid;
      }
      commitContact(
        w,
        hooks,
        rig,
        contact,
        mix(a.checked, fraction, here),
        interpolateEye(previous, eye, here)
      );
      break;
    }
  }
  a.checked = fraction;
}
export function moveBody(w, a, dx, dz, extraBlock) {
  const r = a === w.player ? 0.28 : bodyRadius(a);
  function legal(x, z) {
    if (barrier(w, x, z, r || 0.18, true, a.x, a.z)) return false;
    // A boot can mount a stair or a small root, never the sheer side of a platform.
    if (r && footHeight(w, x, z) - footHeight(w, a.x, a.z) > 0.4) return false;
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

export function tossPhial(w, kind = 'cinder') {
  if (w.phialFlight || !takeItem(w, kind)) return false;
  const p = w.player,
    pitch = clamp(p.pitch || 0, -1.05, 1.12),
    speed = 10.9;
  w.phialFlight = {
    kind,
    x: p.x,
    y: (p.feetY ?? footHeight(w, p.x, p.z)) + 1.43,
    z: p.z,
    at: w.elapsed,
    vx: speed * Math.sin(p.yaw) * Math.cos(pitch),
    vz: speed * Math.cos(p.yaw) * Math.cos(pitch),
    vy: 2 + speed * Math.sin(pitch),
  };
  w.potionUntil = w.elapsed + 1.1;
  cue(w, 'throw', kind, p);
  return true;
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
    const from = [q.x, q.y, q.z],
      to = [x, y, z];
    const contact = w.actors.some((a) => {
      if (!a.alive || !isEnemy(a) || Math.hypot(a.x - x, a.z - z) > (a.type === 'dragon' ? 6.3 : 2.2))
        return false;
      return actorVolumes(a, w.elapsed).some((zone) => Number.isFinite(capsuleEntry(from, to, zone)));
    });
    if (!blocked) {
      q.x = x;
      q.y = Math.max(y, floor + 0.05);
      q.z = z;
    }
    if (!blocked && !contact && y > floor + 0.05 && w.elapsed - q.at < 3.5) continue;
    const burst = { x: q.x, y: q.y, z: q.z, at: w.elapsed };
    if (q.kind === 'veil' || q.kind === 'lure') {
      const mist = q.kind === 'veil';
      const groundY = footHeight(w, burst.x, burst.z);
      w.fieldMedicine ||= {};
      w.fieldMedicine[q.kind] = { ...burst, y: groundY, until: w.elapsed + (mist ? 18 : 12) };
      w.phialFlight = null;
      cue(w, 'potion', q.kind, burst);
      notify(
        w,
        mist ? 'Willow mist rolls along the ground.' : 'The bronze seed goes on ringing where it fell.'
      );
      return;
    }
    let struck = 0;
    for (const a of w.actors) {
      if (!a.alive || !isEnemy(a)) continue;
      if (Math.hypot(a.x - q.x, a.z - q.z) > (a.type === 'dragon' ? 16 : 13)) continue;
      const origin = [q.x, q.y + 0.09, q.z];
      // A cinder burst must reach the body through open air. Use the actual posed
      // body; a dragon's airborne throat and a wolf's flank occupy different heights.
      const exposed = actorVolumes(a, w.elapsed).some((zone) => {
        if (!['flank', 'head', 'throat', 'leg'].includes(zone.name)) return false;
        const center = lerpPoint(zone.a, zone.b, 0.5),
          d = Math.hypot(...center.map((v, i) => v - origin[i]));
        return d <= 10.5 + zone.r && !obstruction(w, origin, center, 0.025);
      });
      if (!exposed) continue;
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
