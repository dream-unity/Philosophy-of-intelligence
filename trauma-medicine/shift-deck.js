import { createRng, shuffle } from './case-layout.js';
import { PATIENTS } from './roster.js';
import { REASONING_TYPE_LIST } from './reasoning-types.js';
import { bankA } from './shift-diagnostic.js';
import { bankB } from './shift-systems.js';
import { bankC } from './shift-social.js';
import { fieldCases } from './field-cases.js';
import { investigations } from './shift-investigations.js';
import { bedsideCases } from './shift-bedside.js';

const authors = { ...bankA, ...bankB, ...bankC };
const numbers = REASONING_TYPE_LIST.map(t => t.number);
const firstShift = [43, 1, 66, 8, 12];
const namePool = PATIENTS.map(p => p.name);
const sorted = xs => [...xs].sort((a, b) => a - b);
function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const ordered = sorted(b);
  return sorted(a).every((value, i) => value === ordered[i]);
}
const choose = (arr, fraction) => arr[Math.min(arr.length - 1, Math.floor(fraction * arr.length))];

const phaseCadence = ['Before','During','After','During','Before','During','After','During'];
const phasesByType = new Map();

function phasesAvailable(number) {
  if (!phasesByType.has(number)) {
    const phases = new Set();
    for (let sample=0; sample<40 && phases.size<3; sample++) {
      phases.add(makeCall(number, sample*1931, {level: 1+sample%6}).phase);
    }
    phasesByType.set(number, phases);
  }
  return phasesByType.get(number);
}

export function shuffledCycle(seed, {first = false, previous = 0} = {}) {
  const rng = createRng(seed);
  const familyOf = n => REASONING_TYPE_LIST[n - 1].familyId;
  const pool = shuffle(rng, numbers.filter(n => !first || !firstShift.includes(n)));
  const order = first ? [...firstShift] : [];
  let last = order.at(-1) || previous;
  while (pool.length) {
    const counts = new Map();
    for (const n of pool) counts.set(familyOf(n), (counts.get(familyOf(n)) || 0) + 1);
    const left = pool.length - 1;
    const safe = new Set();
    for (const family of counts.keys()) {
      if (last && family === familyOf(last)) continue;
      // A future alternating order must still be possible after this choice.
      if ([...counts].every(([other, n]) => other === family
        ? n - 1 <= Math.floor(left / 2)
        : n <= Math.ceil(left / 2))) safe.add(family);
    }
    const wanted = phaseCadence[order.length % phaseCadence.length];
    let index = pool.findIndex(n => safe.has(familyOf(n)) && phasesAvailable(n).has(wanted));
    if (index < 0) index = pool.findIndex(n => safe.has(familyOf(n)));
    if (index < 0) index = 0;
    last = pool.splice(index,1)[0];
    order.push(last);
  }
  return order;
}

function compose(number, seed, level, opening, override, route = 0, castSeed) {
  const rng = createRng(seed);
  const names = shuffle(rng, namePool);
  const p = (castSeed == null ? names : shuffle(createRng(castSeed), namePool)).slice(0, 4);
  const alternate = rng();
  let author = authors[number];
  if (bedsideCases[number] && alternate < 0.43) author=bedsideCases[number];
  if (fieldCases[number] && (opening || alternate < 0.47)) author = fieldCases[number];
  if (investigations[number] && ((opening && number === 1) || (!opening && alternate > 0.60))) author = investigations[number];
  const tape = [];
  const draw = () => {
    const value = rng();
    const index = tape.push(value) - 1;
    return override?.index === index ? override.value : value;
  };
  let spec = author({
    p, level,
    flip: () => draw() < 0.5,
    pick: items => choose(items, draw()),
    int: (min, max) => min + Math.floor(draw() * (max - min + 1))
  });
  if (spec.investigation) {
    const check = spec.investigation;
    spec = {...spec, ...(check.results[route] || check.results[0]), intro: {
      question:check.question, clues:check.clues, options:check.options, useful:check.useful
    }};
  } else if (spec.follow) {
    spec = {...spec, ...spec.follow[route === 1 ? 1 : 0]};
  }
  const options = spec.options.slice();
  const accepted = (spec.build?.accept || [Array.isArray(spec.answer) ? spec.answer : [spec.answer]]).map(sorted);
  return { spec, options, accepted, tape };
}

function present(raw, number, seed) {
  const {spec, options, accepted} = raw;
  // Decision ordering has its own RNG; changing a clue preserves the control positions.
  const order = shuffle(createRng(seed ^ 0xb91d2a1), options.map((_, i) => i));
  return {
    number, title: spec.title, phase: spec.phase, question: spec.question,
    clues: spec.clues.slice(), options: order.map(i => options[i]),
    accepted: accepted.map(ids => sorted(ids.map(i => order.indexOf(i)))),
    multiple: Boolean(spec.build || Array.isArray(spec.answer)),
    intro: spec.intro || null,
    why: spec.why, outcome: spec.outcome || '', meta: REASONING_TYPE_LIST[number - 1]
  };
}

export function makeCall(number, seed, {level = 1, opening = false, override, route = 0, castSeed} = {}) {
  if (!authors[number]) throw new RangeError(`Unknown reasoning type ${number}`);
  return present(compose(number, seed, level, opening, override, route, castSeed), number, seed);
}

export function accepts(call, selection) {
  return call.accepted.some(valid => sameSet(valid, selection));
}

function findVariation(number, seed, {level = 1, opening = false, castSeed} = {}, goal) {
  const original = compose(number, seed, level, opening, undefined, 0, castSeed);
  if (original.spec.intro) return null;
  for (let i = 0; i < original.tape.length; i++) {
    for (const value of [1 - original.tape[i], 0.01, 0.32, 0.51, 0.72, 0.99]) {
      const override = { index: i, value };
      const alt = compose(number, seed, level, opening, override, 0, castSeed);
      if (original.spec.question !== alt.spec.question || original.spec.title !== alt.spec.title ||
        original.spec.phase !== alt.spec.phase || original.spec.clues.length !== alt.spec.clues.length ||
        original.options.length !== alt.options.length || original.options.some((s, j) => s !== alt.options[j])) continue;
      const shared = original.accepted.filter(a => alt.accepted.some(b => sameSet(a, b))).length;
      if (goal === 'reverse' ? shared > 0 : shared !== original.accepted.length || shared !== alt.accepted.length) continue;
      const changed = original.spec.clues.map((s,j) => s !== alt.spec.clues[j] ? j : -1).filter(j => j >= 0);
      if (changed.length === 1) return { at: changed[0], holds: goal === 'hold', override, call: present(alt, number, seed) };
    }
  }
  return null;
}

export function counterfactual(number, seed, params) {
  return findVariation(number, seed, params, 'reverse');
}

// A replay offers both stable and reversing updates across the deck. In a
// binary case, only offer a replay if that particular story permits either.
export function reassessment(number, seed, params) {
  const stable = findVariation(number, seed, params, 'hold');
  const reverse = counterfactual(number, seed, params);
  const sample = stable || reverse;
  if (!sample || (sample.call.options.length === 2 && (!stable || !reverse))) return null;
  if (params?.practiceGoal === 'hold') return stable;
  if (params?.practiceGoal === 'reverse') return reverse;
  const preferStable = createRng(seed ^ 0x71a5b03c)() < 0.5;
  return preferStable ? stable || reverse : reverse || stable;
}

export function nextPracticeGoal(seed, used) {
  const block = Math.floor(used / 8);
  const order = shuffle(createRng((seed ^ 0x71ac416e) + Math.imul(block,1274126177)),
    ['hold','hold','hold','hold','reverse','reverse','reverse','reverse']);
  return order[used % 8];
}

export function caseSeedForSlot(number, base, position, level) {
  // Draw from real situations for this operation, keeping the shift moving
  // between bedside, dispatch and follow-up without renaming the setting.
  const wanted = phaseCadence[position % phaseCadence.length];
  for (let pass = 0; pass < 24; pass++) {
    const seed = (base + Math.imul(pass, 747796405)) >>> 0;
    if (makeCall(number, seed, {level}).phase === wanted) return seed;
  }
  return base;
}
