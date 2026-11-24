import {advance, decide, newRound, species, TARGET_COUNT, totals, CHANGEOVER} from './round.js';
import {drawCarrier, drawPlacard, drawRange, drawSight, inTarget, targetRect} from './scene.js';

const byId = id => document.getElementById(id);
const canvas = byId('range');
const ctx = canvas.getContext('2d', {alpha: false});
const backdrop = document.createElement('canvas');
const sprites = new Map();
for (const name of species) {
  for (const role of ['friend', 'foe']) {
    const sprite = document.createElement('canvas');
    sprite.width = 25;
    sprite.height = 30;
    drawPlacard(sprite.getContext('2d'), {species: name, role});
    sprites.set(name + role, sprite);
  }
}
const sample = {species: 'cyclops', role: 'foe'};
const dots = Array.from({length: TARGET_COUNT}, () => byId('pips').appendChild(document.createElement('i')));
const arrows = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const held = new Set();
const aim = {x: 0.5, y: 0.5};
let mode = 'ready';
let round = null;
let lastFrame = null;
let frameId = 0;
let shot = null;
let sound = true;
let audio = null;
let showSight = true;

function beep(from, to, duration = 0.12) {
  if (!sound) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    const when = audio.currentTime;
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(from, when);
    oscillator.frequency.exponentialRampToValueAtTime(to, when + duration);
    volume.gain.setValueAtTime(0.065, when);
    volume.gain.exponentialRampToValueAtTime(0.001, when + duration);
    oscillator.connect(volume).connect(audio.destination);
    oscillator.start(when);
    oscillator.stop(when + duration);
  } catch { /* The game also runs without Web Audio. */ }
}

function state(next) {
  mode = next;
  document.body.dataset.phase = next;
  const started = next === 'playing' || next === 'paused';
  byId('pause').disabled = !started;
  byId('pause').textContent = next === 'paused' ? 'Resume' : 'Pause';
  byId('fire').hidden = byId('pass').hidden = !started;
  byId('panel').hidden = next === 'playing';
  byId('summary').hidden = next !== 'complete';
  held.clear();
  lastFrame = null;
  if (next !== 'playing') {
    cancelAnimationFrame(frameId);
    frameId = 0;
  }
}

function syncHUD() {
  const score = totals(round).score;
  byId('score').textContent = String(score).padStart(4, '0');
  byId('target-count').textContent = String(round.index + 1).padStart(2, '0');
  const canDecide = mode === 'playing' && round.phase === 'approach';
  byId('pass').disabled = byId('fire').disabled = !canDecide;
  dots.forEach((dot, i) => {
    const result = round.results[i];
    dot.className = result ? (result.correct ? 'correct' : 'wrong') : (i === round.index ? 'current' : '');
  });
}

function announceTarget() {
  const {lane, role} = round.targets[round.index];
  const position = ['Left', 'Middle', 'Right'][lane + 1];
  const mark = role === 'foe' ? 'An X' : 'A heart';
  byId('target-description').textContent = 'Target ' + (round.index + 1) + '. ' + position + ' rail. ' + mark + ' on the placard.';
}

function feedback() {
  const {role, action, correct} = round.results.at(-1);
  const verdict = role === 'friend' ? (correct ? 'Friend spared' : 'Friend hit') : (correct ? 'Foe hit' : 'Foe passed');
  const message = byId('verdict');
  message.textContent = verdict + (correct ? '  +100' : '  +0');
  message.dataset.tone = correct ? 'correct' : 'wrong';
  if (role === 'foe' && action === 'fire') beep(600, 220);
  else if (correct) beep(320, 570);
  else beep(165, 83, 0.19);
  syncHUD();
}

function start() {
  round = newRound();
  shot = null;
  aim.x = 0.5;
  aim.y = 0.49;
  showSight = true;
  state('playing');
  byId('verdict').textContent = '';
  syncHUD();
  announceTarget();
  beep(285, 445, 0.1);
  canvas.focus({preventScroll: true});
  resize();
  schedule();
}

function end() {
  const {score, friends, foes, correct} = totals(round);
  state('complete');
  byId('verdict').textContent = '';
  byId('target-description').textContent = '';
  byId('panel-title').textContent = 'Round complete';
  byId('panel-copy').textContent = correct + ' of 10 correct · ' + score.toLocaleString() + ' points.';
  byId('foes-hit').textContent = foes + ' / 5';
  byId('friends-spared').textContent = friends + ' / 5';
  byId('start').textContent = 'Play again';
  syncHUD();
  resize();
  byId('start').focus({preventScroll: true});
}

function pause() {
  if (mode !== 'playing') return;
  state('paused');
  byId('panel-title').textContent = 'Paused';
  byId('panel-copy').textContent = 'The target will continue from here when you resume.';
  byId('start').textContent = 'Resume round';
  syncHUD();
  resize();
}

function resume() {
  if (mode !== 'paused' || byId('help').open) return;
  state('playing');
  syncHUD();
  canvas.focus({preventScroll: true});
  resize();
  schedule();
}

function activeRect() {
  const target = round.targets[round.index];
  return targetRect(canvas.width, canvas.height, target.lane, round.elapsed / target.duration);
}

function fire(touch = false) {
  if (mode !== 'playing' || round.phase !== 'approach') return;
  const x = aim.x * canvas.width;
  const y = aim.y * canvas.height;
  shot = {x: aim.x, y: aim.y, age: 0};
  const padding = touch ? 2 : 0;
  if (inTarget(activeRect(), x, y, padding)) {
    decide(round, 'fire');
    feedback();
  } else {
    byId('verdict').textContent = 'Wide';
    byId('verdict').dataset.tone = '';
    beep(170, 90, 0.08);
  }
  paint();
}

function letPass() {
  if (mode !== 'playing' || round.phase !== 'approach') return;
  decide(round, 'pass');
  feedback();
  paint();
}

function resize() {
  const box = canvas.getBoundingClientRect();
  if (!box.width || !box.height) return;
  const scale = Math.min(480 / box.width, 270 / box.height, 1);
  const w = Math.max(1, Math.round(box.width * scale));
  const h = Math.max(1, Math.round(box.height * scale));
  if (backdrop.width !== w || backdrop.height !== h || canvas.width !== w || canvas.height !== h) {
    canvas.width = backdrop.width = w;
    canvas.height = backdrop.height = h;
    drawRange(backdrop.getContext('2d'), w, h);
  }
  paint();
}

function paint() {
  const {width, height} = canvas;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(backdrop, 0, 0);
  if (mode === 'ready' || mode === 'complete') {
    const previewLane = innerWidth / innerHeight < 0.8 ? 0 : 1;
    const preview = targetRect(width, height, previewLane, 0.96);
    drawCarrier(ctx, preview, sprites.get(sample.species + sample.role));
    return;
  }
  const target = round.targets[round.index];
  const rect = activeRect();
  let folded = 0;
  if (round.phase === 'feedback') {
    folded = Math.min(1, round.feedbackTime / (CHANGEOVER * 0.7));
  }
  drawCarrier(ctx, rect, sprites.get(target.species + target.role), folded);
  if (shot && shot.age < 0.16) {
    const offset = Math.round(2 + 26 * shot.age);
    const x = Math.round(width * shot.x);
    const y = Math.round(height * shot.y);
    ctx.fillStyle = '#ffaf82';
    for (const dx of [-1, 1]) {
      for (const dy of [-1, 1]) ctx.fillRect(x + offset * dx, y + offset * dy, 2, 2);
    }
  }
  if (mode === 'playing' && showSight) drawSight(ctx, aim.x * width, aim.y * height);
}

function moveSight(seconds) {
  const dx = Number(held.has('ArrowRight')) - Number(held.has('ArrowLeft'));
  const dy = Number(held.has('ArrowDown')) - Number(held.has('ArrowUp'));
  if (!dx && !dy) return;
  const travel = Math.min(canvas.width, canvas.height) * 0.75 * seconds / Math.hypot(dx, dy);
  aim.x = Math.min(1, Math.max(0, aim.x + dx * travel / canvas.width));
  aim.y = Math.min(1, Math.max(0, aim.y + dy * travel / canvas.height));
}

function tick(now) {
  frameId = 0;
  if (mode !== 'playing') return;
  const dt = lastFrame === null ? 0 : Math.min(0.1, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  moveSight(dt);
  if (shot) {
    shot.age += dt;
    if (shot.age > 0.4) {
      shot = null;
      if (round.phase === 'approach') byId('verdict').textContent = '';
    }
  }
  const phase = round.phase;
  advance(round, dt);
  if (round.phase !== phase) {
    if (round.phase === 'complete') { end(); return; }
    if (round.phase === 'feedback') feedback();
    else {
      byId('verdict').textContent = '';
      syncHUD();
      announceTarget();
    }
  }
  paint();
  schedule();
}

function schedule() {
  if (!frameId && mode === 'playing') frameId = requestAnimationFrame(tick);
}

function point(event) {
  const box = canvas.getBoundingClientRect();
  aim.x = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
  aim.y = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height));
  showSight = event.pointerType !== 'touch';
}

canvas.addEventListener('pointermove', event => {
  if (mode === 'playing' && event.isPrimary) point(event);
});
canvas.addEventListener('pointerleave', () => { showSight = false; });
canvas.addEventListener('pointerdown', event => {
  if (mode !== 'playing' || !event.isPrimary || event.button !== 0) return;
  event.preventDefault();
  canvas.focus({preventScroll: true});
  point(event);
  fire(event.pointerType === 'touch');
});
document.addEventListener('keydown', event => {
  if (event.altKey || event.metaKey || event.ctrlKey || byId('help').open) return;
  if (event.code === 'KeyP' && (mode === 'playing' || mode === 'paused')) {
    event.preventDefault();
    if (!event.repeat) mode === 'playing' ? pause() : resume();
    return;
  }
  if (mode !== 'playing') return;
  if (arrows.has(event.code)) {
    event.preventDefault();
    held.add(event.code);
    showSight = true;
  } else if (event.code === 'Space' || event.code === 'KeyF') {
    // Space still activates focused navigation and settings controls.
    if (event.code === 'Space' && event.target.closest('button, a')) return;
    event.preventDefault();
    if (!event.repeat) event.code === 'Space' ? fire() : letPass();
  }
});
document.addEventListener('keyup', event => held.delete(event.code));
byId('start').addEventListener('click', () => mode === 'paused' ? resume() : start());
byId('pause').addEventListener('click', () => mode === 'playing' ? pause() : resume());
byId('fire').addEventListener('click', () => { fire(); canvas.focus({preventScroll: true}); });
byId('pass').addEventListener('click', () => { letPass(); canvas.focus({preventScroll: true}); });
byId('controls').addEventListener('click', () => {
  pause();
  byId('help').showModal();
});
byId('close').addEventListener('click', () => byId('help').close());
byId('sound').addEventListener('click', () => {
  sound = !sound;
  byId('sound').textContent = sound ? 'Sound on' : 'Sound off';
  byId('sound').setAttribute('aria-pressed', String(sound));
  if (sound) beep(320, 450);
  if (mode === 'playing') canvas.focus({preventScroll: true});
});
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
new ResizeObserver(resize).observe(canvas);
resize();
