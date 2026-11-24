export const TARGET_COUNT = 10;
export const LANES = 5;

function shuffled(items, random) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const species = ['cyclops', 'stalker', 'reader', 'moth', 'crab'];

const names = ['Pip', 'Zig', 'Mox', 'Vela', 'Juno', 'Kip', 'Orin', 'Nix', 'Luma', 'Finn', 'Rook', 'Mira', 'Tavi', 'Lex', 'Zuri', 'Nova', 'Dex', 'Tess'];

function spawn(round, lane) {
  const id = round.next++;
  const target = {
    id, lane, name: round.names[id], role: round.roles[id],
    species: round.cast[id % species.length],
    duration: round.speeds[lane] + round.random() * 0.65,
    elapsed: 0
  };
  round.targets[lane] = target;
}

export function newRound(random = Math.random) {
  const roleBag = () => shuffled(['friend', 'foe', 'friend', 'foe', random() < .5 ? 'friend' : 'foe'], random);
  const round = {
    random, next: 0, targets: [], results: [], phase: 'approach',
    names: shuffled(names, random),
    roles: [...roleBag(), ...roleBag(), ...roleBag()],
    cast: shuffled(species, random),
    speeds: shuffled([8, 10, 12, 14, 16], random)
  };
  for (let lane = 0; lane < LANES; lane++) spawn(round, lane);
  return round;
}

export function decide(round, target, action) {
  if (round.phase !== 'approach' || round.targets[target.lane] !== target) return;
  const {role, name} = target;
  const correct = role === 'foe' ? action === 'fire' : action === 'pass';
  round.results.push({role, name, action, correct});
  if (round.results.length === TARGET_COUNT) round.phase = 'complete';
  else spawn(round, target.lane);
}

export function advance(round, seconds) {
  // Resolve simultaneous arrivals in time order, even after a long frame.
  while (round.phase === 'approach' && seconds > 0) {
    const next = round.targets.reduce((a, b) => a.duration - a.elapsed <= b.duration - b.elapsed ? a : b);
    const remaining = Math.max(0, next.duration - next.elapsed);
    const step = Math.min(seconds, remaining);
    for (const target of round.targets) target.elapsed += step;
    if (seconds < remaining) break;
    seconds -= step;
    decide(round, next, 'pass');
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
