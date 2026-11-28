// Fast 64-world BigInt bitmask 2-SAT solver & leak-free coupled cross-check synthesizer.
// Precomputes 64-bit masks per candidate clause and uses constructive shrinking search so
// even Tier 6 (6 disputed coupled records with strict target-ID minimality) synthesizes in < 2ms.

import { attachUncertainty, shuffle } from './case-layout.js';
import { buildClinicalGraph } from './case-graph.js';

export const CLAUSE_OPS = Object.freeze([
  { id: 'eq', symbol: '=', eval: (a, b) => a === b },
  { id: 'neq', symbol: '≠', eval: (a, b) => a !== b },
  { id: 'imp', symbol: '⇒', eval: (a, b) => !a || !!b },
  { id: 'or', symbol: 'or', eval: (a, b) => !!a || !!b },
  { id: 'nand', symbol: 'not both', eval: (a, b) => !(a && b) },
]);

const OP_BY_ID = Object.freeze(Object.fromEntries(CLAUSE_OPS.map((o) => [o.id, o])));

export function evalClauseOnWorld(clause, worldMask) {
  const bitA = (worldMask >> clause.aIdx) & 1;
  const bitB = (worldMask >> clause.bIdx) & 1;
  const aLit = clause.aNeg ? 1 - bitA : bitA;
  const bLit = clause.bNeg ? 1 - bitB : bitB;
  return OP_BY_ID[clause.opId].eval(aLit, bLit);
}

function clauseWorldMask(clause, activeIndices) {
  const n = activeIndices.length;
  const total = 1 << n;
  let mask = 0n;
  for (let sub = 0; sub < total; sub++) {
    let fullWorld = 0b111111;
    for (let k = 0; k < n; k++) {
      if (((sub >> k) & 1) === 0) fullWorld &= ~(1 << activeIndices[k]);
    }
    if (evalClauseOnWorld(clause, fullWorld)) {
      mask |= 1n << BigInt(sub);
    }
  }
  return mask;
}

/**
 * Verify that `clauses` uniquely determine `trueSubWorld` AND satisfy strict Target-ID Minimality:
 * dropping ANY single clause admits at least one alternate world whose evaluated target set has
 * the EXACT SAME SIZE as `trueTargets` but is a DIFFERENT set.
 */
export function verifyClausesTargetMinimal(clauses, activeIndices, trueSubWorld, altSameSizeDiffMask) {
  if (altSameSizeDiffMask === 0n) return false;
  const total = 1 << activeIndices.length;
  const allMask = (1n << BigInt(total)) - 1n;
  const masks = clauses.map((c) => c.mask ?? clauseWorldMask(c, activeIndices));

  let fullConj = allMask;
  for (const m of masks) fullConj &= m;
  const expected = 1n << BigInt(trueSubWorld);
  if (fullConj !== expected) return false;

  for (let skip = 0; skip < masks.length; skip++) {
    let partial = allMask;
    for (let i = 0; i < masks.length; i++) {
      if (i !== skip) partial &= masks[i];
    }
    if ((partial & altSameSizeDiffMask) === 0n) {
      return false;
    }
  }
  return true;
}

export function formatCrossCheck(clause, records) {
  const recA = records[clause.aIdx];
  const recB = records[clause.bIdx];
  const labelA = recA.label;
  const labelB = recB.label;

  if (clause.opId === 'eq') {
    return {
      aIdx: clause.aIdx,
      bIdx: clause.bIdx,
      opId: clause.opId,
      aNeg: false,
      bNeg: false,
      symbol: '=',
      text: `${labelA} and ${labelB} either both hold as printed or both are flipped.`,
      shortText: `${recA.shortLabel} = ${recB.shortLabel}`,
    };
  }
  if (clause.opId === 'neq') {
    return {
      aIdx: clause.aIdx,
      bIdx: clause.bIdx,
      opId: clause.opId,
      aNeg: false,
      bNeg: false,
      symbol: '≠',
      text: `Exactly one of ${labelA} or ${labelB} holds as printed (the other is flipped).`,
      shortText: `${recA.shortLabel} ≠ ${recB.shortLabel}`,
    };
  }
  if (clause.opId === 'imp') {
    const lhs = clause.aNeg ? `${labelA} is flipped` : `${labelA} holds as printed`;
    const rhs = clause.bNeg ? `${labelB} is flipped` : `${labelB} holds as printed`;
    return {
      aIdx: clause.aIdx,
      bIdx: clause.bIdx,
      opId: clause.opId,
      aNeg: clause.aNeg,
      bNeg: clause.bNeg,
      symbol: '⇒',
      text: `If ${lhs}, then ${rhs}.`,
      shortText: `${clause.aNeg ? '¬' : ''}${recA.shortLabel} ⇒ ${clause.bNeg ? '¬' : ''}${recB.shortLabel}`,
    };
  }
  if (clause.opId === 'or') {
    const lhs = clause.aNeg ? `${labelA} is flipped` : `${labelA} holds as printed`;
    const rhs = clause.bNeg ? `${labelB} is flipped` : `${labelB} holds as printed`;
    return {
      aIdx: clause.aIdx,
      bIdx: clause.bIdx,
      opId: clause.opId,
      aNeg: clause.aNeg,
      bNeg: clause.bNeg,
      symbol: 'or',
      text: `At least one is true: ${lhs}, or ${rhs}.`,
      shortText: `${clause.aNeg ? '¬' : ''}${recA.shortLabel} or ${clause.bNeg ? '¬' : ''}${recB.shortLabel}`,
    };
  }
  const lhs = clause.aNeg ? `${labelA} is flipped` : `${labelA} holds as printed`;
  const rhs = clause.bNeg ? `${labelB} is flipped` : `${labelB} holds as printed`;
  return {
    aIdx: clause.aIdx,
    bIdx: clause.bIdx,
    opId: clause.opId,
    aNeg: clause.aNeg,
    bNeg: clause.bNeg,
    symbol: 'not both',
    text: `Cannot both be true: ${lhs}, and ${rhs}.`,
    shortText: `not both (${clause.aNeg ? '¬' : ''}${recA.shortLabel}, ${clause.bNeg ? '¬' : ''}${recB.shortLabel})`,
  };
}

function precomputePairCandidates(aIdx, bIdx, trueWorld, activeIndices) {
  const bitA = (trueWorld >> aIdx) & 1;
  const bitB = (trueWorld >> bIdx) & 1;
  const sym =
    bitA === bitB
      ? { aIdx, bIdx, opId: 'eq', aNeg: false, bNeg: false }
      : { aIdx, bIdx, opId: 'neq', aNeg: false, bNeg: false };
  sym.mask = clauseWorldMask(sym, activeIndices);

  const asym = [];
  for (const opId of ['imp', 'or', 'nand']) {
    for (const aNeg of [false, true]) {
      for (const bNeg of [false, true]) {
        const c = { aIdx, bIdx, opId, aNeg, bNeg };
        if (evalClauseOnWorld(c, trueWorld)) {
          c.mask = clauseWorldMask(c, activeIndices);
          asym.push(c);
        }
      }
    }
  }
  return { sym, asym, all: [sym, ...asym] };
}

/**
 * Fast constructive search for a connected coupled 2-SAT system over `pairs` that:
 *  - uniquely satisfies `trueSubWorld`,
 *  - uses balanced operators (mix of =/!= and =>/or/not both),
 *  - satisfies strict target-ID minimality (`verifyClausesTargetMinimal`).
 */
function findMinimalCoupledSystem(rng, pairs, trueWorldMask, activeIndices, trueSubWorld, altSameSizeDiffMask, minDistinctOps) {
  const total = 1 << activeIndices.length;
  const allMask = (1n << BigInt(total)) - 1n;
  const expected = 1n << BigInt(trueSubWorld);
  const pools = pairs.map(([a, b]) => precomputePairCandidates(a, b, trueWorldMask, activeIndices));

  // Strategy A (instant exact): pick (N-1) spanning edges as eq/neq (or mix) + 1..2 closing asymmetric clauses.
  // Because N-1 eq/neq edges cut 64 worlds down to {trueSubWorld, ~trueSubWorld},
  // ANY asymmetric clause that rules out ~trueSubWorld immediately yields unique satisfiability!
  // We also test replacing 1 or 2 eq/neq edges with asymmetric clauses for richer operator variety.
  const nEdges = pairs.length;
  const tryOrder = shuffle(rng, Array.from({ length: nEdges }, (_, i) => i));

  // Pattern 1: 1 asymmetric closing edge + (nEdges - 1) eq/neq edges (on 3-cycle or 6-cycle)
  // Pattern 2: 2-3 asymmetric edges + remaining eq/neq edges (richer 2-SAT coupling)
  const trials = nEdges <= 3 ? 45 : 75;
  for (let t = 0; t < trials; t++) {
    const asymCount = nEdges <= 3 ? (t < 20 ? 1 : 2) : (t < 30 ? 2 : t < 55 ? 3 : 1);
    const chosenIndices = shuffle(rng, tryOrder);
    const asymPositions = new Set(chosenIndices.slice(0, asymCount));

    const chosen = new Array(nEdges);
    let conj = allMask;
    const opsUsed = new Set();

    // Place symmetric edges first to prune world space cleanly
    for (let i = 0; i < nEdges; i++) {
      if (!asymPositions.has(i)) {
        const c = pools[i].sym;
        chosen[i] = c;
        conj &= c.mask;
        opsUsed.add(c.opId);
      }
    }

    // Now pick asymmetric edges that strictly eliminate remaining wrong worlds
    let failed = false;
    for (const i of asymPositions) {
      const remainingWrong = conj & ~expected;
      const cands = pools[i].asym.filter((c) => (remainingWrong & ~c.mask) !== 0n);
      const pickPool = cands.length ? cands : pools[i].asym;
      // Prefer operators not yet used for diversity
      const fresh = pickPool.filter((c) => !opsUsed.has(c.opId));
      const src = fresh.length ? fresh : pickPool;
      const c = src[Math.floor(rng() * src.length)];
      if (!c) { failed = true; break; }
      chosen[i] = c;
      conj &= c.mask;
      opsUsed.add(c.opId);
    }

    if (failed || conj !== expected) continue;
    if (opsUsed.size < minDistinctOps) continue;

    if (verifyClausesTargetMinimal(chosen, activeIndices, trueSubWorld, altSameSizeDiffMask)) {
      return chosen;
    }
  }

  return null;
}

export function synthesizeEpistemicLogic(rng, baseRecords, family, params, tierDisputedCount) {
  if (tierDisputedCount === 0) {
    const graph = buildClinicalGraph(baseRecords, 0b111111);
    const targets = family.evaluate(graph, params);
    if (targets.length < 1 || targets.length > 4) return null;
    return {
      records: baseRecords,
      trueWorldMask: 0b111111,
      trueTargets: targets,
      crossChecks: [],
    };
  }

  // Tier 4 (Easy): 1 disputed record settled by 1 symmetric = / != against a confirmed anchor
  if (tierDisputedCount === 1) {
    const orderIdx = shuffle(rng, [0, 1, 2, 3, 4, 5]);
    for (const dIdx of orderIdx) {
      const trueBit = rng() < 0.5 ? 1 : 0;
      const records = baseRecords.map((r, i) => (i === dIdx ? attachUncertainty(rng, r, trueBit) : r));
      const trueMask = trueBit === 1 ? 0b111111 : 0b111111 & ~(1 << dIdx);
      const altMask = trueMask ^ (1 << dIdx);

      const trueTargets = family.evaluate(buildClinicalGraph(records, trueMask), params);
      const altTargets = family.evaluate(buildClinicalGraph(records, altMask), params);
      if (trueTargets.length < 1 || trueTargets.length > 4) continue;
      if (trueTargets.join(',') === altTargets.join(',')) continue;

      const confirmedIndices = [0, 1, 2, 3, 4, 5].filter((i) => i !== dIdx);
      const anchorIdx = confirmedIndices[Math.floor(rng() * confirmedIndices.length)];
      const opId = trueBit === 1 ? 'eq' : 'neq';
      const clause =
        rng() < 0.5
          ? { aIdx: anchorIdx, bIdx: dIdx, opId, aNeg: false, bNeg: false }
          : { aIdx: dIdx, bIdx: anchorIdx, opId, aNeg: false, bNeg: false };

      return {
        records,
        trueWorldMask: trueMask,
        trueTargets,
        crossChecks: [formatCrossCheck(clause, records)],
      };
    }
    return null;
  }

  // Tier 5 (Medium: 3 disputed) or Tier 6 (Hard: 6 disputed)
  const activeIndices =
    tierDisputedCount === 6
      ? [0, 1, 2, 3, 4, 5]
      : shuffle(rng, [0, 1, 2, 3, 4, 5]).slice(0, 3).sort((a, b) => a - b);

  let trueWorldMask = 0b111111;
  let trueSubWorld = 0;
  const records = baseRecords.map((r, i) => {
    const pos = activeIndices.indexOf(i);
    if (pos === -1) return r;
    const bit = rng() < 0.5 ? 1 : 0;
    if (bit === 0) trueWorldMask &= ~(1 << i);
    else trueSubWorld |= 1 << pos;
    return attachUncertainty(rng, r, bit);
  });

  const totalWorlds = 1 << activeIndices.length;
  const worldTargetKeys = new Array(totalWorlds);
  const worldTargetSizes = new Array(totalWorlds);
  let trueTargets = null;

  for (let sub = 0; sub < totalWorlds; sub++) {
    let fullWorld = 0b111111;
    for (let k = 0; k < activeIndices.length; k++) {
      if (((sub >> k) & 1) === 0) fullWorld &= ~(1 << activeIndices[k]);
    }
    const t = family.evaluate(buildClinicalGraph(records, fullWorld), params);
    worldTargetKeys[sub] = t.join(',');
    worldTargetSizes[sub] = t.length;
    if (sub === trueSubWorld) trueTargets = t;
  }

  if (!trueTargets || trueTargets.length < 1 || trueTargets.length > 4) return null;
  const trueKey = trueTargets.join(',');
  const trueSize = trueTargets.length;

  let altSameSizeDiffMask = 0n;
  for (let sub = 0; sub < totalWorlds; sub++) {
    if (sub !== trueSubWorld && worldTargetSizes[sub] === trueSize && worldTargetKeys[sub] !== trueKey) {
      altSameSizeDiffMask |= 1n << BigInt(sub);
    }
  }
  if (altSameSizeDiffMask === 0n) return null;

  const ring = shuffle(rng, activeIndices);
  const pairSets =
    tierDisputedCount === 3
      ? [
          [
            [ring[0], ring[1]],
            [ring[1], ring[2]],
            [ring[2], ring[0]],
          ],
        ]
      : [
          // Single connected 6-node cycle (6 clauses)
          [
            [ring[0], ring[1]],
            [ring[1], ring[2]],
            [ring[2], ring[3]],
            [ring[3], ring[4]],
            [ring[4], ring[5]],
            [ring[5], ring[0]],
          ],
          // Single connected 6-node cycle + 1 chord (7 clauses)
          [
            [ring[0], ring[1]],
            [ring[1], ring[2]],
            [ring[2], ring[3]],
            [ring[3], ring[4]],
            [ring[4], ring[5]],
            [ring[5], ring[0]],
            [ring[0], ring[3]],
          ],
        ];

  const minDistinctOps = tierDisputedCount === 6 ? 3 : 2;
  for (const pairs of pairSets) {
    const chosen = findMinimalCoupledSystem(
      rng,
      pairs,
      trueWorldMask,
      activeIndices,
      trueSubWorld,
      altSameSizeDiffMask,
      minDistinctOps
    );
    if (chosen) {
      return {
        records,
        trueWorldMask,
        trueTargets,
        crossChecks: shuffle(rng, chosen).map((c) => formatCrossCheck(c, records)),
      };
    }
  }

  return null;
}
