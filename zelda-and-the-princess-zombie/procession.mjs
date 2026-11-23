import { MAP, terrainHeight, clamp } from './geography.mjs';
const courses = [];
let running = 0;
for (let i = 1; i < MAP.horde.length; i++) {
  const [x, z] = MAP.horde[i - 1],
    [xx, zz] = MAP.horde[i],
    length = Math.hypot(xx - x, zz - z);
  courses.push({ start: running, x, z, dx: (xx - x) / length, dz: (zz - z) / length, length });
  running += length;
}
export const processionLength = running;
// The approach to the iron narrows to five abreast. All travellers share the
// same timetable, even when the player stops, doubles back, or leaves the road.
export function frontStation(clock, duration) {
  const fraction = clamp(clock / duration, 0, 1);
  // Ease from a walking pace to the final queue over the width of the bend.
  const bend = 0.61, transition = 0.065, after = 0.115;
  const before = (1 - after * (1 - bend)) / bend;
  const t = clamp((fraction - bend + transition) / (2 * transition), 0, 1);
  const tail = Math.max(0, fraction - bend - transition);
  const slow = transition * t * t + tail;
  return running * (fraction * before + (after - before) * slow);
}
export function stillTheColumn(w, seconds) {
  const at = w.elapsed;
  const start = w.hostPauseAt ?? at, end = w.hostPauseUntil ?? at;
  w.hostPauseSpent = (w.hostPauseSpent || 0) + clamp(at - start, 0, Math.max(0, end - start));
  w.hostPauseAt = at;
  w.hostPauseUntil = Math.max(end, at + seconds);
}
export function marchClock(w, time, rank = 0) {
  const start = w.hostPauseAt, end = w.hostPauseUntil;
  // Word travels from the point to the rear. The leading body is the race clock.
  const wave = rank * 0.033;
  const pause = start == null ? 0 : clamp(time - start - wave, 0, Math.max(0, end - start));
  return Math.max(0, time - (w.raceGrace || 0) - (w.hostPauseSpent || 0) - pause);
}
const normals = MAP.horde.map((_, i) => {
  const a = courses[Math.max(0, i - 1)],
    b = courses[Math.min(i, courses.length - 1)];
  const n = Math.hypot(a.dx + b.dx, a.dz + b.dz);
  return { x: (a.dz + b.dz) / n, z: -(a.dx + b.dx) / n };
});
export const marchLegs = courses;
export function coursePoint(metres, offset) {
  let i = 0;
  while (i < courses.length - 1 && metres > courses[i].start + courses[i].length) i++;
  const leg = courses[i],
    along = metres - leg.start,
    t = clamp(along / leg.length, 0, 1),
    blend = t * t * (3 - 2 * t);
  const a = normals[i],
    b = normals[i + 1];
  return {
    x: leg.x + leg.dx * along + (a.x + (b.x - a.x) * blend) * offset,
    z: leg.z + leg.dz * along + (a.z + (b.z - a.z) * blend) * offset,
  };
}
// The column encounters remnants of a freight cart and a fallen wayside cross.
// Their collision radius and the opening the walkers leave use the same records.
export const marchObstructions = [
  { station: 224, offset: 4.7, r: 1.18, kind: 'cart' },
  { station: 368, offset: -7.3, r: 1.03, kind: 'cross' },
].map((q) => ({ ...q, ...coursePoint(q.station, q.offset) }));
export function skirtWreckage(station, lane) {
  for (const o of marchObstructions) {
    const gap = Math.abs(station - o.station);
    if (gap > 11) continue;
    const dx = lane - o.offset,
      side = dx < 0 ? -1 : 1;
    const u = clamp((11 - gap) / 6, 0, 1);
    lane += side * (o.r + 0.76) * Math.exp(-Math.abs(dx) / 9) * u * u * (3 - 2 * u);
  }
  return lane;
}
const smooth = (v) => {
  v = clamp(v, 0, 1);
  return v * v * (3 - 2 * v);
};
export function stragglerSchedule(index) {
  const file = index % 48,
    row = Math.floor(index / 48);
  // Individuals on the shoulders of the march mend a shoe or steady a companion.
  if (!((file === 46 && row % 9 === 3) || (file === 47 && row % 11 === 4))) return null;
  return { begins: 64 + ((row * 13) % 138), wait: 6 + (row % 5), side: file === 46 ? -1 : 1 };
}
export function marchPace(index, clock) {
  const q = stragglerSchedule(index);
  if (!q) return null;
  const t = clock - q.begins;
  if (t < -3 || t > q.wait + 38) return null;
  const shoulder = smooth((t + 3) / 3) * (1 - smooth((t - q.wait - 34) / 4));
  const delay = t <= 0 ? 0 : t < q.wait ? t : q.wait * (1 - smooth((t - q.wait) / 34));
  return { clock: clock - delay, shoulder: q.side * 2.1 * shoulder, waiting: t >= 0 && t < q.wait };
}
export function drawMarchObstructions(m, g, w) {
  for (const o of marchObstructions) {
    if (Math.hypot(w.player.x - o.x, w.player.z - o.z) > 75) continue;
    const x = o.x,
      z = o.z,
      y = terrainHeight(x, z);
    if (o.kind === 'cross') {
      g.box(m, x, y + 0.24, z, 1.36, 0.48, 1.28, '656955');
      g.beam(m, [x - 0.54, y + 0.25, z - 0.48], [x + 0.54, y + 1.0, z + 0.57], 0.24, 0.18, '8c8872', 5);
      g.beam(m, [x - 0.14, y + 0.83, z + 0.61], [x + 0.67, y + 0.82, z - 0.03], 0.12, 0.12, '8e8c78', 5);
    } else {
      for (const side of [-1, 1]) {
        const axle = [x + side * 0.67, y + 0.56, z];
        for (let j = 0; j < 8; j++) {
          const angle = (j * Math.PI) / 4,
            next = ((j + 1) * Math.PI) / 4;
          const rim = [axle[0], axle[1] + Math.sin(angle) * 0.51, z + Math.cos(angle) * 0.51];
          const end = [axle[0], axle[1] + Math.sin(next) * 0.51, z + Math.cos(next) * 0.51];
          g.beam(m, rim, end, 0.07, 0.07, '595040', 5);
          if (j % 2 === 0) g.beam(m, axle, rim, 0.038, 0.029, '816043', 4);
        }
      }
      for (let j = 0; j < 4; j++)
        g.beam(
          m,
          [x - 0.48 + j * 0.25, y + 0.36, z - 0.78],
          [x - 0.48 + j * 0.25, y + 0.74, z + 0.73],
          0.12,
          0.1,
          '775838',
          4
        );
    }
  }
}
