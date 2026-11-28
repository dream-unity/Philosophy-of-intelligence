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
  [4, 'hypothetico-deductive', 'Hypothetico-deductive reasoning', 'diagnostic', 'composite', 'inside', 'hypothetico-deductive-test',
    'Generating hypotheses and testing their implications.',
    'Form a provisional list from early clues, then check whether later test results confirm or refute each candidate.'],
  [5, 'causal-reasoning', 'Causal reasoning', 'diagnostic', 'atomic', 'inside', 'causal-direct-effect',
    'Identifying cause-and-effect relationships.',
    'Trauma triggers direct cause-and-effect chains: trace every immediate downstream patient driven by the focal index case.'],
  [6, 'root-cause-analysis', 'Root-cause analysis', 'diagnostic', 'composite', 'after', 'root-cause-earliest-driver',
    'Identifying the underlying origin of a problem.',
    'During M&M review, stop treating late-shift surface symptoms and trace back into earlier hours to find who initiated the failure.'],
  [7, 'mechanistic-reasoning', 'Mechanistic reasoning', 'diagnostic', 'composite', 'inside', 'mechanistic-pathway',
    'Understanding how something produces an outcome.',
    'Mechanism explains how step A drives step B inside one physiological compartment—following the exact intra-unit handoff reveals who is next.'],
  [8, 'forensic-reasoning', 'Forensic reasoning', 'diagnostic', 'composite', 'after', 'forensic-chain-reconstruction',
    'Reconstructing events from incomplete evidence.',
    'In post-mortem reconstruction, isolate the pre-incident window and trace every prior contact linked directly to the closing case.'],
  [9, 'evidential-reasoning', 'Evidential reasoning', 'diagnostic', 'meta', 'inside', 'independent-corroboration',
    'Evaluating the strength, relevance and reliability of evidence.',
    'One dramatic chart note can mislead. Reliable clinical conviction requires independent corroboration from separate lines of evidence.'],
  [10, 'bayesian-reasoning', 'Bayesian reasoning', 'diagnostic', 'composite', 'inside', 'bayesian-prior-posterior',
    'Updating probabilities as new information emerges.',
    'Start with your initial clinical prior, then update each patient\'s odds as new scans and bedside evidence arrive so stronger facts overturn first impressions.'],

  // 2. Logical and formal reasoning (11–20)
  [11, 'deductive-reasoning', 'Deductive reasoning', 'logical', 'atomic', 'before', 'direct-role',
    'Deriving logically necessary conclusions from premises.',
    'When a triage protocol defines a strict rule, deduction guarantees exactly who must be treated without leaving room for bias.'],
  [12, 'inductive-reasoning', 'Inductive reasoning', 'logical', 'atomic', 'before', 'inductive-generalization',
    'Deriving generalisations from observations.',
    'Observe which clinical pattern dominates early arrivals, generalize that shift trend, and apply it to the newest arriving patient.'],
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
    'Mapping a familiar physical system (like pinched hoses vs. empty tanks) onto bedside signs lets you recognize hidden crises fast.'],
  [22, 'anomalous-reasoning', 'Anomalous reasoning', 'relational', 'atomic', 'inside', 'anomaly-outlier',
    'Identifying departures from an expected pattern.',
    'When blood pressure falls, the heart should race—spotting the one bay whose pulse drops instead catches hidden spine or brain injury.'],
  [23, 'antinomic-reasoning', 'Antinomic reasoning', 'relational', 'atomic', 'after', 'antinomic-incompatible-tags',
    'Identifying mutually incompatible relationships.',
    'Two valid specialist orders can cancel or kill each other on the same body—catching that clash prevents catastrophic medication harm.'],
  [24, 'antithetical-reasoning', 'Antithetical reasoning', 'relational', 'atomic', 'before', 'antithetical-opposites',
    'Identifying opposing relationships.',
    'Inverting an anchor overdose across every vital axis (hot/cold, fast/slow, wide/pinpoint, rigid/limp) separates true mirror poisons from partial mimics.'],
  [25, 'higher-order-relational', 'Higher-order relational reasoning', 'relational', 'composite', 'inside', 'higher-order-relation',
    'Reasoning about relationships between relationships.',
    'Comparing how far each bay fell relative to its own starting baseline beats reading a single frozen snapshot in isolation.'],
  [26, 'cross-domain-reasoning', 'Cross-domain reasoning', 'relational', 'composite', 'after', 'cross-domain-transfer',
    'Transferring principles between different knowledge domains.',
    'Aviation sterile-cockpit rules transfer directly to trauma rooms: protect irreversible high-stakes moments from noisy interruptions.'],
  [27, 'abstract-reasoning', 'Abstract reasoning', 'relational', 'composite', 'inside', 'abstract-invariance',
    'Extracting underlying structures independently of their particular manifestations.',
    'Strip away medical job titles to map pure dependency arrows—clearing the one upstream bottleneck unblocks everyone waiting behind them.'],
  [28, 'hierarchical-reasoning', 'Hierarchical reasoning', 'relational', 'atomic', 'before', 'hierarchical-rank',
    'Understanding relationships across organisational levels.',
    'Command rank beats raw timestamps: a newer note from a junior resident never overrides an active order from the Trauma Chief.'],
  [29, 'spatial-reasoning', 'Spatial reasoning', 'relational', 'atomic', 'inside', 'spatial-grid-neighbors',
    'Manipulating spatial relationships mentally.',
    'Physical ward geometry matters under pressure: map true step distance across the 2×5 bay wall before committing scarce hoses or lines.'],
  [30, 'temporal-reasoning', 'Temporal reasoning', 'relational', 'atomic', 'before', 'temporal-earliest-latest',
    'Understanding relationships across time.',
    'Chain relative clock offsets carefully—"when found" never resets a stroke window that started hours earlier when last seen normal.'],
  [31, 'structural-reasoning', 'Structural reasoning', 'relational', 'composite', 'inside', 'structural-pivot',
    'Identifying how components collectively form an organised whole.',
    'Airway, Breathing, and Circulation form one load-bearing structure—cross-check all three pillars to spot bays collapsing on two fronts at once.'],
  [32, 'semantic-reasoning', 'Semantic reasoning', 'relational', 'atomic', 'after', 'semantic-role-polarity',
    'Inferring relationships between meanings and concepts.',
    'In allergy and consent readbacks, exact scope matters: distinguish the patient\'s own true immune reaction from a relative\'s history or mild upset stomach.'],

  // 4. Predictive and quantitative reasoning (33–41)
  [33, 'probabilistic-reasoning', 'Probabilistic reasoning', 'quantitative', 'atomic', 'before', 'bayesian-update',
    'Evaluating uncertain outcomes.',
    'Spend scarce antidotes on the biggest marginal survival jump (WITH minus WITHOUT)—not the highest final odds or lowest starting odds.'],
  [34, 'statistical-reasoning', 'Statistical reasoning', 'quantitative', 'composite', 'after', 'statistical-distribution-peak',
    'Drawing conclusions from distributions and data.',
    'One wild lab reading can be a squeezed-tube artifact—require a clean repeat outlier far outside normal bounds before calling hidden shock.'],
  [35, 'counterfactual-reasoning', 'Counterfactual reasoning', 'quantitative', 'composite', 'inside', 'counterfactual-sole-cause',
    'Determining what might have happened under different conditions.',
    'Project what would have happened without a tourniquet or early drug to measure which field action actually prevented lethal loss.'],
  [36, 'hypothetical-reasoning', 'Hypothetical reasoning', 'quantitative', 'atomic', 'before', 'hypothetical-swap-test',
    'Exploring possibilities without assuming their truth.',
    'Run a "what if this wall circuit drops?" stress test beforehand to see which bays have zero battery backup before the lights go out.'],
  [37, 'predictive-reasoning', 'Predictive reasoning', 'quantitative', 'atomic', 'before', 'temporal-strict-cascade',
    'Anticipating future outcomes.',
    'Identical current readings hide totally different futures—project each bay\'s 5-minute velocity one step forward to catch who crashes next.'],
  [38, 'prognostic-reasoning', 'Prognostic reasoning', 'quantitative', 'composite', 'after', 'prognostic-worsening-arc',
    'Estimating the future progression of a condition.',
    'Single-organ dips often recover; cross-link 24-hour brain and kidney arcs to spot simultaneous multi-organ collapse early.'],
  [39, 'extrapolative-reasoning', 'Extrapolative reasoning', 'quantitative', 'atomic', 'before', 'extrapolative-trend-slope',
    'Extending existing patterns beyond observed information.',
    'Divide remaining supply by burn rate (Liters ÷ L/min)—a large tank burning fast runs dry sooner than a small tank sipping oxygen slowly.'],
  [40, 'proportional-reasoning', 'Proportional reasoning', 'quantitative', 'atomic', 'before', 'proportional-ratio',
    'Understanding relative magnitudes and ratios.',
    'Compare blood lost against each body\'s own total supply (Lost ÷ Total): 600 mL is a lethal fraction in a child while 1,200 mL is less in a large adult.'],
  [41, 'mathematical-reasoning', 'Mathematical reasoning', 'quantitative', 'composite', 'inside', 'net-balance-math',
    'Deriving conclusions through quantitative and formal relationships.',
    'Summing exact Early Warning points across vitals turns vague gut impressions into an objective escalation threshold.'],

  // 5. Strategic and systemic reasoning (42–52)
  [42, 'systems-reasoning', 'Systems reasoning', 'strategic', 'composite', 'inside', 'systems-feedback-loop',
    'Understanding interacting components and feedback loops.',
    'Spot positive runaway spirals—like cold body temperature blocking clots and speeding bleeding—before they accelerate past recovery.'],
  [43, 'strategic-reasoning', 'Strategic reasoning', 'strategic', 'composite', 'before', 'strategic-bottleneck-reserve',
    'Selecting actions in anticipation of future developments.',
    'Look two moves ahead: stabilizing a fast 2-minute airway before a slower bleed lets one surgeon save BOTH lives in sequence.'],
  [44, 'game-theoretic-reasoning', 'Game-theoretic reasoning', 'strategic', 'composite', 'before', 'game-theoretic-triage',
    'Accounting for the decisions of other rational agents.',
    'Predict what another hospital or trauma team will rationally grab first, then deploy your team to cover the critical bays they leave behind.'],
  [45, 'adversarial-reasoning', 'Adversarial reasoning', 'strategic', 'composite', 'after', 'adversarial-worst-case',
    'Anticipating and evaluating opposing strategies.',
    'Assume systems can be gamed or cut off: audit raw bedside evidence against digital claims and secure bays with zero fallback first.'],
  [46, 'optimisation-reasoning', 'Optimisation reasoning', 'strategic', 'composite', 'before', 'time-budget-optimisation',
    'Identifying the best solution under given constraints.',
    'When the clock or evac window is fixed, fit the combination of repairs that saves the maximum number of lives inside your hard minute budget.'],
  [47, 'instrumental-reasoning', 'Instrumental reasoning', 'strategic', 'atomic', 'inside', 'instrumental-means-end',
    'Identifying effective means to achieve an objective.',
    'Match the exact mechanism of your tool—like a defibrillator shock or chest drain—to the specific physical failure it actually fixes.'],
  [48, 'second-order-reasoning', 'Second-order reasoning', 'strategic', 'composite', 'inside', 'second-order-consequence',
    'Anticipating the consequences of consequences.',
    'Trace one step past the first effect: a drug that eases chest pain can collide with yesterday\'s pill to trigger a fatal blood-pressure plunge.'],
  [49, 'risk-based-reasoning', 'Risk-based reasoning', 'strategic', 'composite', 'before', 'risk-expected-harm',
    'Evaluating potential harm, uncertainty and reward.',
    'Multiply Chance × Severity to rank true expected harm—ignoring both harmless 90% rashes and vanishingly rare threats.'],
  [50, 'decision-theoretic', 'Decision-theoretic reasoning', 'strategic', 'composite', 'before', 'decision-net-utility',
    'Selecting actions according to probabilities, preferences and consequences.',
    'True surgical utility aligns real survival lift WITH the patient\'s own stated wishes—never forcing futile or refused operations.'],
  [51, 'algorithmic-reasoning', 'Algorithmic reasoning', 'strategic', 'atomic', 'inside', 'algorithmic-flowchart',
    'Constructing systematic procedures to solve problems.',
    'Execute mass-casualty decision trees strictly in order (Step 1 → Step 2 → Step 3) so panic never skips an early override gate.'],
  [52, 'reverse-reasoning', 'Reverse reasoning', 'strategic', 'atomic', 'after', 'reverse-origin',
    'Working backwards from a desired outcome.',
    'Subtract remaining prep steps backward from a hard deadline—a later start time wins whenever slow early steps are already finished.'],

  // 6. Creative and synthetic reasoning (53–61)
  [53, 'divergent-reasoning', 'Divergent reasoning', 'creative', 'atomic', 'before', 'divergent-union-explore',
    'Generating multiple possible solutions.',
    'Resist tunnel vision on one guess: keep every dangerous mimic open until targeted tests actually rule them out.'],
  [54, 'convergent-reasoning', 'Convergent reasoning', 'creative', 'atomic', 'inside', 'convergent-funnel',
    'Narrowing possibilities towards a solution.',
    'Pass all bays through successive independent filters until only the patients surviving every single gate remain.'],
  [55, 'synthetic-reasoning', 'Synthetic reasoning', 'creative', 'composite', 'inside', 'synthetic-triangulation',
    'Integrating separate ideas into a coherent whole.',
    'No single desk sees a silent crisis alone—stitching ambulance, pharmacy, nurse, and exam fragments together exposes the full picture.'],
  [56, 'dialectical-reasoning', 'Dialectical reasoning', 'creative', 'composite', 'after', 'dialectical-synthesis',
    'Developing understanding through conflicting perspectives.',
    'When two specialists give opposite valid warnings (cut now vs. never put under full anesthesia), find the hybrid approach honoring both.'],
  [57, 'first-principles', 'First-principles reasoning', 'creative', 'composite', 'inside', 'first-principles-root-weight',
    'Reconstructing understanding from foundational principles.',
    'Break oxygen delivery down to basic physics (Red-Cell Trucks × Clip % × Heart Pump) so a deceptive 99% finger clip never hides starvation.'],
  [58, 'lateral-reasoning', 'Lateral reasoning', 'creative', 'composite', 'before', 'spatial-bay-adjacency',
    'Discovering solutions through unconventional perspectives.',
    'Flip your instinct in a loud trauma bay: screaming proves an open windpipe, while total silence often signals a completely blocked airway.'],
  [59, 'generative-reasoning', 'Generative reasoning', 'creative', 'composite', 'inside', 'combinatorial-pair',
    'Creating novel models, explanations or possibilities.',
    'When standard equipment runs out, match the core physical job—like pressure, splint, or seal—to safe functional equivalents on hand.'],
  [60, 'decompositional-reasoning', 'Decompositional reasoning', 'creative', 'atomic', 'after', 'decompositional-split',
    'Breaking complex phenomena into intelligible components.',
    'Unpack messy multi-injury lists piece by piece so gruesome non-fatal scrapes never distract you from one untreated lethal tear.'],
  [61, 'emergent-reasoning', 'Emergent reasoning', 'creative', 'composite', 'inside', 'emergent-cluster-threshold',
    'Understanding how collective interactions produce novel properties.',
    'Two individually safe medications or minor events can collide on the same patient to create a lethal reaction neither causes alone.'],

  // 7. Social, psychological and ethical reasoning (62–70)
  [62, 'interpersonal-reasoning', 'Interpersonal reasoning', 'social-ethical', 'atomic', 'after', 'interpersonal-liaison-hub',
    'Understanding relationships between people.',
    'Compare how a patient speaks with a controlling companion versus alone—sudden story shifts signal coercion and the need for private safety.'],
  [63, 'mentalistic-reasoning', 'Mentalistic reasoning', 'social-ethical', 'composite', 'after', 'mentalistic-belief-gap',
    'Inferring other people\'s mental states.',
    'Track each family\'s last update timestamp against the latest OR event so you immediately spot who is still operating on outdated news.'],
  [64, 'motivational-reasoning', 'Motivational reasoning', 'social-ethical', 'composite', 'after', 'motivational-pressure-check',
    'Identifying the motives underlying behaviour.',
    'When a crashing patient tries to leave against medical advice, uncover the hidden practical fear—like childcare or bills—so you can solve it and keep them safe.'],
  [65, 'moral-reasoning', 'Moral reasoning', 'social-ethical', 'composite', 'before', 'moral-vulnerability-priority',
    'Determining what is right or wrong.',
    'Compare prescribed versus delivered doses honestly—medical integrity demands immediate reversal and transparent disclosure, never quiet cover-ups.'],
  [66, 'ethical-reasoning', 'Ethical reasoning', 'social-ethical', 'composite', 'after', 'ethical-duty-conflict',
    'Resolving conflicts between competing values and duties.',
    'Patient autonomy holds even under stress: a verified signed DNR or refusal overrides shouting relatives while freeing your team for consenting patients.'],
  [67, 'pragmatic-reasoning', 'Pragmatic reasoning', 'social-ethical', 'atomic', 'before', 'pragmatic-feasibility',
    'Evaluating practical implications within context.',
    'A brilliant discharge plan fails if the patient lacks a fridge, electricity, or a step-free home—always match care requirements to real-world resources.'],
  [68, 'contextual-reasoning', 'Contextual reasoning', 'social-ethical', 'atomic', 'before', 'dual-site-scope',
    'Interpreting information relative to surrounding circumstances.',
    'An identical 102/64 monitor is healthy for a distance runner yet signals severe hidden shock in a patient whose normal baseline is 168/98.'],
  [69, 'narrative-reasoning', 'Narrative reasoning', 'social-ethical', 'composite', 'after', 'narrative-chronological-arc',
    'Integrating events into coherent explanatory sequences.',
    'Check claimed timelines against biological healing clocks—a yellow-green bruise contradicts a 20-minute fall yet matches an honest 6-day-old crash.'],
  [70, 'perspectival-reasoning', 'Perspectival reasoning', 'social-ethical', 'composite', 'after', 'perspectival-flip-view',
    'Evaluating phenomena from multiple viewpoints.',
    'Align all three voices—patient\'s written wishes, family spokesperson, and surgical recovery odds—before clearing major operations.'],

  // 8. Metacognitive and epistemological reasoning (71–80)
  [71, 'metacognitive-reasoning', 'Metacognitive reasoning', 'metacognitive', 'meta', 'inside', 'meta-method-choice',
    'Reasoning about one\'s own reasoning processes.',
    'Audit your own first impressions: early comforting tags like "just anxiety" or "drunk" blind teams to crashing objective vitals unless challenged.'],
  [72, 'epistemic-reasoning', 'Epistemic reasoning', 'metacognitive', 'meta', 'inside', 'tainted-source-filter',
    'Evaluating what can be known and how.',
    'Never confuse "no bad numbers" with "proven safe"—an unchecked patient from a high-speed crash has zero evidence of stability.'],
  [73, 'reflective-reasoning', 'Reflective reasoning', 'metacognitive', 'meta', 'after', 'reflective-bias-check',
    'Re-evaluating previous conclusions and experiences.',
    'Close every safety loop with real clock math: compare drug times against follow-up re-checks to catch overdue monitoring before patients silently slip.'],
  [74, 'critical-reasoning', 'Critical reasoning', 'metacognitive', 'meta', 'inside', 'critical-weakest-link',
    'Identifying weaknesses in arguments and assumptions.',
    'Dismantle the "normal BP = safe" myth: young bodies hold blood pressure up while bleeding internally until Shock Index (HR > Top BP) betrays them.'],
  [75, 'falsification-based', 'Falsification-based reasoning', 'metacognitive', 'meta', 'inside', 'falsification-counterexample',
    'Actively seeking evidence that disproves a hypothesis.',
    'Instead of admiring calm bays that confirm "everyone can wait," hunt actively for the single broken oxygen, BP, or alertness bound that disproves it.'],
  [76, 'heuristic-reasoning', 'Heuristic reasoning', 'metacognitive', 'meta', 'before', 'fast-frugal-heuristic',
    'Using simplified rules to reach efficient judgements.',
    'Fast triage shortcuts save time only when you know their fatal exceptions—catching a stiff neck or non-fading rash even when another bay has a higher fever.'],
  [77, 'non-monotonic-reasoning', 'Non-monotonic reasoning', 'metacognitive', 'meta', 'inside', 'non-monotonic-revision',
    'Withdrawing previous conclusions when new evidence emerges.',
    'Stay loyal to the newest verified scan, not your earliest guess—immediately withdraw cleared bays and pivot when fresh evidence flips the board.'],
  [78, 'ontological-reasoning', 'Ontological reasoning', 'metacognitive', 'meta', 'after', 'ontological-category-partition',
    'Examining the fundamental nature and categories of entities.',
    'Classify the true category of crisis first—physical structural tear, body-chemistry imbalance, or legal dispute—so surgeons only enter mechanical emergencies.'],
  [79, 'analogical-abstraction', 'Analogical abstraction', 'metacognitive', 'meta', 'inside', 'analogical-meta-schema',
    'Extracting generalisable principles from structurally similar cases.',
    'Recognize one deep structural law across different organs: swelling trapped inside any rigid shell (skull, heart sac, tight muscle sleeve, eye socket) crushes blood flow.'],
  [80, 'integrative-reasoning', 'Integrative reasoning', 'metacognitive', 'meta', 'inside', 'integrative-capstone',
    'Coordinating multiple reasoning processes within a unified intellectual operation.',
    'Chief-level trauma mastery fuses non-monotonic scan updates, shock-index ratios, and verified patient autonomy into one decisive clinical call.'],
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
