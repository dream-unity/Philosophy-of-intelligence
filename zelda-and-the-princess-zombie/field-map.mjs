import {
  MAP,
  LANDMARKS,
  terrainHeight,
  roadX,
  hordePosition,
  HORDE_COUNT,
  routeDistance,
  HOURGLASS,
} from './world.mjs';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Consistently North-Up projection across portrait and landscape viewports (#52),
// with interactive zoom and pan support (#53).
export function createMapProjection(w, h, world, view = {}) {
  const margin = Math.min(20, w * 0.04, h * 0.05);
  const fullX = MAP.maxX - MAP.minX;
  const fullZ = MAP.maxZ - MAP.minZ;
  const zoom = clamp(Number(view.zoom) || 1, 1, 3.2);
  const baseScale = Math.min((w - 2 * margin) / (fullX * 0.78), (h - 2 * margin) / fullZ);
  const scale = baseScale * zoom;
  const defaultCX = world?.hasMap ? -35 : 20;
  const defaultCZ = (MAP.minZ + MAP.maxZ) * 0.5;
  const centerX = clamp(defaultCX + (Number(view.panX) || 0), MAP.minX + 120, MAP.maxX - 120);
  const centerZ = clamp(defaultCZ + (Number(view.panY) || 0), MAP.minZ + 160, MAP.maxZ - 160);
  return {
    w,
    h,
    zoom,
    scale,
    angle: 0,
    centerX,
    centerZ,
    point(x, z) {
      return [w / 2 + (x - centerX) * scale, h / 2 - (z - centerZ) * scale];
    },
    world(px, py) {
      return [centerX + (px - w / 2) / scale, centerZ - (py - h / 2) / scale];
    },
  };
}

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
    resolution = Math.min(1, 310 / Math.max(map.w, map.h));
  layer.width = Math.max(1, Math.round(map.w * resolution));
  layer.height = Math.max(1, Math.round(map.h * resolution));
  const brush = layer.getContext('2d'),
    pixels = brush.createImageData(layer.width, layer.height),
    random = seedGenerator(67079);
  for (let j = 0; j < layer.height; j++) {
    for (let i = 0; i < layer.width; i++) {
      const [rawX, rawZ] = map.world(i / resolution, j / resolution);
      const x = clamp(rawX, MAP.minX + 6, MAP.maxX - 6),
        z = clamp(rawZ, MAP.minZ + 6, MAP.maxZ - 6);
      const e = terrainHeight(x, z);
      const relief = clamp((terrainHeight(x - 9, z + 11) - e) * 1.5, -20, 20);
      const outside =
        rawX < MAP.minX || rawX > MAP.maxX || rawZ < MAP.minZ || rawZ > MAP.maxZ ? 10 : 0;
      const canopy = wooded(x, z) * (outside ? 0.35 : 1),
        mottle = Math.sin(rawX * 0.046 + rawZ * 0.014) * 1.6 + Math.sin(rawZ * 0.036 - rawX * 0.053) * 1.2;
      const weather = (random() - 0.5) * 9 + mottle + relief - outside;
      const edge = Math.min(
        i / layer.width,
        (layer.width - i) / layer.width,
        j / layer.height,
        (layer.height - j) / layer.height
      );
      const dark = clamp(1 - edge * 7, 0, 1) * 12,
        idx = (j * layer.width + i) * 4;
      pixels.data[idx] = clamp(231 - 38 * canopy + weather - dark, 0, 255);
      pixels.data[idx + 1] = clamp(216 - 20 * canopy + weather - dark, 0, 255);
      pixels.data[idx + 2] = clamp(177 - 22 * canopy + weather - dark, 0, 255);
      pixels.data[idx + 3] = 255;
    }
  }
  brush.putImageData(pixels, 0, 0);
  g.drawImage(layer, 0, 0, map.w, map.h);
}

function contourSurvey(g, map) {
  const step = 28,
    minX = MAP.minX - 60,
    minZ = MAP.minZ - 60;
  const nx = Math.ceil((MAP.maxX + 60 - minX) / step) + 1,
    nz = Math.ceil((MAP.maxZ + 60 - minZ) / step) + 1;
  const heights = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) heights[j * nx + i] = terrainHeight(minX + i * step, minZ + j * step);
  for (const level of [-3.5, 1.75, 5.25, 8.75, 12.25, 15.75, 19.25]) {
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
    g.strokeStyle = 'rgba(99,84,51,.27)';
    g.lineWidth = 0.7;
    g.stroke();
  }
}

function woods(g, map) {
  const r = seedGenerator(4622),
    trees = [],
    small = clamp(map.scale * 17, 2.2, 5.6);
  for (let z = MAP.minZ - 40; z < MAP.maxZ; z += 38)
    for (let x = MAP.minX - 40; x < MAP.maxX + 40; x += 38) {
      const xx = x + r() * 31,
        zz = z + r() * 32;
      if (r() >= wooded(xx, zz) * 0.9) continue;
      const [px, py] = map.point(xx, zz);
      if (px < -15 || px > map.w + 15 || py < -15 || py > map.h + 15) continue;
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
      g.strokeStyle = 'rgba(67,86,63,.58)';
      g.lineWidth = 0.65;
      g.stroke();
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
      'rgba(59,79,64,.62)',
      0.65,
      '#acb38b'
    );
  }
}

function water(g, map) {
  const outline = [],
    opposite = [];
  for (let x = MAP.minX - 180; x <= MAP.maxX + 180; x += 15) {
    const ripple = Math.sin(x * 0.023) * 1.1 + Math.sin(x * 0.066) * 0.55;
    outline.push(map.point(x, 1009 + ripple));
    opposite.push(map.point(x, 1034 + ripple));
  }
  path(g, [...outline, ...opposite.reverse()], '#5b7671', 1.0, '#8ba79e');
  for (let x = MAP.minX - 60; x < MAP.maxX + 60; x += 46) {
    const z = 1018 + 3 * Math.sin(x);
    path(g, [map.point(x, z), map.point(x + 13, z + 1)], '#c8d4be', 0.85);
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
    washCol = '#b79b61';
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
      washCol
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
      washCol
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
      dot(g, dx, dy, 1.5, ink);
  } else {
    dot(g, 0, 0, 2.7, ink);
    dot(g, 0, 0, 1.15, paper);
  }
  g.restore();
}

function rose(g, x, y, s) {
  g.save();
  g.translate(x, y);
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
  g.fillStyle = '#524a34';
  g.font = 'bold 11px Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('N', x, y - (s + 8));
}

const avoidOverlap = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

function labels(g, map, sites, player) {
  const small = map.w < 430 || map.h < 250,
    fontSize = small ? 11.5 : 13.5;
  const occupied = sites.map((s) => [s.px - 7, s.py - (s.id === 'gate' ? 18 : 7), s.px + 7, s.py + 4]);
  occupied.push(
    [player[0] - 8, player[1] - 8, player[0] + 8, player[1] + 8],
    [10, 10, 62, 66],
    [map.w - 102, map.h - 34, map.w - 8, map.h - 8]
  );
  for (const site of sites) {
    const main = site.id === 'gate',
      secondary = ['mire', 'crossing', 'downs'].includes(site.id);
    const size = main ? fontSize + 2.5 : secondary ? fontSize - 1 : fontSize;
    g.font = `${main ? 'bold ' : secondary ? 'italic ' : ''}${size}px Georgia, serif`;
    const tw = g.measureText(site.name).width,
      pad = 3;
    const tries = [
      [14, -4],
      [-14, -4],
      [0, -21],
      [0, 19],
      [15, 11],
      [-15, 11],
      [0, -34],
      [0, 34],
    ];
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
        y = clamp(site.py - 28, 16 + size / 2, map.h - 14 - size / 2);
      selection = { x, y, rect: [x - pad, y - size / 2 - pad, x + tw + pad, y + size / 2 + pad] };
    }
    if (!selection) continue;
    const { x, y, rect } = selection;
    occupied.push(rect);
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.strokeStyle = '#e1d0a9';
    g.lineWidth = 3.2;
    g.strokeText(site.name, x, y);
    g.fillStyle = secondary ? '#4b5140' : '#453923';
    g.fillText(site.name, x, y);
  }
}

function drawRoutesAndBridge(g, map, world) {
  const line = (mapPath) => mapPath.map(([x, z]) => map.point(x, z));
  const showFullRoad = Boolean(world.knowsRoad || world.hasMap || world.discovered?.bells || world.discovered?.gate);

  if (showFullRoad) {
    path(g, line(MAP.road), '#f0e0b7', 4.6);
    path(g, line(MAP.road), '#826841', 3.0);
    path(g, line(MAP.road), '#dcb774', 1.5);
  } else {
    // Before consulting the witch or looting her satchel, only the local road out of Lanternwood is sketched (#50)
    const partial = MAP.road.filter(([, z]) => z <= Math.max(240, world.player.z + 140));
    g.setLineDash([5, 4]);
    path(g, line(partial), '#826841', 2.4);
    g.setLineDash([]);
  }

  // Witch's Option-1 beast danger warnings inked on the road (#50)
  if (world.knowsRoad) {
    for (const [bx, bz] of [
      [75, 315],
      [79, 620],
      [88, 1185],
    ]) {
      const [px, py] = map.point(bx, bz);
      g.strokeStyle = 'rgba(138, 52, 42, 0.72)';
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(px - 3.5, py - 3.5);
      g.lineTo(px + 3.5, py + 3.5);
      g.moveTo(px + 3.5, py - 3.5);
      g.lineTo(px - 3.5, py + 3.5);
      g.stroke();
    }
  }

  if (world.hasMap) {
    g.setLineDash([4, 3]);
    path(g, line(MAP.trail), '#4b653d', 2.0);
    g.setLineDash([]);
  }

  // Bridge icon clearly distinguishes SUBMERGED vs RAISED state (#56)
  if (showFullRoad || world.discovered?.bells) {
    const bridge = map.point(30, 1021);
    g.save();
    g.translate(...bridge);
    const half = Math.max(3.6, 10 * map.scale),
      length = Math.max(8, 26 * map.scale);
    if (world.bridgeOpen) {
      g.fillStyle = '#c8a86b';
      g.fillRect(-half, -length / 2, half * 2, length);
      for (const x of [-half, half])
        path(
          g,
          [
            [x, -length / 2],
            [x, length / 2],
          ],
          '#4d3f28',
          1.35
        );
      for (let k = 0; k < 4; k++) {
        const y = -length / 2 + (k * length) / 3;
        path(
          g,
          [
            [-half, y],
            [half, y],
          ],
          '#7b5e34',
          0.9
        );
      }
    } else {
      // Submerged bridge: pale dashed timbers beneath river water
      g.setLineDash([2.5, 2.5]);
      for (const x of [-half, half])
        path(
          g,
          [
            [x, -length / 2],
            [x, length / 2],
          ],
          'rgba(60, 86, 86, 0.85)',
          1.1
        );
      g.setLineDash([]);
    }
    g.restore();
  }
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
  const cartouche = g.createRadialGradient(32, 36, 5, 32, 36, 26);
  cartouche.addColorStop(0, '#dfceaa');
  cartouche.addColorStop(0.6, 'rgba(225,207,167,.93)');
  cartouche.addColorStop(1, 'rgba(225,207,167,0)');
  g.fillStyle = cartouche;
  g.fillRect(6, 10, 52, 52);
  rose(g, 32, 36, map.h < 220 ? 9 : 12);

  const metres = map.scale * 250 > 84 ? 100 : 250;
  const length = metres * map.scale;
  const x = map.w - 16 - length,
    y = map.h - 15;
  g.textAlign = 'center';
  g.textBaseline = 'bottom';
  g.font = '10px Georgia, serif';
  g.fillStyle = '#504431';
  g.fillText(`${metres} m`, x + length / 2, y - 3);
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

export function describeFieldMap(world) {
  if (!world) return '';
  const p = world.player;
  const dist = routeDistance(world);
  const goalName = world.hasMap && !world.antidote ? 'the Moonwell' : 'Princess Xero at Castle Xero';
  const parts = [`You are facing ${['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'][((Math.round(p.yaw / (Math.PI / 4)) % 8) + 8) % 8]}, about ${dist} metres by trail from ${goalName}.`];
  if (world.gateCrossed) {
    parts.push('You are inside Castle Xero.');
  } else if (world.gateClosed) {
    parts.push('The castle gate is sealed shut.');
  } else if (world.milestones?.fork || world.milestones?.ridge) {
    const pct = Math.round(clamp((world.elapsed || 0) / HOURGLASS, 0, 1) * 100);
    const lead = hordePosition(world, 0);
    const gateDist = Math.round(Math.hypot(30 - lead.x, 1435 - lead.z));
    parts.push(`The dead host is ${pct}% of the way to the castle, with its front rank roughly ${gateDist} metres from the gate.`);
  }
  if (world.knowsRoad || world.discovered?.bells) {
    parts.push(world.bridgeOpen ? 'The Three-Bell Sluice bridge is raised and passable.' : 'The Three-Bell Sluice bridge is submerged.');
  }
  if (world.hasMap) {
    parts.push(
      world.antidote
        ? 'Your silver vial is filled with moonwater; the Pale Ford crosses the river to the west.'
        : 'The inked Pale Trail leads northwest to the Moonwell and Pale Ford.'
    );
  }
  if (world.waypoint) {
    const wpDist = Math.round(Math.hypot(world.waypoint.x - p.x, world.waypoint.z - p.z));
    parts.push(`Custom waypoint pinned ${wpDist} metres away.`);
  }
  return parts.join(' ');
}

export function drawFieldMap(canvas, world, view = {}) {
  if (!canvas || !world) return null;
  const bounds = canvas.getBoundingClientRect(),
    dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
  if (!bounds.width || !bounds.height) return null;
  const w = bounds.width,
    h = bounds.height,
    map = createMapProjection(w, h, world, view);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const g = canvas.getContext('2d');
  if (!g) return null;
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
  drawRoutesAndBridge(g, map, world);

  if (world.milestones?.fork || world.milestones?.ridge) {
    for (let i = 0; i < HORDE_COUNT; i += 10) {
      const a = hordePosition(world, i),
        [x, y] = map.point(a.x, a.z);
      dot(g, x, y, 1.25, 'rgba(130, 56, 46, 0.78)');
    }
  }

  const sites = [];
  for (const id of ['gate', 'clearing', 'bells', 'ridge', 'chapel', 'ford', 'downs', 'crossing', 'mire']) {
    const place = LANDMARKS.find((l) => l.id === id);
    if (!place) continue;
    const unlocked =
      id === 'clearing' ||
      world.discovered?.[id] ||
      (world.knowsRoad && ['gate', 'bells', 'crossing', 'ridge', 'mire', 'downs'].includes(id)) ||
      (world.hasMap && ['gate', 'chapel', 'ford', 'clearing'].includes(id));
    if (!unlocked) continue;
    if (place.secret && !world.hasMap && !world.discovered?.[id]) continue;
    const [px, py] = map.point(place.x, place.z);
    sites.push({ ...place, px, py });
    marker(g, id, px, py, h < 210 ? 0.77 : 1);
  }

  // Draw custom waypoint pin if placed (#53)
  if (world.waypoint) {
    const [wx, wy] = map.point(world.waypoint.x, world.waypoint.z);
    g.save();
    g.translate(wx, wy);
    path(
      g,
      [
        [0, 0],
        [-5, -11],
        [0, -15],
        [5, -11],
      ],
      '#3a2d1a',
      1.2,
      '#f0c86d'
    );
    dot(g, 0, -10.5, 1.8, '#3a2d1a');
    g.restore();
  }

  const player = map.point(world.player.x, world.player.z);
  labels(g, map, sites, player);

  // North-Up player arrow
  g.save();
  g.translate(...player);
  g.rotate(world.player.yaw);
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
  return map;
}
