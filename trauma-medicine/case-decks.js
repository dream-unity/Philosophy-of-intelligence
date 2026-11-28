// Live clinical board synthesizer, mention-balanced near-miss shortlist decoys,
// and 80-type non-repeating Reasoning Type + Family + Cognitive Level + Phase scheduler.

import { PATIENT_IDS, SCENARIOS_BY_PHASE } from './roster.js';
import { createRng, buildClinicalChart, shuffle } from './case-layout.js';
import { buildClinicalGraph } from './case-graph.js';
import { familiesForTier, FAMILY_BY_REASONING_ID, TIER_BY_ID } from './case-families.js';
import { synthesizeEpistemicLogic } from './case-logic.js';
import { getReasoningType, getClinicalPhase, PHASE_ORDER } from './reasoning-types.js';

const LEVEL_ROTATION = Object.freeze(['atomic', 'composite', 'meta']);

function mentionFrequencyMap(records) {
  const counts = Object.fromEntries(PATIENT_IDS.map((id) => [id, 0]));
  for (const r of records) {
    for (const e of r.shownEdges) {
      counts[e.from] = (counts[e.from] || 0) + 1;
      counts[e.to] = (counts[e.to] || 0) + 1;
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

function tryBuildForFamily(rng, family, tier, prevTargetKey, allowSamePrevTarget) {
  const phaseScenarios = SCENARIOS_BY_PHASE[family.phase] || SCENARIOS_BY_PHASE.inside;
  const scenario = phaseScenarios[Math.floor(rng() * phaseScenarios.length)];
  const baseRecords = buildClinicalChart(rng, scenario);
  const baseGraph = buildClinicalGraph(baseRecords, 0b111111);
  const params = family.pickParams(rng, baseGraph, scenario);

  const logic = synthesizeEpistemicLogic(rng, baseRecords, family, params, tier.disputed);
  if (!logic) return null;

  const targetKey = logic.trueTargets.join(',');
  if (!allowSamePrevTarget && prevTargetKey && targetKey === prevTargetKey) return null;

  const trueGraph = buildClinicalGraph(logic.records, logic.trueWorldMask);
  const explanation = family.explain(trueGraph, params, scenario, logic.trueTargets);
  const shortlist = buildShortlist(rng, logic.records, logic.trueTargets, explanation.rival?.patientId);

  return {
    family,
    scenario,
    params,
    logic,
    explanation,
    shortlist,
  };
}

/**
 * Synthesize a verified clinical trial for a tier and optional specific reasoning type,
 * family filter, or cognitive level filter.
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
  if (pinnedReasoningType && FAMILY_BY_REASONING_ID[pinnedReasoningType]) {
    pool = [FAMILY_BY_REASONING_ID[pinnedReasoningType]];
  } else {
    pool = familiesForTier(tier.id);
    if (familyFilter && familyFilter !== 'all') {
      const filtered = pool.filter((f) => f.familyId === familyFilter);
      if (filtered.length) pool = filtered;
    }
    if (levelFilter && levelFilter !== 'all') {
      const filtered = pool.filter((f) => f.level === levelFilter);
      if (filtered.length) pool = filtered;
    }
    if (excludeReasoningType && pool.length > 1) {
      pool = pool.filter((f) => f.reasoningType !== excludeReasoningType);
    }
  }

  // Prefer unseen reasoning types first so 80 consecutive questions visit ALL 80 types!
  // Among unseen types, rotate across reasoning families, cognitive levels, and trauma phases.
  const seenSet = seenTypes instanceof Set ? seenTypes : new Set();
  const unseen = pool.filter((f) => !seenSet.has(f.reasoningType));
  const primaryPool = unseen.length ? unseen : pool;

  const scoreCandidate = (f) => {
    let score = 0;
    if (excludeFamilyId && f.familyId === excludeFamilyId) score += 8;
    if (preferredLevel && f.level !== preferredLevel) score += 3;
    if (preferredPhase && f.phase !== preferredPhase) score += 2;
    return score;
  };

  const ranked = shuffle(rng, primaryPool).sort((a, b) => scoreCandidate(a) - scoreCandidate(b));

  // Try top ranked family thoroughly first (especially important when pinned or targeting full 80-type cycle)
  const candidatesToTry = pinnedReasoningType ? ranked : ranked.slice(0, 12);
  for (const family of candidatesToTry) {
    const maxAttempts = pinnedReasoningType ? 180 : tier.disputed >= 3 ? 32 : 16;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const built = tryBuildForFamily(rng, family, tier, prevTargetKey, attempt >= 10);
      if (!built) continue;

      const reasoningMeta = getReasoningType(family.reasoningType);
      const phaseMeta = getClinicalPhase(family.phase);

      return {
        id: `${tier.id}-${family.id}-${seed}-${attempt}`,
        tierId: tier.id,
        tierRank: tier.rank,
        tierLabel: tier.label,
        familyId: family.id,
        reasoningType: family.reasoningType,
        reasoningMeta,
        phase: family.phase,
        phaseMeta,
        usesWeights: family.usesWeights,
        usesMinutes: family.usesMinutes,
        scenario: built.scenario,
        order: family.order(built.params, built.scenario),
        detail: family.detail(built.params, built.scenario),
        records: built.logic.records,
        trueWorldMask: built.logic.trueWorldMask,
        crossChecks: built.logic.crossChecks,
        targets: built.logic.trueTargets,
        shortlist: built.shortlist,
        explanation: built.explanation,
      };
    }
  }

  // Deterministic guaranteed fallback on clean confirmed chart (never crashes)
  const fallbackFamily = ranked[0];
  const scenario = SCENARIOS_BY_PHASE[fallbackFamily.phase][0];
  let baseRecords = buildClinicalChart(createRng(seed + 997), scenario);
  let graph = buildClinicalGraph(baseRecords, 0b111111);
  let params = fallbackFamily.pickParams(createRng(seed + 1009), graph, scenario);
  let targets = fallbackFamily.evaluate(graph, params);

  // Retry up to 25 deterministic seeds to find a 1..4 target set for fallbackFamily
  for (let k = 1; (targets.length < 1 || targets.length > 4) && k <= 25; k++) {
    baseRecords = buildClinicalChart(createRng(seed + 997 + k * 41), scenario);
    graph = buildClinicalGraph(baseRecords, 0b111111);
    params = fallbackFamily.pickParams(createRng(seed + 1009 + k * 43), graph, scenario);
    targets = fallbackFamily.evaluate(graph, params);
  }
  const safeTargets = targets.length >= 1 && targets.length <= 4 ? targets : [PATIENT_IDS[0]];
  const explanation = fallbackFamily.explain(graph, params, scenario, safeTargets);

  return {
    id: `fallback-${tier.id}-${seed}`,
    tierId: tier.id,
    tierRank: tier.rank,
    tierLabel: tier.label,
    familyId: fallbackFamily.id,
    reasoningType: fallbackFamily.reasoningType,
    reasoningMeta: getReasoningType(fallbackFamily.reasoningType),
    phase: fallbackFamily.phase,
    phaseMeta: getClinicalPhase(fallbackFamily.phase),
    usesWeights: fallbackFamily.usesWeights,
    usesMinutes: fallbackFamily.usesMinutes,
    scenario,
    order: fallbackFamily.order(params, scenario),
    detail: fallbackFamily.detail(params, scenario),
    records: baseRecords,
    trueWorldMask: 0b111111,
    crossChecks: [],
    targets: safeTargets,
    shortlist: buildShortlist(createRng(seed + 1013), baseRecords, safeTargets, explanation.rival?.patientId),
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

    // Determine eligible pool size so we reset seenCycle only once all eligible types have been seen
    let eligible = familiesForTier(tierId);
    if (this.familyFilter && this.familyFilter !== 'all') {
      eligible = eligible.filter((f) => f.familyId === this.familyFilter);
    }
    if (this.levelFilter && this.levelFilter !== 'all') {
      eligible = eligible.filter((f) => f.level === this.levelFilter);
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
