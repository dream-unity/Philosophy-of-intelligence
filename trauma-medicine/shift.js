import { makeCall, accepts, reassessment, shuffledCycle, caseSeedForSlot, nextPracticeGoal } from './shift-deck.js';
import { REASONING_TYPE_LIST } from './reasoning-types.js';
import { DIFFICULTY_TIERS } from './tiers.js';
import { loadMasteryStore, saveMasteryStore, PROMOTE_STREAK, DEMOTE_MISS_STREAK } from './trauma-session.js';
import { ClinicalAudio } from './audio.js';

const el = id => document.getElementById(id);
const args = new URLSearchParams(location.search);
const pin = REASONING_TYPE_LIST.find(t => args.get('type') === t.id || String(t.number) === args.get('type'))?.number;
const ticket = args.get('seed');
const scope = [pin, ticket].filter(v => v != null).join('-');
const deckKey = 'td.calls.deck.v1' + scope;
const sessionKey = 'td.calls.shift.v1' + scope;
const settingsKey = 'td.calls.preferences.v1';
const audio = new ClinicalAudio();
const phases = { Before: 'Before arrival', During: 'In the trauma ward', After: 'After the emergency' };
const phaseFiles = { Before: 'before', During: 'during', After: 'after' };
const sceneForTitle = new Map([
  ['Two calls from the bridge','bridge'], ['One side barely moves','imaging'],
  ['The split on the scan','imaging'], ['The spare monitor','imaging'],
  ['The dimming signal','imaging'], ['Two ceiling lights','imaging'],
  ['The missing minute','review'], ['The departure film','review'],
  ['The wrong X-ray','review'], ['Before the postmortem meeting','review'],
  ['What travels between shifts?','review'], ['Two lessons from the night shift','review'],
  ['A record worth keeping','review'], ['The fall in the walking room','review'],
  ['A headline for the ward','review']
]);
function read(kind, key) {
  try { return JSON.parse(window[kind].getItem(key)); } catch { return null; }
}
function write(kind, key, value) {
  try { window[kind].setItem(key, JSON.stringify(value)); } catch { /* A private tab can still play. */ }
}
function randomSeed() { return crypto.getRandomValues(new Uint32Array(1))[0] || 1; }
function numberIn(value, min, max, fallback) {
  return value !== null && value !== '' && Number.isInteger(Number(value)) && Number(value) >= min && Number(value) <= max ? Number(value) : fallback;
}
const settings = read('localStorage', settingsKey) || {};
settings.length = numberIn(args.get('cases'), 1, 1000, numberIn(settings.length, 1, 1000, 20));
settings.pace = numberIn(settings.pace, 0, 90, 0);
const tierArg = DIFFICULTY_TIERS.find(t => t.id === args.get('tier'))?.rank;
settings.difficulty = tierArg || numberIn(settings.difficulty, 0, 6, 0);
settings.sound = Boolean(settings.sound);
audio.setMuted(!settings.sound);

function newDeck(first = true, previous = 0, seed = ticket === null ? randomSeed() : Number(ticket) >>> 0) {
  return { seed, first, previous, index: 0, replays:0 };
}
let deck = read('localStorage', deckKey);
if (!deck || !Number.isInteger(deck.seed) || !Number.isInteger(deck.index) || deck.index < 0 || deck.index >= 80) deck = newDeck();
let cachedQueueKey, cachedQueue;
function queue() {
  const key = [deck.seed,deck.first,deck.previous].join('/');
  if (cachedQueueKey !== key) {
    cachedQueue = shuffledCycle(deck.seed, {first:deck.first, previous:deck.previous});
    cachedQueueKey = key;
  }
  return cachedQueue;
}
function makeShift() {
  return { target:settings.length, total:0, cleared:0, streak:0, best:0, missStreak:0, level:settings.difficulty || 1,
    solvedTypes:[], issues:[], investigations:0, usefulChecks:0, readings:0, card:null, summary:false };
}
let state = read('sessionStorage', sessionKey);
if (!state || !Array.isArray(state.solvedTypes) || !Number.isInteger(state.target) || !Array.isArray(state.issues)) state = makeShift();
const save = () => write('sessionStorage', sessionKey, state);
let call, changedCall, variationKey, previousTime, isProvisional = false;
function reserve() {
  const sequence = queue(), number = pin || sequence[deck.index];
  // The same deck position reconstructs its case across a reload or an unfinished shift.
  const base = (deck.seed + Math.imul(deck.index + 1, 2654435761)) >>> 0;
  const opening = !pin && deck.first && deck.index < 5;
  const level=settings.difficulty || state.level;
  const seed = opening || pin ? base : caseSeedForSlot(number,base,deck.index,level);
  const castSeed = opening && deck.index < 3 ? deck.seed : undefined;
  state.card = { number, seed, castSeed, deckSeed:deck.seed, position:deck.index, level, opening,
    practiceGoal:nextPracticeGoal(deck.seed,deck.replays||0), selection:[], originalDone:false, practice:false, answered:false, timedOut:false, remaining:settings.pace * 1000 };
  save();
}
function closeCardSlot() {
  const old = state.card;
  // Another tab may already have advanced the shared deck. Keep its progress.
  const saved = read('localStorage', deckKey);
  if (saved && (saved.seed !== old.deckSeed || saved.index !== old.position)) {
    deck = saved;
    return;
  }
  deck.index++;
  if (deck.index >= 80) deck = newDeck(false, old.number, (deck.seed + 2246822519) >>> 0);
  write('localStorage', deckKey, deck);
}
function materialise() {
  const c = state.card;
  const params = {level:c.level, opening:c.opening, route:c.route ?? 0, castSeed:c.castSeed, practiceGoal:c.practiceGoal};
  const original = makeCall(c.number, c.seed, params);
  const key = [c.number,c.seed,c.level,c.opening,c.castSeed,c.practiceGoal].join('/');
  if (variationKey !== key) {
    changedCall = reassessment(c.number, c.seed, params);
    variationKey = key;
  }
  isProvisional = Boolean(original.intro && c.route == null);
  call = isProvisional
    ? {...original, ...original.intro, multiple:false}
    : c.practice && changedCall ? changedCall.call : original;
}
function updateStatus() {
  const progress = state.total + (state.card?.originalDone || state.summary ? 0 : 1);
  el('progress').textContent = `Case ${Math.min(progress,state.target)} / ${state.target}`;
  el('shift-track').style.setProperty('--progress', `${Math.min(100,state.total/state.target*100)}%`);
  const level = DIFFICULTY_TIERS[(settings.difficulty || state.level)-1];
  el('score').textContent = `${level.label.split(' · ')[1]}  ·  ${state.cleared}/${state.total} correct  ·  Streak ${state.streak}`;
}
function updateClockText() {
  const timer = el('timer');
  const c = state.card;
  const show = settings.pace && c && !c.answered && !c.practice && !isProvisional;
  timer.hidden = !show;
  if (show) {
    const seconds = Math.ceil(c.remaining / 1000);
    timer.textContent = `${seconds}s`;
    timer.classList.toggle('urgent', seconds <= 10);
  }
}
function fillList() {
  el('clues').replaceChildren(...call.clues.map((line, i) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    if (state.card.practice && i === changedCall?.at) {
      li.className = 'changed';
      span.setAttribute('aria-label', 'Changed clue. ' + line);
    }
    span.textContent = line;
    li.append(span);
    return li;
  }));
}
function selectionHint() {
  const c = state.card;
  if (!call.multiple || c.answered) return;
  el('select-hint').textContent = c.firstPlan ? `Plan 2 · ${c.selection.length} selected` : `${c.selection.length} selected`;
  el('commit').textContent = call.number === 53 && call.accepted.length > 1
    ? (c.firstPlan ? 'Confirm second plan' : 'Try first plan') : 'Confirm call';
  el('commit').disabled = !c.selection.length;
  [...el('options').children].forEach((b,i)=>b.setAttribute('aria-pressed', c.selection.includes(i)));
}
function goodCheck() { return !call.intro?.useful || call.intro.useful.includes(state.card.route); }
function describe(indices) { return indices.map(i => call.options[i]?.replace(/[.!]$/,'')).join(' + '); }
function fitCase() {
  if (!el('case-board').isConnected) return;
  delete document.body.dataset.fit;
  delete document.body.dataset.extraFit;
  const viewport = Math.min(document.documentElement.clientHeight, window.visualViewport?.height || Infinity);
  const foot = document.querySelector('.foot');
  const footFits = () => foot.getBoundingClientRect().bottom + (parseFloat(getComputedStyle(foot).marginBottom) || 0) <= viewport;
  if (footFits()) return;
  document.body.dataset.fit='snug';
  if (footFits()) return;
  document.body.dataset.fit='tight';
  if (el('case-board').getBoundingClientRect().bottom > viewport - 1) document.body.dataset.extraFit='yes';
}
function render(focus = false) {
  if (!state.card) reserve();
  materialise();
  const c = state.card, interpreted = c.answered && accepts(call, c.selection) && !c.timedOut;
  const solved = interpreted && goodCheck();
  document.body.dataset.phase = call.phase;
  document.body.dataset.state = c.answered ? 'debrief' : 'playing';
  el('case-title').textContent = call.title;
  el('compact-case-name').textContent = call.title;
  el('phase').textContent = phases[call.phase];
  const image = './scenes/' + (sceneForTitle.get(call.title) || phaseFiles[call.phase]) + '.webp';
  if (el('scene').getAttribute('src') !== image) el('scene').src = image;
  el('call-label').textContent = isProvisional ? (call.intro.useful ? 'Choose one check' : 'Working choice') : call.intro?.useful && !c.answered ? 'Your check came back' : c.firstPlan && !c.answered ? 'Find another way' : c.practice ? 'One clue changed' : 'Your call';
  el('question').textContent = c.firstPlan && !c.answered
    ? 'Can you build a different plan that also works?' : call.question;
  el('keyboard-hint').textContent = c.answered ? 'Space continues' : `1–${call.options.length} choose`;
  fillList();
  el('options').hidden = c.answered;
  el('submit-row').hidden = !call.multiple || c.answered;
  el('feedback').hidden = !c.answered;
  if (c.answered) {
    const verdict = el('verdict');
    verdict.textContent = c.timedOut ? 'Time ran out' : solved ? call.outcome || 'Call confirmed' : 'Review the call';
    if (c.practice && solved) verdict.textContent = changedCall.holds ? 'Your call still holds' : 'The call changes';
    if (call.intro?.useful && !c.timedOut) {
      verdict.textContent = (goodCheck() ? 'Useful check' : 'Limited check') + ' · ' + (interpreted ? 'Sound reading' : 'Review reading');
    }
    verdict.classList.toggle('miss', !solved);
    const winning = interpreted ? c.selection : call.accepted[0];
    el('chosen').textContent = (call.accepted.length > 1 && !solved ? 'One workable plan · ' : '') + describe(winning);
    if (c.firstPlan && solved) el('chosen').textContent = 'Two workable plans';
    el('rationale').textContent = call.why;
    if (call.intro?.useful && !goodCheck()) {
      const alternative = call.intro.options[call.intro.useful[0]].replace(/[.!]$/,'');
      el('rationale').textContent += ' Stronger check: ' + alternative + '.';
    }
    el('skill').textContent = `${call.meta.name} · ${call.meta.levelLabel}`;
    el('change').hidden = c.practice || !changedCall;
    el('advance').textContent = state.total >= state.target ? 'Finish shift' : 'Next case';
    if (focus) el('feedback').focus({preventScroll:true});
  } else {
    el('options').replaceChildren(...call.options.map((option,i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'option';
      const key = document.createElement('span');
      key.className = 'key'; key.textContent = String(i + 1); key.setAttribute('aria-hidden','true');
      const label = document.createElement('span'); label.textContent = option;
      b.append(key,label); b.addEventListener('click',()=>choose(i));
      return b;
    }));
    selectionHint();
    if (focus) el('question').focus({preventScroll:true});
  }
  updateClockText();
  updateStatus();
  fitCase();
}
function choose(i) {
  const c = state.card;
  if (c.answered || state.summary || el('settings').open || i >= call.options.length) return;
  if (isProvisional) {
    c.route=i; c.selection=[]; save(); render(true); previousTime=performance.now(); return;
  }
  if (call.multiple) {
    c.selection = c.selection.includes(i) ? c.selection.filter(x=>x!==i) : [...c.selection,i];
    selectionHint(); save(); audio.playClick();
  } else { c.selection=[i]; judge(); }
}
function judge(timedOut = false) {
  const c = state.card;
  if (c.answered || state.summary || (!c.selection.length && !timedOut)) return;
  c.timedOut = timedOut;
  const interpreted = !timedOut && accepts(call,c.selection);
  const won = interpreted && goodCheck();
  if (won && call.number === 53 && call.accepted.length > 1) {
    if (!c.firstPlan) {
      c.firstPlan=[...c.selection]; c.selection=[]; save(); render(true); audio.playClick(); return;
    }
    if (c.selection.length === c.firstPlan.length && c.selection.every(i=>c.firstPlan.includes(i))) {
      el('select-hint').textContent='That was your first plan. Change a step.';
      return;
    }
  }
  c.answered = true;
  if (!c.originalDone) {
    c.originalDone = true; state.total++;
    if (call.intro?.useful) {
      state.investigations=(state.investigations||0)+1;
      if (goodCheck()) state.usefulChecks=(state.usefulChecks||0)+1;
      if (interpreted) state.readings=(state.readings||0)+1;
    }
    if (won) { state.cleared++; state.streak++; state.missStreak=0; state.best=Math.max(state.best,state.streak); }
    else { state.streak=0; state.missStreak++; }
    state.solvedTypes.push(c.number);
    if (!won) state.issues.push(c.number);
    if (!settings.difficulty) {
      if (won && state.streak % PROMOTE_STREAK === 0) state.level=Math.min(6,state.level+1);
      if (!won && state.missStreak % DEMOTE_MISS_STREAK === 0) state.level=Math.max(1,state.level-1);
    }
    const mastery=loadMasteryStore(), old=mastery[call.meta.id] || {};
    mastery[call.meta.id]={ total:(Number(old.total)||0)+1, cleared:(Number(old.cleared)||0)+(won?1:0) };
    saveMasteryStore(mastery);
    closeCardSlot();
  }
  save(); render(true);
  if (won) audio.playClear(state.streak); else audio.playMiss();
}
function next() {
  if (!state.card.answered || state.summary) return;
  if (state.total >= state.target) return finish();
  state.card=null; reserve(); render(true); previousTime=performance.now();
}
function changeClue() {
  if (!changedCall || state.card.practice || !state.card.answered) return;
  const latest = read('localStorage',deckKey) || deck;
  latest.replays=(latest.replays||0)+1;
  deck=latest;
  write('localStorage',deckKey,deck);
  Object.assign(state.card,{practice:true, selection:[], firstPlan:null, answered:false, timedOut:false});
  save(); render(true);
}
function finish() {
  if (el('settings').open) el('settings').close();
  state.summary=true; save(); document.body.dataset.state='summary';
  el('summary-score').textContent = `${state.cleared} of ${state.total} calls`;
  const n = new Set(state.solvedTypes).size;
  el('summary-detail').textContent = `${n} reasoning ${n === 1?'style':'styles'} played · Best streak ${state.best}.`;
  const review=el('review'); review.replaceChildren();
  if (state.investigations) {
    const detail=document.createElement('p');
    detail.textContent=`Evidence checks ${state.usefulChecks || 0}/${state.investigations} · Interpretations ${state.readings || 0}/${state.investigations}`;
    review.append(detail);
  }
  if (state.issues.length) {
    const p=document.createElement('p');
    p.textContent = 'Revisit ' + [...new Set(state.issues)].slice(-3).map(n=>REASONING_TYPE_LIST[n-1].shortName.toLowerCase()).join(', ') + '.';
    review.append(p);
  }
  if (!el('summary').open) el('summary').showModal();
  el('again').focus();
}
function openSettings() {
  if (state.summary || el('settings').open) return;
  el('length').value=state.target; el('pace').value=settings.pace; el('difficulty').value=settings.difficulty; el('sound').checked=settings.sound;
  el('settings').showModal();
}
function resume() {
  if (!el('settings').open) return;
  const nextPace=Number(el('pace').value);
  if (nextPace!==settings.pace) state.card.remaining=nextPace*1000;
  settings.pace=nextPace; settings.sound=el('sound').checked;
  settings.difficulty=Number(el('difficulty').value);
  if (settings.difficulty) state.level=settings.difficulty;
  settings.length=numberIn(el('length').value,1,1000,state.target);
  state.target=Math.max(state.total+(state.card.originalDone?0:1),settings.length);
  write('localStorage',settingsKey,settings); save(); audio.setMuted(!settings.sound); el('settings').close();
  previousTime=performance.now(); render();
}
function clockTick() {
  const now=performance.now(), delta=now-(previousTime ?? now); previousTime=now;
  const c=state.card;
  if (!c || !settings.pace || state.summary || isProvisional || c.answered || c.practice || document.hidden || el('settings').open) return;
  c.remaining=Math.max(0,c.remaining-delta);
  updateClockText();
  if (!c.remaining) judge(true);
}
el('menu').addEventListener('click',openSettings);
el('continue').addEventListener('click',resume);
el('resume').addEventListener('click',resume);
el('settings').addEventListener('cancel',event=>{event.preventDefault();resume();});
el('summary').addEventListener('cancel',event=>event.preventDefault());
el('commit').addEventListener('click',()=>judge());
el('advance').addEventListener('click',next);
el('change').addEventListener('click',changeClue);
el('end').addEventListener('click',()=>{resume();finish();});
el('again').addEventListener('click',()=>{
  el('summary').close();state=makeShift();reserve();render(true);previousTime=performance.now();
});
document.addEventListener('keydown',event=>{
  if (event.altKey || event.metaKey || event.ctrlKey || event.repeat || el('summary').open) return;
  if (el('settings').open) return;
  if (event.key.toLowerCase()==='p' || event.key==='Escape') {event.preventDefault();openSettings();return;}
  if (/^[1-9]$/.test(event.key)) {event.preventDefault();choose(Number(event.key)-1);}
  if (event.code==='Space' && (event.target.tagName!=='BUTTON' || event.target.id==='advance')) {
    event.preventDefault();
    if (state.card.answered) next(); else if (call.multiple && state.card.selection.length) judge();
  }
});
window.addEventListener('resize', fitCase);
document.addEventListener('visibilitychange',()=>{previousTime=performance.now();save();});
window.addEventListener('pagehide',save);
if (!deck.first || deck.index !== 0 || !read('localStorage',deckKey)) write('localStorage',deckKey,deck);
render();
if (state.summary) finish();
setInterval(clockTick,250);
