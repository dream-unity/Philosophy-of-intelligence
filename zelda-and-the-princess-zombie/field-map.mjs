import { MAP, LANDMARKS, terrainHeight, roadX, hordePosition, HORDE_COUNT } from './world.mjs';

// The longer edge always follows the journey. Rotating the survey on a wide
// display preserves distances; the rose and player bearing rotate with it.
function projection(w, h, world) {
  const wide = w > h,
    margin = Math.min(20, w * 0.04, h * 0.06);
  const fullWidth = MAP.maxX - MAP.minX,
    rangeZ = MAP.maxZ - MAP.minZ;
  let rangeX = fullWidth,
    centerX = (MAP.minX + MAP.maxX) / 2;
  if (wide && w / h > 2.15) {
    const visible = MAP.road.map(([x]) => x);
    visible.push(world.player.x);
    if (world.hasMap) visible.push(...MAP.trail.map(([x]) => x));
    if (world.milestones.ridge) {
      for (let i = 0; i < HORDE_COUNT; i += 31) visible.push(hordePosition(world, i).x);
    }
    const left = Math.max(MAP.minX, Math.min(...visible) - 55),
      right = Math.min(MAP.maxX, Math.max(...visible) + 55);
    const bestWidth = ((h - 2 * margin) * rangeZ) / (w - 2 * margin);
    rangeX = Math.min(fullWidth, Math.max(bestWidth, right - left));
    centerX = clamp((left + right) / 2, MAP.minX + rangeX / 2, MAP.maxX - rangeX / 2);
  }
  const scale = Math.min(
    (w - 2 * margin) / (wide ? rangeZ : rangeX),
    (h - 2 * margin) / (wide ? rangeX : rangeZ)
  );
  const centerZ = (MAP.minZ + MAP.maxZ) / 2;
  return {
    w,
    h,
    wide,
    scale,
    angle: wide ? Math.PI / 2 : 0,
    point(x, z) {
      return wide
        ? [w / 2 + (z - centerZ) * scale, h / 2 + (x - centerX) * scale]
        : [w / 2 + (x - centerX) * scale, h / 2 - (z - centerZ) * scale];
    },
    world(px, py) {
      return wide
        ? [centerX + (py - h / 2) / scale, centerZ + (px - w / 2) / scale]
        : [centerX + (px - w / 2) / scale, centerZ - (py - h / 2) / scale];
    },
  };
}
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
function seedGenerator(s) {
  return () => (s = (1664525 * s + 1013904223) >>> 0) / 4294967296;
}
function path(g, points, ink, width, fill) {
  if (!points.length) return;
  g.beginPath();
  g.moveTo(...points[0]);
  for (let i = 1; i < points.length; i++) g.lineTo(...points[i]);
  if (fill) {
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  }
  if (ink) {
    g.strokeStyle = ink;
    g.lineWidth = width;
    g.stroke();
  }
}
function dot(g, x, y, r, color) {
  g.beginPath();
  g.arc(x, y, r, 0, 2 * Math.PI);
  g.fillStyle = color;
  g.fill();
}
function wooded(x, z) {
  if (z > 1420 || Math.abs(z - 1021) < 19 || (z > 1140 && z < 1400 && Math.abs(x + 170) < 215)) return 0;
  const groves =
    0.55 +
    0.2 * Math.sin(x * 0.021 + z * 0.017) +
    0.19 * Math.sin(z * 0.045 - x * 0.01) +
    0.16 * Math.cos(x * 0.038 - z * 0.021);
  return groves * (z < 875 ? 1 : z < 1115 ? 0.7 : 0.4) * clamp((Math.abs(x - roadX(z)) - 10) / 38, 0, 1);
}
const madeCanvas = () =>
  typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(1, 1) : document.createElement('canvas');
function wash(g, map) {
  const layer = madeCanvas(),
    resolution = Math.min(1, 330 / Math.max(map.w, map.h));
  layer.width = Math.max(1, Math.round(map.w * resolution));
  layer.height = Math.max(1, Math.round(map.h * resolution));
  const brush = layer.getContext('2d'),
    pixels = brush.createImageData(layer.width, layer.height),
    random = seedGenerator(67079);
  for (let j = 0; j < layer.height; j++) {
    for (let i = 0; i < layer.width; i++) {
      const [x, z] = map.world(i / resolution, j / resolution),
        e = terrainHeight(x, z);
      const relief = (terrainHeight(x - 9, z + 11) - e) * 1.8;
      const canopy = wooded(x, z),
        mottle = Math.sin(x * 0.046 + z * 0.014) * 1.6 + Math.sin(z * 0.036 - x * 0.053) * 1.2;
      const weather = (random() - 0.5) * 9 + mottle + relief;
      const edge = Math.min(
        i / layer.width,
        (layer.width - i) / layer.width,
        j / layer.height,
        (layer.height - j) / layer.height
      );
      const dark = clamp(1 - edge * 7, 0, 1) * 12,
        idx = (j * layer.width + i) * 4;
      pixels.data[idx] = 231 - 40 * canopy + weather - dark;
      pixels.data[idx + 1] = 216 - 21 * canopy + weather - dark;
      pixels.data[idx + 2] = 177 - 23 * canopy + weather - dark;
      pixels.data[idx + 3] = 255;
    }
  }
  brush.putImageData(pixels, 0, 0);
  g.drawImage(layer, 0, 0, map.w, map.h);
}
function contourSurvey(g, map) {
  // March a survey grid through real terrain heights at surveyed intervals.
  const step = 25,
    minX = MAP.minX - 90,
    minZ = MAP.minZ - 90;
  const nx = Math.ceil((MAP.maxX + 90 - minX) / step) + 1,
    nz = Math.ceil((MAP.maxZ + 90 - minZ) / step) + 1;
  const heights = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) heights[j * nx + i] = terrainHeight(minX + i * step, minZ + j * step);
  for (const level of [-3.5, -1.75, 1.75, 3.5, 5.25, 7, 8.75, 10.5, 12.25, 14, 15.75, 17.5, 19.25]) {
    g.beginPath();
    for (let j = 0; j < nz - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        const s = j * nx + i,
          a = heights[s],
          b = heights[s + 1],
          c = heights[s + nx + 1],
          d = heights[s + nx];
        if (level <= Math.min(a, b, c, d) || level >= Math.max(a, b, c, d)) continue;
        const x = minX + i * step,
          z = minZ + j * step,
          points = [];
        if (a < level !== b < level) points.push(map.point(x + (step * (level - a)) / (b - a), z));
        if (b < level !== c < level) points.push(map.point(x + step, z + (step * (level - b)) / (c - b)));
        if (c < level !== d < level) points.push(map.point(x + (step * (level - d)) / (c - d), z + step));
        if (d < level !== a < level) points.push(map.point(x, z + (step * (level - a)) / (d - a)));
        for (let k = 1; k < points.length; k += 2) {
          g.moveTo(...points[k - 1]);
          g.lineTo(...points[k]);
        }
      }
    const major = Number.isInteger(level / 3.5);
    g.strokeStyle = major ? 'rgba(99,84,51,.36)' : 'rgba(99,84,51,.23)';
    g.lineWidth = major ? 0.85 : 0.6;
    g.stroke();
  }
}
function woods(g, map) {
  const r = seedGenerator(4622),
    trees = [],
    small = clamp(map.scale * 17, 2.1, 5.2);
  for (let z = MAP.minZ - 60; z < MAP.maxZ; z += 36)
    for (let x = MAP.minX - 60; x < MAP.maxX + 60; x += 35) {
      const xx = x + r() * 31,
        zz = z + r() * 32;
      if (r() >= wooded(xx, zz) * 0.9) continue;
      const [px, py] = map.point(xx, zz);
      trees.push([px, py, small * (0.82 + 0.39 * r()), r() > 0.63 && zz < 1020]);
    }
  trees.sort((a, b) => a[1] - b[1]);
  for (const [x, y, s, oak] of trees) {
    if (oak) {
      g.beginPath();
      g.moveTo(x - s * 0.77, y + 0.25 * s);
      g.bezierCurveTo(x - s * 1.4, y - 0.43 * s, x - s * 0.62, y - 0.81 * s, x - s * 0.4, y - 0.62 * s);
      g.bezierCurveTo(x - s * 0.23, y - 1.21 * s, x + s * 0.53, y - 1.15 * s, x + s * 0.47, y - 0.61 * s);
      g.bezierCurveTo(x + s * 1.25, y - 0.63 * s, x + s * 1.1, y + 0.34 * s, x + s * 0.55, y + 0.38 * s);
      g.quadraticCurveTo(x, y + 0.76 * s, x - s * 0.77, y + 0.25 * s);
      g.fillStyle = '#a5ac84';
      g.fill();
      g.strokeStyle = 'rgba(67,86,63,.62)';
      g.lineWidth = 0.65;
      g.stroke();
      path(
        g,
        [
          [x, y + 0.9 * s],
          [x, y + 0.06 * s],
          [x + 0.34 * s, y - 0.25 * s],
        ],
        'rgba(60,76,58,.67)',
        0.65
      );
      continue;
    }
    path(
      g,
      [
        [x - 0.15 * s, y + s],
        [x, y - 0.8 * s],
        [x - 0.8 * s, y + 0.5 * s],
        [x, y + 0.31 * s],
        [x + 0.65 * s, y + 0.54 * s],
        [x, y - 0.8 * s],
      ],
      'rgba(59,79,64,.64)',
      0.65,
      '#acb38b'
    );
    dot(g, x - 0.9 * s, y + 0.83 * s, 0.55, '#838c6a');
  }
}
function water(g, map) {
  // The river spans the region, with the same narrow channel and banks as the 3D view.
  const outline = [],
    opposite = [];
  for (let x = MAP.minX - 180; x <= MAP.maxX + 180; x += 15) {
    const ripple = Math.sin(x * 0.023) * 1.1 + Math.sin(x * 0.066) * 0.55;
    outline.push(map.point(x, 1009 + ripple));
    opposite.push(map.point(x, 1034 + ripple));
  }
  path(g, [...outline, ...opposite.reverse()], '#667e78', 0.95, '#91aaa0');
  for (let x = MAP.minX - 60; x < MAP.maxX + 60; x += 46) {
    const z = 1018 + 3 * Math.sin(x);
    path(g, [map.point(x, z), map.point(x + 13, z + 1)], '#c3cdb4', 0.85);
  }
}
function marker(g, id, x, y, scale = 1) {
  g.save();
  g.translate(x, y);
  g.scale(scale, scale);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  const ink = '#51432e',
    paper = '#ecdbad',
    wash = '#b79b61';
  if (id === 'gate') {
    path(
      g,
      [
        [-11, 2],
        [-11, -7],
        [-12, -7],
        [-9, -14],
        [-6, -7],
        [-7, -7],
        [-7, -4],
        [-3, -4],
        [-3, -12],
        [-4, -12],
        [0, -19],
        [4, -12],
        [3, -12],
        [3, -4],
        [7, -4],
        [7, -7],
        [6, -7],
        [9, -14],
        [12, -7],
        [11, -7],
        [11, 2],
      ],
      ink,
      1.3,
      paper
    );
    path(
      g,
      [
        [-3, 2],
        [-3, -2],
        [0, -5],
        [3, -2],
        [3, 2],
      ],
      ink,
      0.9,
      wash
    );
    for (const tx of [-9, 0, 9])
      path(
        g,
        [
          [tx, -6],
          [tx, -4],
        ],
        ink,
        1.25
      );
    path(
      g,
      [
        [-14, 3],
        [-6, 2],
        [1, 3],
        [13, 3],
      ],
      ink,
      0.9
    );
  } else if (id === 'ridge') {
    path(
      g,
      [
        [-11, 3],
        [-4, -8],
        [0, -3],
        [4, -12],
        [13, 3],
      ],
      ink,
      1.1,
      paper
    );
    path(
      g,
      [
        [-4, -8],
        [-2, -2],
        [-4, -3],
        [0, 2],
        [4, -12],
        [6, -4],
        [4, -5],
        [9, 2],
      ],
      ink,
      0.8
    );
  } else if (id === 'clearing') {
    for (const [tx, ty, size] of [
      [-4, 0, 5],
      [4, -1, 5],
      [0, -3, 7],
    ]) {
      path(
        g,
        [
          [tx, ty - size],
          [tx - size * 0.66, ty + 1],
          [tx + size * 0.66, ty + 1],
        ],
        ink,
        0.9,
        '#879674'
      );
      path(
        g,
        [
          [tx, ty + 1],
          [tx, ty + 4],
        ],
        ink,
        1
      );
    }
  } else if (id === 'bells') {
    path(
      g,
      [
        [-6, 4],
        [-5, -6],
        [5, -6],
        [6, 4],
      ],
      ink,
      1.1
    );
    path(
      g,
      [
        [-7, -6],
        [0, -10],
        [7, -6],
      ],
      ink,
      1,
      paper
    );
    path(
      g,
      [
        [-2, -5],
        [-3, 0],
        [-4, 1],
        [4, 1],
        [3, 0],
        [2, -5],
      ],
      ink,
      0.8,
      wash
    );
    dot(g, 0, 2, 1, ink);
  } else if (id === 'chapel') {
    path(
      g,
      [
        [0, -9],
        [-4, -2],
        [-3, 1],
        [0, 3],
        [3, 1],
        [4, -2],
      ],
      ink,
      1.1,
      '#9cb4a6'
    );
    path(
      g,
      [
        [-6, 5],
        [0, 6],
        [6, 5],
      ],
      ink,
      0.8
    );
  } else if (id === 'ford') {
    for (const [dx, dy] of [
      [-3, 3],
      [0, 0],
      [3, -3],
    ])
      dot(g, dx, dy, 1.45, ink);
  } else {
    dot(g, 0, 0, 2.7, ink);
    dot(g, 0, 0, 1.15, paper);
  }
  g.restore();
}
function rose(g, x, y, angle, s) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.strokeStyle = '#826f4d';
  g.lineWidth = 0.65;
  g.beginPath();
  g.arc(0, 0, s * 0.59, 0, 2 * Math.PI);
  g.stroke();
  for (let i = 0; i < 4; i++) {
    g.save();
    g.rotate((i * Math.PI) / 2);
    path(
      g,
      [
        [0, -s],
        [s * 0.19, 0],
        [0, s * 0.12],
      ],
      '#68573b',
      0.7,
      i === 0 ? '#494c38' : '#8a7855'
    );
    path(
      g,
      [
        [0, -s],
        [-s * 0.19, 0],
        [0, s * 0.12],
      ],
      '#68573b',
      0.65,
      '#edddb7'
    );
    g.restore();
  }
  g.restore();
  const nx = x + Math.sin(angle) * (s + 8),
    ny = y - Math.cos(angle) * (s + 8);
  g.fillStyle = '#524a34';
  g.font = 'bold 11px Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('N', nx, ny);
}
const avoidOverlap = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
function labels(g, map, sites, player) {
  const small = map.w < 430 || map.h < 250,
    fontSize = small ? 12 : 14;
  const occupied = sites.map((s) => [s.px - 7, s.py - (s.id === 'gate' ? 18 : 7), s.px + 7, s.py + 4]);
  occupied.push(
    [player[0] - 7, player[1] - 7, player[0] + 7, player[1] + 7],
    [10, 10, 59, 62],
    [map.w - 96, map.h - 32, map.w - 8, map.h - 8]
  );
  for (const site of sites) {
    const main = site.id === 'gate',
      secondary = ['mire', 'crossing', 'downs'].includes(site.id);
    const size = main ? fontSize + 3 : secondary ? fontSize - 1 : fontSize;
    g.font = `${main ? 'bold ' : secondary ? 'italic ' : ''}${size}px Georgia, serif`;
    const tw = g.measureText(site.name).width,
      pad = 3;
    const tries = map.wide
      ? [
          [0, -22],
          [0, 20],
          [8, -29],
          [-8, 28],
          [-14, 0],
          [14, 0],
        ]
      : [
          [14, -5],
          [-14, -5],
          [0, -23],
          [0, 20],
          [15, 10],
          [-15, 10],
        ];
    tries.push([0, -36], [0, 36], [23, -33], [-23, 33], [22, 27], [-22, -29], [0, -47], [0, 47]);
    let selection = null;
    for (const [dx, dy] of tries) {
      const left = dx >= 13 ? site.px + dx : dx <= -13 ? site.px + dx - tw : site.px + dx - tw / 2;
      const x = clamp(left, 12, map.w - 12 - tw),
        y = clamp(site.py + dy, 14 + size / 2, map.h - 12 - size / 2);
      const rect = [x - pad, y - size / 2 - pad, x + tw + pad, y + size / 2 + pad];
      if (occupied.some((other) => avoidOverlap(other, rect))) continue;
      selection = { x, y, rect };
      break;
    }
    if (!selection && (main || site.secret || site.id === 'bells')) {
      const x = clamp(site.px - tw * 0.5, 12, map.w - 12 - tw),
        y = clamp(site.py - 36, 16 + size / 2, map.h - 14 - size / 2);
      selection = { x, y, rect: [x - pad, y - size / 2 - pad, x + tw + pad, y + size / 2 + pad] };
    }
    if (!selection) continue;
    const { x, y, rect } = selection;
    occupied.push(rect);
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.strokeStyle = '#e1d0a9';
    g.lineWidth = 3.4;
    g.strokeText(site.name, x, y);
    g.fillStyle = secondary ? '#4b5140' : '#453923';
    g.fillText(site.name, x, y);
    const targetX = clamp(site.px, x, x + tw),
      targetY = y + Math.sign(site.py - y) * (size / 2 + 1);
    if (Math.hypot(site.px - targetX, site.py - targetY) > 17) {
      const bearing = Math.atan2(targetY - site.py, targetX - site.px);
      path(
        g,
        [
          [site.px + 8 * Math.cos(bearing), site.py + 8 * Math.sin(bearing)],
          [targetX, targetY],
        ],
        '#89744b',
        0.65
      );
    }
  }
}
function route(g, map, world) {
  const line = (mapPath) => mapPath.map(([x, z]) => map.point(x, z));
  path(g, line(MAP.road), '#f0e0b7', 4.8);
  path(g, line(MAP.road), '#826841', 3.2);
  path(g, line(MAP.road), '#dcb774', 1.55);
  if (world.hasMap) {
    g.setLineDash([4, 3]);
    path(g, line(MAP.trail), '#526744', 1.9);
    g.setLineDash([]);
  }
  const bridge = map.point(30, 1021);
  g.save();
  g.translate(...bridge);
  g.rotate(map.angle);
  const half = Math.max(3.5, 11 * map.scale),
    length = Math.max(8, 27 * map.scale);
  for (const x of [-half, half])
    path(
      g,
      [
        [x, -length / 2],
        [x, length / 2],
      ],
      '#574b34',
      1.05
    );
  for (let k = 0; k < 4; k++) {
    const y = -length / 2 + (k * length) / 3;
    path(
      g,
      [
        [-half, y],
        [half, y],
      ],
      '#8c7041',
      0.8
    );
  }
  g.restore();
}
function drawBorder(g, map) {
  g.strokeStyle = '#8d7954';
  g.lineWidth = 1;
  g.strokeRect(5.5, 5.5, map.w - 11, map.h - 11);
  for (const [x, y, angle] of [
    [7, 7, 0],
    [map.w - 7, 7, Math.PI / 2],
    [map.w - 7, map.h - 7, Math.PI],
    [7, map.h - 7, -Math.PI / 2],
  ]) {
    g.save();
    g.translate(x, y);
    g.rotate(angle);
    path(
      g,
      [
        [1, 15],
        [1, 1],
        [15, 1],
      ],
      '#66573c',
      1
    );
    path(
      g,
      [
        [2, 2],
        [8, 3],
        [3, 8],
      ],
      '#847049',
      0.6,
      '#b5a076'
    );
    g.restore();
  }
  const cartouche = g.createRadialGradient(30, 34, 5, 30, 34, 25);
  cartouche.addColorStop(0, '#dfceaa');
  cartouche.addColorStop(0.6, 'rgba(225,207,167,.93)');
  cartouche.addColorStop(1, 'rgba(225,207,167,0)');
  g.fillStyle = cartouche;
  g.fillRect(6, 10, 49, 49);
  rose(g, 30, 34, map.angle, map.h < 220 ? 9 : 12);
  const length = (map.scale * 250 > 74 ? 100 : 250) * map.scale;
  const x = map.w - 16 - length,
    y = map.h - 15;
  g.textAlign = 'center';
  g.textBaseline = 'bottom';
  g.font = '10px Georgia, serif';
  g.fillStyle = '#504431';
  g.fillText(`${Math.round(length / map.scale)} m`, x + length / 2, y - 3);
  path(
    g,
    [
      [x, y - 3],
      [x, y],
      [x + length, y],
      [x + length, y - 3],
    ],
    '#6a5d40',
    1
  );
  path(
    g,
    [
      [x, y],
      [x + length / 2, y],
    ],
    '#554b35',
    2.6
  );
}
export function drawFieldMap(canvas, world) {
  if (!canvas || !world) return;
  const bounds = canvas.getBoundingClientRect(),
    dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
  if (!bounds.width || !bounds.height) return;
  const w = bounds.width,
    h = bounds.height,
    map = projection(w, h, world);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const g = canvas.getContext('2d');
  if (!g) return;
  g.scale(dpr, dpr);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  wash(g, map);
  g.save();
  g.beginPath();
  g.rect(7, 7, w - 14, h - 14);
  g.clip();
  contourSurvey(g, map);
  woods(g, map);
  water(g, map);
  route(g, map, world);
  if (world.milestones.ridge) {
    for (let i = 0; i < HORDE_COUNT; i += 11) {
      const a = hordePosition(world, i),
        [x, y] = map.point(a.x, a.z);
      dot(g, x, y, 1, 'rgba(126,65,53,.72)');
    }
  }
  const sites = [];
  for (const id of ['gate', 'clearing', 'bells', 'ridge', 'chapel', 'ford', 'downs', 'crossing', 'mire']) {
    const place = LANDMARKS.find((l) => l.id === id);
    if (!place || (place.secret && !world.hasMap)) continue;
    const [px, py] = map.point(place.x, place.z);
    sites.push({ ...place, px, py });
    marker(g, id, px, py, h < 210 ? 0.77 : 1);
  }
  const player = map.point(world.player.x, world.player.z);
  labels(g, map, sites, player);
  g.save();
  g.translate(...player);
  g.rotate(world.player.yaw + map.angle);
  dot(g, 0, 0, 6.6, '#d8c88c');
  path(
    g,
    [
      [0, -8.5],
      [4.9, 5.7],
      [0, 3],
      [-4.9, 5.7],
    ],
    '#373e32',
    1.7,
    '#fff4cc'
  );
  g.restore();
  g.restore();
  drawBorder(g, map);
}
