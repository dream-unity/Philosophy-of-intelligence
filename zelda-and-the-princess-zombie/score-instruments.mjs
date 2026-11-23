// Relative partials describe the source. The body's resonances stay at their
// own frequencies as a string or a singer moves from one note to the next.
const instruments = {
  flute: {
    partials: [1, 0.17, 0.21, 0.046, 0.038, 0.018, 0.012],
    attack: 0.092,
    release: 0.23,
    vibrato: 6,
    rate: 4.7,
    scoop: -9,
    cutoff: 4300,
  },
  harp: {
    partials: [1, 0.65, 0.32, 0.19, 0.24, 0.11, 0.034, 0.078, 0.05, 0.033, 0.02],
    attack: 0.009,
    scoop: 3,
    cutoff: 4900,
  },
  viola: {
    partials: [1, 0.76, 0.55, 0.42, 0.34, 0.3, 0.21, 0.18, 0.14, 0.11, 0.1, 0.09, 0.08, 0.065],
    body: [
      [460, 190, 1.1],
      [880, 290, 0.8],
      [2050, 490, 1.2],
    ],
    attack: 0.16,
    release: 0.31,
    vibrato: 11,
    rate: 4.8,
    scoop: -8,
    cutoff: 2440,
  },
  cello: {
    partials: [1, 0.94, 0.7, 0.48, 0.36, 0.31, 0.29, 0.23, 0.18, 0.17, 0.14, 0.12, 0.08, 0.07],
    body: [
      [275, 125, 1.5],
      [610, 190, 0.89],
      [1350, 380, 0.75],
    ],
    attack: 0.19,
    release: 0.36,
    vibrato: 8,
    rate: 4.2,
    scoop: -7,
    cutoff: 1930,
  },
  choir: {
    partials: Array.from({ length: 24 }, (_, i) => 1 / (i + 1) ** 1.12),
    body: [
      [400, 95, 6.4],
      [870, 145, 4.8],
      [2360, 255, 2.1],
    ],
    attack: 0.34,
    release: 0.52,
    vibrato: 6,
    rate: 4.4,
    scoop: -6,
    cutoff: 2840,
  },
  horn: {
    partials: [1, 0.87, 0.62, 0.43, 0.24, 0.13, 0.087, 0.052, 0.037, 0.022],
    body: [
      [580, 250, 0.9],
      [1070, 280, 1.1],
    ],
    attack: 0.21,
    release: 0.33,
    vibrato: 3,
    rate: 4.1,
    scoop: -16,
    cutoff: 2150,
  },
};

// Normalize each cached waveform once so articulated notes have a predictable
// peak before their envelopes, regardless of the browser's wavetable scaling.
const sineCycle = Float32Array.from({ length: 512 }, (_, i) => Math.sin((2 * Math.PI * i) / 512));
function normalizePartials(partials) {
  let peak = 0;
  for (let phase = 0; phase < sineCycle.length; phase++) {
    let sample = 0;
    for (let h = 1; h < partials.length; h++) sample += partials[h] * sineCycle[(phase * h) % 512];
    peak = Math.max(peak, Math.abs(sample));
  }
  for (let h = 1; h < partials.length; h++) partials[h] /= peak * 1.012;
}

function roomReturn(ctx, destination) {
  if (!ctx.createDelay) return null;
  // Quiet, progressively darker reflections. No feedback or persistent source.
  const input = ctx.createGain();
  for (const [seconds, level, pan, cutoff] of [
    [0.041, 0.13, -0.39, 3500],
    [0.077, 0.102, 0.44, 3000],
    [0.138, 0.074, -0.19, 2350],
    [0.207, 0.048, 0.28, 1850],
    [0.334, 0.026, -0.13, 1390],
  ]) {
    const delay = ctx.createDelay(0.4),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain();
    delay.delayTime.value = seconds;
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    gain.gain.value = level;
    input.connect(delay);
    delay.connect(filter);
    filter.connect(gain);
    if (ctx.createStereoPanner) {
      const side = ctx.createStereoPanner();
      side.pan.value = pan;
      gain.connect(side);
      side.connect(destination);
    } else gain.connect(destination);
  }
  return input;
}

function breathAttack(ctx) {
  const length = Math.ceil(ctx.sampleRate * 0.21);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const low = 1 - Math.exp((-2 * Math.PI * 1100) / ctx.sampleRate);
  const high = 1 - Math.exp((-2 * Math.PI * 4800) / ctx.sampleRate);
  let seed = 307,
    dark = 0,
    bright = 0;
  for (let i = 0; i < length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const white = seed / 2147483648 - 1;
    dark += low * (white - dark);
    bright += high * (white - bright);
    const u = i / length;
    data[i] = 0.19 * (bright - dark) * Math.sin(Math.PI * u) * (1 - u);
  }
  return buffer;
}

function shapeEnvelope(gain, plucked, level, start, duration, attack, release) {
  const end = start + duration;
  gain.setValueAtTime(0, start);
  gain.linearRampToValueAtTime(level, start + attack);
  if (plucked) {
    gain.exponentialRampToValueAtTime(level * 0.54, start + attack + 0.17 * (duration - attack));
    gain.exponentialRampToValueAtTime(level * 0.12, start + attack + 0.68 * (duration - attack));
    gain.exponentialRampToValueAtTime(level * 0.002, end - Math.min(0.008, duration * 0.025));
  } else {
    const holdEnd = end - Math.min(duration * 0.4, release);
    // The bow or breath relaxes after speaking, then leans into the held note.
    gain.exponentialRampToValueAtTime(level * 0.72, start + attack + 0.42 * (holdEnd - start - attack));
    gain.linearRampToValueAtTime(level * 0.84, holdEnd);
    gain.exponentialRampToValueAtTime(level * 0.012, end - Math.min(0.025, duration * 0.05));
  }
  gain.linearRampToValueAtTime(0, end);
}

function inflectPitch(param, instrument, start, duration, variant, spread) {
  if (!param?.setValueCurveAtTime) return;
  const shape = new Float32Array(Math.max(8, Math.min(360, Math.ceil(36 * duration))));
  for (let i = 0; i < shape.length; i++) {
    const t = (duration * i) / (shape.length - 1);
    const onset = instrument.scoop * Math.exp(-t / 0.075);
    const swell = Math.min(1, Math.max(0, (t - 0.13) / 0.65));
    const phase = (instrument.rate || 0) * t + variant * 0.12 + 0.045 * Math.sin(t * 2.3);
    shape[i] = spread + onset + (instrument.vibrato || 0) * swell * Math.sin(2 * Math.PI * phase);
  }
  param.setValueCurveAtTime(shape, start, duration);
}

export function createScoreInstruments(ctx, destination, fallbackNote) {
  // Tests and lightweight Web Audio shims can still voice the whole score.
  if (!ctx.createPeriodicWave)
    return (shape, f, level, t, d, pan, end, attack) =>
      fallbackNote(
        instruments[shape] ? (shape === 'flute' || shape === 'choir' ? 'sine' : 'triangle') : shape,
        f,
        level,
        t,
        d,
        pan,
        end,
        attack
      );
  const waves = new Map();
  let air,
    generation,
    articulation = 0;
  function outputGroup() {
    if (!generation) {
      const bus = ctx.createGain();
      bus.connect(destination);
      generation = { bus, room: null, sources: new Set() };
    }
    return generation;
  }
  function track(group, source, start, end) {
    if (!source?.stop) return;
    const entry = { source, start, end };
    group.sources.add(entry);
    const cleanup = source.onended;
    source.onended = (event) => {
      group.sources.delete(entry);
      cleanup?.call(source, event);
    };
  }
  function wave(shape, instrument, frequency) {
    // A minor third per register keeps a touring melody's formants in place.
    const register = instrument.body
      ? Math.max(-12, Math.min(16, Math.round(4 * Math.log2(frequency / 220))))
      : 0;
    const key = shape + register;
    if (waves.has(key)) return waves.get(key);
    const anchor = 220 * 2 ** (register / 4);
    const real = new Float32Array(instrument.partials.length + 1);
    const imag = new Float32Array(real.length);
    instrument.partials.forEach((weight, i) => {
      const partial = i + 1;
      let amplitude = weight;
      for (const [centre, width, strength] of instrument.body || []) {
        const offset = (partial * anchor - centre) / width;
        amplitude += weight * strength * Math.exp(-0.5 * offset * offset);
      }
      imag[partial] = amplitude;
    });
    normalizePartials(imag);
    const timbre = ctx.createPeriodicWave(real, imag, { disableNormalization: true });
    waves.set(key, timbre);
    return timbre;
  }
  function play(shape, frequency, level, time, duration, pan = 0, endFrequency = frequency, attack) {
    const instrument = instruments[shape];
    if (!(level > 0 && duration > 0 && frequency > 0 && endFrequency > 0)) return;
    const start = Math.max(time, ctx.currentTime);
    const end = start + duration;
    const group = outputGroup();
    if (!instrument) {
      const source = fallbackNote(
        shape,
        frequency,
        level,
        start,
        duration,
        pan,
        endFrequency,
        attack,
        group.bus
      );
      track(group, source, start, end + 0.02);
      return;
    }
    group.room ??= roomReturn(ctx, group.bus);
    const rise = Math.min(duration * 0.32, Math.max(0.004, attack ?? instrument.attack));
    const isHarp = shape === 'harp';
    const filter = ctx.createBiquadFilter(),
      envelope = ctx.createGain();
    const panner = pan && ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    filter.type = 'lowpass';
    filter.Q.value = 0.62;
    const bright = Math.min(ctx.sampleRate * 0.45, Math.max(instrument.cutoff, frequency * 2.15));
    const soft = isHarp ? Math.max(frequency * 1.15, 620) : Math.max(frequency * 1.25, bright * 0.54);
    filter.frequency.setValueAtTime(isHarp ? bright : soft, start);
    if (!isHarp) filter.frequency.exponentialRampToValueAtTime(bright, start + rise);
    filter.frequency.exponentialRampToValueAtTime(
      Math.min(bright, soft),
      isHarp ? start + duration * 0.65 : end
    );
    shapeEnvelope(envelope.gain, isHarp, level, start, duration, rise, instrument.release);
    filter.connect(envelope);
    const output = panner || envelope;
    if (panner) {
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      envelope.connect(panner);
    }
    output.connect(group.bus);
    if (group.room) output.connect(group.room);

    const source = ctx.createOscillator();
    const timbre = wave(shape, instrument, frequency);
    const variant = articulation++ % 7;
    function tune(osc, offset, length, spread) {
      osc.setPeriodicWave(timbre);
      osc.frequency.setValueAtTime(frequency, offset);
      osc.frequency.exponentialRampToValueAtTime(endFrequency, offset + length);
      inflectPitch(osc.detune, instrument, offset, length, variant + spread, spread);
    }
    tune(source, start, duration, 0);
    source.connect(filter);
    if (shape === 'choir') {
      const singer = ctx.createOscillator(),
        distant = ctx.createGain();
      const offset = Math.min(0.024, duration * 0.12);
      distant.gain.value = 0.23;
      tune(singer, start + offset, duration - offset, 5.7);
      singer.connect(distant);
      distant.connect(filter);
      singer.onended = () => {
        singer.disconnect();
        distant.disconnect();
      };
      singer.start(start + offset);
      singer.stop(end);
      track(group, singer, start + offset, end);
    } else if (shape === 'flute' && ctx.createBufferSource) {
      air ??= breathAttack(ctx);
      const breath = ctx.createBufferSource();
      breath.buffer = air;
      breath.connect(filter);
      breath.onended = () => breath.disconnect();
      breath.start(start);
      const breathEnd = Math.min(end, start + air.duration);
      breath.stop(breathEnd);
      track(group, breath, start, breathEnd);
    }
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
      panner?.disconnect();
    };
    source.start(start);
    source.stop(end + 0.005);
    track(group, source, start, end + 0.005);
  }
  play.reset = (at = ctx.currentTime) => {
    if (!generation) return;
    const old = generation;
    generation = null;
    const now = Math.max(ctx.currentTime, at),
      silent = now + 0.08;
    old.bus.gain.setValueAtTime(1, now);
    old.bus.gain.linearRampToValueAtTime(0, silent);
    for (const { source, start, end } of old.sources) {
      const stop = start >= now ? now : silent;
      if (end > stop) source.stop(stop);
    }
    // Release even a room with only a reflection remaining, on the audio clock.
    const done = ctx.createOscillator();
    done.onended = () => old.bus.disconnect();
    done.start(now);
    done.stop(silent + 0.005);
    articulation = 0;
  };
  return play;
}
