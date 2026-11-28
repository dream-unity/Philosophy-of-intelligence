'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

function mod(rel) {
  return import(pathToFileURL(path.resolve(__dirname, '..', 'trauma-medicine', rel)).href);
}

test('Trauma Doctor: complete 80-type semantic clinical board spans 8 families, 3 cognitive levels, zero gibberish, zero spoilers, zero dense jargon', async () => {
  const {
    REASONING_TYPE_LIST,
    REASONING_FAMILIES,
    TOTAL_REASONING_TYPES,
  } = await mod('reasoning-types.js');
  const { synthesizeTrial, SEMANTIC_ENGINES } = await mod('case-decks.js');

  assert.equal(TOTAL_REASONING_TYPES, 80, 'exactly 80 reasoning types defined');
  assert.equal(REASONING_TYPE_LIST.length, 80);
  assert.equal(REASONING_FAMILIES.length, 8);
  assert.equal(Object.keys(SEMANTIC_ENGINES).length, 80, '80 bespoke semantic engines (1 per type)');

  const numbers = new Set(REASONING_TYPE_LIST.map((r) => r.number));
  assert.equal(numbers.size, 80, 'unique numbers 1..80');

  const levels = new Set(REASONING_TYPE_LIST.map((r) => r.level));
  assert.deepEqual(Array.from(levels).sort(), ['atomic', 'composite', 'meta']);

  // Forbidden graph-algebra gibberish, cryptic medical jargon, spoilers & pre-computed math giveaways
  const gibberishRe = /\b(1st-named|2nd-named|endpoints|Severity Weight|right-side|left-side|A\s*→\s*M\s*→\s*B|Unit pathway trace|Decon Wing|Compared \()\b/i;
  const jargonRe = /\b(cmH2O|pneumothorax|hemothorax|tamponade|mediastinum|coagulopathy|vasopressors|angiogram|epiglottitis|rhabdo|hypovolemic|pericardial|acidosis|thoracotomy|myoglobin|troponin|d-dimer|subdural|epidural|ischemia|bradycardia|tachycardia|laparotomy|pneumoperitoneum|ketoacidosis)\b/i;
  const spoilerRe = /\b(bayesian|syllogis\w*|antinomic|antithes\w*|dialectic\w*|abduct\w*|deduct\w*|induct\w*|heuristic\w*|metacognit\w*|meta-reasoning|counterfactual|falsif\w*|ontolog\w*|epistemic|combinatorial|divergen\w*|converg\w*|decision-theoretic|game-theoretic|theory of mind|transitiv\w*|disjunctiv\w*|recursiv\w*|extrapolat\w*|prognostic|proportional|analog\w*|anomal\w*|first-principles|lateral|emergent|decompos\w*|non-monotonic|perspectiv\w*|pragmatic|synthesi\w*|second-order|algorithm\w*|adversarial|optimis\w*|instrumental|mentalistic|motivational)\b/i;
  const giveawayRe = /\(\+\d+% gain\)|\(empty in \d+ min\)|→\s*2,150 mL|\(Immediate Red\)|= 54 expected harm|= \+70 net/i;

  for (const r of REASONING_TYPE_LIST) {
    assert.equal(typeof SEMANTIC_ENGINES[r.id], 'function', `semantic engine exists for #${r.number} ${r.id}`);

    // Tier 1 confirmed board
    const trial = synthesizeTrial({
      tierId: 'super-super-easy',
      pinnedReasoningType: r.id,
      seed: 2000 + r.number * 37,
    });
    assert.equal(trial.reasoningType, r.id, `pinned type #${r.number} ${r.id}`);
    assert.ok(trial.targets.length >= 1 && trial.targets.length <= 3, `#${r.number} ${r.id} targets=${trial.targets.length}`);
    assert.equal(trial.records.length, 6, `#${r.number} ${r.id} builds 6 cards`);
    assert.ok(trial.records.every((rec) => Array.isArray(rec.shownFacts) && rec.shownFacts.length >= 2), `#${r.number} ${r.id} every card has >= 2 plain-English facts`);
    assert.ok(trial.order.length > 15, `#${r.number} ${r.id} has readable order`);
    assert.ok(trial.scenario.title && trial.scenario.title.length > 4, `#${r.number} ${r.id} has scenario title`);
    assert.ok(trial.scenario.dispatch && trial.scenario.dispatch.length > 10, `#${r.number} ${r.id} has scenario dispatch`);
    assert.ok(trial.detail && trial.detail.length > 10, `#${r.number} ${r.id} has detail hint`);
    assert.ok(trial.explanation.proof.length > 10, `#${r.number} ${r.id} has proof`);
    assert.ok(trial.reasoningMeta.coreOperation.length > 10);
    assert.ok(trial.reasoningMeta.doctorLesson.length > 15);

    // Left-wall bayProfiles coherence: all 10 patients mapped, every target is an active contender (never calm/bystander)
    assert.ok(trial.bayProfiles && Object.keys(trial.bayProfiles).length === 10, `#${r.number} ${r.id} builds 10 bayProfiles`);
    for (const t of trial.targets) {
      assert.equal(trial.bayProfiles[t]?.role, 'contender', `#${r.number} ${r.id} target ${t} must be active contender on left wall`);
    }
    const calmBays = Object.values(trial.bayProfiles).filter((bp) => bp.role !== 'contender');
    assert.ok(calmBays.length >= 2, `#${r.number} ${r.id} keeps uninvolved/minor bays calm on left wall (got ${calmBays.length})`);

    const visibleBoardText = [
      trial.scenario.title,
      trial.scenario.dispatch,
      trial.order,
      trial.detail,
      ...trial.records.flatMap((rec) => rec.shownFacts.map((f) => f.text)),
    ].join(' ');

    assert.ok(!gibberishRe.test(visibleBoardText), `ZERO graph gibberish in #${r.number} ${r.id}: ${visibleBoardText.slice(0, 200)}`);
    assert.ok(!jargonRe.test(visibleBoardText), `ZERO dense medical jargon in #${r.number} ${r.id}`);
    assert.ok(!giveawayRe.test(visibleBoardText), `ZERO pre-computed math giveaways in #${r.number} ${r.id}`);
    assert.ok(!spoilerRe.test(trial.order), `active directive must not spoil reasoning type #${r.number} ${r.id}: ${trial.order}`);
    assert.ok(!/\*[a-zA-Z]+\*/.test(visibleBoardText), `no raw markdown italics in #${r.number} ${r.id}`);

    for (const t of trial.targets) {
      assert.ok(trial.shortlist.includes(t), `#${r.number} shortlist includes target ${t}`);
    }

    // Tier 5 (disputed ? Test Flip + coupled Cross-Checks)
    const t5 = synthesizeTrial({
      tierId: 'medium',
      pinnedReasoningType: r.id,
      seed: 6100 + r.number * 29,
    });
    assert.ok(t5.crossChecks.length >= 1, `#${r.number} ${r.id} builds coupled cross-checks at Tier 5 (got ${t5.crossChecks.length})`);
    assert.ok(t5.targets.length >= 1 && t5.targets.length <= 3, `#${r.number} ${r.id} Tier 5 targets=${t5.targets.length}`);
  }
});

test('Trauma Doctor: 80 consecutive standard questions cover ALL 80 distinct reasoning types with ZERO consecutive repeats', async () => {
  const { ClinicalDeckScheduler } = await mod('case-decks.js');

  const scheduler = new ClinicalDeckScheduler(123456);
  const seen = new Set();
  const seenFamilies = new Set();
  const seenLevels = new Set();
  const seenPhases = new Set();
  let prevType = null;

  for (let i = 0; i < 80; i++) {
    const trial = scheduler.nextTrial('super-super-easy');
    assert.notEqual(trial.reasoningType, prevType, `question ${i + 1} repeated ${prevType}`);
    prevType = trial.reasoningType;
    seen.add(trial.reasoningType);
    seenFamilies.add(trial.reasoningMeta.familyId);
    seenLevels.add(trial.reasoningMeta.level);
    seenPhases.add(trial.phase);
  }

  assert.equal(seen.size, 80, `expected all 80 distinct types in 80 questions, got ${seen.size}`);
  assert.equal(seenFamilies.size, 8, 'covered all 8 reasoning families');
  assert.equal(seenLevels.size, 3, 'covered all 3 cognitive levels (Atomic, Composite, Meta)');
  assert.equal(seenPhases.size, 3, 'covered all 3 trauma phases (Before, Inside, After)');
});

test('Trauma Doctor: Tier 4, Tier 5 & Tier 6 semantic cross-checks uniquely isolate trueWorldMask', async () => {
  const { synthesizeTrial } = await mod('case-decks.js');

  for (const tierId of ['easy', 'medium', 'hard']) {
    for (let i = 0; i < 8; i++) {
      const trial = synthesizeTrial({ tierId, seed: 5500 + i * 73 });
      assert.ok(trial.crossChecks.length >= 1, `${tierId} #${i} built >= 1 cross-check`);

      const activeIndices = trial.records
        .map((r, idx) => (r.disputed ? idx : -1))
        .filter((idx) => idx !== -1);
      assert.ok(activeIndices.length >= 1, `${tierId} #${i} has disputed card(s)`);

      const total = 1 << activeIndices.length;
      const satWorlds = [];
      for (let sub = 0; sub < total; sub++) {
        let mask = 0b111111;
        for (let k = 0; k < activeIndices.length; k++) {
          if (((sub >> k) & 1) === 0) mask &= ~(1 << activeIndices[k]);
        }
        if (trial.crossChecks.every((c) => c.evaluate(mask))) {
          satWorlds.push(mask);
        }
      }
      assert.deepEqual(satWorlds, [trial.trueWorldMask], `${tierId} #${i} (${trial.reasoningType}) has a UNIQUE satisfying world`);
    }
  }
});

test('Trauma Doctor: Climb the Ladder (N-Back) covers ALL 80 distinct reasoning types, adaptive 1-to-6 climbing, zero spoilers & zero dense jargon', async () => {
  const {
    ClinicalNBackStream,
    NBACK_ENGINES,
    NBACK_PROMOTE_STREAK,
    NBACK_DEMOTE_MISS_STREAK,
    areTriadsIsomorphic,
    isIrreducibleContradiction,
    isTriadSatisfiable,
  } = await mod('nback-cases.js');
  const { REASONING_TYPE_LIST } = await mod('reasoning-types.js');
  const { TraumaSession } = await mod('trauma-session.js');

  const t1 = [
    { op: '>', a: 0, b: 1 },
    { op: '>', a: 1, b: 2 },
    { op: '>', a: 0, b: 2 },
  ];
  const t2 = [
    { op: '<', a: 0, b: 2 },
    { op: '<', a: 1, b: 2 },
    { op: '<', a: 0, b: 1 },
  ];
  const tClash = [
    { op: '>', a: 0, b: 1 },
    { op: '>', a: 1, b: 2 },
    { op: '>', a: 2, b: 0 },
  ];
  assert.equal(areTriadsIsomorphic(t1, t2), true);
  assert.equal(areTriadsIsomorphic(t1, tClash), false);
  assert.equal(isTriadSatisfiable(t1), true);
  assert.equal(isIrreducibleContradiction(tClash), true);

  assert.equal(Object.keys(NBACK_ENGINES).length, 80, 'all 80 reasoning types have bespoke N-Back engines');
  for (const r of REASONING_TYPE_LIST) {
    assert.equal(typeof NBACK_ENGINES[r.id], 'function', `N-Back engine exists for #${r.number} ${r.id}`);
  }

  const stream = new ClinicalNBackStream(2, 771122);
  const session = new TraumaSession({ mode: 'nback', nbackLevel: 2, targetTrials: 80 });
  const seenTypes = new Set();
  const seenFamilies = new Set();
  const seenLevels = new Set();
  const seenPhases = new Set();
  const seenDomains = new Set();
  let prevType = null;
  let clashCount = 0;

  const spoilerRe = /\b(bayesian|syllogis\w*|antinomic|antithes\w*|dialectic\w*|abduct\w*|deduct\w*|induct\w*|heuristic\w*|metacognit\w*|meta-reasoning|counterfactual|falsif\w*|ontolog\w*|epistemic|combinatorial|divergen\w*|converg\w*|decision-theoretic|game-theoretic|theory of mind|transitiv\w*|disjunctiv\w*|recursiv\w*|extrapolat\w*|prognostic|proportional|analog\w*|anomal\w*|first-principles|lateral|emergent|decompos\w*|non-monotonic|perspectiv\w*|pragmatic|synthesi\w*|second-order|algorithm\w*|adversarial|optimis\w*|instrumental|mentalistic|motivational)\b/i;
  const jargonRe = /\b(cmH2O|pneumothorax|hemothorax|tamponade|mediastinum|coagulopathy|vasopressors|angiogram|epiglottitis|rhabdo|hypovolemic|pericardial|acidosis|thoracotomy|troponin|ketoacidosis|right-side|left-side)\b/i;

  for (let i = 0; i < 80; i++) {
    const trial = stream.nextTrial();
    assert.notEqual(trial.reasoningType, prevType, `N-Back round ${i + 1} repeated ${prevType}`);
    prevType = trial.reasoningType;
    assert.equal(trial.lines.length, 3, `round ${i + 1} has 3 clinical lines`);
    assert.equal(trial.patients.length, 3, `round ${i + 1} has 3 live patient cards`);
    assert.equal(trial.truth.isEncoding, i < 2);
    assert.ok(
      trial.verdict === 'clash' || trial.verdict === 0 || trial.verdict === 1 || trial.verdict === 2,
      `valid verdict on #${trial.reasoningMeta.number} ${trial.reasoningType}`
    );
    assert.ok(!spoilerRe.test(trial.directive), `N-Back directive spoiled #${trial.reasoningMeta.number}: ${trial.directive}`);
    assert.ok(!jargonRe.test(`${trial.directive} ${trial.lines.join(' ')}`), `jargon leaked in #${trial.reasoningMeta.number}`);

    const rems = trial.patients.map((p) => p.remSec);
    assert.ok(Math.max(...rems) - Math.min(...rems) >= 40, `varied countdown spread on round ${i + 1}`);

    if (trial.isClash) clashCount++;
    seenTypes.add(trial.reasoningType);
    seenFamilies.add(trial.reasoningMeta.familyId);
    seenLevels.add(trial.reasoningMeta.level);
    seenPhases.add(trial.phase);
    seenDomains.add(trial.domain.id);

    session.recordNBackTrial({
      trial,
      correctCount: trial.truth.isEncoding ? 1 : 4,
      totalChecks: trial.truth.isEncoding ? 1 : 4,
      elapsedMs: 4200,
      peakLevel: stream.peakLevel,
    });
  }

  assert.equal(seenTypes.size, 80, `80 consecutive N-Back rounds cover ALL 80 distinct reasoning types, got ${seenTypes.size}`);
  assert.equal(seenFamilies.size, 8, 'N-Back covered all 8 reasoning families');
  assert.equal(seenLevels.size, 3, 'N-Back covered Atomic, Composite, and Meta-Reasoning');
  assert.equal(seenPhases.size, 3, 'N-Back covered Before, Inside, and After care phases');
  assert.equal(seenDomains.size, 7, 'N-Back covered all 7 clinical crisis domains');
  assert.ok(clashCount >= 3, `N-Back surfaced real clinical clashes (${clashCount})`);

  const snap = session.snapshot();
  assert.equal(snap.reasoningBreakdown.length, 80, 'TraumaSession tracked all 80 types in N-Back');
  assert.equal(snap.levelBreakdown.length, 3, 'TraumaSession tracked all 3 cognitive levels in N-Back');
  assert.equal(snap.phaseBreakdown.length, 3, 'TraumaSession tracked all 3 phases in N-Back');

  const climbStream = new ClinicalNBackStream(2, 9988);
  for (let i = 0; i < NBACK_PROMOTE_STREAK - 1; i++) {
    assert.equal(climbStream.recordRoundResult(true), null);
  }
  const promo = climbStream.recordRoundResult(true);
  assert.equal(promo.type, 'promoted');
  assert.equal(climbStream.level, 3);
  assert.equal(climbStream.peakLevel, 3);

  for (let i = 0; i < NBACK_DEMOTE_MISS_STREAK - 1; i++) {
    assert.equal(climbStream.recordRoundResult(false), null);
  }
  const demo = climbStream.recordRoundResult(false);
  assert.equal(demo.type, 'demoted');
  assert.equal(climbStream.level, 2);
});

test('Trauma Doctor: ZeroToHeroLadder & TraumaSession track 3-level and 80-type breakdowns', async () => {
  const { ZeroToHeroLadder, TraumaSession, PROMOTE_STREAK, DEMOTE_MISS_STREAK } = await mod('trauma-session.js');
  const { ClinicalDeckScheduler } = await mod('case-decks.js');

  const ladder = new ZeroToHeroLadder(0);
  for (let i = 0; i < PROMOTE_STREAK - 1; i++) assert.equal(ladder.record(true), null);
  assert.equal(ladder.record(true).type, 'promoted');
  assert.equal(ladder.currentTier.rank, 2);

  for (let i = 0; i < DEMOTE_MISS_STREAK - 1; i++) assert.equal(ladder.record(false), null);
  assert.equal(ladder.record(false).type, 'demoted');
  assert.equal(ladder.currentTier.rank, 1);

  const session = new TraumaSession({ mode: 'zero-to-hero' });
  const scheduler = new ClinicalDeckScheduler(777);
  for (let i = 0; i < 9; i++) {
    const trial = scheduler.nextTrial(session.activeTierId());
    session.recordStandardTrial({ trial, cleared: i % 2 === 0, elapsedMs: 3200 + i * 400 });
  }
  const snap = session.snapshot();
  assert.equal(snap.total, 9);
  assert.equal(snap.reasoningBreakdown.length, 9, '9 distinct reasoning types in 9 cases');
  assert.equal(snap.levelBreakdown.length, 3, 'covers Atomic, Composite, and Meta-Reasoning');
  assert.equal(snap.phaseBreakdown.length, 3, 'covers Before, Inside, and After phases');
});
