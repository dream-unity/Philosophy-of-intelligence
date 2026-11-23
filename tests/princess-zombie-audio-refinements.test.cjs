const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const originalAudioContext = globalThis.AudioContext;
let createAudio, createWorld, createScore, playEnding, raceMargin;
before(async () => {
  ({ createAudio } = await import('../zelda-and-the-princess-zombie/audio.mjs'));
  ({ createWorld } = await import('../zelda-and-the-princess-zombie/world.mjs'));
  ({ createScore, playEnding, raceMargin } = await import(
    '../zelda-and-the-princess-zombie/sound-score.mjs'
  ));
});

function traceContext() {
  const starts = [];
  const param = () => ({
    value: 0,
    first: undefined,
    setValueAtTime(v) {
      this.value = v;
      this.first ??= v;
    },
    cancelScheduledValues() {},
    setTargetAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
  });
  const node = (kind) => ({
    kind,
    gain: param(),
    frequency: param(),
    pan: param(),
    Q: param(),
    delayTime: param(),
    outputs: [],
    connect(other) {
      this.outputs.push(other);
      return other;
    },
    disconnect() {},
    start(at = 0) {
      const [first] = this.outputs;
      const envelope = kind === 'noise' ? first?.outputs[0] : first;
      const panner = envelope?.outputs[0];
      starts.push({
        kind,
        at,
        shape: this.type,
        frequency: kind === 'noise' ? first?.frequency.value : this.frequency.first,
        pan: panner?.kind === 'pan' ? panner.pan.value : 0,
      });
    },
    stop() {},
  });
  return {
    starts,
    state: 'running',
    currentTime: 0,
    sampleRate: 8000,
    destination: node('out'),
    createGain: () => node('gain'),
    createOscillator: () => node('note'),
    createBufferSource: () => node('noise'),
    createBiquadFilter: () => node('filter'),
    createDelay: () => node('delay'),
    createStereoPanner: () => node('pan'),
    createBuffer: (_c, n, r) => ({ duration: n / r, getChannelData: () => new Float32Array(n) }),
    async resume() {
      this.state = 'running';
    },
    async suspend() {
      this.state = 'suspended';
    },
    async close() {
      this.state = 'closed';
    },
  };
}
function fixture(t) {
  const ctx = traceContext();
  globalThis.AudioContext = class {
    constructor() {
      return ctx;
    }
  };
  const audio = createAudio(),
    w = createWorld();
  Object.assign(w, { greeted: true, route: 'wander' });
  Object.assign(w.player, { x: 10, z: 100, yaw: 0, surface: 'leaves' });
  audio.unlock();
  audio.update(w);
  ctx.starts.length = 0;
  t.after(() => {
    audio.dispose();
    globalThis.AudioContext = originalAudioContext;
  });
  return { ctx, audio, w };
}
const voiced = (ctx, f) => ctx.starts.filter((v) => v.frequency === f);

test('fixed-tick walking, turning and sprint recovery sound the same at 30, 60 and 120 display Hz', (t) => {
  const run = (frames) => {
    const { ctx, audio, w } = fixture(t);
    for (let i = 1; i <= 30 * 24; i++) {
      const sec = i / 30,
        speed = sec < 2 ? 3.95 : sec < 8 ? 6.5 : 0;
      w.elapsed = sec;
      w.player.stamina =
        sec < 2 ? 1 : sec < 8 ? 1 - (sec - 2) * 0.082 : Math.min(1, 0.51 + (sec - 8) * 0.115);
      w.player.x += (sec >= 5 ? speed : 0) / 30;
      w.player.z += (sec < 5 ? speed : 0) / 30;
      for (let frame = 0; frame < frames; frame++) {
        ctx.currentTime = sec + frame / (30 * frames);
        audio.update(w);
      }
    }
    const footfalls = voiced(ctx, 76),
      turnAndBrake = voiced(ctx, 2060),
      recovery = voiced(ctx, 638);
    assert.ok(footfalls.length > 16 && footfalls.length < 36);
    assert.equal(turnAndBrake.filter((n) => n.at > 4.9 && n.at < 5.3).length, 1);
    assert.equal(turnAndBrake.filter((n) => n.at > 7.95 && n.at < 8.5).length, 1);
    assert.ok(recovery.length >= 2 && recovery.every((n) => n.at > 8 && n.at < 20));
    return [footfalls, turnAndBrake, recovery].map((notes) => notes.map((n) => +n.at.toFixed(3)));
  };
  assert.deepEqual(run(1), run(2));
  assert.deepEqual(run(2), run(4));
});

test('scores have recognisable locations and endings, and use the race clock and actual threats', () => {
  const signatures = new Set();
  for (const [x, z] of [
    [0, 110],
    [-155, 850],
    [30, 1480],
  ]) {
    const w = createWorld();
    Object.assign(w.player, { x, z });
    const notes = [],
      score = createScore();
    for (let t = 0; t < 7; t += 0.25) score(w, t, (...note) => notes.push(note));
    signatures.add(JSON.stringify(notes.map(([shape, f, , t, len]) => [shape, f, t, len])));
  }
  assert.equal(signatures.size, 3);
  const endings = ['feast', 'bound', 'saved', 'horde', 'wilds'].map((id) => {
    const notes = [];
    playEnding(id, 1, (...v) => notes.push(v));
    return JSON.stringify(notes);
  });
  assert.equal(new Set(endings).size, 5);
  const w = createWorld();
  Object.assign(w, { greeted: true, route: 'guided', elapsed: 120 });
  Object.assign(w.player, { x: 50, z: 450 });
  const lead = raceMargin(w);
  w.raceGrace = 20;
  assert.equal(Math.round(raceMargin(w) - lead), 20);
  w.elapsed += 15;
  assert.equal(Math.round(raceMargin(w) - lead), 5);
  w.player.z += 120;
  assert.ok(raceMargin(w) > lead + 22);
  const combat = (x, z) => {
    const w = createWorld();
    w.route = 'wander';
    Object.assign(w.player, { x, z });
    w.actors = [{ type: 'wolf', alive: true, alerted: true, x: x + 2, z, windupUntil: 5 }];
    const result = [],
      score = createScore();
    for (let t = 0; t < 3; t += 0.15) score(w, t, (...v) => result.push(v));
    return result.filter((n) => n[0] === 'sine' && n[1] < 100);
  };
  assert.equal(combat(0, 9).length, 0);
  assert.ok(combat(80, 303).length > 1);
});

test('warning direction, distinct terrain and materials, staggered replies, close rope and staff details', (t) => {
  const { audio, ctx, w } = fixture(t);
  const run = (type, text, extras = {}) => {
    ctx.starts.length = 0;
    audio.cue({ type, text, ...extras });
    return ctx.starts.slice();
  };
  w.player.x = 20;
  w.player.z = 1506;
  w.player.yaw = 0;
  const call = run('bell', 'tower');
  assert.equal(call.filter((n) => n.frequency === 1010).length, 3);
  const notes = call.filter((n) => [207.65, 293.66, 246.94].includes(n.frequency));
  assert.deepEqual(
    notes.map((n) => n.frequency),
    [207.65, 293.66, 246.94]
  );
  assert.deepEqual(
    notes.map((n) => Math.round((n.at - notes[0].at) * 100)),
    [0, 46, 92]
  );
  w.player.z = 1100;
  assert.equal(run('bell', 'tower').filter((n) => n.frequency === 1010).length, 0);
  Object.assign(w, { elapsed: 270 });
  w.player.x = -120;
  const reply = run('answer', 'host').filter((n) => n.kind === 'noise');
  assert.equal(reply.length, 4);
  assert.ok(Math.max(...reply.map((n) => n.at)) - Math.min(...reply.map((n) => n.at)) > 0.3);
  assert.ok(new Set(reply.map((n) => n.pan.toFixed(3))).size >= 3);
  const wolf = { x: w.player.x + 8, z: w.player.z + 2 };
  const left = run('howl', 'wolf', wolf).find((n) => n.frequency === 420);
  w.player.yaw = Math.PI;
  const right = run('howl', 'wolf', wolf).find((n) => n.frequency === 420);
  assert.ok(left.pan > 0.6 && right.pan < -0.6);
  const signature = (t, k) => JSON.stringify(run(t, k).map((v) => [v.shape, v.frequency, v.at]));
  assert.equal(new Set(['wolf', 'troll', 'dragon'].map((k) => signature('telegraph', k))).size, 3);
  assert.equal(
    new Set(['drink', 'fill', 'shatter', 'veil', 'lure', 'sip'].map((k) => signature('potion', k))).size,
    6
  );
  assert.equal(new Set(['song', 'alarm', 'wings'].map((k) => signature('fieldbird', k))).size, 3);
  assert.equal(new Set(['single', 'reply', 'orchard'].map((k) => signature('knock', k))).size, 3);
  assert.notEqual(signature('relay', 'brace'), signature('relay', 'slip'));
  const dry = signature('strike', 'thrust');
  assert.equal(
    new Set([dry, ...['wood', 'metal', 'stone', 'wolf'].map((k) => signature('impact', k))]).size,
    5
  );
  w.player.x = 29;
  w.player.z = 1515;
  assert.equal(new Set(['chew', 'hoof', 'breath', 'ribbon'].map((k) => signature('meal', k))).size, 4);
  assert.ok(run('release', 'hart', { x: 31, z: 1517 }).filter((n) => n.frequency === 1880).length >= 3);
  w.dialogue = { kind: 'witch' };
  assert.ok(run('dialogue').some((n) => n.frequency === 1960));
});

test('bellglass continues sounding from its impact position as Zelda turns and falls silent when spent', (t) => {
  const { audio, ctx, w } = fixture(t);
  const impact = { x: w.player.x + 6, z: w.player.z + 1, at: 10, until: 22 };
  w.fieldMedicine = { lure: impact };
  function listen(time, yaw) {
    ctx.starts.length = 0;
    ctx.currentTime = w.elapsed = time;
    w.player.yaw = yaw;
    audio.update(w);
    return voiced(ctx, 832);
  }
  assert.equal(listen(10.1, 0).length, 0);
  assert.ok(listen(11.4, 0)[0].pan > 0.65);
  assert.equal(listen(11.7, 0).length, 0);
  assert.ok(listen(13, Math.PI)[0].pan < -0.65);
  assert.equal(listen(22.1, 0).length, 0);
});

test('walking follows the actual surface and stops while airborne', (t) => {
  const { ctx, audio, w } = fixture(t),
    signatures = new Set();
  for (const [i, surface] of ['grass', 'gravel', 'wood', 'stone', 'water', 'leaves', 'wetstone'].entries()) {
    w.player = {
      ...w.player,
      x: surface === 'wetstone' ? -125 : 0,
      z: surface === 'wetstone' ? 1012 : 20,
      surface: surface === 'wetstone' ? 'water' : surface,
    };
    w.elapsed = 50 + i * 3;
    audio.update(w);
    ctx.starts.length = 0;
    for (let j = 1; j <= 4; j++) {
      ctx.currentTime += 0.15;
      w.elapsed += 0.15;
      w.player.z += 0.61;
      audio.update(w);
    }
    const footprint = ctx.starts.filter((n) => n.kind === 'noise' || n.frequency < 330);
    assert.ok(footprint.length >= 2);
    signatures.add(JSON.stringify(footprint.map((n) => [n.kind, n.frequency])));
  }
  assert.equal(signatures.size, 7);
  w.player.surface = 'leaves';
  w.player.airborne = true;
  ctx.starts.length = 0;
  for (let j = 0; j < 20; j++) {
    ctx.currentTime += 0.04;
    w.elapsed += 0.04;
    w.player.z += 0.2;
    audio.update(w);
  }
  assert.equal(voiced(ctx, 76).length, 0);
  audio.cue({ type: 'land', text: 'leaves' });
  assert.equal(voiced(ctx, 76).length, 1);
});

test('representative device checks use the effects mix and respect silence and disposal', async (t) => {
  const { audio, ctx } = fixture(t);
  for (const id of ['step', 'wolf', 'bell']) {
    ctx.starts.length = 0;
    assert.equal(await audio.preview(id), true);
    assert.ok(ctx.starts.length > 0);
  }
  assert.equal(await audio.preview('unknown'), false);
  audio.setMix({ effects: 0 });
  assert.equal(await audio.preview('step'), false);
  audio.setMix({ effects: 1 });
  audio.setEnabled(false);
  assert.equal(await audio.preview('wolf'), false);
  audio.setEnabled(true);
  audio.dispose();
  assert.equal(await audio.preview('bell'), false);
});

// The additional PCM check uses an offline implementation of the Web Audio graph.
// npm install --prefix /tmp/xero-audio-qa web-audio-engine@0.13.4
// NODE_PATH=/tmp/xero-audio-qa/node_modules node --test tests/princess-zombie-audio-refinements.test.cjs
let RenderingAudioContext;
try {
  ({ RenderingAudioContext } = require('web-audio-engine'));
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
}
function speakerEQ(x, rate, cutoff, highpass) {
  // A two-pole Butterworth section. The handset approximation is deliberately
  // defined as a repeatable bandwidth limit rather than a named device profile.
  const cos = Math.cos((2 * Math.PI * cutoff) / rate),
    alpha = Math.sin((2 * Math.PI * cutoff) / rate) / Math.SQRT2;
  const norm = 1 + alpha,
    b = (1 + (highpass ? cos : -cos)) / (2 * norm);
  const b1 = (highpass ? -2 : 2) * b,
    a1 = (-2 * cos) / norm,
    a2 = (1 - alpha) / norm;
  const y = new Float32Array(x.length);
  for (let i = 2; i < x.length; i++)
    y[i] = b * x[i] + b1 * x[i - 1] + b * x[i - 2] - a1 * y[i - 1] - a2 * y[i - 2];
  return y;
}
function inspectPCM(channels, rate, from = 0, to = Infinity) {
  const [l, r] = channels,
    mono = Float32Array.from(l, (v, i) => (v + r[i]) / 2);
  const phone = speakerEQ(speakerEQ(mono, rate, 280, true), rate, 4800, false);
  const start = Math.floor(from * rate),
    end = Math.min(l.length, Math.floor(to * rate));
  let peak = 0;
  const rms = (arr) => {
    let energy = 0;
    for (let i = start; i < end; i++) {
      assert.ok(Number.isFinite(arr[i]));
      energy += arr[i] * arr[i];
      peak = Math.max(peak, Math.abs(arr[i]));
    }
    return Math.sqrt(energy / (end - start));
  };
  const [left, right, monoRMS, phoneRMS] = [l, r, mono, phone].map(rms);
  return { left, right, mono: monoRMS, phone: phoneRMS, peak };
}

test(
  'offline Web Audio retains clues in stereo, mono and a 280–4800 Hz speaker approximation',
  {
    skip:
      !RenderingAudioContext && 'Optional PCM renderer: install web-audio-engine@0.13.4 as described above',
  },
  async (t) => {
    const oldAudio = globalThis.AudioContext,
      random = Math.random,
      rate = 24000;
    t.after(() => {
      globalThis.AudioContext = oldAudio;
      Math.random = random;
    });
    let ctx;
    globalThis.AudioContext = class extends RenderingAudioContext {
      constructor() {
        super({ numberOfChannels: 2, sampleRate: rate, blockSize: 128 });
        ctx = this;
      }
    };
    async function render(events, options = {}) {
      let seed = 73;
      Math.random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
      const w = createWorld(),
        audio = createAudio();
      const p = w.player;
      Object.assign(p, { x: 80, z: 302, yaw: 0, surface: 'gravel' }, options.player);
      Object.assign(w, { route: 'guided', greeted: true, elapsed: 125 });
      w.actors =
        options.combat === false
          ? []
          : [{ id: 'wolf', type: 'wolf', alive: true, alerted: true, x: 85, z: 305 }];
      if (options.mix) audio.setMix(options.mix);
      audio.unlock();
      await ctx.resume();
      for (let i = 0; i <= 30; i++) {
        const time = 0.125 * i;
        ctx.processTo(time);
        await ctx.resume();
        w.elapsed = 125 + time;
        audio.update(w);
        if (i === 16) for (const e of events) audio.cue({ x: p.x + 6, z: p.z + 2, ...e });
      }
      ctx.processTo(5);
      const channels = ctx.exportAsAudioData().channelData;
      audio.dispose();
      return channels;
    }
    const diff = (a, b) => a.map((ch, i) => Float32Array.from(ch, (v, j) => v - b[i][j]));
    const db = (v) => 20 * Math.log10(Math.max(v, 1e-10));
    const traces = {};
    const all = { music: 1, effects: 1, ambience: 1 },
      solo = (n) => ({ music: 0, effects: 0, ambience: 0, [n]: 1 });
    for (const kind of ['wolf', 'troll', 'dragon']) {
      const event = [{ type: 'telegraph', text: kind }];
      // Keep the same warning automation and deterministic background in both stems.
      const alert = await render(event, { mix: solo('effects') });
      const mixed = await render(event);
      const back = diff(mixed, alert);
      const sound = inspectPCM(alert, rate, 2.012, 2.48);
      const bed = inspectPCM(back, rate, 2.012, 2.48);
      const snr = db(sound.phone / bed.phone);
      assert.ok(snr > 3, kind + ' warning above the simultaneous score and forest on a mono speaker');
      assert.ok(db(sound.mono / Math.max(sound.left, sound.right)) > -6.1, kind + ' survives fold-down');
      traces[kind + ' warning SNR dB'] = +snr.toFixed(1);
    }
    const near = { x: 30, z: 996, yaw: 0 },
      cue = [{ type: 'bell', text: 'tower' }];
    const sluice = await render(cue, { player: near, combat: false });
    const sluiceBed = await render([], { player: near, combat: false });
    const bell = inspectPCM(diff(sluice, sluiceBed), rate, 2.012, 3.35),
      background = inspectPCM(sluiceBed, rate, 2.012, 3.35);
    assert.ok(db(bell.phone / background.phone) > 3);
    traces['sluice peal SNR dB'] = +db(bell.phone / background.phone).toFixed(1);
    const tension = await render([], { mix: solo('music') });
    const pulse = inspectPCM(tension, rate, 0.4, 2);
    assert.ok(
      pulse.phone > 0.0003 && pulse.phone / pulse.mono > 0.1,
      'race and danger rhythm survives bass roll-off'
    );
    const bedTracks = await render([], { mix: { music: 0, effects: 1, ambience: 1 } });
    // Compare the strongest pulse attack with the concurrent woodland at the same
    // timestamp. Keep the spaces between notes out of the attack measurement.
    const phoneTrack = (stereo) =>
      speakerEQ(
        speakerEQ(
          Float32Array.from(stereo[0], (v, i) => (v + stereo[1][i]) / 2),
          rate,
          280,
          true
        ),
        rate,
        4800,
        false
      );
    const beatTrack = phoneTrack(tension),
      windTrack = phoneTrack(bedTracks);
    let attackMargin = -Infinity;
    for (let from = Math.round(rate * 0.2); from < rate * 2; from += Math.round(rate * 0.025)) {
      let beat = 0,
        wind = 0;
      for (let i = from; i < from + Math.round(rate * 0.08); i++) {
        beat += beatTrack[i] ** 2;
        wind += windTrack[i] ** 2;
      }
      attackMargin = Math.max(attackMargin, 10 * Math.log10(beat / Math.max(1e-12, wind)));
    }
    assert.ok(attackMargin > 1.5, 'the upper wooden harmonic carries the pulse over the forest');
    traces['strongest pulse attack margin dB'] = +attackMargin.toFixed(1);
    traces['pulse band-limited RMS dBFS'] = +db(pulse.phone).toFixed(1);
    for (const id of ['saved', 'feast', 'bound', 'horde', 'wilds']) {
      const result = await render([{ type: 'ending', text: id }], { mix: solo('music'), combat: false });
      assert.ok(inspectPCM(result, rate, 2, 4.8).phone > 0.0007, id + ' cadence survives phone EQ');
    }
    const effect = solo('effects'),
      surface = [{ type: 'guard' }];
    const inHall = await render(surface, { player: { x: 30, z: 1500 }, mix: effect });
    const yard = await render(surface, { player: { x: 30, z: 1440 }, mix: effect });
    const returns = inspectPCM(diff(inHall, yard), rate, 2.07, 2.38);
    assert.ok(returns.peak > 0.001, 'the stone room contributes a reflected tail');
    const meal = [{ type: 'meal', text: 'hoof', x: 30, z: 1480 }];
    const outdoors = inspectPCM(
      await render(meal, { player: { x: 30, z: 1464 }, mix: effect }),
      rate,
      2.01,
      2.45
    );
    const indoors = inspectPCM(
      await render(meal, { player: { x: 30, z: 1496 }, mix: effect }),
      rate,
      2.01,
      2.45
    );
    assert.ok(indoors.mono > 1.4 * outdoors.mono, 'same source distance is muffled through the door');
    const pile = [
      { type: 'bell' },
      { type: 'answer' },
      { type: 'potion', text: 'shatter' },
      { type: 'strike' },
      { type: 'impact', text: 'metal' },
      { type: 'telegraph', text: 'dragon' },
      { type: 'hurt' },
      { type: 'ending', text: 'bound' },
    ];
    const full = inspectPCM(await render(pile, { mix: all, player: { x: 30, z: 1515 } }), rate);
    assert.ok(full.peak < 0.89 && full.peak > 0.035, 'stress mix has digital headroom');
    traces['overlapped hall sample peak dBFS'] = +db(full.peak).toFixed(1);
    const silence = inspectPCM(await render(pile, { mix: { music: 0, effects: 0, ambience: 0 } }), rate);
    assert.equal(silence.peak, 0);
    t.diagnostic(JSON.stringify(traces));
  }
);
