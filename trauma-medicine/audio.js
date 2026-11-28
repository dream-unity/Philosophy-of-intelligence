// Procedural Web Audio sound cues for Trauma Doctor.
// Calm, tactile clinical feedback with streak-escalating harmonics, scratchpad clicks, and mute control.

export class ClinicalAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensureContext() {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMuted(muted) {
    this.muted = !!muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playTone({ freq = 520, endFreq = null, duration = 0.09, type = 'sine', gain = 0.06, delay = 0 }) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq && endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    }
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.linearRampToValueAtTime(gain, now + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playSelect(isCorrect) {
    const jitter = 0.96 + Math.random() * 0.08;
    if (isCorrect) {
      this.playTone({ freq: 640 * jitter, endFreq: 780 * jitter, duration: 0.085, type: 'triangle', gain: 0.055 });
    } else {
      this.playTone({ freq: 240 * jitter, endFreq: 185 * jitter, duration: 0.14, type: 'sawtooth', gain: 0.045 });
    }
  }

  playMark(isRuledOut) {
    this.playTone({
      freq: isRuledOut ? 320 : 480,
      endFreq: isRuledOut ? 260 : 540,
      duration: 0.045,
      type: 'sine',
      gain: 0.032,
    });
  }

  playClear(streak = 1) {
    // Subtle musical step up with streak (up to +5 semitones) for rewarding momentum
    const semitones = Math.min(5, Math.max(0, streak - 1));
    const lift = Math.pow(2, semitones / 12);
    this.playTone({ freq: 523.25 * lift, duration: 0.1, type: 'triangle', gain: 0.055, delay: 0 });
    this.playTone({ freq: 659.25 * lift, duration: 0.11, type: 'triangle', gain: 0.055, delay: 0.07 });
    this.playTone({ freq: 783.99 * lift, duration: 0.17, type: 'sine', gain: 0.06, delay: 0.14 });
  }

  playMiss() {
    this.playTone({ freq: 290, endFreq: 210, duration: 0.15, type: 'triangle', gain: 0.058, delay: 0 });
    this.playTone({ freq: 205, endFreq: 165, duration: 0.21, type: 'sine', gain: 0.058, delay: 0.13 });
  }

  playPromote() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      this.playTone({ freq: f, duration: 0.14, type: 'triangle', gain: 0.055, delay: idx * 0.07 });
    });
  }

  playClick() {
    this.playTone({ freq: 440, duration: 0.04, type: 'sine', gain: 0.03 });
  }
}
