// A round has one live target at a time. All timing uses seconds of active play.
export const TARGET_COUNT = 10;
export const CHANGEOVER = 0.7;

function shuffled(items, random) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const species = ['cyclops', 'stalker', 'reader', 'moth', 'crab'];

export function newRound(random = Math.random) {
  const roles = shuffled(Array.from({length: TARGET_COUNT}, (_, i) => i < TARGET_COUNT / 2 ? 'friend' : 'foe'), random);
  const durations = shuffled(Array.from({length: TARGET_COUNT}, (_, i) => 5.3 + 0.4 * i + 0.15 * random()), random);
  const appearances = [...shuffled(species, random), ...shuffled(species, random)];
  const lanes = shuffled([-1, 0, 1, -1, 0, 1, -1, 0, 1, Math.floor(random() * 3) - 1], random);
  return {
    targets: roles.map((role, i) => ({role, duration: durations[i], species: appearances[i], lane: lanes[i]})),
    index: 0,
    elapsed: 0,
    feedbackTime: 0,
    phase: 'approach',
    results: []
  };
}

export function decide(round, action) {
  if (round.phase !== 'approach') return;
  const {role} = round.targets[round.index];
  const correct = role === 'foe' ? action === 'fire' : action === 'pass';
  round.results.push({role, action, correct});
  round.feedbackTime = 0;
  round.phase = 'feedback';
}

export function advance(round, seconds) {
  if (round.phase === 'approach') {
    const {duration} = round.targets[round.index];
    round.elapsed = Math.min(duration, round.elapsed + seconds);
    if (round.elapsed >= duration) decide(round, 'pass');
  } else if (round.phase === 'feedback') {
    round.feedbackTime += seconds;
    if (round.feedbackTime >= CHANGEOVER) {
      if (round.results.length === TARGET_COUNT) {
        round.phase = 'complete';
      } else {
        round.index++;
        round.elapsed = 0;
        round.phase = 'approach';
      }
    }
  }
}

export function totals(round) {
  let foes = 0;
  let friends = 0;
  for (const result of round.results) {
    if (result.correct && result.role === 'foe') foes++;
    if (result.correct && result.role === 'friend') friends++;
  }
  return {foes, friends, correct: foes + friends, score: (foes + friends) * 100};
}
