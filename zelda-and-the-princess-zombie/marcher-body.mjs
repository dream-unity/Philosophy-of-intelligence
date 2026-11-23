const unit = (n) => Math.max(0, Math.min(1, n));
const ease = (n) => { const v = unit(n); return v * v * (3 - 2 * v); };

export const marcherHeight = (id) => 1.64 + ((id * 19) % 31) * 0.011;
function castPhase(walker, time) {
  const since = walker.since ?? time;
  return unit((time - since) / Math.max(0.1, (walker.until ?? since + 1.15) - since));
}
export function marcherReach(walker, time) {
  const age = Math.max(0, time - (walker.since ?? time));
  if (walker.state === 'windup') {
    const u = castPhase(walker, time);
    return 0.14 + 0.53 * ease((u - 0.42) / 0.58);
  }
  if (walker.state === 'recover') return 0.13 + 0.54 * (1 - ease(age / 0.52));
  if (walker.state === 'feed') return 0.43;
  return walker.state === 'pursue' ? 0.23 : 0.12;
}

export function marcherLean(walker, time) {
  const age = Math.max(0, time - (walker.since ?? time));
  if (walker.state === 'fallen') return 1.49 * ease(age / 0.60);
  const recoil = walker.state === 'stagger' ? Math.sin(Math.PI * unit(age / 0.55)) : 0;
  // Neighbouring seats arrive in the same file. Offset their feeding cycle
  // by costume-independent identity so some lift their faces while others bow.
  const id = walker.i ?? walker.id;
  const feeding = walker.state === 'feed' ? 0.12 + 0.84 * ease(
    0.54 + 0.65 * Math.sin(time * (1.43 + (id % 7) * 0.044) + id * 2.39996),
  ) : 0;
  const drawBack = walker.state === 'windup' ? Math.sin(Math.PI * unit(castPhase(walker, time) / 0.62)) : 0;
  return feeding * 0.82 - recoil * 0.32 - drawBack * 0.16 + (marcherReach(walker, time) - 0.12) * 0.36;
}

export function facingOfMarcher(heading, x, z, player) {
  const dx = player.x - x, dz = player.z - z;
  const d = Math.max(0.001, Math.hypot(dx, dz));
  const cos = (dx * Math.sin(heading) + dz * Math.cos(heading)) / d;
  return {
    view: cos > 0.52 ? 'front' : cos < -0.58 ? 'back' : 'side',
    flip: Math.sin(heading) * dz - Math.cos(heading) * dx > 0,
  };
}

// Art skins bend in world metres. The lower spine, wrists and head can approach
// the player independently; turning the camera in place never moves the feet.
export function marcherBodyFaces(pose, player, time, ratio, uv = [0, 0, 1, 1]) {
  const { x, y, z, h, heading, state } = pose;
  const dx = player.x - x, dz = player.z - z;
  const d = Math.max(0.001, Math.hypot(dx, dz));
  const rightX = -dz / d, rightZ = dx / d;
  const forwardX = Math.sin(heading), forwardZ = Math.cos(heading);
  const walking = ['march', 'pursue', 'lured', 'return'].includes(state);
  const phase = time * (state === 'pursue' ? 6.7 : 4.7) + pose.id * 0.78;
  const stride = walking ? Math.sin(phase) : 0;
  const fallen = state === 'fallen';
  const reach = marcherReach(pose, time);
  const tilt = marcherLean(pose, time);
  const gather = state === 'windup' ? Math.sin(Math.PI * castPhase(pose, time)) : 0;
  const c = Math.cos(tilt), s = Math.sin(tilt);
  const width = h * pose.w * ratio;
  const columns = d < 12 ? 4 : 2, rows = d < 12 ? 5 : 3;
  const vertices = [], faces = [];
  for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
    const u = col / columns, v = row / rows;
    const body = 1 - v;
    const leg = unit((v - 0.61) / 0.36);
    const hand = unit((Math.abs(u - 0.5) - 0.16) / 0.28) * unit(1 - Math.abs(v - 0.55) / 0.30);
    const upper = ease((body - 0.14) / 0.51);
    const side = (u - 0.5) * width * (pose.flip ? -1 : 1) + (body * stride * 0.019);
    const foot = stride * (u < 0.5 ? 1 : -1) * leg;
    const forward = h * body * s * (fallen || upper) + (reach - 0.12) * hand + foot * 0.13;
    const lift = 0.026 + 0.064 * Math.max(0, foot) + 0.014 * Math.abs(stride) +
      ((reach - 0.12) * 0.37 + gather * 0.17) * hand;
    vertices.push([
      x + rightX * side + forwardX * forward,
      y + h * body * (1 - (1 - c) * (fallen || upper)) + lift,
      z + rightZ * side + forwardZ * forward,
      uv[0] + u * uv[2], uv[1] + v * uv[3],
    ]);
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const tl = row * (columns + 1) + col, bl = tl + columns + 1;
    faces.push([vertices[bl], vertices[bl + 1], vertices[tl + 1], vertices[tl]]);
  }
  return faces;
}

export function marcherAtlasCell(kind) {
  return [(kind % 4) / 4, Math.floor(kind / 4) / 2, 1 / 4, 1 / 2];
}
