// Grounded intelligence-dossier layout and uncertainty primitives.
// All six categories carry distinct operational meanings — never permanently collapsed into binary Safe/Threat.
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
  spy: 'watches',
  double: 'leaks to',
  civilian: 'reports to',
  foreigner: 'handles'
};

export function shuffled(items, draw) {
  const order = items.slice();
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(draw() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function seededDraw(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function flip(link) {
  return {from: link.to, to: link.from};
}

export function alternateLinks(row) {
  if (row.alias) {
    const [a, b] = row.alias;
    const rename = name => name === a ? b : name === b ? a : name;
    return row.links.map(link => ({from: rename(link.from), to: rename(link.to)}));
  }
  if (row.alt) {
    const {index, link} = row.alt;
    return row.links.map((item, i) => i === index ? {...link} : {...item});
  }
  return row.links.map(flip);
}

// Legacy single-link helper kept for compatibility where needed.
export function alternate(link, alias) {
  if (!alias) return flip(link);
  const [a, b] = alias;
  const rename = name => name === a ? b : name === b ? a : name;
  return {from: rename(link.from), to: rename(link.to)};
}

export function edgesFor(rows, mask) {
  return rows.flatMap((row, i) => {
    const links = (mask & (1 << i)) ? alternateLinks(row) : row.links;
    return links.map(link => ({role: row.role, from: link.from, to: link.to}));
  });
}

// Generate a 6-row, 12-edge intelligence network covering all 10 suspects,
// with varied per-row uncertainty types: direction reversal (?), name swap, or alternate contact.
export function layoutFor(seed) {
  const draw = seededDraw((seed ^ Math.imul(seed, 2654435761)) >>> 0);
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
  const totalCounts = new Map(symbols.map(s => [s, 0]));
  for (const row of rows) {
    for (const link of row.links) {
      totalCounts.set(link.from, totalCounts.get(link.from) + 1);
      totalCounts.set(link.to, totalCounts.get(link.to) + 1);
    }
  }
  for (const row of rows) {
    const modeRoll = draw();
    if (modeRoll < 0.36) {
      // Name-swap identity confusion (preserves all 10 names when swapped name appears elsewhere or only if present >= 2)
      const present = [...new Set(row.links.flatMap(link => [link.from, link.to]))];
      // Prefer swapping a name that appears elsewhere too, so neither reading drops a name from the 10-person dossier
      const safePresent = present.filter(s => {
        const rowOcc = row.links.reduce((n, l) => n + (l.from === s ? 1 : 0) + (l.to === s ? 1 : 0), 0);
        return totalCounts.get(s) > rowOcc;
      });
      const pool = safePresent.length ? safePresent : present;
      const a = pool[Math.floor(draw() * pool.length)];
      const choices = symbols.filter(b => b !== a && !present.includes(b));
      if (choices.length && safePresent.length) {
        row.alias = [a, choices[Math.floor(draw() * choices.length)]];
      }
    } else if (modeRoll < 0.68) {
      // Alternate-contact scope substitution (only replaces an endpoint appearing >= 2 times so all 10 names stay covered)
      const slotOptions = [];
      for (const index of [0, 1]) {
        const orig = row.links[index];
        if (totalCounts.get(orig.to) >= 2) slotOptions.push({index, changeTo: true});
        if (totalCounts.get(orig.from) >= 2) slotOptions.push({index, changeTo: false});
      }
      if (slotOptions.length) {
        const {index, changeTo} = slotOptions[Math.floor(draw() * slotOptions.length)];
        const other = row.links[1 - index];
        const orig = row.links[index];
        const forbidden = new Set([orig.from, orig.to]);
        const candidates = symbols.filter(s => {
          if (forbidden.has(s)) return false;
          const cand = changeTo ? {from: orig.from, to: s} : {from: s, to: orig.to};
          if (cand.from === other.from && cand.to === other.to) return false;
          if (cand.from === other.to && cand.to === other.from) return false;
          return true;
        });
        if (candidates.length) {
          const picked = candidates[Math.floor(draw() * candidates.length)];
          const altLink = changeTo ? {from: orig.from, to: picked} : {from: picked, to: orig.to};
          row.alt = {index, link: altLink};
        }
      }
    }
    // Otherwise: direction reversal (? beside role)
  }
  return rows;
}
