// Main Trauma Doctor game controller & state machine.
// Mirrors state strictly onto document.body.dataset.state ('title' | 'playing' | 'paused' | 'gameover').
// Supports ?autostart=1, ?mode=zero-to-hero|fixed|nback, ?tier=..., ?n=1..6, ?cases=20..1000, ?type=...

import { PATIENTS } from './roster.js';
import { DIFFICULTY_TIERS } from './case-families.js';
import { REASONING_TYPES } from './reasoning-types.js';
import { ClinicalDeckScheduler } from './case-decks.js';
import { ClinicalNBackStream } from './nback-cases.js';
import { TraumaSession } from './trauma-session.js';
import { TraumaWardScene } from './ward-scene.js';
import { ClinicalAudio } from './audio.js';
import {
  renderClinicalDossier,
  renderNBackView,
  applyPatientBoardHighlight,
} from './case-view.js';

const $ = (sel) => document.querySelector(sel);

const SPEED_PRESETS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0];

const dom = {
  body: document.body,
  canvas: $('#ward-canvas'),
  titleOverlay: $('#title-overlay'),
  pauseModal: $('#pause-modal'),
  summaryModal: $('#summary-modal'),
  guideModal: $('#guide-modal'),

  // Title setup controls (Friend-or-Foe style 8-card radio grid + shift controls)
  diffCards: Array.from(document.querySelectorAll('[data-difficulty]')),
  casesInput: $('#cases-input'),
  speedControlCol: $('#speed-control-col'),
  nbackControlCol: $('#nback-control-col'),
  nbackSelect: $('#nback-select'),
  speedDialBtn: $('#speed-dial-btn'),
  speedDialArc: $('#speed-dial-arc'),
  speedDialNeedle: $('#speed-dial-needle'),
  titleSpeedVal: $('#title-speed-val'),
  titleSpeedCrash: $('#title-speed-crash'),
  titleSpeedSlider: $('#title-speed-slider'),
  shortlistRow: $('#shortlist-row'),
  shortlistCheck: $('#shortlist-checkbox'),
  startBtn: $('#start-shift-btn'),
  openGuideBtn: $('#open-guide-btn'),
  closeGuideBtn: $('#close-guide-btn'),

  // Playing HUD & Controls
  hudTier: $('#hud-tier'),
  hudCase: $('#hud-case'),
  hudScore: $('#hud-score'),
  hudStreak: $('#hud-streak'),
  hudLadder: $('#hud-ladder'),
  paceControl: document.querySelector('.tm-pace-control'),
  paceSlider: $('#pace-slider'),
  paceValue: $('#pace-value'),
  muteBtn: $('#mute-btn'),
  pauseBtn: $('#pause-btn'),
  endRunBtn: $('#end-run-btn'),
  wardWrap: $('#ward-stage-wrap'),
  bayButtonsBar: $('#bay-buttons-bar'),
  dossierContainer: $('#dossier-container'),

  // Pause modal buttons
  resumeBtn: $('#resume-btn'),
  restartBtn: $('#restart-btn'),
  returnTitleBtn: $('#return-title-btn'),

  // Summary modal elements
  summaryHeadline: $('#summary-headline'),
  summaryStats: $('#summary-stats'),
  summaryLevels: $('#summary-levels'),
  summaryPhases: $('#summary-phases'),
  summaryReasoning: $('#summary-reasoning'),
  playAgainBtn: $('#play-again-btn'),
  summaryTitleBtn: $('#summary-title-btn'),
};

const state = {
  screen: 'title',
  selectedDifficulty: 'zero-to-hero', // 'zero-to-hero' | 'nback' | tierId
  setupMode: 'zero-to-hero', // 'zero-to-hero' | 'fixed' | 'nback'
  fixedTierId: 'super-super-easy',
  nbackLevel: 2,
  casesPerShift: 20,
  useShortlist: false,
  pace: 1.0,
  holdDebrief: false,

  session: null,
  scheduler: null,
  nbackStream: null,
  currentTrial: null,
  trialStartTs: 0,
  selectedIds: [],
  ruledOutIds: new Set(),
  highlightedPatientId: null,
  pinnedHighlightId: null,
  debrief: null,
  debriefTimer: null,

  nbackTrial: null,
  nbackAnswers: { valid: null, samePattern: null, sameDomain: null, sameLead: null },
  nbackFeedback: null,
};

const audio = new ClinicalAudio();
const scene = new TraumaWardScene(dom.canvas, {
  onSelectPatient: (patientId) => handlePatientIntervention(patientId),
  onTimeout: (patientId) => handleTrialTimeout(patientId),
  onLayout: (bays, w, h) => syncBayOverlayPositions(bays, w, h),
});

function formatPace(val) {
  return `${val.toFixed(2).replace(/\.?0+$/, '')}×`;
}

function activePreviewTierRank() {
  if (state.setupMode === 'zero-to-hero') return 1;
  return DIFFICULTY_TIERS.find((t) => t.id === state.fixedTierId)?.rank || 1;
}

function updateSpeedDisplays() {
  const pace = Math.max(0.25, Math.min(3.0, Number(state.pace) || 1.0));
  state.pace = pace;
  const label = formatPace(pace);

  dom.titleSpeedVal.textContent = label;
  dom.titleSpeedSlider.value = String(pace);
  dom.paceSlider.value = String(pace);
  dom.paceValue.textContent = label;

  const tierRank = activePreviewTierRank();
  const tierFactor = 1 - (tierRank - 1) * 0.045;
  const baseSec = Math.max(24, 42 * tierFactor);
  const firstCrashSec = Math.max(4, Math.round(baseSec / pace));
  dom.titleSpeedCrash.textContent = `First crash in ${firstCrashSec} s`;

  const t = Math.max(0, Math.min(1, (pace - 0.25) / (3.0 - 0.25)));
  const startDeg = 135;
  const sweepDeg = Math.max(8, t * 270);
  const endDeg = startDeg + sweepDeg;
  const rad = (endDeg * Math.PI) / 180;
  const r = 24;
  const cx = 32;
  const cy = 32;
  const endX = cx + r * Math.cos(rad);
  const endY = cy + r * Math.sin(rad);
  const largeArc = sweepDeg > 180 ? 1 : 0;
  dom.speedDialArc.setAttribute('d', `M 15.0 49.0 A 24 24 0 ${largeArc} 1 ${endX.toFixed(1)} ${endY.toFixed(1)}`);

  const needleR = 17;
  const nx = cx + needleR * Math.cos(rad);
  const ny = cy + needleR * Math.sin(rad);
  dom.speedDialNeedle.setAttribute('x2', nx.toFixed(1));
  dom.speedDialNeedle.setAttribute('y2', ny.toFixed(1));

  scene.setPaceMultiplier(pace);
}

function selectDifficulty(diffId) {
  state.selectedDifficulty = diffId;
  if (diffId === 'zero-to-hero') {
    state.setupMode = 'zero-to-hero';
  } else if (diffId === 'nback') {
    state.setupMode = 'nback';
  } else {
    state.setupMode = 'fixed';
    state.fixedTierId = diffId;
  }
  updateSetupVisibility();
}

function setScreen(next) {
  state.screen = next;
  dom.body.dataset.state = next;
  dom.titleOverlay.hidden = next !== 'title';
  dom.pauseModal.hidden = next !== 'paused';
  dom.summaryModal.hidden = next !== 'gameover';

  if (next === 'title') {
    scene.setMode('title');
  } else if (next === 'paused') {
    scene.setMode('paused');
  } else if (next === 'gameover') {
    scene.setMode('debrief');
  } else if (next === 'playing') {
    if (state.setupMode === 'nback') {
      scene.setMode('nback');
    } else {
      scene.setMode(state.debrief ? 'debrief' : 'playing');
    }
  }
}

function clearDebriefTimer() {
  if (state.debriefTimer) {
    clearTimeout(state.debriefTimer);
    state.debriefTimer = null;
  }
}

function updateSetupVisibility() {
  dom.diffCards.forEach((btn) => {
    const active = btn.dataset.difficulty === state.selectedDifficulty;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-checked', String(active));
  });

  const isNback = state.setupMode === 'nback';
  dom.speedControlCol.hidden = isNback;
  dom.nbackControlCol.hidden = !isNback;

  const tierRank = activePreviewTierRank();
  dom.shortlistRow.hidden = isNback || tierRank > 3;
  updateSpeedDisplays();
}

function readCasesPerShift() {
  const raw = Number(dom.casesInput.value);
  const clamped = Math.max(20, Math.min(1000, Number.isFinite(raw) ? Math.round(raw) : 20));
  state.casesPerShift = clamped;
  dom.casesInput.value = String(clamped);
  return clamped;
}

// =========================================================================
// LIVE CROSS-HIGHLIGHT & RIGHT-CLICK RULE-OUT SCRATCHPAD
// =========================================================================
function setHighlightedPatient(patientId) {
  const effective = patientId || state.pinnedHighlightId || null;
  if (state.highlightedPatientId === effective) return;
  state.highlightedPatientId = effective;
  scene.setHighlightedPatient(effective);
  applyPatientBoardHighlight(dom.dossierContainer, effective, state.ruledOutIds);
}

function toggleRuledOut(patientId) {
  if (state.screen !== 'playing' || state.debrief || !state.currentTrial) return;
  if (state.selectedIds.includes(patientId)) return;
  const nowRuled = !state.ruledOutIds.has(patientId);
  if (nowRuled) state.ruledOutIds.add(patientId);
  else state.ruledOutIds.delete(patientId);
  scene.setRuledOut(patientId, nowRuled);
  audio.playMark(nowRuled);
  applyPatientBoardHighlight(dom.dossierContainer, state.highlightedPatientId, state.ruledOutIds);
  const btn = dom.bayButtonsBar.querySelector(`[data-patient-id="${patientId}"]`);
  if (btn) btn.setAttribute('aria-description', nowRuled ? 'Ruled out' : '');
}

// Native accessible <button> hit areas synced 1:1 with canvas bay rectangles
function syncBayOverlayPositions(baysArg, widthArg, heightArg) {
  if (!dom.bayButtonsBar) return;
  const bays = baysArg || (typeof scene !== 'undefined' ? scene.bays : null);
  const w = widthArg || (typeof scene !== 'undefined' ? scene.width : 1) || 1;
  const h = heightArg || (typeof scene !== 'undefined' ? scene.height : 1) || 1;
  if (!bays) return;
  const buttons = dom.bayButtonsBar.querySelectorAll('.tm-bay-hit');
  buttons.forEach((btn, idx) => {
    const bay = bays[idx];
    if (!bay) return;
    btn.style.left = `${(bay.x / w) * 100}%`;
    btn.style.top = `${(bay.y / h) * 100}%`;
    btn.style.width = `${(bay.w / w) * 100}%`;
    btn.style.height = `${(bay.h / h) * 100}%`;
  });
}

function renderBayButtons() {
  if (state.setupMode === 'nback' || !state.currentTrial) {
    dom.bayButtonsBar.innerHTML = '';
    return;
  }

  dom.bayButtonsBar.innerHTML = PATIENTS.map((p, i) => {
    const keyNum = i === 9 ? '0' : String(i + 1);
    const chosen = state.selectedIds.includes(p.id);
    const disabled = !!state.debrief || chosen;
    return `<button type="button" class="tm-bay-hit" data-patient-id="${p.id}" aria-label="${keyNum} ${p.name}" title="Click or press ${keyNum} to treat ${p.name} · Right-click to rule out" ${disabled ? 'disabled' : ''}>
      <span class="tm-sr-only">${keyNum} ${p.name}</span>
    </button>`;
  }).join('');

  syncBayOverlayPositions();

  dom.bayButtonsBar.querySelectorAll('.tm-bay-hit').forEach((btn) => {
    const pid = btn.dataset.patientId;
    btn.addEventListener('click', (e) => {
      btn.blur();
      if (e.shiftKey) {
        toggleRuledOut(pid);
        return;
      }
      handlePatientIntervention(pid);
    });
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      toggleRuledOut(pid);
    });
    btn.addEventListener('mouseenter', () => setHighlightedPatient(pid));
    btn.addEventListener('mouseleave', () => setHighlightedPatient(null));
    btn.addEventListener('focus', () => setHighlightedPatient(pid));
    btn.addEventListener('blur', () => setHighlightedPatient(null));
  });
}

function updateHud() {
  if (!state.session) return;
  if (state.setupMode === 'nback') {
    dom.hudTier.textContent = `${state.nbackLevel}-Back`;
    dom.hudLadder.textContent = `${state.session.accuracyPercent()}% accuracy`;
    const currentRound = Math.min(state.session.targetTrials, state.session.total + 1);
    dom.hudCase.textContent = `${currentRound}/${state.session.targetTrials}`;
  } else {
    const tierId = state.session.activeTierId();
    const tierObj = DIFFICULTY_TIERS.find((t) => t.id === tierId) || DIFFICULTY_TIERS[0];
    dom.hudTier.textContent = tierObj.short;
    dom.hudLadder.textContent = state.session.ladder
      ? state.session.ladder.progressText()
      : 'Fixed Tier';
    const shownCase = state.debrief
      ? Math.min(state.session.targetTrials, state.session.total)
      : Math.min(state.session.targetTrials, state.session.total + 1);
    dom.hudCase.textContent = `${shownCase}/${state.session.targetTrials}`;
  }
  dom.hudScore.textContent = `${state.session.cleared}/${state.session.total}`;
  dom.hudStreak.textContent = String(state.session.currentStreak);
}

function startShift({ pinnedReasoningType = null } = {}) {
  clearDebriefTimer();
  readCasesPerShift();
  if (document.activeElement && document.activeElement.blur) {
    document.activeElement.blur();
  }

  if (pinnedReasoningType && state.setupMode === 'nback') {
    selectDifficulty('zero-to-hero');
  }

  state.session = new TraumaSession({
    mode: state.setupMode,
    tierId: state.fixedTierId,
    nbackLevel: state.nbackLevel,
    targetTrials: state.casesPerShift,
  });
  state.scheduler = new ClinicalDeckScheduler(Date.now() % 1000000 + 137);
  if (pinnedReasoningType) {
    state.scheduler.queueReasoningType(pinnedReasoningType);
  }
  state.nbackStream =
    state.setupMode === 'nback'
      ? new ClinicalNBackStream(state.nbackLevel, Date.now() % 1000000 + 509)
      : null;

  state.currentTrial = null;
  state.selectedIds = [];
  state.ruledOutIds.clear();
  state.highlightedPatientId = null;
  state.pinnedHighlightId = null;
  state.debrief = null;
  state.nbackFeedback = null;

  const isNback = state.setupMode === 'nback';
  dom.wardWrap.hidden = isNback;
  if (dom.paceControl) dom.paceControl.hidden = isNback;

  setScreen('playing');
  scene.setPaceMultiplier(state.pace);
  scene.resize();

  if (isNback) {
    advanceNBackTrial();
  } else {
    advanceStandardTrial();
  }
}

function advanceStandardTrial() {
  clearDebriefTimer();
  if (state.session && state.session.isComplete()) {
    endShiftSummary();
    return;
  }

  const tierId = state.session.activeTierId();
  state.currentTrial = state.scheduler.nextTrial(tierId);
  state.selectedIds = [];
  state.ruledOutIds.clear();
  state.highlightedPatientId = null;
  state.pinnedHighlightId = null;
  state.debrief = null;
  state.trialStartTs = performance.now();

  scene.loadTrial(state.currentTrial, {
    useShortlist: state.useShortlist && state.currentTrial.tierRank <= 3,
  });
  scene.setMode('playing');

  updateHud();
  renderBayButtons();
  renderCurrentDossier();
}

function renderCurrentDossier() {
  if (!state.currentTrial) return;
  renderClinicalDossier(dom.dossierContainer, {
    trial: state.currentTrial,
    useShortlist: state.useShortlist && state.currentTrial.tierRank <= 3,
    selectedIds: state.selectedIds,
    debrief: state.debrief,
    isLastCase: !!(state.session && state.session.isComplete()),
    holdDebrief: state.holdDebrief,
    highlightedPatientId: state.highlightedPatientId,
    ruledOutIds: state.ruledOutIds,
    onNextTrial: () => advanceStandardTrial(),
    onHoldToggle: () => {
      state.holdDebrief = !state.holdDebrief;
      if (state.holdDebrief) clearDebriefTimer();
      renderCurrentDossier();
    },
  });
}

function handlePatientIntervention(patientId) {
  if (state.screen !== 'playing' || state.setupMode === 'nback' || state.debrief || !state.currentTrial) {
    return;
  }
  if (state.selectedIds.includes(patientId)) return;

  const isCorrect = state.currentTrial.targets.includes(patientId);
  state.selectedIds.push(patientId);
  state.ruledOutIds.delete(patientId);
  scene.markPatientResult(patientId, isCorrect);
  audio.playSelect(isCorrect);

  if (!isCorrect) {
    finishStandardTrial({ cleared: false, reason: 'wrong', wrongId: patientId });
    return;
  }

  const allFound = state.currentTrial.targets.every((id) => state.selectedIds.includes(id));
  if (allFound) {
    finishStandardTrial({ cleared: true, reason: 'cleared', wrongId: null });
  } else {
    renderBayButtons();
    renderCurrentDossier();
  }
}

function handleTrialTimeout(patientId) {
  if (state.screen !== 'playing' || state.debrief || !state.currentTrial) return;
  finishStandardTrial({ cleared: false, reason: 'timeout', wrongId: patientId });
}

function finishStandardTrial({ cleared, reason, wrongId }) {
  const elapsedMs = Math.max(100, performance.now() - state.trialStartTs);
  const { ladderEvent } = state.session.recordStandardTrial({
    trial: state.currentTrial,
    cleared,
    elapsedMs,
  });

  state.ruledOutIds.clear();
  state.pinnedHighlightId = null;
  state.highlightedPatientId = null;
  scene.setHighlightedPatient(null);
  state.debrief = { cleared, reason, wrongId, elapsedMs, ladderEvent };
  scene.revealDebrief(state.currentTrial.targets, state.currentTrial.explanation.rival?.patientId);
  scene.setMode('debrief');

  if (ladderEvent?.type === 'promoted') {
    audio.playPromote();
  } else if (cleared) {
    audio.playClear(state.session.currentStreak);
  } else {
    audio.playMiss();
  }

  updateHud();
  renderBayButtons();
  renderCurrentDossier();

  if (!state.holdDebrief) {
    const delayMs = cleared ? 5800 : 8000;
    state.debriefTimer = setTimeout(() => {
      if (state.screen === 'playing' && state.debrief) {
        advanceStandardTrial();
      }
    }, delayMs);
  }
}

// =========================================================================
// CLIMB THE LADDER (N-BACK) FLOW
// =========================================================================
function advanceNBackTrial() {
  if (state.session && state.session.isComplete()) {
    endShiftSummary();
    return;
  }
  state.nbackTrial = state.nbackStream.nextTrial();
  state.nbackAnswers = { valid: true, samePattern: false, sameDomain: false, sameLead: false };
  state.trialStartTs = performance.now();
  updateHud();
  renderCurrentNBack();
}

function renderCurrentNBack() {
  if (!state.nbackTrial) return;
  renderNBackView(dom.dossierContainer, {
    trial: state.nbackTrial,
    answers: state.nbackAnswers,
    lastFeedback: state.nbackFeedback,
    onChoose: (field, val) => {
      state.nbackAnswers[field] = val;
      audio.playClick();
      renderCurrentNBack();
    },
    onSubmit: () => submitNBackRound(),
  });
}

function submitNBackRound() {
  if (state.screen !== 'playing' || state.setupMode !== 'nback' || !state.nbackTrial) return;
  const truth = state.nbackTrial.truth;
  const elapsedMs = Math.max(100, performance.now() - state.trialStartTs);

  if (truth.isEncoding) {
    const ok = state.nbackAnswers.valid === truth.valid;
    state.nbackFeedback = {
      correct: ok ? 1 : 0,
      total: 1,
      perfect: ok,
      note: truth.valid ? 'Encoding round was valid' : 'Encoding round had a 3-line contradiction',
    };
    if (ok) audio.playClear(1);
    else audio.playMiss();
    advanceNBackTrial();
    return;
  }

  let correct = 0;
  if (state.nbackAnswers.valid === truth.valid) correct++;
  if (state.nbackAnswers.samePattern === truth.samePattern) correct++;
  if (state.nbackAnswers.sameDomain === truth.sameDomain) correct++;
  if (state.nbackAnswers.sameLead === truth.sameLead) correct++;

  state.session.recordNBackTrial({ correctCount: correct, totalChecks: 4, elapsedMs });
  state.nbackFeedback = {
    correct,
    total: 4,
    perfect: correct === 4,
    note: truth.samePattern ? 'Structure matched N-back' : 'Structure differed from N-back',
  };
  if (correct === 4) audio.playClear(state.session.currentStreak);
  else audio.playMiss();

  advanceNBackTrial();
}

// =========================================================================
// END RUN SUMMARY
// =========================================================================
function endShiftSummary() {
  clearDebriefTimer();
  const snap = state.session ? state.session.snapshot() : null;
  if (!snap) {
    setScreen('title');
    return;
  }

  dom.summaryHeadline.textContent =
    snap.mode === 'nback'
      ? `Climb the Ladder (${snap.nbackLevel}-Back) Complete`
      : snap.cleared >= Math.max(1, Math.ceil(snap.total * 0.7))
        ? 'Shift Complete · Strong Clinical Judgment'
        : 'Shift Review · Reasoning Breakdown';

  const medText = snap.medianSec !== null ? `${snap.medianSec.toFixed(1)}s` : '—';
  dom.summaryStats.innerHTML = `
    <div class="tm-stat-tile">
      <span class="tm-stat-val">${snap.accuracy}%</span>
      <span class="tm-stat-label">Accuracy</span>
    </div>
    <div class="tm-stat-tile">
      <span class="tm-stat-val">${snap.cleared}/${snap.total}</span>
      <span class="tm-stat-label">Cleared</span>
    </div>
    <div class="tm-stat-tile">
      <span class="tm-stat-val">${medText}</span>
      <span class="tm-stat-label">Median Time</span>
    </div>
    <div class="tm-stat-tile">
      <span class="tm-stat-val">${snap.bestStreak}</span>
      <span class="tm-stat-label">Best Streak</span>
    </div>
  `;

  if (snap.levelBreakdown.length) {
    dom.summaryLevels.hidden = false;
    dom.summaryLevels.innerHTML = `
      <h4>Cognitive Reasoning Levels</h4>
      <ul class="tm-breakdown-list">
        ${snap.levelBreakdown
          .map(
            (l) => `<li>
              <span>${l.meta.fullLabel}</span>
              <span class="tm-tabular">${l.cleared}/${l.total}</span>
            </li>`
          )
          .join('')}
      </ul>
    `;
  } else {
    dom.summaryLevels.hidden = true;
  }

  if (snap.phaseBreakdown.length) {
    dom.summaryPhases.hidden = false;
    dom.summaryPhases.innerHTML = `
      <h4>Trauma Care Phases</h4>
      <ul class="tm-breakdown-list">
        ${snap.phaseBreakdown
          .map(
            (p) => `<li>
              <span>${p.meta.label}</span>
              <span class="tm-tabular">${p.cleared}/${p.total}</span>
            </li>`
          )
          .join('')}
      </ul>
    `;
  } else {
    dom.summaryPhases.hidden = true;
  }

  if (snap.reasoningBreakdown.length) {
    dom.summaryReasoning.hidden = false;
    dom.summaryReasoning.innerHTML = `
      <h4>Reasoning Patterns Practiced This Shift</h4>
      <ul class="tm-breakdown-list">
        ${snap.reasoningBreakdown
          .map(
            (r) => `<li>
              <span>#${r.meta.number} ${r.meta.name} (${r.meta.levelLabel})</span>
              <span class="tm-tabular">${r.cleared}/${r.total}</span>
            </li>`
          )
          .join('')}
      </ul>
    `;
  } else {
    dom.summaryReasoning.hidden = true;
  }

  setScreen('gameover');
}

// =========================================================================
// EVENT WIRING & KEYBOARD CONTROLS
// =========================================================================
dom.dossierContainer.addEventListener('mouseover', (e) => {
  const el = e.target.closest('.tm-pname[data-pid]');
  if (el) setHighlightedPatient(el.dataset.pid);
});

dom.dossierContainer.addEventListener('mouseout', (e) => {
  const el = e.target.closest('.tm-pname[data-pid]');
  if (el) setHighlightedPatient(null);
});

dom.dossierContainer.addEventListener('click', (e) => {
  const el = e.target.closest('.tm-pname[data-pid]');
  if (!el) return;
  const pid = el.dataset.pid;
  state.pinnedHighlightId = state.pinnedHighlightId === pid ? null : pid;
  setHighlightedPatient(state.pinnedHighlightId);
});

dom.diffCards.forEach((btn) => {
  btn.addEventListener('click', () => {
    selectDifficulty(btn.dataset.difficulty);
  });
});

dom.casesInput.addEventListener('blur', () => {
  readCasesPerShift();
});

dom.nbackSelect.addEventListener('change', () => {
  state.nbackLevel = Number(dom.nbackSelect.value) || 2;
});

dom.speedDialBtn.addEventListener('click', () => {
  const nextIdx = SPEED_PRESETS.findIndex((p) => p > state.pace + 0.01);
  state.pace = nextIdx === -1 ? SPEED_PRESETS[0] : SPEED_PRESETS[nextIdx];
  updateSpeedDisplays();
});

dom.titleSpeedSlider.addEventListener('input', () => {
  state.pace = Number(dom.titleSpeedSlider.value);
  updateSpeedDisplays();
});

dom.paceSlider.addEventListener('input', () => {
  state.pace = Number(dom.paceSlider.value);
  updateSpeedDisplays();
});

dom.shortlistCheck.addEventListener('change', () => {
  state.useShortlist = dom.shortlistCheck.checked;
});

dom.startBtn.addEventListener('click', () => startShift());

dom.openGuideBtn.addEventListener('click', () => { dom.guideModal.hidden = false; });
dom.closeGuideBtn.addEventListener('click', () => { dom.guideModal.hidden = true; });

dom.muteBtn.addEventListener('click', (e) => {
  e.currentTarget.blur();
  const muted = audio.toggleMute();
  dom.muteBtn.setAttribute('aria-pressed', String(muted));
  dom.muteBtn.dataset.muted = String(muted);
  dom.muteBtn.title = muted ? 'Unmute audio (M)' : 'Mute audio (M)';
});

dom.pauseBtn.addEventListener('click', (e) => {
  e.currentTarget.blur();
  if (state.screen === 'playing') {
    clearDebriefTimer();
    setScreen('paused');
  } else if (state.screen === 'paused') {
    setScreen('playing');
  }
});

dom.endRunBtn.addEventListener('click', (e) => {
  e.currentTarget.blur();
  endShiftSummary();
});

dom.resumeBtn.addEventListener('click', () => setScreen('playing'));
dom.restartBtn.addEventListener('click', () => startShift());
dom.returnTitleBtn.addEventListener('click', () => {
  clearDebriefTimer();
  setScreen('title');
});

dom.playAgainBtn.addEventListener('click', () => startShift());
dom.summaryTitleBtn.addEventListener('click', () => setScreen('title'));

window.addEventListener('keydown', (e) => {
  if (!dom.guideModal.hidden) {
    if (e.key === 'Escape') dom.guideModal.hidden = true;
    return;
  }

  if (state.screen === 'title') {
    if (e.key === 'Enter' || e.key === ' ') {
      if (document.activeElement && ['SELECT', 'INPUT', 'BUTTON'].includes(document.activeElement.tagName)) {
        return;
      }
      e.preventDefault();
      startShift();
    }
    return;
  }

  if (e.key === 'm' || e.key === 'M') {
    const muted = audio.toggleMute();
    dom.muteBtn.setAttribute('aria-pressed', String(muted));
    dom.muteBtn.dataset.muted = String(muted);
    return;
  }

  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
    e.preventDefault();
    if (state.screen === 'playing') {
      clearDebriefTimer();
      setScreen('paused');
    } else if (state.screen === 'paused') {
      setScreen('playing');
    }
    return;
  }

  if (state.screen !== 'playing') return;

  if (state.setupMode === 'nback') {
    const k = e.key.toLowerCase();
    if (k === 'a') { state.nbackAnswers.valid = true; renderCurrentNBack(); return; }
    if (k === 's') { state.nbackAnswers.valid = false; renderCurrentNBack(); return; }
    if (k === 'd') { state.nbackAnswers.samePattern = true; renderCurrentNBack(); return; }
    if (k === 'f') { state.nbackAnswers.samePattern = false; renderCurrentNBack(); return; }
    if (k === 'h') { state.nbackAnswers.sameDomain = true; renderCurrentNBack(); return; }
    if (k === 'j') { state.nbackAnswers.sameDomain = false; renderCurrentNBack(); return; }
    if (k === 'k') { state.nbackAnswers.sameLead = true; renderCurrentNBack(); return; }
    if (k === 'l') { state.nbackAnswers.sameLead = false; renderCurrentNBack(); return; }
    if (e.key === ' ' || e.key === 'Enter' || k === 'n') {
      e.preventDefault();
      submitNBackRound();
    }
    return;
  }

  if (state.debrief) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      advanceStandardTrial();
    }
    return;
  }

  if (e.key >= '1' && e.key <= '9') {
    const idx = Number(e.key) - 1;
    if (PATIENTS[idx]) handlePatientIntervention(PATIENTS[idx].id);
  } else if (e.key === '0') {
    if (PATIENTS[9]) handlePatientIntervention(PATIENTS[9].id);
  }
});

function initFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const modeParam = params.get('mode');
  const tierParam = params.get('tier');

  if (modeParam === 'nback') {
    selectDifficulty('nback');
  } else if (tierParam && DIFFICULTY_TIERS.some((t) => t.id === tierParam)) {
    selectDifficulty(tierParam);
  } else {
    selectDifficulty('zero-to-hero');
  }

  const nParam = Number(params.get('n'));
  if (nParam >= 1 && nParam <= 6) {
    state.nbackLevel = nParam;
    dom.nbackSelect.value = String(nParam);
  }

  const casesParam = Number(params.get('cases'));
  if (casesParam >= 20 && casesParam <= 1000) {
    state.casesPerShift = Math.round(casesParam);
    dom.casesInput.value = String(state.casesPerShift);
  }

  const typeParam = params.get('type');
  const pinnedType = typeParam && REASONING_TYPES[typeParam] ? typeParam : null;

  updateSetupVisibility();
  scene.startLoop();

  if (params.get('autostart') === '1') {
    startShift({ pinnedReasoningType: pinnedType });
  } else {
    setScreen('title');
  }
}

initFromUrl();
