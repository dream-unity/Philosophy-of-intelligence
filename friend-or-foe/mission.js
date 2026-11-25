import {makeTrial} from './trial.js';
import {createRange} from './mission-range.js';
import {mountNotebook} from './notebook.js';

const el = id => document.getElementById(id);
let trial;
let notebook;
let phase = 'briefing';
let fieldState = null;
let soundOn = true;
let audio;
let pairWins = 0;
let perfectFiles = 0;

const range = createRange({
  canvas: el('range'),
  labels: el('names'),
  onUpdate: updateField,
  onFinish: report
});

function tone(from, to, duration = 0.13) {
  if (!soundOn) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    const note = audio.createOscillator();
    const gain = audio.createGain();
    note.type = 'triangle';
    note.frequency.setValueAtTime(from, audio.currentTime);
    note.frequency.exponentialRampToValueAtTime(to, audio.currentTime + duration);
    gain.gain.setValueAtTime(0.06, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    note.connect(gain).connect(audio.destination);
    note.start();
    note.stop(audio.currentTime + duration);
  } catch { /* Audio is optional. */ }
}

function setPhase(next) {
  phase = next;
  document.body.dataset.phase = next;
  const atDesk = next === 'briefing' || next === 'inspect';
  const onField = next === 'range' || next === 'paused';
  el('briefing').hidden = el('brief-actions').hidden = !atDesk;
  el('field').hidden = el('range-actions').hidden = !onField;
  el('review').hidden = el('report-actions').hidden = next !== 'review';
  el('pause-overlay').hidden = next !== 'paused';
  el('pause').firstChild.textContent = next === 'paused' ? 'Resume ' : 'Pause ';
}

function placementStatus() {
  const count = Object.values(notebook.getNotes()).reduce((n, names) => n + names.length, 0);
  const complete = count === 12;
  el('placement-count').textContent = count + ' of 12 placements';
  el('placement-hint').textContent = complete ? 'Notebook ready.' : 'File two names in each of the six roles.';
  el('launch').disabled = !complete;
  el('launch').textContent = phase === 'inspect' ? 'Return to range' : 'Enter range';
  return complete;
}

function deal() {
  trial = makeTrial(trial);
  fieldState = null;
  setPhase('briefing');
  el('case-number').textContent = 'Trial ' + String(trial.number).padStart(2, '0');
  el('order-label').textContent = trial.amended ? 'Same order · Revised record: ' + trial.revisedRecord : 'Your order';
  el('order').textContent = el('live-order').textContent = trial.brief.order;
  notebook = mountNotebook(el('notebook'), trial, placementStatus);
  placementStatus();
  el('briefing').scrollTop = 0;
  if (trial.number > 1) el('order').focus({preventScroll:true});
}

function launch() {
  if (!['briefing','inspect'].includes(phase) || !placementStatus()) return;
  const returning = phase === 'inspect';
  setPhase('range');
  if (returning) range.resume();
  else {
    tone(270, 440);
    range.start(trial.roster, trial.pair);
  }
}

function inspect() {
  if (phase !== 'range' && phase !== 'paused') return;
  range.pause();
  setPhase('inspect');
  placementStatus();
  el('briefing').scrollTop = 0;
  el('order').focus({preventScroll:true});
}

function pause() {
  if (phase !== 'range') return;
  range.pause();
  setPhase('paused');
  el('resume').focus({preventScroll:true});
}

function resume() {
  if (phase !== 'paused') return;
  setPhase('range');
  range.resume();
}

function updateField(status) {
  if (fieldState && status.shots > fieldState.shots) tone(490, 155, .09);
  fieldState = status;
  const left = 2 - status.shots;
  el('shots').textContent = left + (left === 1 ? ' shot left' : ' shots left');
  el('picks').textContent = status.selected.length ? 'Marked ' + status.selected.join(' & ') : 'Tap a cutout or its name to fire.';
  el('fire').disabled = !left || status.paused || status.finished;
  if (!left) {
    el('pass').textContent = status.fastForwarding ? 'Fast-forwarding' : 'Fast forward';
    el('pass').disabled = status.fastForwarding || status.paused || status.finished;
  } else {
    el('pass').textContent = 'Let pass';
    el('pass').disabled = !status.aimed || status.paused || status.finished;
  }
}

function report(result) {
  const notes = notebook.getNotes();
  const body = el('comparison').tBodies[0];
  body.replaceChildren();
  let exact = 0;
  for (const role of trial.roles) {
    const marked = notes[role.key];
    const hit = role.names.every(name => marked.includes(name));
    const row = body.insertRow();
    row.dataset.match = String(hit);
    if (hit) exact++;
    const heading = document.createElement('th');
    heading.scope = 'row';
    heading.textContent = role.label;
    row.append(heading);
    row.insertCell().textContent = marked.join(' & ');
    row.insertCell().textContent = role.names.join(' & ');
  }
  if (result.correct) pairWins++;
  if (result.correct && exact === 6) perfectFiles++;
  el('verdict').textContent = (result.correct ? 'Pair confirmed' : 'The requested pair') + ' · ' + trial.pair.join(' & ');
  el('report-order').textContent = trial.brief.order;
  el('your-picks').textContent = result.selected.length ? 'You marked ' + result.selected.join(' & ') + '.' : 'All ten cutouts passed.';
  el('note-score').textContent = exact + ' of 6 categories filed correctly.';
  el('session-score').textContent = 'Pairs found ' + pairWins + ' / ' + trial.number + ' · Perfect trials ' + perfectFiles;
  const steps = trial.proof.map(reason => {
    const li = document.createElement('li');
    li.textContent = reason;
    return li;
  });
  el('proof').replaceChildren(...steps);
  tone(result.correct ? 380 : 200, result.correct ? 640 : 142, .18);
  setPhase('review');
  el('review').scrollTop = 0;
  el('verdict').focus({preventScroll:true});
}

el('launch').addEventListener('click', launch);
el('next').addEventListener('click', deal);
el('read').addEventListener('click', inspect);
el('pause').addEventListener('click', () => phase === 'paused' ? resume() : pause());
el('resume').addEventListener('click', resume);
el('fire').addEventListener('click', () => range.select());
el('pass').addEventListener('click', () => fieldState?.shots === 2 ? range.fastForward() : range.pass());
el('sound').addEventListener('click', () => {
  soundOn = !soundOn;
  el('sound').textContent = soundOn ? 'Sound on' : 'Sound off';
  el('sound').setAttribute('aria-pressed', String(soundOn));
  if (phase === 'range') el('range').focus({preventScroll:true});
  if (soundOn) tone(330, 450);
});
el('how').addEventListener('click', () => {
  pause();
  el('help').showModal();
});
el('close-help').addEventListener('click', () => el('help').close());
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
document.addEventListener('keydown', event => {
  if (event.repeat || event.isComposing || event.altKey || event.metaKey || event.ctrlKey || el('help').open) return;
  if (event.code === 'KeyB' && (phase === 'range' || phase === 'paused')) {
    event.preventDefault();
    inspect();
  } else if (event.code === 'KeyP' && (phase === 'range' || phase === 'paused')) {
    event.preventDefault();
    if (phase === 'range') pause();
    else resume();
  }
});
deal();
