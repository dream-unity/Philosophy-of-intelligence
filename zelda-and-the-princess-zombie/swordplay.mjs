import { isStolenBottle, quickItem, takeItem } from './inventory.mjs';
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
import { guestAtTable } from './procession.mjs';
import { princessBottleTarget, princessBottleEntry } from './witch-spell-contact.mjs';
export { bladeCoordinates, bladeFallbackGeometry, steelLength, gripToEdge } from './blade-pose.mjs';

export const isEnemy = (a) => ['wolf', 'dragon', 'troll'].includes(a.type);
export function cue(w, type, text, source) {
  const ev = { type };
  if (text) ev.text = text;
  if (source) {
    ev.x = source.x;
    ev.z = source.z;
    if (Number.isInteger(source.i)) ev.i = source.i;
  }
  w.events.push(ev);
}
// The ID and pose refer to the same individual in the march, in pursuit and
// on guard recovery. A boot on bridge planks stands at deck height.
function marcherTarget(w, walker) {
  const feeding = !walker.state && guestAtTable(w, walker.i);
  return {
    ...walker,
    type: 'marcher',
    id: 'host' + walker.i,
    marcher: walker,
    state: feeding ? 'feed' : walker.state,
    heading: feeding ? Math.atan2(31.5 - walker.x, 1517 - walker.z) : walker.heading,
    feetY: footHeight(w, walker.x, walker.z),
  };
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
        : foe.type === 'marcher'
          ? 'zombie'
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
    const opening = foe.state === 'stagger' || foe.state === 'recover';
    const points = a.kind === 'thrust' && (hit.zone === 'head' || opening) ? 2 : 1;
    hooks.hitMarcher?.(w, foe.marcher, points, a.kind, { ...a.contact, i: foe.i });
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
    if (!w.hostFallen?.[q.i] && Math.hypot(q.x - eye.x, q.z - eye.z) < 3) actors.push(marcherTarget(w, q));
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

const gravity = 9.81;
const maxFlightSeconds = 3.5;

function rescueThrowLift(w, handY, pitch, horizontalSpeed) {
  const p = w.player;
  const target = princessBottleTarget(w, w.elapsed);
  if (!target) return 2;
  const depth = (target.figure.x - p.x) * target.sin + (target.figure.z - p.z) * target.cos;
  const time = depth / horizontalSpeed;
  if (time < 0.04 || time >= maxFlightSeconds) return 2;

  // Aim from the crosshair, throw from the hand. When the crosshair is on
  // Xero, give the glass enough lift to cross that spot on its natural arc.
  // Direction is fixed at release; walls and intervening bodies can still stop it.
  const eyeY = handY + 0.23 + (w.reducedMotion ? 0 : p.gaitOffset || 0);
  const eye = [p.x, eyeY, p.z];
  const aim = [p.x + depth * target.sin, eyeY + depth * Math.tan(pitch), p.z + depth * target.cos];
  const hit = princessBottleEntry(target, eye, aim);
  if (!Number.isFinite(hit) || (obstruction(w, eye, aim, 0.025)?.u ?? Infinity) < hit) return 2;
  return (eyeY - handY) / time + gravity * time / 2;
}

export function tossPhial(w, kind = 'cinder') {
  if (w.phialFlight) return false;
  // The witch's glass returns unbroken after a miss. Reserving it in flight
  // also preserves the equipped pocket and makes an interrupted save resumable.
  const stolen = isStolenBottle(kind);
  if (stolen ? !quickItem(w, 'item:' + kind)?.count : !takeItem(w, kind)) return false;
  const p = w.player,
    pitch = clamp(p.pitch || 0, -1.05, 1.12),
    speed = stolen ? 17 : 10.9,
    horizontalSpeed = speed * Math.cos(pitch),
    handY = (p.feetY ?? footHeight(w, p.x, p.z)) + 1.43;
  w.phialFlight = {
    kind,
    x: p.x,
    y: handY,
    z: p.z,
    at: w.elapsed,
    vx: horizontalSpeed * Math.sin(p.yaw),
    vz: horizontalSpeed * Math.cos(p.yaw),
    vy: speed * Math.sin(pitch) + (kind === 'saveher' ? rescueThrowLift(w, handY, pitch, horizontalSpeed) : 2),
  };
  w.potionUntil = w.elapsed + 1.1;
  cue(w, 'throw', kind, p);
  return true;
}
function exposedToBurst(w, actor, origin, radius = 10.5) {
  // A visible head or limb can catch a cinder, while stone and the ground
  // shield anyone behind them. Only exposed parts of this model count.
  return actorVolumes(actor, w.elapsed).some((zone) => {
    if (!['torso', 'flank', 'head', 'throat', 'leg'].includes(zone.name)) return false;
    const center = lerpPoint(zone.a, zone.b, 0.5);
    const d = Math.hypot(...center.map((v, i) => v - origin[i]));
    return d <= radius + zone.r && !obstruction(w, origin, center, 0.025);
  });
}
function lastBellHeard(w, burst, hit, xero, host) {
  if (hit?.type === 'marcher' || hit?.type === 'princess') return true;
  const radius = 8.5;
  const origin = [burst.x, burst.y + 0.09, burst.z];
  // Xero can wake the spell while cursed, even if every ordinary zombie is
  // across the map. Only the marching host is on its list of victims.
  if (xero && Math.hypot(xero.x - burst.x, xero.z - burst.z) <= radius + 2) {
    const figure = princessBottleTarget(w, w.elapsed)?.figure;
    if (figure) {
      const centre = [figure.x, figure.y + figure.h * 0.55, figure.z];
      if (Math.hypot(centre[0] - origin[0], centre[1] - origin[1], centre[2] - origin[2]) <= radius &&
          !obstruction(w, origin, centre, 0.025)) return true;
    }
  }
  return host.inRange(w, burst, radius + 1.5)
    .some(walker => exposedToBurst(w, marcherTarget(w, walker), origin, radius));
}
export function advancePhial(w, dt, notify, host) {
  const q = w.phialFlight;
  if (!q) return;
  const slices = Math.max(1, Math.ceil((Math.hypot(q.vx, q.vy, q.vz) * dt) / 0.19));
  const drift = dt * Math.hypot(q.vx, q.vz);
  const bodies = w.actors.filter(
    (a) =>
      a.alive && isEnemy(a) && Math.hypot(a.x - q.x, a.z - q.z) < drift + (a.type === 'dragon' ? 6.3 : 2.2)
  );
  for (const walker of host?.inRange(w, q, drift + 1.3) || []) bodies.push(marcherTarget(w, walker));
  const hitZones = bodies.map(actor => ({ actor, zones: actorVolumes(actor, w.elapsed) }));
  const stolen = isStolenBottle(q.kind);
  const xero = stolen && w.actors.find(a => a.type === 'princess' && a.alive && !a.cured);
  const figure = xero && Math.hypot(xero.x - q.x, xero.z - q.z) < drift + 4 &&
    princessBottleTarget(w, w.elapsed);
  for (let i = 0; i < slices; i++) {
    const step = dt / slices,
      x = q.x + q.vx * step,
      z = q.z + q.vz * step,
      y = q.y + q.vy * step - 0.5 * gravity * step * step;
    q.vy -= gravity * step;
    const floor = footHeight(w, x, z);
    const from = [q.x, q.y, q.z],
      to = [x, y, z];
    const solid = obstruction(w, from, to, 0.05);
    let contact = figure ? princessBottleEntry(figure, from, to) : Infinity;
    let struckBody = Number.isFinite(contact) ? xero : null;
    for (const { actor, zones } of hitZones) for (const zone of zones) {
      const u = capsuleEntry(from, to, zone);
      if (u < contact) { contact = u; struckBody = actor; }
    }
    if (solid && solid.u <= contact) struckBody = null;
    // Stop just outside a struck wall so its near face can reflect the burst,
    // and the far side is still in shadow.
    const fraction = solid && solid.u <= contact ? Math.max(0, solid.u - 0.38) : Math.min(contact, 1);
    [q.x, q.y, q.z] = lerpPoint(from, to, fraction);
    q.y = Math.max(q.y, footHeight(w, q.x, q.z) + 0.05);
    if (!solid && !Number.isFinite(contact) && y > floor + 0.05 && w.elapsed - q.at < maxFlightSeconds) continue;
    const burst = { x: q.x, y: q.y, z: q.z, at: w.elapsed };
    if (stolen) {
      w.phialFlight = null;
      let tookEffect = false;
      if (q.kind === 'saveher' && struckBody?.type === 'princess') {
        tookEffect = host.rescue(w, struckBody, burst);
        if (tookEffect) cue(w, 'potion', 'cure', burst);
      } else if (q.kind === 'lastbell' && lastBellHeard(w, burst, struckBody, xero, host)) {
        host.silence(w, burst);
        tookEffect = true;
        cue(w, 'potion', 'lastbell', burst);
        notify(w, 'The note runs out across the valley. Every dead foot falls silent.', 5);
      }
      if (tookEffect) takeItem(w, q.kind);
      else {
        cue(w, 'potion', 'rebound', burst);
        notify(w, 'The unbroken bottle slips back into your bag.');
      }
      return;
    }
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
    let struck = 0,
      nearest,
      nearestDistance = Infinity;
    const origin = [q.x, q.y + 0.09, q.z];
    for (const a of w.actors) {
      if (!a.alive || !isEnemy(a)) continue;
      if (Math.hypot(a.x - q.x, a.z - q.z) > (a.type === 'dragon' ? 16 : 13)) continue;
      if (!exposedToBurst(w, a, origin)) continue;
      a.alive = false;
      struck++;
      cue(w, 'impact', a.type, a);
    }
    for (const walker of host?.inRange(w, burst, 11.5) || []) {
      if (!exposedToBurst(w, marcherTarget(w, walker), origin)) continue;
      if (!host.damage(w, walker, 3, 'cinder', burst)) continue;
      const d = Math.hypot(walker.x - q.x, walker.z - q.z);
      if (d < nearestDistance) {
        nearest = walker;
        nearestDistance = d;
      }
    }
    // One crack of burning cloth, even when a tightly packed rank falls together.
    if (nearest) cue(w, 'impact', 'zombie', nearest);
    w.phialFlight = null;
    w.cinder = burst;
    cue(w, 'potion', 'shatter', burst);
    notify(
      w,
      nearest
        ? 'Grey hands drop out of the cinder light.'
        : struck
          ? 'Cinder light scatters the beasts.'
          : 'A ring of cinder light fades.'
    );
    return;
  }
}
