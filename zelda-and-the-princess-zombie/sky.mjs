// Equirectangular. North is at u=.5, east at .75. Image row zero is the zenith.
export const SKY_URL = new URL('./sky.webp', import.meta.url).href;
const TAU = Math.PI * 2;

export function createSky() {
  const image = new Image();
  image.decoding = 'async';
  const ready = new Promise((resolve) => {
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
  });
  image.src = SKY_URL;

  // The GL renderer can upload the image directly. Only the software renderer
  // allocates CPU pixel storage; the background is cached whenever the eye is still.
  let source,
    projection,
    unreadable = false;
  function readSource() {
    if (source) return true;
    if (unreadable || !image.complete || !image.naturalWidth) return false;
    const sheet = document.createElement('canvas');
    sheet.width = image.naturalWidth;
    sheet.height = image.naturalHeight;
    try {
      const context = sheet.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      source = new Uint32Array(context.getImageData(0, 0, sheet.width, sheet.height).data.buffer);
      sheet.width = sheet.height = 1;
    } catch {
      unreadable = true;
      return false;
    }
    return true;
  }
  function makeProjection(width, height, aspect, fov) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    const pixels = context.createImageData(width, height);
    const tangent = Math.tan(fov / 2);
    const xs = Float32Array.from(
      { length: width },
      (_, x) => ((2 * (x + 0.5)) / width - 1) * aspect * tangent
    );
    const ys = Float32Array.from({ length: height }, (_, y) => (1 - (2 * (y + 0.5)) / height) * tangent);
    const lengthInv = new Float32Array(width * height);
    for (let y = 0, i = 0; y < height; y++) {
      for (let x = 0; x < width; x++, i++) {
        lengthInv[i] = 1 / Math.hypot(1, xs[x], ys[y]);
      }
    }
    return {
      canvas,
      context,
      pixels,
      aspect,
      fov,
      xs,
      ys,
      lengthInv,
      pitch: NaN,
      yawOffset: NaN,
      rows: new Uint32Array(width * height),
      columns: new Uint16Array(width * height),
      output: new Uint32Array(pixels.data.buffer),
    };
  }
  function tilt(p, pitch) {
    const cosine = Math.cos(pitch),
      sine = Math.sin(pitch);
    const width = image.naturalWidth,
      height = image.naturalHeight;
    for (let y = 0, i = 0; y < p.ys.length; y++) {
      const rayZ = cosine - p.ys[y] * sine;
      const rayY = sine + p.ys[y] * cosine;
      for (let x = 0; x < p.xs.length; x++, i++) {
        const latitude = Math.asin(Math.max(-1, Math.min(1, rayY * p.lengthInv[i])));
        const v = Math.max(0, Math.min(height - 1, Math.floor((0.5 - latitude / Math.PI) * height)));
        p.rows[i] = v * width;
        p.columns[i] = Math.round((0.5 + Math.atan2(p.xs[x], rayZ) / TAU) * width);
      }
    }
    p.pitch = pitch;
    p.yawOffset = NaN;
  }
  function draw(context, width, height, yaw, pitch = 0, fovY = 1.08) {
    if (!width || !height || !readSource()) return false;
    const scale = Math.min(1, 500 / width, 280 / height);
    const sampleWidth = Math.max(2, Math.round(width * scale));
    const sampleHeight = Math.max(2, Math.round(height * scale));
    const aspect = width / height;
    if (
      !projection ||
      projection.canvas.width !== sampleWidth ||
      projection.canvas.height !== sampleHeight ||
      projection.aspect !== aspect ||
      projection.fov !== fovY
    ) {
      projection = makeProjection(sampleWidth, sampleHeight, aspect, fovY);
    }
    const p = projection;
    if (!Number.isFinite(p.pitch) || Math.abs(pitch - p.pitch) > 0.001) tilt(p, pitch);
    const widthMask = image.naturalWidth - 1; // Power-of-two texture, horizontal wrap.
    const offset = Math.round((yaw * image.naturalWidth) / TAU) & widthMask;
    if (p.yawOffset !== offset) {
      for (let i = 0; i < p.output.length; i++) {
        p.output[i] = source[p.rows[i] + ((p.columns[i] + offset) & widthMask)];
      }
      p.context.putImageData(p.pixels, 0, 0);
      p.yawOffset = offset;
    }
    context.drawImage(p.canvas, 0, 0, width, height);
    return true;
  }
  return { image, ready, draw };
}
