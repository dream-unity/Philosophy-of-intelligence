// Queue individual depth-sorted texture triangles. Four corners are fixed in the world,
// so turning in place reprojects the same bole, bough tips and gaps between the leaves.
export function queueLeafFace(queue, ray, corners, image, base, W, H, opacity = 1) {
  const iw = image.naturalWidth || image.width,
    ih = image.naturalHeight || image.height;
  const points = corners.map((p) => ray(p[0], base + p[1], p[2]));
  if (points.every(Boolean)) {
    const [bl, br, tr, tl] = points;
    if (
      Math.max(bl[0], br[0], tr[0], tl[0]) < 0 ||
      Math.min(bl[0], br[0], tr[0], tl[0]) > W ||
      Math.max(bl[1], br[1], tr[1], tl[1]) < 0 ||
      Math.min(bl[1], br[1], tr[1], tl[1]) > H
    )
      return;
    const u0 = corners[3][3] * iw,
      v0 = corners[3][4] * ih,
      u1 = corners[2][3] * iw,
      v1 = corners[0][4] * ih;
    const rx = (tr[0] - tl[0] + br[0] - bl[0]) * 0.5,
      ry = (tr[1] - tl[1] + br[1] - bl[1]) * 0.5;
    const bx = (bl[0] - tl[0] + br[0] - tr[0]) * 0.5,
      by = (bl[1] - tl[1] + br[1] - tr[1]) * 0.5;
    const err = Math.hypot(tr[0] - tl[0] - rx, tr[1] - tl[1] - ry);
    // Project small/deep patches with their four-corner average; keep large nearby roots exact.
    if (
      Math.abs(rx * by - ry * bx) > 0.25 &&
      (Math.max(bl[2], br[2], tr[2], tl[2]) > 32 ||
        (err < 1.8 && Math.abs(ry) < Math.abs(by) * 0.12 && Math.abs(bx) < Math.abs(rx) * 0.15))
    ) {
      const w = Math.abs(rx),
        h = Math.abs(by);
      if (w < 0.65 || h < 0.7) return;
      const cx = (tl[0] + bl[0] + br[0] + tr[0]) * 0.25,
        cy = (tl[1] + bl[1] + br[1] + tr[1]) * 0.25;
      const flip = rx < 0 !== u1 < u0;
      queue.push({
        d: (bl[2] + br[2] + tr[2] + tl[2]) * 0.25,
        draw(ctx) {
          if (!flip && opacity === 1) {
            ctx.drawImage(image, Math.min(u0, u1), v0, Math.abs(u1 - u0), v1 - v0, cx - w * 0.5, cy - h * 0.5, w, h);
          } else {
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.translate(cx, cy);
            if (flip) ctx.scale(-1, 1);
            ctx.drawImage(image, Math.min(u0, u1), v0, Math.abs(u1 - u0), v1 - v0, -w * 0.5, -h * 0.5, w, h);
            ctx.restore();
          }
        },
      });
      return;
    }
  }
  for (const [i, j, k] of [
    [0, 1, 2],
    [0, 2, 3],
  ]) {
    const a = points[i],
      b = points[j],
      c = points[k];
    if (
      !a ||
      !b ||
      !c ||
      Math.max(a[0], b[0], c[0]) < 0 ||
      Math.min(a[0], b[0], c[0]) > W ||
      Math.max(a[1], b[1], c[1]) < 0 ||
      Math.min(a[1], b[1], c[1]) > H
    )
      continue;
    const u = corners[i][3] * iw,
      v = corners[i][4] * ih,
      du = corners[j][3] * iw - u,
      dv = corners[j][4] * ih - v,
      eu = corners[k][3] * iw - u,
      ev = corners[k][4] * ih - v;
    const det = du * ev - dv * eu;
    if (Math.abs(det) < 0.001) continue;
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      ex = c[0] - a[0],
      ey = c[1] - a[1];
    if (Math.abs(dx * ey - ex * dy) < 0.45) continue;
    const A = (dx * ev - ex * dv) / det,
      B = (dy * ev - ey * dv) / det,
      C = (ex * du - dx * eu) / det,
      D = (ey * du - dy * eu) / det;
    queue.push({
      d: (a[2] + b[2] + c[2]) / 3,
      draw(ctx) {
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.lineTo(c[0], c[1]);
        ctx.closePath();
        ctx.clip();
        ctx.transform(A, B, C, D, a[0] - A * u - C * v, a[1] - B * u - D * v);
        ctx.drawImage(image, 0, 0);
        ctx.restore();
      },
    });
  }
}
export function distantTreeFace(t, eyeX, eyeZ, ratio) {
  const dx = t.x - eyeX,
    dz = t.z - eyeZ,
    dist = Math.hypot(dx, dz) || 1,
    half = t.h * ratio * (t.w || 0.88) * 0.5;
  const ax = (dz / dist) * half,
    az = (-dx / dist) * half,
    u = t.seed % 2 === 0 ? 1 : 0;
  return [
    [t.x - ax, 0, t.z - az, u, 1],
    [t.x + ax, 0, t.z + az, 1 - u, 1],
    [t.x + ax, t.h, t.z + az, 1 - u, 0],
    [t.x - ax, t.h, t.z - az, u, 0],
  ];
}
