// Surface relief on the same hill, gatehouse and walking route used by the simulation.
import { terrainHeight as ground, roadX } from './geography.mjs';

const stonework = ['a29b91', '948f89', '85848a', 'aaa298', '969290', '8f8a82'];
const slate = ['686a72', '575e68', '74737a', '5b6161', '666a6a', '797779'];
const moss = ['737b62', '68755e', '59685b'];
const windowGlass = ['dbac6e', 'd6b47a', 'a45a59', '7f91b7', 'bd8b7b'];

function hash(row, col) {
  const n = Math.sin(row * 127.1 + col * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export function makeFortressDetail(mesh, { tri, quad }) {
  const floor = ground(30, 1435) - 0.12;
  const face = (a, b, c, d, color, lit = true) => quad(mesh, a, b, c, d, color, lit);
  const facet = (a, b, c, color, lit = true) => tri(mesh, a, b, c, color, lit);

  // Overlapping beds of exposed, moss-capped shale follow the two steep flanks.
  // Every point samples the actual hill. Feet can stand on the rock they see.
  for (const side of [-1, 1]) {
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 12; col++) {
        const point = (r, c) => {
          const x = 30 + side * (35 + r * 7.8 + (hash(r, c) - 0.5) * 4.0);
          const z = 1388 + c * 12 + Math.sin(r * 0.7 + c * 0.23) * 5.5 + (hash(c, r) - 0.5) * 3;
          return [x, ground(x, z) + 0.27, z];
        };
        const a = point(row, col),
          b = point(row + 1, col),
          c = point(row + 1, col + 1),
          d = point(row, col + 1);
        const h = hash(row * side, col);
        const colors = row === 0 || h > 0.86 ? moss : slate;
        facet(a, b, d, colors[Math.floor(h * colors.length)]);
        facet(b, c, d, colors[Math.floor(hash(col, row + 3) * colors.length)]);
      }
    }
  }

  // A leat breaks through the east parapet. Follow its sheet of water down the
  // exposed rock to the foothill. The reflective filaments move independently.
  for (let j = 0; j < 14; j++) {
    const [a, b] = fallSection(j / 14),
      [d, c] = fallSection((j + 1) / 14);
    face(a, b, c, d, ['7698a0', '658d98', '789aa3'][j % 3], false);
    for (const fraction of [0.08, 0.38, 0.84]) {
      const width = 0.025 + hash(j, fraction) * 0.065;
      face(
        blend(a, b, fraction, 0.025),
        blend(a, b, fraction + width, 0.025),
        blend(d, c, fraction + width * 0.75, 0.025),
        blend(d, c, fraction, 0.025),
        'aac3c2',
        false
      );
    }
  }

  // Monumental voussoirs (individual wedge stones) trace the pointed gateway.
  for (const sign of [-1, 1]) {
    function arch(t, outer, depth) {
      const radius = outer ? 0.71 : 0;
      const x = 30 + sign * ((5.12 + radius) * (1 - t) * (1 + 0.33 * t));
      return [x, floor + 4.7 + 3.67 * Math.sin((t * Math.PI) / 2) + (outer ? 0.57 : 0), 1433.53 + depth];
    }
    for (let i = 0; i < 8; i++) {
      const u = i / 8 + 0.008,
        v = (i + 1) / 8 - 0.008;
      face(arch(u, false, 0), arch(v, false, 0), arch(v, true, 0), arch(u, true, 0), stonework[(i + 2) % 6]);
      face(arch(u, false, 0), arch(v, false, 0), arch(v, false, 0.22), arch(u, false, 0.22), '5a575b');
    }
    // Rusticated jambs and the time-darkened mortar between carved ashlar.
    for (let j = 0; j < 7; j++) {
      const x = 30 + 5.65 * sign,
        y = floor + j * 0.691;
      const w = j % 2 ? 0.51 : 0.63;
      face(
        [x - w, y, 1433.55],
        [x + w, y, 1433.55],
        [x + w, y + 0.648, 1433.55],
        [x - w, y + 0.648, 1433.55],
        stonework[j % 6]
      );
    }
    const wall = (x, y, depth = 0) => [30 + sign * x, floor + y, 1434.32 + depth];
    face(
      wall(6.3, 0.12, 0.021),
      wall(24.34, 0.12, 0.021),
      wall(24.34, 8.99, 0.021),
      wall(6.3, 8.99, 0.021),
      '666465'
    );
    for (let j = 0; j < 7; j++)
      for (let k = 0; k < 10; k++) {
        const x1 = Math.max(6.35, 6.35 + k * 1.94 - (j % 2) * 0.94);
        const x2 = Math.min(24.3, 6.35 + (k + 1) * 1.94 - (j % 2) * 0.94 - 0.045);
        if (x1 >= x2) continue;
        const y = 0.14 + j * 1.25,
          shade = hash(j * sign, k);
        face(
          wall(x1, y),
          wall(x2, y),
          wall(x2, y + 1.19),
          wall(x1, y + 1.19),
          stonework[Math.floor(shade * 6)]
        );
        // Broken corners and split bedding interrupt the rectangular stone courses.
        if (shade < 0.46) {
          const kx = x1 + 0.19 + shade,
            ky = y + 0.23 + shade;
          facet(
            wall(kx, ky, -0.014),
            wall(kx + 0.45, ky + 0.04, -0.014),
            wall(kx + 0.11, ky + 0.076, -0.014),
            '847d73'
          );
          facet(
            wall(x1, y + 1.19, -0.012),
            wall(x1 + 0.12, y + 1.19, -0.012),
            wall(x1, y + 1.08, -0.012),
            '69686b'
          );
        }
      }
    // Three tall lancets make the gate readable through mist as a group of lights.
    for (let k = -1; k <= 1; k++) {
      const cx = 30 + sign * 13 + k * 0.78,
        base = floor + 4.28,
        height = 2.1 - Math.abs(k) * 0.49;
      const p = (x, h) => [cx + x, base + h, 1434.19];
      face(p(-0.32, 0), p(0.32, 0), p(0.32, height), p(-0.32, height), '514f5b', false);
      facet(p(-0.32, height), p(0.32, height), p(0, height + 0.57), '68636a', false);
      for (let cell = 0; cell < 4; cell++) {
        const low = (cell * height) / 4 + 0.035,
          high = ((cell + 1) * height) / 4 - 0.04;
        face(
          p(-0.23, low),
          p(0.23, low),
          p(0.23, high),
          p(-0.23, high),
          windowGlass[(cell + k + 5) % 5],
          false
        );
      }
      facet(p(-0.23, height), p(0.23, height), p(0, height + 0.42), 'e4bf8c', false);
    }
    // Faded heraldic stitching on the two gatehouse standards.
    const bx = 30 + sign * 8.75,
      by = floor + 8.05;
    const cloth = (x, y) => [bx + x, by + y, 1434.16 - Math.cos(x * 4) * 0.07];
    face(cloth(-0.71, 0), cloth(0.71, 0), cloth(0.64, -2.48), cloth(-0.59, -2.48), '634551', false);
    facet(cloth(-0.59, -2.48), cloth(0.64, -2.48), cloth(0.08, -3.11), '70454e', false);
    facet(cloth(0, -0.37), cloth(-0.33, -1.51), cloth(0.33, -1.51), 'c3a46c', false);
    facet(cloth(0, -1.97), cloth(-0.23, -1.54), cloth(0.23, -1.54), 'b29868', false);
  }

  // Old paving emerges gradually out of the dirt as the road climbs. These are
  // flat inset slabs, so their broken outlines introduce no invisible obstacles.
  for (let n = 0; n < 95; n++) {
    const z = 1190 + n * 2.48;
    if (hash(n, 2) > (z - 1160) / 300) continue;
    for (let lane = -1; lane <= 1; lane++) {
      if (hash(n, lane + 4) < 0.25) continue;
      const x = roadX(z) + lane * 1.17 + (hash(n, 6 + lane) - 0.5) * 0.4;
      const p = (dx, dz) => [x + dx, ground(x + dx, z + dz) + 0.095, z + dz];
      const w = 0.38 + hash(n, lane + 8) * 0.29,
        len = 0.45 + hash(n, lane + 9) * 0.63;
      face(
        p(-w, -len),
        p(w, -len * 0.89),
        p(w * 0.87, len),
        p(-w * 0.91, len * 0.85),
        ['898272', '8e8672', '827d70', '9a907d'][Math.floor(hash(n, lane) * 4)]
      );
    }
  }
}

function fallSection(t) {
  const x = 57 + t * 65,
    z = 1426 - 6 * Math.sin(Math.PI * t) + t * 11;
  const w = 1.12 + Math.sin(t * Math.PI) * 1.75 + t * 0.9;
  return [-1, 1].map((side) => [x, ground(x, z + side * w) + 0.76, z + side * w]);
}
function blend(a, b, t, lift) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + lift, a[2] + (b[2] - a[2]) * t];
}
// A dozen moving flecks are enough to establish motion even on the low tier.
export function makeFallFoam(mesh, quad, time) {
  for (let i = 0; i < 13; i++) {
    const t = (time * (0.13 + hash(i, 0) * 0.055) + hash(i, 3)) % 1,
      offset = 0.04 + hash(i, 2) * 0.78;
    const [a, b] = fallSection(t),
      [d, c] = fallSection(Math.min(1, t + 0.031));
    quad(
      mesh,
      blend(a, b, offset, 0.11),
      blend(a, b, offset + 0.064, 0.11),
      blend(d, c, offset + 0.055, 0.11),
      blend(d, c, offset, 0.11),
      'd6dfd6',
      false
    );
  }
}
