import { createWorld, migrate } from './world.mjs';
// A rejected storage write retains this tab’s copy, and the UI can describe its durability honestly.
export const saveKey = 'xero.forest.journey.v1',
  settingsKey = 'xero.forest.controls.v1';
const forkKey = 'xero.forest.fork.v1',
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
    return true;
  } catch {
    failed.add(key);
    return false;
  }
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
  migrate(w);
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
  if (!record?.world || record.runId !== w.runId) return null;
  const next = { ...record.world, runId: newRun(), events: [], mapOpen: false };
  rememberFork(next, !record.atFork);
  return next;
}
export const hasFork = (w) => read(forkKey)?.runId === w?.runId;
export function rememberEnding(w) {
  if (!w.ending) return;
  const history = read(historyKey) || [],
    id = w.runId + '-' + w.ending.id;
  if (history.some((item) => item.id === id)) return;
  write(historyKey, [
    { id, at: Date.now(), ending: { ...w.ending }, elapsed: w.elapsed, journal: [...(w.journal || [])] },
    ...history,
  ]);
}
export const pastJourneys = () => read(historyKey) || [];
