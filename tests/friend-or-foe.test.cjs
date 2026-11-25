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
  const {ArcadeRun} = await import('../friend-or-foe/covert-range.js');
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
  const {ArcadeRun} = await import('../friend-or-foe/covert-range.js');
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
  const {ArcadeRun} = await import('../friend-or-foe/covert-range.js');
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
  const {ArcadeRun} = await import('../friend-or-foe/covert-range.js');
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

// Reconstruct every side assignment directly from the five duos and the reports.
function possibleBoards(trial) {
  const boards = [];
  for (let mask = 0; mask < 2 ** trial.duos.length; mask++) {
    const allied = new Set([trial.anchor]);
    for (const [index, duo] of trial.duos.entries()) {
      allied.add(mask & (1 << index) ? duo.lead : duo.partner);
    }
    const errors = [];
    for (const [index, report] of trial.reports.entries()) {
      const sameSide = allied.has(report.left) === allied.has(report.right);
      const truthful = report.speaker === null || allied.has(report.speaker);
      if ((sameSide === report.same) !== truthful) errors.push(index);
    }
    const pair = orderedPair(trial, allied);
    boards.push({allied, pair, errors});
  }
  return boards;
}

function orderedPair(trial, allied) {
  const {duos} = trial;
  const found = [];
  const role = trial.query.role;
  const alliedLeads = duos.filter(duo => allied.has(duo.lead)).length;
  for (const [i, duo] of duos.entries()) {
    const before = allied.has(duos[(i + duos.length - 1) % duos.length].lead);
    const current = allied.has(duo.lead);
    const after = allied.has(duos[(i + 1) % duos.length].lead);
    let correctSide;
    switch (role) {
      case 'friend':
      case 'foe':
        if (before === current) continue;
        correctSide = role === 'friend';
        break;
      case 'spy':
      case 'double':
        if (before === after) continue;
        correctSide = role === 'spy' ? after : before;
        break;
      case 'civilian':
      case 'foreigner':
        if (current !== (alliedLeads < duos.length / 2)) continue;
        correctSide = role === 'civilian' ? before : !before;
        break;
      default: assert.fail('Unrecognized order role ' + role);
    }
    found.push(allied.has(duo.lead) === correctSide ? duo.lead : duo.partner);
  }
  return found;
}

function samePair(a, b) {
  return a.length === b.length && a.every(name => b.includes(name));
}

function expectedRoles(trial, solved) {
  const cycle = ['handoff', 'intercept', 'arrival'];
  const active = cycle.indexOf(trial.query.family);
  const assigned = trial.duos.map(({lead, partner}) =>
    solved.pair.includes(lead) || solved.pair.includes(partner) ? [cycle[active]] : []
  );
  const unused = assigned.filter(families => families.length === 0);
  for (const families of unused.slice(0, 2)) families.push(cycle[(active + 1) % 3]);
  for (const families of unused.slice(1)) families.push(cycle[(active + 2) % 3]);

  const roles = {friend: [], foe: [], spy: [], double: [], civilian: [], foreigner: []};
  for (const [i, {lead, partner}] of trial.duos.entries()) {
    const prev = trial.duos[(i + 4) % 5].lead;
    const next = trial.duos[(i + 1) % 5].lead;
    for (const name of [lead, partner]) {
      const ally = solved.allied.has(name);
      for (const family of assigned[i]) {
        if (family === 'handoff') roles[ally ? 'friend' : 'foe'].push(name);
        if (family === 'intercept') roles[ally === solved.allied.has(next) ? 'spy' : 'double'].push(name);
        if (family === 'arrival') roles[ally === solved.allied.has(prev) ? 'civilian' : 'foreigner'].push(name);
      }
    }
  }
  return roles;
}

// Erase every same/opposite sign. For each proposed allegiance board, re-sign
// the statements to match it. Could that graph legitimately yield another case?
function signlessAlternatives(candidates, reportCount, previousPair) {
  const signature = board => board.errors.reduce((bits, index) => bits | (1 << index), 0);
  const groups = new Map();
  for (const board of candidates) {
    const key = signature(board);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(board);
  }
  const answers = [];
  for (const [signs, worlds] of groups) {
    if (worlds.length !== 1) continue;
    const pair = worlds[0].pair;
    if (samePair(pair, previousPair)) continue;
    const alternatives = [];
    for (let i = 0; i < reportCount; i++) {
      const neighbors = groups.get(signs ^ (1 << i)) || [];
      alternatives.push(neighbors.filter(w => !samePair(w.pair, pair) && !samePair(w.pair, previousPair)));
    }
    if (alternatives.some(group => group.length === 0)) continue;
    if (pair.every(name => alternatives.flat().some(w => !w.pair.includes(name)))) answers.push(pair);
  }
  return answers;
}

test('a previously exhausted six-trial deal completes with a solvable sixth order', async () => {
  const {makeCovertTrial} = await import('../friend-or-foe/covert-case.js');
  const random = seeded(1414597142);
  let trial;
  for (let number = 1; number <= 6; number++) {
    trial = makeCovertTrial(trial, random);
    assert.equal(trial.number, number);
    const accepted = possibleBoards(trial).filter(board => !board.errors.length && board.pair.length === 2);
    assert.equal(accepted.length, 1);
    assert.deepEqual(sorted(accepted[0].pair), sorted(trial.pair));
  }
});

test('the public duos, reports and order determine one complete board', async () => {
  const {caseRoles, makeCovertTrial, possibleCovertPairs} = await import('../friend-or-foe/covert-case.js');
  const random = seeded(372);
  const roles = new Set();
  const seenPairs = new Set();
  let sharedWithPrevious = 0;
  let previous;

  for (let i = 0; i < 1100; i++) {
    const trial = makeCovertTrial(previous, random);
    const namesOnBoard = trial.duos.flatMap(duo => [duo.lead, duo.partner]);
    assert.equal(new Set(namesOnBoard).size, 10);
    assert.deepEqual(sorted(namesOnBoard), sorted(trial.roster));
    const publicNames = [trial.anchor, ...namesOnBoard];
    for (const report of trial.reports) {
      assert.ok(publicNames.includes(report.left) && publicNames.includes(report.right));
      assert.ok(report.speaker === null || namesOnBoard.includes(report.speaker));
    }

    const candidates = possibleBoards(trial).filter(board => board.pair.length === 2);
    const solved = candidates.filter(board => !board.errors.length);
    assert.equal(solved.length, 1, 'More or fewer than one complete board');
    assert.deepEqual(sorted(solved[0].pair), sorted(trial.pair));
    const {anchor, duos, reports, query, order, roster} = trial;
    const assignments = caseRoles({anchor, duos, reports, query, order, roster});
    const expected = expectedRoles(trial, solved[0]);
    assert.deepEqual(sorted(Object.keys(assignments)), sorted(Object.keys(expected)));
    for (const role of Object.keys(expected)) {
      assert.equal(new Set(assignments[role]).size, 2);
      assert.deepEqual(sorted(assignments[role]), sorted(expected[role]));
    }
    assert.deepEqual(sorted(assignments[query.role]), sorted(trial.pair));
    const allMembers = Object.values(assignments).flat();
    const counts = roster.map(name => allMembers.filter(member => member === name).length);
    assert.deepEqual(counts.sort(), [1, 1, 1, 1, 1, 1, 1, 1, 2, 2]);
    const unresolved = caseRoles({anchor, duos, reports: reports.slice(1), query, order, roster});
    assert.ok(Object.values(unresolved).every(members => members.length === 0));
    const alternatives = [];
    for (const index of trial.reports.keys()) {
      const oneReport = candidates.filter(board => !board.errors.includes(index));
      assert.ok(trial.pair.every(name => oneReport.some(board => !board.pair.includes(name))),
        'One statement by itself gives away a target.');
      const competitors = candidates.filter(board =>
        board.errors.length === 1 && board.errors[0] === index &&
        !samePair(board.pair, trial.pair) && !samePair(board.pair, previous?.pair || [])
      );
      assert.ok(competitors.length, 'Redundant report ' + index);
      const answerKey = pair => sorted(pair).join('/');
      const expected = [trial.pair, ...competitors.map(board => board.pair)].map(answerKey);
      assert.deepEqual(new Set(possibleCovertPairs(trial, index).map(answerKey)), new Set(expected));
      alternatives.push(...competitors);
    }
    assert.ok(trial.pair.every(name => alternatives.some(board => !board.pair.includes(name))));
    const signless = signlessAlternatives(candidates, trial.reports.length, previous?.pair || []);
    assert.ok(signless.some(pair => pair.every(name => !trial.pair.includes(name))),
      'The unsigned graph alone rules out every disjoint answer.');
    seenPairs.add(sorted(trial.pair).join('/'));
    roles.add(trial.query.role);
    if (previous) {
      assert.ok(!samePair(previous.pair, trial.pair));
      if (previous.pair.some(name => trial.pair.includes(name))) sharedWithPrevious++;
    }
    previous = trial;
  }
  assert.equal(roles.size, 6);
  assert.equal(seenPairs.size, 45);
  assert.ok(sharedWithPrevious > 0, 'Previous targets can be ruled out without reading the case');
});
