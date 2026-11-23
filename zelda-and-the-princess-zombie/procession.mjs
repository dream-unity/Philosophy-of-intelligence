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
// These members take the old woodcutters' paths through the forest. Keep
// their actual IDs off rank centres and shoulders used to sample the main host.
export const roadFileIds = [310, 358, 406, 1230, 1278, 1326, 2182, 2230, 2278];
export const castleGuestIds = [7, 13, 19, 25, 31, 37];
function trailThrough(points) {
  let length = 0;
  const legs = points.slice(1).map(([x1, z1], j) => {
    const [x, z] = points[j];
    const size = Math.hypot(x1 - x, z1 - z);
    const start = length;
    length += size;
    return { x, z, start, end: length, dx: (x1 - x) / size, dz: (z1 - z) / size };
  });
  return { legs, length };
}
function followTrail(path, metres) {
  const station = clamp(metres, 0, path.length);
  const leg = path.legs.find((leg) => station <= leg.end) || path.legs.at(-1);
  return { x: leg.x + leg.dx * (station - leg.start), z: leg.z + leg.dz * (station - leg.start) };
}
// Three small files from the western wood meet the travelled road at the
// fork, hollow and downs. They use the real stepping stones even if the
// sluice is shut, and reach the queue from its western shoulder.
const hollowToFord = [[39,738],[7,803],[-69,885],[-126,966],[-125,1007]];
const stones = Array.from({length:16}, (_, i) => [-125 + Math.sin(i * 0.45) * 0.55, 1008 + i * 1.76]);
const beyondFord = [...stones,[-125,1036],[-119,1065],[-91,1089],[38,1120],[79,1137],[74,1228],
  [60,1259],[43,1280],[7,1312],[-12,1340],[-19,1365]];
const roadTrails = [
  [[-27,144],[17,187],[22,220],[84,338],[48,480],[80,610],...hollowToFord],
  [[-119,594],[-60,603],[75,615],...hollowToFord],
  [[-148,926],[-126,966],[-125,1007]],
].map((approach, k) => trailThrough([...approach, ...beyondFord, [-19 - k * 2.3, 1374 - k * 2.4]]));
export function roadFilePosition(w, id, clock, retreat) {
  const index = roadFileIds.indexOf(id);
  if (index < 0) return null;
  const file = Math.floor(index / 3), person = index % 3;
  const path = roadTrails[file], spacing = person * 2.24;
  const walked = Math.min(path.length - spacing, 5.5 - spacing + clock * [1.78, 1.66, 1.84][file]);
  return followTrail(path, walked - retreat);
}

// The six seats are shared in relays. The rank leaders stay with their
// following files and eat last, after the woodcutters reach the keep.
const seats = [[33.55,1515.6],[33.66,1517],[33.56,1518.65],[31.95,1519.1],[29.72,1518.22],[29.68,1516.63]];
const diners = [...castleGuestIds];
for (let id = 1; id < 3072; id++)
  if (id % 48 && !castleGuestIds.includes(id) && !roadFileIds.includes(id)) diners.push(id);
diners.push(...roadFileIds);
for (let id = 48; id < 3072; id += 48) diners.push(id);
diners.push(0);
const placeInLine = new Int16Array(3072).fill(-1);
for (let j = 0; j < diners.length; j++) placeInLine[diners[j]] = j;
const relayPeriod = 42;
const feastCycle = relayPeriod * (diners.length / 6 + 7);
const plans = new Map();
function waitingPlace(id) {
  if (roadFileIds.includes(id)) {
    const p = roadFilePosition(null, id, 1e6, 0);
    return [p.x, p.z];
  }
  const file = id % 48, line = Math.floor(id / 48);
  const lane = file % 2 ? (file + 1) / 2 : -file / 2;
  const slot = (lane + 25) % 5;
  if (line < 4) {
    const p = coursePoint(running - slot * 1.28 - line * 6.53, (Math.floor((lane + 25) / 5) - 5) * 0.83);
    return [p.x, p.z];
  }
  const p = coursePoint(running - 27 - (line - 4) * 1.16, lane * 0.91);
  return [p.x, p.z];
}
function visitPlan(id) {
  if (plans.has(id)) return plans.get(id);
  const order = placeInLine[id], k = order % 6, west = k > 2;
  const origin = waitingPlace(id);
  const queue = [origin];
  if (origin[1] < 1412) queue.push([29.1,1415.3]);
  queue.push([33.55,1433.35]);
  const path = trailThrough([...queue, [33.55,1436.4], [32.1,1451], [30.65,1466.9],
    [west ? 27.9 : 34.78,1492],[west ? 28.75 : 33.85,1514.75],
    ...(k === 3 ? [[29.75,1519.03]] : []), seats[k]]);
  const approach = trailThrough(queue).length + 1.65;
  const pace = 1.87 + (k % 3) * 0.045;
  const cross = Math.floor(order / 6) * relayPeriod + 21 + k * 3.9;
  const depart = cross - approach / pace;
  const seated = depart + path.length / pace;
  const leave = seated + 29;
  const finish = leave + path.length / pace;
  const plan = {path, depart, seated, leave, finish, pace};
  if (plans.size >= 128) plans.delete(plans.keys().next().value);
  plans.set(id, plan);
  return plan;
}
const arrivalAge = (w, time) => w.gateClosedAt == null ? -Infinity : (time - w.gateClosedAt) % feastCycle;
export function nextMealAge(w, minimum) {
  let next = Infinity;
  const cycleStart = Math.floor(minimum / feastCycle) * feastCycle;
  for (const id of diners) {
    if (w.hostFallen?.[id]) continue;
    const v = visitPlan(id);
    const base = cycleStart + (cycleStart + v.leave <= minimum ? feastCycle : 0);
    next = Math.min(next, Math.max(minimum, base + v.seated - 1.4));
    if (next === minimum) break;
    // Later files enter in order. Their first seat cannot open sooner.
    if (next < cycleStart + Math.floor(placeInLine[id] / 6) * relayPeriod && minimum < next) break;
  }
  return next;
}
function leftPlace(id, age) {
  const order = placeInLine[id];
  if (order < 0) return false;
  const downbeat = Math.floor(order / 6) * relayPeriod;
  // Limits include the walk from the outermost place in the assembled host.
  if (age < downbeat - 56 || age > downbeat + 229) return false;
  const visit = visitPlan(id);
  return age >= visit.depart && age < visit.finish;
}
function visitStation(v, age) {
  if (age < v.seated) return (age - v.depart) * v.pace;
  if (age < v.leave) return v.path.length;
  return v.path.length - (age - v.leave) * v.pace;
}
const guestCache = new WeakMap();
export function castleGuests(w) {
  const age = arrivalAge(w, w.ropeFallen ? w.dispersalAt ?? w.elapsed : w.elapsed);
  if (!Number.isFinite(age)) return noGuests;
  const last = guestCache.get(w);
  if (last?.age === age) return last.ids;
  const first = Math.max(0, Math.floor((age - 229) / relayPeriod) * 6);
  const end = Math.min(diners.length, (Math.floor((age + 56) / relayPeriod) + 1) * 6);
  const ids = [];
  for (let i = first; i < end; i++) if (leftPlace(diners[i], age)) ids.push(diners[i]);
  guestCache.set(w, {age, ids});
  return ids;
}
const noGuests = Object.freeze([]);
export function castleGuestPosition(w, id, time, retreat = 0) {
  const age = arrivalAge(w, time);
  if (!leftPlace(id, age)) return null;
  const v = visitPlan(id);
  const station = visitStation(v, age) - retreat;
  const p = followTrail(v.path, station);
  // Two can pass abreast at the wicket. Leaving guests keep the west half
  // while arriving guests keep the east; the lanes merge at their own seats.
  const lane = clamp(station / 3, 0, 1) * clamp((p.z - 1428) / 4, 0, 1) * clamp((1466 - p.z) / 4, 0, 1);
  p.x += (age >= v.leave || retreat ? -0.36 : 0.36) * lane;
  return p;
}
export function guestAtTable(w, id) {
  if (w.ropeFallen || w.hostFallen?.[id] || w.hostActors?.[id]) return false;
  const age = arrivalAge(w, w.elapsed);
  if (!leftPlace(id, age)) return false;
  const v = visitPlan(id);
  return age >= v.seated && age < v.leave;
}
export function guestWicketLift(w) {
  if (w.gateClosedAt == null) return 0;
  const clock = w.ropeFallen ? w.dispersalAt ?? w.elapsed : w.elapsed;
  const retreat = w.ropeFallen ? Math.max(0, w.elapsed - clock) * 1.82 : 0;
  let lift = 0;
  for (const id of castleGuests(w)) {
    if (w.hostFallen?.[id] || w.hostActors?.[id]) continue;
    const p = castleGuestPosition(w, id, clock, retreat);
    if (p && Math.abs(p.x - 33.55) < 1.2)
      lift = Math.max(lift, 2.42 * clamp((4.1 - Math.abs(p.z - 1435)) / 2.15, 0, 1));
  }
  return lift;
}
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
