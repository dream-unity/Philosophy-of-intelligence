export const DIFFICULTY_TIERS = Object.freeze([
  { id: 'super-super-easy', rank: 1, label: 'Tier 1 · Intern', short: 'T1 Intern', disputed: 0 },
  { id: 'super-easy', rank: 2, label: 'Tier 2 · Resident', short: 'T2 Resident', disputed: 0 },
  { id: 'very-easy', rank: 3, label: 'Tier 3 · Fellow', short: 'T3 Fellow', disputed: 0 },
  { id: 'easy', rank: 4, label: 'Tier 4 · Attending', short: 'T4 Attending', disputed: 1 },
  { id: 'medium', rank: 5, label: 'Tier 5 · Trauma Lead', short: 'T5 Lead', disputed: 3 },
  { id: 'hard', rank: 6, label: 'Tier 6 · Chief', short: 'T6 Chief', disputed: 4 },
]);

export const TIER_BY_ID = Object.freeze(
  Object.fromEntries(DIFFICULTY_TIERS.map((t) => [t.id, t]))
);
