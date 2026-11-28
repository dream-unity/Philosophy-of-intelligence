// Clinical Rounds N-Back (1-back to 6-back):
// Rapid relational working-memory training over 3-statement clinical reasoning triads.
// Evaluates exact semantic isomorphism across all 36 (3! patient bijections x 3! line permutations)
// alignments with No-first tie-breaking, irreducible 3-line clinical contradictions, and fast
// 5-decision keyboard controls (A/S, D/F, H/J, K/L, Space/N).

import { createRng, shuffle } from './case-layout.js';

export const NBACK_LEVELS = Object.freeze([1, 2, 3, 4, 5, 6]);

// 3 short patient/case tokens per triad so statements stay ultra-crisp
const TRIAD_NAMES = Object.freeze([
  ['Nadia', 'Caleb', 'Priya'],
  ['Devon', 'Maren', 'Tomas'],
  ['Hana', 'Gideon', 'Selma'],
  ['Rory', 'Nadia', 'Tomas'],
  ['Caleb', 'Hana', 'Devon'],
]);

// Clinical relation pairs (forward, inverse, domain)
const CLINICAL_RELATIONS = Object.freeze([
  {
    id: 'urgency',
    phase: 'Before · Triage',
    reasoning: 'Resource Triage',
    gt: (a, b) => `${a} is more urgent than ${b}.`,
    lt: (a, b) => `${a} is less urgent than ${b}.`,
    eq: (a, b) => `${a} matches ${b}'s acuity.`,
    neq: (a, b) => `${a} and ${b} differ in acuity.`,
  },
  {
    id: 'timing',
    phase: 'Inside · Resuscitation',
    reasoning: 'Chronological Sequencing',
    gt: (a, b) => `${a} crashed before ${b}.`,
    lt: (a, b) => `${a} crashed after ${b}.`,
    eq: (a, b) => `${a} crashed alongside ${b}.`,
    neq: (a, b) => `${a} and ${b} crashed at different times.`,
  },
  {
    id: 'oxygen',
    phase: 'Inside · Airway',
    reasoning: 'Causal Chaining',
    gt: (a, b) => `${a}'s oxygen is lower than ${b}'s.`,
    lt: (a, b) => `${a}'s oxygen is higher than ${b}'s.`,
    eq: (a, b) => `${a} and ${b} have equal oxygen.`,
    neq: (a, b) => `${a} and ${b} differ in oxygen.`,
  },
  {
    id: 'surrogate',
    phase: 'After · Family Consent',
    reasoning: 'Ethical Surrogacy',
    gt: (a, b) => `${a} outranks ${b} on the directive.`,
    lt: (a, b) => `${a} follows ${b} on the directive.`,
    eq: (a, b) => `${a} and ${b} hold equal proxy rank.`,
    neq: (a, b) => `${a} and ${b} hold unequal proxy rank.`,
  },
  {
    id: 'autopsy',
    phase: 'After · Autopsy',
    reasoning: 'Autopsy Retroduction',
    gt: (a, b) => `${a}'s injury occurred before ${b}'s.`,
    lt: (a, b) => `${a}'s injury occurred after ${b}'s.`,
    eq: (a, b) => `${a} and ${b} sustained injury together.`,
    neq: (a, b) => `${a} and ${b} were injured at different times.`,
  },
]);

// Canonical abstract 3-statement relational templates over variables {0, 1, 2}.
// Each statement: { op: '>' | '<' | '=' | '!=', a: 0|1|2, b: 0|1|2 }
// Valid templates are satisfiable by an ordering of {0, 1, 2};
// Clash templates are IRREDUCIBLE 3-line contradictions (any 2 lines are satisfiable, all 3 clash!).
const VALID_PATTERNS = Object.freeze([
  // Linear chain (0 > 1 > 2)
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
  // Mixed-direction chain (0 > 1, 2 < 1, 0 > 2)
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
  // Tied top (0 = 1, 1 > 2, 0 > 2)
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
  // Tied bottom (0 > 1, 1 = 2, 2 < 0)
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
  // Distinct non-linear (0 > 1, 0 > 2, 1 != 2)
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
  // Convergent bottom (0 > 2, 1 > 2, 0 != 1)
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
  // Strict 3-cycle: 0 > 1, 1 > 2, 2 > 0
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
  // Equality-strict clash: 0 = 1, 1 = 2, 0 > 2
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
  // Equality-neq clash: 0 = 1, 1 = 2, 0 != 2
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
  // Reversed transitive clash: 0 > 1, 1 > 2, 0 = 2
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

/**
 * Normalize a statement into a canonical directional edge for exact semantic comparison:
 *  - a > b  -> ('>', a, b)
 *  - a < b  -> ('>', b, a)
 *  - a = b  -> ('=', min(a,b), max(a,b))
 *  - a != b -> ('!=', min(a,b), max(a,b))
 */
function canonicalStmt(s) {
  if (s.op === '>') return `>:${s.a}:${s.b}`;
  if (s.op === '<') return `>:${s.b}:${s.a}`;
  const lo = Math.min(s.a, s.b);
  const hi = Math.max(s.a, s.b);
  return `${s.op}:${lo}:${hi}`;
}

/**
 * Check if a 3-statement triad is satisfiable over integer ranks {0, 1, 2}.
 */
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

/**
 * Verify a contradiction triad is IRREDUCIBLE: unsatisfiable as a whole,
 * yet every 2-line subset is satisfiable.
 */
export function isIrreducibleContradiction(stmts) {
  if (isTriadSatisfiable(stmts)) return false;
  for (let skip = 0; skip < stmts.length; skip++) {
    const subset = stmts.filter((_, i) => i !== skip);
    if (!isTriadSatisfiable(subset)) return false;
  }
  return true;
}

/**
 * Exact semantic isomorphism check across all 36 (6 patient bijections x 6 statement permutations)
 * alignments between two triads. Returns true iff there exists a patient renaming phi such that
 * the canonical statement sets match identically.
 */
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

/**
 * Compute exact semantic truth for the 4 binary comparison decisions + 1 clash/valid decision
 * between the current trial and the trial N steps back:
 *  1. logicValid: Is the current briefing logically valid (true) or a contradiction/clash (false)?
 *  2. samePattern: Is the current relational structure isomorphic to N-back?
 *  3. sameDomain: Does it share the same clinical relation/domain as N-back?
 *  4. sameLead: Does it keep the same top/first-named patient identity as N-back?
 */
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

/**
 * N-Back Clinical Rounds stream generator (1-back to 6-back).
 * Balances positive/negative matches ~50/50 and switches clinical relation/reasoning type smoothly.
 */
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

    // Select clinical relation (avoid immediate repeat unless targeting sameDomain match on scored trial)
    let relation;
    if (nBack && this.rng() < 0.45) {
      relation = nBack.relation;
    } else {
      const others = CLINICAL_RELATIONS.filter((r) => r.id !== this.lastRelationId);
      relation = others[Math.floor(this.rng() * others.length)];
    }

    // Decide valid vs irreducible contradiction (~35% clashes)
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

    // Randomly permute variable indices and statement order (and flip > to < occasionally)
    const varPerm = PERMS_3[Math.floor(this.rng() * PERMS_3.length)];
    const stmts = shuffle(
      this.rng,
      chosenTemplate.stmts.map((s) => {
        const mapped = { op: s.op, a: varPerm[s.a], b: varPerm[s.b] };
        // Randomly express a > b as b < a for higher levels
        if (mapped.op === '>' && this.rng() < 0.35) {
          return { op: '<', a: mapped.b, b: mapped.a };
        }
        return mapped;
      })
    );

    // Choose 3 patient names (~40% share lead patient with nBack)
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
