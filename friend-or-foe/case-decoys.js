import {evaluateFamily, getFamily} from './case-families.js?v=fof20';
import {caseRoles} from './case-layout.js?v=fof20';

// Select genuine near-miss decoys for variable-size target sets (1–4 targets) on Super Easy & Very Easy.
// Balances mention frequency so shortlist decoys leak zero structural frequency clues.
export function nearMisses(id, edges, anchor, correct, singleRowAlternatives = [], evaluator = evaluateFamily) {
  const family = getFamily(id);
  const excluded = new Set(correct);
  if (family.useAnchor && anchor) excluded.add(anchor);
  const people = [...new Set(edges.flatMap(edge => [edge.from, edge.to]))];
  const names = people.filter(name => !excluded.has(name));
  const scores = new Map(names.map(name => [name, {tier: 0, hits: 0, sameSizeHits: 0}]));
  const trial = edges.slice();
  const targetLen = correct.length;

  function evaluate(tier, reading = trial) {
    const {pair} = evaluator(id, reading, anchor, false);
    for (const name of pair) {
      const score = scores.get(name);
      if (!score || tier < score.tier) continue;
      if (tier > score.tier) {
        score.tier = tier;
        score.hits = 0;
        score.sameSizeHits = 0;
      }
      score.hits++;
      if (pair.length === targetLen) score.sameSizeHits++;
    }
  }

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    trial[i] = {...edge, from: edge.to, to: edge.from};
    evaluate(2);
    for (const role of caseRoles) {
      if (role === edge.role) continue;
      trial[i] = {...edge, role};
      evaluate(2);
    }
    trial[i] = edge;
  }

  if ([...scores.values()].filter(score => score.tier).length < 2) {
    for (const reading of singleRowAlternatives) evaluate(1, reading);
  }

  if ([...scores.values()].filter(score => score.tier).length < 2) {
    for (const role of caseRoles) {
      const links = edges.filter(edge => edge.role === role);
      const mentioned = new Set(links.flatMap(edge => [edge.from, edge.to]));
      for (const original of mentioned) {
        for (const other of people) {
          if (mentioned.has(other)) continue;
          const reading = edges.map(edge => edge.role !== role ? edge : {
            ...edge,
            from: edge.from === original ? other : edge.from,
            to: edge.to === original ? other : edge.to
          });
          evaluate(1, reading);
        }
      }
    }
  }

  const mentions = new Map(people.map(name => [name, edges.filter(e => e.from === name || e.to === name).length]));
  const avgAnswerMentions = correct.reduce((sum, n) => sum + (mentions.get(n) || 0), 0) / Math.max(1, correct.length);
  // Pick 2 strong decoys (3 when only 1 target, so shortlist always has 4–6 believable suspects).
  const decoyCount = targetLen === 1 ? 3 : 2;

  const ranked = names.map(name => {
    const s = scores.get(name);
    return {
      name,
      tier: s.tier,
      distance: Math.abs((mentions.get(name) || 0) - avgAnswerMentions),
      sameSizeHits: s.sameSizeHits,
      hits: s.hits
    };
  });
  ranked.sort((a, b) =>
    b.tier - a.tier ||
    a.distance - b.distance ||
    b.sameSizeHits - a.sameSizeHits ||
    b.hits - a.hits
  );
  return ranked.slice(0, decoyCount).map(r => r.name);
}
