// Semantic Clinical Reasoning Engines — Part 1 (Types #1–#41: Families 1–4)
// 100% plain-English, zero-jargon, zero-spoiler medical emergencies across Before, Inside, and After.
// Every engine builds 6 scannable bedside cards (with dynamic `alt` versions for Tiers 4–6 ? Test Flip)
// and evaluates strictly from the active card facts.

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

function collectByTag(cards, tag) {
  const out = [];
  for (const c of cards) {
    for (const f of c.facts) {
      if (f.tag === tag && f.patients.length) {
        out.push(f.patients[0]);
      }
    }
  }
  return uniqueSortedIds(out);
}

function collectMapByTag(cards, tag) {
  const map = new Map();
  for (const c of cards) {
    for (const f of c.facts) {
      if (f.tag === tag && f.patients.length) {
        const id = f.patients[0];
        map.set(id, (map.get(id) || 0) + (f.value ?? 1));
      }
    }
  }
  return map;
}

function collectFactsByTag(cards, tag) {
  const out = [];
  for (const c of cards) {
    for (const f of c.facts) {
      if (f.tag === tag) out.push({ ...f, card: c });
    }
  }
  return out;
}

export const SEMANTIC_ENGINES_PART1 = {
  // =========================================================================
  // FAMILY 1: DIAGNOSTIC & INVESTIGATIVE REASONING (#1–#10)
  // =========================================================================

  // #1 Differential diagnosis (Inside · Composite)
  'differential-diagnosis': (rng) => {
    const [a, b, c, d, e, f, g, h] = pickPlayers(rng, 8);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Bay Triage', wingIndex: 0, label: 'Chest Pain Check',
        shown: [
          fact(`${pName(a)} has crushing chest pain.`, a, { tag: 'pain' }),
          fact(`${pName(b)} has crushing chest pain.`, b, { tag: 'pain' }),
        ],
        alt: [
          fact(`${pName(c)} has crushing chest pain.`, c, { tag: 'pain' }),
          fact(`${pName(b)} has crushing chest pain.`, b, { tag: 'pain' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Blood Lab', wingIndex: 1, label: 'Heart Blood Test',
        shown: [
          fact(`${pName(a)} tested POSITIVE for heart muscle damage.`, a, { tag: 'heart' }),
          fact(`${pName(c)} tested POSITIVE for heart muscle damage.`, c, { tag: 'heart' }),
        ],
        alt: [
          fact(`${pName(b)} tested POSITIVE for heart muscle damage.`, b, { tag: 'heart' }),
          fact(`${pName(c)} tested POSITIVE for heart muscle damage.`, c, { tag: 'heart' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Bay Triage', wingIndex: 0, label: 'Stomach Check',
        shown: [
          fact(`${pName(b)}'s pain vanished after antacid (acid reflux).`, b, { tag: 'benign' }),
          fact(`${pName(d)} has mild stomach cramps only.`, d, { tag: 'benign' }),
        ],
        alt: [
          fact(`${pName(a)}'s pain vanished after antacid (acid reflux).`, a, { tag: 'benign' }),
          fact(`${pName(d)} has mild stomach cramps only.`, d, { tag: 'benign' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Blood Lab', wingIndex: 1, label: 'Breathing Check',
        shown: [
          fact(`${pName(c)} has bruised ribs with no chest squeeze.`, c, { tag: 'other' }),
          fact(`${pName(e)} has clear lungs and steady breathing.`, e, { tag: 'other' }),
        ],
        alt: [
          fact(`${pName(f)} has bruised ribs with no chest squeeze.`, f, { tag: 'other' }),
          fact(`${pName(e)} has clear lungs and steady breathing.`, e, { tag: 'other' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Bay Triage', wingIndex: 0, label: 'Heart Monitor',
        shown: [
          fact(`${pName(f)} has a calm, normal heart rhythm.`, f, { tag: 'calm' }),
          fact(`${pName(g)} has a calm, normal heart rhythm.`, g, { tag: 'calm' }),
        ],
        alt: [
          fact(`${pName(g)} has a calm, normal heart rhythm.`, g, { tag: 'calm' }),
          fact(`${pName(h)} has a calm, normal heart rhythm.`, h, { tag: 'calm' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Blood Lab', wingIndex: 1, label: 'Muscle Check',
        shown: [
          fact(`${pName(h)} pulled a shoulder muscle lifting boxes.`, h, { tag: 'other' }),
          fact(`${pName(d)} has normal blood pressure and clear skin.`, d, { tag: 'other' }),
        ],
        alt: [
          fact(`${pName(e)} pulled a shoulder muscle lifting boxes.`, e, { tag: 'other' }),
          fact(`${pName(h)} has normal blood pressure and clear skin.`, h, { tag: 'other' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'ER Chest Pain Triage',
      dispatch: 'Several patients came in clutching their chests — separate real heart attacks from harmless look-alikes.',
      order: 'Rule in the real heart attack: treat everyone who has BOTH crushing chest pain AND a POSITIVE heart blood test.',
      hint: 'Match the names on Chest Pain Check with the names on Heart Blood Test.',
      cards,
      evaluate(activeCards) {
        const pain = new Set(collectByTag(activeCards, 'pain'));
        const heart = new Set(collectByTag(activeCards, 'heart'));
        const targets = uniqueSortedIds([...pain].filter((id) => heart.has(id)));
        const rivals = [...pain, ...heart].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Only ${formatList(targets)} have both crushing chest pain and positive heart-damage markers.`,
          rival: buildRivalInfo(targets, rivals, (id) =>
            pain.has(id)
              ? `${pName(id)} has chest pain, but tested negative for heart damage.`
              : `${pName(id)} has a blood marker bump without crushing chest pain.`
          ),
        };
      },
    };
  },

  // #2 Abductive reasoning (Inside · Atomic)
  'abductive-reasoning': (rng) => {
    const [a, b, c, d, e, f, g] = pickPlayers(rng, 7);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'ER Bay A', wingIndex: 0, label: 'Meal History',
        shown: [
          fact(`${pName(a)} ate shrimp 10 minutes before collapsing.`, a, { tag: 'trigger' }),
          fact(`${pName(b)} ate plain toast 3 hours ago.`, b, { tag: 'safe' }),
        ],
        alt: [
          fact(`${pName(c)} ate shrimp 10 minutes before collapsing.`, c, { tag: 'trigger' }),
          fact(`${pName(b)} ate plain toast 3 hours ago.`, b, { tag: 'safe' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'ER Bay A', wingIndex: 0, label: 'Skin & Throat Check',
        shown: [
          fact(`${pName(a)} broke out in red hives with a swelling throat.`, a, { tag: 'allergy' }),
          fact(`${pName(c)} broke out in red hives with a swelling throat.`, c, { tag: 'allergy' }),
        ],
        alt: [
          fact(`${pName(c)} broke out in red hives with a swelling throat.`, c, { tag: 'allergy' }),
          fact(`${pName(d)} broke out in red hives with a swelling throat.`, d, { tag: 'allergy' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'ER Bay B', wingIndex: 1, label: 'Breathing Sound',
        shown: [
          fact(`${pName(a)} is wheezing loudly as airways tighten.`, a, { tag: 'wheeze' }),
          fact(`${pName(c)} has a twisted ankle but clear breathing.`, c, { tag: 'other' }),
        ],
        alt: [
          fact(`${pName(c)} is wheezing loudly as airways tighten.`, c, { tag: 'wheeze' }),
          fact(`${pName(a)} has a twisted ankle but clear breathing.`, a, { tag: 'other' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'ER Bay B', wingIndex: 1, label: 'Roommate Notes',
        shown: [
          fact(`${pName(d)} scraped both knees on the sidewalk.`, d, { tag: 'other' }),
          fact(`${pName(e)} has a mild headache from skipping lunch.`, e, { tag: 'other' }),
        ],
        alt: [
          fact(`${pName(e)} scraped both knees on the sidewalk.`, e, { tag: 'other' }),
          fact(`${pName(d)} has a mild headache from skipping lunch.`, d, { tag: 'other' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'ER Bay A', wingIndex: 0, label: 'Skin Rash Check',
        shown: [
          fact(`${pName(f)} has sunburn from the beach, no throat swelling.`, f, { tag: 'other' }),
          fact(`${pName(b)} has clear skin and steady breathing.`, b, { tag: 'other' }),
        ],
        alt: [
          fact(`${pName(g)} has sunburn from the beach, no throat swelling.`, g, { tag: 'other' }),
          fact(`${pName(b)} has clear skin and steady breathing.`, b, { tag: 'other' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'ER Bay B', wingIndex: 1, label: 'Nurse Summary',
        shown: [
          fact(`${pName(g)} sprained a wrist playing basketball.`, g, { tag: 'other' }),
          fact(`${pName(e)} has normal oxygen and clear throat.`, e, { tag: 'other' }),
        ],
        alt: [
          fact(`${pName(f)} sprained a wrist playing basketball.`, f, { tag: 'other' }),
          fact(`${pName(e)} has normal oxygen and clear throat.`, e, { tag: 'other' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Mystery Collapse in the ER',
      dispatch: 'You have one epinephrine rescue pen — give it to the patient whose clues all point to severe food allergy.',
      order: 'Find the single best match for severe allergic shock: food trigger + hives/swollen throat + loud wheezing.',
      hint: 'Check who connects all three allergy clues across Meal History, Skin & Throat, and Breathing Sound.',
      cards,
      evaluate(activeCards) {
        const t = new Set(collectByTag(activeCards, 'trigger'));
        const al = new Set(collectByTag(activeCards, 'allergy'));
        const w = new Set(collectByTag(activeCards, 'wheeze'));
        const targets = uniqueSortedIds([...al].filter((id) => t.has(id) && w.has(id)));
        const rivals = [...al, ...t, ...w].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Severe allergic shock explains every single clue for ${formatList(targets)} at once (shrimp trigger, hives/swollen throat, and wheezing).`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} only fits part of the allergy picture, not all three clues.`),
        };
      },
    };
  },

  // #3 Eliminative reasoning (Before · Atomic)
  'eliminative-reasoning': (rng) => {
    const [a, b, c, d, e, f, g] = pickPlayers(rng, 7);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'North Bay', wingIndex: 0, label: 'Blood Clot Scan',
        shown: [
          fact(`${pName(a)} has a dangerous leg blood clot.`, a, { tag: 'clot' }),
          fact(`${pName(b)} has a dangerous leg blood clot.`, b, { tag: 'clot' }),
        ],
        alt: [
          fact(`${pName(d)} has a dangerous leg blood clot.`, d, { tag: 'clot' }),
          fact(`${pName(b)} has a dangerous leg blood clot.`, b, { tag: 'clot' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'South Bay', wingIndex: 1, label: 'More Clot Scans',
        shown: [
          fact(`${pName(c)} has a dangerous leg blood clot.`, c, { tag: 'clot' }),
          fact(`${pName(d)} has clear leg veins (no clot).`, d, { tag: 'clear' }),
        ],
        alt: [
          fact(`${pName(c)} has a dangerous leg blood clot.`, c, { tag: 'clot' }),
          fact(`${pName(a)} has clear leg veins (no clot).`, a, { tag: 'clear' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'North Bay', wingIndex: 0, label: 'Bleeding Safety Check',
        shown: [
          fact(`${pName(b)} is actively bleeding internally (DO NOT thin blood).`, b, { tag: 'bleed' }),
          fact(`${pName(e)} is actively bleeding from a deep cut.`, e, { tag: 'bleed' }),
        ],
        alt: [
          fact(`${pName(c)} is actively bleeding internally (DO NOT thin blood).`, c, { tag: 'bleed' }),
          fact(`${pName(e)} is actively bleeding from a deep cut.`, e, { tag: 'bleed' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'South Bay', wingIndex: 1, label: 'Recent Surgery Check',
        shown: [
          fact(`${pName(f)} had brain surgery yesterday (bleeding risk).`, f, { tag: 'bleed' }),
          fact(`${pName(g)} has no bleeding and no clots.`, g, { tag: 'clear' }),
        ],
        alt: [
          fact(`${pName(a)} had brain surgery yesterday (bleeding risk).`, a, { tag: 'bleed' }),
          fact(`${pName(g)} has no bleeding and no clots.`, g, { tag: 'clear' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'North Bay', wingIndex: 0, label: 'Allergy Screen',
        shown: [
          fact(`${pName(a)} has zero drug allergies.`, a, { tag: 'safe' }),
          fact(`${pName(c)} has zero drug allergies.`, c, { tag: 'safe' }),
        ],
        alt: [
          fact(`${pName(d)} has zero drug allergies.`, d, { tag: 'safe' }),
          fact(`${pName(b)} has zero drug allergies.`, b, { tag: 'safe' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'South Bay', wingIndex: 1, label: 'Waiting Room',
        shown: [
          fact(`${pName(e)} has normal leg veins (no clot).`, e, { tag: 'clear' }),
          fact(`${pName(f)} has normal leg veins (no clot).`, f, { tag: 'clear' }),
        ],
        alt: [
          fact(`${pName(e)} has normal leg veins (no clot).`, e, { tag: 'clear' }),
          fact(`${pName(g)} has normal leg veins (no clot).`, g, { tag: 'clear' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Blood-Thinner Safety Check',
      dispatch: 'Clot-busting medicine saves lives — unless the patient is already bleeding.',
      order: 'Give blood thinners to everyone with a dangerous leg clot — EXCEPT anyone who is bleeding or had brain surgery.',
      hint: 'Start with everyone who has a clot, then cross off anyone listed on the Bleeding or Recent Surgery cards.',
      cards,
      evaluate(activeCards) {
        const clots = collectByTag(activeCards, 'clot');
        const bleeds = new Set(collectByTag(activeCards, 'bleed'));
        const targets = uniqueSortedIds(clots.filter((id) => !bleeds.has(id)));
        const crossed = clots.filter((id) => bleeds.has(id));
        return {
          targets,
          proof: `${formatList(clots)} have leg clots; ruling out bleeding risks (${formatList(crossed)}) leaves ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, crossed, (id) => `${pName(id)} has a clot, but blood thinners would worsen their active bleeding risk.`),
        };
      },
    };
  },

  // #4 Hypothetico-deductive reasoning (Inside · Composite)
  'hypothetico-deductive': (rng) => {
    const [a, b, c, d, e, f, g] = pickPlayers(rng, 7);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Bedside Exam', wingIndex: 0, label: 'Belly Exam',
        shown: [
          fact(`${pName(a)}'s belly is stiff and hard as a board.`, a, { tag: 'rigid' }),
          fact(`${pName(b)}'s belly is stiff and hard as a board.`, b, { tag: 'rigid' }),
        ],
        alt: [
          fact(`${pName(c)}'s belly is stiff and hard as a board.`, c, { tag: 'rigid' }),
          fact(`${pName(b)}'s belly is stiff and hard as a board.`, b, { tag: 'rigid' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Blood Lab', wingIndex: 1, label: 'Red Blood Cell Test',
        shown: [
          fact(`${pName(a)}'s red blood cell count dropped sharply.`, a, { tag: 'low_rbc' }),
          fact(`${pName(c)}'s red blood cell count dropped sharply.`, c, { tag: 'low_rbc' }),
        ],
        alt: [
          fact(`${pName(b)}'s red blood cell count dropped sharply.`, b, { tag: 'low_rbc' }),
          fact(`${pName(c)}'s red blood cell count dropped sharply.`, c, { tag: 'low_rbc' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Bedside Exam', wingIndex: 0, label: 'More Belly Exams',
        shown: [
          fact(`${pName(c)}'s belly is completely soft and painless.`, c, { tag: 'soft' }),
          fact(`${pName(d)}'s belly is completely soft and painless.`, d, { tag: 'soft' }),
        ],
        alt: [
          fact(`${pName(a)}'s belly is completely soft and painless.`, a, { tag: 'soft' }),
          fact(`${pName(d)}'s belly is completely soft and painless.`, d, { tag: 'soft' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Blood Lab', wingIndex: 1, label: 'Normal Blood Counts',
        shown: [
          fact(`${pName(b)}'s red blood cell count is completely normal.`, b, { tag: 'ok_rbc' }),
          fact(`${pName(e)}'s red blood cell count is completely normal.`, e, { tag: 'ok_rbc' }),
        ],
        alt: [
          fact(`${pName(a)}'s red blood cell count is completely normal.`, a, { tag: 'ok_rbc' }),
          fact(`${pName(e)}'s red blood cell count is completely normal.`, e, { tag: 'ok_rbc' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Bedside Exam', wingIndex: 0, label: 'Injury Notes',
        shown: [
          fact(`${pName(f)} has a broken arm, soft belly, normal blood.`, f, { tag: 'other' }),
          fact(`${pName(g)} has a cut forehead, soft belly, normal blood.`, g, { tag: 'other' }),
        ],
        alt: [
          fact(`${pName(g)} has a broken arm, soft belly, normal blood.`, g, { tag: 'other' }),
          fact(`${pName(f)} has a cut forehead, soft belly, normal blood.`, f, { tag: 'other' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Blood Lab', wingIndex: 1, label: 'Working Prediction',
        shown: [
          fact(`Prediction: True internal belly bleed causes BOTH a board-hard belly AND falling red blood cells.`, [], { tag: 'rule' }),
          fact(`${pName(d)} has chronic mild anemia from diet, no trauma.`, d, { tag: 'other' }),
        ],
        alt: [
          fact(`Prediction: True internal belly bleed causes BOTH a board-hard belly AND falling red blood cells.`, [], { tag: 'rule' }),
          fact(`${pName(e)} has chronic mild anemia from diet, no trauma.`, e, { tag: 'other' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Testing for Hidden Internal Bleeding',
      dispatch: 'You suspect hidden belly bleeding — test your hypothesis against two bedside predictions.',
      order: 'If someone is bleeding inside their belly, their belly turns board-hard AND their red blood cells drop. Treat who passes BOTH tests.',
      hint: 'Check who appears on both Belly Exam (hard belly) and Red Blood Cell Test (sharp drop).',
      cards,
      evaluate(activeCards) {
        const rigid = new Set(collectByTag(activeCards, 'rigid'));
        const low = new Set(collectByTag(activeCards, 'low_rbc'));
        const targets = uniqueSortedIds([...rigid].filter((id) => low.has(id)));
        const rivals = [...rigid, ...low].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `${formatList(targets)} confirmed both testable predictions (board-hard belly + falling red blood cells).`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} failed one of the two predicted signs of internal bleeding.`),
        };
      },
    };
  },

  // #5 Causal reasoning (Inside · Atomic)
  'causal-reasoning': (rng) => {
    const [a, b, c, d, e, f, g] = pickPlayers(rng, 7);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Trauma Bay 1', wingIndex: 0, label: 'Airway Alert',
        shown: [
          fact(`${pName(a)}'s kinked breathing tube is DIRECTLY causing oxygen to drop.`, a, { tag: 'direct_cause' }),
          fact(`${pName(b)} coughed once, but oxygen is steady at 99%.`, b, { tag: 'coincidence' }),
        ],
        alt: [
          fact(`${pName(c)}'s kinked breathing tube is DIRECTLY causing oxygen to drop.`, c, { tag: 'direct_cause' }),
          fact(`${pName(b)} coughed once, but oxygen is steady at 99%.`, b, { tag: 'coincidence' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Trauma Bay 2', wingIndex: 1, label: 'Bleeding Alert',
        shown: [
          fact(`${pName(d)}'s torn leg artery is DIRECTLY causing blood pressure to crash.`, d, { tag: 'direct_cause' }),
          fact(`${pName(c)} has a loud monitor beep caused by a loose wire (not sick).`, c, { tag: 'coincidence' }),
        ],
        alt: [
          fact(`${pName(b)}'s torn leg artery is DIRECTLY causing blood pressure to crash.`, b, { tag: 'direct_cause' }),
          fact(`${pName(d)} has a loud monitor beep caused by a loose wire (not sick).`, d, { tag: 'coincidence' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Trauma Bay 1', wingIndex: 0, label: 'Ward Coincidence',
        shown: [
          fact(`${pName(e)} sneezed right when the lights flickered (unrelated).`, e, { tag: 'coincidence' }),
          fact(`${pName(f)} wore a blue jacket just like the first crash victim (unrelated).`, f, { tag: 'coincidence' }),
        ],
        alt: [
          fact(`${pName(g)} sneezed right when the lights flickered (unrelated).`, g, { tag: 'coincidence' }),
          fact(`${pName(f)} wore a blue jacket just like the first crash victim (unrelated).`, f, { tag: 'coincidence' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Trauma Bay 2', wingIndex: 1, label: 'Sensor Check',
        shown: [
          fact(`${pName(g)}'s finger clip fell off — false low-oxygen alarm.`, g, { tag: 'coincidence' }),
          fact(`${pName(e)} has calm pulse and warm hands.`, e, { tag: 'coincidence' }),
        ],
        alt: [
          fact(`${pName(f)}'s finger clip fell off — false low-oxygen alarm.`, f, { tag: 'coincidence' }),
          fact(`${pName(e)} has calm pulse and warm hands.`, e, { tag: 'coincidence' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Trauma Bay 1', wingIndex: 0, label: 'Nurse Verification',
        shown: [
          fact(`Fixing ${pName(a)}'s tube immediately restores oxygen.`, a, { tag: 'note' }),
          fact(`Clamping ${pName(d)}'s artery immediately stops the crash.`, d, { tag: 'note' }),
        ],
        alt: [
          fact(`Fixing ${pName(c)}'s tube immediately restores oxygen.`, c, { tag: 'note' }),
          fact(`Clamping ${pName(b)}'s artery immediately stops the crash.`, b, { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Trauma Bay 2', wingIndex: 1, label: 'Hallway Note',
        shown: [
          fact(`${pName(b)}'s monitor cable was re-taped; vitals are normal.`, b, { tag: 'coincidence' }),
          fact(`${pName(f)} is waiting for an X-ray on a bruised thumb.`, f, { tag: 'coincidence' }),
        ],
        alt: [
          fact(`${pName(d)}'s monitor cable was re-taped; vitals are normal.`, d, { tag: 'coincidence' }),
          fact(`${pName(f)} is waiting for an X-ray on a bruised thumb.`, f, { tag: 'coincidence' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Real Causes vs. False Alarms',
      dispatch: 'Monitors are screaming across the ward — separate real physical causes from loose wires and coincidences.',
      order: 'Treat every patient whose physical injury is DIRECTLY causing a vital sign to crash right now.',
      hint: 'Skip loose wires, fallen clips, and unrelated coincidences — find the real body cause.',
      cards,
      evaluate(activeCards) {
        const targets = collectByTag(activeCards, 'direct_cause');
        const others = collectByTag(activeCards, 'coincidence');
        return {
          targets,
          proof: `${formatList(targets)} have real physical emergencies directly driving vital-sign collapse.`,
          rival: buildRivalInfo(targets, others, (id) => `${pName(id)}'s alarm was a false wire glitch or coincidence, not a true physical cause.`),
        };
      },
    };
  },

  // #6 Root-cause analysis (After · Composite)
  'root-cause-analysis': (rng) => {
    const [r1, r2, m1, m2, end1, end2, bystander] = pickPlayers(rng, 7);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Shift Review', wingIndex: 0, label: 'Chain 1 · Step 1',
        shown: [
          fact(`${pName(r1)}'s leaking chemical jacket caused ${pName(m1)} to faint.`, [r1, m1], { tag: 'chain', from: r1, to: m1 }),
          fact(`${pName(bystander)} sat safely across the hall.`, bystander, { tag: 'safe' }),
        ],
        alt: [
          fact(`${pName(m1)}'s leaking chemical jacket caused ${pName(r1)} to faint.`, [m1, r1], { tag: 'chain', from: m1, to: r1 }),
          fact(`${pName(bystander)} sat safely across the hall.`, bystander, { tag: 'safe' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Shift Review', wingIndex: 0, label: 'Chain 1 · Step 2',
        shown: [
          fact(`${pName(m1)}'s sudden collapse delayed ${pName(end1)}'s breathing care.`, [m1, end1], { tag: 'chain', from: m1, to: end1 }),
          fact(`Hospital staff cleared the hallway afterward.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(r1)}'s sudden collapse delayed ${pName(end1)}'s breathing care.`, [r1, end1], { tag: 'chain', from: r1, to: end1 }),
          fact(`Hospital staff cleared the hallway afterward.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Safety Board', wingIndex: 1, label: 'Chain 2 · Step 1',
        shown: [
          fact(`${pName(r2)}'s spilled IV bottle short-circuited ${pName(m2)}'s monitor.`, [r2, m2], { tag: 'chain', from: r2, to: m2 }),
          fact(`Maintenance replaced the outlet at 04:00.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(m2)}'s spilled IV bottle short-circuited ${pName(r2)}'s monitor.`, [m2, r2], { tag: 'chain', from: m2, to: r2 }),
          fact(`Maintenance replaced the outlet at 04:00.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Safety Board', wingIndex: 1, label: 'Chain 2 · Step 2',
        shown: [
          fact(`${pName(m2)}'s dark monitor caused nurses to miss ${pName(end2)}'s fever.`, [m2, end2], { tag: 'chain', from: m2, to: end2 }),
          fact(`Backup batteries were checked afterward.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(r2)}'s dark monitor caused nurses to miss ${pName(end2)}'s fever.`, [r2, end2], { tag: 'chain', from: r2, to: end2 }),
          fact(`Backup batteries were checked afterward.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Shift Review', wingIndex: 0, label: 'Clean Bays',
        shown: [
          fact(`${pName(bystander)} had no accidents and triggered no delays.`, bystander, { tag: 'safe' }),
          fact(`Both chains started with a single preventable root event.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(bystander)} had no accidents and triggered no delays.`, bystander, { tag: 'safe' }),
          fact(`Both chains started with a single preventable root event.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Safety Board', wingIndex: 1, label: 'Final Report',
        shown: [
          fact(`${pName(end1)} and ${pName(end2)} were only victims at the end of the dominoes.`, [end1, end2], { tag: 'note' }),
          fact(`Fix the root origins so the dominoes never fall again.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(end1)} and ${pName(end2)} were only victims at the end of the dominoes.`, [end1, end2], { tag: 'note' }),
          fact(`Fix the root origins so the dominoes never fall again.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Post-Shift Safety Review',
      dispatch: 'Two domino-effect mishaps disrupted the ward — find where each chain truly began.',
      order: 'Trace both domino chains back to their starting point: click the patient(s) whose event STARTED a chain (with nobody before them).',
      hint: 'Find who caused someone else’s problem, while nobody caused theirs.',
      cards,
      evaluate(activeCards) {
        const links = collectFactsByTag(activeCards, 'chain');
        const starters = new Set(links.map((l) => l.from));
        const affected = new Set(links.map((l) => l.to));
        const targets = uniqueSortedIds([...starters].filter((id) => !affected.has(id)));
        const mids = [...affected];
        return {
          targets,
          proof: `${formatList(targets)} sat at the very beginning of the domino chains with zero upstream causes.`,
          rival: buildRivalInfo(targets, mids, (id) => `${pName(id)} was a downstream effect, not the root origin of the chain.`),
        };
      },
    };
  },

  // #7 Mechanistic reasoning (Inside · Composite)
  'mechanistic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Chest Check', wingIndex: 0, label: 'Lung Air Pressure',
        shown: [
          fact(`${pName(a)} has trapped air pushing the left lung flat.`, a, { tag: 'air' }),
          fact(`${pName(b)} has trapped air pushing the right lung flat.`, b, { tag: 'air' }),
        ],
        alt: [
          fact(`${pName(c)} has trapped air pushing the left lung flat.`, c, { tag: 'air' }),
          fact(`${pName(b)} has trapped air pushing the right lung flat.`, b, { tag: 'air' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Heart Monitor', wingIndex: 1, label: 'Heart Squeeze Check',
        shown: [
          fact(`${pName(a)}'s neck veins are bulging and blood pressure is collapsing.`, a, { tag: 'squeeze' }),
          fact(`${pName(c)}'s neck veins are bulging from coughing, normal lungs.`, c, { tag: 'squeeze' }),
        ],
        alt: [
          fact(`${pName(b)}'s neck veins are bulging and blood pressure is collapsing.`, b, { tag: 'squeeze' }),
          fact(`${pName(c)}'s neck veins are bulging from coughing, normal lungs.`, c, { tag: 'squeeze' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Chest Check', wingIndex: 0, label: 'Stable Chest Note',
        shown: [
          fact(`${pName(b)}'s heart is NOT squeezed — blood pressure is normal (small air pocket).`, b, { tag: 'small' }),
          fact(`${pName(d)} has a broken collarbone with normal lungs.`, d, { tag: 'other' }),
        ],
        alt: [
          fact(`${pName(a)}'s heart is NOT squeezed — blood pressure is normal (small air pocket).`, a, { tag: 'small' }),
          fact(`${pName(d)} has a broken collarbone with normal lungs.`, d, { tag: 'other' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Heart Monitor', wingIndex: 1, label: 'How It Works',
        shown: [
          fact(`Body chain: Trapped chest air → pushes heart sideways → bulging neck veins & crashing BP.`, [], { tag: 'note' }),
          fact(`Only a needle air-release saves someone when BOTH steps happen.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Body chain: Trapped chest air → pushes heart sideways → bulging neck veins & crashing BP.`, [], { tag: 'note' }),
          fact(`Only a needle air-release saves someone when BOTH steps happen.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Chest Check', wingIndex: 0, label: 'Other Bays',
        shown: [
          fact(`${pName(e)} has low blood sugar (shaky hands, normal lungs).`, e, { tag: 'other' }),
          fact(`${pName(f)} has a mild asthma wheeze, normal blood pressure.`, f, { tag: 'other' }),
        ],
        alt: [
          fact(`${pName(f)} has low blood sugar (shaky hands, normal lungs).`, f, { tag: 'other' }),
          fact(`${pName(e)} has a mild asthma wheeze, normal blood pressure.`, e, { tag: 'other' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Heart Monitor', wingIndex: 1, label: 'Clear Lungs',
        shown: [
          fact(`${pName(c)} has completely clear lungs on ultrasound.`, c, { tag: 'other' }),
          fact(`${pName(d)} has steady blood pressure and clear breathing.`, d, { tag: 'other' }),
        ],
        alt: [
          fact(`${pName(e)} has completely clear lungs on ultrasound.`, e, { tag: 'other' }),
          fact(`${pName(d)} has steady blood pressure and clear breathing.`, d, { tag: 'other' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Collapsed Lung Emergency',
      dispatch: 'Trapped chest air can crush the heart in seconds — release the air ONLY for the patient in full pressure collapse.',
      order: 'Release trapped chest air for anyone showing BOTH trapped chest air AND bulging neck veins with crashing blood pressure.',
      hint: 'Check who has both Step 1 (trapped air) and Step 2 (heart squeeze / bulging neck veins).',
      cards,
      evaluate(activeCards) {
        const air = new Set(collectByTag(activeCards, 'air'));
        const squeeze = new Set(collectByTag(activeCards, 'squeeze'));
        const targets = uniqueSortedIds([...air].filter((id) => squeeze.has(id)));
        const rivals = [...air, ...squeeze].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `${formatList(targets)} show the full pressure-collapse chain: trapped air physically pinching blood return to the heart.`,
          rival: buildRivalInfo(targets, rivals, (id) =>
            air.has(id)
              ? `${pName(id)} has a small air pocket, but their heart is not being squeezed yet.`
              : `${pName(id)} has bulging veins from coughing without trapped chest air.`
          ),
        };
      },
    };
  },

  // #8 Forensic reasoning (After · Composite · Autopsy!)
  'forensic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Crash Site', wingIndex: 0, label: 'Ambulance Scene Log',
        shown: [
          fact(`${pName(a)} already had a deep chest wound at the crash scene.`, a, { tag: 'pre_hosp' }),
          fact(`${pName(b)} already had a deep head wound at the crash scene.`, b, { tag: 'pre_hosp' }),
        ],
        alt: [
          fact(`${pName(c)} already had a deep chest wound at the crash scene.`, c, { tag: 'pre_hosp' }),
          fact(`${pName(b)} already had a deep head wound at the crash scene.`, b, { tag: 'pre_hosp' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Autopsy Room', wingIndex: 1, label: 'Bruise Age Test',
        shown: [
          fact(`${pName(a)}'s fatal bruise is 4 hours old (before hospital arrival).`, a, { tag: 'old_bruise' }),
          fact(`${pName(c)}'s fatal bruise is 4 hours old (before hospital arrival).`, c, { tag: 'old_bruise' }),
        ],
        alt: [
          fact(`${pName(b)}'s fatal bruise is 4 hours old (before hospital arrival).`, b, { tag: 'old_bruise' }),
          fact(`${pName(c)}'s fatal bruise is 4 hours old (before hospital arrival).`, c, { tag: 'old_bruise' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Autopsy Room', wingIndex: 1, label: 'ER Procedure Review',
        shown: [
          fact(`${pName(b)}'s fatal reaction came from a late dye scan inside the ER.`, b, { tag: 'er_cause' }),
          fact(`${pName(d)} cracked a rib during CPR inside the ER.`, d, { tag: 'er_cause' }),
        ],
        alt: [
          fact(`${pName(a)}'s fatal reaction came from a late dye scan inside the ER.`, a, { tag: 'er_cause' }),
          fact(`${pName(d)} cracked a rib during CPR inside the ER.`, d, { tag: 'er_cause' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Crash Site', wingIndex: 0, label: 'Witness Timeline',
        shown: [
          fact(`${pName(e)} walked into the ER on their own; collapsed 2 hours later.`, e, { tag: 'er_cause' }),
          fact(`${pName(f)} had no injuries at the crash scene.`, f, { tag: 'other' }),
        ],
        alt: [
          fact(`${pName(f)} walked into the ER on their own; collapsed 2 hours later.`, f, { tag: 'er_cause' }),
          fact(`${pName(e)} had no injuries at the crash scene.`, e, { tag: 'other' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Autopsy Room', wingIndex: 1, label: 'Coroner Checklist',
        shown: [
          fact(`Rule: Crash-site fatal cause requires scene injury + pre-hospital bruise + NO ER-caused complication.`, [], { tag: 'note' }),
          fact(`${pName(c)} had no crash-site injury recorded by paramedics.`, c, { tag: 'other' }),
        ],
        alt: [
          fact(`Rule: Crash-site fatal cause requires scene injury + pre-hospital bruise + NO ER-caused complication.`, [], { tag: 'note' }),
          fact(`${pName(a)} had no crash-site injury recorded by paramedics.`, a, { tag: 'other' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Crash Site', wingIndex: 0, label: 'Final Toxicology',
        shown: [
          fact(`${pName(d)} had clean blood work prior to CPR.`, d, { tag: 'other' }),
          fact(`${pName(f)} survived with minor bruising only.`, f, { tag: 'other' }),
        ],
        alt: [
          fact(`${pName(e)} had clean blood work prior to CPR.`, e, { tag: 'other' }),
          fact(`${pName(f)} survived with minor bruising only.`, f, { tag: 'other' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Coroner’s Autopsy Reconstruction',
      dispatch: 'The medical examiner needs to know who died strictly from pre-hospital crash injuries — not an ER complication.',
      order: 'Identify the case(s) with BOTH a crash-site wound AND a 4-hour-old pre-hospital bruise — and NO ER-caused fatal complication.',
      hint: 'Match Crash Site Log + Bruise Age Test, then rule out anyone on ER Procedure Review.',
      cards,
      evaluate(activeCards) {
        const pre = new Set(collectByTag(activeCards, 'pre_hosp'));
        const oldB = new Set(collectByTag(activeCards, 'old_bruise'));
        const er = new Set(collectByTag(activeCards, 'er_cause'));
        const targets = uniqueSortedIds([...pre].filter((id) => oldB.has(id) && !er.has(id)));
        const rivals = [...pre, ...oldB].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Reconstructing all clues proves ${formatList(targets)} suffered their fatal injury at the crash site before reaching the ER.`,
          rival: buildRivalInfo(targets, rivals, (id) =>
            er.has(id)
              ? `${pName(id)} had an ER complication that explains the later decline.`
              : `${pName(id)} is missing either crash-site confirmation or pre-hospital bruise age.`
          ),
        };
      },
    };
  },

  // #9 Evidential reasoning (Inside · Meta)
  'evidential-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Confirmed Lab', wingIndex: 0, label: 'Blood Test #1',
        shown: [
          fact(`${pName(a)} has confirmed dangerous potassium level.`, a, { tag: 'proof' }),
          fact(`${pName(b)} has confirmed dangerous potassium level.`, b, { tag: 'proof' }),
        ],
        alt: [
          fact(`${pName(c)} has confirmed dangerous potassium level.`, c, { tag: 'proof' }),
          fact(`${pName(b)} has confirmed dangerous potassium level.`, b, { tag: 'proof' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Confirmed Lab', wingIndex: 0, label: 'Heart Strip #2',
        shown: [
          fact(`${pName(a)}'s heart monitor confirms dangerous potassium spikes.`, a, { tag: 'proof' }),
          fact(`${pName(c)}'s heart monitor confirms dangerous potassium spikes.`, c, { tag: 'proof' }),
        ],
        alt: [
          fact(`${pName(b)}'s heart monitor confirms dangerous potassium spikes.`, b, { tag: 'proof' }),
          fact(`${pName(c)}'s heart monitor confirms dangerous potassium spikes.`, c, { tag: 'proof' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Unverified', wingIndex: 1, label: 'Hallway Rumor',
        shown: [
          fact(`Unconfirmed guess: Someone thinks ${pName(b)} might have high potassium.`, b, { tag: 'rumor' }),
          fact(`Unconfirmed guess: Someone thinks ${pName(d)} looks pale.`, d, { tag: 'rumor' }),
        ],
        alt: [
          fact(`Unconfirmed guess: Someone thinks ${pName(a)} might have high potassium.`, a, { tag: 'rumor' }),
          fact(`Unconfirmed guess: Someone thinks ${pName(d)} looks pale.`, d, { tag: 'rumor' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Confirmed Lab', wingIndex: 0, label: 'Kidney Check #3',
        shown: [
          fact(`${pName(d)} has normal kidneys and normal heart strip.`, d, { tag: 'safe' }),
          fact(`${pName(e)} has normal kidneys and normal heart strip.`, e, { tag: 'safe' }),
        ],
        alt: [
          fact(`${pName(f)} has normal kidneys and normal heart strip.`, f, { tag: 'safe' }),
          fact(`${pName(e)} has normal kidneys and normal heart strip.`, e, { tag: 'safe' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Unverified', wingIndex: 1, label: 'Secondhand Note',
        shown: [
          fact(`Bystander heard ${pName(c)} skipped breakfast (unverified).`, c, { tag: 'rumor' }),
          fact(`Bystander heard ${pName(f)} felt dizzy earlier (unverified).`, f, { tag: 'rumor' }),
        ],
        alt: [
          fact(`Bystander heard ${pName(b)} skipped breakfast (unverified).`, b, { tag: 'rumor' }),
          fact(`Bystander heard ${pName(f)} felt dizzy earlier (unverified).`, f, { tag: 'rumor' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Confirmed Lab', wingIndex: 0, label: 'Medication Rule',
        shown: [
          fact(`Emergency IV calcium requires AT LEAST 2 confirmed test cards (never act on rumors).`, [], { tag: 'note' }),
          fact(`${pName(f)} has normal blood potassium.`, f, { tag: 'safe' }),
        ],
        alt: [
          fact(`Emergency IV calcium requires AT LEAST 2 confirmed test cards (never act on rumors).`, [], { tag: 'note' }),
          fact(`${pName(e)} has normal blood potassium.`, e, { tag: 'safe' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Weighing Proof vs. Rumor',
      dispatch: 'Emergency heart-stabilizing drugs are risky if given by mistake — demand strong independent proof.',
      order: 'Treat ONLY patients backed by at least 2 Confirmed Lab / Monitor test cards (ignore unverified hallway rumors).',
      hint: 'Count how many Confirmed cards support each patient — skip Unverified rumor cards.',
      cards,
      evaluate(activeCards) {
        const counts = collectMapByTag(activeCards, 'proof');
        const targets = uniqueSortedIds([...counts.entries()].filter(([, n]) => n >= 2).map(([id]) => id));
        const singles = [...counts.entries()].filter(([, n]) => n === 1).map(([id]) => id);
        return {
          targets,
          proof: `Only ${formatList(targets)} have two independent confirmed tests backing emergency treatment.`,
          rival: buildRivalInfo(targets, singles, (id) => `${pName(id)} only has 1 confirmed test (unverified rumors do not count as proof).`),
        };
      },
    };
  },

  // #10 Bayesian reasoning (Inside · Composite)
  'bayesian-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Early Estimate', wingIndex: 0, label: 'Ambulance Risk Score',
        shown: [
          fact(`${pName(a)} arrives with early danger score +5.`, a, { tag: 'score', value: 5 }),
          fact(`${pName(b)} arrives with early danger score +6.`, b, { tag: 'score', value: 6 }),
        ],
        alt: [
          fact(`${pName(a)} arrives with early danger score +3.`, a, { tag: 'score', value: 3 }),
          fact(`${pName(b)} arrives with early danger score +6.`, b, { tag: 'score', value: 6 }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Early Estimate', wingIndex: 0, label: 'More Early Scores',
        shown: [
          fact(`${pName(c)} arrives with early danger score +4.`, c, { tag: 'score', value: 4 }),
          fact(`${pName(d)} arrives with early danger score +5.`, d, { tag: 'score', value: 5 }),
        ],
        alt: [
          fact(`${pName(c)} arrives with early danger score +5.`, c, { tag: 'score', value: 5 }),
          fact(`${pName(d)} arrives with early danger score +2.`, d, { tag: 'score', value: 2 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'New ER Scan', wingIndex: 1, label: 'CT Scan Update 1',
        shown: [
          fact(`${pName(a)}'s new scan shows active bleed (+4 danger).`, a, { tag: 'score', value: 4 }),
          fact(`${pName(b)}'s new scan is totally clean (-4 danger).`, b, { tag: 'score', value: -4 }),
        ],
        alt: [
          fact(`${pName(a)}'s new scan is totally clean (-3 danger).`, a, { tag: 'score', value: -3 }),
          fact(`${pName(b)}'s new scan shows active bleed (+3 danger).`, b, { tag: 'score', value: 3 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'New ER Scan', wingIndex: 1, label: 'CT Scan Update 2',
        shown: [
          fact(`${pName(c)}'s new scan shows swelling (+4 danger).`, c, { tag: 'score', value: 4 }),
          fact(`${pName(d)}'s new scan is totally clean (-3 danger).`, d, { tag: 'score', value: -3 }),
        ],
        alt: [
          fact(`${pName(c)}'s new scan is totally clean (-2 danger).`, c, { tag: 'score', value: -2 }),
          fact(`${pName(d)}'s new scan shows active bleed (+6 danger).`, d, { tag: 'score', value: 6 }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Early Estimate', wingIndex: 0, label: 'Low-Risk Arrivals',
        shown: [
          fact(`${pName(e)} arrives with early danger score +2.`, e, { tag: 'score', value: 2 }),
          fact(`${pName(f)} arrives with early danger score +3.`, f, { tag: 'score', value: 3 }),
        ],
        alt: [
          fact(`${pName(e)} arrives with early danger score +2.`, e, { tag: 'score', value: 2 }),
          fact(`${pName(f)} arrives with early danger score +1.`, f, { tag: 'score', value: 1 }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'New ER Scan', wingIndex: 1, label: 'Clean Follow-ups',
        shown: [
          fact(`${pName(e)}'s scan is normal (+0 danger).`, e, { tag: 'score', value: 0 }),
          fact(`${pName(f)}'s scan is normal (+0 danger).`, f, { tag: 'score', value: 0 }),
        ],
        alt: [
          fact(`${pName(e)}'s scan is normal (+0 danger).`, e, { tag: 'score', value: 0 }),
          fact(`${pName(f)}'s scan is normal (+0 danger).`, f, { tag: 'score', value: 0 }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Updating Danger After New Scans',
      dispatch: 'Ambulance guesses are just starting points — update every patient’s danger score once the ER scan comes back.',
      order: 'Add each patient’s Early Score + New ER Scan update. Treat everyone whose updated total reaches 8 or higher.',
      hint: 'A clean scan subtracts danger and can overturn an alarming early score.',
      cards,
      evaluate(activeCards) {
        const totals = collectMapByTag(activeCards, 'score');
        const targets = uniqueSortedIds([...totals.entries()].filter(([, v]) => v >= 8).map(([id]) => id));
        const below = [...totals.entries()].filter(([, v]) => v < 8).sort((x, y) => y[1] - x[1]).map(([id]) => id);
        return {
          targets,
          proof: `After updating with new scan results, ${formatList(targets)} reach 8+ total danger (${targets.map((id) => `${pName(id)}: ${totals.get(id)}`).join(', ')}).`,
          rival: buildRivalInfo(targets, below, (id) => `${pName(id)}'s clean scan lowered their updated danger to ${totals.get(id)} (below 8).`),
        };
      },
    };
  },

  // =========================================================================
  // FAMILY 2: LOGICAL & FORMAL REASONING (#11–#20)
  // =========================================================================

  // #11 Deductive reasoning (Before · Atomic)
  'deductive-reasoning': (rng) => {
    const [a, b, c, d, e, f, g] = pickPlayers(rng, 7);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Hospital Rule', wingIndex: 0, label: 'Mandatory Trauma Rule',
        shown: [
          fact(`STRICT RULE: Every patient with spurting bright-red bleeding MUST go straight to Bay 1.`, [], { tag: 'rule' }),
          fact(`Scrapes, sprains, and bruises wait in the lobby.`, [], { tag: 'rule' }),
        ],
        alt: [
          fact(`STRICT RULE: Every patient with spurting bright-red bleeding MUST go straight to Bay 1.`, [], { tag: 'rule' }),
          fact(`Scrapes, sprains, and bruises wait in the lobby.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Ambulance 1', wingIndex: 1, label: 'Paramedic Report 1',
        shown: [
          fact(`${pName(a)} has spurting bright-red bleeding from the arm.`, a, { tag: 'artery' }),
          fact(`${pName(b)} has a bruised knee (no bleeding).`, b, { tag: 'minor' }),
        ],
        alt: [
          fact(`${pName(b)} has spurting bright-red bleeding from the arm.`, b, { tag: 'artery' }),
          fact(`${pName(a)} has a bruised knee (no bleeding).`, a, { tag: 'minor' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Ambulance 2', wingIndex: 1, label: 'Paramedic Report 2',
        shown: [
          fact(`${pName(c)} has spurting bright-red bleeding from the leg.`, c, { tag: 'artery' }),
          fact(`${pName(d)} has a minor forehead scrape (stopped oozing).`, d, { tag: 'minor' }),
        ],
        alt: [
          fact(`${pName(d)} has spurting bright-red bleeding from the leg.`, d, { tag: 'artery' }),
          fact(`${pName(c)} has a minor forehead scrape (stopped oozing).`, c, { tag: 'minor' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Ambulance 1', wingIndex: 1, label: 'Walk-In Intake',
        shown: [
          fact(`${pName(e)} twisted an ankle stepping off the curb.`, e, { tag: 'minor' }),
          fact(`${pName(f)} has a mild nosebleed (already slowed down).`, f, { tag: 'minor' }),
        ],
        alt: [
          fact(`${pName(e)} has spurting bright-red bleeding from the wrist.`, e, { tag: 'artery' }),
          fact(`${pName(f)} has a mild nosebleed (already slowed down).`, f, { tag: 'minor' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Ambulance 2', wingIndex: 1, label: 'Triage Desk',
        shown: [
          fact(`${pName(g)} has a swollen finger (no open wound).`, g, { tag: 'minor' }),
          fact(`${pName(b)} is talking comfortably while seated.`, b, { tag: 'minor' }),
        ],
        alt: [
          fact(`${pName(g)} has a swollen finger (no open wound).`, g, { tag: 'minor' }),
          fact(`${pName(a)} is talking comfortably while seated.`, a, { tag: 'minor' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Hospital Rule', wingIndex: 0, label: 'Charge Nurse Note',
        shown: [
          fact(`Follow the strict bright-red bleeding rule without exception.`, [], { tag: 'note' }),
          fact(`Do not pull minor scrapes ahead of arterial bleeds.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Follow the strict bright-red bleeding rule without exception.`, [], { tag: 'note' }),
          fact(`Do not pull minor scrapes ahead of arterial bleeds.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Strict Red-Tag Protocol',
      dispatch: 'Ambulances are unloading fast — apply the hospital’s ironclad rule with zero guesswork.',
      order: 'Follow the strict rule: pull EVERY patient with spurting bright-red bleeding straight into Bay 1.',
      hint: 'Check which patients explicitly match "spurting bright-red bleeding."',
      cards,
      evaluate(activeCards) {
        const targets = collectByTag(activeCards, 'artery');
        const minors = collectByTag(activeCards, 'minor');
        return {
          targets,
          proof: `Applying the strict rule directly selects ${formatList(targets)} — the only patients with spurting bright-red bleeding.`,
          rival: buildRivalInfo(targets, minors, (id) => `${pName(id)} only has a minor scrape, sprain, or mild ooze.`),
        };
      },
    };
  },

  // #12 Inductive reasoning (Before · Atomic)
  'inductive-reasoning': (rng) => {
    const [a, b, c, d, e, f, g] = pickPlayers(rng, 7);
    const northHeavy = rng() < 0.5;
    const hotSite = northHeavy ? 'North Tunnel' : 'South Bridge';
    const coolSite = northHeavy ? 'South Bridge' : 'North Tunnel';
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: hotSite, wingIndex: 0, label: 'Early Arrival #1',
        shown: [
          fact(`${pName(a)} arrived from ${hotSite} with severe smoke lung damage.`, a, { tag: 'early_hot', site: hotSite }),
          fact(`Visible thick chemical soot on clothes.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(a)} arrived from ${coolSite} with severe smoke lung damage.`, a, { tag: 'early_hot', site: coolSite }),
          fact(`Visible thick chemical soot on clothes.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: hotSite, wingIndex: 0, label: 'Early Arrival #2',
        shown: [
          fact(`${pName(b)} arrived from ${hotSite} with severe smoke lung damage.`, b, { tag: 'early_hot', site: hotSite }),
          fact(`Same soot pattern as Arrival #1.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(b)} arrived from ${coolSite} with severe smoke lung damage.`, b, { tag: 'early_hot', site: coolSite }),
          fact(`Same soot pattern as Arrival #1.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: hotSite, wingIndex: 0, label: 'Early Arrival #3',
        shown: [
          fact(`${pName(c)} arrived from ${hotSite} with severe smoke lung damage.`, c, { tag: 'early_hot', site: hotSite }),
          fact(`${pName(d)} arrived from ${coolSite} with only a minor bruised shin.`, d, { tag: 'early_cool', site: coolSite }),
        ],
        alt: [
          fact(`${pName(c)} arrived from ${coolSite} with severe smoke lung damage.`, c, { tag: 'early_hot', site: coolSite }),
          fact(`${pName(d)} arrived from ${hotSite} with only a minor bruised shin.`, d, { tag: 'early_cool', site: hotSite }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Triage Alert', wingIndex: 1, label: 'Pattern Notice',
        shown: [
          fact(`Spot which crash site sent ALL the early severe smoke injuries (01:00–03:00).`, [], { tag: 'note' }),
          fact(`Then pre-treat the brand-new 05:00–06:00 arrivals coming from THAT SAME site.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Spot which crash site sent ALL the early severe smoke injuries (01:00–03:00).`, [], { tag: 'note' }),
          fact(`Then pre-treat the brand-new 05:00–06:00 arrivals coming from THAT SAME site.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: hotSite, wingIndex: 0, label: 'New Arrival A',
        shown: [
          fact(`${pName(e)} just rolled in from ${hotSite} (lungs not checked yet).`, e, { tag: 'late', site: hotSite }),
          fact(`${pName(f)} just rolled in from ${coolSite} (lungs not checked yet).`, f, { tag: 'late', site: coolSite }),
        ],
        alt: [
          fact(`${pName(f)} just rolled in from ${hotSite} (lungs not checked yet).`, f, { tag: 'late', site: hotSite }),
          fact(`${pName(e)} just rolled in from ${coolSite} (lungs not checked yet).`, e, { tag: 'late', site: coolSite }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: coolSite, wingIndex: 1, label: 'New Arrival B',
        shown: [
          fact(`${pName(g)} just rolled in from ${hotSite} (lungs not checked yet).`, g, { tag: 'late', site: hotSite }),
          fact(`Both sites have stopped sending more buses.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(g)} just rolled in from ${coolSite} (lungs not checked yet).`, g, { tag: 'late', site: coolSite }),
          fact(`Both sites have stopped sending more buses.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Spotting the Disaster Pattern',
      dispatch: 'Early patients reveal which crash site has toxic smoke — prepare oxygen for the newest arrivals from that site.',
      order: 'See which crash site sent the early severe smoke cases (01:00–03:00), then treat the NEW arrivals (05:00–06:00) from that same site.',
      hint: 'Check where the 01:00–03:00 smoke injuries came from, then pick the 05:00–06:00 arrivals from that exact site.',
      cards,
      evaluate(activeCards) {
        const early = collectFactsByTag(activeCards, 'early_hot');
        const siteCounts = new Map();
        for (const f of early) siteCounts.set(f.site, (siteCounts.get(f.site) || 0) + 1);
        const dominantSite = [...siteCounts.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] || hotSite;
        const late = collectFactsByTag(activeCards, 'late');
        const targets = uniqueSortedIds(late.filter((f) => f.site === dominantSite).map((f) => f.patients[0]));
        const others = late.filter((f) => f.site !== dominantSite).map((f) => f.patients[0]);
        return {
          targets,
          proof: `Every early smoke injury came from ${dominantSite}, so new arrivals from ${dominantSite} (${formatList(targets)}) get immediate oxygen.`,
          rival: buildRivalInfo(targets, others, (id) => `${pName(id)} arrived from the other site, which has not shown toxic smoke injuries.`),
        };
      },
    };
  },

  // #13 Syllogistic reasoning (Before · Atomic)
  'syllogistic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Airlift Rules', wingIndex: 0, label: 'Category Rules',
        shown: [
          fact(`Rule 1: Every Helicopter Patient MUST be in the Critical Surgery Group.`, [], { tag: 'note' }),
          fact(`Rule 2: Only patients with a Cleared Airway may board the helicopter.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Rule 1: Every Helicopter Patient MUST be in the Critical Surgery Group.`, [], { tag: 'note' }),
          fact(`Rule 2: Only patients with a Cleared Airway may board the helicopter.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Surgery List', wingIndex: 1, label: 'Critical Surgery Group',
        shown: [
          fact(`${pName(a)} is in the Critical Surgery Group.`, a, { tag: 'surg' }),
          fact(`${pName(b)} is in the Critical Surgery Group.`, b, { tag: 'surg' }),
        ],
        alt: [
          fact(`${pName(c)} is in the Critical Surgery Group.`, c, { tag: 'surg' }),
          fact(`${pName(b)} is in the Critical Surgery Group.`, b, { tag: 'surg' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Airway List', wingIndex: 0, label: 'Cleared Airway Group',
        shown: [
          fact(`${pName(a)} has a Cleared Airway.`, a, { tag: 'airway' }),
          fact(`${pName(c)} has a Cleared Airway.`, c, { tag: 'airway' }),
        ],
        alt: [
          fact(`${pName(b)} has a Cleared Airway.`, b, { tag: 'airway' }),
          fact(`${pName(c)} has a Cleared Airway.`, c, { tag: 'airway' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Surgery List', wingIndex: 1, label: 'More Airway Notes',
        shown: [
          fact(`${pName(d)} is in the Critical Surgery Group.`, d, { tag: 'surg' }),
          fact(`${pName(d)} has a Cleared Airway.`, d, { tag: 'airway' }),
        ],
        alt: [
          fact(`${pName(d)} is in the Minor Care Group (not surgery).`, d, { tag: 'other' }),
          fact(`${pName(d)} has a Cleared Airway.`, d, { tag: 'airway' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Airway List', wingIndex: 0, label: 'Not Cleared',
        shown: [
          fact(`${pName(b)}'s airway is still blocked (not cleared yet).`, b, { tag: 'other' }),
          fact(`${pName(e)} is waiting for stitches only.`, e, { tag: 'other' }),
        ],
        alt: [
          fact(`${pName(a)}'s airway is still blocked (not cleared yet).`, a, { tag: 'other' }),
          fact(`${pName(e)} is waiting for stitches only.`, e, { tag: 'other' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Surgery List', wingIndex: 1, label: 'Lobby Check',
        shown: [
          fact(`${pName(c)} only has a sprained knee (not in Surgery Group).`, c, { tag: 'other' }),
          fact(`${pName(f)} is cleared to go home.`, f, { tag: 'other' }),
        ],
        alt: [
          fact(`${pName(e)} only has a sprained knee (not in Surgery Group).`, e, { tag: 'other' }),
          fact(`${pName(f)} is cleared to go home.`, f, { tag: 'other' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Rescue Helicopter Boarding',
      dispatch: 'Only patients who fit both mandatory flight categories can board the helicopter.',
      order: 'Board every patient who belongs to BOTH the Critical Surgery Group AND the Cleared Airway Group.',
      hint: 'Find the overlap between Critical Surgery Group and Cleared Airway Group.',
      cards,
      evaluate(activeCards) {
        const s = new Set(collectByTag(activeCards, 'surg'));
        const w = new Set(collectByTag(activeCards, 'airway'));
        const targets = uniqueSortedIds([...s].filter((id) => w.has(id)));
        const rivals = [...s, ...w].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Combining both category rules proves only ${formatList(targets)} belong to both Critical Surgery and Cleared Airway.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} only belongs to one of the two required groups.`),
        };
      },
    };
  },

  // #14 Conditional reasoning (Inside · Atomic)
  'conditional-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const bloodLow = rng() < 0.5;
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Supply Desk', wingIndex: 0, label: 'Blood Bank Status',
        shown: [
          fact(bloodLow ? `STATUS: Blood bank is CRITICALLY LOW (only 2 bags left).` : `STATUS: Blood bank is FULL (plenty of blood).`, [], { tag: 'status', low: bloodLow }),
          fact(`Check this status before picking which patients to treat!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(!bloodLow ? `STATUS: Blood bank is CRITICALLY LOW (only 2 bags left).` : `STATUS: Blood bank is FULL (plenty of blood).`, [], { tag: 'status', low: !bloodLow }),
          fact(`Check this status before picking which patients to treat!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Trauma Bay A', wingIndex: 1, label: 'Active Bleeding List',
        shown: [
          fact(`${pName(a)} has severe active bleeding.`, a, { tag: 'bleed' }),
          fact(`${pName(b)} has severe active bleeding.`, b, { tag: 'bleed' }),
        ],
        alt: [
          fact(`${pName(a)} has severe active bleeding.`, a, { tag: 'bleed' }),
          fact(`${pName(e)} has severe active bleeding.`, e, { tag: 'bleed' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Trauma Bay B', wingIndex: 1, label: 'Breathing Trouble List',
        shown: [
          fact(`${pName(c)} has severe breathing trouble (no bleeding).`, c, { tag: 'breath' }),
          fact(`${pName(d)} has severe breathing trouble (no bleeding).`, d, { tag: 'breath' }),
        ],
        alt: [
          fact(`${pName(c)} has severe breathing trouble (no bleeding).`, c, { tag: 'breath' }),
          fact(`${pName(f)} has severe breathing trouble (no bleeding).`, f, { tag: 'breath' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Supply Desk', wingIndex: 0, label: 'Protocol Card',
        shown: [
          fact(`IF blood bank is LOW → treat Active Bleeding patients immediately.`, [], { tag: 'note' }),
          fact(`OTHERWISE (blood bank FULL) → treat Breathing Trouble patients first.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`IF blood bank is LOW → treat Active Bleeding patients immediately.`, [], { tag: 'note' }),
          fact(`OTHERWISE (blood bank FULL) → treat Breathing Trouble patients first.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Trauma Bay A', wingIndex: 1, label: 'Stable Bays',
        shown: [
          fact(`${pName(e)} is resting with normal breathing and no bleeding.`, e, { tag: 'safe' }),
          fact(`${pName(f)} is resting with normal breathing and no bleeding.`, f, { tag: 'safe' }),
        ],
        alt: [
          fact(`${pName(b)} is resting with normal breathing and no bleeding.`, b, { tag: 'safe' }),
          fact(`${pName(d)} is resting with normal breathing and no bleeding.`, d, { tag: 'safe' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Trauma Bay B', wingIndex: 1, label: 'Nurse Check',
        shown: [
          fact(`Oxygen tanks are fully stocked across both bays.`, [], { tag: 'note' }),
          fact(`Follow the exact IF–THEN branch triggered by Blood Bank Status.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Oxygen tanks are fully stocked across both bays.`, [], { tag: 'note' }),
          fact(`Follow the exact IF–THEN branch triggered by Blood Bank Status.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Emergency Branch Protocol',
      dispatch: 'Your action depends on one live hospital condition — check the Blood Bank Status card first.',
      order: 'IF the Blood Bank is LOW, treat the Active Bleeding patients; OTHERWISE treat the Breathing Trouble patients.',
      hint: 'Read Blood Bank Status first to see which branch applies.',
      cards,
      evaluate(activeCards) {
        const statusFact = collectFactsByTag(activeCards, 'status')[0];
        const isLow = !!statusFact?.low;
        const targets = collectByTag(activeCards, isLow ? 'bleed' : 'breath');
        const others = collectByTag(activeCards, isLow ? 'breath' : 'bleed');
        return {
          targets,
          proof: isLow
            ? `Because the blood bank is LOW, the IF-branch fires: treat Active Bleeding patients (${formatList(targets)}).`
            : `Because the blood bank is FULL, the OTHERWISE-branch fires: treat Breathing Trouble patients (${formatList(targets)}).`,
          rival: buildRivalInfo(targets, others, (id) => `${pName(id)} belongs to the opposite branch that did not trigger.`),
        };
      },
    };
  },

  // #15 Transitive reasoning (Before · Atomic)
  'transitive-reasoning': (rng) => {
    const [p1, p2, p3, p4, p5, p6] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Surgeon Notes', wingIndex: 0, label: 'Comparison #1',
        shown: [
          fact(`${pName(p2)} is in MORE immediate danger than ${pName(p3)}.`, [p2, p3], { tag: 'gt', hi: p2, lo: p3 }),
          fact(`Both need the single open operating room.`, [p2, p3], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(p3)} is in MORE immediate danger than ${pName(p2)}.`, [p3, p2], { tag: 'gt', hi: p3, lo: p2 }),
          fact(`Both need the single open operating room.`, [p2, p3], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Surgeon Notes', wingIndex: 0, label: 'Comparison #2',
        shown: [
          fact(`${pName(p1)} is in MORE immediate danger than ${pName(p2)}.`, [p1, p2], { tag: 'gt', hi: p1, lo: p2 }),
          fact(`Confirmed by senior trauma nurse.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(p2)} is in MORE immediate danger than ${pName(p1)}.`, [p2, p1], { tag: 'gt', hi: p2, lo: p1 }),
          fact(`Confirmed by senior trauma nurse.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Surgeon Notes', wingIndex: 0, label: 'Comparison #3',
        shown: [
          fact(`${pName(p3)} is in MORE immediate danger than ${pName(p4)}.`, [p3, p4], { tag: 'gt', hi: p3, lo: p4 }),
          fact(`${pName(p4)} can safely wait 20 minutes.`, p4, { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(p3)} is in MORE immediate danger than ${pName(p4)}.`, [p3, p4], { tag: 'gt', hi: p3, lo: p4 }),
          fact(`${pName(p4)} can safely wait 20 minutes.`, p4, { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'OR Desk', wingIndex: 1, label: 'Operating Room Note',
        shown: [
          fact(`Only ONE operating room is free right now.`, [], { tag: 'note' }),
          fact(`Chain the surgeon comparisons together to pick the #1 sickest patient.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Only ONE operating room is free right now.`, [], { tag: 'note' }),
          fact(`Chain the surgeon comparisons together to pick the #1 sickest patient.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'OR Desk', wingIndex: 1, label: 'Non-Surgical Bays',
        shown: [
          fact(`${pName(p5)} does not need surgery (minor arm cast).`, p5, { tag: 'safe' }),
          fact(`${pName(p6)} does not need surgery (stitches only).`, p6, { tag: 'safe' }),
        ],
        alt: [
          fact(`${pName(p5)} does not need surgery (minor arm cast).`, p5, { tag: 'safe' }),
          fact(`${pName(p6)} does not need surgery (stitches only).`, p6, { tag: 'safe' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'OR Desk', wingIndex: 1, label: 'Anesthesia Ready',
        shown: [
          fact(`OR Team 1 is scrubbed and waiting for your single top pick.`, [], { tag: 'note' }),
          fact(`All four surgical candidates are prepped.`, [p1, p2, p3, p4], { tag: 'note' }),
        ],
        alt: [
          fact(`OR Team 1 is scrubbed and waiting for your single top pick.`, [], { tag: 'note' }),
          fact(`All four surgical candidates are prepped.`, [p1, p2, p3, p4], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'One Open Operating Room',
      dispatch: 'Four patients need surgery, but only one operating room is free — link the comparisons to find the single sickest patient.',
      order: 'Follow the severity chain across all three Comparison cards and send the SINGLE sickest patient to the OR.',
      hint: 'Find the patient at the very top who is sicker than someone, while nobody is sicker than them.',
      cards,
      evaluate(activeCards) {
        const cmps = collectFactsByTag(activeCards, 'gt');
        const all = new Set();
        const beaten = new Set();
        for (const c of cmps) {
          all.add(c.hi);
          all.add(c.lo);
          beaten.add(c.lo);
        }
        const tops = uniqueSortedIds([...all].filter((id) => !beaten.has(id)));
        const targets = tops.length === 1 ? tops : [];
        return {
          targets,
          proof: `Linking the comparisons places ${formatList(targets)} strictly above everyone else in the chain.`,
          rival: buildRivalInfo(targets, [...beaten], (id) => `${pName(id)} is outranked by a sicker patient higher up the chain.`),
        };
      },
    };
  },

  // #16 Disjunctive reasoning (Inside · Atomic)
  'disjunctive-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Oxygen Desk', wingIndex: 0, label: 'Needs Oxygen',
        shown: [
          fact(`${pName(a)} needs emergency oxygen.`, a, { tag: 'o2' }),
          fact(`${pName(b)} needs emergency oxygen.`, b, { tag: 'o2' }),
        ],
        alt: [
          fact(`${pName(c)} needs emergency oxygen.`, c, { tag: 'o2' }),
          fact(`${pName(b)} needs emergency oxygen.`, b, { tag: 'o2' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Blood Desk', wingIndex: 1, label: 'Needs Blood Bag',
        shown: [
          fact(`${pName(b)} needs an emergency blood bag.`, b, { tag: 'blood' }),
          fact(`${pName(c)} needs an emergency blood bag.`, c, { tag: 'blood' }),
        ],
        alt: [
          fact(`${pName(a)} needs an emergency blood bag.`, a, { tag: 'blood' }),
          fact(`${pName(c)} needs an emergency blood bag.`, c, { tag: 'blood' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Oxygen Desk', wingIndex: 0, label: 'Bay Assignment Rule',
        shown: [
          fact(`Quick-Care Bay handles patients needing EITHER oxygen OR blood — but NOT BOTH.`, [], { tag: 'note' }),
          fact(`Anyone needing BOTH goes straight to the full surgical team instead.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Quick-Care Bay handles patients needing EITHER oxygen OR blood — but NOT BOTH.`, [], { tag: 'note' }),
          fact(`Anyone needing BOTH goes straight to the full surgical team instead.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Blood Desk', wingIndex: 1, label: 'Clear Patients',
        shown: [
          fact(`${pName(d)} needs neither oxygen nor blood.`, d, { tag: 'none' }),
          fact(`${pName(e)} needs neither oxygen nor blood.`, e, { tag: 'none' }),
        ],
        alt: [
          fact(`${pName(d)} needs neither oxygen nor blood.`, d, { tag: 'none' }),
          fact(`${pName(f)} needs neither oxygen nor blood.`, f, { tag: 'none' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Oxygen Desk', wingIndex: 0, label: 'Waiting Area',
        shown: [
          fact(`${pName(f)} only needs an ice pack for a swollen wrist.`, f, { tag: 'none' }),
          fact(`Quick-Care nurses are ready for single-need patients.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(e)} only needs an ice pack for a swollen wrist.`, e, { tag: 'none' }),
          fact(`Quick-Care nurses are ready for single-need patients.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Blood Desk', wingIndex: 1, label: 'OR Reserve',
        shown: [
          fact(`Full OR team is already taking the double-need (oxygen + blood) case.`, [], { tag: 'note' }),
          fact(`Send only single-need cases to Quick-Care Bay.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Full OR team is already taking the double-need (oxygen + blood) case.`, [], { tag: 'note' }),
          fact(`Send only single-need cases to Quick-Care Bay.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Quick-Care vs. Full Surgery Split',
      dispatch: 'Route single-need patients to Quick-Care Bay — anyone needing both oxygen and blood goes straight to the OR.',
      order: 'Send to Quick-Care everyone who needs EITHER oxygen OR blood — but NOT someone who needs both.',
      hint: 'Pick names appearing on only ONE of the two need cards (skip the overlap).',
      cards,
      evaluate(activeCards) {
        const o2 = new Set(collectByTag(activeCards, 'o2'));
        const bl = new Set(collectByTag(activeCards, 'blood'));
        const all = uniqueSortedIds([...o2, ...bl]);
        const targets = all.filter((id) => (o2.has(id) ? 1 : 0) + (bl.has(id) ? 1 : 0) === 1);
        const both = all.filter((id) => o2.has(id) && bl.has(id));
        return {
          targets,
          proof: `${formatList(targets)} each need exactly one treatment (oxygen or blood, not both).`,
          rival: buildRivalInfo(targets, both, (id) => `${pName(id)} needs BOTH oxygen and blood, so they belong in full surgery instead.`),
        };
      },
    };
  },

  // #17 Contradiction-based reasoning (After · Atomic)
  'contradiction-based': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Day Chart', wingIndex: 0, label: 'Allergy Wristband',
        shown: [
          fact(`${pName(a)} is SEVERELY ALLERGIC to Penicillin.`, a, { tag: 'allergic' }),
          fact(`${pName(b)} is SEVERELY ALLERGIC to Penicillin.`, b, { tag: 'allergic' }),
        ],
        alt: [
          fact(`${pName(c)} is SEVERELY ALLERGIC to Penicillin.`, c, { tag: 'allergic' }),
          fact(`${pName(b)} is SEVERELY ALLERGIC to Penicillin.`, b, { tag: 'allergic' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Night Chart', wingIndex: 1, label: 'Pharmacy Sign-Off',
        shown: [
          fact(`${pName(a)} is marked "SAFE for Penicillin — give full dose."`, a, { tag: 'safe_pen' }),
          fact(`${pName(c)} is marked "SAFE for Penicillin — give full dose."`, c, { tag: 'safe_pen' }),
        ],
        alt: [
          fact(`${pName(b)} is marked "SAFE for Penicillin — give full dose."`, b, { tag: 'safe_pen' }),
          fact(`${pName(c)} is marked "SAFE for Penicillin — give full dose."`, c, { tag: 'safe_pen' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Day Chart', wingIndex: 0, label: 'Consistent Charts 1',
        shown: [
          fact(`${pName(b)} is assigned an alternative non-penicillin drug (matches wristband).`, b, { tag: 'ok' }),
          fact(`${pName(d)} has no allergies and is marked safe (consistent).`, d, { tag: 'ok' }),
        ],
        alt: [
          fact(`${pName(a)} is assigned an alternative non-penicillin drug (matches wristband).`, a, { tag: 'ok' }),
          fact(`${pName(d)} has no allergies and is marked safe (consistent).`, d, { tag: 'ok' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Night Chart', wingIndex: 1, label: 'Consistent Charts 2',
        shown: [
          fact(`${pName(e)} has no drug allergies on either chart.`, e, { tag: 'ok' }),
          fact(`${pName(f)} has a confirmed latex allergy on both charts.`, f, { tag: 'ok' }),
        ],
        alt: [
          fact(`${pName(f)} has no drug allergies on either chart.`, f, { tag: 'ok' }),
          fact(`${pName(e)} has a confirmed latex allergy on both charts.`, e, { tag: 'ok' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Day Chart', wingIndex: 0, label: 'Audit Warning',
        shown: [
          fact(`A patient cannot be both "Severely Allergic" AND "Safe for Penicillin"!`, [], { tag: 'note' }),
          fact(`Stop the pharmacy before a fatal mistake happens.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`A patient cannot be both "Severely Allergic" AND "Safe for Penicillin"!`, [], { tag: 'note' }),
          fact(`Stop the pharmacy before a fatal mistake happens.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Night Chart', wingIndex: 1, label: 'Nurse Verification',
        shown: [
          fact(`${pName(c)} has zero allergy wristband on file.`, c, { tag: 'ok' }),
          fact(`${pName(d)} received routine pain medicine without issue.`, d, { tag: 'ok' }),
        ],
        alt: [
          fact(`${pName(e)} has zero allergy wristband on file.`, e, { tag: 'ok' }),
          fact(`${pName(d)} received routine pain medicine without issue.`, d, { tag: 'ok' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Pharmacy Allergy Clash Audit',
      dispatch: 'During shift handoff, a dangerous chart error slipped through — catch the impossible mismatch before meds are given.',
      order: 'Flag every patient whose charts directly clash (listed as BOTH "Severely Allergic" AND "Safe for Penicillin").',
      hint: 'Find who appears on both Allergy Wristband and Pharmacy Sign-Off.',
      cards,
      evaluate(activeCards) {
        const al = new Set(collectByTag(activeCards, 'allergic'));
        const ok = new Set(collectByTag(activeCards, 'safe_pen'));
        const targets = uniqueSortedIds([...al].filter((id) => ok.has(id)));
        const rivals = [...al, ...ok].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `${formatList(targets)}'s chart directly contradicts itself — flagged both severely allergic and safe for penicillin.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)}'s allergy status is consistent across both charts.`),
        };
      },
    };
  },

  // #18 Recursive reasoning (Inside · Composite)
  'recursive-reasoning': (rng) => {
    const [p0, p1, p2, o1, o2, o3] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Infection Desk', wingIndex: 0, label: 'Patient Zero',
        shown: [
          fact(`${pName(p0)} just tested POSITIVE for a fast-spreading hospital bug.`, p0, { tag: 'zero' }),
          fact(`Anyone who shared an unmasked room with an infected person catches it too!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(o1)} just tested POSITIVE for a fast-spreading hospital bug.`, o1, { tag: 'zero' }),
          fact(`Anyone who shared an unmasked room with an infected person catches it too!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Room Log', wingIndex: 1, label: 'Room Contact #1',
        shown: [
          fact(`${pName(p0)} shared an unmasked triage room with ${pName(p1)}.`, [p0, p1], { tag: 'contact', a: p0, b: p1 }),
          fact(`${pName(o2)} wore a sealed isolation mask all shift.`, o2, { tag: 'safe' }),
        ],
        alt: [
          fact(`${pName(o1)} shared an unmasked triage room with ${pName(p1)}.`, [o1, p1], { tag: 'contact', a: o1, b: p1 }),
          fact(`${pName(o2)} wore a sealed isolation mask all shift.`, o2, { tag: 'safe' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Room Log', wingIndex: 1, label: 'Room Contact #2',
        shown: [
          fact(`${pName(p1)} later shared an unmasked X-ray waiting room with ${pName(p2)}.`, [p1, p2], { tag: 'contact', a: p1, b: p2 }),
          fact(`${pName(o3)} stayed alone in a private room.`, o3, { tag: 'safe' }),
        ],
        alt: [
          fact(`${pName(p1)} later shared an unmasked X-ray waiting room with ${pName(o3)}.`, [p1, o3], { tag: 'contact', a: p1, b: o3 }),
          fact(`${pName(p2)} stayed alone in a private room.`, p2, { tag: 'safe' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Room Log', wingIndex: 1, label: 'Unrelated Roommates',
        shown: [
          fact(`${pName(o1)} shared a waiting room with ${pName(o2)} (neither had contact with ${pName(p0)}).`, [o1, o2], { tag: 'contact', a: o1, b: o2 }),
          fact(`Keep the isolation rooms strictly for the connected outbreak chain.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(p0)} shared a waiting room with ${pName(o2)}.`, [p0, o2], { tag: 'contact', a: p0, b: o2 }),
          fact(`Keep the isolation rooms strictly for the connected outbreak chain.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Infection Desk', wingIndex: 0, label: 'Spread Rule',
        shown: [
          fact(`Keep applying the same rule step-by-step: Patient Zero → their contact → that contact's contact.`, [], { tag: 'note' }),
          fact(`Quarantine everyone who caught it downstream (NOT Patient Zero, who is already isolated).`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Keep applying the same rule step-by-step: Patient Zero → their contact → that contact's contact.`, [], { tag: 'note' }),
          fact(`Quarantine everyone who caught it downstream (NOT Patient Zero, who is already isolated).`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Infection Desk', wingIndex: 0, label: 'Clean Wing',
        shown: [
          fact(`${pName(o3)} tested clean with zero room exposures.`, o3, { tag: 'safe' }),
          fact(`Quarantine team is standing by.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(p2)} tested clean with zero room exposures.`, p2, { tag: 'safe' }),
          fact(`Quarantine team is standing by.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Hospital Outbreak Tracing',
      dispatch: 'A fast-spreading bug just hit the ER — follow the unmasked room contacts step by step to quarantine everyone exposed.',
      order: 'Starting from Patient Zero, trace every step of unmasked room spread and quarantine everyone who caught it (besides Patient Zero).',
      hint: 'Find who Patient Zero met, then check who THAT person met next.',
      cards,
      evaluate(activeCards) {
        const zero = collectByTag(activeCards, 'zero')[0];
        const contacts = collectFactsByTag(activeCards, 'contact');
        const infected = new Set(zero ? [zero] : []);
        let changed = true;
        while (changed) {
          changed = false;
          for (const c of contacts) {
            if (infected.has(c.a) && !infected.has(c.b)) { infected.add(c.b); changed = true; }
            if (infected.has(c.b) && !infected.has(c.a)) { infected.add(c.a); changed = true; }
          }
        }
        const targets = uniqueSortedIds([...infected].filter((id) => id !== zero));
        const safe = collectByTag(activeCards, 'safe').filter((id) => !infected.has(id));
        return {
          targets,
          proof: `Tracing spread step-by-step from ${pName(zero)} reaches ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, [zero, ...safe], (id) =>
            id === zero
              ? `${pName(id)} is Patient Zero (already isolated).`
              : `${pName(id)} had no chain of contact back to ${pName(zero)}.`
          ),
        };
      },
    };
  },

  // #19 Combinatorial reasoning (Before · Composite)
  'combinatorial-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Blood Cooler', wingIndex: 0, label: 'Total Blood Available',
        shown: [
          fact(`COOLER LIMIT: You only have 10 units of O-Negative blood left.`, [], { tag: 'limit', value: 10 }),
          fact(`Pick the EXACT 2 patients whose combined blood need fits in 10 units and saves the HIGHEST total danger score.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`COOLER LIMIT: You only have 10 units of O-Negative blood left.`, [], { tag: 'limit', value: 10 }),
          fact(`Pick the EXACT 2 patients whose combined blood need fits in 10 units and saves the HIGHEST total danger score.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Trauma Bay', wingIndex: 1, label: 'Candidate Pair 1',
        shown: [
          fact(`${pName(a)} needs 4 units of blood (Danger score: 9).`, a, { tag: 'cand', units: 4, sev: 9 }),
          fact(`${pName(b)} needs 6 units of blood (Danger score: 8).`, b, { tag: 'cand', units: 6, sev: 8 }),
        ],
        alt: [
          fact(`${pName(a)} needs 7 units of blood (Danger score: 9).`, a, { tag: 'cand', units: 7, sev: 9 }),
          fact(`${pName(b)} needs 6 units of blood (Danger score: 8).`, b, { tag: 'cand', units: 6, sev: 8 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Trauma Bay', wingIndex: 1, label: 'Candidate Pair 2',
        shown: [
          fact(`${pName(c)} needs 7 units of blood (Danger score: 10).`, c, { tag: 'cand', units: 7, sev: 10 }),
          fact(`${pName(d)} needs 5 units of blood (Danger score: 6).`, d, { tag: 'cand', units: 5, sev: 6 }),
        ],
        alt: [
          fact(`${pName(c)} needs 4 units of blood (Danger score: 10).`, c, { tag: 'cand', units: 4, sev: 10 }),
          fact(`${pName(d)} needs 5 units of blood (Danger score: 7).`, d, { tag: 'cand', units: 5, sev: 7 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Trauma Bay', wingIndex: 1, label: 'Candidate 5',
        shown: [
          fact(`${pName(e)} needs 3 units of blood (Danger score: 4).`, e, { tag: 'cand', units: 3, sev: 4 }),
          fact(`${pName(f)} does not need blood (stable).`, f, { tag: 'safe' }),
        ],
        alt: [
          fact(`${pName(e)} needs 3 units of blood (Danger score: 4).`, e, { tag: 'cand', units: 3, sev: 4 }),
          fact(`${pName(f)} does not need blood (stable).`, f, { tag: 'safe' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Blood Cooler', wingIndex: 0, label: 'Pairing Tip',
        shown: [
          fact(`A patient needing 7 units can only pair with someone needing 3 or fewer.`, [], { tag: 'note' }),
          fact(`Compare every valid 2-patient pair that totals ≤ 10 units.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`A patient needing 7 units can only pair with someone needing 3 or fewer.`, [], { tag: 'note' }),
          fact(`Compare every valid 2-patient pair that totals ≤ 10 units.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Blood Cooler', wingIndex: 0, label: 'Cooler Lock',
        shown: [
          fact(`Next blood delivery arrives in 25 minutes.`, [], { tag: 'note' }),
          fact(`Make the best 2-patient blood combo right now.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Next blood delivery arrives in 25 minutes.`, [], { tag: 'note' }),
          fact(`Make the best 2-patient blood combo right now.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: '10-Unit Blood Cooler Pairing',
      dispatch: 'Only 10 units of O-Negative blood remain — choose the best 2-patient combination that fits the budget.',
      order: 'Pick the 2 patients whose combined blood need is ≤ 10 units and delivers the HIGHEST total danger score.',
      hint: 'Test pairs whose units add up to 10 or less, then pick the highest combined danger score.',
      cards,
      evaluate(activeCards) {
        const cands = collectFactsByTag(activeCards, 'cand');
        let bestPair = null;
        let bestScore = -1;
        let tie = false;
        for (let i = 0; i < cands.length; i++) {
          for (let j = i + 1; j < cands.length; j++) {
            const u = cands[i].units + cands[j].units;
            if (u <= 10) {
              const s = cands[i].sev + cands[j].sev;
              if (s > bestScore) {
                bestScore = s;
                bestPair = [cands[i], cands[j]];
                tie = false;
              } else if (s === bestScore) {
                tie = true;
              }
            }
          }
        }
        const targets = bestPair && !tie ? uniqueSortedIds([bestPair[0].patients[0], bestPair[1].patients[0]]) : [];
        const others = cands.map((x) => x.patients[0]).filter((id) => !targets.includes(id));
        return {
          targets,
          proof: bestPair
            ? `${pName(bestPair[0].patients[0])} (${bestPair[0].units}u, danger ${bestPair[0].sev}) + ${pName(bestPair[1].patients[0])} (${bestPair[1].units}u, danger ${bestPair[1].sev}) = ${bestPair[0].units + bestPair[1].units} units and top score ${bestScore}.`
            : 'No unique pair fits.',
          rival: buildRivalInfo(targets, others, (id) => `${pName(id)} cannot form a higher-scoring valid pair within the 10-unit blood limit.`),
        };
      },
    };
  },

  // #20 Constraint-based reasoning (Before · Composite)
  'constraint-based': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Flight Safety', wingIndex: 0, label: 'Rule 1: Breathing Tube',
        shown: [
          fact(`${pName(a)} has breathing tube secured.`, a, { tag: 'r1' }),
          fact(`${pName(b)} has breathing tube secured.`, b, { tag: 'r1' }),
        ],
        alt: [
          fact(`${pName(c)} has breathing tube secured.`, c, { tag: 'r1' }),
          fact(`${pName(b)} has breathing tube secured.`, b, { tag: 'r1' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Flight Safety', wingIndex: 0, label: 'Rule 2: Bleeding Stopped',
        shown: [
          fact(`${pName(a)}'s bleeding is controlled.`, a, { tag: 'r2' }),
          fact(`${pName(c)}'s bleeding is controlled.`, c, { tag: 'r2' }),
        ],
        alt: [
          fact(`${pName(b)}'s bleeding is controlled.`, b, { tag: 'r2' }),
          fact(`${pName(c)}'s bleeding is controlled.`, c, { tag: 'r2' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Flight Safety', wingIndex: 0, label: 'Rule 3: Under 200 lbs',
        shown: [
          fact(`${pName(a)} weighs 155 lbs (clears chopper limit).`, a, { tag: 'r3' }),
          fact(`${pName(b)} weighs 170 lbs (clears chopper limit).`, b, { tag: 'r3' }),
        ],
        alt: [
          fact(`${pName(c)} weighs 155 lbs (clears chopper limit).`, c, { tag: 'r3' }),
          fact(`${pName(b)} weighs 170 lbs (clears chopper limit).`, b, { tag: 'r3' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Flight Desk', wingIndex: 1, label: 'More Rule Checks',
        shown: [
          fact(`${pName(d)} has breathing tube secured & bleeding controlled, but weighs 240 lbs.`, d, { tag: 'r1' }),
          fact(`${pName(c)} still needs a breathing tube before takeoff.`, c, { tag: 'other' }),
        ],
        alt: [
          fact(`${pName(d)} has breathing tube secured & bleeding controlled, but weighs 240 lbs.`, d, { tag: 'r1' }),
          fact(`${pName(a)} still needs a breathing tube before takeoff.`, a, { tag: 'other' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Flight Desk', wingIndex: 1, label: 'Disqualified Notes',
        shown: [
          fact(`${pName(b)}'s bleeding is NOT controlled yet.`, b, { tag: 'other' }),
          fact(`${pName(e)} is safe to ride by ground ambulance.`, e, { tag: 'other' }),
        ],
        alt: [
          fact(`${pName(a)}'s bleeding is NOT controlled yet.`, a, { tag: 'other' }),
          fact(`${pName(e)} is safe to ride by ground ambulance.`, e, { tag: 'other' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Flight Desk', wingIndex: 1, label: 'Pilot Clearance',
        shown: [
          fact(`ALL 3 flight rules are mandatory: Tube Secured + Bleeding Controlled + Under 200 lbs.`, [], { tag: 'note' }),
          fact(`${pName(f)} is waiting for family pickup.`, f, { tag: 'other' }),
        ],
        alt: [
          fact(`ALL 3 flight rules are mandatory: Tube Secured + Bleeding Controlled + Under 200 lbs.`, [], { tag: 'note' }),
          fact(`${pName(f)} is waiting for family pickup.`, f, { tag: 'other' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Medevac Helicopter Clearance',
      dispatch: 'Storm winds are rising — the rescue pilot can only lift patients who pass every safety rule.',
      order: 'Clear for helicopter takeoff ONLY the patient(s) passing ALL 3 rules: Breathing Tube + Bleeding Controlled + Under 200 lbs.',
      hint: 'Check which name appears on Rule 1, Rule 2, AND Rule 3.',
      cards,
      evaluate(activeCards) {
        const r1 = new Set(collectByTag(activeCards, 'r1'));
        const r2 = new Set(collectByTag(activeCards, 'r2'));
        const r3 = new Set(collectByTag(activeCards, 'r3'));
        const targets = uniqueSortedIds([...r1].filter((id) => r2.has(id) && r3.has(id)));
        const rivals = [...r1, ...r2, ...r3].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Only ${formatList(targets)} satisfy all three flight safety rules simultaneously.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} breaks at least one mandatory flight safety rule.`),
        };
      },
    };
  },

  // =========================================================================
  // FAMILY 3: RELATIONAL & ABSTRACT REASONING (#21–#32)
  // =========================================================================

  // #21 Analogical reasoning (Inside · Atomic)
  'analogical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Teaching Case', wingIndex: 0, label: 'Last Shift’s Save',
        shown: [
          fact(`Example: "Swollen Throat blocking air → Insert Breathing Tube to physically open the blocked pipe."`, [], { tag: 'note' }),
          fact(`Spot today's patient(s) who have the SAME "Blocked Pipe → Open It" emergency.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Example: "Swollen Throat blocking air → Insert Breathing Tube to physically open the blocked pipe."`, [], { tag: 'note' }),
          fact(`Spot today's patient(s) who have the SAME "Blocked Pipe → Open It" emergency.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'ER Bay A', wingIndex: 1, label: 'Bay Check 1',
        shown: [
          fact(`${pName(a)} has a clot blocking a heart artery → needs a wire stent to open the artery.`, a, { tag: 'match' }),
          fact(`${pName(b)} has low blood sugar → needs sugar water in an IV.`, b, { tag: 'diff' }),
        ],
        alt: [
          fact(`${pName(b)} has a clot blocking a heart artery → needs a wire stent to open the artery.`, b, { tag: 'match' }),
          fact(`${pName(a)} has low blood sugar → needs sugar water in an IV.`, a, { tag: 'diff' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'ER Bay B', wingIndex: 1, label: 'Bay Check 2',
        shown: [
          fact(`${pName(c)} has a kidney stone blocking urine flow → needs a tube to open the channel.`, c, { tag: 'match' }),
          fact(`${pName(d)} has a bacterial fever → needs antibiotic pills.`, d, { tag: 'diff' }),
        ],
        alt: [
          fact(`${pName(d)} has a kidney stone blocking urine flow → needs a tube to open the channel.`, d, { tag: 'match' }),
          fact(`${pName(c)} has a bacterial fever → needs antibiotic pills.`, c, { tag: 'diff' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'ER Bay A', wingIndex: 1, label: 'Bay Check 3',
        shown: [
          fact(`${pName(e)} has a broken forearm → needs a plaster cast.`, e, { tag: 'diff' }),
          fact(`${pName(f)} has dehydration → needs drinking fluids.`, f, { tag: 'diff' }),
        ],
        alt: [
          fact(`${pName(f)} has a broken forearm → needs a plaster cast.`, f, { tag: 'diff' }),
          fact(`${pName(e)} has dehydration → needs drinking fluids.`, e, { tag: 'diff' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Teaching Case', wingIndex: 0, label: 'Pattern Clue',
        shown: [
          fact(`Look for physical blockage cleared by opening the tube/pipe — NOT pills, casts, or fluids.`, [], { tag: 'note' }),
          fact(`Different organs, exact same physical fix.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Look for physical blockage cleared by opening the tube/pipe — NOT pills, casts, or fluids.`, [], { tag: 'note' }),
          fact(`Different organs, exact same physical fix.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'ER Bay B', wingIndex: 1, label: 'Procedure Team',
        shown: [
          fact(`The pipe-unblocking procedure team is ready for your selected patient(s).`, [], { tag: 'note' }),
          fact(`Skip chemical refills and bone casts.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`The pipe-unblocking procedure team is ready for your selected patient(s).`, [], { tag: 'note' }),
          fact(`Skip chemical refills and bone casts.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Same Fix, Different Organ',
      dispatch: 'Great doctors transfer a proven mechanical solution from one organ system to another.',
      order: 'Just like "Swollen Throat → Open the Pipe," pick today’s patient(s) who need a physical blockage opened right now.',
      hint: 'Ignore sugar IVs, antibiotics, casts, and water — find the physically blocked tubes/arteries.',
      cards,
      evaluate(activeCards) {
        const targets = collectByTag(activeCards, 'match');
        const diffs = collectByTag(activeCards, 'diff');
        return {
          targets,
          proof: `${formatList(targets)} mirror the exact "blocked pipe → physically reopen it" rescue pattern.`,
          rival: buildRivalInfo(targets, diffs, (id) => `${pName(id)} needs medicine, fluids, or a cast — not unblocking a clogged pipe.`),
        };
      },
    };
  },

  // #22 Anomalous reasoning (Inside · Atomic)
  'anomalous-reasoning': (rng) => {
    const [odd, n1, n2, n3, n4, n5] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Monitor Wall', wingIndex: 0, label: 'Vitals Check 1',
        shown: [
          fact(`${pName(n1)}: High fever (102°F) + Fast pulse (118 BPM).`, n1, { tag: 'norm' }),
          fact(`${pName(n2)}: High fever (103°F) + Fast pulse (122 BPM).`, n2, { tag: 'norm' }),
        ],
        alt: [
          fact(`${pName(n1)}: High fever (102°F) + Dangerously SLOW pulse (46 BPM)!`, n1, { tag: 'odd' }),
          fact(`${pName(n2)}: High fever (103°F) + Fast pulse (122 BPM).`, n2, { tag: 'norm' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Monitor Wall', wingIndex: 0, label: 'Vitals Check 2',
        shown: [
          fact(`${pName(odd)}: High fever (103°F) + Dangerously SLOW pulse (44 BPM)!`, odd, { tag: 'odd' }),
          fact(`${pName(n3)}: High fever (101°F) + Fast pulse (112 BPM).`, n3, { tag: 'norm' }),
        ],
        alt: [
          fact(`${pName(odd)}: High fever (103°F) + Fast pulse (120 BPM).`, odd, { tag: 'norm' }),
          fact(`${pName(n3)}: High fever (101°F) + Fast pulse (112 BPM).`, n3, { tag: 'norm' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Monitor Wall', wingIndex: 0, label: 'Vitals Check 3',
        shown: [
          fact(`${pName(n4)}: High fever (102°F) + Fast pulse (116 BPM).`, n4, { tag: 'norm' }),
          fact(`${pName(n5)}: High fever (101°F) + Fast pulse (110 BPM).`, n5, { tag: 'norm' }),
        ],
        alt: [
          fact(`${pName(n4)}: High fever (102°F) + Fast pulse (116 BPM).`, n4, { tag: 'norm' }),
          fact(`${pName(n5)}: High fever (101°F) + Fast pulse (110 BPM).`, n5, { tag: 'norm' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Doctor Note', wingIndex: 1, label: 'Normal Fever Pattern',
        shown: [
          fact(`Normally, a high fever makes your heart beat FAST (110+ BPM).`, [], { tag: 'note' }),
          fact(`A high fever with a bizarrely SLOW pulse is a red-flag brain pressure warning!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Normally, a high fever makes your heart beat FAST (110+ BPM).`, [], { tag: 'note' }),
          fact(`A high fever with a bizarrely SLOW pulse is a red-flag brain pressure warning!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Doctor Note', wingIndex: 1, label: 'Brain Scanner',
        shown: [
          fact(`Rush the single pattern-breaking patient straight to the head CT scanner.`, [], { tag: 'note' }),
          fact(`Standard fast-pulse fever patients just need cool fluids.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Rush the single pattern-breaking patient straight to the head CT scanner.`, [], { tag: 'note' }),
          fact(`Standard fast-pulse fever patients just need cool fluids.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Doctor Note', wingIndex: 1, label: 'Nurse Check',
        shown: [
          fact(`All pulse monitors were double-checked by hand — readings are real.`, [], { tag: 'note' }),
          fact(`Spot the odd-one-out vital sign!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`All pulse monitors were double-checked by hand — readings are real.`, [], { tag: 'note' }),
          fact(`Spot the odd-one-out vital sign!`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Spot the Odd-One-Out Vital Sign',
      dispatch: 'Six fever patients came in — five look normal for fever, but ONE breaks the rule in a deadly way.',
      order: 'Click the pattern-breaking patient whose high fever is paired with a bizarrely SLOW pulse.',
      hint: 'Everyone else has a fast pulse (110+ BPM) — find the one patient below 50 BPM.',
      cards,
      evaluate(activeCards) {
        const targets = collectByTag(activeCards, 'odd');
        const norms = collectByTag(activeCards, 'norm');
        return {
          targets,
          proof: `${formatList(targets)} broke the normal fever-and-fast-pulse pattern with a dangerously slow pulse — a classic brain-pressure alarm.`,
          rival: buildRivalInfo(targets, norms, (id) => `${pName(id)} follows the normal fever pattern (high fever + fast heart rate).`),
        };
      },
    };
  },

  // #23 Antinomic reasoning (After · Atomic)
  'antinomic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Front Desk', wingIndex: 0, label: 'Discharge Papers',
        shown: [
          fact(`${pName(a)} is tagged "CLEARED TO GO HOME."`, a, { tag: 'home' }),
          fact(`${pName(b)} is tagged "CLEARED TO GO HOME."`, b, { tag: 'home' }),
        ],
        alt: [
          fact(`${pName(c)} is tagged "CLEARED TO GO HOME."`, c, { tag: 'home' }),
          fact(`${pName(b)} is tagged "CLEARED TO GO HOME."`, b, { tag: 'home' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Surgery Board', wingIndex: 1, label: 'Emergency Surgery List',
        shown: [
          fact(`${pName(a)} is tagged "NEEDS IMMEDIATE LIFE-SAVING SURGERY."`, a, { tag: 'or' }),
          fact(`${pName(c)} is tagged "NEEDS IMMEDIATE LIFE-SAVING SURGERY."`, c, { tag: 'or' }),
        ],
        alt: [
          fact(`${pName(b)} is tagged "NEEDS IMMEDIATE LIFE-SAVING SURGERY."`, b, { tag: 'or' }),
          fact(`${pName(c)} is tagged "NEEDS IMMEDIATE LIFE-SAVING SURGERY."`, c, { tag: 'or' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Front Desk', wingIndex: 0, label: 'Normal Discharges',
        shown: [
          fact(`${pName(d)} is tagged "CLEARED TO GO HOME" (sprained toe).`, d, { tag: 'home' }),
          fact(`${pName(e)} is resting overnight for observation.`, e, { tag: 'other' }),
        ],
        alt: [
          fact(`${pName(d)} is tagged "CLEARED TO GO HOME" (sprained toe).`, d, { tag: 'home' }),
          fact(`${pName(e)} is tagged "NEEDS IMMEDIATE LIFE-SAVING SURGERY."`, e, { tag: 'or' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Surgery Board', wingIndex: 1, label: 'OR Prep',
        shown: [
          fact(`${pName(f)} is tagged "NEEDS IMMEDIATE LIFE-SAVING SURGERY."`, f, { tag: 'or' }),
          fact(`${pName(f)} is NOT on the discharge list.`, f, { tag: 'other' }),
        ],
        alt: [
          fact(`${pName(f)} is tagged "NEEDS IMMEDIATE LIFE-SAVING SURGERY."`, f, { tag: 'or' }),
          fact(`${pName(d)} is NOT on the surgery list.`, d, { tag: 'other' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Front Desk', wingIndex: 0, label: 'Paperwork Alert',
        shown: [
          fact(`Nobody can be both "Cleared to Go Home" AND "Needs Immediate Surgery" at once!`, [], { tag: 'note' }),
          fact(`Catch the impossible paperwork mix-up before the patient walks out.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Nobody can be both "Cleared to Go Home" AND "Needs Immediate Surgery" at once!`, [], { tag: 'note' }),
          fact(`Catch the impossible paperwork mix-up before the patient walks out.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Surgery Board', wingIndex: 1, label: 'Security Gate',
        shown: [
          fact(`${pName(b)} has a valid home release and no surgery scheduled.`, b, { tag: 'other' }),
          fact(`${pName(c)} is prepped cleanly in the surgical holding bay.`, c, { tag: 'other' }),
        ],
        alt: [
          fact(`${pName(a)} has a valid home release and no surgery scheduled.`, a, { tag: 'other' }),
          fact(`${pName(e)} is prepped cleanly in the surgical holding bay.`, e, { tag: 'other' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Impossible Discharge Mix-Up',
      dispatch: 'Someone is about to walk out the front door by mistake even though they are booked for emergency surgery!',
      order: 'Stop the impossible mix-up: flag anyone tagged BOTH "Cleared to Go Home" AND "Needs Immediate Surgery."',
      hint: 'Find the patient who appears on both Discharge Papers and Emergency Surgery List.',
      cards,
      evaluate(activeCards) {
        const home = new Set(collectByTag(activeCards, 'home'));
        const or = new Set(collectByTag(activeCards, 'or'));
        const targets = uniqueSortedIds([...home].filter((id) => or.has(id)));
        const rivals = [...home, ...or].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `${formatList(targets)} carry two mutually impossible tags at once (Cleared Home + Emergency Surgery).`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} only holds one consistent status tag.`),
        };
      },
    };
  },

  // #24 Antithetical reasoning (Before · Atomic)
  'antithetical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Red Zone', wingIndex: 0, label: 'Immediate Danger List',
        shown: [
          fact(`${pName(a)} is in the Red Zone (Life-Threatening).`, a, { tag: 'red' }),
          fact(`${pName(b)} is in the Red Zone (Life-Threatening).`, b, { tag: 'red' }),
        ],
        alt: [
          fact(`${pName(c)} is in the Red Zone (Life-Threatening).`, c, { tag: 'red' }),
          fact(`${pName(b)} is in the Red Zone (Life-Threatening).`, b, { tag: 'red' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Green Zone', wingIndex: 1, label: 'Walking-Safe List',
        shown: [
          fact(`${pName(b)} was re-checked and moved to Green Zone (Walking Safe).`, b, { tag: 'green' }),
          fact(`${pName(d)} is in the Green Zone (Walking Safe).`, d, { tag: 'green' }),
        ],
        alt: [
          fact(`${pName(c)} was re-checked and moved to Green Zone (Walking Safe).`, c, { tag: 'green' }),
          fact(`${pName(d)} is in the Green Zone (Walking Safe).`, d, { tag: 'green' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Red Zone', wingIndex: 0, label: 'Red Zone Add-On',
        shown: [
          fact(`${pName(c)} is in the Red Zone (Life-Threatening).`, c, { tag: 'red' }),
          fact(`${pName(e)} is in the Green Zone (Walking Safe).`, e, { tag: 'green' }),
        ],
        alt: [
          fact(`${pName(a)} is in the Red Zone (Life-Threatening).`, a, { tag: 'red' }),
          fact(`${pName(e)} is in the Green Zone (Walking Safe).`, e, { tag: 'green' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Green Zone', wingIndex: 1, label: 'More Safe Notes',
        shown: [
          fact(`${pName(f)} is in the Green Zone (Walking Safe).`, f, { tag: 'green' }),
          fact(`Green Zone patients are the direct opposite of true Red Zone emergencies.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(f)} is in the Green Zone (Walking Safe).`, f, { tag: 'green' }),
          fact(`Green Zone patients are the direct opposite of true Red Zone emergencies.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Red Zone', wingIndex: 0, label: 'Ambulance Transfer',
        shown: [
          fact(`Send the ICU ambulance strictly for pure Red Zone patients (never Green Zone).`, [], { tag: 'note' }),
          fact(`Double-check if anyone was downgraded to Green Zone.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Send the ICU ambulance strictly for pure Red Zone patients (never Green Zone).`, [], { tag: 'note' }),
          fact(`Double-check if anyone was downgraded to Green Zone.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Green Zone', wingIndex: 1, label: 'Waiting Bus',
        shown: [
          fact(`${pName(d)} and ${pName(e)} are already seated on the safe shuttle.`, [d, e], { tag: 'note' }),
          fact(`Focus strictly on the pure Red extreme.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(d)} and ${pName(e)} are already seated on the safe shuttle.`, [d, e], { tag: 'note' }),
          fact(`Focus strictly on the pure Red extreme.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Red Zone vs. Green Zone Split',
      dispatch: 'Separate the two opposite extremes of triage — pure life-threatening emergencies vs. walking-safe patients.',
      order: 'Treat ONLY patients in the Red Zone who do NOT appear anywhere on the opposite Green Zone (Walking-Safe) list.',
      hint: 'Take everyone in Red Zone and remove anyone downgraded to Green Zone.',
      cards,
      evaluate(activeCards) {
        const red = collectByTag(activeCards, 'red');
        const green = new Set(collectByTag(activeCards, 'green'));
        const targets = uniqueSortedIds(red.filter((id) => !green.has(id)));
        const downgraded = red.filter((id) => green.has(id));
        return {
          targets,
          proof: `Separating the two opposite poles leaves pure Red Zone emergencies: ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, downgraded, (id) => `${pName(id)} was moved to the opposite Green Zone (walking safe).`),
        };
      },
    };
  },

  // #25 Higher-order relational reasoning (Inside · Composite)
  'higher-order-relational': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Day Nurse', wingIndex: 0, label: 'Day Nurse Pair 1',
        shown: [
          fact(`Day Nurse: "${pName(a)} is doing WORSE than roommate ${pName(b)}."`, [a, b], { tag: 'day', worse: a, better: b }),
          fact(`Room 101 morning check.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Day Nurse: "${pName(b)} is doing WORSE than roommate ${pName(a)}."`, [b, a], { tag: 'day', worse: b, better: a }),
          fact(`Room 101 morning check.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Night Nurse', wingIndex: 1, label: 'Night Nurse Pair 1',
        shown: [
          fact(`Night Nurse: "${pName(a)} is doing WORSE than roommate ${pName(b)}."`, [a, b], { tag: 'night', worse: a, better: b }),
          fact(`Room 101 evening check.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Night Nurse: "${pName(b)} is doing WORSE than roommate ${pName(a)}."`, [b, a], { tag: 'night', worse: b, better: a }),
          fact(`Room 101 evening check.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Day Nurse', wingIndex: 0, label: 'Day Nurse Pair 2',
        shown: [
          fact(`Day Nurse: "${pName(c)} is doing WORSE than roommate ${pName(d)}."`, [c, d], { tag: 'day', worse: c, better: d }),
          fact(`Room 102 morning check.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Day Nurse: "${pName(d)} is doing WORSE than roommate ${pName(c)}."`, [d, c], { tag: 'day', worse: d, better: c }),
          fact(`Room 102 morning check.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Night Nurse', wingIndex: 1, label: 'Night Nurse Pair 2',
        shown: [
          fact(`Night Nurse: "${pName(d)} is doing WORSE than roommate ${pName(c)}." (Nurses disagree!)`, [d, c], { tag: 'night', worse: d, better: c }),
          fact(`Room 102 evening check.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Night Nurse: "${pName(c)} is doing WORSE than roommate ${pName(d)}."`, [c, d], { tag: 'night', worse: c, better: d }),
          fact(`Room 102 evening check.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Day Nurse', wingIndex: 0, label: 'Day Nurse Pair 3',
        shown: [
          fact(`Day Nurse: "${pName(e)} is doing WORSE than roommate ${pName(f)}."`, [e, f], { tag: 'day', worse: e, better: f }),
          fact(`Room 103 morning check.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Day Nurse: "${pName(f)} is doing WORSE than roommate ${pName(e)}."`, [f, e], { tag: 'day', worse: f, better: e }),
          fact(`Room 103 morning check.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Night Nurse', wingIndex: 1, label: 'Night Nurse Pair 3',
        shown: [
          fact(`Night Nurse: "${pName(f)} is doing WORSE than roommate ${pName(e)}." (Nurses disagree!)`, [f, e], { tag: 'night', worse: f, better: e }),
          fact(`Room 103 evening check.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Night Nurse: "${pName(e)} is doing WORSE than roommate ${pName(f)}."`, [e, f], { tag: 'night', worse: e, better: f }),
          fact(`Room 103 evening check.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Comparing Day vs. Night Nurse Rankings',
      dispatch: 'Compare how two nurses ranked each pair of roommates — act only where both shifts agree on who is worse.',
      order: 'Treat the patient(s) whom BOTH the Day Nurse AND the Night Nurse ranked as worse than their roommate.',
      hint: 'Check each roommate pair across Day Nurse and Night Nurse — skip pairs where the two nurses flipped order.',
      cards,
      evaluate(activeCards) {
        const days = collectFactsByTag(activeCards, 'day');
        const nights = collectFactsByTag(activeCards, 'night');
        const nightSet = new Set(nights.map((n) => `${n.worse}>${n.better}`));
        const agreed = days.filter((d) => nightSet.has(`${d.worse}>${d.better}`)).map((d) => d.worse);
        const targets = uniqueSortedIds(agreed);
        const disagreed = days.filter((d) => !nightSet.has(`${d.worse}>${d.better}`)).map((d) => d.worse);
        return {
          targets,
          proof: `Both Day and Night nurses agreed on the exact same worsening ranking for ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, disagreed, (id) => `Day and Night nurses reversed their comparison involving ${pName(id)}.`),
        };
      },
    };
  },

  // #26 Cross-domain reasoning (After · Composite)
  'cross-domain-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Aviation Rule', wingIndex: 0, label: 'Airline Takeoff Principle',
        shown: [
          fact(`Aviation Rule: "Cancel takeoff whenever BOTH the main gauge AND backup sensor fail."`, [], { tag: 'note' }),
          fact(`Apply that exact two-failure safety rule to our Surgery Prep checklist today.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Aviation Rule: "Cancel takeoff whenever BOTH the main gauge AND backup sensor fail."`, [], { tag: 'note' }),
          fact(`Apply that exact two-failure safety rule to our Surgery Prep checklist today.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Surgery Prep', wingIndex: 1, label: 'Main Check: Blood Type',
        shown: [
          fact(`${pName(a)} FAILED main blood-type verification.`, a, { tag: 'f1' }),
          fact(`${pName(b)} FAILED main blood-type verification.`, b, { tag: 'f1' }),
        ],
        alt: [
          fact(`${pName(c)} FAILED main blood-type verification.`, c, { tag: 'f1' }),
          fact(`${pName(b)} FAILED main blood-type verification.`, b, { tag: 'f1' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Surgery Prep', wingIndex: 1, label: 'Backup Check: Site Mark',
        shown: [
          fact(`${pName(a)} FAILED backup surgical-site ink mark.`, a, { tag: 'f2' }),
          fact(`${pName(c)} FAILED backup surgical-site ink mark.`, c, { tag: 'f2' }),
        ],
        alt: [
          fact(`${pName(b)} FAILED backup surgical-site ink mark.`, b, { tag: 'f2' }),
          fact(`${pName(c)} FAILED backup surgical-site ink mark.`, c, { tag: 'f2' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Surgery Prep', wingIndex: 1, label: 'Single-Check Passes',
        shown: [
          fact(`${pName(b)} PASSED backup surgical-site mark (only 1 fail).`, b, { tag: 'ok' }),
          fact(`${pName(c)} PASSED main blood-type verification (only 1 fail).`, c, { tag: 'ok' }),
        ],
        alt: [
          fact(`${pName(a)} PASSED backup surgical-site mark (only 1 fail).`, a, { tag: 'ok' }),
          fact(`${pName(d)} PASSED main blood-type verification.`, d, { tag: 'ok' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Surgery Prep', wingIndex: 1, label: 'Clean Surgeries',
        shown: [
          fact(`${pName(d)} passed BOTH blood type and site mark.`, d, { tag: 'ok' }),
          fact(`${pName(e)} passed BOTH blood type and site mark.`, e, { tag: 'ok' }),
        ],
        alt: [
          fact(`${pName(d)} passed BOTH blood type and site mark.`, d, { tag: 'ok' }),
          fact(`${pName(f)} passed BOTH blood type and site mark.`, f, { tag: 'ok' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Aviation Rule', wingIndex: 0, label: 'Halt Surgery Call',
        shown: [
          fact(`${pName(f)} passed BOTH safety checks.`, f, { tag: 'ok' }),
          fact(`Halt surgery immediately for any double-failure case.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(e)} passed BOTH safety checks.`, e, { tag: 'ok' }),
          fact(`Halt surgery immediately for any double-failure case.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Airline Safety Check in the OR',
      dispatch: 'Hospitals borrowed pre-flight safety rules from airline pilots — apply the two-failure rule before incision.',
      order: 'Halt surgery for any patient who FAILED BOTH the Main Blood Check AND the Backup Site Mark.',
      hint: 'Find who failed both checks, just like an airplane grounded by two failed gauges.',
      cards,
      evaluate(activeCards) {
        const f1 = new Set(collectByTag(activeCards, 'f1'));
        const f2 = new Set(collectByTag(activeCards, 'f2'));
        const targets = uniqueSortedIds([...f1].filter((id) => f2.has(id)));
        const rivals = [...f1, ...f2].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Transferring the airline dual-failure rule halts surgery for ${formatList(targets)}, who failed both checks.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} only failed one check, not both.`),
        };
      },
    };
  },

  // #27 Abstract reasoning (Inside · Composite)
  'abstract-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Fluid Monitor', wingIndex: 0, label: 'Water & IV Fluids',
        shown: [
          fact(`${pName(a)}: 3 Liters IV IN · 3 Liters Urine OUT (Exact Balance).`, a, { tag: 'bal', ok: true }),
          fact(`${pName(b)}: 4 Liters IV IN · 1 Liter Urine OUT (Imbalanced).`, b, { tag: 'bal', ok: false }),
        ],
        alt: [
          fact(`${pName(a)}: 4 Liters IV IN · 1 Liter Urine OUT (Imbalanced).`, a, { tag: 'bal', ok: false }),
          fact(`${pName(b)}: 3 Liters IV IN · 3 Liters Urine OUT (Exact Balance).`, b, { tag: 'bal', ok: true }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Blood Monitor', wingIndex: 1, label: 'Blood Transfusion',
        shown: [
          fact(`${pName(c)}: 2 Units Blood IN · 2 Units Blood LOST (Exact Balance).`, c, { tag: 'bal', ok: true }),
          fact(`${pName(d)}: 1 Unit Blood IN · 4 Units Blood LOST (Imbalanced).`, d, { tag: 'bal', ok: false }),
        ],
        alt: [
          fact(`${pName(c)}: 1 Unit Blood IN · 4 Units Blood LOST (Imbalanced).`, c, { tag: 'bal', ok: false }),
          fact(`${pName(d)}: 2 Units Blood IN · 2 Units Blood LOST (Exact Balance).`, d, { tag: 'bal', ok: true }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Air Monitor', wingIndex: 0, label: 'Air & Oxygen Flow',
        shown: [
          fact(`${pName(e)}: 6 Breaths Air IN · 2 Breaths Air OUT (Trapped air!).`, e, { tag: 'bal', ok: false }),
          fact(`${pName(f)}: 5 Liters Air IN · 5 Liters Air OUT (Exact Balance).`, f, { tag: 'bal', ok: true }),
        ],
        alt: [
          fact(`${pName(e)}: 5 Liters Air IN · 5 Liters Air OUT (Exact Balance).`, e, { tag: 'bal', ok: true }),
          fact(`${pName(f)}: 6 Breaths Air IN · 2 Breaths Air OUT (Trapped air!).`, f, { tag: 'bal', ok: false }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Ward Guide', wingIndex: 1, label: 'What Matters Here',
        shown: [
          fact(`Ignore whether the substance is water, blood, or air!`, [], { tag: 'note' }),
          fact(`Focus purely on the underlying rule: Amount IN equals Amount OUT.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Ignore whether the substance is water, blood, or air!`, [], { tag: 'note' }),
          fact(`Focus purely on the underlying rule: Amount IN equals Amount OUT.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Ward Guide', wingIndex: 1, label: 'Transfer Readiness',
        shown: [
          fact(`Only patients in exact IN = OUT equilibrium are safe to move to recovery.`, [], { tag: 'note' }),
          fact(`Imbalanced patients stay in the trauma bay.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Only patients in exact IN = OUT equilibrium are safe to move to recovery.`, [], { tag: 'note' }),
          fact(`Imbalanced patients stay in the trauma bay.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Fluid Monitor', wingIndex: 0, label: 'Recovery Bed Desk',
        shown: [
          fact(`Three recovery beds are open for the balanced patients.`, [], { tag: 'note' }),
          fact(`Check the numbers on each monitor card.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Three recovery beds are open for the balanced patients.`, [], { tag: 'note' }),
          fact(`Check the numbers on each monitor card.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Pure Equilibrium Across Systems',
      dispatch: 'Ignore whether a monitor measures water, blood, or air — spot the pure IN = OUT balance.',
      order: 'Move to Recovery every patient whose Amount IN exactly EQUALS their Amount OUT (regardless of fluid, blood, or air).',
      hint: 'Check each patient’s two numbers — select everyone where IN matches OUT.',
      cards,
      evaluate(activeCards) {
        const items = collectFactsByTag(activeCards, 'bal');
        const targets = uniqueSortedIds(items.filter((x) => x.ok).map((x) => x.patients[0]));
        const bad = items.filter((x) => !x.ok).map((x) => x.patients[0]);
        return {
          targets,
          proof: `Stripping away the surface substance reveals exact IN = OUT equilibrium for ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, bad, (id) => `${pName(id)}'s IN and OUT numbers do not match (still imbalanced).`),
        };
      },
    };
  },

  // #28 Hierarchical reasoning (Before · Atomic)
  'hierarchical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Command Order', wingIndex: 0, label: 'Chain of Command',
        shown: [
          fact(`RANK ORDER: Trauma Chief (Top) > Senior Doctor > First-Year Intern.`, [], { tag: 'note' }),
          fact(`When orders conflict, ONLY the Trauma Chief's assignment stands.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`RANK ORDER: Trauma Chief (Top) > Senior Doctor > First-Year Intern.`, [], { tag: 'note' }),
          fact(`When orders conflict, ONLY the Trauma Chief's assignment stands.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Trauma Desk', wingIndex: 1, label: 'Trauma Chief Order',
        shown: [
          fact(`TRAUMA CHIEF: "Operate on ${pName(a)} first — override all earlier guesses."`, a, { tag: 'chief' }),
          fact(`TRAUMA CHIEF: "Prep ${pName(b)} right behind them."`, b, { tag: 'chief' }),
        ],
        alt: [
          fact(`TRAUMA CHIEF: "Operate on ${pName(c)} first — override all earlier guesses."`, c, { tag: 'chief' }),
          fact(`TRAUMA CHIEF: "Prep ${pName(d)} right behind them."`, d, { tag: 'chief' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Trauma Desk', wingIndex: 1, label: 'Senior Doctor Guess',
        shown: [
          fact(`Senior Doctor (lower rank): "I thought ${pName(c)} should go first."`, c, { tag: 'lower' }),
          fact(`Senior Doctor (lower rank): "Maybe check ${pName(d)} too."`, d, { tag: 'lower' }),
        ],
        alt: [
          fact(`Senior Doctor (lower rank): "I thought ${pName(a)} should go first."`, a, { tag: 'lower' }),
          fact(`Senior Doctor (lower rank): "Maybe check ${pName(b)} too."`, b, { tag: 'lower' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Trauma Desk', wingIndex: 1, label: 'Intern Note',
        shown: [
          fact(`First-Year Intern: "I tagged ${pName(e)} for surgery."`, e, { tag: 'lower' }),
          fact(`First-Year Intern: "I also tagged ${pName(f)}."`, f, { tag: 'lower' }),
        ],
        alt: [
          fact(`First-Year Intern: "I tagged ${pName(e)} for surgery."`, e, { tag: 'lower' }),
          fact(`First-Year Intern: "I also tagged ${pName(f)}."`, f, { tag: 'lower' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Command Order', wingIndex: 0, label: 'OR Coordinator',
        shown: [
          fact(`Two operating rooms are opening right now.`, [], { tag: 'note' }),
          fact(`Execute the highest-ranking authority's exact list.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Two operating rooms are opening right now.`, [], { tag: 'note' }),
          fact(`Execute the highest-ranking authority's exact list.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Command Order', wingIndex: 0, label: 'Shift Sign-Off',
        shown: [
          fact(`Do not mix Intern or Senior Doctor guesses with the Chief's override.`, [], { tag: 'note' }),
          fact(`Chain of command prevents confusion in disasters.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Do not mix Intern or Senior Doctor guesses with the Chief's override.`, [], { tag: 'note' }),
          fact(`Chain of command prevents confusion in disasters.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Disaster Chain of Command',
      dispatch: 'Three different doctors shouted conflicting surgery orders — follow the top of the command ladder.',
      order: 'Follow the highest rank (Trauma Chief > Senior Doctor > Intern) and prep ONLY the Trauma Chief’s patient(s).',
      hint: 'Check the Trauma Chief Order card and ignore lower-rank guesses.',
      cards,
      evaluate(activeCards) {
        const targets = collectByTag(activeCards, 'chief');
        const lower = collectByTag(activeCards, 'lower');
        return {
          targets,
          proof: `The Trauma Chief sits at the top of the hierarchy, overriding lower-rank notes in favor of ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, lower, (id) => `${pName(id)} was only suggested by a lower-ranking doctor or intern.`),
        };
      },
    };
  },

  // #29 Spatial reasoning (Inside · Atomic)
  'spatial-reasoning': (rng) => {
    // 10 bays arranged in 2 columns of 5 on the monitor wall (Left col: 1..5, Right col: 6..10)
    // Pick a spill center bay index 0..9 and find immediate vertical neighbor (+/-1 in same col) and across-aisle neighbor (+/-5)
    const allIds = ['nadia', 'caleb', 'priya', 'devon', 'maren', 'tomas', 'hana', 'gideon', 'selma', 'rory'];
    const centerIdx = Math.floor(rng() * 10);
    const altIdx = (centerIdx + 3) % 10;
    const neighborsOf = (idx) => {
      const col = idx < 5 ? 0 : 1;
      const row = idx % 5;
      const out = [];
      if (row > 0) out.push(idx - 1);
      if (row < 4) out.push(idx + 1);
      out.push(col === 0 ? idx + 5 : idx - 5);
      return out.map((i) => allIds[i]);
    };
    const centerId = allIds[centerIdx];
    const altId = allIds[altIdx];
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Floor Alert', wingIndex: 0, label: 'Chemical Spill Origin',
        shown: [
          fact(`SPILL ORIGIN: A toxic canister burst inside Bay ${pBay(centerId)} (${pName(centerId)}).`, centerId, { tag: 'origin' }),
          fact(`Evacuate every patient in bays IMMEDIATELY NEXT TO Bay ${pBay(centerId)} on the monitor wall!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`SPILL ORIGIN: A toxic canister burst inside Bay ${pBay(altId)} (${pName(altId)}).`, altId, { tag: 'origin' }),
          fact(`Evacuate every patient in bays IMMEDIATELY NEXT TO Bay ${pBay(altId)} on the monitor wall!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Floor Map', wingIndex: 1, label: 'How Bays Touch',
        shown: [
          fact(`Look at the 2-column bay grid on the left: Left column is Bays 1–5, Right column is Bays 6–10.`, [], { tag: 'note' }),
          fact(`Touching bays = directly ABOVE, directly BELOW, and directly ACROSS the aisle (not diagonals).`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Look at the 2-column bay grid on the left: Left column is Bays 1–5, Right column is Bays 6–10.`, [], { tag: 'note' }),
          fact(`Touching bays = directly ABOVE, directly BELOW, and directly ACROSS the aisle (not diagonals).`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Floor Alert', wingIndex: 0, label: 'Origin Containment',
        shown: [
          fact(`Hazmat already sealed the spill origin bay itself — DO NOT click the origin bay.`, [], { tag: 'note' }),
          fact(`Move ONLY the touching neighbor bays before fumes seep through the curtains.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Hazmat already sealed the spill origin bay itself — DO NOT click the origin bay.`, [], { tag: 'note' }),
          fact(`Move ONLY the touching neighbor bays before fumes seep through the curtains.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Floor Map', wingIndex: 1, label: 'Aisle Guide',
        shown: [
          fact(`Across-the-aisle pairs: 1↔6, 2↔7, 3↔8, 4↔9, 5↔0(10).`, [], { tag: 'note' }),
          fact(`Corner bays (1, 5, 6, 10) have 2 neighbors; middle bays have 3 neighbors.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Across-the-aisle pairs: 1↔6, 2↔7, 3↔8, 4↔9, 5↔0(10).`, [], { tag: 'note' }),
          fact(`Corner bays (1, 5, 6, 10) have 2 neighbors; middle bays have 3 neighbors.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Floor Alert', wingIndex: 0, label: 'Ventilation Note',
        shown: [
          fact(`Fumes do NOT travel diagonally or skip over a bay.`, [], { tag: 'note' }),
          fact(`Use the physical bay layout on the left side of your screen!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Fumes do NOT travel diagonally or skip over a bay.`, [], { tag: 'note' }),
          fact(`Use the physical bay layout on the left side of your screen!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Floor Map', wingIndex: 1, label: 'Evac Stretchers',
        shown: [
          fact(`Orderlies are waiting with rolling stretchers for the neighboring bays.`, [], { tag: 'note' }),
          fact(`Click each touching neighbor bay now.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Orderlies are waiting with rolling stretchers for the neighboring bays.`, [], { tag: 'note' }),
          fact(`Click each touching neighbor bay now.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Physical Floor Spill Evacuation',
      dispatch: 'Look right at the 10-bay ward map on your screen — a chemical spill is seeping into neighboring bays.',
      order: 'Evacuate every patient whose bay touches the Spill Origin directly (above, below, or across the aisle — not the origin itself).',
      hint: 'Find the Spill Origin bay on the left wall, then click the bays touching it directly up, down, or sideways.',
      cards,
      evaluate(activeCards) {
        const origin = collectByTag(activeCards, 'origin')[0];
        const idx = allIds.indexOf(origin);
        const targets = idx >= 0 ? uniqueSortedIds(neighborsOf(idx)) : [];
        return {
          targets,
          proof: `On the 2×5 ward floor, the bays directly touching Bay ${pBay(origin)} (${pName(origin)}) are ${targets.map((id) => `Bay ${pBay(id)} (${pName(id)})`).join(', ')}.`,
          rival: buildRivalInfo(targets, [origin], (id) => `Bay ${pBay(id)} (${pName(id)}) is the spill origin itself, already sealed by hazmat.`),
        };
      },
    };
  },

  // #30 Temporal reasoning (Before · Atomic)
  'temporal-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '04:00', wing: 'Stroke Queue', wingIndex: 0, label: 'Stroke Arrival C',
        shown: [
          fact(`${pName(c)}'s stroke symptoms started at 04:00.`, c, { tag: 'stroke', hour: 4 }),
          fact(`Clot medicine works best on the earliest symptom start.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(c)}'s stroke symptoms started at 01:00.`, c, { tag: 'stroke', hour: 1 }),
          fact(`Clot medicine works best on the earliest symptom start.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Stroke Queue', wingIndex: 0, label: 'Stroke Arrival A',
        shown: [
          fact(`${pName(a)}'s stroke symptoms started at 02:00.`, a, { tag: 'stroke', hour: 2 }),
          fact(`Urgent brain scan cleared for treatment.`, a, { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(a)}'s stroke symptoms started at 05:00.`, a, { tag: 'stroke', hour: 5 }),
          fact(`Urgent brain scan cleared for treatment.`, a, { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 2, time: '05:00', wing: 'Stroke Queue', wingIndex: 0, label: 'Stroke Arrival B',
        shown: [
          fact(`${pName(b)}'s stroke symptoms started at 05:00.`, b, { tag: 'stroke', hour: 5 }),
          fact(`Still has plenty of treatment window remaining.`, b, { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(b)}'s stroke symptoms started at 02:00.`, b, { tag: 'stroke', hour: 2 }),
          fact(`Still has plenty of treatment window remaining.`, b, { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 3, time: '03:00', wing: 'Stroke Queue', wingIndex: 0, label: 'Stroke Arrival D',
        shown: [
          fact(`${pName(d)}'s stroke symptoms started at 03:00.`, d, { tag: 'stroke', hour: 3 }),
          fact(`Waiting in bay for clot-buster infusion.`, d, { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(d)}'s stroke symptoms started at 03:00.`, d, { tag: 'stroke', hour: 3 }),
          fact(`Waiting in bay for clot-buster infusion.`, d, { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '01:00', wing: 'Minor Care', wingIndex: 1, label: 'Non-Stroke Check',
        shown: [
          fact(`${pName(e)} arrived at 01:00 for a sprained finger (NOT a stroke).`, e, { tag: 'minor' }),
          fact(`${pName(f)} arrived at 01:00 for an earache (NOT a stroke).`, f, { tag: 'minor' }),
        ],
        alt: [
          fact(`${pName(e)} arrived at 01:00 for a sprained finger (NOT a stroke).`, e, { tag: 'minor' }),
          fact(`${pName(f)} arrived at 01:00 for an earache (NOT a stroke).`, f, { tag: 'minor' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Stroke Queue', wingIndex: 0, label: 'Clock Cutoff Rule',
        shown: [
          fact(`Stroke clot-buster expires strictly by symptom start time — earliest stroke goes FIRST!`, [], { tag: 'note' }),
          fact(`Tip: Click "By Time" above to sort cards in clock order.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Stroke clot-buster expires strictly by symptom start time — earliest stroke goes FIRST!`, [], { tag: 'note' }),
          fact(`Tip: Click "By Time" above to sort cards in clock order.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Stroke Clock Countdown',
      dispatch: 'Every minute counts for brain blood clots — treat the stroke patient whose clock started earliest.',
      order: 'Check the exact symptom timestamps and treat the SINGLE stroke patient whose stroke began EARLIEST.',
      hint: 'Compare the clock times on the Stroke Arrival cards (ignore non-stroke minor visits at 01:00).',
      cards,
      evaluate(activeCards) {
        const strokes = collectFactsByTag(activeCards, 'stroke');
        const minHour = Math.min(...strokes.map((s) => s.hour));
        const earliest = strokes.filter((s) => s.hour === minHour).map((s) => s.patients[0]);
        const targets = earliest.length === 1 ? uniqueSortedIds(earliest) : [];
        const later = strokes.filter((s) => s.hour > minHour).map((s) => s.patients[0]);
        return {
          targets,
          proof: `${formatList(targets)}'s stroke started earliest (0${minHour}:00), giving them the tightest remaining brain-saving window.`,
          rival: buildRivalInfo(targets, later, (id) => `${pName(id)}'s stroke started later, so they have more time left.`),
        };
      },
    };
  },

  // #31 Structural reasoning (Inside · Composite)
  'structural-reasoning': (rng) => {
    const [bridge, a, b, c, d, e] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Trauma Wing', wingIndex: 0, label: 'Trauma Team Plan',
        shown: [
          fact(`Trauma Team is managing ${pName(bridge)}'s broken pelvis.`, bridge, { tag: 'wing1' }),
          fact(`Trauma Team is managing ${pName(a)}'s broken leg.`, a, { tag: 'wing1' }),
        ],
        alt: [
          fact(`Trauma Team is managing ${pName(a)}'s broken pelvis.`, a, { tag: 'wing1' }),
          fact(`Trauma Team is managing ${pName(b)}'s broken leg.`, b, { tag: 'wing1' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Heart Wing', wingIndex: 1, label: 'Heart Team Plan',
        shown: [
          fact(`Heart Team is ALSO managing ${pName(bridge)}'s unstable heartbeat.`, bridge, { tag: 'wing2' }),
          fact(`Heart Team is managing ${pName(c)}'s pacemaker check.`, c, { tag: 'wing2' }),
        ],
        alt: [
          fact(`Heart Team is ALSO managing ${pName(a)}'s unstable heartbeat.`, a, { tag: 'wing2' }),
          fact(`Heart Team is managing ${pName(c)}'s pacemaker check.`, c, { tag: 'wing2' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Trauma Wing', wingIndex: 0, label: 'More Trauma Plans',
        shown: [
          fact(`Trauma Team is managing ${pName(b)}'s dislocated shoulder.`, b, { tag: 'wing1' }),
          fact(`Trauma Team is managing ${pName(d)}'s deep hand cut.`, d, { tag: 'wing1' }),
        ],
        alt: [
          fact(`Trauma Team is managing ${pName(bridge)}'s dislocated shoulder.`, bridge, { tag: 'wing1' }),
          fact(`Trauma Team is managing ${pName(d)}'s deep hand cut.`, d, { tag: 'wing1' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Heart Wing', wingIndex: 1, label: 'More Heart Plans',
        shown: [
          fact(`Heart Team is managing ${pName(e)}'s high blood pressure.`, e, { tag: 'wing2' }),
          fact(`Only one patient needs both teams working together in the Hybrid Suite!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Heart Team is managing ${pName(e)}'s high blood pressure.`, e, { tag: 'wing2' }),
          fact(`Only one patient needs both teams working together in the Hybrid Suite!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Trauma Wing', wingIndex: 0, label: 'Coordination Rule',
        shown: [
          fact(`A patient bridging BOTH Trauma Wing and Heart Wing risks conflicting treatments unless unified.`, [], { tag: 'note' }),
          fact(`Move any bridge patient to the shared Hybrid Suite.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`A patient bridging BOTH Trauma Wing and Heart Wing risks conflicting treatments unless unified.`, [], { tag: 'note' }),
          fact(`Move any bridge patient to the shared Hybrid Suite.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Heart Wing', wingIndex: 1, label: 'Single-Team Bays',
        shown: [
          fact(`Single-team patients stay safely in their own wing.`, [], { tag: 'note' }),
          fact(`Find who bridges both teams.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Single-team patients stay safely in their own wing.`, [], { tag: 'note' }),
          fact(`Find who bridges both teams.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Shared Hybrid Operating Suite',
      dispatch: 'Two hospital departments are working separately — find the bridge patient who needs BOTH teams together.',
      order: 'Move to the Hybrid Suite the patient(s) listed on BOTH the Trauma Wing plan AND the Heart Wing plan.',
      hint: 'Click "By Wing" if helpful — find the name managed by both Trauma Wing and Heart Wing.',
      cards,
      evaluate(activeCards) {
        const w1 = new Set(collectByTag(activeCards, 'wing1'));
        const w2 = new Set(collectByTag(activeCards, 'wing2'));
        const targets = uniqueSortedIds([...w1].filter((id) => w2.has(id)));
        const singles = [...w1, ...w2].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `${formatList(targets)} bridge both the Trauma Wing and Heart Wing care plans and need unified Hybrid Suite care.`,
          rival: buildRivalInfo(targets, singles, (id) => `${pName(id)} is only handled by one department.`),
        };
      },
    };
  },

  // #32 Semantic reasoning (After · Atomic)
  'semantic-reasoning': (rng) => {
    const [p1, s1, p2, s2, a, b] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Consent Desk', wingIndex: 0, label: 'Signed Consent #1',
        shown: [
          fact(`${pName(s1)} signed the family consent form authorizing ${pName(p1)}'s surgery.`, [s1, p1], { tag: 'patient', pid: p1, signer: s1 }),
          fact(`Form verified by hospital notary.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(p1)} signed the family consent form authorizing ${pName(s1)}'s surgery.`, [p1, s1], { tag: 'patient', pid: s1, signer: p1 }),
          fact(`Form verified by hospital notary.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Consent Desk', wingIndex: 0, label: 'Signed Consent #2',
        shown: [
          fact(`${pName(p2)}'s emergency surgery was approved by next-of-kin ${pName(s2)}.`, [p2, s2], { tag: 'patient', pid: p2, signer: s2 }),
          fact(`Read carefully: who is the PATIENT vs. who is just the signer!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(s2)}'s emergency surgery was approved by next-of-kin ${pName(p2)}.`, [s2, p2], { tag: 'patient', pid: s2, signer: p2 }),
          fact(`Read carefully: who is the PATIENT vs. who is just the signer!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Waiting Room', wingIndex: 1, label: 'Refusal Form',
        shown: [
          fact(`${pName(a)} declined elective knee surgery (NOT scheduled).`, a, { tag: 'other' }),
          fact(`${pName(b)} came in only as a family visitor (NOT a patient).`, b, { tag: 'other' }),
        ],
        alt: [
          fact(`${pName(b)} declined elective knee surgery (NOT scheduled).`, b, { tag: 'other' }),
          fact(`${pName(a)} came in only as a family visitor (NOT a patient).`, a, { tag: 'other' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Consent Desk', wingIndex: 0, label: 'Safety Reminder',
        shown: [
          fact(`Never wheel a healthy family signer into the operating room by mistake!`, [], { tag: 'note' }),
          fact(`Check exact grammar: whose surgery was authorized?`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Never wheel a healthy family signer into the operating room by mistake!`, [], { tag: 'note' }),
          fact(`Check exact grammar: whose surgery was authorized?`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Waiting Room', wingIndex: 1, label: 'Visitor Badges',
        shown: [
          fact(`Family signers are waiting comfortably in the lounge with coffee.`, [], { tag: 'note' }),
          fact(`Both surgical patients are ready in their bays.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Family signers are waiting comfortably in the lounge with coffee.`, [], { tag: 'note' }),
          fact(`Both surgical patients are ready in their bays.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Consent Desk', wingIndex: 0, label: 'OR Roll-In',
        shown: [
          fact(`Select ONLY the actual patients scheduled for surgery.`, [], { tag: 'note' }),
          fact(`Do not click their family signers.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Select ONLY the actual patients scheduled for surgery.`, [], { tag: 'note' }),
          fact(`Do not click their family signers.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Surgery Consent Wording Check',
      dispatch: 'Family members signed legal surgery forms — read the exact sentences so you wheel the right people into the OR.',
      order: 'Select ONLY the actual PATIENT(s) whose surgery was approved (not the healthy family members who signed for them).',
      hint: 'Check whose surgery is actually being authorized on Signed Consent #1 and #2.',
      cards,
      evaluate(activeCards) {
        const items = collectFactsByTag(activeCards, 'patient');
        const targets = uniqueSortedIds(items.map((x) => x.pid));
        const signers = items.map((x) => x.signer);
        return {
          targets,
          proof: `Reading the exact meaning of the consent sentences shows ${formatList(targets)} are the patients getting surgery.`,
          rival: buildRivalInfo(targets, signers, (id) => `${pName(id)} only signed the consent form as next-of-kin — not the patient!`),
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
        index: 0, time: '01:00', wing: 'Poison Ward', wingIndex: 0, label: 'Antidote Dose Supply',
        shown: [
          fact(`ONLY 1 ANTIDOTE DOSE LEFT — give it to the patient who gains the BIGGEST survival boost!`, [], { tag: 'note' }),
          fact(`Compare survival chance WITH antidote minus survival chance WITHOUT it.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`ONLY 1 ANTIDOTE DOSE LEFT — give it to the patient who gains the BIGGEST survival boost!`, [], { tag: 'note' }),
          fact(`Compare survival chance WITH antidote minus survival chance WITHOUT it.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Poison Ward', wingIndex: 0, label: 'Survival Odds A',
        shown: [
          fact(`${pName(a)}: 20% survival without antidote → 90% WITH antidote (+70% gain!).`, a, { tag: 'odds', gain: 70 }),
          fact(`${pName(b)}: 80% survival without antidote → 95% WITH antidote (+15% gain).`, b, { tag: 'odds', gain: 15 }),
        ],
        alt: [
          fact(`${pName(a)}: 80% survival without antidote → 95% WITH antidote (+15% gain).`, a, { tag: 'odds', gain: 15 }),
          fact(`${pName(b)}: 20% survival without antidote → 90% WITH antidote (+70% gain!).`, b, { tag: 'odds', gain: 70 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Poison Ward', wingIndex: 0, label: 'Survival Odds B',
        shown: [
          fact(`${pName(c)}: 5% survival without antidote → 10% WITH antidote (+5% gain).`, c, { tag: 'odds', gain: 5 }),
          fact(`${pName(d)}: 50% survival without antidote → 85% WITH antidote (+35% gain).`, d, { tag: 'odds', gain: 35 }),
        ],
        alt: [
          fact(`${pName(c)}: 15% survival without antidote → 95% WITH antidote (+80% gain!).`, c, { tag: 'odds', gain: 80 }),
          fact(`${pName(d)}: 50% survival without antidote → 85% WITH antidote (+35% gain).`, d, { tag: 'odds', gain: 35 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Pharmacy', wingIndex: 1, label: 'Survival Odds C',
        shown: [
          fact(`${pName(e)}: 90% survival without antidote → 95% WITH antidote (+5% gain).`, e, { tag: 'odds', gain: 5 }),
          fact(`${pName(f)} was NOT exposed to poison (100% safe).`, f, { tag: 'safe' }),
        ],
        alt: [
          fact(`${pName(e)}: 90% survival without antidote → 95% WITH antidote (+5% gain).`, e, { tag: 'odds', gain: 5 }),
          fact(`${pName(f)} was NOT exposed to poison (100% safe).`, f, { tag: 'safe' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Pharmacy', wingIndex: 1, label: 'Why Gain Matters',
        shown: [
          fact(`A patient who already has 90% odds barely needs the last dose; someone jumping +70% does!`, [], { tag: 'note' }),
          fact(`Save the single biggest jump in survival chance.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`A patient who already has 90% odds barely needs the last dose; someone jumping +70% does!`, [], { tag: 'note' }),
          fact(`Save the single biggest jump in survival chance.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Pharmacy', wingIndex: 1, label: 'Syringe Ready',
        shown: [
          fact(`Antidote syringe is drawn up — pick the single highest-gain patient.`, [], { tag: 'note' }),
          fact(`Other patients receive supportive fluids while waiting for resupply.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Antidote syringe is drawn up — pick the single highest-gain patient.`, [], { tag: 'note' }),
          fact(`Other patients receive supportive fluids while waiting for resupply.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Last Antidote Dose',
      dispatch: 'Five poisoned patients, only ONE antidote syringe — put it where it shifts the odds of survival the most.',
      order: 'Give the last antidote to the SINGLE patient who gets the BIGGEST percentage jump in survival chance.',
      hint: 'Compare the survival gain (+%) on each Survival Odds card and pick the largest jump.',
      cards,
      evaluate(activeCards) {
        const list = collectFactsByTag(activeCards, 'odds');
        const maxGain = Math.max(...list.map((x) => x.gain));
        const top = list.filter((x) => x.gain === maxGain).map((x) => x.patients[0]);
        const targets = top.length === 1 ? uniqueSortedIds(top) : [];
        const rest = list.filter((x) => x.gain < maxGain).sort((x, y) => y.gain - x.gain).map((x) => x.patients[0]);
        return {
          targets,
          proof: `${formatList(targets)} get a massive +${maxGain}% jump in survival probability — far more life-saving impact than anyone else.`,
          rival: buildRivalInfo(targets, rest, (id) => {
            const g = list.find((x) => x.patients[0] === id)?.gain ?? 0;
            return `${pName(id)} only gains +${g}% survival chance from the antidote.`;
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
        index: 0, time: '01:00', wing: 'Quality Audit', wingIndex: 0, label: 'Wait Times Group 1',
        shown: [
          fact(`${pName(a)} waited 50 minutes for a doctor.`, a, { tag: 'wait', min: 50 }),
          fact(`${pName(b)} waited 10 minutes for a doctor.`, b, { tag: 'wait', min: 10 }),
        ],
        alt: [
          fact(`${pName(a)} waited 10 minutes for a doctor.`, a, { tag: 'wait', min: 10 }),
          fact(`${pName(b)} waited 50 minutes for a doctor.`, b, { tag: 'wait', min: 50 }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Quality Audit', wingIndex: 0, label: 'Wait Times Group 2',
        shown: [
          fact(`${pName(c)} waited 40 minutes for a doctor.`, c, { tag: 'wait', min: 40 }),
          fact(`${pName(d)} waited 10 minutes for a doctor.`, d, { tag: 'wait', min: 10 }),
        ],
        alt: [
          fact(`${pName(c)} waited 10 minutes for a doctor.`, c, { tag: 'wait', min: 10 }),
          fact(`${pName(d)} waited 40 minutes for a doctor.`, d, { tag: 'wait', min: 40 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Quality Audit', wingIndex: 0, label: 'Wait Times Group 3',
        shown: [
          fact(`${pName(e)} waited 10 minutes for a doctor.`, e, { tag: 'wait', min: 10 }),
          fact(`${pName(f)} waited 20 minutes for a doctor.`, f, { tag: 'wait', min: 20 }),
        ],
        alt: [
          fact(`${pName(e)} waited 20 minutes for a doctor.`, e, { tag: 'wait', min: 20 }),
          fact(`${pName(f)} waited 10 minutes for a doctor.`, f, { tag: 'wait', min: 10 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Hospital Board', wingIndex: 1, label: 'How to Audit',
        shown: [
          fact(`Add all 6 wait times and divide by 6 to get the Ward Average.`, [], { tag: 'note' }),
          fact(`Flag every patient who waited STRICTLY LONGER than that ward average.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Add all 6 wait times and divide by 6 to get the Ward Average.`, [], { tag: 'note' }),
          fact(`Flag every patient who waited STRICTLY LONGER than that ward average.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Hospital Board', wingIndex: 1, label: 'Quick Check',
        shown: [
          fact(`Total minutes across all 6 patients = 140 min → Average ≈ 23.3 minutes.`, [], { tag: 'note' }),
          fact(`Focus on the clear outliers standing above the average.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Total minutes across all 6 patients = 140 min → Average ≈ 23.3 minutes.`, [], { tag: 'note' }),
          fact(`Focus on the clear outliers standing above the average.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Hospital Board', wingIndex: 1, label: 'Improvement Goal',
        shown: [
          fact(`Reviewing above-average delays helps fix ER bottlenecks next shift.`, [], { tag: 'note' }),
          fact(`Select every patient who waited longer than the ward average.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Reviewing above-average delays helps fix ER bottlenecks next shift.`, [], { tag: 'note' }),
          fact(`Select every patient who waited longer than the ward average.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'ER Wait-Time Delay Audit',
      dispatch: 'After the rush, the hospital board is auditing which patients waited abnormally long compared to the ward average.',
      order: 'Flag every patient whose wait time was STRICTLY ABOVE the 6-patient ward average (~23 minutes).',
      hint: 'Check the 6 wait times — flag anyone above the ~23-minute average.',
      cards,
      evaluate(activeCards) {
        const waits = collectFactsByTag(activeCards, 'wait');
        const avg = waits.reduce((s, x) => s + x.min, 0) / Math.max(1, waits.length);
        const targets = uniqueSortedIds(waits.filter((x) => x.min > avg).map((x) => x.patients[0]));
        const fast = waits.filter((x) => x.min <= avg).sort((x, y) => y.min - x.min).map((x) => x.patients[0]);
        return {
          targets,
          proof: `The ward average was ${avg.toFixed(1)} min — only ${formatList(targets)} waited strictly longer.`,
          rival: buildRivalInfo(targets, fast, (id) => {
            const m = waits.find((x) => x.patients[0] === id)?.min ?? 0;
            return `${pName(id)} waited ${m} min, which is below the ${avg.toFixed(1)}-min average.`;
          }),
        };
      },
    };
  },

  // #35 Counterfactual reasoning (Inside · Composite)
  'counterfactual-reasoning': (rng) => {
    const [sole, both, safe1, safe2, safe3] = pickPlayers(rng, 5);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Nurse Check', wingIndex: 0, label: 'Night Nurse Walk-Through',
        shown: [
          fact(`Night Nurse caught ${pName(sole)}'s silent internal bleed.`, sole, { tag: 'nurse' }),
          fact(`Night Nurse caught ${pName(both)}'s silent internal bleed.`, both, { tag: 'nurse' }),
        ],
        alt: [
          fact(`Night Nurse caught ${pName(safe1)}'s silent internal bleed.`, safe1, { tag: 'nurse' }),
          fact(`Night Nurse caught ${pName(both)}'s silent internal bleed.`, both, { tag: 'nurse' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Auto Monitor', wingIndex: 1, label: 'Automatic Heart Alarm',
        shown: [
          fact(`Automatic Heart Alarm ALSO caught ${pName(both)}'s bleed.`, both, { tag: 'auto' }),
          fact(`Automatic Heart Alarm caught ${pName(safe2)}'s fast heartbeat.`, safe2, { tag: 'auto' }),
        ],
        alt: [
          fact(`Automatic Heart Alarm ALSO caught ${pName(sole)}'s bleed.`, sole, { tag: 'auto' }),
          fact(`Automatic Heart Alarm caught ${pName(safe2)}'s fast heartbeat.`, safe2, { tag: 'auto' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Auto Monitor', wingIndex: 1, label: 'Blood Lab Alert',
        shown: [
          fact(`Blood Lab Alert ALSO caught ${pName(both)}'s dropping blood count.`, both, { tag: 'auto' }),
          fact(`Blood Lab Alert caught ${pName(safe3)}'s low sugar.`, safe3, { tag: 'auto' }),
        ],
        alt: [
          fact(`Blood Lab Alert ALSO caught ${pName(sole)}'s dropping blood count.`, sole, { tag: 'auto' }),
          fact(`Blood Lab Alert caught ${pName(safe3)}'s low sugar.`, safe3, { tag: 'auto' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Nurse Check', wingIndex: 0, label: 'What-If Question',
        shown: [
          fact(`Imagine the Night Nurse had skipped that walk-through.`, [], { tag: 'note' }),
          fact(`Who would have been COMPLETELY MISSED by every other alarm?`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Imagine the Night Nurse had skipped that walk-through.`, [], { tag: 'note' }),
          fact(`Who would have been COMPLETELY MISSED by every other alarm?`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Auto Monitor', wingIndex: 1, label: 'Quiet Monitors',
        shown: [
          fact(`${pName(sole)}'s automatic alarms stayed completely silent!`, sole, { tag: 'note' }),
          fact(`${pName(safe1)} had no bleeding at all.`, safe1, { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(safe1)}'s automatic alarms stayed completely silent!`, safe1, { tag: 'note' }),
          fact(`${pName(both)}'s automatic alarms stayed completely silent!`, both, { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Nurse Check', wingIndex: 0, label: 'Safety Lesson',
        shown: [
          fact(`Find the patient(s) saved ONLY because of the Night Nurse walk-through.`, [], { tag: 'note' }),
          fact(`Anyone already caught by Heart Alarm or Blood Lab had a backup net.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Find the patient(s) saved ONLY because of the Night Nurse walk-through.`, [], { tag: 'note' }),
          fact(`Anyone already caught by Heart Alarm or Blood Lab had a backup net.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'What If the Nurse Hadn’t Checked?',
      dispatch: 'Ask "what would have happened differently?" — spot who had ZERO backup alarms catching them.',
      order: 'If the Night Nurse had skipped her walk-through, which patient(s) would have been COMPLETELY missed by all other alarms?',
      hint: 'Look at the Night Nurse card and cross off anyone ALSO caught by Heart Alarm or Blood Lab.',
      cards,
      evaluate(activeCards) {
        const nurse = collectByTag(activeCards, 'nurse');
        const auto = new Set(collectByTag(activeCards, 'auto'));
        const targets = uniqueSortedIds(nurse.filter((id) => !auto.has(id)));
        const backed = nurse.filter((id) => auto.has(id));
        return {
          targets,
          proof: `Without the Night Nurse walk-through, ${formatList(targets)} had zero other alarms to catch their bleed.`,
          rival: buildRivalInfo(targets, backed, (id) => `${pName(id)} was also caught by automatic alarms, so they would not have been missed.`),
        };
      },
    };
  },

  // #36 Hypothetical reasoning (Before · Atomic)
  'hypothetical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Power Drill', wingIndex: 0, label: 'What-If Storm Scenario',
        shown: [
          fact(`WHAT IF the hurricane knocks out wall electricity in 2 minutes?`, [], { tag: 'note' }),
          fact(`Every electric wall-plugged breathing machine would shut off immediately!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`WHAT IF the hurricane knocks out wall electricity in 2 minutes?`, [], { tag: 'note' }),
          fact(`Every electric wall-plugged breathing machine would shut off immediately!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Bay Equipment', wingIndex: 1, label: 'Equipment Check 1',
        shown: [
          fact(`${pName(a)} depends on a wall-plugged electric ventilator (NO battery).`, a, { tag: 'elec' }),
          fact(`${pName(b)} breathes on their own with a simple oxygen tank (no power needed).`, b, { tag: 'safe' }),
        ],
        alt: [
          fact(`${pName(b)} depends on a wall-plugged electric ventilator (NO battery).`, b, { tag: 'elec' }),
          fact(`${pName(a)} breathes on their own with a simple oxygen tank (no power needed).`, a, { tag: 'safe' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Bay Equipment', wingIndex: 1, label: 'Equipment Check 2',
        shown: [
          fact(`${pName(c)} depends on a wall-plugged electric ventilator (NO battery).`, c, { tag: 'elec' }),
          fact(`${pName(d)} has a ventilator with a 6-hour full backup battery.`, d, { tag: 'safe' }),
        ],
        alt: [
          fact(`${pName(d)} depends on a wall-plugged electric ventilator (NO battery).`, d, { tag: 'elec' }),
          fact(`${pName(c)} has a ventilator with a 6-hour full backup battery.`, c, { tag: 'safe' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Bay Equipment', wingIndex: 1, label: 'Equipment Check 3',
        shown: [
          fact(`${pName(e)} is awake and breathing naturally on room air.`, e, { tag: 'safe' }),
          fact(`${pName(f)} only has an IV drip bag hanging on a pole (gravity powered).`, f, { tag: 'safe' }),
        ],
        alt: [
          fact(`${pName(e)} depends on a wall-plugged electric ventilator (NO battery).`, e, { tag: 'elec' }),
          fact(`${pName(f)} only has an IV drip bag hanging on a pole (gravity powered).`, f, { tag: 'safe' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Power Drill', wingIndex: 0, label: 'Manual Squeeze Bags',
        shown: [
          fact(`Pre-position nurses with hand-pumped breathing bags at every unprotected electric-ventilator bay.`, [], { tag: 'note' }),
          fact(`Battery-backed and natural-breathing bays stay safe.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Pre-position nurses with hand-pumped breathing bags at every unprotected electric-ventilator bay.`, [], { tag: 'note' }),
          fact(`Battery-backed and natural-breathing bays stay safe.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Power Drill', wingIndex: 0, label: 'Storm Warning',
        shown: [
          fact(`Lights haven't gone out yet — plan ahead right now!`, [], { tag: 'note' }),
          fact(`Protect everyone who would immediately lose air in a blackout.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Lights haven't gone out yet — plan ahead right now!`, [], { tag: 'note' }),
          fact(`Protect everyone who would immediately lose air in a blackout.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Hurricane Blackout Drill',
      dispatch: 'The power is still on — imagine the wall outlets die in 2 minutes and protect whoever would lose air.',
      order: 'Suppose the hospital loses wall power right now: send hand-pump breathing teams to every patient on a NO-BATTERY electric ventilator.',
      hint: 'Skip patients on backup batteries, oxygen tanks, or breathing on their own.',
      cards,
      evaluate(activeCards) {
        const targets = collectByTag(activeCards, 'elec');
        const safe = collectByTag(activeCards, 'safe');
        return {
          targets,
          proof: `Under a blackout, only ${formatList(targets)} depend on wall-plugged ventilators with no battery backup.`,
          rival: buildRivalInfo(targets, safe, (id) => `${pName(id)} has a backup battery, gravity IV, or breathes on their own.`),
        };
      },
    };
  },

  // #37 Predictive reasoning (Before · Atomic)
  'predictive-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Blood Pressure', wingIndex: 0, label: 'BP Trend Card 1',
        shown: [
          fact(`${pName(a)}: BP is 95 now, dropping -15 per minute.`, a, { tag: 'bp', now: 95, drop: 15 }),
          fact(`${pName(b)}: BP is 82 now, steady (-0 per minute).`, b, { tag: 'bp', now: 82, drop: 0 }),
        ],
        alt: [
          fact(`${pName(a)}: BP is 110 now, steady (-0 per minute).`, a, { tag: 'bp', now: 110, drop: 0 }),
          fact(`${pName(b)}: BP is 90 now, dropping -15 per minute.`, b, { tag: 'bp', now: 90, drop: 15 }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Blood Pressure', wingIndex: 0, label: 'BP Trend Card 2',
        shown: [
          fact(`${pName(c)}: BP is 100 now, dropping -20 per minute.`, c, { tag: 'bp', now: 100, drop: 20 }),
          fact(`${pName(d)}: BP is 120 now, dropping -10 per minute.`, d, { tag: 'bp', now: 120, drop: 10 }),
        ],
        alt: [
          fact(`${pName(c)}: BP is 120 now, dropping -10 per minute.`, c, { tag: 'bp', now: 120, drop: 10 }),
          fact(`${pName(d)}: BP is 95 now, dropping -20 per minute.`, d, { tag: 'bp', now: 95, drop: 20 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Blood Pressure', wingIndex: 0, label: 'BP Trend Card 3',
        shown: [
          fact(`${pName(e)}: BP is 115 now, steady (-0 per minute).`, e, { tag: 'bp', now: 115, drop: 0 }),
          fact(`${pName(f)}: BP is 85 now, dropping -5 per minute.`, f, { tag: 'bp', now: 85, drop: 5 }),
        ],
        alt: [
          fact(`${pName(e)}: BP is 115 now, steady (-0 per minute).`, e, { tag: 'bp', now: 115, drop: 0 }),
          fact(`${pName(f)}: BP is 85 now, dropping -5 per minute.`, f, { tag: 'bp', now: 85, drop: 5 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Crash Threshold', wingIndex: 1, label: '2-Minute Crash Rule',
        shown: [
          fact(`Project 2 MINUTES ahead: BP in 2 min = (BP Now) − (2 × Drop per min).`, [], { tag: 'note' }),
          fact(`Anyone falling BELOW 70 in 2 minutes is about to faint into shock!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Project 2 MINUTES ahead: BP in 2 min = (BP Now) − (2 × Drop per min).`, [], { tag: 'note' }),
          fact(`Anyone falling BELOW 70 in 2 minutes is about to faint into shock!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Crash Threshold', wingIndex: 1, label: 'Why Trends Beat Snapshots',
        shown: [
          fact(`A steady 82 is safer than a 95 plummeting by 15 every minute!`, [], { tag: 'note' }),
          fact(`Act BEFORE they hit 70.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`A steady 82 is safer than a 95 plummeting by 15 every minute!`, [], { tag: 'note' }),
          fact(`Act BEFORE they hit 70.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Crash Threshold', wingIndex: 1, label: 'IV Pressor Team',
        shown: [
          fact(`Blood-pressure support lines are ready for every predicted crasher.`, [], { tag: 'note' }),
          fact(`Subtract 2 minutes of drop for each patient.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Blood-pressure support lines are ready for every predicted crasher.`, [], { tag: 'note' }),
          fact(`Subtract 2 minutes of drop for each patient.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Who Will Crash in 2 Minutes?',
      dispatch: 'Don’t just look at blood pressure right now — look at how fast each patient is falling.',
      order: 'Predict 2 minutes ahead (Now − 2 × Drop/min): treat everyone whose blood pressure will drop BELOW 70.',
      hint: 'For example, 95 dropping −15/min hits 65 in 2 minutes (below 70!).',
      cards,
      evaluate(activeCards) {
        const list = collectFactsByTag(activeCards, 'bp').map((x) => ({
          id: x.patients[0],
          proj: x.now - 2 * x.drop,
        }));
        const targets = uniqueSortedIds(list.filter((x) => x.proj < 70).map((x) => x.id));
        const safe = list.filter((x) => x.proj >= 70).sort((x, y) => x.proj - y.proj).map((x) => x.id);
        return {
          targets,
          proof: `Two minutes ahead, ${targets.map((id) => `${pName(id)} (${list.find((x) => x.id === id).proj})`).join(' and ')} fall below 70.`,
          rival: buildRivalInfo(targets, safe, (id) => {
            const p = list.find((x) => x.id === id)?.proj ?? 80;
            return `${pName(id)} stays at ${p} in two minutes (still safely at or above 70).`;
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
        index: 0, time: '01:00', wing: 'Early Check', wingIndex: 0, label: 'Morning Severity Scores',
        shown: [
          fact(`${pName(a)} started the morning at Severity 4.`, a, { tag: 'early', v: 4 }),
          fact(`${pName(b)} started the morning at Severity 8.`, b, { tag: 'early', v: 8 }),
        ],
        alt: [
          fact(`${pName(a)} started the morning at Severity 9.`, a, { tag: 'early', v: 9 }),
          fact(`${pName(b)} started the morning at Severity 4.`, b, { tag: 'early', v: 4 }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Early Check', wingIndex: 0, label: 'More Morning Scores',
        shown: [
          fact(`${pName(c)} started the morning at Severity 3.`, c, { tag: 'early', v: 3 }),
          fact(`${pName(d)} started the morning at Severity 7.`, d, { tag: 'early', v: 7 }),
        ],
        alt: [
          fact(`${pName(c)} started the morning at Severity 7.`, c, { tag: 'early', v: 7 }),
          fact(`${pName(d)} started the morning at Severity 3.`, d, { tag: 'early', v: 3 }),
        ],
      }),
      makeCard({
        index: 2, time: '05:00', wing: 'Late Check', wingIndex: 1, label: 'Afternoon Re-Check 1',
        shown: [
          fact(`${pName(a)} rose to Severity 8 by afternoon (WORSENING!).`, a, { tag: 'late', v: 8 }),
          fact(`${pName(b)} dropped to Severity 5 by afternoon (recovering).`, b, { tag: 'late', v: 5 }),
        ],
        alt: [
          fact(`${pName(a)} dropped to Severity 5 by afternoon (recovering).`, a, { tag: 'late', v: 5 }),
          fact(`${pName(b)} rose to Severity 8 by afternoon (WORSENING!).`, b, { tag: 'late', v: 8 }),
        ],
      }),
      makeCard({
        index: 3, time: '06:00', wing: 'Late Check', wingIndex: 1, label: 'Afternoon Re-Check 2',
        shown: [
          fact(`${pName(c)} rose to Severity 7 by afternoon (WORSENING!).`, c, { tag: 'late', v: 7 }),
          fact(`${pName(d)} dropped to Severity 4 by afternoon (recovering).`, d, { tag: 'late', v: 4 }),
        ],
        alt: [
          fact(`${pName(c)} dropped to Severity 4 by afternoon (recovering).`, c, { tag: 'late', v: 4 }),
          fact(`${pName(d)} rose to Severity 7 by afternoon (WORSENING!).`, d, { tag: 'late', v: 7 }),
        ],
      }),
      makeCard({
        index: 4, time: '03:00', wing: 'Early Check', wingIndex: 0, label: 'Steady Patients',
        shown: [
          fact(`${pName(e)} stayed steady at Severity 3 all day.`, e, { tag: 'steady' }),
          fact(`${pName(f)} stayed steady at Severity 2 all day.`, f, { tag: 'steady' }),
        ],
        alt: [
          fact(`${pName(e)} stayed steady at Severity 3 all day.`, e, { tag: 'steady' }),
          fact(`${pName(f)} stayed steady at Severity 2 all day.`, f, { tag: 'steady' }),
        ],
      }),
      makeCard({
        index: 5, time: '04:00', wing: 'Late Check', wingIndex: 1, label: 'Family Briefing Rule',
        shown: [
          fact(`Warn families immediately whenever a patient's trajectory is getting WORSE (Late > Early).`, [], { tag: 'note' }),
          fact(`Recovering patients (Late < Early) are heading in the right direction.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Warn families immediately whenever a patient's trajectory is getting WORSE (Late > Early).`, [], { tag: 'note' }),
          fact(`Recovering patients (Late < Early) are heading in the right direction.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Worsening vs. Recovering Patients',
      dispatch: 'Before meeting families in the evening, spot whose medical course is getting worse rather than improving.',
      order: 'Flag every patient whose condition is getting WORSE (Afternoon Severity strictly HIGHER than Morning Severity).',
      hint: 'Compare each patient’s Morning score against their Afternoon score.',
      cards,
      evaluate(activeCards) {
        const early = new Map(collectFactsByTag(activeCards, 'early').map((x) => [x.patients[0], x.v]));
        const late = new Map(collectFactsByTag(activeCards, 'late').map((x) => [x.patients[0], x.v]));
        const ids = uniqueSortedIds([...early.keys()].filter((id) => late.has(id)));
        const targets = ids.filter((id) => late.get(id) > early.get(id));
        const improving = ids.filter((id) => late.get(id) <= early.get(id));
        return {
          targets,
          proof: `${formatList(targets)} worsened from morning to afternoon (${targets.map((id) => `${pName(id)}: ${early.get(id)}→${late.get(id)}`).join(', ')}).`,
          rival: buildRivalInfo(targets, improving, (id) => `${pName(id)} improved from ${early.get(id)} down to ${late.get(id)}.`),
        };
      },
    };
  },

  // #39 Extrapolative reasoning (Before · Atomic)
  'extrapolative-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Fever Chart', wingIndex: 0, label: 'Temperature Log 1',
        shown: [
          fact(`${pName(a)}'s fever climbed steadily: 99° → 101° → 103° (+2°/hr).`, a, { tag: 'temp', next: 105 }),
          fact(`${pName(b)}'s fever stayed flat: 101° → 101° → 101° (+0°/hr).`, b, { tag: 'temp', next: 101 }),
        ],
        alt: [
          fact(`${pName(a)}'s fever stayed flat: 101° → 101° → 101° (+0°/hr).`, a, { tag: 'temp', next: 101 }),
          fact(`${pName(b)}'s fever climbed steadily: 99° → 101° → 103° (+2°/hr).`, b, { tag: 'temp', next: 105 }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Fever Chart', wingIndex: 0, label: 'Temperature Log 2',
        shown: [
          fact(`${pName(c)}'s fever climbed steadily: 100° → 101.5° → 103° (+1.5°/hr).`, c, { tag: 'temp', next: 104.5 }),
          fact(`${pName(d)}'s fever is cooling down: 103° → 102° → 101° (-1°/hr).`, d, { tag: 'temp', next: 100 }),
        ],
        alt: [
          fact(`${pName(c)}'s fever is cooling down: 103° → 102° → 101° (-1°/hr).`, c, { tag: 'temp', next: 100 }),
          fact(`${pName(d)}'s fever climbed steadily: 100° → 101.5° → 103° (+1.5°/hr).`, d, { tag: 'temp', next: 104.5 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Fever Chart', wingIndex: 0, label: 'Temperature Log 3',
        shown: [
          fact(`${pName(e)}'s fever rose slowly: 99° → 100° → 101° (+1°/hr).`, e, { tag: 'temp', next: 102 }),
          fact(`${pName(f)}'s temperature is normal: 98.6° → 98.6° → 98.6°.`, f, { tag: 'temp', next: 98.6 }),
        ],
        alt: [
          fact(`${pName(e)}'s fever rose slowly: 99° → 100° → 101° (+1°/hr).`, e, { tag: 'temp', next: 102 }),
          fact(`${pName(f)}'s temperature is normal: 98.6° → 98.6° → 98.6°.`, f, { tag: 'temp', next: 98.6 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Cooling Bay', wingIndex: 1, label: 'Ice-Blanket Cutoff',
        shown: [
          fact(`Extend each patient's steady pattern by ONE more hour.`, [], { tag: 'note' }),
          fact(`Put an ice-cooling blanket on anyone projected to reach 104°F or higher!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Extend each patient's steady pattern by ONE more hour.`, [], { tag: 'note' }),
          fact(`Put an ice-cooling blanket on anyone projected to reach 104°F or higher!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Cooling Bay', wingIndex: 1, label: 'Why Extend Ahead',
        shown: [
          fact(`At 104°F seizures can start — cool rising patients BEFORE they cross 104°F.`, [], { tag: 'note' }),
          fact(`Flat or falling fevers do not need emergency ice blankets.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`At 104°F seizures can start — cool rising patients BEFORE they cross 104°F.`, [], { tag: 'note' }),
          fact(`Flat or falling fevers do not need emergency ice blankets.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Cooling Bay', wingIndex: 1, label: 'Ice Blankets Ready',
        shown: [
          fact(`Two cooling blankets are prepped and chilled.`, [], { tag: 'note' }),
          fact(`Select everyone heading to 104°F+ next hour.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Two cooling blankets are prepped and chilled.`, [], { tag: 'note' }),
          fact(`Select everyone heading to 104°F+ next hour.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Rising Fever Forecast',
      dispatch: 'Several patients have rising fevers — extend their steady hourly jump by one hour before seizures hit.',
      order: 'Continue each fever trend by 1 more hour and cool everyone who will hit 104°F or higher.',
      hint: 'Add each patient’s hourly climb once more to their latest temperature.',
      cards,
      evaluate(activeCards) {
        const list = collectFactsByTag(activeCards, 'temp');
        const targets = uniqueSortedIds(list.filter((x) => x.next >= 104).map((x) => x.patients[0]));
        const safe = list.filter((x) => x.next < 104).sort((x, y) => y.next - x.next).map((x) => x.patients[0]);
        return {
          targets,
          proof: `Extending each trend 1 hour ahead pushes ${targets.map((id) => `${pName(id)} (${list.find((x) => x.patients[0] === id).next}°F)`).join(' and ')} past 104°F.`,
          rival: buildRivalInfo(targets, safe, (id) => {
            const v = list.find((x) => x.patients[0] === id)?.next ?? 100;
            return `${pName(id)} projects to ${v}°F next hour (safely under 104°F).`;
          }),
        };
      },
    };
  },

  // #40 Proportional reasoning (Before · Atomic)
  'proportional-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Triage Desk', wingIndex: 0, label: 'Impact vs. Time 1',
        shown: [
          fact(`${pName(a)}: Urgency 6 · Takes 2 minutes to fix (3 pts/min).`, a, { tag: 'ratio', u: 6, m: 2 }),
          fact(`${pName(b)}: Urgency 6 · Takes 6 minutes to fix (1 pt/min).`, b, { tag: 'ratio', u: 6, m: 6 }),
        ],
        alt: [
          fact(`${pName(a)}: Urgency 6 · Takes 6 minutes to fix (1 pt/min).`, a, { tag: 'ratio', u: 6, m: 6 }),
          fact(`${pName(b)}: Urgency 6 · Takes 2 minutes to fix (3 pts/min).`, b, { tag: 'ratio', u: 6, m: 2 }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Triage Desk', wingIndex: 0, label: 'Impact vs. Time 2',
        shown: [
          fact(`${pName(c)}: Urgency 8 · Takes 4 minutes to fix (2 pts/min).`, c, { tag: 'ratio', u: 8, m: 4 }),
          fact(`${pName(d)}: Urgency 5 · Takes 5 minutes to fix (1 pt/min).`, d, { tag: 'ratio', u: 5, m: 5 }),
        ],
        alt: [
          fact(`${pName(c)}: Urgency 5 · Takes 5 minutes to fix (1 pt/min).`, c, { tag: 'ratio', u: 5, m: 5 }),
          fact(`${pName(d)}: Urgency 8 · Takes 4 minutes to fix (2 pts/min).`, d, { tag: 'ratio', u: 8, m: 4 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Triage Desk', wingIndex: 0, label: 'Impact vs. Time 3',
        shown: [
          fact(`${pName(e)}: Urgency 4 · Takes 4 minutes to fix (1 pt/min).`, e, { tag: 'ratio', u: 4, m: 4 }),
          fact(`${pName(f)}: Urgency 3 · Takes 6 minutes to fix (0.5 pts/min).`, f, { tag: 'ratio', u: 3, m: 6 }),
        ],
        alt: [
          fact(`${pName(e)}: Urgency 4 · Takes 4 minutes to fix (1 pt/min).`, e, { tag: 'ratio', u: 4, m: 4 }),
          fact(`${pName(f)}: Urgency 3 · Takes 6 minutes to fix (0.5 pts/min).`, f, { tag: 'ratio', u: 3, m: 6 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Fast-Track Rule', wingIndex: 1, label: 'Efficiency Cutoff',
        shown: [
          fact(`Fast-Track Rule: Urgency ÷ Minutes must be AT LEAST 2 points per minute.`, [], { tag: 'note' }),
          fact(`High urgency in fewer minutes saves the most people during a surge!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Fast-Track Rule: Urgency ÷ Minutes must be AT LEAST 2 points per minute.`, [], { tag: 'note' }),
          fact(`High urgency in fewer minutes saves the most people during a surge!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Fast-Track Rule', wingIndex: 1, label: 'Quick Check',
        shown: [
          fact(`Check if Urgency ≥ 2 × Minutes for each patient.`, [], { tag: 'note' }),
          fact(`Skip slow procedures that tie up the doctor for low return.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Check if Urgency ≥ 2 × Minutes for each patient.`, [], { tag: 'note' }),
          fact(`Skip slow procedures that tie up the doctor for low return.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Fast-Track Rule', wingIndex: 1, label: 'Rapid Team Ready',
        shown: [
          fact(`Rapid response team is standing by for high-yield patients.`, [], { tag: 'note' }),
          fact(`Select everyone hitting 2+ urgency points per minute.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Rapid response team is standing by for high-yield patients.`, [], { tag: 'note' }),
          fact(`Select everyone hitting 2+ urgency points per minute.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Fastest Life-Saving Return',
      dispatch: 'During a sudden rush, weigh urgency against how many minutes each fix takes.',
      order: 'Fast-track every patient delivering AT LEAST 2 urgency points per minute of doctor time (Urgency ÷ Minutes ≥ 2).',
      hint: 'Check whether each patient’s Urgency is at least double their Minutes.',
      cards,
      evaluate(activeCards) {
        const list = collectFactsByTag(activeCards, 'ratio');
        const targets = uniqueSortedIds(list.filter((x) => x.u >= 2 * x.m).map((x) => x.patients[0]));
        const slow = list.filter((x) => x.u < 2 * x.m).map((x) => x.patients[0]);
        return {
          targets,
          proof: `${formatList(targets)} deliver at least 2 urgency points per minute of care.`,
          rival: buildRivalInfo(targets, slow, (id) => {
            const r = list.find((x) => x.patients[0] === id);
            return `${pName(id)} only yields ${(r.u / r.m).toFixed(1)} pts/min (below the 2.0 threshold).`;
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
        index: 0, time: '01:00', wing: 'Fluid Sheet', wingIndex: 0, label: 'Fluid Balance 1',
        shown: [
          fact(`${pName(a)}: Lost 4 units blood · Received 2 units IV (+2 − 4 = −2 deficit!).`, a, { tag: 'net', inV: 2, outV: 4 }),
          fact(`${pName(b)}: Lost 2 units blood · Received 3 units IV (+3 − 2 = +1 surplus).`, b, { tag: 'net', inV: 3, outV: 2 }),
        ],
        alt: [
          fact(`${pName(a)}: Lost 2 units blood · Received 3 units IV (+3 − 2 = +1 surplus).`, a, { tag: 'net', inV: 3, outV: 2 }),
          fact(`${pName(b)}: Lost 4 units blood · Received 2 units IV (+2 − 4 = −2 deficit!).`, b, { tag: 'net', inV: 2, outV: 4 }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Fluid Sheet', wingIndex: 0, label: 'Fluid Balance 2',
        shown: [
          fact(`${pName(c)}: Lost 5 units blood · Received 3 units IV (+3 − 5 = −2 deficit!).`, c, { tag: 'net', inV: 3, outV: 5 }),
          fact(`${pName(d)}: Lost 3 units blood · Received 3 units IV (0 even).`, d, { tag: 'net', inV: 3, outV: 3 }),
        ],
        alt: [
          fact(`${pName(c)}: Lost 3 units blood · Received 3 units IV (0 even).`, c, { tag: 'net', inV: 3, outV: 3 }),
          fact(`${pName(d)}: Lost 5 units blood · Received 3 units IV (+3 − 5 = −2 deficit!).`, d, { tag: 'net', inV: 3, outV: 5 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Fluid Sheet', wingIndex: 0, label: 'Fluid Balance 3',
        shown: [
          fact(`${pName(e)}: Lost 1 unit blood · Received 2 units IV (+1 surplus).`, e, { tag: 'net', inV: 2, outV: 1 }),
          fact(`${pName(f)}: Lost 2 units blood · Received 2 units IV (0 even).`, f, { tag: 'net', inV: 2, outV: 2 }),
        ],
        alt: [
          fact(`${pName(e)}: Lost 1 unit blood · Received 2 units IV (+1 surplus).`, e, { tag: 'net', inV: 2, outV: 1 }),
          fact(`${pName(f)}: Lost 2 units blood · Received 2 units IV (0 even).`, f, { tag: 'net', inV: 2, outV: 2 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'IV Station', wingIndex: 1, label: 'Refill Rule',
        shown: [
          fact(`Net Balance = Fluids Received MINUS Blood Lost.`, [], { tag: 'note' }),
          fact(`Give extra IV bags ONLY to patients still in NEGATIVE deficit (Lost > Received).`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Net Balance = Fluids Received MINUS Blood Lost.`, [], { tag: 'note' }),
          fact(`Give extra IV bags ONLY to patients still in NEGATIVE deficit (Lost > Received).`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'IV Station', wingIndex: 1, label: 'Overload Warning',
        shown: [
          fact(`Never over-fill patients who are already even (0) or ahead (+1) — extra fluid floods their lungs!`, [], { tag: 'note' }),
          fact(`Check exact subtraction on each bay.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Never over-fill patients who are already even (0) or ahead (+1) — extra fluid floods their lungs!`, [], { tag: 'note' }),
          fact(`Check exact subtraction on each bay.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'IV Station', wingIndex: 1, label: 'Warm IV Bags',
        shown: [
          fact(`Warm replacement IV bags are ready for every negative-balance patient.`, [], { tag: 'note' }),
          fact(`Select everyone still behind on fluids.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Warm replacement IV bags are ready for every negative-balance patient.`, [], { tag: 'note' }),
          fact(`Select everyone still behind on fluids.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Exact Fluid & Blood Balance',
      dispatch: 'Giving too little fluid causes shock; giving too much floods the lungs — calculate exact net balance.',
      order: 'Hang emergency replacement IV bags ONLY for patients still in negative fluid deficit (Blood Lost > Fluids Received).',
      hint: 'Check which patients have a negative net balance (Lost more than Received).',
      cards,
      evaluate(activeCards) {
        const list = collectFactsByTag(activeCards, 'net');
        const targets = uniqueSortedIds(list.filter((x) => x.inV - x.outV < 0).map((x) => x.patients[0]));
        const ok = list.filter((x) => x.inV - x.outV >= 0).map((x) => x.patients[0]);
        return {
          targets,
          proof: `${formatList(targets)} have negative net fluid balances and still need immediate volume replacement.`,
          rival: buildRivalInfo(targets, ok, (id) => `${pName(id)} is already caught up (0 or positive fluid balance).`),
        };
      },
    };
  },
};
