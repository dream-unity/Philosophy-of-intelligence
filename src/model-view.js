(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FormModelView = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // These vertex assignments were checked offline with NetworkX against
  // FormGeometry.meshFor(). Geodesic mediator positions are induced from the
  // icosahedron's edge midpoints, preserving every semantic endpoint pair.
  const HIGH_LAYOUTS = {
  "dodecahedron": {
    "vertexMap": {
      "A0": 0,
      "A1": 8,
      "A2": 4,
      "B0": 9,
      "B8": 1,
      "A9": 10,
      "B9": 2,
      "B6": 11,
      "B4": 5,
      "B7": 12,
      "A7": 3,
      "A8": 13,
      "B1": 14,
      "B3": 6,
      "B2": 15,
      "A3": 16,
      "A6": 17,
      "A5": 7,
      "B5": 18,
      "A4": 19
    },
    "points": {
      "A0": [
        243.18,
        201.267,
        -1.30585
      ],
      "A1": [
        311.14,
        127.177,
        -1.374
      ],
      "A2": [
        401.914,
        168.761,
        -1.44109
      ],
      "B0": [
        293.271,
        288.805,
        -1.33082
      ],
      "B8": [
        269.874,
        351.689,
        -0.25555
      ],
      "A9": [
        178.372,
        192.275,
        -0.21514
      ],
      "B9": [
        213.381,
        95.055,
        0.3908
      ],
      "B6": [
        371.888,
        372.5,
        0.32541
      ],
      "B4": [
        447.304,
        312.938,
        -0.3908
      ],
      "B7": [
        257.797,
        126.259,
        1.4144
      ],
      "A7": [
        242.105,
        266.321,
        1.44109
      ],
      "A8": [
        190.985,
        292.617,
        0.43397
      ],
      "B1": [
        302.477,
        57.992,
        -0.32541
      ],
      "B3": [
        405.954,
        57.5,
        0.25555
      ],
      "B2": [
        391.213,
        267.909,
        -1.4144
      ],
      "A3": [
        466.33,
        133.861,
        -0.43397
      ],
      "A6": [
        370.262,
        323.384,
        1.374
      ],
      "A5": [
        462.906,
        219.857,
        1.30585
      ],
      "B5": [
        394.559,
        99.112,
        1.33082
      ],
      "A4": [
        501.628,
        226.828,
        0.21514
      ]
    },
    "minNodeDistance": 38.34,
    "angles": [
      1.012805299203999,
      0.1280635526790893,
      0.09544501155953389
    ]
  },
  "icosahedron": {
    "vertexMap": {
      "N": 0,
      "U0": 1,
      "U1": 2,
      "L4": 3,
      "L1": 4,
      "L0": 5,
      "U2": 6,
      "U4": 7,
      "U3": 8,
      "S": 9,
      "L2": 10,
      "L3": 11
    },
    "points": {
      "N": [
        305.275,
        213.883,
        -1.86317
      ],
      "U0": [
        231.446,
        321.016,
        -0.55271
      ],
      "U1": [
        186.968,
        159.062,
        -0.55965
      ],
      "L4": [
        341.99,
        372.5,
        0.94467
      ],
      "L1": [
        255.335,
        57.5,
        0.93345
      ],
      "L0": [
        181.709,
        246.965,
        1.17569
      ],
      "U2": [
        324.36,
        73.383,
        -0.94467
      ],
      "U4": [
        393.536,
        324.56,
        -0.93345
      ],
      "U3": [
        445.436,
        175.142,
        -1.17569
      ],
      "S": [
        374.569,
        193.544,
        1.86317
      ],
      "L2": [
        447.217,
        74.616,
        0.55271
      ],
      "L3": [
        498.291,
        259.67,
        0.55965
      ]
    },
    "minNodeDistance": 70.04,
    "angles": [
      0.4771491434716309,
      0.215977937312811,
      -0.1527319187682714
    ]
  },
  "geodesic": {
    "vertexMap": {
      "N": 0,
      "U0": 1,
      "U1": 2,
      "L4": 3,
      "L1": 4,
      "L0": 5,
      "U2": 6,
      "U4": 7,
      "U3": 8,
      "S": 9,
      "L2": 10,
      "L3": 11,
      "M01": 13,
      "M02": 12,
      "M03": 17,
      "M04": 19,
      "M05": 15,
      "M06": 31,
      "M07": 35,
      "M08": 38,
      "M09": 34,
      "M10": 30,
      "M11": 14,
      "M12": 18,
      "M13": 20,
      "M14": 21,
      "M15": 16,
      "M16": 28,
      "M17": 36,
      "M18": 41,
      "M19": 32,
      "M20": 25,
      "M21": 22,
      "M22": 24,
      "M23": 27,
      "M24": 23,
      "M25": 37,
      "M26": 29,
      "M27": 40,
      "M28": 39,
      "M29": 26,
      "M30": 33
    },
    "points": {
      "N": [
        249.934,
        279.908,
        -0.66835
      ],
      "U0": [
        288.721,
        371.617,
        0.19908
      ],
      "U1": [
        183.126,
        233.32,
        0.27461
      ],
      "L4": [
        453.296,
        324.423,
        0.44242
      ],
      "L1": [
        278.65,
        91.557,
        0.56464
      ],
      "L0": [
        311.432,
        258.429,
        0.9611
      ],
      "U2": [
        243.426,
        124.323,
        -0.44242
      ],
      "U4": [
        398.789,
        330.383,
        -0.56464
      ],
      "U3": [
        367.662,
        187.835,
        -0.9611
      ],
      "S": [
        451.838,
        147.603,
        0.66835
      ],
      "L2": [
        394.336,
        73.624,
        -0.19908
      ],
      "L3": [
        492.266,
        205.712,
        -0.27461
      ],
      "M01": [
        255.694,
        341.181,
        -0.27583
      ],
      "M02": [
        197.123,
        264.537,
        -0.23143
      ],
      "M03": [
        231.08,
        200.506,
        -0.65289
      ],
      "M04": [
        304.536,
        235.351,
        -0.95777
      ],
      "M05": [
        320.884,
        318.88,
        -0.72473
      ],
      "M06": [
        390.979,
        198.54,
        0.95777
      ],
      "M07": [
        368.868,
        100.226,
        0.72473
      ],
      "M08": [
        435.848,
        88.581,
        0.27583
      ],
      "M09": [
        496.778,
        170.987,
        0.23143
      ],
      "M10": [
        473.492,
        240.771,
        0.65289
      ],
      "M11": [
        216.803,
        318.0,
        0.27843
      ],
      "M12": [
        192.31,
        169.115,
        -0.09863
      ],
      "M13": [
        301.662,
        147.074,
        -0.82497
      ],
      "M14": [
        389.242,
        263.658,
        -0.89681
      ],
      "M15": [
        346.81,
        372.5,
        -0.21487
      ],
      "M16": [
        285.133,
        163.708,
        0.89681
      ],
      "M17": [
        338.556,
        57.5,
        0.21487
      ],
      "M18": [
        460.63,
        126.52,
        -0.27843
      ],
      "M19": [
        496.874,
        270.203,
        0.09863
      ],
      "M20": [
        392.955,
        306.867,
        0.82497
      ],
      "M21": [
        291.244,
        336.686,
        0.68194
      ],
      "M22": [
        374.718,
        372.159,
        0.37706
      ],
      "M23": [
        208.966,
        153.413,
        0.4933
      ],
      "M24": [
        225.506,
        250.366,
        0.72634
      ],
      "M25": [
        313.626,
        79.218,
        -0.37706
      ],
      "M26": [
        245.298,
        89.434,
        0.07184
      ],
      "M27": [
        441.268,
        192.776,
        -0.72634
      ],
      "M28": [
        386.537,
        119.231,
        -0.68194
      ],
      "M29": [
        438.615,
        346.472,
        -0.07184
      ],
      "M30": [
        461.655,
        277.371,
        -0.4933
      ]
    },
    "minNodeDistance": 22.84,
    "angles": [
      0.21655938132544184,
      0.8385974835142896,
      0.026196666433716265
    ]
  }
};
  const POLYGONS = {triangle: 3, square: 4, pentagon: 5, hexagon: 6, heptagon: 7, octagon: 8};
  let instance = 0;

  function escape(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[character]);
  }
  function number(value) {
    if (!Number.isFinite(value)) throw new TypeError('A diagram coordinate must be finite.');
    return Number(value.toFixed(3));
  }
  function stateFor(model, breathNumber) {
    if (!model || !Array.isArray(model.nodes) || !Array.isArray(model.relations)) throw new TypeError('A complete relational model is required.');
    if (!Number.isInteger(breathNumber) || breathNumber < 1 || breathNumber > 4) throw new RangeError('Choose breath 1 through 4.');
    const state = Array.isArray(model.states) ? model.states[breathNumber - 1] : model;
    if (!state || !Array.isArray(state.nodes) || !Array.isArray(state.relations)) throw new TypeError('The requested state must contain a complete model.');
    const nodeIds = new Set(state.nodes.map(node => node.id));
    if (!state.nodes.length || nodeIds.size !== state.nodes.length) throw new TypeError('Diagram roles must have unique identities.');
    const relationIds = new Set(state.relations.map(relation => relation.id));
    if (relationIds.size !== state.relations.length) throw new TypeError('Diagram relationships must have unique identities.');
    state.relations.forEach(relation => {
      if (!nodeIds.has(relation.from) || !nodeIds.has(relation.to)) throw new TypeError('Every diagram relationship must identify both roles.');
    });
    return state;
  }
  function polygonPoints(count) {
    const radius = count > 5 ? 150 : 145;
    const angle = count === 4 ? -Math.PI * 3 / 4 : -Math.PI / 2;
    return Array.from({length: count}, (_, i) => [340 + Math.cos(angle + i * 2 * Math.PI / count) * radius,
      215 + Math.sin(angle + i * 2 * Math.PI / count) * radius, 0]);
  }
  function rawPoints(stageId, nodes) {
    const meshStage = stageId === 'sphere' ? 'geodesic' : stageId;
    const high = HIGH_LAYOUTS[meshStage];
    if (high && nodes.length === Object.keys(high.points).length && nodes.every(node => high.points[node.id])) {
      return {meshStage, points: nodes.map(node => high.points[node.id].slice()), vertexIndices: nodes.map(node => high.vertexMap[node.id])};
    }
    if (stageId === 'circle' || stageId === 'half-circle') return {points: [[210, 215, 0], [470, 215, 0]]};
    if (stageId === 'prism') return {points: [[230, 75, 0.7], [115, 275, 0.7], [345, 275, 0.7], [380, 135, -0.7], [265, 335, -0.7], [495, 335, -0.7]]};
    if (stageId === 'cube') return {points: [[180, 85, 0.7], [375, 85, 0.7], [375, 280, 0.7], [180, 280, 0.7], [285, 145, -0.7], [480, 145, -0.7], [480, 340, -0.7], [285, 340, -0.7]]};
    return {points: polygonPoints(POLYGONS[stageId] || nodes.length)};
  }
  function caption(stageId, count) {
    if (stageId === 'circle') return ['The circular frame encloses one complete relational unit.', 'Count one relationship between two roles; the frame is not another link.'];
    if (stageId === 'half-circle') return ['Two distinct meanings connect the same two roles.', 'The two curves are two relationships; read each complete statement.'];
    if (stageId === 'sphere') return ['One integrated whole, with ' + count + ' selected relationships recoverable.', 'Numbered roles and links retain their identities across views.'];
    return [count + ' selected relationships. Numbers identify roles in the register.', 'Connections show the selected structure; their meanings come from the statements.'];
  }
  function layoutFor(model, breathNumber) {
    const state = stateFor(model, breathNumber);
    const raw = rawPoints(model.stageId, state.nodes);
    if (raw.points.length !== state.nodes.length) throw new TypeError('The declared shape and its role count do not agree.');
    const nodes = state.nodes.map((node, index) => ({id: node.id, label: node.label, number: index + 1,
      x: number(raw.points[index][0]), y: number(raw.points[index][1]), depth: raw.points[index][2],
      vertexIndex: raw.vertexIndices ? raw.vertexIndices[index] : undefined}));
    const nodeIndex = new Map(nodes.map(node => [node.id, node]));
    const relations = state.relations.map((relation, index) => {
      const a = nodeIndex.get(relation.from), b = nodeIndex.get(relation.to);
      let path = 'M' + a.x + ' ' + a.y + 'L' + b.x + ' ' + b.y;
      let midpoint = [(a.x + b.x) / 2, (a.y + b.y) / 2];
      if (model.stageId === 'half-circle') {
        const controlY = index === 0 ? 30 : 400;
        path = 'M' + a.x + ' ' + a.y + 'Q340 ' + controlY + ' ' + b.x + ' ' + b.y;
        midpoint = [340, (a.y + 2 * controlY + b.y) / 4];
      }
      return {id: relation.id, from: relation.from, to: relation.to, text: relation.text,
        path, midpoint, depth: (a.depth + b.depth) / 2};
    });
    return {nodes, relations, meshStage: raw.meshStage || null, caption: caption(model.stageId, relations.length),
      changedRelationIds: (state.changedRelationIds || []).slice(), changedNodeIds: (state.changedNodeIds || []).slice()};
  }
  function wrap(value, maxLength) {
    const words = String(value).split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      if (line && (line + ' ' + word).length > maxLength) { lines.push(line); line = word; }
      else line += (line ? ' ' : '') + word;
    }
    if (line) lines.push(line);
    return lines;
  }
  function render(model, breathNumber, selectedRelationId) {
    const layout = layoutFor(model, breathNumber);
    const high = layout.nodes.length > 8;
    const selection = layout.relations.find(relation => relation.id === selectedRelationId);
    const selectedRoles = new Set(selection ? [selection.from, selection.to] : []);
    const changed = new Set(layout.changedRelationIds);
    const uid = 'form-model-view-' + (++instance);
    const title = (model.title || model.stageId || 'Relational model') + ' · breath ' + breathNumber;
    const description = layout.nodes.length + ' roles and ' + layout.relations.length + ' selected relationships. ' + layout.caption.join(' ')
      + ' Lines do not impose a causal direction. Gold highlights a selected relationship; green highlights changes since the previous entry.'
      + (selection ? ' Selected ' + selection.id + ': ' + selection.text : '');
    const background = model.stageId === 'circle'
      ? '<circle class="model-unit-frame" cx="340" cy="215" r="172" fill="none" stroke="#aaa18b" stroke-width="1" stroke-dasharray="4 6" aria-hidden="true"/>'
      : model.stageId === 'sphere' ? '<ellipse class="model-unit-frame" cx="340" cy="215" rx="234" ry="175" fill="none" stroke="#aaa18b" stroke-width="0.8" stroke-dasharray="3 7" aria-hidden="true"/>' : '';
    const sortedRelations = layout.relations.slice().sort((a, b) => (a.id === selectedRelationId ? 1 : b.id === selectedRelationId ? -1 : a.depth - b.depth));
    const edges = sortedRelations.map(relation => {
      const selected = selection && relation.id === selection.id;
      const isChanged = changed.has(relation.id);
      const color = selected ? '#a65f1d' : isChanged ? '#39766b' : '#756d5a';
      const opacity = selected ? 1 : selection ? isChanged ? 0.55 : high && relation.depth < 0 ? 0.17 : 0.32 : isChanged ? 1 : high && relation.depth < 0 ? 0.35 : 0.68;
      const width = selected ? 4 : isChanged ? 2.6 : high ? 1.15 : 1.65;
      const labelWidth = Math.max(30, String(relation.id).length * 7 + 8);
      const idLabel = !high ? '<g class="model-link-label" aria-hidden="true"><rect x="' + number(relation.midpoint[0] - labelWidth / 2) + '" y="' + number(relation.midpoint[1] - 21) + '" width="' + labelWidth + '" height="18" rx="3" fill="#f7f2e7"/>'
        + '<text x="' + number(relation.midpoint[0]) + '" y="' + number(relation.midpoint[1] - 8) + '" text-anchor="middle" fill="' + color + '" font-size="12" font-family="system-ui, sans-serif">' + escape(relation.id) + '</text></g>' : '';
      return '<g class="model-relation' + (selected ? ' is-selected' : '') + (isChanged ? ' is-changed' : '') + '">'
        + '<path data-relation="' + escape(relation.id) + '" data-from="' + escape(relation.from) + '" data-to="' + escape(relation.to) + '" data-selected="' + Boolean(selected) + '" d="' + relation.path + '" fill="none" stroke="' + color + '" stroke-width="' + width + '" stroke-linecap="round" opacity="' + opacity + '"><title>' + escape(relation.id + ': ' + relation.text) + '</title></path>' + idLabel + '</g>';
    }).join('');
    const roles = layout.nodes.slice().sort((a, b) => a.depth - b.depth).map(node => {
      const selected = selectedRoles.has(node.id);
      const color = selected ? '#a65f1d' : '#514a3d';
      const radius = selected ? high ? 12 : 15 : high ? 10 : 13;
      let label = '';
      if (!high) {
        const dx = node.x - 340, dy = node.y - 215;
        const anchor = Math.abs(dx) < 35 ? 'middle' : dx < 0 ? 'end' : 'start';
        const x = node.x + (Math.abs(dx) < 35 ? 0 : dx < 0 ? -21 : 21);
        const y = (model.stageId === 'cube' || model.stageId === 'prism') && node.number === 3
          ? node.y - 20 : node.y + (dy > 50 ? 28 : dy < -50 ? -23 : -20);
        const lines = wrap(node.label, 19);
        label = '<text class="model-role-label" x="' + number(x) + '" y="' + number(y) + '" text-anchor="' + anchor + '" fill="' + color + '" font-size="14" font-family="system-ui, sans-serif">'
          + lines.map((line, index) => '<tspan x="' + number(x) + '" dy="' + (index ? 17 : 0) + '">' + escape(line) + '</tspan>').join('') + '</text>';
      }
      return '<g class="model-role' + (selected ? ' is-selected' : '') + '" data-role="' + escape(node.id) + '" data-role-number="' + node.number + '" data-selected="' + selected + '" opacity="' + (selection && !selected && high ? 0.63 : 1) + '">'
        + '<title>' + escape(node.number + '. ' + node.label + ' [' + node.id + ']') + '</title>'
        + '<circle cx="' + node.x + '" cy="' + node.y + '" r="' + radius + '" fill="' + (selected ? '#fff6df' : '#f7f2e7') + '" stroke="' + color + '" stroke-width="' + (selected ? 2.5 : 1.3) + '"/>'
        + '<text x="' + node.x + '" y="' + number(node.y + 4) + '" text-anchor="middle" fill="' + color + '" font-size="' + (high ? 10.5 : 12) + '" font-weight="600" font-family="system-ui, sans-serif">' + node.number + '</text>' + label + '</g>';
    }).join('');
    const captions = layout.caption.map((line, index) => '<text class="model-diagram-caption" x="340" y="' + (424 + index * 20) + '" text-anchor="middle" fill="#6f6654" font-size="12.5" font-family="system-ui, sans-serif">' + escape(line) + '</text>').join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" class="training-model-diagram" viewBox="0 0 680 470" width="100%" role="img" aria-labelledby="' + uid + '-title" aria-describedby="' + uid + '-description" data-stage="' + escape(model.stageId || '') + '" data-breath="' + breathNumber + '">'
      + '<title id="' + uid + '-title">' + escape(title) + '</title><desc id="' + uid + '-description">' + escape(description) + '</desc>'
      + '<style>@media(max-width:500px){.training-model-diagram .model-role-label{display:none}.training-model-diagram .model-diagram-caption{font-size:13px}}</style>'
      + background + edges + roles + captions + '</svg>';
  }
  return Object.freeze({render, layoutFor});
});
