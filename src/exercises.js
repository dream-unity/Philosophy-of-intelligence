(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.FormExercises = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  // Adapted from Project Meaning, index.html, commit
  // fb0553e87b840775438fa3107490b0085b067192:
  // https://github.com/o0oooooOooooo0o/Project-Meaning
  // Preserve its exercise order, cadence, durations and recognizable bowl/pad
  // audio. Sensations and feelings are observations, not physiological measures.
  const HEART_DURATIONS = Object.freeze([15, 30, 60, 120, 180]);
  const BODY_DURATIONS = Object.freeze([15, 30, 60]);
  const FREQUENCIES = Object.freeze([0, 1, 2, 3, 8, 10, 12]);
  const BREATH_SECONDS = 5;
  const BODY_STEP_SECONDS = 30;

  const HEART_PHASES = Object.freeze([
    Object.freeze({ id: 'early', label: 'Step 1 · Heart-Focused Breathing',
      inhale: 'Breathe in gently with attention at the heart. Soften the chest. Let a sincere feeling of love come forward if it is available; ease is enough to begin.',
      exhale: 'Breathe out slowly with attention at the heart. Unhurried. Let the rhythm remain comfortable and unforced.' }),
    Object.freeze({ id: 'middle', label: 'Step 2 · Heart Feeling',
      inhale: 'Breathe the love in. Not just the idea of it: notice any felt warmth in the chest. Let it move through you without forcing it.',
      exhale: 'Breathe the love out with attention at the heart. Sustain the sincere feeling that is actually present, however small.' }),
    Object.freeze({ id: 'late', label: 'Step 3 · Deepen',
      inhale: 'Breathe the love in. Deepen it gently. Attend to a subtler, clearer level without pushing beyond what you actually feel.',
      exhale: 'Breathe the love out. Sustain it. Notice how it changes while you stay with it; there is no required intensity.' })
  ]);

  const BODY_STEPS = Object.freeze([
    Object.freeze({ id: 'location', label: 'Location', prompt: 'Okay, now. Where in the body is the feeling sitting? Name the area in the plainest words: chest, throat, belly, jaw, hands, shoulders. Does it have a clear edge, or fade into what surrounds it? Do not explain it yet; just say where it is. Location alone does not identify an emotion.' }),
    Object.freeze({ id: 'quality', label: 'Quality', prompt: 'Okay, now. What does it feel like, as raw sensation? Plain physical words: pressure, heat, cold, tightness, hollowness, heaviness, lightness. Pick the word that truly fits, not the one that sounds deep. Describe the texture before deciding what it might mean.' }),
    Object.freeze({ id: 'intensity', label: 'Intensity', prompt: 'Okay, now. How strong is the sensation itself, 0 to 10? Rate the sensation, not the story riding on it. Notice the two can differ: a strong emotion can accompany a faint sensation, and a strong physical sensation can carry little emotional feeling. Notice that gap without trying to change it.' }),
    Object.freeze({ id: 'movement', label: 'Movement', prompt: 'Okay, now. Is it still, or moving: pulsing, spreading, rising, sinking, flickering, throbbing? Steady, or coming in waves? Describe the movement itself for now, not yet what it means. If you cannot tell, that is an accurate observation too.' }),
    Object.freeze({ id: 'direction', label: 'Direction', prompt: 'Okay, now. Which way is it going: toward you, away, up, down, inward, outward, radiating from a centre? Describe what you notice without assigning it an emotion. If there is no clear direction, say so; it may simply be staying put.' }),
    Object.freeze({ id: 'coherence', label: 'Coherence', prompt: 'Okay, now. Is this one feeling, or several at once? Check four layers: the raw sensation, any image it brings to mind, what the body wants to do, and the emotional tone. Are they pointing the same way, or pulling apart? A mixed or uncertain description is welcome. Here coherence means your observed agreement between layers, not a measured heart state.' }),
    Object.freeze({ id: 'meaning-tone', label: 'Meaning-tone', prompt: 'Okay, now. First the tone: pleasant, unpleasant, neutral, or mixed; drawing you in, pushing away, or holding still? Then try an emotion word if one fits: sadness, joy, fear, anger, longing, calm. Keep the name provisional. The same sensation can have different meanings in different situations; you can say “I do not know.” Separate what you felt from the interpretation and from what the body wants to do.' })
  ]);

  class ExerciseClock {
    constructor(options) {
      const settings = options || {};
      if (settings.exercise !== 'heart' && settings.exercise !== 'body') throw new TypeError('Choose heart or body.');
      if (!Number.isFinite(settings.duration) || settings.duration <= 0) throw new TypeError('Duration must be positive seconds.');
      this.exercise = settings.exercise;
      this.duration = settings.duration;
      this._now = typeof settings.now === 'function' ? settings.now : function () {
        return root.performance && typeof root.performance.now === 'function' ? root.performance.now() : Date.now();
      };
      this._onTick = typeof settings.onTick === 'function' ? settings.onTick : function () {};
      this._onComplete = typeof settings.onComplete === 'function' ? settings.onComplete : function () {};
      this._elapsedMilliseconds = 0;
      this._lastNow = 0;
      this._status = 'idle';
    }

    _update() {
      if (this._status !== 'running') return false;
      const time = this._now();
      if (Number.isFinite(time)) {
        // Ignore backwards readings without counting the same interval twice.
        this._elapsedMilliseconds = Math.min(this.duration * 1000, this._elapsedMilliseconds + Math.max(0, time - this._lastNow));
        this._lastNow = Math.max(this._lastNow, time);
      }
      if (this._elapsedMilliseconds >= this.duration * 1000) {
        this._elapsedMilliseconds = this.duration * 1000;
        this._status = 'completed';
        return true;
      }
      return false;
    }

    _data() {
      const elapsed = this._elapsedMilliseconds / 1000;
      const progress = elapsed / this.duration;
      const finished = this._status === 'completed';
      return {
        exercise: this.exercise,
        status: this._status,
        duration: this.duration,
        elapsedSeconds: elapsed,
        remainingSeconds: Math.max(0, this.duration - elapsed),
        progress: progress,
        // Match the source's 0.33 / 0.66 transitions, rather than rounded minutes.
        heartPhaseIndex: progress < 0.33 ? 0 : (progress < 0.66 ? 1 : 2),
        breathPhase: Math.floor(elapsed / BREATH_SECONDS) % 2 === 0 ? 'inhale' : 'exhale',
        breathRemaining: finished ? 0 : BREATH_SECONDS - (elapsed % BREATH_SECONDS),
        bodyStepIndex: Math.floor(elapsed / BODY_STEP_SECONDS) % BODY_STEPS.length,
        stepRemaining: finished ? 0 : BODY_STEP_SECONDS - (elapsed % BODY_STEP_SECONDS)
      };
    }

    _emit(completed) {
      const state = this._data();
      this._onTick(state);
      if (completed) this._onComplete(state);
      return state;
    }

    start() {
      if (this._status === 'running' || this._status === 'paused') return this.snapshot();
      this._elapsedMilliseconds = 0;
      this._lastNow = this._now();
      this._status = 'running';
      return this._emit(false);
    }

    tick() { return this._emit(this._update()); }

    snapshot() {
      const completed = this._update();
      const state = this._data();
      if (completed) this._onComplete(state);
      return state;
    }

    pause() {
      const completed = this._update();
      if (this._status === 'running') this._status = 'paused';
      return this._emit(completed);
    }

    resume() {
      if (this._status === 'paused') {
        this._lastNow = this._now();
        this._status = 'running';
      }
      return this._emit(false);
    }

    end() {
      const completed = this._update();
      if (this._status !== 'completed') this._status = 'ended';
      return this._emit(completed);
    }
  }

  class ExerciseAudio {
    constructor(options) {
      const settings = options || {};
      this._factory = settings.audioContextFactory || function () {
        const AudioContext = root.AudioContext || root.webkitAudioContext;
        return AudioContext ? new AudioContext() : null;
      };
      this._setTimeout = settings.setTimeout || root.setTimeout.bind(root);
      this._clearTimeout = settings.clearTimeout || root.clearTimeout.bind(root);
      this._context = null;
      this._verb = null;
      this._verbNodes = [];
      this._strikes = new Set();
      this._pads = new Set();
      this._timers = new Set();
      this._enabled = false;
      this.frequency = 0;
      this.bellVolume = 1;
    }

    _schedule(callback, delay) {
      const id = this._setTimeout(() => { this._timers.delete(id); callback(); }, delay);
      this._timers.add(id);
      return id;
    }

    _dispose(group) {
      group.osc.forEach(function (osc) { try { osc.stop(); } catch (_) {} });
      group.nodes.forEach(function (node) { try { node.disconnect(); } catch (_) {} });
    }

    _reverb() {
      if (this._verb) return this._verb;
      const ac = this._context;
      const length = Math.floor(ac.sampleRate * 4.5);
      const buffer = ac.createBuffer(2, length, ac.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        let last = 0;
        for (let i = 0; i < length; i++) {
          last += 0.10 * ((Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5) - last);
          data[i] = last;
        }
      }
      const convolver = ac.createConvolver(); convolver.buffer = buffer;
      const lowpass = ac.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 1800; lowpass.Q.value = 0.2;
      const wet = ac.createGain(); wet.gain.value = 0.55;
      const dry = ac.createGain(); dry.gain.value = 0.90;
      const send = ac.createGain(); send.gain.value = 1;
      send.connect(dry); send.connect(convolver); convolver.connect(lowpass); lowpass.connect(wet);
      dry.connect(ac.destination); wet.connect(ac.destination);
      this._verbNodes = [send, convolver, lowpass, wet, dry];
      this._verb = send;
      return send;
    }

    _bowl(fundamental, peak, decay) {
      if (!this._enabled || !this._context || this.bellVolume <= 0) return false;
      const ac = this._context;
      const time = ac.currentTime;
      const volume = this.bellVolume <= 1 ? this.bellVolume : 1 + (this.bellVolume - 1) * 3;
      const filter = ac.createBiquadFilter(); filter.type = 'lowpass'; filter.Q.value = 0.3;
      filter.frequency.setValueAtTime(2600, time);
      filter.frequency.exponentialRampToValueAtTime(1100, time + decay * 0.5);
      filter.connect(this._reverb());
      const group = { osc: [], nodes: [filter] };
      [[1, 1, 1, -0.3], [1.003, 0.70, 1, 0.3], [2, 0.26, 0.78, 0], [2.76, 0.07, 0.45, 0.18]].forEach(function (partial) {
        const duration = decay * partial[2];
        const osc = ac.createOscillator(); osc.type = 'sine'; osc.frequency.value = fundamental * partial[0];
        const gain = ac.createGain();
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * volume * partial[1]), time + 0.045);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        osc.connect(gain);
        let tail = gain;
        if (partial[3] && ac.createStereoPanner) {
          const pan = ac.createStereoPanner(); pan.pan.value = partial[3]; gain.connect(pan); tail = pan; group.nodes.push(pan);
        }
        tail.connect(filter);
        osc.start(time); osc.stop(time + duration + 0.1);
        group.osc.push(osc); group.nodes.push(osc, gain);
      });
      this._strikes.add(group);
      this._schedule(() => { this._dispose(group); this._strikes.delete(group); }, (decay + 0.4) * 1000);
      return true;
    }

    _startPad() {
      if (!this.frequency) return;
      const ac = this._context;
      const time = ac.currentTime;
      const target = this.frequency;
      const delta = target < 5;
      const initial = Math.min(delta ? 4 : 12, target + 2);
      const mix = ac.createGain(); mix.gain.value = 1;
      const tremolo = ac.createGain(); tremolo.gain.value = 0.5;
      const highpass = ac.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = delta ? 45 : 110; highpass.Q.value = 0.5;
      const lowpass = ac.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = delta ? 480 : 1000; lowpass.Q.value = 0.4;
      const envelope = ac.createGain(); envelope.gain.setValueAtTime(0.0001, time);
      envelope.gain.exponentialRampToValueAtTime(1.8, time + (delta ? 13 : 4.5));
      mix.connect(tremolo); tremolo.connect(highpass); highpass.connect(lowpass); lowpass.connect(envelope); envelope.connect(ac.destination);
      const group = { osc: [], nodes: [mix, tremolo, highpass, lowpass, envelope], envelope: envelope };
      const voice = function (frequency, volume, position) {
        const osc = ac.createOscillator(); osc.type = 'sine'; osc.frequency.value = frequency;
        const gain = ac.createGain(); gain.gain.value = volume;
        osc.connect(gain);
        if (position && ac.createStereoPanner) {
          const pan = ac.createStereoPanner(); pan.pan.value = position; gain.connect(pan); pan.connect(mix); group.nodes.push(pan);
        } else gain.connect(mix);
        osc.start(time); group.osc.push(osc); group.nodes.push(osc, gain);
        return osc;
      };
      const center = delta ? 110 : 220;
      let left; let right;
      if (delta) {
        voice(73.42, 0.052, -0.25); voice(110, 0.070, 0.25);
        left = voice(center - initial / 2, 0.084, -1); right = voice(center + initial / 2, 0.084, 1);
        voice(146.83, 0.054, 0); voice(220, 0.030, -0.20);
        const length = Math.floor(ac.sampleRate * 4);
        const noise = ac.createBuffer(1, length, ac.sampleRate);
        const data = noise.getChannelData(0); let last = 0;
        for (let i = 0; i < length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; data[i] = last * 2; }
        const source = ac.createBufferSource(); source.buffer = noise; source.loop = true;
        const filter = ac.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 210; filter.Q.value = 0.3;
        const gain = ac.createGain(); gain.gain.value = 0.07;
        source.connect(filter); filter.connect(gain); gain.connect(mix); source.start(time);
        group.osc.push(source); group.nodes.push(source, filter, gain);
      } else {
        voice(146.83, 0.080, -0.4); voice(293.66, 0.042, 0.4);
        left = voice(center - initial / 2, 0.058, -1); right = voice(center + initial / 2, 0.058, 1);
        voice(440, 0.050, -0.25); voice(587.33, 0.034, 0.25);
      }
      left.frequency.setValueAtTime(center - initial / 2, time);
      left.frequency.linearRampToValueAtTime(center - target / 2, time + 60);
      right.frequency.setValueAtTime(center + initial / 2, time);
      right.frequency.linearRampToValueAtTime(center + target / 2, time + 60);
      const pulse = ac.createOscillator(); pulse.type = 'sine';
      pulse.frequency.setValueAtTime(initial, time); pulse.frequency.linearRampToValueAtTime(target, time + 60);
      const pulseGain = ac.createGain(); pulseGain.gain.value = delta ? 0.22 : 0.26;
      pulse.connect(pulseGain); pulseGain.connect(tremolo.gain); pulse.start(time);
      const drift = ac.createOscillator(); drift.type = 'sine'; drift.frequency.value = delta ? 0.045 : 0.07;
      const driftGain = ac.createGain(); driftGain.gain.value = delta ? 0.18 : 0.03;
      drift.connect(driftGain); driftGain.connect(envelope.gain); drift.start(time);
      group.osc.push(pulse, drift); group.nodes.push(pulse, pulseGain, drift, driftGain);
      this._pads.add(group);
    }

    _stopPads(fade) {
      this._pads.forEach(group => {
        if (!fade || !this._context) { this._dispose(group); this._pads.delete(group); return; }
        const time = this._context.currentTime;
        try {
          group.envelope.gain.cancelScheduledValues(time);
          group.envelope.gain.setValueAtTime(Math.max(group.envelope.gain.value, 0.0001), time);
          group.envelope.gain.exponentialRampToValueAtTime(0.0001, time + fade);
        } catch (_) {}
        this._schedule(() => { this._dispose(group); this._pads.delete(group); }, (fade + 0.3) * 1000);
      });
    }

    _stop(fade) {
      this._enabled = false;
      this._timers.forEach(id => this._clearTimeout(id)); this._timers.clear();
      this._strikes.forEach(group => this._dispose(group)); this._strikes.clear();
      this._stopPads(fade);
      // Disconnect the reverb as well, so no residual bell continues after stop.
      this._verbNodes.forEach(function (node) { try { node.disconnect(); } catch (_) {} });
      this._verbNodes = []; this._verb = null;
    }

    start(options) {
      const settings = options || {};
      this._stop(0);
      this.frequency = FREQUENCIES.includes(Number(settings.frequency)) ? Number(settings.frequency) : 0;
      this.bellVolume = Number.isFinite(Number(settings.bellVolume)) ? Math.max(0, Math.min(1.5, Number(settings.bellVolume))) : 1;
      try {
        if (!this._context || this._context.state === 'closed') this._context = this._factory();
        if (!this._context) return false;
        if (this._context.state === 'suspended') {
          const pending = this._context.resume();
          if (pending && pending.catch) pending.catch(function () {});
        }
        this._enabled = true;
        this._startPad();
        return true;
      } catch (_) { this._stop(0); return false; }
    }

    cue(inhale) { return this._bowl(inhale ? 392 : 293.66, 0.08, 3.3); }

    complete() {
      if (!this._enabled) return false;
      this._stopPads(3);
      this._bowl(392, 0.13, 8.5);
      this._schedule(() => this._bowl(293.66, 0.11, 9.5), 3000);
      return true;
    }

    stop() { this._stop(3); }

    destroy() {
      this._stop(0);
      const context = this._context; this._context = null;
      if (context && typeof context.close === 'function') {
        try { const pending = context.close(); if (pending && pending.catch) pending.catch(function () {}); } catch (_) {}
      }
    }
  }

  return Object.freeze({ HEART_DURATIONS, BODY_DURATIONS, FREQUENCIES, BREATH_SECONDS, BODY_STEP_SECONDS, HEART_PHASES, BODY_STEPS, ExerciseClock, ExerciseAudio });
});
