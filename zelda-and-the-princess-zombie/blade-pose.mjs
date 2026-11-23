// One physical sword in metres. The image, emergency mesh, sparks and contact
// sweep all use this grip, guard and steel point, including the rebound off stone.
import { clamp, terrainHeight } from './geography.mjs';
import { barrier, footHeight } from './travel.mjs';

export const steelLength = 1.31,
  gripToEdge = 0.185;
const edgeRadius = 0.025;
export const smooth = (t) => ((t = clamp(t, 0, 1)), t * t * (3 - 2 * t));
export const mix = (a, b, t) => a + (b - a) * t;
export const lerpPoint = (a, b, t) => a.map((c, i) => mix(c, b[i], t));
const norm = (v) => {
  const size = Math.hypot(...v) || 1;
  return v.map((c) => c / size);
};
const add = (p, v, size) => p.map((c, i) => c + v[i] * size);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const shortAngle = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
export function observer(w) {
  const p = w.player;
  return { x: p.x, z: p.z, y: p.feetY ?? footHeight(w, p.x, p.z), yaw: p.yaw || 0, pitch: p.pitch || 0 };
}
export function interpolateEye(a, b, t) {
  return {
    x: mix(a.x, b.x, t),
    y: mix(a.y, b.y, t),
    z: mix(a.z, b.z, t),
    yaw: a.yaw + shortAngle(a.yaw, b.yaw) * t,
    pitch: mix(a.pitch, b.pitch, t),
  };
}
function rig(grip, direction) {
  const dir = norm(direction);
  return { grip, base: add(grip, dir, gripToEdge), tip: add(grip, dir, gripToEdge + steelLength) };
}
function restingPose(aspect) {
  // Establish a visible wrist and point on both handheld and wide displays.
  // Unproject the two artwork anchors, then choose the tip depth for one rigid blade.
  const size = Math.min(0.52, 0.65 * aspect);
  const ray = (x, y) => [(aspect * 0.5 - x * size) / 0.685, (-0.5 + y * size) / 0.685, 1];
  const grip = ray(0.332, 0.239).map((v) => v * 0.39);
  const v = norm(ray(0.93, 0.905)),
    shadow = v.reduce((d, x, i) => d + x * grip[i], 0);
  const depth =
    shadow +
    Math.sqrt((steelLength + gripToEdge) ** 2 - grip.reduce((d, x) => d + x * x, 0) + shadow * shadow);
  const direction = norm(v.map((n, i) => n * depth - grip[i]));
  return { grip, direction };
}
export function nominalBlade(w, fraction, eye = observer(w)) {
  const a = w.attack,
    guard = (w.guardUntil || 0) > w.elapsed && (!a || w.elapsed >= w.strikeUntil);
  let t = clamp(fraction ?? 1, 0, 1);
  if (a?.stopAt != null && t > a.stopAt && t < 1) {
    const rebound = smooth((t - a.stopAt) / (1 - a.stopAt));
    t = a.stopAt * (1 - rebound);
  }
  const active = a && t < 1,
    side = a?.side || 1,
    thrust = a?.kind === 'thrust';
  const swing = active ? smooth((t - 0.2) / 0.48) : 0,
    reach = active ? Math.sin(Math.PI * smooth(t)) : 0;
  const settle = smooth((1 - t) / 0.2);
  const engage = active ? Math.min(thrust ? smooth((t - 0.05) / 0.25) : smooth(t / 0.18), settle) : 0;
  const rest = restingPose(clamp(w.viewAspect || 1.6, 0.34, 3.2));
  const parryAge = w.elapsed - (w.parriedAt ?? -10);
  const catchLift = guard && parryAge >= 0 && parryAge < 0.32 ? Math.sin((Math.PI * parryAge) / 0.32) : 0;
  const gx = guard
    ? -0.14 - 0.045 * catchLift
    : mix(rest.grip[0], 0.31 + (active && !thrust ? side * (0.32 - swing * 0.59) : 0), engage);
  const gy = guard ? -0.14 + 0.095 * catchLift : mix(rest.grip[1], -0.37 + 0.085 * reach, engage);
  const thrustDrive = active && thrust ? smooth((t - 0.19) / 0.3) * smooth((0.91 - t) / 0.33) : 0;
  const gz = guard
    ? 0.31
    : mix(
        rest.grip[2],
        0.31 + (active && thrust ? -0.12 * engage + 0.78 * thrustDrive : 0.28 * reach),
        engage
      );
  let [tx, ty, tz] = rest.direction;
  if (guard) {
    tx = 0.82 - 0.24 * catchLift;
    ty = 0.67 + 0.24 * catchLift;
    tz = 0.4 - 0.1 * catchLift;
  } else if (active) {
    const angle = thrust ? -0.215 : side * (1.03 - 2.1 * swing);
    tx = mix(tx, Math.sin(angle), engage);
    ty = mix(ty, thrust ? -0.06 : 0.3 - 0.67 * swing, engage);
    tz = mix(tz, Math.cos(angle), engage);
  }
  const sy = Math.sin(eye.yaw),
    cy = Math.cos(eye.yaw),
    sp = Math.sin(eye.pitch),
    cp = Math.cos(eye.pitch);
  function axes(x, y, z) {
    const f = z * cp - y * sp;
    return [x * cy + f * sy, y * cp + z * sp, -x * sy + f * cy];
  }
  return rig(add([eye.x, eye.y + 1.64, eye.z], axes(gx, gy, gz), 1), axes(tx, ty, tz));
}
function sampleSolids(w, p, radius) {
  if (p[1] < terrainHeight(p[0], p[2]) + 0.018) return 'stone';
  return barrier(w, p[0], p[2], radius, false, undefined, undefined, p[1]);
}
export function obstruction(w, from, to, radius = edgeRadius) {
  const length = Math.hypot(...from.map((n, i) => to[i] - n));
  // Short steps also resolve the thin rods of a bell rack. Check the hilt
  // itself: beginning a cut with the hand beside a thin wall may otherwise tunnel.
  const steps = Math.max(1, Math.ceil(length / 0.065));
  for (let i = 0; i <= steps; i++) {
    const u = i / steps,
      point = lerpPoint(from, to, u),
      material = sampleSolids(w, point, radius);
    if (material) return { u, point, material };
  }
  return null;
}
export function inspectBlade(w, blade, eye) {
  const shoulder = [eye.x, eye.y + 1.39, eye.z];
  const atHand = obstruction(w, shoulder, blade.grip, 0.045);
  if (atHand) return { ...atHand, u: 0 };
  const hilt = obstruction(w, blade.grip, blade.base, 0.033);
  if (hilt) return { ...hilt, u: 0 };
  return obstruction(w, blade.base, blade.tip);
}
export function hazardFreeBlade(w, pose, eye) {
  if (!inspectBlade(w, pose, eye)) return pose;
  const shoulder = [eye.x, eye.y + 1.36, eye.z];
  let grip = pose.grip;
  const atHand = obstruction(w, shoulder, grip, 0.05);
  if (atHand) grip = lerpPoint(shoulder, grip, Math.max(0, atHand.u - 0.1));
  const direction = norm(pose.tip.map((c, i) => c - pose.grip[i]));
  // Cant toward a vertical guard until the blade fits. Preserve the blade's
  // length and the angle at the grip, even when standing beside a stone wall.
  const upright = [-Math.sin(eye.yaw) * 0.038, 1, -Math.cos(eye.yaw) * 0.038];
  for (let i = 1; i <= 8; i++) {
    const hi = i / 8,
      test = rig(grip, lerpPoint(direction, upright, hi));
    if (inspectBlade(w, test, eye)) continue;
    // Find the last legal angle at the surface. A coarse octave alone makes the
    // steel jump away from its own spark when it glances off a post.
    let blocked = (i - 1) / 8,
      clear = hi,
      nearest = test;
    for (let n = 0; n < 5; n++) {
      const mid = (blocked + clear) / 2,
        probe = rig(grip, lerpPoint(direction, upright, mid));
      if (inspectBlade(w, probe, eye)) blocked = mid;
      else {
        clear = mid;
        nearest = probe;
      }
    }
    return nearest;
  }
  return rig(shoulder, upright);
}
export function bladeCoordinates(w, fraction) {
  const a = w.attack,
    t = clamp(fraction ?? (a ? (w.elapsed - a.start) / a.duration : 1), 0, 1),
    eye = observer(w);
  if (a?.eye && t < 1) {
    eye.yaw = a.eye.yaw;
    eye.pitch = a.eye.pitch;
  }
  return hazardFreeBlade(w, nominalBlade(w, t, eye), eye);
}
export function bladeFallbackGeometry(w, ribbonOnly = false) {
  const { base, grip, tip } = bladeCoordinates(w),
    axis = norm(tip.map((c, i) => c - grip[i]));
  const look = [Math.sin(w.player.yaw || 0), 0, Math.cos(w.player.yaw || 0)];
  let side = cross(axis, look);
  if (Math.hypot(...side) < 0.15) side = cross(axis, [0, 1, 0]);
  side = norm(side);
  const normal = norm(cross(side, axis)),
    vertices = [];
  const triangle = (a, b, c, rgb) => {
    for (const p of [a, b, c]) vertices.push(...p, ...rgb);
  };
  const strip = (a, b, wa, wb, colour) => {
    const l = add(a, side, -wa),
      r = add(a, side, wa),
      l2 = add(b, side, -wb),
      r2 = add(b, side, wb);
    triangle(l, r, l2, colour);
    triangle(l2, r, r2, colour);
  };
  if (!ribbonOnly) {
    const spine = add(lerpPoint(base, tip, 0.42), normal, 0.014),
      left = add(base, side, -0.04),
      right = add(base, side, 0.04);
    triangle(left, spine, tip, [0.73, 0.84, 0.86]);
    triangle(spine, right, tip, [0.46, 0.58, 0.69]);
    triangle(left, right, spine, [0.63, 0.74, 0.79]);
    const pommel = add(grip, axis, -0.135),
      quillon = add(base, axis, -0.018);
    strip(pommel, quillon, 0.027, 0.022, [0.31, 0.22, 0.16]);
    strip(add(quillon, axis, -0.018), add(quillon, axis, 0.015), 0.132, 0.13, [0.71, 0.56, 0.31]);
    strip(add(pommel, axis, -0.027), pommel, 0.034, 0.043, [0.74, 0.58, 0.34]);
    for (let i = 0; i < 5; i++)
      strip(
        add(grip, axis, -0.105 + i * 0.045),
        add(grip, axis, -0.093 + i * 0.045),
        0.029,
        0.029,
        [0.51, 0.4, 0.29]
      );
  }
  const knot = add(add(grip, axis, 0.095), side, 0.032),
    r = Math.sin(w.elapsed * 4.45) * 0.013;
  triangle(add(knot, side, -0.037), add(knot, axis, 0.028), add(knot, side, 0.039), [0.31, 0.48, 0.62]);
  const hanging = [knot[0] + r, knot[1] - 0.102, knot[2] + 0.015],
    short = [knot[0] - 0.031, knot[1] - 0.088, knot[2] - 0.009];
  strip(knot, hanging, 0.018, 0.008, [0.25, 0.4, 0.53]);
  strip(add(knot, side, -0.013), short, 0.012, 0.005, [0.36, 0.52, 0.64]);
  return new Float32Array(vertices);
}
