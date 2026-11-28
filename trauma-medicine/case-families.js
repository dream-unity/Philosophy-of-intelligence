// Builds one verified clinical family definition for EVERY SINGLE ONE of the 80 reasoning types
// in the taxonomy, binding each type to its authentic clinical engine, phase, level, and layperson lesson.

import { REASONING_TYPE_LIST } from './reasoning-types.js';
import { REASONING_ENGINES } from './reasoning-engines.js';

import { DIFFICULTY_TIERS } from './tiers.js';
export { DIFFICULTY_TIERS, TIER_BY_ID } from './tiers.js';

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
