const groups = [
  [1, 'Diagnostic and investigative'],
  [11, 'Logical and formal'],
  [21, 'Relational and abstract'],
  [33, 'Predictive and quantitative'],
  [42, 'Strategic and systemic'],
  [53, 'Creative and synthetic'],
  [62, 'Social, psychological and ethical'],
  [71, 'Metacognitive and epistemological']
];
const storePrefix = 'poi.anki.schedule.v1.';
const minute = 60000;
const day = 1440 * minute;
const grades = ['Again', 'Hard', 'Good', 'Easy'];
const get = id => document.getElementById(id);
const groupOf = id => groups.findLast(group => id >= group[0])[1];
let cards = [];
let schedule = new Map();
let view = 'study';
let current = null;
let previousRecord;
let question = 0;
let revealed = false;
let wakeTimer;

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}
function button(label, style, action) {
  const node = element('button', style, label);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}
function list(items, tag, className) {
  const node = element(tag, className);
  for (const item of items) node.append(element('li', '', item));
  return node;
}
function inform(text) {
  get('notice').hidden = !text;
  get('notice').textContent = text;
}
function readRecord(id) {
  try {
    const raw = localStorage.getItem(storePrefix + id);
    if (raw === null) return null;
    const record = JSON.parse(raw);
    return record && Number.isFinite(record.due) && Number.isFinite(record.interval) &&
      record.interval > 0 && Number.isSafeInteger(record.reviews) && record.reviews > 0 ? record : null;
  } catch {
    return null;
  }
}
function refreshStorage() {
  for (const card of cards) {
    const item = readRecord(card.id);
    if (item) schedule.set(card.id, item);
  }
}
function selection() {
  return cards.filter(card => !get('family').value || groupOf(card.id) === get('family').value);
}
function dueQueue(now) {
  const items = selection();
  const due = items.filter(c => schedule.has(c.id) && schedule.get(c.id).due <= now);
  due.sort((a, b) => schedule.get(a.id).due - schedule.get(b.id).due || a.id - b.id);
  return due.concat(items.filter(c => !schedule.has(c.id)));
}
function intervals(record) {
  const oldDays = record ? record.interval / day : 0;
  return [
    minute,
    oldDays < 1 ? 6 * minute : Math.ceil(oldDays * 1.2) * day,
    Math.max(1, Math.ceil(oldDays * 2)) * day,
    Math.max(4, Math.ceil(oldDays * 3)) * day
  ].map(wait => Math.min(wait, 3650 * day));
}
function timeLabel(wait) {
  if (wait < day) return Math.round(wait / minute) + ' min';
  const days = Math.round(wait / day);
  return days + (days === 1 ? ' day' : ' days');
}
function updateProgress() {
  const items = selection();
  const seen = items.filter(c => schedule.has(c.id));
  const due = seen.filter(c => schedule.get(c.id).due <= Date.now());
  get('seen-total').textContent = seen.length + ' / ' + items.length;
  get('progress').max = items.length || 1;
  get('progress').value = seen.length;
  get('count-new').textContent = items.length - seen.length;
  get('count-due').textContent = due.length;
}
function setView(next) {
  view = next;
  get('study-pane').hidden = next === 'browse';
  get('browse-pane').hidden = next !== 'browse';
  for (const key of ['study', 'browse']) {
    const selected = key === (next === 'reference' ? 'browse' : next);
    get(key + '-tab').classList.toggle('selected', selected);
    get(key + '-tab').setAttribute('aria-pressed', String(selected));
  }
}
function focusHeading() {
  const heading = get('card').querySelector('h2');
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({preventScroll:true});
    if (heading.getBoundingClientRect().top < 0)
      get('card').scrollIntoView({block:'start'});
  }
}
function openCard(card, asReference = false) {
  current = card;
  previousRecord = card ? schedule.get(card.id) : undefined;
  question = (previousRecord?.reviews ?? 0) % (card?.questions.length || 1);
  revealed = asReference;
  setView(asReference ? 'reference' : 'study');
  render();
}
function nextCard() {
  openCard(dueQueue(Date.now())[0] ?? null);
}
function grade(i) {
  if (view !== 'study' || !current || !revealed) return;
  const durable = readRecord(current.id);
  if (durable && JSON.stringify(durable) !== JSON.stringify(previousRecord) &&
      durable.reviews >= (previousRecord?.reviews ?? 0)) {
    schedule.set(current.id, durable);
    inform('This card was reviewed in another tab. Your queue has been updated.');
    nextCard();
    return;
  }
  const interval = intervals(previousRecord)[i];
  const record = {due: Date.now() + interval, interval, reviews:(previousRecord?.reviews ?? 0) + 1};
  schedule.set(current.id, record);
  try {
    localStorage.setItem(storePrefix + current.id, JSON.stringify(record));
    inform('');
  } catch {
    inform('This browser could not save your review. You can keep studying for this session.');
  }
  nextCard();
  focusHeading();
}
function front(body, actions) {
  const nav = element('div', 'q-nav');
  const label = element('p', 'q-label');
  const arrows = element('div', 'arrows');
  const heading = element('h2', 'question');
  heading.setAttribute('aria-live', 'polite');
  const shift = delta => {
    question = (question + delta + current.questions.length) % current.questions.length;
    label.textContent = 'Question ' + (question + 1) + ' of ' + current.questions.length;
    heading.textContent = current.questions[question];
  };
  for (const [delta, glyph, name] of [[-1,'‹','Previous question'],[1,'›','Next question']]) {
    const control = button(glyph,'nav-button',() => shift(delta));
    control.setAttribute('aria-label',name);
    arrows.append(control);
  }
  shift(0);
  nav.append(label, arrows);
  const all = element('details');
  all.append(element('summary', '', 'Read all ' + current.questions.length + ' questions'),
    list(current.questions, 'ol', 'questions'));
  body.append(nav, heading, all);
  actions.classList.add('front-footer');
  actions.append(element('p', 'prompt', 'Which kind of reasoning do these questions practise?'),
    button('Reveal reasoning', 'primary', () => {revealed = true; render(); focusHeading();}));
}
function answer(body, actions) {
  body.append(element('h2','answer-title',current.name), element('p','definition',current.definition));
  for (const [heading, content, tag] of [
    ['Why it matters in medicine', current.medicine, 'p'],
    ['How a doctor uses it', current.benefits, 'ul'],
    ['Reasons to train it further', current.reasons, 'ol']
  ]) {
    const section = element('section','answer-section');
    section.append(element('h3','',heading),tag === 'p' ? element('p','',content) : list(content,tag,'answer-list'));
    body.append(section);
  }
  const returnFront = button('View questions','back-questions',() => {revealed=false; render(); focusHeading();});
  if (view === 'reference') {
    actions.classList.add('front-footer');
    actions.append(returnFront, button('Back to card list','plain',browse));
    return;
  }
  const toolbar = element('div','rating-head');
  toolbar.append(element('p','prompt','How well did you recall it?'), returnFront);
  const buttons = element('div','ratings');
  const waits = intervals(previousRecord);
  grades.forEach((label,i) => {
    const b = button(label,'rating',() => grade(i));
    b.append(element('small','',timeLabel(waits[i])));
    buttons.append(b);
  });
  actions.append(toolbar,buttons);
}
function render() {
  clearTimeout(wakeTimer);
  updateProgress();
  const container = get('card');
  if (!current) {
    const empty = element('div','empty');
    empty.append(element('h2','','All caught up'));
    const future = selection().map(c => schedule.get(c.id)?.due).filter(Number.isFinite);
    if (future.length) {
      const next = Math.min(...future);
      empty.append(element('p','','Next review: ' + new Date(next).toLocaleString(undefined, {dateStyle:'medium',timeStyle:'short'})));
      wakeTimer = setTimeout(() => {if (view === 'study' && !current) nextCard();},
        Math.min(Math.max(50,next-Date.now()+50),2147483647));
    }
    empty.append(button('Browse cards','plain',browse));
    container.replaceChildren(empty);
    return;
  }
  const top = element('div','card-top');
  top.append(element('span','family-name',groupOf(current.id)),element('span','side', revealed ? 'Answer side' : 'Question side'));
  const body = element('div','card-body');
  const actions = element('div','card-actions');
  if (revealed) answer(body,actions); else front(body,actions);
  if (view === 'reference' && !revealed) actions.append(button('Back to card list','plain',browse));
  container.replaceChildren(top,body,actions);
}
function showResults() {
  const query = get('search').value.toLocaleLowerCase().trim();
  const items = selection().filter(c => c.name.toLocaleLowerCase().includes(query));
  get('result-count').textContent = items.length + (items.length === 1 ? ' card' : ' cards');
  const nodes = items.map(c => {
    const item = button('','browse-item',() => {openCard(c,true); focusHeading();});
    item.append(element('strong','',c.name),element('small','',groupOf(c.id)));
    return item;
  });
  if (!nodes.length) nodes.push(element('p','','No matching cards. Try another name or family.'));
  get('results').replaceChildren(...nodes);
}
function browse() {
  clearTimeout(wakeTimer);
  setView('browse'); showResults();
}
async function init() {
  const response = await fetch('./cards.json');
  if (!response.ok) throw Error('deck');
  cards = await response.json();
  for (const [,name] of groups) get('family').add(new Option(name,name));
  refreshStorage();
  get('study-tab').addEventListener('click',nextCard);
  get('browse-tab').addEventListener('click',browse);
  get('search').addEventListener('input',showResults);
  get('family').addEventListener('change',() => view === 'study' ? nextCard() : browse());
  window.addEventListener('storage',event => {
    if (event.key && !event.key.startsWith(storePrefix)) return;
    if (event.key === null) schedule.clear();
    else {
      const id = Number(event.key.slice(storePrefix.length));
      const record = readRecord(id);
      if (record) schedule.set(id,record); else schedule.delete(id);
    }
    if (view === 'study' && (!current || event.key === null || event.key === storePrefix + current.id)) nextCard();
    else updateProgress();
  });
  document.addEventListener('visibilitychange',() => {
    if (!document.hidden && view === 'study') {
      if (!current) nextCard(); else updateProgress();
    }
  });
  nextCard();
}
init().catch(() => {
  const wrap = element('div','empty');
  wrap.append(element('h2','','The deck could not be loaded'), element('p','','Check your connection and try again.'),
    button('Reload deck','primary',() => location.reload()));
  get('card').replaceChildren(wrap);
});
