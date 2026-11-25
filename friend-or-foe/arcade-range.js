import {drawStage, drawCutout, drawTrolley, targetBounds, hitCutout, SPECIES} from './arcade-scene.js';
import {drawSight} from './mission-scene.js';

const COUNT = 10;
const SLOTS = Array.from({length: COUNT}, (_, index) => index);
const DEFAULT_NAMES = ['Mira', 'Tess', 'Nia', 'Luma', 'Vale', 'Pia', 'Ivo', 'Dex', 'Sol', 'Orin'];
const ARROWS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

function shuffle(values, random) {
  const shuffled = values.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Each item gets a different value, while excluding assignments from the previous round.
function deal(values, allowed, random) {
  const options = SLOTS.map(index => shuffle(values.filter(value => allowed(index, value)), random));
  const owner = new Map();
  function allocate(index, visited) {
    for (const value of options[index]) {
      if (visited.has(value)) continue;
      visited.add(value);
      if (!owner.has(value) || allocate(owner.get(value), visited)) {
        owner.set(value, index);
        return true;
      }
    }
    return false;
  }
  for (const index of SLOTS) {
    if (!allocate(index, new Set())) throw new Error('Could not deal all ten cutouts.');
  }
  const assignment = [];
  for (const [value, index] of owner) assignment[index] = value;
  return assignment;
}

function dealTargets(names, previous, random) {
  const byName = new Map(previous.map(t => [t.name, t]));
  const bySlot = new Map(previous.map(t => [t.slot, t]));
  const bySpecies = new Map(previous.map(t => [t.species, t]));
  const slots = deal(SLOTS, (i, value) => value !== byName.get(names[i])?.slot, random);
  const types = deal(SPECIES, (i, value) =>
    value !== byName.get(names[i])?.species && value !== bySlot.get(slots[i])?.species, random);
  const paces = deal(SLOTS, (i, value) =>
    value !== byName.get(names[i])?.pace && value !== bySlot.get(slots[i])?.pace &&
    value !== bySpecies.get(types[i])?.pace, random);
  return names.map((name, i) => ({
    name, slot: slots[i], species: types[i], pace: paces[i],
    duration: 20 + paces[i] * 2.25 + random() * 1.25, elapsed: 0,
    offsetX: random() * 2 - 1, offsetY: random() * 2 - 1, state: 'moving'
  })).sort((a, b) => a.slot - b.slot);
}

export class ArcadeRun {
  #pair;
  constructor(names, pair, previousTargets = [], random = Math.random) {
    if (names.length !== COUNT || new Set(names).size !== COUNT || pair.length !== 2 ||
        new Set(pair).size !== 2 || !pair.every(name => names.includes(name))) {
      throw new Error('A trial needs ten different names and two different names from that roster.');
    }
    this.#pair = new Set(pair);
    this.targets = dealTargets(names, previousTargets, random);
    this.elapsed = 0;
    this.shotLog = [];
    this.passed = [];
    this.complete = false;
    this.reason = null;
  }

  finishIfDecided() {
    const liveThreat = this.targets.some(t => t.state === 'moving' && this.#pair.has(t.name));
    const bothHit = this.shotLog.length === 2 && this.shotLog.every(s => this.#pair.has(s.name));
    if (bothHit) this.reason = 'pair';
    else if (this.shotLog.length === 2) this.reason = 'ammo';
    else if (!liveThreat) this.reason = 'escaped';
    this.complete = this.reason !== null;
  }

  fire(target) {
    if (this.complete) return false;
    const hit = target?.state === 'moving' && this.targets[target.slot] === target;
    if (hit) target.state = 'hit';
    this.shotLog.push({name: hit ? target.name : null, elapsed: this.elapsed});
    this.finishIfDecided();
    return true;
  }

  advance(seconds) {
    if (this.complete || !Number.isFinite(seconds) || seconds <= 0) return;
    const moving = this.targets.filter(t => t.state === 'moving');
    const lastThreat = Math.max(...moving.filter(t => this.#pair.has(t.name)).map(t => t.duration));
    this.elapsed = Math.min(this.elapsed + seconds, lastThreat);
    const passed = [];
    for (const target of moving) {
      target.elapsed = Math.min(this.elapsed, target.duration);
      if (target.elapsed >= target.duration) {
        target.state = 'passed';
        passed.push(target);
      }
    }
    if (passed.length) {
      passed.sort((a, b) => a.duration - b.duration);
      this.passed.push(...passed.map(t => t.name));
      this.finishIfDecided();
    }
  }

  snapshot() {
    return {
      shots: this.shotLog.length, bullets: 2 - this.shotLog.length,
      selected: this.shotLog.filter(s => s.name !== null).map(s => s.name),
      passed: this.passed.slice(), escaped: this.passed.length,
      active: this.targets.filter(t => t.state === 'moving').length, total: COUNT,
      finished: this.complete, elapsed: this.elapsed
    };
  }

  result() {
    if (!this.complete) return null;
    return {
      ...this.snapshot(), correct: this.reason === 'pair', reason: this.reason,
      escapedThreats: this.passed.filter(name => this.#pair.has(name)),
      shotLog: this.shotLog.map(shot => ({...shot}))
    };
  }
}

export function createArcadeRange({canvas, labels, onUpdate = () => {}, onFinish = () => {}}) {
  const ctx = canvas.getContext('2d', {alpha: false});
  const background = document.createElement('canvas');
  const sprites = new Map(SPECIES.map(species => {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 19;
    drawCutout(sprite.getContext('2d'), species);
    return [species, sprite];
  }));
  const events = new AbortController();
  const opts = {signal: events.signal};
  const held = new Set();
  const tags = Array(COUNT).fill(null);
  const cursor = {x: .5, y: .51};
  let run = null;
  let previous = [];
  let demo = [];
  let lock = null;
  let pulse = null;
  let paused = false;
  let frameId = 0;
  let lastTime = null;
  let announcedEnd = false;
  let lastAimed = null;
  let lastInterval = -1;
  let lastPassed = 0;

  function playing() { return run && !run.complete && !paused; }
  function bounds(t) { return targetBounds(canvas.width, canvas.height, t); }
  function aimed(pad = 0) {
    if (!playing()) return null;
    if (lock?.state === 'moving') return lock;
    return run.targets.find(t => t.state === 'moving' && hitCutout(
      bounds(t), t.species, cursor.x*canvas.width, cursor.y*canvas.height, pad
    )) || null;
  }

  function stopClock() {
    cancelAnimationFrame(frameId);
    frameId = 0;
    lastTime = null;
    held.clear();
  }

  function publish(force = false) {
    if (!run) return;
    const aimedName = aimed()?.name ?? null;
    const interval = Math.floor(run.elapsed * 5);
    if (force || aimedName !== lastAimed || interval !== lastInterval || run.passed.length !== lastPassed) {
      lastAimed = aimedName;
      lastInterval = interval;
      lastPassed = run.passed.length;
      onUpdate({...run.snapshot(), aimed: aimedName, paused});
    }
    if (run.complete && !announcedEnd) {
      announcedEnd = true;
      stopClock();
      onFinish(run.result());
    }
  }

  function tagTarget(target, r) {
    const {slot, name} = target;
    const clickable = !!playing();
    let tag = tags[slot];
    if (tag?.target !== target || tag.clickable !== clickable) {
      const node = document.createElement(clickable ? 'button' : 'span');
      node.className = 'nameplate';
      node.textContent = name;
      if (clickable) {
        node.type = 'button';
        node.setAttribute('aria-label', 'Shoot ' + name + ', lane ' + (slot + 1));
        node.addEventListener('click', () => {
          if (!playing() || run.targets[slot] !== target || target.state !== 'moving') return;
          canvas.focus({preventScroll: true});
          lock = target;
          followLock();
          shoot(target);
        });
      }
      if (tag) tag.node.replaceWith(node);
      else labels.append(node);
      tag = tags[slot] = {node, target, clickable};
    }
    tag.node.style.left = ((r.x+r.w/2)/canvas.width*100) + '%';
    tag.node.style.top = ((r.floor+4)/canvas.height*100) + '%';
  }

  function removeTag(slot) {
    tags[slot]?.node.remove();
    tags[slot] = null;
  }

  function followLock() {
    if (!lock || lock.state !== 'moving') { lock = null; return; }
    const r = bounds(lock);
    cursor.x = (r.x + r.w*.5) / canvas.width;
    cursor.y = (r.y + r.h*.54) / canvas.height;
  }

  function draw() {
    if (!canvas.width || !canvas.height) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(background, 0, 0);
    const roster = run ? run.targets : demo;
    for (const slot of SLOTS) {
      const target = roster[slot];
      if (!target || target.state !== 'moving') { removeTag(slot); continue; }
      const r = bounds(target);
      drawTrolley(ctx, r, sprites.get(target.species), slot);
      tagTarget(target, r);
    }
    followLock();
    if (pulse) {
      const x = Math.round(pulse.x*canvas.width);
      const y = Math.round(pulse.y*canvas.height);
      const reach = 3+Math.round((.22-pulse.time)*35);
      ctx.fillStyle = '#efd59e';
      for (const dx of [-1,1]) for (const dy of [-1,1]) ctx.fillRect(x+dx*reach,y+dy*reach,2,2);
    }
    if (playing()) drawSight(ctx, cursor.x*canvas.width, cursor.y*canvas.height);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const scale = Math.min(1, 520/rect.width, 295/rect.height);
    canvas.width = background.width = Math.max(1,Math.round(rect.width*scale));
    canvas.height = background.height = Math.max(1,Math.round(rect.height*scale));
    drawStage(background.getContext('2d'), canvas.width, canvas.height);
    draw();
  }

  function updateClock(now) {
    if (!playing() || lastTime === null) return;
    const dt = Math.max(0, (now-lastTime)/1000);
    lastTime = Math.max(now, lastTime);
    const dx = Number(held.has('ArrowRight')) - Number(held.has('ArrowLeft'));
    const dy = Number(held.has('ArrowDown')) - Number(held.has('ArrowUp'));
    if (dx || dy) {
      const dist = Math.min(canvas.width,canvas.height)*.8*Math.min(dt,.15)/Math.hypot(dx,dy);
      cursor.x = Math.min(1,Math.max(0,cursor.x+dist*dx/canvas.width));
      cursor.y = Math.min(1,Math.max(0,cursor.y+dist*dy/canvas.height));
    }
    if (pulse && (pulse.time -= dt) <= 0) pulse = null;
    run.advance(dt);
    followLock();
  }

  function tick(now) {
    frameId = 0;
    if (!playing()) return;
    updateClock(now);
    draw();
    publish();
    if (playing() && !frameId) frameId = requestAnimationFrame(tick);
  }

  function preview(names = DEFAULT_NAMES) {
    stopClock();
    run = null;
    paused = false;
    lock = pulse = null;
    demo = dealTargets(names, [], Math.random);
    demo.forEach(t => {t.elapsed = t.duration*(.16 + (t.slot*7%10)*.055);});
    resize();
  }

  function start(names, pair) {
    stopClock();
    run = new ArcadeRun(names, pair, previous);
    previous = run.targets;
    lock = pulse = null;
    paused = announcedEnd = false;
    cursor.x = .5;
    cursor.y = .51;
    lastTime = performance.now();
    resize();
    publish(true);
    canvas.focus({preventScroll: true});
    frameId = requestAnimationFrame(tick);
  }

  function pause() {
    if (!playing()) return;
    updateClock(performance.now());
    paused = !run.complete;
    stopClock();
    draw();
    publish(true);
  }

  function resume() {
    if (!paused || !run || run.complete) return;
    paused = false;
    lastTime = performance.now();
    resize();
    publish(true);
    canvas.focus({preventScroll: true});
    frameId = requestAnimationFrame(tick);
  }

  function aimSlot(slot) {
    if (!playing()) return false;
    const target = run.targets[slot];
    lock = target?.state === 'moving' ? target : null;
    if (!lock && target) {
      const r = bounds(target);
      cursor.x = (r.x + r.w*.5)/canvas.width;
      cursor.y = (r.y + r.h*.54)/canvas.height;
    }
    followLock();
    draw();
    publish(true);
    return !!lock;
  }

  function shoot(namedTarget, pad = 0) {
    if (!playing()) return false;
    updateClock(performance.now());
    if (run.complete) { draw(); publish(true); return false; }
    const target = namedTarget || aimed(pad);
    pulse = {x: cursor.x, y: cursor.y, time: .22};
    run.fire(target);
    lock = null;
    draw();
    publish(true);
    return true;
  }

  function point(event) {
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    lock = null;
    cursor.x = (event.clientX-box.left)/box.width;
    cursor.y = (event.clientY-box.top)/box.height;
  }

  canvas.addEventListener('pointermove', event => {
    if (playing() && event.isPrimary) point(event);
  }, opts);
  canvas.addEventListener('pointerdown', event => {
    if (!playing() || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    canvas.focus({preventScroll:true});
    point(event);
    shoot(null, event.pointerType === 'touch' ? 2 : 0);
  }, opts);
  canvas.addEventListener('keydown', event => {
    if (!playing() || event.altKey || event.ctrlKey || event.metaKey) return;
    const digit = /^(?:Digit|Numpad)(\d)$/.exec(event.code);
    if (digit) {
      event.preventDefault();
      if (!event.repeat) aimSlot((Number(digit[1])+9)%10);
    } else if (ARROWS.has(event.code)) {
      event.preventDefault();
      lock = null;
      held.add(event.code);
    } else if (event.code === 'Space') {
      event.preventDefault();
      if (!event.repeat) shoot();
    }
  }, opts);
  canvas.addEventListener('keyup', event => held.delete(event.code), opts);
  canvas.addEventListener('blur', () => held.clear(), opts);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  preview();

  return {
    start, pause, resume, preview, aimSlot,
    fire() {
      if (playing()) canvas.focus({preventScroll:true});
      return shoot();
    },
    destroy() {
      stopClock();
      run = null;
      events.abort();
      observer.disconnect();
      SLOTS.forEach(removeTag);
    }
  };
}
