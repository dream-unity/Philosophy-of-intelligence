import { clamp } from './geography.mjs';
import {
  coursePoint,
  marchLegs,
  processionLength,
  roadFileIds,
  roadFilePosition,
  marchClock,
} from './procession.mjs';

const pace = 1.55;
const order = Array.from({ length: 3072 }, (_, i) => {
  const file = i % 48,
    lane = file % 2 ? (file + 1) / 2 : -file / 2;
  const offset = Math.floor(i / 48) * 6.53 + ((lane + 25) % 5) * 1.28;
  return { i, offset: roadFileIds.includes(i) ? Infinity : offset };
}).sort((a, b) => a.offset - b.offset || a.i - b.i);
const front = order.filter((entry) => entry.offset === 0);
const selection = new WeakMap();
const available = (w, i) => !w.hostFallen?.[i] && !w.hostActors?.[i];
export function livingLead(w) {
  if (w.lastBellCastAt != null) return null;
  for (const entry of front) if (available(w, entry.i)) return entry;
  const now = w.elapsed,
    cached = selection.get(w);
  if (
    cached &&
    now >= cached.at &&
    now - cached.at < 0.28 &&
    cached.epoch === w.hostRosterEpoch &&
    cached.fallen === w.hostFallen &&
    cached.actors === w.hostActors &&
    (!cached.entry || available(w, cached.entry.i))
  )
    return cached.entry;
  let entry = order.find((q) => available(w, q.i)) || null;
  if (entry && entry.offset > 55) {
    // The woodcutters' files have their own pace. Once the near courtyard
    // ranks are gone, a walker at the western spur can beat the rear guard.
    const duration = w.raceDuration ?? 395;
    const clock = Math.max(duration, marchClock(w, now));
    const row = Math.floor(entry.i / 48);
    const gathering =
      row < 4 ? 0 : clamp(((clock - duration) * 1.23) / Math.max(12, (row - 4) * 4.77 + 8), 0, 1);
    let best = Number.isFinite(entry.offset)
      ? clock + ((1 - gathering) * entry.offset + gathering * (27 + (row - 4) * 1.16)) / pace
      : Infinity;
    for (const runner of roadReserves) {
      if (!available(w, runner.i)) continue;
      const due = Math.max(clock, runner.ready) + runner.lastLeg;
      if (due < best) {
        best = due;
        entry = runner;
      }
    }
  }
  selection.set(w, { at: now, entry, epoch: w.hostRosterEpoch, fallen: w.hostFallen, actors: w.hostActors });
  return entry;
}
function pathToIron(start) {
  const points = [{ x: start.x, z: start.z, metres: 0 }];
  function via(x, z) {
    const prev = points[points.length - 1],
      d = Math.hypot(x - prev.x, z - prev.z);
    if (d > 0.001) points.push({ x, z, metres: prev.metres + d });
  }
  // A replacement from deeper in the queue follows the bends up the spur.
  // Near the grille keep the lane already beneath the walker's feet.
  if (start.z < 1421) {
    let station = 0,
      best = Infinity;
    for (const leg of marchLegs) {
      const t = clamp((start.x - leg.x) * leg.dx + (start.z - leg.z) * leg.dz, 0, leg.length);
      const d = Math.hypot(leg.x + leg.dx * t - start.x, leg.z + leg.dz * t - start.z);
      if (d < best) {
        best = d;
        station = leg.start + t;
      }
    }
    for (let s = Math.min(station + 4, processionLength); s < processionLength; s += 4) {
      const q = coursePoint(s, 0);
      via(q.x, q.z);
    }
  }
  via(start.z >= 1421 ? clamp(start.x, 25.9, 34.1) : 30, 1433);
  return points;
}
const roadReserves = roadFileIds.map((i) => {
  const end = roadFilePosition(null, i, 10000, 0);
  const atEnd = (t) => {
    const q = roadFilePosition(null, i, t, 0);
    return Math.hypot(q.x - end.x, q.z - end.z) < 0.001;
  };
  let a = 0,
    b = 10000;
  for (let step = 0; step < 25; step++) {
    const mid = (a + b) / 2;
    if (atEnd(mid)) b = mid;
    else a = mid;
  }
  const path = pathToIron(end);
  return { i, offset: Infinity, ready: b, lastLeg: path[path.length - 1].metres / pace };
});
function planRelief(w, entry, clock, nominalAt) {
  const begin = Math.max(clock, roadReserves.find((r) => r.i === entry.i)?.ready ?? clock);
  const start = begin > clock ? roadFilePosition(w, entry.i, begin, 0) : nominalAt(w, entry.i);
  const path = pathToIron(start);
  return { i: entry.i, begin, path, due: begin + path[path.length - 1].metres / pace };
}
export function reliefPosition(w, i, time, retreat) {
  const v = w.gateRelief;
  if (!v || v.i !== i) return null;
  const clock = marchClock(w, time);
  if (clock < v.begin) return null;
  const last = v.path[v.path.length - 1];
  // After touching the iron the new leader walks back to its waiting place.
  const age = w.gateClosedAt == null ? 0 : Math.max(0, time - w.gateClosedAt - 0.6);
  const metres = Math.min(last.metres, (clock - v.begin) * pace) - retreat - age * pace;
  if (metres < 0) return null;
  for (let j = 1; j < v.path.length; j++) {
    const p = v.path[j];
    if (metres <= p.metres) {
      const a = v.path[j - 1],
        t = (metres - a.metres) / (p.metres - a.metres);
      return { x: a.x + (p.x - a.x) * t, z: a.z + (p.z - a.z) * t };
    }
  }
  return { x: last.x, z: last.z };
}
export function gateForecast(w, duration, nominalAt) {
  if (w.gateClosedAt != null) return 0;
  const entry = livingLead(w);
  if (!entry) return Infinity;
  const clock = marchClock(w, w.elapsed);
  const pause = Math.max(0, (w.hostPauseUntil || 0) - w.elapsed);
  if (entry.offset === 0) return Math.max(0, duration - clock) + pause;
  const active = w.gateRelief;
  if (active && available(w, active.i)) return Math.max(0, active.due - clock) + pause;
  // Read-only forecasts also work on saved games which have not run a tick.
  const settled = Math.max(duration, clock);
  const future = { ...w, elapsed: w.elapsed + settled - clock + pause, gateRelief: null };
  const plan = planRelief(future, entry, settled, nominalAt);
  return Math.max(0, plan.due - clock) + pause;
}
export function gateArrival(w, duration, nominalAt) {
  if (w.lastBellCastAt != null || w.gateClosedAt != null) return null;
  const clock = marchClock(w, w.elapsed);
  if (clock < duration) return null;
  const entry = livingLead(w);
  if (entry?.offset === 0) {
    const at = w.gateWaitSince == null ? w.elapsed - (clock - duration) : w.elapsed;
    return { at, i: entry.i };
  }
  w.gateWaitSince ??= w.elapsed;
  let v = w.gateRelief;
  if (!v || !available(w, v.i)) {
    delete w.gateRelief;
    if (!entry) return null;
    v = w.gateRelief = planRelief(w, entry, clock, nominalAt);
  }
  if (clock < v.due) return null;
  return { i: v.i, at: w.elapsed - (clock - v.due) };
}
