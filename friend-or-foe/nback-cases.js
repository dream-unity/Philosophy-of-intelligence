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

function formatNameList(names) {
  if (!names || !names.length) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return names[0] + ' and ' + names[1];
  return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
}

export function measurePremises(statements) {
  const joined = statements.map(s => (typeof s === 'string' ? s : s.text)).join(' ').trim();
  const words = joined ? joined.split(/\s+/).length : 0;
  return {words, chars: joined.length, joined};
}

// Catalog of high-order relational statement constructors over 3 suspects [v0, v1, v2].
// Every constructor yields {text, mask, templateId, family, speakerIdx, shortMeaning}.
// Friends = +1 (always tell truth); Foes = -1 (always lie).
function buildCandidateStatements(suspects) {
  const out = [];
  const add = (templateId, family, speakerIdx, text, pred, shortMeaning) => {
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

    // 1. Third-order Smullyan epistemic unary traps (forces b = +1 or b = -1 regardless of speaker a!)
    add(
      'smullyan-match', 'smullyan', i,
      `${a} says ${b} matches ${a} on ${c}.`,
      (v0, v1, v2) => {
        const vs = [v0, v1, v2];
        const inner = (vs[j] * vs[k]) === (vs[i] * vs[k]);
        return (vs[i] === 1) === inner;
      },
      `${b} is Friend`
    );
    add(
      'smullyan-differ', 'smullyan', i,
      `${a} says ${b} differs from ${a} on ${c}.`,
      (v0, v1, v2) => {
        const vs = [v0, v1, v2];
        const inner = (vs[j] * vs[k]) === -(vs[i] * vs[k]);
        return (vs[i] === 1) === inner;
      },
      `${b} is Foe`
    );
    add(
      'ep-self-dneg', 'smullyan', i,
      `${a} says ${b} opposes ${pa} foe.`,
      (v0, v1, v2) => {
        const vs = [v0, v1, v2];
        const inner = vs[j] === vs[i];
        return (vs[i] === 1) === inner;
      },
      `${b} is Friend`
    );
    add(
      'ep-self-ff', 'smullyan', i,
      `${a} says ${b} backs ${pa} friend.`,
      (v0, v1, v2) => {
        const vs = [v0, v1, v2];
        const inner = vs[j] === vs[i];
        return (vs[i] === 1) === inner;
      },
      `${b} is Friend`
    );
    add(
      'ep-self-fe', 'smullyan', i,
      `${a} says ${b} backs ${pa} foe.`,
      (v0, v1, v2) => {
        const vs = [v0, v1, v2];
        const inner = vs[j] === -vs[i];
        return (vs[i] === 1) === inner;
      },
      `${b} is Foe`
    );
    add(
      'ep-self-ef', 'smullyan', i,
      `${a} says ${b} opposes ${pa} friend.`,
      (v0, v1, v2) => {
        const vs = [v0, v1, v2];
        const inner = vs[j] === -vs[i];
        return (vs[i] === 1) === inner;
      },
      `${b} is Foe`
    );

    // 2. Binary equality / opposition (depth-2, depth-3 nested, 2nd-order analogy, epistemic direct)
    add(
      'nest2-ee', 'nested2', null,
      `${a} opposes ${pb} foe.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] * vs[j] === 1; },
      `${a} = ${b}`
    );
    add(
      'nest2-ff', 'nested2', null,
      `${a} backs ${pb} friend.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] * vs[j] === 1; },
      `${a} = ${b}`
    );
    add(
      'nest3-efe', 'nested3', null,
      `${a} opposes the friend of ${pb} foe.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] * vs[j] === 1; },
      `${a} = ${b}`
    );
    add(
      'nest3-bee', 'nested3', null,
      `${a} backs the foe of ${pb} foe.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] * vs[j] === 1; },
      `${a} = ${b}`
    );
    add(
      'analogy-pos', 'analogy', null,
      `${a} matches ${b} on ${c}.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] * vs[j] === 1; },
      `${a} = ${b}`
    );
    add(
      'ep-direct-pos', 'epistemic', i,
      `${a} says ${b} is a Friend.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return (vs[i] === 1) === (vs[j] === 1); },
      `${a} = ${b}`
    );

    add(
      'nest2-fe', 'nested2', null,
      `${a} backs ${pb} foe.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] * vs[j] === -1; },
      `${a} ≠ ${b}`
    );
    add(
      'nest2-ef', 'nested2', null,
      `${a} opposes ${pb} friend.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] * vs[j] === -1; },
      `${a} ≠ ${b}`
    );
    add(
      'nest3-bfe', 'nested3', null,
      `${a} backs the friend of ${pb} foe.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] * vs[j] === -1; },
      `${a} ≠ ${b}`
    );
    add(
      'nest3-eff', 'nested3', null,
      `${a} opposes the foe of ${pb} foe.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] * vs[j] === -1; },
      `${a} ≠ ${b}`
    );
    add(
      'analogy-neg', 'analogy', null,
      `${a} differs from ${b} on ${c}.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return vs[i] * vs[j] === -1; },
      `${a} ≠ ${b}`
    );
    add(
      'ep-direct-neg', 'epistemic', i,
      `${a} says ${b} is a Foe.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return (vs[i] === 1) === (vs[j] === -1); },
      `${a} ≠ ${b}`
    );

    // 3. 3-way epistemic parity (nested + 2nd-order epistemic analogy)
    add(
      'ep-nest-ee', 'epistemic-nested', i,
      `${a} says ${b} opposes ${pc} foe.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return (vs[i] === 1) === (vs[j] * vs[k] === 1); },
      `even Foes (0 or 2)`
    );
    add(
      'ep-nest-ff', 'epistemic-nested', i,
      `${a} says ${b} backs ${pc} friend.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return (vs[i] === 1) === (vs[j] * vs[k] === 1); },
      `even Foes (0 or 2)`
    );
    add(
      'ep-analogy-pos', 'epistemic-analogy', i,
      `${a} says ${b} matches ${c} on ${a}.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return (vs[i] === 1) === (vs[j] * vs[k] === 1); },
      `even Foes (0 or 2)`
    );
    add(
      'ep-nest-fe', 'epistemic-nested', i,
      `${a} says ${b} backs ${pc} foe.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return (vs[i] === 1) === (vs[j] * vs[k] === -1); },
      `odd Foes (1 or 3)`
    );
    add(
      'ep-nest-ef', 'epistemic-nested', i,
      `${a} says ${b} opposes ${pc} friend.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return (vs[i] === 1) === (vs[j] * vs[k] === -1); },
      `odd Foes (1 or 3)`
    );
    add(
      'ep-analogy-neg', 'epistemic-analogy', i,
      `${a} says ${b} differs from ${c} on ${a}.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return (vs[i] === 1) === (vs[j] * vs[k] === -1); },
      `odd Foes (1 or 3)`
    );

    // 4. Non-linear asymmetric 2-variable conditionals
    add(
      'cond2-ff', 'conditional', null,
      `If ${a} lies, ${b} is Foe.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[i] === -1) || vs[j] === -1; },
      `${a} Foe ⇒ ${b} Foe`
    );
    add(
      'cond2-tf', 'conditional', null,
      `If ${a} is Friend, ${b} lies.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[i] === 1) || vs[j] === -1; },
      `${a} Friend ⇒ ${b} Foe`
    );
    add(
      'cond2-ft', 'conditional', null,
      `If ${a} lies, ${b} is Friend.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[i] === -1) || vs[j] === 1; },
      `${a} Foe ⇒ ${b} Friend`
    );
    add(
      'cond2-tt', 'conditional', null,
      `If ${a} is Friend, ${b} is Friend.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[i] === 1) || vs[j] === 1; },
      `${a} Friend ⇒ ${b} Friend`
    );

    // 5. Non-linear asymmetric 3-variable conditionals (and their contrapositive twins!)
    add(
      'cond3-f-neg', 'conditional3', null,
      `If ${a} lies, ${b} opposes ${pc} friend.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[i] === -1) || (vs[j] * vs[k] === -1); },
      `${a} Foe ⇒ ${b} ≠ ${c}`
    );
    add(
      'cond3-f-pos', 'conditional3', null,
      `If ${a} lies, ${b} opposes ${pc} foe.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[i] === -1) || (vs[j] * vs[k] === 1); },
      `${a} Foe ⇒ ${b} = ${c}`
    );
    add(
      'cond3-t-neg', 'conditional3', null,
      `If ${a} is Friend, ${b} backs ${pc} foe.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[i] === 1) || (vs[j] * vs[k] === -1); },
      `${a} Friend ⇒ ${b} ≠ ${c}`
    );
    add(
      'cond3-t-pos', 'conditional3', null,
      `If ${a} is Friend, ${b} backs ${pc} friend.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[i] === 1) || (vs[j] * vs[k] === 1); },
      `${a} Friend ⇒ ${b} = ${c}`
    );
    add(
      'cond3-pair-pos-f', 'conditional3', null,
      `If ${a} backs ${pb} friend, ${c} lies.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[i] * vs[j] === 1) || (vs[k] === -1); },
      `${a} = ${b} ⇒ ${c} Foe`
    );
    add(
      'cond3-pair-neg-f', 'conditional3', null,
      `If ${a} opposes ${pb} friend, ${c} lies.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[i] * vs[j] === -1) || (vs[k] === -1); },
      `${a} ≠ ${b} ⇒ ${c} Foe`
    );
    add(
      'cond3-pair-pos-t', 'conditional3', null,
      `If ${a} opposes ${pb} foe, ${c} is Friend.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[i] * vs[j] === 1) || (vs[k] === 1); },
      `${a} = ${b} ⇒ ${c} Friend`
    );
    add(
      'cond3-pair-neg-t', 'conditional3', null,
      `If ${a} backs ${pb} foe, ${c} is Friend.`,
      (v0, v1, v2) => { const vs = [v0, v1, v2]; return !(vs[i] * vs[j] === -1) || (vs[k] === 1); },
      `${a} ≠ ${b} ⇒ ${c} Friend`
    );
  }

  return out;
}

// Exhaustively solve a 3-statement cell over suspects = [v0, v1, v2].
export function solveNBackCell(suspects, statements) {
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
    // Strict minimality: dropping ANY 1 statement must leave >=2 worlds (changing Foe set).
    const pairMasks = [m1 & m2, m0 & m2, m0 & m1];
    const minimal = pairMasks.every(pm => popcount8(pm) >= 2);
    return {
      valid: minimal,
      minimal,
      kind: 'consistent',
      world: w,
      foes,
      friends,
      primaryTargets: foes,
      complementTargets: friends
    };
  }

  if (solutions.length === 0) {
    // Contradiction cell: all 3 statements must have 3 distinct speakers,
    // and EXACTLY ONE pair of statements must clash (maskA & maskB === 0)
    // while both other pairs remain consistent (> 0).
    const speakers = statements.map(s => s.speakerIdx);
    if (speakers.some(sp => sp === null || sp === undefined)) {
      return {valid: false, kind: 'contradiction-unattributed'};
    }
    if (new Set(speakers).size !== 3) {
      return {valid: false, kind: 'contradiction-duplicate-speaker'};
    }
    const pairs = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 2, 0]
    ];
    const clashes = pairs.filter(([a, b]) => (statements[a].mask & statements[b].mask) === 0);
    if (clashes.length !== 1) {
      return {valid: false, kind: 'contradiction-ambiguous-core', clashCount: clashes.length};
    }
    const [ci, cj, uninvolvedStmtIdx] = clashes[0];
    const clashingSpeakers = [suspects[speakers[ci]], suspects[speakers[cj]]];
    const uninvolvedSpeaker = [suspects[speakers[uninvolvedStmtIdx]]];
    return {
      valid: true,
      minimal: true,
      kind: 'contradiction',
      clashIndices: [ci, cj],
      uninvolvedStmtIdx,
      clashingSpeakers,
      uninvolvedSpeaker,
      primaryTargets: clashingSpeakers,
      complementTargets: uninvolvedSpeaker
    };
  }

  return {valid: false, kind: 'underdetermined', solutionCount: solutions.length};
}

// Compare Trial t-N and Trial t across all 36 (bijection phi, statement pairing sigma) alignments.
// Matching is strictly semantic (8-bit truth-set equivalence under suspect bijection).
// Tie-breaking mirrors Ontological Worlds: maximize matchedCount, then prefer earliest mismatch (0 before 1).
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
          isEcho: matchedCount === 3,
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
    if (cand !== prev) return cand < prev; // No-first deterministic tie-break
  }
  return false;
}

function targetKey(names) {
  return [...names].sort().join('/');
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

function pickSuspects(roster, refSuspects, draw, preferOverlap) {
  if (!refSuspects || !preferOverlap) {
    return shuffled(roster, draw).slice(0, 3);
  }
  const overlapCount = draw() < 0.65 ? 1 : 2;
  const reused = shuffled(refSuspects, draw).slice(0, overlapCount);
  const fresh = shuffled(roster.filter(n => !refSuspects.includes(n)), draw).slice(0, 3 - overlapCount);
  return shuffled([...reused, ...fresh], draw);
}

// Pick a bijection phi: refIdx -> curIdx that shifts every reused suspect to a DIFFERENT slot whenever possible.
function pickDecoyBijection(refSuspects, curSuspects, draw) {
  const shifted = PERMS_3.filter(phi =>
    [0, 1, 2].every(i => curSuspects[phi[i]] !== refSuspects[i])
  );
  return pickFrom(shifted.length ? shifted : PERMS_3, draw);
}

function chooseStatementForMask(byMask, mask, draw, {
  spokenOnly = false,
  requiredSpeaker = null,
  avoidTemplateId = null,
  avoidFamily = null
} = {}) {
  let cands = byMask.get(mask) || [];
  if (spokenOnly) cands = cands.filter(s => s.speakerIdx !== null);
  if (requiredSpeaker !== null) cands = cands.filter(s => s.speakerIdx === requiredSpeaker);
  if (!cands.length) return null;

  const diffFamily = avoidFamily ? cands.filter(s => s.family !== avoidFamily && s.templateId !== avoidTemplateId) : [];
  if (diffFamily.length) return pickFrom(diffFamily, draw);
  const diffTpl = avoidTemplateId ? cands.filter(s => s.templateId !== avoidTemplateId) : [];
  if (diffTpl.length) return pickFrom(diffTpl, draw);
  return pickFrom(cands, draw);
}

// High-order canonical mask archetypes for fresh Consistent trials.
// Every archetype produces 3 masks over [0,1,2] that are then randomly permuted & rendered with rich templates.
function sampleConsistentStatements(suspects, byMask, draw, desiredFoeCount) {
  const allMasks = [...byMask.keys()].filter(m => {
    const pc = popcount8(m);
    return pc === 4 || pc === 6; // unary/binary/3-way (4) or conditional (6)
  });

  // Encourage rich mixes: include at least one non-trivial high-order family (conditional / smullyan / epistemic-nested / nested3)
  const highOrderMasks = allMasks.filter(m => {
    const list = byMask.get(m);
    return list.some(s =>
      s.family === 'conditional3' || s.family === 'conditional' ||
      s.family === 'smullyan' || s.family === 'epistemic-nested' ||
      s.family === 'epistemic-analogy' || s.family === 'nested3'
    );
  });

  const condMasks = allMasks.filter(m => popcount8(m) === 6);
  const linMasks = allMasks.filter(m => popcount8(m) === 4);

  for (let attempt = 0; attempt < 260; attempt++) {
    let mA, mB, mC;
    const style = attempt % 4;
    if (style === 0 && condMasks.length) {
      // Modus Tollens / Modus Ponens: 1 conditional + 2 linear/high-order
      mA = pickFrom(condMasks, draw);
      mB = pickFrom(linMasks, draw);
      mC = pickFrom(linMasks, draw);
    } else if (style === 1 && condMasks.length >= 2) {
      // Double conditional web + 1 linear anchor
      mA = pickFrom(condMasks, draw);
      mB = pickFrom(condMasks, draw);
      mC = pickFrom(linMasks, draw);
    } else {
      // Pure high-order nested + Smullyan + epistemic parity
      mA = pickFrom(highOrderMasks, draw);
      mB = pickFrom(linMasks, draw);
      mC = pickFrom(allMasks, draw);
    }
    if (mA === mB || mB === mC || mA === mC) continue;
    const combined = mA & mB & mC;
    if (popcount8(combined) !== 1) continue;
    if (popcount8(mA & mB) < 2 || popcount8(mA & mC) < 2 || popcount8(mB & mC) < 2) continue;

    const w = worldsFromMask(combined)[0];
    const foesCount = [0, 1, 2].filter(i => worldVal(w, i) === -1).length;
    if (desiredFoeCount && foesCount !== desiredFoeCount) continue;
    if (foesCount < 1 || foesCount > 2) continue;

    const masks = shuffled([mA, mB, mC], draw);
    const chosen = [];
    const usedFamilies = new Set();
    let ok = true;
    for (const m of masks) {
      const cands = byMask.get(m) || [];
      // Prefer complex templates (smullyan, nested3, epistemic-analogy, epistemic-nested, conditional3)
      const preferred = cands.filter(s =>
        !usedFamilies.has(s.family) &&
        s.family !== 'epistemic'
      );
      const secondary = cands.filter(s => !usedFamilies.has(s.family));
      const stmt = preferred.length
        ? pickFrom(preferred, draw)
        : secondary.length
          ? pickFrom(secondary, draw)
          : pickFrom(cands, draw);
      if (!stmt) { ok = false; break; }
      usedFamilies.add(stmt.family);
      chosen.push(stmt);
    }
    if (!ok) continue;

    // Require at least 2 statements from advanced families (no trivial 3x direct epistemic!)
    const advancedCount = chosen.filter(s =>
      s.family === 'smullyan' || s.family === 'nested3' ||
      s.family === 'epistemic-nested' || s.family === 'epistemic-analogy' ||
      s.family === 'conditional3' || s.family === 'conditional' || s.family === 'analogy'
    ).length;
    if (advancedCount < 2) continue;

    const {words, chars} = measurePremises(chosen);
    if (words > MAX_PREMISE_WORDS || chars > MAX_PREMISE_CHARS) continue;

    const solved = solveNBackCell(suspects, chosen);
    if (solved.valid && solved.kind === 'consistent') {
      return {statements: chosen, solved};
    }
  }
  return null;
}

// Sample a certified Contradiction cell (3 distinct speakers, exact 1 unsatisfiable pair).
function sampleContradictionStatements(suspects, byMask, draw) {
  const spokenMasks = [...byMask.keys()].filter(m =>
    (byMask.get(m) || []).some(s => s.speakerIdx !== null)
  );
  // Complementary pairs (m1 & m2 === 0) among spoken masks
  const clashPairs = [];
  for (let a = 0; a < spokenMasks.length; a++) {
    for (let b = a + 1; b < spokenMasks.length; b++) {
      if ((spokenMasks[a] & spokenMasks[b]) === 0) {
        clashPairs.push([spokenMasks[a], spokenMasks[b]]);
      }
    }
  }

  for (let attempt = 0; attempt < 220; attempt++) {
    const [m1, m2] = pickFrom(clashPairs, draw);
    const m3 = pickFrom(spokenMasks, draw);
    if ((m1 & m3) === 0 || (m2 & m3) === 0) continue;

    const speakerOrder = shuffled([0, 1, 2], draw);
    const s1 = chooseStatementForMask(byMask, m1, draw, {spokenOnly: true, requiredSpeaker: speakerOrder[0]});
    const s2 = chooseStatementForMask(byMask, m2, draw, {spokenOnly: true, requiredSpeaker: speakerOrder[1]});
    const s3 = chooseStatementForMask(byMask, m3, draw, {spokenOnly: true, requiredSpeaker: speakerOrder[2]});
    if (!s1 || !s2 || !s3) continue;

    const chosen = shuffled([s1, s2, s3], draw);
    const advancedCount = chosen.filter(s =>
      s.family === 'smullyan' || s.family === 'epistemic-nested' || s.family === 'epistemic-analogy'
    ).length;
    if (advancedCount < 2) continue;

    const {words, chars} = measurePremises(chosen);
    if (words > MAX_PREMISE_WORDS || chars > MAX_PREMISE_CHARS) continue;

    const solved = solveNBackCell(suspects, chosen);
    if (solved.valid && solved.kind === 'contradiction') {
      return {statements: chosen, solved};
    }
  }
  return null;
}

// Synthesize a certified 3/3 Semantic Echo of refTrial with disguised syntax, shuffled order, and decoy reused names.
function synthesizeEcho(refTrial, roster, prevTargetKey, draw) {
  const refSolved = refTrial.nback.solved;
  const isContradiction = refSolved.kind === 'contradiction';

  for (let attempt = 0; attempt < 90; attempt++) {
    const suspects = pickSuspects(roster, refTrial.nback.suspects, draw, true);
    const phi = pickDecoyBijection(refTrial.nback.suspects, suspects, draw);
    const pool = buildCandidateStatements(suspects);
    const byMask = indexByMask(pool);

    const nonIdPerms = PERMS_3.slice(1);
    const sigma = pickFrom(nonIdPerms, draw);
    const chosen = [null, null, null];
    let ok = true;

    for (let k = 0; k < 3; k++) {
      const refStmt = refTrial.nback.statements[k];
      const targetMask = permuteMask(refStmt.mask, phi);
      const reqSpeaker = isContradiction ? phi[refStmt.speakerIdx] : null;
      const stmt = chooseStatementForMask(byMask, targetMask, draw, {
        spokenOnly: isContradiction,
        requiredSpeaker: reqSpeaker,
        avoidTemplateId: refStmt.templateId,
        avoidFamily: refStmt.family
      });
      if (!stmt) { ok = false; break; }
      chosen[sigma[k]] = stmt;
    }
    if (!ok) continue;

    // Require at least 2 of 3 statements to use a DIFFERENT surface template than their ref partner
    let rewritten = 0;
    for (let k = 0; k < 3; k++) {
      if (chosen[sigma[k]].templateId !== refTrial.nback.statements[k].templateId) rewritten++;
    }
    if (rewritten < 2 && attempt < 60) continue;

    const {words, chars} = measurePremises(chosen);
    if (words > MAX_PREMISE_WORDS || chars > MAX_PREMISE_CHARS) continue;

    const solved = solveNBackCell(suspects, chosen);
    if (!solved.valid || solved.kind !== refSolved.kind) continue;

    const alignment = analyzeNBackAlignment(refTrial.nback.statements, chosen);
    if (!alignment.isEcho) continue;

    // Echo inverts targets within the 3 suspects!
    const targets = solved.complementTargets;
    if (prevTargetKey && targetKey(targets) === prevTargetKey) continue;

    return {suspects, statements: chosen, solved, alignment, targets};
  }
  return null;
}

// Synthesize a certified High-Interference 2-of-3 Breach against refTrial (mutating 1 of 3 semantic rules).
function synthesizeBreach(refTrial, roster, prevTargetKey, draw, desiredKind, desiredBulletCount) {
  for (let attempt = 0; attempt < 180; attempt++) {
    const suspects = pickSuspects(roster, refTrial.nback.suspects, draw, true);
    const phi = pickDecoyBijection(refTrial.nback.suspects, suspects, draw);
    const pool = buildCandidateStatements(suspects);
    const byMask = indexByMask(pool);

    const dropRefIdx = Math.floor(draw() * 3);
    const keepIndices = [0, 1, 2].filter(i => i !== dropRefIdx);
    const keepMasks = keepIndices.map(i => permuteMask(refTrial.nback.statements[i].mask, phi));

    const wantContradiction = desiredKind === 'contradiction';

    if (wantContradiction) {
      // To form a valid 2-of-3 Contradiction Breach:
      // Either the 2 kept masks already clash (keepMasks[0] & keepMasks[1] === 0) and we swap the 3rd non-clashing mask,
      // OR the 2 kept masks don't clash and the new 3rd mask clashes with EXACTLY ONE of them!
      const alreadyClashes = (keepMasks[0] & keepMasks[1]) === 0;
      const spokenMasks = [...byMask.keys()].filter(m =>
        (byMask.get(m) || []).some(s => s.speakerIdx !== null)
      );
      const thirdCandidates = spokenMasks.filter(m => {
        if (m === permuteMask(refTrial.nback.statements[dropRefIdx].mask, phi)) return false;
        if (alreadyClashes) {
          return (keepMasks[0] & m) !== 0 && (keepMasks[1] & m) !== 0;
        }
        const c0 = (keepMasks[0] & m) === 0;
        const c1 = (keepMasks[1] & m) === 0;
        return (c0 !== c1);
      });
      if (!thirdCandidates.length) continue;

      const m3 = pickFrom(thirdCandidates, draw);
      const speakers = shuffled([0, 1, 2], draw);
      const s0 = chooseStatementForMask(byMask, keepMasks[0], draw, {
        spokenOnly: true,
        requiredSpeaker: speakers[0],
        avoidTemplateId: refTrial.nback.statements[keepIndices[0]].templateId
      });
      const s1 = chooseStatementForMask(byMask, keepMasks[1], draw, {
        spokenOnly: true,
        requiredSpeaker: speakers[1],
        avoidTemplateId: refTrial.nback.statements[keepIndices[1]].templateId
      });
      const s2 = chooseStatementForMask(byMask, m3, draw, {
        spokenOnly: true,
        requiredSpeaker: speakers[2]
      });
      if (!s0 || !s1 || !s2) continue;

      const chosen = shuffled([s0, s1, s2], draw);
      const {words, chars} = measurePremises(chosen);
      if (words > MAX_PREMISE_WORDS || chars > MAX_PREMISE_CHARS) continue;

      const solved = solveNBackCell(suspects, chosen);
      if (!solved.valid || solved.kind !== 'contradiction') continue;

      const alignment = analyzeNBackAlignment(refTrial.nback.statements, chosen);
      if (alignment.matchedCount !== 2) continue;

      const targets = solved.primaryTargets; // Breach => standard target set (2 clashing speakers)
      if (prevTargetKey && targetKey(targets) === prevTargetKey) continue;

      return {suspects, statements: chosen, solved, alignment, targets};
    } else {
      // Consistent 2-of-3 Breach: keep 2 permuted masks (provided their intersection has >= 2 worlds),
      // pick a 3rd mask that narrows to exact 1 world with desiredBulletCount Foes!
      const baseMask = keepMasks[0] & keepMasks[1];
      if (popcount8(baseMask) < 2) continue;

      const dropOrigMask = permuteMask(refTrial.nback.statements[dropRefIdx].mask, phi);
      const validThirdMasks = [...byMask.keys()].filter(m => {
        if (m === dropOrigMask || m === keepMasks[0] || m === keepMasks[1]) return false;
        const comb = baseMask & m;
        if (popcount8(comb) !== 1) return false;
        if (popcount8(keepMasks[0] & m) < 2 || popcount8(keepMasks[1] & m) < 2) return false;
        const w = worldsFromMask(comb)[0];
        const foesCount = [0, 1, 2].filter(i => worldVal(w, i) === -1).length;
        if (desiredBulletCount && foesCount !== desiredBulletCount) return false;
        return foesCount === 1 || foesCount === 2;
      });
      if (!validThirdMasks.length) continue;

      const m3 = pickFrom(validThirdMasks, draw);
      const s0 = chooseStatementForMask(byMask, keepMasks[0], draw, {
        avoidTemplateId: refTrial.nback.statements[keepIndices[0]].templateId,
        avoidFamily: refTrial.nback.statements[keepIndices[0]].family
      });
      const s1 = chooseStatementForMask(byMask, keepMasks[1], draw, {
        avoidTemplateId: refTrial.nback.statements[keepIndices[1]].templateId,
        avoidFamily: refTrial.nback.statements[keepIndices[1]].family
      });
      const s2 = chooseStatementForMask(byMask, m3, draw);
      if (!s0 || !s1 || !s2) continue;

      const chosen = shuffled([s0, s1, s2], draw);
      const {words, chars} = measurePremises(chosen);
      if (words > MAX_PREMISE_WORDS || chars > MAX_PREMISE_CHARS) continue;

      const solved = solveNBackCell(suspects, chosen);
      if (!solved.valid || solved.kind !== 'consistent') continue;

      const alignment = analyzeNBackAlignment(refTrial.nback.statements, chosen);
      if (alignment.matchedCount !== 2) continue;

      const targets = solved.primaryTargets; // Breach => standard target set (deduced Foes)
      if (prevTargetKey && targetKey(targets) === prevTargetKey) continue;

      return {suspects, statements: chosen, solved, alignment, targets};
    }
  }

  // Fallback: fresh independent cell guaranteed to be a non-echo (< 3/3 match)
  for (let attempt = 0; attempt < 80; attempt++) {
    const suspects = pickSuspects(roster, refTrial.nback.suspects, draw, true);
    const pool = buildCandidateStatements(suspects);
    const byMask = indexByMask(pool);
    const built = desiredKind === 'contradiction'
      ? sampleContradictionStatements(suspects, byMask, draw)
      : sampleConsistentStatements(suspects, byMask, draw, desiredBulletCount);
    if (!built) continue;
    const alignment = analyzeNBackAlignment(refTrial.nback.statements, built.statements);
    if (alignment.isEcho) continue;
    const targets = built.solved.primaryTargets;
    if (prevTargetKey && targetKey(targets) === prevTargetKey) continue;
    return {suspects, statements: built.statements, solved: built.solved, alignment, targets};
  }
  return null;
}

function buildProofAndDebrief({number, nBack, refTrial, suspects, statements, solved, alignment, targets}) {
  const proof = [];
  if (solved.kind === 'consistent') {
    const fLabel = formatNameList(solved.friends);
    const eLabel = formatNameList(solved.foes);
    proof.push(`Resolved loyalty: ${fLabel} (${solved.friends.length === 1 ? 'Friend' : 'Friends'}) · ${eLabel} (${solved.foes.length === 1 ? 'Foe' : 'Foes'}).`);
  } else {
    const [ci, cj] = solved.clashIndices;
    proof.push(`Contradiction: lines ${ci + 1} and ${cj + 1} directly clash (${formatNameList(solved.clashingSpeakers)}); ${solved.uninvolvedSpeaker[0]} is uninvolved.`);
  }

  // Explain each statement's reduced logical meaning
  proof.push(
    statements.map((s, idx) => `(${idx + 1}) ${s.shortMeaning}`).join(' · ')
  );

  let aliasKey = null;
  let comparisonSummary = null;
  if (refTrial && alignment) {
    const refSuspects = refTrial.nback.suspects;
    aliasKey = [0, 1, 2].map(i => `${refSuspects[i]}→${suspects[alignment.phi[i]]}`).join(' · ');
    const refNum = refTrial.number;
    if (alignment.isEcho) {
      comparisonSummary = `3/3 echo of briefing #${refNum} (${aliasKey}) — inverted target set to ${formatNameList(targets)}.`;
    } else {
      const broken = alignment.mismatchIndices.map(i => i + 1).join(', ');
      comparisonSummary = `${alignment.matchedCount}/3 breach vs briefing #${refNum} (${aliasKey}; broken line ${broken}) — standard target set ${formatNameList(targets)}.`;
    }
    proof.push(comparisonSummary);
  } else {
    proof.push(`Warm-up briefing #${number} — hold these 3 logical rules for ${nBack}-back.`);
  }

  return {
    proof,
    nbackDebrief: {
      refNumber: refTrial ? refTrial.number : null,
      refStatements: refTrial ? refTrial.nback.statements.map(s => s.text) : null,
      verdictKind: solved.kind,
      isEcho: alignment ? alignment.isEcho : false,
      matchedCount: alignment ? alignment.matchedCount : null,
      aliasKey,
      curMatches: alignment ? alignment.curMatches : null,
      mismatchIndices: alignment ? alignment.mismatchIndices : [],
      clashIndices: solved.kind === 'contradiction' ? solved.clashIndices : []
    }
  };
}

export class NBackSessionDeck {
  constructor(nBack = 1, draw = Math.random) {
    const n = Number(nBack);
    if (!Number.isInteger(n) || n < MIN_NBACK || n > MAX_NBACK) {
      throw new RangeError(`Choose an N-back level from ${MIN_NBACK} to ${MAX_NBACK}.`);
    }
    this.nBack = n;
    this.draw = draw;
    this.history = [];
    this.echoes = 0;
    this.breaches = 0;
    this.contradictions = 0;
    this.oneBulletCount = 0;
    this.twoBulletCount = 0;
  }

  nextTrial() {
    const number = this.history.length + 1;
    const roster = [...networkRoster];
    const prev = this.history.length ? this.history[this.history.length - 1] : null;
    const prevTargetKey = prev ? targetKey(prev.pair) : null;
    const refTrial = number > this.nBack ? this.history[number - 1 - this.nBack] : null;

    let built = null;
    let isEcho = false;

    if (!refTrial) {
      // Warm-up trial (1..N): balanced mix of 1-Foe, 2-Foe, and Contradiction
      const wantContradiction = this.draw() < 0.30;
      const desiredFoeCount = this.oneBulletCount <= this.twoBulletCount ? 1 : 2;
      for (let attempt = 0; attempt < 60 && !built; attempt++) {
        const suspects = pickSuspects(roster, prev?.nback?.suspects, this.draw, false);
        const pool = buildCandidateStatements(suspects);
        const byMask = indexByMask(pool);
        const res = wantContradiction
          ? sampleContradictionStatements(suspects, byMask, this.draw)
          : sampleConsistentStatements(suspects, byMask, this.draw, desiredFoeCount);
        if (!res) continue;
        const targets = res.solved.primaryTargets;
        if (prevTargetKey && targetKey(targets) === prevTargetKey) continue;
        built = {suspects, statements: res.statements, solved: res.solved, alignment: null, targets};
      }
      if (!built) {
        // Unconditional fallback
        const suspects = pickSuspects(roster, null, this.draw, false);
        const pool = buildCandidateStatements(suspects);
        const byMask = indexByMask(pool);
        const res = sampleConsistentStatements(suspects, byMask, this.draw, null);
        built = {suspects, statements: res.statements, solved: res.solved, alignment: null, targets: res.solved.primaryTargets};
      }
    } else {
      // Scored N-back trial: ~44% Echo, ~56% High-Interference 2/3 Breach, balanced 1-bullet vs 2-bullet
      const scoredSoFar = this.echoes + this.breaches;
      const echoRatio = scoredSoFar ? this.echoes / scoredSoFar : 0.44;
      const wantEcho = echoRatio < 0.44 ? this.draw() < 0.62 : this.draw() < 0.30;

      if (wantEcho) {
        built = synthesizeEcho(refTrial, roster, prevTargetKey, this.draw);
        if (built) isEcho = true;
      }
      if (!built) {
        const wantContradiction = this.draw() < 0.32;
        const desiredBulletCount = wantContradiction
          ? 2
          : (this.oneBulletCount <= this.twoBulletCount ? 1 : 2);
        built = synthesizeBreach(refTrial, roster, prevTargetKey, this.draw, wantContradiction ? 'contradiction' : 'consistent', desiredBulletCount);
        if (!built && wantContradiction) {
          built = synthesizeBreach(refTrial, roster, prevTargetKey, this.draw, 'consistent', 1);
        }
        if (!built) {
          built = synthesizeEcho(refTrial, roster, prevTargetKey, this.draw);
          if (built) isEcho = true;
        }
      }
    }

    const {suspects, statements, solved, alignment, targets} = built;
    const metrics = measurePremises(statements);
    const {proof, nbackDebrief} = buildProofAndDebrief({
      number,
      nBack: this.nBack,
      refTrial,
      suspects,
      statements,
      solved,
      alignment,
      targets
    });

    if (refTrial) {
      if (isEcho) this.echoes++;
      else this.breaches++;
    }
    if (solved.kind === 'contradiction') this.contradictions++;
    if (targets.length === 1) this.oneBulletCount++;
    else this.twoBulletCount++;

    const order = refTrial
      ? `${this.nBack}-back vs #${refTrial.number}: shoot Foes (or clashing pair); invert on a 3/3 echo.`
      : `Warm-up #${number} · Hold for ${this.nBack}-back. Shoot Foes, or the two clashing speakers.`;

    const trial = {
      number,
      roster,
      pair: [...targets],
      targets: [...targets],
      validWorlds: solved.kind === 'consistent' ? 1 : 0,
      proof,
      nbackDebrief,
      evidence: {
        mode: 'climb-the-ladder',
        level: 'climb-the-ladder',
        family: `nback-${this.nBack}-${solved.kind}-${isEcho ? 'echo' : refTrial ? 'breach' : 'warmup'}`,
        order,
        nBack: this.nBack,
        trialNumber: number,
        refNumber: refTrial ? refTrial.number : null,
        isWarmup: !refTrial,
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
        isWarmup: !refTrial,
        isEcho,
        refNumber: refTrial ? refTrial.number : null,
        suspects: [...suspects],
        statements,
        solved,
        alignment
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
