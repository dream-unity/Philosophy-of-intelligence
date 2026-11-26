const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');

function seeded(state) {
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

test('difficulty is a single pregame choice next to the existing run settings', () => {
  const html = readFileSync(join(__dirname, '../friend-or-foe/index.html'), 'utf8');
  const form = html.match(/<form\b[^>]*\bid="run-form"[^>]*>([\s\S]*?)<\/form>/)?.[1];
  assert.ok(form, 'Game setup is missing');
  const inputs = form.match(/<input\b[^>]*>/g) ?? [];
  const levels = inputs.filter(input => /\bname="difficulty"/.test(input));
  assert.deepEqual(levels.map(input => input.match(/\bvalue="([^"]+)"/)?.[1]), ['zero-to-hero', 'super-super-easy', 'super-easy', 'very-easy', 'easy', 'medium', 'hard']);
  assert.ok(levels.every(input => /\btype="radio"/.test(input)));
  for (const input of levels) {
    const label = input.match(/aria-labelledby="([^"]+)"/)?.[1];
    const description = input.match(/aria-describedby="([^"]+)"/)?.[1];
    assert.ok(label && form.includes('id="' + label + '"'), 'Each choice needs an accessible name');
    assert.ok(description && form.includes('id="' + description + '"'), 'Each choice needs a difficulty description');
  }
  const initial = levels.filter(input => /\bchecked(?=[\s/>])/.test(input));
  assert.equal(initial.length, 1);
  assert.match(initial[0], /\bvalue="zero-to-hero"/);
  assert.match(form, /<fieldset[\s>]/);
  assert.match(form, /<legend\b[^>]*>[^<]*difficulty[^<]*<\/legend>/i);
  assert.ok(inputs.some(input => /\bid="count"/.test(input) && /\bmin="20"/.test(input) && /\bmax="1000"/.test(input)));
  assert.ok(inputs.some(input => /\bid="master-speed"/.test(input) && /\btype="range"/.test(input) &&
    /\bmin="0.25"/.test(input) && /\bmax="3"/.test(input) && /\bstep="0.25"/.test(input)));
  assert.match(form, /<button\b[^>]*\btype="submit"/);
});

test('Very Easy requires two visible relationships from one named start throughout a full run', async () => {
  const {makeLevelTrial, solveLevelEvidence} = await import('../friend-or-foe/network-levels.js');
  const {ArcadeRun} = await import('../friend-or-foe/arcade-range.js');
  const draw = seeded(71023);
  const orders = new Set();
  const pairs = new Set();
  let previous;
  let previousTargets = [];
  for (let index = 0; index < 1000; index++) {
    const trial = makeLevelTrial('very-easy', previous, draw);
    const {evidence} = trial;
    const [premise, question] = evidence.order.split('. ');
    const incoming = premise.startsWith('Two people ');
    const findSender = !question.includes('did they');
    const start = incoming ? premise.split(' ').at(-1) : premise.split(' ')[0];
    const firstVerb = premise.includes('helped') ? 'helped' : 'warned';
    const secondVerb = question.includes('help') ? 'helped' : 'warned';
    const [first, second] = evidence.steps;
    assert.equal(first.verb, firstVerb);
    assert.equal(second.verb, secondVerb);
    assert.notEqual(firstVerb, secondVerb);
    assert.ok(trial.roster.includes(start));
    assert.ok(trial.roster.includes('Samp'));
    assert.equal(trial.number, index + 1);
    orders.add([incoming, findSender, firstVerb].join('/'));
    const source = incoming ? 'to' : 'from';
    const via = incoming ? 'from' : 'to';
    const middle = first.links.filter(link => link[source] === start).map(link => link[via]);
    assert.equal(new Set(middle).size, 2);
    const secondVia = findSender ? 'to' : 'from';
    const end = findSender ? 'from' : 'to';
    assert.equal(new Set(second.links.map(link => link[end])).size, 4);
    const paths = second.links.filter(link => middle.includes(link[secondVia]));
    const answer = paths.map(link => link[end]).sort();
    assert.equal(new Set(answer).size, 2);
    assert.deepEqual(answer, trial.pair);
    assert.deepEqual(new Set(evidence.steps.flatMap(step => step.links.flatMap(link => [link.from, link.to]))), new Set(trial.roster));
    assert.equal(trial.proof.length, 2);
    // Alter one link pairing in either panel, preserving its names and counts.
    // A solver copying one panel would miss at least one of these changes.
    for (const panel of [0, 1]) {
      const alternate = structuredClone(evidence);
      const field = panel === 0 ? via : end;
      const links = alternate.steps[panel].links;
      const onTrail = link => panel === 0 ? link[source] === start : middle.includes(link[secondVia]);
      const yes = links.find(onTrail);
      const no = links.find(link => !onTrail(link));
      [yes[field], no[field]] = [no[field], yes[field]];
      const revised = solveLevelEvidence(alternate).pair;
      assert.equal(revised.length, 2);
      assert.equal(revised.filter(name => answer.includes(name)).length, 1);
    }
    const run = new ArcadeRun(trial.roster, trial.pair, previousTargets, draw);
    assert.equal(run.snapshot().active, 10);
    assert.equal(run.snapshot().bullets, 2);
    answer.forEach(name => run.fire(run.targets.find(target => target.name === name)));
    assert.equal(run.result().correct, true);
    pairs.add(answer.join('/'));
    if (previous) assert.notDeepEqual(answer, previous.pair);
    previous = trial;
    previousTargets = run.targets;
  }
  assert.equal(orders.size, 8);
  assert.equal(pairs.size, 45);
  for (const level of ['easy', 'medium', 'hard']) {
    const other = makeLevelTrial(level, previous, draw);
    assert.equal(other.number, 1);
    assert.deepEqual(new Set(other.roster), new Set(previous.roster));
    assert.equal(makeLevelTrial('very-easy', other, draw).number, 1);
  }
});

test('Hard deals the original trials and keeps their answers and explanations', async () => {
  const {makeLevelTrial} = await import('../friend-or-foe/network-levels.js');
  const {makeNetworkTrial} = await import('../friend-or-foe/network-case.js');
  const originalRandom = seeded(8621);
  const hardRandom = seeded(8621);
  let expected, actual;
  for (let index = 0; index < 30; index++) {
    expected = makeNetworkTrial(expected, originalRandom);
    actual = makeLevelTrial('hard', actual, hardRandom);
    assert.deepEqual(actual.evidence, expected.evidence);
    assert.deepEqual(actual.pair, expected.pair);
    assert.deepEqual(actual.proof, expected.proof);
    assert.deepEqual(actual.roster, expected.roster);
    assert.equal(actual.number, index + 1);
  }
});

const pairKey = names => [...names].sort().join('/');

// An invariant under any renaming of all ten people. Equal fingerprints can
// describe different layouts; unequal fingerprints always prove variety.
function relationshipFingerprint(evidence) {
  const parts = new Map(evidence.roster.map(name => [name, []]));
  for (const row of evidence.rows) {
    for (const link of row.links) {
      parts.get(link.from).push('out-' + row.role);
      parts.get(link.to).push('in-' + row.role);
    }
  }
  return [...parts.values()].map(roles => roles.sort().join(',')).sort().join('|');
}

// Interpret the two witnesses against the facts the player can see. Pairing
// senders with recipients by their hidden array positions would leak a Medium
// solution, so read those columns separately until a witness is selected.
function visibleArrows(rows, account) {
  return rows.flatMap(row => {
    if (!row.disputed) return row.links.map(link => ({...link, channel: row.channel}));
    assert.ok(account);
    const senders = row.links.map(link => link.from);
    const recipients = row.links.map(link => link.to);
    assert.ok(senders.includes(account.from) && recipients.includes(account.to));
    assert.equal(new Set(senders).size, 2);
    assert.equal(new Set(recipients).size, 2);
    return [
      {from: account.from, to: account.to, channel: row.channel},
      {from: senders.find(name => name !== account.from),
        to: recipients.find(name => name !== account.to), channel: row.channel}
    ];
  });
}

function readOrder(evidence, account) {
  const arrows = visibleArrows(evidence.rows, account);
  let paths = evidence.roster.map(name => [name]);
  for (const channel of evidence.steps) {
    const next = [];
    for (const path of paths) {
      for (const link of arrows) {
        if (link.channel === channel && link.from === path.at(-1) && !path.includes(link.to)) {
          next.push([...path, link.to]);
        }
      }
    }
    paths = next;
  }
  return [...new Set(paths.map(path => path[evidence.pick]))].sort();
}

test('visible evidence gives two unique names with two confirmed steps on Easy and a disputed third-step route on Medium', async () => {
  const {makeLevelTrial} = await import('../friend-or-foe/network-levels.js');
  const roles = ['civilian', 'double', 'foe', 'foreigner', 'friend', 'spy'];
  for (const level of ['easy', 'medium']) {
    const random = seeded(level === 'easy' ? 756902 : 153374);
    let previous;
    for (let index = 0; index < 160; index++) {
      const trial = makeLevelTrial(level, previous, random);
      const priorAnswer = previous ? pairKey(previous.pair) : '';
      previous = trial;
      const evidence = trial.evidence;
      assert.deepEqual(evidence.rows.map(row => row.role).sort(), roles);
      const usedNames = new Set();
      for (const row of evidence.rows) {
        assert.equal(row.links.length, 2);
        assert.ok(['aid', 'alert'].includes(row.channel));
        for (const {from, to} of row.links) {
          assert.notEqual(from, to);
          usedNames.add(from);
          usedNames.add(to);
        }
      }
      assert.deepEqual([...usedNames].sort(), [...trial.roster].sort());
      assert.equal(evidence.steps.length, level === 'easy' ? 2 : 3);
      assert.ok(Number.isInteger(evidence.pick) && evidence.pick >= 0 && evidence.pick <= evidence.steps.length);
      let trusted, other;
      const disputes = evidence.rows.filter(row => row.disputed);
      if (level === 'easy') {
        assert.equal(disputes.length, 0);
        assert.equal(evidence.reports.length, 0);
        assert.equal(evidence.trust, null);
      } else {
        assert.equal(disputes.length, 1);
        const witnessRecord = evidence.rows.find(row => row.role === evidence.trust.role);
        assert.ok(witnessRecord && !witnessRecord.disputed);
        const witnesses = witnessRecord.links.filter(link => link.to === evidence.trust.to);
        assert.equal(witnesses.length, 1, 'The confirmed relationship must identify exactly one witness');
        assert.equal(evidence.reports.length, 2);
        assert.notEqual(evidence.reports[0].speaker, evidence.reports[1].speaker);
        trusted = evidence.reports.find(report => report.speaker === witnesses[0].from);
        other = evidence.reports.find(report => report !== trusted);
        assert.ok(trusted && other);
      }
      const answer = readOrder(evidence, trusted);
      assert.equal(answer.length, 2);
      assert.deepEqual(answer, [...trial.pair].sort());
      for (const row of evidence.rows) {
        for (const end of ['from', 'to']) {
          assert.notEqual(pairKey(row.links.map(link => link[end])), pairKey(answer),
            'The two names were available by copying a single row');
        }
      }
      if (other) {
        const alternate = readOrder(evidence, other);
        assert.equal(alternate.length, 2, 'Knowing that two targets exist must not identify the correct witness');
        assert.ok(alternate.every(name => !answer.includes(name)), 'Either shot could be wrong without resolving the witnesses');
        assert.notEqual(pairKey(alternate), priorAnswer, 'Last round’s answer must not identify the truthful witness');
      }
    }
  }
});

test('Easy and Medium each sustain one maximum-length run with a rotating named pair', async () => {
  const {makeLevelTrial} = await import('../friend-or-foe/network-levels.js');
  for (const [level, seed] of [['easy', 8142], ['medium', 29018]]) {
    const random = seeded(seed);
    const possiblePairs = new Set();
    const distinctLayouts = new Set();
    let previous;
    for (let number = 1; number <= 1000; number++) {
      const trial = makeLevelTrial(level, previous, random);
      assert.equal(trial.number, number);
      assert.equal(trial.evidence.level, level);
      assert.equal(trial.roster.length, 10);
      assert.equal(new Set(trial.roster).size, 10);
      assert.deepEqual(trial.evidence.roster, trial.roster);
      assert.equal(trial.pair.length, 2);
      assert.notEqual(trial.pair[0], trial.pair[1]);
      assert.ok(trial.pair.every(name => trial.roster.includes(name)));
      const key = pairKey(trial.pair);
      if (previous) assert.notEqual(key, pairKey(previous.pair));
      possiblePairs.add(key);
      distinctLayouts.add(relationshipFingerprint(trial.evidence));
      previous = trial;
    }
    assert.equal(possiblePairs.size, 45);
    assert.equal(distinctLayouts.size, 1000,
      level + ' repeated a relationship layout under different names during a maximum-length run');
  }
});

test('Medium shows the same disputed row for either possible matching', async t => {
  const {makeLevelTrial} = await import('../friend-or-foe/network-levels.js');
  const {renderLevelEvidence} = await import('../friend-or-foe/network-level-view.js');
  class Node {
    constructor(tag, text = '') { this.tag = tag; this.textContent = text; this.children = []; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this[name] = value; }
    walk() { return [this, ...this.children.flatMap(child => child.walk())]; }
  }
  const document = {createElement: tag => new Node(tag), createTextNode: text => new Node('#text', text)};
  const previous = global.document;
  global.document = document;
  t.after(() => {
    if (previous === undefined) delete global.document;
    else global.document = previous;
  });
  const {evidence} = makeLevelTrial('medium', null, seeded(84162));
  const render = board => {
    const root = new Node('main');
    renderLevelEvidence(root, board);
    return root;
  };
  const shown = render(evidence);
  const reversed = structuredClone(evidence);
  const links = reversed.rows.find(row => row.disputed).links;
  [links[0].to, links[1].to] = [links[1].to, links[0].to];
  assert.deepEqual(shown, render(reversed),
    'The order, attributes, or text revealed which disputed senders and recipients were paired');
  const nodes = shown.walk();
  for (const role of evidence.rows) assert.ok(nodes.some(node => node.textContent === role.label));
  for (const account of evidence.reports) assert.ok(nodes.some(node => node.textContent.includes(account.speaker + ' says')));
  assert.ok(nodes.some(node => node.textContent === evidence.order));
  assert.ok(nodes.some(node => node.textContent === evidence.trust.text));
  assert.ok(!nodes.some(node => ['button', 'select', 'input'].includes(node.tag)));
});
