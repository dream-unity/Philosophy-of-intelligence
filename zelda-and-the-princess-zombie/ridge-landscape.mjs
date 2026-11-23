import { terrainHeight as ground, roadX, trailX } from './geography.mjs';

function rand(i) {
  const n = Math.sin(368.179 * i + 27.414) * 397.43;
  return n - Math.floor(n);
}
// Ravenback overlooks old hay meadows. Narrow strips follow the hill, split by
// hay ricks, field drains and pollarded hedgerows; broad gaps preserve the march.
export function makeRidgeLandscape(m, { tri, quad, rings, beam }) {
  for (let j = 0; j < 12; j++) {
    const z = 535 + j * 28,
      span = 84 + j * 9,
      cx = 21 - j * 5;
    for (let s = 0; s < 12; s++) {
      const x = cx - span / 2 + (span * s) / 12,
        xx = x + span / 12,
        kink = 2.8 * Math.sin(x * 0.033 + j);
      const p = (a, b) => [a, ground(a, b) + 0.09, b];
      const v = z + kink,
        vv = z + 2.8 * Math.sin(xx * 0.033 + j);
      if (Math.abs(x - roadX(z)) < 12 || Math.abs(x - trailX(z)) < 7) continue;
      quad(
        m,
        p(x, v),
        p(xx, vv),
        p(xx, vv + 1.7 + j * 0.08),
        p(x, v + 1.4 + j * 0.08),
        ['839071', '879071', '9a9a72', '87957a'][j % 4],
        false
      );
      // A low ditch bank and scattered flowering rushes catch the raking light.
      if (s % 3 === 1) {
        const y = ground(x, v);
        for (let n = 0; n < 5; n++) {
          const u = x + n * 0.73,
            h = 0.38 + rand(n + j) * 0.91,
            a = v + n * 0.22;
          tri(
            m,
            [u - 0.22, y + 0.08, a],
            [u + 0.12, y + h, a + 0.13],
            [u + 0.27, y + 0.09, a + 0.2],
            n % 3 ? '748568' : 'a29a78'
          );
        }
      }
    }
  }
  for (const { x, z: zz, h, angle, color } of ridgePollards) {
    const y = ground(x, zz);
    beam(m, [x, y - 0.08, zz], [x + 0.13, y + h * 0.63, zz], 0.14, 0.17, '74735c', 5);
    rings(
      m,
      [
        [x, y + h * 0.4, zz, h * 0.13],
        [x - 0.24, y + h * 0.64, zz, h * 0.34, h * 0.25],
        [x + 0.21, y + h * 0.9, zz, h * 0.3, h * 0.26],
        [x + 0.35, y + h, zz, h * 0.09],
      ],
      6,
      color,
      angle
    );
  }
}
export const ridgePollards = [];
for (let j = 0; j < 6; j++) {
  const z = 565 + j * 65;
  for (let side of [-1, 1])
    for (let k = 0; k < 4; k++) {
      const x = side < 0 ? 8 - (z - 484) * 0.63 - k * 4 : 62 + (z - 484) * 0.12 + k * 5;
      const zz = z + k * 2.4,
        y = ground(x, zz),
        h = 3.3 + rand(j * 5 + k + side) * 3;
      if (Math.abs(x - roadX(zz)) < 12 || Math.abs(x - trailX(zz)) < 7) continue;
      ridgePollards.push({
        x,
        z: zz,
        h,
        angle: rand(k + j),
        color: j % 2 ? '687e6b' : '7e8d72',
        radius: 0.19,
      });
    }
}
