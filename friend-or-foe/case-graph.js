import {caseRoles, formatDispatchTime, roleNames, roleVerbs} from './case-layout.js';

export const DOMAINS = [
  'Cover & Betrayal',
  'Surveillance & Blind Spots',
  'Foreign Contact',
  'Civilian Tip-Offs',
  'Proxy Chains',
  'Alibi & Contradiction',
  'Chronology & Timing',
  'Tainted Sources',
  'Double Lives',
  'Command & Leverage'
];

export function fmtEdge(edge) {
  const stamp = edge.time ? ' [' + formatDispatchTime(edge.time) + ']' : '';
  return roleNames[edge.role] + stamp + ': ' + edge.from + ' ' + roleVerbs[edge.role] + ' ' + edge.to;
}

export function buildGraph(edges) {
  const clean = [];
  const byOut = new Map();
  const byIn = new Map();
  const byAll = new Map();
  const roleTime = new Map();
  const peopleSet = new Set();

  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    clean.push(edge);
    if (edge.time && !roleTime.has(edge.role)) roleTime.set(edge.role, edge.time);
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
  const timeOf = role => roleTime.get(role) ?? 0;

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
    timeOf,
    fmt: fmtEdge
  };
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
    targets: pair,
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
    targets: pair,
    proof: includeProof ? [...new Set(pair.map(n => answers.get(n)).filter(Boolean))] : []
  };
}
