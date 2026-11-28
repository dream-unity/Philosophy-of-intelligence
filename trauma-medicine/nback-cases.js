// Clinical Rounds N-Back ("Climb the Ladder" — 1-Back to 6-Back):
// Full 80-pattern rotating clinical reasoning engine fused with adaptive N-Back working memory.
// Rotates across ALL 80 reasoning types (#1–#80, 8 families, 3 cognitive levels: Atomic/Composite/Meta)
// spanning Before (triage), Inside (resuscitation), and After (family talks, bioethics & autopsy),
// with varied per-patient emergency countdowns, irreducible 3-line clinical clashes,
// balanced Phase/Target/Domain N-Back channels, and adaptive 1-Back -> 6-Back ladder climbing.

import { createRng, shuffle } from './case-layout.js';
import {
  REASONING_TYPE_LIST,
  getClinicalPhase,
} from './reasoning-types.js';
import { PATIENTS, getPatientCondition } from './roster.js';
import {
  NBACK_DOMAINS,
  NBACK_ENGINES_PART1,
  pickDomainForPhase,
} from './nback-engines.js';
import { NBACK_ENGINES_PART2 } from './nback-engines-extra.js';

export const NBACK_LEVELS = Object.freeze([1, 2, 3, 4, 5, 6]);
export const NBACK_PROMOTE_STREAK = 4;
export const NBACK_DEMOTE_MISS_STREAK = 2;

export { NBACK_DOMAINS };

export const NBACK_ENGINES = Object.freeze({
  ...NBACK_ENGINES_PART1,
  ...NBACK_ENGINES_PART2,
});

export const NBACK_CLASH_CAPABLE_IDS = Object.freeze([
  'forensic-reasoning',
  'deductive-reasoning',
  'conditional-reasoning',
  'transitive-reasoning',
  'contradiction-based',
  'constraint-based',
  'antinomic-reasoning',
  'epistemic-reasoning',
  'critical-reasoning',
  'falsification-based',
]);

const CLASH_CAPABLE_SET = new Set(NBACK_CLASH_CAPABLE_IDS);

// Varied countdown slots for the 3 patients on screen (shuffled independently — zero target leakage)
const TRIAD_COUNTDOWN_SLOTS = Object.freeze([
  { rem: 30, win: 78 }, // Urgent amber (~62% bar)
  { rem: 58, win: 96 }, // Elevated sky (~40% bar)
  { rem: 94, win: 112 }, // Guarded teal (~16% bar)
]);

const PERMS_3 = Object.freeze([
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
]);

// =========================================================================
// RELATIONAL ISOMORPHISM & IRREDUCIBLE CONTRADICTION SOLVERS (Preserved)
// =========================================================================
function canonicalStmt(s) {
  if (s.op === '>') return `>:${s.a}:${s.b}`;
  if (s.op === '<') return `>:${s.b}:${s.a}`;
  const lo = Math.min(s.a, s.b);
  const hi = Math.max(s.a, s.b);
  return `${s.op}:${lo}:${hi}`;
}

export function isTriadSatisfiable(stmts) {
  for (let v0 = 0; v0 < 3; v0++) {
    for (let v1 = 0; v1 < 3; v1++) {
      for (let v2 = 0; v2 < 3; v2++) {
        const vals = [v0, v1, v2];
        let ok = true;
        for (const s of stmts) {
          const x = vals[s.a];
          const y = vals[s.b];
          if (s.op === '>' && !(x > y)) { ok = false; break; }
          if (s.op === '<' && !(x < y)) { ok = false; break; }
          if (s.op === '=' && !(x === y)) { ok = false; break; }
          if (s.op === '!=' && !(x !== y)) { ok = false; break; }
        }
        if (ok) return true;
      }
    }
  }
  return false;
}

export function isIrreducibleContradiction(stmts) {
  if (isTriadSatisfiable(stmts)) return false;
  for (let skip = 0; skip < stmts.length; skip++) {
    const subset = stmts.filter((_, i) => i !== skip);
    if (!isTriadSatisfiable(subset)) return false;
  }
  return true;
}

export function areTriadsIsomorphic(stmtsA, stmtsB) {
  const setA = new Set(stmtsA.map(canonicalStmt));
  for (const phi of PERMS_3) {
    const mappedB = stmtsB.map((s) => ({
      op: s.op,
      a: phi[s.a],
      b: phi[s.b],
    }));
    const setB = new Set(mappedB.map(canonicalStmt));
    if (setA.size === setB.size && Array.from(setA).every((k) => setB.has(k))) {
      return true;
    }
  }
  return false;
}

export function evaluateNBackTruth(current, nBackTrial) {
  const valid = !current.isClash;
  const verdict = current.verdict;
  const verdictName = verdict === 'clash' ? 'Clinical Clash' : current.names[verdict];

  if (!nBackTrial) {
    return {
      isEncoding: true,
      valid,
      verdict,
      verdictName,
      samePhase: null,
      sameTarget: null,
      sameDomain: null,
      nBackRef: null,
    };
  }

  const nBackVerdictName =
    nBackTrial.verdict === 'clash'
      ? 'Clinical Clash'
      : nBackTrial.names[nBackTrial.verdict];

  return {
    isEncoding: false,
    valid,
    verdict,
    verdictName,
    samePhase: current.phase === nBackTrial.phase,
    sameTarget: verdictName === nBackVerdictName,
    sameDomain: current.domain.id === nBackTrial.domain.id,
    nBackRef: {
      index: nBackTrial.index,
      phase: nBackTrial.phase,
      phaseShort: nBackTrial.phaseMeta.shortLabel,
      domainShort: nBackTrial.domain.short,
      domainLabel: nBackTrial.domain.label,
      verdictName: nBackVerdictName,
      reasoningNumber: nBackTrial.reasoningMeta.number,
      reasoningName: nBackTrial.reasoningMeta.name,
    },
  };
}

// =========================================================================
// 80-PATTERN ADAPTIVE CLINICAL N-BACK STREAM
// =========================================================================
export class ClinicalNBackStream {
  constructor(startLevel = 2, seed = 881122) {
    this.startLevel = Math.max(1, Math.min(6, Math.round(Number(startLevel) || 2)));
    this.level = this.startLevel;
    this.peakLevel = this.level;
    this.climbStreak = 0;
    this.missStreak = 0;

    this.rng = createRng(seed);
    this.history = [];
    this.bag = [];
    this.lastReasoningId = null;
    this.lastDomainId = null;
  }

  _refillBag() {
    const fresh = shuffle(this.rng, REASONING_TYPE_LIST);
    if (this.lastReasoningId && fresh.length > 1 && fresh[0].id === this.lastReasoningId) {
      const swap = 1 + Math.floor(this.rng() * (fresh.length - 1));
      [fresh[0], fresh[swap]] = [fresh[swap], fresh[0]];
    }
    this.bag = fresh;
  }

  _drawReasoningMeta({ preferredPhase = null, preferClashCapable = false } = {}) {
    if (this.bag.length === 0) this._refillBag();

    // Try to honor both preferences without ever repeating within the 80-type cycle
    let pickIdx = -1;
    if (preferClashCapable && preferredPhase) {
      pickIdx = this.bag.findIndex(
        (r) =>
          r.id !== this.lastReasoningId &&
          r.phase === preferredPhase &&
          CLASH_CAPABLE_SET.has(r.id)
      );
    }
    if (pickIdx < 0 && preferClashCapable) {
      pickIdx = this.bag.findIndex(
        (r) => r.id !== this.lastReasoningId && CLASH_CAPABLE_SET.has(r.id)
      );
    }
    if (pickIdx < 0 && preferredPhase) {
      pickIdx = this.bag.findIndex(
        (r) => r.id !== this.lastReasoningId && r.phase === preferredPhase
      );
    }
    if (pickIdx < 0) {
      pickIdx = this.bag.findIndex((r) => r.id !== this.lastReasoningId);
    }
    if (pickIdx < 0) pickIdx = 0;

    const [chosen] = this.bag.splice(pickIdx, 1);
    return chosen;
  }

  recordRoundResult(perfect) {
    let ladderEvent = null;
    if (perfect) {
      this.climbStreak++;
      this.missStreak = 0;
      if (this.climbStreak >= NBACK_PROMOTE_STREAK && this.level < 6) {
        this.level++;
        this.climbStreak = 0;
        this.peakLevel = Math.max(this.peakLevel, this.level);
        ladderEvent = { type: 'promoted', level: this.level };
      }
    } else {
      this.missStreak++;
      this.climbStreak = 0;
      if (this.missStreak >= NBACK_DEMOTE_MISS_STREAK && this.level > 1) {
        this.level--;
        this.missStreak = 0;
        ladderEvent = { type: 'demoted', level: this.level };
      }
    }
    return ladderEvent;
  }

  progressText() {
    if (this.level >= 6) {
      return `Peak 6-Back · ${this.climbStreak} streak`;
    }
    return `${this.climbStreak}/${NBACK_PROMOTE_STREAK} to ${this.level + 1}-Back`;
  }

  nextTrial({ forcedReasoningId = null } = {}) {
    const idx = this.history.length;
    const nBack = idx >= this.level ? this.history[idx - this.level] : null;

    // Steer balanced ~45% match probabilities across Phase, Target, and Domain
    const wantSamePhase = !!(nBack && this.rng() < 0.45);
    const wantSameDomain = !!(nBack && wantSamePhase && this.rng() < 0.78);
    const wantSameTarget = !!(nBack && this.rng() < 0.44);

    let reasoningMeta;
    if (forcedReasoningId) {
      reasoningMeta =
        REASONING_TYPE_LIST.find((r) => r.id === forcedReasoningId) || REASONING_TYPE_LIST[0];
    } else {
      const preferClashCapable = wantSameTarget && !!nBack?.isClash;
      const preferredPhase = wantSamePhase ? nBack.phase : null;
      reasoningMeta = this._drawReasoningMeta({ preferredPhase, preferClashCapable });
    }

    const phase = reasoningMeta.phase;
    const phaseMeta = getClinicalPhase(phase);
    const domain = pickDomainForPhase(
      this.rng,
      phase,
      wantSameDomain ? nBack.domain.id : null
    );

    // Select 3 distinct patients from the 10-patient ward roster
    let chosenPatients = shuffle(this.rng, PATIENTS).slice(0, 3);
    let winIdx = Math.floor(this.rng() * 3);
    let allowClash = false;

    const canClash = CLASH_CAPABLE_SET.has(reasoningMeta.id);

    if (nBack && wantSameTarget) {
      if (nBack.isClash && canClash) {
        allowClash = true;
      } else if (!nBack.isClash) {
        const targetName = nBack.names[nBack.verdict];
        const targetObj = PATIENTS.find((p) => p.name === targetName);
        if (targetObj) {
          const rest = shuffle(
            this.rng,
            PATIENTS.filter((p) => p.id !== targetObj.id)
          ).slice(0, 2);
          chosenPatients = shuffle(this.rng, [targetObj, rest[0], rest[1]]);
          winIdx = chosenPatients.findIndex((p) => p.id === targetObj.id);
          allowClash = false;
        }
      }
    } else if (canClash) {
      // Natural high clash probability on the 10 clash-capable engines (yields ~6–8 clashes per 80 rounds)
      if (
        reasoningMeta.id === 'contradiction-based' ||
        reasoningMeta.id === 'antinomic-reasoning'
      ) {
        allowClash = this.rng() < 0.85;
      } else {
        allowClash = this.rng() < 0.72;
      }
    }

    const names = chosenPatients.map((p) => p.name);
    const engine = NBACK_ENGINES[reasoningMeta.id] || NBACK_ENGINES['differential-diagnosis'];
    const generated = engine({
      rng: this.rng,
      names,
      winIdx,
      domain,
      allowClash,
    });

    // Build 3 live patient cards with varied, zero-leakage emergency countdowns
    const slotOrder = shuffle(this.rng, TRIAD_COUNTDOWN_SLOTS);
    const depthScale = 1.12 + (this.level - 1) * 0.08;
    const patients = chosenPatients.map((p, i) => {
      const slot = slotOrder[i];
      const jitter = Math.round((this.rng() - 0.5) * 6);
      const remSec = Math.max(24, Math.round(slot.rem * depthScale) + jitter);
      const winSec = Math.max(remSec + 10, Math.round(slot.win * depthScale));
      const progress = Math.max(0.08, Math.min(0.72, 1 - remSec / winSec));
      return {
        index: i,
        id: p.id,
        name: p.name,
        accent: p.accent,
        condition: getPatientCondition(p.id, phase),
        bpm: Math.round((p.baseBpm || 88) + progress * 44),
        remSec,
        winSec,
        progress,
      };
    });

    const trial = {
      index: idx + 1,
      level: this.level,
      phase,
      phaseMeta,
      domain,
      reasoningType: reasoningMeta.id,
      reasoningMeta,
      names,
      patients,
      directive: generated.directive,
      lines: generated.lines,
      verdict: generated.verdict,
      isClash: !!generated.isClash,
      explanation: {
        proof: generated.proof,
        rival: generated.rival,
      },
      historyTrail: this.history.slice(-6).map((h) => ({
        index: h.index,
        perfect: h.resultPerfect ?? null,
      })),
    };

    trial.truth = evaluateNBackTruth(trial, nBack);

    this.lastReasoningId = reasoningMeta.id;
    this.lastDomainId = domain.id;
    this.history.push(trial);
    return trial;
  }
}
