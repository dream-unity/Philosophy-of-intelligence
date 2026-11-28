// Deep Plain-English Clinical Reasoning Engines — Part 2 (Families 5–8, Types #42–#80)
// Modular aggregator combining Families 5–6 (semantic-f56.js) and Families 7–8 (semantic-f78.js).

import { SEMANTIC_F56 } from './semantic-f56.js';
import { SEMANTIC_F78 } from './semantic-f78.js';

export const SEMANTIC_ENGINES_PART2 = {
  ...SEMANTIC_F56,
  ...SEMANTIC_F78,
};
