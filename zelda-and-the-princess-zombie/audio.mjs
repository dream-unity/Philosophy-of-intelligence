import { createScore } from './sound-score.mjs';
import { hordePosition } from './world.mjs';

const bellPitch = { low: 207.65, mid: 246.94, high: 293.66 };

/* Original, synthesized soundscape. The simulation supplies the timing of the
   tower's call and the procession's answer, so both belong to the same world. */
export function createAudio() {
  const updateScore = createScore();
  let ctx, bus, air, airTone, airLevel, noise;
  let enabled = true,
    touched = false,
    disposed = false,
    suspendTimer;
  let latest,
    lastX,
    lastZ,
    travelled = 0,
    nextBird = 0,
    nextMix = 0,
    foot = false;

  function destination(pan, target = bus) {
    if (!pan || !ctx.createStereoPanner) return target;
    const node = ctx.createStereoPanner();
    node.pan.value = Math.max(-1, Math.min(1, pan));
    node.connect(target);
    return node;
  }

  function voice(
    kind,
    frequency,
    level,
    time,
    duration,
    pan = 0,
    endFrequency = frequency,
    attack = 0.012
  ) {
    const source = ctx.createOscillator(),
      envelope = ctx.createGain(),
      out = destination(pan);
    source.type = kind;
    source.frequency.setValueAtTime(frequency, time);
    source.frequency.exponentialRampToValueAtTime(Math.max(12, endFrequency), time + duration);
    envelope.gain.setValueAtTime(0.00001, time);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.00002, level), time + attack);
    envelope.gain.exponentialRampToValueAtTime(0.00001, time + duration);
    source.connect(envelope);
    envelope.connect(out);
    source.onended = () => {
      source.disconnect();
      envelope.disconnect();
      if (out !== bus) out.disconnect();
    };
    source.start(time);
    source.stop(time + duration + 0.02);
  }

  function breath(level, centre, duration, time, pan = 0, attack = 0.03, q = 0.8) {
    const source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter();
    const envelope = ctx.createGain(),
      out = destination(pan);
    source.buffer = noise;
    source.loop = true;
    filter.type = 'bandpass';
    filter.frequency.value = centre;
    filter.Q.value = q;
    envelope.gain.setValueAtTime(0.00001, time);
    envelope.gain.linearRampToValueAtTime(level, time + attack);
    envelope.gain.exponentialRampToValueAtTime(0.00001, time + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(out);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
      if (out !== bus) out.disconnect();
    };
    source.start(time, Math.random() * noise.duration);
    source.stop(time + duration + 0.02);
  }

  function bell(frequency, time, level, tail, pan) {
    voice('sine', frequency, level, time, tail, pan, frequency * 0.998);
    voice('sine', frequency * 2.71, level * 0.39, time, tail * 0.42, pan);
    voice('sine', frequency * 4.08, level * 0.14, time, tail * 0.25, pan);
  }

  function prepare() {
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) return;
    ctx = new Audio();
    bus = ctx.createGain();
    bus.gain.value = 0;
    bus.connect(ctx.destination);
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 3.137), ctx.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    air = ctx.createBufferSource();
    air.buffer = noise;
    air.loop = true;
    airTone = ctx.createBiquadFilter();
    airTone.type = 'lowpass';
    airTone.frequency.value = 840;
    airLevel = ctx.createGain();
    airLevel.gain.value = 0.035;
    air.connect(airTone);
    airTone.connect(airLevel);
    airLevel.connect(bus);
    air.start();
  }

  function applyEnabled() {
    if (!ctx || disposed) return;
    clearTimeout(suspendTimer);
    bus.gain.cancelScheduledValues(ctx.currentTime);
    bus.gain.setTargetAtTime(enabled ? 0.54 : 0, ctx.currentTime, enabled ? 0.12 : 0.026);
    if (enabled && touched && ctx.state !== 'running') ctx.resume().catch(() => {});
    if (!enabled) {
      // Keep wall-clock cues queued before pausing from sounding on resume.
      // The silent graph can sleep once even the longest bell decay has passed.
      suspendTimer = setTimeout(() => {
        if (!enabled && !disposed) ctx.suspend().catch(() => {});
      }, 5500);
      lastX = undefined;
      lastZ = undefined;
      travelled = 0;
    }
  }

  function unlock() {
    if (disposed) return;
    touched = true;
    if (!ctx) {
      try {
        prepare();
      } catch {
        return;
      }
    }
    applyEnabled();
  }

  function setEnabled(value) {
    if (enabled === !!value) return;
    enabled = !!value;
    applyEnabled();
  }

  // Relative bearing keeps the tower on the correct side when the player turns.
  function bearing(x, z) {
    const p = latest?.player;
    return p ? Math.sin(Math.atan2(x - p.x, z - p.z) - p.yaw) * 0.82 : 0;
  }

  function cue(event) {
    if (!enabled || disposed || !ctx || ctx.state !== 'running') return;
    const name = typeof event === 'string' ? event : event?.type;
    const t = ctx.currentTime + 0.005;
    switch (name) {
      case 'bell': {
        const p = latest?.player,
          distance = p ? Math.hypot(30 - p.x, 1520 - p.z) : 1500;
        const level = 0.055 + 0.17 / (1 + distance / 280),
          pan = bearing(30, 1520);
        ['low', 'high', 'mid'].forEach((tone, i) => bell(bellPitch[tone], t + i * 0.46, level, 2.45, pan));
        break;
      }
      case 'answer': {
        const front = hordePosition(latest || { elapsed: 0 }, 0),
          p = latest?.player;
        const distance = p ? Math.hypot(front.x - p.x, front.z - p.z) : 1200;
        const presence = 0.44 + 0.56 / (1 + distance / 290),
          pan = bearing(front.x, front.z);
        breath(0.24 * presence, 460, 1.6, t, pan, 0.35);
        voice('triangle', 100, 0.06 * presence, t + 0.09, 1.7, pan, 75, 0.33);
        voice('sine', 139, 0.049 * presence, t + 0.26, 1.38, pan * 0.7, 112, 0.42);
        break;
      }
      case 'howl':
        voice('sine', 424, 0.065, t, 1.25, -0.28, 281, 0.19);
        voice('triangle', 611, 0.018, t + 0.14, 1.1, -0.35, 410, 0.25);
        break;
      case 'strike':
        breath(0.4, 2140, 0.185, t, 0.16, 0.028);
        break;
      case 'hurt':
        breath(0.6, 530, 0.29, t);
        voice('triangle', 99, 0.13, t, 0.32, 0, 43);
        break;
      case 'potion':
        [595, 790, 1133].forEach((f, i) => voice('sine', f, 0.059, t + i * 0.065, 0.25, 0, f * 1.09));
        break;
      case 'loot':
        bell(750, t, 0.06, 0.55, 0.15);
        bell(1032, t + 0.12, 0.047, 0.65, 0.05);
        break;
      case 'sluice':
      case 'chime': {
        const freq = bellPitch[event?.text];
        if (freq) {
          const instrument = latest?.actors?.find((a) => a.type === 'bell' && a.tone === event.text);
          bell(freq, t, 0.17, 1.8, instrument ? bearing(instrument.x, instrument.z) : 0);
        } else if (name === 'chime') {
          breath(0.42, 450, 1.4, t, 0, 0.14);
          voice('triangle', 87, 0.09, t, 1, 0, 39, 0.2);
          bell(415.3, t + 0.24, 0.07, 1.25, 0.1);
        }
        break;
      }
      case 'rustle':
        breath(0.18, 1760, 0.29, t, -0.35);
        break;
      case 'reveal':
        bell(207.65, t, 0.14, 2.1, 0);
        voice('triangle', 207.65, 0.09, t + 0.19, 2.2, 0.12, 154, 0.28);
        break;
      case 'ending':
        breath(0.12, 890, 1.4, t, 0, 0.35);
        break;
    }
  }

  function update(world) {
    latest = world;
    if (!enabled || !ctx || ctx.state !== 'running' || !world?.player || disposed) return;
    const t = ctx.currentTime,
      p = world.player;
    const distance = lastX === undefined ? 0 : Math.hypot(p.x - lastX, p.z - lastZ);
    lastX = p.x;
    lastZ = p.z;
    if (distance < 10 && !world.ending) travelled += distance;
    if (travelled >= 2.75) {
      travelled = 0;
      foot = !foot;
      const stone = p.z > 1430;
      breath(stone ? 0.2 : 0.18, stone ? 1250 : 810, stone ? 0.1 : 0.16, t, foot ? -0.09 : 0.09, 0.012);
      voice('sine', stone ? 93 : 67, 0.07, t, 0.105, 0, 41);
    }
    if (t < nextMix) return;
    nextMix = t + 0.25;
    updateScore(world, t, voice, bell, bearing);
    const forest = Math.min(1, Math.max(0, (1470 - p.z) / 600));
    airTone.frequency.setTargetAtTime(340 + forest * (560 + 100 * Math.sin(t * 0.16)), t, 0.6);
    airLevel.gain.setTargetAtTime(0.017 + forest * (0.029 + 0.01 * Math.sin(t * 0.37)), t, 0.6);
    if (t >= nextBird && forest > 0.38 && !world.ending) {
      if (nextBird > 0) {
        const pan = Math.sin(t * 2.2) * 0.78,
          f = 1650 + Math.random() * 750;
        voice('sine', f, 0.035 * forest, t, 0.12, pan, f * 1.22);
        voice('sine', f * 1.07, 0.023 * forest, t + 0.14, 0.18, pan, f * 0.86);
      }
      nextBird = t + 5 + Math.random() * 9;
    }
  }

  function dispose() {
    disposed = true;
    clearTimeout(suspendTimer);
    if (!ctx) return;
    air?.stop();
    ctx.close().catch(() => {});
  }
  return { unlock, setEnabled, update, cue, dispose };
}
