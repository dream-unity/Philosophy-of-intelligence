import {createArcadeRange} from './covert-range.js?v=fof24';
import {bindSpeedDial} from './speed-dial.js?v=fof20';
import {makeCaseTrial} from './case-decks.js?v=fof20';
import {renderCaseEvidence, renderCaseGuide, renderCaseResult} from './case-view.js?v=fof24';
import {ArcadeSession, ZeroToHeroLadder} from './arcade-session.js?v=fof20';
import {MAX_NBACK, MIN_NBACK, NBackSessionDeck, evaluateNBackDecisions} from './nback-cases.js?v=fof24';

const el = id => document.getElementById(id);
const defaultFooterHTML = el('keys').innerHTML;
const dialog = el('controls');
let phase = 'ready';
let difficulty = 'zero-to-hero';
let nbackLevel = 1;
let shortlist = false;
const difficultyNames = {
  'zero-to-hero': 'From Zero to Hero',
  'climb-the-ladder': 'Climb the ladder',
  'super-super-easy': 'Super-super Easy',
  'super-easy': 'Super Easy',
  'very-easy': 'Very Easy',
  easy: 'Easy',
  medium: 'Moderate',
  hard: 'Hard'
};
const difficultyChoices = el('run-form').elements.namedItem('difficulty');
const nbackSetting = el('nback-setting');
const nbackHint = el('nback-hint');
const nbackButtons = [...document.querySelectorAll('.nback-btn')];
const speedInput = el('master-speed');
let masterSpeed = speedInput.valueAsNumber;
let session;
let ladder = null;
let nbackDeck = null;
let nbackStats = null;
let nbackDecisions = [null, null, null, null, null];
let lastElapsed = 0;
let decksByLevel = new Map();
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

function syncAmmoMeter(total, remaining, unit = 'bullet') {
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
  const pluralUnit = unit === 'ready' ? 'ready' : (remaining === 1 ? unit : unit + 's');
  const text = unit === 'ready' ? 'Hold' : remaining + ' ' + pluralUnit;
  if (meter.lastElementChild.textContent !== text) meter.lastElementChild.textContent = text;
  [...meter.querySelectorAll('i')].forEach((round, i) => round.classList.toggle('spent', i >= remaining));
}

function update(status) {
  if (phase !== 'play') return;
  lastElapsed = status.elapsed;
  el('clock').textContent = status.elapsed.toFixed(1) + ' s';
  if (nbackDeck) return;
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

function syncNBackPicker() {
  const show = difficultyChoices.value === 'climb-the-ladder';
  if (nbackSetting) nbackSetting.hidden = !show;
  for (const btn of nbackButtons) {
    const val = Number(btn.dataset.nback);
    btn.setAttribute('aria-pressed', String(val === nbackLevel));
  }
  if (nbackHint) {
    const plural = nbackLevel === 1 ? '1 trial back' : nbackLevel + ' trials back';
    nbackHint.textContent = 'Compare each briefing against ' + plural;
  }
}

function setNBackLevel(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < MIN_NBACK || parsed > MAX_NBACK) return;
  nbackLevel = parsed;
  try { localStorage.setItem('friend-or-foe.nbackLevel', String(nbackLevel)); } catch {}
  syncNBackPicker();
}

function activeLevel() {
  if (nbackDeck) return 'climb-the-ladder';
  return ladder ? ladder.level : difficulty;
}

function syncNBackFooter() {
  if (!nbackDeck || !trial?.nback) {
    el('keys').innerHTML = defaultFooterHTML;
    return;
  }
  el('keys').textContent = trial.nback.isEncoding
    ? 'Press Space or click Next to continue.'
    : 'A/S · D/F · H/J lines · K/L valid/clash · Space/N all 3';
}

function updateNBackMeter() {
  if (!nbackDeck || !trial?.nback) return;
  if (trial.nback.isEncoding) {
    syncAmmoMeter(1, 1, 'ready');
    return;
  }
  const remaining = nbackDecisions.filter(v => v === null).length;
  syncAmmoMeter(5, remaining, 'call');
}

function syncNBackButtonsDOM() {
  const buttons = el('cues').querySelectorAll('.nback-choice');
  for (const btn of buttons) {
    const idx = Number(btn.getAttribute('data-decision'));
    const val = btn.getAttribute('data-value') === '1';
    btn.setAttribute('aria-pressed', String(nbackDecisions[idx] === val));
  }
}

function advanceNBackEncoding() {
  if (phase !== 'play' || !nbackDeck || !trial?.nback?.isEncoding || dialog.open || locked) return;
  range.pause();
  if (!session.accept({correct: true, reason: 'encode', elapsed: lastElapsed}, trial.evidence.family)) return;
  tone(330, 460, .09);
  if (session.next()) enterTrial();
  else showSummary();
}

function handleNBackDecision(index, value) {
  if (phase !== 'play' || !nbackDeck || !trial?.nback || trial.nback.isEncoding || dialog.open || locked) return;
  nbackDecisions[index] = Boolean(value);
  syncNBackButtonsDOM();
  updateNBackMeter();
  tone(value ? 420 : 310, value ? 490 : 260, .055);
  if (nbackDecisions.every(v => v !== null)) {
    completeNBackScoredTrial();
  }
}

function completeNBackScoredTrial() {
  if (phase !== 'play' || !nbackDeck || !trial?.nback || trial.nback.isEncoding) return;
  range.pause();
  const evalRes = evaluateNBackDecisions(trial, nbackDecisions);
  const elapsed = lastElapsed;
  if (!session.accept({correct: evalRes.exact, reason: evalRes.exact ? 'pair' : 'nback-miss', elapsed}, trial.evidence.family)) {
    return;
  }
  if (nbackStats) {
    nbackStats.scoredTotal++;
    nbackStats.lineTotal += evalRes.lineTotal;
    nbackStats.lineCorrect += evalRes.lineCorrect;
    if (evalRes.exact) {
      nbackStats.exactWins++;
      nbackStats.solveTimes.push(elapsed);
      nbackStats.bestTime = nbackStats.bestTime === null ? elapsed : Math.min(nbackStats.bestTime, elapsed);
    }
    if (trial.nback.isFullMatch) {
      nbackStats.fullMatchTotal++;
      if (evalRes.triadCorrect) nbackStats.fullMatchWins++;
    }
    if (!trial.nback.isConsistent) {
      nbackStats.clashTotal++;
      if (evalRes.logicCorrect) nbackStats.clashWins++;
    }
  }
  el('score').textContent = 'Cases ' + nbackStats.exactWins + ' / ' + nbackStats.scoredTotal;
  tone(evalRes.exact ? 380 : 210, evalRes.exact ? 625 : 112, .14);
  // Straight to the next trial — no debrief in Climb the ladder.
  if (session.next()) enterTrial();
  else showSummary();
}

function enterTrial() {
  const level = activeLevel();
  if (nbackDeck) {
    trial = nbackDeck.nextTrial();
    nbackDecisions = [null, null, null, null, null];
  } else {
    const prevArg = trial
      ? {level, deck: decksByLevel.get(level) || null, pair: trial.pair, targets: trial.targets, number: trial.number}
      : null;
    trial = makeCaseTrial(level, prevArg);
    decksByLevel.set(level, trial.deck);
  }
  shots = 0;
  lastElapsed = 0;
  debriefHeld = false;
  setPhase('play');
  renderCaseEvidence(el('cues'), trial.evidence, {
    shortlist,
    onShortlistChange: setShortlist,
    onNBackDecision: handleNBackDecision,
    onNBackAdvance: advanceNBackEncoding,
    nbackDecisions
  });
  el('cues').parentElement.scrollTop = 0;
  const meterPrefix = nbackDeck
    ? 'Climb the ladder (' + nbackDeck.nBack + '-back)'
    : difficultyNames[level];
  el('trial-meter').textContent = meterPrefix + ' · ' + session.number + '/' + session.total;
  el('score').textContent = nbackStats
    ? 'Cases ' + nbackStats.exactWins + ' / ' + nbackStats.scoredTotal
    : 'Cases ' + session.wins + ' / ' + session.completed;
  syncNBackFooter();
  if (nbackDeck) {
    updateNBackMeter();
    range.start(trial.roster, trial.pair, {masterSpeed, interactive: false});
  } else {
    syncAmmoMeter(trial.pair.length, trial.pair.length);
    range.start(trial.roster, trial.pair, {masterSpeed});
    el('range').focus({preventScroll:true});
  }
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
  if (nbackDeck && nbackStats && trial?.nback) {
    // Cutouts escaped before decision completed: count miss/death and move straight to next trial (zero debrief).
    if (!trial.nback.isEncoding) {
      nbackStats.scoredTotal++;
      nbackStats.lineTotal += 3;
      if (trial.nback.isFullMatch) nbackStats.fullMatchTotal++;
      if (!trial.nback.isConsistent) nbackStats.clashTotal++;
    }
    if (result.reason === 'escaped') nbackStats.deaths++;
    el('score').textContent = 'Cases ' + nbackStats.exactWins + ' / ' + nbackStats.scoredTotal;
    tone(210, 112, .16);
    if (session.next()) enterTrial();
    else showSummary();
    return;
  }
  const change = ladder ? ladder.record(result.correct) : null;
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
  const tierNote = change
    ? (change.direction === 'up' ? ' · Up to ' : ' · Down to ') + difficultyNames[change.to]
    : '';
  el('outcome').textContent = result.correct ? hitLabel : result.reason === 'escaped' ? 'You died' : 'Out of bullets';
  el('outcome-detail').textContent = trial.pair.join(' + ') + ' · ' + elapsed + tierNote;
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

function medianOf(values) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function showSummary() {
  clearTimeout(transitionTimer);
  transitionTimer = 0;
  debriefHeld = false;
  range.pause();
  setPhase('summary');
  el('keys').innerHTML = defaultFooterHTML;
  el('summary-heading').textContent = session.finished ? 'Run complete' : 'Run ended';
  const totals = el('totals');
  totals.replaceChildren();
  const rows = [];
  if (nbackDeck && nbackStats) {
    const caseWord = nbackStats.exactWins === 1 ? 'case' : 'cases';
    el('summary-score').textContent =
      nbackStats.exactWins + ' ' + caseWord + ' cleared in ' + nbackStats.scoredTotal + ' N-back trials.';
    const linePct = nbackStats.lineTotal
      ? Math.round((nbackStats.lineCorrect / nbackStats.lineTotal) * 100) + '%'
      : '—';
    const med = medianOf(nbackStats.solveTimes);
    rows.push(
      ['N-back level', nbackDeck.nBack + '-back'],
      ['Line accuracy', linePct],
      ['Full-triad matches', nbackStats.fullMatchTotal ? nbackStats.fullMatchWins + ' / ' + nbackStats.fullMatchTotal : '—'],
      ['Clashes caught', nbackStats.clashTotal ? nbackStats.clashWins + ' / ' + nbackStats.clashTotal : '—'],
      ['Deaths (escaped)', nbackStats.deaths],
      ['Median clearance', med === null ? '—' : med.toFixed(1) + ' s'],
      ['Fastest clearance', nbackStats.bestTime === null ? '—' : nbackStats.bestTime.toFixed(1) + ' s']
    );
  } else {
    const caseWord = session.wins === 1 ? 'case' : 'cases';
    el('summary-score').textContent = session.wins + ' ' + caseWord + ' cleared in ' + session.completed + ' completed trials.';
    if (ladder) {
      rows.push(
        ['Final difficulty', difficultyNames[ladder.level]],
        ['Peak difficulty', difficultyNames[ladder.peakLevel]],
        ['Tier moves', ladder.promotions + ' up · ' + ladder.demotions + ' down']
      );
    }
    rows.push(
      ['First-seen cases', session.firstSeenTotal ? session.firstSeenWins + ' / ' + session.firstSeenTotal : '—']
    );
    if (session.repeatTotal) {
      rows.push(['Repeat-type cases', session.repeatWins + ' / ' + session.repeatTotal]);
    }
    rows.push(
      ['Out of bullets', session.ammoLosses],
      ['Deaths (escaped)', session.deaths],
      ['Median clearance', session.medianTime === null ? '—' : session.medianTime.toFixed(1) + ' s'],
      ['Fastest clearance', session.bestTime === null ? '—' : session.bestTime.toFixed(1) + ' s']
    );
  }
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
    const level = phase === 'ready' ? difficultyChoices.value : activeLevel();
    renderCaseGuide(el('cue-guide'), level, {
      shortlist,
      zeroToHero: Boolean(ladder),
      nBack: nbackDeck ? nbackDeck.nBack : nbackLevel
    });
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
  ladder = null;
  nbackDeck = null;
  nbackStats = null;
  nbackDecisions = [null, null, null, null, null];
  decksByLevel.clear();
  el('keys').innerHTML = defaultFooterHTML;
  syncNBackPicker();
  setPhase('ready');
  range.preview();
}

for (const radio of document.querySelectorAll('input[name="difficulty"]')) {
  radio.addEventListener('change', syncNBackPicker);
}
for (const btn of nbackButtons) {
  btn.addEventListener('click', () => setNBackLevel(btn.dataset.nback));
}

el('run-form').addEventListener('submit', e => {
  e.preventDefault();
  if (phase !== 'ready' || !e.currentTarget.reportValidity()) return;
  const total = el('count').valueAsNumber;
  difficulty = difficultyChoices.value;
  masterSpeed = speedInput.valueAsNumber;
  session = new ArcadeSession(total);
  decksByLevel.clear();
  ladder = difficulty === 'zero-to-hero' ? new ZeroToHeroLadder() : null;
  if (difficulty === 'climb-the-ladder') {
    nbackDeck = new NBackSessionDeck(nbackLevel);
    nbackStats = {
      scoredTotal: 0,
      exactWins: 0,
      lineCorrect: 0,
      lineTotal: 0,
      fullMatchTotal: 0,
      fullMatchWins: 0,
      clashTotal: 0,
      clashWins: 0,
      deaths: 0,
      solveTimes: [],
      bestTime: null
    };
  } else {
    nbackDeck = null;
    nbackStats = null;
  }
  try {
    localStorage.setItem('friend-or-foe.trials', String(total));
    localStorage.setItem('friend-or-foe.masterSpeed', String(masterSpeed));
    localStorage.setItem('friend-or-foe.difficulty', difficulty);
    localStorage.setItem('friend-or-foe.nbackLevel', String(nbackLevel));
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
    if (!nbackDeck) el('range').focus({preventScroll:true});
  } else if (phase === 'between' && !debriefHeld) scheduleNext(remainingDelay);
});
el('sound').addEventListener('click', () => {
  sound = !sound;
  el('sound').setAttribute('aria-pressed', String(sound));
  el('sound').textContent = sound ? 'Sound on' : 'Sound off';
  if (sound) tone(330, 465, .1);
  if (phase === 'play' && !nbackDeck) el('range').focus({preventScroll:true});
});

const NBACK_KEY_MAP = {
  KeyA: [0, true],
  KeyS: [0, false],
  KeyD: [1, true],
  KeyF: [1, false],
  KeyH: [2, true],
  KeyJ: [2, false],
  KeyK: [3, true],
  KeyL: [3, false],
  Space: [4, true],
  KeyN: [4, false]
};

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
  if (phase === 'play' && nbackDeck && trial?.nback && !dialog.open && !locked) {
    if (trial.nback.isEncoding) {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        advanceNBackEncoding();
      }
      return;
    }
    const mapped = NBACK_KEY_MAP[e.code];
    if (mapped) {
      e.preventDefault();
      handleNBackDecision(mapped[0], mapped[1]);
      return;
    }
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
  const savedNBack = Number(localStorage.getItem('friend-or-foe.nbackLevel'));
  if (Number.isInteger(savedNBack) && savedNBack >= MIN_NBACK && savedNBack <= MAX_NBACK) nbackLevel = savedNBack;
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
  const reqNBack = Number(params.get('nback'));
  if (Number.isInteger(reqNBack) && reqNBack >= MIN_NBACK && reqNBack <= MAX_NBACK) nbackLevel = reqNBack;
  syncNBackPicker();
  el('run-form').requestSubmit();
}
