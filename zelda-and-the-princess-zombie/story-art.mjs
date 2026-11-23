// Small reusable scene meshes for the gallery, spring and final tableau. All positions are in world metres.
import { castleAltitude, terrainHeight } from './geography.mjs';
export { storyHandPose } from './story.mjs';

const tau = Math.PI * 2;
const clamp = (a) => Math.max(0, Math.min(1, a));
const smooth = (a) => ((a = clamp(a)), a * a * (3 - 2 * a));
const mix = (a, b, t) => a + (b - a) * t;
const hallY = castleAltitude + 0.17;
const tones = ['low', 'mid', 'high'];
const dist = (p, x, z) => Math.hypot(p.x - x, p.z - z);
const stoneColour = ['777371', '968f83', '827e7a', '989086'];
function ellipsoid(m, g, x, y, z, rx, ry, rz, col, n = 10) {
  const levels = [];
  for (let i = 0; i <= 6; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / 6;
    levels.push([
      x,
      y + ry * Math.sin(a),
      z,
      Math.max(0.004, rx * Math.cos(a)),
      Math.max(0.004, rz * Math.cos(a)),
    ]);
  }
  g.rings(m, levels, n, col, 0.15);
}
function circularIron(m, g, x, y, z, r, thick, color, axis = 'z') {
  const points = Array.from({ length: 12 }, (_, i) => {
    const q = (i * tau) / 12;
    return axis === 'x'
      ? [x, y + r * Math.sin(q), z + r * Math.cos(q)]
      : [x + r * Math.cos(q), y + r * Math.sin(q), z];
  });
  points.forEach((a, i) => g.beam(m, a, points[(i + 1) % 12], thick, thick, color, 5));
}
export function storyStatic(m, g) {
  const { box, beam, tri, quad, lantern } = g,
    base = castleAltitude,
    deck = base + 10.25;
  const post = (x, y, z, h = 1.22) => {
    box(m, x, y, z, 0.18, h, 0.18, '695543');
    box(m, x, y + h - 0.08, z, 0.24, 0.09, 0.24, 'c5aa75');
  };
  // The climb follows visible cut-stone treads. The open southern edge lines up with the walkable ramp.
  const steps = 38;
  for (let j = 0; j < steps; j++) {
    const y = base + ((j + 1) * 10.25) / steps,
      z = 1441 + ((j + 0.5) * 16) / steps;
    box(m, 18.1, y - 0.31, z, 4.12, 0.31, 16 / steps + 0.01, stoneColour[j % 4]);
  }
  for (const x of [16.07, 20.12]) {
    tri(m, [x, base, 1441], [x, base, 1457], [x, deck, 1457], '756f69');
    beam(m, [x, base + 0.9, 1441], [x, deck + 0.9, 1457], 0.072, 0.072, '8f7355', 6);
    for (let j = 0; j < 7; j++) post(x, base + (j * 10.25) / 6, 1441 + (j * 16) / 6, 0.94);
    beam(m, [x, base + 0.12, 1441], [x, deck - 0.12, 1457], 0.28, 0.3, '776b60', 6);
  }
  // The side of this tower is solid down to the courtyard, just like its collision boundary.
  box(m, 15.4, base, 1460.4, 13.58, 10.15, 6.77, '716b63');
  for (let i = 1; i < 7; i++)
    box(m, 15.4, base + i * 1.41, 1460.4, 13.62, 0.075, 6.81, i === 5 ? 'a19682' : '807b70');
  box(m, 15.4, deck - 0.53, 1460.4, 13.6, 0.53, 6.8, '8b8273');
  for (let j = 0; j < 22; j++)
    box(m, 8.89 + j * 0.623, deck - 0.01, 1460.4, 0.605, 0.048, 6.56, j % 3 ? '826e54' : '917b60');
  for (const x of [9.15, 15, 21.6]) {
    for (const z of [1457.44, 1463.24]) {
      box(m, x, base, z, 0.8, 10.15, 0.8, '65584b');
      beam(m, [x, deck - 3.45, z], [x + (x > 15 ? -2 : 2), deck - 0.48, z], 0.22, 0.22, '75634f', 6);
    }
  }
  // Slate gables shelter the winding gear. The west wall opens above the shutter sills.
  const eaves = deck + 3.4,
    ridge = eaves + 1.12;
  const south = 1456.92,
    north = 1463.97;
  for (const z of [south, north]) {
    tri(m, [8.47, eaves, z], [15.4, ridge, z], [22.33, eaves, z], '73634d');
    beam(m, [8.51, eaves, z], [22.29, eaves, z], 0.12, 0.12, '665141', 6);
    for (const x of [8.72, 15.72, 20.3, 22.08]) box(m, x, deck, z, 0.23, 3.42, 0.23, '685542');
  }
  const peak = [15.4, ridge + 0.04],
    west = [8.38, eaves - 0.06],
    east = [22.43, eaves - 0.06];
  for (const side of [west, east]) {
    quad(
      m,
      [side[0], side[1], south - 0.21],
      [peak[0], peak[1], south - 0.21],
      [peak[0], peak[1], north + 0.21],
      [side[0], side[1], north + 0.21],
      side === west ? '555b59' : '696c63'
    );
    for (let i = 0; i <= 4; i++) {
      const z = south + ((north - south) * i) / 4;
      beam(m, [side[0], side[1] - 0.08, z], [peak[0], peak[1] - 0.08, z], 0.08, 0.08, '705a43', 6);
    }
  }
  for (const z of [1458.26, 1460.4, 1462.59]) {
    box(m, 22.07, deck, z, 0.26, 3.38, 0.18, '685744');
    box(m, 22.07, deck, z, 0.25, 1.15, 2.04, '8b8371');
    beam(m, [22.03, deck + 1.1, z - 0.88], [22.03, eaves - 0.02, z + 0.88], 0.06, 0.06, '877455', 5);
  }
  box(m, 15.4, deck, 1463.7, 13.43, 1.17, 0.25, '8c8373');
  box(m, 8.76, deck, 1460.4, 0.25, 0.86, 6.5, '8b8571');
  function rail(x1, z1, x2, z2) {
    const len = Math.hypot(x2 - x1, z2 - z1),
      n = Math.max(1, Math.ceil(len / 1.75));
    for (let i = 0; i <= n; i++) post(mix(x1, x2, i / n), deck, mix(z1, z2, i / n));
    for (const h of [0.48, 1.08]) beam(m, [x1, deck + h, z1], [x2, deck + h, z2], 0.054, 0.054, '8a704b', 6);
  }
  rail(8.68, 1457.13, 15.95, 1457.13);
  rail(20.29, 1457.13, 22.1, 1457.13);
  rail(22.1, 1457.15, 22.1, 1463.75);
  rail(8.68, 1463.75, 22.1, 1463.75);
  rail(8.68, 1457.15, 8.68, 1463.74);
  for (const z of [1457.45, 1459.24, 1461.27, 1463.25]) {
    box(m, 9.22, deck, z, 0.28, 3.45, 0.18, '685044');
    box(m, 9.22, deck + 3.28, z, 1.1, 0.26, 0.32, 'b29567');
  }
  box(m, 9.22, deck + 3.33, 1460.36, 0.4, 0.31, 6.12, '826b50');
  for (let i = 0; i < 3; i++) {
    const z = 1458.15 + i * 2;
    box(m, 9.64, deck + 0.02, z, 0.72, 0.71, 0.72, '5d564b');
    circularIron(m, g, 9.85, deck + 1.04, z, 0.27, 0.048, 'af9061', 'x');
    beam(m, [9.85, deck + 1.1, z], [9.85, deck + 2.94, z], 0.029, 0.03, 'bfa679', 5);
  }
  // An open registry, broken cuffs and a royal seal tell the captivity story within arm's reach.
  box(m, 40, hallY + 0.8, 1473.48, 2.8, 0.15, 1.78, '574138');
  for (const x of [38.91, 41.09])
    for (const z of [1472.88, 1474.06]) box(m, x, hallY, z, 0.16, 0.86, 0.16, '4c3d34');
  const y = hallY + 0.975;
  quad(
    m,
    [39.31, y, 1473.03],
    [39.34, y, 1473.79],
    [40, y + 0.13, 1473.78],
    [40, y + 0.13, 1473.05],
    'd5c08e'
  );
  quad(
    m,
    [40, y + 0.13, 1473.05],
    [40, y + 0.13, 1473.78],
    [40.74, y, 1473.8],
    [40.67, y, 1473.02],
    'c7b27f'
  );
  for (let i = 0; i < 6; i++) {
    const z = 1473.18 + i * 0.08;
    beam(m, [39.44, y + 0.035, z], [39.88, y + 0.124, z + 0.008], 0.009, 0.013, '6d5e44', 4);
    beam(m, [40.15, y + 0.12, z], [40.55, y + 0.045, z], 0.011, 0.009, '7a5d45', 4);
  }
  circularIron(m, g, 41.05, hallY + 1.08, 1473.38, 0.12, 0.024, '747677');
  circularIron(m, g, 41.04, hallY + 1.09, 1473.68, 0.12, 0.024, '83837c', 'x');
  lantern(m, 38.87, hallY + 0.96, 1473.72, 0.78);
  // Stair-mark with a cast relief of three different bell mouths, visible from the gate.
  for (let j = 0; j < 3; j++) {
    const x = 16.36 + j * 0.27;
    tri(
      m,
      [x - 0.115, base + 0.55, 1441.01],
      [x, base + 0.83 - j * 0.04, 1441.01],
      [x + 0.115, base + 0.55, 1441.01],
      'd8ba76'
    );
  }
}

function xeroModel(m, g, pose) {
  const { rings, beam, tri } = g,
    feed = pose === 'feeding',
    living = pose === 'cured',
    lunge = pose === 'lunge';
  const f = feed ? 0.52 : lunge ? 0.26 : 0;
  const silk = ['423e55', '534454', '493f53', '5f5061', '58485f'];
  rings(
    m,
    [
      [0, 0.03, 0.09, 0.48, 0.42],
      [0, 0.18, 0.085, 0.49, 0.44],
      [0, 0.72, 0.02, 0.29, 0.24],
      [0, 1, 0.0, 0.17, 0.15],
      [f * 0.31, 1.24, -0.02, 0.23, 0.18],
      [f * 0.77, 1.4 - f * 0.42, -0.04, 0.29, 0.17],
      [f * 0.88, 1.48 - f * 0.49, -0.065, 0.112, 0.12],
    ],
    16,
    (_, k) => silk[k % 5],
    0.13,
    0.055
  );
  for (let i = 0; i < 12; i++) {
    const a = (i * tau) / 12,
      x = Math.cos(a),
      z = Math.sin(a),
      col = i % 3 ? '736478' : 'ac9561';
    beam(m, [x * 0.44, 0.15, 0.09 + z * 0.4], [x * 0.21, 0.78, 0.02 + z * 0.2], 0.012, 0.018, col, 5);
    tri(
      m,
      [x * 0.46, 0.04, 0.09 + z * 0.4],
      [x * 0.39, 0.29, 0.09 + z * 0.38],
      [(x + 0.05) * 0.48, 0.04, 0.09 + (z + 0.04) * 0.43],
      col
    );
  }
  const hx = f * 0.96,
    hy = 1.73 - f * 0.68,
    hz = -0.085 - f * 0.17,
    skin = living ? 'c3a38b' : '9d998b';
  ellipsoid(m, g, hx, hy, hz, 0.155, 0.188, 0.146, skin, 14);
  ellipsoid(m, g, hx, hy + 0.1, hz + 0.04, 0.166, 0.148, 0.147, '3d3236', 14);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const px = hx + s * (0.11 + 0.025 * i);
      const a = [px, hy + 0.16, hz + 0.005 + i * 0.016],
        b = [px + s * 0.03, hy - 0.09, hz + 0.028],
        c = [px - s * 0.012, hy - 0.29 - i * 0.015, hz + 0.06];
      beam(m, a, b, 0.045, 0.032, i % 2 ? '534346' : '695248', 7);
      beam(m, b, c, 0.032, 0.006, '493b3d', 6);
    }
    beam(
      m,
      [hx + s * 0.024, hy + 0.016, hz - 0.14],
      [hx + s * 0.101, hy + 0.033, hz - 0.127],
      0.013,
      0.017,
      '4a3b3c'
    );
    beam(
      m,
      [hx + s * 0.035, hy - 0.005, hz - 0.148],
      [hx + s * 0.09, hy - 0.004, hz - 0.132],
      0.008,
      0.009,
      living ? '775c4d' : 'ccb896'
    );
    const sh = [s * 0.22 + f * 0.73, 1.36 - f * 0.44, -0.04],
      el = [s * 0.32 + f * 0.88, 1.07 - f * 0.38, -0.085 - f * 0.16];
    const hand = [s * 0.28 + f * 1.35, living ? 1.14 : 1.03, -(living || lunge ? 0.54 : 0.2) - f * 0.19];
    beam(m, sh, el, 0.105, 0.073, '675469', 10);
    beam(m, el, hand, 0.078, 0.043, skin, 8);
    ellipsoid(m, g, ...hand, 0.065, 0.054, 0.084, skin, 8);
  }
  beam(m, [hx, hy + 0.027, hz - 0.115], [hx, hy - 0.045, hz - 0.18], 0.033, 0.015, skin, 6);
  rings(
    m,
    [
      [hx, hy + 0.126, hz, 0.168, 0.147],
      [hx, hy + 0.156, hz, 0.165, 0.148],
    ],
    12,
    'b59a66'
  );
  for (let j = 0; j < 7; j++) {
    const a = (j * tau) / 7;
    beam(
      m,
      [hx + 0.15 * Math.cos(a), hy + 0.15, hz + 0.13 * Math.sin(a)],
      [hx + 0.166 * Math.cos(a), hy + 0.23 + (j % 3) * 0.023, hz + 0.145 * Math.sin(a)],
      0.027,
      0.002,
      'd6b67a',
      6
    );
  }
}

function hartModel(m, g, state, phase = 0) {
  const { beam, tri } = g;
  const standing = state === 'stand',
    folded = state === 'fold',
    stride = standing ? 0.36 * Math.sin(phase * tau) : 0;
  const h = standing ? 0.99 : folded ? 0.55 : 0.26,
    neck = standing ? 0.42 : folded ? 0.22 : 0.04;
  const coat = '89624c',
    dark = '644b40',
    leg = '795848';
  ellipsoid(m, g, 0, h, 0, 0.29, 0.3, 0.65, coat, 14);
  ellipsoid(m, g, -0.015, h + 0.04, -0.27, 0.29, 0.28, 0.36, '967057', 14);
  for (let i = 0; i < 8; i++) {
    const s = i % 2 ? -1 : 1,
      z = -0.29 + (i >> 1) * 0.16;
    ellipsoid(m, g, s * 0.246, h + 0.11 + (i % 3) * 0.025, z, 0.042, 0.024, 0.061, 'bb9370', 7);
  }
  const base = [-0.01, h + 0.05, -0.42],
    n = [-0.13, h + 0.18 + neck, -0.66],
    face = [-0.16, h + 0.23 + neck, -0.82];
  beam(m, base, n, 0.204, 0.123, coat, 12);
  ellipsoid(m, g, ...face, 0.142, 0.129, 0.199, 'a18064', 12);
  beam(
    m,
    [face[0], face[1] - 0.018, face[2] - 0.075],
    [face[0], face[1] - 0.065, face[2] - 0.259],
    0.111,
    0.069,
    'a58d73',
    9
  );
  ellipsoid(m, g, face[0], face[1] - 0.064, face[2] - 0.254, 0.069, 0.044, 0.045, '4d4540', 9);
  for (const side of [-1, 1]) {
    const [x, y, z] = face;
    ellipsoid(m, g, x + side * 0.118, y + 0.026, z - 0.055, 0.023, 0.027, 0.035, '322e29', 8);
    tri(
      m,
      [x + side * 0.077, y + 0.077, z + 0.06],
      [x + side * 0.256, y + 0.247, z + 0.13],
      [x + side * 0.143, y + 0.059, z + 0.146],
      '806248'
    );
    const a = [x + side * 0.08, y + 0.084, z + 0.046],
      b = [x + side * 0.24, y + 0.37, z + 0.2],
      c = [x + side * 0.38, y + 0.54, z + 0.4];
    beam(m, a, b, 0.032, 0.025, 'a08b66', 7);
    beam(m, b, c, 0.026, 0.009, 'c2b18d', 7);
    beam(
      m,
      [x + side * 0.134, y + 0.192, z + 0.086],
      [x + side * 0.2, y + 0.36, z - 0.04],
      0.023,
      0.005,
      'c1ad86',
      6
    );
    beam(
      m,
      [x + side * 0.29, y + 0.426, z + 0.273],
      [x + side * 0.36, y + 0.58, z + 0.199],
      0.019,
      0.003,
      'c1ad86',
      6
    );
    for (const fore of [-1, 1]) {
      const hip = [side * 0.19, h - 0.06, fore * 0.38],
        knee = [
          side * (standing ? 0.23 : 0.31),
          standing ? 0.54 : folded ? 0.22 : 0.13,
          fore * 0.38 + fore * side * stride * 0.54 + (standing ? 0 : 0.14),
        ];
      const hoof = [
        side * (standing ? 0.255 : folded ? 0.33 : 0.49),
        standing ? Math.max(0.05, fore * side * stride * 0.42) : 0.052,
        fore * 0.38 + fore * side * stride + (standing ? 0.08 : -0.3),
      ];
      beam(m, hip, knee, 0.076, 0.046, leg, 8);
      beam(m, knee, hoof, 0.044, 0.028, dark, 7);
      ellipsoid(m, g, ...hoof, 0.038, 0.043, 0.067, '49403a', 7);
    }
  }
}

function reed(m, g, bloom) {
  const stem = bloom ? '707c42' : '4c493c';
  for (let j = 0; j < 6; j++) {
    const a = (j * tau) / 6 + 0.22,
      x = Math.cos(a),
      z = Math.sin(a),
      tip = bloom ? 0.59 : 0.22;
    g.beam(m, [0, 0.02, 0], [x * 0.12, tip * 0.68, z * 0.12], 0.019, 0.014, stem, 5);
    g.beam(
      m,
      [x * 0.12, tip * 0.68, z * 0.12],
      [x * (bloom ? 0.31 : 0.18), tip * (bloom ? 0.93 : 0.49), z * (bloom ? 0.31 : 0.18)],
      0.014,
      0.003,
      stem,
      5
    );
    g.tri(
      m,
      [x * 0.047, 0.08, z * 0.05],
      [x * 0.26 - 0.05, tip * 0.78, z * 0.23 + 0.04],
      [x * 0.43, tip * 0.53, z * 0.38],
      bloom ? '92ab56' : '5d5543'
    );
  }
  if (bloom) {
    g.beam(m, [0, 0.12, 0], [0.01, 0.63, 0.014], 0.013, 0.01, stem, 6);
    ellipsoid(m, g, 0.01, 0.63, 0.014, 0.043, 0.12, 0.04, 'bdd69a', 8);
  }
}
export function storyModels(model, g) {
  const models = {};
  for (const pose of ['feeding', 'offer', 'lunge', 'cured'])
    models['xero-' + pose] = model((m) => xeroModel(m, g, pose));
  models['hart-rest'] = model((m) => hartModel(m, g, 'rest'));
  models['hart-fold'] = model((m) => hartModel(m, g, 'fold'));
  for (let j = 0; j < 6; j++) models['hart-step-' + j] = model((m) => hartModel(m, g, 'stand', j / 6));
  for (const folded of [false, true]) {
    models[folded ? 'moth-fold' : 'moth-open'] = model((m) => {
      g.beam(m, [0, 0.011, -0.042], [0, 0.014, 0.056], 0.011, 0.015, 'c29b66', 6);
      for (const side of [-1, 1]) {
        const w = side * (folded ? 0.031 : 0.105),
          lift = folded ? 0.094 : 0.038;
        g.tri(m, [0, 0.02, -0.031], [w, lift, -0.092], [w * 0.87, lift + 0.006, 0.022], 'f3dba6');
        g.tri(m, [0, 0.025, 0.058], [w * 0.87, lift + 0.006, 0.022], [0, 0.02, -0.031], 'c3a16d');
        g.tri(
          m,
          [w * 0.72, lift * 0.83, -0.044],
          [w * 0.55, lift * 0.7, -0.028],
          [w * 0.71, lift * 0.82, -0.012],
          '755f4d'
        );
      }
    });
  }
  models['reed-cold'] = model((m) => reed(m, g, false));
  models['reed-living'] = model((m) => reed(m, g, true));
  models['relay-shutter'] = model((m) => {
    for (let i = 0; i < 3; i++) {
      g.box(m, 0, i * 0.414, 0, 0.12, 0.4, 1.64, ['4e5147', '5e6256', '56594d'][i]);
      g.box(m, -0.02, i * 0.414 + 0.33, 0, 0.15, 0.047, 1.65, '897b59');
    }
    g.box(m, 0, 0.04, -0.63, 0.19, 1.18, 0.074, '867456');
    g.box(m, 0, 0.04, 0.63, 0.19, 1.18, 0.074, '867456');
  });
  models['relay-handle'] = model((m) => {
    g.beam(m, [0, 0, 0], [0.38, 0.16, 0], 0.047, 0.039, '957a52', 8);
    ellipsoid(m, g, 0.39, 0.17, 0, 0.073, 0.069, 0.071, 'd7bb82', 9);
  });
  models['vial-silver'] = model((m) => {
    g.rings(
      m,
      [
        [0, 0, 0, 0.024],
        [0, 0.022, 0, 0.054],
        [0, 0.112, 0, 0.05],
        [0, 0.14, 0, 0.024],
        [0, 0.18, 0, 0.025],
      ],
      10,
      'cde6ce'
    );
    g.rings(
      m,
      [
        [0, 0.167, 0, 0.027],
        [0, 0.176, 0, 0.029],
      ],
      10,
      'd3c190'
    );
  });
  models['rope-coil'] = model((m) => {
    for (let k = 0; k < 18; k++) {
      const a = k * 0.61,
        b = (k + 1) * 0.61,
        r = 0.05 + k * 0.017,
        s = r + 0.017;
      g.beam(
        m,
        [Math.cos(a) * r, 0.025, Math.sin(a) * r],
        [Math.cos(b) * s, 0.025, Math.sin(b) * s],
        0.023,
        0.023,
        'ae986f',
        5
      );
    }
  });
  return models;
}

function bellPull(t) {
  const since = (((t - 6) % 37) + 37) % 37;
  return Math.max(...[0, 0.46, 0.92].map((k) => Math.exp(-(((since - k - 0.055) / 0.13) ** 2))));
}
export function storyFigure(w, t = w.elapsed, ground = terrainHeight) {
  const p = w.actors?.find((a) => a.type === 'princess' && a.alive);
  if (!p) return null;
  const q = w.sequence,
    u = q?.progress || 0,
    pull = bellPull(t);
  let key = 'feeding',
    x = p.x,
    z = p.z,
    dy = 0,
    h = 1.72,
    flip = false;
  const rightX = Math.cos(w.player.yaw),
    rightZ = -Math.sin(w.player.yaw);
  if (p.cured || (q?.id === 'saved' && u > 0.19)) {
    key = 'cured';
    h = 1.84;
    x = p.x + 0.23;
    z = p.z + 0.16;
    dy = 0.02;
    // Xero kneels to release the cord first. Only afterwards does she offer Zelda her hand.
    dy -= 0.23 * (1 - smooth((u - 0.42) / 0.26)) * (q ? 1 : 0);
    x += 0.26 * (1 - smooth((u - 0.55) / 0.18)) * (q ? 1 : 0);
  } else if (q?.id === 'feast') {
    key = u < 0.2 ? 'offer' : 'lunge';
    h = 1.87 + 0.1 * Math.sin(u * Math.PI);
    x = p.x;
    z = p.z;
    dy = -0.13 * Math.sin(clamp((u - 0.2) / 0.6) * Math.PI);
  } else if (w.milestones?.reveal || q?.id === 'saved') {
    key = 'offer';
    h = 1.88;
    x = p.x;
    z = p.z;
    dy = 0.018 * Math.sin(t * 1.55);
  } else {
    // In the painted kneeling pose the mouth lies 38% of the image width left of centre.
    // Keep it over the hart's flank even when the player circles the table.
    const flankX = 31.16,
      flankZ = 1516.62,
      chew = Math.sin(t * 2.5);
    flip = (flankX - p.homeX) * rightX + (flankZ - p.homeZ) * rightZ >= 0;
    const mouthOffset = (flip ? 1 : -1) * h * (832 / 680) * 0.38;
    x = flankX - mouthOffset * rightX + 0.029 * chew;
    z = flankZ - mouthOffset * rightZ + 0.015 * Math.cos(t * 2.5);
    dy = 0.168 + 0.037 * chew - 0.072 * pull;
  }
  return { key, x, y: ground(p.homeX, p.homeZ) + 0.15 + dy, z, h, flip, w: 1 };
}
export function storyReplaces(w, type) {
  return type === 'princess' || type === 'body' || type === 'rope';
}

export function storyPieces(w, t = w.elapsed, ground = terrainHeight) {
  const p = w.player,
    list = [];
  const put = (key, x, y, z, rot = 0, scale = 1) => list.push({ key, x, y, z, rot, scale });
  if (dist(p, 0, 9) < 22) {
    const witch = w.actors.find((a) => a.type === 'witch' && a.alive);
    if (witch) {
      const flight = 0.5 + 0.5 * Math.sin(t * 0.73 + 0.65),
        settle = smooth((0.66 - flight) / 0.46);
      const x = witch.x + 0.34 + (1 - settle) * 0.38 * Math.sin(t * 2.63),
        z = witch.z - 0.18 + (1 - settle) * 0.24 * Math.cos(t * 2.14);
      const y = ground(witch.x, witch.z) + 1.26 + (1 - settle) * (0.35 + 0.12 * Math.sin(t * 2.13));
      put(
        settle > 0.92 || Math.sin(t * 29) > 0.29 ? 'moth-fold' : 'moth-open',
        x,
        y,
        z,
        t * 0.82 * (1 - settle)
      );
    }
  }
  if (dist(p, -155, 850) < 78) {
    for (let j = 0; j < 5; j++) {
      const a = j * 1.7,
        x = -155 + Math.cos(a) * 2.24,
        z = 850 + Math.sin(a) * 2.3;
      const growth = w.reedAt == null ? 0 : clamp((t - w.reedAt - j * 0.18) / 1.15);
      put(growth > 0.21 ? 'reed-living' : 'reed-cold', x, ground(x, z) + 0.13, z, a, 0.75 + 0.43 * growth);
    }
  }
  if (dist(p, 14, 1459) < 155) {
    const opened = w.galleryOpenedAt == null ? 0 : smooth((t - w.galleryOpenedAt) / 2.5);
    for (let i = 0; i < 3; i++) {
      const tone = tones[i],
        z = 1458.15 + 2 * i;
      const test = w.relayTest?.tone === tone ? Math.max(0, 1 - (t - w.relayTest.at) / 0.68) : 0;
      const movement =
        (tone === 'mid' && !opened ? 0.092 * Math.sin(t * 5.3) : 0) + 0.21 * Math.sin(test * Math.PI);
      put('relay-shutter', 9.22, castleAltitude + 11.25 + opened * 1.31, z);
      put(
        'relay-handle',
        9.85,
        castleAltitude + 11.29 + movement,
        z,
        Math.sin(t * 5.3) * 0.1 * (tone === 'mid' ? 1 : 0)
      );
    }
  }
  if (dist(p, 30, 1516) > 105) return list;
  const fig = storyFigure(w, t, ground);
  if (fig)
    put(
      'xero-' + fig.key,
      fig.x,
      fig.y,
      fig.z,
      fig.key === 'feeding' ? (fig.flip ? -0.6 : 0.6) : 0,
      fig.h / 1.9
    );
  const q = w.sequence,
    saved = q?.id === 'saved',
    u = q?.progress || 0,
    restY = ground(31.3, 1517) + 1.025;
  if (w.ending?.id !== 'saved') {
    const breath = Math.sin(t * 2.15) * 0.019;
    if (!saved || u < 0.45) put('hart-rest', 31.31, restY + breath, 1516.9, -0.36);
    else {
      const rise = smooth((u - 0.45) / 0.14),
        landing = smooth((u - 0.61) / 0.12),
        run = smooth((u - 0.72) / 0.27);
      const z = 1516.9 - rise * 0.72 - landing * 1.46 - run * 12.5;
      const x = 31.31 + rise * 0.25 + landing * 0.22 + run * 1.8;
      const y =
        mix(restY, hallY, landing) +
        Math.sin(landing * Math.PI) * 0.39 +
        run * 0.05 * Math.abs(Math.sin(t * 11));
      put(u < 0.54 ? 'hart-fold' : 'hart-step-' + (Math.floor(t * 7) % 6), x, y, z, 0.04 + run * 0.16);
    }
  }
  if (w.ropeFallen) put('rope-coil', 30.43, hallY + 0.02, 1516.04);
  if (saved && u < 0.34)
    put('vial-silver', fig.x + 0.18, fig.y + 1.03 + Math.sin(u * 9) * 0.11, fig.z - 0.25, 0, 1.18);
  return list;
}
export function storyTethers(w, t = w.elapsed, ground = terrainHeight) {
  if (dist(w.player, 30, 1516) > 85) return [];
  const fig = storyFigure(w, t, ground);
  if (!fig) return [];
  const anchor = [30.46, hallY + 4.01, 1516.08];
  const fed = fig.key === 'feeding',
    pull = bellPull(t);
  const wristOffset = fed ? (fig.flip ? 1 : -1) * fig.h * (832 / 680) * 0.26 : -0.2;
  const end = w.ropeFallen
    ? [30.48, hallY + 0.12, 1516.11]
    : [
        fig.x + wristOffset * Math.cos(w.player.yaw),
        fig.y + (fed ? fig.h * 0.59 : 1.17) - 0.11 * pull,
        fig.z - wristOffset * Math.sin(w.player.yaw) - 0.035,
      ];
  const slack = w.ropeFallen ? 0.11 : fed ? 0.09 * (1 - pull) : 0.035,
    segments = [];
  let prev = anchor;
  for (let i = 1; i <= 5; i++) {
    const p = i / 5;
    const pt = [
      mix(anchor[0], end[0], p) + slack * Math.sin(Math.PI * p),
      mix(anchor[1], end[1], p),
      mix(anchor[2], end[2], p) - slack * Math.sin(Math.PI * p),
    ];
    segments.push({ a: prev, b: pt, radius: 0.028, color: i % 2 ? 'bfa878' : 'ad956e' });
    prev = pt;
  }
  return segments;
}
