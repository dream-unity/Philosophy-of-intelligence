import {caseCatalog} from './case-catalog.js';
import {nearMisses} from './case-decoys.js';
import {DOMAINS, evaluateFamily, familiesForLevel, getFamily} from './case-families.js';
import {alternateLinks, caseRoles, edgesFor, layoutFor, seededDraw, shuffled, symbols} from './case-layout.js';
import {buildCrossChecks, pairKey, reportHolds, solveCaseEvidence as solveEvidenceCore, targetKey} from './case-logic.js';
import {networkRoster} from './roster.js';

export {reportHolds};

const pick = (array, draw) => array[Math.floor(draw() * array.length)];

function takeFromBag(items, old, draw, avoidRepeat = true) {
  if (old && old.index + 1 < old.order.length) return {...old, index: old.index + 1};
  const order = shuffled(items, draw);
  if (avoidRepeat && old && order.length > 1 && order[0] === old.order[old.index]) {
    const next = 1 + Math.floor(draw() * (order.length - 1));
    [order[0], order[next]] = [order[next], order[0]];
  }
  return {order, index: 0};
}

// 100-trial family schedule divided into 10 shuffled blocks of 10 trials,
// visiting all 10 espionage domains once per block with zero repeats across all 100 families.
function buildDomainBlockOrder(families, draw, lastId = null) {
  const byDomain = Array.from({length: DOMAINS.length}, () => []);
  for (const f of families) byDomain[f.domain].push(f.id);
  const queues = byDomain.map(list => shuffled(list, draw));
  const rounds = Math.max(...queues.map(q => q.length));
  const order = [];
  for (let r = 0; r < rounds; r++) {
    const block = [];
    for (let d = 0; d < queues.length; d++) {
      if (r < queues[d].length) block.push(queues[d][r]);
    }
    order.push(...shuffled(block, draw));
  }
  if (lastId && order.length > 1 && order[0] === lastId) {
    const swapIdx = 1 + Math.floor(draw() * Math.min(9, order.length - 1));
    [order[0], order[swapIdx]] = [order[swapIdx], order[0]];
  }
  return order;
}

function takeFamilyFromDeck(families, old, draw) {
  if (old && old.index + 1 < old.order.length) return {...old, index: old.index + 1};
  const lastId = old ? old.order[old.index] : null;
  return {order: buildDomainBlockOrder(families, draw, lastId), index: 0};
}

function maskToIndices(mask) {
  const out = [];
  for (let i = 0; i < 6; i++) if (mask & (1 << i)) out.push(i);
  return out;
}

// Assign concrete suspect names to symbols A..J while ensuring the previous trial's exact
// target set NEVER repeats as the current answer or as any forbidden single-row rival set!
function assignNames(previousTargets, forbiddenKeys, draw) {
  if (!previousTargets || previousTargets.length < 1 || previousTargets.length > 4 ||
      !previousTargets.every(name => networkRoster.includes(name))) {
    return new Map(shuffled(networkRoster, draw).map((name, i) => [symbols[i], name]));
  }
  const k = previousTargets.length;
  // Pick a random k-subset of symbols that is NOT in forbiddenKeys
  for (let attempt = 0; attempt < 120; attempt++) {
    const perm = shuffled(symbols, draw);
    const hosts = perm.slice(0, k);
    if (forbiddenKeys.has(targetKey(hosts))) continue;
    const remaining = shuffled(networkRoster.filter(name => !previousTargets.includes(name)), draw);
    const old = shuffled(previousTargets, draw);
    const map = new Map();
    hosts.forEach((sym, i) => map.set(sym, old[i]));
    perm.slice(k).forEach((sym, i) => map.set(sym, remaining[i]));
    return map;
  }
  return new Map(shuffled(networkRoster, draw).map((name, i) => [symbols[i], name]));
}

export function solveCaseEvidence(evidence) {
  return solveEvidenceCore(evidence, evaluateFamily);
}

// Compute all worlds admitted by disputedMask on the raw symbol layout,
// requiring all 10 suspects to appear so roster completeness can never leak a cross-check.
function computeWorldTargets(familyId, rawRows, anchorSym, disputedMask) {
  const fixedMask = (~disputedMask) & 63;
  const worldTargets = new Array(64).fill(null);
  for (let m = 0; m < 64; m++) {
    if (m & fixedMask) continue;
    const edges = edgesFor(rawRows, m);
    const seen = new Set();
    for (const e of edges) { seen.add(e.from); seen.add(e.to); }
    if (seen.size < 10) continue;
    worldTargets[m] = evaluateFamily(familyId, edges, anchorSym, false).pair;
  }
  return worldTargets;
}

// Present a file cleanly to the player: if disputed, randomly flip its displayed state (50%)
// while preserving an exact involution across all 3 uncertainty modes (reverse, alias, alt).
function presentRow(resolvedRow, disputed, draw) {
  const exchange = disputed && draw() < 0.5;
  const swapOrder = draw() < 0.5;
  const baseLinks = exchange ? alternateLinks(resolvedRow) : resolvedRow.links.map(l => ({...l}));

  const row = {
    role: resolvedRow.role,
    time: resolvedRow.time,
    incident: resolvedRow.incident,
    links: swapOrder ? [baseLinks[1], baseLinks[0]] : [baseLinks[0], baseLinks[1]],
    disputed
  };

  if (disputed && resolvedRow.alias) {
    row.alias = shuffled(resolvedRow.alias, draw);
  } else if (disputed && resolvedRow.alt) {
    const origIdx = resolvedRow.alt.index;
    const dispIdx = swapOrder ? 1 - origIdx : origIdx;
    const altTarget = exchange ? {...resolvedRow.links[origIdx]} : {...resolvedRow.alt.link};
    row.alt = {index: dispIdx, link: altTarget};
  }
  return row;
}

const TRIPLE_MASKS = [];
for (let a = 0; a < 6; a++) {
  for (let b = a + 1; b < 6; b++) {
    for (let c = b + 1; c < 6; c++) TRIPLE_MASKS.push((1 << a) | (1 << b) | (1 << c));
  }
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

function countDelSensitive(familyId, edges, anchor, correctKey, targetSize) {
  let count = 0;
  for (const role of caseRoles) {
    const res = evaluateFamily(familyId, edges.filter(e => e.role !== role), anchor, false);
    if (res.pair.length !== targetSize || targetKey(res.pair) !== correctKey) count++;
  }
  return count;
}

function rowFlipSummary(familyId, rows, anchor, correctKey, targetSize) {
  let flipsDifferent = 0;
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
      if (alt.length === targetSize) rivalRows.push(i);
    }
  }
  return {flipsDifferent, rivalRows, diffRows};
}

// Fast live layout synthesizer: generates brand-new certified topologies on the fly from random 32-bit
// seeds so returning players cannot memorize the 12 fallback catalog layouts.
// Fast cheap filters (layoutFor + base evaluate + delSens + flipSummary) run first; expensive
// 64-world sweeps + buildCrossChecks are tightly capped so trial start stays instant (<15 ms).
function synthesizeLiveBoard(family, level, prevSize, catalogSeeds, draw) {
  const budget = level === 'hard' ? 560 : level === 'medium' ? 280 : level === 'easy' ? 48 : 24;
  const maxSolverCalls = level === 'hard' ? 6 : level === 'medium' ? 6 : 8;
  let solverCalls = 0;
  let best = null;
  for (let attempt = 0; attempt < budget && solverCalls < maxSolverCalls; attempt++) {
    const seed = (Math.floor(draw() * 0x7ffffffe) + 1) >>> 0;
    if (catalogSeeds.has(seed)) continue;
    const rows = layoutFor(seed);
    if (!rows) continue;
    const anchorIndex = family.useAnchor ? Math.floor(draw() * symbols.length) : 0;
    const anchor = symbols[anchorIndex];
    const baseEdges = edgesFor(rows, 0);
    const actualTargets = evaluateFamily(family.id, baseEdges, anchor, false).pair;
    const sz = actualTargets.length;
    if (sz < 1 || sz > 4) continue;
    const correctKey = targetKey(actualTargets);
    if (isSingleCategoryShortcut(rows, correctKey)) continue;

    const delSens = countDelSensitive(family.id, baseEdges, anchor, correctKey, sz);
    const minDel = level === 'hard' ? 4 : level === 'medium' ? 3 : 2;
    if (delSens < minDel) continue;

    const flipInfo = rowFlipSummary(family.id, rows, anchor, correctKey, sz);
    const sizeBonus = (prevSize && sz !== prevSize) ? 18 : 0;

    if (level === 'super-easy' || level === 'very-easy') {
      if (flipInfo.flipsDifferent < 2) continue;
      const score = delSens * 12 + flipInfo.flipsDifferent * 4 + sizeBonus;
      if (!best || score > best.score) best = {seed, anchorIndex, disputedMask: 0, raw: rows, actualTargets, score};
      if (delSens >= 3 && sz !== prevSize) return best;
    } else if (level === 'easy') {
      if (!flipInfo.rivalRows.length) continue;
      solverCalls++;
      const chosen = flipInfo.rivalRows[Math.floor(draw() * flipInfo.rivalRows.length)];
      const dMask = 1 << chosen;
      const wt = computeWorldTargets(family.id, rows, anchor, dMask);
      if (!buildCrossChecks(rows, [chosen], wt, correctKey, null, 'easy', seededDraw(seed ^ 0x51a7))) continue;
      const score = delSens * 12 + flipInfo.rivalRows.length * 4 + sizeBonus;
      if (!best || score > best.score) best = {seed, anchorIndex, disputedMask: dMask, raw: rows, actualTargets, score};
      if (delSens >= 3 && sz !== prevSize) return best;
    } else if (level === 'medium') {
      if (flipInfo.flipsDifferent < 3) continue;
      const candidates = TRIPLE_MASKS.filter(m => {
        for (let i = 0; i < 6; i++) if ((m & (1 << i)) && !flipInfo.diffRows.includes(i)) return false;
        return true;
      });
      if (!candidates.length) continue;
      candidates.sort((a, b) =>
        maskToIndices(b).filter(i => flipInfo.rivalRows.includes(i)).length -
        maskToIndices(a).filter(i => flipInfo.rivalRows.includes(i)).length
      );
      solverCalls++;
      for (const dMask of candidates.slice(0, 2)) {
        const disputed = maskToIndices(dMask);
        const wt = computeWorldTargets(family.id, rows, anchor, dMask);
        if (buildCrossChecks(rows, disputed, wt, correctKey, null, 'medium', seededDraw(seed ^ 0x9e37))) {
          const score = delSens * 15 + flipInfo.flipsDifferent * 3 + sizeBonus;
          if (!best || score > best.score) best = {seed, anchorIndex, disputedMask: dMask, raw: rows, actualTargets, score};
          if (delSens >= 4 || sz !== prevSize) return best;
          break;
        }
      }
    } else if (level === 'hard') {
      if (flipInfo.flipsDifferent < 4) continue;
      solverCalls++;
      const dMask = 63;
      const wt = computeWorldTargets(family.id, rows, anchor, dMask);
      if (!buildCrossChecks(rows, [0, 1, 2, 3, 4, 5], wt, correctKey, null, 'hard', seededDraw(seed ^ 0x7f4a))) continue;
      const score = delSens * 40 + flipInfo.flipsDifferent * 8 + sizeBonus;
      if (!best || score > best.score) best = {seed, anchorIndex, disputedMask: dMask, raw: rows, actualTargets, score};
      if (delSens >= 4) return best;
    }
  }
  return best;
}

export function makeCaseTrial(level, previous = null, draw = Math.random, options = {}) {
  if (level === 'moderate') level = 'medium';
  if (!['super-easy', 'very-easy', 'easy', 'medium', 'hard'].includes(level)) {
    throw new RangeError('Unknown difficulty ' + level);
  }

  const familyPool = familiesForLevel(level);
  const last = previous?.level === level ? previous.deck : null;
  const rules = takeFamilyFromDeck(familyPool, last?.rules, draw);
  const id = rules.order[rules.index];
  const family = getFamily(id);

  const entries = caseCatalog[id];
  if (!entries || !entries.length) throw new Error('Missing catalog entries for ' + id);
  const boards = takeFromBag(entries.map((_, i) => i), last?.boards?.[id], draw);
  const deck = {rules, boards: {...last?.boards, [id]: boards}};

  const prevTargets = previous?.targets || previous?.pair || null;
  const prevSize = prevTargets ? prevTargets.length : 0;
  const catalogSeeds = new Set(entries.map(e => e[0]));

  // Attempt fresh live layout synthesis first; fall back cleanly to the certified catalog board.
  const live = options?.catalogOnly ? null : synthesizeLiveBoard(family, level, prevSize, catalogSeeds, draw);
  const liveSynthesized = Boolean(live);
  let seed, anchorIndex, disputedMask, raw, actualTargets;
  if (live) {
    ({seed, anchorIndex, disputedMask, raw, actualTargets} = live);
  } else {
    [seed, anchorIndex, disputedMask] = entries[boards.order[boards.index]];
    raw = layoutFor(seed);
    actualTargets = evaluateFamily(id, edgesFor(raw, 0), symbols[anchorIndex], false).pair;
  }

  const originalEdges = edgesFor(raw, 0);
  const anchorSym = symbols[anchorIndex];
  const correctKey = targetKey(actualTargets);
  const disputedIndices = maskToIndices(disputedMask);

  const worldTargets = disputedIndices.length
    ? computeWorldTargets(id, raw, anchorSym, disputedMask)
    : null;

  // Ensure the previous trial's exact target set does NOT collide with the current answer
  // OR with any single-disputed-world rival of the same size (eliminating prevKey cross-check leaks!).
  const forbidden = new Set([correctKey]);
  if (prevTargets && worldTargets && prevTargets.length === actualTargets.length) {
    for (let m = 1; m < 64; m++) {
      const rp = worldTargets[m];
      if (rp && rp.length === actualTargets.length && forbidden.size < 25) {
        forbidden.add(targetKey(rp));
      }
    }
  }

  const names = assignNames(prevTargets, forbidden, draw);
  const renameLink = ({from, to}) => ({from: names.get(from), to: names.get(to)});
  const resolved = raw.map(row => ({
    role: row.role,
    time: row.time,
    incident: row.incident,
    links: row.links.map(renameLink),
    ...(row.alias ? {alias: row.alias.map(s => names.get(s))} : {}),
    ...(row.alt ? {alt: {index: row.alt.index, link: renameLink(row.alt.link)}} : {})
  }));

  let prevKeySym = null;
  if (prevTargets && prevTargets.length === actualTargets.length) {
    const prevSyms = symbols.filter(s => prevTargets.includes(names.get(s)));
    if (prevSyms.length === actualTargets.length) prevKeySym = targetKey(prevSyms);
  }

  // Strictly enforce prevKeySym exclusion on EVERY retry so prevTarget never leaks a cross-check!
  let reports = [];
  if (disputedIndices.length) {
    reports = buildCrossChecks(resolved, disputedIndices, worldTargets, correctKey, prevKeySym, level, draw);
    for (let retry = 1; retry <= 24 && !reports; retry++) {
      reports = buildCrossChecks(resolved, disputedIndices, worldTargets, correctKey, prevKeySym, level, seededDraw(seed + retry * 9973));
    }
    if (!reports) {
      const certSalt = level === 'hard' ? 0x7f4a : level === 'medium' ? 0x9e37 : 0x51a7;
      reports = buildCrossChecks(resolved, disputedIndices, worldTargets, correctKey, prevKeySym, level, seededDraw(seed ^ certSalt));
    }
    if (!reports) {
      reports = buildCrossChecks(resolved, disputedIndices, worldTargets, correctKey, null, level, seededDraw(seed ^ 0x4242));
    }
    reports = reports || [];
  }

  // Randomly orient each disputed file (50% printed as true, 50% printed as alternate)
  const rows = resolved.map((row, i) => presentRow(row, disputedIndices.includes(i), draw));
  rows.sort((a, b) => caseRoles.indexOf(a.role) - caseRoles.indexOf(b.role));

  // Optional shortlist on Super Easy & Very Easy only
  const supportsShortlist = level === 'super-easy' || level === 'very-easy';
  const includeShortlist = supportsShortlist && options?.shortlist !== false;
  let leads = [];
  if (includeShortlist) {
    const alternatives = raw.map((_, i) => edgesFor(raw, 1 << i));
    const decoys = nearMisses(id, originalEdges, anchorSym, actualTargets, alternatives, evaluateFamily);
    leads = shuffled([...actualTargets, ...decoys].map(s => names.get(s)), draw);
  }

  const anchor = names.get(anchorSym);
  const roster = shuffled(networkRoster, draw);
  const title = family.title.replaceAll('{name}', anchor);
  const order = family.order.replaceAll('{name}', anchor);
  const hint = (family.hint || '').replaceAll('{name}', anchor);

  const evidence = {
    level,
    domain: DOMAINS[family.domain],
    roster,
    family: id,
    title,
    order,
    hint,
    anchor,
    targetCount: actualTargets.length,
    rows,
    reports,
    leads
  };

  const answer = solveCaseEvidence(evidence);
  if (answer.pair.length < 1 || answer.pair.length > 4) {
    throw new Error('Inconsistent case ' + id + '/' + seed);
  }
  return {
    number: (previous?.number || 0) + 1,
    level,
    seed,
    liveSynthesized,
    roster,
    evidence,
    deck,
    ...answer
  };
}
