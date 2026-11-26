const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

function loadModule(relPath) {
  return import(pathToFileURL(path.join(__dirname, '..', relPath)).href);
}

const BANNED_COPY = /\b(rows?|arrows?|left side|right side|points?|score|top two|IQ|categor(y|ies)|files?|records?|appears? in|named in|listed|distinct|overt|covert|hostile|safe|threat|dossier)\b|Safe \(\+\)|Threat \(−\)|relational reasoning/i;

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
      this.classList = {
        add: cls => {
          const parts = this.className ? this.className.split(/\s+/) : [];
          if (!parts.includes(cls)) this.className = [...parts, cls].join(' ');
        },
        remove: cls => {
          this.className = this.className.split(/\s+/).filter(c => c && c !== cls).join(' ');
        }
      };
    }
    setAttribute(k, v) { this.attributes[k] = String(v); }
    append(...nodes) {
      for (const n of nodes) {
        if (typeof n === 'string') this.children.push({textContent: n, children: []});
        else this.children.push(n);
      }
    }
    prepend(...nodes) {
      const items = nodes.map(n => (typeof n === 'string' ? {textContent: n, children: []} : n));
      this.children.unshift(...items);
    }
    replaceChildren(...nodes) {
      this.children = [];
      this.append(...nodes);
    }
    remove() {}
    querySelector(sel) {
      if (sel.startsWith('.')) {
        const cls = sel.slice(1);
        return this.findAll(n => n.className.split(/\s+/).includes(cls))[0] || null;
      }
      const attrMatch = sel.match(/^\[([^=]+)="([^"]+)"\]$/);
      if (attrMatch) {
        return this.findAll(n => n.attributes[attrMatch[1]] === attrMatch[2])[0] || null;
      }
      return null;
    }
    querySelectorAll(sel) {
      if (sel.startsWith('.')) {
        const cls = sel.slice(1);
        return this.findAll(n => n.className.split(/\s+/).includes(cls));
      }
      return [];
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

function countDisputedComponents(rows, reports) {
  const disputed = new Set(rows.filter(r => r.disputed).map(r => r.role));
  const adj = new Map([...disputed].map(r => [r, new Set()]));
  for (const rep of reports) {
    if (!rep.left || !rep.right) continue;
    if (disputed.has(rep.left.role) && disputed.has(rep.right.role)) {
      adj.get(rep.left.role).add(rep.right.role);
      adj.get(rep.right.role).add(rep.left.role);
    }
  }
  const seen = new Set();
  let comps = 0;
  for (const r of disputed) {
    if (seen.has(r)) continue;
    comps++;
    const stack = [r];
    seen.add(r);
    while (stack.length) {
      const cur = stack.pop();
      for (const nxt of adj.get(cur)) {
        if (!seen.has(nxt)) { seen.add(nxt); stack.push(nxt); }
      }
    }
  }
  return comps;
}

test('friend-or-foe catalog has 500 distinct families (100 per difficulty) with 12 certified boards each and zero banned meta-UI wording', async () => {
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
      assert.doesNotMatch(f.order, BANNED_COPY, `${f.id} order has banned copy: ${f.order}`);
      assert.doesNotMatch(f.order, /\(/, `${f.id} order should avoid parenthetical syntax: ${f.order}`);
      assert.doesNotMatch(f.title, BANNED_COPY, `${f.id} title has banned copy: ${f.title}`);
      assert.ok(Array.isArray(caseCatalog[f.id]), `Missing catalog for ${f.id}`);
      assert.equal(caseCatalog[f.id].length, 12, `Expected 12 certified boards for ${f.id}`);
    }
  }
});

test('all five difficulties cycle 100 unique families with variable target counts (1-4), leak-free cross-checks, and single connected Hard webs', async () => {
  const {makeCaseTrial, solveCaseEvidence} = await loadModule('friend-or-foe/case-decks.js');
  const {seededDraw} = await loadModule('friend-or-foe/case-layout.js');
  const draw = seededDraw(424242);

  for (const level of ['super-easy', 'very-easy', 'easy', 'medium', 'hard']) {
    let prev = null;
    const seenFamilies = new Set();
    const seenTargetSizes = new Set();
    let blockDomains = new Set();
    let hardCoupledCount = 0;

    for (let i = 0; i < 100; i++) {
      const trial = makeCaseTrial(level, prev, draw);
      prev = trial;
      seenFamilies.add(trial.evidence.family);
      seenTargetSizes.add(trial.pair.length);
      blockDomains.add(trial.evidence.domain);
      if ((i + 1) % 10 === 0) {
        assert.equal(blockDomains.size, 10, `${level} block ${(i + 1) / 10} must visit all 10 domains`);
        blockDomains = new Set();
      }

      assert.ok(trial.pair.length >= 1 && trial.pair.length <= 4,
        `${level} trial ${i} (${trial.evidence.family}) target count ${trial.pair.length} out of range 1..4`);
      assert.equal(trial.validWorlds, 1, `${level} trial ${i} must have exactly 1 valid truth assignment`);
      assert.ok(trial.proof.length >= 1, `${level} trial ${i} must have non-empty proof`);
      assert.doesNotMatch(trial.evidence.order, /\{name\}/);
      assert.doesNotMatch(trial.evidence.order, BANNED_COPY);

      // Every file carries a distinct operational dispatch time 1..6
      const times = trial.evidence.rows.map(r => r.time).sort((a, b) => a - b);
      assert.deepEqual(times, [1, 2, 3, 4, 5, 6], `${level} trial ${i} must carry shuffled dispatch times 1..6`);

      const disputedCount = trial.evidence.rows.filter(r => r.disputed).length;
      if (level === 'super-easy' || level === 'very-easy') {
        assert.equal(disputedCount, 0);
        assert.ok(trial.evidence.leads.length >= trial.pair.length + 2);
        assert.ok(trial.pair.every(name => trial.evidence.leads.includes(name)));
      } else if (level === 'easy') {
        assert.equal(disputedCount, 1);
        assert.equal(trial.evidence.reports.length, 1);
        assert.ok(['eq', 'neq'].includes(trial.evidence.reports[0].op),
          `Easy trial ${i} must use symmetric = / ≠ cross-check, got ${trial.evidence.reports[0].op}`);
      } else if (level === 'medium') {
        assert.equal(disputedCount, 3);
        assert.ok(trial.evidence.reports.length >= 3 && trial.evidence.reports.length <= 4);
      } else if (level === 'hard') {
        assert.equal(disputedCount, 6);
        assert.ok(trial.evidence.reports.length >= 6 && trial.evidence.reports.length <= 7);
        assert.equal(countDisputedComponents(trial.evidence.rows, trial.evidence.reports), 1,
          `Hard trial ${i} (${trial.evidence.family}) must form a single connected 6-file web`);
        const nonSymCount = trial.evidence.reports.filter(r => r.op === 'imp' || r.op === 'or' || r.op === 'nand').length;
        assert.ok(nonSymCount >= 4, `Hard trial ${i} (${trial.evidence.family}) must have >=4 non-symmetric coupled clauses, got ${nonSymCount}`);
        if (trial.proof.some(line => line.startsWith('Coupled cross-checks'))) hardCoupledCount++;
      }

      // Zero standalone Verified/Ruled-out handouts on Easy, Moderate, Hard
      for (const r of trial.evidence.reports) {
        assert.ok(r.op !== 'verified' && r.op !== 'ruled-out',
          `${level} trial ${i} (${trial.evidence.family}) must not issue standalone ${r.op} handouts`);
      }

      // Strict Target-ID Minimality: dropping ANY single cross-check must break unique target identification
      if (i < 25) {
        for (let drop = 0; drop < trial.evidence.reports.length; drop++) {
          const reduced = {
            ...trial.evidence,
            reports: trial.evidence.reports.filter((_, idx) => idx !== drop)
          };
          const solved = solveCaseEvidence(reduced);
          assert.equal(
            solved.pair.length, 0,
            `${level} trial ${i} (${trial.evidence.family}): dropping clue ${drop} (${trial.evidence.reports[drop].op}) still left a unique target set`
          );
        }
      }
    }

    assert.equal(seenFamilies.size, 100, `${level} must visit all 100 distinct families with zero repeats in 100 trials`);
    assert.ok(seenTargetSizes.size >= 3, `${level} must vary target counts across runs (saw: ${[...seenTargetSizes].join(',')})`);
    if (level === 'hard') {
      assert.equal(hardCoupledCount, 100, 'Every Hard trial must explain its coupled cross-checks in the proof');
    }
  }
});

test('ArcadeRun supports variable bullet counts (1, 2, 3, and 4 targets) with silent early shots', async () => {
  const {ArcadeRun} = await import('../friend-or-foe/arcade-range.js');
  const names = ['Samp', 'Ivo', 'Luma', 'Mira', 'Nia', 'Orin', 'Pia', 'Sol', 'Tess', 'Vale'];
  for (const count of [1, 2, 3, 4]) {
    const targets = names.slice(0, count);
    const run = new ArcadeRun(names, targets, [], () => 0.42);
    assert.equal(run.snapshot().bullets, count);
    for (let i = 0; i < count - 1; i++) {
      run.fire(run.targets.find(t => t.name === targets[i]));
      assert.equal(run.complete, false, `Shot ${i + 1} of ${count} must stay silent`);
      assert.equal(run.snapshot().bullets, count - (i + 1));
    }
    run.fire(run.targets.find(t => t.name === targets[count - 1]));
    assert.equal(run.complete, true);
    const res = run.result();
    assert.equal(res.correct, true);
    assert.equal(res.reason, 'pair');
    assert.equal(res.bullets, 0);
  }
});

test('friend-or-foe UI renders inline Shortlist toggle, dispatch times, leak-free Easy heading, in-place debrief, and zero banned copy', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'friend-or-foe/index.html'), 'utf8');
  const viewSrc = fs.readFileSync(path.join(__dirname, '..', 'friend-or-foe/case-view.js'), 'utf8');
  const gamesHtml = fs.readFileSync(path.join(__dirname, '..', 'games/index.html'), 'utf8');

  for (const [label, text] of [['friend-or-foe/index.html', html], ['friend-or-foe/case-view.js', viewSrc]]) {
    assert.doesNotMatch(text, /\bIQ\b/i, `${label} must not mention IQ`);
    assert.doesNotMatch(text, /relational reasoning/i, `${label} must not mention relational reasoning`);
    assert.doesNotMatch(text, /Safe \(\+\)|Threat \(−\)/, `${label} must not show binary Safe/Threat collapse copy`);
    assert.doesNotMatch(text, /Check the .* row first/, `${label} must not leak confirmed category on Easy`);
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
    for (const level of ['super-easy', 'very-easy']) {
      const trial = makeCaseTrial(level, null, draw);
      const root = global.document.createElement('section');
      let toggled = null;
      renderCaseEvidence(root, trial.evidence, {shortlist: true, onShortlistChange: v => { toggled = v; }});
      const checkboxes = root.findAll(n => n.tagName === 'INPUT' && n.type === 'checkbox');
      assert.equal(checkboxes.length, 1);
      assert.equal(checkboxes[0].id, 'shortlist-toggle');
      const names = root.findAll(n => n.className === 'case-leads-names')[0];
      assert.equal(names.hidden, false);
      checkboxes[0].checked = false;
      checkboxes[0].dispatchEvent('change');
      assert.equal(names.hidden, true);
      assert.equal(toggled, false);
      assert.equal(root.findAll(n => n.className === 'case-time').length, 6, 'Should render 6 dispatch timestamps');
    }

    const easyTrial = makeCaseTrial('easy', null, draw);
    const easyRoot = global.document.createElement('section');
    renderCaseEvidence(easyRoot, easyTrial.evidence, {shortlist: true});
    assert.doesNotMatch(easyRoot.allText(), /Check the .* row first/);
    assert.ok(easyRoot.allText().includes('Cross-check'));

    const hardTrial = makeCaseTrial('hard', null, draw);
    const hardRoot = global.document.createElement('section');
    renderCaseEvidence(hardRoot, hardTrial.evidence, {shortlist: true});
    assert.equal(hardRoot.findAll(n => n.tagName === 'INPUT' && n.type === 'checkbox').length, 0);
    assert.ok(hardRoot.allText().includes('Cross-checks'));

    // In-place debrief keeps the original .case-file visible underneath .case-result
    renderCaseResult(hardRoot, hardTrial);
    assert.ok(hardRoot.querySelector('.case-result'), 'Debrief banner should be present');
    assert.ok(hardRoot.querySelector('.case-file'), 'Original dossier should remain visible during debrief');
    assert.ok(hardTrial.pair.every(name => hardRoot.allText().includes(name)));

    // Confirmed-tier in-place debrief shows "Why not ...?" and highlights decisive role
    const seTrial = makeCaseTrial('super-easy', null, draw);
    const seRoot = global.document.createElement('section');
    renderCaseEvidence(seRoot, seTrial.evidence, {shortlist: true});
    renderCaseResult(seRoot, seTrial);
    assert.ok(seRoot.querySelector('.case-result'), 'Super Easy debrief banner should be present');
    assert.ok(seRoot.querySelector('.case-file'), 'Super Easy dispatches should stay visible during debrief');
    if (seTrial.rivalDebrief) {
      assert.ok(seRoot.allText().includes('Why not '), 'Confirmed-tier debrief should explain why rival failed');
      assert.ok(seRoot.querySelector('.case-decisive'), 'Decisive role entry should be highlighted');
    }

    const guideRoot = global.document.createElement('div');
    renderCaseGuide(guideRoot, 'hard', {shortlist: true});
    assert.doesNotMatch(guideRoot.allText(), BANNED_COPY);
    assert.ok(guideRoot.allText().includes('coupled cycles'));
  } finally {
    global.document = prevDocument;
  }
});

test('ArcadeSession separates first-seen family accuracy, repeat-family accuracy, and median solve pace', async () => {
  const {ArcadeSession} = await loadModule('friend-or-foe/arcade-session.js');
  const session = new ArcadeSession(20);
  session.accept({correct: true, reason: 'pair', elapsed: 6.0}, 'ha-01');
  session.next();
  session.accept({correct: false, reason: 'bullets', elapsed: 4.0}, 'ha-02');
  session.next();
  session.accept({correct: true, reason: 'pair', elapsed: 10.0}, 'ha-01');
  session.next();
  session.accept({correct: true, reason: 'pair', elapsed: 8.0}, 'ha-03');
  assert.equal(session.firstSeenTotal, 3);
  assert.equal(session.firstSeenWins, 2);
  assert.equal(session.repeatTotal, 1);
  assert.equal(session.repeatWins, 1);
  assert.equal(session.bestTime, 6.0);
  assert.equal(session.medianTime, 8.0);
});
