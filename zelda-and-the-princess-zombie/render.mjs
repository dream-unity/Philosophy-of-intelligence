import { createWoodPainter } from './wood-painter.mjs';
import { castleShelf, createCastleView } from './castle-view.mjs';
import { createRiverView } from './river-view.mjs';
import { marcherFrame } from './marcher-art.mjs';
import { createProcessionView, queueProcession } from './procession-view.mjs';
import { makeRidgeLandscape } from './ridge-landscape.mjs';
import { lightShader, sceneLights, bindLamps, illuminatedSprite } from './scene-light.mjs';
import { bladeCoordinates, bladeFallbackGeometry } from './swordplay.mjs';
import { storyHands, paintStoryPortrait } from './story-art.mjs';
import { paintTransientMesh } from './software-mesh.mjs';
import { makeFortressDetail, makeFallFoam } from './fortress.mjs';
import {
  storyStatic,
  storyModels,
  storyPieces,
  storyFigure,
  storyReplaces,
  storyTethers,
  storyHandPose,
} from './story-art.mjs';
import { mountainStrip, rangePanels } from './mountain-range.mjs';
import { makeTreeWood, treeForm, treeTurn, crownFaces, treeSpecies } from './rooted-trees.mjs';
import { queueLeafFace, distantTreeFace } from './forest-projection.mjs';
import { witchBodyVertices, createWitchPainter } from './witch-body.mjs';
import { clearingPopulation, sceneryTrees, ridgeVista, youngFirs, sceneryBoulders } from './woodland.mjs';
import { castleAltitude } from './geography.mjs';
import { footHeight, fordStoneX, bridgeRise } from './travel.mjs';
import { isCreature, creaturePose, actorWarp, makeCreatureBank } from './creature-motion.mjs';
import {
  fieldMotion,
  groundDecals,
  swordPlacement,
  saturated,
} from './field-effects.mjs';
import { paintPatina, stonePatina } from './masonry-paint.mjs';
import { paintSoftwareMesh } from './software-mesh.mjs';
import { createQualityController } from './render-quality.mjs';
import {
  makeHall,
  makeHallProps,
  hallSurfaceVertices,
  createHallPainter,
  insideHall,
  makeHangingBell,
  bellSwing,
  bellAnchorOffset,
} from './hall.mjs';
import {
  terrainHeight as ground,
  roadX,
  trailX,
  hordePosition,
  hostFootprints,
  HORDE_COUNT,
} from './world.mjs';

// Flat-shaded geometry, painted with a single sun direction. Static geometry lives in
// spatial cells. No remote textures, runtime dependencies or asset downloads.
const TAU = Math.PI * 2;
const hallTools = { box, beam, rings, tri, quad, stone, lantern, disc };
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
      (l, k) => palettes.oak[Math.min(3, (l > 1 ? 1 : 0) + (k === 1 || k === 5 ? 1 : 0) + (j === 1 ? 1 : 0))],
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
function castle(m, distant = false) {
  const X = 30,
    y = ground(30, 1435) - 0.12,
    z = 1435;
  // Several levels and off-axis turrets keep the stronghold legible on the horizon.
  function window(x, base, z, w, h, col) {
    const p = (a, b) => [x + a, base + b, z];
    quad(m, p(-w / 2, 0), p(w / 2, 0), p(w / 2, h * 0.73), p(-w / 2, h * 0.73), col, false);
    tri(m, p(-w / 2, h * 0.73), p(0, h), p(w / 2, h * 0.73), col, false);
    if (distant) return;
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
    if (distant) return;
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
  // Flying buttresses and copper dormers bind the lantern tower to the rear keep.
  for (const side of [-1, 1]) {
    tower(30 + side * 16, 1553, 3.4, 36, 15, '88858a');
    tower(30 + side * 22, 1560, 4.1, 30, 13, '8e8b92');
    for (let j = 0; j < 3; j++) {
      const dx = 10 + j * 3;
      beam(
        m,
        [30 + side * 7, y + 37 - j * 2.3, 1552],
        [30 + side * dx, y + 23 - j * 2.7, 1546],
        0.37,
        0.69,
        '9c9490',
        5
      );
    }
    for (let j = 0; j < 3; j++) window(30 + side * (2.5 + j * 2.7), y + 47, 1545.4, 1.55, 5.8, 'd8b18b');
  }
  if (distant) return;
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
  for (const b of sceneryBoulders(cx, cz))
    stone(mesh, b.x, ground(b.x, b.z) - 0.1, b.z, b.rad, b.h, b.rad * 0.84, '838973', b.seed);
  const inRiver = (x, z) => z >= 1007 && z <= 1036;
  const inCastle = (x, z) => z > 1424 && z < 1572 && Math.abs(x - 30) < 37;
  for (const { x, z, rad } of sceneryTrees(cx, cz)) {
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
    if (i % 8 === 0) stone(mesh, x, y - 0.06, z, s * 0.37, s * 0.24, s * 0.34, '858b77', rand() * TAU);
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
        const x = fordStoneX(i),
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
function creaturePaintings(load) {
  const bank = {};
  for (const type of ['wolf', 'troll', 'dragon'])
    bank[type] = {
      side: load(type + '.webp'),
      front: load(type + '-front.webp'),
      rear: load(type + '-rear.webp'),
    };
  return bank;
}
function makeMoonleaf(m) {
  for (let i = 0; i < 9; i++) {
    const a = i * 2.39996, x = Math.cos(a), z = Math.sin(a);
    const tip = [x * 0.46, 0.22 + (i % 3) * 0.09, z * 0.46];
    const spine = [x * 0.24, 0.28, z * 0.24];
    for (const side of [-1, 1]) {
      const edge = [spine[0] - z * side * 0.096, 0.18, spine[2] + x * side * 0.096];
      tri(m, [0, 0.08, 0], spine, edge, side > 0 ? '738f6e' : '56735b', false);
      tri(m, spine, tip, edge, side > 0 ? 'b6c4a2' : '879e86', false);
    }
    beam(m, [0, 0.12, 0], spine, 0.008, 0.004, 'd3dab7', 3);
  }
}
function makeBerries(m) {
  for (let k = 0; k < 11; k++) {
    const a = k * 2.4,
      r = 0.15 + 0.24 * Math.abs(Math.sin(k * 0.76)),
      x = r * Math.cos(a),
      z = r * Math.sin(a),
      y = 0.28 + 0.28 * Math.sin(k * 0.49) ** 2;
    beam(m, [0, 0.02, 0], [x, y, z], 0.032, 0.017, '68523c', 5);
    stone(m, x, y, z, 0.19, 0.23, 0.16, k % 2 ? '73845a' : '52745a', a);
    for (let j = 0; j < 3; j++)
      stone(
        m,
        x + 0.09 * Math.cos(a + j),
        y + 0.09 + j * 0.021,
        z - 0.12 + 0.047 * j,
        0.043,
        0.069,
        0.041,
        j % 2 ? '657aa6' : '48587f',
        a
      );
  }
}
function dynamicField(m, w, t) {
  storyHands(m, hallTools, w, t, ground);
  fieldMotion(m, hallTools, w, t);
  if (Math.hypot(w.player.x - 95, w.player.z - 1444) < 170 && !insideHall(w.player.x, w.player.z))
    makeFallFoam(m, quad, t);
  const cords = storyTethers(w, t, ground),
    shift = bellAnchorOffset(bellSwing(w, t));
  const move = (p, k) => p.map((v, j) => v + shift[j] * k);
  for (let i = 0; i < cords.length; i++) {
    const b = cords[i];
    beam(
      m,
      move(b.a, 1 - i / cords.length),
      move(b.b, 1 - (i + 1) / cords.length),
      b.radius,
      b.radius,
      b.color,
      5
    );
  }
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
 vec3 delta=w-uCamera;
 float forward=delta.x*uView.x+delta.z*uView.y;
 vec3 eye=vec3(delta.x*uView.y-delta.z*uView.x,delta.y*uView.w-forward*uView.z,forward*uView.w+delta.y*uView.z);
 if(uMode>1.5 && uMode<2.5) eye=w;
 vColor=aColor;vPos=w;vDist=length(delta.xz);
 gl_Position=vec4(eye.x*uLens.x,eye.y*uLens.y,eye.z*1.00008-.12,eye.z);
}`;
const fragShader = `
precision highp float;
${lightShader}
uniform float uMode,uTime,uHurt,uHex,uGold;
uniform vec3 uCamera;uniform sampler2D uPaint,uWarm,uStone,uBark;uniform float uStoneReady,uBarkReady;
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
 if(uMode>2.5 && uMode<3.5){float screen=fract(dot(floor(gl_FragCoord.xy),vec2(.75488,.56984)));if(screen>smoothstep(143.,198.,vDist))discard;}
 if(!(uMode>1.5 && uMode<2.5)){
   float fog=(1.-exp(-vDist*.00123))*.78;
   if(uMode>3.5)fog*=.53;
   vec3 haze=mix(vec3(.62,.69,.70),vec3(.82,.72,.63),clamp((vPos.x-uCamera.x)/max(vDist,.1)*-.35+.22,0.,1.));
   c=mix(c,haze,fog);
   float clarity=1.-smoothstep(15.,80.,vDist);
   c+=vec3(.034,.028,-.002)*clarity;
 }
 if(uMode<.5&&uStoneReady>.5&&vPos.z>1375.&&vPos.z<1570.&&vDist<108.&&max(max(vColor.r,vColor.g),vColor.b)-min(min(vColor.r,vColor.g),vColor.b)<.092){
   vec3 n=vec3(.12,.08,.8);
   #ifdef SURFACE_NORMALS
   n=abs(normalize(cross(dFdx(vPos),dFdy(vPos))));n*=n;n/=max(.0001,n.x+n.y+n.z);
   #else
   if(abs(abs(vPos.x-30.)-25.)<2.3)n=vec3(.9,.04,.06);
   #endif
   vec3 uv=vPos*.285;
   vec3 tex=n.x*texture2D(uStone,uv.zy).rgb+n.y*texture2D(uStone,uv.xz).rgb+n.z*texture2D(uStone,uv.xy).rgb;
   float v=dot(tex,vec3(.26,.59,.15));float detail=clamp(.65+v*.80,.70,1.26);
   c*=mix(1.,detail,(1.-smoothstep(33.,108.,vDist))*.88);
 }
 if(uMode<.5&&vPos.z>1008.9&&vPos.z<1034.1&&vPos.y<.10&&vColor.g>vColor.r*1.38&&vColor.b>vColor.g*.99){
  float w=sin(vPos.z*1.8+vPos.x*.23-uTime*1.15+sin(vPos.x*.33+uTime*.44)*1.3),r=sin(vPos.z*.84+vPos.x*.18-uTime*.65);
  float shallow=clamp(1.-min(vPos.z-1009.,1034.-vPos.z)*.29,0.,1.);
  c=vec3(.26,.407,.43)+vec3(.14,.06,.024)*shallow+vec3(.18)*max(0.,w+r*.34-.75)*(1.-min(.56,vDist*.001));
  c.r+=.042+.044*sin(vPos.x*.053-vPos.z*.042);
 }
 if(uMode>4.5 && uBarkReady>.5){
   vec2 a=vec2(vPos.x*.83+vPos.z*.29, -vPos.y*.52+vPos.z*.08);
   vec2 b=vec2(vPos.z*.93-vPos.x*.18, -vPos.y*.49+vPos.x*.11);
   float weight=.5;
   #ifdef SURFACE_NORMALS
   vec3 n=abs(normalize(cross(dFdx(vPos),dFdy(vPos))));weight=n.z/(n.z+n.x+.001);
   #endif
   vec3 bark=mix(texture2D(uBark,fract(b)).rgb,texture2D(uBark,fract(a)).rgb,weight);
   float lightness=dot(bark,vec3(.26,.59,.15));
   vec3 grain=mix(bark*(.76+.63*vColor.r),vColor*(.58+1.02*lightness),.37);
   float moss=smoothstep(.015,.06,vColor.g-vColor.r);
   float lichens=smoothstep(.36,.63,vColor.b)*smoothstep(.49,.69,vColor.r);
   grain=mix(grain,vec3(.57,.55,.50)*(.64+1.04*lightness),lichens*.91);
   float beard=.5+.5*sin(vPos.x*1.82+vPos.y*.72+sin(vPos.z*2.3+vPos.y*1.22));
   moss=max(moss,beard*beard*.51*(1.-lichens));
   c=mix(grain,grain*vec3(.71,1.15,.53)+vec3(.048,.077,.009),moss);
   c=mix(c,vec3(.52,.62,.59),smoothstep(35.,120.,vDist)*.3);
 }
 if(uMode<1.5||uMode>4.5)c=lightSurface(c,vPos);
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
attribute vec3 aPosition,aColor;uniform float uRange;uniform vec3 uCamera;uniform vec4 uView;uniform vec2 uLens;varying vec3 wp;varying vec2 uv;varying float dep;varying float opacity;
void main(){wp=aPosition;opacity=aColor.z;vec3 v=aPosition-uCamera;float f=dot(v.xz,uView.xy);vec3 e=vec3(v.x*uView.y-v.z*uView.x,v.y*uView.w-f*uView.z,f*uView.w+v.y*uView.z);uv=aColor.xy;dep=e.z;gl_Position=vec4(e.x*uLens.x,e.y*uLens.y,uRange>.5?e.z*.9999:e.z*1.00008-.12,e.z);}
`;
const standFrag = `
precision highp float;
${lightShader}
varying vec3 wp;uniform sampler2D uArt,uRunner;uniform float uMark,uHall,uRange;varying vec2 uv;varying float dep;varying float opacity;
void main(){
 if(uMark>.5){float r=length((uv-.5)*2.);float a=(1.-smoothstep(.10,1.,r))*opacity;
 if(a<.004)discard;gl_FragColor=vec4(uMark<1.5?vec3(.075,.085,.068):uMark<2.5?vec3(1.,.62,.23):vec3(1.,.35,.08),a);return;}
 vec4 c=texture2D(uArt,uv);if(uRange>.5){if(c.a<.05)discard;gl_FragColor=vec4(mix(c.rgb,vec3(.62,.66,.71),.12),c.a);return;}
 if(uHall>.5&&abs(wp.y-32.17)<.05&&abs(wp.x-30.)<1.17&&wp.z>1466.3&&wp.z<1514.3)
 c=texture2D(uRunner,vec2((wp.x-28.83)/2.34,fract((wp.z-1466.3)/2.34)));
 if(c.a<.36||fract(dot(floor(gl_FragCoord.xy),vec2(.75488,.56984)))>opacity)discard;gl_FragColor=vec4(mix(lightSurface(c.rgb,wp),vec3(.59,.65,.58),min(.33,max(0.,dep)*.0019)),1.);}
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
    'uMark',
    'uStone',
    'uStoneReady',
    'uBark',
    'uBarkReady',
    'uRange',
    'uLamp0',
    'uLamp1',
    'uLamp2',
    'uGrip',
    'uTip',
    'uRunner',
    'uHall',
  ])
    uni[n] = gl.getUniformLocation(p, n);
  return { p, attrs, uni };
}
function farTerrain(m) {
  const grid = 54;
  for (let x = -756; x < 756; x += grid)
    for (let z = -270; z < 1728; z += grid) {
      const p = (a, b) => [a, ground(a, b) - 1.2, b];
      quad(m, p(x, z), p(x, z + grid), p(x + grid, z + grid), p(x + grid, z), z > 1130 ? '788373' : '647a62');
    }
}
function farTrees(m) {
  // One tree population from a moss-covered root out to the horizon. The distant
  // mesh uses the same trunk position and crown as the near painted individual.
  for (let cz = -3; cz <= 20; cz++)
    for (let cx = -8; cx <= 8; cx++)
      for (const b of sceneryTrees(cx, cz)) {
        const { x, z, h, rad, oak, seed } = b,
          y = ground(x, z),
          col = oak ? '526b53' : '435f54';
        const tip = [x, y + h, z],
          bottom = oak ? h * 0.48 : h * 0.16,
          wide = rad * (oak ? 1.45 : 1);
        const n = oak ? 6 : 4;
        for (let j = 0; j < n; j++) {
          const a = (j * TAU) / n + seed,
            b = ((j + 1) * TAU) / n + seed;
          const q = [x + Math.cos(a) * wide, y + bottom, z + Math.sin(a) * wide],
            r = [x + Math.cos(b) * wide, y + bottom, z + Math.sin(b) * wide];
          tri(m, q, tip, r, col);
          if (oak) tri(m, [x, y + h * 0.29, z], q, r, '405647');
        }
      }
}
function makeGesture(m, closed = false) {
  beam(m, [0.19, -0.56, 0.33], [0.155, -0.24, 0.53], 0.066, 0.04, '596650', 8);
  stone(m, 0.148, -0.245, 0.54, 0.066, 0.12, 0.044, 'a78970');
  for (let i = 0; i < 4; i++) {
    const x = 0.098 + i * 0.03,
      a = [x, -0.148, 0.544],
      b = [x + (i - 1.3) * 0.009, closed ? -0.108 : -0.081, 0.554],
      c = [
        x + (i - 1.1) * 0.013,
        closed ? -0.151 : -0.041 + Math.abs(i - 1.1) * -0.012,
        closed ? 0.596 : 0.575,
      ];
    beam(m, a, b, 0.018, 0.014, 'ba9c81', 6);
    beam(m, b, c, 0.015, 0.01, 'b99a7a', 6);
  }
  beam(m, [0.096, -0.19, 0.54], [0.062, -0.149, 0.574], 0.021, 0.015, 'b6977c', 6);
  beam(m, [0.171, -0.284, 0.501], [0.168, -0.265, 0.512], 0.055, 0.055, '466e93', 8);
  tri(m, [0.123, -0.272, 0.48], [0.109, -0.263, 0.475], [0.068, -0.308, 0.48], '809db4', false);
  tri(m, [0.116, -0.272, 0.477], [0.104, -0.283, 0.475], [0.089, -0.323, 0.49], '456789', false);
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
function createGLRenderer(canvas, gl) {
  const programs = [
    program(
      gl,
      vertexShader,
      (gl.getExtension('OES_standard_derivatives')
        ? '#extension GL_OES_standard_derivatives : enable\n#define SURFACE_NORMALS\n'
        : '') + fragShader
    ),
    program(gl, skyVertex, skyFrag),
    program(gl, pointVertex, pointFrag),
    program(gl, standVertex, standFrag),
    program(
      gl,
      'attribute vec3 aPosition,aColor;varying vec2 uv;void main(){uv=aColor.xy;gl_Position=vec4(aPosition.xy,0.,1.);}',
      `precision highp float;
${lightShader}
uniform vec3 uGrip,uTip;uniform sampler2D uArt;varying vec2 uv;void main(){vec4 c=texture2D(uArt,uv);if(c.a<.02)discard;
float t=clamp(dot(uv-vec2(.648,.721),vec2(-.598,-.666))/.801,-.31,1.);
gl_FragColor=vec4(lightSurface(c.rgb,mix(uGrip,uTip,t)),c.a);}`
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
    paintedWitch = imageTexture('witch-costume-front.webp'),
    paintedXero = imageTexture('xero.webp'),
    paintedSword = imageTexture('sword.webp'),
    paintedHall = imageTexture('hall.webp'),
    hallRunner = imageTexture('hall-runner.webp'),
    paintedSky = imageTexture('sky.webp');
  const groveArt = {
    oak: paintedTree,
    pine: paintedPine,
    birch: imageTexture('birch.webp'),
    hollow: imageTexture('hollow-oak.webp'),
    cedar: imageTexture('cedar.webp'),
  };
  const barkArt = imageTexture('oak-bark.webp'), rangeArt=imageTexture('ravenback-range.webp'), rangeMesh=makeBuffer(mountainStrip());
  const witchRear = imageTexture('witch-costume-back.webp'),
    foeArt = creaturePaintings(imageTexture);
  const xeroPoses = {
    offer: paintedXero,
    feeding: imageTexture('xero-feeding.webp'),
    lunge: imageTexture('xero-lunge.webp'),
    cured: imageTexture('xero-cured.webp'),
  };
  const marcherArt = Array.from({ length: 8 }, (_, i) => imageTexture('marcher-' + (i + 1) + '.webp')),
    procession = createProcessionView();
  const stoneTexture = imageTexture('castle-stone.webp');
  const stoneLoaded = stoneTexture.im.onload;
  stoneTexture.im.onload = () => {
    stoneLoaded?.();
    if (disposed) return;
    const im = stoneTexture.im;
    gl.bindTexture(gl.TEXTURE_2D, stoneTexture.tex);
    if (
      (im.naturalWidth & (im.naturalWidth - 1)) !== 0 ||
      (im.naturalHeight & (im.naturalHeight - 1)) !== 0
    ) {
      const tile = document.createElement('canvas');
      tile.width = tile.height = 512;
      tile.getContext('2d').drawImage(im, 0, 0, 512, 512);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tile);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
  };
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
  const treeModels = new Map();
  const models = {
    hall: model((m) => makeHall(m, hallTools)),
    hallProps: model((m) => makeHallProps(m, hallTools)),
    paintedHall: makeBuffer(hallSurfaceVertices()),
    pineProxy: model((m) => pine(m, 0, 0, 0, 1, 0.22, rng(15))),
    oakProxy: model((m) => broadleaf(m, 0, 0, 0, 1, 0.3, rng(19))),
    ridge: model((m) => makeRidgeLandscape(m, hallTools)),
    landscape: model(farTerrain),
    mountains: model(makeBackdrop),
    farTrees: model(farTrees),
    landmarks: model(makeLandmarks),
    fortress: model((m) => makeFortressDetail(m, hallTools)),
    storyStatic: model((m) => storyStatic(m, hallTools)),
    ...storyModels(model, hallTools),
    herb: model(makeMoonleaf),
    berries: model(makeBerries),
    witch: model(makeWitch),
    satchel: model(makeSatchel),
    traveller: model(makeTraveller),
    hand: model((m) => makeGesture(m)),
    fist: model((m) => makeGesture(m, true)),
    bridge: model(makeBridge),
    low: model((m) => bell(m, 1.14)),
    mid: model((m) => bell(m, 0.86)),
    high: model((m) => bell(m, 0.59)),
  };
  const bellFrames = new Map();
  const creatureMesh = makeCreatureBank(
    { wolf: makeWolf, troll: makeTroll, dragon: makeDragon },
    hallTools,
    (data) => makeBuffer(data)
  );
  const motionData = new Float32Array(131072),
    motionBuffer = makeBuffer(motionData, true);
  const crowdData = new Float32Array(HORDE_COUNT * 6),
    crowd = makeBuffer(crowdData, true);
  const pollenData = new Float32Array(104 * 6),
    pollen = makeBuffer(pollenData, true);
  const standData = new Float32Array(96000),
    standMesh = makeBuffer(standData, true);
  const skyMesh = makeBuffer([-1, -1, 3, -1, -1, 3], false, 2);
  const cells = new Map(),
    locations = [];
  for (let j = -3; j < 4; j++) for (let i = -3; i < 4; i++) locations.push([i, j]);
  const budget = createQualityController();
  let workTime = 0;
  let crowdAt = -1e4,
    elapsedAt = -1e4,
    particleAt = -1e4,
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
    procession.update(w);
    const key = Array.from(nearIds).join(',');
    if (t - crowdAt < 0.18 && w.elapsed >= elapsedAt && key === crowdTierKey) return;
    crowdTierKey = key;
    crowdAt = t;
    elapsedAt = w.elapsed;
    const sample = {};
    for (let i = 0; i < HORDE_COUNT; i++) {
      const p = procession.at(i, sample),
        j = i * 6,
        v = ((i * 19) % 31) * 0.004;
      crowdData[j] = p.x;
      crowdData[j + 1] = nearIds.has(i) ? -90 : p.y + 0.88;
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
    if (disposed || !w?.player || gl.isContextLost()) return false;
    if (!Number.isFinite(t)) t = w.elapsed || 0;
    const frameStarted = performance.now();
    quality = budget.sample(frameStarted, w.renderQuality, workTime);
    resize();
    const p = w.player,
      px = p.x,
      pz = p.z,
      yaw = p.yaw || 0,
      pitch = Math.max(-1.35, Math.min(1.35, p.pitch || 0));
    const seq = w.sequence,
      sp = seq?.progress || 0,
      bound = seq?.id === 'bound',
      feast = seq?.id === 'feast',
      saved = seq?.id === 'saved';
    const reduced = !!w.reducedMotion;
    const bob = reduced ? 0 : p.gaitOffset || 0,
      y = (p.feetY ?? footHeight(w, px, pz)) + 1.66 + bob;
    const aspect = canvas.width / canvas.height,
      lensY = 1.37,
      lensX = lensY / aspect;
    w.viewAspect = aspect;
    const sy = Math.sin(yaw),
      cy = Math.cos(yaw),
      spit = Math.sin(pitch),
      cpit = Math.cos(pitch);
    const light = sceneLights(w, t);
    const setup = (prog) => {
      const u = prog.uni;
      gl.useProgram(prog.p);
      if (prog === solid || prog === stands) bindLamps(gl, prog, light);
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
    if(rangeArt.ready && (!insideHall(px,pz)||cy<-.15)){
      setup(stands);gl.uniform1f(stands.uni.uRange,1);gl.uniform1f(stands.uni.uMark,0);
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      useTexture(0,rangeArt.tex,stands.uni.uArt);bind(stands,rangeMesh);gl.drawArrays(gl.TRIANGLES,0,rangeMesh.count);
      gl.disable(gl.BLEND);gl.uniform1f(stands.uni.uRange,0);
    }
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    setup(solid);
    useTexture(0, mossTex, solid.uni.uPaint);
    useTexture(1, roadTex, solid.uni.uWarm);
    useTexture(2, stoneTexture.tex, solid.uni.uStone);
    useTexture(3,barkArt.tex,solid.uni.uBark);
    gl.uniform1f(solid.uni.uBarkReady,barkArt.ready?1:0);
    gl.uniform1f(solid.uni.uStoneReady, stoneTexture.ready ? 1 : 0);
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
    const inRoom = insideHall(px, pz);
    const doorX = 30 - px,
      doorZ = 1466 - pz,
      doorDepth = doorX * sy + doorZ * cy;
    const outside =
      !inRoom ||
      (doorDepth > -5 && Math.abs(doorX * cy - doorZ * sy) < (Math.max(0, doorDepth) * aspect) / 1.37 + 7);
    if (outside) {
      if(!rangeArt.ready)draw(models.mountains, 0, 0, 0, 0, 1, 4);
      draw(models.landscape);
      if (pz > 280 && pz < 1050) draw(models.ridge);
      draw(models.farTrees, 0, 0, 0, 0, 1, 3);
    }
    const cx = Math.floor(px / 80),
      cz = Math.floor(pz / 80),
      deadline = performance.now() + (cells.size < 4 ? 26 : 4.5);
    const candidates = (outside ? locations : [])
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
    if (outside) draw(models.landmarks);
    if (pz > 1280 && Math.abs(px - 30) < 180) draw(models.hall, 0, castleAltitude, 0);
    if (Math.hypot(px - 30, pz - 1516) < 140) {
      const angle = bellSwing(w, t);
      if (!bellFrames.has(angle))
        bellFrames.set(
          angle,
          model((m) => makeHangingBell(m, hallTools, angle))
        );
      draw(bellFrames.get(angle));
    }
    const fig = storyFigure(w, t, ground),
      storyArt = fig ? xeroPoses[fig.key] : null,
      storyPose = storyHandPose(w, t) || {};
    if (!insideHall(px, pz) && pz > 850) draw(models.fortress);
    if (pz > 1300 && Math.abs(px - 30) < 170) draw(models.storyStatic);
    for (const part of storyPieces(w, t, ground)) {
      if (part.key.startsWith('xero-') && storyArt?.ready) continue;
      draw(models[part.key], part.x, part.y, part.z, part.rot, part.scale);
    }
    const dynamic = [];
    dynamicField(dynamic, w, t);
    if (dynamic.length) {
      const count = Math.min(motionData.length - (motionData.length % 18), dynamic.length);
      motionData.set(count === dynamic.length ? dynamic : dynamic.slice(0, count));
      gl.bindBuffer(gl.ARRAY_BUFFER, motionBuffer.b);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, motionData.subarray(0, count));
      motionBuffer.count = count / 6;
      draw(motionBuffer);
    }
    if (Math.abs(pz - 1021) < 190) draw(models.bridge, 0, -3.1 * (1 - bridgeRise(w)), 0);
    const monsterPictures = [];
    for (const a of w.actors || []) {
      if (!a.alive || storyReplaces(w, a.type) || Math.hypot(px - a.x, pz - a.z) > 255) continue;
      if (isCreature(a)) {
        const b = creaturePose(a, t, p),
          group = foeArt[a.type],
          art = group[b.view].ready ? group[b.view] : group.side;
        if (art.ready) {
          monsterPictures.push({ b, asset: art });
        } else
          draw(
            creatureMesh(a, t),
            a.x,
            ground(a.x, a.z) + b.dy,
            a.z,
            (a.attackYaw ?? a.heading ?? 0) + Math.PI,
            a.type === 'dragon' ? 1.4 : 1,
            1
          );
        continue;
      }
      const model = a.type === 'bell' ? models[a.tone] : models[a.type];
      if (model && !(a.type === 'witch' && paintedWitch.ready && witchRear.ready && Math.hypot(px-a.x,pz-a.z)<105)) {
        const rot = a.type === 'bell' ? 0 : (a.heading ?? Math.PI) + Math.PI;
        draw(model, a.x, ground(a.x, a.z), a.z, rot, 1, 1);
      }
    }
    const trees = [];
    for (const c of candidates) trees.push(...sceneryTrees(c.x, c.z));
    if (Math.abs(pz)<238) trees.push(...clearingPopulation);
    if (Math.abs(pz) < 140) trees.push(...youngFirs);
    const detailTrees = new Set();
    for(const b of trees) {
      const dx=b.x-px,dz=b.z-pz,threshold=b.landmark?125:52;
      if(dx*dx+dz*dz>threshold*threshold || dx*sy+dz*cy < -b.h*.65)continue;
      detailTrees.add(b);
      const key=treeForm(b);
      if(!treeModels.has(key))treeModels.set(key,makeBuffer(makeTreeWood(b,hallTools)));
      draw(treeModels.get(key),b.x,ground(b.x,b.z),b.z,treeTurn(b),b.h,5);
    }
    if (!paintedTree.ready || !paintedPine.ready)
      for (const b of trees) {
        if (!(b.oak ? paintedTree : paintedPine).ready)
          draw(b.oak ? models.oakProxy : models.pineProxy, b.x, ground(b.x, b.z), b.z, 0, b.h);
      }
    setup(stands);
    gl.uniform1f(stands.uni.uMark, 0);
    gl.uniform1f(stands.uni.uHall, 0);
    if (paintedHall.ready && insideHall(px, pz)) {
      gl.uniform1f(stands.uni.uHall, hallRunner.ready ? 1 : 0);
      useTexture(1, hallRunner.tex, stands.uni.uRunner);
      useTexture(0, paintedHall.tex, stands.uni.uArt);
      bind(stands, models.paintedHall);
      gl.drawArrays(gl.TRIANGLES, 0, models.paintedHall.count);
      gl.uniform1f(stands.uni.uHall, 0);
    }
    const decals = groundDecals(w, t, hostFootprints(w));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    for (const [i, type] of ['shade', 'light', 'ember'].entries()) {
      let at = 0;
      for (const d of decals) {
        if (d.kind !== type) continue;
        for (const [u, v] of [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
          [1, 1],
          [0, 1],
        ]) {
          standData.set([d.x + (u - 0.5) * 2 * d.rx, d.y, d.z + (v - 0.5) * 2 * d.rz, u, v, d.opacity], at);
          at += 6;
        }
      }
      if (!at) continue;
      gl.uniform1f(stands.uni.uMark, i + 1);
      gl.bindBuffer(gl.ARRAY_BUFFER, standMesh.b);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, standData.subarray(0, at));
      bind(stands, standMesh);
      gl.drawArrays(gl.TRIANGLES, 0, at / 6);
    }
    gl.uniform1f(stands.uni.uMark, 0);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    function batchSprites(items, asset) {
      if (!asset?.ready || !items.length) return;
      let n = 0;
      const ratio = asset.im.naturalWidth / asset.im.naturalHeight;
      for (const b of items) {
        const y = b.y ?? ground(b.x, b.z) + (b.dy || 0),
          width = b.h * ratio * (b.w || 1),
          flip = b.flip ?? b.seed % 2 === 0;
        const dx = px - b.x,
          dz = pz - b.z,
          dist = Math.hypot(dx, dz),
          near = !!b.rig && dist < 48;
        // A hunter's silhouette is oriented towards the viewer's location. A turn
        // in place must only reproject the animal, including its head and feet.
        const rightX = b.rig && dist > 0.02 ? -dz / dist : cy,
          rightZ = b.rig && dist > 0.02 ? dx / dist : -sy;
        const cols = near ? (b.rig.type === 'marcher' ? 2 : 5) : 1,
          rows = near ? (b.rig.type === 'marcher' ? 3 : 6) : 1;
        if (n + cols * rows * 36 > standData.length) break;
        const verts = [];
        for (let row = 0; row <= rows; row++)
          for (let col = 0; col <= cols; col++) {
            const u = col / cols,
              v = row / rows,
              pos = near ? actorWarp(b.rig, t, u, v) : [u, v],
              side = (flip ? 0.5 - pos[0] : pos[0] - 0.5) * width;
            verts.push([b.x + rightX * side, y + (1 - pos[1]) * b.h, b.z + rightZ * side, u, v, b.alpha ?? 1]);
          }
        for (let row = 0; row < rows; row++)
          for (let col = 0; col < cols; col++) {
            const a = row * (cols + 1) + col,
              b = a + 1,
              c = a + cols + 1,
              d = c + 1;
            for (const k of [a, c, d, a, d, b]) {
              standData.set(verts[k], n);
              n += 6;
            }
          }
      }
      useTexture(0, asset.tex, stands.uni.uArt);
      gl.bindBuffer(gl.ARRAY_BUFFER, standMesh.b);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, standData.subarray(0, n));
      bind(stands, standMesh);
      gl.drawArrays(gl.TRIANGLES, 0, n / 6);
    }
    function streamTexture(vertices,asset) {
      if(!vertices.length||!asset?.ready)return;
      useTexture(0,asset.tex,stands.uni.uArt);
      gl.bindBuffer(gl.ARRAY_BUFFER,standMesh.b);
      for(let n=0;n<vertices.length;n+=95994) {
        // xyzUVa * 3 vertices; each chunk ends at a triangle boundary.
        const part=vertices.subarray(n,Math.min(n+95994,vertices.length));
        gl.bufferSubData(gl.ARRAY_BUFFER,0,part);bind(stands,standMesh);gl.drawArrays(gl.TRIANGLES,0,part.length/6);
      }
    }
    const bySpecies = { oak: [], pine: [], birch: [], hollow: [], cedar: [] };
    for (const b of trees) {
      const key = treeSpecies(b),
        asset = groveArt[key]?.ready ? key : b.oak ? 'oak' : 'pine';
      const d = Math.hypot(b.x - px, b.z - pz);
      if (d > 212) continue;
      const v=bySpecies[asset], y=ground(b.x,b.z), tex=groveArt[asset];
      if(!tex?.ready)continue;
      const faces=detailTrees.has(b)?crownFaces(b):[distantTreeFace(b,px,pz,tex.im.naturalWidth/tex.im.naturalHeight)];
      const opacity=1-saturated((d-154)/48);
      for(const face of faces) for(const index of [0,1,2,0,2,3]){
        const p=face[index]; v.push(p[0],y+p[1],p[2],p[3],p[4],opacity);
      }
    }
    for(const key of Object.keys(bySpecies)) if(bySpecies[key].length)streamTexture(Float32Array.from(bySpecies[key]),groveArt[key]);
    for (const { b, asset } of monsterPictures) batchSprites([b], asset);
    if (fig && storyArt?.ready && Math.hypot(px - fig.x, pz - fig.z) < 120)
      batchSprites([{ ...fig, seed: 1 }], storyArt);
    const witch = (w.actors || []).find((a) => a.alive && a.type === 'witch');
    if (witch && Math.hypot(px - witch.x, pz - witch.z) < 105) {
      if (paintedWitch.ready && witchRear.ready) {
        const skin=witchBodyVertices(w,witch,t,ground(witch.x,witch.z));
        streamTexture(skin.front,paintedWitch);streamTexture(skin.back,witchRear);
      }
    }
    // The procession updates at a lower rate than the camera, including distant ranks.
    // Terrain depth hides groups behind the ridge. Each point becomes a walking figure.
    const exteriorHost = !insideHall(px, pz) && procession.aboveHorizon(w, y);
    const detailed =
      exteriorHost && marcherArt.every((a) => a.ready)
        ? procession.near(w, aspect, t, quality < 0.8 ? 32 : 64)
        : { poses: [], ids: new Set() };
    if (detailed.poses.length)
      for (let k = 0; k < marcherArt.length; k++)
        batchSprites(
          detailed.poses.filter((a) => a.kind === k),
          marcherArt[k]
        );
    if (exteriorHost) updateHorde(w, t, detailed.ids);
    updatePollen(px, pz, t);
    setup(points);
    gl.uniform1f(points.uni.uHeight, canvas.height);
    if (exteriorHost) {
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
    if (!storyPose.physical && paintedSword.ready && (!bound || sp < 0.72)) {
      const W = canvas.width,
        H = canvas.height,
        sz = Math.min(H * 0.52, W * 0.65),
        ang = -swing * 1.06,
        ca = Math.cos(ang),
        sa = Math.sin(ang);
      const wristX = W - 0.2 * sz - swing * 0.21 * W,
        wristY = H - 0.18 * sz + tuck * 0.65 * H + bob * H * 0.05;
      const paintBlade = swordPlacement(w, W, H, (x, y0, z) => {
        const dx = x - px,
          dy = y0 - y,
          dz = z - pz,
          front = dx * sy + dz * cy,
          dep = front * cpit + dy * spit;
        return dep > 0.07
          ? [
              W * 0.5 + ((dx * cy - dz * sy) * H * 0.685) / dep,
              H * 0.5 - ((dy * cpit - front * spit) * H * 0.685) / dep,
              dep,
            ]
          : null;
      });
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
        const at = paintBlade?.map(u, v);
        const xx = at ? at[0] : wristX + x * ca - y * sa,
          yy = at ? at[1] + tuck * H * 0.65 : wristY + x * sa + y * ca;
        standData.set([(xx / W) * 2 - 1, 1 - (yy / H) * 2, 0, u, v, 0], k);
        k += 6;
      }
      gl.useProgram(held.p);
      bindLamps(gl, held, light);
      const joints = bladeCoordinates(w);
      gl.uniform3f(held.uni.uGrip, ...joints.grip);
      gl.uniform3f(held.uni.uTip, ...joints.tip);
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
    if (!storyPose.physical && (!bound || sp < 0.72)) {
      const vertices = bladeFallbackGeometry(w, paintedSword.ready);
      gl.bindBuffer(gl.ARRAY_BUFFER, motionBuffer.b);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
      motionBuffer.count = vertices.length / 6;
      draw(motionBuffer, 0, 0, 0, 0, 1, 1);
    }
    if (!storyPose.physical && (bound || storyPose.reach > 0.02 || potionFlash > 0.35)) {
      const reach = storyPose.reach || 0,
        clench = storyPose.clench || 0;
      draw(
        clench > 0.48 ? models.fist : models.hand,
        slide - 0.21 + reach * 0.12,
        -0.1 + Math.max(reach, bound ? sp : 0, potionFlash) * 0.16,
        reach * 0.14,
        0.14 + clench * 0.4,
        1,
        2
      );
    }
    gl.enable(gl.DEPTH_TEST);
    workTime = performance.now() - frameStarted;
    return true;
  }
  function dispose() {
    disposed = true;
    for (const b of buffers) gl.deleteBuffer(b);
    for (const p of programs) gl.deleteProgram(p.p);
    for (const tex of textures) gl.deleteTexture(tex);
    buffers.clear();
    cells.clear();
  }
  return { render, resize, dispose, surface: canvas, backend: 'WebGL' };
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
  const models = {}, treeModels=new Map(), paintWitch=createWitchPainter(), woodPaint=createWoodPainter();
  for (const [key, fn] of Object.entries({
    boulder: (m) => stone(m, 0, 0, 0, 1, 0.73, 0.84, '838973', 0.8),
    fortress: (m) => makeFortressDetail(m, hallTools),
    storyStatic: (m) => storyStatic(m, hallTools),
    herb: makeMoonleaf,
    berries: makeBerries,
    witch: makeWitch,
    satchel: makeSatchel,
    traveller: makeTraveller,
    castle,
    shelf: (m) => castleShelf(m, hallTools),
    ford: (m) => {
      for (let i = 0; i < 16; i++)
        stone(m, fordStoneX(i), -0.12, 1008 + i * 1.76, 1.62, 0.53, 1.42, '989a87', i * 1.91);
    },
    distantCastle: (m) => castle(m, true),
    ridge: (m) => makeRidgeLandscape(m, hallTools),
    well: spring,
    bridge: makeBridge,
    hand: (m) => makeGesture(m),
    fist: (m) => makeGesture(m, true),
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
  Object.assign(
    models,
    storyModels((fn) => {
      const m = [];
      fn(m);
      return m;
    }, hallTools)
  );
  const hallPainter = createHallPainter();
  const distantCastle = createCastleView([models.shelf, models.distantCastle, models.fortress]),
    riverPaint = createRiverView();
  const bellFrames = new Map();
  const creatureMesh = makeCreatureBank(
    { wolf: makeWolf, troll: makeTroll, dragon: makeDragon },
    hallTools,
    (data) => data
  );
  const treeArt = artImage('tree.webp'),
    pineArt = artImage('pine.webp'),
    witchArt = artImage('witch-costume-front.webp'),
    xeroArt = artImage('xero.webp'),
    swordArt = artImage('sword.webp');
  const groveArt = {
    oak: treeArt,
    pine: pineArt,
    birch: artImage('birch.webp'),
    hollow: artImage('hollow-oak.webp'),
    cedar: artImage('cedar.webp'),
  };
  const rangeArt=artImage('ravenback-range.webp'), treeBark=artImage('oak-bark.webp');
  const witchRear = artImage('witch-costume-back.webp'),
    foeArt = creaturePaintings(artImage);
  const xeroPoses = {
    offer: xeroArt,
    feeding: artImage('xero-feeding.webp'),
    lunge: artImage('xero-lunge.webp'),
    cured: artImage('xero-cured.webp'),
  };
  const masonry = artImage('castle-stone.webp');
  let stonePattern = null;
  const marchers = Array.from({ length: 8 }, (_, i) => artImage('marcher-' + (i + 1) + '.webp')),
    procession = createProcessionView();
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
  const renderBudget = createQualityController(true);
  let resolution = 1,
    lastWork = 0;
  function resize() {
    const cssW = canvas.clientWidth || 640,
      cssH = canvas.clientHeight || 400,
      ratio = Math.min(1, Math.sqrt(820000 / (cssW * cssH))) * resolution;
    const w = Math.round(cssW * ratio),
      h = Math.round(cssH * ratio);
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
    const frameStarted = performance.now();
    resolution = renderBudget.sample(frameStarted, world.renderQuality, lastWork);
    resize();
    const light = sceneLights(world, time);
    const p = world.player,
      W = layer.width,
      H = layer.height,
      f = H * 0.685,
      ey = (p.feetY ?? footHeight(world, p.x, p.z)) + 1.66 + (world.reducedMotion ? 0 : p.gaitOffset || 0);
    world.viewAspect = W / H;
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
    function path(pts, c, depth, tex = null) {
      if (pts.some((v) => !v)) return;
      if (
        pts.every((v) => v[0] < 0) ||
        pts.every((v) => v[1] < 0) ||
        pts.every((v) => v[0] > W) ||
        pts.every((v) => v[1] > H)
      )
        return;
      queue.push({ p: pts, c, tex, d: depth ?? pts.reduce((t, v) => t + v[2], 0) / pts.length });
    }
    let patinaBudget = 15;
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
          if (item.frame) ctx.transform(...item.frame, item.x, item.y);
          else ctx.translate(item.x, item.y);
          if (item.flip) ctx.scale(-1, 1);
          if (!item.rig || item.d > 48) ctx.drawImage(item.im, -item.w * 0.5, -item.h, item.w, item.h);
          else {
            const im = item.im,
              iw = im.naturalWidth || im.width,
              ih = im.naturalHeight || im.height,
              cols = item.rig.type === 'marcher' ? 2 : 4,
              rows = item.rig.type === 'marcher' ? 3 : 5;
            ctx.translate(-item.w * 0.5, -item.h);
            for (let row = 0; row < rows; row++)
              for (let col = 0; col < cols; col++) {
                const u = col / cols,
                  v = row / rows,
                  a = actorWarp(item.rig, time, u, v),
                  b = actorWarp(item.rig, time, u + 1 / cols, v),
                  c = actorWarp(item.rig, time, u, v + 1 / rows);
                ctx.save();
                ctx.transform(
                  (b[0] - a[0]) * item.w,
                  (b[1] - a[1]) * item.h,
                  (c[0] - a[0]) * item.w,
                  (c[1] - a[1]) * item.h,
                  a[0] * item.w,
                  a[1] * item.h
                );
                ctx.drawImage(im, u * iw, v * ih, iw / cols, ih / rows, 0, 0, 1.014, 1.014);
                ctx.restore();
              }
          }
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
        if (
          item.tex &&
          resolution > 0.6 &&
          patinaBudget > 0 &&
          Math.abs(p[0][0] - p[1][0]) + Math.abs(p[0][0] - p[2][0]) < W * 1.7 &&
          Math.abs(p[0][1] - p[1][1]) + Math.abs(p[0][1] - p[2][1]) < H * 1.7
        ) {
          stonePattern ??= stonePatina(masonry, ctx);
          if (stonePattern && paintPatina(ctx, stonePattern, p, item.tex)) patinaBudget--;
        }
      }
      queue.length = 0;
    }
    function billboard(im, x, y, z, height, flip = false, widthScale = 1, alpha = 1, rig = null) {
      if (!readyImage(im)) return false;
      const a = ray(x, y, z),
        b = ray(x, y + height, z);
      if (!a || !b) return true;
      const h = Math.abs(a[1] - b[1]),
        width = ((h * im.naturalWidth) / im.naturalHeight) * widthScale;
      if (h < 1 || a[0] + width * 0.5 < 0 || a[0] - width * 0.5 > W || b[1] > H || a[1] < 0) return true;
      let frame;
      if (rig && a[2] < 65) {
        const dx = x - p.x, dz = z - p.z, dist = Math.hypot(dx, dz) || 1;
        const half = height * widthScale * im.naturalWidth / im.naturalHeight * 0.5;
        const lx = dz / dist * half, lz = -dx / dist * half;
        const left = ray(x - lx, y + height * 0.5, z - lz),
          right = ray(x + lx, y + height * 0.5, z + lz);
        if (left && right && h > 0 && width > 0)
          frame = [(right[0] - left[0]) / width, (right[1] - left[1]) / width, (a[0] - b[0]) / h, (a[1] - b[1]) / h];
      }
      if (rig?.type === 'marcher') {
        im = marcherFrame(im, rig, time, h);
        rig = null;
      }
      if (a[2] < 65) im = illuminatedSprite(im, light, x, y, z, height, insideHall(x, z));
      queue.push({ im, x: a[0], y: a[1], h, w: width, alpha, flip, rig, frame, d: a[2] });
      return true;
    }
    const scene = {
      ray,
      path,
      W,
      H,
      visible(x, y, z, r) {
        const dx = x - p.x,
          dy = y - ey,
          dz = z - p.z,
          front = dx * sy + dz * cy,
          dep = front * cp + dy * sp,
          side = dx * cy - dz * sy,
          vertical = dy * cp - front * sp;
        return (
          dep + r > 0.08 &&
          Math.abs(side) <= (Math.max(0, dep) * W) / (2 * f) + r * (1 + W / (2 * f)) &&
          Math.abs(vertical) <= (Math.max(0, dep) * H) / (2 * f) + r * 1.9
        );
      },
    };
    function drawModel(mesh, x = 0, y = 0, z = 0, rot = 0, scale = 1, own = false) {
      paintSoftwareMesh(scene, mesh, x, y, z, rot, scale, own);
    }
    const inside = insideHall(p.x, p.z),
      needsExterior = !inside || ((p.z < 1474 || Math.abs(p.x - 30) < 16) && cy < -0.15);
    if (needsExterior) {
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
      if(readyImage(rangeArt)){
        const rangeLayer=[];
        for(const face of rangePanels)queueLeafFace(rangeLayer,ray,face,rangeArt,0,W,H);
        for(const strip of rangeLayer)strip.draw(ctx);
      }
      ctx.fillStyle = '#657550';
      ctx.fillRect(0, Math.max(0, horizon), W, H);
      const hasPaint =
        floorPainter?.paint(ctx, W, H, p, horizon, ey, time, resolution) !== false && !!floorPainter;
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
      woodPaint.begin();
      function tree(b) {
        const {x,z,h:height,rad,oak,seed}=b, y=ground(x,z),
          key=treeSpecies(b),
          im = readyImage(groveArt[key]) ? groveArt[key] : oak ? treeArt : pineArt;
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
        const dx=x-p.x,dz=z-p.z, distance=Math.hypot(dx,dz);
        if(dx*sy+dz*cy < -height*.68 || !scene.visible(x,y+height*.47,z,height*.62))return;
        if(readyImage(im)){
          if(distance<(b.landmark?88:27)) {
            const key=treeForm(b);
            if(!treeModels.has(key))treeModels.set(key,makeTreeWood(b,hallTools,true));
            woodPaint.draw(queue,ray,treeModels.get(key),b,treeTurn(b),y,treeBark,W,H,resolution);
            for(const face of crownFaces(b))queueLeafFace(queue,ray,face,im,y,W,H);
          } else {
            queueLeafFace(queue,ray,distantTreeFace(b,p.x,p.z,im.naturalWidth/im.naturalHeight),im,y,W,H);
          }
          return;
        }
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
          if (xx * xx + zz * zz < 11300)
            for (const b of sceneryBoulders(cx + dx, cz + dz))
              drawModel(models.boulder, b.x, ground(b.x, b.z) - 0.1, b.z, b.seed, b.rad);
          for (const b of sceneryTrees(cx + dx, cz + dz)) tree(b);
        }
      if(Math.abs(p.z)<238)for(const t of clearingPopulation)tree(t);
      if (Math.abs(p.z) < 140) for (const b of youngFirs) tree(b);
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
      if (castleDistance > 245) distantCastle(ray, queue, p, ey, f);
      else {
        drawModel(models.shelf);
        drawModel(models.castle);
      }
      if (p.z > 280 && p.z < 1050) drawModel(models.ridge);
      if (Math.abs(p.z - 850) < 125) drawModel(models.well);
      if (Math.abs(p.z - 1020) < 150) {
        riverPaint(ctx, W, H, p, ey, time, resolution);
        if (Math.abs(p.x + 125) < 140) drawModel(models.ford);
        drawModel(models.bridge, 0, -3.1 * (1 - bridgeRise(world)), 0);
      }
    }

    let room = false;
    if (inside) {
      paint();
      room = hallPainter.draw(ctx, W, H, world, ray, queue) !== false;
    }
    if (p.z > 1290 && Math.abs(p.x - 30) < 160) {
      if (!room) drawModel(models.hall, 0, castleAltitude, 0);
      else drawModel(models.hallProps, 0, castleAltitude, 0);
    }
    if (Math.hypot(p.x - 30, p.z - 1516) < 140) {
      const angle = bellSwing(world, time);
      if (!bellFrames.has(angle)) {
        const m = [];
        makeHangingBell(m, hallTools, angle);
        bellFrames.set(angle, m);
      }
      drawModel(bellFrames.get(angle));
    }
    const fig = storyFigure(world, time, ground),
      storyArt = fig ? xeroPoses[fig.key] : null,
      storyPose = storyHandPose(world, time) || {};
    if (needsExterior && Math.hypot(p.x - 30, p.z - 1435) < 246 && p.z < 1452) drawModel(models.fortress);
    if (p.z > 1300 && Math.abs(p.x - 30) < 170) drawModel(models.storyStatic);
    for (const part of storyPieces(world, time, ground)) {
      if (part.key.startsWith('xero-') && readyImage(storyArt)) continue;
      drawModel(models[part.key], part.x, part.y, part.z, part.rot, part.scale);
    }
    if (fig && readyImage(storyArt) && Math.hypot(p.x - fig.x, p.z - fig.z) < 120) {
      const at = ray(fig.x, fig.y + fig.h * 0.5, fig.z);
      if (at) {
        const error = (f * fig.h * fig.h * Math.abs(sp)) / (4 * at[2] * at[2]);
        if (error > 0.65)
          paintStoryPortrait(
            illuminatedSprite(storyArt, light, fig.x, fig.y, fig.z, fig.h, inside),
            fig,
            ray,
            queue,
            cy,
            sy
          );
        else billboard(storyArt, fig.x, fig.y, fig.z, fig.h, fig.flip, fig.w);
      }
    }
    const dynamic = [];
    dynamicField(dynamic, world, time);
    if (dynamic.length) paintTransientMesh(scene, dynamic);
    for (const d of groundDecals(world, time, hostFootprints(world))) {
      const a = ray(d.x, d.y, d.z);
      if (!a || a[0] < -W * 0.25 || a[0] > W * 1.25) continue;
      const xRad = Math.max(1, (f * d.rx) / a[2]),
        yRad = Math.max(0.8, ((xRad * d.rz) / d.rx) * Math.min(0.9, Math.abs(ey - d.y) / Math.max(1, a[2])));
      if (xRad > W * 3) continue;
      queue.push({
        d: a[2] + 0.04,
        draw: (c) => {
          c.save();
          c.translate(a[0], a[1]);
          c.scale(xRad, yRad);
          const g = c.createRadialGradient(0, 0, 0.03, 0, 0, 1);
          const tint = d.kind === 'shade' ? '22,25,18' : d.kind === 'light' ? '255,166,77' : '250,99,31';
          g.addColorStop(0, 'rgba(' + tint + ',' + d.opacity + ')');
          g.addColorStop(1, 'rgba(' + tint + ',0)');
          c.fillStyle = g;
          c.fillRect(-1, -1, 2, 2);
          c.restore();
        },
      });
    }
    if (!inside && procession.aboveHorizon(world, ey)) {
      procession.update(world);
      const hostSight = procession.visibility(world, ey);
      if (!world.ropeFallen)
        for (let row = 0; row < 64; row += 2) {
          if (!hostSight[row >> 2]) continue;
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
        ? procession.near(world, W / H, time, resolution < 0.8 ? 24 : 48)
        : { poses: [], ids: new Set() };
      for (const a of detailed.poses) billboard(marchers[a.kind], a.x, a.y, a.z, a.h, a.flip, a.w, 1, a.rig);
      queueProcession(procession, ray, queue, W, H, f, detailed.ids, resolution < 0.8, hostSight);
    }
    for (const a of world.actors || []) {
      if (
        !a.alive ||
        storyReplaces(world, a.type) ||
        Math.hypot(a.x - p.x, a.z - p.z) > 95 ||
        a.type === 'spring'
      )
        continue;
      if (
        a.type === 'witch' &&
        readyImage(witchArt) && readyImage(witchRear) &&
        paintWitch(queue,ray,world,a,time,ground(a.x,a.z),witchArt,witchRear)
      )
        continue;
      if (isCreature(a)) {
        const b = creaturePose(a, time, p),
          group = foeArt[a.type],
          art = readyImage(group[b.view]) ? group[b.view] : group.side,
          yy = ground(a.x, a.z) + b.dy;
        if (readyImage(art)) billboard(art, a.x, yy, a.z, b.h, b.flip, b.w, 1, a);
        else
          drawModel(
            creatureMesh(a, time),
            a.x,
            yy,
            a.z,
            (a.attackYaw ?? a.heading ?? 0) + Math.PI,
            a.type === 'dragon' ? 1.4 : 1
          );
        continue;
      }
      const m = models[a.type === 'bell' ? a.tone : a.type];
      if (m) drawModel(m, a.x, ground(a.x, a.z), a.z, (a.heading ?? Math.PI) + Math.PI);
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
    if (bound && !storyPose.physical) drawModel(models.hand, 0, 0, 0, 0, 1, true);
    const bladeReady = readyImage(swordArt);
    if (!bound && !storyPose.physical && bladeReady) {
      const { grip } = bladeCoordinates(world);
      const bladeArt = illuminatedSprite(swordArt, light, grip[0], grip[1], grip[2], 0.85, inside);
      const size = Math.min(H * 0.52, W * 0.65);
      ctx.save();
      const physical = swordPlacement(world, W, H, ray);
      if (physical) {
        ctx.transform(
          physical.c,
          physical.s,
          -physical.s,
          physical.c,
          physical.x,
          physical.y + (feast ? Math.max(0, q - 0.32) * 0.43 * H : 0)
        );
        ctx.drawImage(bladeArt, 0, 0, 1, 1);
      } else {
        ctx.translate(
          W - size * 0.2 - s * 0.21 * W,
          H - size * 0.18 + (feast ? Math.max(0, q - 0.32) * 0.43 * H : 0)
        );
        ctx.rotate(-s * 1.06);
        ctx.drawImage(bladeArt, -size * 0.78, -size * 0.78, size, size);
      }
      ctx.restore();
    }
    if (!bound && !storyPose.physical) paintTransientMesh(scene, bladeFallbackGeometry(world, bladeReady));
    if (!storyPose.physical && storyPose.reach > 0.02)
      drawModel(
        storyPose.clench > 0.48 ? models.fist : models.hand,
        -0.21 + 0.12 * storyPose.reach,
        -0.1 + storyPose.reach * 0.16,
        0.14 * storyPose.reach,
        0.14 + (storyPose.clench || 0) * 0.4,
        1,
        true
      );
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
    lastWork = performance.now() - frameStarted;
    return true;
  }
  return { render, resize, dispose, surface: layer, backend: 'Canvas 2D' };
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
    get surface() {
      return impl.surface;
    },
    get backend() {
      return impl.backend;
    },
    render: (w, t) => impl.render(w, t),
    resize: () => impl.resize(),
    dispose: () => {
      canvas.removeEventListener('webglcontextlost', lost);
      impl.dispose();
    },
  };
}
