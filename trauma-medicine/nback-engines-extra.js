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
      directive: `Lethal feedback loop alert: identify the patient trapped in the Trauma "Triad of Death" (Hypothermia → Coagulopathy → Worse Bleeding → Deeper Hypothermia).`,
      lines: makeShuffledLines(rng, [
        `${W}: Core temp 33.4°C, blood won't clot, cold IV fluids accelerating bleeding.`,
        `${D1}: Core temp 36.8°C, localized hand laceration controlled with gauze.`,
        `${D2}: Core temp 37.9°C, isolated ankle fracture, normal clotting labs.`,
      ]),
      verdict: winIdx,
      proof: `${W} is locked inside a self-reinforcing physiological feedback loop that will spiral unless broken immediately.`,
      rival: `${D1}'s bleed is controlled and warm, with no amplifying feedback loop.`,
      isClash: false,
    };
  },

  // #43 Strategic reasoning (Composite)
  'strategic-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `2-Move Survival Sequence: you can treat ONE patient at a time. Who MUST you treat FIRST so you still have time to save the others too?`,
      lines: makeShuffledLines(rng, [
        `${W}: Takes 2 min to stabilize, crashes in 3 min (treating first leaves time for ${D1} & ${D2}).`,
        `${D1}: Takes 6 min to stabilize, crashes in 10 min (treating first kills ${W} at minute 3).`,
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
      directive: `Two-team coordination: Trauma Team B always grabs the loudest bay (${D1}) first. Who is your optimal pick so NO critical patient goes uncovered?`,
      lines: makeShuffledLines(rng, [
        `${W}: Quietly decompensating (BP 76/46); Team B is NOT heading to this bay.`,
        `${D1}: Loudly calling out (BP 84/50); Team B is already scrubbing into this bay.`,
        `${D2}: Stable wrist sprain (BP 122/78), safe to wait.`,
      ]),
      verdict: winIdx,
      proof: `Accounting for Team B's rational move onto ${D1}, covering ${W} saves BOTH critical patients instead of doubling up.`,
      rival: `Jumping onto ${D1} duplicates Team B while leaving ${W} unattended.`,
      isClash: false,
    };
  },

  // #45 Adversarial reasoning (Composite)
  'adversarial-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Worst-case earthquake aftershock test: suppose the ambulance bridge collapses right now (cutting off external blood supply). Who must be secured FIRST under worst-case isolation?`,
      lines: makeShuffledLines(rng, [
        `${W}: Needs our last on-site O-Neg pack right now or arrests in 4 min—zero backup if bridge drops.`,
        `${D1}: Stable on saline alone for 2 hours—unaffected by blood cutoff.`,
        `${D2}: Minor scalp stitch—needs zero blood products.`,
      ]),
      verdict: winIdx,
      proof: `Under worst-case isolation, ${W} faces catastrophic mortality if external resupply is cut off.`,
      rival: `${D1} remains stable on crystalloid even under worst-case cutoff.`,
      isClash: false,
    };
  },

  // #46 Optimisation reasoning (Composite)
  'optimisation-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Hard 10-minute OR budget: maximize total lives saved before the generator shuts down. Which patient MUST be excluded or which single case unlocks the best 2-patient schedule? Pick the 4-min anchor case.`,
      lines: makeShuffledLines(rng, [
        `${W}: 4-min procedure (lets us save ${W} + ${D1} in 10 min = 2 lives saved!).`,
        `${D1}: 6-min procedure (fits with ${W}, cannot fit with ${D2}).`,
        `${D2}: 10-min procedure (consumes the entire clock for only 1 life saved).`,
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
      directive: `You are holding a sterile Chest Tube kit right now. Match this exact instrument to the patient whose condition it directly resolves.`,
      lines: makeShuffledLines(rng, [
        `${W}: Massive hemothorax (1.4 L blood pooling inside the pleural chest cavity).`,
        `${D1}: Open forearm arterial laceration (needs tourniquet / direct clamp).`,
        `${D2}: Acute epidural brain bleed (needs neurosurgical burr hole).`,
      ]),
      verdict: winIdx,
      proof: `A chest tube directly evacuates pleural blood in ${W}'s massive hemothorax.`,
      rival: `${D1} needs limb hemorrhage control and ${D2} needs cranial decompression, not a chest tube.`,
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
        `${W}: 60% arrest risk × 90 harm index = 54 expected harm.`,
        `${D1}: 80% complication risk × 25 harm index = 20 expected harm.`,
        `${D2}: 15% arrest risk × 80 harm index = 12 expected harm.`,
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
      directive: `Net Clinical Utility = (Survival Benefit − Procedure Complication Cost). Select the patient with the HIGHEST positive net utility.`,
      lines: makeShuffledLines(rng, [
        `${W}: +85 survival benefit − 15 procedure risk = +70 net utility.`,
        `${D1}: +90 survival benefit − 65 procedure risk = +25 net utility.`,
        `${D2}: +30 survival benefit − 20 procedure risk = +10 net utility.`,
      ]),
      verdict: winIdx,
      proof: `${W} (+70) delivers nearly triple the net clinical utility of ${D1} (+25) and ${D2} (+10).`,
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
        `${W}: Swollen tongue blocking airway (Step A — Airway).`,
        `${D1}: Broken ribs with shallow breaths, patent airway (Step B — Breathing).`,
        `${D2}: Leg bleed with clear airway and lungs (Step C — Circulation).`,
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
      directive: `Work BACKWARDS from the 02:00 medevac takeoff: surgery + recovery takes 40 min. It is now 01:15. Whose operation MUST start this exact minute to make takeoff?`,
      lines: makeShuffledLines(rng, [
        `${W}: Needs 45 min total (01:15 + 45m = 02:00—zero slack left!).`,
        `${D1}: Needs 20 min total (can start as late as 01:40).`,
        `${D2}: Needs 15 min total (can start as late as 01:45).`,
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
        `${W}: Bleed can be stopped via tourniquet, wound packing, OR direct femoral compression (3 options).`,
        `${D1}: Needs one specific rare antidote locked in central pharmacy (0 bedside backups).`,
        `${D2}: Needs a specialized neuro-coil only in cath lab (1 option).`,
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
      directive: `Three independent clues (Paramedic note + Lab + ECG): which SINGLE patient do all three clues point to?`,
      lines: makeShuffledLines(rng, [
        `Paramedic: "Severe chest crush." Lab: "Troponin spiked 10×." ECG: "ST elevation." → All 3 logged on ${W}.`,
        `${D1}: Chest bruise from seatbelt, normal troponin, normal ECG.`,
        `${D2}: No chest injury, normal troponin, fast sinus rhythm.`,
      ]),
      verdict: winIdx,
      proof: `All three independent diagnostic lines converge uniquely on ${W} (blunt cardiac injury).`,
      rival: `${D1} has chest bruising, but both lab and ECG diverge away from cardiac injury.`,
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
      directive: `Two attendings clash: "Rush to OR now!" vs "Never operate before stabilizing BP!" Which patient's condition reconciles BOTH truths via permissive hypotension + fast damage-control OR?`,
      lines: makeShuffledLines(rng, [
        `${W}: Active splenic rupture—holding BP at 85 while rolling straight to damage-control OR saves them.`,
        `${D1}: Minor knee laceration—needs zero surgery, only bedside stitches.`,
        `${D2}: Uncomplicated dehydration—needs fluids only, zero surgery.`,
      ]),
      verdict: winIdx,
      proof: `${W}'s active splenic bleed synthesizes both viewpoints: brief controlled resuscitation directly into damage-control surgery.`,
      rival: `${D1} and ${D2} do not require surgical synthesis at all.`,
      isClash: false,
    };
  },

  // #57 First-principles reasoning (Composite)
  'first-principles': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Core physiology check: Oxygen Delivery = Heart Output × Hemoglobin × SpO2. Whose oxygen delivery just collapsed by HALF despite normal lungs (SpO2 99%)?`,
      lines: makeShuffledLines(rng, [
        `${W}: SpO2 99%, steady heart, but Hemoglobin crashed from 14 → 6 g/dL (lost >50% O2 carriers).`,
        `${D1}: SpO2 95%, Hemoglobin 13.5 g/dL, normal heart output.`,
        `${D2}: SpO2 96%, Hemoglobin 14.0 g/dL, normal heart output.`,
      ]),
      verdict: winIdx,
      proof: `From first principles, SpO2 only measures saturation of remaining cells—${W}'s 6 g/dL hemoglobin cuts tissue oxygen delivery in half.`,
      rival: `${D1}'s SpO2 (95%) looks slightly lower than ${W}'s (99%), yet ${D1} carries more than double the oxygen.`,
      isClash: false,
    };
  },

  // #58 Lateral reasoning (Composite)
  'lateral-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Mass-casualty bedside insight: everyone rushes toward loud screams—but screaming proves an OPEN airway! Spot the silent patient in immediate danger.`,
      lines: makeShuffledLines(rng, [
        `${W}: Completely silent, sitting upright, clutching throat with bluish lips (total airway block).`,
        `${D1}: Screaming loudly in pain from a broken shin—airway wide open.`,
        `${D2}: Shouting for water with a bleeding scalp—airway wide open.`,
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
      directive: `Unexplained case: standard trauma scans are negative, yet ONE patient has BOTH acute leg swelling AND sudden shortness of breath. Who fits a novel diagnosis (Pulmonary Embolism)?`,
      lines: makeShuffledLines(rng, [
        `${W}: One hot swollen calf + sudden chest pain & SpO2 drop after a 14-hour flight.`,
        `${D1}: Twisted ankle + normal breathing (SpO2 99%).`,
        `${D2}: Both ankles mildly puffy for years + steady normal SpO2.`,
      ]),
      verdict: winIdx,
      proof: `Linking unilateral calf clot + sudden hypoxia generates the Pulmonary Embolism hypothesis on ${W}.`,
      rival: `${D2}'s chronic bilateral puffiness lacks acute embolic hypoxia.`,
      isClash: false,
    };
  },

  // #60 Decompositional reasoning (Atomic)
  'decompositional-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Split total injury score into Airway + Bleed + Neuro: everyone totals 9 points, but treat the ONLY patient with a single lethal component (≥ 7 in one category).`,
      lines: makeShuffledLines(rng, [
        `${W}: Total 9 = Airway 8 (Lethal) + Bleed 1 + Neuro 0.`,
        `${D1}: Total 9 = Airway 3 + Bleed 3 + Neuro 3 (moderate spread).`,
        `${D2}: Total 9 = Airway 2 + Bleed 4 + Neuro 3 (moderate spread).`,
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
        `${D2}: Takes Warfarin daily + twisted ankle (zero head impact).`,
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
      directive: `Post-crisis family rounds: which family needs the attending physician IN PERSON right now rather than a routine phone update?`,
      lines: makeShuffledLines(rng, [
        `${W}'s family: Sitting in quiet room after sudden intraoperative death—waiting for the surgeon's honest bedside talk.`,
        `${D1}'s family: Waiting for routine plaster cast drying instructions.`,
        `${D2}'s family: Asking where hospital parking validation is stamped.`,
      ]),
      verdict: winIdx,
      proof: `Breaking tragic news to ${W}'s family requires direct, compassionate in-person physician presence.`,
      rival: `${D1} and ${D2} involve routine discharge logistics.`,
      isClash: false,
    };
  },

  // #63 Mentalistic reasoning (Composite)
  'mentalistic-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Family room briefing check: spot the family member operating on an OUTDATED belief who thinks their loved one is still fine.`,
      lines: makeShuffledLines(rng, [
        `${W}'s spouse: Only heard the 01:00 "stable in ambulance" text—doesn't know ${W} just went into emergency surgery.`,
        `${D1}'s parent: Just spoke with the trauma nurse 2 minutes ago and knows the current CT plan.`,
        `${D2}'s sibling: Sitting right beside ${D2} while stitches are finished.`,
      ]),
      verdict: winIdx,
      proof: `${W}'s spouse still holds an outdated 01:00 mental model and must be gently updated immediately.`,
      rival: `${D1}'s and ${D2}'s families already hold accurate current knowledge.`,
      isClash: false,
    };
  },

  // #64 Motivational reasoning (Composite)
  'motivational-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Hidden-motive safety check: identify the patient refusing a life-saving trauma scan out of FEAR/GUILT (not medical stability) while hiding internal injury.`,
      lines: makeShuffledLines(rng, [
        `${W}: Car-crash driver with pale sweat & BP 84/50 insisting "I'm fine, let me leave before police arrive!"`,
        `${D1}: Calm jogger with clear vitals asking if ice is enough for a bruised knee.`,
        `${D2}: Cooperative carpenter requesting pain meds while waiting for hand X-ray.`,
      ]),
      verdict: winIdx,
      proof: `${W}'s refusal is driven by fear of legal trouble while showing objective hypotension (84/50)—requiring urgent bedside intervention.`,
      rival: `${D1} has stable vitals and no hidden shock signs.`,
      isClash: false,
    };
  },

  // #65 Moral reasoning (Composite)
  'moral-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Duty of honesty & protection: a serious dosing error occurred on ONE chart tonight. Which patient requires immediate transparent disclosure & corrective reversal?`,
      lines: makeShuffledLines(rng, [
        `${W}: Accidentally given 10× insulin dose—nurse suggests "just give sugar quietly so no one files a report."`,
        `${D1}: Received exact scheduled antibiotic on time.`,
        `${D2}: Received exact tetanus booster on time.`,
      ]),
      verdict: winIdx,
      proof: `Moral duty of candor and patient safety mandates immediate reversal, close monitoring, and honest disclosure for ${W}.`,
      rival: `Hiding a 10× medication error violates core medical ethics and endangers ${W}.`,
      isClash: false,
    };
  },

  // #66 Ethical reasoning (Composite)
  'ethical-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Autonomy vs Beneficence: honor every verified DNR/advance directive while intervening immediately for the critical patient who WANTS full resuscitation.`,
      lines: makeShuffledLines(rng, [
        `${W}: Active hemorrhage (BP 78/46), full code—explicitly requests every life-saving measure.`,
        `${D1}: End-stage arrest with verified signed DNR & family at bedside requesting comfort care only.`,
        `${D2}: Competent adult declining elective stitches on a minor knuckle scrape.`,
      ]),
      verdict: winIdx,
      proof: `Medical ethics respects ${D1}'s valid DNR (autonomy) while rushing full resuscitation to ${W} (beneficence + consent).`,
      rival: `Overriding ${D1}'s verified DNR violates patient autonomy and delays ${W}'s life-saving care.`,
      isClash: false,
    };
  },

  // #67 Pragmatic reasoning (Atomic)
  'pragmatic-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Field disaster tent: 1 medic, 3 minutes until evacuation convoy leaves. Pick the high-impact patient who can ACTUALLY be stabilized in time.`,
      lines: makeShuffledLines(rng, [
        `${W}: Arterial leg bleed—90-second tourniquet + stretchering saves their life.`,
        `${D1}: Complex open-chest repair requiring a 2-hour surgical suite not available in field tent.`,
        `${D2}: Mild forearm scrape—can walk onto the convoy unassisted.`,
      ]),
      verdict: winIdx,
      proof: `Pragmatic field triage acts on ${W}: achievable within 90 seconds with life-saving impact.`,
      rival: `${D1} requires an unavailable 2-hour OR; ${D2} needs no emergency intervention.`,
      isClash: false,
    };
  },

  // #68 Contextual reasoning (Atomic)
  'contextual-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `All 3 patients have the EXACT SAME blood pressure (102/64)—read each patient's clinical context to spot who is actually in dangerous relative shock.`,
      lines: makeShuffledLines(rng, [
        `${W}: Baseline BP is normally 178/104 (chronic hypertension)—102/64 is a massive 76-point shock drop!`,
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
      directive: `Reconstruct the full injury narrative: which patient's story ("high-speed steering wheel impact → brief lucid pause → sudden collapse") fits delayed splenic rupture?`,
      lines: makeShuffledLines(rng, [
        `${W}: Hit steering wheel at 50 mph → walked around crash scene 15 min → just collapsed in triage with left shoulder pain.`,
        `${D1}: Tripped on curb at walking speed → immediate ankle swelling → steady vitals.`,
        `${D2}: Lifted heavy box → immediate lower back ache → normal vitals.`,
      ]),
      verdict: winIdx,
      proof: `${W}'s coherent high-energy mechanism + lucid interval + sudden collapse with Kehr's sign (left shoulder pain) tells the classic splenic rupture story.`,
      rival: `${D1}'s and ${D2}'s narratives match low-energy orthopedic strain.`,
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
      directive: `Cognitive bias check (Anchoring Trap): your first instinct locked onto a gruesome open arm fracture—step back and spot who actually has the silent life-threatening airway crisis.`,
      lines: makeShuffledLines(rng, [
        `${W}: No visible blood, but stridor and falling SpO2 (82%) from inhaled smoke.`,
        `${D1}: Dramatic bloody arm fracture, SpO2 99%, BP 124/78, talking clearly.`,
        `${D2}: Dramatic bloody eyebrow cut, SpO2 98%, BP 120/76, alert.`,
      ]),
      verdict: winIdx,
      proof: `Metacognitive check defeats visual anchoring on ${D1}'s bloody arm and catches ${W}'s silent lethal hypoxia.`,
      rival: `${D1}'s gruesome arm injury is visually distracting, but non-fatal compared to ${W}'s closing airway.`,
      isClash: false,
    };
  },

  // #72 Epistemic reasoning (Meta — supports clash!)
  'epistemic-reasoning': ({ rng, names, winIdx, allowClash }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    if (allowClash) {
      return {
        directive: `Evidence verification: act ONLY if at least one patient's critical lab is verified—flag a Clinical Clash if ALL THREE critical labs came from a contaminated tube batch.`,
        lines: makeShuffledLines(rng, [
          `${W}: Potassium 8.2 — tube flagged "Hemolyzed / Invalid Sample".`,
          `${D1}: Potassium 7.9 — tube flagged "Mislabeled / Wrong Barcode".`,
          `${D2}: Potassium 8.5 — tube flagged "Drawn above IV line / Contaminated".`,
        ]),
        verdict: 'clash',
        proof: `Zero valid epistemic evidence exists—treating any of the three on contaminated labs could cause fatal iatrogenic harm (redraw STAT).`,
        rival: `Every alarming number is epistemically compromised and cannot justify treatment.`,
        isClash: true,
      };
    }
    return {
      directive: `Knowledge boundary check: distinguish CONFIRMED stability from UNEXAMINED assumptions—who was merely "assumed fine" without ever being examined?`,
      lines: makeShuffledLines(rng, [
        `${W}: Pulled from back seat; marked "probably ok" by bystander—ZERO vitals or exam ever recorded.`,
        `${D1}: Examined by attending; normal CT, normal ECG, vitals logged q15m.`,
        `${D2}: Examined by resident; clean X-ray, normal pulse ox, walking safely.`,
      ]),
      verdict: winIdx,
      proof: `Epistemic audit catches ${W}: absence of bad numbers is NOT evidence of stability when no exam was ever done.`,
      rival: `${D1} and ${D2} have positive verified examination data.`,
      isClash: false,
    };
  },

  // #73 Reflective reasoning (Meta)
  'reflective-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Post-shift M&M reflection: reviewing three near-misses, which patient's chart shows the classic "Premature Closure" error where the team stopped looking too early?`,
      lines: makeShuffledLines(rng, [
        `${W}: Team diagnosed "anxiety" in 2 minutes and stopped—missing a hidden collapsed lung.`,
        `${D1}: Team ran full trauma panel, ruled out chest/belly injury, then treated wrist break.`,
        `${D2}: Team checked serial troponins 3 hours apart before clearing chest pain.`,
      ]),
      verdict: winIdx,
      proof: `${W}'s chart reflects premature closure—accepting a quick label ("anxiety") without ruling out fatal trauma.`,
      rival: `${D1} and ${D2} underwent complete systematic evaluation before closure.`,
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
      directive: `Spot the flawed assumption: a junior intern skipped ONE critical patient assuming "young healthy athletes don't have silent internal bleeds." Who was misjudged?`,
      lines: makeShuffledLines(rng, [
        `${W}: 21-year-old cyclist—normal BP (114/72) masking massive bleed, but pulse is 138 and belly is rigid.`,
        `${D1}: 68-year-old with bruised shin, pulse 78, soft abdomen.`,
        `${D2}: 45-year-old with sprained thumb, pulse 72, soft abdomen.`,
      ]),
      verdict: winIdx,
      proof: `Critical check dismantles the "normal BP = safe" fallacy: young patients compensate BP until sudden collapse, betrayed by ${W}'s HR 138 and rigid abdomen.`,
      rival: `${D1} is older, but shows calm vitals and zero abdominal findings.`,
      isClash: false,
    };
  },

  // #75 Falsification-based reasoning (Meta — supports clash!)
  'falsification-based': ({ rng, names, winIdx, allowClash }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    if (allowClash) {
      return {
        directive: `Working claim: "At least one of these 3 patients has a fractured pelvis." Test to DISPROVE it—pick the confirmed pelvis fracture OR flag Clinical Clash if ALL 3 are ruled out.`,
        lines: makeShuffledLines(rng, [
          `${W}: Pelvic X-ray and CT both show completely intact pelvic ring.`,
          `${D1}: Pelvic X-ray and CT both show completely intact pelvic ring.`,
          `${D2}: Walking pain-free; pelvic X-ray completely intact.`,
        ]),
        verdict: 'clash',
        proof: `Every candidate's imaging falsifies the working hypothesis—zero pelvic fractures exist (Clinical Clash).`,
        rival: `Clinging to a falsified hypothesis wastes critical trauma bay time.`,
        isClash: true,
      };
    }
    return {
      directive: `Counterexample check: working claim is "Everyone in this bay is stable enough to wait 1 hour." Spot the SINGLE patient who DISPROVES that claim.`,
      lines: makeShuffledLines(rng, [
        `${W}: SpO2 just plunged to 81% with active vomiting—disproves the "all stable" claim immediately.`,
        `${D1}: Sitting upright, SpO2 98%, BP 122/76.`,
        `${D2}: Reading phone, SpO2 99%, BP 118/74.`,
      ]),
      verdict: winIdx,
      proof: `A single crashing counterexample (${W}) decisively falsifies the blanket "everyone can wait" assumption.`,
      rival: `${D1} and ${D2} confirm stability, whereas falsification hunts for the exception.`,
      isClash: false,
    };
  },

  // #76 Heuristic reasoning (Meta)
  'heuristic-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Fast START Mass-Casualty Rule: "Can't walk + Breathing > 30/min → IMMEDIATE RED." Apply this 3-second field rule now.`,
      lines: makeShuffledLines(rng, [
        `${W}: Non-ambulatory, breathing 36/min (Immediate Red).`,
        `${D1}: Walking wounded, breathing 22/min (Green Minor).`,
        `${D2}: Non-ambulatory, breathing 18/min, strong radial pulse, follows commands (Yellow Delayed).`,
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
        `01:08 Update A: ${D1}'s repeat CT is clean and BP rose to 122/78 (withdrawn from redline).`,
        `01:08 Update B: ${W} just lost consciousness (GCS 6) with expanding brain bleed on STAT head CT.`,
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
      directive: `Classify the true nature of each crisis: Surgical Structural Tear vs Medical/Metabolic Crisis vs Ethical/Legal Dispute. Who is the ONLY Surgical Structural Tear?`,
      lines: makeShuffledLines(rng, [
        `${W}: Penetrating knife laceration of the right lung apex (physical structural failure).`,
        `${D1}: Severe diabetic ketoacidosis (biochemical metabolic crisis—needs IV insulin, not scalpel).`,
        `${D2}: Sibling disagreement over healthcare proxy signature (legal/ethical dispute).`,
      ]),
      verdict: winIdx,
      proof: `Ontological classification separates ${W}'s physical structural tear from ${D1}'s metabolic crisis and ${D2}'s legal conflict.`,
      rival: `${D1} is critically ill, but belongs to the medical/metabolic category rather than surgical structural tear.`,
      isClash: false,
    };
  },

  // #79 Analogical abstraction (Meta)
  'analogical-abstraction': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Shared deep principle: "Pressure trapped inside a rigid box crushes vital flow" (works in Brain, Chest, AND Muscle Compartments). Which patient shows this exact universal mechanism?`,
      lines: makeShuffledLines(rng, [
        `${W}: Rock-hard swollen shin after tibia break cutting off foot pulse (Acute Compartment Syndrome).`,
        `${D1}: Surface skin rash from antibiotic allergy.`,
        `${D2}: Mild viral sore throat with normal swallowing.`,
      ]),
      verdict: winIdx,
      proof: `Abstracting the rigid-box pressure principle from skull/chest directly identifies ${W}'s limb Compartment Syndrome.`,
      rival: `${D1} and ${D2} involve inflammatory reactions rather than trapped-compartment pressure.`,
      isClash: false,
    };
  },

  // #80 Integrative reasoning (Meta — full Differential Diagnosis pipeline!)
  'integrative-reasoning': ({ rng, names, winIdx }) => {
    const { W, D1, D2 } = splitTriad(names, winIdx, rng);
    return {
      directive: `Full Trauma Workup: weigh initial odds, update with STAT scans, rule out cleared candidates, and save the lone confirmed shock patient.`,
      lines: makeShuffledLines(rng, [
        `${W}: Trauma prior 40% + FAST scan positive for belly blood (odds surge → 92%) + BP falling 82/48.`,
        `${D1}: Trauma prior 70% + FAST & CT both negative (eliminated → < 3%) + BP steady 120/76.`,
        `${D2}: Trauma prior 30% + minor wrist break + BP 118/74, lactate 1.1 (low risk).`,
      ]),
      verdict: winIdx,
      proof: `Integrating Bayesian update (${W} → 92%) with elimination (${D1} ruled out by clean CT) locks onto ${W} decisively.`,
      rival: `${D1} started with the highest initial prior (70%), but integrative elimination clears them.`,
      isClash: false,
    };
  },
};
