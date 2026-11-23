// World-space meshes and animation for optional, walk-past encounters.
import { kiln, stable, roosts, charcoalWind, ponyPose } from './story-field.mjs';
export function fieldModels(model, g, ovoid) {
  const out = {},
    make = (key, fn) => (out[key] = model(fn));
  function rail(m, x1, z1, x2, z2) {
    for (const h of [0.55, 1.0]) g.beam(m, [x1, h, z1], [x2, h, z2], 0.058, 0.063, '826b4d', 6);
  }
  make('stable-yard', (m) => {
    for (const [x, z] of [
      [-3, -3],
      [-1.22, -3],
      [1.22, -3],
      [3, -3],
      [-3, 0],
      [3, 0],
      [-3, 3],
      [0, 3],
      [3, 3],
    ])
      g.beam(m, [x, 0, z], [x, 1.24, z], 0.12, 0.1, '5c4c3c', 6);
    for (const [a, b, c, d] of [
      [-3, -3, -3, 3],
      [3, -3, 3, 3],
      [-3, 3, 3, 3],
      [-3, -3, -1.22, -3],
      [1.22, -3, 3, -3],
    ])
      rail(m, a, b, c, d);
  });
  make('stable-gate', (m) => {
    rail(m, 0, 0, 2.44, 0);
    g.beam(m, [0, 1.05, 0], [2.44, 0.45, 0], 0.05, 0.055, '77624b', 6);
    g.beam(m, [2.23, 1.03, 0], [2.23, 1.24, 0], 0.025, 0.025, 'c2a761', 6);
  });
  for (let k = 0; k < 4; k++)
    make('pack-pony-' + k, (m) => {
      const coat = '937054',
        dark = '453c36',
        saddle = '665747';
      ovoid(m, g, 0, 1.05, 0, 0.35, 0.38, 0.77, coat, 10);
      g.beam(m, [0, 1.23, -0.42], [0, 1.66, -0.69], 0.24, 0.16, coat, 8);
      ovoid(m, g, 0, 1.61, -0.82, 0.15, 0.18, 0.28, coat, 8);
      ovoid(m, g, 0, 1.52, -1.037, 0.12, 0.089, 0.1, '55483e', 8);
      g.tri(m, [0, 1.76, -0.93], [-0.026, 1.63, -1.044], [0.023, 1.62, -1.05], 'd9c4a5');
      for (let j = 0; j < 7; j++) {
        const f = j / 7;
        g.tri(
          m,
          [-0.035, 1.64 - f * 0.35, -0.61 + f * 0.3],
          [0.043, 1.63 - f * 0.35, -0.59 + f * 0.3],
          [-0.14, 1.59 - f * 0.39, -0.52 + f * 0.34],
          dark
        );
      }
      for (const s of [-1, 1]) {
        ovoid(m, g, s * 0.129, 1.7, -0.88, 0.031, 0.032, 0.035, '342e27', 6);
        g.beam(m, [s * 0.135, 1.67, -0.88], [s * 0.109, 1.53, -1.009], 0.012, 0.015, 'a38a69', 5);
        g.beam(m, [s * 0.09, 1.77, -0.74], [s * 0.1, 1.99, -0.72], 0.078, 0.018, dark, 5);
        for (const f of [-1, 1]) {
          const leg = [s * 0.22, 0.81, f * 0.43],
            lift = k === 0 ? 0 : Math.sin(k * Math.PI * 0.5 + f * s * 1.6) * 0.12;
          g.beam(m, leg, [leg[0], 0.39, leg[2] + lift], 0.084, 0.06, coat, 7);
          g.beam(m, [leg[0], 0.4, leg[2] + lift], [leg[0], 0.066, leg[2] + lift * 2], 0.065, 0.055, dark, 7);
        }
        ovoid(m, g, s * 0.31, 1.06, 0.03, 0.13, 0.22, 0.23, saddle, 7);
      }
      g.beam(m, [0, 1.18, 0.63], [0, 0.59, 0.77], 0.102, 0.034, dark, 6);
    });
  make('burner-roof', (m) => {
    for (const x of [-5.5, -0.5])
      for (const z of [-2.6, 2.6])
        g.beam(m, [x, 0, z], [x, 2.65 - 0.09 * (x + 5.5), z], 0.105, 0.072, '685442', 7);
    for (let j = 0; j < 11; j++) {
      const z = -2.95 + j * 0.55;
      g.quad(
        m,
        [-5.8, 2.68, z],
        [-0.2, 2.18, z],
        [-0.2, 2.16, z + 0.52],
        [-5.8, 2.66, z + 0.52],
        ['585b56', '65675c', '737566'][j % 3]
      );
    }
    g.rings(
      m,
      [
        [0, 0, 0, 1.35],
        [0, 0.29, 0, 1.23],
        [0, 0.62, 0, 0.89],
        [0, 1.11, 0, 0.22],
        [0, 1.15, 0, 0.12],
      ],
      12,
      '49463f',
      0.13
    );
    ovoid(m, g, 0, 1.12, 0, 0.14, 0.025, 0.13, 'ab744c', 7);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6,
        s = Math.sin(a),
        c = Math.cos(a);
      g.beam(
        m,
        [s * 1.22, 0.06, c * 1.22],
        [s * 0.56, 0.83, c * 0.56],
        0.05,
        0.042,
        i % 2 ? '49433a' : '595143',
        5
      );
    }
    // Cut billets, an open vent and a shovel make the smoke a readable shelter.
    for (let i = 0; i < 6; i++) {
      const x = -4.5 + (i % 3) * 0.34,
        y = 0.16 + Math.floor(i / 3) * 0.25;
      g.beam(m, [x, y, 1.7], [x, y, 2.36], 0.16, 0.16, '826950', 7);
      ovoid(m, g, x, y, 1.69, 0.117, 0.12, 0.012, 'b59a70', 7);
    }
    g.beam(m, [-4.92, 0.22, 2.25], [-5.38, 1.66, 2.48], 0.031, 0.031, '946e4d', 6);
    g.tri(m, [-4.84, 0.04, 2.22], [-5.04, 0.07, 2.28], [-4.91, 0.39, 2.23], '626b60');
    g.beam(m, [-5.6, 2.41, -2.63], [-0.4, 2.01, -2.63], 0.091, 0.092, '66513f', 6);
    g.beam(m, [-5.6, 2.41, 2.63], [-0.4, 2.01, 2.63], 0.091, 0.092, '66513f', 6);
  });
  make('ash-in-wind', (m) => {
    g.tri(m, [-0.12, 0, 0], [0.12, -0.01, 0.06], [0.06, 0.045, 0.03], 'a3a492');
    g.tri(m, [-0.03, 0.04, 0], [0.1, 0.06, 0.05], [0.19, 0.07, 0.1], 'b1b3a0');
  });
  make('copper-kettle', (m) => {
    g.rings(
      m,
      [
        [0, 0, 0, 0.36],
        [0, 0.14, 0, 0.48],
        [0, 0.48, 0, 0.33],
        [0, 0.53, 0, 0.4],
      ],
      12,
      '9b6747',
      0.17
    );
    for (let j = 0; j < 3; j++)
      ovoid(m, g, 0.49 + j * 0.1, 0.04, -0.29 + j * 0.095, 0.09, 0.045, 0.065, 'b9b4a4', 6);
  });
  make('wicket', (m) => {
    for (let j = 0; j < 5; j++) g.box(m, 0, 0, j * 0.135, 0.08, 0.55, 0.129, j % 2 ? '886c49' : '9a7952');
    g.box(m, 0.048, 0.1, 0.27, 0.025, 0.03, 0.62, '453d33');
  });
  make('keepers-door', (m) => {
    for (let i = 0; i < 9; i++) {
      const z = -0.88 + i * 0.215;
      g.box(
        m,
        0,
        0,
        z,
        0.13,
        1.97 + 0.21 * Math.sin((Math.PI * i) / 8),
        0.208,
        i % 3 === 0 ? '644d3c' : '745a42'
      );
    }
    for (const z of [-1.03, 1.06]) g.box(m, 0.052, 0, z, 0.21, 2.19, 0.14, '9a8770');
    g.beam(m, [0.08, 2.1, -1.11], [0.08, 2.29, 0.0], 0.12, 0.12, '9a8770', 6);
    g.beam(m, [0.08, 2.29, 0.0], [0.08, 2.1, 1.13], 0.12, 0.12, '8b7864', 6);
    for (const y of [0.32, 1.72]) g.box(m, 0.095, y, 0.05, 0.08, 0.064, 1.88, '48483d');
    g.box(m, 0.115, 0.89, 0.12, 0.075, 0.68, 0.83, '3d392f');
    for (const side of [-1, 1])
      g.beam(m, [0.136, 1.69, 0.1], [0.136, 1.86, 0.1 + side * 0.22], 0.018, 0.013, 'b2996c', 5);
  });
  make('orchard-cloth', (m) =>
    g.quad(m, [0, 0, 0], [0, 0, 0.29], [0, -0.47, 0.26], [0, -0.38, 0.02], 'd8c9a2')
  );
  for (const pose of ['roost', 'down', 'up'])
    make('thrush-' + pose, (m) => {
      ovoid(m, g, 0, 0.025, 0, 0.076, 0.086, 0.15, '75644d', 7);
      ovoid(m, g, 0, 0.12, -0.09, 0.06, 0.06, 0.065, '655c4b', 6);
      g.beam(m, [0, 0.11, -0.14], [0, 0.107, -0.208], 0.019, 0.002, 'b39860', 5);
      for (const s of [-1, 1]) {
        const outer =
          pose === 'roost' ? [s * 0.088, 0.033, 0.13] : [s * 0.34, pose === 'up' ? 0.23 : -0.11, 0.05];
        g.tri(m, [s * 0.045, 0.083, -0.057], outer, [s * 0.039, 0.04, 0.11], '423e34');
      }
    });
  make('thorn-perch', (m) => {
    g.beam(m, [0, 0, 0], [0.19, 2.07, 0.21], 0.12, 0.066, '6d624b', 7);
    g.beam(m, [-2, 1.67, 0], [2.05, 2.24, 0.42], 0.048, 0.023, '71644a', 6);
    for (let i = 0; i < 5; i++) {
      const x = -1.7 + i * 0.76;
      g.beam(
        m,
        [x, 1.72 + i * 0.1, i * 0.08],
        [x + 0.22, 2 + i * 0.13, i * 0.08 + 0.13],
        0.026,
        0.007,
        '74694c',
        5
      );
    }
  });
  return out;
}
export function fieldPieces(w, t, ground, put) {
  const p = w.player,
    near = (x, z, d) => Math.abs(p.x - x) < d && Math.abs(p.z - z) < d;
  if (near(-3.7, 7.2, 38)) put('copper-kettle', -3.7, ground(-3.7, 7.2), 7.2);
  if (near(kiln.x, kiln.z, 100)) {
    const y = ground(kiln.x, kiln.z),
      wind = charcoalWind(t);
    put('burner-roof', kiln.x, y, kiln.z);
    for (let i = 0; i < 12; i++) {
      const f = (t * 0.21 + i / 12) % 1,
        along = f * 12,
        x = kiln.x + wind.x * along,
        z = kiln.z + wind.z * along;
      put(
        'ash-in-wind',
        x + Math.sin(i + t) * 0.25,
        Math.max(y + 1.2, ground(x, z) + 0.3) + f * 1.9,
        z,
        t + i,
        0.65 + f * 1.2
      );
    }
  }
  if (near(stable.x, stable.z, 100)) {
    const y = ground(stable.x, stable.z),
      opened = w.ponyLooseAt == null ? 0 : Math.max(0, Math.min(1, (t - w.ponyLooseAt) / 0.7));
    put('stable-yard', stable.x, y, stable.z);
    put('stable-gate', stable.x - 1.22, y, stable.z - 3, opened * Math.PI * 0.49);
    const pony = ponyPose(w, t),
      walk = pony.u > 0 && pony.u < 1;
    const turn = w.ponyLooseAt == null ? 0 : Math.min(1, Math.max(0, (t - w.ponyLooseAt) / 0.62));
    put(
      'pack-pony-' + (walk ? (Math.floor(t * 6) % 3) + 1 : 0),
      pony.x,
      ground(pony.x, pony.z),
      pony.z,
      -1.13 * (1 - turn) - (pony.u > 0.52 ? 0.65 : 0)
    );
    put('keepers-door', 22.23, ground(22.27, 1460), 1460.22);
    put(
      'wicket',
      22.42,
      ground(22.27, 1460) + 0.97,
      1460,
      w.keepersDoorAt == null ? 0 : Math.min(1, Math.max(0, t - w.keepersDoorAt - 1.2)) * 1.3
    );
    if (w.keepersDoorAt != null && t > w.keepersDoorAt + 1.2)
      put('orchard-cloth', 22.48, ground(22.27, 1460) + 1.03, 1460.33);
  }
  for (let i = 0; i < roosts.length; i++) {
    const r = roosts[i];
    if (!near(r.x, r.z, 58)) continue;
    const y = ground(r.x, r.z);
    put('thorn-perch', r.x, y, r.z);
    const b = w.birds?.i === i ? w.birds : null;
    for (let j = 0; j < 7; j++) {
      const age = t - (b?.fledAt ?? -100) - j * (b?.reason === 'wolf' ? 0.16 : 0.022);
      const f = age >= 0 && age < 5 ? Math.sin((age * Math.PI) / 5) : 0;
      const x = r.x - 1.74 + j * 0.56 + Math.sin(0.68 * j + 0.4) * f * 3.5,
        z = r.z + j * 0.06 + f * (2 + j * 0.38);
      put(
        'thrush-' + (f > 0.07 ? (Math.sin(t * 26 + j) > 0 ? 'up' : 'down') : 'roost'),
        x,
        y + 1.73 + j * 0.078 + f * (2 + j * 0.18),
        z,
        j * 1.9 + f * 1.6,
        1.4
      );
    }
  }
}
