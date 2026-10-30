'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ExerciseClock, ExerciseAudio, HEART_PHASES, BODY_STEPS, HEART_DURATIONS, BODY_DURATIONS, STREAM_DURATIONS } = require('../src/exercises.js');

function clockHarness(exercise = 'heart', duration = 900) {
  let time = 0;
  const ticks = [];
  const completed = [];
  const clock = new ExerciseClock({ exercise, duration, now: () => time, onTick: state => ticks.push(state), onComplete: state => completed.push(state) });
  return { clock, ticks, completed, at(seconds) { time = seconds * 1000; return clock.tick(); } };
}

test('source durations and both complete manual exercise sequences are available', () => {
  assert.deepEqual(HEART_DURATIONS, [15, 30, 60, 120, 180]);
  assert.deepEqual(BODY_DURATIONS, [15, 30, 60]);
  assert.deepEqual(STREAM_DURATIONS, [15, 30, 60]);
  assert.equal(Object.isFrozen(STREAM_DURATIONS), true);
  assert.deepEqual(HEART_PHASES.map(phase => phase.id), ['early', 'middle', 'late']);
  assert.ok(HEART_PHASES.every(phase => phase.inhale.length > 40 && phase.exhale.length > 40));
  assert.deepEqual(BODY_STEPS.map(step => step.id), ['location', 'quality', 'intensity', 'movement', 'direction', 'coherence', 'meaning-tone']);
});

test('heart cadence changes exactly every five seconds and teaching phases use source boundaries', () => {
  const h = clockHarness();
  assert.equal(h.clock.snapshot().status, 'idle');
  const start = h.clock.start();
  assert.equal(start.breathPhase, 'inhale');
  assert.equal(start.breathRemaining, 5);
  assert.equal(h.at(4.999).breathPhase, 'inhale');
  assert.equal(h.at(5).breathPhase, 'exhale');
  assert.equal(h.at(5).breathRemaining, 5);
  assert.equal(h.at(10).breathPhase, 'inhale');
  assert.equal(h.at(296.999).heartPhaseIndex, 0);
  assert.equal(h.at(297).heartPhaseIndex, 1);
  assert.equal(h.at(593.999).heartPhaseIndex, 1);
  assert.equal(h.at(594).heartPhaseIndex, 2);
});

test('body mapping rotates seven thirty-second steps repeatedly without inventing duration phases', () => {
  const h = clockHarness('body', 1800);
  h.clock.start();
  assert.equal(h.at(29.999).bodyStepIndex, 0);
  for (let step = 1; step < 14; step++) {
    const state = h.at(step * 30);
    assert.equal(state.bodyStepIndex, step % 7);
    assert.equal(state.stepRemaining, 30);
  }
});

test('standalone consciousness-stream timing supports pause, resume and completion without counting entries', () => {
  const h = clockHarness('stream', 900);
  assert.equal(h.clock.start().exercise, 'stream');
  assert.equal(h.at(20).elapsedSeconds, 20);
  assert.equal(h.clock.pause().status, 'paused');
  assert.equal(h.at(700).elapsedSeconds, 20);
  assert.equal(h.clock.resume().status, 'running');
  assert.equal(h.at(710).elapsedSeconds, 30);
  const finished = h.at(1800);
  assert.equal(finished.status, 'completed');
  assert.equal(finished.elapsedSeconds, 900);
  assert.equal(h.completed.length, 1);
  assert.equal(Object.hasOwn(finished, 'entryCount'), false);
  assert.equal(Object.hasOwn(finished, 'readiness'), false);
  h.clock.tick();
  assert.equal(h.completed.length, 1);
});

test('frequent UI ticks do not accumulate fractional-second phase drift', () => {
  const h = clockHarness('heart', 900);
  h.clock.start();
  for (let tick = 1; tick <= 4500; tick++) {
    const state = h.at(tick / 5);
    if (tick % 25 === 0) {
      assert.equal(state.breathPhase, (tick / 25) % 2 === 0 ? 'inhale' : 'exhale');
      assert.equal(state.breathRemaining, tick === 4500 ? 0 : 5);
    }
  }
  assert.equal(h.clock.snapshot().status, 'completed');
  assert.equal(h.completed.length, 1);
});

test('pause excludes all inactive time and preserves the current instruction and breath', () => {
  const h = clockHarness();
  h.clock.start(); h.at(7.5);
  const paused = h.clock.pause();
  assert.equal(paused.status, 'paused');
  assert.equal(paused.breathPhase, 'exhale');
  assert.equal(paused.breathRemaining, 2.5);
  assert.equal(h.at(1007.5).elapsedSeconds, 7.5);
  h.clock.resume();
  const resumed = h.at(1010);
  assert.equal(resumed.elapsedSeconds, 10);
  assert.equal(resumed.breathPhase, 'inhale');
  assert.equal(resumed.status, 'running');
});

test('delayed ticks catch up once, clamp duration, and complete exactly once', () => {
  const h = clockHarness('body', 900);
  h.clock.start();
  const end = h.at(1000);
  assert.equal(end.status, 'completed');
  assert.equal(end.elapsedSeconds, 900);
  assert.equal(end.remainingSeconds, 0);
  assert.equal(end.progress, 1);
  assert.equal(end.breathRemaining, 0);
  assert.equal(end.stepRemaining, 0);
  h.at(2000); h.clock.snapshot(); h.clock.pause(); h.clock.end();
  assert.equal(h.completed.length, 1);
  assert.equal(h.clock.start().elapsedSeconds, 0);
  assert.equal(h.clock.snapshot().status, 'running');
});

test('ending does not count as completion, and backwards clock readings do not repeat elapsed time', () => {
  const h = clockHarness(); h.clock.start();
  h.at(10);
  assert.equal(h.at(5).elapsedSeconds, 10);
  assert.equal(h.at(12).elapsedSeconds, 12);
  assert.equal(h.clock.end().status, 'ended');
  assert.equal(h.at(900).elapsedSeconds, 12);
  assert.equal(h.completed.length, 0);
});

test('invalid exercise and duration are rejected', () => {
  assert.throws(() => new ExerciseClock({ exercise: 'quiz', duration: 900 }), TypeError);
  [0, -1, Infinity, NaN, '900'].forEach(duration => assert.throws(() => new ExerciseClock({ exercise: 'heart', duration }), TypeError));
});

test('audio is never created before explicit start and missing browser audio is graceful', () => {
  let calls = 0;
  const audio = new ExerciseAudio({ audioContextFactory: () => { calls++; return null; } });
  assert.equal(calls, 0);
  assert.equal(audio.cue(true), false);
  assert.equal(audio.preview(), false);
  assert.equal(audio.complete(), false);
  audio.stop();
  assert.equal(calls, 0);
  assert.equal(audio.start({ frequency: 10, bellVolume: 1 }), false);
  assert.equal(calls, 1);
  assert.doesNotThrow(() => audio.destroy());
});

test('audio stop cancels the delayed completion bell and destroy closes its context', () => {
  const pending = new Map(); let nextId = 0; let closes = 0;
  const audio = new ExerciseAudio({
    audioContextFactory: () => ({ state: 'running', close() { closes++; } }),
    setTimeout: (callback, delay) => { const id = ++nextId; pending.set(id, { callback, delay }); return id; },
    clearTimeout: id => pending.delete(id)
  });
  const strikes = [];
  audio._bowl = (frequency, peak, decay) => { strikes.push({ frequency, peak, decay }); return true; };
  assert.equal(audio.start({ frequency: 0, bellVolume: 0.48 }), true);
  audio.complete();
  assert.equal(strikes.length, 1);
  assert.equal(strikes[0].frequency, 392);
  assert.equal(pending.size, 1);
  audio.stop();
  assert.equal(pending.size, 0);
  audio.destroy();
  assert.equal(closes, 1);
});

test('bowl cues and both ambient bands build and release their Web Audio graphs', () => {
  const nodes = [];
  const pending = new Map(); let nextId = 0;
  const parameter = () => ({ value: 0, changes: [],
    setValueAtTime(value, at) { this.value = value; this.changes.push([value, at]); },
    exponentialRampToValueAtTime(value, at) { this.changes.push([value, at]); },
    linearRampToValueAtTime(value, at) { this.changes.push([value, at]); },
    cancelScheduledValues() {} });
  const node = kind => {
    const value = { kind, frequency: parameter(), gain: parameter(), Q: parameter(), pan: parameter(),
      connect() {}, disconnect() { this.disconnected = true; }, start() {}, stop() { this.stopped = true; } };
    nodes.push(value); return value;
  };
  const context = {
    state: 'running', currentTime: 0, sampleRate: 200, destination: {},
    createBuffer(channels, length) { const data = Array.from({ length: channels }, () => new Float32Array(length)); return { getChannelData: channel => data[channel] }; },
    createGain: () => node('gain'), createBiquadFilter: () => node('filter'),
    createOscillator: () => node('oscillator'), createStereoPanner: () => node('pan'),
    createConvolver: () => node('convolver'), createBufferSource: () => node('source'), close() {}
  };
  const audio = new ExerciseAudio({ audioContextFactory: () => context,
    setTimeout: (callback, delay) => { const id = ++nextId; pending.set(id, { callback, delay }); return id; },
    clearTimeout: id => pending.delete(id) });
  assert.equal(audio.start({ frequency: 0, bellVolume: 1 }), true);
  assert.equal(nodes.length, 0);
  audio.cue(true);
  assert.deepEqual(nodes.filter(item => item.kind === 'oscillator').map(item => item.frequency.value), [392, 392 * 1.003, 784, 392 * 2.76]);
  audio.start({ frequency: 1, bellVolume: 0.48 });
  assert.ok(nodes.some(item => item.kind === 'source'));
  assert.ok(nodes.some(item => item.kind === 'oscillator' && item.frequency.changes.some(([value, at]) => value === 1 && at === 60)));
  assert.equal(audio.cue(false), true);
  audio.start({ frequency: 10, bellVolume: 1.5 });
  assert.ok(nodes.some(item => item.kind === 'oscillator' && item.frequency.changes.some(([value, at]) => value === 10 && at === 60)));
  assert.equal(audio.cue(true), true);
  audio.destroy();
  assert.equal(pending.size, 0);
  assert.ok(nodes.every(item => item.disconnected));
  assert.ok(nodes.filter(item => item.kind === 'oscillator' || item.kind === 'source').every(item => item.stopped));
});

function suspendedAudioHarness(state = 'suspended') {
  const nodes = [], resumes = [], errors = [], timers = new Map(); let timerId = 0;
  const parameter = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} });
  const node = kind => {
    const value = { kind, frequency: parameter(), gain: parameter(), Q: parameter(), pan: parameter(),
      connect() {}, disconnect() { this.disconnected = true; }, start() { this.started = true; }, stop() { this.stopped = true; } };
    nodes.push(value); return value;
  };
  const context = {
    state, currentTime: 0, sampleRate: 100, destination: {},
    resume() { return new Promise((resolve, reject) => resumes.push({ resolve, reject })); },
    close() { this.state = 'closed'; },
    createBuffer(channels, length) { const data = Array.from({ length: channels }, () => new Float32Array(length)); return { getChannelData: channel => data[channel] }; },
    createGain: () => node('gain'), createBiquadFilter: () => node('filter'), createOscillator: () => node('oscillator'),
    createStereoPanner: () => node('pan'), createConvolver: () => node('convolver')
  };
  const audio = new ExerciseAudio({ audioContextFactory: () => context, onError: error => errors.push(error),
    setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout: id => timers.delete(id) });
  return { audio, context, nodes, resumes, errors, timers, oscillators: () => nodes.filter(item => item.kind === 'oscillator') };
}

test('a suspended test bell waits for audio activation before starting its sound or cleanup timer', async () => {
  const h = suspendedAudioHarness();
  assert.equal(h.audio.start({ frequency: 0 }), true);
  assert.equal(h.audio.cue(true), true);
  assert.equal(h.resumes.length, 1, 'resume is requested synchronously within the user action');
  assert.equal(h.nodes.length, 0);
  assert.equal(h.timers.size, 0, 'a blocked browser cannot dispose the sound before playback');
  h.context.currentTime = 12; h.context.state = 'running'; h.resumes[0].resolve();
  await Promise.resolve();
  assert.equal(h.oscillators().length, 4);
  assert.equal(h.oscillators()[0].frequency.value, 392);
  assert.ok(h.oscillators().every(oscillator => oscillator.started));
  assert.equal(h.timers.size, 1);
  h.audio.destroy();
});

test('interrupted audio resumes and plays only the latest pending phase cue', async () => {
  const h = suspendedAudioHarness('interrupted');
  h.audio.start({ frequency: 0 });
  h.audio.cue(true); h.audio.cue(false);
  assert.equal(h.resumes.length, 1);
  h.context.state = 'running'; h.resumes[0].resolve();
  await Promise.resolve();
  assert.equal(h.oscillators().length, 4, 'no backlog of inhale and exhale bells');
  assert.equal(h.oscillators()[0].frequency.value, 293.66);
  h.context.state = 'interrupted';
  h.audio.cue(true);
  assert.equal(h.resumes.length, 2, 'a later browser interruption is also recoverable');
  assert.equal(h.oscillators().length, 4);
  h.context.state = 'running'; h.resumes[1].resolve();
  await Promise.resolve();
  assert.equal(h.oscillators().length, 8);
  h.audio.destroy();
});

test('audio activation rejection reports failure and a later explicit start can retry', async () => {
  const h = suspendedAudioHarness();
  h.audio.start({ frequency: 0 }); h.audio.cue(true);
  h.resumes[0].reject(new Error('Playback blocked'));
  await Promise.resolve(); await Promise.resolve();
  assert.equal(h.errors.length, 1);
  assert.equal(h.errors[0].message, 'Playback blocked');
  assert.equal(h.nodes.length, 0);
  assert.equal(h.audio.cue(true), false);
  assert.equal(h.audio.start({ frequency: 0 }), true);
  h.audio.cue(false);
  h.context.state = 'running'; h.resumes[1].resolve();
  await Promise.resolve();
  assert.equal(h.oscillators().length, 4);
  assert.equal(h.oscillators()[0].frequency.value, 293.66);
  h.audio.destroy();
});

test('stop and destroy cancel pending audio without a late bell or error message', async () => {
  for (const action of ['stop', 'destroy']) {
    const h = suspendedAudioHarness();
    h.audio.start({ frequency: 0 }); h.audio.cue(true); h.audio[action]();
    h.context.state = 'running'; h.resumes[0].resolve();
    await Promise.resolve();
    assert.equal(h.nodes.length, 0, action + ' prevents late playback');
    assert.equal(h.timers.size, 0);
    assert.equal(h.errors.length, 0);
  }
  const h = suspendedAudioHarness();
  h.audio.start({ frequency: 0 }); h.audio.cue(true); h.audio.stop();
  h.resumes[0].reject(new Error('Old activation failed'));
  await Promise.resolve(); await Promise.resolve();
  assert.equal(h.errors.length, 0);
});

test('restarting while activation is pending discards the old cue and completion chimes', async () => {
  const h = suspendedAudioHarness();
  h.audio.start({ frequency: 0 }); h.audio.complete();
  h.audio.start({ frequency: 0 }); h.audio.cue(false);
  h.context.state = 'running'; h.resumes[0].resolve();
  await Promise.resolve();
  assert.equal(h.nodes.length, 0, 'the earlier promise cannot activate the new request');
  h.resumes[1].resolve();
  await Promise.resolve();
  assert.equal(h.oscillators().length, 4);
  assert.equal(h.oscillators()[0].frequency.value, 293.66);
  assert.equal(h.timers.size, 1, 'only this bell cleanup remains, without a completion chime');
  h.audio.destroy();
});

test('bell preview matches Project Meaning with inhale then exhale 650 ms after activation', async () => {
  const h = suspendedAudioHarness();
  h.audio.start({ frequency: 0 });
  assert.equal(h.audio.preview(), true);
  assert.equal(h.nodes.length, 0);
  assert.equal(h.timers.size, 0, 'the preview interval starts when sound is ready');
  h.context.state = 'running'; h.resumes[0].resolve();
  await Promise.resolve();
  assert.deepEqual(h.oscillators().map(oscillator => oscillator.frequency.value), [392, 392 * 1.003, 784, 392 * 2.76]);
  const preview = [...h.timers.values()].find(timer => timer.delay === 650);
  assert.ok(preview, 'the lower reference bell follows at 650 ms');
  preview.callback();
  assert.deepEqual(h.oscillators().slice(4).map(oscillator => oscillator.frequency.value), [293.66, 293.66 * 1.003, 587.32, 293.66 * 2.76]);
  h.audio.destroy();
});

test('stop, destroy and restart cancel both pending and between-strike bell previews', async () => {
  for (const action of ['stop', 'destroy', 'start']) {
    for (const state of ['suspended', 'running']) {
      const h = suspendedAudioHarness(state);
      h.audio.start({ frequency: 0 }); h.audio.preview();
      const count = h.oscillators().length;
      h.audio[action]({ frequency: 0 });
      if (state === 'suspended') {
        h.context.state = 'running'; h.resumes[0].resolve();
        await Promise.resolve();
      }
      assert.equal(h.oscillators().length, count, action + ' prevents a delayed preview note');
      assert.equal(h.timers.size, 0, action + ' clears the preview interval');
      h.audio.destroy();
    }
  }
  const h = suspendedAudioHarness('running');
  h.audio.start({ frequency: 0, bellVolume: 0 });
  assert.equal(h.audio.preview(), false);
  assert.equal(h.nodes.length, 0);
  assert.equal(h.timers.size, 0);
  h.audio.destroy();
});
