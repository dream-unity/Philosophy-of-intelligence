import {alternateLinks, edgesFor, roleNames, shuffled} from './case-layout.js';

const pick = (array, draw) => array[Math.floor(draw() * array.length)];
export const pairKey = pair => pair.slice().sort().join('|');

export const matches = (a, b) => a.role === b.role && a.from === b.from && a.to === b.to;
export const truth = (edges, claim) => edges.some(edge => matches(edge, claim));

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
    case 'nand': return !(left && right);
    default: throw new RangeError('Unknown report operator ' + report.op);
  }
}

export function distinguishingClaims(row) {
  const actual = row.links.map(link => ({role: row.role, ...link}));
  const other = alternateLinks(row).map(link => ({role: row.role, ...link}));
  return {
    trueList: actual.filter(edge => !truth(other, edge)),
    falseList: other.filter(edge => !truth(actual, edge))
  };
}

// Evaluate a report's truth on bitmask `mask` in O(1) without reconstructing edges.
// A claim has {rowIndex, expectTrue}; when expectTrue is true, claim holds iff bit rowIndex is 0.
function clauseHoldsOnMask(clause, mask) {
  const rBit = (mask >> clause.rIdx) & 1;
  const rVal = clause.rTrue ? (rBit === 0) : (rBit === 1);
  if (clause.lIdx === null) return clause.op === 'verified' ? rVal : !rVal;
  const lBit = (mask >> clause.lIdx) & 1;
  const lVal = clause.lTrue ? (lBit === 0) : (lBit === 1);
  switch (clause.op) {
    case 'eq': return lVal === rVal;
    case 'neq': return lVal !== rVal;
    case 'imp': return !lVal || rVal;
    case 'or': return lVal || rVal;
    case 'nand': return !(lVal && rVal);
    default: return false;
  }
}

// Verify exact world uniqueness (mask 0 only) AND strict pair-level minimality:
// dropping ANY single clause must admit an alternate valid world yielding a different legal 2-name pair.
export function verifyClausesPairMinimal(clauses, fixedMask, worldPairs, correctKey, forbiddenKey = null) {
  let validCount = 0;
  for (let mask = 0; mask < 64; mask++) {
    if (mask & fixedMask) continue;
    let ok = true;
    for (let i = 0; i < clauses.length; i++) {
      if (!clauseHoldsOnMask(clauses[i], mask)) { ok = false; break; }
    }
    if (ok) {
      validCount++;
      if (mask !== 0 || validCount > 1) return false;
    }
  }
  if (validCount !== 1) return false;

  // Check strict pair-level minimality for every single clause.
  for (let drop = 0; drop < clauses.length; drop++) {
    let hasRivalPair = false;
    for (let mask = 1; mask < 64; mask++) {
      if (mask & fixedMask) continue;
      let ok = true;
      for (let i = 0; i < clauses.length; i++) {
        if (i === drop) continue;
        if (!clauseHoldsOnMask(clauses[i], mask)) { ok = false; break; }
      }
      if (!ok) continue;
      const altPair = worldPairs[mask];
      if (!altPair || altPair.length !== 2) continue;
      const altKey = pairKey(altPair);
      if (altKey !== correctKey && altKey !== forbiddenKey) {
        hasRivalPair = true;
        break;
      }
    }
    if (!hasRivalPair) return false;
  }
  return true;
}

// Materialize abstract clauses into concrete {left, right, op} reports.
function materialize(clauses, rows, draw) {
  const pool = rows.map(distinguishingClaims);
  function claimFor(idx, wantTrue) {
    const list = wantTrue ? pool[idx].trueList : pool[idx].falseList;
    return pick(list, draw);
  }
  return shuffled(clauses.map(c => ({
    left: c.lIdx === null ? null : claimFor(c.lIdx, c.lTrue),
    right: claimFor(c.rIdx, c.rTrue),
    op: c.op
  })), draw);
}

// Build a single propagation clause from a known row `src` to an unknown row `dst`.
// Deliberately uses ALL 5 connectives across balanced truth-table states:
//   imp: (T,T) Modus Ponens OR (F,F) Modus Tollens
//   or: (F,T) or (T,F) Disjunctive Syllogism
//   nand: (T,F) or (F,T) Mutual Exclusion
//   eq: (T,T) or (F,F)
//   neq: (T,F) or (F,T)
function makePropagationClause(src, dst, draw, weights = [0.22, 0.22, 0.22, 0.17, 0.17]) {
  const r = draw();
  const [wImp, wOr, wNand, wEq] = weights;
  if (r < wImp) {
    // 50% Modus Ponens (T => T), 50% Modus Tollens (F => F)
    return draw() < 0.5
      ? {lIdx: src, lTrue: true, rIdx: dst, rTrue: true, op: 'imp'}
      : {lIdx: dst, lTrue: false, rIdx: src, rTrue: false, op: 'imp'};
  }
  if (r < wImp + wOr) {
    // Disjunctive Syllogism: src(F) or dst(T), randomized side
    return draw() < 0.5
      ? {lIdx: src, lTrue: false, rIdx: dst, rTrue: true, op: 'or'}
      : {lIdx: dst, lTrue: true, rIdx: src, rTrue: false, op: 'or'};
  }
  if (r < wImp + wOr + wNand) {
    // Mutual Exclusion: not both src(T) and dst(F), randomized side
    return draw() < 0.5
      ? {lIdx: src, lTrue: true, rIdx: dst, rTrue: false, op: 'nand'}
      : {lIdx: dst, lTrue: false, rIdx: src, rTrue: true, op: 'nand'};
  }
  if (r < wImp + wOr + wNand + wEq) {
    const val = draw() < 0.5;
    return draw() < 0.5
      ? {lIdx: src, lTrue: val, rIdx: dst, rTrue: val, op: 'eq'}
      : {lIdx: dst, lTrue: val, rIdx: src, rTrue: val, op: 'eq'};
  }
  const val = draw() < 0.5;
  return draw() < 0.5
    ? {lIdx: src, lTrue: val, rIdx: dst, rTrue: !val, op: 'neq'}
    : {lIdx: dst, lTrue: !val, rIdx: src, rTrue: val, op: 'neq'};
}

// Build an irreducible coupled 2-SAT cluster on `nodes` (length >= 3) with ZERO standalone Verified clues,
// deliberately rotating across 5 distinct truth-table-balanced topologies so NO operator leaks its operands.
function buildCoupledCluster(nodes, draw, styleIndex) {
  const order = shuffled(nodes, draw);
  const k = order.length;
  const clauses = [];

  if (styleIndex === 0 && k >= 3) {
    // Disjunctive Contradiction Cycle -> (T, F, F) on (a, b, c)
    // a or c (T,F)/(F,T), c => b (F,F), b => a (F,T), not both(a, b) (T,F)/(F,T)
    // Check: a=F => c=T => b=T => a=T (contradiction!), so a=T; then not both(a,b) => b=F; then c=>b => c=F!
    const [a, b, c] = order;
    clauses.push(draw() < 0.5
      ? {lIdx: a, lTrue: true, rIdx: c, rTrue: false, op: 'or'}
      : {lIdx: c, lTrue: false, rIdx: a, rTrue: true, op: 'or'});
    clauses.push({lIdx: c, lTrue: false, rIdx: b, rTrue: false, op: 'imp'});
    clauses.push({lIdx: b, lTrue: false, rIdx: a, rTrue: true, op: 'imp'});
    clauses.push(draw() < 0.5
      ? {lIdx: a, lTrue: true, rIdx: b, rTrue: false, op: 'nand'}
      : {lIdx: b, lTrue: false, rIdx: a, rTrue: true, op: 'nand'});
    const known = [a, b, c];
    for (let i = 3; i < k; i++) {
      clauses.push(makePropagationClause(pick(known, draw), order[i], draw));
      known.push(order[i]);
    }
    return clauses;
  }

  if (styleIndex === 1 && k >= 3) {
    // Mutual-Exclusion Contradiction Cycle -> (F, T, T) on (a, b, c)
    // not both(a, c) (F,T)/(T,F), a => b (F,T), b => c (T,T), a or b (F,T)/(T,F)
    // Check: a=T => b=T => c=T => contradicts not both(a,c), so a=F; then a or b => b=T; then b=>c => c=T!
    const [a, b, c] = order;
    clauses.push(draw() < 0.5
      ? {lIdx: a, lTrue: false, rIdx: c, rTrue: true, op: 'nand'}
      : {lIdx: c, lTrue: true, rIdx: a, rTrue: false, op: 'nand'});
    clauses.push({lIdx: a, lTrue: false, rIdx: b, rTrue: true, op: 'imp'});
    clauses.push({lIdx: b, lTrue: true, rIdx: c, rTrue: true, op: 'imp'});
    clauses.push(draw() < 0.5
      ? {lIdx: a, lTrue: false, rIdx: b, rTrue: true, op: 'or'}
      : {lIdx: b, lTrue: true, rIdx: a, rTrue: false, op: 'or'});
    const known = [a, b, c];
    for (let i = 3; i < k; i++) {
      clauses.push(makePropagationClause(pick(known, draw), order[i], draw));
      known.push(order[i]);
    }
    return clauses;
  }

  if (styleIndex === 2 && k >= 3) {
    // Pure Modus-Ponens / Disjunction Cycle -> (T, T, T) on (a, b, c)
    // a or c (T,T), c => b (T,T), b => a (T,T), a => c (T,T)
    // Check: a=F => c=T => b=T => a=T (contradiction!), so a=T; a=>c => c=T; c=>b => b=T!
    const [a, b, c] = order;
    clauses.push(draw() < 0.5
      ? {lIdx: a, lTrue: true, rIdx: c, rTrue: true, op: 'or'}
      : {lIdx: c, lTrue: true, rIdx: a, rTrue: true, op: 'or'});
    clauses.push({lIdx: c, lTrue: true, rIdx: b, rTrue: true, op: 'imp'});
    clauses.push({lIdx: b, lTrue: true, rIdx: a, rTrue: true, op: 'imp'});
    clauses.push({lIdx: a, lTrue: true, rIdx: c, rTrue: true, op: 'imp'});
    const known = [a, b, c];
    for (let i = 3; i < k; i++) {
      clauses.push(makePropagationClause(pick(known, draw), order[i], draw));
      known.push(order[i]);
    }
    return clauses;
  }

  if (styleIndex === 3 && k >= 3) {
    // Pure Modus-Tollens / Exclusion Cycle -> (F, F, F) on (a, b, c)
    // not both(a, c) (F,F), a => b (F,F), b => c (F,F), c => a (F,F)
    // Check: a=T => b=T => c=T => contradicts not both(a,c), so a=F; c=>a => c=F; b=>c => b=F!
    const [a, b, c] = order;
    clauses.push(draw() < 0.5
      ? {lIdx: a, lTrue: false, rIdx: c, rTrue: false, op: 'nand'}
      : {lIdx: c, lTrue: false, rIdx: a, rTrue: false, op: 'nand'});
    clauses.push({lIdx: a, lTrue: false, rIdx: b, rTrue: false, op: 'imp'});
    clauses.push({lIdx: b, lTrue: false, rIdx: c, rTrue: false, op: 'imp'});
    clauses.push({lIdx: c, lTrue: false, rIdx: a, rTrue: false, op: 'imp'});
    const known = [a, b, c];
    for (let i = 3; i < k; i++) {
      clauses.push(makePropagationClause(pick(known, draw), order[i], draw));
      known.push(order[i]);
    }
    return clauses;
  }

  // Style 4: Equivalence/Opposition tree closed by a balanced lock (or / nand / imp)
  // Connects a spanning tree of = and !=, leaving exact pair {W0, ~W0}, then eliminates ~W0.
  const vals = order.map(() => draw() < 0.5);
  for (let i = 1; i < k; i++) {
    const parentPos = Math.floor(draw() * i);
    const same = vals[parentPos] === vals[i];
    const [u, uV, v, vV] = draw() < 0.5
      ? [order[parentPos], vals[parentPos], order[i], vals[i]]
      : [order[i], vals[i], order[parentPos], vals[parentPos]];
    clauses.push({lIdx: u, lTrue: uV, rIdx: v, rTrue: vV, op: same ? 'eq' : 'neq'});
  }
  const u = order[0];
  const v = order[k - 1];
  const lockRoll = draw();
  if (lockRoll < 0.34) {
    clauses.push({lIdx: u, lTrue: false, rIdx: v, rTrue: true, op: 'imp'});
  } else if (lockRoll < 0.67) {
    clauses.push(draw() < 0.5
      ? {lIdx: u, lTrue: true, rIdx: v, rTrue: true, op: 'or'}
      : {lIdx: v, lTrue: true, rIdx: u, rTrue: true, op: 'or'});
  } else {
    clauses.push(draw() < 0.5
      ? {lIdx: u, lTrue: false, rIdx: v, rTrue: false, op: 'nand'}
      : {lIdx: v, lTrue: false, rIdx: u, rTrue: false, op: 'nand'});
  }
  return clauses;
}

// Build guaranteed-minimal, truth-table-balanced cross-checks for Easy (1 disputed),
// Moderate (3 disputed), or Hard (6 disputed). Returns materialized reports or null if none fit.
export function buildCrossChecks(rows, disputedIndices, worldPairs, correctKey, forbiddenKey, level, draw) {
  if (!disputedIndices.length) return [];
  const fixedMask = rows.reduce((m, _, i) => disputedIndices.includes(i) ? m : m | (1 << i), 0);

  if (level === 'easy' && disputedIndices.length === 1) {
    const target = disputedIndices[0];
    const confirmed = rows.map((_, i) => i).filter(i => i !== target);
    const src = pick(confirmed, draw);
    const clause = makePropagationClause(src, target, draw, [0.22, 0.20, 0.20, 0.19, 0.19]);
    if (!verifyClausesPairMinimal([clause], fixedMask, worldPairs, correctKey, forbiddenKey)) return null;
    return materialize([clause], rows, draw);
  }

  if (level === 'medium' || level === 'moderate') {
    // 3 disputed rows: rotate across all 5 coupled 2-SAT styles (ZERO standalone Verified handouts!)
    const styles = shuffled([0, 1, 2, 3, 4], draw);
    for (const style of styles) {
      for (let attempt = 0; attempt < 30; attempt++) {
        const clauses = buildCoupledCluster(disputedIndices, draw, style);
        if (verifyClausesPairMinimal(clauses, fixedMask, worldPairs, correctKey, forbiddenKey)) {
          return materialize(clauses, rows, draw);
        }
      }
    }
    return null;
  }

  if (level === 'hard') {
    // 6 disputed rows: rotate across:
    //   - Single 6-row coupled 2-SAT cluster (styles 0, 1, 2, 3, 4)
    //   - Split into TWO coupled 3-row 2-SAT clusters (mixed styles!)
    const plans = shuffled([
      {split: false, style: 0},
      {split: false, style: 1},
      {split: false, style: 2},
      {split: false, style: 3},
      {split: false, style: 4},
      {split: true, styleA: 0, styleB: 4},
      {split: true, styleA: 1, styleB: 4},
      {split: true, styleA: 2, styleB: 4},
      {split: true, styleA: 3, styleB: 4}
    ], draw);

    for (const plan of plans) {
      for (let attempt = 0; attempt < 24; attempt++) {
        let clauses;
        if (plan.split) {
          const perm = shuffled(disputedIndices, draw);
          clauses = [
            ...buildCoupledCluster(perm.slice(0, 3), draw, plan.styleA),
            ...buildCoupledCluster(perm.slice(3, 6), draw, plan.styleB)
          ];
        } else {
          clauses = buildCoupledCluster(disputedIndices, draw, plan.style);
        }
        if (verifyClausesPairMinimal(clauses, fixedMask, worldPairs, correctKey, forbiddenKey)) {
          return materialize(clauses, rows, draw);
        }
      }
    }
    return null;
  }

  return null;
}

function describeRow(rows, mask, role) {
  const i = rows.findIndex(row => row.role === role);
  if (!(mask & (1 << i))) return roleNames[role] + ' reads as printed';
  if (rows[i].alias) return roleNames[role] + ' swaps ' + rows[i].alias.join(' and ');
  if (rows[i].alt) return roleNames[role] + ' uses ' + rows[i].alt.link.from + ' → ' + rows[i].alt.link.to;
  return roleNames[role] + ' reverses';
}

export function explainRows(rows, reports, mask) {
  if (!reports.length) return [];
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
    if (r.op === 'imp') return (lKnown && lVal) || (rKnown && !rVal);
    if (r.op === 'or') return (lKnown && !lVal) || (rKnown && !rVal);
    if (r.op === 'nand') return (lKnown && lVal) || (rKnown && rVal);
    return false;
  }

  let guard = 0;
  while (pending.length && guard++ < 20) {
    const i = pending.findIndex(canForceFromKnown);
    if (i >= 0) {
      const [r] = pending.splice(i, 1);
      const parent = r.left && (known.has(r.left.role) ? r.left.role : r.right.role);
      const child = !r.left || parent === r.left.role ? r.right.role : r.left.role;
      const opTag = r.op === 'imp' ? ' (if–then)' : r.op === 'or' ? ' (or)' : r.op === 'nand' ? ' (not both)' : '';
      const lead = parent ? 'From ' + roleNames[parent] + opTag : r.op === 'verified' ? 'Verified' : 'Ruled out';
      steps.push(lead + ' → ' + describeRow(rows, mask, child) + '.');
      known.add(child);
      continue;
    }

    // Coupled 2-SAT cycle among unknown rows: pick a seed role whose opposite leads to contradiction.
    const unknownRoles = rows.filter(row => row.disputed && !known.has(row.role)).map(row => row.role);
    if (!unknownRoles.length) break;

    // Group connected component of remaining pending clauses
    const seedRole = unknownRoles[0];
    const cluster = new Set([seedRole]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const c of pending) {
        if (!c.left) continue;
        if (cluster.has(c.left.role) && !known.has(c.right.role) && !cluster.has(c.right.role)) {
          cluster.add(c.right.role);
          grew = true;
        } else if (cluster.has(c.right.role) && !known.has(c.left.role) && !cluster.has(c.left.role)) {
          cluster.add(c.left.role);
          grew = true;
        }
      }
    }

    const members = [...cluster];
    steps.push(
      'Coupled cross-checks (' + members.map(r => roleNames[r]).join(', ') +
      ') eliminate every rival reading → ' +
      members.map(r => describeRow(rows, mask, r)).join('; ') + '.'
    );
    for (const r of members) known.add(r);
    for (let j = pending.length - 1; j >= 0; j--) {
      const c = pending[j];
      if ((!c.left || known.has(c.left.role)) && known.has(c.right.role)) pending.splice(j, 1);
    }
  }
  return steps;
}

export function solveCaseEvidence(evidence, evaluateFamily) {
  const {rows, reports, family, anchor} = evidence;
  const fixed = rows.reduce((mask, row, i) => row.disputed ? mask : mask | (1 << i), 0);
  let solution = null;
  let validWorlds = 0;
  let solvedMask = -1;
  for (let mask = 0; mask < (1 << rows.length); mask++) {
    if (mask & fixed) continue;
    const edges = edgesFor(rows, mask);
    if (!reports.every(report => reportHolds(edges, report))) continue;
    const participants = new Set(edges.flatMap(edge => [edge.from, edge.to]));
    if (evidence.roster?.some(name => !participants.has(name))) continue;
    validWorlds++;
    const answer = evaluateFamily(family, edges, anchor, true);
    if (answer.pair.length !== 2) continue;
    if (solution && pairKey(solution.pair) !== pairKey(answer.pair)) {
      return {pair: [], proof: [], validWorlds, solvedMask: -1};
    }
    if (!solution) {
      solvedMask = mask;
      solution = {...answer, proof: [...answer.proof, ...explainRows(rows, reports, mask)]};
    }
  }
  return solution ? {...solution, validWorlds, solvedMask} : {pair: [], proof: [], validWorlds, solvedMask: -1};
}
