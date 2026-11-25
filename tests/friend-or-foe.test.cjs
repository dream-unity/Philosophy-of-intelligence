const test = require('node:test');
const assert = require('node:assert/strict');

function seeded(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

const names = ['Samp', 'Ivo', 'Luma', 'Mira', 'Nia', 'Orin', 'Pia', 'Sol', 'Tess', 'Vale'];
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
      assert.ok(Math.abs(tile.pace - previous.pace) >= 2);
      assert.notEqual(tile.duration, previous.duration);
      assert.notEqual(tile.pace, last.find(other => other.species === tile.species).pace);
      const sameSlot = last.find(other => other.slot === tile.slot);
      assert.notEqual(tile.pace, sameSlot.pace);
      assert.notEqual(tile.species, sameSlot.species);
    }
    last = targets;
  }
});

test('all difficulties use the selected speed ceiling and visibly separate targets as they approach', async () => {
  const {ArcadeRun} = await import('../friend-or-foe/covert-range.js');
  const {targetBounds} = await import('../friend-or-foe/covert-scene.js');
  const {makeCaseTrial} = await import('../friend-or-foe/case-decks.js');
  const draw = seeded(2471);
  for (const difficulty of ['very-easy', 'easy', 'medium', 'hard']) {
    let previous = [];
    let trial;
    for (let speed = .25; speed <= 3; speed += .25) {
      trial = makeCaseTrial(difficulty, trial, draw);
      const seed = Math.floor(draw() * 1e8);
      const run = new ArcadeRun(trial.roster, trial.pair, previous, seeded(seed), speed);
      const normal = new ArcadeRun(trial.roster, trial.pair, previous, seeded(seed), 1);
      const fastest = 10 / speed;
      assert.equal(Math.min(...run.targets.map(t => t.duration)), fastest);
      assert.equal(new Set(run.targets.map(t => t.duration)).size, 10);
      run.advance(fastest / 2);
      for (const t of run.targets) {
        assert.equal(t.name, normal.targets[t.slot].name);
        assert.ok(Math.abs(t.duration * speed - normal.targets[t.slot].duration) < 1e-10);
        const initial = targetBounds(520, 295, {...t, elapsed: 0});
        const now = targetBounds(520, 295, t);
        assert.ok(now.w > initial.w && Math.abs(now.floor - initial.floor) >= 5);
        const last = previous.find(other => other.name === t.name);
        if (last) assert.ok(Math.abs(t.pace - last.pace) >= 2);
      }
      run.advance(fastest / 2);
      assert.equal(run.snapshot().escaped, 1);
      previous = run.targets;
    }
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

// Walking together around the seats and the printed stations reconstructs every
// duty in a crew from the one person hypothesized to hold its double station.
function crewWorlds(crew) {
  const double = crew.stations.findIndex(group => group.length === 2);
  assert.notEqual(double, -1);
  return crew.names.map((target, seat) => {
    const assignments = new Map();
    const holders = new Map();
    for (let distance = 0; distance < crew.names.length; distance++) {
      const member = crew.names[(seat + distance) % crew.names.length];
      const duties = crew.stations[(double + distance) % crew.stations.length];
      assignments.set(member, [...duties].sort());
      for (const duty of duties) holders.set(duty, member);
    }
    return {target, assignments, holders};
  });
}

function arcNames(crew, path) {
  const start = crew.names.indexOf(path.from);
  assert.ok(start >= 0 && crew.names.includes(path.to));
  assert.notEqual(path.to, path.from);
  const entered = [];
  for (let step = 1; step <= crew.names.length; step++) {
    const name = crew.names[(start + step) % crew.names.length];
    entered.push(name);
    if (name === path.to) return entered;
  }
  throw new Error('Missing route endpoint');
}

function candidateBoards(trial) {
  const [a, b] = trial.crews.map(crewWorlds);
  const arcs = trial.reports.map(report => report.paths.map((path, index) => arcNames(trial.crews[index], path)));
  const result = [];
  for (const left of a) for (const right of b) {
    const choices = [left, right];
    const fails = [];
    const pathTruths = trial.reports.map((report, row) => {
      const values = report.paths.map((path, i) => arcs[row][i].includes(choices[i].holders.get(path.role)));
      return values;
    });
    const expectedSigns = pathTruths.map(([left, right]) => left === right);
    expectedSigns.forEach((sign, row) => { if (sign !== trial.reports[row].same) fails.push(row); });
    result.push({pair: [left.target, right.target], crews: choices, fails, expectedSigns, pathTruths});
  }
  return result;
}

function pairKey(pair) { return sorted(pair).join('/'); }

function commonTargets(candidates) {
  return candidates[0].pair.filter(name => candidates.every(c => c.pair.includes(name)));
}

function changedOperands(trial, omitted) {
  const names = new Set();
  const duties = new Set();
  for (const [row, candidates] of omitted.entries()) {
    const report = trial.reports[row];
    for (const [crewIndex, original] of report.paths.entries()) {
      const crew = trial.crews[crewIndex];
      const checkPath = revised => {
        const seats = arcNames(crew, revised);
        return candidates.some(board => {
          const roleHolder = board.crews[crewIndex].holders.get(revised.role);
          const agrees = seats.includes(roleHolder) === board.pathTruths[row][1 - crewIndex];
          return agrees === report.same;
        });
      };
      for (const endpoint of ['from', 'to']) {
        if (crew.names.some(name => name !== original.from && name !== original.to &&
            checkPath({...original, [endpoint]: name}))) names.add(original[endpoint]);
      }
      if (crew.stations.flat().some(role => role !== original.role &&
          checkPath({...original, role}))) duties.add(original.role);
    }
  }
  return {names, duties};
}

// Can a player learn the two starting seat numbers from the visible duties
// alone? Normalize duty spellings so a mere change of labels cannot hide a
// repeated layout. The first half trains the lookup, the second half tests it.
function stationPattern(crews) {
  const roles = new Map();
  return crews.map(crew => crew.stations.map(station => station.map(role => {
    if (!roles.has(role)) roles.set(role, roles.size);
    return roles.get(role);
  }).join('+')).join('|')).join('/');
}

test('public duty orders and comparisons give one complete roster, and every operand matters', async () => {
  const {makeDutyTrial, caseRoles, possibleDutyPairs} = await import('../friend-or-foe/duty-wheels.js');
  const random = seeded(372);
  const possibleDuties = ['civilian', 'double', 'foe', 'foreigner', 'friend', 'spy'];
  const ordered = new Set();
  let previous;
  let partialRepeat = 0;
  const seatHistory = new Map();
  let seatGuesses = 0;
  for (let i = 0; i < 1100; i++) {
    const trial = makeDutyTrial(previous, random);
    const {crews, reports, roster} = trial;
    assert.equal(crews.length, 2);
    assert.equal(new Set(crews.flatMap(crew => crew.names)).size, 10);
    assert.deepEqual(sorted(crews.flatMap(crew => crew.names)), sorted(roster));
    for (const crew of crews) {
      assert.equal(crew.names.length, 5);
      assert.deepEqual(sorted(crew.stations.flat()), possibleDuties);
      assert.deepEqual(sorted(crew.stations.map(station => station.length)), [1, 1, 1, 1, 2]);
    }
    assert.equal(reports.length, 4);
    for (const report of reports) {
      assert.equal(typeof report.same, 'boolean');
      assert.equal(report.paths.length, 2);
      for (const [index, path] of report.paths.entries()) assert.ok(crews[index].stations.flat().includes(path.role));
    }

    const boards = candidateBoards(trial);
    assert.equal(boards.length, 25);
    const correct = boards.filter(candidate => candidate.fails.length === 0);
    assert.equal(correct.length, 1);
    const answer = correct[0];
    assert.equal(pairKey(answer.pair), pairKey(trial.pair));
    const projected = caseRoles({crews, roster, reports});
    for (const role of possibleDuties) {
      assert.deepEqual(projected[role], answer.crews.map(crew => crew.holders.get(role)));
    }

    const memberships = Object.values(projected).flat();
    const doubleDuty = roster.filter(name => memberships.filter(member => member === name).length === 2);
    assert.deepEqual(sorted(new Set(memberships)), sorted(roster));
    assert.equal(pairKey(doubleDuty), pairKey(trial.pair));

    const priorKey = pairKey(previous?.pair || []);
    const legal = boards.filter(board => pairKey(board.pair) !== priorKey);
    const omissions = reports.map((_, row) => {
      const allowed = legal.filter(board => board.fails.every(failed => failed === row));
      assert.deepEqual(new Set(possibleDutyPairs(trial, row).map(pairKey)), new Set(allowed.map(b => pairKey(b.pair))));
      const otherPairs = legal.filter(board => board.fails.length === 1 && board.fails[0] === row &&
        board.pair.every(name => !answer.pair.includes(name)));
      assert.ok(otherPairs.length, 'Missing signed comparison should let both targets change');
      const oneReport = legal.filter(board => !board.fails.includes(row));
      assert.equal(commonTargets(oneReport).length, 0, 'Reading one sign already gives away a target');
      return otherPairs;
    });
    const {names, duties} = changedOperands(trial, omissions);
    assert.deepEqual(sorted(names), sorted(roster));
    assert.deepEqual(sorted(duties), possibleDuties);
    // Re-sign the exact same routes in every way that meets the generation
    // guarantees, including previous-pair exclusion and operand sensitivity.
    let eligible = legal.filter(proposed => {
      const signed = reports.map((r, row) => ({...r, same: proposed.expectedSigns[row]}));
      const failures = board => board.expectedSigns.flatMap((sign, row) => sign !== signed[row].same ? [row] : []);
      if (boards.filter(b => failures(b).length === 0).length !== 1) return false;
      const disjoint = legal.filter(b => b.pair.every(name => !proposed.pair.includes(name)));
      const omissions = signed.map((r, row) => disjoint.filter(b => {
        const f = failures(b);
        return f.length === 1 && f[0] === row;
      }));
      if (omissions.some(group => !group.length)) return false;
      const changed = changedOperands({...trial, reports: signed}, omissions);
      return changed.names.size === 10 && changed.duties.size === 6;
    });
    // A player who knows the selection process may also exclude worlds that
    // would fail this same check. Continue until there are no more to exclude.
    for (;;) {
      const remaining = eligible.filter(candidate =>
        reports.every((_, row) => eligible.some(other =>
          other.expectedSigns[row] === candidate.expectedSigns[row] &&
          other.pair.every(name => !candidate.pair.includes(name))))
      );
      if (remaining.length === eligible.length) break;
      eligible = remaining;
    }
    assert.ok(eligible.includes(answer), 'A single sign and the selection rules identify a target');
    if (previous) {
      assert.notEqual(pairKey(trial.pair), priorKey);
      if (previous.pair.some(name => trial.pair.includes(name))) partialRepeat++;
    }
    const layout = stationPattern(crews);
    const seats = crews.map(crew => crew.names.findIndex(name => trial.pair.includes(name))).join('/');
    if (i < 550) {
      const counts = seatHistory.get(layout) || new Map();
      counts.set(seats, (counts.get(seats) || 0) + 1);
      seatHistory.set(layout, counts);
    } else {
      const counts = seatHistory.get(layout);
      const guess = counts ? [...counts].sort((a, b) => b[1] - a[1])[0][0] : '0/0';
      if (seats === guess) seatGuesses++;
    }
    ordered.add(pairKey(trial.pair));
    previous = trial;
  }
  assert.ok(seatGuesses < 550 * 0.12, 'Remembering station patterns predicts both seats without any reports');
  assert.equal(ordered.size, 45);
  assert.ok(partialRepeat > 0, 'Prior names can be excluded without reading the case');
});

test('clockwise paths wrap, omit the starting seat and include the ending seat', async () => {
  const {solveDutyTrial, caseRoles} = await import('../friend-or-foe/duty-wheels.js');
  const path = (from, to, role) => ({from, to, role});
  const board = {
    crews: [
      {names: ['Samp', 'Ivo', 'Luma', 'Mira', 'Nia'],
       stations: [['friend', 'foe'], ['spy'], ['double'], ['civilian'], ['foreigner']]},
      {names: ['Orin', 'Pia', 'Sol', 'Tess', 'Vale'],
       stations: [['spy'], ['foe'], ['double', 'foreigner'], ['friend'], ['civilian']]}
    ],
    reports: [
      {paths: [path('Nia', 'Samp', 'foreigner'), path('Vale', 'Orin', 'friend')], same: false},
      {paths: [path('Nia', 'Mira', 'double'), path('Tess', 'Orin', 'foe')], same: false},
      {paths: [path('Mira', 'Ivo', 'friend'), path('Tess', 'Vale', 'double')], same: false},
      {paths: [path('Samp', 'Luma', 'foreigner'), path('Pia', 'Tess', 'friend')], same: true}
    ]
  };
  assert.deepEqual(solveDutyTrial(board).pair, ['Ivo', 'Tess']);
  assert.deepEqual(caseRoles(board), {
    friend: ['Ivo', 'Vale'], foe: ['Ivo', 'Sol'], spy: ['Luma', 'Pia'],
    double: ['Mira', 'Tess'], civilian: ['Nia', 'Orin'], foreigner: ['Samp', 'Tess']
  });
});
