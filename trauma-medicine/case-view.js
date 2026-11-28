// Smart ICU Command Cockpit DOM renderer for Trauma Doctor.
// Features:
// - Interactive Chart Organizer (Shift / By Time / By Wing) for fast clinical reading & solving
// - Visual Lead (1st-named) vs Compared (2nd-named) role clarity + Wing color coding
// - Live hover/click patient cross-highlighting & right-click rule-out across all 6 charts + left ICU bay wall
// - Tactile Hypothesis-Flip scratchpad on Tiers 4-6 disputed (?) charts with live cross-check consistency indicators
// - In-place Post-Case Debrief revealing #N/80 reasoning taxonomy ONLY after answering
// - Balanced, medically vivid Climb the Ladder (N-Back) console with memory-depth ribbon

import { PATIENT_BY_ID, getPatientCondition } from './roster.js';
import { formatEdgeShort } from './case-layout.js';
import { evalClauseOnWorld } from './case-logic.js';
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

function renderEdgeInteractive(edge, verb) {
  const fromName = patientName(edge.from);
  const toName = patientName(edge.to);
  return `<span class="tm-pname tm-pname-lead" data-pid="${esc(edge.from)}">${esc(fromName)}</span> <span class="tm-verb">${esc(verb)}</span> <span class="tm-pname tm-pname-comp" data-pid="${esc(edge.to)}">${esc(toName)}</span>`;
}

function uncertaintyTagHtml(rec, isTestingFlip) {
  if (!rec.disputed) return '';
  const prefix = isTestingFlip ? 'Testing alternate reading' : 'Disputed';
  if (rec.uncertaintyMode === 'reverse') {
    return `<div class="tm-uncertain-note ${isTestingFlip ? 'is-testing' : ''}">? ${prefix}: order may be reversed</div>`;
  }
  if (rec.uncertaintyMode === 'swap' && rec.swapPair) {
    const [a, b] = rec.swapPair;
    return `<div class="tm-uncertain-note ${isTestingFlip ? 'is-testing' : ''}">? ${prefix}: mix-up between ${esc(patientName(a))} &amp; ${esc(patientName(b))}</div>`;
  }
  const alt2 = rec.altEdges?.[1];
  if (alt2) {
    return `<div class="tm-uncertain-note ${isTestingFlip ? 'is-testing' : ''}">? ${prefix}: alt line 2 — ${esc(formatEdgeShort(alt2, rec.verb))}</div>`;
  }
  return `<div class="tm-uncertain-note ${isTestingFlip ? 'is-testing' : ''}">? ${prefix}</div>`;
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
    return entries.sort((a, b) => a.rec.timeRank - b.rec.timeRank).map((e) => e.idx);
  }
  if (sortMode === 'wing') {
    // Interleave Wing 0 (left column) and Wing 1 (right column) in chronological order so 2-col grid aligns wings cleanly!
    const w0 = entries.filter((e) => e.rec.siteIdx === 0).sort((a, b) => a.rec.timeRank - b.rec.timeRank);
    const w1 = entries.filter((e) => e.rec.siteIdx === 1).sort((a, b) => a.rec.timeRank - b.rec.timeRank);
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
  const decisiveSet = new Set(debrief ? trial.explanation.decisiveChannels : []);
  const targetCount = trial.targets.length;
  const remainingSlots = Math.max(0, targetCount - selectedIds.length);
  const showWeights = !!trial.usesWeights;
  const showMinutes = !!trial.usesMinutes;
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
      const isDecisive = decisiveSet.has(rec.channelId);
      const trueBit = (trial.trueWorldMask >> idx) & 1;
      const isTestingFlip = !debrief && rec.disputed && flipSet.has(idx);

      const resolvedNote =
        debrief && rec.disputed
          ? `<div class="tm-resolved-state ${trueBit === 1 ? 'is-held' : 'is-flipped'}">${
              trueBit === 1 ? '✓ Confirmed as printed' : '↺ Alternate reading held'
            }</div>`
          : '';

      const edgesToShow = debrief
        ? rec.disputed && trueBit === 0
          ? rec.altEdges
          : rec.shownEdges
        : isTestingFlip
          ? rec.altEdges
          : rec.shownEdges;

      const acuityTag = showWeights
        ? `<span class="tm-rec-weight tm-tabular" title="Clinical acuity score">${rec.weight} pts</span>`
        : '';
      const minTag = showMinutes
        ? `<span class="tm-rec-min tm-tabular" title="Procedure duration">${rec.minutes} min</span>`
        : '';

      const flipBtn =
        !debrief && rec.disputed
          ? `<button type="button" class="tm-flip-btn ${isTestingFlip ? 'is-flipped' : ''}" data-flip-idx="${idx}" aria-pressed="${isTestingFlip ? 'true' : 'false'}" title="Preview alternate reading in your scratchpad">${
              isTestingFlip ? '↺ Alt On' : '? Test Flip'
            }</button>`
          : rec.disputed
            ? `<span class="tm-qmark" title="Disputed chart">?</span>`
            : '';

      const wingClass = rec.siteIdx === 0 ? 'is-wing-a' : 'is-wing-b';

      return `<article class="tm-rec-card ${rec.disputed ? 'is-disputed' : ''} ${isTestingFlip ? 'is-testing-flip' : ''} ${isDecisive ? 'is-decisive' : ''}">
        <div class="tm-rec-head">
          <span class="tm-rec-time tm-tabular">${esc(rec.time)}</span>
          <span class="tm-rec-site ${wingClass}">${esc(rec.site)}</span>
          <strong class="tm-rec-label">${esc(rec.label)}</strong>
          <span class="tm-rec-metrics">${acuityTag}${minTag}${flipBtn}</span>
        </div>
        <div class="tm-rec-lines">
          <div class="tm-rec-line">${renderEdgeInteractive(edgesToShow[0], rec.verb)}</div>
          <div class="tm-rec-line">${renderEdgeInteractive(edgesToShow[1], rec.verb)}</div>
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
               : 'Use "? Test Flip" on disputed charts to test combinations'
           }</span>
         </div>
         <ul class="tm-cc-list">
           ${trial.crossChecks
             .map((cc) => {
               const satisfied = evalClauseOnWorld(cc, debrief ? trial.trueWorldMask : hypothesisMask);
               const checkMark = `<span class="tm-cc-status ${satisfied ? 'is-ok' : 'is-clash'}" title="${
                 satisfied ? 'Matches current chart view' : 'Clashes with current chart view'
               }">${satisfied ? '✓' : '✕'}</span>`;
               return `<li class="tm-cc-item ${satisfied ? 'is-ok' : 'is-clash'}">
                 ${checkMark}
                 <span class="tm-cc-op">${esc(cc.symbol)}</span>
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
      <span class="tm-role-key" title="1st-named Lead patient vs 2nd-named Compared patient">
        <span class="tm-key-lead">1st Lead</span>
        <span aria-hidden="true">·</span>
        <span class="tm-key-comp">2nd Compared</span>
      </span>
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

export function renderNBackView(container, {
  trial,
  answers,
  lastFeedback,
  onChoose,
  onSubmit,
}) {
  const isEncoding = trial.truth.isEncoding;
  const phaseKey = trial.relation.phase.toLowerCase().includes('after')
    ? 'after'
    : trial.relation.phase.toLowerCase().includes('inside')
      ? 'inside'
      : 'before';

  // Memory-depth ribbon showing rounds up to current & highlighting the N-back comparison anchor
  const ribbonStart = Math.max(1, trial.index - trial.level - 1);
  const ribbonSlots = [];
  for (let r = ribbonStart; r <= trial.index; r++) {
    const isCurrent = r === trial.index;
    const isTargetBack = !isEncoding && r === trial.index - trial.level;
    ribbonSlots.push(
      `<div class="tm-nb-slot ${isCurrent ? 'is-current' : ''} ${isTargetBack ? 'is-anchor' : ''}">
         <span class="tm-nb-slot-num">#${r}</span>
         <span class="tm-nb-slot-label">${
           isCurrent ? 'Current' : isTargetBack ? `${trial.level}-Back` : 'Logged'
         }</span>
       </div>`
    );
  }

  // Patient clinical tags for the 3 patients in this briefing
  const patientStripHtml = trial.names
    .map((name) => {
      const pid = name.toLowerCase();
      const cond = getPatientCondition(pid, phaseKey);
      return `<div class="tm-nb-pt-chip">
        <strong>${esc(name)}</strong>
        <span>${esc(cond)}</span>
      </div>`;
    })
    .join('');

  const toggleBtn = (field, val, label, keyHint) => {
    const active = answers[field] === val;
    return `<button type="button" class="tm-nb-choice ${active ? 'is-selected' : ''}" data-nb-field="${field}" data-nb-val="${val}">
      <span class="tm-key-cap">${keyHint}</span>
      <span>${esc(label)}</span>
    </button>`;
  };

  const matrixHtml = isEncoding
    ? `<div class="tm-nb-encoding">
         <div class="tm-nb-enc-note">Memorize this clinical briefing (encoding round ${trial.index} of ${trial.level} before ${trial.level}-back comparisons begin).</div>
         <div class="tm-nb-row">
           <span class="tm-nb-q">Is this bedside briefing clinically consistent or a logical contradiction?</span>
           <div class="tm-nb-pair">
             ${toggleBtn('valid', true, 'Consistent', 'A')}
             ${toggleBtn('valid', false, 'Contradiction', 'S')}
           </div>
         </div>
         <button type="button" class="tm-btn tm-btn-primary tm-nb-submit" data-nb-submit="true">
           Confirm &amp; Next Round (Space)
         </button>
       </div>`
    : `<div class="tm-nb-matrix">
         <div class="tm-nb-row">
           <span class="tm-nb-q">1. Current briefing consistency</span>
           <div class="tm-nb-pair">
             ${toggleBtn('valid', true, 'Consistent', 'A')}
             ${toggleBtn('valid', false, 'Contradiction', 'S')}
           </div>
         </div>
         <div class="tm-nb-row">
           <span class="tm-nb-q">2. Same logical structure as #${trial.index - trial.level}?</span>
           <div class="tm-nb-pair">
             ${toggleBtn('samePattern', true, 'Same Pattern', 'D')}
             ${toggleBtn('samePattern', false, 'Different', 'F')}
           </div>
         </div>
         <div class="tm-nb-row">
           <span class="tm-nb-q">3. Same clinical domain as #${trial.index - trial.level}?</span>
           <div class="tm-nb-pair">
             ${toggleBtn('sameDomain', true, 'Same Domain', 'H')}
             ${toggleBtn('sameDomain', false, 'Different', 'J')}
           </div>
         </div>
         <div class="tm-nb-row">
           <span class="tm-nb-q">4. Same lead patient as #${trial.index - trial.level}?</span>
           <div class="tm-nb-pair">
             ${toggleBtn('sameLead', true, 'Same Lead', 'K')}
             ${toggleBtn('sameLead', false, 'Different', 'L')}
           </div>
         </div>
       </div>
       <div class="tm-nb-footer">
         <span class="tm-nb-keys-hint">Keys: A/S · D/F · H/J · K/L · Space submit</span>
         <button type="button" class="tm-btn tm-btn-primary tm-nb-submit" data-nb-submit="true">
           Submit Round (Space)
         </button>
       </div>`;

  const feedbackLine = lastFeedback
    ? `<div class="tm-nb-feedback ${lastFeedback.perfect ? 'is-clear' : 'is-miss'}">
         Last round: ${lastFeedback.correct}/${lastFeedback.total} accurate${
           lastFeedback.note ? ` · ${esc(lastFeedback.note)}` : ''
         }
       </div>`
    : '';

  container.innerHTML = `
    <div class="tm-nb-shell">
      <div class="tm-dossier-header">
        <div class="tm-dossier-meta">
          <span class="tm-phase-text">Climb the Ladder · ${trial.level}-Back</span>
          <span class="tm-sep" aria-hidden="true">·</span>
          <span class="tm-scenario-text">${esc(trial.relation.phase)}</span>
        </div>
        <div class="tm-slots-readout">
          <span class="tm-meta-label">Round</span>
          <span class="tm-slots-num">#${trial.index}</span>
        </div>
      </div>

      <div class="tm-nb-ribbon" aria-label="Memory window">${ribbonSlots.join('')}</div>

      ${feedbackLine}

      <section class="tm-nb-briefing" aria-label="3-statement clinical briefing">
        <div class="tm-nb-pts">${patientStripHtml}</div>
        <ol class="tm-nb-lines">
          ${trial.lines.map((line) => `<li>${esc(line)}</li>`).join('')}
        </ol>
      </section>

      ${matrixHtml}
    </div>
  `;

  container.querySelectorAll('[data-nb-field]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.nbField;
      const val = btn.dataset.nbVal === 'true';
      onChoose(field, val);
    });
  });
  const submitBtn = container.querySelector('[data-nb-submit="true"]');
  if (submitBtn) submitBtn.addEventListener('click', onSubmit);
}
