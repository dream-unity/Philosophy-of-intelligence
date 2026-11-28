// Deep Plain-English Clinical Reasoning Engines — Families 5 & 6 (#42–#61)
// Strategic, systemic, risk, decision-theoretic, algorithmic, creative & synthetic trauma emergencies.
// Zero filler cards, zero pre-computed answer giveaways, zero medical jargon, synchronized left-wall labels.

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

export const SEMANTIC_F56 = {
  // =========================================================================
  // FAMILY 5: STRATEGIC & SYSTEMIC REASONING (#42–#52)
  // =========================================================================

  // #42 Systems reasoning (Inside · Composite)
  'systems-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'ICU Systems', wingIndex: 0, label: 'Runaway Feedback Spiral',
        shown: [
          fact(`Self-correcting loop: cold body → shivering → makes heat → body warms back up (safe!).`, [], { tag: 'rule' }),
          fact(`Runaway DEATH SPIRAL: Heavy Bleeding + Freezing Body (< 95°F) → blood loses clotting power → bleeds EVEN FASTER → gets EVEN COLDER!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Bay Monitors', wingIndex: 1, label: 'Temp & Bleeding A',
        shown: [
          fact(`${pName(a)}: Active belly bleeding + body temp dropped to 93.4°F + blood stopped forming clots.`, a, { tag: 'spiral' }),
          fact(`${pName(b)}: Cold 94.8°F after lake rescue, ZERO bleeding, shivering strongly (warming up on their own!).`, b, { tag: 'self_fix' }),
        ],
        alt: [
          fact(`${pName(c)}: Active belly bleeding + body temp dropped to 93.4°F + blood stopped forming clots.`, c, { tag: 'spiral' }),
          fact(`${pName(b)}: Cold 94.8°F after lake rescue, ZERO bleeding, shivering strongly (warming up on their own!).`, b, { tag: 'self_fix' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Bay Monitors', wingIndex: 1, label: 'Temp & Bleeding B',
        shown: [
          fact(`${pName(c)}: Moderate leg cut, warm body 98.4°F, blood clotting nicely under pressure gauze.`, c, { tag: 'stable_bleed' }),
          fact(`${pName(d)}: Mild 100.8°F fever + sweating to cool back down (self-correcting loop!).`, d, { tag: 'self_fix' }),
        ],
        alt: [
          fact(`${pName(a)}: Moderate leg cut, warm body 98.4°F, blood clotting nicely under pressure gauze.`, a, { tag: 'stable_bleed' }),
          fact(`${pName(d)}: Mild 100.8°F fever + sweating to cool back down (self-correcting loop!).`, d, { tag: 'self_fix' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'ICU Systems', wingIndex: 0, label: 'Why Cold Stops Clots',
        shown: [
          fact(`Human clotting proteins freeze up below 95°F — pouring room-temp IV bags into a bleeding cold patient accelerates the spiral!`, [], { tag: 'rule' }),
          fact(`Only heated blood warmers + immediate surgical bleed control can break a runaway spiral.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Bay Monitors', wingIndex: 1, label: 'Routine Bays',
        shown: [
          fact(`${pName(e)} has a sprained thumb and normal 98.6°F body temp.`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)} is drinking warm tea after a minor fall.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'ICU Systems', wingIndex: 0, label: 'Rapid Warmer Call',
        shown: [
          fact(`We have ONE heated rapid blood-warmer tower — deploy it ONLY to break an active runaway bleeding-cold spiral.`, [], { tag: 'rule' }),
          fact(`Do not waste it on self-correcting shivering or warm clotting cuts.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Break the Runaway Spiral',
      dispatch: 'Four patients have body-temp or bleeding alarms — spot the ONE trapped in a self-reinforcing bleeding-and-cold death spiral.',
      order: 'Deploy the sole heated rapid blood-warmer to the SINGLE patient locked in a runaway feedback spiral.',
      hint: 'Separate self-correcting body loops (shivering/sweating) from bleeding + freezing (< 95°F) + lost clotting.',
      bayDefaultLabel: 'Temp / Bleed',
      bayLabels: { [e]: 'Minor · Stable', [f]: 'Minor · Stable' },
      cards,
      evaluate(activeCards) {
        const targets = uniqueSortedIds([...tagSet(activeCards, 'spiral')]);
        const rivals = [...tagSet(activeCards, 'self_fix'), ...tagSet(activeCards, 'stable_bleed')];
        return {
          targets,
          proof: `${formatList(targets)} are trapped in the runaway bleeding + freezing + failed-clotting loop, whereas shivering and sweating are self-correcting loops.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} is either warming/cooling normally via self-correction or clotting fine at normal body temperature.`),
        };
      },
    };
  },

  // #43 Strategic reasoning (Before · Composite)
  'strategic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Solo Surgeon', wingIndex: 0, label: 'Sequencing Dilemma',
        shown: [
          fact(`You are the ONLY trauma surgeon for the next 12 minutes — you can only operate on ONE patient at a time!`, [], { tag: 'rule' }),
          fact(`Choose which SINGLE patient you must stabilize FIRST so you can still finish the others before their survival clocks hit zero.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Surgery Clocks', wingIndex: 1, label: 'Critical Cases 1 & 2',
        shown: [
          fact(`${pName(a)}: Takes 3 minutes to fix · Dies if untreated past Minute 5.`, a, { tag: 'seq', dur: 3, dead: 5 }),
          fact(`${pName(b)}: Takes 5 minutes to fix · Dies if untreated past Minute 9.`, b, { tag: 'seq', dur: 5, dead: 9 }),
        ],
        alt: [
          fact(`${pName(a)}: Takes 6 minutes to fix · Dies if untreated past Minute 10.`, a, { tag: 'seq', dur: 6, dead: 10 }),
          fact(`${pName(b)}: Takes 3 minutes to fix · Dies if untreated past Minute 4.`, b, { tag: 'seq', dur: 3, dead: 4 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Surgery Clocks', wingIndex: 1, label: 'Critical Cases 3 & 4',
        shown: [
          fact(`${pName(c)}: Takes 9 minutes to fix · Dies if untreated past Minute 11 (doing them first kills BOTH others!).`, c, { tag: 'seq', dur: 9, dead: 11 }),
          fact(`${pName(d)}: Takes 4 minutes to fix · Safe for 30+ minutes (wait for backup team).`, d, { tag: 'seq', dur: 4, dead: 35 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Solo Surgeon', wingIndex: 0, label: 'Simulate Two Moves Ahead',
        shown: [
          fact(`Check the order: If you start with a 3-min fix, you finish at Min 3 — leaving plenty of time to finish a 5-min fix by Min 8 (before Min 9!).`, [], { tag: 'rule' }),
          fact(`Starting with the 5-min or 9-min fix first makes the tightest deadline expire while your hands are tied!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Surgery Clocks', wingIndex: 1, label: 'Minor Bays',
        shown: [
          fact(`${pName(e)} needs minor skin stitches (no threat to life).`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)} is waiting for discharge papers.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Solo Surgeon', wingIndex: 0, label: 'First Move Call',
        shown: [
          fact(`Pick ONLY the SINGLE patient you must treat FIRST right now (Minute 0) to save the maximum number of lives.`, [], { tag: 'rule' }),
          fact(`Think two moves ahead before touching the scalpel!`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Two Moves Ahead',
      dispatch: 'You are the lone surgeon for 12 minutes — simulate the treatment order ahead so fixing one patient doesn’t doom another.',
      order: 'Treat the SINGLE patient who MUST go FIRST at Minute 0 to maximize total lives saved.',
      hint: 'Check each patient’s fix duration against everyone else’s deadline (Earliest Deadline First).',
      bayDefaultLabel: 'Urgent Surgery',
      bayLabels: { [e]: 'Minor · Stitches', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'seq').sort((x, y) => x.dead - y.dead);
        const top = list[0];
        const runner = list[1];
        const targets = top ? [top.patients[0]] : [];
        return {
          targets,
          proof: `Starting with ${pName(top.patients[0])} (${top.dur} min fix, deadline Min ${top.dead}) finishes at Min ${top.dur}, leaving enough time to save ${pName(runner.patients[0])} before Min ${runner.dead}.`,
          rival: buildRivalInfo(targets, [runner.patients[0], c], (id) => `Starting with ${pName(id)} ties up your hands past ${pName(top.patients[0])}'s Minute ${top.dead} deadline.`),
        };
      },
    };
  },

  // #44 Game-theoretic reasoning (Before · Composite)
  'game-theoretic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Regional Dispatch', wingIndex: 0, label: 'Two-Hospital Equilibrium',
        shown: [
          fact(`City Trauma Center (5 min away) has ONLY ONE open bay left — and their dispatcher ALWAYS grabs the single EASIEST/FASTEST surgery to clear first!`, [], { tag: 'rule' }),
          fact(`We also have ONE open bay left. Anticipate who City Trauma will take — and rescue the critical patient who would otherwise be LEFT STRANDED!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Ambulance Feed', wingIndex: 1, label: 'Inbound Cases 1 & 2',
        shown: [
          fact(`${pName(a)}: Critical bleed · Fast 20-minute repair (City Trauma's #1 rational grab!).`, a, { tag: 'gt', crit: true, mins: 20 }),
          fact(`${pName(b)}: Critical bleed · Complex 90-minute repair (City Trauma will SKIP if a faster case exists!).`, b, { tag: 'gt', crit: true, mins: 90 }),
        ],
        alt: [
          fact(`${pName(a)}: Critical bleed · Complex 95-minute repair (City Trauma will SKIP if a faster case exists!).`, a, { tag: 'gt', crit: true, mins: 95 }),
          fact(`${pName(b)}: Critical bleed · Fast 18-minute repair (City Trauma's #1 rational grab!).`, b, { tag: 'gt', crit: true, mins: 18 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Ambulance Feed', wingIndex: 1, label: 'Inbound Cases 3 & 4',
        shown: [
          fact(`${pName(c)}: Non-critical broken wrist (can safely wait 4 hours at any clinic).`, c, { tag: 'gt', crit: false, mins: 15 }),
          fact(`${pName(d)}: Non-critical ankle sprain (can safely wait at urgent care).`, d, { tag: 'gt', crit: false, mins: 10 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Regional Dispatch', wingIndex: 0, label: 'Why Double-Booking Kills',
        shown: [
          fact(`If BOTH hospitals claim the fast 20-minute patient, the complex 90-minute critical patient has ZERO open bays left and dies in transit!`, [], { tag: 'rule' }),
          fact(`City Trauma ONLY takes critical cases (they ignore minor wrists/ankles), picking the fastest critical surgery.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Ambulance Feed', wingIndex: 1, label: 'Other Bays',
        shown: [
          fact(`${pName(e)} is already stable inside Ward 3 recovery.`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)} is cleared to go home.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Regional Dispatch', wingIndex: 0, label: 'Our Bay Claim',
        shown: [
          fact(`Claim the critical patient whom City Trauma will rationally PASS OVER so BOTH critical lives get saved!`, [], { tag: 'rule' }),
          fact(`Coordinate by anticipating the other hospital's predictable best move.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Regional Bay Coordination',
      dispatch: 'City Trauma always claims the fastest critical surgery — predict their move so the complex critical patient isn’t left stranded.',
      order: 'Claim our lone trauma bay for the critical patient whom City Trauma will rationally pass over.',
      hint: 'Predict which critical patient City Trauma grabs first (fastest repair), then claim the OTHER critical patient.',
      bayDefaultLabel: 'Inbound Amb',
      bayLabels: { [c]: 'Minor · Wrist', [d]: 'Minor · Ankle', [e]: 'Stable · Ward', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const crits = factsByTag(activeCards, 'gt').filter((x) => x.crit).sort((x, y) => y.mins - x.mins);
        const stranded = crits[0];
        const grabbed = crits[1];
        const targets = stranded ? [stranded.patients[0]] : [];
        return {
          targets,
          proof: `Anticipating that City Trauma will rationally grab faster ${pName(grabbed.patients[0])} (${grabbed.mins} min), claiming complex ${pName(stranded.patients[0])} (${stranded.mins} min) saves BOTH lives.`,
          rival: buildRivalInfo(targets, [grabbed?.patients[0], c], (id) => `City Trauma is already grabbing ${pName(id)} — double-booking leaves ${pName(stranded.patients[0])} stranded without a bay.`),
        };
      },
    };
  },

  // #45 Adversarial reasoning (Before · Composite)
  'adversarial-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Security Audit', wingIndex: 0, label: 'Tampered Queue Alert',
        shown: [
          fact(`A cyber-prank / queue-jumper edited ONE patient's triage tag to "RED #1 PRIORITY" — while their actual bedside vital sensors tell a totally different story!`, [], { tag: 'rule' }),
          fact(`Verify objective bedside physics against every "RED #1" label so a fake alarm never steals the OR from a real dying patient.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Triage Screen', wingIndex: 1, label: 'Screen Claims',
        shown: [
          fact(`Computer screen tags ${pName(a)} as "RED #1 — Unconscious / Severe Shock."`, a, { tag: 'claimed_red' }),
          fact(`Computer screen tags ${pName(b)} as "RED #1 — Active Chest Collapse."`, b, { tag: 'claimed_red' }),
        ],
        alt: [
          fact(`Computer screen tags ${pName(c)} as "RED #1 — Unconscious / Severe Shock."`, c, { tag: 'claimed_red' }),
          fact(`Computer screen tags ${pName(b)} as "RED #1 — Active Chest Collapse."`, b, { tag: 'claimed_red' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Bedside Truth', wingIndex: 0, label: 'Direct Physical Check 1',
        shown: [
          fact(`Direct nurse check on ${pName(a)}: sitting upright scrolling phone, laughing, BP 120/76, oxygen 99% — zero injuries!`, a, { tag: 'fake' }),
          fact(`Direct nurse check on ${pName(b)}: pale, gasping, BP 76/44, oxygen 81% — genuinely crashing!`, b, { tag: 'real' }),
        ],
        alt: [
          fact(`Direct nurse check on ${pName(c)}: sitting upright scrolling phone, laughing, BP 120/76, oxygen 99% — zero injuries!`, c, { tag: 'fake' }),
          fact(`Direct nurse check on ${pName(b)}: pale, gasping, BP 76/44, oxygen 81% — genuinely crashing!`, b, { tag: 'real' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Bedside Truth', wingIndex: 0, label: 'Direct Physical Check 2',
        shown: [
          fact(`Security log: ${pName(a)}'s chart was edited from an unlocked waiting-room kiosk using a stolen guest badge!`, a, { tag: 'tampered' }),
          fact(`${pName(c)} is tagged Yellow (broken forearm) — physical X-ray matches broken forearm accurately.`, c, { tag: 'honest' }),
        ],
        alt: [
          fact(`Security log: ${pName(c)}'s chart was edited from an unlocked waiting-room kiosk using a stolen guest badge!`, c, { tag: 'tampered' }),
          fact(`${pName(a)} is tagged Yellow (broken forearm) — physical X-ray matches broken forearm accurately.`, a, { tag: 'honest' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Triage Screen', wingIndex: 1, label: 'Other Honest Bays',
        shown: [
          fact(`${pName(d)}: tagged Yellow (kidney stone pain) — physical exam matches honestly.`, d, { tag: 'honest' }),
          fact(`${pName(e)}: tagged Green (minor scrape) — matches honestly.`, e, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Security Audit', wingIndex: 0, label: 'Action Required',
        shown: [
          fact(`${pName(f)} is waiting calmly for a flu test.`, f, { tag: 'safe', calm: true }),
          fact(`Quarantine the SINGLE tampered / forged chart entry to Security so real emergencies aren't delayed!`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Spoofed Triage Priority',
      dispatch: 'Someone hacked an unlocked triage screen to fake a "RED #1" alarm — cross-check digital claims against direct bedside reality.',
      order: 'Flag the SINGLE patient whose "RED #1" screen status was intentionally spoofed / forged.',
      hint: 'Compare the digital RED #1 claim against direct nurse vitals and the kiosk security log.',
      bayDefaultLabel: 'Queue Audit',
      bayLabels: { [e]: 'Minor · Honest', [f]: 'Minor · Stable' },
      cards,
      evaluate(activeCards) {
        const fake = tagSet(activeCards, 'fake');
        const tamp = tagSet(activeCards, 'tampered');
        const targets = uniqueSortedIds([...fake].filter((id) => tamp.has(id)));
        const rivals = [...tagSet(activeCards, 'real'), ...tagSet(activeCards, 'honest')];
        return {
          targets,
          proof: `Cross-checking digital tags against physical bedside vitals and kiosk logs exposes ${formatList(targets)}'s RED #1 alarm as spoofed.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)}'s physical exam honestly matches their triage level.`),
        };
      },
    };
  },

  // #46 Optimisation reasoning (Before · Composite)
  'optimisation-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Surge Clock', wingIndex: 0, label: '10-Minute Budget',
        shown: [
          fact(`You have EXACTLY 10 minutes before the helicopter leaves — pick the PAIR of patients whose combined prep time fits inside ≤ 10 minutes AND maximizes total Urgency Points!`, [], { tag: 'rule' }),
          fact(`Never exceed 10 minutes total, and don't leave urgency points on the table if a higher-value pair fits!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Prep Times', wingIndex: 1, label: 'Options A & B',
        shown: [
          fact(`${pName(a)}: Takes 4 minutes · Urgency Value = 7 pts.`, a, { tag: 'opt', min: 4, val: 7 }),
          fact(`${pName(b)}: Takes 6 minutes · Urgency Value = 8 pts.`, b, { tag: 'opt', min: 6, val: 8 }),
        ],
        alt: [
          fact(`${pName(a)}: Takes 7 minutes · Urgency Value = 7 pts.`, a, { tag: 'opt', min: 7, val: 7 }),
          fact(`${pName(b)}: Takes 4 minutes · Urgency Value = 9 pts.`, b, { tag: 'opt', min: 4, val: 9 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Prep Times', wingIndex: 1, label: 'Options C & D',
        shown: [
          fact(`${pName(c)}: Takes 8 minutes · Urgency Value = 10 pts (huge alone, but blocks every other partner!).`, c, { tag: 'opt', min: 8, val: 10 }),
          fact(`${pName(d)}: Takes 5 minutes · Urgency Value = 5 pts.`, d, { tag: 'opt', min: 5, val: 5 }),
        ],
        alt: [
          fact(`${pName(c)}: Takes 5 minutes · Urgency Value = 8 pts.`, c, { tag: 'opt', min: 5, val: 8 }),
          fact(`${pName(d)}: Takes 8 minutes · Urgency Value = 10 pts (huge alone, blocks others!).`, d, { tag: 'opt', min: 8, val: 10 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Surge Clock', wingIndex: 0, label: 'Why Greediest Single Fails',
        shown: [
          fact(`Grabbing the single highest-point 8-minute case leaves only 2 minutes — too short for ANY second patient!`, [], { tag: 'rule' }),
          fact(`Test every 2-patient pair whose minutes add up to ≤ 10 and sum their Urgency Values.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Prep Times', wingIndex: 1, label: 'Minor Bays',
        shown: [
          fact(`${pName(e)} has a minor scrape (Urgency Value = 1 pt, no airlift needed).`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)} is cleared to go home.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Surge Clock', wingIndex: 0, label: 'Optimal Pair Call',
        shown: [
          fact(`Select the exact 2-patient pair that stays within ≤ 10 minutes AND hits the highest total Urgency Points.`, [], { tag: 'rule' }),
          fact(`Chopper engines are spinning — lock in the optimal pair now.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: '10-Minute Evac Budget',
      dispatch: 'You have 10 minutes before liftoff — pick the exact 2-patient pair that fits inside 10 minutes with the highest combined urgency value.',
      order: 'Prep the TWO-PATIENT PAIR whose combined time is ≤ 10 minutes and achieves the HIGHEST total Urgency Points.',
      hint: 'Test pairs whose minutes sum to ≤ 10 (don’t get trapped by one slow 8-minute case!).',
      bayDefaultLabel: 'Evac Budget',
      bayLabels: { [e]: 'Minor · Stable', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const items = factsByTag(activeCards, 'opt');
        let best = null;
        for (let i = 0; i < items.length; i++) {
          for (let j = i + 1; j < items.length; j++) {
            const m = items[i].min + items[j].min;
            const v = items[i].val + items[j].val;
            if (m <= 10 && (!best || v > best.val)) {
              best = { ids: [items[i].patients[0], items[j].patients[0]], min: m, val: v };
            }
          }
        }
        const targets = best ? uniqueSortedIds(best.ids) : [];
        const rivals = items.map((x) => x.patients[0]).filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `${formatList(targets)} is the optimal pair: takes ${best.min}/10 minutes and delivers ${best.val} total Urgency Points — beating every other legal combination.`,
          rival: buildRivalInfo(targets, rivals, (id) => `Including ${pName(id)} either bursts the 10-minute cap or yields fewer total Urgency Points.`),
        };
      },
    };
  },

  // #47 Instrumental reasoning (Inside · Atomic)
  'instrumental-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Crash Cart', wingIndex: 0, label: 'What a Shock Pad Actually Does',
        shown: [
          fact(`TV movies lie! A defibrillator SHOCK ONLY resets a CHAOTIC QUIVERING heart rhythm.`, [], { tag: 'rule' }),
          fact(`Shocking a FLATLINE (zero electrical wave) or a STEADY NORMAL rhythm does NOTHING — those need chest compressions or medicine instead!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Heart Monitors', wingIndex: 1, label: 'Rhythm Check 1',
        shown: [
          fact(`${pName(a)}: Unresponsive · Monitor shows wild, chaotic electrical quivering (no pulse!).`, a, { tag: 'shockable' }),
          fact(`${pName(b)}: Unresponsive · Monitor shows a completely flat horizontal line (flatline — needs CPR & adrenaline, NOT shock!).`, b, { tag: 'flatline' }),
        ],
        alt: [
          fact(`${pName(c)}: Unresponsive · Monitor shows wild, chaotic electrical quivering (no pulse!).`, c, { tag: 'shockable' }),
          fact(`${pName(b)}: Unresponsive · Monitor shows a completely flat horizontal line (flatline — needs CPR & adrenaline, NOT shock!).`, b, { tag: 'flatline' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Heart Monitors', wingIndex: 1, label: 'Rhythm Check 2',
        shown: [
          fact(`${pName(c)}: Awake and anxious · Steady regular fast heartbeat at 128 BPM (needs calm fluids, NOT electric shock!).`, c, { tag: 'steady' }),
          fact(`${pName(d)}: Fainting · Very slow steady beat at 36 BPM (needs pacemaker boost, NOT shock!).`, d, { tag: 'slow' }),
        ],
        alt: [
          fact(`${pName(a)}: Awake and anxious · Steady regular fast heartbeat at 128 BPM (needs calm fluids, NOT electric shock!).`, a, { tag: 'steady' }),
          fact(`${pName(d)}: Fainting · Very slow steady beat at 36 BPM (needs pacemaker boost, NOT shock!).`, d, { tag: 'slow' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Crash Cart', wingIndex: 0, label: 'Pad Supply',
        shown: [
          fact(`Only ONE charged defibrillator cart is in this hallway right now.`, [], { tag: 'rule' }),
          fact(`Match the exact instrument to the exact physical mechanism where it works.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Heart Monitors', wingIndex: 1, label: 'Minor Bays',
        shown: [
          fact(`${pName(e)} has a normal 74 BPM rhythm (bruised finger).`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)} is waiting for discharge instructions.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Crash Cart', wingIndex: 0, label: 'Clear & Shock Call',
        shown: [
          fact(`Deliver the defibrillator shock ONLY to the patient with a chaotic quivering rhythm.`, [], { tag: 'rule' }),
          fact(`CPR teams are handling flatline and slow-beat bays separately.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Right Tool for the Heart',
      dispatch: 'Four heart alarms are blaring — remember that a defibrillator shock ONLY works on chaotic quivering, NOT flatline!',
      order: 'Deliver the defibrillator shock ONLY to the single patient whose rhythm can actually be reset by a shock.',
      hint: 'Match the shock tool strictly to chaotic electrical quivering (ignore flatline, steady fast, and slow beats).',
      bayDefaultLabel: 'Heart Rhythm',
      bayLabels: { [e]: 'Minor · Stable', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const targets = uniqueSortedIds([...tagSet(activeCards, 'shockable')]);
        const rivals = [...tagSet(activeCards, 'flatline'), ...tagSet(activeCards, 'slow'), ...tagSet(activeCards, 'steady')];
        return {
          targets,
          proof: `A defibrillator only resets chaotic electrical quivering — matching ${formatList(targets)}, whereas flatline and slow rhythms require CPR/meds/pacing instead.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} has a flatline or steady rhythm where an electric shock is useless or harmful.`),
        };
      },
    };
  },

  // #48 Second-order reasoning (Inside · Composite)
  'second-order-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Drug Ripples', wingIndex: 0, label: 'The Domino Effect',
        shown: [
          fact(`Standard Chest-Pain Spray (Nitro) relaxes arteries (1st-order effect: eases chest pain) — BUT causes a sudden 40-point blood pressure drop (2nd-order ripple!).`, [], { tag: 'rule' }),
          fact(`If a patient ALREADY took an artery-relaxing pill (like Viagra/Sildenafil) today OR sits near BP 90, that 2nd-order ripple causes fatal brain collapse!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Chest Bays', wingIndex: 1, label: 'Patients A & B',
        shown: [
          fact(`${pName(a)}: Chest tightness · BP 148/88 · Took Sildenafil (artery-relaxing pill) 3 hours ago!`, a, { tag: 'danger_2nd' }),
          fact(`${pName(b)}: Chest tightness · BP 152/90 · Zero medications taken today (safe for spray!).`, b, { tag: 'safe_spray' }),
        ],
        alt: [
          fact(`${pName(a)}: Chest tightness · BP 150/88 · Zero medications taken today (safe for spray!).`, a, { tag: 'safe_spray' }),
          fact(`${pName(b)}: Chest tightness · BP 148/88 · Took Sildenafil (artery-relaxing pill) 3 hours ago!`, b, { tag: 'danger_2nd' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Chest Bays', wingIndex: 1, label: 'Patients C & D',
        shown: [
          fact(`${pName(c)}: Chest tightness · BP 92/58 (right near 90 — a 40-pt drop crashes them to 52!).`, c, { tag: 'danger_2nd' }),
          fact(`${pName(d)}: Chest tightness · BP 164/94 · Zero artery-relaxing pills taken (safe for spray!).`, d, { tag: 'safe_spray' }),
        ],
        alt: [
          fact(`${pName(c)}: Chest tightness · BP 158/90 · Zero artery-relaxing pills taken (safe for spray!).`, c, { tag: 'safe_spray' }),
          fact(`${pName(d)}: Chest tightness · BP 91/56 (right near 90 — a 40-pt drop crashes them to 51!).`, d, { tag: 'danger_2nd' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Drug Ripples', wingIndex: 0, label: 'Why 1st-Order Thinking Traps You',
        shown: [
          fact(`All four patients have identical chest tightness — looking ONLY at chest pain makes the spray look good for everyone!`, [], { tag: 'rule' }),
          fact(`Looking ONE domino further reveals who will collapse from the blood-pressure drop.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Chest Bays', wingIndex: 1, label: 'Routine Bays',
        shown: [
          fact(`${pName(e)} is here for a sprained elbow (not ordered chest spray).`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)} is waiting for stitch removal.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Drug Ripples', wingIndex: 0, label: 'Cancel Dangerous Orders',
        shown: [
          fact(`BLOCK the chest-pain spray for EVERY patient where its 2nd-order blood-pressure drop will trigger dangerous collapse.`, [], { tag: 'rule' }),
          fact(`Let the remaining safe chest-pain patients receive their spray normally.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Look One Domino Further',
      dispatch: 'Four chest-pain patients were all ordered artery-relaxing spray — trace the 2nd-order blood-pressure ripple before anyone collapses.',
      order: 'BLOCK the chest-pain spray for EVERY patient endangered by its 2nd-order blood-pressure drop.',
      hint: 'Catch anyone who took an interacting artery-relaxer today OR starts near BP 90.',
      bayDefaultLabel: 'Chest Spray Check',
      bayLabels: { [e]: 'Minor · Elbow', [f]: 'Minor · Stable' },
      cards,
      evaluate(activeCards) {
        const targets = uniqueSortedIds([...tagSet(activeCards, 'danger_2nd')]);
        const rivals = [...tagSet(activeCards, 'safe_spray')];
        return {
          targets,
          proof: `Thinking one consequence further blocks the spray for ${formatList(targets)}, where the 2nd-order 40-pt blood pressure drop (combined with Sildenafil or low BP ~91) would cause fatal collapse.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} has high starting BP (>150) and no interacting medications, so the spray is safe.`),
        };
      },
    };
  },

  // #49 Risk-based reasoning (Before · Atomic)
  'risk-based-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Risk Board', wingIndex: 0, label: 'Expected Harm Rule',
        shown: [
          fact(`True Risk Score = Chance of Happening (%) × Harm Severity (1 = minor annoyance, 10 = fatal/permanent brain loss).`, [], { tag: 'rule' }),
          fact(`A high chance of a tiny bruise is LESS dangerous than a moderate chance of death!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Case Risks', wingIndex: 1, label: 'Risk Profiles A & B',
        shown: [
          fact(`${pName(a)}: 90% chance of a mild skin rash (Harm Severity = 1).`, a, { tag: 'rsk', prob: 90, sev: 1 }),
          fact(`${pName(b)}: 40% chance of a fatal brain bleed (Harm Severity = 10).`, b, { tag: 'rsk', prob: 40, sev: 10 }),
        ],
        alt: [
          fact(`${pName(a)}: 50% chance of a fatal brain bleed (Harm Severity = 10).`, a, { tag: 'rsk', prob: 50, sev: 10 }),
          fact(`${pName(b)}: 80% chance of mild nausea (Harm Severity = 2).`, b, { tag: 'rsk', prob: 80, sev: 2 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Case Risks', wingIndex: 1, label: 'Risk Profiles C & D',
        shown: [
          fact(`${pName(c)}: 60% chance of a painful swollen ankle (Harm Severity = 3).`, c, { tag: 'rsk', prob: 60, sev: 3 }),
          fact(`${pName(d)}: 20% chance of losing a kidney (Harm Severity = 8).`, d, { tag: 'rsk', prob: 20, sev: 8 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Risk Board', wingIndex: 0, label: 'Multiply Both Factors',
        shown: [
          fact(`Multiply Chance × Severity for each patient (e.g., 20% × 8 = 1.6 expected harm units; 90% × 1 = 0.9 units).`, [], { tag: 'rule' }),
          fact(`${pName(e)} has a 10% chance of a paper-cut infection (Harm Severity = 1).`, e, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Case Risks', wingIndex: 1, label: 'Routine Bay',
        shown: [
          fact(`${pName(f)} is completely cleared for discharge.`, f, { tag: 'safe', calm: true }),
          fact(`You only have ONE immediate specialist bed open right now.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Risk Board', wingIndex: 0, label: 'Top Expected Harm',
        shown: [
          fact(`Admit the SINGLE patient carrying the HIGHEST Expected Harm (Chance × Severity).`, [], { tag: 'rule' }),
          fact(`Never let a 90% trivial rash outrank a 40% lethal catastrophe!`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Chance × Severity Triage',
      dispatch: 'Four patients face very different probabilities and harms — multiply Chance × Severity to protect against the biggest expected catastrophe.',
      order: 'Admit the SINGLE patient carrying the HIGHEST Expected Harm (Chance × Severity).',
      hint: 'Multiply each patient’s probability by their Harm Severity (1–10) and pick the top total.',
      bayDefaultLabel: 'Risk Eval',
      bayLabels: { [e]: 'Minor · Low Risk', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'rsk').map((x) => ({
          id: x.patients[0],
          prob: x.prob,
          sev: x.sev,
          score: (x.prob / 100) * x.sev,
        })).sort((x, y) => y.score - x.score);
        const top = list[0];
        const runner = list[1];
        const targets = top ? [top.id] : [];
        return {
          targets,
          proof: `${pName(top.id)} carries the highest expected harm: ${top.prob}% × ${top.sev} = ${top.score.toFixed(1)} units, far above ${pName(runner.id)} (${runner.score.toFixed(1)}).`,
          rival: buildRivalInfo(targets, [runner.id, a], (id) => {
            const r = list.find((x) => x.id === id);
            return `${pName(id)}'s expected harm is only ${r.score.toFixed(1)} (${r.prob}% × ${r.sev}), even if their raw probability looked high.`;
          }),
        };
      },
    };
  },

  // #50 Decision-theoretic reasoning (After · Composite)
  'decision-theoretic': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Goals of Care', wingIndex: 0, label: 'Odds + Patient Values',
        shown: [
          fact(`Good medicine combines BOTH: (1) Real medical benefit (surgery meaningfully improves survival) AND (2) The patient's OWN stated values / Advance Directive!`, [], { tag: 'rule' }),
          fact(`NEVER force aggressive ICU surgery on a clear-minded patient who signed "Comfort Care Only — No Surgery / No Machines."`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Patient Wishes', wingIndex: 1, label: 'Wishes & Odds A',
        shown: [
          fact(`${pName(a)}: Surgery lifts survival from 15% → 75% · Signed wish: "Do EVERYTHING to save my life — I want surgery!"`, a, { tag: 'dt', goodOdds: true, wantsTx: true }),
          fact(`${pName(b)}: Surgery lifts survival from 20% → 80% · Signed living will: "NO surgery, NO ventilator — peace and pain relief only."`, b, { tag: 'dt', goodOdds: true, wantsTx: false }),
        ],
        alt: [
          fact(`${pName(a)}: Surgery lifts survival from 15% → 75% · Signed living will: "NO surgery, NO ventilator — peace and pain relief only."`, a, { tag: 'dt', goodOdds: true, wantsTx: false }),
          fact(`${pName(b)}: Surgery lifts survival from 20% → 80% · Signed wish: "Do EVERYTHING to save my life — I want surgery!"`, b, { tag: 'dt', goodOdds: true, wantsTx: true }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Patient Wishes', wingIndex: 1, label: 'Wishes & Odds B',
        shown: [
          fact(`${pName(c)}: Surgery gives 0% chance of working (completely futile) · Family asks "Please try anything."`, c, { tag: 'dt', goodOdds: false, wantsTx: true }),
          fact(`${pName(d)}: Surgery lifts survival from 30% → 85% · Alert and verbally confirms: "Yes, take me to surgery right now!"`, d, { tag: 'dt', goodOdds: true, wantsTx: true }),
        ],
        alt: [
          fact(`${pName(c)}: Surgery gives 0% chance of working (completely futile) · Family asks "Please try anything."`, c, { tag: 'dt', goodOdds: false, wantsTx: true }),
          fact(`${pName(d)}: Surgery lifts survival from 30% → 85% · Signed living will: "Comfort care only — decline all operations."`, d, { tag: 'dt', goodOdds: true, wantsTx: false }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Goals of Care', wingIndex: 0, label: 'Futility & Autonomy',
        shown: [
          fact(`Surgeons do NOT perform 0%-chance futile operations that only cause suffering without any chance of recovery.`, [], { tag: 'rule' }),
          fact(`Honoring a signed "No Surgery" living will respects autonomy even when surgical odds are high.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Patient Wishes', wingIndex: 1, label: 'Routine Bays',
        shown: [
          fact(`${pName(e)} has a minor wrist sprain (no surgery needed).`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)} is cleared to go home.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Goals of Care', wingIndex: 0, label: 'OR Consent Call',
        shown: [
          fact(`Wheel into surgery ONLY patients where BOTH medical benefit is real AND the patient wants surgical intervention.`, [], { tag: 'rule' }),
          fact(`Route comfort-care and futile cases to Palliative Support instead.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Odds Meet Human Wishes',
      dispatch: 'Four families await surgical decisions — weigh both genuine survival benefit AND each patient’s own stated wishes.',
      order: 'Send ONLY the patients where surgery BOTH provides real survival benefit AND aligns with their stated wishes.',
      hint: 'Check both real medical benefit (> 0% lift) AND the patient’s consent/living will.',
      bayDefaultLabel: 'Goals of Care',
      bayLabels: { [e]: 'Minor · Stable', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'dt');
        const targets = uniqueSortedIds(list.filter((x) => x.goodOdds && x.wantsTx).map((x) => x.patients[0]));
        const rivals = list.filter((x) => !(x.goodOdds && x.wantsTx)).map((x) => x.patients[0]);
        return {
          targets,
          proof: `Combining probability with patient preferences clears ${formatList(targets)} for surgery — real survival lift AND explicit consent.`,
          rival: buildRivalInfo(targets, rivals, (id) => {
            const r = list.find((x) => x.patients[0] === id);
            return !r.wantsTx
              ? `${pName(id)} explicitly signed a Comfort Care / No Surgery directive that must be honored.`
              : `${pName(id)}'s operation has 0% chance of working (medically futile).`;
          }),
        };
      },
    };
  },

  // #51 Algorithmic reasoning (Before · Atomic)
  'algorithmic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'START Flowchart', wingIndex: 0, label: '3-Step Disaster Tree',
        shown: [
          fact(`STEP 1: Can walk? → YES = GREEN (stop). NO → go to Step 2.`, [], { tag: 'rule' }),
          fact(`STEP 2: Breathing > 30/min? → YES = RED (stop). NO → go to Step 3: Weak wrist pulse OR confused? → YES = RED; NO = YELLOW.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Field Checks', wingIndex: 1, label: 'Patient A & B Inputs',
        shown: [
          fact(`${pName(a)}: Cannot walk · Breathing 22/min · Strong pulse · Follows commands clearly.`, a, { tag: 'alg', walk: false, rr: 22, weak: false, conf: false }),
          fact(`${pName(b)}: Cannot walk · Breathing 24/min · Weak wrist pulse · Confused speech.`, b, { tag: 'alg', walk: false, rr: 24, weak: true, conf: true }),
        ],
        alt: [
          fact(`${pName(a)}: Cannot walk · Breathing 36/min · Strong pulse · Alert.`, a, { tag: 'alg', walk: false, rr: 36, weak: false, conf: false }),
          fact(`${pName(b)}: Cannot walk · Breathing 20/min · Strong wrist pulse · Follows commands.`, b, { tag: 'alg', walk: false, rr: 20, weak: false, conf: false }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Field Checks', wingIndex: 1, label: 'Patient C & D Inputs',
        shown: [
          fact(`${pName(c)}: Walking around talking · Breathing 34/min (panicking after crash!).`, c, { tag: 'alg', walk: true, rr: 34, weak: false, conf: false }),
          fact(`${pName(d)}: Cannot walk · Breathing 35/min · Strong pulse · Alert.`, d, { tag: 'alg', walk: false, rr: 35, weak: false, conf: false }),
        ],
        alt: [
          fact(`${pName(c)}: Walking around talking · Breathing 34/min (panicking after crash!).`, c, { tag: 'alg', walk: true, rr: 34, weak: false, conf: false }),
          fact(`${pName(d)}: Cannot walk · Breathing 22/min · Strong pulse · Follows commands clearly.`, d, { tag: 'alg', walk: false, rr: 22, weak: false, conf: false }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'START Flowchart', wingIndex: 0, label: 'Order Matters!',
        shown: [
          fact(`Always run Step 1 FIRST! Someone who is walking exits immediately as GREEN even if they are breathing fast from panic.`, [], { tag: 'rule' }),
          fact(`Do NOT skip Step 3 — a non-walker with normal breathing (24/min) still turns RED if pulse is weak or mind is confused!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Field Checks', wingIndex: 1, label: 'Walk-In Bays',
        shown: [
          fact(`${pName(e)}: Walking calmly · Breathing 16/min · Alert.`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)}: Walking calmly · Breathing 18/min · Alert.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'START Flowchart', wingIndex: 0, label: 'Tag All REDs',
        shown: [
          fact(`Run every patient strictly through Step 1 → Step 2 → Step 3.`, [], { tag: 'rule' }),
          fact(`Pull EVERY patient who ends up tagged RED into the immediate Resuscitation Bay.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Mass-Casualty START Tree',
      dispatch: 'A bus crash flooded triage — run every patient step-by-step through the exact 3-step START disaster flowchart.',
      order: 'Pull EVERY patient whose exact path through Step 1 → Step 2 → Step 3 outputs RED.',
      hint: 'Execute Step 1 (walking?) BEFORE Step 2 (breathing > 30?) BEFORE Step 3 (weak pulse or confused?).',
      bayDefaultLabel: 'START Triage',
      bayLabels: { [e]: 'Walking · Green', [f]: 'Walking · Green' },
      cards,
      evaluate(activeCards) {
        const list = factsByTag(activeCards, 'alg').map((x) => {
          let tag = 'YELLOW';
          if (x.walk) tag = 'GREEN';
          else if (x.rr > 30) tag = 'RED';
          else if (x.weak || x.conf) tag = 'RED';
          return { id: x.patients[0], tag };
        });
        const targets = uniqueSortedIds(list.filter((x) => x.tag === 'RED').map((x) => x.id));
        const rivals = list.filter((x) => x.tag !== 'RED').map((x) => x.id);
        return {
          targets,
          proof: `Executing Step 1 → Step 2 → Step 3 strictly tags ${formatList(targets)} as RED (non-walking with breathing > 30 or weak pulse/confusion).`,
          rival: buildRivalInfo(targets, rivals, (id) => {
            const r = list.find((x) => x.id === id);
            return `${pName(id)} exits the flowchart as ${r.tag} (either walking at Step 1 or passing Steps 2 & 3).`;
          }),
        };
      },
    };
  },

  // #52 Reverse reasoning (Before · Atomic)
  'reverse-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'OR Schedule', wingIndex: 0, label: 'Hard 03:00 Liftoff Goal',
        shown: [
          fact(`An organ transplant heart arrives at EXACTLY 03:00 — the recipient MUST be prepped and on the table by 03:00 sharp!`, [], { tag: 'rule' }),
          fact(`Mandatory pre-surgery steps (in sequence): 25 min blood crossmatch + 20 min chest scan + 15 min anesthesia setup.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Patient ETAs', wingIndex: 1, label: 'Prep Start Times 1',
        shown: [
          fact(`${pName(a)} finishes dialysis and can start pre-surgery steps at 01:50.`, a, { tag: 'rev', startMin: 110 }),
          fact(`${pName(b)} arrives from across town and can start pre-surgery steps at 02:10.`, b, { tag: 'rev', startMin: 130 }),
        ],
        alt: [
          fact(`${pName(a)} arrives late and can start pre-surgery steps at 02:15.`, a, { tag: 'rev', startMin: 135 }),
          fact(`${pName(b)} is already upstairs and can start pre-surgery steps at 01:45.`, b, { tag: 'rev', startMin: 105 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Patient ETAs', wingIndex: 1, label: 'Prep Start Times 2',
        shown: [
          fact(`${pName(c)} is ALREADY done with the 25-min blood crossmatch! Only needs scan (20m) + setup (15m), starting at 02:20.`, c, { tag: 'rev_c', startMin: 140, needed: 35 }),
          fact(`${pName(d)} can start all three steps at 02:05.`, d, { tag: 'rev', startMin: 125 }),
        ],
        alt: [
          fact(`${pName(c)} needs all three steps and can start at 02:20.`, c, { tag: 'rev_c', startMin: 140, needed: 60 }),
          fact(`${pName(d)} can start all three steps at 02:05.`, d, { tag: 'rev', startMin: 125 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'OR Schedule', wingIndex: 0, label: 'Work Backwards from 03:00',
        shown: [
          fact(`Add the mandatory minutes backwards from 03:00 to find the LATEST possible start time for each patient!`, [], { tag: 'rule' }),
          fact(`Watch out: a patient who ALREADY completed one step needs fewer minutes than the full 60-minute chain!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Patient ETAs', wingIndex: 1, label: 'Non-Transplant Bays',
        shown: [
          fact(`${pName(e)} is waiting for an arm splint (not on transplant list).`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)} is cleared to go home.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'OR Schedule', wingIndex: 0, label: 'Lock In Eligible Candidates',
        shown: [
          fact(`Clear EVERY transplant candidate who can realistically finish all remaining prep steps by 03:00 sharp (≤ 03:00).`, [], { tag: 'rule' }),
          fact(`Anyone finishing past 03:00 misses the organ preservation window.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Countdown to 03:00 Organ',
      dispatch: 'A donor heart lands at 03:00 sharp — work backwards from 03:00 through every prep step to see who can make the table in time.',
      order: 'Prep EVERY transplant candidate who can finish all remaining required steps by 03:00 sharp.',
      hint: 'Work backward from 03:00 (25 + 20 + 15 = 60 min full chain, or shorter if a step is already done!).',
      bayDefaultLabel: 'Transplant Prep',
      bayLabels: { [e]: 'Minor · Splint', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const deadline = 180; // 03:00
        const items = [...factsByTag(activeCards, 'rev'), ...factsByTag(activeCards, 'rev_c')].map((x) => {
          const need = x.needed ?? 60;
          return { id: x.patients[0], finish: x.startMin + need, need };
        });
        const targets = uniqueSortedIds(items.filter((x) => x.finish <= deadline).map((x) => x.id));
        const rivals = items.filter((x) => x.finish > deadline).sort((x, y) => x.finish - y.finish).map((x) => x.id);
        return {
          targets,
          proof: `Working backward from 03:00 (60 min full prep → 02:00 cutoff; 35 min remaining → 02:25 cutoff) shows ${formatList(targets)} make the 03:00 table on time.`,
          rival: buildRivalInfo(targets, rivals, (id) => {
            const r = items.find((x) => x.id === id);
            return `${pName(id)} would not finish prep until 03:${String(r.finish - 180).padStart(2, '0')} — missing the hard 03:00 cutoff.`;
          }),
        };
      },
    };
  },

  // =========================================================================
  // FAMILY 6: CREATIVE & SYNTHETIC REASONING (#53–#61)
  // =========================================================================

  // #53 Divergent reasoning (Inside · Atomic)
  'divergent-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Diagnostic Wide', wingIndex: 0, label: 'Tunnel-Vision Danger',
        shown: [
          fact(`Tunnel vision trap: seeing "Leg Pain" and assuming "Just a muscle cramp!" misses deadly mimics (blood clot, torn artery, trapped nerve).`, [], { tag: 'rule' }),
          fact(`Keep the wide diagnostic workup open ONLY when a patient's symptoms could fit MULTIPLE dangerous causes — not when one obvious minor cause explains everything!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Bay Charts', wingIndex: 1, label: 'Cases A & B',
        shown: [
          fact(`${pName(a)}: Sudden severe calf pain + pale foot + recent long flight + diabetes — could be artery blockage, deep vein clot, OR muscle pressure buildup (3 serious causes open!).`, a, { tag: 'open_multi' }),
          fact(`${pName(b)}: Twisted ankle stepping off a curb; X-ray clearly shows one clean minor ankle sprain, warm pink foot (single clear explanation).`, b, { tag: 'single_clear' }),
        ],
        alt: [
          fact(`${pName(c)}: Sudden severe calf pain + pale foot + recent long flight + diabetes — could be artery blockage, deep vein clot, OR muscle pressure buildup (3 serious causes open!).`, c, { tag: 'open_multi' }),
          fact(`${pName(b)}: Twisted ankle stepping off a curb; X-ray clearly shows one clean minor ankle sprain, warm pink foot (single clear explanation).`, b, { tag: 'single_clear' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Bay Charts', wingIndex: 1, label: 'Cases C & D',
        shown: [
          fact(`${pName(c)}: Stubbed toe on a door frame; small nail bruise, normal circulation (single obvious cause).`, c, { tag: 'single_clear' }),
          fact(`${pName(d)}: Sudden dizzy blackout + chest ache + black stool — could be heart rhythm failure, stomach bleed, OR lung clot (3 serious causes open!).`, d, { tag: 'open_multi' }),
        ],
        alt: [
          fact(`${pName(a)}: Stubbed toe on a door frame; small nail bruise, normal circulation (single obvious cause).`, a, { tag: 'single_clear' }),
          fact(`${pName(d)}: Paper cut on thumb; bandaged and calm (single obvious cause).`, d, { tag: 'single_clear' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Diagnostic Wide', wingIndex: 0, label: 'Wide Panel Cost',
        shown: [
          fact(`Full multi-cause trauma panels tie up ultrasound, blood labs, and heart monitors all at once.`, [], { tag: 'rule' }),
          fact(`Reserve full multi-hypothesis workups for patients whose clues genuinely span multiple life-threatening possibilities.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Bay Charts', wingIndex: 1, label: 'Other Bays',
        shown: [
          fact(`${pName(e)}: Clear bee sting on hand with mild local redness only.`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)}: Cleared to go home with crutches.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Diagnostic Wide', wingIndex: 0, label: 'Order Wide Workup',
        shown: [
          fact(`Open a full multi-cause diagnostic workup for EVERY patient where 3+ serious alternative explanations remain open.`, [], { tag: 'rule' }),
          fact(`Do not over-test single obvious minor injuries.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Break Tunnel Vision',
      dispatch: 'Don’t get trapped on the first obvious guess — open wide multi-cause workups ONLY where multiple serious explanations remain alive.',
      order: 'Order a full multi-cause diagnostic workup for EVERY patient with multiple serious alternative explanations still open.',
      hint: 'Separate ambiguous multi-danger presentations from single obvious minor injuries.',
      bayDefaultLabel: 'Broad Workup',
      bayLabels: { [e]: 'Minor · Sting', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const targets = uniqueSortedIds([...tagSet(activeCards, 'open_multi')]);
        const rivals = [...tagSet(activeCards, 'single_clear')];
        return {
          targets,
          proof: `${formatList(targets)} have clues spanning multiple competing life-threatening hypotheses that demand a wide parallel workup.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} has a single obvious, confirmed minor explanation with no competing deadly mimics.`),
        };
      },
    };
  },

  // #54 Convergent reasoning (Inside · Atomic)
  'convergent-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Filter 1 · Radio', wingIndex: 0, label: 'Clue 1: Crash Vehicle',
        shown: [
          fact(`Four patients came from the highway pileup: ${pName(a)}, ${pName(b)}, ${pName(c)}, and ${pName(d)}.`, [a, b, c, d], { tag: 'c1' }),
          fact(`${pName(e)} and ${pName(f)} arrived from separate home accidents.`, [e, f], { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Filter 2 · Exam', wingIndex: 1, label: 'Clue 2: High Fever / Sweat',
        shown: [
          fact(`Of the pileup group, ${pName(a)}, ${pName(b)}, and ${pName(c)} have pale clammy skin (narrowed from 4 → 3).`, [a, b, c], { tag: 'c2' }),
          fact(`${pName(d)} has warm dry pink skin and steady vitals.`, d, { tag: 'out' }),
        ],
        alt: [
          fact(`Of the pileup group, ${pName(b)}, ${pName(c)}, and ${pName(d)} have pale clammy skin (narrowed from 4 → 3).`, [b, c, d], { tag: 'c2' }),
          fact(`${pName(a)} has warm dry pink skin and steady vitals.`, a, { tag: 'out' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Filter 3 · Lab', wingIndex: 0, label: 'Clue 3: Falling Blood Count',
        shown: [
          fact(`Repeat blood count dropped sharply ONLY in ${pName(a)} and ${pName(b)} (narrowed from 3 → 2).`, [a, b], { tag: 'c3' }),
          fact(`${pName(c)}'s repeat blood count held completely steady.`, c, { tag: 'out' }),
        ],
        alt: [
          fact(`Repeat blood count dropped sharply ONLY in ${pName(b)} and ${pName(d)} (narrowed from 3 → 2).`, [b, d], { tag: 'c3' }),
          fact(`${pName(c)}'s repeat blood count held completely steady.`, c, { tag: 'out' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Filter 4 · Scan', wingIndex: 1, label: 'Clue 4: Urgent Belly Scan',
        shown: [
          fact(`Ultrasound confirms active pelvic bleeding ONLY in ${pName(a)} (narrowed from 2 → 1!).`, a, { tag: 'c4' }),
          fact(`${pName(b)}'s ultrasound is dry; their blood drop was from an already-bandaged arm cut.`, b, { tag: 'out' }),
        ],
        alt: [
          fact(`Ultrasound confirms active pelvic bleeding ONLY in ${pName(d)} (narrowed from 2 → 1!).`, d, { tag: 'c4' }),
          fact(`${pName(b)}'s ultrasound is dry; their blood drop was from an already-bandaged arm cut.`, b, { tag: 'out' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Filter 1 · Radio', wingIndex: 0, label: 'Four-Way Intersection',
        shown: [
          fact(`Four independent hospital departments (Paramedics, Exam, Blood Lab, Ultrasound) each narrowed the funnel by one step.`, [], { tag: 'rule' }),
          fact(`Only ONE patient stands at the center where all four independent clues point together.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Filter 4 · Scan', wingIndex: 1, label: 'Emergency OR Call',
        shown: [
          fact(`Send the SINGLE patient confirmed by all four matching lines of evidence to the Pelvic Surgery Suite.`, [], { tag: 'rule' }),
          fact(`All other pileup victims can be managed safely in regular ER bays.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Four Independent Clues',
      dispatch: 'Four independent departments each narrowed the highway pileup funnel — follow all four filters down to the ONE surgical emergency.',
      order: 'Send the SINGLE patient where all four independent lines of evidence point together into Pelvic Surgery.',
      hint: 'Intersect Radio → Exam → Blood Lab → Ultrasound step-by-step down to one exact patient.',
      bayDefaultLabel: 'Pileup Funnel',
      bayLabels: { [e]: 'Minor · Home', [f]: 'Minor · Home' },
      cards,
      evaluate(activeCards) {
        const c1 = new Set(factsByTag(activeCards, 'c1').flatMap((f) => f.patients));
        const c2 = new Set(factsByTag(activeCards, 'c2').flatMap((f) => f.patients));
        const c3 = new Set(factsByTag(activeCards, 'c3').flatMap((f) => f.patients));
        const c4 = new Set(factsByTag(activeCards, 'c4').flatMap((f) => f.patients));
        const targets = uniqueSortedIds([...c1].filter((id) => c2.has(id) && c3.has(id) && c4.has(id)));
        const rivals = [a, b, c, d].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `All four independent channels (pileup, clammy skin, falling blood count, positive pelvic ultrasound) converge strictly on ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} dropped out of the funnel on at least one of the four independent checks.`),
        };
      },
    };
  },

  // #55 Synthetic reasoning (Inside · Composite)
  'synthetic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Intake Desk', wingIndex: 0, label: 'Fragment 1: Minor Bump',
        shown: [
          fact(`${pName(a)} bumped the side of their head softly on a cabinet 2 hours ago — looked totally fine at arrival.`, a, { tag: 'f1' }),
          fact(`${pName(b)} also bumped their forehead on a car door 2 hours ago — chatting normally.`, b, { tag: 'f1' }),
        ],
        alt: [
          fact(`${pName(b)} bumped the side of their head softly on a cabinet 2 hours ago — looked totally fine at arrival.`, b, { tag: 'f1' }),
          fact(`${pName(c)} also bumped their forehead on a car door 2 hours ago — chatting normally.`, c, { tag: 'f1' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Pharmacy List', wingIndex: 1, label: 'Fragment 2: Home Meds',
        shown: [
          fact(`Home medication sync just arrived: ${pName(a)} takes a strong daily prescription BLOOD THINNER!`, a, { tag: 'f2' }),
          fact(`Home medication sync: ${pName(b)} and ${pName(c)} take ZERO blood thinners.`, [b, c], { tag: 'no_thin' }),
        ],
        alt: [
          fact(`Home medication sync just arrived: ${pName(b)} takes a strong daily prescription BLOOD THINNER!`, b, { tag: 'f2' }),
          fact(`Home medication sync: ${pName(a)} and ${pName(c)} take ZERO blood thinners.`, [a, c], { tag: 'no_thin' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Waiting Room', wingIndex: 0, label: 'Fragment 3: Quiet Change',
        shown: [
          fact(`Waiting-room aide noticed ${pName(a)} just vomited once and became unusually drowsy.`, a, { tag: 'f3' }),
          fact(`${pName(d)} vomited once after eating bad seafood — zero head bump, zero blood thinners.`, d, { tag: 'food' }),
        ],
        alt: [
          fact(`Waiting-room aide noticed ${pName(b)} just vomited once and became unusually drowsy.`, b, { tag: 'f3' }),
          fact(`${pName(d)} vomited once after eating bad seafood — zero head bump, zero blood thinners.`, d, { tag: 'food' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Eye Check', wingIndex: 1, label: 'Fragment 4: Pupil Clue',
        shown: [
          fact(`Flashlight check: ${pName(a)}'s right pupil just widened noticeably larger than the left!`, a, { tag: 'f4' }),
          fact(`${pName(b)}'s pupils are equal, brisk, and sharp.`, b, { tag: 'ok_eye' }),
        ],
        alt: [
          fact(`Flashlight check: ${pName(b)}'s right pupil just widened noticeably larger than the left!`, b, { tag: 'f4' }),
          fact(`${pName(a)}'s pupils are equal, brisk, and sharp.`, a, { tag: 'ok_eye' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Intake Desk', wingIndex: 0, label: 'The Hidden Whole',
        shown: [
          fact(`Alone, a mild bump or a daily pill looks boring — TOGETHER, Bump + Blood Thinner + Drowsy Vomit + Unequal Pupil = EXPANDING BRAIN BLEED!`, [], { tag: 'rule' }),
          fact(`${pName(e)} takes blood thinners for heart health, came in for a stubbed finger (zero head bump, alert).`, e, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Eye Check', wingIndex: 1, label: 'STAT Head Scan',
        shown: [
          fact(`${pName(f)} is waiting for a routine flu shot.`, f, { tag: 'safe', calm: true }),
          fact(`Synthesize all 4 scattered fragments and rush the ONE hidden brain-bleed patient to emergency reversal & head CT!`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Four Quiet Clues, One Bleed',
      dispatch: 'No single card looks alarming by itself — stitch together all four scattered fragments to catch a silent expanding brain bleed.',
      order: 'Rush the SINGLE patient whose four scattered fragments combine into a hidden expanding brain bleed to Head CT.',
      hint: 'Connect Head Bump + Daily Blood Thinner + Sudden Drowsy Vomit + Unequal Pupil across all 4 cards.',
      bayDefaultLabel: 'Head / Obs',
      bayLabels: { [e]: 'Minor · Finger', [f]: 'Routine · Shot' },
      cards,
      evaluate(activeCards) {
        const f1 = tagSet(activeCards, 'f1');
        const f2 = tagSet(activeCards, 'f2');
        const f3 = tagSet(activeCards, 'f3');
        const f4 = tagSet(activeCards, 'f4');
        const targets = uniqueSortedIds([...f1].filter((id) => f2.has(id) && f3.has(id) && f4.has(id)));
        const rivals = [a, b, c, d].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Synthesizing all four quiet fragments for ${formatList(targets)} (mild head bump + daily blood thinner + drowsy vomiting + unequal pupil) reveals a life-threatening expanding brain bleed.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} only carries one isolated benign clue, not the combined 4-part brain-bleed picture.`),
        };
      },
    };
  },

  // #56 Dialectical reasoning (Inside · Composite)
  'dialectical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Case Debate', wingIndex: 0, label: 'Two Clashing Specialists',
        shown: [
          fact(`Surgeon (Thesis): "Open surgery stops internal bleeding fast — waiting kills!"`, [], { tag: 'rule' }),
          fact(`Heart Doctor (Antithesis): "General anesthesia stops a weak heart — full open surgery kills!"`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Hybrid Suite', wingIndex: 1, label: 'The Synthesis Pathway',
        shown: [
          fact(`Synthesis Solution: Tiny pinhole catheter plug under LOCAL numbing only (stops bleeding WITHOUT putting the weak heart under general anesthesia!).`, [], { tag: 'rule' }),
          fact(`Reserve this rare Hybrid Pinhole Suite ONLY for patients caught in BOTH dangers at once: active internal bleed AND heart too weak for general anesthesia!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Case Debate', wingIndex: 0, label: 'Patient Profiles 1',
        shown: [
          fact(`${pName(a)}: Active spleen bleed + severely weak heart (general anesthesia would be fatal!).`, a, { tag: 'both_clash' }),
          fact(`${pName(b)}: Active spleen bleed + rock-strong healthy heart (normal open surgery is fast and safe!).`, b, { tag: 'surg_only' }),
        ],
        alt: [
          fact(`${pName(c)}: Active spleen bleed + severely weak heart (general anesthesia would be fatal!).`, c, { tag: 'both_clash' }),
          fact(`${pName(b)}: Active spleen bleed + rock-strong healthy heart (normal open surgery is fast and safe!).`, b, { tag: 'surg_only' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Hybrid Suite', wingIndex: 1, label: 'Patient Profiles 2',
        shown: [
          fact(`${pName(c)}: Severely weak heart + ZERO bleeding (needs heart pills only, no bleed procedure!).`, c, { tag: 'heart_only' }),
          fact(`${pName(d)}: Minor wrist fracture + strong heart (simple cast, zero conflict).`, d, { tag: 'safe', calm: true }),
        ],
        alt: [
          fact(`${pName(a)}: Severely weak heart + ZERO bleeding (needs heart pills only, no bleed procedure!).`, a, { tag: 'heart_only' }),
          fact(`${pName(d)}: Minor wrist fracture + strong heart (simple cast, zero conflict).`, d, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Case Debate', wingIndex: 0, label: 'Routine Bays',
        shown: [
          fact(`${pName(e)} is waiting for stitch removal.`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)} is cleared to go home.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Hybrid Suite', wingIndex: 1, label: 'Hybrid Suite Slot',
        shown: [
          fact(`Only ONE Hybrid Pinhole Suite exists — assign the single patient where Surgeon and Heart Doctor directly clash!`, [], { tag: 'rule' }),
          fact(`Patients with only one problem go cleanly to standard surgery or standard heart care.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Surgeon vs Heart Doctor',
      dispatch: 'Surgeon says "operate now" while Heart Doctor says "anesthesia will kill them" — send the clashing case to the Hybrid Pinhole synthesis.',
      order: 'Assign the lone Hybrid Pinhole Suite to the SINGLE patient caught in BOTH active bleeding AND anesthesia-intolerant heart weakness.',
      hint: 'Find who needs bleeding stopped WITHOUT general anesthesia (both constraints clashing together).',
      bayDefaultLabel: 'Hybrid Review',
      bayLabels: { [d]: 'Minor · Cast', [e]: 'Minor · Stitches', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const targets = uniqueSortedIds([...tagSet(activeCards, 'both_clash')]);
        const rivals = [...tagSet(activeCards, 'surg_only'), ...tagSet(activeCards, 'heart_only')];
        return {
          targets,
          proof: `Only ${formatList(targets)} face both clashing risks at once (active bleed + heart too weak for general anesthesia), making local pinhole catheter plugging the true synthesis.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} only has one side of the conflict, so standard open surgery or standard heart pills work cleanly.`),
        };
      },
    };
  },

  // #57 First-principles reasoning (Inside · Composite)
  'first-principles': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Core Biology', wingIndex: 0, label: 'The Oxygen Truck Formula',
        shown: [
          fact(`Think from scratch: Brain Oxygen = (Number of Blood-Cell Trucks) × (How Full Each Truck Is %) × (Heart Pump Speed).`, [], { tag: 'rule' }),
          fact(`A finger clip ONLY measures how full each remaining truck is — if you lost HALF your trucks (red blood cells), a "99% full" screen still means brain starvation!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Lab & Monitor', wingIndex: 1, label: 'Readings A & B',
        shown: [
          fact(`${pName(a)}: Finger clip = 99% full · Normal heart pump · Red blood cells crashed from 14 → 6 (over HALF the trucks gone!).`, a, { tag: 'fp_low' }),
          fact(`${pName(b)}: Finger clip = 93% full · Normal heart pump · Red blood cells = 14 (full fleet of trucks!).`, b, { tag: 'fp_ok' }),
        ],
        alt: [
          fact(`${pName(a)}: Finger clip = 95% full · Normal heart pump · Red blood cells = 14 (full fleet of trucks!).`, a, { tag: 'fp_ok' }),
          fact(`${pName(b)}: Finger clip = 99% full · Normal heart pump · Red blood cells crashed from 14 → 6 (over HALF the trucks gone!).`, b, { tag: 'fp_low' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Lab & Monitor', wingIndex: 1, label: 'Readings C & D',
        shown: [
          fact(`${pName(c)}: Finger clip = 96% full · Normal heart pump · Red blood cells = 13.5.`, c, { tag: 'fp_ok' }),
          fact(`${pName(d)}: Finger clip = 94% full · Normal heart pump · Red blood cells = 15 (extra-large fleet!).`, d, { tag: 'fp_ok' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Core Biology', wingIndex: 0, label: 'Why "99%" Fools Rookies',
        shown: [
          fact(`Compare Total Delivery: 6 trucks × 99% ≈ 5.9 units of oxygen vs 14 trucks × 93% ≈ 13.0 units of oxygen (MORE THAN DOUBLE!).`, [], { tag: 'rule' }),
          fact(`Never get lulled to sleep by a shiny 99% finger monitor when red blood cells are half-empty!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Lab & Monitor', wingIndex: 1, label: 'Routine Bays',
        shown: [
          fact(`${pName(e)} has normal blood cells (14) and 98% clip (sprained finger).`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)} is waiting for discharge instructions.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Core Biology', wingIndex: 0, label: 'Red-Cell Transfusion',
        shown: [
          fact(`More oxygen mask air CANNOT fill trucks that aren't there — transfuse fresh red blood cells to the SINGLE patient whose total delivery collapsed!`, [], { tag: 'rule' }),
          fact(`Ignore tiny 93% vs 99% finger-clip differences when blood counts are full.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'The 99% Oxygen Illusion',
      dispatch: 'One patient shows a reassuring "99%" on the finger clip while their brain is actually starving for oxygen — reason from basic physics!',
      order: 'Transfuse fresh red blood cells to the SINGLE patient whose TRUE total oxygen delivery collapsed by over half.',
      hint: 'Multiply (Red Blood Cells × Finger Clip %) from scratch — don’t get fooled by 99% on a half-empty fleet.',
      bayDefaultLabel: 'O2 Delivery',
      bayLabels: { [e]: 'Minor · Finger', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const targets = uniqueSortedIds([...tagSet(activeCards, 'fp_low')]);
        const rivals = [...tagSet(activeCards, 'fp_ok')];
        return {
          targets,
          proof: `From basic physics (Trucks × Fullness), ${formatList(targets)}'s 6 red-cell count cuts true oxygen delivery in half despite a deceptive 99% finger reading.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)}'s finger clip may look slightly lower (93–96%), yet their full 14-unit red-cell fleet delivers over double the oxygen.`),
        };
      },
    };
  },

  // #58 Lateral reasoning (Before · Composite)
  'lateral-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Chaos Triage', wingIndex: 0, label: 'The Screaming Paradox',
        shown: [
          fact(`Rookie instinct: run straight to whoever is screaming the loudest!`, [], { tag: 'rule' }),
          fact(`Trauma insight: SCREAMING AT FULL VOLUME PROVES AN OPEN AIRWAY AND STRONG LUNGS — the deadly danger is the patient who went COMPLETELY SILENT!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Lobby Noise', wingIndex: 1, label: 'Loud Patients',
        shown: [
          fact(`${pName(a)} is yelling at the top of their lungs over a painful broken wrist (strong voice, clear pink face).`, a, { tag: 'loud' }),
          fact(`${pName(b)} is crying loudly and shouting for mom over a bloody scalp scrape (strong breaths, alert).`, b, { tag: 'loud' }),
        ],
        alt: [
          fact(`${pName(a)} is slumped completely silent, clutching their throat with blue lips and zero air moving!`, a, { tag: 'silent_danger' }),
          fact(`${pName(b)} is crying loudly and shouting for mom over a bloody scalp scrape (strong breaths, alert).`, b, { tag: 'loud' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Lobby Noise', wingIndex: 1, label: 'Quiet Corners',
        shown: [
          fact(`${pName(c)} is sitting in the corner completely SILENT, clutching their throat with widening frightened eyes and blue-tinted lips!`, c, { tag: 'silent_danger' }),
          fact(`${pName(d)} is quietly napping on a bench after getting stitches — steady deep rhythmic breathing, pink lips.`, d, { tag: 'calm_sleep' }),
        ],
        alt: [
          fact(`${pName(c)} is yelling loudly at staff about a bruised knee (strong lungs, pink face).`, c, { tag: 'loud' }),
          fact(`${pName(d)} is quietly napping on a bench after getting stitches — steady deep rhythmic breathing, pink lips.`, d, { tag: 'calm_sleep' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Chaos Triage', wingIndex: 0, label: 'Silence Check',
        shown: [
          fact(`Wait: not every quiet person is choking — check breathing & lip color to tell peaceful sleep (${pName(d)}) from silent airway blockage!`, d, { tag: 'note' }),
          fact(`Loud yelling guarantees airflow — bypass the loudest screamers first.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Lobby Noise', wingIndex: 1, label: 'Other Arrivals',
        shown: [
          fact(`${pName(e)} is loudly complaining about waiting time for a mild cold.`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)} is walking out the door with discharge papers.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Chaos Triage', wingIndex: 0, label: 'Immediate Rescue',
        shown: [
          fact(`Look past the loud distractions — rush straight to the SINGLE silently suffocating patient!`, [], { tag: 'rule' }),
          fact(`Seconds count when zero air is moving.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'The Silent Waiting Room',
      dispatch: 'Screams echo through the ER lobby — flip your gut instinct upside down and spot who is truly losing their airway.',
      order: 'Rush straight past the loud distractions to clear the airway of the SINGLE silently suffocating patient.',
      hint: 'Screaming proves air is flowing — look for silent distress + blue lips (not peaceful normal sleep).',
      bayDefaultLabel: 'Lobby Triage',
      bayLabels: { [e]: 'Minor · Cold', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const targets = uniqueSortedIds([...tagSet(activeCards, 'silent_danger')]);
        const rivals = [...tagSet(activeCards, 'loud'), ...tagSet(activeCards, 'calm_sleep')];
        return {
          targets,
          proof: `Looking past the loudest screamers (whose shouting proves open airways) catches silently suffocating ${formatList(targets)} clutching their throat with blue lips.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} is either loudly proving an open airway or sleeping with normal pink breathing.`),
        };
      },
    };
  },

  // #59 Generative reasoning (Inside · Composite)
  'generative-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Field Supply', wingIndex: 0, label: 'Out-of-Stock Improvisation',
        shown: [
          fact(`Earthquake cut supply trucks! Standard factory pelvic binders and cooling machines are GONE.`, [], { tag: 'rule' }),
          fact(`We CAN improvise an effective life-saving bridge ONLY when ordinary ward gear solves the exact physics: Bed Sheet + Clamps = Pelvic Binder; Cold Wet Sheets + Box Fan = Heatstroke Cooling!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Field Bays', wingIndex: 1, label: 'Cases A & B',
        shown: [
          fact(`${pName(a)}: Crushed open pelvic ring bleeding internally — a tightly wrapped knotted bed sheet around the hips closes the pelvis and stops the bleed!`, a, { tag: 'improv_ok' }),
          fact(`${pName(b)}: Complete heart valve tear deep inside the chest — requires a full heart-lung bypass machine (impossible to improvise with ward supplies!).`, b, { tag: 'no_improv' }),
        ],
        alt: [
          fact(`${pName(a)}: Complete heart valve tear deep inside the chest — requires a full heart-lung bypass machine (impossible to improvise with ward supplies!).`, a, { tag: 'no_improv' }),
          fact(`${pName(b)}: Crushed open pelvic ring bleeding internally — a tightly wrapped knotted bed sheet around the hips closes the pelvis and stops the bleed!`, b, { tag: 'improv_ok' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Field Bays', wingIndex: 1, label: 'Cases C & D',
        shown: [
          fact(`${pName(c)}: Dangerous 105°F heatstroke — soaking in cold wet sheets directly in front of our box fan drops temperature rapidly!`, c, { tag: 'improv_ok' }),
          fact(`${pName(d)}: Deep brain aneurysm needing a micro-surgical laser coil (impossible to improvise — must airlift!).`, d, { tag: 'no_improv' }),
        ],
        alt: [
          fact(`${pName(c)}: Deep brain aneurysm needing a micro-surgical laser coil (impossible to improvise — must airlift!).`, c, { tag: 'no_improv' }),
          fact(`${pName(d)}: Dangerous 105°F heatstroke — soaking in cold wet sheets directly in front of our box fan drops temperature rapidly!`, d, { tag: 'improv_ok' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Field Supply', wingIndex: 0, label: 'Available Gear Closet',
        shown: [
          fact(`Closet inventory: heavy cotton bed sheets, metal clamps, cold tap water, and two high-speed hallway box fans.`, [], { tag: 'rule' }),
          fact(`No heart-lung machine and no neuro-laser coils exist on site.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Field Bays', wingIndex: 1, label: 'Minor Bays',
        shown: [
          fact(`${pName(e)} has a minor scraped knee (bandaged cleanly already).`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)} is completely uninjured and helping hand out water.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Field Supply', wingIndex: 0, label: 'Deploy Improvised Bridges',
        shown: [
          fact(`Stabilize on-site EVERY critical patient whose physics can be genuinely solved with our improvised closet gear.`, [], { tag: 'rule' }),
          fact(`Tag the non-improvisable internal valve/aneurysm cases for immediate helicopter transfer instead.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Earthquake Field Improvisation',
      dispatch: 'Standard machines are gone after the quake — check which critical emergencies can truly be bridged with improvised ward gear.',
      order: 'Stabilize on-site EVERY critical patient whose emergency can be solved using improvised sheets, water, clamps, and fans.',
      hint: 'Match the available closet physics (compression wrap + evaporative cooling) vs deep surgical hardware.',
      bayDefaultLabel: 'Quake Triage',
      bayLabels: { [e]: 'Minor · Scrape', [f]: 'Uninjured · Calm' },
      cards,
      evaluate(activeCards) {
        const targets = uniqueSortedIds([...tagSet(activeCards, 'improv_ok')]);
        const rivals = [...tagSet(activeCards, 'no_improv')];
        return {
          targets,
          proof: `Creative field improvisation (knotted sheet pelvic compression + wet-sheet evaporative fan cooling) immediately stabilizes ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)}'s deep internal valve or brain-coil crisis cannot be improvised with closet supplies and requires helicopter transfer.`),
        };
      },
    };
  },

  // #60 Decompositional reasoning (Inside · Composite)
  'decompositional-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Complex Crash', wingIndex: 0, label: 'Peel Away the Noise',
        shown: [
          fact(`Messy crash victims arrive with 4 dramatic injuries at once — break each patient's list into: LIFE-THREATENING (airway/major artery/collapsed lung) vs DRAMATIC BUT NON-FATAL (broken nose, torn ear, forearm fracture).`, [], { tag: 'rule' }),
          fact(`Don't get hypnotized by gruesome non-fatal scrapes — find who STILL has an UNSOLVED life-threatening sub-problem hidden inside their list!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Injury Lists', wingIndex: 1, label: 'Breakdown A & B',
        shown: [
          fact(`${pName(a)}: [1] Broken nose (bloody) · [2] Sprained wrist · [3] Torn jacket · [4] UNTREATED bubbling chest stab sucking air into lung!`, a, { tag: 'hidden_fatal' }),
          fact(`${pName(b)}: [1] Dramatic bloody forehead cut (already stopped) · [2] Broken forearm · [3] Chipped tooth · [4] Bruised shin (all vitals rock-steady!).`, b, { tag: 'noisy_safe' }),
        ],
        alt: [
          fact(`${pName(a)}: [1] Dramatic bloody forehead cut · [2] Broken forearm · [3] Chipped tooth · [4] Bruised shin (all vitals rock-steady!).`, a, { tag: 'noisy_safe' }),
          fact(`${pName(b)}: [1] Broken nose · [2] Sprained wrist · [3] Torn jacket · [4] UNTREATED bubbling chest stab sucking air into lung!`, b, { tag: 'hidden_fatal' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Injury Lists', wingIndex: 1, label: 'Breakdown C & D',
        shown: [
          fact(`${pName(c)}: [1] Collapsed lung (ALREADY FIXED with working chest tube!) · [2] Scraped elbow · [3] Broken finger (oxygen now 99%!).`, c, { tag: 'already_fixed' }),
          fact(`${pName(d)}: [1] Minor ankle twist · [2] Muddy clothes · [3] UNTREATED bright-red spurting groin artery hidden under winter coat!`, d, { tag: 'hidden_fatal' }),
        ],
        alt: [
          fact(`${pName(c)}: [1] Collapsed lung (ALREADY FIXED with working chest tube!) · [2] Scraped elbow · [3] Broken finger (oxygen now 99%!).`, c, { tag: 'already_fixed' }),
          fact(`${pName(d)}: [1] Minor ankle twist · [2] Muddy clothes · [3] Bruised knee (no bleeding, clear lungs!).`, d, { tag: 'noisy_safe' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Complex Crash', wingIndex: 0, label: 'Check "Already Fixed" Status',
        shown: [
          fact(`Decompose carefully: a severe injury that was ALREADY fixed (${pName(c)}'s chest tube) is no longer an active emergency!`, c, { tag: 'note' }),
          fact(`Look at the bottom of every messy injury list for untreated chest air or arterial bleeding.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Injury Lists', wingIndex: 1, label: 'Routine Bays',
        shown: [
          fact(`${pName(e)}: [1] Paper cut · [2] Mild cough (completely stable).`, e, { tag: 'safe', calm: true }),
          fact(`${pName(f)}: Cleared to go home.`, f, { tag: 'safe', calm: true }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Complex Crash', wingIndex: 0, label: 'Immediate Resus Call',
        shown: [
          fact(`Rush EVERY patient hiding an UNTREATED life-threatening sub-problem into immediate resuscitation.`, [], { tag: 'rule' }),
          fact(`Skip loud non-fatal fractures and already-stabilized bays.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Peel Away the Noise',
      dispatch: 'Each crash victim has a messy 4-item injury list — decompose every list to catch the UNTREATED life-threatening problem buried inside.',
      order: 'Intervene immediately on EVERY patient who still has an UNTREATED life-threatening sub-problem.',
      hint: 'Separate gruesome non-fatal injuries and already-fixed tubes from active untreated chest/artery threats.',
      bayDefaultLabel: 'Multi-Trauma',
      bayLabels: { [e]: 'Minor · Stable', [f]: 'Cleared · Home' },
      cards,
      evaluate(activeCards) {
        const targets = uniqueSortedIds([...tagSet(activeCards, 'hidden_fatal')]);
        const rivals = [...tagSet(activeCards, 'noisy_safe'), ...tagSet(activeCards, 'already_fixed')];
        return {
          targets,
          proof: `Decomposing each 4-part list separates gruesome noise from reality, exposing untreated fatal chest/artery injuries in ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)}'s injuries are either dramatic but non-fatal or already stabilized with a working chest tube.`),
        };
      },
    };
  },

  // #61 Emergent reasoning (Inside · Composite)
  'emergent-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Pharmacy Combo', wingIndex: 0, label: 'Safe Alone, Deadly Together',
        shown: [
          fact(`Each pill below is 100% safe by itself — BUT when ONE patient takes BOTH Pill X (Mood Booster) AND Pill Y (Migraine/Pain Shot) together, an emergent toxic fever-and-seizure storm erupts!`, [], { tag: 'rule' }),
          fact(`Check both pharmacy lists to find who accidentally got BOTH drugs in the same body!`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Home Meds', wingIndex: 1, label: 'List 1: Daily Mood Booster (Pill X)',
        shown: [
          fact(`Patients taking daily Pill X (Mood Booster) at home: ${pName(a)}, ${pName(b)}, and ${pName(e)}.`, [a, b, e], { tag: 'pillX' }),
          fact(`${pName(c)} and ${pName(d)} take ZERO mood medications at home.`, [c, d], { tag: 'noX' }),
        ],
        alt: [
          fact(`Patients taking daily Pill X (Mood Booster) at home: ${pName(b)}, ${pName(c)}, and ${pName(e)}.`, [b, c, e], { tag: 'pillX' }),
          fact(`${pName(a)} and ${pName(d)} take ZERO mood medications at home.`, [a, d], { tag: 'noX' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'ER Injections', wingIndex: 0, label: 'List 2: ER Pain/Migraine Shot (Pill Y)',
        shown: [
          fact(`ER nurse just gave Pill Y (Migraine/Pain Shot) to: ${pName(a)}, ${pName(c)}, and ${pName(d)}.`, [a, c, d], { tag: 'pillY' }),
          fact(`${pName(b)} and ${pName(e)} received plain ice packs only (ZERO Pill Y).`, [b, e], { tag: 'noY' }),
        ],
        alt: [
          fact(`ER nurse just gave Pill Y (Migraine/Pain Shot) to: ${pName(a)}, ${pName(c)}, and ${pName(d)}.`, [a, c, d], { tag: 'pillY' }),
          fact(`${pName(b)} and ${pName(e)} received plain ice packs only (ZERO Pill Y).`, [b, e], { tag: 'noY' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Pharmacy Combo', wingIndex: 0, label: 'Early Storm Signs',
        shown: [
          fact(`Neither drug causes fever or twitching alone — the interaction ONLY emerges when Pill X + Pill Y collide in the same bloodstream.`, [], { tag: 'rule' }),
          fact(`Check the overlap between the Home Meds card and the ER Injections card.`, [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'ER Injections', wingIndex: 0, label: 'Other Bays',
        shown: [
          fact(`${pName(f)} took neither Pill X nor Pill Y (here for an ankle wrap).`, f, { tag: 'safe', calm: true }),
          fact(`Single-drug patients (${pName(b)}, ${pName(d)}, ${pName(e)}) face ZERO interaction risk.`, [b, d, e], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Pharmacy Combo', wingIndex: 0, label: 'Stop Interaction Storm',
        shown: [
          fact(`Pull the SINGLE patient who received BOTH Pill X AND Pill Y into immediate cooling & blocker rescue!`, [], { tag: 'rule' }),
          fact(`Catching the emergent collision early prevents seizures.`, [], { tag: 'rule' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Safe Alone, Deadly Together',
      dispatch: 'Two completely safe medications just collided in ONE patient’s bloodstream — trace both drug lists to catch the emergent storm.',
      order: 'Rush the SINGLE patient who ended up with BOTH Pill X (home) AND Pill Y (ER shot) into blocker rescue.',
      hint: 'Cross-reference List 1 (daily Mood Booster) against List 2 (ER Migraine/Pain Shot).',
      bayDefaultLabel: 'Drug Interaction',
      bayLabels: { [f]: 'Minor · Ankle' },
      cards,
      evaluate(activeCards) {
        const px = new Set(factsByTag(activeCards, 'pillX').flatMap((f) => f.patients));
        const py = new Set(factsByTag(activeCards, 'pillY').flatMap((f) => f.patients));
        const targets = uniqueSortedIds([...px].filter((id) => py.has(id)));
        const rivals = [...px, ...py].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `Only ${formatList(targets)} combined Pill X (home) with Pill Y (ER shot) — triggering the emergent drug-collision storm neither pill causes alone.`,
          rival: buildRivalInfo(targets, rivals, (id) => `${pName(id)} only took ONE of the two medications, which is completely safe on its own.`),
        };
      },
    };
  },
};
