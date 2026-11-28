// Clinical N-Back ("Climb the Ladder") 80-Pattern Reasoning Engine — Part 2 (Types #42–#80)
// Families 5–8: Strategic & Systemic (#42–52), Creative & Synthetic (#53–61),
// Social, Psychological & Ethical (#62–70), Metacognitive & Epistemological (#71–80).
// Every engine produces a bespoke, authentic medical crisis across Before/Inside/After.

import { splitTriad, makeShuffledLines } from './nback-engines.js';

export const NBACK_ENGINES_PART2 = {
  // ── 5. STRATEGIC & SYSTEMIC REASONING (#42–#52) ─────────────────────────

  // #42 Systems reasoning (Composite)
  'systems-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Runaway feedback loop alert: spot the patient whose crisis FEEDS ITSELF (Cold → Clots Fail → Bleeds FASTER → Gets Colder) rather than self-stabilizing.`,
      lines: makeShuffledLines(rng, [
        `${W}: Temp 33.4°C → clots dissolve → bleeding speeds up → cold IV fluids drop temp LOWER.`,
        `${D1}: Temp 36.8°C → pressure bandage → bleeding slows → clot seals the forearm vessel.`,
        `${D2}: Temp 38.4°C → cooling blanket + fluids → pulse drops from 118 → 92 (self-correcting).`,
      ]),
      verdict: winIdx,
      proof: `${W} is caught in a positive runaway loop (cold worsens bleeding which worsens cold), while ${D1} and ${D2} are in stabilizing negative loops.`,
      rival: `${D2} has a fever, but treatment is actively shrinking the gap back toward normal.`,
      isClash: false,
    };
  },

  // #43 Strategic reasoning (Composite)
  'strategic-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `2-Move Survival Sequence: you can treat ONE patient at a time. Who MUST you treat FIRST so you still have time to save the others too?`,
      lines: makeShuffledLines(rng, [
        `${W}: Takes 2 min to stabilize, crashes in 3 min.`,
        `${D1}: Takes 6 min to stabilize, crashes in 10 min.`,
        `${D2}: Takes 5 min to stabilize, crashes in 14 min.`,
      ]),
      verdict: winIdx,
      proof: `Stabilizing ${W} first (2 min) beats their 3-min crash clock AND still leaves 8 min to save ${D1} (6 min) and ${D2}.`,
      rival: `Starting with ${D1} (6 min) would guarantee ${W}'s arrest halfway through.`,
      isClash: false,
    };
  },

  // #44 Game-theoretic reasoning (Composite)
  'game-theoretic-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Two-team coordination: Trauma Team B always moves to the LOUDEST bay (${D1}) first. Who must YOUR team claim so zero crashing patients go uncovered?`,
      lines: makeShuffledLines(rng, [
        `${W}: Quiet internal bleed, BP 76/46, crashing in 4 min; Team B is NOT assigned here.`,
        `${D1}: Shouting chest trauma, BP 84/50, crashing in 5 min; Team B is already scrubbing into this bay.`,
        `${D2}: Controlled rib fracture, BP 118/74, stable for 30+ min on pain meds.`,
      ]),
      verdict: winIdx,
      proof: `Anticipating Team B's move onto ${D1}, covering ${W} rescues BOTH crashing bays instead of doubling up on ${D1}.`,
      rival: `Rushing to ${D1} duplicates Team B while leaving silent ${W} uncovered.`,
      isClash: false,
    };
  },

  // #45 Adversarial reasoning (Composite)
  'adversarial-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Worst-case bridge collapse: suppose the river bridge drops right now, BLOCKING all external blood deliveries. Who depends on our LAST on-site O-Neg pack to survive?`,
      lines: makeShuffledLines(rng, [
        `${W}: Active arterial bleed — needs our last on-site O-Neg pack NOW or arrests in 4 min.`,
        `${D1}: Dehydration shock — stabilizes cleanly on plentiful on-site IV saline.`,
        `${D2}: Deep lung infection — responds to plentiful on-site IV antibiotics and oxygen.`,
      ]),
      verdict: winIdx,
      proof: `Under worst-case blood cutoff, only ${W} has zero on-site substitute for the last O-Neg pack.`,
      rival: `${D1} and ${D2} are seriously ill, but their treatments (saline and antibiotics) remain abundant on site.`,
      isClash: false,
    };
  },

  // #46 Optimisation reasoning (Composite)
  'optimisation-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Hard 10-minute OR budget before generator shuts down: pick the QUICKEST anchor case that lets you fit 2 lives into 10 minutes.`,
      lines: makeShuffledLines(rng, [
        `${W}: 4-minute surgical repair.`,
        `${D1}: 6-minute surgical repair.`,
        `${D2}: 10-minute surgical repair.`,
      ]),
      verdict: winIdx,
      proof: `Anchoring with ${W} (4 min) + ${D1} (6 min) saves 2 lives inside 10 min, beating ${D2}'s lone 10-min case.`,
      rival: `Committing to ${D2} fills the whole 10-minute budget for half the lives saved.`,
      isClash: false,
    };
  },

  // #47 Instrumental reasoning (Atomic)
  'instrumental-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `You are holding a sterile Chest Drain Tube right now. Match this exact tool to the patient whose emergency it fixes.`,
      lines: makeShuffledLines(rng, [
        `${W}: Massive blood trapped inside the right chest cavity crushing the lung.`,
        `${D1}: Deep forearm artery cut spurting bright red blood at the wrist.`,
        `${D2}: Expanding bleed inside the skull with unequal pupils.`,
      ]),
      verdict: winIdx,
      proof: `A chest drain tube directly drains the blood crushing ${W}'s lung.`,
      rival: `${D1} needs a limb tourniquet and ${D2} needs brain surgery, not a chest drain tube.`,
      isClash: false,
    };
  },

  // #48 Second-order reasoning (Composite)
  'second-order-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Downstream ward ripple: look one step BEYOND the immediate patient—treating whom frees the senior airway specialist to ALSO save a second crashing bay?`,
      lines: makeShuffledLines(rng, [
        `${W}: 1-min suction clears airway AND releases the senior anesthesiologist to rescue ${D2} next.`,
        `${D1}: 15-min complex splinting locks up the entire team while ${D2} crashes.`,
        `${D2}: Needs the senior anesthesiologist currently tied up at ${W}'s bedside.`,
      ]),
      verdict: winIdx,
      proof: `Clearing ${W} in 1 minute unlocks the 2nd-order rescue of ${D2}—saving two lives via one quick intervention.`,
      rival: `Jumping straight to ${D2} without the airway specialist still leaves ${W} blocking the specialist.`,
      isClash: false,
    };
  },

  // #49 Risk-based reasoning (Composite)
  'risk-based-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Expected Harm = (Probability of Arrest × Mortality Impact). Calculate expected harm and act on the HIGHEST risk.`,
      lines: makeShuffledLines(rng, [
        `${W}: 60% arrest risk × 90 harm index.`,
        `${D1}: 80% complication risk × 25 harm index.`,
        `${D2}: 15% arrest risk × 80 harm index.`,
      ]),
      verdict: winIdx,
      proof: `${W}'s expected harm (54) far outweighs ${D1}'s high-probability minor complication (20) and ${D2}'s low-odds threat (12).`,
      rival: `${D1} has the highest probability (80%), but much lower severity than ${W}.`,
      isClash: false,
    };
  },

  // #50 Decision-theoretic reasoning (Composite)
  'decision-theoretic': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Net Clinical Benefit = (Survival Benefit − Procedure Risk). Select the patient with the HIGHEST positive net gain.`,
      lines: makeShuffledLines(rng, [
        `${W}: +85 survival benefit · −15 procedure risk.`,
        `${D1}: +90 survival benefit · −65 procedure risk.`,
        `${D2}: +30 survival benefit · −20 procedure risk.`,
      ]),
      verdict: winIdx,
      proof: `${W} (+70) delivers nearly triple the net clinical benefit of ${D1} (+25) and ${D2} (+10).`,
      rival: `${D1} has a slightly higher raw benefit (+90), but carries severe procedure risk (−65).`,
      isClash: false,
    };
  },

  // #51 Algorithmic reasoning (Atomic)
  'algorithmic-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Execute strict ATLS ABCDE order: (1) Fix Airway BEFORE (2) Breathing BEFORE (3) Circulation. Who comes FIRST under this protocol?`,
      lines: makeShuffledLines(rng, [
        `${W}: Swollen tongue blocking throat airflow.`,
        `${D1}: Broken ribs with shallow breaths, throat wide open.`,
        `${D2}: Leg bleed with clear throat and steady breathing.`,
      ]),
      verdict: winIdx,
      proof: `ATLS executes strictly A → B → C: ${W}'s obstructed Airway precedes ${D1}'s Breathing and ${D2}'s Circulation.`,
      rival: `${D2}'s leg bleed looks dramatic, but ATLS always secures Airway (Step A) first.`,
      isClash: false,
    };
  },

  // #52 Reverse reasoning (Atomic)
  'reverse-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Work BACKWARDS from the 02:00 medevac takeoff. It is now 01:15. Whose operation MUST start this exact minute to make takeoff?`,
      lines: makeShuffledLines(rng, [
        `${W}: Needs 45 minutes total for surgery and recovery.`,
        `${D1}: Needs 20 minutes total for surgery and recovery.`,
        `${D2}: Needs 15 minutes total for surgery and recovery.`,
      ]),
      verdict: winIdx,
      proof: `Working backward from 02:00: ${W} requires 45 min, forcing an immediate 01:15 start with zero buffer.`,
      rival: `${D1} and ${D2} both have 25–30 minutes of spare margin before takeoff.`,
      isClash: false,
    };
  },

  // ── 6. CREATIVE & SYNTHETIC REASONING (#53–#61) ─────────────────────────

  // #53 Divergent reasoning (Atomic)
  'divergent-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Main pharmacy is locked during lockdown. Who has the MOST viable bedside backup options (3 independent alternatives) so we can improvise immediately?`,
      lines: makeShuffledLines(rng, [
        `${W}: Bleed can be stopped via tourniquet, wound packing, OR direct femoral pressure.`,
        `${D1}: Needs one specific rare antidote locked inside central pharmacy.`,
        `${D2}: Needs one specialized wire coil only available in the cath lab.`,
      ]),
      verdict: winIdx,
      proof: `Divergent scan shows ${W} has 3 immediately workable mechanical alternatives right at the bedside.`,
      rival: `${D1} has zero bedside substitutes until central pharmacy unlocks.`,
      isClash: false,
    };
  },

  // #54 Convergent reasoning (Atomic)
  'convergent-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Three independent clues (Paramedic + Blood Test + Heart Monitor): which SINGLE patient do all three clues point to?`,
      lines: makeShuffledLines(rng, [
        `Paramedic: "Severe chest crush." Blood Test: "Heart-damage marker spiked 10×." Heart Monitor: "Heart-attack spike." → All 3 on ${W}.`,
        `${D1}: Seatbelt chest bruise, normal heart blood test, normal heart monitor.`,
        `${D2}: No chest injury, normal heart blood test, steady fast heartbeat.`,
      ]),
      verdict: winIdx,
      proof: `All three independent clues point straight to ${W} (bruised/damaged heart).`,
      rival: `${D1} has a chest bruise, but both the blood test and heart monitor are completely normal.`,
      isClash: false,
    };
  },

  // #55 Synthetic reasoning (Composite)
  'synthetic-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Combine Cardiology + Trauma + Tox notes together: no single note looks fatal alone, but combined on ONE patient they prove fatal beta-blocker shock. Who?`,
      lines: makeShuffledLines(rng, [
        `${W}: Trauma sees mild fall + Cardiology sees pulse 42 + Tox finds empty propranolol bottle.`,
        `${D1}: Trauma sees broken wrist + Cardiology sees pulse 88 + Tox negative.`,
        `${D2}: Trauma clear + Cardiology sees pulse 102 + Tox finds caffeine.`,
      ]),
      verdict: winIdx,
      proof: `Integrating all three specialist fragments on ${W} reveals life-threatening beta-blocker overdose.`,
      rival: `Seen in isolation, ${W}'s fall looks minor—only synthesis across all 3 specialties exposes the crisis.`,
      isClash: false,
    };
  },

  // #56 Dialectical reasoning (Composite)
  'dialectical-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Two attendings clash: "Rush straight to OR!" vs "Never raise BP too high before clamping!" Which patient reconciles BOTH via controlled BP 85 + fast damage-control OR?`,
      lines: makeShuffledLines(rng, [
        `${W}: Active torn spleen — high fluids blow off clots, waiting kills them; holding BP at 85 straight into fast OR fixes BOTH.`,
        `${D1}: Head bleed needing HIGHER BP (≥ 110) to feed the brain — holding BP at 85 would starve the brain.`,
        `${D2}: Dehydration with zero internal bleeding — full IV fluids restore BP cleanly with zero surgery needed.`,
      ]),
      verdict: winIdx,
      proof: `${W}'s active torso bleed unites both principles: controlled low-target resuscitation straight into damage-control surgery.`,
      rival: `${D1}'s head bleed requires HIGHER BP (≥ 110), while ${D2} needs fluids alone without surgery.`,
      isClash: false,
    };
  },

  // #57 First-principles reasoning (Composite)
  'first-principles': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Core body rule: Oxygen Delivery = Heart Pump × Red Blood Cells × Lung Oxygen %. Whose oxygen delivery just crashed by HALF despite 99% lung oxygen?`,
      lines: makeShuffledLines(rng, [
        `${W}: Lung oxygen 99%, steady heart pump, red blood cells dropped from 14 → 6.`,
        `${D1}: Lung oxygen 95%, red blood cells 13.5, normal heart pump.`,
        `${D2}: Lung oxygen 96%, red blood cells 14.0, normal heart pump.`,
      ]),
      verdict: winIdx,
      proof: `A finger clip only measures how full each remaining blood cell is—${W}'s crash from 14 to 6 cuts total oxygen delivery in half.`,
      rival: `${D1}'s finger clip (95%) looks slightly lower than ${W}'s (99%), yet ${D1} carries more than double the oxygen.`,
      isClash: false,
    };
  },

  // #58 Lateral reasoning (Composite)
  'lateral-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Mass-casualty bedside insight: everyone rushes toward loud screams—but screaming proves an OPEN airway! Spot the silent patient in immediate danger.`,
      lines: makeShuffledLines(rng, [
        `${W}: Completely silent, sitting upright, clutching throat with bluish lips and zero breath sounds.`,
        `${D1}: Screaming loudly in pain from a broken shin with strong airflow.`,
        `${D2}: Shouting for water with a bleeding scalp laceration.`,
      ]),
      verdict: winIdx,
      proof: `Lateral trauma rule: the silent patient (${W}) has zero airflow, while screaming patients (${D1}, ${D2}) prove patent airways.`,
      rival: `${D1}'s loud screaming grabs attention, but physiologically proves air is moving freely.`,
      isClash: false,
    };
  },

  // #59 Generative reasoning (Composite)
  'generative-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Hidden-cause check: standard trauma X-rays are clean, yet ONE patient pairs ONE-SIDED hot swollen calf + SUDDEN oxygen drop (classic traveling lung clot). Who?`,
      lines: makeShuffledLines(rng, [
        `${W}: One hot swollen calf (3 cm wider than the other) + sudden chest pain & oxygen 86% after a 14-hour flight.`,
        `${D1}: One tender calf after sprinting + easy breathing, oxygen 99%, normal heart rate 72.`,
        `${D2}: Both ankles mildly puffy for 3 years + steady oxygen 98%, no sudden chest pain.`,
      ]),
      verdict: winIdx,
      proof: `Pairing an asymmetric hot swollen calf with sudden hypoxia points straight to a traveling lung clot in ${W}.`,
      rival: `${D1} has a sore calf with 99% oxygen, and ${D2} has chronic symmetric swelling with no oxygen drop.`,
      isClash: false,
    };
  },

  // #60 Decompositional reasoning (Atomic)
  'decompositional-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Split total injury score into Airway + Bleed + Neuro: everyone totals 9 points, but treat the ONLY patient with a single lethal component (≥ 7 in one category).`,
      lines: makeShuffledLines(rng, [
        `${W}: Total 9 = Airway 8 + Bleed 1 + Neuro 0.`,
        `${D1}: Total 9 = Airway 3 + Bleed 3 + Neuro 3.`,
        `${D2}: Total 9 = Airway 2 + Bleed 4 + Neuro 3.`,
      ]),
      verdict: winIdx,
      proof: `Breaking down the identical total (9) exposes ${W}'s lethal single-organ Airway score of 8.`,
      rival: `${D1} and ${D2} share total 9, but have no single component near redline.`,
      isClash: false,
    };
  },

  // #61 Emergent reasoning (Composite)
  'emergent-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Combined-factor interaction alert: a minor bump OR a blood thinner alone is low risk—TOGETHER they trigger silent fatal brain bleed! Who carries this lethal pair?`,
      lines: makeShuffledLines(rng, [
        `${W}: Minor bathroom head bump + takes Warfarin blood thinner daily.`,
        `${D1}: Minor bathroom head bump + takes zero blood thinners.`,
        `${D2}: Takes Warfarin daily + twisted ankle after stepping off a curb.`,
      ]),
      verdict: winIdx,
      proof: `Only ${W} combines head trauma WITH anticoagulation, creating emergent intracranial hemorrhage risk.`,
      rival: `${D1} and ${D2} each have only one half of the dangerous interaction.`,
      isClash: false,
    };
  },

  // ── 7. SOCIAL, PSYCHOLOGICAL & ETHICAL REASONING (#62–#70) ──────────────

  // #62 Interpersonal reasoning (Atomic)
  'interpersonal-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Family-rounds check: compare WHAT JUST HAPPENED vs. HOW THE FAMILY IS BEING TOLD — which family urgently needs the surgeon IN PERSON instead of a clerk or phone call?`,
      lines: makeShuffledLines(rng, [
        `${W}'s family: Expecting routine repair, unaware ${W} just died in the OR — clerk offered to call them by phone.`,
        `${D1}'s family: Already met the surgeon in person 10 min ago and is sitting calmly with ${D1} in ICU recovery.`,
        `${D2}'s family: Received clean scan results face-to-face and is confirming morning clinic follow-up.`,
      ]),
      verdict: winIdx,
      proof: `Delivering unexpected death news to ${W}'s family demands the attending surgeon in person, never a phone call or clerk.`,
      rival: `${D1}'s and ${D2}'s families have already had accurate in-person physician briefings.`,
      isClash: false,
    };
  },

  // #63 Mentalistic reasoning (Composite)
  'mentalistic-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Knowledge-gap audit: compare LAST FAMILY UPDATE TIME vs. LATEST CLINICAL EVENT — whose family is still acting on an OUTDATED belief?`,
      lines: makeShuffledLines(rng, [
        `${W}'s spouse: Last update at 01:00 ("stable in ambulance") — BEFORE ${W} rushed to emergency surgery at 01:20.`,
        `${D1}'s parent: Updated at 01:22 — AFTER ${D1}'s 01:15 CT scan cleared internal bleeding.`,
        `${D2}'s sibling: Updated at 01:25 — AFTER ${D2}'s 01:18 transfer to step-down monitoring.`,
      ]),
      verdict: winIdx,
      proof: `Only ${W}'s spouse's last update (01:00) sits BEFORE the major clinical turn (01:20 OR), leaving them with a false belief.`,
      rival: `${D1}'s and ${D2}'s families were both updated AFTER the latest clinical change.`,
      isClash: false,
    };
  },

  // #64 Motivational reasoning (Composite)
  'motivational-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Refusal-of-care audit: separate SAFE refusal from FEAR-DRIVEN refusal masking shock — who is trying to leave out of fear while objectively crashing?`,
      lines: makeShuffledLines(rng, [
        `${W}: Crash driver (BP 84/50, pale sweat) insisting "Let me walk out BEFORE police arrive!"`,
        `${D1}: Awake patient (BP 122/76, clean scans) declining optional sleeping pill because they dislike sedatives.`,
        `${D2}: Stable patient (BP 118/74, normal labs) asking to transfer to their neighborhood hospital tomorrow.`,
      ]),
      verdict: winIdx,
      proof: `${W}'s refusal is driven by legal fear while BP 84/50 signals active shock — requiring immediate compassionate intervention.`,
      rival: `${D1} and ${D2} have stable vitals and are making informed, non-emergency preferences.`,
      isClash: false,
    };
  },

  // #65 Moral reasoning (Composite)
  'moral-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Candor & dosing audit: compare PRESCRIBED DOSE vs. DELIVERED DOSE — which patient suffered a dangerous overdose someone wants to hide?`,
      lines: makeShuffledLines(rng, [
        `${W}: Prescribed 5 units insulin · Delivered 50 units — staff member whispers "fix it quietly, skip the report."`,
        `${D1}: Prescribed 1,000 mg antibiotic · Delivered 1,000 mg exactly on schedule.`,
        `${D2}: Prescribed 500 mL saline · Delivered 500 mL 3 minutes early.`,
      ]),
      verdict: winIdx,
      proof: `Prescribed (5) ≠ Delivered (50) is a 10× harm event on ${W}: duty of honesty and safety demands immediate reversal and full disclosure.`,
      rival: `${D1} and ${D2} both received their exact prescribed doses.`,
      isClash: false,
    };
  },

  // #66 Ethical reasoning (Composite)
  'ethical-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Patient wishes vs. urgency: signed DNR/Refusal OVERRIDES family demands — rush full resuscitation to the ONLY critical patient who WANTS it.`,
      lines: makeShuffledLines(rng, [
        `${W}: Active bleed (BP 78/46), Full Code — awake and explicitly asking for every life-saving step.`,
        `${D1}: End-stage arrest — verified signed DNR requests comfort-only care (even as a cousin shouts "Do CPR!").`,
        `${D2}: Clear-minded adult (BP 112/70) with signed blood-refusal card declining elective transfusion.`,
      ]),
      verdict: winIdx,
      proof: `Honoring verified autonomy respects ${D1}'s DNR and ${D2}'s signed refusal while rushing full rescue to ${W}.`,
      rival: `Overriding ${D1}'s verified DNR violates autonomy and pulls the team away from ${W}.`,
      isClash: false,
    };
  },

  // #67 Pragmatic reasoning (Atomic)
  'pragmatic-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Field disaster tent: 1 medic, 3 minutes BEFORE evacuation convoy leaves. Pick the patient whose Treatment Time ≤ 3 min AND whose life depends on it.`,
      lines: makeShuffledLines(rng, [
        `${W}: Leg artery bleed — 90-sec tourniquet stops fatal blood loss immediately.`,
        `${D1}: Torn heart chamber — requires a 2-hour surgical suite unavailable in the field tent.`,
        `${D2}: Closed forearm fracture — 2-min splint helps comfort, but patient is stable for hours without it.`,
      ]),
      verdict: winIdx,
      proof: `Only ${W} combines life-saving impact WITH feasibility inside the 3-minute field window (90 sec ≤ 3 min).`,
      rival: `${D1} cannot be repaired in a 3-min tent, and ${D2} is stable to wait for the base hospital.`,
      isClash: false,
    };
  },

  // #68 Contextual reasoning (Atomic)
  'contextual-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `All 3 patients have the EXACT SAME blood pressure (102/64)—read each patient's clinical context to spot who is actually in dangerous relative shock.`,
      lines: makeShuffledLines(rng, [
        `${W}: Clinic chart shows chronic high blood pressure normally running at 178/104.`,
        `${D1}: 22-year-old marathon runner whose normal resting BP is 100/62.`,
        `${D2}: Healthy dancer whose normal resting BP is 104/64.`,
      ]),
      verdict: winIdx,
      proof: `Context transforms identical numbers: 102/64 is normal for ${D1} & ${D2}, but severe relative shock for hypertensive ${W}.`,
      rival: `Ignoring baseline context makes all three monitors look falsely identical.`,
      isClash: false,
    };
  },

  // #69 Narrative reasoning (Composite)
  'narrative-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Injury-timeline pattern: match "High-Speed Impact → Brief Walk-Around Pause → Sudden Collapse + Left Shoulder Pain" (delayed torn spleen). Who fits ALL 3 beats?`,
      lines: makeShuffledLines(rng, [
        `${W}: 50 mph steering-wheel impact → walked 15 min at scene → suddenly collapsed in triage with left shoulder pain.`,
        `${D1}: 40 mph rear-end collision → immediate neck stiffness at scene → no collapse, steady vitals (BP 124/78).`,
        `${D2}: 15-ft ladder fall → immediate leg pain at scene → continuous pain, zero lucid gap, soft belly.`,
      ]),
      verdict: winIdx,
      proof: `Only ${W} matches the full 3-beat delayed-rupture arc (high-speed torso hit → lucid walk-around → sudden collapse + referred shoulder pain).`,
      rival: `${D1} and ${D2} both had immediate continuous symptoms without a lucid interval or delayed collapse.`,
      isClash: false,
    };
  },

  // #70 Perspectival reasoning (Composite)
  'perspectival-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Multi-viewpoint consent check: align Patient's documented wish + Surrogate's voice + Medical prognosis. On which case do ALL THREE viewpoints agree on urgent intervention?`,
      lines: makeShuffledLines(rng, [
        `${W}: Patient card says Full Code + Spouse asks to operate + Surgeon gives 85% recovery odds.`,
        `${D1}: Patient signed Comfort-Only + Cousin demands surgery + Surgeon gives 1% odds.`,
        `${D2}: Patient awake refusing elective brace + Friend agrees + Surgeon says non-urgent.`,
      ]),
      verdict: winIdx,
      proof: `All three perspectives (patient autonomy, surrogate, and surgical prognosis) align cleanly on operating for ${W}.`,
      rival: `${D1} has direct conflict between the patient's signed directive and the cousin's demand.`,
      isClash: false,
    };
  },

  // ── 8. METACOGNITIVE & EPISTEMOLOGICAL REASONING (#71–#80) ──────────────

  // #71 Metacognitive reasoning (Meta)
  'metacognitive-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `First-impression trap: your eyes locked onto a dramatic bloody arm—step back and spot who actually has the silent life-threatening airway crisis.`,
      lines: makeShuffledLines(rng, [
        `${W}: No visible blood, but raspy gasping and falling oxygen (82%) from inhaled smoke.`,
        `${D1}: Dramatic bloody arm fracture, 99% oxygen, strong BP 124/78, talking clearly.`,
        `${D2}: Dramatic bloody eyebrow cut, 98% oxygen, strong BP 120/76, wide awake.`,
      ]),
      verdict: winIdx,
      proof: `Stepping back from ${D1}'s dramatic bloody arm catches ${W}'s silent closing airway (82% oxygen).`,
      rival: `${D1}'s bloody arm grabs attention, but is far less urgent than ${W}'s closing airway.`,
      isClash: false,
    };
  },

  // #72 Epistemic reasoning (Meta — supports clash!)
  'epistemic-reasoning': ({ rng, names, winIdx, allowClash }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    if (allowClash) {
      return {
        directive: `Evidence check: act ONLY if at least one critical blood test is valid—flag a Clinical Clash if ALL THREE samples are ruined/contaminated.`,
        lines: makeShuffledLines(rng, [
          `${W}: High potassium alarm — sample flagged "Crushed / Invalid Tube".`,
          `${D1}: High potassium alarm — sample flagged "Wrong Barcode Label".`,
          `${D2}: High potassium alarm — sample flagged "Contaminated by IV Drip".`,
        ]),
        verdict: 'clash',
        proof: `Zero trustworthy test results exist — giving strong heart medicine on ruined samples could be fatal (redraw first!).`,
        rival: `Every alarming number came from a ruined sample and cannot be trusted.`,
        isClash: true,
      };
    }
    return {
      directive: `Fact vs. Assumption check: tell CONFIRMED safety apart from UNCHECKED guesses—who was merely "assumed fine" without ever being examined?`,
      lines: makeShuffledLines(rng, [
        `${W}: Pulled from back seat; bystander said "looks okay"—ZERO vitals or exam ever done.`,
        `${D1}: Checked by senior doctor; clean CT scan, clean heart monitor, vitals checked every 15 min.`,
        `${D2}: Checked by doctor; clean X-ray, normal oxygen, walking safely.`,
      ]),
      verdict: winIdx,
      proof: `No bad numbers does NOT mean ${W} is safe when nobody has ever checked them.`,
      rival: `${D1} and ${D2} have confirmed normal exam results.`,
      isClash: false,
    };
  },

  // #73 Reflective reasoning (Meta)
  'reflective-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Post-shift review: looking back at three cases, which chart shows a team jumping to a quick label ("just anxiety") and stopping too early?`,
      lines: makeShuffledLines(rng, [
        `${W}: Team guessed "anxiety" in 2 minutes and stopped looking — missing a collapsed lung!`,
        `${D1}: Team checked chest and belly scans thoroughly before wrapping a broken wrist.`,
        `${D2}: Team ran two heart blood tests 3 hours apart before clearing chest pain.`,
      ]),
      verdict: winIdx,
      proof: `${W}'s chart shows stopping too early on a comforting guess ("anxiety") without checking for real injury.`,
      rival: `${D1} and ${D2} both received thorough checks before being cleared.`,
      isClash: false,
    };
  },

  // #74 Critical reasoning (Meta — supports clash!)
  'critical-reasoning': ({ rng, names, winIdx, allowClash }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    if (allowClash) {
      return {
        directive: `Audit the consultant's argument: pick the valid surgical case—or flag Clinical Clash if the consultant's premise contradicts the actual patient data.`,
        lines: makeShuffledLines(rng, [
          `Consultant claim: "Operate on ${W} because ${W} has the ONLY abnormal scan on the floor."`,
          `Actual Radiology log: ${W}'s CT scan is 100% normal.`,
          `Actual Radiology log: ${D1} and ${D2} also have 100% normal CT scans.`,
        ]),
        verdict: 'clash',
        proof: `The consultant's core premise is directly refuted by radiology—no patient has an abnormal scan (Clinical Clash).`,
        rival: `Acting on a false premise would expose ${W} to unnecessary surgery.`,
        isClash: true,
      };
    }
    return {
      directive: `Normal-BP fallacy test: when Heart Rate is HIGHER THAN Top BP (Shock Index > 1) + rigid belly, the body is hiding massive blood loss. Who was wrongly called "stable"?`,
      lines: makeShuffledLines(rng, [
        `${W}: 21-yr cyclist — Top BP 114, Heart Rate 138 + rigid belly.`,
        `${D1}: 68-yr driver — Top BP 108, Heart Rate 82 + soft belly.`,
        `${D2}: 45-yr rider — Top BP 122, Heart Rate 96 + soft belly.`,
      ]),
      verdict: winIdx,
      proof: `Young patients hold Top BP near normal while bleeding out: ${W}'s HR 138 > Top BP 114 + rigid belly exposes hidden shock.`,
      rival: `${D1} has a slightly lower Top BP (108 vs 114), but HR 82 < Top BP 108 and a soft belly rule out hidden shock.`,
      isClash: false,
    };
  },

  // #75 Falsification-based reasoning (Meta — supports clash!)
  'falsification-based': ({ rng, names, winIdx, allowClash }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    if (allowClash) {
      return {
        directive: `Working claim: "At least one of these 3 patients has a fractured pelvis." Test to DISPROVE it — pick the confirmed fracture OR flag Clinical Clash if ALL 3 disprove it.`,
        lines: makeShuffledLines(rng, [
          `${W}: Pelvic X-ray and CT both show completely intact pelvic ring.`,
          `${D1}: Pelvic X-ray and CT both show completely intact pelvic ring.`,
          `${D2}: Walking pain-free; pelvic X-ray completely intact.`,
        ]),
        verdict: 'clash',
        proof: `Every candidate's imaging disproves the working claim — zero pelvic fractures exist (Clinical Clash).`,
        rival: `Clinging to a disproved claim wastes critical trauma bay time.`,
        isClash: true,
      };
    }
    return {
      directive: `Boundary test: shift rule says "Safe to wait 1 hr ONLY IF Oxygen ≥ 92% AND BP ≥ 100." Spot the SINGLE counterexample who DISPROVES "all 3 can wait."`,
      lines: makeShuffledLines(rng, [
        `${W}: BP 118/74, Oxygen 83% with active vomiting.`,
        `${D1}: Oxygen 94%, BP 106/68, alert.`,
        `${D2}: Oxygen 96%, BP 114/72, alert.`,
      ]),
      verdict: winIdx,
      proof: `${W} breaks the ≥ 92% oxygen floor (83%), decisively disproving the blanket "everyone can wait" claim.`,
      rival: `${D1} and ${D2} both clear every safety boundary (O2 ≥ 92% and BP ≥ 100).`,
      isClash: false,
    };
  },

  // #76 Heuristic reasoning (Meta)
  'heuristic-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Fast START Mass-Casualty Rule: "Can't walk + Breathing > 30/min → IMMEDIATE RED." Apply this 3-second field rule now.`,
      lines: makeShuffledLines(rng, [
        `${W}: Cannot walk, breathing 36/min.`,
        `${D1}: Walking around triage, breathing 22/min.`,
        `${D2}: Cannot walk, breathing 18/min, strong wrist pulse, follows commands.`,
      ]),
      verdict: winIdx,
      proof: `START heuristic tags ${W} Immediate Red instantly (non-ambulatory + RR > 30).`,
      rival: `${D2} cannot walk either, but passes the RR ≤ 30, pulse, and mental status checks (Yellow).`,
      isClash: false,
    };
  },

  // #77 Non-monotonic reasoning (Meta)
  'non-monotonic-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Withdraw old conclusion! At 01:00 ${D1} was #1 priority—but new 01:08 STAT evidence just overturned the board. Who is the NEW #1 priority?`,
      lines: makeShuffledLines(rng, [
        `01:00 Triage: ${D1} flagged #1 for suspected spleen bleed; ${W} looked mild.`,
        `01:08 Update A: ${D1}'s repeat CT is clean and BP rose to 122/78.`,
        `01:08 Update B: ${W} just became unresponsive with an expanding brain bleed on urgent head scan.`,
      ], true),
      verdict: winIdx,
      proof: `Non-monotonic revision withdraws ${D1}'s cleared 01:00 priority and shifts immediate action to ${W}.`,
      rival: `Clinging to ${D1}'s outdated 01:00 alert ignores the decisive 01:08 reversal.`,
      isClash: false,
    };
  },

  // #78 Ontological reasoning (Meta)
  'ontological-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Sort the true kind of crisis: Physical Tear vs. Sugar/Chemistry Crisis vs. Legal/Family Dispute. Who is the ONLY Physical Tear?`,
      lines: makeShuffledLines(rng, [
        `${W}: Deep knife puncture into the right lung with active chest-wall air leak.`,
        `${D1}: Severe high-blood-sugar crisis with fruity breath and blood pH 7.12.`,
        `${D2}: Sibling disagreement over healthcare proxy paperwork at the nursing desk.`,
      ]),
      verdict: winIdx,
      proof: `Sorting crisis types cleanly separates ${W}'s physical tear from ${D1}'s chemistry crisis and ${D2}'s legal dispute.`,
      rival: `${D1} is seriously ill, but needs IV medicine rather than a surgical repair.`,
      isClash: false,
    };
  },

  // #79 Analogical abstraction (Meta)
  'analogical-abstraction': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Shared deep structure: "Swelling trapped INSIDE A RIGID SHELL crushes blood flow" (Brain in Skull :: Heart in Sac :: Muscle in Tight Fascia). Who matches?`,
      lines: makeShuffledLines(rng, [
        `${W}: Swollen shin sealed inside tight fascia sheath with vanishing foot pulse and hard calf.`,
        `${D1}: Open forearm laceration bleeding outward with strong radial hand pulse.`,
        `${D2}: Soft outer-thigh bruise over loose fat expanding outward with strong foot pulse.`,
      ]),
      verdict: winIdx,
      proof: `Only ${W} replicates the rigid-shell pressure trap cutting off circulation, whereas ${D1} and ${D2} expand freely outward.`,
      rival: `${D1} has visible blood, but an open wound cannot build trapped internal shell pressure.`,
      isClash: false,
    };
  },

  // #80 Integrative reasoning (Meta — full Differential Diagnosis pipeline!)
  'integrative-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Chief's 3-Gate Call: combine Early Risk + New Belly Scan + Live BP Trend to save the ONLY patient failing ALL THREE gates.`,
      lines: makeShuffledLines(rng, [
        `${W}: Early risk 40% + Belly scan POSITIVE for free fluid + BP falling 108 → 82/48.`,
        `${D1}: Early risk 75% + Belly & CT scans CLEAN + BP steady 120/76.`,
        `${D2}: Early risk 50% + Belly scan CLEAN + BP dipped 104 → 96 then climbed back to 112/72.`,
      ]),
      verdict: winIdx,
      proof: `Synthesizing scan confirmation + falling BP locks onto ${W}, while clean scans rule out higher-prior ${D1} and rebounding ${D2}.`,
      rival: `${D1} started with the highest early risk (75%), but clean scans and steady BP overturn that prior.`,
      isClash: false,
    };
  },
};
