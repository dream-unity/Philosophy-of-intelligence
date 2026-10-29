'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { BreathGuide, phaseAt, sanitizeConfig } = require('../src/breath.js');

function harness() {
  let now = 0;
  let nextId = 0;
  const pending = new Map();
  const ticks = [];
  const states = [];
  return {
    ticks, states, pending,
    options: {
      now: () => now,
      setTimeout: (callback, delay) => { const id = nextId++; pending.set(id, { callback, at: now + delay }); return id; },
      clearTimeout: id => pending.delete(id),
      onTick: value => ticks.push(value),
      onState: value => states.push(value)
    },
    jump(value) { now = value; },
    fire() {
      const first = pending.entries().next().value;
      if (!first) return;
      pending.delete(first[0]);
      first[1].callback();
    }
  };
}

function fakeAudio() {
  const oscillators = [];
  const gains = [];
  let resumeCount = 0;
  let suspendCount = 0;
  let closeCount = 0;
  const parameter = () => ({
    changes: [],
    setValueAtTime(value, at) { this.changes.push({ value, at }); },
    linearRampToValueAtTime(value, at) { this.changes.push({ value, at }); },
    cancelScheduledValues() {}
  });
  const audio = {
    state: 'suspended', currentTime: 0, destination: {},
    resume() { resumeCount++; this.state = 'running'; },
    suspend() { suspendCount++; this.state = 'suspended'; },
    close() { closeCount++; this.state = 'closed'; },
    createOscillator() {
      const oscillator = {
        frequency: parameter(), stopped: [], disconnected: false, onended: null,
        connect() {}, start(at) { this.started = at; },
        stop(at) { this.stopped.push(at); }, disconnect() { this.disconnected = true; }
      };
      oscillators.push(oscillator);
      return oscillator;
    },
    createGain() {
      const gain = { gain: parameter(), connect() {}, disconnected: false, disconnect() { this.disconnected = true; } };
      gains.push(gain);
      return gain;
    }
  };
  return { audio, oscillators, gains, counts: () => ({ resumeCount, suspendCount, closeCount }) };
}

test('config defaults are optional 4/4 without holds, with bounded finite values', () => {
  assert.deepEqual(sanitizeConfig(), { inhale: 4, exhale: 4, sound: false, volume: 0.2 });
  assert.deepEqual(sanitizeConfig({ inhale: 0, exhale: 100, sound: 'false', volume: 5, hold: 100 }),
    { inhale: 2, exhale: 8, sound: false, volume: 1 });
  assert.deepEqual(sanitizeConfig({ inhale: NaN, exhale: Infinity, volume: null }), sanitizeConfig());
  assert.deepEqual(sanitizeConfig({ inhale: '2.5', exhale: '6', volume: '-1', sound: true }),
    { inhale: 2.5, exhale: 6, volume: 0, sound: true });
  const previous = { inhale: 6, exhale: 5, sound: true, volume: 0.1 };
  assert.deepEqual(sanitizeConfig({ inhale: undefined }, previous), previous);
});

test('phaseAt handles exact phase and cycle boundaries without holds', () => {
  assert.deepEqual(phaseAt(0), { phase: 'inhale', elapsed: 0, duration: 4, progress: 0, cycle: 0, totalElapsedMs: 0 });
  assert.equal(phaseAt(3999).phase, 'inhale');
  assert.deepEqual(phaseAt(4000), { phase: 'exhale', elapsed: 0, duration: 4, progress: 0, cycle: 0, totalElapsedMs: 4000 });
  assert.equal(phaseAt(7999).phase, 'exhale');
  assert.equal(phaseAt(8000).cycle, 1);
  assert.equal(phaseAt(8000).phase, 'inhale');
  assert.equal(phaseAt(10000).progress, 0.5);
  assert.equal(phaseAt(-10).totalElapsedMs, 0);
  assert.equal(phaseAt(NaN).totalElapsedMs, 0);
});

test('phaseAt supports asymmetric fractional durations and long elapsed time', () => {
  const config = { inhale: 2.5, exhale: 7.5 };
  const result = phaseAt(12500, config);
  assert.equal(result.phase, 'exhale');
  assert.equal(result.cycle, 1);
  assert.equal(result.elapsed, 0);
  assert.equal(phaseAt(16250, config).progress, 0.5);
  assert.equal(phaseAt(10000006250, config).cycle, 1000000);
  assert.equal(phaseAt(10000006250, config).progress, 0.5);
});

test('late timers use the monotonic clock and skip missed ticks', () => {
  const h = harness();
  const guide = new BreathGuide(h.options);
  guide.start();
  assert.equal(h.pending.size, 1);
  h.jump(25500);
  h.fire();
  assert.equal(h.ticks.length, 2);
  assert.equal(h.ticks[1].cycle, 3);
  assert.equal(h.ticks[1].elapsed, 1.5);
  assert.equal(h.pending.size, 1);
  h.jump(20000);
  assert.equal(guide.getSnapshot().totalElapsedMs, 25500);
  guide.destroy();
  assert.equal(h.pending.size, 0);
});

test('pause freezes phase, resume excludes paused time, stop resets', () => {
  const h = harness();
  const guide = new BreathGuide(h.options);
  guide.start();
  h.jump(2500);
  const paused = guide.pause();
  assert.equal(paused.progress, 0.625);
  assert.equal(paused.running, false);
  assert.equal(h.pending.size, 0);
  h.jump(90000);
  assert.equal(guide.getSnapshot().totalElapsedMs, 2500);
  guide.resume();
  assert.equal(guide.getSnapshot().totalElapsedMs, 2500);
  h.jump(91500);
  h.fire();
  assert.equal(guide.getSnapshot().phase, 'exhale');
  assert.equal(guide.getSnapshot().elapsed, 0);
  guide.stop();
  assert.equal(guide.getSnapshot().status, 'idle');
  assert.equal(guide.getSnapshot().totalElapsedMs, 0);
  assert.equal(h.pending.size, 0);
});

test('rapid toggles and stale callbacks cannot create additional timer loops', () => {
  const h = harness();
  const guide = new BreathGuide(h.options);
  guide.start();
  const stale = Array.from(h.pending.values())[0].callback;
  for (let i = 0; i < 20; i++) { guide.start(); guide.pause(); guide.resume(); }
  assert.equal(h.pending.size, 1);
  const count = h.ticks.length;
  stale();
  assert.equal(h.pending.size, 1);
  assert.equal(h.ticks.length, count);
  guide.destroy();
  const destroyedCount = h.ticks.length;
  guide.start(); guide.resume(); guide.pause(); guide.stop(); guide.setConfig({ sound: true }); stale();
  assert.equal(h.pending.size, 0);
  assert.equal(h.ticks.length, destroyedCount);
  assert.equal(guide.getSnapshot().status, 'destroyed');
});

test('duration edits preserve phase progress and caller cannot mutate internal config', () => {
  const h = harness();
  const guide = new BreathGuide(h.options);
  guide.start();
  h.jump(6000);
  guide.setConfig({ inhale: 2, exhale: 8 });
  const current = guide.getSnapshot();
  assert.equal(current.phase, 'exhale');
  assert.equal(current.progress, 0.5);
  assert.equal(current.elapsed, 4);
  assert.equal(current.totalElapsedMs, 6000);
  current.config.inhale = 900;
  assert.equal(guide.getSnapshot().config.inhale, 2);
  assert.equal(h.pending.size, 1);
  guide.pause();
  guide.setConfig({ exhale: 4 });
  assert.equal(guide.getSnapshot().elapsed, 2);
  assert.equal(h.pending.size, 0);
  guide.destroy();
});

test('silent default never creates audio and blocked audio does not break visual pacing', () => {
  const h = harness();
  let calls = 0;
  const guide = new BreathGuide({ ...h.options, audioContextFactory: () => { calls++; throw Error('blocked'); } });
  guide.start();
  assert.equal(calls, 0);
  guide.setConfig({ sound: true });
  assert.equal(calls, 1);
  assert.equal(guide.getSnapshot().running, true);
  assert.equal(h.pending.size, 1);
  guide.destroy();
});

test('distinct soft tones stop and disconnect on pause/stop/destroy without resume bursts', () => {
  const h = harness();
  const audio = fakeAudio();
  const guide = new BreathGuide({ ...h.options, audioContextFactory: () => audio.audio });
  guide.setConfig({ sound: true });
  guide.start();
  assert.equal(audio.oscillators.length, 1);
  assert.equal(audio.oscillators[0].frequency.changes[0].value, 392);
  assert.ok(audio.gains[0].gain.changes[1].value <= 0.08);
  h.jump(4000); h.fire();
  assert.equal(audio.oscillators.length, 2);
  assert.equal(audio.oscillators[1].frequency.changes[0].value, 293.66);
  guide.pause();
  assert.ok(audio.oscillators.every(item => item.disconnected));
  assert.ok(audio.gains.every(item => item.disconnected));
  h.jump(50000); guide.resume();
  assert.equal(audio.oscillators.length, 2);
  h.jump(54000); h.fire();
  assert.equal(audio.oscillators.length, 3);
  guide.stop();
  assert.ok(audio.oscillators.every(item => item.disconnected));
  guide.start();
  assert.equal(audio.oscillators.length, 4);
  guide.destroy(); guide.destroy();
  assert.equal(audio.counts().closeCount, 1);
  assert.ok(audio.oscillators.every(item => item.disconnected));
  assert.equal(h.pending.size, 0);
});

test('missed boundaries never produce a retrospective audio sequence', () => {
  const h = harness();
  const audio = fakeAudio();
  const guide = new BreathGuide({ ...h.options, config: { sound: true }, audioContextFactory: () => audio.audio });
  guide.start();
  h.jump(25500); h.fire();
  assert.equal(audio.oscillators.length, 1);
  h.jump(28000); h.fire();
  assert.equal(audio.oscillators.length, 2);
  guide.setConfig({ sound: false });
  assert.ok(audio.oscillators.every(item => item.disconnected));
  h.jump(32000); h.fire();
  assert.equal(audio.oscillators.length, 2);
  guide.destroy();
});

test('late audio-unlock promises cannot play after pause or destruction', async () => {
  const h = harness();
  const audio = fakeAudio();
  const pendingResumes = [];
  audio.audio.resume = function () {
    this.state = 'running';
    return new Promise(resolve => pendingResumes.push(resolve));
  };
  const guide = new BreathGuide({ ...h.options, config: { sound: true }, audioContextFactory: () => audio.audio });
  guide.start(); guide.pause(); guide.resume(); guide.stop(); guide.start(); guide.destroy();
  pendingResumes.forEach(resolve => resolve());
  await Promise.resolve();
  assert.equal(audio.oscillators.length, 0);
  assert.equal(audio.counts().closeCount, 1);
  assert.equal(h.pending.size, 0);
});

test('a consumer can stop from a tick without the tick restarting the scheduler', () => {
  const h = harness();
  let guide;
  guide = new BreathGuide({ ...h.options, onTick: snapshot => { if (snapshot.running) guide.pause(); } });
  guide.start();
  assert.equal(guide.getSnapshot().status, 'paused');
  assert.equal(h.pending.size, 0);
  guide.destroy();
});

test('UMD browser export works without Node or audio globals', () => {
  const context = { setTimeout, clearTimeout, performance: { now: () => 0 } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/breath.js'), 'utf8'), context);
  assert.equal(typeof context.FormBreath.BreathGuide, 'function');
  assert.equal(context.FormBreath.phaseAt(4000).phase, 'exhale');
});
