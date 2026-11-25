import {evaluateFamily, getFamily} from './case-families.js';
import {caseRoles} from './case-layout.js';

// Score wrong names by whether the current operational order would select them after a
// small reading mistake (reversing an arrow, misreading a category row, or swapping a contact),
// then balance mention frequency so shortlist decoys leak zero structural frequency clues.
export function nearMisses(id, edges, anchor, correct, singleRowAlternatives = [], evaluator = evaluateFamily) {
  const family = getFamily(id);
  const excluded = new Set(correct);
  if (family.useAnchor && anchor) excluded.add(anchor);
  const people = [...new Set(edges.flatMap(edge => [edge.from, edge.to]))];
  const names = people.filter(name => !excluded.has(name));
  const scores = new Map(names.map(name => [name, {tier: 0, hits: 0, pairHits: 0}]));
  const trial = edges.slice();

  function evaluate(tier, reading = trial) {
    const {pair} = evaluator(id, reading, anchor, false);
    for (const name of pair) {
      const score = scores.get(name);
      if (!score || tier < score.tier) continue;
      if (tier > score.tier) {
        score.tier = tier;
        score.hits = 0;
        score.pairHits = 0;
      }
      score.hits++;
      if (pair.length === 2) score.pairHits++;
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
  const frequencies = partners => partners.map(name => mentions.get(name)).sort((a, b) => a - b);
  const answerCounts = frequencies(correct);
  const options = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const pair = [names[i], names[j]];
      const [a, b] = pair.map(name => scores.get(name));
      const counts = frequencies(pair);
      options.push({
        pair,
        weakest: Math.min(a.tier, b.tier),
        combined: a.tier + b.tier,
        distance: Math.abs(counts[0] - answerCounts[0]) + Math.abs(counts[1] - answerCounts[1]),
        pairHits: a.pairHits + b.pairHits,
        hits: a.hits + b.hits
      });
    }
  }
  options.sort((a, b) => b.weakest - a.weakest || b.combined - a.combined ||
    a.distance - b.distance || b.pairHits - a.pairHits || b.hits - a.hits);
  return options[0].pair;
}
