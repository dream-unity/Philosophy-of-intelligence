// 80 distinct, mathematically verified clinical reasoning engines — one dedicated engine for every
// single reasoning type in the 80-type taxonomy (48 core engines + 32 extra engines).

import { PATIENT_BY_ID, PATIENT_IDS, CHANNEL_IDS } from './roster.js';
import { uniqueSorted } from './case-graph.js';
import { EXTRA_REASONING_ENGINES } from './reasoning-engines-extra.js';

function pName(id) {
  return PATIENT_BY_ID[id]?.name || id;
}

function pBayNum(id) {
  return PATIENT_IDS.indexOf(id) + 1; // 1..10 (Row 1 = 1..5, Row 2 = 6..10)
}

function chLabel(sc, ch) {
  return sc.channels[ch].label;
}

function chVerb(sc, ch) {
  return sc.channels[ch].verb;
}

function formatNameList(ids) {
  if (!ids.length) return 'none';
  const names = ids.map(pName);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function buildRival(targets, candidates, reasonFn) {
  const tSet = new Set(targets);
  const rival = candidates.find((id) => !tSet.has(id));
  if (!rival) return null;
  return {
    patientId: rival,
    patientName: pName(rival),
    reason: reasonFn(rival),
  };
}

function pickTwoDistinctChannels(rng) {
  const aIdx = Math.floor(rng() * CHANNEL_IDS.length);
  let bIdx = Math.floor(rng() * (CHANNEL_IDS.length - 1));
  if (bIdx >= aIdx) bIdx++;
  return [CHANNEL_IDS[aIdx], CHANNEL_IDS[bIdx]];
}

export const REASONING_ENGINES = {
  // 1. Direct atomic role selection (Deductive, Instrumental)
  'direct-role': {
    usesWeights: false,
    pickParams(rng) {
      return { ch: CHANNEL_IDS[Math.floor(rng() * CHANNEL_IDS.length)], role: rng() < 0.5 ? 'from' : 'to' };
    },
    order({ ch, role }, sc) {
      return role === 'from'
        ? `Ward directive: attend to every patient on the initiating (left) side of ${chLabel(sc, ch)}.`
        : `Ward directive: attend to every patient on the receiving (right) side of ${chLabel(sc, ch)}.`;
    },
    detail({ ch, role }, sc) {
      return `Each ${chLabel(sc, ch)} line reads "A ${chVerb(sc, ch)} B" — select every ${role === 'from' ? 'A (left)' : 'B (right)'}.`;
    },
    evaluate(graph, { ch, role }) {
      return role === 'from' ? graph.sourcesOf(ch) : graph.targetsOf(ch);
    },
    explain(graph, { ch, role }, sc, targets) {
      const opposite = role === 'from' ? graph.targetsOf(ch) : graph.sourcesOf(ch);
      return {
        proof: `${chLabel(sc, ch)} places ${formatNameList(targets)} on the ${role === 'from' ? 'left' : 'right'} side.`,
        decisiveChannels: [ch],
        rival: buildRival(targets, opposite, (id) => `${pName(id)} sits on the opposite side of ${chLabel(sc, ch)}.`),
      };
    },
  },

  // 2. Eliminative exclusion (Eliminative, Falsification, Moral, Motivational)
  'set-exclusion': {
    usesWeights: false,
    pickParams(rng) {
      const [flagCh, clearCh] = pickTwoDistinctChannels(rng);
      return { flagCh, clearCh };
    },
    order({ flagCh, clearCh }, sc, meta) {
      if (meta.id === 'falsification-based') {
        return `Chart rule-out: start with patients in ${chLabel(sc, flagCh)} and cross off anyone contradicted by appearing in ${chLabel(sc, clearCh)}.`;
      }
      if (meta.id === 'moral-reasoning' || meta.id === 'motivational-reasoning') {
        return `Care priority filter: prioritize patients in ${chLabel(sc, flagCh)} EXCEPT anyone already accounted for or conflicted in ${chLabel(sc, clearCh)}.`;
      }
      return `Contraindication check: select every patient named in ${chLabel(sc, flagCh)} EXCEPT anyone also named in ${chLabel(sc, clearCh)}.`;
    },
    detail({ flagCh, clearCh }, sc) {
      return `Gather every name in ${chLabel(sc, flagCh)}, then cross off anyone appearing on either side of ${chLabel(sc, clearCh)}.`;
    },
    evaluate(graph, { flagCh, clearCh }) {
      const excluded = new Set(graph.patientsIn(clearCh));
      return graph.patientsIn(flagCh).filter((id) => !excluded.has(id));
    },
    explain(graph, { flagCh, clearCh }, sc, targets) {
      const flagged = graph.patientsIn(flagCh);
      const cleared = graph.patientsIn(clearCh);
      const crossed = flagged.filter((id) => cleared.includes(id));
      return {
        proof: `${chLabel(sc, flagCh)} names ${formatNameList(flagged)}; ruling out overlaps with ${chLabel(sc, clearCh)} leaves ${formatNameList(targets)}.`,
        decisiveChannels: [flagCh, clearCh],
        rival: buildRival(targets, crossed.length ? crossed : cleared, (id) => `${pName(id)} also appears in ${chLabel(sc, clearCh)} and is eliminated.`),
      };
    },
  },

  // 3. Convergent / Syllogistic / Constraint-based intersection
  'set-intersection': {
    usesWeights: false,
    pickParams(rng, graph) {
      const valid = [];
      for (let i = 0; i < CHANNEL_IDS.length; i++) {
        for (let j = i + 1; j < CHANNEL_IDS.length; j++) {
          const chA = CHANNEL_IDS[i];
          const chB = CHANNEL_IDS[j];
          const setB = new Set(graph.patientsIn(chB));
          const inter = graph.patientsIn(chA).filter((id) => setB.has(id));
          if (inter.length >= 1 && inter.length <= 4) valid.push({ chA, chB });
        }
      }
      return valid.length ? valid[Math.floor(rng() * valid.length)] : { chA: 'vitals', chB: 'labs' };
    },
    order({ chA, chB }, sc, meta) {
      if (meta.id === 'syllogistic-reasoning') {
        return `Joint criteria: only patients in ${chLabel(sc, chA)} qualify, and all urgent actions must also appear in ${chLabel(sc, chB)}. Select who meets BOTH criteria.`;
      }
      if (meta.id === 'constraint-based') {
        return `Dual criteria: select patients satisfying BOTH ${chLabel(sc, chA)} and ${chLabel(sc, chB)} at once.`;
      }
      return `Overlap check: select ONLY patients who appear in BOTH ${chLabel(sc, chA)} and ${chLabel(sc, chB)}.`;
    },
    detail({ chA, chB }, sc) {
      return `A patient must appear on either side of ${chLabel(sc, chA)} AND on either side of ${chLabel(sc, chB)}.`;
    },
    evaluate(graph, { chA, chB }) {
      const setB = new Set(graph.patientsIn(chB));
      return graph.patientsIn(chA).filter((id) => setB.has(id));
    },
    explain(graph, { chA, chB }, sc, targets) {
      return {
        proof: `Only ${formatNameList(targets)} satisfy both ${chLabel(sc, chA)} and ${chLabel(sc, chB)}.`,
        decisiveChannels: [chA, chB],
        rival: buildRival(targets, [...graph.patientsIn(chA), ...graph.patientsIn(chB)], (id) =>
          `${pName(id)} appears in only one of ${chLabel(sc, chA)} or ${chLabel(sc, chB)}, not both.`
        ),
      };
    },
  },

  // 4. Disjunctive XOR / Antithetical separation
  'disjunctive-xor': {
    usesWeights: false,
    pickParams(rng, graph) {
      const valid = [];
      for (let i = 0; i < CHANNEL_IDS.length; i++) {
        for (let j = i + 1; j < CHANNEL_IDS.length; j++) {
          const chA = CHANNEL_IDS[i];
          const chB = CHANNEL_IDS[j];
          const a = new Set(graph.targetsOf(chA));
          const b = new Set(graph.targetsOf(chB));
          const xor = uniqueSorted([...a, ...b].filter((id) => a.has(id) !== b.has(id)));
          if (xor.length >= 1 && xor.length <= 4) valid.push({ chA, chB });
        }
      }
      return valid.length ? valid[Math.floor(rng() * valid.length)] : { chA: 'triage', chB: 'imaging' };
    },
    order({ chA, chB }, sc) {
      return `Exclusive check: select patients on the receiving (right) side of EITHER ${chLabel(sc, chA)} or ${chLabel(sc, chB)}, excluding anyone on both.`;
    },
    detail({ chA, chB }, sc) {
      return `Check the right side of ${chLabel(sc, chA)} and ${chLabel(sc, chB)} — keep exclusive matches only.`;
    },
    evaluate(graph, { chA, chB }) {
      const a = new Set(graph.targetsOf(chA));
      const b = new Set(graph.targetsOf(chB));
      return uniqueSorted([...a, ...b].filter((id) => a.has(id) !== b.has(id)));
    },
    explain(graph, { chA, chB }, sc, targets) {
      const a = graph.targetsOf(chA);
      const b = graph.targetsOf(chB);
      const both = a.filter((id) => b.includes(id));
      return {
        proof: `Exclusive right-side patients of ${chLabel(sc, chA)} vs ${chLabel(sc, chB)} are ${formatNameList(targets)}.`,
        decisiveChannels: [chA, chB],
        rival: buildRival(targets, both.length ? both : [...graph.sourcesOf(chA), ...graph.sourcesOf(chB)], (id) =>
          both.includes(id)
            ? `${pName(id)} appears on the right side of BOTH channels, violating exclusive-or.`
            : `${pName(id)} is on the left side rather than the receiving right side.`
        ),
      };
    },
  },

  // 5. Conditional / Algorithmic / Pragmatic / Heuristic if-then gate
  'conditional-gate': {
    usesWeights: false,
    pickParams(rng) {
      const [condA, condB] = pickTwoDistinctChannels(rng);
      const [thenCh, elseCh] = pickTwoDistinctChannels(rng);
      return { condA, condB, thenCh, elseCh };
    },
    order({ condA, condB, thenCh, elseCh }, sc) {
      return `Standing protocol: IF ${chLabel(sc, condA)} occurred earlier than ${chLabel(sc, condB)}, select right-side patients of ${chLabel(sc, thenCh)}; OTHERWISE select left-side patients of ${chLabel(sc, elseCh)}.`;
    },
    detail({ condA, condB }, sc) {
      return `Compare the timestamps of ${chLabel(sc, condA)} and ${chLabel(sc, condB)} first to pick the active branch.`;
    },
    evaluate(graph, { condA, condB, thenCh, elseCh }) {
      const condTrue = graph.timeRankOf(condA) < graph.timeRankOf(condB);
      return condTrue ? graph.targetsOf(thenCh) : graph.sourcesOf(elseCh);
    },
    explain(graph, { condA, condB, thenCh, elseCh }, sc, targets) {
      const tA = graph.byChannel[condA].record.time;
      const tB = graph.byChannel[condB].record.time;
      const condTrue = graph.timeRankOf(condA) < graph.timeRankOf(condB);
      const unused = condTrue ? graph.sourcesOf(elseCh) : graph.targetsOf(thenCh);
      return {
        proof: `${chLabel(sc, condA)} (${tA}) is ${condTrue ? 'earlier' : 'later'} than ${chLabel(sc, condB)} (${tB}), activating the ${condTrue ? 'IF' : 'OTHERWISE'} branch (${formatNameList(targets)}).`,
        decisiveChannels: [condA, condB, condTrue ? thenCh : elseCh],
        rival: buildRival(targets, unused, (id) => `${pName(id)} belongs to the inactive branch of the if–then condition.`),
      };
    },
  },

  // 6. 2-Hop Causal / Transitive / Mechanistic / Second-Order Relay (X -> M -> Y, select Y)
  'transitive-relay': {
    usesWeights: false,
    pickParams(rng, graph) {
      const pairs = [];
      for (const a of CHANNEL_IDS) {
        for (const b of CHANNEL_IDS) {
          if (a === b) continue;
          const ends = uniqueSorted(graph.twoHopRelays({ fromChannel: a, toChannel: b, distinctEnds: true }).map((r) => r.end));
          if (ends.length >= 1 && ends.length <= 3) pairs.push({ fromCh: a, toCh: b });
        }
      }
      return pairs.length ? pairs[Math.floor(rng() * pairs.length)] : { fromCh: 'triage', toCh: 'handoff' };
    },
    order({ fromCh, toCh }, sc) {
      return `Downstream trace: follow A → M in ${chLabel(sc, fromCh)} into M → B in ${chLabel(sc, toCh)} (A ≠ B), and select the downstream patient(s) B.`;
    },
    detail({ fromCh, toCh }, sc) {
      return `Match a right-side patient M in ${chLabel(sc, fromCh)} to the same M on the left side of ${chLabel(sc, toCh)}, then select who M leads to.`;
    },
    evaluate(graph, { fromCh, toCh }) {
      return uniqueSorted(graph.twoHopRelays({ fromChannel: fromCh, toChannel: toCh, distinctEnds: true }).map((r) => r.end));
    },
    explain(graph, { fromCh, toCh }, sc, targets) {
      const relays = graph.twoHopRelays({ fromChannel: fromCh, toChannel: toCh, distinctEnds: true });
      const chains = relays.map((r) => `${pName(r.start)} → ${pName(r.mid)} → ${pName(r.end)}`).join('; ');
      return {
        proof: `Following ${chLabel(sc, fromCh)} into ${chLabel(sc, toCh)} gives ${chains}, targeting ${formatNameList(targets)}.`,
        decisiveChannels: [fromCh, toCh],
        rival: buildRival(targets, [...relays.map((r) => r.mid), ...graph.targetsOf(toCh)], (id) =>
          relays.some((r) => r.mid === id)
            ? `${pName(id)} is the intermediate step M, not the downstream endpoint B.`
            : `${pName(id)} has no matching upstream link from ${chLabel(sc, fromCh)}.`
        ),
      };
    },
  },

  // 7. Reverse / Root-Cause / Forensic Origin (X -> M -> Y, select X)
  'reverse-origin': {
    usesWeights: false,
    pickParams(rng, graph) {
      const pairs = [];
      for (const a of CHANNEL_IDS) {
        for (const b of CHANNEL_IDS) {
          if (a === b) continue;
          const starts = uniqueSorted(graph.twoHopRelays({ fromChannel: a, toChannel: b, distinctEnds: true }).map((r) => r.start));
          if (starts.length >= 1 && starts.length <= 3) pairs.push({ fromCh: a, toCh: b });
        }
      }
      return pairs.length ? pairs[Math.floor(rng() * pairs.length)] : { fromCh: 'labs', toCh: 'consult' };
    },
    order({ fromCh, toCh }, sc) {
      return `Source trace: work backward from ${chLabel(sc, toCh)} into ${chLabel(sc, fromCh)} (A → M → B, A ≠ B) and select the ORIGIN patient(s) A.`;
    },
    detail({ fromCh, toCh }, sc) {
      return `Find M appearing on the left of ${chLabel(sc, toCh)} and the right of ${chLabel(sc, fromCh)}, then select the initiating patient A on the left of ${chLabel(sc, fromCh)}.`;
    },
    evaluate(graph, { fromCh, toCh }) {
      return uniqueSorted(graph.twoHopRelays({ fromChannel: fromCh, toChannel: toCh, distinctEnds: true }).map((r) => r.start));
    },
    explain(graph, { fromCh, toCh }, sc, targets) {
      const relays = graph.twoHopRelays({ fromChannel: fromCh, toChannel: toCh, distinctEnds: true });
      const chains = relays.map((r) => `${pName(r.start)} → ${pName(r.mid)} → ${pName(r.end)}`).join('; ');
      return {
        proof: `Stepping backward through ${chains} identifies root origin ${formatNameList(targets)}.`,
        decisiveChannels: [fromCh, toCh],
        rival: buildRival(targets, [...relays.map((r) => r.end), ...graph.sourcesOf(fromCh)], (id) =>
          relays.some((r) => r.end === id)
            ? `${pName(id)} is the final effect rather than the originating root cause.`
            : `${pName(id)}'s entry in ${chLabel(sc, fromCh)} never connects into ${chLabel(sc, toCh)}.`
        ),
      };
    },
  },

  // 8. Hidden Bridge (Abductive, Decompositional, Interpersonal: X -> M -> Y, select M)
  'hidden-bridge': {
    usesWeights: false,
    pickParams(rng, graph) {
      const pairs = [];
      for (const a of CHANNEL_IDS) {
        for (const b of CHANNEL_IDS) {
          if (a === b) continue;
          const mids = uniqueSorted(graph.twoHopRelays({ fromChannel: a, toChannel: b, distinctEnds: true }).map((r) => r.mid));
          if (mids.length >= 1 && mids.length <= 3) pairs.push({ chA: a, chB: b });
        }
      }
      return pairs.length ? pairs[Math.floor(rng() * pairs.length)] : { chA: 'vitals', chB: 'consult' };
    },
    order({ chA, chB }, sc) {
      return `Connector check: find the middle patient M who sits on the right side of ${chLabel(sc, chA)} and the left side of ${chLabel(sc, chB)} (A → M → B, A ≠ B).`;
    },
    detail({ chA, chB }, sc) {
      return `Look for A → M in ${chLabel(sc, chA)} paired with M → B in ${chLabel(sc, chB)} (A ≠ B), and select M.`;
    },
    evaluate(graph, { chA, chB }) {
      return uniqueSorted(graph.twoHopRelays({ fromChannel: chA, toChannel: chB, distinctEnds: true }).map((r) => r.mid));
    },
    explain(graph, { chA, chB }, sc, targets) {
      const relays = graph.twoHopRelays({ fromChannel: chA, toChannel: chB, distinctEnds: true });
      const chains = relays.map((r) => `${pName(r.start)} → ${pName(r.mid)} → ${pName(r.end)}`).join('; ');
      return {
        proof: `Only ${formatNameList(targets)} bridges ${chLabel(sc, chA)} into ${chLabel(sc, chB)} (${chains}).`,
        decisiveChannels: [chA, chB],
        rival: buildRival(targets, [...relays.map((r) => r.start), ...relays.map((r) => r.end)], (id) =>
          `${pName(id)} sits at an outer endpoint rather than the shared bridge.`
        ),
      };
    },
  },

  // 9. Recursive / Systems / Emergent 2-step cascade from seed channel
  'recursive-reach': {
    usesWeights: false,
    pickParams(rng, graph) {
      const valid = [];
      for (const seedCh of CHANNEL_IDS) {
        const wave1 = new Set(graph.targetsOf(seedCh));
        const wave2 = [];
        for (const e of graph.allEdges) {
          if (e.channelId !== seedCh && wave1.has(e.from) && !wave1.has(e.to)) {
            wave2.push(e.to);
          }
        }
        const res = uniqueSorted(wave2);
        if (res.length >= 1 && res.length <= 4) valid.push({ seedCh });
      }
      return valid.length ? valid[Math.floor(rng() * valid.length)] : { seedCh: 'triage' };
    },
    order({ seedCh }, sc) {
      return `Escalation wave: start with right-side patients of ${chLabel(sc, seedCh)} (Wave 1); then follow arrows across all other records to find NEW Wave-2 patients they point to.`;
    },
    detail({ seedCh }, sc) {
      return `List Wave 1 (right side of ${chLabel(sc, seedCh)}), then select patients outside Wave 1 who receive an arrow from any Wave-1 patient in another record.`;
    },
    evaluate(graph, { seedCh }) {
      const wave1 = new Set(graph.targetsOf(seedCh));
      const wave2 = [];
      for (const e of graph.allEdges) {
        if (e.channelId !== seedCh && wave1.has(e.from) && !wave1.has(e.to)) {
          wave2.push(e.to);
        }
      }
      return uniqueSorted(wave2);
    },
    explain(graph, { seedCh }, sc, targets) {
      const wave1 = graph.targetsOf(seedCh);
      return {
        proof: `Wave 1 from ${chLabel(sc, seedCh)} (${formatNameList(wave1)}) propagates across other records to new Wave-2 patients ${formatNameList(targets)}.`,
        decisiveChannels: [seedCh],
        rival: buildRival(targets, wave1, (id) => `${pName(id)} is in Wave 1 itself, not a newly reached Wave-2 patient.`),
      };
    },
  },

  // 10. Anomaly / Statistical / Inductive Outlier (highest receiving count across the ward)
  'anomaly-outlier': {
    usesWeights: false,
    pickParams(rng) {
      return { role: rng() < 0.5 ? 'to' : 'from' };
    },
    order({ role }) {
      const side = role === 'to' ? 'receiving (right)' : 'initiating (left)';
      return `Ward frequency check: count ${side}-side entries per patient across all 6 records and select everyone tied for the MAXIMUM count.`;
    },
    detail({ role }) {
      return `Tally how many arrows ${role === 'to' ? 'point to (right)' : 'start from (left)'} each patient across the whole board; select the highest-count patient(s).`;
    },
    evaluate(graph, { role }) {
      const counts = PATIENT_IDS.map((id) => ({
        id,
        n: (role === 'to' ? graph.inEdges(id) : graph.outEdges(id)).length,
      }));
      const maxN = Math.max(...counts.map((c) => c.n));
      if (maxN < 2) return [];
      return uniqueSorted(counts.filter((c) => c.n === maxN).map((c) => c.id));
    },
    explain(graph, { role }, _sc, targets) {
      const counts = PATIENT_IDS.map((id) => ({
        id,
        n: (role === 'to' ? graph.inEdges(id) : graph.outEdges(id)).length,
      })).sort((a, b) => b.n - a.n);
      const topN = counts[0].n;
      const runners = counts.filter((c) => c.n < topN).map((c) => c.id);
      return {
        proof: `${formatNameList(targets)} lead the ward distribution with ${topN} ${role === 'to' ? 'receiving' : 'initiating'} entries each.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, runners, (id) => {
          const n = counts.find((c) => c.id === id)?.n || 0;
          return `${pName(id)} only has ${n} entries on that side (below the maximum of ${topN}).`;
        }),
      };
    },
  },

  // 11. Antinomic / Contradiction / Dialectical / Adversarial (direct opposing pair X->Y and Y->X, or same-pair clash)
  'antinomic-cycle': {
    usesWeights: false,
    pickParams(rng, graph) {
      // Check if board has a direct opposing pair A->B and B->A; otherwise use patients who BOTH initiate and receive across different units
      const opposing = [];
      for (const e1 of graph.allEdges) {
        for (const e2 of graph.allEdges) {
          if (e1.from === e2.to && e1.to === e2.from && e1.channelId !== e2.channelId) {
            opposing.push(e1.from, e1.to);
          }
        }
      }
      const oppIds = uniqueSorted(opposing);
      if (oppIds.length >= 2 && oppIds.length <= 4) {
        return { mode: 'opposing' };
      }
      // Fallback: patients pulled in opposite directions (left in Unit 0 AND right in Unit 1)
      return { mode: 'cross-invert', unitA: 0, unitB: 1 };
    },
    order(params, sc) {
      if (params.mode === 'opposing') {
        return `Chart clash audit: find any two patients who directly invert each other across two records (A → B in one record, and B → A in another). Select both.`;
      }
      return `Chart clash audit: find patients whose clinical role flips between units—appearing on the LEFT side in ${sc.sites[0]} AND on the RIGHT side in ${sc.sites[1]}.`;
    },
    detail(params, sc) {
      if (params.mode === 'opposing') {
        return `Scan for a reversed pair where one record writes A → B while another writes B → A.`;
      }
      return `Check ${sc.sites[0]} left-side names against ${sc.sites[1]} right-side names to spot flipped roles.`;
    },
    evaluate(graph, params) {
      if (params.mode === 'opposing') {
        const out = [];
        for (const e1 of graph.allEdges) {
          for (const e2 of graph.allEdges) {
            if (e1.from === e2.to && e1.to === e2.from && e1.channelId !== e2.channelId) {
              out.push(e1.from, e1.to);
            }
          }
        }
        return uniqueSorted(out);
      }
      const left0 = new Set();
      const right1 = new Set();
      for (const e of graph.allEdges) {
        if (e.siteIdx === 0) left0.add(e.from);
        if (e.siteIdx === 1) right1.add(e.to);
      }
      return uniqueSorted(Array.from(left0).filter((id) => right1.has(id)));
    },
    explain(graph, params, sc, targets) {
      if (params.mode === 'opposing') {
        return {
          proof: `${formatNameList(targets)} appear in directly reversed A → B / B → A records.`,
          decisiveChannels: CHANNEL_IDS.slice(),
          rival: buildRival(targets, PATIENT_IDS, (id) => `${pName(id)} is never part of a directly reversed pair.`),
        };
      }
      const left0 = uniqueSorted(graph.allEdges.filter((e) => e.siteIdx === 0).map((e) => e.from));
      return {
        proof: `${formatNameList(targets)} invert roles—left side in ${sc.sites[0]} and right side in ${sc.sites[1]}.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, left0, (id) => `${pName(id)} appears on the left in ${sc.sites[0]} but never flips to the right in ${sc.sites[1]}.`),
      };
    },
  },

  // 12. True Structural Analogy / Cross-Domain Transfer / Analogical Abstraction (A_early:A_late :: B_early:B_late)
  'analogical-role-match': {
    usesWeights: true,
    usesMinutes: false,
    pickParams(rng) {
      return { sourceSite: rng() < 0.5 ? 0 : 1 };
    },
    order({ sourceSite }, sc) {
      const otherSite = 1 - sourceSite;
      return `Unit pattern match: inspect ${sc.sites[sourceSite]} first—is its EARLIEST record heavier (higher Weight) than its LATEST record? Apply that exact timing pattern to ${sc.sites[otherSite]} (pick right-side patients of ${sc.sites[otherSite]}'s EARLIEST record if front-loaded, or LATEST record if escalating).`;
    },
    detail({ sourceSite }, sc) {
      return `Compare Weight of ${sc.sites[sourceSite]}'s earliest vs latest record (front-loaded vs escalating), then select right-side patients of the matching earliest or latest record in ${sc.sites[1 - sourceSite]}.`;
    },
    evaluate(graph, { sourceSite }) {
      const srcRecs = graph.records.filter((r) => r.siteIdx === sourceSite).sort((a, b) => a.timeRank - b.timeRank);
      const tgtRecs = graph.records.filter((r) => r.siteIdx === 1 - sourceSite).sort((a, b) => a.timeRank - b.timeRank);
      if (!srcRecs.length || !tgtRecs.length) return [];
      const frontLoaded = srcRecs[0].weight > srcRecs[srcRecs.length - 1].weight;
      const chosen = frontLoaded ? tgtRecs[0] : tgtRecs[tgtRecs.length - 1];
      return graph.targetsOf(chosen.channelId);
    },
    explain(graph, { sourceSite }, sc, targets) {
      const targetSite = 1 - sourceSite;
      const srcRecs = graph.records.filter((r) => r.siteIdx === sourceSite).sort((a, b) => a.timeRank - b.timeRank);
      const tgtRecs = graph.records.filter((r) => r.siteIdx === targetSite).sort((a, b) => a.timeRank - b.timeRank);
      const sFirst = srcRecs[0];
      const sLast = srcRecs[srcRecs.length - 1];
      const frontLoaded = sFirst.weight > sLast.weight;
      const chosen = frontLoaded ? tgtRecs[0] : tgtRecs[tgtRecs.length - 1];
      const other = frontLoaded ? tgtRecs[tgtRecs.length - 1] : tgtRecs[0];
      return {
        proof: `In ${sc.sites[sourceSite]}, earliest ${sFirst.label} (+${sFirst.weight}) is ${frontLoaded ? 'heavier' : 'lighter'} than latest ${sLast.label} (+${sLast.weight}), so the ${frontLoaded ? 'front-loaded' : 'escalating'} pattern maps onto ${chosen.label} (${chosen.time}) in ${sc.sites[targetSite]}: ${formatNameList(targets)}.`,
        decisiveChannels: [sFirst.channelId, sLast.channelId, chosen.channelId],
        rival: buildRival(
          targets,
          [...graph.targetsOf(other.channelId), ...graph.sourcesOf(chosen.channelId)],
          (id) => `${pName(id)} comes from ${other.label} (the opposite temporal pole) or the initiating side of ${chosen.label}.`
        ),
      };
    },
  },

  // 13. Higher-Order Relational / Ontological (relationship between relationships: compare the 2 earliest records)
  'higher-order-relation': {
    usesWeights: false,
    pickParams() {
      return {};
    },
    order() {
      return `Opening-unit check: compare the two EARLIEST records (01:00 and 02:00). If they share the SAME Unit, select right-side patients of 01:00; if they are in DIFFERENT Units, select right-side patients of 02:00.`;
    },
    detail() {
      return `First evaluate the relationship between the 01:00 and 02:00 records (same Unit vs different Units), then select from the resulting record.`;
    },
    evaluate(graph) {
      const r0 = graph.records.find((r) => r.timeRank === 0);
      const r1 = graph.records.find((r) => r.timeRank === 1);
      if (!r0 || !r1) return [];
      const sameUnit = r0.siteIdx === r1.siteIdx;
      return graph.targetsOf(sameUnit ? r0.channelId : r1.channelId);
    },
    explain(graph, _params, _sc, targets) {
      const r0 = graph.records.find((r) => r.timeRank === 0);
      const r1 = graph.records.find((r) => r.timeRank === 1);
      const sameUnit = r0.siteIdx === r1.siteIdx;
      const chosen = sameUnit ? r0 : r1;
      const other = sameUnit ? r1 : r0;
      return {
        proof: `01:00 (${r0.site}) and 02:00 (${r1.site}) are in ${sameUnit ? 'the SAME unit' : 'DIFFERENT units'}, selecting right-side patients of ${chosen.label} (${formatNameList(targets)}).`,
        decisiveChannels: [r0.channelId, r1.channelId],
        rival: buildRival(targets, graph.targetsOf(other.channelId), (id) => `${pName(id)} comes from ${other.label}, the unselected half of the unit comparison.`),
      };
    },
  },

  // 14. Hierarchical / First-Principles Dominance (initiates >= 1, receives 0 across the entire board)
  'hierarchical-rank': {
    usesWeights: false,
    pickParams(rng) {
      return { dir: rng() < 0.5 ? 'top' : 'bottom' };
    },
    order({ dir }) {
      return dir === 'top'
        ? `Ward role scan: find pure initiators—patients who appear on the LEFT side at least once, and NEVER on the right side anywhere on the board.`
        : `Ward role scan: find pure recipients—patients who appear on the RIGHT side at least once, and NEVER on the left side anywhere on the board.`;
    },
    detail({ dir }) {
      return dir === 'top'
        ? `Scan all 6 records: select patients with ≥ 1 left-side entry and 0 right-side entries.`
        : `Scan all 6 records: select patients with ≥ 1 right-side entry and 0 left-side entries.`;
    },
    evaluate(graph, { dir }) {
      return uniqueSorted(
        PATIENT_IDS.filter((id) => {
          const outN = graph.outEdges(id).length;
          const inN = graph.inEdges(id).length;
          return dir === 'top' ? outN >= 1 && inN === 0 : inN >= 1 && outN === 0;
        })
      );
    },
    explain(graph, { dir }, _sc, targets) {
      const mixed = PATIENT_IDS.filter((id) => graph.outEdges(id).length >= 1 && graph.inEdges(id).length >= 1);
      return {
        proof:
          dir === 'top'
            ? `${formatNameList(targets)} appear exclusively on the initiating (left) side with zero incoming arrows.`
            : `${formatNameList(targets)} appear exclusively on the receiving (right) side with zero outgoing arrows.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, mixed, (id) => `${pName(id)} appears on both left and right sides, so they are not a pure ${dir === 'top' ? 'top-level initiator' : 'terminal recipient'}.`),
      };
    },
  },

  // 15. Spatial Bay Adjacency & Row Geometry (Spatial reasoning, Lateral reasoning)
  'spatial-bay-adjacency': {
    usesWeights: false,
    pickParams(rng, graph) {
      // Check if any record connects patients in the SAME bay row (Upper 1-5 vs Lower 6-10)
      const ch = CHANNEL_IDS[Math.floor(rng() * CHANNEL_IDS.length)];
      const row = rng() < 0.5 ? 'upper' : 'lower';
      return { ch, row };
    },
    order({ ch, row }, sc) {
      const rowLabel = row === 'upper' ? 'UPPER Resuscitation Row (Bays 1–5)' : 'LOWER Intake Row (Bays 6–10)';
      return `Ward floor check: look at the physical monitor layout and select every patient named in ${chLabel(sc, ch)} who occupies the ${rowLabel}.`;
    },
    detail({ ch, row }, sc) {
      return `Check ${chLabel(sc, ch)}, then look up at the bay numbers on the ward monitor—keep only patients in ${row === 'upper' ? 'Bays 1–5 (Nadia–Maren)' : 'Bays 6–10 (Tomas–Rory)'}.`;
    },
    evaluate(graph, { ch, row }) {
      return graph.patientsIn(ch).filter((id) => {
        const bay = pBayNum(id);
        return row === 'upper' ? bay <= 5 : bay >= 6;
      });
    },
    explain(graph, { ch, row }, sc, targets) {
      const allCh = graph.patientsIn(ch);
      const otherRow = allCh.filter((id) => !targets.includes(id));
      return {
        proof: `Among patients in ${chLabel(sc, ch)} (${formatNameList(allCh)}), only ${formatNameList(targets)} sit in the ${row === 'upper' ? 'Upper Row (Bays 1–5)' : 'Lower Row (Bays 6–10)'}.`,
        decisiveChannels: [ch],
        rival: buildRival(targets, otherRow, (id) => `${pName(id)} is in Bay ${pBayNum(id)}, on the opposite row of the trauma floor.`),
      };
    },
  },

  // 16. Temporal Earliest / Latest Baseline (Temporal, Extrapolative)
  'temporal-earliest-latest': {
    usesWeights: false,
    pickParams(rng) {
      return { which: rng() < 0.5 ? 'earliest' : 'latest', side: rng() < 0.5 ? 'from' : 'to' };
    },
    order({ which, side }) {
      const clock = which === 'earliest' ? 'EARLIEST record (01:00)' : 'LATEST record (06:00)';
      return `Timeline check: locate the ${clock} and select the patients on its ${side === 'from' ? 'initiating (left)' : 'receiving (right)'} side.`;
    },
    detail({ which }) {
      return `Sort by the Time column first—the ${which === 'earliest' ? '01:00 opening baseline' : '06:00 latest update'} governs this call.`;
    },
    evaluate(graph, { which, side }) {
      const rank = which === 'earliest' ? 0 : 5;
      const rec = graph.records.find((r) => r.timeRank === rank);
      if (!rec) return [];
      return side === 'from' ? graph.sourcesOf(rec.channelId) : graph.targetsOf(rec.channelId);
    },
    explain(graph, { which, side }, _sc, targets) {
      const rank = which === 'earliest' ? 0 : 5;
      const rec = graph.records.find((r) => r.timeRank === rank);
      const neighbor = graph.records.find((r) => r.timeRank === (which === 'earliest' ? 1 : 4));
      return {
        proof: `${rec.label} (${rec.time}) is the ${which} record, placing ${formatNameList(targets)} on its ${side === 'from' ? 'left' : 'right'} side.`,
        decisiveChannels: [rec.channelId],
        rival: buildRival(
          targets,
          [...(side === 'from' ? graph.targetsOf(rec.channelId) : graph.sourcesOf(rec.channelId)), ...graph.patientsIn(neighbor.channelId)],
          (id) =>
            graph.patientsIn(rec.channelId).includes(id)
              ? `${pName(id)} is on the opposite side of ${rec.label}.`
              : `${pName(id)} appears in a different timestamp (${neighbor.time}).`
        ),
      };
    },
  },

  // 17. Temporal Strictly-Forward Cascade (Predictive, Prognostic, Narrative)
  'temporal-strict-cascade': {
    usesWeights: false,
    pickParams(rng, graph) {
      const pairs = [];
      for (const a of CHANNEL_IDS) {
        for (const b of CHANNEL_IDS) {
          if (a === b) continue;
          const relays = graph.twoHopRelays({ fromChannel: a, toChannel: b, requireAfter: true, distinctEnds: true });
          const ends = uniqueSorted(relays.map((r) => r.end));
          if (ends.length >= 1 && ends.length <= 3) pairs.push({ chA: a, chB: b });
        }
      }
      if (pairs.length) return pairs[Math.floor(rng() * pairs.length)];
      // Fallback: compare two channels and take later one's targets
      const [chA, chB] = pickTwoDistinctChannels(rng);
      return { chA, chB, compareOnly: true };
    },
    order(params, sc) {
      if (params.compareOnly) {
        return `Progression check: compare ${chLabel(sc, params.chA)} and ${chLabel(sc, params.chB)} — select right-side patients from whichever occurred LATER.`;
      }
      return `Progression check: trace a strictly forward-in-time chain from ${chLabel(sc, params.chA)} into ${chLabel(sc, params.chB)} (A → M → B, A ≠ B) and select the next affected patient(s) B.`;
    },
    detail(params, sc) {
      if (params.compareOnly) {
        return `Check timestamps on ${chLabel(sc, params.chA)} and ${chLabel(sc, params.chB)}; the later event predicts current status.`;
      }
      return `Verify ${chLabel(sc, params.chB)} happened AFTER ${chLabel(sc, params.chA)}, then trace A → M → B and select B.`;
    },
    evaluate(graph, params) {
      if (params.compareOnly) {
        const later = graph.timeRankOf(params.chA) > graph.timeRankOf(params.chB) ? params.chA : params.chB;
        return graph.targetsOf(later);
      }
      return uniqueSorted(
        graph.twoHopRelays({ fromChannel: params.chA, toChannel: params.chB, requireAfter: true, distinctEnds: true }).map((r) => r.end)
      );
    },
    explain(graph, params, sc, targets) {
      if (params.compareOnly) {
        const later = graph.timeRankOf(params.chA) > graph.timeRankOf(params.chB) ? params.chA : params.chB;
        const earlier = later === params.chA ? params.chB : params.chA;
        return {
          proof: `${chLabel(sc, later)} (${graph.byChannel[later].record.time}) followed ${chLabel(sc, earlier)} (${graph.byChannel[earlier].record.time}), pointing to ${formatNameList(targets)}.`,
          decisiveChannels: [params.chA, params.chB],
          rival: buildRival(targets, graph.targetsOf(earlier), (id) => `${pName(id)} is from the earlier ${chLabel(sc, earlier)} record.`),
        };
      }
      const relays = graph.twoHopRelays({ fromChannel: params.chA, toChannel: params.chB, requireAfter: true, distinctEnds: true });
      const desc = relays.map((r) => `${pName(r.start)} → ${pName(r.mid)} → ${pName(r.end)}`).join('; ');
      return {
        proof: `Chronological progression (${graph.byChannel[params.chA].record.time} → ${graph.byChannel[params.chB].record.time}): ${desc}.`,
        decisiveChannels: [params.chA, params.chB],
        rival: buildRival(targets, [...relays.map((r) => r.mid), ...graph.targetsOf(params.chB)], (id) =>
          `${pName(id)} is not the downstream end of the forward-moving chain.`
        ),
      };
    },
  },

  // 18. Bayesian / Probabilistic / Proportional / Mathematical / Risk / Optimisation / Decision-Theoretic Weighted Scoring
  'bayesian-update': {
    usesWeights: true,
    pickParams(rng, graph) {
      // Compute each patient's total receiving-side clinical weight across all 6 records
      const scores = PATIENT_IDS.map((id) => ({
        id,
        score: graph.inEdges(id).reduce((sum, e) => sum + graph.byChannel[e.channelId].record.weight, 0),
      }));
      // Find a clean threshold T where 1..4 patients have score >= T
      const uniqueScores = Array.from(new Set(scores.map((s) => s.score))).sort((a, b) => b - a);
      for (const th of uniqueScores) {
        if (th < 4) continue;
        const hits = scores.filter((s) => s.score >= th);
        if (hits.length >= 1 && hits.length <= 4) {
          return { threshold: th };
        }
      }
      return { threshold: 5 };
    },
    order({ threshold }) {
      return `Acuity tally: add the Weight (+1 to +6) of every record where a patient appears on the receiving (right) side, and treat everyone totaling ≥ ${threshold}.`;
    },
    detail({ threshold }) {
      return `Look at the Weight (+1..+6) beside each record. Add the weights of all records pointing to a patient (right side) — act if total ≥ ${threshold}.`;
    },
    evaluate(graph, { threshold }) {
      return uniqueSorted(
        PATIENT_IDS.filter((id) => {
          const total = graph.inEdges(id).reduce((sum, e) => sum + graph.byChannel[e.channelId].record.weight, 0);
          return total >= threshold;
        })
      );
    },
    explain(graph, { threshold }, _sc, targets) {
      const totals = Object.fromEntries(
        PATIENT_IDS.map((id) => [
          id,
          graph.inEdges(id).reduce((sum, e) => sum + graph.byChannel[e.channelId].record.weight, 0),
        ])
      );
      const summary = targets.map((id) => `${pName(id)} (+${totals[id]})`).join(', ');
      const below = PATIENT_IDS.filter((id) => totals[id] < threshold && totals[id] > 0).sort(
        (a, b) => totals[b] - totals[a]
      );
      return {
        proof: `Summing right-side clinical weights against threshold ≥ ${threshold} selects ${summary}.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, below, (id) => `${pName(id)}'s updated weight total is +${totals[id]}, below the ≥ ${threshold} action threshold.`),
      };
    },
  },

  // 19. Counterfactual / Hypothetical Sole Support ("but-for" cause)
  'counterfactual-sole-cause': {
    usesWeights: false,
    pickParams(rng, graph) {
      const valid = [];
      for (const keyCh of CHANNEL_IDS) {
        const sole = graph.targetsOf(keyCh).filter((id) => graph.inEdges(id).every((e) => e.channelId === keyCh));
        if (sole.length >= 1 && sole.length <= 4) valid.push({ keyCh });
      }
      return valid.length ? valid[Math.floor(rng() * valid.length)] : { keyCh: 'vitals' };
    },
    order({ keyCh }, sc) {
      return `Single-source check: if ${chLabel(sc, keyCh)} had NEVER run, which of its right-side patients would have ZERO other right-side flags anywhere on the board?`;
    },
    detail({ keyCh }, sc) {
      return `Check every right-side patient in ${chLabel(sc, keyCh)} and eliminate anyone who also appears on the right side of another record.`;
    },
    evaluate(graph, { keyCh }) {
      return graph.targetsOf(keyCh).filter((id) => graph.inEdges(id).every((e) => e.channelId === keyCh));
    },
    explain(graph, { keyCh }, sc, targets) {
      const backed = graph.targetsOf(keyCh).filter((id) => !targets.includes(id));
      return {
        proof: `Without ${chLabel(sc, keyCh)}, ${formatNameList(targets)} lose their sole receiving-side clinical flag.`,
        decisiveChannels: [keyCh],
        rival: buildRival(targets, backed, (id) => `${pName(id)} still has another receiving-side flag even if ${chLabel(sc, keyCh)} is removed.`),
      };
    },
  },

  // 20. Independent Corroboration (Differential Diagnosis, Evidential, Synthetic)
  'independent-corroboration': {
    usesWeights: false,
    pickParams(rng) {
      return { role: rng() < 0.5 ? 'to' : 'from' };
    },
    order({ role }) {
      const side = role === 'to' ? 'receiving (right)' : 'initiating (left)';
      return `Independent confirmation: select every patient confirmed on the ${side} side by at least TWO DIFFERENT records with DIFFERENT clinical partners.`;
    },
    detail({ role }) {
      return `Require two separate records on the ${role === 'to' ? 'right' : 'left'} side paired with two distinct partners (identical partner echoes do not count).`;
    },
    evaluate(graph, { role }) {
      return uniqueSorted(
        PATIENT_IDS.filter((id) => {
          const edges = role === 'to' ? graph.inEdges(id) : graph.outEdges(id);
          const chans = new Set(edges.map((e) => e.channelId));
          const partners = new Set(edges.map((e) => (role === 'to' ? e.from : e.to)));
          return chans.size >= 2 && partners.size >= 2;
        })
      );
    },
    explain(graph, { role }, _sc, targets) {
      const singles = PATIENT_IDS.filter((id) => {
        const edges = role === 'to' ? graph.inEdges(id) : graph.outEdges(id);
        return edges.length >= 1 && !targets.includes(id);
      });
      return {
        proof: `${formatNameList(targets)} have independent confirmation across ≥ 2 separate records with distinct partners.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, singles, (id) => `${pName(id)} lacks two independent records with distinct partners on that side.`),
      };
    },
  },

  // 21. Epistemic / Critical Tainted Source Filter
  'tainted-source-filter': {
    usesWeights: false,
    pickParams(rng) {
      const [taintedCh, trustedCh] = pickTwoDistinctChannels(rng);
      return { taintedCh, trustedCh };
    },
    order({ taintedCh, trustedCh }, sc) {
      return `Record quarantine: ${chLabel(sc, taintedCh)} is compromised—set aside anyone named in it. Act on right-side patients of ${chLabel(sc, trustedCh)} who stay uncontaminated.`;
    },
    detail({ taintedCh, trustedCh }, sc) {
      return `Discard anyone appearing on either side of compromised ${chLabel(sc, taintedCh)}; keep clean right-side patients of ${chLabel(sc, trustedCh)}.`;
    },
    evaluate(graph, { taintedCh, trustedCh }) {
      const tainted = new Set(graph.patientsIn(taintedCh));
      return graph.targetsOf(trustedCh).filter((id) => !tainted.has(id));
    },
    explain(graph, { taintedCh, trustedCh }, sc, targets) {
      const tainted = graph.patientsIn(taintedCh);
      const dropped = graph.targetsOf(trustedCh).filter((id) => tainted.includes(id));
      return {
        proof: `Quarantining ${chLabel(sc, taintedCh)} removes tainted overlaps from ${chLabel(sc, trustedCh)}, leaving ${formatNameList(targets)}.`,
        decisiveChannels: [trustedCh, taintedCh],
        rival: buildRival(targets, dropped.length ? dropped : tainted, (id) => `${pName(id)} is contaminated by compromised ${chLabel(sc, taintedCh)}.`),
      };
    },
  },

  // 22. Non-Monotonic / Reflective / Hypothetico-Deductive Revision
  'non-monotonic-revision': {
    usesWeights: false,
    pickParams(rng) {
      return { side: rng() < 0.5 ? 'to' : 'from' };
    },
    order({ side }) {
      const sideText = side === 'to' ? 'right' : 'left';
      return `Updated chart review: form an initial list from the ${sideText} side of the 01:00 and 02:00 records, then WITHDRAW anyone contradicted by appearing anywhere in the 05:00 or 06:00 records.`;
    },
    detail({ side }) {
      return `Take provisional candidates from 01:00–02:00 (${side} side), then retract anyone who shows up in the later 05:00–06:00 evidence.`;
    },
    evaluate(graph, { side }) {
      const early = graph.records.filter((r) => r.timeRank <= 1);
      const late = graph.records.filter((r) => r.timeRank >= 4);
      const initial = uniqueSorted(
        early.flatMap((r) => (side === 'to' ? graph.targetsOf(r.channelId) : graph.sourcesOf(r.channelId)))
      );
      const withdrawn = new Set(late.flatMap((r) => graph.patientsIn(r.channelId)));
      return initial.filter((id) => !withdrawn.has(id));
    },
    explain(graph, { side }, _sc, targets) {
      const early = graph.records.filter((r) => r.timeRank <= 1);
      const late = graph.records.filter((r) => r.timeRank >= 4);
      const initial = uniqueSorted(
        early.flatMap((r) => (side === 'to' ? graph.targetsOf(r.channelId) : graph.sourcesOf(r.channelId)))
      );
      const retracted = initial.filter((id) => !targets.includes(id));
      return {
        proof: `Early provisional cases (${formatNameList(initial)}) minus patients retracted by 05:00–06:00 evidence leave ${formatNameList(targets)}.`,
        decisiveChannels: [...early.map((r) => r.channelId), ...late.map((r) => r.channelId)],
        rival: buildRival(targets, retracted, (id) => `${pName(id)} was provisionally flagged early, then withdrawn by newer 05:00–06:00 evidence.`),
      };
    },
  },

  // 23. Game-Theoretic / Strategic / Perspectival Multi-Team Allocation
  'game-theoretic-triage': {
    usesWeights: false,
    pickParams(rng) {
      return { rivalSite: rng() < 0.5 ? 0 : 1 };
    },
    order({ rivalSite }, sc) {
      return `Multi-team coordination: another surgical team automatically covers every patient in the EARLIEST record of ${sc.sites[rivalSite]}. Cover the right-side patients of the EARLIEST record of ${sc.sites[1 - rivalSite]} NOT already taken by that team.`;
    },
    detail({ rivalSite }, sc) {
      return `Find who the other team takes (earliest record in ${sc.sites[rivalSite]}), then pick uncovered right-side patients from the earliest record in ${sc.sites[1 - rivalSite]}.`;
    },
    evaluate(graph, { rivalSite }) {
      const otherTeamRec = graph.records
        .filter((r) => r.siteIdx === rivalSite)
        .sort((a, b) => a.timeRank - b.timeRank)[0];
      const ourRec = graph.records
        .filter((r) => r.siteIdx === 1 - rivalSite)
        .sort((a, b) => a.timeRank - b.timeRank)[0];
      if (!otherTeamRec || !ourRec) return [];
      const taken = new Set(graph.patientsIn(otherTeamRec.channelId));
      return graph.targetsOf(ourRec.channelId).filter((id) => !taken.has(id));
    },
    explain(graph, { rivalSite }, sc, targets) {
      const otherTeamRec = graph.records
        .filter((r) => r.siteIdx === rivalSite)
        .sort((a, b) => a.timeRank - b.timeRank)[0];
      const ourRec = graph.records
        .filter((r) => r.siteIdx === 1 - rivalSite)
        .sort((a, b) => a.timeRank - b.timeRank)[0];
      const taken = graph.patientsIn(otherTeamRec.channelId);
      return {
        proof: `The other team covers ${otherTeamRec.label} (${formatNameList(taken)}); uncovered right-side patients in ${ourRec.label} are ${formatNameList(targets)}.`,
        decisiveChannels: [otherTeamRec.channelId, ourRec.channelId],
        rival: buildRival(targets, taken, (id) => `${pName(id)} is already covered by the other team's move on ${otherTeamRec.label}.`),
      };
    },
  },

  // 24. Mentalistic / Ethical / Semantic Proxy Precedence
  'mentalistic-proxy': {
    usesWeights: false,
    pickParams(rng) {
      const [chA, chB] = pickTwoDistinctChannels(rng);
      return { chA, chB };
    },
    order({ chA, chB }, sc, meta) {
      if (meta.id === 'ethical-reasoning') {
        return `Superseding directive: between ${chLabel(sc, chA)} and ${chLabel(sc, chB)}, the MORE RECENT record overrides the older directive. Select the right-side patients of the later record.`;
      }
      if (meta.id === 'mentalistic-reasoning') {
        return `Family update check: families briefed earlier may hold outdated assumptions—select the right-side patients of whichever of ${chLabel(sc, chA)} or ${chLabel(sc, chB)} was updated MORE RECENTLY.`;
      }
      return `Latest-record call: compare ${chLabel(sc, chA)} and ${chLabel(sc, chB)}—select the receiving (right-side) patients named in the LATER record.`;
    },
    detail({ chA, chB }, sc) {
      return `Compare timestamps on ${chLabel(sc, chA)} and ${chLabel(sc, chB)}; follow the later record's receiving (right) side.`;
    },
    evaluate(graph, { chA, chB }) {
      const later = graph.timeRankOf(chA) > graph.timeRankOf(chB) ? chA : chB;
      return graph.targetsOf(later);
    },
    explain(graph, { chA, chB }, sc, targets) {
      const later = graph.timeRankOf(chA) > graph.timeRankOf(chB) ? chA : chB;
      const earlier = later === chA ? chB : chA;
      return {
        proof: `${chLabel(sc, later)} (${graph.byChannel[later].record.time}) supersedes older ${chLabel(sc, earlier)} (${graph.byChannel[earlier].record.time}), selecting ${formatNameList(targets)}.`,
        decisiveChannels: [later, earlier],
        rival: buildRival(targets, graph.targetsOf(earlier), (id) => `${pName(id)} is from superseded earlier record ${chLabel(sc, earlier)}.`),
      };
    },
  },

  // 25. Combinatorial / Divergent / Generative Cross-Unit Pairing
  'combinatorial-pair': {
    usesWeights: false,
    pickParams(rng) {
      return { role: rng() < 0.5 ? 'to' : 'from' };
    },
    order({ role }, sc) {
      const side = role === 'to' ? 'receiving (right)' : 'initiating (left)';
      return `Cross-unit overlap: find every patient who appears on the ${side} side in BOTH ${sc.sites[0]} AND ${sc.sites[1]}.`;
    },
    detail(_, sc) {
      return `Combine across both units: a patient must appear on that side in at least one ${sc.sites[0]} record and at least one ${sc.sites[1]} record.`;
    },
    evaluate(graph, { role }) {
      const s0 = new Set();
      const s1 = new Set();
      for (const rec of graph.records) {
        const list = role === 'to' ? graph.targetsOf(rec.channelId) : graph.sourcesOf(rec.channelId);
        for (const id of list) {
          if (rec.siteIdx === 0) s0.add(id);
          else s1.add(id);
        }
      }
      return uniqueSorted(Array.from(s0).filter((id) => s1.has(id)));
    },
    explain(graph, { role }, sc, targets) {
      const all = uniqueSorted(graph.allEdges.map((e) => (role === 'to' ? e.to : e.from)));
      return {
        proof: `${formatNameList(targets)} bridge both ${sc.sites[0]} and ${sc.sites[1]} on the ${role === 'to' ? 'right' : 'left'} side.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, all, (id) => `${pName(id)} only appears on that side in a single unit, not both.`),
      };
    },
  },

  // 26. Contextual Dual-Site Scope (Contextual reasoning)
  'dual-site-scope': {
    usesWeights: false,
    pickParams(rng) {
      return { siteIdx: rng() < 0.5 ? 0 : 1 };
    },
    order({ siteIdx }, sc) {
      return `Unit-only review (${sc.sites[siteIdx]} ONLY): select every patient appearing in at least TWO records tagged ${sc.sites[siteIdx]}.`;
    },
    detail({ siteIdx }, sc) {
      return `Ignore ${sc.sites[1 - siteIdx]} entirely—count only records inside ${sc.sites[siteIdx]}.`;
    },
    evaluate(graph, { siteIdx }) {
      const counts = new Map();
      for (const rec of graph.records) {
        if (rec.siteIdx !== siteIdx) continue;
        for (const id of graph.patientsIn(rec.channelId)) {
          counts.set(id, (counts.get(id) || 0) + 1);
        }
      }
      return uniqueSorted(Array.from(counts.entries()).filter(([, n]) => n >= 2).map(([id]) => id));
    },
    explain(graph, { siteIdx }, sc, targets) {
      const siteRecs = graph.records.filter((r) => r.siteIdx === siteIdx);
      const otherRecs = graph.records.filter((r) => r.siteIdx !== siteIdx);
      const otherCounts = new Map();
      for (const r of otherRecs) {
        for (const id of graph.patientsIn(r.channelId)) otherCounts.set(id, (otherCounts.get(id) || 0) + 1);
      }
      const otherRepeats = Array.from(otherCounts.entries()).filter(([, n]) => n >= 2).map(([id]) => id);
      return {
        proof: `Inside ${sc.sites[siteIdx]}, ${formatNameList(targets)} appear in ≥ 2 records.`,
        decisiveChannels: siteRecs.map((r) => r.channelId),
        rival: buildRival(targets, otherRepeats, (id) => `${pName(id)} repeats inside ${sc.sites[1 - siteIdx]}, outside the ${sc.sites[siteIdx]} context.`),
      };
    },
  },

  // 27. Structural Pivot (Abstract & Structural reasoning)
  'structural-pivot': {
    usesWeights: false,
    pickParams(rng) {
      return { siteIdx: rng() < 0.5 ? 0 : 1 };
    },
    order({ siteIdx }, sc) {
      return `Dual-role check: inside ${sc.sites[siteIdx]} ONLY, select every patient who acts as BOTH initiator (left) AND recipient (right).`;
    },
    detail({ siteIdx }, sc) {
      return `Look strictly at ${sc.sites[siteIdx]} records—find anyone who appears at least once on the left and at least once on the right.`;
    },
    evaluate(graph, { siteIdx }) {
      const left = new Set();
      const right = new Set();
      for (const rec of graph.records) {
        if (rec.siteIdx !== siteIdx) continue;
        for (const e of graph.edgesOf(rec.channelId)) {
          left.add(e.from);
          right.add(e.to);
        }
      }
      return uniqueSorted(Array.from(left).filter((id) => right.has(id)));
    },
    explain(graph, { siteIdx }, sc, targets) {
      const siteRecs = graph.records.filter((r) => r.siteIdx === siteIdx);
      const allSite = uniqueSorted(siteRecs.flatMap((r) => graph.patientsIn(r.channelId)));
      return {
        proof: `Inside ${sc.sites[siteIdx]}, ${formatNameList(targets)} bridge both the left and right roles.`,
        decisiveChannels: siteRecs.map((r) => r.channelId),
        rival: buildRival(targets, allSite, (id) => `${pName(id)} appears on only one side inside ${sc.sites[siteIdx]}.`),
      };
    },
  },

  // 28. Level 3 Meta-Reasoning: Choose WHICH reasoning method applies before executing it! (Metacognitive & Integrative)
  'meta-method-choice': {
    usesWeights: false,
    pickParams(rng) {
      const [chA, chB] = pickTwoDistinctChannels(rng);
      return { chA, chB };
    },
    order({ chA, chB }, sc) {
      return `Protocol selector: FIRST inspect 01:00. If 01:00 is in ${sc.sites[0]}, select patients in ${chLabel(sc, chA)} EXCEPT ${chLabel(sc, chB)}; if 01:00 is in ${sc.sites[1]}, select the right side of 01:00.`;
    },
    detail() {
      return `Check 01:00's Unit first to determine which ward protocol governs this shift, then apply that exact rule.`;
    },
    evaluate(graph, { chA, chB }) {
      const earliest = graph.records.find((r) => r.timeRank === 0);
      if (!earliest) return [];
      if (earliest.siteIdx === 0) {
        const excl = new Set(graph.patientsIn(chB));
        return graph.patientsIn(chA).filter((id) => !excl.has(id));
      }
      return graph.targetsOf(earliest.channelId);
    },
    explain(graph, { chA, chB }, sc, targets) {
      const earliest = graph.records.find((r) => r.timeRank === 0);
      const usedElim = earliest.siteIdx === 0;
      const otherBranch = usedElim
        ? graph.targetsOf(earliest.channelId)
        : graph.patientsIn(chA).filter((id) => !graph.patientsIn(chB).includes(id));
      return {
        proof: `01:00 (${earliest.label}) is in ${earliest.site}, so you select the ${
          usedElim ? `Elimination method (${chLabel(sc, chA)} minus ${chLabel(sc, chB)})` : `Chronological Baseline method (right side of ${earliest.label})`
        }, yielding ${formatNameList(targets)}.`,
        decisiveChannels: usedElim ? [earliest.channelId, chA, chB] : [earliest.channelId],
        rival: buildRival(targets, otherBranch, (id) => `${pName(id)} would only be chosen if you picked the wrong reasoning method for 01:00's unit.`),
      };
    },
  },

  // 29. Multi-Stage Differential Diagnosis Synthesis (Exclude rule-out + Confirm via Weight threshold)
  'differential-synthesis': {
    usesWeights: true,
    usesMinutes: false,
    pickParams(rng, graph) {
      const candidates = [];
      for (const ruleOutCh of CHANNEL_IDS) {
        const excluded = new Set(graph.patientsIn(ruleOutCh));
        const totals = PATIENT_IDS.map((id) => ({
          id,
          score: excluded.has(id)
            ? 0
            : graph.inEdges(id).reduce((sum, e) => sum + graph.byChannel[e.channelId].record.weight, 0),
        }));
        const unique = Array.from(new Set(totals.map((t) => t.score))).sort((a, b) => b - a);
        for (const threshold of unique) {
          if (threshold < 4) continue;
          const hits = totals.filter((t) => t.score >= threshold);
          if (hits.length >= 1 && hits.length <= 3) {
            candidates.push({ ruleOutCh, threshold });
          }
        }
      }
      return candidates.length
        ? candidates[Math.floor(rng() * candidates.length)]
        : { ruleOutCh: 'labs', threshold: 5 };
    },
    order({ ruleOutCh, threshold }, sc) {
      return `Two-step workup: FIRST rule out everyone named in ${chLabel(sc, ruleOutCh)}; among the remaining patients, sum right-side Weights and intervene for anyone reaching ≥ ${threshold}.`;
    },
    detail({ ruleOutCh, threshold }, sc) {
      return `Eliminate any patient appearing in ${chLabel(sc, ruleOutCh)}, then confirm survivors whose right-side Weight total is ≥ ${threshold}.`;
    },
    evaluate(graph, { ruleOutCh, threshold }) {
      const excluded = new Set(graph.patientsIn(ruleOutCh));
      return uniqueSorted(
        PATIENT_IDS.filter((id) => {
          if (excluded.has(id)) return false;
          const total = graph.inEdges(id).reduce((sum, e) => sum + graph.byChannel[e.channelId].record.weight, 0);
          return total >= threshold;
        })
      );
    },
    explain(graph, { ruleOutCh, threshold }, sc, targets) {
      const excluded = new Set(graph.patientsIn(ruleOutCh));
      const totals = Object.fromEntries(
        PATIENT_IDS.map((id) => [
          id,
          graph.inEdges(id).reduce((sum, e) => sum + graph.byChannel[e.channelId].record.weight, 0),
        ])
      );
      const ruledOutHigh = PATIENT_IDS.filter((id) => excluded.has(id) && totals[id] >= threshold);
      const below = PATIENT_IDS.filter((id) => !excluded.has(id) && totals[id] < threshold && totals[id] > 0).sort(
        (a, b) => totals[b] - totals[a]
      );
      return {
        proof: `Ruling out ${chLabel(sc, ruleOutCh)} and requiring right-side Weight ≥ ${threshold} confirms ${targets.map((id) => `${pName(id)} (+${totals[id]})`).join(', ')}.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, ruledOutHigh.length ? ruledOutHigh : below, (id) =>
          excluded.has(id)
            ? `${pName(id)} had weight +${totals[id]} but was ruled out by ${chLabel(sc, ruleOutCh)}.`
            : `${pName(id)} survived elimination but only reached +${totals[id]} (below ≥ ${threshold}).`
        ),
      };
    },
  },

  // 30. True Bayesian Prior -> Posterior Update (01:00-02:00 Prior + 03:00-06:00 New Evidence)
  'bayesian-prior-posterior': {
    usesWeights: true,
    usesMinutes: false,
    pickParams(rng, graph) {
      const rows = PATIENT_IDS.map((id) => {
        const edges = graph.inEdges(id);
        const prior = edges
          .filter((e) => graph.byChannel[e.channelId].record.timeRank <= 1)
          .reduce((s, e) => s + graph.byChannel[e.channelId].record.weight, 0);
        const update = edges
          .filter((e) => graph.byChannel[e.channelId].record.timeRank >= 2)
          .reduce((s, e) => s + graph.byChannel[e.channelId].record.weight, 0);
        return { id, prior, update, posterior: prior + update };
      });
      const unique = Array.from(new Set(rows.map((r) => r.posterior))).sort((a, b) => b - a);
      for (const threshold of unique) {
        if (threshold < 5) continue;
        const hits = rows.filter((r) => r.posterior >= threshold);
        // Prefer thresholds where new evidence (03:00-06:00) meaningfully shifts at least one winner
        if (hits.length >= 1 && hits.length <= 3 && hits.some((h) => h.update > 0)) {
          return { threshold };
        }
      }
      return { threshold: 6 };
    },
    order({ threshold }) {
      return `Baseline & update: start with each patient's opening acuity (right-side Weight in 01:00–02:00), then add new findings (right-side Weight in 03:00–06:00). Act if updated total ≥ ${threshold}.`;
    },
    detail({ threshold }) {
      return `Combine early baseline (01:00–02:00) + newer findings (03:00–06:00) on the right side. Don't anchor on early readings alone—act when updated total ≥ ${threshold}.`;
    },
    evaluate(graph, { threshold }) {
      return uniqueSorted(
        PATIENT_IDS.filter((id) => {
          const post = graph.inEdges(id).reduce((s, e) => s + graph.byChannel[e.channelId].record.weight, 0);
          return post >= threshold;
        })
      );
    },
    explain(graph, { threshold }, _sc, targets) {
      const stats = Object.fromEntries(
        PATIENT_IDS.map((id) => {
          const edges = graph.inEdges(id);
          const prior = edges
            .filter((e) => graph.byChannel[e.channelId].record.timeRank <= 1)
            .reduce((s, e) => s + graph.byChannel[e.channelId].record.weight, 0);
          const update = edges
            .filter((e) => graph.byChannel[e.channelId].record.timeRank >= 2)
            .reduce((s, e) => s + graph.byChannel[e.channelId].record.weight, 0);
          return [id, { prior, update, posterior: prior + update }];
        })
      );
      const breakdown = targets
        .map((id) => `${pName(id)} (Prior +${stats[id].prior} + New +${stats[id].update} = +${stats[id].posterior})`)
        .join('; ');
      const priorOnlyRivals = PATIENT_IDS.filter((id) => !targets.includes(id) && stats[id].prior > 0).sort(
        (a, b) => stats[b].prior - stats[a].prior
      );
      const below = PATIENT_IDS.filter((id) => !targets.includes(id) && stats[id].posterior > 0).sort(
        (a, b) => stats[b].posterior - stats[a].posterior
      );
      return {
        proof: `Updating priors with 03:00–06:00 evidence against threshold ≥ ${threshold}: ${breakdown}.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, priorOnlyRivals.length ? priorOnlyRivals : below, (id) =>
          `${pName(id)} started with Prior +${stats[id].prior} and New +${stats[id].update}, totaling +${stats[id].posterior} (below ≥ ${threshold}).`
        ),
      };
    },
  },

  // 31. Proportional Ratio Triage (Severity >= 2 x Minutes)
  'proportional-ratio': {
    usesWeights: true,
    usesMinutes: true,
    pickParams() {
      return { ratio: 2 };
    },
    order() {
      return `Severity-to-time check: inspect Severity Weight (+1..+6) vs Procedure Time (1m..6m). Select right-side patients ONLY from records where Severity is at least DOUBLE the Minutes (Weight ≥ 2 × Min).`;
    },
    detail() {
      return `Compare Weight to Minutes on each row (e.g. +4 in 2m = 2× qualifies; +5 in 3m = 1.67× does not). Select right-side patients of qualifying rows.`;
    },
    evaluate(graph) {
      const out = [];
      for (const rec of graph.records) {
        if (rec.weight >= 2 * rec.minutes) {
          out.push(...graph.targetsOf(rec.channelId));
        }
      }
      return uniqueSorted(out);
    },
    explain(graph, _params, _sc, targets) {
      const qual = graph.records.filter((r) => r.weight >= 2 * r.minutes);
      const nonQual = graph.records.filter((r) => r.weight < 2 * r.minutes).sort((a, b) => b.weight - a.weight);
      const desc = qual.map((r) => `${r.label} (+${r.weight} / ${r.minutes}m)`).join(', ');
      return {
        proof: `Records meeting Weight ≥ 2 × Minutes are ${desc}, yielding ${formatNameList(targets)}.`,
        decisiveChannels: qual.map((r) => r.channelId),
        rival: buildRival(targets, nonQual.flatMap((r) => graph.targetsOf(r.channelId)), (id) => {
          const r = nonQual.find((rec) => graph.targetsOf(rec.channelId).includes(id));
          return `${pName(id)}'s record ${r.label} has +${r.weight} in ${r.minutes}m, below a 2:1 severity-to-time ratio.`;
        }),
      };
    },
  },

  // 32. Time-Budget Optimisation (Highest Severity-per-Minute Yield)
  'time-budget-optimisation': {
    usesWeights: true,
    usesMinutes: true,
    pickParams() {
      return {};
    },
    order() {
      return `Time-budget call: minutes are scarce—find the single record(s) with the HIGHEST Severity-per-Minute rate (Weight ÷ Min) and attend to their right-side patients first.`;
    },
    detail() {
      return `Divide Weight by Minutes for each row (e.g. +5 in 1m = 5.0/min beats +6 in 2m = 3.0/min). Act on the highest-yield record(s).`;
    },
    evaluate(graph) {
      const rates = graph.records.map((r) => ({ rec: r, rate: r.weight / r.minutes }));
      const maxRate = Math.max(...rates.map((x) => x.rate));
      const best = rates.filter((x) => Math.abs(x.rate - maxRate) < 1e-6);
      return uniqueSorted(best.flatMap((x) => graph.targetsOf(x.rec.channelId)));
    },
    explain(graph, _params, _sc, targets) {
      const rates = graph.records
        .map((r) => ({ rec: r, rate: r.weight / r.minutes }))
        .sort((a, b) => b.rate - a.rate);
      const bestRate = rates[0].rate;
      const winners = rates.filter((x) => Math.abs(x.rate - bestRate) < 1e-6);
      const runner = rates.find((x) => Math.abs(x.rate - bestRate) >= 1e-6);
      return {
        proof: `Optimal yield is ${bestRate.toFixed(1)} pts/min in ${winners.map((w) => `${w.rec.label} (+${w.rec.weight}/${w.rec.minutes}m)`).join(', ')}, targeting ${formatNameList(targets)}.`,
        decisiveChannels: winners.map((w) => w.rec.channelId),
        rival: buildRival(
          targets,
          runner ? graph.targetsOf(runner.rec.channelId) : [],
          (id) => `${pName(id)} is in ${runner.rec.label} (+${runner.rec.weight}/${runner.rec.minutes}m = ${runner.rate.toFixed(1)} pts/min), lower yield per minute than ${bestRate.toFixed(1)}.`
        ),
      };
    },
  },

  // 33. Decision-Theoretic Net Expected Utility (Net Gain = Severity - Minutes >= minGain)
  'decision-net-utility': {
    usesWeights: true,
    usesMinutes: true,
    pickParams(rng, graph) {
      for (const minGain of [3, 2]) {
        const hits = uniqueSorted(
          graph.records
            .filter((r) => r.weight - r.minutes >= minGain)
            .flatMap((r) => graph.targetsOf(r.channelId))
        );
        if (hits.length >= 1 && hits.length <= 4) return { minGain };
      }
      return { minGain: 2 };
    },
    order({ minGain }) {
      return `Net benefit call: compute Net Gain = Weight − Minutes for every row. Intervene for right-side patients in every record with Net Gain ≥ +${minGain}.`;
    },
    detail({ minGain }) {
      return `Subtract procedure Minutes from Severity Weight on each row; select right-side patients where (Weight − Min) ≥ +${minGain}.`;
    },
    evaluate(graph, { minGain }) {
      return uniqueSorted(
        graph.records
          .filter((r) => r.weight - r.minutes >= minGain)
          .flatMap((r) => graph.targetsOf(r.channelId))
      );
    },
    explain(graph, { minGain }, _sc, targets) {
      const qual = graph.records.filter((r) => r.weight - r.minutes >= minGain);
      const nonQual = graph.records
        .filter((r) => r.weight - r.minutes < minGain)
        .sort((a, b) => (b.weight - b.minutes) - (a.weight - a.minutes));
      return {
        proof: `Records achieving Net Gain (Weight − Min) ≥ +${minGain}: ${qual.map((r) => `${r.label} (+${r.weight} − ${r.minutes}m = +${r.weight - r.minutes})`).join(', ')}.`,
        decisiveChannels: qual.map((r) => r.channelId),
        rival: buildRival(targets, nonQual.flatMap((r) => graph.targetsOf(r.channelId)), (id) => {
          const r = nonQual.find((rec) => graph.targetsOf(rec.channelId).includes(id));
          return `${pName(id)}'s record ${r.label} has Net Gain ${r.weight - r.minutes >= 0 ? '+' : ''}${r.weight - r.minutes}, below +${minGain}.`;
        }),
      };
    },
  },

  // 34. Risk-Based Reasoning (Risk = Frequency x Max Severity)
  'risk-expected-harm': {
    usesWeights: true,
    usesMinutes: false,
    pickParams(rng, graph) {
      const scored = PATIENT_IDS.map((id) => {
        const edges = graph.inEdges(id);
        const freq = edges.length;
        const maxW = freq ? Math.max(...edges.map((e) => graph.byChannel[e.channelId].record.weight)) : 0;
        return { id, risk: freq * maxW };
      });
      const unique = Array.from(new Set(scored.map((s) => s.risk))).sort((a, b) => b - a);
      for (const th of unique) {
        if (th < 6) continue;
        const hits = scored.filter((s) => s.risk >= th);
        if (hits.length >= 1 && hits.length <= 4) return { threshold: th };
      }
      return { threshold: 6 };
    },
    order({ threshold }) {
      return `Combined exposure check: for each patient, multiply their number of right-side flags by the HIGHEST Weight among those flags. Intervene if total ≥ ${threshold}.`;
    },
    detail({ threshold }) {
      return `Count how many right-side flags a patient has, multiply by their single heaviest Weight (e.g. 2 flags × max +5 = 10), and act if ≥ ${threshold}.`;
    },
    evaluate(graph, { threshold }) {
      return uniqueSorted(
        PATIENT_IDS.filter((id) => {
          const edges = graph.inEdges(id);
          if (!edges.length) return false;
          const maxW = Math.max(...edges.map((e) => graph.byChannel[e.channelId].record.weight));
          return edges.length * maxW >= threshold;
        })
      );
    },
    explain(graph, { threshold }, _sc, targets) {
      const info = Object.fromEntries(
        PATIENT_IDS.map((id) => {
          const edges = graph.inEdges(id);
          const maxW = edges.length ? Math.max(...edges.map((e) => graph.byChannel[e.channelId].record.weight)) : 0;
          return [id, { freq: edges.length, maxW, risk: edges.length * maxW }];
        })
      );
      const below = PATIENT_IDS.filter((id) => !targets.includes(id) && info[id].risk > 0).sort(
        (a, b) => info[b].risk - info[a].risk
      );
      return {
        proof: `Risk (flags × max Weight) ≥ ${threshold}: ${targets.map((id) => `${pName(id)} (${info[id].freq}×${info[id].maxW}=${info[id].risk})`).join(', ')}.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, below, (id) => `${pName(id)} has Risk ${info[id].freq} × ${info[id].maxW} = ${info[id].risk}, below threshold ${threshold}.`),
      };
    },
  },

  // 35. Mathematical Signed Net Balance (+Right Weight - Left Weight >= threshold)
  'net-balance-math': {
    usesWeights: true,
    usesMinutes: false,
    pickParams(rng, graph) {
      const scored = PATIENT_IDS.map((id) => {
        const plus = graph.inEdges(id).reduce((s, e) => s + graph.byChannel[e.channelId].record.weight, 0);
        const minus = graph.outEdges(id).reduce((s, e) => s + graph.byChannel[e.channelId].record.weight, 0);
        return { id, net: plus - minus };
      });
      const unique = Array.from(new Set(scored.map((s) => s.net))).sort((a, b) => b - a);
      for (const th of unique) {
        if (th < 4) continue;
        const hits = scored.filter((s) => s.net >= th);
        if (hits.length >= 1 && hits.length <= 4) return { threshold: th };
      }
      return { threshold: 5 };
    },
    order({ threshold }) {
      return `Net severity balance: add (+Weight) for each RIGHT-side appearance and subtract (−Weight) for each LEFT-side appearance. Select everyone with Net Balance ≥ +${threshold}.`;
    },
    detail({ threshold }) {
      return `Compute Net = (sum of right-side Weights) − (sum of left-side Weights) per patient; select everyone reaching ≥ +${threshold}.`;
    },
    evaluate(graph, { threshold }) {
      return uniqueSorted(
        PATIENT_IDS.filter((id) => {
          const plus = graph.inEdges(id).reduce((s, e) => s + graph.byChannel[e.channelId].record.weight, 0);
          const minus = graph.outEdges(id).reduce((s, e) => s + graph.byChannel[e.channelId].record.weight, 0);
          return plus - minus >= threshold;
        })
      );
    },
    explain(graph, { threshold }, _sc, targets) {
      const info = Object.fromEntries(
        PATIENT_IDS.map((id) => {
          const plus = graph.inEdges(id).reduce((s, e) => s + graph.byChannel[e.channelId].record.weight, 0);
          const minus = graph.outEdges(id).reduce((s, e) => s + graph.byChannel[e.channelId].record.weight, 0);
          return [id, { plus, minus, net: plus - minus }];
        })
      );
      const below = PATIENT_IDS.filter((id) => !targets.includes(id)).sort((a, b) => info[b].net - info[a].net);
      return {
        proof: `Net balance (+Right − Left) ≥ +${threshold}: ${targets.map((id) => `${pName(id)} (+${info[id].plus} − ${info[id].minus} = +${info[id].net})`).join(', ')}.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, below, (id) => `${pName(id)}'s net balance is ${info[id].net >= 0 ? '+' : ''}${info[id].net} (+${info[id].plus} − ${info[id].minus}), below +${threshold}.`),
      };
    },
  },

  // 36. Statistical Distribution Peak (Highest Cumulative Right-Side Weight Across Entire Ward)
  'statistical-distribution-peak': {
    usesWeights: true,
    usesMinutes: false,
    pickParams() {
      return {};
    },
    order() {
      return `Peak acuity check: sum each patient's total RIGHT-side Weight across the whole ward and select ONLY the patient(s) tied for the MAXIMUM total.`;
    },
    detail() {
      return `Compare cumulative right-side Weights across the ward—act on the patient(s) tied for the highest total.`;
    },
    evaluate(graph) {
      const totals = PATIENT_IDS.map((id) => ({
        id,
        sum: graph.inEdges(id).reduce((s, e) => s + graph.byChannel[e.channelId].record.weight, 0),
      }));
      const maxSum = Math.max(...totals.map((t) => t.sum));
      if (maxSum <= 0) return [];
      return uniqueSorted(totals.filter((t) => t.sum === maxSum).map((t) => t.id));
    },
    explain(graph, _params, _sc, targets) {
      const totals = PATIENT_IDS.map((id) => ({
        id,
        sum: graph.inEdges(id).reduce((s, e) => s + graph.byChannel[e.channelId].record.weight, 0),
      })).sort((a, b) => b.sum - a.sum);
      const mean = (totals.reduce((s, t) => s + t.sum, 0) / PATIENT_IDS.length).toFixed(1);
      const top = totals[0].sum;
      const below = totals.filter((t) => t.sum < top).map((t) => t.id);
      return {
        proof: `Ward mean right-side weight is ${mean}; the distribution peak is +${top}, held by ${formatNameList(targets)}.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, below, (id) => {
          const val = totals.find((t) => t.id === id)?.sum || 0;
          return `${pName(id)} totals +${val}, below the ward peak of +${top}.`;
        }),
      };
    },
  },

  // 37. True 2D Ward Grid Spatial Adjacency (Horizontal Neighbor OR Directly Across the Aisle on the 5x2 Monitor!)
  'spatial-grid-neighbors': {
    usesWeights: false,
    usesMinutes: false,
    pickParams() {
      return {};
    },
    order() {
      return `Bedside proximity check: check the 5×2 Trauma Monitor above! Find every link (A → B) whose two patients occupy ADJACENT bays (next-door horizontally OR directly across the aisle, e.g. Bay 1↔6), and select the receiving patient B.`;
    },
    detail() {
      return `Bays 1–5 sit on Top Row; Bays 6–10 sit directly below (1↔6, 2↔7, 3↔8, 4↔9, 5↔10). Select B whenever A and B touch on the 5×2 floor grid.`;
    },
    evaluate(graph) {
      const areAdjacent = (idA, idB) => {
        const a = PATIENT_IDS.indexOf(idA);
        const b = PATIENT_IDS.indexOf(idB);
        if (a < 0 || b < 0) return false;
        const rA = Math.floor(a / 5);
        const cA = a % 5;
        const rB = Math.floor(b / 5);
        const cB = b % 5;
        return Math.abs(rA - rB) + Math.abs(cA - cB) === 1;
      };
      const out = [];
      for (const e of graph.allEdges) {
        if (areAdjacent(e.from, e.to)) out.push(e.to);
      }
      return uniqueSorted(out);
    },
    explain(graph, _params, _sc, targets) {
      const areAdjacent = (idA, idB) => {
        const a = PATIENT_IDS.indexOf(idA);
        const b = PATIENT_IDS.indexOf(idB);
        const rA = Math.floor(a / 5);
        const cA = a % 5;
        const rB = Math.floor(b / 5);
        const cB = b % 5;
        return Math.abs(rA - rB) + Math.abs(cA - cB) === 1;
      };
      const adjEdges = graph.allEdges.filter((e) => areAdjacent(e.from, e.to));
      const nonAdj = graph.allEdges.filter((e) => !areAdjacent(e.from, e.to));
      const pairsDesc = adjEdges
        .map((e) => `Bay ${pBayNum(e.from)} ${pName(e.from)} → Bay ${pBayNum(e.to)} ${pName(e.to)}`)
        .join('; ');
      return {
        proof: `Physically adjacent bay links on the 5×2 ward grid: ${pairsDesc}. Receiving patients: ${formatNameList(targets)}.`,
        decisiveChannels: uniqueSorted(adjEdges.map((e) => e.channelId)),
        rival: buildRival(targets, nonAdj.map((e) => e.to), (id) => {
          const e = nonAdj.find((x) => x.to === id);
          return `Bay ${pBayNum(e.from)} (${pName(e.from)}) and Bay ${pBayNum(e.to)} (${pName(e.to)}) are not adjacent on the 5×2 floor grid.`;
        }),
      };
    },
  },

  // 38. Theory of Mind / Mentalistic Outdated-Belief Tracking
  'mentalistic-belief-gap': {
    usesWeights: false,
    usesMinutes: false,
    pickParams() {
      return {};
    },
    order() {
      return `Family briefing gap: families briefed on the right side during 01:00–03:00 still hold an OUTDATED picture UNLESS they received a follow-up update anywhere in 05:00–06:00. Select who still needs re-briefing.`;
    },
    detail() {
      return `Gather right-side patients from 01:00, 02:00, and 03:00, then remove anyone who appears on either side of 05:00 or 06:00.`;
    },
    evaluate(graph) {
      const earlyBriefed = uniqueSorted(
        graph.records.filter((r) => r.timeRank <= 2).flatMap((r) => graph.targetsOf(r.channelId))
      );
      const updated = new Set(
        graph.records.filter((r) => r.timeRank >= 4).flatMap((r) => graph.patientsIn(r.channelId))
      );
      return earlyBriefed.filter((id) => !updated.has(id));
    },
    explain(graph, _params, _sc, targets) {
      const earlyRecs = graph.records.filter((r) => r.timeRank <= 2);
      const lateRecs = graph.records.filter((r) => r.timeRank >= 4);
      const earlyBriefed = uniqueSorted(earlyRecs.flatMap((r) => graph.targetsOf(r.channelId)));
      const updated = earlyBriefed.filter((id) => !targets.includes(id));
      return {
        proof: `Early-briefed (01:00–03:00) patients without a 05:00–06:00 follow-up update are ${formatNameList(targets)}.`,
        decisiveChannels: [...earlyRecs.map((r) => r.channelId), ...lateRecs.map((r) => r.channelId)],
        rival: buildRival(targets, updated, (id) => `${pName(id)}'s family already received an updated briefing in 05:00–06:00.`),
      };
    },
  },

  // 39. Ethical Duty Conflict (Urgent Beneficence vs Autonomy Override)
  'ethical-duty-conflict': {
    usesWeights: true,
    usesMinutes: false,
    pickParams(rng, graph) {
      const valid = [];
      for (const overrideCh of CHANNEL_IDS) {
        const restricted = new Set(graph.patientsIn(overrideCh));
        const urgent = uniqueSorted(
          graph.records
            .filter((r) => r.weight >= 4)
            .flatMap((r) => graph.targetsOf(r.channelId))
            .filter((id) => !restricted.has(id))
        );
        if (urgent.length >= 1 && urgent.length <= 4) valid.push({ overrideCh });
      }
      return valid.length ? valid[Math.floor(rng() * valid.length)] : { overrideCh: 'triage' };
    },
    order({ overrideCh }, sc) {
      return `Escalation & consent check: high-severity records (Weight ≥ +4) flag right-side patients for escalation, EXCEPT wishes logged in ${chLabel(sc, overrideCh)} override escalation. Select who should be escalated.`;
    },
    detail({ overrideCh }, sc) {
      return `Gather right-side patients from records weighted +4, +5, or +6, then honor autonomy by removing anyone named in ${chLabel(sc, overrideCh)}.`;
    },
    evaluate(graph, { overrideCh }) {
      const restricted = new Set(graph.patientsIn(overrideCh));
      return uniqueSorted(
        graph.records
          .filter((r) => r.weight >= 4)
          .flatMap((r) => graph.targetsOf(r.channelId))
          .filter((id) => !restricted.has(id))
      );
    },
    explain(graph, { overrideCh }, sc, targets) {
      const restricted = new Set(graph.patientsIn(overrideCh));
      const allUrgent = uniqueSorted(
        graph.records.filter((r) => r.weight >= 4).flatMap((r) => graph.targetsOf(r.channelId))
      );
      const overridden = allUrgent.filter((id) => restricted.has(id));
      return {
        proof: `High-acuity (+4..+6) patients (${formatNameList(allUrgent)}) honoring ${chLabel(sc, overrideCh)} autonomy overrides leave ${formatNameList(targets)}.`,
        decisiveChannels: [overrideCh, ...graph.records.filter((r) => r.weight >= 4).map((r) => r.channelId)],
        rival: buildRival(targets, overridden, (id) => `${pName(id)} had Weight ≥ +4 urgency, but ${chLabel(sc, overrideCh)} autonomy directive restricts escalation.`),
      };
    },
  },

  // 40. Semantic Role Polarity (Active Subject in chA who becomes Passive Object elsewhere)
  'semantic-role-polarity': {
    usesWeights: false,
    usesMinutes: false,
    pickParams(rng, graph) {
      const valid = [];
      for (const chA of CHANNEL_IDS) {
        const res = graph.sourcesOf(chA).filter((id) => graph.inEdges(id).some((e) => e.channelId !== chA));
        if (res.length >= 1 && res.length <= 4) valid.push({ chA });
      }
      return valid.length ? valid[Math.floor(rng() * valid.length)] : { chA: 'triage' };
    },
    order({ chA }, sc) {
      return `Role-switch check: select every patient who acts as the SUBJECT (left side) in ${chLabel(sc, chA)} AND appears as the OBJECT (right side) in at least one OTHER record.`;
    },
    detail({ chA }, sc) {
      return `Read exact sentence roles: find who is the active left-side subject in ${chLabel(sc, chA)}, then verify they receive an action (right side) in a different row.`;
    },
    evaluate(graph, { chA }) {
      return graph.sourcesOf(chA).filter((id) => graph.inEdges(id).some((e) => e.channelId !== chA));
    },
    explain(graph, { chA }, sc, targets) {
      const leftA = graph.sourcesOf(chA);
      const nonShifters = leftA.filter((id) => !targets.includes(id));
      return {
        proof: `Among left-side subjects of ${chLabel(sc, chA)} (${formatNameList(leftA)}), only ${formatNameList(targets)} also appear as right-side objects in another record.`,
        decisiveChannels: [chA],
        rival: buildRival(targets, nonShifters.length ? nonShifters : graph.targetsOf(chA), (id) =>
          leftA.includes(id)
            ? `${pName(id)} is a subject in ${chLabel(sc, chA)} but never appears as a right-side object in any other record.`
            : `${pName(id)} is on the object (right) side of ${chLabel(sc, chA)}, not the subject (left) side.`
        ),
      };
    },
  },

  // 41. Multi-Constraint CSP (3 Simultaneous Restrictions: Unit + Time Window + Exclusion)
  'multi-constraint-csp': {
    usesWeights: false,
    usesMinutes: false,
    pickParams(rng, graph) {
      const valid = [];
      for (const siteIdx of [0, 1]) {
        for (const exclCh of CHANNEL_IDS) {
          const excl = new Set(graph.patientsIn(exclCh));
          const hits = uniqueSorted(
            graph.records
              .filter((r) => r.siteIdx === siteIdx && r.timeRank >= 1)
              .flatMap((r) => graph.targetsOf(r.channelId))
              .filter((id) => !excl.has(id))
          );
          if (hits.length >= 1 && hits.length <= 4) valid.push({ siteIdx, exclCh });
        }
      }
      return valid.length ? valid[Math.floor(rng() * valid.length)] : { siteIdx: 0, exclCh: 'consult' };
    },
    order({ siteIdx, exclCh }, sc) {
      return `Three-rule filter: select right-side patients satisfying ALL THREE rules at once — (1) Unit is ${sc.sites[siteIdx]}, (2) logged at 02:00 or later, AND (3) NOT named anywhere in ${chLabel(sc, exclCh)}.`;
    },
    detail({ siteIdx, exclCh }, sc) {
      return `Apply all 3 conditions together: ${sc.sites[siteIdx]} rows with Time ≥ 02:00 (right side), excluding anyone appearing in ${chLabel(sc, exclCh)}.`;
    },
    evaluate(graph, { siteIdx, exclCh }) {
      const excl = new Set(graph.patientsIn(exclCh));
      return uniqueSorted(
        graph.records
          .filter((r) => r.siteIdx === siteIdx && r.timeRank >= 1)
          .flatMap((r) => graph.targetsOf(r.channelId))
          .filter((id) => !excl.has(id))
      );
    },
    explain(graph, { siteIdx, exclCh }, sc, targets) {
      const excl = new Set(graph.patientsIn(exclCh));
      const siteLate = graph.records.filter((r) => r.siteIdx === siteIdx && r.timeRank >= 1);
      const droppedByExcl = uniqueSorted(siteLate.flatMap((r) => graph.targetsOf(r.channelId))).filter((id) => excl.has(id));
      const wrongUnit = uniqueSorted(
        graph.records.filter((r) => r.siteIdx !== siteIdx && r.timeRank >= 1).flatMap((r) => graph.targetsOf(r.channelId))
      );
      return {
        proof: `Satisfying ${sc.sites[siteIdx]} + Time ≥ 02:00 + outside ${chLabel(sc, exclCh)} yields ${formatNameList(targets)}.`,
        decisiveChannels: [exclCh, ...siteLate.map((r) => r.channelId)],
        rival: buildRival(targets, droppedByExcl.length ? droppedByExcl : wrongUnit, (id) =>
          droppedByExcl.includes(id)
            ? `${pName(id)} met unit and time constraints, but was excluded by ${chLabel(sc, exclCh)}.`
            : `${pName(id)} failed the ${sc.sites[siteIdx]} unit constraint.`
        ),
      };
    },
  },

  // 42. True Inductive Generalization (Observe 01:00-03:00 Majority Unit -> Apply to Latest 04:00-06:00 Record of That Unit)
  'inductive-generalization': {
    usesWeights: false,
    usesMinutes: false,
    pickParams() {
      return {};
    },
    order(_params, sc) {
      return `Early-shift trend: observe the first three records (01:00, 02:00, 03:00) to see which Unit (${sc.sites[0]} or ${sc.sites[1]}) dominates the early shift (2 or 3 of 3). Then select right-side patients of the LATEST record belonging to that dominant Unit.`;
    },
    detail(_params, sc) {
      return `Count ${sc.sites[0]} vs ${sc.sites[1]} in 01:00–03:00 (guaranteed strict majority), then pick right-side patients of that dominant Unit's latest timestamped row.`;
    },
    evaluate(graph) {
      const early = graph.records.filter((r) => r.timeRank <= 2);
      const count0 = early.filter((r) => r.siteIdx === 0).length;
      const dominantSite = count0 >= 2 ? 0 : 1;
      const domRecs = graph.records
        .filter((r) => r.siteIdx === dominantSite)
        .sort((a, b) => b.timeRank - a.timeRank);
      if (!domRecs.length) return [];
      return graph.targetsOf(domRecs[0].channelId);
    },
    explain(graph, _params, sc, targets) {
      const early = graph.records.filter((r) => r.timeRank <= 2);
      const count0 = early.filter((r) => r.siteIdx === 0).length;
      const dominantSite = count0 >= 2 ? 0 : 1;
      const domLatest = graph.records
        .filter((r) => r.siteIdx === dominantSite)
        .sort((a, b) => b.timeRank - a.timeRank)[0];
      const otherLatest = graph.records
        .filter((r) => r.siteIdx !== dominantSite)
        .sort((a, b) => b.timeRank - a.timeRank)[0];
      return {
        proof: `Early records (01:00–03:00) show a ${Math.max(count0, 3 - count0)}–${Math.min(count0, 3 - count0)} majority in ${sc.sites[dominantSite]}; its latest record ${domLatest.label} (${domLatest.time}) selects ${formatNameList(targets)}.`,
        decisiveChannels: [...early.map((r) => r.channelId), domLatest.channelId],
        rival: buildRival(targets, otherLatest ? graph.targetsOf(otherLatest.channelId) : [], (id) =>
          `${pName(id)} belongs to the minority early unit (${sc.sites[1 - dominantSite]}), not the induced dominant unit.`
        ),
      };
    },
  },

  // 43. Divergent Option Exploration (Surface ALL Distinct Patients Directly Linked to Focal Anchor Across All Records)
  'divergent-union-explore': {
    usesWeights: false,
    usesMinutes: false,
    pickParams(rng, graph) {
      const valid = [];
      for (const anchor of PATIENT_IDS) {
        const neighbors = uniqueSorted([
          ...graph.inEdges(anchor).map((e) => e.from),
          ...graph.outEdges(anchor).map((e) => e.to),
        ]);
        if (neighbors.length >= 2 && neighbors.length <= 4) valid.push({ anchor });
      }
      return valid.length ? valid[Math.floor(rng() * valid.length)] : { anchor: PATIENT_IDS[0] };
    },
    order({ anchor }) {
      return `Contact sweep around ${pName(anchor)}: scan ALL 6 records broadly and select EVERY patient directly connected to ${pName(anchor)} (on either the left or right side of a link with ${pName(anchor)}).`;
    },
    detail({ anchor }) {
      return `Scan every row mentioning ${pName(anchor)}—surface every distinct clinical partner linked directly to ${pName(anchor)}.`;
    },
    evaluate(graph, { anchor }) {
      return uniqueSorted([
        ...graph.inEdges(anchor).map((e) => e.from),
        ...graph.outEdges(anchor).map((e) => e.to),
      ]);
    },
    explain(graph, { anchor }, _sc, targets) {
      const touchCh = uniqueSorted(
        graph.allEdges.filter((e) => e.from === anchor || e.to === anchor).map((e) => e.channelId)
      );
      return {
        proof: `Scanning every record linked to ${pName(anchor)} surfaces all direct partners: ${formatNameList(targets)}.`,
        decisiveChannels: touchCh,
        rival: buildRival(targets, [anchor, ...PATIENT_IDS], (id) =>
          id === anchor
            ? `${pName(anchor)} is the focal anchor itself, not a connected partner.`
            : `${pName(id)} never shares a direct clinical link with ${pName(anchor)}.`
        ),
      };
    },
  },

  // 44. Combinatorial Channel-Pair Weight Sum (Appears in >= 2 records whose combined Weights >= threshold)
  'combinatorial-budget-pair': {
    usesWeights: true,
    usesMinutes: false,
    pickParams(rng, graph) {
      const maxPairByPatient = PATIENT_IDS.map((id) => {
        const chWeights = graph.records
          .filter((r) => graph.patientsIn(r.channelId).includes(id))
          .map((r) => r.weight)
          .sort((a, b) => b - a);
        const top2 = chWeights.length >= 2 ? chWeights[0] + chWeights[1] : 0;
        return { id, top2 };
      });
      const unique = Array.from(new Set(maxPairByPatient.map((x) => x.top2))).sort((a, b) => b - a);
      for (const th of unique) {
        if (th < 8) continue;
        const hits = maxPairByPatient.filter((x) => x.top2 >= th);
        if (hits.length >= 1 && hits.length <= 4) return { threshold: th };
      }
      return { threshold: 9 };
    },
    order({ threshold }) {
      return `Combined record check: find every patient who appears in TWO different records whose combined Weights add up to at least ${threshold} (e.g. +6 and +4 = 10).`;
    },
    detail({ threshold }) {
      return `Check combinations of two records containing the same patient (either side); select anyone with a pair summing to ≥ ${threshold}.`;
    },
    evaluate(graph, { threshold }) {
      return uniqueSorted(
        PATIENT_IDS.filter((id) => {
          const chWeights = graph.records
            .filter((r) => graph.patientsIn(r.channelId).includes(id))
            .map((r) => r.weight)
            .sort((a, b) => b - a);
          return chWeights.length >= 2 && chWeights[0] + chWeights[1] >= threshold;
        })
      );
    },
    explain(graph, { threshold }, _sc, targets) {
      const info = Object.fromEntries(
        PATIENT_IDS.map((id) => {
          const chWeights = graph.records
            .filter((r) => graph.patientsIn(r.channelId).includes(id))
            .map((r) => r.weight)
            .sort((a, b) => b - a);
          const top2 = chWeights.length >= 2 ? chWeights[0] + chWeights[1] : 0;
          return [id, { top2, w0: chWeights[0] || 0, w1: chWeights[1] || 0 }];
        })
      );
      const below = PATIENT_IDS.filter((id) => !targets.includes(id) && info[id].top2 > 0).sort(
        (a, b) => info[b].top2 - info[a].top2
      );
      return {
        proof: `Patients with a 2-record Weight combination ≥ ${threshold}: ${targets.map((id) => `${pName(id)} (+${info[id].w0} + +${info[id].w1} = ${info[id].top2})`).join(', ')}.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, below, (id) => `${pName(id)}'s heaviest pair of records sums to ${info[id].top2} (+${info[id].w0} + +${info[id].w1}), below ${threshold}.`),
      };
    },
  },

  // 45. Moral Vulnerability Priority (#65 Moral reasoning — protect high-need patients who have ZERO outgoing advocacy/support)
  'moral-vulnerability-priority': {
    usesWeights: true,
    usesMinutes: false,
    pickParams() {
      return { minWeight: 3 };
    },
    order({ minWeight }) {
      return `Unrepresented patient priority: select every patient flagged with serious need (right side of a Weight ≥ +${minWeight} record) who NEVER appears on the initiating (left) side of ANY record.`;
    },
    detail({ minWeight }) {
      return `Check right-side patients in records weighted +${minWeight}..+6, then exclude anyone who has at least one left-side entry anywhere on the board.`;
    },
    evaluate(graph, { minWeight }) {
      const highNeed = uniqueSorted(
        graph.records
          .filter((r) => r.weight >= minWeight)
          .flatMap((r) => graph.targetsOf(r.channelId))
      );
      return highNeed.filter((id) => graph.outEdges(id).length === 0);
    },
    explain(graph, { minWeight }, _sc, targets) {
      const highNeed = uniqueSorted(
        graph.records
          .filter((r) => r.weight >= minWeight)
          .flatMap((r) => graph.targetsOf(r.channelId))
      );
      const selfInitiating = highNeed.filter((id) => graph.outEdges(id).length > 0);
      return {
        proof: `Among serious-need patients (Weight ≥ +${minWeight}), ${formatNameList(targets)} have zero initiating (left-side) presence and require moral priority.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, selfInitiating, (id) => `${pName(id)} is flagged at Weight ≥ +${minWeight}, but also appears on the initiating left side elsewhere.`),
      };
    },
  },

  // 46. Fast-and-Frugal Clinical Heuristic (#76 Heuristic reasoning — 1-glance quick-win vs heaviest rule)
  'fast-frugal-heuristic': {
    usesWeights: true,
    usesMinutes: true,
    pickParams() {
      return {};
    },
    order() {
      return `Rapid bedside check: glance ONLY at the fastest 1m record first. IF its Weight is ≥ +3, act on its right-side patients immediately; OTHERWISE jump straight to the heaviest +6 record (right side).`;
    },
    detail() {
      return `Don't sum the whole board: check the 1m row's Weight first (≥ +3 = quick win; < +3 = default to the +6 row's right side).`;
    },
    evaluate(graph) {
      const fastest = graph.records.find((r) => r.minutes === 1);
      const heaviest = graph.records.find((r) => r.weight === 6);
      if (!fastest || !heaviest) return [];
      const chosen = fastest.weight >= 3 ? fastest : heaviest;
      return graph.targetsOf(chosen.channelId);
    },
    explain(graph, _params, _sc, targets) {
      const fastest = graph.records.find((r) => r.minutes === 1);
      const heaviest = graph.records.find((r) => r.weight === 6);
      const quickWin = fastest.weight >= 3;
      const chosen = quickWin ? fastest : heaviest;
      const other = quickWin ? heaviest : fastest;
      return {
        proof: `Fastest 1m record ${fastest.label} has Weight +${fastest.weight} (${quickWin ? '≥ +3 quick win' : '< +3, fallback to heaviest +6'}), selecting ${chosen.label}: ${formatNameList(targets)}.`,
        decisiveChannels: [fastest.channelId, heaviest.channelId],
        rival: buildRival(targets, graph.targetsOf(other.channelId), (id) =>
          `${pName(id)} belongs to ${other.label}, the branch skipped by the fast-and-frugal heuristic.`
        ),
      };
    },
  },

  // 47. Second-Order Consequence (#48 Second-order reasoning — from focal trigger X, ignore 1st-order M and save 2nd-order B across whole board)
  'second-order-consequence': {
    usesWeights: false,
    usesMinutes: false,
    pickParams(rng, graph) {
      const valid = [];
      for (const seed of PATIENT_IDS) {
        const firstOrder = new Set(graph.outEdges(seed).map((e) => e.to));
        const secondOrder = [];
        for (const m of firstOrder) {
          for (const e of graph.outEdges(m)) {
            if (e.to !== seed && !firstOrder.has(e.to)) secondOrder.push(e.to);
          }
        }
        const res = uniqueSorted(secondOrder);
        if (res.length >= 1 && res.length <= 4) valid.push({ seed });
      }
      return valid.length ? valid[Math.floor(rng() * valid.length)] : { seed: PATIENT_IDS[0] };
    },
    order({ seed }) {
      return `Downstream ripple from ${pName(seed)}: trace ${pName(seed)} → M (step 1), then follow M → B across the chart. Ignore ${pName(seed)} and M—intervene for the 2-step downstream patients B.`;
    },
    detail({ seed }) {
      return `Find everyone ${pName(seed)} points to (step 1: M), then select NEW patients B whom any M points to (excluding ${pName(seed)} and M themselves).`;
    },
    evaluate(graph, { seed }) {
      const firstOrder = new Set(graph.outEdges(seed).map((e) => e.to));
      const secondOrder = [];
      for (const m of firstOrder) {
        for (const e of graph.outEdges(m)) {
          if (e.to !== seed && !firstOrder.has(e.to)) secondOrder.push(e.to);
        }
      }
      return uniqueSorted(secondOrder);
    },
    explain(graph, { seed }, _sc, targets) {
      const firstOrder = uniqueSorted(graph.outEdges(seed).map((e) => e.to));
      const chains = [];
      for (const m of firstOrder) {
        for (const e of graph.outEdges(m)) {
          if (targets.includes(e.to)) chains.push(`${pName(seed)} → ${pName(m)} → ${pName(e.to)}`);
        }
      }
      return {
        proof: `Second-order ripples from ${pName(seed)} (${chains.join('; ')}) target ${formatNameList(targets)}.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, firstOrder, (id) => `${pName(id)} is a 1st-order contact of ${pName(seed)}, not a 2nd-order downstream consequence.`),
      };
    },
  },

  // 48. Dialectical Thesis-Antithesis Synthesis (#56 Dialectical reasoning — patients spanning opposing roles across both units)
  'dialectical-synthesis': {
    usesWeights: false,
    usesMinutes: false,
    pickParams() {
      return {};
    },
    order(_params, sc) {
      return `Cross-unit role reversal: compare ${sc.sites[0]} and ${sc.sites[1]} — select every patient who is on the LEFT side in one unit AND on the RIGHT side in the OTHER unit.`;
    },
    detail(_params, sc) {
      return `Find patients pulled in opposite directions across units (left in ${sc.sites[0]} + right in ${sc.sites[1]}, OR right in ${sc.sites[0]} + left in ${sc.sites[1]}).`;
    },
    evaluate(graph) {
      const l0 = new Set();
      const r0 = new Set();
      const l1 = new Set();
      const r1 = new Set();
      for (const e of graph.allEdges) {
        if (e.siteIdx === 0) {
          l0.add(e.from);
          r0.add(e.to);
        } else {
          l1.add(e.from);
          r1.add(e.to);
        }
      }
      return uniqueSorted(
        PATIENT_IDS.filter((id) => (l0.has(id) && r1.has(id)) || (r0.has(id) && l1.has(id)))
      );
    },
    explain(graph, _params, sc, targets) {
      const sameSideBoth = PATIENT_IDS.filter((id) => !targets.includes(id));
      return {
        proof: `${formatNameList(targets)} stand at the dialectical point of tension—switching between initiating (left) and receiving (right) roles across ${sc.sites[0]} and ${sc.sites[1]}.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, sameSideBoth, (id) => `${pName(id)} never switches between left and right roles across ${sc.sites[0]} and ${sc.sites[1]}.`),
      };
    },
  },

  // 49. Integrative Capstone (#80 Integrative reasoning — orchestrate Meta-Unit + Quantitative Weight + Eliminative Exclusion in one call)
  'integrative-capstone': {
    usesWeights: true,
    usesMinutes: false,
    pickParams() {
      return { minWeight: 3 };
    },
    order({ minWeight }) {
      return `Full-chart call: (1) Check which Unit holds 01:00; (2) inside THAT Unit, gather right-side patients from records with Weight ≥ +${minWeight}; (3) EXCLUDE anyone named anywhere in the latest 06:00 record.`;
    },
    detail({ minWeight }) {
      return `Combine 3 checks at once: scope to 01:00's Unit, keep Weight ≥ +${minWeight} right-side rows, and rule out anyone appearing in 06:00.`;
    },
    evaluate(graph, { minWeight }) {
      const first = graph.records.find((r) => r.timeRank === 0);
      const last = graph.records.find((r) => r.timeRank === 5);
      if (!first || !last) return [];
      const excl = new Set(graph.patientsIn(last.channelId));
      return uniqueSorted(
        graph.records
          .filter((r) => r.siteIdx === first.siteIdx && r.weight >= minWeight)
          .flatMap((r) => graph.targetsOf(r.channelId))
          .filter((id) => !excl.has(id))
      );
    },
    explain(graph, { minWeight }, _sc, targets) {
      const first = graph.records.find((r) => r.timeRank === 0);
      const last = graph.records.find((r) => r.timeRank === 5);
      const excl = new Set(graph.patientsIn(last.channelId));
      const pool = uniqueSorted(
        graph.records
          .filter((r) => r.siteIdx === first.siteIdx && r.weight >= minWeight)
          .flatMap((r) => graph.targetsOf(r.channelId))
      );
      const ruledOut = pool.filter((id) => excl.has(id));
      const wrongUnit = uniqueSorted(
        graph.records
          .filter((r) => r.siteIdx !== first.siteIdx && r.weight >= minWeight)
          .flatMap((r) => graph.targetsOf(r.channelId))
      );
      return {
        proof: `01:00 sets context to ${first.site}; Weight ≥ +${minWeight} rows give ${formatNameList(pool)}, and ruling out 06:00 (${last.label}) leaves ${formatNameList(targets)}.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, ruledOut.length ? ruledOut : wrongUnit, (id) =>
          ruledOut.includes(id)
            ? `${pName(id)} qualified in ${first.site} with Weight ≥ +${minWeight}, then was excluded by 06:00 (${last.label}).`
            : `${pName(id)} belongs to the opposite unit from 01:00 (${first.site}).`
        ),
      };
    },
  },
  ...EXTRA_REASONING_ENGINES,
};
