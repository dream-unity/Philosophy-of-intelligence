const test = require('node:test');
const assert = require('node:assert/strict');

function seeded(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

const names = ['Dex', 'Ivo', 'Luma', 'Mira', 'Nia', 'Orin', 'Pia', 'Sol', 'Tess', 'Vale'];
const sorted = values => [...values].sort();

test('ten moving targets have distinct positions and speeds and do not repeat their assignment', async () => {
  const {ArcadeRun} = await import('../friend-or-foe/arcade-range.js');
  const random = seeded(838);
  let last = [];
  for (let round = 0; round < 100; round++) {
    const {targets} = new ArcadeRun(names, names.slice(0, 2), last, random);
    assert.deepEqual(sorted(targets.map(tile => tile.name)), sorted(names));
    for (const key of ['slot', 'species', 'pace', 'duration']) {
      assert.equal(new Set(targets.map(tile => tile[key])).size, names.length);
    }
    for (const tile of targets) {
      assert.equal(tile.state, 'moving');
      assert.ok(tile.duration > 0);
      const previous = last.find(other => other.name === tile.name);
      if (!previous) continue;
      for (const field of ['slot', 'pace', 'species']) {
        assert.notEqual(tile[field], previous[field], tile.name + ' repeated ' + field);
      }
      const sameSlot = last.find(other => other.slot === tile.slot);
      assert.notEqual(tile.pace, sameSlot.pace);
      assert.notEqual(tile.species, sameSlot.species);
    }
    last = targets;
  }
});

test('two shots finish the round immediately, including two misses', async () => {
  const {ArcadeRun} = await import('../friend-or-foe/arcade-range.js');
  const pair = names.slice(0, 2);
  for (const attempts of [[null, null], [pair[0], pair[1]], [pair[0], null], [null, names[3]], [names[4], names[5]], [pair[1], pair[0]]]) {
    const run = new ArcadeRun(names, pair, [], seeded(162));
    const fire = name => run.fire(run.targets.find(target => target.name === name) ?? null);
    fire(attempts[0]);
    assert.equal(run.complete, false);
    fire(attempts[1]);
    const verdict = run.result();
    assert.equal(run.complete, true);
    assert.equal(verdict.shots, 2);
    assert.equal(verdict.bullets, 0);
    const exact = pair.every(name => attempts.includes(name));
    assert.equal(verdict.correct, exact);
    assert.equal(verdict.reason, exact ? 'pair' : 'ammo');
    assert.deepEqual(verdict.shotLog.map(shot => shot.name), attempts);
    assert.equal(run.fire(null), false);
  }
});

test('the public range state gives no clue after the first shot', async () => {
  const {ArcadeRun} = await import('../friend-or-foe/arcade-range.js');
  const hit = new ArcadeRun(names, names.slice(0, 2), [], seeded(31));
  const other = new ArcadeRun(names, names.slice(2, 4), [], seeded(31));
  for (const run of [hit, other]) {
    run.advance(1);
    run.fire(run.targets.find(tile => tile.name === names[0]));
  }
  assert.deepEqual(hit.targets, other.targets);
  assert.deepEqual(hit.snapshot(), other.snapshot());
  assert.equal(hit.result(), null);
  assert.equal(other.result(), null);
});

test('the last surviving hostile escaping ends the trial even with ammunition left', async () => {
  const {ArcadeRun} = await import('../friend-or-foe/arcade-range.js');
  for (const hitFirst of [false, true]) {
    const seed = 971;
    const initial = new ArcadeRun(names, names.slice(0, 2), [], seeded(seed));
    const remaining = tile => tile.duration - tile.elapsed;
    const soonest = [...initial.targets].sort((a, b) => remaining(a) - remaining(b)).slice(0, 2);
    const pair = soonest.map(tile => tile.name);
    const run = new ArcadeRun(names, pair, [], seeded(seed));
    if (hitFirst) run.fire(run.targets.find(tile => tile.name === pair[0]));
    const deadline = soonest[1].duration - soonest[1].elapsed;
    run.advance(deadline - 0.005);
    assert.equal(run.complete, false);
    run.advance(0.01);
    assert.equal(run.complete, true);
    const verdict = run.result();
    assert.equal(verdict.reason, 'escaped');
    assert.equal(verdict.correct, false);
    assert.deepEqual(sorted(verdict.escapedThreats), sorted(hitFirst ? pair.slice(1) : pair));
    assert.equal(verdict.bullets, hitFirst ? 1 : 2);
  }
});

test('sessions enforce the 20–1000 range and count each round once', async () => {
  const {ArcadeSession} = await import('../friend-or-foe/arcade-session.js');
  for (const invalid of [19, 1001, 33.5, NaN]) assert.throws(() => new ArcadeSession(invalid), RangeError);
  for (const total of [20, 217, 1000]) {
    const session = new ArcadeSession(total);
    const reasons = ['pair', 'escaped', 'ammo'];
    const counts = {pair: 0, escaped: 0, ammo: 0};
    for (let number = 1; number <= total; number++) {
      assert.equal(session.number, number);
      assert.equal(session.completed, number - 1);
      assert.equal(session.finished, false);
      assert.equal(session.next(), false);
      const reason = reasons[(number - 1) % reasons.length];
      const verdict = {correct: reason === 'pair', reason, elapsed: number};
      counts[reason]++;
      session.accept(verdict);
      session.accept(verdict);
      assert.equal(session.completed, number);
      assert.equal(session.next(), number < total);
    }
    assert.equal(session.finished, true);
    assert.equal(session.wins, counts.pair);
    assert.equal(session.deaths, counts.escaped);
    assert.equal(session.ammoLosses, counts.ammo);
    assert.equal(session.bestTime, 1);
  }
});

// Enumerate paths by following the arrows that a player can read on the two cards.
function solveCards(family, anchors, cards) {
  const [first, second] = cards.map(card => card.links);
  const a = new Set(first.filter(link => link.to === anchors[0]).map(link => link.from));
  if (family === 'trace') return new Set(second.filter(link => a.has(link.to)).map(link => link.from));
  const b = new Set(second.filter(link => link.to === anchors[1]).map(link => link.from));
  if (family === 'xor') return new Set([...a, ...b].filter(name => a.has(name) !== b.has(name)));
  const both = [...a].filter(name => b.has(name));
  assert.equal(both.length, 1);
  assert.equal(a.size, 2);
  const source = family === 'cross' ? both[0] : [...a].find(name => name !== both[0]);
  const ends = new Set(second.filter(link => link.from === source && link.to !== anchors[1]).map(link => link.to));
  assert.equal(ends.size, 1);
  return new Set([both[0], ...ends]);
}

test('each public order and its arrows identify exactly two distinct names', async () => {
  const {makeArcadeTrial} = await import('../friend-or-foe/arcade-links.js');
  const random = seeded(372);
  let previous;
  const families = new Set();
  const seenPairs = new Set();
  for (let i = 0; i < 1200; i++) {
    const trial = makeArcadeTrial(previous, random);
    const roster = new Set(trial.roster);
    assert.equal(roster.size, 10);
    assert.equal(new Set(trial.roles.map(role => role.key)).size, 6);
    for (const role of trial.roles) {
      assert.ok(roster.has(role.reference));
      assert.equal(new Set(role.names).size, 2);
      assert.ok(role.names.every(name => roster.has(name)));
    }
    const memberships = trial.roster.map(name => trial.roles.filter(role => role.names.includes(name)).length);
    assert.deepEqual(memberships.sort(), [1, 1, 1, 1, 1, 1, 1, 1, 2, 2]);
    assert.equal(trial.cues.length, 2);
    for (const card of trial.cues) {
      assert.ok(card.links.length <= 4);
      for (const {from, to} of card.links) {
        assert.ok(roster.has(from) && roster.has(to));
        assert.notEqual(from, to);
      }
    }
    const anchors = [...new Set(trial.order.match(/[\p{L}]+/gu).filter(word => roster.has(word)))];
    let family;
    if (trial.order.includes('exactly one')) family = 'xor';
    else if (trial.order.includes('other friend')) family = 'cross';
    else if (trial.order.includes('host')) family = 'split';
    else if (trial.order.startsWith('Find the ')) family = 'trace';
    assert.ok(family, 'Unrecognized order: ' + trial.order);
    assert.equal(anchors.length, family === 'trace' ? 1 : 2);
    const actual = solveCards(family, anchors, trial.cues);
    assert.equal(actual.size, 2);
    assert.deepEqual(sorted(actual), sorted(trial.pair));
    if (previous) assert.ok(previous.pair.every(name => !actual.has(name)));
    seenPairs.add(sorted(actual).join('/'));
    families.add(family);
    previous = trial;
  }
  assert.deepEqual(sorted(families), ['cross', 'split', 'trace', 'xor']);
  assert.equal(seenPairs.size, 45);
});
