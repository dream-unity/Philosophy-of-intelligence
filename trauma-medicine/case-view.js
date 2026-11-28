// Accessible DOM view renderer for Trauma Medicine dossiers, quantitative clinical weights,
// coupled cross-checks, post-trial debriefs, N-back rounds, and the 80-Type Reasoning Atlas.
// Strictly adheres to zero-pill static metadata and zero thick left-border rules.

import { PATIENT_BY_ID } from './roster.js';
import { formatEdgeShort } from './case-layout.js';
import {
  REASONING_FAMILIES,
  REASONING_TYPE_LIST,
  REASONING_LEVELS,
  DIFFERENTIAL_PIPELINE,
  TOTAL_REASONING_TYPES,
} from './reasoning-types.js';
import { countMasteredTypes } from './trauma-session.js';

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

function uncertaintyTagHtml(rec) {
  if (!rec.disputed) return '';
  if (rec.uncertaintyMode === 'reverse') {
    return `<span class="tm-uncertain-note">Disputed: arrows may be reversed</span>`;
  }
  if (rec.uncertaintyMode === 'swap' && rec.swapPair) {
    const [a, b] = rec.swapPair;
    return `<span class="tm-uncertain-note">Chart mix-up? Swap ${esc(patientName(a))} &amp; ${esc(patientName(b))}</span>`;
  }
  const alt2 = rec.altEdges?.[1];
  if (alt2) {
    return `<span class="tm-uncertain-note">Or line 2: ${esc(formatEdgeShort(alt2, rec.verb))}</span>`;
  }
  return `<span class="tm-uncertain-note">Disputed reading</span>`;
}

export function renderClinicalDossier(container, {
  trial,
  useShortlist,
  selectedIds,
  debrief,
  onNextTrial,
  onHoldToggle,
  holdDebrief,
}) {
  const decisiveSet = new Set(debrief ? trial.explanation.decisiveChannels : []);
  const targetCount = trial.targets.length;
  const remainingSlots = Math.max(0, targetCount - selectedIds.length);
  const showWeights = !!trial.usesWeights;
  const showMinutes = !!trial.usesMinutes;

  const slotsHtml = Array.from({ length: targetCount }, (_, i) => {
    const filled = i < selectedIds.length;
    return `<span class="tm-slot ${filled ? 'is-used' : 'is-ready'}" aria-hidden="true">${filled ? '●' : '○'}</span>`;
  }).join('');

  const shortlistHtml =
    useShortlist && trial.tierRank <= 3
      ? `<div class="tm-shortlist" aria-label="Candidate shortlist">
           <span class="tm-meta-label">Shortlist</span>
           <span class="tm-shortlist-names">${trial.shortlist.map((id) => esc(patientName(id))).join(' · ')}</span>
         </div>`
      : '';

  const rowsHtml = trial.records
    .map((rec, idx) => {
      const isDecisive = decisiveSet.has(rec.channelId);
      const trueBit = (trial.trueWorldMask >> idx) & 1;
      const resolvedNote =
        debrief && rec.disputed
          ? `<span class="tm-resolved-state ${trueBit === 1 ? 'is-held' : 'is-flipped'}">${
              trueBit === 1 ? 'Held as printed' : 'Flipped reading held'
            }</span>`
          : '';
      const edgesToShow = debrief && rec.disputed && trueBit === 0 ? rec.altEdges : rec.shownEdges;
      const line1 = formatEdgeShort(edgesToShow[0], rec.verb);
      const line2 = formatEdgeShort(edgesToShow[1], rec.verb);
      const weightCell = showWeights
        ? `<td class="tm-col-weight tm-tabular">+${rec.weight}</td>`
        : '';
      const minCell = showMinutes
        ? `<td class="tm-col-minutes tm-tabular">${rec.minutes}m</td>`
        : '';

      return `<tr class="tm-chart-row ${rec.disputed ? 'is-disputed' : ''} ${isDecisive ? 'is-decisive' : ''}">
        <td class="tm-col-time">${esc(rec.time)}</td>
        <td class="tm-col-site">${esc(rec.site)}</td>
        ${weightCell}
        ${minCell}
        <td class="tm-col-channel">
          <strong>${esc(rec.label)}</strong>${rec.disputed ? ' <span class="tm-qmark" title="Disputed record">?</span>' : ''}
          ${!debrief ? uncertaintyTagHtml(rec) : resolvedNote}
        </td>
        <td class="tm-col-links">
          <div>${esc(line1)}</div>
          <div>${esc(line2)}</div>
        </td>
      </tr>`;
    })
    .join('');

  const crossChecksHtml = trial.crossChecks.length
    ? `<section class="tm-crosschecks" aria-label="Chart cross-checks">
         <div class="tm-section-head">
           <span class="tm-meta-label">Cross-Checks</span>
           <span class="tm-meta-sub">Resolve disputed (?) records before intervening</span>
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
       </section>`
    : '';

  let debriefHtml = '';
  if (debrief) {
    const outcomeClass = debrief.cleared ? 'is-clear' : 'is-miss';
    const outcomeHeading = debrief.cleared
      ? `Stabilized · ${(debrief.elapsedMs / 1000).toFixed(1)}s`
      : debrief.reason === 'timeout'
        ? 'Time Expired · Patient Crashed'
        : `Wrong Intervention (${esc(patientName(debrief.wrongId))})`;
    const rivalHtml = trial.explanation.rival
      ? `<p class="tm-debrief-rival"><strong>Why not ${esc(trial.explanation.rival.patientName)}?</strong> ${esc(trial.explanation.rival.reason)}</p>`
      : '';
    const ladderBanner = debrief.ladderEvent
      ? `<p class="tm-ladder-note">${
          debrief.ladderEvent.type === 'promoted'
            ? `Promoted to ${esc(debrief.ladderEvent.tier.label)}`
            : `Stepped down to ${esc(debrief.ladderEvent.tier.label)} for reinforcement`
        }</p>`
      : '';

    const r = trial.reasoningMeta;
    debriefHtml = `<section class="tm-debrief ${outcomeClass}" aria-live="polite">
      <div class="tm-debrief-top">
        <div>
          <h3 class="tm-debrief-title">${outcomeHeading}</h3>
          <p class="tm-debrief-targets">Correct target${trial.targets.length > 1 ? 's' : ''}: <strong>${esc(
            trial.targets.map(patientName).join(', ')
          )}</strong></p>
        </div>
        <div class="tm-debrief-actions">
          <button type="button" class="tm-btn tm-btn-ghost" data-action="hold-debrief">${
            holdDebrief ? 'Auto-advance Off' : 'Hold Debrief'
          }</button>
          <button type="button" class="tm-btn tm-btn-primary" data-action="next-trial">Next Case (Space)</button>
        </div>
      </div>
      ${ladderBanner}
      <p class="tm-debrief-proof">${esc(trial.explanation.proof)}</p>
      ${rivalHtml}
      <div class="tm-lesson-box">
        <span class="tm-meta-label">Pattern #${r.number}/${TOTAL_REASONING_TYPES} · ${esc(r.name)} · ${esc(r.levelFull)} · ${esc(r.familyName)}</span>
        <p class="tm-core-op"><strong>Core operation:</strong> ${esc(r.coreOperation)}</p>
        <p>${esc(r.doctorLesson)}</p>
      </div>
    </section>`;
  }

  const r = trial.reasoningMeta;

  container.innerHTML = `
    <div class="tm-dossier-header">
      <div class="tm-dossier-meta">
        <span class="tm-phase-text">${esc(trial.phaseMeta.label)}</span>
        <span class="tm-sep" aria-hidden="true">·</span>
        <span class="tm-reasoning-text">#${r.number}/${TOTAL_REASONING_TYPES} ${esc(r.name)}</span>
        <span class="tm-sep" aria-hidden="true">·</span>
        <span class="tm-level-text">${esc(r.levelLabel)}</span>
        <span class="tm-sep" aria-hidden="true">·</span>
        <span class="tm-scenario-text">${esc(trial.scenario.title)}</span>
      </div>
      <div class="tm-slots-readout" aria-label="${remainingSlots} of ${targetCount} interventions remaining">
        <span class="tm-meta-label">Actions</span>
        <span class="tm-slots-pips">${slotsHtml}</span>
        <span class="tm-slots-num">${remainingSlots}/${targetCount}</span>
      </div>
    </div>

    ${debriefHtml}

    <section class="tm-order-card" aria-label="Clinical directive">
      <p class="tm-order-main">${esc(trial.order)}</p>
      <div class="tm-order-subrow">
        <p class="tm-order-detail">${esc(trial.detail)}</p>
        ${!debrief ? `<details class="tm-pattern-guide">
          <summary>Pattern Guide</summary>
          <div class="tm-pattern-guide-body">
            <span class="tm-meta-label">#${r.number}/${TOTAL_REASONING_TYPES} ${esc(r.name)} · ${esc(r.levelFull)} · ${esc(r.familyName)}</span>
            <p class="tm-core-op"><strong>Core operation:</strong> ${esc(r.coreOperation)}</p>
            <p>${esc(r.doctorLesson)}</p>
          </div>
        </details>` : ''}
      </div>
      ${shortlistHtml}
    </section>

    ${crossChecksHtml}

    <section class="tm-chart-wrap" aria-label="Clinical records">
      <table class="tm-chart-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Unit</th>
            ${showWeights ? '<th>Weight</th>' : ''}
            ${showMinutes ? '<th>Min</th>' : ''}
            <th>Record</th>
            <th>Clinical Findings</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </section>
  `;

  const nextBtn = container.querySelector('[data-action="next-trial"]');
  if (nextBtn && onNextTrial) nextBtn.addEventListener('click', onNextTrial);
  const holdBtn = container.querySelector('[data-action="hold-debrief"]');
  if (holdBtn && onHoldToggle) holdBtn.addEventListener('click', onHoldToggle);
}

/**
 * Render the interactive 80-Type Reasoning Atlas & Differential Diagnosis Integration Flow.
 */
export function renderReasoningAtlas(container, {
  masteryStore,
  familyFilter,
  levelFilter,
  onFilterChange,
  onPracticeType,
}) {
  const counts = countMasteredTypes(masteryStore);
  const filtered = REASONING_TYPE_LIST.filter((r) => {
    if (familyFilter !== 'all' && r.familyId !== familyFilter) return false;
    if (levelFilter !== 'all' && r.level !== levelFilter) return false;
    return true;
  });

  // Group filtered items by family
  const groupsHtml = REASONING_FAMILIES.map((fam) => {
    const items = filtered.filter((r) => r.familyId === fam.id);
    if (!items.length) return '';
    const rows = items
      .map((r) => {
        const stat = masteryStore[r.id];
        const statusText = stat && stat.cleared > 0
          ? `Cleared ${stat.cleared}/${stat.total}`
          : stat && stat.total > 0
            ? `Practiced 0/${stat.total}`
            : 'Unseen';
        const statusCls = stat && stat.cleared > 0 ? 'is-cleared' : stat && stat.total > 0 ? 'is-seen' : '';
        return `<li class="tm-atlas-item ${statusCls}">
          <div class="tm-atlas-item-main">
            <div class="tm-atlas-item-head">
              <span class="tm-atlas-num tm-tabular">#${r.number}</span>
              <strong>${esc(r.name)}</strong>
              <span class="tm-sep" aria-hidden="true">·</span>
              <span class="tm-atlas-level">${esc(r.levelLabel)}</span>
              <span class="tm-sep" aria-hidden="true">·</span>
              <span class="tm-atlas-status tm-tabular">${statusText}</span>
            </div>
            <p class="tm-atlas-op">${esc(r.coreOperation)}</p>
          </div>
          <button type="button" class="tm-btn tm-btn-ghost tm-atlas-play" data-practice-type="${esc(r.id)}">Practice</button>
        </li>`;
      })
      .join('');

    return `<section class="tm-atlas-family">
      <h4>${fam.number}. ${esc(fam.name)}</h4>
      <ul class="tm-atlas-list">${rows}</ul>
    </section>`;
  }).join('');

  const pipelineHtml = DIFFERENTIAL_PIPELINE.map(
    (s) => `<li class="tm-pipe-step">
      <span class="tm-meta-label">${esc(s.step)}</span>
      <strong>${esc(s.title)}</strong>
      <p>${esc(s.detail)}</p>
    </li>`
  ).join('');

  const levelTilesHtml = Object.values(REASONING_LEVELS)
    .map((lvl) => {
      const items = REASONING_TYPE_LIST.filter((r) => r.level === lvl.id);
      const cleared = items.filter((r) => masteryStore[r.id]?.cleared > 0).length;
      const pct = Math.round((cleared / Math.max(1, items.length)) * 100);
      const active = levelFilter === lvl.id;
      return `<button type="button" class="tm-mastery-tile ${active ? 'is-active' : ''}" data-atlas-quick-level="${esc(lvl.id)}">
        <span class="tm-mastery-tile-top">
          <strong>${esc(lvl.label)}</strong>
          <span class="tm-tabular">${cleared}/${items.length}</span>
        </span>
        <span class="tm-mastery-bar"><span style="width:${pct}%"></span></span>
      </button>`;
    })
    .join('');

  const familyTilesHtml = REASONING_FAMILIES.map((fam) => {
    const items = REASONING_TYPE_LIST.filter((r) => r.familyId === fam.id);
    const cleared = items.filter((r) => masteryStore[r.id]?.cleared > 0).length;
    const pct = Math.round((cleared / Math.max(1, items.length)) * 100);
    const active = familyFilter === fam.id;
    return `<button type="button" class="tm-mastery-tile ${active ? 'is-active' : ''}" data-atlas-quick-family="${esc(fam.id)}">
      <span class="tm-mastery-tile-top">
        <strong>${esc(fam.shortName)}</strong>
        <span class="tm-tabular">${cleared}/${items.length}</span>
      </span>
      <span class="tm-mastery-bar"><span style="width:${pct}%"></span></span>
    </button>`;
  }).join('');

  container.innerHTML = `
    <div class="tm-atlas-summary">
      <span><strong class="tm-tabular">${counts.clearedOnce}/${counts.total}</strong> types cleared</span>
      <span class="tm-sep" aria-hidden="true">·</span>
      <span><strong class="tm-tabular">${counts.practiced}/${counts.total}</strong> encountered</span>
      <span class="tm-sep" aria-hidden="true">·</span>
      <span>3 levels · 8 families · 48 distinct engines</span>
    </div>

    <div class="tm-mastery-section">
      <div class="tm-mastery-levels" role="group" aria-label="Filter by cognitive level">${levelTilesHtml}</div>
      <div class="tm-mastery-families" role="group" aria-label="Filter by reasoning family">${familyTilesHtml}</div>
    </div>

    <details class="tm-pipeline-details">
      <summary>How Differential Diagnosis Integrates Multiple Reasoning Types</summary>
      <ol class="tm-pipeline-grid">${pipelineHtml}</ol>
      <p class="tm-levels-note">
        <strong>Three levels of reasoning:</strong>
        ${Object.values(REASONING_LEVELS).map((l) => `${l.label} (${l.description})`).join(' ')}
      </p>
    </details>

    <div class="tm-atlas-filters">
      <label class="tm-atlas-filter-group">
        <span class="tm-meta-label">Family</span>
        <select class="tm-select" id="atlas-family-select">
          <option value="all">All 8 Families (80 types)</option>
          ${REASONING_FAMILIES.map(
            (f) => `<option value="${esc(f.id)}" ${familyFilter === f.id ? 'selected' : ''}>${f.number}. ${esc(f.name)}</option>`
          ).join('')}
        </select>
      </label>
      <label class="tm-atlas-filter-group">
        <span class="tm-meta-label">Cognitive Level</span>
        <select class="tm-select" id="atlas-level-select">
          <option value="all">All 3 Levels</option>
          <option value="atomic" ${levelFilter === 'atomic' ? 'selected' : ''}>Level 1 · Atomic</option>
          <option value="composite" ${levelFilter === 'composite' ? 'selected' : ''}>Level 2 · Composite</option>
          <option value="meta" ${levelFilter === 'meta' ? 'selected' : ''}>Level 3 · Meta-Reasoning</option>
        </select>
      </label>
    </div>

    <div class="tm-atlas-scroll">
      ${groupsHtml || '<p class="tm-order-detail">No reasoning types match this filter combination.</p>'}
    </div>
  `;

  const famSel = container.querySelector('#atlas-family-select');
  const lvlSel = container.querySelector('#atlas-level-select');
  if (famSel) famSel.addEventListener('change', () => onFilterChange(famSel.value, lvlSel.value));
  if (lvlSel) lvlSel.addEventListener('change', () => onFilterChange(famSel.value, lvlSel.value));
  container.querySelectorAll('[data-atlas-quick-level]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextLvl = levelFilter === btn.dataset.atlasQuickLevel ? 'all' : btn.dataset.atlasQuickLevel;
      onFilterChange(familyFilter, nextLvl);
    });
  });
  container.querySelectorAll('[data-atlas-quick-family]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextFam = familyFilter === btn.dataset.atlasQuickFamily ? 'all' : btn.dataset.atlasQuickFamily;
      onFilterChange(nextFam, levelFilter);
    });
  });
  container.querySelectorAll('[data-practice-type]').forEach((btn) => {
    btn.addEventListener('click', () => onPracticeType(btn.dataset.practiceType));
  });
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
         <p>Memorize this briefing (encoding round ${trial.index} of ${trial.level}).</p>
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
        <span class="tm-phase-text">Clinical Rounds · ${trial.level}-Back</span>
        <span class="tm-sep" aria-hidden="true">·</span>
        <span class="tm-scenario-text">${esc(trial.relation.phase)}</span>
        <span class="tm-sep" aria-hidden="true">·</span>
        <span class="tm-reasoning-text">${esc(trial.relation.reasoning)}</span>
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
