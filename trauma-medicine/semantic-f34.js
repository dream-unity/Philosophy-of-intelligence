// Deep Plain-English Clinical Reasoning Engines — Families 3 & 4 (#21–#41)
// Relational, abstract, spatial, temporal, quantitative & predictive medical emergencies.
// Zero filler cards, zero pre-computed math giveaways, zero medical jargon, synchronized left-wall labels.

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
  'analogical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Trauma Brief', wingIndex: 0, label: 'Reference Pattern',
        shown: [
          fact(`Think of a stalled engine: a FULL gas tank with a PINCHED fuel line still starves the motor — pouring MORE gas in fixes nothing until you clear the pinch!`, [], { tag: 'rule' }),
          fact(`Match this EXACT structure to our trauma bays: normal blood volume + healthy heart, yet ONE pinched/clotted pipe is starving a limb.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Bay Exams', wingIndex: 1, label: 'Circulation Check 1',
        shown: [
          fact(`${pName(a)}: Full normal blood count, strong steady heartbeat — yet the RIGHT leg is ice-cold, pale, and has ZERO foot pulse.`, a, { tag: 'pinched' }),
          fact(`${pName(b)}: Lost half their blood from a deep thigh gash; BOTH legs and hands are cold (empty tank).`, b, { tag: 'empty' }),
        ],
        alt: [
          fact(`${pName(c)}: Full normal blood count, strong steady heartbeat — yet the RIGHT leg is ice-cold, pale, and has ZERO foot pulse.`, c, { tag: 'pinched' }),
          fact(`${pName(b)}: Lost half their blood from a deep thigh gash; BOTH legs and hands are cold (empty tank).`, b, { tag: 'empty' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Bay Exams', wingIndex: 1, label: 'Circulation Check 2',
        shown: [
          fact(`${pName(c)}: Heart muscle is barely beating (broken motor); blood backs up into both lungs.`, c, { tag: 'motor' }),
          fact(`${pName(d)}: Warm feet, strong pulses in all limbs, only a bruised knee from a fall.`, d, { tag: 'safe', calm: true }),
        ],
        alt: [
          fact(`${pName(a)}: Heart muscle is barely beating (broken motor); blood backs up into both lungs.`, a, { tag: 'motor' }),
          fact(`${pName(d)}: Warm feet, strong pulses in all limbs, only a bruised knee from a fall.`, d, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Trauma Brief', wingIndex: 0, label: 'Doppler Ultrasound',
        shown: [
          fact(`Vascular probe confirms a hard clot blocking the single main artery feeding ${pName(a)}'s right leg.`, a, { tag: 'clot_line' }),
          fact(`${pName(a)}'s left leg is warm and pink — proving the heart and blood tank work fine.`, a, { tag: 'note' }),
        ],
        alt: [
          fact(`Vascular probe confirms a hard clot blocking the single main artery feeding ${pName(c)}'s right leg.`, c, { tag: 'clot_line' }),
          fact(`${pName(c)}'s left leg is warm and pink — proving the heart and blood tank work fine.`, c, { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Bay Exams', wingIndex: 1, label: 'Treatment Mismatch',
        shown: [
          fact(`Giving blood bags helps an empty tank (${pName(b)}), NOT a blocked artery!`, b, { tag: 'note' }),
          fact(`${pName(e)} has a minor wrist sprain and warm hands.`, e, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Trauma Brief', wingIndex: 0, label: 'Vascular Surgeon Call',
        shown: [
          fact(`${pName(f)} is cleared to go home after skin glue.`, f, { tag: 'safe', calm: true }),
          fact(`Rush the patient whose body matches the "full tank + working motor + pinched single line" structure to artery surgery.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'The Pinched Fuel Line',
      dispatch: 'Three patients have cold limbs — map the "full tank, working motor, pinched fuel line" structure to pick the lone artery clot.',
      order: 'Send ONLY the patient matching the "pinched single line" structure to the vascular artery surgeon.',
      hint: 'Distinguish a single blocked pipe (one cold limb, normal tank & heart) from an empty tank or broken motor.',
      bayDefaultLabel: 'Limb Flow Eval',
      bayLabels: { [d]: 'Minor · Stable', [e]: 'Minor · Stable', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const p = tagSet(activeCards, 'pinched');
        const cl = tagSet(activeCards, 'clot_line');
        const targets = uniqueSortedIds([...p].filter((id) => cl.has(id)));
        const rivals = [...tagSet(activeCards, 'empty'), ...tagSet(activeCards, 'motor')];
        return {
          targets,
          proof: `${formatList(targets)} match the exact structure: full blood tank and strong heart, yet one pinched/clotted artery starving a single limb.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} has an empty tank (bleeding) or broken motor (weak heart), not a single pinched line.`),
        };
      },
    };
  },

  // #22 Anomalous reasoning (Inside · Atomic)
  'anomalous-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'ICU Monitors', wingIndex: 0, label: 'Normal Body Reflex',
        shown: [
          fact(`Normal survival reflex: whenever blood pressure DROPS, the heart automatically speeds UP fast (115–140 BPM) to keep the brain alive.`, [], { tag: 'rule' }),
          fact(`When blood pressure crashes AND heart rate DROPS slow (< 55 BPM) instead, it signals a dangerous hidden nerve/brain-pressure trap!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Bay Vitals', wingIndex: 1, label: 'Monitor Group A',
        shown: [
          fact(`${pName(a)}: Blood pressure fell 124 → 82 · Heart rate sped up 78 → 134 BPM.`, a, { tag: 'normal_resp' }),
          fact(`${pName(b)}: Blood pressure fell 118 → 76 · Heart rate DROPPED 80 → 46 BPM!`, b, { tag: 'anom' }),
        ],
        alt: [
          fact(`${pName(a)}: Blood pressure fell 124 → 82 · Heart rate DROPPED 80 → 46 BPM!`, a, { tag: 'anom' }),
          fact(`${pName(b)}: Blood pressure fell 118 → 76 · Heart rate sped up 78 → 134 BPM.`, b, { tag: 'normal_resp' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Bay Vitals', wingIndex: 1, label: 'Monitor Group B',
        shown: [
          fact(`${pName(c)}: Blood pressure fell 120 → 86 · Heart rate sped up 74 → 122 BPM.`, c, { tag: 'normal_resp' }),
          fact(`${pName(d)}: Blood pressure fell 116 → 80 · Heart rate sped up 82 → 130 BPM.`, d, { tag: 'normal_resp' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'ICU Monitors', wingIndex: 0, label: 'Monitor Group C',
        shown: [
          fact(`${pName(e)}: Blood pressure fell 126 → 88 · Heart rate sped up 76 → 118 BPM.`, e, { tag: 'normal_resp' }),
          fact(`${pName(f)}: Blood pressure stayed completely steady at 118/74 · Heart rate calm at 72 BPM.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Bay Vitals', wingIndex: 1, label: 'Why Standard Fluids Fail',
        shown: [
          fact(`A racing heart with low pressure is normal shock compensation — standard fluids and pressure meds work as expected.`, [], { tag: 'rule' }),
          fact(`The ONE patient breaking the reflex rule needs an emergency neuro/spine check immediately.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'ICU Monitors', wingIndex: 0, label: 'Neuro Alert',
        shown: [
          fact(`Check every patient whose blood pressure dropped — ignore calm stable ${pName(f)}.`, f, { tag: 'note' }),
          fact(`Flag the single paradoxical vital-sign outlier to Neurosurgery right now.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'The Backward Heart Reflex',
      dispatch: 'Five patients have falling blood pressure — four follow the body’s normal reflex, while ONE breaks the rule completely.',
      order: 'Flag the SINGLE patient whose heart rate is moving in the dangerous opposite direction of the normal reflex.',
      hint: 'Compare blood-pressure direction vs heart-rate direction across all five dropping patients.',
      bayDefaultLabel: 'Vital Trend',
      bayLabels: { [f]: 'Stable · Calm' },
      cards,
      evaluate(activeCards) {
        const targets = uniqueSortedIds([...tagSet(activeCards, 'anom')]);
        const rivals = [...tagSet(activeCards, 'normal_resp')];
        return {
          targets,
          proof: `${formatList(targets)} broke the normal shock reflex: blood pressure crashed while heart rate dropped to 46 BPM instead of speeding up.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)}'s heart sped up properly (118–134 BPM) to compensate for falling pressure.`),
        };
      },
    };
  },

  // #23 Antinomic reasoning (After · Atomic)
  'antinomic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Pharmacy Gate', wingIndex: 0, label: 'Order Conflict Alert',
        shown: [
          fact(`Two different specialists typed active orders for the same trauma bay — ONE patient has two orders that directly cancel & endanger each other!`, [], { tag: 'rule' }),
          fact(`Halt the single patient with mutually incompatible clinical orders before the nurse pushes both drips.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Doctor Orders A', wingIndex: 1, label: '01:10 Cardiology Notes',
        shown: [
          fact(`${pName(a)}: Order #1 — "Start maximum-strength blood thinner immediately for suspected leg clot."`, a, { tag: 'thinner' }),
          fact(`${pName(b)}: Order #1 — "Give pain relief and cool compress for broken wrist."`, b, { tag: 'ok_b' }),
        ],
        alt: [
          fact(`${pName(c)}: Order #1 — "Start maximum-strength blood thinner immediately for suspected leg clot."`, c, { tag: 'thinner' }),
          fact(`${pName(b)}: Order #1 — "Give pain relief and cool compress for broken wrist."`, b, { tag: 'ok_b' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Doctor Orders B', wingIndex: 0, label: '01:12 Neurosurgery Notes',
        shown: [
          fact(`${pName(a)}: Order #2 — "STRICT ZERO BLOOD THINNERS — active bleeding inside the brain on head scan!"`, a, { tag: 'no_thinner' }),
          fact(`${pName(c)}: Order #2 — "Start gentle IV fluids and check temperature every 30 minutes."`, c, { tag: 'ok_c' }),
        ],
        alt: [
          fact(`${pName(c)}: Order #2 — "STRICT ZERO BLOOD THINNERS — active bleeding inside the brain on head scan!"`, c, { tag: 'no_thinner' }),
          fact(`${pName(a)}: Order #2 — "Start gentle IV fluids and check temperature every 30 minutes."`, a, { tag: 'ok_a' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Doctor Orders A', wingIndex: 1, label: '01:15 Trauma Notes',
        shown: [
          fact(`${pName(b)}: Order #2 — "Place fiberglass arm splint and repeat X-ray in 1 hour." (Fully compatible!)`, b, { tag: 'ok_b' }),
          fact(`${pName(d)}: Order #1 — "Give oxygen mask." · Order #2 — "Give asthma breathing mist." (Fully compatible!)`, d, { tag: 'ok_d' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Doctor Orders B', wingIndex: 0, label: 'Pharmacy Safety Check',
        shown: [
          fact(`${pName(e)}: Order #1 — "Give tetanus shot." · Order #2 — "Clean scrape with saline."`, e, { tag: 'safe', calm: true }),
          fact(`A patient cannot BOTH receive max blood thinners AND stay strictly blood-thinner-free at the same time.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Pharmacy Gate', wingIndex: 0, label: 'Stop-Line Call',
        shown: [
          fact(`${pName(f)} has no active medication orders — cleared to go home.`, f, { tag: 'safe', calm: true }),
          fact(`Trigger the Safety Hold on the single patient caught between two mutually incompatible doctor orders.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Clashing Specialist Orders',
      dispatch: 'Cardiology and Neurosurgery just entered orders simultaneously — catch the single patient whose two orders cannot both be true.',
      order: 'Place an immediate Safety Hold on the ONE patient with two mutually incompatible active orders.',
      hint: 'Check which patient has two separate specialist orders that directly forbid each other.',
      bayDefaultLabel: 'Order Audit',
      bayLabels: { [e]: 'Minor · Stable', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const t = tagSet(activeCards, 'thinner');
        const nt = tagSet(activeCards, 'no_thinner');
        const targets = uniqueSortedIds([...t].filter((id) => nt.has(id)));
        const rivals = [a, b, c, d].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `${formatList(targets)} cannot simultaneously receive maximum blood thinners and obey a strict zero-blood-thinner brain-bleed order — both orders directly negate each other.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)}'s specialist orders complement each other cleanly without contradiction.`),
        };
      },
    };
  },

  // #24 Antithetical reasoning (Inside · Atomic)
  'antithetical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Tox Reference', wingIndex: 0, label: 'Reference Drug Profile',
        shown: [
          fact(`Sedative Overdose Reference: FREEZING COLD skin (94°F) + SLOW heart (44 BPM) + PINPOINT tiny pupils + limp sleepy muscles.`, [], { tag: 'rule' }),
          fact(`Antidote B works ONLY on the EXACT OPPOSITE extreme across ALL FOUR signs (overheated + racing heart + wide-open pupils + rigid agitated muscles).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Bedside Exam', wingIndex: 1, label: 'Bay Check 1',
        shown: [
          fact(`${pName(a)}: Burning hot 104°F · Racing heart 146 BPM · Huge wide-open pupils · Rigid shaking muscles.`, a, { tag: 'opp' }),
          fact(`${pName(b)}: Burning hot 103°F · Racing heart 132 BPM · PINPOINT tiny pupils · Sleepy limp muscles.`, b, { tag: 'partial' }),
        ],
        alt: [
          fact(`${pName(c)}: Burning hot 104°F · Racing heart 146 BPM · Huge wide-open pupils · Rigid shaking muscles.`, c, { tag: 'opp' }),
          fact(`${pName(b)}: Burning hot 103°F · Racing heart 132 BPM · PINPOINT tiny pupils · Sleepy limp muscles.`, b, { tag: 'partial' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Bedside Exam', wingIndex: 1, label: 'Bay Check 2',
        shown: [
          fact(`${pName(c)}: Normal temp 98.6°F · Normal heart 76 BPM · Normal pupils · Calm relaxed muscles.`, c, { tag: 'neutral' }),
          fact(`${pName(d)}: Cold 95°F · Slow heart 48 BPM · Pinpoint tiny pupils · Limp drowsy muscles (same as reference!).`, d, { tag: 'same' }),
        ],
        alt: [
          fact(`${pName(a)}: Normal temp 98.6°F · Normal heart 76 BPM · Normal pupils · Calm relaxed muscles.`, a, { tag: 'neutral' }),
          fact(`${pName(d)}: Cold 95°F · Slow heart 48 BPM · Pinpoint tiny pupils · Limp drowsy muscles (same as reference!).`, d, { tag: 'same' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Tox Reference', wingIndex: 0, label: 'Partial Match Trap',
        shown: [
          fact(`Watch out: a normal calm patient (${pName(c)} or neutral) is NOT the opposite extreme, and matching only 2 of 4 signs fails!`, [], { tag: 'rule' }),
          fact(`${pName(e)} has hot 102°F fever from strep throat, normal pupils, and relaxed muscles.`, e, { tag: 'partial' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Bedside Exam', wingIndex: 1, label: 'Safety Check',
        shown: [
          fact(`Giving cooling Antidote B to a sleepy overdose patient (${pName(d)}) would stop their breathing!`, d, { tag: 'note' }),
          fact(`${pName(f)} came in for a splinter removal; all vitals normal.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Tox Reference', wingIndex: 0, label: 'Cooling Antidote Ready',
        shown: [
          fact(`Verify ALL FOUR flipped dimensions: Hot (vs Cold), Racing (vs Slow), Wide Pupils (vs Pinpoint), Rigid Agitated (vs Limp Sleepy).`, [], { tag: 'rule' }),
          fact(`Treat the single patient sitting at the complete opposite pole.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Mirror-Opposite Overdose',
      dispatch: 'Multiple overdose patients arrived together — Antidote B treats ONLY the complete mirror-opposite of a sleepy sedative overdose.',
      order: 'Give Antidote B ONLY to the patient showing the exact opposite extreme across ALL FOUR vital signs.',
      hint: 'Check temperature, heart rate, pupil size, and muscle state against the cold/slow/pinpoint/limp reference.',
      bayDefaultLabel: 'Overdose Eval',
      bayLabels: { [f]: 'Minor · Stable' },
      cards,
      evaluate(activeCards) {
        const targets = uniqueSortedIds([...tagSet(activeCards, 'opp')]);
        const rivals = [...tagSet(activeCards, 'partial'), ...tagSet(activeCards, 'same')];
        return {
          targets,
          proof: `${formatList(targets)} sit at the complete opposite pole on all four signs (burning hot, racing heart, wide-open pupils, rigid shaking muscles).`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} matches only part of the opposite profile (or matches the sleepy reference itself).`),
        };
      },
    };
  },

  // #25 Higher-order relational reasoning (Inside · Composite)
  'higher-order-relational': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Trend Monitor', wingIndex: 0, label: 'Rate vs Raw Number',
        shown: [
          fact(`A steady low-normal person can be completely safe, while a person losing a HUGE FRACTION of their normal baseline is bleeding out!`, [], { tag: 'rule' }),
          fact(`Compare each patient's DROP relative to their own starting blood pressure (not just who has the lowest raw number right now).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Vitals Log', wingIndex: 1, label: '15-Min Shift: Pair 1',
        shown: [
          fact(`${pName(a)}: Baseline 150 → now 96 over the last 15 minutes.`, a, { tag: 'shift', start: 150, now: 96 }),
          fact(`${pName(b)}: Baseline 98 → now 92 over the last 15 minutes (always runs low-normal!).`, b, { tag: 'shift', start: 98, now: 92 }),
        ],
        alt: [
          fact(`${pName(a)}: Baseline 104 → now 96 over the last 15 minutes.`, a, { tag: 'shift', start: 104, now: 96 }),
          fact(`${pName(b)}: Baseline 152 → now 94 over the last 15 minutes.`, b, { tag: 'shift', start: 152, now: 94 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Vitals Log', wingIndex: 1, label: '15-Min Shift: Pair 2',
        shown: [
          fact(`${pName(c)}: Baseline 120 → now 108 over the last 15 minutes.`, c, { tag: 'shift', start: 120, now: 108 }),
          fact(`${pName(d)}: Baseline 116 → now 106 over the last 15 minutes.`, d, { tag: 'shift', start: 116, now: 106 }),
        ],
        alt: [
          fact(`${pName(c)}: Baseline 120 → now 108 over the last 15 minutes.`, c, { tag: 'shift', start: 120, now: 108 }),
          fact(`${pName(d)}: Baseline 116 → now 106 over the last 15 minutes.`, d, { tag: 'shift', start: 116, now: 106 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Trend Monitor', wingIndex: 0, label: 'Why Raw 92 Can Mislead',
        shown: [
          fact(`A marathon runner whose normal pressure is 98 dipping to 92 barely changed (~6% drop).`, [], { tag: 'rule' }),
          fact(`Someone crashing by over a THIRD of their starting pressure is in active hidden internal hemorrhage!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Vitals Log', wingIndex: 1, label: 'Other Arrivals',
        shown: [
          fact(`${pName(e)}: Baseline 118 → now 116 (steady, bruised elbow).`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)}: Baseline 122 → now 122 (cleared to go home).`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Trend Monitor', wingIndex: 0, label: 'Emergency Scan Call',
        shown: [
          fact(`Only ONE emergency trauma scanner slot is open right now.`, [], { tag: 'rule' }),
          fact(`Compare the RELATIVE DROPS across all four monitored patients and scan the steepest collapse first.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Hidden Baseline Collapse',
      dispatch: 'One patient has a lower raw number, but another is plummeting dramatically from their normal baseline — compare the drops!',
      order: 'Send the SINGLE patient experiencing the steepest drop relative to their own baseline to the trauma scanner.',
      hint: 'Compare how far each patient fell from their starting baseline, rather than grabbing the lowest current number.',
      bayDefaultLabel: 'BP Trend Watch',
      bayLabels: { [e]: 'Minor · Stable', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const shifts = factsByTag(activeCards, 'shift').map((s) => ({
          id: s.patients[0],
          start: s.start,
          now: s.now,
          drop: s.start - s.now,
          pct: (s.start - s.now) / s.start,
        }));
        shifts.sort((x, y) => y.pct - x.pct);
        const top = shifts[0];
        const lowRaw = [...shifts].sort((x, y) => x.now - y.now)[0];
        const targets = top ? [top.id] : [];
        const rivals = [lowRaw?.id, shifts[1]?.id].filter((id) => id && id !== top?.id);
        return {
          targets,
          proof: `${pName(top.id)} plunged ${top.drop} points (${top.start} → ${top.now}, ${Math.round(top.pct * 100)}% of baseline), dwarfing every other dip.`,
          rival: buildRivalInfo(targets, rivals, (id) => {
            const r = shifts.find((s) => s.id === id);
            return `${pName(id)} only dipped ${r.drop} points (${r.start} → ${r.now}), even if their raw number looked low.`;
          }),
        };
      },
    };
  },

  // #26 Cross-domain reasoning (After · Composite)
  'cross-domain-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Safety Model', wingIndex: 0, label: 'Aviation "Sterile Cockpit"',
        shown: [
          fact(`Aviation Law: Below 10,000 feet (takeoff & landing), pilots ban ALL non-essential chatter and interruptions because one split-second distraction causes crashes.`, [], { tag: 'rule' }),
          fact(`Transfer this exact rule to our ER: protect any high-stakes "landing" moment (delicate airway tube, fatal drug mix, or death notification) currently flooded with distractions!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Ward Floor', wingIndex: 1, label: 'Room Check 1',
        shown: [
          fact(`${pName(a)}'s room: Doctor is delivering a sudden death notification to the spouse while two billing clerks barge in asking for insurance cards and a TV blares.`, a, { tag: 'viol' }),
          fact(`${pName(b)}'s bay: Calmly waiting for a foot X-ray while chatting with a friend about weekend sports.`, b, { tag: 'low_stakes' }),
        ],
        alt: [
          fact(`${pName(c)}'s room: Doctor is delivering a sudden death notification to the spouse while two billing clerks barge in asking for insurance cards and a TV blares.`, c, { tag: 'viol' }),
          fact(`${pName(b)}'s bay: Calmly waiting for a foot X-ray while chatting with a friend about weekend sports.`, b, { tag: 'low_stakes' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Ward Floor', wingIndex: 1, label: 'Room Check 2',
        shown: [
          fact(`${pName(c)}'s bay: Nurse is calculating a high-risk pediatric heart dose while a phone rings nonstop and three staff ask lunch questions.`, c, { tag: 'viol' }),
          fact(`${pName(d)}'s bay: Surgeon is stitching a delicate artery in total focused silence (door closed, zero interruptions).`, d, { tag: 'protected' }),
        ],
        alt: [
          fact(`${pName(a)}'s bay: Nurse is calculating a high-risk pediatric heart dose while a phone rings nonstop and three staff ask lunch questions.`, a, { tag: 'viol' }),
          fact(`${pName(d)}'s bay: Surgeon is stitching a delicate artery in total focused silence (door closed, zero interruptions).`, d, { tag: 'protected' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Safety Model', wingIndex: 0, label: 'Cruising Altitude vs Landing',
        shown: [
          fact(`Routine low-stakes moments (waiting for X-ray, discharge paperwork) are "cruising altitude" — normal chatter is fine!`, [], { tag: 'rule' }),
          fact(`High-stakes moments ALREADY in quiet focus (${pName(d)}) need NO intervention — don't disrupt them!`, d, { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Ward Floor', wingIndex: 1, label: 'Other Rooms',
        shown: [
          fact(`${pName(e)}'s room: Post-stitch discharge instructions in a quiet cubicle with zero interruptions.`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)}'s room: Reading a magazine while waiting for a ride home.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Safety Model', wingIndex: 0, label: 'Enforce Silence',
        shown: [
          fact(`Step in and lock the door ONLY on rooms combining HIGH-STAKES "landing" work WITH active non-essential distractions.`, [], { tag: 'rule' }),
          fact(`Two critical rooms are violating Sterile Cockpit right now.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Sterile Cockpit in the ER',
      dispatch: 'Borrow aviation’s "Sterile Cockpit" law to stop dangerous interruptions during the ER’s highest-stakes moments.',
      order: 'Lock down and clear distractions in EVERY room currently violating the Sterile Cockpit safety rule.',
      hint: 'Find rooms with BOTH a high-stakes irreversible moment AND active non-essential interruptions.',
      bayDefaultLabel: 'Safety Audit',
      bayLabels: { [b]: 'Minor · X-Ray', [e]: 'Cleared · Home', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const targets = uniqueSortedIds([...tagSet(activeCards, 'viol')]);
        const rivals = [...tagSet(activeCards, 'protected'), ...tagSet(activeCards, 'low_stakes')];
        return {
          targets,
          proof: `Transferring aviation's Sterile Cockpit rule pinpoints ${formatList(targets)}: both are high-stakes irreversible moments currently flooded with avoidable interruptions.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)}'s room is either already protected in silence or low-stakes routine waiting.`),
        };
      },
    };
  },

  // #27 Abstract reasoning (Before · Composite)
  'abstract-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Hospital Flow', wingIndex: 0, label: 'Bottleneck Structure',
        shown: [
          fact(`Ignore the medical specialty names — look at the dependency graph: ONE patient is sitting on the sole shared bottleneck blocking THREE other critical workflows!`, [], { tag: 'rule' }),
          fact(`Clearing that single upstream bottleneck immediately unblocks everyone behind them.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Dept Status', wingIndex: 1, label: 'Resource Hold 1',
        shown: [
          fact(`${pName(a)} is occupying the hospital's ONLY emergency CT scanner — already finished scanning, just waiting for a porter to wheel them out!`, a, { tag: 'blocker' }),
          fact(`${pName(b)} (Head Trauma), ${pName(c)} (Chest Tear), and ${pName(d)} (Belly Bleed) are ALL frozen waiting for that exact CT scanner.`, [b, c, d], { tag: 'blocked' }),
        ],
        alt: [
          fact(`${pName(b)} is occupying the hospital's ONLY emergency CT scanner — already finished scanning, just waiting for a porter to wheel them out!`, b, { tag: 'blocker' }),
          fact(`${pName(a)} (Head Trauma), ${pName(c)} (Chest Tear), and ${pName(d)} (Belly Bleed) are ALL frozen waiting for that exact CT scanner.`, [a, c, d], { tag: 'blocked' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Dept Status', wingIndex: 1, label: 'Resource Hold 2',
        shown: [
          fact(`${pName(c)} is sitting in Hallway Bed 4 — blocking zero other patients.`, c, { tag: 'leaf' }),
          fact(`${pName(d)} is sitting in Hallway Bed 7 — blocking zero other patients.`, d, { tag: 'leaf' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Hospital Flow', wingIndex: 0, label: 'Downstream Effect',
        shown: [
          fact(`None of the three waiting surgeries can even begin until the scanner bed clears.`, [], { tag: 'rule' }),
          fact(`Moving the single patient holding the scanner takes 90 seconds and unlocks 3 surgical bays at once.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Dept Status', wingIndex: 1, label: 'Parallel Room',
        shown: [
          fact(`${pName(e)} is in Stitch Room 2 (three other stitch rooms are empty — zero bottleneck).`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)} is checking out at the front desk.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Hospital Flow', wingIndex: 0, label: 'Dispatch Porter',
        shown: [
          fact(`You have ONE free porter right now — don't move a downstream patient who is still stuck waiting!`, [], { tag: 'rule' }),
          fact(`Clear the single upstream node holding the whole queue hostage.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'The Single-Point Bottleneck',
      dispatch: 'Three urgent departments are completely stalled — strip away the specialty labels and spot the single upstream bottleneck.',
      order: 'Move the SINGLE patient who is holding up the entire downstream trauma queue.',
      hint: 'Distinguish the one upstream holder of the lone shared scanner from the three downstream patients waiting on it.',
      bayDefaultLabel: 'Queue Hold',
      bayLabels: { [e]: 'Minor · Stitches', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const targets = uniqueSortedIds([...tagSet(activeCards, 'blocker')]);
        const rivals = [...tagSet(activeCards, 'blocked')];
        return {
          targets,
          proof: `Abstracting away specialty labels reveals ${formatList(targets)} as the lone upstream bottleneck blocking three downstream critical cases on the hospital's only CT scanner.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} is a downstream waiting node — moving them doesn't free the scanner.`),
        };
      },
    };
  },

  // #28 Hierarchical reasoning (Before · Atomic)
  'hierarchical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Command Tree', wingIndex: 0, label: 'Hospital Authority Ladder',
        shown: [
          fact(`Strict Chain of Command (highest to lowest): 1. Trauma Chief  >  2. Senior Attending  >  3. Resident  >  4. Med Student.`, [], { tag: 'rule' }),
          fact(`A higher rank ALWAYS overrides a lower rank — AND a later update from the SAME rank overrides their own earlier note.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'OR Dispatch', wingIndex: 1, label: 'Early Orders (01:05)',
        shown: [
          fact(`01:05 Med Student: "Put ${pName(a)} into OR 1 first."`, a, { tag: 'ord', rank: 1, time: 1 }),
          fact(`01:05 Trauma Chief: "Put ${pName(b)} into OR 1 first."`, b, { tag: 'ord', rank: 4, time: 1 }),
        ],
        alt: [
          fact(`01:05 Med Student: "Put ${pName(a)} into OR 1 first."`, a, { tag: 'ord', rank: 1, time: 1 }),
          fact(`01:05 Senior Attending: "Put ${pName(b)} into OR 1 first."`, b, { tag: 'ord', rank: 3, time: 1 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'OR Dispatch', wingIndex: 1, label: 'Mid Orders (01:15)',
        shown: [
          fact(`01:15 Resident: "Actually send ${pName(c)} to OR 1 immediately."`, c, { tag: 'ord', rank: 2, time: 2 }),
          fact(`01:15 Senior Attending: "Override Resident — prep ${pName(d)} for OR 1."`, d, { tag: 'ord', rank: 3, time: 2 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Command Tree', wingIndex: 0, label: 'Late Override (01:25)',
        shown: [
          fact(`01:25 Trauma Chief (updated after new scan!): "Cancel my 01:05 note — move ${pName(c)} into OR 1 NOW!"`, c, { tag: 'ord', rank: 4, time: 3 }),
          fact(`Notice: Resident's earlier note didn't decide this — the Trauma Chief's 01:25 call did!`, [], { tag: 'rule' }),
        ],
        alt: [
          fact(`01:25 Trauma Chief (updated after new scan!): "Move ${pName(d)} into OR 1 NOW!"`, d, { tag: 'ord', rank: 4, time: 3 }),
          fact(`Trauma Chief outranks every other title on the board.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'OR Dispatch', wingIndex: 1, label: 'Unrelated Notes',
        shown: [
          fact(`${pName(e)} is scheduled for non-urgent outpatient clinic next Tuesday.`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)} is waiting for a simple arm cast in Ortho.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Command Tree', wingIndex: 0, label: 'Final OR 1 Call',
        shown: [
          fact(`Follow ONLY the highest-ranking active directive (breaking ties by latest timestamp).`, [], { tag: 'rule' }),
          fact(`Wheel that single authorized patient into OR 1 now.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Conflicting Chain of Command',
      dispatch: 'Four staff ranks issued conflicting OR 1 orders over 20 minutes — resolve rank precedence and same-rank overrides cleanly.',
      order: 'Wheel the SINGLE patient authorized by the highest-ranking latest command into OR 1.',
      hint: 'Find the highest title on the ladder (Trauma Chief), then take their latest timestamped order.',
      bayDefaultLabel: 'OR 1 Queue',
      bayLabels: { [e]: 'Minor · Stable', [f]: 'Minor · Cast' },
      cards,
      evaluate(activeCards) {
        const ords = factsByTag(activeCards, 'ord');
        ords.sort((x, y) => y.rank - x.rank || y.time - x.time);
        const top = ords[0];
        const runner = ords.find((o) => o.patients[0] !== top.patients[0]);
        const targets = top ? [top.patients[0]] : [];
        return {
          targets,
          proof: `Trauma Chief sits at the top of the authority ladder, and their latest 01:25 directive supersedes every earlier and lower-ranked order — clearing ${formatList(targets)} for OR 1.`,
          rival: buildRivalInfo(targets, [runner?.patients[0], b, d], (id) => `${pName(id)}'s order came from either a lower rank or an earlier note overridden at 01:25.`),
        };
      },
    };
  },

  // #29 Spatial reasoning (Before · Atomic)
  'spatial-reasoning': (rng) => {
    // Use actual ICU wall geometry! Left wall = Bays 1..5 (indices 0..4), Right wall = Bays 6..10 (indices 5..9)
    // Directly across corridor: 1<->6, 2<->7, 3<->8, 4<->9, 5<->10.
    // Pick patients directly by bay index so geometry is 100% physically faithful to the rendered left ICU wall!
    const allIds = pickPlayers(rng, 10);
    // Map each bay number 1..10 to its true patient ID
    const byBay = {};
    for (const id of allIds) byBay[pBay(id)] = id;
    // Anchor wall oxygen hub at Bay 2 (Left Wall, row 2).
    // 1-step neighbors of Bay 2: Bay 1 (above), Bay 3 (below), and Bay 7 (directly across the corridor!).
    // Out of reach: Bay 5 (3 steps down), Bay 9 (across + 2 down), Bay 10 (far corner).
    const hub = byBay[2];
    const adj1 = byBay[1];
    const adj2 = byBay[3];
    const across = byBay[7];
    const far1 = byBay[5];
    const far2 = byBay[9];

    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Ward Map', wingIndex: 0, label: 'Backup Oxygen Hub',
        shown: [
          fact(`Main oxygen failed! The lone backup manifold sits at Bay 2 (${pName(hub)}) on the LEFT wall (Bays 1–5).`, hub, { tag: 'hub' }),
          fact(`Backup hoses reach ONLY 1 step away: directly above/below on the SAME wall, OR directly straight across the corridor (2 ↔ 7).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Left Wall 1–5', wingIndex: 1, label: 'Gasping Patients A',
        shown: [
          fact(`${pName(adj2)} (Bay ${pBay(adj2)}) is gasping and needs immediate backup oxygen.`, adj2, { tag: 'needs_o2', reachable: true }),
          fact(`${pName(far1)} (Bay ${pBay(far1)}) is gasping — check their distance from Bay 2 on the left wall!`, far1, { tag: 'needs_o2', reachable: false }),
        ],
        alt: [
          fact(`${pName(adj1)} (Bay ${pBay(adj1)}) is gasping and needs immediate backup oxygen.`, adj1, { tag: 'needs_o2', reachable: true }),
          fact(`${pName(far1)} (Bay ${pBay(far1)}) is gasping — check their distance from Bay 2 on the left wall!`, far1, { tag: 'needs_o2', reachable: false }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Right Wall 6–10', wingIndex: 0, label: 'Gasping Patients B',
        shown: [
          fact(`${pName(across)} (Bay ${pBay(across)}) sits directly across the hall from Bay 2 and is gasping for oxygen!`, across, { tag: 'needs_o2', reachable: true }),
          fact(`${pName(far2)} (Bay ${pBay(far2)}) is also gasping on the Right Wall — check if a 1-step hose reaches from Bay 2.`, far2, { tag: 'needs_o2', reachable: false }),
        ],
        alt: [
          fact(`${pName(across)} (Bay ${pBay(across)}) is breathing calmly on room air (no oxygen needed).`, across, { tag: 'safe', calm: true }),
          fact(`${pName(adj2)} (Bay ${pBay(adj2)}) is gasping right next to Bay 2 and needs oxygen!`, adj2, { tag: 'needs_o2', reachable: true }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Ward Map', wingIndex: 0, label: 'Hub Bay Status',
        shown: [
          fact(`${pName(hub)} (Bay 2) is ALREADY plugged directly into the hub — do NOT pick ${pName(hub)}.`, hub, { tag: 'already' }),
          fact(`${pName(adj1)} (Bay 1) is breathing comfortably on room air (needs zero oxygen).`, adj1, { tag: 'calm_adj1' }),
        ],
        alt: [
          fact(`${pName(hub)} (Bay 2) is ALREADY plugged directly into the hub — do NOT pick ${pName(hub)}.`, hub, { tag: 'already' }),
          fact(`${pName(byBay[4])} (Bay 4) is breathing comfortably on room air.`, byBay[4], { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Left Wall 1–5', wingIndex: 1, label: 'Corridor Layout Reminder',
        shown: [
          fact(`Look at the left bay wall: Bays 1–5 run top-to-bottom on the Left column; Bays 6–10 run top-to-bottom on the Right column (1↔6, 2↔7, 3↔8, 4↔9, 5↔10).`, [], { tag: 'rule' }),
          fact(`Out-of-reach bays get portable rolling tanks later — hook up ONLY reachable gasping bays first!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Right Wall 6–10', wingIndex: 0, label: 'Other Calm Bays',
        shown: [
          fact(`${pName(byBay[8])} (Bay 8) and ${pName(byBay[10])} (Bay 10) are resting comfortably with normal oxygen.`, [byBay[8], byBay[10]], { tag: 'safe', calm: true }),
          fact(`Connect the backup hoses to EVERY gasping patient within 1 step of Bay 2.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Emergency Oxygen Hose Reach',
      dispatch: 'Main wall oxygen failed — use the physical 2×5 bay grid on the left to see which gasping bays a 1-step hose from Bay 2 can reach.',
      order: 'Hook up backup hoses to EVERY gasping patient sitting within 1 step of Bay 2.',
      hint: 'Check the actual 2×5 ICU grid on the left wall: Bay 2 touches Bays 1, 3, and directly across to Bay 7.',
      bayDefaultLabel: 'Needs Oxygen',
      bayLabels: {
        [hub]: 'Oxygen Hub (On)',
        [byBay[8]]: 'Stable · Room Air',
        [byBay[10]]: 'Stable · Room Air',
      },
      cards,
      evaluate(activeCards) {
        const needs = factsByTag(activeCards, 'needs_o2');
        const targets = uniqueSortedIds(needs.filter((n) => n.reachable).map((n) => n.patients[0]));
        const rivals = needs.filter((n) => !n.reachable).map((n) => n.patients[0]);
        return {
          targets,
          proof: `On the 2×5 ICU wall, Bay 2's 1-step hose reaches Bays 1, 3, and across to Bay 7 — connecting gasping ${formatList(targets)} while Bays 5 and 9 are too far.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} (Bay ${pBay(id)}) is more than 1 step away from Bay 2, so the backup hose cannot reach.`),
        };
      },
    };
  },

  // #30 Temporal reasoning (Inside · Atomic)
  'temporal-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Stroke Clock', wingIndex: 0, label: 'The 4.5-Hour Cutoff',
        shown: [
          fact(`Current hospital clock: EXACTLY 07:00.`, [], { tag: 'rule' }),
          fact(`Stroke clot-buster MUST start within 4.5 hours of when the patient was LAST SEEN NORMAL (NOT when someone found them!).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Timeline Log', wingIndex: 1, label: 'Patient A & B Timelines',
        shown: [
          fact(`${pName(a)}: Found slumped at 06:15, spoke normally on the phone with sister at 03:30.`, a, { tag: 't_cand', lastNormalMin: 210 }),
          fact(`${pName(b)}: Found slumped at 06:40, but went to bed alone at 23:00 last night (last seen normal 23:00!).`, b, { tag: 't_cand', lastNormalMin: -60 }),
        ],
        alt: [
          fact(`${pName(a)}: Found slumped at 06:15, went to bed alone at 01:00 (last seen normal 01:00!).`, a, { tag: 't_cand', lastNormalMin: 60 }),
          fact(`${pName(b)}: Found slumped at 06:40, spoke normally with neighbor at 04:00.`, b, { tag: 't_cand', lastNormalMin: 240 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Timeline Log', wingIndex: 1, label: 'Patient C & D Timelines',
        shown: [
          fact(`${pName(c)}: Symptoms started right in front of coworkers at 02:00.`, c, { tag: 't_cand', lastNormalMin: 120 }),
          fact(`${pName(d)}: Ate breakfast normally with family at 03:00; slurred speech began at 04:30.`, d, { tag: 't_cand', lastNormalMin: 180 }),
        ],
        alt: [
          fact(`${pName(c)}: Symptoms started right in front of coworkers at 02:00.`, c, { tag: 't_cand', lastNormalMin: 120 }),
          fact(`${pName(d)}: Last seen normal at 02:10 before an unwitnessed fall.`, d, { tag: 't_cand', lastNormalMin: 130 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Stroke Clock', wingIndex: 0, label: 'Wake-Up Stroke Trap',
        shown: [
          fact(`If someone wakes up with a stroke, the clock starts when they went to sleep (last time known normal) — NOT when they woke up!`, [], { tag: 'rule' }),
          fact(`At 07:00, any "last seen normal" BEFORE 02:30 is outside the 4.5-hour safety limit.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Timeline Log', wingIndex: 1, label: 'Other Arrivals',
        shown: [
          fact(`${pName(e)} has a sprained shoulder from 06:00 (no stroke symptoms).`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)} is waiting for stitch removal.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Stroke Clock', wingIndex: 0, label: 'Clear for Clot-Buster',
        shown: [
          fact(`All four stroke scans are clean of bleeding — ONLY the 4.5-hour timeline separates safe treatment from danger.`, [], { tag: 'rule' }),
          fact(`Approve clot-buster for EVERY stroke patient still inside 4.5 hours from last seen normal.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'The Wake-Up Stroke Clock',
      dispatch: 'It is 07:00 — separate "when found" from "last seen normal" to see who is truly inside the strict 4.5-hour window.',
      order: 'Give stroke clot-buster to EVERY patient still inside 4.5 hours of when they were LAST SEEN NORMAL.',
      hint: 'Count backward 4.5 hours from 07:00 (cutoff = 02:30) and check each patient’s true last-seen-normal time.',
      bayDefaultLabel: 'Stroke Clock',
      bayLabels: { [e]: 'Minor · Stable', [f]: 'Minor · Stable' },
      cards,
      evaluate(activeCards) {
        const nowMin = 420; // 07:00
        const cands = factsByTag(activeCards, 't_cand');
        const targets = uniqueSortedIds(
          cands.filter((x) => nowMin - x.lastNormalMin <= 270).map((x) => x.patients[0])
        );
        const rivals = cands.filter((x) => nowMin - x.lastNormalMin > 270).map((x) => x.patients[0]);
        return {
          targets,
          proof: `At 07:00, the 4.5-hour cutoff is 02:30 — only ${formatList(targets)} were last seen normal at or after 02:30.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} was last seen normal BEFORE 02:30 (outside 4.5 hours), even if they were found recently.`),
        };
      },
    };
  },

  // #31 Structural reasoning (Inside · Composite)
  'structural-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Trauma ABCs', wingIndex: 0, label: 'Three Structural Pillars',
        shown: [
          fact(`Life support stands on THREE pillars: AIRWAY (open throat) · BREATHING (working lungs) · CIRCULATION (holding blood pressure).`, [], { tag: 'rule' }),
          fact(`Single-pillar alarms can be handled by one nurse; MULTI-PILLAR failure (2+ pillars failing at once) requires the Full Trauma Team NOW!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Airway Team', wingIndex: 1, label: 'Pillar 1: Airway Check',
        shown: [
          fact(`${pName(a)}: Swelling throat blocking airflow (AIRWAY FAILING).`, a, { tag: 'fail_p' }),
          fact(`${pName(b)}: Clear open airway, speaking clearly.`, b, { tag: 'ok_p' }),
        ],
        alt: [
          fact(`${pName(b)}: Swelling throat blocking airflow (AIRWAY FAILING).`, b, { tag: 'fail_p' }),
          fact(`${pName(a)}: Clear open airway, speaking clearly.`, a, { tag: 'ok_p' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Lung Team', wingIndex: 0, label: 'Pillar 2: Breathing Check',
        shown: [
          fact(`${pName(b)}: Collapsed right lung, oxygen 80% (BREATHING FAILING).`, b, { tag: 'fail_p' }),
          fact(`${pName(c)}: Crushed rib cage, shallow gasping breaths (BREATHING FAILING).`, c, { tag: 'fail_p' }),
        ],
        alt: [
          fact(`${pName(b)}: Collapsed right lung, oxygen 80% (BREATHING FAILING).`, b, { tag: 'fail_p' }),
          fact(`${pName(c)}: Clear easy breathing, oxygen 98%.`, c, { tag: 'ok_p' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Shock Team', wingIndex: 1, label: 'Pillar 3: Circulation Check',
        shown: [
          fact(`${pName(a)}: Active arterial bleeding, BP 72/40 (CIRCULATION FAILING).`, a, { tag: 'fail_p' }),
          fact(`${pName(d)}: Deep thigh gash, BP 78/46 (CIRCULATION FAILING — airway & breathing normal).`, d, { tag: 'fail_p' }),
        ],
        alt: [
          fact(`${pName(a)}: Steady blood pressure 118/74, no bleeding.`, a, { tag: 'ok_p' }),
          fact(`${pName(d)}: Deep thigh gash, BP 78/46 (CIRCULATION FAILING — airway & breathing normal).`, d, { tag: 'fail_p' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Trauma ABCs', wingIndex: 0, label: 'Re-Check Notes',
        shown: [
          fact(`${pName(c)}'s airway is open and blood pressure is rock-steady at 122/76.`, c, { tag: 'ok_p' }),
          fact(`${pName(e)} has a broken collarbone — all 3 pillars (Airway, Breathing, Circulation) intact.`, e, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Shock Team', wingIndex: 1, label: 'Team Activation',
        shown: [
          fact(`${pName(f)} is waiting for a routine hand wrap.`, f, { tag: 'safe', calm: true }),
          fact(`Combine all 3 specialist cards to count total failing pillars per patient and activate Full Trauma Team for 2+ failures.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Multi-Pillar Collapse',
      dispatch: 'Three specialist teams each checked ONE pillar (Airway, Breathing, Circulation) — combine their cards to spot multi-pillar collapse.',
      order: 'Activate the Full Trauma Team for EVERY patient with TWO OR MORE failing pillars at once.',
      hint: 'Count how many of the 3 pillar cards (Airway, Breathing, Circulation) flag each patient as failing.',
      bayDefaultLabel: 'ABC Trauma Eval',
      bayLabels: { [e]: 'Minor · Bone', [f]: 'Minor · Stable' },
      cards,
      evaluate(activeCards) {
        const counts = new Map();
        for (const fObj of factsByTag(activeCards, 'fail_p')) {
          const id = fObj.patients[0];
          counts.set(id, (counts.get(id) || 0) + 1);
        }
        const targets = uniqueSortedIds([...counts.entries()].filter(([, n]) => n >= 2).map(([id]) => id));
        const rivals = [...counts.entries()].filter(([, n]) => n === 1).map(([id]) => id);
        return {
          targets,
          proof: `Combining all three specialist reports reveals ${formatList(targets)} have 2 failing structural pillars simultaneously (requiring the Full Trauma Team).`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} only has 1 pillar strained while the other 2 pillars remain intact.`),
        };
      },
    };
  },

  // #32 Semantic reasoning (After · Atomic)
  'semantic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Pharmacy Audit', wingIndex: 0, label: 'Exact Allergy Standard',
        shown: [
          fact(`Hospital Safety Rule: Hold Penicillin ONLY for a patient's OWN personal allergy (hives, swelling, or breathing reaction).`, [], { tag: 'rule' }),
          fact(`Do NOT confuse: "Family member is allergic", "Mild upset stomach", or "Allergic to a DIFFERENT drug (Sulfa)" with a personal Penicillin allergy!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Handoff Notes', wingIndex: 1, label: 'Chart Quotes 1',
        shown: [
          fact(`${pName(a)}'s chart reads: "Personal history of throat swelling after taking Penicillin."`, a, { tag: 'true_allergy' }),
          fact(`${pName(b)}'s chart reads: "Mother had a Penicillin rash in 1995; patient tolerated Penicillin fine last year."`, b, { tag: 'false_alarm' }),
        ],
        alt: [
          fact(`${pName(c)}'s chart reads: "Personal history of throat swelling after taking Penicillin."`, c, { tag: 'true_allergy' }),
          fact(`${pName(b)}'s chart reads: "Mother had a Penicillin rash in 1995; patient tolerated Penicillin fine last year."`, b, { tag: 'false_alarm' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Handoff Notes', wingIndex: 1, label: 'Chart Quotes 2',
        shown: [
          fact(`${pName(c)}'s chart reads: "Allergic to SULFA antibiotics (hives); NO reaction to Penicillin."`, c, { tag: 'false_alarm' }),
          fact(`${pName(d)}'s chart reads: "Mild stomach rumbling when taking Penicillin on an empty stomach (zero rash/swelling)."`, d, { tag: 'false_alarm' }),
        ],
        alt: [
          fact(`${pName(a)}'s chart reads: "Allergic to SULFA antibiotics (hives); NO reaction to Penicillin."`, a, { tag: 'false_alarm' }),
          fact(`${pName(d)}'s chart reads: "Mild stomach rumbling when taking Penicillin on an empty stomach (zero rash/swelling)."`, d, { tag: 'false_alarm' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Pharmacy Audit', wingIndex: 0, label: 'Chart Quotes 3',
        shown: [
          fact(`${pName(e)}'s chart reads: "Broke out in full-body hives 20 minutes after Penicillin pill."`, e, { tag: 'true_allergy' }),
          fact(`${pName(f)}'s chart reads: "No known drug allergies; cleared to go home."`, f, { tag: 'safe', calm: true }),
        ],
        alt: [
          fact(`${pName(e)}'s chart reads: "Brother is allergic to Penicillin; patient has taken it safely twice."`, e, { tag: 'false_alarm' }),
          fact(`${pName(f)}'s chart reads: "No known drug allergies; cleared to go home."`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Handoff Notes', wingIndex: 1, label: 'Why Precision Matters',
        shown: [
          fact(`Needlessly blocking Penicillin forces weaker backup antibiotics that take longer to clear deadly infections.`, [], { tag: 'rule' }),
          fact(`Read WHO had the reaction, WHICH drug caused it, and WHETHER it was a real allergy vs mild stomach upset.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Pharmacy Audit', wingIndex: 0, label: 'Red Wristband Order',
        shown: [
          fact(`Place a RED Penicillin-Block wristband ONLY on patients with a true personal Penicillin allergy.`, [], { tag: 'rule' }),
          fact(`Everyone else receives standard first-line Penicillin safely.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Exact Words Save Lives',
      dispatch: 'Five charts mention the word "Penicillin" or "allergy" — read exact meanings so you block ONLY true personal Penicillin allergies.',
      order: 'Place a RED Penicillin-Block wristband ONLY on patients with a genuine personal Penicillin allergy.',
      hint: 'Distinguish a patient’s own hives/swelling to Penicillin from family history, mild tummy upset, or a different drug.',
      bayDefaultLabel: 'Allergy Audit',
      bayLabels: { [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const targets = uniqueSortedIds([...tagSet(activeCards, 'true_allergy')]);
        const rivals = [...tagSet(activeCards, 'false_alarm')];
        return {
          targets,
          proof: `Reading exact clinical meanings isolates ${formatList(targets)} as true personal Penicillin allergies (hives/swelling), excluding family history, Sulfa allergy, and mild stomach upset.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)}'s note mentions a relative's reaction, a different drug, or non-allergic stomach upset — not a personal Penicillin allergy.`),
        };
      },
    };
  },

  // =========================================================================
  // FAMILY 4: PREDICTIVE & QUANTITATIVE REASONING (#33–#41)
  // =========================================================================

  // #33 Probabilistic reasoning (Before · Atomic)
  'probabilistic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Poison Desk', wingIndex: 0, label: 'One Antidote Left',
        shown: [
          fact(`Five patients drank tainted cider — only ONE antidote syringe exists in the city right now.`, [], { tag: 'rule' }),
          fact(`Maximize expected lives saved: give it to the patient with the BIGGEST jump in survival odds (Odds WITH minus Odds WITHOUT).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Survival Odds', wingIndex: 1, label: 'Odds Sheet A',
        shown: [
          fact(`${pName(a)}: 25% survival without antidote · 90% survival WITH antidote.`, a, { tag: 'odds', without: 25, withTx: 90 }),
          fact(`${pName(b)}: 80% survival without antidote · 96% survival WITH antidote.`, b, { tag: 'odds', without: 80, withTx: 96 }),
        ],
        alt: [
          fact(`${pName(a)}: 75% survival without antidote · 90% survival WITH antidote.`, a, { tag: 'odds', without: 75, withTx: 90 }),
          fact(`${pName(b)}: 20% survival without antidote · 88% survival WITH antidote.`, b, { tag: 'odds', without: 20, withTx: 88 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Survival Odds', wingIndex: 1, label: 'Odds Sheet B',
        shown: [
          fact(`${pName(c)}: 5% survival without antidote · 15% survival WITH antidote.`, c, { tag: 'odds', without: 5, withTx: 15 }),
          fact(`${pName(d)}: 45% survival without antidote · 80% survival WITH antidote.`, d, { tag: 'odds', without: 45, withTx: 80 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Poison Desk', wingIndex: 0, label: 'Odds Sheet C',
        shown: [
          fact(`${pName(e)}: 88% survival without antidote · 94% survival WITH antidote.`, e, { tag: 'odds', without: 88, withTx: 94 }),
          fact(`${pName(f)} did NOT drink the cider — 100% safe.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Survival Odds', wingIndex: 1, label: 'Common Triage Trap',
        shown: [
          fact(`Don't automatically pick the highest final % (someone at 80% will likely survive anyway) OR the lowest starting % (if the antidote barely moves them).`, [], { tag: 'rule' }),
          fact(`Subtract each patient's WITHOUT % from their WITH % to find the true life-saving lift!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Poison Desk', wingIndex: 0, label: 'Syringe Allocation',
        shown: [
          fact(`Backup vials arrive in 3 hours; everyone else receives supportive IV fluids in the meantime.`, [], { tag: 'rule' }),
          fact(`Inject the single patient whose survival probability climbs by the largest margin.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'The Last Antidote Syringe',
      dispatch: 'Five poisoned patients, ONE syringe left — calculate who actually gains the largest jump in survival chance.',
      order: 'Give the sole antidote syringe to the SINGLE patient with the largest percentage-point jump in survival chance.',
      hint: 'Compute (WITH antidote − WITHOUT antidote) for each patient — do not just pick the highest final score.',
      bayDefaultLabel: 'Poison Odds',
      bayLabels: { [f]: 'Not Exposed · Safe' },
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'odds').map((o) => ({
          id: o.patients[0],
          without: o.without,
          withTx: o.withTx,
          gain: o.withTx - o.without,
        }));
        list.sort((x, y) => y.gain - x.gain);
        const top = list[0];
        const runner = list[1];
        const targets = top ? [top.id] : [];
        return {
          targets,
          proof: `${pName(top.id)} gains +${top.gain} percentage points (${top.without}% → ${top.withTx}%), beating ${pName(runner.id)} (+${runner.gain}%) and everyone else.`,
          rival: buildRivalInfo(targets, [runner.id, b, c], (id) => {
            const r = list.find((x) => x.id === id);
            return `${pName(id)} only gains +${r.gain}% (${r.without}% → ${r.withTx}%), far less lift than ${pName(top.id)}'s +${top.gain}%.`;
          }),
        };
      },
    };
  },

  // #34 Statistical reasoning (After · Composite)
  'statistical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Lab Stats', wingIndex: 0, label: 'Normal Ward Distribution',
        shown: [
          fact(`Across 1,000 healthy ER patients, Blood-Stress Level averages 1.2, with normal spread from 0.6 to 1.8 (95% of healthy people fall inside 0.6–1.8).`, [], { tag: 'rule' }),
          fact(`Minor stress nudges it to ~2.1 — ONLY an extreme outlier ABOVE 4.0 signals dangerous hidden organ starvation!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Lab Results', wingIndex: 1, label: 'Batch 1 Readings',
        shown: [
          fact(`${pName(a)}: Blood-Stress Level = 6.4 (re-tested twice, confirmed accurate).`, a, { tag: 'stat', val: 6.4 }),
          fact(`${pName(b)}: Blood-Stress Level = 1.7 (inside normal ward spread).`, b, { tag: 'stat', val: 1.7 }),
        ],
        alt: [
          fact(`${pName(a)}: Blood-Stress Level = 1.5 (inside normal ward spread).`, a, { tag: 'stat', val: 1.5 }),
          fact(`${pName(b)}: Blood-Stress Level = 6.9 (re-tested twice, confirmed accurate).`, b, { tag: 'stat', val: 6.9 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Lab Results', wingIndex: 1, label: 'Batch 2 Readings',
        shown: [
          fact(`${pName(c)}: Blood-Stress Level = 2.1 (slight bump after running up stairs).`, c, { tag: 'stat', val: 2.1 }),
          fact(`${pName(d)}: Blood-Stress Level = 5.8 (re-tested twice, confirmed accurate).`, d, { tag: 'stat', val: 5.8 }),
        ],
        alt: [
          fact(`${pName(c)}: Blood-Stress Level = 2.1 (slight bump after running up stairs).`, c, { tag: 'stat', val: 2.1 }),
          fact(`${pName(d)}: Blood-Stress Level = 1.9 (borderline mild stress only).`, d, { tag: 'stat', val: 1.9 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Lab Stats', wingIndex: 0, label: 'Base-Rate Caution',
        shown: [
          fact(`${pName(e)}: Blood-Stress Level = 1.3 (right at the ward average).`, e, { tag: 'safe', calm: true }),
          fact(`Small bumps near 2.0 happen all the time from pain or shivering — don't panic-treat normal variance!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Lab Results', wingIndex: 1, label: 'Sample Size Note',
        shown: [
          fact(`${pName(f)}: Blood-Stress Level = 0.9 (completely normal, ready for discharge).`, f, { tag: 'safe', calm: true }),
          fact(`Both confirmed readings above 4.0 sit more than 4 standard deviations above the ward mean.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Lab Stats', wingIndex: 0, label: 'Hidden-Shock Call',
        shown: [
          fact(`Start emergency hidden-shock fluids ONLY for the extreme statistical outliers (> 4.0).`, [], { tag: 'rule' }),
          fact(`Everyone inside normal or mild-stress variance stays on standard observation.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Spotting True Outliers',
      dispatch: 'Blood-stress labs just posted for the whole ward — separate true extreme statistical outliers from normal random wiggle.',
      order: 'Start emergency hidden-shock resuscitation for EVERY patient who is an extreme outlier (> 4.0).',
      hint: 'Compare every patient’s confirmed reading against the ward distribution (normal 0.6–1.8, danger outlier > 4.0).',
      bayDefaultLabel: 'Lab Stress Eval',
      bayLabels: { [e]: 'Normal · Stable', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'stat');
        const targets = uniqueSortedIds(list.filter((x) => x.val > 4.0).map((x) => x.patients[0]));
        const rivals = list.filter((x) => x.val <= 4.0).sort((x, y) => y.val - x.val).map((x) => x.patients[0]);
        return {
          targets,
          proof: `${formatList(targets)} sit far above the 4.0 outlier threshold, signaling hidden organ shock rather than normal ward variance.`,
          rival: buildRivalInfo(targets, rivals, (id) => {
            const r = list.find((x) => x.id === id || x.patients[0] === id);
            return `${pName(id)}'s reading (${r?.val}) is near normal mild variance, well below the 4.0 shock outlier cutoff.`;
          }),
        };
      },
    };
  },

  // #35 Counterfactual reasoning (After · Composite)
  'counterfactual-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'M&M Audit', wingIndex: 0, label: 'What-If Review Question',
        shown: [
          fact(`Post-shift review: paramedics used a new clotting tourniquet 10 minutes before arrival — did it actually save anyone from crossing lethal blood loss (2,000 mL)?`, [], { tag: 'rule' }),
          fact(`Compute what each patient WOULD have lost WITHOUT the tourniquet: Current Loss + (10 min × Pre-Tourniquet Bleed Rate).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Ambulance Data', wingIndex: 1, label: 'Bleed Logs A',
        shown: [
          fact(`${pName(a)}: Arrived with 1,500 mL lost · Pre-tourniquet bleed rate was 70 mL per minute.`, a, { tag: 'cf', cur: 1500, rate: 70 }),
          fact(`${pName(b)}: Arrived with 1,600 mL lost · Pre-tourniquet bleed rate was 30 mL per minute.`, b, { tag: 'cf', cur: 1600, rate: 30 }),
        ],
        alt: [
          fact(`${pName(a)}: Arrived with 1,200 mL lost · Pre-tourniquet bleed rate was 40 mL per minute.`, a, { tag: 'cf', cur: 1200, rate: 40 }),
          fact(`${pName(b)}: Arrived with 1,650 mL lost · Pre-tourniquet bleed rate was 60 mL per minute.`, b, { tag: 'cf', cur: 1650, rate: 60 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Ambulance Data', wingIndex: 1, label: 'Bleed Logs B',
        shown: [
          fact(`${pName(c)}: Arrived with 1,100 mL lost · Pre-tourniquet bleed rate was 60 mL per minute.`, c, { tag: 'cf', cur: 1100, rate: 60 }),
          fact(`${pName(d)}: Arrived with 1,400 mL lost · Pre-tourniquet bleed rate was 50 mL per minute.`, d, { tag: 'cf', cur: 1400, rate: 50 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'M&M Audit', wingIndex: 0, label: 'Lethal Threshold Note',
        shown: [
          fact(`Strict lethal cutoff: strictly GREATER than 2,000 mL total blood loss.`, [], { tag: 'rule' }),
          fact(`Notice: someone arriving with 1,600 mL but bleeding slowly only adds 300 mL in 10 minutes!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Ambulance Data', wingIndex: 1, label: 'Non-Tourniquet Bays',
        shown: [
          fact(`${pName(e)} had a nosebleed (lost 50 mL total, no tourniquet used).`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)} arrived for a twisted ankle (zero blood loss).`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'M&M Audit', wingIndex: 0, label: 'Audit Filing',
        shown: [
          fact(`Hospital Board asks for the SINGLE case where early tourniquet use literally prevented crossing > 2,000 mL.`, [], { tag: 'rule' }),
          fact(`Do the 10-minute "what-if" addition for all four bleed logs.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'What If the Tourniquet Failed?',
      dispatch: 'During post-shift M&M review, calculate what WOULD have happened without the 10-minute early tourniquet.',
      order: 'Identify the SINGLE patient who WOULD have crossed > 2,000 mL lethal blood loss without the 10-minute early tourniquet.',
      hint: 'Add Current Loss + (10 × Rate/min) for each patient to see who strictly passes 2,000 mL.',
      bayDefaultLabel: 'M&M Bleed Audit',
      bayLabels: { [e]: 'Minor · Stable', [f]: 'Minor · Stable' },
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'cf').map((x) => ({
          id: x.patients[0],
          cur: x.cur,
          rate: x.rate,
          proj: x.cur + 10 * x.rate,
        }));
        const targets = uniqueSortedIds(list.filter((x) => x.proj > 2000).map((x) => x.id));
        const rivals = list.filter((x) => x.proj <= 2000).sort((x, y) => y.proj - x.proj).map((x) => x.id);
        return {
          targets,
          proof: `Without the 10-minute tourniquet, ${formatList(targets)} would have reached ${list.find((x) => x.id === targets[0])?.proj} mL — the only case crossing the 2,000 mL lethal cutoff.`,
          rival: buildRivalInfo(targets, rivals, (id) => {
            const r = list.find((x) => x.id === id);
            return `${pName(id)} would have reached ${r.proj} mL (${r.cur} + 10×${r.rate}), staying at or below 2,000 mL.`;
          }),
        };
      },
    };
  },

  // #36 Hypothetical reasoning (Before · Atomic)
  'hypothetical-reasoning': (rng) => {
    const allIds = pickPlayers(rng, 10);
    const byBay = {};
    for (const id of allIds) byBay[pBay(id)] = id;
    // Right Wall = Bays 6..10! Suppose Generator B (serving Bays 6..10 ONLY) trips offline!
    const r1 = byBay[6];
    const r2 = byBay[8];
    const r3 = byBay[9];
    const l1 = byBay[2];
    const l2 = byBay[4];
    const calm = byBay[1];

    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Power Ops', wingIndex: 0, label: 'Generator B Failure Drill',
        shown: [
          fact(`SUPPOSE Backup Generator B trips offline in 30 seconds — cutting wall electricity to the RIGHT WALL (Bays 6–10) ONLY!`, [], { tag: 'rule' }),
          fact(`Left Wall (Bays 1–5) stays on Generator A with 100% uninterrupted power.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Equipment Log', wingIndex: 1, label: 'Life-Support Hookups 1',
        shown: [
          fact(`${pName(r1)} (Bay ${pBay(r1)}) is fully paralyzed on a wall-powered electric ventilator (ZERO internal battery!).`, r1, { tag: 'dep', rightWall: true, electric: true }),
          fact(`${pName(l1)} (Bay ${pBay(l1)}) is ALSO on a wall-powered electric ventilator (check which wall they are on!).`, l1, { tag: 'dep', rightWall: false, electric: true }),
        ],
        alt: [
          fact(`${pName(r1)} (Bay ${pBay(r1)}) is breathing independently on a simple oxygen tube (needs zero electricity).`, r1, { tag: 'dep', rightWall: true, electric: false }),
          fact(`${pName(r3)} (Bay ${pBay(r3)}) is fully paralyzed on a wall-powered electric ventilator (ZERO internal battery!).`, r3, { tag: 'dep', rightWall: true, electric: true }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Equipment Log', wingIndex: 1, label: 'Life-Support Hookups 2',
        shown: [
          fact(`${pName(r2)} (Bay ${pBay(r2)}) depends 100% on an electric blood-pressure pump plugged into the wall (battery dead!).`, r2, { tag: 'dep', rightWall: true, electric: true }),
          fact(`${pName(r3)} (Bay ${pBay(r3)}) is breathing on their own with a mechanical oxygen cylinder (needs zero wall power).`, r3, { tag: 'dep', rightWall: true, electric: false }),
        ],
        alt: [
          fact(`${pName(r2)} (Bay ${pBay(r2)}) depends 100% on an electric blood-pressure pump plugged into the wall (battery dead!).`, r2, { tag: 'dep', rightWall: true, electric: true }),
          fact(`${pName(l1)} (Bay ${pBay(l1)}) is on an electric ventilator on the LEFT wall (Generator A stays ON!).`, l1, { tag: 'dep', rightWall: false, electric: true }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Power Ops', wingIndex: 0, label: 'Battery Check',
        shown: [
          fact(`${pName(l2)} (Bay ${pBay(l2)}) is on a wall-powered heart pump on the LEFT wall (Generator A stays ON!).`, l2, { tag: 'dep', rightWall: false, electric: true }),
          fact(`Only machines on Bays 6–10 with NO battery stop immediately if Generator B trips.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Equipment Log', wingIndex: 1, label: 'Stable Bays',
        shown: [
          fact(`${pName(calm)} (Bay ${pBay(calm)}) is resting comfortably with zero powered equipment.`, calm, { tag: 'safe', calm: true }),
          fact(`Manual squeeze-bags and portable backup batteries are ready at the nursing station.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Power Ops', wingIndex: 0, label: 'Pre-Stage Rescue',
        shown: [
          fact(`Do NOT waste manual crews on Bays 1–5 (their power stays ON) or non-electric patients.`, [], { tag: 'rule' }),
          fact(`Station emergency manual-backup teams at EVERY Right-Wall bay that loses wall-dependent life support.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Blackout Surge Drill',
      dispatch: 'Storm lightning is flickering Generator B (Bays 6–10) — trace the hypothetical outage to pre-stage manual backup crews.',
      order: 'Pre-stage manual backup at EVERY bay that will immediately lose life support if Generator B (Bays 6–10) dies.',
      hint: 'Check BOTH bay wall (6–10 only!) AND whether the patient depends on wall electricity without battery.',
      bayDefaultLabel: 'Power Drill',
      bayLabels: { [calm]: 'Minor · Stable' },
      cards,
      evaluate(activeCards) {
        const deps = factsByTag(activeCards, 'dep');
        const targets = uniqueSortedIds(deps.filter((x) => x.rightWall && x.electric).map((x) => x.patients[0]));
        const rivals = deps.filter((x) => !(x.rightWall && x.electric)).map((x) => x.patients[0]);
        return {
          targets,
          proof: `Under the hypothetical Generator B blackout (Bays 6–10), ONLY ${formatList(targets)} sit on the Right Wall AND depend on battery-less electric life support.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} is either on the unaffected Left Wall (Bays 1–5) or does not need wall power.`),
        };
      },
    };
  },

  // #37 Predictive reasoning (Inside · Atomic)
  'predictive-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'ICU Telemetry', wingIndex: 0, label: 'Early Crash Rule',
        shown: [
          fact(`Danger line: blood pressure hitting 70 or lower causes sudden fainting and brain starvation.`, [], { tag: 'rule' }),
          fact(`Look at the 3 readings taken every 5 minutes (01:00 → 01:05 → 01:10) and predict who crosses ≤ 70 NEXT (at 01:15)!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Trend Sheets', wingIndex: 1, label: 'Trends A & B',
        shown: [
          fact(`${pName(a)}: 01:00 = 114 · 01:05 = 98 · 01:10 = 82 (steady slide!).`, a, { tag: 'tr', next: 66, cur: 82 }),
          fact(`${pName(b)}: 01:00 = 76 · 01:05 = 78 · 01:10 = 80 (climbing back up!).`, b, { tag: 'tr', next: 82, cur: 80 }),
        ],
        alt: [
          fact(`${pName(a)}: 01:00 = 84 · 01:05 = 82 · 01:10 = 80 (gentle drift).`, a, { tag: 'tr', next: 78, cur: 80 }),
          fact(`${pName(b)}: 01:00 = 116 · 01:05 = 98 · 01:10 = 80 (steep slide!).`, b, { tag: 'tr', next: 62, cur: 80 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Trend Sheets', wingIndex: 1, label: 'Trends C & D',
        shown: [
          fact(`${pName(c)}: 01:00 = 86 · 01:05 = 83 · 01:10 = 80.`, c, { tag: 'tr', next: 77, cur: 80 }),
          fact(`${pName(d)}: 01:00 = 96 · 01:05 = 92 · 01:10 = 88.`, d, { tag: 'tr', next: 84, cur: 88 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'ICU Telemetry', wingIndex: 0, label: 'Watch the Direction!',
        shown: [
          fact(`All four patients look similar around 80–88 right now — ONLY projecting each 5-minute step forward reveals who crashes first!`, [], { tag: 'rule' }),
          fact(`${pName(e)} has been rock-steady at 120 → 120 → 120.`, e, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Trend Sheets', wingIndex: 1, label: 'Other Bay',
        shown: [
          fact(`${pName(f)} is cleared to go home after wrist wrap.`, f, { tag: 'safe', calm: true }),
          fact(`Project one more 5-minute step to 01:15 for every tracked patient.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'ICU Telemetry', wingIndex: 0, label: 'Pre-Crash Rescue',
        shown: [
          fact(`Wait until 01:15 and they code — rush the single patient projected to hit ≤ 70 next!`, [], { tag: 'rule' }),
          fact(`Ignore recovering trends and tiny 2–4 point drifts.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Who Crashes in 5 Minutes?',
      dispatch: 'Four patients hover around BP 80 right now — project each 5-minute slope forward to catch who hits ≤ 70 first.',
      order: 'Intervene NOW on the SINGLE patient whose trend projects to crash to 70 or below at 01:15.',
      hint: 'Find each patient’s exact 5-minute change and apply it one more time to their 01:10 reading.',
      bayDefaultLabel: 'BP Trajectory',
      bayLabels: { [e]: 'Stable · Flat', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'tr').sort((x, y) => x.next - y.next);
        const targets = uniqueSortedIds(list.filter((x) => x.next <= 70).map((x) => x.patients[0]));
        const rivals = list.filter((x) => x.next > 70).map((x) => x.patients[0]);
        return {
          targets,
          proof: `Continuing each 5-minute slope puts ${formatList(targets)} at ${list[0].next} by 01:15 — crashing below 70 while everyone else stays safely above 75.`,
          rival: buildRivalInfo(targets, rivals, (id) => {
            const r = list.find((x) => x.patients[0] === id);
            return `${pName(id)} projects to ${r.next} at 01:15 (either climbing or drifting slowly).`;
          }),
        };
      },
    };
  },

  // #38 Prognostic reasoning (After · Composite)
  'prognostic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'ICU Rounds', wingIndex: 0, label: '48-Hour Outlook Rule',
        shown: [
          fact(`A single struggling organ often recovers — SIMULTANEOUS decline across TWO vital systems (Brain + Kidneys) signals a grave 48-hour outlook.`, [], { tag: 'rule' }),
          fact(`Families deserve an honest, early goals-of-care conference whenever TWO organs are actively worsening together.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Organ Logs', wingIndex: 1, label: 'Brain Trajectory (24h)',
        shown: [
          fact(`${pName(a)}: Alertness score dropped from 13 → 6 (worsening rapidly).`, a, { tag: 'brain_down' }),
          fact(`${pName(b)}: Alertness score climbed from 8 → 14 (waking up steadily!).`, b, { tag: 'brain_up' }),
        ],
        alt: [
          fact(`${pName(c)}: Alertness score dropped from 13 → 6 (worsening rapidly).`, c, { tag: 'brain_down' }),
          fact(`${pName(b)}: Alertness score climbed from 8 → 14 (waking up steadily!).`, b, { tag: 'brain_up' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Organ Logs', wingIndex: 1, label: 'Kidney Trajectory (24h)',
        shown: [
          fact(`${pName(a)}: Kidney urine output collapsed from 45 mL/hr → 0 mL/hr (shutting down!).`, a, { tag: 'kid_down' }),
          fact(`${pName(b)}: Kidney urine output dropped from 40 → 10 mL/hr (struggling, needs dialysis).`, b, { tag: 'kid_down' }),
        ],
        alt: [
          fact(`${pName(c)}: Kidney urine output collapsed from 45 mL/hr → 0 mL/hr (shutting down!).`, c, { tag: 'kid_down' }),
          fact(`${pName(b)}: Kidney urine output dropped from 40 → 10 mL/hr (struggling, needs dialysis).`, b, { tag: 'kid_down' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'ICU Rounds', wingIndex: 0, label: 'Patients C & D Status',
        shown: [
          fact(`${pName(c)}: Alertness steady at 14/15; kidneys making normal 60 mL/hr urine.`, c, { tag: 'stable_org' }),
          fact(`${pName(d)}: Brain alertness dipped 14 → 11 from heavy pain meds, kidneys strong at 70 mL/hr.`, d, { tag: 'one_org' }),
        ],
        alt: [
          fact(`${pName(a)}: Alertness steady at 14/15; kidneys making normal 60 mL/hr urine.`, a, { tag: 'stable_org' }),
          fact(`${pName(d)}: Brain alertness dipped 14 → 11 from heavy pain meds, kidneys strong at 70 mL/hr.`, d, { tag: 'one_org' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Organ Logs', wingIndex: 1, label: 'Routine Recovery',
        shown: [
          fact(`${pName(e)} is eating soup after appendix repair — brain and kidneys both normal.`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)} is scheduled to go home this afternoon.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'ICU Rounds', wingIndex: 0, label: 'Family Conference Call',
        shown: [
          fact(`Single-organ dips (${pName(b)} waking up, or ${pName(d)} sleepy on pain meds) have strong recovery odds.`, [b, d], { tag: 'note' }),
          fact(`Bring the family in immediately for the SINGLE patient declining in BOTH brain and kidneys.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: '48-Hour ICU Outlook',
      dispatch: 'Four ICU families are waiting for an honest update — combine Brain and Kidney trajectories to see who faces multi-organ decline.',
      order: 'Call an urgent goals-of-care family meeting for the SINGLE patient worsening across BOTH brain and kidneys.',
      hint: 'Cross-check the 24-hour Brain card with the 24-hour Kidney card for two simultaneous downward slopes.',
      bayDefaultLabel: 'ICU Prognosis',
      bayLabels: { [e]: 'Recovering · Calm', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const bd = tagSet(activeCards, 'brain_down');
        const kd = tagSet(activeCards, 'kid_down');
        const targets = uniqueSortedIds([...bd].filter((id) => kd.has(id)));
        const rivals = [...bd, ...kd].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Only ${formatList(targets)} show simultaneous decline in both brain alertness (13 → 6) and kidney output (45 → 0 mL/hr), signaling grave multi-organ prognosis.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} only has one organ stressed while the other organ is stable or actively improving.`),
        };
      },
    };
  },

  // #39 Extrapolative reasoning (Before · Atomic)
  'extrapolative-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Transport Desk', wingIndex: 0, label: 'Portable O2 Math',
        shown: [
          fact(`Four ambulance patients are rolling on portable oxygen cylinders while the wall supply restarts in 15 minutes.`, [], { tag: 'rule' }),
          fact(`Divide each patient's Remaining Liters by their Flow Rate (L/min) to see whose cylinder runs bone-dry BEFORE 15 minutes!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Tank Gauges', wingIndex: 1, label: 'Cylinders 1 & 2',
        shown: [
          fact(`${pName(a)}: 180 Liters remaining · burning at 15 Liters/min.`, a, { tag: 'tank', lit: 180, rate: 15 }),
          fact(`${pName(b)}: 120 Liters remaining · burning at 6 Liters/min.`, b, { tag: 'tank', lit: 120, rate: 6 }),
        ],
        alt: [
          fact(`${pName(a)}: 180 Liters remaining · burning at 9 Liters/min.`, a, { tag: 'tank', lit: 180, rate: 9 }),
          fact(`${pName(b)}: 120 Liters remaining · burning at 12 Liters/min.`, b, { tag: 'tank', lit: 120, rate: 12 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Tank Gauges', wingIndex: 1, label: 'Cylinders 3 & 4',
        shown: [
          fact(`${pName(c)}: 240 Liters remaining · burning at 12 Liters/min.`, c, { tag: 'tank', lit: 240, rate: 12 }),
          fact(`${pName(d)}: 110 Liters remaining · burning at 10 Liters/min.`, d, { tag: 'tank', lit: 110, rate: 10 }),
        ],
        alt: [
          fact(`${pName(c)}: 240 Liters remaining · burning at 12 Liters/min.`, c, { tag: 'tank', lit: 240, rate: 12 }),
          fact(`${pName(d)}: 160 Liters remaining · burning at 8 Liters/min.`, d, { tag: 'tank', lit: 160, rate: 8 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Transport Desk', wingIndex: 0, label: 'Gauge Illusion',
        shown: [
          fact(`A smaller tank at a gentle flow can outlast a bigger tank running at full blast!`, [], { tag: 'rule' }),
          fact(`${pName(e)} is breathing regular room air (needs zero cylinder).`, e, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Tank Gauges', wingIndex: 1, label: 'Other Bay',
        shown: [
          fact(`${pName(f)} is waiting for discharge papers.`, f, { tag: 'safe', calm: true }),
          fact(`Wall oxygen comes back online at exactly Minute 15.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Transport Desk', wingIndex: 0, label: 'Swap Cylinders',
        shown: [
          fact(`Swap fresh cylinders right now for EVERY patient whose tank hits zero BEFORE 15 minutes (< 15 min remaining).`, [], { tag: 'rule' }),
          fact(`Cylinders lasting 20+ minutes easily clear the 15-minute restart.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Oxygen Tank Burnout',
      dispatch: 'Wall oxygen restarts in 15 minutes — extrapolate each cylinder’s remaining liters and burn rate to swap every tank running dry early.',
      order: 'Swap fresh tanks NOW for EVERY patient whose portable cylinder will run dry in UNDER 15 minutes.',
      hint: 'Divide Remaining Liters ÷ Burn Rate (L/min) for each patient and catch everyone under 15 minutes.',
      bayDefaultLabel: 'O2 Tank Watch',
      bayLabels: { [e]: 'Room Air · Calm', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'tank').map((t) => ({
          id: t.patients[0],
          mins: t.lit / t.rate,
          lit: t.lit,
          rate: t.rate,
        }));
        const targets = uniqueSortedIds(list.filter((t) => t.mins < 15).map((t) => t.id));
        const rivals = list.filter((t) => t.mins >= 15).sort((x, y) => x.mins - y.mins).map((t) => t.id);
        return {
          targets,
          proof: `Dividing Liters ÷ Flow Rate shows ${formatList(targets)} run dry in under 15 minutes (${targets.map((id) => `${pName(id)}: ${list.find((x) => x.id === id).mins} min`).join(', ')}).`,
          rival: buildRivalInfo(targets, rivals, (id) => {
            const r = list.find((x) => x.id === id);
            return `${pName(id)}'s tank lasts ${r.mins} minutes (${r.lit} ÷ ${r.rate}), safely clearing the 15-minute restart.`;
          }),
        };
      },
    };
  },

  // #40 Proportional reasoning (Inside · Atomic)
  'proportional-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Shock Scale', wingIndex: 0, label: 'Body-Size Blood Rule',
        shown: [
          fact(`A smaller body holds far less blood! Critical shock starts when blood loss reaches 25% OR MORE of a patient's total blood supply.`, [], { tag: 'rule' }),
          fact(`Don't just grab the largest raw milliliter number — compare Blood Lost ÷ Total Blood Supply for each patient!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Trauma Intake', wingIndex: 1, label: 'Loss Ratios 1',
        shown: [
          fact(`${pName(a)} (small teen, 3,000 mL total blood): lost 900 mL.`, a, { tag: 'prop', lost: 900, total: 3000 }),
          fact(`${pName(b)} (large adult, 6,000 mL total blood): lost 1,100 mL.`, b, { tag: 'prop', lost: 1100, total: 6000 }),
        ],
        alt: [
          fact(`${pName(a)} (large adult, 6,000 mL total blood): lost 1,000 mL.`, a, { tag: 'prop', lost: 1000, total: 6000 }),
          fact(`${pName(b)} (small teen, 3,200 mL total blood): lost 960 mL.`, b, { tag: 'prop', lost: 960, total: 3200 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Trauma Intake', wingIndex: 1, label: 'Loss Ratios 2',
        shown: [
          fact(`${pName(c)} (adult, 5,000 mL total blood): lost 1,000 mL.`, c, { tag: 'prop', lost: 1000, total: 5000 }),
          fact(`${pName(d)} (child, 2,000 mL total blood): lost 600 mL.`, d, { tag: 'prop', lost: 600, total: 2000 }),
        ],
        alt: [
          fact(`${pName(c)} (adult, 5,000 mL total blood): lost 1,000 mL.`, c, { tag: 'prop', lost: 1000, total: 5000 }),
          fact(`${pName(d)} (child, 2,000 mL total blood): lost 300 mL.`, d, { tag: 'prop', lost: 300, total: 2000 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Shock Scale', wingIndex: 0, label: 'Quick Quarter Check',
        shown: [
          fact(`Tip: 25% is ONE QUARTER of total blood (e.g., 1,500 mL for a 6,000 mL adult, but only 500 mL for a 2,000 mL child!).`, [], { tag: 'rule' }),
          fact(`${pName(e)} (adult, 5,000 mL total blood): lost 150 mL from a small cut.`, e, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Trauma Intake', wingIndex: 1, label: 'Routine Bay',
        shown: [
          fact(`${pName(f)} has zero bleeding — waiting for a knee brace.`, f, { tag: 'safe', calm: true }),
          fact(`A child losing 600 mL is in far deeper shock than a large adult losing 1,100 mL!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Shock Scale', wingIndex: 0, label: 'Blood Transfusion Call',
        shown: [
          fact(`Start emergency blood transfusion for EVERY patient who has lost 25% OR MORE of their body's blood.`, [], { tag: 'rule' }),
          fact(`Patients under 25% loss stabilize safely with standard IV saline.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Size Matters in Shock',
      dispatch: 'Adults, teens, and a child all lost blood — check proportion of total blood volume, not raw milliliters.',
      order: 'Start emergency blood transfusion for EVERY patient who lost 25% OR MORE of their total blood supply.',
      hint: 'Compare Blood Lost against one-quarter (25%) of each patient’s own total blood supply.',
      bayDefaultLabel: 'Blood Volume',
      bayLabels: { [e]: 'Minor · Cut', [f]: 'Minor · Brace' },
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'prop').map((x) => ({
          id: x.patients[0],
          lost: x.lost,
          total: x.total,
          pct: Math.round((x.lost / x.total) * 100),
        }));
        const targets = uniqueSortedIds(list.filter((x) => x.lost * 4 >= x.total).map((x) => x.id));
        const rivals = list.filter((x) => x.lost * 4 < x.total).sort((x, y) => y.lost - x.lost).map((x) => x.id);
        return {
          targets,
          proof: `Checking proportion of body blood flags ${formatList(targets)} at ≥ 25% loss (${targets.map((id) => `${pName(id)}: ${list.find((x) => x.id === id).pct}%`).join(', ')}).`,
          rival: buildRivalInfo(targets, rivals, (id) => {
            const r = list.find((x) => x.id === id);
            return `${pName(id)} lost ${r.lost} mL out of ${r.total} mL (${r.pct}%), staying below the 25% transfusion threshold despite a larger raw number.`;
          }),
        };
      },
    };
  },

  // #41 Mathematical reasoning (Inside · Composite)
  'mathematical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Trauma Score', wingIndex: 0, label: '3-Part Danger Formula',
        shown: [
          fact(`Hospital Early Warning Score = Breathing Points + Pressure Points + Alertness Points.`, [], { tag: 'rule' }),
          fact(`Total score of 7 OR HIGHER triggers immediate ICU transfer (6 or below stays on the regular floor).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Nurse Cards', wingIndex: 1, label: 'Part 1: Breathing Points',
        shown: [
          fact(`${pName(a)}: +3 pts · ${pName(b)}: +2 pts · ${pName(c)}: +3 pts · ${pName(d)}: +1 pt.`, [a, b, c, d], { tag: 's1', map: { [a]: 3, [b]: 2, [c]: 3, [d]: 1 } }),
          fact(`(Measured by Respiratory Therapist at 01:05.)`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(a)}: +1 pt · ${pName(b)}: +3 pts · ${pName(c)}: +3 pts · ${pName(d)}: +1 pt.`, [a, b, c, d], { tag: 's1', map: { [a]: 1, [b]: 3, [c]: 3, [d]: 1 } }),
          fact(`(Measured by Respiratory Therapist at 01:05.)`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Nurse Cards', wingIndex: 1, label: 'Part 2: Pressure Points',
        shown: [
          fact(`${pName(a)}: +2 pts · ${pName(b)}: +2 pts · ${pName(c)}: +1 pt · ${pName(d)}: +3 pts.`, [a, b, c, d], { tag: 's2', map: { [a]: 2, [b]: 2, [c]: 1, [d]: 3 } }),
          fact(`(Measured by Triage Nurse at 01:08.)`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(a)}: +2 pts · ${pName(b)}: +3 pts · ${pName(c)}: +1 pt · ${pName(d)}: +3 pts.`, [a, b, c, d], { tag: 's2', map: { [a]: 2, [b]: 3, [c]: 1, [d]: 3 } }),
          fact(`(Measured by Triage Nurse at 01:08.)`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Nurse Cards', wingIndex: 1, label: 'Part 3: Alertness Points',
        shown: [
          fact(`${pName(a)}: +3 pts · ${pName(b)}: +2 pts · ${pName(c)}: +2 pts · ${pName(d)}: +3 pts.`, [a, b, c, d], { tag: 's3', map: { [a]: 3, [b]: 2, [c]: 2, [d]: 3 } }),
          fact(`(Measured by Neuro Resident at 01:10.)`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(a)}: +2 pts · ${pName(b)}: +2 pts · ${pName(c)}: +2 pts · ${pName(d)}: +2 pts.`, [a, b, c, d], { tag: 's3', map: { [a]: 2, [b]: 2, [c]: 2, [d]: 2 } }),
          fact(`(Measured by Neuro Resident at 01:10.)`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Trauma Score', wingIndex: 0, label: 'Low-Score Bays',
        shown: [
          fact(`${pName(e)} scored 1 total across all three checks (calm sprain).`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)} scored 0 total (cleared to go home).`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Trauma Score', wingIndex: 0, label: 'ICU Transfer Cut-Off',
        shown: [
          fact(`Add each patient's 3 scores across Breathing + Pressure + Alertness.`, [], { tag: 'rule' }),
          fact(`Transfer EVERY patient hitting 7 points OR HIGHER into ICU immediately.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Early Warning Tally',
      dispatch: 'Three different nurses logged separate score parts — sum Breathing + Pressure + Alertness to catch every ICU transfer.',
      order: 'Transfer EVERY patient whose 3-part Early Warning Score totals 7 OR HIGHER to ICU.',
      hint: 'Sum each patient’s points across the Breathing, Pressure, and Alertness cards (cutoff = 7+).',
      bayDefaultLabel: 'Warning Score',
      bayLabels: { [e]: 'Minor · Score 1', [f]: 'Cleared · Score 0' },
      cards,
      evaluate(activeCards) {
        const totals = { [a]: 0, [b]: 0, [c]: 0, [d]: 0 };
        for (const tag of ['s1', 's2', 's3']) {
          const rec = factsByTag(activeCards, tag)[0];
          if (rec?.map) {
            for (const [id, v] of Object.entries(rec.map)) totals[id] += v;
          }
        }
        const targets = uniqueSortedIds(Object.entries(totals).filter(([, s]) => s >= 7).map(([id]) => id));
        const rivals = Object.entries(totals).filter(([, s]) => s < 7).sort((x, y) => y[1] - x[1]).map(([id]) => id);
        return {
          targets,
          proof: `Summing all three cards puts ${formatList(targets)} at ≥ 7 points (${targets.map((id) => `${pName(id)} = ${totals[id]}`).join(', ')}).`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} totaled ${totals[id]} points — just below the 7-point ICU cutoff.`),
        };
      },
    };
  },
};
