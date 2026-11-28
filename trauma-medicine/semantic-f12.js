// Deep Plain-English Clinical Reasoning Engines — Families 1 & 2 (#1–#20)
// Every case weaves real interlocking evidence across ALL 6 cards (zero filler, zero pre-computed answers,
// zero single-card giveaways, zero medical jargon, synchronized left-wall bayLabels).

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

export const SEMANTIC_F12 = {
  // =========================================================================
  // FAMILY 1: DIAGNOSTIC & INVESTIGATIVE REASONING (#1–#10)
  // =========================================================================

  // #1 Differential diagnosis (Inside · Composite)
  'differential-diagnosis': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Trauma Intake', wingIndex: 0, label: 'Sudden Chest Crisis',
        shown: [
          fact(`${pName(a)}, ${pName(b)}, and ${pName(c)} all arrived gasping with sharp chest pain.`, [a, b, c], { tag: 'sym' }),
          fact(`${pName(d)} also arrived short of breath after climbing four flights of stairs.`, d, { tag: 'sym' }),
        ],
        alt: [
          fact(`${pName(b)}, ${pName(c)}, and ${pName(d)} all arrived gasping with sharp chest pain.`, [b, c, d], { tag: 'sym' }),
          fact(`${pName(a)} arrived with a sore wrist and normal steady breathing.`, a, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Lung Exam', wingIndex: 1, label: 'Stethoscope & Oxygen',
        shown: [
          fact(`${pName(a)} has clear breath sounds on both sides, yet oxygen dropped to 84%.`, a, { tag: 'clear_low_o2' }),
          fact(`${pName(b)} has a completely silent right lung after a hard rib hit (collapsed lung).`, b, { tag: 'collapsed' }),
        ],
        alt: [
          fact(`${pName(c)} has clear breath sounds on both sides, yet oxygen dropped to 84%.`, c, { tag: 'clear_low_o2' }),
          fact(`${pName(b)} has a completely silent right lung after a hard rib hit (collapsed lung).`, b, { tag: 'collapsed' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Trauma Intake', wingIndex: 0, label: 'Leg & Travel Check',
        shown: [
          fact(`${pName(a)} just flew 14 hours yesterday and has one hot, swollen calf.`, a, { tag: 'clot_risk' }),
          fact(`${pName(c)} has clear lungs, normal 99% oxygen, and tingling fingers from panic.`, c, { tag: 'panic' }),
        ],
        alt: [
          fact(`${pName(c)} just flew 14 hours yesterday and has one hot, swollen calf.`, c, { tag: 'clot_risk' }),
          fact(`${pName(a)} has normal 99% oxygen and no calf swelling.`, a, { tag: 'panic' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Lung Exam', wingIndex: 1, label: 'Heart & Rib Clues',
        shown: [
          fact(`${pName(d)} has wet crackling lungs and swollen ankles on BOTH legs (fluid buildup).`, d, { tag: 'fluid' }),
          fact(`${pName(e)} has chest tightness that vanished completely after sitting calmly for 5 minutes.`, e, { tag: 'safe', calm: true }),
        ],
        alt: [
          fact(`${pName(d)} has wet crackling lungs and swollen ankles on BOTH legs (fluid buildup).`, d, { tag: 'fluid' }),
          fact(`${pName(b)} has no leg swelling and no recent flights.`, b, { tag: 'collapsed' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Trauma Intake', wingIndex: 0, label: 'Clot Signature Guide',
        shown: [
          fact(`A trapped lung blood clot leaves breath sounds clear on BOTH sides while oxygen drops.`, [], { tag: 'rule' }),
          fact(`Unlike fluid buildup (both ankles swollen), a leg clot swells ONE calf after long immobility.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Lung Exam', wingIndex: 1, label: 'Blood & Chest Scan',
        shown: [
          fact(`${pName(b)}'s quick chest scan confirms trapped air outside the lung — needs a chest tube, NOT clot drugs.`, b, { tag: 'collapsed' }),
          fact(`${pName(f)} came in for a minor cut on the hand; chest exam is completely normal.`, f, { tag: 'safe', calm: true }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Four Gasping Chests',
      dispatch: 'Four patients arrived gasping with chest pain — each has a DIFFERENT hidden cause, and clot drugs will kill the wrong patient.',
      order: 'Give the emergency clot-dissolver ONLY to the patient with a trapped lung blood clot.',
      hint: 'Separate clear-lung low oxygen + one-sided leg clot risk from collapsed lung, fluid buildup, and panic.',
      bayDefaultLabel: 'Chest Pain Eval',
      bayLabels: { [e]: 'Minor · Stable', [f]: 'Minor · Stable' },
      cards,
      evaluate(activeCards) {
        const clearLow = tagSet(activeCards, 'clear_low_o2');
        const risk = tagSet(activeCards, 'clot_risk');
        const targets = uniqueSortedIds([...clearLow].filter((id) => risk.has(id)));
        const rivals = [...tagSet(activeCards, 'collapsed'), ...tagSet(activeCards, 'fluid'), ...tagSet(activeCards, 'panic')];
        return {
          targets,
          proof: `Only ${formatList(targets)} fit a trapped lung clot: clear lungs on both sides with plunging oxygen (84%) plus a hot swollen calf after a 14-hour flight.`,
          rival: buildRivalInfo(targets, rivals, (id) =>
            `${pName(id)}'s breathlessness comes from a different mechanism (collapsed lung, two-sided fluid buildup, or panic), where clot drugs would be dangerous.`
          ),
        };
      },
    };
  },

  // #2 Abductive reasoning (Inside · Atomic)
  'abductive-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'ER Bay A', wingIndex: 0, label: 'Scene Dispatch',
        shown: [
          fact(`${pName(a)} was found dizzy inside a closed garage with a space heater running.`, a, { tag: 'garage' }),
          fact(`${pName(b)} collapsed on an outdoor soccer field in cool fresh air.`, b, { tag: 'outdoor' }),
        ],
        alt: [
          fact(`${pName(c)} was found dizzy inside a closed garage with a space heater running.`, c, { tag: 'garage' }),
          fact(`${pName(a)} collapsed on an outdoor soccer field in cool fresh air.`, a, { tag: 'outdoor' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Monitor Desk', wingIndex: 1, label: 'Finger Oxygen Trick',
        shown: [
          fact(`${pName(a)}'s finger oxygen clip reads a "normal" 99% even while gasping and confused.`, a, { tag: 'fake99' }),
          fact(`${pName(c)}'s finger oxygen clip dropped cleanly to 83% alongside loud asthma wheezing.`, c, { tag: 'asthma' }),
        ],
        alt: [
          fact(`${pName(c)}'s finger oxygen clip reads a "normal" 99% even while gasping and confused.`, c, { tag: 'fake99' }),
          fact(`${pName(a)}'s finger oxygen clip dropped cleanly to 83% alongside loud asthma wheezing.`, a, { tag: 'asthma' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'ER Bay A', wingIndex: 0, label: 'Face & Headache',
        shown: [
          fact(`${pName(a)} has a throbbing headache, nausea, and strangely bright pink cheeks.`, a, { tag: 'pink' }),
          fact(`${pName(d)} has a throbbing headache and stiff neck with a 103°F fever.`, d, { tag: 'fever' }),
        ],
        alt: [
          fact(`${pName(c)} has a throbbing headache, nausea, and strangely bright pink cheeks.`, c, { tag: 'pink' }),
          fact(`${pName(d)} has a throbbing headache and stiff neck with a 103°F fever.`, d, { tag: 'fever' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Monitor Desk', wingIndex: 1, label: 'Companion Report',
        shown: [
          fact(`${pName(a)}'s dog also passed out in the same closed room before paramedics arrived.`, a, { tag: 'shared' }),
          fact(`${pName(b)}'s teammates on the soccer field feel completely fine; ${pName(b)} just skipped breakfast.`, b, { tag: 'outdoor' }),
        ],
        alt: [
          fact(`${pName(c)}'s dog also passed out in the same closed room before paramedics arrived.`, c, { tag: 'shared' }),
          fact(`${pName(b)}'s teammates on the soccer field feel completely fine; ${pName(b)} just skipped breakfast.`, b, { tag: 'outdoor' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'ER Bay A', wingIndex: 0, label: 'Poison Clue Note',
        shown: [
          fact(`Invisible exhaust gas tricks standard finger oxygen clips into showing 99% while starving the brain.`, [], { tag: 'rule' }),
          fact(`It hits everyone breathing the same closed-room air and leaves cheeks bright pink.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Monitor Desk', wingIndex: 1, label: 'Other Arrivals',
        shown: [
          fact(`${pName(e)} was gardening outside and got stung on the arm (mild local itch only).`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)} twisted an ankle stepping off a bus; mind is sharp and clear.`, f, { tag: 'safe', calm: true }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'The Deceptive 99% Reading',
      dispatch: 'One patient has invisible exhaust-gas poisoning — ordinary clues look normal until you connect ALL the strange pieces together.',
      order: 'Rush the single patient whose scattered clues all point to hidden carbon monoxide poisoning into the pure-oxygen chamber.',
      hint: 'Find the one patient whose scene, deceptive monitor, physical signs, and shared exposure all click into one explanation.',
      bayDefaultLabel: 'Mystery Collapse',
      bayLabels: { [e]: 'Minor · Stable', [f]: 'Minor · Stable' },
      cards,
      evaluate(activeCards) {
        const g = tagSet(activeCards, 'garage');
        const f99 = tagSet(activeCards, 'fake99');
        const pk = tagSet(activeCards, 'pink');
        const targets = uniqueSortedIds([...g].filter((id) => f99.has(id) && pk.has(id)));
        const rivals = [...tagSet(activeCards, 'asthma'), ...tagSet(activeCards, 'fever'), ...tagSet(activeCards, 'outdoor')];
        return {
          targets,
          proof: `Hidden exhaust gas is the single best explanation uniting ALL of ${formatList(targets)}'s clues: closed heated garage, dog passing out too, bright pink cheeks, and a fooled 99% finger clip despite confusion.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)}'s symptoms fit a completely different story (asthma, infection fever, or low blood sugar outdoors).`),
        };
      },
    };
  },

  // #3 Eliminative reasoning (Before · Atomic)
  'eliminative-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Tox Desk', wingIndex: 0, label: 'Suspect Pool',
        shown: [
          fact(`Six dinner guests arrived with sudden stomach cramps: ${pName(a)}, ${pName(b)}, ${pName(c)}, ${pName(d)}, ${pName(e)}, and ${pName(f)}.`, [a, b, c, d, e, f], { tag: 'pool' }),
          fact(`Lab confirms ONE guest ingested deadly mushroom toxin (slow onset, attacks liver only).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Lab Bench', wingIndex: 1, label: 'Liver Panel 1',
        shown: [
          fact(`${pName(b)}'s liver blood panel is spotless and cramps stopped after drinking water.`, b, { tag: 'out' }),
          fact(`${pName(c)} only ate store-bought sealed crackers — zero mushrooms touched their plate.`, c, { tag: 'out' }),
        ],
        alt: [
          fact(`${pName(a)}'s liver blood panel is spotless and cramps stopped after drinking water.`, a, { tag: 'out' }),
          fact(`${pName(c)} only ate store-bought sealed crackers — zero mushrooms touched their plate.`, c, { tag: 'out' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Tox Desk', wingIndex: 0, label: 'Symptom Timing',
        shown: [
          fact(`${pName(d)} started vomiting 15 minutes after eating — way too fast for slow mushroom toxin.`, d, { tag: 'out' }),
          fact(`Deadly mushroom toxin NEVER hits in 15 minutes; symptoms begin 6–12 hours after the meal.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Lab Bench', wingIndex: 1, label: 'Urine Toxin Screen',
        shown: [
          fact(`${pName(e)}'s rapid urine test came back strictly NEGATIVE for mushroom toxin.`, e, { tag: 'out' }),
          fact(`${pName(f)}'s cramps traced to spoiled dairy; liver enzymes are completely normal.`, f, { tag: 'out' }),
        ],
        alt: [
          fact(`${pName(e)}'s rapid urine test came back strictly NEGATIVE for mushroom toxin.`, e, { tag: 'out' }),
          fact(`${pName(b)}'s cramps traced to spoiled dairy; liver enzymes are completely normal.`, b, { tag: 'out' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Tox Desk', wingIndex: 0, label: 'Delayed Onset Note',
        shown: [
          fact(`${pName(a)} ate wild forest stew 9 hours ago and still has pending liver-protection orders.`, a, { tag: 'cand' }),
          fact(`${pName(b)} arrived 20 minutes after ${pName(a)} from the same dinner table.`, [b, a], { tag: 'cand' }),
        ],
        alt: [
          fact(`${pName(f)} ate wild forest stew 9 hours ago and still has pending liver-protection orders.`, f, { tag: 'cand' }),
          fact(`${pName(b)} arrived 20 minutes after ${pName(f)} from the same dinner table.`, [b, f], { tag: 'cand' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Lab Bench', wingIndex: 1, label: 'Antidote Limit',
        shown: [
          fact(`Hospital pharmacy holds ONE intravenous liver-shield kit right now.`, [], { tag: 'rule' }),
          fact(`Cross off every guest ruled out by timing, diet, or clean labs to isolate the sole survivor left.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Wild Mushroom Outbreak',
      dispatch: 'Six dinner guests came in with stomach cramps — five are ruled out by diet, timing, or clean tests. One still faces silent liver failure.',
      order: 'Give the sole liver-shield antidote to the ONE guest who has NOT been ruled out.',
      hint: 'Systematically cross off each cleared guest across the lab and timing reports.',
      bayDefaultLabel: 'Toxin Screen',
      cards,
      evaluate(activeCards) {
        const pool = [a, b, c, d, e, f];
        const ruledOut = tagSet(activeCards, 'out');
        const targets = uniqueSortedIds(pool.filter((id) => !ruledOut.has(id)));
        const rivals = pool.filter((id) => ruledOut.has(id));
        return {
          targets,
          proof: `Eliminating all five ruled-out guests leaves ONLY ${formatList(targets)} uneliminated for delayed mushroom liver toxicity.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} was explicitly eliminated by timing, diet, or clean lab screens.`),
        };
      },
    };
  },

  // #4 Hypothetico-deductive reasoning (Inside · Composite)
  'hypothetico-deductive': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Trauma Lead', wingIndex: 0, label: 'Working Hypothesis',
        shown: [
          fact(`Suspected injury: RUPTURED SPLEEN after a high-speed bicycle handlebar strike.`, [], { tag: 'rule' }),
          fact(`If a spleen ruptured, we MUST see ALL THREE: left-rib bruise + pain shooting to the left shoulder + free fluid on belly scan.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Exam Bay', wingIndex: 1, label: 'Prediction 1: Left-Rib Mark',
        shown: [
          fact(`${pName(a)}, ${pName(b)}, and ${pName(c)} all have dark handlebar bruises under the left ribs.`, [a, b, c], { tag: 'p1' }),
          fact(`${pName(d)} struck the RIGHT knee only; torso is unmarked.`, d, { tag: 'safe', calm: true }),
        ],
        alt: [
          fact(`${pName(b)}, ${pName(c)}, and ${pName(e)} all have dark handlebar bruises under the left ribs.`, [b, c, e], { tag: 'p1' }),
          fact(`${pName(d)} struck the RIGHT knee only; torso is unmarked.`, d, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Exam Bay', wingIndex: 1, label: 'Prediction 2: Left Shoulder',
        shown: [
          fact(`${pName(a)} and ${pName(c)} report bizarre sharp pain shooting up into the left shoulder when lying flat.`, [a, c], { tag: 'p2' }),
          fact(`${pName(b)} has sore ribs locally, zero shoulder pain even when lying flat.`, b, { tag: 'fail' }),
        ],
        alt: [
          fact(`${pName(c)} and ${pName(e)} report bizarre sharp pain shooting up into the left shoulder when lying flat.`, [c, e], { tag: 'p2' }),
          fact(`${pName(b)} has sore ribs locally, zero shoulder pain even when lying flat.`, b, { tag: 'fail' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Ultrasound', wingIndex: 0, label: 'Prediction 3: Belly Scan',
        shown: [
          fact(`${pName(a)}'s bedside belly ultrasound shows dark pools of free blood around the spleen.`, a, { tag: 'p3' }),
          fact(`${pName(c)}'s bedside belly ultrasound is bone-dry — zero internal bleeding.`, c, { tag: 'fail' }),
        ],
        alt: [
          fact(`${pName(e)}'s bedside belly ultrasound shows dark pools of free blood around the spleen.`, e, { tag: 'p3' }),
          fact(`${pName(c)}'s bedside belly ultrasound is bone-dry — zero internal bleeding.`, c, { tag: 'fail' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Ultrasound', wingIndex: 0, label: 'Why Shoulder Hurts',
        shown: [
          fact(`Blood pooling under the left diaphragm irritates a nerve that refers pain straight to the left shoulder.`, [], { tag: 'rule' }),
          fact(`${pName(e)} also had a mild bike spill; waiting for bruise check if needed.`, e, { tag: 'p3_check' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Exam Bay', wingIndex: 1, label: 'Minor Arrivals',
        shown: [
          fact(`${pName(f)} scraped palms on gravel — abdomen soft, ultrasound dry.`, f, { tag: 'safe', calm: true }),
          fact(`A missing predicted sign disproves ruptured spleen; rush ONLY the confirmed match to OR.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Handlebar Crash Test',
      dispatch: 'Multiple cyclists crashed into handlebars — test all three predicted signs of a ruptured spleen before opening the operating room.',
      order: 'Send ONLY the patient whose exam and scan confirm ALL THREE predictions of a ruptured spleen to emergency surgery.',
      hint: 'Check Prediction 1 (left ribs), Prediction 2 (left shoulder pain), and Prediction 3 (free fluid on scan).',
      bayDefaultLabel: 'Belly Trauma',
      bayLabels: { [d]: 'Minor · Stable', [f]: 'Minor · Stable' },
      cards,
      evaluate(activeCards) {
        const p1 = tagSet(activeCards, 'p1');
        const p2 = tagSet(activeCards, 'p2');
        const p3 = tagSet(activeCards, 'p3');
        const targets = uniqueSortedIds([...p1].filter((id) => p2.has(id) && p3.has(id)));
        const rivals = [...p1, ...p2].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Only ${formatList(targets)} confirmed all three testable predictions of a ruptured spleen (left-rib bruise, referred left-shoulder pain, and free blood on ultrasound).`,
          rival: buildRivalInfo(targets, rivals, (id) =>
            p2.has(id)
              ? `${pName(id)} had rib bruise and shoulder pain, but a bone-dry ultrasound disproved internal bleeding.`
              : `${pName(id)} failed the referred shoulder pain and ultrasound predictions.`
          ),
        };
      },
    };
  },

  // #5 Causal reasoning (Inside · Atomic)
  'causal-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Pharmacy', wingIndex: 0, label: 'Antibiotic Drip Start',
        shown: [
          fact(`New antibiotic Batch #9 was started at 01:00 for ${pName(a)}, ${pName(b)}, and ${pName(c)}.`, [a, b, c], { tag: 'got_drip' }),
          fact(`${pName(d)} never received Batch #9 — they are on plain saltwater fluids only.`, d, { tag: 'no_drip' }),
        ],
        alt: [
          fact(`New antibiotic Batch #9 was started at 01:00 for ${pName(b)}, ${pName(c)}, and ${pName(d)}.`, [b, c, d], { tag: 'got_drip' }),
          fact(`${pName(a)} never received Batch #9 — they are on plain saltwater fluids only.`, a, { tag: 'no_drip' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Bedside Log', wingIndex: 1, label: 'Before 01:00 Baseline',
        shown: [
          fact(`At 00:50 (BEFORE the drip): ${pName(a)}'s blood pressure was rock-steady at 122/78.`, a, { tag: 'stable_before' }),
          fact(`At 00:50 (BEFORE the drip): ${pName(b)}'s blood pressure was ALREADY crashing down to 84/50.`, b, { tag: 'already_low' }),
        ],
        alt: [
          fact(`At 00:50 (BEFORE the drip): ${pName(c)}'s blood pressure was rock-steady at 122/78.`, c, { tag: 'stable_before' }),
          fact(`At 00:50 (BEFORE the drip): ${pName(b)}'s blood pressure was ALREADY crashing down to 84/50.`, b, { tag: 'already_low' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Bedside Log', wingIndex: 1, label: 'After 01:00 Reaction',
        shown: [
          fact(`At 01:04 (4 min AFTER drip): ${pName(a)}'s blood pressure plunged from 122 → 74 with red flushing.`, a, { tag: 'crash_after' }),
          fact(`At 01:04: ${pName(c)} stayed completely steady at 118/74 with zero rash.`, c, { tag: 'fine_after' }),
        ],
        alt: [
          fact(`At 01:04 (4 min AFTER drip): ${pName(c)}'s blood pressure plunged from 122 → 74 with red flushing.`, c, { tag: 'crash_after' }),
          fact(`At 01:04: ${pName(a)} stayed completely steady at 118/74 with zero rash.`, a, { tag: 'fine_after' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Pharmacy', wingIndex: 0, label: 'Pause-and-Watch Test',
        shown: [
          fact(`When nurse paused ${pName(a)}'s drip for 3 minutes, pressure started climbing back up immediately.`, a, { tag: 'rebound' }),
          fact(`When nurse paused ${pName(b)}'s drip, ${pName(b)}'s pressure kept dropping anyway (hidden bleeding).`, b, { tag: 'already_low' }),
        ],
        alt: [
          fact(`When nurse paused ${pName(c)}'s drip for 3 minutes, pressure started climbing back up immediately.`, c, { tag: 'rebound' }),
          fact(`When nurse paused ${pName(b)}'s drip, ${pName(b)}'s pressure kept dropping anyway (hidden bleeding).`, b, { tag: 'already_low' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Bedside Log', wingIndex: 1, label: 'Other Crash Note',
        shown: [
          fact(`${pName(d)} fainted at 01:05 right after standing up too fast for the bathroom (zero antibiotic given).`, d, { tag: 'no_drip' }),
          fact(`${pName(e)} is sleeping comfortably after minor stitches; no IV drip running.`, e, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Pharmacy', wingIndex: 0, label: 'Cause vs Coincidence',
        shown: [
          fact(`A true drug reaction happens AFTER the drip starts — and improves when the drip stops.`, [], { tag: 'rule' }),
          fact(`${pName(f)} finished a completely different antibiotic yesterday with zero issues.`, f, { tag: 'safe', calm: true }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Reaction or Coincidence?',
      dispatch: 'Three patients dipped right around 01:00 when Antibiotic Batch #9 began — separate true drug cause from mere bad timing.',
      order: 'Give the emergency anti-allergy rescue ONLY to the patient whose crash was CAUSED by the antibiotic drip.',
      hint: 'Check what happened BEFORE 01:00, AFTER 01:00, and when the drip was paused.',
      bayDefaultLabel: 'BP Drop Eval',
      bayLabels: { [e]: 'Minor · Stable', [f]: 'Minor · Stable' },
      cards,
      evaluate(activeCards) {
        const drip = tagSet(activeCards, 'got_drip');
        const stable = tagSet(activeCards, 'stable_before');
        const crash = tagSet(activeCards, 'crash_after');
        const reb = tagSet(activeCards, 'rebound');
        const targets = uniqueSortedIds([...drip].filter((id) => stable.has(id) && crash.has(id) && reb.has(id)));
        const rivals = [...tagSet(activeCards, 'already_low'), ...tagSet(activeCards, 'no_drip')];
        return {
          targets,
          proof: `${formatList(targets)} were completely stable before 01:00, crashed 4 minutes after Batch #9 started, and rebounded when it paused — proving a direct causal drug reaction.`,
          rival: buildRivalInfo(targets, rivals, (id) =>
            `${pName(id)} was either already crashing before 01:00 or never even received the antibiotic (mere coincidence).`
          ),
        };
      },
    };
  },

  // #6 Root-cause analysis (After · Composite)
  'root-cause-analysis': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Quality Audit', wingIndex: 0, label: 'Surface Alarms',
        shown: [
          fact(`Four recovery patients spiked sudden chills and low blood pressure tonight: ${pName(a)}, ${pName(b)}, ${pName(c)}, and ${pName(d)}.`, [a, b, c, d], { tag: 'alarm' }),
          fact(`Treating chills one by one failed — trace back to the shared upstream source.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Supply Log', wingIndex: 1, label: 'IV Bag Batches',
        shown: [
          fact(`${pName(a)} and ${pName(b)} both received IV saline from Cooling Cart #4 (Lot K-88).`, [a, b], { tag: 'lot88' }),
          fact(`${pName(c)} and ${pName(d)} received IV saline from sterile Main Vault (Lot M-12).`, [c, d], { tag: 'clean_lot' }),
        ],
        alt: [
          fact(`${pName(b)} and ${pName(c)} both received IV saline from Cooling Cart #4 (Lot K-88).`, [b, c], { tag: 'lot88' }),
          fact(`${pName(a)} and ${pName(d)} received IV saline from sterile Main Vault (Lot M-12).`, [a, d], { tag: 'clean_lot' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Quality Audit', wingIndex: 0, label: 'Lab Culture Result',
        shown: [
          fact(`Swab of Cooling Cart #4 (Lot K-88) grew heavy bacterial contamination from a cracked seal!`, [], { tag: 'bad_lot' }),
          fact(`Main Vault (Lot M-12) tested 100% sterile across all 20 sample bags.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Supply Log', wingIndex: 1, label: 'Other Sources Checked',
        shown: [
          fact(`${pName(c)}'s chills came from a known kidney infection present BEFORE hospital arrival.`, c, { tag: 'other_cause' }),
          fact(`${pName(d)} only shivered because the AC vent blew cold air directly onto their blanket.`, d, { tag: 'other_cause' }),
        ],
        alt: [
          fact(`${pName(a)}'s chills came from a known kidney infection present BEFORE hospital arrival.`, a, { tag: 'other_cause' }),
          fact(`${pName(d)} only shivered because the AC vent blew cold air directly onto their blanket.`, d, { tag: 'other_cause' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Quality Audit', wingIndex: 0, label: 'Line Swap Rule',
        shown: [
          fact(`Every patient hooked up to the contaminated Lot K-88 bag MUST have their IV line pulled immediately.`, [], { tag: 'rule' }),
          fact(`${pName(e)} drank tap water only — zero IV lines placed.`, e, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Supply Log', wingIndex: 1, label: 'Ward Check',
        shown: [
          fact(`${pName(f)} had a Band-Aid change and is cleared to go home.`, f, { tag: 'safe', calm: true }),
          fact(`Pulling the root source stops the infection; giving extra blankets will NOT fix Lot K-88.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Ward Chills Outbreak',
      dispatch: 'Four patients suddenly started shaking with chills — find the TWO linked to the hidden contaminated IV source, not unrelated causes.',
      order: 'Pull IV lines and start emergency antibiotics for EVERY patient exposed to the contaminated root source.',
      hint: 'Trace the lab swab back to the exact IV batch lot shared by two patients.',
      bayDefaultLabel: 'Post-Op Chills',
      bayLabels: { [e]: 'Minor · Stable', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const exposed = factsByTag(activeCards, 'lot88').flatMap((f) => f.patients);
        const targets = uniqueSortedIds(exposed);
        const rivals = [...tagSet(activeCards, 'clean_lot')].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Tracing past the surface chills reveals the shared root cause: ${formatList(targets)} were both connected to contaminated IV Lot K-88.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} received sterile Lot M-12; their chills came from an unrelated cause.`),
        };
      },
    };
  },

  // #7 Mechanistic reasoning (Inside · Composite)
  'mechanistic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Shock Bay', wingIndex: 0, label: 'Plumbing Model',
        shown: [
          fact(`Blood pressure fails for 3 physical reasons: EMPTY TANK (bleeding), BROKEN PUMP (weak heart), or WIDE-OPEN PIPES (allergy/infection).`, [], { tag: 'rule' }),
          fact(`Giving extra IV fluid helps an EMPTY TANK, but DROWNS a BROKEN PUMP (fluid backs up into the lungs!).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Bedside Exam', wingIndex: 1, label: 'Neck Veins & Lungs',
        shown: [
          fact(`${pName(a)}: BP 78/50, bulging neck veins, wet bubbling sounds in both lungs (backed-up fluid!).`, a, { tag: 'pump' }),
          fact(`${pName(b)}: BP 76/48, completely flat neck veins, dry clear lungs, soaking-wet bandage.`, b, { tag: 'empty' }),
        ],
        alt: [
          fact(`${pName(c)}: BP 78/50, bulging neck veins, wet bubbling sounds in both lungs (backed-up fluid!).`, c, { tag: 'pump' }),
          fact(`${pName(b)}: BP 76/48, completely flat neck veins, dry clear lungs, soaking-wet bandage.`, b, { tag: 'empty' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Shock Bay', wingIndex: 0, label: 'Skin & Warmth Check',
        shown: [
          fact(`${pName(c)}: BP 80/46, warm flushed red skin, flat neck veins, dry lungs (wide-open pipes).`, c, { tag: 'pipes' }),
          fact(`${pName(a)}: cold clammy hands and feet because the weak heart cannot push blood forward.`, a, { tag: 'pump_cold' }),
        ],
        alt: [
          fact(`${pName(a)}: BP 80/46, warm flushed red skin, flat neck veins, dry lungs (wide-open pipes).`, a, { tag: 'pipes' }),
          fact(`${pName(c)}: cold clammy hands and feet because the weak heart cannot push blood forward.`, c, { tag: 'pump_cold' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Bedside Exam', wingIndex: 1, label: 'Fluid Trial Result',
        shown: [
          fact(`Nurse gave a tiny 250 mL test fluid bag to ${pName(b)} — blood pressure rose immediately!`, b, { tag: 'empty' }),
          fact(`${pName(d)} has BP 82/52 after running a hot marathon without water; veins flat, lungs dry.`, d, { tag: 'empty' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Shock Bay', wingIndex: 0, label: 'Heart Pump Scan',
        shown: [
          fact(`Bedside echo shows ${pName(a)}'s heart chamber is barely squeezing (pump failure).`, a, { tag: 'pump_echo' }),
          fact(`${pName(e)} has normal BP 120/76 and a sprained finger.`, e, { tag: 'safe', calm: true }),
        ],
        alt: [
          fact(`Bedside echo shows ${pName(c)}'s heart chamber is barely squeezing (pump failure).`, c, { tag: 'pump_echo' }),
          fact(`${pName(e)} has normal BP 120/76 and a sprained finger.`, e, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Bedside Exam', wingIndex: 1, label: 'Fluid-Stop Alert',
        shown: [
          fact(`Standard trauma protocol pours 2 liters of IV fluid automatically — lethal if the pump is broken.`, [], { tag: 'rule' }),
          fact(`${pName(f)} is waiting calmly for a routine tetanus booster.`, f, { tag: 'safe', calm: true }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Pump, Pipes, or Tank?',
      dispatch: 'Four patients have dangerously low blood pressure — dumping IV fluids into a failing heart pump will flood their lungs.',
      order: 'STOP the IV fluid drip and start heart-pump support for the SINGLE patient in pump failure.',
      hint: 'Trace the plumbing clues: bulging neck veins + wet lungs + weak squeeze means fluid is backing up behind a failing pump.',
      bayDefaultLabel: 'Low BP Shock',
      bayLabels: { [e]: 'Minor · Stable', [f]: 'Minor · Stable' },
      cards,
      evaluate(activeCards) {
        const pump = tagSet(activeCards, 'pump');
        const echo = tagSet(activeCards, 'pump_echo');
        const targets = uniqueSortedIds([...pump].filter((id) => echo.has(id)));
        const rivals = [...tagSet(activeCards, 'empty'), ...tagSet(activeCards, 'pipes')];
        return {
          targets,
          proof: `Mechanistically, ${formatList(targets)}'s bulging neck veins, wet lungs, and weak echo squeeze prove a failing heart pump — adding fluids would drown the lungs.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} has flat neck veins and dry lungs (empty tank or wide-open pipes), so they actually NEED fluids.`),
        };
      },
    };
  },

  // #8 Forensic reasoning (After · Composite)
  'forensic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Autopsy Lab', wingIndex: 0, label: 'Crash Reconstruction',
        shown: [
          fact(`Four car-crash passengers all claim "I was NOT driving!" Police need the true driver from physical body clues.`, [], { tag: 'rule' }),
          fact(`In a left-hand drive car, the DRIVER'S seatbelt runs from LEFT shoulder down to RIGHT hip.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Body Exam', wingIndex: 1, label: 'Seatbelt Bruise Angle',
        shown: [
          fact(`${pName(a)} has a diagonal strap bruise from LEFT shoulder down to RIGHT hip.`, a, { tag: 'left_belt' }),
          fact(`${pName(b)} has a diagonal strap bruise from RIGHT shoulder down to LEFT hip (passenger side).`, b, { tag: 'pass_belt' }),
        ],
        alt: [
          fact(`${pName(c)} has a diagonal strap bruise from LEFT shoulder down to RIGHT hip.`, c, { tag: 'left_belt' }),
          fact(`${pName(b)} has a diagonal strap bruise from RIGHT shoulder down to LEFT hip (passenger side).`, b, { tag: 'pass_belt' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Autopsy Lab', wingIndex: 0, label: 'Steering Wheel Trace',
        shown: [
          fact(`A circular steering-wheel imprint bruised the lower chest of BOTH ${pName(a)} and ${pName(c)}? Wait — only the front-left seat has a steering wheel!`, [a, c], { tag: 'chest_check' }),
          fact(`Forensic photo confirms a clean steering-wheel arc ONLY on ${pName(a)}'s chest; ${pName(c)}'s bruise is straight from a back-seat bench.`, a, { tag: 'wheel' }),
        ],
        alt: [
          fact(`Forensic photo confirms a clean steering-wheel arc ONLY on ${pName(c)}'s chest; ${pName(a)}'s bruise is straight from a back-seat bench.`, c, { tag: 'wheel' }),
          fact(`Only the front-left seat faces the steering wheel.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Body Exam', wingIndex: 1, label: 'Pedal & Glass Clues',
        shown: [
          fact(`${pName(a)}'s RIGHT shoe sole has the rubber brake-pedal grid stamped deep into the arch.`, a, { tag: 'pedal' }),
          fact(`${pName(d)} has shattered side-window glass embedded ONLY in the RIGHT cheek (passenger window).`, d, { tag: 'right_glass' }),
        ],
        alt: [
          fact(`${pName(c)}'s RIGHT shoe sole has the rubber brake-pedal grid stamped deep into the arch.`, c, { tag: 'pedal' }),
          fact(`${pName(d)} has shattered side-window glass embedded ONLY in the RIGHT cheek (passenger window).`, d, { tag: 'right_glass' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Autopsy Lab', wingIndex: 0, label: 'Airbag Powder Swab',
        shown: [
          fact(`${pName(b)} has front-passenger dashboard burn marks on both knees.`, b, { tag: 'pass_belt' }),
          fact(`${pName(c)}'s left-shoulder bruise? Remember the back-left seat ALSO wears a left-to-right belt!`, c, { tag: 'back_note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Body Exam', wingIndex: 1, label: 'Unrelated Bays',
        shown: [
          fact(`${pName(e)} was a pedestrian witness untouched by the vehicle.`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)} arrived from a separate kitchen-knife cut at home.`, f, { tag: 'safe', calm: true }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Who Was Behind the Wheel?',
      dispatch: 'Four crash survivors each deny driving — reconstruct seat positions strictly from physical injuries, pedal marks, and belt angles.',
      order: 'Identify the ONE patient whose physical injuries prove they were in the driver seat.',
      hint: 'Combine belt direction, steering-wheel chest mark, and right-foot brake pedal imprint.',
      bayDefaultLabel: 'Forensic Exam',
      bayLabels: { [e]: 'Witness · Stable', [f]: 'Minor · Stable' },
      cards,
      evaluate(activeCards) {
        const belt = tagSet(activeCards, 'left_belt');
        const wheel = tagSet(activeCards, 'wheel');
        const pedal = tagSet(activeCards, 'pedal');
        const targets = uniqueSortedIds([...belt].filter((id) => wheel.has(id) && pedal.has(id)));
        const rivals = [a, b, c, d].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Physical evidence converges on ${formatList(targets)}: left-to-right driver seatbelt angle, circular steering-wheel chest bruise, and brake-pedal grid on the right shoe.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)}'s bruises match a passenger or back-seat position, lacking the steering wheel and brake-pedal marks.`),
        };
      },
    };
  },

  // #9 Evidential reasoning (Inside · Atomic)
  'evidential-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Evidence Audit', wingIndex: 0, label: 'Reliability Scale',
        shown: [
          fact(`HIGH reliability: verified lab tests, direct doctor scans, signed wrist-band records.`, [], { tag: 'rule' }),
          fact(`LOW reliability: hallway rumors, loose uncalibrated finger clips, guesses from memory.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Bay Reports', wingIndex: 1, label: 'Case A vs Case B',
        shown: [
          fact(`${pName(a)}: verified arterial blood draw confirms dangerous oxygen crash + doctor saw fluid on lung scan.`, a, { tag: 'strong' }),
          fact(`${pName(b)}: neighbor guesses "I think they fainted earlier," but doctor's exam & blood draw are 100% normal.`, b, { tag: 'weak' }),
        ],
        alt: [
          fact(`${pName(c)}: verified arterial blood draw confirms dangerous oxygen crash + doctor saw fluid on lung scan.`, c, { tag: 'strong' }),
          fact(`${pName(b)}: neighbor guesses "I think they fainted earlier," but doctor's exam & blood draw are 100% normal.`, b, { tag: 'weak' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Evidence Audit', wingIndex: 0, label: 'Monitor Glitch Check',
        shown: [
          fact(`${pName(c)}'s finger clip flashed "72%" — nurse noticed it had slipped halfway off a freezing finger; repeat blood test is 99% normal.`, c, { tag: 'weak' }),
          fact(`${pName(d)}: two separate doctors confirmed active internal bleed on ultrasound AND falling red-blood-cell lab count.`, d, { tag: 'strong' }),
        ],
        alt: [
          fact(`${pName(a)}'s finger clip flashed "72%" — nurse noticed it had slipped halfway off a freezing finger; repeat blood test is 99% normal.`, a, { tag: 'weak' }),
          fact(`${pName(d)}: two separate doctors confirmed active internal bleed on ultrasound AND falling red-blood-cell lab count.`, d, { tag: 'strong' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Bay Reports', wingIndex: 1, label: 'Unsigned Sticky Note',
        shown: [
          fact(`An unsigned scrap of paper in the hallway says "${pName(e)} might have broken ribs?" — X-ray actually shows zero fractures.`, e, { tag: 'weak' }),
          fact(`${pName(f)} came in for an earache; calm vitals verified twice.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Evidence Audit', wingIndex: 0, label: 'Corroboration Check',
        shown: [
          fact(`High-risk invasive intervention requires AT LEAST TWO corroborated high-reliability findings.`, [], { tag: 'rule' }),
          fact(`Never act on a single loose sensor or unverified rumor when lab tests contradict it.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Bay Reports', wingIndex: 1, label: 'Shift Handover',
        shown: [
          fact(`Night nurse re-checked ${pName(d)}'s wristband and confirmed the falling blood lab belongs to ${pName(d)}.`, d, { tag: 'verified' }),
          fact(`Two trauma teams are ready to move immediately on the verified emergencies.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Signal vs Ward Rumor',
      dispatch: 'Alarms and hallway whispers are flying — only act on emergencies backed by strong, verified clinical evidence.',
      order: 'Send ONLY the patients backed by strong, corroborated medical evidence (not rumors or slipped sensors) to the Trauma Bay.',
      hint: 'Separate verified blood tests and doctor scans from loose clips, guesses, and unsigned notes.',
      bayDefaultLabel: 'Evidence Check',
      bayLabels: { [f]: 'Minor · Stable' },
      cards,
      evaluate(activeCards) {
        const strong = tagSet(activeCards, 'strong');
        const weak = tagSet(activeCards, 'weak');
        const targets = uniqueSortedIds([...strong].filter((id) => !weak.has(id)));
        const rivals = [...weak];
        return {
          targets,
          proof: `Only ${formatList(targets)} have strong, corroborated primary evidence (verified labs + direct scans), rather than slipped clips or hallway guesses.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)}'s alarm rested on weak/flawed evidence (loose sensor, rumor, or unsigned note) contradicted by verified tests.`),
        };
      },
    };
  },

  // #10 Bayesian reasoning (Inside · Composite)
  'bayesian-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Risk Desk', wingIndex: 0, label: 'Starting Risk Scores',
        shown: [
          fact(`Initial risk before scans: ${pName(a)} starts at 20 pts; ${pName(b)} starts at 60 pts.`, [a, b], { tag: 'prior' }),
          fact(`Initial risk before scans: ${pName(c)} starts at 30 pts; ${pName(d)} starts at 50 pts.`, [c, d], { tag: 'prior' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Scan Lab', wingIndex: 1, label: 'Test Multiplier Rules',
        shown: [
          fact(`POSITIVE artery scan multiplies danger score by ×4 (huge jump in odds!).`, [], { tag: 'rule' }),
          fact(`CLEAN artery scan divides danger score by ÷5 (rules almost all danger out!).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Scan Lab', wingIndex: 1, label: 'Scan Results Batch 1',
        shown: [
          fact(`${pName(a)}'s urgent artery scan came back POSITIVE (apply ×4 to starting score).`, a, { tag: 'pos_a' }),
          fact(`${pName(b)}'s urgent artery scan came back CLEAN (apply ÷5 to starting score).`, b, { tag: 'neg_b' }),
        ],
        alt: [
          fact(`${pName(a)}'s urgent artery scan came back CLEAN (apply ÷5 to starting score).`, a, { tag: 'neg_a' }),
          fact(`${pName(c)}'s urgent artery scan came back POSITIVE (apply ×4 to starting score).`, c, { tag: 'pos_c' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Risk Desk', wingIndex: 0, label: 'Scan Results Batch 2',
        shown: [
          fact(`${pName(c)}'s urgent artery scan came back CLEAN (apply ÷5 to starting score).`, c, { tag: 'neg_c' }),
          fact(`${pName(d)}'s scan is not done yet — score stays unchanged at its starting value.`, d, { tag: 'pending_d' }),
        ],
        alt: [
          fact(`${pName(b)}'s urgent artery scan came back CLEAN (apply ÷5 to starting score).`, b, { tag: 'neg_b' }),
          fact(`${pName(d)}'s scan is not done yet — score stays unchanged at its starting value.`, d, { tag: 'pending_d' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Scan Lab', wingIndex: 1, label: 'Why Starting Risk Lies',
        shown: [
          fact(`A high starting suspicion shrinks fast after a clean scan; a modest starting suspicion skyrockets after a positive scan.`, [], { tag: 'rule' }),
          fact(`${pName(e)} had zero chest symptoms and a 0-point risk score.`, e, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Risk Desk', wingIndex: 0, label: 'OR Slot Cut-Off',
        shown: [
          fact(`Only ONE emergency surgery slot is open — give it to the patient with the HIGHEST updated danger score.`, [], { tag: 'rule' }),
          fact(`${pName(f)} is waiting for an ankle wrap; zero artery risk.`, f, { tag: 'safe', calm: true }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Updating the Odds',
      dispatch: 'New artery scan results just arrived — update every patient’s starting risk before picking who gets the lone OR.',
      order: 'Wheel the SINGLE patient with the HIGHEST UPDATED danger score into emergency surgery.',
      hint: 'Multiply or divide each starting risk score by their actual scan result — do not anchor on who started highest.',
      bayDefaultLabel: 'Artery Scan',
      bayLabels: { [e]: 'Minor · Stable', [f]: 'Minor · Stable' },
      cards,
      evaluate(activeCards) {
        const scores = { [a]: 20, [b]: 60, [c]: 30, [d]: 50 };
        if (tagSet(activeCards, 'pos_a').has(a)) scores[a] *= 4;
        if (tagSet(activeCards, 'neg_a').has(a)) scores[a] /= 5;
        if (tagSet(activeCards, 'neg_b').has(b)) scores[b] /= 5;
        if (tagSet(activeCards, 'pos_c').has(c)) scores[c] *= 4;
        if (tagSet(activeCards, 'neg_c').has(c)) scores[c] /= 5;
        const ranked = Object.entries(scores).sort((x, y) => y[1] - x[1]);
        const bestId = ranked[0][0];
        const runnerId = ranked[1][0];
        return {
          targets: [bestId],
          proof: `Updating starting risk with the new scan puts ${pName(bestId)} at ${ranked[0][1]} pts — ahead of ${pName(runnerId)} (${ranked[1][1]} pts) and cleared ${pName(b)} (${scores[b]} pts).`,
          rival: buildRivalInfo([bestId], [b, d, runnerId], (id) =>
            `${pName(id)} ended at ${scores[id]} pts after updating with scan evidence — below ${pName(bestId)}'s ${ranked[0][1]} pts.`
          ),
        };
      },
    };
  },

  // =========================================================================
  // FAMILY 2: LOGICAL & FORMAL REASONING (#11–#20)
  // =========================================================================

  // #11 Deductive reasoning (Before · Atomic)
  'deductive-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Protocol Board', wingIndex: 0, label: 'Airway Chain Rules',
        shown: [
          fact(`Law 1: Every patient with singed nose hairs inhaled superheated smoke.`, [], { tag: 'rule' }),
          fact(`Law 2: Everyone who inhaled superheated smoke MUST get a breathing tube immediately.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Fire Triage', wingIndex: 1, label: 'Face & Voice Exam',
        shown: [
          fact(`${pName(a)} has visibly singed nose hairs and soot on the tongue.`, a, { tag: 'singed' }),
          fact(`${pName(b)}'s voice turned hoarse inside a smoky basement — lab confirms superheated smoke inhalation.`, b, { tag: 'smoke' }),
        ],
        alt: [
          fact(`${pName(c)} has visibly singed nose hairs and soot on the tongue.`, c, { tag: 'singed' }),
          fact(`${pName(b)}'s voice turned hoarse inside a smoky basement — lab confirms superheated smoke inhalation.`, b, { tag: 'smoke' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Protocol Board', wingIndex: 0, label: 'Contrapositive Check',
        shown: [
          fact(`Law 3: Anyone cleared to sit in the hallway does NOT need a breathing tube.`, [], { tag: 'rule' }),
          fact(`${pName(c)} was cleared by the Burn Chief to sit in the hallway (no singed hairs, clean throat).`, c, { tag: 'hallway' }),
        ],
        alt: [
          fact(`Law 3: Anyone cleared to sit in the hallway does NOT need a breathing tube.`, [], { tag: 'rule' }),
          fact(`${pName(a)} was cleared by the Burn Chief to sit in the hallway (no singed hairs, clean throat).`, a, { tag: 'hallway' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Fire Triage', wingIndex: 1, label: 'Burn Surface Check',
        shown: [
          fact(`${pName(d)} burned a forearm on a hot pan outdoors — zero smoke, zero nose-hair singeing.`, d, { tag: 'outer_burn' }),
          fact(`Note: Skin burns on arms/legs do NOT trigger Law 1 or Law 2.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Protocol Board', wingIndex: 0, label: 'Scope Camera Note',
        shown: [
          fact(`${pName(e)} coughed once outside the building; throat scope shows pink healthy airways (no smoke inhalation).`, e, { tag: 'safe', calm: true }),
          fact(`Follow Laws 1–3 strictly — never guess beyond what the laws force.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Fire Triage', wingIndex: 1, label: 'Non-Fire Bay',
        shown: [
          fact(`${pName(f)} came in with a sprained wrist from tripping on the curb.`, f, { tag: 'safe', calm: true }),
          fact(`Two breathing-tube kits are prepped for everyone strictly required by Laws 1 & 2.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'House Fire Airway Chain',
      dispatch: 'Smoke victims are arriving from an apartment fire — trace the mandatory clinical laws step-by-step to catch silent throat swelling.',
      order: 'Place an immediate breathing tube for EVERY patient strictly required by the airway chain laws.',
      hint: 'Chain Law 1 → Law 2 cleanly, and apply Law 3 to rule out cleared patients.',
      bayDefaultLabel: 'Fire Smoke Eval',
      bayLabels: { [e]: 'Minor · Stable', [f]: 'Minor · Stable' },
      cards,
      evaluate(activeCards) {
        const singed = tagSet(activeCards, 'singed');
        const smoke = tagSet(activeCards, 'smoke');
        const hallway = tagSet(activeCards, 'hallway');
        const targets = uniqueSortedIds([...singed, ...smoke].filter((id) => !hallway.has(id)));
        const rivals = [...tagSet(activeCards, 'outer_burn'), ...hallway];
        return {
          targets,
          proof: `By Law 1 → Law 2, singed nose hairs imply superheated smoke, which forces an immediate breathing tube for ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} has no superheated smoke inhalation (outer skin burn or cleared for hallway).`),
        };
      },
    };
  },

  // #12 Inductive reasoning (After · Atomic)
  'inductive-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Past Cases', wingIndex: 0, label: 'Confirmed Case #1 & #2',
        shown: [
          fact(`Earlier today, Patient X (Building C, drank hallway fountain water, age 22) crashed with severe dizziness in 30 min.`, [], { tag: 'obs' }),
          fact(`Earlier today, Patient Y (Building C, drank hallway fountain water, age 68) crashed with severe dizziness in 30 min.`, [], { tag: 'obs' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Past Cases', wingIndex: 0, label: 'Confirmed Case #3 & #4',
        shown: [
          fact(`Earlier today, Patient Z (Building C, drank bottled water only, age 24) stayed 100% healthy.`, [], { tag: 'obs' }),
          fact(`Earlier today, Patient W (Building A, drank hallway fountain water, age 65) stayed 100% healthy.`, [], { tag: 'obs' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'New Arrivals', wingIndex: 1, label: 'New Walk-Ins 1',
        shown: [
          fact(`${pName(a)} just came from Building C after refilling a mug at the hallway fountain 10 minutes ago.`, a, { tag: 'bldgC_fountain' }),
          fact(`${pName(b)} just came from Building C, drank only sealed coffee from home.`, b, { tag: 'bldgC_safe' }),
        ],
        alt: [
          fact(`${pName(c)} just came from Building C after refilling a mug at the hallway fountain 10 minutes ago.`, c, { tag: 'bldgC_fountain' }),
          fact(`${pName(b)} just came from Building C, drank only sealed coffee from home.`, b, { tag: 'bldgC_safe' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'New Arrivals', wingIndex: 1, label: 'New Walk-Ins 2',
        shown: [
          fact(`${pName(c)} came from Building A after drinking from Building A's hallway fountain.`, c, { tag: 'bldgA_fountain' }),
          fact(`${pName(d)} just came from Building C after drinking two cups from the hallway fountain.`, d, { tag: 'bldgC_fountain' }),
        ],
        alt: [
          fact(`${pName(a)} came from Building A after drinking from Building A's hallway fountain.`, a, { tag: 'bldgA_fountain' }),
          fact(`${pName(d)} just came from Building C after drinking two cups from the hallway fountain.`, d, { tag: 'bldgC_fountain' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'New Arrivals', wingIndex: 1, label: 'Other Arrivals',
        shown: [
          fact(`${pName(e)} works in Building B and brought bottled juice from home.`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)} is age 68 from Building A, came in for a flu shot only.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Past Cases', wingIndex: 0, label: 'Preventive Hold',
        shown: [
          fact(`None of the new walk-ins feel dizzy YET — use the earlier pattern to predict who will crash in 20 minutes.`, [], { tag: 'rule' }),
          fact(`Look closely at what BOTH crashed cases shared that NEITHER healthy case shared.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Mystery Building Outbreak',
      dispatch: 'Four earlier cases reveal a hidden pattern — discover the general rule and hold the newly exposed arrivals BEFORE they collapse.',
      order: 'Admit EVERY new arrival who matches the dangerous pattern seen in the earlier crashes.',
      hint: 'Compare what crashed patients X & Y shared that healthy patients Z & W lacked (ignore age).',
      bayDefaultLabel: 'Exposure Watch',
      bayLabels: { [e]: 'Minor · Stable', [f]: 'Minor · Stable' },
      cards,
      evaluate(activeCards) {
        const targets = uniqueSortedIds([...tagSet(activeCards, 'bldgC_fountain')]);
        const rivals = [...tagSet(activeCards, 'bldgC_safe'), ...tagSet(activeCards, 'bldgA_fountain')];
        return {
          targets,
          proof: `The earlier cases establish one clear pattern: Building C + Hallway Fountain Water (regardless of age) causes collapse — putting ${formatList(targets)} at imminent risk.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} lacks either Building C or the hallway fountain exposure.`),
        };
      },
    };
  },

  // #13 Syllogistic reasoning (Before · Atomic)
  'syllogistic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Flight Rules', wingIndex: 0, label: 'Cabin Pressure Law',
        shown: [
          fact(`Rule 1: Every patient on high-flow oxygen is cleared for cabin pressure.`, [], { tag: 'rule' }),
          fact(`Rule 2: NO patient with an untreated chest air leak is cleared for cabin pressure.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Bay Roster', wingIndex: 1, label: 'North Trauma Bay',
        shown: [
          fact(`Every patient in the North Trauma Bay is currently on high-flow oxygen.`, [], { tag: 'rule' }),
          fact(`${pName(a)} and ${pName(b)} are both in the North Trauma Bay.`, [a, b], { tag: 'o2' }),
        ],
        alt: [
          fact(`Every patient in the North Trauma Bay is currently on high-flow oxygen.`, [], { tag: 'rule' }),
          fact(`${pName(b)} and ${pName(d)} are both in the North Trauma Bay.`, [b, d], { tag: 'o2' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Scan Desk', wingIndex: 0, label: 'Chest Air-Leak Check',
        shown: [
          fact(`${pName(b)} has an UNTREATED chest air leak (chest tube not placed yet).`, b, { tag: 'leak' }),
          fact(`${pName(c)} had a chest air leak earlier, but it is ALREADY sealed with a working chest tube.`, c, { tag: 'sealed' }),
        ],
        alt: [
          fact(`${pName(c)} has an UNTREATED chest air leak (chest tube not placed yet).`, c, { tag: 'leak' }),
          fact(`${pName(b)} had a chest air leak earlier, but it is ALREADY sealed with a working chest tube.`, b, { tag: 'sealed' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Bay Roster', wingIndex: 1, label: 'South Bay Oxygen',
        shown: [
          fact(`${pName(c)} is on high-flow oxygen in the South Bay.`, c, { tag: 'o2' }),
          fact(`${pName(d)} is breathing regular room air only (NOT on high-flow oxygen).`, d, { tag: 'no_o2' }),
        ],
        alt: [
          fact(`${pName(c)} is on high-flow oxygen in the South Bay.`, c, { tag: 'o2' }),
          fact(`${pName(a)} is breathing regular room air only (NOT on high-flow oxygen).`, a, { tag: 'no_o2' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Flight Rules', wingIndex: 0, label: 'Final Boarding Gate',
        shown: [
          fact(`To board the rescue chopper, a patient must be BOTH cleared for cabin pressure AND hold a Surgical Red-Tag.`, [], { tag: 'rule' }),
          fact(`${pName(e)} is waiting for stitches only (Green tag).`, e, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Scan Desk', wingIndex: 0, label: 'Surgical Red-Tags',
        shown: [
          fact(`Surgical Red-Tag holders: ${pName(a)}, ${pName(b)}, ${pName(c)}, and ${pName(d)}.`, [a, b, c, d], { tag: 'redtag' }),
          fact(`${pName(f)} is already cleared to go home.`, f, { tag: 'safe', calm: true }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Storm Airlift Clearance',
      dispatch: 'A storm grounds the rescue chopper in 90 seconds — trace the categorical flight rules across all bays before loading.',
      order: 'Clear EVERY patient who qualifies to board the rescue helicopter right now.',
      hint: 'Chain bay location → oxygen status → cabin pressure clearance, then check untreated leaks and red-tags.',
      bayDefaultLabel: 'Airlift Eval',
      bayLabels: { [e]: 'Minor · Stitches', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const o2 = tagSet(activeCards, 'o2');
        const noO2 = tagSet(activeCards, 'no_o2');
        const leak = tagSet(activeCards, 'leak');
        const red = new Set([a, b, c, d]);
        const targets = uniqueSortedIds([...o2].filter((id) => !noO2.has(id) && !leak.has(id) && red.has(id)));
        const rivals = [...red].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Only ${formatList(targets)} hold a Surgical Red-Tag, sit on high-flow oxygen (clearing cabin pressure), and have no untreated air leak.`,
          rival: buildRivalInfo(targets, rivals, (id) =>
            leak.has(id)
              ? `${pName(id)} has an untreated chest air leak, which strictly disqualifies cabin pressure.`
              : `${pName(id)} is not on high-flow oxygen, so cabin pressure is not cleared.`
          ),
        };
      },
    };
  },

  // #14 Conditional reasoning (Inside · Atomic)
  'conditional-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Stroke Desk', wingIndex: 0, label: 'Clot-Buster Gate',
        shown: [
          fact(`IF stroke scan shows a blocked artery AND zero brain bleeding → GIVE clot-buster, UNLESS blood pressure > 180 OR surgery within 14 days.`, [], { tag: 'rule' }),
          fact(`All four conditions must be checked — missing one exception causes a fatal bleed.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Head Scan', wingIndex: 1, label: 'Brain Scan Results',
        shown: [
          fact(`${pName(a)}, ${pName(b)}, and ${pName(c)} all have a confirmed blocked brain artery with ZERO bleeding.`, [a, b, c], { tag: 'clean_clot' }),
          fact(`${pName(d)}'s head scan shows an active brain BLEED (clot-buster strictly forbidden).`, d, { tag: 'bleed' }),
        ],
        alt: [
          fact(`${pName(a)}, ${pName(b)}, and ${pName(d)} all have a confirmed blocked brain artery with ZERO bleeding.`, [a, b, d], { tag: 'clean_clot' }),
          fact(`${pName(c)}'s head scan shows an active brain BLEED (clot-buster strictly forbidden).`, c, { tag: 'bleed' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Stroke Desk', wingIndex: 0, label: 'Blood Pressure Check',
        shown: [
          fact(`${pName(a)}'s blood pressure is 154/88 (safe below 180).`, a, { tag: 'bp_ok' }),
          fact(`${pName(b)}'s blood pressure is 206/114 (dangerously above 180 — triggers UNLESS block!).`, b, { tag: 'bp_high' }),
        ],
        alt: [
          fact(`${pName(b)}'s blood pressure is 154/88 (safe below 180).`, b, { tag: 'bp_ok' }),
          fact(`${pName(a)}'s blood pressure is 206/114 (dangerously above 180 — triggers UNLESS block!).`, a, { tag: 'bp_high' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Head Scan', wingIndex: 1, label: 'Recent Surgery History',
        shown: [
          fact(`${pName(c)} had major knee surgery 5 days ago (within 14-day UNLESS block!).`, c, { tag: 'recent_surg' }),
          fact(`${pName(a)} and ${pName(b)} have had ZERO surgeries in the past year.`, [a, b], { tag: 'no_surg' }),
        ],
        alt: [
          fact(`${pName(d)} had major knee surgery 5 days ago (within 14-day UNLESS block!).`, d, { tag: 'recent_surg' }),
          fact(`${pName(a)} and ${pName(b)} have had ZERO surgeries in the past year.`, [a, b], { tag: 'no_surg' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Stroke Desk', wingIndex: 0, label: 'Extra Check',
        shown: [
          fact(`${pName(c)}'s blood pressure is 148/82; ${pName(d)}'s blood pressure is 150/84.`, [c, d], { tag: 'bp_note' }),
          fact(`${pName(e)} had a harmless migraine with a completely normal artery scan.`, e, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Head Scan', wingIndex: 1, label: 'Routine Bay',
        shown: [
          fact(`${pName(f)} is here for an ankle X-ray (zero stroke symptoms).`, f, { tag: 'safe', calm: true }),
          fact(`Administer clot-buster ONLY if the IF holds AND neither UNLESS trap fires.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Stroke Clot-Buster Gate',
      dispatch: 'Four stroke patients are racing the clock — test the IF/UNLESS safety protocol carefully before pushing powerful clot-busters.',
      order: 'Push the emergency clot-buster for EVERY patient who passes the full IF / UNLESS safety gate.',
      hint: 'Check scan type, blood pressure ceiling (180), and 14-day surgery history together.',
      bayDefaultLabel: 'Stroke Alert',
      bayLabels: { [e]: 'Minor · Stable', [f]: 'Minor · Stable' },
      cards,
      evaluate(activeCards) {
        const clot = tagSet(activeCards, 'clean_clot');
        const highBp = tagSet(activeCards, 'bp_high');
        const surg = tagSet(activeCards, 'recent_surg');
        const bleed = tagSet(activeCards, 'bleed');
        const targets = uniqueSortedIds([...clot].filter((id) => !highBp.has(id) && !surg.has(id) && !bleed.has(id)));
        const rivals = [...highBp, ...surg, ...bleed].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Only ${formatList(targets)} have a clean blocked artery with blood pressure under 180 and no surgery in the past 14 days.`,
          rival: buildRivalInfo(targets, rivals, (id) =>
            highBp.has(id)
              ? `${pName(id)}'s BP is over 180, triggering the UNLESS safety block.`
              : surg.has(id)
                ? `${pName(id)} had surgery 5 days ago, triggering the 14-day UNLESS block.`
                : `${pName(id)} has an active brain bleed, making clot-busters fatal.`
          ),
        };
      },
    };
  },

  // #15 Transitive reasoning (Before · Atomic)
  'transitive-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Blood Bank', wingIndex: 0, label: 'Comparison 1',
        shown: [
          fact(`Paramedics lost exact numbers in the storm — rank urgency strictly from relative comparisons.`, [], { tag: 'rule' }),
          fact(`${pName(a)} lost MORE blood than ${pName(b)}.`, [a, b], { tag: 'gt', hi: a, lo: b }),
        ],
        alt: [
          fact(`Paramedics lost exact numbers in the storm — rank urgency strictly from relative comparisons.`, [], { tag: 'rule' }),
          fact(`${pName(b)} lost MORE blood than ${pName(a)}.`, [b, a], { tag: 'gt', hi: b, lo: a }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Field Radio', wingIndex: 1, label: 'Comparison 2',
        shown: [
          fact(`${pName(b)} lost MORE blood than ${pName(c)}.`, [b, c], { tag: 'gt', hi: b, lo: c }),
          fact(`${pName(c)} lost MORE blood than ${pName(d)}.`, [c, d], { tag: 'gt', hi: c, lo: d }),
        ],
        alt: [
          fact(`${pName(a)} lost MORE blood than ${pName(c)}.`, [a, c], { tag: 'gt', hi: a, lo: c }),
          fact(`${pName(c)} lost MORE blood than ${pName(d)}.`, [c, d], { tag: 'gt', hi: c, lo: d }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Blood Bank', wingIndex: 0, label: 'Comparison 3',
        shown: [
          fact(`${pName(d)} lost MORE blood than ${pName(e)}.`, [d, e], { tag: 'gt', hi: d, lo: e }),
          fact(`${pName(f)} has ZERO bleeding (sprained finger only).`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Field Radio', wingIndex: 1, label: 'Cross-Check Note',
        shown: [
          fact(`Ambulance #2 confirms ${pName(c)} is definitely more stable than ${pName(a)}.`, [c, a], { tag: 'confirm' }),
          fact(`Ambulance #3 confirms ${pName(e)} only has a shallow forearm scrape.`, e, { tag: 'confirm' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Blood Bank', wingIndex: 0, label: 'Blood Supply Limit',
        shown: [
          fact(`Only TWO emergency O-negative blood coolers remain on the trauma cart.`, [], { tag: 'rule' }),
          fact(`Reconstruct the full 5-patient chain from heaviest loss to lightest loss.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Field Radio', wingIndex: 1, label: 'Allocation Order',
        shown: [
          fact(`Give the two coolers to the #1 and #2 heaviest blood-loss patients in the chain.`, [], { tag: 'rule' }),
          fact(`Lower-ranked patients can safely wait 15 minutes for the next blood bank delivery.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Storm Blood-Loss Chain',
      dispatch: 'Exact volume monitors died in the blackout — piece together the relative comparisons to find the two worst bleeds.',
      order: 'Give the two O-negative blood coolers to the TOP TWO heaviest blood-loss patients.',
      hint: 'Link the "lost MORE blood than" statements end-to-end into a single 5-person ranking.',
      bayDefaultLabel: 'Blood Loss Eval',
      bayLabels: { [f]: 'Minor · Stable' },
      cards,
      evaluate(activeCards) {
        const edges = factsByTag(activeCards, 'gt');
        const nodes = [a, b, c, d, e];
        const inDeg = Object.fromEntries(nodes.map((n) => [n, 0]));
        const adj = Object.fromEntries(nodes.map((n) => [n, []]));
        for (const ed of edges) {
          adj[ed.hi].push(ed.lo);
          inDeg[ed.lo]++;
        }
        const order = [];
        const q = nodes.filter((n) => inDeg[n] === 0);
        while (q.length) {
          const cur = q.shift();
          order.push(cur);
          for (const nxt of adj[cur]) {
            inDeg[nxt]--;
            if (inDeg[nxt] === 0) q.push(nxt);
          }
        }
        const top2 = uniqueSortedIds(order.slice(0, 2));
        const third = order[2];
        return {
          targets: top2,
          proof: `Chaining the comparisons orders blood loss from worst to mildest: ${order.map(pName).join(' > ')} — placing ${formatList(top2)} at #1 and #2.`,
          rival: buildRivalInfo(top2, [third], (id) => `${pName(id)} ranks #3 in the chain, behind both ${formatList(top2)}.`),
        };
      },
    };
  },

  // #16 Disjunctive reasoning (Inside · Atomic)
  'disjunctive-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Pharmacy Audit', wingIndex: 0, label: 'Missing Vial Pair 1',
        shown: [
          fact(`A mislabeled high-potassium vial was accidentally injected into EITHER ${pName(a)} OR ${pName(b)} (exactly one of them).`, [a, b], { tag: 'pair1', p1: a, p2: b }),
          fact(`Both patients were in Room 4 when the nurse dropped the tray.`, [a, b], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Pharmacy Audit', wingIndex: 0, label: 'Missing Vial Pair 2',
        shown: [
          fact(`A second mislabeled vial from the same tray went into EITHER ${pName(c)} OR ${pName(d)} (exactly one of them).`, [c, d], { tag: 'pair2', p1: c, p2: d }),
          fact(`High potassium stops the heart silently unless reversed with calcium immediately.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Blood Lab', wingIndex: 1, label: 'STAT Potassium Check 1',
        shown: [
          fact(`${pName(b)}'s rapid blood test just came back completely NORMAL potassium (3.9).`, b, { tag: 'clear' }),
          fact(`${pName(a)}'s blood sample hemolyzed in the tube — no direct lab number yet!`, a, { tag: 'pending' }),
        ],
        alt: [
          fact(`${pName(a)}'s rapid blood test just came back completely NORMAL potassium (3.9).`, a, { tag: 'clear' }),
          fact(`${pName(b)}'s blood sample hemolyzed in the tube — no direct lab number yet!`, b, { tag: 'pending' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Blood Lab', wingIndex: 1, label: 'STAT Potassium Check 2',
        shown: [
          fact(`${pName(c)}'s rapid blood test just came back completely NORMAL potassium (4.0).`, c, { tag: 'clear' }),
          fact(`${pName(d)}'s blood test is still spinning in the centrifuge — 10 minutes away.`, d, { tag: 'pending' }),
        ],
        alt: [
          fact(`${pName(d)}'s rapid blood test just came back completely NORMAL potassium (4.0).`, d, { tag: 'clear' }),
          fact(`${pName(c)}'s blood test is still spinning in the centrifuge — 10 minutes away.`, c, { tag: 'pending' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Pharmacy Audit', wingIndex: 0, label: 'Unrelated Bays',
        shown: [
          fact(`${pName(e)} received oral water only — zero IV injections all night.`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)} arrived after the mislabeled tray was already locked away.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Blood Lab', wingIndex: 1, label: 'Calcium Rescue Rule',
        shown: [
          fact(`Do NOT wait 10 minutes for pending tubes — if one half of an EITHER/OR pair is clean, the other MUST have received the vial.`, [], { tag: 'rule' }),
          fact(`Push protective calcium to both deduced recipients now.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Mislabeled Potassium Tray',
      dispatch: 'Two deadly vials went into two pairs of patients — two tubes came back clean while the other two are still pending.',
      order: 'Push protective heart-calcium NOW to the TWO patients who MUST have received the mislabeled vials.',
      hint: 'Use each clean blood test to force the other half of its EITHER/OR pair.',
      bayDefaultLabel: 'Vial Audit',
      bayLabels: { [e]: 'Minor · Stable', [f]: 'Minor · Stable' },
      cards,
      evaluate(activeCards) {
        const cleared = tagSet(activeCards, 'clear');
        const p1 = factsByTag(activeCards, 'pair1')[0];
        const p2 = factsByTag(activeCards, 'pair2')[0];
        const targets = [];
        if (p1) targets.push(cleared.has(p1.p1) ? p1.p2 : p1.p1);
        if (p2) targets.push(cleared.has(p2.p1) ? p2.p2 : p2.p1);
        const sorted = uniqueSortedIds(targets);
        const rivals = [...cleared];
        return {
          targets: sorted,
          proof: `Ruling out one member of each strict EITHER/OR pair forces ${formatList(sorted)} to be the two recipients of the mislabeled potassium vials.`,
          rival: buildRivalInfo(sorted, rivals, (id) => `${pName(id)}'s blood test already proved normal potassium, forcing their partner as the recipient.`),
        };
      },
    };
  },

  // #17 Contradiction-based reasoning (After · Atomic)
  'contradiction-based': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Chart Audit', wingIndex: 0, label: 'Wristband Mix-Up Alert',
        shown: [
          fact(`Hospital IT warns: ONE patient's electronic chart was merged with someone else's records!`, [], { tag: 'rule' }),
          fact(`Spot the single chart containing a physical impossibility before surgeons operate on the wrong person.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'ER Intake', wingIndex: 1, label: '01:00 Admission Log',
        shown: [
          fact(`01:00: ${pName(a)} arrived completely unconscious on a ventilator and never left ICU Bed 2 until 02:30.`, a, { tag: 'icu_locked' }),
          fact(`01:00: ${pName(b)} walked into triage alert with a broken collarbone; sent to X-ray at 01:20.`, b, { tag: 'ok_b' }),
        ],
        alt: [
          fact(`01:00: ${pName(c)} arrived completely unconscious on a ventilator and never left ICU Bed 2 until 02:30.`, c, { tag: 'icu_locked' }),
          fact(`01:00: ${pName(b)} walked into triage alert with a broken collarbone; sent to X-ray at 01:20.`, b, { tag: 'ok_b' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Chart Audit', wingIndex: 0, label: '01:25 Pharmacy & Lab',
        shown: [
          fact(`01:25: ${pName(a)} personally walked up to the ground-floor pharmacy window and signed a receipt in person.`, a, { tag: 'walked_pharm' }),
          fact(`01:25: ${pName(b)} returned from X-ray wearing a shoulder sling.`, b, { tag: 'ok_b' }),
        ],
        alt: [
          fact(`01:25: ${pName(c)} personally walked up to the ground-floor pharmacy window and signed a receipt in person.`, c, { tag: 'walked_pharm' }),
          fact(`01:25: ${pName(b)} returned from X-ray wearing a shoulder sling.`, b, { tag: 'ok_b' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'ER Intake', wingIndex: 1, label: 'Other Timelines',
        shown: [
          fact(`${pName(c)}: arrived 00:40 with stomach pain → ultrasound 01:05 → admitted to Surgery Ward at 01:40.`, c, { tag: 'ok_c' }),
          fact(`${pName(d)}: arrived 00:55 with asthma → inhaler 01:00 → breathing clear at 01:30.`, d, { tag: 'ok_d' }),
        ],
        alt: [
          fact(`${pName(a)}: arrived 00:40 with stomach pain → ultrasound 01:05 → admitted to Surgery Ward at 01:40.`, a, { tag: 'ok_a' }),
          fact(`${pName(d)}: arrived 00:55 with asthma → inhaler 01:00 → breathing clear at 01:30.`, d, { tag: 'ok_d' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Chart Audit', wingIndex: 0, label: 'Security Badge Check',
        shown: [
          fact(`ICU camera confirms Bed 2 was continuously occupied with zero patient transfers between 01:00 and 02:30.`, [], { tag: 'rule' }),
          fact(`${pName(e)} arrived 01:10 with a sprained ankle and stayed in Waiting Chair 4 the whole time.`, e, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'ER Intake', wingIndex: 1, label: 'Hold Surgery Order',
        shown: [
          fact(`${pName(f)} completed blood draw at 01:15 and is awaiting routine discharge.`, f, { tag: 'safe', calm: true }),
          fact(`Freeze the single chart whose two timestamped entries directly contradict each other.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Impossible Merged Chart',
      dispatch: 'An IT glitch merged two patients’ files — catch the physically impossible timeline before anyone gets the wrong operation.',
      order: 'Freeze the SINGLE patient chart that contains an impossible contradiction.',
      hint: 'Check which patient is logged in two mutually impossible states at the exact same time.',
      bayDefaultLabel: 'Chart Audit',
      bayLabels: { [e]: 'Minor · Stable', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const locked = tagSet(activeCards, 'icu_locked');
        const walked = tagSet(activeCards, 'walked_pharm');
        const targets = uniqueSortedIds([...locked].filter((id) => walked.has(id)));
        const rivals = [a, b, c, d].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `${formatList(targets)} cannot simultaneously be unconscious on an ICU ventilator (01:00–02:30) and walking up to the ground-floor pharmacy window at 01:25 — proving a chart mix-up.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)}'s timeline is completely consistent across every department.`),
        };
      },
    };
  },

  // #18 Recursive reasoning (Before · Composite)
  'recursive-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Infection Ctrl', wingIndex: 0, label: 'Contagion Rule',
        shown: [
          fact(`A fast-spreading airborne bug jumps in waves: anyone sharing a closed room with an EXPOSED person becomes EXPOSED too.`, [], { tag: 'rule' }),
          fact(`Wave 0 (Patient Zero): ${pName(a)} tested positive on arrival and is ALREADY isolated.`, a, { tag: 'wave0' }),
        ],
        alt: [
          fact(`A fast-spreading airborne bug jumps in waves: anyone sharing a closed room with an EXPOSED person becomes EXPOSED too.`, [], { tag: 'rule' }),
          fact(`Wave 0 (Patient Zero): ${pName(b)} tested positive on arrival and is ALREADY isolated.`, b, { tag: 'wave0' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Room Logs', wingIndex: 1, label: 'Wave 1 Contacts (01:05)',
        shown: [
          fact(`At 01:05, ${pName(a)} shared the ambulance cab with ${pName(b)} (already wearing an isolation mask now).`, [a, b], { tag: 'hop', from: a, to: b }),
          fact(`At 01:05, ${pName(f)} sat outdoors in the parking lot alone.`, f, { tag: 'safe', calm: true }),
        ],
        alt: [
          fact(`At 01:05, ${pName(b)} shared the ambulance cab with ${pName(a)} (already wearing an isolation mask now).`, [b, a], { tag: 'hop', from: b, to: a }),
          fact(`At 01:05, ${pName(f)} sat outdoors in the parking lot alone.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Room Logs', wingIndex: 1, label: 'Wave 2 Contacts (01:20)',
        shown: [
          fact(`At 01:20, ${pName(b)} sat in the small X-ray booth right next to ${pName(c)} (unmasked!).`, [b, c], { tag: 'hop', from: b, to: c }),
          fact(`At 01:20, ${pName(d)} shared a closed CT waiting room with ${pName(e)} (neither met ${pName(a)} or ${pName(b)}).`, [d, e], { tag: 'isolated_pair' }),
        ],
        alt: [
          fact(`At 01:20, ${pName(a)} sat in the small X-ray booth right next to ${pName(d)} (unmasked!).`, [a, d], { tag: 'hop', from: a, to: d }),
          fact(`At 01:20, ${pName(c)} shared a closed CT waiting room with ${pName(e)} (neither met ${pName(a)} or ${pName(b)}).`, [c, e], { tag: 'isolated_pair' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Infection Ctrl', wingIndex: 0, label: 'Wave 3 Contacts (01:40)',
        shown: [
          fact(`At 01:40, ${pName(c)} rode a cramped elevator with ${pName(d)} (unmasked!).`, [c, d], { tag: 'hop', from: c, to: d }),
          fact(`Notice: ${pName(a)} and ${pName(b)} are ALREADY locked inside isolation — do NOT pick them.`, [a, b], { tag: 'already_iso' }),
        ],
        alt: [
          fact(`At 01:40, ${pName(d)} rode a cramped elevator with ${pName(e)} (unmasked!).`, [d, e], { tag: 'hop', from: d, to: e }),
          fact(`Notice: ${pName(a)} and ${pName(b)} are ALREADY locked inside isolation — do NOT pick them.`, [a, b], { tag: 'already_iso' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Room Logs', wingIndex: 1, label: 'Who Still Roams Free?',
        shown: [
          fact(`Trace the chain hop-by-hop from Wave 0 → Wave 1 → Wave 2 → Wave 3.`, [], { tag: 'rule' }),
          fact(`Anyone who only interacted with unexposed people stays safe.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Infection Ctrl', wingIndex: 0, label: 'Quarantine Order',
        shown: [
          fact(`Pull ONLY the newly exposed unmasked patients (Wave 2 & Wave 3) into isolation immediately!`, [], { tag: 'rule' }),
          fact(`Skip Wave 0 and Wave 1 — they are already safely isolated.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Airborne Contact Cascade',
      dispatch: 'An airborne contagion jumped hop-by-hop through the ER before Patient Zero was isolated — trace every wave of contact.',
      order: 'Quarantine EVERY newly exposed patient (Waves 2 and 3) who is NOT isolated yet.',
      hint: 'Start from Wave 0 and apply the room-contact rule repeatedly until the chain ends, skipping already-isolated Waves 0–1.',
      bayDefaultLabel: 'Contact Trace',
      bayLabels: { [f]: 'Minor · Stable' },
      cards,
      evaluate(activeCards) {
        const exposed = new Set(tagSet(activeCards, 'wave0'));
        const hops = factsByTag(activeCards, 'hop');
        const alreadyIso = new Set(factsByTag(activeCards, 'already_iso').flatMap((f) => f.patients));
        let changed = true;
        while (changed) {
          changed = false;
          for (const h of hops) {
            if (exposed.has(h.from) && !exposed.has(h.to)) {
              exposed.add(h.to);
              changed = true;
            }
          }
        }
        const targets = uniqueSortedIds([...exposed].filter((id) => !alreadyIso.has(id)));
        const rivals = [a, b, c, d, e].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Tracing contact waves recursively from Patient Zero reaches ${formatList(targets)} in Waves 2–3 who still need quarantine.`,
          rival: buildRivalInfo(targets, rivals, (id) =>
            alreadyIso.has(id)
              ? `${pName(id)} is already isolated in Waves 0–1.`
              : `${pName(id)} never crossed paths with anyone in the exposed chain.`
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
        index: 0, time: '01:00', wing: 'OR Control', wingIndex: 0, label: 'Two-OR Budget',
        shown: [
          fact(`We have TWO open operating rooms right now, ONE neurosurgeon, and ONLY 5 units of O-negative blood total.`, [], { tag: 'rule' }),
          fact(`Pick the ONLY compatible PAIR of urgent patients who can both be operated on RIGHT NOW without running out of blood or surgeons.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Surgical Specs', wingIndex: 1, label: 'Patient Needs 1',
        shown: [
          fact(`${pName(a)}: Needs Neurosurgeon + 3 units O-negative blood.`, a, { tag: 'need', neuro: true, blood: 3 }),
          fact(`${pName(b)}: Needs Neurosurgeon + 2 units O-negative blood.`, b, { tag: 'need', neuro: true, blood: 2 }),
        ],
        alt: [
          fact(`${pName(a)}: Needs General Surgeon + 3 units O-negative blood.`, a, { tag: 'need', neuro: false, blood: 3 }),
          fact(`${pName(b)}: Needs Neurosurgeon + 2 units O-negative blood.`, b, { tag: 'need', neuro: true, blood: 2 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Surgical Specs', wingIndex: 1, label: 'Patient Needs 2',
        shown: [
          fact(`${pName(c)}: Needs General Surgeon + 2 units O-negative blood.`, c, { tag: 'need', neuro: false, blood: 2 }),
          fact(`${pName(d)}: Needs General Surgeon + 4 units O-negative blood.`, d, { tag: 'need', neuro: false, blood: 4 }),
        ],
        alt: [
          fact(`${pName(c)}: Needs Neurosurgeon + 4 units O-negative blood.`, c, { tag: 'need', neuro: true, blood: 4 }),
          fact(`${pName(d)}: Needs General Surgeon + 4 units O-negative blood.`, d, { tag: 'need', neuro: false, blood: 4 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'OR Control', wingIndex: 0, label: 'Staffing Rule',
        shown: [
          fact(`General Surgeons are plentiful (2 available), so two General-Surgeon cases CAN run together if blood allows.`, [], { tag: 'rule' }),
          fact(`Only ONE Neurosurgeon is on duty — two Neurosurgeon cases CANNOT run at the same time.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Surgical Specs', wingIndex: 1, label: 'Priority Tie-Breaker',
        shown: [
          fact(`Rule: If multiple valid pairs fit inside 5 blood units, pick the pair using the MOST blood (max surgical load = 5 units).`, [], { tag: 'rule' }),
          fact(`${pName(e)} only needs stitches — no operating room required.`, e, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'OR Control', wingIndex: 0, label: 'Lobby Status',
        shown: [
          fact(`${pName(f)} has a mild sprain and is cleared to wait in the lobby.`, f, { tag: 'safe', calm: true }),
          fact(`Test all pairs among the 4 surgical candidates against BOTH the 1-neurosurgeon limit AND the 5-unit blood cap.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Two-OR Pairing Puzzle',
      dispatch: 'Two operating rooms are open, but you share ONE neurosurgeon and 5 blood units — test which exact pair fits without clashing.',
      order: 'Send the ONE valid pair of patients who maximize surgical load (5 blood units) without clashing on the lone neurosurgeon.',
      hint: 'Check every 2-patient combination for: at most 1 Neurosurgeon AND total blood ≤ 5 (preferring exact 5).',
      bayDefaultLabel: 'OR Candidate',
      bayLabels: { [e]: 'Minor · Stitches', [f]: 'Minor · Stable' },
      cards,
      evaluate(activeCards) {
        const needs = factsByTag(activeCards, 'need');
        const validPairs = [];
        for (let i = 0; i < needs.length; i++) {
          for (let j = i + 1; j < needs.length; j++) {
            const x = needs[i];
            const y = needs[j];
            if (x.neuro && y.neuro) continue;
            const totalBlood = x.blood + y.blood;
            if (totalBlood <= 5) {
              validPairs.push({ ids: [x.patients[0], y.patients[0]], totalBlood });
            }
          }
        }
        validPairs.sort((p, q) => q.totalBlood - p.totalBlood);
        const best = validPairs[0];
        const targets = best ? uniqueSortedIds(best.ids) : [];
        const rivals = needs.map((n) => n.patients[0]).filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `${formatList(targets)} is the optimal compatible pair: uses all ${best?.totalBlood ?? 0}/5 blood units with at most one Neurosurgeon.`,
          rival: buildRivalInfo(targets, rivals, (id) => `Pairing ${pName(id)} either exceeds 5 blood units, double-books the sole neurosurgeon, or leaves blood unused.`),
        };
      },
    };
  },

  // #20 Constraint-based reasoning (Before · Composite)
  'constraint-based': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'ICU Desk', wingIndex: 0, label: 'Isolation Suite Rules',
        shown: [
          fact(`ICU Suite 1 has FOUR strict specs: (1) Negative-pressure airflow, (2) Adult bed only (age 18+), (3) NO dialysis hookup, (4) Under 250 lbs bed limit.`, [], { tag: 'rule' }),
          fact(`The patient assigned to Suite 1 MUST need negative-pressure isolation AND break ZERO specs.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Patient Specs', wingIndex: 1, label: 'Airflow & Age Check',
        shown: [
          fact(`${pName(a)}: Needs negative-pressure airflow · Age 34 · Weight 170 lbs.`, a, { tag: 'c_ok', air: true, adult: true, wtOk: true }),
          fact(`${pName(b)}: Needs negative-pressure airflow · Age 11 (child!) · Weight 85 lbs.`, b, { tag: 'c_ok', air: true, adult: false, wtOk: true }),
        ],
        alt: [
          fact(`${pName(c)}: Needs negative-pressure airflow · Age 34 · Weight 170 lbs.`, c, { tag: 'c_ok', air: true, adult: true, wtOk: true }),
          fact(`${pName(b)}: Needs negative-pressure airflow · Age 11 (child!) · Weight 85 lbs.`, b, { tag: 'c_ok', air: true, adult: false, wtOk: true }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Patient Specs', wingIndex: 1, label: 'Weight & Airflow Check',
        shown: [
          fact(`${pName(c)}: Needs negative-pressure airflow · Age 48 · Weight 290 lbs (exceeds 250 lb bed!).`, c, { tag: 'c_ok', air: true, adult: true, wtOk: false }),
          fact(`${pName(d)}: Needs negative-pressure airflow · Age 52 · Weight 185 lbs.`, d, { tag: 'c_ok', air: true, adult: true, wtOk: true }),
        ],
        alt: [
          fact(`${pName(a)}: Needs negative-pressure airflow · Age 48 · Weight 290 lbs (exceeds 250 lb bed!).`, a, { tag: 'c_ok', air: true, adult: true, wtOk: false }),
          fact(`${pName(d)}: Needs negative-pressure airflow · Age 52 · Weight 185 lbs.`, d, { tag: 'c_ok', air: true, adult: true, wtOk: true }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'ICU Desk', wingIndex: 0, label: 'Dialysis Requirement',
        shown: [
          fact(`${pName(d)} requires continuous emergency kidney dialysis hookup right now!`, d, { tag: 'needs_dialysis' }),
          fact(`${pName(a)} and ${pName(c)} have healthy kidneys — ZERO dialysis needed.`, [a, c], { tag: 'no_dialysis' }),
        ],
        alt: [
          fact(`${pName(d)} requires continuous emergency kidney dialysis hookup right now!`, d, { tag: 'needs_dialysis' }),
          fact(`${pName(a)} and ${pName(c)} have healthy kidneys — ZERO dialysis needed.`, [a, c], { tag: 'no_dialysis' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Patient Specs', wingIndex: 1, label: 'Non-Airborne Bay',
        shown: [
          fact(`${pName(e)}: Age 29 · Weight 160 lbs · No dialysis — broken leg only (does NOT need negative-pressure isolation).`, e, { tag: 'safe', calm: true }),
          fact(`Never waste a negative-pressure room on a non-airborne injury.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'ICU Desk', wingIndex: 0, label: 'Final Placement',
        shown: [
          fact(`${pName(f)} is waiting for discharge papers.`, f, { tag: 'safe', calm: true }),
          fact(`Only ONE patient satisfies all 4 physical constraints of Suite 1 simultaneously.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'ICU Isolation Suite Fit',
      dispatch: 'Four airborne-isolation patients need a bed, but ICU Suite 1 has strict age, weight, and equipment restrictions.',
      order: 'Assign the SINGLE patient who satisfies ALL FOUR physical constraints of ICU Suite 1.',
      hint: 'Check airborne need + adult (18+) + under 250 lbs + zero dialysis across all candidates.',
      bayDefaultLabel: 'ICU Bed Eval',
      bayLabels: { [e]: 'Minor · Stable', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const dial = tagSet(activeCards, 'needs_dialysis');
        const cands = factsByTag(activeCards, 'c_ok');
        const targets = uniqueSortedIds(
          cands
            .filter((x) => x.air && x.adult && x.wtOk && !dial.has(x.patients[0]))
            .map((x) => x.patients[0])
        );
        const rivals = cands.map((x) => x.patients[0]).filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Only ${formatList(targets)} simultaneously meet all 4 Suite 1 constraints: needs negative-pressure airflow, adult 18+, under 250 lbs, and no dialysis hookup.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} violates one of Suite 1's hard limits (under 18, over 250 lbs, or requires dialysis).`),
        };
      },
    };
  },
};
