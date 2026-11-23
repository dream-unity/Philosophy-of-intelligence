// CPU perspective texture mapper for the fallback camera. A horizontal row shares
// its depth and mip level. The visible ground consequently needs one small RGBA
// upload, even when the player moves or rotates among a large number of trees.
import { roadX, trailX, terrainHeight } from './geography.mjs';

const atlasURL = new URL('./woodland-ground.webp', import.meta.url).href;
const z0 = -352,
  route = new Float32Array(2300),
  trail = new Float32Array(route.length);
for (let j = 0; j < route.length; j++) {
  route[j] = roadX(z0 + j);
  trail[j] = trailX(z0 + j);
}
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const pack = (r, g, b) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
const plain = [pack(92, 107, 76), pack(148, 131, 94)];
export function createGroundPainter() {
  const atlas = new Image();
  atlas.decoding = 'async';
  let tiles = null,
    off = null,
    context = null,
    frame = null,
    out = null,
    lastKey = '',
    disposed = false;
  function build() {
    if (disposed) return;
    const src = [];
    for (const dim of [512, 256, 128, 64, 32, 16, 8]) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = dim;
      const c = cv.getContext('2d', { willReadFrequently: true });
      const layer = [];
      for (let k = 0; k < 2; k++) {
        c.drawImage(
          atlas,
          (k * atlas.naturalWidth) / 2,
          0,
          atlas.naturalWidth / 2,
          atlas.naturalHeight,
          0,
          0,
          dim,
          dim
        );
        const bytes = c.getImageData(0, 0, dim, dim).data;
        const set = new Uint32Array(dim * dim),
          mist = Math.min(0.57, Math.max(0, (Math.log2(512 / dim) - 1) * 0.087));
        for (let j = 0; j < set.length; j++) {
          const i = j * 4,
            r = bytes[i],
            g = bytes[i + 1],
            b = bytes[i + 2];
          set[j] = pack((r + (137 - r) * mist) | 0, (g + (144 - g) * mist) | 0, (b + (119 - b) * mist) | 0);
        }
        layer.push(set);
      }
      src.push(layer);
      cv.width = cv.height = 1;
    }
    tiles = src;
    lastKey = '';
  }
  atlas.onload = build;
  atlas.src = atlasURL;
  function paint(ctx, W, H, p, horizon, eye, time = 0, quality = 1) {
    if (disposed) return false;
    // A flat foreground receives the most samples. The highly compressed last
    // few metres of image height use the coarsest terrain mip at the skyline.
    const fraction = Math.min(1, (quality < 0.8 ? 350 : 470) / W, (quality < 0.8 ? 195 : 268) / H);
    const sw = Math.max(2, Math.round(W * fraction)),
      sh = Math.max(2, Math.round(H * fraction));
    const start = clamp(Math.floor((horizon * sh) / H), 0, sh);
    if (start === sh) return true;
    if (!off || off.width !== sw || off.height !== sh) {
      off ??= document.createElement('canvas');
      off.width = sw;
      off.height = sh;
      context = off.getContext('2d');
      frame = context.createImageData(sw, sh);
      out = new Uint32Array(frame.data.buffer);
      lastKey = '';
    }
    const key = [p.x, p.z, p.yaw, p.pitch, eye, sw, sh, !!tiles].join(',');
    if (lastKey !== key) {
      lastKey = key;
      out.fill(0, 0, start * sw);
      const sy = Math.sin(p.yaw),
        cy = Math.cos(p.yaw),
        sp = Math.sin(p.pitch || 0),
        cp = Math.cos(p.pitch || 0),
        f = sh * 0.685;
      const eyeAbove = Math.max(0.08, eye - terrainHeight(p.x, p.z)),
        perspective = ((W / H) * sh) / sw;
      for (let row = start; row < sh; row++) {
        const vertical = (sh * 0.5 - row - 0.5) / f,
          ry = sp + vertical * cp,
          depth = ry < -0.00001 ? Math.min(1200, eyeAbove / -ry) : 1200;
        const forward = (cp - vertical * sp) * depth,
          step = (depth / f) * perspective;
        const mapWidth = Math.max(1, 5.25 / step),
          lv = Math.round(clamp(Math.log2(512 / mapWidth), 0, 6)),
          dim = 512 >> lv,
          mask = dim - 1,
          tex = tiles?.[lv],
          factor = dim / 5.25;
        const side = (0.5 - sw * 0.5) * step,
          dx = cy * step,
          dz = -sy * step;
        let x = p.x + forward * sy + side * cy,
          z = p.z + forward * cy - side * sy;
        for (let col = 0, idx = row * sw; col < sw; col++, idx++, x += dx, z += dz) {
          const rz = clamp((z - z0) | 0, 0, route.length - 1),
            dist = Math.abs(x - route[rz]),
            shortcut = Math.abs(x - trail[rz]);
          const tx = Math.floor(x * factor) & mask,
            tz = Math.floor(z * factor) & mask;
          const k = z < 1435 && (dist < 5.45 || shortcut < 1.13) ? 1 : 0;
          out[idx] = tex ? tex[k][tz * dim + tx] : plain[k];
        }
      }
      context.putImageData(frame, 0, 0, 0, start, sw, sh - start);
    }
    ctx.drawImage(off, 0, start, sw, sh - start, 0, (start * H) / sh, W, ((sh - start) * H) / sh);
    return true;
  }
  function dispose() {
    disposed = true;
    atlas.onload = null;
    off = context = frame = out = tiles = null;
  }
  return { paint, dispose };
}
