import {writeFileSync} from 'node:fs';
import {allFamilies, evaluateFamily} from '../friend-or-foe/case-families.js';
import {caseRoles, edgesFor, layoutFor, seededDraw, symbols} from '../friend-or-foe/case-layout.js';
import {buildCrossChecks, pairKey} from '../friend-or-foe/case-logic.js';

// Certify 12 distinct, high-conflict boards for EVERY ONE of the 500 families (6,000 boards total).
// Compact format: { [familyId]: [[seed, anchorIdx, disputedMask], ...] }
// With 100 families per difficulty and 12 certified boards each, a maximum 1,000-trial run
// deals each family at most 10 times and NEVER repeats a board!

const TARGET_PER_FAMILY = 12;
const MAX_SEEDS_PER_FAMILY = 16000;

// Enumerate all 20 3-element subsets of {0..5} for Moderate disputed row selection
const TRIPLE_MASKS = [];
for (let a = 0; a < 6; a++) {
  for (let b = a + 1; b < 6; b++) {
    for (let c = b + 1; c < 6; c++) {
      TRIPLE_MASKS.push((1 << a) | (1 << b) | (1 << c));
    }
  }
}

function maskToIndices(mask) {
  const idx = [];
  for (let i = 0; i < 6; i++) if (mask & (1 << i)) idx.push(i);
  return idx;
}

// Compute whole-category deletion sensitivity: how many of the 6 categories, if deleted,
// change the exact 2-name answer pair (or break uniqueness)?
function countDeletionSensitiveCategories(familyId, edges, anchor, correctKey) {
  let count = 0;
  for (const role of caseRoles) {
    const trimmed = edges.filter(e => e.role !== role);
    const res = evaluateFamily(familyId, trimmed, anchor, false);
    if (res.pair.length !== 2 || pairKey(res.pair) !== correctKey) count++;
  }
  return count;
}

// Compute single-row flip sensitivity: for each row 0..5, does flipping that row alone
// yield a different result, and does it yield a DIFFERENT legal 2-name rival pair?
function rowFlipProfile(familyId, rows, anchor, correctKey) {
  let flipsDifferent = 0;
  let flipsRivalPair = 0;
  const rivalRows = [];
  const diffRows = [];
  for (let i = 0; i < 6; i++) {
    const edges = edgesFor(rows, 1 << i);
    const seen = new Set();
    for (const e of edges) { seen.add(e.from); seen.add(e.to); }
    if (seen.size < 10) continue;
    const alt = evaluateFamily(familyId, edges, anchor, false).pair;
    const k = alt.length === 2 ? pairKey(alt) : '';
    if (k !== correctKey) {
      flipsDifferent++;
      diffRows.push(i);
      if (alt.length === 2) {
        flipsRivalPair++;
        rivalRows.push(i);
      }
    }
  }
  return {flipsDifferent, flipsRivalPair, rivalRows, diffRows};
}

// Precompute worldPairs for all 64 masks (or subset of masks allowed by disputedMask),
// requiring all 10 suspects to appear so roster completeness can never leak a cross-check.
function computeWorldPairs(familyId, rows, anchor, disputedMask) {
  const fixedMask = (~disputedMask) & 63;
  const worldPairs = new Array(64).fill(null);
  for (let m = 0; m < 64; m++) {
    if (m & fixedMask) continue;
    const edges = edgesFor(rows, m);
    const seen = new Set();
    for (const e of edges) { seen.add(e.from); seen.add(e.to); }
    if (seen.size < 10) continue;
    worldPairs[m] = evaluateFamily(familyId, edges, anchor, false).pair;
  }
  return worldPairs;
}

function certifyBoard(family, seed, anchorIdx) {
  const rows = layoutFor(seed);
  if (!rows) return null;
  const anchor = symbols[anchorIdx];
  const baseEdges = edgesFor(rows, 0);
  const base = evaluateFamily(family.id, baseEdges, anchor, false);
  if (base.pair.length !== 2) return null;
  const correctKey = pairKey(base.pair);

  const flipInfo = rowFlipProfile(family.id, rows, anchor, correctKey);
  const delSens = countDeletionSensitiveCategories(family.id, baseEdges, anchor, correctKey);

  if (family.tier === 'super-easy') {
    if (flipInfo.flipsDifferent < 1 || delSens < 1) return null;
    const score = delSens * 10 + flipInfo.flipsDifferent * 4 + flipInfo.flipsRivalPair * 3;
    return {entry: [seed, anchorIdx, 0], score, delSens, flips: flipInfo.flipsDifferent};
  }

  if (family.tier === 'very-easy') {
    if (flipInfo.flipsDifferent < 2 || delSens < 2) return null;
    const score = delSens * 10 + flipInfo.flipsDifferent * 4 + flipInfo.flipsRivalPair * 3;
    return {entry: [seed, anchorIdx, 0], score, delSens, flips: flipInfo.flipsDifferent};
  }

  if (family.tier === 'easy') {
    // Need a disputed row whose flip produces a DIFFERENT legal 2-name rival pair!
    if (!flipInfo.rivalRows.length) return null;
    const draw = seededDraw(seed ^ 0x51a7);
    const chosen = flipInfo.rivalRows[Math.floor(draw() * flipInfo.rivalRows.length)];
    const dMask = 1 << chosen;
    const wp = computeWorldPairs(family.id, rows, anchor, dMask);
    const reports = buildCrossChecks(rows, [chosen], wp, correctKey, null, 'easy', draw);
    if (!reports || !reports.length) return null;
    const score = delSens * 10 + flipInfo.flipsRivalPair * 5 + flipInfo.flipsDifferent * 2;
    return {entry: [seed, anchorIdx, dMask], score, delSens, flips: flipInfo.flipsDifferent};
  }

  if (family.tier === 'medium') {
    // Need 3 disputed rows where EVERY disputed row changes the answer on flip,
    // and coupled 2-SAT cross-checks pass strict pair-level minimality!
    if (flipInfo.flipsDifferent < 3) return null;
    const draw = seededDraw(seed ^ 0x9e37);
    // Prefer triples containing the most rival-pair rows
    const candidateMasks = TRIPLE_MASKS.filter(m => {
      for (let i = 0; i < 6; i++) if ((m & (1 << i)) && !flipInfo.diffRows.includes(i)) return false;
      return true;
    });
    if (!candidateMasks.length) return null;
    candidateMasks.sort((a, b) => {
      const ra = maskToIndices(a).filter(i => flipInfo.rivalRows.includes(i)).length;
      const rb = maskToIndices(b).filter(i => flipInfo.rivalRows.includes(i)).length;
      return rb - ra;
    });
    for (const dMask of candidateMasks.slice(0, 4)) {
      const disputed = maskToIndices(dMask);
      const wp = computeWorldPairs(family.id, rows, anchor, dMask);
      const reports = buildCrossChecks(rows, disputed, wp, correctKey, null, 'medium', draw);
      if (reports && reports.length >= 3) {
        const rivalCount = disputed.filter(i => flipInfo.rivalRows.includes(i)).length;
        const score = delSens * 12 + rivalCount * 8 + flipInfo.flipsDifferent * 2;
        return {entry: [seed, anchorIdx, dMask], score, delSens, flips: flipInfo.flipsDifferent};
      }
    }
    return null;
  }

  if (family.tier === 'hard') {
    // All 6 rows disputed! Require high row sensitivity + verified 6-row coupled 2-SAT pair-minimality.
    if (flipInfo.flipsDifferent < 5) return null;
    const dMask = 63;
    const wp = computeWorldPairs(family.id, rows, anchor, dMask);
    const draw = seededDraw(seed ^ 0x7f4a);
    const reports = buildCrossChecks(rows, [0, 1, 2, 3, 4, 5], wp, correctKey, null, 'hard', draw);
    if (!reports || reports.length < 6) return null;
    const score = delSens * 15 + flipInfo.flipsDifferent * 10 + flipInfo.flipsRivalPair * 6;
    return {entry: [seed, anchorIdx, dMask], score, delSens, flips: flipInfo.flipsDifferent};
  }

  return null;
}

const catalog = {};
const tierStats = {};
const failures = [];
const startTime = Date.now();

for (let fi = 0; fi < allFamilies.length; fi++) {
  const family = allFamilies[fi];
  const pool = [];
  const baseSeed = (fi + 1) * 100003;
  // Collect up to 24 candidates and keep the highest-conflict top 12!
  const desiredPool = 20;

  for (let offset = 1; offset <= MAX_SEEDS_PER_FAMILY && pool.length < desiredPool; offset++) {
    const seed = (baseSeed + offset * 7919) >>> 0;
    const anchorIdx = family.useAnchor ? (offset % symbols.length) : 0;
    const cert = certifyBoard(family, seed, anchorIdx);
    if (cert) pool.push(cert);
  }

  // Fallback pass for rare structural families to hit 12 strict boards
  if (pool.length < TARGET_PER_FAMILY) {
    console.warn(`WARN: ${family.id} (${family.tier}) only found ${pool.length} strict boards in ${MAX_SEEDS_PER_FAMILY} seeds; scanning more...`);
    for (let offset = MAX_SEEDS_PER_FAMILY + 1; offset <= MAX_SEEDS_PER_FAMILY * 6 && pool.length < TARGET_PER_FAMILY; offset++) {
      const seed = (baseSeed + offset * 7919) >>> 0;
      const anchorIdx = family.useAnchor ? (offset % symbols.length) : 0;
      const cert = certifyBoard(family, seed, anchorIdx);
      if (cert) pool.push(cert);
    }
  }

  if (pool.length < TARGET_PER_FAMILY) {
    failures.push(`${family.id} (${family.tier}): ${pool.length}/${TARGET_PER_FAMILY}`);
    continue;
  }

  pool.sort((a, b) => b.score - a.score);
  const chosen = pool.slice(0, TARGET_PER_FAMILY);
  catalog[family.id] = chosen.map(c => c.entry);

  const st = (tierStats[family.tier] ??= {families: 0, boards: 0, delSum: 0, flipSum: 0});
  st.families++;
  st.boards += chosen.length;
  for (const c of chosen) {
    st.delSum += c.delSens;
    st.flipSum += c.flips;
  }

  if ((fi + 1) % 50 === 0) {
    console.log(`Certified ${fi + 1}/${allFamilies.length} families (${((Date.now() - startTime) / 1000).toFixed(1)}s)...`);
  }
}

if (failures.length) {
  console.error(`\nFAILED families (${failures.length}):`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}

const lines = [
  '// Generated by scripts/build-case-catalog.mjs — 500 families × 12 certified boards = 6,000 boards.',
  '// Entry format: [seed, anchorIndex, disputedMask]',
  'export const caseCatalog = {'
];
const keys = Object.keys(catalog);
keys.forEach((id, idx) => {
  const comma = idx < keys.length - 1 ? ',' : '';
  lines.push(`  '${id}': ${JSON.stringify(catalog[id])}${comma}`);
});
lines.push('};', '');

writeFileSync('friend-or-foe/case-catalog.js', lines.join('\n'));

console.log(`\nDone in ${((Date.now() - startTime) / 1000).toFixed(1)}s! Wrote 6,000 certified boards.`);
for (const [tier, st] of Object.entries(tierStats)) {
  console.log(
    `  ${tier.padEnd(11)}: ${st.families} families, ${st.boards} boards | ` +
    `avg deletion-sensitive cats: ${(st.delSum / st.boards).toFixed(2)}/6 | ` +
    `avg flip-sensitive rows: ${(st.flipSum / st.boards).toFixed(2)}/6`
  );
}
