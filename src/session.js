(function (root, factory) {
  const content = typeof module === 'object' && module.exports ? require('./curriculum.js') : root.FormContent;
  const api = factory(content);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FormSession = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Content) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const STAGES = new Set(Content.STAGES.map(s => s.id));
  const MODES = new Set(['guided', 'independent', 'explore']);
  const PHASES = new Set(['study', 'warmup', 'respond', 'feedback', 'paused', 'complete']);
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const plain = value => !!value && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  const sequential = challenge => challenge && ['function', 'sequence'].includes(challenge.kind);
  const warmup = challenge => challenge && (challenge.warmup === true || challenge.kind === 'warmup');
  const now = () => new Date().toISOString();
  function uid() { return 'mission-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10); }
  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze); Object.freeze(value);
    }
    return value;
  }
  function sameJSON(first, second) {
    if (first === second) return true;
    if (Array.isArray(first) || Array.isArray(second)) return Array.isArray(first) && Array.isArray(second) && first.length === second.length && first.every((value, i) => sameJSON(value, second[i]));
    if (!plain(first) || !plain(second)) return false;
    const a = Object.keys(first), b = Object.keys(second);
    return a.length === b.length && a.every(key => own(second, key) && sameJSON(first[key], second[key]));
  }
  function challengeFor(session) {
    return Content.generateChallenge(session.stageId, { seed: session.seed, ordinal: session.ordinal, history: session.history, lag: session.lag, focusFeature: session.focusFeature });
  }
  function nextChallenge(session) {
    session.challenge = clone(challengeFor(session));
    session.response = null;
    session.feedback = null;
    session.reveal = false;
    session.aided = session.mode !== 'independent';
    session.studySeen = false;
    session.resetCount = 0;
    session.responseRevisions = [];
    session.phase = session.challenge.warmup || session.challenge.kind === 'warmup' ? 'warmup' : session.challenge.kind === 'recall' ? 'study' : 'respond';
    return freeze(session);
  }
  function create(stageId, options) {
    if (!STAGES.has(stageId)) throw new Error('Choose one of the fourteen shapes.');
    const settings = options || {};
    const mode = MODES.has(settings.mode) ? settings.mode : 'guided';
    const lag = stageId === 'square' ? Math.max(1, Math.min(4, Math.round(Number(settings.lag) || 1))) : 0;
    const focusFeature = stageId === 'square' && mode === 'guided' ? settings.focusFeature === null ? null : ['color', 'shape', 'value'].includes(settings.focusFeature) ? settings.focusFeature : 'color' : null;
    const target = [8, 20].includes(settings.target) ? settings.target : 8;
    const seed = Number.isInteger(settings.seed) ? settings.seed >>> 0 : Math.floor(Math.random() * 4294967295);
    const id = typeof settings.id === 'string' && settings.id.trim() && settings.id.length <= 160 ? settings.id : uid();
    return nextChallenge({ id, stageId, mode, lag, focusFeature, lagUnit: stageId === 'square' ? 'observation' : 'none', target, seed, ordinal: 0, history: [], attemptIds: [], results: [], startedAt: now(), phase: 'respond', resumed: false });
  }
  // A sequential response is a valid prefix. A missing middle answer cannot
  // expose a later test result or allow a prediction to be backfilled.
  function validResponse(challenge, response) {
    if (!challenge || warmup(challenge)) return response === null;
    if (response === null) return true;
    const kind = challenge.kind;
    if (kind === 'choice' || kind === 'recall') return typeof response === 'string' && (challenge.options || []).some(o => o.id === response);
    if (kind === 'connect' || kind === 'order') {
      const choices = kind === 'connect' ? challenge.nodes || [] : challenge.options || [];
      return Array.isArray(response) && response.length <= (kind === 'connect' ? 2 : choices.length) && new Set(response).size === response.length && response.every(id => choices.some(o => o.id === id));
    }
    if (kind === 'mapping') return plain(response) && Object.keys(response).every(key => (challenge.left || []).some(n => n.id === key) && (challenge.right || []).some(n => n.id === response[key])) && new Set(Object.values(response)).size === Object.keys(response).length;
    if (sequential(challenge)) {
      if (!plain(response) || Object.keys(response).length > challenge.steps.length) return false;
      const count = Object.keys(response).length;
      return challenge.steps.every((step, index) => index < count ? own(response, step.id) && step.options.some(o => o.id === response[step.id]) : !own(response, step.id));
    }
    return false;
  }
  function responseComplete(challenge, response) {
    if (!challenge || warmup(challenge) || response === null || !validResponse(challenge, response)) return false;
    const kind = challenge.kind;
    if (kind === 'choice' || kind === 'recall') return typeof response === 'string' && (challenge.options || []).some(o => o.id === response);
    if (kind === 'connect') return Array.isArray(response) && response.length === 2 && new Set(response).size === 2 && response.every(id => (challenge.nodes || []).some(n => n.id === id));
    if (kind === 'order') return Array.isArray(response) && response.length === (challenge.options || []).length && new Set(response).size === response.length && response.every(id => challenge.options.some(o => o.id === id));
    if (kind === 'mapping') return !!response && !Array.isArray(response) && typeof response === 'object' && (challenge.left || []).every(n => (challenge.right || []).some(r => r.id === response[n.id])) && new Set(Object.values(response)).size === challenge.left.length;
    if (kind === 'function' || kind === 'sequence') return !!response && !Array.isArray(response) && typeof response === 'object' && (challenge.steps || []).every(step => step.options.some(o => o.id === response[step.id]));
    return false;
  }
  function stepProgress(session) {
    const challenge = session && session.challenge;
    if (!sequential(challenge)) return { currentIndex: -1, visibleCount: 0, lockedIds: [], complete: !!challenge && responseComplete(challenge, session.response) };
    const steps = challenge.steps;
    const count = validResponse(challenge, session.response) && plain(session.response) ? Object.keys(session.response).length : 0;
    const phase = session.phase === 'paused' ? session.resumePhase : session.phase;
    const finished = phase === 'feedback' || phase === 'complete';
    return { currentIndex: Math.min(count, steps.length - 1), visibleCount: finished ? steps.length : Math.min(count + 1, steps.length), lockedIds: steps.slice(0, finished ? steps.length : Math.min(count, steps.length - 1)).map(step => step.id), complete: count === steps.length };
  }
  function setResponse(session, response) {
    if (!session || session.phase !== 'respond' || warmup(session.challenge) || !validResponse(session.challenge, response)) return session;
    if (sequential(session.challenge)) {
      const previous = plain(session.response) ? session.response : {};
      if (!plain(response)) return session;
      const before = Object.keys(previous).length, after = Object.keys(response).length, steps = session.challenge.steps;
      if (after !== before + 1 && !(before === steps.length && after === before)) return session;
      const locked = Math.min(before, steps.length - 1);
      if (!steps.slice(0, locked).every(step => response[step.id] === previous[step.id])) return session;
    }
    if (sameJSON(session.response, response)) return session;
    const next = clone(session);
    next.response = response === null ? null : clone(response);
    return freeze(next);
  }
  function resetResponse(session) {
    if (!session || session.phase !== 'respond' || warmup(session.challenge)) return session;
    const next = clone(session);
    next.responseRevisions = (next.responseRevisions || []).concat([{ response: clone(next.response), revealedThrough: stepProgress(session).visibleCount, at: now() }]).slice(-16);
    next.response = null;
    next.resetCount = (next.resetCount || 0) + 1;
    // Later evidence cannot be unseen. A retry remains supported practice.
    next.aided = true;
    return freeze(next);
  }
  function reveal(session) {
    if (!session || !['study', 'respond'].includes(session.phase)) return session;
    return freeze(Object.assign(clone(session), { aided: true, reveal: true }));
  }
  function finishStudy(session) {
    if (!session || session.phase !== 'study' || session.challenge.kind !== 'recall') return session;
    return freeze(Object.assign(clone(session), { phase: 'respond', studySeen: true }));
  }
  function appendMemory(session) {
    const record = session.challenge && session.challenge.memoryRecord;
    if (record) {
      if (session.history.some(r => r.id === record.id)) throw new Error('An observation occurrence cannot be committed twice.');
      session.history.push(clone(record));
    }
    session.history = session.history.slice(-32);
  }
  function commitWarmup(session) {
    if (!session || session.phase !== 'warmup' || !warmup(session.challenge)) return session;
    const next = clone(session);
    appendMemory(next); next.ordinal++;
    return nextChallenge(next);
  }
  function submit(session, options) {
    if (!session || session.phase !== 'respond' || warmup(session.challenge) || session.challenge.kind === 'recall' && !session.studySeen) return { session, attempt: null };
    const skip = options && options.skip === true;
    if (!validResponse(session.challenge, session.response) || !skip && !responseComplete(session.challenge, session.response)) return { session, attempt: null };
    const next = clone(session);
    const result = Content.evaluateChallenge(next.challenge, next.response);
    const id = next.id + ':' + next.ordinal;
    if (next.attemptIds.includes(id)) return { session, attempt: null };
    const attempt = {
      id, stageId: next.stageId, mode: next.mode, lag: next.lag, lagUnit: next.lagUnit,
      correct: !skip && !!result.correct, aided: next.aided, tutorial: false,
      at: now(), sessionId: next.id, channelResults: clone(result.channelResults || {})
    };
    if (skip) for (const channel of Object.values(attempt.channelResults)) channel.correct = 0;
    if (next.stageId === 'square' && next.challenge.expectedClass) {
      attempt.expectedClass = next.challenge.expectedClass;
      // Square declares semantic class IDs. Other multi-step tasks use different
      // questions, so an "unknown" answer there is not a binary match statistic.
      const chosen = next.response && next.response.relation;
      attempt.responseClass = !skip && ['match', 'nonmatch', 'unknown'].includes(chosen) ? chosen : 'unanswered';
    }
    next.attemptIds.push(id);
    next.results.push({ id, correct: attempt.correct, aided: attempt.aided, skipped: !!skip, channelResults: clone(attempt.channelResults) });
    next.feedback = { correct: attempt.correct, explanation: result.explanation || next.challenge.explanation, skipped: !!skip, channelResults: attempt.channelResults };
    next.phase = 'feedback';
    return { session: freeze(next), attempt: freeze(attempt) };
  }
  function advance(session) {
    if (!session || session.phase !== 'feedback') return session;
    const next = clone(session);
    appendMemory(next);
    if (next.attemptIds.length >= next.target) { next.phase = 'complete'; return freeze(next); }
    next.ordinal++;
    return nextChallenge(next);
  }
  function pause(session) {
    if (!session || ['paused', 'complete'].includes(session.phase)) return session;
    return freeze(Object.assign(clone(session), { resumePhase: session.phase, phase: 'paused' }));
  }
  function resume(session) {
    if (!session || session.phase !== 'paused' || !PHASES.has(session.resumePhase) || ['paused', 'complete'].includes(session.resumePhase)) return session;
    const next = clone(session);
    next.phase = PHASES.has(next.resumePhase) && !['paused', 'complete'].includes(next.resumePhase) ? next.resumePhase : 'respond';
    delete next.resumePhase;
    return freeze(next);
  }
  function sessionRecord(session, complete) {
    return freeze({ id: session.id, stageId: session.stageId, mode: session.mode, lag: session.lag, lagUnit: session.lagUnit, complete: complete === true && session.phase === 'complete', at: now(), attemptIds: session.attemptIds.slice() });
  }
  function validChannels(channels) {
    return plain(channels) && Object.keys(channels).length > 0 && Object.entries(channels).every(([key, value]) => ['observation', 'binding', 'relation', 'mapping', 'function', 'revision'].includes(key) && plain(value) && Number.isInteger(value.correct) && Number.isInteger(value.total) && value.total > 0 && value.total <= 32 && value.correct >= 0 && value.correct <= value.total);
  }
  function restore(raw) {
    if (!plain(raw) || !STAGES.has(raw.stageId) || !MODES.has(raw.mode) || typeof raw.id !== 'string' || !raw.id.trim() || raw.id.length > 160) return null;
    if (!Number.isInteger(raw.seed) || raw.seed < 0 || raw.seed > 4294967295 || !Number.isInteger(raw.ordinal) || raw.ordinal < 0 || ![8, 20].includes(raw.target)) return null;
    if (!Number.isInteger(raw.lag) || (raw.stageId === 'square' ? raw.lag < 1 || raw.lag > 4 : raw.lag !== 0)) return null;
    // Completed missions belong in the progress log, not an active-session slot.
    if (!PHASES.has(raw.phase) || raw.phase === 'complete') return null;
    const focusFeature = raw.focusFeature === undefined ? null : raw.focusFeature;
    if (focusFeature !== null && (!['color', 'shape', 'value'].includes(focusFeature) || raw.stageId !== 'square' || raw.mode !== 'guided')) return null;
    const phase = raw.phase === 'paused' ? raw.resumePhase : raw.phase;
    if (!PHASES.has(phase) || phase === 'paused' || raw.phase === 'paused' && phase === 'complete') return null;
    const initialHistory = raw.stageId === 'square' ? raw.lag : 0;
    if (raw.ordinal >= initialHistory + raw.target) return null;
    if (!Array.isArray(raw.history) || raw.history.length > 32 || !Array.isArray(raw.attemptIds) || !Array.isArray(raw.results)) return null;
    if (new Set(raw.attemptIds).size !== raw.attemptIds.length || raw.history.some(r => !plain(r) || typeof r.id !== 'string') || new Set(raw.history.map(r => r.id)).size !== raw.history.length) return null;
    const scoredCurrent = phase === 'feedback';
    const expectedCount = Math.max(0, raw.ordinal - initialHistory) + (scoredCurrent ? 1 : 0);
    if (expectedCount > raw.target || raw.attemptIds.length !== expectedCount || raw.results.length !== expectedCount) return null;
    if (raw.attemptIds.some((id, index) => id !== raw.id + ':' + (initialHistory + index))) return null;
    if (raw.results.some((result, index) => !plain(result) || result.id !== raw.attemptIds[index] || typeof result.correct !== 'boolean' || typeof result.aided !== 'boolean' || !validChannels(result.channelResults))) return null;
    try {
      // Replay only the bounded committed sequence. The active challenge is
      // generated before its own record is appended.
      const replay = { stageId: raw.stageId, seed: raw.seed, lag: raw.lag, focusFeature, ordinal: 0, history: [] };
      let challenge;
      for (let index = 0; index <= raw.ordinal; index++) {
        replay.ordinal = index;
        replay.challenge = challenge = clone(challengeFor(replay));
        const resultIndex = index - initialHistory;
        if (resultIndex >= 0 && resultIndex < expectedCount) {
          const stored = raw.results[resultIndex];
          const expectedChannels = Content.evaluateChallenge(challenge, Content.answerFor(challenge)).channelResults;
          const names = Object.keys(expectedChannels);
          if (Object.keys(stored.channelResults).length !== names.length || !names.every(name => own(stored.channelResults, name) && stored.channelResults[name].total === expectedChannels[name].total)) return null;
          if (stored.correct && names.some(name => stored.channelResults[name].correct !== stored.channelResults[name].total)) return null;
        }
        if (index < raw.ordinal) appendMemory(replay);
      }
      if (!sameJSON(raw.history, replay.history)) return null;
      if (warmup(challenge) !== (phase === 'warmup')) return null;
      if (phase === 'study' && challenge.kind !== 'recall') return null;
      if (challenge.kind === 'recall' && phase !== 'study' && raw.studySeen !== true) return null;
      const response = raw.response === undefined ? null : clone(raw.response);
      if (!validResponse(challenge, response) || ['study', 'warmup'].includes(phase) && response !== null) return null;
      const revisions = raw.responseRevisions === undefined ? [] : raw.responseRevisions;
      if (!Array.isArray(revisions) || revisions.length > 16 || revisions.some(r => !plain(r) || !validResponse(challenge, r.response) || !Number.isInteger(r.revealedThrough) || r.revealedThrough < 0 || r.revealedThrough > (challenge.steps || []).length || typeof r.at !== 'string')) return null;
      const resetCount = raw.resetCount === undefined ? revisions.length : raw.resetCount;
      if (!Number.isInteger(resetCount) || resetCount < revisions.length || resetCount > 100000) return null;
      const next = {
        id: raw.id, stageId: raw.stageId, mode: raw.mode, lag: raw.lag, focusFeature,
        lagUnit: raw.stageId === 'square' ? 'observation' : 'none', target: raw.target,
        seed: raw.seed, ordinal: raw.ordinal, history: replay.history,
        attemptIds: raw.attemptIds.slice(), results: raw.results.map(r => ({ id: r.id, correct: r.correct, aided: r.aided, skipped: r.skipped === true, channelResults: clone(r.channelResults) })),
        startedAt: typeof raw.startedAt === 'string' ? raw.startedAt.slice(0, 80) : now(),
        phase, resumed: true, challenge, response, feedback: null,
        reveal: raw.reveal === true,
        aided: raw.mode !== 'independent' || raw.aided !== false || raw.reveal === true || resetCount > 0,
        studySeen: raw.studySeen === true, resetCount,
        responseRevisions: revisions.map(r => ({ response: clone(r.response), revealedThrough: r.revealedThrough, at: r.at.slice(0, 80) }))
      };
      if (scoredCurrent) {
        const last = next.results.at(-1);
        const skipped = last.skipped || !!(raw.feedback && raw.feedback.skipped === true);
        if (!skipped && !responseComplete(challenge, response)) return null;
        next.aided = next.aided || last.aided;
        const result = Content.evaluateChallenge(next.challenge, next.response);
        const channels = clone(result.channelResults || {});
        if (skipped) Object.values(channels).forEach(channel => { channel.correct = 0; });
        next.feedback = { correct: !skipped && !!result.correct, explanation: result.explanation, skipped, channelResults: channels };
        Object.assign(last, { correct: next.feedback.correct, aided: next.aided, skipped, channelResults: clone(channels) });
      }
      return pause(next);
    } catch (_) { return null; }
  }
  return { create, responseComplete, stepProgress, setResponse, resetResponse, reveal, finishStudy, commitWarmup, submit, advance, pause, resume, sessionRecord, restore };
});
