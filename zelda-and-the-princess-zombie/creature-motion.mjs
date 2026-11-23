// Original rigid geometry stays in model space. Weighted joint rotations keep
// hooves, paws, the dragon's wing fingers and the troll's club visibly attached.
const limit = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const isCreature = (a) => a.type === 'wolf' || a.type === 'troll' || a.type === 'dragon';
export function animateCreature(rest, out, a, time) {
  const phase = (a.phase || 0) * 1.7,
    kind = a.type;
  const alert = !!(a.alerted || a.state === 'chase' || a.mode === 'hunt'),
    windLeft = (a.windupUntil || 0) - time;
  const wind =
    windLeft > 0 ? limit(1 - windLeft / (kind === 'dragon' ? 1.05 : kind === 'troll' ? 0.78 : 0.48)) : 0;
  const contact = limit(1 - Math.abs(time - (a.impactAt ?? -30)) / 0.32);
  const gait =
    time *
      (kind === 'wolf' ? (alert ? 8.0 : 4.6) : kind === 'troll' ? (alert ? 3.6 : 2.4) : alert ? 3.2 : 2.3) +
    phase;
  const stride = Math.sin(gait),
    counter = Math.cos(gait),
    wings = Math.sin(gait * 0.94);
  const jaw = Math.max(wind, contact);
  for (let i = 0; i < rest.length; i += 6) {
    let x = rest[i],
      y = rest[i + 1],
      z = rest[i + 2];
    const sx = Math.sign(x) || 1;
    if (kind === 'wolf') {
      const leg = limit((0.94 - y) / 0.45) * limit(Math.abs(z) / 0.22);
      const angle = (z < 0 ? 1 : -1) * sx * stride * (alert ? 0.62 : 0.34) * leg;
      if (leg) {
        const dy = y - 0.83,
          dz = z - (z < 0 ? -0.43 : 0.43);
        y = 0.83 + dy * Math.cos(angle) - dz * Math.sin(angle);
        z = (z < 0 ? -0.43 : 0.43) + dy * Math.sin(angle) + dz * Math.cos(angle);
      }
      const head = limit((-z - 0.28) / 0.55);
      y -= head * (wind * 0.22 - contact * 0.14);
      z -= head * contact * 0.25;
      if (z > 0.53) {
        x += Math.sin(gait * 0.72 + z) * 0.21 * (z - 0.5);
        y += wind * (z - 0.5) * 0.32;
      }
      y -= wind * 0.1;
      z -= contact * 0.18;
    } else if (kind === 'troll') {
      const leg = limit((1.29 - y) / 0.63);
      if (leg) {
        z += sx * stride * 0.29 * leg;
        y += Math.max(0, sx * counter) * 0.11 * leg;
      }
      const arm = limit((Math.abs(x) - 0.68) / 0.33),
        pivotY = 2.35,
        pivotZ = -0.03;
      if (arm) {
        const angle =
          (sx > 0 ? 0.2 * stride - wind * 1.97 + contact * 1.2 : -0.16 * stride + wind * 0.54) * arm;
        const dy = y - pivotY,
          dz = z - pivotZ;
        y = pivotY + dy * Math.cos(angle) - dz * Math.sin(angle);
        z = pivotZ + dy * Math.sin(angle) + dz * Math.cos(angle);
      }
      x += Math.sin(gait) * 0.045 * limit(y / 2);
      y -= wind * 0.2;
      z -= contact * limit(y / 1.5) * 0.33;
    } else {
      const span = limit((Math.abs(x) - 0.32) / 0.88);
      if (span) {
        const dx = Math.abs(x) - 0.31,
          dy = y - 0.67,
          angle = (wings * 0.41 - wind * 0.52) * span;
        x = sx * (0.31 + dx * Math.cos(angle) - dy * Math.sin(angle));
        y = 0.67 + dx * Math.sin(angle) + dy * Math.cos(angle);
        z += counter * 0.14 * span;
      }
      if (z < -0.72) {
        const neck = limit((-z - 0.72) / 1.27);
        y += neck * (0.06 * counter + 0.57 * wind - 0.5 * contact);
        z -= neck * contact * 0.56;
      }
      if (z > 1.12) x += Math.sin(gait * 0.53 + z * 0.91) * (z - 0.85) * 0.125;
      if (jaw > 0.05 && z < -1.8 && y < 1.31) y -= jaw * 0.18;
    }
    out[i] = x;
    out[i + 1] = y;
    out[i + 2] = z;
    if (jaw > 0 && ((kind === 'dragon' && z < -1.75) || (kind === 'wolf' && z < -0.75))) {
      out[i + 3] = Math.min(1, rest[i + 3] + jaw * 0.14);
      out[i + 4] = rest[i + 4] * (1 - jaw * 0.05);
    } else {
      out[i + 3] = rest[i + 3];
      out[i + 4] = rest[i + 4];
    }
  }
  return out;
}
export function makeCreatureDetails(m, g, kind) {
  const { beam, tri, stone } = g;
  if (kind === 'wolf') {
    // The mane is made up of angular guard hairs. The leading teeth and ears
    // retain readable silhouettes against the brighter road.
    for (const side of [-1, 1]) {
      for (let k = 0; k < 6; k++) {
        const z = -0.6 + k * 0.076,
          y = 1.39 - k * 0.044;
        tri(
          m,
          [side * 0.11, y + 0.09, z],
          [side * 0.24, y - 0.02, z + 0.05],
          [side * (0.27 + k * 0.009), y - 0.17, z + 0.11],
          k % 2 ? '9a9b87' : '84917d'
        );
      }
      for (const z of [-0.81, -0.88])
        beam(m, [side * 0.08, 1.29, z], [side * 0.085, 1.2, z - 0.022], 0.024, 0.001, 'e1d4ae', 4);
    }
  } else if (kind === 'troll') {
    for (const side of [-1, 1])
      for (let k = 0; k < 5; k++) {
        const x = side * (0.51 + k * 0.066),
          y = 2.37 + Math.sin(k * 0.77) * 0.14,
          z = -0.16 + (k % 2) * 0.13;
        stone(m, x, y, z, 0.105, 0.14 + k * 0.014, 0.1, k % 2 ? '93997e' : '747e69', k * 0.7);
      }
    for (let k = 0; k < 3; k++) {
      const y = 1.9 + k * 0.16;
      beam(m, [-0.67 + k * 0.12, y, -0.39], [-0.28 + k * 0.13, y + 0.2, -0.49], 0.039, 0.034, '9f8966', 5);
    }
    for (let k = 0; k < 4; k++)
      beam(
        m,
        [1.1, 1.87 + k * 0.083, -0.49],
        [1.1, 1.9 + k * 0.083, -0.49],
        0.179 + k * 0.015,
        0.18 + k * 0.015,
        k % 2 ? '7a6951' : 'aa956e',
        7
      );
  } else {
    for (let i = 0; i < 11; i++) {
      const z = -1.42 + i * 0.285,
        y = 0.81 + (z < -0.7 ? 0.34 : z > 0.66 ? -0.37 : 0);
      tri(
        m,
        [-0.08, y, z],
        [0, y + 0.22 + (10 - i) * 0.013, z + 0.29],
        [0.08, y, z + 0.14],
        i % 3 ? 'b9a398' : 'c4b19b'
      );
    }
    for (const side of [-1, 1])
      for (let k = 0; k < 3; k++) {
        const x = side * (0.8 + k * 0.64),
          y = 1.08 + k * 0.12;
        beam(m, [x, y, 0.41], [x + side * 0.46, y + 0.17, 0.97], 0.035, 0.015, 'b2a1ae', 4);
      }
  }
}

// The textured surface is gently articulated in UV space. The same joints drive
// a Canvas patch and a WebGL triangle, including the visible attack wind-up.
export function actorWarp(a, time, u, v) {
  const alert = !!a.alerted,
    phase = time * (a.type === 'dragon' ? 3.8 : alert ? 7.3 : 4.7) + (a.phase || 0) * 1.76;
  const wind =
    (a.windupUntil || 0) > time
      ? limit(1 - (a.windupUntil - time) / (a.type === 'dragon' ? 1.05 : a.type === 'troll' ? 0.78 : 0.48))
      : 0;
  const impact = limit(1 - Math.abs(time - (a.impactAt ?? -20)) / 0.31);
  const front = u > 0.5 ? 1 : -1,
    step = Math.sin(phase + u * 5.8);
  if (a.type === 'marcher') {
    const legs = limit((v - 0.56) / 0.4),
      head = limit((0.32 - v) / 0.27);
    const hand = (a.reach || 0) * limit((u - 0.42) * 2.1) * Math.max(0, 1 - Math.abs(v - 0.48) * 2.5);
    return [
      u + step * 0.039 * legs + Math.sin(phase) * 0.009 * head + hand * 0.16,
      v + legs * 0.019 * Math.max(0, Math.cos(phase + u * 5.3)) + head * Math.sin(phase) * 0.008 - hand * 0.18,
    ];
  }
  if (a.type === 'dragon') {
    const span = limit((Math.abs(u - 0.51) - 0.12) / 0.39),
      flap = Math.sin(phase) * 0.12 - wind * 0.11;
    return [
      u + front * span * Math.cos(phase) * 0.022 + (1 - v) * wind * 0.014,
      v + span * (1 - v * 0.47) * flap + wind * 0.035 - impact * 0.02,
    ];
  }
  if (a.type === 'troll') {
    const shoulder = limit((0.74 - v) / 0.3) * limit(Math.abs(u - 0.5) * 3),
      leg = limit((v - 0.63) / 0.35);
    return [
      u + step * 0.042 * leg + shoulder * wind * front * 0.048 + impact * (1 - v) * 0.047,
      v +
        0.018 * leg * (1 - Math.cos(phase + u * 4)) -
        shoulder * wind * 0.15 +
        shoulder * impact * 0.11 +
        wind * 0.035 * v,
    ];
  }
  const leg = limit((v - 0.55) / 0.39),
    head = limit((u - 0.48) / 0.31);
  return [
    u + step * 0.063 * leg + head * impact * 0.072,
    v + 0.024 * leg * Math.sin(phase * 1.08 + u * 7) + wind * (1 - v) * 0.098 - impact * head * 0.072,
  ];
}
const views = new WeakMap();
export function creaturePose(a, t, p) {
  const dragon = a.type === 'dragon',
    h = dragon ? 2.85 : a.type === 'troll' ? 3.33 : 1.65;
  const dx = a.x - p.x,
    dz = a.z - p.z,
    d = Math.max(0.1, Math.hypot(dx, dz)),
    heading = a.attackYaw ?? a.heading ?? 0;
  const side = Math.sin(heading) * Math.cos(p.yaw) - Math.cos(heading) * Math.sin(p.yaw);
  const toward = (-dx * Math.sin(heading) - dz * Math.cos(heading)) / d;
  // Adjacent viewing sectors overlap slightly. Standing at a sector boundary
  // will never flicker from the animal's face to its flank on successive frames.
  const prior = views.get(a),
    k = Math.abs(toward),
    threshold = prior === 'side' ? 0.73 : 0.63;
  const view = k < threshold ? 'side' : toward >= 0 ? 'front' : 'rear';
  views.set(a, view);
  return {
    x: a.x,
    z: a.z,
    view,
    dy: dragon ? (a.airHeight ?? 3.25) : 0,
    h,
    w:
      view === 'side'
        ? (dragon ? 1.6 : a.type === 'wolf' ? 1.25 : 0.97) * (0.84 + 0.16 * Math.abs(side))
        : dragon
          ? 1.7
          : 1,
    flip: side < 0,
    seed: 1,
    rig: a,
    tilt: 0,
  };
}

export function makeCreatureBank(builders, tools, store) {
  const source = {},
    poses = new Map();
  for (const type of ['wolf', 'troll', 'dragon']) {
    const vertices = [];
    builders[type](vertices);
    makeCreatureDetails(vertices, tools, type);
    source[type] = Float32Array.from(vertices);
  }
  return function posed(a, time) {
    const period =
      a.type === 'wolf'
        ? a.alerted
          ? 8
          : 4.6
        : a.type === 'troll'
          ? a.alerted
            ? 3.6
            : 2.4
          : a.alerted
            ? 3.2
            : 2.3;
    const stride = (time * period + (a.phase || 0) * 1.7) / (Math.PI * 2);
    const phase = Math.floor((stride - Math.floor(stride)) * 14);
    const wind = Math.max(0, (a.windupUntil || 0) - time),
      hit = Math.max(0, 1 - Math.abs(time - (a.impactAt ?? -100)) / 0.32);
    const mode =
      wind > 0 ? 'w' + Math.min(4, Math.floor(wind * 5)) : hit > 0 ? 'h' + Math.floor(hit * 3) : 'walk';
    const key = a.type + ':' + (a.alerted ? 1 : 0) + ':' + mode + ':' + (mode === 'walk' ? phase : phase % 3);
    let mesh = poses.get(key);
    if (mesh) return mesh;
    const rest = source[a.type],
      frame = new Float32Array(rest);
    animateCreature(rest, frame, a, time);
    mesh = store(frame);
    poses.set(key, mesh);
    return mesh;
  };
}
