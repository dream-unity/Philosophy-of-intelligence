// Relational-First Clinical Reasoning Engines — Families 7 & 8 (#62–#80)
// Fluid-intelligence relational structures across Social/Ethical (#62–#70) & Metacognitive/Epistemic (#71–#80)
// trauma medicine: within-patient shifts, timestamp gaps, dose ratios, shock-index comparisons, anchor bounds.
// Zero filler cards, zero shallow keyword lookups, zero medical jargon, zero spoilers.

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

export const SEMANTIC_F78 = {
  // =========================================================================
  // FAMILY 7: SOCIAL, PSYCHOLOGICAL & ETHICAL REASONING (#62–#70)
  // =========================================================================

  // #62 Interpersonal reasoning (After · Atomic)
  // Within-patient relational contrast: Behavior WITH Companion vs. Behavior ALONE across 6 trauma bays
  'interpersonal-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Safety Rule', wingIndex: 0, label: 'Two-State Coercion Shift',
        shown: [
          fact(`Compare each patient WITH their companion vs. ALONE: silence/fear while companion hovers followed by rapid disclosure alone signals coercion.`, [], { tag: 'rule' }),
          fact(`Consistent baseline anxiety alone and with visitors, or open speech in front of family, does not meet the coercion shift.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'With Visitor', wingIndex: 1, label: 'State 1: Companion Present A',
        shown: [
          fact(`${pName(a)}'s companion interrupts every question and grips ${pName(a)}'s wrist — ${pName(a)} freezes, MORE withdrawn than ${pName(b)}.`, [a, b], { tag: 'ctrl', p: a }),
          fact(`${pName(b)}'s companion steps behind the curtain whenever asked; ${pName(b)} answers triage questions directly.`, [b], { tag: 'free', p: b }),
        ],
        alt: [
          fact(`${pName(a)}'s companion steps behind the curtain whenever asked; ${pName(a)} answers triage questions directly.`, [a], { tag: 'free', p: a }),
          fact(`${pName(b)}'s companion interrupts every question and refuses to leave — ${pName(b)} freezes, MORE withdrawn than ${pName(a)}.`, [b, a], { tag: 'ctrl', p: b }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Alone Check', wingIndex: 0, label: 'State 2: Private CT Bay A',
        shown: [
          fact(`${pName(a)} ALONE in CT: pulse settles by 24 BPM — OPPOSITE OF bedside silence, whispers "Keep them out of my bay."`, [a], { tag: 'alone_shift', p: a }),
          fact(`${pName(c)} ALONE in CT: trembling at the SAME intensity as with sister — explains lifelong needle phobia.`, [c], { tag: 'same_anx', p: c }),
        ],
        alt: [
          fact(`${pName(b)} ALONE in CT: pulse settles by 24 BPM — OPPOSITE OF bedside silence, whispers "Keep them out of my bay."`, [b], { tag: 'alone_shift', p: b }),
          fact(`${pName(c)} ALONE in CT: trembling at the SAME intensity as with sister — explains lifelong needle phobia.`, [c], { tag: 'same_anx', p: c }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'With Visitor', wingIndex: 1, label: 'State 1: Companion Present B',
        shown: [
          fact(`${pName(d)}'s companion demands early discharge before CT finishes — ${pName(d)} stares downward, LESS vocal than ${pName(e)}.`, [d, e], { tag: 'ctrl', p: d }),
          fact(`${pName(e)}'s anxious spouse peppers the resident with questions, yet pauses immediately whenever ${pName(e)} speaks.`, [e], { tag: 'free', p: e }),
        ],
        alt: [
          fact(`${pName(d)}'s companion waits quietly in the corridor while ${pName(d)} recounts the fall clearly.`, [d], { tag: 'free', p: d }),
          fact(`${pName(c)}'s companion refuses to exit and answers for ${pName(c)} — ${pName(c)} stares downward, LESS vocal than ${pName(e)}.`, [c, e], { tag: 'ctrl', p: c }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Alone Check', wingIndex: 0, label: 'State 2: Private CT Bay B',
        shown: [
          fact(`${pName(d)} ALONE at wash station: immediately shifts posture and asks the trauma nurse for a private social-work consult.`, [d], { tag: 'alone_shift', p: d }),
          fact(`${pName(e)} & ${pName(f)} ALONE: calm at the SAME baseline as with visitors and request their relatives back at bedside.`, [e, f], { tag: 'free_pair', ps: [e, f] }),
        ],
        alt: [
          fact(`${pName(c)} ALONE at wash station: immediately shifts posture and asks the trauma nurse for a private social-work consult.`, [c], { tag: 'alone_shift', p: c }),
          fact(`${pName(e)} & ${pName(f)} ALONE: calm at the SAME baseline as with visitors and request their relatives back at bedside.`, [e, f], { tag: 'free_pair', ps: [e, f] }),
        ],
      }),
      makeCard({
        index: 5, time: '01:22', wing: 'Private Suite', wingIndex: 1, label: 'Separate & Protect',
        shown: [
          fact(`Intersect Companion Control with a clear disclosure shift when alone.`, [], { tag: 'rule' }),
          fact(`Transfer matching bays to visitor-restricted trauma rooms with Social Work.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'With-Visitor vs. Alone Shift',
      dispatch: 'Compare every patient’s behavior WITH their companion against their behavior ALONE to isolate coercion.',
      order: 'Move to a private room EVERY patient showing BOTH companion control AND a sharp fear-to-disclosure shift when alone.',
      hint: 'Pair State 1 (companion intercepts/controls) with State 2 (patient drops fear and requests protection alone).',
      bayDefaultLabel: 'Bedside Safety',
      cards,
      evaluate(activeCards) {
        const ctrl = new Set(factsByTag(activeCards, 'ctrl').map((x) => x.p));
        const shift = new Set(factsByTag(activeCards, 'alone_shift').map((x) => x.p));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => ctrl.has(id) && shift.has(id)));
        const rivals = [c, e, b, d, a].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Comparing State 1 (companion control) against State 2 (disclosure shift alone) isolates ${formatList(targets)} for immediate private-room protection.`,
          rival: buildRivalInfo(targets, rivals, (r) => `${pName(r)} either maintained identical anxiety alone (needle phobia) or spoke freely with family present.`),
        };
      },
    };
  },

  // #63 Mentalistic reasoning (After · Composite)
  // Relational timestamp gap: Family Last-Update Time BEFORE vs. AFTER Emergency OR Transfer across 6 bays
  'mentalistic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Family Desk', wingIndex: 0, label: 'Knowledge-Gap Clock',
        shown: [
          fact(`A waiting family holds an outdated mental model whenever Emergency OR entry occurred AFTER the family's last clinical update.`, [], { tag: 'rule' }),
          fact(`Families briefed after OR entry, or waiting on non-surgical Observation bays, already hold accurate expectations.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'OR Board', wingIndex: 1, label: 'Emergency OR Transfers A',
        shown: [
          fact(`${pName(a)} rolled into OR-1 at 01:10 for splenic hemorrhage — 5 min LATER THAN ${pName(b)}'s 01:05 OR-2 start.`, [a, b], { tag: 'or_pair', list: [{ p: a, t: 70 }, { p: b, t: 65 }] }),
          fact(`Both OR-1 and OR-2 transfers bypassed the waiting lobby via the restricted surgical corridor.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(a)} stayed in Observation without surgery; ${pName(b)} rolled into OR-2 at 01:12 for chest hemorrhage.`, [a, b], { tag: 'or', p: b, t: 72 }),
          fact(`OR-2 transfer bypassed the waiting lobby via the restricted surgical corridor.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 2, time: '01:12', wing: 'Family Log', wingIndex: 0, label: 'Family Last-Update Times A',
        shown: [
          fact(`${pName(a)}'s spouse was last briefed at 00:35 on stable triage vitals.`, [a], { tag: 'fam', p: a, t: 35 }),
          fact(`${pName(b)}'s parent spoke with the trauma fellow at 01:14 — LATER THAN ${pName(a)}'s spouse.`, [b, a], { tag: 'fam', p: b, t: 74 }),
        ],
        alt: [
          fact(`${pName(a)}'s spouse was briefed at 01:15 on stable Observation status.`, [a], { tag: 'fam', p: a, t: 75 }),
          fact(`${pName(b)}'s parent was last briefed at 00:40 before chest CT — EARLIER THAN ${pName(a)}'s update.`, [b, a], { tag: 'fam', p: b, t: 40 }),
        ],
      }),
      makeCard({
        index: 3, time: '01:16', wing: 'OR Board', wingIndex: 1, label: 'Emergency OR Transfers B',
        shown: [
          fact(`${pName(d)} rolled into OR-3 at 01:18 — LATER THAN ${pName(e)}'s 01:02 OR-4 start.`, [d, e], { tag: 'or_pair', list: [{ p: d, t: 78 }, { p: e, t: 62 }] }),
          fact(`${pName(c)} and ${pName(f)} remained in Observation with zero surgical bookings.`, [c, f], { tag: 'no_or_pair', ps: [c, f] }),
        ],
        alt: [
          fact(`${pName(c)} rolled into OR-3 at 01:18 — LATER THAN ${pName(e)}'s 01:02 OR-4 start.`, [c, e], { tag: 'or_pair', list: [{ p: c, t: 78 }, { p: e, t: 62 }] }),
          fact(`${pName(d)} and ${pName(f)} remained in Observation with zero surgical bookings.`, [d, f], { tag: 'no_or_pair', ps: [d, f] }),
        ],
      }),
      makeCard({
        index: 4, time: '01:22', wing: 'Family Log', wingIndex: 0, label: 'Family Last-Update Times B',
        shown: [
          fact(`${pName(d)}'s sibling was last briefed at 00:45 on minor laceration repair.`, [d], { tag: 'fam', p: d, t: 45 }),
          fact(`${pName(e)}'s family was briefed at 01:08; ${pName(c)} & ${pName(f)}'s families were last updated at 00:50.`, [e, c, f], { tag: 'fam_e', p: e, t: 68 }),
        ],
        alt: [
          fact(`${pName(c)}'s sibling was last briefed at 00:45 on minor laceration repair.`, [c], { tag: 'fam', p: c, t: 45 }),
          fact(`${pName(e)}'s family was briefed at 01:08; ${pName(d)} & ${pName(f)}'s families were updated at 00:50.`, [e, d, f], { tag: 'fam_e', p: e, t: 68 }),
        ],
      }),
      makeCard({
        index: 5, time: '01:25', wing: 'Waiting Room', wingIndex: 1, label: 'Sync Waiting Families',
        shown: [
          fact(`Compare each bay's OR Transfer Time directly against that family's Last-Update Time.`, [], { tag: 'rule' }),
          fact(`Brief every family whose last update came strictly BEFORE their patient's OR entry.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Waiting-Room Knowledge Gap',
      dispatch: 'Compare Emergency OR transfer timestamps against each waiting family’s last-update timestamp.',
      order: 'Update in person EVERY family whose loved one entered Emergency OR AFTER the family’s last update.',
      hint: 'Check OR Entry Time > Family Last-Update Time and skip non-surgical Observation bays.',
      bayDefaultLabel: 'Family Sync',
      cards,
      evaluate(activeCards) {
        const orT = new Map();
        const famT = new Map();
        for (const x of factsByTag(activeCards, 'or')) orT.set(x.p, x.t);
        for (const x of factsByTag(activeCards, 'or_pair')) for (const it of x.list) orT.set(it.p, it.t);
        for (const x of [...factsByTag(activeCards, 'fam'), ...factsByTag(activeCards, 'fam_e')]) famT.set(x.p, x.t);
        const targets = uniqueSortedIds(
          [a, b, c, d, e, f].filter((id) => orT.has(id) && famT.has(id) && famT.get(id) < orT.get(id))
        );
        const rivals = [b, e, c, d, a].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Comparing OR entry timestamps against family last-update times flags ${formatList(targets)}: transferred to OR after their families' outdated updates.`,
          rival: buildRivalInfo(targets, rivals, (r) =>
            orT.has(r) ? `${pName(r)}'s family was already briefed AFTER ${pName(r)} entered OR.` : `${pName(r)} remained in Observation without surgery, matching family expectations.`
          ),
        };
      },
    };
  },

  // #64 Motivational reasoning (After · Composite)
  // Trauma AMA Capacity & Hidden Driver Audit: distinguish impaired capacity + occult shock vs. intact autonomous refusal or reversible pain
  'motivational-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'AMA Law', wingIndex: 0, label: 'Capacity × Shock Rule',
        shown: [
          fact(`Six trauma bays want to sign out Against Medical Advice (AMA). Hold for Emergency Capacity Hold ONLY if: (1) Impaired decision-making capacity AND (2) Occult shock (HR > Top BP or free abdominal fluid).`, [], { tag: 'rule' }),
          fact(`Oriented adults who accurately restate death risk hold legal autonomy to leave AMA; impaired bays with stable vitals need observation, not resuscitation.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Capacity Exam A', wingIndex: 1, label: 'Comprehension & Motive A',
        shown: [
          fact(`${pName(a)}: Post-concussive — repeats "nothing is wrong" 4 times and cannot restate bleeding risk; LESS oriented than ${pName(b)}.`, [a, b], { tag: 'imp', p: a }),
          fact(`${pName(b)}: Fully oriented ×4, clearly states "I know I could bleed out, I still refuse admission" after calm attending review.`, [b], { tag: 'cap', p: b }),
        ],
        alt: [
          fact(`${pName(a)}: Fully oriented ×4, accurately explains bleeding risk and signs standard AMA refusal.`, [a], { tag: 'cap', p: a }),
          fact(`${pName(b)}: Post-concussive — disoriented to month and cannot recall crash impact; LESS oriented than ${pName(a)}.`, [b, a], { tag: 'imp', p: b }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Capacity Exam B', wingIndex: 1, label: 'Comprehension & Motive B',
        shown: [
          fact(`${pName(c)} & ${pName(d)}: Both agitated and disoriented — ${pName(c)} from alcohol, ${pName(d)} from hypoxia (neither can restate refusal risks).`, [c, d], { tag: 'imp_pair', ps: [c, d] }),
          fact(`${pName(e)}: Oriented ×4, wanted to leave ONLY until IV pain control calmed chest rib pain; ${pName(f)}: Oriented ×4, calm AMA.`, [e, f], { tag: 'cap_pair', ps: [e, f] }),
        ],
        alt: [
          fact(`${pName(c)}: Disoriented to place and unable to explain consequences of leaving; ${pName(d)}: Oriented ×4 and calmly accepts admission.`, [c, d], { tag: 'imp', p: c }),
          fact(`${pName(e)} & ${pName(f)}: Both fully oriented ×4 and accurately restate medical risks.`, [e, f], { tag: 'cap_pair', ps: [e, f] }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Shock Vitals A', wingIndex: 0, label: 'Hemodynamics A & B',
        shown: [
          fact(`${pName(a)}: HR 132 · Top BP 106 (HR exceeds Top BP — MORE unstable than ${pName(c)}'s HR 84 / BP 122).`, [a, c], { tag: 'shk', p: a }),
          fact(`${pName(b)}: HR 128 · Top BP 104 + positive pelvic FAST scan.`, [b], { tag: 'shk', p: b }),
        ],
        alt: [
          fact(`${pName(a)}: HR 78 · Top BP 124, negative FAST scan.`, [a], { tag: 'stab', p: a }),
          fact(`${pName(b)}: HR 134 · Top BP 102 + worsening abdominal guarding.`, [b], { tag: 'shk', p: b }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Shock Vitals B', wingIndex: 0, label: 'Hemodynamics C–F',
        shown: [
          fact(`${pName(d)}: HR 136 · Top BP 108 + O2 86% + free fluid trapped inside the heart sac on FAST.`, [d], { tag: 'shk', p: d }),
          fact(`${pName(c)} (HR 84 / BP 122), ${pName(e)} (HR 88 / BP 126), & ${pName(f)} (HR 76 / BP 120): all negative FAST scans.`, [c, e, f], { tag: 'stab_all', ps: [c, e, f] }),
        ],
        alt: [
          fact(`${pName(c)}: HR 130 · Top BP 98 + expanding splenic fluid on FAST.`, [c], { tag: 'shk', p: c }),
          fact(`${pName(d)} (HR 82 / BP 120), ${pName(e)} (HR 88 / BP 126), & ${pName(f)} (HR 76 / BP 120): all negative FAST scans.`, [d, e, f], { tag: 'stab_all', ps: [d, e, f] }),
        ],
      }),
      makeCard({
        index: 5, time: '01:22', wing: 'Trauma Lead', wingIndex: 1, label: 'Invoke Capacity Hold',
        shown: [
          fact(`Intersect Impaired Decision Capacity WITH Active Occult Shock (HR > Top BP / Positive FAST).`, [], { tag: 'rule' }),
          fact(`Place Emergency Resuscitation Holds ONLY where both criteria align.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'AMA Capacity vs. Occult Shock',
      dispatch: 'Six trauma patients demand to sign out AMA — separate impaired capacity + occult shock from intact refusal and stable intoxication.',
      order: 'Place an Emergency Resuscitation Hold on EVERY AMA patient with BOTH impaired capacity AND occult shock (HR > Top BP or positive FAST).',
      hint: 'Intersect Impaired Capacity (Cards 1–2) WITH Occult Shock (Cards 3–4) — honor oriented refusals and keep stable bays off resus hold.',
      bayDefaultLabel: 'AMA Capacity',
      cards,
      evaluate(activeCards) {
        const imp = new Set([
          ...factsByTag(activeCards, 'imp').map((x) => x.p),
          ...factsByTag(activeCards, 'imp_pair').flatMap((x) => x.ps),
        ]);
        const shk = new Set(factsByTag(activeCards, 'shk').map((x) => x.p));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => imp.has(id) && shk.has(id)));
        const rivals = [b, c, e, d, a].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Intersecting impaired decision-making capacity with occult shock (HR > Top BP / positive FAST) isolates ${formatList(targets)} for emergency medical hold.`,
          rival: buildRivalInfo(targets, rivals, (r) =>
            imp.has(r)
              ? `${pName(r)} lacks capacity, but hemodynamics and FAST scan are completely stable (observation hold, not resuscitation).`
              : `${pName(r)} demonstrated full decision-making capacity (oriented ×4, restated risks), which legally bars involuntary override.`
          ),
        };
      },
    };
  },

  // #65 Moral reasoning (After · Composite)
  // Weight-Based Infusion Ceiling (2 mg/kg max) & Clinical Candor Audit across relative weight chains
  'moral-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Candor Rule', wingIndex: 0, label: '2 mg/kg Ceiling & Disclosure',
        shown: [
          fact(`Max safe bolus ceiling for IV Drug K = 2 mg per kg of body weight (Weight × 2).`, [], { tag: 'rule' }),
          fact(`Duty of Candor: never quietly dial back a pump — reverse AND disclose EVERY bay whose delivered total exceeded its 2 mg/kg ceiling.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Weight Chain A', wingIndex: 1, label: 'Patient Weights (A–C)',
        shown: [
          fact(`${pName(b)} weighs 80 kg; ${pName(a)} weighs 15 kg LESS THAN ${pName(b)}.`, [b, a], { tag: 'wt', map: { [b]: 80, [a]: 65 } }),
          fact(`${pName(c)} weighs 10 kg LESS THAN ${pName(d)}.`, [c, d], { tag: 'wt_rel', p: c, ref: d, delta: -10 }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Weight Chain B', wingIndex: 1, label: 'Patient Weights (D–F)',
        shown: [
          fact(`${pName(d)} weighs 70 kg; ${pName(e)} weighs 15 kg MORE THAN ${pName(d)}.`, [d, e], { tag: 'wt', map: { [d]: 70, [e]: 85 } }),
          fact(`${pName(f)} weighs 20 kg LESS THAN ${pName(e)}.`, [f, e], { tag: 'wt_rel', p: f, ref: e, delta: -20 }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'IV Pump Audit', wingIndex: 0, label: 'Pump Totals Delivered (A–C)',
        shown: [
          fact(`${pName(a)}: Pump delivered 165 mg · ${pName(b)}: Pump delivered 150 mg.`, [a, b], { tag: 'giv', map: { [a]: 165, [b]: 150 } }),
          fact(`${pName(c)}: Pump delivered 145 mg — junior resident asked to lower the rate quietly without charting.`, [c], { tag: 'giv', map: { [c]: 145 } }),
        ],
        alt: [
          fact(`${pName(a)}: Pump delivered 120 mg · ${pName(b)}: Pump delivered 195 mg — muted alarm on pump.`, [a, b], { tag: 'giv', map: { [a]: 120, [b]: 195 } }),
          fact(`${pName(c)}: Pump delivered 115 mg on schedule.`, [c], { tag: 'giv', map: { [c]: 115 } }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'IV Pump Audit', wingIndex: 0, label: 'Pump Totals Delivered (D–F)',
        shown: [
          fact(`${pName(d)}: Pump delivered 135 mg · ${pName(e)}: Pump delivered 160 mg.`, [d, e], { tag: 'giv', map: { [d]: 135, [e]: 160 } }),
          fact(`${pName(f)}: Pump delivered 125 mg — identical pump profile to ${pName(d)}.`, [f, d], { tag: 'giv', map: { [f]: 125 } }),
        ],
        alt: [
          fact(`${pName(d)}: Pump delivered 175 mg — nurse suggested erasing the pump log · ${pName(e)}: 160 mg.`, [d, e], { tag: 'giv', map: { [d]: 175, [e]: 160 } }),
          fact(`${pName(f)}: Pump delivered 125 mg.`, [f], { tag: 'giv', map: { [f]: 125 } }),
        ],
      }),
      makeCard({
        index: 5, time: '01:22', wing: 'Ethics Lead', wingIndex: 1, label: 'Reverse & Disclose',
        shown: [
          fact(`Resolve every bay's body weight, multiply × 2 mg/kg, and compare against Delivered mg.`, [], { tag: 'rule' }),
          fact(`Reverse and formally disclose EVERY infusion exceeding its 2 mg/kg ceiling.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Infusion Ceiling & Candor',
      dispatch: 'Chain patient body weights, compute each bay’s 2 mg/kg ceiling, and expose every concealed over-ceiling infusion.',
      order: 'Reverse AND honestly disclose EVERY patient whose delivered IV dose exceeded their 2 mg/kg weight ceiling.',
      hint: 'Chain weights from the two anchors, multiply × 2 mg/kg, then compare against Pump Delivered.',
      bayDefaultLabel: 'Dose Audit',
      cards,
      evaluate(activeCards) {
        const wt = {};
        for (const x of factsByTag(activeCards, 'wt')) Object.assign(wt, x.map);
        for (const x of factsByTag(activeCards, 'wt_rel')) {
          if (wt[x.ref] != null) wt[x.p] = wt[x.ref] + x.delta;
        }
        const giv = {};
        for (const x of factsByTag(activeCards, 'giv')) Object.assign(giv, x.map);
        const targets = uniqueSortedIds(
          [a, b, c, d, e, f].filter((id) => wt[id] != null && giv[id] != null && giv[id] > wt[id] * 2)
        );
        const rivals = [a, b, c, d, e, f].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Resolving weights × 2 mg/kg catches over-ceiling infusions on ${formatList(targets)} (${targets.map((id) => `${pName(id)}: ${giv[id]}mg > ${wt[id] * 2}mg cap`).join(', ')}) — reverse and disclose candidly.`,
          rival: buildRivalInfo(targets, rivals, (r) => `${pName(r)} weighs ${wt[r]} kg (ceiling ${wt[r] * 2} mg), and the pump delivered ${giv[r]} mg — safely within limit.`),
        };
      },
    };
  },

  // #66 Ethical reasoning (After · Composite)
  // Legal/ethical precedence lattice: Signed Patient DNR / Clear Refusal OVERRIDES Family Demand; Unconscious No-DNR → Full Code
  'ethical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Bioethics Law', wingIndex: 0, label: 'Autonomy Precedence',
        shown: [
          fact(`A patient's verified signed DNR or clear-headed refusal OVERRIDES any family member demanding full resuscitation.`, [], { tag: 'rule' }),
          fact(`Deploy Full Resuscitation ONLY to actively crashing bays (BP < 85 or O2 < 85%) who are Full Code or unconscious with no DNR.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Directives A', wingIndex: 1, label: 'Legal Status A & B',
        shown: [
          fact(`${pName(a)}: Verified Full-Code directive requesting all life-saving interventions.`, [a], { tag: 'ok_code', p: a }),
          fact(`${pName(b)}: Verified signed Comfort-Only DNR on file; brother at bedside demands defibrillation.`, [b], { tag: 'no_code', p: b }),
        ],
        alt: [
          fact(`${pName(a)}: Verified signed Comfort-Only DNR witnessed by primary physician; spouse demands full code.`, [a], { tag: 'no_code', p: a }),
          fact(`${pName(b)}: Verified Full-Code directive requesting full emergency resuscitation.`, [b], { tag: 'ok_code', p: b }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Directives B', wingIndex: 1, label: 'Legal Status C & D',
        shown: [
          fact(`${pName(c)}: Oriented ×4 adult signing explicit refusal of transfusion and intubation.`, [c], { tag: 'no_code', p: c }),
          fact(`${pName(d)}: Arrived unresponsive from highway rollover — zero DNR or refusal anywhere in registry.`, [d], { tag: 'ok_code', p: d }),
        ],
        alt: [
          fact(`${pName(c)}: Arrived unresponsive after syncope — zero DNR or refusal anywhere in registry.`, [c], { tag: 'ok_code', p: c }),
          fact(`${pName(d)}: Verified signed Comfort-Only DNR witnessed by two physicians.`, [d], { tag: 'no_code', p: d }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Live Vitals', wingIndex: 0, label: 'Hemodynamic Status',
        shown: [
          fact(`BP < 82 or O2 < 82% right now: ${pName(a)}, ${pName(b)}, ${pName(c)}, and ${pName(d)} — ALL LOWER THAN ${pName(e)} & ${pName(f)}.`, [a, b, c, d, e, f], { tag: 'crash', ps: [a, b, c, d] }),
          fact(`${pName(e)} (Full Code) & ${pName(f)} (No DNR) both hold steady BP 122/76 and O2 99%.`, [e, f], { tag: 'steady', ps: [e, f] }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Bioethics Law', wingIndex: 0, label: 'Precedence Verification',
        shown: [
          fact(`Verified patient refusal supersedes family pressure; stable vitals never trigger a code response.`, [], { tag: 'rule' }),
          fact(`Intersect Active Hemodynamic Collapse WITH Authorized Full Code / Implied Unconscious Consent.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Code Team', wingIndex: 1, label: 'Deploy Full Code',
        shown: [
          fact(`Deploy full resuscitation to every crashing patient legally authorized for full intervention.`, [], { tag: 'rule' }),
          fact(`Transition verified DNR and clear-headed refusal bays to comfort care.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Autonomy vs. Resuscitation',
      dispatch: 'Balance emergency resuscitation against verified signed DNRs, clear-headed refusals, and stable bays.',
      order: 'Rush FULL RESUSCITATION to EVERY actively crashing patient who is Full Code or unconscious with no DNR.',
      hint: 'Intersect Crashing Vitals (BP < 82 / O2 < 82%) WITH Full Code or Unconscious No-DNR — signed DNRs override family demands.',
      bayDefaultLabel: 'Code Status',
      cards,
      evaluate(activeCards) {
        const ok = new Set(factsByTag(activeCards, 'ok_code').map((x) => x.p));
        const crash = new Set(factsByTag(activeCards, 'crash').flatMap((x) => x.ps));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => ok.has(id) && crash.has(id)));
        const rivals = [b, c, e, d, a].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Intersecting active crash status with patient autonomy clears ${formatList(targets)} for full resuscitation while honoring verified DNRs and refusals.`,
          rival: buildRivalInfo(targets, rivals, (r) =>
            !crash.has(r) ? `${pName(r)} is Full Code, but their BP (122/76) and O2 (99%) are completely stable.` : `${pName(r)} has a verified signed DNR or clear-headed refusal that overrides family pressure.`
          ),
        };
      },
    };
  },

  // #67 Pragmatic reasoning (Before · Atomic)
  // Real Trauma Transfer Feasibility: Required Definitive Care + Deterioration Window vs. Storm-Detour Transit Time & Receiving Hospital Outages
  'pragmatic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Transfer Gate', wingIndex: 0, label: 'Window vs. Detour Reality',
        shown: [
          fact(`Storm flooding closed the main bridge. ABORT transfer & stabilize on-site if a bay's planned receiving hospital EITHER lacks their required specialist service tonight OR has a detour transit time LONGER THAN their deterioration window.`, [], { tag: 'rule' }),
          fact(`If the receiving hospital has the required service open AND detour transit ≤ deterioration window, transfer clears.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Clinical Needs A', wingIndex: 1, label: 'Transfer Orders (A–C)',
        shown: [
          fact(`${pName(a)}: Expanding skull-lining brain bleed — needs Neuro-OR within 45 min → booked to Riverview.`, [a], { tag: 'trq', p: a, need: 'neuro', win: 45, hosp: 'Riverview' }),
          fact(`${pName(b)}: Open femur fracture — needs Ortho-OR within 90 min → booked to Riverview · ${pName(c)}: Pelvic bleed — needs IR Coiling within 40 min → booked to Northside.`, [b, c], { tag: 'trq_pair', list: [{ p: b, need: 'ortho', win: 90, hosp: 'Riverview' }, { p: c, need: 'ir', win: 40, hosp: 'Northside' }] }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Clinical Needs B', wingIndex: 1, label: 'Transfer Orders (D–F)',
        shown: [
          fact(`${pName(d)}: Major burn airway — needs Burn ICU within 50 min → booked to Westside.`, [d], { tag: 'trq', p: d, need: 'burn', win: 50, hosp: 'Westside' }),
          fact(`${pName(e)}: Stable forearm fracture — needs Ortho-OR within 120 min → booked to Northside · ${pName(f)}: Splenic tear — needs IR Coiling within 45 min → booked to Westside.`, [e, f], { tag: 'trq_pair', list: [{ p: e, need: 'ortho', win: 120, hosp: 'Northside' }, { p: f, need: 'ir', win: 45, hosp: 'Westside' }] }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Storm Ops A', wingIndex: 0, label: 'Riverview & Northside Live',
        shown: [
          fact(`Riverview: 30-min detour · Ortho-OR OPEN, but Neuro-OR is OFFLINE after transformer flood.`, [a, b], { tag: 'hosp', name: 'Riverview', eta: 30, down: ['neuro'] }),
          fact(`Northside: Detour is 25 min LONGER THAN Riverview's 30 min · IR Coiling & Ortho-OR both OPEN.`, [c, e], { tag: 'hosp', name: 'Northside', eta: 55, down: [] }),
        ],
        alt: [
          fact(`Riverview: 30-min detour · Neuro-OR & Ortho-OR both OPEN on full backup power.`, [a, b], { tag: 'hosp', name: 'Riverview', eta: 30, down: [] }),
          fact(`Northside: 35-min detour · IR Coiling & Ortho-OR both OPEN.`, [c, e], { tag: 'hosp', name: 'Northside', eta: 35, down: [] }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Storm Ops B', wingIndex: 0, label: 'Westside Live Status',
        shown: [
          fact(`Westside: Detour is 15 min SHORTER THAN Northside's · Burn ICU & IR Coiling both OPEN.`, [d, f], { tag: 'hosp', name: 'Westside', eta: 40, down: [] }),
          fact(`All 6 patients hold signed transfer consents — only open services and detour ETA govern feasibility.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Westside: 60-min flooded detour (25 min LONGER THAN Northside's 35 min) · Burn ICU OPEN, IR Coiling OFFLINE.`, [d, f], { tag: 'hosp', name: 'Westside', eta: 60, down: ['ir'] }),
          fact(`All 6 patients hold signed transfer consents — only open services and detour ETA govern feasibility.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:22', wing: 'Transfer Desk', wingIndex: 1, label: 'Abort Unfeasible Runs',
        shown: [
          fact(`Hold and stabilize on-site EVERY transfer whose destination is missing the needed service OR exceeds the clinical window.`, [], { tag: 'rule' }),
          fact(`Release feasible transfers immediately while detour roads remain passable.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Flooded-Bridge Trauma Transfers',
      dispatch: 'Storm detours and power outages hit three receiving hospitals — test each bay’s clinical window and required service against live hospital status.',
      order: 'ABORT transfer & hold on-site EVERY patient whose receiving hospital lacks their needed service OR has a detour LONGER THAN their window.',
      hint: 'Resolve each hospital’s relative detour ETA and offline services, then test (Service Offline OR Detour ETA > Clinical Window).',
      bayDefaultLabel: 'Transfer Fit',
      cards,
      evaluate(activeCards) {
        const reqs = [];
        for (const x of factsByTag(activeCards, 'trq')) reqs.push(x);
        for (const x of factsByTag(activeCards, 'trq_pair')) for (const it of x.list) reqs.push(it);
        const hosps = new Map();
        for (const x of factsByTag(activeCards, 'hosp')) hosps.set(x.name, x);
        const targets = uniqueSortedIds(
          reqs.filter((r) => {
            const h = hosps.get(r.hosp);
            if (!h) return false;
            return h.down.includes(r.need) || h.eta > r.win;
          }).map((r) => r.p)
        );
        const rivals = reqs.map((r) => r.p).filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Testing required specialist services and clinical windows against live storm detours aborts transfers for ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, rivals, (r) => {
            const req = reqs.find((x) => x.p === r);
            const h = hosps.get(req.hosp);
            return `${pName(r)}'s receiving hospital (${req.hosp}) has ${req.need.toUpperCase()} open and a ${h.eta}-min detour fitting inside their ${req.win}-min window.`;
          }),
        };
      },
    };
  },

  // #68 Contextual reasoning (Inside · Atomic)
  // Identical Current BP (102/64) across ALL 6 bays — chain relative chronic baselines and subtract 102 to catch ≥ 40 mmHg hidden shock!
  'contextual-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Resus Rule', wingIndex: 0, label: 'Identical 102/64 Wall',
        shown: [
          fact(`ALL SIX bays currently show the EXACT SAME monitor reading: 102/64.`, [], { tag: 'rule' }),
          fact(`Hidden Shock triggers whenever a patient's top BP fell 40 mmHg OR MORE below their own chronic resting baseline.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Clinic File A', wingIndex: 1, label: 'Relative Baselines A & B',
        shown: [
          fact(`${pName(a)}'s chronic clinic baseline is 34 mmHg HIGHER THAN ${pName(d)}'s.`, [a, d], { tag: 'bs_rel', p: a, ref: d, delta: 34 }),
          fact(`${pName(b)}'s marathon resting baseline is 18 mmHg LOWER THAN ${pName(f)}'s.`, [b, f], { tag: 'bs_rel', p: b, ref: f, delta: -18 }),
        ],
        alt: [
          fact(`${pName(a)}'s swimmer resting baseline is 12 mmHg LOWER THAN ${pName(f)}'s.`, [a, f], { tag: 'bs_rel', p: a, ref: f, delta: -12 }),
          fact(`${pName(b)}'s chronic clinic baseline is 30 mmHg HIGHER THAN ${pName(d)}'s.`, [b, d], { tag: 'bs_rel', p: b, ref: d, delta: 30 }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Clinic File B', wingIndex: 1, label: 'Relative Baselines C & D',
        shown: [
          fact(`${pName(c)}'s chronic baseline is 18 mmHg HIGHER THAN ${pName(e)}'s.`, [c, e], { tag: 'bs_rel', p: c, ref: e, delta: 18 }),
          fact(`${pName(d)}'s documented clinic baseline is 134/82.`, [d], { tag: 'bs', p: d, bp: 134 }),
        ],
        alt: [
          fact(`${pName(c)}'s documented clinic baseline is 112/70.`, [c], { tag: 'bs', p: c, bp: 112 }),
          fact(`${pName(d)}'s chronic baseline is 34 mmHg HIGHER THAN ${pName(e)}'s.`, [d, e], { tag: 'bs_rel', p: d, ref: e, delta: 34 }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Clinic File C', wingIndex: 0, label: 'Anchor Baselines E & F',
        shown: [
          fact(`${pName(e)}'s documented clinic baseline is 138/84.`, [e], { tag: 'bs', p: e, bp: 138 }),
          fact(`${pName(f)}'s documented clinic baseline is 118/74.`, [f], { tag: 'bs', p: f, bp: 118 }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Resus Rule', wingIndex: 0, label: 'Resolve Chain Before Subtracting',
        shown: [
          fact(`Chain each relative baseline off the documented anchors before subtracting 102.`, [], { tag: 'rule' }),
          fact(`An identical 102/64 reading is routine for a runner yet severe shock for chronic hypertension.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Shock Team', wingIndex: 1, label: 'Treat Hidden Crashes',
        shown: [
          fact(`Initiate shock resuscitation for every 102/64 bay whose baseline dropped ≥ 40 mmHg.`, [], { tag: 'rule' }),
          fact(`Keep sub-40 drops on routine monitoring.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Six Identical 102/64 Monitors',
      dispatch: 'Every monitor reads 102/64 — chain relative resting baselines and subtract 102 to isolate drops of 40+ mmHg.',
      order: 'Treat for hidden shock EVERY 102/64 patient whose top BP fell 40 POINTS OR MORE below their normal baseline.',
      hint: 'Resolve the relative baseline links from the documented anchors first, then subtract 102 from each bay.',
      bayDefaultLabel: 'BP 102/64 Eval',
      cards,
      evaluate(activeCards) {
        const bps = new Map();
        for (const x of factsByTag(activeCards, 'bs')) bps.set(x.p, x.bp);
        for (let pass = 0; pass < 3; pass++) {
          for (const x of factsByTag(activeCards, 'bs_rel')) {
            if (!bps.has(x.p) && bps.has(x.ref)) bps.set(x.p, bps.get(x.ref) + x.delta);
          }
        }
        const list = [...bps.entries()].map(([id, bp]) => ({ id, bp, drop: bp - 102 }));
        const targets = uniqueSortedIds(list.filter((x) => x.drop >= 40).map((x) => x.id));
        const rivals = list.filter((x) => x.drop < 40).sort((x, y) => y.drop - x.drop).map((x) => x.id);
        return {
          targets,
          proof: `Resolving relative baselines and subtracting 102 exposes ≥ 40-pt hidden shock in ${formatList(targets)} (${targets.map((id) => { const x = list.find((r) => r.id === id); return `${pName(id)}: ${x.bp}→102 (−${x.drop})`; }).join(', ')}).`,
          rival: buildRivalInfo(targets, rivals, (r) => {
            const x = list.find((item) => item.id === r);
            return `${pName(r)}'s baseline is ${x.bp} (drop of ${x.drop} pts), staying under the 40-point shock line.`;
          }),
        };
      },
    };
  },

  // #69 Narrative reasoning (After · Composite)
  // Relational timeline check: Claimed Injury Age vs. Biological Healing Age across 6 trauma bays
  'narrative-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Tissue Clock', wingIndex: 0, label: 'Biological Age Scale',
        shown: [
          fact(`Tissue healing clock: Red-purple bruise = < 24 hours · Yellow-green bruise = 5–7 days · Calcified rib callus = 3+ weeks.`, [], { tag: 'rule' }),
          fact(`Flag for Forensic Protection Review whenever physical tissue age or fracture energy contradicts the claimed story.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Stories A', wingIndex: 1, label: 'Claimed Accounts A & B',
        shown: [
          fact(`${pName(a)} reports a single low carpet slip 20 minutes ago — SAME recent timeframe as ${pName(b)}'s icy-step fall 30 minutes ago.`, [a, b], { tag: 'st_pair', ps: [a, b] }),
          fact(`Both patients deny any prior falls or injuries over the past month.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'X-Ray Clock A', wingIndex: 0, label: 'Physical Evidence A & B',
        shown: [
          fact(`${pName(a)}: 3 ribs at distinct healing stages (calcified 3-week callus + acute fracture) and yellow-green trunk bruising — OLDER THAN ${pName(b)}'s injury.`, [a, b], { tag: 'mis', p: a }),
          fact(`${pName(b)}: Acute distal radius fracture with fresh red-purple palm edema.`, [b], { tag: 'ok', p: b }),
        ],
        alt: [
          fact(`${pName(a)}: Single fresh red-purple hip contusion with clean rib series.`, [a], { tag: 'ok', p: a }),
          fact(`${pName(b)}: Calcified 3-week posterior rib calluses and yellow-green scapular bruises — OLDER THAN ${pName(a)}'s contusion.`, [b, a], { tag: 'mis', p: b }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Stories B', wingIndex: 1, label: 'Claimed Accounts C–F',
        shown: [
          fact(`${pName(c)} reports bumping a plastic hamper tonight; ${pName(d)} reports dropping a heavy steel toolbox on the left foot 1h ago.`, [c, d], { tag: 'st_pair', ps: [c, d] }),
          fact(`${pName(e)} reports a bicycle fall 6 days ago (came in tonight for persistent ache); ${pName(f)} reports a car door on the thumb 1h ago.`, [e, f], { tag: 'st_pair', ps: [e, f] }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'X-Ray Clock B', wingIndex: 0, label: 'Physical Evidence C–F',
        shown: [
          fact(`${pName(c)}: High-energy transverse defensive ulna fracture with circumferential grip ecchymosis.`, [c], { tag: 'mis', p: c }),
          fact(`${pName(d)}: Fresh red crushed left hallux · ${pName(e)}: Yellow-green shoulder bruise · ${pName(f)}: Fresh subungual thumb hematoma.`, [d, e, f], { tag: 'ok_all', ps: [d, e, f] }),
        ],
        alt: [
          fact(`${pName(c)}: Superficial fresh shin abrasion · ${pName(e)}: Yellow-green shoulder bruise · ${pName(f)}: Fresh subungual thumb hematoma.`, [c, e, f], { tag: 'ok_all', ps: [c, e, f] }),
          fact(`${pName(d)}: Spiral humeral shaft fracture with yellow-green upper-arm grip marks.`, [d], { tag: 'mis', p: d }),
        ],
      }),
      makeCard({
        index: 5, time: '01:22', wing: 'Forensic Desk', wingIndex: 1, label: 'Compare Both Clocks',
        shown: [
          fact(`Yellow-green tissue contradicts a 20-minute story yet matches an honest 6-day account.`, [], { tag: 'rule' }),
          fact(`Flag ONLY bays where physical healing age or fracture mechanics cannot match the account.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Story Clock vs. Tissue Clock',
      dispatch: 'Compare claimed injury timelines and forces against physical healing stages across six bays.',
      order: 'Flag for Forensic Protection Review EVERY patient whose physical healing age or force CANNOT match their claimed story.',
      hint: 'Match story age/energy against biological tissue age — yellow-green bruises contradict "20 min ago" yet match "6 days ago".',
      bayDefaultLabel: 'Timeline Audit',
      cards,
      evaluate(activeCards) {
        const targets = uniqueSortedIds(factsByTag(activeCards, 'mis').map((x) => x.p));
        const rivals = [e, b, d, c, a].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Comparing claimed story age and impact energy against biological healing stages catches mismatches on ${formatList(targets)}, while ${pName(e)}'s yellow-green bruise matches their 6-day account.`,
          rival: buildRivalInfo(targets, rivals, (r) => `${pName(r)}'s biological bruise/X-ray age and impact mechanics match their claimed account cleanly.`),
        };
      },
    };
  },

  // #70 Perspectival reasoning (After · Composite)
  // 3-Way Alignment Intersection across 6 surgical consults: Patient Written Wish ∩ Family Voice ∩ Surgeon Lift (> 50%)
  'perspectival-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: '3-Voice Rule', wingIndex: 0, label: 'Unanimous Alignment Standard',
        shown: [
          fact(`Clear for immediate OR ONLY when ALL THREE perspectives align: Patient Written Directive = YES, Family Spokesperson = YES, AND Surgeon Recovery Odds > 50%.`, [], { tag: 'rule' }),
          fact(`Any 2-of-3 split holds for a structured joint ethics conference.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Voice 1 · Patient', wingIndex: 1, label: 'Signed Patient Directives',
        shown: [
          fact(`Signed directive = YES (operate if recovery likely): ${pName(a)}, ${pName(c)}, ${pName(d)}, and ${pName(e)}.`, [a, c, d, e], { tag: 'v1', ps: [a, c, d, e] }),
          fact(`Signed directive = NO (comfort care only): ${pName(b)} and ${pName(f)}.`, [b, f], { tag: 'no1', ps: [b, f] }),
        ],
        alt: [
          fact(`Signed directive = YES (operate if recovery likely): ${pName(b)}, ${pName(c)}, ${pName(d)}, and ${pName(e)}.`, [b, c, d, e], { tag: 'v1', ps: [b, c, d, e] }),
          fact(`Signed directive = NO (comfort care only): ${pName(a)} and ${pName(f)}.`, [a, f], { tag: 'no1', ps: [a, f] }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Voice 2 · Family', wingIndex: 0, label: 'Family Spokespersons',
        shown: [
          fact(`Family supports proceeding to OR: ${pName(a)}, ${pName(b)}, ${pName(c)}, and ${pName(d)}.`, [a, b, c, d], { tag: 'v2', ps: [a, b, c, d] }),
          fact(`Family requests pause for comfort discussion: ${pName(e)} and ${pName(f)}.`, [e, f], { tag: 'no2', ps: [e, f] }),
        ],
        alt: [
          fact(`Family supports proceeding to OR: ${pName(a)}, ${pName(b)}, ${pName(c)}, and ${pName(e)}.`, [a, b, c, e], { tag: 'v2', ps: [a, b, c, e] }),
          fact(`Family requests pause for comfort discussion: ${pName(d)} and ${pName(f)}.`, [d, f], { tag: 'no2', ps: [d, f] }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Voice 3 · Surgeon', wingIndex: 1, label: 'Surgeon Recovery Odds',
        shown: [
          fact(`Surgeon projects > 50% functional recovery: ${pName(a)} at 85%, ${pName(b)} at 80%, ${pName(d)} at 88%, and ${pName(e)} at 75%.`, [a, b, d, e], { tag: 'v3', ps: [a, b, d, e] }),
          fact(`Surgeon projects futile < 5% survival: ${pName(c)} at 2% and ${pName(f)} at 1%.`, [c, f], { tag: 'no3', ps: [c, f] }),
        ],
        alt: [
          fact(`Surgeon projects > 50% functional recovery: ${pName(a)} at 85%, ${pName(b)} at 80%, ${pName(c)} at 82%, and ${pName(d)} at 88%.`, [a, b, c, d], { tag: 'v3', ps: [a, b, c, d] }),
          fact(`Surgeon projects futile < 5% survival: ${pName(e)} at 3% and ${pName(f)} at 1%.`, [e, f], { tag: 'no3', ps: [e, f] }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: '3-Voice Rule', wingIndex: 0, label: 'Filter 2-of-3 Splits',
        shown: [
          fact(`Only bays appearing in Voice 1 ∩ Voice 2 ∩ Voice 3 clear without an ethics hold.`, [], { tag: 'rule' }),
          fact(`Hold any 2-of-3 split for a joint family conference.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Ethics Desk', wingIndex: 1, label: 'Clear Unanimous Bays',
        shown: [
          fact(`Intersect Patient Plan ∩ Family Voice ∩ Surgeon > 50% Odds.`, [], { tag: 'rule' }),
          fact(`Clear ONLY unanimous 3-of-3 bays for immediate surgery.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Three-Voice Alignment',
      dispatch: 'Intersect three independent perspectives (Patient Written Plan ∩ Family Voice ∩ Surgeon Odds) across six consults.',
      order: 'Clear for immediate surgery EVERY patient where Patient Plan, Family Voice, AND Surgeon Odds (> 50%) ALL agree.',
      hint: 'Find every patient listed as YES across all three Voice cards — hold 2-of-3 splits.',
      bayDefaultLabel: '3-Voice Sync',
      cards,
      evaluate(activeCards) {
        const v1 = new Set(factsByTag(activeCards, 'v1').flatMap((x) => x.ps));
        const v2 = new Set(factsByTag(activeCards, 'v2').flatMap((x) => x.ps));
        const v3 = new Set(factsByTag(activeCards, 'v3').flatMap((x) => x.ps));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => v1.has(id) && v2.has(id) && v3.has(id)));
        const rivals = [b, c, e, d, a].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Intersecting all 3 viewpoints (Patient Plan ∩ Family ∩ Surgeon > 50%) clears ${formatList(targets)} cleanly while holding 2-of-3 conflicts.`,
          rival: buildRivalInfo(targets, rivals, (r) => `${pName(r)} failed alignment on at least one of the three voices (patient wish, family agreement, or surgical odds).`),
        };
      },
    };
  },

  // =========================================================================
  // FAMILY 8: METACOGNITIVE & EPISTEMOLOGICAL REASONING (#71–#80)
  // =========================================================================

  // #71 Metacognitive reasoning (After · Meta)
  // Comparing 01:00 premature soft labels against 01:20 objective vitals relative to stable control F
  'metacognitive-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Bias Audit', wingIndex: 0, label: 'Early-Label vs. Reality Flip',
        shown: [
          fact(`Premature closure trap: early soft labels ("Anxiety / Intoxication / Stress / Virus") can mask silent physical collapse.`, [], { tag: 'rule' }),
          fact(`Rescue EVERY bay dismissed with a soft 01:00 label whose 01:20 objective exam falls WORSE THAN control ${pName(f)} (O2 98%, glucose 95, BP 120/76).`, [f], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: '01:00 Labels', wingIndex: 1, label: 'Premature Soft Tags',
        shown: [
          fact(`${pName(a)}: Dismissed as "Panic Attack" · ${pName(b)}: Dismissed as "Alcohol Intoxication."`, [a, b], { tag: 'soft', ps: [a, b] }),
          fact(`${pName(c)}: Dismissed as "Tension Headache" · ${pName(d)}: Dismissed as "Viral Stomach Bug."`, [c, d], { tag: 'soft', ps: [c, d] }),
        ],
      }),
      makeCard({
        index: 2, time: '01:14', wing: '01:20 Vitals', wingIndex: 0, label: 'Objective Exam A & B',
        shown: [
          fact(`${pName(a)}: O2 dropped to 81% — 17 points LOWER THAN ${pName(f)}'s 98% — with absent right-lung breath sounds.`, [a, f], { tag: 'crit', p: a }),
          fact(`${pName(b)}: Clear head CT, O2 99%, glucose 96 — matching ${pName(f)}'s stable baseline.`, [b, f], { tag: 'ok', p: b }),
        ],
        alt: [
          fact(`${pName(a)}: O2 99%, equal bilateral breath sounds, normal ECG — matching ${pName(f)}'s stable baseline.`, [a, f], { tag: 'ok', p: a }),
          fact(`${pName(b)}: Glucose crashed to 34 — LESS THAN HALF of ${pName(f)}'s 95 — with fresh occiput scalp bruise.`, [b, f], { tag: 'crit', p: b }),
        ],
      }),
      makeCard({
        index: 3, time: '01:18', wing: '01:20 Vitals', wingIndex: 0, label: 'Objective Exam C & D',
        shown: [
          fact(`${pName(c)}: Fixed dilated right pupil + acute left-arm hemiparesis — WORSE neuro exam than ${pName(d)} and ${pName(f)}.`, [c, d, f], { tag: 'crit', p: c }),
          fact(`${pName(d)}: Soft non-tender abdomen, BP 122/76, O2 99%, steady after oral rehydration.`, [d], { tag: 'ok', p: d }),
        ],
        alt: [
          fact(`${pName(c)}: Equal reactive pupils, full 5/5 strength, BP 118/74 — matching ${pName(f)}.`, [c, f], { tag: 'ok', p: c }),
          fact(`${pName(d)}: ST-elevation ECG + BP dropped to 82/48 — 38 mmHg LOWER THAN ${pName(f)}'s 120/76.`, [d, f], { tag: 'crit', p: d }),
        ],
      }),
      makeCard({
        index: 4, time: '01:21', wing: '01:00 Labels', wingIndex: 1, label: 'Control & OR Bays',
        shown: [
          fact(`${pName(e)}: Properly tagged RED #1 at 01:00 and ALREADY on the OR table for splenectomy.`, [e], { tag: 'already', p: e }),
          fact(`${pName(f)}: Stable control bay — O2 98%, glucose 95, BP 120/76, intact neuro exam.`, [f], { tag: 'ok', p: f }),
        ],
      }),
      makeCard({
        index: 5, time: '01:24', wing: 'Safety Pull', wingIndex: 1, label: 'Override Soft Labels',
        shown: [
          fact(`Intersect Soft 01:00 Label WITH Objective 01:20 Physical Crisis relative to ${pName(f)}.`, [f], { tag: 'note' }),
          fact(`Pull EVERY mislabeled collapsing bay out of the waiting zone immediately.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Overturning Premature Labels',
      dispatch: 'Compare 01:00 soft triage labels against 01:20 objective exams relative to control to catch premature closure.',
      order: 'Rescue EVERY patient dismissed with a soft 01:00 label whose 01:20 objective exam shows a physical crisis.',
      hint: 'Match the 4 Soft-Label bays against objective crashes relative to the stable control — skip already-in-OR bay.',
      bayDefaultLabel: 'Bias Re-Eval',
      cards,
      evaluate(activeCards) {
        const soft = new Set(factsByTag(activeCards, 'soft').flatMap((x) => x.ps));
        const crit = new Set(factsByTag(activeCards, 'crit').map((x) => x.p));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => soft.has(id) && crit.has(id)));
        const rivals = [b, d, e, c, a].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Comparing 01:00 soft labels against 01:20 objective exams exposes premature-closure misses on ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, rivals, (r) =>
            r === e ? `${pName(e)} was already tagged RED #1 and is in OR — not a dismissed soft-label miss.` : `${pName(r)}'s 01:20 objective vitals confirmed no hidden physical crisis.`
          ),
        };
      },
    };
  },

  // #72 Epistemic reasoning (Inside · Meta)
  // Separating verified clinical clearance from unexamined assumptions across relative crash speeds
  'epistemic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Proof Audit', wingIndex: 0, label: 'Absence of Evidence Rule',
        shown: [
          fact(`An empty chart or spilled tube proves NOTHING — absence of abnormal findings is not evidence of safety.`, [], { tag: 'rule' }),
          fact(`Pull to Trauma Bay 1 EVERY High-Force crash bay (> 45 mph or ejected) with ZERO verified physician exam or vitals.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Crash Speed', wingIndex: 1, label: 'Relative Impact Forces',
        shown: [
          fact(`${pName(a)} & ${pName(b)} shared a 65-mph rollover — FASTER impact than ${pName(e)}'s 55-mph T-bone; ${pName(c)} was ejected 15 ft off a motorcycle.`, [a, b, e, c], { tag: 'hi_f', ps: [a, b, c, e] }),
          fact(`${pName(d)} had a 5-mph parking bump and ${pName(f)} tripped on a curb — FAR LOWER force than ${pName(e)}.`, [d, f, e], { tag: 'lo_f', ps: [d, f] }),
        ],
      }),
      makeCard({
        index: 2, time: '01:12', wing: 'Proof Log A', wingIndex: 0, label: 'Verification Audit A & B',
        shown: [
          fact(`${pName(a)}: Triage note says "quiet in hall" — ZERO vitals logged, ZERO imaging, NEVER examined by a doctor.`, [a], { tag: 'unch', p: a }),
          fact(`${pName(b)}: Attending documented full primary survey, negative pan-CT, and q15m normal vitals.`, [b], { tag: 'ver', p: b }),
        ],
        alt: [
          fact(`${pName(a)}: Attending documented negative pan-CT, clean labs, and steady serial vitals.`, [a], { tag: 'ver', p: a }),
          fact(`${pName(b)}: Hemolyzed blood tube discarded + ZERO physician exam — marked "likely stable" at intake.`, [b], { tag: 'unch', p: b }),
        ],
      }),
      makeCard({
        index: 3, time: '01:16', wing: 'Proof Log B', wingIndex: 0, label: 'Verification Audit C & D',
        shown: [
          fact(`${pName(c)}: Electronic chart blank after Wi-Fi drop — ZERO vitals and ZERO physician exam recorded.`, [c], { tag: 'unch', p: c }),
          fact(`${pName(d)}: Still awaiting first nurse vitals and doctor exam — SAME unexamined chart status as ${pName(c)}.`, [d, c], { tag: 'unch', p: d }),
        ],
        alt: [
          fact(`${pName(c)}: Attending documented negative trauma CT and normal serial vitals.`, [c], { tag: 'ver', p: c }),
          fact(`${pName(d)}: Still awaiting first nurse vitals and doctor exam — ZERO exam recorded yet.`, [d], { tag: 'unch', p: d }),
        ],
      }),
      makeCard({
        index: 4, time: '01:20', wing: 'Proof Log C', wingIndex: 1, label: 'Verification Audit E & F',
        shown: [
          fact(`${pName(e)}: Attending documented negative chest/abdomen CT and steady vitals — SAME verified clearance as ${pName(b)}.`, [e, b], { tag: 'ver', p: e }),
          fact(`${pName(f)}: Attending documented clean orthopedic exam and normal vitals.`, [f], { tag: 'ver', p: f }),
        ],
        alt: [
          fact(`${pName(e)}: EMS radio dropped before handoff — ZERO vitals and ZERO physician exam recorded.`, [e], { tag: 'unch', p: e }),
          fact(`${pName(f)}: Attending documented clean orthopedic exam and normal vitals.`, [f], { tag: 'ver', p: f }),
        ],
      }),
      makeCard({
        index: 5, time: '01:23', wing: 'Trauma Bay 1', wingIndex: 1, label: 'Close Proof Gaps',
        shown: [
          fact(`Intersect High-Force Mechanism (> 45 mph or ejected) WITH Unexamined / Blank-Chart Status.`, [], { tag: 'rule' }),
          fact(`Pull EVERY high-force unexamined patient into Trauma Bay 1 immediately.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Proven Safe vs. Never Checked',
      dispatch: 'Intersect High-Force crash mechanisms (> 45 mph) with Unchecked blank charts — separate verified clearance from blind assumption.',
      order: 'Pull into Trauma Bay 1 EVERY High-Force crash patient (> 45 mph / ejected) who has ZERO verified exam or vitals.',
      hint: 'Intersect High-Force Mechanism with Unexamined / Spilled-Sample charts — low-force unchecked bays wait in fast-track.',
      bayDefaultLabel: 'Proof Audit',
      cards,
      evaluate(activeCards) {
        const hi = new Set(factsByTag(activeCards, 'hi_f').flatMap((x) => x.ps));
        const unch = new Set(factsByTag(activeCards, 'unch').map((x) => x.p));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => hi.has(id) && unch.has(id)));
        const rivals = [d, b, e, c, a].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Separating verified exams from blank assumptions flags ${formatList(targets)}: high-force crashes with zero verified exam/vitals.`,
          rival: buildRivalInfo(targets, rivals, (r) =>
            unch.has(r) ? `${pName(r)} is unchecked, but was a slow 5-mph parking bump, not a high-force crash.` : `${pName(r)} already received verified doctor exams and clean CT scans.`
          ),
        };
      },
    };
  },

  // #73 Reflective reasoning (After · Meta)
  // Closed-loop 15-min re-check audit at 01:00 with cross-bay timestamp chaining
  'reflective-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Loop Audit', wingIndex: 0, label: '15-Minute Re-Check Window',
        shown: [
          fact(`Current clock = 01:00. After ANY strong IV or spray drug, a follow-up check MUST occur WITHIN 15 min (Gap ≤ 15m).`, [], { tag: 'rule' }),
          fact(`Flag EVERY strong-drug bay whose gap (Re-Check − Drug Time, or 01:00 − Drug Time if unlogged) EXCEEDS 15 min.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:00', wing: 'Drug Clock', wingIndex: 1, label: 'Strong Meds Given (A–C)',
        shown: [
          fact(`${pName(a)}: Strong IV sedative at 00:20 — 5 min EARLIER THAN ${pName(b)}'s 00:25 reversal spray.`, [a, b], { tag: 'dg_pair', list: [{ p: a, t: 20, strong: true }, { p: b, t: 25, strong: true }] }),
          fact(`${pName(c)}: Vasopressor drip started at 00:35 — 10 min LATER THAN ${pName(b)}.`, [c, b], { tag: 'dg', p: c, t: 35, strong: true }),
        ],
      }),
      makeCard({
        index: 2, time: '01:00', wing: 'Drug Clock', wingIndex: 1, label: 'Meds Given (D–F)',
        shown: [
          fact(`${pName(d)}: Strong IV sedative at 00:50 — 20 min LATER THAN ${pName(e)}'s 00:30 rate-control drip.`, [d, e], { tag: 'dg_pair', list: [{ p: d, t: 50, strong: true }, { p: e, t: 30, strong: true }] }),
          fact(`${pName(f)}: Cold ankle ice pack only at 00:15 — zero medication administered.`, [f], { tag: 'dg', p: f, t: 15, strong: false }),
        ],
      }),
      makeCard({
        index: 3, time: '01:00', wing: 'Re-Check Log', wingIndex: 0, label: 'Follow-Up Timestamps (A–C)',
        shown: [
          fact(`${pName(a)}: Re-checked at 00:44 — 6 min LATER THAN ${pName(b)}'s 00:38 check.`, [a, b], { tag: 'rc_pair', list: [{ p: a, t: 44 }, { p: b, t: 38 }] }),
          fact(`${pName(c)}: No follow-up check logged yet at 01:00.`, [c], { tag: 'rc', p: c, t: 60 }),
        ],
        alt: [
          fact(`${pName(a)}: Re-checked at 00:33 — 15 min EARLIER THAN ${pName(b)}'s 00:48 check.`, [a, b], { tag: 'rc_pair', list: [{ p: a, t: 33 }, { p: b, t: 48 }] }),
          fact(`${pName(c)}: Re-checked at 00:48 — SAME time as ${pName(b)}.`, [c, b], { tag: 'rc', p: c, t: 48 }),
        ],
      }),
      makeCard({
        index: 4, time: '01:00', wing: 'Re-Check Log', wingIndex: 0, label: 'Follow-Up Timestamps (D–F)',
        shown: [
          fact(`${pName(d)}: No follow-up check logged yet at 01:00 — SAME unlogged status as ${pName(c)}.`, [d, c], { tag: 'rc', p: d, t: 60 }),
          fact(`${pName(e)}: Re-checked at 00:45 · ${pName(f)}: Routine skin check at 00:55.`, [e, f], { tag: 'rc_pair', list: [{ p: e, t: 45 }, { p: f, t: 55 }] }),
        ],
        alt: [
          fact(`${pName(d)}: No follow-up check logged yet at 01:00.`, [d], { tag: 'rc', p: d, t: 60 }),
          fact(`${pName(e)}: Re-checked at 00:52 · ${pName(f)}: Routine skin check at 00:55.`, [e, f], { tag: 'rc_pair', list: [{ p: e, t: 52 }, { p: f, t: 55 }] }),
        ],
      }),
      makeCard({
        index: 5, time: '01:00', wing: 'Audit Lead', wingIndex: 1, label: 'Compute Every Gap',
        shown: [
          fact(`Subtract Drug Time from Re-Check Time (or 01:00 if unlogged) for every STRONG-drug bay.`, [], { tag: 'rule' }),
          fact(`Flag EVERY strong-drug bay whose elapsed gap exceeded 15 minutes (> 15m).`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Closed-Loop 15-Min Audit',
      dispatch: 'Current time is 01:00 — subtract Drug Time from Re-Check Time (or 01:00) to catch strong-drug gaps > 15 minutes.',
      order: 'Flag EVERY strong-drug patient whose re-check gap (Re-Check − Drug Time, or 01:00 − Drug Time) EXCEEDED 15 minutes.',
      hint: 'Compute elapsed minutes for each strong-drug bay — check whether 00:50 → 01:00 or exact 15m checks breach > 15m.',
      bayDefaultLabel: '15-Min Loop',
      cards,
      evaluate(activeCards) {
        const drug = new Map();
        for (const x of factsByTag(activeCards, 'dg')) drug.set(x.p, { t: x.t, strong: x.strong });
        for (const x of factsByTag(activeCards, 'dg_pair')) for (const it of x.list) drug.set(it.p, { t: it.t, strong: it.strong });
        const rc = new Map();
        for (const x of factsByTag(activeCards, 'rc')) rc.set(x.p, x.t);
        for (const x of factsByTag(activeCards, 'rc_pair')) for (const it of x.list) rc.set(it.p, it.t);
        const targets = uniqueSortedIds(
          [a, b, c, d, e, f].filter((id) => {
            const dg = drug.get(id);
            const r = rc.get(id);
            return dg && dg.strong && r != null && (r - dg.t) > 15;
          })
        );
        const rivals = [d, e, b, c, a, f].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Subtracting Drug Time from Re-Check Time catches > 15-min loop breaches on ${formatList(targets)} (${targets.map((id) => `${pName(id)}: ${rc.get(id) - drug.get(id).t}m`).join(', ')}).`,
          rival: buildRivalInfo(targets, rivals, (r) => {
            const dg = drug.get(r);
            if (!dg || !dg.strong) return `${pName(r)} received only an ice pack (not a strong drug).`;
            return `${pName(r)}'s elapsed time is ${rc.get(r) - dg.t} minutes — still ≤ 15 minutes.`;
          }),
        };
      },
    };
  },

  // #74 Critical reasoning (After · Meta)
  // Dismantling the "Normal BP = Safe" fallacy via Shock Index (HR > Top BP) + abdominal rigidity
  'critical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Fallacy Audit', wingIndex: 0, label: 'The Normal-BP Fallacy',
        shown: [
          fact(`Intern claim: "All 6 young patients have BP ≥ 112, so ZERO internal bleeding!" — FALSE in compensated shock.`, [], { tag: 'rule' }),
          fact(`Shock-Index Rule: Whenever Heart Rate EXCEEDS Top BP (HR > Top BP) AND abdomen is rigid/guarding, hidden hemorrhage is active.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Vitals A', wingIndex: 1, label: 'HR vs. Top BP (A–C)',
        shown: [
          fact(`${pName(a)}: HR 136 · Top BP 114 — HIGHER HR than ${pName(b)}'s HR 82 · Top BP 118.`, [a, b], { tag: 'vi', list: [{ p: a, hr: 136, bp: 114 }, { p: b, hr: 82, bp: 118 }] }),
          fact(`${pName(c)}: HR 132 · Top BP 116 — LOWER Top BP than ${pName(b)}.`, [c, b], { tag: 'vi', list: [{ p: c, hr: 132, bp: 116 }] }),
        ],
        alt: [
          fact(`${pName(a)}: HR 80 · Top BP 122 — LOWER HR than ${pName(b)}'s HR 140 · Top BP 112.`, [a, b], { tag: 'vi', list: [{ p: a, hr: 80, bp: 122 }, { p: b, hr: 140, bp: 112 }] }),
          fact(`${pName(c)}: HR 110 · Top BP 120 — HIGHER Top BP than ${pName(b)}.`, [c, b], { tag: 'vi', list: [{ p: c, hr: 110, bp: 120 }] }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Vitals B', wingIndex: 1, label: 'HR vs. Top BP (D–F)',
        shown: [
          fact(`${pName(d)}: HR 130 · Top BP 120 — HIGHER HR than ${pName(e)}'s HR 116 · Top BP 118.`, [d, e], { tag: 'vi', list: [{ p: d, hr: 130, bp: 120 }, { p: e, hr: 116, bp: 118 }] }),
          fact(`${pName(f)}: HR 88 · Top BP 124 — HIGHEST Top BP on the board.`, [f], { tag: 'vi', list: [{ p: f, hr: 88, bp: 124 }] }),
        ],
        alt: [
          fact(`${pName(d)}: HR 138 · Top BP 114 — HIGHER HR than ${pName(e)}'s HR 116 · Top BP 118.`, [d, e], { tag: 'vi', list: [{ p: d, hr: 138, bp: 114 }, { p: e, hr: 116, bp: 118 }] }),
          fact(`${pName(f)}: HR 88 · Top BP 124 — HIGHEST Top BP on the board.`, [f], { tag: 'vi', list: [{ p: f, hr: 88, bp: 124 }] }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Belly Exam', wingIndex: 0, label: 'Abdominal Exam (A–C)',
        shown: [
          fact(`${pName(a)}: Board-rigid tender abdomen after handlebar strike · ${pName(b)}: Soft non-tender abdomen.`, [a, b], { tag: 'rig', p: a }),
          fact(`${pName(c)}: Rigid involuntary guarding after ski impact — SAME peritoneal sign as ${pName(a)}.`, [c, a], { tag: 'rig', p: c }),
        ],
        alt: [
          fact(`${pName(a)}: Soft non-tender abdomen · ${pName(b)}: Board-rigid abdomen with seatbelt ecchymosis.`, [a, b], { tag: 'rig', p: b }),
          fact(`${pName(c)}: Soft non-tender abdomen — SAME benign belly exam as ${pName(a)}.`, [c, a], { tag: 'soft_b', p: c }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Belly Exam', wingIndex: 0, label: 'Abdominal Exam (D–F)',
        shown: [
          fact(`${pName(d)}: Soft non-tender abdomen on deep palpation — SAME benign exam as ${pName(f)}.`, [d, f], { tag: 'soft_b', p: d }),
          fact(`${pName(e)}: Rigid bruised abdomen after steering-wheel hit · ${pName(f)}: Soft non-tender abdomen.`, [e, f], { tag: 'rig', p: e }),
        ],
        alt: [
          fact(`${pName(d)}: Board-rigid distended abdomen after dashboard impact — SAME peritoneal sign as ${pName(e)}.`, [d, e], { tag: 'rig', p: d }),
          fact(`${pName(e)}: Rigid bruised abdomen after steering-wheel hit · ${pName(f)}: Soft non-tender abdomen.`, [e, f], { tag: 'rig', p: e }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Trauma Scan', wingIndex: 1, label: 'Scan Masked Bleeders',
        shown: [
          fact(`Require BOTH halves: Heart Rate strictly HIGHER THAN Top BP AND rigid abdomen.`, [], { tag: 'rule' }),
          fact(`STAT-scan EVERY bay meeting both shock-index conditions.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Exposing the Normal-BP Fallacy',
      dispatch: 'All six young bays show BP ≥ 112 — compare Heart Rate vs. Top BP (HR > BP) AND abdominal rigidity to unmask hidden bleeds.',
      order: 'STAT-scan EVERY patient whose Heart Rate is STRICTLY HIGHER THAN Top BP (HR > BP) AND whose abdomen is rigid.',
      hint: 'Check BOTH (Heart Rate > Top BP) AND Rigid Abdomen — watch out for soft-abdomen fast pulse and HR < BP decoys.',
      bayDefaultLabel: 'Shock Index',
      cards,
      evaluate(activeCards) {
        const flipped = new Set();
        for (const x of factsByTag(activeCards, 'vi')) {
          for (const it of x.list) if (it.hr > it.bp) flipped.add(it.p);
        }
        const rigid = new Set(factsByTag(activeCards, 'rig').map((x) => x.p));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => flipped.has(id) && rigid.has(id)));
        const rivals = [d, e, b, c, a].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Exposing the "normal BP = safe" fallacy via Shock Index (HR > Top BP) ∩ Rigid Abdomen catches hidden bleeding in ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, rivals, (r) =>
            flipped.has(r) ? `${pName(r)} has HR > Top BP, but their abdomen is completely soft.` : `${pName(r)}'s Heart Rate stays BELOW their Top BP.`
          ),
        };
      },
    };
  },

  // #75 Falsification-based reasoning (Inside · Meta)
  // Testing the universal Obs claim against Safe Anchor F (O2 ≥ 94%, BP ≥ 100, Awake) by hunting counterexamples
  'falsification-based': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Obs Claim', wingIndex: 0, label: 'Universal Claim vs. Anchor',
        shown: [
          fact(`Night handoff claim: "EVERY Obs bay meets Anchor ${pName(f)}'s 3 bounds: O2 ≥ 94%, Top BP ≥ 100, Wide Awake."`, [f], { tag: 'rule' }),
          fact(`Hunt for EVERY counterexample breaking AT LEAST ONE of those 3 bounds.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'O2 & BP Wall', wingIndex: 1, label: 'Monitors A & B vs. Anchor',
        shown: [
          fact(`${pName(a)}: O2 84% · BP 118/74 — 14% LOWER O2 than ${pName(b)}'s 98% · BP 122/78.`, [a, b], { tag: 'ob_pair', list: [{ p: a, o2: 84, bp: 118 }, { p: b, o2: 98, bp: 122 }] }),
          fact(`${pName(b)}'s BP (122) is HIGHER THAN Anchor ${pName(f)}'s 120.`, [b, f], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(a)}: O2 97% · BP 120/76 — 34 mmHg HIGHER BP than ${pName(b)}'s 86/52 (O2 96%).`, [a, b], { tag: 'ob_pair', list: [{ p: a, o2: 97, bp: 120 }, { p: b, o2: 96, bp: 86 }] }),
          fact(`${pName(b)}'s O2 stays HIGHER THAN ${pName(d)}'s 94%.`, [b, d], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'O2 & BP Wall', wingIndex: 1, label: 'Monitors C–F',
        shown: [
          fact(`${pName(c)}: O2 96% · BP 114/70 · ${pName(d)}: O2 94% · BP 100/66 — LOWER THAN ${pName(e)} yet on the boundary.`, [c, d, e], { tag: 'ob_pair', list: [{ p: c, o2: 96, bp: 114 }, { p: d, o2: 94, bp: 100 }] }),
          fact(`${pName(e)}: O2 97% · BP 116/72 · Anchor ${pName(f)}: O2 98% · BP 120/76.`, [e, f], { tag: 'ob_pair', list: [{ p: e, o2: 97, bp: 116 }, { p: f, o2: 98, bp: 120 }] }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Nurse Rounds', wingIndex: 0, label: 'Alertness Audit (A–C)',
        shown: [
          fact(`${pName(c)}: Unresponsive to loud voice or sternal rub — WORSE alertness than ${pName(a)} & ${pName(b)}.`, [c, a, b], { tag: 'unaw', p: c }),
          fact(`${pName(a)} & ${pName(b)}: Both wide awake answering orientation questions.`, [a, b], { tag: 'aw', ps: [a, b] }),
        ],
        alt: [
          fact(`${pName(c)}: Wide awake drinking water · ${pName(a)} & ${pName(b)}: Wide awake.`, [c, a, b], { tag: 'aw', ps: [c, a, b] }),
          fact(`${pName(e)}: Suddenly limp and unresponsive to sternal rub — WORSE alertness than ${pName(d)}.`, [e, d], { tag: 'unaw', p: e }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Nurse Rounds', wingIndex: 0, label: 'Alertness Audit (D–F)',
        shown: [
          fact(`${pName(d)}: Wide awake chatting with nurse · ${pName(e)}: Wide awake alert.`, [d, e], { tag: 'aw', ps: [d, e] }),
          fact(`${pName(f)}: Wide awake — matches all three reference thresholds.`, [f], { tag: 'aw', ps: [f] }),
        ],
        alt: [
          fact(`${pName(d)}: Wide awake chatting with nurse · ${pName(f)}: Wide awake reference anchor.`, [d, f], { tag: 'aw', ps: [d, f] }),
          fact(`Compare both Monitor cards AND both Alertness cards for any broken bound.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Obs Rescue', wingIndex: 1, label: 'Pull Counterexamples',
        shown: [
          fact(`A single broken bound falsifies "everyone can wait" — check O2 (< 94%), BP (< 100), AND Alertness.`, [], { tag: 'rule' }),
          fact(`Pull EVERY Obs bay breaking ANY of the 3 bounds right now.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Disproving "Everyone Can Wait"',
      dispatch: 'Test the universal Obs-Wing claim across all six bays — catch every counterexample breaking O2, BP, or Alertness.',
      order: 'Pull out EVERY Observation patient who breaks O2 ≥ 94%, Top BP ≥ 100, OR Wide-Awake alertness.',
      hint: 'Check all 3 bounds across Monitor cards and Alertness cards — exact 94% and 100 pass.',
      bayDefaultLabel: 'Obs Bounds',
      cards,
      evaluate(activeCards) {
        const obs = new Map();
        for (const x of factsByTag(activeCards, 'ob')) obs.set(x.p, x);
        for (const x of factsByTag(activeCards, 'ob_pair')) for (const it of x.list) obs.set(it.p, it);
        const unaw = new Set(factsByTag(activeCards, 'unaw').map((x) => x.p));
        const targets = uniqueSortedIds(
          [a, b, c, d, e, f].filter((id) => {
            const v = obs.get(id);
            return (v && (v.o2 < 94 || v.bp < 100)) || unaw.has(id);
          })
        );
        const rivals = [d, b, e, f, a, c].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Testing all 3 bounds disproves "everyone can wait" via counterexamples ${formatList(targets)} (O2 < 94%, BP < 100, or unresponsive).`,
          rival: buildRivalInfo(targets, rivals, (r) => `${pName(r)} meets all 3 bounds (O2 ≥ 94%, BP ≥ 100, wide awake), including boundary cases at 94% / 100.`),
        };
      },
    };
  },

  // #76 Heuristic reasoning (Before · Meta)
  // Fast flu heuristic + fatal meningitis/sepsis exception boundary (Nuchal Rigidity OR Non-Blanching Petechiae)
  'heuristic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Fast-Track', wingIndex: 0, label: 'Shortcut & Fatal Exceptions',
        shown: [
          fact(`Winter shortcut: "Fever ≥ 38.5°C + Myalgias → Routine Flu." All 6 bays below meet that heuristic.`, [], { tag: 'rule' }),
          fact(`FATAL EXCEPTION: Pull out of the flu line ANYONE with rock-stiff neck rigidity OR purple spots that STAY DARK under glass press.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Fever Queue', wingIndex: 1, label: 'Thermometer Ranking',
        shown: [
          fact(`${pName(b)} (40.1°C) and ${pName(e)} (39.9°C) run HIGHER fevers than ${pName(a)} (38.8°C) and ${pName(c)} (38.7°C).`, [b, e, a, c], { tag: 'temp' }),
          fact(`${pName(d)} (39.2°C) runs HIGHER than ${pName(f)} (38.9°C) — verify physical exception exams below.`, [d, f], { tag: 'temp' }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Exception Exam', wingIndex: 0, label: 'Neck & Glass Test A & B',
        shown: [
          fact(`${pName(a)}: Rock-stiff neck (cannot flex chin to chest) + severe photophobia — WORSE meningeal sign than ${pName(b)}.`, [a, b], { tag: 'exc', p: a }),
          fact(`${pName(b)}: Flexible supple neck + pink macular rash that BLANCHES WHITE under glass press.`, [b], { tag: 'flu', p: b }),
        ],
        alt: [
          fact(`${pName(a)}: Flexible supple neck + clear skin — SAME benign exam as ${pName(e)}.`, [a, e], { tag: 'flu', p: a }),
          fact(`${pName(b)}: Spreading purple ankle petechiae that STAY DARK under glass press.`, [b], { tag: 'exc', p: b }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Exception Exam', wingIndex: 0, label: 'Neck & Glass Test C & D',
        shown: [
          fact(`${pName(c)}: Dark purple shin petechiae that STAY DARK under glass press — OPPOSITE OF ${pName(b)}'s blanching rash.`, [c, b], { tag: 'exc', p: c }),
          fact(`${pName(d)}: Sore throat muscles yet full chin-to-chest neck flexion + clear skin.`, [d], { tag: 'flu', p: d }),
        ],
        alt: [
          fact(`${pName(c)}: Flexible neck + pink hives that BLANCH WHITE under glass press.`, [c], { tag: 'flu', p: c }),
          fact(`${pName(d)}: Rock-stiff neck with zero chin-to-chest flexion + acute confusion.`, [d], { tag: 'exc', p: d }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Exception Exam', wingIndex: 0, label: 'Neck & Glass Test E & F',
        shown: [
          fact(`${pName(e)}: Flexible neck + clear skin with rigors — SAME supple exam as ${pName(f)}.`, [e, f], { tag: 'flu', p: e }),
          fact(`${pName(f)}: Flexible neck + faint heat rash that BLANCHES WHITE under glass press.`, [f], { tag: 'flu', p: f }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Sepsis Bay', wingIndex: 1, label: 'Override Flu Shortcut',
        shown: [
          fact(`Look past raw thermometer height and blanching pink rashes — hunt strictly for Stiff Neck OR Non-Blanching Purple Spots.`, [], { tag: 'rule' }),
          fact(`Pull EVERY fatal-exception bay straight into IV antibiotics now.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'When the Flu Shortcut Kills',
      dispatch: 'All six bays have high fever — look past the highest thermometer numbers to catch stiff-neck and non-blanching purple-spot exceptions.',
      order: 'Pull out of the flu line EVERY fever patient with a rock-stiff neck OR purple spots that STAY DARK under glass.',
      hint: 'Raw fever height (40.1°C) and white-blanching rashes fit flu — catch stiff necks and non-blanching dark spots.',
      bayDefaultLabel: 'Fever Audit',
      cards,
      evaluate(activeCards) {
        const targets = uniqueSortedIds(factsByTag(activeCards, 'exc').map((x) => x.p));
        const rivals = [b, e, d, f, a, c].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Overriding the "fever = flu" rule-of-thumb catches meningitis/sepsis exceptions on ${formatList(targets)}, ignoring higher-temp routine flu bays.`,
          rival: buildRivalInfo(targets, rivals, (r) => `${pName(r)} has a flexible neck and either clear skin or a blanching rash — fitting routine flu care despite high fever.`),
        };
      },
    };
  },

  // #77 Non-monotonic reasoning (Inside · Meta)
  // Full priority-order inversion: 01:00 ranking overturned by 01:18–01:20 STAT CT/Ultrasound scans
  'non-monotonic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: '01:00 Board', wingIndex: 0, label: 'Initial 01:00 Ranking',
        shown: [
          fact(`01:00 Initial Rank: ${pName(a)} (#1) > ${pName(b)} (#2) > ${pName(e)} (#3) > ${pName(f)} (#4) > ${pName(c)} (#5) > ${pName(d)} (#6).`, [a, b, e, f, c, d], { tag: 'old' }),
          fact(`Defeasible Rule: Whenever 01:18–01:20 STAT scans overturn the 01:00 ranking, RETRACT old alerts and act strictly on 01:18+ findings.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:15', wing: '01:18 Scans', wingIndex: 1, label: 'STAT Update A & B',
        shown: [
          fact(`01:18 CT: ${pName(a)} is negative for hemorrhage — BP rebounded to 124/78.`, [a], { tag: 'clr', p: a }),
          fact(`01:18 CT: ${pName(b)} is negative — abdominal wall strain only, BP 122/76 — SAME clean result as ${pName(a)}.`, [b, a], { tag: 'clr', p: b }),
        ],
        alt: [
          fact(`01:18 CT: ${pName(a)} confirms Grade IV splenic laceration with active bleed — BP 76/44, WORSE THAN ${pName(b)}.`, [a, b], { tag: 'urg', p: a }),
          fact(`01:18 CT: ${pName(b)} is negative — abdominal wall strain only, BP 122/76.`, [b], { tag: 'clr', p: b }),
        ],
      }),
      makeCard({
        index: 2, time: '01:18', wing: '01:18 Scans', wingIndex: 1, label: 'STAT Update C & D',
        shown: [
          fact(`01:18 Head CT: ${pName(c)} shows expanding skull-lining brain bleed — NOW OUTRANKS cleared ${pName(a)} & ${pName(b)}.`, [c, a, b], { tag: 'urg', p: c }),
          fact(`01:18 Scan: ${pName(d)} remains negative — steady BP 120/76.`, [d], { tag: 'clr', p: d }),
        ],
        alt: [
          fact(`01:18 Head CT: ${pName(c)} remains negative — normal BP 120/76.`, [c], { tag: 'clr', p: c }),
          fact(`01:18 Chest CT: ${pName(d)} shows massive hemothorax filling the right chest — NOW OUTRANKS ${pName(b)} & ${pName(c)}.`, [d, b, c], { tag: 'urg', p: d }),
        ],
      }),
      makeCard({
        index: 3, time: '01:20', wing: '01:18 Scans', wingIndex: 1, label: 'STAT Update E & F',
        shown: [
          fact(`01:20 Scan: ${pName(e)} is negative — pain resolved, BP 122/76.`, [e], { tag: 'clr', p: e }),
          fact(`01:20 Ultrasound: ${pName(f)} shows active pelvic arterial bleed — BP 78/46, WORSE THAN ${pName(e)}.`, [f, e], { tag: 'urg', p: f }),
        ],
        alt: [
          fact(`01:20 Scan: ${pName(e)} is negative — BP 122/76.`, [e], { tag: 'clr', p: e }),
          fact(`01:20 Scan: ${pName(f)} is negative — BP 120/78 — SAME clean result as ${pName(e)}.`, [f, e], { tag: 'clr', p: f }),
        ],
      }),
      makeCard({
        index: 4, time: '01:22', wing: '01:22 Vitals', wingIndex: 0, label: 'Retract Outdated Ranks',
        shown: [
          fact(`01:18–01:20 STAT scans completely supersede the 01:00 intake board.`, [], { tag: 'rule' }),
          fact(`Check ALL SIX 01:18–01:20 scan updates before booking OR tables.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:24', wing: 'OR Charge', wingIndex: 1, label: 'Roll Updated Bleeds',
        shown: [
          fact(`Send to Emergency OR EVERY patient confirmed actively bleeding on the LATEST 01:18–01:20 scans.`, [], { tag: 'rule' }),
          fact(`Cancel OR holds on all newly cleared bays.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'STAT Scan Board Reversal',
      dispatch: 'New 01:18–01:20 STAT scans overturned the 01:00 priority board — retract old alerts and act strictly on updated scans.',
      order: 'Send to Emergency OR EVERY patient confirmed actively bleeding on the LATEST 01:18–01:20 STAT scans.',
      hint: 'Retract the outdated 01:00 ranking — follow ONLY the 01:18–01:20 STAT scan confirmations.',
      bayDefaultLabel: 'Scan Update',
      cards,
      evaluate(activeCards) {
        const targets = uniqueSortedIds(factsByTag(activeCards, 'urg').map((x) => x.p));
        const rivals = [a, b, e, c, d, f].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Retracting the outdated 01:00 priority ranks in light of the 01:18–01:20 STAT scans shifts OR priority strictly to ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, rivals, (r) => `${pName(r)} was cleared negative on the latest 01:18–01:20 scan despite earlier 01:00 suspicion.`),
        };
      },
    };
  },

  // #78 Ontological reasoning (Before · Meta)
  // Sorting 6 urgent pages by fundamental kind: Mechanical Structural Tear/Block vs. Metabolic/Chemical vs. Legal/Administrative
  'ontological-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Crisis Kinds', wingIndex: 0, label: 'Three Ontological Kinds',
        shown: [
          fact(`Sort by fundamental KIND, not urgency volume: Mechanical Tear/Block → Trauma Surgeon · Blood Chemistry/Overdose → Medicine Drip · Legal Dispute → Ethics.`, [], { tag: 'rule' }),
          fact(`A scalpel cannot fix serum potassium or proxy disputes — page Surgery ONLY for Mechanical Structural Tears or Blocks.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Pages A', wingIndex: 1, label: 'Urgent Pages A & B',
        shown: [
          fact(`${pName(a)}: Glass transected the femoral artery — bright pulsatile hemorrhage, DIFFERENT crisis kind from ${pName(b)}.`, [a, b], { tag: 'k', p: a, kind: 'mech' }),
          fact(`${pName(b)}: Missed insulin 3 days — glucose 640, severe blood-acid crisis, deep rapid gasping.`, [b], { tag: 'k', p: b, kind: 'chem' }),
        ],
        alt: [
          fact(`${pName(a)}: Ingested 30 beta-blocker tablets — dangerously slow 32 BPM pulse needing antidote drip, zero wounds.`, [a], { tag: 'k', p: a, kind: 'chem' }),
          fact(`${pName(b)}: Rebar penetrated right thorax — open chest air-trap collapsing lung, DIFFERENT kind from ${pName(a)}.`, [b, a], { tag: 'k', p: b, kind: 'mech' }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Pages B', wingIndex: 1, label: 'Urgent Pages C & D',
        shown: [
          fact(`${pName(c)}: Two siblings contesting healthcare power-of-attorney authority — SAME non-physical category as ${pName(f)}.`, [c, f], { tag: 'k', p: c, kind: 'legal' }),
          fact(`${pName(d)}: Crushed tracheal cartilage physically obstructing airflow — SAME structural kind as ${pName(a)}.`, [d, a], { tag: 'k', p: d, kind: 'mech' }),
        ],
        alt: [
          fact(`${pName(c)}: Shattered splenic capsule bleeding into abdomen after 12-ft fall — SAME structural kind as ${pName(b)}.`, [c, b], { tag: 'k', p: c, kind: 'mech' }),
          fact(`${pName(d)}: Serum glucose plunged to 28 with seizures — SAME blood-chemistry kind as ${pName(a)}.`, [d, a], { tag: 'k', p: d, kind: 'chem' }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Pages C', wingIndex: 0, label: 'Urgent Pages E & F',
        shown: [
          fact(`${pName(e)}: Serum potassium 7.8 widening QRS waves — needs IV calcium + insulin, SAME metabolic kind as ${pName(b)}.`, [e, b], { tag: 'k', p: e, kind: 'chem' }),
          fact(`${pName(f)}: Out-of-network payer denial stalling rehab transfer — family demanding chief medical officer.`, [f], { tag: 'k', p: f, kind: 'legal' }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Crisis Kinds', wingIndex: 0, label: 'Urgent ≠ Surgical',
        shown: [
          fact(`Metabolic/chemical crashes can be just as fatal as arterial bleeds, yet belong to Medicine/Tox drips rather than the OR.`, [], { tag: 'rule' }),
          fact(`Route ONLY physical structural tears or mechanical obstructions to Trauma Surgery.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Surgery Page', wingIndex: 1, label: 'Route Mechanical Only',
        shown: [
          fact(`Classify all six urgent pages into Mechanical vs. Chemical vs. Legal.`, [], { tag: 'rule' }),
          fact(`Page the Trauma Surgeon ONLY for Physical Mechanical Tears or Blocks.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Sorting the Kind of Crisis',
      dispatch: 'Six urgent pages hit at once — separate Physical Mechanical Tears/Blocks from Blood Chemistry and Legal Disputes.',
      order: 'Page the Trauma Surgeon ONLY for patients suffering a Physical Mechanical Tear or Block.',
      hint: 'Separate physical structural tears/blocks from chemical/glucose/potassium emergencies and legal/proxy disputes.',
      bayDefaultLabel: 'Crisis Kind',
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'k');
        const targets = uniqueSortedIds(list.filter((x) => x.kind === 'mech').map((x) => x.p));
        const rivals = list.filter((x) => x.kind !== 'mech').map((x) => x.p);
        return {
          targets,
          proof: `Categorizing by fundamental crisis kind routes ONLY physical mechanical tears/blocks (${formatList(targets)}) to Surgery.`,
          rival: buildRivalInfo(targets, rivals, (r) => {
            const x = list.find((item) => item.p === r);
            return x.kind === 'chem' ? `${pName(r)} has an urgent blood-chemistry/overdose crisis (Medicine drip, not scalpel).` : `${pName(r)}'s issue is a legal/administrative dispute (Ethics/Social Work, not Surgery).`;
          }),
        };
      },
    };
  },

  // #79 Analogical abstraction (After · Meta)
  // Cross-organ rigid-shell compartment invariant + perfusion gap (Diastolic BP − Compartment Pressure < 30 mmHg)
  'analogical-abstraction': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Deep Pattern', wingIndex: 0, label: 'Cross-Organ Invariant',
        shown: [
          fact(`Case 1 (Skull): Bleed inside rigid cranium crushes brain flow. Case 2 (Pericardium): Fluid inside tough heart sac crushes cardiac fill.`, [], { tag: 'rule' }),
          fact(`Invariant Law: Swelling trapped inside a RIGID UNSTRETCHABLE SHELL cuts off perfusion (Diastolic BP − Shell Pressure < 30 mmHg) → urgent surgical release.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'New Organs A', wingIndex: 1, label: 'Compartments A & B',
        shown: [
          fact(`${pName(a)}: Tibial fascia rock-hard at 52 mmHg (Diastolic BP 74 mmHg) — HIGHER pressure than ${pName(b)}'s soft arm; foot cold, pulseless.`, [a, b], { tag: 'box', p: a, trap: true }),
          fact(`${pName(b)}: Diffuse allergic urticaria across both arms — loose pliable skin, pressure 8 mmHg, strong radial pulses.`, [b], { tag: 'box', p: b, trap: false }),
        ],
        alt: [
          fact(`${pName(a)}: Superficial shin hematoma — soft pliable tissue, pressure 10 mmHg, warm foot with strong pulse.`, [a], { tag: 'box', p: a, trap: false }),
          fact(`${pName(b)}: Forearm swollen rock-hard inside circular plaster cast at 50 mmHg (Diastolic BP 72 mmHg) — HIGHER than ${pName(a)}; fingers pale, numb.`, [b, a], { tag: 'box', p: b, trap: true }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'New Organs B', wingIndex: 1, label: 'Compartments C & D',
        shown: [
          fact(`${pName(c)}: Circumferential leathery burn eschar locking wrist at 56 mmHg (Diastolic BP 76 mmHg) — SAME rigid-shell cutoff as ${pName(a)}; zero Doppler flow.`, [c, a], { tag: 'box', p: c, trap: true }),
          fact(`${pName(d)}: Dependent bilateral ankle edema — soft pitting tissue, pressure 9 mmHg, warm toes and strong pulses.`, [d], { tag: 'box', p: d, trap: false }),
        ],
        alt: [
          fact(`${pName(c)}: Superficial shoulder sunburn — soft elastic skin, normal capillary refill and strong pulses.`, [c], { tag: 'box', p: c, trap: false }),
          fact(`${pName(d)}: Retrobulbar hemorrhage trapped behind rigid bony orbit at 54 mmHg (Diastolic BP 76 mmHg) — SAME rigid-shell cutoff as ${pName(b)}; proptosis + fading vision.`, [d, b], { tag: 'box', p: d, trap: true }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'New Organs C', wingIndex: 0, label: 'Lookalikes E & F',
        shown: [
          fact(`${pName(e)}: Swollen knee effusion — soft fluctuant joint, pressure 12 mmHg (Diastolic 78), warm foot with strong pulse.`, [e], { tag: 'box', p: e, trap: false }),
          fact(`${pName(f)}: Dramatic bee-sting lip angioedema — loose soft tissue, patent airway, LOWER compartment pressure than any rigid shell.`, [f, e], { tag: 'box', p: f, trap: false }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Deep Pattern', wingIndex: 0, label: 'Rigid Shell + Perfusion Cutoff',
        shown: [
          fact(`All six bays look visibly swollen — ignore pliable soft-tissue swelling with normal pulses and perfusion gap ≥ 30.`, [], { tag: 'rule' }),
          fact(`Transfer the skull/pericardium invariant: Rigid unstretchable shell + rock-hard pressure (gap < 30) + lost downstream flow.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Release OR', wingIndex: 1, label: 'Decompress Now',
        shown: [
          fact(`Apply the rigid-shell perfusion invariant across limb fascia, casts, circumferential burn eschar, and bony orbit.`, [], { tag: 'rule' }),
          fact(`Perform emergency surgical release for EVERY bay trapped in a rigid shell cutting off blood flow.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'One Deep Law Across Organs',
      dispatch: 'Extract the rigid-shell compartment law (Skull / Pericardium → perfusion gap < 30 mmHg) and spot it across six swollen bays.',
      order: 'Release pressure immediately for EVERY patient whose swelling is trapped in a rigid shell cutting off perfusion.',
      hint: 'Separate rigid-shell perfusion traps (fascia, cast, burn eschar, bony orbit with gap < 30) from soft pliable swelling.',
      bayDefaultLabel: 'Pressure Trap',
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'box');
        const targets = uniqueSortedIds(list.filter((x) => x.trap).map((x) => x.p));
        const rivals = list.filter((x) => !x.trap).map((x) => x.p);
        return {
          targets,
          proof: `Transferring the "swelling in a rigid unstretchable shell crushes perfusion" invariant isolates ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, rivals, (r) => `${pName(r)} has soft, pliable surface swelling with intact perfusion and strong pulses.`),
        };
      },
    };
  },

  // #80 Integrative reasoning (Inside · Meta — Grand Capstone!)
  // Synthesizes 01:15 Scan Update (overturning 01:00 guess) ∩ Shock (BP < 90 OR HR > Top BP) ∩ Full Code
  'integrative-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Trauma Chief', wingIndex: 0, label: '3-Gate Chief Protocol',
        shown: [
          fact(`Roll to OR ONLY if ALL 3 gates pass: Gate 1 = 01:15 STAT Scan POSITIVE (overriding 01:00 guess) · Gate 2 = Shock (BP < 90 OR HR > Top BP) · Gate 3 = Verified Full Code.`, [], { tag: 'rule' }),
          fact(`Retract cleared 01:00 guesses, catch compensated shock (HR > Top BP), and honor verified Comfort-Only DNRs.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: '01:00 Intake', wingIndex: 1, label: 'Outdated 01:00 Guesses',
        shown: [
          fact(`01:00 Early Estimate: ${pName(b)} looked HIGHER risk (70%) than ${pName(a)} (40%) and ${pName(e)} (35%).`, [b, a, e], { tag: 'old' }),
          fact(`Wait for 01:15 STAT Scans below — verified imaging supersedes early risk estimates.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 2, time: '01:15', wing: 'STAT Scans', wingIndex: 0, label: 'Gate 1: 01:15 Scan Results',
        shown: [
          fact(`POSITIVE internal hemorrhage: ${pName(a)}, ${pName(c)}, ${pName(d)}, and ${pName(e)}.`, [a, c, d, e], { tag: 'pos', ps: [a, c, d, e] }),
          fact(`NEGATIVE for internal hemorrhage: ${pName(b)} and ${pName(f)}.`, [b, f], { tag: 'neg', ps: [b, f] }),
        ],
        alt: [
          fact(`POSITIVE internal hemorrhage: ${pName(b)}, ${pName(c)}, ${pName(d)}, and ${pName(e)}.`, [b, c, d, e], { tag: 'pos', ps: [b, c, d, e] }),
          fact(`NEGATIVE for internal hemorrhage: ${pName(a)} and ${pName(f)}.`, [a, f], { tag: 'neg', ps: [a, f] }),
        ],
      }),
      makeCard({
        index: 3, time: '01:20', wing: 'Live Monitors', wingIndex: 1, label: 'Gate 2: BP & Heart Rate',
        shown: [
          fact(`${pName(a)}: BP 80/46, HR 134 · ${pName(b)}: BP 122/78, HR 78 · ${pName(c)}: BP 82/48, HR 136.`, [a, b, c], { tag: 'vit', list: [{ p: a, bp: 80, hr: 134 }, { p: b, bp: 122, hr: 78 }, { p: c, bp: 82, hr: 136 }] }),
          fact(`${pName(d)}: BP 118/76, HR 134 — HIGHER HR than ${pName(e)}'s BP 120/76, HR 84 · ${pName(f)}: BP 84/50, HR 128.`, [d, e, f], { tag: 'vit', list: [{ p: d, bp: 118, hr: 134 }, { p: e, bp: 120, hr: 84 }, { p: f, bp: 84, hr: 128 }] }),
        ],
        alt: [
          fact(`${pName(a)}: BP 120/76, HR 82 · ${pName(b)}: BP 78/44, HR 138 · ${pName(c)}: BP 84/50, HR 132.`, [a, b, c], { tag: 'vit', list: [{ p: a, bp: 120, hr: 82 }, { p: b, bp: 78, hr: 138 }, { p: c, bp: 84, hr: 132 }] }),
          fact(`${pName(d)}: BP 86/52, HR 130 — LOWER BP than ${pName(e)}'s BP 122/78, HR 86 · ${pName(f)}: BP 84/50, HR 128.`, [d, e, f], { tag: 'vit', list: [{ p: d, bp: 86, hr: 130 }, { p: e, bp: 122, hr: 86 }, { p: f, bp: 84, hr: 128 }] }),
        ],
      }),
      makeCard({
        index: 4, time: '01:23', wing: 'Ethics File', wingIndex: 0, label: 'Gate 3: Verified Code Status',
        shown: [
          fact(`Verified FULL CODE: ${pName(a)}, ${pName(b)}, ${pName(d)}, ${pName(e)}, and ${pName(f)}.`, [a, b, d, e, f], { tag: 'fc', ps: [a, b, d, e, f] }),
          fact(`Verified Signed Comfort-Only DNR on chart: ${pName(c)}.`, [c], { tag: 'dnr', p: c }),
        ],
        alt: [
          fact(`Verified FULL CODE: ${pName(a)}, ${pName(b)}, ${pName(c)}, ${pName(e)}, and ${pName(f)}.`, [a, b, c, e, f], { tag: 'fc', ps: [a, b, c, e, f] }),
          fact(`Verified Signed Comfort-Only DNR on chart: ${pName(d)}.`, [d], { tag: 'dnr', p: d }),
        ],
      }),
      makeCard({
        index: 5, time: '01:25', wing: 'OR Charge', wingIndex: 1, label: 'Execute Full Chief Loop',
        shown: [
          fact(`Intersect Gate 1 (01:15 Scan +) ∩ Gate 2 (BP < 90 OR HR > BP) ∩ Gate 3 (Full Code).`, [], { tag: 'rule' }),
          fact(`Roll ONLY the bays passing all three gates straight into Emergency OR.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Full Trauma Chief Workup',
      dispatch: 'Capstone loop: integrate STAT scan reversals, compensated shock (BP < 90 or HR > Top BP), and Full-Code ethics across all six bays.',
      order: 'Roll to OR EVERY patient who is 01:15 Scan-POSITIVE, in shock (BP < 90 OR HR > Top BP), AND Full Code.',
      hint: 'Check Gate 1 (Scan +) ∩ Gate 2 (BP < 90 or HR > Top BP) ∩ Gate 3 (Full Code) — watch HR > BP and DNRs.',
      bayDefaultLabel: 'Chief Loop',
      cards,
      evaluate(activeCards) {
        const pos = new Set(factsByTag(activeCards, 'pos').flatMap((x) => x.ps));
        const shock = new Set();
        for (const x of factsByTag(activeCards, 'vit')) {
          for (const it of x.list) if (it.bp < 90 || it.hr > it.bp) shock.add(it.p);
        }
        const fc = new Set(factsByTag(activeCards, 'fc').flatMap((x) => x.ps));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => pos.has(id) && shock.has(id) && fc.has(id)));
        const rivals = [c, e, b, f, d, a].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Integrating Gate 1 (01:15 Scan +), Gate 2 (BP < 90 or HR > Top BP), and Gate 3 (Full Code) clears ${formatList(targets)} for OR.`,
          rival: buildRivalInfo(targets, rivals, (r) => {
            if (!pos.has(r)) return `${pName(r)}'s 01:15 STAT scan was negative, overturning earlier guesses.`;
            if (!fc.has(r)) return `${pName(r)} has a verified Comfort-Only DNR that must be honored.`;
            return `${pName(r)}'s vitals show no shock (BP ≥ 90 and HR ≤ Top BP).`;
          }),
        };
      },
    };
  },
};
