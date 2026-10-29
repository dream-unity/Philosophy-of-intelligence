/* Philosophy of Intelligence — original geometric engravings. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FormGeometry = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STAGE_IDS = Object.freeze(['circle', 'half-circle', 'triangle', 'square', 'pentagon', 'hexagon', 'prism', 'heptagon', 'octagon', 'cube', 'dodecahedron', 'icosahedron', 'geodesic', 'sphere']);
  const NAMES = { circle: 'Circle', 'half-circle': 'Half-circle', triangle: 'Triangle', square: 'Square', pentagon: 'Pentagon', hexagon: 'Hexagon', prism: 'Triangular prism', heptagon: 'Heptagon', octagon: 'Octagon', cube: 'Cube', dodecahedron: 'Dodecahedron', icosahedron: 'Icosahedron', geodesic: 'Geodesic sphere', sphere: 'Sphere' };
  const SIDES = { triangle: 3, square: 4, pentagon: 5, hexagon: 6, heptagon: 7, octagon: 8 };
  const INK = '#363227';
  const PROGRESS_INK = '#211e18';
  const PARCHMENT = '#eee7d5';
  const TAU = Math.PI * 2;
  const meshCache = Object.create(null);
  let nextId = 0;

  function escape(value) {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  function text(value, fallback, maxLength) {
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return fallback;
    return String(value).slice(0, maxLength || 320);
  }

  function bounded(value, fallback, min, max) {
    const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
  }

  function safeColor(value) {
    const color = text(value, INK, 80).trim();
    return /^(?:#[\da-f]{3}|#[\da-f]{4}|#[\da-f]{6}|#[\da-f]{8}|[a-z]{1,24}|(?:rgb|rgba|hsl|hsla)\([\d\s.,%+\-/]+\))$/i.test(color) ? color : INK;
  }

  function stageName(id) {
    if (id === 'triangular-prism') return 'prism';
    if (id === 'semicircle') return 'half-circle';
    if (id === 'geodesic-sphere') return 'geodesic';
    return typeof id === 'string' && STAGE_IDS.includes(id) ? id : 'circle';
  }

  const add = (a, b) => a.map((value, i) => value + b[i]);
  const subtract = (a, b) => a.map((value, i) => value - b[i]);
  const multiply = (a, scale) => a.map(value => value * scale);
  const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const magnitude = a => Math.hypot(...a);
  const normalise = a => multiply(a, 1 / (magnitude(a) || 1));
  const edgeKey = (a, b) => a < b ? a + ':' + b : b + ':' + a;
  const number = value => Number(value.toFixed(3));

  /* A face is a supporting plane of the convex solid. Coplanar triples are
     combined, so the dodecahedron has twelve actual pentagons. */
  function convexFaces(vertices) {
    const found = new Map();
    const epsilon = 0.00001;
    for (let a = 0; a < vertices.length - 2; a++) {
      for (let b = a + 1; b < vertices.length - 1; b++) {
        for (let c = b + 1; c < vertices.length; c++) {
          let normal = cross(subtract(vertices[b], vertices[a]), subtract(vertices[c], vertices[a]));
          if (magnitude(normal) < epsilon) continue;
          normal = normalise(normal);
          const distances = vertices.map(vertex => dot(normal, subtract(vertex, vertices[a])));
          if (distances.some(value => value > epsilon) && distances.some(value => value < -epsilon)) continue;
          if (dot(normal, vertices[a]) < 0) normal = multiply(normal, -1);
          const members = distances.map((distance, i) => Math.abs(distance) < epsilon ? i : -1).filter(i => i >= 0);
          const key = members.join(':');
          if (found.has(key)) continue;
          const centre = multiply(members.reduce((sum, i) => add(sum, vertices[i]), [0, 0, 0]), 1 / members.length);
          const axis = normalise(subtract(vertices[members[0]], centre));
          const perpendicular = cross(normal, axis);
          members.sort((i, j) => {
            const first = subtract(vertices[i], centre);
            const second = subtract(vertices[j], centre);
            return Math.atan2(dot(first, perpendicular), dot(first, axis)) - Math.atan2(dot(second, perpendicular), dot(second, axis));
          });
          found.set(key, members);
        }
      }
    }
    return Array.from(found.values());
  }

  function edgesFromFaces(faces) {
    const edges = new Map();
    faces.forEach(face => face.forEach((a, index) => {
      const b = face[(index + 1) % face.length];
      const key = edgeKey(a, b);
      if (!edges.has(key)) edges.set(key, a < b ? [a, b] : [b, a]);
    }));
    return Array.from(edges.values()).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }

  function solid(vertices, faces) {
    const boundary = faces || convexFaces(vertices);
    return { kind: 'solid', vertices, edges: edgesFromFaces(boundary), faces: boundary };
  }

  function makeMesh(id) {
    if (SIDES[id]) {
      const sides = SIDES[id];
      const angle = sides === 4 ? Math.PI / 4 : Math.PI / 2;
      const vertices = Array.from({ length: sides }, (_, index) => [Math.cos(angle + index * TAU / sides), Math.sin(angle + index * TAU / sides), 0]);
      return { kind: 'polygon', vertices, edges: vertices.map((_, i) => [i, (i + 1) % sides]), faces: [vertices.map((_, i) => i)] };
    }
    if (id === 'prism') {
      const vertices = [];
      [-0.62, 0.62].forEach(z => {
        for (let i = 0; i < 3; i++) vertices.push([Math.cos(Math.PI / 2 + i * TAU / 3), Math.sin(Math.PI / 2 + i * TAU / 3), z]);
      });
      return solid(vertices);
    }
    if (id === 'cube') {
      const vertices = [];
      [-1, 1].forEach(x => [-1, 1].forEach(y => [-1, 1].forEach(z => vertices.push([x, y, z]))));
      return solid(vertices);
    }
    if (id === 'dodecahedron' || id === 'icosahedron') {
      const phi = (1 + Math.sqrt(5)) / 2;
      const vertices = [];
      if (id === 'dodecahedron') {
        [-1, 1].forEach(x => [-1, 1].forEach(y => [-1, 1].forEach(z => vertices.push([x, y, z]))));
        [-1, 1].forEach(a => [-1, 1].forEach(b => {
          vertices.push([0, a / phi, b * phi], [a / phi, b * phi, 0], [a * phi, 0, b / phi]);
        }));
      } else {
        [-1, 1].forEach(a => [-1, 1].forEach(b => {
          vertices.push([0, a, b * phi], [a, b * phi, 0], [a * phi, 0, b]);
        }));
      }
      return solid(vertices);
    }
    if (id === 'geodesic') {
      const base = internalMesh('icosahedron');
      const vertices = base.vertices.map(normalise);
      const midpoints = new Map();
      const midpoint = (a, b) => {
        const key = edgeKey(a, b);
        if (!midpoints.has(key)) {
          midpoints.set(key, vertices.length);
          vertices.push(normalise(add(vertices[a], vertices[b])));
        }
        return midpoints.get(key);
      };
      const faces = [];
      base.faces.forEach(([a, b, c]) => {
        const ab = midpoint(a, b);
        const bc = midpoint(b, c);
        const ca = midpoint(c, a);
        faces.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
      });
      return solid(vertices, faces);
    }
    return { kind: id === 'sphere' ? 'surface' : 'curve', vertices: [], edges: [], faces: [] };
  }

  function internalMesh(id) {
    if (!meshCache[id]) meshCache[id] = makeMesh(id);
    return meshCache[id];
  }

  /** A detached copy is useful for topology verification and future views. */
  function meshFor(stageId) {
    const mesh = internalMesh(stageName(stageId));
    return { kind: mesh.kind, vertices: mesh.vertices.map(vertex => vertex.slice()), edges: mesh.edges.map(edge => edge.slice()), faces: mesh.faces.map(face => face.slice()) };
  }

  function rotate(vertex, angles) {
    const [ax, ay, az] = angles;
    let [x, y, z] = vertex;
    [x, z] = [x * Math.cos(ay) + z * Math.sin(ay), -x * Math.sin(ay) + z * Math.cos(ay)];
    [y, z] = [y * Math.cos(ax) - z * Math.sin(ax), y * Math.sin(ax) + z * Math.cos(ax)];
    return [x * Math.cos(az) - y * Math.sin(az), x * Math.sin(az) + y * Math.cos(az), z];
  }

  function projection(mesh, id) {
    const angles = id === 'prism' ? [-0.3, 0.61, -0.08] : id === 'cube' ? [-0.43, 0.61, 0] : [0.28, 0.4, 0.13];
    const rotated = mesh.vertices.map(vertex => mesh.kind === 'polygon' ? vertex.slice() : rotate(vertex, angles));
    const xs = rotated.map(vertex => vertex[0]);
    const ys = rotated.map(vertex => vertex[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const scale = 172 / Math.max(maxX - minX, maxY - minY, 0.01);
    const centreX = (minX + maxX) / 2, centreY = (minY + maxY) / 2;
    const vertices = rotated.map(([x, y, z]) => [120 + (x - centreX) * scale, 120 - (y - centreY) * scale, z]);
    const frontEdges = new Set();
    const frontFaces = [];
    if (mesh.kind === 'solid') {
      mesh.faces.forEach(face => {
        const [a, b, c] = face.map(i => rotated[i]);
        const normal = cross(subtract(b, a), subtract(c, a));
        if (normal[2] <= 0.00001) return;
        frontFaces.push(face);
        face.forEach((index, i) => frontEdges.add(edgeKey(index, face[(i + 1) % face.length])));
      });
    } else mesh.edges.forEach(([a, b]) => frontEdges.add(edgeKey(a, b)));
    return { vertices, frontEdges, frontFaces };
  }

  function line(a, b, attributes) {
    return '<line x1="' + number(a[0]) + '" y1="' + number(a[1]) + '" x2="' + number(b[0]) + '" y2="' + number(b[1]) + '"' + (attributes ? ' ' + attributes : '') + '/>';
  }

  /* Ornament is deterministic and separate from the exact mathematical mesh. */
  function drawnArc(radius, start, end, seed) {
    const count = Math.max(12, Math.ceil((end - start) / TAU * 144));
    return Array.from({ length: count + 1 }, (_, index) => {
      const angle = start + (end - start) * index / count;
      const offset = 0.22 * Math.sin(angle * 7 + seed) + 0.14 * Math.sin(angle * 13 - seed * 0.7);
      return (index ? 'L' : 'M') + number(120 + (radius + offset) * Math.cos(angle)) + ' ' + number(120 + (radius + offset) * Math.sin(angle));
    }).join('');
  }

  function draftingOrbit(id, color) {
    const seed = Array.from(id).reduce((sum, letter) => sum + letter.charCodeAt(0), 0) / 13;
    const circles = [96.8, 99.1, 108.8, 112.4].map((radius, index) => '<circle cx="120" cy="120" r="' + radius + '" stroke-width="' + (index === 2 ? '0.65' : '0.32') + '" opacity="' + (index === 2 ? '0.58' : '0.29') + '"/>').join('');
    const ticks = Array.from({ length: 60 }, (_, index) => {
      const angle = index * TAU / 60;
      const inner = index % 5 === 0 ? 109.5 : 112.4;
      const outer = index % 5 === 0 ? 117.2 : 114.4;
      return line([120 + Math.cos(angle) * inner, 120 + Math.sin(angle) * inner], [120 + Math.cos(angle) * outer, 120 + Math.sin(angle) * outer]);
    }).join('');
    const arcs = [[100.3, -2.8, -0.6], [107.2, 0.2, 2.1], [111.1, 2.8, 4.9], [98.1, 0.7, 2.6]].map(([radius, start, end], index) => '<path d="' + drawnArc(radius, start, end, seed + index) + '" opacity="' + (index % 2 ? '0.38' : '0.22') + '" stroke-width="0.38"/>').join('');
    const crosshairs = '<path d="M3 120H30 M210 120H237 M120 3V30 M120 210V237" opacity="0.33" stroke-width="0.42"/><path d="M17 120H223 M120 17V223" opacity="0.13" stroke-width="0.3" stroke-dasharray="17 3 1 3"/>';
    return '<g class="form-geometry-drafting" aria-hidden="true" fill="none" stroke="' + color + '" stroke-linecap="round">' + circles + arcs + '<g stroke-width="0.36" opacity="0.39">' + ticks + '</g>' + crosshairs + '</g>';
  }

  function etchedEdges(edges, vertices, frontEdges, color) {
    const paths = edges.map(([a, b], index) => {
      if (!frontEdges.has(edgeKey(a, b))) return '';
      const from = vertices[a], to = vertices[b];
      const dx = to[0] - from[0], dy = to[1] - from[1], length = Math.hypot(dx, dy) || 1;
      const nx = -dy / length, ny = dx / length;
      const offset = 0.45 + Math.sin(index * 2.13) * 0.2;
      const start = [from[0] + nx * offset - dx / length * 0.7, from[1] + ny * offset - dy / length * 0.7];
      const end = [to[0] + nx * offset + dx / length * 0.8, to[1] + ny * offset + dy / length * 0.8];
      return '<path d="M' + number(start[0]) + ' ' + number(start[1]) + 'Q' + number((start[0] + end[0]) / 2 + nx * 0.3) + ' ' + number((start[1] + end[1]) / 2 + ny * 0.3) + ' ' + number(end[0]) + ' ' + number(end[1]) + '"/>';
    }).join('');
    return '<g class="form-geometry-etch" aria-hidden="true" fill="none" stroke="' + color + '" stroke-width="0.36" opacity="0.37">' + paths + '</g>';
  }

  function faceHatching(vertices, faces, color, uid) {
    if (!faces.length) return '';
    const face = faces.reduce((best, candidate) => {
      const centre = candidate.reduce((sum, index) => sum + vertices[index][0], 0) / candidate.length;
      return centre > best.centre ? { centre, face: candidate } : best;
    }, { centre: -Infinity, face: faces[0] }).face;
    const points = face.map(index => vertices[index]);
    const xs = points.map(point => point[0]), ys = points.map(point => point[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const slant = (maxY - minY) * 0.58;
    const strokes = [];
    for (let x = minX - slant; x <= maxX; x += 5.2) strokes.push(line([x, minY], [x + slant, maxY]));
    const clipId = uid + '-hatching';
    return '<defs><clipPath id="' + clipId + '"><polygon points="' + points.map(point => number(point[0]) + ',' + number(point[1])).join(' ') + '"/></clipPath></defs><g class="form-geometry-hatching" aria-hidden="true" clip-path="url(#' + clipId + ')" fill="none" stroke="' + color + '" stroke-width="0.35" opacity="0.18">' + strokes.join('') + '</g>';
  }

  function progressLines(edges, vertices, progress, frontEdges, width) {
    const sorted = edges.slice().sort((a, b) => {
      const aFront = frontEdges.has(edgeKey(a[0], a[1])) ? 1 : 0;
      const bFront = frontEdges.has(edgeKey(b[0], b[1])) ? 1 : 0;
      return bFront - aFront;
    });
    const coverage = progress * sorted.length;
    return sorted.map(([a, b], index) => {
      const fraction = Math.max(0, Math.min(1, coverage - index));
      if (!fraction) return '';
      const end = add(vertices[a], multiply(subtract(vertices[b], vertices[a]), fraction));
      return line(vertices[a], end, 'opacity="' + (frontEdges.has(edgeKey(a, b)) ? '0.95' : '0.4') + '"');
    }).join('').replace(/^(.+)$/, '<g class="form-geometry-progress" fill="none" stroke="' + PROGRESS_INK + '" stroke-width="' + width + '" stroke-linecap="round">$1</g>');
  }

  function drawMesh(id, mesh, color, progress, compact, detailed, uid) {
    const { vertices, frontEdges, frontFaces } = projection(mesh, id);
    const width = compact ? 5.5 : id === 'geodesic' ? 0.72 : 0.98;
    const hidden = [], visible = [];
    mesh.edges.forEach(([a, b]) => (frontEdges.has(edgeKey(a, b)) ? visible : hidden).push(line(vertices[a], vertices[b])));
    const fill = mesh.kind === 'polygon'
      ? '<polygon points="' + vertices.map(vertex => number(vertex[0]) + ',' + number(vertex[1])).join(' ') + '" fill="' + color + '" opacity="0.012"/>'
      : frontFaces.map((face, index) => '<polygon points="' + face.map(i => number(vertices[i][0]) + ',' + number(vertices[i][1])).join(' ') + '" fill="' + color + '" opacity="' + (index % 3 === 0 ? '0.03' : '0.012') + '"/>').join('');
    const vertexDots = compact || id === 'geodesic' ? '' : vertices.map((vertex, index) => {
      const isFront = mesh.edges.some(([a, b]) => (a === index || b === index) && frontEdges.has(edgeKey(a, b)));
      if (!isFront) return '';
      return (detailed ? '<path d="M' + number(vertex[0] - 3.1) + ' ' + number(vertex[1]) + 'h6.2M' + number(vertex[0]) + ' ' + number(vertex[1] - 3.1) + 'v6.2" fill="none" stroke="' + color + '" stroke-width="0.36" opacity="0.32"/>' : '')
        + '<circle cx="' + number(vertex[0]) + '" cy="' + number(vertex[1]) + '" r="1.35" fill="' + PARCHMENT + '" stroke="' + color + '" stroke-width="0.72"/>';
    }).join('');
    return fill + (detailed && mesh.kind === 'solid' && id !== 'geodesic' ? faceHatching(vertices, frontFaces, color, uid) : '')
      + (detailed ? etchedEdges(mesh.edges, vertices, frontEdges, color) : '')
      + '<g fill="none" stroke="' + color + '" stroke-width="' + width + '" stroke-linejoin="round" stroke-linecap="round">'
      + '<g class="form-geometry-hidden" opacity="0.2" stroke-dasharray="' + (compact ? '9 12' : '2.5 5') + '">' + hidden.join('') + '</g>'
      + '<g class="form-geometry-visible" opacity="0.88">' + visible.join('') + '</g></g>'
      + progressLines(mesh.edges, vertices, progress, frontEdges, compact ? 6.7 : 1.45) + vertexDots;
  }

  function drawCurve(id, color, progress, compact, detailed) {
    const width = compact ? 5.8 : 1.02;
    const curve = id === 'circle' ? 'M120 34 A86 86 0 1 1 119.999 34 Z' : 'M34 155 A86 86 0 0 1 206 155 L34 155 Z';
    const length = id === 'circle' ? TAU * 86 : Math.PI * 86 + 172;
    const path = '<path d="' + curve + '"';
    const etching = !detailed ? '' : id === 'circle'
      ? '<g class="form-geometry-etch" aria-hidden="true" fill="none" stroke="' + color + '"><path d="' + drawnArc(84.7, 0, TAU, 2.7) + '" stroke-width="0.36" opacity="0.42"/><path d="' + drawnArc(87.1, 0, TAU, 5.1) + '" stroke-width="0.4" opacity="0.35"/><path d="M120 30v8M120 202v8M30 120h8M202 120h8" stroke-width="0.4" opacity="0.42"/></g>'
      : '<g class="form-geometry-etch" aria-hidden="true" fill="none" stroke="' + color + '" stroke-width="0.36" opacity="0.36">' + path + ' transform="translate(-0.65 0.4)"/>' + path + ' transform="translate(0.7 -0.35)"/></g>';
    return etching + path + ' fill="' + color + '" fill-opacity="0.012" stroke="' + color + '" stroke-width="' + width + '" stroke-linejoin="round"/>'
      + (progress > 0 ? path + ' class="form-geometry-progress" fill="none" stroke="' + PROGRESS_INK + '" stroke-width="' + (compact ? 6.8 : 1.5) + '" stroke-dasharray="' + number(progress * length) + ' ' + number(length + 1) + '" stroke-linecap="round"/>' : '');
  }

  function curvePaths(points) {
    const segments = { front: [], back: [] };
    let currentSide = null, current = '';
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const side = (a[2] + b[2]) / 2 >= 0 ? 'front' : 'back';
      if (side !== currentSide) {
        if (currentSide) segments[currentSide].push(current);
        currentSide = side;
        current = 'M' + number(120 + a[0] * 86) + ' ' + number(120 - a[1] * 86);
      }
      current += 'L' + number(120 + b[0] * 86) + ' ' + number(120 - b[1] * 86);
    }
    if (currentSide) segments[currentSide].push(current);
    return segments;
  }

  function drawSphere(color, progress, compact, detailed, uid) {
    const front = [], back = [];
    const angles = [-0.28, 0.38, -0.13];
    const addCurve = points => {
      const paths = curvePaths(points.map(point => rotate(point, angles)));
      front.push(...paths.front);
      back.push(...paths.back);
    };
    const samples = 96;
    const meridians = compact ? 3 : 6;
    for (let m = 0; m < meridians; m++) {
      const longitude = m * Math.PI / meridians;
      addCurve(Array.from({ length: samples + 1 }, (_, i) => {
        const angle = i * TAU / samples;
        return [Math.cos(angle) * Math.cos(longitude), Math.sin(angle), Math.cos(angle) * Math.sin(longitude)];
      }));
    }
    const parallels = compact ? [-Math.PI / 6, Math.PI / 6] : [-Math.PI / 3, -Math.PI / 6, 0, Math.PI / 6, Math.PI / 3];
    parallels.forEach(latitude => addCurve(Array.from({ length: samples + 1 }, (_, i) => {
      const angle = i * TAU / samples;
      return [Math.cos(latitude) * Math.cos(angle), Math.sin(latitude), Math.cos(latitude) * Math.sin(angle)];
    })));
    const paths = array => array.map(path => '<path d="' + path + '"/>').join('');
    const width = compact ? 4.8 : 0.64;
    const etching = detailed ? '<g class="form-geometry-etch" aria-hidden="true" fill="none" stroke="' + color + '" stroke-width="0.34" opacity="0.22"><path d="' + drawnArc(87.1, 0, TAU, 3.2) + '"/><path d="' + drawnArc(84.8, 0, TAU, 6.8) + '"/><g transform="translate(0.55 -0.3)">' + paths(front) + '</g></g>' : '';
    return '<defs><radialGradient id="' + uid + '-surface" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="' + PARCHMENT + '" stop-opacity="0"/><stop offset="1" stop-color="' + color + '" stop-opacity="0.075"/></radialGradient></defs>'
      + '<circle cx="120" cy="120" r="86" fill="url(#' + uid + '-surface)"/>'
      + etching + '<g fill="none" stroke="' + color + '" stroke-width="' + width + '" stroke-linecap="round"><g opacity="0.15" stroke-dasharray="' + (compact ? '9 12' : '2 5') + '">' + paths(back) + '</g><g opacity="0.68">' + paths(front) + '</g></g>'
      + '<circle cx="120" cy="120" r="86" fill="none" stroke="' + color + '" stroke-width="' + (compact ? 5.7 : 1.02) + '"/>'
      + (progress > 0 ? '<g class="form-geometry-progress" fill="none" stroke="' + PROGRESS_INK + '" stroke-width="' + (compact ? 5.5 : 1.05) + '" opacity="0.85">' + front.map((path, i) => {
        const fraction = Math.max(0, Math.min(1, progress * front.length - i));
        if (!fraction) return '';
        const coordinates = path.match(/-?\d+(?:\.\d+)?/g).map(Number);
        let length = 0;
        for (let j = 2; j < coordinates.length; j += 2) length += Math.hypot(coordinates[j] - coordinates[j - 2], coordinates[j + 1] - coordinates[j - 1]);
        return '<path d="' + path + '" stroke-dasharray="' + number(fraction * length) + ' ' + number(length + 1) + '"/>';
      }).join('') + '</g>' : '');
  }

  /** Accessible, standalone SVG. No timers, network requests or event handlers. */
  function shapeSVG(stageId, options) {
    const config = options && typeof options === 'object' ? options : {};
    const id = stageName(stageId);
    const size = bounded(config.size, 240, 12, 1200);
    const progress = bounded(config.progress, 0, 0, 1);
    const color = escape(safeColor(config.color));
    const uid = 'form-geometry-' + (++nextId);
    const compact = size < 64;
    const detailed = size >= 120;
    const plate = size >= 320;
    const label = escape(text(config.label, NAMES[id], 320));
    const mesh = internalMesh(id);
    const description = mesh.kind === 'solid'
      ? NAMES[id] + ', with ' + mesh.vertices.length + ' vertices, ' + mesh.edges.length + ' edges and ' + mesh.faces.length + ' faces. Faint dashed lines show the rear edges.'
      : id === 'sphere' ? 'A smooth sphere, drawn with curved meridians and parallels.' : NAMES[id] + ', a geometric representation of this stage.';
    const body = mesh.kind === 'solid' || mesh.kind === 'polygon' ? drawMesh(id, mesh, color, progress, compact, detailed, uid) : id === 'sphere' ? drawSphere(color, progress, compact, detailed, uid) : drawCurve(id, color, progress, compact, detailed);
    return '<svg xmlns="http://www.w3.org/2000/svg" class="form-shape form-shape--' + id + (config.animated ? ' is-animated' : '') + '" data-stage="' + id + '" width="' + size + '" height="' + size + '" viewBox="0 0 240 240" role="img" aria-labelledby="' + uid + '-title" aria-describedby="' + uid + '-description" focusable="false">'
      + '<title id="' + uid + '-title">' + label + '</title><desc id="' + uid + '-description">' + escape(description) + '</desc>'
      + (config.animated ? '<style>@media (prefers-reduced-motion: reduce){#' + uid + '-motion{animation:none!important;transition:none!important}}</style>' : '')
      + (plate ? draftingOrbit(id, color) : '')
      + '<g id="' + uid + '-motion" class="form-geometry-motion"' + (plate ? ' transform="translate(120 120) scale(0.79) translate(-120 -120)"' : '') + '>' + body + '</g></svg>';
  }

  function miniIcon(stageId, size) {
    return shapeSVG(stageId, { size: size === undefined ? 24 : size });
  }

  function wrapLabel(label, limit) {
    const words = label.trim().split(/\s+/);
    const lines = [];
    let current = '';
    words.forEach(word => {
      if (current && (current + ' ' + word).length > limit) {
        lines.push(current);
        current = word;
      } else current += (current ? ' ' : '') + word;
    });
    if (current) lines.push(current);
    return lines.slice(0, 3).map((line, i) => line.length > limit + 4 ? line.slice(0, limit + 1) + '…' : i === 2 && lines.length > 3 ? line.slice(0, limit) + '…' : line);
  }

  function relationshipNodes(nodes, width, height, layoutMode) {
    const seen = new Set();
    const safe = (Array.isArray(nodes) ? nodes : []).slice(0, 24).filter(node => {
      if (!node || typeof node !== 'object') return false;
      const id = text(node.id, '', 160);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    }).map(node => ({ id: text(node.id, '', 160), label: text(node.label, text(node.id, '', 160), 180), column: node.column === 'left' || node.column === 'right' ? node.column : null }));
    if (layoutMode === 'columns' && safe.length && safe.every(node => node.column)) {
      const groups = [safe.filter(node => node.column === 'left'), safe.filter(node => node.column === 'right')];
      const rowCount = Math.max(1, groups[0].length, groups[1].length);
      const boxWidth = Math.min(170, Math.max(42, (width - 76) / 2));
      const boxHeight = Math.min(62, Math.max(28, (height - 24) / rowCount - 12));
      return groups.flatMap((group, column) => group.map((node, index) => ({
        ...node,
        x: width * (column ? 0.75 : 0.25),
        y: 12 + (height - 24) * ((index + 0.5) / rowCount),
        width: boxWidth,
        height: boxHeight
      })));
    }
    const columns = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(safe.length * width / height / 1.8))));
    const rows = Math.ceil(safe.length / columns);
    const boxWidth = Math.min(118, Math.max(42, (width - 32) / Math.min(columns, safe.length || 1) - 20));
    const boxHeight = Math.min(54, Math.max(28, (height - 28) / Math.max(1, rows) - 14));
    return safe.map((node, index) => {
      let x, y;
      if (safe.length === 1) { x = width / 2; y = height / 2; }
      else if (safe.length === 2) { x = width * (index ? 0.75 : 0.25); y = height / 2; }
      else if (safe.length === 3) {
        x = [width / 2, width * 0.22, width * 0.78][index];
        y = [height * 0.25, height * 0.72, height * 0.72][index];
      } else {
        const row = Math.floor(index / columns);
        const count = Math.min(columns, safe.length - row * columns);
        x = width * ((index % columns + 0.5) / count);
        y = height * ((row + 0.5) / rows);
      }
      return { ...node, x, y, width: boxWidth, height: boxHeight };
    });
  }

  function borderPoint(node, towards, padding) {
    const dx = towards.x - node.x, dy = towards.y - node.y;
    const scale = Math.min((node.width / 2 + padding) / (Math.abs(dx) || 0.0001), (node.height / 2 + padding) / (Math.abs(dy) || 0.0001));
    return { x: node.x + dx * scale, y: node.y + dy * scale };
  }

  function relationSVG(nodes, edges, options) {
    const config = options && typeof options === 'object' ? options : {};
    const width = bounded(config.width, 500, 160, 1600);
    const height = bounded(config.height, 200, 120, 1200);
    const uid = 'form-relations-' + (++nextId);
    const layout = relationshipNodes(nodes, width, height, config.layout);
    const lookup = new Map(layout.map(node => [node.id, node]));
    const safeEdges = (Array.isArray(edges) ? edges : []).slice(0, 96).filter(edge => edge && typeof edge === 'object' && lookup.has(text(edge.from, '', 160)) && lookup.has(text(edge.to, '', 160)));
    const edgeMarkup = safeEdges.map((edge, index) => {
      const from = lookup.get(text(edge.from, '', 160)), to = lookup.get(text(edge.to, '', 160));
      const label = text(edge.label, '', 100);
      let path, labelX, labelY;
      if (from.id === to.id) {
        const left = from.x - from.width * 0.28, right = from.x + from.width * 0.28, top = from.y - from.height / 2 - 3;
        const lift = Math.min(34, Math.max(15, top - 8));
        path = 'M' + number(left) + ' ' + number(top) + 'C' + number(left - 25) + ' ' + number(top - lift) + ' ' + number(right + 25) + ' ' + number(top - lift) + ' ' + number(right) + ' ' + number(top);
        labelX = from.x; labelY = top - lift + 2;
      } else if (config.layout === 'columns' && from.column && to.column && from.column !== to.column) {
        const direction = from.column === 'left' ? 1 : -1;
        const startX = from.x + direction * (from.width / 2 + 5);
        const endX = to.x - direction * (to.width / 2 + 9);
        const middleX = (startX + endX) / 2;
        path = 'M' + number(startX) + ' ' + number(from.y) + 'C' + number(middleX) + ' ' + number(from.y) + ' ' + number(middleX) + ' ' + number(to.y) + ' ' + number(endX) + ' ' + number(to.y);
        labelX = middleX; labelY = (from.y + to.y) / 2 - 8;
      } else {
        const start = borderPoint(from, to, 5), end = borderPoint(to, from, 9);
        const duplicate = safeEdges.some((other, i) => i !== index && text(other.from, '', 160) === to.id && text(other.to, '', 160) === from.id);
        const dx = end.x - start.x, dy = end.y - start.y, length = Math.hypot(dx, dy) || 1;
        const bend = duplicate ? 23 : 0;
        const controlX = (start.x + end.x) / 2 - dy / length * bend;
        const controlY = (start.y + end.y) / 2 + dx / length * bend;
        path = 'M' + number(start.x) + ' ' + number(start.y) + 'Q' + number(controlX) + ' ' + number(controlY) + ' ' + number(end.x) + ' ' + number(end.y);
        labelX = (start.x + 2 * controlX + end.x) / 4;
        labelY = (start.y + 2 * controlY + end.y) / 4 - 8;
      }
      const displayLabel = label.length > 32 ? label.slice(0, 29) + '…' : label;
      const labelWidth = Math.min(width - 12, displayLabel.length * 5.8 + 12);
      return '<g class="form-relation-edge"><title>' + escape(from.label + ' → ' + to.label + (label ? ': ' + label : '')) + '</title><path d="' + path + '" fill="none" stroke="' + INK + '" stroke-opacity="0.22" stroke-width="0.35" transform="translate(0.55 -0.35)" aria-hidden="true"/><path d="' + path + '" fill="none" stroke="' + INK + '" stroke-opacity="0.65" stroke-width="1.05" marker-end="url(#' + uid + '-arrow)"/>'
        + (label ? '<rect x="' + number(labelX - labelWidth / 2) + '" y="' + number(labelY - 11) + '" width="' + number(labelWidth) + '" height="17" rx="1.5" fill="' + PARCHMENT + '"/><text x="' + number(labelX) + '" y="' + number(labelY + 1) + '" text-anchor="middle" fill="' + INK + '" font-size="10.5" font-family="Georgia,serif">' + escape(displayLabel) + '</text>' : '') + '</g>';
    }).join('');
    const nodeMarkup = layout.map((node, index) => {
      const lines = wrapLabel(node.label, Math.max(6, Math.floor(node.width / 6.1)));
      const lineHeight = Math.min(13, (node.height - 10) / Math.max(1, lines.length));
      const firstY = node.y - (lines.length - 1) * lineHeight / 2 + 3.5;
      const isSource = safeEdges.some(edge => text(edge.from, '', 160) === node.id);
      return '<g class="form-relation-node" role="group" aria-label="' + escape(node.label) + '" data-relation-node="' + escape(node.id) + '"><rect x="' + number(node.x - node.width / 2) + '" y="' + number(node.y - node.height / 2) + '" width="' + number(node.width) + '" height="' + number(node.height) + '" rx="2.5" fill="' + PARCHMENT + '" stroke="' + (isSource ? PROGRESS_INK : INK) + '" stroke-opacity="0.65" stroke-width="0.85"/>'
        + '<rect x="' + number(node.x - node.width / 2 + 1.4) + '" y="' + number(node.y - node.height / 2 + 1.1) + '" width="' + number(node.width - 2.9) + '" height="' + number(node.height - 2.3) + '" rx="1.5" fill="none" stroke="' + INK + '" stroke-width="0.3" opacity="0.23" aria-hidden="true"/>'
        + '<text text-anchor="middle" fill="' + INK + '" font-size="11" font-family="Georgia,serif">' + lines.map((content, lineIndex) => '<tspan x="' + number(node.x) + '" y="' + number(firstY + lineIndex * lineHeight) + '">' + escape(content) + '</tspan>').join('') + '</text></g>';
    }).join('');
    const description = layout.length ? layout.length + ' nodes and ' + safeEdges.length + ' directed relationships. Nodes: ' + layout.map(node => node.label).join('; ') + '. '
      + (safeEdges.length ? 'Connections: ' + safeEdges.map(edge => lookup.get(text(edge.from, '', 160)).label + ' to ' + lookup.get(text(edge.to, '', 160)).label + (text(edge.label, '', 100) ? ', ' + text(edge.label, '', 100) : '')).join('; ') + '.' : 'No connections selected.') : 'No relationships to display.';
    return '<svg xmlns="http://www.w3.org/2000/svg" class="form-relation-map" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-labelledby="' + uid + '-title" aria-describedby="' + uid + '-description" focusable="false"><title id="' + uid + '-title">' + escape(text(config.label, 'Relationship map', 320)) + '</title><desc id="' + uid + '-description">' + escape(description) + '</desc><defs><marker id="' + uid + '-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="' + INK + '" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>' + edgeMarkup + nodeMarkup + '</svg>';
  }

  return Object.freeze({ shapeSVG, miniIcon, relationSVG, meshFor, STAGE_IDS });
});
