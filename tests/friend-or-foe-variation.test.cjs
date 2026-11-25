const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

function loadModule(relPath) {
  return import(pathToFileURL(path.join(__dirname, '..', relPath)).href);
}

function makeFakeDocument() {
  class FakeNode {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.className = '';
      this.textContent = '';
      this.children = [];
      this.attributes = {};
      this.hidden = false;
      this.listeners = new Map();
    }
    setAttribute(k, v) { this.attributes[k] = String(v); }
    append(...nodes) {
      for (const n of nodes) {
        if (typeof n === 'string') this.children.push({textContent: n, children: []});
        else this.children.push(n);
      }
    }
    replaceChildren(...nodes) {
      this.children = [];
      this.append(...nodes);
    }
    addEventListener(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(fn);
    }
    dispatchEvent(type) {
      for (const fn of this.listeners.get(type) || []) fn();
    }
    findAll(pred, out = []) {
      if (pred(this)) out.push(this);
      for (const c of this.children) if (c instanceof FakeNode) c.findAll(pred, out);
      return out;
    }
    allText() {
      return this.textContent + this.children.map(c => c instanceof FakeNode ? c.allText() : c.textContent).join('');
    }
  }
  return {
    createElement: tag => new FakeNode(tag),
    createTextNode: text => ({textContent: String(text), children: []})
  };
}

test('friend-or-foe catalogs have 105 certified cases for every Super Easy and main semantic family', async () => {
  const {caseCatalog} = await loadModule('friend-or-foe/case-catalog.js');
  const {patterns} = await loadModule('friend-or-foe/case-patterns.js');
  const {superEasyCatalog} = await loadModule('friend-or-foe/super-easy-catalog.js');
  const {superEasyPatterns} = await loadModule('friend-or-foe/super-easy-patterns.js');
  assert.equal(patterns.length, 10);
  assert.equal(superEasyPatterns.length, 10);
  for (const p of patterns) {
    assert.ok(Array.isArray(caseCatalog[p.id]), `Missing catalog for ${p.id}`);
    assert.equal(caseCatalog[p.id].length, 105, `Expected 105 cases for ${p.id}`);
  }
  for (const p of superEasyPatterns) {
    assert.ok(Array.isArray(superEasyCatalog[p.id]), `Missing super-easy catalog for ${p.id}`);
    assert.equal(superEasyCatalog[p.id].length, 105, `Expected 105 super-easy cases for ${p.id}`);
  }
});

test('all 10 semantic families solve uniquely across super-easy, very-easy, easy, medium, and hard with strict clue minimality', async () => {
  const {makeCaseTrial, solveCaseEvidence} = await loadModule('friend-or-foe/case-decks.js');
  const {seededDraw} = await loadModule('friend-or-foe/case-layout.js');
  const draw = seededDraw(424242);

  for (const level of ['super-easy', 'very-easy', 'easy', 'medium', 'hard']) {
    let prev = null;
    const seenFamilies = new Set();
    let hardCoupledCount = 0;

    for (let i = 0; i < 20; i++) {
      const trial = makeCaseTrial(level, prev, draw);
      prev = trial;
      seenFamilies.add(trial.evidence.family);

      assert.equal(trial.pair.length, 2, `${level} trial ${i} must have exactly 2 targets`);
      assert.equal(trial.validWorlds, 1, `${level} trial ${i} must have exactly 1 valid truth assignment`);
      assert.ok(trial.proof.length >= 1, `${level} trial ${i} must have non-empty proof`);
      assert.doesNotMatch(trial.evidence.order, /\{name\}/);

      const disputedCount = trial.evidence.rows.filter(r => r.disputed).length;
      if (level === 'super-easy' || level === 'very-easy') {
        assert.equal(disputedCount, 0);
        assert.equal(trial.evidence.leads.length, 4);
        assert.ok(trial.pair.every(name => trial.evidence.leads.includes(name)));
      } else if (level === 'easy') {
        assert.equal(disputedCount, 1);
        assert.equal(trial.evidence.reports.length, 1);
      } else if (level === 'medium') {
        assert.equal(disputedCount, 3);
        assert.equal(trial.evidence.reports.length, 3);
      } else if (level === 'hard') {
        assert.equal(disputedCount, 6);
        assert.equal(trial.evidence.reports.length, 6);
        const hasLogicOp = trial.evidence.reports.some(r => r.op === 'imp' || r.op === 'or');
        assert.ok(hasLogicOp, `Hard trial ${i} (${trial.evidence.family}) must include coupled => or v deduction`);
        if (trial.proof.some(line => line.startsWith('Coupled cycle'))) hardCoupledCount++;
      }

      // Strict Minimality: dropping ANY single cross-check must break uniqueness.
      for (let drop = 0; drop < trial.evidence.reports.length; drop++) {
        const reduced = {
          ...trial.evidence,
          reports: trial.evidence.reports.filter((_, idx) => idx !== drop)
        };
        const solved = solveCaseEvidence(reduced);
        assert.equal(
          solved.pair.length, 0,
          `${level} trial ${i} (${trial.evidence.family}): dropping clue ${drop} (${trial.evidence.reports[drop].op}) still left a unique pair`
        );
      }
    }

    assert.equal(seenFamilies.size, 10, `${level} must cycle through all 10 semantic families in 20 trials`);
    if (level === 'hard') {
      assert.equal(hardCoupledCount, 20, 'Every Hard trial must explain its irreducible coupled cycle in the proof');
    }
  }
});

test('friend-or-foe UI renders inline Shortlist toggle on super-easy and very-easy, polarity badges, and clean 5-tier setup form', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'friend-or-foe/index.html'), 'utf8');
  const formMatch = html.match(/<form id="run-form">[\s\S]*?<\/form>/);
  assert.ok(formMatch, 'Expected #run-form in friend-or-foe/index.html');
  assert.equal(/type=["']checkbox["']/.test(formMatch[0]), false, 'Setup form must not contain a checkbox');
  for (const id of ['difficulty-super-easy', 'difficulty-very-easy', 'difficulty-easy', 'difficulty-medium', 'difficulty-hard']) {
    assert.ok(formMatch[0].includes(`id="${id}"`), `Expected radio #${id} in setup form`);
  }

  const {makeCaseTrial} = await loadModule('friend-or-foe/case-decks.js');
  const {renderCaseEvidence, renderCaseGuide, renderCaseResult} = await loadModule('friend-or-foe/case-view.js');
  const {seededDraw} = await loadModule('friend-or-foe/case-layout.js');
  const prevDocument = global.document;
  global.document = makeFakeDocument();
  try {
    const draw = seededDraw(999);
    const seTrial = makeCaseTrial('super-easy', null, draw);
    const root = global.document.createElement('section');
    let toggled = null;
    renderCaseEvidence(root, seTrial.evidence, {shortlist: true, onShortlistChange: v => { toggled = v; }});
    const seCheckboxes = root.findAll(n => n.tagName === 'INPUT' && n.type === 'checkbox');
    assert.equal(seCheckboxes.length, 1);
    assert.equal(seCheckboxes[0].id, 'shortlist-toggle');
    const seNames = root.findAll(n => n.className === 'case-leads-names')[0];
    assert.equal(seNames.hidden, false);
    seCheckboxes[0].checked = false;
    seCheckboxes[0].dispatchEvent('change');
    assert.equal(seNames.hidden, true);
    assert.equal(toggled, false);

    const veTrial = makeCaseTrial('very-easy', null, draw);
    renderCaseEvidence(root, veTrial.evidence, {shortlist: true, onShortlistChange: v => { toggled = v; }});
    const checkboxes = root.findAll(n => n.tagName === 'INPUT' && n.type === 'checkbox');
    assert.equal(checkboxes.length, 1);
    assert.equal(checkboxes[0].id, 'shortlist-toggle');
    const names = root.findAll(n => n.className === 'case-leads-names')[0];
    assert.equal(names.hidden, false);
    checkboxes[0].checked = false;
    checkboxes[0].dispatchEvent('change');
    assert.equal(names.hidden, true);
    assert.equal(toggled, false);

    const polBadges = root.findAll(n => n.className.includes('case-pol '));
    assert.equal(polBadges.length, 6, 'All 6 category rows must show Safe/Threat polarity badges');

    const hardTrial = makeCaseTrial('hard', null, draw);
    renderCaseEvidence(root, hardTrial.evidence, {shortlist: true});
    assert.equal(root.findAll(n => n.tagName === 'INPUT' && n.type === 'checkbox').length, 0);
    assert.ok(root.allText().includes('Cross-checks'));

    const guideRoot = global.document.createElement('div');
    renderCaseGuide(guideRoot, 'hard', {shortlist: true});
    assert.ok(guideRoot.allText().includes('coupled cycles'));

    renderCaseResult(root, hardTrial);
    assert.ok(hardTrial.pair.every(name => root.allText().includes(name)));
  } finally {
    global.document = prevDocument;
  }
});
