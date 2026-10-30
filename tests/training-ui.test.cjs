'use strict';

// Exercise the real component's event handlers, storage, and clock without a
// browser dependency. This intentionally small DOM adapter implements only the
// HTML/selectors used by training.js; visual/layout checks remain browser QA.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const decode = value => String(value).replace(/&(amp|lt|gt|quot|#39);/g, (_, name) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[name]));
const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

class Element {
  constructor(tag = 'div', attributes = {}) {
    this.tagName = tag.toUpperCase(); this.attributes = attributes; this.children = [];
    this.listeners = new Map(); this.style = {}; this._text = ''; this._value = null;
    this.hidden = Object.hasOwn(attributes, 'hidden'); this.disabled = Object.hasOwn(attributes, 'disabled');
    this.readOnly = Object.hasOwn(attributes, 'readonly'); this.checked = Object.hasOwn(attributes, 'checked');
    this.open = Object.hasOwn(attributes, 'open');
    this.dataset = Object.fromEntries(Object.entries(attributes).filter(([key]) => key.startsWith('data-')).map(([key, value]) => [key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), value]));
    this.classList = { toggle: (name, force) => {
      const classes = new Set((this.attributes.class || '').split(/\s+/).filter(Boolean));
      if (force === undefined ? !classes.has(name) : force) classes.add(name); else classes.delete(name);
      this.attributes.class = [...classes].join(' ');
    } };
  }
  set innerHTML(html) {
    this.children = []; this._text = ''; this._html = html;
    const stack = [this];
    for (const token of html.match(/<!--[^]*?-->|<[^>]*>|[^<]+/g) || []) {
      if (token.startsWith('<!--')) continue;
      if (token.startsWith('</')) { if (stack.length > 1) stack.pop(); continue; }
      if (token.startsWith('<')) {
        const tag = token.match(/^<([\w-]+)/)?.[1]; if (!tag) continue;
        const attrs = {};
        const tail = token.slice(tag.length + 1).replace(/\/?\s*>$/, '');
        for (const match of tail.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attrs[match[1]] = decode(match[2] ?? match[3] ?? match[4] ?? '');
        const child = new Element(tag, attrs); stack.at(-1).children.push(child);
        if (!voidTags.has(tag) && !/\/>$/.test(token)) stack.push(child);
      } else stack.at(-1)._text += decode(token);
    }
  }
  get innerHTML() { return this._html || ''; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  set value(value) { this._value = String(value); }
  get value() {
    if (this._value !== null) return this._value;
    if (this.tagName === 'TEXTAREA') return this.textContent;
    if (this.tagName === 'SELECT') {
      const options = this.querySelectorAll('option');
      return (options.find(option => Object.hasOwn(option.attributes, 'selected')) || options[0])?.value || '';
    }
    return this.attributes.value || '';
  }
  matches(selector) {
    if (selector.startsWith('#')) return this.attributes.id === selector.slice(1);
    if (selector.startsWith('.')) return (this.attributes.class || '').split(/\s+/).includes(selector.slice(1));
    const attribute = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
    if (attribute) return Object.hasOwn(this.attributes, attribute[1]) && (attribute[2] === undefined || this.attributes[attribute[1]] === attribute[2]);
    return this.tagName.toLowerCase() === selector;
  }
  querySelectorAll(selector) {
    const result = [];
    for (const child of this.children) {
      if (child.matches(selector)) result.push(child);
      result.push(...child.querySelectorAll(selector));
    }
    return result;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  getAttribute(key) { return this.attributes[key] ?? null; }
  addEventListener(type, callback) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(callback); }
  dispatch(type) { for (const callback of this.listeners.get(type) || []) callback({ target: this, preventDefault() {} }); }
  click() { if (!this.disabled) this.dispatch('click'); }
  focus() { this.focused = true; }
  scrollIntoView() {}
  remove() {}
  append(child) { this.children.push(child); }
}

function harness(options = {}) {
  let now = 0, failWrites = !!options.failWrites;
  const raw = new Map(options.records || []), intervals = new Map(), events = new Map(), sounds = [], downloads = [];
  const storage = {
    getItem(key) { return raw.get(key) ?? null; },
    setItem(key, value) { if (failWrites) throw new Error('QuotaExceeded'); raw.set(key, value); },
    removeItem(key) { raw.delete(key); }
  };
  class Audio {
    constructor(settings = {}) { this.enabled = false; this.destroyed = false; this.cues = []; this.starts = 0; this.onError = settings.onError; sounds.push(this); }
    start(settings) { this.starts++; this.enabled = true; this.settings = settings; return true; }
    stop() { this.enabled = false; }
    cue(inhale) { if (this.enabled) this.cues.push(inhale); }
    preview() { if (!this.enabled) return false; this.cues.push(true, false); return true; }
    complete() { this.completed = true; this.completionSettings = { ...this.settings }; }
    destroy() { this.enabled = false; this.destroyed = true; }
  }
  const browser = vm.createContext({
    console, Blob, performance: { now: () => now }, localStorage: storage,
    confirm: () => true,
    document: { body: new Element('body'), createElement: tag => new Element(tag) },
    URL: { createObjectURL(blob) { downloads.push(blob); return 'blob:test'; }, revokeObjectURL() {} },
    setTimeout: () => 1, clearTimeout() {},
    setInterval(callback) { const id = intervals.size + 1; intervals.set(id, callback); return id; },
    clearInterval(id) { intervals.delete(id); },
    addEventListener(type, callback) { if (!events.has(type)) events.set(type, new Set()); events.get(type).add(callback); },
    removeEventListener(type, callback) { events.get(type)?.delete(callback); }
  });
  vm.runInContext('window = globalThis;', browser);
  for (const filename of ['relational-models.js', 'model-view.js', 'shape-practice.js', 'exercises.js', 'training-store.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../src', filename), 'utf8'), browser, { filename });
  browser.FormExercises = { ...browser.FormExercises, ExerciseAudio: Audio };
  if (options.realGeometry) vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/geometry.js'), 'utf8'), browser, { filename:'geometry.js' });
  else browser.FormGeometry = { miniIcon: (stageId, size) => '<svg aria-hidden="true" data-stage="'+stageId+'" width="'+size+'"></svg>' };
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/training.js'), 'utf8'), browser, { filename: 'training.js' });
  const host = new Element(), changes = [];
  const app = browser.FormTraining.mount({ root: host, stageId: options.stageId || 'circle', onStageChange: id => changes.push(id) });
  const q = selector => { const element = host.querySelector(selector); assert.ok(element, 'Missing UI control: ' + selector); return element; };
  function type(selector, value) { const element = q(selector); assert.equal(element.readOnly, false, 'Cannot type into a committed field'); element.value = value; element.dispatch('input'); }
  function choose(selector, value) { const element = q(selector); element.value = value; element.dispatch('change'); }
  return {
    app, host, q, type, choose, sounds, downloads, raw, changes, intervals,
    click: selector => q(selector).click(),
    submit: () => q('[data-return-form]').dispatch('submit'),
    applyRhythm(inhale, exhale) {
      if (inhale !== undefined) type('[data-inhale]', String(inhale));
      if (exhale !== undefined) type('[data-exhale]', String(exhale));
      q('[data-breath-form]').dispatch('submit');
    },
    data: () => JSON.parse(storage.getItem(browser.FormTrainingStore.STORAGE_KEY)),
    advance(seconds) { now += seconds * 1000; for (const callback of intervals.values()) callback(); },
    external(value) { raw.set(browser.FormTrainingStore.STORAGE_KEY, value); for (const callback of events.get('storage') || []) callback({ key: browser.FormTrainingStore.STORAGE_KEY }); },
    allowWrites() { failWrites = false; },
    key: browser.FormTrainingStore.STORAGE_KEY
  };
}

test('every shape supplies the actual animated SVG and one readout in the main practice canvas', () => {
  const page=harness({realGeometry:true});
  for(const stage of require('../src/shape-practice.js').STAGES){
    page.app.setStage(stage.id);
    const canvas=page.q('.training-shape-canvas'),pacer=canvas.querySelector('[data-pacer]');
    assert.ok(pacer,stage.id+' has a main shape pacer');
    const orb=pacer.querySelector('[data-orb]'),svg=orb.querySelector('svg');
    assert.equal(svg.getAttribute('data-stage'),stage.id);
    const drawingTags=['path','circle','ellipse','line','polyline','polygon','rect'];
    assert.ok(drawingTags.some(tag=>svg.querySelector(tag)),stage.id+' contains its drawn geometry');
    assert.equal(orb.querySelector('[data-breath-label]'),null,'breathing text is not scaled with the shape');
    assert.equal(page.host.querySelectorAll('[data-pacer]').length,1);
    assert.equal(page.host.querySelectorAll('[data-orb]').length,1);
    assert.equal(page.host.querySelectorAll('[data-breath-label]').length,1);
    assert.equal(page.host.querySelectorAll('[data-breath-count]').length,1);
    for(const selector of ['[data-start]','[data-pause]','[data-end]'])assert.ok(canvas.querySelector(selector));
  }
});

test('guide, settings and example panes switch without restarting or recording the running practice', () => {
  const page=harness({stageId:'triangle'});
  page.click('[data-start]');page.advance(3);
  const timer=page.q('[data-timer]').textContent,starts=page.sounds[0].starts,cues=[...page.sounds[0].cues];
  for(const name of ['settings','example','guide']){
    page.click('[data-pane-toggle="'+name+'"]');
    for(const pane of page.host.querySelectorAll('[data-pane]'))assert.equal(pane.hidden,pane.dataset.pane!==name);
    assert.equal(page.q('[data-timer]').textContent,timer,'switching panes keeps elapsed time');
    assert.equal(page.q('[data-breath-label]').textContent,'Inhale');
    assert.equal(page.q('[data-session-state]').textContent,'Practising');
    assert.equal(page.q('[data-pacer]').hidden,false);
    assert.equal(page.sounds[0].starts,starts);
    assert.deepEqual(page.sounds[0].cues,cues,'pane selection produces no extra bell');
    assert.equal(page.raw.has(page.key),false,'opening a pane does not finish or save the active period');
  }
  page.click('[data-open-panel]');
  assert.equal(page.q('[data-open-panel]').getAttribute('aria-expanded'),'false','Back to shape closes the mobile pane');
  assert.doesNotMatch(page.q('.training-unit').getAttribute('class'),/training-panel-open/);
  assert.equal(page.q('[data-pane="guide"]').hidden,false,'closing the mobile pane retains its selected guide for reopening');
  assert.equal(page.q('[data-pacer]').hidden,false);
  page.advance(2);
  assert.equal(page.q('[data-breath-label]').textContent,'Exhale','the same clock continues behind pane navigation');
  assert.equal(page.q('[data-timer]').textContent,'14:55');
  assert.deepEqual(page.sounds[0].cues,[true,false]);
});

test('changing exercises and shapes keeps an opened example pane reachable with keyboard focus', () => {
  const page=harness();
  page.click('[data-open-panel]');
  assert.equal(page.q('[data-open-panel]').getAttribute('aria-expanded'),'true');
  page.click('[data-pane-toggle="example"]');
  page.click('[data-exercise="heart"]');
  assert.equal(page.q('[data-pane="example"]').hidden,false);
  assert.equal(page.q('[data-examples]').open,true,'the selected example is restored after the exercise rerenders');
  assert.equal(page.q('[data-open-panel]').getAttribute('aria-expanded'),'true','mobile controls stay open around the focused exercise button');
  assert.equal(page.q('[data-exercise="heart"]').focused,true);
  page.app.setStage('cube');
  assert.equal(page.q('[data-pane="example"]').hidden,false);
  assert.equal(page.q('[data-examples]').open,true,'a new shape exposes the selected example pane immediately');
  assert.equal(page.q('[data-open-panel]').getAttribute('aria-expanded'),'true');
  page.click('[data-open-panel]');page.click('[data-open-panel]');
  assert.equal(page.q('[data-pane-toggle="example"]').focused,true,'reopening returns focus to the active pane control');
  assert.equal(page.sounds[0].starts,0);
});

test('body mapping keeps the main shape visible in own rhythm throughout the session', () => {
  const page=harness({stageId:'cube'});
  page.click('[data-exercise="body"]');
  assert.equal(page.q('[data-pacing]').value,'natural');
  assert.equal(page.q('[data-pacer]').hidden,false,'the shape remains visible before Start');
  page.click('[data-start]');page.advance(30);
  assert.equal(page.q('[data-pacer]').hidden,false);
  assert.equal(page.q('[data-breath-label]').textContent,'Own rhythm');
  assert.equal(page.q('[data-dimension]').textContent,'Quality');
  page.click('[data-pause]');
  assert.equal(page.q('[data-pacer]').hidden,false);
  page.click('[data-end]');
  assert.equal(page.q('[data-pacer]').hidden,false);
  assert.equal(page.q('[data-breath-label]').textContent,'Rest');
});

test('invalid pending timing reveals the settings pane and focuses the invalid field', () => {
  for(const [field,value] of [['inhale',''],['exhale','0']]){
    const page=harness();
    page.type('[data-'+field+']',value);
    page.click('[data-pane-toggle="guide"]');
    page.click('[data-start]');
    assert.equal(page.q('[data-pane="settings"]').hidden,false);
    assert.equal(page.q('[data-'+field+']').focused,true);
    assert.equal(page.q('[data-'+field+']').getAttribute('aria-invalid'),'true');
    assert.ok(page.q('[data-rhythm-status]').textContent.trim());
    assert.equal(page.q('[data-setup]').hidden,false);
    assert.equal(page.q('[data-breath-label]').textContent,'Ready');
    assert.equal(page.sounds[0].starts,0);
    assert.equal(page.raw.has(page.key),false);
  }
});

test('finite but unsupported timing opens a usable error instead of starting the metronome', () => {
  const page=harness();
  page.type('[data-inhale]','1e13');
  page.type('[data-exhale]','5');
  assert.doesNotThrow(()=>page.click('[data-start]'));
  assert.equal(page.q('[data-pane="settings"]').hidden,false);
  assert.equal(page.q('[data-inhale]').getAttribute('aria-invalid'),'true');
  assert.equal(page.q('[data-inhale]').focused,true);
  assert.ok(page.q('[data-rhythm-status]').textContent.trim());
  assert.equal(page.q('[data-setup]').hidden,false);
  assert.equal(page.q('[data-breath-label]').textContent,'Ready');
  assert.equal(page.sounds[0].starts,0);
  assert.equal(page.raw.has('form-breath-timing-v1'),false,'unsupported timing cannot replace the saved preference');
  page.type('[data-inhale]','3');page.click('[data-start]');
  assert.equal(page.q('[data-inhale]').getAttribute('aria-invalid'),'false');
  assert.equal(page.q('[data-breath-count]').textContent,'3 seconds','correcting the field starts a usable session');
});

test('native exercise selection mirrors desktop buttons and remains disabled for an active period', () => {
  const page=harness({stageId:'triangle'}),stage=require('../src/shape-practice.js').getStage('triangle');
  assert.deepEqual(page.q('[data-exercise-select]').querySelectorAll('option').map(option=>option.value),['stream','heart','body']);
  assert.equal(page.q('[data-exercise-select]').value,'stream');
  for(const exercise of ['heart','body','stream']){
    page.choose('[data-exercise-select]',exercise);
    assert.equal(page.q('[data-exercise-select]').value,exercise);
    assert.equal(page.q('[data-exercise-select]').focused,true,'the native control retains focus after rerender');
    for(const button of page.host.querySelectorAll('[data-exercise]'))assert.equal(button.getAttribute('aria-pressed'),String(button.dataset.exercise===exercise));
    assert.ok(page.q('[data-prompt]').textContent.includes(stage[exercise].cues.inhale),'the selected exercise supplies its guide');
    assert.equal(page.q('[data-exercise-select]').disabled,false);
  }
  page.click('[data-exercise="heart"]');
  assert.equal(page.q('[data-exercise-select]').value,'heart','desktop selection updates the native control too');
  page.click('[data-start]');
  assert.equal(page.q('[data-exercise-select]').disabled,true);
  assert.ok(page.host.querySelectorAll('[data-exercise]').every(button=>button.disabled));
  page.click('[data-pause]');
  assert.equal(page.q('[data-exercise-select]').disabled,true,'paused periods keep the same exercise');
  page.click('[data-end]');
  assert.equal(page.q('[data-exercise-select]').disabled,false);
  page.choose('[data-exercise-select]','body');
  assert.equal(page.q('[data-exercise-select]').value,'body');
  assert.equal(page.q('[data-pacing]').value,'natural');
  assert.equal(page.q('[data-dimension]').textContent,'Location');
});

test('guided rehearsal preserves receive, encode, retrieve, compare order and synchronizes the complete model', () => {
  const page=harness();
  assert.match(page.q('[data-walkthrough-title]').textContent,/receive and select/);
  assert.match(page.q('[data-walkthrough-prompt]').textContent,/containing environment/);
  page.click('[data-walk-next]');
  assert.match(page.q('[data-walkthrough-prompt]').textContent,/encode.*doorway/);
  page.click('[data-walk-next]');
  assert.match(page.q('[data-walkthrough-title]').textContent,/Seed the history/);
  assert.doesNotMatch(page.q('[data-walkthrough-prompt]').textContent,/Retrieve b/);
  page.click('[data-walk-next]');page.click('[data-walk-next]');
  assert.equal(page.q('[data-model-state]').value,'1');
  assert.match(page.q('[data-model-state-summary]').textContent,/Breath 2/);
  assert.match(page.q('[data-walkthrough-prompt]').textContent,/traversing ocean/);
  page.click('[data-walk-next]');page.click('[data-walk-next]');
  assert.match(page.q('[data-walkthrough-prompt]').textContent,/hallway shelf.*doorway/);
  assert.doesNotMatch(page.q('[data-walkthrough-prompt]').textContent,/meaning changes/);
  page.click('[data-walk-next]');
  assert.match(page.q('[data-walkthrough-prompt]').textContent,/Retrieve b1.*containment to traversal/);
  assert.equal(page.q('[data-walkthrough-title]').focused,true);
  assert.equal(page.raw.has(page.key),false,'example rehearsal cannot save notes or award readiness');
});

test('each of 42 guided lessons has four reachable entries, accurate addresses and no timer advancement', () => {
  const page=harness();
  for(const stage of require('../src/shape-practice.js').STAGES){
    page.app.setStage(stage.id);
    for(const exercise of ['stream','heart','body']){
      page.click('[data-exercise="'+exercise+'"]');
      for(let entry=0;entry<4;entry++){
        assert.equal(page.q('[data-model-state]').value,String(entry));
        assert.equal(page.q('[data-walkthrough-prompt]').textContent,stage[exercise].examples[entry].inhale);
        page.click('[data-walk-next]');
        assert.equal(page.q('[data-walkthrough-prompt]').textContent,stage[exercise].examples[entry].encode);
        page.click('[data-walk-next]');page.click('[data-walk-next]');
        if(entry)assert.ok(page.q('[data-walkthrough-prompt]').textContent.startsWith(stage[exercise].examples[entry].compare));
        page.click('[data-walk-next]');
      }
      assert.equal(page.q('[data-model-state]').value,'0','rehearse again starts a fresh example');
    }
  }
  page.click('[data-exercise="heart"]');page.click('[data-start]');
  const before=page.q('[data-walkthrough-prompt]').textContent;
  page.advance(85);
  assert.equal(page.q('[data-walkthrough-prompt]').textContent,before);
  assert.equal(page.q('[data-model-state]').value,'0');
  assert.equal(page.raw.has(page.key),false);
});

test('manual entry selection resets the teaching phase and detached walkthrough buttons cannot advance another lesson', () => {
  const page=harness();page.click('[data-walk-next]');
  const oldNext=page.q('[data-walk-next]');
  page.choose('[data-model-state]','3');
  assert.match(page.q('[data-walkthrough-title]').textContent,/receive and select/);
  assert.match(page.q('[data-walkthrough-prompt]').textContent,/environment of boat again/);
  oldNext.click();
  assert.match(page.q('[data-walkthrough-title]').textContent,/receive and select/);
  const stale=page.q('[data-walk-next]');page.click('[data-exercise="body"]');stale.click();
  assert.equal(page.q('[data-model-state]').value,'0');
  assert.match(page.q('[data-walkthrough-title]').textContent,/receive and select/);
  page.click('[data-walk-next]');page.click('[data-walk-back]');
  assert.match(page.q('[data-walkthrough-title]').textContent,/receive and select/);
});

test('all 42 practices teach through the main shape metronome with their own guide and worked example', () => {
  const page=harness();
  for(const stage of require('../src/shape-practice.js').STAGES){
    page.app.setStage(stage.id);
    for(const exercise of ['stream','heart','body']){
      page.click('[data-exercise="'+exercise+'"]');
      const context=stage.id+'/'+exercise,cues=stage[exercise].cues;
      const canvas=page.q('.training-shape-canvas'),pacer=canvas.querySelector('[data-pacer]');
      assert.ok(pacer,context+' uses the main shape as its metronome');
      assert.equal(page.host.querySelectorAll('[data-pacer]').length,1,'no second small metronome appears');
      const symbol=pacer.querySelector('[data-orb]').querySelector('svg');
      assert.equal(symbol.attributes['data-stage'],stage.id);
      assert.equal(page.host.querySelectorAll('[data-breath-label]').length,1);
      assert.equal(page.host.querySelectorAll('[data-breath-count]').length,1);
      for(const selector of ['[data-start]','[data-pause]','[data-end]'])assert.ok(canvas.querySelector(selector),selector+' stays inside the main shape');
      page.click('[data-pane-toggle="example"]');
      assert.equal(page.q('[data-pane="example"]').hidden,false);
      assert.ok(page.q('[data-pane="example"]').querySelector('[data-walkthrough]'),context+' keeps its worked example in the side pane');
      page.click('[data-pane-toggle="guide"]');
      assert.equal(page.q('[data-pane="guide"]').hidden,false);
      assert.ok(page.q('[data-pane="guide"]').querySelector('[data-prompt]'),context+' keeps its shape-specific instructions in the guide');
      for(const selector of ['[data-lesson]','[data-short-example]','.training-breath-method','.training-four','.training-reconstruction','.training-theory','[data-live-shape]']){
        assert.equal(page.host.querySelector(selector),null,'removed teaching stays absent: '+selector);
      }
      page.choose('[data-pacing]','paced');
      assert.equal(page.q('[data-prompt]').textContent,cues.inhale,context+' previews its own inhale instruction');
      page.click('[data-start]');
      assert.equal(page.q('[data-breath-label]').textContent,'Inhale');
      assert.equal(page.q('[data-prompt]').textContent,cues.inhale);
      const dimension=page.q('[data-dimension]').textContent;
      page.advance(5);
      assert.equal(page.q('[data-breath-label]').textContent,'Exhale');
      assert.equal(page.q('[data-prompt]').textContent,cues.exhale,context+' switches to encoding and return on exhale');
      if(exercise==='body')assert.equal(page.q('[data-dimension]').textContent,dimension,'breath cues change within the same body dimension');
      page.click('[data-pause]');page.advance(50);
      assert.equal(page.q('[data-prompt]').textContent,cues.exhale,context+' preserves the paused phase instruction');
      page.click('[data-live-pace]');
      assert.ok(page.q('[data-prompt]').textContent.includes('Inhale: '+cues.inhale),context+' keeps inhale teaching in own rhythm');
      assert.ok(page.q('[data-prompt]').textContent.includes('Exhale: '+cues.exhale),context+' keeps exhale teaching in own rhythm');
      page.click('[data-pause]');page.advance(15);
      assert.equal(page.q('[data-model-state]').value,'0','pacer cycles do not advance a worked entry or its memory address');
      assert.ok(page.q('[data-next-step]').textContent.trim(),context+' retains concise contextual help');
      page.click('[data-end]');
      assert.equal(page.data().entries.length,0,'guided breaths never invent committed observations');
    }
  }
});

test('exercise and readiness rerenders preserve keyboard focus on their replacement controls', () => {
  const page=harness();page.click('[data-exercise="heart"]');
  assert.equal(page.q('[data-exercise="heart"]').focused,true);
  page.q('[data-ready]').checked=true;page.q('[data-ready]').dispatch('change');
  assert.equal(page.q('[data-ready]').focused,true);
  page.click('[data-other]');
  assert.equal(page.q('[data-exercise="body"]').focused,true);
});

test('manual return keeps the exact two-back source and commits recollection before revealing it', () => {
  const page = harness({ stageId: 'square' });
  page.choose('[data-lag]', '2');
  page.type('[data-note="source"]', 'First: warmth.'); page.submit();
  page.type('[data-note="source"]', 'Second: pressure.'); page.submit();
  page.type('[data-note="source"]', 'Third: movement.');
  assert.equal(page.host.querySelector('[data-note="recollection"]'), null, 'deliberate recollection is unavailable until the current entry is locked');
  page.click('[data-lock-source]');
  page.type('[data-note="recollection"]', 'I remember heat.');
  assert.equal(page.q('.training-original').hidden, true);
  assert.doesNotMatch(page.q('.training-original').textContent, /First: warmth/);
  page.submit();
  assert.equal(page.data().entries.length, 2, 'cannot keep a comparison without its source check');
  page.click('[data-reveal]');
  assert.equal(page.q('.training-original').hidden, false);
  assert.match(page.q('.training-original').textContent, /First: warmth/);
  assert.doesNotMatch(page.q('.training-original').textContent, /Second: pressure/);
  assert.equal(page.q('[data-note="source"]').readOnly, true);
  assert.equal(page.q('[data-note="recollection"]').readOnly, true);
  assert.equal(page.q('[data-lag]').disabled, true);
  page.type('[data-note="relation"]', 'The present feature differs from the original warmth.');
  page.type('[data-note="revision"]', 'The earlier word was warmth, not heat.');
  page.submit();
  const entries = page.data().entries;
  assert.equal(entries.length, 3);
  assert.equal(entries[2].referenceId, entries[0].id);
  assert.equal(entries[2].referenceSource, 'First: warmth.');
  assert.equal(entries[2].recollection, 'I remember heat.');
  assert.equal(entries[0].source, 'First: warmth.');
  assert.equal(page.app.hasDraft(), false);
});

test('changing exercise and shape preserves drafts while keeping observation streams separate', () => {
  const page = harness();
  page.click('[data-exercise="heart"]');
  page.type('[data-note="source"]', 'Heart draft.');
  page.click('[data-exercise="body"]');
  assert.equal(page.q('[data-note="source"]').value, '');
  page.type('[data-note="source"]', 'Body draft.');
  page.app.setStage('sphere');
  assert.equal(page.q('[data-note="source"]').value, '');
  page.app.setStage('circle');
  assert.equal(page.q('[data-note="source"]').value, 'Body draft.');
  page.submit();
  page.click('[data-exercise="heart"]');
  assert.equal(page.q('[data-note="source"]').value, 'Heart draft.');
  assert.equal(page.host.querySelector('[data-reveal]'), null, 'a body record cannot become the heart return target');
  page.submit();
  assert.deepEqual(page.data().entries.map(entry => entry.exercise), ['body', 'heart']);
  assert.ok(page.data().entries.every(entry => entry.referenceId === null));
});

test('all fourteen shapes expose all three applications and readiness remains reversible', () => {
  const page = harness();
  const ids = ['circle', 'half-circle', 'triangle', 'square', 'pentagon', 'hexagon', 'heptagon', 'octagon', 'prism', 'cube', 'dodecahedron', 'icosahedron', 'geodesic', 'sphere'];
  for (const id of ids) {
    page.app.setStage(id);
    assert.equal(page.q('[data-shape]').value, id);
    for (const exercise of ['stream', 'heart', 'body']) {
      page.click('[data-exercise="' + exercise + '"]');
      assert.equal(page.q('[data-exercise="' + exercise + '"]').getAttribute('aria-pressed'), 'true');
      const check = page.q('[data-ready]'); check.checked = true; check.dispatch('change');
      assert.equal(page.data().readiness[id][exercise], true);
      for (const selector of ['[data-return]', '[data-readiness]', '.training-record', '.training-attribution']) {
        assert.equal(page.q(selector).hidden, true, id + ' / ' + exercise + ': removed section stays out of the rendered UI');
      }

    }
    const check = page.q('[data-ready]'); check.checked = false; check.dispatch('change');
    assert.equal(page.data().readiness[id].body, false);
    assert.equal(page.data().readiness[id].heart, true);
    assert.equal(page.data().readiness[id].stream, true);
  }
  assert.equal(page.data().sessions.length, 0, 'self-assessment does not manufacture a session');
  assert.equal(page.data().entries.length, 0, 'notes are optional for manual practice');
  assert.doesNotMatch(page.host.textContent, /Cedar|End mission|Commit the relation|CHALLENGE 1/);
});

test('each exercise opens with a stable preview without starting sound or recording elapsed time', () => {
  const page = harness();
  for (const exercise of ['stream', 'heart', 'body']) {
    page.click('[data-exercise="' + exercise + '"]');
    assert.equal(page.q('[data-live]').hidden, false, exercise + ' is visible before Start');
    assert.equal(page.q('[data-setup]').hidden, false);
    assert.equal(page.q('[data-start]').textContent.trim(), 'Start');
    assert.equal(page.q('[data-duration-field]').hidden, false);
    assert.ok(page.q('[data-prompt]').textContent.trim(), exercise + ' explains the visible exercise');
    if (exercise === 'body') {
      assert.equal(page.q('[data-dimension]').textContent, 'Location');
      assert.equal(page.q('[data-body-steps]').hidden, false);
      page.click('[data-peek="4"]');
      assert.equal(page.q('[data-dimension]').textContent, 'Direction', 'dimensions can be explored before starting');
    } else {
      assert.equal(page.q('[data-pacer]').hidden, false);
      assert.equal(page.q('[data-breath-label]').textContent, 'Ready');
      assert.equal(page.q('[data-orb]').style.transform, 'scale(1)');
      if (exercise === 'heart') assert.match(page.q('[data-step-label]').textContent, /Step 1/);
    }
    const prompt = page.q('[data-prompt]').textContent;
    page.advance(900);
    assert.equal(page.q('[data-prompt]').textContent, prompt, 'preview does not advance with wall time');
    assert.equal(page.q('[data-orb]').style.transform, 'scale(1)');
    assert.equal(page.raw.has(page.key), false, 'preview does not create a practice record');
    assert.ok(page.sounds.every(audio => audio.starts === 0 && audio.cues.length === 0));
  }
  page.click('[data-start]');
  assert.equal(page.q('[data-timer]').textContent, '15:00', 'Start begins a fresh duration after previewing');
  assert.equal(page.q('[data-dimension]').textContent, 'Location', 'Start resets any previewed dimension');
});

test('one Start inside the shape applies pending side-pane settings without an extra confirmation', () => {
  const page = harness();
  assert.ok(page.q('.training-shape-canvas').querySelector('[data-start]'));
  page.click('[data-pane-toggle="settings"]');
  const settings=page.q('[data-pane="settings"]');
  assert.equal(settings.hidden,false);
  for (const selector of ['[data-duration]', '[data-pacing]', '[data-inhale]', '[data-exhale]', '[data-bell]', '[data-sound]', '[data-frequency]', '[data-volume]']) {
    assert.ok(settings.querySelector(selector),selector+' is available in the settings pane');
  }
  assert.equal(page.host.querySelectorAll('[data-start]').length, 1);
  assert.equal(page.host.querySelector('[data-again]'), null);
  page.choose('[data-duration]', '30');
  page.type('[data-inhale]', '2.5');
  page.type('[data-exhale]', '6.5');
  page.click('[data-start]');
  assert.equal(page.q('[data-timer]').textContent, '30:00');
  assert.equal(page.q('[data-breath-count]').textContent, '2.5 seconds');
  assert.equal(page.q('[data-duration-field]').hidden, true);
  assert.equal(page.q('[data-setup]').hidden, true);
  assert.equal(page.q('[data-breath-form]').hidden, false, 'rhythm stays adjustable while practising');
  page.advance(2.5);
  assert.equal(page.q('[data-breath-label]').textContent, 'Exhale');
  assert.equal(page.q('[data-breath-count]').textContent, '6.5 seconds');
});

test('ending and completing practice restore the same Start inside the shape', () => {
  const page = harness();
  page.click('[data-start]');
  page.advance(10);
  page.click('[data-end]');
  assert.equal(page.q('[data-breath-label]').textContent, 'Rest');
  assert.equal(page.q('[data-prompt]').textContent, 'Keep your last entry. Rest in your own rhythm.');
  assert.equal(page.q('[data-next-step]').textContent, '', 'ending clears instructions to continue the exercise');
  assert.equal(page.q('[data-setup]').hidden, false);
  assert.equal(page.q('[data-duration-field]').hidden, false);
  assert.equal(page.data().sessions.length, 1);
  page.click('[data-start]');
  assert.equal(page.q('[data-timer]').textContent, '15:00');
  assert.equal(page.q('[data-prompt]').textContent, require('../src/shape-practice.js').getStage('circle').stream.cues.inhale, 'restart restores the first inhale instruction');
  page.advance(900);
  assert.equal(page.q('[data-session-state]').textContent, 'Complete');
  assert.equal(page.q('[data-prompt]').textContent, 'Keep your last entry. Rest in your own rhythm.');
  assert.equal(page.q('[data-next-step]').textContent, '', 'completion clears instructions to continue the exercise');
  assert.equal(page.q('[data-setup]').hidden, false);
  assert.equal(page.q('[data-duration-field]').hidden, false);
  assert.equal(page.data().sessions.length, 2);
  page.choose('[data-duration]', '30');
  page.click('[data-start]');
  assert.equal(page.q('[data-timer]').textContent, '30:00');
  assert.equal(page.q('[data-setup]').hidden, true);
  assert.equal(page.data().sessions.length, 2, 'restarting does not duplicate the completed record');
});

test('body dimensions advance at 30 seconds, rereading does not change the clock, and pause freezes it', () => {
  const page = harness();
  page.click('[data-exercise="body"]'); page.click('[data-start]');
  assert.equal(page.q('[data-dimension]').textContent, 'Location');
  page.advance(10); page.click('[data-peek="4"]');
  assert.equal(page.q('[data-dimension]').textContent, 'Direction');
  assert.equal(page.q('[data-timer]').textContent, '14:50');
  page.advance(20);
  assert.equal(page.q('[data-dimension]').textContent, 'Quality', 'a new live step ends rereading');
  page.click('[data-pause]'); page.advance(500);
  assert.equal(page.q('[data-timer]').textContent, '14:30');
  assert.equal(page.q('[data-session-state]').textContent, 'Paused');
  page.click('[data-pause]'); page.advance(30);
  assert.equal(page.q('[data-dimension]').textContent, 'Intensity');
  page.click('[data-end]');
  assert.equal(page.data().sessions.length, 1);
  assert.equal(page.data().sessions[0].seconds, 60);
  assert.equal(page.data().sessions[0].completed, false);
  assert.match(page.q('[data-record]').textContent, /1 recorded practice period/);
  page.app.pause(); page.advance(100);
  assert.equal(page.data().sessions.length, 1, 'lifecycle pauses cannot duplicate a session record');
});

test('heart completion records once, time never awards readiness, and all audio stops on leave', () => {
  const page = harness();
  page.click('[data-exercise="heart"]');
  const sound = page.q('[data-sound]'); sound.checked = true; sound.dispatch('change');
  page.choose('[data-pacing]', 'paced'); page.click('[data-start]');
  page.advance(298);
  assert.match(page.q('[data-step-label]').textContent, /Step 2/);
  page.click('[data-test-sound]');
  assert.equal(page.sounds[0].enabled, true, 'test tone does not interrupt the exercise sound');
  assert.equal(page.sounds[1].enabled, true);
  page.click('[data-live-pace]');
  assert.equal(page.q('[data-breath-label]').textContent, 'Own rhythm');
  page.advance(602);
  assert.equal(page.q('[data-session-state]').textContent, 'Complete');
  assert.equal(page.data().sessions.length, 1);
  assert.equal(page.data().sessions[0].completed, true);
  assert.deepEqual(page.data().readiness, {});
  page.advance(600);
  assert.equal(page.data().sessions.length, 1);
  page.app.pause();
  assert.ok(page.sounds.every(audio => !audio.enabled));
  page.app.destroy();
  assert.ok(page.sounds.every(audio => audio.destroyed));
  assert.equal(page.intervals.size, 0);
});

test('heart practice starts the enabled bell and ambient sound with the first guided inhale', () => {
  const page = harness();
  page.click('[data-exercise="heart"]');
  assert.equal(page.q('[data-pacing]').value, 'paced');
  assert.equal(page.q('[data-sound]').checked, true);
  assert.equal(page.q('[data-bell]').checked, true);
  assert.equal(page.q('[data-bell-toggle]').hidden, false);
  assert.match(page.q('[data-bell-toggle]').textContent, /Bell: on/i);
  assert.equal(page.q('.training-sound').querySelector('[data-bell-toggle]'), null, 'the bell control is available outside collapsed sound settings');
  assert.ok(page.sounds.every(audio => !audio.enabled), 'rendering a page must not start audio');
  page.click('[data-start]');
  assert.equal(page.sounds[0].enabled, true);
  assert.equal(page.sounds[0].settings.frequency, 10, 'ambient sound starts automatically with the default bell');
  assert.deepEqual(page.sounds[0].cues, [true]);
  assert.equal(page.q('[data-breath-label]').textContent, 'Inhale');
  page.advance(4.8);
  assert.deepEqual(page.sounds[0].cues, [true]);
  page.advance(0.2);
  assert.deepEqual(page.sounds[0].cues, [true, false]);
  assert.equal(page.q('[data-breath-label]').textContent, 'Exhale');
  page.advance(5);
  assert.deepEqual(page.sounds[0].cues, [true, false, true]);
});

test('own rhythm gently expands and contracts without moving its label or imposing timed bells', () => {
  const page = harness();
  page.choose('[data-pacing]', 'natural');
  page.click('[data-start]');
  const scale=()=>Number(page.q('[data-orb]').style.transform.match(/scale\(([^)]+)\)/)[1]);
  const base=scale();
  page.advance(6);
  const expanded=scale();
  assert.ok(expanded>base,'the main shape expands gently');
  assert.equal(page.q('[data-breath-label]').textContent, 'Own rhythm');
  assert.equal(page.q('[data-breath-count]').textContent, 'Gently · without holds');
  assert.equal(page.q('.training-breath-readout').style.transform, undefined);
  page.advance(6);
  assert.equal(scale(),base,'the main shape returns to its starting size');
  assert.deepEqual(page.sounds[0].cues, []);
  page.advance(3);
  page.click('[data-pause]');
  const paused = page.q('[data-orb]').style.transform;
  page.advance(6);
  assert.equal(page.q('[data-orb]').style.transform, paused, 'pausing stops the decorative pulse');
  page.click('[data-pause]');
  page.advance(3);
  assert.equal(scale(),expanded,'resuming continues session time');
  page.click('[data-end]');
  page.advance(6);
  assert.equal(page.q('[data-orb]').style.transform, 'scale(1)');
  assert.equal(page.q('[data-breath-label]').textContent, 'Rest');
});

test('paced shape expands on inhale and contracts on exhale without altering the readout or worked model', () => {
  const page = harness();
  const diagram = page.q('[data-model-diagram]').querySelector('svg');
  const diagramText = diagram.textContent;
  const diagramChildren = [...diagram.children];
  const diagramBreath = diagram.getAttribute('data-breath');
  assert.ok(diagramChildren.length > 0);
  const label = page.q('.training-breath-readout').querySelector('[data-breath-label]');
  assert.ok(label, 'the breath phase belongs to the visible pacer readout');
  page.choose('[data-pacing]', 'paced');
  page.click('[data-start]');
  const scale = () => Number(page.q('[data-orb]').style.transform.match(/scale\(([^)]+)\)/)[1]);
  const base=scale();
  let previous = base;
  for (let second = 1; second <= 10; second++) {
    page.advance(1);
    const current = scale();
    assert.ok(current >= base && current <= 1,'the animated artwork stays within its full-size canvas');
    if(second===5)assert.ok(current>base,'inhale reaches an expanded shape');
    assert.equal(page.q('.training-breath-readout').style.transform,undefined,'the phase readout stays stationary');
    assert.ok(second <= 5 ? current >= previous : current <= previous);
    assert.equal(label.textContent, second < 5 || second === 10 ? 'Inhale' : 'Exhale');
    assert.equal(diagram.textContent, diagramText, 'ticks must not overwrite the lesson SVG with a breathing label');
    assert.deepEqual(diagram.children, diagramChildren);
    assert.equal(diagram.getAttribute('data-breath'), diagramBreath, 'the lesson entry number is independent of the timer');
    previous = current;
  }
  assert.equal(scale(),base);
  page.click('[data-pause]');
  page.advance(4);
  assert.equal(scale(),base);
  assert.equal(page.q('[data-breath-label]').textContent, 'Paused');
});

test('custom 3 / 7 timing drives the label, countdown, shape and bell from one phase', () => {
  const page=harness();
  page.applyRhythm(3,7);
  assert.equal(page.q('[data-pacing]').value,'paced');
  assert.match(page.q('[data-pacing]').textContent,/3 seconds in · 7 seconds out/);
  page.click('[data-start]');
  const scale=()=>Number(page.q('[data-orb]').style.transform.match(/scale\(([^)]+)\)/)[1]);
  assert.equal(page.q('[data-breath-label]').textContent,'Inhale');
  assert.equal(page.q('[data-breath-count]').textContent,'3 seconds');
  const base=scale();
  assert.deepEqual(page.sounds[0].cues,[true]);
  page.advance(1.5);
  const halfway=scale();
  assert.ok(halfway>base);
  page.advance(1.5);
  assert.equal(page.q('[data-breath-label]').textContent,'Exhale');
  assert.equal(page.q('[data-breath-count]').textContent,'7 seconds');
  assert.ok(scale()>halfway,'the shape reaches full expansion at the exhale boundary');
  assert.deepEqual(page.sounds[0].cues,[true,false]);
  page.advance(3.5);
  assert.ok(Math.abs(scale()-halfway)<1e-10,'half of either phase reaches the same shape size');
  page.advance(3.5);
  assert.equal(page.q('[data-breath-label]').textContent,'Inhale');
  assert.equal(scale(),base);
  assert.deepEqual(page.sounds[0].cues,[true,false,true]);
  assert.equal(page.q('[data-timer]').textContent,'14:50');
  assert.equal(page.q('.training-sound').open,false);
  assert.equal(page.q('[data-setup]').querySelector('[data-pacing]'),null,'breathing mode remains reachable while setup is hidden');
  assert.equal(page.q('[data-setup]').querySelector('[data-breath-form]'),null,'timing controls remain reachable during practice');
});

test('fractional timings keep their exact phase boundaries over multiple cycles', () => {
  const page=harness();page.applyRhythm(1.2,2.3);page.click('[data-start]');
  page.advance(1.199);
  assert.equal(page.q('[data-breath-label]').textContent,'Inhale');
  page.advance(0.001);
  assert.equal(page.q('[data-breath-label]').textContent,'Exhale');
  assert.deepEqual(page.sounds[0].cues,[true,false]);
  page.advance(2.3);
  assert.equal(page.q('[data-breath-label]').textContent,'Inhale');
  page.advance(1.2);
  assert.equal(page.q('[data-breath-label]').textContent,'Exhale');
  page.advance(2.3);
  assert.deepEqual(page.sounds[0].cues,[true,false,true,false,true]);
  assert.equal(page.q('[data-breath-label]').textContent,'Inhale');
});

test('editing fields does not interrupt the clock and applying a new pair restarts only the breath', () => {
  const page=harness();page.click('[data-start]');page.advance(2);
  page.type('[data-inhale]','3');page.type('[data-exhale]','7');
  page.advance(3);
  assert.equal(page.q('[data-breath-label]').textContent,'Exhale','unapplied input must not change the active 5 / 5 cycle');
  assert.deepEqual(page.sounds[0].cues,[true,false]);
  page.applyRhythm();
  assert.equal(page.q('[data-timer]').textContent,'14:55','practice elapsed time survives a timing change');
  assert.equal(page.q('[data-breath-label]').textContent,'Inhale');
  assert.equal(page.q('[data-breath-count]').textContent,'3 seconds');
  assert.deepEqual(page.sounds[0].cues,[true,false,true]);
  page.advance(1);
  const before=page.q('[data-orb]').style.transform;
  page.applyRhythm(3,7);
  assert.equal(page.q('[data-orb]').style.transform,before,'reapplying the active pair must not restart the breath');
  assert.deepEqual(page.sounds[0].cues,[true,false,true]);
  page.advance(2);
  assert.equal(page.q('[data-breath-label]').textContent,'Exhale');
  assert.deepEqual(page.sounds[0].cues,[true,false,true,false]);
});

test('invalid duration pairs leave both active durations and stored preferences unchanged', () => {
  const page=harness();page.applyRhythm(3,7);page.click('[data-start]');page.advance(1);
  const saved=page.raw.get('form-breath-timing-v1');
  for(const [inhale,exhale] of [['',7],[3,''],[0,7],[-1,7],[3,0.01],['Infinity',7],[3,'NaN'],['1e309',7],['1e13',5],[3,'1e13']]){
    page.applyRhythm(inhale,exhale);
    assert.ok(page.q('[data-rhythm-status]').textContent.trim(),'invalid input has visible feedback');
    assert.equal(page.raw.get('form-breath-timing-v1'),saved,'invalid pairs cannot overwrite a saved preference');
    assert.equal(page.q('[data-pacing]').value,'paced');
  }
  assert.deepEqual(page.sounds[0].cues,[true],'invalid input never restarts or rings the metronome');
  page.advance(2);
  assert.equal(page.q('[data-breath-label]').textContent,'Exhale');
  assert.equal(page.q('[data-breath-count]').textContent,'7 seconds');
  assert.deepEqual(page.sounds[0].cues,[true,false]);
});

test('pausing freezes a custom phase and changing timings while paused waits for Resume', () => {
  const page=harness();page.applyRhythm(3,7);page.click('[data-start]');page.advance(2);
  const before=page.q('[data-orb]').style.transform;
  page.click('[data-pause]');page.advance(100);
  assert.equal(page.q('[data-breath-label]').textContent,'Paused');
  assert.equal(page.q('[data-orb]').style.transform,before,'pausing holds the ring at its current phase');
  assert.equal(page.q('[data-timer]').textContent,'14:58');
  assert.equal(page.sounds[0].enabled,false);
  page.applyRhythm(4,6);page.advance(100);
  assert.equal(page.q('[data-session-state]').textContent,'Paused');
  assert.equal(page.q('[data-timer]').textContent,'14:58');
  assert.equal(page.sounds[0].enabled,false);
  assert.deepEqual(page.sounds[0].cues,[true],'editing a paused clock is silent');
  page.click('[data-pause]');
  assert.equal(page.q('[data-breath-label]').textContent,'Inhale');
  assert.equal(page.q('[data-breath-count]').textContent,'4 seconds');
  assert.deepEqual(page.sounds[0].cues,[true,true],'the new inhale rings exactly once on resume');
  page.advance(4);
  assert.equal(page.q('[data-breath-label]').textContent,'Exhale');
  assert.equal(page.q('[data-breath-count]').textContent,'6 seconds');
  assert.equal(page.q('[data-timer]').textContent,'14:54');
  assert.deepEqual(page.sounds[0].cues,[true,true,false]);
});

test('own rhythm retains custom timing without starting timed bells until the guide is selected', () => {
  const page=harness();page.choose('[data-pacing]','natural');page.applyRhythm(3,7);
  assert.equal(page.q('[data-pacing]').value,'natural','editing timing must not silently enable a guide');
  page.click('[data-start]');page.advance(40);
  assert.equal(page.q('[data-breath-label]').textContent,'Own rhythm');
  assert.match(page.q('[data-live-pace]').textContent,/3\s*\/\s*7/);
  assert.deepEqual(page.sounds[0].cues,[]);
  page.click('[data-live-pace]');
  assert.equal(page.q('[data-breath-label]').textContent,'Inhale');
  assert.deepEqual(page.sounds[0].cues,[true]);
  page.advance(3);
  assert.equal(page.q('[data-breath-label]').textContent,'Exhale');
  assert.deepEqual(page.sounds[0].cues,[true,false]);
});

test('body mapping uses the chosen breath bells when paced and keeps dimension time independent', () => {
  const page=harness();page.click('[data-exercise="body"]');
  page.applyRhythm(3,7);page.choose('[data-pacing]','paced');page.click('[data-start]');
  assert.equal(page.q('[data-dimension]').textContent,'Location');
  assert.deepEqual(page.sounds[0].cues,[true]);
  page.advance(3);
  assert.deepEqual(page.sounds[0].cues,[true,false]);
  assert.equal(page.q('[data-dimension]').textContent,'Location');
  page.advance(7);
  assert.deepEqual(page.sounds[0].cues,[true,false,true]);
  page.advance(20);
  assert.equal(page.q('[data-dimension]').textContent,'Quality');
  assert.deepEqual(page.sounds[0].cues,[true,false,true,true],'a delayed tick emits one current breath cue, not a backlog or extra dimension bell');
  assert.match(page.q('[data-bell-help]').textContent,/inhale.*exhale/i);
});

test('custom timing survives exercise changes and reload, and corrupt saved values safely use defaults', () => {
  const page=harness();page.applyRhythm(3.5,7.25);
  assert.ok(page.raw.has('form-breath-timing-v1'));
  page.click('[data-exercise="heart"]');
  assert.equal(page.q('[data-inhale]').value,'3.5');
  assert.equal(page.q('[data-exhale]').value,'7.25');
  page.app.setStage('half-circle');
  assert.equal(page.q('[data-inhale]').value,'3.5');
  page.app.destroy();
  const reloaded=harness({records:page.raw});
  assert.equal(reloaded.q('[data-inhale]').value,'3.5');
  assert.equal(reloaded.q('[data-exhale]').value,'7.25');
  assert.equal(reloaded.q('.training-sound').open,false);
  for(const saved of ['{broken','null','{"inhaleSeconds":-2,"exhaleSeconds":7}','{"inhaleSeconds":3,"exhaleSeconds":0}']){
    const corrupt=harness({records:[['form-breath-timing-v1',saved]]});
    assert.equal(corrupt.q('[data-inhale]').value,'5');
    assert.equal(corrupt.q('[data-exhale]').value,'5');
    corrupt.click('[data-start]');corrupt.advance(5);
    assert.equal(corrupt.q('[data-breath-label]').textContent,'Exhale');
  }
});

test('blocked preference storage still allows custom timing for this visit', () => {
  const page=harness({failWrites:true});page.applyRhythm(3,7);page.click('[data-start]');
  page.advance(3);
  assert.equal(page.q('[data-breath-label]').textContent,'Exhale');
  assert.equal(page.q('[data-breath-count]').textContent,'7 seconds');
  assert.deepEqual(page.sounds[0].cues,[true,false]);
  assert.equal(page.raw.has('form-breath-timing-v1'),false);
});

test('Start applies pending valid timings and keeps the preview visible when an invalid pair blocks a session', () => {
  const page=harness();page.type('[data-inhale]','');page.type('[data-exhale]','7');
  page.click('[data-start]');
  assert.equal(page.q('[data-live]').hidden,false);
  assert.equal(page.q('[data-breath-label]').textContent,'Ready');
  assert.equal(page.q('[data-setup]').hidden,false);
  assert.equal(page.sounds[0].starts,0,'invalid timing cannot start sound or the clock');
  assert.ok(page.q('[data-rhythm-status]').textContent.trim());
  page.type('[data-inhale]','3');page.click('[data-start]');
  assert.equal(page.q('[data-live]').hidden,false);
  assert.equal(page.q('[data-breath-count]').textContent,'3 seconds');
  page.advance(3);
  assert.equal(page.q('[data-breath-label]').textContent,'Exhale');
  assert.equal(page.q('[data-breath-count]').textContent,'7 seconds');
  assert.deepEqual(page.sounds[0].cues,[true,false]);
});

test('test bell explains muted volume and retries after asynchronous audio startup errors', () => {
  const page = harness();
  page.type('[data-volume]', '0');
  page.click('[data-test-sound]');
  assert.equal(page.sounds[1].enabled, false);
  assert.deepEqual(page.sounds[1].cues, []);
  assert.match(page.q('[data-sound-status]').textContent, /0%.*Raise it/);
  page.type('[data-volume]', '1');
  page.click('[data-test-sound]');
  assert.deepEqual(page.sounds[1].cues, [true, false]);
  assert.equal(page.q('[data-sound-status]').textContent, '');
  page.sounds[1].onError(new Error('Audio context could not resume'));
  assert.equal(page.q('.training-sound').open, true, 'startup error reveals its retry guidance');
  assert.match(page.q('[data-sound-status]').textContent, /could not start.*Test bell.*try again/);
  assert.equal(page.q('[data-sound-status]').getAttribute('role'), 'status');
  page.click('[data-test-sound]');
  assert.equal(page.q('[data-sound-status]').textContent, '');
  assert.deepEqual(page.sounds[1].cues, [true, false, true, false]);
  page.click('[data-exercise="heart"]');
  page.click('[data-start]');
  page.sounds[0].onError(new Error('Interrupted audio context'));
  assert.match(page.q('[data-sound-status]').textContent, /could not start.*try again/);
  assert.equal(page.q('[data-session-state]').textContent, 'Practising', 'an audio error does not end the exercise');
});

test('test bell reports immediate startup and cue failures beside the sound controls', () => {
  const page = harness();
  const start = page.sounds[1].start;
  page.sounds[1].start = () => false;
  page.click('[data-test-sound]');
  assert.deepEqual(page.sounds[1].cues, []);
  assert.match(page.q('[data-sound-status]').textContent, /could not start/);
  page.sounds[1].start = start;
  page.sounds[1].preview = () => false;
  page.click('[data-test-sound]');
  assert.match(page.q('[data-sound-status]').textContent, /could not start/);
});

test('test bell restores only failed running session audio without inserting another breath cue', () => {
  const page = harness();
  page.click('[data-exercise="heart"]');
  page.click('[data-start]');
  page.advance(2);
  const session = page.sounds[0];
  page.click('[data-test-sound]');
  assert.equal(session.starts, 1, 'testing a bell must not restart healthy session audio');
  assert.deepEqual(session.cues, [true]);
  session.stop();
  session.onError(new Error('Audio context resume failed'));
  assert.equal(page.q('.training-sound').open, true);
  page.click('[data-test-sound]');
  assert.equal(session.starts, 2);
  assert.equal(session.enabled, true);
  assert.equal(page.q('[data-sound-status]').textContent, '');
  assert.deepEqual(session.cues, [true], 'recovering during an inhale must not repeat its cue');
  page.click('[data-test-sound]');
  assert.equal(session.starts, 2, 'successful retry clears the failed-session state');
  page.advance(3);
  assert.deepEqual(session.cues, [true, false], 'the next timed boundary still rings');
  page.click('[data-pause]');
  session.onError(new Error('Interrupted while paused'));
  page.click('[data-test-sound]');
  assert.equal(session.starts, 2, 'test bell must not restart a paused session');
  assert.equal(session.enabled, false);
  assert.equal(page.q('[data-session-state]').textContent, 'Paused');
  assert.deepEqual(session.cues, [true, false]);
});

test('muting and unmuting heart bells skips missed cues without inventing a mid-phase ring', () => {
  const page = harness();
  page.click('[data-exercise="heart"]');
  const ambient=page.q('[data-sound]');ambient.checked=false;ambient.dispatch('change');
  page.click('[data-start]'); page.advance(2);
  page.click('[data-bell-toggle]');
  assert.match(page.q('[data-bell-toggle]').textContent, /Bell: off/i);
  assert.equal(page.sounds[0].enabled, false, 'muting bells with ambient off leaves the exercise silent');
  page.advance(5);
  assert.deepEqual(page.sounds[0].cues, [true], 'the exhale cue at five seconds was muted');
  page.click('[data-bell-toggle]');
  assert.equal(page.sounds[0].enabled, true);
  assert.deepEqual(page.sounds[0].cues, [true], 'unmuting at seven seconds is not a new breath phase');
  page.advance(2.8);
  assert.deepEqual(page.sounds[0].cues, [true]);
  page.advance(0.2);
  assert.deepEqual(page.sounds[0].cues, [true, true], 'the next regular inhale cue remains audible');
  page.click('[data-pause]');
  page.click('[data-bell-toggle]'); page.click('[data-bell-toggle]');
  assert.equal(page.sounds[0].enabled, false, 'changing the bell preference while paused must not restart audio');
});

test('ambient controls and pause/resume remain independent of the heart bell cadence', () => {
  const page = harness();
  page.click('[data-exercise="heart"]');
  page.click('[data-start]'); page.advance(2);
  const sound = page.q('[data-sound]'); sound.checked = true; sound.dispatch('change');
  assert.equal(page.sounds[0].settings.frequency, 10);
  assert.deepEqual(page.sounds[0].cues, [true], 'enabling ambient sound adds no phase cue');
  page.click('[data-pause]'); page.advance(100);
  assert.equal(page.sounds[0].enabled, false);
  page.click('[data-pause]');
  assert.equal(page.sounds[0].enabled, true);
  assert.equal(page.sounds[0].settings.frequency, 10);
  assert.deepEqual(page.sounds[0].cues, [true], 'resuming two seconds into inhale must not repeat its bell');
  page.advance(3);
  assert.deepEqual(page.sounds[0].cues, [true, false]);
  sound.checked = false; sound.dispatch('change');
  assert.equal(page.sounds[0].enabled, true, 'turning ambient off does not mute the independent heart bell');
  assert.equal(page.sounds[0].settings.frequency, 0);
  page.advance(5);
  assert.deepEqual(page.sounds[0].cues, [true, false, true]);
  sound.checked = true; sound.dispatch('change');
  page.click('[data-bell-toggle]');
  assert.equal(page.sounds[0].enabled, true, 'muting the heart bell does not stop requested ambient audio');
  assert.equal(page.sounds[0].settings.frequency, 10);
  page.advance(5);
  assert.deepEqual(page.sounds[0].cues, [true, false, true]);
});

test('returning from own rhythm begins a complete guided inhale without replaying missed bells', () => {
  const page = harness();
  page.click('[data-exercise="heart"]');
  page.click('[data-start]'); page.advance(2);
  page.click('[data-live-pace]');
  assert.equal(page.q('[data-breath-label]').textContent, 'Own rhythm');
  assert.equal(page.sounds[0].enabled, true, 'ambient sound continues while own rhythm suppresses timed breath bells');
  page.advance(5);
  assert.deepEqual(page.sounds[0].cues, [true]);
  page.click('[data-live-pace]');
  assert.equal(page.q('[data-breath-label]').textContent, 'Inhale');
  assert.equal(page.sounds[0].enabled, true);
  assert.deepEqual(page.sounds[0].cues, [true, true], 'returning to the guide starts a new inhale');
  page.advance(4.9);
  assert.deepEqual(page.sounds[0].cues, [true, true]);
  page.advance(0.1);
  assert.deepEqual(page.sounds[0].cues, [true, true, false]);
});

test('body practice starts sound with dimension bells and each exercise remembers its own pacing choice', () => {
  const page = harness();
  page.click('[data-exercise="body"]');
  assert.equal(page.q('[data-pacing]').value, 'natural');
  assert.equal(page.q('[data-sound]').checked, true);
  assert.equal(page.q('[data-bell]').checked, true);
  assert.equal(page.q('[data-bell-toggle]').hidden, false);
  page.click('[data-start]'); page.advance(30);
  assert.equal(page.sounds[0].enabled, true);
  assert.deepEqual(page.sounds[0].cues, [true, false]);
  page.click('[data-end]'); page.click('[data-exercise="heart"]');
  assert.equal(page.q('[data-pacing]').value, 'paced');
  page.choose('[data-pacing]', 'natural');
  page.click('[data-exercise="body"]');
  assert.equal(page.q('[data-pacing]').value, 'natural');
  page.choose('[data-pacing]', 'paced');
  page.click('[data-exercise="heart"]');
  assert.equal(page.q('[data-pacing]').value, 'natural', 'the chosen heart rhythm survives switching away');
  page.choose('[data-pacing]', 'paced');
  page.click('[data-other]');
  assert.equal(page.q('[data-pacing]').value, 'paced', 'the readiness shortcut also restores the body’s own choice');
});

test('body bowl cues follow the source dimension pattern when the seven-step sequence repeats', () => {
  const page = harness();
  page.click('[data-exercise="body"]');
  const sound = page.q('[data-sound]'); sound.checked = true; sound.dispatch('change');
  page.click('[data-start]');
  for (let step = 0; step < 7; step++) page.advance(30);
  assert.equal(page.q('[data-dimension]').textContent, 'Location');
  assert.deepEqual(page.sounds[0].cues, [true, false, true, false, true, false, true, true]);
});

test('bell and ambient checkboxes work independently in every exercise and stay in sync with quick mute', () => {
  for (const exercise of ['stream','heart','body']) {
    const page=harness();page.click('[data-exercise="'+exercise+'"]');
    const bell=page.q('[data-bell]'),ambient=page.q('[data-sound]');
    assert.equal(page.q('[data-sound-summary]').textContent,'Bell on · Ambient on');
    page.click('[data-start]');page.advance(2);
    const session=page.sounds[0],originalCues=[...session.cues];
    bell.checked=false;bell.dispatch('change');
    assert.equal(ambient.checked,true);
    assert.equal(session.enabled,true);
    assert.equal(session.settings.frequency,10);
    assert.equal(session.settings.bellVolume,0);
    assert.equal(page.q('[data-bell-toggle]').getAttribute('aria-pressed'),'false');
    assert.match(page.q('[data-bell-toggle]').textContent,/Bell: off/);
    assert.equal(page.q('[data-sound-summary]').textContent,'Bell off · Ambient on');
    page.advance(exercise==='body'?28:3);
    assert.deepEqual(session.cues,originalCues,'muting prevents the next automatic cue');
    page.click('[data-bell-toggle]');
    assert.equal(bell.checked,true,'quick mute and checkbox control the same bell');
    assert.equal(session.settings.bellVolume,1);
    assert.deepEqual(session.cues,originalCues,'enabling a bell does not replay an elapsed boundary');
    ambient.checked=false;ambient.dispatch('change');
    assert.equal(bell.checked,true);
    assert.equal(session.enabled,true);
    assert.equal(session.settings.frequency,0,'bell-only sound does not create ambient audio');
    assert.equal(page.q('[data-sound-summary]').textContent,'Bell on · Ambient off');
    page.advance(exercise==='body'?30:5);
    assert.equal(session.cues.length,originalCues.length+1,'the independent bell remains audible');
    bell.checked=false;bell.dispatch('change');
    assert.equal(session.enabled,false);
    assert.equal(page.q('[data-sound-summary]').textContent,'Bell off · Ambient off');
    page.click('[data-test-sound]');
    assert.deepEqual(page.sounds[1].cues,[true,false],'the explicit preview demonstrates both reference bells');
    assert.equal(bell.checked,false,'preview does not overwrite the saved bell choice');
    assert.equal(ambient.checked,false);
    assert.equal(session.enabled,false,'preview does not restart disabled session sound');
    page.app.destroy();
  }
});

test('muted bell stays muted at completion while ambient audio can fade out', () => {
  for (const exercise of ['stream','heart','body']) {
    const page=harness();page.click('[data-exercise="'+exercise+'"]');
    const bell=page.q('[data-bell]');bell.checked=false;bell.dispatch('change');
    page.click('[data-start]');page.advance(900);
    assert.equal(page.q('[data-session-state]').textContent,'Complete');
    assert.deepEqual(page.sounds[0].cues,[]);
    assert.equal(page.sounds[0].completed,true);
    assert.equal(page.sounds[0].completionSettings.frequency,10);
    assert.equal(page.sounds[0].completionSettings.bellVolume,0,'completion cannot bypass bell mute');
    page.app.destroy();
  }
});

test('quota failures retain private work for export and keep the unload guard active', () => {
  const page = harness({ failWrites: true });
  page.type('[data-note="source"]', 'Private unsaved observation.'); page.submit();
  assert.equal(page.data(), null);
  assert.equal(page.q('[data-note="source"]').value, '', 'accepted work moved into the in-tab record');
  assert.equal(page.app.hasDraft(), true, 'in-tab-only accepted work still needs protection on close');
  assert.match(page.q('[data-record]').textContent, /Private unsaved observation/);
  assert.match(page.q('[data-storage]').textContent, /tab only/);
  page.allowWrites();
  const ready = page.q('[data-ready]'); ready.checked = true; ready.dispatch('change');
  assert.equal(page.data().entries[0].source, 'Private unsaved observation.');
  assert.equal(page.app.hasDraft(), false);
});

test('another tab cannot silently replace this tab’s source stream or private work', () => {
  const page = harness();
  page.type('[data-note="source"]', 'Keep this tab’s source.'); page.submit();
  const original = page.data();
  page.type('[data-note="source"]', 'Unfinished present observation.');
  const changed = { schemaVersion: 1, entries: [], sessions: [], readiness: { sphere: { heart: true, body: true } } };
  page.external(JSON.stringify(changed));
  assert.match(page.q('[data-record]').textContent, /Keep this tab’s source/);
  assert.equal(page.q('[data-note="source"]').value, 'Unfinished present observation.');
  assert.deepEqual(page.data(), changed, 'stale local work must not overwrite the other tab');
  page.click('[data-lock-source]');
  page.type('[data-note="recollection"]', 'Keep this tab’s source.');
  page.click('[data-reveal]');
  assert.match(page.q('.training-original').textContent, /Keep this tab’s source/);
  page.submit();
  assert.equal(page.app.hasDraft(), true);
  assert.deepEqual(page.data(), changed);
  assert.equal(original.entries.length, 1);
});

test('a cross-tab replacement guards already-committed local records even when no field is dirty', () => {
  const page = harness();
  page.type('[data-note="source"]', 'This saved source still needs preserving.'); page.submit();
  assert.equal(page.app.hasDraft(), false);
  page.external(JSON.stringify({ schemaVersion: 1, entries: [], sessions: [], readiness: {} }));
  assert.equal(page.q('[data-note="source"]').value, '');
  assert.match(page.q('[data-record]').textContent, /This saved source still needs preserving/);
  assert.equal(page.app.hasDraft(), true, 'the retained local version must be guarded until saved or deliberately reloaded');
});

test('the consciousness stream begins with guided inhale/exhale bells and ambient sound', () => {
  const page = harness();
  assert.equal(page.q('[data-exercise="stream"]').getAttribute('aria-pressed'), 'true');
  assert.equal(page.q('[data-pacing]').value, 'paced');
  assert.equal(page.q('[data-bell-toggle]').hidden, false);
  assert.equal(page.q('[data-body-steps]').hidden, true);
  assert.equal(page.q('[data-bell]').checked, true);
  assert.equal(page.q('[data-sound]').checked, true);
  assert.equal(page.sounds[0].starts, 0, 'defaults do not bypass the Start gesture');
  page.click('[data-start]');
  assert.deepEqual(page.sounds[0].cues, [true]);
  assert.equal(page.sounds[0].settings.frequency, 10);
  page.advance(5);
  assert.deepEqual(page.sounds[0].cues, [true, false]);
  assert.equal(page.q('[data-breath-label]').textContent, 'Exhale');
  page.advance(5);
  assert.deepEqual(page.sounds[0].cues, [true, false, true]);
  assert.equal(page.q('[data-dimension]').hidden, true);
  assert.equal(page.q('[data-prompt]').textContent,require('../src/shape-practice.js').getStage('circle').stream.cues.inhale);
  page.click('[data-end]');
  assert.equal(page.data().sessions[0].exercise,'stream');
  assert.equal(page.data().entries.length,0,'timed breaths never manufacture a marked entry');
});

test('source and return distance lock before deliberate retrieval and cannot be edited through stale events', () => {
  const page=harness();
  page.type('[data-note="source"]','The ocean contains the boat.');page.submit();
  page.type('[data-note="source"]','The boat enables travel across the ocean.');
  assert.equal(page.host.querySelector('[data-note="recollection"]'),null);
  assert.equal(page.q('[data-keep]').disabled,true);
  page.click('[data-lock-source]');
  assert.equal(page.q('[data-note="source"]').readOnly,true);
  assert.equal(page.q('[data-lag]').disabled,true);
  assert.equal(page.host.querySelector('[data-note="relation"]'),null);
  const source=page.q('[data-note="source"]');source.value='A substituted selection.';source.dispatch('input');
  page.choose('[data-lag]','2');
  page.click('[data-reveal]');
  assert.equal(page.q('.training-original').hidden,true,'empty recollection must be acknowledged before looking');
  page.type('[data-note="recollection"]','I do not recall');page.click('[data-reveal]');
  assert.equal(page.q('[data-note="source"]').value,'The boat enables travel across the ocean.');
  assert.equal(page.q('[data-lag]').value,'1');
  assert.match(page.q('.training-original').textContent,/The ocean contains the boat/);
  page.type('[data-note="relation"]','The current entry selects function; the earlier one selects containment.');
  page.type('[data-note="revision"]','Both relationships can hold.');page.submit();
  const entries=page.data().entries;
  assert.equal(entries[1].source,'The boat enables travel across the ocean.');
  assert.equal(entries[1].recollection,'I do not recall');
  assert.equal(entries[1].lag,1);
  assert.equal(entries[1].referenceId,entries[0].id);
});

test('loading a replacement record preserves a locked return and offers an explicit recovery without retargeting', async () => {
  const page=harness();
  page.type('[data-note="source"]','The ocean contains the boat.');page.submit();
  page.type('[data-note="source"]','The boat enables travel.');page.click('[data-lock-source]');
  page.type('[data-note="recollection"]','Ocean contains boat.');page.click('[data-reveal]');
  page.type('[data-note="relation"]','Containment and function differ.');
  page.external(JSON.stringify({schemaVersion:1,entries:[],sessions:[],readiness:{}}));
  page.click('[data-reload]');
  assert.equal(page.q('[data-note="source"]').readOnly,true);
  assert.equal(page.q('[data-keep]').disabled,true);
  assert.match(page.q('.training-original').textContent,/The ocean contains the boat/);
  page.submit();
  assert.equal(page.data().entries.length,0,'the missing historical target must not be substituted');
  page.click('[data-recover-return]');
  assert.equal(page.downloads.length,1);
  const backup=JSON.parse(await page.downloads[0].text());
  assert.equal(backup.kind,'unfinished-breath-back-return');
  assert.equal(backup.source,'The boat enables travel.');
  assert.equal(backup.recollection,'Ocean contains boat.');
  assert.equal(backup.reference.source,'The ocean contains the boat.');
  assert.equal(backup.relation,'Containment and function differ.');
  assert.equal(page.q('[data-note="source"]').value,'The boat enables travel.');
  assert.equal(page.q('[data-note="source"]').readOnly,false);
  assert.equal(page.host.querySelector('[data-note="recollection"]'),null);
  page.submit();
  assert.equal(page.data().entries.length,1);
  assert.equal(page.data().entries[0].referenceId,null,'the preserved current entry explicitly seeds a fresh history');
});

test('a full existing record preserves its contents without blocking practice', () => {
  const page=harness();
  const sessions=Array.from({length:500},(_,i)=>({id:'period-'+i,stageId:'circle',exercise:'stream',endedAt:'2026-10-01T00:00:00.000Z',seconds:2,completed:false}));
  page.external(JSON.stringify({schemaVersion:1,entries:[],sessions,readiness:{}}));page.click('[data-reload]');
  const before=page.raw.get(page.key);
  page.click('[data-start]');page.advance(2);
  assert.equal(page.q('[data-live]').hidden,false);
  assert.equal(page.q('[data-session-state]').textContent,'Practising');
  assert.equal(page.q('[data-timer]').textContent,'14:58');
  page.click('[data-end]');
  assert.equal(page.raw.get(page.key),before,'capacity never deletes or rewrites existing records');
  page.click('[data-start]');page.advance(900);
  assert.equal(page.q('[data-session-state]').textContent,'Complete');
  assert.equal(page.raw.get(page.key),before);
});

test('every application retains four optional worked entries and a complete relationship register', () => {
  const page=harness();
  const counts={circle:1,'half-circle':2,triangle:3,square:4,pentagon:5,hexagon:6,heptagon:7,octagon:8,prism:9,cube:12,dodecahedron:30,icosahedron:30,geodesic:120,sphere:120};
  for(const [id,count] of Object.entries(counts)){
    page.app.setStage(id);
    for(const exercise of ['stream','heart','body']){
      page.click('[data-exercise="'+exercise+'"]');
      assert.equal(page.q('[data-bell]').checked,true,id+'/'+exercise+' has bell sound enabled');
      assert.equal(page.q('[data-sound]').checked,true,id+'/'+exercise+' has ambient sound enabled');
      assert.equal(page.q('[data-bell-toggle]').hidden,false);
      assert.equal(page.q('.training-sound').open,false,id+'/'+exercise+' keeps optional sound settings compact and expandable');
      assert.equal(page.q('[data-breath-form]').hidden,false);
      assert.equal(page.q('[data-pacing]').value,exercise==='body'?'natural':'paced');
      assert.ok(page.sounds.every(audio=>audio.starts===0),'browsing lessons does not autoplay sound');
      assert.equal(page.host.querySelector('.training-breath-examples'),null,'repeated full prose rows are removed');
      assert.ok(page.q('[data-pane="example"]').querySelector('[data-examples]'),'worked entries remain available in their side pane');
      assert.equal(page.q('.training-register').children.length,count,id+'/'+exercise+' shows the entire starting model');
      assert.equal(page.q('[data-model-state]').querySelectorAll('option').length,4);
      for(let state=1;state<4;state++){page.choose('[data-model-state]',String(state));assert.equal(page.q('.training-register').children.length,count,id+'/'+exercise+' retains its complete model at breath '+(state+1));}
      assert.match(page.q('[data-examples]').textContent,/extra|additional natural breaths/i);
    }
  }
});

test('guided encoding preserves all four exact home addresses and earlier return targets', () => {
  const page=harness();
  const addresses=require('../src/shape-practice.js').ADDRESSES;
  assert.equal(new Set(addresses).size,4);
  addresses.forEach((address,index)=>{
    page.choose('[data-model-state]',String(index));
    assert.match(page.q('[data-walkthrough]').textContent,new RegExp(address));
    page.click('[data-walk-next]');
    assert.match(page.q('[data-walkthrough-prompt]').textContent,new RegExp('at your '+address));
    page.click('[data-walk-next]');
    if(index)assert.match(page.q('[data-walkthrough-prompt]').textContent,new RegExp(addresses[index-1]));
    else assert.match(page.q('[data-walkthrough-prompt]').textContent,/no earlier entry/);
  });
});

test('a prepared sphere exposes each complete finite model and distinguishes reorientation from a changed relationship', () => {
  const page=harness({stageId:'sphere'});
  assert.match(page.q('[data-examples]').textContent,/Learn the full register before rehearsing/);
  assert.equal(page.q('[data-model-state]').querySelectorAll('option').length,4);
  assert.equal(page.q('.training-register').children.length,120);
  page.choose('[data-model-state]','1');
  assert.equal(page.q('.training-register').children.length,120);
  assert.equal(page.host.querySelectorAll('.training-relationship-changed').length,0);
  assert.match(page.q('[data-model-content]').textContent,/Every relationship is retained/);
  page.choose('[data-model-state]','2');
  assert.equal(page.q('.training-register').children.length,120);
  assert.equal(page.host.querySelectorAll('.training-relationship-changed').length,1);
  assert.match(page.q('.training-relationship-changed').textContent,/C13/);
  page.choose('[data-model-state]','3');
  assert.equal(page.q('.training-register').children.length,120);
  assert.equal(page.host.querySelectorAll('.training-relationship-changed').length,1);
  assert.match(page.q('.training-relationship-changed').textContent,/C13/);
  assert.match(page.q('[data-model-content]').textContent,/provisional|proposed/i);
});


test('changing the register’s entry updates participants and meanings together', () => {
  const page=harness({stageId:'half-circle'});
  page.choose('[data-model-state]','1');
  const content=page.q('[data-model-content]').textContent;
  assert.match(content,/Sky is the containing environment of aircraft/);
  assert.match(content,/Aircraft provides a means of traversing sky/);
  assert.doesNotMatch(content,/Ocean is the containing environment of boat/);
  assert.equal(page.host.querySelectorAll('.training-relationship-changed').length,2);
  page.choose('[data-model-state]','2');
  assert.match(page.q('[data-model-content]').textContent,/Harbour shelters boat/);
  assert.doesNotMatch(page.q('[data-model-content]').textContent,/Boat shelters harbour/);
});

test('events from detached fields cannot replace an encoded selection or write into another draft', () => {
  const page=harness();
  page.type('[data-note="source"]','Ocean contains boat.');page.submit();
  page.type('[data-note="source"]','Boat enables ocean travel.');
  const sourceBeforeLock=page.q('[data-note="source"]');
  const lagBeforeLock=page.q('[data-lag]');
  page.click('[data-lock-source]');
  sourceBeforeLock.value='Substituted by a detached event.';sourceBeforeLock.dispatch('input');
  lagBeforeLock.value='2';lagBeforeLock.dispatch('change');
  page.type('[data-note="recollection"]','Ocean contains boat.');
  const recollectionBeforeReveal=page.q('[data-note="recollection"]');
  page.click('[data-reveal]');
  recollectionBeforeReveal.value='Changed after seeing the answer.';recollectionBeforeReveal.dispatch('input');
  page.submit();
  assert.equal(page.data().entries[1].source,'Boat enables ocean travel.');
  assert.equal(page.data().entries[1].recollection,'Ocean contains boat.');
  assert.equal(page.data().entries[1].lag,1);
  const earlierDraftField=page.q('[data-note="source"]');
  page.click('[data-exercise="heart"]');
  earlierDraftField.value='Written after switching exercise.';earlierDraftField.dispatch('input');
  page.type('[data-note="source"]','Memory supports appreciation.');page.submit();
  assert.equal(page.data().entries[2].source,'Memory supports appreciation.');
  page.click('[data-exercise="stream"]');
  assert.equal(page.q('[data-note="source"]').value,'');
});

test('a detached fresh-stream button cannot discard another exercise’s draft', () => {
  const page=harness();
  const oldFresh=page.q('[data-fresh]');
  page.click('[data-exercise="heart"]');
  page.type('[data-note="source"]','Private heart selection that must remain.');
  oldFresh.click();
  assert.equal(page.q('[data-note="source"]').value,'Private heart selection that must remain.');
  assert.equal(page.app.hasDraft(),true);
  page.submit();
  assert.equal(page.data().entries[0].source,'Private heart selection that must remain.');
  assert.equal(page.data().entries[0].exercise,'heart');
});

test('a detached recovery button cannot download an old return or replace the current draft', () => {
  const page=harness();
  page.type('[data-note="source"]','Ocean contains boat.');page.submit();
  page.type('[data-note="source"]','Boat enables passage.');page.click('[data-lock-source]');
  page.type('[data-note="recollection"]','Ocean contains boat.');page.click('[data-reveal]');
  page.external(JSON.stringify({schemaVersion:1,entries:[],sessions:[],readiness:{}}));
  page.click('[data-reload]');
  const oldRecovery=page.q('[data-recover-return]');
  const saved=JSON.stringify(page.data());
  page.click('[data-exercise="body"]');
  page.type('[data-note="source"]','Private body selection that must remain.');
  oldRecovery.click();
  assert.equal(page.downloads.length,0,'a stale control cannot initiate a private download');
  assert.equal(page.q('[data-note="source"]').value,'Private body selection that must remain.');
  assert.equal(JSON.stringify(page.data()),saved);
  page.click('[data-exercise="stream"]');
  oldRecovery.click();
  assert.equal(page.downloads.length,0,'returning to the exercise does not reactivate an old render’s control');
  assert.equal(page.q('[data-note="source"]').value,'Boat enables passage.');
  assert.equal(page.q('[data-note="source"]').readOnly,true);
  assert.match(page.q('.training-original').textContent,/Ocean contains boat/);
});

test('ending or changing an exercise stops a test bell as well as session audio', () => {
  const page=harness();
  page.click('[data-test-sound]');
  assert.equal(page.sounds[1].enabled,true);
  page.click('[data-exercise="heart"]');
  assert.equal(page.sounds[1].enabled,false,'switching before a session starts also stops the test bell');
  page.click('[data-start]');page.advance(2);page.click('[data-test-sound]');
  assert.equal(page.sounds[1].enabled,true);
  page.click('[data-end]');
  assert.ok(page.sounds.every(audio=>!audio.enabled));
  page.click('[data-test-sound]');
  page.click('[data-other]');
  assert.ok(page.sounds.every(audio=>!audio.enabled),'the readiness shortcut also cleans up all audio');
});

test('tracing a relationship keeps its complete meaning and updates participant labels across entries', () => {
  const page=harness({stageId:'half-circle'});
  assert.equal(page.q('[data-model-relation]').value,'');
  assert.match(page.q('[data-traced-relationship]').textContent,/Whole structure · 2 relationships/);
  page.choose('[data-model-relation]','R02');
  assert.match(page.q('[data-traced-relationship]').textContent,/Boat provides a means of traversing ocean/);
  assert.match(page.q('[data-traced-relationship]').textContent,/The full model still contains 2 relationships/);
  assert.equal(page.q('[data-trace-relation="R02"]').getAttribute('aria-pressed'),'true');
  page.choose('[data-model-state]','1');
  assert.equal(page.q('[data-model-relation]').value,'R02');
  assert.match(page.q('[data-traced-relationship]').textContent,/Aircraft provides a means of traversing sky/);
  assert.match(page.q('[data-model-role-list]').textContent,/Sky/);
  assert.doesNotMatch(page.q('[data-model-role-list]').textContent,/Ocean/);
  page.click('[data-trace-relation="R01"]');
  assert.equal(page.q('[data-model-relation]').value,'R01');
  assert.match(page.q('[data-traced-relationship]').textContent,/Sky is the containing environment of aircraft/);
  assert.equal(page.q('[data-model-relation]').focused,true);
  page.choose('[data-model-relation]','');
  assert.match(page.q('[data-traced-relationship]').textContent,/Whole structure/);
  assert.ok(page.host.querySelectorAll('[data-trace-relation]').every(button=>button.getAttribute('aria-pressed')==='false'));
});

test('the explorer renders the actual complete network and highlights one edge without removing its context', () => {
  const page=harness();
  const diagram=()=>page.q('[data-model-diagram]');
  assert.equal(diagram().querySelectorAll('[data-relation]').length,1);
  assert.equal(diagram().querySelectorAll('[data-role]').length,2);
  assert.equal(diagram().querySelector('svg').getAttribute('role'),'img');
  page.choose('[data-model-relation]','R01');
  assert.equal(diagram().querySelector('[data-relation="R01"]').getAttribute('data-selected'),'true');
  assert.equal(diagram().querySelectorAll('[data-role]').filter(node=>node.getAttribute('data-selected')==='true').length,2);
  page.app.setStage('sphere');
  assert.equal(diagram().querySelectorAll('[data-relation]').length,120);
  assert.equal(diagram().querySelectorAll('[data-role]').length,42);
  page.choose('[data-model-state]','2');page.choose('[data-model-relation]','C13');
  assert.equal(diagram().querySelectorAll('[data-relation]').length,120);
  assert.equal(diagram().querySelector('[data-relation="C13"]').getAttribute('data-selected'),'true');
  assert.equal(diagram().querySelector('svg').getAttribute('data-breath'),'3');
  assert.match(page.q('[data-traced-relationship]').textContent,/unmet/i);
  assert.equal(page.q('[data-model-role-list]').querySelectorAll('dt').length,42);
});


