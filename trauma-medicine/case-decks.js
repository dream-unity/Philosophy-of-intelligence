// Live Semantic Clinical Board synthesizer, mention-balanced near-miss shortlist decoys,
// and 80-type non-repeating Reasoning Type + Family + Cognitive Level + Phase scheduler.

import { PATIENT_IDS } from './roster.js';
import { createRng, shuffle } from './case-layout.js';
import { TIER_BY_ID } from './case-families.js';
import {
  REASONING_TYPE_LIST,
  REASONING_TYPES,
  getReasoningType,
  getClinicalPhase,
  PHASE_ORDER,
} from './reasoning-types.js';
import { synthesizeSemanticLogic, resolveBoard, buildBayProfiles } from './semantic-board.js';
import { SEMANTIC_ENGINES_PART1 } from './semantic-engines-1.js';
import { SEMANTIC_ENGINES_PART2 } from './semantic-engines-2.js';

const LEVEL_ROTATION = Object.freeze(['atomic', 'composite', 'meta']);

export const SEMANTIC_ENGINES = Object.freeze({
  ...SEMANTIC_ENGINES_PART1,
  ...SEMANTIC_ENGINES_PART2,
});

function parseTimeRank(timeStr, fallbackIdx) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(timeStr || '').trim());
  if (!m) return fallbackIdx * 60;
  return Number(m[1]) * 60 + Number(m[2]);
}

function enrichRecords(records) {
  return records.map((r, i) => ({
    ...r,
    index: i,
    channelId: `card-${i}`,
    siteIdx: r.siteIndex ?? 0,
    timeRank: parseTimeRank(r.time, i),
  }));
}

function mentionFrequencyMap(records) {
  const counts = Object.fromEntries(PATIENT_IDS.map((id) => [id, 0]));
  for (const r of records) {
    const facts = r.shownFacts || [];
    for (const f of facts) {
      for (const pid of f.patients || []) {
        counts[pid] = (counts[pid] || 0) + 1;
      }
    }
  }
  return counts;
}

export function buildShortlist(rng, records, targets, rivalId) {
  const targetSet = new Set(targets);
  const freqs = mentionFrequencyMap(records);
  const avgTargetFreq =
    targets.reduce((sum, id) => sum + (freqs[id] || 0), 0) / Math.max(1, targets.length);

  const nonTargets = PATIENT_IDS.filter((id) => !targetSet.has(id));
  const scored = nonTargets
    .map((id) => ({
      id,
      score: Math.abs((freqs[id] || 0) - avgTargetFreq) - (id === rivalId ? 0.6 : 0) + rng() * 0.25,
    }))
    .sort((a, b) => a.score - b.score);

  const desiredTotal = Math.min(6, Math.max(4, targets.length + 2));
  const decoyCount = Math.max(2, desiredTotal - targets.length);
  const decoys = scored.slice(0, decoyCount).map((s) => s.id);
  return shuffle(rng, [...targets, ...decoys]);
}

function tryBuildForType(rng, meta, tier, prevTargetKey, allowSamePrevTarget) {
  const engine = SEMANTIC_ENGINES[meta.id];
  if (!engine) {
    throw new Error(`Missing semantic clinical engine for #${meta.number} "${meta.id}"`);
  }

  const spec = engine(rng);
  if (!spec || !spec.cards || (spec.cards.length !== 4 && spec.cards.length !== 6)) return null;

  const logic = synthesizeSemanticLogic(rng, spec.cards, spec.evaluate, tier.disputed);
  if (!logic) return null;

  const targetKey = logic.trueTargets.join(',');
  if (!allowSamePrevTarget && prevTargetKey && targetKey === prevTargetKey) return null;

  const records = enrichRecords(logic.records);
  const siteNames = [...new Set(records.map((r) => r.site))];
  const explanation = {
    proof: logic.evaluation.proof,
    rival: logic.evaluation.rival || null,
    chainSummary: logic.evaluation.chainSummary || null,
    decisiveChannels: [],
  };
  const shortlist = buildShortlist(rng, records, logic.trueTargets, explanation.rival?.patientId);
  const bayProfiles = buildBayProfiles(
    records,
    logic.trueTargets,
    spec.bayLabels || {},
    spec.bayDefaultLabel || spec.scenarioTitle || spec.scenario?.title || 'Active Eval'
  );

  return {
    meta,
    spec,
    records,
    siteNames,
    logic,
    explanation,
    shortlist,
    bayProfiles,
  };
}

/**
 * Synthesize a verified plain-English semantic clinical trial for any tier and any of the 80 reasoning types.
 */
export function synthesizeTrial({
  tierId = 'super-super-easy',
  seed = Date.now(),
  pinnedReasoningType = null,
  excludeReasoningType = null,
  excludeFamilyId = null,
  preferredPhase = null,
  preferredLevel = null,
  familyFilter = null,
  levelFilter = null,
  seenTypes = null,
  prevTargetKey = null,
} = {}) {
  const tier = TIER_BY_ID[tierId] || TIER_BY_ID['super-super-easy'];
  const rng = createRng(seed);

  let pool;
  if (pinnedReasoningType && REASONING_TYPES[pinnedReasoningType]) {
    pool = [REASONING_TYPES[pinnedReasoningType]];
  } else {
    pool = [...REASONING_TYPE_LIST];
    if (familyFilter && familyFilter !== 'all') {
      const filtered = pool.filter((m) => m.familyId === familyFilter);
      if (filtered.length) pool = filtered;
    }
    if (levelFilter && levelFilter !== 'all') {
      const filtered = pool.filter((m) => m.level === levelFilter);
      if (filtered.length) pool = filtered;
    }
    if (excludeReasoningType && pool.length > 1) {
      pool = pool.filter((m) => m.id !== excludeReasoningType);
    }
  }

  // Prefer unseen reasoning types first so 80 consecutive questions visit ALL 80 types!
  const seenSet = seenTypes instanceof Set ? seenTypes : new Set();
  const unseen = pool.filter((m) => !seenSet.has(m.id));
  const primaryPool = unseen.length ? unseen : pool;

  const scoreCandidate = (m) => {
    let score = 0;
    if (excludeFamilyId && m.familyId === excludeFamilyId) score += 8;
    if (preferredLevel && m.level !== preferredLevel) score += 3;
    if (preferredPhase && m.phase !== preferredPhase) score += 2;
    return score;
  };

  const ranked = shuffle(rng, primaryPool).sort((a, b) => scoreCandidate(a) - scoreCandidate(b));
  const candidatesToTry = pinnedReasoningType ? ranked : ranked.slice(0, 12);

  for (const meta of candidatesToTry) {
    const maxAttempts = pinnedReasoningType ? 60 : 20;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const built = tryBuildForType(rng, meta, tier, prevTargetKey, attempt >= 6);
      if (!built) continue;

      const phaseMeta = getClinicalPhase(meta.phase);
      return {
        id: `${tier.id}-${meta.id}-${seed}-${attempt}`,
        tierId: tier.id,
        tierRank: tier.rank,
        tierLabel: tier.label,
        familyId: `type-${meta.number}-${meta.id}`,
        reasoningType: meta.id,
        reasoningMeta: meta,
        phase: meta.phase,
        phaseMeta,
        usesWeights: false,
        usesMinutes: false,
        scenario: {
          id: meta.id,
          phase: meta.phase,
          title: built.spec.scenarioTitle || built.spec.scenario?.title || meta.name,
          dispatch: built.spec.dispatch || built.spec.scenario?.dispatch || '',
          sites: built.siteNames,
        },
        order: built.spec.order,
        detail: built.spec.hint || built.spec.detail || '',
        records: built.records,
        trueWorldMask: built.logic.trueWorldMask,
        crossChecks: built.logic.crossChecks,
        targets: built.logic.trueTargets,
        shortlist: built.shortlist,
        bayProfiles: built.bayProfiles,
        explanation: built.explanation,
      };
    }
  }

  // Guaranteed deterministic clean fallback on the top-ranked semantic engine
  const fallbackMeta = ranked[0];
  const fallbackRng = createRng(seed + 997);
  const spec = SEMANTIC_ENGINES[fallbackMeta.id](fallbackRng);
  const records = enrichRecords(spec.cards);
  const fallbackMask = (1 << records.length) - 1;
  const res = spec.evaluate(resolveBoard(records, fallbackMask));
  const safeTargets = res && res.targets && res.targets.length ? res.targets : [PATIENT_IDS[0]];
  const explanation = {
    proof: res?.proof || `${safeTargets.join(', ')} matched the clinical rule.`,
    rival: res?.rival || null,
    chainSummary: res?.chainSummary || null,
    decisiveChannels: [],
  };

  return {
    id: `fallback-${tier.id}-${fallbackMeta.id}-${seed}`,
    tierId: tier.id,
    tierRank: tier.rank,
    tierLabel: tier.label,
    familyId: `type-${fallbackMeta.number}-${fallbackMeta.id}`,
    reasoningType: fallbackMeta.id,
    reasoningMeta: fallbackMeta,
    phase: fallbackMeta.phase,
    phaseMeta: getClinicalPhase(fallbackMeta.phase),
    usesWeights: false,
    usesMinutes: false,
    scenario: {
      id: fallbackMeta.id,
      phase: fallbackMeta.phase,
      title: spec.scenarioTitle || spec.scenario?.title || fallbackMeta.name,
      dispatch: spec.dispatch || spec.scenario?.dispatch || '',
      sites: [...new Set(records.map((r) => r.site))],
    },
    order: spec.order,
    detail: spec.hint || spec.detail || '',
    records,
    trueWorldMask: fallbackMask,
    crossChecks: [],
    targets: safeTargets,
    shortlist: buildShortlist(createRng(seed + 1013), records, safeTargets, explanation.rival?.patientId),
    bayProfiles: buildBayProfiles(records, safeTargets, spec.bayLabels || {}, spec.bayDefaultLabel || spec.scenarioTitle || spec.scenario?.title || 'Active Eval'),
    explanation,
  };
}

/**
 * Stateful 80-type clinical scheduler guaranteeing:
 * 1. Different reasoning type on EVERY consecutive question.
 * 2. Visits ALL 80 reasoning types before repeating any type (full coverage in 80 cases).
 * 3. Cycles cleanly across all 8 reasoning families, 3 cognitive levels (Atomic / Composite / Meta),
 *    and 3 clinical phases (Before / Inside / After).
 */
export class ClinicalDeckScheduler {
  constructor(baseSeed = 424242, { familyFilter = 'all', levelFilter = 'all' } = {}) {
    this.seedCursor = baseSeed >>> 0;
    this.familyFilter = familyFilter;
    this.levelFilter = levelFilter;
    this.lastReasoningType = null;
    this.lastFamilyId = null;
    this.lastTargetKey = null;
    this.seenCycle = new Set();
    this.trialIndex = 0;
    this.queuedReasoningType = null;
  }

  queueReasoningType(reasoningTypeId) {
    this.queuedReasoningType = reasoningTypeId;
  }

  nextTrial(tierId) {
    this.seedCursor = (this.seedCursor + 7919) >>> 0;
    const preferredPhase = PHASE_ORDER[this.trialIndex % PHASE_ORDER.length];
    const preferredLevel = LEVEL_ROTATION[this.trialIndex % LEVEL_ROTATION.length];

    let eligible = [...REASONING_TYPE_LIST];
    if (this.familyFilter && this.familyFilter !== 'all') {
      eligible = eligible.filter((m) => m.familyId === this.familyFilter);
    }
    if (this.levelFilter && this.levelFilter !== 'all') {
      eligible = eligible.filter((m) => m.level === this.levelFilter);
    }
    if (this.seenCycle.size >= eligible.length) {
      this.seenCycle.clear();
    }

    const pinned = this.queuedReasoningType;
    this.queuedReasoningType = null;

    const trial = synthesizeTrial({
      tierId,
      seed: this.seedCursor,
      pinnedReasoningType: pinned,
      excludeReasoningType: pinned ? null : this.lastReasoningType,
      excludeFamilyId: pinned ? null : this.lastFamilyId,
      preferredPhase,
      preferredLevel,
      familyFilter: this.familyFilter,
      levelFilter: this.levelFilter,
      seenTypes: this.seenCycle,
      prevTargetKey: this.lastTargetKey,
    });

    this.lastReasoningType = trial.reasoningType;
    this.lastFamilyId = trial.reasoningMeta.familyId;
    this.lastTargetKey = trial.targets.join(',');
    this.seenCycle.add(trial.reasoningType);
    this.trialIndex++;
    return trial;
  }
}
