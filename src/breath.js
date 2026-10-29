(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.FormBreath = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  // An optional visual/audio pacer only: no sensing, holds, scoring or input gates.
  const DEFAULT_CONFIG = Object.freeze({ inhale: 4, exhale: 4, sound: false, volume: 0.2 });
  const TICK_MS = 50;
  const LATE_CUE_MS = 180;

  function numeric(value, fallback, min, max) {
    const usable = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '');
    const number = usable ? Number(value) : NaN;
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  }

  function sanitizeConfig(input, previous) {
    const config = input && typeof input === 'object' ? input : {};
    const base = previous ? sanitizeConfig(previous) : DEFAULT_CONFIG;
    return {
      inhale: numeric(config.inhale, base.inhale, 2, 8),
      exhale: numeric(config.exhale, base.exhale, 2, 8),
      sound: typeof config.sound === 'boolean' ? config.sound : base.sound,
      volume: numeric(config.volume, base.volume, 0, 1)
    };
  }

  // Input is milliseconds; elapsed/duration are phase-local seconds. Cycle is
  // zero-based. This calculation never infers that a person has taken a breath.
  function phaseAt(elapsedMs, input) {
    const config = sanitizeConfig(input);
    const totalElapsedMs = numeric(elapsedMs, 0, 0, Number.MAX_VALUE);
    const inhaleMs = config.inhale * 1000;
    const cycleMs = inhaleMs + config.exhale * 1000;
    const cycle = Math.floor(totalElapsedMs / cycleMs);
    const position = totalElapsedMs % cycleMs;
    const phase = position < inhaleMs ? 'inhale' : 'exhale';
    const elapsed = (phase === 'inhale' ? position : position - inhaleMs) / 1000;
    const duration = config[phase];
    return { phase, elapsed, duration, progress: Math.min(1, Math.max(0, elapsed / duration)), cycle, totalElapsedMs };
  }

  class BreathGuide {
    constructor(options) {
      const settings = options || {};
      this._onTick = typeof settings.onTick === 'function' ? settings.onTick : function () {};
      this._onState = typeof settings.onState === 'function' ? settings.onState : function () {};
      this._clock = typeof settings.now === 'function' ? settings.now : function () {
        return root.performance && typeof root.performance.now === 'function' ? root.performance.now() : Date.now();
      };
      this._setTimer = settings.setTimeout || root.setTimeout.bind(root);
      this._clearTimer = settings.clearTimeout || root.clearTimeout.bind(root);
      this._audioFactory = settings.audioContextFactory || function () {
        const AudioContext = root.AudioContext || root.webkitAudioContext;
        return AudioContext ? new AudioContext() : null;
      };
      this._config = Object.freeze(sanitizeConfig(settings.config));
      this._status = 'idle';
      this._offset = 0;
      this._anchor = 0;
      this._lastNow = null;
      this._timer = null;
      this._generation = 0;
      this._lastPhaseKey = null;
      this._lastCueKey = null;
      this._audio = null;
      this._voices = new Set();
    }

    _now() {
      const value = Number(this._clock());
      if (Number.isFinite(value)) this._lastNow = this._lastNow === null ? value : Math.max(this._lastNow, value);
      return this._lastNow === null ? 0 : this._lastNow;
    }

    _elapsed() {
      return this._status === 'running' ? this._offset + Math.max(0, this._now() - this._anchor) : this._offset;
    }

    _key(snapshot) { return snapshot.cycle + ':' + snapshot.phase; }

    getSnapshot() {
      return Object.assign(phaseAt(this._elapsed(), this._config), {
        running: this._status === 'running',
        status: this._status,
        config: Object.assign({}, this._config)
      });
    }

    _notify(callback) {
      // A consumer's render exception must not strand an active audio graph.
      try { callback(this.getSnapshot()); } catch (_) { /* Keep lifecycle controllable. */ }
    }

    _cancelTimer() {
      if (this._timer !== null) this._clearTimer(this._timer);
      this._timer = null;
    }

    _schedule(generation) {
      if (this._status !== 'running' || generation !== this._generation) return;
      const snapshot = this.getSnapshot();
      const remainingMs = (snapshot.duration - snapshot.elapsed) * 1000;
      this._timer = this._setTimer(() => {
        if (this._status !== 'running' || generation !== this._generation) return;
        this._timer = null;
        const current = this.getSnapshot();
        const key = this._key(current);
        if (key !== this._lastPhaseKey) {
          this._lastPhaseKey = key;
          // Late/background callbacks advance directly to now. Never replay a
          // queue of missed tones, or sound a boundary long after it passed.
          if (current.elapsed * 1000 <= LATE_CUE_MS) this._playTone(current);
        }
        this._notify(this._onTick);
        this._schedule(generation);
      }, Math.max(1, Math.min(TICK_MS, remainingMs)));
    }

    _consumePromise(result) {
      if (result && typeof result.then === 'function') result.then(function () {}, function () {});
    }

    _unlockAudio(cue, generation) {
      if (!this._config.sound || this._status !== 'running') return;
      let context;
      try {
        if (!this._audio) this._audio = this._audioFactory();
        context = this._audio;
        if (!context) return;
        const initialKey = this._key(this.getSnapshot());
        const ready = () => {
          if (generation !== this._generation || this._status !== 'running' || !this._config.sound) return;
          const snapshot = this.getSnapshot();
          if (cue && this._key(snapshot) === initialKey && snapshot.elapsed * 1000 <= LATE_CUE_MS) this._playTone(snapshot);
        };
        // Always call resume from the gesture, including during a pending
        // suspend. WebAudio queues those operations in their requested order.
        const result = typeof context.resume === 'function' ? context.resume() : null;
        if (result && typeof result.then === 'function') result.then(ready, function () {});
        else ready();
      } catch (_) { /* Unavailable/blocked audio leaves the visual pacer usable. */ }
    }

    _suspendAudio() {
      if (!this._audio || typeof this._audio.suspend !== 'function') return;
      try { this._consumePromise(this._audio.suspend()); } catch (_) { /* Already closed. */ }
    }

    _releaseVoice(voice) {
      this._voices.delete(voice);
      try { voice.oscillator.onended = null; voice.oscillator.disconnect(); } catch (_) { /* Detached. */ }
      try { voice.gain.disconnect(); } catch (_) { /* Detached. */ }
    }

    _stopVoices() {
      const time = this._audio ? this._audio.currentTime : 0;
      for (const voice of Array.from(this._voices)) {
        try {
          voice.gain.gain.cancelScheduledValues(time);
          voice.gain.gain.setValueAtTime(0, time);
        } catch (_) { /* Disconnect below is sufficient to silence the voice. */ }
        try { voice.oscillator.stop(time); } catch (_) { /* May already have ended. */ }
        this._releaseVoice(voice);
      }
    }

    _playTone(snapshot) {
      const context = this._audio;
      if (!context || this._status !== 'running' || !this._config.sound || this._config.volume <= 0) return;
      if (context.state && context.state !== 'running') return;
      const key = this._key(snapshot);
      if (this._lastCueKey === key) return;
      this._stopVoices();
      let oscillator;
      let gain;
      try {
        oscillator = context.createOscillator();
        gain = context.createGain();
        const voice = { oscillator, gain };
        this._voices.add(voice);
        const time = context.currentTime;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(snapshot.phase === 'inhale' ? 392 : 293.66, time);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.08 * this._config.volume, time + 0.025);
        gain.gain.linearRampToValueAtTime(0, time + 0.2);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.onended = () => this._releaseVoice(voice);
        oscillator.start(time);
        oscillator.stop(time + 0.22);
        this._lastCueKey = key;
      } catch (_) {
        if (oscillator) { try { oscillator.stop(); oscillator.disconnect(); } catch (_) {} }
        if (gain) { try { gain.disconnect(); } catch (_) {} }
        this._stopVoices();
      }
    }

    start() {
      if (this._status === 'destroyed' || this._status === 'running') return this.getSnapshot();
      this._cancelTimer();
      this._stopVoices();
      const generation = ++this._generation;
      this._offset = 0;
      this._anchor = this._now();
      this._status = 'running';
      this._lastPhaseKey = this._key(this.getSnapshot());
      this._lastCueKey = null;
      this._unlockAudio(true, generation);
      this._notify(this._onState);
      if (generation === this._generation && this._status === 'running') this._notify(this._onTick);
      this._schedule(generation);
      return this.getSnapshot();
    }

    pause() {
      if (this._status !== 'running') return this.getSnapshot();
      this._offset = this._elapsed();
      this._status = 'paused';
      ++this._generation;
      this._cancelTimer();
      this._stopVoices();
      this._suspendAudio();
      this._notify(this._onState);
      this._notify(this._onTick);
      return this.getSnapshot();
    }

    resume() {
      if (this._status !== 'paused') return this.getSnapshot();
      const generation = ++this._generation;
      this._anchor = this._now();
      this._status = 'running';
      this._lastPhaseKey = this._key(this.getSnapshot());
      this._unlockAudio(false, generation);
      this._notify(this._onState);
      if (generation === this._generation && this._status === 'running') this._notify(this._onTick);
      this._schedule(generation);
      return this.getSnapshot();
    }

    stop() {
      if (this._status === 'destroyed') return this.getSnapshot();
      ++this._generation;
      this._cancelTimer();
      this._stopVoices();
      this._suspendAudio();
      this._status = 'idle';
      this._offset = 0;
      this._lastPhaseKey = null;
      this._lastCueKey = null;
      this._notify(this._onState);
      this._notify(this._onTick);
      return this.getSnapshot();
    }

    setConfig(input) {
      if (this._status === 'destroyed') return this.getSnapshot();
      const next = sanitizeConfig(input, this._config);
      if (Object.keys(next).every(key => next[key] === this._config[key])) return this.getSnapshot();
      const previous = this.getSnapshot();
      const soundWasOn = this._config.sound;
      this._config = Object.freeze(next);
      // Duration edits preserve phase, cycle, and fractional phase progress.
      this._offset = (previous.cycle * (next.inhale + next.exhale) +
        (previous.phase === 'exhale' ? next.inhale : 0) + previous.progress * next[previous.phase]) * 1000;
      this._anchor = this._now();
      const generation = ++this._generation;
      this._cancelTimer();
      this._lastPhaseKey = this._key(this.getSnapshot());
      if (!next.sound || next.volume === 0) this._stopVoices();
      if (!next.sound) this._suspendAudio();
      if (next.sound && !soundWasOn) this._unlockAudio(false, generation);
      this._notify(this._onState);
      this._notify(this._onTick);
      this._schedule(generation);
      return this.getSnapshot();
    }

    destroy() {
      if (this._status === 'destroyed') return this.getSnapshot();
      this._offset = this._elapsed();
      this._status = 'destroyed';
      ++this._generation;
      this._cancelTimer();
      this._stopVoices();
      const context = this._audio;
      this._audio = null;
      if (context && typeof context.close === 'function') {
        try { this._consumePromise(context.close()); } catch (_) { /* Already closed. */ }
      }
      this._notify(this._onState);
      this._onTick = function () {};
      this._onState = function () {};
      return this.getSnapshot();
    }
  }

  return { BreathGuide, phaseAt, sanitizeConfig, DEFAULT_CONFIG };
});
