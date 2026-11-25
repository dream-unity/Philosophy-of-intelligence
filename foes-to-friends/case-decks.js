import {caseCatalog} from './case-catalog.js';
import {nearMisses} from './case-decoys.js';
import {alternate, caseRoles, edgesFor, layoutFor, roleNames, shuffled, symbols} from './case-layout.js';
import {displayEdge, displayRole, evaluatePattern, patternBrief, patterns, variantsFor} from './case-patterns.js';
import {networkRoster} from './roster.js';

const label = role => roleNames[role];
const pick = (array, draw) => array[Math.floor(draw() * array.length)];
const pairKey = pair => pair.slice().sort().join('|');

function takeFromBag(items, old, draw, avoidRepeat = true) {
  if (old && old.index + 1 < old.order.length) return {...old, index: old.index + 1};
  const order = shuffled(items, draw);
  if (avoidRepeat && old && order.length > 1 && order[0] === old.order[old.index]) {
    const next = 1 + Math.floor(draw() * (order.length - 1));
    [order[0], order[next]] = [order[next], order[0]];
  }
  return {order, index: 0};
}

function decodeTree(code) {
  return caseRoles.map((_, i) => Math.floor(code / (8 ** i)) % 8);
}

function branchMask(parents, index) {
  return parents.reduce((mask, _, i) => {
    for (let ancestor = i; ancestor < parents.length; ancestor = parents[ancestor]) {
      if (ancestor === index) return mask | (1 << i);
    }
    return mask;
  }, 0);
}

function assignNames(previous, forbidden, draw) {
  if (!previous || previous.length !== 2 || !previous.every(name => networkRoster.includes(name))) {
    return new Map(shuffled(networkRoster, draw).map((name, i) => [symbols[i], name]));
  }
  const slots = [];
  symbols.forEach((a, i) => {
    for (const b of symbols.slice(i + 1)) if (!forbidden.has(pairKey([a, b]))) slots.push([a, b]);
  });
  const hosts = pick(slots, draw);
  const remaining = shuffled(networkRoster.filter(name => !previous.includes(name)), draw);
  const old = shuffled(previous, draw);
  return new Map(symbols.map(name => [name, hosts.includes(name) ? old[hosts.indexOf(name)] : remaining.pop()]));
}

const matches = (a, b) => a.role === b.role && a.from === b.from && a.to === b.to;
const truth = (edges, claim) => edges.some(edge => matches(edge, claim));

export function reportHolds(edges, report) {
  const right = truth(edges, report.right);
  if (report.op === 'verified') return right;
  if (report.op === 'ruled-out') return !right;
  const left = truth(edges, report.left);
  switch (report.op) {
    case 'eq': return left === right;
    case 'neq': return left !== right;
    case 'imp': return !left || right;
    case 'or': return left || right;
    default: throw new RangeError('Unknown report operator ' + report.op);
  }
}

function evidenceReports(rows, parents, level, draw) {
  function makeClaim(index, forcedValue = null) {
    const row = rows[index];
    const actual = row.links.map(link => ({role: row.role, ...link}));
    const other = row.links.map(link => ({role: row.role, ...alternate(link, row.alias)}));
    const value = forcedValue === null ? draw() < .5 : forcedValue;
    const [group, opposite] = value ? [actual, other] : [other, actual];
    return {clue: pick(group.filter(edge => !truth(opposite, edge)), draw), value};
  }

  function makeDirectionalLink(parentIdx, childIdx, allowLogic) {
    const r = draw();
    if (allowLogic && r < .22) {
      // Modus Ponens: parent(true) => child(true)
      return {left: makeClaim(parentIdx, true).clue, right: makeClaim(childIdx, true).clue, op: 'imp'};
    }
    if (allowLogic && r < .40) {
      // Modus Tollens: child(false) => parent(false)
      return {left: makeClaim(childIdx, false).clue, right: makeClaim(parentIdx, false).clue, op: 'imp'};
    }
    if (allowLogic && r < .55) {
      // Disjunctive Syllogism: parent(false) v child(true)
      const p = makeClaim(parentIdx, false).clue;
      const c = makeClaim(childIdx, true).clue;
      return draw() < .5 ? {left: p, right: c, op: 'or'} : {left: c, right: p, op: 'or'};
    }
    const source = makeClaim(parentIdx);
    const child = makeClaim(childIdx);
    const [left, right] = draw() < .5 ? [source, child] : [child, source];
    return {left: left.clue, right: right.clue, op: left.value === right.value ? 'eq' : 'neq'};
  }

  const reports = [];
  if (level === 'very-easy') return reports;

  if (level === 'easy') {
    const child = parents.findIndex(p => p < 6);
    if (child >= 0) reports.push(makeDirectionalLink(parents[child], child, true));
    return reports;
  }

  // Group disputed rows into tree components rooted at parents[r] === 6.
  const roots = [];
  for (let i = 0; i < parents.length; i++) if (parents[i] === 6) roots.push(i);
  const components = roots.map(root => {
    const nodes = [];
    for (let i = 0; i < parents.length; i++) {
      if (parents[i] === 7) continue;
      let cur = i;
      while (cur < 6 && parents[cur] < 6) cur = parents[cur];
      if (cur === root) nodes.push(i);
    }
    return {root, nodes};
  });

  // On Hard, guarantee at least one component uses an irreducible coupled cycle (no Verified handout).
  // On Moderate, use a coupled cycle 75% of the time and a mixed implication chain 25% of the time.
  const eligibleCycles = components.filter(c => c.nodes.length >= 2);
  const forcedCycleRoot = level === 'hard' && eligibleCycles.length
    ? pick(eligibleCycles, draw).root
    : null;

  for (const {root, nodes} of components) {
    const useCycle = nodes.length >= 2 && (
      root === forcedCycleRoot ||
      (level === 'moderate' || level === 'medium' ? draw() < .75 : draw() < .65)
    );

    if (useCycle) {
      // Every tree edge uses = or != so the tree leaves only two complementary worlds: W0 and ~W0.
      for (const u of nodes) {
        if (u === root) continue;
        const source = makeClaim(parents[u]);
        const child = makeClaim(u);
        const [left, right] = draw() < .5 ? [source, child] : [child, source];
        reports.push({left: left.clue, right: right.clue, op: left.value === right.value ? 'eq' : 'neq'});
      }
      // Pick a deep node (preferring a leaf) to close the coupled cycle with => or v.
      const leaves = nodes.filter(u => u !== root && !nodes.some(other => parents[other] === u));
      const partner = pick(leaves.length ? leaves : nodes.filter(u => u !== root), draw);
      if (draw() < .55) {
        // c_root(false) => c_partner(true): kills ~W0 (1 => 0), preserves all subtree flips (0 => *).
        reports.push({
          left: makeClaim(root, false).clue,
          right: makeClaim(partner, true).clue,
          op: 'imp'
        });
      } else {
        // c_root(true) v c_partner(true): kills ~W0 (0 v 0), preserves all subtree flips (1 v *).
        const rClaim = makeClaim(root, true).clue;
        const pClaim = makeClaim(partner, true).clue;
        reports.push(draw() < .5
          ? {left: rClaim, right: pClaim, op: 'or'}
          : {left: pClaim, right: rClaim, op: 'or'});
      }
    } else {
      const rootClaim = makeClaim(root);
      reports.push({left: null, right: rootClaim.clue, op: rootClaim.value ? 'verified' : 'ruled-out'});
      for (const u of nodes) {
        if (u === root) continue;
        reports.push(makeDirectionalLink(parents[u], u, true));
      }
    }
  }

  return shuffled(reports, draw);
}

function describeRow(rows, mask, role) {
  const i = rows.findIndex(row => row.role === role);
  if (!(mask & (1 << i))) return label(role) + ' reads as printed';
  return rows[i].alias ? label(role) + ' swaps ' + rows[i].alias.join(' and ') : label(role) + ' reverses';
}

function explainRows(rows, reports, mask) {
  const edges = edgesFor(rows, mask);
  const pending = reports.slice();
  const known = new Set(rows.filter(row => !row.disputed).map(row => row.role));
  const steps = [];

  function canForceFromKnown(r) {
    if (!r.left) return !known.has(r.right.role);
    const lKnown = known.has(r.left.role);
    const rKnown = known.has(r.right.role);
    if (lKnown === rKnown) return false;
    if (r.op === 'eq' || r.op === 'neq') return true;
    const lVal = truth(edges, r.left);
    const rVal = truth(edges, r.right);
    if (r.op === 'imp') {
      return (lKnown && lVal) || (rKnown && !rVal);
    }
    if (r.op === 'or') {
      return (lKnown && !lVal) || (rKnown && !rVal);
    }
    return false;
  }

  while (pending.length) {
    const i = pending.findIndex(canForceFromKnown);
    if (i >= 0) {
      const [r] = pending.splice(i, 1);
      const parent = r.left && (known.has(r.left.role) ? r.left.role : r.right.role);
      const child = !r.left || parent === r.left.role ? r.right.role : r.left.role;
      const opTag = r.op === 'imp' ? ' (⇒)' : r.op === 'or' ? ' (∨)' : '';
      const lead = parent ? 'From ' + label(parent) + opTag : r.op === 'verified' ? 'Verified link' : 'Ruled-out link';
      steps.push(lead + ' → ' + describeRow(rows, mask, child) + '.');
      known.add(child);
      continue;
    }

    // No single clue resolves a row alone: identify a coupled cycle among remaining unknown rows.
    const eqClues = pending.filter(r => (r.op === 'eq' || r.op === 'neq') && !known.has(r.left.role) && !known.has(r.right.role));
    const lockIndex = pending.findIndex(r => (r.op === 'imp' || r.op === 'or') && !known.has(r.left.role) && !known.has(r.right.role));
    if (lockIndex < 0) break;
    const lock = pending[lockIndex];

    // BFS over eq/neq clues starting from lock.left.role to gather the coupled cluster.
    const cluster = new Set([lock.left.role, lock.right.role]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const c of eqClues) {
        if (cluster.has(c.left.role) && !cluster.has(c.right.role)) { cluster.add(c.right.role); grew = true; }
        else if (cluster.has(c.right.role) && !cluster.has(c.left.role)) { cluster.add(c.left.role); grew = true; }
      }
    }
    const members = [...cluster];
    const lockSymbol = lock.op === 'imp' ? '⇒' : '∨';
    steps.push(
      'Coupled cycle (' + members.map(label).join(', ') + '): ' +
      label(lock.left.role) + ' ' + lockSymbol + ' ' + label(lock.right.role) +
      ' eliminates the opposite reading → ' +
      members.map(role => describeRow(rows, mask, role)).join('; ') + '.'
    );
    for (const role of members) known.add(role);
    for (let j = pending.length - 1; j >= 0; j--) {
      const c = pending[j];
      if ((!c.left || known.has(c.left.role)) && known.has(c.right.role)) pending.splice(j, 1);
    }
  }
  return steps;
}

export function solveCaseEvidence(evidence) {
  const {rows, reports, family, anchor} = evidence;
  const fixed = rows.reduce((mask, row, i) => row.disputed ? mask : mask | (1 << i), 0);
  let solution;
  let validWorlds = 0;
  for (let mask = 0; mask < 1 << rows.length; mask++) {
    if (mask & fixed) continue;
    const edges = edgesFor(rows, mask);
    if (!reports.every(report => reportHolds(edges, report))) continue;
    const participants = new Set(edges.flatMap(edge => [edge.from, edge.to]));
    if (evidence.roster?.some(name => !participants.has(name))) continue;
    validWorlds++;
    const answer = evaluatePattern(family, edges, anchor, true, evidence.variant);
    if (answer.pair.length !== 2) continue;
    if (solution && pairKey(solution.pair) !== pairKey(answer.pair)) return {pair: [], proof: [], validWorlds};
    solution ??= {...answer, proof: [...answer.proof, ...explainRows(rows, reports, mask)]};
  }
  return solution ? {...solution, validWorlds} : {pair: [], proof: [], validWorlds};
}

export function makeCaseTrial(level, previous = null, draw = Math.random, options = {}) {
  if (level === 'moderate') level = 'medium';
  if (!['very-easy', 'easy', 'medium', 'hard'].includes(level)) throw new RangeError('Unknown difficulty ' + level);
  const last = previous?.level === level ? previous.deck : null;
  const rules = takeFromBag(patterns.map(p => p.id), last?.rules, draw);
  const id = rules.order[rules.index];
  const variants = variantsFor(id);
  const readings = takeFromBag(variants.map((_, i) => i), last?.readings?.[id], draw, false);
  const variant = variants[readings.order[readings.index]];
  const brief = patternBrief(id, variant);
  const entries = caseCatalog[id];
  const boards = takeFromBag(entries.map((_, i) => i), last?.boards[id], draw);
  const [seed, anchorIndex, moderate, hard] = entries[boards.order[boards.index]];
  const deck = {rules, boards: {...last?.boards, [id]: boards}, readings: {...last?.readings, [id]: readings}};
  const parents = level === 'hard' ? decodeTree(hard) : level === 'medium' ? decodeTree(moderate) : caseRoles.map(() => 7);
  if (level === 'easy') {
    const tree = decodeTree(hard);
    const indices = caseRoles.map((_, i) => i);
    const leaves = indices.filter(i => !tree.includes(i));
    const single = pick(leaves.length ? leaves : indices, draw);
    parents[single] = pick(indices.filter(i => i !== single), draw);
  }
  const raw = layoutFor(seed);
  const original = edgesFor(raw, 0);
  const key = symbols[anchorIndex];
  const actualPair = evaluatePattern(id, original, key, false).pair;
  const forbidden = new Set([pairKey(actualPair)]);
  if (previous?.pair) parents.forEach((p, i) => {
    if (p !== 7) forbidden.add(pairKey(evaluatePattern(id, edgesFor(raw, branchMask(parents, i)), key, false).pair));
  });
  const names = assignNames(previous?.pair, forbidden, draw);
  const rename = ({from, to}) => ({from: names.get(from), to: names.get(to)});
  const resolved = raw.map(row => ({
    role: row.role,
    links: row.links.map(rename),
    alias: row.alias?.map(name => names.get(name))
  }));
  const reports = evidenceReports(resolved, parents, level, draw).map(({left, right, op}) => ({
    left: left && displayEdge(left, variant),
    right: displayEdge(right, variant),
    op
  }));
  const rows = resolved.map((row, i) => {
    const disputed = parents[i] !== 7;
    const exchange = disputed && draw() < .5;
    const links = shuffled(row.links, draw).map(link => {
      const arrow = exchange ? alternate(link, row.alias) : link;
      const {from, to} = displayEdge({...arrow, role: row.role}, variant);
      return {from, to};
    });
    return {
      role: displayRole(row.role, variant),
      links,
      disputed,
      ...(disputed && row.alias ? {alias: shuffled(row.alias, draw)} : {})
    };
  });
  const includeShortlist = level === 'very-easy' && options?.shortlist !== false;
  let leads = [];
  if (includeShortlist) {
    const alternatives = raw.map((_, i) => edgesFor(raw, 1 << i));
    const decoys = nearMisses(id, original, key, actualPair, alternatives);
    leads = shuffled([...actualPair, ...decoys].map(name => names.get(name)), draw);
  }
  const anchor = names.get(key);
  const roster = shuffled(networkRoster, draw);
  rows.sort((a, b) => caseRoles.indexOf(a.role) - caseRoles.indexOf(b.role));
  const title = brief.title;
  const order = brief.order.replaceAll('{name}', anchor);
  const hint = brief.hint.replaceAll('{name}', anchor);
  const evidence = {level, roster, family: id, variant, title, order, hint, anchor, rows, reports, leads};
  const answer = solveCaseEvidence(evidence);
  if (answer.pair.length !== 2) throw new Error('Inconsistent case ' + id + '/' + seed);
  return {number: (previous?.number || 0) + 1, level, roster, evidence, deck, ...answer};
}
