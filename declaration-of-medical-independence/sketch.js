const SVG_NS = 'http://www.w3.org/2000/svg';
const WIDTH = 1000;
const HEIGHT = 625;
const INKS = new Map([
  ['#263b39', 'Graphite'],
  ['#245783', 'Blue'],
  ['#943f38', 'Terracotta']
]);
const SIZES = new Set([3, 6, 10]);
const MAX_STROKES = 1000;
const MAX_POINTS = 100000;
const MAX_HISTORY = 40;
let mountId = 0;

export function validateSketch(value) {
  if (!Array.isArray(value) || value.length > MAX_STROKES) return false;
  let count = 0;
  return value.every(stroke => {
    if (!stroke || !INKS.has(stroke.color) || !SIZES.has(stroke.width)
      || !Array.isArray(stroke.points) || !stroke.points.length) return false;
    count += stroke.points.length;
    return count <= MAX_POINTS && stroke.points.every(point =>
      Array.isArray(point) && point.length === 2
      && Number.isFinite(point[0]) && point[0] >= 0 && point[0] <= WIDTH
      && Number.isFinite(point[1]) && point[1] >= 0 && point[1] <= HEIGHT
    );
  });
}

function element(name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

function createMark(stroke) {
  const [x, y] = stroke.points[0];
  const group = element('g');
  const line = element('polyline', {
    stroke: stroke.color, 'stroke-width': stroke.width,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none'
  });
  line.setAttribute('points', stroke.points.map(point => point.join(',')).join(' '));
  group.append(element('circle', {cx: x, cy: y, r: stroke.width / 2, fill: stroke.color}), line);
  return {group, line};
}

function bound(value, limit) {
  return Math.max(0, Math.min(limit, Math.round(value)));
}

function exportPng(strokes, notify) {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * 2;
  canvas.height = HEIGHT * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) { notify('PNG export is unavailable in this browser.'); return; }
  ctx.scale(2, 2);
  ctx.fillStyle = '#fffdf7';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of strokes) {
    const [x, y] = stroke.points[0];
    ctx.fillStyle = ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.beginPath();
    ctx.arc(x, y, stroke.width / 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (const point of stroke.points.slice(1)) ctx.lineTo(point[0], point[1]);
    ctx.stroke();
  }
  canvas.toBlob(blob => {
    if (!blob) { notify('PNG export could not be prepared.'); return; }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'declaration-sketch.png';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }, 'image/png');
}

export function mountSketch(root, saved = [], onChange = () => {}) {
  const id = 'decl-sketch-' + ++mountId;
  const valid = validateSketch(saved);
  let strokes = valid ? saved.slice() : [];
  let colour = [...INKS.keys()][0];
  let width = 6;
  let previous = [];
  let future = [];
  let active = null;
  let pointCount = 0;
  let keyboardPoint = [WIDTH / 2, HEIGHT / 2];
  let destroyed = false;
  const controller = new AbortController();
  const events = {signal: controller.signal};
  const wrapper = document.createElement('div');
  wrapper.className = 'decl-sketch';
  wrapper.innerHTML = `
    <div class="ds-tools">
      <div class="ds-colours" role="group" aria-label="Ink colour"></div>
      <label class="ds-size">Pen width
        <select><option value="3">Fine</option><option value="6" selected>Medium</option><option value="10">Broad</option></select>
      </label>
      <div class="ds-actions">
        <button type="button" data-action="undo">Undo</button>
        <button type="button" data-action="redo">Redo</button>
        <button type="button" data-action="clear">Clear</button>
        <button type="button" data-action="png">Save PNG</button>
      </div>
    </div>
    <div class="ds-paper"></div>
    <p class="ds-keyhelp" id="${id}-keys">Keyboard drawing: arrow keys move the pen. Space starts or finishes a stroke. Hold Shift for larger steps.</p>
    <p class="ds-status" aria-live="polite" role="status"></p>`;
  root.replaceChildren(wrapper);
  const colours = wrapper.querySelector('.ds-colours');
  const paper = wrapper.querySelector('.ds-paper');
  const stage = element('svg', {viewBox: '0 0 ' + WIDTH + ' ' + HEIGHT, tabindex: '0',
    role: 'group', 'aria-label': 'Drawing pad', 'aria-describedby': id + '-keys'});
  const marks = element('g');
  const cursor = element('circle', {r: '9', fill: 'none', stroke: '#425359',
    'stroke-width': '2', 'stroke-dasharray': '3 2', 'pointer-events': 'none', visibility: 'hidden'});
  stage.append(marks, cursor);
  paper.append(stage);
  const status = wrapper.querySelector('.ds-status');
  const notify = message => { status.textContent = message; };
  const buttons = Object.fromEntries([...wrapper.querySelectorAll('[data-action]')].map(b => [b.dataset.action, b]));

  function syncTools() {
    buttons.undo.disabled = active !== null || (!previous.length && !strokes.length);
    buttons.redo.disabled = active !== null || !future.length;
    buttons.clear.disabled = buttons.png.disabled = active !== null || !strokes.length;
  }
  function drawAll() {
    marks.replaceChildren(...strokes.map(stroke => createMark(stroke).group));
    pointCount = strokes.reduce((n, stroke) => n + stroke.points.length, 0);
    syncTools();
  }
  function record() {
    previous.push(strokes);
    if (previous.length > MAX_HISTORY) previous.shift();
    future = [];
  }
  function publish() {
    syncTools();
    onChange(strokes.slice());
  }
  function undo() {
    if (active || (!previous.length && !strokes.length)) return;
    future.push(strokes);
    if (future.length > MAX_HISTORY) future.shift();
    strokes = previous.length ? previous.pop() : strokes.slice(0, -1);
    drawAll();
    publish();
    notify('Undone.');
  }
  function redo() {
    if (active || !future.length) return;
    previous.push(strokes);
    if (previous.length > MAX_HISTORY) previous.shift();
    strokes = future.pop();
    drawAll();
    publish();
    notify('Redone.');
  }
  function start(point, pointerId) {
    if (active) return false;
    if (strokes.length >= MAX_STROKES || pointCount >= MAX_POINTS) {
      notify('The pad is full. Export a PNG, or undo strokes to make room.');
      return false;
    }
    const stroke = {color: colour, width, points: [point]};
    const {group, line} = createMark(stroke);
    marks.append(group);
    active = {pointerId, stroke, line};
    syncTools();
    return true;
  }
  function append(point) {
    if (!active) return;
    const points = active.stroke.points;
    const last = points[points.length - 1];
    if (point[0] === last[0] && point[1] === last[1]) return;
    if (points.length + pointCount >= MAX_POINTS) {
      finish();
      notify('The pad is full. Export a PNG, or undo strokes to make room.');
      return;
    }
    points.push(point);
    const svgPoint = stage.createSVGPoint();
    svgPoint.x = point[0]; svgPoint.y = point[1];
    active.line.points.appendItem(svgPoint);
  }
  function finish() {
    if (!active) return;
    const {stroke} = active;
    active = null;
    record();
    strokes = [...strokes, stroke];
    pointCount += stroke.points.length;
    publish();
  }
  function fromPointer(event) {
    const bounds = stage.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    return [bound((event.clientX - bounds.left) * WIDTH / bounds.width, WIDTH),
      bound((event.clientY - bounds.top) * HEIGHT / bounds.height, HEIGHT)];
  }
  function setCursor(show) {
    cursor.setAttribute('cx', keyboardPoint[0]);
    cursor.setAttribute('cy', keyboardPoint[1]);
    cursor.setAttribute('visibility', show ? 'visible' : 'hidden');
  }

  for (const [value, label] of INKS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ds-colour';
    button.setAttribute('aria-label', label + ' ink');
    button.setAttribute('aria-pressed', String(value === colour));
    button.title = label;
    button.style.setProperty('--ds-ink', value);
    button.addEventListener('click', () => {
      colour = value;
      for (const other of colours.children) other.setAttribute('aria-pressed', String(other === button));
    }, events);
    colours.append(button);
  }
  wrapper.querySelector('select').addEventListener('change', event => { width = Number(event.target.value); }, events);
  buttons.undo.addEventListener('click', undo, events);
  buttons.redo.addEventListener('click', redo, events);
  buttons.clear.addEventListener('click', () => {
    if (!strokes.length || !window.confirm('Clear this drawing? You can undo it while this pad is open.')) return;
    record();
    strokes = [];
    drawAll();
    publish();
    notify('Drawing cleared.');
  }, events);
  buttons.png.addEventListener('click', () => exportPng(strokes, notify), events);

  stage.addEventListener('pointerdown', event => {
    if (active || !event.isPrimary || event.button !== 0) return;
    const point = fromPointer(event);
    if (!point || !start(point, event.pointerId)) return;
    event.preventDefault();
    setCursor(false);
    stage.setPointerCapture(event.pointerId);
  }, events);
  stage.addEventListener('pointermove', event => {
    if (event.pointerId !== active?.pointerId) return;
    const samples = event.getCoalescedEvents?.() || [];
    for (const sample of samples.length ? samples : [event]) {
      const point = fromPointer(sample);
      if (point) append(point);
    }
  }, events);
  stage.addEventListener('pointerup', event => {
    if (event.pointerId !== active?.pointerId) return;
    const point = fromPointer(event);
    if (point) append(point);
    finish();
  }, events);
  for (const name of ['pointercancel', 'lostpointercapture']) {
    stage.addEventListener(name, event => {
      if (event.pointerId === active?.pointerId) finish();
    }, events);
  }
  stage.addEventListener('focus', () => setCursor(true), events);
  stage.addEventListener('blur', () => {
    if (active?.pointerId === 'keyboard') finish();
    setCursor(false);
  }, events);
  stage.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || (active && active.pointerId !== 'keyboard')) return;
    if (event.key === ' ') {
      event.preventDefault();
      if (event.repeat) return;
      if (active) { finish(); notify('Stroke finished.'); }
      else if (start(keyboardPoint.slice(), 'keyboard')) notify('Drawing.');
      setCursor(true);
      return;
    }
    if (event.key === 'Escape' && active) { finish(); notify('Stroke finished.'); return; }
    const steps = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]};
    const direction = steps[event.key];
    if (!direction) return;
    event.preventDefault();
    const step = event.shiftKey ? 32 : 8;
    keyboardPoint = [bound(keyboardPoint[0] + direction[0] * step, WIDTH), bound(keyboardPoint[1] + direction[1] * step, HEIGHT)];
    if (active) append(keyboardPoint.slice());
    setCursor(true);
  }, events);
  // Commit interrupted marks while the parent's per-item save callback is still active.
  window.addEventListener('pagehide', finish, events);
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish(); }, events);
  drawAll();
  if (!valid) notify('This drawing could not be read.');
  return {
    getValue: () => strokes.slice(),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      try { finish(); }
      finally { controller.abort(); wrapper.remove(); }
    }
  };
}
