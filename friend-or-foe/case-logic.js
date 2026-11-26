import {alternateLinks, edgesFor, roleNames, roleVerbs, shuffled} from './case-layout.js';

const pick = (array, draw) => array[Math.floor(draw() * array.length)];
export const pairKey = pair => pair.slice().sort().join('|');
export const targetKey = pairKey;

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

// Verify exact world uniqueness (mask 0 only) AND strict target-ID minimality:
// dropping ANY single clause must admit an alternate valid world yielding a DIFFERENT
// legal target set of the EXACT SAME SIZE (so even knowing the bullet count on the HUD
// and excluding the previous trial's target set NEVER lets a player skip any cross-check!).
export function verifyClausesTargetMinimal(clauses, fixedMask, worldTargets, correctKey, targetSize, forbiddenKey = null) {
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

  for (let drop = 0; drop < clauses.length; drop++) {
    let hasRival = false;
    for (let mask = 1; mask < 64; mask++) {
      if (mask & fixedMask) continue;
      let ok = true;
      for (let i = 0; i < clauses.length; i++) {
        if (i === drop) continue;
        if (!clauseHoldsOnMask(clauses[i], mask)) { ok = false; break; }
      }
      if (!ok) continue;
      const alt = worldTargets[mask];
      if (!alt || alt.length !== targetSize) continue;
      const altKey = targetKey(alt);
      if (altKey !== correctKey && altKey !== forbiddenKey) {
        hasRival = true;
        break;
      }
    }
    if (!hasRival) return false;
  }
  return true;
}

// Backward-compatible alias
export function verifyClausesPairMinimal(clauses, fixedMask, worldPairs, correctKey, forbiddenKey = null) {
  const targetSize = correctKey ? correctKey.split('|').length : 2;
  return verifyClausesTargetMinimal(clauses, fixedMask, worldPairs, correctKey, targetSize, forbiddenKey);
}

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

// Symmetric = or != link (0 bits of syntax leak on its own — both truth states 50/50).
function makeSymmetricClause(u, uVal, v, vVal, draw) {
  const op = uVal === vVal ? 'eq' : 'neq';
  return draw() < 0.5
    ? {lIdx: u, lTrue: uVal, rIdx: v, rTrue: vVal, op}
    : {lIdx: v, lTrue: vVal, rIdx: u, rTrue: uVal, op};
}

// Build a single connected N-node irreducible coupled 2-SAT cycle (N = 3 or N = 6)
// with ZERO Style-4 single-closing-connective trees and ZERO disconnected clusters!
//
// Generalized (p, q) coupled cycle on N nodes (p true, q false):
//   - Mixed (p >= 1, q >= 1): N + 1 clauses mixing `or`, `nand`, `imp` (and optionally 1-2 `=`/`!=`
//     on N=6 while preserving >= 4 non-symmetric connectives!).
//   - Dualized mixed: flips every truth value and swaps `or` <-> `nand`.
//   - Pure-True (p = N, q = 0): `or (T,T)` + directed `imp` ring (plus optional 1 `=`/`!=` on N=6).
//   - Pure-False (p = 0, q = N): `nand (F,F)` + directed `imp` ring (plus optional 1 `=`/`!=` on N=6).
function buildConnectedCycle(nodes, draw, variant) {
  const order = shuffled(nodes, draw);
  const n = order.length;
  const clauses = [];

  if (variant.kind === 'all-true') {
    // v[0] or v[n-1] (T,T), plus directed ring v[n-1]=>v[n-2]=>...=>v[0], and v[0]=>v[n-1]
    clauses.push(draw() < 0.5
      ? {lIdx: order[0], lTrue: true, rIdx: order[n - 1], rTrue: true, op: 'or'}
      : {lIdx: order[n - 1], lTrue: true, rIdx: order[0], rTrue: true, op: 'or'});
    const symSlot = n >= 6 && draw() < 0.55 ? 1 + Math.floor(draw() * (n - 2)) : -1;
    for (let i = n - 1; i >= 1; i--) {
      if (i === symSlot) {
        clauses.push(makeSymmetricClause(order[i], draw() < 0.5, order[i - 1], draw() < 0.5, draw));
      } else {
        clauses.push({lIdx: order[i], lTrue: true, rIdx: order[i - 1], rTrue: true, op: 'imp'});
      }
    }
    clauses.push({lIdx: order[0], lTrue: true, rIdx: order[n - 1], rTrue: true, op: 'imp'});
    return clauses;
  }

  if (variant.kind === 'all-false') {
    // not both(v[0], v[n-1]) (F,F), plus directed ring v[0]=>v[1]=>...=>v[n-1]=>v[0]
    clauses.push(draw() < 0.5
      ? {lIdx: order[0], lTrue: false, rIdx: order[n - 1], rTrue: false, op: 'nand'}
      : {lIdx: order[n - 1], lTrue: false, rIdx: order[0], rTrue: false, op: 'nand'});
    const symSlot = n >= 6 && draw() < 0.55 ? Math.floor(draw() * (n - 1)) : -1;
    for (let i = 0; i < n - 1; i++) {
      if (i === symSlot) {
        clauses.push(makeSymmetricClause(order[i], draw() < 0.5, order[i + 1], draw() < 0.5, draw));
      } else {
        clauses.push({lIdx: order[i], lTrue: false, rIdx: order[i + 1], rTrue: false, op: 'imp'});
      }
    }
    clauses.push({lIdx: order[n - 1], lTrue: false, rIdx: order[0], rTrue: false, op: 'imp'});
    return clauses;
  }

  // Mixed (p, q) cycle with p >= 1, q >= 1, p + q = n
  const p = variant.p;
  const q = n - p;
  const V = order.slice(0, p);
  const U = order.slice(p);
  const dual = Boolean(variant.dual);

  // Choose at most 1–2 edges on N=6 to turn into symmetric `=` / `!=` (never dropping non-sym below 4!)
  const symCandidates = [];
  if (n >= 6) {
    for (let i = 0; i < p - 1; i++) symCandidates.push({group: 'V', i});
    for (let i = 0; i < q - 1; i++) symCandidates.push({group: 'U', i});
  }
  const chosenSym = new Set();
  if (symCandidates.length && draw() < 0.72) {
    const picked = shuffled(symCandidates, draw).slice(0, draw() < 0.45 && symCandidates.length >= 2 ? 2 : 1);
    for (const c of picked) chosenSym.add(c.group + ':' + c.i);
  }

  if (!dual) {
    // V[0..p-1] = True, U[0..q-1] = False
    // Contradiction loop: V[0] or U[q-1] (T,F), U[q-1]=>...=>U[0] (F,F), U[0]=>V[0] (F,T)
    // Forward chain: V[0]=>...=>V[p-1] (T,T), not both(V[p-1], U[0]) (T,F)
    clauses.push(draw() < 0.5
      ? {lIdx: V[0], lTrue: true, rIdx: U[q - 1], rTrue: false, op: 'or'}
      : {lIdx: U[q - 1], lTrue: false, rIdx: V[0], rTrue: true, op: 'or'});
    for (let i = q - 1; i >= 1; i--) {
      if (chosenSym.has('U:' + (i - 1))) {
        const aVal = draw() < 0.5;
        const bVal = draw() < 0.5;
        clauses.push(makeSymmetricClause(U[i], aVal, U[i - 1], bVal, draw));
      } else {
        clauses.push({lIdx: U[i], lTrue: false, rIdx: U[i - 1], rTrue: false, op: 'imp'});
      }
    }
    clauses.push({lIdx: U[0], lTrue: false, rIdx: V[0], rTrue: true, op: 'imp'});
    for (let i = 0; i < p - 1; i++) {
      if (chosenSym.has('V:' + i)) {
        const aVal = draw() < 0.5;
        const bVal = draw() < 0.5;
        clauses.push(makeSymmetricClause(V[i], aVal, V[i + 1], bVal, draw));
      } else {
        clauses.push({lIdx: V[i], lTrue: true, rIdx: V[i + 1], rTrue: true, op: 'imp'});
      }
    }
    clauses.push(draw() < 0.5
      ? {lIdx: V[p - 1], lTrue: true, rIdx: U[0], rTrue: false, op: 'nand'}
      : {lIdx: U[0], lTrue: false, rIdx: V[p - 1], rTrue: true, op: 'nand'});
  } else {
    // Dual: V[0..p-1] = False, U[0..q-1] = True
    // Contradiction loop: not both(V[0], U[q-1]) (F,T), U[0]=>...=>U[q-1] (T,T), V[0]=>U[0] (F,T)
    // Forward chain: V[p-1]=>...=>V[0] (F,F), V[p-1] or U[0] (F,T)
    clauses.push(draw() < 0.5
      ? {lIdx: V[0], lTrue: false, rIdx: U[q - 1], rTrue: true, op: 'nand'}
      : {lIdx: U[q - 1], lTrue: true, rIdx: V[0], rTrue: false, op: 'nand'});
    for (let i = 0; i < q - 1; i++) {
      if (chosenSym.has('U:' + i)) {
        const aVal = draw() < 0.5;
        const bVal = draw() < 0.5;
        clauses.push(makeSymmetricClause(U[i], aVal, U[i + 1], bVal, draw));
      } else {
        clauses.push({lIdx: U[i], lTrue: true, rIdx: U[i + 1], rTrue: true, op: 'imp'});
      }
    }
    clauses.push({lIdx: V[0], lTrue: false, rIdx: U[0], rTrue: true, op: 'imp'});
    for (let i = p - 1; i >= 1; i--) {
      if (chosenSym.has('V:' + (i - 1))) {
        const aVal = draw() < 0.5;
        const bVal = draw() < 0.5;
        clauses.push(makeSymmetricClause(V[i], aVal, V[i - 1], bVal, draw));
      } else {
        clauses.push({lIdx: V[i], lTrue: false, rIdx: V[i - 1], rTrue: false, op: 'imp'});
      }
    }
    clauses.push(draw() < 0.5
      ? {lIdx: V[p - 1], lTrue: false, rIdx: U[0], rTrue: true, op: 'or'}
      : {lIdx: U[0], lTrue: true, rIdx: V[p - 1], rTrue: false, op: 'or'});
  }
  return clauses;
}

// Confirmed-anchored symmetric chain for Moderate (1 confirmed row + 3 disputed rows via = / !=):
// 0.0% syntax leak — player MUST inspect the confirmed file and trace all 3 links.
function buildAnchoredSymmetricChain(confirmedIdx, disputedIndices, draw) {
  const order = shuffled(disputedIndices, draw);
  const chain = [confirmedIdx, ...order];
  const clauses = [];
  for (let i = 0; i < order.length; i++) {
    const u = chain[i];
    const v = chain[i + 1];
    const uVal = draw() < 0.5;
    const vVal = draw() < 0.5;
    clauses.push(makeSymmetricClause(u, uVal, v, vVal, draw));
  }
  return clauses;
}

// Build leak-free, strictly target-minimal cross-checks for Easy (1 disputed),
// Moderate (3 disputed), or Hard (6 disputed — ALWAYS 1 connected 6-row cycle!).
export function buildCrossChecks(rows, disputedIndices, worldTargets, correctKey, forbiddenKey, level, draw) {
  if (!disputedIndices.length) return [];
  const targetSize = correctKey.split('|').length;
  const fixedMask = rows.reduce((m, _, i) => disputedIndices.includes(i) ? m : m | (1 << i), 0);

  if (level === 'easy' && disputedIndices.length === 1) {
    // Strictly symmetric = / != linking a confirmed record to the disputed record.
    // 50% = (TT/FF), 50% != (TF/FT), 50% confirmed on left/right -> 0.0% syntax-uniqueness leak!
    const target = disputedIndices[0];
    const confirmed = shuffled(rows.map((_, i) => i).filter(i => i !== target), draw);
    for (const src of confirmed) {
      const srcVal = draw() < 0.5;
      const dstVal = draw() < 0.5;
      const clause = makeSymmetricClause(src, srcVal, target, dstVal, draw);
      if (verifyClausesTargetMinimal([clause], fixedMask, worldTargets, correctKey, targetSize, forbiddenKey)) {
        return materialize([clause], rows, draw);
      }
    }
    return null;
  }

  if (level === 'medium' || level === 'moderate') {
    // 3 disputed records: mix irreducible 3-node coupled 2-SAT cycles (70%) and
    // confirmed-anchored symmetric =/!= chains (30%). ZERO Style-4 trees!
    const confirmed = rows.map((_, i) => i).filter(i => !disputedIndices.includes(i));
    const plans = shuffled([
      {kind: 'mixed', p: 1, dual: false},
      {kind: 'mixed', p: 2, dual: false},
      {kind: 'mixed', p: 1, dual: true},
      {kind: 'mixed', p: 2, dual: true},
      {kind: 'all-true'},
      {kind: 'all-false'},
      {kind: 'anchored'},
      {kind: 'anchored'}
    ], draw);

    for (const plan of plans) {
      for (let attempt = 0; attempt < 24; attempt++) {
        const clauses = plan.kind === 'anchored'
          ? buildAnchoredSymmetricChain(pick(confirmed, draw), disputedIndices, draw)
          : buildConnectedCycle(disputedIndices, draw, plan);
        if (verifyClausesTargetMinimal(clauses, fixedMask, worldTargets, correctKey, targetSize, forbiddenKey)) {
          return materialize(clauses, rows, draw);
        }
      }
    }
    return null;
  }

  if (level === 'hard') {
    // ALL 6 records disputed in ONE single connected 6-node coupled 2-SAT cycle.
    // ZERO split/disconnected clusters! ZERO Style-4 single-closing-connective trees!
    const plans = shuffled([
      {kind: 'mixed', p: 1, dual: false},
      {kind: 'mixed', p: 2, dual: false},
      {kind: 'mixed', p: 3, dual: false},
      {kind: 'mixed', p: 4, dual: false},
      {kind: 'mixed', p: 5, dual: false},
      {kind: 'mixed', p: 1, dual: true},
      {kind: 'mixed', p: 2, dual: true},
      {kind: 'mixed', p: 3, dual: true},
      {kind: 'mixed', p: 4, dual: true},
      {kind: 'mixed', p: 5, dual: true},
      {kind: 'all-true'},
      {kind: 'all-false'}
    ], draw);

    for (const plan of plans) {
      for (let attempt = 0; attempt < 24; attempt++) {
        const clauses = buildConnectedCycle(disputedIndices, draw, plan);
        if (verifyClausesTargetMinimal(clauses, fixedMask, worldTargets, correctKey, targetSize, forbiddenKey)) {
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
  if (!(mask & (1 << i))) return roleNames[role] + ' holds as printed';
  if (rows[i].alias) return roleNames[role] + ' swaps ' + rows[i].alias.join(' and ');
  if (rows[i].alt) return roleNames[role] + ' uses ' + rows[i].alt.link.from + ' ' + roleVerbs[role] + ' ' + rows[i].alt.link.to;
  return roleNames[role] + ' reverses direction';
}

function fmtClaimShort(c) {
  return roleNames[c.role] + ' (' + c.from + ' ' + roleVerbs[c.role] + ' ' + c.to + ')';
}

function fmtReportShort(r) {
  if (!r.left) return (r.op === 'verified' ? 'Verified: ' : 'Ruled out: ') + fmtClaimShort(r.right);
  const sym = {eq: '=', neq: '≠', imp: '⇒', or: 'or', nand: 'not both'}[r.op];
  return fmtClaimShort(r.left) + ' ' + sym + ' ' + fmtClaimShort(r.right);
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

    const unknownRoles = rows.filter(row => row.disputed && !known.has(row.role)).map(row => row.role);
    if (!unknownRoles.length) break;

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

// Identify the closest rival reading (failing only ONE cross-check) for concise post-trial debrief.
export function findDecisiveRival(evidence, solvedMask, correctTargets, evaluateFamily) {
  const {rows, reports, family, anchor} = evidence;
  if (!reports.length) return null;
  const fixed = rows.reduce((mask, row, i) => row.disputed ? mask : mask | (1 << i), 0);
  const correctKey = targetKey(correctTargets);
  const wantSize = correctTargets.length;
  for (let mask = 0; mask < (1 << rows.length); mask++) {
    if (mask === solvedMask || (mask & fixed)) continue;
    const edges = edgesFor(rows, mask);
    let failed = null;
    let failCount = 0;
    for (const r of reports) {
      if (!reportHolds(edges, r)) {
        failed = r;
        failCount++;
        if (failCount > 1) break;
      }
    }
    if (failCount !== 1) continue;
    const participants = new Set(edges.flatMap(e => [e.from, e.to]));
    if (evidence.roster?.some(name => !participants.has(name))) continue;
    const alt = evaluateFamily(family, edges, anchor, false).pair;
    if (alt.length === wantSize && targetKey(alt) !== correctKey) {
      return {
        rivalTargets: alt,
        defeatedBy: fmtReportShort(failed),
        reportIndex: reports.indexOf(failed)
      };
    }
  }
  return null;
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
    if (answer.pair.length < 1 || answer.pair.length > 4) continue;
    if (solution && targetKey(solution.pair) !== targetKey(answer.pair)) {
      return {pair: [], targets: [], proof: [], validWorlds, solvedMask: -1, rivalDebrief: null};
    }
    if (!solution) {
      solvedMask = mask;
      solution = {...answer, proof: [...answer.proof, ...explainRows(rows, reports, mask)]};
    }
  }
  if (!solution) return {pair: [], targets: [], proof: [], validWorlds, solvedMask: -1, rivalDebrief: null};
  const rivalDebrief = findDecisiveRival(evidence, solvedMask, solution.pair, evaluateFamily);
  return {...solution, targets: solution.pair, validWorlds, solvedMask, rivalDebrief};
}
