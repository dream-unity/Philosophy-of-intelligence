// A transparent luminance patina leaves heraldry, gold leaf and stained glass
// intact. Canvas receives one small repeatable tile instead of copies per wall.
export function stonePatina(im, ctx) {
  if (!im?.complete || !im.naturalWidth) return null;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 96;
  const tile = cv.getContext('2d', { willReadFrequently: true });
  tile.drawImage(im, 0, 0, 96, 96);
  const pixels = tile.getImageData(0, 0, 96, 96),
    bytes = pixels.data;
  let mean = 0;
  for (let i = 0; i < bytes.length; i += 4)
    mean += bytes[i] * 0.26 + bytes[i + 1] * 0.59 + bytes[i + 2] * 0.15;
  mean /= 96 * 96;
  for (let i = 0; i < bytes.length; i += 4) {
    const v = bytes[i] * 0.26 + bytes[i + 1] * 0.59 + bytes[i + 2] * 0.15 - mean;
    bytes[i] = bytes[i + 1] = bytes[i + 2] = v >= 0 ? 243 : 31;
    bytes[i + 3] = Math.min(126, Math.abs(v) * 2.1);
  }
  tile.putImageData(pixels, 0, 0);
  return ctx.createPattern(cv, 'repeat');
}
export function paintPatina(ctx, pattern, triangle, tex) {
  if (!pattern?.setTransform || typeof DOMMatrix === 'undefined') return;
  const [[u0, v0], [u1, v1], [u2, v2]] = tex,
    uvx = u1 - u0,
    uvy = v1 - v0,
    uwx = u2 - u0,
    uwy = v2 - v0;
  const det = uvx * uwy - uvy * uwx;
  if (Math.abs(det) < 0.0001) return;
  const [a, b, c] = triangle,
    ex = b[0] - a[0],
    ey = b[1] - a[1],
    fx = c[0] - a[0],
    fy = c[1] - a[1];
  const A = (ex * uwy - fx * uvy) / det,
    B = (ey * uwy - fy * uvy) / det,
    C = (fx * uvx - ex * uwx) / det,
    D = (fy * uvx - ey * uwx) / det;
  // A receding wall can project a single texel over thousands of backing
  // pixels at the near plane. At this grazing angle the pigment is unresolved.
  const sx = Math.hypot(A, B),
    sy = Math.hypot(C, D),
    area = Math.abs(A * D - B * C);
  if (sx < 0.075 || sy < 0.075 || sx > 4 || sy > 4 || area / (sx * sy) < 0.19) return false;
  const matrix = new DOMMatrix();
  matrix.a = A;
  matrix.b = B;
  matrix.c = C;
  matrix.d = D;
  matrix.e = a[0] - A * u0 - C * v0;
  matrix.f = a[1] - B * u0 - D * v0;
  pattern.setTransform(matrix);
  ctx.fillStyle = pattern;
  ctx.fill();
  return true;
}
