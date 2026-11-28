// 32 additional distinct, mathematically verified clinical reasoning engines so that
// EVERY SINGLE ONE of the 80 reasoning types has its own unique, non-spoiler clinical operation.
// Combined with the 48 base engines in reasoning-engines.js -> 80/80 distinct reasoning engines!

import { PATIENT_BY_ID, PATIENT_IDS, CHANNEL_IDS } from './roster.js';
import { uniqueSorted } from './case-graph.js';

function pName(id) {
  return PATIENT_BY_ID[id]?.name || id;
}

function pBayNum(id) {
  return PATIENT_IDS.indexOf(id) + 1;
}

function chLabel(sc, ch) {
  return sc.channels[ch].label;
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

export const EXTRA_REASONING_ENGINES = {
  // 50. #4 Hypothetico-Deductive: test whether right-side candidates of an early record are confirmed in a LATER record
  'hypothetico-deductive-test': {
    usesWeights: false,
    usesMinutes: false,
    pickParams(rng, graph) {
      const valid = [];
      for (const rec of graph.records) {
        if (rec.timeRank > 3) continue;
        const laterPatients = new Set(
          graph.records.filter((r) => r.timeRank > rec.timeRank).flatMap((r) => graph.patientsIn(r.channelId))
        );
        const confirmed = graph.targetsOf(rec.channelId).filter((id) => laterPatients.has(id));
        if (confirmed.length >= 1 && confirmed.length <= 4) valid.push({ ch: rec.channelId });
      }
      return valid.length ? valid[Math.floor(rng() * valid.length)] : { ch: graph.records[0].channelId };
    },
    order({ ch }, sc) {
      return `Follow-up verification: take the right-side patients of ${chLabel(sc, ch)} as your working list, and keep ONLY those who appear again (either side) in a LATER timestamped record.`;
    },
    detail({ ch }, sc) {
      return `Check ${chLabel(sc, ch)}'s timestamp, then confirm which of its right-side patients reappear in any row with a strictly later time.`;
    },
    evaluate(graph, { ch }) {
      const rank = graph.timeRankOf(ch);
      const later = new Set(
        graph.records.filter((r) => r.timeRank > rank).flatMap((r) => graph.patientsIn(r.channelId))
      );
      return graph.targetsOf(ch).filter((id) => later.has(id));
    },
    explain(graph, { ch }, sc, targets) {
      const rank = graph.timeRankOf(ch);
      const time = graph.byChannel[ch].record.time;
      const unconfirmed = graph.targetsOf(ch).filter((id) => !targets.includes(id));
      return {
        proof: `Of ${chLabel(sc, ch)}'s (${time}) right-side patients, ${formatNameList(targets)} are confirmed by reappearing in a later record.`,
        decisiveChannels: [ch, ...graph.records.filter((r) => r.timeRank > rank).map((r) => r.channelId)],
        rival: buildRival(targets, unconfirmed.length ? unconfirmed : graph.sourcesOf(ch), (id) =>
          unconfirmed.includes(id)
            ? `${pName(id)} appeared in ${chLabel(sc, ch)} but was never corroborated in any later record.`
            : `${pName(id)} is on the left side of ${chLabel(sc, ch)}, not the working right-side list.`
        ),
      };
    },
  },

  // 51. #5 Causal Direct Effect: trace every direct downstream patient caused by a focal trigger patient
  'causal-direct-effect': {
    usesWeights: false,
    usesMinutes: false,
    pickParams(rng, graph) {
      const valid = [];
      for (const trigger of PATIENT_IDS) {
        const effects = uniqueSorted(graph.outEdges(trigger).map((e) => e.to));
        if (effects.length >= 1 && effects.length <= 4) valid.push({ trigger });
      }
      return valid.length ? valid[Math.floor(rng() * valid.length)] : { trigger: PATIENT_IDS[0] };
    },
    order({ trigger }) {
      return `Direct trigger trace: ${pName(trigger)} is the index event. Scan all 6 records and select every patient directly downstream of ${pName(trigger)} (${pName(trigger)} → patient).`;
    },
    detail({ trigger }) {
      return `Find every line where ${pName(trigger)} is on the LEFT side and select the patient on the RIGHT side of that line.`;
    },
    evaluate(graph, { trigger }) {
      return uniqueSorted(graph.outEdges(trigger).map((e) => e.to));
    },
    explain(graph, { trigger }, _sc, targets) {
      const upstream = uniqueSorted(graph.inEdges(trigger).map((e) => e.from));
      const chs = uniqueSorted(graph.outEdges(trigger).map((e) => e.channelId));
      return {
        proof: `${pName(trigger)} directly drives downstream links to ${formatNameList(targets)}.`,
        decisiveChannels: chs,
        rival: buildRival(targets, upstream.length ? upstream : [trigger], (id) =>
          id === trigger
            ? `${pName(trigger)} is the initiating trigger, not a downstream affected patient.`
            : `${pName(id)} points INTO ${pName(trigger)} (upstream) rather than being triggered by ${pName(trigger)}.`
        ),
      };
    },
  },

  // 52. #6 Root-Cause Earliest Driver: trace backward from the 05:00-06:00 crisis victims to earlier upstream initiators
  'root-cause-earliest-driver': {
    usesWeights: false,
    usesMinutes: false,
    pickParams(rng, graph) {
      const victims = new Set(
        graph.records.filter((r) => r.timeRank >= 4).flatMap((r) => graph.targetsOf(r.channelId))
      );
      const drivers = uniqueSorted(
        graph.records
          .filter((r) => r.timeRank <= 3)
          .flatMap((r) => graph.edgesOf(r.channelId))
          .filter((e) => victims.has(e.to))
          .map((e) => e.from)
      );
      if (drivers.length >= 1 && drivers.length <= 4) return { mode: 'late-victims' };
      return { mode: 'latest-row' };
    },
    order(params) {
      if (params.mode === 'late-victims') {
        return `Upstream origin audit: list the late-shift victims (right side of 05:00 and 06:00), then look back at 01:00–04:00 to select every LEFT-side patient who directly fed into one of them.`;
      }
      return `Upstream origin audit: look at the 06:00 record's right-side patients, then check 01:00–05:00 for anyone on the LEFT side who fed into them (or, if none, the left side of 06:00 itself).`;
    },
    detail(params) {
      return params.mode === 'late-victims'
        ? `Match right-side victims from 05:00–06:00 onto the right side of 01:00–04:00 rows, then pick the originating left-side patient(s).`
        : `Find who initiated a link into a 06:00 right-side patient during 01:00–05:00 (falling back to 06:00's left side if isolated).`;
    },
    evaluate(graph, params) {
      if (params.mode === 'late-victims') {
        const victims = new Set(
          graph.records.filter((r) => r.timeRank >= 4).flatMap((r) => graph.targetsOf(r.channelId))
        );
        return uniqueSorted(
          graph.records
            .filter((r) => r.timeRank <= 3)
            .flatMap((r) => graph.edgesOf(r.channelId))
            .filter((e) => victims.has(e.to))
            .map((e) => e.from)
        );
      }
      const last = graph.records.find((r) => r.timeRank === 5);
      if (!last) return [];
      const vSet = new Set(graph.targetsOf(last.channelId));
      const earlyDrivers = uniqueSorted(
        graph.records
          .filter((r) => r.timeRank < 5)
          .flatMap((r) => graph.edgesOf(r.channelId))
          .filter((e) => vSet.has(e.to))
          .map((e) => e.from)
      );
      return earlyDrivers.length ? earlyDrivers : graph.sourcesOf(last.channelId);
    },
    explain(graph, params, _sc, targets) {
      const lateRecs = graph.records.filter((r) => r.timeRank >= (params.mode === 'late-victims' ? 4 : 5));
      const victims = uniqueSorted(lateRecs.flatMap((r) => graph.targetsOf(r.channelId)));
      return {
        proof: `Tracing backward from late victims (${formatNameList(victims)}) exposes early upstream drivers: ${formatNameList(targets)}.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, victims, (id) => `${pName(id)} is a downstream late-shift victim, not the earlier root driver.`),
      };
    },
  },

  // 53. #7 Mechanistic Same-Compartment Pathway: 2-hop chain strictly inside ONE clinical unit
  'mechanistic-pathway': {
    usesWeights: false,
    usesMinutes: false,
    pickParams(rng, graph) {
      const valid = [];
      for (const siteIdx of [0, 1]) {
        const edges = graph.records
          .filter((r) => r.siteIdx === siteIdx)
          .flatMap((r) => graph.edgesOf(r.channelId));
        const ends = [];
        for (const e1 of edges) {
          for (const e2 of edges) {
            if (e1.channelId !== e2.channelId && e1.to === e2.from && e1.from !== e2.to) {
              ends.push(e2.to);
            }
          }
        }
        const uniq = uniqueSorted(ends);
        if (uniq.length >= 1 && uniq.length <= 4) valid.push({ siteIdx, fallback: false });
      }
      if (valid.length) return valid[Math.floor(rng() * valid.length)];
      return { siteIdx: rng() < 0.5 ? 0 : 1, fallback: true };
    },
    order({ siteIdx, fallback }, sc) {
      if (fallback) {
        return `Unit pathway check (${sc.sites[siteIdx]}): inspect ONLY records in ${sc.sites[siteIdx]}, locate the LATEST record in that unit, and select its receiving (right-side) patients.`;
      }
      return `Unit pathway trace: working strictly inside ${sc.sites[siteIdx]}, trace any 2-step chain A → M → B across two ${sc.sites[siteIdx]} records (A ≠ B) and select downstream patient(s) B.`;
    },
    detail({ siteIdx, fallback }, sc) {
      return fallback
        ? `Stay strictly inside ${sc.sites[siteIdx]} and select the right-side patients of its latest timestamped row.`
        : `Ignore ${sc.sites[1 - siteIdx]}—link right-side M of one ${sc.sites[siteIdx]} row to left-side M of another ${sc.sites[siteIdx]} row, then select B.`;
    },
    evaluate(graph, { siteIdx, fallback }) {
      const siteRecs = graph.records.filter((r) => r.siteIdx === siteIdx);
      if (fallback) {
        const latest = siteRecs.slice().sort((a, b) => b.timeRank - a.timeRank)[0];
        return latest ? graph.targetsOf(latest.channelId) : [];
      }
      const edges = siteRecs.flatMap((r) => graph.edgesOf(r.channelId));
      const ends = [];
      for (const e1 of edges) {
        for (const e2 of edges) {
          if (e1.channelId !== e2.channelId && e1.to === e2.from && e1.from !== e2.to) {
            ends.push(e2.to);
          }
        }
      }
      return uniqueSorted(ends);
    },
    explain(graph, { siteIdx, fallback }, sc, targets) {
      const siteRecs = graph.records.filter((r) => r.siteIdx === siteIdx);
      if (fallback) {
        const latest = siteRecs.slice().sort((a, b) => b.timeRank - a.timeRank)[0];
        return {
          proof: `Inside ${sc.sites[siteIdx]}, the latest pathway record is ${latest.label} (${latest.time}), targeting ${formatNameList(targets)}.`,
          decisiveChannels: [latest.channelId],
          rival: buildRival(targets, graph.sourcesOf(latest.channelId), (id) => `${pName(id)} is on the initiating side of ${latest.label}.`),
        };
      }
      const edges = siteRecs.flatMap((r) => graph.edgesOf(r.channelId));
      const mids = [];
      const chains = [];
      for (const e1 of edges) {
        for (const e2 of edges) {
          if (e1.channelId !== e2.channelId && e1.to === e2.from && e1.from !== e2.to) {
            mids.push(e1.to);
            chains.push(`${pName(e1.from)} → ${pName(e1.to)} → ${pName(e2.to)}`);
          }
        }
      }
      return {
        proof: `Within ${sc.sites[siteIdx]}, the mechanistic chains (${chains.join('; ')}) drive ${formatNameList(targets)}.`,
        decisiveChannels: siteRecs.map((r) => r.channelId),
        rival: buildRival(targets, uniqueSorted(mids), (id) => `${pName(id)} is the intermediate relay M inside ${sc.sites[siteIdx]}, not the downstream endpoint B.`),
      };
    },
  },

  // 54. #8 Forensic Pre-Incident Contact Reconstruction: reconstruct everyone who fed INTO or followed the 06:00 patient BEFORE 06:00
  'forensic-chain-reconstruction': {
    usesWeights: false,
    usesMinutes: false,
    pickParams(rng, graph) {
      const last = graph.records.find((r) => r.timeRank === 5);
      const valid = [];
      for (const victim of last ? graph.patientsIn(last.channelId) : PATIENT_IDS) {
        for (const dir of ['upstream', 'downstream']) {
          const contacts = uniqueSorted(
            graph.records
              .filter((r) => r.timeRank < 5)
              .flatMap((r) => graph.edgesOf(r.channelId))
              .filter((e) => (dir === 'upstream' ? e.to === victim : e.from === victim))
              .map((e) => (dir === 'upstream' ? e.from : e.to))
          );
          if (contacts.length >= 1 && contacts.length <= 4) valid.push({ victim, dir });
        }
      }
      return valid.length ? valid[Math.floor(rng() * valid.length)] : { victim: PATIENT_IDS[0], dir: 'upstream' };
    },
    order({ victim, dir }) {
      return dir === 'upstream'
        ? `Case reconstruction for ${pName(victim)}: inspect EARLIER records (01:00–05:00 ONLY) and select every LEFT-side patient who directly pointed INTO ${pName(victim)} (patient → ${pName(victim)}).`
        : `Case reconstruction for ${pName(victim)}: inspect EARLIER records (01:00–05:00 ONLY) and select every RIGHT-side patient directly downstream of ${pName(victim)} (${pName(victim)} → patient).`;
    },
    detail({ victim, dir }) {
      return dir === 'upstream'
        ? `Ignore 06:00—scan 01:00–05:00 for lines where ${pName(victim)} sits on the RIGHT side and select their LEFT-side initiator.`
        : `Ignore 06:00—scan 01:00–05:00 for lines where ${pName(victim)} sits on the LEFT side and select their RIGHT-side recipient.`;
    },
    evaluate(graph, { victim, dir }) {
      return uniqueSorted(
        graph.records
          .filter((r) => r.timeRank < 5)
          .flatMap((r) => graph.edgesOf(r.channelId))
          .filter((e) => (dir === 'upstream' ? e.to === victim : e.from === victim))
          .map((e) => (dir === 'upstream' ? e.from : e.to))
      );
    },
    explain(graph, { victim, dir }, _sc, targets) {
      const opp = uniqueSorted(
        graph.records
          .filter((r) => r.timeRank < 5)
          .flatMap((r) => graph.edgesOf(r.channelId))
          .filter((e) => (dir === 'upstream' ? e.from === victim : e.to === victim))
          .map((e) => (dir === 'upstream' ? e.to : e.from))
      );
      return {
        proof: `Reconstructing 01:00–05:00 ${dir} links around ${pName(victim)} recovers ${formatNameList(targets)}.`,
        decisiveChannels: graph.records.filter((r) => r.timeRank < 5).map((r) => r.channelId),
        rival: buildRival(targets, [...opp, victim], (id) =>
          id === victim
            ? `${pName(victim)} is the subject being reconstructed, not an earlier linked patient.`
            : `${pName(id)} connects to ${pName(victim)} in the opposite direction.`
        ),
      };
    },
  },

  // 55. #23 Antinomic Incompatible Acuity Tags (flagged on RIGHT side in BOTH low Weight <=3 AND critical Weight >=4)
  'antinomic-incompatible-tags': {
    usesWeights: true,
    usesMinutes: false,
    pickParams(rng, graph) {
      for (const [lowMax, highMin] of [[2, 5], [3, 5], [3, 4]]) {
        const low = new Set(graph.records.filter((r) => r.weight <= lowMax).flatMap((r) => graph.targetsOf(r.channelId)));
        const high = new Set(graph.records.filter((r) => r.weight >= highMin).flatMap((r) => graph.targetsOf(r.channelId)));
        const clash = uniqueSorted(Array.from(low).filter((id) => high.has(id)));
        if (clash.length >= 1 && clash.length <= 4) return { lowMax, highMin };
      }
      return { lowMax: 3, highMin: 4 };
    },
    order({ lowMax, highMin }) {
      return `Incompatible severity audit: find every patient flagged on the RIGHT side in BOTH a low-acuity record (Weight +1..+${lowMax}) AND a critical record (Weight +${highMin}..+6).`;
    },
    detail({ lowMax, highMin }) {
      return `Compare RIGHT-side names in the lighter rows (+1..+${lowMax}) against RIGHT-side names in the heavier rows (+${highMin}..+6)—select anyone caught in both.`;
    },
    evaluate(graph, { lowMax, highMin }) {
      const low = new Set(graph.records.filter((r) => r.weight <= lowMax).flatMap((r) => graph.targetsOf(r.channelId)));
      const high = new Set(graph.records.filter((r) => r.weight >= highMin).flatMap((r) => graph.targetsOf(r.channelId)));
      return uniqueSorted(Array.from(low).filter((id) => high.has(id)));
    },
    explain(graph, { lowMax, highMin }, _sc, targets) {
      const highOnly = uniqueSorted(
        graph.records.filter((r) => r.weight >= highMin).flatMap((r) => graph.targetsOf(r.channelId))
      );
      return {
        proof: `${formatNameList(targets)} carry incompatible right-side low (+1..+${lowMax}) and critical (+${highMin}..+6) flags simultaneously.`,
        decisiveChannels: graph.records.filter((r) => r.weight <= lowMax || r.weight >= highMin).map((r) => r.channelId),
        rival: buildRival(targets, highOnly, (id) => `${pName(id)} appears on the right side in +${highMin}..+6 without a conflicting right-side +1..+${lowMax} tag.`),
      };
    },
  },

  // 56. #24 Antithetical Opposites (right side of +6 OR +1 exclusively)
  'antithetical-opposites': {
    usesWeights: true,
    usesMinutes: false,
    pickParams() {
      return {};
    },
    order() {
      return `Extreme-pole check: locate the heaviest (+6) record and the lightest (+1) record. Select every patient on the right side of EITHER pole, excluding anyone on both.`;
    },
    detail() {
      return `Find the +6 row and the +1 row—select right-side patients appearing at one extreme pole only.`;
    },
    evaluate(graph) {
      const top = graph.records.find((r) => r.weight === 6);
      const bot = graph.records.find((r) => r.weight === 1);
      if (!top || !bot) return [];
      const a = new Set(graph.targetsOf(top.channelId));
      const b = new Set(graph.targetsOf(bot.channelId));
      return uniqueSorted([...a, ...b].filter((id) => a.has(id) !== b.has(id)));
    },
    explain(graph, _params, _sc, targets) {
      const top = graph.records.find((r) => r.weight === 6);
      const bot = graph.records.find((r) => r.weight === 1);
      const both = graph.targetsOf(top.channelId).filter((id) => graph.targetsOf(bot.channelId).includes(id));
      return {
        proof: `Right-side patients exclusive to the +6 (${top.label}) or +1 (${bot.label}) extreme poles are ${formatNameList(targets)}.`,
        decisiveChannels: [top.channelId, bot.channelId],
        rival: buildRival(targets, both.length ? both : graph.sourcesOf(top.channelId), (id) =>
          both.includes(id)
            ? `${pName(id)} appears on the right side of BOTH +6 and +1, canceling exclusive polarity.`
            : `${pName(id)} sits on the left side rather than the receiving right side of an extreme pole.`
        ),
      };
    },
  },

  // 57. #26 Cross-Domain Acuity-to-Time Transfer
  'cross-domain-transfer': {
    usesWeights: true,
    usesMinutes: true,
    pickParams(rng) {
      return { sourceSite: rng() < 0.5 ? 0 : 1 };
    },
    order({ sourceSite }, sc) {
      const other = 1 - sourceSite;
      return `Unit-to-unit rule transfer: sum Weights vs Minutes inside ${sc.sites[sourceSite]}. If total Weight > total Minutes, pick right-side patients of ${sc.sites[other]}'s HEAVIEST Weight row; otherwise pick right-side patients of ${sc.sites[other]}'s FASTEST (lowest Min) row.`;
    },
    detail({ sourceSite }, sc) {
      return `Compare Sum(Weight) vs Sum(Min) across ${sc.sites[sourceSite]}'s 3 rows, then transfer that priority (heaviest vs fastest) to ${sc.sites[1 - sourceSite]}.`;
    },
    evaluate(graph, { sourceSite }) {
      const src = graph.records.filter((r) => r.siteIdx === sourceSite);
      const tgt = graph.records.filter((r) => r.siteIdx === 1 - sourceSite);
      const wSum = src.reduce((s, r) => s + r.weight, 0);
      const mSum = src.reduce((s, r) => s + r.minutes, 0);
      const chosen =
        wSum > mSum
          ? tgt.slice().sort((a, b) => b.weight - a.weight)[0]
          : tgt.slice().sort((a, b) => a.minutes - b.minutes)[0];
      return chosen ? graph.targetsOf(chosen.channelId) : [];
    },
    explain(graph, { sourceSite }, sc, targets) {
      const other = 1 - sourceSite;
      const src = graph.records.filter((r) => r.siteIdx === sourceSite);
      const tgt = graph.records.filter((r) => r.siteIdx === other);
      const wSum = src.reduce((s, r) => s + r.weight, 0);
      const mSum = src.reduce((s, r) => s + r.minutes, 0);
      const heavyMode = wSum > mSum;
      const chosen = heavyMode
        ? tgt.slice().sort((a, b) => b.weight - a.weight)[0]
        : tgt.slice().sort((a, b) => a.minutes - b.minutes)[0];
      const alt = heavyMode
        ? tgt.slice().sort((a, b) => a.minutes - b.minutes)[0]
        : tgt.slice().sort((a, b) => b.weight - a.weight)[0];
      return {
        proof: `${sc.sites[sourceSite]} totals Weight +${wSum} vs ${mSum}m, transferring ${heavyMode ? 'heaviest-Weight' : 'fastest-Min'} mode to ${sc.sites[other]}'s ${chosen.label}: ${formatNameList(targets)}.`,
        decisiveChannels: [...src.map((r) => r.channelId), chosen.channelId],
        rival: buildRival(targets, alt ? graph.targetsOf(alt.channelId) : [], (id) => `${pName(id)} belongs to ${alt.label}, the opposite domain criterion.`),
      };
    },
  },

  // 58. #27 Abstract Role Symmetry (balanced in-degree == out-degree >= 1 across the entire board)
  'abstract-invariance': {
    usesWeights: false,
    usesMinutes: false,
    pickParams() {
      return {};
    },
    order() {
      return `Balanced-role audit: ignore units and times—count each patient's left-side entries and right-side entries across all 6 records. Select everyone with an EXACT EQUAL non-zero count on both sides (Left = Right ≥ 1).`;
    },
    detail() {
      return `Find patients who appear the exact same number of times on the left as on the right (e.g. 1 left + 1 right, or 2 left + 2 right).`;
    },
    evaluate(graph) {
      return uniqueSorted(
        PATIENT_IDS.filter((id) => {
          const outN = graph.outEdges(id).length;
          const inN = graph.inEdges(id).length;
          return outN >= 1 && outN === inN;
        })
      );
    },
    explain(graph, _params, _sc, targets) {
      const unbalanced = PATIENT_IDS.filter((id) => {
        const o = graph.outEdges(id).length;
        const i = graph.inEdges(id).length;
        return o + i >= 2 && o !== i;
      });
      return {
        proof: `${formatNameList(targets)} maintain exact left/right role symmetry across the ward.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, unbalanced, (id) => `${pName(id)} has ${graph.outEdges(id).length} left vs ${graph.inEdges(id).length} right entries (unbalanced).`),
      };
    },
  },

  // 59. #36 Hypothetical Weight-Doubling Test (what if Unit siteIdx Weights were doubled?)
  'hypothetical-swap-test': {
    usesWeights: true,
    usesMinutes: false,
    pickParams(rng, graph) {
      for (const siteIdx of [0, 1]) {
        const totals = PATIENT_IDS.map((id) => {
          const score = graph.inEdges(id).reduce((s, e) => {
            const rec = graph.byChannel[e.channelId].record;
            return s + (rec.siteIdx === siteIdx ? rec.weight * 2 : rec.weight);
          }, 0);
          return { id, score };
        });
        const uniq = Array.from(new Set(totals.map((t) => t.score))).sort((a, b) => b - a);
        for (const threshold of uniq) {
          if (threshold < 9) continue;
          const hits = totals.filter((t) => t.score >= threshold);
          if (hits.length >= 1 && hits.length <= 3) return { siteIdx, threshold };
        }
      }
      return { siteIdx: 0, threshold: 9 };
    },
    order({ siteIdx, threshold }, sc) {
      return `What-if surge check: suppose every Weight inside ${sc.sites[siteIdx]} DOUBLED (×2), while ${sc.sites[1 - siteIdx]} stayed normal. Sum right-side Weights under that surge and act for anyone reaching ≥ ${threshold}.`;
    },
    detail({ siteIdx, threshold }, sc) {
      return `Count ${sc.sites[siteIdx]} right-side rows at 2× Weight and ${sc.sites[1 - siteIdx]} at 1× Weight; select patients totaling ≥ ${threshold}.`;
    },
    evaluate(graph, { siteIdx, threshold }) {
      return uniqueSorted(
        PATIENT_IDS.filter((id) => {
          const score = graph.inEdges(id).reduce((s, e) => {
            const rec = graph.byChannel[e.channelId].record;
            return s + (rec.siteIdx === siteIdx ? rec.weight * 2 : rec.weight);
          }, 0);
          return score >= threshold;
        })
      );
    },
    explain(graph, { siteIdx, threshold }, sc, targets) {
      const scores = Object.fromEntries(
        PATIENT_IDS.map((id) => [
          id,
          graph.inEdges(id).reduce((s, e) => {
            const rec = graph.byChannel[e.channelId].record;
            return s + (rec.siteIdx === siteIdx ? rec.weight * 2 : rec.weight);
          }, 0),
        ])
      );
      const below = PATIENT_IDS.filter((id) => !targets.includes(id) && scores[id] > 0).sort(
        (a, b) => scores[b] - scores[a]
      );
      return {
        proof: `Doubling ${sc.sites[siteIdx]} Weights raises ${targets.map((id) => `${pName(id)} (+${scores[id]})`).join(', ')} to ≥ ${threshold}.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, below, (id) => `Even with ${sc.sites[siteIdx]} doubled, ${pName(id)} only reaches +${scores[id]} (below ${threshold}).`),
      };
    },
  },

  // 60. #38 Prognostic Worsening Arc (right-side or left-side Weight strictly rises from an earlier record to a later record)
  'prognostic-worsening-arc': {
    usesWeights: true,
    usesMinutes: false,
    pickParams(rng, graph) {
      for (const side of ['right', 'left']) {
        const worsening = PATIENT_IDS.filter((id) => {
          const rows = (side === 'right' ? graph.inEdges(id) : graph.outEdges(id))
            .map((e) => graph.byChannel[e.channelId].record)
            .sort((a, b) => a.timeRank - b.timeRank);
          for (let i = 0; i < rows.length; i++) {
            for (let j = i + 1; j < rows.length; j++) {
              if (rows[j].timeRank > rows[i].timeRank && rows[j].weight > rows[i].weight) return true;
            }
          }
          return false;
        });
        if (worsening.length >= 1 && worsening.length <= 4) return { side };
      }
      return { side: 'right' };
    },
    order({ side }) {
      const s = side === 'right' ? 'RIGHT' : 'LEFT';
      return `Worsening trend check: find every patient who appears on the ${s} side in an earlier record AND again on the ${s} side in a LATER record with a STRICTLY HIGHER Weight.`;
    },
    detail({ side }) {
      return `Track each patient's ${side}-side appearances in clock order (01:00 → 06:00)—select anyone whose Weight climbs upward.`;
    },
    evaluate(graph, { side }) {
      return uniqueSorted(
        PATIENT_IDS.filter((id) => {
          const recs = (side === 'right' ? graph.inEdges(id) : graph.outEdges(id))
            .map((e) => graph.byChannel[e.channelId].record)
            .sort((a, b) => a.timeRank - b.timeRank);
          for (let i = 0; i < recs.length; i++) {
            for (let j = i + 1; j < recs.length; j++) {
              if (recs[j].timeRank > recs[i].timeRank && recs[j].weight > recs[i].weight) return true;
            }
          }
          return false;
        })
      );
    },
    explain(graph, { side }, _sc, targets) {
      const improving = PATIENT_IDS.filter((id) => {
        if (targets.includes(id)) return false;
        const recs = (side === 'right' ? graph.inEdges(id) : graph.outEdges(id))
          .map((e) => graph.byChannel[e.channelId].record);
        return recs.length >= 2;
      });
      return {
        proof: `${formatNameList(targets)} show an upward-climbing ${side}-side Weight trajectory from an earlier to a later timestamp.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, improving, (id) => `${pName(id)}'s ${side}-side Weight fell over time rather than worsening.`),
      };
    },
  },

  // 61. #39 Extrapolative Trend Slope (05:00 -> 06:00 rising vs falling acuity projects right vs left of 06:00)
  'extrapolative-trend-slope': {
    usesWeights: true,
    usesMinutes: false,
    pickParams() {
      return {};
    },
    order() {
      return `End-of-shift trajectory: compare Weight at 05:00 vs 06:00. If acuity is RISING (06:00 > 05:00), select RIGHT-side patients of 06:00; if FALLING (06:00 < 05:00), select LEFT-side patients of 06:00.`;
    },
    detail() {
      return `Check whether the shift closes on a rising or falling Weight slope from 05:00 to 06:00, then act on the matching side of 06:00.`;
    },
    evaluate(graph) {
      const r5 = graph.records.find((r) => r.timeRank === 4);
      const r6 = graph.records.find((r) => r.timeRank === 5);
      if (!r5 || !r6) return [];
      return r6.weight > r5.weight ? graph.targetsOf(r6.channelId) : graph.sourcesOf(r6.channelId);
    },
    explain(graph, _params, _sc, targets) {
      const r5 = graph.records.find((r) => r.timeRank === 4);
      const r6 = graph.records.find((r) => r.timeRank === 5);
      const rising = r6.weight > r5.weight;
      const opposite = rising ? graph.sourcesOf(r6.channelId) : graph.targetsOf(r6.channelId);
      return {
        proof: `Acuity moves from +${r5.weight} (05:00) to +${r6.weight} (06:00) — ${rising ? 'rising' : 'falling'}, projecting the ${rising ? 'right' : 'left'} side of ${r6.label}: ${formatNameList(targets)}.`,
        decisiveChannels: [r5.channelId, r6.channelId],
        rival: buildRival(targets, opposite, (id) => `${pName(id)} is on the opposite side of 06:00 (${r6.label}).`),
      };
    },
  },

  // 62. #42 Systems Feedback Loop (2-hop or 3-hop cycle, or cross-unit loop)
  'systems-feedback-loop': {
    usesWeights: false,
    usesMinutes: false,
    pickParams(rng, graph) {
      const inCycle = new Set();
      for (const e1 of graph.allEdges) {
        for (const e2 of graph.allEdges) {
          if (e1.to === e2.from && e2.to === e1.from) {
            inCycle.add(e1.from);
            inCycle.add(e1.to);
          }
          for (const e3 of graph.allEdges) {
            if (e1.to === e2.from && e2.to === e3.from && e3.to === e1.from) {
              inCycle.add(e1.from);
              inCycle.add(e2.from);
              inCycle.add(e3.from);
            }
          }
        }
      }
      if (inCycle.size >= 2 && inCycle.size <= 4) return { mode: 'cycle' };
      return { mode: 'bidirectional-hub' };
    },
    order({ mode }, sc) {
      if (mode === 'cycle') {
        return `Feedback loop alert: trace closed loops where arrows cycle back to the start (A → B → A or A → B → C → A). Select every patient trapped inside a closed loop.`;
      }
      return `Cross-unit feedback check: find every patient who appears on the RIGHT side in ${sc.sites[0]} AND on the LEFT side in ${sc.sites[1]} (feeding stress back from one unit into the other).`;
    },
    detail({ mode }, sc) {
      return mode === 'cycle'
        ? `Follow arrows across all 6 rows to spot any closed 2-patient or 3-patient cycle returning to its starting patient.`
        : `Find patients receiving a flag in ${sc.sites[0]} who then initiate a link inside ${sc.sites[1]}.`;
    },
    evaluate(graph, { mode }) {
      if (mode === 'cycle') {
        const inCycle = new Set();
        for (const e1 of graph.allEdges) {
          for (const e2 of graph.allEdges) {
            if (e1.to === e2.from && e2.to === e1.from) {
              inCycle.add(e1.from);
              inCycle.add(e1.to);
            }
            for (const e3 of graph.allEdges) {
              if (e1.to === e2.from && e2.to === e3.from && e3.to === e1.from) {
                inCycle.add(e1.from);
                inCycle.add(e2.from);
                inCycle.add(e3.from);
              }
            }
          }
        }
        return uniqueSorted(Array.from(inCycle));
      }
      const r0 = new Set(graph.allEdges.filter((e) => e.siteIdx === 0).map((e) => e.to));
      const l1 = new Set(graph.allEdges.filter((e) => e.siteIdx === 1).map((e) => e.from));
      return uniqueSorted(Array.from(r0).filter((id) => l1.has(id)));
    },
    explain(graph, { mode }, sc, targets) {
      return {
        proof:
          mode === 'cycle'
            ? `${formatNameList(targets)} form a closed feedback loop across the ward records.`
            : `${formatNameList(targets)} receive flags in ${sc.sites[0]} and loop stress back out on the left side of ${sc.sites[1]}.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, PATIENT_IDS, (id) => `${pName(id)} is not part of the closed feedback pathway.`),
      };
    },
  },

  // 63. #43 Strategic Bottleneck Reserve (pick the unit with higher cumulative Weight, act on its LATEST record)
  'strategic-bottleneck-reserve': {
    usesWeights: true,
    usesMinutes: false,
    pickParams() {
      return {};
    },
    order(_params, sc) {
      return `Reserve deployment: total the 3 Weights in ${sc.sites[0]} versus the 3 Weights in ${sc.sites[1]}. Commit your team to the HEAVIER unit and treat the right-side patients of its LATEST record.`;
    },
    detail(_params, sc) {
      return `Sum ${sc.sites[0]}'s 3 Weights vs ${sc.sites[1]}'s 3 Weights (sums are guaranteed unequal), then pick right-side patients of that heavier unit's latest row.`;
    },
    evaluate(graph) {
      const s0 = graph.records.filter((r) => r.siteIdx === 0);
      const s1 = graph.records.filter((r) => r.siteIdx === 1);
      const w0 = s0.reduce((a, r) => a + r.weight, 0);
      const w1 = s1.reduce((a, r) => a + r.weight, 0);
      const heavy = (w0 >= w1 ? s0 : s1).slice().sort((a, b) => b.timeRank - a.timeRank)[0];
      return heavy ? graph.targetsOf(heavy.channelId) : [];
    },
    explain(graph, _params, sc, targets) {
      const s0 = graph.records.filter((r) => r.siteIdx === 0);
      const s1 = graph.records.filter((r) => r.siteIdx === 1);
      const w0 = s0.reduce((a, r) => a + r.weight, 0);
      const w1 = s1.reduce((a, r) => a + r.weight, 0);
      const heavyIdx = w0 >= w1 ? 0 : 1;
      const chosen = (heavyIdx === 0 ? s0 : s1).slice().sort((a, b) => b.timeRank - a.timeRank)[0];
      const otherLatest = (heavyIdx === 0 ? s1 : s0).slice().sort((a, b) => b.timeRank - a.timeRank)[0];
      return {
        proof: `${sc.sites[0]} totals +${w0} vs ${sc.sites[1]} +${w1}; deploying to ${sc.sites[heavyIdx]}'s latest ${chosen.label} (${chosen.time}) selects ${formatNameList(targets)}.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, graph.targetsOf(otherLatest.channelId), (id) => `${pName(id)} belongs to the lighter-load unit (${sc.sites[1 - heavyIdx]}).`),
      };
    },
  },

  // 64. #45 Adversarial Worst-Case (assume fastest <=2m rows are blocked -> take heaviest remaining >=3m row)
  'adversarial-worst-case': {
    usesWeights: true,
    usesMinutes: true,
    pickParams() {
      return {};
    },
    order() {
      return `Contingency fallback: assume every quick procedure (1m–2m) is BLOCKED by an equipment failure. Among the remaining rows (3m–6m), select right-side patients of the single HEAVIEST Weight row.`;
    },
    detail() {
      return `Cross off the 1m and 2m rows as unavailable, find the highest Weight among the 3m–6m rows, and select its right-side patients.`;
    },
    evaluate(graph) {
      const rem = graph.records.filter((r) => r.minutes >= 3).sort((a, b) => b.weight - a.weight);
      return rem.length ? graph.targetsOf(rem[0].channelId) : [];
    },
    explain(graph, _params, _sc, targets) {
      const blocked = graph.records.filter((r) => r.minutes <= 2);
      const rem = graph.records.filter((r) => r.minutes >= 3).sort((a, b) => b.weight - a.weight);
      const best = rem[0];
      return {
        proof: `With 1m–2m options blocked, the heaviest surviving fallback is ${best.label} (+${best.weight}, ${best.minutes}m): ${formatNameList(targets)}.`,
        decisiveChannels: [best.channelId, ...blocked.map((r) => r.channelId)],
        rival: buildRival(
          targets,
          blocked.flatMap((r) => graph.targetsOf(r.channelId)),
          (id) => `${pName(id)} sits in a blocked 1m–2m record and cannot be reached under worst-case failure.`
        ),
      };
    },
  },

  // 65. #47 Instrumental Means-End (who directly feeds into the heaviest +6 record's right-side patients?)
  'instrumental-means-end': {
    usesWeights: true,
    usesMinutes: false,
    pickParams() {
      return {};
    },
    order() {
      return `Means-to-end call: your sole objective is stabilizing the right-side patients of the heaviest (+6) record. Select every LEFT-side patient (in ANY record) who directly feeds into one of those +6 target patients.`;
    },
    detail() {
      return `Find the right-side patients in the +6 row first, then select every left-side patient across the board whose arrow points to any of them.`;
    },
    evaluate(graph) {
      const top = graph.records.find((r) => r.weight === 6);
      if (!top) return [];
      const goalSet = new Set(graph.targetsOf(top.channelId));
      return uniqueSorted(graph.allEdges.filter((e) => goalSet.has(e.to)).map((e) => e.from));
    },
    explain(graph, _params, _sc, targets) {
      const top = graph.records.find((r) => r.weight === 6);
      const goals = graph.targetsOf(top.channelId);
      return {
        proof: `Goal patients in ${top.label} (+6) are ${formatNameList(goals)}; direct left-side levers feeding them are ${formatNameList(targets)}.`,
        decisiveChannels: [top.channelId],
        rival: buildRival(targets, goals, (id) => `${pName(id)} is the end-goal target itself rather than an upstream lever feeding into it.`),
      };
    },
  },

  // 66. #51 Algorithmic Flowchart (2-step clinical decision tree: 01:00 Weight >= 4 -> branch A else branch B)
  'algorithmic-flowchart': {
    usesWeights: true,
    usesMinutes: false,
    pickParams() {
      return {};
    },
    order() {
      return `Bedside decision tree: Step 1 — check 01:00's Weight. If 01:00 is +4..+6, take right-side patients of 01:00 EXCEPT anyone in 06:00. If 01:00 is +1..+3, take right-side patients of the heaviest (+6) record.`;
    },
    detail() {
      return `Follow the exact 2-step flowchart starting from 01:00's Weight (+4..+6 vs +1..+3).`;
    },
    evaluate(graph) {
      const first = graph.records.find((r) => r.timeRank === 0);
      const last = graph.records.find((r) => r.timeRank === 5);
      const heaviest = graph.records.find((r) => r.weight === 6);
      if (!first || !last || !heaviest) return [];
      if (first.weight >= 4) {
        const excl = new Set(graph.patientsIn(last.channelId));
        return graph.targetsOf(first.channelId).filter((id) => !excl.has(id));
      }
      return graph.targetsOf(heaviest.channelId);
    },
    explain(graph, _params, _sc, targets) {
      const first = graph.records.find((r) => r.timeRank === 0);
      const last = graph.records.find((r) => r.timeRank === 5);
      const heaviest = graph.records.find((r) => r.weight === 6);
      const branchA = first.weight >= 4;
      const other = branchA ? graph.targetsOf(heaviest.channelId) : graph.targetsOf(first.channelId);
      return {
        proof: `01:00 (${first.label}) has Weight +${first.weight}, routing to ${branchA ? `Branch A (01:00 minus 06:00)` : `Branch B (+6 ${heaviest.label})`}: ${formatNameList(targets)}.`,
        decisiveChannels: branchA ? [first.channelId, last.channelId] : [first.channelId, heaviest.channelId],
        rival: buildRival(targets, other, (id) => `${pName(id)} sits on the untaken branch of the bedside decision tree.`),
      };
    },
  },

  // 67. #54 Convergent Funnel (wide Unit pool -> narrow to right side -> filter to Weight >= 4)
  'convergent-funnel': {
    usesWeights: true,
    usesMinutes: false,
    pickParams(rng, graph) {
      const valid = [];
      for (const siteIdx of [0, 1]) {
        for (const minW of [4, 3]) {
          const hits = uniqueSorted(
            graph.records
              .filter((r) => r.siteIdx === siteIdx && r.weight >= minW)
              .flatMap((r) => graph.targetsOf(r.channelId))
          );
          if (hits.length >= 1 && hits.length <= 4) valid.push({ siteIdx, minW });
        }
      }
      return valid.length ? valid[Math.floor(rng() * valid.length)] : { siteIdx: 0, minW: 4 };
    },
    order({ siteIdx, minW }, sc) {
      return `Narrowing funnel: start with everyone in ${sc.sites[siteIdx]}, narrow down to RIGHT-side entries only, then keep ONLY rows with Weight ≥ +${minW}.`;
    },
    detail({ siteIdx, minW }, sc) {
      return `Filter in 3 narrowing steps: ${sc.sites[siteIdx]} → right-side patients → Weight +${minW}..+6.`;
    },
    evaluate(graph, { siteIdx, minW }) {
      return uniqueSorted(
        graph.records
          .filter((r) => r.siteIdx === siteIdx && r.weight >= minW)
          .flatMap((r) => graph.targetsOf(r.channelId))
      );
    },
    explain(graph, { siteIdx, minW }, sc, targets) {
      const lightSameSite = uniqueSorted(
        graph.records
          .filter((r) => r.siteIdx === siteIdx && r.weight < minW)
          .flatMap((r) => graph.targetsOf(r.channelId))
      );
      return {
        proof: `Narrowing ${sc.sites[siteIdx]} right-side rows to Weight ≥ +${minW} leaves ${formatNameList(targets)}.`,
        decisiveChannels: graph.records.filter((r) => r.siteIdx === siteIdx && r.weight >= minW).map((r) => r.channelId),
        rival: buildRival(targets, lightSameSite, (id) => `${pName(id)} is in ${sc.sites[siteIdx]} but below the Weight ≥ +${minW} cutoff.`),
      };
    },
  },

  // 68. #55 Synthetic Triangulation (RIGHT-side presence across Unit + Weight >= minW + Time >= 03:00 combined across records)
  'synthetic-triangulation': {
    usesWeights: true,
    usesMinutes: false,
    pickParams(rng, graph) {
      for (const siteIdx of [0, 1]) {
        for (const minW of [4, 3]) {
          const inSite = new Set(graph.records.filter((r) => r.siteIdx === siteIdx).flatMap((r) => graph.targetsOf(r.channelId)));
          const inHigh = new Set(graph.records.filter((r) => r.weight >= minW).flatMap((r) => graph.targetsOf(r.channelId)));
          const inLate = new Set(graph.records.filter((r) => r.timeRank >= 2).flatMap((r) => graph.targetsOf(r.channelId)));
          const hits = PATIENT_IDS.filter((id) => inSite.has(id) && inHigh.has(id) && inLate.has(id));
          if (hits.length >= 1 && hits.length <= 4) return { siteIdx, minW };
        }
      }
      return { siteIdx: 0, minW: 3 };
    },
    order({ siteIdx, minW }, sc) {
      return `Three-signal match: select every patient flagged on the RIGHT side across ALL THREE criteria — inside ${sc.sites[siteIdx]}, in any Weight ≥ +${minW} row, AND in any row at 03:00 or later.`;
    },
    detail({ siteIdx, minW }, sc) {
      return `The 3 right-side signals can come from the same row or separate rows: confirm ${sc.sites[siteIdx]} + Weight ≥ +${minW} + Time ≥ 03:00.`;
    },
    evaluate(graph, { siteIdx, minW }) {
      const inSite = new Set(graph.records.filter((r) => r.siteIdx === siteIdx).flatMap((r) => graph.targetsOf(r.channelId)));
      const inHigh = new Set(graph.records.filter((r) => r.weight >= minW).flatMap((r) => graph.targetsOf(r.channelId)));
      const inLate = new Set(graph.records.filter((r) => r.timeRank >= 2).flatMap((r) => graph.targetsOf(r.channelId)));
      return uniqueSorted(PATIENT_IDS.filter((id) => inSite.has(id) && inHigh.has(id) && inLate.has(id)));
    },
    explain(graph, { siteIdx, minW }, sc, targets) {
      const inHigh = uniqueSorted(graph.records.filter((r) => r.weight >= minW).flatMap((r) => graph.targetsOf(r.channelId)));
      return {
        proof: `Integrating right-side signals across ${sc.sites[siteIdx]}, Weight ≥ +${minW}, and Time ≥ 03:00 isolates ${formatNameList(targets)}.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, inHigh, (id) => `${pName(id)} met right-side Weight ≥ +${minW}, but missed either ${sc.sites[siteIdx]} or the 03:00–06:00 window.`),
      };
    },
  },

  // 69. #57 First-Principles High-Impact Root (pure initiators on left only, in Weight >= 4 rows)
  'first-principles-root-weight': {
    usesWeights: true,
    usesMinutes: false,
    pickParams(rng, graph) {
      for (const minW of [4, 3, 2]) {
        const hits = PATIENT_IDS.filter((id) => {
          const outs = graph.outEdges(id);
          return graph.inEdges(id).length === 0 && outs.some((e) => graph.byChannel[e.channelId].record.weight >= minW);
        });
        if (hits.length >= 1 && hits.length <= 4) return { minW };
      }
      return { minW: 1 };
    },
    order({ minW }) {
      return `Foundational driver call: find pure upstream drivers (NEVER on the right side of any row) who initiate at least one serious record (Weight ≥ +${minW}).`;
    },
    detail({ minW }) {
      return `Check left-side patients in Weight +${minW}..+6 rows, then exclude anyone who appears on the right side anywhere on the chart.`;
    },
    evaluate(graph, { minW }) {
      return uniqueSorted(
        PATIENT_IDS.filter((id) => {
          const outs = graph.outEdges(id);
          return graph.inEdges(id).length === 0 && outs.some((e) => graph.byChannel[e.channelId].record.weight >= minW);
        })
      );
    },
    explain(graph, { minW }, _sc, targets) {
      const nonPure = uniqueSorted(
        graph.records.filter((r) => r.weight >= minW).flatMap((r) => graph.sourcesOf(r.channelId))
      );
      return {
        proof: `${formatNameList(targets)} initiate Weight ≥ +${minW} records while having zero incoming arrows anywhere on the board.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, nonPure, (id) => `${pName(id)} initiates a Weight ≥ +${minW} row, but also receives an incoming arrow elsewhere.`),
      };
    },
  },

  // 70. #60 Decompositional Shift Split (right side in BOTH Early Half 01:00-03:00 AND Late Half 04:00-06:00)
  'decompositional-split': {
    usesWeights: false,
    usesMinutes: false,
    pickParams(rng, graph) {
      const earlyR = new Set(graph.records.filter((r) => r.timeRank <= 2).flatMap((r) => graph.targetsOf(r.channelId)));
      const lateR = new Set(graph.records.filter((r) => r.timeRank >= 3).flatMap((r) => graph.targetsOf(r.channelId)));
      const bothR = Array.from(earlyR).filter((id) => lateR.has(id));
      if (bothR.length >= 1 && bothR.length <= 4) return { side: 'right' };
      return { side: 'any' };
    },
    order({ side }) {
      return side === 'right'
        ? `Half-shift breakdown: split the chart into Early Half (01:00–03:00) and Late Half (04:00–06:00). Select every patient appearing on the RIGHT side in BOTH halves.`
        : `Half-shift breakdown: split the chart into Early Half (01:00–03:00) and Late Half (04:00–06:00). Select every patient appearing on the LEFT side in BOTH halves.`;
    },
    detail({ side }) {
      return `Break the 6 rows into two 3-row halves (01:00–03:00 vs 04:00–06:00) and keep ${side}-side patients present in both.`;
    },
    evaluate(graph, { side }) {
      const fn = (r) => (side === 'right' ? graph.targetsOf(r.channelId) : graph.sourcesOf(r.channelId));
      const early = new Set(graph.records.filter((r) => r.timeRank <= 2).flatMap(fn));
      const late = new Set(graph.records.filter((r) => r.timeRank >= 3).flatMap(fn));
      return uniqueSorted(Array.from(early).filter((id) => late.has(id)));
    },
    explain(graph, { side }, _sc, targets) {
      const fn = (r) => (side === 'right' ? graph.targetsOf(r.channelId) : graph.sourcesOf(r.channelId));
      const early = uniqueSorted(graph.records.filter((r) => r.timeRank <= 2).flatMap(fn));
      return {
        proof: `Decomposing the shift into 01:00–03:00 and 04:00–06:00 shows ${formatNameList(targets)} recurring on the ${side} side in both halves.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, early, (id) => `${pName(id)} appeared in 01:00–03:00 only and did not recur in 04:00–06:00.`),
      };
    },
  },

  // 71. #61 Emergent Multi-Record Overload (requires >= 2 separate RIGHT-side rows whose combined Weight >= threshold)
  'emergent-cluster-threshold': {
    usesWeights: true,
    usesMinutes: false,
    pickParams(rng, graph) {
      const loads = PATIENT_IDS.map((id) => {
        const rows = graph.records.filter((r) => graph.targetsOf(r.channelId).includes(id));
        return {
          id,
          count: rows.length,
          load: rows.reduce((s, r) => s + r.weight, 0),
        };
      }).filter((x) => x.count >= 2);
      const uniq = Array.from(new Set(loads.map((x) => x.load))).sort((a, b) => b - a);
      for (const th of uniq) {
        if (th < 6) continue;
        const hits = loads.filter((x) => x.load >= th);
        if (hits.length >= 1 && hits.length <= 3) return { threshold: th };
      }
      return { threshold: 6 };
    },
    order({ threshold }) {
      return `Compound overload alert: no single record triggers this alone—find patients flagged on the RIGHT side in AT LEAST TWO separate records whose combined right-side Weight reaches ≥ ${threshold}.`;
    },
    detail({ threshold }) {
      return `Ignore patients with only 1 right-side row (even +6). Add right-side Weights for patients with ≥ 2 rows and pick everyone totaling ≥ ${threshold}.`;
    },
    evaluate(graph, { threshold }) {
      return uniqueSorted(
        PATIENT_IDS.filter((id) => {
          const rows = graph.records.filter((r) => graph.targetsOf(r.channelId).includes(id));
          return rows.length >= 2 && rows.reduce((s, r) => s + r.weight, 0) >= threshold;
        })
      );
    },
    explain(graph, { threshold }, _sc, targets) {
      const info = Object.fromEntries(
        PATIENT_IDS.map((id) => {
          const rows = graph.records.filter((r) => graph.targetsOf(r.channelId).includes(id));
          return [id, { count: rows.length, load: rows.reduce((s, r) => s + r.weight, 0) }];
        })
      );
      const singleSix = PATIENT_IDS.filter((id) => !targets.includes(id) && info[id].count === 1 && info[id].load >= 5);
      const below = PATIENT_IDS.filter((id) => !targets.includes(id) && info[id].count >= 2).sort(
        (a, b) => info[b].load - info[a].load
      );
      return {
        proof: `Compound multi-record load (≥ 2 right-side rows, total ≥ ${threshold}) emerges on ${targets.map((id) => `${pName(id)} (${info[id].count} rows, +${info[id].load})`).join(', ')}.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, [...singleSix, ...below], (id) =>
          info[id].count < 2
            ? `${pName(id)} only appears in 1 right-side row (+${info[id].load}), not a multi-record buildup.`
            : `${pName(id)} appears in ${info[id].count} rows but only totals +${info[id].load} (below ${threshold}).`
        ),
      };
    },
  },

  // 72. #62 Interpersonal Liaison Hub (most distinct downstream contacts initiated from the LEFT side)
  'interpersonal-liaison-hub': {
    usesWeights: false,
    usesMinutes: false,
    pickParams(rng) {
      return { dir: rng() < 0.5 ? 'out' : 'in' };
    },
    order({ dir }) {
      return dir === 'out'
        ? `Care-network hub: count how many DISTINCT other patients each person directly hands off to (LEFT → partner) across all 6 records. Select everyone tied for the MOST distinct outgoing partners.`
        : `Care-network hub: count how many DISTINCT other patients directly contact each person (partner → RIGHT) across all 6 records. Select everyone tied for the MOST distinct incoming partners.`;
    },
    detail({ dir }) {
      return dir === 'out'
        ? `For each left-side patient, count unique right-side partners (repeat links to the same person count once); pick the top hub(s).`
        : `For each right-side patient, count unique left-side partners (repeat links from the same person count once); pick the top hub(s).`;
    },
    evaluate(graph, { dir }) {
      const degs = PATIENT_IDS.map((id) => {
        const partners = new Set(
          dir === 'out' ? graph.outEdges(id).map((e) => e.to) : graph.inEdges(id).map((e) => e.from)
        );
        return { id, deg: partners.size };
      });
      const maxD = Math.max(...degs.map((d) => d.deg));
      if (maxD < 2) return [];
      return uniqueSorted(degs.filter((d) => d.deg === maxD).map((d) => d.id));
    },
    explain(graph, { dir }, _sc, targets) {
      const degs = PATIENT_IDS.map((id) => {
        const partners = new Set(
          dir === 'out' ? graph.outEdges(id).map((e) => e.to) : graph.inEdges(id).map((e) => e.from)
        );
        return { id, deg: partners.size };
      }).sort((a, b) => b.deg - a.deg);
      const top = degs[0].deg;
      const below = degs.filter((d) => d.deg < top).map((d) => d.id);
      return {
        proof: `${formatNameList(targets)} anchor the ward network with ${top} distinct ${dir === 'out' ? 'outgoing' : 'incoming'} partners.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, below, (id) => {
          const d = degs.find((x) => x.id === id)?.deg || 0;
          return `${pName(id)} only connects to ${d} distinct ${dir === 'out' ? 'outgoing' : 'incoming'} partners (below ${top}).`;
        }),
      };
    },
  },

  // 73. #64 Motivational Pressure Check (initiates in a high-weight >=4 row while ALSO receiving in an earlier row)
  'motivational-pressure-check': {
    usesWeights: true,
    usesMinutes: false,
    pickParams(rng, graph) {
      for (const minW of [4, 3, 2]) {
        const hits = PATIENT_IDS.filter((id) => {
          const highOut = graph.outEdges(id).filter((e) => graph.byChannel[e.channelId].record.weight >= minW);
          if (!highOut.length) return false;
          const maxOutRank = Math.max(...highOut.map((e) => graph.timeRankOf(e.channelId)));
          return graph.inEdges(id).some((e) => graph.timeRankOf(e.channelId) < maxOutRank);
        });
        if (hits.length >= 1 && hits.length <= 4) return { minW };
      }
      return { minW: 1 };
    },
    order({ minW }) {
      return `Hidden-pressure check: find every patient who pushes an action (LEFT side) in a Weight ≥ +${minW} record AFTER having already appeared on the RIGHT side of an EARLIER record.`;
    },
    detail({ minW }) {
      return `Look at left-side patients in Weight +${minW}..+6 rows, then check if they previously received an action (right side) at an earlier timestamp.`;
    },
    evaluate(graph, { minW }) {
      return uniqueSorted(
        PATIENT_IDS.filter((id) => {
          const highOut = graph.outEdges(id).filter((e) => graph.byChannel[e.channelId].record.weight >= minW);
          if (!highOut.length) return false;
          const maxOutRank = Math.max(...highOut.map((e) => graph.timeRankOf(e.channelId)));
          return graph.inEdges(id).some((e) => graph.timeRankOf(e.channelId) < maxOutRank);
        })
      );
    },
    explain(graph, { minW }, _sc, targets) {
      const unpressured = uniqueSorted(
        graph.records.filter((r) => r.weight >= minW).flatMap((r) => graph.sourcesOf(r.channelId))
      );
      return {
        proof: `${formatNameList(targets)} act on the left side of a Weight ≥ +${minW} record after an earlier right-side pressure event.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, unpressured, (id) => `${pName(id)} initiated a Weight ≥ +${minW} row without any earlier incoming pressure on the right side.`),
      };
    },
  },

  // 74. #67 Pragmatic Feasibility (fast <=3m AND meaningful Weight >=3 right-side patients)
  'pragmatic-feasibility': {
    usesWeights: true,
    usesMinutes: true,
    pickParams(rng, graph) {
      for (const minW of [4, 3, 2]) {
        const hits = uniqueSorted(
          graph.records
            .filter((r) => r.minutes <= 3 && r.weight >= minW)
            .flatMap((r) => graph.targetsOf(r.channelId))
        );
        if (hits.length >= 1 && hits.length <= 4) return { minW };
      }
      return { minW: 1 };
    },
    order({ minW }) {
      return `Practical bedside call: slow procedures (4m–6m) take too long right now. Select right-side patients ONLY from fast doable rows (1m–3m) that still carry Weight ≥ +${minW}.`;
    },
    detail({ minW }) {
      return `Filter for rows with Min ≤ 3m AND Weight ≥ +${minW}, then attend to their right-side patients.`;
    },
    evaluate(graph, { minW }) {
      return uniqueSorted(
        graph.records
          .filter((r) => r.minutes <= 3 && r.weight >= minW)
          .flatMap((r) => graph.targetsOf(r.channelId))
      );
    },
    explain(graph, { minW }, _sc, targets) {
      const qual = graph.records.filter((r) => r.minutes <= 3 && r.weight >= minW);
      const slowHeavy = graph.records.filter((r) => r.minutes > 3 && r.weight >= minW);
      return {
        proof: `Feasible quick rows (≤ 3m & Weight ≥ +${minW}) are ${qual.map((r) => `${r.label} (+${r.weight}, ${r.minutes}m)`).join(', ')}, selecting ${formatNameList(targets)}.`,
        decisiveChannels: qual.map((r) => r.channelId),
        rival: buildRival(targets, slowHeavy.flatMap((r) => graph.targetsOf(r.channelId)), (id) => `${pName(id)} has high Weight but requires > 3m, exceeding the practical window.`),
      };
    },
  },

  // 75. #69 Narrative Full-Shift Arc (starts on LEFT in Opening 01:00-03:00 and ends on RIGHT in Closing 04:00-06:00)
  'narrative-chronological-arc': {
    usesWeights: false,
    usesMinutes: false,
    pickParams() {
      return {};
    },
    order() {
      return `Full-shift story arc: find every patient whose role shifts across the shift — starting on the LEFT side during 01:00–03:00 and ending on the RIGHT side during 04:00–06:00.`;
    },
    detail() {
      return `Check LEFT-side names in 01:00–03:00 against RIGHT-side names in 04:00–06:00.`;
    },
    evaluate(graph) {
      const openLeft = new Set(graph.records.filter((r) => r.timeRank <= 2).flatMap((r) => graph.sourcesOf(r.channelId)));
      const closeRight = new Set(graph.records.filter((r) => r.timeRank >= 3).flatMap((r) => graph.targetsOf(r.channelId)));
      return uniqueSorted(Array.from(openLeft).filter((id) => closeRight.has(id)));
    },
    explain(graph, _params, _sc, targets) {
      const openLeft = uniqueSorted(graph.records.filter((r) => r.timeRank <= 2).flatMap((r) => graph.sourcesOf(r.channelId)));
      return {
        proof: `${formatNameList(targets)} begin on the left side during 01:00–03:00 and finish on the right side during 04:00–06:00.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, openLeft, (id) => `${pName(id)} started on the left in 01:00–03:00 but never ended on the right in 04:00–06:00.`),
      };
    },
  },

  // 76. #70 Perspectival Viewpoint Flip (left-only inside Unit siteIdx, never on the right inside that unit)
  'perspectival-flip-view': {
    usesWeights: false,
    usesMinutes: false,
    pickParams(rng) {
      return { siteIdx: rng() < 0.5 ? 0 : 1 };
    },
    order({ siteIdx }, sc) {
      return `Opposite-view check (${sc.sites[siteIdx]}): step into the initiator's shoes inside ${sc.sites[siteIdx]} ONLY—select every patient appearing on the LEFT side there who NEVER appears on the right side in ${sc.sites[siteIdx]}.`;
    },
    detail({ siteIdx }, sc) {
      return `Look strictly at ${sc.sites[siteIdx]}'s 3 rows: take left-side names and cross off anyone who also sits on the right side in ${sc.sites[siteIdx]}.`;
    },
    evaluate(graph, { siteIdx }) {
      const recs = graph.records.filter((r) => r.siteIdx === siteIdx);
      const left = uniqueSorted(recs.flatMap((r) => graph.sourcesOf(r.channelId)));
      const right = new Set(recs.flatMap((r) => graph.targetsOf(r.channelId)));
      return left.filter((id) => !right.has(id));
    },
    explain(graph, { siteIdx }, sc, targets) {
      const recs = graph.records.filter((r) => r.siteIdx === siteIdx);
      const right = uniqueSorted(recs.flatMap((r) => graph.targetsOf(r.channelId)));
      return {
        proof: `From the initiator's viewpoint inside ${sc.sites[siteIdx]}, ${formatNameList(targets)} appear exclusively on the left side.`,
        decisiveChannels: recs.map((r) => r.channelId),
        rival: buildRival(targets, right, (id) => `${pName(id)} appears on the receiving (right) side inside ${sc.sites[siteIdx]}.`),
      };
    },
  },

  // 77. #73 Reflective Anchoring Audit (ignore the dramatic +6 record completely; pick highest right-side Weight sum among the OTHER 5 rows)
  'reflective-bias-check': {
    usesWeights: true,
    usesMinutes: false,
    pickParams() {
      return {};
    },
    order() {
      return `Second-look audit: do NOT anchor on the loud +6 headline—set the +6 record aside completely. Sum each patient's right-side Weight across the OTHER 5 records and select who now ties for the MAXIMUM.`;
    },
    detail() {
      return `Ignore the +6 row, add right-side Weights across the +1..+5 rows only, and pick the patient(s) with the highest subtotal.`;
    },
    evaluate(graph) {
      const nonTop = graph.records.filter((r) => r.weight < 6);
      const totals = PATIENT_IDS.map((id) => ({
        id,
        sum: nonTop.reduce((s, r) => s + (graph.targetsOf(r.channelId).includes(id) ? r.weight : 0), 0),
      }));
      const maxS = Math.max(...totals.map((t) => t.sum));
      if (maxS <= 0) return [];
      return uniqueSorted(totals.filter((t) => t.sum === maxS).map((t) => t.id));
    },
    explain(graph, _params, _sc, targets) {
      const topRec = graph.records.find((r) => r.weight === 6);
      const nonTop = graph.records.filter((r) => r.weight < 6);
      const totals = Object.fromEntries(
        PATIENT_IDS.map((id) => [
          id,
          nonTop.reduce((s, r) => s + (graph.targetsOf(r.channelId).includes(id) ? r.weight : 0), 0),
        ])
      );
      const maxS = Math.max(...Object.values(totals));
      return {
        proof: `Setting aside ${topRec.label} (+6), ${formatNameList(targets)} lead the remaining 5 records at +${maxS}.`,
        decisiveChannels: nonTop.map((r) => r.channelId),
        rival: buildRival(targets, graph.targetsOf(topRec.channelId), (id) => `${pName(id)} looked prominent in ${topRec.label} (+6), but only totals +${totals[id]} across the other 5 records.`),
      };
    },
  },

  // 78. #74 Critical Weakest-Link Filter (discard weak +1 and +2 records, require >= 2 right-side hits among +3..+6)
  'critical-weakest-link': {
    usesWeights: true,
    usesMinutes: false,
    pickParams(rng, graph) {
      const strongRecs = graph.records.filter((r) => r.weight >= 3);
      const counts = PATIENT_IDS.map((id) => ({
        id,
        n: strongRecs.filter((r) => graph.targetsOf(r.channelId).includes(id)).length,
      }));
      if (counts.some((c) => c.n >= 2)) return { minCount: 2 };
      return { minCount: 1 };
    },
    order({ minCount }) {
      return minCount >= 2
        ? `Evidence strength filter: dismiss weak +1 and +2 notes as unverified noise. Select every patient confirmed on the RIGHT side in at least TWO strong records (+3..+6).`
        : `Evidence strength filter: dismiss weak +1 and +2 notes as unverified noise. Select right-side patients of the single strongest surviving +6 record.`;
    },
    detail({ minCount }) {
      return minCount >= 2
        ? `Ignore the +1 and +2 rows completely; count right-side appearances across +3, +4, +5, +6 and keep everyone with ≥ 2.`
        : `Ignore +1 and +2; act on the strongest +6 row's right side.`;
    },
    evaluate(graph, { minCount }) {
      const strongRecs = graph.records.filter((r) => r.weight >= 3);
      if (minCount >= 2) {
        return uniqueSorted(
          PATIENT_IDS.filter((id) => strongRecs.filter((r) => graph.targetsOf(r.channelId).includes(id)).length >= 2)
        );
      }
      const top = graph.records.find((r) => r.weight === 6);
      return top ? graph.targetsOf(top.channelId) : [];
    },
    explain(graph, { minCount }, _sc, targets) {
      const weak = graph.records.filter((r) => r.weight <= 2);
      const strong = graph.records.filter((r) => r.weight >= 3);
      return {
        proof: `After filtering out weak +1/+2 notes, ${formatNameList(targets)} hold ${minCount >= 2 ? '≥ 2 strong (+3..+6) right-side confirmations' : 'the strongest +6 confirmation'}.`,
        decisiveChannels: strong.map((r) => r.channelId),
        rival: buildRival(targets, weak.flatMap((r) => graph.targetsOf(r.channelId)), (id) => `${pName(id)} relied on discarded weak (+1/+2) evidence.`),
      };
    },
  },

  // 79. #75 Falsification Counterexample (claim: patients in chA never appear on right side in 04:00-06:00 -> find who DISPROVES it)
  'falsification-counterexample': {
    usesWeights: false,
    usesMinutes: false,
    pickParams(rng, graph) {
      const lateRight = new Set(graph.records.filter((r) => r.timeRank >= 3).flatMap((r) => graph.targetsOf(r.channelId)));
      const valid = [];
      for (const rec of graph.records) {
        if (rec.timeRank >= 3) continue;
        const breakers = graph.patientsIn(rec.channelId).filter((id) => lateRight.has(id));
        if (breakers.length >= 1 && breakers.length <= 4) valid.push({ ch: rec.channelId });
      }
      return valid.length ? valid[Math.floor(rng() * valid.length)] : { ch: graph.records[0].channelId };
    },
    order({ ch }, sc) {
      return `Disprove the claim: someone insists "nobody named in ${chLabel(sc, ch)} ever gets flagged on the right side during 04:00–06:00." Select every patient who DISPROVES that claim.`;
    },
    detail({ ch }, sc) {
      return `List everyone in ${chLabel(sc, ch)} (either side), then pick whoever ALSO appears on the right side in 04:00, 05:00, or 06:00.`;
    },
    evaluate(graph, { ch }) {
      const lateRight = new Set(graph.records.filter((r) => r.timeRank >= 3).flatMap((r) => graph.targetsOf(r.channelId)));
      return graph.patientsIn(ch).filter((id) => lateRight.has(id));
    },
    explain(graph, { ch }, sc, targets) {
      const stayedClear = graph.patientsIn(ch).filter((id) => !targets.includes(id));
      return {
        proof: `${formatNameList(targets)} appear in ${chLabel(sc, ch)} AND get flagged on the right side during 04:00–06:00, disproving the claim.`,
        decisiveChannels: [ch, ...graph.records.filter((r) => r.timeRank >= 3).map((r) => r.channelId)],
        rival: buildRival(targets, stayedClear, (id) => `${pName(id)} appeared in ${chLabel(sc, ch)} and stayed clear of 04:00–06:00 right-side flags.`),
      };
    },
  },

  // 80. #78 Ontological Category Partition (Dual-Role patients appearing left AND right AND carrying Weight >= 4)
  'ontological-category-partition': {
    usesWeights: true,
    usesMinutes: false,
    pickParams(rng, graph) {
      for (const minW of [4, 3, 2]) {
        const hits = PATIENT_IDS.filter((id) => {
          const ins = graph.inEdges(id);
          const outs = graph.outEdges(id);
          if (!ins.length || !outs.length) return false;
          return [...ins, ...outs].some((e) => graph.byChannel[e.channelId].record.weight >= minW);
        });
        if (hits.length >= 1 && hits.length <= 4) return { minW };
      }
      return { minW: 1 };
    },
    order({ minW }) {
      return `Category classification: separate patients into Drivers (left-only), Recipients (right-only), and Relays (BOTH left and right). Select every RELAY who appears in at least one Weight ≥ +${minW} record.`;
    },
    detail({ minW }) {
      return `A patient must belong to the Relay category (≥ 1 left AND ≥ 1 right entry) AND touch at least one row weighted +${minW}..+6.`;
    },
    evaluate(graph, { minW }) {
      return uniqueSorted(
        PATIENT_IDS.filter((id) => {
          const ins = graph.inEdges(id);
          const outs = graph.outEdges(id);
          if (!ins.length || !outs.length) return false;
          return [...ins, ...outs].some((e) => graph.byChannel[e.channelId].record.weight >= minW);
        })
      );
    },
    explain(graph, { minW }, _sc, targets) {
      const singleSide = PATIENT_IDS.filter((id) => {
        const ins = graph.inEdges(id).length;
        const outs = graph.outEdges(id).length;
        return (ins === 0) !== (outs === 0);
      });
      return {
        proof: `${formatNameList(targets)} belong to the dual-sided Relay category with at least one Weight ≥ +${minW} record.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, singleSide, (id) => `${pName(id)} belongs to a single-sided category (Driver-only or Recipient-only), not a Relay.`),
      };
    },
  },

  // 81. #79 Analogical Meta-Schema (extract Upper-Row vs Lower-Row dominance from 01:00-03:00, apply to 04:00-06:00 right side)
  'analogical-meta-schema': {
    usesWeights: false,
    usesMinutes: false,
    pickParams() {
      return {};
    },
    order() {
      return `Floor-pattern transfer: count right-side patients in 01:00–03:00 on the UPPER Row (Bays 1–5) vs LOWER Row (Bays 6–10). Apply the winning row (tie = Upper) to 04:00–06:00 and select right-side patients in that SAME row.`;
    },
    detail() {
      return `See whether Bays 1–5 or Bays 6–10 dominate right-side flags in 01:00–03:00, then select 04:00–06:00 right-side patients sitting in that winning row.`;
    },
    evaluate(graph) {
      const earlyTargets = graph.records.filter((r) => r.timeRank <= 2).flatMap((r) => graph.targetsOf(r.channelId));
      const upperN = earlyTargets.filter((id) => pBayNum(id) <= 5).length;
      const lowerN = earlyTargets.length - upperN;
      const useUpper = upperN >= lowerN;
      const lateTargets = uniqueSorted(
        graph.records.filter((r) => r.timeRank >= 3).flatMap((r) => graph.targetsOf(r.channelId))
      );
      return lateTargets.filter((id) => (useUpper ? pBayNum(id) <= 5 : pBayNum(id) >= 6));
    },
    explain(graph, _params, _sc, targets) {
      const earlyTargets = graph.records.filter((r) => r.timeRank <= 2).flatMap((r) => graph.targetsOf(r.channelId));
      const upperN = earlyTargets.filter((id) => pBayNum(id) <= 5).length;
      const lowerN = earlyTargets.length - upperN;
      const useUpper = upperN >= lowerN;
      const lateOther = uniqueSorted(
        graph.records.filter((r) => r.timeRank >= 3).flatMap((r) => graph.targetsOf(r.channelId))
      ).filter((id) => !targets.includes(id));
      return {
        proof: `Early records (01:00–03:00) favor ${useUpper ? `Upper Row (${upperN} vs ${lowerN})` : `Lower Row (${lowerN} vs ${upperN})`}; applying that floor pattern to 04:00–06:00 selects ${formatNameList(targets)}.`,
        decisiveChannels: CHANNEL_IDS.slice(),
        rival: buildRival(targets, lateOther, (id) => `${pName(id)} (Bay ${pBayNum(id)}) sits on the opposite floor row during 04:00–06:00.`),
      };
    },
  },
};
