(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FormTrainingStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Private manual practice is deliberately separate from the earlier quiz data.
  // Nothing in this module sends data anywhere. Exports require a UI action.
  const STORAGE_KEY = 'poi.manual-practice.v1';
  const STAGE_IDS = Object.freeze(['circle', 'half-circle', 'triangle', 'square', 'pentagon', 'hexagon', 'prism', 'heptagon', 'octagon', 'cube', 'dodecahedron', 'icosahedron', 'geodesic', 'sphere']);
  const LIMITS = Object.freeze({ entries: 500, sessions: 500, text: 3000 });
  const ENTRY_FIELDS = ['id', 'stageId', 'exercise', 'streamId', 'createdAt', 'source', 'recollection', 'referenceId', 'referenceSource', 'lag', 'relation', 'revision'];
  const SESSION_FIELDS = ['id', 'stageId', 'exercise', 'endedAt', 'seconds', 'completed'];
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const plain = value => !!value && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  const clone = value => JSON.parse(JSON.stringify(value));
  const empty = () => ({ schemaVersion: 1, entries: [], sessions: [], readiness: {} });
  const fail = message => { throw new Error(message); };

  function fields(value, allowed, label) {
    if (!plain(value)) fail(label + ' must be a plain object.');
    if (Object.keys(value).some(key => !allowed.includes(key))) fail(label + ' contains an unsupported field. Nothing has been discarded.');
  }
  function text(value, field, required) {
    if (!own(value, field)) {
      if (required) fail('Missing ' + field + '.');
      return '';
    }
    const result = value[field];
    if (typeof result !== 'string') fail(field + ' must be text.');
    if (result.length > LIMITS.text) fail(field + ' exceeds ' + LIMITS.text + ' characters. Nothing has been shortened.');
    if (required && !result.trim()) fail(field + ' must not be empty.');
    return result;
  }
  function stage(value) {
    if (!own(value, 'stageId') || !STAGE_IDS.includes(value.stageId)) fail('Unknown shape.');
    return value.stageId;
  }
  function exercise(value) {
    if (!own(value, 'exercise') || !['heart', 'body'].includes(value.exercise)) fail('Unknown exercise.');
    return value.exercise;
  }
  function timestamp(value, field) {
    const result = text(value, field, true);
    // Accept ISO timestamps without rewriting their original representation.
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(result) || !Number.isFinite(Date.parse(result))) fail(field + ' must be a valid UTC timestamp.');
    if (new Date(result).toISOString().slice(0, 19) !== result.slice(0, 19)) fail(field + ' must be a valid calendar date.');
    return result;
  }
  function entry(value) {
    fields(value, ENTRY_FIELDS, 'An observation');
    if (!own(value, 'lag') || !Number.isInteger(value.lag) || value.lag < 1 || value.lag > 4) fail('Observation lag must be an integer from 1 to 4.');
    const referenceId = !own(value, 'referenceId') || value.referenceId === null || value.referenceId === '' ? null : text(value, 'referenceId', true);
    return {
      id: text(value, 'id', true), stageId: stage(value), exercise: exercise(value),
      streamId: text(value, 'streamId', true), createdAt: timestamp(value, 'createdAt'),
      source: text(value, 'source', true), recollection: text(value, 'recollection'),
      referenceId, referenceSource: text(value, 'referenceSource'), lag: value.lag,
      relation: text(value, 'relation'), revision: text(value, 'revision')
    };
  }
  function session(value) {
    fields(value, SESSION_FIELDS, 'A session');
    if (!own(value, 'seconds') || typeof value.seconds !== 'number' || !Number.isFinite(value.seconds) || value.seconds < 0) fail('Session seconds must be a finite nonnegative number.');
    if (!own(value, 'completed') || typeof value.completed !== 'boolean') fail('Session completion must be true or false.');
    return { id: text(value, 'id', true), stageId: stage(value), exercise: exercise(value), endedAt: timestamp(value, 'endedAt'), seconds: value.seconds, completed: value.completed };
  }
  function collection(values, cap, convert, label) {
    if (!Array.isArray(values)) fail(label + ' must be a list.');
    if (values.length > cap) fail(label + ' exceed the limit of ' + cap + '. Export a backup before resetting; nothing has been discarded.');
    const result = [], ids = new Set();
    for (const value of values) {
      const item = convert(value);
      if (ids.has(item.id)) fail(label + ' contain a repeated identifier.');
      ids.add(item.id);
      result.push(item);
    }
    return result;
  }
  function validate(value) {
    fields(value, ['schemaVersion', 'entries', 'sessions', 'readiness'], 'Practice data');
    if (!own(value, 'schemaVersion') || value.schemaVersion !== 1) fail('Unsupported manual-practice version.');
    if (!own(value, 'entries') || !own(value, 'sessions') || !own(value, 'readiness')) fail('Practice data is incomplete.');
    const entries = collection(value.entries, LIMITS.entries, entry, 'Observations');
    const sessions = collection(value.sessions, LIMITS.sessions, session, 'Sessions');
    const previous = [];
    for (const item of entries) {
      const history = previous.filter(other => other.stageId === item.stageId && other.exercise === item.exercise && other.streamId === item.streamId);
      const target = history[history.length - item.lag];
      if (item.referenceId !== null) {
        if (!target || item.referenceId !== target.id || item.referenceSource !== target.source) fail('An observation reference must preserve the exact earlier source at the chosen lag in its shape and exercise stream.');
      } else if (item.referenceSource !== '') fail('A source snapshot needs its earlier observation reference.');
      previous.push(item);
    }
    if (!plain(value.readiness)) fail('Readiness must be a plain object.');
    const readiness = {};
    for (const id of Object.keys(value.readiness)) {
      if (!STAGE_IDS.includes(id)) fail('Readiness contains an unknown shape.');
      const assessment = value.readiness[id];
      fields(assessment, ['heart', 'body'], 'Readiness');
      if (!own(assessment, 'heart') || !own(assessment, 'body') || typeof assessment.heart !== 'boolean' || typeof assessment.body !== 'boolean') fail('Readiness must contain a personal assessment for each exercise.');
      readiness[id] = { heart: assessment.heart, body: assessment.body };
    }
    return { schemaVersion: 1, entries, sessions, readiness };
  }

  function createStore(storage) {
    let data = empty(), baseline = null, originalRaw = null, warning = '', writable = false, blocked = false;
    const available = !!storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function';
    function result(ok, error) { return { ok, error: error || null }; }
    function memoryWarning(detail) {
      warning = 'Practice is kept in this tab only. Export a private backup before closing it. ' + detail;
      writable = false;
      return result(false, warning);
    }
    function reload() {
      if (!available) return memoryWarning('Browser storage is unavailable.');
      let raw;
      try { raw = storage.getItem(STORAGE_KEY); }
      catch (_) { return memoryWarning('Browser storage could not be read.'); }
      if (raw === undefined) raw = null;
      originalRaw = raw;
      try {
        const next = raw === null ? empty() : validate(JSON.parse(raw));
        data = next; baseline = raw; blocked = false; writable = true; warning = '';
        return result(true);
      } catch (error) {
        blocked = true; writable = false;
        warning = 'Saved manual practice could not be read. The original is untouched and browser writes are paused. Export the original before resetting. ' + error.message;
        return result(false, warning);
      }
    }
    function save(nextData) {
      let next;
      try {
        next = validate(nextData);
        if (next.entries.length < data.entries.length || data.entries.some((item, index) => JSON.stringify(item) !== JSON.stringify(next.entries[index]))) fail('Saved observations cannot be changed, removed, or reordered. Add a new observation, or explicitly reset all manual practice.');
      } catch (error) { return result(false, error.message); }
      // Keep the accepted private work available for export even if storage fails.
      data = next;
      if (blocked) return result(false, warning);
      if (!available) return memoryWarning('Browser storage is unavailable.');
      let current;
      try { current = storage.getItem(STORAGE_KEY); }
      catch (_) { return memoryWarning('Browser storage could not be checked before saving.'); }
      if (current === undefined) current = null;
      if (current !== baseline) {
        originalRaw = current; blocked = true; writable = false;
        warning = 'Manual practice changed in another tab. This tab’s work is retained, but browser writes are paused to protect both versions. Export this tab’s private backup before reloading.';
        return result(false, warning);
      }
      const encoded = JSON.stringify(data);
      try { storage.setItem(STORAGE_KEY, encoded); }
      catch (_) { return memoryWarning('Browser storage did not save this change; it may be full or unavailable.'); }
      baseline = encoded; originalRaw = encoded; warning = ''; writable = true;
      return result(true);
    }
    function reset() {
      // The caller must obtain explicit confirmation before this destructive action.
      // No other key (including the old quiz progress) is ever removed.
      if (available) {
        try {
          if (typeof storage.removeItem === 'function') storage.removeItem(STORAGE_KEY);
          else storage.setItem(STORAGE_KEY, JSON.stringify(empty()));
        } catch (_) { return memoryWarning('Manual practice could not be erased from browser storage.'); }
        baseline = typeof storage.removeItem === 'function' ? null : JSON.stringify(empty());
        data = empty(); originalRaw = baseline; blocked = false; writable = true; warning = '';
        return result(true);
      }
      data = empty(); originalRaw = null; baseline = null; blocked = false;
      memoryWarning('Browser storage is unavailable.');
      return result(true);
    }
    reload();
    return {
      // Defensive snapshots prevent callers from changing preserved source records.
      get data() { return clone(data); },
      get writable() { return writable; },
      get warning() { return warning; },
      get originalRaw() { return originalRaw; },
      save, exportJSON: () => JSON.stringify(data, null, 2), reset, reload
    };
  }
  return { STORAGE_KEY, STAGE_IDS, LIMITS, createStore };
});
