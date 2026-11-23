// The simulation owns the pace, path and obstacle responses. Each walking file
// samples that path in turn, so the 3,072 guests never need a single-frame rebuild.
import { rankPosition as rankAt, hordePosition, HORDE_COUNT, terrainHeight, recordProcessionView } from './world.mjs';
import { marchClock, roadFileIds, castleGuests, guestAtTable } from './procession.mjs';
import { marcherHeight, facingOfMarcher } from './marcher-body.mjs';
import { footHeight } from './travel.mjs';
const roadFiles = new Set(roadFileIds);
const identity = (id) => id % 107 === 0 ? 0 : 1 + ((Math.imul(id + 31, 19349663) >>> 6) % 7);

const WIDTH = 48,
  ROWS = HORDE_COUNT / WIDTH,
  PERIOD = 0.42;
function terrainSight(p, eye, q) {
  const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
  const head = terrainHeight(q.x, q.z) + 1.63;
  for (let step = 2; step < d; step += 7) {
    const u = step / d;
    if (terrainHeight(p.x + dx * u, p.z + dz * u) > eye + (head - eye) * u + 0.02) return false;
  }
  return true;
}
export function createProcessionView() {
  const x = new Float32Array(HORDE_COUNT),
    z = new Float32Array(HORDE_COUNT),
    y = new Float32Array(HORDE_COUNT),
    vx = new Float32Array(HORDE_COUNT),
    vz = new Float32Array(HORDE_COUNT),
    valid = new Uint8Array(ROWS),
    sampled = new Float64Array(ROWS),
    rowInfo = new Float32Array(ROWS * 6);
  let previous = null,
    tick = -Infinity,
    cursor = 0,
    now = 0;
  const ids = new Set(),
    selected = [];
  let picked = -Infinity,
    yaw = Infinity,
    prevCap = 0,
    prevX = 0,
    prevZ = 0;
  function update(w) {
    now = w.elapsed;
    if (w !== previous || now < tick || now - tick > 0.95) {
      valid.fill(0);
      ids.clear();
      selected.length = 0;
      picked = -Infinity;
      cursor = 0;
      previous = w;
      tick = -Infinity;
    }
    if (now === tick) return;
    const dt = now - tick;
    tick = now;
    const next = Object.create(w);
    next.elapsed = now + PERIOD;
    const budget = Number.isFinite(dt) ? Math.min(ROWS, Math.max(3, Math.ceil((ROWS * dt) / PERIOD))) : 5;
    // Seed unvisited ranks with their real centre and both shoulders. They are
    // immediately visible while their individually animated feet stream in.
    for (let row = 0; row < ROWS; row++) {
      if (valid[row]) continue;
      const id = row * WIDTH,
        o = row * 6,
        a = rankAt(w, id, true),
        b = rankAt(w, id + 46, true),
        c = rankAt(w, id + 47, true);
      rowInfo[o] = a.x;
      rowInfo[o + 1] = a.z;
      rowInfo[o + 2] = (c.x - b.x) / 47;
      rowInfo[o + 3] = (c.z - b.z) / 47;
      rowInfo[o + 4] = terrainHeight(a.x, a.z);
      valid[row] = 1;
      sampled[row] = now;
    }
    for (let i = 0; i < budget; i++) {
      const row = cursor++ % ROWS,
        oi = row * 6;
      sampled[row] = now;
      valid[row] = 2;
      for (let j = 0; j < WIDTH; j++) {
        const id = row * WIDTH + j,
          // This cache describes the rank even while one of its guests is at
          // table. Detached guests get their exact position separately below.
          a = rankAt(w, id, true),
          b = rankAt(next, id, true);
        x[id] = a.x;
        z[id] = a.z;
        y[id] = terrainHeight(a.x, a.z);
        vx[id] = (b.x - a.x) / PERIOD;
        vz[id] = (b.z - a.z) / PERIOD;
        if (!j) {
          rowInfo[oi] = a.x;
          rowInfo[oi + 1] = a.z;
          rowInfo[oi + 4] = y[id];
        }
      }
    }
  }
  function at(id, out) {
    const row = (id / WIDTH) | 0,
      o = row * 6;
    if (valid[row] === 2) {
      const dt = Math.min(0.65, Math.max(0, now - sampled[row]));
      out.x = x[id] + vx[id] * dt;
      out.z = z[id] + vz[id] * dt;
      out.y = y[id];
      out.vx = vx[id];
      out.vz = vz[id];
    } else {
      const file = id % WIDTH,
        lane = file % 2 ? (file + 1) / 2 : -file / 2;
      out.x = rowInfo[o] + rowInfo[o + 2] * lane;
      out.z = rowInfo[o + 1] + rowInfo[o + 3] * lane;
      out.y = rowInfo[o + 4];
      out.vx = rowInfo[o + 3];
      out.vz = -rowInfo[o + 2];
    }
    return out;
  }
  const scratch = {},
    best = new Float32Array(64),
    which = new Uint16Array(64);
  function near(w, aspect, time, cap, includeRanks = true) {
    if (w.lastBellCastAt != null) {
      ids.clear();
      const poses = [];
      if (time < w.lastBellCastAt + 3) {
        for (const q of (w.lastBellWitnesses || []).slice(0, cap)) {
          const { i, x, z, heading } = q;
          ids.add(i);
          poses.push({
            id: i, x, z, heading, y: footHeight(w, x, z), h: marcherHeight(i),
            w: 0.90 + ((i * 13) % 17) * 0.013, kind: identity(i), special: true,
            state: 'fallen', since: w.lastBellCastAt, ...facingOfMarcher(heading, x, z, w.player),
          });
        }
      }
      return { poses, ids };
    }
    if (includeRanks) update(w);
    const tableGuests = new Set(castleGuests(w));
    const singled = new Set([...roadFiles, ...tableGuests]);
    if (w.gateRelief) singled.add(w.gateRelief.i);
    if (w.hostActors) for (const actor of Object.values(w.hostActors)) singled.add(actor.i);
    const p = w.player,
      s = Math.sin(p.yaw),
      c = Math.cos(p.yaw),
      slope = aspect / 1.37;
    if (includeRanks && (
      picked === -Infinity ||
      now - picked >= 0.21 ||
      Math.abs(p.yaw - yaw) > 0.13 ||
      cap !== prevCap ||
      Math.abs(p.x - prevX) + Math.abs(p.z - prevZ) > 1.9
    )) {
      yaw = p.yaw;
      picked = now;
      prevCap = cap;
      prevX = p.x;
      prevZ = p.z;
      let count = 0;
      best.fill(Infinity);
      for (let row = 0; row < ROWS; row++) {
        const ox = rowInfo[row * 6] - p.x,
          oz = rowInfo[row * 6 + 1] - p.z;
        if (ox * ox + oz * oz > 99 * 99) continue;
        for (let id = row * WIDTH; id < (row + 1) * WIDTH; id++) {
          if (singled.has(id) || w.hostFallen?.[id]) continue;
          at(id, scratch);
          const dx = scratch.x - p.x,
            dz = scratch.z - p.z,
            dep = dx * s + dz * c,
            d = dx * dx + dz * dz;
          if (dep < 0.65 || d > minRadius() || Math.abs(dx * c - dz * s) > dep * slope + 0.7) continue;
          let j = Math.min(count, cap - 1);
          while (j > 0 && d < best[j - 1]) {
            best[j] = best[j - 1];
            which[j] = which[j - 1];
            j--;
          }
          best[j] = d;
          which[j] = id;
          count = Math.min(cap, count + 1);
        }
      }
      function minRadius() {
        return Math.min(70 * 70, best[cap - 1]);
      }
      selected.length = count;
      for (let i = 0; i < count; i++) selected[i] = which[i];
    }
    const poses = [];
    ids.clear();
    // A scout or a pursuer can be hundreds of metres away from the centre of
    // its old rank. Read these few bodies directly on every frame, even indoors.
    if (w.hostFallen) for (const id of Object.keys(w.hostFallen)) ids.add(Number(id));
    for (const id of singled) {
      ids.add(id);
      const actor = w.hostActors?.[id];
      if (w.hostFallen?.[id] && actor?.state !== 'fallen') continue;
      const q = hordePosition(w, id);
      const dx = q.x - p.x, dz = q.z - p.z, dep = dx * s + dz * c;
      if (dep < -1.1 || Math.abs(dx * c - dz * s) > Math.max(0, dep) * slope + 1.6 ||
          (id !== w.gateRelief?.i && dx * dx + dz * dz > 380 * 380)) continue;
      const feeding = !actor && w.gateClosedAt != null && tableGuests.has(id) && guestAtTable(w, id);
      let heading = w.ropeFallen && actor?.state !== 'fallen' ? undefined : actor?.heading;
      if (!Number.isFinite(heading)) {
        if (feeding) heading = Math.atan2(31.5 - q.x, 1517 - q.z);
        else {
          const later = Object.create(w);
          later.elapsed = w.elapsed + 0.33;
          const next = hordePosition(later, id);
          heading = Math.atan2(next.x - q.x, next.z - q.z);
        }
      }
      poses.push({
        id, x: q.x, y: footHeight(w, q.x, q.z), z: q.z, h: marcherHeight(id),
        w: 0.90 + ((id * 13) % 17) * 0.013, kind: identity(id), heading,
        state: w.ropeFallen && actor?.state !== 'fallen' ? 'return' : actor?.state || (feeding ? 'feed' : 'march'),
        since: actor?.since, until: actor?.until,
        roadFile: roadFiles.has(id), castleGuest: tableGuests.has(id), special: true,
        ...facingOfMarcher(heading, q.x, q.z, p),
      });
    }
    if (includeRanks) for (const id of selected) {
      if (ids.has(id)) continue;
      ids.add(id);
      at(id, scratch);
      const movementTime = marchClock(w, time, Math.floor(id / WIDTH));
      const reach = w.hostWarning?.i === id ? Math.min(1, Math.max(0, (time - w.hostWarning.at) / 0.88)) : 0;
      const phase = ((id * 37) % 101) * 0.117 + movementTime * (2.55 + ((id * 3) % 11) * 0.054);
      const heading = Math.atan2(scratch.vx, scratch.vz);
      // Sway is perpendicular to the march, independent of camera yaw.
      const sway = Math.sin(phase) * 0.029;
      poses.push({
        id, x: scratch.x + sway * Math.cos(heading), z: scratch.z - sway * Math.sin(heading),
        y: scratch.y + Math.cos(phase) ** 2 * 0.034, h: marcherHeight(id),
        w: 0.9 + ((id * 13) % 17) * 0.013, seed: id, kind: identity(id), heading,
        state: 'march', roadFile: false, castleGuest: false,
        ...facingOfMarcher(heading, scratch.x, scratch.z, p),
        rig: { type: 'marcher', phase: id * 0.78 + (movementTime - time) * 4.7 / 1.76, reach },
      });
    }
    recordProcessionView(w, poses, aspect);
    return { poses, ids };
  }
  const sight = new Uint8Array(ROWS / 4);
  let sightWorld = null,
    sightTime = -Infinity,
    sightX = Infinity,
    sightZ = Infinity;
  let lookout = null;
  function aboveHorizon(w, eye) {
    if (w.lastBellCastAt != null) return false;
    const p = w.player;
    // Downstream, ordinary depth testing handles individual ranks. In the
    // forest test the real ground across the valley instead of a trigger line.
    if (p.z >= 470 || w.raceWitness) return true;
    const source = w.renderSource || w;
    if (lookout && lookout.w === source && w.elapsed >= lookout.at && w.elapsed - lookout.at < 0.65 &&
        Math.hypot(p.x - lookout.x, p.z - lookout.z) < 2 && Math.abs(eye - lookout.eye) < 0.45) return lookout.clear;
    let clear = false;
    for (let row = 0; row < ROWS && !clear; row += 7) {
      for (const file of [0, 46, 47]) {
        if (terrainSight(p, eye, rankAt(w, row * WIDTH + file, true))) { clear = true; break; }
      }
    }
    lookout = { w: source, at: w.elapsed, x: p.x, z: p.z, eye, clear };
    return clear;
  }
  function visibility(w, eye) {
    const p = w.player;
    if (
      sightWorld === w &&
      now >= sightTime &&
      now - sightTime < 0.65 &&
      Math.hypot(p.x - sightX, p.z - sightZ) < 1.6
    )
      return sight;
    sightWorld = w;
    sightTime = now;
    sightX = p.x;
    sightZ = p.z;
    const q = {};
    for (let band = 0; band < sight.length; band++) {
      at((band * 4 + 2) * WIDTH, q);
      sight[band] = Math.hypot(q.x - p.x, q.z - p.z) <= 100 || terrainSight(p, eye, q) ? 1 : 0;
    }
    return sight;
  }
  return { update, at, near, visibility, aboveHorizon };
}

// Same-depth silhouettes share a draw call. Detailed walkers, walls, and trees
// are still depth sorted against those batches.
export function queueProcession(view, ray, queue, W, H, f, excluded, low, visible) {
  const layers = new Map(),
    p = {},
    width = low ? 3 : 2;
  for (let id = 0; id < HORDE_COUNT; id += width) {
    if (!visible[(id / (WIDTH * 4)) | 0] || excluded.has(id)) continue;
    view.at(id, p);
    const at = ray(p.x, p.y, p.z);
    if (!at) continue;
    const [x, y, z] = at,
      h = Math.min(H * 1.65, Math.max(1.28, (f * 1.8) / z)),
      r = Math.max(0.48, h * 0.18);
    if (x < -r || x > W + r || y < 0 || y - h > H) continue;
    const step = z < 14 ? 1 : z < 44 ? 2.6 : z < 100 ? 5 : 14,
      band = ((z / step) | 0) * step,
      tone = id % 7 === 0 ? 1 : 0,
      k = band * 2 + tone;
    let a = layers.get(k);
    if (!a) {
      a = [];
      layers.set(k, a);
      queue.push({
        d: band + step * 0.5,
        draw(ctx) {
          ctx.fillStyle = tone ? '#68665a' : '#465146';
          ctx.beginPath();
          for (let j = 0; j < a.length; j += 4) {
            const x = a[j],
              y = a[j + 1],
              h = a[j + 2],
              r = a[j + 3];
            if (h < 4) {
              ctx.rect(x - r, y - h, 2 * r, h);
              continue;
            }
            ctx.moveTo(x - r * 0.78, y);
            ctx.lineTo(x - r, y - h * 0.67);
            ctx.lineTo(x - r * 0.4, y - h * 0.78);
            ctx.lineTo(x - r * 0.46, y - h * 0.94);
            ctx.lineTo(x, y - h);
            ctx.lineTo(x + r * 0.46, y - h * 0.94);
            ctx.lineTo(x + r * 0.4, y - h * 0.77);
            ctx.lineTo(x + r, y - h * 0.69);
            ctx.lineTo(x + r * 0.67, y);
            ctx.lineTo(x, y - h * 0.29);
            ctx.closePath();
          }
          ctx.fill();
        },
      });
    }
    a.push(x, y, h, r);
  }
}
