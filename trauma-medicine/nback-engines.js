// Clinical N-Back ("Climb the Ladder") 80-Pattern Reasoning Engine — Part 1 (Types #1–#41)
// Families 1–4: Diagnostic & Investigative (#1–10), Logical & Formal (#11–20),
// Relational & Abstract (#21–32), Predictive & Quantitative (#33–41).
// Every engine generates an authentic, zero-jargon 3-patient trauma medicine briefing
// solvable in 5–12 seconds with exact target (0 | 1 | 2 | 'clash'), clinical proof, and rival.

import { shuffle } from './case-layout.js';

export const NBACK_DOMAINS = Object.freeze([
  { id: 'airway', phase: 'before', label: 'Airway & Breathing', short: 'Airway' },
  { id: 'triage', phase: 'before', label: 'Disaster Triage & Beds', short: 'Triage' },
  { id: 'hemorrhage', phase: 'inside', label: 'Massive Hemorrhage', short: 'Bleed' },
  { id: 'shock', phase: 'inside', label: 'Shock & Code Telemetry', short: 'Shock' },
  { id: 'neuro-tox', phase: 'inside', label: 'Neuro & Tox Emergency', short: 'Neuro/Tox' },
  { id: 'family-ethics', phase: 'after', label: 'Family Talks & Bioethics', short: 'Ethics' },
  { id: 'autopsy-mm', phase: 'after', label: 'M&M Audit & Autopsy', short: 'Autopsy/M&M' },
]);

export const NBACK_DOMAIN_BY_ID = Object.freeze(
  Object.fromEntries(NBACK_DOMAINS.map((d) => [d.id, d]))
);

export function pickDomainForPhase(rng, phase, preferredDomainId = null) {
  if (preferredDomainId && NBACK_DOMAIN_BY_ID[preferredDomainId]?.phase === phase) {
    return NBACK_DOMAIN_BY_ID[preferredDomainId];
  }
  const pool = NBACK_DOMAINS.filter((d) => d.phase === phase);
  return pool[Math.floor(rng() * pool.length)] || NBACK_DOMAINS[0];
}

// Helper: unpack target patient W and two distinct distractors D1, D2
export function splitTriad(names, winIdx, rng) {
  const others = [0, 1, 2].filter((i) => i !== winIdx);
  if (rng() < 0.5) others.reverse();
  return {
    W: names[winIdx],
    D1: names[others[0]],
    D2: names[others[1]],
    winIdx,
    d1Idx: others[0],
    d2Idx: others[1],
  };
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function makeShuffledLines(rng, arr, keepOrder = false) {
  return keepOrder ? arr.slice() : shuffle(rng, arr);
}

// =========================================================================
// PART 1: ENGINES #1 THROUGH #41
// =========================================================================
export const NBACK_ENGINES_PART1 = {
  // ── 1. DIAGNOSTIC & INVESTIGATIVE REASONING (#1–#10) ────────────────────

  // #1 Differential diagnosis (Composite)
  'differential-diagnosis': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    const v = pick(rng, [
      {
        dx: 'Cardiac Tamponade (muffled heart + distended neck veins + falling BP)',
        w: `${W}: BP 76/48, distended neck veins, muffled heart tones on stethoscope.`,
        d1: `${D1}: BP 82/50, flat neck veins, clear breath sounds—fits blood loss, not tamponade.`,
        d2: `${D2}: BP 126/78, distended neck veins, crisp heart tones—no shock.`,
        proof: `Only ${W} meets all three Beck's triad signs of cardiac tamponade.`,
        rival: `${D1} has low BP but flat neck veins, pointing to hemorrhage rather than tamponade.`,
      },
      {
        dx: 'Tension Pneumothorax (absent lung sound + shifted trachea + hypoxia)',
        w: `${W}: SpO2 81%, silent right chest, trachea deviated to the left.`,
        d1: `${D1}: SpO2 84%, crackles in both lungs, midline trachea.`,
        d2: `${D2}: SpO2 97%, reduced right breath sound, midline trachea.`,
        proof: `Only ${W} combines silent hemithorax, tracheal shift, and severe hypoxia.`,
        rival: `${D1} is hypoxic, but bilateral crackles and midline trachea rule out tension pneumothorax.`,
      },
    ]);
    return {
      directive: `Differential call: which patient matches ${v.dx}?`,
      lines: makeShuffledLines(rng, [v.w, v.d1, v.d2]),
      verdict: winIdx,
      proof: v.proof,
      rival: v.rival,
      isClash: false,
    };
  },

  // #2 Abductive reasoning (Atomic)
  'abductive-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    const v = pick(rng, [
      {
        q: 'One patient has occult internal abdominal bleeding—who best explains ALL bedside clues?',
        w: `${W}: Bruised seatbelt mark, rising pulse (132), and steadily dropping hemoglobin.`,
        d1: `${D1}: Isolated wrist fracture, steady pulse (84), stable hemoglobin.`,
        d2: `${D2}: Fever 39.2°C, productive cough, normal abdominal exam.`,
        proof: `${W}'s seatbelt trauma, tachycardia, and falling hemoglobin converge best on hidden internal bleeding.`,
        rival: `${D2} looks ill, but fever and cough point to infection rather than occult hemorrhage.`,
      },
      {
        q: 'A single carbon monoxide exposure explains cherry-red distress—whose findings fit best?',
        w: `${W}: Pulled from garage fire, severe headache, pulse ox reads 99% despite gasping confusion.`,
        d1: `${D1}: Sprained ankle outdoors, clear speech, normal breathing.`,
        d2: `${D2}: Known asthma, wheezing loudly, pulse ox drops cleanly to 86%.`,
        proof: `Carbon monoxide fools standard pulse oximeters into reading ~99% while causing hypoxic confusion—matching ${W}.`,
        rival: `${D2}'s low pulse ox and wheezing fit asthma rather than carbon monoxide masking.`,
      },
    ]);
    return {
      directive: v.q,
      lines: makeShuffledLines(rng, [v.w, v.d1, v.d2]),
      verdict: winIdx,
      proof: v.proof,
      rival: v.rival,
      isClash: false,
    };
  },

  // #3 Eliminative reasoning (Atomic)
  'eliminative-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Emergency OR clearance: eliminate any patient ruled out by STAT labs, and wheel the sole remaining candidate to surgery.`,
      lines: makeShuffledLines(rng, [
        `${D1}'s FAST ultrasound came back completely dry—internal bleeding ruled out.`,
        `${D2}'s CT angiogram showed intact aorta and stopped bleeding—surgery cancelled.`,
        `${W}'s abdomen is rigid with free pelvic fluid and BP falling to 80/46.`,
      ]),
      verdict: winIdx,
      proof: `Ruling out ${D1} (dry FAST) and ${D2} (intact CT) leaves ${W} as the sole surgical emergency.`,
      rival: `${D1} was already eliminated by the dry FAST ultrasound.`,
      isClash: false,
    };
  },

  // #4 Hypothetico-deductive reasoning (Composite)
  'hypothetico-deductive': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Hypothesis: "If a patient has true septic shock, a 2L fluid bolus will STILL leave BP < 90 and lactate > 4." Who confirms this hypothesis?`,
      lines: makeShuffledLines(rng, [
        `Post-bolus ${W}: BP stays 82/46 and repeat lactate climbs to 5.4 mmol/L.`,
        `Post-bolus ${D1}: BP rebounds cleanly to 118/74 and lactate drops to 1.8 mmol/L.`,
        `Post-bolus ${D2}: BP stays 86/52, but lactate is normal at 1.2 mmol/L.`,
      ]),
      verdict: winIdx,
      proof: `Only ${W} satisfies both testable predictions after fluids (BP < 90 AND lactate > 4).`,
      rival: `${D2} stayed hypotensive, but normal lactate (1.2) fails the septic shock prediction.`,
      isClash: false,
    };
  },

  // #5 Causal reasoning (Atomic)
  'causal-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Trace the direct clinical cause: which patient's arterial tear is causing the ward's immediate O-Negative blood shortage?`,
      lines: makeShuffledLines(rng, [
        `${W}'s ruptured femoral artery triggered the 6-unit massive transfusion protocol.`,
        `${D1}'s IV line slowed only after the blood bank diverted staff to the massive transfusion.`,
        `${D2}'s routine lab draw was postponed as a downstream consequence of the blood bank diversion.`,
      ]),
      verdict: winIdx,
      proof: `${W}'s femoral artery bleed is the direct upstream cause driving both ${D1}'s and ${D2}'s delays.`,
      rival: `${D1}'s delay is an effect of the blood bank diversion, not its cause.`,
      isClash: false,
    };
  },

  // #6 Root-cause analysis (Composite)
  'root-cause-analysis': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `M&M Root-Cause Audit: three charts failed tonight. Trace back to the SINGLE patient whose 01:00 intake error triggered the rest.`,
      lines: makeShuffledLines(rng, [
        `01:00 Intake: ${W}'s wristband allergy tag was left blank, misrouting the ward's drug cart.`,
        `01:25 Resus: ${D1}'s antibiotic arrived late because pharmacy froze the misrouted cart.`,
        `01:45 ICU: ${D2}'s transfer stalled waiting for ${D1}'s delayed antibiotic clearance.`,
      ], true),
      verdict: winIdx,
      proof: `Tracing backward from 01:45 → 01:25 → 01:00 pinpoints ${W}'s blank intake tag as the root cause.`,
      rival: `${D1}'s late antibiotic at 01:25 was a downstream symptom of the 01:00 intake error.`,
      isClash: false,
    };
  },

  // #7 Mechanistic reasoning (Composite)
  'mechanistic-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Physiology mechanism: trapped chest air raises intrathoracic pressure → pinches vena cava → blocks blood return to heart. Whose monitor shows this exact sequence?`,
      lines: makeShuffledLines(rng, [
        `${W}: Rising airway pressure (44 cmH2O) → bulging neck veins → sudden cardiac output collapse.`,
        `${D1}: Normal airway pressure (16 cmH2O) → brisk wrist bleeding → gradual BP drop.`,
        `${D2}: Normal airway pressure (18 cmH2O) → low blood sugar (42 mg/dL) → sweating and tremor.`,
      ]),
      verdict: winIdx,
      proof: `${W} exhibits the exact mechanical pressure-to-preload-collapse pathway.`,
      rival: `${D1} is losing blood volume directly, not suffering intrathoracic vena cava compression.`,
      isClash: false,
    };
  },

  // #8 Forensic reasoning (Composite — supports clash!)
  'forensic-reasoning': ({ rng, names, winIdx, allowClash }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    if (allowClash) {
      return {
        directive: `Forensic autopsy timeline: determine which casualty suffered fatal injury FIRST—or flag a Clinical Clash if the forensic reports are impossible.`,
        lines: makeShuffledLines(rng, [
          `Coroner clock: ${W}'s fatal injury occurred strictly BEFORE ${D1}'s.`,
          `Toxicology log: ${D1}'s fatal injury occurred strictly BEFORE ${D2}'s.`,
          `Scene reconstruct: ${D2}'s fatal injury occurred strictly BEFORE ${W}'s.`,
        ]),
        verdict: 'clash',
        proof: `Circular timeline (${W} < ${D1} < ${D2} < ${W}) is physically impossible—an irreducible 3-report clash.`,
        rival: `Every pair of reports looks valid alone, but all three together form a closed time loop.`,
        isClash: true,
      };
    }
    return {
      directive: `Autopsy reconstruction: from incomplete trauma clues, who sustained the EARLIEST fatal impact?`,
      lines: makeShuffledLines(rng, [
        `Clotting stage confirms ${W} was struck at least 20 minutes before ${D1}.`,
        `Scene glass fragments place ${D1}'s impact earlier than ${D2}'s arrival.`,
        `Core temperature drop is deepest in ${W} (33.8°C vs ${D1} 35.1°C and ${D2} 36.2°C).`,
      ]),
      verdict: winIdx,
      proof: `Both clotting order (${W} before ${D1} before ${D2}) and deepest cooling confirm ${W} was struck first.`,
      rival: `${D1} was struck before ${D2}, but after ${W}.`,
      isClash: false,
    };
  },

  // #9 Evidential reasoning (Meta)
  'evidential-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Evidence quality audit: ignore unverified rumors and act ONLY on the patient backed by confirmed objective diagnostics.`,
      lines: makeShuffledLines(rng, [
        `${W}: Arterial blood gas [Lab Confirmed] shows severe acidosis (pH 7.14) and O2 54 mmHg.`,
        `${D1}: Panicked bystander [Unverified] claims severe internal bleeding; nurse vitals normal.`,
        `${D2}: Faded ambulance fax [Unreadable] suggests possible chest pain; repeat ECG normal.`,
      ]),
      verdict: winIdx,
      proof: `${W} is backed by confirmed arterial blood gas evidence; ${D1} and ${D2} rely on weak or contradicted hearsay.`,
      rival: `${D1}'s dramatic bystander claim lacks objective confirmation and is contradicted by normal vitals.`,
      isClash: false,
    };
  },

  // #10 Bayesian reasoning (Composite)
  'bayesian-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Updated risk call: combine each patient's initial risk with their new STAT scan to treat the HIGHEST updated probability of aortic tear.`,
      lines: makeShuffledLines(rng, [
        `${W}: Moderate prior (30% risk) + STAT chest X-ray shows widened mediastinum (triples odds → ~75%).`,
        `${D1}: High prior (60% risk) + STAT CT angiogram completely normal (rules out tear → < 2%).`,
        `${D2}: Low prior (10% risk) + normal chest X-ray (lowers odds → ~4%).`,
      ]),
      verdict: winIdx,
      proof: `Updating prior odds with new test likelihood puts ${W} (~75%) far above ${D1} (ruled out by CT) and ${D2} (~4%).`,
      rival: `${D1} started with the highest prior (60%), but a normal CT angiogram collapses posterior risk below 2%.`,
      isClash: false,
    };
  },

  // ── 2. LOGICAL & FORMAL REASONING (#11–#20) ─────────────────────────────

  // #11 Deductive reasoning (Atomic — supports clash!)
  'deductive-reasoning': ({ rng, names, winIdx, allowClash }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    if (allowClash) {
      return {
        directive: `Strict Trauma Protocol: "ONLY patients with GCS ≤ 8 get immediate intubation." Identify who must be intubated—or flag a Clinical Clash.`,
        lines: makeShuffledLines(rng, [
          `Order log: ${W} must be intubated immediately, and ${W}'s GCS is 14.`,
          `${D1}'s GCS is 15 (awake and talking).`,
          `${D2}'s GCS is 13 (drowsy but protecting airway).`,
        ]),
        verdict: 'clash',
        proof: `The protocol forbids intubating GCS > 8, directly contradicting the order to intubate ${W} at GCS 14.`,
        rival: `Neither ${D1} nor ${D2} meets GCS ≤ 8, and ${W}'s order violates the governing rule.`,
        isClash: true,
      };
    }
    return {
      directive: `Strict Triage Rule: "Any patient with SpO2 < 88% AND pulse > 120 must go straight to Resus Bay 1." Who is logically required?`,
      lines: makeShuffledLines(rng, [
        `${W}: SpO2 83% and pulse 134 BPM.`,
        `${D1}: SpO2 85% and pulse 96 BPM.`,
        `${D2}: SpO2 94% and pulse 138 BPM.`,
      ]),
      verdict: winIdx,
      proof: `Only ${W} satisfies both mandatory premises (SpO2 < 88% AND pulse > 120).`,
      rival: `${D1} fails the pulse > 120 requirement; ${D2} fails the SpO2 < 88% requirement.`,
      isClash: false,
    };
  },

  // #12 Inductive reasoning (Atomic)
  'inductive-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Night-shift tox pattern: the first 4 overdose arrivals from Harbor Pier all had pinpoint pupils + slow breathing (< 8/min) and responded to Naloxone. Who matches this pattern?`,
      lines: makeShuffledLines(rng, [
        `${W} (arrived from Harbor Pier): pinpoint pupils, breathing 6/min.`,
        `${D1} (arrived from Harbor Pier): dilated pupils, breathing 26/min, agitated.`,
        `${D2} (arrived from Downtown): normal pupils, breathing 16/min, wrist cut.`,
      ]),
      verdict: winIdx,
      proof: `${W} matches the induced Harbor Pier opioid toxidrome (pinpoint pupils + respiratory rate 6/min).`,
      rival: `${D1} came from Harbor Pier too, but dilated pupils and rapid breathing break the opioid pattern.`,
      isClash: false,
    };
  },

  // #13 Syllogistic reasoning (Atomic)
  'syllogistic-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Categorical rule: "All inhalation burns require burn-unit intubation. No isolated limb burn is an inhalation burn." Who requires burn-unit intubation?`,
      lines: makeShuffledLines(rng, [
        `${W} suffered facial soot and singed nasal hairs—classified as an inhalation burn.`,
        `${D1} suffered a forearm scald—classified as an isolated limb burn.`,
        `${D2} suffered a shin flash burn—classified as an isolated limb burn.`,
      ]),
      verdict: winIdx,
      proof: `By syllogism (All inhalation burns → intubation; ${W} is an inhalation burn), ${W} requires intubation.`,
      rival: `${D1} and ${D2} belong to the excluded isolated limb burn category.`,
      isClash: false,
    };
  },

  // #14 Conditional reasoning (Atomic — supports clash!)
  'conditional-reasoning': ({ rng, names, winIdx, allowClash }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    if (allowClash) {
      return {
        directive: `Ward rule: "If a patient gets Heparin, surgery is delayed. If BP < 80, surgery CANNOT be delayed." Evaluate the orders or flag a Clinical Clash.`,
        lines: makeShuffledLines(rng, [
          `${W} has BP 72/40 AND was just given IV Heparin.`,
          `${D1} has BP 118/74 and received no Heparin.`,
          `${D2} has BP 122/78 and is waiting for X-ray.`,
        ]),
        verdict: 'clash',
        proof: `For ${W}, Heparin forces a surgical delay while BP < 80 forbids any delay—a direct conditional contradiction.`,
        rival: `Both conditionals fire simultaneously on ${W} with opposite mandatory outcomes.`,
        isClash: true,
      };
    }
    return {
      directive: `Protocol rule: "If a patient's potassium > 6.5, give IV Calcium immediately; otherwise monitor." Who gets IV Calcium?`,
      lines: makeShuffledLines(rng, [
        `Lab alert: ${W}'s STAT potassium is 7.1 mEq/L with peaked T-waves.`,
        `${D1}'s potassium is 4.4 mEq/L (normal range).`,
        `${D2}'s potassium is 6.1 mEq/L (elevated, but ≤ 6.5 threshold).`,
      ]),
      verdict: winIdx,
      proof: `Only ${W} crosses the strict potassium > 6.5 trigger for immediate IV Calcium.`,
      rival: `${D2} is elevated at 6.1, but does not meet the > 6.5 conditional trigger.`,
      isClash: false,
    };
  },

  // #15 Transitive reasoning (Atomic — supports classic Friend-or-Foe clash!)
  'transitive-reasoning': ({ rng, names, winIdx, allowClash }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    if (allowClash) {
      return {
        directive: `Triage ranking check: identify the #1 most urgent patient—or flag a Clinical Clash if the 3 rankings contradict each other.`,
        lines: makeShuffledLines(rng, [
          `${W}'s airway is closing faster than ${D1}'s.`,
          `${D1}'s airway is closing faster than ${D2}'s.`,
          `${D2}'s airway is closing faster than ${W}'s.`,
        ]),
        verdict: 'clash',
        proof: `Transitive cycle (${W} > ${D1} > ${D2} > ${W}) is an irreducible 3-statement contradiction.`,
        rival: `Every pair alone is consistent, but all 3 together make any ranking impossible.`,
        isClash: true,
      };
    }
    return {
      directive: `Triage priority chain: identify which patient ranks #1 MOST URGENT across all three handoff notes.`,
      lines: makeShuffledLines(rng, [
        `${D1}'s blood loss is faster than ${D2}'s.`,
        `${W}'s blood loss is faster than ${D1}'s.`,
        `${D2}'s blood loss is slower than ${W}'s.`,
      ]),
      verdict: winIdx,
      proof: `Chaining ${W} > ${D1} and ${D1} > ${D2} proves ${W} > ${D1} > ${D2}, so ${W} is #1 urgent.`,
      rival: `${D1} outranks ${D2}, but ranks behind ${W}.`,
      isClash: false,
    };
  },

  // #16 Disjunctive reasoning (Atomic)
  'disjunctive-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Lone ventilator call: "Either ${W} OR ${D1} has the collapsed lung needing the lone ventilator (not ${D2}, whose lungs are clear)." Use the X-ray to act.`,
      lines: makeShuffledLines(rng, [
        `Initial triage: Either ${W} or ${D1} needs the lone ventilator immediately.`,
        `Portable chest X-ray: ${D1}'s lungs are fully expanded—no collapse.`,
        `Oxygen check: ${D2} is breathing comfortably at 98% on room air.`,
      ]),
      verdict: winIdx,
      proof: `Disjunctive elimination rules out ${D1}, forcing ${W} as the ventilator patient.`,
      rival: `${D1} was in the initial pair, but the clear chest X-ray eliminates them.`,
      isClash: false,
    };
  },

  // #17 Contradiction-based reasoning (Atomic — classic high-clash!)
  'contradiction-based': ({ rng, names, winIdx, allowClash }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    // High probability of true clash unless specifically forced non-clash
    if (allowClash !== false) {
      const clashType = pick(rng, [
        [
          `${W} and ${D1} suffered identical blood loss.`,
          `${D1} and ${D2} suffered identical blood loss.`,
          `${W} lost strictly MORE blood than ${D2}.`,
        ],
        [
          `${W}'s blood pressure crashed earlier than ${D1}'s.`,
          `${D1}'s blood pressure crashed earlier than ${D2}'s.`,
          `${W} and ${D2} crashed at the exact same minute.`,
        ],
      ]);
      return {
        directive: `Chart consistency audit: identify the most critical patient—or flag a Clinical Clash if all three notes cannot be true together.`,
        lines: makeShuffledLines(rng, clashType),
        verdict: 'clash',
        proof: `Any two notes can hold, but all three together create an irreducible logical contradiction.`,
        rival: `No valid clinical ordering can satisfy all three statements simultaneously.`,
        isClash: true,
      };
    }
    return {
      directive: `Chart consistency audit: verify all three notes agree, then select the MOST critical patient.`,
      lines: makeShuffledLines(rng, [
        `${W}'s oxygen fell lower than ${D1}'s.`,
        `${D1} and ${D2} have identical oxygen levels.`,
        `${D2}'s oxygen is higher than ${W}'s.`,
      ]),
      verdict: winIdx,
      proof: `All three notes are mutually consistent (${W} < ${D1} = ${D2}), placing ${W} in worst hypoxia.`,
      rival: `${D1} and ${D2} are tied at a higher oxygen level than ${W}.`,
      isClash: false,
    };
  },

  // #18 Recursive reasoning (Composite)
  'recursive-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Stepwise escalation rule: start with each patient's base score, DOUBLE it once if bleeding, then DOUBLE again if BP < 90. Treat the highest final score.`,
      lines: makeShuffledLines(rng, [
        `${W}: Base 3 · Active bleeding (×2 → 6) · BP 78/44 < 90 (×2 → 12).`,
        `${D1}: Base 5 · Active bleeding (×2 → 10) · BP 114/72 (no 2nd doubling → 10).`,
        `${D2}: Base 4 · No bleeding · BP 84/50 < 90 (×2 → 8).`,
      ]),
      verdict: winIdx,
      proof: `Applying the doubling step recursively yields ${W} = 12, beating ${D1} = 10 and ${D2} = 8.`,
      rival: `${D1} had the highest base score (5), but missed the second recursive doubling.`,
      isClash: false,
    };
  },

  // #19 Combinatorial reasoning (Composite)
  'combinatorial-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `You have 1 Operating Room + 1 O-Neg Blood Pack (must pair 2 patients, 1 resource each). Who appears in EVERY valid resource assignment?`,
      lines: makeShuffledLines(rng, [
        `${W} needs BOTH the Operating Room OR O-Neg Blood—and is the ONLY patient who can use the OR safely now.`,
        `${D1} can ONLY use O-Neg Blood (not cleared for OR).`,
        `${D2} can ONLY use O-Neg Blood (not cleared for OR).`,
      ]),
      verdict: winIdx,
      proof: `Valid pairs are (${W}=OR, ${D1}=Blood) or (${W}=OR, ${D2}=Blood)—${W} is mandatory in every combination.`,
      rival: `${D1} and ${D2} can substitute for each other on blood, so neither is mandatory.`,
      isClash: false,
    };
  },

  // #20 Constraint-based reasoning (Composite — supports clash!)
  'constraint-based': ({ rng, names, winIdx, allowClash }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    if (allowClash) {
      return {
        directive: `Medevac flight clearance: body mass < 90 kg, NO active pneumothorax, AND airway secured. Who qualifies—or flag a Clinical Clash if NONE qualify?`,
        lines: makeShuffledLines(rng, [
          `${W}: 74 kg, airway secured, but has untreated tension pneumothorax.`,
          `${D1}: 108 kg (over limit), no pneumothorax, airway secured.`,
          `${D2}: 68 kg, no pneumothorax, airway NOT yet secured.`,
        ]),
        verdict: 'clash',
        proof: `Every patient violates at least one hard flight safety constraint—zero valid candidates (Clinical Clash).`,
        rival: `Each candidate fails a different mandatory flight rule.`,
        isClash: true,
      };
    }
    return {
      directive: `Medevac flight clearance: BP ≥ 90 for the 12-min hop, blood crossmatched, AND family consent signed. Who meets ALL 3?`,
      lines: makeShuffledLines(rng, [
        `${W}: BP 96/60, blood crossmatched, family consent signed.`,
        `${D1}: BP 72/40 (too unstable), blood crossmatched, consent signed.`,
        `${D2}: BP 108/68, blood crossmatched, awaiting family consent.`,
      ]),
      verdict: winIdx,
      proof: `Only ${W} satisfies all three simultaneous transfer constraints.`,
      rival: `${D2} has better BP than ${W}, but fails the signed consent constraint.`,
      isClash: false,
    };
  },

  // ── 3. RELATIONAL & ABSTRACT REASONING (#21–#32) ────────────────────────

  // #21 Analogical reasoning (Atomic)
  'analogical-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Clinical parallel: "Tourniquet : Arterial Bleed :: Needle Decompression : ?" Pick the patient whose crisis matches that exact structural relationship.`,
      lines: makeShuffledLines(rng, [
        `${W}: Trapped pleural air crushing the lung—relieved immediately by needle decompression.`,
        `${D1}: Low blood sugar—treated chemically with IV dextrose, not pressure release.`,
        `${D2}: Broken collarbone—immobilized in a sling for orthopedic healing.`,
      ]),
      verdict: winIdx,
      proof: `Just as a tourniquet mechanically stops arterial bleeding, needle decompression mechanically relieves ${W}'s trapped chest air.`,
      rival: `${D1}'s dextrose is a metabolic replacement rather than a mechanical decompression analogy.`,
      isClash: false,
    };
  },

  // #22 Anomalous reasoning (Atomic)
  'anomalous-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Physiology pattern break: normally, falling blood pressure triggers a FAST reflex pulse (> 110). Spot the patient breaking this rule (hidden neurogenic shock / Cushing reflex).`,
      lines: makeShuffledLines(rng, [
        `${W}: BP 78/46 with a paradoxically SLOW pulse of 48 BPM.`,
        `${D1}: BP 82/50 with expected fast pulse of 128 BPM.`,
        `${D2}: BP 86/54 with expected fast pulse of 122 BPM.`,
      ]),
      verdict: winIdx,
      proof: `${W} breaks the shock tachycardia pattern (BP 78/46 yet HR 48), signaling spinal or brainstem pathology.`,
      rival: `${D1} and ${D2} show the expected compensatory high pulse in shock.`,
      isClash: false,
    };
  },

  // #23 Antinomic reasoning (Atomic — high clash!)
  'antinomic-reasoning': ({ rng, names, winIdx, allowClash }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    if (allowClash) {
      return {
        directive: `Check all 3 charts for a mutually incompatible clinical impossibility—pick the red-flagged patient OR flag Clinical Clash if the board itself clashes.`,
        lines: makeShuffledLines(rng, [
          `${W}'s monitor logs BOTH "SpO2 99% room air, speaking full sentences" AND "Complete silent airway arrest" at 01:12.`,
          `${D1}: Steady SpO2 95%, alert, bruised ribs.`,
          `${D2}: SpO2 92%, mild wheeze, talking in short phrases.`,
        ]),
        verdict: 'clash',
        proof: `Speaking full sentences at 99% SpO2 is mutually incompatible with complete airway arrest at the same minute.`,
        rival: `This antinomy points to a mis-synced monitor or wrong-patient chart mix-up.`,
        isClash: true,
      };
    }
    return {
      directive: `Chart error audit: identify the SINGLE patient carrying two mutually incompatible clinical tags on the same timestamp.`,
      lines: makeShuffledLines(rng, [
        `${W} is tagged BOTH "Discharge home — Green Minor" AND "Active Code Blue — CPR in progress" at 01:15.`,
        `${D1} is tagged "Yellow Delayed" with stable vitals (BP 118/76).`,
        `${D2} is tagged "Red Immediate" with active arterial bleed (BP 76/44).`,
      ]),
      verdict: winIdx,
      proof: `${W} holds two mutually incompatible acuity tags simultaneously (Green Discharge vs Active CPR).`,
      rival: `${D2} is critically ill, but their Red tag and low BP are completely consistent.`,
      isClash: false,
    };
  },

  // #24 Antithetical reasoning (Atomic)
  'antithetical-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Opposing vital-sign profile: your reference heatstroke patient is HOT (40.5°C) + FAST pulse (138). Pick the patient showing the EXACT OPPOSITE extreme.`,
      lines: makeShuffledLines(rng, [
        `${W}: Severe hypothermia (31.8°C) + slow bradycardic pulse (44 BPM).`,
        `${D1}: Mild fever (38.4°C) + fast pulse (118 BPM).`,
        `${D2}: Normal temp (36.8°C) + normal pulse (76 BPM).`,
      ]),
      verdict: winIdx,
      proof: `${W} sits at the exact antithesis (cold + slow pulse) of the hot + fast reference profile.`,
      rival: `${D2} is normal/neutral rather than the opposing extreme.`,
      isClash: false,
    };
  },

  // #25 Higher-order relational reasoning (Composite)
  'higher-order-relational': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Compare the DROPS (not just current numbers): treat the patient whose blood pressure fell by the LARGEST gap over the last 10 minutes.`,
      lines: makeShuffledLines(rng, [
        `${W}: Fell from 138/84 down to 92/58 (a 46-point systolic collapse).`,
        `${D1}: Fell from 96/60 down to 88/54 (an 8-point systolic dip).`,
        `${D2}: Fell from 118/72 down to 104/66 (a 14-point systolic dip).`,
      ]),
      verdict: winIdx,
      proof: `Comparing the rate-of-change relationships shows ${W}'s 46-point drop vastly exceeds ${D1}'s 8-point dip.`,
      rival: `${D1} has a slightly lower raw BP (88 vs 92), but ${W} is crashing nearly 6× faster.`,
      isClash: false,
    };
  },

  // #26 Cross-domain reasoning (Composite)
  'cross-domain-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Aviation "sterile cockpit" rule transferred to Trauma Ethics: stop all non-essential interruptions during a critical handoff. Which bedside room requires immediate sterile silence?`,
      lines: makeShuffledLines(rng, [
        `${W}'s family room: delivering unexpected death notification while three phones ring and nurses enter with billing forms.`,
        `${D1}'s bay: stable ankle X-ray waiting in hallway.`,
        `${D2}'s room: post-stitch discharge paperwork with calm family.`,
      ]),
      verdict: winIdx,
      proof: `Transferring sterile-cockpit protection to critical communication pinpoints ${W}'s death notification room.`,
      rival: `${D1} and ${D2} are routine low-stakes encounters.`,
      isClash: false,
    };
  },

  // #27 Abstract reasoning (Composite)
  'abstract-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Abstract bottleneck check: ignore the medical specialty names—which patient sits in the EXACT structural "single-point-of-failure" bottleneck blocking both others?`,
      lines: makeShuffledLines(rng, [
        `${W} occupies the lone CT scanner; neither ${D1}'s neuro scan nor ${D2}'s chest scan can start until ${W} clears.`,
        `${D1} waits in Bay 4 for neuro CT.`,
        `${D2} waits in Bay 7 for chest CT.`,
      ]),
      verdict: winIdx,
      proof: `Abstracting away specialty labels reveals ${W} as the sole upstream bottleneck blocking both ${D1} and ${D2}.`,
      rival: `${D1} and ${D2} are parallel downstream nodes with no dependents.`,
      isClash: false,
    };
  },

  // #28 Hierarchical reasoning (Atomic)
  'hierarchical-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Command hierarchy (Trauma Chief > Attending > Intern): follow the HIGHEST-RANKING directive on the board.`,
      lines: makeShuffledLines(rng, [
        `Trauma Chief override: "Move ${W} to OR 1 immediately."`,
        `Night Attending note: "Prep ${D1} for OR 1 next."`,
        `Intern intake tag: "Flagged ${D2} for early OR review."`,
      ]),
      verdict: winIdx,
      proof: `Trauma Chief sits at the top of the command hierarchy, prioritizing ${W} above Attending and Intern notes.`,
      rival: `${D1}'s Attending order outranks ${D2}'s Intern tag, but is superseded by the Trauma Chief.`,
      isClash: false,
    };
  },

  // #29 Spatial reasoning (Atomic)
  'spatial-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Wall oxygen manifold is at Bay 2 and the backup hose only reaches 1 bay away (Bays 1, 2, or 3). Who can be hooked up immediately?`,
      lines: makeShuffledLines(rng, [
        `${W} is in Bay 3 (immediately adjacent to Bay 2 manifold).`,
        `${D1} is in Bay 5 (3 bays away—hose cannot reach).`,
        `${D2} is in Bay 8 (across the corridor—hose cannot reach).`,
      ]),
      verdict: winIdx,
      proof: `Bay 3 (${W}) lies within the 1-bay hose radius of Bay 2; Bays 5 and 8 are out of reach.`,
      rival: `${D1} is on the same wall, but 3 bays away exceeds the 1-bay hose reach.`,
      isClash: false,
    };
  },

  // #30 Temporal reasoning (Atomic)
  'temporal-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Golden-hour clot-buster window: tPA MUST be given within 4.5 hours of stroke onset. It is now 06:00. Who is STILL inside the safe window?`,
      lines: makeShuffledLines(rng, [
        `${W}: Stroke symptoms began at 02:30 (3.5 hours ago).`,
        `${D1}: Stroke symptoms began at 00:45 (5.25 hours ago—window closed).`,
        `${D2}: Stroke symptoms began at 01:00 (5.0 hours ago—window closed).`,
      ]),
      verdict: winIdx,
      proof: `At 06:00, only ${W} (3.5 h elapsed) remains inside the strict 4.5-hour treatment window.`,
      rival: `${D2} is close at 5.0 hours, but past the hard 4.5-hour safety cutoff.`,
      isClash: false,
    };
  },

  // #31 Structural reasoning (Composite)
  'structural-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Trauma bay stabilization requires ALL 3 pillars intact (Airway + Breathing + Circulation). Who has TWO structural pillars failing at once?`,
      lines: makeShuffledLines(rng, [
        `${W}: Airway obstructed (stridor) + Circulation collapsing (BP 74/40) — 2 pillars down.`,
        `${D1}: Airway clear + Breathing clear + Circulation low (BP 88/54) — 1 pillar down.`,
        `${D2}: Airway clear + Breathing fast + Circulation steady (BP 120/76) — 1 pillar strained.`,
      ]),
      verdict: winIdx,
      proof: `${W} has simultaneous failure in two structural pillars (Airway and Circulation).`,
      rival: `${D1} has circulation stress, but intact airway and breathing.`,
      isClash: false,
    };
  },

  // #32 Semantic reasoning (Atomic)
  'semantic-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Precision terminology check: the Trauma Lead ordered immediate care for "HYPOXIA" (low oxygen), NOT hypotension (low BP) or hypothermia (low temp). Who gets treated?`,
      lines: makeShuffledLines(rng, [
        `${W}: SpO2 79%, cyanotic lips, BP 116/74, temp 36.7°C.`,
        `${D1}: SpO2 98%, BP 78/46 (hypotension), temp 36.6°C.`,
        `${D2}: SpO2 97%, BP 118/72, temp 33.4°C (hypothermia).`,
      ]),
      verdict: winIdx,
      proof: `Hypoxia strictly means low oxygen saturation—matching ${W} (SpO2 79%), not ${D1} (low BP) or ${D2} (low temp).`,
      rival: `${D1} is hypotensive (low blood pressure), which is semantically distinct from hypoxia.`,
      isClash: false,
    };
  },

  // ── 4. PREDICTIVE & QUANTITATIVE REASONING (#33–#41) ────────────────────

  // #33 Probabilistic reasoning (Atomic)
  'probabilistic-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Survival gain call: pick the patient where immediate surgery creates the LARGEST jump in survival probability (Δ survival).`,
      lines: makeShuffledLines(rng, [
        `${W}: Survival jumps from 20% untreated → 85% treated (+65% gain).`,
        `${D1}: Survival jumps from 80% untreated → 95% treated (+15% gain).`,
        `${D2}: Survival jumps from 5% untreated → 15% treated (+10% gain).`,
      ]),
      verdict: winIdx,
      proof: `Operating on ${W} yields a +65% expected survival gain, dwarfing ${D1} (+15%) and ${D2} (+10%).`,
      rival: `${D1} has the highest final survival (95%), but would likely survive even while waiting.`,
      isClash: false,
    };
  },

  // #34 Statistical reasoning (Composite)
  'statistical-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Ward telemetry baseline: normal adult serum lactate is 1.2 ± 0.4 mmol/L (outlier > 2.0). Who is the extreme statistical outlier?`,
      lines: makeShuffledLines(rng, [
        `${W}: Lactate 6.8 mmol/L (14 standard deviations above ward mean).`,
        `${D1}: Lactate 1.4 mmol/L (within normal distribution).`,
        `${D2}: Lactate 1.9 mmol/L (borderline, under outlier cutoff).`,
      ]),
      verdict: winIdx,
      proof: `${W}'s lactate (6.8 mmol/L) sits far beyond the statistical distribution mean, signaling severe shock.`,
      rival: `${D2} (1.9) is slightly above mean, but well below ${W}'s extreme outlier spike.`,
      isClash: false,
    };
  },

  // #35 Counterfactual reasoning (Composite)
  'counterfactual-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `M&M What-If Review: "If the ambulance had arrived 5 minutes LATER (without giving TXA), ONLY ONE patient would have crossed lethal blood loss (> 2,000 mL)." Who?`,
      lines: makeShuffledLines(rng, [
        `${W}: Lost 1,750 mL so far; without TXA was bleeding 80 mL/min (+400 mL in 5 min → 2,150 mL).`,
        `${D1}: Lost 900 mL so far; without TXA was bleeding 60 mL/min (+300 mL → 1,200 mL).`,
        `${D2}: Lost 1,400 mL so far; without TXA was bleeding 50 mL/min (+250 mL → 1,650 mL).`,
      ]),
      verdict: winIdx,
      proof: `Only ${W} (1,750 + 400 = 2,150 mL) would have crossed the 2,000 mL lethal threshold without early TXA.`,
      rival: `${D2} reaches 1,650 mL in the counterfactual—still below 2,000 mL.`,
      isClash: false,
    };
  },

  // #36 Hypothetical reasoning (Atomic)
  'hypothetical-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Surge drill: "SUPPOSE the hospital power fails right now, shutting down every electric ventilator." Who faces immediate arrest within 2 minutes?`,
      lines: makeShuffledLines(rng, [
        `${W}: Paralyzed on full mechanical ventilation—zero spontaneous breaths.`,
        `${D1}: Breathing independently on simple nasal oxygen cannula.`,
        `${D2}: Breathing independently on room air with ankle splint.`,
      ]),
      verdict: winIdx,
      proof: `Under the hypothetical power loss, only ${W} depends entirely on electrical ventilation and needs manual bagging.`,
      rival: `${D1} uses wall oxygen, but breathes spontaneously without a powered ventilator.`,
      isClash: false,
    };
  },

  // #37 Predictive reasoning (Atomic)
  'predictive-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Trend alert: predict which patient will crash below systolic BP 70 FIRST if current 5-minute trends continue.`,
      lines: makeShuffledLines(rng, [
        `${W}: BP trending 112 → 96 → 80 (falling −16 every 5 min → hits 64 next).`,
        `${D1}: BP trending 82 → 84 → 86 (slowly recovering +2 every 5 min).`,
        `${D2}: BP trending 90 → 88 → 86 (drifting −2 every 5 min → 84 next).`,
      ]),
      verdict: winIdx,
      proof: `${W}'s steep −16/5min collapse predicts systolic 64 within 5 minutes, crashing before stable ${D2}.`,
      rival: `${D1} started lower at 82, but is climbing steadily rather than falling.`,
      isClash: false,
    };
  },

  // #38 Prognostic reasoning (Composite)
  'prognostic-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `24-hour ICU prognosis: identify the patient showing multi-organ deterioration across BOTH kidneys and brain.`,
      lines: makeShuffledLines(rng, [
        `${W}: Urine output dropped to zero AND Glasgow Coma Score fell from 12 → 7.`,
        `${D1}: Urine output steady (50 mL/hr) AND alert (GCS 15) despite broken femur.`,
        `${D2}: Urine output slightly low, but GCS improved from 11 → 14.`,
      ]),
      verdict: winIdx,
      proof: `${W} shows worsening trajectories in two vital organ systems simultaneously (renal shutdown + neurologic decline).`,
      rival: `${D2} has low urine output, but their brain status is improving (11 → 14).`,
      isClash: false,
    };
  },

  // #39 Extrapolative reasoning (Atomic)
  'extrapolative-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Oxygen cylinder math: project each patient's tank burn rate forward to see whose portable O2 tank hits ZERO first.`,
      lines: makeShuffledLines(rng, [
        `${W}: 120 L left, burning 30 L/min (empty in 4 min).`,
        `${D1}: 100 L left, burning 10 L/min (empty in 10 min).`,
        `${D2}: 180 L left, burning 20 L/min (empty in 9 min).`,
      ]),
      verdict: winIdx,
      proof: `Dividing reserve by burn rate: ${W} runs dry in 4 min, far sooner than ${D2} (9 min) and ${D1} (10 min).`,
      rival: `${D1} has the smallest remaining tank (100 L), but burns O2 3× slower than ${W}.`,
      isClash: false,
    };
  },

  // #40 Proportional reasoning (Atomic)
  'proportional-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Time-yield ratio: divide Clinical Acuity Points by Procedure Minutes to pick the HIGHEST clinical impact per minute.`,
      lines: makeShuffledLines(rng, [
        `${W}: 6 Acuity pts ÷ 2 min procedure = 3.0 pts/min.`,
        `${D1}: 8 Acuity pts ÷ 4 min procedure = 2.0 pts/min.`,
        `${D2}: 9 Acuity pts ÷ 6 min procedure = 1.5 pts/min.`,
      ]),
      verdict: winIdx,
      proof: `${W} delivers 3.0 acuity points per minute—beating ${D1} (2.0/min) and ${D2} (1.5/min).`,
      rival: `${D2} has the highest raw acuity (9), but takes 3× longer than ${W}.`,
      isClash: false,
    };
  },

  // #41 Mathematical reasoning (Composite)
  'mathematical-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Exact Trauma Risk Formula: Score = (Bleed Pts × 2) + Airway Pts − Stabilization Credit. Treat the HIGHEST exact score.`,
      lines: makeShuffledLines(rng, [
        `${W}: Bleed 5 (×2=10) + Airway 4 − Credit 2 = 12.`,
        `${D1}: Bleed 4 (×2=8) + Airway 5 − Credit 3 = 10.`,
        `${D2}: Bleed 6 (×2=12) + Airway 2 − Credit 5 = 9.`,
      ]),
      verdict: winIdx,
      proof: `Exact formula gives ${W} = 12, ahead of ${D1} = 10 and ${D2} = 9.`,
      rival: `${D2} had the highest bleed score (6), but their −5 stabilization credit lowers net risk to 9.`,
      isClash: false,
    };
  },
};
