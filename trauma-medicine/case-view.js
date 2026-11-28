// Smart ICU Command Cockpit DOM renderer for Trauma Doctor.
// Features:
// - Interactive Chart Organizer (Shift / By Time / By Wing) for fast clinical reading & solving
// - Visual Lead (1st-named) vs Compared (2nd-named) role clarity + Wing color coding
// - Live hover/click patient cross-highlighting & right-click rule-out across all 6 charts + left ICU bay wall
// - Tactile Hypothesis-Flip scratchpad on Tiers 4-6 disputed (?) charts with live cross-check consistency indicators
// - In-place Post-Case Debrief revealing #N/80 reasoning taxonomy ONLY after answering
// - Balanced, medically vivid Climb the Ladder (N-Back) console with memory-depth ribbon

import { PATIENTS, PATIENT_BY_ID } from './roster.js';
import { TOTAL_REASONING_TYPES } from './reasoning-types.js';

function esc(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function patientName(id) {
  return PATIENT_BY_ID[id]?.name || id;
}

// Highlight every patient name appearing inside plain-English clinical sentences
// so hovering/clicking ANY name lights up their ICU bay AND every mention across all 6 cards!
const NAME_TO_ID = new Map(PATIENTS.map((p) => [p.name, p.id]));
const NAME_REGEX = new RegExp(`\\b(${PATIENTS.map((p) => p.name).join('|')})\\b`, 'g');

function renderSemanticFactHtml(factObj) {
  const escaped = esc(factObj.text || '');
  return escaped.replace(NAME_REGEX, (match) => {
    const pid = NAME_TO_ID.get(match);
    if (!pid) return match;
    return `<span class="tm-pname" data-pid="${esc(pid)}">${match}</span>`;
  });
}

function uncertaintyTagHtml(rec, isTestingFlip) {
  if (!rec.disputed) return '';
  if (isTestingFlip) {
    return `<div class="tm-uncertain-note is-testing">↺ Testing alternate reading — watch Cross-Checks below</div>`;
  }
  return `<div class="tm-uncertain-note">? Disputed chart — click "? Test Flip" to check alternate</div>`;
}

export function applyPatientBoardHighlight(container, highlightedId, ruledOutIds) {
  if (!container) return;
  const ruledSet = ruledOutIds instanceof Set ? ruledOutIds : new Set();
  container.querySelectorAll('.tm-pname[data-pid]').forEach((el) => {
    const pid = el.dataset.pid;
    el.classList.toggle('is-hl', !!highlightedId && pid === highlightedId);
    el.classList.toggle('is-ruled-out', ruledSet.has(pid));
  });
}

function orderRecordIndices(records, sortMode) {
  const entries = records.map((rec, idx) => ({ rec, idx }));
  if (sortMode === 'time') {
    return entries.sort((a, b) => (a.rec.timeRank ?? a.idx) - (b.rec.timeRank ?? b.idx)).map((e) => e.idx);
  }
  if (sortMode === 'wing') {
    const w0 = entries.filter((e) => (e.rec.siteIdx ?? 0) === 0).sort((a, b) => (a.rec.timeRank ?? a.idx) - (b.rec.timeRank ?? b.idx));
    const w1 = entries.filter((e) => (e.rec.siteIdx ?? 0) !== 0).sort((a, b) => (a.rec.timeRank ?? a.idx) - (b.rec.timeRank ?? b.idx));
    const out = [];
    const maxLen = Math.max(w0.length, w1.length);
    for (let i = 0; i < maxLen; i++) {
      if (w0[i]) out.push(w0[i].idx);
      if (w1[i]) out.push(w1[i].idx);
    }
    return out;
  }
  return entries.map((e) => e.idx);
}

export function renderClinicalDossier(container, {
  trial,
  useShortlist,
  selectedIds,
  debrief,
  isLastCase,
  onNextTrial,
  onHoldToggle,
  holdDebrief,
  highlightedPatientId = null,
  ruledOutIds = null,
  chartSortMode = 'default',
  onChangeSortMode = null,
  hypothesisFlips = null,
  onToggleHypothesisFlip = null,
  onClearMarks = null,
}) {
  const targetCount = trial.targets.length;
  const remainingSlots = Math.max(0, targetCount - selectedIds.length);
  const hasCrossChecks = trial.crossChecks.length > 0;
  const flipSet = hypothesisFlips instanceof Set ? hypothesisFlips : new Set();
  const hasMarks = (ruledOutIds && ruledOutIds.size > 0) || flipSet.size > 0;

  // Build player's current scratchpad world mask (purely from player's own Test Flip toggles — zero leakage)
  let hypothesisMask = 0b111111;
  for (const idx of flipSet) {
    hypothesisMask &= ~(1 << idx);
  }

  const slotsHtml = Array.from({ length: targetCount }, (_, i) => {
    const filled = i < selectedIds.length;
    return `<span class="tm-slot ${filled ? 'is-used' : 'is-ready'}" aria-hidden="true">${filled ? '●' : '○'}</span>`;
  }).join('');

  const shortlistHtml =
    useShortlist && trial.tierRank <= 3
      ? `<span class="tm-shortlist-inline" aria-label="Candidate shortlist">
           <span class="tm-meta-label">Shortlist</span>
           <span class="tm-shortlist-names">${trial.shortlist
             .map((id) => `<span class="tm-pname" data-pid="${esc(id)}">${esc(patientName(id))}</span>`)
             .join(' · ')}</span>
         </span>`
      : '';

  const displayOrder = orderRecordIndices(trial.records, chartSortMode);

  const cardsHtml = displayOrder
    .map((idx) => {
      const rec = trial.records[idx];
      const trueBit = (trial.trueWorldMask >> idx) & 1;
      const isTestingFlip = !debrief && rec.disputed && flipSet.has(idx);

      const resolvedNote =
        debrief && rec.disputed
          ? `<div class="tm-resolved-state ${trueBit === 1 ? 'is-held' : 'is-flipped'}">${
              trueBit === 1 ? '✓ Confirmed as printed' : '↺ Alternate reading held'
            }</div>`
          : '';

      const factsToShow = debrief
        ? rec.disputed && trueBit === 0
          ? rec.altFacts
          : rec.shownFacts
        : isTestingFlip
          ? rec.altFacts
          : rec.shownFacts;

      const flipBtn =
        !debrief && rec.disputed
          ? `<button type="button" class="tm-flip-btn ${isTestingFlip ? 'is-flipped' : ''}" data-flip-idx="${idx}" aria-pressed="${isTestingFlip ? 'true' : 'false'}" title="Preview alternate reading in your scratchpad">${
              isTestingFlip ? '↺ Alt On' : '? Test Flip'
            }</button>`
          : rec.disputed
            ? `<span class="tm-qmark" title="Disputed chart">?</span>`
            : '';

      const wingClass = (rec.siteIdx ?? 0) === 0 ? 'is-wing-a' : 'is-wing-b';

      return `<article class="tm-rec-card ${rec.disputed ? 'is-disputed' : ''} ${isTestingFlip ? 'is-testing-flip' : ''}">
        <div class="tm-rec-head">
          <span class="tm-rec-time tm-tabular">${esc(rec.time)}</span>
          <span class="tm-rec-site ${wingClass}">${esc(rec.site)}</span>
          <strong class="tm-rec-label">${esc(rec.label)}</strong>
          <span class="tm-rec-metrics">${flipBtn}</span>
        </div>
        <div class="tm-rec-lines">
          ${(factsToShow || [])
            .map((f) => `<div class="tm-rec-line">${renderSemanticFactHtml(f)}</div>`)
            .join('')}
        </div>
        ${!debrief ? uncertaintyTagHtml(rec, isTestingFlip) : resolvedNote}
      </article>`;
    })
    .join('');

  const crossChecksHtml = hasCrossChecks
    ? `<aside class="tm-crosschecks" aria-label="Chart cross-checks">
         <div class="tm-section-head">
           <span class="tm-meta-label">Cross-Checks</span>
           <span class="tm-meta-sub">${
             debrief
               ? 'Resolved disputed charts'
               : 'Click "? Test Flip" on disputed cards until every check turns ✓'
           }</span>
         </div>
         <ul class="tm-cc-list">
           ${trial.crossChecks
             .map((cc) => {
               const mask = debrief ? trial.trueWorldMask : hypothesisMask;
               const satisfied = typeof cc.evaluate === 'function' ? cc.evaluate(mask) : true;
               const checkMark = `<span class="tm-cc-status ${satisfied ? 'is-ok' : 'is-clash'}" title="${
                 satisfied ? 'Matches current chart view' : 'Clashes with current chart view'
               }">${satisfied ? '✓' : '✕'}</span>`;
               return `<li class="tm-cc-item ${satisfied ? 'is-ok' : 'is-clash'}">
                 ${checkMark}
                 <span class="tm-cc-op">${esc(cc.symbol || '•')}</span>
                 <span class="tm-cc-text">${esc(cc.text)}</span>
               </li>`;
             })
             .join('')}
         </ul>
       </aside>`
    : '';

  // Top Focal Anchor: Active Clinical Directive -> swaps cleanly IN-PLACE to Post-Case Debrief
  let topPanelHtml = '';
  if (!debrief) {
    topPanelHtml = `<section class="tm-order-card" aria-label="Clinical directive">
      <div class="tm-order-main">${esc(trial.order)}</div>
      <div class="tm-order-subrow">
        <span class="tm-order-detail">${esc(trial.detail)}</span>
        ${shortlistHtml}
      </div>
    </section>`;
  } else {
    const outcomeClass = debrief.cleared ? 'is-clear' : 'is-miss';
    const secStr = (debrief.elapsedMs / 1000).toFixed(1);
    const fastCall =
      debrief.cleared && debrief.elapsedMs <= 10500
        ? `<span class="tm-fast-tag">⚡ Fast Call</span>`
        : '';
    const outcomeHeading = debrief.cleared
      ? `Stabilized · ${secStr}s`
      : debrief.reason === 'timeout'
        ? 'Code Blue · Patient Crashed'
        : `Wrong Intervention (${esc(patientName(debrief.wrongId))})`;
    const rivalHtml = trial.explanation.rival
      ? `<div class="tm-debrief-rival"><strong>Why not ${esc(trial.explanation.rival.patientName)}?</strong> ${esc(trial.explanation.rival.reason)}</div>`
      : '';
    const ladderBanner = debrief.ladderEvent
      ? `<span class="tm-ladder-note">${
          debrief.ladderEvent.type === 'promoted'
            ? `▲ Promoted to ${esc(debrief.ladderEvent.tier.label)}`
            : `▼ Stepped down to ${esc(debrief.ladderEvent.tier.label)}`
        }</span>`
      : '';

    const r = trial.reasoningMeta;
    const nextLabel = isLastCase ? 'View Summary (Space)' : 'Next Case (Space)';
    topPanelHtml = `<section class="tm-debrief ${outcomeClass}" aria-live="polite">
      <div class="tm-debrief-top">
        <div class="tm-debrief-headline">
          <strong class="tm-debrief-title">${outcomeHeading}</strong>
          ${fastCall}
          <span class="tm-debrief-targets">Target${trial.targets.length > 1 ? 's' : ''}: <strong>${esc(
            trial.targets.map(patientName).join(', ')
          )}</strong></span>
          ${ladderBanner}
        </div>
        <div class="tm-debrief-actions">
          <button type="button" class="tm-btn tm-btn-ghost tm-btn-compact" data-action="hold-debrief">${
            holdDebrief ? 'Auto-Next Off' : 'Hold'
          }</button>
          <button type="button" class="tm-btn tm-btn-primary tm-btn-compact" data-action="next-trial">${nextLabel}</button>
        </div>
      </div>
      <div class="tm-debrief-cols">
        <div class="tm-debrief-col">
          <div class="tm-debrief-proof">${esc(trial.explanation.proof)}</div>
          ${rivalHtml}
        </div>
        <div class="tm-debrief-col tm-lesson-col">
          <div class="tm-lesson-head tm-debrief-type-badge">#${r.number}/${TOTAL_REASONING_TYPES} ${esc(r.name)} · ${esc(r.levelLabel)} · ${esc(r.familyShort)}</div>
          <div class="tm-lesson-copy"><strong>${esc(r.coreOperation)}</strong> ${esc(r.doctorLesson)}</div>
        </div>
      </div>
    </section>`;
  }

  const dispatchText = trial.scenario.dispatch
    ? `<span class="tm-dispatch-text">${esc(trial.scenario.dispatch)}</span>`
    : '';

  const sortButtonsHtml = `
    <div class="tm-chart-toolbar" role="toolbar" aria-label="Chart view controls">
      <div class="tm-sort-group" role="group" aria-label="Sort clinical charts">
        <button type="button" class="tm-tool-btn ${chartSortMode === 'default' ? 'is-active' : ''}" data-sort-mode="default" aria-pressed="${chartSortMode === 'default' ? 'true' : 'false'}">Shift</button>
        <button type="button" class="tm-tool-btn ${chartSortMode === 'time' ? 'is-active' : ''}" data-sort-mode="time" aria-pressed="${chartSortMode === 'time' ? 'true' : 'false'}">By Time</button>
        <button type="button" class="tm-tool-btn ${chartSortMode === 'wing' ? 'is-active' : ''}" data-sort-mode="wing" aria-pressed="${chartSortMode === 'wing' ? 'true' : 'false'}">By Wing</button>
      </div>
      <span class="tm-role-key">Hover any name to spotlight their bay · Right-click bay to cross off</span>
      ${
        hasMarks && !debrief
          ? `<button type="button" class="tm-tool-btn tm-tool-clear" data-action="clear-marks">Clear Marks</button>`
          : ''
      }
    </div>
  `;

  container.innerHTML = `
    <div class="tm-dossier-header">
      <div class="tm-dossier-meta">
        <span class="tm-phase-text">${esc(trial.phaseMeta.label)}</span>
        <span class="tm-sep" aria-hidden="true">·</span>
        <span class="tm-scenario-text">${esc(trial.scenario.title)}</span>
        ${dispatchText}
      </div>
      <div class="tm-slots-readout" aria-label="${remainingSlots} of ${targetCount} interventions remaining">
        <span class="tm-meta-label">Actions</span>
        <span class="tm-slots-pips">${slotsHtml}</span>
        <span class="tm-slots-num">${remainingSlots}/${targetCount}</span>
      </div>
    </div>

    ${topPanelHtml}

    <div class="tm-charts-section">
      ${sortButtonsHtml}
      <div class="tm-dossier-body ${hasCrossChecks ? 'has-crosschecks' : ''}">
        <section class="tm-chart-grid" aria-label="Clinical records">
          ${cardsHtml}
        </section>
        ${crossChecksHtml}
      </div>
    </div>
  `;

  applyPatientBoardHighlight(container, highlightedPatientId, ruledOutIds);

  const nextBtn = container.querySelector('[data-action="next-trial"]');
  if (nextBtn && onNextTrial) nextBtn.addEventListener('click', onNextTrial);
  const holdBtn = container.querySelector('[data-action="hold-debrief"]');
  if (holdBtn && onHoldToggle) holdBtn.addEventListener('click', onHoldToggle);
  const clearBtn = container.querySelector('[data-action="clear-marks"]');
  if (clearBtn && onClearMarks) clearBtn.addEventListener('click', onClearMarks);

  if (onChangeSortMode) {
    container.querySelectorAll('[data-sort-mode]').forEach((btn) => {
      btn.addEventListener('click', () => onChangeSortMode(btn.dataset.sortMode));
    });
  }
  if (onToggleHypothesisFlip) {
    container.querySelectorAll('[data-flip-idx]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onToggleHypothesisFlip(Number(btn.dataset.flipIdx));
      });
    });
  }
}

function formatNbCountdown(sec) {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

export function renderNBackView(container, {
  trial,
  answers,
  debrief,
  climbProgress,
  isLastCase = false,
  holdDebrief = false,
  onChooseVerdict,
  onChooseLock,
  onSubmit,
  onNextRound,
  onHoldToggle,
}) {
  const isEncoding = trial.truth.isEncoding;
  const anchorRound = trial.index - trial.level;

  // Memory-Depth Ribbon: shows logged rounds with accuracy dots and highlights the N-Back Echo Target
  const ribbonSlots = [];
  const trail = trial.historyTrail || [];
  for (const prev of trail) {
    const isAnchor = !isEncoding && prev.index === anchorRound;
    const statusDot =
      prev.perfect === true
        ? '<span class="tm-nb-dot is-ok">✓</span>'
        : prev.perfect === false
          ? '<span class="tm-nb-dot is-miss">✕</span>'
          : '';
    ribbonSlots.push(
      `<div class="tm-nb-slot ${isAnchor ? 'is-anchor' : ''}">
         <span>#${prev.index}</span>${statusDot}${
           isAnchor ? `<span class="tm-nb-slot-label">${trial.level}-Back Echo</span>` : ''
         }
       </div>`
    );
  }
  ribbonSlots.push(
    `<div class="tm-nb-slot is-current">
       <span>#${trial.index}</span>
       <span class="tm-nb-slot-label">${isEncoding ? `Encode ${trial.index}/${trial.level}` : 'Current'}</span>
     </div>`
  );

  // 3 Live Bedside Patient Cards (individualized varied countdowns + real conditions + click-to-call)
  const bayCardsHtml = trial.patients
    .map((pt, i) => {
      const isSelected = answers.verdict === i;
      let stateClass = '';
      let badgeText = formatNbCountdown(pt.remSec);
      let badgeClass = pt.remSec <= 15 ? 'is-crit' : pt.remSec <= 38 ? 'is-warn' : '';

      if (debrief) {
        if (trial.verdict === i) {
          stateClass = debrief.verdictCorrect ? 'is-saved' : 'is-target';
          badgeText = debrief.verdictCorrect ? '✓ SAVED' : '◎ TARGET';
          badgeClass = 'is-target';
        } else if (answers.verdict === i && trial.verdict !== i) {
          stateClass = 'is-wrong';
          badgeText = '✕ WRONG';
          badgeClass = 'is-crit';
        } else if (trial.isClash) {
          stateClass = 'is-clash';
          badgeText = '⚡ CLASH';
          badgeClass = 'is-warn';
        } else {
          stateClass = 'is-dim';
        }
      } else if (isSelected) {
        stateClass = 'is-picked';
      }

      const barPct = Math.round(pt.progress * 100);
      const barTone = pt.remSec <= 15 ? 'is-crit' : pt.remSec <= 38 ? 'is-warn' : 'is-ok';

      return `<button type="button" class="tm-nb-bay ${stateClass}" data-nb-verdict="${i}" ${debrief ? 'disabled' : ''}>
        <div class="tm-nb-bay-top">
          <span class="tm-nb-bay-id">
            <span class="tm-key-cap">${i + 1}</span>
            <strong>${esc(pt.name)}</strong>
          </span>
          <span class="tm-nb-bay-clock tm-tabular ${badgeClass}" data-nb-clock="${i}">${esc(badgeText)}</span>
        </div>
        <div class="tm-nb-bay-mid">
          <span class="tm-nb-bay-cond">${esc(pt.condition)}</span>
          <span class="tm-nb-bay-bpm tm-tabular">${pt.bpm} BPM</span>
        </div>
        <div class="tm-nb-bar-track">
          <div class="tm-nb-bar-fill ${barTone}" data-nb-bar="${i}" style="width:${barPct}%"></div>
          <span class="tm-nb-bar-tick" aria-hidden="true"></span>
        </div>
      </button>`;
    })
    .join('');

  // Bottom Decision Console -> swaps cleanly IN-PLACE to Post-Round Clinical Debrief
  let consoleHtml = '';

  if (!debrief) {
    const verdictButtonsHtml = `
      <div class="tm-nb-verdict-row" role="group" aria-label="Bedside clinical call">
        ${trial.patients
          .map(
            (pt, i) => `<button type="button" class="tm-nb-choice ${answers.verdict === i ? 'is-selected' : ''}" data-nb-verdict="${i}" aria-pressed="${answers.verdict === i ? 'true' : 'false'}">
              <span class="tm-key-cap">${i + 1}</span>
              <span>${esc(pt.name)}</span>
            </button>`
          )
          .join('')}
        <button type="button" class="tm-nb-choice tm-nb-clash-btn ${answers.verdict === 'clash' ? 'is-selected' : ''}" data-nb-verdict="clash" aria-pressed="${answers.verdict === 'clash' ? 'true' : 'false'}">
          <span class="tm-key-cap">4</span>
          <span>Clinical Clash</span>
        </button>
      </div>
    `;

    const lockBtn = (field, val, label, keyHint) => {
      const active = answers[field] === val;
      return `<button type="button" class="tm-nb-lock-btn ${active ? 'is-selected' : ''}" data-nb-lock="${field}" data-nb-val="${val}" aria-pressed="${active ? 'true' : 'false'}">
        <span class="tm-key-cap">${keyHint}</span>
        <span>${esc(label)}</span>
      </button>`;
    };

    const locksHtml = isEncoding
      ? `<div class="tm-nb-enc-banner">
           Encoding round <strong>${trial.index} of ${trial.level}</strong> — remember this round's <strong>Phase (${esc(trial.phaseMeta.shortLabel)})</strong>, <strong>Target Call</strong>, and <strong>Domain (${esc(trial.domain.short)})</strong> for future ${trial.level}-back matches.
         </div>`
      : `<div class="tm-nb-locks-grid" aria-label="N-Back comparisons against round ${anchorRound}">
           <div class="tm-nb-lock-card">
             <span class="tm-nb-lock-q">Same Phase as #${anchorRound}?</span>
             <div class="tm-nb-pair">
               ${lockBtn('samePhase', true, 'Same', 'A')}
               ${lockBtn('samePhase', false, 'Diff', 'S')}
             </div>
           </div>
           <div class="tm-nb-lock-card">
             <span class="tm-nb-lock-q">Same Target as #${anchorRound}?</span>
             <div class="tm-nb-pair">
               ${lockBtn('sameTarget', true, 'Same', 'D')}
               ${lockBtn('sameTarget', false, 'Diff', 'F')}
             </div>
           </div>
           <div class="tm-nb-lock-card">
             <span class="tm-nb-lock-q">Same Domain as #${anchorRound}?</span>
             <div class="tm-nb-pair">
               ${lockBtn('sameDomain', true, 'Same', 'H')}
               ${lockBtn('sameDomain', false, 'Diff', 'J')}
             </div>
           </div>
         </div>`;

    const canSubmit = answers.verdict !== null;
    consoleHtml = `
      <section class="tm-nb-console" aria-label="Clinical decision console">
        ${verdictButtonsHtml}
        ${locksHtml}
        <div class="tm-nb-footer">
          <span class="tm-nb-keys-hint">${
            isEncoding
              ? 'Keys: 1–3 Patient · 4 Clash · Space Submit'
              : 'Keys: 1–4 Call · A/S Phase · D/F Target · H/J Domain · Space Submit'
          }</span>
          <button type="button" class="tm-btn tm-btn-primary tm-nb-submit" data-nb-submit="true" ${canSubmit ? '' : 'disabled'}>
            ${isEncoding ? 'Confirm Call (Space)' : 'Submit Round (Space)'}
          </button>
        </div>
      </section>
    `;
  } else {
    const r = trial.reasoningMeta;
    const outcomeClass = debrief.perfect ? 'is-clear' : 'is-miss';
    const secStr = (debrief.elapsedMs / 1000).toFixed(1);
    const titleText = debrief.timedOut
      ? 'Code Blue · Patient Crashed'
      : debrief.perfect
        ? `Perfect Call · ${debrief.correct}/${debrief.total} · ${secStr}s`
        : `Round Result · ${debrief.correct}/${debrief.total}`;
    const ladderBanner = debrief.ladderEvent
      ? `<span class="tm-ladder-note">${
          debrief.ladderEvent.type === 'promoted'
            ? `▲ Climbed to ${debrief.ladderEvent.level}-Back!`
            : `▼ Stepped to ${debrief.ladderEvent.level}-Back`
        }</span>`
      : '';

    const echoChipsHtml = trial.truth.nBackRef
      ? `<div class="tm-nb-echo-chips">
           <span class="tm-nb-echo-label">vs #${trial.truth.nBackRef.index}:</span>
           <span class="tm-nb-chip ${debrief.checks.samePhase ? 'is-ok' : 'is-miss'}">Phase ${esc(trial.truth.nBackRef.phaseShort)} ${debrief.checks.samePhase ? '✓' : '✕'}</span>
           <span class="tm-nb-chip ${debrief.checks.sameTarget ? 'is-ok' : 'is-miss'}">Target ${esc(trial.truth.nBackRef.verdictName)} ${debrief.checks.sameTarget ? '✓' : '✕'}</span>
           <span class="tm-nb-chip ${debrief.checks.sameDomain ? 'is-ok' : 'is-miss'}">Domain ${esc(trial.truth.nBackRef.domainShort)} ${debrief.checks.sameDomain ? '✓' : '✕'}</span>
         </div>`
      : '';

    const nextLabel = isLastCase ? 'View Summary (Space)' : 'Next Round (Space)';

    consoleHtml = `
      <section class="tm-debrief tm-nb-debrief ${outcomeClass}" aria-live="polite">
        <div class="tm-debrief-top">
          <div class="tm-debrief-headline">
            <strong class="tm-debrief-title">${esc(titleText)}</strong>
            <span class="tm-debrief-targets">Call: <strong>${esc(trial.truth.verdictName)}</strong></span>
            ${ladderBanner}
          </div>
          <div class="tm-debrief-actions">
            <button type="button" class="tm-btn tm-btn-ghost tm-btn-compact" data-nb-hold="true">${
              holdDebrief ? 'Auto-Next Off' : 'Hold'
            }</button>
            <button type="button" class="tm-btn tm-btn-primary tm-btn-compact" data-nb-next="true">${nextLabel}</button>
          </div>
        </div>
        <div class="tm-debrief-cols">
          <div class="tm-debrief-col">
            <div class="tm-debrief-proof">${esc(trial.explanation.proof)}</div>
            <div class="tm-debrief-rival">${esc(trial.explanation.rival)}</div>
            ${echoChipsHtml}
          </div>
          <div class="tm-debrief-col tm-lesson-col">
            <div class="tm-lesson-head tm-debrief-type-badge">#${r.number}/${TOTAL_REASONING_TYPES} ${esc(r.name)} · ${esc(r.levelLabel)} · ${esc(r.familyShort)}</div>
            <div class="tm-lesson-copy"><strong>${esc(r.coreOperation)}</strong> ${esc(r.doctorLesson)}</div>
          </div>
        </div>
      </section>
    `;
  }

  container.innerHTML = `
    <div class="tm-nb-shell">
      <div class="tm-dossier-header">
        <div class="tm-dossier-meta">
          <span class="tm-phase-text">${esc(trial.phaseMeta.label)}</span>
          <span class="tm-sep" aria-hidden="true">·</span>
          <span class="tm-scenario-text">${esc(trial.domain.label)}</span>
        </div>
        <div class="tm-slots-readout">
          <span class="tm-nb-climb-tag">${esc(climbProgress || `${trial.level}-Back`)}</span>
          <span class="tm-sep" aria-hidden="true">·</span>
          <span class="tm-slots-num">Round #${trial.index}</span>
        </div>
      </div>

      <div class="tm-nb-ribbon" aria-label="Working memory window">${ribbonSlots.join('')}</div>

      <section class="tm-nb-bay-grid" aria-label="Three active trauma bays">
        ${bayCardsHtml}
      </section>

      <section class="tm-nb-briefing" aria-label="Clinical case briefing">
        <div class="tm-nb-directive">${esc(trial.directive)}</div>
        <ol class="tm-nb-lines">
          ${trial.lines.map((line) => `<li>${esc(line)}</li>`).join('')}
        </ol>
      </section>

      ${consoleHtml}
    </div>
  `;

  if (!debrief) {
    container.querySelectorAll('[data-nb-verdict]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const raw = btn.dataset.nbVerdict;
        const val = raw === 'clash' ? 'clash' : Number(raw);
        if (onChooseVerdict) onChooseVerdict(val);
      });
    });
    container.querySelectorAll('[data-nb-lock]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const field = btn.dataset.nbLock;
        const val = btn.dataset.nbVal === 'true';
        if (onChooseLock) onChooseLock(field, val);
      });
    });
    const submitBtn = container.querySelector('[data-nb-submit="true"]');
    if (submitBtn && onSubmit) submitBtn.addEventListener('click', onSubmit);
  } else {
    const nextBtn = container.querySelector('[data-nb-next="true"]');
    if (nextBtn && onNextRound) nextBtn.addEventListener('click', onNextRound);
    const holdBtn = container.querySelector('[data-nb-hold="true"]');
    if (holdBtn && onHoldToggle) holdBtn.addEventListener('click', onHoldToggle);
  }
}
