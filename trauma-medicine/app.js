// Main Trauma Medicine game controller & state machine.
// Mirrors state strictly onto document.body.dataset.state ('title' | 'playing' | 'paused' | 'gameover').
// Supports ?autostart=1, ?mode=zero-to-hero|fixed|nback, ?tier=..., ?n=1..6, ?family=..., ?level=..., ?type=...

import { PATIENTS } from './roster.js';
import { DIFFICULTY_TIERS } from './case-families.js';
import { REASONING_TYPES } from './reasoning-types.js';
import { ClinicalDeckScheduler } from './case-decks.js';
import { ClinicalNBackStream } from './nback-cases.js';
import { TraumaSession, loadMasteryStore, countMasteredTypes } from './trauma-session.js';
import { TraumaWardScene } from './ward-scene.js';
import { ClinicalAudio } from './audio.js';
import { renderClinicalDossier, renderNBackView, renderReasoningAtlas } from './case-view.js';

const $ = (sel) => document.querySelector(sel);

const dom = {
  body: document.body,
  canvas: $('#ward-canvas'),
  titleOverlay: $('#title-overlay'),
  pauseModal: $('#pause-modal'),
  summaryModal: $('#summary-modal'),
  guideModal: $('#guide-modal'),
  atlasModal: $('#atlas-modal'),
  atlasBody: $('#atlas-body'),

  // Title setup controls
  modeButtons: Array.from(document.querySelectorAll('[data-setup-mode]')),
  tierRow: $('#tier-selector-row'),
  tierSelect: $('#tier-select'),
  nbackRow: $('#nback-selector-row'),
  nbackSelect: $('#nback-select'),
  focusRow: $('#focus-filters-row'),
  familyFilterSelect: $('#family-filter-select'),
  levelFilterSelect: $('#level-filter-select'),
  shortlistRow: $('#shortlist-row'),
  shortlistCheck: $('#shortlist-checkbox'),
  startBtn: $('#start-shift-btn'),
  openAtlasBtn: $('#open-atlas-btn'),
  hudAtlasBtn: $('#hud-atlas-btn'),
  summaryAtlasBtn: $('#summary-atlas-btn'),
  closeAtlasBtn: $('#close-atlas-btn'),
  openGuideBtn: $('#open-guide-btn'),
  closeGuideBtn: $('#close-guide-btn'),

  // Playing HUD & Controls
  hudTier: $('#hud-tier'),
  hudScore: $('#hud-score'),
  hudStreak: $('#hud-streak'),
  hudLadder: $('#hud-ladder'),
  hudMastered: $('#hud-mastered'),
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
  setupMode: 'zero-to-hero',
  fixedTierId: 'super-super-easy',
  nbackLevel: 2,
  familyFilter: 'all',
  levelFilter: 'all',
  useShortlist: false,
  pace: 1.0,
  holdDebrief: false,

  atlasFamily: 'all',
  atlasLevel: 'all',
  screenBeforeAtlas: null,

  session: null,
  scheduler: null,
  nbackStream: null,
  currentTrial: null,
  trialStartTs: 0,
  selectedIds: [],
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
});

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
  dom.modeButtons.forEach((btn) => {
    const active = btn.dataset.setupMode === state.setupMode;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  dom.tierRow.hidden = state.setupMode !== 'fixed';
  dom.nbackRow.hidden = state.setupMode !== 'nback';
  dom.focusRow.hidden = state.setupMode === 'nback';

  const tierRank =
    state.setupMode === 'zero-to-hero'
      ? 1
      : DIFFICULTY_TIERS.find((t) => t.id === state.fixedTierId)?.rank || 1;
  dom.shortlistRow.hidden = state.setupMode === 'nback' || tierRank > 3;
}

function renderBayButtons() {
  if (state.setupMode === 'nback' || !state.currentTrial) {
    dom.bayButtonsBar.innerHTML = '';
    return;
  }
  const shortlistSet =
    state.useShortlist && state.currentTrial.tierRank <= 3
      ? new Set(state.currentTrial.shortlist)
      : null;

  dom.bayButtonsBar.innerHTML = PATIENTS.map((p, i) => {
    const keyNum = i === 9 ? '0' : String(i + 1);
    const chosen = state.selectedIds.includes(p.id);
    const dimmed = shortlistSet && !shortlistSet.has(p.id);
    const isTarget = state.debrief && state.currentTrial.targets.includes(p.id);
    const isWrong = state.debrief && state.debrief.wrongId === p.id;
    let cls = 'tm-bay-btn';
    if (chosen) cls += ' is-picked';
    if (dimmed) cls += ' is-dimmed';
    if (isTarget) cls += ' is-target';
    if (isWrong) cls += ' is-wrong';
    const disabled = !!state.debrief || chosen;
    return `<button type="button" class="${cls}" data-patient-id="${p.id}" ${disabled ? 'disabled' : ''}>
      <span class="tm-key-cap">${keyNum}</span>
      <span>${p.name}</span>
    </button>`;
  }).join('');

  dom.bayButtonsBar.querySelectorAll('[data-patient-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.blur();
      handlePatientIntervention(btn.dataset.patientId);
    });
  });
}

function updateHud() {
  if (!state.session) return;
  if (state.setupMode === 'nback') {
    dom.hudTier.textContent = `${state.nbackLevel}-Back Rounds`;
    dom.hudLadder.textContent = `${state.session.accuracyPercent()}% accuracy`;
  } else {
    const tierId = state.session.activeTierId();
    const tierObj = DIFFICULTY_TIERS.find((t) => t.id === tierId) || DIFFICULTY_TIERS[0];
    dom.hudTier.textContent = tierObj.short;
    dom.hudLadder.textContent = state.session.ladder
      ? state.session.ladder.progressText()
      : 'Fixed Tier';
  }
  dom.hudScore.textContent = `${state.session.cleared}/${state.session.total}`;
  dom.hudStreak.textContent = String(state.session.currentStreak);

  const mastered = countMasteredTypes(loadMasteryStore());
  if (dom.hudMastered) {
    dom.hudMastered.textContent = `${mastered.clearedOnce}/${mastered.total}`;
  }
}

function startShift({ pinnedReasoningType = null } = {}) {
  clearDebriefTimer();
  dom.atlasModal.hidden = true;
  if (document.activeElement && document.activeElement.blur) {
    document.activeElement.blur();
  }

  if (pinnedReasoningType && state.setupMode === 'nback') {
    state.setupMode = 'zero-to-hero';
    updateSetupVisibility();
  }

  state.session = new TraumaSession({
    mode: state.setupMode,
    tierId: state.fixedTierId,
    nbackLevel: state.nbackLevel,
  });
  state.scheduler = new ClinicalDeckScheduler(Date.now() % 1000000 + 137, {
    familyFilter: state.familyFilter,
    levelFilter: state.levelFilter,
  });
  if (pinnedReasoningType) {
    state.scheduler.queueReasoningType(pinnedReasoningType);
  }
  state.nbackStream =
    state.setupMode === 'nback'
      ? new ClinicalNBackStream(state.nbackLevel, Date.now() % 1000000 + 509)
      : null;

  state.currentTrial = null;
  state.selectedIds = [];
  state.debrief = null;
  state.nbackFeedback = null;

  const isNback = state.setupMode === 'nback';
  dom.wardWrap.hidden = isNback;
  dom.bayButtonsBar.hidden = isNback;
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
  const tierId = state.session.activeTierId();
  state.currentTrial = state.scheduler.nextTrial(tierId);
  state.selectedIds = [];
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
    holdDebrief: state.holdDebrief,
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

  state.debrief = { cleared, reason, wrongId, elapsedMs, ladderEvent };
  scene.revealDebrief(state.currentTrial.targets, state.currentTrial.explanation.rival?.patientId);
  scene.setMode('debrief');

  if (ladderEvent?.type === 'promoted') {
    audio.playPromote();
  } else if (cleared) {
    audio.playClear();
  } else {
    audio.playMiss();
  }

  updateHud();
  renderBayButtons();
  renderCurrentDossier();

  if (!state.holdDebrief) {
    const delayMs = cleared ? 5600 : 7800;
    state.debriefTimer = setTimeout(() => {
      if (state.screen === 'playing' && state.debrief && dom.atlasModal.hidden) {
        advanceStandardTrial();
      }
    }, delayMs);
  }
}

// =========================================================================
// 80-TYPE REASONING ATLAS MODAL
// =========================================================================
function openAtlas() {
  state.screenBeforeAtlas = state.screen;
  if (state.screen === 'playing') {
    clearDebriefTimer();
    scene.setMode('paused');
  }
  dom.atlasModal.hidden = false;
  refreshAtlas();
}

function closeAtlas() {
  dom.atlasModal.hidden = true;
  if (state.screenBeforeAtlas === 'playing') {
    scene.setMode(state.setupMode === 'nback' ? 'nback' : state.debrief ? 'debrief' : 'playing');
  }
}

function refreshAtlas() {
  renderReasoningAtlas(dom.atlasBody, {
    masteryStore: loadMasteryStore(),
    familyFilter: state.atlasFamily,
    levelFilter: state.atlasLevel,
    onFilterChange: (fam, lvl) => {
      state.atlasFamily = fam;
      state.atlasLevel = lvl;
      refreshAtlas();
    },
    onPracticeType: (typeId) => {
      dom.atlasModal.hidden = true;
      if (state.session && state.setupMode !== 'nback' && state.screenBeforeAtlas === 'playing') {
        state.scheduler.queueReasoningType(typeId);
        advanceStandardTrial();
      } else {
        startShift({ pinnedReasoningType: typeId });
      }
    },
  });
}

// =========================================================================
// CLINICAL ROUNDS N-BACK FLOW
// =========================================================================
function advanceNBackTrial() {
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
    if (ok) audio.playClear();
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
  if (correct === 4) audio.playClear();
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
      ? `Clinical Rounds (${snap.nbackLevel}-Back) Complete`
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
      <h4>Reasoning Patterns Practiced</h4>
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
dom.modeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    state.setupMode = btn.dataset.setupMode;
    updateSetupVisibility();
  });
});

dom.tierSelect.addEventListener('change', () => {
  state.fixedTierId = dom.tierSelect.value;
  updateSetupVisibility();
});

dom.nbackSelect.addEventListener('change', () => {
  state.nbackLevel = Number(dom.nbackSelect.value) || 2;
});

dom.familyFilterSelect.addEventListener('change', () => {
  state.familyFilter = dom.familyFilterSelect.value;
});

dom.levelFilterSelect.addEventListener('change', () => {
  state.levelFilter = dom.levelFilterSelect.value;
});

dom.shortlistCheck.addEventListener('change', () => {
  state.useShortlist = dom.shortlistCheck.checked;
});

dom.startBtn.addEventListener('click', () => startShift());

dom.openAtlasBtn.addEventListener('click', () => openAtlas());
dom.hudAtlasBtn.addEventListener('click', (e) => { e.currentTarget.blur(); openAtlas(); });
dom.summaryAtlasBtn.addEventListener('click', () => openAtlas());
dom.closeAtlasBtn.addEventListener('click', () => closeAtlas());

dom.openGuideBtn.addEventListener('click', () => { dom.guideModal.hidden = false; });
dom.closeGuideBtn.addEventListener('click', () => { dom.guideModal.hidden = true; });

dom.paceSlider.addEventListener('input', () => {
  state.pace = Number(dom.paceSlider.value);
  dom.paceValue.textContent = `${state.pace.toFixed(2).replace(/\.00$/, '')}×`;
  scene.setPaceMultiplier(state.pace);
});

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
  if (!dom.atlasModal.hidden) {
    if (e.key === 'Escape') closeAtlas();
    return;
  }
  if (!dom.guideModal.hidden) {
    if (e.key === 'Escape') dom.guideModal.hidden = true;
    return;
  }

  if (state.screen === 'title') {
    if (e.key === 'Enter' || e.key === ' ') {
      if (document.activeElement && ['SELECT', 'INPUT'].includes(document.activeElement.tagName)) {
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
  if (modeParam && ['zero-to-hero', 'fixed', 'nback'].includes(modeParam)) {
    state.setupMode = modeParam;
  }
  const tierParam = params.get('tier');
  if (tierParam && DIFFICULTY_TIERS.some((t) => t.id === tierParam)) {
    state.fixedTierId = tierParam;
    dom.tierSelect.value = tierParam;
    if (!modeParam) state.setupMode = 'fixed';
  }
  const famParam = params.get('family');
  if (famParam) {
    state.familyFilter = famParam;
    dom.familyFilterSelect.value = famParam;
  }
  const lvlParam = params.get('level');
  if (lvlParam && ['all', 'atomic', 'composite', 'meta'].includes(lvlParam)) {
    state.levelFilter = lvlParam;
    dom.levelFilterSelect.value = lvlParam;
  }
  const nParam = Number(params.get('n'));
  if (nParam >= 1 && nParam <= 6) {
    state.nbackLevel = nParam;
    dom.nbackSelect.value = String(nParam);
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
