// Directed clinical graph built from any 6-bit world assignment over the 6 clinical records.
// Supplies clean, reusable relational predicates for all 12 reasoning patterns.

import { PATIENT_IDS } from './roster.js';

/**
 * Evaluate a clinical chart under a 6-bit world mask (bit i === 1 => shownEdges, bit i === 0 => altEdges).
 * Non-disputed records always contribute their shownEdges (which equal their trueEdges).
 */
export function buildClinicalGraph(records, worldMask = 0b111111) {
  const byChannel = {};
  const allEdges = [];

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const useShown = !rec.disputed || ((worldMask >> i) & 1) === 1;
    const rawEdges = useShown ? rec.shownEdges : rec.altEdges;
    const enriched = rawEdges.map((e, edgeIdx) => ({
      from: e.from,
      to: e.to,
      channelId: rec.channelId,
      recordIndex: i,
      edgeIdx,
      time: rec.time,
      timeRank: rec.timeRank,
      siteIdx: rec.siteIdx,
      site: rec.site,
      label: rec.label,
      verb: rec.verb,
    }));
    byChannel[rec.channelId] = {
      record: rec,
      useShown,
      edges: enriched,
    };
    allEdges.push(...enriched);
  }

  const outMap = new Map();
  const inMap = new Map();
  for (const id of PATIENT_IDS) {
    outMap.set(id, []);
    inMap.set(id, []);
  }
  for (const e of allEdges) {
    outMap.get(e.from)?.push(e);
    inMap.get(e.to)?.push(e);
  }

  return {
    records,
    worldMask,
    byChannel,
    allEdges,

    edgesOf(channelId) {
      return byChannel[channelId]?.edges || [];
    },

    timeRankOf(channelId) {
      return byChannel[channelId]?.record.timeRank ?? 0;
    },

    siteIdxOf(channelId) {
      return byChannel[channelId]?.record.siteIdx ?? 0;
    },

    siteOf(channelId) {
      return byChannel[channelId]?.record.site ?? '';
    },

    outEdges(patientId, channelFilter = null) {
      const list = outMap.get(patientId) || [];
      if (!channelFilter) return list;
      const set = Array.isArray(channelFilter) ? new Set(channelFilter) : null;
      return list.filter((e) => (set ? set.has(e.channelId) : e.channelId === channelFilter));
    },

    inEdges(patientId, channelFilter = null) {
      const list = inMap.get(patientId) || [];
      if (!channelFilter) return list;
      const set = Array.isArray(channelFilter) ? new Set(channelFilter) : null;
      return list.filter((e) => (set ? set.has(e.channelId) : e.channelId === channelFilter));
    },

    hasEdge(from, to, channelFilter = null) {
      return this.outEdges(from, channelFilter).some((e) => e.to === to);
    },

    // All patients appearing as source (from) in a given channel
    sourcesOf(channelId) {
      return uniqueSorted(this.edgesOf(channelId).map((e) => e.from));
    },

    // All patients appearing as target (to) in a given channel
    targetsOf(channelId) {
      return uniqueSorted(this.edgesOf(channelId).map((e) => e.to));
    },

    // All patients mentioned on either side of a channel
    patientsIn(channelId) {
      const out = [];
      for (const e of this.edgesOf(channelId)) {
        out.push(e.from, e.to);
      }
      return uniqueSorted(out);
    },

    // 2-hop directed causal chain: X --(chA)--> M --(chB)--> Y (with optional time constraint & site filter)
    twoHopRelays({ fromChannel, toChannel, requireAfter = false, sameSite = null, distinctEnds = true }) {
      const eA = this.edgesOf(fromChannel);
      const eB = this.edgesOf(toChannel);
      const matches = [];
      for (const a of eA) {
        for (const b of eB) {
          if (a.to !== b.from) continue;
          if (distinctEnds && a.from === b.to) continue;
          if (requireAfter && !(b.timeRank > a.timeRank)) continue;
          if (sameSite === true && a.siteIdx !== b.siteIdx) continue;
          if (sameSite === false && a.siteIdx === b.siteIdx) continue;
          matches.push({ first: a, second: b, start: a.from, mid: a.to, end: b.to });
        }
      }
      return matches;
    },

    // Independent corroboration: patient P is pointed to (or starts) in >= 2 distinct channels
    // optionally filtered by site or time.
    corroboratedPatients({ channels = null, role = 'to', sameSiteOnly = false, minCount = 2 }) {
      const chanSet = channels ? new Set(channels) : null;
      const hits = [];
      for (const id of PATIENT_IDS) {
        const list = (role === 'to' ? this.inEdges(id) : this.outEdges(id)).filter(
          (e) => !chanSet || chanSet.has(e.channelId)
        );
        const byChan = new Map();
        for (const e of list) {
          if (!byChan.has(e.channelId)) byChan.set(e.channelId, e);
        }
        const edges = Array.from(byChan.values());
        if (edges.length < minCount) continue;
        if (sameSiteOnly) {
          const site0 = edges.filter((e) => e.siteIdx === 0);
          const site1 = edges.filter((e) => e.siteIdx === 1);
          if (site0.length >= minCount || site1.length >= minCount) {
            hits.push({ id, edges: site0.length >= minCount ? site0 : site1 });
          }
        } else {
          hits.push({ id, edges });
        }
      }
      return hits;
    },
  };
}

export function uniqueSorted(ids) {
  return Array.from(new Set(ids)).sort();
}
