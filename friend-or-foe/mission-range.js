import {drawCarrier, drawPlacard, drawRange, drawSight, inTarget, targetRect} from './mission-scene.js';

const LANES = 5;
const ROSTER_SIZE = 10;
const PORTRAITS = ['cyclops', 'stalker', 'reader', 'moth', 'crab'];
const DIRECTIONS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

function shuffle(items, random) {
  const deck = items.slice();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export class MissionRun {
  #pair;

  constructor(names, answerPair, random = Math.random) {
    if (names.length !== ROSTER_SIZE || new Set(names).size !== ROSTER_SIZE ||
        answerPair.length !== 2 || new Set(answerPair).size !== 2 ||
        !answerPair.every(name => names.includes(name))) {
      throw new Error('A mission needs ten distinct names and two distinct roster members in its order.');
    }
    this.#pair = new Set(answerPair);
    // Position, speed, appearance, and entry order are independent of the answer.
    const cast = shuffle([...PORTRAITS, ...PORTRAITS], random);
    this.queue = shuffle(names, random).map((name, i) => ({name, species: cast[i]}));
    this.speeds = shuffle([9, 11, 13, 15, 17], random);
    this.random = random;
    this.lanes = Array(LANES).fill(null);
    this.passed = 0;
    this.selected = [];
    this.correct = false;
    this.complete = false;
    for (let lane = 0; lane < LANES; lane++) this.refill(lane);
  }

  refill(lane) {
    const next = this.queue.shift();
    this.lanes[lane] = next ? {
      ...next, lane, elapsed: 0, duration: this.speeds[lane] + this.random() * 0.7
    } : null;
  }

  resolve(target, pick) {
    if (this.complete || !target || this.lanes[target.lane] !== target) return false;
    if (pick) {
      if (this.selected.length >= 2) return false;
      this.selected.push(target.name);
    } else {
      this.passed++;
    }
    this.correct = this.selected.length === 2 && this.selected.every(name => this.#pair.has(name));
    this.complete = this.correct || this.selected.length + this.passed === ROSTER_SIZE;
    if (this.complete) this.lanes.fill(null);
    else this.refill(target.lane);
    return true;
  }

  choose(target) { return this.resolve(target, true); }
  pass(target) { return this.resolve(target, false); }

  advance(seconds) {
    // If two reach the line in the same frame, admit replacements at their actual arrival times.
    while (!this.complete && seconds > 0) {
      const moving = this.lanes.filter(Boolean);
      const next = moving.reduce((a, b) => a.duration - a.elapsed <= b.duration - b.elapsed ? a : b);
      const remaining = Math.max(0, next.duration - next.elapsed);
      const elapsed = Math.min(seconds, remaining);
      for (const target of moving) target.elapsed += elapsed;
      if (seconds < remaining) break;
      seconds -= elapsed;
      this.pass(next);
    }
  }

  snapshot() {
    return {
      shots: this.selected.length, selected: this.selected.slice(), passed: this.passed,
      active: this.lanes.filter(Boolean).length, total: ROSTER_SIZE, finished: this.complete
    };
  }
}

export function createRange({canvas, labels, onUpdate = () => {}, onFinish = () => {}}) {
  const ctx = canvas.getContext('2d', {alpha: false});
  const background = document.createElement('canvas');
  const sprites = PORTRAITS.map(species => Array.from({length: LANES}, (_, lane) => {
    const sprite = document.createElement('canvas');
    sprite.width = 25;
    sprite.height = 30;
    drawPlacard(sprite.getContext('2d'), species, lane);
    return sprite;
  }));
  const events = new AbortController();
  const held = new Set();
  const tags = Array(LANES).fill(null);
  const aim = {x: 0.5, y: 0.5};
  let run = null;
  let previewLanes = [];
  let paused = false;
  let fastForwarding = false;
  let locked = null;
  let lastAimed = null;
  let showSight = false;
  let pulse = null;
  let lastFrame = null;
  let frameId = 0;

  function playing() { return run !== null && !run.complete && !paused; }
  function rect(target) {
    return targetRect(canvas.width, canvas.height, target.lane, Math.min(1, target.elapsed / target.duration));
  }

  function aimed(padding = 0) {
    if (!playing()) return null;
    return run.lanes.find(target => target && inTarget(rect(target), aim.x * canvas.width, aim.y * canvas.height, padding)) || null;
  }

  function report() {
    if (!run) return;
    lastAimed = aimed()?.name || null;
    onUpdate({...run.snapshot(), paused, fastForwarding, aimed: lastAimed});
  }

  function updateTag(target, bounds) {
    const lane = target.lane;
    const clickable = playing() && run.selected.length < 2;
    let tag = tags[lane];
    if (tag?.target !== target || tag.clickable !== clickable) {
      const node = document.createElement(clickable ? 'button' : 'span');
      node.className = 'nameplate';
      node.textContent = target.name;
      if (clickable) {
        node.type = 'button';
        node.setAttribute('aria-label', 'Select ' + target.name + ', lane ' + (lane + 1));
        node.addEventListener('click', () => {
          if (run?.lanes[lane] !== target || !playing()) return;
          canvas.focus({preventScroll: true});
          aimLane(lane);
          act(target, true);
        });
      }
      if (tag) tag.node.replaceWith(node);
      else labels.append(node);
      tag = tags[lane] = {target, node, clickable};
    }
    tag.node.style.left = (bounds.x + bounds.w / 2) * 100 / canvas.width + '%';
    tag.node.style.top = (bounds.floor + 2) * 100 / canvas.height + '%';
  }

  function removeTag(lane) {
    tags[lane]?.node.remove();
    tags[lane] = null;
  }

  function track() {
    if (locked && run?.lanes[locked.lane] === locked) {
      const box = rect(locked);
      aim.x = (box.x + box.w / 2) / canvas.width;
      aim.y = (box.y + box.h / 2) / canvas.height;
    } else locked = null;
  }

  function paint() {
    if (!canvas.width || !canvas.height) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(background, 0, 0);
    const lanes = run ? run.lanes : previewLanes;
    for (let lane = 0; lane < LANES; lane++) {
      const target = lanes[lane];
      if (!target) { removeTag(lane); continue; }
      const bounds = rect(target);
      drawCarrier(ctx, bounds, sprites[PORTRAITS.indexOf(target.species)][lane]);
      updateTag(target, bounds);
    }
    track();
    if (pulse) {
      const x = Math.round(pulse.x * canvas.width);
      const y = Math.round(pulse.y * canvas.height);
      const r = Math.round(3 + (0.22 - pulse.time) * 30);
      ctx.fillStyle = '#e7c294';
      for (const dx of [-r, r]) for (const dy of [-r, r]) ctx.fillRect(x + dx, y + dy, 2, 2);
    }
    if (playing() && showSight) drawSight(ctx, aim.x * canvas.width, aim.y * canvas.height);
  }

  function resize() {
    const box = canvas.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) return;
    const scale = Math.min(1, 480 / box.width, 270 / box.height);
    const width = Math.max(1, Math.round(box.width * scale));
    const height = Math.max(1, Math.round(box.height * scale));
    canvas.width = background.width = width;
    canvas.height = background.height = height;
    drawRange(background.getContext('2d'), width, height);
    paint();
  }

  function stopClock() {
    cancelAnimationFrame(frameId);
    frameId = 0;
    lastFrame = null;
    held.clear();
  }

  function settled() {
    paint();
    report();
    if (run.complete) {
      stopClock();
      onFinish({...run.snapshot(), correct: run.correct, fastForwarding});
    }
  }

  function act(target, pick) {
    if (!playing() || !target) return false;
    const box = rect(target);
    if (!(pick ? run.choose(target) : run.pass(target))) return false;
    if (pick) pulse = {
      x: (box.x + box.w / 2) / canvas.width, y: (box.y + box.h / 2) / canvas.height, time: 0.22
    };
    settled();
    return true;
  }

  function moveSight(seconds) {
    const dx = Number(held.has('ArrowRight')) - Number(held.has('ArrowLeft'));
    const dy = Number(held.has('ArrowDown')) - Number(held.has('ArrowUp'));
    if (!dx && !dy) return;
    const distance = Math.min(canvas.width, canvas.height) * 0.75 * seconds / Math.hypot(dx, dy);
    aim.x = Math.min(1, Math.max(0, aim.x + dx * distance / canvas.width));
    aim.y = Math.min(1, Math.max(0, aim.y + dy * distance / canvas.height));
  }

  function tick(now) {
    frameId = 0;
    if (!playing()) return;
    const dt = lastFrame === null ? 0 : Math.max(0, Math.min(0.12, (now - lastFrame) / 1000));
    lastFrame = now;
    moveSight(dt);
    if (pulse && (pulse.time -= dt) <= 0) pulse = null;
    const before = run.passed;
    run.advance(dt * (fastForwarding ? 4 : 1));
    if (run.passed !== before) settled();
    else {
      paint();
      if ((aimed()?.name || null) !== lastAimed) report();
    }
    if (playing()) frameId = requestAnimationFrame(tick);
  }

  function preview(names) {
    stopClock();
    run = null;
    fastForwarding = false;
    locked = null;
    pulse = null;
    previewLanes = names.slice(0, LANES).map((name, lane) => ({
      name, lane, species: PORTRAITS[lane], elapsed: [.54, .28, .71, .37, .59][lane], duration: 1
    }));
    resize();
  }

  function start(names, answerPair) {
    stopClock();
    run = new MissionRun(names, answerPair);
    paused = false;
    fastForwarding = false;
    locked = null;
    pulse = null;
    aim.x = 0.5;
    aim.y = 0.49;
    showSight = true;
    resize();
    report();
    canvas.focus({preventScroll: true});
    frameId = requestAnimationFrame(tick);
  }

  function pause() {
    if (!playing()) return;
    paused = true;
    stopClock();
    paint();
    report();
  }

  function resume() {
    if (!run || run.complete || !paused) return;
    paused = false;
    resize();
    report();
    canvas.focus({preventScroll: true});
    frameId = requestAnimationFrame(tick);
  }

  function aimLane(lane) {
    if (!playing() || !run.lanes[lane]) return false;
    locked = run.lanes[lane];
    showSight = true;
    track();
    paint();
    report();
    return true;
  }

  function point(event) {
    const box = canvas.getBoundingClientRect();
    locked = null;
    aim.x = (event.clientX - box.left) / box.width;
    aim.y = (event.clientY - box.top) / box.height;
    showSight = event.pointerType !== 'touch';
  }

  function select(padding = 0) {
    const target = aimed(padding);
    if (target) return act(target, true);
    if (playing() && run.selected.length < 2) {
      pulse = {x: aim.x, y: aim.y, time: 0.22};
      paint();
    }
    return false;
  }

  const opts = {signal: events.signal};
  canvas.addEventListener('pointermove', event => {
    if (playing() && event.isPrimary) point(event);
  }, opts);
  canvas.addEventListener('pointerdown', event => {
    if (!playing() || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    canvas.focus({preventScroll: true});
    point(event);
    select(event.pointerType === 'touch' ? 1 : 0);
  }, opts);
  canvas.addEventListener('keydown', event => {
    if (!playing() || event.altKey || event.ctrlKey || event.metaKey) return;
    const laneKey = /^(?:Digit|Numpad)([1-5])$/.exec(event.code);
    if (laneKey) {
      event.preventDefault();
      aimLane(Number(laneKey[1]) - 1);
    } else if (DIRECTIONS.has(event.code)) {
      event.preventDefault();
      held.add(event.code);
      showSight = true;
      locked = null;
    } else if (event.code === 'Space' || event.code === 'KeyF') {
      event.preventDefault();
      if (!event.repeat) {
        if (event.code === 'Space') select();
        else act(aimed(), false);
      }
    }
  }, opts);
  canvas.addEventListener('keyup', event => held.delete(event.code), opts);
  canvas.addEventListener('blur', () => held.clear(), opts);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  function destroy() {
    stopClock();
    run = null;
    events.abort();
    observer.disconnect();
    for (let lane = 0; lane < LANES; lane++) removeTag(lane);
  }

  function fastForward() {
    if (!playing() || run.selected.length !== 2 || fastForwarding) return false;
    fastForwarding = true;
    report();
    return true;
  }

  return {
    start, pause, resume, preview, aimLane, fastForward, destroy,
    select() {
      if (playing()) canvas.focus({preventScroll: true});
      return select();
    },
    pass() {
      if (playing()) canvas.focus({preventScroll: true});
      return act(aimed(), false);
    }
  };
}
