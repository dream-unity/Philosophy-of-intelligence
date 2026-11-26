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
    addEventListener(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(fn);
    }
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

test('semantic isomorphism aligns logically equivalent disguises (Smullyan, contrapositive, depth-3) and enforces No-first tie-breaking', async () => {
  const {maskFromPred, permuteMask, analyzeNBackAlignment} = await loadModule('friend-or-foe/nback-cases.js');

  // Verify Smullyan 3rd-order identity: "A says B differs from A on C" === (B = -1)
  const smullyanMask = maskFromPred((a, b, c) => (a === 1) === ((b * c) === -(a * c)));
  const directFoeB = maskFromPred((a, b) => b === -1);
  assert.equal(smullyanMask, directFoeB);

  // Verify contrapositive equivalence: (A = -1 => B*C = -1) === (B*C = +1 => A = +1)
  const condDirect = maskFromPred((a, b, c) => !(a === -1) || (b * c === -1));
  const condContra = maskFromPred((a, b, c) => !(b * c === 1) || (a === 1));
  assert.equal(condDirect, condContra);

  // Verify 3/3 alignment under non-trivial bijection phi = [1, 2, 0] and shuffled statement order
  const m0 = maskFromPred((a, b, c) => !(a === -1) || (b * c === -1));
  const m1 = maskFromPred((a, b, c) => b * c === 1);
  const m2 = maskFromPred((a, b, c) => a * c === -1);
  const ref = [{mask: m0}, {mask: m1}, {mask: m2}];
  const phi = [1, 2, 0];
  const cur = [
    {mask: permuteMask(m2, phi)},
    {mask: permuteMask(m0, phi)},
    {mask: permuteMask(m1, phi)}
  ];
  const match = analyzeNBackAlignment(ref, cur);
  assert.equal(match.isEcho, true);
  assert.equal(match.matchedCount, 3);
  assert.deepEqual(match.curMatches, [true, true, true]);

  // Mutating 1 statement drops alignment to exact 2/3 breach
  const curBreach = [
    {mask: permuteMask(m2, phi)},
    {mask: permuteMask(m0, phi)},
    {mask: maskFromPred((a, b, c) => a * b * c === -1)}
  ];
  const breach = analyzeNBackAlignment(ref, curBreach);
  assert.equal(breach.isEcho, false);
  assert.equal(breach.matchedCount, 2);
  assert.equal(breach.mismatchIndices.length, 1);
});

test('Climb the ladder generates certified 3-statement runs across 1-back to 6-back within Ontological Worlds word/char ceiling and zero ammo leak', async () => {
  const {
    makeNBackDeck,
    measurePremises,
    solveNBackCell,
    analyzeNBackAlignment,
    MAX_PREMISE_WORDS,
    MAX_PREMISE_CHARS,
    MIN_NBACK,
    MAX_NBACK
  } = await loadModule('friend-or-foe/nback-cases.js');
  const {ArcadeRun} = await loadModule('friend-or-foe/arcade-range.js');

  assert.throws(() => makeNBackDeck(0), RangeError);
  assert.throws(() => makeNBackDeck(7), RangeError);

  for (let nBack = MIN_NBACK; nBack <= MAX_NBACK; nBack++) {
    const deck = makeNBackDeck(nBack, 13370 + nBack * 97);
    let prevTargetsKey = null;
    let prevArcadeTargets = [];
    let echoCount = 0;
    let breachCount = 0;
    let exactTwoOfThreeBreaches = 0;
    let contradictionCount = 0;
    const bulletsByQuadrant = {
      echo: new Set(),
      breach: new Set(),
      consistent: new Set(),
      contradiction: new Set()
    };

    const trials = [];
    for (let i = 0; i < 60; i++) {
      const trial = deck.nextTrial();
      trials.push(trial);
      assert.equal(trial.number, i + 1);
      assert.equal(trial.roster.length, 10);
      assert.equal(trial.evidence.mode, 'climb-the-ladder');
      assert.equal(trial.evidence.statements.length, 3, 'Must present strictly 3 statements per trial');

      const {words, chars, joined} = measurePremises(trial.evidence.statements);
      assert.ok(words <= MAX_PREMISE_WORDS, `${nBack}-back trial ${i + 1} exceeded ${MAX_PREMISE_WORDS} words (${words}): ${joined}`);
      assert.ok(chars <= MAX_PREMISE_CHARS, `${nBack}-back trial ${i + 1} exceeded ${MAX_PREMISE_CHARS} chars (${chars}): ${joined}`);
      assert.doesNotMatch(joined, BANNED_COPY, `Premises contain banned copy: ${joined}`);
      assert.doesNotMatch(trial.evidence.order, BANNED_COPY, `Order contains banned copy: ${trial.evidence.order}`);
      for (const line of trial.proof) {
        assert.doesNotMatch(line, BANNED_COPY, `Proof contains banned copy: ${line}`);
      }

      // Independently re-solve the cell
      const solved = solveNBackCell(trial.nback.suspects, trial.nback.statements);
      assert.equal(solved.valid, true, `${nBack}-back trial ${i + 1} failed independent solver certification`);

      const curTargetsKey = [...trial.pair].sort().join('/');
      if (prevTargetsKey) {
        assert.notEqual(curTargetsKey, prevTargetsKey, 'Consecutive target sets must not repeat');
      }
      prevTargetsKey = curTargetsKey;

      if (i < nBack) {
        assert.equal(trial.nback.isWarmup, true);
        assert.deepEqual([...trial.pair].sort(), [...solved.primaryTargets].sort());
      } else {
        assert.equal(trial.nback.isWarmup, false);
        const refTrial = trials[i - nBack];
        const align = analyzeNBackAlignment(refTrial.nback.statements, trial.nback.statements);
        assert.equal(align.isEcho, trial.nback.isEcho);
        if (align.isEcho) {
          echoCount++;
          assert.equal(align.matchedCount, 3);
          assert.deepEqual([...trial.pair].sort(), [...solved.complementTargets].sort());
          bulletsByQuadrant.echo.add(trial.pair.length);
        } else {
          breachCount++;
          assert.ok(align.matchedCount <= 2);
          if (align.matchedCount === 2) exactTwoOfThreeBreaches++;
          assert.deepEqual([...trial.pair].sort(), [...solved.primaryTargets].sort());
          bulletsByQuadrant.breach.add(trial.pair.length);
        }
      }

      if (solved.kind === 'contradiction') {
        contradictionCount++;
        bulletsByQuadrant.contradiction.add(trial.pair.length);
      } else {
        bulletsByQuadrant.consistent.add(trial.pair.length);
      }

      // Verify full compatibility with ArcadeRun shooting range
      const run = new ArcadeRun(trial.roster, trial.pair, prevArcadeTargets, () => 0.42);
      assert.equal(run.snapshot().bullets, trial.pair.length);
      for (const name of trial.pair) {
        run.fire(run.targets.find(t => t.name === name));
      }
      assert.equal(run.result().correct, true);
      prevArcadeTargets = run.targets;
    }

    assert.ok(echoCount >= 12, `${nBack}-back should have >=12 echoes in 60 trials, got ${echoCount}`);
    assert.ok(breachCount >= 18, `${nBack}-back should have >=18 breaches in 60 trials, got ${breachCount}`);
    assert.ok(exactTwoOfThreeBreaches / breachCount >= 0.85,
      `${nBack}-back breaches should be >=85% exact 2/3 lures (got ${exactTwoOfThreeBreaches}/${breachCount})`);
    assert.ok(contradictionCount >= 8, `${nBack}-back should include >=8 contradiction cells, got ${contradictionCount}`);

    // Zero ammo leak: both 1-bullet and 2-bullet outcomes occur in Echoes, Breaches, and Consistent cells
    assert.deepEqual([...bulletsByQuadrant.echo].sort(), [1, 2], `${nBack}-back Echoes must balance 1 and 2 bullets`);
    assert.deepEqual([...bulletsByQuadrant.breach].sort(), [1, 2], `${nBack}-back Breaches must balance 1 and 2 bullets`);
    assert.deepEqual([...bulletsByQuadrant.consistent].sort(), [1, 2], `${nBack}-back Consistent cells must balance 1 and 2 bullets`);
  }
});

test('Climb the ladder setup UI sits right next to From Zero to Hero with an N-back level picker and renders clean briefings/debriefs', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'friend-or-foe/index.html'), 'utf8');
  const visibleText = html.replace(/<head[\s\S]*?<\/head>/i, '').replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(visibleText, BANNED_COPY);

  // Climb the ladder sits immediately next to From Zero to Hero
  const zthPos = html.indexOf('id="difficulty-zero-to-hero"');
  const ctlPos = html.indexOf('id="difficulty-climb-the-ladder"');
  const ssePos = html.indexOf('id="difficulty-super-super-easy"');
  assert.ok(zthPos > 0 && ctlPos > zthPos && ctlPos < ssePos, 'Climb the ladder must sit right next to From Zero to Hero');
  assert.ok(html.includes('Climb the ladder'));
  assert.match(html, /N-back version of Friend or Foe/i);

  // N-back level picker exists inside #run-form, hidden by default, with 1-back..6-back controls
  assert.ok(html.includes('id="nback-setting"'));
  for (let n = 1; n <= 6; n++) {
    assert.ok(html.includes(`data-nback="${n}"`), `Missing ${n}-back button`);
  }

  // Render live trial, debrief, and guide through case-view.js
  const {makeNBackDeck} = await loadModule('friend-or-foe/nback-cases.js');
  const {renderCaseEvidence, renderCaseResult, renderCaseGuide} = await loadModule('friend-or-foe/case-view.js');
  const prevDocument = global.document;
  global.document = makeFakeDocument();
  try {
    const deck = makeNBackDeck(2, 9001);
    const t1 = deck.nextTrial();
    deck.nextTrial();
    const t3 = deck.nextTrial();

    const root = global.document.createElement('section');
    renderCaseEvidence(root, t1.evidence);
    assert.equal(root.querySelectorAll('.nback-stmt').length, 3);
    assert.ok(root.allText().includes('Friends tell truth'));

    renderCaseEvidence(root, t3.evidence);
    renderCaseResult(root, t3, {onHoldToggle: () => {}, onNext: () => {}});
    assert.ok(root.querySelector('.case-result'));
    assert.ok(root.querySelector('.nback-ref-box'), 'Scored N-back debrief should display reference briefing #t-N');
    assert.ok(root.allText().includes('Reference briefing #1'));

    const guideRoot = global.document.createElement('div');
    renderCaseGuide(guideRoot, 'climb-the-ladder', {nBack: 3});
    assert.doesNotMatch(guideRoot.allText(), BANNED_COPY);
    assert.ok(guideRoot.allText().includes('3-back'));
  } finally {
    global.document = prevDocument;
  }
});
