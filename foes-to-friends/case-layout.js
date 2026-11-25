// Catalog entries are seeds and deduction topologies, never winning names.
export const caseRoles = ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'];
export const symbols = [...'ABCDEFGHIJ'];

export const roleNames = {
  friend: 'Friend',
  foe: 'Foe',
  spy: 'Spy',
  double: 'Double agent',
  civilian: 'Civilian',
  foreigner: 'Foreigner'
};

export const roleVerbs = {
  friend: 'backs',
  foe: 'opposes',
  spy: 'observes',
  double: 'leaks to',
  civilian: 'reports to',
  foreigner: 'visits'
};

// Semantic axes shared across all six categories:
// Polarity: Safe (+1) = Friend, Spy, Civilian; Threat (-1) = Foe, Double agent, Foreigner.
// Division: 0 = Overt (Friend/Foe), 1 = Covert (Spy/Double agent), 2 = Border (Civilian/Foreigner).
export const rolePolarity = {
  friend: 1,
  foe: -1,
  spy: 1,
  double: -1,
  civilian: 1,
  foreigner: -1
};

export const roleDivision = {
  friend: 0,
  foe: 0,
  spy: 1,
  double: 1,
  civilian: 2,
  foreigner: 2
};

export const oppositePolarityRole = {
  friend: 'foe',
  foe: 'friend',
  spy: 'double',
  double: 'spy',
  civilian: 'foreigner',
  foreigner: 'civilian'
};

export function isThreat(role) {
  return rolePolarity[role] === -1;
}

export function isSafe(role) {
  return rolePolarity[role] === 1;
}

export function shuffled(items, draw) {
  const order = items.slice();
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(draw() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function seededDraw(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function layoutFor(seed) {
  const draw = seededDraw((seed ^ Math.imul(seed, 2654435761)) >>> 0);
  // Cover all ten names; distribute the remaining endpoints independently.
  // Repeated contacts across different roles are deliberate.
  const endpoints = [...symbols];
  while (endpoints.length < 24) endpoints.push(symbols[Math.floor(draw() * symbols.length)]);
  const slots = shuffled(endpoints, draw);
  const rows = caseRoles.map((role, i) => {
    const links = [0, 2].map(offset => ({from: slots[4 * i + offset], to: slots[4 * i + offset + 1]}));
    return {role, links};
  });
  for (const {links: [a, b]} of rows) {
    if (a.from === a.to || b.from === b.to ||
        (a.from === b.from && a.to === b.to) || (a.from === b.to && a.to === b.from)) return null;
  }
  for (const row of rows) {
    if (draw() < .55) {
      const present = row.links.flatMap(link => [link.from, link.to]);
      const a = present[Math.floor(draw() * present.length)];
      const choices = symbols.filter(b => b !== a && !present.includes(b));
      row.alias = [a, choices[Math.floor(draw() * choices.length)]];
    }
  }
  return rows;
}

export function flip(link) {
  return {from: link.to, to: link.from};
}

export function alternate(link, alias) {
  if (!alias) return flip(link);
  const [a, b] = alias;
  const rename = name => name === a ? b : name === b ? a : name;
  return {from: rename(link.from), to: rename(link.to)};
}

export function edgesFor(rows, mask) {
  return rows.flatMap(({role, links, alias}, i) =>
    links.map(link => ({role, ...(mask & (1 << i) ? alternate(link, alias) : link)})));
}
