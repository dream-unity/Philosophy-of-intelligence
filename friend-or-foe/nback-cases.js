import {seededDraw, shuffled} from './case-layout.js?v=fof20';
import {networkRoster} from './roster.js?v=fof20';

export const MAX_PREMISE_WORDS = 25;
export const MAX_PREMISE_CHARS = 129;
export const MIN_NBACK = 1;
export const MAX_NBACK = 6;

export const PERMS_3 = Object.freeze([
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0]
]);

// Progressive relational complexity profiles keyed by N-back level (1..6).
// Every tier stays strictly within 3 premises, <=25 words, and <=129 chars,
// while escalating operator non-linearity, cross-family rewrite pressure,
// decoy suspect overlap, and irreducible 3-line contradiction density.
export const NBACK_COMPLEXITY_TIERS = Object.freeze({
  1: Object.freeze({
    tier: 1,
    allowedFamilies: Object.freeze([
      'smullyan', 'nested2', 'nested3', 'analogy', 'foreigner', 'foreigner-cond',
      'epistemic-parity', 'conditional2', 'disjunction2'
    ]),
    minDistinctFamilies: 2,
    minAdvancedCount: 2,
    minNonlinearCount: 1,
    decoyOverlapRate: 0.40,
    minRewrittenOnMatch: 2,
    clashRate: 0.32,
    requireIrreducibleClash: true
  }),
  2: Object.freeze({
    tier: 2,
    allowedFamilies: Object.freeze([
      'smullyan', 'nested2', 'nested3', 'analogy', 'foreigner', 'foreigner-cond',
      'epistemic-parity', 'conditional2', 'disjunction2', 'conditional3'
    ]),
    minDistinctFamilies: 2,
    minAdvancedCount: 2,
    minNonlinearCount: 1,
    decoyOverlapRate: 0.58,
    minRewrittenOnMatch: 2,
    clashRate: 0.36,
    requireIrreducibleClash: true
  }),
  3: Object.freeze({
    tier: 3,
    allowedFamilies: Object.freeze([
      'smullyan', 'nested3', 'analogy', 'foreigner', 'foreigner-cond',
      'epistemic-parity', 'conditional2', 'disjunction2', 'conditional3', 'epistemic-nonlinear'
    ]),
    minDistinctFamilies: 3,
    minAdvancedCount: 3,
    minNonlinearCount: 1,
    decoyOverlapRate: 0.72,
    minRewrittenOnMatch: 2,
    clashRate: 0.40,
    requireIrreducibleClash: true
  }),
  4: Object.freeze({
    tier: 4,
    allowedFamilies: Object.freeze([
      'smullyan', 'nested3', 'foreigner', 'foreigner-cond',
      'epistemic-parity', 'conditional2', 'disjunction2', 'conditional3', 'epistemic-nonlinear'
    ]),
    minDistinctFamilies: 3,
    minAdvancedCount: 3,
    minNonlinearCount: 2,
    decoyOverlapRate: 0.82,
    minRewrittenOnMatch: 3,
    clashRate: 0.42,
    requireIrreducibleClash: true
  }),
  5: Object.freeze({
    tier: 5,
    allowedFamilies: Object.freeze([
      'smullyan', 'nested3', 'foreigner', 'foreigner-cond',
      'epistemic-parity', 'disjunction2', 'conditional3', 'epistemic-nonlinear'
    ]),
    minDistinctFamilies: 3,
    minAdvancedCount: 3,
    minNonlinearCount: 2,
    decoyOverlapRate: 0.90,
    minRewrittenOnMatch: 3,
    clashRate: 0.45,
    requireIrreducibleClash: true
  }),
  6: Object.freeze({
    tier: 6,
    allowedFamilies: Object.freeze([
      'smullyan', 'nested3', 'foreigner', 'foreigner-cond',
      'epistemic-parity', 'disjunction2', 'conditional3', 'epistemic-nonlinear'
    ]),
    minDistinctFamilies: 3,
    minAdvancedCount: 3,
    minNonlinearCount: 2,
    decoyOverlapRate: 0.96,
    minRewrittenOnMatch: 3,
    clashRate: 0.48,
    requireIrreducibleClash: true
  })
});

const ADVANCED_FAMILIES = new Set([
  'smullyan', 'nested3', 'foreigner', 'foreigner-cond', 'epistemic-parity',
  'conditional2', 'disjunction2', 'conditional3', 'epistemic-nonlinear'
]);

const NONLINEAR_FAMILIES = new Set([
  'foreigner-cond', 'conditional2', 'disjunction2', 'conditional3', 'epistemic-nonlinear'
]);

export function complexityForNBack(nBack) {
  const clamped = Math.max(MIN_NBACK, Math.min(MAX_NBACK, Number(nBack) || 1));
  return NBACK_COMPLEXITY_TIERS[clamped];
}

function worldVal(world, idx) {
  return (world & (4 >> idx)) ? 1 : -1;
}

export function maskFromPred(pred) {
  let mask = 0;
  for (let w = 0; w < 8; w++) {
    if (pred(worldVal(w, 0), worldVal(w, 1), worldVal(w, 2))) {
      mask |= (1 << w);
    }
  }
  return mask;
}

export function permuteMask(mask, phi) {
  let out = 0;
  for (let wNew = 0; wNew < 8; wNew++) {
    const newVals = [worldVal(wNew, 0), worldVal(wNew, 1), worldVal(wNew, 2)];
    const wOld =
      (newVals[phi[0]] > 0 ? 4 : 0) |
      (newVals[phi[1]] > 0 ? 2 : 0) |
      (newVals[phi[2]] > 0 ? 1 : 0);
    if ((mask >> wOld) & 1) out |= (1 << wNew);
  }
  return out;
}

function popcount8(mask) {
  let m = mask & 255;
  let c = 0;
  while (m) {
    m &= m - 1;
    c++;
  }
  return c;
}

function worldsFromMask(mask) {
  const worlds = [];
  for (let w = 0; w < 8; w++) {
    if ((mask >> w) & 1) worlds.push(w);
  }
  return worlds;
}

function possessive(name) {
  return name + "'s";
}

export function measurePremises(statements) {
  const joined = statements.map(s => (typeof s === 'string' ? s : s.text)).join(' ').trim();
  const words = joined ? joined.split(/\s+/).length : 0;
  return {words, chars: joined.length, joined};
}

// High-order relational statement catalog over 3 suspects [v0, v1, v2].
// Friend / Civilian = truth-tellers (+1).
// Foe / Spy / Double agent = liars (-1).
// Foreigner = impartial external intelligence observer (factual statement).
export function buildCandidateStatements(suspects, allowedFamilies = null) {
  const allow = allowedFamilies ? new Set(allowedFamilies) : null;
  const out = [];
  const add = (templateId, family, speakerIdx, text, pred, shortMeaning) => {
    if (allow && !allow.has(family)) return;
    const mask = maskFromPred(pred);
    out.push({templateId, family, speakerIdx, text, mask, shortMeaning});
  };

  for (const [i, j, k] of PERMS_3) {
    const a = suspects[i];
    const b = suspects[j];
    const c = suspects[k];
    const pa = possessive(a);
    const pb = possessive(b);
    const pc = possessive(c);

    // 1. Third-order Smullyan self-referential epistemic traps (forces B = +1 or B = -1 regardless of speaker A!)
    add(
      'smullyan-match', 'smullyan', i,
      `${a} says ${b} matches ${a} on ${c}.`,
      (v0, v1, v2) => {
        const vs = [v0, v1, v2];
        return (vs[i] === 1) === (vs[j] === vs[i]);
      },
      `${b} tells truth`
    );
    add(
      'smullyan-differ', 'smullyan', i,
      `${a} says ${b} differs from ${a} on ${c}.`,
      (v0, v1, v2) => {
        const vs = [v0, v1, v2];
        return (vs[i] === 1) === (vs[j] === -vs[i]);
      },
      `${b} lies`
    );
    add(
      'smullyan-opp-spy', 'smullyan', i,
      `${a} says ${b} opposes ${pa} spy.`,
      (v0, v1, v2) => {
        const vs = [v0, v1, v2];
        return (vs[i] === 1) === (vs[j] === vs[i]);
      },
      `${b} tells truth`
    );
    add(
      'smullyan-opp-foe', 'smullyan', i,
      `${a} says ${b} opposes ${pa} foe.`,
      (v0, v1, v2) => {
        const vs = [v0, v1, v2];
        return (vs[i] === 1) === (vs[j] === vs[i]);
      },
      `${b} tells truth`
    );
    add(
      'smullyan-clear-friend', 'smullyan', i,
      `${a} says ${b} clears ${pa} friend.`,
      (v0, v1, v2) => {
        const vs = [v0, v1, v2];
        return (vs[i] === 1) === (vs[j] === vs[i]);
      },
      `${b} tells truth`
    );
    add(
      'smullyan-back-double', 'smullyan', i,
      `${a} says ${b} backs ${pa} double.`,
      (v0, v1, v2) => {
        const vs = [v0, v1, v2];
        return (vs[i] === 1) === (vs[j] === -vs[i]);
      },
      `${b} lies`
    );
    add(
      'smullyan-back-spy', 'smullyan', i,
      `${a} says ${b} backs ${pa} spy.`,
      (v0, v1, v2) => {
        const vs = [v0, v1, v2];
        return (vs[i] === 1) === (vs[j] === -vs[i]);
      },
      `${b} lies`
    );
    add(
      'smullyan-betray-friend', 'smullyan', i,
      `${a} says ${b} betrays ${pa} friend.`,
      (v0, v1, v2) => {
        const vs = [v0, v1, v2];
        return (vs[i] === 1) === (vs[j] === -vs[i]);
      },
      `${b} lies`
    );

    // 2. Depth-2 & Depth-3 nested allegiance chains (binary A = B or A != B)
    add(
      'nest2-opp-spy', 'nested2', null,
      `${a} opposes ${pb} spy.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] * vs[j] === 1; },
      `${a} = ${b}`
    );
    add(
      'nest2-clear-friend', 'nested2', null,
      `${a} clears ${pb} friend.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] * vs[j] === 1; },
      `${a} = ${b}`
    );
    add(
      'nest2-back-double', 'nested2', null,
      `${a} backs ${pb} double.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] * vs[j] === -1; },
      `${a} ≠ ${b}`
    );
    add(
      'nest2-betray-friend', 'nested2', null,
      `${a} betrays ${pb} friend.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] * vs[j] === -1; },
      `${a} ≠ ${b}`
    );

    add(
      'nest3-opp-f-spy', 'nested3', null,
      `${a} opposes the friend of ${pb} spy.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] * vs[j] === 1; },
      `${a} = ${b}`
    );
    add(
      'nest3-back-foe-spy', 'nested3', null,
      `${a} backs the foe of ${pb} spy.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] * vs[j] === 1; },
      `${a} = ${b}`
    );
    add(
      'nest3-back-f-double', 'nested3', null,
      `${a} backs the friend of ${pb} double.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] * vs[j] === -1; },
      `${a} ≠ ${b}`
    );
    add(
      'nest3-opp-foe-spy', 'nested3', null,
      `${a} opposes the foe of ${pb} spy.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] * vs[j] === -1; },
      `${a} ≠ ${b}`
    );

    // 3. Second-order relational analogies & Foreigner external intelligence links
    add(
      'analogy-pos', 'analogy', null,
      `${a} matches ${b} on ${c}.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] * vs[j] === 1; },
      `${a} = ${b}`
    );
    add(
      'analogy-neg', 'analogy', null,
      `${a} differs from ${b} on ${c}.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] * vs[j] === -1; },
      `${a} ≠ ${b}`
    );
    add(
      'foreigner-ally', 'foreigner', null,
      `Foreigner links ${a} to ${pb} ally.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] * vs[j] === 1; },
      `${a} = ${b}`
    );
    add(
      'foreigner-spy', 'foreigner', null,
      `Foreigner links ${a} to ${pb} spy.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] * vs[j] === -1; },
      `${a} ≠ ${b}`
    );
    add(
      'foreigner-exposes-if-friend', 'foreigner-cond', null,
      `Foreigner exposes ${a} if ${b} is Friend.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[j] === 1) || vs[i] === -1; },
      `not both ${a}, ${b} honest`
    );
    add(
      'foreigner-clears-unless-civ', 'foreigner-cond', null,
      `Foreigner clears ${a} unless ${b} is Civilian.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[j] === -1) || vs[i] === 1; },
      `${a} or ${b} honest`
    );

    // 4. 3-way epistemic parity (nested & analogical 3-variable XOR/XNOR)
    add(
      'ep-par-opp-spy', 'epistemic-parity', i,
      `${a} says ${b} opposes ${pc} spy.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return (vs[i] === 1) === (vs[j] * vs[k] === 1); },
      `even liars (0 or 2)`
    );
    add(
      'ep-par-back-friend', 'epistemic-parity', i,
      `${a} says ${b} backs ${pc} friend.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return (vs[i] === 1) === (vs[j] * vs[k] === 1); },
      `even liars (0 or 2)`
    );
    add(
      'ep-par-match', 'epistemic-parity', i,
      `${a} says ${b} matches ${c} on ${a}.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return (vs[i] === 1) === (vs[j] * vs[k] === 1); },
      `even liars (0 or 2)`
    );
    add(
      'ep-par-back-spy', 'epistemic-parity', i,
      `${a} says ${b} backs ${pc} spy.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return (vs[i] === 1) === (vs[j] * vs[k] === -1); },
      `odd liars (1 or 3)`
    );
    add(
      'ep-par-betray-friend', 'epistemic-parity', i,
      `${a} says ${b} betrays ${pc} friend.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return (vs[i] === 1) === (vs[j] * vs[k] === -1); },
      `odd liars (1 or 3)`
    );
    add(
      'ep-par-differ', 'epistemic-parity', i,
      `${a} says ${b} differs from ${c} on ${a}.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return (vs[i] === 1) === (vs[j] * vs[k] === -1); },
      `odd liars (1 or 3)`
    );

    // 5. Non-linear 2-variable asymmetric conditionals & disjunctive / only-if equivalents
    add(
      'cond2-f-spy', 'conditional2', null,
      `If ${a} lies, ${b} is a Spy.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[i] === -1) || vs[j] === -1; },
      `${a} liar ⇒ ${b} liar`
    );
    add(
      'cond2-civ-friend', 'conditional2', null,
      `If ${b} is Civilian, ${a} tells truth.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[j] === 1) || vs[i] === 1; },
      `${b} honest ⇒ ${a} honest`
    );
    add(
      'cond2-onlyif-spy', 'conditional2', null,
      `${a} lies only if ${b} is a Spy.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[i] === -1) || vs[j] === -1; },
      `${a} liar ⇒ ${b} liar`
    );
    add(
      'cond2-f-double', 'conditional2', null,
      `If ${a} is Friend, ${b} is a Double.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[i] === 1) || vs[j] === -1; },
      `not both ${a}, ${b} honest`
    );
    add(
      'disj2-foe', 'disjunction2', null,
      `Either ${a} or ${b} is a Foe.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] === -1 || vs[j] === -1; },
      `not both ${a}, ${b} honest`
    );
    add(
      'cond2-spy-civ', 'conditional2', null,
      `If ${a} is a Spy, ${b} is Civilian.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[i] === -1) || vs[j] === 1; },
      `${a} or ${b} honest`
    );
    add(
      'disj2-truth', 'disjunction2', null,
      `Either ${a} or ${b} tells truth.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] === 1 || vs[j] === 1; },
      `${a} or ${b} honest`
    );
    add(
      'disj2-unless-civ', 'disjunction2', null,
      `${a} is Friend unless ${b} is Civilian.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[j] === -1) || vs[i] === 1; },
      `${a} or ${b} honest`
    );

    // 6. Non-linear 3-variable nested conditionals & contrapositive twins (popcount 6)
    add(
      'cond3-spy-opp-f', 'conditional3', null,
      `If ${a} is a Spy, ${b} opposes ${pc} friend.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[i] === -1) || (vs[j] * vs[k] === -1); },
      `${a} liar ⇒ ${b} ≠ ${c}`
    );
    add(
      'cond3-contra-eq-civ', 'conditional3', null,
      `If ${b} backs ${pc} friend, ${a} is Civilian.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[j] * vs[k] === 1) || (vs[i] === 1); },
      `${b} = ${c} ⇒ ${a} honest`
    );
    add(
      'cond3-lies-opp-spy', 'conditional3', null,
      `If ${a} lies, ${b} opposes ${pc} spy.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[i] === -1) || (vs[j] * vs[k] === 1); },
      `${a} liar ⇒ ${b} = ${c}`
    );
    add(
      'cond3-contra-diff-friend', 'conditional3', null,
      `If ${b} differs from ${c} on ${a}, ${a} is Friend.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[j] * vs[k] === -1) || (vs[i] === 1); },
      `${b} ≠ ${c} ⇒ ${a} honest`
    );
    add(
      'cond3-civ-back-spy', 'conditional3', null,
      `If ${a} is Civilian, ${b} backs ${pc} spy.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[i] === 1) || (vs[j] * vs[k] === -1); },
      `${a} honest ⇒ ${b} ≠ ${c}`
    );
    add(
      'cond3-contra-eq-double', 'conditional3', null,
      `If ${b} opposes ${pc} spy, ${a} is a Double.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[j] * vs[k] === 1) || (vs[i] === -1); },
      `${b} = ${c} ⇒ ${a} liar`
    );
    add(
      'cond3-friend-match', 'conditional3', null,
      `If ${a} is Friend, ${b} matches ${c} on ${a}.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[i] === 1) || (vs[j] * vs[k] === 1); },
      `${a} honest ⇒ ${b} = ${c}`
    );
    add(
      'cond3-contra-opp-spy', 'conditional3', null,
      `If ${b} opposes ${pc} friend, ${a} is a Spy.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[j] * vs[k] === -1) || (vs[i] === -1); },
      `${b} ≠ ${c} ⇒ ${a} liar`
    );

    // 7. Epistemic non-linear conditionals, conjunctions & disjunctions (bent 3-variable case-splitting!)
    add(
      'ep-cond-spy-if-lies', 'epistemic-nonlinear', i,
      `${a} says ${b} is a Spy if ${c} lies.`,
      (v0, v1, v2) => {
        const vs = [v0, v1, v2];
        const inner = !(vs[k] === -1) || (vs[j] === -1);
        return (vs[i] === 1) === inner;
      },
      `${a} honest ⇔ (${c} liar ⇒ ${b} liar)`
    );
    add(
      'ep-cond-friend-unless-lies', 'epistemic-nonlinear', i,
      `${a} says ${b} is Friend unless ${c} lies.`,
      (v0, v1, v2) => {
        const vs = [v0, v1, v2];
        const inner = !(vs[k] === 1) || (vs[j] === 1);
        return (vs[i] === 1) === inner;
      },
      `${a} honest ⇔ (${c} honest ⇒ ${b} honest)`
    );
    add(
      'ep-disj-spy', 'epistemic-nonlinear', i,
      `${a} says either ${b} or ${c} is Spy.`,
      (v0, v1, v2) => {
        const vs = [v0, v1, v2];
        const inner = (vs[j] === -1) || (vs[k] === -1);
        return (vs[i] === 1) === inner;
      },
      `${a} honest ⇔ (${b} or ${c} liar)`
    );
    add(
      'ep-disj-truth', 'epistemic-nonlinear', i,
      `${a} says either ${b} or ${c} tells truth.`,
      (v0, v1, v2) => {
        const vs = [v0, v1, v2];
        const inner = (vs[j] === 1) || (vs[k] === 1);
        return (vs[i] === 1) === inner;
      },
      `${a} honest ⇔ (${b} or ${c} honest)`
    );
    add(
      'ep-conj-lie', 'epistemic-nonlinear', i,
      `${a} says both ${b} and ${c} lie.`,
      (v0, v1, v2) => {
        const vs = [v0, v1, v2];
        const inner = (vs[j] === -1) && (vs[k] === -1);
        return (vs[i] === 1) === inner;
      },
      `${a} honest ⇔ (${b} and ${c} lie)`
    );
    add(
      'ep-conj-truth', 'epistemic-nonlinear', i,
      `${a} says both ${b} and ${c} tell truth.`,
      (v0, v1, v2) => {
        const vs = [v0, v1, v2];
        const inner = (vs[j] === 1) && (vs[k] === 1);
        return (vs[i] === 1) === inner;
      },
      `${a} honest ⇔ (${b} and ${c} honest)`
    );
    // Asymmetric twin of ep-cond-spy-if-lies (exact same truth mask with contrapositive phrasing!)
    add(
      'ep-cond-civ-if-civ', 'epistemic-nonlinear', i,
      `${a} says ${c} tells truth if ${b} is Civilian.`,
      (v0, v1, v2) => {
        const vs = [v0, v1, v2];
        const inner = !(vs[j] === 1) || (vs[k] === 1);
        return (vs[i] === 1) === inner;
      },
      `${a} honest ⇔ (${b} honest ⇒ ${c} honest)`
    );
    // Asymmetric twin of ep-disj-spy (if B is Friend then C is Spy!)
    add(
      'ep-cond-if-friend-spy', 'epistemic-nonlinear', i,
      `${a} says ${c} is Spy if ${b} is Friend.`,
      (v0, v1, v2) => {
        const vs = [v0, v1, v2];
        const inner = !(vs[j] === 1) || (vs[k] === -1);
        return (vs[i] === 1) === inner;
      },
      `${a} honest ⇔ (${b} or ${c} liar)`
    );
    // Asymmetric twin of ep-disj-truth (if B is Spy then C is Civilian!)
    add(
      'ep-cond-if-spy-civ', 'epistemic-nonlinear', i,
      `${a} says ${c} is Civilian if ${b} is Spy.`,
      (v0, v1, v2) => {
        const vs = [v0, v1, v2];
        const inner = !(vs[j] === -1) || (vs[k] === 1);
        return (vs[i] === 1) === inner;
      },
      `${a} honest ⇔ (${b} or ${c} honest)`
    );
  }

  return out;
}

// Exhaustively solve a 3-statement cell over suspects = [v0, v1, v2].
export function solveNBackCell(suspects, statements, {requireIrreducibleClash = true} = {}) {
  if (!Array.isArray(statements) || statements.length !== 3) {
    return {valid: false, kind: 'invalid'};
  }
  const [m0, m1, m2] = statements.map(s => s.mask);
  const combined = m0 & m1 & m2;
  const solutions = worldsFromMask(combined);

  if (solutions.length === 1) {
    const w = solutions[0];
    const foes = [];
    const friends = [];
    for (let i = 0; i < 3; i++) {
      if (worldVal(w, i) === -1) foes.push(suspects[i]);
      else friends.push(suspects[i]);
    }
    if (foes.length < 1 || foes.length > 2) {
      return {valid: false, kind: 'unbalanced', solutions};
    }
    // Strict minimality: dropping ANY 1 statement must leave >=2 valid worlds.
    const pairMasks = [m1 & m2, m0 & m2, m0 & m1];
    const minimal = pairMasks.every(pm => popcount8(pm) >= 2);
    return {
      valid: minimal,
      minimal,
      kind: 'consistent',
      world: w,
      foes,
      friends
    };
  }

  if (solutions.length === 0) {
    // Irreducible 3-line contradiction: every pair of premises is consistent,
    // and ONLY combining all 3 premises produces a contradiction.
    const irreducible = (m0 & m1) !== 0 && (m0 & m2) !== 0 && (m1 & m2) !== 0;
    const valid = requireIrreducibleClash ? irreducible : true;
    return {
      valid,
      minimal: irreducible,
      irreducible,
      kind: 'contradiction'
    };
  }

  return {valid: false, kind: 'underdetermined', solutionCount: solutions.length};
}

// Compare Trial t-N and Trial t across all 36 (bijection phi, statement pairing sigma) alignments.
// Matching is strictly semantic (8-bit truth-set equivalence under one consistent suspect renaming phi).
// Tie-breaking mirrors Ontological Worlds: maximize matchedCount, then prefer earliest No (0 before 1).
export function analyzeNBackAlignment(refStatements, curStatements) {
  let best = null;

  for (const phi of PERMS_3) {
    const mappedRef = refStatements.map(s => permuteMask(s.mask, phi));
    for (const sigma of PERMS_3) {
      const curMatches = [0, 0, 0];
      let matchedCount = 0;
      for (let k = 0; k < 3; k++) {
        const curIdx = sigma[k];
        if (mappedRef[k] === curStatements[curIdx].mask) {
          curMatches[curIdx] = 1;
          matchedCount++;
        }
      }
      if (!best || isBetterAlignment(matchedCount, curMatches, best)) {
        best = {
          matchedCount,
          isFullMatch: matchedCount === 3,
          phi: [...phi],
          sigma: [...sigma],
          curMatches: curMatches.map(Boolean),
          mismatchIndices: [0, 1, 2].filter(idx => !curMatches[idx])
        };
      }
    }
  }

  return best;
}

function isBetterAlignment(matchedCount, curMatches, best) {
  if (matchedCount !== best.matchedCount) return matchedCount > best.matchedCount;
  for (let i = 0; i < 3; i++) {
    const cand = curMatches[i];
    const prev = best.curMatches[i] ? 1 : 0;
    if (cand !== prev) return cand < prev; // Ontological Worlds No-first tie-break
  }
  return false;
}

function pickFrom(list, draw) {
  return list[Math.floor(draw() * list.length)];
}

function indexByMask(pool) {
  const byMask = new Map();
  for (const stmt of pool) {
    if (!byMask.has(stmt.mask)) byMask.set(stmt.mask, []);
    byMask.get(stmt.mask).push(stmt);
  }
  return byMask;
}

function pickSuspects(roster, refSuspects, draw, overlapRate) {
  if (!refSuspects || draw() >= overlapRate) {
    return shuffled(roster, draw).slice(0, 3);
  }
  const overlapCount = draw() < 0.55 ? 2 : 1;
  const reused = shuffled(refSuspects, draw).slice(0, overlapCount);
  const fresh = shuffled(roster.filter(n => !refSuspects.includes(n)), draw).slice(0, 3 - overlapCount);
  return shuffled([...reused, ...fresh], draw);
}

// Pick a bijection phi: refIdx -> curIdx shifting reused suspects to different slots whenever possible.
function pickDecoyBijection(refSuspects, curSuspects, draw) {
  const shifted = PERMS_3.filter(phi =>
    [0, 1, 2].every(i => curSuspects[phi[i]] !== refSuspects[i])
  );
  return pickFrom(shifted.length ? shifted : PERMS_3, draw);
}

function chooseStatementForMask(byMask, mask, draw, {
  avoidTemplateId = null,
  avoidFamily = null,
  usedFamilies = null
} = {}) {
  const cands = byMask.get(mask) || [];
  if (!cands.length) return null;

  const filterNotUsed = list => (usedFamilies ? list.filter(s => !usedFamilies.has(s.family)) : list);

  if (avoidFamily || avoidTemplateId) {
    const tier1 = filterNotUsed(cands.filter(s => s.family !== avoidFamily && s.templateId !== avoidTemplateId));
    if (tier1.length) return pickFrom(tier1, draw);
    const tier2 = cands.filter(s => s.family !== avoidFamily && s.templateId !== avoidTemplateId);
    if (tier2.length) return pickFrom(tier2, draw);
    const tier3 = filterNotUsed(cands.filter(s => s.templateId !== avoidTemplateId));
    if (tier3.length) return pickFrom(tier3, draw);
    const tier4 = cands.filter(s => s.templateId !== avoidTemplateId);
    if (tier4.length) return pickFrom(tier4, draw);
  }

  const freshFamily = filterNotUsed(cands);
  if (freshFamily.length) return pickFrom(freshFamily, draw);
  return pickFrom(cands, draw);
}

function meetsComplexityProfile(statements, profile) {
  const families = new Set(statements.map(s => s.family));
  if (families.size < profile.minDistinctFamilies) return false;
  const advanced = statements.filter(s => ADVANCED_FAMILIES.has(s.family)).length;
  if (advanced < profile.minAdvancedCount) return false;
  const nonlinear = statements.filter(s => NONLINEAR_FAMILIES.has(s.family)).length;
  if (nonlinear < profile.minNonlinearCount) return false;
  return true;
}

function sampleTriadStatements(suspects, byMask, draw, profile, wantClash) {
  const allMasks = [...byMask.keys()].filter(m => {
    const pc = popcount8(m);
    return pc === 4 || pc === 6;
  });
  if (allMasks.length < 3) return null;

  const nonlinearMasks = allMasks.filter(m =>
    (byMask.get(m) || []).some(s => NONLINEAR_FAMILIES.has(s.family))
  );
  const linearMasks = allMasks.filter(m => popcount8(m) === 4);

  for (let attempt = 0; attempt < 360; attempt++) {
    let mA, mB, mC;
    if (nonlinearMasks.length >= 2 && (profile.minNonlinearCount >= 2 || attempt % 2 === 0)) {
      mA = pickFrom(nonlinearMasks, draw);
      mB = pickFrom(nonlinearMasks, draw);
      mC = pickFrom(allMasks, draw);
    } else if (nonlinearMasks.length) {
      mA = pickFrom(nonlinearMasks, draw);
      mB = pickFrom(linearMasks.length ? linearMasks : allMasks, draw);
      mC = pickFrom(allMasks, draw);
    } else {
      mA = pickFrom(allMasks, draw);
      mB = pickFrom(allMasks, draw);
      mC = pickFrom(allMasks, draw);
    }
    if (mA === mB || mB === mC || mA === mC) continue;

    const comb = mA & mB & mC;
    if (wantClash) {
      if (comb !== 0) continue;
      if (profile.requireIrreducibleClash) {
        if ((mA & mB) === 0 || (mA & mC) === 0 || (mB & mC) === 0) continue;
      }
    } else {
      if (popcount8(comb) !== 1) continue;
      if (popcount8(mA & mB) < 2 || popcount8(mA & mC) < 2 || popcount8(mB & mC) < 2) continue;
      const w = worldsFromMask(comb)[0];
      const liars = [0, 1, 2].filter(idx => worldVal(w, idx) === -1).length;
      if (liars < 1 || liars > 2) continue;
    }

    const masks = shuffled([mA, mB, mC], draw);
    const chosen = [];
    const usedFamilies = new Set();
    let ok = true;
    for (const m of masks) {
      const stmt = chooseStatementForMask(byMask, m, draw, {usedFamilies});
      if (!stmt) { ok = false; break; }
      usedFamilies.add(stmt.family);
      chosen.push(stmt);
    }
    if (!ok) continue;
    if (attempt < 260 && !meetsComplexityProfile(chosen, profile)) continue;

    const {words, chars} = measurePremises(chosen);
    if (words > MAX_PREMISE_WORDS || chars > MAX_PREMISE_CHARS) continue;

    const solved = solveNBackCell(suspects, chosen, {
      requireIrreducibleClash: profile.requireIrreducibleClash
    });
    if (!solved.valid) continue;
    if (wantClash ? solved.kind !== 'contradiction' : solved.kind !== 'consistent') continue;
    return {statements: chosen, solved};
  }

  return null;
}

// Synthesize a certified 3/3 logical match of refTrial with disguised syntax,
// shuffled statement order, and N-scaled decoy suspect name reuse.
function synthesizeFullMatch(refTrial, roster, draw, profile) {
  const refSolved = refTrial.nback.solved;
  const fullPoolFamilies = null; // Allow cross-family rewrites from the full role ontology on matches

  for (let attempt = 0; attempt < 120; attempt++) {
    const suspects = pickSuspects(roster, refTrial.nback.suspects, draw, Math.max(0.5, profile.decoyOverlapRate));
    const phi = pickDecoyBijection(refTrial.nback.suspects, suspects, draw);
    const pool = buildCandidateStatements(
      suspects,
      attempt < 80 ? profile.allowedFamilies : fullPoolFamilies
    );
    const byMask = indexByMask(pool);

    const nonIdPerms = PERMS_3.slice(1);
    const sigma = pickFrom(nonIdPerms, draw);
    const chosen = [null, null, null];
    const usedFamilies = new Set();
    let ok = true;

    for (let k = 0; k < 3; k++) {
      const refStmt = refTrial.nback.statements[k];
      const targetMask = permuteMask(refStmt.mask, phi);
      const stmt = chooseStatementForMask(byMask, targetMask, draw, {
        avoidTemplateId: refStmt.templateId,
        avoidFamily: refStmt.family,
        usedFamilies
      });
      if (!stmt) { ok = false; break; }
      usedFamilies.add(stmt.family);
      chosen[sigma[k]] = stmt;
    }
    if (!ok) continue;

    let rewritten = 0;
    for (let k = 0; k < 3; k++) {
      if (chosen[sigma[k]].templateId !== refTrial.nback.statements[k].templateId) rewritten++;
    }
    const minReq = attempt < 65 ? profile.minRewrittenOnMatch : 2;
    if (rewritten < minReq) continue;

    const {words, chars} = measurePremises(chosen);
    if (words > MAX_PREMISE_WORDS || chars > MAX_PREMISE_CHARS) continue;

    const solved = solveNBackCell(suspects, chosen, {
      requireIrreducibleClash: profile.requireIrreducibleClash
    });
    if (!solved.valid || solved.kind !== refSolved.kind) continue;

    const alignment = analyzeNBackAlignment(refTrial.nback.statements, chosen);
    if (!alignment.isFullMatch) continue;

    return {suspects, statements: chosen, solved, alignment};
  }
  return null;
}

// Synthesize a certified partial-match lure (targetMatches in {2, 1, 0}) against refTrial.
function synthesizePartialOrMismatch(refTrial, roster, draw, profile, targetMatches, wantClash) {
  for (let attempt = 0; attempt < 220; attempt++) {
    const suspects = pickSuspects(roster, refTrial.nback.suspects, draw, profile.decoyOverlapRate);
    const phi = pickDecoyBijection(refTrial.nback.suspects, suspects, draw);
    const pool = buildCandidateStatements(
      suspects,
      attempt < 150 ? profile.allowedFamilies : null
    );
    const byMask = indexByMask(pool);
    const allMasks = [...byMask.keys()].filter(m => {
      const pc = popcount8(m);
      return pc === 4 || pc === 6;
    });
    if (allMasks.length < 3) continue;

    if (targetMatches === 0) {
      const built = sampleTriadStatements(suspects, byMask, draw, profile, wantClash);
      if (!built) continue;
      const alignment = analyzeNBackAlignment(refTrial.nback.statements, built.statements);
      if (alignment.matchedCount !== 0) continue;
      return {suspects, statements: built.statements, solved: built.solved, alignment};
    }

    const refOrder = shuffled([0, 1, 2], draw);
    const keepIndices = refOrder.slice(0, targetMatches);
    const dropIndices = refOrder.slice(targetMatches);
    const keepMasks = keepIndices.map(i => permuteMask(refTrial.nback.statements[i].mask, phi));
    const forbiddenMasks = new Set(dropIndices.map(i => permuteMask(refTrial.nback.statements[i].mask, phi)));

    let finalMasks = null;
    if (targetMatches === 2) {
      const base = keepMasks[0] & keepMasks[1];
      if (wantClash) {
        if (profile.requireIrreducibleClash && base === 0) continue;
        const cands = allMasks.filter(m => {
          if (forbiddenMasks.has(m) || m === keepMasks[0] || m === keepMasks[1]) return false;
          if ((base & m) !== 0) return false;
          if (profile.requireIrreducibleClash) {
            return (keepMasks[0] & m) !== 0 && (keepMasks[1] & m) !== 0;
          }
          return true;
        });
        if (!cands.length) continue;
        finalMasks = [keepMasks[0], keepMasks[1], pickFrom(cands, draw)];
      } else {
        if (popcount8(base) < 2) continue;
        const cands = allMasks.filter(m => {
          if (forbiddenMasks.has(m) || m === keepMasks[0] || m === keepMasks[1]) return false;
          const comb = base & m;
          if (popcount8(comb) !== 1) return false;
          if (popcount8(keepMasks[0] & m) < 2 || popcount8(keepMasks[1] & m) < 2) return false;
          const w = worldsFromMask(comb)[0];
          const liars = [0, 1, 2].filter(idx => worldVal(w, idx) === -1).length;
          return liars === 1 || liars === 2;
        });
        if (!cands.length) continue;
        finalMasks = [keepMasks[0], keepMasks[1], pickFrom(cands, draw)];
      }
    } else {
      // targetMatches === 1
      const m0 = keepMasks[0];
      const m1 = pickFrom(allMasks, draw);
      const m2 = pickFrom(allMasks, draw);
      if (m1 === m0 || m2 === m0 || m1 === m2) continue;
      if (forbiddenMasks.has(m1) || forbiddenMasks.has(m2)) continue;
      const comb = m0 & m1 & m2;
      if (wantClash) {
        if (comb !== 0) continue;
        if (profile.requireIrreducibleClash && ((m0 & m1) === 0 || (m0 & m2) === 0 || (m1 & m2) === 0)) continue;
      } else {
        if (popcount8(comb) !== 1) continue;
        if (popcount8(m0 & m1) < 2 || popcount8(m0 & m2) < 2 || popcount8(m1 & m2) < 2) continue;
        const w = worldsFromMask(comb)[0];
        const liars = [0, 1, 2].filter(idx => worldVal(w, idx) === -1).length;
        if (liars < 1 || liars > 2) continue;
      }
      finalMasks = [m0, m1, m2];
    }

    const usedFamilies = new Set();
    const chosen = [];
    let ok = true;
    for (let idx = 0; idx < 3; idx++) {
      const m = finalMasks[idx];
      const refPartner = idx < keepIndices.length ? refTrial.nback.statements[keepIndices[idx]] : null;
      const stmt = chooseStatementForMask(byMask, m, draw, {
        avoidTemplateId: refPartner ? refPartner.templateId : null,
        avoidFamily: refPartner ? refPartner.family : null,
        usedFamilies
      });
      if (!stmt) { ok = false; break; }
      usedFamilies.add(stmt.family);
      chosen.push(stmt);
    }
    if (!ok) continue;

    const ordered = shuffled(chosen, draw);
    if (attempt < 140 && !meetsComplexityProfile(ordered, profile)) continue;

    const {words, chars} = measurePremises(ordered);
    if (words > MAX_PREMISE_WORDS || chars > MAX_PREMISE_CHARS) continue;

    const solved = solveNBackCell(suspects, ordered, {
      requireIrreducibleClash: profile.requireIrreducibleClash
    });
    if (!solved.valid) continue;
    if (wantClash ? solved.kind !== 'contradiction' : solved.kind !== 'consistent') continue;

    const alignment = analyzeNBackAlignment(refTrial.nback.statements, ordered);
    if (alignment.matchedCount !== targetMatches) continue;

    return {suspects, statements: ordered, solved, alignment};
  }

  return null;
}

// Evaluate player's 5-decision Ontological Worlds matrix response against ground truth.
// decisions = [line1Match, line2Match, line3Match, isConsistent, fullTriadMatch] (booleans).
export function evaluateNBackDecisions(trial, decisions) {
  if (!trial?.nback || trial.nback.isEncoding || !Array.isArray(decisions) || decisions.length !== 5) {
    return {
      exact: false,
      lineCorrect: 0,
      lineTotal: 3,
      logicCorrect: false,
      triadCorrect: false,
      expected: trial?.nback?.expectedDecisions || null
    };
  }
  const exp = trial.nback.expectedDecisions;
  let lineCorrect = 0;
  for (let i = 0; i < 3; i++) {
    if (Boolean(decisions[i]) === exp[i]) lineCorrect++;
  }
  const logicCorrect = Boolean(decisions[3]) === exp[3];
  const triadCorrect = Boolean(decisions[4]) === exp[4];
  const exact = lineCorrect === 3 && logicCorrect && triadCorrect;
  return {
    exact,
    lineCorrect,
    lineTotal: 3,
    logicCorrect,
    triadCorrect,
    expected: [...exp]
  };
}

export class NBackSessionDeck {
  constructor(nBack = 1, draw = Math.random) {
    const n = Number(nBack);
    if (!Number.isInteger(n) || n < MIN_NBACK || n > MAX_NBACK) {
      throw new RangeError(`Choose an N-back level from ${MIN_NBACK} to ${MAX_NBACK}.`);
    }
    this.nBack = n;
    this.profile = complexityForNBack(n);
    this.draw = draw;
    this.history = [];
    this.fullMatches = 0;
    this.nonMatches = 0;
    this.clashes = 0;
  }

  nextTrial() {
    const number = this.history.length + 1;
    const roster = [...networkRoster];
    const prev = this.history.length ? this.history[this.history.length - 1] : null;
    const refTrial = number > this.nBack ? this.history[number - 1 - this.nBack] : null;
    const profile = this.profile;

    let built = null;

    if (!refTrial) {
      // Initial N encoding trials: maximal relational complexity appropriate to N.
      const wantClash = this.draw() < profile.clashRate;
      for (let attempt = 0; attempt < 50 && !built; attempt++) {
        const suspects = pickSuspects(roster, prev?.nback?.suspects, this.draw, 0.35);
        const pool = buildCandidateStatements(suspects, attempt < 35 ? profile.allowedFamilies : null);
        const byMask = indexByMask(pool);
        const res = sampleTriadStatements(suspects, byMask, this.draw, profile, wantClash);
        if (!res) continue;
        built = {suspects, statements: res.statements, solved: res.solved, alignment: null};
      }
      if (!built) {
        const suspects = pickSuspects(roster, null, this.draw, 0);
        const pool = buildCandidateStatements(suspects, null);
        const byMask = indexByMask(pool);
        const res = sampleTriadStatements(suspects, byMask, this.draw, profile, false);
        built = {suspects, statements: res.statements, solved: res.solved, alignment: null};
      }
    } else {
      // Scored N-back trial: balanced ~38% Full 3/3 Match, ~34% 2/3 lure, ~20% 1/3 lure, ~8% 0/3 lure.
      const scoredSoFar = this.fullMatches + this.nonMatches;
      const matchRatio = scoredSoFar ? this.fullMatches / scoredSoFar : 0.38;
      const wantFullMatch = matchRatio < 0.38 ? this.draw() < 0.56 : this.draw() < 0.24;

      if (wantFullMatch) {
        built = synthesizeFullMatch(refTrial, roster, this.draw, profile);
      }

      if (!built) {
        const wantClash = this.draw() < profile.clashRate;
        const r = this.draw();
        const targetMatches = r < 0.55 ? 2 : r < 0.86 ? 1 : 0;
        built = synthesizePartialOrMismatch(refTrial, roster, this.draw, profile, targetMatches, wantClash);
        if (!built) {
          built = synthesizePartialOrMismatch(refTrial, roster, this.draw, profile, 2, !wantClash);
        }
        if (!built) {
          built = synthesizePartialOrMismatch(refTrial, roster, this.draw, profile, 1, false);
        }
        if (!built) {
          built = synthesizeFullMatch(refTrial, roster, this.draw, profile);
        }
        if (!built) {
          // Unconditional fallback: fresh valid triad verified against refTrial
          for (let attempt = 0; attempt < 40 && !built; attempt++) {
            const suspects = pickSuspects(roster, refTrial.nback.suspects, this.draw, profile.decoyOverlapRate);
            const pool = buildCandidateStatements(suspects, null);
            const byMask = indexByMask(pool);
            const res = sampleTriadStatements(suspects, byMask, this.draw, profile, false);
            if (!res) continue;
            const alignment = analyzeNBackAlignment(refTrial.nback.statements, res.statements);
            built = {suspects, statements: res.statements, solved: res.solved, alignment};
          }
        }
      }
    }

    const {suspects, statements, solved, alignment} = built;
    const metrics = measurePremises(statements);
    const isEncoding = !refTrial;
    const isFullMatch = alignment ? alignment.isFullMatch : false;
    const isConsistent = solved.kind === 'consistent';

    if (refTrial) {
      if (isFullMatch) this.fullMatches++;
      else this.nonMatches++;
    }
    if (!isConsistent) this.clashes++;

    const expectedDecisions = alignment
      ? [
          alignment.curMatches[0],
          alignment.curMatches[1],
          alignment.curMatches[2],
          isConsistent,
          isFullMatch
        ]
      : null;

    // Dummy active range targets so ArcadeRun drives the approaching cutouts clock smoothly.
    const rangeTargets = suspects.slice(0, 2);

    const trial = {
      number,
      roster,
      pair: rangeTargets,
      targets: rangeTargets,
      validWorlds: isConsistent ? 1 : 0,
      proof: [],
      evidence: {
        mode: 'climb-the-ladder',
        level: 'climb-the-ladder',
        family: `nback-${this.nBack}-${solved.kind}-${isEncoding ? 'encode' : `m${alignment.matchedCount}`}`,
        order: '', // Intentionally empty: zero intro banner before the 3 premises
        nBack: this.nBack,
        trialNumber: number,
        refNumber: refTrial ? refTrial.number : null,
        isEncoding,
        suspects: [...suspects],
        statements: statements.map(s => s.text),
        words: metrics.words,
        chars: metrics.chars,
        leads: [],
        rows: [],
        reports: []
      },
      nback: {
        nBack: this.nBack,
        tier: profile.tier,
        isEncoding,
        isFullMatch,
        isConsistent,
        refNumber: refTrial ? refTrial.number : null,
        suspects: [...suspects],
        statements,
        solved,
        alignment,
        expectedDecisions
      }
    };

    this.history.push(trial);
    return trial;
  }
}

export function makeNBackDeck(nBack = 1, seed = null) {
  const draw = seed === null ? Math.random : seededDraw(seed);
  return new NBackSessionDeck(nBack, draw);
}
