import {ArcadeRun} from '../friend-or-foe/arcade-range.js';
import {makeCaseTrial} from '../friend-or-foe/case-decks.js';
import {evaluateFamily} from '../friend-or-foe/case-families.js';
import {caseRoles, edgesFor, formatDispatchTime, roleNames, seededDraw, verbsForDomain} from '../friend-or-foe/case-layout.js';
import {pairKey, reportHolds, truth} from '../friend-or-foe/case-logic.js';

const LEVELS = ['super-easy', 'very-easy', 'easy', 'medium', 'hard'];
const TRIALS_PER_LEVEL = 1000;
const BANNED_RE = /\b(rows?|arrows?|left side|right side|points?|score|top two|IQ|appears? in|appearing|named in|listed|distinct|categor(y|ies)|file|files|acts? in|acting in|acted upon|records?|dossier|overt|covert|hostile|safe|threat)\b|Safe \(\+\)|Threat \(−\)|relational reasoning/i;

function fmtClaim(c, domain) {
  const verbs = verbsForDomain(domain);
  return `${c.from} ${verbs[c.role]} ${c.to} (${roleNames[c.role]})`;
}

function fmtReport(r, domain) {
  if (r.op === 'verified') return `Verified: ${fmtClaim(r.right, domain)}`;
  if (r.op === 'ruled-out') return `Ruled out: ${fmtClaim(r.right, domain)}`;
  const sym = {eq: '=', neq: '≠', imp: '⇒', or: 'or', nand: 'not both'}[r.op];
  if (r.op === 'nand') return `Not both: (${fmtClaim(r.left, domain)}) and (${fmtClaim(r.right, domain)})`;
  return `(${fmtClaim(r.left, domain)}) ${sym} (${fmtClaim(r.right, domain)})`;
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
    const targets = res.targets || res.pair;
    worlds.push({mask, edges, pair: targets});
  }
  return worlds;
}

function isSingleCategoryShortcut(rows, solvedMask, targetKey) {
  const solvedEdges = edgesFor(rows, solvedMask);
  for (const role of caseRoles) {
    const group = solvedEdges.filter(e => e.role === role);
    const actors = [...new Set(group.map(e => e.from))];
    const recips = [...new Set(group.map(e => e.to))];
    if (pairKey(actors) === targetKey || pairKey(recips) === targetKey) return true;
  }
  return false;
}

function countDisputedComponents(rows, reports) {
  const disputedRoles = new Set(rows.filter(r => r.disputed).map(r => r.role));
  if (disputedRoles.size <= 1) return disputedRoles.size;
  const adj = new Map([...disputedRoles].map(r => [r, new Set()]));
  for (const rep of reports) {
    if (!rep.left || !rep.right) continue;
    if (disputedRoles.has(rep.left.role) && disputedRoles.has(rep.right.role)) {
      adj.get(rep.left.role).add(rep.right.role);
      adj.get(rep.right.role).add(rep.left.role);
    }
  }
  const seen = new Set();
  let comps = 0;
  for (const r of disputedRoles) {
    if (seen.has(r)) continue;
    comps++;
    const stack = [r];
    seen.add(r);
    while (stack.length) {
      const cur = stack.pop();
      for (const nxt of adj.get(cur)) {
        if (!seen.has(nxt)) {
          seen.add(nxt);
          stack.push(nxt);
        }
      }
    }
  }
  return comps;
}

function isStyle4ClosingTree(rows, reports) {
  const disputedRoles = new Set(rows.filter(r => r.disputed).map(r => r.role));
  if (disputedRoles.size < 3) return false;
  const nonSym = reports.filter(r => r.left && r.op !== 'eq' && r.op !== 'neq');
  if (nonSym.length !== 1) return false;
  // Check if symmetric edges connect the two endpoints of the sole non-symmetric clause
  const adj = new Map([...disputedRoles].map(r => [r, new Set()]));
  for (const r of reports) {
    if (!r.left || (r.op !== 'eq' && r.op !== 'neq')) continue;
    if (disputedRoles.has(r.left.role) && disputedRoles.has(r.right.role)) {
      adj.get(r.left.role).add(r.right.role);
      adj.get(r.right.role).add(r.left.role);
    }
  }
  const start = nonSym[0].left.role;
  const goal = nonSym[0].right.role;
  if (!adj.has(start) || !adj.has(goal)) return false;
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length) {
    const cur = stack.pop();
    if (cur === goal) return true;
    for (const nxt of adj.get(cur)) {
      if (!seen.has(nxt)) {
        seen.add(nxt);
        stack.push(nxt);
      }
    }
  }
  return false;
}

function pct(n, d) {
  return d ? ((100 * n) / d).toFixed(1) + '%' : 'n/a';
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
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
  const uniqueSeeds = new Set();
  let liveSynthCount = 0;
  const sizeCounts = {1: 0, 2: 0, 3: 0, 4: 0};
  const orderWordCounts = [];
  let bannedCopyHits = 0;

  // Shortcut & structural leak metrics
  let singleCatShortcuts = 0;
  let style4Motifs = 0;
  let splitClusterTrials = 0;
  const easySyntaxStats = new Map(); // key: `${op}:${side}` -> {T:0, F:0}

  // Withholding accumulators
  let totalClauses = 0;
  let netNecessaryClauses = 0;
  let targetNecessaryClauses = 0;
  let handoutClauses = 0;

  let linkSensSum = 0;
  let rowFlipSensSum = 0;
  let rowDelSensSum = 0;

  // Binary collapse & role diversity
  let hasFriendOrCivTarget = 0;
  let hasFriendTarget = 0;
  let hasCivTarget = 0;

  // Shortcuts & bias
  let topMentionHits = 0;
  let lowMentionHits = 0;
  let shortlistTopMentionHits = 0;
  const shortlistPos = [0, 0, 0, 0, 0, 0];
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

  let cycleFamilies = new Set();
  let blockDomains = new Set();

  for (let t = 0; t < TRIALS_PER_LEVEL; t++) {
    const trial = makeCaseTrial(level, prev, draw);
    const {evidence, pair} = trial;
    const kSize = pair.length;
    sizeCounts[kSize] = (sizeCounts[kSize] || 0) + 1;
    const correctKey = pairKey(pair);
    const prevKey = prev ? pairKey(prev.pair) : null;

    orderWordCounts.push(evidence.order.trim().split(/\s+/).length);
    if (BANNED_RE.test(evidence.order) || BANNED_RE.test(evidence.title) || BANNED_RE.test(evidence.hint || '')) {
      bannedCopyHits++;
    }

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
    boardKeys.add(trial.liveSynthesized ? `${evidence.family}@${trial.seed}` : `${evidence.family}#${boardIdx}`);
    if (trial.seed) uniqueSeeds.add(trial.seed);
    if (trial.liveSynthesized) liveSynthCount++;

    // 2. Previous target-set exclusion & partial overlap
    if (prev) {
      if (correctKey === prevKey) prevPairRepeats++;
      if (pair.some(n => prev.pair.includes(n))) partialPairOverlaps++;
    }

    // 3. Independent visibility solver
    const worlds = enumerateVisibleWorlds(evidence);
    const legalWorlds = worlds.filter(w => w.pair.length === kSize);
    if (worlds.length === 1 && legalWorlds.length === 1 && pairKey(legalWorlds[0].pair) === correctKey) {
      uniqueOk++;
    }
    const solvedWorld = worlds[0];
    const solvedEdges = solvedWorld.edges;

    // 3b. Single-category column shortcut check
    if (isSingleCategoryShortcut(evidence.rows, solvedWorld.mask, correctKey)) {
      singleCatShortcuts++;
    }

    // 3c. Style-4 and connectivity checks
    if (isStyle4ClosingTree(evidence.rows, evidence.reports)) style4Motifs++;
    if (level === 'hard' && countDisputedComponents(evidence.rows, evidence.reports) > 1) {
      splitClusterTrials++;
    }

    // 3d. Easy syntax-uniqueness predictor check
    if (level === 'easy' && evidence.reports.length === 1) {
      const rep = evidence.reports[0];
      const dispIdx = evidence.rows.findIndex(r => r.disputed);
      const dispRole = evidence.rows[dispIdx].role;
      const side = rep.left.role === dispRole ? 'L' : 'R';
      const dispTruth = !((solvedWorld.mask >> dispIdx) & 1); // true = as printed
      const key = `${rep.op}:${side}`;
      if (!easySyntaxStats.has(key)) easySyntaxStats.set(key, {T: 0, F: 0});
      easySyntaxStats.get(key)[dispTruth ? 'T' : 'F']++;
    }

    // 4. Cross-check withholding (network reconstruction AND target ID accounting for known kSize, shortlist, != prevKey)
    const reports = evidence.reports;
    for (let drop = 0; drop < reports.length; drop++) {
      totalClauses++;
      const r = reports[drop];
      if (r.op === 'verified' || r.op === 'ruled-out') handoutClauses++;

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

      const rivalSets = new Set();
      for (const w of redWorlds) {
        if (w.pair.length !== kSize) continue;
        if (evidence.leads.length && !w.pair.every(n => evidence.leads.includes(n))) continue;
        const k = pairKey(w.pair);
        if (k === prevKey) continue;
        rivalSets.add(k);
      }
      if (rivalSets.size >= 2) targetNecessaryClauses++;
    }

    // Capture a clean, rich Hard sample trial (with all 3 uncertainty modes, coupled 6-row web, concise order)
    if (level === 'hard' && !sampleHardTrial && t >= 10) {
      const modes = new Set(evidence.rows.map(r => (r.alias ? 'alias' : r.alt ? 'alt' : 'reverse')));
      const ops = new Set(reports.map(r => r.op));
      if (modes.size === 3 && ops.size >= 3 && trial.rivalDebrief) {
        const idx = trial.rivalDebrief.reportIndex;
        const red = enumerateVisibleWorlds(evidence, reports.filter((_, i) => i !== idx));
        const rival = red.find(w => w.mask !== solvedWorld.mask && w.pair.length === kSize && pairKey(w.pair) !== correctKey);
        if (rival) {
          sampleHardTrial = {trial, solvedWorld, rival, droppedIndex: idx, droppedReport: reports[idx]};
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
      if (res.length !== kSize || pairKey(res) !== correctKey) linkSens++;
    }
    linkSensSum += linkSens;

    // 7. Whole-category withholding: flip & delete each of the 6 rows
    let flipSens = 0;
    let delSens = 0;
    for (let rIdx = 0; rIdx < evidence.rows.length; rIdx++) {
      const flippedEdges = edgesFor(evidence.rows, solvedWorld.mask ^ (1 << rIdx));
      const fRes = evaluateFamily(evidence.family, flippedEdges, evidence.anchor, false).pair;
      if (fRes.length !== kSize || pairKey(fRes) !== correctKey) flipSens++;

      const roleToDrop = evidence.rows[rIdx].role;
      const droppedEdges = solvedEdges.filter(e => e.role !== roleToDrop);
      const dRes = evaluateFamily(evidence.family, droppedEdges, evidence.anchor, false).pair;
      if (dRes.length !== kSize || pairKey(dRes) !== correctKey) delSens++;
    }
    rowFlipSensSum += flipSens;
    rowDelSensSum += delSens;

    // 8. Check whether Friends/Civilians appear inside target sets
    const targetIsFriend = solvedEdges.some(e => e.role === 'friend' && pair.includes(e.from));
    const targetIsCiv = solvedEdges.some(e => e.role === 'civilian' && pair.includes(e.from));
    if (targetIsFriend) hasFriendTarget++;
    if (targetIsCiv) hasCivTarget++;
    if (targetIsFriend || targetIsCiv) hasFriendOrCivTarget++;

    // 9. Mention-frequency shortcut (top-k / bottom-k on displayed links)
    const freq = new Map(evidence.roster.map(n => [n, 0]));
    for (const row of evidence.rows) {
      for (const l of row.links) {
        freq.set(l.from, (freq.get(l.from) || 0) + 1);
        freq.set(l.to, (freq.get(l.to) || 0) + 1);
      }
    }
    const byHigh = [...evidence.roster].sort((a, b) => freq.get(b) - freq.get(a));
    const byLow = [...evidence.roster].sort((a, b) => freq.get(a) - freq.get(b));
    if (pairKey(byHigh.slice(0, kSize)) === correctKey) topMentionHits++;
    if (pairKey(byLow.slice(0, kSize)) === correctKey) lowMentionHits++;

    // 10. Shortlist position bias & shortlist mention-frequency shortcut
    if (evidence.leads.length) {
      for (const n of pair) {
        const p = evidence.leads.indexOf(n);
        if (p >= 0 && p < shortlistPos.length) shortlistPos[p]++;
      }
      const leadHigh = [...evidence.leads].sort((a, b) => freq.get(b) - freq.get(a));
      if (pairKey(leadHigh.slice(0, kSize)) === correctKey) shortlistTopMentionHits++;
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
  console.log(`  Unique solvability (1 valid world, exact target set): ${uniqueOk}/${TRIALS_PER_LEVEL} (${pct(uniqueOk, TRIALS_PER_LEVEL)})`);
  console.log(`  Target counts: 1→${sizeCounts[1]}, 2→${sizeCounts[2]}, 3→${sizeCounts[3]}, 4→${sizeCounts[4]} | Order length: median ${median(orderWordCounts)}w, max ${Math.max(...orderWordCounts)}w | Banned words: ${bannedCopyHits}`);
  console.log(`  100-family cycles complete (100/100): ${familyBlocksOk}/10 | 10-domain blocks: ${domainBlocksOk}/100 | Distinct boards: ${boardKeys.size}/${TRIALS_PER_LEVEL} (live-synthesized: ${liveSynthCount}/${TRIALS_PER_LEVEL}, unique seeds: ${uniqueSeeds.size})`);
  console.log(`  Prev-target repeats: ${prevPairRepeats} | Partial name overlaps: ${partialPairOverlaps}/${TRIALS_PER_LEVEL - 1} (${pct(partialPairOverlaps, TRIALS_PER_LEVEL - 1)})`);
  console.log(`  Single-category column shortcuts: ${singleCatShortcuts}/${TRIALS_PER_LEVEL} (${pct(singleCatShortcuts, TRIALS_PER_LEVEL)})`);
  console.log(`  Single-link withholding: avg ${(linkSensSum / TRIALS_PER_LEVEL).toFixed(2)} / 12 links alter/break targets when omitted`);
  console.log(`  Whole-category withholding: avg ${(rowDelSensSum / TRIALS_PER_LEVEL).toFixed(2)} / 6 categories break when deleted | avg ${(rowFlipSensSum / TRIALS_PER_LEVEL).toFixed(2)} / 6 break when flipped`);
  console.log(`  Target includes Friend-actor: ${pct(hasFriendTarget, TRIALS_PER_LEVEL)} | Civilian-actor: ${pct(hasCivTarget, TRIALS_PER_LEVEL)} | Either: ${pct(hasFriendOrCivTarget, TRIALS_PER_LEVEL)}`);
  console.log(`  Mention-freq baseline: top-k exact ${pct(topMentionHits, TRIALS_PER_LEVEL)} | bottom-k exact ${pct(lowMentionHits, TRIALS_PER_LEVEL)}${shortlistPos.some(Boolean) ? ` | shortlist top-k exact ${pct(shortlistTopMentionHits, TRIALS_PER_LEVEL)}` : ''}`);
  if (shortlistPos.some(Boolean)) {
    console.log(`  Shortlist slot distribution: [${shortlistPos.filter((_, i) => i < 6).join(', ')}]`);
  }
  const spVals = [...speciesHits.values()];
  console.log(`  Arcade range target balance: lane [${Math.min(...laneHits)}..${Math.max(...laneHits)}] | pace [${Math.min(...paceHits)}..${Math.max(...paceHits)}] | species [${Math.min(...spVals)}..${Math.max(...spVals)}] (${spVals.length} species)`);

  if (level === 'easy' && easySyntaxStats.size) {
    let oracleCorrect = 0;
    const parts = [];
    for (const [k, v] of easySyntaxStats.entries()) {
      oracleCorrect += Math.max(v.T, v.F);
      parts.push(`${k}: T=${v.T}/F=${v.F}`);
    }
    console.log(`  Easy syntax-only oracle accuracy (ideal ~50.0%): ${oracleCorrect}/${TRIALS_PER_LEVEL} (${pct(oracleCorrect, TRIALS_PER_LEVEL)}) [${parts.join(', ')}]`);
  }

  if (totalClauses > 0) {
    console.log(`  Cross-check withholding (${totalClauses} clauses):`);
    console.log(`    Necessary for network reconstruction: ${netNecessaryClauses}/${totalClauses} (${pct(netNecessaryClauses, totalClauses)})`);
    console.log(`    Necessary for target ID (given |targets|, shortlist & !=prev): ${targetNecessaryClauses}/${totalClauses} (${pct(targetNecessaryClauses, totalClauses)})`);
    console.log(`    Standalone Verified/Ruled-out handouts: ${handoutClauses}/${totalClauses} (${pct(handoutClauses, totalClauses)})`);
    console.log(`    Style-4 single-closing-connective motifs: ${style4Motifs}/${TRIALS_PER_LEVEL}${level === 'hard' ? ` | Disconnected Hard clusters: ${splitClusterTrials}/${TRIALS_PER_LEVEL}` : ''}`);
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
  const {trial, solvedWorld, rival, droppedIndex, droppedReport} = sampleHardTrial;
  const ev = trial.evidence;
  const verbs = verbsForDomain(ev.domain);
  console.log('=== SAMPLE HARD TRIAL WALKTHROUGH ===');
  console.log(`Family: ${ev.family} | Domain: ${ev.domain} | Title: ${ev.title}`);
  console.log(`Order: ${ev.order}`);
  console.log('\nDisplayed disputed dispatches (all 6):');
  ev.rows.forEach((row, i) => {
    const mode = row.alias ? `alias(${row.alias.join('↔')})` : row.alt ? `alt(${row.alt.link.from}→${row.alt.link.to})` : 'reverse(?)';
    const links = row.links.map(l => `${l.from} ${verbs[row.role]} ${l.to}`).join(' ; ');
    const actualState = ((solvedWorld.mask >> i) & 1) ? 'ALTERNATE' : 'AS PRINTED';
    const rivalState = ((rival.mask >> i) & 1) ? 'ALTERNATE' : 'AS PRINTED';
    console.log(`  [${roleNames[row.role].padEnd(12)} ${formatDispatchTime(row.time)}] ${links}  | uncertainty: ${mode}  | True=${actualState}, Rival=${rivalState}`);
  });
  console.log('\nCoupled cross-checks:');
  ev.reports.forEach((r, idx) => {
    const holdsRival = reportHolds(rival.edges, r);
    console.log(`  ${idx + 1}. ${fmtReport(r, ev.domain)}  [True world: HOLDS | Rival world: ${holdsRival ? 'HOLDS' : 'FAILS'}]`);
  });
  console.log(`\nTrue targets (${trial.pair.length} bullets): ${trial.pair.join(', ')}`);
  console.log(`True proof:\n  - ${trial.proof.join('\n  - ')}`);
  console.log(`\nCredible rival interpretation (satisfies ${ev.reports.length - 1}/${ev.reports.length} cross-checks, defeated by #${droppedIndex + 1}: ${fmtReport(droppedReport, ev.domain)}):`);
  console.log(`  Rival targets (${rival.pair.length}): ${rival.pair.join(', ')}`);
}
