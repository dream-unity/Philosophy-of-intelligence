// Procedural Web Audio sound cues for Trauma Medicine.
// Calm, tactile clinical feedback with zero external audio files and full mute control.

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
      this.playTone({ freq: 640 * jitter, endFreq: 760 * jitter, duration: 0.09, type: 'triangle', gain: 0.055 });
    } else {
      this.playTone({ freq: 240 * jitter, endFreq: 190 * jitter, duration: 0.14, type: 'sawtooth', gain: 0.045 });
    }
  }

  playClear() {
    this.playTone({ freq: 523.25, duration: 0.11, type: 'triangle', gain: 0.06, delay: 0 });
    this.playTone({ freq: 659.25, duration: 0.12, type: 'triangle', gain: 0.06, delay: 0.08 });
    this.playTone({ freq: 783.99, duration: 0.18, type: 'sine', gain: 0.065, delay: 0.16 });
  }

  playMiss() {
    this.playTone({ freq: 290, endFreq: 210, duration: 0.16, type: 'triangle', gain: 0.06, delay: 0 });
    this.playTone({ freq: 205, endFreq: 165, duration: 0.22, type: 'sine', gain: 0.06, delay: 0.14 });
  }

  playPromote() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      this.playTone({ freq: f, duration: 0.14, type: 'triangle', gain: 0.055, delay: idx * 0.075 });
    });
  }

  playClick() {
    this.playTone({ freq: 440, duration: 0.045, type: 'sine', gain: 0.035 });
  }
}
