'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const deck = import('../trauma-medicine/shift-deck.js');

const types = Array.from({ length: 80 }, (_, index) => index + 1);
const words = text => text.trim().split(/\s+/).length;

function subsets(options) {
  let selections = [[]];
  for (const index of options.keys()) {
    selections = selections.concat(selections.map(selection => [...selection, index]));
  }
  return selections;
}

// Check every click combination against a rule read from the handover, including
// wrong combinations. Option order can change independently of the clinical facts.
function checkSelections(call, accepts, shouldWork) {
  const winning = [];
  for (const selection of subsets(call.options)) {
    const labels = selection.map(index => call.options[index]);
    const expected = shouldWork(labels);
    assert.equal(accepts(call, selection), expected, `${call.title} | ${labels.join(' + ')}`);
    if (expected) {
      assert.equal(accepts(call, [...selection].reverse()), true, 'click order must not matter');
      winning.push(labels);
    }
  }
  assert.ok(winning.length, `no complete solution for ${call.title}`);
  return winning;
}

test('a shift cycle rotates through all 80 types and interleaves reasoning families across the boundary', async () => {
  const { makeCall, shuffledCycle } = await deck;
  const family = new Map(types.map(number => [number, makeCall(number, 0).meta.familyId]));
  assert.equal(new Set(family.values()).size, 8);
  const orders = new Set();
  for (let seed = 0; seed < 80; seed++) {
    let previous = 0;
    for (const first of [true, false]) {
      const options = { first, previous };
      const order = shuffledCycle(seed, options);
      assert.deepEqual([...order].sort((a, b) => a - b), types);
      assert.deepEqual(shuffledCycle(seed, options), order, 'reload must replay the cycle');
      orders.add(order.join(','));
      if (first) {
        const openingPhases = new Set(order.slice(0, 5).map(number => makeCall(number, seed, { opening: true }).phase));
        assert.deepEqual([...openingPhases].sort(), ['After', 'Before', 'During']);
      }
      for (const number of order) {
        if (previous) assert.notEqual(family.get(previous), family.get(number),
          `seed ${seed}: type ${number} follows ${previous} in the same family`);
        previous = number;
      }
    }
  }
  assert.ok(orders.size > 80, 'fresh cycles must draw different sequences');
});

test('each generated handover is compact, deterministic and has valid, unambiguous controls', async () => {
  const { makeCall, accepts } = await deck;
  const phases = new Set();
  const levels = new Set();
  for (const number of types) {
    const visibleVersions = new Set();
    for (let seed = 0; seed < 24; seed++) {
      const params = { level: seed % 6 + 1 };
      const call = makeCall(number, seed, params);
      const label = `type ${number}, seed ${seed}`;
      assert.equal(call.number, number, label);
      assert.equal(call.meta.number, number, label);
      phases.add(call.phase);
      levels.add(call.meta.level);
      assert.ok(call.clues.length >= 2 && call.clues.length <= 3, label);
      assert.ok(words(call.question) <= 20, label);
      assert.ok(words([call.question, ...call.clues].join(' ')) <= 70, label);
      assert.ok(call.options.length >= 2 && call.options.length <= 6, label);
      assert.equal(new Set(call.options).size, call.options.length, label);
      for (const value of [call.title, call.question, ...call.clues, ...call.options, call.why]) {
        assert.equal(typeof value, 'string', label);
        assert.ok(value.trim(), label);
        assert.doesNotMatch(value, /\b(?:undefined|NaN)\b|\[object Object\]|\$\{/, label);
      }
      assert.ok(call.accepted.length >= 1, label);
      for (const solution of call.accepted) {
        assert.ok(solution.length >= 1, label);
        assert.equal(new Set(solution).size, solution.length, label);
        assert.ok(solution.every(i => Number.isInteger(i) && i >= 0 && i < call.options.length), label);
        assert.ok(accepts(call, solution), label);
        if (!call.multiple) assert.equal(solution.length, 1, label);
      }
      assert.equal(accepts(call, []), false, label);
      assert.equal(accepts(call, [call.options.length]), false, label);
      visibleVersions.add([call.question, ...call.clues].join('\n'));
      if (seed === 0) assert.deepEqual(makeCall(number, seed, params), call, label);
    }
    assert.ok(visibleVersions.size > 1, `type ${number} repeated the identical handover across all seeds`);
  }
  assert.deepEqual([...phases].sort(), ['After', 'Before', 'During']);
  assert.deepEqual([...levels].sort(), ['atomic', 'composite', 'meta']);
});

// The two crews solve an assignment problem. Try both assignments against both
// patients' deadlines instead of deriving an expected winner from the answer key.
function dispatchOracle(call) {
  const numbers = text => [...text.matchAll(/\b\d+\b/g)].map(found => Number(found[0]));
  const patientFor = option => option.match(/\b[A-Z][a-z]+\b/g).at(-1);
  const names = call.options.map(patientFor);
  const timesForEachName = line => {
    const inOrder = [...names].sort((a, b) => line.indexOf(a) - line.indexOf(b));
    const times = numbers(line);
    assert.equal(times.length, inOrder.length);
    return new Map(inOrder.map((name, index) => [name, times[index]]));
  };
  const deadlines = timesForEachName(call.clues[0]);
  const [ours] = numbers(call.clues[1]);
  const theirs = timesForEachName(call.clues[2]);
  return labels => {
    if (labels.length !== 1) return false;
    const target = patientFor(labels[0]);
    const other = names.find(name => name !== target);
    return ours <= deadlines.get(target) && theirs.get(other) <= deadlines.get(other);
  };
}

function fallTimeOracle(call) {
  const clocks = text => [...text.matchAll(/\b(\d{1,2}):(\d{2})\b/g)]
    .map(([, hour, minute]) => Number(hour) * 60 + Number(minute));
  const alarmLog = call.clues.find(line => clocks(line).length === 2);
  const camera = call.clues.find(line => clocks(line).length === 1);
  const [cameraTime] = clocks(camera);
  let possible = clocks(alarmLog).map(alarm => alarm - 1);
  if (/standing|upright|on (?:their|his|her) feet/i.test(camera)) possible = possible.filter(time => time > cameraTime);
  else if (/floor|ground|already down/i.test(camera)) possible = possible.filter(time => time <= cameraTime);
  else assert.match(camera, /curtain|hidden|obscur|out of (?:view|sight)/i, 'unknown camera observation');
  return labels => {
    if (labels.length !== 1) return false;
    if (possible.length > 1) return /either|both|uncertain|unknown|cannot tell/i.test(labels[0]);
    return clocks(labels[0]).length === 1 && clocks(labels[0])[0] === possible[0];
  };
}

test('both versions of a one-clue replay solve independently, preserve button positions and reproduce on reload', async () => {
  const { makeCall, counterfactual, accepts } = await deck;
  for (const [number, oracle] of [[43, dispatchOracle], [8, fallTimeOracle]]) {
    for (let seed = 0; seed < 24; seed++) {
      const params = { opening: true, level: 1 };
      const current = makeCall(number, seed, params);
      const alternate = counterfactual(number, seed, params);
      assert.ok(alternate, `opening ${number} should allow testing the decision again`);
      const { call, at, override } = alternate;
      assert.deepEqual(current.options, call.options);
      assert.equal(current.question, call.question);
      assert.equal(current.title, call.title);
      assert.equal(current.phase, call.phase);
      const changed = call.clues.flatMap((line, index) => line === current.clues[index] ? [] : [index]);
      assert.deepEqual(changed, [at]);
      assert.deepEqual(makeCall(number, seed, { ...params, override }), call);
      checkSelections(current, accepts, oracle(current));
      checkSelections(call, accepts, oracle(call));
      assert.ok(current.accepted.every(selection => !accepts(call, selection)));
      assert.ok(call.accepted.every(selection => !accepts(current, selection)));
    }
  }
});

test('a new alert can favour either group or yield a tie once the base rates are included', async () => {
  const { makeCall, accepts } = await deck;
  const observed = new Set();
  for (let seed = 0; seed < 80; seed++) {
    const call = makeCall(10, seed);
    if (call.title !== 'When the screen flashes') continue;
    const [all, injured, uninjured] = [...call.clues[0].matchAll(/\b\d+\b/g)].map(match => Number(match[0]));
    assert.equal(Number(injured) + Number(uninjured), Number(all));
    const injuredFlags = Number(injured) / 2;
    const otherFlags = Number(uninjured) / Number(call.clues[2].match(/1 in (\d+)/)[1]);
    const decision = injuredFlags > otherFlags ? 'Hidden injury' : injuredFlags < otherFlags ? 'No hidden injury' : 'Equally likely';
    checkSelections(call, accepts, labels => labels.length === 1 && labels[0] === decision);
    observed.add(decision);
  }
  assert.equal(observed.size, 3, 'changed evidence must sometimes change or neutralise the conclusion');
});

test('a communication plan accepts either viable response channel, provided the patient can receive the question', async () => {
  const { makeCall, accepts } = await deck;
  const channels = new Set();
  for (let seed = 0; seed < 18; seed++) {
    const call = makeCall(59, seed, { level: 1 });
    if (call.title !== 'Through the glass') continue;
    const question = call.clues[0].includes('can hear the speaker') ? 'Speak the question.' : 'Hold up a written question.';
    channels.add(question);
    const reply = ['Watch which answer they point to.', 'Read the answer they write.'];
    const ways = checkSelections(call, accepts, labels =>
      labels.length === 2 && labels.includes(question) && reply.some(option => labels.includes(option)));
    assert.equal(ways.length, 2, 'either supported channel must earn credit');
    assert.equal(call.multiple, true);
    assert.equal(accepts(call, [0, 0]), false, 'choosing the same piece twice cannot make a complete plan');
  }
  assert.equal(channels.size, 2);
});

test('every offered replay keeps the same decision and reverses all previously valid selections', async () => {
  const { makeCall, counterfactual, accepts } = await deck;
  const changedTypes = new Set();
  for (const number of types) {
    for (const seed of [7, 22, 135]) {
      const params = { level: seed % 6 + 1 };
      const alternate = counterfactual(number, seed, params);
      if (!alternate) continue;
      changedTypes.add(number);
      const current = makeCall(number, seed, params);
      const { at, call } = alternate;
      const label = `type ${number}, seed ${seed}`;
      assert.deepEqual(current.options, call.options, label);
      assert.equal(current.question, call.question, label);
      assert.equal(current.phase, call.phase, label);
      assert.equal(current.title, call.title, label);
      assert.deepEqual(current.clues.flatMap((clue, i) => clue === call.clues[i] ? [] : [i]), [at], label);
      assert.ok(current.accepted.every(selection => !accepts(call, selection)), label);
      assert.ok(call.accepted.every(selection => !accepts(current, selection)), label);
    }
  }
  assert.ok(changedTypes.size > 1, 'the changed-clue decision must remain available beyond the opening');
});

test('selecting every viable two-person transport crew includes all feasible pairings and no others', async () => {
  const { makeCall, accepts } = await deck;
  const validPairCounts = new Set();
  for (let seed = 0; seed < 48; seed++) {
    const call = makeCall(19, seed, { level: 4 });
    if (call.title !== 'A crew that can do both jobs') continue;
    const [allRounder, driver] = call.clues[1].match(/\b\w+(?= can)/g);
    const third = call.clues[2].split(' ')[0];
    const drivers = new Set([allRounder, driver]);
    const interpreters = new Set([allRounder]);
    if (call.clues[2].includes('interpret')) interpreters.add(third);
    else drivers.add(third);
    const viable = new Set(call.options.filter(label => {
      const [a, b] = label.split(' + ');
      return (drivers.has(a) && interpreters.has(b)) || (drivers.has(b) && interpreters.has(a));
    }));
    validPairCounts.add(viable.size);
    checkSelections(call, accepts, labels => labels.length === viable.size && labels.every(label => viable.has(label)));
  }
  assert.deepEqual([...validPairCounts].sort(), [2, 3], 'a change in the third person’s skills changes which crews work');
});

test('reassessments sometimes preserve a decision and sometimes reverse it without moving the options', async () => {
  const {makeCall, reassessment, accepts} = await deck;
  const outcomes = new Set();
  for (let seed=0;seed<48;seed++) {
    const base=makeCall(43,seed,{opening:true});
    const next=reassessment(43,seed,{opening:true});
    assert.ok(next, 'the bridge case should always permit a changed arrival estimate');
    assert.deepEqual(next.call.options,base.options);
    assert.equal(next.call.clues.filter((clue,i)=>clue!==base.clues[i]).length,1);
    const holds=base.accepted.every(selection=>accepts(next.call,selection));
    assert.equal(holds,next.holds);
    outcomes.add(holds);
  }
  assert.equal(outcomes.size,2,'always switching must fail on part of the opening-case replays');
});

test('the part examined affects the conclusion and a weak check leaves the scene unresolved', async () => {
  const {makeCall} = await deck;
  const answers=new Set();
  for (let seed=0;seed<20;seed++) {
    const initial=makeCall(1,seed,{opening:true});
    const {intro}=initial;
    const side=/\b(left|right) lung/.exec(intro.clues[0])[1];
    const useful=intro.options.findIndex(s=>s.includes(side));
    assert.deepEqual(intro.useful,[useful]);
    for (let choice=0;choice<intro.options.length;choice++) {
      const call=makeCall(1,seed,{opening:true,route:choice});
      const conclusion=call.options[call.accepted[0][0]];
      if(choice===useful) {
        assert.doesNotMatch(conclusion,/both/i);
        answers.add(conclusion);
      } else assert.match(conclusion,/both/i);
    }
  }
  assert.equal(answers.size,2);
});

test('different reasonable first hypotheses lead to different decisive challenges', async () => {
  const {makeCall, accepts} = await deck;
  for(const number of [71,73]) {
    for(let seed=0;seed<12;seed++) {
      const a=makeCall(number,seed,{opening:true,route:0});
      const b=makeCall(number,seed,{opening:true,route:1});
      assert.deepEqual(a.intro,b.intro);
      assert.equal(a.intro.options.length,2);
      assert.notDeepEqual(a.clues,b.clues);
      assert.ok(accepts(a,a.accepted[0])&&accepts(b,b.accepted[0]));
      if(number===71) assert.notDeepEqual(a.accepted,b.accepted);
    }
  }
});
