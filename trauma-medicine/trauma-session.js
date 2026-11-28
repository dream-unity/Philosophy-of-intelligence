// Session analytics, 80-type persistent mastery tracker, and adaptive Zero-to-Hero ladder.
// Tracks per-reasoning-type (#1-80), per-family (1-8), per-cognitive-level (Atomic/Composite/Meta),
// and per-phase (Before/Inside/After) performance.

import { DIFFICULTY_TIERS } from './case-families.js';
import {
  getReasoningType,
  getClinicalPhase,
  REASONING_LEVELS,
  TOTAL_REASONING_TYPES,
} from './reasoning-types.js';

export const PROMOTE_STREAK = 6;
export const DEMOTE_MISS_STREAK = 2;

const MASTERY_STORAGE_KEY = 'trauma_medicine_80_mastery_v1';

export function loadMasteryStore() {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(MASTERY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveMasteryStore(store) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(MASTERY_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota or sandbox restrictions
  }
}

export function countMasteredTypes(store) {
  let practiced = 0;
  let clearedOnce = 0;
  for (const val of Object.values(store || {})) {
    if (val && val.total > 0) practiced++;
    if (val && val.cleared > 0) clearedOnce++;
  }
  return { practiced, clearedOnce, total: TOTAL_REASONING_TYPES };
}

export class ZeroToHeroLadder {
  constructor(startTierIndex = 0) {
    this.tierIndex = Math.max(0, Math.min(DIFFICULTY_TIERS.length - 1, startTierIndex));
    this.clearStreak = 0;
    this.missStreak = 0;
    this.peakTierIndex = this.tierIndex;
  }

  get currentTier() {
    return DIFFICULTY_TIERS[this.tierIndex];
  }

  record(cleared) {
    let transition = null;
    if (cleared) {
      this.clearStreak++;
      this.missStreak = 0;
      if (this.clearStreak >= PROMOTE_STREAK && this.tierIndex < DIFFICULTY_TIERS.length - 1) {
        this.tierIndex++;
        this.clearStreak = 0;
        this.peakTierIndex = Math.max(this.peakTierIndex, this.tierIndex);
        transition = { type: 'promoted', tier: this.currentTier };
      }
    } else {
      this.missStreak++;
      this.clearStreak = 0;
      if (this.missStreak >= DEMOTE_MISS_STREAK && this.tierIndex > 0) {
        this.tierIndex--;
        this.missStreak = 0;
        transition = { type: 'demoted', tier: this.currentTier };
      }
    }
    return transition;
  }

  progressText() {
    if (this.tierIndex >= DIFFICULTY_TIERS.length - 1) {
      return `Top tier · ${this.clearStreak} clear streak`;
    }
    return `${this.clearStreak}/${PROMOTE_STREAK} to ${DIFFICULTY_TIERS[this.tierIndex + 1].short}`;
  }
}

export class TraumaSession {
  constructor({ mode = 'zero-to-hero', tierId = 'super-super-easy', nbackLevel = 2, targetTrials = 20 } = {}) {
    this.mode = mode;
    this.fixedTierId = tierId;
    this.nbackLevel = nbackLevel;
    this.targetTrials = Math.max(1, Math.min(1000, Math.round(Number(targetTrials) || 20)));
    this.ladder = mode === 'zero-to-hero' ? new ZeroToHeroLadder(0) : null;

    this.total = 0;
    this.cleared = 0;
    this.missed = 0;
    this.currentStreak = 0;
    this.bestStreak = 0;
    this.solveTimesMs = [];
    this.byReasoning = new Map();
    this.byLevel = new Map();
    this.byPhase = new Map();
    this.nbackPoints = 0;
    this.nbackMaxPoints = 0;
  }

  isComplete() {
    return this.total >= this.targetTrials;
  }

  activeTierId() {
    return this.ladder ? this.ladder.currentTier.id : this.fixedTierId;
  }

  recordStandardTrial({ trial, cleared, elapsedMs }) {
    this.total++;
    if (cleared) {
      this.cleared++;
      this.currentStreak++;
      this.bestStreak = Math.max(this.bestStreak, this.currentStreak);
      if (Number.isFinite(elapsedMs) && elapsedMs > 0) {
        this.solveTimesMs.push(elapsedMs);
      }
    } else {
      this.missed++;
      this.currentStreak = 0;
    }

    // Per-reasoning-type stats
    const rId = trial.reasoningType;
    const rMeta = getReasoningType(rId);
    if (!this.byReasoning.has(rId)) {
      this.byReasoning.set(rId, { id: rId, meta: rMeta, cleared: 0, total: 0 });
    }
    const rStat = this.byReasoning.get(rId);
    rStat.total++;
    if (cleared) rStat.cleared++;

    // Persist lifetime mastery across shifts
    const store = loadMasteryStore();
    const prev = store[rId] || { cleared: 0, total: 0 };
    store[rId] = { cleared: prev.cleared + (cleared ? 1 : 0), total: prev.total + 1 };
    saveMasteryStore(store);

    // Per-cognitive-level stats (Atomic / Composite / Meta-Reasoning)
    const lvl = rMeta.level;
    if (!this.byLevel.has(lvl)) {
      this.byLevel.set(lvl, { id: lvl, meta: REASONING_LEVELS[lvl], cleared: 0, total: 0 });
    }
    const lStat = this.byLevel.get(lvl);
    lStat.total++;
    if (cleared) lStat.cleared++;

    // Per-phase stats (Before / Inside / After)
    const pId = trial.phase;
    if (!this.byPhase.has(pId)) {
      this.byPhase.set(pId, { id: pId, meta: getClinicalPhase(pId), cleared: 0, total: 0 });
    }
    const pStat = this.byPhase.get(pId);
    pStat.total++;
    if (cleared) pStat.cleared++;

    const ladderEvent = this.ladder ? this.ladder.record(cleared) : null;
    return { ladderEvent };
  }

  recordNBackTrial({ correctCount, totalChecks, elapsedMs }) {
    this.total++;
    const allRight = correctCount === totalChecks;
    this.nbackPoints += correctCount;
    this.nbackMaxPoints += totalChecks;
    if (allRight) {
      this.cleared++;
      this.currentStreak++;
      this.bestStreak = Math.max(this.bestStreak, this.currentStreak);
      if (Number.isFinite(elapsedMs) && elapsedMs > 0) {
        this.solveTimesMs.push(elapsedMs);
      }
    } else {
      this.missed++;
      this.currentStreak = 0;
    }
  }

  medianTimeSeconds() {
    if (!this.solveTimesMs.length) return null;
    const sorted = this.solveTimesMs.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const ms = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    return ms / 1000;
  }

  fastestTimeSeconds() {
    if (!this.solveTimesMs.length) return null;
    return Math.min(...this.solveTimesMs) / 1000;
  }

  accuracyPercent() {
    if (this.mode === 'nback') {
      return this.nbackMaxPoints > 0
        ? Math.round((this.nbackPoints / this.nbackMaxPoints) * 100)
        : 0;
    }
    return this.total > 0 ? Math.round((this.cleared / this.total) * 100) : 0;
  }

  snapshot() {
    return {
      mode: this.mode,
      nbackLevel: this.nbackLevel,
      total: this.total,
      cleared: this.cleared,
      missed: this.missed,
      accuracy: this.accuracyPercent(),
      bestStreak: this.bestStreak,
      medianSec: this.medianTimeSeconds(),
      fastestSec: this.fastestTimeSeconds(),
      peakTier: this.ladder ? DIFFICULTY_TIERS[this.ladder.peakTierIndex].label : null,
      reasoningBreakdown: Array.from(this.byReasoning.values()).sort((a, b) => a.meta.number - b.meta.number),
      levelBreakdown: ['atomic', 'composite', 'meta']
        .map((id) => this.byLevel.get(id))
        .filter(Boolean),
      phaseBreakdown: ['before', 'inside', 'after']
        .map((id) => this.byPhase.get(id))
        .filter(Boolean),
    };
  }
}
