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
  // Within-patient relational contrast: Behavior WITH Companion vs. Behavior ALONE across 6 bays
  'interpersonal-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Safety Rule', wingIndex: 0, label: 'Two-State Shift Rule',
        shown: [
          fact(`Compare each patient WITH their companion vs. ALONE: fear/silence ONLY when companion hovers + urgent relief when alone = coercion!`, [], { tag: 'rule' }),
          fact(`Patients who stay consistently nervous alone too (needle fear) or consistently relaxed with family are NOT being controlled.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'With Visitor', wingIndex: 1, label: 'State 1: Companion Present A',
        shown: [
          fact(`${pName(a)}: Companion answers EVERY question and grips ${pName(a)}'s wrist — ${pName(a)} freezes silent.`, [a], { tag: 'ctrl', p: a }),
          fact(`${pName(b)}: Companion steps out politely whenever nurse asks; ${pName(b)} speaks freely.`, [b], { tag: 'free', p: b }),
        ],
        alt: [
          fact(`${pName(a)}: Companion steps out politely whenever nurse asks; ${pName(a)} speaks freely.`, [a], { tag: 'free', p: a }),
          fact(`${pName(b)}: Companion cuts off EVERY question and refuses to leave — ${pName(b)} freezes silent.`, [b], { tag: 'ctrl', p: b }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Alone Check', wingIndex: 0, label: 'State 2: 2 Minutes Alone A',
        shown: [
          fact(`${pName(a)} ALONE in X-ray: OPPOSITE OF curtain behavior — speaks fast and whispers "Please don't let them back in!"`, [a], { tag: 'alone_shift', p: a }),
          fact(`${pName(c)} ALONE in X-ray: STILL shaking from needle phobia (SAME nervousness with or without sister!).`, [c], { tag: 'same_anx', p: c }),
        ],
        alt: [
          fact(`${pName(b)} ALONE in X-ray: OPPOSITE OF curtain behavior — speaks fast and whispers "Please keep them outside!"`, [b], { tag: 'alone_shift', p: b }),
          fact(`${pName(c)} ALONE in X-ray: STILL shaking from needle phobia (SAME nervousness with or without sister!).`, [c], { tag: 'same_anx', p: c }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'With Visitor', wingIndex: 1, label: 'State 1: Companion Present B',
        shown: [
          fact(`${pName(d)}: Companion interrupts doctor and insists on signing ${pName(d)} out early — ${pName(d)} stares at the floor.`, [d], { tag: 'ctrl', p: d }),
          fact(`${pName(e)}: Loud anxious spouse asking too many doctor questions — YET steps back whenever ${pName(e)} talks.`, [e], { tag: 'free', p: e }),
        ],
        alt: [
          fact(`${pName(d)}: Companion waits calmly outside while ${pName(d)} explains symptoms clearly.`, [d], { tag: 'free', p: d }),
          fact(`${pName(c)}: Companion refuses to leave and answers for ${pName(c)} — ${pName(c)} stares silently at the floor.`, [c], { tag: 'ctrl', p: c }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Alone Check', wingIndex: 0, label: 'State 2: 2 Minutes Alone B',
        shown: [
          fact(`${pName(d)} ALONE at sink: immediately opens up and asks nurse for a private social worker (SHARP shift from State 1!).`, [d], { tag: 'alone_shift', p: d }),
          fact(`${pName(e)} & ${pName(f)} ALONE: relaxed and explicitly invite their spouse/parent right back in.`, [e, f], { tag: 'free_pair', ps: [e, f] }),
        ],
        alt: [
          fact(`${pName(c)} ALONE at sink: immediately opens up and asks nurse for a private social worker (SHARP shift!).`, [c], { tag: 'alone_shift', p: c }),
          fact(`${pName(e)} & ${pName(f)} ALONE: relaxed and explicitly invite their spouse/parent right back in.`, [e, f], { tag: 'free_pair', ps: [e, f] }),
        ],
      }),
      makeCard({
        index: 5, time: '01:22', wing: 'Private Suite', wingIndex: 1, label: 'Separate & Protect',
        shown: [
          fact(`Intersect Companion Control (State 1) WITH Sharp Relief/Disclosure Alone (State 2).`, [], { tag: 'rule' }),
          fact(`Move EVERY matching patient to a private visitor-free room with Social Work now.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'With-Visitor vs. Alone Shift',
      dispatch: 'Compare every patient’s behavior WITH their companion against their behavior ALONE to spot coercion.',
      order: 'Move to a private room EVERY patient showing BOTH companion control AND a sharp fear-to-relief shift when alone.',
      hint: 'Match State 1 (Companion blocks/controls) against State 2 (Patient opens up or begs for privacy alone).',
      bayDefaultLabel: 'Bedside Safety',
      cards,
      evaluate(activeCards) {
        const ctrl = new Set(factsByTag(activeCards, 'ctrl').map((x) => x.p));
        const shift = new Set(factsByTag(activeCards, 'alone_shift').map((x) => x.p));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => ctrl.has(id) && shift.has(id)));
        const rivals = [c, e, b, d, a].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Comparing State 1 (companion control) against State 2 (sharp disclosure shift alone) isolates ${formatList(targets)} for immediate private-room protection.`,
          rival: buildRivalInfo(targets, rivals, (r) => `${pName(r)} either stayed consistently anxious alone too (needle fear) or spoke freely with a supportive family member.`),
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
        index: 0, time: '01:02', wing: 'Family Desk', wingIndex: 0, label: 'Knowledge-Gap Clock Rule',
        shown: [
          fact(`A waiting family holds an OUTDATED belief whenever a patient moved to Emergency OR AFTER the family's last update!`, [], { tag: 'rule' }),
          fact(`If family was updated AFTER the OR transfer (or bay never entered OR), their mental model matches reality.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'OR Board', wingIndex: 1, label: 'Emergency OR Transfer Times A',
        shown: [
          fact(`${pName(a)}: Rushed into OR-1 at 01:10 for hidden spleen bleed.`, [a], { tag: 'or', p: a, t: 70 }),
          fact(`${pName(b)}: Rushed into OR-2 at 01:05 for crushed artery.`, [b], { tag: 'or', p: b, t: 65 }),
        ],
        alt: [
          fact(`${pName(a)}: Stable in Obs — NO emergency surgery needed.`, [a], { tag: 'no_or', p: a }),
          fact(`${pName(b)}: Rushed into OR-2 at 01:12 for sudden chest bleed.`, [b], { tag: 'or', p: b, t: 72 }),
        ],
      }),
      makeCard({
        index: 2, time: '01:12', wing: 'Family Log', wingIndex: 0, label: 'Family Last-Update Times A',
        shown: [
          fact(`${pName(a)}'s spouse: Last updated at 00:35 ("minor bump") — BEFORE 01:10 OR transfer!`, [a], { tag: 'fam', p: a, t: 35 }),
          fact(`${pName(b)}'s parent: Briefed by surgeon at 01:14 — AFTER 01:05 OR transfer (knows full truth!).`, [b], { tag: 'fam', p: b, t: 74 }),
        ],
        alt: [
          fact(`${pName(a)}'s spouse: Briefed at 01:15 — knows ${pName(a)} is stable in Obs.`, [a], { tag: 'fam', p: a, t: 75 }),
          fact(`${pName(b)}'s parent: Last updated at 00:40 ("just X-ray") — BEFORE 01:12 OR transfer!`, [b], { tag: 'fam', p: b, t: 40 }),
        ],
      }),
      makeCard({
        index: 3, time: '01:16', wing: 'OR Board', wingIndex: 1, label: 'Emergency OR Transfer Times B',
        shown: [
          fact(`${pName(c)}: Stable in Obs — NO surgery; ${pName(d)}: Rushed into OR-3 at 01:18!`, [c, d], { tag: 'or', p: d, t: 78 }),
          fact(`${pName(e)}: Rushed into OR-4 at 01:02; ${pName(f)}: Stable in Obs (NO surgery).`, [e, f], { tag: 'or', p: e, t: 62 }),
        ],
        alt: [
          fact(`${pName(c)}: Rushed into OR-3 at 01:18! ${pName(d)}: Stable in Obs — NO surgery.`, [c, d], { tag: 'or', p: c, t: 78 }),
          fact(`${pName(e)}: Rushed into OR-4 at 01:02; ${pName(f)}: Stable in Obs (NO surgery).`, [e, f], { tag: 'or', p: e, t: 62 }),
        ],
      }),
      makeCard({
        index: 4, time: '01:22', wing: 'Family Log', wingIndex: 0, label: 'Family Last-Update Times B',
        shown: [
          fact(`${pName(d)}'s sibling: Last updated at 00:45 ("just stitches") — BEFORE 01:18 OR transfer!`, [d], { tag: 'fam', p: d, t: 45 }),
          fact(`${pName(e)}'s family: Briefed at 01:08 (AFTER 01:02 OR-4 start!); ${pName(c)} & ${pName(f)}'s families last heard "minor check" at 00:50.`, [e, c, f], { tag: 'fam_e', p: e, t: 68 }),
        ],
        alt: [
          fact(`${pName(c)}'s sibling: Last updated at 00:45 ("just stitches") — BEFORE 01:18 OR transfer!`, [c], { tag: 'fam', p: c, t: 45 }),
          fact(`${pName(e)}'s family: Briefed at 01:08 (AFTER 01:02 OR-4 start!); ${pName(d)} & ${pName(f)}'s families know they are in Obs.`, [e, d, f], { tag: 'fam_e', p: e, t: 68 }),
        ],
      }),
      makeCard({
        index: 5, time: '01:25', wing: 'Waiting Room', wingIndex: 1, label: 'Update Blindsided Families',
        shown: [
          fact(`Compare each OR Transfer Time directly against that family's Last-Update Time!`, [], { tag: 'rule' }),
          fact(`Walk out NOW to update EVERY family whose last update happened BEFORE their loved one entered Emergency OR.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Waiting-Room Knowledge Gap',
      dispatch: 'Compare Emergency OR transfer timestamps against each waiting family’s last-update timestamp.',
      order: 'Update in person EVERY family whose loved one entered Emergency OR AFTER the family’s last update.',
      hint: 'Check OR Time > Family Last-Update Time (skip families updated AFTER surgery started or bays never in OR).',
      bayDefaultLabel: 'Family Sync',
      cards,
      evaluate(activeCards) {
        const orT = new Map();
        const famT = new Map();
        for (const x of factsByTag(activeCards, 'or')) orT.set(x.p, x.t);
        for (const x of [...factsByTag(activeCards, 'fam'), ...factsByTag(activeCards, 'fam_e')]) famT.set(x.p, x.t);
        const targets = uniqueSortedIds(
          [a, b, c, d, e, f].filter((id) => orT.has(id) && famT.has(id) && famT.get(id) < orT.get(id))
        );
        const rivals = [b, e, c, d, a].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Comparing OR transfer times vs. family update times catches ${formatList(targets)}: transferred to OR AFTER their family's outdated update.`,
          rival: buildRivalInfo(targets, rivals, (r) =>
            orT.has(r) ? `${pName(r)}'s family was already briefed AFTER ${pName(r)} entered OR.` : `${pName(r)} stayed stable in Obs (no surgery), matching what their family believes.`
          ),
        };
      },
    };
  },

  // #64 Motivational reasoning (After · Composite)
  // Intersecting Solvable Outside Life Barrier × Active High Medical Risk across 6 patients asking to leave AMA
  'motivational-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'AMA Desk', wingIndex: 0, label: 'Look Beneath "I’m Leaving"',
        shown: [
          fact(`All six patients want to leave early! Dispatch Social Work + Attending ONLY if: (1) Solvable outside worry drives exit AND (2) Vitals show active danger (BP < 90 or internal bleed).`, [], { tag: 'rule' }),
          fact(`Stable vitals with an outside worry get a safe outpatient bridge; angry preference without danger signs standard discharge.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Root Motives', wingIndex: 1, label: 'Why They Want Out A',
        shown: [
          fact(`${pName(a)}: "Nobody is home with my 4-year-old!" (solvable childcare worry!).`, [a], { tag: 'solv', p: a }),
          fact(`${pName(b)}: "I just hate hospital beds and my ride is outside" (personal preference, NO outside emergency).`, [b], { tag: 'pref', p: b }),
        ],
        alt: [
          fact(`${pName(a)}: Agreed to stay once nurse called a relative (NO longer leaving!).`, [a], { tag: 'stay', p: a }),
          fact(`${pName(b)}: "If I miss my 5 AM shift I lose rent!" (solvable work-note worry!).`, [b], { tag: 'solv', p: b }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Root Motives', wingIndex: 1, label: 'Why They Want Out B',
        shown: [
          fact(`${pName(c)}: "My dog is locked indoors alone!" (solvable pet worry); ${pName(d)}: "No insurance — terrified of ICU bill!" (solvable charity-care worry!).`, [c, d], { tag: 'solv_pair', ps: [c, d] }),
          fact(`${pName(e)}: "My home oxygen tank ran out — came only for a refill!" (solvable); ${pName(f)}: "I'm bored of waiting."`, [e, f], { tag: 'solv', p: e }),
        ],
        alt: [
          fact(`${pName(c)}: "No insurance — terrified of ICU bill!" (solvable charity-care worry!).`, [c], { tag: 'solv', p: c }),
          fact(`${pName(d)}: Agreed to stay after talking to billing; ${pName(e)} & ${pName(f)} just dislike waiting rooms.`, [d, e, f], { tag: 'stay', p: d }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Live Vitals', wingIndex: 0, label: 'Medical Danger Check A',
        shown: [
          fact(`${pName(a)}: BP plunged to 82/48, pulse 130 (WORSE THAN ${pName(c)}'s steady 122/76!).`, [a, c], { tag: 'crit', p: a }),
          fact(`${pName(b)}: BP 84/50, pale sweat (critical, YET check ${pName(b)}'s motive card!).`, [b], { tag: 'crit', p: b }),
        ],
        alt: [
          fact(`${pName(a)}: Steady BP 120/76, clean scans (safe!).`, [a], { tag: 'ok', p: a }),
          fact(`${pName(b)}: BP plunged to 82/48, O2 87% (active danger!).`, [b], { tag: 'crit', p: b }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Live Vitals', wingIndex: 0, label: 'Medical Danger Check B',
        shown: [
          fact(`${pName(d)}: Ultrasound shows internal belly fluid + pulse 134 (active danger!).`, [d], { tag: 'crit', p: d }),
          fact(`${pName(c)}, ${pName(e)}, & ${pName(f)}: All have steady BP ≥ 118, clean scans, normal O2 (medically stable!).`, [c, e, f], { tag: 'ok_all', ps: [c, e, f] }),
        ],
        alt: [
          fact(`${pName(c)}: Heart monitor shows skipped beats + BP 80/46 (active danger!).`, [c], { tag: 'crit', p: c }),
          fact(`${pName(d)}, ${pName(e)}, & ${pName(f)}: All have steady BP ≥ 118, clean scans, normal O2 (medically stable!).`, [d, e, f], { tag: 'ok_all', ps: [d, e, f] }),
        ],
      }),
      makeCard({
        index: 5, time: '01:22', wing: 'Social Work', wingIndex: 1, label: 'Targeted AMA Rescue',
        shown: [
          fact(`Intersect Solvable Outside Worry WITH Active Medical Danger across all six bays.`, [], { tag: 'rule' }),
          fact(`Send Social Work + Attending immediately to solve the worry and keep those crashing patients safe!`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Leaving Against Advice',
      dispatch: 'Six patients are trying to walk out — intersect solvable outside life worries with hidden medical danger.',
      order: 'Intervene with Social Work for EVERY patient leaving over a solvable outside worry who STILL has dangerous vitals.',
      hint: 'Require BOTH: Solvable outside barrier (childcare/bill/shift) AND Dangerous vitals (BP < 90 / internal bleed).',
      bayDefaultLabel: 'AMA Audit',
      cards,
      evaluate(activeCards) {
        const solv = new Set([
          ...factsByTag(activeCards, 'solv').map((x) => x.p),
          ...factsByTag(activeCards, 'solv_pair').flatMap((x) => x.ps),
        ]);
        const crit = new Set(factsByTag(activeCards, 'crit').map((x) => x.p));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => solv.has(id) && crit.has(id)));
        const rivals = [c, b, e, d, a].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Intersecting solvable outside barriers with crashing vitals isolates ${formatList(targets)} for urgent Social Work + Attending rescue.`,
          rival: buildRivalInfo(targets, rivals, (r) =>
            solv.has(r) ? `${pName(r)} has a real outside worry, but their medical vitals and scans are completely stable.` : `${pName(r)} is not driven by a solvable outside life barrier.`
          ),
        };
      },
    };
  },

  // #65 Moral reasoning (After · Composite)
  // Relational ratio check: Pump Delivered ÷ Doctor Prescribed ≠ 1× across 6 IV infusions + anti-coverup candor
  'moral-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Candor Rule', wingIndex: 0, label: 'Dose Ratio & Disclosure Duty',
        shown: [
          fact(`Duty of Candor: NEVER hide an IV dosing error quietly! Reverse AND honestly disclose EVERY bay where Delivered ≠ Prescribed.`, [], { tag: 'rule' }),
          fact(`Watch for 10× decimal-point errors AND under-doses — compare Doctor Order vs. IV Pump Log across all 6 bays.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Doctor Order', wingIndex: 1, label: 'Prescribed Doses (A–C)',
        shown: [
          fact(`${pName(a)}: 5 units insulin · ${pName(b)}: 10 mg pain med · ${pName(c)}: 4 mg blood thinner.`, [a, b, c], { tag: 'ord', map: { [a]: 5, [b]: 10, [c]: 4 } }),
          fact(`All three doses verified by pharmacy at 00:40.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Doctor Order', wingIndex: 1, label: 'Prescribed Doses (D–F)',
        shown: [
          fact(`${pName(d)}: 20 mg BP med · ${pName(e)}: 50 mg antibiotic · ${pName(f)}: 15 mg anti-seizure med.`, [d, e, f], { tag: 'ord', map: { [d]: 20, [e]: 50, [f]: 15 } }),
          fact(`All three doses verified by pharmacy at 00:45.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'IV Pump Log', wingIndex: 0, label: 'Actual Delivered (A–C)',
        shown: [
          fact(`${pName(a)}: Pump ran 50 units (10× OVERDOSE — clerk whispered "just hide it!"). ${pName(b)}: 10 mg exact.`, [a, b], { tag: 'giv', map: { [a]: 50, [b]: 10 } }),
          fact(`${pName(c)}: Pump ran 40 mg (10× OVERDOSE — ten times higher than prescribed!).`, [c], { tag: 'giv', map: { [c]: 40 } }),
        ],
        alt: [
          fact(`${pName(a)}: Pump ran 5 units exact. ${pName(b)}: Pump ran 100 mg (10× OVERDOSE — someone muted the alarm!).`, [a, b], { tag: 'giv', map: { [a]: 5, [b]: 100 } }),
          fact(`${pName(c)}: Pump ran 4 mg exact on schedule.`, [c], { tag: 'giv', map: { [c]: 4 } }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'IV Pump Log', wingIndex: 0, label: 'Actual Delivered (D–F)',
        shown: [
          fact(`${pName(d)}: Pump ran 20 mg exact. ${pName(e)}: Pump ran 50 mg exact (SAME 1:1 ratio as ${pName(d)}).`, [d, e], { tag: 'giv', map: { [d]: 20, [e]: 50 } }),
          fact(`${pName(f)}: Pump ran 15 mg exact — zero mismatch.`, [f], { tag: 'giv', map: { [f]: 15 } }),
        ],
        alt: [
          fact(`${pName(d)}: Pump ran 200 mg (10× OVERDOSE — clerk suggested erasing the tape!). ${pName(e)}: 50 mg exact.`, [d, e], { tag: 'giv', map: { [d]: 200, [e]: 50 } }),
          fact(`${pName(f)}: Pump ran 15 mg exact — zero mismatch.`, [f], { tag: 'giv', map: { [f]: 15 } }),
        ],
      }),
      makeCard({
        index: 5, time: '01:22', wing: 'Ethics Lead', wingIndex: 1, label: 'Reverse & Disclose',
        shown: [
          fact(`Compare every bay's Prescribed Dose directly against its Actual Delivered Pump Log.`, [], { tag: 'rule' }),
          fact(`Reverse AND honestly disclose EVERY bay whose pump delivered MORE than prescribed.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: '10× Pump Error & Candor',
      dispatch: 'Compare prescribed doses against actual IV pump logs across all six infusions — expose every 10× error honestly.',
      order: 'Reverse AND honestly disclose EVERY patient whose actual IV pump dose exceeded their prescribed dose.',
      hint: 'Match Prescribed Doses (Cards 2–3) against Actual Delivered Logs (Cards 4–5) for every bay.',
      bayDefaultLabel: 'Pump Audit',
      cards,
      evaluate(activeCards) {
        const ord = {};
        const giv = {};
        for (const x of factsByTag(activeCards, 'ord')) Object.assign(ord, x.map);
        for (const x of factsByTag(activeCards, 'giv')) Object.assign(giv, x.map);
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => ord[id] != null && giv[id] != null && giv[id] > ord[id]));
        const rivals = [a, b, c, d, e, f].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Comparing Prescribed vs. Delivered pump logs catches 10× overdoses on ${formatList(targets)} (${targets.map((id) => `${pName(id)}: ${giv[id]} vs ${ord[id]}`).join(', ')}) — reverse and disclose honestly.`,
          rival: buildRivalInfo(targets, rivals, (r) => `${pName(r)}'s pump delivered the exact prescribed dose (${ord[r]}).`),
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
          fact(`Patient's own Verified Signed DNR or Clear-Headed Refusal OVERRIDES any family member shouting "Do everything!"`, [], { tag: 'rule' }),
          fact(`Full Resuscitation applies ONLY to crashing bays who are Full Code OR unconscious with ZERO DNR on file.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Legal File A', wingIndex: 1, label: 'Directives A & B',
        shown: [
          fact(`${pName(a)}: Verified Full-Code card asking for every life-saving step.`, [a], { tag: 'ok_code', p: a }),
          fact(`${pName(b)}: Verified Signed Comfort-Only DNR (even though ${pName(b)}'s brother begs "Shock them anyway!").`, [b], { tag: 'no_code', p: b }),
        ],
        alt: [
          fact(`${pName(a)}: Verified Signed Comfort-Only DNR signed with physician last month.`, [a], { tag: 'no_code', p: a }),
          fact(`${pName(b)}: Verified Full-Code card requesting full emergency resuscitation.`, [b], { tag: 'ok_code', p: b }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Legal File B', wingIndex: 1, label: 'Directives C & D',
        shown: [
          fact(`${pName(c)}: Wide awake, clear-headed adult signing refusal of blood/tubes for personal beliefs.`, [c], { tag: 'no_code', p: c }),
          fact(`${pName(d)}: Arrived unconscious from highway crash — ZERO DNR or refusal anywhere on file.`, [d], { tag: 'ok_code', p: d }),
        ],
        alt: [
          fact(`${pName(c)}: Arrived unconscious after fainting — ZERO DNR or refusal on file.`, [c], { tag: 'ok_code', p: c }),
          fact(`${pName(d)}: Verified Signed Comfort-Only DNR witnessed by two doctors.`, [d], { tag: 'no_code', p: d }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Live Vitals', wingIndex: 0, label: 'Who Is Crashing Now?',
        shown: [
          fact(`ACTIVELY CRASHING (BP < 82 or O2 < 82%): ${pName(a)}, ${pName(b)}, ${pName(c)}, and ${pName(d)}.`, [a, b, c, d], { tag: 'crash', ps: [a, b, c, d] }),
          fact(`${pName(e)} (Full Code) & ${pName(f)} (No DNR) both have rock-steady BP 122/76 & O2 99% (NOT crashing!).`, [e, f], { tag: 'steady', ps: [e, f] }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Bioethics Law', wingIndex: 0, label: 'Two Traps to Avoid',
        shown: [
          fact(`Trap 1: Don't override a signed DNR just because a relative shouts! Trap 2: Don't rush resuscitation to calm non-crashing ${pName(e)}/${pName(f)}!`, [e, f], { tag: 'note' }),
          fact(`Intersect Actively Crashing WITH Authorized Full Code / Implied Unconscious Consent.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Code Team', wingIndex: 1, label: 'Deploy Full Code',
        shown: [
          fact(`Rush FULL RESUSCITATION to EVERY crashing patient authorized for full care.`, [], { tag: 'rule' }),
          fact(`Honor every verified DNR and clear-headed refusal with comfort care.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Autonomy vs. Resuscitation',
      dispatch: 'Balance emergency resuscitation against verified signed DNRs, clear-headed refusals, and non-crashing bays.',
      order: 'Rush FULL RESUSCITATION to EVERY actively crashing patient who is Full Code or unconscious with no DNR.',
      hint: 'Intersect Actively Crashing (Card 4) WITH Full Code / Unconscious No-DNR — ignore family overrides of signed DNRs.',
      bayDefaultLabel: 'Code Status',
      cards,
      evaluate(activeCards) {
        const ok = new Set(factsByTag(activeCards, 'ok_code').map((x) => x.p));
        const crash = new Set(factsByTag(activeCards, 'crash').flatMap((x) => x.ps));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => ok.has(id) && crash.has(id)));
        const rivals = [b, c, e, d, a].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Intersecting active crash status with patient autonomy clears ${formatList(targets)} for full resuscitation while honoring verified DNRs/refusals.`,
          rival: buildRivalInfo(targets, rivals, (r) =>
            !crash.has(r) ? `${pName(r)} is Full Code, but their vitals are completely stable (not crashing).` : `${pName(r)} has a verified signed DNR or clear-headed refusal that overrides family demands.`
          ),
        };
      },
    };
  },

  // #67 Pragmatic reasoning (Before · Atomic)
  // Matching Care-Plan Constraints vs. Actual Home Infrastructure across 6 discharge candidates
  'pragmatic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Discharge Gate', wingIndex: 0, label: 'Plan vs. Reality Constraint',
        shown: [
          fact(`Hold overnight ANY discharge patient whose Care Plan REQUIRES an item (fridge, elevator, helper) MISSING from their real home tonight!`, [], { tag: 'rule' }),
          fact(`Room-temp pills or single-story homes that match the patient's plan discharge safely.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Care Plans A', wingIndex: 1, label: 'Required Home Setup (A–C)',
        shown: [
          fact(`${pName(a)}: Needs REFRIGERATED insulin shots every 6h.`, [a], { tag: 'req', p: a, need: 'fridge' }),
          fact(`${pName(b)}: Needs room-temp pills only; ${pName(c)}: Heavy leg cast — STRICT ZERO STAIRS for 2 weeks.`, [b, c], { tag: 'req', p: c, need: 'no_stairs' }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Care Plans B', wingIndex: 1, label: 'Required Home Setup (D–F)',
        shown: [
          fact(`${pName(d)}: Needs ELECTRIC oxygen concentrator plugged into wall power overnight.`, [d], { tag: 'req', p: d, need: 'power' }),
          fact(`${pName(e)}: Needs 1 daily dressing wrap; ${pName(f)}: Needs REFRIGERATED antibiotic drip.`, [e, f], { tag: 'req', p: f, need: 'fridge' }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Home Reality A', wingIndex: 0, label: 'Actual Living Conditions (A–C)',
        shown: [
          fact(`${pName(a)}: Sleeping in car tonight (ZERO fridge/power!). ${pName(b)}: Lives on 5th-floor walkup (fine — only takes pills!).`, [a, b], { tag: 'lack', p: a, miss: 'fridge' }),
          fact(`${pName(c)}: Lives alone in 5th-floor walkup with BROKEN elevator (STAIRS ONLY!).`, [c], { tag: 'lack', p: c, miss: 'no_stairs' }),
        ],
        alt: [
          fact(`${pName(a)}: Staying at sister's house with full kitchen & fridge (supported!).`, [a], { tag: 'ok_h', p: a }),
          fact(`${pName(c)}: Staying at cousin's single-story home with ramp (ZERO stairs!).`, [c], { tag: 'ok_h', p: c }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Home Reality B', wingIndex: 0, label: 'Actual Living Conditions (D–F)',
        shown: [
          fact(`${pName(d)}: Home electricity working normally with backup battery; ${pName(e)}: Visiting nurse stops by daily.`, [d, e], { tag: 'ok_h', p: d }),
          fact(`${pName(f)}: Full working home fridge & helpful roommate (supported!).`, [f], { tag: 'ok_h', p: f }),
        ],
        alt: [
          fact(`${pName(d)}: Storm knocked out power to ${pName(d)}'s block until tomorrow (ZERO wall power!).`, [d], { tag: 'lack', p: d, miss: 'power' }),
          fact(`${pName(f)}: Apartment fridge died yesterday — food spoiled (ZERO fridge!).`, [f], { tag: 'lack', p: f, miss: 'fridge' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:22', wing: 'Social Hold', wingIndex: 1, label: 'Hold Broken Plans',
        shown: [
          fact(`Notice ${pName(b)} has a 5th-floor walkup YET only needs pills (no stair ban!).`, [b], { tag: 'note' }),
          fact(`Hold overnight EVERY patient whose required care item is MISSING from their real home tonight.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Discharge Reality Check',
      dispatch: 'Match each patient’s required home care constraints against their actual living conditions tonight.',
      order: 'Hold overnight EVERY patient whose care plan REQUIRES an item missing from their actual home tonight.',
      hint: 'Pair Required Setup (fridge / zero stairs / wall power) against what is actually missing at home.',
      bayDefaultLabel: 'Discharge Fit',
      cards,
      evaluate(activeCards) {
        const reqs = new Map();
        for (const x of factsByTag(activeCards, 'req')) reqs.set(x.p, x.need);
        const lacks = new Map();
        for (const x of factsByTag(activeCards, 'lack')) lacks.set(x.p, x.miss);
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => reqs.has(id) && lacks.get(id) === reqs.get(id)));
        const rivals = [b, d, f, e, a, c].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Matching care-plan constraints against actual home reality catches impossible discharges for ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, rivals, (r) => `${pName(r)}'s real home setup satisfies every requirement of their discharge plan.`),
        };
      },
    };
  },

  // #68 Contextual reasoning (Inside · Atomic)
  // Identical Current BP (102/64) across ALL 6 bays — compare (Normal Baseline − 102 ≥ 40) to catch hidden shock!
  'contextual-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Resus Rule', wingIndex: 0, label: 'Identical 102/64 Wall',
        shown: [
          fact(`ALL SIX bays currently show the EXACT SAME monitor reading: 102/64!`, [], { tag: 'rule' }),
          fact(`Hidden Shock triggers whenever (Normal Baseline Top BP − 102) ≥ 40 points (i.e. Baseline ≥ 142)!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Clinic File A', wingIndex: 1, label: 'Normal Baselines A & B',
        shown: [
          fact(`${pName(a)}: Lifelong clinic baseline 168/98.`, [a], { tag: 'bs', p: a, bp: 168 }),
          fact(`${pName(b)}: Distance runner, normal resting baseline 100/62.`, [b], { tag: 'bs', p: b, bp: 100 }),
        ],
        alt: [
          fact(`${pName(a)}: Swimmer, normal resting baseline 106/66.`, [a], { tag: 'bs', p: a, bp: 106 }),
          fact(`${pName(b)}: Chronic clinic baseline 164/96.`, [b], { tag: 'bs', p: b, bp: 164 }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Clinic File B', wingIndex: 1, label: 'Normal Baselines C & D',
        shown: [
          fact(`${pName(c)}: Untreated chronic baseline 156/92 (HIGHER THAN ${pName(d)}'s 134/82).`, [c, d], { tag: 'bs', p: c, bp: 156 }),
          fact(`${pName(d)}: Mildly elevated clinic baseline 134/82.`, [d], { tag: 'bs', p: d, bp: 134 }),
        ],
        alt: [
          fact(`${pName(c)}: Normal resting clinic baseline 112/70.`, [c], { tag: 'bs', p: c, bp: 112 }),
          fact(`${pName(d)}: Chronic clinic baseline 172/100.`, [d], { tag: 'bs', p: d, bp: 172 }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Clinic File C', wingIndex: 0, label: 'Borderline Baselines E & F',
        shown: [
          fact(`${pName(e)}: Clinic baseline 138/84.`, [e], { tag: 'bs', p: e, bp: 138 }),
          fact(`${pName(f)}: Clinic baseline 118/74.`, [f], { tag: 'bs', p: f, bp: 118 }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Resus Rule', wingIndex: 0, label: 'Context Over Raw Numbers',
        shown: [
          fact(`An identical 102/64 reading means completely different physiology depending on each person's normal baseline!`, [], { tag: 'rule' }),
          fact(`Subtract 102 from every baseline and flag drops of ≥ 40 points.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Shock Team', wingIndex: 1, label: 'Treat Hidden Crashes',
        shown: [
          fact(`Start shock resuscitation for EVERY 102/64 bay whose baseline dropped by 40+ points.`, [], { tag: 'rule' }),
          fact(`Keep sub-40 drops on routine monitoring.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Six Identical 102/64 Monitors',
      dispatch: 'Every single bay reads 102/64 — subtract 102 from each patient’s normal baseline to catch ≥ 40-point crashes.',
      order: 'Treat for hidden shock EVERY 102/64 patient whose top BP fell 40 POINTS OR MORE below their normal baseline.',
      hint: 'Check (Baseline − 102 ≥ 40), i.e., normal baseline ≥ 142 — watch out for the 138 near-miss!',
      bayDefaultLabel: 'BP 102/64 Eval',
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'bs').map((x) => ({ id: x.p, bp: x.bp, drop: x.bp - 102 }));
        const targets = uniqueSortedIds(list.filter((x) => x.drop >= 40).map((x) => x.id));
        const rivals = list.filter((x) => x.drop < 40).sort((x, y) => y.drop - x.drop).map((x) => x.id);
        return {
          targets,
          proof: `Subtracting 102 from each baseline exposes ≥ 40-pt hidden shock in ${formatList(targets)} (${targets.map((id) => { const x = list.find((r) => r.id === id); return `${pName(id)}: ${x.bp}→102 (−${x.drop})`; }).join(', ')}).`,
          rival: buildRivalInfo(targets, rivals, (r) => {
            const x = list.find((item) => item.id === r);
            return `${pName(r)}'s baseline is ${x.bp} (drop of ${x.drop} pts), staying under the 40-point shock line.`;
          }),
        };
      },
    };
  },

  // #69 Narrative reasoning (After · Composite)
  // Relational timeline check: Claimed Injury Age vs. Biological Healing Age across 6 bays
  'narrative-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Tissue Clock', wingIndex: 0, label: 'Biological Age Scale',
        shown: [
          fact(`Tissue clock: Fresh red/purple = < 24 hours · Yellow-green bruise = 5–7 days OLD · Hard rib bone callus = 3+ weeks OLD!`, [], { tag: 'rule' }),
          fact(`Flag for Protection Review whenever biological tissue age is MUCH OLDER THAN (or physics-incompatible with) the claimed story!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Stories A', wingIndex: 1, label: 'Claimed Accounts A & B',
        shown: [
          fact(`${pName(a)}: Claims "1 soft carpet slip 20 minutes ago — zero prior falls."`, [a], { tag: 'st', p: a }),
          fact(`${pName(b)}: Claims "slipped on icy steps 30 minutes ago, caught myself on right palm."`, [b], { tag: 'st', p: b }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'X-Ray Clock A', wingIndex: 0, label: 'Physical Evidence A & B',
        shown: [
          fact(`${pName(a)}: 3 ribs at DIFFERENT healing stages (3-week hard bone callus + fresh break) + yellow-green bruises.`, [a], { tag: 'mis', p: a }),
          fact(`${pName(b)}: 1 fresh right-wrist break + fresh red-purple palm swelling.`, [b], { tag: 'ok', p: b }),
        ],
        alt: [
          fact(`${pName(a)}: 1 fresh red hip bruise only, clean rib X-ray.`, [a], { tag: 'ok', p: a }),
          fact(`${pName(b)}: 3-week healed rib calluses + yellow-green shoulder bruises.`, [b], { tag: 'mis', p: b }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Stories B', wingIndex: 1, label: 'Claimed Accounts C–F',
        shown: [
          fact(`${pName(c)}: Claims "bumped lightly into a plastic laundry basket tonight." ${pName(d)}: Claims "dropped heavy toolbox on left foot 1h ago."`, [c, d], { tag: 'st_pair', ps: [c, d] }),
          fact(`${pName(e)}: Claims "fell off bike 6 days ago (came in now because it still aches)." ${pName(f)}: Claims "slammed car door on thumb 1h ago."`, [e, f], { tag: 'st_pair', ps: [e, f] }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'X-Ray Clock B', wingIndex: 0, label: 'Physical Evidence C–F',
        shown: [
          fact(`${pName(c)}: High-force defensive forearm breaks + deep wrap-around grip marks.`, [c], { tag: 'mis', p: c }),
          fact(`${pName(d)}: Fresh red crushed left toe · ${pName(e)}: Yellow-green shoulder bruise · ${pName(f)}: Fresh red thumb bruise.`, [d, e, f], { tag: 'ok_all', ps: [d, e, f] }),
        ],
        alt: [
          fact(`${pName(c)}: Minor fresh shin scrape · ${pName(e)}: Yellow-green shoulder bruise · ${pName(f)}: Fresh red thumb bruise.`, [c, e, f], { tag: 'ok_all', ps: [c, e, f] }),
          fact(`${pName(d)}: Spiral upper-arm break + yellow-green upper-arm bruises.`, [d], { tag: 'mis', p: d }),
        ],
      }),
      makeCard({
        index: 5, time: '01:22', wing: 'Forensic Desk', wingIndex: 1, label: 'Compare Both Clocks',
        shown: [
          fact(`An older yellow-green bruise is ONLY a mismatch if the patient claims the injury happened today!`, [], { tag: 'rule' }),
          fact(`Flag ONLY bays where physical tissue age or force CANNOT match the claimed account.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Story Clock vs. Tissue Clock',
      dispatch: 'Compare claimed injury timelines & forces against physical healing stages — don’t flag an honest 6-day-old bruise!',
      order: 'Flag for Protection Review EVERY patient whose physical healing age or force CANNOT match their claimed story.',
      hint: 'Check BOTH story age and physical tissue age — yellow-green bruises contradict "20 min ago" yet MATCH "6 days ago"!',
      bayDefaultLabel: 'Timeline Audit',
      cards,
      evaluate(activeCards) {
        const targets = uniqueSortedIds(factsByTag(activeCards, 'mis').map((x) => x.p));
        const rivals = [e, b, d, c, a].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Comparing claimed story age/force against biological healing stages catches mismatches on ${formatList(targets)}, while ${pName(e)}'s 6-day bruise matches their 6-day story.`,
          rival: buildRivalInfo(targets, rivals, (r) => `${pName(r)}'s biological bruise/X-ray age and impact pattern match their claimed account cleanly.`),
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
          fact(`Clear for immediate OR ONLY when ALL THREE viewpoints agree: (1) Patient's Written Plan = YES + (2) Family Voice = YES + (3) Surgeon Odds > 50%.`, [], { tag: 'rule' }),
          fact(`If ANY single voice clashes (even 2-of-3!), hold for a joint family ethics conference instead.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Voice 1 · Patient', wingIndex: 1, label: 'Signed Patient Plans (All 6)',
        shown: [
          fact(`Signed plan = YES (operate if recovery likely): ${pName(a)}, ${pName(c)}, ${pName(d)}, and ${pName(e)}.`, [a, c, d, e], { tag: 'v1', ps: [a, c, d, e] }),
          fact(`Signed plan = NO (comfort care only): ${pName(b)} and ${pName(f)}.`, [b, f], { tag: 'no1', ps: [b, f] }),
        ],
        alt: [
          fact(`Signed plan = YES (operate if recovery likely): ${pName(b)}, ${pName(c)}, ${pName(d)}, and ${pName(e)}.`, [b, c, d, e], { tag: 'v1', ps: [b, c, d, e] }),
          fact(`Signed plan = NO (comfort care only): ${pName(a)} and ${pName(f)}.`, [a, f], { tag: 'no1', ps: [a, f] }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Voice 2 · Family', wingIndex: 0, label: 'Family Spokespersons (All 6)',
        shown: [
          fact(`Family agrees to operate: ${pName(a)}, ${pName(b)}, ${pName(c)}, and ${pName(d)}.`, [a, b, c, d], { tag: 'v2', ps: [a, b, c, d] }),
          fact(`Family requests pause/comfort hold: ${pName(e)} (disagrees with plan!) and ${pName(f)}.`, [e, f], { tag: 'no2', ps: [e, f] }),
        ],
        alt: [
          fact(`Family agrees to operate: ${pName(a)}, ${pName(b)}, ${pName(c)}, and ${pName(e)}.`, [a, b, c, e], { tag: 'v2', ps: [a, b, c, e] }),
          fact(`Family requests pause/comfort hold: ${pName(d)} and ${pName(f)}.`, [d, f], { tag: 'no2', ps: [d, f] }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Voice 3 · Surgeon', wingIndex: 1, label: 'Surgeon Recovery Odds (All 6)',
        shown: [
          fact(`Surgeon projects > 50% recovery: ${pName(a)} (85%), ${pName(b)} (80%), ${pName(d)} (88%), and ${pName(e)} (75%).`, [a, b, d, e], { tag: 'v3', ps: [a, b, d, e] }),
          fact(`Surgeon projects futile < 5% recovery: ${pName(c)} (2%) and ${pName(f)} (1%).`, [c, f], { tag: 'no3', ps: [c, f] }),
        ],
        alt: [
          fact(`Surgeon projects > 50% recovery: ${pName(a)} (85%), ${pName(b)} (80%), ${pName(c)} (82%), and ${pName(d)} (88%).`, [a, b, c, d], { tag: 'v3', ps: [a, b, c, d] }),
          fact(`Surgeon projects futile < 5% recovery: ${pName(e)} (3%) and ${pName(f)} (1%).`, [e, f], { tag: 'no3', ps: [e, f] }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: '3-Voice Rule', wingIndex: 0, label: 'Spot the 2-of-3 Decoys',
        shown: [
          fact(`Multiple bays have 2 of 3 voices aligned — ONLY bays standing inside (Voice 1 ∩ Voice 2 ∩ Voice 3) clear cleanly!`, [], { tag: 'rule' }),
          fact(`Hold any 2-of-3 split for a calm joint family conference.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Ethics Desk', wingIndex: 1, label: 'Clear Unanimous Bays',
        shown: [
          fact(`Intersect Patient Wish ∩ Family Voice ∩ Surgeon > 50% Odds.`, [], { tag: 'rule' }),
          fact(`Clear ONLY unanimous 3-of-3 bays for immediate surgery.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Three-Voice Alignment',
      dispatch: 'Intersect three independent perspectives (Patient Written Plan ∩ Family Voice ∩ Surgeon Odds) across six consults.',
      order: 'Clear for immediate surgery EVERY patient where Patient Plan, Family Voice, AND Surgeon Odds (> 50%) ALL agree.',
      hint: 'Find every patient listed as YES on all three Voice cards — reject 2-of-3 splits!',
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
  // Comparing 01:00 Early Anchor Labels vs. 01:20 Objective Severity across 6 bays — catching premature closure!
  'metacognitive-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Bias Audit', wingIndex: 0, label: 'Early-Label vs. Reality Flip',
        shown: [
          fact(`Early shortcut trap: tagging bays "Just Anxiety / Drunk / Stress" causes teams to miss silent collapses!`, [], { tag: 'rule' }),
          fact(`Rescue EVERY bay dismissed with a soft 01:00 label whose 01:20 objective vitals are WORSE THAN stable control ${pName(f)} (O2 98%, sugar 95, BP 120)!`, [f], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: '01:00 Labels', wingIndex: 1, label: 'Premature Soft Tags (All 4)',
        shown: [
          fact(`${pName(a)}: Dismissed as "Panic Attack" · ${pName(b)}: Dismissed as "Sleep Off Alcohol."`, [a, b], { tag: 'soft', ps: [a, b] }),
          fact(`${pName(c)}: Dismissed as "Stress Headache" · ${pName(d)}: Dismissed as "Mild Stomach Bug."`, [c, d], { tag: 'soft', ps: [c, d] }),
        ],
      }),
      makeCard({
        index: 2, time: '01:14', wing: '01:20 Vitals', wingIndex: 0, label: 'Objective Findings A & B',
        shown: [
          fact(`${pName(a)}: O2 plunged to 81% (17 points LOWER THAN ${pName(f)}'s 98%!) + silent right lung!`, [a, f], { tag: 'crit', p: a }),
          fact(`${pName(b)}: Clean head CT, O2 99%, blood sugar 96 (matches ${pName(f)}'s safe baseline!).`, [b, f], { tag: 'ok', p: b }),
        ],
        alt: [
          fact(`${pName(a)}: O2 99%, clear equal lungs, normal heart strip (truly panic!).`, [a], { tag: 'ok', p: a }),
          fact(`${pName(b)}: Blood sugar crashed to 34 (LESS THAN HALF of ${pName(f)}'s 95!) + head bruise!`, [b, f], { tag: 'crit', p: b }),
        ],
      }),
      makeCard({
        index: 3, time: '01:18', wing: '01:20 Vitals', wingIndex: 0, label: 'Objective Findings C & D',
        shown: [
          fact(`${pName(c)}: Right pupil widened + sudden left-arm paralysis (silent stroke, NOT stress!).`, [c], { tag: 'crit', p: c }),
          fact(`${pName(d)}: Soft belly, BP 122/76, O2 99%, nausea cleared after water.`, [d], { tag: 'ok', p: d }),
        ],
        alt: [
          fact(`${pName(c)}: Equal pupils, full arm strength, headache cleared cleanly.`, [c], { tag: 'ok', p: c }),
          fact(`${pName(d)}: Silent heart-attack strip + BP dropped to 82/48 (38 pts LOWER THAN ${pName(f)}!).`, [d, f], { tag: 'crit', p: d }),
        ],
      }),
      makeCard({
        index: 4, time: '01:21', wing: '01:00 Labels', wingIndex: 1, label: 'Properly Tagged Control Bays',
        shown: [
          fact(`${pName(e)}: Was ALREADY tagged RED #1 at 01:00 and is ALREADY in OR (NOT a missed soft-label bias!).`, [e], { tag: 'already', p: e }),
          fact(`${pName(f)}: Stable control bay (O2 98%, sugar 95, BP 120/76, normal exam).`, [f], { tag: 'ok', p: f }),
        ],
      }),
      makeCard({
        index: 5, time: '01:24', wing: 'Safety Pull', wingIndex: 1, label: 'Override Soft Labels',
        shown: [
          fact(`Intersect Soft 01:00 Label WITH Real 01:20 Physical Crisis — skip ${pName(e)} (already in OR)!`, [e], { tag: 'note' }),
          fact(`Pull EVERY mislabeled collapsing bay out of the waiting zone immediately.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Overturning Premature Labels',
      dispatch: 'Compare 01:00 comforting labels against 01:20 objective vitals to catch hidden physical emergencies.',
      order: 'Rescue EVERY patient dismissed with a soft 01:00 label whose 01:20 objective exam shows a real crisis.',
      hint: 'Match the 4 Soft-Label bays (Card 2) against real objective crashes (Cards 3–4); skip already-in-OR bay.',
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
  // Distinguishing Verified Clean Proof vs. Zero-Evidence Assumption ("assumed fine") across 6 crash bays
  'epistemic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Proof Audit', wingIndex: 0, label: 'Unchecked ≠ Safe Rule',
        shown: [
          fact(`Absence of bad labs does NOT prove safety if nobody ran an exam or if the sample spilled!`, [], { tag: 'rule' }),
          fact(`Pull to Trauma Bay 1 EVERY High-Force crash bay (> 45 mph or thrown) with ZERO verified doctor exam/vitals!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Crash Speed', wingIndex: 1, label: 'Impact Forces (All 6)',
        shown: [
          fact(`HIGH-FORCE (> 45 mph / thrown): ${pName(a)} (65-mph rollover), ${pName(b)} (same 65-mph rollover), ${pName(c)} (thrown 15 ft off bike), and ${pName(e)} (55-mph T-bone).`, [a, b, c, e], { tag: 'hi_f', ps: [a, b, c, e] }),
          fact(`LOW-FORCE (< 10 mph): ${pName(d)} (5-mph parking bump) and ${pName(f)} (tripped on curb).`, [d, f], { tag: 'lo_f', ps: [d, f] }),
        ],
      }),
      makeCard({
        index: 2, time: '01:12', wing: 'Proof Log A', wingIndex: 0, label: 'Verification Audit A & B',
        shown: [
          fact(`${pName(a)}: Clipboard says "looked quiet in hall" — ZERO vitals, ZERO scan, NEVER seen by a doctor!`, [a], { tag: 'unch', p: a }),
          fact(`${pName(b)}: Attending verified full exam, clean CT scan, normal vitals every 15 min (PROVEN safe!).`, [b], { tag: 'ver', p: b }),
        ],
        alt: [
          fact(`${pName(a)}: Attending verified clean CT scan, clean labs, steady vitals (PROVEN safe!).`, [a], { tag: 'ver', p: a }),
          fact(`${pName(b)}: Blood tube spilled + ZERO doctor exam — marked "probably okay" by mistake!`, [b], { tag: 'unch', p: b }),
        ],
      }),
      makeCard({
        index: 3, time: '01:16', wing: 'Proof Log B', wingIndex: 0, label: 'Verification Audit C & D',
        shown: [
          fact(`${pName(c)}: Chart blank after Wi-Fi drop — assumed fine ONLY because ${pName(c)} isn't yelling!`, [c], { tag: 'unch', p: c }),
          fact(`${pName(d)}: Also unchecked yet (5-mph low-force parking bump — check Impact Force card!).`, [d], { tag: 'unch', p: d }),
        ],
        alt: [
          fact(`${pName(c)}: Attending verified clean CT scan and normal vitals (PROVEN safe!).`, [c], { tag: 'ver', p: c }),
          fact(`${pName(d)}: Also unchecked yet (5-mph low-force parking bump!).`, [d], { tag: 'unch', p: d }),
        ],
      }),
      makeCard({
        index: 4, time: '01:20', wing: 'Proof Log C', wingIndex: 1, label: 'Verification Audit E & F',
        shown: [
          fact(`${pName(e)}: Attending verified clean chest/belly CT and steady vitals (PROVEN safe — SAME AS ${pName(b)}!).`, [e, b], { tag: 'ver', p: e }),
          fact(`${pName(f)}: Verified clean exam and normal vitals.`, [f], { tag: 'ver', p: f }),
        ],
        alt: [
          fact(`${pName(e)}: Ambulance radio cut out — ZERO vitals and ZERO doctor exam recorded yet!`, [e], { tag: 'unch', p: e }),
          fact(`${pName(f)}: Verified clean exam and normal vitals.`, [f], { tag: 'ver', p: f }),
        ],
      }),
      makeCard({
        index: 5, time: '01:23', wing: 'Trauma Bay 1', wingIndex: 1, label: 'Close the Proof Gaps',
        shown: [
          fact(`Notice ${pName(d)} is unchecked YET low-force (5 mph); pull ONLY High-Force (> 45 mph) ∩ Unchecked!`, [d], { tag: 'note' }),
          fact(`Bring every high-force unchecked bay into Trauma Bay 1 for real vitals & scan now.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Proven Safe vs. Never Checked',
      dispatch: 'Intersect High-Force crash mechanisms (> 45 mph) with Unchecked blank charts — separate proven safety from blind assumption.',
      order: 'Pull into Trauma Bay 1 EVERY High-Force crash patient (> 45 mph / thrown) who has ZERO verified exam or vitals.',
      hint: 'Intersect High-Force Crash (Card 2) WITH Unchecked / Spilled-Sample charts (Cards 3–5).',
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
  // TRUE CLOSED-LOOP CLOCK ARITHMETIC! No shallow "ZERO" keyword scan!
  // Current clock = 01:00. Strong emergency meds require a re-check WITHIN 15 min (Re-Check Time − Drug Time ≤ 15 min, or if none yet, 01:00 − Drug Time > 15 min)!
  'reflective-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Loop Audit', wingIndex: 0, label: '15-Minute Re-Check Window',
        shown: [
          fact(`Current clock = 01:00. After ANY strong IV/spray med, a follow-up check MUST occur WITHIN 15 minutes (Gap ≤ 15 min)!`, [], { tag: 'rule' }),
          fact(`Flag EVERY strong-med bay whose gap (Re-Check − Drug Time, or 01:00 − Drug Time if unchecked) EXCEEDS 15 minutes (> 15m)!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:00', wing: 'Drug Clock', wingIndex: 1, label: 'Strong Meds Given (A–C)',
        shown: [
          fact(`${pName(a)}: Strong IV sedative given at 00:20.`, [a], { tag: 'dg', p: a, t: 20, strong: true }),
          fact(`${pName(b)}: Overdose spray given at 00:25 · ${pName(c)}: Fast BP drip started at 00:35.`, [b, c], { tag: 'dg_pair', list: [{ p: b, t: 25, strong: true }, { p: c, t: 35, strong: true }] }),
        ],
      }),
      makeCard({
        index: 2, time: '01:00', wing: 'Drug Clock', wingIndex: 1, label: 'Meds Given (D–F)',
        shown: [
          fact(`${pName(d)}: Strong IV sedative given at 00:50.`, [d], { tag: 'dg', p: d, t: 50, strong: true }),
          fact(`${pName(e)}: Strong heart-rate drip at 00:30 · ${pName(f)}: Plain ice pack only at 00:15 (non-drug).`, [e, f], { tag: 'dg_pair', list: [{ p: e, t: 30, strong: true }, { p: f, t: 15, strong: false }] }),
        ],
      }),
      makeCard({
        index: 3, time: '01:00', wing: 'Re-Check Log', wingIndex: 0, label: 'Follow-Up Timestamps (A–C)',
        shown: [
          fact(`${pName(a)}: Re-checked at 00:44.`, [a], { tag: 'rc', p: a, t: 44 }),
          fact(`${pName(b)}: Re-checked at 00:38 · ${pName(c)}: No check logged yet at 01:00.`, [b, c], { tag: 'rc_pair', list: [{ p: b, t: 38 }, { p: c, t: 60 }] }),
        ],
        alt: [
          fact(`${pName(a)}: Re-checked at 00:33.`, [a], { tag: 'rc', p: a, t: 33 }),
          fact(`${pName(b)}: Re-checked at 00:48 · ${pName(c)}: Re-checked at 00:48.`, [b, c], { tag: 'rc_pair', list: [{ p: b, t: 48 }, { p: c, t: 48 }] }),
        ],
      }),
      makeCard({
        index: 4, time: '01:00', wing: 'Re-Check Log', wingIndex: 0, label: 'Follow-Up Timestamps (D–F)',
        shown: [
          fact(`${pName(d)}: No check logged yet at 01:00.`, [d], { tag: 'rc', p: d, t: 60 }),
          fact(`${pName(e)}: Re-checked at 00:45 · ${pName(f)}: Routine check at 00:55.`, [e, f], { tag: 'rc_pair', list: [{ p: e, t: 45 }, { p: f, t: 55 }] }),
        ],
        alt: [
          fact(`${pName(d)}: No check logged yet at 01:00.`, [d], { tag: 'rc', p: d, t: 60 }),
          fact(`${pName(e)}: Re-checked at 00:52 · ${pName(f)}: Routine check at 00:55.`, [e, f], { tag: 'rc_pair', list: [{ p: e, t: 52 }, { p: f, t: 55 }] }),
        ],
      }),
      makeCard({
        index: 5, time: '01:00', wing: 'Audit Lead', wingIndex: 1, label: 'Compute Every Gap',
        shown: [
          fact(`Subtract Drug Time from Re-Check Time (or 01:00 if unlogged) for every STRONG-med bay!`, [], { tag: 'rule' }),
          fact(`Flag EVERY strong-med bay whose elapsed gap exceeded 15 minutes (> 15m).`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Closed-Loop 15-Min Audit',
      dispatch: 'Current time is 01:00 — subtract Drug Time from Re-Check Time (or 01:00) to catch strong-med gaps > 15 minutes.',
      order: 'Flag EVERY strong-drug patient whose re-check gap (Re-Check − Drug Time, or 01:00 − Drug Time) EXCEEDED 15 minutes.',
      hint: 'Compute elapsed minutes for each strong-med bay — skip the recent 00:50 dose (10m) and the exact 15m check!',
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
  // Dismantling the "Normal BP = Safe" fallacy using Relational Shock Index (Heart Rate > Top BP) + rigid belly across 6 young bays
  'critical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Fallacy Audit', wingIndex: 0, label: 'The Normal-BP Fallacy',
        shown: [
          fact(`Intern's claim: "All 6 young patients have BP ≥ 112, so ZERO internal bleeding!" — FALSE!`, [], { tag: 'rule' }),
          fact(`True Shock-Index Check: Whenever Heart Rate is HIGHER THAN Top BP (HR > BP) AND belly is rigid/tender, internal bleeding is hiding!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Vitals A', wingIndex: 1, label: 'HR vs. Top BP (A–C)',
        shown: [
          fact(`${pName(a)}: HR 136 · Top BP 114. ${pName(b)}: HR 82 · Top BP 118.`, [a, b], { tag: 'vi', list: [{ p: a, hr: 136, bp: 114 }, { p: b, hr: 82, bp: 118 }] }),
          fact(`${pName(c)}: HR 132 · Top BP 116.`, [c], { tag: 'vi', list: [{ p: c, hr: 132, bp: 116 }] }),
        ],
        alt: [
          fact(`${pName(a)}: HR 80 · Top BP 122. ${pName(b)}: HR 140 · Top BP 112.`, [a, b], { tag: 'vi', list: [{ p: a, hr: 80, bp: 122 }, { p: b, hr: 140, bp: 112 }] }),
          fact(`${pName(c)}: HR 110 · Top BP 120.`, [c], { tag: 'vi', list: [{ p: c, hr: 110, bp: 120 }] }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Vitals B', wingIndex: 1, label: 'HR vs. Top BP (D–F)',
        shown: [
          fact(`${pName(d)}: HR 130 · Top BP 120 (ran in panicked from crash).`, [d], { tag: 'vi', list: [{ p: d, hr: 130, bp: 120 }] }),
          fact(`${pName(e)}: HR 116 · Top BP 118 · ${pName(f)}: HR 88 · Top BP 124.`, [e, f], { tag: 'vi', list: [{ p: e, hr: 116, bp: 118 }, { p: f, hr: 88, bp: 124 }] }),
        ],
        alt: [
          fact(`${pName(d)}: HR 138 · Top BP 114.`, [d], { tag: 'vi', list: [{ p: d, hr: 138, bp: 114 }] }),
          fact(`${pName(e)}: HR 116 · Top BP 118 · ${pName(f)}: HR 88 · Top BP 124.`, [e, f], { tag: 'vi', list: [{ p: e, hr: 116, bp: 118 }, { p: f, hr: 88, bp: 124 }] }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Belly Exam', wingIndex: 0, label: 'Physical Belly Check (A–C)',
        shown: [
          fact(`${pName(a)}: Board-rigid tender belly after handlebar impact.`, [a], { tag: 'rig', p: a }),
          fact(`${pName(b)}: Soft pain-free belly · ${pName(c)}: Rigid guarding belly after ski impact.`, [b, c], { tag: 'rig', p: c }),
        ],
        alt: [
          fact(`${pName(a)}: Soft pain-free belly · ${pName(b)}: Board-rigid belly with seatbelt bruise.`, [a, b], { tag: 'rig', p: b }),
          fact(`${pName(c)}: Soft pain-free belly (arm impact only).`, [c], { tag: 'soft_b', p: c }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Belly Exam', wingIndex: 0, label: 'Physical Belly Check (D–F)',
        shown: [
          fact(`${pName(d)}: Soft pain-free belly on deep exam.`, [d], { tag: 'soft_b', p: d }),
          fact(`${pName(e)}: Rigid bruised belly after steering-wheel hit · ${pName(f)}: Soft belly.`, [e, f], { tag: 'rig', p: e }),
        ],
        alt: [
          fact(`${pName(d)}: Board-rigid swollen belly after dashboard impact.`, [d], { tag: 'rig', p: d }),
          fact(`${pName(e)}: Rigid bruised belly after steering-wheel hit · ${pName(f)}: Soft belly.`, [e, f], { tag: 'rig', p: e }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Trauma Scan', wingIndex: 1, label: 'Scan Masked Bleeders',
        shown: [
          fact(`Require BOTH halves: Heart Rate strictly HIGHER THAN Top BP AND rigid belly!`, [], { tag: 'rule' }),
          fact(`STAT-scan EVERY bay meeting both shock-index conditions.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Exposing the Normal-BP Fallacy',
      dispatch: 'All six young bays show BP ≥ 112 — compare Heart Rate vs. Top BP (HR > BP) AND belly rigidity to unmask hidden bleeds.',
      order: 'STAT-scan EVERY patient whose Heart Rate is STRICTLY HIGHER THAN Top BP (HR > BP) AND whose belly is rigid.',
      hint: 'Check BOTH (Heart Rate > Top BP) AND Rigid Belly — watch out for soft-belly panic and HR < BP decoys!',
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
          proof: `Exposing the "normal BP = safe" fallacy via Shock Index (HR > Top BP) ∩ Rigid Belly catches hidden bleeding in ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, rivals, (r) =>
            flipped.has(r) ? `${pName(r)} has HR > Top BP from panic, but their belly is completely soft.` : `${pName(r)}'s Heart Rate stays BELOW their Top BP.`
          ),
        };
      },
    };
  },

  // #75 Falsification-based reasoning (Inside · Meta)
  // Testing the universal claim "All Obs Bays match Safe Anchor F (O2 ≥ 94%, BP ≥ 100, Awake)" by hunting counterexamples!
  'falsification-based': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Obs Claim', wingIndex: 0, label: 'Universal Claim vs. Anchor',
        shown: [
          fact(`Night claim: "EVERY Obs bay matches Safe Anchor ${pName(f)}'s 3 bounds: O2 ≥ 94% + Top BP ≥ 100 + Wide Awake."`, [f], { tag: 'rule' }),
          fact(`Do NOT confirm the calm bays — hunt for EVERY counterexample breaking AT LEAST ONE of those 3 bounds!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'O2 & BP Wall', wingIndex: 1, label: 'Monitors A & B vs. Anchor',
        shown: [
          fact(`${pName(a)}: O2 84% · BP 118/74.`, [a], { tag: 'ob', p: a, o2: 84, bp: 118 }),
          fact(`${pName(b)}: O2 98% · BP 122/78.`, [b], { tag: 'ob', p: b, o2: 98, bp: 122 }),
        ],
        alt: [
          fact(`${pName(a)}: O2 97% · BP 120/76.`, [a], { tag: 'ob', p: a, o2: 97, bp: 120 }),
          fact(`${pName(b)}: O2 96% · BP 86/52.`, [b], { tag: 'ob', p: b, o2: 96, bp: 86 }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'O2 & BP Wall', wingIndex: 1, label: 'Monitors C–E vs. Anchor',
        shown: [
          fact(`${pName(c)}: O2 96% · BP 114/70 · ${pName(d)}: O2 94% · BP 100/66.`, [c, d], { tag: 'ob_pair', list: [{ p: c, o2: 96, bp: 114 }, { p: d, o2: 94, bp: 100 }] }),
          fact(`${pName(e)}: O2 97% · BP 116/72 · Safe Anchor ${pName(f)}: O2 98% · BP 120/76.`, [e, f], { tag: 'ob_pair', list: [{ p: e, o2: 97, bp: 116 }, { p: f, o2: 98, bp: 120 }] }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Nurse Rounds', wingIndex: 0, label: 'Alertness Audit (A–C)',
        shown: [
          fact(`${pName(c)}: Unresponsive to voice or shoulder tap.`, [c], { tag: 'unaw', p: c }),
          fact(`${pName(a)} & ${pName(b)}: Both wide awake and answering questions.`, [a, b], { tag: 'aw', ps: [a, b] }),
        ],
        alt: [
          fact(`${pName(c)}: Wide awake drinking water · ${pName(a)} & ${pName(b)}: Wide awake.`, [c, a, b], { tag: 'aw', ps: [c, a, b] }),
          fact(`${pName(e)}: Went limp and unresponsive to shoulder tap.`, [e], { tag: 'unaw', p: e }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Nurse Rounds', wingIndex: 0, label: 'Alertness Audit (D–F)',
        shown: [
          fact(`${pName(d)}: Wide awake chatting with nurse.`, [d], { tag: 'aw', ps: [d] }),
          fact(`${pName(e)}: Wide awake alert · ${pName(f)}: Wide awake (Safe Anchor).`, [e, f], { tag: 'aw', ps: [e, f] }),
        ],
        alt: [
          fact(`${pName(d)}: Wide awake chatting with nurse.`, [d], { tag: 'aw', ps: [d] }),
          fact(`${pName(f)}: Safe reference anchor (O2 98%, BP 120, wide awake).`, [f], { tag: 'aw', ps: [f] }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Obs Rescue', wingIndex: 1, label: 'Pull Counterexamples',
        shown: [
          fact(`One broken bound disproves "can safely wait" — check O2 (< 94%), BP (< 100), AND Alertness!`, [], { tag: 'rule' }),
          fact(`Pull EVERY Obs bay that breaks ANY of the 3 bounds right now.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Disproving "Everyone Can Wait"',
      dispatch: 'Test the universal Obs-Wing claim across all six bays — catch every counterexample breaking O2, BP, or Alertness.',
      order: 'Pull out EVERY Observation patient who breaks O2 ≥ 94%, Top BP ≥ 100, OR Wide-Awake alertness.',
      hint: 'Check all 3 bounds across both Monitor cards and Alertness cards — exact 94% and 100 pass cleanly!',
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
  // Fast rule-of-thumb ("Fever > 38.5°C + Aches → Flu") + fatal Exception Boundary (Stiff Neck OR Non-Fading Purple Spots) across 6 fever bays
  'heuristic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Fast-Track', wingIndex: 0, label: 'Shortcut & Fatal Exceptions',
        shown: [
          fact(`Winter shortcut: "Fever ≥ 38.5°C + Body Aches → Routine Flu." ALL 6 bays below have fever + aches!`, [], { tag: 'rule' }),
          fact(`FATAL EXCEPTION: Pull out of the flu line ANYONE with a rock-stiff neck OR purple spots that DO NOT FADE when pressed with a glass!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Fever Queue', wingIndex: 1, label: 'Temperatures (Red Herring!)',
        shown: [
          fact(`${pName(b)} (40.1°C) and ${pName(e)} (39.9°C) have HIGHER fevers than ${pName(a)} (38.8°C) and ${pName(c)} (38.7°C)!`, [b, e, a, c], { tag: 'temp' }),
          fact(`Fever height alone does NOT identify the fatal exception — check Neck + Glass-Press Skin tests!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Exception Exam', wingIndex: 0, label: 'Neck & Glass Test A & B',
        shown: [
          fact(`${pName(a)}: Rock-stiff neck (cannot touch chin to chest) + screams at room light.`, [a], { tag: 'exc', p: a }),
          fact(`${pName(b)} (40.1°C): Flexible neck + mild pink rash that FADES WHITE under glass.`, [b], { tag: 'flu', p: b }),
        ],
        alt: [
          fact(`${pName(a)}: Flexible neck + clear skin, steady alertness.`, [a], { tag: 'flu', p: a }),
          fact(`${pName(b)}: Fast-spreading purple ankle spots that STAY DARK under glass press.`, [b], { tag: 'exc', p: b }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Exception Exam', wingIndex: 0, label: 'Neck & Glass Test C & D',
        shown: [
          fact(`${pName(c)}: Dark purple leg spots that STAY DARK when pressed with a glass.`, [c], { tag: 'exc', p: c }),
          fact(`${pName(d)}: Sore throat muscles (neck bends fully chin-to-chest) + clear skin.`, [d], { tag: 'flu', p: d }),
        ],
        alt: [
          fact(`${pName(c)}: Flexible neck + pink hives that FADE WHITE under glass.`, [c], { tag: 'flu', p: c }),
          fact(`${pName(d)}: Rock-stiff neck (zero chin-to-chest bend) + sudden confusion.`, [d], { tag: 'exc', p: d }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Exception Exam', wingIndex: 0, label: 'Neck & Glass Test E & F',
        shown: [
          fact(`${pName(e)} (39.9°C): Flexible neck + clear skin, severe shaking chills.`, [e], { tag: 'flu', p: e }),
          fact(`${pName(f)} (38.9°C): Flexible neck + mild heat rash that FADES WHITE under glass.`, [f], { tag: 'flu', p: f }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Sepsis Bay', wingIndex: 1, label: 'Override Flu Shortcut',
        shown: [
          fact(`Ignore raw fever height and fading pink rashes — look strictly for Stiff Neck OR Non-Fading Purple Spots!`, [], { tag: 'rule' }),
          fact(`Pull EVERY fatal-exception bay straight into IV antibiotics now.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'When the Flu Shortcut Kills',
      dispatch: 'All six bays have high fever — look past the highest thermometer numbers to catch stiff-neck and non-fading purple-spot exceptions.',
      order: 'Pull out of the flu line EVERY fever patient with a rock-stiff neck OR purple spots that STAY DARK under glass.',
      hint: 'Don’t pick the highest fever (40.1°C) or rashes that fade white — catch stiff necks and non-fading dark spots!',
      bayDefaultLabel: 'Fever Audit',
      cards,
      evaluate(activeCards) {
        const targets = uniqueSortedIds(factsByTag(activeCards, 'exc').map((x) => x.p));
        const rivals = [b, e, d, f, a, c].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Overriding the "fever = flu" rule-of-thumb catches meningitis/sepsis exceptions on ${formatList(targets)}, ignoring higher-temp routine flu bays.`,
          rival: buildRivalInfo(targets, rivals, (r) => `${pName(r)} has a flexible neck and either clear skin or a fading rash — fitting routine flu care despite high fever.`),
        };
      },
    };
  },

  // #77 Non-monotonic reasoning (Inside · Meta)
  // Full priority-order inversion: 01:00 ranking (A > B > E > F > C > D) overturned by 01:18 STAT CT/Ultrasound evidence!
  'non-monotonic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: '01:00 Board', wingIndex: 0, label: 'Initial 01:00 Ranking (OLD)',
        shown: [
          fact(`01:00 Initial Rank: ${pName(a)} (#1) and ${pName(b)} (#2) OUTRANKED ${pName(c)} (#5) and ${pName(d)} (#6) for suspected internal bleed.`, [a, b, c, d], { tag: 'old' }),
          fact(`Revision Rule: Whenever 01:18 STAT Scans overturn the 01:00 rank, CANCEL old alerts and act ONLY on 01:18+ truth!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:15', wing: '01:18 Scans', wingIndex: 1, label: 'STAT Reversal A & B',
        shown: [
          fact(`01:18 CT: ${pName(a)} is 100% CLEAN — BP rebounded to 124/78.`, [a], { tag: 'clr', p: a }),
          fact(`01:18 CT: ${pName(b)} is 100% CLEAN — muscle spasm only, BP 122/76.`, [b], { tag: 'clr', p: b }),
        ],
        alt: [
          fact(`01:18 CT: ${pName(a)} CONFIRMED active spleen tear — BP plunging to 76/44.`, [a], { tag: 'urg', p: a }),
          fact(`01:18 CT: ${pName(b)} is 100% CLEAN — muscle spasm only, BP 122/76.`, [b], { tag: 'clr', p: b }),
        ],
      }),
      makeCard({
        index: 2, time: '01:18', wing: '01:18 Scans', wingIndex: 1, label: 'STAT Reversal C & D',
        shown: [
          fact(`01:18 Head CT: Quiet ${pName(c)} (formerly #5!) now has an expanding brain bleed — NOW OUTRANKS ${pName(a)} & ${pName(b)}!`, [c, a, b], { tag: 'urg', p: c }),
          fact(`01:18 Scan: ${pName(d)} stayed clean — steady BP 120/76.`, [d], { tag: 'clr', p: d }),
        ],
        alt: [
          fact(`01:18 Head CT: ${pName(c)} stayed clean — normal BP 120/76.`, [c], { tag: 'clr', p: c }),
          fact(`01:18 Chest Scan: Quiet ${pName(d)} (formerly #6!) now has blood filling the chest — NOW OUTRANKS everyone!`, [d], { tag: 'urg', p: d }),
        ],
      }),
      makeCard({
        index: 3, time: '01:20', wing: '01:18 Scans', wingIndex: 1, label: 'STAT Reversal E & F',
        shown: [
          fact(`01:20 Scan: ${pName(e)} (formerly #3) is 100% CLEAN — pain resolved, BP 122/76.`, [e], { tag: 'clr', p: e }),
          fact(`01:20 Scan: ${pName(f)} (formerly #4) suddenly tore a pelvic vessel on ultrasound — BP 78/46!`, [f], { tag: 'urg', p: f }),
        ],
        alt: [
          fact(`01:20 Scan: ${pName(e)} (formerly #3) is 100% CLEAN — BP 122/76.`, [e], { tag: 'clr', p: e }),
          fact(`01:20 Scan: ${pName(f)} (formerly #4) is 100% CLEAN — BP 120/78.`, [f], { tag: 'clr', p: f }),
        ],
      }),
      makeCard({
        index: 4, time: '01:22', wing: '01:22 Vitals', wingIndex: 0, label: 'Drop Outdated Anchors',
        shown: [
          fact(`01:18–01:20 Scans OVERRIDE the 01:00 board completely — don't cling to old #1/#2 ranks once cleared!`, [], { tag: 'rule' }),
          fact(`Check ALL SIX 01:18–01:20 scan updates before booking OR rooms.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:24', wing: 'OR Charge', wingIndex: 1, label: 'Roll Updated Urgents',
        shown: [
          fact(`Send to Emergency OR EVERY patient confirmed actively bleeding on the LATEST 01:18–01:20 scans.`, [], { tag: 'rule' }),
          fact(`Cancel OR holds on all newly cleared bays.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'STAT Scan Board Reversal',
      dispatch: 'New 01:18–01:20 STAT scans completely flipped the 01:00 priority board — retract old alerts and act on the new truth.',
      order: 'Send to Emergency OR EVERY patient confirmed actively bleeding on the LATEST 01:18–01:20 STAT scans.',
      hint: 'Discard the outdated 01:00 ranking — follow ONLY the 01:18–01:20 scan findings.',
      bayDefaultLabel: 'Scan Update',
      cards,
      evaluate(activeCards) {
        const targets = uniqueSortedIds(factsByTag(activeCards, 'urg').map((x) => x.p));
        const rivals = [a, b, e, c, d, f].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Retracting the outdated 01:00 priority ranks in light of the 01:18–01:20 STAT scans shifts OR priority strictly to ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, rivals, (r) => `${pName(r)} was cleared 100% clean on the latest 01:18–01:20 scan despite earlier 01:00 suspicion.`),
        };
      },
    };
  },

  // #78 Ontological reasoning (Before · Meta)
  // Sorting 6 urgent alarms by fundamental kind of reality: Physical Mechanical Tear/Block vs. Blood Chemistry vs. Legal/Social Dispute
  'ontological-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Crisis Kinds', wingIndex: 0, label: 'Three Distinct Categories',
        shown: [
          fact(`Sort by fundamental KIND, not loudness: (1) Mechanical Tear/Block → Trauma Surgeon · (2) Blood Chemistry/Overdose → Medicine Drip · (3) Legal/Family Dispute → Ethics/Social Work.`, [], { tag: 'rule' }),
          fact(`A scalpel CANNOT fix blood sugar or power-of-attorney fights — page Surgery ONLY for Mechanical Tears/Blocks!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Pages A', wingIndex: 1, label: 'Urgent Pages A & B',
        shown: [
          fact(`${pName(a)}: Glass sliced the thigh artery open — bright blood pulsing from the wound.`, [a], { tag: 'k', p: a, kind: 'mech' }),
          fact(`${pName(b)}: Missed insulin 3 days — blood sugar 640, fruity breath, rapid breathing.`, [b], { tag: 'k', p: b, kind: 'chem' }),
        ],
        alt: [
          fact(`${pName(a)}: Swallowed 30 blood-pressure pills — needs chemical antidote drip, zero wounds.`, [a], { tag: 'k', p: a, kind: 'chem' }),
          fact(`${pName(b)}: Steel rod punctured right chest wall — trapped air collapsing the lung.`, [b], { tag: 'k', p: b, kind: 'mech' }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Pages B', wingIndex: 1, label: 'Urgent Pages C & D',
        shown: [
          fact(`${pName(c)}: Two siblings shouting over who holds legal power of attorney for discharge.`, [c], { tag: 'k', p: c, kind: 'legal' }),
          fact(`${pName(d)}: Crushed windpipe ring physically blocking airflow — SAME crisis kind as ${pName(a)}.`, [d, a], { tag: 'k', p: d, kind: 'mech' }),
        ],
        alt: [
          fact(`${pName(c)}: Torn spleen leaking blood into the belly after a 12-foot ladder fall.`, [c], { tag: 'k', p: c, kind: 'mech' }),
          fact(`${pName(d)}: Blood sugar plunged to 28 — needs IV sugar drip, zero physical injury.`, [d], { tag: 'k', p: d, kind: 'chem' }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Pages C', wingIndex: 0, label: 'Urgent Pages E & F',
        shown: [
          fact(`${pName(e)}: Severe potassium overdose slowing heart rhythm — needs IV calcium blocker.`, [e], { tag: 'k', p: e, kind: 'chem' }),
          fact(`${pName(f)}: Insurance refusal blocking rehab transfer — family demanding the department chief.`, [f], { tag: 'k', p: f, kind: 'legal' }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Crisis Kinds', wingIndex: 0, label: 'Urgent ≠ Surgical',
        shown: [
          fact(`${pName(b)} and ${pName(e)} are genuinely life-threatening YET chemical — routing them to OR delays their antidote!`, [b, e], { tag: 'note' }),
          fact(`Only physical structural tears/blocks belong on the Trauma Surgeon's table.`, [], { tag: 'rule' }),
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
      hint: 'Separate physical structural tears/blocks from chemical/sugar/potassium emergencies and legal/family disputes.',
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
  // Extracting the cross-organ invariant from Skull + Heart-Sac ("Swelling inside a rigid unstretchable shell crushes flow")
  // and transferring it across 6 brand-new organs (Shin, Eye Socket, Burn-Scar Hand, Forearm Cast vs. Soft Rash/Ankles)
  'analogical-abstraction': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Deep Pattern', wingIndex: 0, label: 'Two Cases → One Invariant',
        shown: [
          fact(`Case 1 (Skull): Bleed inside rigid bone box → crushed brain. Case 2 (Heart Sac): Fluid inside tough sac → crushed heart.`, [], { tag: 'rule' }),
          fact(`Shared Law: Swelling trapped inside a RIGID UNSTRETCHABLE SHELL cuts off blood flow → needs immediate pressure release!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'New Organs A', wingIndex: 1, label: 'Bays A & B',
        shown: [
          fact(`${pName(a)}: Shin muscle rock-hard inside its tight tough sleeve → foot cold, pale, ZERO pulse.`, [a], { tag: 'box', p: a, trap: true }),
          fact(`${pName(b)}: Soft itchy hives across both arms → loose skin, warm pink hands, strong pulses.`, [b], { tag: 'box', p: b, trap: false }),
        ],
        alt: [
          fact(`${pName(a)}: Soft surface shin bruise → loose tissue, warm foot, strong pulse.`, [a], { tag: 'box', p: a, trap: false }),
          fact(`${pName(b)}: Forearm swelled rock-hard inside tight plaster cast → fingers pale, numb, vanishing pulse.`, [b], { tag: 'box', p: b, trap: true }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'New Organs B', wingIndex: 1, label: 'Bays C & D',
        shown: [
          fact(`${pName(c)}: Hand wrapped by tight leathery circular burn scar acting like a vise → finger blood flow STOPPED.`, [c], { tag: 'box', p: c, trap: true }),
          fact(`${pName(d)}: Puffy ankles after a long flight → soft when pressed, warm pink toes, strong pulses.`, [d], { tag: 'box', p: d, trap: false }),
        ],
        alt: [
          fact(`${pName(c)}: Mild sunburn across shoulders → soft skin, normal blood flow.`, [c], { tag: 'box', p: c, trap: false }),
          fact(`${pName(d)}: Bleed trapped behind rigid bony eye socket → eye bulging rock-hard, vision fading.`, [d], { tag: 'box', p: d, trap: true }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'New Organs C', wingIndex: 0, label: 'Bays E & F (Lookalikes)',
        shown: [
          fact(`${pName(e)}: Swollen knee joint — soft fluid pocket, warm foot, strong foot pulse.`, [e], { tag: 'box', p: e, trap: false }),
          fact(`${pName(f)}: Huge swollen lip from bee sting — loose soft tissue, pink color, open airway.`, [f], { tag: 'box', p: f, trap: false }),
        ],
      }),
      makeCard({
        index: 4, time: '01:18', wing: 'Deep Pattern', wingIndex: 0, label: 'Rigid Shell + Flow Cutoff',
        shown: [
          fact(`All six bays are SWOLLEN — ignore surface puffiness (${pName(d)}, ${pName(e)}, ${pName(f)}) where tissue stays soft and pulses stay strong!`, [d, e, f], { tag: 'note' }),
          fact(`Look ONLY for the deep invariant: Rigid unstretchable shell + rock-hard pressure + lost downstream pulse/vision.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:21', wing: 'Release OR', wingIndex: 1, label: 'Cut Pressure Now',
        shown: [
          fact(`Apply the skull/heart-sac invariant to tonight's limb, cast, burn, and eye bays.`, [], { tag: 'rule' }),
          fact(`Release pressure immediately for EVERY bay trapped inside a rigid shell cutting off blood flow.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'One Deep Law Across Organs',
      dispatch: 'Extract the "rigid shell + trapped swelling = lost blood flow" law from Skull/Heart cases and spot it in six swollen bays.',
      order: 'Release pressure immediately for EVERY patient whose swelling is trapped in a rigid shell cutting off blood flow.',
      hint: 'Separate rock-hard rigid-shell traps (tight sleeve, cast, burn vise, bony eye socket) from soft swelling with strong pulses.',
      bayDefaultLabel: 'Pressure Trap',
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'box');
        const targets = uniqueSortedIds(list.filter((x) => x.trap).map((x) => x.p));
        const rivals = list.filter((x) => !x.trap).map((x) => x.p);
        return {
          targets,
          proof: `Transferring the "swelling in a rigid unstretchable shell crushes flow" invariant isolates ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, rivals, (r) => `${pName(r)} has soft, loose surface swelling with intact warm blood flow and strong pulses.`),
        };
      },
    };
  },

  // #80 Integrative reasoning (Inside · Meta — Grand Capstone!)
  // Synthesizes ALL major trauma loops: 01:15 Scan Update (overturning 01:00 guess) ∩ Shock (BP < 90 OR HR > Top BP) ∩ Full Code!
  'integrative-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Trauma Chief', wingIndex: 0, label: '3-Gate Chief Protocol',
        shown: [
          fact(`Roll to OR ONLY if ALL 3 gates pass: (1) 01:15 STAT Scan POSITIVE (overriding 01:00 guess!) + (2) Shock (BP < 90 OR HR > Top BP) + (3) Verified Full Code!`, [], { tag: 'rule' }),
          fact(`Honor verified DNRs, retract cleared 01:00 guesses, and catch compensated young shock (HR > Top BP)!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: '01:00 Intake', wingIndex: 1, label: 'Outdated 01:00 Guesses',
        shown: [
          fact(`01:00 Early Guess: ${pName(b)} looked highest risk (70%) > ${pName(a)} (40%) > ${pName(e)} (35%).`, [b, a, e], { tag: 'old' }),
          fact(`Wait for 01:15 STAT Scans below before acting — early guesses can flip!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 2, time: '01:15', wing: 'STAT Scans', wingIndex: 0, label: 'Gate 1: 01:15 Scan Results',
        shown: [
          fact(`POSITIVE internal bleed: ${pName(a)}, ${pName(c)}, ${pName(d)}, and ${pName(e)}.`, [a, c, d, e], { tag: 'pos', ps: [a, c, d, e] }),
          fact(`100% CLEAN (zero bleed): ${pName(b)} and ${pName(f)}.`, [b, f], { tag: 'neg', ps: [b, f] }),
        ],
        alt: [
          fact(`POSITIVE internal bleed: ${pName(b)}, ${pName(c)}, ${pName(d)}, and ${pName(e)}.`, [b, c, d, e], { tag: 'pos', ps: [b, c, d, e] }),
          fact(`100% CLEAN (zero bleed): ${pName(a)} and ${pName(f)}.`, [a, f], { tag: 'neg', ps: [a, f] }),
        ],
      }),
      makeCard({
        index: 3, time: '01:20', wing: 'Live Monitors', wingIndex: 1, label: 'Gate 2: BP & Heart Rate',
        shown: [
          fact(`${pName(a)}: BP 80/46, HR 134 · ${pName(b)}: BP 122/78, HR 78 · ${pName(c)}: BP 82/48, HR 136.`, [a, b, c], { tag: 'vit', list: [{ p: a, bp: 80, hr: 134 }, { p: b, bp: 122, hr: 78 }, { p: c, bp: 82, hr: 136 }] }),
          fact(`${pName(d)}: BP 118/76, HR 134 · ${pName(e)}: BP 120/76, HR 84 · ${pName(f)}: BP 84/50, HR 128.`, [d, e, f], { tag: 'vit', list: [{ p: d, bp: 118, hr: 134 }, { p: e, bp: 120, hr: 84 }, { p: f, bp: 84, hr: 128 }] }),
        ],
        alt: [
          fact(`${pName(a)}: BP 120/76, HR 82 · ${pName(b)}: BP 78/44, HR 138 · ${pName(c)}: BP 84/50, HR 132.`, [a, b, c], { tag: 'vit', list: [{ p: a, bp: 120, hr: 82 }, { p: b, bp: 78, hr: 138 }, { p: c, bp: 84, hr: 132 }] }),
          fact(`${pName(d)}: BP 86/52, HR 130 · ${pName(e)}: BP 122/78, HR 86 · ${pName(f)}: BP 84/50, HR 128.`, [d, e, f], { tag: 'vit', list: [{ p: d, bp: 86, hr: 130 }, { p: e, bp: 122, hr: 86 }, { p: f, bp: 84, hr: 128 }] }),
        ],
      }),
      makeCard({
        index: 4, time: '01:23', wing: 'Ethics File', wingIndex: 0, label: 'Gate 3: Verified Code Status',
        shown: [
          fact(`Verified FULL CODE: ${pName(a)}, ${pName(b)}, ${pName(d)}, ${pName(e)}, and ${pName(f)}.`, [a, b, d, e, f], { tag: 'fc', ps: [a, b, d, e, f] }),
          fact(`Verified Signed Comfort-Only DNR: ${pName(c)} (must honor Comfort Care!).`, [c], { tag: 'dnr', p: c }),
        ],
        alt: [
          fact(`Verified FULL CODE: ${pName(a)}, ${pName(b)}, ${pName(c)}, ${pName(e)}, and ${pName(f)}.`, [a, b, c, e, f], { tag: 'fc', ps: [a, b, c, e, f] }),
          fact(`Verified Signed Comfort-Only DNR: ${pName(d)} (must honor Comfort Care!).`, [d], { tag: 'dnr', p: d }),
        ],
      }),
      makeCard({
        index: 5, time: '01:25', wing: 'OR Charge', wingIndex: 1, label: 'Execute Full Chief Loop',
        shown: [
          fact(`Intersect Gate 1 (01:15 Scan +) ∩ Gate 2 (BP < 90 OR HR > BP) ∩ Gate 3 (Full Code)!`, [], { tag: 'rule' }),
          fact(`Roll ONLY the bays passing all three gates straight into Emergency OR.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Full Trauma Chief Workup',
      dispatch: 'Capstone loop: integrate STAT scan reversals, compensated shock (BP < 90 or HR > Top BP), and Full-Code ethics across all six bays.',
      order: 'Roll to OR EVERY patient who is 01:15 Scan-POSITIVE, in shock (BP < 90 OR HR > Top BP), AND Full Code.',
      hint: 'Check Gate 1 (Scan +) ∩ Gate 2 (BP < 90 or HR > Top BP) ∩ Gate 3 (Full Code) — don’t miss HR > BP or DNRs!',
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
            if (!pos.has(r)) return `${pName(r)}'s 01:15 STAT scan was 100% clean, overturning earlier guesses.`;
            if (!fc.has(r)) return `${pName(r)} has a verified Comfort-Only DNR that must be honored.`;
            return `${pName(r)}'s vitals show no shock (BP ≥ 90 and HR ≤ Top BP).`;
          }),
        };
      },
    };
  },
};
