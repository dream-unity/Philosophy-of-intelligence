// Complete 80-category taxonomy of human reasoning organized into 8 families
// and 3 cognitive levels (Atomic, Composite, Meta-reasoning), taught through Trauma Medicine.

export const CLINICAL_PHASES = Object.freeze({
  before: {
    id: 'before',
    label: 'Before · Pre-Hospital & Triage',
    shortLabel: 'Before',
    summary: 'Sorting arrivals, budgeting scarce time, and deciding who to attend first.',
  },
  inside: {
    id: 'inside',
    label: 'Inside · Active Trauma Bay',
    shortLabel: 'Inside',
    summary: 'Stabilizing crashing patients, tracing cascades, and acting under time pressure.',
  },
  after: {
    id: 'after',
    label: 'After · Family, Review & Autopsy',
    shortLabel: 'After',
    summary: 'Guiding families, auditing handoffs, and reconstructing causes post-mortem.',
  },
});

export const REASONING_LEVELS = Object.freeze({
  atomic: {
    id: 'atomic',
    label: 'Atomic',
    fullLabel: 'Level 1 · Atomic Reasoning',
    description: 'Individual inferential operations such as deduction, transitivity, or elimination.',
  },
  composite: {
    id: 'composite',
    label: 'Composite',
    fullLabel: 'Level 2 · Composite Reasoning',
    description: 'Coordinating multiple inferential operations such as differential diagnosis or strategic triage.',
  },
  meta: {
    id: 'meta',
    label: 'Meta-Reasoning',
    fullLabel: 'Level 3 · Meta-Reasoning',
    description: 'Selecting which reasoning mechanism to deploy, checking evidence integrity, and revising conclusions.',
  },
});

export const REASONING_FAMILIES = Object.freeze([
  { id: 'diagnostic', number: 1, name: 'Diagnostic & Investigative', shortName: '1. Diagnostic' },
  { id: 'logical', number: 2, name: 'Logical & Formal', shortName: '2. Logical' },
  { id: 'relational', number: 3, name: 'Relational & Abstract', shortName: '3. Relational' },
  { id: 'quantitative', number: 4, name: 'Predictive & Quantitative', shortName: '4. Quantitative' },
  { id: 'strategic', number: 5, name: 'Strategic & Systemic', shortName: '5. Strategic' },
  { id: 'creative', number: 6, name: 'Creative & Synthetic', shortName: '6. Creative' },
  { id: 'social-ethical', number: 7, name: 'Social, Psychological & Ethical', shortName: '7. Social & Ethical' },
  { id: 'metacognitive', number: 8, name: 'Metacognitive & Epistemological', shortName: '8. Metacognitive' },
]);

export const FAMILY_BY_ID = Object.freeze(
  Object.fromEntries(REASONING_FAMILIES.map((f) => [f.id, f]))
);

// Visual Differential Diagnosis integration stages (displayed in the Atlas & Guide)
export const DIFFERENTIAL_PIPELINE = Object.freeze([
  { step: '1. Observe', title: 'Observed Phenomenon', detail: 'Information gathering & pattern recognition across bay monitors and records.' },
  { step: '2. Diverge', title: 'Abductive & Divergent', detail: 'Generate competing clinical explanations (Hypothesis A, B, C).' },
  { step: '3. Predict', title: 'Deductive & Mechanistic', detail: 'Determine what physiological signs each hypothesis predicts.' },
  { step: '4. Update', title: 'Evidential & Bayesian', detail: 'Test predictions against new labs/scans and revise probabilities.' },
  { step: '5. Converge', title: 'Eliminative & Convergent', detail: 'Rule out falsified hypotheses to reach a working diagnosis—still open to revision.' },
]);

// Compact tuples expanded into full rich objects for all 80 reasoning types:
// [number, id, name, familyId, level, phase, engineId, coreOperation, doctorLesson]
const RAW_TAXONOMY = [
  // 1. Diagnostic and investigative reasoning (1–10)
  [1, 'differential-diagnosis', 'Differential diagnosis', 'diagnostic', 'composite', 'inside', 'differential-synthesis',
    'Distinguishing between competing explanations for observed phenomena.',
    'Great doctors combine elimination with weighted confirmation—ruling out falsified diagnoses while confirming the strongest remaining candidate.'],
  [2, 'abductive-reasoning', 'Abductive reasoning', 'diagnostic', 'atomic', 'inside', 'hidden-bridge',
    'Inferring the best available explanation.',
    'When two separate symptoms appear in the chart, abduction asks what single hidden patient or mechanism best connects them both.'],
  [3, 'eliminative-reasoning', 'Eliminative reasoning', 'diagnostic', 'atomic', 'inside', 'set-exclusion',
    'Systematically ruling out possibilities.',
    'In a crowded trauma bay, ruling out patients who fail a mandatory criterion narrows your focus faster than guessing who fits.'],
  [4, 'hypothetico-deductive', 'Hypothetico-deductive reasoning', 'diagnostic', 'composite', 'inside', 'non-monotonic-revision',
    'Generating hypotheses and testing their implications.',
    'Form a provisional list from early clues, then check whether later test results confirm or refute each candidate.'],
  [5, 'causal-reasoning', 'Causal reasoning', 'diagnostic', 'atomic', 'inside', 'transitive-relay',
    'Identifying cause-and-effect relationships.',
    'Trauma triggers cascades: trace how an upstream event propagates through an intermediate step to the patient now deteriorating.'],
  [6, 'root-cause-analysis', 'Root-cause analysis', 'diagnostic', 'composite', 'after', 'reverse-origin',
    'Identifying the underlying origin of a problem.',
    'During M&M review, stop treating surface symptoms and trace the chain backward to the very first origin that set the error in motion.'],
  [7, 'mechanistic-reasoning', 'Mechanistic reasoning', 'diagnostic', 'composite', 'inside', 'transitive-relay',
    'Understanding how something produces an outcome.',
    'Mechanism explains how step A drives step B into failure—following the exact physiological handoff reveals who is next in line.'],
  [8, 'forensic-reasoning', 'Forensic reasoning', 'diagnostic', 'composite', 'after', 'reverse-origin',
    'Reconstructing events from incomplete evidence.',
    'In post-mortem review, work backward from the final physical finding through the chain of custody to uncover the primary initiating case.'],
  [9, 'evidential-reasoning', 'Evidential reasoning', 'diagnostic', 'meta', 'inside', 'independent-corroboration',
    'Evaluating the strength, relevance and reliability of evidence.',
    'One dramatic chart note can mislead. Reliable clinical conviction requires independent corroboration from separate lines of evidence.'],
  [10, 'bayesian-reasoning', 'Bayesian reasoning', 'diagnostic', 'composite', 'inside', 'bayesian-prior-posterior',
    'Updating probabilities as new information emerges.',
    'Start with your early prior (01:00–02:00), then update each patient\'s score with later evidence (03:00–06:00) so new facts can overturn first impressions.'],

  // 2. Logical and formal reasoning (11–20)
  [11, 'deductive-reasoning', 'Deductive reasoning', 'logical', 'atomic', 'before', 'direct-role',
    'Deriving logically necessary conclusions from premises.',
    'When a triage protocol defines a strict rule, deduction guarantees exactly who must be treated without leaving room for bias.'],
  [12, 'inductive-reasoning', 'Inductive reasoning', 'logical', 'atomic', 'before', 'inductive-generalization',
    'Deriving generalisations from observations.',
    'Observe which unit dominates the early cases (01:00–03:00), generalize that shift trend, and apply it to the newest arriving data.'],
  [13, 'syllogistic-reasoning', 'Syllogistic reasoning', 'logical', 'atomic', 'before', 'set-intersection',
    'Inferring conclusions from categorical premises.',
    'Combining two clinical category rules ("All X are in group A; only group B gets priority") isolates the exact overlap immediately.'],
  [14, 'conditional-reasoning', 'Conditional reasoning', 'logical', 'atomic', 'inside', 'conditional-gate',
    'Reasoning through if–then relationships.',
    'Trauma algorithms run on crisp if–then branches: check the governing condition first so you execute the right branch under pressure.'],
  [15, 'transitive-reasoning', 'Transitive reasoning', 'logical', 'atomic', 'before', 'transitive-relay',
    'Inferring indirect relationships between entities.',
    'If Patient A outranks B and B outranks C across linked logs, transitivity establishes the indirect order without needing a direct comparison.'],
  [16, 'disjunctive-reasoning', 'Disjunctive reasoning', 'logical', 'atomic', 'inside', 'disjunctive-xor',
    'Reasoning between alternative possibilities.',
    'When a patient must meet one clinical pathway or the other—but not both—disjunctive sorting separates mutually exclusive interventions.'],
  [17, 'contradiction-based', 'Contradiction-based reasoning', 'logical', 'atomic', 'after', 'antinomic-cycle',
    'Establishing or rejecting propositions through inconsistency.',
    'When two records directly invert each other, the contradiction itself spotlights the exact chart clash that needs urgent resolution.'],
  [18, 'recursive-reasoning', 'Recursive reasoning', 'logical', 'composite', 'inside', 'recursive-reach',
    'Repeatedly applying a reasoning operation to its own outputs.',
    'Infectious exposure and equipment shortages spread step by step: re-apply the same transmission rule to each newly affected patient.'],
  [19, 'combinatorial-reasoning', 'Combinatorial reasoning', 'logical', 'composite', 'before', 'combinatorial-budget-pair',
    'Evaluating possible combinations and arrangements.',
    'Matching scarce beds, teams, and blood types requires checking which pairs of clinical signals combine to cross your action threshold.'],
  [20, 'constraint-based', 'Constraint-based reasoning', 'logical', 'composite', 'before', 'multi-constraint-csp',
    'Deriving solutions within multiple simultaneous restrictions.',
    'Real trauma allocation must satisfy every hard constraint at once—location, timing window, and safety exclusions simultaneously.'],

  // 3. Relational and abstract reasoning (21–32)
  [21, 'analogical-reasoning', 'Analogical reasoning', 'relational', 'atomic', 'inside', 'analogical-role-match',
    'Identifying structural similarities between different phenomena.',
    'Recognizing when a new patient\'s chart role mirrors a known case in another bay lets you transfer proven interventions rapidly.'],
  [22, 'anomalous-reasoning', 'Anomalous reasoning', 'relational', 'atomic', 'inside', 'anomaly-outlier',
    'Identifying departures from an expected pattern.',
    'Experienced clinicians notice the one case that breaks the ward\'s routine pattern—anomalies often signal rare or silent deterioration.'],
  [23, 'antinomic-reasoning', 'Antinomic reasoning', 'relational', 'atomic', 'after', 'antinomic-cycle',
    'Identifying mutually incompatible relationships.',
    'When two directives or clinical pairings directly negate each other, spotting the antinomy prevents contradictory orders.'],
  [24, 'antithetical-reasoning', 'Antithetical reasoning', 'relational', 'atomic', 'before', 'disjunctive-xor',
    'Identifying opposing relationships.',
    'Separating patients pulled exclusively toward one side of a clinical trade-off clarifies opposing needs before committing resources.'],
  [25, 'higher-order-relational', 'Higher-order relational reasoning', 'relational', 'composite', 'inside', 'higher-order-relation',
    'Reasoning about relationships between relationships.',
    'Instead of reading one chart in isolation, compare how two clinical records relate to each other—by unit or timing—before selecting targets.'],
  [26, 'cross-domain-reasoning', 'Cross-domain reasoning', 'relational', 'composite', 'after', 'analogical-role-match',
    'Transferring principles between different knowledge domains.',
    'Translating a structural pattern from acute triage to post-trauma ethics or pathology lets one clear mental model solve unfamiliar cases.'],
  [27, 'abstract-reasoning', 'Abstract reasoning', 'relational', 'composite', 'inside', 'structural-pivot',
    'Extracting underlying structures independently of their particular manifestations.',
    'Strip away noisy clinical surface details to see the pure structural role—such as who acts as both sender and receiver inside a unit.'],
  [28, 'hierarchical-reasoning', 'Hierarchical reasoning', 'relational', 'atomic', 'before', 'hierarchical-rank',
    'Understanding relationships across organisational levels.',
    'In chain-of-command triage, identify the top-level initiators who drive downstream actions without being subordinated by any other log.'],
  [29, 'spatial-reasoning', 'Spatial reasoning', 'relational', 'atomic', 'inside', 'spatial-grid-neighbors',
    'Manipulating spatial relationships mentally.',
    'Physical floor layout matters in trauma care: scan the 5×2 monitor grid to see which linked patients sit next-door or directly across the aisle.'],
  [30, 'temporal-reasoning', 'Temporal reasoning', 'relational', 'atomic', 'before', 'temporal-earliest-latest',
    'Understanding relationships across time.',
    'Strict clock order separates cause from coincidence—always verify which record logged first before acting.'],
  [31, 'structural-reasoning', 'Structural reasoning', 'relational', 'composite', 'inside', 'structural-pivot',
    'Identifying how components collectively form an organised whole.',
    'Look at how every chart connects into a single care network; pivot patients who bridge both sides anchor the whole bay\'s flow.'],
  [32, 'semantic-reasoning', 'Semantic reasoning', 'relational', 'atomic', 'after', 'semantic-role-polarity',
    'Inferring relationships between meanings and concepts.',
    'In family consent and chart readbacks, exact grammatical role—who is the active subject versus the passive object—changes who must act.'],

  // 4. Predictive and quantitative reasoning (33–41)
  [33, 'probabilistic-reasoning', 'Probabilistic reasoning', 'quantitative', 'atomic', 'before', 'bayesian-update',
    'Evaluating uncertain outcomes.',
    'Medicine operates under uncertainty: add up weighted clinical risk signals to identify patients whose odds demand immediate action.'],
  [34, 'statistical-reasoning', 'Statistical reasoning', 'quantitative', 'composite', 'after', 'statistical-distribution-peak',
    'Drawing conclusions from distributions and data.',
    'Quality audits look across the full ward distribution to identify the statistical peak standing above the ward mean.'],
  [35, 'counterfactual-reasoning', 'Counterfactual reasoning', 'quantitative', 'composite', 'inside', 'counterfactual-sole-cause',
    'Determining what might have happened under different conditions.',
    'Ask "if this single test had never run, who would lose their only clinical flag?"—counterfactuals isolate decisive dependencies.'],
  [36, 'hypothetical-reasoning', 'Hypothetical reasoning', 'quantitative', 'atomic', 'before', 'counterfactual-sole-cause',
    'Exploring possibilities without assuming their truth.',
    'Before committing an operating room, mentally test what happens if one unit\'s report is removed from the table.'],
  [37, 'predictive-reasoning', 'Predictive reasoning', 'quantitative', 'atomic', 'before', 'temporal-strict-cascade',
    'Anticipating future outcomes.',
    'Follow strictly forward-moving clinical chains to anticipate which downstream patient will decompensate next.'],
  [38, 'prognostic-reasoning', 'Prognostic reasoning', 'quantitative', 'composite', 'after', 'temporal-strict-cascade',
    'Estimating the future progression of a condition.',
    'Accurate prognosis tracks chronological trajectory—separating patients whose condition is progressing from static findings.'],
  [39, 'extrapolative-reasoning', 'Extrapolative reasoning', 'quantitative', 'atomic', 'before', 'temporal-earliest-latest',
    'Extending existing patterns beyond observed information.',
    'The latest verified trend at the end of a shift projects who is most vulnerable in the next critical window.'],
  [40, 'proportional-reasoning', 'Proportional reasoning', 'quantitative', 'atomic', 'before', 'proportional-ratio',
    'Understanding relative magnitudes and ratios.',
    'Compare severity magnitude against procedure minutes—high-ratio cases deliver at least twice the clinical impact per minute invested.'],
  [41, 'mathematical-reasoning', 'Mathematical reasoning', 'quantitative', 'composite', 'inside', 'net-balance-math',
    'Deriving conclusions through quantitative and formal relationships.',
    'Weighing positive risk inflows (+Right) against outgoing relief (−Left) turns complex clinical impressions into an exact net score.'],

  // 5. Strategic and systemic reasoning (42–52)
  [42, 'systems-reasoning', 'Systems reasoning', 'strategic', 'composite', 'inside', 'recursive-reach',
    'Understanding interacting components and feedback loops.',
    'A trauma center is a coupled system: trace how one bottleneck ripples through pumps, beds, and nurses across multiple hops.'],
  [43, 'strategic-reasoning', 'Strategic reasoning', 'strategic', 'composite', 'before', 'game-theoretic-triage',
    'Selecting actions in anticipation of future developments.',
    'Account for what other teams will cover automatically, then direct your own scarce minutes to the uncovered high-risk cases.'],
  [44, 'game-theoretic-reasoning', 'Game-theoretic reasoning', 'strategic', 'composite', 'before', 'game-theoretic-triage',
    'Accounting for the decisions of other rational agents.',
    'When another surgical crew rationally takes the earliest priority bay, your best move is to cover the critical patients they leave behind.'],
  [45, 'adversarial-reasoning', 'Adversarial reasoning', 'strategic', 'composite', 'after', 'antinomic-cycle',
    'Anticipating and evaluating opposing strategies.',
    'In forensic or conflict audits, look for opposing entries that directly invert each other—clashing claims expose contested narratives.'],
  [46, 'optimisation-reasoning', 'Optimisation reasoning', 'strategic', 'composite', 'before', 'time-budget-optimisation',
    'Identifying the best solution under given constraints.',
    'When minutes are scarce and multiple patients need help, maximize lives stabilized per minute by selecting the highest Severity-per-Minute yield first.'],
  [47, 'instrumental-reasoning', 'Instrumental reasoning', 'strategic', 'atomic', 'inside', 'direct-role',
    'Identifying effective means to achieve an objective.',
    'Match the exact clinical instrument (channel) to the immediate life-saving goal without getting distracted by unrelated logs.'],
  [48, 'second-order-reasoning', 'Second-order reasoning', 'strategic', 'composite', 'inside', 'second-order-consequence',
    'Anticipating the consequences of consequences.',
    'First-order thinking sees X affect M; great trauma doctors look one hop past M to save B—the consequence of the consequence.'],
  [49, 'risk-based-reasoning', 'Risk-based reasoning', 'strategic', 'composite', 'before', 'risk-expected-harm',
    'Evaluating potential harm, uncertainty and reward.',
    'True risk multiplies likelihood by harm—a patient flagged repeatedly at high severity carries far greater risk than a lone alert.'],
  [50, 'decision-theoretic', 'Decision-theoretic reasoning', 'strategic', 'composite', 'before', 'decision-net-utility',
    'Selecting actions according to probabilities, preferences and consequences.',
    'Balance expected clinical benefit (Severity Weight) minus time cost (Minutes) to choose interventions with the highest positive net utility.'],
  [51, 'algorithmic-reasoning', 'Algorithmic reasoning', 'strategic', 'atomic', 'inside', 'conditional-gate',
    'Constructing systematic procedures to solve problems.',
    'Follow an explicit step-by-step clinical protocol (check branch condition, then apply exact rule) so stress never scrambles execution.'],
  [52, 'reverse-reasoning', 'Reverse reasoning', 'strategic', 'atomic', 'after', 'reverse-origin',
    'Working backwards from a desired outcome.',
    'Start from the end result in the chart and step backward link by link to uncover where the trajectory began.'],

  // 6. Creative and synthetic reasoning (53–61)
  [53, 'divergent-reasoning', 'Divergent reasoning', 'creative', 'atomic', 'before', 'divergent-union-explore',
    'Generating multiple possible solutions.',
    'Resist tunnel vision on a single channel: fan outward across every record to surface all distinct clinical connections around a focal patient.'],
  [54, 'convergent-reasoning', 'Convergent reasoning', 'creative', 'atomic', 'inside', 'set-intersection',
    'Narrowing possibilities towards a solution.',
    'After scanning widely, converge strictly on the patients where multiple independent clinical criteria intersect.'],
  [55, 'synthetic-reasoning', 'Synthetic reasoning', 'creative', 'composite', 'inside', 'independent-corroboration',
    'Integrating separate ideas into a coherent whole.',
    'Weave separate findings from vitals, labs, and imaging together to see which patients are corroborated across the whole picture.'],
  [56, 'dialectical-reasoning', 'Dialectical reasoning', 'creative', 'composite', 'after', 'dialectical-synthesis',
    'Developing understanding through conflicting perspectives.',
    'In post-trauma reviews, reconcile Thesis and Antithesis by spotting patients whose clinical role flips between opposing units.'],
  [57, 'first-principles', 'First-principles reasoning', 'creative', 'composite', 'inside', 'hierarchical-rank',
    'Reconstructing understanding from foundational principles.',
    'Strip away downstream noise and locate the foundational initiating cases that have no upstream cause above them.'],
  [58, 'lateral-reasoning', 'Lateral reasoning', 'creative', 'composite', 'before', 'spatial-bay-adjacency',
    'Discovering solutions through unconventional perspectives.',
    'Sometimes the answer is not in the lab value alone—look laterally at the physical bay layout and neighboring stretches.'],
  [59, 'generative-reasoning', 'Generative reasoning', 'creative', 'composite', 'inside', 'combinatorial-pair',
    'Creating novel models, explanations or possibilities.',
    'Synthesize fresh candidate sets by mapping cross-unit combinations that no single department saw on its own.'],
  [60, 'decompositional-reasoning', 'Decompositional reasoning', 'creative', 'atomic', 'after', 'hidden-bridge',
    'Breaking complex phenomena into intelligible components.',
    'Break a tangled two-stage failure into its component links to expose the exact middle connector holding it together.'],
  [61, 'emergent-reasoning', 'Emergent reasoning', 'creative', 'composite', 'inside', 'recursive-reach',
    'Understanding how collective interactions produce novel properties.',
    'Cascading ward overload emerges from interactions between beds—trace multi-hop reachability to see who gets swept up next.'],

  // 7. Social, psychological and ethical reasoning (62–70)
  [62, 'interpersonal-reasoning', 'Interpersonal reasoning', 'social-ethical', 'atomic', 'after', 'hidden-bridge',
    'Understanding relationships between people.',
    'In family conferences, map who bridges communication between the care team and relatives so nobody is left out of critical news.'],
  [63, 'mentalistic-reasoning', 'Mentalistic reasoning', 'social-ethical', 'composite', 'after', 'mentalistic-belief-gap',
    'Inferring other people\'s mental states.',
    'Before walking into a family room, track who received only an early update (01:00–03:00) and still holds an outdated belief without a 05:00–06:00 follow-up.'],
  [64, 'motivational-reasoning', 'Motivational reasoning', 'social-ethical', 'composite', 'after', 'set-exclusion',
    'Identifying the motives underlying behaviour.',
    'Separate conflicted or pressured voices from neutral advocates when determining who should speak for an incapacitated patient.'],
  [65, 'moral-reasoning', 'Moral reasoning', 'social-ethical', 'composite', 'before', 'moral-vulnerability-priority',
    'Determining what is right or wrong.',
    'Moral duty of care prioritizes high-acuity patients who lack any initiating voice or advocacy elsewhere on the board.'],
  [66, 'ethical-reasoning', 'Ethical reasoning', 'social-ethical', 'composite', 'after', 'ethical-duty-conflict',
    'Resolving conflicts between competing values and duties.',
    'Medical ethics balances beneficence (acting on high severity) against autonomy—honoring valid advance directives even under urgent pressure.'],
  [67, 'pragmatic-reasoning', 'Pragmatic reasoning', 'social-ethical', 'atomic', 'before', 'conditional-gate',
    'Evaluating practical implications within context.',
    'Real-world trauma medicine adapts to what is actually available right now—pick the protocol branch that fits current ward reality.'],
  [68, 'contextual-reasoning', 'Contextual reasoning', 'social-ethical', 'atomic', 'before', 'dual-site-scope',
    'Interpreting information relative to surrounding circumstances.',
    'An identical vital sign means something different in the Ambulance Ramp versus the ICU—always scope your judgment to the right unit.'],
  [69, 'narrative-reasoning', 'Narrative reasoning', 'social-ethical', 'composite', 'after', 'temporal-strict-cascade',
    'Integrating events into coherent explanatory sequences.',
    'Families and coroners need a coherent chronological story: link earlier events strictly forward into what happened afterward.'],
  [70, 'perspectival-reasoning', 'Perspectival reasoning', 'social-ethical', 'composite', 'after', 'game-theoretic-triage',
    'Evaluating phenomena from multiple viewpoints.',
    'View the ward from the receiving team\'s perspective first, then step back to see which patients still lack an advocate from yours.'],

  // 8. Metacognitive and epistemological reasoning (71–80)
  [71, 'metacognitive-reasoning', 'Metacognitive reasoning', 'metacognitive', 'meta', 'inside', 'meta-method-choice',
    'Reasoning about one\'s own reasoning processes.',
    'Pause before solving: inspect the board to decide which reasoning method applies here, rather than blindly applying your last habit.'],
  [72, 'epistemic-reasoning', 'Epistemic reasoning', 'metacognitive', 'meta', 'inside', 'tainted-source-filter',
    'Evaluating what can be known and how.',
    'Ask how you know what you think you know—quarantine compromised or mislabeled samples before trusting any conclusion built on them.'],
  [73, 'reflective-reasoning', 'Reflective reasoning', 'metacognitive', 'meta', 'after', 'non-monotonic-revision',
    'Re-evaluating previous conclusions and experiences.',
    'Great clinicians regularly audit their initial impression against newer shift data and willingly revise when facts shift.'],
  [74, 'critical-reasoning', 'Critical reasoning', 'metacognitive', 'meta', 'inside', 'tainted-source-filter',
    'Identifying weaknesses in arguments and assumptions.',
    'Question the weakest link in the clinical chart: discard conclusions that depend on an unreliable channel.'],
  [75, 'falsification-based', 'Falsification-based reasoning', 'metacognitive', 'meta', 'inside', 'set-exclusion',
    'Actively seeking evidence that disproves a hypothesis.',
    'Instead of looking for signs that flatter your favorite diagnosis, hunt for the single finding that falsifies it.'],
  [76, 'heuristic-reasoning', 'Heuristic reasoning', 'metacognitive', 'meta', 'before', 'fast-frugal-heuristic',
    'Using simplified rules to reach efficient judgements.',
    'Under mass-casualty overload, a crisp fast-and-frugal rule (check the 1-minute quick win first, else jump to the +6 emergency) saves precious seconds.'],
  [77, 'non-monotonic-reasoning', 'Non-monotonic reasoning', 'metacognitive', 'meta', 'inside', 'non-monotonic-revision',
    'Withdrawing previous conclusions when new evidence emerges.',
    'New clinical facts can legitimately overturn earlier conclusions—withdraw patients cleared by later records rather than clinging to first impressions.'],
  [78, 'ontological-reasoning', 'Ontological reasoning', 'metacognitive', 'meta', 'after', 'higher-order-relation',
    'Examining the fundamental nature and categories of entities.',
    'Distinguish clearly between categories of clinical records (timing vs unit vs authority) so you never mix incompatible concepts.'],
  [79, 'analogical-abstraction', 'Analogical abstraction', 'metacognitive', 'meta', 'inside', 'analogical-role-match',
    'Extracting generalisable principles from structurally similar cases.',
    'Abstract the shared temporal-severity pattern across two different units to build transferable judgment that works in brand-new crises.'],
  [80, 'integrative-reasoning', 'Integrative reasoning', 'metacognitive', 'meta', 'inside', 'integrative-capstone',
    'Coordinating multiple reasoning processes within a unified intellectual operation.',
    'Mastery means orchestrating unit framing, quantitative severity filtering, and late-evidence elimination inside one calm clinical call.'],
];

export const REASONING_TYPE_LIST = Object.freeze(
  RAW_TAXONOMY.map(
    ([number, id, name, familyId, level, phase, engineId, coreOperation, doctorLesson]) => {
      const family = FAMILY_BY_ID[familyId];
      const levelMeta = REASONING_LEVELS[level];
      return Object.freeze({
        number,
        id,
        name,
        shortName: name.replace(/ reasoning$/i, ''),
        familyId,
        familyNumber: family.number,
        familyName: family.name,
        familyShort: family.shortName,
        level,
        levelLabel: levelMeta.label,
        levelFull: levelMeta.fullLabel,
        phase,
        engineId,
        summary: coreOperation,
        coreOperation,
        doctorLesson,
      });
    }
  )
);

export const REASONING_TYPES = Object.freeze(
  Object.fromEntries(REASONING_TYPE_LIST.map((r) => [r.id, r]))
);

export const PHASE_ORDER = Object.freeze(['before', 'inside', 'after']);
export const TOTAL_REASONING_TYPES = REASONING_TYPE_LIST.length; // 80

export function getReasoningType(id) {
  return REASONING_TYPES[id] || REASONING_TYPE_LIST[0];
}

export function getClinicalPhase(id) {
  return CLINICAL_PHASES[id] || CLINICAL_PHASES.inside;
}

export function getReasoningTypesByFamily(familyId) {
  return REASONING_TYPE_LIST.filter((r) => r.familyId === familyId);
}

export function getReasoningTypesByLevel(level) {
  return REASONING_TYPE_LIST.filter((r) => r.level === level);
}
