const test = require('node:test');
const assert = require('node:assert/strict');

function seeded(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

const unordered = names => [...names].sort();

test('public records determine six role pairs and a fresh two-name order', async () => {
  const {makeTrial, solveTrial} = await import('../friend-or-foe/trial.js');
  const random = seeded(2026);
  const families = new Set();
  const slipCounts = new Set();
  let secondWitnessTrials = 0;
  let previous;

  for (let round = 0; round < 100; round++) {
    const trial = makeTrial(previous, random);
    const {brief, roster, roles, pair} = trial;
    const rows = brief.table.rows;
    slipCounts.add(rows.length);
    for (const [author, ...entries] of rows) assert.ok(!entries.includes(author));
    if (brief.peer) {
      secondWitnessTrials++;
      const peer = brief.peer;
      assert.equal(brief.sent.includes(peer.witness), peer.received.includes(brief.witness));
      assert.equal(brief.received.includes(peer.witness), peer.sent.includes(brief.witness));
      assert.ok(brief.clues.some(clue => clue.title === 'Second star exchange'));
    }
    const expected = {
      friend: brief.sent.filter(name => brief.received.includes(name)),
      foe: [...new Set(rows.map(row => row[1]))],
      spy: rows.filter(row => row[1] === brief.watched).map(row => row[0]),
      double: rows.filter(row => row[2] !== row[3]).map(row => row[0]),
      civilian: brief.benches.find(bench => bench.includes(brief.witness)),
      foreigner: rows.filter(row => brief.sealedSlips.includes(row[0])).map(row => row[3])
    };

    assert.equal(new Set(roster).size, 10);
    assert.deepEqual(unordered(roles.map(role => role.key)), unordered(Object.keys(expected)));
    for (const {key, names} of roles) {
      assert.equal(new Set(names).size, 2);
      assert.deepEqual(unordered(names), unordered(expected[key]));
    }
    const memberships = roster.map(name => roles.filter(role => role.names.includes(name)).length);
    assert.deepEqual(memberships.sort(), [1, 1, 1, 1, 1, 1, 1, 1, 2, 2]);
    assert.equal(new Set(pair).size, 2);
    assert.ok(pair.every(name => roster.includes(name)));
    assert.deepEqual(unordered(solveTrial(brief).pair), unordered(pair));
    // Precisely two spies scanned the watched tile. A clue that merely repeats
    // that condition cannot distinguish which author's slip supplies the pair.
    const ambiguous = {...brief, query: {
      family: 'trace', a: 'spy', b: 'spy', first: 'author', second: 'paid'
    }};
    assert.deepEqual(solveTrial(ambiguous).pair, []);
    if (previous) assert.notDeepEqual(unordered(pair), unordered(previous.pair));
    if (trial.amended) assert.equal(brief.order, previous.brief.order);
    families.add(trial.family);
    previous = trial;
  }
  assert.deepEqual(unordered(families), ['relay', 'split', 'trace', 'xor']);
  assert.deepEqual(unordered(slipCounts), [3, 4]);
  assert.ok(secondWitnessTrials > 0);
});

test('one mark gives identical feedback whether it belongs to the pair or not', async () => {
  const {MissionRun} = await import('../friend-or-foe/mission-range.js');
  const names = Array.from({length: 10}, (_, i) => 'Tile ' + i);
  const deal = pair => new MissionRun(names, pair, seeded(31));
  const layout = deal(names.slice(0, 2)).lanes.map(tile => tile.name);
  const exact = deal(layout.slice(0, 2));
  const wrong = deal(layout.slice(2, 4));
  assert.equal(new Set(exact.lanes.map(tile => tile.duration)).size, 5);
  for (const run of [exact, wrong]) {
    assert.ok(run.choose(run.lanes[0]));
    assert.equal(run.snapshot().active, 5);
  }
  assert.deepEqual(exact.lanes, wrong.lanes);
  assert.deepEqual(exact.snapshot(), wrong.snapshot());
  assert.equal(exact.complete, false);

  assert.ok(exact.choose(exact.lanes[1]));
  assert.equal(exact.correct, true);
  assert.equal(exact.complete, true);

  assert.ok(wrong.choose(wrong.lanes[1]));
  assert.equal(wrong.complete, false);
  assert.equal(wrong.choose(wrong.lanes[2]), false);
  wrong.advance(100);
  assert.equal(wrong.complete, true);
  assert.equal(wrong.correct, false);
  assert.equal(wrong.snapshot().passed, 8);
});
