// Each spoken offer has its own illustrated gesture. Move the painted objects around
// their actual hinge points so the lantern, glass, moth and fingers keep their silhouettes.
const artURL = new URL('./story-witch.webp', import.meta.url).href;
const cloth = (x, y, cx, cy, rx, ry) => Math.exp(-(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2) * 1.65);
export function witchWarp(beat, x, y, time) {
  if (x === 0 || x === 1 || y === 0 || y === 1) return [x, y];
  const oscillation = Math.sin(time * 1.72);
  let dx = 0,
    dy = 0;
  if (beat === 0) {
    // The hook is the pivot; the brass base travels farther than the raised knuckles.
    const lantern = cloth(x, y, 0.246, 0.61, 0.24, 0.39);
    dx = oscillation * 0.03 * lantern * (y - 0.13);
    dy = oscillation * 0.012 * lantern * (x - 0.22);
  } else if (beat === 1) {
    // Two small taps bring the outer bottles against the centre phial and back.
    const taps =
      Math.pow(Math.max(0, Math.sin(time * 2.1)), 7) +
      0.43 * Math.pow(Math.max(0, Math.sin(time * 2.1 - 0.48)), 9);
    const outer = cloth(x, y, 0.39, 0.6, 0.13, 0.34) - cloth(x, y, 0.59, 0.6, 0.13, 0.34);
    dx = 0.012 * taps * outer;
    dy = -0.006 * taps * cloth(x, y, 0.5, 0.52, 0.3, 0.37);
  } else if (beat === 2) {
    const wing = cloth(x, y, 0.319, 0.307, 0.084, 0.116),
      fold = 0.5 + 0.5 * Math.sin(time * 1.9);
    dx = fold * 0.017 * wing;
    dy = -fold * 0.012 * wing;
  } else {
    const palm = cloth(x, y, 0.65, 0.48, 0.2, 0.18),
      raise = 0.5 + 0.5 * Math.sin(time * 1.12);
    dy = -0.019 * raise * palm;
    dx = 0.01 * raise * palm;
  }
  return [x + dx, y + dy];
}
let art;
function source() {
  if (!art) {
    art = new Image();
    art.decoding = 'async';
    art.src = artURL;
  }
  return art;
}
function frame(ctx, img, beat, time, still) {
  const w = ctx.canvas.width,
    h = ctx.canvas.height,
    sw = img.naturalWidth / 2,
    sh = img.naturalHeight / 2,
    sx = (beat % 2) * sw,
    sy = (beat >> 1) * sh;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  if (still) return;
  // A small patch of the plate bends. The original plate supplies pixels beyond its edge.
  const bounds = [
    [0.025, 0.045, 0.5, 0.94],
    [0.2, 0.23, 0.83, 0.84],
    [0.17, 0.17, 0.46, 0.47],
    [0.43, 0.37, 0.8, 0.66],
  ][beat];
  const [left, top, right, bottom] = bounds,
    cols = 6,
    rows = 5,
    points = [];
  for (let row = 0; row <= rows; row++) {
    const line = [];
    for (let col = 0; col <= cols; col++) {
      const u = left + ((right - left) * col) / cols,
        v = top + ((bottom - top) * row) / rows;
      const [x, y] =
        row === 0 || col === 0 || row === rows || col === cols ? [u, v] : witchWarp(beat, u, v, time);
      line.push({ u: u * w, v: v * h, x: x * w, y: y * h });
    }
    points.push(line);
  }
  function triangle(a, b, c) {
    const du = b.u - a.u,
      dv = b.v - a.v,
      eu = c.u - a.u,
      ev = c.v - a.v,
      det = du * ev - dv * eu;
    const dx = b.x - a.x,
      dy = b.y - a.y,
      ex = c.x - a.x,
      ey = c.y - a.y;
    const A = (dx * ev - ex * dv) / det,
      B = (dy * ev - ey * dv) / det,
      C = (ex * du - dx * eu) / det,
      D = (ey * du - dy * eu) / det;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.closePath();
    ctx.clip();
    ctx.setTransform(A, B, C, D, a.x - A * a.u - C * a.v, a.y - B * a.u - D * a.v);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    ctx.restore();
  }
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const a = points[row][col],
        b = points[row][col + 1],
        c = points[row + 1][col],
        d = points[row + 1][col + 1];
      triangle(a, b, c);
      triangle(c, b, d);
    }
}
export function witchVignette(
  beat,
  description,
  reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
) {
  const holder = document.createElement('figure'),
    canvas = document.createElement('canvas'),
    label = document.createElement('figcaption');
  holder.className = 'witch-vignette';
  holder.style.cssText =
    'display:grid;grid-template-columns:clamp(5.5rem,23vw,9.3rem) minmax(0,1fr);align-items:center;gap:clamp(.65rem,2vw,1.2rem);margin:1.15rem 0 .4rem';
  label.textContent = description;
  label.className = 'stage-direction';
  label.style.margin = '0';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.width = 272;
  canvas.height = 204;
  canvas.style.cssText =
    'display:block;width:100%;height:auto;border:1px solid #8f7950;border-radius:2px;background-size:200% 200%;background-color:#39382d';
  canvas.style.backgroundImage = `url("${artURL}")`;
  canvas.style.backgroundPosition = `${(beat % 2) * 100}% ${(beat >> 1) * 100}%`;
  holder.append(canvas, label);
  const ctx = canvas.getContext('2d'),
    img = source();
  if (!ctx) return holder;
  let busy = false,
    observer,
    start = 0,
    last = 0,
    queued = false;
  const draw = (now) => {
    queued = false;
    if (!holder.isConnected) {
      observer?.disconnect();
      return;
    }
    if (!busy || !img.complete || !img.naturalWidth) return;
    if (!start) start = now;
    if (now - last >= 66 || !last) {
      frame(ctx, img, beat, (now - start) / 1000, reduceMotion);
      last = now;
    }
    if (!reduceMotion && now - start < 9300) render();
  };
  const render = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(draw);
    }
  };
  if (globalThis.IntersectionObserver) {
    observer = new IntersectionObserver(([entry]) => {
      busy = entry.isIntersecting;
      if (busy) {
        start = 0;
        last = 0;
        render();
      } else if (!holder.isConnected) observer.disconnect();
    });
    observer.observe(holder);
  } else {
    busy = true;
    render();
  }
  if (!img.complete)
    img.addEventListener(
      'load',
      () => {
        if (busy) render();
      },
      { once: true }
    );
  return holder;
}
