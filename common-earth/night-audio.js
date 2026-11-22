/* Procedural Web Audio Soundscape for Enchanted Forest Nights:
   1. Continuous, never-stopping overlapping undead Zombie howls & hollow groans throughout every night.
   2. Harmonized Majestic Wolf Pack howling chorus aimed at the Full Moon every night.
   100% procedural Web Audio API (zero external audio files, safe headless no-op). */
(function (root) {
  'use strict';

  const AudioCtx = root.AudioContext || root.webkitAudioContext || null;
  let ctx = null;
  let master = null;
  let delayNode = null;
  let feedbackGain = null;
  let noiseBuf = null;

  let muted = false;
  let unlocked = false;
  let isNight = false;
  let zombieCount = 0;
  let wolfCount = 0;
  let howlingWolves = 0;

  let zombieLoopId = null;
  let wolfLoopId = null;
  let zombieHowlCount = 0;
  let wolfHowlCount = 0;
  let activeZombieVoices = 0;
  let activeWolfVoices = 0;

  function ensureGraph() {
    if (!AudioCtx || muted) return false;
    try {
      if (!ctx) {
        ctx = new AudioCtx();
        master = ctx.createGain();
        master.gain.setValueAtTime(0.0001, ctx.currentTime);

        // Forest night canyon/canopy echo delay so howls feel haunting and spacious
        delayNode = ctx.createDelay(1.2);
        delayNode.delayTime.setValueAtTime(0.36, ctx.currentTime);
        feedbackGain = ctx.createGain();
        feedbackGain.gain.setValueAtTime(0.34, ctx.currentTime);
        const echoFilter = ctx.createBiquadFilter();
        echoFilter.type = 'lowpass';
        echoFilter.frequency.setValueAtTime(1400, ctx.currentTime);

        delayNode.connect(echoFilter);
        echoFilter.connect(feedbackGain);
        feedbackGain.connect(delayNode);
        echoFilter.connect(master);
        master.connect(ctx.destination);

        // Reusable breathy vocal-rasp noise buffer
        const len = Math.floor(ctx.sampleRate * 2.5);
        noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
        const ch = noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) {
          ch[i] = (Math.random() * 2 - 1) * 0.65;
        }
      }
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      unlocked = ctx.state === 'running';
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Synthesizes a single haunting, guttural undead Zombie howl/wail.
   * Layered detuned sawtooth + sub-triangle vocal cords shaped by dual throat-formant
   * bandpass filters plus raspy breath noise, echoing through the dark woods.
   */
  function triggerZombieHowl(pitchJitter = 0) {
    if (!ensureGraph() || !ctx || muted || !isNight || zombieCount <= 0) return;
    if (ctx.state !== 'running') return;

    const now = ctx.currentTime + 0.02;
    const dur = 2.9 + Math.random() * 2.1; // 2.9s - 5.0s overlapping wail
    const baseFreq = 128 + (Math.random() * 64) + pitchJitter; // Hollow undead vocal register
    const peakFreq = baseFreq * (1.52 + Math.random() * 0.35);
    const endFreq = baseFreq * (0.76 + Math.random() * 0.14);

    // Primary guttural vocal cord oscillator + detuned dissonant ghost harmonic
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscB.type = 'triangle';
    oscA.frequency.setValueAtTime(baseFreq, now);
    oscA.frequency.exponentialRampToValueAtTime(peakFreq, now + dur * 0.34);
    oscA.frequency.exponentialRampToValueAtTime(peakFreq * 0.92, now + dur * 0.64);
    oscA.frequency.exponentialRampToValueAtTime(endFreq, now + dur);

    // Unsettling eerie dissonant interval
    oscB.frequency.setValueAtTime(baseFreq * 1.48, now);
    oscB.frequency.exponentialRampToValueAtTime(peakFreq * 1.45, now + dur * 0.36);
    oscB.frequency.exponentialRampToValueAtTime(endFreq * 1.41, now + dur);

    // Slow ragged undead tremor LFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(3.6 + Math.random() * 2.6, now);
    lfoGain.gain.setValueAtTime(7.5 + Math.random() * 6, now);
    lfo.connect(lfoGain);
    lfoGain.connect(oscA.frequency);
    lfoGain.connect(oscB.frequency);

    // Dual vocal formant bandpass filters (creates hollow "AAAUUUGHHH" undead vowel resonance)
    const formant1 = ctx.createBiquadFilter();
    formant1.type = 'bandpass';
    formant1.Q.setValueAtTime(4.8, now);
    formant1.frequency.setValueAtTime(360, now);
    formant1.frequency.exponentialRampToValueAtTime(640 + Math.random() * 140, now + dur * 0.38);
    formant1.frequency.exponentialRampToValueAtTime(290, now + dur);

    const formant2 = ctx.createBiquadFilter();
    formant2.type = 'bandpass';
    formant2.Q.setValueAtTime(3.4, now);
    formant2.frequency.setValueAtTime(980, now);
    formant2.frequency.exponentialRampToValueAtTime(1280, now + dur * 0.42);
    formant2.frequency.exponentialRampToValueAtTime(720, now + dur);

    // Raspy undead throat hiss noise
    const rasp = ctx.createBufferSource();
    rasp.buffer = noiseBuf;
    rasp.loop = true;
    const raspFilter = ctx.createBiquadFilter();
    raspFilter.type = 'bandpass';
    raspFilter.frequency.setValueAtTime(620 + Math.random() * 260, now);
    raspFilter.Q.setValueAtTime(2.6, now);
    const raspGain = ctx.createGain();
    raspGain.gain.setValueAtTime(0.08, now);

    const voiceGain = ctx.createGain();
    const vol = Math.min(0.24, 0.11 + Math.min(10, zombieCount) * 0.011);
    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.linearRampToValueAtTime(vol, now + dur * 0.24);
    voiceGain.gain.setValueAtTime(vol * 0.88, now + dur * 0.68);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    oscA.connect(formant1);
    oscB.connect(formant2);
    rasp.connect(raspFilter);
    raspFilter.connect(raspGain);
    raspGain.connect(formant1);
    formant1.connect(voiceGain);
    formant2.connect(voiceGain);
    voiceGain.connect(master);
    voiceGain.connect(delayNode);

    activeZombieVoices++;
    zombieHowlCount++;
    oscA.start(now);
    oscB.start(now);
    lfo.start(now);
    rasp.start(now);

    const stopAt = now + dur + 0.06;
    oscA.stop(stopAt);
    oscB.stop(stopAt);
    lfo.stop(stopAt);
    rasp.stop(stopAt);
    oscA.onended = () => {
      activeZombieVoices = Math.max(0, activeZombieVoices - 1);
      try { voiceGain.disconnect(); } catch {}
    };
  }

  /**
   * Synthesizes a soulful, noble Majestic Wolf howl aimed at the Full Moon.
   * Pure harmonic sine + gentle 2nd/3rd overtone glide with warm vibrato and moonlit echo.
   */
  function triggerWolfHowl(offsetSec = 0, pitchRatio = 1.0) {
    if (!ensureGraph() || !ctx || muted || !isNight || wolfCount <= 0) return;
    if (ctx.state !== 'running') return;

    const now = ctx.currentTime + 0.03 + offsetSec;
    const dur = 3.2 + Math.random() * 1.6;
    const startF = (265 + Math.random() * 48) * pitchRatio;
    const highF = startF * (1.76 + Math.random() * 0.16); // Classic rising wolf howl crest
    const holdF = highF * 0.94;
    const tailF = startF * 1.12;

    const fund = ctx.createOscillator();
    const harm2 = ctx.createOscillator();
    const harm3 = ctx.createOscillator();
    fund.type = 'sine';
    harm2.type = 'triangle';
    harm3.type = 'sine';

    const glide = (osc, mult) => {
      osc.frequency.setValueAtTime(startF * mult, now);
      osc.frequency.exponentialRampToValueAtTime(highF * mult, now + dur * 0.28);
      osc.frequency.exponentialRampToValueAtTime(holdF * mult, now + dur * 0.72);
      osc.frequency.exponentialRampToValueAtTime(tailF * mult, now + dur);
    };
    glide(fund, 1.0);
    glide(harm2, 2.0);
    glide(harm3, 3.0);

    // Expressive natural wolf vibrato
    const vib = ctx.createOscillator();
    const vibGain = ctx.createGain();
    vib.frequency.setValueAtTime(4.8 + Math.random() * 1.1, now);
    vibGain.gain.setValueAtTime(5.5, now);
    vib.connect(vibGain);
    vibGain.connect(fund.frequency);
    vibGain.connect(harm2.frequency);

    const g1 = ctx.createGain(); g1.gain.value = 0.72;
    const g2 = ctx.createGain(); g2.gain.value = 0.24;
    const g3 = ctx.createGain(); g3.gain.value = 0.08;

    const wolfFilter = ctx.createBiquadFilter();
    wolfFilter.type = 'bandpass';
    wolfFilter.frequency.setValueAtTime(760 * pitchRatio, now);
    wolfFilter.Q.setValueAtTime(1.8, now);

    const env = ctx.createGain();
    const vol = 0.14;
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(vol, now + dur * 0.22);
    env.gain.setValueAtTime(vol * 0.92, now + dur * 0.70);
    env.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    fund.connect(g1); harm2.connect(g2); harm3.connect(g3);
    g1.connect(wolfFilter); g2.connect(wolfFilter); g3.connect(wolfFilter);
    wolfFilter.connect(env);
    env.connect(master);
    env.connect(delayNode);

    activeWolfVoices++;
    wolfHowlCount++;
    fund.start(now); harm2.start(now); harm3.start(now); vib.start(now);
    const stopAt = now + dur + 0.08;
    fund.stop(stopAt); harm2.stop(stopAt); harm3.stop(stopAt); vib.stop(stopAt);
    fund.onended = () => {
      activeWolfVoices = Math.max(0, activeWolfVoices - 1);
      try { env.disconnect(); } catch {}
    };
  }

  function scheduleZombieLoop() {
    if (zombieLoopId) return;
    const tick = () => {
      zombieLoopId = null;
      if (!isNight || muted || zombieCount <= 0) return;
      // Overlapping continuous zombie howls: launch 1-2 voices immediately so night NEVER goes silent!
      triggerZombieHowl(-12 + Math.random() * 24);
      if (zombieCount >= 4 && activeZombieVoices < 3) {
        setTimeout(() => {
          if (isNight && !muted && zombieCount > 0) triggerZombieHowl(26 + Math.random() * 28);
        }, 550);
      }
      const nextMs = Math.max(950, 1750 - Math.min(8, zombieCount) * 70 + Math.random() * 550);
      zombieLoopId = setTimeout(tick, nextMs);
    };
    tick();
  }

  function scheduleWolfLoop() {
    if (wolfLoopId) return;
    const tick = () => {
      wolfLoopId = null;
      if (!isNight || muted || wolfCount <= 0) return;
      // Full Moon pack chorus: multiple wolves harmonize together in staggered chords!
      const chorusVoices = Math.min(3, Math.max(1, howlingWolves || wolfCount));
      const ratios = [1.0, 1.18, 0.86];
      for (let i = 0; i < chorusVoices; i++) {
        triggerWolfHowl(i * (0.45 + Math.random() * 0.35), ratios[i % ratios.length]);
      }
      const nextMs = 4600 + Math.random() * 2400;
      wolfLoopId = setTimeout(tick, nextMs);
    };
    tick();
  }

  function stopLoops() {
    if (zombieLoopId) { clearTimeout(zombieLoopId); zombieLoopId = null; }
    if (wolfLoopId) { clearTimeout(wolfLoopId); wolfLoopId = null; }
  }

  function syncMasterGain() {
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const want = (!muted && isNight && (zombieCount > 0 || wolfCount > 0)) ? 0.85 : 0.0001;
    try {
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(want, now, 0.25);
    } catch {}
  }

  function setNightState(opts = {}) {
    const nextNight = Boolean(opts.isNight);
    zombieCount = Math.max(0, Math.floor(Number(opts.zombieCount) || 0));
    wolfCount = Math.max(0, Math.floor(Number(opts.wolfCount) || 0));
    howlingWolves = Math.max(0, Math.floor(Number(opts.howlingWolves) || 0));
    const becameNight = !isNight && nextNight;
    isNight = nextNight;

    if (!isNight || muted) {
      stopLoops();
      syncMasterGain();
      return;
    }

    if (ensureGraph()) {
      syncMasterGain();
      if (zombieCount > 0) scheduleZombieLoop();
      else if (zombieLoopId) { clearTimeout(zombieLoopId); zombieLoopId = null; }

      if (wolfCount > 0 && (howlingWolves > 0 || becameNight)) scheduleWolfLoop();
      else if (wolfCount <= 0 && wolfLoopId) { clearTimeout(wolfLoopId); wolfLoopId = null; }
    }
  }

  function unlock() {
    if (!ensureGraph()) return false;
    syncMasterGain();
    if (isNight && !muted) {
      if (zombieCount > 0) scheduleZombieLoop();
      if (wolfCount > 0) scheduleWolfLoop();
    }
    return true;
  }

  function setMuted(val) {
    muted = Boolean(val);
    if (muted) stopLoops();
    else if (isNight) {
      ensureGraph();
      if (zombieCount > 0) scheduleZombieLoop();
      if (wolfCount > 0) scheduleWolfLoop();
    }
    syncMasterGain();
    return muted;
  }

  function toggleMute() {
    return setMuted(!muted);
  }

  function getStatus() {
    return {
      supported: Boolean(AudioCtx),
      unlocked: Boolean(unlocked || ctx?.state === 'running'),
      muted,
      isNight,
      zombieHowling: Boolean(isNight && !muted && zombieCount > 0),
      wolfHowling: Boolean(isNight && !muted && wolfCount > 0),
      activeZombieVoices,
      activeWolfVoices,
      zombieHowlCount,
      wolfHowlCount
    };
  }

  // Auto-unlock audio cleanly on first user pointer/keyboard gesture
  if (typeof root.addEventListener === 'function') {
    const onGesture = () => { unlock(); };
    root.addEventListener('pointerdown', onGesture, { passive: true });
    root.addEventListener('keydown', onGesture, { passive: true });
  }

  const api = Object.freeze({
    setNightState,
    unlock,
    setMuted,
    toggleMute,
    isMuted: () => muted,
    getStatus,
    triggerZombieHowl,
    triggerWolfHowl
  });

  root.EarthNightAudio = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
