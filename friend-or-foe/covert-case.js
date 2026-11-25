// A five-bit world records the allegiance of each duo's lead. The partner
// always has the opposite allegiance. The off-range contact is the reference.
const cast = ['Samp', 'Ivo', 'Luma', 'Mira', 'Nia', 'Orin', 'Pia', 'Sol', 'Tess', 'Vale'];
const contacts = ['Echo', 'Flint', 'Halo', 'Kite', 'Nova', 'Reed'];
const ruleSets = {handoff: ['friend', 'foe'], intercept: ['spy', 'double'], arrival: ['civilian', 'foreigner']};
const roleNames = {friend:'Friend', foe:'Foe', spy:'Spy', double:'Double agent', civilian:'Civilian', foreigner:'Foreigner'};
const indexes = [0, 1, 2, 3, 4];
const worlds = Array.from({length: 32}, (_, i) => i);
const parity = worlds.map(n => (n.toString(2).match(/1/g) ?? []).length % 2);
const at = (value, i) => (value >> i) & 1;
const bitCount = value => { let count = 0; while (value) { value &= value - 1; count++; } return count; };
const pick = (values, random) => values[Math.floor(random() * values.length)];
function shuffle(values, random) {
  const copied = values.slice();
  for (let i = copied.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

function qualification(query, world, i) {
  const prev = at(world, (i + 4) % 5);
  const lead = at(world, i);
  const next = at(world, (i + 1) % 5);
  if (query.family === 'handoff') return lead !== prev ? Number(query.role === 'friend') : null;
  if (query.family === 'intercept') return prev !== next ? (query.role === 'spy' ? next : prev) : null;
  const smallerSide = Number(bitCount(world) < 3);
  return lead === smallerSide ? (query.role === 'civilian' ? prev : 1 - prev) : null;
}
function targetBits(query, world) {
  let selected = 0;
  for (const i of indexes) {
    const required = qualification(query, world, i);
    if (required !== null) selected |= 1 << (2 * i + Number(required !== at(world, i)));
  }
  return selected;
}
const outcomes = Object.fromEntries(Object.entries(ruleSets).flatMap(([family, roles]) =>
  roles.map(role => [role, worlds.map(world => targetBits({family,role}, world))])));
const toNames = (mask, slots) => slots.filter((_, i) => at(mask, i));
const toMask = (names, slots) => names.reduce((mask, n) => mask | (1 << slots.indexOf(n)), 0);
const slotNames = duos => duos.flatMap(({lead, partner}) => [lead, partner]);

function command({family,role}, anchor) {
  if (family === 'handoff') return 'Where the lead opposes the previous lead, choose the ' +
    (role === 'friend' ? 'ally' : 'opponent') + ' of ' + anchor + '.';
  if (family === 'intercept') return 'Where the neighboring leads oppose each other, choose whoever sides with the ' +
    (role === 'spy' ? 'next' : 'previous') + ' lead.';
  return 'Count the five leads. In duos whose lead is on the smaller side, choose whoever ' +
    (role === 'civilian' ? 'sides with' : 'opposes') + ' the previous lead.';
}
function nameVariable(name, board, slots) {
  if (name === board.anchor) return {mask: 0, flip: 1};
  const i = slots.indexOf(name);
  if (i < 0) throw new Error('Unknown report participant: ' + name);
  return {mask: 1 << (i >> 1), flip: i % 2};
}
function readEquations(board, slots) {
  return board.reports.map(({speaker,left,right,same}) => {
    const a = nameVariable(left, board, slots);
    const b = nameVariable(right, board, slots);
    const s = nameVariable(speaker ?? board.anchor, board, slots);
    // True when a XOR b equals "opposite", inverted when speaker is away.
    return {mask: a.mask ^ b.mask ^ s.mask, rhs: a.flip ^ b.flip ^ s.flip ^ Number(same)};
  });
}

function joinNames(names) {
  if (!names.length) return 'none';
  return names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names.at(-1);
}

function explain(board, equations, solutions, beforeCount, slots, pair) {
  const {query,duos,anchor,reports} = board;
  const world = solutions[0];
  const proof = [];
  const sideOf = (name,w) => {
    const v = nameVariable(name,board,slots);
    return parity[w & v.mask] ^ v.flip;
  };
  const aligns = same => same ? ' sides with ' : ' opposes ';
  const withContact = (name,w) => name + aligns(sideOf(name,w)) + anchor;
  const duoNumbers = w => indexes.filter(i => qualification(query,w,i) !== null).map(i => i + 1);

  // First try a natural corroboration: two versions of a relationship can
  // establish whether a named source is telling the truth, even when one
  // reports on the rivals of the two people mentioned by the other.
  const direct = reports.findIndex(r => !r.speaker);
  const baseline = reports[direct];
  const endpoints = r => nameVariable(r.left,board,slots).mask ^ nameVariable(r.right,board,slots).mask;
  const echo = baseline ? reports.findIndex(r => r.speaker && endpoints(r) === endpoints(baseline)) : -1;
  if (echo !== -1) {
    const r = reports[echo];
    const trueReport = !!sideOf(r.speaker,world);
    proof.push('#' + (direct+1) + ' confirms ' + baseline.left + aligns(baseline.same) + baseline.right +
      '. Using the rival pairs, ' + r.left + aligns(trueReport ? r.same : !r.same) + r.right +
      '. So ' + r.speaker + (trueReport ? ' tells the truth' : ' reverses the facts') +
      ' in #' + (echo+1) + ' and ' + (trueReport ? 'backs ' : 'opposes ') + anchor + '.');
  } else {
    if (baseline) proof.push('#' + (direct+1) + ' confirms ' + baseline.left + aligns(baseline.same) + baseline.right + '.');
    // A two- or three-report inference that holds whether a chosen voice is
    // honest or inverted. Show what each branch says about actual named people.
    let fork;
    for (let length = 2; length <= 3 && !fork; length++) {
      for (let subset = 1; subset < (1 << equations.length) && !fork; subset++) {
        if (bitCount(subset) !== length) continue;
        const ids = reports.map((_,i) => i).filter(i => at(subset,i));
        const fits = worlds.filter(w => ids.every(i => parity[w & equations[i].mask] === equations[i].rhs));
        const fixed = indexes.find(i => fits.every(w => at(w,i) === at(fits[0],i)) &&
          ids.every(j => equations[j].mask !== (1 << i)));
        if (fixed === undefined) continue;
        const voice = ids.find(i => reports[i].speaker &&
          fits.some(w => sideOf(reports[i].speaker,w)) && fits.some(w => !sideOf(reports[i].speaker,w)));
        if (voice !== undefined) fork = {fixed,ids,voice};
      }
    }
    if (fork) {
      const r = reports[fork.voice];
      const others = fork.ids.filter(i => i !== fork.voice).map(i => '#' + (i+1));
      proof.push('If ' + r.speaker + ' tells the truth in #' + (fork.voice+1) + ', ' + r.left +
        aligns(r.same) + r.right + '. If ' + r.speaker + ' lies, ' + r.left + aligns(!r.same) + r.right +
        '. In both cases ' + joinNames(others) + (others.length === 1 ? ' forces' : ' force') + ' the same result — ' +
        withContact(duos[fork.fixed].lead,world) + '.');
    }
  }

  // At most two full lineups fit the reports. State the relevant teams and
  // actual qualifying duo numbers in both branches, including a zero count.
  for (const w of beforeCount.slice().sort((a,b) => Number(a === world) - Number(b === world))) {
    const homes = duos.filter((_,i) => at(w,i)).map(duo => duo.lead);
    const numbers = duoNumbers(w);
    const lineup = homes.length ? 'Only ' + joinNames(homes) + (homes.length===1 ? ' backs ' : ' back ') +
      anchor : 'No lead backs ' + anchor;
    const qualifying = numbers.length ? 'duo' + (numbers.length === 1 ? ' ' : 's ') + joinNames(numbers) +
      (numbers.length === 1 ? ' qualifies' : ' qualify') : 'no duo qualifies';
    proof.push(lineup + ' → ' + qualifying + ' (' + numbers.length + (numbers.length === 1 ? ' mark). ' : ' marks). ') +
      (numbers.length === 2 ? 'This fits the order.' : 'The order requires exactly two.'));
  }
  const reasons = indexes.filter(i => qualification(query,world,i) !== null).map((i,k) => {
    const prev = duos[(i + 4) % 5].lead, next = duos[(i + 1) % 5].lead;
    if (query.family === 'handoff') return pair[k] + aligns(query.role === 'friend') + anchor;
    if (query.family === 'intercept') return pair[k] + ' matches ' +
      (query.role === 'spy' ? 'the next lead ' + next : 'the previous lead ' + prev);
    return pair[k] + aligns(query.role === 'civilian') + 'the previous lead ' + prev;
  });
  proof.push(roleNames[query.role] + ' order — ' + reasons.join(', and ') + '.');
  return proof;
}

function publicLineups(board) {
  const slots = slotNames(board.duos);
  const equations = readEquations(board, slots);
  const beforeCount = worlds.filter(w => equations.every(e => parity[e.mask & w] === e.rhs));
  const solutions = beforeCount.filter(w => bitCount(outcomes[board.query.role][w]) === 2);
  return {slots, equations, beforeCount, solutions};
}

// This solver only reads the named duos, the displayed reports, the public
// order, and its two-target contract. It never uses an earlier pair or the deal.
export function solveCovertTrial(board) {
  const {slots, equations, beforeCount, solutions} = publicLineups(board);
  const answers = [...new Set(solutions.map(w => outcomes[board.query.role][w]))];
  if (answers.length !== 1) return {pair: [], proof: []};
  const pair = toNames(answers[0], slots);
  return {pair, proof: explain(board, equations, solutions, beforeCount, slots, pair)};
}

export function caseRoles(board) {
  const result = Object.fromEntries(Object.keys(roleNames).map(role => [role, []]));
  const {solutions} = publicLineups(board);
  if (solutions.length !== 1) return result;

  const world = solutions[0];
  const active = indexes.filter(i => qualification(board.query, world, i) !== null);
  const remaining = indexes.filter(i => !active.includes(i));
  const assignments = [active, remaining.slice(0, 2), remaining.slice(1)];
  const families = ['handoff', 'intercept', 'arrival'];
  const first = families.indexOf(board.query.family);
  for (const [offset, assigned] of assignments.entries()) {
    const family = families[(first + offset) % families.length];
    const [role, counterpart] = ruleSets[family];
    for (const i of assigned) {
      const {lead, partner} = board.duos[i];
      let required = 1; // A friend sides with the off-range contact.
      if (family === 'intercept') required = at(world, (i + 1) % 5);
      if (family === 'arrival') required = at(world, (i + 4) % 5);
      const leadMatches = at(world, i) === required;
      result[role].push(leadMatches ? lead : partner);
      result[counterpart].push(leadMatches ? partner : lead);
    }
  }
  return result;
}

export function possibleCovertPairs(board, omitIndex) {
  const slots = slotNames(board.duos);
  const equations = readEquations(board, slots);
  const previousPair = toMask(board.previousPair ?? [], slots);
  const answers = new Set();
  for (const world of worlds) {
    const proposed = outcomes[board.query.role][world];
    if (bitCount(proposed) === 2 && proposed !== previousPair &&
        equations.every((eq,i) => i === omitIndex || parity[world & eq.mask] === eq.rhs)) answers.add(proposed);
  }
  return [...answers].map(bits => toNames(bits, slots));
}

const shape = (speaker,left,right) => ({speaker,left,right,
  mask: [speaker,left,right].reduce((m,i) => i === null || i === 5 ? m : m ^ (1 << i), 0)});
function randomShape(random) {
  const [a,b,c,d,e] = shuffle(indexes, random);
  const mode = Math.floor(random()*3);
  const direct = random() < .38 ? 5 : b;
  let start;
  if (mode === 0) {
    // One named source corroborates or denies a direct comparison.
    start = [shape(null,a,direct), shape(c,a,direct)];
  } else if (mode === 1) {
    // Two sources' statements share the same team variables in different roles.
    start = [shape(null,a,b), shape(a,b,c)];
  } else {
    // Two reports reference each other's speaker; the fixed fact closes a loop.
    start = [shape(null,a,direct), shape(c,d,e), shape(d,c,b)];
  }
  const count = random() < .2 ? 5 : 4;
  while (start.length < count) {
    const [left,right,speaker] = shuffle(indexes, random);
    const report = shape(random() < .24 ? null : speaker, left, random() < .28 ? 5 : right);
    if (!start.some(c => c.mask === report.mask)) start.push(report);
    else return null;
  }
  if (new Set(start.flatMap(r => r.speaker === null ? [] : [r.speaker])).size < 2 ||
      start.reduce((mask,r) => mask | r.mask, 0) !== 31) return null;
  return start;
}
function certify(rows, state, query, oldMask) {
  const goal = outcomes[query.role][state];
  if (bitCount(goal) !== 2 || goal === oldMask) return false;
  let intact = 0, raw = 0, untouched = goal;
  const alternatives = rows.map(() => false);
  for (const w of worlds) {
    let failed = 0;
    for (const [i,row] of rows.entries()) if (parity[(w ^ state) & row.mask]) failed |= 1 << i;
    if (!failed) raw++;
    const proposed = outcomes[query.role][w];
    if (bitCount(proposed) !== 2) continue;
    if (!failed) {
      if (proposed !== goal) return false;
      intact++;
    } else if (!(failed & (failed - 1)) && proposed !== goal && proposed !== oldMask) {
      alternatives[Math.log2(failed)] = true;
      untouched &= proposed;
    }
  }
  // At most two possible lineups remain before applying the two-mark contract.
  return intact === 1 && raw <= 2 && untouched === 0 && alternatives.every(Boolean);
}
function publicCase(slots, anchor, number, previousPair, query, rows, state, random) {
  const nameFor = i => i === 5 ? anchor : slots[2*i + Number(random() < .5)];
  const side = name => name === anchor ? 1 : at(state, slots.indexOf(name) >> 1) ^ (slots.indexOf(name) % 2);
  const reports = shuffle(rows, random).map(r => {
    const speaker = r.speaker === null ? null : nameFor(r.speaker);
    const [left,right] = shuffle([nameFor(r.left),nameFor(r.right)],random);
    const matches = side(left) === side(right);
    return {speaker,left,right,same: speaker === null || side(speaker) ? matches : !matches};
  });
  const duos = indexes.map(i => ({lead:slots[2*i], partner:slots[2*i+1]}));
  const board = {number,roster:cast.slice(),anchor,duos,reports,query,order:command(query,anchor),previousPair};
  const result = solveCovertTrial(board);
  if (result.pair.length !== 2) throw new Error('Invalid covert case.');
  return {...board,...result};
}

function createRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function applicableStates(rows, query, oldMask) {
  const possible = worlds.filter(state => certify(rows,state,query,oldMask));
  // Erasing every same/opposite sign must leave at least two disjoint
  // possible pairs even for someone who knows the certification rules.
  return possible.filter(w => possible.some(other =>
    !(outcomes[query.role][w] & outcomes[query.role][other])));
}
const backupReports = {
  handoff: [[null,0,5],[1,0,5],[2,4,3],[4,1,2]],
  intercept: [[null,2,4],[2,4,3],[0,1,5],[4,1,0]],
  arrival: [[null,2,5],[1,4,0],[4,1,3],[null,1,4]]
};
export function makeCovertTrial(previous=null, random=Math.random) {
  const number = (previous?.number ?? 0) + 1;
  const draw = createRandom(Math.floor(random()*4294967296) ^ Math.imul(number,0x9e3779b1));
  const previousPair = previous?.pair?.slice() ?? [];
  const family = pick(Object.keys(ruleSets).filter(f => f !== previous?.query?.family),draw);
  const query = {family,role:pick(ruleSets[family],draw)};
  const slots = shuffle(cast,draw);
  const oldMask = toMask(previousPair,slots);
  const anchor = pick(contacts,draw);
  for (let attempt=0; attempt<384; attempt++) {
    const rows = randomShape(draw);
    if (!rows) continue;
    const eligible = applicableStates(rows,query,oldMask);
    if (eligible.length) return publicCase(slots,anchor,number,previousPair,query,rows,pick(eligible,draw),draw);
  }
  // One member per qualifying duo can be marked. Pair the two previous names
  // inside a single duo so they cannot remove any alternative in this backup.
  const rest = slots.filter(n => !previousPair.includes(n));
  const backupSlots = [...previousPair,...rest];
  const backup = backupReports[family].map(args => shape(...args));
  const choices = applicableStates(backup,query,toMask(previousPair,backupSlots));
  return publicCase(backupSlots,anchor,number,previousPair,query,backup,pick(choices,draw),draw);
}
