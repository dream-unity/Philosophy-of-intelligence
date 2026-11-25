import {caseCatalog} from './case-catalog.js';
import {nearMisses} from './case-decoys.js';
import {DOMAINS, evaluateFamily, familiesForLevel, getFamily} from './case-families.js';
import {alternateLinks, caseRoles, edgesFor, layoutFor, seededDraw, shuffled, symbols} from './case-layout.js';
import {buildCrossChecks, pairKey, reportHolds, solveCaseEvidence as solveEvidenceCore} from './case-logic.js';
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

// Build a 100-trial family schedule divided into 10 shuffled blocks of 10 trials,
// where EVERY 10-trial block visits all 10 espionage domains once in random order
// and cycles through all 100 families with zero repeats!
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

function assignNames(previous, forbidden, draw) {
  if (!previous || previous.length !== 2 || !previous.every(name => networkRoster.includes(name))) {
    return new Map(shuffled(networkRoster, draw).map((name, i) => [symbols[i], name]));
  }
  const slots = [];
  symbols.forEach((a, i) => {
    for (const b of symbols.slice(i + 1)) {
      if (!forbidden.has(pairKey([a, b]))) slots.push([a, b]);
    }
  });
  const hosts = slots.length ? pick(slots, draw) : [symbols[0], symbols[1]];
  const remaining = shuffled(networkRoster.filter(name => !previous.includes(name)), draw);
  const old = shuffled(previous, draw);
  return new Map(symbols.map(sym => [sym, hosts.includes(sym) ? old[hosts.indexOf(sym)] : remaining.pop()]));
}

export function solveCaseEvidence(evidence) {
  return solveEvidenceCore(evidence, evaluateFamily);
}

// Compute all worlds admitted by disputedMask on the raw symbol layout,
// requiring all 10 suspects to appear so roster completeness can never leak a cross-check.
function computeWorldPairs(familyId, rawRows, anchorSym, disputedMask) {
  const fixedMask = (~disputedMask) & 63;
  const worldPairs = new Array(64).fill(null);
  for (let m = 0; m < 64; m++) {
    if (m & fixedMask) continue;
    const edges = edgesFor(rawRows, m);
    const seen = new Set();
    for (const e of edges) { seen.add(e.from); seen.add(e.to); }
    if (seen.size < 10) continue;
    worldPairs[m] = evaluateFamily(familyId, edges, anchorSym, false).pair;
  }
  return worldPairs;
}

// Present a row cleanly to the player: if disputed, randomly flip its displayed state (50%)
// while preserving an exact involution across all 3 uncertainty modes (reverse, alias, alt).
function presentRow(resolvedRow, disputed, draw) {
  const exchange = disputed && draw() < 0.5;
  const swapOrder = draw() < 0.5;
  const baseLinks = exchange ? alternateLinks(resolvedRow) : resolvedRow.links.map(l => ({...l}));

  const row = {
    role: resolvedRow.role,
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
  const [seed, anchorIndex, disputedMask] = entries[boards.order[boards.index]];
  const deck = {rules, boards: {...last?.boards, [id]: boards}};

  const raw = layoutFor(seed);
  const originalEdges = edgesFor(raw, 0);
  const anchorSym = symbols[anchorIndex];
  const actualPair = evaluateFamily(id, originalEdges, anchorSym, false).pair;
  const correctKey = pairKey(actualPair);
  const disputedIndices = maskToIndices(disputedMask);

  // Precompute valid world pairs on symbol graph for strict pair-level cross-check synthesis
  const worldPairs = disputedIndices.length
    ? computeWorldPairs(id, raw, anchorSym, disputedMask)
    : null;

  // Ensure the previous trial's pair does NOT collide with the current answer (nor with single-row rivals)
  const forbidden = new Set([correctKey]);
  if (previous?.pair && worldPairs) {
    for (const idx of disputedIndices) {
      const rp = worldPairs[1 << idx];
      if (rp && rp.length === 2) forbidden.add(pairKey(rp));
    }
  }

  const names = assignNames(previous?.pair, forbidden, draw);
  const renameLink = ({from, to}) => ({from: names.get(from), to: names.get(to)});
  const resolved = raw.map(row => ({
    role: row.role,
    links: row.links.map(renameLink),
    ...(row.alias ? {alias: row.alias.map(s => names.get(s))} : {}),
    ...(row.alt ? {alt: {index: row.alt.index, link: renameLink(row.alt.link)}} : {})
  }));

  let prevKeySym = null;
  if (previous?.pair?.length === 2) {
    const prevSyms = symbols.filter(s => previous.pair.includes(names.get(s)));
    if (prevSyms.length === 2) prevKeySym = pairKey(prevSyms);
  }

  // Build balanced, strictly pair-minimal coupled 2-SAT cross-checks (zero Verified handouts on Moderate/Hard)
  let reports = [];
  if (disputedIndices.length) {
    reports = buildCrossChecks(resolved, disputedIndices, worldPairs, correctKey, prevKeySym, level, draw);
    if (!reports) {
      reports = buildCrossChecks(resolved, disputedIndices, worldPairs, correctKey, null, level, draw);
    }
    if (!reports) {
      for (let retry = 1; retry <= 16 && !reports; retry++) {
        reports = buildCrossChecks(resolved, disputedIndices, worldPairs, correctKey, prevKeySym, level, seededDraw(seed + retry * 9973));
      }
    }
    if (!reports) {
      const certSalt = level === 'hard' ? 0x7f4a : level === 'medium' ? 0x9e37 : 0x51a7;
      reports = buildCrossChecks(resolved, disputedIndices, worldPairs, correctKey, null, level, seededDraw(seed ^ certSalt));
    }
    if (!reports) {
      for (let retry = 17; retry <= 40 && !reports; retry++) {
        reports = buildCrossChecks(resolved, disputedIndices, worldPairs, correctKey, null, level, seededDraw(seed + retry * 9973));
      }
    }
    reports = reports || [];
  }

  // Randomly orient each disputed row (50% printed as true, 50% printed as alternate)
  const rows = resolved.map((row, i) => presentRow(row, disputedIndices.includes(i), draw));
  rows.sort((a, b) => caseRoles.indexOf(a.role) - caseRoles.indexOf(b.role));

  // Optional shortlist on Super Easy & Very Easy only
  const supportsShortlist = level === 'super-easy' || level === 'very-easy';
  const includeShortlist = supportsShortlist && options?.shortlist !== false;
  let leads = [];
  if (includeShortlist) {
    const alternatives = raw.map((_, i) => edgesFor(raw, 1 << i));
    const decoys = nearMisses(id, originalEdges, anchorSym, actualPair, alternatives, evaluateFamily);
    leads = shuffled([...actualPair, ...decoys].map(s => names.get(s)), draw);
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
    rows,
    reports,
    leads
  };

  const answer = solveCaseEvidence(evidence);
  if (answer.pair.length !== 2) {
    throw new Error('Inconsistent case ' + id + '/' + seed);
  }
  return {
    number: (previous?.number || 0) + 1,
    level,
    roster,
    evidence,
    deck,
    ...answer
  };
}
