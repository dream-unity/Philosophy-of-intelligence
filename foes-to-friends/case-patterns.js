import {oppositePolarityRole, roleDivision, roleNames, rolePolarity} from './case-layout.js';

// Ten genuinely distinct semantic relational reasoning families.
// Every family uses the real operational meaning of all six categories:
//   Safe (+): Friend, Spy, Civilian
//   Threat (-): Foe, Double agent, Foreigner
//   Divisions: Overt (Friend/Foe), Covert (Spy/Double agent), Border (Civilian/Foreigner)
export const patterns = [
  {
    id: 'signed-chain',
    title: 'Allied chain',
    order: 'From {name}, follow two roles (Threat × Threat = Allied; mixed = Hostile). Who ends strictly Allied?',
    hint: 'Trace two steps from {name}. Threat × Threat turns Allied; rule out anyone also reached by a Hostile chain.'
  },
  {
    id: 'double-cross',
    title: 'Two-faced',
    order: 'Find a direct arrow whose Safe/Threat sign contradicts a 2-step route between the same ends. Shoot both.',
    hint: 'Compare a direct arrow against a 2-step route between its ends (Threat × Threat = Safe; mixed = Threat).'
  },
  {
    id: 'burned-cover',
    title: 'Burned cover',
    order: 'Who receives Safe from someone targeted by Threat, without being targeted by Threat themselves?',
    hint: 'Find who gets an incoming Threat, follow Safe arrows leaving them, then exclude direct Threat targets.'
  },
  {
    id: 'profile-mirror',
    title: 'Exact mirror',
    order: 'Who is {name}’s exact opposite across all six rows — flipping both direction and Safe/Threat?',
    hint: 'Check {name}’s 4-part stance (sends/gets Safe, sends/gets Threat), flip both direction and sign, then match all six rows.'
  },
  {
    id: 'net-standing',
    title: 'Cleanest clearance',
    order: 'Score all six rows: in Safe (+1), in Threat (−1), out Threat (−1). Who ties for highest?',
    hint: 'Every Threat arrow (in or out) costs −1; only incoming Safe adds +1. Compare every name.'
  },
  {
    id: 'turncoat-bridge',
    title: 'Turncoat bridge',
    order: 'Who receives Safe in one division and sends Threat in another, while never sending Safe?',
    hint: 'Rule out anyone who sends Safe. Then match incoming Safe and outgoing Threat across different divisions.'
  },
  {
    id: 'counter-loop',
    title: 'Sabotaged ally',
    order: 'Find the pair where one sends Threat and the other answers on Safe links (1 or 2 steps). Shoot both.',
    hint: 'Pick a Threat arrow A → B, then look for a Safe return from B to A directly or via one Safe step.'
  },
  {
    id: 'three-front',
    title: 'Three-front threat',
    order: 'Who appears in all three divisions (row pairs) with more Threat links than Safe links?',
    hint: 'Find names active in all three row pairs (Friend/Foe, Spy/Double, Civilian/Foreigner), then tally Threat vs Safe.'
  },
  {
    id: 'signed-reach',
    title: 'Widest hostile reach',
    order: 'Follow two roles (mixed = Hostile; Threat × Threat = Allied; no returns). Who reaches the most on Hostile chains?',
    hint: 'Pick a sender and trace two steps with one Safe and one Threat arrow. Count each distinct endpoint once.'
  },
  {
    id: 'triadic-stance',
    title: 'Opposed outsider',
    order: 'Who has no direct link to {name}, yet shares a neighbor with the opposite Safe/Threat sign in another division?',
    hint: 'List {name}’s neighbors and their signs, then find outsiders linked (either way) to them with the opposite sign in another division.'
  }
];

const variantTable = {
  'signed-chain': [
    {reverse: false, invert: false},
    {
      reverse: true, invert: false,
      title: 'Allied origins',
      order: 'End at {name} via two roles (Threat × Threat = Allied; mixed = Hostile). Who starts strictly Allied?',
      hint: 'Work two steps back from {name}. Threat × Threat turns Allied; rule out anyone with a Hostile chain too.'
    }
  ],
  'double-cross': [
    {reverse: false, invert: false},
    {
      reverse: false, invert: true,
      title: 'Double-backed',
      order: 'Find a direct arrow whose Safe/Threat sign matches a 2-step route between the same ends (Threat × Threat = Safe). Shoot both.',
      hint: 'Compare a direct arrow against a 2-step route between its ends whose combined sign matches it.'
    }
  ],
  'burned-cover': [
    {reverse: false, invert: false},
    {
      reverse: true, invert: false,
      title: 'Tainted source',
      order: 'Who sends Safe to someone who sends Threat, without sending Threat themselves?',
      hint: 'Find who sends a Threat, trace incoming Safe arrows back to them, then rule out anyone who sends Threat.'
    },
    {
      reverse: false, invert: true,
      title: 'Isolated target',
      order: 'Who receives Threat from someone backed by Safe, without receiving Safe themselves?',
      hint: 'Find who receives Safe, follow Threat arrows leaving them, then exclude anyone who receives Safe.'
    },
    {
      reverse: true, invert: true,
      title: 'Hostile pressure',
      order: 'Who sends Threat to someone who sends Safe, without sending Safe themselves?',
      hint: 'Find who sends Safe, trace incoming Threat arrows back to them, then rule out anyone who sends Safe.'
    }
  ],
  'profile-mirror': [
    {reverse: false, invert: false},
    {
      reverse: false, invert: true,
      title: 'Exact mirror',
      order: 'Who is {name}’s exact opposite across all six rows — flipping both direction and Safe/Threat?',
      hint: 'Check {name}’s 4-part stance (sends/gets Safe, sends/gets Threat), flip both direction and sign, then match all six rows.'
    }
  ],
  'net-standing': [
    {reverse: false, invert: false},
    {
      reverse: false, invert: true,
      title: 'Highest risk',
      order: 'Score all six rows: in Threat (+1), in Safe (−1), out Safe (−1). Who ties for highest?',
      hint: 'Every Safe arrow (in or out) subtracts 1; only incoming Threat adds +1. Compare every name.'
    },
    {
      reverse: true, invert: false,
      title: 'Most loyal',
      order: 'Score all six rows: out Safe (+1), out Threat (−1), in Threat (−1). Who ties for highest?',
      hint: 'Every Threat arrow (in or out) costs −1; only outgoing Safe adds +1. Compare every name.'
    },
    {
      reverse: true, invert: true,
      title: 'Most aggressive',
      order: 'Score all six rows: out Threat (+1), out Safe (−1), in Safe (−1). Who ties for highest?',
      hint: 'Every Safe arrow (in or out) subtracts 1; only outgoing Threat adds +1. Compare every name.'
    }
  ],
  'turncoat-bridge': [
    {reverse: false, invert: false},
    {
      reverse: true, invert: false,
      title: 'Exposed defector',
      order: 'Who sends Safe in one division and receives Threat in another, while never receiving Safe?',
      hint: 'Rule out anyone who receives Safe. Then match outgoing Safe and incoming Threat across different divisions.'
    },
    {
      reverse: false, invert: true,
      title: 'Double shield',
      order: 'Who receives Threat in one division and sends Safe in another, while never sending Threat?',
      hint: 'Rule out anyone who sends Threat. Then match incoming Threat and outgoing Safe across different divisions.'
    },
    {
      reverse: true, invert: true,
      title: 'Marked courier',
      order: 'Who sends Threat in one division and receives Safe in another, while never receiving Threat?',
      hint: 'Rule out anyone who receives Threat. Then match outgoing Threat and incoming Safe across different divisions.'
    }
  ],
  'counter-loop': [
    {reverse: false, invert: false},
    {
      reverse: false, invert: true,
      title: 'Covert retaliation',
      order: 'Find the pair where one sends Safe and the other answers on Threat links (1 or 2 steps). Shoot both.',
      hint: 'Pick a Safe arrow A → B, then look for a Threat return from B to A directly or via one Threat step.'
    }
  ],
  'three-front': [
    {reverse: false, invert: false},
    {
      reverse: false, invert: true,
      title: 'Three-front ally',
      order: 'Who appears in all three divisions (row pairs) with more Safe links than Threat links?',
      hint: 'Find names active in all three row pairs (Friend/Foe, Spy/Double, Civilian/Foreigner), then tally Safe vs Threat.'
    }
  ],
  'signed-reach': [
    {reverse: false, invert: false},
    {
      reverse: true, invert: false,
      title: 'Most exposed',
      order: 'Follow two roles (mixed = Hostile; Threat × Threat = Allied; no returns). Who is hit by the most on Hostile chains?',
      hint: 'Pick a receiver and trace two steps back with one Safe and one Threat arrow. Count each distinct sender once.'
    }
  ],
  'triadic-stance': [
    {reverse: false, invert: false},
    {
      reverse: false, invert: true,
      title: 'Opposed outsider',
      order: 'Who has no direct link to {name}, yet shares a neighbor with the opposite Safe/Threat sign in another division?',
      hint: 'List {name}’s neighbors and their signs, then find outsiders linked (either way) to them with the opposite sign in another division.'
    }
  ]
};

export function variantsFor(family) {
  return variantTable[family] || [{reverse: false, invert: false}];
}

export function patternBrief(family, variant) {
  const base = patterns.find(pattern => pattern.id === family);
  if (!base) throw new RangeError('Unknown case pattern ' + family);
  if (variant?.order) return {title: variant.title, order: variant.order, hint: variant.hint};
  return {title: base.title, order: base.order, hint: base.hint};
}

// Reversing all arrows and/or inverting Safe <-> Threat are exact involutions:
// applying the same conversion twice returns the canonical layout unchanged.
export function displayRole(role, variant) {
  return variant?.invert ? oppositePolarityRole[role] : role;
}

export function displayEdge(edge, variant) {
  const role = displayRole(edge.role, variant);
  return variant?.reverse ? {from: edge.to, to: edge.from, role} : {...edge, role};
}

export function evaluatePattern(id, visibleEdges, anchor, includeProof = true, variant) {
  const transformed = Boolean(variant?.reverse || variant?.invert);
  const edges = transformed ? visibleEdges.map(edge => displayEdge(edge, variant)) : visibleEdges;

  const arrow = edge => {
    const real = transformed ? displayEdge(edge, variant) : edge;
    const tag = rolePolarity[real.role] > 0 ? '+' : '−';
    return roleNames[real.role] + ' (' + tag + ') ' + real.from + ' → ' + real.to;
  };
  const trail = (first, second) => variant?.reverse
    ? arrow(second) + ' · ' + arrow(first)
    : arrow(first) + ' · ' + arrow(second);

  const people = new Map();
  function person(name) {
    if (!people.has(name)) people.set(name, {incoming: [], outgoing: [], all: []});
    return people.get(name);
  }
  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    person(edge.from).outgoing.push(edge);
    person(edge.from).all.push(edge);
    person(edge.to).incoming.push(edge);
    person(edge.to).all.push(edge);
  }

  const answers = new Map();
  function mark(name, reason) {
    if (!answers.has(name)) answers.set(name, includeProof ? reason() : '');
  }

  switch (id) {
    case 'signed-chain': {
      const start = people.get(anchor);
      if (start) {
        const allied = new Map();
        const hostile = new Set();
        for (const e1 of start.outgoing) {
          for (const e2 of people.get(e1.to).outgoing) {
            if (e2.to === anchor || e2.role === e1.role) continue;
            const prod = rolePolarity[e1.role] * rolePolarity[e2.role];
            if (prod > 0) {
              if (!allied.has(e2.to)) allied.set(e2.to, [e1, e2]);
            } else {
              hostile.add(e2.to);
            }
          }
        }
        for (const [name, [e1, e2]] of allied) {
          if (!hostile.has(name)) mark(name, () => trail(e1, e2) + ' → Allied.');
        }
      }
      break;
    }

    case 'double-cross': {
      for (const [name, {outgoing}] of people) {
        for (const direct of outgoing) {
          const directSign = rolePolarity[direct.role];
          for (const e1 of outgoing) {
            if (e1.to === direct.to) continue;
            for (const e2 of people.get(e1.to).outgoing) {
              if (e2.to !== direct.to) continue;
              const routeSign = rolePolarity[e1.role] * rolePolarity[e2.role];
              if (routeSign !== directSign) {
                const proof = () => arrow(direct) + ' vs ' + trail(e1, e2);
                mark(name, proof);
                mark(direct.to, proof);
              }
            }
          }
        }
      }
      break;
    }

    case 'burned-cover': {
      const targetedByThreat = new Set();
      for (const [name, {incoming}] of people) {
        if (incoming.some(e => rolePolarity[e.role] < 0)) targetedByThreat.add(name);
      }
      for (const [name, {incoming}] of people) {
        if (targetedByThreat.has(name)) continue;
        const safeFromTargeted = incoming.find(e => rolePolarity[e.role] > 0 && targetedByThreat.has(e.from));
        if (safeFromTargeted) {
          const threatToMid = people.get(safeFromTargeted.from).incoming.find(e => rolePolarity[e.role] < 0);
          mark(name, () => trail(threatToMid, safeFromTargeted) + '.');
        }
      }
      break;
    }

    case 'profile-mirror': {
      const profile = node => [
        node.outgoing.some(e => rolePolarity[e.role] > 0),
        node.incoming.some(e => rolePolarity[e.role] > 0),
        node.outgoing.some(e => rolePolarity[e.role] < 0),
        node.incoming.some(e => rolePolarity[e.role] < 0)
      ];
      const baseNode = people.get(anchor);
      if (baseNode) {
        const [outS, inS, outT, inT] = profile(baseNode);
        // Full double-inversion: direction flipped AND polarity flipped.
        const target = [inT, outT, inS, outS];
        for (const [name, node] of people) {
          if (name === anchor) continue;
          const p = profile(node);
          if (p.every((v, i) => v === target[i])) {
            mark(name, () => name + ' mirrors ' + anchor + ' across all six rows (direction and Safe/Threat inverted).');
          }
        }
      }
      break;
    }

    case 'net-standing': {
      let best = -Infinity;
      for (const [name, {incoming, outgoing}] of people) {
        const inS = incoming.filter(e => rolePolarity[e.role] > 0).length;
        const inT = incoming.filter(e => rolePolarity[e.role] < 0).length;
        const outT = outgoing.filter(e => rolePolarity[e.role] < 0).length;
        const score = inS - inT - outT;
        if (score < best) continue;
        if (score > best) {
          answers.clear();
          best = score;
        }
        mark(name, () => name + ' scores ' + (score >= 0 ? '+' + score : String(score)) +
          ' (best standing across all six rows).');
      }
      break;
    }

    case 'turncoat-bridge': {
      for (const [name, {incoming, outgoing}] of people) {
        if (outgoing.some(e => rolePolarity[e.role] > 0)) continue;
        const inSafe = incoming.filter(e => rolePolarity[e.role] > 0);
        const outThreat = outgoing.filter(e => rolePolarity[e.role] < 0);
        outer: for (const a of inSafe) {
          for (const b of outThreat) {
            if (roleDivision[a.role] !== roleDivision[b.role]) {
              mark(name, () => trail(a, b) + ' (cross-division flip).');
              break outer;
            }
          }
        }
      }
      break;
    }

    case 'counter-loop': {
      for (const [a, {outgoing}] of people) {
        for (const direct of outgoing) {
          if (rolePolarity[direct.role] !== -1) continue;
          const b = direct.to;
          const bOut = people.get(b).outgoing;
          const directBack = bOut.find(e => e.to === a && rolePolarity[e.role] === 1);
          if (directBack) {
            const proof = () => arrow(direct) + ' answered by ' + arrow(directBack);
            mark(a, proof);
            mark(b, proof);
            continue;
          }
          for (const e1 of bOut) {
            if (rolePolarity[e1.role] !== 1 || e1.to === a) continue;
            for (const e2 of people.get(e1.to).outgoing) {
              if (rolePolarity[e2.role] !== 1 || e2.to !== a) continue;
              const proof = () => arrow(direct) + ' answered by ' + trail(e1, e2);
              mark(a, proof);
              mark(b, proof);
            }
          }
        }
      }
      break;
    }

    case 'three-front': {
      for (const [name, {all}] of people) {
        const divs = new Set(all.map(e => roleDivision[e.role]));
        if (divs.size !== 3) continue;
        const safeCount = all.filter(e => rolePolarity[e.role] > 0).length;
        const threatCount = all.length - safeCount;
        if (threatCount > safeCount) {
          mark(name, () => {
            const realSafe = variant?.invert ? threatCount : safeCount;
            const realThreat = variant?.invert ? safeCount : threatCount;
            return name + ' spans all 3 divisions (' + realThreat + ' Threat vs ' + realSafe + ' Safe).';
          });
        }
      }
      break;
    }

    case 'signed-reach': {
      let best = 0;
      for (const [name, {outgoing}] of people) {
        const reached = new Map();
        for (const e1 of outgoing) {
          for (const e2 of people.get(e1.to).outgoing) {
            if (e2.to === name || e2.role === e1.role) continue;
            if (rolePolarity[e1.role] * rolePolarity[e2.role] < 0) {
              if (!reached.has(e2.to)) reached.set(e2.to, e1.to);
            }
          }
        }
        if (!reached.size || reached.size < best) continue;
        if (reached.size > best) {
          answers.clear();
          best = reached.size;
        }
        mark(name, () => name + (variant?.reverse ? ' is hit by ' : ' reaches ') + reached.size +
          ' on Hostile chains (' + [...reached].map(([end, mid]) => end + ' via ' + mid).join(', ') + ').');
      }
      break;
    }

    case 'triadic-stance': {
      const anchorNode = people.get(anchor);
      if (anchorNode) {
        const directNeighbors = new Set();
        const anchorLinksByNeighbor = new Map();
        for (const e of anchorNode.all) {
          const other = e.from === anchor ? e.to : e.from;
          directNeighbors.add(other);
          if (!anchorLinksByNeighbor.has(other)) anchorLinksByNeighbor.set(other, []);
          anchorLinksByNeighbor.get(other).push(e);
        }
        for (const [name, {all}] of people) {
          if (name === anchor || directNeighbors.has(name)) continue;
          outer: for (const e2 of all) {
            const mid = e2.from === name ? e2.to : e2.from;
            const anchorEdges = anchorLinksByNeighbor.get(mid);
            if (!anchorEdges) continue;
            for (const e1 of anchorEdges) {
              if (rolePolarity[e1.role] !== rolePolarity[e2.role] &&
                  roleDivision[e1.role] !== roleDivision[e2.role]) {
                mark(name, () => arrow(e1) + ' vs ' + arrow(e2) + ' (no direct link with ' + anchor + ').');
                break outer;
              }
            }
          }
        }
      }
      break;
    }

    default:
      throw new RangeError('Unknown case pattern ' + id);
  }

  const pair = [...answers.keys()].sort();
  return {pair, proof: includeProof ? [...new Set(pair.map(name => answers.get(name)))] : []};
}
