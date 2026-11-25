const test = require('node:test');
const assert = require('node:assert/strict');

const opposite = {friend: 'foe', foe: 'friend', spy: 'double', double: 'spy', civilian: 'foreigner', foreigner: 'civilian'};
const helping = new Set(['friend', 'civilian', 'foreigner']);
const key = pair => [...pair].sort().join('/');

function seeded(state) {
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function incidentRelations(scene, choice) {
  return scene.members.flatMap((actor, seat) => {
    const contact = scene.contacts[seat];
    const role = seat === choice ? scene.role : opposite[scene.role];
    const keyPeople = {
      friend: [[actor, contact]],
      foe: [[contact, actor]],
      spy: [[contact, actor], [actor, scene.anchor]],
      double: [[actor, contact], [actor, scene.anchor]],
      civilian: [[contact, actor]],
      foreigner: [[contact, actor], [actor, scene.anchor]]
    };
    return keyPeople[role].map(([from, to]) => ({from, to, incident: scene.id, help: helping.has(role), role}));
  });
}

// Walk forwards from every named person. An incident and a person can each
// appear only once on a path, even when an incident supplies two edges.
function longestPaths(roster, links, order) {
  const queue = roster.map(name => ({people: [name], incidents: [], lastHelp: null}));
  const ends = new Set();
  let longest = 1;
  for (let i = 0; i < queue.length; i++) {
    const {people, incidents, lastHelp} = queue[i];
    const validEnd = order === 'end' || lastHelp === (order === 'warning');
    if (validEnd && incidents.length >= 2 && incidents.length >= longest) {
      if (incidents.length > longest) ends.clear();
      longest = incidents.length;
      ends.add(key([people[0], people.at(-1)]));
    }
    for (const edge of links) {
      if (!incidents.length && order === 'warning' && !['spy', 'double'].includes(edge.role)) continue;
      if (!incidents.length && order === 'aid' && !['civilian', 'foreigner'].includes(edge.role)) continue;
      if (edge.from !== people.at(-1) || lastHelp === edge.help ||
          incidents.includes(edge.incident) || people.includes(edge.to)) continue;
      queue.push({people: [...people, edge.to], incidents: [...incidents, edge.incident], lastHelp: edge.help});
    }
  }
  return ends.size === 1 ? [...ends][0].split('/') : [];
}

function answerFor(roster, order, links) {
  if (['protected', 'alarm', 'informants', 'instigators'].includes(order)) {
    const sourceFirst = order === 'informants' || order === 'instigators';
    const helpFirst = order === 'alarm' || order === 'instigators';
    return roster.filter(person => links.some(first => first.help === helpFirst &&
      links.some(second =>
        second.help !== first.help && first.to === second.from &&
        first.from !== second.to && first.incident !== second.incident &&
        person === (sourceFirst ? first.from : second.to))));
  }
  if (['end', 'warning', 'aid'].includes(order)) return longestPaths(roster, links, order);
  return roster.filter(name => {
    const arrivals = links.filter(link => link.to === name);
    const departures = links.filter(link => link.from === name);
    if (order === 'relay' || order === 'shield') {
      return arrivals.some(a => a.help === (order === 'relay') && departures.some(d =>
        a.help !== d.help && a.from !== d.to && a.incident !== d.incident));
    }
    if (order === 'receive') {
      return arrivals.some(a => arrivals.some(b => a.help !== b.help && a.from !== b.from && a.incident !== b.incident));
    }
    assert.equal(order, 'send');
    return departures.some(a => departures.some(b => a.help !== b.help && a.to !== b.to && a.incident !== b.incident));
  });
}

function modelsFor(board) {
  const models = [];
  for (let mask = 0; mask < 2 ** board.incidents.length; mask++) {
    const table = new Map();
    const links = [];
    const assignments = Object.fromEntries(Object.keys(opposite).map(role => [role, []]));
    board.incidents.forEach((scene, index) => {
      const choice = (mask >> index) & 1;
      links.push(...incidentRelations(scene, choice));
      scene.members.forEach((actor, place) => {
        const role = choice === place ? scene.role : opposite[scene.role];
        assignments[role].push(actor);
        table.set(scene.id + '/' + actor, {role, contact: scene.contacts[place], anchor: scene.anchor});
      });
    });
    const factHolds = fact => {
      if (fact.kind === 'link') {
        const referent = selector => {
          const scene = board.incidents.find(entry => entry.id === selector.incident);
          const actor = scene.members.find(n => table.get(scene.id + '/' + n).role === selector.role);
          assert.ok(actor, 'Unknown network claim role');
          return selector.end === 'actor' ? actor : table.get(scene.id + '/' + actor)[selector.end];
        };
        return (referent(fact.left) === referent(fact.right)) !== Boolean(fact.negated);
      }
      const entry = table.get(fact.incident + '/' + fact.actor);
      return !!entry && fact.role === entry.role && fact.contact === entry.contact && fact.anchor === entry.anchor;
    };
    const wrong = [], truth = [];
    for (const [row, report] of board.reports.entries()) {
      const first = !report.source || factHolds(report.source), second = factHolds(report.claim);
      truth.push({source: first, claim: second});
      const valid = report.kind === 'record' ? first && second : first === second;
      if (!valid) wrong.push(row);
    }
    const pair = answerFor(board.roster, board.query, links);
    models.push({mask, table, assignments, links, wrong, truth, pair, factHolds});
  }
  return models;
}

function renamed(value, names) {
  if (typeof value === 'string') return value.replace(/[a-zA-Z]+/g, word => names.get(word) ?? word);
  if (Array.isArray(value)) return value.map(nested => renamed(nested, names));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([field, nested]) => [field, renamed(nested, names)]));
  }
  return value;
}

function checkCombinedReports(board, worlds, solution, witnesses, record) {
  const {incidents, reports} = board;
  const nonlinear = witnesses.filter(row => {
    if (reports[row].claim.kind !== 'link') return false;
    const influence = incidents.filter((_, bit) => worlds.some(w =>
      w.wrong.includes(row) !== worlds[w.mask ^ (1 << bit)].wrong.includes(row)));
    const claimCount = worlds.filter(w => w.truth[row].claim).length;
    return influence.length === 3 && [16, 48].includes(claimCount);
  });
  assert.ok(nonlinear.length >= 2, 'Expected two genuine three-incident dependencies');
  // Only carry facts about individual roles from one deduction to another.
  // Carrying the entire set of possibilities here would silently combine
  // every witness, even in the supposedly one-report test.
  function learnKnown(pool, known) {
    assert.ok(pool.length);
    for (let bit = 0; bit < incidents.length; bit++) {
      const flag = 1 << bit;
      if (pool.every(w => ((w.mask ^ solution.mask) & flag) === 0)) known |= flag;
    }
    return known;
  }
  function closure(initial, groups) {
    let known = initial;
    for (;;) {
      const prior = known;
      const eligible = worlds.filter(w => ((w.mask ^ solution.mask) & known) === 0);
      for (const group of groups) {
        known = learnKnown(eligible.filter(w => group.every(r => !w.wrong.includes(r))), known);
      }
      if (known === prior) return known;
    }
  }
  const initial = learnKnown(worlds.filter(w => !w.wrong.includes(record)), 0);
  const singles = witnesses.map(index => [index]);
  const stuck = closure(initial, singles);
  assert.notEqual(stuck, 2 ** incidents.length - 1, 'Single-witness deductions solved the entire case');
  const pairs = witnesses.flatMap((x, i) => witnesses.slice(i + 1).map(y => [x, y]));
  assert.equal(closure(stuck, [...singles, ...pairs]), 2 ** incidents.length - 1);
}

function checkReportEdits(board, worlds, solution, prior, possibleNetworkPairs) {
  const {incidents, reports, roster} = board;
  const validPairs = worlds.filter(w => w.pair.length === 2 && key(w.pair) !== prior);
  const involved = new Set(), roleWords = new Set();
  let changedEndpoint = false;
  function referent(selector, world) {
    const s = incidents.find(s => s.id === selector.incident);
    const member = s.members.find(n => world.table.get(s.id + '/' + n).role === selector.role);
    return selector.end === 'actor' ? member : world.table.get(s.id + '/' + member).contact;
  }
  for (const row of reports.keys()) {
    const allowed = validPairs.filter(w => w.wrong.every(bad => bad === row));
    assert.deepEqual(new Set(possibleNetworkPairs(board, row).map(key)), new Set(allowed.map(w => key(w.pair))));
    const rivals = allowed.filter(w => w.pair.every(name => !solution.pair.includes(name)));
    assert.ok(rivals.length, 'An assigned target survives without report ' + row);
    for (const rival of rivals) {
      // This rival fails exactly one row. Changing the truth of a witness's
      // subject or claim repairs that row. For a record both facts must hold.
      const report = reports[row];
      for (const field of ['source', 'claim']) {
        const fact = report[field];
        if (!fact) continue;
        const repairsRow = replacement => {
          const other = field === 'source' ? report.claim : report.source;
          const first = rival.factHolds(replacement), second = !other || rival.factHolds(other);
          return report.kind === 'witness' ? first === second : first && second;
        };
        if (fact.kind !== 'link') {
          if (repairsRow({...fact, role: opposite[fact.role]})) {
            involved.add(fact.actor).add(fact.contact);
            roleWords.add(fact.role);
          }
          continue;
        }
        for (const side of ['left', 'right']) {
          const term = fact[side];
          for (const edited of [
            {...term, role: opposite[term.role]},
            {...term, end: term.end === 'actor' ? 'contact' : 'actor'}
          ]) {
            if (!repairsRow({...fact, [side]: edited})) continue;
            roleWords.add(term.role);
            involved.add(referent(term, solution)).add(referent(term, rival)).add(referent(edited, rival));
            changedEndpoint ||= term.end !== edited.end;
          }
        }
      }
    }
  }
  assert.deepEqual(involved, new Set(roster));
  assert.deepEqual(roleWords, new Set(Object.keys(opposite)));
  assert.ok(changedEndpoint, 'Confusing an actor with their own contact was never consequential');
}

test('current named evidence determines the full role map and the two marked people', async () => {
  const {makeNetworkTrial, solveNetworkTrial, caseRoles, possibleNetworkPairs} =
    await import('../friend-or-foe/network-case.js');
  const random = seeded(98291);
  const distinctPairs = new Set();
  const orders = new Set();
  let sawAllGenuine = false, sawAllImpostors = false, sawMixed = false;
  let previous, sometimesRepeats = false;
  for (let i = 0; i < 1100; i++) {
    const trial = makeNetworkTrial(previous, random);
    const board = trial.evidence ?? trial;
    const {roster, incidents, reports} = board;
    assert.equal(new Set(roster).size, 10);
    assert.equal(incidents.length, 6);
    const contexts = new Map();
    for (const incident of incidents) {
      assert.ok([...incident.members, ...incident.contacts].every(name => roster.includes(name)));
      if (incident.type !== 'dispute') assert.ok(roster.includes(incident.anchor));
      assert.equal(new Set(incident.members).size, 2);
      assert.equal(new Set([...incident.members, ...incident.contacts]).size, 4);
      incident.members.forEach((name, index) => {
        const earlier = contexts.get(name), contact = incident.contacts[index];
        if (earlier) {
          assert.notEqual(earlier.contact, contact);
          assert.notEqual(earlier.type, incident.type);
        }
        contexts.set(name, {contact, type: incident.type});
      });
    }

    const worlds = modelsFor(board);
    const exact = worlds.filter(world => !world.wrong.length);
    assert.equal(exact.length, 1, 'Reports left more than one complete account');
    const solution = exact[0];
    const rows = [...reports.keys()];
    const records = rows.filter(row => reports[row].kind === 'record');
    const witnesses = rows.filter(row => reports[row].kind === 'witness');
    assert.equal(records.length, 1);
    const credentials = witnesses.map(row => solution.truth[row].source);
    sawAllGenuine ||= credentials.every(Boolean);
    sawAllImpostors ||= credentials.every(genuine => !genuine);
    sawMixed ||= new Set(credentials).size === 2;
    checkCombinedReports(board, worlds, solution, witnesses, records[0]);
    assert.equal(new Set(solution.pair).size, 2);
    assert.equal(key(solution.pair), key(trial.pair));
    assert.equal(worlds.filter(world => key(world.pair) === key(solution.pair)).length, 1,
      'The submitted pair can represent two different full rosters');
    const roles = caseRoles(board);
    for (const role of Object.keys(opposite)) {
      assert.equal(new Set(roles[role]).size, 2);
      assert.deepEqual([...roles[role]].sort(), solution.assignments[role].sort());
    }
    const occupations = Object.values(roles).flat();
    assert.deepEqual(roster.map(n => occupations.filter(actor => n === actor).length).sort(),
      [1, 1, 1, 1, 1, 1, 1, 1, 2, 2]);

    const prior = key(previous?.pair ?? []);
    checkReportEdits(board, worlds, solution, prior, possibleNetworkPairs);

    if (i % 20 === 0) {
      const names = new Map(roster.map((name, index) => [name, roster[(index + 3) % roster.length]]));
      const permuted = renamed(board, names);
      permuted.reports.reverse();
      // The player sees two possible roles per incident. Which one the engine
      // happens to store first is an arbitrary convention for numbering worlds.
      permuted.incidents = permuted.incidents.map(s => ({...s, role: opposite[s.role]}));
      assert.equal(key(solveNetworkTrial(permuted).pair), key(trial.pair.map(name => names.get(name))));
      // A witness whose credential AND statement are inverted supplies the
      // same evidence, regardless of whether that character appears honest.
      const invert = fact => fact.kind === 'link' ? {...fact, negated: !fact.negated} :
        {...fact, role: opposite[fact.role]};
      const index = witnesses[0];
      const changed = reports.map((r, pos) => pos === index ?
        {...r, source: invert(r.source), claim: invert(r.claim)} : r);
      assert.equal(key(solveNetworkTrial({...board, reports: changed}).pair), key(trial.pair));
    }
    assert.notEqual(key(trial.pair), prior);
    if (previous?.pair.some(name => trial.pair.includes(name))) sometimesRepeats = true;
    distinctPairs.add(key(trial.pair));
    orders.add(board.query);
    previous = trial;
  }
  assert.equal(distinctPairs.size, 45);
  assert.ok(orders.size >= 3);
  assert.ok(sometimesRepeats);
  assert.ok(sawAllGenuine && sawAllImpostors && sawMixed, 'Players could rely on an unprinted rule about witnesses');
});

test('named suppliers, challengers, observers, handlers and hosts yield directed answers', async () => {
  const {caseRoles, solveNetworkTrial} = await import('../friend-or-foe/network-case.js');
  const event = (id, role, members, contacts, anchor) => ({id, role, members, contacts, anchor});
  const incidents = [
    event('D1', 'friend', ['Samp', 'Ivo'], ['Mira', 'Tess'], 'Pia'),
    event('D2', 'foe', ['Luma', 'Mira'], ['Vale', 'Tess'], 'Samp'),
    event('I1', 'spy', ['Nia', 'Orin'], ['Mira', 'Sol'], 'Tess'),
    event('I2', 'double', ['Pia', 'Sol'], ['Ivo', 'Vale'], 'Nia'),
    event('H1', 'civilian', ['Tess', 'Vale'], ['Luma', 'Samp'], 'Mira'),
    event('H2', 'foreigner', ['Samp', 'Mira'], ['Orin', 'Pia'], 'Sol')
  ];
  const truths = incidents.map(scene => ({
    actor: scene.members[0], incident: scene.id, contact: scene.contacts[0],
    role: scene.role, anchor: scene.anchor
  }));
  const reports = [0, 2, 4].map(i => ({kind: 'record', source: truths[i], claim: truths[i + 1]}));
  const board = {roster: [...new Set(incidents.flatMap(scene => scene.members))], incidents, reports};
  assert.deepEqual(caseRoles(board), {
    friend: ['Samp', 'Mira'], foe: ['Ivo', 'Luma'], spy: ['Nia', 'Sol'],
    double: ['Orin', 'Pia'], civilian: ['Tess', 'Mira'], foreigner: ['Vale', 'Samp']
  });
  assert.deepEqual(solveNetworkTrial({...board, query: 'receive'}).pair, ['Sol', 'Tess']);
  assert.deepEqual(solveNetworkTrial({...board, query: 'end'}).pair, ['Ivo', 'Vale']);
  // Nia observed Mira for Tess. The named people have different jobs in that
  // relationship; claiming she observed Tess for Mira contradicts the record.
  const swapped = reports.map((r, i) => i === 1 ? {
    ...r, source: {...r.source, contact: r.source.anchor, anchor: r.source.contact}
  } : r);
  assert.deepEqual(solveNetworkTrial({...board, query: 'receive', reports: swapped}).pair, []);
});

test('live dossier presents every public account without reading the solution', async t => {
  const {makeNetworkTrial} = await import('../friend-or-foe/network-case.js');
  const {renderNetwork} = await import('../friend-or-foe/network-view.js');
  class Element {
    constructor(tag, text = '') {
      this.tag = tag;
      this.textContent = text;
      this.children = [];
    }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    setAttribute() {}
    descendants() { return [this, ...this.children.flatMap(n => n.descendants())]; }
    elements(cls) { return this.descendants().filter(n => n.className?.split(' ').includes(cls)); }
  }
  const saved = global.document;
  t.after(() => { if (saved) global.document = saved; else delete global.document; });
  global.document = {
    createElement: tag => new Element(tag),
    createTextNode: text => new Element('#text', text)
  };
  const random = seeded(77432);
  let previous;
  for (let i = 0; i < 15; i++) {
    const current = makeNetworkTrial(previous, random);
    previous = current;
    const visible = current.evidence;
    const guard = new Proxy(visible, {get(obj, key) {
      assert.ok(['roster', 'incidents', 'reports', 'order', 'query'].includes(key),
        'Live board read a nonpublic field: ' + String(key));
      return obj[key];
    }});
    const root = new Element('section');
    renderNetwork(root, guard);
    assert.ok(!root.descendants().some(n => ['button', 'a', 'input', 'select'].includes(n.tag)));
    const sceneNames = visible.incidents.flatMap(s => s.members).sort();
    assert.deepEqual(root.elements('nw-person').map(n => n.children[0].textContent).sort(), sceneNames);
    const visibleFacts = root.elements('nw-fact').map(n => n.children.at(-1).textContent);
    const requiredFacts = visible.reports.flatMap(r =>
      r.kind === 'record' && r.source ? [r.source.short, r.claim.short] : [r.claim.short]);
    assert.deepEqual(visibleFacts.sort(), requiredFacts.sort());
    const actors = visible.reports.filter(r => r.kind === 'witness').map(r => r.source.actor);
    assert.deepEqual(root.elements('nw-who').map(n => n.children[0].textContent).sort(), actors.sort());
  }
});

test('every published layout supports disjoint answers with the same unsigned reports and voice choices', async () => {
  const {networkFrames} = await import('../friend-or-foe/network-data.js');
  const {materializeLayout, orderIds} = await import('../friend-or-foe/network-case.js');
  const roleOrder = ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'];
  // Erase only the negation marker on cross-case claims. Ground assertion,
  // source, credential, role, case, and both directed endpoints remain.
  function unsignedFact(code) {
    return Array.isArray(code) ? code.slice(0, 2) : code;
  }
  function structure(rows) {
    return rows.map(([kind, src, claim]) =>
      [kind, unsignedFact(src), unsignedFact(claim)]);
  }
  for (const [code, orderIndex, ...versions] of networkFrames) {
    assert.equal(versions.length, 2);
    const [[first, rows, voices], [second, alternate, otherVoices]] = versions;
    assert.ok(voices > 0);
    assert.equal(voices, otherVoices, 'A witness voice can identify which answer was dealt');
    assert.deepEqual(structure(rows), structure(alternate), 'Ground evidence, credential or named relationship changed');
    const {incidents, roster} = materializeLayout(code);
    const worlds = Array.from({length: 64}, (_, i) => i);
    function slot(world, value) {
      const index = Math.floor(value / 12), scene = incidents[index];
      const role = roleOrder[(value >> 1) % 6];
      return ((world >> index) & 1) ^ Number(role !== scene.role);
    }
    function referent(world, value) {
      const scene = incidents[Math.floor(value / 12)];
      return (value % 2 ? scene.contacts : scene.members)[slot(world, value)];
    }
    function holds(world, fact) {
      if (fact === -1) return true;
      if (!Array.isArray(fact)) return slot(world, fact) === fact % 2;
      const [left, right, negated] = fact;
      return (referent(world, left) === referent(world, right)) !== Boolean(negated);
    }
    const pairs = versions.map(([answer, clues]) => {
      const fits = worlds.filter(w => clues.every(([witness, source, claim]) => {
        const a = holds(w, source), b = holds(w, claim);
        return witness ? a === b : a && b;
      }));
      assert.deepEqual(fits, [answer]);
      const links = incidents.flatMap((s, i) => incidentRelations(s, (answer >> i) & 1));
      return answerFor(roster, orderIds[orderIndex], links);
    });
    assert.notEqual(first, second);
    assert.ok(pairs.every(p => p.length === 2));
    assert.equal(new Set(pairs.flat()).size, 4, 'The other set of signed testimony identified a shared target');
  }
});
