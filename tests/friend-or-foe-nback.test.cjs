const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

function loadModule(relPath) {
  return import(pathToFileURL(path.join(__dirname, '..', relPath)).href);
}

const BANNED_COPY = /\b(rows?|arrows?|left side|right side|points?|score|top two|IQ|categor(y|ies)|files?|records?|appears? in|named in|listed|distinct|overt|covert|hostile|safe|threat|dossier|echo(es)?|invert(ed|ing)?|inversion|breach(es)?)\b|Safe \(\+\)|Threat \(−\)|relational reasoning/i;

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
    getAttribute(k) { return this.attributes[k] ?? null; }
    addEventListener(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(fn);
    }
    click() {
      for (const fn of this.listeners.get('click') || []) fn();
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
    findAll(pred, out = []) {
      if (pred(this)) out.push(this);
      for (const c of this.children) {
        if (c && typeof c.findAll === 'function') c.findAll(pred, out);
      }
      return out;
    }
    querySelector(sel) {
      if (sel.startsWith('.')) {
        const cls = sel.slice(1);
        return this.findAll(n => n.className.split(/\s+/).includes(cls))[0] || null;
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
    allText() {
      let text = this.textContent || '';
      for (const c of this.children) {
        if (!c) continue;
        text += ' ' + (typeof c.allText === 'function' ? c.allText() : (c.textContent || ''));
      }
      return text;
    }
  }
  return {
    FakeNode,
    createElement: tag => new FakeNode(tag),
    createTextNode: text => ({textContent: text, children: []})
  };
}

test('N-back semantic alignment verifies disguised cross-family equivalence and No-first tie-breaking', async () => {
  const {analyzeNBackAlignment, buildCandidateStatements, maskFromPred} =
    await loadModule('friend-or-foe/nback-cases.js');

  // Verify cross-family semantic equivalence:
  // "If A is Friend, B is a Double." (NAND) === "Either X or Y is a Foe." (Disjunction)
  const poolRef = buildCandidateStatements(['Samp', 'Orin', 'Luma']);
  const poolCur = buildCandidateStatements(['Vale', 'Tess', 'Nia']);

  const ref1 = poolRef.find(s => s.text === 'If Samp is Friend, Orin is a Double.');
  const ref2 = poolRef.find(s => s.text === 'Samp says Orin opposes Samp\'s spy.');
  const ref3 = poolRef.find(s => s.text === 'If Luma is a Spy, Samp opposes Orin\'s friend.');

  const cur1 = poolCur.find(s => s.text === 'If Vale backs Tess\'s friend, Nia is Civilian.');
  const cur2 = poolCur.find(s => s.text === 'Either Vale or Tess is a Foe.');
  const cur3 = poolCur.find(s => s.text === 'Vale says Tess matches Vale on Nia.');

  assert.ok(ref1 && ref2 && ref3 && cur1 && cur2 && cur3, 'all cross-family statements exist');
  const align = analyzeNBackAlignment([ref1, ref2, ref3], [cur1, cur2, cur3]);
  assert.equal(align.matchedCount, 3, 'cross-family disguised triad must certify as a 3/3 logical match');
  assert.equal(align.isFullMatch, true);
  assert.deepEqual(align.curMatches, [true, true, true]);

  // Verify deterministic No-first tie-break:
  // If two bijections tie at 1/3 match (one matching Line 1 [T,F,F], one matching Line 3 [F,F,T]),
  // Ontological Worlds' No-first tie-break picks [F,F,T].
  const mA = maskFromPred((v0) => v0 === 1);
  const mB = maskFromPred((v0, v1) => v1 === 1);
  const mC = maskFromPred((v0, v1, v2) => v2 === -1);
  const tieRef = [{mask: mA}, {mask: mC}, {mask: mC}];
  const tieCur = [{mask: mB}, {mask: mB}, {mask: mA}];
  const tieAlign = analyzeNBackAlignment(tieRef, tieCur);
  assert.equal(tieAlign.matchedCount, 1);
  assert.deepEqual(tieAlign.curMatches, [false, false, true], 'No-first tie-break prefers [No, No, Yes] over [Yes, No, No]');
});

test('Climb the ladder generates 480 certified high-order trials across 1-back to 6-back within 25w/129c and escalating complexity', async () => {
  const {
    MAX_PREMISE_CHARS,
    MAX_PREMISE_WORDS,
    analyzeNBackAlignment,
    evaluateNBackDecisions,
    makeNBackDeck,
    measurePremises,
    solveNBackCell
  } = await loadModule('friend-or-foe/nback-cases.js');

  const roleHits = {
    friend: 0,
    foe: 0,
    spy: 0,
    double: 0,
    civilian: 0,
    foreigner: 0
  };
  const nonlinearRateByN = {};
  const familyVarietyByN = {};

  for (let n = 1; n <= 6; n++) {
    const deck = makeNBackDeck(n, 20260 + n * 97);
    const trials = [];
    let fullMatchCount = 0;
    let partialCount = 0;
    let clashCount = 0;
    let validCount = 0;
    let nonlinearTotal = 0;
    let distinctFamilySum = 0;

    for (let t = 0; t < 80; t++) {
      const trial = deck.nextTrial();
      trials.push(trial);

      // Zero intro banner before the 3 premises
      assert.equal(trial.evidence.order, '', `N=${n} trial ${t + 1} must have empty order (no intro)`);
      assert.equal(trial.evidence.statements.length, 3, 'strictly 3 statements per trial');

      // Premise word & character ceiling matching Ontological Worlds
      const metrics = measurePremises(trial.evidence.statements);
      assert.ok(metrics.words <= MAX_PREMISE_WORDS, `N=${n} t=${t + 1} exceeded ${MAX_PREMISE_WORDS} words (${metrics.words}): ${metrics.joined}`);
      assert.ok(metrics.chars <= MAX_PREMISE_CHARS, `N=${n} t=${t + 1} exceeded ${MAX_PREMISE_CHARS} chars (${metrics.chars}): ${metrics.joined}`);
      assert.equal(BANNED_COPY.test(metrics.joined), false, `banned copy in premises: ${metrics.joined}`);

      const lower = metrics.joined.toLowerCase();
      if (/\bfriend\b/.test(lower)) roleHits.friend++;
      if (/\bfoe\b/.test(lower)) roleHits.foe++;
      if (/\bspy\b/.test(lower)) roleHits.spy++;
      if (/\bdouble\b/.test(lower)) roleHits.double++;
      if (/\bcivilian\b/.test(lower)) roleHits.civilian++;
      if (/\bforeigner\b/.test(lower)) roleHits.foreigner++;

      // Complexity telemetry
      const fams = new Set(trial.nback.statements.map(s => s.family));
      distinctFamilySum += fams.size;
      nonlinearTotal += trial.nback.statements.filter(s =>
        s.family === 'foreigner-cond' || s.family === 'conditional2' || s.family === 'disjunction2' ||
        s.family === 'conditional3' || s.family === 'epistemic-nonlinear'
      ).length;

      // Exact solver certification (minimal Valid or irreducible 3-line Clash)
      const solved = solveNBackCell(trial.nback.suspects, trial.nback.statements, {requireIrreducibleClash: true});
      assert.equal(solved.valid, true, `N=${n} t=${t + 1} failed certification: ${JSON.stringify(solved)}`);
      if (solved.kind === 'contradiction') {
        assert.equal(solved.irreducible, true, 'contradictions must be irreducible 3-line clashes');
        clashCount++;
      } else {
        validCount++;
      }

      if (t < n) {
        assert.equal(trial.nback.isEncoding, true);
        assert.equal(trial.nback.expectedDecisions, null);
      } else {
        assert.equal(trial.nback.isEncoding, false);
        const ref = trials[t - n];
        const recheck = analyzeNBackAlignment(ref.nback.statements, trial.nback.statements);
        assert.deepEqual(trial.nback.alignment.curMatches, recheck.curMatches);
        assert.equal(trial.nback.isFullMatch, recheck.isFullMatch);

        const expected = [
          recheck.curMatches[0],
          recheck.curMatches[1],
          recheck.curMatches[2],
          solved.kind === 'consistent',
          recheck.isFullMatch
        ];
        assert.deepEqual(trial.nback.expectedDecisions, expected);

        const perfect = evaluateNBackDecisions(trial, expected);
        assert.equal(perfect.exact, true);
        assert.equal(perfect.lineCorrect, 3);
        const flipped = [...expected];
        flipped[4] = !flipped[4];
        const wrong = evaluateNBackDecisions(trial, flipped);
        assert.equal(wrong.exact, false);

        if (recheck.isFullMatch) fullMatchCount++;
        else partialCount++;
      }
    }

    assert.ok(fullMatchCount >= 12, `N=${n} should include enough full 3/3 matches (got ${fullMatchCount})`);
    assert.ok(partialCount >= 20, `N=${n} should include enough partial/mismatch lures (got ${partialCount})`);
    assert.ok(clashCount >= 12, `N=${n} should include irreducible 3-line clashes (got ${clashCount})`);
    assert.ok(validCount >= 20, `N=${n} should include certified consistent triads (got ${validCount})`);

    nonlinearRateByN[n] = nonlinearTotal / 80;
    familyVarietyByN[n] = distinctFamilySum / 80;
  }

  // All 6 Friend or Foe intelligence roles must appear across sessions
  for (const [role, count] of Object.entries(roleHits)) {
    assert.ok(count >= 15, `Role "${role}" should be actively represented (got ${count})`);
  }

  // Relational complexity scales upward from 1-back to 6-back
  assert.ok(
    nonlinearRateByN[6] > nonlinearRateByN[1],
    `6-back nonlinear density (${nonlinearRateByN[6].toFixed(2)}) should exceed 1-back (${nonlinearRateByN[1].toFixed(2)})`
  );
  assert.ok(
    familyVarietyByN[6] >= familyVarietyByN[1],
    `6-back distinct family variety (${familyVarietyByN[6].toFixed(2)}) should be >= 1-back (${familyVarietyByN[1].toFixed(2)})`
  );
});

test('Climb the ladder HTML and UI render zero intro, zero debrief, Next on encoding, and 5-decision matrix on scored trials', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'friend-or-foe', 'index.html'), 'utf8');
  const zeroIdx = html.indexOf('value="zero-to-hero"');
  const climbIdx = html.indexOf('value="climb-the-ladder"');
  const sseIdx = html.indexOf('value="super-super-easy"');
  assert.ok(zeroIdx > 0 && climbIdx > zeroIdx && climbIdx < sseIdx, 'Climb the ladder sits right next to From Zero to Hero');
  assert.match(html, /Climb the ladder[\s\S]*?N-back version of Friend or Foe/i);
  assert.match(html, /id="nback-setting"[^>]*hidden/);
  for (let n = 1; n <= 6; n++) {
    assert.match(html, new RegExp(`data-nback="${n}"`), `missing ${n}-back picker button`);
  }

  const bodyOnly = html.replace(/<head[\s\S]*?<\/head>/i, '').replace(/<[^>]+>/g, ' ');
  assert.equal(BANNED_COPY.test(bodyOnly), false, 'index.html visible copy must have zero banned/echo/inversion words');

  const formMatch = html.match(/<form id="run-form">[\s\S]*?<\/form>/);
  assert.ok(formMatch);
  assert.equal(/type="checkbox"/i.test(formMatch[0]), false, '#run-form must remain free of checkboxes');

  const fakeDoc = makeFakeDocument();
  global.document = fakeDoc;
  const {renderCaseEvidence, renderCaseGuide} = await loadModule('friend-or-foe/case-view.js');
  const {makeNBackDeck} = await loadModule('friend-or-foe/nback-cases.js');

  const deck = makeNBackDeck(1, 777);
  const t1 = deck.nextTrial();
  const t2 = deck.nextTrial();

  // Trial 1 (encoding): zero .case-brief intro, 3 statements, Next button
  const root1 = fakeDoc.createElement('section');
  let advanced = false;
  renderCaseEvidence(root1, t1.evidence, {onNBackAdvance: () => { advanced = true; }});
  assert.equal(root1.querySelector('.case-brief'), null, 'encoding trial must have NO intro header');
  assert.equal(root1.querySelectorAll('.nback-stmt').length, 3);
  const nextBtn = root1.querySelector('.nback-next-btn');
  assert.ok(nextBtn, 'encoding trial renders Next button');
  nextBtn.click();
  assert.equal(advanced, true);
  assert.equal(BANNED_COPY.test(root1.allText()), false);

  // Trial 2 (scored 1-back): zero .case-brief intro, 3 statements, 5-decision matrix (10 buttons)
  const root2 = fakeDoc.createElement('section');
  const picked = [];
  renderCaseEvidence(root2, t2.evidence, {
    nbackDecisions: [null, null, null, null, null],
    onNBackDecision: (idx, val) => picked.push([idx, val])
  });
  assert.equal(root2.querySelector('.case-brief'), null, 'scored trial must have NO intro header');
  assert.equal(root2.querySelectorAll('.nback-stmt').length, 3);
  const choices = root2.querySelectorAll('.nback-choice');
  assert.equal(choices.length, 10, '5-decision matrix renders 10 buttons (2 per decision)');
  choices[0].click();
  assert.deepEqual(picked, [[0, true]]);
  assert.equal(BANNED_COPY.test(root2.allText()), false, `banned copy in scored console: ${root2.allText()}`);

  // Help guide mentions all 6 roles and has zero banned/echo/inversion copy
  const guideRoot = fakeDoc.createElement('div');
  renderCaseGuide(guideRoot, 'climb-the-ladder', {nBack: 3});
  const guideText = guideRoot.allText();
  assert.match(guideText, /Friends.*Civilians.*Foes.*Spies.*Double agents.*Foreigner/i);
  assert.equal(BANNED_COPY.test(guideText), false, `banned copy in guide: ${guideText}`);
});
