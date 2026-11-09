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
  const predictionLabel = 'Prediction ' + (run.total + 1);
  get('progress').textContent = run.level + '-back · ' + predictionLabel +
    (run.trialLimit === null ? '' : ' of ' + run.trialLimit);
  get('prompt').textContent = 'What number comes next?';
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
  const target = drawDigit();
  playDigit(target);
  if (target === run.history[0]) run.repeats++;
  run.history.shift();
  run.history.push(target);
  if (run.guess === target) run.correct++;
  if (run.guess === null) run.missed++;
  run.total++;
  const timeUp = run.durationMs !== null && performance.now() - run.startedAt >= run.durationMs;
  if ((run.trialLimit !== null && run.total >= run.trialLimit) || timeUp) {
    get('prompt').textContent = 'Listen to the final digit.';
    schedule(run, () => finish('Session complete.'), clipDuration * 1000);
  } else {
    openTrial(run);
  }
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
    ? ' ' + run.level + '-back accuracy: ' + run.correct + '/' + run.total + ' (' +
      Math.round(100 * run.correct / run.total) + '%). Unanswered: ' + run.missed +
      '. N-back repeats heard: ' + run.repeats + '.'
    : '';
  result.textContent = message + score;
  result.hidden = false;
  get('start').focus();
}

async function start(event) {
  event.preventDefault();
  if (active || !settings.reportValidity()) return;
  const run = {
    level: get('level').valueAsNumber,
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
  get('progress').textContent = run.level + '-back';
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
    cueWarmup(run);
  } catch {
    if (active === run) finish('Audio could not play. Check your sound and start again.');
  }
}

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
