import { createWorld, migrate } from './world.mjs';
import { recoverFooting } from './travel.mjs';
// A rejected storage write retains this tab’s copy, and the UI can describe its durability honestly.
export const saveKey = 'xero.forest.journey.v1',
  settingsKey = 'xero.forest.controls.v1';
const forkKey = 'xero.forest.fork.v1',
  olderForkKey = 'xero.forest.crossroads.v1',
  historyKey = 'xero.forest.endings.v1',
  memory = new Map(),
  failed = new Set();
export function read(key) {
  if (failed.has(key)) return memory.get(key) ?? null;
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? (memory.get(key) ?? null) : JSON.parse(raw);
  } catch {
    return memory.get(key) ?? null;
  }
}
export function write(key, value) {
  const raw = JSON.stringify(value);
  memory.set(key, JSON.parse(raw));
  try {
    localStorage.setItem(key, raw);
    failed.delete(key);
    retryPending();
    return true;
  } catch {
    failed.add(key);
    return false;
  }
}
export function retryPending() {
  for (const key of [...failed]) {
    try {
      localStorage.setItem(key, JSON.stringify(memory.get(key)));
      failed.delete(key);
    } catch {
      /* Other pending records can be smaller. */
    }
  }
  return lasting();
}
export function lasting() {
  return ![saveKey, forkKey, historyKey].some((key) => failed.has(key));
}
export function newRun() {
  return (
    globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)
  );
}
export function restoreJourney(saved) {
  if (
    ![1, 2].includes(saved?.version) ||
    !saved.player ||
    ![saved.player.x, saved.player.z, saved.elapsed].every(Number.isFinite) ||
    saved.elapsed < 0 ||
    !Array.isArray(saved.actors) ||
    !saved.actors.length ||
    !saved.actors.every(
      (a) => a && typeof a.id === 'string' && Number.isFinite(a.x) && Number.isFinite(a.z)
    ) ||
    typeof saved.checkpoint !== 'string'
  )
    return null;
  // Saved actors include defeated foes, consumed objects and dynamic drops.
  // Migration introduces only the items added by subsequent world versions.
  const current = createWorld(),
    copy = JSON.parse(JSON.stringify(saved));
  const w = {
    ...current,
    ...copy,
    player: { ...current.player, ...copy.player },
    runId: copy.runId || newRun(),
    legacyCrossroads: copy.legacyCrossroads ?? (!copy.runId && Number.isFinite(copy.player.maxStamina)),
    events: [],
    mapOpen: false,
  };
  if (copy.player.feetY == null) delete w.player.feetY;
  if (w.dialogue && (!Array.isArray(w.dialogue.choices) || typeof w.dialogue.text !== 'string'))
    w.dialogue = null;
  if (w.ending && typeof w.ending.id !== 'string') w.ending = null;
  if (w.survey && (!Array.isArray(w.survey.trace) || !Array.isArray(w.survey.pins) || !w.survey.visits))
    delete w.survey;
  if (!Array.isArray(w.journal)) w.journal = [];
  if (copy.journeyEdition == null) delete w.journeyEdition;
  migrate(w);
  if (!w.ending && !w.sequence) recoverFooting(w);
  return w;
}
export function rememberFork(w, initial = false) {
  if (w.route !== 'undecided' || w.ending) return;
  const old = read(forkKey);
  if (old?.runId === w.runId && (initial || old.atFork)) return;
  write(forkKey, { runId: w.runId, atFork: !initial, world: { ...w, events: [], mapOpen: false } });
}
export function recallFork(w) {
  const record = read(forkKey);
  if (!record?.world || record.runId !== w.runId) {
    if (!w.legacyCrossroads) return null;
    const old = restoreJourney(read(olderForkKey));
    if (!old || old.route !== 'undecided' || old.ending) return null;
    old.runId = newRun();
    rememberFork(old);
    return old;
  }
  const next = restoreJourney(record.world);
  if (!next) return null;
  next.runId = newRun();
  rememberFork(next, !record.atFork);
  return next;
}
export const hasFork = (w) =>
  Boolean(
    w &&
      (read(forkKey)?.runId === w.runId || (w.legacyCrossroads && read(olderForkKey)?.route === 'undecided'))
  );
export function rememberEnding(w) {
  if (!w.ending) return;
  const history = pastJourneys(),
    id = w.runId + '-' + w.ending.id;
  if (history.some((item) => item.id === id)) return;
  write(historyKey, [
    { id, at: Date.now(), ending: { ...w.ending }, elapsed: w.elapsed, journal: [...(w.journal || [])] },
    ...history,
  ]);
}
const oldTitles = {
  saved: 'The Bell Falls Silent',
  feast: 'The Feast',
  bound: 'The Bound Way',
  horde: 'The Three Thousand',
  wilds: 'Lost to the Wilds',
};
export function pastJourneys() {
  const rows = read(historyKey);
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    if (typeof row === 'string' && oldTitles[row])
      return [
        {
          id: 'legacy-' + row,
          ending: { id: row, title: oldTitles[row], text: 'Recorded in an earlier journey.' },
          journal: [],
          legacy: true,
        },
      ];
    return row?.ending?.title ? [row] : [];
  });
}

export function journeyFile(w) {
  if (!w) return null;
  const fork = read(forkKey);
  return {
    format: 'xero-journey',
    version: 1,
    world: { ...w, events: [], mapOpen: false },
    fork: fork?.runId === w.runId ? fork : null,
  };
}
export function readJourneyFile(raw) {
  if (raw?.format !== 'xero-journey' || raw.version !== 1) return null;
  const world = restoreJourney(raw.world);
  if (!world) return null;
  const fork = raw.fork?.runId === world.runId ? restoreJourney(raw.fork.world) : null;
  return {
    world,
    fork:
      fork && fork.route === 'undecided' && !fork.ending
        ? { runId: world.runId, atFork: Boolean(raw.fork.atFork), world: fork }
        : null,
  };
}
export function applyJourneyFile(bundle) {
  if (bundle.fork) write(forkKey, bundle.fork);
  return write(saveKey, bundle.world);
}
