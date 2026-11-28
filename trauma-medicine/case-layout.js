// Seeded PRNG, 6-channel 12-edge clinical chart builder, timestamps, site/bay tags,
// and 3 leak-free epistemic uncertainty modes (direction reversal, patient swap, alternate reading).

import { CHANNEL_IDS, PATIENT_IDS, PATIENT_BY_ID } from './roster.js';

export const CLINICAL_TIMES = Object.freeze([
  '01:00',
  '02:00',
  '03:00',
  '04:00',
  '05:00',
  '06:00',
]);

export const UNCERTAINTY_MODES = Object.freeze(['reverse', 'swap', 'alt']);

export function createRng(seed) {
  let a = (seed >>> 0) || 1;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function shuffle(rng, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Build a 6-channel clinical chart (2 directed links per channel = 12 links total)
 * covering all 10 patients so no patient is ever orphaned and mention counts stay balanced.
 * Each channel receives a shuffled unique timestamp ('01:00'..'06:00') and a balanced 3v3 site tag.
 */
export function buildClinicalChart(rng, scenario) {
  const times = shuffle(rng, CLINICAL_TIMES);
  const weights = shuffle(rng, [1, 2, 3, 4, 5, 6]);
  const minutesList = shuffle(rng, [1, 2, 3, 4, 5, 6]);
  const siteIdxList = shuffle(rng, [0, 0, 0, 1, 1, 1]);
  const patients = shuffle(rng, PATIENT_IDS);

  // Assign 24 endpoints across 12 directed links so every one of the 10 patients appears 2-3 times
  // with zero self-loops and no duplicate edge inside a channel.
  const endpoints = [];
  for (let i = 0; i < 10; i++) {
    endpoints.push(patients[i], patients[i]);
  }
  // 4 extra appearances distributed across 4 distinct patients
  for (let i = 0; i < 4; i++) {
    endpoints.push(patients[i]);
  }

  const records = [];
  let attempt = 0;
  let pairs = null;

  while (!pairs && attempt < 40) {
    attempt++;
    const pool = shuffle(rng, endpoints);
    const candidate = [];
    let ok = true;
    for (let i = 0; i < 12; i++) {
      let a = pool[i * 2];
      let b = pool[i * 2 + 1];
      if (a === b) {
        // Swap with a later slot to eliminate self-loop
        let fixed = false;
        for (let k = i * 2 + 2; k < pool.length; k++) {
          if (pool[k] !== a) {
            [pool[i * 2 + 1], pool[k]] = [pool[k], pool[i * 2 + 1]];
            b = pool[i * 2 + 1];
            fixed = true;
            break;
          }
        }
        if (!fixed) {
          ok = false;
          break;
        }
      }
      candidate.push([a, b]);
    }
    if (!ok) continue;

    // Ensure within each channel (pairs 2*c and 2*c+1) the two links are distinct
    for (let c = 0; c < 6; c++) {
      const [a1, b1] = candidate[c * 2];
      const [a2, b2] = candidate[c * 2 + 1];
      if (a1 === a2 && b1 === b2) {
        ok = false;
        break;
      }
    }
    if (ok) pairs = candidate;
  }

  // Deterministic fallback pairing if random retries miss
  if (!pairs) {
    pairs = [];
    for (let i = 0; i < 12; i++) {
      const a = patients[i % 10];
      const b = patients[(i + 1 + Math.floor(i / 10)) % 10];
      pairs.push([a, b]);
    }
  }

  for (let c = 0; c < 6; c++) {
    const channelId = CHANNEL_IDS[c];
    const chMeta = scenario.channels[channelId];
    const link1 = pairs[c * 2];
    const link2 = pairs[c * 2 + 1];
    const time = times[c];
    const siteIdx = siteIdxList[c];
    const site = scenario.sites[siteIdx];

    records.push({
      index: c,
      channelId,
      label: chMeta.label,
      shortLabel: chMeta.short,
      verb: chMeta.verb,
      time,
      timeRank: CLINICAL_TIMES.indexOf(time),
      weight: weights[c],
      minutes: minutesList[c],
      siteIdx,
      site,
      // Canonical (true-if-bit=1) pair of edges
      trueEdges: [
        { from: link1[0], to: link1[1] },
        { from: link2[0], to: link2[1] },
      ],
      // Epistemic uncertainty metadata populated later by case-logic.js
      disputed: false,
      uncertaintyMode: null,
      shownEdges: [
        { from: link1[0], to: link1[1] },
        { from: link2[0], to: link2[1] },
      ],
      altEdges: null,
      swapPair: null,
      shownMatchesTruth: true,
    });
  }

  return records;
}

/**
 * Attach one of 3 leak-free epistemic uncertainty presentations to a disputed record:
 *   - 'reverse': either the printed arrows hold, or both links in this channel are reversed.
 *   - 'swap': chart mix-up between two patients (Swap X and Y?) affecting this record.
 *   - 'alt': alternate chart reading on the second link (or X -> Y?).
 * Presentation polarity (shownMatchesTruth) is randomized 50/50 so syntax never leaks truth.
 */
export function attachUncertainty(rng, record, trueBit) {
  const mode = pick(rng, UNCERTAINTY_MODES);
  const [e0, e1] = record.trueEdges;
  let flippedEdges;
  let swapPair = null;

  if (mode === 'reverse') {
    flippedEdges = [
      { from: e0.to, to: e0.from },
      { from: e1.to, to: e1.from },
    ];
  } else if (mode === 'swap') {
    // Pick two distinct patients appearing in this record and swap them across both edges
    const present = Array.from(new Set([e0.from, e0.to, e1.from, e1.to]));
    const pA = present[0];
    const pB = present[1] || PATIENT_IDS.find((id) => id !== pA);
    swapPair = [pA, pB];
    const swapId = (id) => (id === pA ? pB : id === pB ? pA : id);
    flippedEdges = [
      { from: swapId(e0.from), to: swapId(e0.to) },
      { from: swapId(e1.from), to: swapId(e1.to) },
    ];
    // Guarantee flipped differs from trueEdges
    if (
      flippedEdges[0].from === e0.from &&
      flippedEdges[0].to === e0.to &&
      flippedEdges[1].from === e1.from &&
      flippedEdges[1].to === e1.to
    ) {
      flippedEdges = [
        { from: e0.to, to: e0.from },
        { from: e1.to, to: e1.from },
      ];
    }
  } else {
    // 'alt': alternate destination on link 2 (or link 1)
    const others = PATIENT_IDS.filter((id) => id !== e1.from && id !== e1.to);
    const altTo = pick(rng, others);
    flippedEdges = [
      { from: e0.from, to: e0.to },
      { from: e1.from, to: altTo },
    ];
  }

  // bit === 1 means shownEdges hold; bit === 0 means altEdges (flipped) hold.
  // So if trueBit === 1, shownEdges = trueEdges, altEdges = flippedEdges.
  // If trueBit === 0, shownEdges = flippedEdges, altEdges = trueEdges.
  const shownEdges = trueBit === 1 ? record.trueEdges : flippedEdges;
  const altEdges = trueBit === 1 ? flippedEdges : record.trueEdges;

  return {
    ...record,
    disputed: true,
    uncertaintyMode: mode,
    shownEdges,
    altEdges,
    swapPair,
    shownMatchesTruth: trueBit === 1,
  };
}

export function formatEdgeShort(edge, verb) {
  const fromName = PATIENT_BY_ID[edge.from]?.name || edge.from;
  const toName = PATIENT_BY_ID[edge.to]?.name || edge.to;
  return `${fromName} ${verb} ${toName}`;
}
