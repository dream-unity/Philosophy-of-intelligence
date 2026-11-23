// Orthographic surface waves are sampled in world metres. Perspective, shallow
// gravel at both banks, a reflection of the dusk and the eastward current survive
// loss of WebGL without covering the player, bridge piers or stepping stones.
const sin = Float32Array.from({ length: 1024 }, (_, j) => Math.sin((j * Math.PI) / 512));
const wave = (a) => sin[((a * 162.97466) | 0) & 1023];
export function createRiverView() {
  let cv, c, frame, out;
  return function draw(ctx, W, H, p, eye, t, quality) {
    const factor = Math.min(1, (quality < 0.8 ? 245 : 336) / W, 186 / H),
      sw = Math.max(2, Math.ceil(W * factor)),
      sh = Math.max(2, Math.ceil(H * factor));
    if (!cv || cv.width !== sw || cv.height !== sh) {
      cv = document.createElement('canvas');
      cv.width = sw;
      cv.height = sh;
      c = cv.getContext('2d');
      frame = c.createImageData(sw, sh);
      out = new Uint32Array(frame.data.buffer);
    }
    out.fill(0);
    const f = sh * 0.685,
      pers = ((W / H) * sh) / sw,
      sy = Math.sin(p.yaw),
      cy = Math.cos(p.yaw),
      sp = Math.sin(p.pitch || 0),
      cp = Math.cos(p.pitch || 0);
    for (let j = 0; j < sh; j++) {
      const vertical = (sh * 0.5 - j - 0.5) / f,
        ry = sp + vertical * cp;
      if (ry >= -0.0002) continue;
      const d = (eye - 0.085) / -ry;
      if (d < 0 || d > 640) continue;
      const fw = (cp - vertical * sp) * d,
        step = (d * pers) / f,
        side = (0.5 - sw * 0.5) * step;
      let x = p.x + fw * sy + side * cy,
        z = p.z + fw * cy - side * sy;
      const incX = cy * step,
        incZ = -sy * step;
      for (let i = 0, k = j * sw; i < sw; i++, k++, x += incX, z += incZ) {
        if (z < 1009 || z > 1034) continue;
        const shallows = Math.max(0, 1 - Math.min(z - 1009, 1034 - z) * 0.29);
        const w = wave(z * 1.8 + x * 0.23 - t * 1.15 + wave(x * 0.33 + t * 0.44) * 1.3),
          r = wave(z * 0.84 + x * 0.18 - t * 0.65);
        const spark = Math.max(0, w + r * 0.34 - 0.75) * 48 * (1 - Math.min(0.56, d * 0.001));
        const dusk = 10 + 11 * wave(x * 0.053 - z * 0.042);
        const red = 64 + dusk + spark + shallows * 22,
          green = 104 + spark + shallows * 10 + r * 5,
          blue = 109 + spark + shallows * 2 + r * 5;
        out[k] = (255 << 24) | ((blue | 0) << 16) | ((green | 0) << 8) | (red | 0);
      }
    }
    c.putImageData(frame, 0, 0);
    ctx.drawImage(cv, 0, 0, W, H);
  };
}
