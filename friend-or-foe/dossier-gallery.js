import {createArcadeRange} from './covert-range.js?v=fof17';
import {bindSpeedDial} from './speed-dial.js';
import {makeCaseTrial} from './case-decks.js';
import {renderCaseEvidence, renderCaseGuide, renderCaseResult} from './case-view.js';
import {ArcadeSession} from './arcade-session.js';

const el = id => document.getElementById(id);
const dialog = el('controls');
let phase = 'ready';
let difficulty = 'super-super-easy';
let shortlist = false;
const difficultyNames = {'super-super-easy':'Super-super Easy', 'super-easy':'Super Easy', 'very-easy':'Very Easy', easy:'Easy', medium:'Moderate', hard:'Hard'};
const difficultyChoices = el('run-form').elements.namedItem('difficulty');
const speedInput = el('master-speed');
let masterSpeed = speedInput.valueAsNumber;
let session;
let trial;
let locked = false;
let transitionTimer = 0;
let transitionAt = 0;
let remainingDelay = 0;
let debriefHeld = false;
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

function syncAmmoMeter(total, remaining) {
  const meter = el('ammo-meter');
  const existing = meter.querySelectorAll('i');
  if (existing.length !== total) {
    const label = document.createElement('b');
    const nodes = [];
    for (let i = 0; i < total; i++) {
      const round = document.createElement('i');
      round.className = 'round';
      nodes.push(round);
    }
    nodes.push(label);
    meter.replaceChildren(...nodes);
  }
  const text = remaining + (remaining === 1 ? ' bullet' : ' bullets');
  if (meter.lastElementChild.textContent !== text) meter.lastElementChild.textContent = text;
  [...meter.querySelectorAll('i')].forEach((round, i) => round.classList.toggle('spent', i >= remaining));
}

function update(status) {
  if (phase !== 'play') return;
  el('clock').textContent = status.elapsed.toFixed(1) + ' s';
  if (status.shots > shots) tone(410, 102, .1);
  shots = status.shots;
  const total = trial ? trial.pair.length : 2;
  const remaining = typeof status.bullets === 'number' ? status.bullets : Math.max(0, total - shots);
  syncAmmoMeter(total, remaining);
}

function setShortlist(enabled) {
  shortlist = Boolean(enabled);
  try { localStorage.setItem('friend-or-foe.shortlist', shortlist ? '1' : '0'); } catch {}
  if (phase === 'play') el('range').focus({preventScroll:true});
}

function enterTrial() {
  trial = makeCaseTrial(difficulty, trial);
  shots = 0;
  debriefHeld = false;
  setPhase('play');
  renderCaseEvidence(el('cues'), trial.evidence, {shortlist, onShortlistChange: setShortlist});
  el('cues').parentElement.scrollTop = 0;
  el('trial-meter').textContent = difficultyNames[difficulty] + ' · ' + session.number + '/' + session.total;
  el('score').textContent = 'Cases ' + session.wins + ' / ' + session.completed;
  syncAmmoMeter(trial.pair.length, trial.pair.length);
  range.start(trial.roster, trial.pair, {masterSpeed});
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

function advanceFromDebrief() {
  if (phase !== 'between' || dialog.open || locked) return;
  debriefHeld = false;
  window.clearTimeout(transitionTimer);
  transitionTimer = 0;
  if (session.next()) enterTrial();
  else showSummary();
}

function finishTrial(result) {
  if (phase !== 'play' || !session.accept(result, trial?.evidence?.family || null)) return;
  setPhase('between');
  renderCaseResult(el('cues'), trial, {
    onHoldToggle: toggleDebriefHold,
    onNext: advanceFromDebrief,
    held: debriefHeld
  });
  el('cues').parentElement.scrollTop = 0;
  el('range-message').dataset.result = result.reason;
  const elapsed = result.elapsed.toFixed(1) + ' s';
  const hitLabel = trial.pair.length === 1 ? 'Target hit' : 'Targets cleared';
  el('outcome').textContent = result.correct ? hitLabel : result.reason === 'escaped' ? 'You died' : 'Out of bullets';
  el('outcome-detail').textContent = trial.pair.join(' + ') + ' · ' + elapsed;
  el('score').textContent = 'Cases ' + session.wins + ' / ' + session.completed;
  tone(result.correct ? 380 : 210, result.correct ? 625 : 112, .18);
  scheduleNext(result.correct ? 2200 : 7500);
}

function toggleDebriefHold() {
  debriefHeld = !debriefHeld;
  const hint = el('cues').querySelector('.case-result-hint');
  const holdBtn = el('cues').querySelector('[data-action="hold"]');
  if (debriefHeld) {
    window.clearTimeout(transitionTimer);
    transitionTimer = 0;
    remainingDelay = Math.max(1200, transitionAt - performance.now());
    if (hint) hint.textContent = 'Held · Space: next · P: resume';
    if (holdBtn) holdBtn.textContent = 'Resume';
  } else {
    if (hint) hint.textContent = 'Space: next · P: hold';
    if (holdBtn) holdBtn.textContent = 'Hold';
    scheduleNext(remainingDelay || 3000);
  }
}

function showSummary() {
  clearTimeout(transitionTimer);
  transitionTimer = 0;
  debriefHeld = false;
  range.pause();
  setPhase('summary');
  el('summary-heading').textContent = session.finished ? 'Run complete' : 'Run ended';
  const caseWord = session.wins === 1 ? 'case' : 'cases';
  el('summary-score').textContent = session.wins + ' ' + caseWord + ' cleared in ' + session.completed + ' completed trials.';
  const totals = el('totals');
  totals.replaceChildren();
  const rows = [
    ['First-seen cases', session.firstSeenTotal ? session.firstSeenWins + ' / ' + session.firstSeenTotal : '—']
  ];
  if (session.repeatTotal) {
    rows.push(['Repeat-type cases', session.repeatWins + ' / ' + session.repeatTotal]);
  }
  rows.push(
    ['Out of bullets', session.ammoLosses],
    ['Deaths (escaped)', session.deaths],
    ['Median clearance', session.medianTime === null ? '—' : session.medianTime.toFixed(1) + ' s'],
    ['Fastest clearance', session.bestTime === null ? '—' : session.bestTime.toFixed(1) + ' s']
  );
  for (const [label, value] of rows) {
    const term = document.createElement('dt');
    const count = document.createElement('dd');
    term.textContent = label;
    count.textContent = value;
    totals.append(term, count);
  }
  el('summary-heading').focus({preventScroll:true});
}

function openPanel(page = 'pause') {
  if (!dialog.open) {
    locked = true;
    if (phase === 'play') range.pause();
    if (phase === 'between') {
      clearTimeout(transitionTimer);
      remainingDelay = Math.max(0, transitionAt - performance.now());
    }
  }
  const inRun = phase === 'play' || phase === 'between';
  const help = page === 'help';
  el('help-copy').hidden = !help;
  el('dialog-title').textContent = help ? 'How to play' : 'Range paused';
  if (help) {
    const level = phase === 'ready' ? difficultyChoices.value : difficulty;
    renderCaseGuide(el('cue-guide'), level, {shortlist});
  }
  el('return').textContent = inRun ? 'Resume' : 'Back';
  el('end').hidden = !inRun;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  el('return').focus({preventScroll:true});
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
  difficulty = difficultyChoices.value;
  masterSpeed = speedInput.valueAsNumber;
  session = new ArcadeSession(total);
  try {
    localStorage.setItem('friend-or-foe.trials', String(total));
    localStorage.setItem('friend-or-foe.masterSpeed', String(masterSpeed));
    localStorage.setItem('friend-or-foe.difficulty', difficulty);
  } catch {}
  tone(260, 445, .12);
  enterTrial();
});
el('again').addEventListener('click', () => {
  reset();
  el('difficulty-' + difficultyChoices.value).focus({preventScroll:true});
});
el('help-open').addEventListener('click', () => openPanel('help'));
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
  } else if (phase === 'between' && !debriefHeld) scheduleNext(remainingDelay);
});
el('sound').addEventListener('click', () => {
  sound = !sound;
  el('sound').setAttribute('aria-pressed', String(sound));
  el('sound').textContent = sound ? 'Sound on' : 'Sound off';
  if (sound) tone(330, 465, .1);
  if (phase === 'play') el('range').focus({preventScroll:true});
});
document.addEventListener('keydown', e => {
  if (e.repeat || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === 'KeyP') {
    if (phase !== 'play' && phase !== 'between') return;
    e.preventDefault();
    if (dialog.open) dialog.close();
    else if (phase === 'between') toggleDebriefHold();
    else openPanel();
    return;
  }
  if ((e.code === 'Space' || e.code === 'Enter') && phase === 'between' && !dialog.open && !locked) {
    e.preventDefault();
    debriefHeld = false;
    window.clearTimeout(transitionTimer);
    transitionTimer = 0;
    if (session.next()) enterTrial();
    else showSummary();
  }
});
function pauseIfRunning() {
  if (!dialog.open && (phase === 'play' || phase === 'between')) openPanel();
}
window.addEventListener('blur', pauseIfRunning);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseIfRunning(); });
try {
  const savedLevel = localStorage.getItem('friend-or-foe.difficulty');
  if (Object.hasOwn(difficultyNames, savedLevel)) difficultyChoices.value = savedLevel;
  const savedShortlist = localStorage.getItem('friend-or-foe.shortlist');
  if (savedShortlist === '0' || savedShortlist === '1') shortlist = savedShortlist === '1';
  const savedSpeed = localStorage.getItem('friend-or-foe.masterSpeed');
  if (savedSpeed !== null) {
    speedInput.value = savedSpeed;
    if (speedInput.valueAsNumber !== Number(savedSpeed)) speedInput.value = speedInput.defaultValue;
  } else if (localStorage.getItem('friend-or-foe.pace') === '1') {
    speedInput.value = '1.5';
  }
  const saved = Number(localStorage.getItem('friend-or-foe.trials'));
  if (Number.isInteger(saved) && saved >= 20 && saved <= 1000) el('count').value = saved;
} catch {}
bindSpeedDial(speedInput, el('speed-value'), el('speed-hint'));
reset();

const params = new URLSearchParams(window.location.search);
if (params.get('autostart') === '1') {
  const requested = params.get('difficulty');
  if (requested && Object.hasOwn(difficultyNames, requested)) difficultyChoices.value = requested;
  el('run-form').requestSubmit();
}
