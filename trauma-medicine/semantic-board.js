// Semantic 6-Card Clinical Board Primitives & Coupled 2-SAT Cross-Check Solver.
// Replaces abstract graph pairs with crystal-clear, layperson-readable clinical facts
// while preserving Friend-or-Foe's disputed (?) Test Flip & live Cross-Check engine on Tiers 4–6.

import { PATIENT_BY_ID, PATIENT_IDS } from './roster.js';
import { shuffle } from './case-layout.js';

export function pName(id) {
  return PATIENT_BY_ID[id]?.name || id;
}

export function pBay(id) {
  const idx = PATIENT_IDS.indexOf(id);
  return idx >= 0 ? idx + 1 : 1;
}

export function formatList(ids) {
  if (!ids || !ids.length) return 'no one';
  const names = ids.map(pName);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

export function uniqueSortedIds(ids) {
  const seen = new Set(ids);
  return PATIENT_IDS.filter((id) => seen.has(id));
}

export function pickPlayers(rng, count = 10) {
  return shuffle(rng, PATIENT_IDS).slice(0, count);
}

/**
 * Create a plain-English clinical fact line for a card.
 * `patients` lists the patient IDs mentioned so hovering a bay highlights this card.
 */
export function fact(text, patients, data = {}) {
  const list = Array.isArray(patients) ? patients : patients ? [patients] : [];
  return {
    text,
    patients: [...new Set(list)],
    ...data,
  };
}

/**
 * Build one of the 6 clinical report cards.
 * `shown` is the primary array of 2 clinical facts; `alt` is an alternative version used when disputed.
 */
export function makeCard({
  index,
  time,
  wing,
  wingIndex = 0,
  label,
  shown,
  alt = null,
  badge = null,
  badgeTone = 'neutral',
}) {
  return {
    index,
    time: time || `0${index + 1}:00`,
    site: wing,
    siteIndex: wingIndex,
    label,
    badge,
    badgeTone,
    shownFacts: shown,
    altFacts: alt || shown,
    disputed: false,
  };
}

export function activeFactsFor(card, worldMask) {
  const useShown = !card.disputed || Boolean((worldMask >> card.index) & 1);
  return useShown ? card.shownFacts : card.altFacts;
}

export function resolveBoard(cards, worldMask) {
  return cards.map((c) => ({
    ...c,
    facts: activeFactsFor(c, worldMask),
  }));
}

export function buildRivalInfo(targets, candidates, reasonFn) {
  const tSet = new Set(targets);
  const rivalId = candidates.find((id) => id && !tSet.has(id));
  if (!rivalId) return null;
  return {
    patientId: rivalId,
    patientName: pName(rivalId),
    reason: reasonFn(rivalId),
  };
}

function truthBit(mask, idx) {
  return Boolean((mask >> idx) & 1);
}

function makeClause(type, a, b, trueMask, cards) {
  const nameA = cards[a].label;
  const nameB = b !== null && b !== undefined ? cards[b].label : '';
  const bitA = truthBit(trueMask, a);
  const bitB = b !== null && b !== undefined ? truthBit(trueMask, b) : false;

  if (type === 'unit') {
    return {
      id: `unit-${a}`,
      kind: 'unit',
      symbol: '!',
      indices: [a],
      text: bitA
        ? `"${nameA}" is accurate as printed.`
        : `"${nameA}" has an error — flip to its alternate reading.`,
      evaluate: (mask) => truthBit(mask, a) === bitA,
    };
  }

  if (type === 'same') {
    const equal = bitA === bitB;
    return {
      id: `same-${a}-${b}`,
      kind: 'biconditional',
      symbol: equal ? '↔' : '⊕',
      indices: [a, b],
      text: equal
        ? `"${nameA}" and "${nameB}" are either BOTH accurate or BOTH need flipping.`
        : `Exactly ONE of "${nameA}" or "${nameB}" is accurate as printed.`,
      evaluate: (mask) => (truthBit(mask, a) === truthBit(mask, b)) === equal,
    };
  }

  if (type === 'imply') {
    if (bitA && !bitB) {
      return {
        id: `imp-${a}-not-${b}`,
        kind: 'implication',
        symbol: '→',
        indices: [a, b],
        text: `If "${nameA}" is accurate, then "${nameB}" must be flipped.`,
        evaluate: (mask) => !truthBit(mask, a) || !truthBit(mask, b),
      };
    }
    if (!bitA && bitB) {
      return {
        id: `imp-not-${a}-${b}`,
        kind: 'implication',
        symbol: '∨',
        indices: [a, b],
        text: `At least ONE of "${nameA}" or "${nameB}" is accurate as printed.`,
        evaluate: (mask) => truthBit(mask, a) || truthBit(mask, b),
      };
    }
    if (!bitA && !bitB) {
      return {
        id: `imp-notboth-${a}-${b}`,
        kind: 'implication',
        symbol: '→',
        indices: [a, b],
        text: `If "${nameA}" is flipped, then "${nameB}" must also be flipped.`,
        evaluate: (mask) => truthBit(mask, a) || !truthBit(mask, b),
      };
    }
    return {
      id: `imp-${a}-${b}`,
      kind: 'implication',
      symbol: '→',
      indices: [a, b],
      text: `If "${nameA}" is accurate, then "${nameB}" is also accurate.`,
      evaluate: (mask) => !truthBit(mask, a) || truthBit(mask, b),
    };
  }

  return null;
}

/**
 * Synthesize confirmed or disputed (?) semantic board with coupled Cross-Checks.
 * Guarantees:
 * - Tiers 1–3 (`disputedCount === 0`): confirmed 6-card board with 1–3 exact targets.
 * - Tiers 4–6 (`disputedCount === 1 | 3 | 6`):
 *   - Unique valid world (`trueWorldMask`) satisfying all Cross-Checks.
 *   - Target-ID minimality: flipping ANY disputed card breaks a check and/or changes targets.
 *   - Every Cross-Check uses crystal-clear plain English referencing the card's real title.
 */
export function synthesizeSemanticLogic(rng, rawCards, evaluateFn, disputedCount = 0) {
  const cards = rawCards.map((c, i) => ({
    ...c,
    index: i,
    disputed: false,
  }));

  // Tiers 1–3: confirmed charts
  if (disputedCount <= 0) {
    const res = evaluateFn(resolveBoard(cards, 0b111111));
    if (!res || !res.targets || res.targets.length < 1 || res.targets.length > 3) {
      return null;
    }
    return {
      records: cards,
      trueWorldMask: 0b111111,
      crossChecks: [],
      trueTargets: uniqueSortedIds(res.targets),
      evaluation: res,
    };
  }

  // Only cards whose altFacts differ meaningfully from shownFacts are good disputed candidates
  const flippableIndices = cards
    .map((c, i) => ({
      i,
      differs: JSON.stringify(c.shownFacts.map((f) => f.text)) !== JSON.stringify(c.altFacts.map((f) => f.text)),
    }))
    .filter((x) => x.differs)
    .map((x) => x.i);

  if (flippableIndices.length === 0) return null;
  const count = Math.min(disputedCount, flippableIndices.length);
  const disputedIndices = shuffle(rng, flippableIndices).slice(0, count).sort((a, b) => a - b);

  for (const idx of disputedIndices) {
    cards[idx].disputed = true;
  }

  // Enumerate all candidate truth masks over the disputed indices
  const totalWorlds = 1 << disputedIndices.length;
  const candidateMasks = [];
  for (let w = 0; w < totalWorlds; w++) {
    let mask = 0b111111;
    for (let bit = 0; bit < disputedIndices.length; bit++) {
      const idx = disputedIndices[bit];
      if (!((w >> bit) & 1)) {
        mask &= ~(1 << idx);
      }
    }
    candidateMasks.push(mask);
  }

  // Prefer masks where at least one disputed card genuinely needs flipping (not all-shown)
  const shuffledMasks = shuffle(rng, candidateMasks);
  let chosenMask = null;
  let chosenEval = null;

  for (const mask of shuffledMasks) {
    const flippedAny = disputedIndices.some((idx) => !truthBit(mask, idx));
    if (disputedIndices.length >= 1 && !flippedAny && shuffledMasks.length > 1) continue;
    const res = evaluateFn(resolveBoard(cards, mask));
    if (res && res.targets && res.targets.length >= 1 && res.targets.length <= 3) {
      chosenMask = mask;
      chosenEval = res;
      break;
    }
  }

  if (chosenMask === null) {
    for (const mask of shuffledMasks) {
      const res = evaluateFn(resolveBoard(cards, mask));
      if (res && res.targets && res.targets.length >= 1 && res.targets.length <= 3) {
        chosenMask = mask;
        chosenEval = res;
        break;
      }
    }
  }

  if (chosenMask === null) return null;

  // Build coupled Cross-Checks that uniquely isolate chosenMask
  const checks = [];
  if (disputedIndices.length === 1) {
    checks.push(makeClause('unit', disputedIndices[0], null, chosenMask, cards));
  } else {
    // Anchor the first disputed card, then couple the rest in a chain with crisp plain-English links
    const order = shuffle(rng, disputedIndices);
    checks.push(makeClause('unit', order[0], null, chosenMask, cards));
    for (let i = 0; i < order.length - 1; i++) {
      checks.push(makeClause('same', order[i], order[i + 1], chosenMask, cards));
    }
    // Add 1 extra cross-check on 6-disputed Chief boards for rich coupled verification
    if (order.length >= 4) {
      checks.push(makeClause('imply', order[1], order[order.length - 1], chosenMask, cards));
    }
  }

  // Verify unique satisfiability across all worlds
  const satisfying = candidateMasks.filter((m) => checks.every((ch) => ch.evaluate(m)));
  if (satisfying.length !== 1 || satisfying[0] !== chosenMask) {
    return null;
  }

  return {
    records: cards,
    trueWorldMask: chosenMask,
    crossChecks: checks,
    trueTargets: uniqueSortedIds(chosenEval.targets),
    evaluation: chosenEval,
  };
}
