const test = require('node:test');
const assert = require('node:assert/strict');

const roles = ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'];
const names = ['Samp', 'Ivo', 'Luma', 'Mira', 'Nia', 'Orin', 'Pia', 'Sol', 'Tess', 'Vale'];
const levels = ['very-easy', 'easy', 'medium', 'hard'];
const unique = list => [...new Set(list)];
const sorted = list => [...list].sort();
const key = list => sorted(list).join('/');
function seeded(state) {
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

// Interpret the order person by person. The production evaluator builds
// matching subgraphs; this oracle also evaluates people on the losing side.
function readOrder(id, records, start, variant = {}) {
  const links = records.filter(edge => edge.from !== edge.to)
    .map(edge => variant.reverse ? {from: edge.to, to: edge.from, role: edge.role} : edge);
  const people = unique(links.flatMap(edge => [edge.from, edge.to]));
  const label = (from, to) => links.filter(edge => edge.from === from && edge.to === to).map(edge => edge.role);
  const direct = (from, to) => label(from, to).length > 0;
  const via = (from, to) => from === to ? [] : people.filter(person =>
    person !== from && person !== to && direct(from, person) && direct(person, to));
  const differentLabels = (x, y) => x.some(a => y.some(b => a !== b));
  const mixedPath = (from, to) => via(from, to).some(mid => differentLabels(label(from, mid), label(mid, to)));
  const reach = person => people.filter(other => mixedPath(person, other)).length;
  const shortcut = (from, to) => via(from, to).some(mid => differentLabels(label(from, mid), label(from, to)));
  return sorted(people.filter(person => {
    switch (id) {
      case 'return-link':
        return people.some(other => label(person, other).some(a => label(other, person).some(b => b !== a)));
      case 'shortcut':
        return people.some(other => shortcut(person, other) || shortcut(other, person));
      case 'shared-source':
        return person !== start && people.some(other => differentLabels(label(other, person), label(other, start)));
      case 'shared-contact':
        return !direct(person, start) && mixedPath(person, start);
      case 'relay':
        return links.some(b => b.to === person && links.some(a =>
          a.to === b.from && a.from !== person && a.role === b.role));
      case 'split-cover': {
        const groups = {spy: ['spy', 'double'], friend: ['friend', 'foe'], civilian: ['civilian', 'foreigner']};
        const isIntel = edge => groups[variant.focus || 'spy'].includes(edge.role);
        const sent = links.filter(edge => edge.from === person);
        const got = links.filter(edge => edge.to === person);
        return sent.length > 0 && got.length > 0 && [true, false].some(cover =>
          sent.every(edge => isIntel(edge) === cover) && got.every(edge => isIntel(edge) !== cover));
      }
      case 'corroboration':
        return roles.some(role => unique(links.filter(edge => edge.role === role && edge.to === person).map(edge => edge.from)).length >= 2);
      case 'silent-contact':
        return !links.some(edge => edge.from === person) && links.some(a => a.to === person &&
          links.some(b => b.to === person && a.from !== b.from && a.role !== b.role));
      case 'boundary': {
        const groups = [['friend', 'foe'], ['spy', 'double'], ['civilian', 'foreigner']];
        return groups.some(incoming => links.some(edge => incoming.includes(edge.role) && edge.to === person) &&
          groups.filter(outgoing => outgoing !== incoming).every(outgoing =>
            links.some(edge => outgoing.includes(edge.role) && edge.from === person)));
      }
      case 'bypass':
        return reach(person) > 0 && reach(person) === Math.max(...people.map(reach));
      default:
        throw new Error('Missing test interpretation for ' + id);
    }
  }));
}

function compatibleWorlds(evidence) {
  const disputed = evidence.rows.filter(row => row.disputed).map(row => row.role);
  return Array.from({length: 2 ** disputed.length}, (_, mask) => {
    const records = evidence.rows.flatMap(({role, links, alias}) => {
      const slot = disputed.indexOf(role);
      const reverse = slot >= 0 && Boolean(mask & (1 << slot));
      const rename = value => value === alias[0] ? alias[1] : value === alias[1] ? alias[0] : value;
      return links.map(({from, to}) => {
        if (!reverse) return {role, from, to};
        if (alias) return {role, from: rename(from), to: rename(to)};
        return {role, from: to, to: from};
      });
    });
    const trueLink = claim => records.some(edge => claim.role === edge.role && claim.from === edge.from && claim.to === edge.to);
    const holds = evidence.reports.map(report => report.left === null ? trueLink(report.right) === report.same :
      (trueLink(report.left) === trueLink(report.right)) === report.same);
    return {records, holds};
  });
}

function explainsShortlist(evidence, records, answer) {
  const remaining = new Set(evidence.leads.filter(name => !answer.includes(name)));
  function check(alternate) {
    for (const name of readOrder(evidence.family, alternate, evidence.anchor, evidence.variant)) remaining.delete(name);
    return !remaining.size;
  }
  for (const [index, edge] of records.entries()) {
    const changed = records.slice();
    changed[index] = {...edge, from: edge.to, to: edge.from};
    if (check(changed)) return true;
    for (const role of roles.filter(role => role !== edge.role)) {
      changed[index] = {...edge, role};
      if (check(changed)) return true;
    }
  }
  for (const role of roles) {
    const row = records.filter(edge => edge.role === role);
    const others = records.filter(edge => edge.role !== role);
    if (check([...others, ...row.map(edge => ({...edge, from: edge.to, to: edge.from}))])) return true;
    const used = unique(row.flatMap(edge => [edge.from, edge.to]));
    for (const before of used) {
      for (const after of names.filter(name => !used.includes(name))) {
        const renamed = row.map(edge => ({role, from: edge.from === before ? after : edge.from,
          to: edge.to === before ? after : edge.to}));
        if (check([...others, ...renamed])) return true;
      }
    }
  }
  return false;
}

test('each case order agrees with an independent interpretation on mixed, duplicate and reversed contacts', async () => {
  const {evaluatePattern, patterns} = await import('../friend-or-foe/case-patterns.js');
  assert.equal(new Set(patterns.map(pattern => pattern.id)).size, 10);
  const draw = seeded(124933);
  const pick = options => options[Math.floor(draw() * options.length)];
  const cast = names.slice(0, 6);
  for (let i = 0; i < 65; i++) {
    const edges = Array.from({length: 18}, () => ({from: pick(cast), to: pick(cast), role: pick(roles)}));
    edges.push({...edges[0]});
    for (const pattern of patterns) {
      const start = pick(cast);
      assert.deepEqual(sorted(evaluatePattern(pattern.id, edges, start).pair), readOrder(pattern.id, edges, start),
        pattern.id + ' on network ' + i);
      const variant = {reverse: !['split-cover','return-link'].includes(pattern.id) && i % 2 === 0,
        focus: pattern.id === 'split-cover' ? ['spy','friend','civilian'][i % 3] : 'spy'};
      assert.deepEqual(sorted(evaluatePattern(pattern.id, edges, start, false, variant).pair),
        readOrder(pattern.id, edges, start, variant), pattern.id + ' alternate briefing on network ' + i);
    }
  }
});

test('changing a role on the same arrows can change the answer in each of the ten missions', async () => {
  const {evaluatePattern} = await import('../friend-or-foe/case-patterns.js');
  // Each fixture changes exactly one role. Directions, actor names and the
  // shape of the graph are identical in the two readings.
  const examples = [
    ['return-link', ['A>B:friend', 'B>A:spy'], 'friend', ['A','B'], []],
    ['shortcut', ['A>B:friend', 'B>C:civilian', 'A>C:spy'], 'friend', ['A','C'], []],
    ['shared-source', ['B>A:friend', 'B>C:spy'], 'friend', ['C'], []],
    ['shared-contact', ['C>B:friend', 'B>A:spy'], 'friend', ['C'], []],
    ['relay', ['A>B:friend', 'B>C:friend'], 'foe', ['C'], []],
    ['split-cover', ['A>B:friend', 'B>C:double'], 'civilian', ['B'], []],
    ['corroboration', ['A>B:friend', 'C>B:friend'], 'foreigner', ['B'], []],
    ['silent-contact', ['A>B:spy', 'C>B:friend'], 'spy', ['B'], []],
    ['boundary', ['A>B:friend', 'B>C:spy', 'B>D:civilian'], 'double', ['B'], []],
    ['bypass', ['A>B:friend', 'B>C:spy'], 'friend', ['A'], []]
  ];
  for (const [id, contacts, changedRole, first, second] of examples) {
    const records = contacts.map(contact => {
      const [from, to, role] = contact.split(/[>:]/);
      return {from, to, role};
    });
    assert.deepEqual(sorted(evaluatePattern(id, records, 'A').pair), first, id);
    records.at(-1).role = changedRole;
    assert.deepEqual(sorted(evaluatePattern(id, records, 'A').pair), second, id);
  }
});

test('every tier deals all ten orders once per block and the public record uniquely determines both names', async () => {
  const {makeCaseTrial, solveCaseEvidence} = await import('../friend-or-foe/case-decks.js');
  const {patterns, variantsFor} = await import('../friend-or-foe/case-patterns.js');
  const {caseCatalog} = await import('../friend-or-foe/case-catalog.js');
  const counts = Object.values(caseCatalog).map(items => items.length);
  assert.ok(Math.min(...counts) >= 100, 'A 1,000-trial run needs 100 layouts per family');
  const blocks = process.env.FRIEND_OR_FOE_FULL_DECK === '1' ? Math.min(...counts) : 3;
  for (const level of levels) {
    const draw = seeded(11607 + levels.indexOf(level));
    const seenLayouts = new Map();
    const seenVariants = new Map();
    let previous;
    for (let block = 0; block < blocks; block++) {
      const orders = [];
      for (let i = 0; i < 10; i++) {
        const trial = makeCaseTrial(level, previous, draw);
        const e = trial.evidence;
        const context = level + ' / ' + e.family;
        const held = trial.deck.boards[e.family];
        const layout = held.order[held.index];
        if (!seenLayouts.has(e.family)) seenLayouts.set(e.family, new Set());
        assert.ok(!seenLayouts.get(e.family).has(layout), 'Layout repeated: ' + context);
        seenLayouts.get(e.family).add(layout);
        const options = variantsFor(e.family).length;
        if (block % options === 0) seenVariants.set(e.family, new Set());
        const variant = JSON.stringify(e.variant);
        assert.ok(!seenVariants.get(e.family).has(variant), 'Viewpoint repeated inside its deck: ' + context);
        seenVariants.get(e.family).add(variant);
        assert.doesNotMatch(e.order, /\{name\}/, context);
        assert.deepEqual(sorted(e.roster), sorted(names), context);
        assert.deepEqual(sorted(e.rows.map(row => row.role)), sorted(roles), context);
        const listedNames = e.rows.flatMap(row => [...(row.alias || []), ...row.links.flatMap(link => [link.from, link.to])]);
        assert.deepEqual(sorted(unique(listedNames)), sorted(names), context);
        assert.ok(e.rows.every(row => row.links.length === 2), context);
        if (previous) {
          assert.notEqual(e.family, previous.evidence.family, 'Repeated mission at a block boundary');
          assert.notEqual(key(trial.pair), key(previous.pair), 'Previous answer repeated');
        }
        const readings = compatibleWorlds(e);
        const worlds = readings.filter(world => world.holds.every(Boolean));
        assert.equal(worlds.length, 1, 'Evidence must resolve every disputed assignment: ' + context);
        assert.deepEqual(sorted(unique(worlds[0].records.flatMap(edge => [edge.from, edge.to]))), sorted(names), context);
        const answer = readOrder(e.family, worlds[0].records, e.anchor, e.variant);
        assert.equal(answer.length, 2, context);
        assert.deepEqual(sorted(trial.pair), answer, context);
        assert.deepEqual(sorted(solveCaseEvidence(e).pair), answer, context);
        const uncertain = e.rows.filter(row => row.disputed).length;
        assert.equal(uncertain, {'very-easy': 0, easy: 1, medium: 3, hard: 6}[level], context);
        assert.equal(e.reports.length, uncertain, context);
        if (level === 'easy') {
          const [report] = e.reports;
          assert.ok(report.left && [report.left, report.right].some(claim =>
            e.rows.some(row => row.role === claim.role && !row.disputed)), context);
        }
        for (let omit = 0; omit < e.reports.length; omit++) {
          const alternatives = readings.filter(world =>
            !world.holds[omit] && world.holds.every((value, index) => value || index === omit));
          assert.ok(alternatives.some(world => {
            const other = readOrder(e.family, world.records, e.anchor, e.variant);
            const involved = unique(world.records.flatMap(edge => [edge.from, edge.to]));
            return involved.length === names.length && other.length === 2 && key(other) !== key(answer) &&
              (!previous || key(other) !== key(previous.pair));
          }), 'Dropping report ' + omit + ' should leave a different legal pair: ' + context);
        }
        if (level === 'very-easy') {
          assert.equal(unique(e.leads).length, 4, context);
          assert.ok(answer.every(person => e.leads.includes(person)), context);
          if (block === 0) assert.ok(explainsShortlist(e, worlds[0].records, answer),
            'Every shortlist decoy must satisfy a plausible one-error reading: ' + context);
        }
        orders.push(e.family);
        previous = trial;
      }
      assert.deepEqual(sorted(orders), sorted(patterns.map(pattern => pattern.id)), level);
    }
  }
});

test('the live briefing renders the public records, questions and difficulty-specific evidence', async t => {
  const {makeCaseTrial} = await import('../friend-or-foe/case-decks.js');
  const {renderCaseEvidence, renderCaseGuide, renderCaseResult} = await import('../friend-or-foe/case-view.js');
  class Node {
    constructor(tag, text = '') { this.tag = tag; this.textContent = text; this.children = []; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this[name] = value; }
    walk() { return [this, ...this.children.flatMap(child => child.walk())]; }
  }
  const previous = global.document;
  global.document = {createElement: tag => new Node(tag), createTextNode: text => new Node('#text', text)};
  t.after(() => { if (previous === undefined) delete global.document; else global.document = previous; });
  for (const level of levels) {
    const trial = makeCaseTrial(level, null, seeded(43252));
    const root = new Node('div');
    renderCaseEvidence(root, trial.evidence);
    const nodes = root.walk();
    assert.ok(nodes.some(node => node.textContent === trial.evidence.order));
    for (const row of trial.evidence.rows) {
      assert.ok(nodes.some(node => node.className?.split(' ').includes('case-' + row.role)));
      if (row.alias) {
        assert.ok(nodes.some(node => node.className === 'case-swap' &&
          row.alias.every(name => node.textContent.includes(name))), 'The possible exchange must be visible');
      }
    }
    assert.equal(nodes.filter(node => node.className === 'case-report').length, trial.evidence.reports.length);
    const controls = nodes.filter(node => ['button', 'input', 'select'].includes(node.tag));
    if (level === 'very-easy') {
      assert.equal(controls.length, 1);
      assert.equal(controls[0].id, 'shortlist-toggle');
      assert.equal(controls[0].type, 'checkbox');
    } else {
      assert.equal(controls.length, 0);
    }
    renderCaseGuide(root, level);
    assert.ok(root.walk().some(node => /intelligence officer/i.test(node.textContent)));
    renderCaseResult(root, trial);
    assert.ok(root.walk().some(node => trial.pair.every(person => node.textContent.includes(person))));
  }
});

test('Very Easy places the Shortlist checkbox in the gameplay problem view and toggles the four leads live', async t => {
  const {readFileSync} = require('node:fs');
  const {join} = require('node:path');
  const {makeCaseTrial, solveCaseEvidence} = await import('../friend-or-foe/case-decks.js');
  const {renderCaseEvidence, renderCaseGuide} = await import('../friend-or-foe/case-view.js');
  const html = readFileSync(join(__dirname, '../friend-or-foe/index.html'), 'utf8');
  const form = html.match(/<form\b[^>]*\bid="run-form"[^>]*>([\s\S]*?)<\/form>/)?.[1] || '';
  assert.doesNotMatch(form, /type="checkbox"/, 'Pre-game setup form should not contain the shortlist checkbox');

  class Node {
    constructor(tag, text = '') { this.tag = tag; this.textContent = text; this.children = []; this.listeners = {}; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this[name] = value; }
    addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
    dispatch(type) { for (const fn of this.listeners[type] || []) fn(); }
    walk() { return [this, ...this.children.flatMap(child => child.walk())]; }
  }
  const previous = global.document;
  global.document = {createElement: tag => new Node(tag), createTextNode: text => new Node('#text', text)};
  t.after(() => { if (previous === undefined) delete global.document; else global.document = previous; });

  const trial = makeCaseTrial('very-easy', null, seeded(91827));
  assert.equal(trial.evidence.leads.length, 4);
  assert.equal(trial.evidence.rows.filter(row => row.disputed).length, 0);
  assert.deepEqual(sorted(solveCaseEvidence(trial.evidence).pair), sorted(trial.pair));

  const root = new Node('div');
  const states = [];
  renderCaseEvidence(root, trial.evidence, {shortlist: true, onShortlistChange: enabled => states.push(enabled)});
  const checkbox = root.walk().find(node => node.id === 'shortlist-toggle');
  const namesNode = root.walk().find(node => node.className === 'case-leads-names');
  assert.ok(checkbox && checkbox.type === 'checkbox' && checkbox.checked === true);
  assert.ok(namesNode && namesNode.hidden === false);
  assert.ok(trial.evidence.leads.every(name => namesNode.textContent.includes(name)));

  // Turning shortlist off hides the four lead names immediately
  checkbox.checked = false;
  checkbox.dispatch('change');
  assert.equal(namesNode.hidden, true);
  assert.deepEqual(states, [false]);

  // Turning shortlist back on reveals the four lead names immediately
  checkbox.checked = true;
  checkbox.dispatch('change');
  assert.equal(namesNode.hidden, false);
  assert.deepEqual(states, [false, true]);

  // Rendering initially with shortlist off starts unchecked and hidden
  renderCaseEvidence(root, trial.evidence, {shortlist: false});
  const offCheckbox = root.walk().find(node => node.id === 'shortlist-toggle');
  const offNames = root.walk().find(node => node.className === 'case-leads-names');
  assert.equal(offCheckbox.checked, false);
  assert.equal(offNames.hidden, true);

  renderCaseGuide(root, 'very-easy', {shortlist: true});
  assert.ok(root.walk().some(node => node.textContent === 'Use the shortlist'));

  renderCaseGuide(root, 'very-easy', {shortlist: false});
  assert.ok(!root.walk().some(node => node.textContent === 'Use the shortlist'));
  assert.ok(root.walk().some(node => node.textContent === 'Check the whole file'));
});

