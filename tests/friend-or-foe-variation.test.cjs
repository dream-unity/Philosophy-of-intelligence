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

test('friend-or-foe catalog has 500 distinct families (100 per difficulty) with 12 certified boards each', async () => {
  const {caseCatalog} = await loadModule('friend-or-foe/case-catalog.js');
  const {allFamilies, familiesForLevel, DOMAINS} = await loadModule('friend-or-foe/case-families.js');
  assert.equal(DOMAINS.length, 10);
  assert.equal(allFamilies.length, 500);
  for (const level of ['super-easy', 'very-easy', 'easy', 'medium', 'hard']) {
    const list = familiesForLevel(level);
    assert.equal(list.length, 100, `Expected 100 families for ${level}`);
    assert.equal(new Set(list.map(f => f.id)).size, 100);
    for (let d = 0; d < 10; d++) {
      assert.equal(list.filter(f => f.domain === d).length, 10, `${level} domain ${d} should have 10 families`);
    }
    for (const f of list) {
      assert.ok(Array.isArray(caseCatalog[f.id]), `Missing catalog for ${f.id}`);
      assert.equal(caseCatalog[f.id].length, 12, `Expected 12 certified boards for ${f.id}`);
    }
  }
});

test('all five difficulties cycle 100 unique families in 10-domain blocks with unique solvability and strict cross-check minimality', async () => {
  const {makeCaseTrial, solveCaseEvidence} = await loadModule('friend-or-foe/case-decks.js');
  const {seededDraw} = await loadModule('friend-or-foe/case-layout.js');
  const draw = seededDraw(424242);

  for (const level of ['super-easy', 'very-easy', 'easy', 'medium', 'hard']) {
    let prev = null;
    const seenFamilies = new Set();
    let blockDomains = new Set();
    let hardCoupledCount = 0;

    for (let i = 0; i < 100; i++) {
      const trial = makeCaseTrial(level, prev, draw);
      prev = trial;
      seenFamilies.add(trial.evidence.family);
      blockDomains.add(trial.evidence.domain);
      if ((i + 1) % 10 === 0) {
        assert.equal(blockDomains.size, 10, `${level} block ${(i + 1) / 10} must visit all 10 domains`);
        blockDomains = new Set();
      }

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
        assert.ok(trial.evidence.reports.length >= 3 && trial.evidence.reports.length <= 4);
      } else if (level === 'hard') {
        assert.equal(disputedCount, 6);
        assert.ok(trial.evidence.reports.length >= 6 && trial.evidence.reports.length <= 7);
        const hasLogicOp = trial.evidence.reports.some(r => r.op === 'imp' || r.op === 'or' || r.op === 'nand');
        assert.ok(hasLogicOp, `Hard trial ${i} (${trial.evidence.family}) must include coupled logic deduction`);
        if (trial.proof.some(line => line.startsWith('Coupled cross-checks'))) hardCoupledCount++;
      }

      // Zero standalone Verified/Ruled-out handouts on Easy, Moderate, Hard
      for (const r of trial.evidence.reports) {
        assert.ok(r.op !== 'verified' && r.op !== 'ruled-out',
          `${level} trial ${i} (${trial.evidence.family}) must not issue standalone ${r.op} handouts`);
      }

      // Strict Pair-Level Minimality: dropping ANY single cross-check must break unique pair identification
      if (i < 25) {
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
    }

    assert.equal(seenFamilies.size, 100, `${level} must visit all 100 distinct families with zero repeats in 100 trials`);
    if (level === 'hard') {
      assert.equal(hardCoupledCount, 100, 'Every Hard trial must explain its coupled cross-checks in the proof');
    }
  }
});

test('friend-or-foe UI renders inline Shortlist toggle on super-easy and very-easy, removes Safe/Threat collapse, and omits IQ or relational-reasoning copy', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'friend-or-foe/index.html'), 'utf8');
  const viewSrc = fs.readFileSync(path.join(__dirname, '..', 'friend-or-foe/case-view.js'), 'utf8');
  const gamesHtml = fs.readFileSync(path.join(__dirname, '..', 'games/index.html'), 'utf8');

  for (const [label, text] of [['friend-or-foe/index.html', html], ['friend-or-foe/case-view.js', viewSrc]]) {
    assert.doesNotMatch(text, /\bIQ\b/i, `${label} must not mention IQ`);
    assert.doesNotMatch(text, /relational reasoning/i, `${label} must not mention relational reasoning`);
    assert.doesNotMatch(text, /Safe \(\+\)|Threat \(−\)/, `${label} must not show binary Safe/Threat collapse copy`);
  }
  assert.doesNotMatch(gamesHtml, /Safe \(\+\)|Threat \(−\)/, 'games/index.html must not show binary Safe/Threat copy');

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

    const polBadges = root.findAll(n => n.className.includes('case-pol'));
    assert.equal(polBadges.length, 0, 'Must not render permanent binary Safe/Threat polarity badges');

    const hardTrial = makeCaseTrial('hard', null, draw);
    renderCaseEvidence(root, hardTrial.evidence, {shortlist: true});
    assert.equal(root.findAll(n => n.tagName === 'INPUT' && n.type === 'checkbox').length, 0);
    assert.ok(root.allText().includes('Cross-checks'));

    const guideRoot = global.document.createElement('div');
    renderCaseGuide(guideRoot, 'hard', {shortlist: true});
    assert.ok(guideRoot.allText().includes('coupled logic cycles'));

    renderCaseResult(root, hardTrial);
    assert.ok(hardTrial.pair.every(name => root.allText().includes(name)));
  } finally {
    global.document = prevDocument;
  }
});
