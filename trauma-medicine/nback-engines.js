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
        dx: 'Fluid Squeezing the Heart (muffled heartbeat + swollen neck veins + falling BP)',
        w: `${W}: BP 76/48, swollen neck veins, muffled heartbeat on stethoscope.`,
        d1: `${D1}: BP 82/50, flat neck veins, clear breathing—fits blood loss, not heart squeeze.`,
        d2: `${D2}: BP 126/78, swollen neck veins, crisp heartbeat—no shock.`,
        proof: `Only ${W} shows all three classic warning signs of fluid squeezing the heart.`,
        rival: `${D1} has low BP but flat neck veins, pointing to blood loss rather than fluid around the heart.`,
      },
      {
        dx: 'Collapsed Trapped Lung (silent right chest + shifted windpipe + low oxygen)',
        w: `${W}: Oxygen 81%, silent right chest, windpipe pushed to the left.`,
        d1: `${D1}: Oxygen 84%, wet crackles in both lungs, centered windpipe.`,
        d2: `${D2}: Oxygen 97%, quieter right breath sound, centered windpipe.`,
        proof: `Only ${W} combines a silent lung, shifted windpipe, and severe low oxygen.`,
        rival: `${D1} has low oxygen, but wet crackles in both lungs and a centered windpipe rule out a trapped collapsed lung.`,
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
        q: 'One patient has hidden internal belly bleeding — compare pulse vs. hemoglobin across all three to find who best explains EVERY clue.',
        w: `${W}: Seatbelt belly mark, pulse climbing HIGHER THAN 130 (134), hemoglobin DROPPING (13.2 → 9.4).`,
        d1: `${D1}: Steering-wheel chest bruise, steady pulse (84), hemoglobin UNCHANGED (13.4 → 13.3).`,
        d2: `${D2}: High fever 39.2°C + productive cough, pulse 124, hemoglobin UNCHANGED (13.6 → 13.5).`,
        proof: `Only ${W} links blunt belly force, rising pulse (>130), and a real hemoglobin drop (−3.8) into hidden internal bleeding.`,
        rival: `${D2} has a fast pulse too, but fever, cough, and steady hemoglobin point to infection rather than blood loss.`,
      },
      {
        q: 'Carbon monoxide tricks finger oxygen clips into reading ~99% while starving the brain — compare smoke exposure vs. clip reading to spot who fits.',
        w: `${W}: Pulled from closed garage fire, gasping & confused, yet finger clip reads HIGHER THAN 98% (99%).`,
        d1: `${D1}: Pulled from same garage fire, calm clear speech, normal breathing, blood carbon monoxide test 1%.`,
        d2: `${D2}: Known asthma attack, loud wheezing, finger clip drops cleanly LOWER THAN 88% (86%).`,
        proof: `Carbon monoxide fools standard finger clips into reading ~99% despite severe confusion — matching ${W} over ${D1} (cleared) and ${D2} (true low clip).`,
        rival: `${D2}'s low finger clip (86%) and wheezing fit asthma rather than carbon monoxide masking.`,
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
        `${D2}'s chest scan showed an intact main artery and stopped bleeding—surgery cancelled.`,
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
      directive: `Test this guess: "If a patient has severe blood infection shock, 2 IV fluid bags will STILL leave blood pressure < 90 and high stress acid (> 4)." Who matches?`,
      lines: makeShuffledLines(rng, [
        `After IV fluids, ${W}: blood pressure stays low (82/46) and stress acid climbs to 5.4.`,
        `After IV fluids, ${D1}: blood pressure bounces back to normal (118/74) and stress acid drops to 1.8.`,
        `After IV fluids, ${D2}: blood pressure stays 86/52, but stress acid is normal at 1.2.`,
      ]),
      verdict: winIdx,
      proof: `Only ${W} matches BOTH predictions after IV fluids (low blood pressure < 90 AND high stress acid > 4).`,
      rival: `${D2} still has low blood pressure, but normal stress acid (1.2) rules out severe blood infection shock.`,
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
      directive: `How it happens step-by-step: trapped chest air squeezes the chest → pinches the main vein → blocks blood from returning to the heart. Who shows this exact chain?`,
      lines: makeShuffledLines(rng, [
        `${W}: Very high chest air pressure → bulging neck veins → sudden heart pumping collapse.`,
        `${D1}: Normal chest pressure → heavy wrist cut bleeding → slow blood pressure drop.`,
        `${D2}: Normal chest pressure → very low blood sugar → sweating and shaking.`,
      ]),
      verdict: winIdx,
      proof: `${W} shows the exact mechanical chain from trapped chest pressure to bulging neck veins and heart collapse.`,
      rival: `${D1} is losing blood from a wrist cut rather than trapped chest pressure pinching the main vein.`,
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
        `${W}: Verified Lab Blood Test shows severe blood acid build-up and dangerously low oxygen (54%).`,
        `${D1}: Panicked bystander [Unverified] claims severe internal bleeding; nurse vitals are normal.`,
        `${D2}: Faded ambulance fax [Unreadable] suggests possible chest pain; heart monitor is normal.`,
      ]),
      verdict: winIdx,
      proof: `${W} is backed by a verified lab blood test; ${D1} and ${D2} rely on weak or contradicted rumors.`,
      rival: `${D1}'s dramatic bystander claim lacks verified evidence and is contradicted by normal vitals.`,
      isClash: false,
    };
  },

  // #10 Bayesian reasoning (Composite)
  'bayesian-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Updated risk call: combine each patient's early risk with their new chest scan to treat the HIGHEST updated chance of a torn main chest artery.`,
      lines: makeShuffledLines(rng, [
        `${W}: Moderate early risk (30%) + emergency chest X-ray shows major swelling around the main artery.`,
        `${D1}: High early risk (60%) + full emergency chest CT scan came back 100% normal.`,
        `${D2}: Low early risk (10%) + normal chest X-ray.`,
      ]),
      verdict: winIdx,
      proof: `Updating early odds with the new scans puts ${W} (~75%) far above ${D1} (cleared by CT scan) and ${D2} (~4%).`,
      rival: `${D1} started with the highest early risk (60%), but a clean CT scan drops their updated risk below 2%.`,
      isClash: false,
    };
  },

  // ── 2. LOGICAL & FORMAL REASONING (#11–#20) ─────────────────────────────

  // #11 Deductive reasoning (Atomic — supports clash!)
  'deductive-reasoning': ({ rng, names, winIdx, allowClash }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    if (allowClash) {
      return {
        directive: `Strict Hospital Rule: "ONLY unconscious patients (alertness score ≤ 8) get an emergency breathing tube." Pick who needs a tube—or flag a Clinical Clash.`,
        lines: makeShuffledLines(rng, [
          `Order log: Give ${W} an immediate breathing tube — yet ${W} is awake (alertness score 14).`,
          `${D1} is wide awake and talking (alertness score 15).`,
          `${D2} is drowsy but breathing safely on their own (alertness score 13).`,
        ]),
        verdict: 'clash',
        proof: `The rule forbids placing a breathing tube above score 8, directly clashing with the order for awake ${W} (score 14).`,
        rival: `Neither ${D1} nor ${D2} is unconscious (≤ 8), and ${W}'s order breaks the strict rule.`,
        isClash: true,
      };
    }
    return {
      directive: `Strict Triage Rule: "Any patient with Oxygen < 88% AND heart rate > 120 must go straight to Trauma Bay 1." Who fits?`,
      lines: makeShuffledLines(rng, [
        `${W}: Oxygen 83% and heart rate 134 BPM.`,
        `${D1}: Oxygen 85% and heart rate 96 BPM.`,
        `${D2}: Oxygen 94% and heart rate 138 BPM.`,
      ]),
      verdict: winIdx,
      proof: `Only ${W} meets both strict rules (Oxygen < 88% AND heart rate > 120).`,
      rival: `${D1} fails the heart rate > 120 rule; ${D2} fails the Oxygen < 88% rule.`,
      isClash: false,
    };
  },

  // #12 Inductive reasoning (Atomic)
  'inductive-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Night-shift overdose pattern: the first 4 arrivals from Harbor Pier all had tiny pinpoint pupils + very slow breathing (< 8 breaths/min) and woke up with overdose spray. Who matches?`,
      lines: makeShuffledLines(rng, [
        `${W} (arrived from Harbor Pier): tiny pinpoint pupils, slow breathing 6/min.`,
        `${D1} (arrived from Harbor Pier): wide dilated pupils, fast breathing 26/min, restless.`,
        `${D2} (arrived from Downtown): normal pupils, normal breathing 16/min, wrist cut.`,
      ]),
      verdict: winIdx,
      proof: `${W} matches the Harbor Pier overdose pattern (pinpoint pupils + slow breathing 6/min).`,
      rival: `${D1} came from Harbor Pier too, but wide pupils and fast breathing break the pattern.`,
      isClash: false,
    };
  },

  // #13 Syllogistic reasoning (Atomic)
  'syllogistic-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Category rule: "All smoke-burned airways need a breathing tube. No arm or leg skin burn is a smoke-burned airway." Who needs a breathing tube?`,
      lines: makeShuffledLines(rng, [
        `${W} has soot inside the mouth and singed nose hairs — classified as a smoke-burned airway.`,
        `${D1} has a hot-water forearm burn — classified as an arm skin burn only.`,
        `${D2} has a shin flash burn — classified as a leg skin burn only.`,
      ]),
      verdict: winIdx,
      proof: `All smoke-burned airways need a breathing tube, and ${W} has a smoke-burned airway.`,
      rival: `${D1} and ${D2} only have arm or leg skin burns, not airway burns.`,
      isClash: false,
    };
  },

  // #14 Conditional reasoning (Atomic — supports clash!)
  'conditional-reasoning': ({ rng, names, winIdx, allowClash }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    if (allowClash) {
      return {
        directive: `Ward rule: "Heparin BLOCKS immediate surgery. BP < 80 FORCES immediate surgery." Pick who goes to surgery — or flag a Clinical Clash.`,
        lines: makeShuffledLines(rng, [
          `${W}: BP 72/40 AND was just given IV Heparin.`,
          `${D1}: BP 118/74 AND received IV Heparin — steady vitals.`,
          `${D2}: BP 94/60 AND received zero Heparin — monitoring.`,
        ]),
        verdict: 'clash',
        proof: `On ${W}, Heparin BLOCKS immediate surgery while BP < 80 FORCES immediate surgery — a direct rule collision.`,
        rival: `${D1} and ${D2} both stay ≥ 80 BP, while ${W} triggers two opposing mandatory rules simultaneously.`,
        isClash: true,
      };
    }
    return {
      directive: `Protocol rule: "If a patient's potassium > 6.5, give IV Calcium immediately; otherwise monitor." Who gets IV Calcium?`,
      lines: makeShuffledLines(rng, [
        `Lab alert: ${W}'s STAT potassium is 7.1 mEq/L with peaked T-waves.`,
        `${D1}'s potassium is 4.4 mEq/L.`,
        `${D2}'s potassium is 6.1 mEq/L on repeat lab draw.`,
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
        `${W}: Base 3 · Active bleeding · BP 78/44.`,
        `${D1}: Base 5 · Active bleeding · BP 114/72.`,
        `${D2}: Base 4 · No bleeding · BP 84/50.`,
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
        directive: `Helicopter flight clearance: weight under 90 kg, NO untreated collapsed lung, AND breathing tube secured. Who qualifies—or flag a Clinical Clash if NONE qualify?`,
        lines: makeShuffledLines(rng, [
          `${W}: 74 kg, breathing tube secured, but has an untreated collapsed lung.`,
          `${D1}: 108 kg (over weight limit), no collapsed lung, breathing tube secured.`,
          `${D2}: 68 kg, no collapsed lung, breathing tube NOT yet secured.`,
        ]),
        verdict: 'clash',
        proof: `Every patient breaks at least one mandatory flight safety rule — nobody qualifies (Clinical Clash).`,
        rival: `Each patient fails a different strict helicopter safety requirement.`,
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
      directive: `Body pattern break: normally, falling blood pressure makes the heart beat FAST (> 110 BPM). Spot the patient breaking this rule (hidden spine/brain injury).`,
      lines: makeShuffledLines(rng, [
        `${W}: Low blood pressure (78/46) with an unusually SLOW heart rate of 48 BPM.`,
        `${D1}: Low blood pressure (82/50) with normal shock fast heart rate of 128 BPM.`,
        `${D2}: Low blood pressure (86/54) with normal shock fast heart rate of 122 BPM.`,
      ]),
      verdict: winIdx,
      proof: `${W} breaks the normal fast-heart-rate shock response (low BP yet slow 48 BPM), signaling hidden spine or brain injury.`,
      rival: `${D1} and ${D2} show the expected fast heart rate when blood pressure drops.`,
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
          `${W}'s monitor logs BOTH "Oxygen 99% on room air, speaking full sentences" AND "Complete silent airway arrest" at 01:12.`,
          `${D1}: Steady oxygen 95%, alert, bruised ribs.`,
          `${D2}: Oxygen 92%, mild wheeze, talking in short phrases.`,
        ]),
        verdict: 'clash',
        proof: `Speaking full sentences at 99% oxygen is mutually incompatible with complete airway arrest at the same minute.`,
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
        `${W}: BP fell from 138/84 down to 92/58 in 10 minutes.`,
        `${D1}: BP fell from 96/60 down to 88/54 in 10 minutes.`,
        `${D2}: BP fell from 118/72 down to 104/66 in 10 minutes.`,
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
      directive: `Aviation "sterile cockpit" rule (High-Stakes Moment + Zero Room for Error → BLOCKS all interruptions): which room requires immediate sterile silence?`,
      lines: makeShuffledLines(rng, [
        `${W}'s family room: Delivering sudden surgical death news while phones ring and billing clerks knock.`,
        `${D1}'s bay: Routine morning vitals check during quiet recovery — easily paused for 10 seconds.`,
        `${D2}'s bedside: Calm pre-discharge bandage change with steady vitals — safe to answer a ward page.`,
      ]),
      verdict: winIdx,
      proof: `Transferring sterile-cockpit protection matches ONLY ${W}: an irreversible high-stakes talk where interruptions cause lasting harm.`,
      rival: `${D1} and ${D2} are stable, pauseable tasks rather than irreversible high-stakes moments.`,
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
        `${W} is in Bay 3 on the top resuscitation wall.`,
        `${D1} is in Bay 5 on the top resuscitation wall.`,
        `${D2} is in Bay 8 across the corridor on the intake wall.`,
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
        `${W}: Stroke symptoms began at 02:30.`,
        `${D1}: Stroke symptoms began at 00:45.`,
        `${D2}: Stroke symptoms began at 01:00.`,
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
        `${W}: Airway obstructed (raspy gasping) + Circulation collapsing (BP 74/40).`,
        `${D1}: Airway clear + Breathing clear + Circulation low (BP 88/54).`,
        `${D2}: Airway clear + Breathing fast + Circulation steady (BP 120/76).`,
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
      directive: `Exact word check: the Trauma Lead ordered immediate care for LOW OXYGEN (not low blood pressure or low body temperature). Who gets treated?`,
      lines: makeShuffledLines(rng, [
        `${W}: Oxygen 79% (blue lips), normal BP 116/74, normal temp 36.7°C.`,
        `${D1}: Normal oxygen 98%, low BP 78/46, normal temp 36.6°C.`,
        `${D2}: Normal oxygen 97%, normal BP 118/72, freezing temp 33.4°C.`,
      ]),
      verdict: winIdx,
      proof: `The exact order is for LOW OXYGEN — matching ${W} (79% oxygen), not ${D1} (low blood pressure) or ${D2} (cold body temp).`,
      rival: `${D1} has low blood pressure, which is a different problem from low oxygen.`,
      isClash: false,
    };
  },

  // ── 4. PREDICTIVE & QUANTITATIVE REASONING (#33–#41) ────────────────────

  // #33 Probabilistic reasoning (Atomic)
  'probabilistic-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Survival gain call: pick the patient where immediate surgery creates the LARGEST jump in survival chance.`,
      lines: makeShuffledLines(rng, [
        `${W}: Survival shifts from 20% untreated → 85% treated.`,
        `${D1}: Survival shifts from 80% untreated → 95% treated.`,
        `${D2}: Survival shifts from 5% untreated → 15% treated.`,
      ]),
      verdict: winIdx,
      proof: `Operating on ${W} yields a +65% survival gain, dwarfing ${D1} (+15%) and ${D2} (+10%).`,
      rival: `${D1} has the highest final survival (95%), but would likely survive even while waiting.`,
      isClash: false,
    };
  },

  // #34 Statistical reasoning (Composite)
  'statistical-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Ward normal range: healthy blood-stress level is 0.8 to 1.6 (danger outlier > 2.0). Who is the extreme outlier?`,
      lines: makeShuffledLines(rng, [
        `${W}: Blood-stress level 6.8 (far outside the normal ward range!).`,
        `${D1}: Blood-stress level 1.4 (right inside the normal range).`,
        `${D2}: Blood-stress level 1.9 (slightly elevated, still under the 2.0 cutoff).`,
      ]),
      verdict: winIdx,
      proof: `${W}'s blood-stress reading (6.8) sits far outside the normal ward range, signaling severe hidden shock.`,
      rival: `${D2} (1.9) is slightly above average, but far below ${W}'s extreme outlier spike.`,
      isClash: false,
    };
  },

  // #35 Counterfactual reasoning (Composite)
  'counterfactual-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `M&M What-If Review: "If the ambulance had arrived 5 minutes LATER (without giving TXA), ONLY ONE patient would have crossed lethal blood loss (> 2,000 mL)." Who?`,
      lines: makeShuffledLines(rng, [
        `${W}: Lost 1,750 mL so far; without TXA was bleeding 80 mL/min.`,
        `${D1}: Lost 900 mL so far; without TXA was bleeding 60 mL/min.`,
        `${D2}: Lost 1,400 mL so far; without TXA was bleeding 50 mL/min.`,
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
      directive: `Power-outage drill: "SUPPOSE wall electricity fails right now (shutting down electric pumps & ventilators, while wall-pipe oxygen stays on)." Who arrests within 2 minutes?`,
      lines: makeShuffledLines(rng, [
        `${W}: Paralyzed on an electric ventilator — DEPENDS ON wall power for every single breath (zero spontaneous breathing).`,
        `${D1}: Breathing strongly on their own via passive wall-pipe oxygen mask (zero electricity needed).`,
        `${D2}: Awake on battery-backed monitor receiving gravity-drip saline (zero electric pump needed).`,
      ]),
      verdict: winIdx,
      proof: `Under the power-loss model, only ${W} DEPENDS ON wall electricity to keep breathing and needs immediate hand-bagging.`,
      rival: `${D1} uses pressurized wall oxygen (non-electric) and ${D2} runs on gravity + battery.`,
      isClash: false,
    };
  },

  // #37 Predictive reasoning (Atomic)
  'predictive-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Trend alert: predict which patient will crash below systolic BP 70 FIRST if current 5-minute trends continue.`,
      lines: makeShuffledLines(rng, [
        `${W}: BP readings every 5 min: 112 → 96 → 80.`,
        `${D1}: BP readings every 5 min: 82 → 84 → 86.`,
        `${D2}: BP readings every 5 min: 90 → 88 → 86.`,
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
        `${W}: Urine output dropped to zero AND alertness score fell from 12 → 7.`,
        `${D1}: Urine output steady (50 mL/hr) AND fully alert (15/15) despite broken leg.`,
        `${D2}: Urine output slightly low, but alertness improved from 11 → 14.`,
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
        `${W}: 120 L left, burning 30 L/min.`,
        `${D1}: 100 L left, burning 10 L/min.`,
        `${D2}: 180 L left, burning 20 L/min.`,
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
        `${W}: 6 Acuity pts · 2 min procedure.`,
        `${D1}: 8 Acuity pts · 4 min procedure.`,
        `${D2}: 9 Acuity pts · 6 min procedure.`,
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
        `${W}: Bleed 5 · Airway 4 · Stabilization Credit 2.`,
        `${D1}: Bleed 4 · Airway 5 · Stabilization Credit 3.`,
        `${D2}: Bleed 6 · Airway 2 · Stabilization Credit 5.`,
      ]),
      verdict: winIdx,
      proof: `Exact formula gives ${W} = 12, ahead of ${D1} = 10 and ${D2} = 9.`,
      rival: `${D2} had the highest bleed score (6), but their −5 stabilization credit lowers net risk to 9.`,
      isClash: false,
    };
  },
};
