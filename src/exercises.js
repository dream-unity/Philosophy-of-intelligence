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
  const STREAM_DURATIONS = Object.freeze([15, 30, 60]);
  const FREQUENCIES = Object.freeze([0, 1, 2, 3, 8, 10, 12]);
  const BREATH_SECONDS = 5;
  const BODY_STEP_SECONDS = 30;

  function validBreathTiming(inhaleSeconds, exhaleSeconds) {
    return [inhaleSeconds, exhaleSeconds].every(value => Number.isFinite(value) && value >= 0.1) &&
      (inhaleSeconds * 1000 + exhaleSeconds * 1000) <= Number.MAX_SAFE_INTEGER;
  }

  const HEART_PRACTICE = Object.freeze({
    label: 'Heart activation',
    instruction: 'Rest your attention in the centre of your heart. Soften your chest and let a sincere feeling of love come forward as a felt experience. Breathe gently in and out through the heart, sustaining the feeling and gradually deepening it without forcing it.'
  });

  const BODY_STEPS = Object.freeze([
  {
    "id": "awareness",
    "label": "Awareness",
    "prompt": "Sit for a moment. What can you feel in your body? You can notice it before you know its name.",
    "pairing": "One line goes all the way around the circle. Let it remind you to notice your whole body before you pick one spot.",
    "example": "I can feel my feet inside my shoes and my back against the chair.",
    "questions": [
      "Does my awareness feel expanded or contracted?",
      "Is my awareness high, low or somewhere in between?",
      "What sensations are present across my body as a whole?",
      "What changes in my awareness when I notice several sensations together?"
    ]
  },
  {
    "id": "attention",
    "label": "Attention",
    "prompt": "Pick one feeling to notice for a moment. Then see what else you can feel.",
    "pairing": "Imagine folding a paper circle in half. You can look at just one half. You can pay attention to one part of your body in the same way.",
    "example": "I can feel both shoes. This time I notice just where my left sock touches my big toe.",
    "questions": [
      "Where is my attention resting right now?",
      "Is my focus narrow or broad?",
      "Can I shift attention to another sensation and return?",
      "What changes when I attend to one sensation rather than the whole body?"
    ]
  },
  {
    "id": "location",
    "label": "Location and boundary",
    "prompt": "Where do you feel it? Can you tell where that feeling ends?",
    "pairing": "Run your eyes around the three sides of the triangle. They show where its inside ends. See if you can find the edge of a feeling, too.",
    "example": "A soft rug tickles the bottoms of my feet. I can feel the tickle under my toes. By my ankles it fades away.",
    "questions": [
      "Where in my body do I notice the sensation?",
      "Is it close to the surface or deeper inside?",
      "Does it have a clear boundary or fade gradually?",
      "Is it in one place or present across several areas?"
    ]
  },
  {
    "id": "quality",
    "label": "Quality",
    "prompt": "What does it feel like? You might pick a word like warm, itchy, soft or prickly.",
    "pairing": "Think of the square as a little picture frame. Pick one feeling to put in it and describe how it feels.",
    "example": "My woolly sleeve feels soft on my arm, but its label feels scratchy on my neck.",
    "questions": [
      "What words best describe this sensation?",
      "Is it warm or cool, smooth or rough, steady or tingling?",
      "Does its texture change as I stay with it?",
      "Are there different qualities within the same area?"
    ]
  },
  {
    "id": "intensity",
    "label": "Intensity",
    "prompt": "How strong is the feeling? Does it feel tiny, big or somewhere in between?",
    "pairing": "The pentagon has five corners. Imagine them as five steps, from a very small feeling to a very strong one. Which step would you choose?",
    "example": "A feather brushes my hand. I know just where it touched, but the tickle is tiny. I'd pick the first step.",
    "questions": [
      "How strong or subtle is the sensation?",
      "Is it the same intensity throughout the area?",
      "Does it grow, lessen or remain steady?",
      "How does its intensity compare with another sensation?"
    ]
  },
  {
    "id": "rhythm",
    "label": "Time and rhythm",
    "prompt": "Stay with one feeling for a little while. Does it keep going, stop, or come back?",
    "pairing": "Follow the six sides of the hexagon with your eyes. Each time you go around, you come back to the start. Some feelings come back like that too.",
    "example": "When I drum on the table, my fingertips feel tap, tap, tap. When I rest my hand there, I feel the table the whole time.",
    "questions": [
      "Is the sensation continuous or intermittent?",
      "Does it pulse or repeat in a pattern?",
      "How quickly or slowly does it change?",
      "Does its rhythm relate to my breathing or another sensation?"
    ]
  },
  {
    "id": "movement",
    "label": "Movement",
    "prompt": "Does the feeling stay in one spot, move to a new spot, or spread out?",
    "pairing": "Let your eyes move from one corner of the heptagon to the next. Now see whether a feeling moves across your skin or stays put.",
    "example": "A drop of water rolls down my arm. I feel the cool spot travel from my elbow toward my hand.",
    "questions": [
      "Does the sensation stay still, move or spread?",
      "Does it move as one whole or in separate parts?",
      "Is its movement smooth, sudden or wave-like?",
      "What happens to nearby sensations as it moves?"
    ]
  },
  {
    "id": "direction",
    "label": "Direction",
    "prompt": "If the feeling moves, which way does it go? If it stays in one spot, you can say “still.”",
    "pairing": "Imagine an arrow from the middle of the octagon to any one of its eight corners. Which way would an arrow point for your feeling?",
    "example": "The cool drop on my arm moves toward my thumb. That's the way I'd point my arrow.",
    "questions": [
      "If the sensation moves, which way does it travel?",
      "Does it move toward or away from the centre of my body?",
      "Does its direction stay the same or change?",
      "If it feels still, is there an impulse or tendency toward movement?"
    ]
  },
  {
    "id": "tone",
    "label": "Felt tone",
    "prompt": "Do you like the feeling, dislike it, feel a bit of both, or have no strong feeling about it?",
    "pairing": "The prism joins two triangles together. They can remind you that two feelings can go together, too.",
    "example": "My scarf feels cosy, but one bit tickles my chin. I like the warmth and wish the tickle would stop.",
    "questions": [
      "Does the sensation feel pleasant, unpleasant, neutral or mixed?",
      "Does its felt tone change as I attend to it?",
      "Do different parts of it have different tones?",
      "How does its tone relate to my overall state?"
    ]
  },
  {
    "id": "impulse",
    "label": "Impulse",
    "prompt": "What do you feel like doing next? You can notice the wish before you choose what to do.",
    "pairing": "At a corner of the cube, you can follow more than one edge. Think of each way out as a different thing you could do.",
    "example": "My nose tickles and I want to rub it. I can feel that wish even while my hands are still.",
    "questions": [
      "Does this sensation bring an urge to act or move?",
      "Where do I notice that urge in my body?",
      "Does the urge grow, fade or change if I observe it?",
      "What choices are available before I respond?"
    ]
  },
  {
    "id": "coherence",
    "label": "Coherence",
    "prompt": "Notice a body feeling, a thought and something you want to do. Do they seem to fit together?",
    "pairing": "The flat sides of a dodecahedron fit together to make one shape. Look for things in your own experience that fit together, too.",
    "example": "I see my friend, feel a grin spread across my face and want to wave. All three fit together for me.",
    "questions": [
      "Do my sensations, thoughts and impulses seem to fit together?",
      "Which parts of my experience support one another?",
      "Is anything pulling in a different direction?",
      "What changes in the whole when I attend to one part?"
    ]
  },
  {
    "id": "meaning",
    "label": "Meaning",
    "prompt": "Say what you feel in your body. Then ask, “What might this feeling mean?” You can have more than one guess.",
    "pairing": "You can turn an icosahedron to look at a different triangle. Try looking at the same body feeling in a different way.",
    "example": "My tummy flutters before the school play. Maybe I'm excited to go on stage. Maybe I'm worried I'll forget my line.",
    "questions": [
      "What meaning am I giving this sensation?",
      "What else might the same sensation mean?",
      "How does the situation shape my interpretation?",
      "Does a different interpretation change how I experience it?"
    ]
  },
  {
    "id": "confidence",
    "label": "Confidence and uncertainty",
    "prompt": "What can you tell for sure about a feeling? Which part are you still guessing about?",
    "pairing": "The geodesic sphere has lots of little triangles. Imagine looking closely at just one. Pick one small thing you know, then one thing you're still wondering about.",
    "example": "I'm sure my cheeks feel warm. Maybe it's the sunshine. Maybe it's from running. I don't know yet.",
    "questions": [
      "What can I directly notice about the sensation?",
      "What am I interpreting or guessing?",
      "How certain am I about that interpretation?",
      "What else could I notice before deciding what it means?"
    ]
  },
  {
    "id": "responsiveness",
    "label": "Responsiveness",
    "prompt": "Think about how you feel now. Shift a little if you'd like. What feels different? What feels the same?",
    "pairing": "Picture turning a ball in your hands. You can see a new side and still hold the whole ball. Check in with your whole body again after you move.",
    "example": "My backpack strap pressed on one shoulder. After I took it off, I could still feel the spot for a little while. Then the feeling faded.",
    "questions": [
      "How does the sensation respond when my attention shifts?",
      "What changes if I gently adjust my posture or breathing?",
      "What stays the same after that change?",
      "Does the response appear immediately or gradually?"
    ]
  }
].map(step => Object.freeze(step)));

  class ExerciseClock {
    constructor(options) {
      const settings = options || {};
      if (!['stream', 'frequency', 'heart', 'body', 'unitive', 'open'].includes(settings.exercise)) throw new TypeError('Choose a practice.');
      if (!Number.isFinite(settings.duration) || settings.duration <= 0) throw new TypeError('Duration must be positive seconds.');
      this.exercise = settings.exercise;
      this.duration = settings.duration;
      this.inhaleSeconds = settings.inhaleSeconds === undefined ? BREATH_SECONDS : settings.inhaleSeconds;
      this.exhaleSeconds = settings.exhaleSeconds === undefined ? BREATH_SECONDS : settings.exhaleSeconds;
      if (!validBreathTiming(this.inhaleSeconds, this.exhaleSeconds)) throw new TypeError('Inhale and exhale must each be at least 0.1 seconds.');
      this._breathAnchorMilliseconds = 0;
      this._breathIndexBase = 0;
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

    _breathData() {
      // Derive every phase from active elapsed time, not from UI tick counts.
      // Milliseconds preserve common decimal durations at their boundaries.
      const elapsed = Math.max(0, this._elapsedMilliseconds - this._breathAnchorMilliseconds);
      const inhale = this.inhaleSeconds * 1000;
      const exhale = this.exhaleSeconds * 1000;
      const cycle = inhale + exhale;
      let cycleIndex = Math.floor(elapsed / cycle);
      let position = elapsed - cycleIndex * cycle;
      // Snap only floating-point noise at exact boundaries; a late UI tick still
      // advances directly to the current phase, never replaying missed phases.
      const tolerance = Math.max(1, this._elapsedMilliseconds) * Number.EPSILON * 8;
      if (cycle - position <= tolerance) { cycleIndex++; position = 0; }
      else if (position <= tolerance) position = 0;
      else if (Math.abs(position - inhale) <= tolerance) position = inhale;
      const inhaling = position < inhale;
      const phaseElapsed = inhaling ? position : position - inhale;
      const phaseDuration = inhaling ? inhale : exhale;
      return {
        breathPhase: inhaling ? 'inhale' : 'exhale',
        breathCycleIndex: cycleIndex,
        breathPhaseIndex: this._breathIndexBase + cycleIndex * 2 + (inhaling ? 0 : 1),
        breathDuration: phaseDuration / 1000,
        breathProgress: Math.min(1, Math.max(0, phaseElapsed / phaseDuration)),
        breathRemaining: this._status === 'completed' ? 0 : (phaseDuration - phaseElapsed) / 1000
      };
    }

    _restartBreath() {
      this._breathIndexBase = this._breathData().breathPhaseIndex + 1;
      this._breathAnchorMilliseconds = this._elapsedMilliseconds;
    }

    setBreathTiming(inhaleSeconds, exhaleSeconds) {
      if (!validBreathTiming(inhaleSeconds, exhaleSeconds)) throw new TypeError('Inhale and exhale must each be at least 0.1 seconds.');
      const completed = this._update();
      if (inhaleSeconds !== this.inhaleSeconds || exhaleSeconds !== this.exhaleSeconds) {
        this._restartBreath();
        this.inhaleSeconds = inhaleSeconds;
        this.exhaleSeconds = exhaleSeconds;
      }
      return this._emit(completed);
    }

    restartBreath() {
      const completed = this._update();
      this._restartBreath();
      return this._emit(completed);
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
        ...this._breathData(),
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
      this._breathAnchorMilliseconds = 0;
      this._breathIndexBase = 0;
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
      this._ready = false;
      this._pendingResume = false;
      this._pendingSound = null;
      this._generation = 0;
      this._onError = typeof settings.onError === 'function' ? settings.onError : function () {};
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
      if (!this._enabled || !this._ready || !this._context || this._context.state !== 'running' || this.bellVolume <= 0) return false;
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
      this._ready = false;
      this._pendingResume = false;
      this._pendingSound = null;
      this._generation++;
      this._timers.forEach(id => this._clearTimeout(id)); this._timers.clear();
      this._strikes.forEach(group => this._dispose(group)); this._strikes.clear();
      this._stopPads(fade);
      // Disconnect the reverb as well, so no residual bell continues after stop.
      this._verbNodes.forEach(function (node) { try { node.disconnect(); } catch (_) {} });
      this._verbNodes = []; this._verb = null;
    }

    _fail(error) {
      this._stop(0);
      try { this._onError(error); } catch (_) {}
      return false;
    }

    _activate() {
      this._pendingResume = false;
      this._ready = true;
      if (!this._pads.size) this._startPad();
      const sound = this._pendingSound;
      this._pendingSound = null;
      if (sound) sound();
    }

    _resumeAudio() {
      if (this._pendingResume) return true;
      const context = this._context, generation = this._generation;
      try {
        if (context.state === 'running') { this._activate(); return true; }
        // Resume inside the click handler, but build the sound only after the
        // context runs. Wall-clock cleanup must not expire a suspended bell.
        this._ready = false;
        this._pendingResume = true;
        const pending = context.resume();
        Promise.resolve(pending).then(() => {
          if (!this._enabled || generation !== this._generation || context !== this._context) return;
          if (context.state !== 'running') throw new Error('Audio is still suspended.');
          this._activate();
        }).catch(error => {
          if (this._enabled && generation === this._generation && context === this._context) this._fail(error);
        });
        return true;
      } catch (error) { return this._fail(error); }
    }

    _whenReady(sound) {
      if (!this._enabled || !this._context) return false;
      if (this._ready && this._context.state === 'running') {
        try { return sound(); } catch (error) { return this._fail(error); }
      }
      // Keep only the latest cue: resuming must never play a backlog of bells.
      this._pendingSound = sound;
      return this._resumeAudio();
    }

    start(options) {
      const settings = options || {};
      this._stop(0);
      this.frequency = FREQUENCIES.includes(Number(settings.frequency)) ? Number(settings.frequency) : 0;
      this.bellVolume = Number.isFinite(Number(settings.bellVolume)) ? Math.max(0, Math.min(1.5, Number(settings.bellVolume))) : 1;
      try {
        if (!this._context || this._context.state === 'closed') this._context = this._factory();
        if (!this._context) return false;
        this._enabled = true;
        return this._resumeAudio();
      } catch (error) { return this._fail(error); }
    }

    cue(inhale, breathingCue = true) {
      if (this.bellVolume <= 0) return false;
      // The lower-pitched exhale needs extra gain to be clearly audible on small speakers.
      const peak = !inhale && breathingCue ? 0.16 : 0.08;
      return this._whenReady(() => this._bowl(inhale ? 392 : 293.66, peak, 3.3));
    }

    preview() {
      if (this.bellVolume <= 0) return false;
      return this._whenReady(() => {
        // Match Project Meaning's test: inhale, then exhale 650 ms later.
        if (!this._bowl(392, 0.08, 3.3)) return false;
        this._schedule(() => this.cue(false), 650);
        return true;
      });
    }

    complete() {
      return this._whenReady(() => {
        this._stopPads(3);
        this._bowl(392, 0.13, 8.5);
        this._schedule(() => this._bowl(293.66, 0.11, 9.5), 3000);
        return true;
      });
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

  return Object.freeze({ HEART_DURATIONS, BODY_DURATIONS, STREAM_DURATIONS, FREQUENCIES, BREATH_SECONDS, BODY_STEP_SECONDS, HEART_PRACTICE, BODY_STEPS, validBreathTiming, ExerciseClock, ExerciseAudio });
});

