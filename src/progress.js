(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FormProgress = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const STORAGE_KEY = 'form.progress.v1';
  const STAGE_IDS = ['circle', 'half-circle', 'triangle', 'square', 'pentagon', 'hexagon', 'prism', 'heptagon', 'octagon', 'cube', 'dodecahedron', 'icosahedron', 'geodesic', 'sphere'];
  const CHANNELS = ['observation', 'binding', 'relation', 'mapping', 'function', 'revision'];
  const REQUIRED = {
    circle: ['observation'], 'half-circle': ['binding'], triangle: ['relation'],
    square: ['binding', 'relation'], pentagon: ['relation'], hexagon: ['binding'],
    prism: ['mapping'], heptagon: ['function'], octagon: ['mapping', 'function'], cube: ['mapping'],
    dodecahedron: ['function'], icosahedron: ['revision'], geodesic: ['revision'],
    sphere: ['mapping', 'function', 'revision']
  };
  const LIMITS = Object.freeze({ attempts: 3000, sessions: 1000, palace: 128, journal: 100, text: 8192, privateText: 3000, privateBytes: 8 * 1024 * 1024, logBytes: 8 * 1024 * 1024, importBytes: 32 * 1024 * 1024, activeSessionBytes: 262144 });
  const MODES = ['guided', 'independent', 'explore'];
  const CLASSES = ['match', 'nonmatch', 'unknown', 'unanswered'];
  const FORBIDDEN = new Set(['__proto__', 'prototype', 'constructor']);
  const own = (o, key) => Object.prototype.hasOwnProperty.call(o, key);
  const plain = o => !!o && typeof o === 'object' && !Array.isArray(o) && (Object.getPrototypeOf(o) === Object.prototype || Object.getPrototypeOf(o) === null);
  const clamp = (v, lo, hi, fallback) => typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : fallback;
  function text(v, cap) { return typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, cap || LIMITS.text) : ''; }
  function id(v) { return text(v, 160).trim(); }
  function utf8Bytes(value) {
    let bytes = 0;
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      if (code < 128) bytes++;
      else if (code < 2048) bytes += 2;
      else if (code >= 0xD800 && code <= 0xDBFF && i + 1 < value.length && value.charCodeAt(i + 1) >= 0xDC00 && value.charCodeAt(i + 1) <= 0xDFFF) { bytes += 4; i++; }
      else bytes += 3;
    }
    return bytes;
  }
  function privateLimit(message) {
    const error = new Error(message);
    error.code = 'FORM_PRIVATE_LIMIT';
    throw error;
  }
  function privateText(value, cap, label) {
    cap = cap || LIMITS.privateText;
    if (typeof value === 'string' && value.length > cap) privateLimit((label || 'A private text field') + ' exceeds ' + cap + ' characters. Keep the original file; its text has not been shortened.');
    return text(value, cap);
  }
  function trimLog(items, budget) {
    const kept = [];
    let used = 2;
    for (let i = items.length - 1; i >= 0; i--) {
      const size = utf8Bytes(JSON.stringify(items[i])) + (kept.length ? 1 : 0);
      if (used + size > budget) break;
      kept.push(items[i]); used += size;
    }
    return kept.reverse();
  }
  function date(v) {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2})$/.test(v)) return null;
    const parts = v.slice(0, 10).split('-').map(Number);
    const check = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    if (check.toISOString().slice(0, 10) !== v.slice(0, 10)) return null;
    const ms = Date.parse(v);
    if (!Number.isFinite(ms) || ms < 0 || ms > Date.now() + 5 * 60 * 1000) return null;
    return new Date(ms).toISOString();
  }
  function boundedJSON(value, depth) {
    depth = depth || 0;
    if (depth > 12) throw new Error('Saved content is too deeply nested.');
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'string') return text(value);
    if (typeof value === 'number') { if (!Number.isFinite(value)) throw new Error('Saved content contains an invalid number.'); return value; }
    if (Array.isArray(value)) {
      if (value.length > 256) throw new Error('Saved content contains an oversized list.');
      return value.map(v => v === undefined ? null : boundedJSON(v, depth + 1));
    }
    if (!plain(value)) throw new Error('Saved content must contain plain JSON values.');
    const keys = Object.keys(value);
    if (keys.length > 100) throw new Error('Saved content contains too many fields.');
    const out = {};
    keys.forEach(key => {
      const safeKey = text(key, 100);
      if (!FORBIDDEN.has(safeKey) && value[key] !== undefined) out[safeKey] = boundedJSON(value[key], depth + 1);
    });
    return out;
  }
  function defaultProgress() {
    return {
      schemaVersion: 1,
      preferences: { lag: 1, sessionLength: 8, pacing: 'manual', reducedMotion: false, breath: { inhale: 4, exhale: 4, sound: false, volume: 0.2 } },
      attempts: [], sessions: [], palace: [], journal: [], activeSession: null
    };
  }
  function preferences(raw) {
    const out = defaultProgress().preferences;
    if (!plain(raw)) return out;
    out.lag = Math.round(clamp(raw.lag, 1, 8, 1));
    out.sessionLength = Math.round(clamp(raw.sessionLength, 6, 40, 8));
    if (['manual', 'paced', 'free'].includes(raw.pacing)) out.pacing = raw.pacing;
    out.reducedMotion = raw.reducedMotion === true;
    if (plain(raw.breath)) {
      out.breath.inhale = clamp(raw.breath.inhale, 2, 8, 4);
      out.breath.exhale = clamp(raw.breath.exhale, 2, 8, 4);
      out.breath.sound = raw.breath.sound === true;
      out.breath.volume = clamp(raw.breath.volume, 0, 1, 0.2);
    }
    return out;
  }
  function channelResults(raw) {
    const result = {};
    if (!plain(raw)) return result;
    for (const channel of Object.keys(raw)) {
      const entry = raw[channel];
      if (!CHANNELS.includes(channel) || !plain(entry) || !Number.isInteger(entry.correct) || !Number.isInteger(entry.total) || entry.total < 1 || entry.total > 32 || entry.correct < 0 || entry.correct > entry.total) return {};
      result[channel] = { correct: entry.correct, total: entry.total };
    }
    return result;
  }
  function attempt(raw) {
    if (!plain(raw) || raw.warmup === true || !id(raw.id) || !STAGE_IDS.includes(raw.stageId) || !MODES.includes(raw.mode) || typeof raw.correct !== 'boolean') return null;
    const at = date(raw.at);
    if (!at || !Number.isInteger(raw.lag) || raw.lag < 0 || raw.lag > 8) return null;
    const channels = channelResults(raw.channelResults);
    const allCorrect = Object.keys(channels).length > 0 && Object.values(channels).every(c => c.correct === c.total);
    const result = {
      id: id(raw.id), stageId: raw.stageId, mode: raw.mode, lag: raw.lag,
      lagUnit: text(raw.lagUnit, 40) || 'observations', correct: raw.correct && allCorrect,
      aided: raw.aided !== false, tutorial: raw.tutorial !== false, at,
      sessionId: id(raw.sessionId), channelResults: channels
    };
    if (CLASSES.includes(raw.expectedClass)) result.expectedClass = raw.expectedClass;
    if (CLASSES.includes(raw.responseClass)) result.responseClass = raw.responseClass;
    return result;
  }
  function mergeAttempt(first, later) {
    const same = ['stageId', 'mode', 'lag', 'lagUnit', 'correct', 'sessionId', 'expectedClass', 'responseClass'].every(k => first[k] === later[k]) && JSON.stringify(first.channelResults) === JSON.stringify(later.channelResults);
    return Object.assign({}, first, { aided: first.aided || later.aided || !same, tutorial: first.tutorial || later.tutorial });
  }
  function session(raw) {
    if (!plain(raw) || !id(raw.id) || !STAGE_IDS.includes(raw.stageId) || !MODES.includes(raw.mode)) return null;
    const at = date(raw.at);
    if (!at || !Number.isInteger(raw.lag) || raw.lag < 0 || raw.lag > 8 || !Array.isArray(raw.attemptIds) || raw.attemptIds.length > 256) return null;
    return { id: id(raw.id), stageId: raw.stageId, mode: raw.mode, lag: raw.lag, lagUnit: text(raw.lagUnit, 40) || 'observations', complete: raw.complete === true, at, attemptIds: Array.from(new Set(raw.attemptIds.map(id).filter(Boolean))) };
  }
  function sourceRecord(raw) {
    if (!plain(raw)) return null;
    const output = { title: privateText(raw.title, 300, 'A source title'), body: privateText(raw.body, 4000, 'A source description'), items: [] };
    if (Array.isArray(raw.items) && raw.items.length > 16) privateLimit('A preserved source can contain at most 16 items. Keep the original file; no items have been discarded.');
    if (Array.isArray(raw.items)) raw.items.filter(plain).forEach(item => {
      const clean = { id: privateText(item.id, 160, 'A source identifier'), label: privateText(item.label, 1000, 'A source item'), color: privateText(item.color, 40), shape: privateText(item.shape, 40), role: privateText(item.role, 100) };
      if (typeof item.value === 'string') clean.value = privateText(item.value, 1000, 'A source value');
      else if (typeof item.value === 'boolean' || (typeof item.value === 'number' && Number.isFinite(item.value))) clean.value = item.value;
      output.items.push(clean);
    });
    return output;
  }
  function predictionRecord(raw) {
    if (!plain(raw) || typeof raw.condition !== 'string' || typeof raw.expected !== 'string' || typeof raw.revisionTrigger !== 'string') return null;
    const committedAt = date(raw.committedAt);
    const expected = privateText(raw.expected, 3000, 'A prediction');
    if (!committedAt || !expected.trim()) return null;
    return { condition: privateText(raw.condition, 3000, 'A prediction condition'), expected, revisionTrigger: privateText(raw.revisionTrigger, 3000, 'A revision condition'), committedAt };
  }
  function evidenceRecords(raw, prediction) {
    if (!Array.isArray(raw)) return [];
    if (raw.length > 20) privateLimit('An entry can contain at most 20 evidence records. Keep the original file; no evidence has been discarded.');
    const result = [];
    for (const item of raw) {
      if (result.length >= 20) break;
      if (!plain(item) || typeof item.observation !== 'string' || !item.observation.trim() || typeof item.revision !== 'string' || !['supports', 'challenges', 'unclear'].includes(item.verdict)) continue;
      const at = date(item.at);
      const observation = privateText(item.observation, 3000, 'An evidence observation');
      if (!at || !observation.trim() || prediction && Date.parse(at) < Date.parse(prediction.committedAt)) continue;
      result.push({ observation, verdict: item.verdict, revision: privateText(item.revision, 3000, 'An evidence revision'), at });
    }
    return result;
  }
  function privateEntry(raw, prefix, index) {
    const output = { id: privateText(raw.id, 160, 'An entry identifier').trim() || prefix + '-' + index };
    const personal = prefix === 'journal' || raw.kind === 'personal';
    output.kind = personal ? 'personal' : 'principle';
    for (const field of ['title', 'body', 'text', 'note', 'relation', 'function', 'recollection', 'referenceSource']) {
      if (own(raw, field)) output[field] = privateText(raw[field], field === 'title' ? 300 : 3000, 'An entry ' + field);
    }
    output.locus = privateText(raw.locus, 80, 'A palace location') || 'Atrium';
    output.stageId = STAGE_IDS.includes(raw.stageId) ? raw.stageId : 'circle';
    output.createdAt = date(raw.createdAt) || '';
    if (Array.isArray(raw.revisions) && raw.revisions.length > 20) privateLimit('An entry can contain at most 20 later notes. Keep the original file; no notes have been discarded.');
    output.revisions = (Array.isArray(raw.revisions) ? raw.revisions : []).filter(r => plain(r) && typeof r.text === 'string').map(r => ({ at: date(r.at) || '', text: privateText(r.text, 3000, 'A later note') }));
    output.source = personal ? privateText(raw.source, 3000, 'An original observation') : typeof raw.source === 'string' ? privateText(raw.source, 3000, 'A source') : sourceRecord(raw.source);
    output.private = personal || raw.private !== false || output.revisions.length > 0;
    const prediction = predictionRecord(raw.prediction);
    if (prediction) { output.prediction = prediction; output.private = true; }
    if (own(raw, 'evidence')) {
      output.evidence = evidenceRecords(raw.evidence, prediction);
      if (output.evidence.length) output.private = true;
    }
    if (own(raw, 'challengeId')) output.challengeId = id(raw.challengeId);
    if (own(raw, 'referenceId')) output.referenceId = id(raw.referenceId) || null;
    if (own(raw, 'referenceRevealed')) output.referenceRevealed = raw.referenceRevealed === true;
    if (own(raw, 'lag')) output.lag = Number.isInteger(raw.lag) && raw.lag >= 0 && raw.lag <= 8 ? raw.lag : 0;
    if (own(raw, 'lagUnit')) output.lagUnit = text(raw.lagUnit, 40);
    return output;
  }
  function records(raw, cap, prefix) {
    if (!Array.isArray(raw)) return [];
    if (raw.length > cap) privateLimit('This file contains more than ' + cap + ' ' + prefix + ' entries. Keep the original file; no private entries have been discarded.');
    const output = [], seen = new Set();
    raw.forEach((entry, index) => {
      try {
        if (typeof entry === 'string') entry = { text: entry };
        if (!plain(entry)) return;
        const clean = privateEntry(entry, prefix, index);
        if (seen.has(clean.id)) privateLimit('This file repeats a private entry identifier. Keep the original file; conflicting entries have not been merged or discarded.');
        seen.add(clean.id);
        output.push(clean);
      } catch (error) {
        if (error.code === 'FORM_PRIVATE_LIMIT') throw error;
        /* An unusable private entry does not invalidate other progress. */
      }
    });
    return output;
  }
  function privateCollectionBytes(state) {
    return utf8Bytes(JSON.stringify({ palace: Array.isArray(state.palace) ? state.palace : [], journal: Array.isArray(state.journal) ? state.journal : [] }));
  }
  function canStorePrivate(state) {
    try {
      if (!plain(state) || privateCollectionBytes(state) > LIMITS.privateBytes) return false;
      const normalized = { palace: records(state.palace, LIMITS.palace, 'palace'), journal: records(state.journal, LIMITS.journal, 'journal') };
      return privateCollectionBytes(normalized) <= LIMITS.privateBytes;
    } catch (_) { return false; }
  }
  function activeSession(raw) {
    if (!plain(raw) || !id(raw.id) || !STAGE_IDS.includes(raw.stageId) || !MODES.includes(raw.mode)) return null;
    try {
      const clean = boundedJSON(raw);
      if (utf8Bytes(JSON.stringify(clean)) > LIMITS.activeSessionBytes) return null;
      if (!Number.isInteger(clean.lag) || clean.lag < 0 || clean.lag > 8) return null;
      return clean;
    } catch (_) { return null; }
  }
  function validateProgress(raw) {
    if (typeof raw === 'string') {
      if (raw.length > LIMITS.importBytes || utf8Bytes(raw) > LIMITS.importBytes) throw new Error('This progress file is too large.');
      try { raw = JSON.parse(raw); } catch (_) { throw new Error('This is not valid progress JSON.'); }
    }
    if (!plain(raw)) throw new Error('Progress must be a JSON object.');
    if (raw.schemaVersion !== 1) throw new Error('Unsupported progress version. This build reads schema version 1.');
    const output = defaultProgress();
    output.preferences = preferences(raw.preferences);
    const attempts = new Map();
    (Array.isArray(raw.attempts) ? raw.attempts.slice(-LIMITS.attempts * 2) : []).forEach(item => {
      const clean = attempt(item);
      if (!clean) return;
      attempts.set(clean.id, attempts.has(clean.id) ? mergeAttempt(attempts.get(clean.id), clean) : clean);
    });
    output.attempts = trimLog(Array.from(attempts.values()).slice(-LIMITS.attempts), LIMITS.logBytes / 2);
    const sessions = new Map();
    (Array.isArray(raw.sessions) ? raw.sessions.slice(-LIMITS.sessions * 2) : []).forEach(item => {
      const clean = session(item);
      if (clean && !sessions.has(clean.id)) sessions.set(clean.id, clean);
    });
    output.sessions = trimLog(Array.from(sessions.values()).slice(-LIMITS.sessions), LIMITS.logBytes / 2);
    output.palace = records(raw.palace, LIMITS.palace, 'palace');
    output.journal = records(raw.journal, LIMITS.journal, 'journal');
    if (privateCollectionBytes(raw) > LIMITS.privateBytes || privateCollectionBytes(output) > LIMITS.privateBytes) privateLimit('Private records exceed the 8 MiB collection limit. Keep the original file or export your current collection before removing entries; no private text has been shortened.');
    output.activeSession = activeSession(raw.activeSession);
    return output;
  }
  function loadProgress(storage) {
    try {
      if (!storage || typeof storage.getItem !== 'function') return { state: defaultProgress(), warning: 'Storage is unavailable. Progress remains in this tab until exported.' };
      const raw = storage.getItem(STORAGE_KEY);
      if (raw === null || raw === undefined || raw === '') return { state: defaultProgress(), warning: null };
      return { state: validateProgress(raw), warning: null };
    } catch (error) { return { state: defaultProgress(), warning: 'Saved progress could not be read: ' + text(error.message, 180) }; }
  }
  function saveProgress(storage, state) {
    try {
      if (!storage || typeof storage.setItem !== 'function') throw new Error('Storage is unavailable; export your progress to keep a copy.');
      const raw = JSON.stringify(validateProgress(state));
      if (utf8Bytes(raw) > LIMITS.importBytes) throw new Error('Progress exceeds the storage size limit. Export a copy before clearing older private records.');
      storage.setItem(STORAGE_KEY, raw);
      return { ok: true, error: null };
    } catch (error) { return { ok: false, error: text(error.message, 220) || 'Progress could not be saved.' }; }
  }
  function recordAttempt(state, raw) {
    const next = validateProgress(state);
    const clean = attempt(Object.assign({ at: new Date().toISOString(), aided: false, tutorial: false }, raw));
    if (!clean) return next;
    const index = next.attempts.findIndex(item => item.id === clean.id);
    if (index >= 0) next.attempts[index] = mergeAttempt(next.attempts[index], clean);
    else next.attempts.push(clean);
    next.attempts = trimLog(next.attempts.slice(-LIMITS.attempts), LIMITS.logBytes / 2);
    return next;
  }
  function recordSession(state, raw) {
    const next = validateProgress(state);
    const clean = session(Object.assign({ at: new Date().toISOString() }, raw));
    if (clean && !next.sessions.some(item => item.id === clean.id)) next.sessions.push(clean);
    next.sessions = trimLog(next.sessions.slice(-LIMITS.sessions), LIMITS.logBytes / 2);
    return next;
  }
  function aggregate(items) {
    const channels = {};
    items.forEach(item => Object.keys(item.channelResults).forEach(name => {
      if (!channels[name]) channels[name] = { correct: 0, total: 0, accuracy: 0 };
      channels[name].correct += item.channelResults[name].correct;
      channels[name].total += item.channelResults[name].total;
    }));
    Object.values(channels).forEach(c => { c.accuracy = c.total ? c.correct / c.total : 0; });
    return channels;
  }
  function stageSummary(state, stageId) {
    const empty = { attempts: 0, correct: 0, accuracy: 0, independentCount: 0, practiceComplete: false, ready: false, mastered: false, days: [], stars: 0, channels: {} };
    if (!STAGE_IDS.includes(stageId)) return empty;
    // Scoring does not inspect private narratives. Avoid repeatedly copying a
    // potentially large private journal for each of the fourteen stage tiles.
    const clean = validateProgress(plain(state) ? { schemaVersion: state.schemaVersion, attempts: state.attempts, sessions: state.sessions } : state);
    const all = clean.attempts.filter(a => a.stageId === stageId);
    const lookup = new Map(all.map(a => [a.id, a]));
    const completed = new Set();
    let practiceComplete = false;
    clean.sessions.filter(s => s.stageId === stageId && s.complete && s.attemptIds.length).forEach(s => {
      const list = s.attemptIds.map(attemptId => lookup.get(attemptId));
      const consistent = list.every(a => a && a.sessionId === s.id && a.mode === s.mode && a.lag === s.lag && a.lagUnit === s.lagUnit);
      if (!consistent) return;
      list.forEach(a => completed.add(a.id));
      const practice = list.filter(a => !a.tutorial && REQUIRED[stageId].every(channel => own(a.channelResults, channel)));
      if (practice.length >= 6 && practice.filter(a => a.correct).length / practice.length >= 0.75) practiceComplete = true;
    });
    const required = REQUIRED[stageId];
    const independent = all.filter(a => completed.has(a.id) && a.mode === 'independent' && !a.aided && !a.tutorial && required.every(channel => own(a.channelResults, channel)));
    const groups = new Map();
    independent.forEach(a => {
      const key = a.lag + '|' + a.lagUnit;
      if (!groups.has(key)) groups.set(key, new Map());
      const day = a.at.slice(0, 10);
      const group = groups.get(key);
      if (!group.has(day)) group.set(day, []);
      group.get(day).push(a);
    });
    let bestDays = [];
    groups.forEach(days => {
      const passed = [];
      days.forEach((list, day) => {
        if (list.length < 20 || list.filter(a => a.correct).length / list.length < 0.85) return;
        const channels = aggregate(list);
        if (!required.every(name => channels[name] && channels[name].accuracy >= 0.85)) return;
        const nonmatches = list.filter(a => a.expectedClass === 'nonmatch');
        if (stageId === 'square' && (nonmatches.length < 5 || list.filter(a => a.expectedClass === 'match').length < 5)) return;
        if (nonmatches.length) {
          const correct = nonmatches.filter(a => a.responseClass ? a.responseClass === 'nonmatch' : (a.channelResults.relation ? a.channelResults.relation.correct === a.channelResults.relation.total : a.correct)).length;
          if (correct / nonmatches.length < 0.9) return;
        }
        passed.push(day);
      });
      passed.sort();
      if (passed.length > bestDays.length) bestDays = passed;
    });
    const counted = all.filter(a => !a.tutorial);
    const correct = counted.filter(a => a.correct).length;
    const mastered = bestDays.length >= 2;
    return { attempts: counted.length, correct, accuracy: counted.length ? correct / counted.length : 0, independentCount: independent.length, practiceComplete, ready: bestDays.length >= 1, mastered, days: bestDays, stars: mastered ? 3 : practiceComplete ? 2 : all.length ? 1 : 0, channels: aggregate(independent) };
  }
  function exportProgress(state, options) {
    const output = validateProgress(state);
    if (!options || options.includePrivate !== true) {
      output.journal = [];
      output.palace = output.palace.filter(entry => entry.private === false);
      output.activeSession = null;
    }
    return output;
  }
  function importProgress(raw) { return validateProgress(raw); }
  function clearProgress() { return defaultProgress(); }
  return { STORAGE_KEY, LIMITS, STAGE_IDS: STAGE_IDS.slice(), defaultProgress, loadProgress, saveProgress, validateProgress, canStorePrivate, recordAttempt, recordSession, stageSummary, exportProgress, importProgress, clearProgress };
});
