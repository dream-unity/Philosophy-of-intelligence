import { terrainHeight, castleAltitude } from './geography.mjs';
import { fordStoneX, bridgeRise, footHeight } from './travel.mjs';
import { bladeCoordinates } from './swordplay.mjs';

export const saturated = (v) => Math.max(0, Math.min(1, v));
export function witchView(world, witch) {
  const dx = world.player.x - witch.x,
    dz = world.player.z - witch.z;
  return dx * Math.sin(witch.heading ?? Math.PI) + dz * Math.cos(witch.heading ?? Math.PI) < -0.25
    ? 'rear'
    : 'front';
}
export function species(tree) {
  const v = tree.variant ?? Math.abs(tree.seed * 17) % 11;
  if (tree.oak) return v === 1 ? 'hollow' : v === 2 ? 'birch' : 'oak';
  return v === 1 || v === 3 ? 'cedar' : 'pine';
}
export function groundDecals(w, t, footprints = []) {
  const p = w.player,
    items = [],
    close = (x, z, r) => Math.abs(x - p.x) < r && Math.abs(z - p.z) < r;
  function mark(x, z, y, rx, rz, kind, opacity) {
    items.push({ x, z, y, rx, rz, kind, opacity });
  }
  for (const a of w.actors) {
    if (!a.alive || !close(a.x, a.z, 72) || ['body', 'spring', 'bell'].includes(a.type)) continue;
    const air = a.type === 'dragon' ? (a.airHeight ?? 3.2) : 0,
      rad = a.type === 'troll' ? 1.05 : a.type === 'dragon' ? 1.66 : a.type === 'wolf' ? 0.66 : 0.45;
    const y = footHeight(w, a.x, a.z) + 0.045;
    // Broad, directional penumbra shrinks into a contact shadow beneath the feet.
    mark(
      a.x + 0.35 + air * 0.19,
      a.z + 0.27 + air * 0.15,
      y,
      rad * (1.75 + air * 0.18),
      rad * (1 + air * 0.1),
      'shade',
      0.55 / (1 + air * 0.075)
    );
    if (air < 0.35) mark(a.x, a.z, y + 0.012, rad * 0.9, rad * 0.52, 'shade', 0.68);
  }
  for (const [x, z, size] of [
    [-6.2, 6.6, 2.9],
    [6.2, 9.4, 2.9],
    [27.35, 1516.8, 2.65],
    [34.5, 1518.5, 2.7],
    [18.4, 1492, 2.4],
    [41.5, 1495, 2.4],
    [24.4, 1433.9, 2.6],
    [35.6, 1433.9, 2.6],
  ]) {
    if (close(x, z, 65))
      mark(
        x,
        z,
        footHeight(w, x, z) + 0.056,
        size,
        size * 0.92,
        'light',
        0.54 + 0.06 * Math.sin(t * 4.8 + x)
      );
  }
  for (const pt of footprints) {
    mark(pt.x, pt.z, terrainHeight(pt.x, pt.z) + 0.032, 0.14, 0.27, 'shade', 0.33);
  }
  const fire = w.cinder;
  if (fire && t - fire.at < 1.1 && t >= fire.at)
    mark(
      fire.x,
      fire.z,
      terrainHeight(fire.x, fire.z) + 0.075,
      2.1 + (t - fire.at) * 5,
      2.1 + (t - fire.at) * 5,
      'ember',
      (1 - (t - fire.at) / 1.1) * 0.9
    );
  return items;
}
export function fieldMotion(m, g, w, t) {
  const { beam, tri, quad, box } = g,
    p = w.player;
  // The chains pull a submerged bridge vertically into place, revealing wet timber.
  if (Math.abs(p.z - 1021) < 150) {
    const base = Math.floor(p.x / 16) * 16;
    const flow = (t * 0.96) % 16;
    for (let i = -12; i <= 12; i++)
      for (let row = 0; row < 4; row++) {
        const x = base + i * 8 + flow + Math.sin(row + i) * 1.35,
          z = 1011 + row * 6.2 + Math.sin(i * 1.7 + t * 0.74) * 1.45;
        const l = 0.8 + Math.abs(Math.sin(i + row)) * 2.8,
          y = 0.096 + Math.sin(x * 0.3 + t * 0.5) * 0.012;
        quad(
          m,
          [x, y, z],
          [x + 0.14, y, z + 0.091],
          [x + l, y, z + 0.11],
          [x + l - 0.12, y, z],
          row % 2 ? '93b9ac' : '79aaa7',
          false
        );
      }
    for (let i = 0; i < 16; i++) {
      const x = fordStoneX(i),
        z = 1008 + i * 1.76;
      for (let side of [-1, 1]) {
        const y = 0.105,
          phase = (t * 0.7 + i * 0.3) % 1,
          r = 0.68 + phase * 1.35;
        const a = [x + 0.18, y, z + side * 0.6],
          b = [x + r, y, z + side * (0.63 + phase * 0.4)],
          c = [x + r + 1.05, y, z + side * (0.55 + phase * 0.6)];
        beam(m, a, b, 0.027, 0.038, 'afc9bb', 3);
        beam(m, b, c, 0.038, 0.008, '91bcad', 3);
      }
    }
    if (p.z > 1008 && p.z < 1034 && Math.abs(p.x + 125) < 2.2) {
      for (let n = 0; n < 4; n++) {
        const a = (t * 0.85 + n * 0.25) % 1,
          rr = 0.25 + 1.7 * a;
        for (let i = 0; i < 6; i++) {
          const a0 = (i * Math.PI) / 6,
            a1 = ((i + 1) * Math.PI) / 6;
          const P = (q) => [p.x + Math.cos(q) * rr + 0.23, 0.11, p.z + Math.sin(q) * rr * 0.5];
          beam(m, P(a0), P(a1), 0.018 * (1 - a) + 0.004, 0.015 * (1 - a) + 0.003, 'a4c9bd', 3);
        }
      }
    }
    const rising = bridgeRise(w);
    if (rising > 0 && rising < 1) {
      for (const s of [-1, 1])
        for (const z of [1009, 1034])
          for (let i = 0; i < 4; i++) {
            const a = t * 3 + i * 1.3,
              x = 30 + s * (10 + 0.39 * i);
            beam(
              m,
              [x, 0.11, z],
              [x + Math.sin(a) * 0.23, 0.23 + Math.abs(Math.cos(a)) * 0.53, z + 0.12],
              0.045,
              0.025,
              'adc8bf',
              4
            );
          }
    }
  }
  if (w.gateClosedAt != null && Math.abs(p.z - 1435) < 155) {
    const trough = castleAltitude + 7.56 * (1 - saturated((w.elapsed - w.gateClosedAt) / 1.0));
    for (let k = -4; k <= 4; k++) {
      const x = 30 + k * 1.08;
      box(m, x, trough + 0.22, 1435, 0.16, 7.65, 0.18, '53525a');
      tri(
        m,
        [x - 0.16, trough + 0.26, 1434.91],
        [x, trough - 0.08, 1434.91],
        [x + 0.16, trough + 0.26, 1434.91],
        '958a77'
      );
    }
    for (let k = 0; k < 5; k++) box(m, 30, trough + 1.0 + k * 1.36, 1435, 9.15, 0.2, 0.25, '797375');
  }
  const flight = w.phialFlight;
  if (flight) {
    const { x, y, z } = flight,
      a = t * 7.9;
    g.rings(
      m,
      [
        [x, y - 0.105, z, 0.044],
        [x, y - 0.055, z, 0.08],
        [x, y + 0.055, z, 0.073],
        [x, y + 0.11, z, 0.032],
        [x, y + 0.14, z, 0.03],
      ],
      8,
      'e6aa62',
      a
    );
    g.rings(
      m,
      [
        [x, y + 0.1, z, 0.034],
        [x, y + 0.155, z, 0.028],
      ],
      7,
      '866246',
      a
    );
    beam(m, [x - 0.03, y - 0.045, z - 0.065], [x - 0.025, y + 0.04, z - 0.069], 0.009, 0.006, 'fff0bb', 4);
    for (let k = 0; k < 4; k++) {
      const u = k * 0.015,
        dx = flight.vx || 0,
        dz = flight.vz || 0;
      beam(
        m,
        [x - dx * u, y - (flight.vy || 0) * u, z - dz * u],
        [x - dx * (u + 0.01), y - (flight.vy || 0) * (u + 0.01), z - dz * (u + 0.01)],
        0.013,
        0.006,
        'efb471',
        3
      );
    }
  }
  if (w.cinder && t - w.cinder.at < 0.78 && t >= w.cinder.at) {
    const u = (t - w.cinder.at) / 0.78,
      { x, z } = w.cinder,
      gy = terrainHeight(x, z);
    for (let i = 0; i < 23; i++) {
      const a = i * 2.4,
        r = (1 + u * 6.5) * (0.65 + 0.35 * Math.sin(i * 0.77)),
        h = 0.2 + Math.sin(u * Math.PI) * (2.4 + (i % 4) * 0.4);
      beam(
        m,
        [x + Math.cos(a) * r, gy + h, z + Math.sin(a) * r],
        [x + Math.cos(a) * (r - 0.18), gy + h - 0.22, z + Math.sin(a) * (r - 0.18)],
        0.055 * (1 - u) + 0.02,
        0.012,
        i % 3 ? 'f2bd79' : 'd77e4c',
        3
      );
    }
  }
  const swing = w.attack;
  if (swing) {
    const u = (w.elapsed - swing.start) / swing.duration;
    if (u > 0.24 && u < 0.79 && swing.kind !== 'thrust' && !w.reducedMotion) {
      for (let i = 0; i < 3; i++) {
        const a = bladeCoordinates(w, Math.max(0.22, u - 0.039 * i)),
          b = bladeCoordinates(w, Math.max(0.21, u - 0.039 * (i + 1)));
        const inset = (v) => v.tip.map((n, k) => n + (v.base[k] - n) * 0.125);
        quad(m, a.tip, b.tip, inset(b), inset(a), i ? 'b0baab' : 'e5d8aa', false);
      }
    }
    if ((swing.wall || swing.hits?.length) && u > 0.29 && u < 0.84) {
      const at = swing.contact,
        pt = at ? [at.x, at.y, at.z] : bladeCoordinates(w, saturated(u - 0.08)).tip;
      for (let k = 0; k < 5; k++) {
        const a = k * 2.4 + u,
          b = [pt[0] + Math.cos(a) * 0.16, pt[1] + Math.sin(a) * 0.19, pt[2] + Math.sin(a + 0.4) * 0.12];
        beam(m, pt, b, 0.009, 0.002, swing.wall ? 'e5c688' : 'd9b899', 3);
      }
    }
  }
}
export function swordPlacement(world, W, H, project) {
  const attack = world.attack,
    f = attack ? (world.elapsed - attack.start) / attack.duration : 1,
    guard = world.guardUntil > world.elapsed;
  const blend = guard ? 1 : Math.min(saturated(f / 0.19), saturated((1 - f) / 0.19));
  if (blend <= 0) return null;
  const { grip, tip } = bladeCoordinates(world),
    a = project(...grip),
    b = project(...tip);
  if (!a || !b) return null;
  // The painted hilt and point register to the same two physical joints used for
  // hit detection. The wrist can leave the edge of the screen during a wide cut.
  const ax = 0.648,
    ay = 0.721,
    tx = 0.05,
    ty = 0.055;
  const vx = tx - ax,
    vy = ty - ay,
    dx = b[0] - a[0],
    dy = b[1] - a[1],
    len = vx * vx + vy * vy;
  const size = Math.min(H * 0.52, W * 0.65),
    idleX = W - size * 0.98,
    idleY = H - size * 0.96;
  let c = (dx * vx + dy * vy) / len,
    s = (dy * vx - dx * vy) / len;
  c = size + (c - size) * blend;
  s *= blend;
  a[0] = (idleX + ax * size) * (1 - blend) + a[0] * blend;
  a[1] = (idleY + ay * size) * (1 - blend) + a[1] * blend;
  return {
    map(u, v) {
      return [a[0] + (u - ax) * c - (v - ay) * s, a[1] + (u - ax) * s + (v - ay) * c];
    },
    c,
    s,
    x: a[0] - ax * c + ay * s,
    y: a[1] - ax * s - ay * c,
  };
}
