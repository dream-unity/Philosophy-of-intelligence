// Semantic Clinical Reasoning Engines — Part 2 (Types #42–#80: Families 5–8)
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

function collectFactsByTag(cards, tag) {
  const out = [];
  for (const c of cards) {
    for (const f of c.facts) {
      if (f.tag === tag) out.push({ ...f, card: c });
    }
  }
  return out;
}

export const SEMANTIC_ENGINES_PART2 = {
  // =========================================================================
  // FAMILY 5: STRATEGIC & SYSTEMIC REASONING (#42–#52)
  // =========================================================================

  // #42 Systems reasoning (Inside · Composite)
  'systems-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Trauma Bay', wingIndex: 0, label: 'Bay Check 1',
        shown: [
          fact(`${pName(a)}: Bleeding drops body heat → cold blood stops clotting → bleeds even faster (vicious spiral).`, a, { tag: 'spiral' }),
          fact(`${pName(b)}: Broken wrist — swelling is stable and cooling with ice.`, b, { tag: 'stable' }),
        ],
        alt: [
          fact(`${pName(a)}: Bleeding slowed down after bandages — body heat is steady.`, a, { tag: 'stable' }),
          fact(`${pName(b)}: Bleeding drops body heat → cold blood stops clotting → bleeds even faster (vicious spiral).`, b, { tag: 'spiral' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Trauma Bay', wingIndex: 0, label: 'Bay Check 2',
        shown: [
          fact(`${pName(c)}: Low oxygen weakens heart → weak heart pumps less oxygen → drops oxygen further (vicious spiral).`, c, { tag: 'spiral' }),
          fact(`${pName(d)}: Deep thigh cut — tourniquet already stopped the bleeding.`, d, { tag: 'stable' }),
        ],
        alt: [
          fact(`${pName(c)}: Oxygen mask brought breathing back to steady.`, c, { tag: 'stable' }),
          fact(`${pName(d)}: Low oxygen weakens heart → weak heart pumps less oxygen → drops oxygen further (vicious spiral).`, d, { tag: 'spiral' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Trauma Bay', wingIndex: 0, label: 'Bay Check 3',
        shown: [
          fact(`${pName(e)}: Mild concussion — alert and talking clearly.`, e, { tag: 'stable' }),
          fact(`${pName(f)}: Sprained ribs — breathing comfortably with pain gel.`, f, { tag: 'stable' }),
        ],
        alt: [
          fact(`${pName(e)}: Fast heart drains blood pressure → low pressure forces heart even faster (vicious spiral).`, e, { tag: 'spiral' }),
          fact(`${pName(f)}: Sprained ribs — breathing comfortably with pain gel.`, f, { tag: 'stable' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Warming Unit', wingIndex: 1, label: 'Break-the-Cycle Protocol',
        shown: [
          fact(`A one-off injury stays steady while waiting; a self-worsening spiral crashes fast.`, [], { tag: 'note' }),
          fact(`Interrupt every active vicious spiral before it locks in.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`A one-off injury stays steady while waiting; a self-worsening spiral crashes fast.`, [], { tag: 'note' }),
          fact(`Interrupt every active vicious spiral before it locks in.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Warming Unit', wingIndex: 1, label: 'Warming Blankets',
        shown: [
          fact(`Emergency blood warmers and heart support lines are open.`, [], { tag: 'note' }),
          fact(`Do not waste them on steady, controlled injuries.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Emergency blood warmers and heart support lines are open.`, [], { tag: 'note' }),
          fact(`Do not waste them on steady, controlled injuries.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Warming Unit', wingIndex: 1, label: 'Shift Alert',
        shown: [
          fact(`Watch for symptoms that feed back into themselves and keep getting worse.`, [], { tag: 'note' }),
          fact(`Select every patient currently trapped in a vicious spiral.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Watch for symptoms that feed back into themselves and keep getting worse.`, [], { tag: 'note' }),
          fact(`Select every patient currently trapped in a vicious spiral.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Stopping a Vicious Spiral',
      dispatch: 'Some injuries stay flat while waiting; others feed back into themselves and spiral into collapse.',
      order: 'Treat ONLY the patients trapped in a self-worsening vicious spiral.',
      hint: 'Find every patient whose symptom makes a second problem worse, which feeds back into the first.',
      cards,
      evaluate(activeCards) {
        const targets = collectByTag(activeCards, 'spiral');
        const stable = collectByTag(activeCards, 'stable');
        return {
          targets,
          proof: `${formatList(targets)} are trapped in a self-worsening spiral that will rapidly crash if uninterrupted.`,
          rival: buildRivalInfo(targets, stable, (id) => `${pName(id)}'s injury is steady and not feeding a runaway spiral.`),
        };
      },
    };
  },

  // #43 Strategic reasoning (Before · Composite)
  'strategic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'North Tent', wingIndex: 0, label: 'North Tent Queue',
        shown: [
          fact(`North Tent early arrival: ${pName(a)} (danger score 4).`, a, { tag: 'tent', tent: 'North', score: 4, late: false }),
          fact(`North Tent early arrival: ${pName(b)} (danger score 5).`, b, { tag: 'tent', tent: 'North', score: 5, late: false }),
        ],
        alt: [
          fact(`North Tent early arrival: ${pName(a)} (danger score 1).`, a, { tag: 'tent', tent: 'North', score: 1, late: false }),
          fact(`North Tent early arrival: ${pName(b)} (danger score 2).`, b, { tag: 'tent', tent: 'North', score: 2, late: false }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'South Tent', wingIndex: 1, label: 'South Tent Queue',
        shown: [
          fact(`South Tent early arrival: ${pName(c)} (danger score 2).`, c, { tag: 'tent', tent: 'South', score: 2, late: false }),
          fact(`South Tent early arrival: ${pName(d)} (danger score 2).`, d, { tag: 'tent', tent: 'South', score: 2, late: false }),
        ],
        alt: [
          fact(`South Tent early arrival: ${pName(c)} (danger score 5).`, c, { tag: 'tent', tent: 'South', score: 5, late: false }),
          fact(`South Tent early arrival: ${pName(d)} (danger score 5).`, d, { tag: 'tent', tent: 'South', score: 5, late: false }),
        ],
      }),
      makeCard({
        index: 2, time: '05:00', wing: 'North Tent', wingIndex: 0, label: 'North Newest Wave',
        shown: [
          fact(`North Tent newest arrival: ${pName(e)} (danger score 4).`, e, { tag: 'tent', tent: 'North', score: 4, late: true }),
          fact(`North Tent staff are running thin.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`North Tent newest arrival: ${pName(e)} (danger score 1).`, e, { tag: 'tent', tent: 'North', score: 1, late: true }),
          fact(`North Tent staff are catching up.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 3, time: '05:00', wing: 'South Tent', wingIndex: 1, label: 'South Newest Wave',
        shown: [
          fact(`South Tent newest arrival: ${pName(f)} (danger score 2).`, f, { tag: 'tent', tent: 'South', score: 2, late: true }),
          fact(`South Tent has spare cots open.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`South Tent newest arrival: ${pName(f)} (danger score 6).`, f, { tag: 'tent', tent: 'South', score: 6, late: true }),
          fact(`South Tent is suddenly overflowing.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '06:00', wing: 'Command Desk', wingIndex: 0, label: 'Reserve Team Order',
        shown: [
          fact(`Add up total danger points in North Tent vs. South Tent.`, [], { tag: 'note' }),
          fact(`Send the backup surgical team to the MORE overloaded tent's newest arrival.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Add up total danger points in North Tent vs. South Tent.`, [], { tag: 'note' }),
          fact(`Send the backup surgical team to the MORE overloaded tent's newest arrival.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Command Desk', wingIndex: 1, label: 'Surge Forecast',
        shown: [
          fact(`Earlier arrivals already have first-aid medics on them; the newest arrival in the busier tent has nobody.`, [], { tag: 'note' }),
          fact(`Reinforce the overloaded tent's newest arrival.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Earlier arrivals already have first-aid medics on them; the newest arrival in the busier tent has nobody.`, [], { tag: 'note' }),
          fact(`Reinforce the overloaded tent's newest arrival.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Reinforcing the Busier Triage Tent',
      dispatch: 'Two disaster tents are filling up fast — deploy your single backup team before a bottleneck collapses.',
      order: 'Compare total danger scores in North Tent vs. South Tent, then send backup to the heavier tent\'s newest arrival.',
      hint: 'Add the 3 scores in North vs. the 3 scores in South, then pick the newest arrival in the higher-total tent.',
      cards,
      evaluate(activeCards) {
        const items = collectFactsByTag(activeCards, 'tent');
        const northTotal = items.filter((x) => x.tent === 'North').reduce((s, x) => s + x.score, 0);
        const southTotal = items.filter((x) => x.tent === 'South').reduce((s, x) => s + x.score, 0);
        const heavier = northTotal >= southTotal ? 'North' : 'South';
        const lighter = heavier === 'North' ? 'South' : 'North';
        const targets = uniqueSortedIds(items.filter((x) => x.tent === heavier && x.late).map((x) => x.patients[0]));
        const otherLate = items.filter((x) => x.tent === lighter && x.late).map((x) => x.patients[0]);
        return {
          targets,
          proof: `${heavier} Tent carries the heavier total load (${Math.max(northTotal, southTotal)} vs ${Math.min(northTotal, southTotal)}), so ${formatList(targets)} is its unassisted newest arrival.`,
          rival: buildRivalInfo(targets, otherLate, (id) => `${pName(id)} is in ${lighter} Tent, which has a lower total workload.`),
        };
      },
    };
  },

  // #44 Game-theoretic reasoning (Before · Composite)
  'game-theoretic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Bay Lineup', wingIndex: 0, label: '01:00 Critical',
        shown: [
          fact(`01:00 — ${pName(a)} is CRITICAL (severe leg bleed).`, a, { tag: 'case', crit: true, time: 1 }),
          fact(`01:00 — ${pName(b)} is minor (sprained finger).`, b, { tag: 'case', crit: false, time: 1 }),
        ],
        alt: [
          fact(`01:00 — ${pName(a)} is minor (bruised shin).`, a, { tag: 'case', crit: false, time: 1 }),
          fact(`01:00 — ${pName(b)} is CRITICAL (severe leg bleed).`, b, { tag: 'case', crit: true, time: 1 }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Bay Lineup', wingIndex: 0, label: '02:00 Critical',
        shown: [
          fact(`02:00 — ${pName(c)} is CRITICAL (collapsed lung).`, c, { tag: 'case', crit: true, time: 2 }),
          fact(`02:00 — ${pName(d)} is minor (mild scrape).`, d, { tag: 'case', crit: false, time: 2 }),
        ],
        alt: [
          fact(`02:00 — ${pName(c)} is minor (mild scrape).`, c, { tag: 'case', crit: false, time: 2 }),
          fact(`02:00 — ${pName(d)} is CRITICAL (collapsed lung).`, d, { tag: 'case', crit: true, time: 2 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Bay Lineup', wingIndex: 0, label: '03:00 Critical',
        shown: [
          fact(`03:00 — ${pName(e)} is CRITICAL (internal bleed).`, e, { tag: 'case', crit: true, time: 3 }),
          fact(`03:00 — ${pName(f)} is stable (waiting for stitches).`, f, { tag: 'case', crit: false, time: 3 }),
        ],
        alt: [
          fact(`03:00 — ${pName(e)} is stable (waiting for stitches).`, e, { tag: 'case', crit: false, time: 3 }),
          fact(`03:00 — ${pName(f)} is CRITICAL (internal bleed).`, f, { tag: 'case', crit: true, time: 3 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Partner Team', wingIndex: 1, label: 'Dr. Chen\'s Rule',
        shown: [
          fact(`Dr. Chen's surgical crew ALWAYS grabs the SINGLE EARLIEST critical patient first.`, [], { tag: 'note' }),
          fact(`If two doctors grab the same patient, the other critical bays die waiting.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Dr. Chen's surgical crew ALWAYS grabs the SINGLE EARLIEST critical patient first.`, [], { tag: 'note' }),
          fact(`If two doctors grab the same patient, the other critical bays die waiting.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Partner Team', wingIndex: 1, label: 'No Radio Contact',
        shown: [
          fact(`Radios are down, so predict Dr. Chen's exact move and cover the remaining critical patients.`, [], { tag: 'note' }),
          fact(`Skip minor/stable cases.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Radios are down, so predict Dr. Chen's exact move and cover the remaining critical patients.`, [], { tag: 'note' }),
          fact(`Skip minor/stable cases.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Partner Team', wingIndex: 1, label: 'Team Split',
        shown: [
          fact(`Leave the earliest critical arrival to Dr. Chen.`, [], { tag: 'note' }),
          fact(`Take every OTHER critical patient yourself.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Leave the earliest critical arrival to Dr. Chen.`, [], { tag: 'note' }),
          fact(`Take every OTHER critical patient yourself.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Coordinating Without Radios',
      dispatch: 'Dr. Chen always grabs the earliest critical arrival — do not double-book the same bay.',
      order: 'Leave the earliest critical patient to Dr. Chen and treat every OTHER critical patient.',
      hint: 'Find all CRITICAL patients, remove the earliest one (01:00), and pick the remaining critical ones.',
      cards,
      evaluate(activeCards) {
        const crits = collectFactsByTag(activeCards, 'case')
          .filter((x) => x.crit)
          .sort((x, y) => x.time - y.time);
        if (crits.length < 2) return null;
        const chenTakes = crits[0].patients[0];
        const targets = uniqueSortedIds(crits.slice(1).map((x) => x.patients[0]));
        return {
          targets,
          proof: `Dr. Chen will take earliest critical arrival ${pName(chenTakes)}, leaving ${formatList(targets)} uncovered for you.`,
          rival: buildRivalInfo(targets, [chenTakes], (id) => `${pName(id)} is the earliest critical arrival, so Dr. Chen already has them covered.`),
        };
      },
    };
  },

  // #45 Adversarial reasoning (After · Composite)
  'adversarial-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Airway Cart', wingIndex: 0, label: 'Power-Dependent Cases',
        shown: [
          fact(`${pName(a)}: Needs electric breathing machine (Danger 9) — fails if generator dies.`, a, { tag: 'plan', needsPower: true, danger: 9 }),
          fact(`${pName(b)}: Needs electric suction pump (Danger 8) — fails if generator dies.`, b, { tag: 'plan', needsPower: true, danger: 8 }),
        ],
        alt: [
          fact(`${pName(a)}: Can be saved by hand-bagging (Danger 9) — works even in a blackout.`, a, { tag: 'plan', needsPower: false, danger: 9 }),
          fact(`${pName(b)}: Needs electric suction pump (Danger 8) — fails if generator dies.`, b, { tag: 'plan', needsPower: true, danger: 8 }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Manual Gear', wingIndex: 1, label: 'Blackout-Proof Cases',
        shown: [
          fact(`${pName(c)}: Can be saved by manual chest needle (Danger 8) — works in total blackout.`, c, { tag: 'plan', needsPower: false, danger: 8 }),
          fact(`${pName(d)}: Can be saved by hand tourniquet (Danger 4) — works in total blackout.`, d, { tag: 'plan', needsPower: false, danger: 4 }),
        ],
        alt: [
          fact(`${pName(c)}: Needs electric pump (Danger 8) — fails if generator dies.`, c, { tag: 'plan', needsPower: true, danger: 8 }),
          fact(`${pName(d)}: Can be saved by hand tourniquet (Danger 8) — works in total blackout.`, d, { tag: 'plan', needsPower: false, danger: 8 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Manual Gear', wingIndex: 1, label: 'Backup Bay',
        shown: [
          fact(`${pName(e)}: Can be saved by manual pressure bandage (Danger 3) — works in blackout.`, e, { tag: 'plan', needsPower: false, danger: 3 }),
          fact(`${pName(f)}: Needs electric scan machine (Danger 6) — fails in blackout.`, f, { tag: 'plan', needsPower: true, danger: 6 }),
        ],
        alt: [
          fact(`${pName(e)}: Can be saved by manual chest needle (Danger 7) — works in blackout.`, e, { tag: 'plan', needsPower: false, danger: 7 }),
          fact(`${pName(f)}: Needs electric scan machine (Danger 6) — fails in blackout.`, f, { tag: 'plan', needsPower: true, danger: 6 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Storm Alert', wingIndex: 0, label: 'Worst-Case Plan',
        shown: [
          fact(`Lightning is hitting the roof: assume the hospital power fails the second you start.`, [], { tag: 'note' }),
          fact(`Ignore every power-dependent plan — it will go dark mid-procedure.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Lightning is hitting the roof: assume the hospital power fails the second you start.`, [], { tag: 'note' }),
          fact(`Ignore every power-dependent plan — it will go dark mid-procedure.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Storm Alert', wingIndex: 0, label: 'Manual Priority',
        shown: [
          fact(`Among blackout-proof manual saves, pick the SINGLE highest danger patient.`, [], { tag: 'note' }),
          fact(`Protect against the worst possible equipment failure.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Among blackout-proof manual saves, pick the SINGLE highest danger patient.`, [], { tag: 'note' }),
          fact(`Protect against the worst possible equipment failure.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Storm Alert', wingIndex: 1, label: 'Flashlight Ready',
        shown: [
          fact(`Manual tray is lit by headlamp and ready right now.`, [], { tag: 'note' }),
          fact(`Select the highest-danger patient whose rescue works in a blackout.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Manual tray is lit by headlamp and ready right now.`, [], { tag: 'note' }),
          fact(`Select the highest-danger patient whose rescue works in a blackout.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Planning for a Power Blackout',
      dispatch: 'Assume the worst happens: the generator trips right as you scrub in.',
      order: 'Assuming all electric machines fail, save the highest-danger patient who can be rescued manually in a blackout.',
      hint: 'Cross off every electric-dependent patient, then pick the highest Danger score among blackout-proof saves.',
      cards,
      evaluate(activeCards) {
        const all = collectFactsByTag(activeCards, 'plan');
        const safe = all.filter((x) => !x.needsPower);
        if (!safe.length) return null;
        const maxD = Math.max(...safe.map((x) => x.danger));
        const targets = uniqueSortedIds(safe.filter((x) => x.danger === maxD).map((x) => x.patients[0]));
        const electric = all.filter((x) => x.needsPower).map((x) => x.patients[0]);
        return {
          targets,
          proof: `In a blackout, electric gear dies; ${formatList(targets)} has the highest danger (${maxD}) among manual blackout-proof saves.`,
          rival: buildRivalInfo(targets, electric, (id) => `${pName(id)}'s procedure fails if the generator trips.`),
        };
      },
    };
  },

  // #46 Optimisation reasoning (Before · Composite)
  'optimisation-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Quick Bay', wingIndex: 0, label: 'Fast Saves',
        shown: [
          fact(`${pName(a)}: Takes 2 minutes to save (Critical).`, a, { tag: 'opt', mins: 2 }),
          fact(`${pName(b)}: Takes 2 minutes to save (Critical).`, b, { tag: 'opt', mins: 2 }),
        ],
        alt: [
          fact(`${pName(a)}: Takes 5 minutes to save (Critical).`, a, { tag: 'opt', mins: 5 }),
          fact(`${pName(b)}: Takes 2 minutes to save (Critical).`, b, { tag: 'opt', mins: 2 }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Quick Bay', wingIndex: 0, label: 'Medium Saves',
        shown: [
          fact(`${pName(c)}: Takes 2 minutes to save (Critical).`, c, { tag: 'opt', mins: 2 }),
          fact(`${pName(d)}: Takes 5 minutes to save (Critical).`, d, { tag: 'opt', mins: 5 }),
        ],
        alt: [
          fact(`${pName(c)}: Takes 5 minutes to save (Critical).`, c, { tag: 'opt', mins: 5 }),
          fact(`${pName(d)}: Takes 2 minutes to save (Critical).`, d, { tag: 'opt', mins: 2 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Long Surgery', wingIndex: 1, label: 'Long Surgeries',
        shown: [
          fact(`${pName(e)}: Takes 6 minutes to save (Critical).`, e, { tag: 'opt', mins: 6 }),
          fact(`${pName(f)}: Takes 6 minutes to save (Critical).`, f, { tag: 'opt', mins: 6 }),
        ],
        alt: [
          fact(`${pName(e)}: Takes 2 minutes to save (Critical).`, e, { tag: 'opt', mins: 2 }),
          fact(`${pName(f)}: Takes 6 minutes to save (Critical).`, f, { tag: 'opt', mins: 6 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Evacuation Clock', wingIndex: 1, label: '6-Minute Limit',
        shown: [
          fact(`You have EXACTLY 6 MINUTES left before the evacuation chopper leaves.`, [], { tag: 'note' }),
          fact(`Every patient here is equally critical — maximize the TOTAL NUMBER of lives saved.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`You have EXACTLY 6 MINUTES left before the evacuation chopper leaves.`, [], { tag: 'note' }),
          fact(`Every patient here is equally critical — maximize the TOTAL NUMBER of lives saved.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Evacuation Clock', wingIndex: 1, label: 'Time Math',
        shown: [
          fact(`One 6-minute surgery saves 1 life; three 2-minute fixes save 3 lives in the same 6 minutes!`, [], { tag: 'note' }),
          fact(`Pick the combination that fits inside 6 minutes and saves the MOST patients.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`One 6-minute surgery saves 1 life; three 2-minute fixes save 3 lives in the same 6 minutes!`, [], { tag: 'note' }),
          fact(`Pick the combination that fits inside 6 minutes and saves the MOST patients.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Evacuation Clock', wingIndex: 0, label: 'Chopper Countdown',
        shown: [
          fact(`Total minutes of your chosen patients must be 6 minutes or less.`, [], { tag: 'note' }),
          fact(`Select the maximum-lives group right now.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Total minutes of your chosen patients must be 6 minutes or less.`, [], { tag: 'note' }),
          fact(`Select the maximum-lives group right now.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Saving Maximum Lives in 6 Minutes',
      dispatch: 'Six critical patients, only 6 minutes on the clock — pick the best time budget.',
      order: 'You have 6 minutes total. Select the group of patients that saves the MOST lives within 6 minutes.',
      hint: 'Pick the 2-minute patients so their combined time stays within 6 minutes.',
      cards,
      evaluate(activeCards) {
        const items = collectFactsByTag(activeCards, 'opt').sort((x, y) => x.mins - y.mins);
        let budget = 6;
        const chosen = [];
        for (const item of items) {
          if (item.mins <= budget && chosen.length < 3) {
            chosen.push(item.patients[0]);
            budget -= item.mins;
          }
        }
        const targets = uniqueSortedIds(chosen);
        const skipped = items.filter((x) => !targets.includes(x.patients[0])).map((x) => x.patients[0]);
        return {
          targets,
          proof: `Picking ${formatList(targets)} saves ${targets.length} lives inside the 6-minute limit instead of burning the whole clock on one 5–6 min case.`,
          rival: buildRivalInfo(targets, skipped, (id) => `${pName(id)} takes 5–6 minutes alone, costing other patients their chance.`),
        };
      },
    };
  },

  // #47 Instrumental reasoning (Inside · Atomic)
  'instrumental-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Gear Tray', wingIndex: 0, label: 'Tool In Your Hand',
        shown: [
          fact(`Right now you are holding ONLY two tight limb tourniquets (for heavy arm/leg bleeding).`, [], { tag: 'tool', kind: 'tourniquet' }),
          fact(`Tourniquets CANNOT be wrapped around a chest, belly, or head.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Right now you are holding ONLY two adrenaline allergy pens (for allergic throat swelling).`, [], { tag: 'tool', kind: 'epi' }),
          fact(`Adrenaline pens treat severe allergic shock, not open cuts or fractures.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Bay Row A', wingIndex: 1, label: 'Bays A & B',
        shown: [
          fact(`${pName(a)}: Heavy arterial leg bleeding.`, a, { tag: 'injury', kind: 'tourniquet' }),
          fact(`${pName(b)}: Severe peanut allergy — throat closing fast.`, b, { tag: 'injury', kind: 'epi' }),
        ],
        alt: [
          fact(`${pName(a)}: Deep belly stab wound (torso).`, a, { tag: 'injury', kind: 'other' }),
          fact(`${pName(b)}: Heavy arterial leg bleeding.`, b, { tag: 'injury', kind: 'tourniquet' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Bay Row A', wingIndex: 1, label: 'Bays C & D',
        shown: [
          fact(`${pName(c)}: Heavy arterial arm bleeding.`, c, { tag: 'injury', kind: 'tourniquet' }),
          fact(`${pName(d)}: Deep chest puncture wound.`, d, { tag: 'injury', kind: 'other' }),
        ],
        alt: [
          fact(`${pName(c)}: Severe bee-sting allergy — throat closing fast.`, c, { tag: 'injury', kind: 'epi' }),
          fact(`${pName(d)}: Deep chest puncture wound.`, d, { tag: 'injury', kind: 'other' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Bay Row B', wingIndex: 1, label: 'Bays E & F',
        shown: [
          fact(`${pName(e)}: Severe forehead bruise.`, e, { tag: 'injury', kind: 'other' }),
          fact(`${pName(f)}: Mild bee-sting allergy — throat closing fast.`, f, { tag: 'injury', kind: 'epi' }),
        ],
        alt: [
          fact(`${pName(e)}: Severe forehead bruise.`, e, { tag: 'injury', kind: 'other' }),
          fact(`${pName(f)}: Heavy arterial arm bleeding.`, f, { tag: 'injury', kind: 'tourniquet' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Gear Tray', wingIndex: 0, label: 'Match Tool to Problem',
        shown: [
          fact(`Use the exact tool in your hands on the patients it can actually save.`, [], { tag: 'note' }),
          fact(`Leave non-matching injuries for the other cart.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Use the exact tool in your hands on the patients it can actually save.`, [], { tag: 'note' }),
          fact(`Leave non-matching injuries for the other cart.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Gear Tray', wingIndex: 0, label: 'Immediate Action',
        shown: [
          fact(`Check the Tool In Your Hand card first!`, [], { tag: 'note' }),
          fact(`Select every patient whose emergency matches that exact tool.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Check the Tool In Your Hand card first!`, [], { tag: 'note' }),
          fact(`Select every patient whose emergency matches that exact tool.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Right Tool for the Right Emergency',
      dispatch: 'You only have one specific rescue kit in your hands — match the tool to the exact patients it can fix.',
      order: 'Check which tool is in your hand, then treat ONLY the patients whose emergency matches that tool.',
      hint: 'Read "Tool In Your Hand" first, then select every patient with that exact matching emergency.',
      cards,
      evaluate(activeCards) {
        const toolFact = collectFactsByTag(activeCards, 'tool')[0];
        if (!toolFact) return null;
        const injuries = collectFactsByTag(activeCards, 'injury');
        const targets = uniqueSortedIds(injuries.filter((x) => x.kind === toolFact.kind).map((x) => x.patients[0]));
        const others = injuries.filter((x) => x.kind !== toolFact.kind).map((x) => x.patients[0]);
        const toolLabel = toolFact.kind === 'tourniquet' ? 'limb tourniquets (arm/leg bleeding)' : 'adrenaline allergy pens (throat swelling)';
        return {
          targets,
          proof: `You are holding ${toolLabel}, which directly saves ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, others, (id) => `${pName(id)}'s injury cannot be fixed by the tool you are holding.`),
        };
      },
    };
  },

  // #48 Second-order reasoning (Inside · Composite)
  'second-order-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Supply Chain', wingIndex: 0, label: 'First Domino',
        shown: [
          fact(`Heavy bleed in ${pName(a)} uses up all O-negative blood bags in Bay A.`, [a], { tag: 'step1' }),
          fact(`That leaves ${pName(b)} waiting on emergency blood delivery.`, [a, b], { tag: 'hop1', from: a, to: b }),
        ],
        alt: [
          fact(`Heavy bleed in ${pName(a)} uses up all O-negative blood bags in Bay A.`, [a], { tag: 'step1' }),
          fact(`That leaves ${pName(e)} waiting on emergency blood delivery.`, [a, e], { tag: 'hop1', from: a, to: e }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Supply Chain', wingIndex: 0, label: 'Second Domino',
        shown: [
          fact(`Because ${pName(b)} is stuck in Operating Room 1, ${pName(c)}'s surgery gets pushed back dangerously.`, [b, c], { tag: 'hop2', from: b, to: c }),
          fact(`Because ${pName(e)} is stuck in Operating Room 2, ${pName(f)}'s surgery gets pushed back dangerously.`, [e, f], { tag: 'hop2', from: e, to: f }),
        ],
        alt: [
          fact(`Because ${pName(b)} is stuck in Operating Room 1, ${pName(d)}'s surgery gets pushed back dangerously.`, [b, d], { tag: 'hop2', from: b, to: d }),
          fact(`Because ${pName(e)} is stuck in Operating Room 2, ${pName(f)}'s surgery gets pushed back dangerously.`, [e, f], { tag: 'hop2', from: e, to: f }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Supply Chain', wingIndex: 0, label: 'Unrelated Bay',
        shown: [
          fact(`${pName(d)} is already stabilized in Recovery with no delays.`, d, { tag: 'other' }),
          fact(`Nurse team is already helping ${pName(a)} and ${pName(b)} directly.`, [a, b], { tag: 'other' }),
        ],
        alt: [
          fact(`${pName(c)} is already stabilized in Recovery with no delays.`, c, { tag: 'other' }),
          fact(`Nurse team is already helping ${pName(a)} and ${pName(e)} directly.`, [a, e], { tag: 'other' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Floor Control', wingIndex: 1, label: 'Look Two Steps Ahead',
        shown: [
          fact(`Step 1: Who did ${pName(a)}'s blood drain delay first?`, a, { tag: 'note' }),
          fact(`Step 2: Whose surgery gets delayed NEXT by that person?`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Step 1: Who did ${pName(a)}'s blood drain delay first?`, a, { tag: 'note' }),
          fact(`Step 2: Whose surgery gets delayed NEXT by that person?`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Floor Control', wingIndex: 1, label: 'Backup OR Ready',
        shown: [
          fact(`Open Backup Operating Room 3 for the SECOND-step ripple victim.`, [], { tag: 'note' }),
          fact(`Do not pick ${pName(a)} or the first-step patient — pick the downstream patient hit second!`, a, { tag: 'note' }),
        ],
        alt: [
          fact(`Open Backup Operating Room 3 for the SECOND-step ripple victim.`, [], { tag: 'note' }),
          fact(`Do not pick ${pName(a)} or the first-step patient — pick the downstream patient hit second!`, a, { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Floor Control', wingIndex: 1, label: 'Ripple Warning',
        shown: [
          fact(`Follow the dominoes: Starting Bleed → 1st Delayed → 2nd Delayed.`, [], { tag: 'note' }),
          fact(`Rescue the 2nd Delayed patient before their wait turns fatal.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Follow the dominoes: Starting Bleed → 1st Delayed → 2nd Delayed.`, [], { tag: 'note' }),
          fact(`Rescue the 2nd Delayed patient before their wait turns fatal.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Operating Room Domino Effect',
      dispatch: 'One patient draining the blood bank stalls a second patient, which secretly delays a third.',
      order: `Trace the ripple from ${pName(a)} TWO steps forward and move the second-step delayed patient into Backup OR 3.`,
      hint: `Find who ${pName(a)} delays first, then find whose surgery gets pushed back by that person.`,
      cards,
      evaluate(activeCards) {
        const h1 = collectFactsByTag(activeCards, 'hop1')[0];
        if (!h1) return null;
        const mid = h1.to;
        const h2 = collectFactsByTag(activeCards, 'hop2').filter((x) => x.from === mid);
        const targets = uniqueSortedIds(h2.map((x) => x.to));
        return {
          targets,
          proof: `${pName(a)} delays ${pName(mid)} (1st step), which pushes back ${formatList(targets)} (2nd step).`,
          rival: buildRivalInfo(targets, [mid, a], (id) => `${pName(id)} is earlier in the chain — Backup OR 3 is for the 2nd-step ripple victim.`),
        };
      },
    };
  },

  // #49 Risk-based reasoning (Before · Composite)
  'risk-based-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Risk Board', wingIndex: 0, label: 'High Harm, Rare vs Likely',
        shown: [
          fact(`${pName(a)}: 50% chance of fatal bleed (Harm 10) → Expected Risk = 5.0.`, a, { tag: 'risk', val: 5.0 }),
          fact(`${pName(b)}: 10% chance of fatal bleed (Harm 10) → Expected Risk = 1.0.`, b, { tag: 'risk', val: 1.0 }),
        ],
        alt: [
          fact(`${pName(a)}: 10% chance of fatal bleed (Harm 10) → Expected Risk = 1.0.`, a, { tag: 'risk', val: 1.0 }),
          fact(`${pName(b)}: 60% chance of fatal bleed (Harm 10) → Expected Risk = 6.0.`, b, { tag: 'risk', val: 6.0 }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Risk Board', wingIndex: 0, label: 'Common Mild vs Serious',
        shown: [
          fact(`${pName(c)}: 90% chance of mild bruise (Harm 2) → Expected Risk = 1.8.`, c, { tag: 'risk', val: 1.8 }),
          fact(`${pName(d)}: 50% chance of lung collapse (Harm 8) → Expected Risk = 4.0.`, d, { tag: 'risk', val: 4.0 }),
        ],
        alt: [
          fact(`${pName(c)}: 70% chance of lung collapse (Harm 8) → Expected Risk = 5.6.`, c, { tag: 'risk', val: 5.6 }),
          fact(`${pName(d)}: 20% chance of mild bruise (Harm 2) → Expected Risk = 0.4.`, d, { tag: 'risk', val: 0.4 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Risk Board', wingIndex: 0, label: 'Low-Risk Bays',
        shown: [
          fact(`${pName(e)}: 80% chance of sore ankle (Harm 1) → Expected Risk = 0.8.`, e, { tag: 'risk', val: 0.8 }),
          fact(`${pName(f)}: 15% chance of mild fever (Harm 4) → Expected Risk = 0.6.`, f, { tag: 'risk', val: 0.6 }),
        ],
        alt: [
          fact(`${pName(e)}: 80% chance of sore ankle (Harm 1) → Expected Risk = 0.8.`, e, { tag: 'risk', val: 0.8 }),
          fact(`${pName(f)}: 15% chance of mild fever (Harm 4) → Expected Risk = 0.6.`, f, { tag: 'risk', val: 0.6 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Triage Formula', wingIndex: 1, label: 'True Risk Rule',
        shown: [
          fact(`True Risk = Chance (%) × Harm Severity.`, [], { tag: 'note' }),
          fact(`Treat ONLY patients whose Expected Risk is 3.5 or HIGHER.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`True Risk = Chance (%) × Harm Severity.`, [], { tag: 'note' }),
          fact(`Treat ONLY patients whose Expected Risk is 3.5 or HIGHER.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Triage Formula', wingIndex: 1, label: 'Avoid Two Traps',
        shown: [
          fact(`Don't panic over a 90% bruise (low harm) or a 10% rare scare (low chance).`, [], { tag: 'note' }),
          fact(`Combine BOTH chance and harm.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Don't panic over a 90% bruise (low harm) or a 10% rare scare (low chance).`, [], { tag: 'note' }),
          fact(`Combine BOTH chance and harm.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Triage Formula', wingIndex: 1, label: 'ICU Cutoff',
        shown: [
          fact(`ICU monitors open for every patient with Expected Risk ≥ 3.5.`, [], { tag: 'note' }),
          fact(`Select everyone at or above 3.5.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`ICU monitors open for every patient with Expected Risk ≥ 3.5.`, [], { tag: 'note' }),
          fact(`Select everyone at or above 3.5.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Weighing Chance × Harm',
      dispatch: 'A likely bruise is minor; a very rare scare is unlikely — weigh Chance times Harm together.',
      order: 'Admit ONLY patients whose Expected Risk (Chance × Harm) is 3.5 or higher.',
      hint: 'Check each patient\'s Expected Risk number and pick everyone at 3.5 or above.',
      cards,
      evaluate(activeCards) {
        const list = collectFactsByTag(activeCards, 'risk');
        const targets = uniqueSortedIds(list.filter((x) => x.val >= 3.5).map((x) => x.patients[0]));
        const low = list.filter((x) => x.val < 3.5).map((x) => x.patients[0]);
        return {
          targets,
          proof: `${formatList(targets)} have an Expected Risk of 3.5 or higher when combining likelihood with harm.`,
          rival: buildRivalInfo(targets, low, (id) => `${pName(id)}'s combined Chance × Harm score stays well below 3.5.`),
        };
      },
    };
  },

  // #50 Decision-theoretic reasoning (Before · Composite)
  'decision-theoretic': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Surgery Review', wingIndex: 0, label: 'Cases 1 & 2',
        shown: [
          fact(`${pName(a)}: Surgery Gain +80% survival · Surgery Risk −20% (Net +60%).`, a, { tag: 'dec', net: 60 }),
          fact(`${pName(b)}: Surgery Gain +20% survival · Surgery Risk −45% (Net −25% — harmful!).`, b, { tag: 'dec', net: -25 }),
        ],
        alt: [
          fact(`${pName(a)}: Surgery Gain +15% survival · Surgery Risk −40% (Net −25% — harmful!).`, a, { tag: 'dec', net: -25 }),
          fact(`${pName(b)}: Surgery Gain +75% survival · Surgery Risk −15% (Net +60%).`, b, { tag: 'dec', net: 60 }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Surgery Review', wingIndex: 0, label: 'Cases 3 & 4',
        shown: [
          fact(`${pName(c)}: Surgery Gain +65% survival · Surgery Risk −15% (Net +50%).`, c, { tag: 'dec', net: 50 }),
          fact(`${pName(d)}: Surgery Gain +30% survival · Surgery Risk −30% (Net 0% — no benefit).`, d, { tag: 'dec', net: 0 }),
        ],
        alt: [
          fact(`${pName(c)}: Surgery Gain +25% survival · Surgery Risk −35% (Net −10% — harmful!).`, c, { tag: 'dec', net: -10 }),
          fact(`${pName(d)}: Surgery Gain +70% survival · Surgery Risk −20% (Net +50%).`, d, { tag: 'dec', net: 50 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Surgery Review', wingIndex: 0, label: 'Cases 5 & 6',
        shown: [
          fact(`${pName(e)}: Surgery Gain +10% survival · Surgery Risk −25% (Net −15% — harmful!).`, e, { tag: 'dec', net: -15 }),
          fact(`${pName(f)}: Surgery Gain +20% survival · Surgery Risk −25% (Net −5% — harmful!).`, f, { tag: 'dec', net: -5 }),
        ],
        alt: [
          fact(`${pName(e)}: Surgery Gain +60% survival · Surgery Risk −10% (Net +50%).`, e, { tag: 'dec', net: 50 }),
          fact(`${pName(f)}: Surgery Gain +20% survival · Surgery Risk −25% (Net −5% — harmful!).`, f, { tag: 'dec', net: -5 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Surgical Ethics', wingIndex: 1, label: 'Net Benefit Rule',
        shown: [
          fact(`Operate ONLY when Survival Gain clearly beats Surgery Risk (Net Benefit > 0%).`, [], { tag: 'note' }),
          fact(`Never operate when the surgery itself hurts more than it helps!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Operate ONLY when Survival Gain clearly beats Surgery Risk (Net Benefit > 0%).`, [], { tag: 'note' }),
          fact(`Never operate when the surgery itself hurts more than it helps!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Surgical Ethics', wingIndex: 1, label: 'Do No Harm',
        shown: [
          fact(`Zero-benefit (0%) and negative-benefit cases do better with rest and medicine.`, [], { tag: 'note' }),
          fact(`Approve the OR ONLY for positive net benefit.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Zero-benefit (0%) and negative-benefit cases do better with rest and medicine.`, [], { tag: 'note' }),
          fact(`Approve the OR ONLY for positive net benefit.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Surgical Ethics', wingIndex: 1, label: 'OR Schedule',
        shown: [
          fact(`Compare Gain vs. Risk for every candidate.`, [], { tag: 'note' }),
          fact(`Select every patient with a POSITIVE net surgical gain.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Compare Gain vs. Risk for every candidate.`, [], { tag: 'note' }),
          fact(`Select every patient with a POSITIVE net surgical gain.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'When Surgery Helps vs. Hurts',
      dispatch: 'Every operation carries its own risk — only operate when expected survival gain beats surgical risk.',
      order: 'Approve emergency surgery ONLY for patients with a positive net benefit (Survival Gain > Surgery Risk).',
      hint: 'Pick every patient whose Net Benefit is above 0%.',
      cards,
      evaluate(activeCards) {
        const list = collectFactsByTag(activeCards, 'dec');
        const targets = uniqueSortedIds(list.filter((x) => x.net > 0).map((x) => x.patients[0]));
        const noOp = list.filter((x) => x.net <= 0).map((x) => x.patients[0]);
        return {
          targets,
          proof: `For ${formatList(targets)}, expected survival gain strongly outweighs surgery risk (positive net benefit).`,
          rival: buildRivalInfo(targets, noOp, (id) => `Operating on ${pName(id)} has zero or negative net benefit.`),
        };
      },
    };
  },

  // #51 Algorithmic reasoning (Inside · Atomic)
  'algorithmic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'CPR Protocol', wingIndex: 0, label: '3-Step Rescue Checklist',
        shown: [
          fact(`Step 1: Is the patient UNCONSCIOUS? (If awake → do NOT do chest compressions).`, [], { tag: 'note' }),
          fact(`Step 2 & 3: NOT BREATHING + NO PULSE → START CPR IMMEDIATELY!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Step 1: Is the patient UNCONSCIOUS? (If awake → do NOT do chest compressions).`, [], { tag: 'note' }),
          fact(`Step 2 & 3: NOT BREATHING + NO PULSE → START CPR IMMEDIATELY!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Bedside Check', wingIndex: 1, label: 'Bays 1 & 2',
        shown: [
          fact(`${pName(a)}: Unconscious · NOT breathing · NO pulse.`, a, { tag: 'cpr', unc: true, breath: false, pulse: false }),
          fact(`${pName(b)}: Unconscious · NOT breathing · HAS steady pulse.`, b, { tag: 'cpr', unc: true, breath: false, pulse: true }),
        ],
        alt: [
          fact(`${pName(a)}: Unconscious · NOT breathing · HAS steady pulse.`, a, { tag: 'cpr', unc: true, breath: false, pulse: true }),
          fact(`${pName(b)}: Unconscious · NOT breathing · NO pulse.`, b, { tag: 'cpr', unc: true, breath: false, pulse: false }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Bedside Check', wingIndex: 1, label: 'Bays 3 & 4',
        shown: [
          fact(`${pName(c)}: Unconscious · NOT breathing · NO pulse.`, c, { tag: 'cpr', unc: true, breath: false, pulse: false }),
          fact(`${pName(d)}: Awake & talking · fast breathing · strong pulse.`, d, { tag: 'cpr', unc: false, breath: true, pulse: true }),
        ],
        alt: [
          fact(`${pName(c)}: Unconscious · breathing slowly · HAS steady pulse.`, c, { tag: 'cpr', unc: true, breath: true, pulse: true }),
          fact(`${pName(d)}: Unconscious · NOT breathing · NO pulse.`, d, { tag: 'cpr', unc: true, breath: false, pulse: false }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Bedside Check', wingIndex: 1, label: 'Bays 5 & 6',
        shown: [
          fact(`${pName(e)}: Unconscious · breathing normally · HAS steady pulse.`, e, { tag: 'cpr', unc: true, breath: true, pulse: true }),
          fact(`${pName(f)}: Awake & panicking · shallow breathing · strong pulse.`, f, { tag: 'cpr', unc: false, breath: true, pulse: true }),
        ],
        alt: [
          fact(`${pName(e)}: Unconscious · NOT breathing · NO pulse.`, e, { tag: 'cpr', unc: true, breath: false, pulse: false }),
          fact(`${pName(f)}: Awake & panicking · shallow breathing · strong pulse.`, f, { tag: 'cpr', unc: false, breath: true, pulse: true }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'CPR Protocol', wingIndex: 0, label: 'Safety Check',
        shown: [
          fact(`Never press on a beating heart — if a patient HAS a pulse, give rescue breaths, not CPR.`, [], { tag: 'note' }),
          fact(`Follow all 3 steps strictly in order.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Never press on a beating heart — if a patient HAS a pulse, give rescue breaths, not CPR.`, [], { tag: 'note' }),
          fact(`Follow all 3 steps strictly in order.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'CPR Protocol', wingIndex: 0, label: 'Code Blue Call',
        shown: [
          fact(`Start chest compressions ONLY on patients who hit all 3: Unconscious + Not Breathing + No Pulse.`, [], { tag: 'note' }),
          fact(`Run the checklist now.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Start chest compressions ONLY on patients who hit all 3: Unconscious + Not Breathing + No Pulse.`, [], { tag: 'note' }),
          fact(`Run the checklist now.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: '3-Step Cardiac Arrest Checklist',
      dispatch: 'Under extreme stress, follow the exact 3-step CPR checklist without skipping a step.',
      order: 'Start CPR chest compressions ONLY on patients who are Unconscious, NOT Breathing, AND have NO Pulse.',
      hint: 'Check all 3 boxes: Unconscious + NOT breathing + NO pulse.',
      cards,
      evaluate(activeCards) {
        const list = collectFactsByTag(activeCards, 'cpr');
        const targets = uniqueSortedIds(list.filter((x) => x.unc && !x.breath && !x.pulse).map((x) => x.patients[0]));
        const others = list.filter((x) => !(x.unc && !x.breath && !x.pulse)).map((x) => x.patients[0]);
        return {
          targets,
          proof: `${formatList(targets)} meet all 3 CPR checklist steps (Unconscious, Not Breathing, No Pulse).`,
          rival: buildRivalInfo(targets, others, (id) => `${pName(id)} still has a pulse or is breathing/awake, so CPR compressions do not apply.`),
        };
      },
    };
  },

  // #52 Reverse reasoning (After · Atomic)
  'reverse-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '06:00', wing: 'Audit Desk', wingIndex: 1, label: '06:00 Final Error',
        shown: [
          fact(`At 06:00, a wrong high-dose blood thinner was found hanging at ${pName(a)}'s bed.`, a, { tag: 'end' }),
          fact(`Work BACKWARD from ${pName(a)} to trace which bay's wristband got mixed up first!`, a, { tag: 'note' }),
        ],
        alt: [
          fact(`At 06:00, a wrong high-dose blood thinner was found hanging at ${pName(e)}'s bed.`, e, { tag: 'end' }),
          fact(`Work BACKWARD from ${pName(e)} to trace which bay's wristband got mixed up first!`, e, { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '04:00', wing: 'Chart Log', wingIndex: 0, label: '04:00 Handoff',
        shown: [
          fact(`The bag at ${pName(a)}'s bed was copied straight from ${pName(b)}'s transfer tray.`, [a, b], { tag: 'prev', to: a, from: b }),
          fact(`The bag at ${pName(e)}'s bed was copied straight from ${pName(f)}'s transfer tray.`, [e, f], { tag: 'prev', to: e, from: f }),
        ],
        alt: [
          fact(`The bag at ${pName(a)}'s bed was copied straight from ${pName(c)}'s transfer tray.`, [a, c], { tag: 'prev', to: a, from: c }),
          fact(`The bag at ${pName(e)}'s bed was copied straight from ${pName(f)}'s transfer tray.`, [e, f], { tag: 'prev', to: e, from: f }),
        ],
      }),
      makeCard({
        index: 2, time: '02:00', wing: 'Chart Log', wingIndex: 0, label: '02:00 Pharmacy Label',
        shown: [
          fact(`${pName(b)}'s transfer tray originally came from ${pName(c)}'s pharmacy basket (origin mix-up).`, [b, c], { tag: 'origin', to: b, from: c }),
          fact(`${pName(f)}'s transfer tray originally came from ${pName(d)}'s pharmacy basket (origin mix-up).`, [f, d], { tag: 'origin', to: f, from: d }),
        ],
        alt: [
          fact(`${pName(b)}'s transfer tray originally came from ${pName(d)}'s pharmacy basket (origin mix-up).`, [b, d], { tag: 'origin', to: b, from: d }),
          fact(`${pName(c)}'s transfer tray originally came from ${pName(d)}'s pharmacy basket (origin mix-up).`, [c, d], { tag: 'origin', to: c, from: d }),
          fact(`${pName(f)}'s transfer tray originally came from ${pName(b)}'s pharmacy basket (origin mix-up).`, [f, b], { tag: 'origin', to: f, from: b }),
        ],
      }),
      makeCard({
        index: 3, time: '01:00', wing: 'Audit Desk', wingIndex: 1, label: 'Why Trace Backward',
        shown: [
          fact(`The original patient whose pharmacy basket was mislabeled is STILL missing their real medicine!`, [], { tag: 'note' }),
          fact(`Step backward: 06:00 Bed ← 04:00 Tray ← 02:00 Origin Basket.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`The original patient whose pharmacy basket was mislabeled is STILL missing their real medicine!`, [], { tag: 'note' }),
          fact(`Step backward: 06:00 Bed ← 04:00 Tray ← 02:00 Origin Basket.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '03:00', wing: 'Audit Desk', wingIndex: 1, label: 'Clean Check',
        shown: [
          fact(`Do not stop at the 04:00 middle tray — go all the way back to the 02:00 origin basket.`, [], { tag: 'note' }),
          fact(`Alert that original patient's nurse immediately.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Do not stop at the 04:00 middle tray — go all the way back to the 02:00 origin basket.`, [], { tag: 'note' }),
          fact(`Alert that original patient's nurse immediately.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '05:00', wing: 'Audit Desk', wingIndex: 1, label: 'Medication Recall',
        shown: [
          fact(`Find the 06:00 error patient, trace one step back at 04:00, then one more step back at 02:00.`, [], { tag: 'note' }),
          fact(`Select the original 02:00 patient.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Find the 06:00 error patient, trace one step back at 04:00, then one more step back at 02:00.`, [], { tag: 'note' }),
          fact(`Select the original 02:00 patient.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Medication Mix-Up Traceback',
      dispatch: 'A wrong IV bag turned up at 06:00 — trace backward to find whose original medicine basket went missing.',
      order: 'Start from the 06:00 wrong IV bag and trace BACKWARD two steps (06:00 ← 04:00 ← 02:00) to the origin patient.',
      hint: 'Find who got the wrong bag at 06:00, trace who it came from at 04:00, then trace who that came from at 02:00.',
      cards,
      evaluate(activeCards) {
        const endFact = collectFactsByTag(activeCards, 'end')[0];
        if (!endFact) return null;
        const endId = endFact.patients[0];
        const prev = collectFactsByTag(activeCards, 'prev').find((x) => x.to === endId);
        if (!prev) return null;
        const midId = prev.from;
        const orig = collectFactsByTag(activeCards, 'origin').find((x) => x.to === midId);
        if (!orig) return null;
        const targets = uniqueSortedIds([orig.from]);
        return {
          targets,
          proof: `Tracing backward: ${pName(endId)} (06:00) ← ${pName(midId)} (04:00) ← ${pName(orig.from)} (02:00 origin basket).`,
          rival: buildRivalInfo(targets, [midId, endId], (id) => `${pName(id)} is only partway back — the mix-up originated with ${pName(orig.from)}.`),
        };
      },
    };
  },

  // =========================================================================
  // FAMILY 6: CREATIVE & SYNTHETIC REASONING (#53–#61)
  // =========================================================================

  // #53 Divergent reasoning (Before · Atomic)
  'divergent-reasoning': (rng) => {
    const [x, a, b, c, d, e] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Ambulance Log', wingIndex: 0, label: 'Ambulance Ride',
        shown: [
          fact(`${pName(x)} arrived with contagious meningitis — rode in Ambulance 4 with ${pName(a)}.`, [x, a], { tag: 'contact', p: a }),
          fact(`${pName(d)} arrived alone in Ambulance 9 (no contact with ${pName(x)}).`, [d, x], { tag: 'safe', p: d }),
        ],
        alt: [
          fact(`${pName(x)} arrived with contagious meningitis — rode alone in Ambulance 4.`, [x], { tag: 'note' }),
          fact(`${pName(d)} arrived in Ambulance 4 right beside ${pName(x)}.`, [d, x], { tag: 'contact', p: d }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Waiting Room', wingIndex: 1, label: 'Waiting Bench',
        shown: [
          fact(`${pName(b)} sat next to ${pName(x)} for 20 minutes in the Waiting Room.`, [b, x], { tag: 'contact', p: b }),
          fact(`${pName(e)} waited outside in their car (never near ${pName(x)}).`, [e, x], { tag: 'safe', p: e }),
        ],
        alt: [
          fact(`${pName(b)} waited across the street (never near ${pName(x)}).`, [b, x], { tag: 'safe', p: b }),
          fact(`${pName(e)} sat next to ${pName(x)} for 20 minutes in the Waiting Room.`, [e, x], { tag: 'contact', p: e }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'X-Ray Hall', wingIndex: 0, label: 'Scan Hallway',
        shown: [
          fact(`${pName(c)} shared the X-Ray elevator with ${pName(x)}.`, [c, x], { tag: 'contact', p: c }),
          fact(`All three areas (Ambulance, Waiting Room, X-Ray) must be checked!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(c)} used the South stairs (never shared air with ${pName(x)}).`, [c, x], { tag: 'safe', p: c }),
          fact(`Check EVERY room — don't stop after finding just one contact!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Infection Desk', wingIndex: 1, label: 'Cast a Wide Net',
        shown: [
          fact(`${pName(x)} is already in isolation; do NOT select ${pName(x)} again.`, x, { tag: 'note' }),
          fact(`Preventive antibiotics must go to EVERY person who was exposed to ${pName(x)} in ANY room.`, x, { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(x)} is already in isolation; do NOT select ${pName(x)} again.`, x, { tag: 'note' }),
          fact(`Preventive antibiotics must go to EVERY person who was exposed to ${pName(x)} in ANY room.`, x, { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Infection Desk', wingIndex: 1, label: 'Check Every Channel',
        shown: [
          fact(`Tunnel vision misses people in other wings — scan Ambulance, Waiting Room, AND X-Ray.`, [], { tag: 'note' }),
          fact(`Every direct contact needs one preventive dose.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Tunnel vision misses people in other wings — scan Ambulance, Waiting Room, AND X-Ray.`, [], { tag: 'note' }),
          fact(`Every direct contact needs one preventive dose.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Infection Desk', wingIndex: 0, label: 'Antibiotic Tray',
        shown: [
          fact(`Give preventive antibiotics to ALL direct contacts of ${pName(x)} across all rooms.`, x, { tag: 'note' }),
          fact(`Skip unexposed patients and skip ${pName(x)} (already isolated).`, x, { tag: 'note' }),
        ],
        alt: [
          fact(`Give preventive antibiotics to ALL direct contacts of ${pName(x)} across all rooms.`, x, { tag: 'note' }),
          fact(`Skip unexposed patients and skip ${pName(x)} (already isolated).`, x, { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Full-Hospital Exposure Sweep',
      dispatch: `${pName(x)} tested positive for contagious meningitis — fan out across every department to find all contacts.`,
      order: `Give preventive antibiotics to EVERY patient exposed to ${pName(x)} in any room (do not pick ${pName(x)}).`,
      hint: `Scan Ambulance, Waiting Room, and X-Ray cards to collect every patient who was near ${pName(x)}.`,
      cards,
      evaluate(activeCards) {
        const contacts = collectFactsByTag(activeCards, 'contact').map((f) => f.p);
        const safe = collectFactsByTag(activeCards, 'safe').map((f) => f.p);
        const targets = uniqueSortedIds(contacts);
        return {
          targets,
          proof: `Scanning every wing shows ${formatList(targets)} each had direct close contact with ${pName(x)}.`,
          rival: buildRivalInfo(targets, [...safe, x], (id) =>
            id === x ? `${pName(x)} is already in isolation — this sweep is for their exposed contacts.` : `${pName(id)} was never near ${pName(x)}.`
          ),
        };
      },
    };
  },

  // #54 Convergent reasoning (Inside · Atomic)
  'convergent-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Filter 1 · Location', wingIndex: 0, label: 'In Main ER Bay',
        shown: [
          fact(`Inside Main ER Bay: ${pName(a)}, ${pName(b)}, ${pName(c)}, and ${pName(d)}.`, [a, b, c, d], { tag: 'loc', list: [a, b, c, d] }),
          fact(`Outside in Waiting Room: ${pName(e)} and ${pName(f)}.`, [e, f], { tag: 'note' }),
        ],
        alt: [
          fact(`Inside Main ER Bay: ${pName(b)}, ${pName(c)}, ${pName(d)}, and ${pName(e)}.`, [b, c, d, e], { tag: 'loc', list: [b, c, d, e] }),
          fact(`Outside in Waiting Room: ${pName(a)} and ${pName(f)}.`, [a, f], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Filter 2 · Injury', wingIndex: 0, label: 'Chest Injury Check',
        shown: [
          fact(`Confirmed CHEST injury: ${pName(a)}, ${pName(b)}, and ${pName(e)}.`, [a, b, e], { tag: 'chest', list: [a, b, e] }),
          fact(`Leg/arm injury only: ${pName(c)}, ${pName(d)}, and ${pName(f)}.`, [c, d, f], { tag: 'note' }),
        ],
        alt: [
          fact(`Confirmed CHEST injury: ${pName(b)}, ${pName(c)}, and ${pName(e)}.`, [b, c, e], { tag: 'chest', list: [b, c, e] }),
          fact(`Leg/arm injury only: ${pName(a)}, ${pName(d)}, and ${pName(f)}.`, [a, d, f], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Filter 3 · Pressure', wingIndex: 1, label: 'Low Blood Pressure',
        shown: [
          fact(`Dangerously LOW blood pressure (< 90): ${pName(a)}, ${pName(c)}, and ${pName(f)}.`, [a, c, f], { tag: 'bp', list: [a, c, f] }),
          fact(`Normal blood pressure: ${pName(b)}, ${pName(d)}, and ${pName(e)}.`, [b, d, e], { tag: 'note' }),
        ],
        alt: [
          fact(`Dangerously LOW blood pressure (< 90): ${pName(b)}, ${pName(d)}, and ${pName(f)}.`, [b, d, f], { tag: 'bp', list: [b, d, f] }),
          fact(`Normal blood pressure: ${pName(a)}, ${pName(c)}, and ${pName(e)}.`, [a, c, e], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Surgical Funnel', wingIndex: 1, label: '3-Way Narrowing',
        shown: [
          fact(`Emergency chest tube tray goes ONLY to the patient who passes ALL 3 filters:`, [], { tag: 'note' }),
          fact(`1) In Main ER Bay  +  2) Chest Injury  +  3) Low Blood Pressure (< 90).`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Emergency chest tube tray goes ONLY to the patient who passes ALL 3 filters:`, [], { tag: 'note' }),
          fact(`1) In Main ER Bay  +  2) Chest Injury  +  3) Low Blood Pressure (< 90).`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Surgical Funnel', wingIndex: 1, label: 'Step-by-Step Check',
        shown: [
          fact(`Each filter cuts the list down until only the exact match survives.`, [], { tag: 'note' }),
          fact(`Missing even one of the 3 filters rules the patient out.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Each filter cuts the list down until only the exact match survives.`, [], { tag: 'note' }),
          fact(`Missing even one of the 3 filters rules the patient out.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Surgical Funnel', wingIndex: 0, label: 'Chest Tray Ready',
        shown: [
          fact(`Narrow down all 3 filters to the exact patient(s) who match every single one.`, [], { tag: 'note' }),
          fact(`Send the chest tube tray now.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Narrow down all 3 filters to the exact patient(s) who match every single one.`, [], { tag: 'note' }),
          fact(`Send the chest tube tray now.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: '3-Filter Chest Trauma Funnel',
      dispatch: 'Narrow a crowded room down through 3 strict filters to find the exact patient needing a chest tube.',
      order: 'Treat ONLY the patient who meets ALL THREE: In Main ER Bay + Chest Injury + Low Blood Pressure (< 90).',
      hint: 'Find who appears on all three lists: Main ER Bay, Chest Injury, and Low Blood Pressure.',
      cards,
      evaluate(activeCards) {
        const loc = new Set(collectFactsByTag(activeCards, 'loc')[0]?.list || []);
        const chest = new Set(collectFactsByTag(activeCards, 'chest')[0]?.list || []);
        const bp = new Set(collectFactsByTag(activeCards, 'bp')[0]?.list || []);
        const targets = uniqueSortedIds([...loc].filter((id) => chest.has(id) && bp.has(id)));
        const partial = [...loc].filter((id) => !targets.includes(id) && (chest.has(id) || bp.has(id)));
        return {
          targets,
          proof: `Only ${formatList(targets)} appears in Main ER Bay, has a Chest Injury, AND has Low Blood Pressure (< 90).`,
          rival: buildRivalInfo(targets, partial, (id) => `${pName(id)} meets only two of the three filters.`),
        };
      },
    };
  },

  // #55 Synthetic reasoning (Inside · Composite)
  'synthetic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Fire Rescue', wingIndex: 0, label: 'Clue 1 · Scene',
        shown: [
          fact(`Pulled from smoky closed-garage fire: ${pName(a)}, ${pName(b)}, and ${pName(c)}.`, [a, b, c], { tag: 'fire', list: [a, b, c] }),
          fact(`Outdoor bicycle crash (fresh air): ${pName(d)}, ${pName(e)}, and ${pName(f)}.`, [d, e, f], { tag: 'note' }),
        ],
        alt: [
          fact(`Pulled from smoky closed-garage fire: ${pName(b)}, ${pName(c)}, and ${pName(d)}.`, [b, c, d], { tag: 'fire', list: [b, c, d] }),
          fact(`Outdoor bicycle crash (fresh air): ${pName(a)}, ${pName(e)}, and ${pName(f)}.`, [a, e, f], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Bedside Exam', wingIndex: 0, label: 'Clue 2 · Symptoms',
        shown: [
          fact(`Severe pounding headache + dizzy confusion: ${pName(a)}, ${pName(c)}, and ${pName(e)}.`, [a, c, e], { tag: 'head', list: [a, c, e] }),
          fact(`Clear-headed and alert: ${pName(b)}, ${pName(d)}, and ${pName(f)}.`, [b, d, f], { tag: 'note' }),
        ],
        alt: [
          fact(`Severe pounding headache + dizzy confusion: ${pName(b)}, ${pName(d)}, and ${pName(e)}.`, [b, d, e], { tag: 'head', list: [b, d, e] }),
          fact(`Clear-headed and alert: ${pName(a)}, ${pName(c)}, and ${pName(f)}.`, [a, c, f], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Finger Clip', wingIndex: 1, label: 'Clue 3 · Tricky Sensor',
        shown: [
          fact(`Finger clip reads a deceptive "100% normal" (typical for carbon monoxide!): ${pName(a)} and ${pName(b)}.`, [a, b], { tag: 'clip', list: [a, b] }),
          fact(`Finger clip reads 88% low (plain smoke, not CO trick): ${pName(c)} and ${pName(d)}.`, [c, d], { tag: 'note' }),
        ],
        alt: [
          fact(`Finger clip reads a deceptive "100% normal" (typical for carbon monoxide!): ${pName(b)} and ${pName(d)}.`, [b, d], { tag: 'clip', list: [b, d] }),
          fact(`Finger clip reads 88% low (plain smoke, not CO trick): ${pName(a)} and ${pName(c)}.`, [a, c], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Poison Guide', wingIndex: 1, label: 'Carbon Monoxide Pattern',
        shown: [
          fact(`Carbon monoxide poisoning hides behind a fake 100% finger-clip reading!`, [], { tag: 'note' }),
          fact(`Combine ALL 3 clues: Closed-Space Fire + Dizzy Headache + Deceptive 100% Finger Clip.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Carbon monoxide poisoning hides behind a fake 100% finger-clip reading!`, [], { tag: 'note' }),
          fact(`Combine ALL 3 clues: Closed-Space Fire + Dizzy Headache + Deceptive 100% Finger Clip.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Poison Guide', wingIndex: 1, label: 'Oxygen Chamber',
        shown: [
          fact(`High-pressure oxygen chamber is reserved for hidden carbon monoxide poisoning.`, [], { tag: 'note' }),
          fact(`Piece all 3 separate clues together into one complete diagnosis.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`High-pressure oxygen chamber is reserved for hidden carbon monoxide poisoning.`, [], { tag: 'note' }),
          fact(`Piece all 3 separate clues together into one complete diagnosis.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Poison Guide', wingIndex: 0, label: 'Chamber Call',
        shown: [
          fact(`Select every patient who combines Fire + Dizzy Headache + Deceptive 100% Finger Clip.`, [], { tag: 'note' }),
          fact(`Move them to high-pressure oxygen now.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Select every patient who combines Fire + Dizzy Headache + Deceptive 100% Finger Clip.`, [], { tag: 'note' }),
          fact(`Move them to high-pressure oxygen now.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Spotting Hidden Carbon Monoxide',
      dispatch: 'No single clue proves carbon monoxide alone — weave together scene, symptoms, and the tricked finger sensor.',
      order: 'Send to the oxygen chamber ONLY patients matching all 3 clues: Garage Fire + Dizzy Headache + Deceptive 100% Finger Clip.',
      hint: 'Combine Clue 1 (Fire) + Clue 2 (Dizzy Headache) + Clue 3 (Deceptive 100% Finger Clip).',
      cards,
      evaluate(activeCards) {
        const fire = new Set(collectFactsByTag(activeCards, 'fire')[0]?.list || []);
        const head = new Set(collectFactsByTag(activeCards, 'head')[0]?.list || []);
        const clip = new Set(collectFactsByTag(activeCards, 'clip')[0]?.list || []);
        const targets = uniqueSortedIds([...fire].filter((id) => head.has(id) && clip.has(id)));
        const partial = [...fire].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `${formatList(targets)} combines all 3 carbon monoxide clues: closed fire, dizzy headache, and deceptive 100% finger clip.`,
          rival: buildRivalInfo(targets, partial, (id) => `${pName(id)} lacks one of the 3 combined carbon monoxide clues.`),
        };
      },
    };
  },

  // #56 Dialectical reasoning (After · Composite)
  'dialectical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Heart Doctor', wingIndex: 0, label: 'Heart Specialist View',
        shown: [
          fact(`Heart Doctor recommends BLOOD THINNERS for ${pName(a)}, ${pName(b)}, and ${pName(c)}.`, [a, b, c], { tag: 'heart', list: [a, b, c] }),
          fact(`Goal: stop dangerous blood clots from blocking arteries.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Heart Doctor recommends BLOOD THINNERS for ${pName(b)}, ${pName(c)}, and ${pName(d)}.`, [b, c, d], { tag: 'heart', list: [b, c, d] }),
          fact(`Goal: stop dangerous blood clots from blocking arteries.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Trauma Surgeon', wingIndex: 1, label: 'Trauma Surgeon View',
        shown: [
          fact(`Trauma Surgeon warns NO BLOOD THINNERS for ${pName(a)}, ${pName(d)}, and ${pName(e)} (internal bruising!).`, [a, d, e], { tag: 'surg', list: [a, d, e] }),
          fact(`Goal: prevent fatal internal bleeding.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Trauma Surgeon warns NO BLOOD THINNERS for ${pName(c)}, ${pName(d)}, and ${pName(e)} (internal bruising!).`, [c, d, e], { tag: 'surg', list: [c, d, e] }),
          fact(`Goal: prevent fatal internal bleeding.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Joint Consult', wingIndex: 0, label: 'Agreement Cases',
        shown: [
          fact(`${pName(f)} needs neither blood thinners nor bleeding precautions.`, f, { tag: 'note' }),
          fact(`Patients on ONLY ONE list have no conflict — nurses can follow that order directly.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`${pName(f)} needs neither blood thinners nor bleeding precautions.`, f, { tag: 'note' }),
          fact(`Patients on ONLY ONE list have no conflict — nurses can follow that order directly.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Joint Consult', wingIndex: 1, label: 'Resolve the Clash',
        shown: [
          fact(`When Heart Doctor says "Give Thinners" AND Trauma Surgeon says "NO Thinners" for the SAME patient...`, [], { tag: 'note' }),
          fact(`...both teams must meet bedside to install a safe middle-ground vein filter!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`When Heart Doctor says "Give Thinners" AND Trauma Surgeon says "NO Thinners" for the SAME patient...`, [], { tag: 'note' }),
          fact(`...both teams must meet bedside to install a safe middle-ground vein filter!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Joint Consult', wingIndex: 0, label: 'Both Sides Matter',
        shown: [
          fact(`Ignoring either specialist could kill the overlapping patient.`, [], { tag: 'note' }),
          fact(`Find who sits in the DIRECT CONFLICT between both specialists.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Ignoring either specialist could kill the overlapping patient.`, [], { tag: 'note' }),
          fact(`Find who sits in the DIRECT CONFLICT between both specialists.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Joint Consult', wingIndex: 1, label: 'Joint Conference',
        shown: [
          fact(`Call an immediate joint consult for every patient on BOTH conflicting lists.`, [], { tag: 'note' }),
          fact(`Select the exact overlapping patient(s).`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Call an immediate joint consult for every patient on BOTH conflicting lists.`, [], { tag: 'note' }),
          fact(`Select the exact overlapping patient(s).`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Reconciling Conflicting Specialists',
      dispatch: 'The Heart Doctor wants blood thinners; the Trauma Surgeon forbids them — spot the patient caught in the middle.',
      order: 'Call a joint compromise consult ONLY for patients caught in the direct clash (on BOTH the Heart and Trauma lists).',
      hint: 'Find who appears on BOTH the "Give Blood Thinners" list AND the "NO Blood Thinners" list.',
      cards,
      evaluate(activeCards) {
        const heart = new Set(collectFactsByTag(activeCards, 'heart')[0]?.list || []);
        const surg = new Set(collectFactsByTag(activeCards, 'surg')[0]?.list || []);
        const targets = uniqueSortedIds([...heart].filter((id) => surg.has(id)));
        const oneSide = [...heart, ...surg].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `${formatList(targets)} appears on BOTH opposing specialist lists (thinners vs. no thinners) and needs a joint compromise plan.`,
          rival: buildRivalInfo(targets, oneSide, (id) => `${pName(id)} has no disagreement between the two specialists.`),
        };
      },
    };
  },

  // #57 First-principles reasoning (Inside · Composite)
  'first-principles': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Trauma Basics', wingIndex: 0, label: 'Basic Biology Law',
        shown: [
          fact(`Fundamental rule of survival: A completely BLOCKED AIRWAY kills the brain in 3 minutes.`, [], { tag: 'note' }),
          fact(`Someone screaming loudly is moving air through an OPEN airway — silence is deadlier!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Fundamental rule of survival: A completely BLOCKED AIRWAY kills the brain in 3 minutes.`, [], { tag: 'note' }),
          fact(`Someone screaming loudly is moving air through an OPEN airway — silence is deadlier!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Trauma Bay', wingIndex: 1, label: 'Bays 1 & 2',
        shown: [
          fact(`${pName(a)}: Silent, lips turning blue — throat completely blocked, ZERO air moving.`, a, { tag: 'air', blocked: true }),
          fact(`${pName(b)}: Screaming loudly about a broken collarbone — breathing full breaths.`, b, { tag: 'air', blocked: false }),
        ],
        alt: [
          fact(`${pName(a)}: Screaming loudly about a broken wrist — breathing full breaths.`, a, { tag: 'air', blocked: false }),
          fact(`${pName(b)}: Silent, lips turning blue — throat completely blocked, ZERO air moving.`, b, { tag: 'air', blocked: true }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Trauma Bay', wingIndex: 1, label: 'Bays 3 & 4',
        shown: [
          fact(`${pName(c)}: Loudly yelling for pain medicine — fractured shin, breathing fine.`, c, { tag: 'air', blocked: false }),
          fact(`${pName(d)}: Gasping with ZERO sound — swollen airway completely shut.`, d, { tag: 'air', blocked: true }),
        ],
        alt: [
          fact(`${pName(c)}: Gasping with ZERO sound — swollen airway completely shut.`, c, { tag: 'air', blocked: true }),
          fact(`${pName(d)}: Loudly yelling for pain medicine — fractured shin, breathing fine.`, d, { tag: 'air', blocked: false }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Trauma Bay', wingIndex: 1, label: 'Bays 5 & 6',
        shown: [
          fact(`${pName(e)}: Crying loudly with a bloody nose — talking clearly.`, e, { tag: 'air', blocked: false }),
          fact(`${pName(f)}: Groaning loudly from dislocated shoulder — clear lungs.`, f, { tag: 'air', blocked: false }),
        ],
        alt: [
          fact(`${pName(e)}: Silent, clutching throat — zero air moving through blocked airway.`, e, { tag: 'air', blocked: true }),
          fact(`${pName(f)}: Groaning loudly from dislocated shoulder — clear lungs.`, f, { tag: 'air', blocked: false }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Trauma Basics', wingIndex: 0, label: 'Ignore the Noise',
        shown: [
          fact(`Loud pain grabs attention, but physics says air comes BEFORE bones or cuts.`, [], { tag: 'note' }),
          fact(`Open every completely blocked airway first.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Loud pain grabs attention, but physics says air comes BEFORE bones or cuts.`, [], { tag: 'note' }),
          fact(`Open every completely blocked airway first.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Trauma Basics', wingIndex: 0, label: 'Airway First',
        shown: [
          fact(`Clear the airway for every silent patient with ZERO air moving.`, [], { tag: 'note' }),
          fact(`Loud screamers can wait 3 minutes.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Clear the airway for every silent patient with ZERO air moving.`, [], { tag: 'note' }),
          fact(`Loud screamers can wait 3 minutes.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Airway Comes Before Loud Pain',
      dispatch: 'Stripped down to basic survival biology: if you can scream, your airway is open.',
      order: 'Ignore the loud screamers and open the airway for every silent patient with a completely blocked airway.',
      hint: 'Pick every patient whose airway is blocked with zero air moving.',
      cards,
      evaluate(activeCards) {
        const list = collectFactsByTag(activeCards, 'air');
        const targets = uniqueSortedIds(list.filter((x) => x.blocked).map((x) => x.patients[0]));
        const loud = list.filter((x) => !x.blocked).map((x) => x.patients[0]);
        return {
          targets,
          proof: `${formatList(targets)} have completely blocked airways (0 air moving) and will suffer brain death in minutes.`,
          rival: buildRivalInfo(targets, loud, (id) => `${pName(id)} is loud, which proves their airway is open and moving air.`),
        };
      },
    };
  },

  // #58 Lateral reasoning (Before · Composite)
  'lateral-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    // Use actual physical bay numbers (Top Row = Bays 1..5, Bottom Row = Bays 6..10)!
    const allSix = [a, b, c, d, e, f];
    const topOnes = allSix.filter((id) => pBay(id) <= 5);
    const botOnes = allSix.filter((id) => pBay(id) >= 6);
    // Guarantee at least 1 and at most 3 in the oxygen-dependent group on Top Row
    const oxygenTop = topOnes.slice(0, Math.min(2, topOnes.length));
    const oxygenBot = botOnes.slice(0, Math.min(2, botOnes.length));
    const noOxy = allSix.filter((id) => !oxygenTop.includes(id) && !oxygenBot.includes(id));
    const o1 = oxygenTop[0] || a;
    const o2 = oxygenTop[1] || noOxy[0] || b;
    const b1 = oxygenBot[0] || c;
    const b2 = oxygenBot[1] || noOxy[1] || d;
    const r1 = noOxy[0] && noOxy[0] !== o2 ? noOxy[0] : e;
    const r2 = noOxy[1] && noOxy[1] !== b2 ? noOxy[1] : f;

    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Building Alert', wingIndex: 0, label: 'Wall Pipe Failure!',
        shown: [
          fact(`Plumbing emergency: The BAYS 1–5 oxygen wall pipe (Left Wall) just lost ALL pressure!`, [], { tag: 'pipe', row: 'top' }),
          fact(`The Bays 6–10 pipe (Right Wall) still has full oxygen pressure.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Plumbing emergency: The BAYS 6–10 oxygen wall pipe (Right Wall) just lost ALL pressure!`, [], { tag: 'pipe', row: 'bottom' }),
          fact(`The Bays 1–5 pipe (Left Wall) still has full oxygen pressure.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Oxygen Log', wingIndex: 1, label: 'On Wall Oxygen Mask',
        shown: [
          fact(`${pName(o1)} (Bay ${pBay(o1)}) depends on the wall oxygen mask to breathe.`, o1, { tag: 'oxy', needs: true, bay: pBay(o1) }),
          fact(`${pName(b1)} (Bay ${pBay(b1)}) depends on the wall oxygen mask to breathe.`, b1, { tag: 'oxy', needs: true, bay: pBay(b1) }),
        ],
        alt: [
          fact(`${pName(o1)} (Bay ${pBay(o1)}) is breathing plain room air (no wall oxygen).`, o1, { tag: 'oxy', needs: false, bay: pBay(o1) }),
          fact(`${pName(b1)} (Bay ${pBay(b1)}) depends on the wall oxygen mask to breathe.`, b1, { tag: 'oxy', needs: true, bay: pBay(b1) }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Oxygen Log', wingIndex: 1, label: 'More Wall Masks',
        shown: [
          fact(`${pName(o2)} (Bay ${pBay(o2)}) depends on the wall oxygen mask to breathe.`, o2, { tag: 'oxy', needs: true, bay: pBay(o2) }),
          fact(`${pName(b2)} (Bay ${pBay(b2)}) is breathing plain room air (no wall oxygen).`, b2, { tag: 'oxy', needs: false, bay: pBay(b2) }),
        ],
        alt: [
          fact(`${pName(o2)} (Bay ${pBay(o2)}) depends on the wall oxygen mask to breathe.`, o2, { tag: 'oxy', needs: true, bay: pBay(o2) }),
          fact(`${pName(b2)} (Bay ${pBay(b2)}) depends on the wall oxygen mask to breathe.`, b2, { tag: 'oxy', needs: true, bay: pBay(b2) }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Room Air Log', wingIndex: 1, label: 'No Oxygen Needed',
        shown: [
          fact(`${pName(r1)} (Bay ${pBay(r1)}) is on room air only — pipe outage does not affect them.`, r1, { tag: 'oxy', needs: false, bay: pBay(r1) }),
          fact(`${pName(r2)} (Bay ${pBay(r2)}) is on room air only — pipe outage does not affect them.`, r2, { tag: 'oxy', needs: false, bay: pBay(r2) }),
        ],
        alt: [
          fact(`${pName(r1)} (Bay ${pBay(r1)}) is on room air only — pipe outage does not affect them.`, r1, { tag: 'oxy', needs: false, bay: pBay(r1) }),
          fact(`${pName(r2)} (Bay ${pBay(r2)}) is on room air only — pipe outage does not affect them.`, r2, { tag: 'oxy', needs: false, bay: pBay(r2) }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Building Alert', wingIndex: 0, label: 'Check the Wall, Not Just Labs',
        shown: [
          fact(`Look at the physical BAY NUMBERS on the monitor wall (1–5 Left Wall vs 6–10 Right Wall).`, [], { tag: 'note' }),
          fact(`Only patients on wall oxygen connected to the broken pipe need portable tanks!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Look at the physical BAY NUMBERS on the monitor wall (1–5 Left Wall vs 6–10 Right Wall).`, [], { tag: 'note' }),
          fact(`Only patients on wall oxygen connected to the broken pipe need portable tanks!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Building Alert', wingIndex: 0, label: 'Portable Tanks Ready',
        shown: [
          fact(`Rush portable oxygen cylinders to every wall-oxygen patient on the failed pipe side.`, [], { tag: 'note' }),
          fact(`Check both: Needs Wall Oxygen + sits in the Broken Pipe Bay range.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Rush portable oxygen cylinders to every wall-oxygen patient on the failed pipe side.`, [], { tag: 'note' }),
          fact(`Check both: Needs Wall Oxygen + sits in the Broken Pipe Bay range.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Broken Oxygen Wall Pipe',
      dispatch: 'Sometimes the danger is in the hospital plumbing, not the lab — check physical Bay Numbers on the wall!',
      order: 'Bring portable oxygen tanks ONLY to wall-oxygen patients in the bay group whose oxygen wall pipe failed.',
      hint: 'Check which wall pipe failed (Bays 1–5 vs 6–10), then pick every patient in those bays who depends on wall oxygen.',
      cards,
      evaluate(activeCards) {
        const pipe = collectFactsByTag(activeCards, 'pipe')[0];
        if (!pipe) return null;
        const inBrokenRow = (bay) => (pipe.row === 'top' ? bay <= 5 : bay >= 6);
        const list = collectFactsByTag(activeCards, 'oxy');
        const targets = uniqueSortedIds(list.filter((x) => x.needs && inBrokenRow(x.bay)).map((x) => x.patients[0]));
        const others = list.filter((x) => !(x.needs && inBrokenRow(x.bay))).map((x) => x.patients[0]);
        const rowLabel = pipe.row === 'top' ? 'Left Wall (Bays 1–5)' : 'Right Wall (Bays 6–10)';
        return {
          targets,
          proof: `The ${rowLabel} wall pipe failed, cutting off wall oxygen to ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, others, (id) => `${pName(id)} is either on plain room air or connected to the working oxygen pipe.`),
        };
      },
    };
  },

  // #59 Generative reasoning (Inside · Composite)
  'generative-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Blood Bank', wingIndex: 0, label: 'Rare Supply In Stock',
        shown: [
          fact(`Emergency blood bank has ONLY Type B-negative blood left in the fridge.`, [], { tag: 'stock', type: 'B-' }),
          fact(`All Type A and Type O bags are completely empty right now.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Emergency blood bank has ONLY Type A-positive blood left in the fridge.`, [], { tag: 'stock', type: 'A+' }),
          fact(`All Type B and Type O bags are completely empty right now.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Transfusion Desk', wingIndex: 1, label: 'Bleeding Patients 1 & 2',
        shown: [
          fact(`${pName(a)} is bleeding heavily — Blood Type B-negative (EXACT match for B-negative).`, a, { tag: 'rec', canTake: ['B-'] }),
          fact(`${pName(b)} is bleeding heavily — Blood Type AB-positive (can safely receive ANY type: A+, B-, etc.).`, b, { tag: 'rec', canTake: ['B-', 'A+'] }),
        ],
        alt: [
          fact(`${pName(a)} is bleeding heavily — Blood Type O-negative (can ONLY take O-negative).`, a, { tag: 'rec', canTake: ['O-'] }),
          fact(`${pName(b)} is bleeding heavily — Blood Type B-negative (match for B-negative only).`, b, { tag: 'rec', canTake: ['B-'] }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Transfusion Desk', wingIndex: 1, label: 'Bleeding Patients 3 & 4',
        shown: [
          fact(`${pName(c)} is bleeding heavily — Blood Type O-negative (can ONLY receive O-negative).`, c, { tag: 'rec', canTake: ['O-'] }),
          fact(`${pName(d)} is bleeding heavily — Blood Type A-positive (can ONLY receive A or O).`, d, { tag: 'rec', canTake: ['A+'] }),
        ],
        alt: [
          fact(`${pName(c)} is bleeding heavily — Blood Type A-positive (match for A-positive).`, c, { tag: 'rec', canTake: ['A+'] }),
          fact(`${pName(d)} is bleeding heavily — Blood Type O-negative (can ONLY receive O-negative).`, d, { tag: 'rec', canTake: ['O-'] }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Transfusion Desk', wingIndex: 1, label: 'Stable Bays',
        shown: [
          fact(`${pName(e)} is NOT bleeding (no transfusion needed).`, e, { tag: 'rec', canTake: [] }),
          fact(`${pName(f)} is NOT bleeding (no transfusion needed).`, f, { tag: 'rec', canTake: [] }),
        ],
        alt: [
          fact(`${pName(e)} is NOT bleeding (no transfusion needed).`, e, { tag: 'rec', canTake: [] }),
          fact(`${pName(f)} is NOT bleeding (no transfusion needed).`, f, { tag: 'rec', canTake: [] }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Blood Bank', wingIndex: 0, label: 'Compatibility Rule',
        shown: [
          fact(`Giving the wrong blood type causes a fatal reaction — match what is ACTUALLY in the fridge!`, [], { tag: 'note' }),
          fact(`Remember: AB-positive can safely receive B-negative OR A-positive.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Giving the wrong blood type causes a fatal reaction — match what is ACTUALLY in the fridge!`, [], { tag: 'note' }),
          fact(`Remember: AB-positive can safely receive B-negative OR A-positive.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Blood Bank', wingIndex: 0, label: 'Release Bags',
        shown: [
          fact(`Send the available fridge blood to every bleeding patient who can SAFELY receive it.`, [], { tag: 'note' }),
          fact(`Check both exact matches AND universal recipients.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Send the available fridge blood to every bleeding patient who can SAFELY receive it.`, [], { tag: 'note' }),
          fact(`Check both exact matches AND universal recipients.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Emergency Blood Match',
      dispatch: 'The fridge is down to one unusual blood type — pair it safely with every bleeding patient who can accept it.',
      order: 'Transfuse ONLY bleeding patients who can SAFELY accept the blood type currently left in the fridge.',
      hint: 'Check what blood type is in stock, then select every bleeding patient listed as able to receive that type.',
      cards,
      evaluate(activeCards) {
        const stock = collectFactsByTag(activeCards, 'stock')[0];
        if (!stock) return null;
        const recs = collectFactsByTag(activeCards, 'rec');
        const targets = uniqueSortedIds(recs.filter((x) => x.canTake.includes(stock.type)).map((x) => x.patients[0]));
        const others = recs.filter((x) => !x.canTake.includes(stock.type)).map((x) => x.patients[0]);
        return {
          targets,
          proof: `With only ${stock.type} blood in stock, ${formatList(targets)} can safely receive an immediate transfusion.`,
          rival: buildRivalInfo(targets, others, (id) => `${pName(id)} cannot safely take ${stock.type} blood or is not bleeding.`),
        };
      },
    };
  },

  // #60 Decompositional reasoning (After · Atomic)
  'decompositional-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'First Half (01–03)', wingIndex: 0, label: 'Early Shift Alerts',
        shown: [
          fact(`01:00 First Half alert: ${pName(a)} had dropping oxygen.`, a, { tag: 'early' }),
          fact(`02:00 First Half alert: ${pName(b)} had dropping oxygen.`, b, { tag: 'early' }),
        ],
        alt: [
          fact(`01:00 First Half alert: ${pName(a)} had dropping oxygen.`, a, { tag: 'early' }),
          fact(`02:00 First Half alert: ${pName(c)} had dropping oxygen.`, c, { tag: 'early' }),
        ],
      }),
      makeCard({
        index: 1, time: '03:00', wing: 'First Half (01–03)', wingIndex: 0, label: 'Early Shift Close',
        shown: [
          fact(`03:00 First Half alert: ${pName(c)} had dropping oxygen.`, c, { tag: 'early' }),
          fact(`First Half (01:00–03:00) log complete.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`03:00 First Half alert: ${pName(d)} had dropping oxygen.`, d, { tag: 'early' }),
          fact(`First Half (01:00–03:00) log complete.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 2, time: '04:00', wing: 'Second Half (04–06)', wingIndex: 1, label: 'Late Shift Alerts',
        shown: [
          fact(`04:00 Second Half alert: ${pName(a)} STILL has dropping oxygen.`, a, { tag: 'late' }),
          fact(`05:00 Second Half alert: ${pName(d)} newly had dropping oxygen.`, d, { tag: 'late' }),
        ],
        alt: [
          fact(`04:00 Second Half alert: ${pName(c)} STILL has dropping oxygen.`, c, { tag: 'late' }),
          fact(`05:00 Second Half alert: ${pName(e)} newly had dropping oxygen.`, e, { tag: 'late' }),
        ],
      }),
      makeCard({
        index: 3, time: '06:00', wing: 'Second Half (04–06)', wingIndex: 1, label: 'Late Shift Close',
        shown: [
          fact(`06:00 Second Half alert: ${pName(c)} STILL has dropping oxygen.`, c, { tag: 'late' }),
          fact(`${pName(e)} and ${pName(f)} had no ongoing alerts across both halves.`, [e, f], { tag: 'note' }),
        ],
        alt: [
          fact(`06:00 Second Half alert: ${pName(d)} STILL has dropping oxygen.`, d, { tag: 'late' }),
          fact(`${pName(b)} and ${pName(f)} recovered before the Second Half.`, [b, f], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '06:00', wing: 'Shift Review', wingIndex: 0, label: 'Split Into Two Halves',
        shown: [
          fact(`Break the 6-hour shift into First Half (01–03) and Second Half (04–06).`, [], { tag: 'note' }),
          fact(`One-half blips got fixed; patients flagged in BOTH halves have an unresolved hidden leak!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Break the 6-hour shift into First Half (01–03) and Second Half (04–06).`, [], { tag: 'note' }),
          fact(`One-half blips got fixed; patients flagged in BOTH halves have an unresolved hidden leak!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Shift Review', wingIndex: 1, label: 'Escalation Order',
        shown: [
          fact(`Escalate ONLY patients who triggered alerts in BOTH First Half AND Second Half.`, [], { tag: 'note' }),
          fact(`Skip one-time alerts.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Escalate ONLY patients who triggered alerts in BOTH First Half AND Second Half.`, [], { tag: 'note' }),
          fact(`Skip one-time alerts.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'First-Half vs. Second-Half Audit',
      dispatch: 'Break a chaotic 6-hour log into Early and Late halves to spot who never stopped crashing.',
      order: 'Escalate ONLY patients who had dropping-oxygen alerts in BOTH the First Half (01–03) AND the Second Half (04–06).',
      hint: 'Find patients whose names appear in BOTH the 01:00–03:00 cards AND the 04:00–06:00 cards.',
      cards,
      evaluate(activeCards) {
        const early = new Set(collectByTag(activeCards, 'early'));
        const late = new Set(collectByTag(activeCards, 'late'));
        const targets = uniqueSortedIds([...early].filter((id) => late.has(id)));
        const oneHalf = [...early, ...late].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `${formatList(targets)} triggered oxygen alerts in BOTH the First Half and Second Half of the shift.`,
          rival: buildRivalInfo(targets, oneHalf, (id) => `${pName(id)} only appeared in one half of the shift, not both.`),
        };
      },
    };
  },

  // #61 Emergent reasoning (Inside · Composite)
  'emergent-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Bedside Flags', wingIndex: 0, label: 'Check 1 · Mild Fever',
        shown: [
          fact(`Slight fever (mild alone): ${pName(a)}, ${pName(b)}, and ${pName(c)}.`, [a, b, c], { tag: 'flag', list: [a, b, c] }),
          fact(`Normal temperature: ${pName(d)}, ${pName(e)}, and ${pName(f)}.`, [d, e, f], { tag: 'note' }),
        ],
        alt: [
          fact(`Slight fever (mild alone): ${pName(b)}, ${pName(d)}, and ${pName(e)}.`, [b, d, e], { tag: 'flag', list: [b, d, e] }),
          fact(`Normal temperature: ${pName(a)}, ${pName(c)}, and ${pName(f)}.`, [a, c, f], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Bedside Flags', wingIndex: 0, label: 'Check 2 · Fast Breathing',
        shown: [
          fact(`Slightly fast breathing (mild alone): ${pName(a)}, ${pName(c)}, and ${pName(d)}.`, [a, c, d], { tag: 'flag', list: [a, c, d] }),
          fact(`Calm breathing: ${pName(b)}, ${pName(e)}, and ${pName(f)}.`, [b, e, f], { tag: 'note' }),
        ],
        alt: [
          fact(`Slightly fast breathing (mild alone): ${pName(b)}, ${pName(c)}, and ${pName(e)}.`, [b, c, e], { tag: 'flag', list: [b, c, e] }),
          fact(`Calm breathing: ${pName(a)}, ${pName(d)}, and ${pName(f)}.`, [a, d, f], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Bedside Flags', wingIndex: 0, label: 'Check 3 · Mild Confusion',
        shown: [
          fact(`Slightly foggy/sleepy (mild alone): ${pName(a)}, ${pName(b)}, and ${pName(e)}.`, [a, b, e], { tag: 'flag', list: [a, b, e] }),
          fact(`Fully sharp: ${pName(c)}, ${pName(d)}, and ${pName(f)}.`, [c, d, f], { tag: 'note' }),
        ],
        alt: [
          fact(`Slightly foggy/sleepy (mild alone): ${pName(b)}, ${pName(d)}, and ${pName(e)}.`, [b, d, e], { tag: 'flag', list: [b, d, e] }),
          fact(`Fully sharp: ${pName(a)}, ${pName(c)}, and ${pName(f)}.`, [a, c, f], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Sepsis Alert', wingIndex: 1, label: 'Together = Deadly Collapse',
        shown: [
          fact(`None of these 3 mild signs looks scary by itself...`, [], { tag: 'note' }),
          fact(`...but ANY patient carrying ALL 3 mild flags together is entering sudden blood-infection shock!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`None of these 3 mild signs looks scary by itself...`, [], { tag: 'note' }),
          fact(`...but ANY patient carrying ALL 3 mild flags together is entering sudden blood-infection shock!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Sepsis Alert', wingIndex: 1, label: 'Count the Stacked Flags',
        shown: [
          fact(`1 or 2 mild signs = watch closely on the regular ward.`, [], { tag: 'note' }),
          fact(`All 3 mild signs stacked together = IMMEDIATE IV antibiotics & fluids!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`1 or 2 mild signs = watch closely on the regular ward.`, [], { tag: 'note' }),
          fact(`All 3 mild signs stacked together = IMMEDIATE IV antibiotics & fluids!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Sepsis Alert', wingIndex: 1, label: 'Shock Rescue',
        shown: [
          fact(`Find everyone who has ALL THREE mild flags stacked at once.`, [], { tag: 'note' }),
          fact(`Start blood-infection rescue now.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Find everyone who has ALL THREE mild flags stacked at once.`, [], { tag: 'note' }),
          fact(`Start blood-infection rescue now.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Three Mild Signs = Sudden Shock',
      dispatch: 'Each warning looks harmless on its own — together they trigger sudden blood-infection shock.',
      order: 'Start emergency blood-infection rescue ONLY for patients carrying ALL 3 mild flags (Fever + Fast Breathing + Foggy).',
      hint: 'Count how many of the 3 mild-flag cards list each patient; pick everyone who appears on all 3.',
      cards,
      evaluate(activeCards) {
        const counts = new Map();
        for (const f of collectFactsByTag(activeCards, 'flag')) {
          for (const id of f.list) counts.set(id, (counts.get(id) || 0) + 1);
        }
        const targets = uniqueSortedIds([...counts.entries()].filter(([, n]) => n >= 3).map(([id]) => id));
        const twos = [...counts.entries()].filter(([, n]) => n === 2).map(([id]) => id);
        return {
          targets,
          proof: `${formatList(targets)} carries all 3 mild signs at once, crossing the threshold into sudden blood-infection shock.`,
          rival: buildRivalInfo(targets, twos, (id) => `${pName(id)} has only 2 mild flags, not the full 3-sign shock cluster.`),
        };
      },
    };
  },

  // =========================================================================
  // FAMILY 7: SOCIAL, PSYCHOLOGICAL & ETHICAL REASONING (#62–#70)
  // =========================================================================

  // #62 Interpersonal reasoning (After · Atomic)
  'interpersonal-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Waiting Room', wingIndex: 0, label: 'Family Contacts 1',
        shown: [
          fact(`${pName(a)}'s family spokesperson is translating for ${pName(b)}'s parents AND ${pName(c)}'s sister.`, [a, b, c], { tag: 'hub', who: a, links: 3 }),
          fact(`${pName(b)} knows only 1 person in the waiting room.`, b, { tag: 'hub', who: b, links: 1 }),
        ],
        alt: [
          fact(`${pName(a)} knows only 1 person in the waiting room.`, a, { tag: 'hub', who: a, links: 1 }),
          fact(`${pName(b)}'s family spokesperson is translating for ${pName(a)}'s parents AND ${pName(c)}'s sister.`, [b, a, c], { tag: 'hub', who: b, links: 3 }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Waiting Room', wingIndex: 0, label: 'Family Contacts 2',
        shown: [
          fact(`${pName(c)}'s brother knows only ${pName(a)}'s spokesperson.`, [c, a], { tag: 'hub', who: c, links: 1 }),
          fact(`${pName(d)}'s partner arrived alone and knows no other families.`, d, { tag: 'hub', who: d, links: 0 }),
        ],
        alt: [
          fact(`${pName(c)}'s brother is connecting ${pName(d)}, ${pName(e)}, and ${pName(f)}'s families (4 groups!).`, [c, d, e, f], { tag: 'hub', who: c, links: 4 }),
          fact(`${pName(d)}'s partner arrived alone and knows no other families.`, d, { tag: 'hub', who: d, links: 0 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Waiting Room', wingIndex: 0, label: 'Family Contacts 3',
        shown: [
          fact(`${pName(e)}'s cousin knows only ${pName(f)}'s aunt (1 link).`, [e, f], { tag: 'hub', who: e, links: 1 }),
          fact(`${pName(f)}'s aunt knows only ${pName(e)}'s cousin (1 link).`, [f, e], { tag: 'hub', who: f, links: 1 }),
        ],
        alt: [
          fact(`${pName(e)}'s cousin knows only ${pName(f)}'s aunt (1 link).`, [e, f], { tag: 'hub', who: e, links: 1 }),
          fact(`${pName(f)}'s aunt knows only ${pName(e)}'s cousin (1 link).`, [f, e], { tag: 'hub', who: f, links: 1 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Family Desk', wingIndex: 1, label: 'Calm the Crowd Fast',
        shown: [
          fact(`A bus crash left dozens of panicked relatives in the waiting room.`, [], { tag: 'note' }),
          fact(`Brief the ONE patient's family spokesperson who connects the MOST other families first.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`A bus crash left dozens of panicked relatives in the waiting room.`, [], { tag: 'note' }),
          fact(`Brief the ONE patient's family spokesperson who connects the MOST other families first.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Family Desk', wingIndex: 1, label: 'Trusted Connector',
        shown: [
          fact(`One trusted bilingual connector can immediately calm and guide the whole waiting room.`, [], { tag: 'note' }),
          fact(`Check who has the highest number of family connections.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`One trusted bilingual connector can immediately calm and guide the whole waiting room.`, [], { tag: 'note' }),
          fact(`Check who has the highest number of family connections.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Family Desk', wingIndex: 1, label: 'Step Into Waiting Room',
        shown: [
          fact(`Meet first with the patient whose family is the biggest connector hub.`, [], { tag: 'note' }),
          fact(`Select that single patient.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Meet first with the patient whose family is the biggest connector hub.`, [], { tag: 'note' }),
          fact(`Select that single patient.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Waiting Room Family Liaison',
      dispatch: 'Dozens of terrified relatives are waiting after a bus crash — speak first to the family who bridges the most people.',
      order: 'Select the patient whose family spokesperson connects the MOST other families in the waiting room.',
      hint: 'Find which patient\'s family is translating for or connecting the largest circle of other families.',
      cards,
      evaluate(activeCards) {
        const list = collectFactsByTag(activeCards, 'hub');
        const maxL = Math.max(...list.map((x) => x.links));
        const targets = uniqueSortedIds(list.filter((x) => x.links === maxL).map((x) => x.who));
        const others = list.filter((x) => x.links < maxL).map((x) => x.who);
        return {
          targets,
          proof: `${formatList(targets)}'s family is the key human hub (${maxL} family connections) who can help calm and inform the room.`,
          rival: buildRivalInfo(targets, others, (id) => `${pName(id)}'s family is connected to fewer relatives in the room.`),
        };
      },
    };
  },

  // #63 Mentalistic reasoning (After · Composite)
  'mentalistic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Early Call (01:00)', wingIndex: 0, label: 'Scary Early Update',
        shown: [
          fact(`01:00 nurse told ${pName(a)}'s family: "Critical — entering risky surgery!"`, a, { tag: 'scared' }),
          fact(`01:00 nurse told ${pName(b)}'s family: "Critical — entering risky surgery!"`, b, { tag: 'scared' }),
        ],
        alt: [
          fact(`01:00 nurse told ${pName(a)}'s family: "Minor sprain — safe."`, a, { tag: 'calm' }),
          fact(`01:00 nurse told ${pName(b)}'s family: "Critical — entering risky surgery!"`, b, { tag: 'scared' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Early Call (01:00)', wingIndex: 0, label: 'More Early Updates',
        shown: [
          fact(`02:00 nurse told ${pName(c)}'s family: "Critical — entering risky surgery!"`, c, { tag: 'scared' }),
          fact(`02:00 nurse told ${pName(d)}'s family: "Minor bruise — totally fine."`, d, { tag: 'calm' }),
        ],
        alt: [
          fact(`02:00 nurse told ${pName(c)}'s family: "Critical — entering risky surgery!"`, c, { tag: 'scared' }),
          fact(`02:00 nurse told ${pName(d)}'s family: "Critical — entering risky surgery!"`, d, { tag: 'scared' }),
        ],
      }),
      makeCard({
        index: 2, time: '05:00', wing: 'Follow-Up Log', wingIndex: 1, label: 'Who Got the Good News?',
        shown: [
          fact(`05:00 surgeon already walked out and told ${pName(b)}'s family: "Surgery succeeded — safe!"`, b, { tag: 'updated' }),
          fact(`${pName(e)} and ${pName(f)} came in alone (no family waiting).`, [e, f], { tag: 'calm' }),
        ],
        alt: [
          fact(`05:00 surgeon already walked out and told ${pName(c)}'s family: "Surgery succeeded — safe!"`, c, { tag: 'updated' }),
          fact(`${pName(e)} and ${pName(f)} came in alone (no family waiting).`, [e, f], { tag: 'calm' }),
        ],
      }),
      makeCard({
        index: 3, time: '05:30', wing: 'Follow-Up Log', wingIndex: 1, label: 'Good News on Everyone',
        shown: [
          fact(`Good news: ALL surgeries succeeded — every patient is actually safe now!`, [], { tag: 'note' }),
          fact(`BUT some families were NEVER told and still think their loved one is dying!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Good news: ALL surgeries succeeded — every patient is actually safe now!`, [], { tag: 'note' }),
          fact(`BUT some families were NEVER told and still think their loved one is dying!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '06:00', wing: 'Family Room', wingIndex: 0, label: 'What Do They Believe?',
        shown: [
          fact(`Put yourself in each family's shoes: who got the scary 01–02:00 call and NO follow-up?`, [], { tag: 'note' }),
          fact(`Go relieve their panic immediately.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Put yourself in each family's shoes: who got the scary 01–02:00 call and NO follow-up?`, [], { tag: 'note' }),
          fact(`Go relieve their panic immediately.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Family Room', wingIndex: 1, label: 'Update Priority',
        shown: [
          fact(`Skip families who were already updated or told "totally fine."`, [], { tag: 'note' }),
          fact(`Select every patient whose family STILL thinks they are in mortal danger.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Skip families who were already updated or told "totally fine."`, [], { tag: 'note' }),
          fact(`Select every patient whose family STILL thinks they are in mortal danger.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Relieving Families Left in the Dark',
      dispatch: 'Every surgery succeeded, but some waiting families never got the follow-up call and are still terrified.',
      order: 'Go update the families who got a scary "risky surgery" alert and STILL have NOT been told their loved one is safe.',
      hint: 'Find families told "risky surgery" early, then cross off anyone who already got the 05:00 "safe!" follow-up.',
      cards,
      evaluate(activeCards) {
        const scared = new Set(collectByTag(activeCards, 'scared'));
        const updated = new Set(collectByTag(activeCards, 'updated'));
        const targets = uniqueSortedIds([...scared].filter((id) => !updated.has(id)));
        const others = [...updated, ...collectByTag(activeCards, 'calm')];
        return {
          targets,
          proof: `${formatList(targets)}'s families received the scary surgery warning and never got the 05:00 update, so they still believe their loved one is in danger.`,
          rival: buildRivalInfo(targets, others, (id) =>
            updated.has(id) ? `${pName(id)}'s family already received the 05:00 good-news update.` : `${pName(id)}'s family was never told they were in danger.`
          ),
        };
      },
    };
  },

  // #64 Motivational reasoning (After · Composite)
  'motivational-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'VIP Calls', wingIndex: 0, label: 'Hospital Board Pressure',
        shown: [
          fact(`${pName(a)} (hospital donor): Minor ankle twist — board member phoned demanding "URGENT VIP jump!"`, a, { tag: 'mot', medical: false }),
          fact(`${pName(b)} (city councilor): Mild paper cut — press aide demanding "skip the line right now!"`, b, { tag: 'mot', medical: false }),
        ],
        alt: [
          fact(`${pName(a)} (hospital donor): Hidden internal spleen bleed — blood pressure crashing fast!`, a, { tag: 'mot', medical: true }),
          fact(`${pName(b)} (city councilor): Mild paper cut — press aide demanding "skip the line right now!"`, b, { tag: 'mot', medical: false }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Bedside Triage', wingIndex: 1, label: 'Quiet Real Emergencies',
        shown: [
          fact(`${pName(c)} (uninsured bus driver): Silent internal bleed — blood pressure crashing fast!`, c, { tag: 'mot', medical: true }),
          fact(`${pName(d)} (night janitor): Swelling throat from wasp sting — oxygen dropping!`, d, { tag: 'mot', medical: true }),
        ],
        alt: [
          fact(`${pName(c)} (uninsured bus driver): Mild wrist sprain — vitals completely normal.`, c, { tag: 'mot', medical: false }),
          fact(`${pName(d)} (night janitor): Swelling throat from wasp sting — oxygen dropping!`, d, { tag: 'mot', medical: true }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'VIP Calls', wingIndex: 0, label: 'Other Bays',
        shown: [
          fact(`${pName(e)} (TV anchor): Mild headache — manager threatening bad news coverage unless seen first.`, e, { tag: 'mot', medical: false }),
          fact(`${pName(f)}: Sprained thumb — waiting patiently.`, f, { tag: 'mot', medical: false }),
        ],
        alt: [
          fact(`${pName(e)} (TV anchor): Crushing chest pain + sweating — heart attack warning!`, e, { tag: 'mot', medical: true }),
          fact(`${pName(f)}: Sprained thumb — waiting patiently.`, f, { tag: 'mot', medical: false }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Doctor Oath', wingIndex: 1, label: 'See Through Outside Pressure',
        shown: [
          fact(`Powerful callers push to jump the line for political or PR motives, not medical danger.`, [], { tag: 'note' }),
          fact(`Treat ONLY patients with genuine life-threatening medical emergencies!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Powerful callers push to jump the line for political or PR motives, not medical danger.`, [], { tag: 'note' }),
          fact(`Treat ONLY patients with genuine life-threatening medical emergencies!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Doctor Oath', wingIndex: 1, label: 'Judge Only the Body',
        shown: [
          fact(`A VIP CAN still have a real emergency — check their actual symptoms, not their title or phone calls!`, [], { tag: 'note' }),
          fact(`Ignore PR threats and donor pressure.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`A VIP CAN still have a real emergency — check their actual symptoms, not their title or phone calls!`, [], { tag: 'note' }),
          fact(`Ignore PR threats and donor pressure.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Doctor Oath', wingIndex: 0, label: 'Triage Integrity',
        shown: [
          fact(`Select ONLY the genuine life-threatening emergencies right now.`, [], { tag: 'note' }),
          fact(`Refuse political line-skipping for minor injuries.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Select ONLY the genuine life-threatening emergencies right now.`, [], { tag: 'note' }),
          fact(`Refuse political line-skipping for minor injuries.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Resisting VIP Line-Skipping Pressure',
      dispatch: 'Hospital donors and press aides are phoning to jump the line — separate outside pressure from real medical danger.',
      order: 'Ignore political and VIP pressure — treat ONLY patients with genuine life-threatening medical emergencies.',
      hint: 'Check the actual medical symptoms on each card, ignoring donor/VIP threats.',
      cards,
      evaluate(activeCards) {
        const list = collectFactsByTag(activeCards, 'mot');
        const targets = uniqueSortedIds(list.filter((x) => x.medical).map((x) => x.patients[0]));
        const vipNoise = list.filter((x) => !x.medical).map((x) => x.patients[0]);
        return {
          targets,
          proof: `${formatList(targets)} have real life-threatening medical emergencies, whereas the other urgent calls are minor injuries pushed by VIP pressure.`,
          rival: buildRivalInfo(targets, vipNoise, (id) => `${pName(id)} only has a minor injury despite loud outside pressure.`),
        };
      },
    };
  },

  // #65 Moral reasoning (Before · Composite)
  'moral-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Trauma Bay', wingIndex: 0, label: 'Critical Patients 1 & 2',
        shown: [
          fact(`${pName(a)}: CRITICAL bleeding · arrived unconscious and ALONE (no advocate).`, a, { tag: 'mor', crit: true, alone: true }),
          fact(`${pName(b)}: CRITICAL bleeding · has 2 private nurses + family already holding pressure.`, b, { tag: 'mor', crit: true, alone: false }),
        ],
        alt: [
          fact(`${pName(a)}: CRITICAL bleeding · has 2 private nurses + family already holding pressure.`, a, { tag: 'mor', crit: true, alone: false }),
          fact(`${pName(b)}: CRITICAL bleeding · arrived unconscious and ALONE (no advocate).`, b, { tag: 'mor', crit: true, alone: true }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Trauma Bay', wingIndex: 0, label: 'Critical Patients 3 & 4',
        shown: [
          fact(`${pName(c)}: CRITICAL low oxygen · arrived unconscious and ALONE (nobody watching them).`, c, { tag: 'mor', crit: true, alone: true }),
          fact(`${pName(d)}: Stable sprained shoulder · arrived alone.`, d, { tag: 'mor', crit: false, alone: true }),
        ],
        alt: [
          fact(`${pName(c)}: Stable sprained shoulder · arrived alone.`, c, { tag: 'mor', crit: false, alone: true }),
          fact(`${pName(d)}: CRITICAL low oxygen · arrived unconscious and ALONE (nobody watching them).`, d, { tag: 'mor', crit: true, alone: true }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Trauma Bay', wingIndex: 0, label: 'Other Bays',
        shown: [
          fact(`${pName(e)}: CRITICAL leg injury · has a medic + family advocate right at bedside.`, e, { tag: 'mor', crit: true, alone: false }),
          fact(`${pName(f)}: Mild cut · talking with partner.`, f, { tag: 'mor', crit: false, alone: false }),
        ],
        alt: [
          fact(`${pName(e)}: CRITICAL leg injury · arrived unconscious and ALONE (no advocate).`, e, { tag: 'mor', crit: true, alone: true }),
          fact(`${pName(f)}: Mild cut · talking with partner.`, f, { tag: 'mor', crit: false, alone: false }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Duty of Care', wingIndex: 1, label: 'Protect the Voiceless',
        shown: [
          fact(`Patients with loud family and bedside helpers already have eyes on them.`, [], { tag: 'note' }),
          fact(`Critical patients who are unconscious and ALONE have nobody to speak up if they crash!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Patients with loud family and bedside helpers already have eyes on them.`, [], { tag: 'note' }),
          fact(`Critical patients who are unconscious and ALONE have nobody to speak up if they crash!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Duty of Care', wingIndex: 1, label: 'Fair Protection',
        shown: [
          fact(`Do not skip stable alone patients into trauma beds, and do not leave critical alone patients unguarded.`, [], { tag: 'note' }),
          fact(`Both conditions required: CRITICAL + Unconscious & ALONE.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Do not skip stable alone patients into trauma beds, and do not leave critical alone patients unguarded.`, [], { tag: 'note' }),
          fact(`Both conditions required: CRITICAL + Unconscious & ALONE.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Duty of Care', wingIndex: 1, label: 'Step In Now',
        shown: [
          fact(`Assign yourself personally to every CRITICAL patient who arrived unconscious and ALONE.`, [], { tag: 'note' }),
          fact(`Select them right now.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Assign yourself personally to every CRITICAL patient who arrived unconscious and ALONE.`, [], { tag: 'note' }),
          fact(`Select them right now.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Protecting Unaccompanied Critical Patients',
      dispatch: 'Several patients are critical, but some arrived unconscious with nobody to speak up for them.',
      order: 'Step in personally for every CRITICAL patient who arrived unconscious and ALONE without an advocate.',
      hint: 'Find patients who are BOTH Critical AND Unconscious/Alone.',
      cards,
      evaluate(activeCards) {
        const list = collectFactsByTag(activeCards, 'mor');
        const targets = uniqueSortedIds(list.filter((x) => x.crit && x.alone).map((x) => x.patients[0]));
        const others = list.filter((x) => !(x.crit && x.alone)).map((x) => x.patients[0]);
        return {
          targets,
          proof: `${formatList(targets)} are BOTH critical AND unconscious/alone with no one to advocate for them.`,
          rival: buildRivalInfo(targets, others, (id) => `${pName(id)} is either stable or already has bedside support watching them.`),
        };
      },
    };
  },

  // #66 Ethical reasoning (After · Composite)
  'ethical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Code Alarms', wingIndex: 0, label: 'Heart-Stopped Bays',
        shown: [
          fact(`${pName(a)}: Heart just stopped — wants full rescue!`, a, { tag: 'arrest' }),
          fact(`${pName(b)}: Heart just stopped — emergency alarm ringing!`, b, { tag: 'arrest' }),
        ],
        alt: [
          fact(`${pName(a)}: Heart beating normally (stable).`, a, { tag: 'stable' }),
          fact(`${pName(b)}: Heart just stopped — emergency alarm ringing!`, b, { tag: 'arrest' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Code Alarms', wingIndex: 0, label: 'More Code Alarms',
        shown: [
          fact(`${pName(c)}: Heart just stopped — emergency alarm ringing!`, c, { tag: 'arrest' }),
          fact(`${pName(d)}: Heart beating steadily — recovering well.`, d, { tag: 'stable' }),
        ],
        alt: [
          fact(`${pName(c)}: Heart just stopped — emergency alarm ringing!`, c, { tag: 'arrest' }),
          fact(`${pName(d)}: Heart just stopped — emergency alarm ringing!`, d, { tag: 'arrest' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Legal Charts', wingIndex: 1, label: 'Signed Living Wills (DNR)',
        shown: [
          fact(`${pName(b)} has a valid, doctor-signed DNR ("Do Not Resuscitate") living will on file.`, b, { tag: 'dnr' }),
          fact(`${pName(e)} also has a signed DNR, and ${pName(f)} is stable.`, [e, f], { tag: 'dnr' }),
        ],
        alt: [
          fact(`${pName(c)} has a valid, doctor-signed DNR ("Do Not Resuscitate") living will on file.`, c, { tag: 'dnr' }),
          fact(`${pName(e)} also has a signed DNR, and ${pName(f)} is stable.`, [e, f], { tag: 'dnr' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Medical Law', wingIndex: 1, label: 'Honoring Patient Wishes',
        shown: [
          fact(`A valid signed DNR legally and ethically forbids electric shock or CPR.`, [], { tag: 'note' }),
          fact(`Saving lives matters deeply — AND honoring a patient's clear living will is a sacred duty.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`A valid signed DNR legally and ethically forbids electric shock or CPR.`, [], { tag: 'note' }),
          fact(`Saving lives matters deeply — AND honoring a patient's clear living will is a sacred duty.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Medical Law', wingIndex: 1, label: 'Check Before Shocking',
        shown: [
          fact(`Shock/resuscitate every heart-stopped patient EXCEPT anyone with a signed DNR.`, [], { tag: 'note' }),
          fact(`Provide peaceful comfort care instead for DNR patients.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Shock/resuscitate every heart-stopped patient EXCEPT anyone with a signed DNR.`, [], { tag: 'note' }),
          fact(`Provide peaceful comfort care instead for DNR patients.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Code Alarms', wingIndex: 0, label: 'Defibrillator Team',
        shown: [
          fact(`Run full resuscitation ONLY for heart-stopped patients with NO DNR order.`, [], { tag: 'note' }),
          fact(`Make the right ethical call.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Run full resuscitation ONLY for heart-stopped patients with NO DNR order.`, [], { tag: 'note' }),
          fact(`Make the right ethical call.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Code Blue vs. Signed Living Will (DNR)',
      dispatch: 'Multiple heart alarms are ringing — balance saving lives with legally honoring signed Do-Not-Resuscitate wishes.',
      order: 'Run full CPR/defibrillation ONLY on heart-stopped patients who do NOT have a signed DNR living will.',
      hint: 'Find every patient whose heart stopped, then exclude anyone listed under Signed Living Wills (DNR).',
      cards,
      evaluate(activeCards) {
        const arrest = collectByTag(activeCards, 'arrest');
        const dnr = new Set(collectByTag(activeCards, 'dnr'));
        const targets = uniqueSortedIds(arrest.filter((id) => !dnr.has(id)));
        const dnrArrest = arrest.filter((id) => dnr.has(id));
        return {
          targets,
          proof: `${formatList(targets)} are in cardiac arrest with NO DNR order, while ${formatList(dnrArrest)} has a valid signed DNR that must be respected.`,
          rival: buildRivalInfo(targets, [...dnrArrest, ...collectByTag(activeCards, 'stable')], (id) =>
            dnr.has(id) ? `${pName(id)} has a valid signed DNR order forbidding resuscitation.` : `${pName(id)}'s heart is beating normally.`
          ),
        };
      },
    };
  },

  // #67 Pragmatic reasoning (Before · Atomic)
  'pragmatic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Equipment Status', wingIndex: 0, label: 'What Works Right Now',
        shown: [
          fact(`WORKING now: Blood Transfusion Station + Chest Drain Cart.`, [], { tag: 'works', list: ['blood', 'chest'] }),
          fact(`BROKEN / OFFLINE until tomorrow: MRI Scanner + Dialysis Machine.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`WORKING now: Dialysis Machine + Chest Drain Cart.`, [], { tag: 'works', list: ['dialysis', 'chest'] }),
          fact(`BROKEN / OFFLINE until tomorrow: MRI Scanner + Blood Transfusion Station.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Ambulance Bay', wingIndex: 1, label: 'Incoming Patients 1 & 2',
        shown: [
          fact(`${pName(a)}: Needs Blood Transfusion Station.`, a, { tag: 'need', tool: 'blood' }),
          fact(`${pName(b)}: Needs MRI Scanner (cannot be treated without it).`, b, { tag: 'need', tool: 'mri' }),
        ],
        alt: [
          fact(`${pName(a)}: Needs MRI Scanner (cannot be treated without it).`, a, { tag: 'need', tool: 'mri' }),
          fact(`${pName(b)}: Needs Blood Transfusion Station.`, b, { tag: 'need', tool: 'blood' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Ambulance Bay', wingIndex: 1, label: 'Incoming Patients 3 & 4',
        shown: [
          fact(`${pName(c)}: Needs Chest Drain Cart.`, c, { tag: 'need', tool: 'chest' }),
          fact(`${pName(d)}: Needs Dialysis Machine.`, d, { tag: 'need', tool: 'dialysis' }),
        ],
        alt: [
          fact(`${pName(c)}: Needs MRI Scanner.`, c, { tag: 'need', tool: 'mri' }),
          fact(`${pName(d)}: Needs Dialysis Machine.`, d, { tag: 'need', tool: 'dialysis' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Ambulance Bay', wingIndex: 1, label: 'Incoming Patients 5 & 6',
        shown: [
          fact(`${pName(e)}: Needs MRI Scanner.`, e, { tag: 'need', tool: 'mri' }),
          fact(`${pName(f)}: Needs Dialysis Machine.`, f, { tag: 'need', tool: 'dialysis' }),
        ],
        alt: [
          fact(`${pName(e)}: Needs Chest Drain Cart.`, e, { tag: 'need', tool: 'chest' }),
          fact(`${pName(f)}: Needs MRI Scanner.`, f, { tag: 'need', tool: 'mri' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Equipment Status', wingIndex: 0, label: 'Divert What You Cannot Treat',
        shown: [
          fact(`If a patient needs a broken machine, the ambulance MUST drive 5 minutes to County Hospital instead!`, [], { tag: 'note' }),
          fact(`Admit HERE only patients whose needed equipment is WORKING right now.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`If a patient needs a broken machine, the ambulance MUST drive 5 minutes to County Hospital instead!`, [], { tag: 'note' }),
          fact(`Admit HERE only patients whose needed equipment is WORKING right now.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Equipment Status', wingIndex: 0, label: 'Ambulance Gate Call',
        shown: [
          fact(`Check the WORKING equipment list first, then admit ONLY matching patients.`, [], { tag: 'note' }),
          fact(`Send broken-machine cases to County Hospital.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Check the WORKING equipment list first, then admit ONLY matching patients.`, [], { tag: 'note' }),
          fact(`Send broken-machine cases to County Hospital.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Admit What You Can Actually Treat',
      dispatch: 'Half your hospital machines are offline after a storm — only accept ambulances you have working gear to treat!',
      order: 'Admit to YOUR hospital ONLY patients whose needed machine is currently WORKING (divert broken-machine cases).',
      hint: 'Read "What Works Right Now" first, then select every patient needing one of those working stations.',
      cards,
      evaluate(activeCards) {
        const working = new Set(collectFactsByTag(activeCards, 'works')[0]?.list || []);
        const needs = collectFactsByTag(activeCards, 'need');
        const targets = uniqueSortedIds(needs.filter((x) => working.has(x.tool)).map((x) => x.patients[0]));
        const divert = needs.filter((x) => !working.has(x.tool)).map((x) => x.patients[0]);
        return {
          targets,
          proof: `Your hospital has working gear right now for ${formatList(targets)}; the others need offline machines and must divert.`,
          rival: buildRivalInfo(targets, divert, (id) => `${pName(id)} needs a machine that is broken/offline right now.`),
        };
      },
    };
  },

  // #68 Contextual reasoning (Before · Atomic)
  'contextual-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Heart Monitor', wingIndex: 0, label: 'Same Number, Different Story',
        shown: [
          fact(`${pName(a)}: Heart rate 135 BPM — just sprinted up 4 flights of stairs (healthy runner, smiling).`, a, { tag: 'ctx', danger: false }),
          fact(`${pName(b)}: Heart rate 135 BPM — lying completely still after a car crash (pale & cold).`, b, { tag: 'ctx', danger: true }),
        ],
        alt: [
          fact(`${pName(a)}: Heart rate 135 BPM — lying completely still after a car crash (pale & cold).`, a, { tag: 'ctx', danger: true }),
          fact(`${pName(b)}: Heart rate 135 BPM — just sprinted up 4 flights of stairs (healthy runner, smiling).`, b, { tag: 'ctx', danger: false }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Heart Monitor', wingIndex: 0, label: 'More 135 BPM Cases',
        shown: [
          fact(`${pName(c)}: Heart rate 135 BPM — 78-year-old resting quietly in bed after hip fall (dizzy).`, c, { tag: 'ctx', danger: true }),
          fact(`${pName(d)}: Heart rate 135 BPM — scared 19-year-old who just drank 3 energy drinks (pink & alert).`, d, { tag: 'ctx', danger: false }),
        ],
        alt: [
          fact(`${pName(c)}: Heart rate 135 BPM — scared 19-year-old who just drank 3 energy drinks (pink & alert).`, c, { tag: 'ctx', danger: false }),
          fact(`${pName(d)}: Heart rate 135 BPM — 78-year-old resting quietly in bed after hip fall (dizzy).`, d, { tag: 'ctx', danger: true }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Heart Monitor', wingIndex: 0, label: 'Quiet Resting Cases',
        shown: [
          fact(`${pName(e)}: Heart rate 135 BPM — just ran a 5K race outside (catching breath, feels great).`, e, { tag: 'ctx', danger: false }),
          fact(`${pName(f)}: Heart rate 76 BPM — resting comfortably after minor wrist wrap.`, f, { tag: 'ctx', danger: false }),
        ],
        alt: [
          fact(`${pName(e)}: Heart rate 135 BPM — lying completely still after balcony fall (cold sweat).`, e, { tag: 'ctx', danger: true }),
          fact(`${pName(f)}: Heart rate 76 BPM — resting comfortably after minor wrist wrap.`, f, { tag: 'ctx', danger: false }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Doctor Rule', wingIndex: 1, label: 'Context Changes Meaning',
        shown: [
          fact(`A heart rate of 135 BPM is NORMAL right after running or caffeine...`, [], { tag: 'note' }),
          fact(`...but 135 BPM while LYING STILL after trauma means hidden internal bleeding!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`A heart rate of 135 BPM is NORMAL right after running or caffeine...`, [], { tag: 'note' }),
          fact(`...but 135 BPM while LYING STILL after trauma means hidden internal bleeding!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Doctor Rule', wingIndex: 1, label: 'Never Read Numbers Blindly',
        shown: [
          fact(`Always check WHAT the patient was doing before reacting to the monitor beep.`, [], { tag: 'note' }),
          fact(`Rush internal-bleed scans ONLY for resting trauma victims with 135 BPM.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Always check WHAT the patient was doing before reacting to the monitor beep.`, [], { tag: 'note' }),
          fact(`Rush internal-bleed scans ONLY for resting trauma victims with 135 BPM.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Doctor Rule', wingIndex: 1, label: 'Fast Bleed Check',
        shown: [
          fact(`Select ONLY patients whose 135 BPM signals hidden shock (lying still after injury/fall).`, [], { tag: 'note' }),
          fact(`Let runners and caffeine jitters catch their breath.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Select ONLY patients whose 135 BPM signals hidden shock (lying still after injury/fall).`, [], { tag: 'note' }),
          fact(`Let runners and caffeine jitters catch their breath.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Same Heart Rate, Very Different Danger',
      dispatch: 'Five monitors are all beeping at 135 BPM — read each patient\'s situation to see who is truly in shock.',
      order: 'Rush emergency bleed scans ONLY for patients whose 135 BPM is happening while resting after trauma or a fall.',
      hint: 'Skip runners and energy-drink jitters; pick every patient with 135 BPM while lying still after a crash or fall.',
      cards,
      evaluate(activeCards) {
        const list = collectFactsByTag(activeCards, 'ctx');
        const targets = uniqueSortedIds(list.filter((x) => x.danger).map((x) => x.patients[0]));
        const benign = list.filter((x) => !x.danger).map((x) => x.patients[0]);
        return {
          targets,
          proof: `In ${formatList(targets)}, a 135 BPM heart rate while lying still after trauma signals hidden internal bleeding.`,
          rival: buildRivalInfo(targets, benign, (id) => `${pName(id)}'s fast heart rate is easily explained by running, caffeine, or normal rest.`),
        };
      },
    };
  },

  // #69 Narrative reasoning (After · Composite)
  'narrative-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Chapter 1 · Arrival', wingIndex: 0, label: 'Ambulance Intake',
        shown: [
          fact(`Arrival recorded: ${pName(a)}, ${pName(b)}, and ${pName(c)} signed in at 01:00.`, [a, b, c], { tag: 'ch1', list: [a, b, c] }),
          fact(`${pName(d)} walked in unrecorded — missing arrival chapter.`, d, { tag: 'note' }),
        ],
        alt: [
          fact(`Arrival recorded: ${pName(b)}, ${pName(c)}, and ${pName(d)} signed in at 01:00.`, [b, c, d], { tag: 'ch1', list: [b, c, d] }),
          fact(`${pName(a)} walked in unrecorded — missing arrival chapter.`, a, { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '03:00', wing: 'Chapter 2 · Surgery', wingIndex: 0, label: 'Treatment Notes',
        shown: [
          fact(`Treatment recorded: ${pName(a)}, ${pName(b)}, and ${pName(d)} have full surgery logs.`, [a, b, d], { tag: 'ch2', list: [a, b, d] }),
          fact(`${pName(c)}'s treatment page is blank — missing middle chapter!`, c, { tag: 'note' }),
        ],
        alt: [
          fact(`Treatment recorded: ${pName(b)}, ${pName(c)}, and ${pName(e)} have full surgery logs.`, [b, c, e], { tag: 'ch2', list: [b, c, e] }),
          fact(`${pName(d)}'s treatment page is blank — missing middle chapter!`, d, { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 2, time: '06:00', wing: 'Chapter 3 · Outcome', wingIndex: 1, label: 'Closing Summary',
        shown: [
          fact(`Final outcome signed: ${pName(a)}, ${pName(c)}, and ${pName(e)} have closing discharge/coroner sign-offs.`, [a, c, e], { tag: 'ch3', list: [a, c, e] }),
          fact(`${pName(b)} and ${pName(f)} still lack a closing outcome note.`, [b, f], { tag: 'note' }),
        ],
        alt: [
          fact(`Final outcome signed: ${pName(b)}, ${pName(d)}, and ${pName(f)} have closing discharge/coroner sign-offs.`, [b, d, f], { tag: 'ch3', list: [b, d, f] }),
          fact(`${pName(c)} and ${pName(e)} still lack a closing outcome note.`, [c, e], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 3, time: '06:00', wing: 'Coroner / Family Desk', wingIndex: 1, label: 'Complete Story Required',
        shown: [
          fact(`Before speaking to a family or releasing a medical report, the timeline must have zero holes:`, [], { tag: 'note' }),
          fact(`1) Arrival  →  2) Treatment  →  3) Final Outcome.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Before speaking to a family or releasing a medical report, the timeline must have zero holes:`, [], { tag: 'note' }),
          fact(`1) Arrival  →  2) Treatment  →  3) Final Outcome.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '06:00', wing: 'Coroner / Family Desk', wingIndex: 1, label: 'No Half-Stories',
        shown: [
          fact(`Files missing their beginning, middle, or ending must be held for review.`, [], { tag: 'note' }),
          fact(`Sign and release ONLY files with a complete 3-chapter story.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Files missing their beginning, middle, or ending must be held for review.`, [], { tag: 'note' }),
          fact(`Sign and release ONLY files with a complete 3-chapter story.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Coroner / Family Desk', wingIndex: 0, label: 'Ready to Release',
        shown: [
          fact(`Find every patient who appears in ALL THREE chapters (Arrival + Treatment + Outcome).`, [], { tag: 'note' }),
          fact(`Approve those complete files now.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Find every patient who appears in ALL THREE chapters (Arrival + Treatment + Outcome).`, [], { tag: 'note' }),
          fact(`Approve those complete files now.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Complete Medical Timeline Audit',
      dispatch: 'Families and coroners deserve a complete, unbroken story from arrival through final outcome.',
      order: 'Approve for release ONLY patient files that have ALL THREE chapters documented (Arrival + Treatment + Outcome).',
      hint: 'Find who is recorded in Chapter 1 (Arrival), Chapter 2 (Treatment), AND Chapter 3 (Outcome).',
      cards,
      evaluate(activeCards) {
        const c1 = new Set(collectFactsByTag(activeCards, 'ch1')[0]?.list || []);
        const c2 = new Set(collectFactsByTag(activeCards, 'ch2')[0]?.list || []);
        const c3 = new Set(collectFactsByTag(activeCards, 'ch3')[0]?.list || []);
        const targets = uniqueSortedIds([...c1].filter((id) => c2.has(id) && c3.has(id)));
        const incomplete = [...c1, ...c2, ...c3].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `${formatList(targets)} has a complete, unbroken record across Arrival, Treatment, and Final Outcome.`,
          rival: buildRivalInfo(targets, incomplete, (id) => `${pName(id)}'s chart is missing at least one chapter of their story.`),
        };
      },
    };
  },

  // #70 Perspectival reasoning (After · Composite)
  'perspectival-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Quick Chart Note', wingIndex: 0, label: 'Rushed Intake Notes',
        shown: [
          fact(`Quick chart wrote: "${pName(a)} is stubborn and refuses to answer questions."`, a, { tag: 'note' }),
          fact(`Quick chart wrote: "${pName(b)} is combative and refuses the CT tunnel."`, b, { tag: 'note' }),
        ],
        alt: [
          fact(`Quick chart wrote: "${pName(a)} is polite and resting quietly."`, a, { tag: 'note' }),
          fact(`Quick chart wrote: "${pName(b)} is combative and refuses the CT tunnel."`, b, { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Patient\'s Viewpoint', wingIndex: 1, label: 'Nurse\'s Closer Look 1',
        shown: [
          fact(`Truth about ${pName(a)}: Deaf without hearing aids — could not hear a single word (needs sign/pad!).`, a, { tag: 'barrier', hidden: true }),
          fact(`Truth about ${pName(b)}: Severe claustrophobia — panicked inside tight scanner (needs open scan!).`, b, { tag: 'barrier', hidden: true }),
        ],
        alt: [
          fact(`Truth about ${pName(a)}: No barrier — just waiting for x-ray.`, a, { tag: 'barrier', hidden: false }),
          fact(`Truth about ${pName(b)}: Severe claustrophobia — panicked inside tight scanner (needs open scan!).`, b, { tag: 'barrier', hidden: true }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Patient\'s Viewpoint', wingIndex: 1, label: 'Nurse\'s Closer Look 2',
        shown: [
          fact(`Truth about ${pName(c)}: Understands everything clearly, just politely declined extra blankets.`, c, { tag: 'barrier', hidden: false }),
          fact(`Truth about ${pName(d)}: Speaks only Mandarin — thought nurses were refusing care (needs interpreter!).`, d, { tag: 'barrier', hidden: true }),
        ],
        alt: [
          fact(`Truth about ${pName(c)}: Blind without glasses — signed wrong form by mistake (needs audio reader!).`, c, { tag: 'barrier', hidden: true }),
          fact(`Truth about ${pName(d)}: Speaks English fluently and already gave full consent.`, d, { tag: 'barrier', hidden: false }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Patient\'s Viewpoint', wingIndex: 1, label: 'Other Bays',
        shown: [
          fact(`Truth about ${pName(e)}: Calm, fully understands the care plan.`, e, { tag: 'barrier', hidden: false }),
          fact(`Truth about ${pName(f)}: Calm, already resting with family.`, f, { tag: 'barrier', hidden: false }),
        ],
        alt: [
          fact(`Truth about ${pName(e)}: Calm, fully understands the care plan.`, e, { tag: 'barrier', hidden: false }),
          fact(`Truth about ${pName(f)}: Calm, already resting with family.`, f, { tag: 'barrier', hidden: false }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Care Advocacy', wingIndex: 0, label: 'See Through Their Eyes',
        shown: [
          fact(`"Difficult" patients are often scared, unable to hear, or unable to understand the language!`, [], { tag: 'note' }),
          fact(`Send accommodation support (interpreter / notepad / open scan) to every misunderstood patient.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`"Difficult" patients are often scared, unable to hear, or unable to understand the language!`, [], { tag: 'note' }),
          fact(`Send accommodation support (interpreter / notepad / open scan) to every misunderstood patient.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Care Advocacy', wingIndex: 0, label: 'Fix the Barrier',
        shown: [
          fact(`Look past rushed labels and read the Nurse's Closer Look cards.`, [], { tag: 'note' }),
          fact(`Select every patient who needs a communication or accessibility fix.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Look past rushed labels and read the Nurse's Closer Look cards.`, [], { tag: 'note' }),
          fact(`Select every patient who needs a communication or accessibility fix.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Seeing Past "Uncooperative" Labels',
      dispatch: 'Rushed charts labeled patients "stubborn" — look from the patient\'s perspective to spot hidden barriers.',
      order: 'Send accessibility/interpreter help to EVERY patient who actually has a hidden hearing, vision, language, or claustrophobia barrier.',
      hint: 'Read the "Nurse\'s Closer Look" cards and pick every patient who needs an interpreter, notepad, reader, or open scan.',
      cards,
      evaluate(activeCards) {
        const list = collectFactsByTag(activeCards, 'barrier');
        const targets = uniqueSortedIds(list.filter((x) => x.hidden).map((x) => x.patients[0]));
        const ok = list.filter((x) => !x.hidden).map((x) => x.patients[0]);
        return {
          targets,
          proof: `${formatList(targets)} were mislabeled as difficult when they actually face a hidden communication or sensory barrier.`,
          rival: buildRivalInfo(targets, ok, (id) => `${pName(id)} has no hidden communication or accessibility barrier.`),
        };
      },
    };
  },

  // =========================================================================
  // FAMILY 8: METACOGNITIVE & EPISTEMOLOGICAL REASONING (#71–#80)
  // =========================================================================

  // #71 Metacognitive reasoning (Inside · Meta)
  'metacognitive-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Command Mode', wingIndex: 0, label: 'Active Shift Rule',
        shown: [
          fact(`CURRENT SHIFT MODE: MASS CASUALTY SURGE!`, [], { tag: 'mode', surge: true }),
          fact(`Surge Rule: Save ONLY fast fixes (≤ 2 min) first. Normal Rule (Danger ≥ 8) is PAUSED!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`CURRENT SHIFT MODE: NORMAL CALM SHIFT (plenty of staff)!`, [], { tag: 'mode', surge: false }),
          fact(`Normal Rule: Save ONLY highest danger (Danger ≥ 8). Fast-fix Surge Rule is OFF!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Trauma Bays', wingIndex: 1, label: 'Bays 1 & 2',
        shown: [
          fact(`${pName(a)}: Quick 2-minute airway fix · Danger 6.`, a, { tag: 'pt', fast: true, high: false }),
          fact(`${pName(b)}: Complex 25-minute surgery · Danger 9.`, b, { tag: 'pt', fast: false, high: true }),
        ],
        alt: [
          fact(`${pName(a)}: Complex 25-minute surgery · Danger 9.`, a, { tag: 'pt', fast: false, high: true }),
          fact(`${pName(b)}: Quick 2-minute airway fix · Danger 6.`, b, { tag: 'pt', fast: true, high: false }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Trauma Bays', wingIndex: 1, label: 'Bays 3 & 4',
        shown: [
          fact(`${pName(c)}: Quick 1-minute tourniquet fix · Danger 7.`, c, { tag: 'pt', fast: true, high: false }),
          fact(`${pName(d)}: Complex 30-minute surgery · Danger 8.`, d, { tag: 'pt', fast: false, high: true }),
        ],
        alt: [
          fact(`${pName(c)}: Complex 30-minute surgery · Danger 8.`, c, { tag: 'pt', fast: false, high: true }),
          fact(`${pName(d)}: Quick 1-minute tourniquet fix · Danger 7.`, d, { tag: 'pt', fast: true, high: false }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Trauma Bays', wingIndex: 1, label: 'Bays 5 & 6',
        shown: [
          fact(`${pName(e)}: Slow 15-minute stitches · Danger 3.`, e, { tag: 'pt', fast: false, high: false }),
          fact(`${pName(f)}: Slow 20-minute cast · Danger 2.`, f, { tag: 'pt', fast: false, high: false }),
        ],
        alt: [
          fact(`${pName(e)}: Slow 15-minute stitches · Danger 3.`, e, { tag: 'pt', fast: false, high: false }),
          fact(`${pName(f)}: Slow 20-minute cast · Danger 2.`, f, { tag: 'pt', fast: false, high: false }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Command Mode', wingIndex: 0, label: 'Pick Your Rule FIRST',
        shown: [
          fact(`Pause for 1 second: check WHICH triage rule is active before picking patients!`, [], { tag: 'note' }),
          fact(`Using Normal habits during a Surge (or Surge habits on a Normal shift) picks the wrong bays.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Pause for 1 second: check WHICH triage rule is active before picking patients!`, [], { tag: 'note' }),
          fact(`Using Normal habits during a Surge (or Surge habits on a Normal shift) picks the wrong bays.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Command Mode', wingIndex: 0, label: 'Execute Active Rule',
        shown: [
          fact(`If MASS CASUALTY SURGE → pick ≤ 2-minute fast fixes. If NORMAL SHIFT → pick Danger ≥ 8.`, [], { tag: 'note' }),
          fact(`Apply the right rule now.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`If MASS CASUALTY SURGE → pick ≤ 2-minute fast fixes. If NORMAL SHIFT → pick Danger ≥ 8.`, [], { tag: 'note' }),
          fact(`Apply the right rule now.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Switching Your Decision Rule',
      dispatch: 'Stop and check the Active Shift Mode first — surge mode and normal mode use completely different triage rules!',
      order: 'Check Active Shift Mode: if MASS CASUALTY SURGE, pick ≤ 2-minute fast fixes; if NORMAL SHIFT, pick Danger ≥ 8.',
      hint: 'Read card 1 ("Active Shift Rule") first so you know whether to pick fast fixes or Danger ≥ 8.',
      cards,
      evaluate(activeCards) {
        const mode = collectFactsByTag(activeCards, 'mode')[0];
        if (!mode) return null;
        const pts = collectFactsByTag(activeCards, 'pt');
        const targets = uniqueSortedIds(pts.filter((x) => (mode.surge ? x.fast : x.high)).map((x) => x.patients[0]));
        const others = pts.filter((x) => !(mode.surge ? x.fast : x.high)).map((x) => x.patients[0]);
        return {
          targets,
          proof: mode.surge
            ? `MASS CASUALTY SURGE is active, so the fast-fix rule (≤ 2 min) selects ${formatList(targets)}.`
            : `NORMAL SHIFT is active, so the high-danger rule (Danger ≥ 8) selects ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, others, (id) =>
            mode.surge ? `${pName(id)} requires long surgery and does not fit the active Surge fast-fix rule.` : `${pName(id)} is below Danger 8 under the active Normal Shift rule.`
          ),
        };
      },
    };
  },

  // #72 Epistemic reasoning (Inside · Meta)
  'epistemic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Lab Audit', wingIndex: 0, label: 'Machine Failure Alert',
        shown: [
          fact(`WARNING: Lab Machine B is BROKEN — every "CRITICAL" alarm from Machine B is a false glitch!`, [], { tag: 'trust', good: 'A' }),
          fact(`Lab Machine A was just calibrated and is 100% VERIFIED trustworthy.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`WARNING: Lab Machine A is BROKEN — every "CRITICAL" alarm from Machine A is a false glitch!`, [], { tag: 'trust', good: 'B' }),
          fact(`Lab Machine B was just calibrated and is 100% VERIFIED trustworthy.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Lab Machine A', wingIndex: 1, label: 'Machine A Printout',
        shown: [
          fact(`Lab Machine A: ${pName(a)} has CRITICAL potassium overdose!`, a, { tag: 'lab', src: 'A', crit: true }),
          fact(`Lab Machine A: ${pName(b)} has CRITICAL potassium overdose!`, b, { tag: 'lab', src: 'A', crit: true }),
        ],
        alt: [
          fact(`Lab Machine A: ${pName(a)} has NORMAL potassium.`, a, { tag: 'lab', src: 'A', crit: false }),
          fact(`Lab Machine A: ${pName(b)} has CRITICAL potassium overdose!`, b, { tag: 'lab', src: 'A', crit: true }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Lab Machine B', wingIndex: 1, label: 'Machine B Printout',
        shown: [
          fact(`Lab Machine B: ${pName(c)} has CRITICAL potassium overdose!`, c, { tag: 'lab', src: 'B', crit: true }),
          fact(`Lab Machine B: ${pName(d)} has CRITICAL potassium overdose!`, d, { tag: 'lab', src: 'B', crit: true }),
        ],
        alt: [
          fact(`Lab Machine B: ${pName(c)} has CRITICAL potassium overdose!`, c, { tag: 'lab', src: 'B', crit: true }),
          fact(`Lab Machine B: ${pName(d)} has NORMAL potassium.`, d, { tag: 'lab', src: 'B', crit: false }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Lab Machine A', wingIndex: 1, label: 'Normal Samples',
        shown: [
          fact(`Lab Machine A: ${pName(e)} has NORMAL potassium.`, e, { tag: 'lab', src: 'A', crit: false }),
          fact(`Lab Machine B: ${pName(f)} has NORMAL potassium.`, f, { tag: 'lab', src: 'B', crit: false }),
        ],
        alt: [
          fact(`Lab Machine A: ${pName(e)} has CRITICAL potassium overdose!`, e, { tag: 'lab', src: 'A', crit: true }),
          fact(`Lab Machine B: ${pName(f)} has NORMAL potassium.`, f, { tag: 'lab', src: 'B', crit: false }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Lab Audit', wingIndex: 0, label: 'Question the Source',
        shown: [
          fact(`Giving potassium antidote to a healthy person can stop their heart!`, [], { tag: 'note' }),
          fact(`Trust ONLY critical results from the VERIFIED working machine.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Giving potassium antidote to a healthy person can stop their heart!`, [], { tag: 'note' }),
          fact(`Trust ONLY critical results from the VERIFIED working machine.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Lab Audit', wingIndex: 0, label: 'Safe Antidote Call',
        shown: [
          fact(`Throw out every printout from the broken machine.`, [], { tag: 'note' }),
          fact(`Treat ONLY verified-machine critical potassium results.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Throw out every printout from the broken machine.`, [], { tag: 'note' }),
          fact(`Treat ONLY verified-machine critical potassium results.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Broken Lab Machine Quarantine',
      dispatch: 'One of your two blood analyzers is printing fake critical alarms — verify the source before giving a risky antidote.',
      order: 'Give emergency potassium antidote ONLY for CRITICAL results printed by the VERIFIED working lab machine.',
      hint: 'Check "Machine Failure Alert" to see which machine (A or B) is trusted, then pick its CRITICAL patients.',
      cards,
      evaluate(activeCards) {
        const trust = collectFactsByTag(activeCards, 'trust')[0];
        if (!trust) return null;
        const labs = collectFactsByTag(activeCards, 'lab');
        const targets = uniqueSortedIds(labs.filter((x) => x.src === trust.good && x.crit).map((x) => x.patients[0]));
        const bad = labs.filter((x) => x.src !== trust.good && x.crit).map((x) => x.patients[0]);
        return {
          targets,
          proof: `Lab Machine ${trust.good} is verified accurate, confirming true potassium emergencies in ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, bad, (id) => `${pName(id)}'s alarm came from the broken machine and cannot be trusted.`),
        };
      },
    };
  },

  // #73 Reflective reasoning (After · Meta)
  'reflective-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'First Impression', wingIndex: 0, label: 'Loudest Distraction',
        shown: [
          fact(`${pName(a)} is covered in dramatic stage-like scalp blood — BUT blood pressure is 124/80 (strong) & oxygen 99%!`, a, { tag: 'ref', silentCrit: false }),
          fact(`${pName(b)} is shouting loudly from a sprained knee — blood pressure 122/78 & oxygen 99%!`, b, { tag: 'ref', silentCrit: false }),
        ],
        alt: [
          fact(`${pName(a)} is quiet and pale — blood pressure 68/40 (CRASHING!) & oxygen 84%!`, a, { tag: 'ref', silentCrit: true }),
          fact(`${pName(b)} is shouting loudly from a sprained knee — blood pressure 122/78 & oxygen 99%!`, b, { tag: 'ref', silentCrit: false }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Quiet Monitor Audit', wingIndex: 1, label: 'Bays 3 & 4 Vitals',
        shown: [
          fact(`${pName(c)} is completely quiet and not complaining — blood pressure 66/38 (CRASHING!) & oxygen 85%!`, c, { tag: 'ref', silentCrit: true }),
          fact(`${pName(d)} is quiet and drowsy — blood pressure 70/42 (CRASHING!) & oxygen 83%!`, d, { tag: 'ref', silentCrit: true }),
        ],
        alt: [
          fact(`${pName(c)} is resting peacefully — blood pressure 118/76 & oxygen 98%.`, c, { tag: 'ref', silentCrit: false }),
          fact(`${pName(d)} is quiet and drowsy — blood pressure 70/42 (CRASHING!) & oxygen 83%!`, d, { tag: 'ref', silentCrit: true }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Quiet Monitor Audit', wingIndex: 1, label: 'Bays 5 & 6 Vitals',
        shown: [
          fact(`${pName(e)} has a loud swollen lip — blood pressure 120/76 & oxygen 99%.`, e, { tag: 'ref', silentCrit: false }),
          fact(`${pName(f)} is chatting calmly — blood pressure 116/74 & oxygen 99%.`, f, { tag: 'ref', silentCrit: false }),
        ],
        alt: [
          fact(`${pName(e)} is unusually quiet and gray — blood pressure 64/36 (CRASHING!) & oxygen 82%!`, e, { tag: 'ref', silentCrit: true }),
          fact(`${pName(f)} is chatting calmly — blood pressure 116/74 & oxygen 99%.`, f, { tag: 'ref', silentCrit: false }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Bias Check', wingIndex: 0, label: 'Check Your Own Tunnel Vision',
        shown: [
          fact(`Scalp cuts bleed dramatically and shouting grabs your eyes — causing doctors to miss quiet crashers!`, [], { tag: 'note' }),
          fact(`Step back from noisy drama and check objective blood pressure & oxygen numbers.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Scalp cuts bleed dramatically and shouting grabs your eyes — causing doctors to miss quiet crashers!`, [], { tag: 'note' }),
          fact(`Step back from noisy drama and check objective blood pressure & oxygen numbers.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Bias Check', wingIndex: 0, label: 'Silent Crashers',
        shown: [
          fact(`Patients with crashing BP (< 80) and low oxygen (< 90%) are too weak to yell for help.`, [], { tag: 'note' }),
          fact(`Save the quiet patients whose vitals are crashing right now.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Patients with crashing BP (< 80) and low oxygen (< 90%) are too weak to yell for help.`, [], { tag: 'note' }),
          fact(`Save the quiet patients whose vitals are crashing right now.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Bias Check', wingIndex: 1, label: 'Objective Rescue',
        shown: [
          fact(`Ignore messy harmless cuts; treat ONLY the patients with crashing blood pressure & low oxygen.`, [], { tag: 'note' }),
          fact(`Check the numbers objectively.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Ignore messy harmless cuts; treat ONLY the patients with crashing blood pressure & low oxygen.`, [], { tag: 'note' }),
          fact(`Check the numbers objectively.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Checking Past Loud Distractions',
      dispatch: 'Dramatic scalp blood and shouting pull your eyes away from quiet patients silently going into shock.',
      order: 'Look past dramatic noise and rescue ONLY patients whose objective vitals are actually crashing (BP < 80, Oxygen < 90%).',
      hint: 'Check the actual blood pressure and oxygen numbers on each card, ignoring how loud or messy the patient looks.',
      cards,
      evaluate(activeCards) {
        const list = collectFactsByTag(activeCards, 'ref');
        const targets = uniqueSortedIds(list.filter((x) => x.silentCrit).map((x) => x.patients[0]));
        const noisy = list.filter((x) => !x.silentCrit).map((x) => x.patients[0]);
        return {
          targets,
          proof: `Checking objective vitals exposes ${formatList(targets)} silently crashing (BP < 80, Oxygen < 90%) while the loud cases have rock-solid vitals.`,
          rival: buildRivalInfo(targets, noisy, (id) => `${pName(id)} looks dramatic or loud, but has strong normal blood pressure and 99% oxygen.`),
        };
      },
    };
  },

  // #74 Critical reasoning (Inside · Meta)
  'critical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Intern Guesses', wingIndex: 0, label: 'Quick Dismissals',
        shown: [
          fact(`Intern brushed off ${pName(a)} as "just stress" — YET ECG shows heart-attack spike!`, a, { tag: 'crit', flawed: true }),
          fact(`Intern brushed off ${pName(b)} as "just stress" — AND heart test, oxygen, & scan are all 100% normal.`, b, { tag: 'crit', flawed: false }),
        ],
        alt: [
          fact(`Intern brushed off ${pName(a)} as "just stress" — AND heart test, oxygen, & scan are all 100% normal.`, a, { tag: 'crit', flawed: false }),
          fact(`Intern brushed off ${pName(b)} as "just stress" — YET ECG shows heart-attack spike!`, b, { tag: 'crit', flawed: true }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Intern Guesses', wingIndex: 0, label: 'More Dismissals',
        shown: [
          fact(`Intern brushed off ${pName(c)} as "just tired" — YET head CT scan shows brain bleed!`, c, { tag: 'crit', flawed: true }),
          fact(`Intern brushed off ${pName(d)} as "just tired" — AND head scan & balance test are 100% normal.`, d, { tag: 'crit', flawed: false }),
        ],
        alt: [
          fact(`Intern brushed off ${pName(c)} as "just tired" — AND head scan & balance test are 100% normal.`, c, { tag: 'crit', flawed: false }),
          fact(`Intern brushed off ${pName(d)} as "just tired" — YET head CT scan shows brain bleed!`, d, { tag: 'crit', flawed: true }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Intern Guesses', wingIndex: 0, label: 'Checked Bays',
        shown: [
          fact(`Intern cleared ${pName(e)} as "minor flu" — AND chest x-ray + blood labs are 100% normal.`, e, { tag: 'crit', flawed: false }),
          fact(`Intern cleared ${pName(f)} as "mild sprain" — AND x-ray confirms no break.`, f, { tag: 'crit', flawed: false }),
        ],
        alt: [
          fact(`Intern cleared ${pName(e)} as "minor flu" — YET chest x-ray shows collapsed lung!`, e, { tag: 'crit', flawed: true }),
          fact(`Intern cleared ${pName(f)} as "mild sprain" — AND x-ray confirms no break.`, f, { tag: 'crit', flawed: false }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Attending Audit', wingIndex: 1, label: 'Challenge Weak Assumptions',
        shown: [
          fact(`Never let a rushed "just stress / just tired" guess override hard test results!`, [], { tag: 'note' }),
          fact(`Stop discharge immediately whenever an objective scan or ECG contradicts the intern's guess.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Never let a rushed "just stress / just tired" guess override hard test results!`, [], { tag: 'note' }),
          fact(`Stop discharge immediately whenever an objective scan or ECG contradicts the intern's guess.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Attending Audit', wingIndex: 1, label: 'Hard Evidence Wins',
        shown: [
          fact(`Patients whose tests truly came back 100% normal are safe to go home.`, [], { tag: 'note' }),
          fact(`Pull back ONLY patients whose objective test contradicts the intern's dismissal.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Patients whose tests truly came back 100% normal are safe to go home.`, [], { tag: 'note' }),
          fact(`Pull back ONLY patients whose objective test contradicts the intern's dismissal.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Attending Audit', wingIndex: 1, label: 'Stop Wrong Discharge',
        shown: [
          fact(`Select every patient with an abnormal scan/ECG that disproves the intern's casual dismissal.`, [], { tag: 'note' }),
          fact(`Keep them in the trauma bay.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Select every patient with an abnormal scan/ECG that disproves the intern's casual dismissal.`, [], { tag: 'note' }),
          fact(`Keep them in the trauma bay.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Challenging Rushed "Just Stress" Guesses',
      dispatch: 'An exhausted intern is sending people home as "just stress" — challenge any guess contradicted by real test results.',
      order: 'Block discharge ONLY for patients whose objective scan or heart test contradicts the intern\'s casual dismissal.',
      hint: 'Find every patient where the intern said "just stress/tired/flu" YET a scan, x-ray, or ECG shows a real emergency.',
      cards,
      evaluate(activeCards) {
        const list = collectFactsByTag(activeCards, 'crit');
        const targets = uniqueSortedIds(list.filter((x) => x.flawed).map((x) => x.patients[0]));
        const safe = list.filter((x) => !x.flawed).map((x) => x.patients[0]);
        return {
          targets,
          proof: `Objective tests directly contradict the intern's rushed dismissal for ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, safe, (id) => `${pName(id)}'s objective tests actually confirmed they are normal and safe.`),
        };
      },
    };
  },

  // #75 Falsification-based reasoning (Inside · Meta)
  'falsification-based': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Ward Claim', wingIndex: 0, label: 'Comforting Claim to Test',
        shown: [
          fact(`A junior doctor claims: "Every patient with NORMAL blood pressure (≥ 110) is completely safe."`, [], { tag: 'note' }),
          fact(`Hunt for the COUNTEREXAMPLE — normal blood pressure (≥ 110) who is STILL in deadly danger!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`A junior doctor claims: "Every patient with NORMAL blood pressure (≥ 110) is completely safe."`, [], { tag: 'note' }),
          fact(`Hunt for the COUNTEREXAMPLE — normal blood pressure (≥ 110) who is STILL in deadly danger!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Bedside Audit', wingIndex: 1, label: 'Bays 1 & 2',
        shown: [
          fact(`${pName(a)}: Blood pressure 122/78 (NORMAL) · BUT oxygen is 79% (turning blue!).`, a, { tag: 'fal', normBp: true, danger: true }),
          fact(`${pName(b)}: Blood pressure 118/76 (NORMAL) · oxygen 99%, completely safe.`, b, { tag: 'fal', normBp: true, danger: false }),
        ],
        alt: [
          fact(`${pName(a)}: Blood pressure 122/78 (NORMAL) · oxygen 99%, completely safe.`, a, { tag: 'fal', normBp: true, danger: false }),
          fact(`${pName(b)}: Blood pressure 118/76 (NORMAL) · BUT oxygen is 79% (turning blue!).`, b, { tag: 'fal', normBp: true, danger: true }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Bedside Audit', wingIndex: 1, label: 'Bays 3 & 4',
        shown: [
          fact(`${pName(c)}: Blood pressure 82/50 (LOW) · active bleeding (already flagged as unsafe).`, c, { tag: 'fal', normBp: false, danger: true }),
          fact(`${pName(d)}: Blood pressure 126/82 (NORMAL) · BUT brain scan shows expanding clot!`, d, { tag: 'fal', normBp: true, danger: true }),
        ],
        alt: [
          fact(`${pName(c)}: Blood pressure 120/80 (NORMAL) · BUT brain scan shows expanding clot!`, c, { tag: 'fal', normBp: true, danger: true }),
          fact(`${pName(d)}: Blood pressure 126/82 (NORMAL) · oxygen 98%, completely safe.`, d, { tag: 'fal', normBp: true, danger: false }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Bedside Audit', wingIndex: 1, label: 'Bays 5 & 6',
        shown: [
          fact(`${pName(e)}: Blood pressure 78/48 (LOW) · already on emergency fluids.`, e, { tag: 'fal', normBp: false, danger: true }),
          fact(`${pName(f)}: Blood pressure 115/74 (NORMAL) · mild scrape, safe.`, f, { tag: 'fal', normBp: true, danger: false }),
        ],
        alt: [
          fact(`${pName(e)}: Blood pressure 78/48 (LOW) · already on emergency fluids.`, e, { tag: 'fal', normBp: false, danger: true }),
          fact(`${pName(f)}: Blood pressure 115/74 (NORMAL) · mild scrape, safe.`, f, { tag: 'fal', normBp: true, danger: false }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Ward Claim', wingIndex: 0, label: 'What Disproves the Rule?',
        shown: [
          fact(`Low-BP patients don't disprove the claim (the claim was only about NORMAL blood pressure).`, [], { tag: 'note' }),
          fact(`Find patients with NORMAL BP (≥ 110) who are STILL in mortal danger!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Low-BP patients don't disprove the claim (the claim was only about NORMAL blood pressure).`, [], { tag: 'note' }),
          fact(`Find patients with NORMAL BP (≥ 110) who are STILL in mortal danger!`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Ward Claim', wingIndex: 0, label: 'Disprove & Rescue',
        shown: [
          fact(`Select the exact counterexample patients: NORMAL blood pressure + DEADLY danger.`, [], { tag: 'note' }),
          fact(`Never trust a comforting shortcut without trying to break it.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Select the exact counterexample patients: NORMAL blood pressure + DEADLY danger.`, [], { tag: 'note' }),
          fact(`Never trust a comforting shortcut without trying to break it.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Breaking a Dangerous Shortcut',
      dispatch: 'Someone claimed "normal blood pressure means safe" — hunt for the counterexamples that prove that claim false!',
      order: 'Select ONLY the counterexample patients who disprove the claim: NORMAL blood pressure (≥ 110) YET in deadly danger.',
      hint: 'Find patients who have NORMAL blood pressure AND a deadly problem (like 79% oxygen or brain clot).',
      cards,
      evaluate(activeCards) {
        const list = collectFactsByTag(activeCards, 'fal');
        const targets = uniqueSortedIds(list.filter((x) => x.normBp && x.danger).map((x) => x.patients[0]));
        const others = list.filter((x) => !(x.normBp && x.danger)).map((x) => x.patients[0]);
        return {
          targets,
          proof: `${formatList(targets)} have NORMAL blood pressure yet deadly danger — directly disproving "normal BP = safe."`,
          rival: buildRivalInfo(targets, others, (id) => `${pName(id)} either has low BP (already flagged) or is genuinely safe.`),
        };
      },
    };
  },

  // #76 Heuristic reasoning (Before · Meta)
  'heuristic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Fast Rule', wingIndex: 0, label: '2-Second Battlefield Rule',
        shown: [
          fact(`Step 1: If ANYONE needs a 1-minute airway/tourniquet fix → pick ONLY those 1-minute fixes!`, [], { tag: 'note' }),
          fact(`Step 2: ONLY if ZERO 1-minute fixes exist → pick the highest Danger score patient.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Step 1: If ANYONE needs a 1-minute airway/tourniquet fix → pick ONLY those 1-minute fixes!`, [], { tag: 'note' }),
          fact(`Step 2: ONLY if ZERO 1-minute fixes exist → pick the highest Danger score patient.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Disaster Bay', wingIndex: 1, label: 'Bays 1 & 2',
        shown: [
          fact(`${pName(a)}: 1-minute choking airway fix (Danger 7).`, a, { tag: 'heu', oneMin: true, danger: 7 }),
          fact(`${pName(b)}: 20-minute chest surgery (Danger 10).`, b, { tag: 'heu', oneMin: false, danger: 10 }),
        ],
        alt: [
          fact(`${pName(a)}: 18-minute leg surgery (Danger 7).`, a, { tag: 'heu', oneMin: false, danger: 7 }),
          fact(`${pName(b)}: 20-minute chest surgery (Danger 10).`, b, { tag: 'heu', oneMin: false, danger: 10 }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Disaster Bay', wingIndex: 1, label: 'Bays 3 & 4',
        shown: [
          fact(`${pName(c)}: 1-minute leg tourniquet fix (Danger 6).`, c, { tag: 'heu', oneMin: true, danger: 6 }),
          fact(`${pName(d)}: 15-minute hip surgery (Danger 8).`, d, { tag: 'heu', oneMin: false, danger: 8 }),
        ],
        alt: [
          fact(`${pName(c)}: 15-minute shoulder surgery (Danger 6).`, c, { tag: 'heu', oneMin: false, danger: 6 }),
          fact(`${pName(d)}: 15-minute hip surgery (Danger 8).`, d, { tag: 'heu', oneMin: false, danger: 8 }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Disaster Bay', wingIndex: 1, label: 'Bays 5 & 6',
        shown: [
          fact(`${pName(e)}: 12-minute wound closure (Danger 4).`, e, { tag: 'heu', oneMin: false, danger: 4 }),
          fact(`${pName(f)}: 10-minute arm cast (Danger 3).`, f, { tag: 'heu', oneMin: false, danger: 3 }),
        ],
        alt: [
          fact(`${pName(e)}: 1-minute bleeding tourniquet fix (Danger 6).`, e, { tag: 'heu', oneMin: true, danger: 6 }),
          fact(`${pName(f)}: 10-minute arm cast (Danger 3).`, f, { tag: 'heu', oneMin: false, danger: 3 }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Fast Rule', wingIndex: 0, label: 'Why Fast Rules Save Lives',
        shown: [
          fact(`In mass-casualty chaos, you don't have time for slow spreadsheets — check Step 1 first!`, [], { tag: 'note' }),
          fact(`Only fall through to Step 2 if nobody has a 1-minute fix.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`In mass-casualty chaos, you don't have time for slow spreadsheets — check Step 1 first!`, [], { tag: 'note' }),
          fact(`Only fall through to Step 2 if nobody has a 1-minute fix.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Fast Rule', wingIndex: 0, label: 'Make the Snap Call',
        shown: [
          fact(`Any 1-minute fixes? Pick ONLY them. None? Pick the highest Danger score.`, [], { tag: 'note' }),
          fact(`Act fast!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Any 1-minute fixes? Pick ONLY them. None? Pick the highest Danger score.`, [], { tag: 'note' }),
          fact(`Act fast!`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Fast 2-Step Disaster Rule',
      dispatch: 'When 20 ambulances hit at once, a sharp 2-step shortcut beats slow hesitation.',
      order: 'Follow the fast rule: if ANY 1-minute airway/tourniquet fix exists, treat ONLY those; otherwise treat the highest Danger score.',
      hint: 'First check if anyone has a 1-minute fix. If yes, pick only them; if none exist, pick the highest Danger score.',
      cards,
      evaluate(activeCards) {
        const list = collectFactsByTag(activeCards, 'heu');
        const fast = list.filter((x) => x.oneMin);
        if (fast.length > 0) {
          const targets = uniqueSortedIds(fast.map((x) => x.patients[0]));
          const slow = list.filter((x) => !x.oneMin).sort((x, y) => y.danger - x.danger).map((x) => x.patients[0]);
          return {
            targets,
            proof: `Step 1 triggers immediately: ${formatList(targets)} have 1-minute lifesaving fixes, so clear them before long surgeries.`,
            rival: buildRivalInfo(targets, slow, (id) => `${pName(id)} requires long surgery and waits until 1-minute fixes are done.`),
          };
        }
        const maxD = Math.max(...list.map((x) => x.danger));
        const targets = uniqueSortedIds(list.filter((x) => x.danger === maxD).map((x) => x.patients[0]));
        const rest = list.filter((x) => x.danger < maxD).map((x) => x.patients[0]);
        return {
          targets,
          proof: `No 1-minute fixes exist, so Step 2 selects highest-danger patient ${formatList(targets)} (Danger ${maxD}).`,
          rival: buildRivalInfo(targets, rest, (id) => `${pName(id)} has a lower danger score than ${maxD}.`),
        };
      },
    };
  },

  // #77 Non-monotonic reasoning (Inside · Meta)
  'non-monotonic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Early Flag (01:00)', wingIndex: 0, label: 'Initial Surgery List',
        shown: [
          fact(`01:00 preliminary guess: Put ${pName(a)} on the Emergency Surgery List.`, a, { tag: 'early' }),
          fact(`01:00 preliminary guess: Put ${pName(b)} on the Emergency Surgery List.`, b, { tag: 'early' }),
        ],
        alt: [
          fact(`01:00 preliminary guess: Put ${pName(a)} on the Emergency Surgery List.`, a, { tag: 'early' }),
          fact(`01:00 preliminary guess: Put ${pName(d)} on the Emergency Surgery List.`, d, { tag: 'early' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Early Flag (01:00)', wingIndex: 0, label: 'Added to Surgery List',
        shown: [
          fact(`02:00 preliminary guess: Put ${pName(c)} on the Emergency Surgery List.`, c, { tag: 'early' }),
          fact(`${pName(e)} and ${pName(f)} were never flagged for surgery.`, [e, f], { tag: 'note' }),
        ],
        alt: [
          fact(`02:00 preliminary guess: Put ${pName(c)} on the Emergency Surgery List.`, c, { tag: 'early' }),
          fact(`02:00 preliminary guess: Put ${pName(e)} on the Emergency Surgery List.`, e, { tag: 'early' }),
        ],
      }),
      makeCard({
        index: 2, time: '05:00', wing: 'New CT Scan (05:00)', wingIndex: 1, label: 'Surgery Cancellations!',
        shown: [
          fact(`05:00 NEW CT SCAN CLEARS ${pName(b)} — zero internal bleeding! CANCEL surgery.`, b, { tag: 'clear' }),
          fact(`05:00 repeat exam confirms ${pName(d)} is completely fine.`, d, { tag: 'clear' }),
        ],
        alt: [
          fact(`05:00 NEW CT SCAN CLEARS ${pName(a)} — zero internal bleeding! CANCEL surgery.`, a, { tag: 'clear' }),
          fact(`05:00 NEW CT SCAN CLEARS ${pName(c)} — zero internal bleeding! CANCEL surgery.`, c, { tag: 'clear' }),
        ],
      }),
      makeCard({
        index: 3, time: '05:30', wing: 'New CT Scan (05:00)', wingIndex: 1, label: 'Change Your Mind Fast',
        shown: [
          fact(`A great doctor gladly drops an earlier plan the moment fresh proof clears the patient!`, [], { tag: 'note' }),
          fact(`Never roll a cleared patient into surgery out of habit.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`A great doctor gladly drops an earlier plan the moment fresh proof clears the patient!`, [], { tag: 'note' }),
          fact(`Never roll a cleared patient into surgery out of habit.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '06:00', wing: 'OR Doors', wingIndex: 1, label: 'Final Roll-In Check',
        shown: [
          fact(`Start with the 01–02:00 Surgery List, then REMOVE anyone cleared by the 05:00 scan.`, [], { tag: 'note' }),
          fact(`Operate ONLY on patients STILL needing surgery.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Start with the 01–02:00 Surgery List, then REMOVE anyone cleared by the 05:00 scan.`, [], { tag: 'note' }),
          fact(`Operate ONLY on patients STILL needing surgery.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'OR Doors', wingIndex: 0, label: 'Wheel Into OR',
        shown: [
          fact(`Select everyone who is STILL on the Surgery List after the 05:00 cancellations.`, [], { tag: 'note' }),
          fact(`Do NOT select cleared patients.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Select everyone who is STILL on the Surgery List after the 05:00 cancellations.`, [], { tag: 'note' }),
          fact(`Do NOT select cleared patients.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Canceling Surgery After a Clean Scan',
      dispatch: 'New 05:00 CT scans just overturned earlier assumptions — withdraw patients who are now cleared!',
      order: 'Roll into surgery ONLY patients from the early Surgery List who were NOT cleared by the 05:00 scan.',
      hint: 'Take the 01–02:00 Surgery List and cross off anyone cleared on the 05:00 scan card.',
      cards,
      evaluate(activeCards) {
        const early = collectByTag(activeCards, 'early');
        const cleared = new Set(collectByTag(activeCards, 'clear'));
        const targets = uniqueSortedIds(early.filter((id) => !cleared.has(id)));
        const withdrawn = early.filter((id) => cleared.has(id));
        return {
          targets,
          proof: `After withdrawing cleared cases (${formatList(withdrawn)}), only ${formatList(targets)} still need emergency surgery.`,
          rival: buildRivalInfo(targets, withdrawn, (id) => `${pName(id)} was cleared by the new 05:00 scan, so their surgery is canceled.`),
        };
      },
    };
  },

  // #78 Ontological reasoning (After · Meta)
  'ontological-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Category Sort', wingIndex: 0, label: 'Three Different Kinds of Crisis',
        shown: [
          fact(`Antidote shots ONLY work on CHEMICAL POISONING — never on broken bones or panic attacks!`, [], { tag: 'note' }),
          fact(`Sort each bay by its TRUE underlying kind: Physical Injury vs. Chemical Poison vs. Emotional Shock.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Antidote shots ONLY work on CHEMICAL POISONING — never on broken bones or panic attacks!`, [], { tag: 'note' }),
          fact(`Sort each bay by its TRUE underlying kind: Physical Injury vs. Chemical Poison vs. Emotional Shock.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Intake Bays', wingIndex: 1, label: 'Bays 1 & 2',
        shown: [
          fact(`${pName(a)}: Swallowed industrial pesticide — pinpoint pupils & drooling (Chemical Poison).`, a, { tag: 'kind', cat: 'chem' }),
          fact(`${pName(b)}: Crushed ribs from falling beam — sharp chest pain (Physical Injury).`, b, { tag: 'kind', cat: 'phys' }),
        ],
        alt: [
          fact(`${pName(a)}: Crushed ribs from falling beam — sharp chest pain (Physical Injury).`, a, { tag: 'kind', cat: 'phys' }),
          fact(`${pName(b)}: Swallowed industrial pesticide — pinpoint pupils & drooling (Chemical Poison).`, b, { tag: 'kind', cat: 'chem' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Intake Bays', wingIndex: 1, label: 'Bays 3 & 4',
        shown: [
          fact(`${pName(c)}: Witnessed the crash unharmed — trembling & crying uncontrollably (Emotional Shock).`, c, { tag: 'kind', cat: 'emot' }),
          fact(`${pName(d)}: Inhaled leaking factory nerve gas — sweating & muscle twitching (Chemical Poison).`, d, { tag: 'kind', cat: 'chem' }),
        ],
        alt: [
          fact(`${pName(c)}: Inhaled leaking factory nerve gas — sweating & muscle twitching (Chemical Poison).`, c, { tag: 'kind', cat: 'chem' }),
          fact(`${pName(d)}: Witnessed the crash unharmed — trembling & crying uncontrollably (Emotional Shock).`, d, { tag: 'kind', cat: 'emot' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Intake Bays', wingIndex: 1, label: 'Bays 5 & 6',
        shown: [
          fact(`${pName(e)}: Deep glass cut on forearm — steady breathing (Physical Injury).`, e, { tag: 'kind', cat: 'phys' }),
          fact(`${pName(f)}: Hyperventilating after seeing smoke — lungs clear (Emotional Shock).`, f, { tag: 'kind', cat: 'emot' }),
        ],
        alt: [
          fact(`${pName(e)}: Spilled toxic cleaner on bare skin — burning rash & nausea (Chemical Poison).`, e, { tag: 'kind', cat: 'chem' }),
          fact(`${pName(f)}: Hyperventilating after seeing smoke — lungs clear (Emotional Shock).`, f, { tag: 'kind', cat: 'emot' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Category Sort', wingIndex: 0, label: 'Different Problems, Different Care',
        shown: [
          fact(`Physical injuries need surgeons; emotional shock needs calm comfort; chemical poison needs antidotes.`, [], { tag: 'note' }),
          fact(`Don't confuse trembling from fear with chemical poisoning.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Physical injuries need surgeons; emotional shock needs calm comfort; chemical poison needs antidotes.`, [], { tag: 'note' }),
          fact(`Don't confuse trembling from fear with chemical poisoning.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Category Sort', wingIndex: 0, label: 'Antidote Tray',
        shown: [
          fact(`Give chemical antidote shots ONLY to the Chemical Poisoning category.`, [], { tag: 'note' }),
          fact(`Select every Chemical Poison patient.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Give chemical antidote shots ONLY to the Chemical Poisoning category.`, [], { tag: 'note' }),
          fact(`Select every Chemical Poison patient.`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Physical vs. Chemical vs. Emotional Crisis',
      dispatch: 'A factory blast brought in three totally different kinds of emergencies — only one kind responds to chemical antidotes.',
      order: 'Give chemical antidote shots ONLY to patients in the Chemical Poison category (skip Physical Injury and Emotional Shock).',
      hint: 'Check each patient\'s true category and select only the Chemical Poison cases.',
      cards,
      evaluate(activeCards) {
        const list = collectFactsByTag(activeCards, 'kind');
        const targets = uniqueSortedIds(list.filter((x) => x.cat === 'chem').map((x) => x.patients[0]));
        const others = list.filter((x) => x.cat !== 'chem').map((x) => x.patients[0]);
        return {
          targets,
          proof: `${formatList(targets)} belong to the Chemical Poison category and require antidote shots.`,
          rival: buildRivalInfo(targets, others, (id) => `${pName(id)} is a physical injury or emotional shock, not chemical poisoning.`),
        };
      },
    };
  },

  // #79 Analogical abstraction (Inside · Meta)
  'analogical-abstraction': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Early Lesson (01–03)', wingIndex: 0, label: 'Early Crash Pattern 1',
        shown: [
          fact(`Early case ${pName(a)}: Skin COLD & clammy + mild fever → CRASHED in 10 minutes!`, a, { tag: 'note' }),
          fact(`Early case ${pName(b)}: Skin WARM & dry + high fever → stayed totally stable.`, b, { tag: 'note' }),
        ],
        alt: [
          fact(`Early case ${pName(a)}: Skin WARM & dry + high fever → CRASHED in 10 minutes!`, a, { tag: 'note' }),
          fact(`Early case ${pName(b)}: Skin COLD & clammy + mild fever → stayed totally stable.`, b, { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Early Lesson (01–03)', wingIndex: 0, label: 'Hidden Rule Discovered',
        shown: [
          fact(`Pattern learned from earlier today: COLD & clammy skin is the true crash predictor (not fever height!).`, [], { tag: 'rule', key: 'cold' }),
          fact(`Apply that exact learned rule to the brand-new 05:00 arrivals below.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Pattern learned from earlier today: HIGH FEVER (> 103°F) is the true crash predictor (not cold skin!).`, [], { tag: 'rule', key: 'fever' }),
          fact(`Apply that exact learned rule to the brand-new 05:00 arrivals below.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 2, time: '05:00', wing: 'New Arrivals (05:00)', wingIndex: 1, label: 'New Arrivals 1 & 2',
        shown: [
          fact(`NEW 05:00 arrival ${pName(c)}: Skin COLD & clammy · normal temperature.`, c, { tag: 'new', cold: true, fever: false }),
          fact(`NEW 05:00 arrival ${pName(d)}: Skin WARM & dry · high fever 104°F.`, d, { tag: 'new', cold: false, fever: true }),
        ],
        alt: [
          fact(`NEW 05:00 arrival ${pName(c)}: Skin WARM & dry · high fever 104°F.`, c, { tag: 'new', cold: false, fever: true }),
          fact(`NEW 05:00 arrival ${pName(d)}: Skin COLD & clammy · normal temperature.`, d, { tag: 'new', cold: true, fever: false }),
        ],
      }),
      makeCard({
        index: 3, time: '05:30', wing: 'New Arrivals (05:00)', wingIndex: 1, label: 'New Arrivals 3 & 4',
        shown: [
          fact(`NEW 05:00 arrival ${pName(e)}: Skin COLD & clammy · mild fever.`, e, { tag: 'new', cold: true, fever: false }),
          fact(`NEW 05:00 arrival ${pName(f)}: Skin WARM & dry · normal temperature.`, f, { tag: 'new', cold: false, fever: false }),
        ],
        alt: [
          fact(`NEW 05:00 arrival ${pName(e)}: Skin WARM & dry · high fever 104°F.`, e, { tag: 'new', cold: false, fever: true }),
          fact(`NEW 05:00 arrival ${pName(f)}: Skin COLD & clammy · mild fever.`, f, { tag: 'new', cold: true, fever: false }),
        ],
      }),
      makeCard({
        index: 4, time: '06:00', wing: 'Early Lesson (01–03)', wingIndex: 0, label: 'Apply to New Wave Only',
        shown: [
          fact(`Early cases (${pName(a)}, ${pName(b)}) are already handled — do NOT pick them.`, [a, b], { tag: 'note' }),
          fact(`Transfer the winning predictor onto the NEW 05:00 arrivals.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Early cases (${pName(a)}, ${pName(b)}) are already handled — do NOT pick them.`, [a, b], { tag: 'note' }),
          fact(`Transfer the winning predictor onto the NEW 05:00 arrivals.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'New Arrivals (05:00)', wingIndex: 1, label: 'Pre-Emptive Rescue',
        shown: [
          fact(`Flag every NEW 05:00 arrival matching today's true crash predictor.`, [], { tag: 'note' }),
          fact(`Act before they crash!`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Flag every NEW 05:00 arrival matching today's true crash predictor.`, [], { tag: 'note' }),
          fact(`Act before they crash!`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Applying Today\'s Outbreak Rule',
      dispatch: 'Extract the real warning sign from earlier patients today and apply it immediately to the brand-new 05:00 arrivals.',
      order: 'Read which sign predicted crashes earlier today, then treat ONLY the NEW 05:00 arrivals showing that exact sign.',
      hint: 'Check "Hidden Rule Discovered" (Cold/Clammy vs High Fever), then select the matching NEW 05:00 arrivals.',
      cards,
      evaluate(activeCards) {
        const rule = collectFactsByTag(activeCards, 'rule')[0];
        if (!rule) return null;
        const arrivals = collectFactsByTag(activeCards, 'new');
        const targets = uniqueSortedIds(arrivals.filter((x) => x[rule.key]).map((x) => x.patients[0]));
        const others = arrivals.filter((x) => !x[rule.key]).map((x) => x.patients[0]);
        const signLabel = rule.key === 'cold' ? 'cold, clammy skin' : 'high fever (> 103°F)';
        return {
          targets,
          proof: `Earlier cases showed ${signLabel} predicts crashes, flagging new arrivals ${formatList(targets)}.`,
          rival: buildRivalInfo(targets, others, (id) => `${pName(id)} does not show today's true crash predictor (${signLabel}).`),
        };
      },
    };
  },

  // #80 Integrative reasoning (Inside · Meta)
  'integrative-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0, time: '01:00', wing: 'Verified Lab A', wingIndex: 0, label: 'Check 1 · Verified Critical',
        shown: [
          fact(`Verified Lab A confirms CRITICAL danger in: ${pName(a)}, ${pName(b)}, and ${pName(c)}.`, [a, b, c], { tag: 'ver', list: [a, b, c] }),
          fact(`Broken Lab B glitch flagged ${pName(d)} (ignore broken Lab B!).`, d, { tag: 'note' }),
        ],
        alt: [
          fact(`Verified Lab A confirms CRITICAL danger in: ${pName(b)}, ${pName(c)}, and ${pName(d)}.`, [b, c, d], { tag: 'ver', list: [b, c, d] }),
          fact(`Broken Lab B glitch flagged ${pName(a)} (ignore broken Lab B!).`, a, { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 1, time: '02:00', wing: 'Legal Charts', wingIndex: 1, label: 'Check 2 · Signed DNR',
        shown: [
          fact(`Signed DNR ("Do Not Resuscitate") on file for: ${pName(b)} and ${pName(e)}.`, [b, e], { tag: 'dnr', list: [b, e] }),
          fact(`Full rescue wanted by: ${pName(a)}, ${pName(c)}, ${pName(d)}, and ${pName(f)}.`, [a, c, d, f], { tag: 'note' }),
        ],
        alt: [
          fact(`Signed DNR ("Do Not Resuscitate") on file for: ${pName(c)} and ${pName(e)}.`, [c, e], { tag: 'dnr', list: [c, e] }),
          fact(`Full rescue wanted by: ${pName(a)}, ${pName(b)}, ${pName(d)}, and ${pName(f)}.`, [a, b, d, f], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 2, time: '03:00', wing: 'Time Window', wingIndex: 0, label: 'Check 3 · Fast Enough',
        shown: [
          fact(`Reachable inside your 5-minute window: ${pName(a)}, ${pName(b)}, ${pName(d)}, and ${pName(f)}.`, [a, b, d, f], { tag: 'fast', list: [a, b, d, f] }),
          fact(`Too far away (15 min helicopter ride): ${pName(c)} and ${pName(e)}.`, [c, e], { tag: 'note' }),
        ],
        alt: [
          fact(`Reachable inside your 5-minute window: ${pName(b)}, ${pName(c)}, ${pName(d)}, and ${pName(f)}.`, [b, c, d, f], { tag: 'fast', list: [b, c, d, f] }),
          fact(`Too far away (15 min helicopter ride): ${pName(a)} and ${pName(e)}.`, [a, e], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 3, time: '04:00', wing: 'Chief Capstone', wingIndex: 1, label: 'Put Everything Together',
        shown: [
          fact(`Great trauma leadership blends Evidence + Ethics + Time in one calm call:`, [], { tag: 'note' }),
          fact(`1) Verified Lab A Critical  +  2) NO Signed DNR  +  3) Reachable within 5 minutes.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Great trauma leadership blends Evidence + Ethics + Time in one calm call:`, [], { tag: 'note' }),
          fact(`1) Verified Lab A Critical  +  2) NO Signed DNR  +  3) Reachable within 5 minutes.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 4, time: '05:00', wing: 'Chief Capstone', wingIndex: 1, label: 'Eliminate Every Trap',
        shown: [
          fact(`Ignore broken Lab B, respect every signed DNR, and skip unreachable 15-min bays.`, [], { tag: 'note' }),
          fact(`Only a patient passing all 3 checks gets your trauma team.`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Ignore broken Lab B, respect every signed DNR, and skip unreachable 15-min bays.`, [], { tag: 'note' }),
          fact(`Only a patient passing all 3 checks gets your trauma team.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5, time: '06:00', wing: 'Chief Capstone', wingIndex: 0, label: 'Final Chief Call',
        shown: [
          fact(`Combine Verified Lab A + No DNR + ≤ 5-minute reach right now.`, [], { tag: 'note' }),
          fact(`Deploy your team to the exact surviving patient(s).`, [], { tag: 'note' }),
        ],
        alt: [
          fact(`Combine Verified Lab A + No DNR + ≤ 5-minute reach right now.`, [], { tag: 'note' }),
          fact(`Deploy your team to the exact surviving patient(s).`, [], { tag: 'note' }),
        ],
      }),
    ];
    return {
      scenarioTitle: 'Chief of Trauma Final Call',
      dispatch: 'Combine verified evidence, living-will ethics, and your 5-minute reach window into one clear call.',
      order: 'Deploy ONLY to patients who pass ALL THREE: Verified Lab A Critical + NO Signed DNR + Reachable within 5 minutes.',
      hint: 'Start with Verified Lab A Critical, cross off anyone with a Signed DNR, and keep only those reachable within 5 minutes.',
      cards,
      evaluate(activeCards) {
        const ver = new Set(collectFactsByTag(activeCards, 'ver')[0]?.list || []);
        const dnr = new Set(collectFactsByTag(activeCards, 'dnr')[0]?.list || []);
        const fast = new Set(collectFactsByTag(activeCards, 'fast')[0]?.list || []);
        const targets = uniqueSortedIds([...ver].filter((id) => !dnr.has(id) && fast.has(id)));
        const nearMiss = [...ver].filter((id) => !targets.includes(id));
        return {
          targets,
          proof: `${formatList(targets)} passes all three checks: Verified Lab A critical, NO DNR, and reachable within 5 minutes.`,
          rival: buildRivalInfo(targets, nearMiss, (id) =>
            dnr.has(id) ? `${pName(id)} has a signed DNR living will.` : `${pName(id)} is 15 minutes away and outside your 5-minute window.`
          ),
        };
      },
    };
  },
};
