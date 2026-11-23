// Lanternwood's traveller wears the same painted clothes on a continuous, jointed body.
// Local +Z faces the guest. Each half of the costume has its own painted cloth and hair.
const TAU = 2 * Math.PI;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const parts = {
  body: 0,
  hem: 1,
  head: 2,
  leftSleeve: 3,
  leftHand: 4,
  rightSleeve: 5,
  rightHand: 6,
  lantern: 7,
  leftFoot: 8,
  rightFoot: 9,
};
const lampCentre = [-0.51, 1.29, 0.21];
const wristLeft = [-0.51, 1.65, 0.21];
const wristRight = [0.415, 1.42, 0.18];
function multiply(a, b) {
  const result = [];
  for (let j = 0; j < 12; j += 4) {
    for (let k = 0; k < 4; k++)
      result[j + k] = a[j] * b[k] + a[j + 1] * b[4 + k] + a[j + 2] * b[8 + k] + (k === 3 ? a[j + 3] : 0);
  }
  return result;
}
function transform(m, x, y, z) {
  return [
    m[0] * x + m[1] * y + m[2] * z + m[3],
    m[4] * x + m[5] * y + m[6] * z + m[7],
    m[8] * x + m[9] * y + m[10] * z + m[11],
  ];
}
function joint(p, yaw, pitch, roll, lift = 0) {
  const c = Math.cos(yaw),
    s = Math.sin(yaw),
    e = Math.cos(pitch),
    f = Math.sin(pitch),
    g = Math.cos(roll),
    h = Math.sin(roll);
  const m = [
    c * g + s * f * h,
    -c * h + s * f * g,
    s * e,
    0,
    e * h,
    e * g,
    -f,
    0,
    -s * g + c * f * h,
    s * h + c * f * g,
    c * e,
    0,
  ];
  const q = transform(m, ...p);
  m[3] = p[0] - q[0];
  m[7] = p[1] - q[1] + lift;
  m[11] = p[2] - q[2];
  return m;
}
function pose(w, witch, time, floorY) {
  const t = w.reducedMotion ? 0 : time;
  const step = w.witchAsideAt == null ? -1 : w.elapsed - w.witchAsideAt;
  const stepping = step >= 0 && step < 1.5;
  const stride = stepping ? Math.sin((Math.PI * step) / 1.5) * Math.sin((TAU * step) / 0.76) : 0;
  const listening = Number.isFinite(w.witchListenUntil) && w.witchListenUntil > w.elapsed;
  const bearing =
    listening && Number.isFinite(w.witchListenYaw)
      ? w.witchListenYaw
      : Math.atan2(w.player.x - witch.x, w.player.z - witch.z);
  const heading = witch.heading ?? Math.PI;
  const difference = Math.atan2(Math.sin(heading - bearing), Math.cos(heading - bearing));
  const near = clamp(1 - Math.hypot(w.player.x - witch.x, w.player.z - witch.z) / 13, 0, 1);
  const interest = clamp(difference, -0.51, 0.51) * near * clamp((2.65 - Math.abs(difference)) / 0.9, 0, 1);
  const offering = listening ? 1 : w.dialogue?.speaker === 'The witch' || w.sequence?.id === 'bound' ? 1 : 0;
  const breathe = Math.sin(t * 1.73),
    sway = Math.sin(t * 0.99 + 0.9);
  const body = joint(
    [0, 0.04, 0],
    0.013 * sway,
    0.009 * breathe,
    0.006 * sway + 0.025 * stride,
    0.006 * breathe
  );
  const head = joint(
    [0, 1.76, 0],
    interest + 0.035 * sway,
    0.027 * Math.sin(t * 1.58) - 0.034 * offering,
    0.021 * sway
  );
  const leftShoulder = joint(
    [-0.218, 1.63, 0],
    0.065 * sway,
    -0.072 * breathe - 0.14 * offering,
    0.045 * sway
  );
  const leftElbow = joint(
    [-0.36, 1.37, 0.045],
    0,
    -0.055 * Math.sin(t * 1.42),
    0.062 * breathe + 0.13 * offering + (listening ? -0.3 : 0)
  );
  const rightShoulder = joint([0.216, 1.61, 0], -0.02 * sway, 0.035 * breathe, 0.025 * breathe);
  const rightElbow = joint([0.32, 1.32, 0.045], 0.019 * Math.sin(t * 1.08), 0.041 * sway, 0.021 * breathe);
  const l1 = multiply(body, leftShoulder),
    l2 = multiply(l1, leftElbow);
  const r1 = multiply(body, rightShoulder),
    r2 = multiply(r1, rightElbow);
  const m = [
    body,
    joint([0, 1.02, 0], 0.012 * sway, 0.009 * breathe, 0.012 * sway + 0.045 * stride),
    multiply(body, head),
    l1,
    l2,
    r1,
    r2,
    multiply(
      l2,
      joint(wristLeft, 0, 0.086 * Math.sin(t * 1.48 + 0.7), 0.075 * Math.sin(t * 1.32) - 0.095 * offering)
    ),
    joint([-0.13, 0.1, 0], 0, -stride * 0.25, 0.05 * stride, Math.max(0, stride) * 0.075),
    joint([0.125, 0.1, 0], 0, stride * 0.25, 0.05 * stride, Math.max(0, -stride) * 0.075),
  ];
  const c = Math.cos(heading),
    s = Math.sin(heading);
  // The left hand in the painting is on the player's left when facing south.
  const world = [-c, 0, s, witch.x, 0, 1, 0, floorY, s, 0, c, witch.z];
  return m.map((k) => multiply(world, k));
}

function buildCostume() {
  const mesh = { front: [], back: [] };
  function vertex(x, y, z, u, v, bone) {
    return [x, y, z, u, v, bone];
  }
  function triangle(side, a, b, c) {
    mesh[side].push(...a, ...b, ...c);
  }
  function quad(side, a, b, c, d) {
    triangle(side, a, b, c);
    triangle(side, a, c, d);
  }
  // Row: physical centre and two radii, then the artwork's horizontal span and row on each half.
  function surface(rows, n, bone, deform) {
    for (let i = 0; i < n; i++) {
      const p = (i * TAU) / n,
        q = ((i + 1) * TAU) / n,
        mid = (p + q) / 2,
        front = Math.cos(mid) > 0;
      const garment = (bone === parts.hem || bone === parts.body) && rows[0][3] > 0.23;
      const gore = garment && Math.abs(Math.cos(mid)) < 0.51;
      const side = gore ? 'back' : front ? 'front' : 'back';
      function point(k, a) {
        const [x, y, z, rx, rz, fl, fr, fv, bl, br, bv] = rows[k];
        const sin = Math.sin(a),
          cos = Math.cos(a);
        const xyz = [x + sin * rx, y, z + cos * rz];
        if (deform) deform(xyz, a, k, rows[k]);
        // A tailored side gore has its own grain direction, so a painted frontal
        // silhouette never stretches into a broad streak across her side.
        if (gore) {
          const seam = mid < Math.PI ? Math.PI / 2 : (3 * Math.PI) / 2;
          const across = clamp((a - seam) / 1.22 + 0.5, 0, 1);
          const u = 0.243 + 0.22 * (mid < Math.PI ? across : 1 - across);
          const v = 0.921 - (xyz[1] - 0.225) * 0.433;
          return vertex(...xyz, u, v, bone);
        }
        const u = front ? fl + ((fr - fl) * (sin + 1)) / 2 : bl + ((br - bl) * (1 - sin)) / 2;
        return vertex(...xyz, u, front ? fv : bv, bone);
      }
      for (let k = 0; k < rows.length - 1; k++)
        quad(side, point(k, p), point(k, q), point(k + 1, q), point(k + 1, p));
    }
  }
  const cloak = [
    // Lower hem to neck. The overlap under the mantle lets the heavy skirt swing independently.
    [0, 0.225, 0, 0.453, 0.276, 0.112, 0.88, 0.895, 0.14, 0.86, 0.928],
    [-0.003, 0.39, 0, 0.481, 0.297, 0.06, 0.923, 0.818, 0.089, 0.913, 0.845],
    [0.001, 0.68, 0, 0.409, 0.27, 0.106, 0.865, 0.7, 0.095, 0.891, 0.733],
    [-0.01, 0.92, 0, 0.377, 0.248, 0.124, 0.829, 0.594, 0.126, 0.86, 0.626],
    [-0.002, 1.13, 0, 0.316, 0.223, 0.2, 0.772, 0.498, 0.188, 0.811, 0.52],
    [-0.002, 1.29, 0, 0.277, 0.209, 0.231, 0.728, 0.424, 0.215, 0.782, 0.447],
  ];
  function folds(xyz, a, i) {
    const force = (1 - i / (cloak.length + 1)) * 0.023;
    const fold = force * (Math.cos(9 * a + 0.34 * i) + 0.3 * Math.cos(17 * a - 0.4 * i));
    xyz[0] += Math.sin(a) * fold;
    xyz[2] += Math.cos(a) * fold;
    if (i === 0) xyz[1] += 0.055 * Math.sin(6 * a + 0.5) + 0.028 * Math.sin(13 * a);
  }
  surface(cloak, 22, parts.hem, folds);
  surface(
    [
      [0, 1.15, 0, 0.307, 0.226, 0.192, 0.758, 0.481, 0.192, 0.814, 0.52],
      [0, 1.28, 0, 0.281, 0.216, 0.218, 0.737, 0.432, 0.198, 0.792, 0.446],
      [0, 1.43, 0, 0.288, 0.232, 0.221, 0.74, 0.365, 0.202, 0.8, 0.37],
      [0, 1.57, -0.005, 0.3, 0.217, 0.216, 0.734, 0.294, 0.21, 0.779, 0.294],
      [0, 1.67, -0.006, 0.252, 0.174, 0.246, 0.71, 0.248, 0.263, 0.75, 0.264],
      [0, 1.756, -0.003, 0.142, 0.125, 0.345, 0.613, 0.201, 0.33, 0.69, 0.212],
    ],
    18,
    parts.body
  );
  // Head, with hair on its back, real cheekbones in profile and a separate nose bridge.
  surface(
    [
      [-0.014, 1.742, 0, 0.103, 0.088, 0.378, 0.555, 0.214, 0.413, 0.602, 0.216],
      [-0.009, 1.785, 0.011, 0.134, 0.123, 0.349, 0.59, 0.192, 0.369, 0.652, 0.207],
      [-0.007, 1.851, 0.012, 0.144, 0.139, 0.327, 0.619, 0.165, 0.344, 0.676, 0.185],
      [-0.005, 1.907, 0.005, 0.148, 0.144, 0.324, 0.62, 0.14, 0.341, 0.674, 0.157],
      [0, 1.968, 0, 0.148, 0.14, 0.325, 0.62, 0.114, 0.347, 0.668, 0.14],
      [0, 1.995, -0.005, 0.11, 0.102, 0.367, 0.582, 0.093, 0.37, 0.635, 0.116],
    ],
    20,
    parts.head,
    (v, a, k) => {
      if (k === 2 || k === 3) v[2] += Math.max(0, Math.cos(a)) ** 5 * (k === 2 ? 0.011 : 0.005);
    }
  );
  surface(
    [
      [-0.008, 1.853, 0.142, 0.014, 0.009, 0.459, 0.486, 0.16, 0.46, 0.49, 0.16],
      [-0.008, 1.864, 0.151, 0.018, 0.013, 0.459, 0.492, 0.157, 0.46, 0.49, 0.157],
      [-0.008, 1.907, 0.14, 0.01, 0.007, 0.463, 0.482, 0.139, 0.46, 0.49, 0.139],
    ],
    10,
    parts.head
  );
  // Worn brim has thickness and an irregular curled crown. The profile and braid remain visible at a grazing angle.
  surface(
    [
      [0, 1.94, 0, 0.14, 0.14, 0.333, 0.61, 0.121, 0.36, 0.65, 0.15],
      [0.012, 1.942, 0, 0.352, 0.261, 0.162, 0.721, 0.144, 0.242, 0.794, 0.159],
      [0.014, 1.958, 0, 0.353, 0.261, 0.159, 0.722, 0.133, 0.23, 0.79, 0.145],
      [0.01, 1.986, 0, 0.196, 0.164, 0.285, 0.65, 0.108, 0.329, 0.699, 0.116],
      [0.012, 2.004, -0.003, 0.181, 0.15, 0.299, 0.656, 0.098, 0.332, 0.688, 0.109],
      [0.026, 2.038, -0.013, 0.164, 0.137, 0.31, 0.663, 0.081, 0.326, 0.664, 0.09],
      [0.049, 2.094, -0.023, 0.133, 0.112, 0.343, 0.654, 0.06, 0.288, 0.592, 0.073],
      [0.091, 2.15, -0.032, 0.099, 0.086, 0.398, 0.658, 0.033, 0.225, 0.462, 0.036],
      [0.147, 2.186, -0.037, 0.064, 0.06, 0.508, 0.667, 0.018, 0.202, 0.362, 0.022],
      [0.204, 2.161, -0.026, 0.037, 0.037, 0.603, 0.713, 0.031, 0.204, 0.302, 0.034],
      [0.237, 2.109, -0.016, 0.023, 0.025, 0.678, 0.729, 0.065, 0.192, 0.241, 0.067],
      [0.241, 2.063, -0.004, 0.005, 0.007, 0.706, 0.726, 0.09, 0.198, 0.221, 0.096],
    ],
    20,
    parts.head,
    (v, a, k) => {
      if (k > 0 && k < 4)
        v[1] +=
          (k === 3 ? 0.37 : 1) *
          (0.043 * Math.sin(a + 0.7) + 0.034 * Math.sin(2 * a - 0.4) + 0.013 * Math.cos(5 * a));
    }
  );

  // Polygon tube along a crooked bone; the surface follows the centre line rather than scaling a whole pose.
  function tube(pts, n, bone, uvs) {
    const sections = [];
    for (let j = 0; j < pts.length; j++) {
      const p = pts[j],
        prev = pts[Math.max(0, j - 1)],
        next = pts[Math.min(pts.length - 1, j + 1)];
      let dx = next[0] - prev[0],
        dy = next[1] - prev[1],
        dz = next[2] - prev[2];
      const len = Math.hypot(dx, dy, dz) || 1;
      dx /= len;
      dy /= len;
      dz /= len;
      // first radial axis is the projection of local right onto the cross-section
      const axis = Math.abs(dx) > 0.95 ? [0, 1, 0] : [1, 0, 0];
      const dot = axis[0] * dx + axis[1] * dy;
      let ax = axis[0] - dx * dot,
        ay = axis[1] - dy * dot,
        az = -dz * dot;
      const mag = Math.hypot(ax, ay, az) || 1;
      ax /= mag;
      ay /= mag;
      az /= mag;
      let bx = ay * dz - az * dy,
        by = az * dx - ax * dz,
        bz = ax * dy - ay * dx;
      if (bz < 0) {
        bx = -bx;
        by = -by;
        bz = -bz;
      }
      sections.push((a) => {
        const s = Math.sin(a),
          c = Math.cos(a),
          r = p[3],
          depth = p[4] ?? r;
        return [
          p[0] + ax * r * s + bx * depth * c,
          p[1] + ay * r * s + by * depth * c,
          p[2] + az * r * s + bz * depth * c,
        ];
      });
    }
    for (let i = 0; i < n; i++) {
      const a = (TAU * i) / n,
        b = (TAU * (i + 1)) / n,
        front = Math.cos((a + b) * 0.5) > 0,
        side = front ? 'front' : 'back';
      function point(j, angle) {
        const tex = uvs[j] || uvs[uvs.length - 1],
          u = front ? tex[0] : tex[3],
          v = front ? tex[1] : tex[4];
        return vertex(...sections[j](angle), u + Math.sin(angle) * (front ? tex[2] : -tex[5]), v, bone);
      }
      for (let j = 0; j < pts.length - 1; j++)
        quad(side, point(j, a), point(j, b), point(j + 1, b), point(j + 1, a));
    }
  }
  function boot(side, bone) {
    const x = side * 0.125,
      front = side < 0 ? 0.266 : 0.49,
      back = side < 0 ? 0.606 : 0.433;
    surface(
      [
        [
          x,
          0.018,
          0.05,
          0.074,
          0.132,
          front - 0.066,
          front + 0.066,
          0.985,
          back - 0.052,
          back + 0.062,
          0.986,
        ],
        [
          x,
          0.058,
          0.056,
          0.08,
          0.139,
          front - 0.061,
          front + 0.066,
          0.963,
          back - 0.061,
          back + 0.061,
          0.954,
        ],
        [
          x,
          0.108,
          0.012,
          0.06,
          0.081,
          front - 0.051,
          front + 0.053,
          0.929,
          back - 0.049,
          back + 0.046,
          0.932,
        ],
        [
          x,
          0.257,
          -0.004,
          0.065,
          0.074,
          front - 0.059,
          front + 0.051,
          0.886,
          back - 0.053,
          back + 0.053,
          0.899,
        ],
      ],
      10,
      bone
    );
  }
  boot(-1, parts.leftFoot);
  boot(1, parts.rightFoot);
  tube(
    [
      [-0.203, 1.626, -0.016, 0.11],
      [-0.291, 1.57, 0.014, 0.118],
      [-0.371, 1.398, 0.071, 0.107],
    ],
    12,
    parts.leftSleeve,
    [
      [0.312, 0.253, 0.064, 0.687, 0.27, 0.059],
      [0.264, 0.319, 0.067, 0.739, 0.34, 0.054],
      [0.226, 0.377, 0.067, 0.774, 0.387, 0.049],
    ]
  );
  tube(
    [
      [-0.36, 1.377, 0.068, 0.105],
      [-0.427, 1.464, 0.115, 0.102],
      [-0.474, 1.592, 0.168, 0.088],
      [-0.503, 1.635, 0.194, 0.048],
    ],
    12,
    parts.leftHand,
    [
      [0.223, 0.414, 0.073, 0.771, 0.421, 0.067],
      [0.18, 0.371, 0.054, 0.811, 0.378, 0.046],
      [0.136, 0.308, 0.041, 0.85, 0.32, 0.041],
      [0.105, 0.28, 0.024, 0.878, 0.285, 0.027],
    ]
  );
  tube(
    [
      [0.195, 1.619, -0.013, 0.11],
      [0.283, 1.522, -0.01, 0.113],
      [0.321, 1.321, 0.047, 0.096],
    ],
    12,
    parts.rightSleeve,
    [
      [0.679, 0.25, 0.061, 0.315, 0.27, 0.055],
      [0.694, 0.334, 0.073, 0.27, 0.347, 0.056],
      [0.728, 0.407, 0.056, 0.244, 0.429, 0.056],
    ]
  );
  tube(
    [
      [0.316, 1.309, 0.042, 0.09],
      [0.373, 1.328, 0.09, 0.084],
      [0.407, 1.398, 0.155, 0.046],
    ],
    12,
    parts.rightHand,
    [
      [0.725, 0.43, 0.053, 0.237, 0.453, 0.05],
      [0.772, 0.386, 0.05, 0.195, 0.367, 0.047],
      [0.793, 0.323, 0.031, 0.165, 0.317, 0.03],
    ]
  );
  for (const [hand, bone, fx, bx] of [
    [wristLeft, parts.leftHand, 0.103, 0.875],
    [wristRight, parts.rightHand, 0.797, 0.163],
  ]) {
    const [x, y, z] = hand;
    surface(
      [
        [x, y - 0.031, z, 0.036, 0.034, fx - 0.032, fx + 0.032, 0.281, bx - 0.03, bx + 0.03, 0.285],
        [x, y + 0.007, z, 0.047, 0.04, fx - 0.045, fx + 0.045, 0.259, bx - 0.045, bx + 0.045, 0.266],
        [x, y + 0.04, z, 0.037, 0.036, fx - 0.034, fx + 0.034, 0.253, bx - 0.036, bx + 0.036, 0.256],
        [x, y + 0.049, z, 0.012, 0.014, fx - 0.011, fx + 0.01, 0.25, bx - 0.009, bx + 0.011, 0.253],
      ].map((r) => (bone === parts.rightHand ? r.map((x, i) => (i === 7 || i === 10 ? x + 0.044 : x)) : r)),
      10,
      bone
    );
    for (let j = 0; j < 4; j++) {
      const start = [x + (j - 1.5) * 0.017, y + 0.016, z + 0.023],
        tip = [start[0], y - 0.012 + (j % 2) * 0.003, z + 0.041];
      tube(
        [
          [...start, 0.01],
          [start[0], y + 0.009, z + 0.05, 0.01],
          [...tip, 0.006],
        ],
        5,
        bone,
        [[fx, 0.265, 0.012, bx, 0.266, 0.012]]
      );
    }
  }
  // The alder crook remains attached to the right fist. Several small changes in its section break up its silhouette.
  tube(
    [
      [0.298, 0.018, 0.194, 0.016],
      [0.334, 0.44, 0.178, 0.023],
      [0.353, 0.806, 0.154, 0.021],
      [0.393, 1.201, 0.172, 0.022],
      [0.418, 1.45, 0.19, 0.025],
      [0.452, 1.728, 0.15, 0.022],
      [0.462, 1.893, 0.13, 0.027],
      [0.488, 2.001, 0.105, 0.029],
      [0.53, 2.05, 0.091, 0.027],
      [0.576, 2.035, 0.086, 0.022],
      [0.596, 1.995, 0.097, 0.018],
      [0.581, 1.954, 0.108, 0.012],
      [0.552, 1.95, 0.113, 0.005],
    ],
    8,
    parts.rightHand,
    [
      [0.63, 0.98, 0.011, 0.092, 0.978, 0.009],
      [0.666, 0.8, 0.015, 0.096, 0.797, 0.012],
      [0.697, 0.64, 0.013, 0.103, 0.646, 0.012],
      [0.738, 0.47, 0.016, 0.12, 0.469, 0.015],
      [0.797, 0.31, 0.016, 0.16, 0.31, 0.015],
      [0.832, 0.23, 0.018, 0.13, 0.221, 0.018],
      [0.84, 0.172, 0.021, 0.12, 0.162, 0.02],
      [0.848, 0.135, 0.02, 0.132, 0.129, 0.018],
      [0.899, 0.104, 0.021, 0.12, 0.108, 0.02],
      [0.939, 0.103, 0.017, 0.089, 0.11, 0.014],
      [0.961, 0.137, 0.015, 0.052, 0.136, 0.014],
      [0.943, 0.15, 0.011, 0.041, 0.151, 0.011],
      [0.922, 0.151, 0.01, 0.065, 0.154, 0.01],
    ]
  );
  function lampRow(y, rx, rz, v, fu, fr, bu, br) {
    return [lampCentre[0], y, lampCentre[2], rx, rz, fu, fr, v, bu, br, v];
  }
  surface(
    [
      lampRow(1.153, 0.055, 0.045, 0.453, 0.038, 0.144, 0.859, 0.969),
      lampRow(1.18, 0.079, 0.069, 0.439, 0.02, 0.171, 0.835, 0.99),
      lampRow(1.2, 0.077, 0.064, 0.428, 0.018, 0.173, 0.849, 0.989),
      lampRow(1.35, 0.077, 0.061, 0.373, 0.016, 0.177, 0.847, 0.992),
      lampRow(1.365, 0.085, 0.069, 0.36, 0.015, 0.179, 0.845, 0.99),
      lampRow(1.393, 0.059, 0.047, 0.348, 0.043, 0.15, 0.861, 0.976),
      lampRow(1.431, 0.026, 0.024, 0.331, 0.076, 0.116, 0.901, 0.943),
    ],
    8,
    parts.lantern
  );
  const bail = [];
  for (let j = 0; j <= 9; j++) {
    const a = (Math.PI * j) / 9;
    bail.push([lampCentre[0] + Math.cos(a) * 0.069, 1.421 + Math.sin(a) * 0.211, lampCentre[2], 0.0055]);
  }
  tube(bail, 5, parts.lantern, [[0.086, 0.301, 0.004, 0.914, 0.31, 0.004]]);
  // The two stoppered glass bottles protrude from the belt; the glass can overlap the coat correctly in profile.
  for (const [x, frontU, backU] of [
    [0.083, 0.521, 0.374],
    [0.151, 0.586, 0.441],
  ]) {
    const zz = 0.205;
    surface(
      [
        [
          x,
          1.131,
          zz,
          0.024,
          0.023,
          frontU - 0.011,
          frontU + 0.011,
          0.492,
          backU - 0.018,
          backU + 0.018,
          0.481,
        ],
        [
          x,
          1.144,
          zz,
          0.032,
          0.029,
          frontU - 0.018,
          frontU + 0.018,
          0.484,
          backU - 0.018,
          backU + 0.018,
          0.476,
        ],
        [
          x,
          1.183,
          zz,
          0.025,
          0.025,
          frontU - 0.013,
          frontU + 0.013,
          0.466,
          backU - 0.014,
          backU + 0.014,
          0.462,
        ],
        [
          x,
          1.209,
          zz,
          0.012,
          0.014,
          frontU - 0.009,
          frontU + 0.009,
          0.447,
          backU - 0.008,
          backU + 0.008,
          0.445,
        ],
        [
          x,
          1.228,
          zz,
          0.015,
          0.015,
          frontU - 0.01,
          frontU + 0.01,
          0.437,
          backU - 0.009,
          backU + 0.009,
          0.439,
        ],
      ],
      8,
      parts.body
    );
  }
  return { front: new Float32Array(mesh.front), back: new Float32Array(mesh.back) };
}
const bindPose = buildCostume();
const buffer = {
  front: new Float32Array(bindPose.front.length),
  back: new Float32Array(bindPose.back.length),
};
export function witchBodyVertices(w, witch, time, floorY) {
  const joints = pose(w, witch, time, floorY);
  for (const key of ['front', 'back']) {
    const src = bindPose[key],
      out = buffer[key];
    for (let i = 0; i < src.length; i += 6) {
      const mat = joints[src[i + 5]],
        x = src[i],
        y = src[i + 1],
        z = src[i + 2];
      out[i] = mat[0] * x + mat[1] * y + mat[2] * z + mat[3];
      out[i + 1] = mat[4] * x + mat[5] * y + mat[6] * z + mat[7];
      out[i + 2] = mat[8] * x + mat[9] * y + mat[10] * z + mat[11];
      out[i + 3] = src[i + 3];
      out[i + 4] = src[i + 4];
      out[i + 5] = 1;
    }
  }
  return buffer;
}
export function witchLanternPoint(w, witch, time, floorY) {
  return transform(pose(w, witch, time, floorY)[parts.lantern], ...lampCentre);
}

const paintings = new WeakMap();
function texels(image) {
  if (paintings.has(image)) return paintings.get(image);
  const width = image?.naturalWidth || image?.width,
    height = image?.naturalHeight || image?.height;
  if (!width || !height) return null;
  const cv = document.createElement('canvas');
  cv.width = width;
  cv.height = height;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  if (!cx) return null;
  try {
    cx.drawImage(image, 0, 0, width, height);
    const data = cx.getImageData(0, 0, width, height).data;
    const texture = {
      data: new Uint32Array(data.buffer, data.byteOffset, data.byteLength / 4),
      width,
      height,
    };
    paintings.set(image, texture);
    cv.width = cv.height = 1;
    return texture;
  } catch {
    return null;
  }
}
// The fallback samples the same two meshes and UVs as WebGL into a small, depth-tested
// layer. Transparent cloth edges and the staff loop reveal whichever body part is behind.
export function createWitchPainter() {
  let sheet, ctx, colour, packed, depth, cache;
  const projected = {
    front: new Float32Array(bindPose.front.length),
    back: new Float32Array(bindPose.back.length),
  };
  return (queue, ray, w, witch, time, floorY, frontImage, backImage) => {
    const front = texels(frontImage),
      back = texels(backImage);
    if (!front || !back) return false;
    const centre = ray(witch.x, floorY + 1.12, witch.z);
    const foot = ray(witch.x, floorY + 0.02, witch.z);
    if (!centre || !foot) return true;
    const meshes = witchBodyVertices(w, witch, time, floorY);
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    for (const key of ['front', 'back']) {
      const src = meshes[key],
        out = projected[key];
      for (let i = 0; i < src.length; i += 6) {
        const pt = ray(src[i], src[i + 1], src[i + 2]);
        if (!pt) {
          out[i + 2] = 0;
          continue;
        }
        const zi = 1 / pt[2];
        out[i] = pt[0];
        out[i + 1] = pt[1];
        out[i + 2] = zi;
        out[i + 3] = src[i + 3] * zi;
        out[i + 4] = src[i + 4] * zi;
        x0 = Math.min(x0, pt[0]);
        y0 = Math.min(y0, pt[1]);
        x1 = Math.max(x1, pt[0]);
        y1 = Math.max(y1, pt[1]);
      }
    }
    if (!Number.isFinite(x0)) return true;
    x0 = Math.floor(x0) - 1;
    y0 = Math.floor(y0) - 1;
    x1 = Math.ceil(x1) + 1;
    y1 = Math.ceil(y1) + 1;
    const sw = x1 - x0,
      sh = y1 - y0;
    const scale = Math.min(1.35, 270 / sw, 390 / sh);
    const width = Math.max(2, Math.ceil(sw * scale)),
      height = Math.max(2, Math.ceil(sh * scale));
    if (!sheet) {
      sheet = document.createElement('canvas');
      ctx = sheet.getContext('2d');
      if (!ctx) return false;
    }
    if (sheet.width < width || sheet.height < height || !colour) {
      sheet.width = Math.ceil(Math.max(width, sheet.width, 16) / 16) * 16;
      sheet.height = Math.ceil(Math.max(height, sheet.height, 16) / 16) * 16;
      colour = ctx.createImageData(sheet.width, sheet.height);
      packed = new Uint32Array(colour.data.buffer);
      depth = new Float32Array(packed.length);
    }
    const stride = sheet.width;
    // Very distant figures get an angle-specific image. Their unrounded screen position
    // still updates on every frame, so camera movement never snaps their feet to pixels.
    const theta = Math.atan2(w.player.x - witch.x, w.player.z - witch.z) - (witch.heading ?? Math.PI);
    const distant = sh < 40;
    const mark = distant
      ? Math.round(theta * 18) + ':' + Math.round(sh / 2) + ':' + Math.floor(time * 3)
      : '';
    const reusable = distant && cache === mark;
    if (!reusable) {
      packed.fill(0);
      depth.fill(0);
      for (const [key, img] of [
        ['front', front],
        ['back', back],
      ]) {
        const v = projected[key];
        for (let i = 0; i < v.length; i += 18) {
          const j = i + 6,
            k = i + 12,
            za = v[i + 2],
            zb = v[j + 2],
            zc = v[k + 2];
          if (!za || !zb || !zc) continue;
          const ax = (v[i] - x0) * scale,
            ay = (v[i + 1] - y0) * scale;
          const bx = (v[j] - x0) * scale,
            by = (v[j + 1] - y0) * scale;
          const cx = (v[k] - x0) * scale,
            cy = (v[k + 1] - y0) * scale;
          const det = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
          if (Math.abs(det) < 0.02) continue;
          const inv = 1 / det,
            xMin = Math.max(0, Math.floor(Math.min(ax, bx, cx))),
            xMax = Math.min(width - 1, Math.ceil(Math.max(ax, bx, cx)));
          const yMin = Math.max(0, Math.floor(Math.min(ay, by, cy))),
            yMax = Math.min(height - 1, Math.ceil(Math.max(ay, by, cy)));
          const dx1 = (cy - ay) * inv,
            dy1 = (ax - cx) * inv,
            dx2 = (ay - by) * inv,
            dy2 = (bx - ax) * inv;
          let base1 = (xMin + 0.5 - ax) * dx1 + (yMin + 0.5 - ay) * dy1,
            base2 = (xMin + 0.5 - ax) * dx2 + (yMin + 0.5 - ay) * dy2;
          for (let y = yMin; y <= yMax; y++, base1 += dy1, base2 += dy2) {
            let u = base1,
              vv = base2,
              p = y * stride + xMin;
            for (let x = xMin; x <= xMax; x++, p++, u += dx1, vv += dx2) {
              const a = 1 - u - vv;
              if (a < -0.0001 || u < -0.0001 || vv < -0.0001) continue;
              const iz = a * za + u * zb + vv * zc;
              if (iz <= depth[p]) continue;
              const ix = clamp(
                (((a * v[i + 3] + u * v[j + 3] + vv * v[k + 3]) * img.width) / iz) | 0,
                0,
                img.width - 1
              );
              const iy = clamp(
                (((a * v[i + 4] + u * v[j + 4] + vv * v[k + 4]) * img.height) / iz) | 0,
                0,
                img.height - 1
              );
              const rgba = img.data[iy * img.width + ix];
              if (rgba >>> 24 < 75) continue;
              packed[p] = rgba;
              depth[p] = iz;
            }
          }
        }
      }
      ctx.putImageData(colour, 0, 0, 0, 0, width, height);
      cache = mark;
    }
    queue.push({
      d: centre[2],
      draw(c) {
        c.drawImage(sheet, 0, 0, width, height, x0, y0, sw, sh);
      },
    });
    return true;
  };
}
