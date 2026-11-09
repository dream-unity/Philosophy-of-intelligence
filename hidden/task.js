'use strict';

const get = id => document.getElementById(id);
const settings = get('settings');
const session = get('session');
const keypad = get('keypad');
const clipDuration = 0.85;
let audio;
let digitBuffer;
let active = null;
let timer;
let source;

for (const digit of [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]) {
  const key = document.createElement('button');
  key.type = 'button';
  key.className = 'button secondary';
  key.textContent = String(digit);
  key.addEventListener('click', () => predict(digit));
  keypad.append(key);
}

function enableKeys(enabled) {
  for (const key of keypad.children) key.disabled = !enabled;
}

function drawDigit() {
  const byte = new Uint8Array(1);
  do { crypto.getRandomValues(byte); } while (byte[0] >= 250);
  return byte[0] % 10;
}

function playDigit(digit) {
  if (audio.state !== 'running') throw new Error('Audio interrupted');
  source = audio.createBufferSource();
  source.buffer = digitBuffer;
  source.connect(audio.destination);
  source.start(0, digit, clipDuration);
}

function playStartTone() {
  const tone = audio.createOscillator();
  const gain = audio.createGain();
  const start = audio.currentTime;
  tone.frequency.value = 440;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.09, start + 0.01);
  gain.gain.linearRampToValueAtTime(0, start + 0.16);
  tone.connect(gain);
  gain.connect(audio.destination);
  tone.start(start);
  tone.stop(start + 0.16);
  source = tone;
}

function schedule(run, callback, delay) {
  timer = setTimeout(() => {
    if (active !== run) return;
    try {
      callback(run);
    } catch {
      finish('Audio stopped. Check your sound and start again.');
    }
  }, delay);
}

function cueWarmup(run) {
  const digit = drawDigit();
  playDigit(digit);
  run.history.push(digit);
  get('progress').textContent = 'Warm-up · ' + run.history.length + ' of ' + run.level;
  get('prompt').textContent = 'Listen and remember.';
  if (run.history.length < run.level) {
    schedule(run, cueWarmup, run.interval);
  } else {
    schedule(run, openTrial, clipDuration * 1000);
  }
}

function openTrial(run) {
  run.guess = null;
  if (run.startedAt === null) run.startedAt = performance.now();
  run.deadline = performance.now() + run.interval;
  const predictionLabel = 'Prediction ' + (run.windows + 1);
  get('progress').textContent = run.modeLabel + ' · ' + predictionLabel +
    (run.trialLimit === null ? '' : ' of ' + run.trialLimit);
  get('prompt').textContent = run.horizon === 1
    ? 'What number comes next?'
    : 'Which digit is ' + run.horizon + ' reveals ahead?';
  enableKeys(true);
  schedule(run, reveal, run.interval);
}

function predict(digit) {
  const run = active;
  if (!run || run.guess !== null || performance.now() >= run.deadline) return;
  run.guess = digit;
  enableKeys(false);
  get('prompt').textContent = 'Prediction locked.';
}

function reveal(run) {
  run.deadline = 0;
  enableKeys(false);
  run.pending.push({ guess: run.guess, due: run.reveals + run.horizon });
  run.windows++;
  speakAndScore(run);

  const timeUp = run.durationMs !== null && performance.now() - run.startedAt >= run.durationMs;
  if (run.windows === run.trialLimit || timeUp) {
    finishReveals(run);
  } else {
    openTrial(run);
  }
}

function speakAndScore(run) {
  const digit = drawDigit();
  playDigit(digit);
  run.reveals++;
  if (run.direction === 'back') {
    if (digit === run.history.shift()) run.repeats++;
    run.history.push(digit);
  }
  if (run.pending[0].due === run.reveals) {
    const { guess } = run.pending.shift();
    run.total++;
    if (guess === digit) run.correct++;
    if (guess === null) run.missed++;
  }
}

function finishReveals(run) {
  if (run.pending.length) {
    const remaining = run.pending[run.pending.length - 1].due - run.reveals;
    get('progress').textContent = run.modeLabel + ' · Final reveals';
    get('prompt').textContent = remaining === 1 ? 'One digit left to hear.' : remaining + ' digits left to hear.';
    schedule(run, () => {
      speakAndScore(run);
      finishReveals(run);
    }, run.interval);
    return;
  }
  get('prompt').textContent = 'Listen to the final digit.';
  schedule(run, () => finish('Session complete.'), clipDuration * 1000);
}

function finish(message) {
  const run = active;
  if (!run) return;
  active = null;
  clearTimeout(timer);
  if (source) {
    source.stop();
    source = null;
  }
  enableKeys(false);
  session.hidden = true;
  settings.hidden = false;
  const result = get('result');
  const score = run.total
    ? ' ' + run.modeLabel + ' accuracy: ' + run.correct + '/' + run.total + ' (' +
      Math.round(100 * run.correct / run.total) + '%). Unanswered: ' + run.missed +
      '.' + (run.direction === 'back' ? ' N-back repeats heard: ' + run.repeats + '.' : '')
    : '';
  const unresolved = run.pending.filter(entry => entry.guess !== null).length +
    Number(run.deadline > 0 && run.guess !== null);
  result.textContent = message + score + (unresolved ? ' Predictions awaiting a reveal: ' + unresolved + '.' : '');
  result.hidden = false;
  get('start').focus();
}

async function start(event) {
  event.preventDefault();
  if (active || !settings.reportValidity()) return;
  const direction = get('direction').value;
  const level = get('level').valueAsNumber;
  const run = {
    direction, level, modeLabel: level + '-' + direction,
    horizon: direction === 'forward' ? level : 1,
    windows: 0, reveals: 0, pending: [],
    interval: Math.round(get('seconds').valueAsNumber * 1000),
    trialLimit: get('length-mode').value === 'trials' ? get('trials').valueAsNumber : null,
    durationMs: get('length-mode').value === 'time' ? get('minutes').valueAsNumber * 60000 : null,
    startedAt: null, history: [], deadline: 0, guess: null, correct: 0, total: 0, repeats: 0, missed: 0
  };
  active = run;
  get('result').hidden = true;
  settings.hidden = true;
  session.hidden = false;
  enableKeys(false);
  get('progress').textContent = run.modeLabel;
  get('prompt').textContent = 'Preparing audio…';
  get('stop').focus();
  try {
    if (!audio) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      audio = new Audio();
      audio.addEventListener('statechange', () => {
        if (active && active.playing && audio.state !== 'running') finish('Audio interrupted.');
      });
    }
    await audio.resume();
    if (active !== run) return;
    if (!digitBuffer) {
      const response = await fetch('./digits.mp3');
      if (!response.ok) throw new Error('Digit recording unavailable');
      const decoded = await audio.decodeAudioData(await response.arrayBuffer());
      if (active !== run) return;
      digitBuffer = decoded;
    }
    run.playing = true;
    if (direction === 'forward') {
      playStartTone();
      openTrial(run);
    } else {
      cueWarmup(run);
    }
  } catch {
    if (active === run) finish('Audio could not play. Check your sound and start again.');
  }
}

const backInstructions = get('instructions').textContent;

function updateMode() {
  const forward = get('direction').value === 'forward';
  get('level-label').textContent = forward ? 'N-forward level' : 'N-back level';
  get('instructions').textContent = forward
    ? 'At the tone, start predicting. Before each spoken digit, guess the digit N reveals ahead. At 3-forward, your first guess is for the third digit you hear, your second for the fourth. Listen through the final reveals to score every prediction.'
    : backInstructions;
}

get('direction').addEventListener('change', updateMode);
updateMode();

get('length-mode').addEventListener('change', () => {
  const timed = get('length-mode').value === 'time';
  get('trials-field').hidden = timed;
  get('trials').disabled = timed;
  get('minutes-field').hidden = !timed;
  get('minutes').disabled = !timed;
});
settings.addEventListener('submit', start);
get('stop').addEventListener('click', () => finish('Session ended.'));
document.addEventListener('keydown', event => {
  if (!active || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (/^[0-9]$/.test(event.key)) {
    event.preventDefault();
    predict(Number(event.key));
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) finish('Session ended when you left the page.');
});
window.addEventListener('pagehide', () => finish('Session ended.'));
