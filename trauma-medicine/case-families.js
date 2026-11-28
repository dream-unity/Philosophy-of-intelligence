// Builds one verified clinical family definition for EVERY SINGLE ONE of the 80 reasoning types
// in the taxonomy, binding each type to its authentic clinical engine, phase, level, and layperson lesson.

import { REASONING_TYPE_LIST } from './reasoning-types.js';
import { REASONING_ENGINES } from './reasoning-engines.js';

export const DIFFICULTY_TIERS = Object.freeze([
  { id: 'super-super-easy', rank: 1, label: 'Tier 1 · Intern', short: 'T1 Intern', disputed: 0 },
  { id: 'super-easy', rank: 2, label: 'Tier 2 · Resident', short: 'T2 Resident', disputed: 0 },
  { id: 'very-easy', rank: 3, label: 'Tier 3 · Fellow', short: 'T3 Fellow', disputed: 0 },
  { id: 'easy', rank: 4, label: 'Tier 4 · Attending', short: 'T4 Attending', disputed: 1 },
  { id: 'medium', rank: 5, label: 'Tier 5 · Trauma Lead', short: 'T5 Lead', disputed: 3 },
  { id: 'hard', rank: 6, label: 'Tier 6 · Chief', short: 'T6 Chief', disputed: 6 },
]);

export const TIER_BY_ID = Object.freeze(
  Object.fromEntries(DIFFICULTY_TIERS.map((t) => [t.id, t]))
);

const ALL_TIER_IDS = Object.freeze(DIFFICULTY_TIERS.map((t) => t.id));

// Every one of the 80 reasoning types is playable at every tier (T1-T3 on clean confirmed charts,
// T4-T6 adding 1, 3, and 6 leak-free coupled disputed records on top of the exact same reasoning type).
export const CASE_FAMILIES = Object.freeze(
  REASONING_TYPE_LIST.map((meta) => {
    const engine = REASONING_ENGINES[meta.engineId];
    if (!engine) {
      throw new Error(`Missing reasoning engine "${meta.engineId}" for type #${meta.number} ${meta.id}`);
    }
    return Object.freeze({
      id: `type-${meta.number}-${meta.id}`,
      number: meta.number,
      tiers: ALL_TIER_IDS,
      reasoningType: meta.id,
      familyId: meta.familyId,
      level: meta.level,
      phase: meta.phase,
      usesWeights: !!engine.usesWeights,
      usesMinutes: !!engine.usesMinutes,
      pickParams: (rng, graph, sc) => engine.pickParams(rng, graph, sc, meta),
      order: (params, sc) => engine.order(params, sc, meta),
      detail: (params, sc) => engine.detail(params, sc, meta),
      evaluate: (graph, params) => engine.evaluate(graph, params, meta),
      explain: (graph, params, sc, targets) => engine.explain(graph, params, sc, targets, meta),
    });
  })
);

export const FAMILY_BY_REASONING_ID = Object.freeze(
  Object.fromEntries(CASE_FAMILIES.map((f) => [f.reasoningType, f]))
);

export function familiesForTier(tierId) {
  return CASE_FAMILIES.filter((f) => f.tiers.includes(tierId));
}
