import {writeFileSync} from 'node:fs';
import {availableParallelism} from 'node:os';
import {isMainThread, parentPort, Worker, workerData} from 'node:worker_threads';
import {allFamilies, evaluateFamily, familiesByLevel} from '../friend-or-foe/case-families.js';
import {caseRoles, edgesFor, layoutFor, seededDraw, symbols} from '../friend-or-foe/case-layout.js';
import {buildCrossChecks, targetKey} from '../friend-or-foe/case-logic.js';

// Certify 12 distinct, high-conflict boards for EVERY ONE of the 500 families (6,000 boards total).
// Guarantees enforced at build time:
//   1. ZERO immersion-breaking words ("row", "arrow", "left/right side", "score", "points", "top two", "IQ").
//   2. ZERO semantically duplicate families within any difficulty (checked across 220 test boards).
//   3. Variable target counts (1, 2, 3, or 4 targets), actively preferring mixed target sizes per family!
//   4. ZERO single-category column shortcuts (target set NEVER equals a single category's actors, recipients, or participants!).
//   5. Strict target-ID cross-check minimality against same-size rival target sets (100% single connected 6-row cycle on Hard!).

const TARGET_PER_FAMILY = 12;
const MAX_SEEDS_PER_FAMILY = 24000;
const BANNED_COPY = /\b(rows?|arrows?|left side|right side|top two|scores?|points?|IQ|appears? in|appearing|named in|listed|distinct|categor(y|ies)|file|files|acts? in|acting in|acted upon|records?|dossier)\b|Safe \(\+\)|Threat \(−\)|relational reasoning/i;

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

function isSingleCategoryShortcut(rows, correctKey) {
  for (const row of rows) {
    const froms = [...new Set(row.links.map(l => l.from))];
    const tos = [...new Set(row.links.map(l => l.to))];
    const all = [...new Set([...froms, ...tos])];
    if (targetKey(froms) === correctKey || targetKey(tos) === correctKey || targetKey(all) === correctKey) {
      return true;
    }
  }
  return false;
}

function countDeletionSensitiveCategories(familyId, edges, anchor, correctKey, targetSize) {
  let count = 0;
  for (const role of caseRoles) {
    const trimmed = edges.filter(e => e.role !== role);
    const res = evaluateFamily(familyId, trimmed, anchor, false);
    if (res.pair.length !== targetSize || targetKey(res.pair) !== correctKey) count++;
  }
  return count;
}

function rowFlipProfile(familyId, rows, anchor, correctKey, targetSize) {
  let flipsDifferent = 0;
  let flipsSameSizeRival = 0;
  const rivalRows = [];
  const diffRows = [];
  for (let i = 0; i < 6; i++) {
    const edges = edgesFor(rows, 1 << i);
    const seen = new Set();
    for (const e of edges) { seen.add(e.from); seen.add(e.to); }
    if (seen.size < 10) continue;
    const alt = evaluateFamily(familyId, edges, anchor, false).pair;
    const k = alt.length === targetSize ? targetKey(alt) : '';
    if (k !== correctKey) {
      flipsDifferent++;
      diffRows.push(i);
      if (alt.length === targetSize) {
        flipsSameSizeRival++;
        rivalRows.push(i);
      }
    }
  }
  return {flipsDifferent, flipsSameSizeRival, rivalRows, diffRows};
}

function computeWorldTargets(familyId, rows, anchor, disputedMask) {
  const fixedMask = (~disputedMask) & 63;
  const worldTargets = new Array(64).fill(null);
  for (let m = 0; m < 64; m++) {
    if (m & fixedMask) continue;
    const edges = edgesFor(rows, m);
    const seen = new Set();
    for (const e of edges) { seen.add(e.from); seen.add(e.to); }
    if (seen.size < 10) continue;
    worldTargets[m] = evaluateFamily(familyId, edges, anchor, false).pair;
  }
  return worldTargets;
}

function certifyBoard(family, seed, anchorIdx, strictHardDel = true, skipSizes = null) {
  const rows = layoutFor(seed);
  if (!rows) return null;
  const anchor = symbols[anchorIdx];
  const baseEdges = edgesFor(rows, 0);
  const base = evaluateFamily(family.id, baseEdges, anchor, false);
  const targetSize = base.pair.length;
  if (targetSize < 1 || targetSize > 4) return null;
  if (skipSizes && skipSizes.has(targetSize)) return null;
  const correctKey = targetKey(base.pair);

  if (isSingleCategoryShortcut(rows, correctKey)) return null;

  const flipInfo = rowFlipProfile(family.id, rows, anchor, correctKey, targetSize);
  const delSens = countDeletionSensitiveCategories(family.id, baseEdges, anchor, correctKey, targetSize);

  if (family.tier === 'super-easy' || family.tier === 'very-easy') {
    if (flipInfo.flipsDifferent < 2 || delSens < 2) return null;
    const score = delSens * 12 + flipInfo.flipsDifferent * 4 + flipInfo.flipsSameSizeRival * 3;
    return {entry: [seed, anchorIdx, 0], score, delSens, flips: flipInfo.flipsDifferent, targetSize};
  }

  if (family.tier === 'easy') {
    if (!flipInfo.rivalRows.length || delSens < 2) return null;
    const draw = seededDraw(seed ^ 0x51a7);
    const chosen = flipInfo.rivalRows[Math.floor(draw() * flipInfo.rivalRows.length)];
    const dMask = 1 << chosen;
    const wt = computeWorldTargets(family.id, rows, anchor, dMask);
    const reports = buildCrossChecks(rows, [chosen], wt, correctKey, null, 'easy', draw);
    if (!reports || !reports.length) return null;
    const score = delSens * 14 + flipInfo.flipsSameSizeRival * 5 + flipInfo.flipsDifferent * 2;
    return {entry: [seed, anchorIdx, dMask], score, delSens, flips: flipInfo.flipsDifferent, targetSize};
  }

  if (family.tier === 'medium') {
    if (flipInfo.flipsDifferent < 3 || delSens < 3) return null;
    const draw = seededDraw(seed ^ 0x9e37);
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
      const wt = computeWorldTargets(family.id, rows, anchor, dMask);
      const reports = buildCrossChecks(rows, disputed, wt, correctKey, null, 'medium', draw);
      if (reports && reports.length >= 3) {
        const rivalCount = disputed.filter(i => flipInfo.rivalRows.includes(i)).length;
        const score = delSens * 16 + rivalCount * 8 + flipInfo.flipsDifferent * 2;
        return {entry: [seed, anchorIdx, dMask], score, delSens, flips: flipInfo.flipsDifferent, targetSize};
      }
    }
    return null;
  }

  if (family.tier === 'hard') {
    const minDel = strictHardDel ? 4 : 3;
    if (flipInfo.flipsDifferent < 4 || delSens < minDel) return null;
    const dMask = 63;
    const wt = computeWorldTargets(family.id, rows, anchor, dMask);
    const draw = seededDraw(seed ^ 0x7f4a);
    const reports = buildCrossChecks(rows, [0, 1, 2, 3, 4, 5], wt, correctKey, null, 'hard', draw);
    if (!reports || reports.length < 6) return null;
    const score = delSens * 45 + flipInfo.flipsDifferent * 12 + flipInfo.flipsSameSizeRival * 8;
    return {entry: [seed, anchorIdx, dMask], score, delSens, flips: flipInfo.flipsDifferent, targetSize};
  }

  return null;
}

function pickBalancedTop12(pool) {
  const bySize = new Map([[1, []], [2, []], [3, []], [4, []]]);
  for (const item of pool) bySize.get(item.targetSize).push(item);
  for (const list of bySize.values()) list.sort((a, b) => b.score - a.score);

  const chosen = [];
  const used = new Set();
  // Round-robin across sizes [2, 1, 3, 4] so 1-target trials never dominate a family!
  for (let round = 0; round < 4 && chosen.length < TARGET_PER_FAMILY; round++) {
    for (const sz of [2, 1, 3, 4]) {
      if (chosen.length >= TARGET_PER_FAMILY) break;
      const list = bySize.get(sz);
      if (round < list.length) {
        chosen.push(list[round]);
        used.add(list[round]);
      }
    }
  }
  if (chosen.length < TARGET_PER_FAMILY) {
    const rest = pool.filter(c => !used.has(c)).sort((a, b) => b.score - a.score);
    chosen.push(...rest.slice(0, TARGET_PER_FAMILY - chosen.length));
  }
  return chosen;
}

function certifyRange(indices) {
  const results = [];
  for (const fi of indices) {
    const family = allFamilies[fi];
    const pool = [];
    const sizeCounts = {1: 0, 2: 0, 3: 0, 4: 0};
    const skipSizes = new Set();
    const baseSeed = (fi + 1) * 100003;
    const desiredPool = 22;
    const capForSize = sz => (sz === 1 ? 5 : 8);

    for (let offset = 1; offset <= MAX_SEEDS_PER_FAMILY && pool.length < desiredPool; offset++) {
      const seed = (baseSeed + offset * 7919) >>> 0;
      const anchorIdx = family.useAnchor ? (offset % symbols.length) : 0;
      const cert = certifyBoard(family, seed, anchorIdx, true, skipSizes);
      if (cert) {
        pool.push(cert);
        sizeCounts[cert.targetSize]++;
        if (sizeCounts[cert.targetSize] >= capForSize(cert.targetSize)) skipSizes.add(cert.targetSize);
      }
    }

    // Fallback pass if a rare family needs additional boards (or Hard delSens === 3) to reach 12
    if (pool.length < TARGET_PER_FAMILY) {
      const seenSeeds = new Set(pool.map(p => p.entry[0]));
      for (let offset = 1; offset <= MAX_SEEDS_PER_FAMILY * 10 && pool.length < TARGET_PER_FAMILY; offset++) {
        const seed = (baseSeed + offset * 7919) >>> 0;
        if (seenSeeds.has(seed)) continue;
        const anchorIdx = family.useAnchor ? (offset % symbols.length) : 0;
        const cert = certifyBoard(family, seed, anchorIdx, false, null);
        if (cert) {
          seenSeeds.add(seed);
          pool.push(cert);
        }
      }
    }

    if (pool.length < TARGET_PER_FAMILY) {
      results.push({fi, id: family.id, tier: family.tier, failed: pool.length});
    } else {
      const chosen = pickBalancedTop12(pool);
      results.push({
        fi,
        id: family.id,
        tier: family.tier,
        entries: chosen.map(c => c.entry),
        delSum: chosen.reduce((s, c) => s + c.delSens, 0),
        flipSum: chosen.reduce((s, c) => s + c.flips, 0),
        sizes: chosen.reduce((acc, c) => { acc[c.targetSize]++; return acc; }, {1: 0, 2: 0, 3: 0, 4: 0})
      });
    }
  }
  return results;
}

if (!isMainThread) {
  parentPort.postMessage(certifyRange(workerData.indices));
} else {
  const startTime = Date.now();
  // Step 1: Audit all 500 families for banned meta-UI text & semantic duplicates!
  const textErrors = [];
  for (const f of allFamilies) {
    for (const field of ['title', 'order', 'hint']) {
      if (f[field] && BANNED_COPY.test(f[field])) {
        textErrors.push(`${f.id}.${field}: matched banned wording -> "${f[field]}"`);
      }
    }
  }
  if (textErrors.length) {
    console.error('BANNED COPY DETECTED:\n' + textErrors.join('\n'));
    process.exit(1);
  }

  const probeLayouts = [];
  for (let s = 1; probeLayouts.length < 220; s++) {
    const rows = layoutFor((s * 7919 + 1337) >>> 0);
    if (rows) probeLayouts.push({edges: edgesFor(rows, 0), anchor: symbols[s % symbols.length]});
  }
  const dupErrors = [];
  for (const [tier, list] of Object.entries(familiesByLevel)) {
    const sigMap = new Map();
    for (const f of list) {
      const sig = probeLayouts.map(p => targetKey(evaluateFamily(f.id, p.edges, p.anchor, false).pair)).join(';');
      if (sigMap.has(sig)) {
        dupErrors.push(`Duplicate predicate in ${tier}: ${f.id} ("${f.title}") === ${sigMap.get(sig)}`);
      } else {
        sigMap.set(sig, `${f.id} ("${f.title}")`);
      }
    }
  }
  if (dupErrors.length) {
    console.error('SEMANTIC DUPLICATES DETECTED:\n' + dupErrors.join('\n'));
    process.exit(1);
  }
  console.log('Pre-flight OK: 0 banned meta-UI words, 0 semantic duplicate predicates across all 500 families.');

  // Step 2: Interleave family indices across workers for balanced CPU load across all 5 tiers
  const workersCount = Math.max(1, Math.min(4, availableParallelism()));
  const buckets = Array.from({length: workersCount}, () => []);
  for (let fi = 0; fi < allFamilies.length; fi++) buckets[fi % workersCount].push(fi);

  const workerResults = await Promise.all(buckets.map(indices => new Promise((resolve, reject) => {
    const w = new Worker(new URL(import.meta.url), {workerData: {indices}});
    w.on('message', resolve);
    w.on('error', reject);
  })));

  const flat = workerResults.flat().sort((a, b) => a.fi - b.fi);
  const failures = flat.filter(r => r.failed !== undefined);
  if (failures.length) {
    console.error(`\nFAILED families (${failures.length}):`);
    for (const f of failures) console.error(`  ${f.id} (${f.tier}): ${f.failed}/${TARGET_PER_FAMILY}`);
    process.exit(1);
  }

  const catalog = {};
  const tierStats = {};
  for (const r of flat) {
    catalog[r.id] = r.entries;
    const st = (tierStats[r.tier] ??= {families: 0, boards: 0, delSum: 0, flipSum: 0, sizes: {1: 0, 2: 0, 3: 0, 4: 0}});
    st.families++;
    st.boards += r.entries.length;
    st.delSum += r.delSum;
    st.flipSum += r.flipSum;
    for (const sz of [1, 2, 3, 4]) st.sizes[sz] += r.sizes[sz];
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
  console.log(`\nDone in ${((Date.now() - startTime) / 1000).toFixed(1)}s (${workersCount} workers)! Wrote 6,000 certified boards.`);
  for (const [tier, st] of Object.entries(tierStats)) {
    const s = st.sizes;
    console.log(
      `  ${tier.padEnd(11)}: ${st.families} families, ${st.boards} boards | ` +
      `avg del-sens: ${(st.delSum / st.boards).toFixed(2)}/6 | ` +
      `avg flip-sens: ${(st.flipSum / st.boards).toFixed(2)}/6 | ` +
      `targets [1:${s[1]}, 2:${s[2]}, 3:${s[3]}, 4:${s[4]}]`
    );
  }
}
