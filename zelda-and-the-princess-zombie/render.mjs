import { makeHall, makeHallProps, hallSurfaceVertices, createHallPainter, insideHall } from './hall.mjs';
import {
  terrainHeight as ground,
  roadX,
  trailX,
  hordePosition,
  HORDE_COUNT,
  registerObstacle,
} from './world.mjs';

// Flat-shaded geometry, painted with a single sun direction. Static geometry lives in
// spatial cells. No remote textures, runtime dependencies or asset downloads.
const TAU = Math.PI * 2;
const hallTools = { box, beam, rings, tri, quad, stone, lantern };
const rgbCache = new Map();
function rgb(s) {
  if (Array.isArray(s)) return s;
  if (!rgbCache.has(s)) {
    const n = parseInt(s, 16);
    rgbCache.set(s, [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]);
  }
  return rgbCache.get(s);
}
const scaleColor = (s, v) => rgb(s).map((c) => c * v);
function rng(seed) {
  let s = seed | 0;
  return () => ((s = (Math.imul(1664525, s) + 1013904223) | 0) >>> 0) / 4294967296;
}
function tri(mesh, a, b, c, color, shade = true) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
    v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const nx = u[1] * v[2] - u[2] * v[1],
    ny = u[2] * v[0] - u[0] * v[2],
    nz = u[0] * v[1] - u[1] * v[0];
  const d = (nx * 0.45 + ny * 0.77 - nz * 0.4) / (Math.hypot(nx, ny, nz) || 1);
  const light = shade ? 0.77 + Math.max(0, d) * 0.22 : 1;
  const [r, g, bl] = rgb(color);
  for (const p of [a, b, c]) mesh.push(...p, r * light, g * light, bl * light);
}
function quad(m, a, b, c, d, s, shade = true) {
  tri(m, a, b, c, s, shade);
  tri(m, a, c, d, s, shade);
}
function rings(m, levels, n, color, rotation = 0, jitter = 0.0) {
  const rows = levels.map(([x, y, z, rx, rz = rx], j) =>
    Array.from({ length: n }, (_, k) => {
      const a = (TAU * k) / n + rotation,
        wobble = 1 + jitter * Math.sin(k * 33.937 + j * 0.41);
      return [x + Math.cos(a) * rx * wobble, y, z + Math.sin(a) * rz * wobble];
    })
  );
  for (let j = 1; j < rows.length; j++)
    for (let k = 0; k < n; k++) {
      const k2 = (k + 1) % n,
        col = typeof color === 'function' ? color(j, k) : color;
      quad(m, rows[j - 1][k], rows[j][k], rows[j][k2], rows[j - 1][k2], col);
    }
  for (const j of [0, rows.length - 1]) {
    const col = typeof color === 'function' ? color(j, 0) : color;
    for (let k = 1; k < n - 1; k++) tri(m, rows[j][0], rows[j][j ? k + 1 : k], rows[j][j ? k : k + 1], col);
  }
}
function box(m, x, y, z, w, h, d, c) {
  const a = [x - w / 2, y, z - d / 2],
    b = [x + w / 2, y, z - d / 2],
    e = [x - w / 2, y, z + d / 2],
    f = [x + w / 2, y, z + d / 2];
  const up = (p) => [p[0], p[1] + h, p[2]],
    A = up(a),
    B = up(b),
    E = up(e),
    F = up(f);
  quad(m, a, A, B, b, c);
  quad(m, b, B, F, f, c);
  quad(m, f, F, E, e, c);
  quad(m, e, E, A, a, c);
  quad(m, A, E, F, B, c);
}
function stone(m, x, y, z, w, h, d, c, seed = 2) {
  rings(
    m,
    [
      [x, y, z, w * 0.7, d * 0.7],
      [x - 0.07 * w, y + h * 0.27, z, w, d],
      [x + w * 0.12, y + h * 0.77, z, w * 0.83, d * 0.81],
      [x, y + h, z, w * 0.38, d * 0.42],
    ],
    6,
    c,
    seed,
    0.18
  );
}
function beam(m, a, b, r, r2, c, n = 5) {
  const d = b.map((v, i) => v - a[i]),
    l = Math.hypot(...d) || 1,
    u = d.map((v) => v / l);
  const q = Math.abs(u[1]) < 0.85 ? [0, 1, 0] : [1, 0, 0];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const t = cross(u, q),
    tl = Math.hypot(...t) || 1,
    v = t.map((x) => x / tl),
    w = cross(u, v);
  const row = (p, rad) =>
    Array.from({ length: n }, (_, i) =>
      p.map((e, k) => e + rad * (Math.cos((i * TAU) / n) * v[k] + Math.sin((i * TAU) / n) * w[k]))
    );
  const A = row(a, r),
    B = row(b, r2);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    quad(m, A[i], A[j], B[j], B[i], c);
  }
}
function disc(m, x, y, z, rx, rz, c, n = 12) {
  for (let k = 0; k < n; k++)
    tri(
      m,
      [x, y, z],
      [x + Math.cos(((k + 1) * TAU) / n) * rx, y, z + Math.sin(((k + 1) * TAU) / n) * rz],
      [x + Math.cos((k * TAU) / n) * rx, y, z + Math.sin((k * TAU) / n) * rz],
      c,
      false
    );
}
const palettes = {
  pine: ['27483d', '325748', '3d6250', '507357'],
  bright: ['4c694b', '637c52', '80905b', '98a769'],
  oak: ['444e42', '536849', '708554', '8b9859'],
};
function pine(m, x, y, z, h, r, rand, light = false) {
  const p = light ? palettes.bright : palettes.pine,
    lean = (rand() - 0.5) * h * 0.08;
  rings(
    m,
    [
      [x, y, z, r * 0.13],
      [x + lean * 0.5, y + h * 0.57, z, r * 0.072],
      [x + lean, y + h * 0.91, z, 0.03],
    ],
    6,
    '665246',
    rand()
  );
  const levels = 3,
    phase = rand() * TAU;
  for (let i = 0; i < levels; i++) {
    const k = i / levels,
      floor = y + h * (0.18 + k * 0.67),
      rad = r * (1 - k * 0.88),
      cx = x + lean * (0.35 + k * 0.65);
    const n = 7,
      base = Array.from({ length: n }, (_, j) => {
        const a = (j * TAU) / n + phase + i * 0.53,
          rr = rad * (0.83 + rand() * 0.25);
        return [cx + Math.cos(a) * rr, floor + (rand() - 0.5) * 0.085 * h, z + Math.sin(a) * rr];
      });
    const tip = [cx + lean * 0.14, Math.min(y + h, floor + h * (0.41 - i * 0.025)), z];
    for (let j = 0; j < n; j++) {
      const a = base[j],
        b = base[(j + 1) % n];
      tri(m, a, tip, b, p[Math.min(3, ((rand() * 1.7) | 0) + (i > 0 ? 1 : 0) + (j === 5 ? 1 : 0))]);
      tri(m, [cx, floor + 0.04 * h, z], a, b, p[0]);
    }
  }
}
function broadleaf(m, x, y, z, h, r, rand) {
  const tilt = (rand() - 0.5) * h * 0.21,
    mid = [x + tilt, y + h * 0.55, z],
    phase = rand() * TAU;
  rings(
    m,
    [
      [x, y - 0.1, z, r * 0.23],
      [x + 0.15 * tilt, y + 0.11 * h, z, r * 0.117],
      [x + 0.62 * tilt, y + h * 0.34, z, r * 0.084],
      [...mid, r * 0.065],
    ],
    6,
    '645042',
    phase,
    0.08
  );
  for (let j = 0; j < 4; j++) {
    const a = phase + (TAU * j) / 4,
      ext = r * (0.4 + rand() * 0.5),
      bx = mid[0] + Math.cos(a) * ext,
      bz = z + Math.sin(a) * ext,
      by = y + h * (0.64 + rand() * 0.15);
    const fork = [mid[0] + Math.cos(a) * ext * 0.45, by - h * 0.105, z + Math.sin(a) * ext * 0.45];
    beam(m, mid, fork, r * 0.06, r * 0.04, '725f4c');
    beam(m, fork, [bx, by, bz], r * 0.04, r * 0.021, '73624e');
    rings(
      m,
      [
        [bx, by - h * 0.035, bz, r * 0.19],
        [bx, by + h * 0.014, bz, r * 0.65, r * 0.52],
        [bx + r * 0.06, by + h * 0.122, bz, r * 0.69, r * 0.57],
        [bx, by + h * 0.22, bz, r * 0.33],
      ],
      6,
      (l, k) =>
        palettes.oak[Math.min(3, (l > 1 ? 1 : 0) + (k === 1 || k === 5 ? 1 : 0) + (j === 1 ? 1 : 0))],
      a,
      0.19
    );
  }
}
function fern(m, x, y, z, sz, rand) {
  const p = rand() * TAU;
  for (let i = 0; i < 7; i++) {
    const a = p + (i * TAU) / 7,
      l = sz * (0.75 + rand() * 0.5),
      dx = Math.cos(a),
      dz = Math.sin(a),
      b = [x + dx * l * 0.55, y + l * 0.62, z + dz * l * 0.55],
      left = [b[0] - dz * l * 0.13, b[1], b[2] + dx * l * 0.13],
      right = [b[0] + dz * l * 0.13, b[1] - 0.015, b[2] - dx * l * 0.13],
      tip = [x + dx * l, y + l * 0.45, z + dz * l];
    tri(m, [x, y, z], left, tip, '769163');
    tri(m, [x, y, z], tip, right, '516f4f');
  }
}
function mushroom(m, x, y, z, s) {
  rings(
    m,
    [
      [x, y, z, s * 0.12],
      [x, y + s * 0.6, z, s * 0.085],
    ],
    5,
    'd1bd84'
  );
  rings(
    m,
    [
      [x, y + s * 0.56, z, s * 0.46],
      [x, y + s * 0.72, z, s * 0.35],
      [x, y + s * 0.83, z, s * 0.12],
    ],
    7,
    'bf794f'
  );
}
function lantern(m, x, y, z, size = 1) {
  const q = (dx, dy, dz, r) => [x + dx * size, y + dy * size, z + dz * size, r * size];
  rings(m, [q(0, 0, 0, 0.08), q(0, 0.1, 0, 0.23), q(0, 0.15, 0, 0.2)], 6, '665334');
  rings(m, [q(0, 0.14, 0, 0.16), q(0, 0.42, 0, 0.14)], 6, 'ffce73');
  rings(m, [q(0, 0.4, 0, 0.23), q(0, 0.56, 0, 0.05), q(0, 0.62, 0, 0.025)], 6, '6f5942');
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4;
    beam(
      m,
      q(Math.cos(a) * 0.16, 0.12, Math.sin(a) * 0.16, 0).slice(0, 3),
      q(Math.cos(a) * 0.14, 0.45, Math.sin(a) * 0.14, 0).slice(0, 3),
      0.022 * size,
      0.016 * size,
      '725b3c'
    );
  }
}
function makeWitch(m) {
  disc(m, 0, 0.02, 0, 0.64, 0.38, '373e33');
  rings(
    m,
    [
      [0, 0.035, 0, 0.53, 0.36],
      [-0.02, 0.14, 0, 0.56, 0.35],
      [0.02, 0.7, 0, 0.286, 0.23],
      [0.0, 1.26, 0, 0.23, 0.19],
      [0, 1.41, 0, 0.33, 0.19],
      [0, 1.51, 0, 0.14, 0.13],
    ],
    10,
    (l, k) => ['393c55', '49455f', '57516a', '3f4058', '5e5169'][k % 5],
    0.31,
    0.05
  );
  rings(
    m,
    [
      [0, 0.72, -0.01, 0.31, 0.245],
      [0, 1.17, -0.01, 0.27, 0.21],
      [0, 1.41, 0, 0.37, 0.23],
      [0, 1.5, 0, 0.13, 0.13],
    ],
    7,
    (j, k) => (k % 3 === 0 ? '80716b' : '695d70'),
    0.5
  );
  rings(
    m,
    [
      [0, 1.44, 0, 0.1, 0.11],
      [0, 1.53, -0.025, 0.17, 0.15],
      [0, 1.74, 0, 0.18, 0.156],
      [0, 1.85, 0.01, 0.14, 0.12],
    ],
    8,
    'af9274',
    0.35
  );
  rings(
    m,
    [
      [0, 0.15, -0.3, 0.09, 0.045],
      [0.03, 0.72, -0.23, 0.07, 0.025],
      [0.04, 1.2, -0.2, 0.073, 0.023],
    ],
    5,
    'a5946c'
  );
  // Wavy silver side locks, pointed nose and dark brows.
  for (const s of [-1, 1]) {
    for (let j = 0; j < 3; j++) {
      const x = s * (0.13 + j * 0.016);
      rings(
        m,
        [
          [x + s * 0.032, 1.22 + j * 0.06, -0.05, 0.01],
          [x + s * 0.05, 1.48, -0.045, 0.041],
          [x, 1.66, -0.044, 0.046],
          [x, 1.8, -0.008, 0.065],
        ],
        5,
        j === 0 ? 'c4b499' : '968c88'
      );
    }
    beam(m, [s * 0.02, 1.681, -0.153], [s * 0.113, 1.703, -0.129], 0.013, 0.018, '4c423e');
    box(m, s * 0.074, 1.653, -0.145, 0.035, 0.014, 0.013, 'ddc98d');
  }
  beam(m, [0, 1.653, -0.12], [0, 1.6, -0.244], 0.048, 0.018, 'bb9d80', 6);
  rings(
    m,
    [
      [0, 1.737, 0, 0.48, 0.36],
      [-0.03, 1.78, 0, 0.52, 0.37],
      [0, 1.83, 0, 0.26, 0.22],
      [-0.044, 2.09, 0.015, 0.17, 0.15],
      [-0.141, 2.31, 0.02, 0.092, 0.082],
      [-0.28, 2.36, 0.018, 0.019, 0.014],
      [-0.33, 2.32, 0.015, 0.003],
    ],
    8,
    (j, k) => (k % 3 === 0 ? '685c70' : '4e4962'),
    0.18,
    0.12
  );
  rings(
    m,
    [
      [0, 1.824, 0, 0.24, 0.213],
      [-0.013, 1.882, 0, 0.22, 0.2],
    ],
    8,
    '9a7d4f',
    0.18
  );
  for (const s of [-1, 1]) {
    const elbow = [s * 0.405, 1.04, 0.0],
      hand = [s * (s === 1 ? 0.54 : 0.39), s === 1 ? 1.24 : 0.85, -0.13];
    beam(m, [s * 0.27, 1.36, 0], elbow, 0.124, 0.1, '564c62', 7);
    beam(m, elbow, hand, 0.107, 0.079, '66586d', 7);
    stone(m, ...hand, 0.065, 0.097, 0.056, 'b09b80');
  }
  beam(m, [0.53, 0.01, -0.11], [0.565, 1.58, -0.12], 0.034, 0.025, '917753');
  beam(m, [0.565, 1.58, -0.12], [0.72, 1.82, -0.13], 0.034, 0.04, '957957');
  beam(m, [0.72, 1.82, -0.13], [0.81, 1.74, -0.13], 0.045, 0.023, '957957');
  beam(m, [0.81, 1.74, -0.13], [0.81, 1.65, -0.13], 0.011, 0.009, '9b8050');
  lantern(m, 0.81, 1.335, -0.13, 0.5);
}
function makePrincess(m) {
  disc(m, 0, 0.02, 0, 0.64, 0.44, '393c3c');
  rings(
    m,
    [
      [0, 0.035, 0, 0.6, 0.44],
      [0, 0.14, 0, 0.61, 0.43],
      [0, 0.74, 0, 0.29, 0.25],
      [0, 0.99, 0, 0.16, 0.15],
      [0, 1.3, 0, 0.22, 0.17],
      [0, 1.43, 0, 0.26, 0.16],
      [0, 1.48, 0, 0.11],
    ],
    10,
    (j, k) => ['9891ae', '817d9a', 'b8a7b9', 'a19ab0'][k % 4],
    0.23
  );
  rings(
    m,
    [
      [0, 1.44, 0, 0.085],
      [0, 1.51, -0.035, 0.148, 0.12],
      [0, 1.72, 0, 0.17, 0.15],
      [0, 1.82, 0, 0.12],
    ],
    8,
    '91a296',
    0.45
  );
  for (const s of [-1, 1]) {
    beam(m, [s * 0.21, 1.4, 0], [s * 0.32, 1.09, -0.07], 0.072, 0.055, 'a69eb5');
    beam(m, [s * 0.32, 1.09, -0.07], [s * 0.29, 1, -0.24], 0.056, 0.04, '98a59a');
    rings(
      m,
      [
        [s * 0.16, 1.2, 0.05, 0.035],
        [s * 0.17, 1.43, 0.04, 0.069],
        [s * 0.138, 1.735, 0.012, 0.085],
      ],
      6,
      'a09b86'
    );
    box(m, s * 0.079, 1.65, -0.14, 0.056, 0.028, 0.02, '55454a');
    box(m, s * 0.082, 1.667, -0.157, 0.024, 0.012, 0.01, 'eaad86');
  }
  rings(
    m,
    [
      [0, 1.757, 0, 0.184, 0.157],
      [0, 1.81, 0, 0.17, 0.145],
    ],
    8,
    'bc9d5e'
  );
  for (let i = 0; i < 5; i++) {
    const a = (i * TAU) / 5;
    beam(
      m,
      [Math.cos(a) * 0.155, 1.78, Math.sin(a) * 0.13],
      [Math.cos(a) * 0.174, 1.92 + (i === 3 ? 0.07 : 0), Math.sin(a) * 0.15],
      0.038,
      0.002,
      'dec487'
    );
  }
}
function makeWolf(m) {
  disc(m, 0, 0.03, 0, 0.49, 0.85, '353f36');
  rings(
    m,
    [
      [0, 0.74, 0.08, 0.18, 0.43],
      [0, 0.91, 0.06, 0.28, 0.63],
      [0, 1.14, 0.12, 0.26, 0.58],
      [0, 1.26, 0.14, 0.11, 0.33],
    ],
    7,
    '6a706b',
    0.16
  );
  for (const s of [-1, 1])
    for (const z of [-0.43, 0.45]) {
      const p = [s * 0.19, 0.88, z],
        q = [s * 0.22, 0.5, z + (z > 0 ? 0.19 : -0.09)],
        r = [s * 0.22, 0.14, z - 0.12];
      beam(m, p, q, 0.106, 0.08, '77796f');
      beam(m, q, r, 0.074, 0.054, '646a64');
      stone(m, r[0], 0.025, r[2] - 0.045, 0.083, 0.12, 0.14, '575f59');
    }
  beam(m, [0, 1.06, -0.29], [0, 1.34, -0.55], 0.255, 0.215, '8a8b78', 7);
  rings(
    m,
    [
      [0, 1.18, -0.58, 0.17, 0.16],
      [0, 1.4, -0.66, 0.218, 0.23],
      [0, 1.53, -0.58, 0.15, 0.17],
    ],
    7,
    '818879'
  );
  beam(m, [0, 1.31, -0.71], [0, 1.28, -0.99], 0.14, 0.077, '969584');
  stone(m, 0, 1.25, -1.024, 0.078, 0.071, 0.05, '434747');
  for (const s of [-1, 1]) {
    beam(m, [s * 0.14, 1.45, -0.58], [s * 0.175, 1.73, -0.53], 0.093, 0.002, '575e59');
    stone(m, s * 0.149, 1.402, -0.815, 0.034, 0.027, 0.016, 'ebc276');
  }
  beam(m, [0, 0.97, 0.51], [0.06, 0.82, 0.99], 0.145, 0.17, '6c7169');
  beam(m, [0.06, 0.82, 0.99], [0.14, 0.64, 1.32], 0.17, 0.027, '9c9a84');
}
function makeTroll(m) {
  disc(m, 0, 0.025, 0, 1.23, 0.74, '374136');
  rings(
    m,
    [
      [0, 1.0, 0, 0.48, 0.38],
      [0, 1.37, 0, 0.72, 0.48],
      [0, 2.18, 0, 0.96, 0.5],
      [0, 2.55, 0, 0.76, 0.415],
      [0, 2.66, 0, 0.48, 0.35],
    ],
    8,
    '747e65',
    0.28,
    0.1
  );
  rings(
    m,
    [
      [0, 0.91, 0, 0.67, 0.46],
      [0, 1.44, 0, 0.61, 0.43],
    ],
    7,
    (j, k) => (k % 2 ? '594c41' : '6b5a47'),
    0.32,
    0.15
  );
  for (const s of [-1, 1]) {
    beam(m, [s * 0.36, 1.27, 0], [s * 0.46, 0.65, -0.1], 0.23, 0.19, '858c6e');
    beam(m, [s * 0.46, 0.65, -0.1], [s * 0.45, 0.17, 0], 0.18, 0.142, '777c62');
    stone(m, s * 0.45, 0.04, -0.12, 0.24, 0.26, 0.32, '737964');
    beam(m, [s * 0.72, 2.3, 0], [s * 1.06, 1.72, 0], 0.26, 0.215, '839076');
    beam(m, [s * 1.06, 1.72, 0], [s * 1.17, 1.19, -0.15], 0.2, 0.16, '79836a');
    stone(m, s * 1.17, 0.94, -0.16, 0.19, 0.32, 0.17, '869075');
    stone(m, s * 0.72, 2.34, 0, 0.27, 0.23, 0.28, '8a9075');
  }
  stone(m, 0, 2.38, -0.12, 0.435, 0.72, 0.36, '899275', 1);
  for (const s of [-1, 1]) {
    beam(m, [0, 2.86, -0.35], [s * 0.32, 2.91, -0.263], 0.075, 0.07, '67725b');
    box(m, s * 0.14, 2.808, -0.445, 0.065, 0.03, 0.012, 'd5ad60');
    beam(m, [s * 0.24, 2.57, -0.4], [s * 0.29, 2.76, -0.411], 0.055, 0.006, 'c6bf9c');
  }
  stone(m, 0, 2.64, -0.42, 0.115, 0.14, 0.11, '707a61');
  beam(m, [1.2, 0.64, -0.13], [1.08, 2.2, -0.33], 0.1, 0.251, '675746', 7);
}
function makeDragon(m) {
  const c = '70677e',
    wing = '8d7582';
  rings(
    m,
    [
      [0, 0.03, 0, 0.21, 0.6],
      [0, 0.31, 0, 0.54, 1.33],
      [0, 0.84, 0, 0.48, 1.18],
      [0, 1.03, 0, 0.17, 0.57],
    ],
    8,
    c,
    0.24
  );
  beam(m, [0, 0.59, -0.69], [0, 1.14, -1.53], 0.36, 0.22, c);
  beam(m, [0, 1.14, -1.53], [0, 1.24, -2.16], 0.26, 0.13, '8c7d84');
  for (const s of [-1, 1]) {
    beam(m, [s * 0.13, 1.3, -1.7], [s * 0.25, 1.72, -1.35], 0.089, 0.004, 'd2be94');
    box(m, s * 0.154, 1.32, -1.89, 0.052, 0.044, 0.063, 'ffc37e');
    const tip = [s * 3.75, 1.51, 0.51],
      joint = [s * 1.44, 1.95, -0.28],
      root = [s * 0.31, 0.67, -0.47],
      rear = [s * 0.26, 0.53, 0.78];
    beam(m, root, joint, 0.125, 0.086, c);
    beam(m, joint, tip, 0.083, 0.008, '76697a');
    const fingers = [tip, [s * 2.81, 1.26, 1.07], [s * 2.21, 0.98, 1.6], [s * 1.52, 0.71, 1.68], rear];
    for (let i = 0; i < fingers.length - 1; i++) {
      tri(m, joint, fingers[i + 1], fingers[i], i % 2 ? wing : 'a08791');
      beam(m, joint, fingers[i + 1], 0.05, 0.016, c, 4);
    }
    tri(m, root, rear, joint, '8d7685');
    beam(m, [s * 0.27, 0.39, 0.61], [s * 0.37, -0.15, 0.95], 0.12, 0.067, c);
    beam(m, [s * 0.37, -0.15, 0.95], [s * 0.41, -0.28, 0.68], 0.063, 0.021, c);
  }
  beam(m, [0, 0.42, 0.76], [0.12, 0.24, 1.9], 0.29, 0.17, c);
  beam(m, [0.12, 0.24, 1.9], [0.48, 0.52, 3.25], 0.17, 0.07, c);
  beam(m, [0.48, 0.52, 3.25], [1.06, 0.87, 3.79], 0.07, 0.003, c);
}
function makeBlade(m) {
  // View-space with +Z pointing away from the player. Build a faceted, asymmetrical
  // silhouette so the blade catches a different light on either side of its ridge.
  const p = (u, v, z) => [0.245 + u + 0.13 * v, -0.256 + v, z + 0.15 * v];
  beam(m, p(0, -0.18, 0.4), p(0, -0.007, 0.4), 0.024, 0.024, '524b4c', 8);
  for (let i = 0; i < 6; i++)
    beam(m, p(0, -0.17 + i * 0.024, 0.4), p(0, -0.161 + i * 0.024, 0.4), 0.026, 0.026, '928262', 7);
  const a = p(-0.087, 0.04, 0.394),
    b = p(-0.039, 0.026, 0.4),
    c = p(0, 0.037, 0.4),
    d = p(0.053, 0.027, 0.4),
    e = p(0.1, 0.06, 0.402);
  beam(m, a, b, 0.009, 0.013, 'c9ad6a');
  beam(m, b, c, 0.013, 0.019, 'd7b975');
  beam(m, c, d, 0.019, 0.013, 'c2a264');
  beam(m, d, e, 0.013, 0.007, 'ab894d');
  const q = [
      p(0, 0.027, 0.4),
      p(-0.025, 0.063, 0.408),
      p(-0.025, 0.23, 0.46),
      p(0, 0.4, 0.57),
      p(0.023, 0.23, 0.46),
      p(0.027, 0.063, 0.408),
    ],
    ridge = p(0, 0.125, 0.38);
  tri(m, q[0], q[1], ridge, 'b7c9c4');
  tri(m, q[1], q[2], ridge, 'c5d6cf');
  tri(m, q[2], q[3], ridge, 'd7ded2');
  tri(m, ridge, q[3], q[4], '899caa');
  tri(m, ridge, q[4], q[5], '81959b');
  tri(m, ridge, q[5], q[0], '91a49f');
  stone(m, 0.229, -0.37, 0.37, 0.054, 0.113, 0.053, '806657', 0.26);
  beam(m, [0.218, -0.345, 0.362], [0.264, -0.46, 0.3], 0.052, 0.068, '536454', 7);
  for (let i = 0; i < 3; i++)
    beam(m, [0.237, -0.32 - i * 0.021, 0.357], [0.264, -0.32 - i * 0.021, 0.38], 0.012, 0.012, 'a99170');
}
function makeBridge(m) {
  const y = Math.max(ground(30, 1007), ground(30, 1035)) + 0.35;
  for (let i = 0; i < 24; i++) {
    const z = 1006.8 + i * 1.28;
    box(m, 30, y, z, 20, 0.34, 1.2, i % 3 ? '897357' : '9a8262');
  }
  for (const s of [-1, 1]) {
    const x = 30 + s * 9.88;
    for (let z = 1007; z < 1039; z += 6) {
      box(m, x, y, z, 0.42, 2, 0.42, '796950');
    }
    beam(m, [x, y + 1.58, 1007], [x, y + 1.58, 1036], 0.105, 0.105, '85755c');
  }
}
function castle(m) {
  const X = 30,
    y = ground(30, 1435) - 0.12,
    z = 1435;
  // Several levels and off-axis turrets keep the stronghold legible on the horizon.
  function window(x, base, z, w, h, col) {
    const p = (a, b) => [x + a, base + b, z];
    quad(m, p(-w / 2, 0), p(w / 2, 0), p(w / 2, h * 0.73), p(-w / 2, h * 0.73), col, false);
    tri(m, p(-w / 2, h * 0.73), p(0, h), p(w / 2, h * 0.73), col, false);
    box(m, x, base, z - 0.04, 0.12, h * 0.77, 0.09, '676875');
    box(m, x, base + h * 0.42, z - 0.04, w, 0.13, 0.09, '776e73');
  }
  function tower(x, zz, rad, h, roof, clad = '89888c') {
    rings(
      m,
      [
        [x, y - 0.5, zz, rad * 1.12],
        [x, y + 1.3, zz, rad],
        [x, y + h * 0.82, zz, rad * 0.85],
        [x, y + h * 0.85, zz, rad],
        [x, y + h, zz, rad],
      ],
      8,
      clad,
      Math.PI / 8
    );
    rings(
      m,
      [
        [x, y + h - 0.3, zz, rad * 1.13],
        [x, y + h + 0.3, zz, rad * 1.14],
        [x + 0.5, y + h + roof * 0.87, zz, rad * 0.12],
        [x + 0.67, y + h + roof, zz, 0.09],
      ],
      8,
      (j, k) => (k % 3 ? '545f76' : '666d86'),
      Math.PI / 8
    );
    beam(m, [x + 0.67, y + h + roof, zz], [x + 0.67, y + h + roof + 2.3, zz], 0.09, 0.05, 'aa925e');
    tri(
      m,
      [x + 0.67, y + h + roof + 2.2, zz],
      [x + 4, y + h + roof + 1.5, zz - 0.16],
      [x + 0.67, y + h + roof + 0.9, zz],
      'ab6463',
      false
    );
    for (const f of [0.31, 0.64, 0.9])
      window(
        x,
        y + h * f,
        zz - rad * (f > 0.5 ? 0.89 : 0.94) - 0.23,
        rad * 0.323,
        Math.min(4, h * 0.15),
        'd1a774'
      );
  }
  function battlements(x, zz, width, h, alongX = true) {
    const depth = 1.3;
    box(m, x, y - 0.3, zz, alongX ? width : depth, h, alongX ? depth : width, '81818a');
    box(
      m,
      x,
      y + h - 0.8,
      zz,
      alongX ? width + 0.15 : depth + 0.35,
      0.56,
      alongX ? depth + 0.35 : width + 0.15,
      'a39b98'
    );
    const n = Math.max(1, Math.floor(width / 2.4));
    for (let i = 0; i < n; i++) {
      const p = -width / 2 + ((i + 0.5) * width) / n;
      box(
        m,
        x + (alongX ? p : 0),
        y + h,
        zz + (alongX ? 0 : p),
        alongX ? 1.3 : depth,
        1.2,
        alongX ? depth : 1.3,
        '979293'
      );
    }
  }
  tower(5, z, 5, 16, 9);
  tower(55, z, 5, 16, 9);
  tower(5, 1549, 6.5, 32, 17);
  tower(55, 1549, 7, 35, 21);
  battlements(14.5, z, 20, 9.7);
  battlements(45.5, z, 20, 9.7);
  battlements(5, 1492, 111, 9, false);
  battlements(55, 1492, 111, 9, false);
  const gateY = y + 7.4;
  box(m, X, gateY, z, 13.3, 3.1, 2.3, 'a19a97');
  for (const s of [-1, 1]) {
    tri(
      m,
      [X + s * 5.6, gateY - 2.5, z - 1.16],
      [X + s * 5.6, gateY, z - 1.16],
      [X, gateY + 1, z - 1.16],
      'a19a97'
    );
    box(m, X + s * 5.67, y, z, 1.07, 8.3, 2.6, 'a69f99');
    window(X + s * 13, y + 4.5, z - 0.73, 1.0, 2.2, 'b19c83');
  }
  for (let i = 0; i < 7; i++) box(m, 24.3 + i * 1.85, y + 10.5, z, 1.01, 1.17, 2.2, 'a29b9e');
  tower(15, 1538, 6.1, 25, 15);
  tower(46, 1541, 5.1, 27, 16);
  tower(30, 1555, 10.8, 63, 44);
  box(m, X, y, 1534, 27, 15.4, 6, '938c94');
  rings(
    m,
    [
      [X, y + 15.2, 1535, 20, 10],
      [X, y + 24.6, 1535, 3, 0.9],
    ],
    4,
    '62677c',
    Math.PI / 4
  );
  window(X, y + 3, 1530.96, 7.2, 10.6, 'c294a1');
  window(20.8, y + 4, 1530.95, 2.9, 6.7, 'd1b380');
  window(39.2, y + 4, 1530.95, 2.9, 6.7, 'd1b380');
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const zz = 1455 + i * 19;
      box(m, X + s * 17, y, zz, 2.5, 5.4, 2.5, 'a5a09c');
      rings(
        m,
        [
          [X + s * 17, y + 5.4, zz, 1.5],
          [X + s * 17, y + 6.1, zz, 0.9],
        ],
        8,
        'b4aba2'
      );
      lantern(m, X + s * 17, y + 6.1, zz, 2.45);
    }
  }
  for (let i = 0; i < 12; i++) {
    const zz = 1451 + i * 6;
    box(m, X, y + 0.08, zz, 5.1, 0.08, 5.85, i % 3 ? '827880' : '8f8289');
  }
}
function spring(m) {
  const x = -155,
    z = 850,
    y = ground(x, z);
  disc(m, x, y + 0.13, z, 4.5, 4.5, '699999', 18);
  for (let j = 0; j < 14; j++) {
    const a = (j * TAU) / 14;
    stone(
      m,
      x + Math.cos(a) * 4.5,
      y + 0.03,
      z + Math.sin(a) * 4.5,
      1,
      0.84,
      0.69,
      j % 2 ? '879080' : 'a1a090',
      j
    );
  }
  for (const side of [-1, 1]) {
    const X = x + side * 3.5,
      Z = z + 5.4;
    box(m, X, y, Z, 1.4, 4.5, 1.4, '96988c');
    box(m, X, y + 4.42, Z, 1.68, 0.46, 1.68, 'aaa89a');
    beam(m, [X, y + 4.8, Z], [x, y + 6.9, Z], 0.63, 0.54, '92978b', 5);
  }
}
function floorPaint(kind) {
  const can = document.createElement('canvas');
  can.width = can.height = 256;
  const ctx = can.getContext('2d', { willReadFrequently: true }),
    r = rng(kind === 'moss' ? 817 : 644),
    isMoss = kind === 'moss';
  const base = isMoss ? [70, 80, 49] : [121, 103, 73],
    data = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const i = (x + y * 256) * 4,
        grit = (r() - 0.5) * 17,
        patch =
          Math.sin(x * 0.0749 + Math.sin(y * 0.0491) * 2.3) * 5 +
          Math.sin(y * 0.09817 + Math.cos(x * 0.0491)) * 3.3;
      for (let k = 0; k < 3; k++) data.data[i + k] = base[k] + grit + patch;
      data.data[i + 3] = 255;
    }
  ctx.putImageData(data, 0, 0);
  for (let i = 0; i < (isMoss ? 1500 : 930); i++) {
    const x = r() * 256,
      y = r() * 256,
      sz = 0.38 + r() * 1.65,
      c = isMoss
        ? ['#515e36', '#6c743d', '#80773e', '#363f2e', '#777849', '#434c31']
        : ['#a28a61', '#806e4c', '#64513c', '#a79572', '#585042', '#8c7955'];
    ctx.fillStyle = c[i % c.length];
    ctx.beginPath();
    ctx.ellipse(x, y, sz * (1 + r() * 1.8), sz * 0.6, r() * TAU, 0, TAU);
    ctx.fill();
  }
  for (let i = 0; i < (isMoss ? 56 : 26); i++) {
    const x = r() * 256,
      y = r() * 256,
      sz = 0.8 + r() * 1.8,
      angle = r() * TAU;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = i % 4 === 0 ? '#b19150' : i % 3 === 0 ? '#8d7848' : '#806542';
    ctx.beginPath();
    ctx.moveTo(-sz * 2.3, 0);
    ctx.quadraticCurveTo(-sz, -sz * 1.8, sz * 2.0, 0.04);
    ctx.quadraticCurveTo(0, sz * 1.03, -sz * 2.3, 0);
    ctx.fill();
    ctx.restore();
  }
  return { canvas: can, data: ctx.getImageData(0, 0, 256, 256).data };
}
function artImage(name) {
  const image = new Image();
  image.decoding = 'async';
  image.src = new URL('./' + name, import.meta.url).href;
  return image;
}
const readyImage = (im) => im?.complete && im.naturalWidth > 0;
const clearingTrees = [
  [-8, 7, 19, 5.6],
  [9, 10, 21, 6.0],
  [-13, 20, 20, 6.5],
  [13, 23, 18, 5.8],
  [-16, -5, 19, 6.3],
  [17, -7, 22, 6],
];
const drawnGroves = new Map();
function ridgeVista(x, z) {
  const offset = z - 475;
  return offset >= -10 && offset < 760 && x > 51 - offset * 0.93 - 14 && x < 51 + offset * 0.08 + 15;
}
function sceneryTrees(cx, cz) {
  const key = cx + ',' + cz;
  if (drawnGroves.has(key)) return drawnGroves.get(key);
  const result = [],
    r = rng(7731 + cx * 3851 + cz * 907),
    num = cz < 11 ? 23 : cz < 14 ? 15 : 5;
  for (let i = 0; i < num; i++) {
    const x = (cx + r()) * 80,
      z = (cz + r()) * 80,
      h = 8 + r() * 16,
      rad = h * (0.17 + r() * 0.09),
      oak = r() > 0.64 && cz < 13,
      seed = (r() * 1e6) | 0;
    if (
      ridgeVista(x, z) ||
      Math.abs(z - 1021) < 14 ||
      (z > 1424 && z < 1572 && Math.abs(x - 30) < 37) ||
      Math.abs(x - roadX(z)) < 10.0 ||
      Math.abs(x - trailX(z)) < 4.4 ||
      Math.hypot(x + 155, z - 850) < 8 ||
      Math.hypot(x - 30, z - 996) < 19 ||
      (z > 1128 && z < 1400 && x >= -560 && x < 73) ||
      (z > 0 && z < 660 && Math.abs(x - 0.019 * z) < 8.7)
    )
      continue;
    registerObstacle(x, z, rad * (oak ? 0.14 : 0.1));
    result.push({ x, z, h, rad, oak, seed, painted: oak || seed % 3 === 0 });
  }
  drawnGroves.set(key, result);
  return result;
}
function buildCell(cx, cz) {
  const mesh = [],
    rand = rng(78013 + cx * 3851 + cz * 907);
  const x0 = cx * 80,
    z0 = cz * 80,
    step = 10;
  function surface(x, z) {
    return [x, ground(x, z), z];
  }
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++) {
      const x = x0 + i * step,
        z = z0 + j * step,
        g = rand();
      const land = z > 1110 ? '788271' : z > 850 ? '597963' : '58724d';
      const tint = scaleColor(land, 0.95 + g * 0.06);
      quad(
        mesh,
        surface(x, z),
        surface(x, z + step),
        surface(x + step, z + step),
        surface(x + step, z),
        tint
      );
    }
  // Clear road and shortcut use sampled terrain at the same height as the player.
  function ribbon(line, radius, col) {
    for (let z = z0; z < z0 + 80; z += 4) {
      if (z > 1434 || (radius < 2 && Math.abs(line(z) - roadX(z)) < 6.6)) continue;
      const a = line(z),
        b = line(z + 4);
      if (Math.floor(a / 80) !== cx) continue;
      const w = radius + 0.32 * Math.sin(z * 0.062);
      const pt = (x, z) => [x, ground(x, z) + 0.105, z];
      quad(mesh, pt(a - w, z), pt(b - w, z + 4), pt(b + w, z + 4), pt(a + w, z), col, false);
      if (radius > 4 && (z < 1005 || z > 1036)) {
        for (let side of [-1, 1]) {
          const px = a + side * (w - 0.39 - rand() * 0.65),
            pz = z + rand() * 3.6;
          const sy = ground(px, pz) + 0.125;
          disc(mesh, px, sy, pz, 0.17 + rand() * 0.35, 0.16 + rand() * 0.5, '9a8d69', 4);
        }
      }
    }
  }
  ribbon(roadX, 5.4, 'a69770');
  ribbon(trailX, 1.15, '7d815d');
  const inRiver = (x, z) => z >= 1007 && z <= 1036;
  const inCastle = (x, z) => z > 1424 && z < 1572 && Math.abs(x - 30) < 37;
  for (const { x, z, h, rad, oak, seed, painted } of sceneryTrees(cx, cz)) {
    const y = ground(x, z);
    disc(mesh, x, y + 0.035, z, rad * 0.97, rad * 0.92, '434f38', 7);
  }
  for (let i = 0; i < 34; i++) {
    const x = x0 + rand() * 80,
      z = z0 + rand() * 80,
      y = ground(x, z),
      road = Math.abs(x - roadX(z));
    if (inRiver(x, z) || inCastle(x, z) || road < 4.95 || Math.abs(x - trailX(z)) < 1.05) continue;
    const s = 0.28 + rand() * 1.1;
    if (i % 8 === 0) stone(mesh, x, y - 0.09, z, s, s * 0.8, s * 0.81, '858b77', rand() * TAU);
    else if (i % 5 === 0) fern(mesh, x, y, z, s, rand);
    else
      for (let j = 0; j < 4; j++) {
        const X = x + (rand() - 0.5) * 0.75,
          Z = z + (rand() - 0.5) * 0.75,
          h = 0.18 + rand() * 0.56;
        tri(
          mesh,
          [X - 0.075, y, Z],
          [X + 0.13, y + h, Z + 0.03],
          [X + 0.075, y, Z + 0.05],
          j % 2 ? '8c9963' : '6e8959'
        );
      }
  }
  if (z0 <= 1021 && z0 + 80 >= 1021) {
    const y = 0.07;
    quad(mesh, [x0, y, 1009], [x0, y, 1034], [x0 + 80, y, 1034], [x0 + 80, y, 1009], '568f92', false);
    for (let i = 0; i < 47; i++) {
      const x = x0 + rand() * 80,
        z = 1010 + rand() * 23,
        d = 0.5 + rand() * 2.6;
      quad(
        mesh,
        [x, y + 0.016, z],
        [x + 0.2, y + 0.016, z + 0.11],
        [x + d, y + 0.016, z + 0.1],
        [x + d - 0.11, y + 0.016, z],
        i % 2 ? '8eb5ae' : '75a4a3',
        false
      );
    }
    if (x0 <= -125 && x0 + 80 > -125)
      for (let i = 0; i < 16; i++) {
        const x = -125 + Math.sin(i * 1.3) * 2.1,
          z = 1008 + i * 1.76;
        stone(mesh, x, y - 0.19, z, 1.62, 0.53, 1.42, '989a87', rand() * TAU);
      }
  }
  return mesh;
}
function makeLandmarks(m) {
  const rand = rng(173);
  // Deliberate foreground composition: long limbs make a natural arch and a band
  // of warm leaves marks the opening, visible when the player turns back.
  for (const [x, z, h, rad] of clearingTrees) {
    registerObstacle(x, z, rad * 0.15);
  }
  for (let i = 0; i < 100; i++) {
    const z = rand() * 48 - 11,
      x = (5.55 + rand() * 8) * (i % 2 ? -1 : 1),
      y = ground(x, z);
    if (i % 7 === 0) mushroom(m, x, y, z, 0.22 + rand() * 0.29);
    else if (i % 4 === 0) stone(m, x, y - 0.08, z, 0.33, 0.28, 0.45, '929680', rand() * TAU);
    else fern(m, x, y, z, 0.46 + rand() * 0.73, rand);
  }
  for (const s of [-1, 1]) {
    const x = s * 6.2,
      z = 8 + s * 1.4,
      y = ground(x, z);
    beam(m, [x, y, z], [x + s * 0.23, y + 2.1, z], 0.083, 0.065, '7a654e');
    beam(m, [x + s * 0.23, y + 2.08, z], [x - s * 0.4, y + 2.08, z], 0.059, 0.041, '978464');
    lantern(m, x - s * 0.39, y + 1.46, z, 0.94);
  }
  for (const z of [220, 480, 610, 1130, 1240]) {
    const x = roadX(z) + 7,
      y = ground(x, z);
    stone(m, x, y - 0.1, z, 1.48, 2.05, 0.82, '8a8a76', 0.5);
    box(m, x, y + 1.15, z - 0.68, 0.43, 0.47, 0.04, 'b7b593');
    for (const side of [-1, 1])
      beam(
        m,
        [x + side * 0.02, y + 1.26, z - 0.72],
        [x + side * 0.17, y + 1.46, z - 0.72],
        0.045,
        0.045,
        '718272'
      );
    if (z === 220) {
      const a = [x - 0.12, y + 1.25, z - 0.75],
        b = [x + 0.08, y + 1.21, z - 0.78],
        c = [x + 0.16, y + 0.54, z - 0.79];
      tri(m, a, b, c, '7b9ab1', false);
      beam(m, [x - 0.16, y + 1.4, z - 0.76], a, 0.035, 0.035, 'a58a61');
      beam(m, a, b, 0.035, 0.035, 'a58a61');
    }
  }
  spring(m);
  castle(m);
}
function makeBackdrop(m) {
  const rand = rng(145);
  for (let layer = 0; layer < 3; layer++) {
    const rad = layer === 0 ? 1900 : layer === 1 ? 1480 : 1170,
      col = ['969ba9', '8c9aa4', '7d9194'][layer],
      no = 68;
    const points = [];
    for (let i = 0; i < no; i++) {
      const a = (i * TAU) / no,
        factor = (Math.sin(a * 7 + layer) + 1) * 0.5;
      points.push([
        Math.cos(a) * rad,
        55 + factor * 95 + rand() * 110 + (2 - layer) * 43,
        700 + Math.sin(a) * rad,
      ]);
    }
    for (let i = 0; i < no; i++) {
      const a = points[i],
        b = points[(i + 1) % no],
        foot = [a[0] * 0.79, -30, 700 + (a[2] - 700) * 0.79];
      tri(m, foot, a, b, col);
      tri(m, foot, b, [b[0] * 0.79, -30, 700 + (b[2] - 700) * 0.79], scaleColor(col, 0.98));
    }
  }
}
function bell(m, size) {
  for (const s of [-1, 1]) {
    box(m, s * 0.87, 0, 0, 0.17, 2.83, 0.2, '817059');
    stone(m, s * 0.87, -0.03, 0, 0.32, 0.28, 0.34, '989b88');
  }
  box(m, 0, 2.66, 0, 2.12, 0.26, 0.31, '8e7d63');
  beam(m, [0, 2.75, 0], [0, 2.39, 0], 0.045, 0.045, 'a08a64');
  const y = 2.39,
    h = size;
  rings(
    m,
    [
      [0, y - h, 0, size * 0.58],
      [0, y - h * 0.9, 0, size * 0.61],
      [0, y - h * 0.73, 0, size * 0.43],
      [0, y - h * 0.21, 0, size * 0.32],
      [0, y, 0, size * 0.14],
    ],
    10,
    (j, k) => (k % 4 ? 'b09a66' : 'cfb67a'),
    0.12
  );
  beam(m, [0, y - h * 0.85, 0], [0, y - h * 1.12, 0], 0.043, 0.064, '645944');
}
function makeSatchel(m) {
  stone(m, 0, 0.025, 0, 0.37, 0.43, 0.24, '9b7454');
  box(m, 0, 0.17, -0.203, 0.54, 0.18, 0.065, 'ba9068');
  box(m, 0, 0.21, -0.244, 0.08, 0.07, 0.025, 'e1c383');
  beam(m, [-0.2, 0.32, 0], [0, 0.59, 0.035], 0.032, 0.032, '765d46');
  beam(m, [0, 0.59, 0.035], [0.22, 0.32, 0], 0.032, 0.032, '765d46');
}
function makeBanquet(m) {
  // Fallen stag: the approaching player first sees the antlers against the runner.
  stone(m, 0, 0.08, 0, 0.48, 0.68, 0.84, '795c55');
  stone(m, 0.22, 0.07, -0.82, 0.2, 0.29, 0.33, '8c7261');
  for (const s of [-1, 1]) {
    beam(m, [s * 0.28, 0.24, 0.47], [s * 0.6, 0.08, 0.79], 0.095, 0.04, '846758');
    beam(m, [0.2 + s * 0.09, 0.24, -0.82], [0.21 + s * 0.32, 0.56, -1.11], 0.035, 0.015, 'c3ad86');
    beam(m, [0.21 + s * 0.24, 0.41, -0.99], [0.2 + s * 0.45, 0.48, -0.91], 0.028, 0.008, 'c3ad86');
  }
  disc(m, 0, 0.045, -0.38, 0.67, 0.85, '734d48');
  tri(m, [0.22, 0.21, -0.87], [0.31, 0.16, -0.86], [0.6, 0.075, -0.53], '7b9ab1', false);
}
const vertexShader = `
attribute vec3 aPosition,aColor;
uniform vec3 uCamera, uModel;
uniform vec4 uView;
uniform vec2 uLens;
uniform vec4 uPose;
uniform float uMode,uTime;
varying vec3 vColor,vPos;
varying float vDist;
void main(){
 vec3 p=aPosition*uPose.z;
 float c=uPose.x,s=uPose.y;
 vec3 w=vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z)+uModel;
 if(uMode<.5 && w.y>3.0){float sway=sin(w.x*.057+w.z*.042+uTime*.58)*.021; w.x+=sway;}
 vec3 delta=w-uCamera;
 float forward=delta.x*uView.x+delta.z*uView.y;
 vec3 eye=vec3(delta.x*uView.y-delta.z*uView.x,delta.y*uView.w-forward*uView.z,forward*uView.w+delta.y*uView.z);
 if(uMode>1.5 && uMode<2.5) eye=w;
 vColor=aColor;vPos=w;vDist=length(delta.xz);
 gl_Position=vec4(eye.x*uLens.x,eye.y*uLens.y,eye.z*1.00008-.12,eye.z);
}`;
const fragShader = `
precision highp float;
uniform float uMode,uTime,uHurt,uHex,uGold;
uniform vec3 uCamera;uniform sampler2D uPaint,uWarm;
varying vec3 vColor,vPos;varying float vDist;
void main(){
 vec3 c=vColor;
 if(uMode<.5){
   bool isRoad=abs(vColor.r-.651)<.007&&abs(vColor.g-.592)<.007;
   bool isSoil=vColor.g>vColor.r*1.12&&vColor.r>vColor.b*.98&&vPos.y<32.;
   if(isRoad||isSoil){
     vec2 uv=fract(vPos.xz*.24);
     vec3 ink=isRoad?texture2D(uWarm,uv).rgb:texture2D(uPaint,uv).rgb;
     float fleck=(.5+.5*sin(vPos.x*.53+sin(vPos.z*.22)))*(.5+.5*sin(vPos.z*.71+cos(vPos.x*.41)));
     c=mix(c,ink*(.91+.30*fleck),1.-smoothstep(21.,96.,vDist));
   }
 }
 float dapple=.5+.5*sin(vPos.x*.42+sin(vPos.z*.41)) * sin(vPos.z*.36+sin(vPos.x*.61));
 if(uMode<.5){c*=.92+.11*dapple;float detail=sin(vPos.x*6.0+vPos.z*5.0)*sin(vPos.z*3.0+vPos.y*4.0);c+=.009*detail*(1.-smoothstep(8.,35.,vDist));}
 if(uMode>2.5 && uMode<3.5 && vDist<115.) discard;
 if(!(uMode>1.5 && uMode<2.5)){
   float fog=(1.-exp(-vDist*.00123))*.78;
   if(uMode>3.5)fog*=.53;
   vec3 haze=mix(vec3(.62,.69,.70),vec3(.82,.72,.63),clamp((vPos.x-uCamera.x)/max(vDist,.1)*-.35+.22,0.,1.));
   c=mix(c,haze,fog);
   float clarity=1.-smoothstep(15.,80.,vDist);
   c+=vec3(.034,.028,-.002)*clarity;
 }
 c=mix(c,c*vec3(1.08,.97,.94)+vec3(.08,.036,.0),uGold*.5);
 c=mix(c,vec3(.29,.16,.46),uHex*.20);
 c=mix(c,vec3(.47,.11,.12),uHurt*.16);
 gl_FragColor=vec4(c,1.);
}`;
const skyVertex = `attribute vec2 aPosition;varying vec2 vUV;void main(){vUV=aPosition;gl_Position=vec4(aPosition,.99999,1.);}`;
const skyFrag = `
precision highp float;
varying vec2 vUV;
uniform vec4 uView;uniform vec2 uLens;uniform float uTime,uGold,uSkyReady;uniform sampler2D uSky;
float hash(vec2 p){return fract(sin(dot(p,vec2(41.71,83.13)))*4398.69);}
float noise(vec2 p){vec2 f=fract(p);vec2 t=f*f*(3.-2.*f);vec2 i=floor(p);return mix(mix(hash(i),hash(i+vec2(1.,0.)),t.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),t.x),t.y);}
void main(){
 vec3 ray=normalize(vec3(vUV.x/uLens.x,vUV.y/uLens.y,1.));
 float h=ray.y*uView.w+ray.z*uView.z, f=ray.z*uView.w-ray.y*uView.z;
 vec3 dir=vec3(ray.x*uView.y+f*uView.x,h,-ray.x*uView.x+f*uView.y);
 vec3 sun=normalize(vec3(-.37,.29,.76));float dy=max(0.,dir.y), nearSun=max(dot(dir,sun),0.);
 vec3 horizon=mix(vec3(.76,.81,.76),vec3(.93,.76,.58),pow(nearSun,5.));
 vec3 zenith=mix(vec3(.29,.46,.56),vec3(.45,.55,.64),uGold);
 vec3 col=mix(horizon,zenith,smoothstep(-.03,.96,dy));
 vec2 cloudUV=dir.xz/(dy+.19)*2.+vec2(uTime*.002,0.);
 float n=noise(cloudUV*vec2(.7,1.95))*.57+noise(cloudUV*vec2(1.8,4.9))*.31+noise(cloudUV*vec2(4.,11.))*.12;
 float cloud=smoothstep(.50,.77,n)*smoothstep(.015,.17,dy)*.76;
 col=mix(col,mix(vec3(.81,.81,.78),vec3(.99,.86,.70),nearSun),cloud);
 float dist=length(dir-sun);col+=vec3(.24,.15,.05)*exp(-dist*7.0);
 col=mix(col,vec3(1.,.95,.78),1.-smoothstep(.040,.046,dist));
 col+=vec3(.041,.033,.013)*(1.-smoothstep(.001,.004,abs(dist-.058)));
 if(uSkyReady>.5){vec2 uv=vec2(fract(.5+atan(dir.x,dir.z)*.15915494),clamp(.5-asin(clamp(dir.y,-1.,1.))*.31830989,0.,1.));col=mix(col,texture2D(uSky,uv).rgb,.91);}
 float grit=hash(gl_FragCoord.xy)*.008;gl_FragColor=vec4(col+grit,1.);
}`;
const pointVertex = `
attribute vec3 aPosition,aColor;
uniform vec3 uCamera;uniform vec4 uView;uniform vec2 uLens;uniform float uHeight,uTime,uParticle;
varying vec3 vColor;varying float vPhase,vDepth;
void main(){
 vec3 p=aPosition;
 if(uParticle>.5){p.y+=sin(uTime*.93+aColor.x*12.)*.19;p.x+=sin(uTime*.54+aColor.y*16.)*.23;}
 vec3 delta=p-uCamera;
 float f=delta.x*uView.x+delta.z*uView.y;
 vec3 eye=vec3(delta.x*uView.y-delta.z*uView.x,delta.y*uView.w-f*uView.z,f*uView.w+delta.y*uView.z);
 gl_Position=vec4(eye.x*uLens.x,eye.y*uLens.y,eye.z*1.00008-.12,eye.z);
 gl_PointSize=clamp(uHeight*uLens.y*(uParticle>.5?.062:.92)/max(.10,eye.z),uParticle>.5?1.4:1.0,uParticle>.5?10.:92.);
 vColor=aColor;vPhase=aColor.r*19.+aColor.g*31.;vDepth=eye.z;
}`;
const pointFrag = `
precision highp float;uniform float uTime,uParticle;varying vec3 vColor;varying float vPhase,vDepth;
void main(){
 vec2 uv=gl_PointCoord;
 if(uParticle>.5){float ds=length(uv-.5);float alpha=1.-smoothstep(.13,.5,ds);if(alpha<.04)discard;gl_FragColor=vec4(1.,.85,.44,alpha*(.68+.30*sin(vPhase+uTime))*(1.-smoothstep(42.,92.,vDepth)));return;}
 float gait=sin(uTime*3.+vPhase)*.06;vec2 p=uv-.5;
 float head=length((p-vec2(gait*.20,-.34))*vec2(1.,.94))-.083;
 float shoulders=max(abs(p.x-gait*.2)-(.16-abs(p.y+.10)*.22),abs(p.y+.08)-.19);
 float arms=max(abs(abs(p.x)-(.18-.16*p.y))-.046,abs(p.y-.015)-.20);
 float legs=max(abs(abs(p.x)-(.081+abs(gait)*.5+p.y*.048))-.048,abs(p.y-.28)-.209);
 if(vDepth<220. && min(min(head,shoulders),min(arms,legs))>0.)discard;
 gl_FragColor=vec4(mix(vColor,vec3(.56,.64,.62),smoothstep(35.,800.,vDepth)*.65),1.);
}`;
const standVertex = `
attribute vec3 aPosition,aColor;uniform vec3 uCamera;uniform vec4 uView;uniform vec2 uLens;varying vec2 uv;varying float dep;varying float opacity;
void main(){opacity=aColor.z;vec3 v=aPosition-uCamera;float f=dot(v.xz,uView.xy);vec3 e=vec3(v.x*uView.y-v.z*uView.x,v.y*uView.w-f*uView.z,f*uView.w+v.y*uView.z);uv=aColor.xy;dep=e.z;gl_Position=vec4(e.x*uLens.x,e.y*uLens.y,e.z*1.00008-.12,e.z);}
`;
const standFrag = `
precision highp float;uniform sampler2D uArt;varying vec2 uv;varying float dep;varying float opacity;
void main(){vec4 c=texture2D(uArt,uv);if(c.a<.36||fract(dot(floor(gl_FragCoord.xy),vec2(.75488,.56984)))>opacity)discard;gl_FragColor=vec4(mix(c.rgb,vec3(.59,.65,.58),min(.33,max(0.,dep)*.0019)),1.);}
`;
function program(gl, vs, fs) {
  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw Error(info);
    }
    return s;
  }
  const a = compile(gl.VERTEX_SHADER, vs),
    b = compile(gl.FRAGMENT_SHADER, fs),
    p = gl.createProgram();
  gl.attachShader(p, a);
  gl.attachShader(p, b);
  gl.linkProgram(p);
  gl.deleteShader(a);
  gl.deleteShader(b);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p));
  const attrs = {},
    uni = {};
  for (const n of ['aPosition', 'aColor']) attrs[n] = gl.getAttribLocation(p, n);
  for (const n of [
    'uCamera',
    'uView',
    'uLens',
    'uTime',
    'uModel',
    'uPose',
    'uMode',
    'uHurt',
    'uHex',
    'uGold',
    'uHeight',
    'uParticle',
    'uArt',
    'uPaint',
    'uWarm',
    'uSky',
    'uSkyReady',
  ])
    uni[n] = gl.getUniformLocation(p, n);
  return { p, attrs, uni };
}
function farTerrain(m) {
  const grid = 54;
  for (let x = -756; x < 756; x += grid)
    for (let z = -270; z < 1728; z += grid) {
      const p = (a, b) => [a, ground(a, b) - 1.2, b];
      quad(
        m,
        p(x, z),
        p(x, z + grid),
        p(x + grid, z + grid),
        p(x + grid, z),
        z > 1130 ? '788373' : '647a62'
      );
    }
}
function farTrees(m) {
  const R = rng(9467);
  for (let i = 0; i < 4200; i++) {
    const x = (R() - 0.5) * 1300,
      z = -210 + R() * 1920,
      road = Math.abs(x - roadX(z));
    if (
      ridgeVista(x, z) ||
      road < 16 ||
      Math.abs(x - trailX(z)) < 8 ||
      Math.abs(z - 1020) < 20 ||
      (z > 1421 && Math.abs(x - 30) < 46) ||
      (z > 1130 && z < 1410 && x > -415 && x < 70) ||
      (z > 1120 && R() > 0.26)
    )
      continue;
    const y = ground(x, z) - 0.4,
      h = 7 + R() * 17,
      w = h * (0.13 + R() * 0.12),
      c = R() > 0.65 ? '54705e' : '466557';
    const top = [x, y + h, z];
    for (let j = 0; j < 4; j++) {
      const a = (j * TAU) / 4,
        b = a + TAU / 4;
      tri(
        m,
        [x + Math.cos(a) * w, y, z + Math.sin(a) * w],
        top,
        [x + Math.cos(b) * w, y, z + Math.sin(b) * w],
        c
      );
    }
  }
}
function makeHand(m) {
  beam(m, [0.19, -0.56, 0.33], [0.155, -0.24, 0.53], 0.066, 0.04, '596650');
  stone(m, 0.15, -0.245, 0.54, 0.063, 0.117, 0.039, 'a78970');
  for (let i = 0; i < 4; i++) {
    const x = 0.1 + i * 0.029;
    beam(
      m,
      [x, -0.145, 0.544],
      [x + (i - 1.3) * 0.012, -0.048 + Math.abs(i - 1) * -0.01, 0.565],
      0.016,
      0.01,
      'b99b7e'
    );
  }
  beam(m, [0.102, -0.19, 0.543], [0.056, -0.131, 0.58], 0.02, 0.013, 'b3987a');
}
function makeTraveller(m) {
  for (const s of [-1, 1]) {
    beam(m, [s * 0.128, 0.85, 0], [s * 0.15, 0.13, 0], 0.089, 0.053, '655d50');
    stone(m, s * 0.15, 0.035, -0.04, 0.08, 0.15, 0.16, '5c5148');
  }
  rings(
    m,
    [
      [0, 0.71, 0, 0.29, 0.18],
      [0, 1.29, 0, 0.25, 0.165],
      [0, 1.43, 0, 0.17, 0.12],
    ],
    7,
    '7d8268'
  );
  stone(m, 0, 1.4, 0, 0.147, 0.34, 0.14, 'ad947d');
  rings(
    m,
    [
      [0, 1.68, 0, 0.152, 0.15],
      [0, 1.79, 0, 0.108, 0.1],
    ],
    7,
    '695547'
  );
  for (const s of [-1, 1]) beam(m, [s * 0.23, 1.29, 0], [s * 0.3, 0.88, -0.04], 0.08, 0.055, '8d8a70');
}
// Only the nearest visible marchers receive illustrated bodies. Stable identity,
// height, gait phase and clothes follow a marcher as it enters or leaves this tier.
function makeMarcherTier() {
  const ids = new Set(),
    selected = [],
    candidates = [];
  let sampled = -Infinity,
    oldYaw = 0,
    oldX = 0,
    oldZ = 0,
    oldWorld = null;
  function update(world, aspect, time) {
    const p = world.player,
      s = Math.sin(p.yaw),
      c = Math.cos(p.yaw),
      slope = aspect / 1.37;
    const refresh =
      oldWorld !== world ||
      time < sampled ||
      time - sampled >= 0.16 ||
      Math.abs(p.yaw - oldYaw) > 0.12 ||
      Math.hypot(p.x - oldX, p.z - oldZ) > 1.6;
    if (refresh) {
      sampled = time;
      oldWorld = world;
      oldYaw = p.yaw;
      oldX = p.x;
      oldZ = p.z;
      selected.length = candidates.length = 0;
      ids.clear();
      const head = hordePosition(world, 0),
        tail = hordePosition(world, HORDE_COUNT - 1);
      // Account for both ends of a snaking column as it rounds the castle.
      if (
        Math.hypot(head.x - p.x, head.z - p.z) < 245 ||
        Math.hypot(tail.x - p.x, tail.z - p.z) < 245 ||
        world.ropeFallen
      ) {
        for (let id = 0; id < HORDE_COUNT; id++) {
          const at = hordePosition(world, id),
            dx = at.x - p.x,
            dz = at.z - p.z,
            depth = dx * s + dz * c,
            dist2 = dx * dx + dz * dz;
          if (depth > 0.7 && dist2 < 70 * 70 && Math.abs(dx * c - dz * s) < depth * slope + 0.75)
            candidates.push({ id, dist2 });
        }
        candidates.sort((a, b) => a.dist2 - b.dist2 || a.id - b.id);
        // Sorting a fixed shortlist per fifth of a second bounds draw cost and
        // leaves distant figures in the batched crowd pass.
        for (const m of candidates.slice(0, 48)) {
          selected.push(m.id);
          ids.add(m.id);
        }
      }
    }
    const future = Object.create(world);
    future.elapsed = world.elapsed + 0.65;
    const earlier = Object.create(world);
    earlier.elapsed = Math.max(0, world.elapsed - 0.65);
    const poses = selected.map((id) => {
      const cur = hordePosition(world, id),
        a = hordePosition(earlier, id),
        b = hordePosition(future, id);
      const dx = b.x - a.x,
        dz = b.z - a.z,
        side = dx * c - dz * s;
      const phase = ((id * 37) % 101) * 0.117 + world.elapsed * (2.55 + ((id * 3) % 11) * 0.054);
      const sway = Math.sin(phase) * 0.038,
        bob = Math.pow(Math.cos(phase), 2) * 0.042;
      return {
        id,
        x: cur.x + sway * c,
        z: cur.z - sway * s,
        dy: bob,
        h: 1.64 + ((id * 19) % 31) * 0.011,
        w: 0.9 + ((id * 13) % 17) * 0.013,
        flip: side < 0,
        seed: id,
        kind: (id * 13) % 43 < 22 ? 0 : 1,
      };
    });
    return { poses, ids };
  }
  return { update, ids };
}
function createGLRenderer(canvas, gl) {
  const programs = [
    program(gl, vertexShader, fragShader),
    program(gl, skyVertex, skyFrag),
    program(gl, pointVertex, pointFrag),
    program(gl, standVertex, standFrag),
    program(
      gl,
      'attribute vec3 aPosition,aColor;varying vec2 uv;void main(){uv=aColor.xy;gl_Position=vec4(aPosition.xy,0.,1.);}',
      'precision highp float;uniform sampler2D uArt;varying vec2 uv;void main(){vec4 c=texture2D(uArt,uv);if(c.a<.02)discard;gl_FragColor=c;}'
    ),
  ];
  const [solid, sky, points, stands, held] = programs;
  const buffers = new Set(),
    textures = new Set();
  const newTexture = (source) => {
    const tex = gl.createTexture();
    textures.add(tex);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (source) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    else
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([130, 140, 118, 255])
      );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  };
  const imageTexture = (name) => {
    const im = artImage(name),
      item = { im, tex: newTexture(), ready: false };
    im.onload = () => {
      if (disposed) return;
      gl.bindTexture(gl.TEXTURE_2D, item.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
      item.ready = true;
    };
    return item;
  };
  const paintedTree = imageTexture('tree.webp'),
    paintedPine = imageTexture('pine.webp'),
    paintedWitch = imageTexture('witch-figure.webp'),
    paintedXero = imageTexture('xero.webp'),
    paintedSword = imageTexture('sword.webp'),
    paintedCastle = imageTexture('castle.webp'),
    paintedHall = imageTexture('hall.webp'),
    paintedSky = imageTexture('sky.webp');
  const marcherArt = [imageTexture('marcher-1.webp'), imageTexture('marcher-2.webp')],
    marcherTier = makeMarcherTier();
  const groundAtlas = artImage('woodland-ground.webp');
  const mossTex = newTexture(floorPaint('moss').canvas),
    roadTex = newTexture(floorPaint('road').canvas);
  groundAtlas.onload = () => {
    if (disposed) return;
    const sw = Math.floor(groundAtlas.naturalWidth / 2),
      sh = groundAtlas.naturalHeight,
      tile = document.createElement('canvas');
    tile.width = sw;
    tile.height = sh;
    const c = tile.getContext('2d');
    for (const [tx, offset] of [
      [mossTex, 0],
      [roadTex, sw],
    ]) {
      c.clearRect(0, 0, sw, sh);
      c.drawImage(groundAtlas, offset, 0, sw, sh, 0, 0, sw, sh);
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tile);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    tile.width = tile.height = 1;
  };
  function useTexture(unit, tex, loc) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(loc, unit);
  }

  function makeBuffer(values, dynamic = false, stride = 6) {
    const data = values instanceof Float32Array ? values : new Float32Array(values),
      b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
    buffers.add(b);
    return { b, count: data.length / stride };
  }
  function model(fn) {
    const m = [];
    fn(m);
    return makeBuffer(m);
  }
  const models = {
    hall: model((m) => makeHall(m, hallTools)),
    hallProps: model((m) => makeHallProps(m, hallTools)),
    paintedHall: makeBuffer(hallSurfaceVertices()),
    pineProxy: model((m) => pine(m, 0, 0, 0, 1, 0.22, rng(15))),
    oakProxy: model((m) => broadleaf(m, 0, 0, 0, 1, 0.3, rng(19))),
    landscape: model(farTerrain),
    mountains: model(makeBackdrop),
    farTrees: model(farTrees),
    landmarks: model(makeLandmarks),
    witch: model(makeWitch),
    princess: model(makePrincess),
    troll: model(makeTroll),
    wolf: model(makeWolf),
    dragon: model(makeDragon),
    satchel: model(makeSatchel),
    body: model(makeBanquet),
    traveller: model(makeTraveller),
    sword: model(makeBlade),
    hand: model(makeHand),
    bridge: model(makeBridge),
    low: model((m) => bell(m, 1.14)),
    mid: model((m) => bell(m, 0.86)),
    high: model((m) => bell(m, 0.59)),
    rope: model((m) => {
      beam(m, [0.46, 0.09, 0.08], [0.46, 4.22, 0.08], 0.038, 0.036, 'bcac7d');
      for (let i = 0; i < 5; i++)
        rings(
          m,
          [
            [0.46, 0.14 + i * 0.1, 0.08, 0.049],
            [0.46, 0.18 + i * 0.1, 0.08, 0.053],
          ],
          6,
          'cab888'
        );
    }),
    fallen: model((m) => {
      for (let i = 0; i < 12; i++)
        beam(
          m,
          [0.46 + i * 0.1, 0.07, 0.08 + Math.sin(i * 0.6) * 0.15],
          [0.56 + i * 0.1, 0.07, 0.08 + Math.sin((i + 1) * 0.6) * 0.15],
          0.033,
          0.033,
          'c4b185'
        );
    }),
  };
  const crowdData = new Float32Array(HORDE_COUNT * 6),
    crowd = makeBuffer(crowdData, true);
  const pollenData = new Float32Array(104 * 6),
    pollen = makeBuffer(pollenData, true);
  const standData = new Float32Array(768 * 36),
    standMesh = makeBuffer(standData, true);
  const skyMesh = makeBuffer([-1, -1, 3, -1, -1, 3], false, 2);
  const cells = new Map(),
    locations = [];
  for (let j = -3; j < 4; j++) for (let i = -3; i < 4; i++) locations.push([i, j]);
  let crowdAt = -1e4,
    elapsedAt = -1e4,
    particleAt = -1e4,
    oldX = NaN,
    oldZ = NaN,
    distance = 0,
    lastRender = 0,
    slow = 0,
    quality = 1,
    disposed = false;
  function resize() {
    const width = canvas.clientWidth || canvas.width || 640,
      height = canvas.clientHeight || canvas.height || 400;
    const ratio =
      Math.min(window.devicePixelRatio || 1, 1.6, Math.sqrt(1550000 / (width * height))) * quality;
    const w = Math.max(1, Math.round(width * ratio)),
      h = Math.max(1, Math.round(height * ratio));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
  }
  function bind(p, b, skyMode = false) {
    gl.bindBuffer(gl.ARRAY_BUFFER, b.b);
    gl.enableVertexAttribArray(p.attrs.aPosition);
    if (skyMode) {
      const other = solid.attrs.aColor;
      if (other !== p.attrs.aPosition) gl.disableVertexAttribArray(other);
      gl.vertexAttribPointer(p.attrs.aPosition, 2, gl.FLOAT, false, 8, 0);
    } else {
      gl.vertexAttribPointer(p.attrs.aPosition, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(p.attrs.aColor);
      gl.vertexAttribPointer(p.attrs.aColor, 3, gl.FLOAT, false, 24, 12);
    }
  }
  let crowdTierKey = '';
  function updateHorde(w, t, nearIds) {
    const key = Array.from(nearIds).join(',');
    if (t - crowdAt < 0.18 && w.elapsed >= elapsedAt && key === crowdTierKey) return;
    crowdTierKey = key;
    crowdAt = t;
    elapsedAt = w.elapsed;
    for (let i = 0; i < HORDE_COUNT; i++) {
      const p = hordePosition(w, i),
        j = i * 6,
        v = ((i * 19) % 31) * 0.004;
      crowdData[j] = p.x;
      crowdData[j + 1] = nearIds.has(i) ? -90 : ground(p.x, p.z) + 0.88;
      crowdData[j + 2] = p.z;
      crowdData[j + 3] = 0.26 + v;
      crowdData[j + 4] = 0.285 + v * 0.65;
      crowdData[j + 5] = 0.28 + v * 0.73;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, crowd.b);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, crowdData);
  }
  function updatePollen(px, pz, t) {
    const grid = 16,
      x0 = Math.floor(px / grid),
      z0 = Math.floor(pz / grid),
      key = x0 * 12417 + z0;
    if (key === particleAt) return;
    particleAt = key;
    let i = 0;
    for (let dz = -2; dz <= 2; dz++)
      for (let dx = -2; dx <= 2; dx++) {
        const cx = x0 + dx,
          cz = z0 + dz,
          r = rng(cx * 161 + cz * 501 + 997);
        for (let n = 0; n < 4; n++) {
          const x = (cx + r()) * grid,
            z = (cz + r()) * grid;
          pollenData[i++] = x;
          pollenData[i++] = ground(x, z) + 0.4 + r() * 4.6;
          pollenData[i++] = z;
          pollenData[i++] = r();
          pollenData[i++] = r();
          pollenData[i++] = 1;
        }
      }
    pollen.count = i / 6;
    gl.bindBuffer(gl.ARRAY_BUFFER, pollen.b);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, pollenData);
  }
  function render(w, t = 0) {
    if (disposed || !w?.player || gl.isContextLost()) return;
    if (!Number.isFinite(t)) t = w.elapsed || 0;
    if (lastRender && t - lastRender > 0.041 && t - lastRender < 0.3) {
      slow++;
    } else slow = Math.max(0, slow - 1);
    if (slow > 50 && quality > 0.71) {
      quality = Math.max(0.7, quality - 0.1);
      slow = 0;
    }
    lastRender = t;
    resize();
    const p = w.player,
      px = p.x,
      pz = p.z,
      yaw = p.yaw || 0,
      pitch = Math.max(-1.35, Math.min(1.35, p.pitch || 0));
    const movement = Number.isFinite(oldX) ? Math.min(1, Math.hypot(px - oldX, pz - oldZ)) : 0;
    distance += movement;
    oldX = px;
    oldZ = pz;
    const seq = w.sequence,
      sp = seq?.progress || 0,
      bound = seq?.id === 'bound',
      feast = seq?.id === 'feast',
      saved = seq?.id === 'saved';
    const reduced = !!w.reducedMotion;
    const bob = reduced ? 0 : Math.sin(distance * 2.19) * 0.035 * Math.min(1, movement * 8),
      y = ground(px, pz) + 1.66 + bob;
    const aspect = canvas.width / canvas.height,
      lensY = 1.37,
      lensX = lensY / aspect;
    const sy = Math.sin(yaw),
      cy = Math.cos(yaw),
      spit = Math.sin(pitch),
      cpit = Math.cos(pitch);
    const setup = (prog) => {
      const u = prog.uni;
      gl.useProgram(prog.p);
      gl.uniform3f(u.uCamera, px, y, pz);
      gl.uniform4f(u.uView, sy, cy, spit, cpit);
      gl.uniform2f(u.uLens, lensX, lensY);
      gl.uniform1f(u.uTime, t % 10000);
      gl.uniform1f(u.uGold, saved ? sp : 0);
    };
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    setup(sky);
    useTexture(0, paintedSky.tex, sky.uni.uSky);
    gl.uniform1f(sky.uni.uSkyReady, paintedSky.ready ? 1 : 0);
    bind(sky, skyMesh, true);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    setup(solid);
    useTexture(0, mossTex, solid.uni.uPaint);
    useTexture(1, roadTex, solid.uni.uWarm);
    gl.uniform1f(solid.uni.uHurt, feast ? sp : Math.max(0, ((w.hurtUntil || 0) - w.elapsed) / 1.5));
    gl.uniform1f(solid.uni.uHex, bound ? sp : 0);
    function draw(b, x = 0, yy = 0, z = 0, rot = 0, size = 1, mode = 0) {
      if (!b || !b.count) return;
      gl.uniform3f(solid.uni.uModel, x, yy, z);
      gl.uniform4f(solid.uni.uPose, Math.cos(rot), Math.sin(rot), size, 0);
      gl.uniform1f(solid.uni.uMode, mode);
      bind(solid, b);
      gl.drawArrays(gl.TRIANGLES, 0, b.count);
    }
    draw(models.mountains, 0, 0, 0, 0, 1, 4);
    draw(models.landscape);
    draw(models.farTrees, 0, 0, 0, 0, 1, 3);
    const cx = Math.floor(px / 80),
      cz = Math.floor(pz / 80),
      deadline = performance.now() + (cells.size < 4 ? 26 : 4.5);
    const candidates = locations
      .map(([i, j]) => {
        const x = cx + i,
          z = cz + j,
          dx = (x + 0.5) * 80 - px,
          dz = (z + 0.5) * 80 - pz;
        return { x, z, dot: dx * sy + dz * cy, d: Math.hypot(dx, dz), key: x + ',' + z };
      })
      .filter((c) => c.d < 218 && (c.dot > -65 || c.d < 77))
      .sort((a, b) => a.d - b.d);
    let generated = 0;
    for (const c of candidates) {
      let b = cells.get(c.key);
      if (!b && (generated === 0 || performance.now() < deadline)) {
        b = makeBuffer(buildCell(c.x, c.z));
        b.cx = c.x;
        b.cz = c.z;
        cells.set(c.key, b);
        generated++;
      }
      if (b) draw(b);
    }
    if (cells.size > 64)
      for (const [key, b] of cells) {
        if (Math.hypot(b.cx - cx, b.cz - cz) > 3.8) {
          gl.deleteBuffer(b.b);
          buffers.delete(b.b);
          cells.delete(key);
        }
      }
    draw(models.landmarks);
    if (pz > 1280 && Math.abs(px - 30) < 180) draw(models.hall);
    if (w.bridgeOpen) draw(models.bridge);
    for (const a of w.actors || []) {
      if (!a.alive || Math.hypot(px - a.x, pz - a.z) > 255) continue;
      const moving = ['wolf', 'troll', 'dragon'].includes(a.type),
        isXero = a.type === 'princess';
      const m = a.type === 'bell' ? models[a.tone] : models[a.type];
      if (!m) continue;
      // Mesh faces -Z. Simulation heading zero is +Z.
      const rot = a.type === 'bell' ? 0 : (a.heading ?? Math.PI) + Math.PI,
        phase = a.phase || 0;
      const groundY = ground(a.x, a.z);
      let bodyY = groundY,
        scale = 1;
      if (a.type === 'body') bodyY += 0.91 + 0.027 * Math.sin(t * 2.1);
      if (a.type === 'dragon') {
        bodyY += 3.25 + Math.sin(t * 1.13 + phase) * 0.65;
        scale = 1.4;
      } else if (moving) bodyY += Math.max(0, Math.sin(t * 3.8 + phase)) * 0.05;
      else if (isXero && feast && sp < 0.44) bodyY -= 0.29 * (1 - sp / 0.44);
      const frontFacing =
        (px - a.x) * Math.sin(a.heading ?? Math.PI) + (pz - a.z) * Math.cos(a.heading ?? Math.PI) > 0;
      if (
        !(a.type === 'witch' && paintedWitch.ready && frontFacing) &&
        !(isXero && !a.cured && paintedXero.ready)
      )
        draw(m, a.x, bodyY, a.z, rot, scale, 1);
      if (isXero) draw(w.ropeFallen ? models.fallen : models.rope, a.x, groundY, a.z, 0, 1, 1);
    }
    const trees = [];
    for (const c of candidates) trees.push(...sceneryTrees(c.x, c.z));
    for (const [x, z, h, rad] of clearingTrees)
      if (Math.hypot(px - x, pz - z) < 220)
        trees.push({ x, z, h, rad, oak: true, seed: Math.floor(x * z), w: 0.87 });
    for (let i = 0; i < 12 && Math.abs(pz) < 140; i++) {
      const z = 17 + i * 4.1,
        x = (10 + (i % 3) * 3.1) * (i % 2 ? 1 : -1);
      trees.push({ x, z, h: 5.2 + (i % 4) * 1.6, rad: 2.1, oak: false, seed: i, w: 0.88 });
    }
    if (!paintedTree.ready || !paintedPine.ready)
      for (const b of trees) {
        if (!(b.oak ? paintedTree : paintedPine).ready)
          draw(b.oak ? models.oakProxy : models.pineProxy, b.x, ground(b.x, b.z), b.z, 0, b.h);
      }
    setup(stands);
    if (paintedHall.ready && insideHall(px, pz)) {
      useTexture(0, paintedHall.tex, stands.uni.uArt);
      bind(stands, models.paintedHall);
      gl.drawArrays(gl.TRIANGLES, 0, models.paintedHall.count);
    }
    function batchSprites(items, asset) {
      if (!asset.ready || !items.length) return;
      let n = 0;
      const ratio = asset.im.naturalWidth / asset.im.naturalHeight;
      for (const b of items) {
        if (n + 36 > standData.length) break;
        const yy = ground(b.x, b.z) + (b.dy || 0),
          ww = b.h * ratio * 0.5 * (b.w || 1),
          flip = b.flip ?? b.seed % 2 === 0;
        const left = b.x - cy * ww,
          right = b.x + cy * ww,
          zl = b.z + sy * ww,
          zr = b.z - sy * ww;
        for (const v of [
          [left, yy, zl, flip ? 1 : 0, 1],
          [right, yy, zr, flip ? 0 : 1, 1],
          [right, yy + b.h, zr, flip ? 0 : 1, 0],
          [left, yy, zl, flip ? 1 : 0, 1],
          [right, yy + b.h, zr, flip ? 0 : 1, 0],
          [left, yy + b.h, zl, flip ? 1 : 0, 0],
        ]) {
          standData.set(v, n);
          standData[n + 5] = b.alpha ?? 1;
          n += 6;
        }
      }
      useTexture(0, asset.tex, stands.uni.uArt);
      gl.bindBuffer(gl.ARRAY_BUFFER, standMesh.b);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, standData.subarray(0, n));
      bind(stands, standMesh);
      gl.drawArrays(gl.TRIANGLES, 0, n / 6);
    }
    batchSprites(
      trees.filter((b) => b.oak),
      paintedTree
    );
    batchSprites(
      trees.filter((b) => !b.oak),
      paintedPine
    );
    const castleDist = Math.hypot(px - 30, pz - 1435);
    if (pz < 1410 && castleDist > 48 && paintedCastle.ready) {
      const h = 102,
        w = 112 / ((h * paintedCastle.im.naturalWidth) / paintedCastle.im.naturalHeight);
      batchSprites(
        [{ x: 30, z: 1431, h, w, seed: 1, alpha: Math.min(1, (castleDist - 48) / 105) }],
        paintedCastle
      );
    }
    const xero = (w.actors || []).find((a) => a.alive && a.type === 'princess');
    if (xero && !xero.cured && Math.hypot(px - xero.x, pz - xero.z) < 120)
      batchSprites([{ ...xero, h: feast && sp < 0.33 ? 1.55 : 1.96, seed: 1 }], paintedXero);
    const witch = (w.actors || []).find((a) => a.alive && a.type === 'witch');
    if (
      witch &&
      Math.hypot(px - witch.x, pz - witch.z) < 85 &&
      (px - witch.x) * Math.sin(witch.heading ?? Math.PI) +
        (pz - witch.z) * Math.cos(witch.heading ?? Math.PI) >
        0
    )
      batchSprites([{ ...witch, h: 2.4, seed: 1 }], paintedWitch);
    // The procession updates at a lower rate than the camera, including distant ranks.
    // Terrain depth hides groups behind the ridge. Each point becomes a walking figure.
    const detailed =
      pz > 315 && marcherArt.every((a) => a.ready)
        ? marcherTier.update(w, aspect, t)
        : { poses: [], ids: new Set() };
    if (detailed.poses.length) {
      batchSprites(
        detailed.poses.filter((a) => a.kind === 0),
        marcherArt[0]
      );
      batchSprites(
        detailed.poses.filter((a) => a.kind === 1),
        marcherArt[1]
      );
    }
    if (pz > 315) updateHorde(w, t, detailed.ids);
    updatePollen(px, pz, t);
    setup(points);
    gl.uniform1f(points.uni.uHeight, canvas.height);
    if (pz > 315) {
      gl.uniform1f(points.uni.uParticle, 0);
      bind(points, crowd);
      gl.drawArrays(gl.POINTS, 0, crowd.count);
    }
    if (pz < 1415) {
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform1f(points.uni.uParticle, 1);
      bind(points, pollen);
      gl.drawArrays(gl.POINTS, 0, pollen.count);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }
    setup(solid);
    gl.disable(gl.DEPTH_TEST);
    const swordTime = Math.max(0, Math.min(1, ((w.strikeUntil || 0) - w.elapsed) / 0.48));
    const swing = Math.sin(swordTime * Math.PI),
      potionFlash = Math.max(0, (w.potionUntil || 0) - w.elapsed);
    const slide = aspect < 0.95 ? -0.075 : 0,
      tuck = bound ? sp * 0.55 : feast ? Math.max(0, sp - 0.3) * 0.55 : 0;
    if (!paintedSword.ready && (!bound || sp < 0.72))
      draw(
        models.sword,
        slide - swing * 0.32 + Math.sin(distance * 1.4) * 0.006,
        -tuck + bob * 0.25,
        0,
        swing * -0.36,
        1,
        2
      );
    if (paintedSword.ready && (!bound || sp < 0.72)) {
      const W = canvas.width,
        H = canvas.height,
        sz = Math.min(H * 0.52, W * 0.65),
        ang = -swing * 1.06,
        ca = Math.cos(ang),
        sa = Math.sin(ang);
      const wristX = W - 0.2 * sz - swing * 0.21 * W,
        wristY = H - 0.18 * sz + tuck * 0.65 * H + bob * H * 0.05;
      let k = 0;
      for (const [u, v] of [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
        [1, 1],
        [0, 1],
      ]) {
        const x = (u - 0.78) * sz,
          y = (v - 0.78) * sz;
        const xx = wristX + x * ca - y * sa,
          yy = wristY + x * sa + y * ca;
        standData.set([(xx / W) * 2 - 1, 1 - (yy / H) * 2, 0, u, v, 0], k);
        k += 6;
      }
      gl.useProgram(held.p);
      useTexture(0, paintedSword.tex, held.uni.uArt);
      gl.bindBuffer(gl.ARRAY_BUFFER, standMesh.b);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, standData.subarray(0, k));
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      bind(held, standMesh);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.disable(gl.BLEND);
      setup(solid);
    }
    if (bound || (feast && sp > 0.4) || potionFlash > 0.35)
      draw(models.hand, slide - 0.21, -0.1 + (bound ? sp : feast ? sp : potionFlash) * 0.16, 0, 0.14, 1, 2);
    gl.enable(gl.DEPTH_TEST);
  }
  function dispose() {
    disposed = true;
    for (const b of buffers) gl.deleteBuffer(b);
    for (const p of programs) gl.deleteProgram(p.p);
    for (const tex of textures) gl.deleteTexture(tex);
    buffers.clear();
    cells.clear();
  }
  return { render, resize, dispose };
}
// The software path projects the same models, roads and landmarks. It allows a full
// playthrough on devices whose WebGL driver is unavailable.
function softwareRenderer(canvas) {
  let layer = canvas,
    ctx = canvas.getContext('2d');
  if (!ctx) {
    layer = document.createElement('canvas');
    layer.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
    canvas.insertAdjacentElement('afterend', layer);
    ctx = layer.getContext('2d');
  }
  if (!ctx) throw Error('Canvas rendering is unavailable.');
  const models = {};
  for (const [key, fn] of Object.entries({
    witch: makeWitch,
    princess: makePrincess,
    wolf: makeWolf,
    troll: makeTroll,
    dragon: makeDragon,
    satchel: makeSatchel,
    traveller: makeTraveller,
    body: makeBanquet,
    castle,
    well: spring,
    bridge: makeBridge,
    blade: makeBlade,
    hand: makeHand,
    low: (m) => bell(m, 1.14),
    mid: (m) => bell(m, 0.86),
    high: (m) => bell(m, 0.59),
  })) {
    const m = [];
    fn(m);
    models[key] = m;
  }
  for (const [name, make] of [
    ['hall', makeHall],
    ['hallProps', makeHallProps],
  ]) {
    const m = [];
    make(m, hallTools);
    models[name] = m;
  }
  const hallPainter = createHallPainter();
  const treeArt = artImage('tree.webp'),
    pineArt = artImage('pine.webp'),
    witchArt = artImage('witch-figure.webp'),
    xeroArt = artImage('xero.webp'),
    swordArt = artImage('sword.webp'),
    castleArt = artImage('castle.webp');
  const marchers = [artImage('marcher-1.webp'), artImage('marcher-2.webp')],
    marcherTier = makeMarcherTier();
  let skyBackdrop = null,
    floorPainter = null;
  import('./sky.mjs')
    .then((m) => {
      skyBackdrop = m.createSky();
    })
    .catch(() => {});
  import('./ground-paint.mjs')
    .then((m) => {
      floorPainter = m.createGroundPainter();
    })
    .catch(() => {});
  let last = -1e4,
    lastWorld = null;
  function resize() {
    const w = Math.round(canvas.clientWidth || 640),
      h = Math.round(canvas.clientHeight || 400);
    if (layer.width !== w || layer.height !== h) {
      layer.width = w;
      layer.height = h;
    }
  }
  function dispose() {
    if (layer !== canvas) layer.remove();
    floorPainter?.dispose?.();
    hallPainter.dispose?.();
  }
  function render(world, time = 0) {
    if (!world?.player) return;
    if (time >= last && time - last < 1 / 26 && lastWorld === world) return;
    lastWorld = world;
    last = time;
    resize();
    const p = world.player,
      W = layer.width,
      H = layer.height,
      f = H * 0.685,
      ey = ground(p.x, p.z) + 1.66;
    const sy = Math.sin(p.yaw),
      cy = Math.cos(p.yaw),
      sp = Math.sin(p.pitch || 0),
      cp = Math.cos(p.pitch || 0),
      horizon = H * 0.5 + f * Math.tan(p.pitch || 0),
      queue = [];
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#678591');
    sky.addColorStop(0.58, '#d8cda9');
    sky.addColorStop(1, '#8d9b78');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    function ray(x, y, z, own = false) {
      const dx = own ? x : x - p.x,
        dy = own ? y : y - ey,
        dz = own ? z : z - p.z;
      const front = own ? dz : dx * sy + dz * cy,
        side = own ? dx : dx * cy - dz * sy,
        Y = own ? dy : dy * cp - front * sp,
        Z = own ? dz : front * cp + dy * sp;
      if (Z < 0.075) return null;
      return [W * 0.5 + (side / Z) * f, H * 0.5 - (Y / Z) * f, Z];
    }
    function path(pts, c, depth) {
      if (pts.some((v) => !v)) return;
      if (
        pts.every((v) => v[0] < 0) ||
        pts.every((v) => v[1] < 0) ||
        pts.every((v) => v[0] > W) ||
        pts.every((v) => v[1] > H)
      )
        return;
      queue.push({ p: pts, c, d: depth ?? pts.reduce((t, v) => t + v[2], 0) / pts.length });
    }
    function paint() {
      queue.sort((a, b) => b.d - a.d);
      for (const item of queue) {
        const { p, c } = item;
        if (item.draw) {
          item.draw(ctx);
          continue;
        }
        if (item.im) {
          ctx.save();
          ctx.globalAlpha = item.alpha;
          ctx.translate(item.x, item.y);
          if (item.flip) ctx.scale(-1, 1);
          ctx.drawImage(item.im, -item.w * 0.5, -item.h, item.w, item.h);
          ctx.restore();
          continue;
        }
        if (item.glow) {
          const g = ctx.createRadialGradient(item.x, item.y, 0, item.x, item.y, item.r);
          g.addColorStop(0, 'rgba(255,220,122,.78)');
          g.addColorStop(0.16, 'rgba(255,197,85,.35)');
          g.addColorStop(1, 'rgba(255,199,85,0)');
          ctx.fillStyle = g;
          ctx.fillRect(item.x - item.r, item.y - item.r, item.r * 2, item.r * 2);
          continue;
        }
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(p[0][0], p[0][1]);
        for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
        ctx.closePath();
        ctx.fill();
      }
      queue.length = 0;
    }
    function billboard(im, x, y, z, height, flip = false, widthScale = 1, alpha = 1) {
      if (!readyImage(im)) return false;
      const a = ray(x, y, z),
        b = ray(x, y + height, z);
      if (!a || !b) return true;
      const h = Math.abs(a[1] - b[1]),
        width = ((h * im.naturalWidth) / im.naturalHeight) * widthScale;
      if (h < 1 || a[0] + width * 0.5 < 0 || a[0] - width * 0.5 > W || b[1] > H || a[1] < 0) return true;
      queue.push({ im, x: a[0], y: a[1], h, w: width, alpha, flip, d: a[2] });
      return true;
    }
    const hasSky = skyBackdrop?.draw(ctx, W, H, p.yaw, p.pitch || 0, 2 * Math.atan(H / (2 * f)));
    if (!hasSky) {
      const sun = ray(p.x - 370, ey + 290, p.z + 760);
      if (sun) {
        ctx.fillStyle = '#f9e4b3';
        ctx.beginPath();
        ctx.arc(sun[0], sun[1], Math.max(4, H * 0.031), 0, TAU);
        ctx.fill();
      }
      for (let i = 0; i < 2; i++) {
        ctx.fillStyle = i ? '#879b92' : '#99a6a1';
        ctx.beginPath();
        ctx.moveTo(0, horizon + 3);
        for (let x = 0; x <= W + 12; x += 12) {
          const a = p.yaw + (x / W) * 1.45;
          ctx.lineTo(
            x,
            horizon -
              H *
                (0.04 +
                  i * 0.012 +
                  (0.5 + 0.5 * Math.sin(a * (i ? 14 : 8) + i)) * 0.075 +
                  0.012 * Math.sin(a * 38))
          );
        }
        ctx.lineTo(W, horizon + 12);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.fillStyle = '#657550';
    ctx.fillRect(0, Math.max(0, horizon), W, H);
    const hasPaint = floorPainter?.paint(ctx, W, H, p, horizon, ey, time) !== false && !!floorPainter;
    const color = (r, g, b) =>
      'rgb(' +
      Math.min(255, (r * 255) | 0) +
      ',' +
      Math.min(255, (g * 255) | 0) +
      ',' +
      Math.min(255, (b * 255) | 0) +
      ')';
    function drawModel(mesh, x = 0, y = 0, z = 0, rot = 0, s = 1, own = false) {
      const c = Math.cos(rot),
        si = Math.sin(rot);
      for (let i = 0; i < mesh.length; i += 18) {
        const pts = [];
        for (const j of [i, i + 6, i + 12]) {
          const ax = mesh[j],
            az = mesh[j + 2];
          pts.push(ray(x + (ax * c + az * si) * s, y + mesh[j + 1] * s, z + (-ax * si + az * c) * s, own));
        }
        if (!pts[0] || !pts[1] || !pts[2]) continue;
        path(pts, color(mesh[i + 3], mesh[i + 4], mesh[i + 5]));
      }
    }
    // Distant lanes are subdivided more sparsely. The flat colours retain legibility
    // under the software renderer without rendering distant individual grass blades.
    if (!hasPaint)
      for (const [route, width, col] of [
        [roadX, 5.4, '#a69770'],
        [trailX, 1.15, '#7d815d'],
      ]) {
        const start = Math.max(-150, Math.floor((p.z - 215) / 2) * 2),
          end = Math.min(1440, p.z + 420);
        for (let z = start; z < end; ) {
          const dz = Math.abs(z - p.z) < 20 ? 1 : Math.abs(z - p.z) < 70 ? 3 : 11,
            n = z + dz;
          path(
            [
              [route(z) - width, z],
              [route(n) - width, n],
              [route(n) + width, n],
              [route(z) + width, z],
            ].map(([x, z]) => ray(x, ground(x, z) + 0.08, z)),
            col
          );
          z = n;
        }
      }
    function tree(x, z, height, rad, oak, seed) {
      const y = ground(x, z),
        im = oak ? treeArt : pineArt;
      if (Math.abs(x - p.x) < 45 && Math.abs(z - p.z) < 49) {
        const ct = ray(x + rad * 0.22, y + 0.04, z + rad * 0.25),
          edge = ray(x + rad * 0.22, y + 0.04, z + rad * 0.25 + rad * 0.63);
        if (ct && edge) {
          const xx = Math.max(1, (f * rad * 0.71) / ct[2]),
            yy = Math.max(1, Math.abs(edge[1] - ct[1]));
          if (xx < W * 2.0)
            queue.push({
              d: ct[2] + 0.65,
              draw: (c) => {
                c.save();
                c.translate(ct[0], ct[1]);
                c.scale(xx, yy);
                const g = c.createRadialGradient(0, 0, 0.07, 0, 0, 1);
                g.addColorStop(0, 'rgba(23,34,26,.39)');
                g.addColorStop(0.6, 'rgba(32,43,29,.22)');
                g.addColorStop(1, 'rgba(37,46,31,0)');
                c.fillStyle = g;
                c.fillRect(-1, -1, 2, 2);
                c.restore();
              },
            });
        }
      }
      if (billboard(im, x, y - 0.05, z, height, seed % 2 === 0, oak ? 0.87 : 0.88)) return;
      const a = ray(x, y, z),
        top = ray(x, y + height, z);
      if (!a || !top || a[0] < -W * 0.3 || a[0] > W * 1.3) return;
      const pix = (f * rad) / a[2],
        l = Math.max(1, pix * 0.13),
        h = a[1] - top[1];
      path(
        [
          [a[0] - l, a[1], a[2]],
          [a[0] + l, a[1], a[2]],
          [top[0] + l * 0.4, top[1] + h * 0.2, a[2]],
          [top[0] - l * 0.4, top[1] + h * 0.2, a[2]],
        ],
        '#625746',
        a[2] + 0.2
      );
      for (let tier = 0; tier < 3; tier++) {
        const hh = h * (1 - tier * 0.3),
          ww = pix * (1 - tier * 0.3),
          T = top[1] + tier * -0.015 * h;
        path(
          [
            [top[0], T, a[2]],
            [a[0] + ww, T + hh * 0.82, a[2]],
            [a[0] - ww, T + hh * 0.85, a[2]],
          ],
          ['#365744', '#42674c', '#567456'][tier],
          a[2] + 0.11 - tier * 0.045
        );
      }
    }
    const cx = Math.floor(p.x / 80),
      cz = Math.floor(p.z / 80);
    for (let dz = -3; dz <= 3; dz++)
      for (let dx = -3; dx <= 3; dx++) {
        const xx = (cx + dx + 0.5) * 80 - p.x,
          zz = (cz + dz + 0.5) * 80 - p.z;
        if (xx * sy + zz * cy < -68 || xx * xx + zz * zz > 69000) continue;
        for (const b of sceneryTrees(cx + dx, cz + dz)) tree(b.x, b.z, b.h, b.rad, b.oak, b.seed);
      }
    for (const [x, z, h, rad] of clearingTrees) {
      registerObstacle(x, z, rad * 0.15);
      tree(x, z, h, rad, true, Math.floor(x * z));
    }
    // Several young firs make a soft, irregular frame down the pilgrim road.
    if (Math.abs(p.z) < 140)
      for (let i = 0; i < 12; i++) {
        const z = 17 + i * 4.1,
          x = (10 + (i % 3) * 3.1) * (i % 2 ? 1 : -1);
        tree(x, z, 5.2 + (i % 4) * 1.6, 2.1, false, i);
      }
    // Two warm oil lamps flank the clearing. Their glow reads even under daylight.
    for (const side of [-1, 1]) {
      const x = side * 6.2,
        z = 8 + side * 1.4,
        a = ray(x, 1.8, z);
      if (a && Math.abs(a[0] - W * 0.5) < W) {
        const b = ray(x, 0, z),
          top = ray(x, 2.06, z);
        if (top && b) {
          const lw = Math.max(1, (f * 0.06) / a[2]);
          path(
            [
              [b[0] - lw, b[1], a[2]],
              [b[0] + lw, b[1], a[2]],
              [top[0] + lw, top[1], a[2]],
              [top[0] - lw, top[1], a[2]],
            ],
            '#604c33',
            a[2] + 0.1
          );
        }
        queue.push({
          glow: true,
          x: a[0],
          y: a[1],
          r: Math.min(80, Math.max(2, (f * 0.68) / a[2])),
          d: a[2] - 0.1,
        });
      }
    }
    const castleDistance = Math.hypot(p.x - 30, p.z - 1435);
    if (!readyImage(castleArt) || castleDistance < 175 || p.z > 1400) drawModel(models.castle);
    if (p.z < 1410 && castleDistance > 48 && readyImage(castleArt)) {
      const h = 102,
        scale = 112 / ((h * castleArt.naturalWidth) / castleArt.naturalHeight);
      billboard(
        castleArt,
        30,
        ground(30, 1431),
        1431,
        h,
        false,
        scale,
        Math.min(1, (castleDistance - 48) / 105)
      );
    }
    if (Math.abs(p.z - 850) < 125) drawModel(models.well);
    if (Math.abs(p.z - 1020) < 150) {
      for (let x = Math.floor((p.x - 220) / 8) * 8; x < p.x + 220; x += 8) {
        path(
          [
            [x, 1009],
            [x, 1034],
            [x + 8, 1034],
            [x + 8, 1009],
          ].map(([X, Z]) => ray(X, 0.06, Z)),
          '#729a99'
        );
      }
      if (world.bridgeOpen) drawModel(models.bridge);
    }
    const inside = insideHall(p.x, p.z);
    let room = false;
    if (inside) {
      paint();
      room = hallPainter.draw(ctx, W, H, world, ray, queue) !== false;
    }
    if (p.z > 1290 && Math.abs(p.x - 30) < 160) {
      if (!room) drawModel(models.hall);
      else drawModel(models.hallProps);
    }
    if (!inside && p.z > 310) {
      if (!world.ropeFallen)
        for (let row = 0; row < 64; row += 2) {
          const a = hordePosition(world, row * 48),
            b = hordePosition(world, Math.min(HORDE_COUNT - 1, (row + 2) * 48));
          const near = Math.hypot(a.x - p.x, a.z - p.z);
          if (near < 110) continue;
          const verts = [
            [a.x - 13, a.z],
            [b.x - 11, b.z],
            [b.x + 13, b.z],
            [a.x + 12, a.z],
          ];
          path(
            verts.map(([x, z]) => ray(x, ground(x, z) + 1.8, z)),
            row % 4 ? '#656b62' : '#555c54'
          );
          const cloud = ray(a.x, ground(a.x, a.z) + 2.9, a.z);
          if (cloud) {
            const d = cloud[2],
              diam = Math.max(3, Math.min(W * 0.14, (f * 26) / d));
            queue.push({
              d: d + 0.15,
              draw: (c) => {
                const g = c.createRadialGradient(cloud[0], cloud[1], 0, cloud[0], cloud[1], diam);
                g.addColorStop(0, 'rgba(166,154,127,.22)');
                g.addColorStop(1, 'rgba(166,154,127,0)');
                c.fillStyle = g;
                c.fillRect(cloud[0] - diam, cloud[1] - diam, diam * 2, diam * 2);
              },
            });
          }
        }
      const detailed = marchers.every(readyImage)
        ? marcherTier.update(world, W / H, time)
        : { poses: [], ids: new Set() };
      for (const a of detailed.poses)
        billboard(marchers[a.kind], a.x, ground(a.x, a.z) + a.dy, a.z, a.h, a.flip, a.w);
      for (let i = 0; i < HORDE_COUNT; i += 2) {
        if (detailed.ids.has(i)) continue;
        const a = hordePosition(world, i),
          a0 = ray(a.x, ground(a.x, a.z), a.z);
        if (!a0) continue;
        const h = Math.max(1.5, (f / a0[2]) * 1.82),
          w = Math.max(0.55, h * 0.31),
          x = a0[0],
          y = a0[1];
        path(
          [
            [x - w, y, a0[2]],
            [x - w, y - h * 0.71, a0[2]],
            [x, y - h, a0[2]],
            [x + w, y - h * 0.73, a0[2]],
            [x + w * 0.7, y, a0[2]],
          ],
          i % 7 ? '#40483f' : '#68665a'
        );
      }
    }
    for (const a of world.actors || []) {
      if (!a.alive || Math.hypot(a.x - p.x, a.z - p.z) > 95 || a.type === 'spring') continue;
      if (!['dragon', 'bell'].includes(a.type)) {
        const y = ground(a.x, a.z),
          foot = ray(a.x, y + 0.04, a.z);
        if (foot) {
          const sz = a.type === 'troll' ? 1.9 : a.type === 'wolf' ? 1.0 : 0.63;
          const verts = Array.from({ length: 12 }, (_, k) => {
            const t = (k * TAU) / 12;
            return ray(a.x + Math.cos(t) * sz + 0.3, y + 0.042, a.z + Math.sin(t) * sz * 0.52 + 0.19);
          });
          path(verts, 'rgba(42,45,29,.36)', foot[2] + 0.12);
        }
      }
      if (a.type === 'princess') {
        const fallen = !!world.ropeFallen,
          y = ground(a.x, a.z);
        if (!fallen) {
          const A = ray(a.x + 0.46, y + 0.12, a.z + 0.08),
            B = ray(a.x + 0.46, y + 4.22, a.z + 0.08);
          if (A && B) {
            const q = Math.max(0.6, (f * 0.028) / A[2]);
            path(
              [
                [A[0] - q, A[1], A[2]],
                [B[0] - q, B[1], B[2]],
                [B[0] + q, B[1], B[2]],
                [A[0] + q, A[1], A[2]],
              ],
              '#bba778'
            );
          }
        } else
          for (let i = 0; i < 7; i++) {
            const A = ray(a.x + 0.46 + i * 0.15, y + 0.07, a.z + 0.08 + Math.sin(i * 1.2) * 0.15),
              B = ray(a.x + 0.61 + i * 0.15, y + 0.07, a.z + 0.08 + Math.sin((i + 1) * 1.2) * 0.15);
            if (A && B)
              path(
                [
                  [A[0], A[1] - 1, A[2]],
                  [B[0], B[1] - 1, B[2]],
                  [B[0], B[1] + 1, B[2]],
                  [A[0], A[1] + 1, A[2]],
                ],
                '#bbab83'
              );
          }
        if (
          !a.cured &&
          billboard(
            xeroArt,
            a.x,
            y,
            a.z,
            world.sequence?.id === 'feast' && world.sequence.progress < 0.33 ? 1.55 : 1.96
          )
        )
          continue;
      }
      if (a.type === 'witch' && billboard(witchArt, a.x, ground(a.x, a.z), a.z, 2.46)) continue;
      const m = models[a.type === 'bell' ? a.tone : a.type];
      if (m)
        drawModel(
          m,
          a.x,
          ground(a.x, a.z) +
            (a.type === 'body' ? 0.91 + 0.027 * Math.sin(time * 2.1) : a.type === 'dragon' ? 3 : 0),
          a.z,
          (a.heading ?? Math.PI) + Math.PI,
          a.type === 'dragon' ? 1.4 : 1
        );
    }
    paint();
    if (p.z < 950) {
      const facing = sy * -0.37 + cy * 0.81,
        alpha = 0.027 * Math.max(0, facing);
      if (alpha > 0.005) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < 4; i++) {
          const x = W * (0.1 + i * 0.19) - sy * W * 0.27,
            gr = ctx.createLinearGradient(x, 0, x + W * 0.15, H * 0.88);
          gr.addColorStop(0, 'rgba(255,225,157,0)');
          gr.addColorStop(0.48, 'rgba(255,222,143,' + alpha * (i % 2 ? 1.7 : 1) + ')');
          gr.addColorStop(1, 'rgba(255,221,156,0)');
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + W * 0.036, 0);
          ctx.lineTo(x + W * 0.26, H * 0.88);
          ctx.lineTo(x + W * 0.15, H * 0.9);
          ctx.fill();
        }
        ctx.restore();
      }
    }
    const s = Math.sin((Math.max(0, (world.strikeUntil || 0) - world.elapsed) / 0.48) * Math.PI);
    const bound = world.sequence?.id === 'bound';
    const feast = world.sequence?.id === 'feast',
      saved = world.sequence?.id === 'saved',
      q = world.sequence?.progress || 0;
    if (bound || !readyImage(swordArt))
      drawModel(
        bound ? models.hand : models.blade,
        (W / H < 0.95 ? -0.075 : 0) - s * 0.29,
        feast ? -Math.max(0, q - 0.32) * 0.5 : 0,
        0,
        -s * 0.28,
        1,
        true
      );
    else {
      const size = Math.min(H * 0.52, W * 0.65);
      ctx.save();
      ctx.translate(
        W - size * 0.2 - s * 0.21 * W,
        H - size * 0.18 + (feast ? Math.max(0, q - 0.32) * 0.43 * H : 0)
      );
      ctx.rotate(-s * 1.06);
      ctx.drawImage(swordArt, -size * 0.78, -size * 0.78, size, size);
      ctx.restore();
    }
    if (feast && q > 0.38) drawModel(models.hand, -0.2, 0.01, 0, 0.12, 1, true);
    paint();
    if (bound || feast || saved) {
      const light = bound ? '96,65,133' : feast ? '73,25,35' : '237,196,116',
        grad = ctx.createRadialGradient(
          W * 0.5,
          H * 0.49,
          H * 0.13,
          W * 0.5,
          H * 0.5,
          Math.hypot(W, H) * 0.58
        );
      grad.addColorStop(0, 'rgba(' + light + ',0)');
      grad.addColorStop(1, 'rgba(' + light + ',' + q * (saved ? 0.39 : 0.76) + ')');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      if (bound) {
        ctx.save();
        ctx.strokeStyle = 'rgba(197,156,242,' + q * 0.72 + ')';
        ctx.lineWidth = Math.max(1, W * 0.0015);
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(W * (0.47 + k * 0.022), H * (0.79 - k * 0.008));
          ctx.bezierCurveTo(
            W * (0.49 + 0.03 * Math.sin(time * 1.4 + k)),
            H * 0.58,
            W * 0.53,
            H * 0.51,
            W * (0.51 + k * 0.011),
            H * 0.49
          );
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }
  return { render, resize, dispose };
}
export function createRenderer(canvas) {
  let gl;
  try {
    gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: true,
      depth: true,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
  } catch {
    gl = null;
  }
  if (!gl) return softwareRenderer(canvas);
  let impl;
  try {
    impl = createGLRenderer(canvas, gl);
  } catch (error) {
    console.warn('Using the software forest renderer.', error);
    return softwareRenderer(canvas);
  }
  function lost(e) {
    e.preventDefault();
    impl.dispose();
    impl = softwareRenderer(canvas);
  }
  canvas.addEventListener('webglcontextlost', lost);
  return {
    render: (w, t) => impl.render(w, t),
    resize: () => impl.resize(),
    dispose: () => {
      canvas.removeEventListener('webglcontextlost', lost);
      impl.dispose();
    },
  };
}
