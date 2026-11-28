// Zero-scroll single-screen DOM view renderer for Trauma Doctor.
// Renders all 6 clinical records in a compact 2x3 card grid (with side-by-side Cross-Checks
// on Tiers 4-6), wraps every patient name for instant cross-highlighting across the entire
// board, swaps Debrief cleanly in-place, and strictly hides reasoning taxonomy until answered.

import { PATIENT_BY_ID } from './roster.js';
import { formatEdgeShort } from './case-layout.js';
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
  return `<span class="tm-pname tm-pname-left" data-pid="${esc(edge.from)}">${esc(fromName)}</span> <span class="tm-verb">${esc(verb)}</span> <span class="tm-pname tm-pname-right" data-pid="${esc(edge.to)}">${esc(toName)}</span>`;
}

function uncertaintyTagHtml(rec) {
  if (!rec.disputed) return '';
  if (rec.uncertaintyMode === 'reverse') {
    return `<div class="tm-uncertain-note">? Arrows may be reversed</div>`;
  }
  if (rec.uncertaintyMode === 'swap' && rec.swapPair) {
    const [a, b] = rec.swapPair;
    return `<div class="tm-uncertain-note">? Mix-up: swap ${esc(patientName(a))} &amp; ${esc(patientName(b))}</div>`;
  }
  const alt2 = rec.altEdges?.[1];
  if (alt2) {
    return `<div class="tm-uncertain-note">? Alt line 2: ${esc(formatEdgeShort(alt2, rec.verb))}</div>`;
  }
  return `<div class="tm-uncertain-note">? Disputed reading</div>`;
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
}) {
  const decisiveSet = new Set(debrief ? trial.explanation.decisiveChannels : []);
  const targetCount = trial.targets.length;
  const remainingSlots = Math.max(0, targetCount - selectedIds.length);
  const showWeights = !!trial.usesWeights;
  const showMinutes = !!trial.usesMinutes;
  const hasCrossChecks = trial.crossChecks.length > 0;

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

  // Compact 2x3 clinical record cards — all 6 visible simultaneously with zero scrolling!
  const cardsHtml = trial.records
    .map((rec, idx) => {
      const isDecisive = decisiveSet.has(rec.channelId);
      const trueBit = (trial.trueWorldMask >> idx) & 1;
      const resolvedNote =
        debrief && rec.disputed
          ? `<div class="tm-resolved-state ${trueBit === 1 ? 'is-held' : 'is-flipped'}">${
              trueBit === 1 ? '✓ Held as printed' : '↺ Flipped reading held'
            }</div>`
          : '';
      const edgesToShow = debrief && rec.disputed && trueBit === 0 ? rec.altEdges : rec.shownEdges;
      const weightTag = showWeights
        ? `<span class="tm-rec-weight tm-tabular">+${rec.weight}</span>`
        : '';
      const minTag = showMinutes
        ? `<span class="tm-rec-min tm-tabular">${rec.minutes}m</span>`
        : '';
      const qBadge = rec.disputed ? `<span class="tm-qmark" title="Disputed record">?</span>` : '';

      return `<article class="tm-rec-card ${rec.disputed ? 'is-disputed' : ''} ${isDecisive ? 'is-decisive' : ''}">
        <div class="tm-rec-head">
          <span class="tm-rec-time tm-tabular">${esc(rec.time)}</span>
          <span class="tm-rec-site">${esc(rec.site)}</span>
          <strong class="tm-rec-label">${esc(rec.label)}${qBadge}</strong>
          <span class="tm-rec-metrics">${weightTag}${minTag}</span>
        </div>
        <div class="tm-rec-lines">
          <div class="tm-rec-line">${renderEdgeInteractive(edgesToShow[0], rec.verb)}</div>
          <div class="tm-rec-line">${renderEdgeInteractive(edgesToShow[1], rec.verb)}</div>
        </div>
        ${!debrief ? uncertaintyTagHtml(rec) : resolvedNote}
      </article>`;
    })
    .join('');

  const crossChecksHtml = hasCrossChecks
    ? `<aside class="tm-crosschecks" aria-label="Chart cross-checks">
         <div class="tm-section-head">
           <span class="tm-meta-label">Cross-Checks</span>
           <span class="tm-meta-sub">Resolve disputed (?) rows</span>
         </div>
         <ul class="tm-cc-list">
           ${trial.crossChecks
             .map(
               (cc) => `<li class="tm-cc-item">
                 <span class="tm-cc-op">${esc(cc.symbol)}</span>
                 <span class="tm-cc-text">${esc(cc.text)}</span>
               </li>`
             )
             .join('')}
         </ul>
       </aside>`
    : '';

  // Top primary panel: Directive during active play -> swaps cleanly IN-PLACE to Debrief after answering!
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
    const fastCall = debrief.cleared && debrief.elapsedMs <= 10500
      ? `<span class="tm-fast-tag">⚡ Fast Call</span>`
      : '';
    const outcomeHeading = debrief.cleared
      ? `Stabilized · ${secStr}s`
      : debrief.reason === 'timeout'
        ? 'Time Expired · Patient Crashed'
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
          <div class="tm-lesson-head">#${r.number}/${TOTAL_REASONING_TYPES} ${esc(r.name)} · ${esc(r.levelLabel)} · ${esc(r.familyShort)}</div>
          <div class="tm-lesson-copy"><strong>${esc(r.coreOperation)}</strong> ${esc(r.doctorLesson)}</div>
        </div>
      </div>
    </section>`;
  }

  const dispatchText = trial.scenario.dispatch
    ? `<span class="tm-dispatch-text">${esc(trial.scenario.dispatch)}</span>`
    : '';

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

    <div class="tm-dossier-body ${hasCrossChecks ? 'has-crosschecks' : ''}">
      <section class="tm-chart-grid" aria-label="Clinical records">
        ${cardsHtml}
      </section>
      ${crossChecksHtml}
    </div>
  `;

  applyPatientBoardHighlight(container, highlightedPatientId, ruledOutIds);

  const nextBtn = container.querySelector('[data-action="next-trial"]');
  if (nextBtn && onNextTrial) nextBtn.addEventListener('click', onNextTrial);
  const holdBtn = container.querySelector('[data-action="hold-debrief"]');
  if (holdBtn && onHoldToggle) holdBtn.addEventListener('click', onHoldToggle);
}

export function renderNBackView(container, {
  trial,
  answers,
  lastFeedback,
  onChoose,
  onSubmit,
}) {
  const isEncoding = trial.truth.isEncoding;

  const toggleBtn = (field, val, label, keyHint) => {
    const active = answers[field] === val;
    return `<button type="button" class="tm-nb-choice ${active ? 'is-selected' : ''}" data-nb-field="${field}" data-nb-val="${val}">
      <span class="tm-key-cap">${keyHint}</span>
      <span>${esc(label)}</span>
    </button>`;
  };

  const matrixHtml = isEncoding
    ? `<div class="tm-nb-encoding">
         <p class="tm-order-detail">Memorize this briefing (encoding round ${trial.index} of ${trial.level}).</p>
         <div class="tm-nb-row">
           <span class="tm-nb-q">Is this briefing logically valid or a contradiction?</span>
           <div class="tm-nb-pair">
             ${toggleBtn('valid', true, 'Valid', 'A')}
             ${toggleBtn('valid', false, 'Contradiction', 'S')}
           </div>
         </div>
         <button type="button" class="tm-btn tm-btn-primary tm-nb-submit" data-nb-submit="true">
           Confirm &amp; Next (Space)
         </button>
       </div>`
    : `<div class="tm-nb-matrix">
         <div class="tm-nb-row">
           <span class="tm-nb-q">1. Current briefing logic</span>
           <div class="tm-nb-pair">
             ${toggleBtn('valid', true, 'Valid', 'A')}
             ${toggleBtn('valid', false, 'Contradiction', 'S')}
           </div>
         </div>
         <div class="tm-nb-row">
           <span class="tm-nb-q">2. Same logical structure as ${trial.level}-back?</span>
           <div class="tm-nb-pair">
             ${toggleBtn('samePattern', true, 'Same Pattern', 'D')}
             ${toggleBtn('samePattern', false, 'Different', 'F')}
           </div>
         </div>
         <div class="tm-nb-row">
           <span class="tm-nb-q">3. Same clinical domain as ${trial.level}-back?</span>
           <div class="tm-nb-pair">
             ${toggleBtn('sameDomain', true, 'Same Domain', 'H')}
             ${toggleBtn('sameDomain', false, 'Different', 'J')}
           </div>
         </div>
         <div class="tm-nb-row">
           <span class="tm-nb-q">4. Same lead patient as ${trial.level}-back?</span>
           <div class="tm-nb-pair">
             ${toggleBtn('sameLead', true, 'Same Lead', 'K')}
             ${toggleBtn('sameLead', false, 'Different', 'L')}
           </div>
         </div>
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

    ${feedbackLine}

    <section class="tm-nb-briefing" aria-label="3-statement clinical briefing">
      <ol class="tm-nb-lines">
        ${trial.lines.map((line) => `<li>${esc(line)}</li>`).join('')}
      </ol>
    </section>

    ${matrixHtml}
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
