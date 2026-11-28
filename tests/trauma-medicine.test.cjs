'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

function mod(rel) {
  return import(pathToFileURL(path.resolve(__dirname, '..', 'trauma-medicine', rel)).href);
}

test('Trauma Medicine: complete 80-type taxonomy spans 8 families, 3 cognitive levels, 12 scenarios, and 80 distinct engines', async () => {
  const {
    REASONING_TYPE_LIST,
    REASONING_FAMILIES,
    TOTAL_REASONING_TYPES,
  } = await mod('reasoning-types.js');
  const { SCENARIOS, SCENARIOS_BY_PHASE } = await mod('roster.js');
  const { synthesizeTrial } = await mod('case-decks.js');

  assert.equal(TOTAL_REASONING_TYPES, 80, 'exactly 80 reasoning types defined');
  assert.equal(REASONING_TYPE_LIST.length, 80);
  assert.equal(REASONING_FAMILIES.length, 8);
  assert.equal(SCENARIOS.length, 12, '12 rich medical scenarios (4 per phase)');
  assert.equal(SCENARIOS_BY_PHASE.before.length, 4);
  assert.equal(SCENARIOS_BY_PHASE.inside.length, 4);
  assert.equal(SCENARIOS_BY_PHASE.after.length, 4);

  const numbers = new Set(REASONING_TYPE_LIST.map((r) => r.number));
  assert.equal(numbers.size, 80, 'unique numbers 1..80');

  const levels = new Set(REASONING_TYPE_LIST.map((r) => r.level));
  assert.deepEqual(Array.from(levels).sort(), ['atomic', 'composite', 'meta']);

  const distinctEngines = new Set(REASONING_TYPE_LIST.map((r) => r.engineId));
  assert.equal(distinctEngines.size, 80, `expected 80 distinct engines (1 per type), got ${distinctEngines.size}`);

  const minuteTypes = new Set([
    'proportional-reasoning',
    'optimisation-reasoning',
    'decision-theoretic',
    'heuristic-reasoning',
    'cross-domain-reasoning',
    'adversarial-reasoning',
    'pragmatic-reasoning',
  ]);

  // Verify EVERY SINGLE ONE of the 80 reasoning types synthesizes cleanly at Tier 1 AND Tier 5 (3 coupled disputed records)!
  for (const r of REASONING_TYPE_LIST) {
    const trial = synthesizeTrial({
      tierId: 'super-super-easy',
      pinnedReasoningType: r.id,
      seed: 2000 + r.number * 37,
    });
    assert.equal(trial.reasoningType, r.id, `pinned type #${r.number} ${r.id}`);
    assert.ok(trial.targets.length >= 1 && trial.targets.length <= 4, `#${r.number} ${r.id} targets=${trial.targets.length}`);
    assert.equal(trial.records.length, 6);
    assert.ok(trial.records.every((rec) => rec.weight >= 1 && rec.weight <= 6 && rec.minutes >= 1 && rec.minutes <= 6));
    if (minuteTypes.has(r.id)) {
      assert.equal(trial.usesWeights, true, `#${r.number} ${r.id} shows Weight column`);
      assert.equal(trial.usesMinutes, true, `#${r.number} ${r.id} shows Min column`);
    }
    assert.ok(trial.order.length > 15, `#${r.number} ${r.id} has readable order`);
    assert.ok(trial.explanation.proof.length > 10, `#${r.number} ${r.id} has proof`);
    assert.ok(trial.reasoningMeta.coreOperation.length > 10);
    assert.ok(trial.reasoningMeta.doctorLesson.length > 15);
    for (const text of [
      trial.order,
      trial.detail,
      trial.explanation.proof,
      trial.reasoningMeta.coreOperation,
      trial.reasoningMeta.doctorLesson,
    ]) {
      assert.ok(!/\*[a-zA-Z]+\*/.test(text), `no raw markdown italics in #${r.number} ${r.id}: ${text}`);
    }
    const spoilerRe = /\b(bayesian|syllogism|antinomic|dialectical|abductive|deductive|inductive|heuristics?|metacognitive|meta-reasoning|counterfactual|falsify|ontological|epistemic|combinatorial|divergent|decision-theoretic|game-theoretic|theory of mind)\b/i;
    assert.ok(!spoilerRe.test(trial.order), `active directive must not spoil reasoning type #${r.number} ${r.id}: ${trial.order}`);
    for (const t of trial.targets) {
      assert.ok(trial.shortlist.includes(t), `#${r.number} shortlist includes target ${t}`);
    }

    // Verify coupled 2-SAT synthesis at Tier 5 for all 80 types
    const t5 = synthesizeTrial({
      tierId: 'medium',
      pinnedReasoningType: r.id,
      seed: 6100 + r.number * 29,
    });
    assert.ok(t5.crossChecks.length >= 3, `#${r.number} ${r.id} builds >= 3 coupled cross-checks at Tier 5`);
  }
});

test('Trauma Medicine: 80 consecutive questions cover ALL 80 distinct reasoning types with ZERO consecutive repeats', async () => {
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

test('Trauma Medicine: Tier 4, Tier 5 & Tier 6 coupled 2-SAT cross-checks satisfy unique world & target-ID minimality', async () => {
  const { synthesizeTrial } = await mod('case-decks.js');
  const { evalClauseOnWorld } = await mod('case-logic.js');

  for (const tierId of ['easy', 'medium', 'hard']) {
    for (let i = 0; i < 6; i++) {
      const trial = synthesizeTrial({ tierId, seed: 5500 + i * 73 });
      const expectedMin = tierId === 'hard' ? 6 : tierId === 'medium' ? 3 : 1;
      assert.ok(trial.crossChecks.length >= expectedMin, `${tierId} built >= ${expectedMin} clauses`);

      const activeIndices = trial.records
        .map((r, idx) => (r.disputed ? idx : -1))
        .filter((idx) => idx !== -1);

      const total = 1 << activeIndices.length;
      const satWorlds = [];
      for (let sub = 0; sub < total; sub++) {
        let mask = 0b111111;
        for (let k = 0; k < activeIndices.length; k++) {
          if (((sub >> k) & 1) === 0) mask &= ~(1 << activeIndices[k]);
        }
        if (trial.crossChecks.every((c) => evalClauseOnWorld(c, mask))) {
          satWorlds.push(mask);
        }
      }
      assert.deepEqual(satWorlds, [trial.trueWorldMask], `${tierId} has a UNIQUE satisfying world`);

      if (tierId === 'medium' || tierId === 'hard') {
        for (let skip = 0; skip < trial.crossChecks.length; skip++) {
          const reduced = trial.crossChecks.filter((_, idx) => idx !== skip);
          let altCount = 0;
          for (let sub = 0; sub < total; sub++) {
            let mask = 0b111111;
            for (let k = 0; k < activeIndices.length; k++) {
              if (((sub >> k) & 1) === 0) mask &= ~(1 << activeIndices[k]);
            }
            if (mask !== trial.trueWorldMask && reduced.every((c) => evalClauseOnWorld(c, mask))) {
              altCount++;
            }
          }
          assert.ok(altCount >= 1, `${tierId} dropping clause ${skip} frees an alternate world`);
        }
      }
    }
  }
});

test('Trauma Medicine: Clinical Rounds N-Back semantic isomorphism & irreducible 3-line contradictions', async () => {
  const {
    ClinicalNBackStream,
    areTriadsIsomorphic,
    isIrreducibleContradiction,
    isTriadSatisfiable,
  } = await mod('nback-cases.js');

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

  for (const level of [1, 2, 3, 6]) {
    const stream = new ClinicalNBackStream(level, 300 + level * 19);
    for (let i = 0; i < level + 6; i++) {
      const trial = stream.nextTrial();
      assert.equal(trial.lines.length, 3);
      assert.equal(trial.truth.isEncoding, i < level);
      if (trial.isClash) {
        assert.equal(isIrreducibleContradiction(trial.stmts), true);
        assert.equal(trial.truth.valid, false);
      } else {
        assert.equal(isTriadSatisfiable(trial.stmts), true);
        assert.equal(trial.truth.valid, true);
      }
    }
  }
});

test('Trauma Medicine: ZeroToHeroLadder & TraumaSession track 3-level and 80-type breakdowns', async () => {
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
