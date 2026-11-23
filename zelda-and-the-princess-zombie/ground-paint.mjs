// Ground is sampled in world metres. Each horizontal band is one affine Canvas
// pattern blit. Mip levels filter the leaves and pebbles into a distant haze.
import { roadX, trailX, terrainHeight } from './world.mjs';

const tileMetres = 5;
const colours = ['#536044', '#81694c'];
const tileSizes = [256, 128, 64, 32, 16];

function makeTiles(image) {
  return [0, 1].map((material) =>
    tileSizes.map((size) => {
      const tile = document.createElement('canvas');
      tile.width = tile.height = size;
      const context = tile.getContext('2d');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, material * 512, 0, 512, 512, 0, 0, size, size);
      return tile;
    })
  );
}

function roadShape(p, eye, width, height, route, halfWidth) {
  const shape = new Path2D(),
    sy = Math.sin(p.yaw),
    cy = Math.cos(p.yaw);
  const sp = Math.sin(p.pitch || 0),
    cp = Math.cos(p.pitch || 0),
    f = height * 0.685;
  const project = (x, z) => {
    const dx = x - p.x,
      dz = z - p.z,
      h = terrainHeight(x, z) - eye + 0.07;
    const front = dx * sy + dz * cy;
    return { side: dx * cy - dz * sy, up: h * cp - front * sp, depth: front * cp + h * sp };
  };
  function polygon(points) {
    const clipped = [];
    for (let j = 0; j < points.length; j++) {
      const a = points[(j + points.length - 1) % points.length],
        b = points[j];
      if (a.depth > 0.15 !== b.depth > 0.15) {
        const t = (0.15 - a.depth) / (b.depth - a.depth);
        clipped.push({ side: a.side + (b.side - a.side) * t, up: a.up + (b.up - a.up) * t, depth: 0.15 });
      }
      if (b.depth > 0.15) clipped.push(b);
    }
    if (clipped.length < 3) return;
    clipped.forEach((v, i) => {
      const x = width * 0.5 + (v.side * f) / v.depth,
        y = height * 0.5 - (v.up * f) / v.depth;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    shape.closePath();
  }
  const edge = (x, z, side) => {
    // Meandering edges break up the transition without changing the route.
    const verge = halfWidth * (1 + 0.044 * Math.sin(z * 0.91 + side) + 0.07 * Math.sin(z * 0.29 - side));
    return project(x + side * verge, z);
  };
  const start = Math.max(-145, Math.floor((p.z - 205) / 4) * 4),
    end = Math.min(1434, p.z + 305);
  if (start >= end) return shape;
  let left = edge(route(start), start, -1),
    right = edge(route(start), start, 1);
  for (let z = start; z < end; ) {
    const dz = Math.abs(z - p.z) < 16 ? 1 : Math.abs(z - p.z) < 60 ? 3 : 10,
      n = Math.min(z + dz, end),
      x = route(n);
    const nextL = edge(x, n, -1),
      nextR = edge(x, n, 1);
    polygon([left, nextL, nextR, right]);
    left = nextL;
    right = nextR;
    z = n;
  }
  return shape;
}

export function createGroundPainter() {
  let tiles = null,
    loaded = false,
    active = true,
    patternContext = null,
    patterns = null;
  let lastView = null,
    cached = false,
    stillFrame = null;
  const atlas = new Image();
  atlas.onload = () => {
    if (active) {
      tiles = makeTiles(atlas);
      loaded = true;
    }
  };
  atlas.src = new URL('./woodland-ground.webp', import.meta.url).href;
  const matrix = typeof DOMMatrix === 'function' ? new DOMMatrix() : null;
  function paintBands(ctx, width, height, p, horizon, eye) {
    const sp = Math.sin(p.pitch || 0),
      cp = Math.cos(p.pitch || 0);
    const sy = Math.sin(p.yaw),
      cy = Math.cos(p.yaw),
      f = height * 0.685,
      cx = width / 2,
      gy = terrainHeight(p.x, p.z);
    if (horizon > height + height * 0.07) return;
    const startY = Math.max(0, Math.floor(horizon) - 1);
    if (loaded && ctx !== patternContext) {
      patternContext = ctx;
      patterns = tiles.map((levels) => levels.map((tile) => ctx.createPattern(tile, 'repeat')));
    }
    const usable = Boolean(patterns?.[0]?.[0]?.setTransform && matrix);
    const road = roadShape(p, eye, width, height, roadX, 5.4),
      trail = roadShape(p, eye, width, height, trailX, 1.15);
    ctx.save();
    ctx.fillStyle = colours[0];
    ctx.fillRect(0, startY, width, height - startY);
    const bands = [];
    if (usable) {
      // At grazing angles there are hundreds of metres per pixel. The mist and
      // the coarsest mip suffice there, so texture bands begin closer in.
      const first = Math.max(startY, Math.floor(horizon + f * 0.006));
      const sampleY = (screenY) => {
        const vertical = (height * 0.5 - screenY) / f,
          rayUp = sp + vertical * cp,
          rayForward = cp - vertical * sp;
        if (rayUp >= -0.0001) return { depth: 140, forward: 140 };
        const depth = Math.max(0.05, Math.min(180, (gy - eye) / rayUp)),
          forward = depth * rayForward;
        return { depth, forward };
      };
      const band = Math.max(3, Math.ceil(height / 109));
      for (let y = first; y < height; y += band) {
        const n = Math.min(height, y + band),
          mid = (y + n) * 0.5,
          b = sampleY(mid),
          after = sampleY(mid + 1);
        const change = after.forward - b.forward,
          side = b.depth / f;
        if (Math.abs(change) < 0.00001) continue;
        const screenTile = tileMetres / side;
        let level = 0;
        while (level < tileSizes.length - 1 && tileSizes[level] > screenTile * 1.6) level++;
        const units = tileSizes[level] / tileMetres;
        const a = cy * side * units,
          bx = -sy * side * units,
          c = sy * change * units,
          d = cy * change * units;
        const det = a * d - bx * c;
        if (Math.abs(det) < 1e-8) continue;
        const u = (p.x + sy * b.forward) * units - a * cx - c * mid;
        const v = (p.z + cy * b.forward) * units - bx * cx - d * mid;
        bands.push({
          y,
          n,
          level,
          a: d / det,
          b: -bx / det,
          c: -c / det,
          d: a / det,
          e: (c * v - d * u) / det,
          f: (bx * u - a * v) / det,
          alpha: Math.max(0, Math.min(1, (102 - b.forward) / 62)),
        });
      }
    }
    function material(id, opacity) {
      for (const b of bands) {
        const pat = patterns[id][b.level];
        if (!pat || b.alpha <= 0.015) continue;
        matrix.a = b.a;
        matrix.b = b.b;
        matrix.c = b.c;
        matrix.d = b.d;
        matrix.e = b.e;
        matrix.f = b.f;
        pat.setTransform(matrix);
        ctx.fillStyle = pat;
        ctx.globalAlpha = b.alpha * opacity;
        ctx.fillRect(0, b.y, width, b.n - b.y + 0.08);
      }
      ctx.globalAlpha = 1;
    }
    if (usable) material(0, 1);
    for (const [path, opacity] of [
      [road, 1],
      [trail, 0.64],
    ]) {
      ctx.save();
      ctx.clip(path);
      ctx.globalAlpha = opacity;
      ctx.fillStyle = colours[1];
      ctx.fillRect(0, 0, width, height);
      if (usable) material(1, opacity);
      ctx.restore();
    }
    ctx.restore();
  }
  function paint(ctx, width, height, p, horizon, eye) {
    const same =
      lastView &&
      lastView.width === width &&
      lastView.height === height &&
      lastView.x === p.x &&
      lastView.z === p.z &&
      lastView.yaw === p.yaw &&
      lastView.pitch === p.pitch &&
      lastView.eye === eye &&
      lastView.horizon === horizon &&
      lastView.loaded === loaded;
    if (!same) {
      lastView = { width, height, x: p.x, z: p.z, yaw: p.yaw, pitch: p.pitch, eye, horizon, loaded };
      cached = false;
      paintBands(ctx, width, height, p, horizon, eye);
      return;
    }
    if (!cached) {
      if (!stillFrame) stillFrame = document.createElement('canvas');
      if (stillFrame.width !== width || stillFrame.height !== height) {
        stillFrame.width = width;
        stillFrame.height = height;
      }
      const cache = stillFrame.getContext('2d');
      cache.clearRect(0, 0, width, height);
      paintBands(cache, width, height, p, horizon, eye);
      cached = true;
    }
    ctx.drawImage(stillFrame, 0, 0);
  }
  function dispose() {
    active = false;
    atlas.onload = null;
    tiles = null;
    patterns = null;
    patternContext = null;
    stillFrame = null;
  }
  return { paint, dispose };
}
