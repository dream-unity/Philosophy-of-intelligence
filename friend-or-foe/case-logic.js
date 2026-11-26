import {alternateLinks, edgesFor, roleNames, shuffled, verbsForDomain} from './case-layout.js?v=fof20';

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

// Emit an exact 2-literal disjunction (lit(u, polU) OR lit(v, polV)) under display polarity vector `s`:
// Because replacing x_i with y_i = !x_i is an exact Boolean automorphism of 2-SAT, every
// polarity vector preserves unique solvability, strict minimality, and single-component connectivity
// while freely balancing (TT, TF, FT, FF) across `or`, `not both`, and `imp`!
function emitDisjunction(u, polU, v, polV, s, draw) {
  const uVal = s[u];
  const vVal = s[v];
  const cU = polU === uVal;
  const cV = polV === vVal;
  if (cU && cV) {
    return draw() < 0.5
      ? {lIdx: u, lTrue: uVal, rIdx: v, rTrue: vVal, op: 'or'}
      : {lIdx: v, lTrue: vVal, rIdx: u, rTrue: uVal, op: 'or'};
  }
  if (!cU && !cV) {
    return draw() < 0.5
      ? {lIdx: u, lTrue: uVal, rIdx: v, rTrue: vVal, op: 'nand'}
      : {lIdx: v, lTrue: vVal, rIdx: u, rTrue: uVal, op: 'nand'};
  }
  if (!cU && cV) {
    return {lIdx: u, lTrue: uVal, rIdx: v, rTrue: vVal, op: 'imp'};
  }
  return {lIdx: v, lTrue: vVal, rIdx: u, rTrue: uVal, op: 'imp'};
}

// Build a single connected N-node irreducible coupled 2-SAT cycle (N = 3 or N = 6)
// using TWO distinct irreducible topologies (ring-plus-chord AND figure-8), both under
// exact literal polarity substitution so ZERO Style-4 trees and ZERO disconnected clusters
// ever occur while achieving balanced ~33/33/33 operator truth tables on `or`, `not both`, `imp`!
function buildConnectedCycle(nodes, draw, variant) {
  const order = shuffled(nodes, draw);
  const n = order.length;
  const s = new Array(n).fill(true);

  if (variant.kind === 'all-true') {
    s.fill(true);
  } else if (variant.kind === 'all-false') {
    s.fill(false);
  } else if (variant.kind === 'same-ends-T' || variant.kind === 'same-ends-F') {
    const outer = variant.kind === 'same-ends-T';
    s.fill(outer);
    const a = 1 + Math.floor(draw() * (n - 2));
    const b = a + Math.floor(draw() * (n - 1 - a));
    for (let i = a; i <= b; i++) s[i] = !outer;
  } else if (variant.kind === 'fig8-or-exact' || variant.kind === 'fig8-nand-exact') {
    // Figure-8 with s[A[0]]=s[B[0]]=anchorPol and s[A[p-1]]=s[B[q-1]]=!anchorPol:
    // The 3 bridge disjunctions emit EXACTLY {or(TT), or(TF), or(FT)} or {nand(FF), nand(TF), nand(FT)}.
    // Interior nodes match anchorPol so a non-sym interior edge emits imp(TT/FF) rather than diluting or(TT)/nand(FF).
    const anchorPol = variant.kind === 'fig8-or-exact';
    const p = variant.p;
    for (let i = 0; i < n; i++) s[i] = anchorPol;
    if (p >= 2) s[p - 1] = !anchorPol;
    if (n - p >= 2) s[n - 1] = !anchorPol;
  } else if (variant.kind === 'fig8-imp-exact') {
    // Figure-8 with s[A[0]]=head, s[B[0]]=!head, s[A[p-1]]=!head, s[B[q-1]]=head:
    // The 3 bridge disjunctions emit EXACTLY {imp(TT), imp(FT), imp(FF)} — uniform 33/33/33!
    // Alternating interior nodes emit or/nand(TF/FT) when non-sym rather than piling up extra imp(TT/FF).
    const p = variant.p;
    const head = variant.head ?? (draw() < 0.5);
    for (let i = 0; i < p; i++) s[i] = (i % 2 === 0) ? head : !head;
    for (let i = p; i < n; i++) s[i] = ((i - p) % 2 === 0) ? !head : head;
    s[0] = head;
    s[p] = !head;
    if (p >= 2) s[p - 1] = !head;
    if (n - p >= 2) s[n - 1] = head;
  } else if (variant.kind === 'fig8-same-T' || variant.kind === 'fig8-same-F') {
    const anchorPol = variant.kind === 'fig8-same-T';
    const p = variant.p;
    for (let i = 0; i < n; i++) s[i] = anchorPol;
    if (n >= 6) {
      if (draw() < 0.5) {
        if (p >= 2) s[p - 1] = !anchorPol;
      } else if (n - p >= 2) {
        s[n - 1] = !anchorPol;
      }
    }
  } else if (variant.kind === 'fig8-mixed') {
    const p = variant.p;
    const head = variant.head ?? (draw() < 0.5);
    for (let i = 0; i < n; i++) s[i] = draw() < 0.5;
    s[0] = head;
    s[p] = !head;
    if (variant.altInterior && n >= 6) {
      if (p >= 2) s[p - 1] = head;
      if (n - p >= 2) s[n - 1] = !head;
      for (let i = 1; i < p - 1; i++) s[i] = (i % 2 === 1) ? !head : head;
      for (let i = p + 1; i < n - 1; i++) s[i] = ((i - p) % 2 === 1) ? head : !head;
    }
  } else if (variant.kind === 'alt-diff') {
    const head = variant.head ?? (draw() < 0.5);
    for (let i = 0; i < n; i++) s[i] = (i % 2 === 0) ? head : !head;
    s[0] = head;
    s[n - 1] = !head;
    if (n >= 6 && draw() < 0.45) {
      const k = 1 + Math.floor(draw() * (n - 2));
      s[k] = !s[k];
    }
  } else {
    // diff-ends ring: s[0] !== s[n-1] so chord emits imp(F, T)
    const head = variant.head ?? (draw() < 0.5);
    const cut = 1 + Math.floor(draw() * (n - 1));
    for (let i = 0; i < n; i++) s[i] = i < cut ? head : !head;
  }

  const sByNode = {};
  for (let i = 0; i < n; i++) sByNode[order[i]] = s[i];
  const clauses = [];

  if (variant.kind.startsWith('fig8')) {
    const p = variant.p;
    const A = order.slice(0, p);
    const B = order.slice(p);
    const q = B.length;
    const symCand = [];
    if (n >= 6) {
      for (let i = 0; i < p - 1; i++) symCand.push('A:' + i);
      for (let i = 1; i < q; i++) symCand.push('B:' + i);
    }
    const symEdges = new Set();
    if (symCand.length) {
      const cap = variant.maxSym ?? 4;
      const want = Math.min(symCand.length, cap);
      for (const k of shuffled(symCand, draw).slice(0, want)) symEdges.add(k);
    }

    clauses.push(emitDisjunction(A[0], true, B[q - 1], false, sByNode, draw));
    for (let i = q - 1; i >= 1; i--) {
      if (symEdges.has('B:' + i)) {
        clauses.push(makeSymmetricClause(B[i], draw() < 0.5, B[i - 1], draw() < 0.5, draw));
      } else {
        clauses.push(emitDisjunction(B[i], true, B[i - 1], false, sByNode, draw));
      }
    }
    clauses.push(emitDisjunction(B[0], true, A[0], true, sByNode, draw));
    for (let i = 0; i < p - 1; i++) {
      if (symEdges.has('A:' + i)) {
        clauses.push(makeSymmetricClause(A[i], draw() < 0.5, A[i + 1], draw() < 0.5, draw));
      } else {
        clauses.push(emitDisjunction(A[i], false, A[i + 1], true, sByNode, draw));
      }
    }
    clauses.push(emitDisjunction(A[p - 1], false, B[0], true, sByNode, draw));
    return clauses;
  }

  // Ring-plus-chord: (x_0 OR x_{n-1}) + directed ring x_{n-1} => ... => x_0 => x_{n-1}
  const symSlots = new Set();
  if (n >= 6) {
    const interior = [];
    for (let i = 1; i <= n - 2; i++) interior.push(i);
    const cap = variant.maxSym ?? 3;
    const want = Math.min(interior.length, cap);
    for (const slot of shuffled(interior, draw).slice(0, want)) symSlots.add(slot);
  }
  clauses.push(emitDisjunction(order[0], true, order[n - 1], true, sByNode, draw));
  for (let i = n - 1; i >= 1; i--) {
    if (symSlots.has(i)) {
      clauses.push(makeSymmetricClause(order[i], draw() < 0.5, order[i - 1], draw() < 0.5, draw));
    } else {
      clauses.push(emitDisjunction(order[i], false, order[i - 1], true, sByNode, draw));
    }
  }
  clauses.push(emitDisjunction(order[0], false, order[n - 1], true, sByNode, draw));
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
    // 3 disputed records: balanced polarity-substituted 3-node coupled 2-SAT cycles (~75%) +
    // confirmed-anchored symmetric =/!= chains (~25%). ZERO Style-4 trees!
    const confirmed = rows.map((_, i) => i).filter(i => !disputedIndices.includes(i));
    const plans = shuffled([
      {kind: 'same-ends-T'},
      {kind: 'same-ends-F'},
      {kind: 'same-ends-T'},
      {kind: 'same-ends-F'},
      {kind: 'same-ends-T'},
      {kind: 'same-ends-F'},
      {kind: 'fig8-same-T', p: 1},
      {kind: 'fig8-same-F', p: 2},
      {kind: 'fig8-same-T', p: 2},
      {kind: 'fig8-same-F', p: 1},
      {kind: 'fig8-mixed', p: 1, head: true},
      {kind: 'fig8-mixed', p: 2, head: false},
      {kind: 'fig8-mixed', p: 1, head: false},
      {kind: 'fig8-mixed', p: 2, head: true},
      {kind: 'diff-ends', head: true},
      {kind: 'diff-ends', head: false},
      {kind: 'diff-ends', head: true},
      {kind: 'diff-ends', head: false},
      {kind: 'anchored'},
      {kind: 'anchored'},
      {kind: 'anchored'},
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
    // ALL 6 records disputed in ONE single connected 6-node coupled 2-SAT cycle
    // with >=4 non-symmetric coupled clauses (maxSym <= 3) and balanced exact Figure-8 polarities
    // so ALL 5 operators (=, !=, =>, or, not both) stay near-uniform with near-50/50 LHS/RHS!
    const plans = shuffled([
      {kind: 'fig8-or-exact', p: 2},
      {kind: 'fig8-or-exact', p: 3},
      {kind: 'fig8-or-exact', p: 4},
      {kind: 'fig8-or-exact', p: 3},
      {kind: 'fig8-nand-exact', p: 2},
      {kind: 'fig8-nand-exact', p: 3},
      {kind: 'fig8-nand-exact', p: 4},
      {kind: 'fig8-nand-exact', p: 3},
      {kind: 'fig8-imp-exact', p: 2, head: true},
      {kind: 'fig8-imp-exact', p: 3, head: false},
      {kind: 'fig8-imp-exact', p: 4, head: true},
      {kind: 'fig8-imp-exact', p: 2, head: false},
      {kind: 'fig8-imp-exact', p: 3, head: true},
      {kind: 'fig8-imp-exact', p: 4, head: false},
      {kind: 'fig8-imp-exact', p: 3, head: true},
      {kind: 'fig8-imp-exact', p: 3, head: false},
      {kind: 'same-ends-T'},
      {kind: 'same-ends-F'},
      {kind: 'diff-ends', head: true},
      {kind: 'diff-ends', head: false}
    ], draw);

    for (const sym of [3, 2, 0]) {
      const tries = sym === 3 ? 16 : 12;
      for (const plan of plans) {
        for (let attempt = 0; attempt < tries; attempt++) {
          const clauses = buildConnectedCycle(disputedIndices, draw, {...plan, maxSym: sym});
          if (verifyClausesTargetMinimal(clauses, fixedMask, worldTargets, correctKey, targetSize, forbiddenKey)) {
            return materialize(clauses, rows, draw);
          }
        }
      }
    }
    return null;
  }

  return null;
}

function describeRow(rows, mask, role, verbs) {
  const i = rows.findIndex(row => row.role === role);
  if (!(mask & (1 << i))) return roleNames[role] + ' holds as printed';
  if (rows[i].alias) return roleNames[role] + ' swaps ' + rows[i].alias.join(' and ');
  if (rows[i].alt) return roleNames[role] + ' uses ' + rows[i].alt.link.from + ' ' + verbs[role] + ' ' + rows[i].alt.link.to;
  return roleNames[role] + ' reverses direction';
}

function fmtClaimShort(c, verbs) {
  return roleNames[c.role] + ' (' + c.from + ' ' + verbs[c.role] + ' ' + c.to + ')';
}

function fmtReportShort(r, verbs) {
  if (!r.left) return (r.op === 'verified' ? 'Verified: ' : 'Ruled out: ') + fmtClaimShort(r.right, verbs);
  const sym = {eq: '=', neq: '≠', imp: '⇒', or: 'or', nand: 'not both'}[r.op];
  return fmtClaimShort(r.left, verbs) + ' ' + sym + ' ' + fmtClaimShort(r.right, verbs);
}

export function explainRows(rows, reports, mask, domain = null) {
  if (!reports.length) return [];
  const verbs = verbsForDomain(domain);
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
      steps.push(lead + ' → ' + describeRow(rows, mask, child, verbs) + '.');
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
      members.map(r => describeRow(rows, mask, r, verbs)).join('; ') + '.'
    );
    for (const r of members) known.add(r);
    for (let j = pending.length - 1; j >= 0; j--) {
      const c = pending[j];
      if ((!c.left || known.has(c.left.role)) && known.has(c.right.role)) pending.splice(j, 1);
    }
  }
  return steps;
}

// Identify the closest plausible rival on confirmed trials (Super Easy / Very Easy)
// by finding the exact single operational fact (timing, direction, or role) that spares them.
function findDecisiveDirectRival(evidence, solvedMask, correctTargets, evaluateFamily) {
  const {rows, family, anchor, leads, domain} = evidence;
  const verbs = verbsForDomain(domain);
  const edges = edgesFor(rows, solvedMask);
  const correctSet = new Set(correctTargets);
  const leadList = (leads || []).filter(name => !correctSet.has(name) && name !== anchor);
  const restList = (evidence.roster || []).filter(name => !correctSet.has(name) && name !== anchor && !leadList.includes(name));
  const candidates = [...leadList, ...restList];
  if (!candidates.length) return null;
  const pickHit = alt => leadList.find(n => alt.includes(n)) || restList.find(n => alt.includes(n)) || null;
  const allRoles = ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'];

  // 1. Check single-edge direction reversal (most direct operational distinction: actor vs recipient)
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    const mod = edges.slice();
    mod[i] = {...e, from: e.to, to: e.from};
    const alt = evaluateFamily(family, mod, anchor, false).pair;
    const hit = pickHit(alt);
    if (hit) {
      const stamp = e.time ? ' at 0' + e.time + ':00' : '';
      return {
        rivalTargets: [hit],
        defeatedBy: roleNames[e.role] + stamp + ' runs ' + e.from + ' ' + verbs[e.role] + ' ' + e.to + ', not the reverse.',
        decisiveRole: e.role
      };
    }
  }

  // 2. Check timing swap (exact chronological distinction)
  for (let a = 0; a < rows.length; a++) {
    for (let b = a + 1; b < rows.length; b++) {
      const rA = rows[a];
      const rB = rows[b];
      if (!rA.time || !rB.time || rA.time === rB.time) continue;
      const mod = edges.map(e =>
        e.role === rA.role ? {...e, time: rB.time}
          : e.role === rB.role ? {...e, time: rA.time}
            : e
      );
      const alt = evaluateFamily(family, mod, anchor, false).pair;
      const hit = pickHit(alt);
      if (hit) {
        const first = rA.time < rB.time ? rA : rB;
        const second = rA.time < rB.time ? rB : rA;
        return {
          rivalTargets: [hit],
          defeatedBy: roleNames[first.role] + ' (0' + first.time + ':00) occurred before ' + roleNames[second.role] + ' (0' + second.time + ':00).',
          decisiveRole: first.role
        };
      }
    }
  }

  // 3. Check single-edge role distinction (why this role matters instead of another)
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    for (const altRole of allRoles) {
      if (altRole === e.role) continue;
      const mod = edges.slice();
      mod[i] = {...e, role: altRole};
      const alt = evaluateFamily(family, mod, anchor, false).pair;
      const hit = pickHit(alt);
      if (hit) {
        const stamp = e.time ? ' at 0' + e.time + ':00' : '';
        return {
          rivalTargets: [hit],
          defeatedBy: e.from + ' ' + verbs[e.role] + ' ' + e.to + stamp + ' is ' + roleNames[e.role] + ', not ' + roleNames[altRole] + '.',
          decisiveRole: e.role
        };
      }
    }
  }

  return null;
}

// Identify the closest rival reading (failing only ONE cross-check) for concise post-trial debrief.
export function findDecisiveRival(evidence, solvedMask, correctTargets, evaluateFamily) {
  const {rows, reports, family, anchor, domain} = evidence;
  if (!reports.length) return findDecisiveDirectRival(evidence, solvedMask, correctTargets, evaluateFamily);
  const verbs = verbsForDomain(domain);
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
        defeatedBy: fmtReportShort(failed, verbs),
        reportIndex: reports.indexOf(failed)
      };
    }
  }
  return null;
}

export function solveCaseEvidence(evidence, evaluateFamily) {
  const {rows, reports, family, anchor, domain} = evidence;
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
      solution = {...answer, proof: [...answer.proof, ...explainRows(rows, reports, mask, domain)]};
    }
  }
  if (!solution) return {pair: [], targets: [], proof: [], validWorlds, solvedMask: -1, rivalDebrief: null};
  const rivalDebrief = findDecisiveRival(evidence, solvedMask, solution.pair, evaluateFamily);
  return {...solution, targets: solution.pair, validWorlds, solvedMask, rivalDebrief};
}
