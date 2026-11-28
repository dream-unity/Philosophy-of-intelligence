// Deep Plain-English Clinical Reasoning Engines — Part 1 (Families 1–4, Types #1–#41)
// Modular aggregator combining Families 1–2 (semantic-f12.js) and Families 3–4 (semantic-f34.js).

import { SEMANTIC_F12 } from './semantic-f12.js';
import { SEMANTIC_F34 } from './semantic-f34.js';

export const SEMANTIC_ENGINES_PART1 = {
  ...SEMANTIC_F12,
  ...SEMANTIC_F34,
};
