// Hard points are in world metres. The paired hands are drawn by both renderers from this one pose.
const clamp = (n) => Math.max(0, Math.min(1, n));
const ease = (n) => ((n = clamp(n)), n * n * (3 - 2 * n));
const mix = (a, b, t) => a.map((n, i) => n + (b[i] - n) * t);
const offset = (p, axis, r) => p.map((n, i) => n + axis[i] * r);
const delta = (a, b) => a.map((n, i) => n - b[i]);
const length = (v) => Math.hypot(...v);
const unit = (v) => v.map((n) => n / (length(v) || 1));
const up = [0, 1, 0];

export function contactPose(w, fig, ground) {
  const q = w.sequence;
  if (!fig || !['feast', 'saved'].includes(q?.id)) return null;
  const u = q.progress || 0,
    p = w.player,
    side = [Math.cos(p.yaw), 0, -Math.sin(p.yaw)],
    front = [Math.sin(p.yaw), 0, Math.cos(p.yaw)];
  const feetY = ground(p.x, p.z) + 0.17;
  const local = (x, y, z) => offset(offset([p.x, feetY + y, p.z], side, x), front, z);
  const artPoint = (u, v, ratio) =>
    offset([fig.x, fig.y + fig.h * (1 - v), fig.z], side, (u - 0.5) * fig.h * ratio);
  const fatal = q.id === 'feast',
    ratio = fatal ? 445 / 680 : 344 / 680;
  const root = artPoint(fatal ? 0.3 : 0.62, fatal ? 0.26 : 0.412, ratio);
  const reach = fatal
    ? ease(u / 0.31)
    : Math.max(Math.sin(Math.PI * clamp(u / 0.37)), ease((u - 0.76) / 0.15));
  const elbow = local(-0.3, 1.07 + 0.14 * reach, -0.075),
    neutral = local(-0.24, 1.02 + 0.3 * reach, 0.26 + 0.24 * reach);
  const clench = fatal ? ease((u - 0.41) / 0.115) : 0;
  const contact = fatal ? ease((u - 0.4) / 0.12) : ease((u - 0.785) / 0.13);
  const handDir = unit(front.map((v, i) => v * (fatal ? 0.88 : 0.57) + side[i] * (fatal ? 0.47 : 0.82)));
  const handSide = [handDir[2], 0, -handDir[0]];
  const point = offset(
    offset(offset(root, up, fatal ? -0.07 : 0.032), front, fatal ? -0.135 : -0.245),
    side,
    fatal ? 0 : -0.097
  );
  const toWrist = fatal ? point : offset(point, handDir, -0.135);
  const raw = mix(neutral, toWrist, contact);
  // An arm cannot span the aisle while Xero crosses it. The fingers do not close until within reach.
  const distance = length(delta(raw, elbow));
  const wrist = distance > 0.86 ? offset(elbow, unit(delta(raw, elbow)), 0.86) : raw;
  const palm = offset(offset(wrist, handDir, 0.134), up, 0.012);
  const clasp = fatal ? wrist : palm;
  const near = length(delta(root, clasp));
  const joined = near < 0.32 ? contact : 0;
  const queenPalm = fatal ? offset(clasp, up, 0.054) : offset(clasp, up, -0.025);
  const queenFrom = offset(root, front, -0.012);
  return {
    q,
    p,
    side,
    front,
    handDir,
    handSide,
    elbow,
    wrist,
    palm,
    root,
    queenFrom,
    queenPalm,
    joined,
    clench,
    reach,
    point,
  };
}

function shapePalm(m, g, wrist, palm, side, tone) {
  const ring = (c, width, height) =>
    Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      return offset(offset(c, side, Math.cos(a) * width), up, Math.sin(a) * height);
    });
  const rows = [
    ring(wrist, 0.045, 0.031),
    ring(mix(wrist, palm, 0.31), 0.057, 0.035),
    ring(palm, 0.064, 0.024),
  ];
  for (let i = 0; i < 8; i++) {
    const j = (i + 1) % 8;
    g.quad(m, rows[0][i], rows[0][j], rows[1][j], rows[1][i], tone);
    g.quad(m, rows[1][i], rows[1][j], rows[2][j], rows[2][i], tone);
    g.tri(m, rows[2][j], rows[2][i], palm, tone);
  }
}
function finger(m, g, points, tone, r = 0.015) {
  for (let i = 0; i < points.length - 1; i++)
    g.beam(m, points[i], points[i + 1], r * (1 - i * 0.15), r * (0.87 - i * 0.16), tone, 7);
}
export function drawContact(m, g, pose) {
  if (!pose) return;
  const { q, side, front, elbow, wrist, palm, clench, queenFrom, queenPalm, joined } = pose;
  const fatal = q.id === 'feast';
  const cuffStart = mix(elbow, wrist, 0.69),
    cuffEnd = mix(elbow, wrist, 0.89);
  g.beam(m, elbow, cuffStart, 0.101, 0.075, '40554d', 10);
  g.beam(m, cuffStart, cuffEnd, 0.079, 0.059, '71543d', 10);
  g.beam(m, cuffEnd, wrist, 0.062, 0.047, 'a58262', 10);
  g.beam(m, mix(cuffStart, cuffEnd, 0.62), mix(cuffStart, cuffEnd, 0.81), 0.071, 0.069, '526995', 10);
  const knot = offset(mix(cuffStart, cuffEnd, 0.72), side, -0.058);
  const knotTip = offset(offset(knot, up, -0.113), front, -0.037 + 0.016 * Math.sin(q.time * 4));
  g.beam(m, knot, knotTip, 0.018, 0.007, '7288ae', 5);
  const { handDir, handSide } = pose;
  shapePalm(m, g, wrist, palm, handSide, '74533f');
  // The leather panel ends at the knuckles; pale fingertips and cobalt stitching remain distinct.
  const left = offset(offset(mix(wrist, palm, 0.12), handSide, -0.035), up, 0.028);
  const right = offset(offset(mix(wrist, palm, 0.14), handSide, 0.036), up, 0.03);
  const ridge = offset(mix(wrist, palm, 0.49), up, 0.041);
  const endL = offset(offset(palm, handSide, -0.047), up, 0.015),
    endR = offset(offset(palm, handSide, 0.047), up, 0.015);
  g.tri(m, left, right, ridge, '705140');
  g.tri(m, left, ridge, endL, '8b6752');
  g.tri(m, right, endR, ridge, '664b3f');
  g.tri(m, ridge, endR, endL, '755340');
  for (let j = 0; j < 6; j++) {
    for (const [a, b] of [
      [left, endL],
      [right, endR],
    ])
      g.beam(m, mix(a, b, j / 6), mix(a, b, (j + 0.48) / 6), 0.0024, 0.002, 'b39874', 5);
  }
  for (let i = 0; i < 4; i++) {
    const start = offset(palm, handSide, (i - 1.5) * 0.03),
      len = [0.08, 0.096, 0.09, 0.07][i];
    const mid = offset(offset(start, handDir, len * 0.58), up, 0.008 + clench * 0.009);
    const last = offset(offset(start, handDir, len * (1 - 0.6 * clench)), up, 0.008 - clench * 0.053);
    g.beam(m, start, mid, 0.018, 0.013, '936d52', 8);
    finger(m, g, [mid, last], 'c09979', 0.013);
    g.beam(
      m,
      offset(mix(mid, last, 0.59), up, 0.009),
      offset(mix(mid, last, 0.94), up, 0.008),
      0.007,
      0.005,
      'd3ae92',
      6
    );
  }
  const thumb = offset(mix(wrist, palm, 0.44), handSide, 0.044);
  finger(
    m,
    g,
    [
      thumb,
      offset(offset(thumb, handSide, 0.038), handDir, 0.026),
      offset(offset(thumb, handSide, 0.051 - clench * 0.037), handDir, 0.057),
    ],
    'be9b78',
    0.017
  );
  if (joined === 0) return;
  const queenTone = fatal ? '9f8c80' : 'c1a183';
  const open = offset(queenFrom, front, -0.064);
  const hand = mix(open, queenPalm, joined),
    base = mix(queenFrom, hand, 0.43);
  g.beam(m, queenFrom, base, 0.05, 0.041, queenTone, 9);
  shapePalm(m, g, base, hand, side, queenTone);
  if (fatal) {
    // Four knuckles curl over the outside of Zelda's wrist. The opposing thumb closes beneath its inner edge.
    for (let i = 0; i < 4; i++) {
      const centre = offset(wrist, front, (i - 1.5) * 0.025);
      const knuckle = offset(offset(centre, up, 0.055), side, -0.02);
      const outside = offset(offset(centre, side, -0.052), up, 0.015);
      const pad = offset(offset(centre, side, -0.037), up, -0.025);
      finger(
        m,
        g,
        [mix(hand, knuckle, joined), mix(hand, outside, joined), mix(hand, pad, joined)],
        queenTone,
        0.014
      );
    }
    finger(
      m,
      g,
      [
        hand,
        mix(hand, offset(offset(wrist, side, 0.05), up, 0.023), joined),
        mix(hand, offset(offset(wrist, side, 0.041), up, -0.018), joined),
      ],
      queenTone,
      0.018
    );
  } else {
    // An open palm stays beneath his hand. The fingers gently meet his palm without curling around his wrist.
    for (let i = 0; i < 4; i++) {
      const start = offset(hand, side, (i - 1.5) * 0.028);
      finger(
        m,
        g,
        [
          start,
          offset(start, front, -0.036),
          offset(offset(start, front, -0.068 + (i === 3 ? 0.018 : 0)), up, 0.01),
        ],
        queenTone,
        0.0125
      );
    }
    finger(
      m,
      g,
      [
        hand,
        offset(offset(hand, side, 0.055), front, -0.03),
        offset(offset(hand, side, 0.067), front, -0.068),
      ],
      queenTone,
      0.015
    );
  }
}
