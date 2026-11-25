// Catalog entries are seeds and clue dependencies, never winning names.
export const caseRoles = ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'];
export const symbols = [...'ABCDEFGHIJ'];

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
    const links = [0, 2].map(offset => ({from: slots[4*i + offset], to: slots[4*i + offset + 1]}));
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
