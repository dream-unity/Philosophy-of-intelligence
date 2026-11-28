// Relational-First Clinical Reasoning Engines — Families 1 & 2 (#1–#20)
// Fluid-intelligence relational chains & multi-card inference through Diagnostic (#1–#10) & Logical (#11–#20) trauma medicine.
// Zero filler cards, zero rule-repeating cards, zero single-card keyword lookups, zero medical jargon.

import {
  pName,
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

// Helper: find top K items in a directed "a > b" graph via topological / out-reach ordering
function rankGreaterGraph(nodes, edges) {
  const gt = new Map(nodes.map((n) => [n, new Set()]));
  for (const [hi, lo] of edges) {
    if (gt.has(hi) && gt.has(lo)) gt.get(hi).add(lo);
  }
  // Transitive closure
  for (const k of nodes) {
    for (const i of nodes) {
      if (gt.get(i).has(k)) {
        for (const j of gt.get(k)) gt.get(i).add(j);
      }
    }
  }
  const inDeg = new Map(nodes.map((n) => [n, 0]));
  for (const i of nodes) {
    for (const j of gt.get(i)) {
      if (i !== j) inDeg.set(j, (inDeg.get(j) || 0) + 1);
    }
  }
  return { gt, inDeg };
}

export const SEMANTIC_F12 = {
  // =========================================================================
  // FAMILY 1: DIAGNOSTIC & INVESTIGATIVE REASONING (#1–#10)
  // =========================================================================

  // #1 Differential diagnosis (Inside · Composite)
  // Relational comparison of Heart-Squeeze vs Collapsed-Lung vs Blood-Loss across 6 patients
  'differential-diagnosis': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Bedside Exam', wingIndex: 0, label: 'Neck Veins & Chest',
        shown: [
          fact(`${pName(a)}'s neck veins are MORE swollen than ${pName(c)}'s (flat veins).`, [a, c], { tag: 'bulge', hi: a, lo: c }),
          fact(`${pName(b)} has the SAME bulging neck veins as ${pName(a)}, with clear lungs.`, [b, a], { tag: 'same_bulge', p: b, ref: a }),
        ],
        alt: [
          fact(`${pName(a)}'s neck veins are flat — LESS swollen than ${pName(d)}'s bulging veins.`, [a, d], { tag: 'bulge', hi: d, lo: a }),
          fact(`${pName(b)} has the SAME bulging neck veins as ${pName(d)}, with clear lungs.`, [b, d], { tag: 'same_bulge', p: b, ref: d }),
        ],
      }),
      makeCard({
        index: 1, time: '01:05', wing: 'Stethoscope', wingIndex: 1, label: 'Heartbeat vs. Breathing',
        shown: [
          fact(`${pName(a)}'s heartbeat sounds MORE muffled than ${pName(d)}'s crisp beat.`, [a, d], { tag: 'muffled', p: a }),
          fact(`${pName(e)} has a silent right lung — OPPOSITE OF ${pName(a)}'s clear equal breath sounds.`, [e, a], { tag: 'lung_silent', p: e }),
        ],
        alt: [
          fact(`${pName(d)}'s heartbeat sounds MORE muffled than ${pName(a)}'s crisp beat.`, [d, a], { tag: 'muffled', p: d }),
          fact(`${pName(e)} has a silent right lung — OPPOSITE OF ${pName(d)}'s clear equal breath sounds.`, [e, d], { tag: 'lung_silent', p: e }),
        ],
      }),
      makeCard({
        index: 2, time: '01:08', wing: 'Monitors', wingIndex: 0, label: 'Blood Pressure Links',
        shown: [
          fact(`${pName(a)}'s BP (76/48) is LOWER THAN ${pName(b)}'s (124/78).`, [a, b], { tag: 'low_bp', p: a }),
          fact(`${pName(c)}'s BP (78/46) is LOWER THAN ${pName(f)}'s (128/80), matching shock.`, [c, f], { tag: 'low_bp', p: c }),
        ],
        alt: [
          fact(`${pName(d)}'s BP (74/44) is LOWER THAN ${pName(b)}'s (124/78).`, [d, b], { tag: 'low_bp', p: d }),
          fact(`${pName(c)}'s BP (78/46) is LOWER THAN ${pName(f)}'s (128/80), matching shock.`, [c, f], { tag: 'low_bp', p: c }),
        ],
      }),
      makeCard({
        index: 3, time: '01:11', wing: 'Stethoscope', wingIndex: 1, label: 'Second Heart Check',
        shown: [
          fact(`${pName(b)}'s heartbeat is muffled just like ${pName(a)}'s, yet ${pName(b)}'s BP stays high.`, [b, a], { tag: 'muffled', p: b }),
          fact(`${pName(c)}'s heartbeat is crisp and loud — NOT muffled like ${pName(a)}'s.`, [c, a], { tag: 'crisp', p: c }),
        ],
      }),
      makeCard({
        index: 4, time: '01:14', wing: 'Bedside Exam', wingIndex: 0, label: 'Windpipe & Bleeding',
        shown: [
          fact(`${pName(e)}'s windpipe is pushed left while ${pName(e)}'s BP sits LOWER THAN ${pName(f)}'s.`, [e, f], { tag: 'trachea_shift', p: e }),
          fact(`${pName(c)} lost MORE blood externally than ${pName(a)} or ${pName(d)} (explaining flat veins).`, [c, a, d], { tag: 'bleed_only', p: c }),
        ],
      }),
      makeCard({
        index: 5, time: '01:17', wing: 'Trauma Lead', wingIndex: 1, label: 'Heart-Squeeze Triad',
        shown: [
          fact(`Fluid squeezing the heart requires ALL 3: BP < 90 + bulging neck veins + muffled heartbeat.`, [], { tag: 'triad' }),
          fact(`${pName(f)} has HIGHER BP than ${pName(d)}, clear lungs, and flat neck veins.`, [f, d], { tag: 'normal', p: f }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Three Rival Shock Signatures',
      dispatch: 'Distinguish Heart Squeeze from Collapsed Lung and Blood Loss by cross-linking veins, heart sounds, and BP.',
      order: 'Drain the heart sac of the SINGLE patient matching all 3 signs of Heart Squeeze (Low BP + Bulging Veins + Muffled Beat).',
      hint: 'Compare neck veins, heart sounds, and BP across bays — watch out for lookalikes missing one link.',
      bayDefaultLabel: 'Shock Diff-Dx',
      cards,
      evaluate(activeCards) {
        const bulge = new Set();
        for (const f of factsByTag(activeCards, 'bulge')) bulge.add(f.hi);
        for (const f of factsByTag(activeCards, 'same_bulge')) if (bulge.has(f.ref)) bulge.add(f.p);
        const muffled = new Set(factsByTag(activeCards, 'muffled').map((f) => f.p));
        const lowBp = new Set(factsByTag(activeCards, 'low_bp').map((f) => f.p));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => bulge.has(id) && muffled.has(id) && lowBp.has(id)));
        return {
          targets,
          proof: `Binding veins + stethoscope + BP isolates ${formatList(targets)}: bulging veins, muffled heartbeat, AND BP < 90.`,
          rival: buildRivalInfo(targets, [b, c, e, d, a], (r) =>
            bulge.has(r) ? `${pName(r)} has bulging veins and muffled heart sounds, but normal BP (124/78) rules out active shock.` : `${pName(r)} has low BP from blood loss or lung collapse, NOT bulging veins + muffled heart.`
          ),
        };
      },
    };
  },

  // #2 Abductive reasoning (Inside · Atomic)
  // Inferring the single hidden exposure (CO leak in Sealed Cabin B) that explains a web of cross-patient anomalies
  'abductive-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:03', wing: 'Scene Links', wingIndex: 0, label: 'Where They Were Found',
        shown: [
          fact(`${pName(a)} was pulled from the SAME sealed basement room as ${pName(b)}.`, [a, b], { tag: 'room_link', p1: a, p2: b }),
          fact(`${pName(c)} was found outside on the porch — SEPARATE from ${pName(a)}'s sealed room.`, [c, a], { tag: 'outdoors', p: c }),
        ],
        alt: [
          fact(`${pName(d)} was pulled from the SAME sealed basement room as ${pName(b)}.`, [d, b], { tag: 'room_link', p1: d, p2: b }),
          fact(`${pName(a)} was found outside on the porch — SEPARATE from ${pName(b)}'s sealed room.`, [a, b], { tag: 'outdoors', p: a }),
        ],
      }),
      makeCard({
        index: 1, time: '01:07', wing: 'Finger Clip', wingIndex: 1, label: 'Finger-Clip Paradox',
        shown: [
          fact(`${pName(a)}'s finger clip reads 99% — HIGHER THAN wheezing ${pName(e)}'s 86% — yet ${pName(a)} is confused and cherry-red.`, [a, e], { tag: 'co_sign', p: a }),
          fact(`${pName(b)}'s finger clip ALSO reads 99% despite severe headache and dizziness, SAME AS ${pName(a)}.`, [b, a], { tag: 'co_sign', p: b }),
        ],
        alt: [
          fact(`${pName(d)}'s finger clip reads 99% — HIGHER THAN wheezing ${pName(e)}'s 86% — yet ${pName(d)} is confused and cherry-red.`, [d, e], { tag: 'co_sign', p: d }),
          fact(`${pName(b)}'s finger clip ALSO reads 99% despite severe headache and dizziness, SAME AS ${pName(d)}.`, [b, d], { tag: 'co_sign', p: b }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Airway Lab', wingIndex: 0, label: 'Real Arterial Blood Test',
        shown: [
          fact(`Lab confirms ${pName(b)}'s true blood oxygen is HALF of what the finger clip claims (poisoned by generator exhaust).`, [b], { tag: 'co_confirmed', p: b }),
          fact(`${pName(e)}'s wheezing improved RIGHT AFTER an asthma inhaler — unlike ${pName(a)} or ${pName(b)}.`, [e, a, b], { tag: 'asthma', p: e }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Scene Links', wingIndex: 0, label: 'Generator Exposure',
        shown: [
          fact(`${pName(d)} entered the basement ONLY for 10 seconds to drag ${pName(b)} out; ${pName(d)}'s real blood test is clean.`, [d, b], { tag: 'brief', p: d }),
          fact(`${pName(f)} arrived from an unrelated highway crash with normal alertness and normal blood gases.`, [f], { tag: 'unrelated', p: f }),
        ],
        alt: [
          fact(`${pName(a)} stood outside directing ambulances; ${pName(a)}'s real blood test is clean.`, [a], { tag: 'brief', p: a }),
          fact(`${pName(f)} arrived from an unrelated highway crash with normal alertness and normal blood gases.`, [f], { tag: 'unrelated', p: f }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Finger Clip', wingIndex: 1, label: 'Why One Cause Explains Both',
        shown: [
          fact(`Carbon monoxide tricks finger clips into reading ~99% while starving the brain of real oxygen.`, [], { tag: 'mech' }),
          fact(`${pName(c)} has a fever (39°C) and normal blood gas — BETTER explained by flu than exhaust gas.`, [c], { tag: 'flu', p: c }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Chamber Team', wingIndex: 1, label: 'Hyperbaric Oxygen Slots',
        shown: [
          fact(`Both sealed-room victims showing the 99%-yet-confused paradox need 100% high-pressure oxygen now.`, [], { tag: 'action' }),
          fact(`Patients whose real blood test is clean or whose low clip responds to asthma meds do NOT have exhaust poisoning.`, [], { tag: 'action' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'The 99% Oxygen Paradox',
      dispatch: 'Find the hidden shared exposure explaining why two patients look "99% oxygenated" yet are collapsing.',
      order: 'Put EVERY patient whose symptoms are best explained by sealed-room Carbon Monoxide poisoning on high-flow oxygen.',
      hint: 'Link who shared the sealed room with who shows the 99%-clip-yet-confused paradox.',
      bayDefaultLabel: 'Gas Exposure',
      cards,
      evaluate(activeCards) {
        const coSign = new Set(factsByTag(activeCards, 'co_sign').map((f) => f.p));
        const linked = new Set();
        for (const f of factsByTag(activeCards, 'room_link')) {
          linked.add(f.p1);
          linked.add(f.p2);
        }
        const targets = uniqueSortedIds([...coSign].filter((id) => linked.has(id)));
        return {
          targets,
          proof: `Carbon monoxide poisoning uniquely explains BOTH the shared sealed room AND the deceptive 99% finger-clip paradox on ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, [e, d, c, a], (r) =>
            r === e ? `${pName(e)}'s low 86% reading and inhaler relief fit asthma, not carbon monoxide masking.` : `${pName(r)} was outdoors or had a clean arterial blood test.`
          ),
        };
      },
    };
  },

  // #3 Eliminative reasoning (Inside · Atomic)
  // Relational elimination chain ruling out rivals until only the true surgical bleeders remain
  'eliminative-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Surgery Pool', wingIndex: 0, label: 'Six Crash Arrivals',
        shown: [
          fact(`All 6 crash bays (${pName(a)}, ${pName(b)}, ${pName(c)}, ${pName(d)}, ${pName(e)}, ${pName(f)}) entered the OR shortlist.`, [a, b, c, d, e, f], { tag: 'pool' }),
          fact(`Rule out any bay proven cleaner than a cleared patient, or directly cleared by scan.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Ultrasound', wingIndex: 1, label: 'Comparative Scan A',
        shown: [
          fact(`${pName(c)}'s belly scan is 100% dry — ZERO internal fluid (ruled out).`, [c], { tag: 'clear', p: c }),
          fact(`${pName(d)}'s scan is EVEN CLEANER than ${pName(c)}'s dry scan.`, [d, c], { tag: 'cleaner_than', lo: d, hi: c }),
        ],
        alt: [
          fact(`${pName(a)}'s belly scan is 100% dry — ZERO internal fluid (ruled out).`, [a], { tag: 'clear', p: a }),
          fact(`${pName(d)}'s scan is EVEN CLEANER than ${pName(a)}'s dry scan.`, [d, a], { tag: 'cleaner_than', lo: d, hi: a }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'CT Suite', wingIndex: 0, label: 'Comparative Scan B',
        shown: [
          fact(`${pName(e)}'s chest CT shows an intact main artery — surgery cancelled.`, [e], { tag: 'clear', p: e }),
          fact(`${pName(f)} had LESS impact force and BETTER blood counts than cleared ${pName(e)}.`, [f, e], { tag: 'cleaner_than', lo: f, hi: e }),
        ],
        alt: [
          fact(`${pName(b)}'s chest CT shows an intact main artery — surgery cancelled.`, [b], { tag: 'clear', p: b }),
          fact(`${pName(f)} had LESS impact force and BETTER blood counts than cleared ${pName(b)}.`, [f, b], { tag: 'cleaner_than', lo: f, hi: b }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Lab Cross-Check', wingIndex: 1, label: 'Who Remains Unruled-Out',
        shown: [
          fact(`${pName(a)}'s hemoglobin dropped FASTER THAN ${pName(c)}'s AND ${pName(a)} has NOT been cleared.`, [a, c], { tag: 'suspect', p: a }),
          fact(`${pName(b)}'s belly pressure is HIGHER THAN ${pName(e)}'s AND ${pName(b)} has NOT been cleared.`, [b, e], { tag: 'suspect', p: b }),
        ],
        alt: [
          fact(`${pName(c)}'s hemoglobin dropped FASTER THAN ${pName(a)}'s AND ${pName(c)} has NOT been cleared.`, [c, a], { tag: 'suspect', p: c }),
          fact(`${pName(e)}'s belly pressure is HIGHER THAN ${pName(b)}'s AND ${pName(e)} has NOT been cleared.`, [e, b], { tag: 'suspect', p: e }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Ultrasound', wingIndex: 1, label: 'Rule-Out Check C',
        shown: [
          fact(`Any patient with a cleaner scan or better labs than a cleared bay is AUTOMATICALLY ruled out too.`, [], { tag: 'rule' }),
          fact(`${pName(d)} and ${pName(f)} both passed walk-and-talk stability checks.`, [d, f], { tag: 'clear_pair', p1: d, p2: f }),
        ],
      }),
      makeCard({
        index: 5, time: '01:22', wing: 'OR Charge', wingIndex: 0, label: 'Two Open OR Tables',
        shown: [
          fact(`Wheel ONLY the uneliminated suspect(s) straight into Surgery.`, [], { tag: 'rule' }),
          fact(`Verify every cleared link before committing an OR table.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Relational Surgical Elimination',
      dispatch: 'Six crash arrivals entered the OR queue — chain direct clears and "cleaner-than" relations to isolate who remains.',
      order: 'Wheel EVERY remaining uneliminated patient into Surgery.',
      hint: 'Eliminate directly cleared bays first, then eliminate anyone proven cleaner/better than them.',
      bayDefaultLabel: 'OR Shortlist',
      cards,
      evaluate(activeCards) {
        const cleared = new Set(factsByTag(activeCards, 'clear').map((f) => f.p));
        for (const f of factsByTag(activeCards, 'clear_pair')) {
          cleared.add(f.p1);
          cleared.add(f.p2);
        }
        let changed = true;
        while (changed) {
          changed = false;
          for (const f of factsByTag(activeCards, 'cleaner_than')) {
            if (cleared.has(f.hi) && !cleared.has(f.lo)) {
              cleared.add(f.lo);
              changed = true;
            }
          }
        }
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => !cleared.has(id)));
        return {
          targets,
          proof: `Eliminating direct clears and every bay proven cleaner than them leaves ONLY ${formatList(targets)} uneliminated for Surgery.`,
          rival: buildRivalInfo(targets, [c, d, e, f, a, b], (r) => `${pName(r)} was eliminated either directly by a dry/clean scan or via a "cleaner-than" link.`),
        };
      },
    };
  },

  // #4 Hypothetico-deductive reasoning (Inside · Composite)
  // Testing a 2-prediction clinical hypothesis across comparative Pre→Post IV fluid shifts
  'hypothetico-deductive': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Pre-Fluid', wingIndex: 0, label: '01:00 Baseline BP',
        shown: [
          fact(`${pName(a)} started at BP 80; ${pName(b)} started at BP 82 (HIGHER THAN ${pName(a)}).`, [a, b], { tag: 'pre', p1: a, v1: 80, p2: b, v2: 82 }),
          fact(`${pName(c)} started at BP 78; ${pName(d)} started at BP 84.`, [c, d], { tag: 'pre', p1: c, v1: 78, p2: d, v2: 84 }),
        ],
      }),
      makeCard({
        index: 1, time: '01:08', wing: 'Post-Fluid', wingIndex: 1, label: '01:15 BP After 2L IV',
        shown: [
          fact(`After 2L fluids, ${pName(a)} rose ONLY to 85 (gain < 10) while ${pName(b)} jumped to 114.`, [a, b], { tag: 'post_bp', p1: a, v1: 85, p2: b, v2: 114 }),
          fact(`After 2L fluids, ${pName(c)} stayed at 82 (gain < 10) while ${pName(d)} rose ONLY to 88.`, [c, d], { tag: 'post_bp', p1: c, v1: 82, p2: d, v2: 88 }),
        ],
        alt: [
          fact(`After 2L fluids, ${pName(a)} jumped to 112 while ${pName(b)} rose ONLY to 86 (gain < 10).`, [a, b], { tag: 'post_bp', p1: a, v1: 112, p2: b, v2: 86 }),
          fact(`After 2L fluids, ${pName(c)} stayed at 82 (gain < 10) while ${pName(d)} jumped to 116.`, [c, d], { tag: 'post_bp', p1: c, v1: 82, p2: d, v2: 116 }),
        ],
      }),
      makeCard({
        index: 2, time: '01:12', wing: 'Blood Acid', wingIndex: 0, label: 'Stress-Acid Comparison A',
        shown: [
          fact(`${pName(a)}'s stress acid (5.4) is HIGHER THAN ward-control ${pName(e)}'s danger bar (4.0).`, [a, e], { tag: 'acid_hi', p: a }),
          fact(`${pName(d)}'s stress acid (1.6) is LESS THAN HALF of ${pName(e)}'s 4.0 danger bar.`, [d, e], { tag: 'acid_lo', p: d }),
        ],
        alt: [
          fact(`${pName(b)}'s stress acid (5.2) is HIGHER THAN ward-control ${pName(e)}'s danger bar (4.0).`, [b, e], { tag: 'acid_hi', p: b }),
          fact(`${pName(a)}'s stress acid (1.7) is LESS THAN HALF of ${pName(e)}'s 4.0 danger bar.`, [a, e], { tag: 'acid_lo', p: a }),
        ],
      }),
      makeCard({
        index: 3, time: '01:15', wing: 'Blood Acid', wingIndex: 0, label: 'Stress-Acid Comparison B',
        shown: [
          fact(`${pName(c)}'s stress acid (5.8) is EVEN HIGHER THAN ${pName(a)}'s.`, [c, a], { tag: 'acid_hi', p: c }),
          fact(`${pName(b)}'s stress acid dropped to 1.9 — LOWER THAN ${pName(e)}'s 4.0 bar.`, [b, e], { tag: 'acid_lo', p: b }),
        ],
        alt: [
          fact(`${pName(c)}'s stress acid (1.5) is LOWER THAN ${pName(e)}'s 4.0 bar.`, [c, e], { tag: 'acid_lo', p: c }),
          fact(`${pName(d)}'s stress acid (5.5) is HIGHER THAN ${pName(e)}'s 4.0 bar.`, [d, e], { tag: 'acid_hi', p: d }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Hypothesis', wingIndex: 1, label: 'Two Mandatory Predictions',
        shown: [
          fact(`Severe Infection Shock predicts BOTH: (1) 2L fluids raise BP by LESS THAN 10 points AND (2) stress acid > ${pName(e)}'s 4.0 bar.`, [e], { tag: 'hyp' }),
          fact(`${pName(f)} responded to 1L fluids (+26 BP) and stays below ${pName(e)}'s bar.`, [f, e], { tag: 'acid_lo', p: f }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Pharmacy', wingIndex: 1, label: 'Strong Drip Trigger',
        shown: [
          fact(`Start blood-pressure support drips ONLY on bays confirming BOTH predictions of the test.`, [], { tag: 'act' }),
          fact(`A bay failing either prediction (big fluid bounce OR low stress acid) disproves Infection Shock.`, [], { tag: 'act' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Testing the Fluid-Challenge Prediction',
      dispatch: 'Compare 01:00 vs 01:15 BP gains AND stress-acid levels relative to the 4.0 ward bar.',
      order: 'Start support drips on EVERY patient matching BOTH predictions (BP gain < 10 AND acid > 4.0).',
      hint: 'Subtract 01:00 BP from 01:15 BP for each bay, then intersect with stress acid > 4.0.',
      bayDefaultLabel: 'Fluid Test',
      cards,
      evaluate(activeCards) {
        const pre = new Map();
        const post = new Map();
        for (const f of factsByTag(activeCards, 'pre')) { pre.set(f.p1, f.v1); pre.set(f.p2, f.v2); }
        for (const f of factsByTag(activeCards, 'post_bp')) { post.set(f.p1, f.v1); post.set(f.p2, f.v2); }
        const acidHi = new Set(factsByTag(activeCards, 'acid_hi').map((f) => f.p));
        const targets = uniqueSortedIds(
          [a, b, c, d].filter((id) => pre.has(id) && post.has(id) && (post.get(id) - pre.get(id)) < 10 && acidHi.has(id))
        );
        return {
          targets,
          proof: `Comparing pre→post BP gains (< 10) AND stress acid (> 4.0) confirms BOTH predictions on ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, [d, b, c, a], (r) =>
            (post.get(r) - pre.get(r)) < 10
              ? `${pName(r)} barely rose on fluids, but low stress acid disproves the second prediction.`
              : `${pName(r)}'s BP jumped by +${post.get(r) - pre.get(r)} on fluids, refuting the fluid-failure prediction.`
          ),
        };
      },
    };
  },

  // #5 Causal reasoning (Inside · Atomic)
  // Directed causal graph A → B → C → D across ward supply/oxygen/blood bottlenecks
  'causal-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:03', wing: 'Blood Bank', wingIndex: 0, label: 'Causal Link 1',
        shown: [
          fact(`${pName(a)}'s torn thigh artery DRAINS all 6 O-Neg blood bags → triggering the blood freeze.`, [a], { tag: 'edge', from: a, to: 'bank' }),
          fact(`The blood freeze BLOCKS ${pName(b)}'s scheduled transfusion.`, [b], { tag: 'edge', from: 'bank', to: b }),
        ],
        alt: [
          fact(`${pName(c)}'s torn thigh artery DRAINS all 6 O-Neg blood bags → triggering the blood freeze.`, [c], { tag: 'edge', from: c, to: 'bank' }),
          fact(`The blood freeze BLOCKS ${pName(b)}'s scheduled transfusion.`, [b], { tag: 'edge', from: 'bank', to: b }),
        ],
      }),
      makeCard({
        index: 1, time: '01:07', wing: 'OR Board', wingIndex: 1, label: 'Causal Link 2',
        shown: [
          fact(`${pName(b)}'s delayed transfusion STALLS ${pName(c)}'s OR handoff by 20 minutes.`, [b, c], { tag: 'edge', from: b, to: c }),
          fact(`${pName(c)}'s stalled handoff BLOCKS ${pName(d)}'s transfer to recovery.`, [c, d], { tag: 'edge', from: c, to: d }),
        ],
        alt: [
          fact(`${pName(b)}'s delayed transfusion STALLS ${pName(a)}'s OR handoff by 20 minutes.`, [b, a], { tag: 'edge', from: b, to: a }),
          fact(`${pName(a)}'s stalled handoff BLOCKS ${pName(d)}'s transfer to recovery.`, [a, d], { tag: 'edge', from: a, to: d }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Airway Line', wingIndex: 0, label: 'Independent Cause 2',
        shown: [
          fact(`${pName(e)}'s ruptured oxygen valve TRIGGERS the East Wall pressure drop.`, [e], { tag: 'edge', from: e, to: 'o2' }),
          fact(`The East Wall pressure drop CAUSES ${pName(f)}'s ventilator alarm to scream.`, [f], { tag: 'edge', from: 'o2', to: f }),
        ],
        alt: [
          fact(`${pName(f)}'s ruptured oxygen valve TRIGGERS the East Wall pressure drop.`, [f], { tag: 'edge', from: f, to: 'o2' }),
          fact(`The East Wall pressure drop CAUSES ${pName(e)}'s ventilator alarm to scream.`, [e], { tag: 'edge', from: 'o2', to: e }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Nursing Log', wingIndex: 1, label: 'Effect vs. Cause Check',
        shown: [
          fact(`${pName(d)} and ${pName(f)} are shouting loudest, yet BOTH are downstream effects of earlier failures.`, [d, f], { tag: 'note' }),
          fact(`Fixing a downstream bay CANNOT clear the upstream blockage causing the alarms.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Blood Bank', wingIndex: 0, label: 'Origin Check',
        shown: [
          fact(`Only bays with ZERO upstream patient causing their crisis are true causal origins.`, [], { tag: 'note' }),
          fact(`Two independent crises are running right now: one Blood chain and one Oxygen chain.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Trauma Lead', wingIndex: 1, label: 'Stop Both Cascades',
        shown: [
          fact(`Trace every arrow BACKWARD until nothing points into that patient.`, [], { tag: 'note' }),
          fact(`Treat the TWO true upstream causal origins to clear all 6 bays at once.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Two Ward-Wide Causal Cascades',
      dispatch: 'Follow the directed cause → effect arrows across Blood and Oxygen lines back to the true origins.',
      order: 'Treat the TWO upstream patients who are CAUSING (not merely suffering from) the two ward cascades.',
      hint: 'Trace arrows backward: Origin → Intermediate → Downstream Effect.',
      bayDefaultLabel: 'Cascade Node',
      cards,
      evaluate(activeCards) {
        const edges = factsByTag(activeCards, 'edge');
        const hasOut = new Set();
        const hasIn = new Set();
        const players = new Set([a, b, c, d, e, f]);
        for (const ed of edges) {
          if (players.has(ed.from)) hasOut.add(ed.from);
          if (players.has(ed.to)) hasIn.add(ed.to);
        }
        const targets = uniqueSortedIds([...hasOut].filter((id) => !hasIn.has(id)));
        return {
          targets,
          proof: `Tracing both causal graphs backward to nodes with zero incoming arrows isolates ${formatList(targets)} as the two upstream causes.`,
          rival: buildRivalInfo(targets, [b, f, d, c], (r) => `${pName(r)} is a downstream effect triggered by an upstream blockage, not the origin.`),
        };
      },
    };
  },

  // #6 Root-cause analysis (After · Composite)
  // Tracing a 4-hop M&M autopsy error timeline backward to the single 01:00 root event
  'root-cause-analysis': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:45', wing: 'Autopsy M&M', wingIndex: 0, label: 'Final Crash (01:45)',
        shown: [
          fact(`01:45: ${pName(d)} arrested AFTER receiving the wrong blood-thinner drip intended for ${pName(c)}.`, [d, c], { tag: 'hop', child: d, parent: c }),
          fact(`01:42: ${pName(e)}'s ICU bed was delayed ONLY because staff rushed to ${pName(d)}'s arrest.`, [e, d], { tag: 'hop', child: e, parent: d }),
        ],
      }),
      makeCard({
        index: 1, time: '01:30', wing: 'Pharmacy Audit', wingIndex: 1, label: 'Mid-Chain Swap (01:30)',
        shown: [
          fact(`01:30: ${pName(c)}'s drip was misrouted to ${pName(d)} BECAUSE ${pName(b)}'s cart barcode jammed the printer.`, [c, d, b], { tag: 'hop', child: c, parent: b }),
          fact(`01:34: ${pName(f)}'s antibiotic was delayed by the SAME jammed cart printer.`, [f, b], { tag: 'hop', child: f, parent: b }),
        ],
        alt: [
          fact(`01:30: ${pName(c)}'s drip was misrouted to ${pName(d)} BECAUSE ${pName(a)}'s chart barcode jammed the printer.`, [c, d, a], { tag: 'hop', child: c, parent: a }),
          fact(`01:34: ${pName(f)}'s antibiotic was delayed by the SAME jammed cart printer.`, [f, a], { tag: 'hop', child: f, parent: a }),
        ],
      }),
      makeCard({
        index: 2, time: '01:15', wing: 'Intake Audit', wingIndex: 0, label: 'Upstream Origin (01:00)',
        shown: [
          fact(`01:00: ${pName(b)}'s barcode jammed ONLY BECAUSE ${pName(a)}'s intake wristband was scanned twice in error.`, [b, a], { tag: 'hop', child: b, parent: a }),
          fact(`01:00: Nobody scanned BEFORE ${pName(a)} — ${pName(a)}'s double-scan started the entire chain.`, [a], { tag: 'root_hint', p: a }),
        ],
        alt: [
          fact(`01:00: ${pName(a)}'s barcode jammed ONLY BECAUSE ${pName(b)}'s intake wristband was scanned twice in error.`, [a, b], { tag: 'hop', child: a, parent: b }),
          fact(`01:00: Nobody scanned BEFORE ${pName(b)} — ${pName(b)}'s double-scan started the entire chain.`, [b], { tag: 'root_hint', p: b }),
        ],
      }),
      makeCard({
        index: 3, time: '01:22', wing: 'Nurse Log', wingIndex: 1, label: 'Timestamp Order',
        shown: [
          fact(`01:00 Intake occurred BEFORE 01:30 Pharmacy, which occurred BEFORE 01:45 ICU Arrest.`, [], { tag: 'note' }),
          fact(`Every later patient (${pName(c)}, ${pName(d)}, ${pName(e)}, ${pName(f)}) suffered a symptom of one earlier break.`, [c, d, e, f], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '01:38', wing: 'Autopsy M&M', wingIndex: 0, label: 'Root vs. Proximate Trap',
        shown: [
          fact(`${pName(d)} had the fatal outcome at 01:45, but ${pName(d)}'s error was CAUSED by an earlier bay.`, [d], { tag: 'note' }),
          fact(`M&M discipline: fixing the 01:45 step alone leaves the 01:00 root defect unfixed for tomorrow's shift.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:50', wing: 'Chief Review', wingIndex: 1, label: 'Pinpoint Single Root',
        shown: [
          fact(`Trace backward from 01:45 → 01:30 → 01:00 to the ONE chart with zero upstream cause.`, [], { tag: 'note' }),
          fact(`Flag that single root chart for immediate hospital-wide protocol redesign.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'M&M 4-Hop Error Chain',
      dispatch: 'Six charts failed between 01:00 and 01:45 — trace every causal link backward to the SINGLE root origin.',
      order: 'Flag the SINGLE patient whose 01:00 intake error was the root cause of all five downstream failures.',
      hint: 'Walk backward hop-by-hop from 01:45 until you hit the chart with no upstream parent.',
      bayDefaultLabel: 'M&M Audit',
      cards,
      evaluate(activeCards) {
        const hops = factsByTag(activeCards, 'hop');
        const parents = new Set(hops.map((h) => h.parent));
        const children = new Set(hops.map((h) => h.child));
        const targets = uniqueSortedIds([...parents].filter((p) => !children.has(p)));
        return {
          targets,
          proof: `Tracing backward (01:45 → 01:30 → 01:00) hits ${formatList(targets)} as the sole root origin with no upstream cause.`,
          rival: buildRivalInfo(targets, [d, c, b, a], (r) => `${pName(r)} was a mid-chain or final victim triggered by an earlier failure, not the 01:00 root cause.`),
        };
      },
    };
  },

  // #7 Mechanistic reasoning (Inside · Composite)
  // Step-by-step physical mechanism chain: Pressure > Threshold → Vein Pinch → Low Return → BP Crash
  'mechanistic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Chest Pressure', wingIndex: 0, label: 'Step 1: Trapped Chest Air',
        shown: [
          fact(`${pName(a)}'s trapped chest pressure is HIGHER THAN ${pName(d)}'s pinch threshold.`, [a, d], { tag: 'step1', p: a }),
          fact(`${pName(b)}'s trapped chest pressure is EVEN HIGHER THAN ${pName(a)}'s.`, [b, a], { tag: 'step1_via', hi: b, lo: a }),
        ],
        alt: [
          fact(`${pName(c)}'s trapped chest pressure is HIGHER THAN ${pName(d)}'s pinch threshold.`, [c, d], { tag: 'step1', p: c }),
          fact(`${pName(a)}'s chest pressure is LOWER THAN ${pName(d)}'s threshold (normal open chest).`, [a, d], { tag: 'no_step1', p: a }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Vein Scan', wingIndex: 1, label: 'Step 2: Main-Vein Pinch',
        shown: [
          fact(`Any chest pressure HIGHER THAN ${pName(d)}'s pinches the main vein returning blood to the heart.`, [d], { tag: 'mech' }),
          fact(`${pName(e)} has normal chest pressure — ${pName(e)}'s low BP comes from a wrist artery cut instead.`, [e], { tag: 'other_mech', p: e }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Heart Fill', wingIndex: 0, label: 'Step 3: Heart Fill Collapse',
        shown: [
          fact(`${pName(a)}'s heart chamber is filling at LESS THAN HALF of ${pName(f)}'s normal fill.`, [a, f], { tag: 'step3', p: a }),
          fact(`${pName(b)} already had a chest vent placed 2 min ago → ${pName(b)}'s vein un-pinched and heart fill recovered.`, [b], { tag: 'vented', p: b }),
        ],
        alt: [
          fact(`${pName(c)}'s heart chamber is filling at LESS THAN HALF of ${pName(f)}'s normal fill.`, [c, f], { tag: 'step3', p: c }),
          fact(`${pName(b)}'s heart chamber is filling at LESS THAN HALF of ${pName(f)}'s normal fill (no vent yet).`, [b, f], { tag: 'step3', p: b }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Vein Scan', wingIndex: 1, label: 'Step 4: Pump Failure Check',
        shown: [
          fact(`${pName(c)} has low blood sugar (38) — normal chest pressure and normal heart filling.`, [c], { tag: 'other_mech', p: c }),
          fact(`${pName(d)} sits right AT the pinch threshold without crossing it — heart fill remains steady.`, [d], { tag: 'other_mech', p: d }),
        ],
        alt: [
          fact(`${pName(e)} has normal chest pressure — wrist bleeding only.`, [e], { tag: 'other_mech', p: e }),
          fact(`${pName(d)} sits right AT the pinch threshold without crossing it — heart fill remains steady.`, [d], { tag: 'other_mech', p: d }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Monitors', wingIndex: 0, label: 'Mechanism Link',
        shown: [
          fact(`Active pressure-pinch collapse requires: Chest pressure > ${pName(d)} → NOT yet vented → Heart fill < half of ${pName(f)}.`, [d, f], { tag: 'mech' }),
          fact(`Giving IV fluids to a pinched-vein patient FAILS until a needle releases the trapped chest pressure!`, [], { tag: 'mech' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Trauma Lead', wingIndex: 1, label: 'Needle Release Call',
        shown: [
          fact(`Needle-decompress ONLY the patient(s) currently trapped in the full 3-step pressure-pinch mechanism.`, [], { tag: 'act' }),
          fact(`Verify whether a bay was already vented before poking the chest.`, [], { tag: 'act' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Pressure-Pinch Mechanism Chain',
      dispatch: 'Trace the physical chain: Trapped Chest Pressure > Threshold → Pinched Main Vein → Starved Heart Fill.',
      order: 'Perform needle chest release on EVERY patient currently in active unvented pressure-pinch collapse.',
      hint: 'Check Step 1 (pressure > threshold) → NOT already vented → Step 3 (starved heart fill).',
      bayDefaultLabel: 'Chest Mechanics',
      cards,
      evaluate(activeCards) {
        const s1 = new Set(factsByTag(activeCards, 'step1').map((f) => f.p));
        for (const f of factsByTag(activeCards, 'step1_via')) {
          if (s1.has(f.lo)) s1.add(f.hi);
        }
        const vented = new Set(factsByTag(activeCards, 'vented').map((f) => f.p));
        const s3 = new Set(factsByTag(activeCards, 'step3').map((f) => f.p));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => (s1.has(id) || s3.has(id)) && s3.has(id) && !vented.has(id)));
        return {
          targets,
          proof: `Tracing the physical chain (High Chest Pressure → Unvented Vein Pinch → Half Heart Fill) isolates ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, [b, e, d, c, a], (r) =>
            vented.has(r) ? `${pName(r)} had high pressure too, but the chest vent 2 min ago already broke the mechanism.` : `${pName(r)} lacks the trapped-chest-pressure → starved-heart-fill mechanism.`
          ),
        };
      },
    };
  },

  // #8 Forensic reasoning (After · Composite)
  // Reconstructing multi-passenger crash positions & impact order from comparative physical clues
  'forensic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:04', wing: 'Autopsy Clues', wingIndex: 0, label: 'Seatbelt Diagonals',
        shown: [
          fact(`${pName(a)}'s bruise runs LEFT-shoulder to RIGHT-hip — OPPOSITE OF passenger ${pName(d)}'s right-to-left belt mark.`, [a, d], { tag: 'driver_belt', p: a }),
          fact(`${pName(b)} has the SAME left-to-right belt angle as ${pName(a)} (left-column seat: driver OR rear-left).`, [b, a], { tag: 'left_col', p: b, ref: a }),
        ],
        alt: [
          fact(`${pName(c)}'s bruise runs LEFT-shoulder to RIGHT-hip — OPPOSITE OF passenger ${pName(d)}'s right-to-left belt mark.`, [c, d], { tag: 'driver_belt', p: c }),
          fact(`${pName(b)} has the SAME left-to-right belt angle as ${pName(c)} (left-column seat: driver OR rear-left).`, [b, c], { tag: 'left_col', p: b, ref: c }),
        ],
      }),
      makeCard({
        index: 1, time: '01:08', wing: 'Car Wreckage', wingIndex: 1, label: 'Front vs. Back Row',
        shown: [
          fact(`${pName(a)} has circular steering-wheel chest bruising AND brake-pedal rubber stamped on the right shoe.`, [a], { tag: 'front_driver', p: a }),
          fact(`${pName(b)}'s knees carry fabric weave matching the BACK of ${pName(a)}'s front seat.`, [b, a], { tag: 'rear_row', p: b }),
        ],
        alt: [
          fact(`${pName(c)} has circular steering-wheel chest bruising AND brake-pedal rubber stamped on the right shoe.`, [c], { tag: 'front_driver', p: c }),
          fact(`${pName(b)}'s knees carry fabric weave matching the BACK of ${pName(c)}'s front seat.`, [b, c], { tag: 'rear_row', p: b }),
        ],
      }),
      makeCard({
        index: 2, time: '01:12', wing: 'Cooling Clocks', wingIndex: 0, label: 'Impact Time Order',
        shown: [
          fact(`Clotting confirms ${pName(e)} (pedestrian) was struck BEFORE ${pName(a)}'s car hit the wall.`, [e, a], { tag: 'earlier', first: e, second: a }),
          fact(`${pName(f)} (second car) arrived AFTER the wall crash — warmer body temp than ${pName(e)} and ${pName(a)}.`, [f, e, a], { tag: 'later', p: f }),
        ],
      }),
      makeCard({
        index: 3, time: '01:16', wing: 'Autopsy Clues', wingIndex: 0, label: 'Passenger Window Glass',
        shown: [
          fact(`${pName(d)} has shattered glass ONLY in the right cheek (front passenger seat, next to the driver).`, [d], { tag: 'pass_front', p: d }),
          fact(`${pName(b)} sat strictly BEHIND the driver, NOT at the steering wheel.`, [b], { tag: 'rear_row', p: b }),
        ],
      }),
      makeCard({
        index: 4, time: '01:20', wing: 'Coroner Rule', wingIndex: 1, label: 'Driver-Airbag Injury',
        shown: [
          fact(`Only the actual DRIVER faces delayed hidden steering-column heart bruising requiring urgent cardiac scan.`, [], { tag: 'rule' }),
          fact(`Both left-column passengers share the left-to-right belt mark — use front-vs-rear clues to separate them!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:24', wing: 'Trauma Lead', wingIndex: 1, label: 'Identify True Driver',
        shown: [
          fact(`Every occupant denied driving — reconstruct the exact driver strictly from physical evidence.`, [], { tag: 'rule' }),
          fact(`Send the ONE confirmed driver to emergency cardiac imaging now.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Who Was Behind the Wheel?',
      dispatch: 'Reconstruct seat geometry from opposing seatbelt diagonals, front-seat knee weave, and pedal marks.',
      order: 'Send the SINGLE confirmed driver to emergency cardiac imaging.',
      hint: 'Separate the two left-column seatbelt marks using steering-wheel/pedal vs rear-seat knee clues.',
      bayDefaultLabel: 'Crash Forensic',
      cards,
      evaluate(activeCards) {
        const belt = new Set(factsByTag(activeCards, 'driver_belt').map((f) => f.p));
        const front = new Set(factsByTag(activeCards, 'front_driver').map((f) => f.p));
        const targets = uniqueSortedIds([...belt].filter((id) => front.has(id)));
        return {
          targets,
          proof: `Combining left-to-right belt angle with steering-wheel bruising + pedal imprint isolates ${formatList(targets)} as the driver.`,
          rival: buildRivalInfo(targets, [b, d, e, c, a], (r) =>
            r === b ? `${pName(b)} shares the left-to-right belt angle, but front-seat-back knee weave proves ${pName(b)} sat in the rear.` : `${pName(r)}'s glass/belt angle places them outside the driver seat.`
          ),
        };
      },
    };
  },

  // #9 Evidential reasoning (Inside · Meta)
  // Relational evidence hierarchy: Verified CT/Lab > Bedside Ultrasound > Nurse Vitals > Bystander Rumor
  'evidential-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Evidence Rank', wingIndex: 0, label: 'Source Reliability Ladder',
        shown: [
          fact(`Verified CT / Lab OVERRIDES Ultrasound, which OVERRIDES Nurse Vitals, which OVERRIDES Bystander Rumors.`, [], { tag: 'rule' }),
          fact(`When two reports about a bay conflict, ALWAYS trust the higher-ranked source and discard the lower one.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Rumor & Fax', wingIndex: 1, label: 'Low-Grade Claims (Rank 4)',
        shown: [
          fact(`[Bystander Rumor] claims ${pName(b)} is bleeding worse than ${pName(a)} and needs immediate surgery.`, [b, a], { tag: 'rumor', p: b }),
          fact(`[Blurry Fax] claims ${pName(d)} has a collapsed lung worse than ${pName(c)}.`, [d, c], { tag: 'rumor', p: d }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Verified Lab', wingIndex: 0, label: 'Gold-Standard Proof A (Rank 1)',
        shown: [
          fact(`[Verified Blood Gas] proves ${pName(a)} has severe acid buildup + 62% oxygen — OVERRIDING the rumor.`, [a], { tag: 'verified_crit', p: a }),
          fact(`[Verified CT Scan] proves ${pName(b)} is 100% clear of internal bleeding — REFUTING the bystander.`, [b], { tag: 'verified_clear', p: b }),
        ],
        alt: [
          fact(`[Verified CT Scan] proves ${pName(a)} is 100% clear with normal blood gases.`, [a], { tag: 'verified_clear', p: a }),
          fact(`[Verified Blood Gas] proves ${pName(b)} has severe acid buildup + 60% oxygen — CONFIRMING danger.`, [b], { tag: 'verified_crit', p: b }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Ultrasound', wingIndex: 1, label: 'Bedside Scan (Rank 2)',
        shown: [
          fact(`[Bedside Ultrasound] detects active abdominal blood pool in ${pName(c)} — OVERRIDING nurse's "calm" note.`, [c], { tag: 'us_crit', p: c }),
          fact(`[Verified Chest CT] proves ${pName(d)}'s lungs are 100% expanded — OVERRIDING the blurry fax.`, [d], { tag: 'verified_clear', p: d }),
        ],
        alt: [
          fact(`[Verified Belly CT] proves ${pName(c)} has ZERO abdominal blood — OVERRIDING the blurry ultrasound.`, [c], { tag: 'verified_clear', p: c }),
          fact(`[Bedside Ultrasound] confirms lung collapse in ${pName(d)} with falling oxygen.`, [d], { tag: 'us_crit', p: d }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Nurse Vitals', wingIndex: 1, label: 'Mid-Grade Checks (Rank 3)',
        shown: [
          fact(`[Nurse Note] wrote "${pName(c)} looks quiet" before ultrasound arrived; ${pName(e)} has normal vitals + clean CT.`, [c, e], { tag: 'verified_clear', p: e }),
          fact(`[Bystander] shouted "${pName(f)} fainted!" — [Nurse Vitals] show steady BP 122/78 and 99% oxygen.`, [f], { tag: 'vitals_clear', p: f }),
        ],
      }),
      makeCard({
        index: 5, time: '01:22', wing: 'Trauma Lead', wingIndex: 0, label: 'Act on Strongest Proof',
        shown: [
          fact(`Intervene ONLY on bays whose HIGHEST-RANKED evidence confirms an active emergency.`, [], { tag: 'act' }),
          fact(`Ignore any lower-ranked claim contradicted by a higher-ranked scan or verified lab.`, [], { tag: 'act' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Conflicting Sources Hierarchy',
      dispatch: 'Every bay has conflicting reports — apply the strict reliability ladder (Verified CT/Lab > Ultrasound > Vitals > Rumor).',
      order: 'Treat EVERY patient whose HIGHEST-RANKED evidence confirms a real crisis.',
      hint: 'Let higher-ranked sources override lower-ranked claims for each bay.',
      bayDefaultLabel: 'Source Audit',
      cards,
      evaluate(activeCards) {
        const vCrit = new Set(factsByTag(activeCards, 'verified_crit').map((f) => f.p));
        const vClear = new Set(factsByTag(activeCards, 'verified_clear').map((f) => f.p));
        const uCrit = new Set(factsByTag(activeCards, 'us_crit').map((f) => f.p));
        const targets = uniqueSortedIds(
          [a, b, c, d, e, f].filter((id) => vCrit.has(id) || (uCrit.has(id) && !vClear.has(id)))
        );
        return {
          targets,
          proof: `Weighting sources by rank (CT/Lab > Ultrasound > Vitals > Rumor) leaves ONLY ${formatList(targets)} backed by overriding proof.`,
          rival: buildRivalInfo(targets, [b, d, f, c, a], (r) => `${pName(r)}'s dramatic low-grade claim was overridden by higher-ranked clean CT/vitals.`),
        };
      },
    };
  },

  // #10 Bayesian reasoning (Inside · Composite)
  // Comparing relative prior odds × diagnostic likelihood multipliers to find who overtook whom
  'bayesian-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: '01:00 Priors', wingIndex: 0, label: 'Starting Risk Odds',
        shown: [
          fact(`Before scans, ${pName(b)} started at 60% torn-artery risk — DOUBLE ${pName(a)}'s starting 30%.`, [b, a], { tag: 'prior', p1: b, v1: 60, p2: a, v2: 30 }),
          fact(`${pName(c)} started at 40% risk — HIGHER THAN ${pName(d)}'s 10% starting risk.`, [c, d], { tag: 'prior', p1: c, v1: 40, p2: d, v2: 10 }),
        ],
      }),
      makeCard({
        index: 1, time: '01:07', wing: 'Scan Multipliers', wingIndex: 1, label: 'How Scans Shift Odds',
        shown: [
          fact(`Widened-chest X-ray MULTIPLIES risk ×2.5; a 100% clean Chest CT DIVIDES risk by 10 (drops below 6%).`, [], { tag: 'rule' }),
          fact(`A borderline X-ray leaves risk UNCHANGED (×1.0); a clean X-ray cuts risk in HALF (÷2).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 2, time: '01:12', wing: '01:12 Scans', wingIndex: 0, label: 'New Imaging A',
        shown: [
          fact(`${pName(a)}: Emergency X-ray shows major widened chest (×2.5 shift on 30% start).`, [a], { tag: 'mult', p: a, m: 2.5 }),
          fact(`${pName(b)}: Full emergency Chest CT came back 100% CLEAN (÷10 shift on 60% start).`, [b], { tag: 'mult', p: b, m: 0.1 }),
        ],
        alt: [
          fact(`${pName(a)}: Full emergency Chest CT came back 100% CLEAN (÷10 shift on 30% start).`, [a], { tag: 'mult', p: a, m: 0.1 }),
          fact(`${pName(b)}: Borderline X-ray — risk stays UNCHANGED at 60% (×1.0).`, [b], { tag: 'mult', p: b, m: 1.0 }),
        ],
      }),
      makeCard({
        index: 3, time: '01:16', wing: '01:12 Scans', wingIndex: 0, label: 'New Imaging B',
        shown: [
          fact(`${pName(c)}: Clean chest X-ray cuts risk in HALF (÷2 shift on 40% start).`, [c], { tag: 'mult', p: c, m: 0.5 }),
          fact(`${pName(d)}: Widened chest X-ray (×2.5 shift on 10% start).`, [d], { tag: 'mult', p: d, m: 2.5 }),
        ],
        alt: [
          fact(`${pName(c)}: Emergency X-ray shows major widened chest (×2.5 shift on 40% start).`, [c], { tag: 'mult', p: c, m: 2.5 }),
          fact(`${pName(d)}: Clean chest X-ray cuts risk in HALF (÷2 shift on 10% start).`, [d], { tag: 'mult', p: d, m: 0.5 }),
        ],
      }),
      makeCard({
        index: 4, time: '01:19', wing: '01:12 Scans', wingIndex: 0, label: 'New Imaging C',
        shown: [
          fact(`${pName(e)} started at 20% and got a clean X-ray (÷2); ${pName(f)} started at 50% and got a clean CT (÷10).`, [e, f], { tag: 'ef_low' }),
          fact(`Never anchor on 01:00 starting odds — compute EVERY bay's updated post-scan risk!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:22', wing: 'Surgery Call', wingIndex: 1, label: 'Highest Updated Risk',
        shown: [
          fact(`Rush the SINGLE patient with the HIGHEST updated post-scan probability into Artery Surgery.`, [], { tag: 'act' }),
          fact(`Note how a strong scan can make a lower starting risk overtake a higher starting risk!`, [], { tag: 'act' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Updating Risk After New Scans',
      dispatch: 'Combine each patient\'s starting risk with their scan multiplier (×2.5, ×1.0, ÷2, or ÷10) to see who overtook #1.',
      order: 'Send the SINGLE patient with the HIGHEST updated post-scan risk to Artery Surgery.',
      hint: 'Multiply each patient\'s starting % by their scan shift — compare all four updated numbers.',
      bayDefaultLabel: 'Artery Odds',
      cards,
      evaluate(activeCards) {
        const priors = new Map();
        for (const f of factsByTag(activeCards, 'prior')) { priors.set(f.p1, f.v1); priors.set(f.p2, f.v2); }
        const mults = new Map();
        for (const f of factsByTag(activeCards, 'mult')) mults.set(f.p, f.m);
        const scores = [a, b, c, d]
          .filter((id) => priors.has(id) && mults.has(id))
          .map((id) => ({ id, post: Math.min(99, Math.round(priors.get(id) * mults.get(id))) }))
          .sort((x, y) => y.post - x.post);
        const top = scores[0];
        const targets = top ? [top.id] : [];
        return {
          targets,
          proof: `Updated post-scan scores: ${scores.map((s) => `${pName(s.id)} ≈ ${s.post}%`).join(' > ')} — ${formatList(targets)} overtakes #1.`,
          rival: buildRivalInfo(targets, scores.slice(1).map((s) => s.id), (r) => {
            const found = scores.find((s) => s.id === r);
            return `${pName(r)}'s updated risk is only ~${found?.post ?? 0}% after their scan shift (behind ${pName(top.id)}'s ~${top.post}%).`;
          }),
        };
      },
    };
  },

  // =========================================================================
  // FAMILY 2: LOGICAL & FORMAL REASONING (#11–#20)
  // =========================================================================

  // #11 Deductive reasoning (Before · Atomic)
  // Multi-hop relational deduction: Cohort Membership → Drowsiness Comparison → Mandatory Tube
  'deductive-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Fire Chain', wingIndex: 0, label: 'Mandatory Airway Laws',
        shown: [
          fact(`Law 1: Anyone pulled from Floor 4 inhaled toxic smoke → MUST get a breathing tube IF less alert than ${pName(e)}.`, [e], { tag: 'rule' }),
          fact(`Law 2: Anyone MORE alert than ${pName(e)} is safely breathing on their own (NO tube).`, [e], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Rescue Log', wingIndex: 1, label: 'Floor 4 Manifest',
        shown: [
          fact(`${pName(a)} was carried out of Floor 4 alongside ${pName(b)}.`, [a, b], { tag: 'floor4', ps: [a, b] }),
          fact(`${pName(c)} was ALSO rescued from Floor 4; ${pName(d)} was outside on the lawn (NOT Floor 4).`, [c, d], { tag: 'floor4_one', p: c }),
        ],
        alt: [
          fact(`${pName(a)} was carried out of Floor 4 alongside ${pName(d)}.`, [a, d], { tag: 'floor4', ps: [a, d] }),
          fact(`${pName(b)} was outside on the lawn (NOT Floor 4); ${pName(c)} was rescued from Floor 4.`, [b, c], { tag: 'floor4_one', p: c }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Alertness Chain', wingIndex: 0, label: 'Relative Alertness A',
        shown: [
          fact(`${pName(a)} is LESS alert than ${pName(e)} (reference baseline).`, [a, e], { tag: 'alert_lt', lo: a, hi: e }),
          fact(`${pName(b)} is EVEN LESS alert than ${pName(a)}.`, [b, a], { tag: 'alert_lt', lo: b, hi: a }),
        ],
        alt: [
          fact(`${pName(a)} is MORE alert than ${pName(e)} (speaking clear sentences).`, [a, e], { tag: 'alert_gt', hi: a, lo: e }),
          fact(`${pName(d)} is LESS alert than ${pName(e)} (slurred and drowsy).`, [d, e], { tag: 'alert_lt', lo: d, hi: e }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Alertness Chain', wingIndex: 0, label: 'Relative Alertness B',
        shown: [
          fact(`${pName(c)} is MORE alert than ${pName(e)} — chatting steadily with paramedics.`, [c, e], { tag: 'alert_gt', hi: c, lo: e }),
          fact(`${pName(d)} is LESS alert than ${pName(e)} (took sleeping meds before the fire), NOT from Floor 4.`, [d, e], { tag: 'alert_lt', lo: d, hi: e }),
        ],
        alt: [
          fact(`${pName(c)} is LESS alert than ${pName(e)} and fading fast.`, [c, e], { tag: 'alert_lt', lo: c, hi: e }),
          fact(`${pName(b)} is MORE alert than ${pName(e)}.`, [b, e], { tag: 'alert_gt', hi: b, lo: e }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Alertness Chain', wingIndex: 0, label: 'Baseline Anchor',
        shown: [
          fact(`${pName(f)} is MORE alert than ${pName(c)} (and ${pName(e)} is the exact alertness cutoff).`, [f, c, e], { tag: 'alert_gt', hi: f, lo: c }),
          fact(`Chain the alertness order carefully: if X < Y and Y < ${pName(e)}, then X < ${pName(e)}!`, [e], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Trauma Lead', wingIndex: 1, label: 'Strict Requirement',
        shown: [
          fact(`Place breathing tubes ONLY on patients logically FORCED by BOTH Floor-4 membership AND Alertness < ${pName(e)}.`, [e], { tag: 'act' }),
          fact(`Do NOT intubate a drowsy lawn patient or a wide-awake Floor-4 survivor.`, [], { tag: 'act' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Floor-4 Smoke Chain',
      dispatch: 'Chain Floor-4 rescue membership with relative alertness comparisons against the reference bay.',
      order: `Intubate EVERY Floor-4 survivor whose alertness chains strictly LOWER THAN ${pName(e)}'s.`,
      hint: `Chain X < Y < ${pName(e)} across the Alertness cards, then intersect with Floor 4.`,
      bayDefaultLabel: 'Smoke Airway',
      cards,
      evaluate(activeCards) {
        const f4 = new Set();
        for (const f of factsByTag(activeCards, 'floor4')) f.ps.forEach((p) => f4.add(p));
        for (const f of factsByTag(activeCards, 'floor4_one')) f4.add(f.p);
        const edges = factsByTag(activeCards, 'alert_lt').map((f) => [f.hi, f.lo]); // hi > lo
        const { gt } = rankGreaterGraph([a, b, c, d, e, f], edges);
        const belowE = gt.get(e) || new Set();
        const targets = uniqueSortedIds([...f4].filter((id) => belowE.has(id)));
        return {
          targets,
          proof: `Chaining Floor-4 membership with alertness strictly below ${pName(e)} strictly forces intubation for ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, [c, d, b, a], (r) =>
            f4.has(r) ? `${pName(r)} was on Floor 4, but stays MORE alert than ${pName(e)}.` : `${pName(r)} is drowsy, but was outside on the lawn (not Floor 4).`
          ),
        };
      },
    };
  },

  // #12 Inductive reasoning (Before · Atomic)
  // Inducing a relational rule from 3 observed Harbor Pier overdose cases and applying it to 3 new arrivals
  'inductive-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Observed Cases', wingIndex: 0, label: 'Earlier Pier Revival #1 & #2',
        shown: [
          fact(`Case #1 (Pier): Breathing was HALF of normal (7 vs 14) + pupils SMALLER than seatmate → Overdose spray SAVED them.`, [], { tag: 'obs' }),
          fact(`Case #2 (Pier): Breathing was HALF of normal (6 vs 14) + pupils SMALLER than seatmate → Overdose spray SAVED them.`, [], { tag: 'obs' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Observed Cases', wingIndex: 0, label: 'Earlier Pier Non-Responder #3',
        shown: [
          fact(`Case #3 (Pier): Fast breathing (26 vs 14) + pupils WIDER than seatmate → Overdose spray had ZERO effect.`, [], { tag: 'obs' }),
          fact(`Extract the pattern linking breathing rate AND relative pupil size from Cases #1–#3.`, [], { tag: 'obs' }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'New Arrivals', wingIndex: 1, label: 'Breathing Rates (Normal = 14)',
        shown: [
          fact(`${pName(a)} is breathing 6/min (SLOWER THAN half of 14); ${pName(b)} is breathing 24/min (FASTER THAN 14).`, [a, b], { tag: 'br', p1: a, v1: 6, p2: b, v2: 24 }),
          fact(`${pName(c)} is breathing 7/min (HALF of 14); ${pName(d)} is breathing 5/min (SLOWER THAN ${pName(c)}).`, [c, d], { tag: 'br', p1: c, v1: 7, p2: d, v2: 5 }),
        ],
        alt: [
          fact(`${pName(a)} is breathing 22/min (FASTER THAN 14); ${pName(b)} is breathing 6/min (LESS THAN half of 14).`, [a, b], { tag: 'br', p1: a, v1: 22, p2: b, v2: 6 }),
          fact(`${pName(c)} is breathing 7/min (HALF of 14); ${pName(d)} is breathing 16/min (normal).`, [c, d], { tag: 'br', p1: c, v1: 7, p2: d, v2: 16 }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Pupil Compare', wingIndex: 1, label: 'Relative Pupil Sizes A',
        shown: [
          fact(`${pName(a)}'s pupils are SMALLER THAN normal-control ${pName(e)}'s (pinpoint).`, [a, e], { tag: 'pup_sm', p: a }),
          fact(`${pName(b)}'s pupils are WIDER THAN ${pName(e)}'s (stimulant pattern).`, [b, e], { tag: 'pup_wd', p: b }),
        ],
        alt: [
          fact(`${pName(a)}'s pupils are WIDER THAN normal-control ${pName(e)}'s.`, [a, e], { tag: 'pup_wd', p: a }),
          fact(`${pName(b)}'s pupils are SMALLER THAN ${pName(e)}'s (pinpoint).`, [b, e], { tag: 'pup_sm', p: b }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Pupil Compare', wingIndex: 1, label: 'Relative Pupil Sizes B',
        shown: [
          fact(`${pName(c)}'s pupils are SMALLER THAN ${pName(e)}'s — SAME pinpoint size as ${pName(a)}.`, [c, e, a], { tag: 'pup_sm', p: c }),
          fact(`${pName(d)}'s pupils are WIDER THAN ${pName(e)}'s (head-injury compression, NOT opioid!).`, [d, e], { tag: 'pup_wd', p: d }),
        ],
        alt: [
          fact(`${pName(c)}'s pupils are WIDER THAN ${pName(e)}'s.`, [c, e], { tag: 'pup_wd', p: c }),
          fact(`${pName(d)}'s pupils are SMALLER THAN ${pName(e)}'s.`, [d, e], { tag: 'pup_sm', p: d }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Pier Triage', wingIndex: 0, label: 'Apply the Pattern',
        shown: [
          fact(`${pName(f)} is breathing 16/min with pupils SAME AS ${pName(e)}'s (unexposed bystander).`, [f, e], { tag: 'normal' }),
          fact(`Give limited Overdose Reversal Spray ONLY to new arrivals matching BOTH signs of the observed Pier pattern.`, [], { tag: 'act' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Harbor Pier Overdose Pattern',
      dispatch: 'Infer the two-sign revival pattern from Cases #1–#3, then match it against the new arrivals\' relative rates and pupils.',
      order: 'Give Overdose Spray ONLY to new arrivals matching BOTH signs of the Pier revival pattern.',
      hint: 'Cases #1–#2 needed slow breathing (≤ half of 14) AND pupils smaller than control.',
      bayDefaultLabel: 'Pier Intake',
      cards,
      evaluate(activeCards) {
        const br = new Map();
        for (const f of factsByTag(activeCards, 'br')) { br.set(f.p1, f.v1); br.set(f.p2, f.v2); }
        const sm = new Set(factsByTag(activeCards, 'pup_sm').map((f) => f.p));
        const targets = uniqueSortedIds([a, b, c, d].filter((id) => (br.get(id) ?? 99) <= 7 && sm.has(id)));
        return {
          targets,
          proof: `Cases #1–#2 establish the pattern (breathing ≤ 7/min + pinpoint pupils smaller than ${pName(e)}) — matched strictly by ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, [d, b, c, a], (r) =>
            (br.get(r) ?? 99) <= 7
              ? `${pName(r)} breathes slowly too, but WIDER pupils break the observed opioid pattern (suspect head injury!).`
              : `${pName(r)}'s breathing (${br.get(r)}/min) is too fast to fit the pattern.`
          ),
        };
      },
    };
  },

  // #13 Syllogistic reasoning (Before · Atomic)
  // Categorical subset inclusion across linked transfer cohorts (All X ⊂ Y; No Z ∈ Y; Member chains)
  'syllogistic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Airlift Laws', wingIndex: 0, label: 'Category Inclusions',
        shown: [
          fact(`ALL Blast-Lung patients belong to the Immediate-Chopper category.`, [], { tag: 'rule' }),
          fact(`NO Minor-Splint patient belongs to the Immediate-Chopper category.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Cohort Links', wingIndex: 1, label: 'Sub-Group Chains A',
        shown: [
          fact(`EVERY survivor from Blast Zone A is a Blast-Lung patient; ${pName(a)} was pulled from Blast Zone A.`, [a], { tag: 'blast', p: a }),
          fact(`${pName(b)} was in the SAME Blast Zone A room as ${pName(a)}.`, [b, a], { tag: 'same_as', p: b, ref: a }),
        ],
        alt: [
          fact(`EVERY survivor from Blast Zone A is a Blast-Lung patient; ${pName(c)} was pulled from Blast Zone A.`, [c], { tag: 'blast', p: c }),
          fact(`${pName(b)} was in the SAME Blast Zone A room as ${pName(c)}.`, [b, c], { tag: 'same_as', p: b, ref: c }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Cohort Links', wingIndex: 1, label: 'Exclusion Checks',
        shown: [
          fact(`${pName(d)} is a Minor-Splint patient — therefore excluded from the Immediate-Chopper group.`, [d], { tag: 'minor', p: d }),
          fact(`${pName(e)} shares the SAME injury category as ${pName(d)} (Minor-Splint).`, [e, d], { tag: 'same_as', p: e, ref: d }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Airway Board', wingIndex: 0, label: 'Second Requirement',
        shown: [
          fact(`Flight Rule: Chopper passengers MUST ALSO be cleared by Airway Control (NOT pending tube).`, [], { tag: 'rule' }),
          fact(`${pName(a)} and ${pName(c)} are BOTH cleared by Airway Control; ${pName(b)} is STILL awaiting a tube.`, [a, c, b], { tag: 'cleared_air', ps: [a, c] }),
        ],
        alt: [
          fact(`Flight Rule: Chopper passengers MUST ALSO be cleared by Airway Control (NOT pending tube).`, [], { tag: 'rule' }),
          fact(`${pName(b)} and ${pName(c)} are BOTH cleared by Airway Control; ${pName(a)} is STILL awaiting a tube.`, [b, c, a], { tag: 'cleared_air', ps: [b, c] }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Cohort Links', wingIndex: 1, label: 'Category Check C',
        shown: [
          fact(`${pName(c)} is in the Blast-Lung category (factory explosion), SAME AS ${pName(a)}.`, [c, a], { tag: 'blast', p: c }),
          fact(`${pName(f)} belongs to the Observers group (NO blast exposure; airway clear).`, [f], { tag: 'other', p: f }),
        ],
        alt: [
          fact(`${pName(a)} is a Minor-Splint patient — NOT in the Blast-Lung category.`, [a], { tag: 'minor', p: a }),
          fact(`${pName(f)} belongs to the Observers group (NO blast exposure; airway clear).`, [f], { tag: 'other', p: f }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Helipad', wingIndex: 0, label: 'Final Boarding Call',
        shown: [
          fact(`Board ONLY patients strictly proven in Immediate-Chopper (Blast-Lung) AND Airway-Cleared.`, [], { tag: 'act' }),
          fact(`Exclude anyone awaiting a tube or linked to the Minor-Splint category.`, [], { tag: 'act' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Rescue Helicopter Categories',
      dispatch: 'Chain categorical subsets (Blast Zone A ⊂ Blast-Lung ⊂ Chopper) and intersect with Airway Clearance.',
      order: 'Board EVERY patient proven to be in BOTH the Blast-Lung Chopper group AND Airway-Cleared.',
      hint: 'Trace who links into Blast-Lung, eliminate Minor-Splint, then intersect with Airway-Cleared.',
      bayDefaultLabel: 'Airlift Group',
      cards,
      evaluate(activeCards) {
        const blast = new Set(factsByTag(activeCards, 'blast').map((f) => f.p));
        const minor = new Set(factsByTag(activeCards, 'minor').map((f) => f.p));
        for (const f of factsByTag(activeCards, 'same_as')) {
          if (blast.has(f.ref) && !minor.has(f.p)) blast.add(f.p);
          if (minor.has(f.ref)) minor.add(f.p);
        }
        const air = new Set();
        for (const f of factsByTag(activeCards, 'cleared_air')) f.ps.forEach((p) => air.add(p));
        const targets = uniqueSortedIds([...blast].filter((id) => air.has(id) && !minor.has(id)));
        return {
          targets,
          proof: `Categorical inclusion puts ${formatList([...blast])} in Blast-Lung; intersecting with Airway-Cleared boards ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, [b, d, f, a, c], (r) =>
            blast.has(r) ? `${pName(r)} is in Blast-Lung, but is NOT cleared by Airway Control yet.` : `${pName(r)} is outside the Blast-Lung Chopper category.`
          ),
        };
      },
    };
  },

  // #14 Conditional reasoning (Inside · Atomic)
  // Real If-Then AND Contrapositive chaining (If A → B; If B → C; NOT C → NOT A!)
  'conditional-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Heart Protocol', wingIndex: 0, label: 'If-Then Chain Rules',
        shown: [
          fact(`IF a patient's potassium is HIGHER THAN ${pName(e)}'s (6.5) → they MUST get IV Calcium.`, [e], { tag: 'rule' }),
          fact(`IF a patient gets IV Calcium → their ECG monitor MUST be switched to Continuous Alarm.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Lab Ranks', wingIndex: 1, label: 'Potassium Ordering',
        shown: [
          fact(`${pName(a)}'s potassium is HIGHER THAN ${pName(e)}'s (6.5) cutoff.`, [a, e], { tag: 'k_hi', p: a }),
          fact(`${pName(b)}'s potassium is HIGHER THAN ${pName(a)}'s (even more severe!).`, [b, a], { tag: 'k_gt', hi: b, lo: a }),
        ],
        alt: [
          fact(`${pName(c)}'s potassium is HIGHER THAN ${pName(e)}'s (6.5) cutoff.`, [c, e], { tag: 'k_hi', p: c }),
          fact(`${pName(a)}'s potassium is LOWER THAN ${pName(e)}'s (safe at 4.8).`, [a, e], { tag: 'k_lo', p: a }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Alarm Log', wingIndex: 0, label: 'Contrapositive Check A',
        shown: [
          fact(`${pName(c)}'s ECG monitor is NOT on Continuous Alarm (meaning ${pName(c)} did NOT trigger Calcium!).`, [c], { tag: 'no_alarm', p: c }),
          fact(`${pName(d)}'s potassium is LOWER THAN ${pName(c)}'s.`, [d, c], { tag: 'k_lt', lo: d, hi: c }),
        ],
        alt: [
          fact(`${pName(b)}'s ECG monitor is NOT on Continuous Alarm (proving ${pName(b)}'s lab was a safe 5.1!).`, [b], { tag: 'no_alarm', p: b }),
          fact(`${pName(d)}'s potassium is HIGHER THAN ${pName(e)}'s (6.5) cutoff.`, [d, e], { tag: 'k_hi', p: d }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Lab Ranks', wingIndex: 1, label: 'Potassium Check B',
        shown: [
          fact(`${pName(f)}'s potassium is LOWER THAN ${pName(e)}'s cutoff (normal 4.2).`, [f, e], { tag: 'k_lo', p: f }),
          fact(`Remember the contrapositive: NOT on Continuous Alarm → did NOT cross > 6.5!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Pharmacy', wingIndex: 0, label: 'Calcium Readiness',
        shown: [
          fact(`Chain both directions: forward (K > ${pName(e)} → Calcium) AND backward (NOT Alarm → safe).`, [e], { tag: 'note' }),
          fact(`${pName(e)} sits right AT 6.5 (NOT strictly higher than 6.5).`, [e], { tag: 'k_lo', p: e }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Trauma Lead', wingIndex: 1, label: 'Immediate IV Calcium',
        shown: [
          fact(`Push IV Calcium immediately for EVERY patient strictly forced above ${pName(e)}'s 6.5 cutoff.`, [e], { tag: 'act' }),
          fact(`Do NOT treat bays ruled safe by the contrapositive or sitting at/below 6.5.`, [], { tag: 'act' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Potassium If-Then & Contrapositive',
      dispatch: 'Chain forward If-Then rules AND reverse contrapositive alarm checks to isolate IV Calcium patients.',
      order: `Give IV Calcium to EVERY patient strictly proven to have potassium HIGHER THAN ${pName(e)}'s (6.5).`,
      hint: `Chain K > ${pName(e)} forward, and use "NOT on Continuous Alarm" to rule out safe bays.`,
      bayDefaultLabel: 'Potassium Alert',
      cards,
      evaluate(activeCards) {
        const hi = new Set(factsByTag(activeCards, 'k_hi').map((f) => f.p));
        const noAlarm = new Set(factsByTag(activeCards, 'no_alarm').map((f) => f.p));
        for (const f of factsByTag(activeCards, 'k_gt')) {
          if (hi.has(f.lo) && !noAlarm.has(f.hi)) hi.add(f.hi);
        }
        const targets = uniqueSortedIds([...hi].filter((id) => !noAlarm.has(id)));
        return {
          targets,
          proof: `Forward chaining above ${pName(e)} (6.5) while ruling out non-alarm bays strictly forces IV Calcium for ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, [e, c, d, b, a], (r) =>
            r === e ? `${pName(e)} sits AT 6.5, not strictly higher than 6.5.` : `${pName(r)} is ruled safe via the contrapositive or sits below 6.5.`
          ),
        };
      },
    };
  },

  // #15 Transitive reasoning (Before · Atomic)
  // Pure 6-patient scrambled comparative ordering chain (A > B > C > D = E > F) — classic fluid-intelligence core!
  'transitive-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Bleed Watch', wingIndex: 0, label: 'Pair Compare 1',
        shown: [
          fact(`${pName(b)} is losing blood FASTER THAN ${pName(c)}.`, [b, c], { tag: 'gt', hi: b, lo: c }),
          fact(`${pName(d)} is losing blood SLOWER THAN ${pName(c)}.`, [d, c], { tag: 'gt', hi: c, lo: d }),
        ],
        alt: [
          fact(`${pName(c)} is losing blood FASTER THAN ${pName(b)}.`, [c, b], { tag: 'gt', hi: c, lo: b }),
          fact(`${pName(d)} is losing blood SLOWER THAN ${pName(b)}.`, [d, b], { tag: 'gt', hi: b, lo: d }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Bleed Watch', wingIndex: 0, label: 'Pair Compare 2',
        shown: [
          fact(`${pName(a)} is losing blood FASTER THAN ${pName(b)}.`, [a, b], { tag: 'gt', hi: a, lo: b }),
          fact(`${pName(e)} is losing blood at the SAME rate as ${pName(d)}.`, [e, d], { tag: 'eq', p1: e, p2: d }),
        ],
        alt: [
          fact(`${pName(b)} is losing blood FASTER THAN ${pName(a)}.`, [b, a], { tag: 'gt', hi: b, lo: a }),
          fact(`${pName(e)} is losing blood at the SAME rate as ${pName(d)}.`, [e, d], { tag: 'eq', p1: e, p2: d }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Triage Desk', wingIndex: 1, label: 'Pair Compare 3',
        shown: [
          fact(`${pName(f)} is losing blood SLOWER THAN ${pName(e)}.`, [f, e], { tag: 'gt', hi: e, lo: f }),
          fact(`${pName(c)} is losing blood FASTER THAN ${pName(e)}.`, [c, e], { tag: 'gt', hi: c, lo: e }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Triage Desk', wingIndex: 1, label: 'Cross-Link Check',
        shown: [
          fact(`${pName(a)} is losing blood FASTER THAN ${pName(c)}.`, [a, c], { tag: 'gt', hi: a, lo: c }),
          fact(`${pName(f)} is the slowest bleeder on the ward right now.`, [f], { tag: 'slowest', p: f }),
        ],
        alt: [
          fact(`${pName(c)} is losing blood FASTER THAN ${pName(a)}.`, [c, a], { tag: 'gt', hi: c, lo: a }),
          fact(`${pName(f)} is the slowest bleeder on the ward right now.`, [f], { tag: 'slowest', p: f }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Blood Bank', wingIndex: 0, label: 'Two Rapid Infusers',
        shown: [
          fact(`Only TWO rapid blood infusers remain on the floor right now.`, [], { tag: 'note' }),
          fact(`Assemble the full 6-patient speed ranking from fastest (#1) to slowest (#6).`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Trauma Lead', wingIndex: 1, label: 'Top-Two Priority',
        shown: [
          fact(`Hook up the TWO fastest bleeders (#1 and #2 in the full chain) immediately.`, [], { tag: 'act' }),
          fact(`Be careful: #3 beats #4, #5, and #6, yet still sits behind the top two!`, [], { tag: 'act' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Six-Bay Hemorrhage Ranking',
      dispatch: 'Six scrambled bleed-rate comparisons link all six bays — build the complete ranking to pick #1 and #2.',
      order: 'Hook up the TWO fastest-bleeding patients (#1 and #2 in the full order) to the rapid infusers.',
      hint: 'Link every "FASTER THAN" and "SLOWER THAN" arrow into one full top-to-bottom chain.',
      bayDefaultLabel: 'Bleed Speed',
      cards,
      evaluate(activeCards) {
        const nodes = [a, b, c, d, e, f];
        const edges = factsByTag(activeCards, 'gt').map((f) => [f.hi, f.lo]);
        const { gt, inDeg } = rankGreaterGraph(nodes, edges);
        // Check acyclicity: no node beats itself
        for (const n of nodes) {
          if (gt.get(n).has(n)) return { targets: [], proof: 'Cycle', rival: null };
        }
        // Rank by number of people strictly above them (inDeg), then beats count
        const ordered = [...nodes].sort((x, y) => (inDeg.get(x) - inDeg.get(y)) || (gt.get(y).size - gt.get(x).size));
        // Ensure top 2 are uniquely separated from #3
        if (inDeg.get(ordered[0]) !== 0 || inDeg.get(ordered[1]) !== 1 || inDeg.get(ordered[2]) < 2) {
          return { targets: [], proof: 'Ambiguous order', rival: null };
        }
        const targets = uniqueSortedIds([ordered[0], ordered[1]]);
        return {
          targets,
          proof: `Full bleed-speed chain: ${ordered.map(pName).join(' > ')} — placing ${pName(ordered[0])} (#1) and ${pName(ordered[1])} (#2) on the two infusers.`,
          rival: {
            patientId: ordered[2],
            patientName: pName(ordered[2]),
            reason: `${pName(ordered[2])} ranks #3 (faster than ${pName(ordered[3])}), but strictly slower than both ${pName(ordered[0])} and ${pName(ordered[1])}.`,
          },
        };
      },
    };
  },

  // #16 Disjunctive reasoning (Inside · Atomic)
  // Coupled Either-Or domino elimination across 3 linked pairs (Eliminate 1 → forces 2nd → forces 3rd!)
  'disjunctive-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Pair 1', wingIndex: 0, label: 'Contaminated Blood Bag',
        shown: [
          fact(`EITHER ${pName(a)} OR ${pName(b)} received the mislabeled blood bag (exact one of the pair).`, [a, b], { tag: 'or1', p1: a, p2: b }),
          fact(`Lab confirms ${pName(b)}'s blood type matches their bag 100% — NOT ${pName(b)}.`, [b], { tag: 'not', p: b }),
        ],
        alt: [
          fact(`EITHER ${pName(a)} OR ${pName(b)} received the mislabeled blood bag (exact one of the pair).`, [a, b], { tag: 'or1', p1: a, p2: b }),
          fact(`Lab confirms ${pName(a)}'s blood type matches their bag 100% — NOT ${pName(a)}.`, [a], { tag: 'not', p: a }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Pair 2', wingIndex: 1, label: 'Linked Ventilator Leak',
        shown: [
          fact(`EITHER ${pName(c)} OR ${pName(d)} is hooked to the leaking oxygen manifold.`, [c, d], { tag: 'or2', p1: c, p2: d }),
          fact(`Pressure gauge proves ${pName(d)}'s wall port is sealed tight — NOT ${pName(d)}.`, [d], { tag: 'not', p: d }),
        ],
        alt: [
          fact(`EITHER ${pName(c)} OR ${pName(d)} is hooked to the leaking oxygen manifold.`, [c, d], { tag: 'or2', p1: c, p2: d }),
          fact(`Pressure gauge proves ${pName(c)}'s wall port is sealed tight — NOT ${pName(c)}.`, [c], { tag: 'not', p: c }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Domino Link', wingIndex: 0, label: 'Cross-Pair Tie',
        shown: [
          fact(`Whoever received the mislabeled bag ALSO shared a nurse cart with ${pName(e)} (clearing ${pName(f)}).`, [e, f], { tag: 'not', p: f }),
          fact(`EITHER ${pName(e)} OR ${pName(f)} was missed during the 01:00 safety sweep — and ${pName(e)} was just cleared by check-in.`, [e, f], { tag: 'not', p: e }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Pair 1', wingIndex: 0, label: 'Safety Verification A',
        shown: [
          fact(`Eliminating one half of an "EITHER X OR Y" pair strictly FORCES the other patient.`, [], { tag: 'note' }),
          fact(`Both Pair 1 (mislabeled bag) and Pair 2 (leaking oxygen) require immediate bedside rescue.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Pair 2', wingIndex: 1, label: 'Safety Verification B',
        shown: [
          fact(`${pName(e)} and ${pName(f)} both passed final bag & oxygen checks (neither needs rescue).`, [e, f], { tag: 'note' }),
          fact(`Double-check which half of Pair 1 and Pair 2 survived elimination.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Trauma Lead', wingIndex: 0, label: 'Rescue Both Forced Bays',
        shown: [
          fact(`Intervene immediately on the ONE forced patient from Pair 1 AND the ONE forced patient from Pair 2.`, [], { tag: 'act' }),
          fact(`Never treat the eliminated partner in either pair.`, [], { tag: 'act' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Two Coupled Either-Or Emergencies',
      dispatch: 'Use direct eliminations inside two Either-Or crisis pairs to force the exact two bays needing rescue.',
      order: 'Rescue the TWO patients forced by eliminating their partners in the Blood-Bag and Oxygen-Leak pairs.',
      hint: 'In each "EITHER X OR Y" pair, cross off the cleared partner to lock the forced target.',
      bayDefaultLabel: 'Pair Elimination',
      cards,
      evaluate(activeCards) {
        const notSet = new Set(factsByTag(activeCards, 'not').map((f) => f.p));
        const res = [];
        for (const tag of ['or1', 'or2']) {
          for (const f of factsByTag(activeCards, tag)) {
            if (notSet.has(f.p1) && !notSet.has(f.p2)) res.push(f.p2);
            else if (notSet.has(f.p2) && !notSet.has(f.p1)) res.push(f.p1);
          }
        }
        const targets = uniqueSortedIds(res);
        return {
          targets,
          proof: `Eliminating the cleared partner in each Either-Or pair strictly forces rescue for ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, [b, d, a, c], (r) => `${pName(r)} was explicitly cleared by blood-match or sealed-port verification.`),
        };
      },
    };
  },

  // #17 Contradiction-based reasoning (After · Atomic)
  // Reductio ad absurdum: test each suspect as "Patient Zero"; reject every suspect that creates a timeline contradiction!
  'contradiction-based': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Outbreak Rule', wingIndex: 0, label: 'How Contagion Travels',
        shown: [
          fact(`Patient Zero MUST have arrived BEFORE every other infected patient AND tested POSITIVE for the strain.`, [], { tag: 'rule' }),
          fact(`Assume a bay is Patient Zero — if that forces an IMPOSSIBLE contradiction, reject that bay!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Arrival Order', wingIndex: 1, label: 'Clock Sequence A',
        shown: [
          fact(`${pName(a)} arrived at the ER strictly BEFORE ${pName(b)}.`, [a, b], { tag: 'before', first: a, second: b }),
          fact(`${pName(b)} arrived strictly BEFORE ${pName(c)}.`, [b, c], { tag: 'before', first: b, second: c }),
        ],
        alt: [
          fact(`${pName(b)} arrived at the ER strictly BEFORE ${pName(a)}.`, [b, a], { tag: 'before', first: b, second: a }),
          fact(`${pName(a)} arrived strictly BEFORE ${pName(c)}.`, [a, c], { tag: 'before', first: a, second: c }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Arrival Order', wingIndex: 1, label: 'Clock Sequence B',
        shown: [
          fact(`${pName(d)} arrived strictly BEFORE ${pName(a)} — earliest arrival in the entire ward!`, [d, a], { tag: 'before', first: d, second: a }),
          fact(`${pName(e)} and ${pName(f)} arrived AFTER ${pName(c)}.`, [e, f, c], { tag: 'late', ps: [e, f] }),
        ],
        alt: [
          fact(`${pName(d)} arrived strictly BEFORE ${pName(b)} — earliest arrival in the entire ward!`, [d, b], { tag: 'before', first: d, second: b }),
          fact(`${pName(e)} and ${pName(f)} arrived AFTER ${pName(c)}.`, [e, f, c], { tag: 'late', ps: [e, f] }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'PCR Swab', wingIndex: 0, label: 'Strain Test Results',
        shown: [
          fact(`${pName(d)} tested 100% NEGATIVE for the outbreak strain (assuming ${pName(d)} = Zero contradicts PCR!).`, [d], { tag: 'neg', p: d }),
          fact(`${pName(a)}, ${pName(b)}, and ${pName(c)} all tested POSITIVE for the exact same outbreak strain.`, [a, b, c], { tag: 'pos', ps: [a, b, c] }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'PCR Swab', wingIndex: 0, label: 'Why Others Contradict',
        shown: [
          fact(`Assuming ${pName(c)} is Patient Zero contradicts arrival order because someone POSITIVE arrived BEFORE ${pName(c)}.`, [c], { tag: 'note' }),
          fact(`${pName(e)} and ${pName(f)} both arrived last AND tested NEGATIVE.`, [e, f], { tag: 'neg_pair', ps: [e, f] }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Infection Lead', wingIndex: 1, label: 'Only Consistent Origin',
        shown: [
          fact(`Reject every bay whose assumption produces a PCR or arrival-order contradiction.`, [], { tag: 'act' }),
          fact(`Quarantine the SINGLE bay that causes ZERO contradictions as Patient Zero!`, [], { tag: 'act' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Patient Zero by Contradiction',
      dispatch: 'Test each suspect as Patient Zero — reject everyone who contradicts arrival order or positive PCR proof.',
      order: 'Isolate the SINGLE patient who can be Patient Zero WITHOUT contradicting any clock or swab record.',
      hint: 'Check who arrived earliest among the POSITIVE swabs — reject negative and later arrivals.',
      bayDefaultLabel: 'Outbreak Trace',
      cards,
      evaluate(activeCards) {
        const pos = new Set();
        for (const f of factsByTag(activeCards, 'pos')) f.ps.forEach((p) => pos.add(p));
        const neg = new Set(factsByTag(activeCards, 'neg').map((f) => f.p));
        for (const f of factsByTag(activeCards, 'neg_pair')) f.ps.forEach((p) => neg.add(p));
        const posList = [...pos].filter((p) => !neg.has(p));
        const edges = factsByTag(activeCards, 'before')
          .filter((f) => posList.includes(f.first) && posList.includes(f.second))
          .map((f) => [f.first, f.second]);
        const { inDeg } = rankGreaterGraph(posList, edges);
        const targets = uniqueSortedIds(posList.filter((p) => inDeg.get(p) === 0));
        return {
          targets,
          proof: `${pName(d)} contradicts PCR (negative); every later positive arrival contradicts arrival order — leaving ONLY ${formatList(targets)} contradiction-free.`,
          rival: buildRivalInfo(targets, [d, b, c, a], (r) =>
            neg.has(r) ? `${pName(r)} arrived earliest, but tested NEGATIVE — contradicting Patient Zero.` : `Another positive patient arrived strictly BEFORE ${pName(r)}, contradicting Patient Zero.`
          ),
        };
      },
    };
  },

  // #18 Recursive reasoning (Inside · Composite)
  // Stepwise escalation rule applied repeatedly across base score + active-bleed doubling + BP<90 doubling
  'recursive-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Escalation', wingIndex: 0, label: 'Two-Pass Doubling Rule',
        shown: [
          fact(`Pass 1: Start with Base Score → DOUBLE it (×2) if actively bleeding.`, [], { tag: 'rule' }),
          fact(`Pass 2: Take Pass 1's output → DOUBLE it AGAIN (×2) if BP < 90!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Base Scores', wingIndex: 1, label: 'Starting Acuity A & B',
        shown: [
          fact(`${pName(a)}: Base 3 (LOWER THAN ${pName(b)}'s Base 5).`, [a, b], { tag: 'base', p1: a, v1: 3, p2: b, v2: 5 }),
          fact(`${pName(c)}: Base 4 (HIGHER THAN ${pName(d)}'s Base 2).`, [c, d], { tag: 'base', p1: c, v1: 4, p2: d, v2: 2 }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Pass 1 · Bleed', wingIndex: 0, label: 'Active Bleed Status',
        shown: [
          fact(`${pName(a)} and ${pName(b)} are BOTH actively bleeding (Pass 1 doubles both).`, [a, b], { tag: 'bleed', ps: [a, b] }),
          fact(`${pName(c)} has NO active bleeding; ${pName(d)} IS actively bleeding.`, [c, d], { tag: 'bleed', ps: [d] }),
        ],
        alt: [
          fact(`${pName(a)} has NO active bleeding; ${pName(b)} IS actively bleeding.`, [a, b], { tag: 'bleed', ps: [b] }),
          fact(`${pName(c)} and ${pName(d)} are BOTH actively bleeding.`, [c, d], { tag: 'bleed', ps: [c, d] }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Pass 2 · BP', wingIndex: 1, label: 'Blood Pressure < 90 Check',
        shown: [
          fact(`${pName(a)}'s BP is 78/44 (< 90); ${pName(b)}'s BP is 116/72 (≥ 90, no 2nd double).`, [a, b], { tag: 'lowbp', ps: [a] }),
          fact(`${pName(c)}'s BP is 84/50 (< 90); ${pName(d)}'s BP is 80/46 (< 90).`, [c, d], { tag: 'lowbp', ps: [c, d] }),
        ],
        alt: [
          fact(`${pName(a)}'s BP is 118/74 (≥ 90); ${pName(b)}'s BP is 82/48 (< 90).`, [a, b], { tag: 'lowbp', ps: [b] }),
          fact(`${pName(c)}'s BP is 84/50 (< 90); ${pName(d)}'s BP is 114/70 (≥ 90).`, [c, d], { tag: 'lowbp', ps: [c] }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Ward Control', wingIndex: 0, label: 'Non-Escalating Bays',
        shown: [
          fact(`${pName(e)} (Base 3) and ${pName(f)} (Base 4) have NO bleeding and BP > 115 (zero doublings).`, [e, f], { tag: 'flat' }),
          fact(`Apply Pass 1 first, then feed Pass 1's result into Pass 2 for every bay!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Trauma Lead', wingIndex: 1, label: 'Highest Final Score',
        shown: [
          fact(`Notice how a lower Base Score doubled TWICE can overtake a higher Base Score doubled ONCE!`, [], { tag: 'act' }),
          fact(`Treat the SINGLE patient with the highest final score after BOTH passes.`, [], { tag: 'act' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Two-Pass Escalation Multiplier',
      dispatch: 'Feed Pass 1 (Bleed ×2) into Pass 2 (BP < 90 ×2) across four bays to see whose score overtakes #1.',
      order: 'Treat the SINGLE patient with the HIGHEST final score after applying BOTH doubling passes.',
      hint: 'Compute Base → (×2 if bleeding) → (×2 if BP < 90) for each of the four bays.',
      bayDefaultLabel: 'Score Escalation',
      cards,
      evaluate(activeCards) {
        const base = new Map();
        for (const f of factsByTag(activeCards, 'base')) { base.set(f.p1, f.v1); base.set(f.p2, f.v2); }
        const bleed = new Set(factsByTag(activeCards, 'bleed').flatMap((f) => f.ps));
        const lowbp = new Set(factsByTag(activeCards, 'lowbp').flatMap((f) => f.ps));
        const ranked = [a, b, c, d].map((id) => {
          let s = base.get(id) || 0;
          if (bleed.has(id)) s *= 2;
          if (lowbp.has(id)) s *= 2;
          return { id, s };
        }).sort((x, y) => y.s - x.s);
        if (ranked[0].s === ranked[1].s) return { targets: [], proof: 'Tie', rival: null };
        const targets = [ranked[0].id];
        return {
          targets,
          proof: `Two-pass scores: ${ranked.map((r) => `${pName(r.id)} = ${r.s}`).join(' > ')} — ${pName(ranked[0].id)} takes #1.`,
          rival: {
            patientId: ranked[1].id,
            patientName: pName(ranked[1].id),
            reason: `${pName(ranked[1].id)} finishes at ${ranked[1].s} — overtaken by ${pName(ranked[0].id)}'s ${ranked[0].s}.`,
          },
        };
      },
    };
  },

  // #19 Combinatorial reasoning (Before · Composite)
  // Resource-pairing puzzle: 1 OR + 1 Cath Lab + 1 O-Neg Pack — who is FORCED into EVERY valid 3-patient pairing?
  'combinatorial-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Resources', wingIndex: 0, label: 'Three Unique Slots',
        shown: [
          fact(`Tonight's ward has exactly 3 scarce slots: [1 Operating Room], [1 Cath Lab], [1 O-Neg Blood Pack].`, [], { tag: 'rule' }),
          fact(`Every slot must go to a DIFFERENT qualified patient (3 patients served total).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Slot Eligibility', wingIndex: 1, label: 'Operating Room Candidates',
        shown: [
          fact(`ONLY ${pName(a)} is cleared to use the Operating Room right now.`, [a], { tag: 'or_ok', ps: [a] }),
          fact(`${pName(b)} can ONLY use the Cath Lab (NOT OR, NOT O-Neg).`, [b], { tag: 'cath_ok', ps: [b] }),
        ],
        alt: [
          fact(`ONLY ${pName(c)} is cleared to use the Operating Room right now.`, [c], { tag: 'or_ok', ps: [c] }),
          fact(`${pName(b)} can ONLY use the Cath Lab (NOT OR, NOT O-Neg).`, [b], { tag: 'cath_ok', ps: [b] }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Slot Eligibility', wingIndex: 1, label: 'Blood Pack Candidates',
        shown: [
          fact(`${pName(c)}, ${pName(d)}, and ${pName(e)} can ALL use the lone O-Neg Blood Pack — and NOTHING else.`, [c, d, e], { tag: 'blood_ok', ps: [c, d, e] }),
          fact(`${pName(f)} needs routine X-ray only (uses none of the 3 scarce slots).`, [f], { tag: 'none' }),
        ],
        alt: [
          fact(`${pName(a)}, ${pName(d)}, and ${pName(e)} can ALL use the lone O-Neg Blood Pack — and NOTHING else.`, [a, d, e], { tag: 'blood_ok', ps: [a, d, e] }),
          fact(`${pName(f)} needs routine X-ray only (uses none of the 3 scarce slots).`, [f], { tag: 'none' }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Slot Check', wingIndex: 0, label: 'Cath Lab Competition',
        shown: [
          fact(`Nobody else on the ward qualifies for the Cath Lab besides ${pName(b)}.`, [b], { tag: 'note' }),
          fact(`For the Blood Pack, three bays can swap in for one another (3 different valid trios exist!).`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(d)} ALSO qualifies for the Cath Lab alongside ${pName(b)}.`, [d, b], { tag: 'cath_extra', p: d }),
          fact(`Test EVERY possible valid 3-slot assignment to see who is unavoidable!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Assignments', wingIndex: 0, label: 'Compare All Valid Schedules',
        shown: [
          fact(`A patient is MANDATORY if they appear in 100% of valid 3-slot schedules.`, [], { tag: 'note' }),
          fact(`If two patients can substitute for each other in a slot, NEITHER is mandatory.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Charge Nurse', wingIndex: 1, label: 'Lock Mandatory Bays First',
        shown: [
          fact(`Prep EVERY patient who appears in EVERY valid 3-slot assignment immediately.`, [], { tag: 'act' }),
          fact(`Leave interchangeable Blood-Pack candidates for secondary triage.`, [], { tag: 'act' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Mandatory Resource Pairing',
      dispatch: 'Map all valid assignments of [OR, Cath Lab, Blood Pack] to find who appears in EVERY valid schedule.',
      order: 'Lock in EVERY patient who MUST appear in 100% of valid [OR + Cath Lab + Blood Pack] pairings.',
      hint: 'Enumerate valid (OR, Cath, Blood) triples — anyone replaceable in their slot is NOT mandatory.',
      bayDefaultLabel: 'Resource Slot',
      cards,
      evaluate(activeCards) {
        const orList = uniqueSortedIds(factsByTag(activeCards, 'or_ok').flatMap((f) => f.ps));
        const cathList = uniqueSortedIds([
          ...factsByTag(activeCards, 'cath_ok').flatMap((f) => f.ps),
          ...factsByTag(activeCards, 'cath_extra').map((f) => f.p),
        ]);
        const bloodList = uniqueSortedIds(factsByTag(activeCards, 'blood_ok').flatMap((f) => f.ps));
        const validTriples = [];
        for (const x of orList) {
          for (const y of cathList) {
            if (y === x) continue;
            for (const z of bloodList) {
              if (z === x || z === y) continue;
              validTriples.push([x, y, z]);
            }
          }
        }
        if (!validTriples.length) return { targets: [], proof: 'No schedule', rival: null };
        const mandatory = [a, b, c, d, e, f].filter((id) => validTriples.every((tr) => tr.includes(id)));
        const targets = uniqueSortedIds(mandatory);
        return {
          targets,
          proof: `Across all ${validTriples.length} valid (OR, Cath, Blood) schedules, ONLY ${formatList(targets)} appear in every single one.`,
          rival: buildRivalInfo(targets, [d, e, c, b, a], (r) => `${pName(r)} can be swapped out for another candidate in at least one valid schedule.`),
        };
      },
    };
  },

  // #20 Constraint-based reasoning (Before · Composite)
  // Simultaneous relational restrictions on a single medevac helicopter flight
  'constraint-based': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Flight Rules', wingIndex: 0, label: 'Three Hard Flight Limits',
        shown: [
          fact(`Medevac limit: (1) Weight < 90 kg, (2) BP ≥ 90 for altitude, AND (3) Breathing tube ALREADY secured.`, [], { tag: 'rule' }),
          fact(`Breaking ANY single limit disqualifies that patient from takeoff.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Weight & BP', wingIndex: 1, label: 'Relative Weight Links',
        shown: [
          fact(`${pName(a)} (74 kg) is LIGHTER THAN ${pName(e)} (88 kg), who is LIGHTER THAN ${pName(b)} (104 kg).`, [a, e, b], { tag: 'wt', ok: [a, e], bad: [b] }),
          fact(`${pName(c)} (78 kg) and ${pName(d)} (82 kg) are BOTH lighter than ${pName(e)} (< 90 kg).`, [c, d, e], { tag: 'wt', ok: [c, d], bad: [] }),
        ],
        alt: [
          fact(`${pName(b)} (76 kg) is LIGHTER THAN ${pName(e)} (88 kg), who is LIGHTER THAN ${pName(a)} (102 kg).`, [b, e, a], { tag: 'wt', ok: [b, e], bad: [a] }),
          fact(`${pName(c)} (78 kg) and ${pName(d)} (82 kg) are BOTH lighter than ${pName(e)} (< 90 kg).`, [c, d, e], { tag: 'wt', ok: [c, d], bad: [] }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Weight & BP', wingIndex: 1, label: 'Altitude BP Checks',
        shown: [
          fact(`${pName(a)} (BP 98) and ${pName(b)} (BP 104) are BOTH ≥ 90; ${pName(c)} (BP 76) is LOWER THAN 90.`, [a, b, c], { tag: 'bp', ok: [a, b], bad: [c] }),
          fact(`${pName(d)} (BP 108) and ${pName(e)} (BP 94) are BOTH ≥ 90.`, [d, e], { tag: 'bp', ok: [d, e], bad: [] }),
        ],
        alt: [
          fact(`${pName(a)} (BP 98) and ${pName(b)} (BP 104) are BOTH ≥ 90; ${pName(d)} (BP 74) is LOWER THAN 90.`, [a, b, d], { tag: 'bp', ok: [a, b], bad: [d] }),
          fact(`${pName(c)} (BP 96) and ${pName(e)} (BP 94) are BOTH ≥ 90.`, [c, e], { tag: 'bp', ok: [c, e], bad: [] }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Airway Lock', wingIndex: 0, label: 'Breathing Tube Check',
        shown: [
          fact(`${pName(a)}, ${pName(b)}, and ${pName(c)} all have secured breathing tubes.`, [a, b, c], { tag: 'tube', ok: [a, b, c] }),
          fact(`${pName(d)} and ${pName(e)} do NOT have breathing tubes secured yet.`, [d, e], { tag: 'tube_no', bad: [d, e] }),
        ],
        alt: [
          fact(`${pName(b)}, ${pName(c)}, and ${pName(e)} all have secured breathing tubes.`, [b, c, e], { tag: 'tube', ok: [b, c, e] }),
          fact(`${pName(a)} and ${pName(d)} do NOT have breathing tubes secured yet.`, [a, d], { tag: 'tube_no', bad: [a, d] }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Flight Rules', wingIndex: 0, label: 'Final Bay Check',
        shown: [
          fact(`${pName(f)} is 96 kg (> 90 kg) with BP 82 (< 90) — fails two limits.`, [f], { tag: 'note' }),
          fact(`Every candidate passes at least TWO limits — only simultaneous check of ALL THREE finds who clears!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Helipad', wingIndex: 1, label: 'Clear for Takeoff',
        shown: [
          fact(`Board EVERY patient satisfying ALL THREE restrictions (< 90 kg AND BP ≥ 90 AND tube secured).`, [], { tag: 'act' }),
          fact(`Hold any bay failing even one flight restriction.`, [], { tag: 'act' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Three-Constraint Medevac Clearance',
      dispatch: 'Every candidate passes two rules and trips on a different third — check all three flight limits simultaneously.',
      order: 'Clear for takeoff EVERY patient meeting ALL 3 limits (Weight < 90 kg, BP ≥ 90, AND Tube Secured).',
      hint: 'Intersect Weight < 90, BP ≥ 90, and Secured Tube across all five active bays.',
      bayDefaultLabel: 'Flight Eval',
      cards,
      evaluate(activeCards) {
        const wtOk = new Set(factsByTag(activeCards, 'wt').flatMap((f) => f.ok));
        const bpOk = new Set(factsByTag(activeCards, 'bp').flatMap((f) => f.ok));
        const tubeOk = new Set(factsByTag(activeCards, 'tube').flatMap((f) => f.ok));
        const targets = uniqueSortedIds([a, b, c, d, e].filter((id) => wtOk.has(id) && bpOk.has(id) && tubeOk.has(id)));
        return {
          targets,
          proof: `Intersecting Weight < 90, BP ≥ 90, and Secured Tube simultaneously clears ONLY ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, [b, c, d, e, a], (r) => {
            if (!wtOk.has(r)) return `${pName(r)} exceeds the 90 kg flight weight cap.`;
            if (!bpOk.has(r)) return `${pName(r)}'s BP is below the 90 altitude safety floor.`;
            return `${pName(r)} does not have a secured breathing tube yet.`;
          }),
        };
      },
    };
  },
};
