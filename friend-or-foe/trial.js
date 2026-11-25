// All deductions use only the star, bench and slip records shown in the briefing.
const roster = ['Dex', 'Ivo', 'Luma', 'Mira', 'Nia', 'Orin', 'Pia', 'Sol', 'Tess', 'Vale'];
const families = ['trace', 'xor', 'split', 'relay'];
const criteria = ['spy', 'double', 'paidFriend', 'paidVisitor', 'pledgedFriend', 'pledgedVisitor', 'pledgedCivilian', 'pledgedFoe', 'satWithFriend'];
const columns = {author: 0, scanned: 1, pledged: 2, paid: 3};
const fields = {
  author: 'the author', paid: 'the person paid', pledged: 'the person promised the point',
  scanned: 'the owner of the scanned tile', seatmate: 'the author’s benchmate'
};
const duo = names => names.join(' and ');

function shuffle(items, random) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pairKey(pair) { return pair.slice().sort().join('|'); }

function classify(b) {
  const rows = b.table.rows;
  return [
    {key:'friend', label:'Friend of ' + b.witness, names:b.sent.filter(n => b.received.includes(n))},
    {key:'foe', label:'Foe of ' + b.witness, names:[...new Set(rows.map(row => row[1]))]},
    {key:'spy', label:'Spy on ' + b.watched, names:rows.filter(row => row[1] === b.watched).map(row => row[0])},
    {key:'double', label:'Double agent', names:rows.filter(row => row[2] !== row[3]).map(row => row[0])},
    {key:'civilian', label:'Civilian in this contest', names:b.benches.find(pair => pair.includes(b.witness))},
    {key:'foreigner', label:'Foreigner to this arena', names:rows.filter(row => b.sealedSlips.includes(row[0])).map(row => row[3])}
  ];
}

function balanced(roles) {
  const memberships = roster.map(n => roles.filter(r => r.names.includes(n)).length);
  return roles.every(r => new Set(r.names).size === 2) &&
    memberships.filter(n => n === 1).length === 8 && memberships.filter(n => n === 2).length === 2;
}

function criterionMap(b, roles) {
  const byRole = Object.fromEntries(roles.map(r => [r.key, r.names]));
  const marked = (key, col) => b.table.rows.filter(row => byRole[key].includes(row[col])).map(row => row[0]);
  const nearFriend = b.table.rows.filter(row => byRole.friend.includes(value(b,row,'seatmate'))).map(row => row[0]);
  return {
    pledgedCivilian: {names:marked('civilian',2), words:'pledged to a civilian', evidence:duo(byRole.civilian) + ' share the civilian bench. The authors pledging to those two were ' + duo(marked('civilian',2)) + '.'},
    pledgedFoe: {names:marked('foe',2), words:'pledged to a foe of ' + b.witness, evidence:'The two scanned tiles belong to ' + duo(byRole.foe) + ', the foes of ' + b.witness + '. Those foes appear on pledges by ' + duo(marked('foe',2)) + '.'},
    satWithFriend: {names:nearFriend, words:'sat beside a friend of ' + b.witness, evidence:duo(byRole.friend) + ' exchanged stars both ways with ' + b.witness + '. Their benchmates were ' + duo(nearFriend) + '.'},
    spy: {names:byRole.spy, words:'scanned ' + b.watched + '’s tile', evidence:'The scans of ' + b.watched + '’s tile came from ' + duo(byRole.spy) + '.'},
    double: {names:byRole.double, words:'broke their pledge', evidence:duo(byRole.double) + ' each paid someone other than the name on their pledge.'},
    paidFriend: {names:marked('friend',3), words:'paid a friend of ' + b.witness, evidence:'Only ' + duo(byRole.friend) + ' exchanged stars both ways with ' + b.witness + '. Their payers were ' + duo(marked('friend',3)) + '.'},
    paidVisitor: {names:marked('foreigner',3), words:'paid a foreigner', evidence:'The sealed slips establish ' + duo(byRole.foreigner) + ' as visitors. They were paid by ' + duo(marked('foreigner',3)) + '.'},
    pledgedFriend: {names:marked('friend',2), words:'pledged to a friend of ' + b.witness, evidence:duo(byRole.friend) + ' exchanged stars both ways with ' + b.witness + '. The authors pledging to those friends were ' + duo(marked('friend',2)) + '.'},
    pledgedVisitor: {names:marked('foreigner',2), words:'pledged to a foreigner', evidence:'The visiting seals identify ' + duo(byRole.foreigner) + '. The authors pledging to either visitor were ' + duo(marked('foreigner',2)) + '.'}
  };
}

function value(b, row, field) {
  if (field !== 'seatmate') return row[columns[field]];
  return b.benches.find(pair => pair.includes(row[0])).find(n => n !== row[0]);
}

function orderText(q, conditions) {
  const a = conditions[q.a].words;
  if (q.family === 'relay') {
    const person = q.side === 0 ? 'first' : 'second';
    return 'Find two different slip authors. The first pledged to the very person the second paid. The ' + person + ' author also ' + a + '. Mark both authors.';
  }
  const b = conditions[q.b].words;
  if (q.family === 'trace') {
    return 'Find the slip whose author both ' + a + ' and ' + b + '. Mark ' + fields[q.first] + ' and ' + fields[q.second] + ' from that slip.';
  }
  if (q.family === 'xor') {
    const selected = q.first === 'author' ? 'Mark both authors.' : 'For each qualifying slip, mark ' + fields[q.first] + '.';
    return 'Find the two authors who each did exactly one of these things: ' + a + ' or ' + b + '. Someone who did both is excluded. ' + selected;
  }
  return 'Among the two authors who ' + a + ', only one ' + b + '. From that author’s slip, mark ' + fields[q.first] + '. From the other author’s slip, mark ' + fields[q.second] + '.';
}

function linkingRows(rows) {
  const links = [];
  for (const from of rows) {
    for (const to of rows) {
      if (from !== to && from[2] === to[3]) links.push([from, to]);
    }
  }
  return links;
}

// Enumerate the matching slips/links before accepting an answer. The two-clause
// orders must have a live decoy for each clause on its own.
export function solveTrial(b) {
  const roles = classify(b);
  const empty = {roles, pair:[], proof:[]};
  if (!balanced(roles)) return empty;
  const q = b.query;
  const c = criterionMap(b, roles);
  const first = c[q.a];
  const rows = b.table.rows;
  const matches = row => first.names.includes(row[0]);
  if (first.names.length !== 2) return empty;
  let pair, proof;
  if (q.family === 'relay') {
    const links = linkingRows(rows);
    const candidates = links.filter(link => matches(link[q.side]));
    const possiblePairs = new Set(links.map(link => pairKey(link.map(row => row[0]))));
    if (candidates.length !== 1 || possiblePairs.size < 2) return empty;
    const [x, y] = candidates[0];
    const other = links.find(link => !matches(link[q.side]));
    pair = [x[0], y[0]];
    proof = [
      first.evidence,
      x[0] + ' pledged to ' + x[2] + '. ' + y[0] + ' actually paid ' + x[2] + ', so the link runs from ' + x[0] + ' to ' + y[0] + '.',
      'Another link runs from ' + other[0][0] + ' to ' + other[1][0] + ', but ' + other[q.side][0] + ' fails the order’s extra condition.'
    ];
  } else {
    const second = c[q.b];
    if (second.names.length !== 2) return empty;
    const both = rows.filter(row => matches(row) && second.names.includes(row[0]));
    if (both.length !== 1) return empty;
    const overlap = both[0];
    const aOnly = rows.find(row => matches(row) && row !== overlap);
    const bOnly = rows.find(row => second.names.includes(row[0]) && row !== overlap);
    proof = [first.evidence, second.evidence];
    if (q.family === 'trace') {
      pair = [value(b,overlap,q.first),value(b,overlap,q.second)];
      const key = pairKey(pair);
      const alternative = row => pairKey([value(b,row,q.first),value(b,row,q.second)]);
      if (alternative(aOnly) === key || alternative(bOnly) === key) return empty;
      proof.push('Only ' + overlap[0] + ' satisfies both conditions. On that slip, ' + fields[q.first] + ' is ' + pair[0] + ' and ' + fields[q.second] + ' is ' + pair[1] + '.');
    } else if (q.family === 'split') {
      pair = [value(b,overlap,q.first),value(b,aOnly,q.second)];
      const swapped = [value(b,aOnly,q.first),value(b,overlap,q.second)];
      if (pairKey(swapped) === pairKey(pair)) return empty;
      proof.push(overlap[0] + ' matches both clues, giving ' + pair[0] + ' as ' + fields[q.first] + '. ' + aOnly[0] + ' matches only the first, giving ' + pair[1] + ' as ' + fields[q.second] + '.');
    } else if (q.family === 'xor') {
      pair = [value(b,aOnly,q.first),value(b,bOnly,q.first)];
      if (pair.includes(value(b,overlap,q.first))) return empty;
      proof.push(overlap[0] + ' did both and drops out. ' + aOnly[0] + ' did only the first thing and ' + bOnly[0] + ' did only the second.' + (q.first === 'author' ? '' : ' Taking ' + fields[q.first] + ' from each slip gives ' + duo(pair) + '.'));
    } else return empty;
  }
  if (pair[0] === pair[1]) return empty;
  return {roles, pair, proof};
}

function evidence(b) {
  const marked = duo(b.sealedSlips);
  return [
    {title:'Star exchange', text:'Anyone who exchanged stars both ways with ' + b.witness + ' counts as their friend. ' + b.witness + ' sent stars to ' + b.sent.join(', ') + '. Stars sent to ' + b.witness + ' came from ' + b.received.join(', ') + '.'},
    {title:'Scans & pledges', text:'The slips are the complete log. Owners of scanned tiles challenged ' + b.witness + ' (foes). Anyone scanning ' + b.watched + ' is a spy on ' + b.watched + '. A double agent paid someone other than the person they pledged to.'},
    {title:'Visiting seals', text:'The slips by ' + marked + ' carry visiting seals. Their actual payees are the two foreigners to this arena.'},
    {title:'Bench register', text:'The two civilians in this contest share ' + b.witness + '’s bench. Benchmates: ' + b.benches.map(pair => pair.join(' + ')).join(' · ') + '.'}
  ];
}

function drawFacts(random) {
  const cast = shuffle(roster, random);
  const [witness, seatmate, watched, rival] = cast;
  const payees = cast.slice(4,7);
  const actors = cast.slice(7);
  const [friend1, friend2, outsider] = shuffle(payees, random);
  const oneWay = shuffle(cast.filter(n => ![witness, friend1, friend2].includes(n)), random);
  const benches = [[witness,seatmate]];
  const rest = shuffle(cast.slice(2), random);
  for (let i = 0; i < rest.length; i += 2) benches.push(rest.slice(i,i+2));
  // Row 0 keeps its pledge. Exactly one of the two remaining authors scans the
  // same tile as row 0. Which recipients know each other is independent.
  const rows = actors.map((n,i) => [n,i === 2 ? rival : watched,payees[i],payees[i]]);
  const style = random();
  if (style < .42) {
    rows[1][2] = payees[0];
    rows[2][2] = payees[1];
  } else if (style < .68) {
    const faction = style < .55 ? [witness, seatmate] : [watched, rival];
    [rows[1][2],rows[2][2]] = shuffle(faction,random);
  } else {
    for (let i = 1; i < 3; i++) rows[i][2] = shuffle(cast.filter(n => ![actors[i],payees[i]].includes(n)),random)[0];
  }
  const visitors = [outsider, random() < .5 ? friend1 : friend2];
  return {
    roster:roster.slice(), witness, watched,
    sent:shuffle([friend1,friend2,oneWay[0]],random), received:shuffle([friend1,friend2,oneWay[1]],random),
    benches:shuffle(benches.map(pair => shuffle(pair,random)),random),
    sealedSlips:shuffle(rows.filter(row => visitors.includes(row[3])).map(row=>row[0]),random),
    table:{headers:['Author','Scanned','Pledged to','Paid'],rows:shuffle(rows,random)}
  };
}

function shape(q, number, random) {
  const pick = items => items[Math.floor(random()*items.length)];
  if (q.family === 'xor') { q.first = number < 3 ? 'author' : pick(['author','paid','seatmate']); return; }
  if (q.family === 'relay') { q.side = random() < .5 ? 0 : 1; return; }
  q.first = number < 3 ? 'author' : pick(['author','scanned','seatmate','paid','pledged']);
  q.second = number < 3 ? 'paid' : pick(['author','paid','scanned','seatmate','pledged'].filter(field => field !== q.first));
}

function withAnswer(b, solution, number, revisedRecord = null) {
  const c = criterionMap(b, solution.roles);
  b.clues = evidence(b);
  b.order = orderText(b.query,c);
  return {roster:b.roster, brief:b, number, family:b.query.family, amended:Boolean(revisedRecord), revisedRecord, ...solution};
}

function alteredFacts(b) {
  // Each variant changes just one public relationship or swaps the endpoints
  // of two links. All other facts (and the player's original order) survive.
  const variants = [];
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      for (const col of [1, 2, 3]) {
        const rows = b.table.rows.map(row => row.slice());
        [rows[i][col],rows[j][col]] = [rows[j][col],rows[i][col]];
        variants.push({...b,table:{...b.table, rows}});
      }
    }
  }
  for (const author of b.table.rows.map(row => row[0]).filter(n => !b.sealedSlips.includes(n))) {
    for (let i = 0; i < b.sealedSlips.length; i++) {
      const sealedSlips = b.sealedSlips.slice();
      sealedSlips[i] = author;
      variants.push({...b, sealedSlips});
    }
  }
  for (const key of ['sent','received']) {
    for (const name of roster.filter(n => n !== b.witness && !b[key].includes(n))) {
      for (let i=0; i<b[key].length; i++) {
        const list = b[key].slice();
        list[i] = name;
        variants.push({...b,[key]:list});
      }
    }
  }
  return variants;
}

function graphSignature(b) {
  const roles = classify(b);
  const c = criterionMap(b,roles);
  const overlaps = (a,d) => c[a].names.filter(n=>c[d].names.includes(n)).length;
  return [linkingRows(b.table.rows).length,overlaps('spy','paidFriend'),overlaps('double','paidVisitor'),overlaps('spy','pledgedFriend'),overlaps('double','pledgedVisitor')].join('/');
}

export function makeTrial(previous = null, random = Math.random, number = previous ? previous.number + 1 : 1) {
  const lastPair = previous && pairKey(previous.pair);
  // A seeded stream also makes a case reproducible in tests without relying on
  // how often the renderer moves an alien or plays a sound.
  let seed = ((Math.floor(random()*0x100000000) ^ Math.imul(number,0x9e3779b1)) >>> 0);
  function draw() {
    seed = (Math.imul(1664525,seed) + 1013904223) >>> 0;
    return seed / 0x100000000;
  }
  if (previous && number % 5 === 0) {
    for (const b of shuffle(alteredFacts(previous.brief),draw)) {
      const solved = solveTrial(b);
      if (solved.pair.length && pairKey(solved.pair) !== lastPair) {
        const original = previous.brief;
        const revised = b.table !== original.table ? 'Signal log' : b.sealedSlips !== original.sealedSlips ? 'Visiting seals' : 'Star exchange';
        return withAnswer(b,solved,number,revised);
      }
    }
  }
  const order = number <= families.length ? families[number-1] : shuffle(families.filter(f=>f !== previous?.family),draw)[0];
  const priorSignature = previous && graphSignature(previous.brief);
  for (let attempt = 0; attempt < 64; attempt++) {
    const b = drawFacts(draw);
    if (priorSignature && graphSignature(b) === priorSignature) continue;
    const pairs = criteria.flatMap(a => criteria.filter(d=>d!==a).map(d=>({a,b:d})));
    for (const predicates of shuffle(pairs,draw)) {
      // First case crosses the star/visitor evidence with the scanner/pledge log.
      if (number === 1 && (!['spy','double'].includes(predicates.a) || !['paidVisitor','paidFriend'].includes(predicates.b))) continue;
      const q = {family:order,...predicates};
      shape(q,number,draw);
      b.query = q;
      const solution = solveTrial(b);
      if (solution.pair.length && pairKey(solution.pair) !== lastPair) return withAnswer(b,solution,number);
    }
  }
  // Every constructed table has exactly one author who both broke a pledge and
  // scanned the watched tile. These two guaranteed orders have disjoint answer
  // types (author + payee versus two authors) and cannot both repeat the last pair.
  const b = drawFacts(draw);
  for (const family of ['trace','xor']) {
    b.query = {family,a:'spy',b:'double',first:'author',second:'paid'};
    const solution = solveTrial(b);
    if (solution.pair.length && pairKey(solution.pair) !== lastPair) return withAnswer(b,solution,number);
  }
  throw new Error('Invalid slip assignment');
}
