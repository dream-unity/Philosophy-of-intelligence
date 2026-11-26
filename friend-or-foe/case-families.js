import {buildGraph, DOMAINS} from './case-graph.js';
import {superSuperEasyFamilies} from './families-super-super-easy.js';
import {superEasyFamilies} from './families-super-easy.js';
import {veryEasyFamilies} from './families-very-easy.js';
import {easyFamilies} from './families-easy.js';
import {moderateFamilies} from './families-moderate.js';
import {hardFamilies} from './families-hard.js';

export {DOMAINS};

export const familiesByLevel = {
  'super-super-easy': superSuperEasyFamilies,
  'super-easy': superEasyFamilies,
  'very-easy': veryEasyFamilies,
  'easy': easyFamilies,
  'medium': moderateFamilies,
  'hard': hardFamilies
};

export const allFamilies = [
  ...superEasyFamilies,
  ...veryEasyFamilies,
  ...easyFamilies,
  ...moderateFamilies,
  ...hardFamilies,
  ...superSuperEasyFamilies
];

const familyIndex = new Map(allFamilies.map(f => [f.id, f]));

export function familiesForLevel(level) {
  const key = level === 'moderate' ? 'medium' : level;
  const list = familiesByLevel[key];
  if (!list) throw new RangeError('Unknown difficulty ' + level);
  return list;
}

export function getFamily(id) {
  const family = familyIndex.get(id);
  if (!family) throw new RangeError('Unknown case family ' + id);
  return family;
}

export function evaluateFamily(id, edges, anchor, includeProof = false) {
  const family = getFamily(id);
  const g = buildGraph(edges, family.domain);
  return family.evaluate(g, anchor, includeProof);
}
