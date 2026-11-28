// Relational-First Clinical Reasoning Engines — Families 5 & 6 (#42–#61)
// Fluid-intelligence feedback graphs, sequential rescue clocks, two-team anticipation, knapsack trade-offs,
// multi-channel funnels, first-principles physics, and emergent drug collisions — zero filler cards, zero jargon.

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

export const SEMANTIC_F56 = {
  // =========================================================================
  // FAMILY 5: STRATEGIC & SYSTEMIC REASONING (#42–#52)
  // =========================================================================

  // #42 Systems reasoning (Inside · Composite)
  // Reinforcing vs. balancing feedback loops across 6 linked Temp × Clotting × Bleed bays
  'systems-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Loop Physics', wingIndex: 0, label: 'Runaway vs. Self-Fixing',
        shown: [
          fact(`Self-fixing loop: Cold → Shivering → Heat (warms back up); Fever → Sweating → Cools back down.`, [], { tag: 'rule' }),
          fact(`Runaway spiral: Active Bleed + Temp < 95°F → Clots FAIL → Bleeds FASTER → Drops EVEN COLDER!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Temp Grid', wingIndex: 1, label: 'Body-Temp Comparisons',
        shown: [
          fact(`${pName(a)} (93.4°F) is COLDER THAN ${pName(c)} (98.4°F) AND below the 95°F clot-freeze line.`, [a, c], { tag: 'cold', p: a }),
          fact(`${pName(b)} (94.2°F) is ALSO below 95°F — SAME cold zone as ${pName(a)} — while ${pName(e)} sits at 93.8°F.`, [b, a, e], { tag: 'cold_pair', ps: [b, e] }),
        ],
        alt: [
          fact(`${pName(c)} (93.4°F) is COLDER THAN ${pName(a)} (98.4°F) AND below the 95°F clot-freeze line.`, [c, a], { tag: 'cold', p: c }),
          fact(`${pName(b)} (94.2°F) is ALSO below 95°F — SAME cold zone as ${pName(c)} — while ${pName(e)} sits at 93.8°F.`, [b, c, e], { tag: 'cold_pair', ps: [b, e] }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Bleed & Clot', wingIndex: 0, label: 'Active Bleeding Links',
        shown: [
          fact(`${pName(a)} has active belly bleeding whose clot time is WORSE THAN ${pName(c)}'s steady clot.`, [a, c], { tag: 'bleed_fail', p: a }),
          fact(`${pName(b)} has ZERO bleeding — shivering hard after a lake rescue (self-warming!).`, [b], { tag: 'self_fix', p: b }),
        ],
        alt: [
          fact(`${pName(c)} has active belly bleeding whose clot time is WORSE THAN ${pName(a)}'s steady clot.`, [c, a], { tag: 'bleed_fail', p: c }),
          fact(`${pName(b)} has ZERO bleeding — shivering hard after a lake rescue (self-warming!).`, [b], { tag: 'self_fix', p: b }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Bleed & Clot', wingIndex: 0, label: 'Cross-Bay Loop Check',
        shown: [
          fact(`${pName(e)} has active pelvis bleeding + failing clots — SAME runaway spiral as ${pName(a)}!`, [e, a], { tag: 'bleed_fail', p: e }),
          fact(`${pName(d)} (101°F) is sweating to cool down; ${pName(f)} (98.6°F) has a clotting thigh cut (warm!).`, [d, f], { tag: 'warm_ok', ps: [d, f] }),
        ],
        alt: [
          fact(`${pName(e)} has ZERO bleeding — shivering warmly under heated blankets (self-fixing!).`, [e], { tag: 'self_fix', p: e }),
          fact(`${pName(d)} (101°F) is sweating to cool down; ${pName(f)} (98.6°F) is warm and clotting cleanly.`, [d, f], { tag: 'warm_ok', ps: [d, f] }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Loop Physics', wingIndex: 0, label: 'Why Cold Alone Isn’t Spiral',
        shown: [
          fact(`Cold WITHOUT bleeding (${pName(b)}) warms back up; Warm WITH bleeding (${pName(f)}) still clots normally!`, [b, f], { tag: 'note' }),
          fact(`Only intersecting Temp < 95°F WITH Active Bleed + Failed Clots locks in the runaway spiral.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Warmer Tower', wingIndex: 1, label: 'Break the Spiral',
        shown: [
          fact(`Deploy heated blood warmers ONLY to bays trapped in the bleeding-plus-freezing runaway loop.`, [], { tag: 'rule' }),
          fact(`Do not waste rapid warmers on self-correcting shivering or warm clotting cuts.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Break the Runaway Spiral',
      dispatch: 'Separate self-correcting loops from patients locked in the Bleeding + Temp < 95°F + Failed-Clotting spiral.',
      order: 'Deploy heated blood warmers to EVERY patient locked in an active bleeding-and-freezing runaway loop.',
      hint: 'Intersect Temp < 95°F with Active Bleeding + Failed Clots — skip cold non-bleeders and warm bleeders.',
      bayDefaultLabel: 'Loop Audit',
      cards,
      evaluate(activeCards) {
        const cold = new Set([
          ...factsByTag(activeCards, 'cold').map((x) => x.p),
          ...factsByTag(activeCards, 'cold_pair').flatMap((x) => x.ps),
        ]);
        const bf = new Set(factsByTag(activeCards, 'bleed_fail').map((x) => x.p));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => cold.has(id) && bf.has(id)));
        const rivals = [b, c, f, d, e, a].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Intersecting Temp < 95°F with Active Bleeding + Failed Clots isolates ${formatList(targets)} as locked in the runaway spiral.`,
          rival: buildRivalInfo(targets, rivals, (r) =>
            cold.has(r) ? `${pName(r)} is cold (< 95°F), but has zero bleeding and is self-warming by shivering.` : `${pName(r)} is warm (> 98°F), so normal clotting and temperature loops remain intact.`
          ),
        };
      },
    };
  },

  // #43 Strategic reasoning (Before · Composite)
  // Two-move lookahead scheduling across 6 surgery clocks: find the unique FIRST move that saves the whole chain
  'strategic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Solo Surgeon', wingIndex: 0, label: 'Two-Move Lookahead',
        shown: [
          fact(`You are the ONLY trauma surgeon for 12 minutes (one bay at a time).`, [], { tag: 'rule' }),
          fact(`Simulate Move 1 → Move 2: your FIRST patient must finish BEFORE every other urgent deadline expires!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'OR Clocks A', wingIndex: 1, label: 'Tight Deadlines A & B',
        shown: [
          fact(`${pName(a)}: 3-min fix · deadline Min 5 (TIGHTER deadline than ${pName(b)}'s Min 9!).`, [a, b], { tag: 'seq', p: a, dur: 3, dead: 5 }),
          fact(`${pName(b)}: 5-min fix · deadline Min 9 (doing ${pName(b)} first misses Min 5!).`, [b], { tag: 'seq', p: b, dur: 5, dead: 9 }),
        ],
        alt: [
          fact(`${pName(a)}: 6-min fix · deadline Min 10 (doing ${pName(a)} first misses Min 4!).`, [a], { tag: 'seq', p: a, dur: 6, dead: 10 }),
          fact(`${pName(b)}: 3-min fix · deadline Min 4 (TIGHTER deadline than ${pName(a)}'s Min 10!).`, [b, a], { tag: 'seq', p: b, dur: 3, dead: 4 }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'OR Clocks B', wingIndex: 1, label: 'Long & Mid Clocks C & D',
        shown: [
          fact(`${pName(c)}: 9-min fix · deadline Min 11 (takes LONGER THAN ${pName(a)} + ${pName(b)} combined!).`, [c, a, b], { tag: 'seq', p: c, dur: 9, dead: 11 }),
          fact(`${pName(d)}: 4-min fix · deadline Min 12 (fits right AFTER the first two urgent fixes!).`, [d], { tag: 'seq', p: d, dur: 4, dead: 12 }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'OR Clocks C', wingIndex: 0, label: 'Backup-Team Clocks E & F',
        shown: [
          fact(`${pName(e)}: 2-min fix · deadline Min 30 (FASTEST fix, yet safely waits for backup at Min 12!).`, [e], { tag: 'seq', p: e, dur: 2, dead: 30 }),
          fact(`${pName(f)}: 3-min fix · deadline Min 40 (safely waits for the backup surgeon!).`, [f], { tag: 'seq', p: f, dur: 3, dead: 40 }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Solo Surgeon', wingIndex: 0, label: 'Avoid the "Fastest" Trap',
        shown: [
          fact(`Look at ${pName(e)} (2 min, safe until Min 30) vs. the Min 4–5 deadline: shortest duration ≠ tightest deadline!`, [e], { tag: 'note' }),
          fact(`Doing the earliest urgent deadline first finishes at Min 3, saving Move 2 BEFORE Min 9–10!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'OR Charge', wingIndex: 1, label: 'Pick Move #1 (Min 0)',
        shown: [
          fact(`Choose ONLY the SINGLE patient you must operate on FIRST at Minute 0.`, [], { tag: 'rule' }),
          fact(`Maximize total lives saved across the full 12-minute sequence.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Two Moves Ahead',
      dispatch: 'Compare fix durations against deadlines across six OR clocks to pick the unique Move #1 that saves the chain.',
      order: 'Operate on the SINGLE patient who MUST go FIRST at Minute 0 so the remaining urgent bays still survive.',
      hint: 'Check earliest tight deadline — don’t get lured by a quick 2-minute case that can safely wait 30 minutes!',
      bayDefaultLabel: 'Surgery Clock',
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'seq').sort((x, y) => x.dead - y.dead);
        const top = list[0];
        const run = list[1];
        const targets = top ? [top.p] : [];
        return {
          targets,
          proof: `Starting with ${pName(top.p)} (${top.dur}-min fix, deadline Min ${top.dead}) clears Move 1 by Min ${top.dur}, leaving time to save ${pName(run.p)} before Min ${run.dead}.`,
          rival: buildRivalInfo(targets, [e, run.p, c], (r) =>
            r === e ? `${pName(e)} is fastest (2 min), but their Min 30 deadline can wait — doing them first delays the tight chain.` : `Starting with ${pName(r)} ties up your hands past ${pName(top.p)}'s Minute ${top.dead} deadline.`
          ),
        };
      },
    };
  },

  // #44 Game-theoretic reasoning (Before · Composite)
  // Two-hospital equilibrium: anticipate City Trauma's predictable greedy choice across 6 inbound cases
  'game-theoretic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Regional Net', wingIndex: 0, label: 'Two-Hospital Equilibrium',
        shown: [
          fact(`City Trauma (1 open bay) ALWAYS claims the SINGLE FASTEST critical surgery (ignores non-critical cases).`, [], { tag: 'rule' }),
          fact(`We ALSO have 1 open bay. Predict City Trauma's move and claim the OTHER critical patient so zero lives strand!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Inbound Amb', wingIndex: 1, label: 'Critical Bleeds A & B',
        shown: [
          fact(`${pName(a)}: CRITICAL bleed · 20-min repair (FASTER THAN ${pName(b)} → City Trauma's #1 grab!).`, [a, b], { tag: 'gt', p: a, crit: true, mins: 20 }),
          fact(`${pName(b)}: CRITICAL bleed · 90-min repair (SLOWER THAN ${pName(a)} → City Trauma will skip!).`, [b, a], { tag: 'gt', p: b, crit: true, mins: 90 }),
        ],
        alt: [
          fact(`${pName(a)}: CRITICAL bleed · 95-min repair (SLOWER THAN ${pName(b)} → City Trauma will skip!).`, [a, b], { tag: 'gt', p: a, crit: true, mins: 95 }),
          fact(`${pName(b)}: CRITICAL bleed · 18-min repair (FASTER THAN ${pName(a)} → City Trauma's #1 grab!).`, [b, a], { tag: 'gt', p: b, crit: true, mins: 18 }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Inbound Amb', wingIndex: 1, label: 'Non-Critical Inbound C & D',
        shown: [
          fact(`${pName(c)}: Non-critical broken wrist (12-min fix — FASTER THAN everyone, yet NOT critical!).`, [c], { tag: 'gt', p: c, crit: false, mins: 12 }),
          fact(`${pName(d)}: Non-critical scalp cut (10-min fix — safe at urgent care clinic).`, [d], { tag: 'gt', p: d, crit: false, mins: 10 }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Regional Net', wingIndex: 0, label: 'Third-Hospital Status E & F',
        shown: [
          fact(`${pName(e)} & ${pName(f)} were ALREADY accepted by Westside Trauma (zero open bay needed!).`, [e, f], { tag: 'taken', ps: [e, f] }),
          fact(`Only TWO critical cases remain unassigned across the whole city: ${pName(a)} and ${pName(b)}.`, [a, b], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Payoff Matrix', wingIndex: 0, label: 'Why Double-Booking Fails',
        shown: [
          fact(`If BOTH hospitals claim the ~20-min critical case, the 90-min critical case has ZERO bays left!`, [], { tag: 'rule' }),
          fact(`City Trauma skips non-critical ${pName(c)}/${pName(d)} and locks onto the fastest critical surgery.`, [c, d], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Bay Dispatch', wingIndex: 1, label: 'Claim Our Bay',
        shown: [
          fact(`Anticipate City Trauma's grab and claim the critical patient they will pass over.`, [], { tag: 'rule' }),
          fact(`Coordinating saves BOTH remaining critical lives.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Regional Bay Equilibrium',
      dispatch: 'City Trauma predictably grabs the fastest critical case — anticipate their move so the slower critical case survives.',
      order: 'Claim our lone trauma bay for the CRITICAL patient whom City Trauma will predictably pass over.',
      hint: 'Find the two unassigned CRITICAL cases; City Trauma grabs the shorter repair, so we must claim the longer one.',
      bayDefaultLabel: 'Inbound Amb',
      cards,
      evaluate(activeCards) {
        const crits = factsByTag(activeCards, 'gt').filter((x) => x.crit).sort((x, y) => y.mins - x.mins);
        const stranded = crits[0];
        const grabbed = crits[1];
        const targets = stranded ? [stranded.p] : [];
        return {
          targets,
          proof: `Anticipating City Trauma's grab of faster ${pName(grabbed.p)} (${grabbed.mins} min), claiming ${pName(stranded.p)} (${stranded.mins} min) saves BOTH critical lives.`,
          rival: buildRivalInfo(targets, [grabbed.p, c, e], (r) =>
            r === grabbed.p ? `City Trauma is already grabbing ${pName(r)} — double-booking strands ${pName(stranded.p)} with zero open bays.` : `${pName(r)} is either non-critical or already accepted by Westside Trauma.`
          ),
        };
      },
    };
  },

  // #45 Adversarial reasoning (Before · Composite)
  // Comparing digital queue ranks vs. objective bedside vitals + kiosk audit trail across 6 bays
  'adversarial-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Security Desk', wingIndex: 0, label: 'Spoofed Queue Alert',
        shown: [
          fact(`An attacker spoofed ONE bay's digital queue tag to "RED #1" from an unlocked lobby kiosk!`, [], { tag: 'rule' }),
          fact(`Compare Digital Rank vs. Real Bedside Vitals + Audit Log to expose the forged entry without blocking real crashes.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Digital Board', wingIndex: 1, label: 'Screen Priority Claims',
        shown: [
          fact(`Screen ranks ${pName(a)} HIGHER THAN ${pName(c)} ("RED #1: Unconscious Shock").`, [a, c], { tag: 'red_tag', p: a }),
          fact(`Screen ALSO tags ${pName(b)} as "RED #1: Collapsed Chest" and ${pName(e)} as "RED #2: Pelvis Bleed."`, [b, e], { tag: 'red_tag', p: b }),
        ],
        alt: [
          fact(`Screen ranks ${pName(c)} HIGHER THAN ${pName(a)} ("RED #1: Unconscious Shock").`, [c, a], { tag: 'red_tag', p: c }),
          fact(`Screen ALSO tags ${pName(b)} as "RED #1: Collapsed Chest" and ${pName(e)} as "RED #2: Pelvis Bleed."`, [b, e], { tag: 'red_tag', p: b }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Bedside Truth', wingIndex: 0, label: 'Direct Nurse Vitals A',
        shown: [
          fact(`${pName(a)}: Upright texting, BP 122/76, O2 99% — OPPOSITE OF screen claim ("Unconscious Shock")!`, [a], { tag: 'fake_vitals', p: a }),
          fact(`${pName(b)}: Pale, gasping, BP 74/42, O2 81% — MATCHES screen claim truthfully.`, [b], { tag: 'honest', p: b }),
        ],
        alt: [
          fact(`${pName(c)}: Upright texting, BP 122/76, O2 99% — OPPOSITE OF screen claim ("Unconscious Shock")!`, [c], { tag: 'fake_vitals', p: c }),
          fact(`${pName(b)}: Pale, gasping, BP 74/42, O2 81% — MATCHES screen claim truthfully.`, [b], { tag: 'honest', p: b }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Bedside Truth', wingIndex: 0, label: 'Direct Nurse Vitals B',
        shown: [
          fact(`${pName(e)}: Confirmed pelvic bleed, BP 78/46 (honest RED #2); ${pName(d)}: honest Yellow kidney stone.`, [e, d], { tag: 'honest_pair', ps: [e, d] }),
          fact(`${pName(f)}: Honest Yellow forearm fracture — X-ray matches screen tag.`, [f], { tag: 'honest', p: f }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Kiosk Log', wingIndex: 1, label: 'Badge Edit Trail',
        shown: [
          fact(`Security log: ${pName(a)}'s chart was edited at 01:04 from unlocked Lobby Kiosk #3 with a guest badge!`, [a], { tag: 'kiosk', p: a }),
          fact(`${pName(b)}, ${pName(c)}, ${pName(d)}, ${pName(e)}, ${pName(f)} were logged by verified nurse badges.`, [b, c, d, e, f], { tag: 'note' }),
        ],
        alt: [
          fact(`Security log: ${pName(c)}'s chart was edited at 01:04 from unlocked Lobby Kiosk #3 with a guest badge!`, [c], { tag: 'kiosk', p: c }),
          fact(`${pName(a)}, ${pName(b)}, ${pName(d)}, ${pName(e)}, ${pName(f)} were logged by verified nurse badges.`, [a, b, d, e, f], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Security Desk', wingIndex: 0, label: 'Quarantine Spoof',
        shown: [
          fact(`Cross-link Screen Claim ≠ Bedside Vitals WITH the Lobby Kiosk edit trail.`, [], { tag: 'rule' }),
          fact(`Quarantine the SINGLE spoofed chart so genuine RED patients aren't delayed.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Spoofed Triage Priority',
      dispatch: 'Cross-check digital RED #1 tags against direct nurse vitals and kiosk edit logs to expose the forged entry.',
      order: 'Flag the SINGLE patient whose "RED #1" digital queue tag was intentionally spoofed.',
      hint: 'Intersect Screen RED Claim + Normal Bedside Vitals + Unlocked Lobby Kiosk edit.',
      bayDefaultLabel: 'Queue Audit',
      cards,
      evaluate(activeCards) {
        const fake = new Set(factsByTag(activeCards, 'fake_vitals').map((x) => x.p));
        const kiosk = new Set(factsByTag(activeCards, 'kiosk').map((x) => x.p));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => fake.has(id) && kiosk.has(id)));
        const rivals = [b, e, c, a, d].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Cross-checking digital claims against bedside vitals (122/76, 99% O2) and the Lobby Kiosk guest edit exposes ${formatList(targets)} as spoofed.`,
          rival: buildRivalInfo(targets, rivals, (r) => `${pName(r)}'s bedside vitals and verified nurse badge honestly match their queue tag.`),
        };
      },
    };
  },

  // #46 Optimisation reasoning (Before · Composite)
  // 10-minute knapsack across 6 patients: find the exact 2-patient pair fitting ≤ 10 min with MAXIMUM total Urgency
  'optimisation-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Evac Budget', wingIndex: 0, label: '10-Minute Pair Cap',
        shown: [
          fact(`Chopper lifts off in 10 minutes! Pick the 2-patient PAIR whose combined prep time ≤ 10 min AND maximizes total Urgency Points.`, [], { tag: 'rule' }),
          fact(`Warning: grabbing the single biggest 8-min case blocks every worthwhile partner!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Prep Times A', wingIndex: 1, label: 'Bays A & B',
        shown: [
          fact(`${pName(a)}: 4 min · 7 Urgency Pts (HIGHER points/min than ${pName(c)}).`, [a, c], { tag: 'opt', p: a, m: 4, v: 7 }),
          fact(`${pName(b)}: 6 min · 8 Urgency Pts (check combined time with ${pName(a)}).`, [b, a], { tag: 'opt', p: b, m: 6, v: 8 }),
        ],
        alt: [
          fact(`${pName(a)}: 7 min · 7 Urgency Pts.`, [a], { tag: 'opt', p: a, m: 7, v: 7 }),
          fact(`${pName(b)}: 4 min · 9 Urgency Pts (HIGHER points/min than ${pName(d)}).`, [b, d], { tag: 'opt', p: b, m: 4, v: 9 }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Prep Times B', wingIndex: 1, label: 'Bays C & D',
        shown: [
          fact(`${pName(c)}: 8 min · 10 Urgency Pts (highest single score on the floor).`, [c], { tag: 'opt', p: c, m: 8, v: 10 }),
          fact(`${pName(d)}: 5 min · 6 Urgency Pts.`, [d], { tag: 'opt', p: d, m: 5, v: 6 }),
        ],
        alt: [
          fact(`${pName(c)}: 5 min · 8 Urgency Pts (check combined time with ${pName(b)}).`, [c, b], { tag: 'opt', p: c, m: 5, v: 8 }),
          fact(`${pName(d)}: 8 min · 10 Urgency Pts (highest single score on the floor).`, [d], { tag: 'opt', p: d, m: 8, v: 10 }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Prep Times C', wingIndex: 0, label: 'Bays E & F',
        shown: [
          fact(`${pName(e)}: 5 min · 5 Urgency Pts (compare pairing with ${pName(d)} vs. faster bays).`, [e, d], { tag: 'opt', p: e, m: 5, v: 5 }),
          fact(`${pName(f)}: 2 min · 2 Urgency Pts (fastest single prep time on the board).`, [f], { tag: 'opt', p: f, m: 2, v: 2 }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Evac Budget', wingIndex: 0, label: 'Compare All Legal Pairs',
        shown: [
          fact(`Check (8m + 2m = 10m → 12 pts) vs. (5m + 5m = 10m → 11 pts) vs. the best 4m + 5m/6m pair!`, [], { tag: 'rule' }),
          fact(`Any pair summing > 10 minutes misses liftoff.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Helipad Lead', wingIndex: 1, label: 'Lock In Top Pair',
        shown: [
          fact(`Select the exact 2-patient pair fitting ≤ 10 min with the HIGHEST combined Urgency Points.`, [], { tag: 'rule' }),
          fact(`Rotors are spinning — submit both bays now.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: '10-Minute Evac Knapsack',
      dispatch: 'Test all 2-patient pairs fitting ≤ 10 minutes across six candidates to maximize combined Urgency Points.',
      order: 'Prep the TWO-PATIENT PAIR whose combined time is ≤ 10 minutes and achieves the HIGHEST total Urgency Points.',
      hint: 'Compare 8m+2m (12 pts) against faster mid-size pairs that fit inside 10 minutes for 15–17 pts!',
      bayDefaultLabel: 'Evac Budget',
      cards,
      evaluate(activeCards) {
        const items = factsByTag(activeCards, 'opt');
        let best = null;
        for (let i = 0; i < items.length; i++) {
          for (let j = i + 1; j < items.length; j++) {
            const m = items[i].m + items[j].m;
            const v = items[i].v + items[j].v;
            if (m <= 10 && (!best || v > best.v)) best = { ids: [items[i].p, items[j].p], m, v };
          }
        }
        const targets = best ? uniqueSortedIds(best.ids) : [];
        const rivals = items.map((x) => x.p).filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Testing all pairs ≤ 10 min puts ${formatList(targets)} #1: ${best.m}/10 min for ${best.v} Urgency Points, beating the greedy 8m+2m pair (12 pts).`,
          rival: buildRivalInfo(targets, rivals, (r) => `Including ${pName(r)} either breaks the 10-min limit or yields fewer total Urgency Points than ${best.v}.`),
        };
      },
    };
  },

  // #47 Instrumental reasoning (Inside · Atomic)
  // Matching exact mechanism of tools (Defib Shock vs. CPR/Adrenaline vs. Pacing vs. Fluids) across 6 heart bays
  'instrumental-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Tool Physics', wingIndex: 0, label: 'What Each Tool Fixes',
        shown: [
          fact(`Electric Shock ONLY resets CHAOTIC QUIVERING waves (no organized beat).`, [], { tag: 'rule' }),
          fact(`Flatline → CPR + Adrenaline; Slow steady beat → Pacemaker; Fast steady beat → Fluids (NEVER shock!).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Heart Wall A', wingIndex: 1, label: 'Rhythm Comparison A',
        shown: [
          fact(`${pName(a)}: Unresponsive · wild CHAOTIC QUIVERING waves (OPPOSITE OF ${pName(b)}'s flatline).`, [a, b], { tag: 'shockable', p: a }),
          fact(`${pName(b)}: Unresponsive · completely FLAT horizontal line with ZERO electrical waves.`, [b], { tag: 'flat', p: b }),
        ],
        alt: [
          fact(`${pName(c)}: Unresponsive · wild CHAOTIC QUIVERING waves (OPPOSITE OF ${pName(b)}'s flatline).`, [c, b], { tag: 'shockable', p: c }),
          fact(`${pName(b)}: Unresponsive · completely FLAT horizontal line with ZERO electrical waves.`, [b], { tag: 'flat', p: b }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Heart Wall B', wingIndex: 1, label: 'Rhythm Comparison B',
        shown: [
          fact(`${pName(c)}: Awake · steady regular fast beat 132 BPM with organized waves.`, [c], { tag: 'steady', p: c }),
          fact(`${pName(d)}: Fainting · steady slow beat 36 BPM with organized waves.`, [d], { tag: 'slow', p: d }),
        ],
        alt: [
          fact(`${pName(a)}: Awake · steady regular fast beat 132 BPM with organized waves.`, [a], { tag: 'steady', p: a }),
          fact(`${pName(d)}: Fainting · steady slow beat 36 BPM with organized waves.`, [d], { tag: 'slow', p: d }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Heart Wall C', wingIndex: 0, label: 'Pulse & Wave Check C',
        shown: [
          fact(`${pName(e)}: Unresponsive · organized regular waves on screen YET zero palpable pulse.`, [e], { tag: 'pea', p: e }),
          fact(`${pName(f)}: Awake · occasional skipped beat, strong BP 124/78.`, [f], { tag: 'benign', p: f }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Tool Physics', wingIndex: 0, label: 'Why Unresponsive ≠ Shock',
        shown: [
          fact(`Three bays are unresponsive (${pName(b)}, ${pName(e)}, and the chaotic quivering bay) — ONLY chaotic electrical waves respond to shock!`, [b, e], { tag: 'note' }),
          fact(`Shocking a flatline or organized pulseless wave wastes vital CPR seconds.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Crash Cart', wingIndex: 1, label: 'Charge & Clear',
        shown: [
          fact(`One charged defibrillator is rolling down the hall.`, [], { tag: 'rule' }),
          fact(`Deliver the electric shock ONLY to the single chaotic-quivering bay.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Right Tool for the Rhythm',
      dispatch: 'Three bays are unresponsive and three have rate alarms — match the defibrillator strictly to chaotic electrical quivering.',
      order: 'Deliver the electric shock ONLY to the single patient whose rhythm can actually be reset by a shock.',
      hint: 'Separate chaotic electrical quivering from flatline, pulseless organized waves, slow beats, and fast steady beats.',
      bayDefaultLabel: 'Rhythm Eval',
      cards,
      evaluate(activeCards) {
        const targets = uniqueSortedIds(factsByTag(activeCards, 'shockable').map((x) => x.p));
        const rivals = [b, e, d, c, a].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Matching tool mechanism to rhythm physics isolates ${formatList(targets)} (chaotic quivering) — flatline and organized pulseless waves require CPR, not shock.`,
          rival: buildRivalInfo(targets, rivals, (r) => `${pName(r)} has a flatline or organized wave where an electric shock cannot reset the heart.`),
        };
      },
    };
  },

  // #48 Second-order reasoning (Inside · Composite)
  // Predicting 2nd-order BP collapse (−40 pt Nitro ripple + Sildenafil synergy OR BP − 40 < 60) across 6 chest-pain bays
  'second-order-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Ripple Physics', wingIndex: 0, label: 'The −40 BP Domino',
        shown: [
          fact(`Chest-pain spray eases pain (1st step) → BUT drops top BP by −40 points (2nd-order ripple!).`, [], { tag: 'rule' }),
          fact(`BLOCK spray if: (1) Current BP − 40 drops BELOW 60 (< 100 start) OR (2) Patient took Sildenafil (DOUBLES drop to −80!).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Chest Bays A', wingIndex: 1, label: 'Start BP & Meds A',
        shown: [
          fact(`${pName(a)}: Start BP 148 (HIGHER THAN ${pName(c)}) · took Sildenafil 3 hours ago.`, [a, c], { tag: 'd2', p: a, bp: 148, sild: true }),
          fact(`${pName(b)}: Start BP 154 · ZERO artery-relaxing pills taken.`, [b], { tag: 'd2', p: b, bp: 154, sild: false }),
        ],
        alt: [
          fact(`${pName(a)}: Start BP 150 · ZERO artery-relaxing pills taken.`, [a], { tag: 'd2', p: a, bp: 150, sild: false }),
          fact(`${pName(b)}: Start BP 148 · took Sildenafil 3 hours ago.`, [b], { tag: 'd2', p: b, bp: 148, sild: true }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Chest Bays B', wingIndex: 1, label: 'Start BP & Meds B',
        shown: [
          fact(`${pName(c)}: Start BP 92 · ZERO Sildenafil taken.`, [c], { tag: 'd2', p: c, bp: 92, sild: false }),
          fact(`${pName(d)}: Start BP 164 · ZERO Sildenafil taken (highest BP on floor).`, [d], { tag: 'd2', p: d, bp: 164, sild: false }),
        ],
        alt: [
          fact(`${pName(c)}: Start BP 158 · ZERO Sildenafil taken.`, [c], { tag: 'd2', p: c, bp: 158, sild: false }),
          fact(`${pName(d)}: Start BP 94 · ZERO Sildenafil taken.`, [d], { tag: 'd2', p: d, bp: 94, sild: false }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Chest Bays C', wingIndex: 0, label: 'Start BP & Meds C',
        shown: [
          fact(`${pName(e)}: Start BP 118 · ZERO Sildenafil taken.`, [e], { tag: 'd2', p: e, bp: 118, sild: false }),
          fact(`${pName(f)}: Start BP 126 · took Sildenafil 2 days ago (48 hours elapsed).`, [f], { tag: 'd2', p: f, bp: 126, sild: false }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Ripple Physics', wingIndex: 0, label: 'Check the 24h & 100 Edges',
        shown: [
          fact(`All six bays have chest tightness — trace ONE domino past the chest pain to post-spray BP!`, [], { tag: 'rule' }),
          fact(`Sildenafil interacts ONLY within 24 hours (${pName(f)}'s 2-day-old dose is already cleared!).`, [f], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Pharmacy Stop', wingIndex: 1, label: 'Block Dangerous Sprays',
        shown: [
          fact(`Cancel the chest-pain spray for EVERY bay whose 2nd-order ripple causes collapse (BP < 100 OR Sildenafil < 24h).`, [], { tag: 'rule' }),
          fact(`Let the remaining safe chest-pain bays get relief immediately.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Look One Domino Further',
      dispatch: 'All six chest-pain bays were ordered artery-relaxing spray — trace the −40 BP ripple and 24h Sildenafil interaction.',
      order: 'BLOCK the chest-pain spray for EVERY patient endangered by its downstream blood-pressure drop.',
      hint: 'Flag anyone with Start BP < 100 OR Sildenafil within 24 hours (a 2-day-old pill has cleared).',
      bayDefaultLabel: 'Chest Spray',
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'd2');
        const targets = uniqueSortedIds(list.filter((x) => x.bp < 100 || x.sild).map((x) => x.p));
        const rivals = list.filter((x) => !(x.bp < 100 || x.sild)).map((x) => x.p);
        return {
          targets,
          proof: `Tracing the downstream BP ripple blocks spray on ${formatList(targets)} (Start BP < 100 or recent Sildenafil doubling the drop).`,
          rival: buildRivalInfo(targets, [f, e, b, d], (r) =>
            r === f ? `${pName(f)}'s Sildenafil was 2 days ago (cleared past 24h) and BP 126 safely handles −40.` : `${pName(r)} starts well above 100 with no active interacting pill.`
          ),
        };
      },
    };
  },

  // #49 Risk-based reasoning (Before · Atomic)
  // Expected Harm = Probability × Severity across 6 competing emergency profiles
  'risk-based-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Risk Formula', wingIndex: 0, label: 'Chance × Severity Rule',
        shown: [
          fact(`Expected Harm = Chance (%) × Severity (1 = tiny rash, 10 = fatal brain bleed).`, [], { tag: 'rule' }),
          fact(`A 90% chance of Severity 1 (0.9) is MUCH LOWER THAN a 40% chance of Severity 10 (4.0)!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Risk Sheet A', wingIndex: 1, label: 'Bays A & B',
        shown: [
          fact(`${pName(a)}: 90% chance of mild rash · Severity = 1 (highest probability on the board).`, [a], { tag: 'rk', p: a, pr: 90, sv: 1 }),
          fact(`${pName(b)}: 45% chance of fatal brain bleed · Severity = 10 (compare product vs. ${pName(d)}).`, [b, d], { tag: 'rk', p: b, pr: 45, sv: 10 }),
        ],
        alt: [
          fact(`${pName(a)}: 50% chance of fatal brain bleed · Severity = 10 (compare product vs. ${pName(d)}).`, [a, d], { tag: 'rk', p: a, pr: 50, sv: 10 }),
          fact(`${pName(b)}: 80% chance of mild nausea · Severity = 2.`, [b], { tag: 'rk', p: b, pr: 80, sv: 2 }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Risk Sheet B', wingIndex: 1, label: 'Bays C & D',
        shown: [
          fact(`${pName(c)}: 60% chance of swollen ankle · Severity = 3.`, [c], { tag: 'rk', p: c, pr: 60, sv: 3 }),
          fact(`${pName(d)}: 35% chance of losing a kidney · Severity = 8.`, [d], { tag: 'rk', p: d, pr: 35, sv: 8 }),
        ],
        alt: [
          fact(`${pName(c)}: 60% chance of swollen ankle · Severity = 3.`, [c], { tag: 'rk', p: c, pr: 60, sv: 3 }),
          fact(`${pName(d)}: 30% chance of losing a kidney · Severity = 8.`, [d], { tag: 'rk', p: d, pr: 30, sv: 8 }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Risk Sheet C', wingIndex: 0, label: 'Bays E & F',
        shown: [
          fact(`${pName(e)}: 10% chance of fatal lung clot · Severity = 10.`, [e], { tag: 'rk', p: e, pr: 10, sv: 10 }),
          fact(`${pName(f)}: 50% chance of broken collarbone · Severity = 4.`, [f], { tag: 'rk', p: f, pr: 50, sv: 4 }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Risk Formula', wingIndex: 0, label: 'Beat Both Traps',
        shown: [
          fact(`Trap 1: Raw Chance alone picks ${pName(a)} (90% rash). Trap 2: Raw Severity alone ties with ${pName(e)} (10% clot).`, [a, e], { tag: 'note' }),
          fact(`Multiply BOTH factors together for all six bays to find the clear #1.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'ICU Bed 1', wingIndex: 1, label: 'Single Specialist Slot',
        shown: [
          fact(`Only ONE immediate specialist ICU bed is open right now.`, [], { tag: 'rule' }),
          fact(`Admit the SINGLE patient carrying the HIGHEST Expected Harm (Chance × Severity).`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Chance × Severity Triage',
      dispatch: 'Six bays span high-chance/low-harm and low-chance/high-harm traps — multiply Chance × Severity across all six.',
      order: 'Admit the SINGLE patient carrying the HIGHEST Expected Harm (Chance × Severity).',
      hint: 'Multiply (Chance % × Severity) for all 6 bays — neither 90%×1 nor 10%×10 beats the top product!',
      bayDefaultLabel: 'Risk Score',
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'rk')
          .map((x) => ({ id: x.p, pr: x.pr, sv: x.sv, sc: (x.pr / 100) * x.sv }))
          .sort((x, y) => y.sc - x.sc);
        const top = list[0];
        const run = list[1];
        const targets = top ? [top.id] : [];
        return {
          targets,
          proof: `Multiplying Chance × Severity puts ${pName(top.id)} #1 at ${top.sc.toFixed(1)} (${top.pr}% × ${top.sv}), beating ${pName(run.id)} (${run.sc.toFixed(1)}).`,
          rival: buildRivalInfo(targets, [run.id, a, e, f], (r) => {
            const x = list.find((item) => item.id === r);
            return `${pName(r)}'s expected harm is ${x.sc.toFixed(1)} (${x.pr}% × ${x.sv}), below ${pName(top.id)}'s ${top.sc.toFixed(1)}.`;
          }),
        };
      },
    };
  },

  // #50 Decision-theoretic reasoning (After · Composite)
  // Expected Value = Real Medical Survival Lift × Patient's Own Stated Directive across 6 surgical consults
  'decision-theoretic': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Care Ethics', wingIndex: 0, label: 'Benefit × Wishes Matrix',
        shown: [
          fact(`Operate ONLY when BOTH hold: (1) Real medical survival lift (> 0% gain) AND (2) Patient wants surgery (no Comfort-Only refusal).`, [], { tag: 'rule' }),
          fact(`Never force surgery over a signed "No Surgery" living will, and never run 0%-chance futile surgery.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Surgical Odds', wingIndex: 1, label: 'Medical Survival Lift A',
        shown: [
          fact(`${pName(a)}: Surgery shifts survival odds 15% → 75%.`, [a], { tag: 'lift', p: a, ok: true }),
          fact(`${pName(b)}: Surgery shifts survival odds 20% → 85%.`, [b], { tag: 'lift', p: b, ok: true }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Surgical Odds', wingIndex: 1, label: 'Medical Survival Lift B',
        shown: [
          fact(`${pName(c)}: Surgery shifts survival odds 1% → 1% (zero change).`, [c], { tag: 'lift', p: c, ok: false }),
          fact(`${pName(d)}: Surgery shifts odds 30% → 85% · ${pName(e)}: 2% → 2% · ${pName(f)}: 78% → 80%.`, [d, e, f], { tag: 'lift_d', p: d, ok: true }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Wishes File A', wingIndex: 0, label: 'Signed Directives A & B',
        shown: [
          fact(`${pName(a)}: Signed directive — "Do EVERYTHING to save me — I want surgery!"`, [a], { tag: 'wish', p: a, yes: true }),
          fact(`${pName(b)}: Signed living will — "NO surgery, NO machines — comfort care ONLY."`, [b], { tag: 'wish', p: b, yes: false }),
        ],
        alt: [
          fact(`${pName(a)}: Signed living will — "NO surgery, NO machines — comfort care ONLY."`, [a], { tag: 'wish', p: a, yes: false }),
          fact(`${pName(b)}: Signed directive — "Do EVERYTHING to save me — I want surgery!"`, [b], { tag: 'wish', p: b, yes: true }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Wishes File B', wingIndex: 0, label: 'Signed Directives C–F',
        shown: [
          fact(`${pName(c)} & ${pName(e)}: Families beg "Try anything!" (wants surgery, YET check survival lift!).`, [c, e], { tag: 'wish_pair', ps: [c, e], yes: true }),
          fact(`${pName(d)}: Alert and verbally consents — "Take me to OR now!"`, [d], { tag: 'wish', p: d, yes: true }),
        ],
        alt: [
          fact(`${pName(c)} & ${pName(e)}: Families beg "Try anything!" (wants surgery, YET check survival lift!).`, [c, e], { tag: 'wish_pair', ps: [c, e], yes: true }),
          fact(`${pName(d)}: Signed living will — "Comfort care only — decline all operations."`, [d], { tag: 'wish', p: d, yes: false }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'OR Consent', wingIndex: 1, label: 'Cross-Link Odds & Wishes',
        shown: [
          fact(`Notice ${pName(b)} has the highest raw survival odds yet check their directive; ${pName(c)} wants care yet has 0% odds!`, [b, c], { tag: 'note' }),
          fact(`Send to OR ONLY patients passing BOTH meaningful surgical lift (> 20%) AND explicit consent.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Odds Meet Human Wishes',
      dispatch: 'Cross-link surgical survival lift cards against signed patient directive cards across six consults.',
      order: 'Send ONLY the patients where surgery BOTH delivers a real survival lift AND honors their stated wishes.',
      hint: 'Intersect Meaningful Survival Lift (> 20% gain) WITH Explicit Consent (no Comfort-Only refusal).',
      bayDefaultLabel: 'Care Consent',
      cards,
      evaluate(activeCards) {
        const goodLift = new Set([
          ...factsByTag(activeCards, 'lift').filter((x) => x.ok).map((x) => x.p),
          ...factsByTag(activeCards, 'lift_d').filter((x) => x.ok).map((x) => x.p),
        ]);
        const wants = new Set();
        for (const x of factsByTag(activeCards, 'wish')) if (x.yes) wants.add(x.p);
        for (const x of factsByTag(activeCards, 'wish_pair')) if (x.yes) for (const id of x.ps) wants.add(id);
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => goodLift.has(id) && wants.has(id)));
        const rivals = [b, c, d, a, e, f].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Intersecting real survival lift with patient autonomy clears ${formatList(targets)} for OR — honoring Comfort-Only living wills and rejecting 0% futile surgery.`,
          rival: buildRivalInfo(targets, rivals, (r) =>
            goodLift.has(r) ? `${pName(r)} has strong surgical odds, but signed a Comfort-Only refusal that must be honored.` : `${pName(r)}'s operation offers zero meaningful medical survival lift.`
          ),
        };
      },
    };
  },

  // #51 Algorithmic reasoning (Before · Atomic)
  // Strict ordered START flowchart (Step 1 Walk → Step 2 RR > 30 → Step 3 Weak Pulse OR Confused) across 6 crash bays
  'algorithmic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'START Tree', wingIndex: 0, label: 'Ordered 3-Step Tree',
        shown: [
          fact(`STEP 1 (FIRST!): Walking? → YES = GREEN (STOP!). NO → Step 2.`, [], { tag: 'rule' }),
          fact(`STEP 2: Breathing > 30/min? → YES = RED (STOP!). NO → Step 3: Weak pulse OR confused? → YES = RED; NO = YELLOW.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Field Check A', wingIndex: 1, label: 'Bays A & B',
        shown: [
          fact(`${pName(a)}: Non-walker · Breathing 22/min · Strong pulse · Follows commands.`, [a], { tag: 'alg', p: a, w: false, rr: 22, bad3: false }),
          fact(`${pName(b)}: Non-walker · Breathing 24/min · Weak wrist pulse · Confused.`, [b], { tag: 'alg', p: b, w: false, rr: 24, bad3: true }),
        ],
        alt: [
          fact(`${pName(a)}: Non-walker · Breathing 36/min · Strong pulse · Alert.`, [a], { tag: 'alg', p: a, w: false, rr: 36, bad3: false }),
          fact(`${pName(b)}: Non-walker · Breathing 20/min · Strong pulse · Follows commands.`, [b], { tag: 'alg', p: b, w: false, rr: 20, bad3: false }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Field Check B', wingIndex: 1, label: 'Bays C & D',
        shown: [
          fact(`${pName(c)}: WALKING around shouting · Breathing 36/min · Strong pulse · Alert.`, [c], { tag: 'alg', p: c, w: true, rr: 36, bad3: false }),
          fact(`${pName(d)}: Non-walker · Breathing 35/min · Strong pulse · Alert.`, [d], { tag: 'alg', p: d, w: false, rr: 35, bad3: false }),
        ],
        alt: [
          fact(`${pName(c)}: WALKING around shouting · Breathing 36/min · Strong pulse · Alert.`, [c], { tag: 'alg', p: c, w: true, rr: 36, bad3: false }),
          fact(`${pName(d)}: Non-walker · Breathing 22/min · Strong pulse · Alert.`, [d], { tag: 'alg', p: d, w: false, rr: 22, bad3: false }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Field Check C', wingIndex: 0, label: 'Bays E & F',
        shown: [
          fact(`${pName(e)}: WALKING around triage · Breathing 26/min · Confused over lost wallet.`, [e], { tag: 'alg', p: e, w: true, rr: 26, bad3: true }),
          fact(`${pName(f)}: Non-walker · Breathing 30/min · Strong pulse · Alert.`, [f], { tag: 'alg', p: f, w: false, rr: 30, bad3: false }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'START Tree', wingIndex: 0, label: 'Order & Boundary Rules',
        shown: [
          fact(`Step 1 OVERRIDES Steps 2 & 3: ANY walking bay exits GREEN immediately, regardless of breathing or confusion.`, [], { tag: 'rule' }),
          fact(`Step 2 requires STRICTLY > 30/min (30 exact proceeds to Step 3).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Triage Lead', wingIndex: 1, label: 'Pull All REDs',
        shown: [
          fact(`Execute Step 1 → Step 2 → Step 3 strictly in order on all six bays.`, [], { tag: 'rule' }),
          fact(`Pull EVERY bay outputting RED into immediate Resuscitation.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Mass-Casualty START Tree',
      dispatch: 'Run all six crash bays strictly through Step 1 → Step 2 → Step 3 — watch the walking override and exact-30 edge!',
      order: 'Pull EVERY patient whose exact path through Step 1 → Step 2 → Step 3 outputs RED.',
      hint: 'Check Step 1 (Walking = GREEN, stop!) BEFORE Step 2 (> 30) BEFORE Step 3 (weak pulse or confused).',
      bayDefaultLabel: 'START Triage',
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'alg').map((x) => {
          let tag = 'YELLOW';
          if (x.w) tag = 'GREEN';
          else if (x.rr > 30 || x.bad3) tag = 'RED';
          return { id: x.p, tag };
        });
        const targets = uniqueSortedIds(list.filter((x) => x.tag === 'RED').map((x) => x.id));
        const rivals = list.filter((x) => x.tag !== 'RED').map((x) => x.id);
        return {
          targets,
          proof: `Executing Step 1 → Step 2 → Step 3 in strict order tags ${formatList(targets)} as RED, while walkers exit GREEN at Step 1 and 30/min exact passes to YELLOW.`,
          rival: buildRivalInfo(targets, [c, f, e, a], (r) => {
            const x = list.find((item) => item.id === r);
            return `${pName(r)} exits the flowchart as ${x.tag} (walking at Step 1 or passing Steps 2 & 3).`;
          }),
        };
      },
    };
  },

  // #52 Reverse reasoning (Before · Atomic)
  // Working backward from a hard 03:00 donor-heart landing through 25m + 20m + 15m sequential steps across 6 bays
  'reverse-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Organ Clock', wingIndex: 0, label: '03:00 Hard Deadline',
        shown: [
          fact(`Donor heart lands at 03:00 SHARP — recipient must finish ALL remaining prep steps BY 03:00 (≤ 03:00)!`, [], { tag: 'rule' }),
          fact(`Full prep chain = 25m Crossmatch + 20m Chest Scan + 15m Anesthesia Setup (60 min total if none done yet).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Prep ETAs A', wingIndex: 1, label: 'Bays A & B',
        shown: [
          fact(`${pName(a)}: Needs all 3 steps (Crossmatch + Scan + Setup) · earliest start 01:55.`, [a], { tag: 'rv', p: a, st: 115, nd: 60 }),
          fact(`${pName(b)}: Needs all 3 steps (Crossmatch + Scan + Setup) · earliest start 02:10.`, [b], { tag: 'rv', p: b, st: 130, nd: 60 }),
        ],
        alt: [
          fact(`${pName(a)}: Needs all 3 steps (Crossmatch + Scan + Setup) · earliest start 02:15.`, [a], { tag: 'rv', p: a, st: 135, nd: 60 }),
          fact(`${pName(b)}: Needs all 3 steps (Crossmatch + Scan + Setup) · earliest start 01:50.`, [b], { tag: 'rv', p: b, st: 110, nd: 60 }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Prep ETAs B', wingIndex: 1, label: 'Partial-Done Bays C & D',
        shown: [
          fact(`${pName(c)}: Crossmatch (25m) ALREADY DONE · starts Scan + Setup at 02:20.`, [c], { tag: 'rv', p: c, st: 140, nd: 35 }),
          fact(`${pName(d)}: Setup (15m) ALREADY DONE · starts Crossmatch + Scan at 02:20.`, [d], { tag: 'rv', p: d, st: 140, nd: 45 }),
        ],
        alt: [
          fact(`${pName(c)}: Needs all 3 steps (Crossmatch + Scan + Setup) · starts at 02:20.`, [c], { tag: 'rv', p: c, st: 140, nd: 60 }),
          fact(`${pName(d)}: Crossmatch (25m) ALREADY DONE · starts Scan + Setup at 02:25.`, [d], { tag: 'rv', p: d, st: 145, nd: 35 }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Prep ETAs C', wingIndex: 0, label: 'Bays E & F',
        shown: [
          fact(`${pName(e)}: Chest Scan (20m) ALREADY DONE · starts Crossmatch + Setup at 02:25.`, [e], { tag: 'rv', p: e, st: 145, nd: 40 }),
          fact(`${pName(f)}: Needs all 3 steps (Crossmatch + Scan + Setup) · starts at 02:05.`, [f], { tag: 'rv', p: f, st: 125, nd: 60 }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Organ Clock', wingIndex: 0, label: 'Work Backward From 03:00',
        shown: [
          fact(`Subtract each bay's remaining step minutes from 03:00 to find their latest legal start time.`, [], { tag: 'rule' }),
          fact(`A LATER start time can beat an earlier start time whenever a slow step is already completed!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Transplant OR', wingIndex: 1, label: 'Approve On-Time Bays',
        shown: [
          fact(`Approve EVERY transplant candidate whose Start Time + Remaining Prep ≤ 03:00.`, [], { tag: 'rule' }),
          fact(`Anyone finishing at 03:05 misses the preservation window.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Countdown to 03:00 Organ',
      dispatch: 'Work backward from 03:00 across six transplant bays with different pre-completed steps to find who makes 03:00 sharp.',
      order: 'Prep EVERY transplant candidate who finishes all remaining required steps BY 03:00 sharp (≤ 03:00).',
      hint: 'Compute Start Time + Remaining Minutes (60m full, or subtract already-done steps) and keep everyone ≤ 03:00.',
      bayDefaultLabel: 'Organ Clock',
      cards,
      evaluate(activeCards) {
        const items = factsByTag(activeCards, 'rv').map((x) => ({ id: x.p, fin: x.st + x.nd, nd: x.nd }));
        const targets = uniqueSortedIds(items.filter((x) => x.fin <= 180).map((x) => x.id));
        const rivals = items.filter((x) => x.fin > 180).sort((x, y) => x.fin - y.fin).map((x) => x.id);
        return {
          targets,
          proof: `Working backward from 03:00 proves ONLY ${formatList(targets)} finish ≤ 03:00 (${targets.map((id) => { const x = items.find((r) => r.id === id); return `${pName(id)}: ${x.nd}m done by 0${Math.floor(x.fin / 60)}:${String(x.fin % 60).padStart(2, '0')}`; }).join(', ')}).`,
          rival: buildRivalInfo(targets, rivals, (r) => {
            const x = items.find((item) => item.id === r);
            return `${pName(r)} needs ${x.nd}m and would finish at 03:${String(x.fin - 180).padStart(2, '0')} — missing 03:00.`;
          }),
        };
      },
    };
  },

  // =========================================================================
  // FAMILY 6: CREATIVE & SYNTHETIC REASONING (#53–#61)
  // =========================================================================

  // #53 Divergent reasoning (Inside · Atomic)
  // Counting competing unruled-out lethal hypotheses across 6 bays (≥ 3 open lethal causes vs. 1 explained cause)
  'divergent-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Wide Panel', wingIndex: 0, label: 'Multi-Cause Threshold',
        shown: [
          fact(`Tunnel-vision trap: locking onto "just a cramp" misses deadly mimics!`, [], { tag: 'rule' }),
          fact(`Open a full Parallel Workup ONLY when a bay has ≥ 3 UNRULED-OUT lethal possibilities (fewer = targeted single test).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Bay Clues A', wingIndex: 1, label: 'Open Hypotheses A & B',
        shown: [
          fact(`${pName(a)} (cold painful calf + flight): Artery Clot, Deep Vein Clot, AND Muscle-Pressure Trap ALL still open (3 lethal!).`, [a], { tag: 'hyp', p: a, n: 3 }),
          fact(`${pName(b)} (twisted ankle): X-ray already confirmed 1 clean ligament tear, warm foot (ONLY 1 non-lethal cause).`, [b], { tag: 'hyp', p: b, n: 1 }),
        ],
        alt: [
          fact(`${pName(c)} (cold painful calf + flight): Artery Clot, Deep Vein Clot, AND Muscle-Pressure Trap ALL still open (3 lethal!).`, [c], { tag: 'hyp', p: c, n: 3 }),
          fact(`${pName(b)} (twisted ankle): X-ray already confirmed 1 clean ligament tear, warm foot (ONLY 1 cause).`, [b], { tag: 'hyp', p: b, n: 1 }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Bay Clues B', wingIndex: 1, label: 'Open Hypotheses C & D',
        shown: [
          fact(`${pName(c)} (chest sting): Heart monitor + blood test ruled out clot and attack → ONLY 1 mild muscle strain left.`, [c], { tag: 'hyp', p: c, n: 1 }),
          fact(`${pName(d)} (blackout + black stool): Heart Rhythm Failure, Stomach Bleed, AND Lung Clot ALL still open (3 lethal!).`, [d], { tag: 'hyp', p: d, n: 3 }),
        ],
        alt: [
          fact(`${pName(a)} (chest sting): Heart monitor + blood test ruled out clot and attack → ONLY 1 mild strain left.`, [a], { tag: 'hyp', p: a, n: 1 }),
          fact(`${pName(d)} (blackout + low sugar): Finger-stick confirmed low sugar (40) and recovery after juice → ONLY 1 cause.`, [d], { tag: 'hyp', p: d, n: 1 }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Bay Clues C', wingIndex: 0, label: 'Two-Cause vs. Three-Cause',
        shown: [
          fact(`${pName(e)} (fever + cough): Lung infection OR flu — ONLY 2 causes (targeted chest X-ray, NOT full trauma panel!).`, [e], { tag: 'hyp', p: e, n: 2 }),
          fact(`${pName(f)} (headache): Normal pupils, clean CT ruled out brain bleed → ONLY 1 migraine left.`, [f], { tag: 'hyp', p: f, n: 1 }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Wide Panel', wingIndex: 0, label: 'Compare Hypothesis Counts',
        shown: [
          fact(`Parallel panels pull Ultrasound + Blood Lab + Heart Monitors simultaneously — reserve them for ≥ 3 open lethal mimics!`, [], { tag: 'rule' }),
          fact(`Bays with 1 confirmed cause or 2 routine possibilities get standard targeted tests instead.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Diag Lead', wingIndex: 1, label: 'Order Parallel Panels',
        shown: [
          fact(`Count how many UNRULED-OUT lethal causes remain open per bay.`, [], { tag: 'rule' }),
          fact(`Open a full multi-cause parallel workup for EVERY bay with ≥ 3 open lethal possibilities.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Break Tunnel Vision',
      dispatch: 'Compare how many competing lethal hypotheses remain unruled-out across six bays before opening full parallel panels.',
      order: 'Order a full multi-cause parallel workup for EVERY patient with 3 OR MORE unruled-out lethal possibilities.',
      hint: 'Separate bays with 3 simultaneous lethal mimics from bays already narrowed to 1–2 causes.',
      bayDefaultLabel: 'Wide Workup',
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'hyp');
        const targets = uniqueSortedIds(list.filter((x) => x.n >= 3).map((x) => x.p));
        const rivals = list.filter((x) => x.n < 3).sort((x, y) => y.n - x.n).map((x) => x.p);
        return {
          targets,
          proof: `Comparing unruled-out lethal causes isolates ${formatList(targets)} (3 competing lethal mimics open), demanding parallel workups.`,
          rival: buildRivalInfo(targets, rivals, (r) => {
            const x = list.find((item) => item.p === r);
            return `${pName(r)} only has ${x.n} open possibility left — a targeted test suffices without tying up a full parallel panel.`;
          }),
        };
      },
    };
  },

  // #54 Convergent reasoning (Inside · Atomic)
  // 4-department independent set intersection (Radio ∩ Exam ∩ Blood Lab ∩ Ultrasound) narrowing 6 → 4 → 3 → 2 → 1
  'convergent-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Channel 1 · EMS', wingIndex: 0, label: 'Filter 1: High-Speed Impact',
        shown: [
          fact(`Pulled from the 65-mph highway pileup: ${pName(a)}, ${pName(b)}, ${pName(c)}, and ${pName(d)} (4 of 6).`, [a, b, c, d], { tag: 'f1', ps: [a, b, c, d] }),
          fact(`${pName(e)} & ${pName(f)} arrived from slow parking-lot bumps (OUT at Filter 1).`, [e, f], { tag: 'out', ps: [e, f] }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Channel 2 · Exam', wingIndex: 1, label: 'Filter 2: Pale Clammy Skin',
        shown: [
          fact(`Pale clammy skin present on: ${pName(a)}, ${pName(b)}, ${pName(c)}, AND ${pName(e)} (note: ${pName(e)} failed Filter 1!).`, [a, b, c, e], { tag: 'f2', ps: [a, b, c, e] }),
          fact(`${pName(d)} has warm dry pink skin (OUT at Filter 2).`, [d], { tag: 'out', ps: [d] }),
        ],
        alt: [
          fact(`Pale clammy skin present on: ${pName(b)}, ${pName(c)}, ${pName(d)}, AND ${pName(e)}.`, [b, c, d, e], { tag: 'f2', ps: [b, c, d, e] }),
          fact(`${pName(a)} has warm dry pink skin (OUT at Filter 2).`, [a], { tag: 'out', ps: [a] }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Channel 3 · Lab', wingIndex: 0, label: 'Filter 3: Dropping Blood Count',
        shown: [
          fact(`Repeat blood count dropped sharply in: ${pName(a)}, ${pName(b)}, AND ${pName(f)}.`, [a, b, f], { tag: 'f3', ps: [a, b, f] }),
          fact(`${pName(c)}'s blood count held flat (OUT at Filter 3).`, [c], { tag: 'out', ps: [c] }),
        ],
        alt: [
          fact(`Repeat blood count dropped sharply in: ${pName(b)}, ${pName(d)}, AND ${pName(f)}.`, [b, d, f], { tag: 'f3', ps: [b, d, f] }),
          fact(`${pName(c)}'s blood count held flat (OUT at Filter 3).`, [c], { tag: 'out', ps: [c] }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Channel 4 · Scan', wingIndex: 1, label: 'Filter 4: Pelvic Ultrasound',
        shown: [
          fact(`Pelvic ultrasound POSITIVE for internal fluid in: ${pName(a)} AND ${pName(d)} (remember ${pName(d)}'s earlier filters!).`, [a, d], { tag: 'f4', ps: [a, d] }),
          fact(`${pName(b)}'s pelvic ultrasound is 100% dry (bleed was external arm cut — OUT at Filter 4).`, [b], { tag: 'out', ps: [b] }),
        ],
        alt: [
          fact(`Pelvic ultrasound POSITIVE for internal fluid in: ${pName(d)} AND ${pName(a)}.`, [d, a], { tag: 'f4', ps: [d, a] }),
          fact(`${pName(b)}'s pelvic ultrasound is 100% dry (OUT at Filter 4).`, [b], { tag: 'out', ps: [b] }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Funnel Rule', wingIndex: 0, label: 'Four-Way Intersection',
        shown: [
          fact(`Notice the decoy: TWO bays show a positive scan, YET only ONE passes ALL FOUR independent channels!`, [], { tag: 'rule' }),
          fact(`Intersect Channel 1 ∩ Channel 2 ∩ Channel 3 ∩ Channel 4.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Pelvic OR', wingIndex: 1, label: 'Single Surgical Target',
        shown: [
          fact(`Roll the SINGLE patient confirmed by all four independent hospital channels into Pelvic Surgery.`, [], { tag: 'rule' }),
          fact(`Any bay missing even one channel stays on standard observation.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Four-Channel Funnel',
      dispatch: 'Four independent departments logged overlapping shortlists — intersect all four to find the ONE true surgical target.',
      order: 'Send the SINGLE patient confirmed across ALL FOUR independent channels into Pelvic Surgery.',
      hint: 'Intersect Filter 1 (Pileup) ∩ Filter 2 (Clammy) ∩ Filter 3 (Blood Drop) ∩ Filter 4 (Positive Scan).',
      bayDefaultLabel: 'Funnel Eval',
      cards,
      evaluate(activeCards) {
        const s1 = new Set(factsByTag(activeCards, 'f1').flatMap((x) => x.ps));
        const s2 = new Set(factsByTag(activeCards, 'f2').flatMap((x) => x.ps));
        const s3 = new Set(factsByTag(activeCards, 'f3').flatMap((x) => x.ps));
        const s4 = new Set(factsByTag(activeCards, 'f4').flatMap((x) => x.ps));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => s1.has(id) && s2.has(id) && s3.has(id) && s4.has(id)));
        const rivals = [b, d, c, a].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Intersecting all 4 channels (Pileup ∩ Clammy ∩ Blood Drop ∩ Positive Scan) narrows the entire ward to ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, rivals, (r) => `${pName(r)} passed some channels but dropped out on at least one of the four independent checks.`),
        };
      },
    };
  },

  // #55 Synthetic reasoning (Inside · Composite)
  // Stitching 4 benign-alone fragments across 4 different departments into 1 silent expanding brain bleed
  'synthetic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Desk 1 · Intake', wingIndex: 0, label: 'Fragment 1: Minor Head Bump',
        shown: [
          fact(`Mild cabinet/car-door head bump 2h ago: ${pName(a)}, ${pName(b)}, and ${pName(c)} (all arrived talking normally).`, [a, b, c], { tag: 's1', ps: [a, b, c] }),
          fact(`${pName(d)}, ${pName(e)}, and ${pName(f)} had ZERO head impact tonight.`, [d, e, f], { tag: 'no1', ps: [d, e, f] }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Desk 2 · Meds', wingIndex: 1, label: 'Fragment 2: Daily Blood Thinner',
        shown: [
          fact(`Pharmacy sync shows daily prescription BLOOD THINNER on: ${pName(a)}, ${pName(e)}, and ${pName(f)}.`, [a, e, f], { tag: 's2', ps: [a, e, f] }),
          fact(`${pName(b)}, ${pName(c)}, and ${pName(d)} take ZERO blood thinners.`, [b, c, d], { tag: 'no2', ps: [b, c, d] }),
        ],
        alt: [
          fact(`Pharmacy sync shows daily prescription BLOOD THINNER on: ${pName(b)}, ${pName(e)}, and ${pName(f)}.`, [b, e, f], { tag: 's2', ps: [b, e, f] }),
          fact(`${pName(a)}, ${pName(c)}, and ${pName(d)} take ZERO blood thinners.`, [a, c, d], { tag: 'no2', ps: [a, c, d] }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Desk 3 · Waiting', wingIndex: 0, label: 'Fragment 3: Sudden Vomit + Drowsy',
        shown: [
          fact(`Aide logged sudden vomiting + new drowsiness in: ${pName(a)}, ${pName(b)}, and ${pName(d)} (food poisoning in ${pName(d)}).`, [a, b, d], { tag: 's3', ps: [a, b, d] }),
          fact(`${pName(c)}, ${pName(e)}, and ${pName(f)} remain wide awake with zero nausea.`, [c, e, f], { tag: 'no3', ps: [c, e, f] }),
        ],
        alt: [
          fact(`Aide logged sudden vomiting + new drowsiness in: ${pName(b)}, ${pName(c)}, and ${pName(d)}.`, [b, c, d], { tag: 's3', ps: [b, c, d] }),
          fact(`${pName(a)}, ${pName(e)}, and ${pName(f)} remain wide awake with zero nausea.`, [a, e, f], { tag: 'no3', ps: [a, e, f] }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Desk 4 · Eyes', wingIndex: 1, label: 'Fragment 4: Unequal Pupils',
        shown: [
          fact(`Flashlight check: ONE widened pupil in ${pName(a)} AND ${pName(f)} (${pName(f)} uses eye-dilation drops for glaucoma!).`, [a, f], { tag: 's4', ps: [a, f] }),
          fact(`${pName(b)}, ${pName(c)}, ${pName(d)}, and ${pName(e)} have crisp equal pupils.`, [b, c, d, e], { tag: 'no4', ps: [b, c, d, e] }),
        ],
        alt: [
          fact(`Flashlight check: ONE widened pupil in ${pName(b)} AND ${pName(f)} (${pName(f)} uses eye-dilation drops!).`, [b, f], { tag: 's4', ps: [b, f] }),
          fact(`${pName(a)}, ${pName(c)}, ${pName(d)}, and ${pName(e)} have crisp equal pupils.`, [a, c, d, e], { tag: 'no4', ps: [a, c, d, e] }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Hidden Whole', wingIndex: 0, label: '4 Quiet Clues → 1 Bleed',
        shown: [
          fact(`Alone, each clue looks harmless — TOGETHER, Bump + Blood Thinner + Drowsy Vomit + Unequal Pupil = EXPANDING BRAIN BLEED!`, [], { tag: 'rule' }),
          fact(`Check who connects across ALL FOUR separate desks.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Head CT', wingIndex: 1, label: 'STAT Reversal & Scan',
        shown: [
          fact(`Rush the SINGLE bay uniting all 4 scattered clues straight to Head CT and thinner reversal!`, [], { tag: 'rule' }),
          fact(`Do not get tricked by ${pName(f)}'s eye drops or ${pName(d)}'s bad seafood.`, [f, d], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Four Quiet Clues, One Bleed',
      dispatch: 'No single desk sees an emergency alone — unite four scattered fragments to uncover a silent expanding brain bleed.',
      order: 'Rush the SINGLE patient uniting ALL FOUR scattered clues (Bump + Thinner + Drowsy Vomit + Unequal Pupil) to Head CT.',
      hint: 'Find the one patient appearing in all 4 separate desk reports (Bump, Thinner, Vomit, Unequal Pupil).',
      bayDefaultLabel: '4-Clue Check',
      cards,
      evaluate(activeCards) {
        const s1 = new Set(factsByTag(activeCards, 's1').flatMap((x) => x.ps));
        const s2 = new Set(factsByTag(activeCards, 's2').flatMap((x) => x.ps));
        const s3 = new Set(factsByTag(activeCards, 's3').flatMap((x) => x.ps));
        const s4 = new Set(factsByTag(activeCards, 's4').flatMap((x) => x.ps));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => s1.has(id) && s2.has(id) && s3.has(id) && s4.has(id)));
        const rivals = [f, b, d, e, a].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Uniting all 4 scattered fragments (Head Bump + Daily Blood Thinner + Drowsy Vomit + Unequal Pupil) exposes an expanding brain bleed in ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, rivals, (r) =>
            r === f ? `${pName(f)} has an unequal pupil from glaucoma drops and zero head bump or drowsiness.` : `${pName(r)} only carries 1–2 isolated benign fragments, not the full 4-part bleed picture.`
          ),
        };
      },
    };
  },

  // #56 Dialectical reasoning (Inside · Composite)
  // Reconciling Surgeon ("Operate now!") vs. Heart Doctor ("General anesthesia kills!") via Hybrid Pinhole Suite across 6 bays
  'dialectical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Case Clash', wingIndex: 0, label: 'Two Clashing Truths',
        shown: [
          fact(`Surgeon: "Active internal bleed MUST be plugged!" vs. Heart Doctor: "Weak heart (< 25% pump) CANNOT survive general anesthesia!"`, [], { tag: 'rule' }),
          fact(`Third-Way Resolution: Local-numbing Hybrid Pinhole Catheter plugs the bleed WITHOUT general anesthesia!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Bleed Scan', wingIndex: 1, label: 'Active Internal Bleed Status',
        shown: [
          fact(`Active internal spleen/pelvis bleed confirmed in: ${pName(a)}, ${pName(b)}, and ${pName(e)}.`, [a, b, e], { tag: 'bleed', ps: [a, b, e] }),
          fact(`${pName(c)}, ${pName(d)}, and ${pName(f)} have ZERO internal bleeding (no plug needed!).`, [c, d, f], { tag: 'nob', ps: [c, d, f] }),
        ],
        alt: [
          fact(`Active internal spleen/pelvis bleed confirmed in: ${pName(c)}, ${pName(b)}, and ${pName(e)}.`, [c, b, e], { tag: 'bleed', ps: [c, b, e] }),
          fact(`${pName(a)}, ${pName(d)}, and ${pName(f)} have ZERO internal bleeding (no plug needed!).`, [a, d, f], { tag: 'nob', ps: [a, d, f] }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Heart Echo', wingIndex: 0, label: 'Anesthesia Tolerance (< 25% Pump)',
        shown: [
          fact(`Pump < 25% (general anesthesia FATAL!): ${pName(a)}, ${pName(c)}, and ${pName(d)}.`, [a, c, d], { tag: 'weak_h', ps: [a, c, d] }),
          fact(`${pName(b)}, ${pName(e)}, and ${pName(f)} have strong hearts (55–65% pump → standard open OR is safe!).`, [b, e, f], { tag: 'strong_h', ps: [b, e, f] }),
        ],
        alt: [
          fact(`Pump < 25% (general anesthesia FATAL!): ${pName(c)}, ${pName(d)}, and ${pName(f)}.`, [c, d, f], { tag: 'weak_h', ps: [c, d, f] }),
          fact(`${pName(a)}, ${pName(b)}, and ${pName(e)} have strong hearts (55–65% pump → standard open OR is safe!).`, [a, b, e], { tag: 'strong_h', ps: [a, b, e] }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'OR Routing', wingIndex: 1, label: 'Standard Routes for Non-Clashes',
        shown: [
          fact(`Bleed + Strong Heart (${pName(b)}, ${pName(e)}) → fast standard open OR (don't tie up the Hybrid Suite!).`, [b, e], { tag: 'note' }),
          fact(`Weak Heart + Zero Bleed → heart-failure pills in ICU (no bleeding procedure needed!).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Case Clash', wingIndex: 0, label: 'Isolate the True Clash',
        shown: [
          fact(`Only ONE Hybrid Pinhole Suite exists — assign it strictly where BOTH opposing dangers collide!`, [], { tag: 'rule' }),
          fact(`Intersect Active Internal Bleed ∩ Heart Pump < 25%.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Hybrid Suite', wingIndex: 1, label: 'Book Hybrid Pinhole',
        shown: [
          fact(`Send the SINGLE patient caught in BOTH active bleeding AND anesthesia-fatal heart failure to Hybrid Pinhole.`, [], { tag: 'rule' }),
          fact(`All one-sided bays route to standard open OR or heart ICU.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Surgeon vs. Heart Doctor',
      dispatch: 'Cross-link Active Bleed scans against Weak-Heart echoes to assign the lone local-numbing Hybrid Pinhole Suite.',
      order: 'Assign the lone Hybrid Pinhole Suite to the SINGLE patient with BOTH active internal bleed AND heart pump < 25%.',
      hint: 'Intersect the Active Internal Bleed list with the Heart Pump < 25% list.',
      bayDefaultLabel: 'Hybrid Clash',
      cards,
      evaluate(activeCards) {
        const bl = new Set(factsByTag(activeCards, 'bleed').flatMap((x) => x.ps));
        const wh = new Set(factsByTag(activeCards, 'weak_h').flatMap((x) => x.ps));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => bl.has(id) && wh.has(id)));
        const rivals = [b, c, d, e, a].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Intersecting Active Internal Bleed with Weak Heart (< 25%) isolates ${formatList(targets)} — the sole bay needing local pinhole plugging without general anesthesia.`,
          rival: buildRivalInfo(targets, rivals, (r) =>
            bl.has(r) ? `${pName(r)} is bleeding, but has a strong heart safe for standard open OR.` : `${pName(r)} has a weak heart with zero internal bleeding — needs heart meds, not bleed plugging.`
          ),
        };
      },
    };
  },

  // #57 First-principles reasoning (Inside · Composite)
  // Computing true O2 delivery from scratch: (Red-Cell Fleet × Clip % × Pump Factor) across 6 bays
  'first-principles': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Core Physics', wingIndex: 0, label: 'Oxygen Delivery Equation',
        shown: [
          fact(`Brain Oxygen Delivery = (Red-Cell Trucks) × (Finger-Clip Fullness %) × (Pump Speed: 1.0 normal, 0.5 half-speed).`, [], { tag: 'rule' }),
          fact(`A shiny 99% clip ONLY measures how full each remaining truck is — NOT how many trucks are left!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Fleet & Clip A', wingIndex: 1, label: 'Bays A & B',
        shown: [
          fact(`${pName(a)}: 6 trucks × 99% clip × 1.0 pump (HIGHER clip than ${pName(b)}, LESS THAN HALF the trucks).`, [a, b], { tag: 'fp', p: a, tr: 6, cl: 0.99, pm: 1.0 }),
          fact(`${pName(b)}: 14 trucks × 92% clip × 1.0 pump (LOWEST finger clip on the floor).`, [b], { tag: 'fp', p: b, tr: 14, cl: 0.92, pm: 1.0 }),
        ],
        alt: [
          fact(`${pName(a)}: 14 trucks × 94% clip × 1.0 pump.`, [a], { tag: 'fp', p: a, tr: 14, cl: 0.94, pm: 1.0 }),
          fact(`${pName(b)}: 6 trucks × 99% clip × 1.0 pump (HIGHER clip than ${pName(a)}, HALF the trucks).`, [b, a], { tag: 'fp', p: b, tr: 6, cl: 0.99, pm: 1.0 }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Fleet & Clip B', wingIndex: 1, label: 'Bays C & D',
        shown: [
          fact(`${pName(c)}: 14 trucks × 96% clip × 0.5 pump.`, [c], { tag: 'fp', p: c, tr: 14, cl: 0.96, pm: 0.5 }),
          fact(`${pName(d)}: 15 trucks × 94% clip × 1.0 pump.`, [d], { tag: 'fp', p: d, tr: 15, cl: 0.94, pm: 1.0 }),
        ],
        alt: [
          fact(`${pName(c)}: 14 trucks × 96% clip × 1.0 pump.`, [c], { tag: 'fp', p: c, tr: 14, cl: 0.96, pm: 1.0 }),
          fact(`${pName(d)}: 12 trucks × 98% clip × 0.5 pump.`, [d], { tag: 'fp', p: d, tr: 12, cl: 0.98, pm: 0.5 }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Fleet & Clip C', wingIndex: 0, label: 'Bays E & F',
        shown: [
          fact(`${pName(e)}: 12 trucks × 95% clip × 1.0 pump.`, [e], { tag: 'fp', p: e, tr: 12, cl: 0.95, pm: 1.0 }),
          fact(`${pName(f)}: 11 trucks × 93% clip × 1.0 pump.`, [f], { tag: 'fp', p: f, tr: 11, cl: 0.93, pm: 1.0 }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Core Physics', wingIndex: 0, label: 'Starvation Line (< 8.0)',
        shown: [
          fact(`Brain starvation strikes whenever (Trucks × Clip% × Pump) drops BELOW 8.0 units!`, [], { tag: 'rule' }),
          fact(`Watch BOTH hidden collapses: lost red-cell trucks OR a 0.5 half-speed pump hiding behind 96–99% clips!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'ICU Resus', wingIndex: 1, label: 'Rescue Starving Brains',
        shown: [
          fact(`Multiply Trucks × Clip% × Pump from basic physics for all six bays.`, [], { tag: 'rule' }),
          fact(`Rescue EVERY bay whose true total oxygen delivery fell BELOW 8.0 units.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'The 99% Oxygen Illusion',
      dispatch: 'Ignore shiny 96–99% clips — multiply (Red-Cell Trucks × Clip % × Pump Speed) from scratch to catch total delivery < 8.0.',
      order: 'Rescue EVERY patient whose TRUE total oxygen delivery (Trucks × Clip% × Pump) dropped BELOW 8.0.',
      hint: 'Check BOTH low red-cell fleets (6 trucks) AND 0.5 half-speed pumps hiding behind high finger-clip numbers!',
      bayDefaultLabel: 'O2 Physics',
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'fp').map((x) => ({ id: x.p, del: x.tr * x.cl * x.pm, tr: x.tr, cl: Math.round(x.cl * 100), pm: x.pm }));
        const targets = uniqueSortedIds(list.filter((x) => x.del < 8.0).map((x) => x.id));
        const rivals = list.filter((x) => x.del >= 8.0).sort((x, y) => x.del - y.del).map((x) => x.id);
        return {
          targets,
          proof: `Computing Trucks × Clip% × Pump puts ${formatList(targets)} below 8.0 (${targets.map((id) => { const x = list.find((r) => r.id === id); return `${pName(id)}: ${x.tr}×${x.cl}%×${x.pm}=${x.del.toFixed(1)}`; }).join(', ')}) despite 96–99% clips.`,
          rival: buildRivalInfo(targets, rivals, (r) => {
            const x = list.find((item) => item.id === r);
            return `${pName(r)} delivers ${x.del.toFixed(1)} units (${x.tr}×${x.cl}%×${x.pm}) — safely above 8.0 even with a 92–94% clip.`;
          }),
        };
      },
    };
  },

  // #58 Lateral reasoning (Before · Composite)
  // Inverting the loudness cue: Loudness proves airflow; separate Silent + Blue/Struggling from Silent + Peaceful Sleep
  'lateral-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Airway Flip', wingIndex: 0, label: 'The Loudness Inversion',
        shown: [
          fact(`Counter-intuitive physics: LOUD SCREAMING proves air is rushing through an OPEN windpipe!`, [], { tag: 'rule' }),
          fact(`Deadly airway block = COMPLETELY SILENT + struggling/blue lips (OPPOSITE OF both screaming AND peaceful pink sleep!).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Noise Level', wingIndex: 1, label: 'Volume Comparison A',
        shown: [
          fact(`${pName(a)} is yelling LOUDER THAN everyone over a bloody broken wrist (proves wide-open airway!).`, [a], { tag: 'vol', p: a, silent: false }),
          fact(`${pName(b)} is crying loudly over a scalp scrape (strong voice → open windpipe, SAME AS ${pName(a)}).`, [b, a], { tag: 'vol', p: b, silent: false }),
        ],
        alt: [
          fact(`${pName(a)} went COMPLETELY SILENT — quieter than everyone while clutching their throat!`, [a], { tag: 'vol', p: a, silent: true }),
          fact(`${pName(b)} is crying loudly over a scalp scrape (strong voice → open windpipe!).`, [b], { tag: 'vol', p: b, silent: false }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Noise Level', wingIndex: 1, label: 'Volume Comparison B',
        shown: [
          fact(`${pName(c)} & ${pName(d)} are BOTH completely SILENT — zero words, zero yells.`, [c, d], { tag: 'vol_pair', ps: [c, d], silent: true }),
          fact(`${pName(e)} is shouting loudly at triage; ${pName(f)} is ALSO silent in the corner chair.`, [e, f], { tag: 'vol_f', p: f, silent: true }),
        ],
        alt: [
          fact(`${pName(c)} is yelling loudly about a bruised shin; ${pName(d)} & ${pName(f)} are completely SILENT.`, [c, d, f], { tag: 'vol_pair', ps: [d, f], silent: true }),
          fact(`${pName(e)} is shouting loudly at triage (strong clear lungs).`, [e], { tag: 'vol', p: e, silent: false }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Lip & Chest', wingIndex: 0, label: 'Separate Silent Distress vs. Sleep',
        shown: [
          fact(`${pName(c)}: Widening panicked eyes + blue-tinted lips + zero chest rise (ZERO airflow!).`, [c], { tag: 'blue', p: c }),
          fact(`${pName(d)}: Deep steady rhythmic breaths + warm pink lips (peaceful post-med nap!).`, [d], { tag: 'pink', p: d }),
        ],
        alt: [
          fact(`${pName(a)}: Widening panicked eyes + blue-tinted lips + zero chest rise (ZERO airflow!).`, [a], { tag: 'blue', p: a }),
          fact(`${pName(d)}: Deep steady rhythmic breaths + warm pink lips (peaceful post-med nap!).`, [d], { tag: 'pink', p: d }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Lip & Chest', wingIndex: 0, label: 'Corner Chair Check',
        shown: [
          fact(`${pName(f)}: Quietly reading on headphones, pink cheeks, steady breathing (NOT choking!).`, [f], { tag: 'pink', p: f }),
          fact(`Look how THREE bays are silent — ONLY combining Silence WITH Blue Lips / Zero Airflow finds the choking victim!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Airway Rescue', wingIndex: 1, label: 'Clear Blocked Throat',
        shown: [
          fact(`Bypass the loud screamers AND peaceful quiet bays.`, [], { tag: 'rule' }),
          fact(`Rush immediately to the SINGLE silently suffocating patient.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'The Silent Waiting Room',
      dispatch: 'Flip the loudness instinct upside down — separate silent zero-airflow suffocation from loud screamers and peaceful quiet bays.',
      order: 'Rush straight past the loud distractions to clear the airway of the SINGLE silently suffocating patient.',
      hint: 'Intersect Completely Silent WITH Blue Lips / Zero Chest Rise — skip loud yellings and pink quiet bays.',
      bayDefaultLabel: 'Airway Flip',
      cards,
      evaluate(activeCards) {
        const silent = new Set([
          ...factsByTag(activeCards, 'vol').filter((x) => x.silent).map((x) => x.p),
          ...factsByTag(activeCards, 'vol_pair').filter((x) => x.silent).flatMap((x) => x.ps),
          ...factsByTag(activeCards, 'vol_f').filter((x) => x.silent).map((x) => x.p),
        ]);
        const blue = new Set(factsByTag(activeCards, 'blue').map((x) => x.p));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => silent.has(id) && blue.has(id)));
        const rivals = [d, f, a, b, c].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Inverting the noise instinct (loud yelling = open airway) and checking lip color among silent bays catches ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, rivals, (r) =>
            silent.has(r) ? `${pName(r)} is silent, but warm pink lips and steady rhythmic breathing confirm peaceful rest.` : `${pName(r)}'s loud shouting proves air is rushing freely through an open airway.`
          ),
        };
      },
    };
  },

  // #59 Generative reasoning (Inside · Composite)
  // Functional equivalence mapping: matching improvised closet physics (Compression, Evaporation, Splint) vs. Irreplaceable Hardware across 6 bays
  'generative-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Closet Gear', wingIndex: 0, label: 'Improvisable Physics',
        shown: [
          fact(`Quake cut power & trucks! Closet holds ONLY: Cotton Sheets + Clamps + Cold Water + Battery Box Fans + Wood Boards.`, [], { tag: 'rule' }),
          fact(`Functional matches: Tight Sheet = Pelvic Binder · Wet Sheet + Fan = Heatstroke Cooler. Deep internal valve/brain hardware CANNOT be improvised!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Quake Bays A', wingIndex: 1, label: 'Compression vs. Valve Tear',
        shown: [
          fact(`${pName(a)}: Open-book crushed pelvis bleeding internally — tight external hip compression stops bleed.`, [a], { tag: 'imp', p: a, ok: true }),
          fact(`${pName(b)}: Deep torn heart valve — requires electric Heart-Lung Bypass machine.`, [b], { tag: 'imp', p: b, ok: false }),
        ],
        alt: [
          fact(`${pName(a)}: Deep torn heart valve — requires electric Heart-Lung Bypass machine.`, [a], { tag: 'imp', p: a, ok: false }),
          fact(`${pName(b)}: Open-book crushed pelvis bleeding internally — tight external hip compression stops bleed.`, [b], { tag: 'imp', p: b, ok: true }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Quake Bays B', wingIndex: 1, label: 'Cooling vs. Brain Coil',
        shown: [
          fact(`${pName(c)}: 105°F heatstroke — rapid evaporative skin cooling drops core temperature.`, [c], { tag: 'imp', p: c, ok: true }),
          fact(`${pName(d)}: Deep ruptured brain artery — requires micro-catheter laser coil.`, [d], { tag: 'imp', p: d, ok: false }),
        ],
        alt: [
          fact(`${pName(c)}: Deep ruptured brain artery — requires micro-catheter laser coil.`, [c], { tag: 'imp', p: c, ok: false }),
          fact(`${pName(d)}: 105°F heatstroke — rapid evaporative skin cooling drops core temperature.`, [d], { tag: 'imp', p: d, ok: true }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Quake Bays C', wingIndex: 0, label: 'Dialysis & Stable Check',
        shown: [
          fact(`${pName(e)}: Complete kidney shutdown with toxic blood potassium — requires electric Dialysis filter.`, [e], { tag: 'imp', p: e, ok: false }),
          fact(`${pName(f)}: Straight bruised forearm — ALREADY stabilized with a wood-board splint, steady vitals.`, [f], { tag: 'imp', p: f, ok: false }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Closet Gear', wingIndex: 0, label: 'External Force vs. Internal Machine',
        shown: [
          fact(`Notice the unifying line: external mechanical compression & evaporation CAN be built from closet gear; internal pumps/coils/filters CANNOT!`, [], { tag: 'rule' }),
          fact(`Tag irreplaceable-machine cases (${pName(e)}, etc.) for helicopter airlift instead.`, [e], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Field Lead', wingIndex: 1, label: 'Deploy On-Site Bridges',
        shown: [
          fact(`Treat ON-SITE every critical bay whose physics can be genuinely matched with closet sheets, clamps, water, and fans.`, [], { tag: 'rule' }),
          fact(`Skip already-splinted minor bays and irreplaceable-machine airlifts.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Earthquake Field Bridges',
      dispatch: 'Map external compression and evaporative cooling physics from closet supplies across six quake casualties.',
      order: 'Stabilize ON-SITE every critical patient whose physics can genuinely be bridged with sheets, clamps, water, and fans.',
      hint: 'Match pelvic compression (Sheet + Clamps) and evaporative cooling (Wet Sheet + Fan) — airlift internal pump/coil/dialysis cases.',
      bayDefaultLabel: 'Quake Bridge',
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'imp');
        const targets = uniqueSortedIds(list.filter((x) => x.ok).map((x) => x.p));
        const rivals = list.filter((x) => !x.ok).map((x) => x.p);
        return {
          targets,
          proof: `Mapping closet physics (knotted-sheet hip compression + wet-sheet fan evaporation) stabilizes ${formatList(targets)} on-site.`,
          rival: buildRivalInfo(targets, rivals, (r) =>
            r === f ? `${pName(f)} is already splinted and non-critical.` : `${pName(r)}'s internal valve, brain-coil, or dialysis failure cannot be improvised with closet gear.`
          ),
        };
      },
    };
  },

  // #60 Decompositional reasoning (Inside · Composite)
  // Breaking 6 identical-count 4-injury piles into [Fatal Untreated] vs [Fatal Already Fixed] vs [Noisy Non-Fatal]
  'decompositional-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Sub-Task Rule', wingIndex: 0, label: 'Separate Fatal From Noisy',
        shown: [
          fact(`Every crash bay has 3–4 injuries listed — IGNORE gruesome non-fatal scrapes (broken nose, bloody scalp, forearm break)!`, [], { tag: 'rule' }),
          fact(`Rush ONLY bays hiding an UNTREATED fatal threat (sucking chest wound, spurting artery, swelling airway) — NOT already-fixed tubes!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Injury Lists A', wingIndex: 1, label: 'Bays A & B (4 Items Each)',
        shown: [
          fact(`${pName(a)}: Broken nose + torn lip + cracked collarbone + UNTREATED sucking chest stab!`, [a], { tag: 'dec', p: a, bad: true }),
          fact(`${pName(b)}: Bloody scalp + broken forearm + chipped tooth + bruised shin (ZERO airway/chest/artery threat!).`, [b], { tag: 'dec', p: b, bad: false }),
        ],
        alt: [
          fact(`${pName(a)}: Bloody scalp + broken forearm + chipped tooth + bruised shin (all vitals steady!).`, [a], { tag: 'dec', p: a, bad: false }),
          fact(`${pName(b)}: Broken nose + torn lip + cracked collarbone + UNTREATED sucking chest stab!`, [b], { tag: 'dec', p: b, bad: true }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'Injury Lists B', wingIndex: 1, label: 'Bays C & D (3–4 Items Each)',
        shown: [
          fact(`${pName(c)}: Collapsed lung (ALREADY FIXED with working chest tube, O2 99%!) + broken finger + scraped knee.`, [c], { tag: 'dec', p: c, bad: false, fixed: true }),
          fact(`${pName(d)}: Muddy coat + twisted ankle + UNTREATED bright-red spurting groin artery!`, [d], { tag: 'dec', p: d, bad: true }),
        ],
        alt: [
          fact(`${pName(c)}: Collapsed lung (ALREADY FIXED with working chest tube, O2 99%!) + broken finger.`, [c], { tag: 'dec', p: c, bad: false, fixed: true }),
          fact(`${pName(d)}: Muddy coat + twisted ankle + bruised hip (dry scan, steady BP 122/76!).`, [d], { tag: 'dec', p: d, bad: false }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Injury Lists C', wingIndex: 0, label: 'Bays E & F (Fixed vs. Noisy)',
        shown: [
          fact(`${pName(e)}: Thigh artery cut (ALREADY STOPPED with tight tourniquet, BP 118/76!) + broken collarbone.`, [e], { tag: 'dec', p: e, bad: false, fixed: true }),
          fact(`${pName(f)}: Two blackened eyes + bloody nose + scraped palm (clear throat, steady vitals!).`, [f], { tag: 'dec', p: f, bad: false }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Sub-Task Rule', wingIndex: 0, label: 'Don’t Double-Count Fixed Tubes',
        shown: [
          fact(`Look at ${pName(c)} and ${pName(e)}: their severe injuries are ALREADY controlled — don't pull teams away from untreated bleeds!`, [c, e], { tag: 'note' }),
          fact(`Check the last item of each pile carefully for UNTREATED chest/artery/airway killers.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Resus Lead', wingIndex: 1, label: 'Treat Untreated Killers',
        shown: [
          fact(`Strip away the gruesome non-fatal items and already-controlled injuries.`, [], { tag: 'rule' }),
          fact(`Rush EVERY bay still carrying an UNTREATED life-threatening injury.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Peel Away the Noise',
      dispatch: 'All six bays arrive with dramatic multi-injury lists — strip away non-fatal noise and already-fixed tubes.',
      order: 'Intervene immediately on EVERY patient still carrying an UNTREATED life-threatening injury.',
      hint: 'Separate UNTREATED chest/artery killers from bloody non-fatal fractures and ALREADY FIXED chest tubes/tourniquets.',
      bayDefaultLabel: 'Multi-Injury',
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'dec');
        const targets = uniqueSortedIds(list.filter((x) => x.bad).map((x) => x.p));
        const rivals = list.filter((x) => !x.bad).map((x) => x.p);
        return {
          targets,
          proof: `Splitting every list into Untreated-Fatal vs. Fixed vs. Non-Fatal isolates ${formatList(targets)} (untreated sucking chest / spurting artery).`,
          rival: buildRivalInfo(targets, [c, e, b, f], (r) => {
            const x = list.find((item) => item.p === r);
            return x && x.fixed
              ? `${pName(r)}'s severe injury is ALREADY controlled (working chest tube or tourniquet) with steady vitals.`
              : `${pName(r)}'s injuries look gruesome, but every single item is non-fatal.`;
          }),
        };
      },
    };
  },

  // #61 Emergent reasoning (Inside · Composite)
  // Safe-alone / lethal-together 2-drug intersection (Home Pill X ∩ ER Shot Y) across all 6 bays
  'emergent-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:02', wing: 'Combo Rule', wingIndex: 0, label: 'Safe Alone, Toxic Together',
        shown: [
          fact(`Home Pill X (Mood Booster) is safe alone; ER Shot Y (Migraine/Pain) is safe alone.`, [], { tag: 'rule' }),
          fact(`ONLY when Pill X + Shot Y collide in the SAME bloodstream does a toxic fever-and-seizure storm erupt!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '01:06', wing: 'Home Meds', wingIndex: 1, label: 'List 1: Daily Pill X (Home)',
        shown: [
          fact(`Active daily Pill X at home: ${pName(a)}, ${pName(b)}, and ${pName(e)}.`, [a, b, e], { tag: 'px', ps: [a, b, e] }),
          fact(`${pName(c)}, ${pName(d)}, and ${pName(f)} stopped Pill X over 6 months ago (ZERO Pill X in blood!).`, [c, d, f], { tag: 'nox', ps: [c, d, f] }),
        ],
        alt: [
          fact(`Active daily Pill X at home: ${pName(b)}, ${pName(c)}, and ${pName(e)}.`, [b, c, e], { tag: 'px', ps: [b, c, e] }),
          fact(`${pName(a)}, ${pName(d)}, and ${pName(f)} have ZERO Pill X in blood.`, [a, d, f], { tag: 'nox', ps: [a, d, f] }),
        ],
      }),
      makeCard({
        index: 2, time: '01:10', wing: 'ER Injections', wingIndex: 0, label: 'List 2: ER Shot Y Given',
        shown: [
          fact(`ER nurse just injected Shot Y into: ${pName(a)}, ${pName(c)}, and ${pName(d)}.`, [a, c, d], { tag: 'py', ps: [a, c, d] }),
          fact(`${pName(b)}, ${pName(e)}, and ${pName(f)} received plain saline + ice only (ZERO Shot Y!).`, [b, e, f], { tag: 'noy', ps: [b, e, f] }),
        ],
        alt: [
          fact(`ER nurse just injected Shot Y into: ${pName(c)}, ${pName(d)}, and ${pName(f)}.`, [c, d, f], { tag: 'py', ps: [c, d, f] }),
          fact(`${pName(a)}, ${pName(b)}, and ${pName(e)} received plain saline + ice only (ZERO Shot Y!).`, [a, b, e], { tag: 'noy', ps: [a, b, e] }),
        ],
      }),
      makeCard({
        index: 3, time: '01:14', wing: 'Pharmacy Note', wingIndex: 1, label: 'Single-Drug Decoy Check',
        shown: [
          fact(`${pName(b)} & ${pName(e)} took double-strength Pill X (still safe WITHOUT Shot Y!).`, [b, e], { tag: 'note' }),
          fact(`${pName(d)} took double-strength Shot Y (still safe WITHOUT Pill X!).`, [d], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '01:17', wing: 'Combo Rule', wingIndex: 0, label: 'Interaction ≠ Dose Size',
        shown: [
          fact(`High dose of ONE drug alone never triggers the collision — ONLY the cross-list overlap (X ∩ Y) does!`, [], { tag: 'rule' }),
          fact(`Cross-reference List 1 (Pill X) directly against List 2 (Shot Y).`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '01:20', wing: 'Tox Blocker', wingIndex: 1, label: 'Stop the Collision',
        shown: [
          fact(`Pull the SINGLE patient carrying BOTH Pill X AND Shot Y into immediate blocker rescue!`, [], { tag: 'rule' }),
          fact(`Single-drug bays stay safely on routine observation.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Safe Alone, Toxic Together',
      dispatch: 'Two safe medications just collided in ONE bloodstream — intersect List 1 (Home Pill X) with List 2 (ER Shot Y).',
      order: 'Rush the SINGLE patient who received BOTH Home Pill X AND ER Shot Y into blocker rescue.',
      hint: 'Find the single overlap between List 1 (Pill X) and List 2 (Shot Y) — ignore double doses of a single drug!',
      bayDefaultLabel: 'Drug Collision',
      cards,
      evaluate(activeCards) {
        const px = new Set(factsByTag(activeCards, 'px').flatMap((x) => x.ps));
        const py = new Set(factsByTag(activeCards, 'py').flatMap((x) => x.ps));
        const targets = uniqueSortedIds([a, b, c, d, e, f].filter((id) => px.has(id) && py.has(id)));
        const rivals = [b, d, e, c, a, f].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Intersecting Home Pill X with ER Shot Y isolates ${formatList(targets)} as the lone two-drug collision triggering the toxic storm.`,
          rival: buildRivalInfo(targets, rivals, (r) => `${pName(r)} only received ONE of the two medications (or neither), which cannot trigger the two-drug interaction.`),
        };
      },
    };
  },
};
