import {createArcadeRange} from './arcade-range.js';
import {makeArcadeTrial} from './arcade-links.js';
import {renderCues} from './arcade-cues.js';
import {ArcadeSession} from './arcade-session.js';

const el = id => document.getElementById(id);
const dialog = el('controls');
let phase = 'ready';
let session;
let trial;
let locked = false;
let transitionTimer = 0;
let transitionAt = 0;
let remainingDelay = 0;
let shots = 0;
let sound = true;
let audio;
const range = createArcadeRange({
  canvas: el('range'), labels: el('labels'), onUpdate: update, onFinish: finishTrial
});

function tone(start, end, length) {
  if (!sound) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    const oscillator = audio.createOscillator();
    const level = audio.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(start, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(end, audio.currentTime + length);
    level.gain.setValueAtTime(.065, audio.currentTime);
    level.gain.exponentialRampToValueAtTime(.001, audio.currentTime + length);
    oscillator.connect(level).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + length);
  } catch { /* The range also works with the sound muted. */ }
}

function setPhase(next) {
  phase = next;
  document.body.dataset.phase = next;
  const inRun = next === 'play' || next === 'between';
  el('setup').hidden = next !== 'ready';
  el('results').hidden = next !== 'summary';
  el('cues').hidden = el('meters').hidden = el('pause').hidden = !inRun;
  el('score').hidden = !inRun;
  el('range-message').hidden = next !== 'between';
}

function update(status) {
  if (phase !== 'play') return;
  el('clock').textContent = status.elapsed.toFixed(1) + ' s';
  if (status.shots > shots) tone(410, 102, .1);
  shots = status.shots;
  const remaining = 2 - shots;
  const meter = el('ammo-meter');
  const text = remaining + (remaining === 1 ? ' bullet' : ' bullets');
  if (meter.lastElementChild.textContent !== text) meter.lastElementChild.textContent = text;
  [...meter.querySelectorAll('i')].forEach((round, i) => round.classList.toggle('spent', i >= remaining));
}

function enterTrial() {
  trial = makeArcadeTrial(trial);
  shots = 0;
  setPhase('play');
  renderCues(el('cues'), trial);
  el('cues').parentElement.scrollTop = 0;
  el('trial-meter').textContent = 'Trial ' + session.number + ' / ' + session.total;
  el('score').textContent = 'Pairs ' + session.wins + ' / ' + session.completed;
  range.start(trial.roster, trial.pair);
  el('range').focus({preventScroll:true});
}

function scheduleNext(delay) {
  window.clearTimeout(transitionTimer);
  remainingDelay = delay;
  transitionAt = performance.now() + delay;
  transitionTimer = window.setTimeout(() => {
    transitionTimer = 0;
    if (phase !== 'between' || locked) return;
    if (session.next()) enterTrial();
    else showSummary();
  }, delay);
}

function finishTrial(result) {
  if (phase !== 'play' || !session.accept(result)) return;
  setPhase('between');
  el('range-message').dataset.result = result.reason;
  const elapsed = result.elapsed.toFixed(1) + ' s';
  el('outcome').textContent = result.correct ? 'Pair hit' : result.reason === 'escaped' ? 'You died' : 'Out of bullets';
  el('outcome-detail').textContent = trial.pair.join(' + ') + ' · ' + elapsed;
  el('score').textContent = 'Pairs ' + session.wins + ' / ' + session.completed;
  tone(result.correct ? 380 : 210, result.correct ? 625 : 112, .18);
  scheduleNext(1750);
}

function showSummary() {
  clearTimeout(transitionTimer);
  transitionTimer = 0;
  range.pause();
  setPhase('summary');
  el('summary-heading').textContent = session.finished ? 'Run complete' : 'Run ended';
  el('summary-score').textContent = session.wins + ' pairs found in ' + session.completed + ' completed trials.';
  const totals = el('totals');
  totals.replaceChildren();
  for (const [label, value] of [
    ['Out of bullets', session.ammoLosses], ['Deaths', session.deaths],
    ['Fastest pair', session.bestTime === null ? '—' : session.bestTime.toFixed(1) + ' s']
  ]) {
    const term = document.createElement('dt');
    const count = document.createElement('dd');
    term.textContent = label;
    count.textContent = value;
    totals.append(term, count);
  }
  el('summary-heading').focus({preventScroll:true});
}

function openPanel(help = false) {
  if (dialog.open) return;
  locked = true;
  if (phase === 'play') range.pause();
  if (phase === 'between') {
    clearTimeout(transitionTimer);
    remainingDelay = Math.max(0, transitionAt - performance.now());
  }
  const inRun = phase === 'play' || phase === 'between';
  el('dialog-title').textContent = help ? 'How to play' : 'Range paused';
  el('help-copy').hidden = !help;
  el('return').textContent = inRun ? 'Resume' : 'Back to range';
  el('end').hidden = !inRun;
  dialog.showModal();
  el('return').focus();
}

function reset() {
  trial = null;
  session = null;
  setPhase('ready');
  range.preview();
}

el('run-form').addEventListener('submit', e => {
  e.preventDefault();
  if (phase !== 'ready' || !e.currentTarget.reportValidity()) return;
  const total = el('count').valueAsNumber;
  session = new ArcadeSession(total);
  try { localStorage.setItem('friend-or-foe.trials', String(total)); } catch {}
  tone(260, 445, .12);
  enterTrial();
});
el('again').addEventListener('click', reset);
el('help-open').addEventListener('click', () => openPanel(true));
el('pause').addEventListener('click', () => openPanel());
el('return').addEventListener('click', () => dialog.close());
el('end').addEventListener('click', () => {
  showSummary();
  dialog.close();
});
dialog.addEventListener('close', () => {
  locked = false;
  if (phase === 'play') {
    range.resume();
    el('range').focus({preventScroll:true});
  } else if (phase === 'between') scheduleNext(remainingDelay);
});
el('sound').addEventListener('click', () => {
  sound = !sound;
  el('sound').setAttribute('aria-pressed', String(sound));
  el('sound').textContent = sound ? 'Sound on' : 'Sound off';
  if (sound) tone(330, 465, .1);
  if (phase === 'play') el('range').focus({preventScroll:true});
});
document.addEventListener('keydown', e => {
  if (e.repeat || e.isComposing || e.ctrlKey || e.metaKey || e.altKey || e.code !== 'KeyP') return;
  if (phase !== 'play' && phase !== 'between') return;
  e.preventDefault();
  if (dialog.open) dialog.close();
  else openPanel();
});
function pauseIfRunning() {
  if (!dialog.open && (phase === 'play' || phase === 'between')) openPanel();
}
window.addEventListener('blur', pauseIfRunning);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseIfRunning(); });
try {
  const saved = Number(localStorage.getItem('friend-or-foe.trials'));
  if (Number.isInteger(saved) && saved >= 20 && saved <= 1000) el('count').value = saved;
} catch {}
reset();
