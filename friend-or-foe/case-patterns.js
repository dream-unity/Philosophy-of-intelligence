// A role belongs to a particular encounter. One name may occupy different
// roles in different encounters. Each arrow goes from a sender to a contact.
export const patterns = [
  {id: 'return-link', title: 'Return message', order: 'Find the pair who sent to each other under different roles.'},
  {id: 'shortcut', title: 'Parallel routes', order: 'Find a direct link with a second route through one person. The routes start under different roles. Find both ends.'},
  {id: 'shared-source', title: 'Common source', order: 'Who else heard from the same sender as {name}, under a different role?'},
  {id: 'shared-contact', title: 'Indirect contact', order: 'Who reached {name} through one other person, switching roles, but never sent to {name} directly?'},
  {id: 'relay', title: 'Relay', order: 'Follow two arrows under the same role. Find the final receivers. Skip returns to the start.'},
  {id: 'split-cover', title: 'One-sided contact', order: 'Who only sent in Spy/Double agent and only received in the other roles, or the reverse?'},
  {id: 'corroboration', title: 'Independent sources', order: 'Who received from two different senders under the same role?'},
  {id: 'silent-contact', title: 'Silent contacts', order: 'Who heard from two different senders under different roles and never sent anything?'},
  {id: 'boundary', title: 'Across divisions', order: 'Who sent in two groups and received in the third? Count Friend/Foe, Spy/Double agent and Civilian/Foreigner as three groups.'},
  {id: 'bypass', title: 'Widest reach', order: 'Follow two arrows with different roles. Who can reach the most other names? Skip returns to the start.'}
];

const roleNames = {friend:'Friend', foe:'Foe', spy:'Spy', double:'Double agent', civilian:'Civilian', foreigner:'Foreigner'};
const groups = {friend:0, foe:0, spy:1, double:1, civilian:2, foreigner:2};
const firstChecks = {
  'return-link': 'Follow one arrow. Can you get back in a different row?',
  shortcut: 'Try a direct arrow. Look for a second way between its ends.',
  'shared-source': 'Find {name} on the right. Look for the same sender in another row.',
  'shared-contact': 'Work backward from {name}. Who contacted each sender?',
  relay: 'Look within one row. Can one arrow start where the other ends?',
  'split-cover': 'Pick a name. Compare its arrow directions inside and outside the named group.',
  corroboration: 'Check the right ends of the two arrows in a row.',
  'silent-contact': 'First rule out anyone on the left of an arrow.',
  boundary: 'Pick a name. Which two groups did that person send in?',
  bypass: 'Try one sender. Count each name at the end of two steps once.'
};

const mirrors = {
  shortcut: ['Parallel routes', 'Find a direct link with a second route through one person. The routes finish under different roles. Find both ends.', firstChecks.shortcut],
  'shared-source': ['Common recipient', 'Who else sent to the same contact as {name}, under a different role?', 'Find {name} on the left. Look for the same recipient in another row.'],
  'shared-contact': ['Indirect recipient', 'Whom did {name} reach through one other person, switching roles, without contacting them directly?', 'Start at {name}. Who heard from each of their contacts?'],
  relay: ['Relay origin', 'Follow two arrows under the same role. Find the original senders. Skip returns to the start.', firstChecks.relay],
  corroboration: ['Independent recipients', 'Who sent to two different contacts under the same role?', 'Check the left ends of the two arrows in a row.'],
  'silent-contact': ['Silent sources', 'Who sent to two different contacts under different roles and never received anything?', 'First rule out anyone on the right of an arrow.'],
  boundary: ['Across divisions', 'Who received in two groups and sent in the third? Count Friend/Foe, Spy/Double agent and Civilian/Foreigner as three groups.', 'Pick a name. Which two groups did that person hear from?'],
  bypass: ['Broadest sources', 'Follow two arrows with different roles. Who heard from the most original senders? Skip returns to the start.', 'Try one receiver. Trace two steps back and count each source once.']
};

const groupRoles = {
  friend: ['friend', 'foe'], spy: ['spy', 'double'], civilian: ['civilian', 'foreigner']
};
const groupLabels = {friend: 'Friend/Foe', spy: 'Spy/Double agent', civilian: 'Civilian/Foreigner'};

export function variantsFor(family) {
  if (family === 'split-cover') return Object.keys(groupRoles).map(focus => ({reverse: false, focus}));
  const directions = mirrors[family] ? [false, true] : [false];
  return directions.map(reverse => ({reverse, focus: 'spy'}));
}

export function chooseVariant(family, draw) {
  const choices = variantsFor(family);
  return choices[Math.floor(draw() * choices.length)];
}

export function patternBrief(family, variant) {
  if (variant?.reverse && mirrors[family]) {
    const [title, order, hint] = mirrors[family];
    return {title, order, hint};
  }
  const {title, order} = patterns.find(pattern => pattern.id === family);
  const focus = groupLabels[variant?.focus] || groupLabels.spy;
  return {title, order: family === 'split-cover' ? order.replace(groupLabels.spy, focus) : order, hint: firstChecks[family]};
}

// Swapping two whole divisions, and reversing all arrows, each undo themselves.
// The same conversion both renders a canonical layout and reads a displayed one.
export function displayRole(role, variant) {
  const focus = variant?.focus;
  if (!focus || focus === 'spy' || !groupRoles[focus]) return role;
  const focalIndex = groupRoles[focus].indexOf(role);
  if (focalIndex >= 0) return groupRoles.spy[focalIndex];
  const covertIndex = groupRoles.spy.indexOf(role);
  return covertIndex >= 0 ? groupRoles[focus][covertIndex] : role;
}

export function displayEdge(edge, variant) {
  const role = displayRole(edge.role, variant);
  return variant?.reverse ? {from: edge.to, to: edge.from, role} : {...edge, role};
}

export function evaluatePattern(id, visibleEdges, anchor, includeProof = true, variant) {
  const transformed = variant?.reverse || (variant?.focus && variant.focus !== 'spy');
  const edges = transformed ? visibleEdges.map(edge => displayEdge(edge, variant)) : visibleEdges;
  const arrow = edge => {
    const real = transformed ? displayEdge(edge, variant) : edge;
    return roleNames[real.role] + ' ' + real.from + ' → ' + real.to;
  };
  const trail = (first, second) => variant?.reverse
    ? arrow(second) + ' · ' + arrow(first)
    : arrow(first) + ' · ' + arrow(second);
  const people = new Map();
  function person(name) {
    if (!people.has(name)) people.set(name, {incoming: [], outgoing: []});
    return people.get(name);
  }
  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    person(edge.from).outgoing.push(edge);
    person(edge.to).incoming.push(edge);
  }
  const answers = new Map();
  function mark(name, reason) {
    if (!answers.has(name)) answers.set(name, includeProof ? reason() : '');
  }
  let bestReach = 0;
  for (const [name, {incoming, outgoing}] of people) {
    switch (id) {
      case 'return-link':
        for (const a of outgoing) {
          const b = incoming.find(b => a.to === b.from && a.role !== b.role);
          if (b) {
            const exchange = () => trail(a, b);
            mark(name, exchange);
            mark(a.to, exchange);
          }
        }
        break;
      case 'shortcut':
        for (const a of outgoing) {
          for (const b of people.get(a.to).outgoing) {
            if (b.to === name) continue;
            const direct = outgoing.find(d => d.to === b.to && d.role !== a.role);
            if (direct) {
              const proof = () => arrow(direct) + ', also ' + trail(a, b);
              mark(name, proof);
              mark(b.to, proof);
            }
          }
        }
        break;
      case 'shared-source':
        if (name === anchor) break;
        for (const a of incoming) {
          const b = people.get(a.from).outgoing.find(e => e.to === anchor && e.role !== a.role);
          if (b) mark(name, () => trail(b, a));
        }
        break;
      case 'shared-contact':
        if (name === anchor || outgoing.some(e => e.to === anchor)) break;
        for (const a of outgoing) {
          const b = people.get(a.to).outgoing.find(e => e.to === anchor && e.role !== a.role);
          if (b) mark(name, () => trail(a, b) + (variant?.reverse ? '. No direct link from ' + anchor + '.' : '. No direct link to ' + anchor + '.'));
        }
        break;
      case 'relay':
        for (const a of incoming) {
          for (const b of outgoing) {
            if (b.role === a.role && b.to !== a.from) mark(b.to, () => trail(a, b));
          }
        }
        break;
      case 'split-cover': {
        const sentInside = outgoing.find(e => groups[e.role] === 1);
        const heardInside = incoming.find(e => groups[e.role] === 1);
        const sentOutside = outgoing.find(e => groups[e.role] !== 1);
        const heardOutside = incoming.find(e => groups[e.role] !== 1);
        const focus = groupLabels[variant?.focus] || groupLabels.spy;
        if (sentInside && heardOutside && !heardInside && !sentOutside) {
          mark(name, () => trail(sentInside, heardOutside) + '. All outgoing links are inside ' + focus + '. All incoming links are outside.');
        } else if (heardInside && sentOutside && !sentInside && !heardOutside) {
          mark(name, () => trail(heardInside, sentOutside) + '. All incoming links are inside ' + focus + '. All outgoing links are outside.');
        }
        break;
      }
      case 'corroboration':
      case 'silent-contact':
        if (id === 'silent-contact' && outgoing.length) break;
        for (const a of incoming) {
          const b = incoming.find(e => e.from !== a.from && (id === 'silent-contact' ? e.role !== a.role : e.role === a.role));
          if (b) mark(name, () => trail(a, b) + (id === 'silent-contact' ? (variant?.reverse ? '. No incoming link.' : '. No outgoing link.') : ''));
        }
        break;
      case 'boundary':
        for (const receiver of incoming) {
          const first = outgoing.find(e => groups[e.role] !== groups[receiver.role]);
          if (!first) continue;
          const second = outgoing.find(e => groups[e.role] !== groups[receiver.role] && groups[e.role] !== groups[first.role]);
          if (second) mark(name, () => trail(first, second) + ' · ' + arrow(receiver));
        }
        break;
      case 'bypass': {
        const ends = new Map();
        for (const a of outgoing) {
          for (const b of people.get(a.to).outgoing) {
            if (b.to !== name && b.role !== a.role) ends.set(b.to, a.to);
          }
        }
        if (!ends.size || ends.size < bestReach) break;
        if (ends.size > bestReach) {
          answers.clear();
          bestReach = ends.size;
        }
        mark(name, () => name + (variant?.reverse ? ' heard from ' : ' reaches ') + ends.size + ' (' +
          [...ends].map(([end, middle]) => end + ' via ' + middle).join(', ') + ').');
        break;
      }
      default:
        throw new RangeError('Unknown case pattern ' + id);
    }
  }
  const pair = [...answers.keys()].sort();
  return {pair, proof: includeProof ? [...new Set(pair.map(name => answers.get(name)))] : []};
}
