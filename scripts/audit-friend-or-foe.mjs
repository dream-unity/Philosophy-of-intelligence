import {ArcadeRun} from '../friend-or-foe/arcade-range.js';
import {makeCaseTrial, solveCaseEvidence} from '../friend-or-foe/case-decks.js';
import {evaluateFamily} from '../friend-or-foe/case-families.js';
import {caseRoles, edgesFor, roleNames, roleVerbs, seededDraw} from '../friend-or-foe/case-layout.js';
import {pairKey, reportHolds, truth} from '../friend-or-foe/case-logic.js';

const LEVELS = ['super-easy', 'very-easy', 'easy', 'medium', 'hard'];
const TRIALS_PER_LEVEL = 1000;

function fmtClaim(c) {
  return `${c.from} ${roleVerbs[c.role]} ${c.to} (${roleNames[c.role]})`;
}

function fmtReport(r) {
  if (r.op === 'verified') return `Verified: ${fmtClaim(r.right)}`;
  if (r.op === 'ruled-out') return `Ruled out: ${fmtClaim(r.right)}`;
  const sym = {eq: '=', neq: '≠', imp: '⇒', or: 'or', nand: 'not both'}[r.op];
  if (r.op === 'nand') return `Not both: (${fmtClaim(r.left)}) and (${fmtClaim(r.right)})`;
  return `(${fmtClaim(r.left)}) ${sym} (${fmtClaim(r.right)})`;
}

// Independent world enumerator strictly from player-visible evidence
function enumerateVisibleWorlds(evidence, reports = evidence.reports) {
  const {rows, family, anchor} = evidence;
  const fixed = rows.reduce((m, r, i) => (r.disputed ? m : m | (1 << i)), 0);
  const worlds = [];
  for (let mask = 0; mask < (1 << rows.length); mask++) {
    if (mask & fixed) continue;
    const edges = edgesFor(rows, mask);
    if (!reports.every(r => reportHolds(edges, r))) continue;
    const participants = new Set(edges.flatMap(e => [e.from, e.to]));
    if (evidence.roster.some(name => !participants.has(name))) continue;
    const res = evaluateFamily(family, edges, anchor, false);
    worlds.push({mask, edges, pair: res.pair});
  }
  return worlds;
}

function pct(n, d) {
  return d ? ((100 * n) / d).toFixed(1) + '%' : 'n/a';
}

const draw = seededDraw(20261125);
let sampleHardTrial = null;

console.log('=== FRIEND OR FOE — 5,000-TRIAL INDEPENDENT AUDIT (1,000 PER DIFFICULTY) ===\n');

for (const level of LEVELS) {
  let prev = null;
  let prevTargets = [];
  let uniqueOk = 0;
  let prevPairRepeats = 0;
  let partialPairOverlaps = 0;
  let familyBlocksOk = 0;
  let domainBlocksOk = 0;
  const boardKeys = new Set();

  // Withholding accumulators
  let totalClauses = 0;
  let netNecessaryClauses = 0;
  let pairNecessaryClauses = 0;
  let handoutClauses = 0;

  let linkSensSum = 0;
  let rowFlipSensSum = 0;
  let rowDelSensSum = 0;

  // Binary collapse & role diversity
  let hasFriendOrCivTarget = 0;
  let hasFriendTarget = 0;
  let hasCivTarget = 0;
  const rolePairHits = Object.fromEntries(caseRoles.map(r => [r, 0]));

  // Shortcuts & bias
  let topMentionHits = 0;
  let lowMentionHits = 0;
  let shortlistTopMentionHits = 0;
  const shortlistPos = [0, 0, 0, 0];
  let displayedDisputed = 0;
  let displayedAsPrinted = 0;
  const modeCounts = {reverse: 0, alias: 0, alt: 0};

  // Arcade range bias
  const laneHits = new Array(10).fill(0);
  const paceHits = new Array(10).fill(0);
  const speciesHits = new Map();

  // Operator truth tables: op -> {TT, TF, FT, FF}
  const opTable = {
    eq: {TT: 0, TF: 0, FT: 0, FF: 0},
    neq: {TT: 0, TF: 0, FT: 0, FF: 0},
    imp: {TT: 0, TF: 0, FT: 0, FF: 0},
    or: {TT: 0, TF: 0, FT: 0, FF: 0},
    nand: {TT: 0, TF: 0, FT: 0, FF: 0}
  };
  let clauseFirstTrue = 0;
  let clauseLastTrue = 0;
  let clauseCountForOrder = 0;

  // Track 100-trial family cycles and 10-trial domain blocks
  let cycleFamilies = new Set();
  let blockDomains = new Set();

  for (let t = 0; t < TRIALS_PER_LEVEL; t++) {
    const trial = makeCaseTrial(level, prev, draw);
    const {evidence, pair} = trial;
    const correctKey = pairKey(pair);
    const prevKey = prev ? pairKey(prev.pair) : null;

    // 1. Cycle & block diversity
    cycleFamilies.add(evidence.family);
    blockDomains.add(evidence.domain);
    if ((t + 1) % 10 === 0) {
      if (blockDomains.size === 10) domainBlocksOk++;
      blockDomains = new Set();
    }
    if ((t + 1) % 100 === 0) {
      if (cycleFamilies.size === 100) familyBlocksOk++;
      cycleFamilies = new Set();
    }
    const boardIdx = trial.deck.boards[evidence.family].order[trial.deck.boards[evidence.family].index];
    boardKeys.add(`${evidence.family}#${boardIdx}`);

    // 2. Previous pair exclusion & partial overlap
    if (prev) {
      if (correctKey === prevKey) prevPairRepeats++;
      if (pair.some(n => prev.pair.includes(n))) partialPairOverlaps++;
    }

    // 3. Independent visibility solver
    const worlds = enumerateVisibleWorlds(evidence);
    const legalWorlds = worlds.filter(w => w.pair.length === 2);
    if (worlds.length === 1 && legalWorlds.length === 1 && pairKey(legalWorlds[0].pair) === correctKey) {
      uniqueOk++;
    }
    const solvedWorld = worlds[0];
    const solvedEdges = solvedWorld.edges;

    // 4. Cross-check withholding (network reconstruction AND pair identification)
    const reports = evidence.reports;
    for (let drop = 0; drop < reports.length; drop++) {
      totalClauses++;
      const r = reports[drop];
      if (r.op === 'verified' || r.op === 'ruled-out') handoutClauses++;

      // Operator truth table on solved edges
      if (r.left && opTable[r.op]) {
        const lt = truth(solvedEdges, r.left);
        const rt = truth(solvedEdges, r.right);
        const cell = (lt ? 'T' : 'F') + (rt ? 'T' : 'F');
        opTable[r.op][cell]++;
        if (drop === 0) {
          clauseCountForOrder++;
          if (lt) clauseFirstTrue++;
        }
        if (drop === reports.length - 1 && rt) clauseLastTrue++;
      }

      const reduced = reports.filter((_, i) => i !== drop);
      const redWorlds = enumerateVisibleWorlds(evidence, reduced);
      if (redWorlds.length >= 2) netNecessaryClauses++;

      // Account for known |pair|=2, shortlist (if present), and pair !== previous.pair
      const rivalPairs = new Set();
      for (const w of redWorlds) {
        if (w.pair.length !== 2) continue;
        if (evidence.leads.length && !w.pair.every(n => evidence.leads.includes(n))) continue;
        const k = pairKey(w.pair);
        if (k === prevKey) continue;
        rivalPairs.add(k);
      }
      if (rivalPairs.size >= 2) pairNecessaryClauses++;
    }

    // Capture a clean, rich Hard sample trial (with all 3 uncertainty modes & multiple connectives)
    if (level === 'hard' && !sampleHardTrial && t >= 15) {
      const modes = new Set(evidence.rows.map(r => (r.alias ? 'alias' : r.alt ? 'alt' : 'reverse')));
      const ops = new Set(reports.map(r => r.op));
      if (modes.size === 3 && ops.size >= 3 && reports.length === 6) {
        // Find a strong rival world when dropping clause 0
        const red = enumerateVisibleWorlds(evidence, reports.slice(1));
        const rival = red.find(w => w.mask !== solvedWorld.mask && w.pair.length === 2 && pairKey(w.pair) !== correctKey);
        if (rival) {
          sampleHardTrial = {trial, solvedWorld, rival, droppedReport: reports[0]};
        }
      }
    }

    // 5. Disputed display balance & uncertainty mode mix
    for (let i = 0; i < evidence.rows.length; i++) {
      const row = evidence.rows[i];
      if (!row.disputed) continue;
      displayedDisputed++;
      if (!((solvedWorld.mask >> i) & 1)) displayedAsPrinted++;
      if (row.alias) modeCounts.alias++;
      else if (row.alt) modeCounts.alt++;
      else modeCounts.reverse++;
    }

    // 6. Single-link withholding (12 links)
    let linkSens = 0;
    for (let idx = 0; idx < solvedEdges.length; idx++) {
      const sub = solvedEdges.filter((_, j) => j !== idx);
      const res = evaluateFamily(evidence.family, sub, evidence.anchor, false).pair;
      if (res.length !== 2 || pairKey(res) !== correctKey) linkSens++;
    }
    linkSensSum += linkSens;

    // 7. Whole-category withholding: flip & delete each of the 6 rows
    let flipSens = 0;
    let delSens = 0;
    for (let rIdx = 0; rIdx < evidence.rows.length; rIdx++) {
      const flippedEdges = edgesFor(evidence.rows, solvedWorld.mask ^ (1 << rIdx));
      const fRes = evaluateFamily(evidence.family, flippedEdges, evidence.anchor, false).pair;
      if (fRes.length !== 2 || pairKey(fRes) !== correctKey) flipSens++;

      const roleToDrop = evidence.rows[rIdx].role;
      const droppedEdges = solvedEdges.filter(e => e.role !== roleToDrop);
      const dRes = evaluateFamily(evidence.family, droppedEdges, evidence.anchor, false).pair;
      if (dRes.length !== 2 || pairKey(dRes) !== correctKey) delSens++;
    }
    rowFlipSensSum += flipSens;
    rowDelSensSum += delSens;

    // 8. Check whether Friends/Civilians appear inside target pairs (anti-Safe-collapse proof)
    const pairRoles = new Set();
    for (const e of solvedEdges) {
      if (pair.includes(e.from) || pair.includes(e.to)) pairRoles.add(e.role);
    }
    for (const r of pairRoles) rolePairHits[r]++;
    // More directly: does a target act as a Friend (sends a Friend link) or Civilian (sends a Civilian link)?
    const targetIsFriend = solvedEdges.some(e => e.role === 'friend' && pair.includes(e.from));
    const targetIsCiv = solvedEdges.some(e => e.role === 'civilian' && pair.includes(e.from));
    if (targetIsFriend) hasFriendTarget++;
    if (targetIsCiv) hasCivTarget++;
    if (targetIsFriend || targetIsCiv) hasFriendOrCivTarget++;

    // 9. Mention-frequency shortcut (on displayed links)
    const freq = new Map(evidence.roster.map(n => [n, 0]));
    for (const row of evidence.rows) {
      for (const l of row.links) {
        freq.set(l.from, (freq.get(l.from) || 0) + 1);
        freq.set(l.to, (freq.get(l.to) || 0) + 1);
      }
    }
    const byHigh = [...evidence.roster].sort((a, b) => freq.get(b) - freq.get(a));
    const byLow = [...evidence.roster].sort((a, b) => freq.get(a) - freq.get(b));
    if (pairKey(byHigh.slice(0, 2)) === correctKey) topMentionHits++;
    if (pairKey(byLow.slice(0, 2)) === correctKey) lowMentionHits++;

    // 10. Shortlist position bias & shortlist mention-frequency shortcut
    if (evidence.leads.length === 4) {
      for (const n of pair) shortlistPos[evidence.leads.indexOf(n)]++;
      const leadHigh = [...evidence.leads].sort((a, b) => freq.get(b) - freq.get(a));
      if (pairKey(leadHigh.slice(0, 2)) === correctKey) shortlistTopMentionHits++;
    }

    // 11. Arcade range bias (lane, pace, species)
    const run = new ArcadeRun(trial.roster, trial.pair, prevTargets, draw);
    for (const target of run.targets) {
      if (pair.includes(target.name)) {
        laneHits[target.slot]++;
        paceHits[target.pace]++;
        speciesHits.set(target.species, (speciesHits.get(target.species) || 0) + 1);
      }
    }
    prevTargets = run.targets;
    prev = trial;
  }

  console.log(`--- ${level.toUpperCase()} (${TRIALS_PER_LEVEL} trials) ---`);
  console.log(`  Unique solvability (1 valid world, exact 2 targets): ${uniqueOk}/${TRIALS_PER_LEVEL} (${pct(uniqueOk, TRIALS_PER_LEVEL)})`);
  console.log(`  100-family cycles complete (100/100 unique): ${familyBlocksOk}/10 | 10-domain blocks complete: ${domainBlocksOk}/100 | Distinct boards: ${boardKeys.size}/${TRIALS_PER_LEVEL}`);
  console.log(`  Prev-pair repeats: ${prevPairRepeats} | Partial 1-name overlaps: ${partialPairOverlaps}/${TRIALS_PER_LEVEL - 1} (${pct(partialPairOverlaps, TRIALS_PER_LEVEL - 1)})`);
  console.log(`  Single-link withholding: avg ${(linkSensSum / TRIALS_PER_LEVEL).toFixed(2)} / 12 links alter/break pair when omitted`);
  console.log(`  Whole-category withholding: avg ${(rowDelSensSum / TRIALS_PER_LEVEL).toFixed(2)} / 6 rows break pair when deleted | avg ${(rowFlipSensSum / TRIALS_PER_LEVEL).toFixed(2)} / 6 rows break pair when flipped`);
  console.log(`  Target includes Friend-actor: ${pct(hasFriendTarget, TRIALS_PER_LEVEL)} | Civilian-actor: ${pct(hasCivTarget, TRIALS_PER_LEVEL)} | Either: ${pct(hasFriendOrCivTarget, TRIALS_PER_LEVEL)}`);
  console.log(`  Mention-freq baseline: top-2 exact ${pct(topMentionHits, TRIALS_PER_LEVEL)} | bottom-2 exact ${pct(lowMentionHits, TRIALS_PER_LEVEL)}${shortlistPos.some(Boolean) ? ` | shortlist top-2 exact ${pct(shortlistTopMentionHits, TRIALS_PER_LEVEL)} (random 16.7%)` : ''}`);
  if (shortlistPos.some(Boolean)) {
    console.log(`  Shortlist slot distribution (ideal ~500 each): [${shortlistPos.join(', ')}]`);
  }
  const spVals = [...speciesHits.values()];
  console.log(`  Arcade range target balance (ideal ~200/slot): lane [${Math.min(...laneHits)}..${Math.max(...laneHits)}] | pace [${Math.min(...paceHits)}..${Math.max(...paceHits)}] | species [${Math.min(...spVals)}..${Math.max(...spVals)}] (${spVals.length} species)`);

  if (totalClauses > 0) {
    console.log(`  Cross-check withholding (${totalClauses} clauses):`);
    console.log(`    Necessary for network reconstruction: ${netNecessaryClauses}/${totalClauses} (${pct(netNecessaryClauses, totalClauses)})`);
    console.log(`    Necessary for pair ID (given |pair|=2 & !=prev): ${pairNecessaryClauses}/${totalClauses} (${pct(pairNecessaryClauses, totalClauses)})`);
    console.log(`    Standalone Verified/Ruled-out handouts: ${handoutClauses}/${totalClauses} (${pct(handoutClauses, totalClauses)})`);
    console.log(`    Displayed-as-printed rate: ${displayedAsPrinted}/${displayedDisputed} (${pct(displayedAsPrinted, displayedDisputed)}) | Modes: reverse=${modeCounts.reverse}, alias=${modeCounts.alias}, alt=${modeCounts.alt}`);
    console.log(`    Clue-order check: 1st-clause LHS true=${pct(clauseFirstTrue, clauseCountForOrder)} | last-clause RHS true=${pct(clauseLastTrue, clauseCountForOrder)}`);
    console.log(`    Operator truth-table balance:`);
    for (const [op, c] of Object.entries(opTable)) {
      const tot = c.TT + c.TF + c.FT + c.FF;
      if (!tot) continue;
      console.log(`      ${op.padEnd(4)} (n=${String(tot).padStart(4)}): TT=${pct(c.TT, tot).padStart(5)}  TF=${pct(c.TF, tot).padStart(5)}  FT=${pct(c.FT, tot).padStart(5)}  FF=${pct(c.FF, tot).padStart(5)}`);
    }
  }
  console.log('');
}

// Print concrete Hard walkthrough
if (sampleHardTrial) {
  const {trial, solvedWorld, rival, droppedReport} = sampleHardTrial;
  const ev = trial.evidence;
  console.log('=== SAMPLE HARD TRIAL WALKTHROUGH ===');
  console.log(`Family: ${ev.family} | Domain: ${ev.domain} | Title: ${ev.title}`);
  console.log(`Order: ${ev.order}`);
  console.log('\nDisplayed disputed records (all 6):');
  ev.rows.forEach((row, i) => {
    const mode = row.alias ? `alias(${row.alias.join('↔')})` : row.alt ? `alt(${row.alt.link.from}→${row.alt.link.to})` : 'reverse(?)';
    const links = row.links.map(l => `${l.from} ${roleVerbs[row.role]} ${l.to}`).join(' ; ');
    const actualState = ((solvedWorld.mask >> i) & 1) ? 'ALTERNATE' : 'AS PRINTED';
    const rivalState = ((rival.mask >> i) & 1) ? 'ALTERNATE' : 'AS PRINTED';
    console.log(`  [${roleNames[row.role].padEnd(12)}] ${links}  | uncertainty: ${mode}  | True=${actualState}, Rival=${rivalState}`);
  });
  console.log('\nCross-checks:');
  ev.reports.forEach((r, idx) => {
    const holdsRival = reportHolds(rival.edges, r);
    console.log(`  ${idx + 1}. ${fmtReport(r)}  [True world: HOLDS | Rival world: ${holdsRival ? 'HOLDS' : 'FAILS'}]`);
  });
  console.log(`\nTrue target pair: ${trial.pair.join(' & ')}`);
  console.log(`True proof:\n  - ${trial.proof.join('\n  - ')}`);
  console.log(`\nCredible rival interpretation (satisfies 5/6 cross-checks, fails only #1: ${fmtReport(droppedReport)}):`);
  console.log(`  Rival pair: ${rival.pair.join(' & ')}`);
}
