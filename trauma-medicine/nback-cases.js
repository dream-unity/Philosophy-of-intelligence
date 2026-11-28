// Clinical Rounds N-Back (1-back to 6-back):
// Rapid relational working-memory training over 3-statement authentic medical briefings.
// Evaluates exact semantic isomorphism across all 36 (3! patient bijections x 3! line permutations)
// alignments with irreducible 3-line clinical contradictions across 8 trauma domains
// spanning Before (triage), Inside (resuscitation), and After (family/ethics/M&M/autopsy).

import { createRng, shuffle } from './case-layout.js';

export const NBACK_LEVELS = Object.freeze([1, 2, 3, 4, 5, 6]);

// 3 short patient names per triad paired with realistic ER emergency conditions
const TRIAD_NAMES = Object.freeze([
  ['Nadia', 'Caleb', 'Priya'],
  ['Devon', 'Maren', 'Tomas'],
  ['Hana', 'Gideon', 'Selma'],
  ['Rory', 'Nadia', 'Tomas'],
  ['Caleb', 'Hana', 'Devon'],
]);

// 8 vivid, authentic clinical domains across Before, Inside, and After trauma care
const CLINICAL_RELATIONS = Object.freeze([
  {
    id: 'airway',
    phase: 'Before · Airway Triage',
    reasoning: 'Airway Priority',
    gt: (a, b) => `${a}'s airway is closing faster than ${b}'s.`,
    lt: (a, b) => `${a}'s airway is holding longer than ${b}'s.`,
    eq: (a, b) => `${a} and ${b} share the same airway urgency.`,
    neq: (a, b) => `${a} and ${b} differ in airway urgency.`,
  },
  {
    id: 'hemorrhage',
    phase: 'Inside · Massive Hemorrhage',
    reasoning: 'Blood Loss Triage',
    gt: (a, b) => `${a} is losing arterial blood faster than ${b}.`,
    lt: (a, b) => `${a} is losing arterial blood slower than ${b}.`,
    eq: (a, b) => `${a} and ${b} have equal bleed rates.`,
    neq: (a, b) => `${a} and ${b} have different bleed rates.`,
  },
  {
    id: 'oxygen',
    phase: 'Inside · Hypoxia Watch',
    reasoning: 'Oxygen Desaturation',
    gt: (a, b) => `${a}'s SpO2 is dropping faster than ${b}'s.`,
    lt: (a, b) => `${a}'s SpO2 is steadier than ${b}'s.`,
    eq: (a, b) => `${a} and ${b} have identical oxygen saturation.`,
    neq: (a, b) => `${a} and ${b} differ in oxygen saturation.`,
  },
  {
    id: 'shock',
    phase: 'Inside · Code Blue Telemetry',
    reasoning: 'Shock Escalation',
    gt: (a, b) => `${a}'s blood pressure crashed earlier than ${b}'s.`,
    lt: (a, b) => `${a}'s blood pressure crashed later than ${b}'s.`,
    eq: (a, b) => `${a} and ${b} crashed in blood pressure together.`,
    neq: (a, b) => `${a} and ${b} crashed at different times.`,
  },
  {
    id: 'sepsis',
    phase: 'Before · Sepsis & Shock',
    reasoning: 'Antibiotic Window',
    gt: (a, b) => `${a} has higher blood lactate than ${b}.`,
    lt: (a, b) => `${a} has lower blood lactate than ${b}.`,
    eq: (a, b) => `${a} and ${b} show the same lactate level.`,
    neq: (a, b) => `${a} and ${b} show different lactate levels.`,
  },
  {
    id: 'surrogate',
    phase: 'After · Family Consent',
    reasoning: 'Advance Directive Priority',
    gt: (a, b) => `${a}'s family faces a tighter consent window than ${b}'s.`,
    lt: (a, b) => `${a}'s family has more consent time than ${b}'s.`,
    eq: (a, b) => `${a} and ${b} hold equal consent priority.`,
    neq: (a, b) => `${a} and ${b} hold unequal consent priority.`,
  },
  {
    id: 'mm-audit',
    phase: 'After · M&M Safety Board',
    reasoning: 'Treatment Delay Audit',
    gt: (a, b) => `${a} suffered a longer treatment delay than ${b}.`,
    lt: (a, b) => `${a} had a shorter treatment delay than ${b}.`,
    eq: (a, b) => `${a} and ${b} experienced the exact same delay.`,
    neq: (a, b) => `${a} and ${b} experienced different delays.`,
  },
  {
    id: 'autopsy',
    phase: 'After · Forensic Autopsy',
    reasoning: 'Time-of-Injury Sequence',
    gt: (a, b) => `${a}'s fatal trauma occurred earlier than ${b}'s.`,
    lt: (a, b) => `${a}'s fatal trauma occurred later than ${b}'s.`,
    eq: (a, b) => `${a} and ${b} sustained fatal trauma simultaneously.`,
    neq: (a, b) => `${a} and ${b} sustained fatal trauma at different times.`,
  },
]);

// Canonical abstract 3-statement relational templates over variables {0, 1, 2}.
const VALID_PATTERNS = Object.freeze([
  {
    id: 'chain-strict',
    minLevel: 1,
    clash: false,
    stmts: [
      { op: '>', a: 0, b: 1 },
      { op: '>', a: 1, b: 2 },
      { op: '>', a: 0, b: 2 },
    ],
  },
  {
    id: 'chain-mixed',
    minLevel: 1,
    clash: false,
    stmts: [
      { op: '>', a: 0, b: 1 },
      { op: '<', a: 2, b: 1 },
      { op: '>', a: 0, b: 2 },
    ],
  },
  {
    id: 'tied-top',
    minLevel: 2,
    clash: false,
    stmts: [
      { op: '=', a: 0, b: 1 },
      { op: '>', a: 1, b: 2 },
      { op: '>', a: 0, b: 2 },
    ],
  },
  {
    id: 'tied-bottom',
    minLevel: 2,
    clash: false,
    stmts: [
      { op: '>', a: 0, b: 1 },
      { op: '=', a: 1, b: 2 },
      { op: '<', a: 2, b: 0 },
    ],
  },
  {
    id: 'fork-top',
    minLevel: 3,
    clash: false,
    stmts: [
      { op: '>', a: 0, b: 1 },
      { op: '>', a: 0, b: 2 },
      { op: '!=', a: 1, b: 2 },
    ],
  },
  {
    id: 'fork-bottom',
    minLevel: 3,
    clash: false,
    stmts: [
      { op: '>', a: 0, b: 2 },
      { op: '>', a: 1, b: 2 },
      { op: '!=', a: 0, b: 1 },
    ],
  },
]);

// Irreducible 3-line contradictions: every 2-line subset is satisfiable, all 3 together are impossible!
const CLASH_PATTERNS = Object.freeze([
  {
    id: 'clash-cycle',
    minLevel: 1,
    clash: true,
    stmts: [
      { op: '>', a: 0, b: 1 },
      { op: '>', a: 1, b: 2 },
      { op: '>', a: 2, b: 0 },
    ],
  },
  {
    id: 'clash-eq-gt',
    minLevel: 2,
    clash: true,
    stmts: [
      { op: '=', a: 0, b: 1 },
      { op: '=', a: 1, b: 2 },
      { op: '>', a: 0, b: 2 },
    ],
  },
  {
    id: 'clash-eq-neq',
    minLevel: 2,
    clash: true,
    stmts: [
      { op: '=', a: 0, b: 1 },
      { op: '=', a: 1, b: 2 },
      { op: '!=', a: 0, b: 2 },
    ],
  },
  {
    id: 'clash-chain-eq',
    minLevel: 3,
    clash: true,
    stmts: [
      { op: '>', a: 0, b: 1 },
      { op: '>', a: 1, b: 2 },
      { op: '=', a: 0, b: 2 },
    ],
  },
]);

const PERMS_3 = Object.freeze([
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
]);

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
  const valid = isTriadSatisfiable(current.stmts);
  if (!nBackTrial) {
    return {
      isEncoding: true,
      valid,
      samePattern: null,
      sameDomain: null,
      sameLead: null,
    };
  }
  const samePattern = areTriadsIsomorphic(current.stmts, nBackTrial.stmts);
  const sameDomain = current.relation.id === nBackTrial.relation.id;
  const sameLead = current.names[0] === nBackTrial.names[0];
  return {
    isEncoding: false,
    valid,
    samePattern,
    sameDomain,
    sameLead,
  };
}

function renderStatement(stmt, names, relation) {
  const a = names[stmt.a];
  const b = names[stmt.b];
  if (stmt.op === '>') return relation.gt(a, b);
  if (stmt.op === '<') return relation.lt(a, b);
  if (stmt.op === '=') return relation.eq(a, b);
  return relation.neq(a, b);
}

export class ClinicalNBackStream {
  constructor(level = 2, seed = 881122) {
    this.level = Math.max(1, Math.min(6, level));
    this.rng = createRng(seed);
    this.history = [];
    this.lastRelationId = null;
  }

  nextTrial() {
    const idx = this.history.length;
    const nBack = idx >= this.level ? this.history[idx - this.level] : null;

    let relation;
    if (nBack && this.rng() < 0.45) {
      relation = nBack.relation;
    } else {
      const others = CLINICAL_RELATIONS.filter((r) => r.id !== this.lastRelationId);
      relation = others[Math.floor(this.rng() * others.length)];
    }

    const makeClash = this.rng() < 0.35;
    const eligibleValid = VALID_PATTERNS.filter((p) => p.minLevel <= Math.max(2, this.level));
    const eligibleClash = CLASH_PATTERNS.filter((p) => p.minLevel <= Math.max(2, this.level));

    let chosenTemplate;
    if (nBack && this.rng() < 0.45 && nBack.isClash === makeClash) {
      chosenTemplate = nBack.template;
    } else {
      const pool = makeClash ? eligibleClash : eligibleValid;
      chosenTemplate = pool[Math.floor(this.rng() * pool.length)];
    }

    const varPerm = PERMS_3[Math.floor(this.rng() * PERMS_3.length)];
    const stmts = shuffle(
      this.rng,
      chosenTemplate.stmts.map((s) => {
        const mapped = { op: s.op, a: varPerm[s.a], b: varPerm[s.b] };
        if (mapped.op === '>' && this.rng() < 0.35) {
          return { op: '<', a: mapped.b, b: mapped.a };
        }
        return mapped;
      })
    );

    let names = shuffle(this.rng, TRIAD_NAMES[Math.floor(this.rng() * TRIAD_NAMES.length)]);
    if (nBack && this.rng() < 0.4) {
      const lead = nBack.names[0];
      const rest = shuffle(
        this.rng,
        ['Nadia', 'Caleb', 'Priya', 'Devon', 'Maren', 'Tomas', 'Hana', 'Gideon'].filter((n) => n !== lead)
      ).slice(0, 2);
      names = [lead, rest[0], rest[1]];
    }

    const lines = stmts.map((s) => renderStatement(s, names, relation));
    const trial = {
      index: idx + 1,
      level: this.level,
      relation,
      template: chosenTemplate,
      isClash: makeClash,
      stmts,
      names,
      lines,
    };

    const truth = evaluateNBackTruth(trial, nBack);
    trial.truth = truth;

    this.lastRelationId = relation.id;
    this.history.push(trial);
    return trial;
  }
}
