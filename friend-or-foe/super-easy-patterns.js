import {oppositePolarityRole, roleDivision, roleNames, rolePolarity} from './case-layout.js';

// Ten distinct RC-2 / light RC-3 semantic relational families for Super Easy (90–105 IQ).
// Every family uses real Safe (+) vs Threat (−) and/or division semantics across all six rows.
export const superEasyPatterns = [
  {
    id: 'se-mixed-in',
    title: 'Mixed signals',
    order: 'Who receives BOTH a Safe (+) link and a Threat (−) link across the file?',
    hint: 'Find names on the right of a Safe (+) arrow, then check which two also appear on the right of a Threat (−) arrow.'
  },
  {
    id: 'se-pure-threat',
    title: 'Pure threat',
    order: 'Who appears in two different Threat (−) rows and NO Safe (+) rows?',
    hint: 'Check the three Threat (−) rows for repeated names, then rule out anyone who appears in a Safe (+) row.'
  },
  {
    id: 'se-safe-to-threat',
    title: 'Safe into Threat',
    order: 'Follow a Safe (+) arrow, then a Threat (−) arrow (no returns). Who starts those two steps?',
    hint: 'Pick a Safe (+) arrow A → M, then check if M sends a Threat (−) arrow to someone other than A.'
  },
  {
    id: 'se-safe-relay',
    title: 'Safe relay',
    order: 'Follow two Safe (+) arrows in different rows (no returns). Who ends the chain?',
    hint: 'Connect one Safe (+) arrow’s receiver to the sender of a different Safe (+) row.'
  },
  {
    id: 'se-shared-target',
    title: 'Hostile rival',
    order: 'Find who {name} sends an arrow to. Who else sends a Threat (−) to that same person?',
    hint: 'Check {name}’s outgoing arrows, then look in Threat (−) rows for others pointing to those same people.'
  },
  {
    id: 'se-division-conflict',
    title: 'Overt vs Covert',
    order: 'Who appears in BOTH Friend/Foe and Spy/Double with opposite Safe/Threat signs?',
    hint: 'Check names in Friend (+) against Double agent (−), and names in Foe (−) against Spy (+).'
  },
  {
    id: 'se-in-safe-out-threat',
    title: 'Polarity flip',
    order: 'Who receives a Safe (+) link and sends a Threat (−) link?',
    hint: 'Look for names on the right of a Safe (+) arrow who also sit on the left of a Threat (−) arrow.'
  },
  {
    id: 'se-anchor-threat-hop',
    title: 'Second-step Threat',
    order: 'Start at {name}, follow any arrow, then a Threat (−) arrow (no return to {name}). Who do you reach?',
    hint: 'Follow {name}’s outgoing arrows first, then follow Threat (−) arrows leaving those contacts.'
  },
  {
    id: 'se-most-threat-in',
    title: 'Primary target',
    order: 'Who receives the most Threat (−) arrows across all six rows?',
    hint: 'Count how many times each name appears on the right in Foe, Double agent, and Foreigner.'
  },
  {
    id: 'se-threat-through',
    title: 'Threat chain',
    order: 'Who BOTH sends a Threat (−) link in one row and receives a Threat (−) link in another row?',
    hint: 'Check the three Threat (−) rows for names appearing on the left in one row and on the right in another.'
  }
];

const divisionPairs = {
  overt: {label: 'Friend/Foe and Spy/Double', divs: [0, 1], hint: 'Check Friend (+) vs Double agent (−), and Foe (−) vs Spy (+).'},
  covert: {label: 'Spy/Double and Civilian/Foreigner', divs: [1, 2], hint: 'Check Spy (+) vs Foreigner (−), and Double agent (−) vs Civilian (+).'},
  border: {label: 'Friend/Foe and Civilian/Foreigner', divs: [0, 2], hint: 'Check Friend (+) vs Foreigner (−), and Foe (−) vs Civilian (+).'}
};

const variantTable = {
  'se-mixed-in': [
    {reverse: false, invert: false},
    {
      reverse: true, invert: false,
      title: 'Split sender',
      order: 'Who sends BOTH a Safe (+) link and a Threat (−) link across the file?',
      hint: 'Find names on the left of a Safe (+) arrow, then check which two also sit on the left of a Threat (−) arrow.'
    }
  ],
  'se-pure-threat': [
    {reverse: false, invert: false},
    {
      reverse: false, invert: true,
      title: 'Pure ally',
      order: 'Who appears in two different Safe (+) rows and NO Threat (−) rows?',
      hint: 'Check the three Safe (+) rows for repeated names, then rule out anyone who appears in a Threat (−) row.'
    }
  ],
  'se-safe-to-threat': [
    {reverse: false, invert: false},
    {
      reverse: true, invert: false,
      title: 'Threat into Safe',
      order: 'Follow a Threat (−) arrow, then a Safe (+) arrow (no returns). Who ends those two steps?',
      hint: 'Follow a Threat (−) arrow to M, then follow a Safe (+) arrow leaving M to a new person.'
    }
  ],
  'se-safe-relay': [
    {reverse: false, invert: false},
    {
      reverse: false, invert: true,
      title: 'Threat relay',
      order: 'Follow two Threat (−) arrows in different rows (no returns). Who ends the chain?',
      hint: 'Connect one Threat (−) arrow’s receiver to the sender of a different Threat (−) row.'
    },
    {
      reverse: true, invert: false,
      title: 'Safe origin',
      order: 'Follow two Safe (+) arrows in different rows (no returns). Who starts the chain?',
      hint: 'Connect one Safe (+) arrow’s receiver to the sender of a different Safe (+) row, and pick the original senders.'
    },
    {
      reverse: true, invert: true,
      title: 'Threat origin',
      order: 'Follow two Threat (−) arrows in different rows (no returns). Who starts the chain?',
      hint: 'Connect one Threat (−) arrow’s receiver to the sender of a different Threat (−) row, and pick the original senders.'
    }
  ],
  'se-shared-target': [
    {reverse: false, invert: false},
    {
      reverse: false, invert: true,
      title: 'Allied rival',
      order: 'Find who {name} sends an arrow to. Who else sends a Safe (+) link to that same person?',
      hint: 'Check {name}’s outgoing arrows, then look in Safe (+) rows for others pointing to those same people.'
    },
    {
      reverse: true, invert: false,
      title: 'Common threat source',
      order: 'Find who sends an arrow to {name}. Whom else does that sender target with a Threat (−)?',
      hint: 'Check who sends an arrow to {name}, then follow their outgoing arrows in Threat (−) rows.'
    }
  ],
  'se-division-conflict': [
    {reverse: false, invert: false, pair: 'overt'},
    {
      reverse: false, invert: false, pair: 'covert',
      title: 'Covert vs Border',
      order: 'Who appears in BOTH Spy/Double and Civilian/Foreigner with opposite Safe/Threat signs?',
      hint: divisionPairs.covert.hint
    },
    {
      reverse: false, invert: false, pair: 'border',
      title: 'Overt vs Border',
      order: 'Who appears in BOTH Friend/Foe and Civilian/Foreigner with opposite Safe/Threat signs?',
      hint: divisionPairs.border.hint
    }
  ],
  'se-in-safe-out-threat': [
    {reverse: false, invert: false},
    {
      reverse: false, invert: true,
      title: 'Defensive flip',
      order: 'Who receives a Threat (−) link and sends a Safe (+) link?',
      hint: 'Look for names on the right of a Threat (−) arrow who also sit on the left of a Safe (+) arrow.'
    }
  ],
  'se-anchor-threat-hop': [
    {reverse: false, invert: false},
    {
      reverse: false, invert: true,
      title: 'Second-step Safe',
      order: 'Start at {name}, follow any arrow, then a Safe (+) arrow (no return to {name}). Who do you reach?',
      hint: 'Follow {name}’s outgoing arrows first, then follow Safe (+) arrows leaving those contacts.'
    },
    {
      reverse: true, invert: false,
      title: 'Threat approach',
      order: 'Follow a Threat (−) arrow, then any arrow into {name} (no return). Who started?',
      hint: 'Work back one step from {name}, then find who sent a Threat (−) to that contact.'
    }
  ],
  'se-most-threat-in': [
    {reverse: false, invert: false},
    {
      reverse: false, invert: true,
      title: 'Most backed',
      order: 'Who receives the most Safe (+) arrows across all six rows?',
      hint: 'Count how many times each name appears on the right in Friend, Spy, and Civilian.'
    },
    {
      reverse: true, invert: false,
      title: 'Top aggressor',
      order: 'Who sends the most Threat (−) arrows across all six rows?',
      hint: 'Count how many times each name appears on the left in Foe, Double agent, and Foreigner.'
    },
    {
      reverse: true, invert: true,
      title: 'Top supporter',
      order: 'Who sends the most Safe (+) arrows across all six rows?',
      hint: 'Count how many times each name appears on the left in Friend, Spy, and Civilian.'
    }
  ],
  'se-threat-through': [
    {reverse: false, invert: false},
    {
      reverse: false, invert: true,
      title: 'Safe chain',
      order: 'Who BOTH sends a Safe (+) link in one row and receives a Safe (+) link in another row?',
      hint: 'Check the three Safe (+) rows for names appearing on the left in one row and on the right in another.'
    }
  ]
};

export function superEasyVariantsFor(family) {
  return variantTable[family] || [{reverse: false, invert: false}];
}

export function superEasyBrief(family, variant) {
  const base = superEasyPatterns.find(pattern => pattern.id === family);
  if (!base) throw new RangeError('Unknown super-easy pattern ' + family);
  if (variant?.order) return {title: variant.title, order: variant.order, hint: variant.hint};
  return {title: base.title, order: base.order, hint: base.hint};
}

// Involution for super-easy variants: arrow reversal, polarity inversion, or division swap.
const swapDiv02 = {friend: 'civilian', civilian: 'friend', foe: 'foreigner', foreigner: 'foe', spy: 'spy', double: 'double'};
const swapDiv12 = {spy: 'civilian', civilian: 'spy', double: 'foreigner', foreigner: 'double', friend: 'friend', foe: 'foe'};

export function superEasyDisplayRole(role, variant) {
  let r = variant?.invert ? oppositePolarityRole[role] : role;
  if (variant?.pair === 'covert') r = swapDiv02[r];
  else if (variant?.pair === 'border') r = swapDiv12[r];
  return r;
}

export function superEasyDisplayEdge(edge, variant) {
  const role = superEasyDisplayRole(edge.role, variant);
  return variant?.reverse ? {from: edge.to, to: edge.from, role} : {...edge, role};
}

export function evaluateSuperEasyPattern(id, visibleEdges, anchor, includeProof = true, variant) {
  const transformed = Boolean(variant?.reverse || variant?.invert || (variant?.pair && variant.pair !== 'overt'));
  const edges = transformed ? visibleEdges.map(edge => superEasyDisplayEdge(edge, variant)) : visibleEdges;

  const arrow = edge => {
    const real = transformed ? superEasyDisplayEdge(edge, variant) : edge;
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
    case 'se-mixed-in': {
      for (const [name, {incoming}] of people) {
        const s = incoming.find(e => rolePolarity[e.role] > 0);
        const t = incoming.find(e => rolePolarity[e.role] < 0);
        if (s && t) mark(name, () => arrow(s) + ' · ' + arrow(t));
      }
      break;
    }

    case 'se-pure-threat': {
      for (const [name, {all}] of people) {
        if (all.some(e => rolePolarity[e.role] > 0)) continue;
        const threatRoles = new Set(all.map(e => e.role));
        if (threatRoles.size >= 2) {
          const [e1, e2] = [...threatRoles].slice(0, 2).map(role => all.find(e => e.role === role));
          mark(name, () => arrow(e1) + ' · ' + arrow(e2) + '.');
        }
      }
      break;
    }

    case 'se-safe-to-threat': {
      for (const [name, {outgoing}] of people) {
        outer: for (const e1 of outgoing) {
          if (rolePolarity[e1.role] <= 0) continue;
          for (const e2 of people.get(e1.to).outgoing) {
            if (e2.to === name || rolePolarity[e2.role] >= 0) continue;
            mark(name, () => trail(e1, e2));
            break outer;
          }
        }
      }
      break;
    }

    case 'se-safe-relay': {
      for (const [name, {outgoing}] of people) {
        for (const e1 of outgoing) {
          if (rolePolarity[e1.role] <= 0) continue;
          for (const e2 of people.get(e1.to).outgoing) {
            if (e2.to === name || rolePolarity[e2.role] <= 0 || e2.role === e1.role) continue;
            mark(e2.to, () => trail(e1, e2));
          }
        }
      }
      break;
    }

    case 'se-shared-target': {
      const start = people.get(anchor);
      if (start) {
        const targets = new Map();
        for (const e of start.outgoing) {
          if (!targets.has(e.to)) targets.set(e.to, e);
        }
        for (const [name, {outgoing}] of people) {
          if (name === anchor) continue;
          const match = outgoing.find(e => rolePolarity[e.role] < 0 && targets.has(e.to));
          if (match) mark(name, () => arrow(targets.get(match.to)) + ' · ' + arrow(match));
        }
      }
      break;
    }

    case 'se-division-conflict': {
      for (const [name, {all}] of people) {
        const div0 = all.filter(e => roleDivision[e.role] === 0);
        const div1 = all.filter(e => roleDivision[e.role] === 1);
        outer: for (const a of div0) {
          for (const b of div1) {
            if (rolePolarity[a.role] !== rolePolarity[b.role]) {
              mark(name, () => arrow(a) + ' · ' + arrow(b));
              break outer;
            }
          }
        }
      }
      break;
    }

    case 'se-in-safe-out-threat': {
      for (const [name, {incoming, outgoing}] of people) {
        const inS = incoming.find(e => rolePolarity[e.role] > 0);
        const outT = outgoing.find(e => rolePolarity[e.role] < 0);
        if (inS && outT) mark(name, () => trail(inS, outT));
      }
      break;
    }

    case 'se-anchor-threat-hop': {
      const start = people.get(anchor);
      if (start) {
        for (const e1 of start.outgoing) {
          for (const e2 of people.get(e1.to).outgoing) {
            if (e2.to === anchor || rolePolarity[e2.role] >= 0) continue;
            mark(e2.to, () => trail(e1, e2));
          }
        }
      }
      break;
    }

    case 'se-most-threat-in': {
      let best = 0;
      for (const [name, {incoming}] of people) {
        const hits = incoming.filter(e => rolePolarity[e.role] < 0);
        if (!hits.length || hits.length < best) continue;
        if (hits.length > best) {
          answers.clear();
          best = hits.length;
        }
        mark(name, () => name + ' has ' + hits.length + ' (' + hits.map(arrow).join(' · ') + ').');
      }
      break;
    }

    case 'se-threat-through': {
      for (const [name, {incoming, outgoing}] of people) {
        const inT = incoming.filter(e => rolePolarity[e.role] < 0);
        const outT = outgoing.filter(e => rolePolarity[e.role] < 0);
        outer: for (const a of inT) {
          for (const b of outT) {
            if (a.role !== b.role) {
              mark(name, () => trail(a, b));
              break outer;
            }
          }
        }
      }
      break;
    }

    default:
      throw new RangeError('Unknown super-easy pattern ' + id);
  }

  const pair = [...answers.keys()].sort();
  return {pair, proof: includeProof ? [...new Set(pair.map(name => answers.get(name)))] : []};
}
