import {caseRoles, roleNames, roleVerbs} from './case-layout.js';

export const DOMAINS = [
  'Cover & Betrayal',
  'Surveillance & Blind Spots',
  'Foreign Infiltration',
  'Civilian Exposure',
  'Proxy & Cut-Outs',
  'Alibi & Contradiction',
  'Perspective & Scope',
  'Tainted Testimony',
  'Double Lives',
  'Network Leverage'
];

export function fmtEdge(edge) {
  return roleNames[edge.role] + ': ' + edge.from + ' ' + roleVerbs[edge.role] + ' ' + edge.to;
}

export function buildGraph(edges) {
  const clean = [];
  const byOut = new Map();
  const byIn = new Map();
  const byAll = new Map();
  const peopleSet = new Set();

  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    clean.push(edge);
    peopleSet.add(edge.from);
    peopleSet.add(edge.to);
    if (!byOut.has(edge.from)) byOut.set(edge.from, []);
    if (!byIn.has(edge.to)) byIn.set(edge.to, []);
    if (!byAll.has(edge.from)) byAll.set(edge.from, []);
    if (!byAll.has(edge.to)) byAll.set(edge.to, []);
    byOut.get(edge.from).push(edge);
    byIn.get(edge.to).push(edge);
    byAll.get(edge.from).push(edge);
    byAll.get(edge.to).push(edge);
  }

  const people = [...peopleSet].sort();
  const matchRole = (edge, roles) => !roles || (typeof roles === 'string' ? edge.role === roles : roles.includes(edge.role));

  const out = (name, roles) => {
    const list = byOut.get(name) || [];
    return roles ? list.filter(e => matchRole(e, roles)) : list;
  };
  const inc = (name, roles) => {
    const list = byIn.get(name) || [];
    return roles ? list.filter(e => matchRole(e, roles)) : list;
  };
  const touch = (name, roles) => {
    const list = byAll.get(name) || [];
    return roles ? list.filter(e => matchRole(e, roles)) : list;
  };
  const hasOut = (name, roles) => out(name, roles).length > 0;
  const hasIn = (name, roles) => inc(name, roles).length > 0;
  const hasTouch = (name, roles) => touch(name, roles).length > 0;

  const direct = (a, b, roles) => out(a, roles).filter(e => e.to === b);
  const between = (a, b, roles) => touch(a, roles).filter(e => (e.from === a && e.to === b) || (e.from === b && e.to === a));
  const neighbors = (name, roles) => {
    const set = new Set();
    for (const e of touch(name, roles)) set.add(e.from === name ? e.to : e.from);
    return [...set];
  };
  const distinctRoles = (name, mode = 'all') => {
    const list = mode === 'out' ? out(name) : mode === 'in' ? inc(name) : touch(name);
    return new Set(list.map(e => e.role));
  };

  return {
    edges: clean,
    people,
    roles: caseRoles,
    out,
    in: inc,
    touch,
    hasOut,
    hasIn,
    hasTouch,
    direct,
    between,
    neighbors,
    distinctRoles,
    fmt: fmtEdge
  };
}

// Helper for ranking families: returns exact top-scoring suspects with proofs.
export function pickHighest(people, scoreFn, includeProof, minScore = -Infinity) {
  let best = minScore;
  const winners = [];
  for (const name of people) {
    const res = scoreFn(name);
    if (!res || res.score < best) continue;
    if (res.score > best) {
      best = res.score;
      winners.length = 0;
    }
    winners.push({name, reason: includeProof ? res.reason : ''});
  }
  const pair = winners.map(w => w.name).sort();
  return {
    pair,
    proof: includeProof ? [...new Set(winners.map(w => w.reason).filter(Boolean))] : []
  };
}

// Helper for "Shoot the top two" ranking families: returns the unambiguous #1 and #2 suspects
// whenever the 2nd-highest score is strictly greater than the 3rd-highest score (so there is
// no tie at the cutoff, whether #1 > #2 > #3 or #1 == #2 > #3).
export function pickTopTwo(people, scoreFn, includeProof, minScore = -Infinity) {
  const scored = [];
  for (const name of people) {
    const res = scoreFn(name);
    if (!res || res.score < minScore) continue;
    scored.push({name, score: res.score, reason: includeProof ? res.reason : ''});
  }
  if (scored.length < 2) return {pair: [], proof: []};
  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  if (scored.length >= 3 && scored[1].score === scored[2].score) {
    return {pair: [], proof: []};
  }
  const top = [scored[0], scored[1]];
  const pair = top.map(w => w.name).sort();
  const proof = includeProof
    ? [
        ...top.map(w => w.reason).filter(Boolean),
        ...(scored.length >= 3 ? ['Next highest is ' + scored[2].name + ' (' + scored[2].score + ').'] : [])
      ]
    : [];
  return {pair, proof};
}

export function collectMatches(people, matchFn, includeProof) {
  const answers = new Map();
  for (const name of people) {
    const reason = matchFn(name);
    if (reason) answers.set(name, includeProof ? reason : '');
  }
  const pair = [...answers.keys()].sort();
  return {
    pair,
    proof: includeProof ? [...new Set(pair.map(n => answers.get(n)).filter(Boolean))] : []
  };
}

export function collectPairs(pairList, includeProof) {
  const answers = new Map();
  for (const {a, b, reason} of pairList) {
    if (!answers.has(a)) answers.set(a, includeProof ? reason : '');
    if (!answers.has(b)) answers.set(b, includeProof ? reason : '');
  }
  const pair = [...answers.keys()].sort();
  return {
    pair,
    proof: includeProof ? [...new Set(pair.map(n => answers.get(n)).filter(Boolean))] : []
  };
}
