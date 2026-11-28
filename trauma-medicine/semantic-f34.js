// Relational-First Clinical Reasoning Engines — Families 3 & 4 (#21–#41)
// Fluid-intelligence relational chains, structural analogies, spatial/temporal maps & comparative math
// through Relational/Abstract (#21–#32) & Predictive/Quantitative (#33–#41) trauma medicine.
// Zero filler cards, zero pre-computed math giveaways, zero medical jargon, zero spoilers.

import {
  pName,
  pBay,
  formatList,
  uniqueSortedIds,
  pickPlayers,
  fact,
  makeCard,
  buildRivalInfo,
} from './semantic-board.js';

function tagSet(cards, tag) {
  const out = [];
  for (const c of cards) {
    for (const f of c.facts) {
      if (f.tag === tag && f.patients.length) out.push(f.patients[0]);
    }
  }
  return new Set(uniqueSortedIds(out));
}

function factsByTag(cards, tag) {
  const out = [];
  for (const c of cards) {
    for (const f of c.facts) {
      if (f.tag === tag) out.push({ ...f, card: c });
    }
  }
  return out;
}

export const SEMANTIC_F34 = {
  // =========================================================================
  // FAMILY 3: RELATIONAL & ABSTRACT REASONING (#21–#32)
  // =========================================================================

  // #21 Analogical reasoning (Inside · Atomic)
  // Structural mapping A : B :: C : D — "Full Tank + Working Pump + Blocked Single Line"
  'analogical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Structure Map', wingIndex: 0, label: 'Reference Relation (A :: B)',
        shown: [
          fact(`Engine :: Pinched Fuel Line → FULL tank + strong pump + ONE starved branch.`, [], { tag: 'rule' }),
          fact(`Match the EXACT same relation in blood flow: normal blood volume + strong heart + ONE cold pulseless limb.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:05', wing: 'Circulation A', wingIndex: 1, label: 'Blood Tank Comparison',
        shown: [
          fact(`${pName(a)} has MORE blood volume than bleeding ${pName(b)} (normal full tank, SAME AS healthy ${pName(f)}).`, [a, b, f], { tag: 'full_tank', p: a }),
          fact(`${pName(c)}'s blood volume is ALSO full — EQUAL TO ${pName(a)}'s — while ${pName(d)} lost HALF their blood.`, [c, a, d], { tag: 'full_tank', p: c }),
        ],
        alt: [
          fact(`${pName(b)} has MORE blood volume than bleeding ${pName(a)} (normal full tank, SAME AS healthy ${pName(f)}).`, [b, a, f], { tag: 'full_tank', p: b }),
          fact(`${pName(c)}'s blood volume is ALSO full — EQUAL TO ${pName(b)}'s — while ${pName(d)} lost HALF their blood.`, [c, b, d], { tag: 'full_tank', p: c }),
        ],
      }),
      makeCard({
        index: 2, time: '01:08', wing: 'Heart Echo', wingIndex: 0, label: 'Pump Strength Comparison',
        shown: [
          fact(`${pName(a)}'s heart pump is STRONGER THAN ${pName(c)}'s failing pump (matches ${pName(f)}'s strong beat).`, [a, c, f], { tag: 'good_pump', p: a }),
          fact(`${pName(e)}'s heart pump is ALSO strong — SAME AS ${pName(a)}'s — while ${pName(c)}'s pump barely squeezes.`, [e, a, c], { tag: 'good_pump', p: e }),
        ],
        alt: [
          fact(`${pName(b)}'s heart pump is STRONGER THAN ${pName(c)}'s failing pump (matches ${pName(f)}'s strong beat).`, [b, c, f], { tag: 'good_pump', p: b }),
          fact(`${pName(e)}'s heart pump is ALSO strong — SAME AS ${pName(b)}'s — while ${pName(c)}'s pump barely squeezes.`, [e, b, c], { tag: 'good_pump', p: e }),
        ],
      }),
      makeCard({
        index: 3, time: '01:11', wing: 'Limb Doppler', wingIndex: 1, label: 'Single-Line vs. Whole-Body',
        shown: [
          fact(`${pName(a)}'s right leg is ice-cold with ZERO pulse while ${pName(a)}'s left leg is warm — UNLIKE ${pName(b)} and ${pName(d)}.`, [a, b, d], { tag: 'one_pinch', p: a }),
          fact(`${pName(b)} and ${pName(d)} have ALL four limbs cold together with collapsed blood volume.`, [b, d], { tag: 'all_cold', p: b }),
        ],
        alt: [
          fact(`${pName(b)}'s right leg is ice-cold with ZERO pulse while ${pName(b)}'s left leg is warm — UNLIKE ${pName(a)} and ${pName(d)}.`, [b, a, d], { tag: 'one_pinch', p: b }),
          fact(`${pName(a)} and ${pName(d)} have ALL four limbs cold together with collapsed blood volume.`, [a, d], { tag: 'all_cold', p: a }),
        ],
      }),
      makeCard({
        index: 4, time: '01:14', wing: 'Limb Doppler', wingIndex: 1, label: 'Cross-Bay Verification',
        shown: [
          fact(`${pName(e)} has warm pink pulses in ALL four limbs — OPPOSITE OF a blocked limb line.`, [e], { tag: 'all_warm', p: e }),
          fact(`${pName(c)} has fluid backing up into BOTH lungs from a failing heart motor — DIFFERENT from a single pinched limb artery.`, [c], { tag: 'weak_motor', p: c }),
        ],
      }),
      makeCard({
        index: 5, time: '01:17', wing: 'Vascular OR', wingIndex: 0, label: 'Clot-Removal Slot',
        shown: [
          fact(`${pName(f)} serves as our normal reference baseline (full tank, strong pump, 4 warm limbs).`, [f], { tag: 'ref', p: f }),
          fact(`Send ONLY the patient matching Full Tank + Strong Pump + Single Pinched Branch to Vascular Clot Removal.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'The Pinched Fuel Line',
      dispatch: 'Map the 3-part relation "Full Tank + Working Pump + One Blocked Line" across six circulation exams.',
      order: 'Send ONLY the patient matching Full Tank + Strong Pump + Single Blocked Limb Artery to Vascular Surgery.',
      hint: 'Intersect Full Tank + Strong Pump + One Cold Pulseless Limb across the comparison cards.',
      bayDefaultLabel: 'Limb Flow Eval',
      cards,
      evaluate(activeCards) {
        const tank = new Set(factsByTag(activeCards, 'full_tank').map((x) => x.p));
        const pump = new Set(factsByTag(activeCards, 'good_pump').map((x) => x.p));
        const pinch = new Set(factsByTag(activeCards, 'one_pinch').map((x) => x.p));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => tank.has(id) && pump.has(id) && pinch.has(id)));
        return {
          targets,
          proof: `Mapping Tank × Pump × Single-Line isolates ${formatList(targets)}: full blood volume, strong heart beat, and one cold pulseless limb.`,
          rival: buildRivalInfo(targets, [c, b, d, e, a], (r) =>
            !tank.has(r) ? `${pName(r)} has an empty blood tank (all limbs cold), not a single pinched artery.` : `${pName(r)} either has a failing heart pump or warm pulses in every limb.`
          ),
        };
      },
    };
  },

  // #22 Anomalous reasoning (Inside · Atomic)
  // Relational covariance break: BP↓ normally pairs with HR↑; catch the lone bay where BP↓ pairs with HR↓
  'anomalous-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Reflex Law', wingIndex: 0, label: 'Inverse Coupling Rule',
        shown: [
          fact(`Normal shock coupling: BP drops → Heart Rate climbs HIGHER THAN baseline in the opposite direction.`, [], { tag: 'rule' }),
          fact(`Dangerous spinal/brain break: BP drops AND Heart Rate ALSO drops LOWER THAN baseline in the same direction.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Monitors A', wingIndex: 1, label: 'BP & Pulse Shifts A',
        shown: [
          fact(`${pName(a)}: BP fell 124 → 82 while HR climbed 78 → 134 — HIGHER THAN ${pName(e)}'s 118.`, [a, e], { tag: 'shift', p: a, bpDown: true, hrDown: false }),
          fact(`${pName(b)}: BP fell 120 → 76 while HR fell 80 → 46 — LOWER THAN every other crashing bay including ${pName(a)}.`, [b, a], { tag: 'shift', p: b, bpDown: true, hrDown: true }),
        ],
        alt: [
          fact(`${pName(a)}: BP fell 124 → 78 while HR fell 82 → 44 — LOWER THAN every other crashing bay including ${pName(b)}.`, [a, b], { tag: 'shift', p: a, bpDown: true, hrDown: true }),
          fact(`${pName(b)}: BP fell 120 → 84 while HR climbed 76 → 132 — HIGHER THAN ${pName(e)}'s 118.`, [b, e], { tag: 'shift', p: b, bpDown: true, hrDown: false }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Monitors B', wingIndex: 1, label: 'BP & Pulse Shifts B',
        shown: [
          fact(`${pName(c)}: BP fell 118 → 86 while HR climbed 74 → 124 — SAME inverse direction as ${pName(a)}.`, [c, a], { tag: 'shift', p: c, bpDown: true, hrDown: false }),
          fact(`${pName(d)}: BP climbed 110 → 148 while HR fell 86 → 62 — OPPOSITE BP direction from ${pName(c)}.`, [d, c], { tag: 'shift', p: d, bpDown: false, hrDown: true }),
        ],
        alt: [
          fact(`${pName(c)}: BP fell 118 → 74 while HR fell 78 → 48 — LOWER HR THAN ${pName(e)}'s 118.`, [c, e], { tag: 'shift', p: c, bpDown: true, hrDown: true }),
          fact(`${pName(d)}: BP climbed 110 → 148 while HR fell 86 → 62 — OPPOSITE BP direction from ${pName(c)}.`, [d, c], { tag: 'shift', p: d, bpDown: false, hrDown: true }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Monitors C', wingIndex: 0, label: 'Baseline & Control Bays',
        shown: [
          fact(`${pName(e)}: BP fell 126 → 88 while HR climbed 76 → 118 — SAME inverse reflex as ${pName(c)}.`, [e, c], { tag: 'shift', p: e, bpDown: true, hrDown: false }),
          fact(`${pName(f)}: Endurance athlete holding flat at BP 118 → 118 and HR 50 → 50 — STEADIER than ${pName(e)}.`, [f, e], { tag: 'shift', p: f, bpDown: false, hrDown: false }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Reflex Law', wingIndex: 0, label: 'Avoid the Slow-Pulse Trap',
        shown: [
          fact(`${pName(f)} and ${pName(d)} have slow pulses, yet NEITHER has falling blood pressure.`, [f, d], { tag: 'note' }),
          fact(`Look for BOTH directions falling together: BP DOWN + HR DOWN simultaneously.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Neuro Spine', wingIndex: 1, label: 'Spine-Shock Alert',
        shown: [
          fact(`Standard IV fluids fail when the spinal nerve reflex breaks.`, [], { tag: 'rule' }),
          fact(`Page Neurosurgery for EVERY bay where BP dropped AND Heart Rate dropped together.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'The Broken Vital Coupling',
      dispatch: 'Compare BP direction vs. Heart-Rate direction across six bays to catch who broke the inverse shock reflex.',
      order: 'Page Neurosurgery for EVERY patient whose blood pressure DROPPED while their heart rate ALSO DROPPED.',
      hint: 'Ignore steady athletes and rising BP — isolate falling BP coupled with falling HR.',
      bayDefaultLabel: 'Vital Coupling',
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'shift');
        const targets = uniqueSortedIds(list.filter((x) => x.bpDown && x.hrDown).map((x) => x.p));
        const rivals = list.filter((x) => !(x.bpDown && x.hrDown)).map((x) => x.p);
        return {
          targets,
          proof: `Comparing BP trend vs. HR trend isolates ${formatList(targets)}: BP crashed AND HR dropped together, breaking the inverse reflex.`,
          rival: buildRivalInfo(targets, rivals, (r) => {
            const x = list.find((item) => item.p === r);
            return x && !x.bpDown
              ? `${pName(r)} has a slow pulse, but their BP did NOT drop.`
              : `${pName(r)}'s heart rate climbed normally as BP fell.`;
          }),
        };
      },
    };
  },

  // #23 Antinomic reasoning (After · Atomic)
  // Relational incompatibility between Cardiology & Neurosurgery orders across 6 active patients
  'antinomic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Pharmacy Gate', wingIndex: 0, label: 'Mutual Exclusion Rule',
        shown: [
          fact(`Blood Thinner ↔ Strict Zero-Thinner Brain Bleed CANNOT both be obeyed — they directly negate each other.`, [], { tag: 'rule' }),
          fact(`High-Dose Steroid ↔ Live Vaccine are ALSO mutually exclusive if ordered on the same chart.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Cardiology', wingIndex: 1, label: '01:05 Active Orders A',
        shown: [
          fact(`${pName(a)}: Ordered MAX Blood Thinner — SAME drug class as ${pName(b)}'s clot drip.`, [a, b], { tag: 'thinner', p: a }),
          fact(`${pName(b)}: Ordered MAX Blood Thinner for a leg vein clot after a clean head CT.`, [b], { tag: 'thinner', p: b }),
        ],
        alt: [
          fact(`${pName(c)}: Ordered MAX Blood Thinner — SAME drug class as ${pName(b)}'s clot drip.`, [c, b], { tag: 'thinner', p: c }),
          fact(`${pName(b)}: Ordered MAX Blood Thinner for a leg vein clot after a clean head CT.`, [b], { tag: 'thinner', p: b }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Neurosurgery', wingIndex: 0, label: '01:08 Active Orders B',
        shown: [
          fact(`${pName(a)}: STRICT ZERO BLOOD THINNERS for active skull bleeding on CT — SAME ban as ${pName(d)}.`, [a, d], { tag: 'no_thin', p: a }),
          fact(`${pName(d)}: STRICT ZERO BLOOD THINNERS for head bleed; Cardiology ordered compression wraps only.`, [d], { tag: 'no_thin', p: d }),
        ],
        alt: [
          fact(`${pName(c)}: STRICT ZERO BLOOD THINNERS for active skull bleeding on CT — SAME ban as ${pName(d)}.`, [c, d], { tag: 'no_thin', p: c }),
          fact(`${pName(d)}: STRICT ZERO BLOOD THINNERS for head bleed; Cardiology ordered compression wraps only.`, [d], { tag: 'no_thin', p: d }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Trauma Med', wingIndex: 1, label: '01:11 Compatible Pairs',
        shown: [
          fact(`${pName(c)}: Oxygen mask plus bronchodilator mist — synergistic respiratory pair.`, [c], { tag: 'compat', p: c }),
          fact(`${pName(e)}: IV antibiotics plus cooling blanket — SAME non-conflicting pattern as ${pName(f)}.`, [e, f], { tag: 'compat', p: e }),
        ],
        alt: [
          fact(`${pName(a)}: Oxygen mask plus bronchodilator mist — synergistic respiratory pair.`, [a], { tag: 'compat', p: a }),
          fact(`${pName(e)}: IV antibiotics plus cooling blanket — SAME non-conflicting pattern as ${pName(f)}.`, [e, f], { tag: 'compat', p: e }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Pharmacy Gate', wingIndex: 0, label: '01:15 Second Audit',
        shown: [
          fact(`${pName(f)}: Pain drip paired with anti-nausea injection — standard post-op regimen.`, [f], { tag: 'compat', p: f }),
          fact(`${pName(b)} has no head bleed and ${pName(d)} has no blood thinner ordered.`, [b, d], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Safety Stop', wingIndex: 1, label: 'Freeze Conflicting Chart',
        shown: [
          fact(`Trigger the Safety Hold ONLY on a chart carrying TWO directly self-contradictory orders.`, [], { tag: 'rule' }),
          fact(`All compatible single-side charts proceed without delay.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Clashing Specialist Orders',
      dispatch: 'Cross-link Cardiology and Neurosurgery orders to catch the chart trapped between two contradictory commands.',
      order: 'Place an immediate Safety Hold on the SINGLE patient carrying two mutually incompatible active orders.',
      hint: 'Intersect the "MAX Blood Thinner" orders with the "STRICT ZERO Blood Thinners" orders.',
      bayDefaultLabel: 'Order Audit',
      cards,
      evaluate(activeCards) {
        const t = new Set(factsByTag(activeCards, 'thinner').map((x) => x.p));
        const nt = new Set(factsByTag(activeCards, 'no_thin').map((x) => x.p));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => t.has(id) && nt.has(id)));
        return {
          targets,
          proof: `Cross-linking Cardiology and Neurosurgery isolates ${formatList(targets)}: ordered MAX Blood Thinner while simultaneously under a STRICT ZERO-Thinner brain-bleed ban.`,
          rival: buildRivalInfo(targets, [b, d, c, a], (r) =>
            t.has(r) ? `${pName(r)} is ordered blood thinners with a verified clean head CT (no conflict).` : `${pName(r)} has no blood thinner ordered against their no-thinner precaution.`
          ),
        };
      },
    };
  },

  // #24 Antithetical reasoning (Inside · Atomic)
  // 4-axis polar inversion relative to live reference bay F: Cold↔Hot, Slow↔Fast, Pinpoint↔Wide, Limp↔Rigid
  'antithetical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Anchor Bay', wingIndex: 0, label: 'Reference Overdose Pole',
        shown: [
          fact(`Anchor ${pName(f)} (Sedative Pole): COLD 94°F · SLOW 44 BPM · PINPOINT pupils · LIMP muscles.`, [f], { tag: 'anchor', p: f }),
          fact(`Antidote B works ONLY on the exact OPPOSITE OF ${pName(f)} across ALL FOUR axes: Hot + Racing + Wide Pupils + Rigid.`, [f], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Temp & Heart', wingIndex: 1, label: 'Axes 1 & 2 vs. Anchor',
        shown: [
          fact(`${pName(a)} & ${pName(b)} are BOTH hotter (104°F) AND faster (>138 BPM) — OPPOSITE OF ${pName(f)} on Axes 1–2.`, [a, b, f], { tag: 'ax12', ps: [a, b] }),
          fact(`${pName(d)} is COLD (95°F) and SLOW (48 BPM) — SAME pole as ${pName(f)}.`, [d, f], { tag: 'same_pole', p: d }),
        ],
        alt: [
          fact(`${pName(c)} & ${pName(b)} are BOTH hotter (104°F) AND faster (>138 BPM) — OPPOSITE OF ${pName(f)} on Axes 1–2.`, [c, b, f], { tag: 'ax12', ps: [c, b] }),
          fact(`${pName(d)} is COLD (95°F) and SLOW (48 BPM) — SAME pole as ${pName(f)}.`, [d, f], { tag: 'same_pole', p: d }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Eyes & Tone', wingIndex: 0, label: 'Axes 3 & 4 vs. Anchor',
        shown: [
          fact(`${pName(a)}: WIDE-OPEN pupils + RIGID shaking muscles — OPPOSITE OF ${pName(f)} on Axes 3–4 too.`, [a, f], { tag: 'ax34', p: a }),
          fact(`${pName(b)}: PINPOINT pupils + LIMP muscles — SAME as ${pName(f)} on Axes 3–4.`, [b, f], { tag: 'partial', p: b }),
        ],
        alt: [
          fact(`${pName(c)}: WIDE-OPEN pupils + RIGID shaking muscles — OPPOSITE OF ${pName(f)} on Axes 3–4 too.`, [c, f], { tag: 'ax34', p: c }),
          fact(`${pName(b)}: PINPOINT pupils + LIMP muscles — SAME as ${pName(f)} on Axes 3–4.`, [b, f], { tag: 'partial', p: b }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Temp & Heart', wingIndex: 1, label: 'Neutral & Partial Checks',
        shown: [
          fact(`${pName(e)}: Hot 103°F, racing 135 BPM, WIDE pupils, yet RELAXED soft muscles — matches ${pName(f)}'s limp tone on Axis 4.`, [e, f], { tag: 'partial', p: e }),
          fact(`${pName(c)}: Neutral 98.6°F, 76 BPM, mid-size pupils — sits BETWEEN ${pName(f)} and ${pName(a)}.`, [c, f, a], { tag: 'neutral', p: c }),
        ],
        alt: [
          fact(`${pName(e)}: Hot 103°F, racing 135 BPM, WIDE pupils, yet RELAXED soft muscles — matches ${pName(f)}'s limp tone on Axis 4.`, [e, f], { tag: 'partial', p: e }),
          fact(`${pName(a)}: Neutral 98.6°F, 76 BPM, mid-size pupils — sits BETWEEN ${pName(f)} and ${pName(c)}.`, [a, f, c], { tag: 'neutral', p: a }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Eyes & Tone', wingIndex: 0, label: 'Four-Axis Check',
        shown: [
          fact(`A neutral middle bay OR a 3/4 partial match fails Antidote B safety rules.`, [], { tag: 'rule' }),
          fact(`All four dimensions must sit at the exact mirror extreme of ${pName(f)}.`, [f], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Tox Lead', wingIndex: 1, label: 'Give Antidote B',
        shown: [
          fact(`Bind Axes 1–2 with Axes 3–4 to isolate the single 4-of-4 opposite pole.`, [], { tag: 'rule' }),
          fact(`Inject Antidote B into that single bay right now.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: '4-Axis Mirror Overdose',
      dispatch: 'Compare every bay against anchor Sedative Pole across Temp, Heart Rate, Pupils, and Muscle Tone.',
      order: 'Give Antidote B ONLY to the patient sitting at the exact OPPOSITE extreme across ALL FOUR vital axes.',
      hint: 'Check Axes 1–2 (Hot + Racing) AND Axes 3–4 (Wide Pupils + Rigid) — reject 3/4 partial matches.',
      bayDefaultLabel: 'Tox Polarity',
      cards,
      evaluate(activeCards) {
        const ax12 = new Set(factsByTag(activeCards, 'ax12').flatMap((x) => x.ps));
        const ax34 = new Set(factsByTag(activeCards, 'ax34').map((x) => x.p));
        const targets = uniqueSortedIds([a, b, c, d, e].filter((id) => ax12.has(id) && ax34.has(id)));
        return {
          targets,
          proof: `Inverting all 4 axes of anchor ${pName(f)} (Hot + Racing + Wide Pupils + Rigid) isolates ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, [e, b, d, c, a], (r) =>
            r === e ? `${pName(e)} flipped 3 of 4 axes, but relaxed muscles fail the 4th axis.` : `${pName(r)} matches only part of the opposite pole or mirrors ${pName(f)} directly.`
          ),
        };
      },
    };
  },

  // #25 Higher-order relational reasoning (Inside · Composite)
  // Comparing ratios of change (Delta / Baseline) across 6 patients — relation-of-relations!
  'higher-order-relational': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Baseline Chart', wingIndex: 0, label: '00:45 Normal Baselines',
        shown: [
          fact(`Normal resting BP: ${pName(a)} = 150 · ${pName(b)} = 100 · ${pName(c)} = 120.`, [a, b, c], { tag: 'base', map: { [a]: 150, [b]: 100, [c]: 120 } }),
          fact(`Normal resting BP: ${pName(d)} = 160 · ${pName(e)} = 120 · ${pName(f)} = 110.`, [d, e, f], { tag: 'base', map: { [d]: 160, [e]: 120, [f]: 110 } }),
        ],
        alt: [
          fact(`Normal resting BP: ${pName(a)} = 100 · ${pName(b)} = 160 · ${pName(c)} = 120.`, [a, b, c], { tag: 'base', map: { [a]: 100, [b]: 160, [c]: 120 } }),
          fact(`Normal resting BP: ${pName(d)} = 110 · ${pName(e)} = 120 · ${pName(f)} = 150.`, [d, e, f], { tag: 'base', map: { [d]: 110, [e]: 120, [f]: 150 } }),
        ],
      }),
      makeCard({
        index: 1, time: '01:08', wing: 'Live Wall', wingIndex: 1, label: '01:15 Current BP (A–C)',
        shown: [
          fact(`${pName(a)} now reads 96 — HIGHER THAN ${pName(b)}'s 92.`, [a, b], { tag: 'now', map: { [a]: 96, [b]: 92 } }),
          fact(`${pName(c)} now reads 102 — HIGHER THAN ${pName(a)}'s 96.`, [c, a], { tag: 'now', map: { [c]: 102 } }),
        ],
        alt: [
          fact(`${pName(a)} now reads 94 — LOWER THAN ${pName(b)}'s 102.`, [a, b], { tag: 'now', map: { [a]: 94, [b]: 102 } }),
          fact(`${pName(c)} now reads 108 — HIGHER THAN ${pName(b)}'s 102.`, [c, b], { tag: 'now', map: { [c]: 108 } }),
        ],
      }),
      makeCard({
        index: 2, time: '01:12', wing: 'Live Wall', wingIndex: 1, label: '01:15 Current BP (D–F)',
        shown: [
          fact(`${pName(d)} now reads 128 — STILL HIGHER THAN ${pName(e)}'s 108.`, [d, e], { tag: 'now', map: { [d]: 128, [e]: 108 } }),
          fact(`${pName(f)} now reads 104 — LOWER THAN ${pName(e)}'s 108.`, [f, e], { tag: 'now', map: { [f]: 104 } }),
        ],
        alt: [
          fact(`${pName(d)} now reads 104 — LOWER THAN ${pName(e)}'s 110.`, [d, e], { tag: 'now', map: { [d]: 104, [e]: 110 } }),
          fact(`${pName(f)} now reads 120 — HIGHER THAN ${pName(e)}'s 110.`, [f, e], { tag: 'now', map: { [f]: 120 } }),
        ],
      }),
      makeCard({
        index: 3, time: '01:15', wing: 'Trend Rule', wingIndex: 0, label: 'Compare Drop Fractions',
        shown: [
          fact(`Raw BP fools rookies: a runner at 100 → 92 lost under 10%, while a huge fractional drop means active hidden bleeding!`, [], { tag: 'rule' }),
          fact(`Rank each bay by FRACTION LOST = (Baseline − Current) ÷ Baseline.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Trend Rule', wingIndex: 0, label: 'Quick Benchmark',
        shown: [
          fact(`A drop of 1/3 (33%+) of starting BP is DOUBLE the danger of a 15–20% dip.`, [], { tag: 'rule' }),
          fact(`Compare the two biggest drops carefully — only ONE exceeds a 33% collapse!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'CT Scanner', wingIndex: 1, label: 'One Scanner Slot',
        shown: [
          fact(`Wheel the SINGLE patient with the HIGHEST fractional BP drop straight to Emergency CT.`, [], { tag: 'rule' }),
          fact(`Do not grab the lowest raw number without checking where they started.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Fractional Baseline Collapse',
      dispatch: 'Compare each patient’s BP drop RELATIVE TO their own starting baseline rather than grabbing the lowest raw number.',
      order: 'Send the SINGLE patient who lost the LARGEST FRACTION of their starting baseline BP to Emergency CT.',
      hint: 'Compute (Baseline − Current) ÷ Baseline for the big droppers and pick the steepest percentage fall.',
      bayDefaultLabel: 'BP Drop Ratio',
      cards,
      evaluate(activeCards) {
        const base = {};
        const now = {};
        for (const x of factsByTag(activeCards, 'base')) Object.assign(base, x.map);
        for (const x of factsByTag(activeCards, 'now')) Object.assign(now, x.map);
        const rows = [a, b, c, d, e, f]
          .filter((id) => base[id] && now[id])
          .map((id) => ({ id, base: base[id], now: now[id], drop: base[id] - now[id], pct: (base[id] - now[id]) / base[id] }))
          .sort((x, y) => y.pct - x.pct);
        const top = rows[0];
        const lowRaw = [...rows].sort((x, y) => x.now - y.now)[0];
        const targets = top ? [top.id] : [];
        const rivals = [lowRaw?.id, rows[1]?.id].filter((id) => id && id !== top.id);
        return {
          targets,
          proof: `Comparing fractional drops puts ${pName(top.id)} #1: ${top.base} → ${top.now} (−${top.drop}, ${Math.round(top.pct * 100)}% of baseline), steeper than ${pName(rows[1].id)} (${Math.round(rows[1].pct * 100)}%).`,
          rival: buildRivalInfo(targets, rivals, (r) => {
            const row = rows.find((x) => x.id === r);
            return `${pName(r)} fell ${row.base} → ${row.now} (${Math.round(row.pct * 100)}% drop), smaller proportionally even if raw BP looked lower.`;
          }),
        };
      },
    };
  },

  // #26 Cross-domain reasoning (After · Composite)
  // Transferring Aviation's 2×2 matrix (High-Stakes "Landing" × Active Distraction) across 6 ER rooms
  'cross-domain-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Aviation Law', wingIndex: 0, label: 'Sterile Cockpit Transfer',
        shown: [
          fact(`Aviation :: ER Transfer → Critical "Landing" (airway tube, lethal drug math, death talk) + Non-Essential Noise = CRASH RISK.`, [], { tag: 'rule' }),
          fact(`Routine "Cruise" (X-ray wait, cast wrap) OR a quiet locked Critical room needs ZERO shutdown.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Phase Check', wingIndex: 1, label: 'Room Stakes (Landing vs. Cruise)',
        shown: [
          fact(`${pName(a)}, ${pName(c)}, and ${pName(d)} are in HIGH-STAKES "Landing" tasks (death talk, child heart-dose math, artery stitch).`, [a, c, d], { tag: 'landing', ps: [a, c, d] }),
          fact(`${pName(b)}, ${pName(e)}, and ${pName(f)} are in routine "Cruise" care (X-ray wait, ankle tape, blood draw).`, [b, e, f], { tag: 'cruise', ps: [b, e, f] }),
        ],
        alt: [
          fact(`${pName(b)}, ${pName(c)}, and ${pName(d)} are in HIGH-STAKES "Landing" tasks (airway tube, child dose math, artery stitch).`, [b, c, d], { tag: 'landing', ps: [b, c, d] }),
          fact(`${pName(a)}, ${pName(e)}, and ${pName(f)} are in routine "Cruise" care (X-ray wait, ankle tape, blood draw).`, [a, e, f], { tag: 'cruise', ps: [a, e, f] }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Noise Audit', wingIndex: 0, label: 'Interruption Levels A',
        shown: [
          fact(`${pName(a)}'s room is LOUDER THAN ${pName(d)}'s: two billing clerks are interrupting while a TV blares.`, [a, d], { tag: 'noisy', p: a }),
          fact(`${pName(d)}'s room is sealed in total focused silence — OPPOSITE OF ${pName(a)}'s chaos.`, [d, a], { tag: 'quiet', p: d }),
        ],
        alt: [
          fact(`${pName(b)}'s room is LOUDER THAN ${pName(d)}'s: two billing clerks are interrupting while a phone rings nonstop.`, [b, d], { tag: 'noisy', p: b }),
          fact(`${pName(d)}'s room is sealed in total focused silence — OPPOSITE OF ${pName(b)}'s chaos.`, [d, b], { tag: 'quiet', p: d }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Noise Audit', wingIndex: 0, label: 'Interruption Levels B',
        shown: [
          fact(`${pName(c)}'s bay has 3 staff asking lunch orders mid-dose — SAME disruption as ${pName(a)}.`, [c, a], { tag: 'noisy', p: c }),
          fact(`${pName(b)}'s bay has loud sports chatter — SAME noise level as ${pName(a)}.`, [b, a], { tag: 'noisy', p: b }),
        ],
        alt: [
          fact(`${pName(c)}'s bay is sealed behind a quiet "Dosing — Do Not Enter" sign — SAME silence as ${pName(d)}.`, [c, d], { tag: 'quiet', p: c }),
          fact(`${pName(e)}'s bay has loud hallway chatter during an ankle tape — SAME noise level as ${pName(b)}.`, [e, b], { tag: 'noisy', p: e }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Noise Audit', wingIndex: 0, label: 'Remaining Bays',
        shown: [
          fact(`${pName(e)} and ${pName(f)} have quiet routine rooms — zero high-stakes landing risk.`, [e, f], { tag: 'quiet', p: e }),
          fact(`Do NOT disrupt ${pName(d)}'s already-silent surgical suite.`, [d], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Charge Nurse', wingIndex: 1, label: 'Enforce Sterile Door',
        shown: [
          fact(`Intersect HIGH-STAKES "Landing" rooms WITH ACTIVE non-essential interruptions.`, [], { tag: 'rule' }),
          fact(`Lock down and clear non-essential staff ONLY from those exact violating rooms.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Sterile Cockpit in the ER',
      dispatch: 'Transfer aviation’s 2-factor Sterile Cockpit model: intersect High-Stakes "Landing" tasks with Active Distractions.',
      order: 'Lock down and clear distractions in EVERY room combining a High-Stakes "Landing" task WITH active interruptions.',
      hint: 'Match the "Landing" room list against the "Noisy/Interrupted" room list — skip quiet or routine-cruise bays.',
      bayDefaultLabel: 'Sterile Audit',
      cards,
      evaluate(activeCards) {
        const landing = new Set(factsByTag(activeCards, 'landing').flatMap((x) => x.ps));
        const noisy = new Set(factsByTag(activeCards, 'noisy').map((x) => x.p));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => landing.has(id) && noisy.has(id)));
        const rivals = [a, b, c, d, e].filter((id) => !targets.includes(id) && (landing.has(id) || noisy.has(id)));
        return {
          targets,
          proof: `Transferring aviation's Sterile Cockpit rule (High-Stakes Landing ∩ Active Noise) isolates ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, rivals, (r) =>
            landing.has(r) ? `${pName(r)} is high-stakes, but already protected in silent focus.` : `${pName(r)}'s room is noisy, but it is routine low-stakes "cruise" care.`
          ),
        };
      },
    };
  },

  // #27 Abstract reasoning (Before · Composite)
  // Isomorphic dependency graph: find the single highest out-degree bottleneck node across 6 bays
  'abstract-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Flow Graph', wingIndex: 0, label: 'Dependency Edges A',
        shown: [
          fact(`${pName(a)} sits finished inside CT-1 → BLOCKS ${pName(b)}, ${pName(c)}, AND ${pName(d)} from scanning.`, [a, b, c, d], { tag: 'blocks', from: a, to: [b, c, d] }),
          fact(`${pName(b)} waits in Corridor 2 → BLOCKS zero other patients.`, [b], { tag: 'blocks', from: b, to: [] }),
        ],
        alt: [
          fact(`${pName(b)} sits finished inside CT-1 → BLOCKS ${pName(a)}, ${pName(c)}, AND ${pName(d)} from scanning.`, [b, a, c, d], { tag: 'blocks', from: b, to: [a, c, d] }),
          fact(`${pName(a)} waits in Corridor 2 → BLOCKS zero other patients.`, [a], { tag: 'blocks', from: a, to: [] }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Flow Graph', wingIndex: 0, label: 'Dependency Edges B',
        shown: [
          fact(`${pName(e)} holds X-Ray Room 2 → BLOCKS ONLY ${pName(f)} — FEWER downstream bays than CT-1.`, [e, f], { tag: 'blocks', from: e, to: [f] }),
          fact(`${pName(c)} and ${pName(d)} cannot start surgery UNTIL CT-1 frees up.`, [c, d], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(e)} holds X-Ray Room 2 → BLOCKS ONLY ${pName(f)} — FEWER downstream bays than CT-1.`, [e, f], { tag: 'blocks', from: e, to: [f] }),
          fact(`${pName(c)} and ${pName(d)} cannot start surgery UNTIL CT-1 frees up.`, [c, d], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Porter Desk', wingIndex: 1, label: 'Move-Time Comparison',
        shown: [
          fact(`Moving ${pName(a)} out of CT-1 takes the SAME 90 seconds as moving ${pName(e)} out of X-Ray 2.`, [a, e], { tag: 'note' }),
          fact(`Yet clearing CT-1 unblocks THREE TIMES as many critical workflows as clearing X-Ray 2!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'OR Board', wingIndex: 1, label: 'Downstream Status',
        shown: [
          fact(`${pName(c)}, ${pName(d)}, and ${pName(f)} are leaf nodes — moving any leaf frees ZERO downstream bays.`, [c, d, f], { tag: 'note' }),
          fact(`Strip away the specialty titles and count outgoing BLOCKS arrows per bay.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Flow Graph', wingIndex: 0, label: 'Single Porter Limit',
        shown: [
          fact(`Only ONE transport porter is free right now — you can clear ONE room first.`, [], { tag: 'rule' }),
          fact(`Always clear the node with the MAXIMUM downstream unlock count.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Dispatch', wingIndex: 1, label: 'Break Top Bottleneck',
        shown: [
          fact(`Compare the blocking counts of CT-1 vs. X-Ray 2 vs. Corridor bays.`, [], { tag: 'rule' }),
          fact(`Move the SINGLE patient unblocking the most downstream trauma bays at once.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'The Maximum-Unlock Bottleneck',
      dispatch: 'Strip away specialty names and count outgoing BLOCKS arrows to clear the highest-leverage bottleneck.',
      order: 'Move the SINGLE patient whose transfer immediately unblocks the MOST downstream trauma bays.',
      hint: 'Count how many other patients each bay directly blocks (3 vs. 1 vs. 0).',
      bayDefaultLabel: 'Queue Node',
      cards,
      evaluate(activeCards) {
        const edges = factsByTag(activeCards, 'blocks');
        const counts = new Map();
        for (const ed of edges) counts.set(ed.from, (counts.get(ed.from) || 0) + ed.to.length);
        const sorted = [...counts.entries()].sort((x, y) => y[1] - x[1]);
        const top = sorted[0];
        const targets = top ? [top[0]] : [];
        return {
          targets,
          proof: `In the dependency graph, ${pName(top[0])} directly blocks ${top[1]} downstream patients — outranking ${pName(e)} (blocks 1) and all leaf bays (block 0).`,
          rival: buildRivalInfo(targets, [e, c, d, b, a], (r) =>
            r === e ? `${pName(e)} only unblocks 1 patient (${pName(f)}), whereas ${pName(top[0])} unblocks 3 critical bays.` : `${pName(r)} is waiting downstream and blocks zero other bays.`
          ),
        };
      },
    };
  },

  // #28 Hierarchical reasoning (Before · Atomic)
  // Strict authority lattice (Chief > Attending > Resident > Student) + timestamp precedence within same rank
  'hierarchical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Authority Tree', wingIndex: 0, label: 'Command Precedence',
        shown: [
          fact(`Trauma Chief OUTRANKS Senior Attending OUTRANKS Resident OUTRANKS Med Student.`, [], { tag: 'rule' }),
          fact(`A higher rank ALWAYS OVERRIDES a lower rank; within the SAME rank, a LATER timestamp OVERRIDES an earlier one.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:05', wing: 'OR Queue', wingIndex: 1, label: '01:05 Early Orders',
        shown: [
          fact(`01:05 [Med Student]: Put ${pName(a)} into OR-1 first.`, [a], { tag: 'ord', p: a, rank: 1, t: 5 }),
          fact(`01:05 [Trauma Chief]: Put ${pName(b)} into OR-1 first.`, [b], { tag: 'ord', p: b, rank: 4, t: 5 }),
        ],
        alt: [
          fact(`01:05 [Med Student]: Put ${pName(a)} into OR-1 first.`, [a], { tag: 'ord', p: a, rank: 1, t: 5 }),
          fact(`01:05 [Senior Attending]: Put ${pName(b)} into OR-1 first.`, [b], { tag: 'ord', p: b, rank: 3, t: 5 }),
        ],
      }),
      makeCard({
        index: 2, time: '01:12', wing: 'OR Queue', wingIndex: 1, label: '01:12 Mid Orders',
        shown: [
          fact(`01:12 [Resident]: Send ${pName(c)} to OR-1 ahead of ${pName(a)}.`, [c, a], { tag: 'ord', p: c, rank: 2, t: 12 }),
          fact(`01:14 [Senior Attending]: OVERRIDES Resident — prep ${pName(d)} for OR-1.`, [d], { tag: 'ord', p: d, rank: 3, t: 14 }),
        ],
      }),
      makeCard({
        index: 3, time: '01:22', wing: 'Command Desk', wingIndex: 0, label: '01:22 Late Update',
        shown: [
          fact(`01:22 [Trauma Chief]: AFTER new CT, OVERRIDE my 01:05 order for ${pName(b)} — move ${pName(e)} into OR-1.`, [e, b], { tag: 'ord', p: e, rank: 4, t: 22 }),
          fact(`01:25 [Senior Attending]: Logged LATER request for ${pName(f)} — 3 min AFTER ${pName(e)}'s Chief note.`, [f, e], { tag: 'ord', p: f, rank: 3, t: 25 }),
        ],
        alt: [
          fact(`01:22 [Trauma Chief]: AFTER new CT, OVERRIDE my 01:05 order for ${pName(b)} — move ${pName(d)} into OR-1.`, [d, b], { tag: 'ord', p: d, rank: 4, t: 22 }),
          fact(`01:25 [Resident]: Logged LATER request for ${pName(f)} — 3 min AFTER ${pName(d)}'s Chief note.`, [f, d], { tag: 'ord', p: f, rank: 2, t: 25 }),
        ],
      }),
      makeCard({
        index: 4, time: '01:26', wing: 'Authority Tree', wingIndex: 0, label: 'Timestamp vs. Rank Trap',
        shown: [
          fact(`Watch 01:25 vs. 01:22: a LATER note from a lower rank NEVER overrides a higher rank!`, [], { tag: 'rule' }),
          fact(`Only the Trauma Chief can override the Trauma Chief's own 01:05 call.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:28', wing: 'OR Charge', wingIndex: 1, label: 'Final Authorization',
        shown: [
          fact(`Filter by HIGHEST rank first, then break any same-rank tie by LATEST time.`, [], { tag: 'rule' }),
          fact(`Roll that single authorized bay into OR-1.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Rank vs. Timestamp Override',
      dispatch: 'Six conflicting OR-1 orders span four ranks and 20 minutes — resolve rank precedence before timestamp ties.',
      order: 'Wheel the SINGLE patient authorized by the highest-ranking latest command into OR-1.',
      hint: 'Find all Trauma Chief orders first, then take the latest Trauma Chief timestamp (ignore later lower-rank notes).',
      bayDefaultLabel: 'OR-1 Command',
      cards,
      evaluate(activeCards) {
        const ords = factsByTag(activeCards, 'ord').sort((x, y) => y.rank - x.rank || y.t - x.t);
        const top = ords[0];
        const targets = top ? [top.p] : [];
        const rivals = [f, b, d, e].filter((id) => id !== top.p);
        return {
          targets,
          proof: `Rank outranks recency: Trauma Chief (Rank 4) overrides the later 01:25 lower-rank note, and the 01:22 Chief update overrides the 01:05 Chief note → ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, rivals, (r) =>
            r === f ? `${pName(f)}'s 01:25 note is latest in time, but comes from a lower rank that cannot override the Trauma Chief.` : `${pName(r)}'s order was either lower rank or superseded by the 01:22 Chief override.`
          ),
        };
      },
    };
  },

  // #29 Spatial reasoning (Before · Atomic)
  // Real 2×5 ICU wall Manhattan-distance geometry on the rendered left bay grid (Bays 1–5 left, 6–10 right)
  'spatial-reasoning': (rng) => {
    const allIds = pickPlayers(rng, 10);
    const byBay = {};
    for (const id of allIds) byBay[pBay(id)] = id;
    const hub = byBay[2];
    const adj1 = byBay[1];
    const adj2 = byBay[3];
    const across = byBay[7];
    const far1 = byBay[5];
    const far2 = byBay[9];

    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'ICU Geometry', wingIndex: 0, label: 'Backup O2 Manifold',
        shown: [
          fact(`Backup manifold sits at Bay 2 (${pName(hub)}). Left column = Bays 1–5; Right column = Bays 6–10 (1↔6, 2↔7, 3↔8, 4↔9, 5↔10).`, [hub], { tag: 'hub', p: hub }),
          fact(`Hoses reach ONLY 1 grid step from Bay 2: directly above/below (Bays 1, 3) OR directly across (Bay 7).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:05', wing: 'Left Column', wingIndex: 1, label: 'Left-Wall Alarms',
        shown: [
          fact(`${pName(adj2)} (Bay 3) is gasping — 1 step BELOW ${pName(hub)} (Bay 2).`, [adj2, hub], { tag: 'needs', p: adj2, reach: true }),
          fact(`${pName(far1)} (Bay 5) is gasping on the left wall.`, [far1, hub], { tag: 'needs', p: far1, reach: false }),
        ],
        alt: [
          fact(`${pName(adj1)} (Bay 1) is gasping on the left wall.`, [adj1, hub], { tag: 'needs', p: adj1, reach: true }),
          fact(`${pName(far1)} (Bay 5) is gasping on the left wall.`, [far1, hub], { tag: 'needs', p: far1, reach: false }),
        ],
      }),
      makeCard({
        index: 2, time: '01:08', wing: 'Right Column', wingIndex: 0, label: 'Right-Wall Alarms',
        shown: [
          fact(`${pName(across)} (Bay 7) is gasping on the right wall.`, [across, hub], { tag: 'needs', p: across, reach: true }),
          fact(`${pName(far2)} (Bay 9) is gasping on the right wall.`, [far2, hub], { tag: 'needs', p: far2, reach: false }),
        ],
        alt: [
          fact(`${pName(across)} (Bay 7) is breathing calmly on room air.`, [across], { tag: 'calm', p: across }),
          fact(`${pName(adj2)} (Bay 3) is gasping on the left wall.`, [adj2, hub], { tag: 'needs', p: adj2, reach: true }),
        ],
      }),
      makeCard({
        index: 3, time: '01:11', wing: 'Left Column', wingIndex: 1, label: 'Hub & Neighbor Check',
        shown: [
          fact(`${pName(hub)} (Bay 2) is ALREADY plugged directly into the wall manifold.`, [hub], { tag: 'already', p: hub }),
          fact(`${pName(adj1)} (Bay 1) is breathing calmly on room air at 98% — 1 step ABOVE ${pName(hub)}.`, [adj1, hub], { tag: 'calm', p: adj1 }),
        ],
        alt: [
          fact(`${pName(hub)} (Bay 2) is ALREADY plugged directly into the wall manifold.`, [hub], { tag: 'already', p: hub }),
          fact(`${pName(far2)} (Bay 9) is gasping on the right wall — FARTHER from ${pName(hub)} than Bay 7.`, [far2, hub], { tag: 'needs', p: far2, reach: false }),
        ],
      }),
      makeCard({
        index: 4, time: '01:14', wing: 'ICU Geometry', wingIndex: 0, label: 'Grid Distance Rule',
        shown: [
          fact(`Look directly at the 2×5 bay grid on the left wall: diagonal hops (2 → 6 or 2 → 8) are 2 steps, NOT 1!`, [], { tag: 'rule' }),
          fact(`Out-of-reach gasping bays get rolling cylinders from downstairs — connect ONLY 1-step reachable gasping bays first.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:17', wing: 'Resp Lead', wingIndex: 1, label: 'Connect Hoses Now',
        shown: [
          fact(`Intersect: (1) Actively GASPING AND (2) Exactly 1 grid step from Bay 2 (Bays 1, 3, or 7).`, [], { tag: 'rule' }),
          fact(`Hook up EVERY reachable gasping bay immediately.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: '2×5 ICU Wall Hose Reach',
      dispatch: 'Use the real 2×5 bay grid on the left wall to see which gasping bays sit within 1 step of Bay 2.',
      order: 'Hook up backup hoses to EVERY gasping patient sitting exactly 1 grid step from Bay 2.',
      hint: 'On the 2×5 ICU wall, 1 step from Bay 2 = Bays 1, 3, and across to Bay 7 — skip calm bays and Bay 2 itself.',
      bayDefaultLabel: 'O2 Reach Eval',
      bayLabels: { [hub]: 'O2 Hub (On)' },
      cards,
      evaluate(activeCards) {
        const needs = factsByTag(activeCards, 'needs');
        const targets = uniqueSortedIds(needs.filter((x) => x.reach).map((x) => x.p));
        const rivals = needs.filter((x) => !x.reach).map((x) => x.p);
        return {
          targets,
          proof: `On the 2×5 ICU grid, 1 step from Bay 2 reaches Bays 1, 3, and across to Bay 7 — connecting gasping ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, [...rivals, hub], (r) =>
            r === hub ? `${pName(hub)} (Bay 2) is already plugged directly into the hub.` : `${pName(r)} (Bay ${pBay(r)}) is more than 1 grid step from Bay 2, so the hose cannot reach.`
          ),
        };
      },
    };
  },

  // #30 Temporal reasoning (Inside · Atomic)
  // Relative clock ordering: Last-Seen-Normal vs. 02:30 cutoff (4.5h before 07:00) using BEFORE / AFTER chains
  'temporal-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Stroke Clock', wingIndex: 0, label: '07:00 Cutoff Law',
        shown: [
          fact(`Current clock = 07:00. Clot-buster requires Last-Seen-Normal ≤ 4.5 hours ago — at or after 02:30.`, [], { tag: 'rule' }),
          fact(`"When found" does NOT reset the clock — unwitnessed sleep starts the clock when they went to bed.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Timelines A', wingIndex: 1, label: 'Relative Event Order A',
        shown: [
          fact(`${pName(a)} called sister normally at 03:30 — LATER than ${pName(b)} — found slumped at 06:15.`, [a, b], { tag: 'tm', p: a, min: 210 }),
          fact(`${pName(b)} went to bed alone at 23:00 — found slumped at 06:50, LATER discovery than ${pName(a)}.`, [b, a], { tag: 'tm', p: b, min: -60 }),
        ],
        alt: [
          fact(`${pName(a)} went to bed alone at 01:00 — EARLIER than ${pName(b)} — found slumped at 06:15.`, [a, b], { tag: 'tm', p: a, min: 60 }),
          fact(`${pName(b)} talked to neighbor normally at 04:00 — found slumped at 06:40.`, [b], { tag: 'tm', p: b, min: 240 }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Timelines B', wingIndex: 1, label: 'Relative Event Order B',
        shown: [
          fact(`${pName(c)}'s last normal speech was 40 min BEFORE ${pName(a)}'s call — found at 06:30.`, [c, a], { tag: 'tm_rel', p: c, ref: a, delta: -40 }),
          fact(`${pName(d)}'s symptoms began in front of coworkers at 02:00 — EARLIER than ${pName(e)}.`, [d, e], { tag: 'tm', p: d, min: 120 }),
        ],
        alt: [
          fact(`${pName(c)}'s last normal speech was 40 min BEFORE ${pName(b)}'s talk — found at 06:30.`, [c, b], { tag: 'tm_rel', p: c, ref: b, delta: -40 }),
          fact(`${pName(d)}'s last normal moment was 01:50 — EARLIER than ${pName(e)}.`, [d, e], { tag: 'tm', p: d, min: 110 }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Timelines C', wingIndex: 0, label: 'Anchor Check',
        shown: [
          fact(`${pName(e)} was last seen normal at 02:15 — 10 min AFTER ${pName(f)} — found slumped at 06:55.`, [e, f], { tag: 'tm', p: e, min: 135 }),
          fact(`${pName(f)} was witnessed normal at 02:05 — head CT clean, arrived at 06:50.`, [f], { tag: 'tm', p: f, min: 125 }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Stroke Clock', wingIndex: 0, label: 'Chain Relative Offsets',
        shown: [
          fact(`Compute ${pName(c)}'s exact time by subtracting 40 min from their linked partner's normal timestamp.`, [c], { tag: 'note' }),
          fact(`Ignore recent "found at 06:55" times whenever last-seen-normal falls BEFORE 02:30.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Stroke Lead', wingIndex: 1, label: 'Approve Clot-Buster',
        shown: [
          fact(`All six head scans show zero bleeding — ONLY the 02:30 last-seen-normal boundary decides safety.`, [], { tag: 'rule' }),
          fact(`Give clot-buster to EVERY patient whose true last-seen-normal time is AT OR AFTER 02:30.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'The 02:30 Stroke Boundary',
      dispatch: 'It is 07:00 — trace absolute and relative Last-Seen-Normal clocks against the strict 4.5-hour (02:30) cutoff.',
      order: 'Give stroke clot-buster to EVERY patient whose true Last-Seen-Normal time is AT OR AFTER 02:30.',
      hint: 'Ignore "found at 06:50" times — check absolute Last-Seen-Normal AND subtract 40 min for the linked bay.',
      bayDefaultLabel: 'Stroke Clock',
      cards,
      evaluate(activeCards) {
        const mins = new Map();
        for (const x of factsByTag(activeCards, 'tm')) mins.set(x.p, x.min);
        for (const x of factsByTag(activeCards, 'tm_rel')) {
          if (mins.has(x.ref)) mins.set(x.p, mins.get(x.ref) + x.delta);
        }
        const cutoff = 150; // 02:30
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => mins.has(id) && mins.get(id) >= cutoff));
        const rivals = [a, b, c, d, e, f].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `At 07:00, the 4.5-hour cutoff is 02:30 — resolving direct and relative clocks puts ONLY ${formatList(targets)} at or after 02:30.`,
          rival: buildRivalInfo(targets, rivals, (r) => `${pName(r)} was last seen normal BEFORE 02:30, putting them outside the safe 4.5-hour clot-buster window.`),
        };
      },
    };
  },

  // #31 Structural reasoning (Inside · Composite)
  // Cross-card ABC structural coupling across 3 specialist reports + comparative pillar count
  'structural-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Pillar 1 · Airway', wingIndex: 0, label: 'Airway Collapse Scan',
        shown: [
          fact(`Airway FAILING on ${pName(a)} AND ${pName(e)} (swelling throat); ${pName(b)} & ${pName(c)} have open airways.`, [a, e, b, c], { tag: 'p_fail', ps: [a, e] }),
          fact(`Single-pillar strain = 1 nurse; ≥ 2 failing pillars at once = FULL TRAUMA TEAM.`, [], { tag: 'rule' }),
        ],
        alt: [
          fact(`Airway FAILING on ${pName(b)} AND ${pName(e)} (swelling throat); ${pName(a)} & ${pName(c)} have open airways.`, [b, e, a, c], { tag: 'p_fail', ps: [b, e] }),
          fact(`Single-pillar strain = 1 nurse; ≥ 2 failing pillars at once = FULL TRAUMA TEAM.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Pillar 2 · Lungs', wingIndex: 1, label: 'Breathing Collapse Scan',
        shown: [
          fact(`Breathing FAILING on ${pName(b)} AND ${pName(c)} (collapsed lung / crushed ribs).`, [b, c], { tag: 'p_fail', ps: [b, c] }),
          fact(`${pName(a)}'s lungs are clear once airway opens; ${pName(d)} & ${pName(f)} breathe smoothly at 98%.`, [a, d, f], { tag: 'note' }),
        ],
        alt: [
          fact(`Breathing FAILING on ${pName(b)} AND ${pName(d)} (collapsed lung / crushed ribs).`, [b, d], { tag: 'p_fail', ps: [b, d] }),
          fact(`${pName(a)} & ${pName(c)} breathe smoothly at 98%.`, [a, c], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Pillar 3 · Blood', wingIndex: 0, label: 'Circulation Collapse Scan',
        shown: [
          fact(`Circulation FAILING on ${pName(a)} AND ${pName(d)} (arterial bleed, BP 74/42).`, [a, d], { tag: 'p_fail', ps: [a, d] }),
          fact(`${pName(b)} & ${pName(e)} hold strong BP 122/76 — MORE stable circulation than ${pName(a)}.`, [b, e, a], { tag: 'note' }),
        ],
        alt: [
          fact(`Circulation FAILING on ${pName(c)} AND ${pName(d)} (arterial bleed, BP 74/42).`, [c, d], { tag: 'p_fail', ps: [c, d] }),
          fact(`${pName(a)} & ${pName(e)} hold strong BP 122/76.`, [a, e], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Cross-Link', wingIndex: 1, label: 'Secondary Re-Check',
        shown: [
          fact(`${pName(f)} has an isolated collarbone fracture — 0 of 3 pillars failing, MORE stable than ${pName(a)}–${pName(e)}.`, [f, a], { tag: 'zero', p: f }),
          fact(`${pName(c)}'s circulation dipped briefly during phlebotomy and rebounded to 124/78 — SAME steady BP as ${pName(e)}.`, [c, e], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'ABC Rule', wingIndex: 0, label: 'Count Across All 3 Cards',
        shown: [
          fact(`No single specialist card shows the whole collapse — sum failing pillars across Airway + Breathing + Circulation!`, [], { tag: 'rule' }),
          fact(`Every bay with ONLY 1 failing pillar stays with its specialist nurse.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Trauma Lead', wingIndex: 1, label: 'Full Team Activation',
        shown: [
          fact(`Call Full Trauma Team ONLY for patients failing ≥ 2 of the 3 structural pillars simultaneously.`, [], { tag: 'rule' }),
          fact(`Verify each name across all three pillar cards before activating.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Cross-Card ABC Collapse',
      dispatch: 'Three specialists each audited ONE pillar (Airway, Breathing, Circulation) — combine all three to find multi-pillar failure.',
      order: 'Activate the Full Trauma Team for EVERY patient failing TWO OR MORE structural pillars at once.',
      hint: 'Tally how many of the 3 pillar cards (Airway, Breathing, Circulation) list each patient as FAILING.',
      bayDefaultLabel: 'ABC Pillars',
      cards,
      evaluate(activeCards) {
        const counts = new Map();
        for (const x of factsByTag(activeCards, 'p_fail')) {
          for (const id of x.ps) counts.set(id, (counts.get(id) || 0) + 1);
        }
        const targets = uniqueSortedIds([...counts.entries()].filter(([, n]) => n >= 2).map(([id]) => id));
        const rivals = [...counts.entries()].filter(([, n]) => n === 1).map(([id]) => id);
        return {
          targets,
          proof: `Summing failing pillars across Airway + Breathing + Circulation puts ${formatList(targets)} at ≥ 2 failing pillars simultaneously.`,
          rival: buildRivalInfo(targets, rivals, (r) => `${pName(r)} only failed 1 of the 3 pillars while the other 2 remained intact.`),
        };
      },
    };
  },

  // #32 Semantic reasoning (After · Atomic)
  // Exact referential scope: WHO reacted × WHICH drug × WHAT kind of reaction across 6 allergy notes
  'semantic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Scope Rule', wingIndex: 0, label: '3-Part Allergy Definition',
        shown: [
          fact(`Block Penicillin ONLY if ALL 3 hold: (1) Patient's OWN body + (2) Triggered by PENICILLIN + (3) True immune reaction (hives/swelling/wheezing).`, [], { tag: 'rule' }),
          fact(`Relative's allergy, a DIFFERENT drug (Sulfa/Shellfish), or mild upset stomach ≠ personal Penicillin allergy.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Chart Quotes A', wingIndex: 1, label: 'WHO Had the Reaction?',
        shown: [
          fact(`${pName(a)}: "Personal throat swelling 15 min after a Penicillin pill" — DIFFERENT from ${pName(b)}'s family history.`, [a, b], { tag: 'true_pen', p: a }),
          fact(`${pName(b)}: "Mother had Penicillin hives in 1995; ${pName(b)} took Penicillin fine last year."`, [b], { tag: 'trap', p: b }),
        ],
        alt: [
          fact(`${pName(c)}: "Personal throat swelling 15 min after a Penicillin pill" — DIFFERENT from ${pName(b)}'s family history.`, [c, b], { tag: 'true_pen', p: c }),
          fact(`${pName(b)}: "Mother had Penicillin hives in 1995; ${pName(b)} took Penicillin fine last year."`, [b], { tag: 'trap', p: b }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Chart Quotes B', wingIndex: 1, label: 'WHICH Drug Triggered It?',
        shown: [
          fact(`${pName(c)}: "Personal full-body hives after SULFA pills — tolerated Penicillin cleanly."`, [c], { tag: 'trap', p: c }),
          fact(`${pName(d)}: "Mild stomach rumbling when taking Penicillin on an empty stomach — zero rash, swelling, or wheeze."`, [d], { tag: 'trap', p: d }),
        ],
        alt: [
          fact(`${pName(a)}: "Personal full-body hives after SULFA pills — tolerated Penicillin cleanly."`, [a], { tag: 'trap', p: a }),
          fact(`${pName(d)}: "Mild stomach rumbling when taking Penicillin on an empty stomach — zero rash, swelling, or wheeze."`, [d], { tag: 'trap', p: d }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Chart Quotes C', wingIndex: 0, label: 'Cross-Chart Scope Check',
        shown: [
          fact(`${pName(e)}: "Personal hives and lip swelling after a Penicillin injection — SAME trigger and immune reaction as ${pName(a)}."`, [e, a], { tag: 'true_pen', p: e }),
          fact(`${pName(f)}: "Personal wheezing after SHELLFISH — zero history of antibiotic reaction, UNLIKE ${pName(e)}."`, [f, e], { tag: 'trap', p: f }),
        ],
        alt: [
          fact(`${pName(e)}: "Brother has Penicillin hives; ${pName(e)} has taken Penicillin twice with zero issue — SAME relative-only history as ${pName(b)}."`, [e, b], { tag: 'trap', p: e }),
          fact(`${pName(f)}: "Personal hives and wheezing 10 min after Penicillin IV — SAME trigger as ${pName(c)}."`, [f, c], { tag: 'true_pen', p: f }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Pharmacy Audit', wingIndex: 0, label: 'Why Exact Meaning Matters',
        shown: [
          fact(`Every bay above mentions "allergy" or "Penicillin" — false blocks force weaker backup antibiotics!`, [], { tag: 'rule' }),
          fact(`Verify WHO × WHICH DRUG × IMMUNE vs. SIDE EFFECT on every single quote.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Band Station', wingIndex: 1, label: 'Issue Red Bands',
        shown: [
          fact(`Place a RED Penicillin-Block wristband ONLY on confirmed personal Penicillin allergies.`, [], { tag: 'rule' }),
          fact(`All other charts receive first-line Penicillin safely.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'WHO × WHICH × WHAT Audit',
      dispatch: 'All six charts contain the words "allergy" or "Penicillin" — bind WHO reacted, WHICH drug, and immune vs. side effect.',
      order: 'Place a RED Penicillin-Block wristband ONLY on patients with a true personal immune allergy to Penicillin.',
      hint: 'Check all 3 slots: Patient themselves vs. relative, Penicillin vs. Sulfa/Shellfish, and Hives/Swelling vs. mild stomach upset.',
      bayDefaultLabel: 'Allergy Scope',
      cards,
      evaluate(activeCards) {
        const targets = uniqueSortedIds(factsByTag(activeCards, 'true_pen').map((x) => x.p));
        const rivals = factsByTag(activeCards, 'trap').map((x) => x.p);
        return {
          targets,
          proof: `Binding exact WHO × WHICH DRUG × IMMUNE scope isolates ${formatList(targets)}, filtering out relatives, Sulfa/Shellfish, and non-allergic stomach upset.`,
          rival: buildRivalInfo(targets, rivals, (r) => `${pName(r)}'s quote refers to a relative, a different trigger (Sulfa/Shellfish), or mild non-allergic stomach upset.`),
        };
      },
    };
  },

  // =========================================================================
  // FAMILY 4: PREDICTIVE & QUANTITATIVE REASONING (#33–#41)
  // =========================================================================

  // #33 Probabilistic reasoning (Before · Atomic)
  // Marginal survival lift ΔP = P(with) − P(without) compared across 6 poisoned patients
  'probabilistic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Poison Desk', wingIndex: 0, label: 'Marginal Lift Law',
        shown: [
          fact(`One antidote syringe left. Give it to the bay with the BIGGEST jump: (Odds WITH − Odds WITHOUT).`, [], { tag: 'rule' }),
          fact(`Ignore highest final survival or lowest starting odds whenever the marginal lift is smaller.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Odds Sheet A', wingIndex: 1, label: 'Bays A & B',
        shown: [
          fact(`${pName(a)}: 25% without → 90% WITH antidote — LOWER final % than ${pName(b)}.`, [a, b], { tag: 'odds', p: a, wo: 25, wi: 90 }),
          fact(`${pName(b)}: 80% without → 96% WITH antidote — HIGHEST final % on the ward.`, [b], { tag: 'odds', p: b, wo: 80, wi: 96 }),
        ],
        alt: [
          fact(`${pName(a)}: 75% without → 92% WITH antidote — HIGHER final % than ${pName(b)}.`, [a, b], { tag: 'odds', p: a, wo: 75, wi: 92 }),
          fact(`${pName(b)}: 20% without → 88% WITH antidote — LOWER starting odds than ${pName(a)}.`, [b, a], { tag: 'odds', p: b, wo: 20, wi: 88 }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Odds Sheet B', wingIndex: 1, label: 'Bays C & D',
        shown: [
          fact(`${pName(c)}: 5% without → 15% WITH antidote — LOWER starting odds than ${pName(a)}.`, [c, a], { tag: 'odds', p: c, wo: 5, wi: 15 }),
          fact(`${pName(d)}: 40% without → 80% WITH antidote — HIGHER starting odds than ${pName(a)}.`, [d, a], { tag: 'odds', p: d, wo: 40, wi: 80 }),
        ],
        alt: [
          fact(`${pName(c)}: 5% without → 15% WITH antidote — LOWER starting odds than ${pName(b)}.`, [c, b], { tag: 'odds', p: c, wo: 5, wi: 15 }),
          fact(`${pName(d)}: 45% without → 80% WITH antidote — HIGHER starting odds than ${pName(b)}.`, [d, b], { tag: 'odds', p: d, wo: 45, wi: 80 }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Odds Sheet C', wingIndex: 0, label: 'Bays E & F',
        shown: [
          fact(`${pName(e)}: 88% without → 95% WITH antidote — HIGHER baseline survival than ${pName(b)}.`, [e, b], { tag: 'odds', p: e, wo: 88, wi: 95 }),
          fact(`${pName(f)}: 30% without → 60% WITH antidote — LOWER post-antidote ceiling than ${pName(d)}.`, [f, d], { tag: 'odds', p: f, wo: 30, wi: 60 }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Poison Desk', wingIndex: 0, label: 'Subtract Every Pair',
        shown: [
          fact(`Every bay here drank the tainted batch — rank all 6 by (WITH − WITHOUT) gain.`, [], { tag: 'rule' }),
          fact(`Compare the #1 jump against ${pName(d)} carefully.`, [d], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Syringe Call', wingIndex: 1, label: 'Single Syringe Release',
        shown: [
          fact(`Inject the ONE patient whose survival odds climb by the largest percentage-point jump.`, [], { tag: 'rule' }),
          fact(`Backup vials arrive in 2 hours for supportive care.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'The Last Antidote Syringe',
      dispatch: 'Six poisoned bays, ONE syringe — compare marginal survival lift (WITH − WITHOUT) across all six.',
      order: 'Give the sole antidote syringe to the SINGLE patient with the LARGEST percentage-point jump in survival odds.',
      hint: 'Compute (WITH − WITHOUT) for all six bays — don’t grab the highest final % or lowest start %.',
      bayDefaultLabel: 'Survival Lift',
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'odds')
          .map((x) => ({ id: x.p, wo: x.wo, wi: x.wi, gain: x.wi - x.wo }))
          .sort((x, y) => y.gain - x.gain);
        const top = list[0];
        const run = list[1];
        const targets = top ? [top.id] : [];
        return {
          targets,
          proof: `Comparing (WITH − WITHOUT) puts ${pName(top.id)} #1 at +${top.gain}% (${top.wo}% → ${top.wi}%), beating runner-up ${pName(run.id)} (+${run.gain}%).`,
          rival: buildRivalInfo(targets, [run.id, b, c, a], (r) => {
            const x = list.find((item) => item.id === r);
            return `${pName(r)} only gains +${x.gain}% (${x.wo}% → ${x.wi}%), far less marginal lift than ${pName(top.id)}'s +${top.gain}%.`;
          }),
        };
      },
    };
  },

  // #34 Statistical reasoning (After · Composite)
  // Comparing sample reliability (N=1 noisy spike vs. verified repeat trend > 2× ward ceiling) across 6 labs
  'statistical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Ward Curve', wingIndex: 0, label: 'Ward Spread & Sample Rule',
        shown: [
          fact(`Ward baseline: 95% of normal ER labs fall between 0.6 and 1.8 (DOUBLE the 1.8 ceiling = 3.6).`, [], { tag: 'rule' }),
          fact(`Flag true hidden organ shock ONLY if: (1) Confirmed on ≥ 2 clean draws AND (2) Above 3.6 (> DOUBLE ceiling).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Lab Batch A', wingIndex: 1, label: 'Repeat Counts A',
        shown: [
          fact(`${pName(a)}: Draw #1 = 6.2 · Draw #2 = 6.5 — HIGHER on both clean draws than ${pName(c)}.`, [a, c], { tag: 'st', p: a, val: 6.4, clean: true }),
          fact(`${pName(b)}: Draw #1 = 5.9 from a squeezed IV tourniquet · clean Draw #2 = 1.4 — DROPPED below ${pName(c)}.`, [b, c], { tag: 'st', p: b, val: 1.4, clean: false }),
        ],
        alt: [
          fact(`${pName(a)}: Draw #1 = 5.8 from a squeezed IV tourniquet · clean Draw #2 = 1.5 — DROPPED below ${pName(c)}.`, [a, c], { tag: 'st', p: a, val: 1.5, clean: false }),
          fact(`${pName(b)}: Draw #1 = 6.6 · Draw #2 = 6.8 — HIGHER on both clean draws than ${pName(c)}.`, [b, c], { tag: 'st', p: b, val: 6.7, clean: true }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Lab Batch B', wingIndex: 1, label: 'Repeat Counts B',
        shown: [
          fact(`${pName(c)}: Draw #1 = 2.1 · Draw #2 = 2.0 — SLIGHTLY ABOVE ${pName(e)} after climbing hospital stairs.`, [c, e], { tag: 'st', p: c, val: 2.0, clean: true }),
          fact(`${pName(d)}: Draw #1 = 5.4 · Draw #2 = 5.8 — SAME sustained upward trend as ${pName(a)}.`, [d, a], { tag: 'st', p: d, val: 5.6, clean: true }),
        ],
        alt: [
          fact(`${pName(c)}: Draw #1 = 2.1 · Draw #2 = 2.0 — SLIGHTLY ABOVE ${pName(e)} after climbing hospital stairs.`, [c, e], { tag: 'st', p: c, val: 2.0, clean: true }),
          fact(`${pName(d)}: Draw #1 = 1.9 · Draw #2 = 1.8 — LOWER than ${pName(c)}.`, [d, c], { tag: 'st', p: d, val: 1.8, clean: true }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Lab Batch C', wingIndex: 0, label: 'Reference Anchors',
        shown: [
          fact(`${pName(e)}: Draw #1 = 1.2 · Draw #2 = 1.3 — dead center of the 1,000-patient ward curve.`, [e], { tag: 'st', p: e, val: 1.2, clean: true }),
          fact(`${pName(f)}: Draw #1 = 4.9 from a clotted tube · clean Draw #2 = 1.6 — SAME draw-2 drop as ${pName(b)}.`, [f, b], { tag: 'st', p: f, val: 1.6, clean: false }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Ward Curve', wingIndex: 0, label: 'Artifact vs. Signal',
        shown: [
          fact(`A single high spike that drops back to ~1.5 on Draw #2 is measurement noise, NOT shock.`, [], { tag: 'rule' }),
          fact(`A steady 2.0 is mild everyday variance — stay focused on confirmed values > 3.6.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Shock Resus', wingIndex: 1, label: 'Treat True Outliers',
        shown: [
          fact(`Start hidden-shock fluids ONLY for confirmed repeat outliers strictly ABOVE 3.6.`, [], { tag: 'rule' }),
          fact(`Ignore reverted lab artifacts and mild ~2.0 bumps.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Signal vs. Sample Artifact',
      dispatch: 'Six bays posted blood-stress labs — separate confirmed extreme outliers (> 3.6) from reverted sample artifacts and normal wiggle.',
      order: 'Start hidden-shock resuscitation for EVERY patient with a CONFIRMED repeat reading strictly ABOVE 3.6.',
      hint: 'Check BOTH repeat confirmation (did Draw #2 stay high?) AND height above 3.6 (double the 1.8 ceiling).',
      bayDefaultLabel: 'Lab Outlier',
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'st');
        const targets = uniqueSortedIds(list.filter((x) => x.clean && x.val > 3.6).map((x) => x.p));
        const rivals = list.filter((x) => !(x.clean && x.val > 3.6)).map((x) => x.p);
        return {
          targets,
          proof: `Filtering out reverted Draw-#2 lab artifacts and mild ~2.0 variance isolates ${formatList(targets)} as confirmed outliers > 3.6.`,
          rival: buildRivalInfo(targets, [b, f, c, a], (r) => {
            const x = list.find((item) => item.p === r);
            return x && !x.clean
              ? `${pName(r)}'s first spike reverted to ${x.val} on Draw #2 — a sampling artifact, not organ shock.`
              : `${pName(r)}'s confirmed reading (${x?.val}) stays well below the 3.6 extreme-outlier line.`;
          }),
        };
      },
    };
  },

  // #35 Counterfactual reasoning (After · Composite)
  // M&M what-if arithmetic: Current Loss + (10 min × Pre-Tourniquet Rate) > 2,000 mL across 6 bays
  'counterfactual-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'M&M Audit', wingIndex: 0, label: '10-Min What-If Formula',
        shown: [
          fact(`Tourniquets stopped bleeding 10 minutes BEFORE arrival. Lethal threshold = strictly OVER 2,000 mL.`, [], { tag: 'rule' }),
          fact(`What-If Loss WITHOUT tourniquet = Current Loss + (10 × Pre-Tourniquet Rate/min).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'EMS Logs A', wingIndex: 1, label: 'Loss vs. Rate A',
        shown: [
          fact(`${pName(a)}: Arrived at 1,500 mL · bled at 70 mL/min — FASTER THAN ${pName(b)}'s 30 mL/min.`, [a, b], { tag: 'cf', p: a, cur: 1500, rate: 70 }),
          fact(`${pName(b)}: Arrived at 1,650 mL — HIGHER starting loss than ${pName(a)} — bled at 30 mL/min.`, [b, a], { tag: 'cf', p: b, cur: 1650, rate: 30 }),
        ],
        alt: [
          fact(`${pName(a)}: Arrived at 1,300 mL · bled at 40 mL/min — SLOWER than ${pName(b)}.`, [a, b], { tag: 'cf', p: a, cur: 1300, rate: 40 }),
          fact(`${pName(b)}: Arrived at 1,600 mL · bled at 60 mL/min — FASTER THAN ${pName(a)}'s 40 mL/min.`, [b, a], { tag: 'cf', p: b, cur: 1600, rate: 60 }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'EMS Logs B', wingIndex: 1, label: 'Loss vs. Rate B',
        shown: [
          fact(`${pName(c)}: Arrived at 1,100 mL · bled at 80 mL/min — FASTER rate than ${pName(d)}, LOWER start.`, [c, d], { tag: 'cf', p: c, cur: 1100, rate: 80 }),
          fact(`${pName(d)}: Arrived at 1,400 mL · bled at 50 mL/min — HIGHER starting loss than ${pName(c)}.`, [d, c], { tag: 'cf', p: d, cur: 1400, rate: 50 }),
        ],
        alt: [
          fact(`${pName(c)}: Arrived at 1,300 mL · bled at 80 mL/min — FASTER rate than ${pName(d)}.`, [c, d], { tag: 'cf', p: c, cur: 1300, rate: 80 }),
          fact(`${pName(d)}: Arrived at 1,400 mL · bled at 50 mL/min — HIGHER starting loss than ${pName(c)}.`, [d, c], { tag: 'cf', p: d, cur: 1400, rate: 50 }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'EMS Logs C', wingIndex: 0, label: 'Loss vs. Rate C',
        shown: [
          fact(`${pName(e)}: Arrived at 1,700 mL — HIGHEST arrival loss on the ward — bled at 20 mL/min.`, [e], { tag: 'cf', p: e, cur: 1700, rate: 20 }),
          fact(`${pName(f)}: Arrived at 900 mL · bled at 60 mL/min — TRIPLE ${pName(e)}'s bleed rate.`, [f, e], { tag: 'cf', p: f, cur: 900, rate: 60 }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'M&M Audit', wingIndex: 0, label: 'Don’t Grab Raw Maxes',
        shown: [
          fact(`Neither highest arrival loss (${pName(e)}) nor fastest rate alone proves crossing 2,000 mL — add BOTH terms!`, [e], { tag: 'note' }),
          fact(`Strict cutoff: strictly GREATER THAN 2,000 mL (1,900 or 1,950 stays under!).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Board Report', wingIndex: 1, label: 'Prove Lives Saved',
        shown: [
          fact(`Multiply Rate × 10 and add to Current Loss for every bay.`, [], { tag: 'rule' }),
          fact(`Flag EVERY patient who WOULD have exceeded 2,000 mL without the early tourniquet.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'What If the Tourniquet Failed?',
      dispatch: 'In M&M review, compute Current Loss + (10 min × Rate) across six cases to prove who would have crossed 2,000 mL.',
      order: 'Identify EVERY patient who WOULD have exceeded 2,000 mL total blood loss without the 10-minute early tourniquet.',
      hint: 'Add Current Loss + (10 × Rate/min) for each bay — neither highest start loss nor fastest rate wins alone.',
      bayDefaultLabel: 'M&M Bleed Math',
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'cf').map((x) => ({
          id: x.p,
          cur: x.cur,
          rate: x.rate,
          proj: x.cur + 10 * x.rate,
        }));
        const targets = uniqueSortedIds(list.filter((x) => x.proj > 2000).map((x) => x.id));
        const rivals = list.filter((x) => x.proj <= 2000).sort((x, y) => y.proj - x.proj).map((x) => x.id);
        return {
          targets,
          proof: `Computing Current + 10×Rate puts ${formatList(targets)} strictly above 2,000 mL (${targets.map((id) => { const x = list.find((r) => r.id === id); return `${pName(id)}: ${x.cur}+${x.rate * 10}=${x.proj} mL`; }).join(', ')}).`,
          rival: buildRivalInfo(targets, rivals, (r) => {
            const x = list.find((item) => item.id === r);
            return `${pName(r)} would have reached ${x.proj} mL (${x.cur} + 10×${x.rate}), staying at or below 2,000 mL.`;
          }),
        };
      },
    };
  },

  // #36 Hypothetical reasoning (Before · Atomic)
  // Real 2×5 ICU power-grid simulation: IF Gen-B (Right Wall Bays 6–10) trips → who loses battery-less electric life support?
  'hypothetical-reasoning': (rng) => {
    const allIds = pickPlayers(rng, 10);
    const byBay = {};
    for (const id of allIds) byBay[pBay(id)] = id;
    const r1 = byBay[6];
    const r2 = byBay[8];
    const r3 = byBay[9];
    const r4 = byBay[10];
    const l1 = byBay[2];
    const l2 = byBay[4];

    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Power Ops', wingIndex: 0, label: 'IF Generator B Fails',
        shown: [
          fact(`SUPPOSE Generator B trips in 30 sec → cuts wall power ONLY to RIGHT WALL (Bays 6–10).`, [], { tag: 'rule' }),
          fact(`Left Wall (Bays 1–5) stays 100% live on Generator A (INDEPENDENT of Generator B).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Gear Log A', wingIndex: 1, label: 'Ventilator Hookups',
        shown: [
          fact(`${pName(r1)} (Bay 6) DEPENDS ON a wall-powered ventilator with ZERO internal battery.`, [r1], { tag: 'dep', p: r1, right: true, noBat: true }),
          fact(`${pName(l1)} (Bay 2) uses the SAME zero-battery ventilator as ${pName(r1)} on the opposite wall.`, [l1, r1], { tag: 'dep', p: l1, right: false, noBat: true }),
        ],
        alt: [
          fact(`${pName(r1)} (Bay 6) runs on a pressurized mechanical oxygen cylinder — UNLIKE ${pName(r3)}'s electric vent.`, [r1, r3], { tag: 'dep', p: r1, right: true, noBat: false }),
          fact(`${pName(r3)} (Bay 9) DEPENDS ON a wall-powered ventilator with ZERO internal battery.`, [r3], { tag: 'dep', p: r3, right: true, noBat: true }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Gear Log B', wingIndex: 1, label: 'Pump & Battery Audit',
        shown: [
          fact(`${pName(r2)} (Bay 8) DEPENDS ON an electric heart pump whose backup battery is dead — SAME grid as ${pName(r1)}.`, [r2, r1], { tag: 'dep', p: r2, right: true, noBat: true }),
          fact(`${pName(r3)} (Bay 9) breathes from a pressurized mechanical oxygen cylinder with no wall cord.`, [r3], { tag: 'dep', p: r3, right: true, noBat: false }),
        ],
        alt: [
          fact(`${pName(r2)} (Bay 8) DEPENDS ON an electric heart pump whose backup battery is dead — SAME grid as ${pName(r3)}.`, [r2, r3], { tag: 'dep', p: r2, right: true, noBat: true }),
          fact(`${pName(l1)} (Bay 2) uses a zero-battery ventilator on the Left Wall — OPPOSITE grid from ${pName(r2)}.`, [l1, r2], { tag: 'dep', p: l1, right: false, noBat: true }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Gear Log C', wingIndex: 0, label: 'Backup Batteries Check',
        shown: [
          fact(`${pName(r4)} (Bay 10) runs on an electric ventilator backed by a fresh 4-hour internal battery — UNLIKE ${pName(r2)}.`, [r4, r2], { tag: 'dep', p: r4, right: true, noBat: false }),
          fact(`${pName(l2)} (Bay 4) runs on a zero-battery heart pump on the Left Wall — SAME Generator A wall as ${pName(l1)}.`, [l2, l1], { tag: 'dep', p: l2, right: false, noBat: true }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Power Ops', wingIndex: 0, label: '3-Way Failure Condition',
        shown: [
          fact(`A bay loses life support ONLY if ALL 3 hold: (1) Right Wall 6–10 + (2) Electric machine + (3) ZERO working battery.`, [], { tag: 'rule' }),
          fact(`Left-wall bays and fresh-battery bays keep running smoothly if Generator B drops.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Surge Lead', wingIndex: 1, label: 'Pre-Stage Manual Teams',
        shown: [
          fact(`Station manual squeeze-bag crews ONLY at bays that would immediately go dark under the blackout.`, [], { tag: 'rule' }),
          fact(`Check bay numbers directly on the left ICU grid.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Blackout Surge Simulation',
      dispatch: 'Simulate Generator B failing (Bays 6–10 only) — intersect wall grid, electric gear, and missing battery.',
      order: 'Pre-stage manual backup at EVERY bay that will immediately lose life support if Generator B (Bays 6–10) trips.',
      hint: 'Require ALL 3: Right Wall (Bays 6–10) + Electric life support + Dead/Zero battery.',
      bayDefaultLabel: 'Power Grid',
      cards,
      evaluate(activeCards) {
        const deps = factsByTag(activeCards, 'dep');
        const targets = uniqueSortedIds(deps.filter((x) => x.right && x.noBat).map((x) => x.p));
        const rivals = deps.filter((x) => !(x.right && x.noBat)).map((x) => x.p);
        return {
          targets,
          proof: `Simulating a Generator B trip (Bays 6–10) hits ONLY ${formatList(targets)}: Right Wall + wall-electric support + zero working battery.`,
          rival: buildRivalInfo(targets, [l1, r4, r3, l2], (r) => {
            const x = deps.find((item) => item.p === r);
            return x && !x.right
              ? `${pName(r)} (Bay ${pBay(r)}) sits on the Left Wall (Generator A stays online).`
              : `${pName(r)} (Bay ${pBay(r)}) has either a 4-hour internal battery or non-electric mechanical oxygen.`;
          }),
        };
      },
    };
  },

  // #37 Predictive reasoning (Inside · Atomic)
  // Extrapolating 5-minute slopes (01:00 → 01:05 → 01:10 → 01:15) across 6 patients clustered near BP 80
  'predictive-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Slope Rule', wingIndex: 0, label: '01:15 Crash Threshold',
        shown: [
          fact(`Brain-faint line = BP ≤ 70. Readings occur every 5 minutes (01:00 → 01:05 → 01:10).`, [], { tag: 'rule' }),
          fact(`Project each bay's exact 5-minute step ONE MORE step forward to 01:15 — catch who crosses ≤ 70!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Telemetry A', wingIndex: 1, label: '5-Min Slopes A & B',
        shown: [
          fact(`${pName(a)}: 114 → 98 → 82 — dropping FASTER THAN ${pName(c)}.`, [a, c], { tag: 'tr', p: a, next: 66, step: -16 }),
          fact(`${pName(b)}: 72 → 76 → 80 — currently LOWER THAN ${pName(a)} yet climbing.`, [b, a], { tag: 'tr', p: b, next: 84, step: +4 }),
        ],
        alt: [
          fact(`${pName(a)}: 86 → 83 → 80 — SLOWER slide than ${pName(b)}.`, [a, b], { tag: 'tr', p: a, next: 77, step: -3 }),
          fact(`${pName(b)}: 116 → 98 → 80 — dropping FASTER THAN ${pName(a)}.`, [b, a], { tag: 'tr', p: b, next: 62, step: -18 }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Telemetry B', wingIndex: 1, label: '5-Min Slopes C & D',
        shown: [
          fact(`${pName(c)}: 86 → 83 → 80 — HALF the drop rate of ${pName(d)}.`, [c, d], { tag: 'tr', p: c, next: 77, step: -3 }),
          fact(`${pName(d)}: 98 → 92 → 86 — HIGHER current BP than ${pName(c)}.`, [d, c], { tag: 'tr', p: d, next: 80, step: -6 }),
        ],
        alt: [
          fact(`${pName(c)}: 86 → 83 → 80 — MUCH SLOWER slide than ${pName(d)}.`, [c, d], { tag: 'tr', p: c, next: 77, step: -3 }),
          fact(`${pName(d)}: 110 → 96 → 82 — STEEPER drop than ${pName(c)}.`, [d, c], { tag: 'tr', p: d, next: 68, step: -14 }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Telemetry C', wingIndex: 0, label: '5-Min Slopes E & F',
        shown: [
          fact(`${pName(e)}: 78 → 78 → 78 — currently LOWER THAN ${pName(a)} yet holding flat.`, [e, a], { tag: 'tr', p: e, next: 78, step: 0 }),
          fact(`${pName(f)}: 104 → 94 → 84 — STEEPER drop than ${pName(d)}, SLOWER than ${pName(a)}.`, [f, d, a], { tag: 'tr', p: f, next: 74, step: -10 }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Slope Rule', wingIndex: 0, label: 'Snapshot vs. Velocity',
        shown: [
          fact(`All six bays sit near 78–86 right now — ONLY 5-minute velocity reveals who crosses ≤ 70 by 01:15!`, [], { tag: 'rule' }),
          fact(`Subtract each bay's 5-min drop from its 01:10 reading to project 01:15.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Crash Team', wingIndex: 1, label: 'Pre-Crash Rescue',
        shown: [
          fact(`Apply each bay's 5-min step to its 01:10 reading.`, [], { tag: 'rule' }),
          fact(`Intervene NOW on EVERY bay projected to hit ≤ 70 at 01:15.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Who Crashes at 01:15?',
      dispatch: 'All six bays sit near BP 80 right now — project each 5-minute slope one step forward to catch who crosses ≤ 70.',
      order: 'Intervene NOW on EVERY patient whose 5-minute trend projects to hit 70 OR LOWER at 01:15.',
      hint: 'Find each bay’s 5-min step (01:05 → 01:10) and apply it once more to predict 01:15.',
      bayDefaultLabel: 'BP Slope',
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'tr').sort((x, y) => x.next - y.next);
        const targets = uniqueSortedIds(list.filter((x) => x.next <= 70).map((x) => x.p));
        const rivals = list.filter((x) => x.next > 70).map((x) => x.p);
        return {
          targets,
          proof: `Projecting each 5-minute slope to 01:15 drops ${formatList(targets)} to ≤ 70 (${targets.map((id) => `${pName(id)} → ${list.find((x) => x.p === id).next}`).join(', ')}), while all others stay > 70.`,
          rival: buildRivalInfo(targets, [f, e, b, c], (r) => {
            const x = list.find((item) => item.p === r);
            return `${pName(r)} projects to ${x.next} at 01:15 (${x.step >= 0 ? 'flat/climbing' : `${x.step}/step`}), staying above the 70 crash line.`;
          }),
        };
      },
    };
  },

  // #38 Prognostic reasoning (After · Composite)
  // Multi-organ trajectory coupling (Brain↓ ∩ Kidney↓) across 6 ICU bays
  'prognostic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'ICU Rounds', wingIndex: 0, label: 'Multi-Organ Outlook Law',
        shown: [
          fact(`Single-organ dips often recover — SIMULTANEOUS 24h decline in BOTH Brain AND Kidneys signals grave 48h outlook.`, [], { tag: 'rule' }),
          fact(`Hold an early honest goals-of-care family conference ONLY for multi-organ simultaneous decline.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Neuro 24h', wingIndex: 1, label: 'Brain Score Shifts A',
        shown: [
          fact(`${pName(a)}: Alertness fell 13 → 6 — OPPOSITE OF ${pName(b)}'s recovery 8 → 14.`, [a, b], { tag: 'b_dn', p: a }),
          fact(`${pName(d)}: Alertness dipped 14 → 11 on IV pain infusion — SAME downward brain direction as ${pName(a)}.`, [d, a], { tag: 'b_dn', p: d }),
        ],
        alt: [
          fact(`${pName(c)}: Alertness fell 13 → 6 — OPPOSITE OF ${pName(b)}'s recovery 8 → 14.`, [c, b], { tag: 'b_dn', p: c }),
          fact(`${pName(d)}: Alertness dipped 14 → 11 on IV pain infusion — SAME downward brain direction as ${pName(c)}.`, [d, c], { tag: 'b_dn', p: d }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Kidney 24h', wingIndex: 0, label: 'Urine Output Shifts A',
        shown: [
          fact(`${pName(a)}: Urine fell 45 → 0 mL/hr — SAME downward kidney trend as ${pName(b)}.`, [a, b], { tag: 'k_dn', p: a }),
          fact(`${pName(b)}: Urine fell 40 → 8 mL/hr while alertness climbed 8 → 14.`, [b], { tag: 'k_dn', p: b }),
        ],
        alt: [
          fact(`${pName(c)}: Urine fell 45 → 0 mL/hr — SAME downward kidney trend as ${pName(b)}.`, [c, b], { tag: 'k_dn', p: c }),
          fact(`${pName(b)}: Urine fell 40 → 8 mL/hr while alertness climbed 8 → 14.`, [b], { tag: 'k_dn', p: b }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Kidney 24h', wingIndex: 0, label: 'Urine Output Shifts B',
        shown: [
          fact(`${pName(d)}: Kidneys climbed 50 → 70 mL/hr — OPPOSITE OF ${pName(a)}'s kidney collapse.`, [d, a], { tag: 'k_ok', p: d }),
          fact(`${pName(e)}: Alertness steady 15/15 and urine steady 65 mL/hr; ${pName(f)} is improving in BOTH.`, [e, f], { tag: 'both_ok', ps: [e, f] }),
        ],
        alt: [
          fact(`${pName(d)}: Kidneys climbed 50 → 70 mL/hr — OPPOSITE OF ${pName(c)}'s kidney collapse.`, [d, c], { tag: 'k_ok', p: d }),
          fact(`${pName(a)}: Alertness steady 14/15 and urine steady 60 mL/hr; ${pName(e)} & ${pName(f)} improving in BOTH.`, [a, e, f], { tag: 'both_ok', ps: [a, e, f] }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Neuro 24h', wingIndex: 1, label: 'Cross-Organ Synthesis',
        shown: [
          fact(`${pName(b)} has failing kidneys yet an IMPROVING brain; ${pName(d)} has sleepy brain yet STRONG kidneys.`, [b, d], { tag: 'note' }),
          fact(`Only intersecting Brain DOWN ∩ Kidney DOWN reveals true multi-organ collapse.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Family Room', wingIndex: 1, label: 'Urgent Family Talk',
        shown: [
          fact(`Call an early honest goals-of-care conference for the SINGLE bay worsening in BOTH organs.`, [], { tag: 'rule' }),
          fact(`Single-organ struggles stay on active recovery plans.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: '48-Hour Multi-Organ Outlook',
      dispatch: 'Cross-link 24-hour Brain and Kidney trajectories across six ICU bays to spot simultaneous two-organ collapse.',
      order: 'Call an urgent goals-of-care family meeting for the SINGLE patient declining in BOTH brain and kidneys.',
      hint: 'Intersect the Brain-Down list with the Kidney-Down list — reject single-organ dips.',
      bayDefaultLabel: 'ICU 48h Trend',
      cards,
      evaluate(activeCards) {
        const bd = new Set(factsByTag(activeCards, 'b_dn').map((x) => x.p));
        const kd = new Set(factsByTag(activeCards, 'k_dn').map((x) => x.p));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => bd.has(id) && kd.has(id)));
        const rivals = [b, d, c, a].filter((id) => !targets.includes(id) && (bd.has(id) || kd.has(id)));
        return {
          targets,
          proof: `Intersecting 24h Brain decline with 24h Kidney shutdown isolates ${formatList(targets)} as the lone multi-organ collapse.`,
          rival: buildRivalInfo(targets, rivals, (r) =>
            kd.has(r) ? `${pName(r)}'s kidneys are struggling, but their brain is actively waking up (8 → 14).` : `${pName(r)} is mildly sedated on pain meds while their kidneys remain strong (70 mL/hr).`
          ),
        };
      },
    };
  },

  // #39 Extrapolative reasoning (Before · Atomic)
  // Rate-division burnout time (Liters ÷ Flow < 15 min) across 6 portable oxygen cylinders
  'extrapolative-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Wall O2 Clock', wingIndex: 0, label: '15-Minute Restart Line',
        shown: [
          fact(`Wall oxygen restarts in EXACTLY 15 minutes. Tank Time Left = Remaining Liters ÷ Flow Rate (L/min).`, [], { tag: 'rule' }),
          fact(`Swap fresh cylinders right now for EVERY bay running dry BEFORE Minute 15 (< 15 min)!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Gauges A', wingIndex: 1, label: 'Cylinders A & B',
        shown: [
          fact(`${pName(a)}: 180 L left · burning 15 L/min — MORE Liters than ${pName(b)}, yet OVER DOUBLE the burn rate.`, [a, b], { tag: 'tk', p: a, l: 180, r: 15 }),
          fact(`${pName(b)}: 120 L left · burning 6 L/min — SLOWER flow than ${pName(a)}.`, [b, a], { tag: 'tk', p: b, l: 120, r: 6 }),
        ],
        alt: [
          fact(`${pName(a)}: 180 L left · burning 9 L/min — MORE Liters than ${pName(b)} at a SLOWER burn rate.`, [a, b], { tag: 'tk', p: a, l: 180, r: 9 }),
          fact(`${pName(b)}: 120 L left · burning 12 L/min — FASTER burn rate than ${pName(a)}.`, [b, a], { tag: 'tk', p: b, l: 120, r: 12 }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Gauges B', wingIndex: 1, label: 'Cylinders C & D',
        shown: [
          fact(`${pName(c)}: 240 L left · burning 12 L/min — OVER DOUBLE ${pName(d)}'s cylinder volume.`, [c, d], { tag: 'tk', p: c, l: 240, r: 12 }),
          fact(`${pName(d)}: 110 L left · burning 10 L/min — SAME flow rate as ${pName(e)}.`, [d, e], { tag: 'tk', p: d, l: 110, r: 10 }),
        ],
        alt: [
          fact(`${pName(c)}: 240 L left · burning 12 L/min — LARGER tank than ${pName(d)} at faster flow.`, [c, d], { tag: 'tk', p: c, l: 240, r: 12 }),
          fact(`${pName(d)}: 160 L left · burning 8 L/min — SLOWER flow than ${pName(c)}.`, [d, c], { tag: 'tk', p: d, l: 160, r: 8 }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Gauges C', wingIndex: 0, label: 'Cylinders E & F',
        shown: [
          fact(`${pName(e)}: 150 L left · burning 10 L/min — DOUBLE ${pName(f)}'s flow rate.`, [e, f], { tag: 'tk', p: e, l: 150, r: 10 }),
          fact(`${pName(f)}: 90 L left · burning 5 L/min — SMALLEST cylinder volume on the ward.`, [f], { tag: 'tk', p: f, l: 90, r: 5 }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Wall O2 Clock', wingIndex: 0, label: 'Gauge Size Illusion',
        shown: [
          fact(`Compare ${pName(f)} (90 L) vs. ${pName(a)} (180 L): never judge by raw Liters without dividing by burn rate!`, [f, a], { tag: 'note' }),
          fact(`Cutoff is strictly UNDER 15 minutes (< 15 min); 15+ min clears safely.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Tank Cart', wingIndex: 1, label: 'Swap Short Tanks',
        shown: [
          fact(`Divide Liters ÷ Rate for all six portable tanks.`, [], { tag: 'rule' }),
          fact(`Swap EVERY tank that empties in strictly LESS THAN 15 minutes.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Oxygen Tank Burnout',
      dispatch: 'Six patients run on portable tanks until wall O2 restarts at Minute 15 — divide Liters ÷ Flow Rate to catch early burnouts.',
      order: 'Swap fresh tanks NOW for EVERY patient whose portable cylinder empties in strictly UNDER 15 minutes.',
      hint: 'Compute Liters ÷ Flow Rate (L/min) for all 6 tanks — a small tank at 5 L/min outlasts a huge tank at 15 L/min!',
      bayDefaultLabel: 'O2 Tank Math',
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'tk').map((x) => ({ id: x.p, l: x.l, r: x.r, m: x.l / x.r }));
        const targets = uniqueSortedIds(list.filter((x) => x.m < 15).map((x) => x.id));
        const rivals = list.filter((x) => x.m >= 15).sort((x, y) => x.m - y.m).map((x) => x.id);
        return {
          targets,
          proof: `Dividing Liters ÷ Rate shows ONLY ${formatList(targets)} run dry under 15 min (${targets.map((id) => { const x = list.find((r) => r.id === id); return `${pName(id)}: ${x.l}÷${x.r}=${x.m}m`; }).join(', ')}).`,
          rival: buildRivalInfo(targets, rivals, (r) => {
            const x = list.find((item) => item.id === r);
            return `${pName(r)}'s tank lasts ${x.m} minutes (${x.l} ÷ ${x.r}), clearing the 15-minute restart.`;
          }),
        };
      },
    };
  },

  // #40 Proportional reasoning (Inside · Atomic)
  // Body-volume blood-loss ratios (Lost ÷ Total ≥ 25%) across child, teen, and large-adult bays
  'proportional-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Volume Rule', wingIndex: 0, label: 'Quarter-Volume Shock Rule',
        shown: [
          fact(`Emergency transfusion triggers at ≥ 25% (ONE QUARTER) of a patient's own total blood supply.`, [], { tag: 'rule' }),
          fact(`Total blood scales with body size — compare Lost ÷ Total, NOT raw milliliters!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Bleed Scale A', wingIndex: 1, label: 'Teen vs. Large Adult',
        shown: [
          fact(`${pName(a)} (3,000 mL total): lost 900 mL — LESS raw blood than ${pName(b)}.`, [a, b], { tag: 'pr', p: a, lost: 900, tot: 3000 }),
          fact(`${pName(b)} (6,000 mL total): lost 1,200 mL — DOUBLE ${pName(a)}'s total blood supply.`, [b, a], { tag: 'pr', p: b, lost: 1200, tot: 6000 }),
        ],
        alt: [
          fact(`${pName(a)} (6,000 mL total): lost 1,200 mL — MORE raw blood than ${pName(b)}.`, [a, b], { tag: 'pr', p: a, lost: 1200, tot: 6000 }),
          fact(`${pName(b)} (3,200 mL total): lost 960 mL — SMALLER body supply than ${pName(a)}.`, [b, a], { tag: 'pr', p: b, lost: 960, tot: 3200 }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Bleed Scale B', wingIndex: 1, label: 'Adult vs. Child',
        shown: [
          fact(`${pName(c)} (5,000 mL total): lost 1,000 mL — MORE raw blood than ${pName(d)}.`, [c, d], { tag: 'pr', p: c, lost: 1000, tot: 5000 }),
          fact(`${pName(d)} (child, 2,000 mL total): lost 600 mL — LESS THAN HALF ${pName(c)}'s total volume.`, [d, c], { tag: 'pr', p: d, lost: 600, tot: 2000 }),
        ],
        alt: [
          fact(`${pName(c)} (5,000 mL total): lost 1,000 mL — MORE raw blood than ${pName(d)}.`, [c, d], { tag: 'pr', p: c, lost: 1000, tot: 5000 }),
          fact(`${pName(d)} (child, 2,000 mL total): lost 350 mL — SMALLEST raw loss on the ward.`, [d], { tag: 'pr', p: d, lost: 350, tot: 2000 }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Bleed Scale C', wingIndex: 0, label: 'Borderline Ratios',
        shown: [
          fact(`${pName(e)} (4,000 mL total): lost 900 mL — SAME raw loss as ${pName(a)}, LARGER body supply.`, [e, a], { tag: 'pr', p: e, lost: 900, tot: 4000 }),
          fact(`${pName(f)} (4,800 mL total): lost 1,000 mL — SAME raw loss as ${pName(c)}.`, [f, c], { tag: 'pr', p: f, lost: 1000, tot: 4800 }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Volume Rule', wingIndex: 0, label: 'Multiply-by-4 Shortcut',
        shown: [
          fact(`Fast check: does (Blood Lost × 4) reach or beat Total Blood Supply?`, [], { tag: 'rule' }),
          fact(`Look how 600 mL in a child outweighs 1,200 mL in a 6,000 mL adult!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Blood Bank', wingIndex: 1, label: 'Transfuse ≥ 25%',
        shown: [
          fact(`Start emergency blood transfusion for EVERY patient who lost ≥ 25% of their body's blood.`, [], { tag: 'rule' }),
          fact(`Patients under 25% stabilize on standard IV saline.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Size Matters in Shock',
      dispatch: 'Six bleeding patients span child, teen, and large-adult volumes — compare Blood Lost ÷ Total Blood Supply.',
      order: 'Start emergency blood transfusion for EVERY patient who lost 25% OR MORE of their total blood supply.',
      hint: 'Test (Blood Lost × 4 ≥ Total Blood) for every bay — ignore misleading raw mL totals.',
      bayDefaultLabel: 'Blood Ratio',
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'pr').map((x) => ({ id: x.p, lost: x.lost, tot: x.tot, pct: Math.round((x.lost / x.tot) * 100) }));
        const targets = uniqueSortedIds(list.filter((x) => x.lost * 4 >= x.tot).map((x) => x.id));
        const rivals = list.filter((x) => x.lost * 4 < x.tot).sort((x, y) => y.lost - x.lost).map((x) => x.id);
        return {
          targets,
          proof: `Comparing Lost ÷ Total flags ${formatList(targets)} at ≥ 25% loss (${targets.map((id) => { const x = list.find((r) => r.id === id); return `${pName(id)}: ${x.lost}/${x.tot}=${x.pct}%`; }).join(', ')}).`,
          rival: buildRivalInfo(targets, rivals, (r) => {
            const x = list.find((item) => item.id === r);
            return `${pName(r)} lost ${x.lost}/${x.tot} mL (${x.pct}%), staying below 25% even with a larger raw milliliter count.`;
          }),
        };
      },
    };
  },

  // #41 Mathematical reasoning (Inside · Composite)
  // Cross-card 3-component Early Warning Tally + relative tie-breaking across all 6 bays
  'mathematical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Score Formula', wingIndex: 0, label: '3-Card ICU Formula',
        shown: [
          fact(`Early Warning Score = Breathing + Pressure + Alertness (3 separate nurse cards).`, [], { tag: 'rule' }),
          fact(`Score ≥ 7 triggers immediate ICU transfer; 6 or lower stays on the step-down floor.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:05', wing: 'Resp Team', wingIndex: 1, label: 'Card 1: Breathing Points',
        shown: [
          fact(`${pName(a)}: +3 · ${pName(b)}: +2 · ${pName(c)}: +3.`, [a, b, c], { tag: 's1', map: { [a]: 3, [b]: 2, [c]: 3 } }),
          fact(`${pName(d)}: +1 · ${pName(e)}: +2 · ${pName(f)}: +1.`, [d, e, f], { tag: 's1', map: { [d]: 1, [e]: 2, [f]: 1 } }),
        ],
        alt: [
          fact(`${pName(a)}: +1 · ${pName(b)}: +3 · ${pName(c)}: +3.`, [a, b, c], { tag: 's1', map: { [a]: 1, [b]: 3, [c]: 3 } }),
          fact(`${pName(d)}: +1 · ${pName(e)}: +2 · ${pName(f)}: +1.`, [d, e, f], { tag: 's1', map: { [d]: 1, [e]: 2, [f]: 1 } }),
        ],
      }),
      makeCard({
        index: 2, time: '01:08', wing: 'Triage Desk', wingIndex: 0, label: 'Card 2: Pressure Points',
        shown: [
          fact(`${pName(a)}: +2 · ${pName(b)}: +2 · ${pName(c)}: +1.`, [a, b, c], { tag: 's2', map: { [a]: 2, [b]: 2, [c]: 1 } }),
          fact(`${pName(d)}: +3 · ${pName(e)}: +2 · ${pName(f)}: +2.`, [d, e, f], { tag: 's2', map: { [d]: 3, [e]: 2, [f]: 2 } }),
        ],
        alt: [
          fact(`${pName(a)}: +2 · ${pName(b)}: +3 · ${pName(c)}: +1.`, [a, b, c], { tag: 's2', map: { [a]: 2, [b]: 3, [c]: 1 } }),
          fact(`${pName(d)}: +3 · ${pName(e)}: +2 · ${pName(f)}: +2.`, [d, e, f], { tag: 's2', map: { [d]: 3, [e]: 2, [f]: 2 } }),
        ],
      }),
      makeCard({
        index: 3, time: '01:11', wing: 'Neuro Desk', wingIndex: 1, label: 'Card 3: Alertness Points',
        shown: [
          fact(`${pName(a)}: +3 · ${pName(b)}: +2 · ${pName(c)}: +2.`, [a, b, c], { tag: 's3', map: { [a]: 3, [b]: 2, [c]: 2 } }),
          fact(`${pName(d)}: +3 · ${pName(e)}: +1 · ${pName(f)}: +2.`, [d, e, f], { tag: 's3', map: { [d]: 3, [e]: 1, [f]: 2 } }),
        ],
        alt: [
          fact(`${pName(a)}: +2 · ${pName(b)}: +2 · ${pName(c)}: +2.`, [a, b, c], { tag: 's3', map: { [a]: 2, [b]: 2, [c]: 2 } }),
          fact(`${pName(d)}: +2 · ${pName(e)}: +1 · ${pName(f)}: +2.`, [d, e, f], { tag: 's3', map: { [d]: 2, [e]: 1, [f]: 2 } }),
        ],
      }),
      makeCard({
        index: 4, time: '01:15', wing: 'Score Formula', wingIndex: 0, label: 'Watch the 6 vs. 7 Edge',
        shown: [
          fact(`Multiple bays sit right at 6 points (step-down floor) — double-check every sum!`, [], { tag: 'rule' }),
          fact(`No single card exceeds +3, so ONLY summing across all 3 cards crosses 7.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:18', wing: 'ICU Desk', wingIndex: 1, label: 'Transfer ≥ 7 Now',
        shown: [
          fact(`Sum Breathing + Pressure + Alertness for all six bays.`, [], { tag: 'rule' }),
          fact(`Transfer EVERY patient totaling 7 OR HIGHER straight to ICU.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: '3-Card Early Warning Tally',
      dispatch: 'Three teams logged separate sub-scores across all six bays — sum Breathing + Pressure + Alertness to hit ≥ 7.',
      order: 'Transfer EVERY patient whose 3-card Early Warning Score totals 7 OR HIGHER to ICU.',
      hint: 'Add each patient’s score from Card 1 + Card 2 + Card 3 — watch out for 6-point near-misses!',
      bayDefaultLabel: 'Warning Tally',
      cards,
      evaluate(activeCards) {
        const totals = Object.fromEntries([a, b, c, d, e, f].map((id) => [id, 0]));
        for (const tag of ['s1', 's2', 's3']) {
          for (const rec of factsByTag(activeCards, tag)) {
            for (const [id, v] of Object.entries(rec.map || {})) totals[id] += v;
          }
        }
        const targets = uniqueSortedIds(Object.entries(totals).filter(([, s]) => s >= 7).map(([id]) => id));
        const rivals = Object.entries(totals).filter(([, s]) => s < 7).sort((x, y) => y[1] - x[1]).map(([id]) => id);
        return {
          targets,
          proof: `Summing Breathing + Pressure + Alertness puts ${formatList(targets)} at ≥ 7 (${targets.map((id) => `${pName(id)}=${totals[id]}`).join(', ')}).`,
          rival: buildRivalInfo(targets, rivals, (r) => `${pName(r)} totaled ${totals[r]} points — staying below the 7-point ICU cutoff.`),
        };
      },
    };
  },
};
