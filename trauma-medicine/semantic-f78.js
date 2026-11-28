// Deep Plain-English Clinical Reasoning Engines — Families 7 & 8 (#62–#80)
// Social, psychological, ethical, reflective, and evidence-auditing trauma decisions.
// Zero filler cards, zero pre-computed answer giveaways, zero medical jargon, synchronized left-wall labels.

import {
  pName,
  formatList,
  uniqueSortedIds,
  pickPlayers,
  fact,
  makeCard,
  buildRivalInfo,
} from './semantic-board.js';

function tagSet(cards, tag) {
  const out = [];
  for (const c of cards) {
    for (const f of c.facts) {
      if (f.tag === tag && f.patients.length) out.push(f.patients[0]);
    }
  }
  return new Set(uniqueSortedIds(out));
}

function factsByTag(cards, tag) {
  const out = [];
  for (const c of cards) {
    for (const f of c.facts) {
      if (f.tag === tag) out.push({ ...f, card: c });
    }
  }
  return out;
}

export const SEMANTIC_F78 = {
  // =========================================================================
  // FAMILY 7: SOCIAL, PSYCHOLOGICAL & ETHICAL REASONING (#62–#70)
  // =========================================================================

  // #62 Interpersonal reasoning (After · Atomic)
  'interpersonal-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0,
        time: '01:00',
        wing: 'Safety Rule',
        wingIndex: 0,
        label: 'Private Room Trigger',
        shown: [
          fact('Move a patient to a PRIVATE exam room (no visitors) if their companion blocks private questions AND the patient shows fear cues.', [], { tag: 'rule' }),
          fact('Supportive family members who let the patient speak freely may stay at bedside.', [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1,
        time: '01:06',
        wing: 'Curtain Note',
        wingIndex: 1,
        label: 'Companion Behavior A',
        shown: [
          fact(`${pName(a)}'s partner refused to leave during the exam and answered every question for ${pName(a)}.`, [a], { tag: 'blocks' }),
          fact(`${pName(b)}'s spouse stepped into the hall right away when the nurse asked for privacy.`, [b], { tag: 'supportive' }),
        ],
        alt: [
          fact(`${pName(a)}'s partner stepped outside politely so ${pName(a)} could talk privately.`, [a], { tag: 'supportive' }),
          fact(`${pName(b)}'s companion refused to step out and cut off every question asked to ${pName(b)}.`, [b], { tag: 'blocks' }),
        ],
      }),
      makeCard({
        index: 2,
        time: '01:12',
        wing: 'Bedside Watch',
        wingIndex: 2,
        label: 'Patient Body Cues A',
        shown: [
          fact(`${pName(a)} glanced down nervously whenever the partner spoke and whispered "I can't talk here."`, [a], { tag: 'fear' }),
          fact(`${pName(c)} looked relaxed and joked easily with their older sister.`, [c], { tag: 'calm_cue' }),
        ],
        alt: [
          fact(`${pName(a)} chatted comfortably and asked their partner to stay and take notes.`, [a], { tag: 'calm_cue' }),
          fact(`${pName(b)} froze up and stared at the floor every time their companion raised their voice.`, [b], { tag: 'fear' }),
        ],
      }),
      makeCard({
        index: 3,
        time: '01:18',
        wing: 'Curtain Note',
        wingIndex: 1,
        label: 'Companion Behavior B',
        shown: [
          fact(`${pName(d)}'s partner interrupted every doctor question and insisted on signing ${pName(d)}'s refusal form early.`, [d], { tag: 'blocks' }),
          fact(`${pName(c)}'s sister stood quietly and let ${pName(c)} describe the fall in their own words.`, [c], { tag: 'supportive' }),
        ],
        alt: [
          fact(`${pName(d)}'s partner sat calmly in the waiting room while ${pName(d)} spoke with the doctor.`, [d], { tag: 'supportive' }),
          fact(`${pName(c)}'s companion blocked the curtain and would not let the nurse speak to ${pName(c)} alone.`, [c], { tag: 'blocks' }),
        ],
      }),
      makeCard({
        index: 4,
        time: '01:24',
        wing: 'Bedside Watch',
        wingIndex: 2,
        label: 'Patient Body Cues B',
        shown: [
          fact(`${pName(d)} trembled when their partner gripped their wrist and stopped answering questions.`, [d], { tag: 'fear' }),
          fact(`${pName(b)} smiled calmly and explained their own symptoms clearly.`, [b], { tag: 'calm_cue' }),
        ],
        alt: [
          fact(`${pName(d)} spoke freely, relaxed, and asked their partner to bring them warm water.`, [d], { tag: 'calm_cue' }),
          fact(`${pName(c)} flinched and went completely silent whenever their companion leaned in.`, [c], { tag: 'fear' }),
        ],
      }),
      makeCard({
        index: 5,
        time: '01:30',
        wing: 'Social Work',
        wingIndex: 0,
        label: 'Safe Discharges',
        shown: [
          fact(`${pName(e)} arrived alone with a minor scraped knee and is cleared to go home.`, [e], { tag: 'safe', calm: true }),
          fact(`${pName(f)} is waiting calmly for routine discharge paperwork.`, [f], { tag: 'safe', calm: true }),
        ],
      }),
    ];

    const evaluate = (resolved) => {
      const blocks = tagSet(resolved, 'blocks');
      const fear = tagSet(resolved, 'fear');
      const targets = uniqueSortedIds([...blocks].filter((id) => fear.has(id)));
      return {
        targets,
        proof: `Cross-checking companion control against patient fear cues flags ${formatList(targets)} for an immediate private-room check.`,
        rival: buildRivalInfo(targets, [a, b, c, d], (r) => `${pName(r)} did not show both companion control AND patient fear cues.`),
      };
    };

    return {
      scenario: {
        title: 'Private Bedside Safety Check',
        dispatch: 'Quietly separate any patient whose companion is controlling the room while the patient shows fear cues.',
      },
      order: 'Move EVERY patient who shows BOTH companion control AND patient fear cues to a private room.',
      detail: 'Pair the Companion Behavior cards with the Patient Body Cues cards.',
      cards,
      evaluate,
      bayDefaultLabel: 'Family Talk',
      bayLabels: {
        [a]: 'Bedside Consult',
        [b]: 'Bedside Consult',
        [c]: 'Bedside Consult',
        [d]: 'Bedside Consult',
        [e]: 'Cleared Home',
        [f]: 'Discharge Desk',
      },
    };
  },

  // #63 Mentalistic reasoning (After · Composite)
  'mentalistic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0,
        time: '01:00',
        wing: 'Family Desk',
        wingIndex: 0,
        label: 'Update Priority Rule',
        shown: [
          fact('Update a family IN PERSON right now if the patient just moved to emergency surgery AND the family last heard "everything is minor / stable."', [], { tag: 'rule' }),
          fact('Families already told about surgery by the charge nurse do not have an outdated picture.', [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1,
        time: '01:08',
        wing: 'OR Board',
        wingIndex: 1,
        label: 'Live Surgery Transfers',
        shown: [
          fact(`${pName(a)} was just rushed into Operating Room 1 for hidden internal bleeding.`, [a], { tag: 'in_or' }),
          fact(`${pName(b)} was just rushed into Operating Room 2 for a crushed artery.`, [b], { tag: 'in_or' }),
        ],
        alt: [
          fact(`${pName(a)} is stable in recovery — surgery was cancelled.`, [a], { tag: 'not_or' }),
          fact(`${pName(c)} was just rushed into Operating Room 1 for a sudden chest bleed.`, [c], { tag: 'in_or' }),
        ],
      }),
      makeCard({
        index: 2,
        time: '01:15',
        wing: 'Waiting Room',
        wingIndex: 2,
        label: 'What Families Think A',
        shown: [
          fact(`${pName(a)}'s spouse only saw the 00:30 ambulance text saying "minor bump, doing fine" and is picking up coffee.`, [a], { tag: 'outdated' }),
          fact(`${pName(b)}'s parent just spoke face-to-face with the surgeon 3 minutes ago and signed the OR form.`, [b], { tag: 'informed' }),
        ],
        alt: [
          fact(`${pName(a)}'s spouse was already briefed by the surgeon right outside OR 1.`, [a], { tag: 'informed' }),
          fact(`${pName(b)}'s parent still believes ${pName(b)} is just getting an X-ray in the hallway.`, [b], { tag: 'outdated' }),
        ],
      }),
      makeCard({
        index: 3,
        time: '01:22',
        wing: 'OR Board',
        wingIndex: 1,
        label: 'Ward Status Check',
        shown: [
          fact(`${pName(c)} is sitting upright in Observation with normal blood pressure — no surgery needed.`, [c], { tag: 'not_or' }),
          fact(`${pName(d)} was just rushed into Operating Room 3 after a sudden drop in blood pressure.`, [d], { tag: 'in_or' }),
        ],
        alt: [
          fact(`${pName(c)} was just rushed into Operating Room 3 for emergency repair.`, [c], { tag: 'in_or' }),
          fact(`${pName(d)} stayed completely stable in Observation — no surgery needed.`, [d], { tag: 'not_or' }),
        ],
      }),
      makeCard({
        index: 4,
        time: '01:28',
        wing: 'Waiting Room',
        wingIndex: 2,
        label: 'What Families Think B',
        shown: [
          fact(`${pName(d)}'s sibling was told at check-in "just routine stitches" and has received zero updates since.`, [d], { tag: 'outdated' }),
          fact(`${pName(c)}'s family was told "minor checkup" — which matches ${pName(c)}'s calm status.`, [c], { tag: 'outdated' }),
        ],
        alt: [
          fact(`${pName(d)}'s sibling already received a full live update from the OR nurse.`, [d], { tag: 'informed' }),
          fact(`${pName(c)}'s family only heard "minor checkup" an hour ago and knows nothing about any change.`, [c], { tag: 'outdated' }),
        ],
      }),
      makeCard({
        index: 5,
        time: '01:32',
        wing: 'Waiting Room',
        wingIndex: 0,
        label: 'Cleared Visits',
        shown: [
          fact(`${pName(e)} is walking out to the lobby with their family — cleared to go home.`, [e], { tag: 'safe', calm: true }),
          fact(`${pName(f)} arrived for a minor bruise and is waiting for discharge papers.`, [f], { tag: 'safe', calm: true }),
        ],
      }),
    ];

    const evaluate = (resolved) => {
      const inOr = tagSet(resolved, 'in_or');
      const outdated = tagSet(resolved, 'outdated');
      const targets = uniqueSortedIds([...inOr].filter((id) => outdated.has(id)));
      return {
        targets,
        proof: `${formatList(targets)} went to emergency surgery while their family still believes everything is minor — go update them in person immediately.`,
        rival: buildRivalInfo(targets, [a, b, c, d], (r) =>
          inOr.has(r)
            ? `${pName(r)}'s family was already briefed about surgery.`
            : `${pName(r)} did not go into emergency surgery.`
        ),
      };
    };

    return {
      scenario: {
        title: 'Waiting-Room Belief Check',
        dispatch: 'Compare the live OR board against what each waiting family currently believes is happening.',
      },
      order: 'Go update the family of EVERY patient who is in emergency surgery while their family still thinks it is minor.',
      detail: 'Match Live Surgery Transfers against What Families Think.',
      cards,
      evaluate,
      bayDefaultLabel: 'Family Update',
      bayLabels: {
        [a]: 'OR / Family Check',
        [b]: 'OR / Family Check',
        [c]: 'OR / Family Check',
        [d]: 'OR / Family Check',
        [e]: 'Cleared Home',
        [f]: 'Discharge Desk',
      },
    };
  },

  // #64 Motivational reasoning (After · Composite)
  'motivational-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0,
        time: '01:00',
        wing: 'Care Team',
        wingIndex: 0,
        label: 'Refusal Triage Rule',
        shown: [
          fact('Call the Social Worker + Attending right now if a patient is trying to leave AGAINST medical advice due to a solvable life worry AND still has dangerous vitals.', [], { tag: 'rule' }),
          fact('Patients with normal vitals who simply prefer home rest do not need emergency hold intervention.', [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1,
        time: '01:08',
        wing: 'Bedside Talk',
        wingIndex: 1,
        label: 'Why They Want to Leave A',
        shown: [
          fact(`${pName(a)} is pulling off the monitor cords saying "Nobody is home to watch my 4-year-old — I have to go!"`, [a], { tag: 'barrier' }),
          fact(`${pName(b)} calmly says "My ride is here and I hate hospitals" while packing their jacket.`, [b], { tag: 'pref' }),
        ],
        alt: [
          fact(`${pName(a)} agreed happily to stay overnight once the nurse brought a blanket.`, [a], { tag: 'staying' }),
          fact(`${pName(b)} whispered "If I miss my 5 AM warehouse shift I lose rent" while trying to walk out.`, [b], { tag: 'barrier' }),
        ],
      }),
      makeCard({
        index: 2,
        time: '01:14',
        wing: 'Nurse Vitals',
        wingIndex: 2,
        label: 'Hidden Danger Check A',
        shown: [
          fact(`${pName(a)}'s blood pressure just dropped to 84/50 with pale sweat and a racing pulse of 128.`, [a], { tag: 'danger' }),
          fact(`${pName(c)}'s blood pressure is 122/76 with a clean chest scan and normal labs.`, [c], { tag: 'stable_med' }),
        ],
        alt: [
          fact(`${pName(a)}'s blood pressure is steady at 120/76 with completely normal tests.`, [a], { tag: 'stable_med' }),
          fact(`${pName(b)}'s blood pressure dropped to 82/48 and oxygen is falling to 88%.`, [b], { tag: 'danger' }),
        ],
      }),
      makeCard({
        index: 3,
        time: '01:20',
        wing: 'Bedside Talk',
        wingIndex: 1,
        label: 'Why They Want to Leave B',
        shown: [
          fact(`${pName(c)} is trying to leave because they worry their dog is locked inside alone.`, [c], { tag: 'barrier' }),
          fact(`${pName(d)} is trying to leave early saying "I have no insurance and can't afford an ICU bill."`, [d], { tag: 'barrier' }),
        ],
        alt: [
          fact(`${pName(c)} is begging to leave out of fear of hospital bills even though they feel dizzy.`, [c], { tag: 'barrier' }),
          fact(`${pName(d)} agreed to stay in the ward after speaking with billing support.`, [d], { tag: 'staying' }),
        ],
      }),
      makeCard({
        index: 4,
        time: '01:26',
        wing: 'Nurse Vitals',
        wingIndex: 2,
        label: 'Hidden Danger Check B',
        shown: [
          fact(`${pName(d)}'s ultrasound just showed active internal belly fluid and a heart rate of 132.`, [d], { tag: 'danger' }),
          fact(`${pName(b)}'s vitals are normal (BP 124/78, pulse 76) after a minor sprained ankle.`, [b], { tag: 'stable_med' }),
        ],
        alt: [
          fact(`${pName(d)}'s repeat scan is clear and blood pressure is steady at 118/74.`, [d], { tag: 'stable_med' }),
          fact(`${pName(c)}'s heart monitor just showed dangerous skipped beats and BP dropped to 80/46.`, [c], { tag: 'danger' }),
        ],
      }),
      makeCard({
        index: 5,
        time: '01:30',
        wing: 'Discharge',
        wingIndex: 0,
        label: 'Routine Home Releases',
        shown: [
          fact(`${pName(e)} finished stitches and is cleared to go home safely.`, [e], { tag: 'safe', calm: true }),
          fact(`${pName(f)} is fully recovered and waiting for routine paperwork.`, [f], { tag: 'safe', calm: true }),
        ],
      }),
    ];

    const evaluate = (resolved) => {
      const barrier = tagSet(resolved, 'barrier');
      const danger = tagSet(resolved, 'danger');
      const targets = uniqueSortedIds([...barrier].filter((id) => danger.has(id)));
      return {
        targets,
        proof: `${formatList(targets)} is trying to walk out over a solvable real-life worry while carrying life-threatening vitals — solve the worry and keep them safe.`,
        rival: buildRivalInfo(targets, [a, b, c, d], (r) =>
          barrier.has(r)
            ? `${pName(r)} has a real worry, but their medical vitals are stable.`
            : `${pName(r)} is not walking out over an unmet outside worry with crashing vitals.`
        ),
      };
    };

    return {
      scenario: {
        title: 'Leaving Against Advice',
        dispatch: 'Look beneath "I want to leave" — separate solvable outside fears with hidden medical danger from safe departures.',
      },
      order: 'Intervene for EVERY patient trying to leave over an outside life worry who STILL has dangerous vitals.',
      detail: 'Pair Why They Want to Leave with the Hidden Danger Check cards.',
      cards,
      evaluate,
      bayDefaultLabel: 'AMA Risk',
      bayLabels: {
        [a]: 'Refusal Risk',
        [b]: 'Refusal Risk',
        [c]: 'Refusal Risk',
        [d]: 'Refusal Risk',
        [e]: 'Cleared Home',
        [f]: 'Discharge Desk',
      },
    };
  },

  // #65 Moral reasoning (After · Composite)
  'moral-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0,
        time: '01:00',
        wing: 'Ethics Board',
        wingIndex: 0,
        label: 'Honest Disclosure Duty',
        shown: [
          fact('Whenever a medication dosing error happens, doctors have an absolute duty to give the reversal drug AND honestly disclose the error.', [], { tag: 'rule' }),
          fact('Never hide a dosing mistake quietly — audit Pharmacy Logs against Bedside Orders to catch every wrong dose.', [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1,
        time: '01:08',
        wing: 'Doctor Order',
        wingIndex: 1,
        label: 'Prescribed Safe Doses',
        shown: [
          fact(`${pName(a)} was prescribed 5 units of blood-sugar insulin.`, [a], { tag: 'ord', dose: 5 }),
          fact(`${pName(b)} was prescribed 10 mg of pain medicine.`, [b], { tag: 'ord', dose: 10 }),
        ],
      }),
      makeCard({
        index: 2,
        time: '01:14',
        wing: 'Doctor Order',
        wingIndex: 1,
        label: 'Prescribed Safe Doses B',
        shown: [
          fact(`${pName(c)} was prescribed 4 mg of blood thinner.`, [c], { tag: 'ord', dose: 4 }),
          fact(`${pName(d)} was prescribed 20 mg of blood-pressure medicine.`, [d], { tag: 'ord', dose: 20 }),
        ],
      }),
      makeCard({
        index: 3,
        time: '01:22',
        wing: 'IV Pump Log',
        wingIndex: 2,
        label: 'Actual Delivered A',
        shown: [
          fact(`${pName(a)}'s IV pump actually delivered 50 units of insulin — nurse whispered "just slip them sugar quietly."`, [a], { tag: 'giv', dose: 50 }),
          fact(`${pName(b)}'s IV pump actually delivered 10 mg of pain medicine on schedule.`, [b], { tag: 'giv', dose: 10 }),
        ],
        alt: [
          fact(`${pName(a)}'s IV pump actually delivered 5 units of insulin as ordered.`, [a], { tag: 'giv', dose: 5 }),
          fact(`${pName(b)}'s IV pump actually delivered 100 mg of pain medicine — clerk suggested erasing the log.`, [b], { tag: 'giv', dose: 100 }),
        ],
      }),
      makeCard({
        index: 4,
        time: '01:28',
        wing: 'IV Pump Log',
        wingIndex: 2,
        label: 'Actual Delivered B',
        shown: [
          fact(`${pName(c)}'s IV pump actually delivered 40 mg of blood thinner instead of 4 mg.`, [c], { tag: 'giv', dose: 40 }),
          fact(`${pName(d)}'s IV pump actually delivered 20 mg of blood-pressure medicine on schedule.`, [d], { tag: 'giv', dose: 20 }),
        ],
        alt: [
          fact(`${pName(c)}'s IV pump actually delivered 4 mg of blood thinner as ordered.`, [c], { tag: 'giv', dose: 4 }),
          fact(`${pName(d)}'s IV pump actually delivered 200 mg of blood-pressure medicine — someone taped over the alarm.`, [d], { tag: 'giv', dose: 200 }),
        ],
      }),
      makeCard({
        index: 5,
        time: '01:32',
        wing: 'Pharmacy',
        wingIndex: 0,
        label: 'Zero-Med Bays',
        shown: [
          fact(`${pName(e)} received zero IV medicines — cleared to go home with an ice pack.`, [e], { tag: 'safe', calm: true }),
          fact(`${pName(f)} is waiting for routine stitches only.`, [f], { tag: 'safe', calm: true }),
        ],
      }),
    ];

    const evaluate = (resolved) => {
      const ord = new Map();
      const giv = new Map();
      for (const f of factsByTag(resolved, 'ord')) ord.set(f.patients[0], f.dose);
      for (const f of factsByTag(resolved, 'giv')) giv.set(f.patients[0], f.dose);
      const targets = uniqueSortedIds(
        [a, b, c, d].filter((id) => ord.has(id) && giv.has(id) && giv.get(id) !== ord.get(id))
      );
      return {
        targets,
        proof: `Comparing prescribed doses against actual IV pump logs catches 10× overdoses on ${formatList(targets)} — reverse immediately and disclose honestly.`,
        rival: buildRivalInfo(targets, [a, b, c, d], (r) => `${pName(r)} received the exact prescribed dose (${ord.get(r)}).`),
      };
    };

    return {
      scenario: {
        title: 'Medication Error & Candor Audit',
        dispatch: 'Compare prescribed doses against actual IV pump logs — never cover up a 10× dosing error.',
      },
      order: 'Reverse AND honestly disclose EVERY patient whose actual IV dose exceeded their prescribed dose.',
      detail: 'Compare Prescribed Safe Doses against Actual Delivered IV Pump Logs.',
      cards,
      evaluate,
      bayDefaultLabel: 'Dose Audit',
      bayLabels: {
        [a]: 'IV Infusion',
        [b]: 'IV Infusion',
        [c]: 'IV Infusion',
        [d]: 'IV Infusion',
        [e]: 'Cleared Home',
        [f]: 'Stitches Only',
      },
    };
  },

  // #66 Ethical reasoning (After · Composite)
  'ethical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0,
        time: '01:00',
        wing: 'Bioethics',
        wingIndex: 0,
        label: 'Consent & Autonomy Rules',
        shown: [
          fact('Rule 1: ALWAYS honor a verified signed Do-Not-Resuscitate (DNR) form or a clear-headed adult refusing treatment.', [], { tag: 'rule' }),
          fact('Rule 2: Rush full life-saving resuscitation to any crashing patient who is Full Code (wants all care) OR unconscious with no DNR.', [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1,
        time: '01:06',
        wing: 'Code Status',
        wingIndex: 1,
        label: 'Legal Wishes File A',
        shown: [
          fact(`${pName(a)} carries a verified Full-Code card asking for every life-saving measure.`, [a], { tag: 'wants_care' }),
          fact(`${pName(b)} has a verified signed Comfort-Only DNR with family confirming "no machines."`, [b], { tag: 'dnr' }),
        ],
        alt: [
          fact(`${pName(a)} has a verified signed Comfort-Only DNR signed with their physician last month.`, [a], { tag: 'dnr' }),
          fact(`${pName(b)} carries a verified Full-Code card requesting full emergency treatment.`, [b], { tag: 'wants_care' }),
        ],
      }),
      makeCard({
        index: 2,
        time: '01:12',
        wing: 'Bay Monitor',
        wingIndex: 2,
        label: 'Bedside Medical State A',
        shown: [
          fact(`${pName(a)}'s blood pressure just plunged to 74/42 from active bleeding.`, [a], { tag: 'crashing' }),
          fact(`${pName(b)}'s breathing slowed to 6/min in end-stage organ failure.`, [b], { tag: 'crashing' }),
        ],
      }),
      makeCard({
        index: 3,
        time: '01:18',
        wing: 'Code Status',
        wingIndex: 1,
        label: 'Legal Wishes File B',
        shown: [
          fact(`${pName(c)} is wide awake, clear-headed, and signed a refusal of blood transfusion for personal beliefs.`, [c], { tag: 'refused' }),
          fact(`${pName(d)} arrived unconscious from a highway crash with NO DNR on file.`, [d], { tag: 'wants_care' }),
        ],
        alt: [
          fact(`${pName(c)} arrived unconscious after fainting — NO refusal or DNR form exists.`, [c], { tag: 'wants_care' }),
          fact(`${pName(d)} has a verified signed Comfort-Only DNR verified by two witnesses.`, [d], { tag: 'dnr' }),
        ],
      }),
      makeCard({
        index: 4,
        time: '01:24',
        wing: 'Bay Monitor',
        wingIndex: 2,
        label: 'Bedside Medical State B',
        shown: [
          fact(`${pName(c)} has falling red blood cells and low blood pressure (84/50).`, [c], { tag: 'crashing' }),
          fact(`${pName(d)} has a closing airway and oxygen dropping to 81%.`, [d], { tag: 'crashing' }),
        ],
      }),
      makeCard({
        index: 5,
        time: '01:28',
        wing: 'Lobby',
        wingIndex: 0,
        label: 'Routine Visits',
        shown: [
          fact(`${pName(e)} has a minor wrist sprain with normal blood pressure — cleared to go home.`, [e], { tag: 'safe', calm: true }),
          fact(`${pName(f)} is resting comfortably with normal vitals.`, [f], { tag: 'safe', calm: true }),
        ],
      }),
    ];

    const evaluate = (resolved) => {
      const wants = tagSet(resolved, 'wants_care');
      const crashing = tagSet(resolved, 'crashing');
      const targets = uniqueSortedIds([...wants].filter((id) => crashing.has(id)));
      return {
        targets,
        proof: `Honoring verified DNRs and clear-headed refusals leaves ${formatList(targets)} for full emergency resuscitation.`,
        rival: buildRivalInfo(targets, [a, b, c, d], (r) => `${pName(r)} has a verified DNR or clear-headed refusal that doctors must respect.`),
      };
    };

    return {
      scenario: {
        title: 'Autonomy vs. Resuscitation',
        dispatch: 'Balance saving lives against honoring verified DNR forms and clear-headed patient refusals.',
      },
      order: 'Rush FULL RESUSCITATION to every crashing patient who wants care or has no DNR/refusal.',
      detail: 'Check Legal Wishes Files against Bedside Medical States.',
      cards,
      evaluate,
      bayDefaultLabel: 'Code Status',
      bayLabels: {
        [a]: 'Critical · Ethics',
        [b]: 'Critical · Ethics',
        [c]: 'Critical · Ethics',
        [d]: 'Critical · Ethics',
        [e]: 'Cleared Home',
        [f]: 'Stable · Obs',
      },
    };
  },

  // #67 Pragmatic reasoning (Before · Atomic)
  'pragmatic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0,
        time: '01:00',
        wing: 'Discharge Desk',
        wingIndex: 0,
        label: 'Real-World Plan Check',
        shown: [
          fact('Keep a patient in the hospital overnight if their home care plan CANNOT actually work in their real living situation.', [], { tag: 'rule' }),
          fact('A prescription that looks fine on paper fails if the patient has no way to store it or get up the stairs.', [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1,
        time: '01:08',
        wing: 'Care Plan',
        wingIndex: 1,
        label: 'Doctor Home Plans A',
        shown: [
          fact(`${pName(a)}'s plan requires refrigerated insulin injections every 6 hours.`, [a], { tag: 'needs_fridge' }),
          fact(`${pName(b)}'s plan requires daily blood-thinner pills kept at room temperature.`, [b], { tag: 'room_temp' }),
        ],
      }),
      makeCard({
        index: 2,
        time: '01:14',
        wing: 'Home Reality',
        wingIndex: 2,
        label: 'Living Conditions A',
        shown: [
          fact(`${pName(a)} is sleeping in a car this week with no refrigerator or power outlet.`, [a], { tag: 'no_fridge' }),
          fact(`${pName(b)} lives on the ground floor with a helpful roommate and pharmacy next door.`, [b], { tag: 'good_home' }),
        ],
        alt: [
          fact(`${pName(a)} lives with family in a house with a full kitchen and backup cooler.`, [a], { tag: 'good_home' }),
          fact(`${pName(b)}'s plan was switched to chilled IV bags, and ${pName(b)}'s power is shut off at home.`, [b], { tag: 'impossible' }),
        ],
      }),
      makeCard({
        index: 3,
        time: '01:20',
        wing: 'Care Plan',
        wingIndex: 1,
        label: 'Doctor Home Plans B',
        shown: [
          fact(`${pName(c)} has a heavy plaster leg cast and must stay completely off stairs for 2 weeks.`, [c], { tag: 'no_stairs' }),
          fact(`${pName(d)} has a wrist splint and only needs simple pain tablets by mouth.`, [d], { tag: 'simple_plan' }),
        ],
      }),
      makeCard({
        index: 4,
        time: '01:26',
        wing: 'Home Reality',
        wingIndex: 2,
        label: 'Living Conditions B',
        shown: [
          fact(`${pName(c)} lives alone in a 5th-floor walk-up apartment with a broken elevator.`, [c], { tag: 'stairs_only' }),
          fact(`${pName(d)} lives in a ground-floor apartment with a neighbor picking up their tablets.`, [d], { tag: 'good_home' }),
        ],
        alt: [
          fact(`${pName(c)} is staying at their sister's single-story house with a ramp.`, [c], { tag: 'good_home' }),
          fact(`${pName(d)} lost their wallet and glasses in the crash and has no safe way home tonight.`, [d], { tag: 'impossible' }),
        ],
      }),
      makeCard({
        index: 5,
        time: '01:30',
        wing: 'Lobby',
        wingIndex: 0,
        label: 'Ready to Walk Out',
        shown: [
          fact(`${pName(e)} has a minor bruised elbow — cleared to go home with family waiting outside.`, [e], { tag: 'safe', calm: true }),
          fact(`${pName(f)} finished routine check and has a ride home.`, [f], { tag: 'safe', calm: true }),
        ],
      }),
    ];

    const evaluate = (resolved) => {
      const noFridge = tagSet(resolved, 'no_fridge');
      const needsFridge = tagSet(resolved, 'needs_fridge');
      const stairsOnly = tagSet(resolved, 'stairs_only');
      const noStairs = tagSet(resolved, 'no_stairs');
      const impossible = tagSet(resolved, 'impossible');
      const targets = uniqueSortedIds(
        [a, b, c, d].filter(
          (id) =>
            impossible.has(id) ||
            (needsFridge.has(id) && noFridge.has(id)) ||
            (noStairs.has(id) && stairsOnly.has(id))
        )
      );
      return {
        targets,
        proof: `Checking paper plans against real life shows home discharge fails for ${formatList(targets)} — hold them for social-work placement.`,
        rival: buildRivalInfo(targets, [a, b, c, d], (r) => `${pName(r)}'s real living setup supports their discharge plan safely.`),
      };
    };

    return {
      scenario: {
        title: 'Safe-Discharge Reality Check',
        dispatch: 'A discharge plan only works if the patient can actually follow it at home tonight.',
      },
      order: 'Hold overnight EVERY patient whose home care plan CANNOT work in their actual living situation.',
      detail: 'Cross-check Doctor Home Plans against Living Conditions.',
      cards,
      evaluate,
      bayDefaultLabel: 'Discharge Eval',
      bayLabels: {
        [a]: 'Home Plan Check',
        [b]: 'Home Plan Check',
        [c]: 'Home Plan Check',
        [d]: 'Home Plan Check',
        [e]: 'Cleared Home',
        [f]: 'Cleared Home',
      },
    };
  },

  // #68 Contextual reasoning (Inside · Atomic)
  'contextual-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0,
        time: '01:00',
        wing: 'Resus Rule',
        wingIndex: 0,
        label: 'Same Number, Different Meaning',
        shown: [
          fact('All 4 active bays currently read the EXACT SAME blood pressure: 102/64.', [], { tag: 'rule' }),
          fact('Treat for HIDDEN SHOCK anyone whose top blood pressure has fallen by 40 points OR MORE below their normal baseline!', [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1,
        time: '01:06',
        wing: 'Monitor Wall',
        wingIndex: 1,
        label: 'Current Readings A',
        shown: [
          fact(`${pName(a)}: Current BP 102/64 after a car-door impact.`, [a], { tag: 'cur', bp: 102 }),
          fact(`${pName(b)}: Current BP 102/64 after a bicycle spill.`, [b], { tag: 'cur', bp: 102 }),
        ],
      }),
      makeCard({
        index: 2,
        time: '01:12',
        wing: 'Primary Chart',
        wingIndex: 2,
        label: 'Normal Baselines A',
        shown: [
          fact(`${pName(a)}'s clinic chart shows lifelong high blood pressure normally running at 168/98.`, [a], { tag: 'base', bp: 168 }),
          fact(`${pName(b)} is a 24-year-old distance runner whose normal resting BP is 100/62.`, [b], { tag: 'base', bp: 100 }),
        ],
        alt: [
          fact(`${pName(a)} is a healthy swimmer whose normal resting BP is 104/64.`, [a], { tag: 'base', bp: 104 }),
          fact(`${pName(b)}'s clinic chart shows chronic high blood pressure normally running at 164/96.`, [b], { tag: 'base', bp: 164 }),
        ],
      }),
      makeCard({
        index: 3,
        time: '01:18',
        wing: 'Monitor Wall',
        wingIndex: 1,
        label: 'Current Readings B',
        shown: [
          fact(`${pName(c)}: Current BP 102/64 after falling off a stepladder.`, [c], { tag: 'cur', bp: 102 }),
          fact(`${pName(d)}: Current BP 102/64 after a workshop burn.`, [d], { tag: 'cur', bp: 102 }),
        ],
      }),
      makeCard({
        index: 4,
        time: '01:24',
        wing: 'Primary Chart',
        wingIndex: 2,
        label: 'Normal Baselines B',
        shown: [
          fact(`${pName(c)}'s clinic chart shows untreated high blood pressure normally running at 156/92.`, [c], { tag: 'base', bp: 156 }),
          fact(`${pName(d)}'s clinic chart shows a normal resting BP of 112/70.`, [d], { tag: 'base', bp: 112 }),
        ],
        alt: [
          fact(`${pName(c)}'s clinic chart shows a normal resting BP of 110/68.`, [c], { tag: 'base', bp: 110 }),
          fact(`${pName(d)}'s clinic chart shows chronic high blood pressure normally running at 172/100.`, [d], { tag: 'base', bp: 172 }),
        ],
      }),
      makeCard({
        index: 5,
        time: '01:30',
        wing: 'Lobby',
        wingIndex: 0,
        label: 'Unrelated Bays',
        shown: [
          fact(`${pName(e)} has a minor thumb cut — normal BP, cleared to go home.`, [e], { tag: 'safe', calm: true }),
          fact(`${pName(f)} is waiting for stitches only.`, [f], { tag: 'safe', calm: true }),
        ],
      }),
    ];

    const evaluate = (resolved) => {
      const cur = new Map();
      const base = new Map();
      for (const f of factsByTag(resolved, 'cur')) cur.set(f.patients[0], f.bp);
      for (const f of factsByTag(resolved, 'base')) base.set(f.patients[0], f.bp);
      const targets = uniqueSortedIds(
        [a, b, c, d].filter((id) => base.has(id) && cur.has(id) && base.get(id) - cur.get(id) >= 40)
      );
      return {
        targets,
        proof: `Subtracting current BP (102) from each normal baseline proves ${formatList(targets)} dropped ≥ 40 points into hidden shock.`,
        rival: buildRivalInfo(targets, [a, b, c, d], (r) => `${pName(r)}'s baseline is ${base.get(r)}, so 102/64 is close to their normal pressure.`),
      };
    };

    return {
      scenario: {
        title: 'Identical Numbers, Hidden Shock',
        dispatch: 'Four bays read 102/64 — compare each reading against their normal baseline to see who actually crashed.',
      },
      order: 'Treat EVERY patient whose top blood pressure dropped 40+ points below their normal baseline.',
      detail: 'Compare Current BP (102) against each patient\'s Normal Baseline card.',
      cards,
      evaluate,
      bayDefaultLabel: 'BP 102/64 Eval',
      bayLabels: {
        [a]: 'BP 102/64',
        [b]: 'BP 102/64',
        [c]: 'BP 102/64',
        [d]: 'BP 102/64',
        [e]: 'Cleared Home',
        [f]: 'Stitches Only',
      },
    };
  },

  // #69 Narrative reasoning (After · Composite)
  'narrative-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0,
        time: '01:00',
        wing: 'Forensic Desk',
        wingIndex: 0,
        label: 'Story vs. Physics Rule',
        shown: [
          fact('Flag a chart for Urgent Protection Review whenever the patient\'s claimed injury story CANNOT physically match the X-ray or bruise timeline.', [], { tag: 'rule' }),
          fact('Fresh purple bruises happen within hours; yellow-green bruises and healed rib calluses are days to weeks old.', [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1,
        time: '01:08',
        wing: 'Intake Story',
        wingIndex: 1,
        label: 'Claimed Accounts A',
        shown: [
          fact(`${pName(a)}'s intake says "slipped gently onto a carpeted floor 20 minutes ago — never fell before."`, [a], { tag: 'story_gentle' }),
          fact(`${pName(b)}'s intake says "slipped on wet ice 30 minutes ago and caught myself with my right palm."`, [b], { tag: 'story_match' }),
        ],
      }),
      makeCard({
        index: 2,
        time: '01:15',
        wing: 'X-Ray & Exam',
        wingIndex: 2,
        label: 'Physical Findings A',
        shown: [
          fact(`${pName(a)}'s X-ray reveals 3 ribs at DIFFERENT healing stages (weeks old + brand new) plus yellow-green bruises.`, [a], { tag: 'mismatch' }),
          fact(`${pName(b)}'s X-ray shows one fresh right-wrist break with fresh redness matching a 30-minute fall.`, [b], { tag: 'matches' }),
        ],
        alt: [
          fact(`${pName(a)}'s X-ray shows one fresh hip bruise matching a single soft slip 20 minutes ago.`, [a], { tag: 'matches' }),
          fact(`${pName(b)}'s X-ray shows old healed fractures of three different ages that contradict a single ice slip.`, [b], { tag: 'mismatch' }),
        ],
      }),
      makeCard({
        index: 3,
        time: '01:20',
        wing: 'Intake Story',
        wingIndex: 1,
        label: 'Claimed Accounts B',
        shown: [
          fact(`${pName(c)}'s intake says "bumped lightly against a plastic laundry basket tonight."`, [c], { tag: 'story_gentle' }),
          fact(`${pName(d)}'s intake says "dropped a heavy toolbox onto my left foot 1 hour ago."`, [d], { tag: 'story_match' }),
        ],
      }),
      makeCard({
        index: 4,
        time: '01:28',
        wing: 'X-Ray & Exam',
        wingIndex: 2,
        label: 'Physical Findings B',
        shown: [
          fact(`${pName(c)}'s exam shows high-force defensive forearm fractures AND deep wrap-around grip marks.`, [c], { tag: 'mismatch' }),
          fact(`${pName(d)}'s X-ray shows one crushed left toe with fresh swelling matching a dropped weight.`, [d], { tag: 'matches' }),
        ],
        alt: [
          fact(`${pName(c)}'s exam shows one minor fresh shin scrape matching a light bump.`, [c], { tag: 'matches' }),
          fact(`${pName(d)}'s exam shows spiral upper-arm breaks and week-old bruises unrelated to a foot drop.`, [d], { tag: 'mismatch' }),
        ],
      }),
      makeCard({
        index: 5,
        time: '01:32',
        wing: 'Lobby',
        wingIndex: 0,
        label: 'Cleared Cases',
        shown: [
          fact(`${pName(e)} has a clean ankle sprain from jogging — cleared to go home.`, [e], { tag: 'safe', calm: true }),
          fact(`${pName(f)} is waiting for routine stitches only.`, [f], { tag: 'safe', calm: true }),
        ],
      }),
    ];

    const evaluate = (resolved) => {
      const targets = uniqueSortedIds([...tagSet(resolved, 'mismatch')]);
      return {
        targets,
        proof: `Comparing the claimed story against physical healing stages and force patterns flags ${formatList(targets)} for Protection Review.`,
        rival: buildRivalInfo(targets, [a, b, c, d], (r) => `${pName(r)}'s physical X-ray and bruise timeline match the claimed accident.`),
      };
    };

    return {
      scenario: {
        title: 'Injury Story vs. Physical Evidence',
        dispatch: 'Compare each claimed accident story against the physical X-ray and bruise timeline.',
      },
      order: 'Flag EVERY patient whose physical injury timeline CANNOT match their claimed story.',
      detail: 'Check Claimed Accounts against Physical Findings across the board.',
      cards,
      evaluate,
      bayDefaultLabel: 'Forensic Review',
      bayLabels: {
        [a]: 'Story Audit',
        [b]: 'Story Audit',
        [c]: 'Story Audit',
        [d]: 'Story Audit',
        [e]: 'Cleared Home',
        [f]: 'Stitches Only',
      },
    };
  },

  // #70 Perspectival reasoning (After · Composite)
  'perspectival-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0,
        time: '01:00',
        wing: 'Family Room',
        wingIndex: 0,
        label: 'Three-Voice Alignment Rule',
        shown: [
          fact('Clear a patient for urgent surgery right now ONLY when ALL THREE viewpoints agree: Patient\'s own wish + Family voice + Surgeon\'s medical odds.', [], { tag: 'rule' }),
          fact('If any single viewpoint clashes (e.g., patient wants comfort only, OR odds are futile), hold for a family ethics meeting instead.', [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1,
        time: '01:08',
        wing: 'Patient Voice',
        wingIndex: 1,
        label: 'Written Patient Wishes',
        shown: [
          fact(`${pName(a)}'s own signed care plan asks for surgery if meaningful recovery is likely.`, [a], { tag: 'p_yes' }),
          fact(`${pName(b)}'s own signed care plan asks for comfort care only — NO emergency surgery.`, [b], { tag: 'p_no' }),
        ],
        alt: [
          fact(`${pName(a)}'s own signed care plan asks for comfort care only — NO surgery.`, [a], { tag: 'p_no' }),
          fact(`${pName(b)}'s own signed care plan asks for full surgical repair if recovery is likely.`, [b], { tag: 'p_yes' }),
        ],
      }),
      makeCard({
        index: 2,
        time: '01:14',
        wing: 'Family & Odds',
        wingIndex: 2,
        label: 'Spokesperson & Surgeon A',
        shown: [
          fact(`${pName(a)}'s spouse agrees to operate AND the surgeon projects an 85% full recovery.`, [a], { tag: 'fs_yes' }),
          fact(`${pName(b)}'s cousin demands surgery AND the surgeon projects an 80% recovery.`, [b], { tag: 'fs_yes' }),
        ],
      }),
      makeCard({
        index: 3,
        time: '01:20',
        wing: 'Patient Voice',
        wingIndex: 1,
        label: 'Written Patient Wishes B',
        shown: [
          fact(`${pName(c)}'s own signed care plan requests every reasonable surgery.`, [c], { tag: 'p_yes' }),
          fact(`${pName(d)}'s own signed care plan requests full surgery if recovery is possible.`, [d], { tag: 'p_yes' }),
        ],
      }),
      makeCard({
        index: 4,
        time: '01:26',
        wing: 'Family & Odds',
        wingIndex: 2,
        label: 'Spokesperson & Surgeon B',
        shown: [
          fact(`${pName(c)}'s spouse begs to operate, BUT the surgeon says surgery has 1% chance and will only cause suffering.`, [c], { tag: 'fs_no' }),
          fact(`${pName(d)}'s parent agrees to operate AND the surgeon projects an 88% recovery.`, [d], { tag: 'fs_yes' }),
        ],
        alt: [
          fact(`${pName(c)}'s spouse agrees to operate AND the surgeon projects an 82% recovery.`, [c], { tag: 'fs_yes' }),
          fact(`${pName(d)}'s family refuses surgery AND the surgeon sees < 2% chance of survival.`, [d], { tag: 'fs_no' }),
        ],
      }),
      makeCard({
        index: 5,
        time: '01:30',
        wing: 'Lobby',
        wingIndex: 0,
        label: 'Non-Surgical Bays',
        shown: [
          fact(`${pName(e)} has a minor wrist bruise — cleared to go home.`, [e], { tag: 'safe', calm: true }),
          fact(`${pName(f)} is waiting for routine discharge paperwork.`, [f], { tag: 'safe', calm: true }),
        ],
      }),
    ];

    const evaluate = (resolved) => {
      const pYes = tagSet(resolved, 'p_yes');
      const fsYes = tagSet(resolved, 'fs_yes');
      const targets = uniqueSortedIds([...pYes].filter((id) => fsYes.has(id)));
      return {
        targets,
        proof: `All three voices (patient wish + family + surgeon odds) align cleanly on ${formatList(targets)}.`,
        rival: buildRivalInfo(targets, [a, b, c, d], (r) =>
          !pYes.has(r)
            ? `${pName(r)}'s own signed wish declined surgery.`
            : `Family or surgeon odds do not align with operating on ${pName(r)}.`
        ),
      };
    };

    return {
      scenario: {
        title: 'Family Conference Alignment',
        dispatch: 'Balance the patient\'s own voice, the family spokesperson, and the surgeon\'s real recovery odds.',
      },
      order: 'Clear for surgery EVERY patient where Patient Wish, Family Voice, AND Surgeon Odds all agree.',
      detail: 'Cross-check Written Patient Wishes against Spokesperson & Surgeon cards.',
      cards,
      evaluate,
      bayDefaultLabel: 'Ethics Consult',
      bayLabels: {
        [a]: 'Surgery Consult',
        [b]: 'Surgery Consult',
        [c]: 'Surgery Consult',
        [d]: 'Surgery Consult',
        [e]: 'Cleared Home',
        [f]: 'Discharge Desk',
      },
    };
  },

  // =========================================================================
  // FAMILY 8: METACOGNITIVE & EPISTEMOLOGICAL REASONING (#71–#80)
  // =========================================================================

  // #71 Metacognitive reasoning (After · Meta)
  'metacognitive-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0,
        time: '01:00',
        wing: 'Quality Check',
        wingIndex: 0,
        label: 'First-Impression Bias Audit',
        shown: [
          fact('Beware early mental shortcuts: tagging someone "just anxiety" or "just drunk" makes teams stop looking for real injury.', [], { tag: 'rule' }),
          fact('Rescue any patient dismissed with a soft early label whose objective vitals/exam actually show a silent physical emergency!', [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1,
        time: '01:06',
        wing: 'Early Tag',
        wingIndex: 1,
        label: '01:00 Quick Labels A',
        shown: [
          fact(`${pName(a)} was labeled "Panic Attack — waiting room" after breathing fast at intake.`, [a], { tag: 'dismissed' }),
          fact(`${pName(b)} was labeled "Intoxicated — sleep it off" after slurring words at intake.`, [b], { tag: 'dismissed' }),
        ],
      }),
      makeCard({
        index: 2,
        time: '01:16',
        wing: 'Real Vitals',
        wingIndex: 2,
        label: '01:15 Objective Findings A',
        shown: [
          fact(`${pName(a)}'s finger clip reads 81% oxygen and the right lung has zero breath sounds.`, [a], { tag: 'real_crisis' }),
          fact(`${pName(b)}'s alcohol level is high, head CT is 100% clean, oxygen is 99%, and blood sugar is normal.`, [b], { tag: 'really_mild' }),
        ],
        alt: [
          fact(`${pName(a)}'s oxygen is 99%, lungs are clear, and heart monitor is completely normal.`, [a], { tag: 'really_mild' }),
          fact(`${pName(b)}'s blood sugar just came back dangerously low (34 mg/dL) with a head-impact bump.`, [b], { tag: 'real_crisis' }),
        ],
      }),
      makeCard({
        index: 3,
        time: '01:20',
        wing: 'Early Tag',
        wingIndex: 1,
        label: '01:00 Quick Labels B',
        shown: [
          fact(`${pName(c)} was labeled "Just Stress Headache" and handed an ice pack.`, [c], { tag: 'dismissed' }),
          fact(`${pName(d)} was labeled "Mild Stomach Flu" after vomiting once in triage.`, [d], { tag: 'dismissed' }),
        ],
      }),
      makeCard({
        index: 4,
        time: '01:28',
        wing: 'Real Vitals',
        wingIndex: 2,
        label: '01:15 Objective Findings B',
        shown: [
          fact(`${pName(c)}'s right pupil just enlarged and their left arm suddenly went weak.`, [c], { tag: 'real_crisis' }),
          fact(`${pName(d)}'s belly is soft, BP is 120/76, and nausea settled cleanly after water.`, [d], { tag: 'really_mild' }),
        ],
        alt: [
          fact(`${pName(c)}'s headache faded cleanly with normal vision and normal strength.`, [c], { tag: 'really_mild' }),
          fact(`${pName(d)}'s heart monitor just spiked with a silent heart attack and BP fell to 84/50.`, [d], { tag: 'real_crisis' }),
        ],
      }),
      makeCard({
        index: 5,
        time: '01:32',
        wing: 'Lobby',
        wingIndex: 0,
        label: 'Cleared Cases',
        shown: [
          fact(`${pName(e)} had a full trauma workup and is cleared to go home.`, [e], { tag: 'safe', calm: true }),
          fact(`${pName(f)} is waiting for routine stitches only.`, [f], { tag: 'safe', calm: true }),
        ],
      }),
    ];

    const evaluate = (resolved) => {
      const dismissed = tagSet(resolved, 'dismissed');
      const crisis = tagSet(resolved, 'real_crisis');
      const targets = uniqueSortedIds([...dismissed].filter((id) => crisis.has(id)));
      return {
        targets,
        proof: `Stepping back from early labels catches silent physical emergencies on ${formatList(targets)}.`,
        rival: buildRivalInfo(targets, [a, b, c, d], (r) => `${pName(r)}'s objective tests confirmed no hidden physical emergency.`),
      };
    };

    return {
      scenario: {
        title: 'Catching Early-Label Tunnel Vision',
        dispatch: 'Look past the comforting 01:00 triage labels and check the objective 01:15 vitals and exams.',
      },
      order: 'Rescue EVERY patient dismissed with a soft early label whose objective vitals show a real crisis.',
      detail: 'Compare 01:00 Quick Labels against 01:15 Objective Findings.',
      cards,
      evaluate,
      bayDefaultLabel: 'Re-Eval Needed',
      bayLabels: {
        [a]: 'Early Tag Audit',
        [b]: 'Early Tag Audit',
        [c]: 'Early Tag Audit',
        [d]: 'Early Tag Audit',
        [e]: 'Cleared Home',
        [f]: 'Stitches Only',
      },
    };
  },

  // #72 Epistemic reasoning (Inside · Meta)
  'epistemic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0,
        time: '01:00',
        wing: 'Evidence Desk',
        wingIndex: 0,
        label: 'Knowing vs. Assuming Rule',
        shown: [
          fact('Absence of bad numbers does NOT prove safety if nobody actually checked the patient or if the sample was ruined!', [], { tag: 'rule' }),
          fact('Pull into Trauma Bay 1 anyone from a high-speed crash who was merely "assumed fine" with ZERO verified exam/vitals.', [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1,
        time: '01:08',
        wing: 'Crash Manifest',
        wingIndex: 1,
        label: 'High-Speed Crash Arrivals',
        shown: [
          fact(`${pName(a)} was pulled from the back seat of a 65-mph rollover.`, [a], { tag: 'high_crash' }),
          fact(`${pName(b)} was pulled from the front seat of the same 65-mph rollover.`, [b], { tag: 'high_crash' }),
        ],
      }),
      makeCard({
        index: 2,
        time: '01:15',
        wing: 'Verification Log',
        wingIndex: 2,
        label: 'Exam Proof Check A',
        shown: [
          fact(`${pName(a)}: Bystander wrote "looked calm in hallway" — ZERO vitals, ZERO scan, never seen by a doctor.`, [a], { tag: 'unchecked' }),
          fact(`${pName(b)}: Doctor completed full exam, clean ultrasound, clean CT scan, vitals normal every 15 min.`, [b], { tag: 'verified' }),
        ],
        alt: [
          fact(`${pName(a)}: Senior doctor verified clean CT scan, clean labs, and steady vitals.`, [a], { tag: 'verified' }),
          fact(`${pName(b)}: Clipboard says "probably okay" — blood sample spilled and NO doctor has checked ${pName(b)} yet.`, [b], { tag: 'unchecked' }),
        ],
      }),
      makeCard({
        index: 3,
        time: '01:20',
        wing: 'Crash Manifest',
        wingIndex: 1,
        label: 'High-Speed Crash Arrivals B',
        shown: [
          fact(`${pName(c)} was thrown 15 feet from a motorcycle collision.`, [c], { tag: 'high_crash' }),
          fact(`${pName(d)} walked in from a slow 5-mph parking-lot bump.`, [d], { tag: 'low_crash' }),
        ],
      }),
      makeCard({
        index: 4,
        time: '01:26',
        wing: 'Verification Log',
        wingIndex: 2,
        label: 'Exam Proof Check B',
        shown: [
          fact(`${pName(c)}: Intake chart left blank after radio outage — assumed stable only because ${pName(c)} isn't yelling.`, [c], { tag: 'unchecked' }),
          fact(`${pName(d)}: Doctor verified normal vitals and clean neck exam.`, [d], { tag: 'verified' }),
        ],
        alt: [
          fact(`${pName(c)}: Trauma team verified clean scans and steady normal vitals.`, [c], { tag: 'verified' }),
          fact(`${pName(d)}: Updated EMS photo shows ${pName(d)}'s car rolled twice — AND nobody has checked ${pName(d)}'s vitals yet.`, [d], { tag: 'unchecked_high' }),
        ],
      }),
      makeCard({
        index: 5,
        time: '01:30',
        wing: 'Lobby',
        wingIndex: 0,
        label: 'Verified Minor Cases',
        shown: [
          fact(`${pName(e)} had verified normal vitals and clean ankle X-ray — cleared to go home.`, [e], { tag: 'safe', calm: true }),
          fact(`${pName(f)} is waiting for routine stitches only.`, [f], { tag: 'safe', calm: true }),
        ],
      }),
    ];

    const evaluate = (resolved) => {
      const high = tagSet(resolved, 'high_crash');
      const unch = tagSet(resolved, 'unchecked');
      const unchHigh = tagSet(resolved, 'unchecked_high');
      const targets = uniqueSortedIds([
        ...[...high].filter((id) => unch.has(id)),
        ...unchHigh,
      ]);
      return {
        targets,
        proof: `${formatList(targets)} survived a high-speed crash yet has ZERO verified exam or vitals — never confuse "unchecked" with "safe."`,
        rival: buildRivalInfo(targets, [a, b, c, d], (r) => `${pName(r)} already received verified doctor exams and clean scans.`),
      };
    };

    return {
      scenario: {
        title: 'Verified Safety vs. Blank Assumptions',
        dispatch: 'Separate patients with real verified exams from high-speed crash victims merely assumed okay.',
      },
      order: 'Pull into Trauma Bay 1 EVERY high-speed crash victim who has ZERO verified exam or vitals.',
      detail: 'Pair High-Speed Crash Arrivals against Exam Proof Check cards.',
      cards,
      evaluate,
      bayDefaultLabel: 'Exam Audit',
      bayLabels: {
        [a]: 'Crash · Audit',
        [b]: 'Crash · Audit',
        [c]: 'Crash · Audit',
        [d]: 'Crash · Audit',
        [e]: 'Cleared Home',
        [f]: 'Stitches Only',
      },
    };
  },

  // #73 Reflective reasoning (After · Meta)
  'reflective-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0,
        time: '01:00',
        wing: 'Shift Review',
        wingIndex: 0,
        label: 'Closed-Loop Safety Rule',
        shown: [
          fact('After giving ANY strong emergency drug (pain sedative, blood pressure drip, or overdose spray), the team MUST log a 15-minute re-check!', [], { tag: 'rule' }),
          fact('In tonight\'s shift audit, flag every patient who got a strong drug AND had ZERO follow-up re-check logged.', [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1,
        time: '01:08',
        wing: 'Drug Log',
        wingIndex: 1,
        label: 'Strong Meds Given A',
        shown: [
          fact(`00:20: ${pName(a)} received strong IV pain sedative for a dislocated shoulder.`, [a], { tag: 'strong_med' }),
          fact(`00:25: ${pName(b)} received overdose reversal spray in the ambulance.`, [b], { tag: 'strong_med' }),
        ],
      }),
      makeCard({
        index: 2,
        time: '01:16',
        wing: 'Follow-Up Log',
        wingIndex: 2,
        label: '15-Min Re-Checks A',
        shown: [
          fact(`${pName(a)}: ZERO breathing or oxygen re-check recorded since 00:20 — curtains pulled shut.`, [a], { tag: 'missed_check' }),
          fact(`${pName(b)}: Re-checked at 00:40 and 00:55 — awake, breathing 16/min, oxygen 98%.`, [b], { tag: 'checked' }),
        ],
        alt: [
          fact(`${pName(a)}: Re-checked at 00:35 and 00:50 — breathing comfortably at 98% oxygen.`, [a], { tag: 'checked' }),
          fact(`${pName(b)}: ZERO follow-up logged since 00:25 (reversal spray wears off in 30 minutes!).`, [b], { tag: 'missed_check' }),
        ],
      }),
      makeCard({
        index: 3,
        time: '01:22',
        wing: 'Drug Log',
        wingIndex: 1,
        label: 'Strong Meds Given B',
        shown: [
          fact(`00:30: ${pName(c)} received a fast blood-pressure-lowering IV drip.`, [c], { tag: 'strong_med' }),
          fact(`00:35: ${pName(d)} received only an ice pack and water — zero strong drugs.`, [d], { tag: 'no_med' }),
        ],
      }),
      makeCard({
        index: 4,
        time: '01:28',
        wing: 'Follow-Up Log',
        wingIndex: 2,
        label: '15-Min Re-Checks B',
        shown: [
          fact(`${pName(c)}: ZERO blood pressure re-check logged since the drip started at 00:30.`, [c], { tag: 'missed_check' }),
          fact(`${pName(d)}: Sitting upright chatting — routine vitals normal.`, [d], { tag: 'checked' }),
        ],
        alt: [
          fact(`${pName(c)}: Blood pressure re-checked every 10 minutes — steady at 128/80.`, [c], { tag: 'checked' }),
          fact(`${pName(d)}: Chart addendum — ${pName(d)} actually got IV sedative at 00:35 with ZERO re-check logged.`, [d], { tag: 'missed_strong' }),
        ],
      }),
      makeCard({
        index: 5,
        time: '01:32',
        wing: 'Lobby',
        wingIndex: 0,
        label: 'Closed Charts',
        shown: [
          fact(`${pName(e)} completed full re-checks and is cleared to go home.`, [e], { tag: 'safe', calm: true }),
          fact(`${pName(f)} is waiting for routine stitches only.`, [f], { tag: 'safe', calm: true }),
        ],
      }),
    ];

    const evaluate = (resolved) => {
      const strong = tagSet(resolved, 'strong_med');
      const missed = tagSet(resolved, 'missed_check');
      const missedStrong = tagSet(resolved, 'missed_strong');
      const targets = uniqueSortedIds([
        ...[...strong].filter((id) => missed.has(id)),
        ...missedStrong,
      ]);
      return {
        targets,
        proof: `Auditing drug timestamps against re-check logs catches unmonitored strong-drug bays on ${formatList(targets)} — check them right now.`,
        rival: buildRivalInfo(targets, [a, b, c, d], (r) => `${pName(r)} either had timely re-checks or received no strong medication.`),
      };
    };

    return {
      scenario: {
        title: 'Post-Treatment Loop Audit',
        dispatch: 'Reflect on tonight\'s workflow: catch any patient given a strong drug who never got their mandatory 15-minute re-check.',
      },
      order: 'Re-check immediately EVERY patient given a strong drug with ZERO follow-up re-check logged.',
      detail: 'Match Strong Meds Given against the 15-Min Re-Checks cards.',
      cards,
      evaluate,
      bayDefaultLabel: 'Loop Audit',
      bayLabels: {
        [a]: 'Post-Med Check',
        [b]: 'Post-Med Check',
        [c]: 'Post-Med Check',
        [d]: 'Post-Med Check',
        [e]: 'Cleared Home',
        [f]: 'Stitches Only',
      },
    };
  },

  // #74 Critical reasoning (After · Meta)
  'critical-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0,
        time: '01:00',
        wing: 'Handoff Audit',
        wingIndex: 0,
        label: 'Spot the Flawed Assumption',
        shown: [
          fact('An intern claimed: "Normal blood pressure (≥ 110) proves nobody is bleeding internally."', [], { tag: 'rule' }),
          fact('FALSE! Young patients hold normal BP until sudden collapse — catch anyone with normal BP who STILL has racing pulse ≥ 130 AND a rigid painful belly.', [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1,
        time: '01:08',
        wing: 'Vitals Board',
        wingIndex: 1,
        label: 'BP & Pulse Screen A',
        shown: [
          fact(`${pName(a)} (age 22): BP 114/72, racing pulse 138 BPM.`, [a], { tag: 'fast_hr', bpOk: true }),
          fact(`${pName(b)} (age 26): BP 118/74, calm pulse 78 BPM.`, [b], { tag: 'calm_hr', bpOk: true }),
        ],
        alt: [
          fact(`${pName(a)} (age 22): BP 122/76, calm pulse 76 BPM.`, [a], { tag: 'calm_hr', bpOk: true }),
          fact(`${pName(b)} (age 26): BP 112/70, racing pulse 142 BPM.`, [b], { tag: 'fast_hr', bpOk: true }),
        ],
      }),
      makeCard({
        index: 2,
        time: '01:14',
        wing: 'Belly Exam',
        wingIndex: 2,
        label: 'Physical Belly Check A',
        shown: [
          fact(`${pName(a)}'s belly is board-rigid and intensely tender after a bicycle handlebar hit.`, [a], { tag: 'rigid' }),
          fact(`${pName(b)}'s belly is completely soft and pain-free.`, [b], { tag: 'soft' }),
        ],
        alt: [
          fact(`${pName(a)}'s belly is soft and completely pain-free.`, [a], { tag: 'soft' }),
          fact(`${pName(b)}'s belly is board-rigid with a deep seatbelt bruise.`, [b], { tag: 'rigid' }),
        ],
      }),
      makeCard({
        index: 3,
        time: '01:20',
        wing: 'Vitals Board',
        wingIndex: 1,
        label: 'BP & Pulse Screen B',
        shown: [
          fact(`${pName(c)} (age 19): BP 116/74, racing pulse 134 BPM.`, [c], { tag: 'fast_hr', bpOk: true }),
          fact(`${pName(d)} (age 31): BP 120/76, racing pulse 132 BPM after jogging in panicked.`, [d], { tag: 'fast_hr', bpOk: true }),
        ],
      }),
      makeCard({
        index: 4,
        time: '01:26',
        wing: 'Belly Exam',
        wingIndex: 2,
        label: 'Physical Belly Check B',
        shown: [
          fact(`${pName(c)}'s belly is rigid and guarding after a ski collision.`, [c], { tag: 'rigid' }),
          fact(`${pName(d)}'s belly is completely soft and pain-free — only a scraped elbow.`, [d], { tag: 'soft' }),
        ],
        alt: [
          fact(`${pName(c)}'s belly is completely soft — pain is only in a sprained wrist.`, [c], { tag: 'soft' }),
          fact(`${pName(d)}'s belly is board-rigid and swollen after a dashboard impact.`, [d], { tag: 'rigid' }),
        ],
      }),
      makeCard({
        index: 5,
        time: '01:30',
        wing: 'Lobby',
        wingIndex: 0,
        label: 'Cleared Bays',
        shown: [
          fact(`${pName(e)} has normal vitals and a minor ankle sprain — cleared to go home.`, [e], { tag: 'safe', calm: true }),
          fact(`${pName(f)} is waiting for stitches only.`, [f], { tag: 'safe', calm: true }),
        ],
      }),
    ];

    const evaluate = (resolved) => {
      const fast = tagSet(resolved, 'fast_hr');
      const rigid = tagSet(resolved, 'rigid');
      const targets = uniqueSortedIds([...fast].filter((id) => rigid.has(id)));
      return {
        targets,
        proof: `Dismantling the "normal BP = safe" fallacy exposes hidden internal bleeding in ${formatList(targets)} (HR ≥ 130 + rigid belly).`,
        rival: buildRivalInfo(targets, [a, b, c, d], (r) =>
          fast.has(r)
            ? `${pName(r)} has a fast pulse, but a soft, pain-free belly.`
            : `${pName(r)} has a calm heart rate and soft belly.`
        ),
      };
    };

    return {
      scenario: {
        title: 'Dismantling the Normal-BP Fallacy',
        dispatch: 'Challenge the intern\'s claim that "normal BP = no internal bleed" by checking heart rate and belly exams.',
      },
      order: 'Scan immediately EVERY patient masking internal bleed behind normal BP (pulse ≥ 130 AND rigid belly).',
      detail: 'Combine BP & Pulse Screen cards with Physical Belly Check cards.',
      cards,
      evaluate,
      bayDefaultLabel: 'Masked Bleed',
      bayLabels: {
        [a]: 'BP Normal · Eval',
        [b]: 'BP Normal · Eval',
        [c]: 'BP Normal · Eval',
        [d]: 'BP Normal · Eval',
        [e]: 'Cleared Home',
        [f]: 'Stitches Only',
      },
    };
  },

  // #75 Falsification-based reasoning (Inside · Meta)
  'falsification-based': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0,
        time: '01:00',
        wing: 'Obs Wing',
        wingIndex: 0,
        label: 'Working Claim to Test',
        shown: [
          fact('Night claim: "EVERY patient in Observation Wing can safely wait 2 hours (oxygen ≥ 94%, BP ≥ 100, wide awake)."', [], { tag: 'rule' }),
          fact('Test the claim by hunting for counterexamples — treat EVERY patient who breaks ANY of those 3 safety thresholds!', [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1,
        time: '01:08',
        wing: 'Obs Monitors',
        wingIndex: 1,
        label: 'Oxygen & BP Scan A',
        shown: [
          fact(`${pName(a)}: Oxygen 83%, BP 118/74, wide awake.`, [a], { tag: 'obs', o2: 83, bp: 118, awake: true }),
          fact(`${pName(b)}: Oxygen 98%, BP 122/78, wide awake.`, [b], { tag: 'obs', o2: 98, bp: 122, awake: true }),
        ],
        alt: [
          fact(`${pName(a)}: Oxygen 97%, BP 120/76, wide awake.`, [a], { tag: 'obs', o2: 97, bp: 120, awake: true }),
          fact(`${pName(b)}: Oxygen 96%, BP 84/50, wide awake.`, [b], { tag: 'obs', o2: 96, bp: 84, awake: true }),
        ],
      }),
      makeCard({
        index: 2,
        time: '01:14',
        wing: 'Obs Monitors',
        wingIndex: 1,
        label: 'Oxygen & BP Scan B',
        shown: [
          fact(`${pName(c)}: Oxygen 96%, BP 114/70, sitting up.`, [c], { tag: 'obs', o2: 96, bp: 114, awake: true }),
          fact(`${pName(d)}: Oxygen 97%, BP 116/72, talking.`, [d], { tag: 'obs', o2: 97, bp: 116, awake: true }),
        ],
      }),
      makeCard({
        index: 3,
        time: '01:20',
        wing: 'Nurse Rounds',
        wingIndex: 2,
        label: 'Alertness Check A',
        shown: [
          fact(`${pName(c)} just stopped answering questions and cannot stay awake even when shaken.`, [c], { tag: 'unalert' }),
          fact(`${pName(b)} is reading a book and answering every question clearly.`, [b], { tag: 'alert' }),
        ],
        alt: [
          fact(`${pName(c)} is wide awake and asking for warm tea.`, [c], { tag: 'alert' }),
          fact(`${pName(d)} just went limp and stopped responding to voice or shoulder tap.`, [d], { tag: 'unalert' }),
        ],
      }),
      makeCard({
        index: 4,
        time: '01:26',
        wing: 'Nurse Rounds',
        wingIndex: 2,
        label: 'Alertness Check B',
        shown: [
          fact(`${pName(d)} is wide awake and walking safely to the sink.`, [d], { tag: 'alert' }),
          fact(`${pName(a)} is awake and clutching their chest while gasping.`, [a], { tag: 'alert' }),
        ],
      }),
      makeCard({
        index: 5,
        time: '01:30',
        wing: 'Lobby',
        wingIndex: 0,
        label: 'Non-Obs Bays',
        shown: [
          fact(`${pName(e)} is already cleared to go home with normal vitals.`, [e], { tag: 'safe', calm: true }),
          fact(`${pName(f)} is waiting for stitches only.`, [f], { tag: 'safe', calm: true }),
        ],
      }),
    ];

    const evaluate = (resolved) => {
      const obs = new Map();
      for (const f of factsByTag(resolved, 'obs')) obs.set(f.patients[0], f);
      const unalert = tagSet(resolved, 'unalert');
      const targets = uniqueSortedIds(
        [a, b, c, d].filter((id) => {
          const v = obs.get(id);
          if (!v) return false;
          return v.o2 < 94 || v.bp < 100 || unalert.has(id);
        })
      );
      return {
        targets,
        proof: `${formatList(targets)} directly disprove the "everyone can wait 2 hours" claim by breaking a safety limit (O2 < 94%, BP < 100, or unresponsive).`,
        rival: buildRivalInfo(targets, [a, b, c, d], (r) => `${pName(r)} meets all 3 safety limits (O2 ≥ 94%, BP ≥ 100, wide awake).`),
      };
    };

    return {
      scenario: {
        title: 'Disproving "Everyone Can Wait"',
        dispatch: 'Don\'t look for people who confirm the room is calm — hunt for any patient who DISPROVES it.',
      },
      order: 'Pull out EVERY Observation patient who breaks O2 ≥ 94%, BP ≥ 100, OR wide-awake alertness.',
      detail: 'Check BOTH Oxygen & BP Scans and Nurse Alertness Checks.',
      cards,
      evaluate,
      bayDefaultLabel: 'Obs Wing Check',
      bayLabels: {
        [a]: 'Obs Wing',
        [b]: 'Obs Wing',
        [c]: 'Obs Wing',
        [d]: 'Obs Wing',
        [e]: 'Cleared Home',
        [f]: 'Stitches Only',
      },
    };
  },

  // #76 Heuristic reasoning (Before · Meta)
  'heuristic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0,
        time: '01:00',
        wing: 'Triage Desk',
        wingIndex: 0,
        label: 'When the Fast Shortcut Fails',
        shown: [
          fact('Quick winter shortcut: "Fever + Body Aches = Routine Flu (send to fast-track)."', [], { tag: 'rule' }),
          fact('DANGER EXCEPTION: That shortcut is FATAL if the patient ALSO has a stiff painful neck OR spreading purple spots that do not fade when pressed!', [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1,
        time: '01:06',
        wing: 'Intake Queue',
        wingIndex: 1,
        label: 'Flu-Like Arrivals A',
        shown: [
          fact(`${pName(a)} arrived with high fever (39.6°C) and severe body aches.`, [a], { tag: 'flu_like' }),
          fact(`${pName(b)} arrived with fever (38.8°C), cough, and body aches.`, [b], { tag: 'flu_like' }),
        ],
      }),
      makeCard({
        index: 2,
        time: '01:14',
        wing: 'Red-Flag Exam',
        wingIndex: 2,
        label: 'Neck & Skin Check A',
        shown: [
          fact(`${pName(a)} cannot touch chin to chest (rock-stiff neck) and screams when the room light turns on.`, [a], { tag: 'red_flag' }),
          fact(`${pName(b)} bends neck freely with completely clear skin and normal oxygen.`, [b], { tag: 'no_flag' }),
        ],
        alt: [
          fact(`${pName(a)} bends neck easily with clear skin — classic mild seasonal flu.`, [a], { tag: 'no_flag' }),
          fact(`${pName(b)} has fast-spreading purple ankle spots that stay dark when pressed with a glass.`, [b], { tag: 'red_flag' }),
        ],
      }),
      makeCard({
        index: 3,
        time: '01:20',
        wing: 'Intake Queue',
        wingIndex: 1,
        label: 'Flu-Like Arrivals B',
        shown: [
          fact(`${pName(c)} arrived with high fever (39.4°C) and shivering chills.`, [c], { tag: 'flu_like' }),
          fact(`${pName(d)} arrived with fever (38.5°C) and mild sore throat.`, [d], { tag: 'flu_like' }),
        ],
      }),
      makeCard({
        index: 4,
        time: '01:26',
        wing: 'Red-Flag Exam',
        wingIndex: 2,
        label: 'Neck & Skin Check B',
        shown: [
          fact(`${pName(c)} has new dark purple spots spreading up both legs that do not fade when pressed.`, [c], { tag: 'red_flag' }),
          fact(`${pName(d)} has a flexible neck, clear skin, and steady normal vitals.`, [d], { tag: 'no_flag' }),
        ],
        alt: [
          fact(`${pName(c)} has a flexible neck and clear skin — routine flu care.`, [c], { tag: 'no_flag' }),
          fact(`${pName(d)} suddenly developed a rigid painful neck and worsening confusion.`, [d], { tag: 'red_flag' }),
        ],
      }),
      makeCard({
        index: 5,
        time: '01:30',
        wing: 'Lobby',
        wingIndex: 0,
        label: 'Non-Fever Bays',
        shown: [
          fact(`${pName(e)} has a minor wrist sprain — cleared to go home.`, [e], { tag: 'safe', calm: true }),
          fact(`${pName(f)} is waiting for routine stitches only.`, [f], { tag: 'safe', calm: true }),
        ],
      }),
    ];

    const evaluate = (resolved) => {
      const flu = tagSet(resolved, 'flu_like');
      const flag = tagSet(resolved, 'red_flag');
      const targets = uniqueSortedIds([...flu].filter((id) => flag.has(id)));
      return {
        targets,
        proof: `Spotting where the "fever = flu" rule-of-thumb breaks catches brain/blood infection red flags on ${formatList(targets)}.`,
        rival: buildRivalInfo(targets, [a, b, c, d], (r) => `${pName(r)} has a flexible neck and clear skin, fitting routine flu care.`),
      };
    };

    return {
      scenario: {
        title: 'When the Flu Shortcut Kills',
        dispatch: 'Fast shortcuts save time — until a fatal exception hides inside the flu queue.',
      },
      order: 'Pull out of the flu line EVERY fever patient with a stiff neck OR non-fading purple spots.',
      detail: 'Pair Flu-Like Arrivals against the Neck & Skin Check cards.',
      cards,
      evaluate,
      bayDefaultLabel: 'Fever Triage',
      bayLabels: {
        [a]: 'High Fever',
        [b]: 'High Fever',
        [c]: 'High Fever',
        [d]: 'High Fever',
        [e]: 'Cleared Home',
        [f]: 'Stitches Only',
      },
    };
  },

  // #77 Non-monotonic reasoning (Inside · Meta)
  'non-monotonic-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0,
        time: '01:00',
        wing: '01:00 Triage',
        wingIndex: 0,
        label: 'Old 01:00 Plan (OUTDATED)',
        shown: [
          fact(`01:00 Plan: ${pName(a)} and ${pName(b)} were flagged #1 and #2 for suspected internal bleeding.`, [a, b], { tag: 'old_top' }),
          fact(`01:00 Plan: ${pName(c)} and ${pName(d)} looked mild and were put at the back of the line.`, [c, d], { tag: 'old_low' }),
        ],
      }),
      makeCard({
        index: 1,
        time: '01:12',
        wing: '01:15 Scan',
        wingIndex: 1,
        label: 'Late Reversal A',
        shown: [
          fact(`01:15 Scan: ${pName(a)}'s full CT scan came back 100% CLEAN — BP climbed back to 124/78 (drop old alert).`, [a], { tag: 'cleared_now' }),
          fact(`01:15 Scan: ${pName(b)}'s belly scan came back 100% CLEAN — pain was a muscle pull (drop old alert).`, [b], { tag: 'cleared_now' }),
        ],
        alt: [
          fact(`01:15 Scan: ${pName(a)}'s scan confirmed a large active spleen tear — BP plunging to 76/44!`, [a], { tag: 'urgent_now' }),
          fact(`01:15 Scan: ${pName(b)}'s full CT scan came back 100% CLEAN — cleared from redline.`, [b], { tag: 'cleared_now' }),
        ],
      }),
      makeCard({
        index: 2,
        time: '01:18',
        wing: '01:15 Scan',
        wingIndex: 1,
        label: 'Late Reversal B',
        shown: [
          fact(`01:18 Scan: Quiet ${pName(c)} just went unresponsive with an expanding brain bleed on head CT!`, [c], { tag: 'urgent_now' }),
          fact(`01:18 Scan: ${pName(d)} stayed completely steady — clean X-ray, normal BP 120/76.`, [d], { tag: 'cleared_now' }),
        ],
        alt: [
          fact(`01:18 Scan: ${pName(c)} stayed completely steady — normal head CT and normal BP.`, [c], { tag: 'cleared_now' }),
          fact(`01:18 Scan: Quiet ${pName(d)} just collapsed with blood filling the chest cavity on ultrasound!`, [d], { tag: 'urgent_now' }),
        ],
      }),
      makeCard({
        index: 3,
        time: '01:24',
        wing: 'Ward Rule',
        wingIndex: 0,
        label: 'Revision Mandate',
        shown: [
          fact('Whenever 01:15–01:25 scans overturn the 01:00 triage board, IMMEDIATELY cancel old alerts and act ONLY on the updated 01:15+ findings.', [], { tag: 'rule' }),
          fact('Clinging to an outdated 01:00 priority wastes the operating room while a silent crash unfolds.', [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 4,
        time: '01:26',
        wing: '01:25 Vitals',
        wingIndex: 2,
        label: 'Latest Monitor Confirmation',
        shown: [
          fact(`01:25 Check: ${pName(a)} and ${pName(b)} are both eating ice chips with steady monitors.`, [a, b], { tag: 'note' }),
          fact(`01:25 Check: Confirm the exact 01:15–01:18 urgent reversal bay(s) before rolling to OR.`, [], { tag: 'note' }),
        ],
      }),
      makeCard({
        index: 5,
        time: '01:30',
        wing: 'Lobby',
        wingIndex: 0,
        label: 'Unchanged Minor Bays',
        shown: [
          fact(`${pName(e)} has a minor scraped knee — cleared to go home.`, [e], { tag: 'safe', calm: true }),
          fact(`${pName(f)} is waiting for routine stitches only.`, [f], { tag: 'safe', calm: true }),
        ],
      }),
    ];

    const evaluate = (resolved) => {
      const targets = uniqueSortedIds([...tagSet(resolved, 'urgent_now')]);
      return {
        targets,
        proof: `Canceling the outdated 01:00 board in light of the 01:15–01:18 scans shifts immediate surgical priority to ${formatList(targets)}.`,
        rival: buildRivalInfo(targets, [a, b, c, d], (r) => `${pName(r)} was cleared by the latest 01:15–01:18 scans despite earlier impressions.`),
      };
    };

    return {
      scenario: {
        title: 'Board Reversal After STAT Scans',
        dispatch: 'New 01:15–01:18 scans completely overturned the 01:00 triage plan — drop old conclusions cleanly.',
      },
      order: 'Send to emergency surgery EVERY patient who is confirmed critical on the LATEST 01:15–01:18 scans.',
      detail: 'Compare the outdated 01:00 Plan against the Late Reversal cards.',
      cards,
      evaluate,
      bayDefaultLabel: 'Scan Update',
      bayLabels: {
        [a]: 'Re-Evaluated',
        [b]: 'Re-Evaluated',
        [c]: 'Re-Evaluated',
        [d]: 'Re-Evaluated',
        [e]: 'Cleared Home',
        [f]: 'Stitches Only',
      },
    };
  },

  // #78 Ontological reasoning (Before · Meta)
  'ontological-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0,
        time: '01:00',
        wing: 'Trauma Desk',
        wingIndex: 0,
        label: 'Kind-of-Crisis Sort',
        shown: [
          fact('Every hospital crisis falls into a different fundamental kind: (1) Physical Mechanical Tear/Block, (2) Blood Chemistry/Sugar Crisis, or (3) Paperwork/Family Dispute.', [], { tag: 'rule' }),
          fact('The Trauma Surgeon ONLY repairs Physical Mechanical Tears/Blocks — medicine and social work handle the other kinds!', [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1,
        time: '01:06',
        wing: 'Intake Notes',
        wingIndex: 1,
        label: 'Crisis Reports A',
        shown: [
          fact(`${pName(a)}: Sharp glass sliced open the main thigh artery — pouring bright blood.`, [a], { tag: 'mechanical' }),
          fact(`${pName(b)}: Missed insulin for 3 days — blood sugar spiked to 640 with sweet fruity breath.`, [b], { tag: 'chemical' }),
        ],
        alt: [
          fact(`${pName(a)}: Overdosed on blood-pressure pills — needs chemical antidote drip, zero tears.`, [a], { tag: 'chemical' }),
          fact(`${pName(b)}: Steel rod punctured the right chest wall — trapped air collapsing the lung.`, [b], { tag: 'mechanical' }),
        ],
      }),
      makeCard({
        index: 2,
        time: '01:12',
        wing: 'Intake Notes',
        wingIndex: 1,
        label: 'Crisis Reports B',
        shown: [
          fact(`${pName(c)}: Two siblings are shouting in the hallway over who holds legal power of attorney.`, [c], { tag: 'legal' }),
          fact(`${pName(d)}: Crushed windpipe ring physically blocking air from entering the lungs.`, [d], { tag: 'mechanical' }),
        ],
        alt: [
          fact(`${pName(c)}: Torn spleen leaking blood into the belly after a ladder fall.`, [c], { tag: 'mechanical' }),
          fact(`${pName(d)}: Severe low blood sugar (28 mg/dL) from skipping dinner — needs IV sugar, zero injury.`, [d], { tag: 'chemical' }),
        ],
      }),
      makeCard({
        index: 3,
        time: '01:18',
        wing: 'Specialty Guide',
        wingIndex: 2,
        label: 'Match Specialist to Kind',
        shown: [
          fact('Physical Tear/Block (cut artery, punctured chest, crushed windpipe, torn spleen) → Trauma Surgeon.', [], { tag: 'guide' }),
          fact('Blood Chemistry/Sugar (insulin crisis, low sugar, pill overdose) → Internal Medicine Drip, NOT Surgery.', [], { tag: 'guide' }),
        ],
      }),
      makeCard({
        index: 4,
        time: '01:24',
        wing: 'Specialty Guide',
        wingIndex: 2,
        label: 'Non-Surgical Routing',
        shown: [
          fact('Legal/Family Paperwork Disputes → Ethics & Social Work, NOT Surgery.', [], { tag: 'guide' }),
          fact('Sending a blood-sugar crisis or legal fight to the operating room delays the right team.', [], { tag: 'guide' }),
        ],
      }),
      makeCard({
        index: 5,
        time: '01:30',
        wing: 'Lobby',
        wingIndex: 0,
        label: 'Minor Bays',
        shown: [
          fact(`${pName(e)} has a minor bruised wrist — cleared to go home.`, [e], { tag: 'safe', calm: true }),
          fact(`${pName(f)} is waiting for routine discharge papers.`, [f], { tag: 'safe', calm: true }),
        ],
      }),
    ];

    const evaluate = (resolved) => {
      const targets = uniqueSortedIds([...tagSet(resolved, 'mechanical')]);
      return {
        targets,
        proof: `Sorting crises by their fundamental kind routes ONLY physical mechanical tears/blocks (${formatList(targets)}) to the Trauma Surgeon.`,
        rival: buildRivalInfo(targets, [a, b, c, d], (r) => `${pName(r)} has a blood-chemistry or legal/family issue, not a physical mechanical tear.`),
      };
    };

    return {
      scenario: {
        title: 'Sorting the Fundamental Kind of Crisis',
        dispatch: 'Separate Physical Mechanical Tears from Blood Chemistry crises and Legal Disputes before paging Surgery.',
      },
      order: 'Page the Trauma Surgeon ONLY for patients with a Physical Mechanical Tear or Block.',
      detail: 'Classify Crisis Reports A & B using the Specialty Guide.',
      cards,
      evaluate,
      bayDefaultLabel: 'Crisis Routing',
      bayLabels: {
        [a]: 'Route Decision',
        [b]: 'Route Decision',
        [c]: 'Route Decision',
        [d]: 'Route Decision',
        [e]: 'Cleared Home',
        [f]: 'Discharge Desk',
      },
    };
  },

  // #79 Analogical abstraction (After · Meta)
  'analogical-abstraction': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0,
        time: '01:00',
        wing: 'Teaching Case',
        wingIndex: 0,
        label: 'Two Past Cases, One Principle',
        shown: [
          fact('Past Case 1 (Skull): Bleeding inside the rigid skull had nowhere to expand and crushed the brain until relieved.', [], { tag: 'rule' }),
          fact('Past Case 2 (Heart Sac): Fluid trapped inside the tough heart sac squeezed the heart shut until drained.', [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1,
        time: '01:08',
        wing: 'Core Lesson',
        wingIndex: 0,
        label: 'Shared Hidden Pattern',
        shown: [
          fact('Extract the shared rule from BOTH past cases: "Swelling trapped inside a TIGHT, UNSTRETCHABLE compartment crushes blood flow and needs immediate pressure release!"', [], { tag: 'rule' }),
          fact('Apply that exact rule to tonight\'s limb & skin bays — ignore loose surface swelling that isn\'t cutting off blood flow.', [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 2,
        time: '01:14',
        wing: 'Limb Exam',
        wingIndex: 1,
        label: 'Tonight\'s Bays A',
        shown: [
          fact(`${pName(a)}'s shin muscle is rock-hard inside its tight tough sleeve after a break — foot turned cold, pale, and numb with NO foot pulse.`, [a], { tag: 'trapped_pressure' }),
          fact(`${pName(b)} has a soft itchy skin hive rash on both arms — warm pink hands with strong wrist pulses.`, [b], { tag: 'surface_only' }),
        ],
        alt: [
          fact(`${pName(a)} has a mild surface bruise on the shin — soft muscle, warm pink foot, strong pulse.`, [a], { tag: 'surface_only' }),
          fact(`${pName(b)}'s forearm is rock-hard and tight under a fresh crush injury — fingers turning pale and numb with vanishing pulse.`, [b], { tag: 'trapped_pressure' }),
        ],
      }),
      makeCard({
        index: 3,
        time: '01:20',
        wing: 'Limb Exam',
        wingIndex: 1,
        label: 'Tonight\'s Bays B',
        shown: [
          fact(`${pName(c)}'s hand is trapped under a rigid circular burn scar acting like a vise — blood flow to fingers stopped.`, [c], { tag: 'trapped_pressure' }),
          fact(`${pName(d)} has mild puffy ankles after a long flight — soft to touch with warm toes and strong pulses.`, [d], { tag: 'surface_only' }),
        ],
        alt: [
          fact(`${pName(c)} has a mild sunburn on both shoulders — soft skin and normal blood flow.`, [c], { tag: 'surface_only' }),
          fact(`${pName(d)}'s calf muscle swelled rock-hard inside a tight plaster cast — toes turned cold and lost all pulse.`, [d], { tag: 'trapped_pressure' }),
        ],
      }),
      makeCard({
        index: 4,
        time: '01:26',
        wing: 'OR Check',
        wingIndex: 2,
        label: 'Pressure-Release Trigger',
        shown: [
          fact('Rock-hard tight compartment + vanishing downstream pulse = same trapped-pressure emergency as skull and heart sac.', [], { tag: 'guide' }),
          fact('Soft surface puffiness or rash with strong pulses does NOT cut off blood flow.', [], { tag: 'guide' }),
        ],
      }),
      makeCard({
        index: 5,
        time: '01:30',
        wing: 'Lobby',
        wingIndex: 0,
        label: 'Cleared Bays',
        shown: [
          fact(`${pName(e)} has a minor scraped knee — cleared to go home.`, [e], { tag: 'safe', calm: true }),
          fact(`${pName(f)} is waiting for routine stitches only.`, [f], { tag: 'safe', calm: true }),
        ],
      }),
    ];

    const evaluate = (resolved) => {
      const targets = uniqueSortedIds([...tagSet(resolved, 'trapped_pressure')]);
      return {
        targets,
        proof: `Applying the "trapped pressure in a tight space crushes blood flow" principle to limbs catches ${formatList(targets)} before tissue dies.`,
        rival: buildRivalInfo(targets, [a, b, c, d], (r) => `${pName(r)} has soft surface swelling with warm extremities and strong pulses.`),
      };
    };

    return {
      scenario: {
        title: 'One Deep Principle Across Organs',
        dispatch: 'Take the trapped-pressure lesson from skull and heart cases and spot the exact same trap in tonight\'s limb bays.',
      },
      order: 'Release pressure immediately for EVERY patient whose swelling is trapped in a tight space cutting off blood flow.',
      detail: 'Apply the Shared Hidden Pattern to Tonight\'s Bays A & B.',
      cards,
      evaluate,
      bayDefaultLabel: 'Pressure Check',
      bayLabels: {
        [a]: 'Limb Swelling',
        [b]: 'Limb Swelling',
        [c]: 'Limb Swelling',
        [d]: 'Limb Swelling',
        [e]: 'Cleared Home',
        [f]: 'Stitches Only',
      },
    };
  },

  // #80 Integrative reasoning (Inside · Meta — Grand Capstone Differential Loop!)
  'integrative-reasoning': (rng) => {
    const [a, b, c, d, e, f] = pickPlayers(rng, 6);
    const cards = [
      makeCard({
        index: 0,
        time: '01:00',
        wing: 'Trauma Lead',
        wingIndex: 0,
        label: 'Full Bedside Loop',
        shown: [
          fact('Combine EVERY step together: (1) Ignore outdated early risk if a clean STAT scan ruled them out, (2) Check latest vitals, AND (3) Verify consent/code status.', [], { tag: 'rule' }),
          fact('Operate ONLY on patients who are POSITIVE on STAT scan, showing active shock (BP < 90 OR pulse ≥ 130), AND Full Code!', [], { tag: 'rule' }),
        ],
      }),
      makeCard({
        index: 1,
        time: '01:06',
        wing: '01:00 Intake',
        wingIndex: 1,
        label: 'Early Odds (Before Scans)',
        shown: [
          fact(`01:00 Early guess: ${pName(b)} looked highest risk (70% bleed chance); ${pName(a)} looked moderate (40%).`, [a, b], { tag: 'early' }),
          fact(`01:00 Early guess: ${pName(c)} and ${pName(d)} both arrived from the same highway pileup.`, [c, d], { tag: 'early' }),
        ],
      }),
      makeCard({
        index: 2,
        time: '01:14',
        wing: 'STAT Scans',
        wingIndex: 2,
        label: '01:15 Ultrasound & CT Results',
        shown: [
          fact(`${pName(a)}: STAT belly ultrasound POSITIVE for heavy internal bleeding.`, [a], { tag: 'scan_pos' }),
          fact(`${pName(b)}: BOTH belly ultrasound and full CT came back 100% CLEAN (bleed ruled out).`, [b], { tag: 'scan_neg' }),
        ],
        alt: [
          fact(`${pName(a)}: Full CT scan came back 100% CLEAN — internal bleed ruled out.`, [a], { tag: 'scan_neg' }),
          fact(`${pName(b)}: STAT belly ultrasound POSITIVE for heavy internal bleeding.`, [b], { tag: 'scan_pos' }),
        ],
      }),
      makeCard({
        index: 3,
        time: '01:20',
        wing: 'STAT Scans',
        wingIndex: 2,
        label: '01:18 Ultrasound & CT Results B',
        shown: [
          fact(`${pName(c)}: STAT chest ultrasound POSITIVE for blood filling the chest.`, [c], { tag: 'scan_pos' }),
          fact(`${pName(d)}: STAT belly ultrasound POSITIVE for internal bleeding.`, [d], { tag: 'scan_pos' }),
        ],
      }),
      makeCard({
        index: 4,
        time: '01:26',
        wing: 'Vitals & Ethics',
        wingIndex: 1,
        label: '01:25 Live Monitors & Code Status',
        shown: [
          fact(`${pName(a)}: BP 80/46, pulse 134, verified Full Code. ${pName(b)}: BP 122/78, pulse 80, Full Code.`, [a, b], { tag: 'vc_ab', aShock: true, aFull: true, bShock: false, bFull: true }),
          fact(`${pName(c)}: BP 82/48, pulse 136, verified signed Comfort-Only DNR. ${pName(d)}: BP 118/76, pulse 134 (young athlete compensating!), Full Code.`, [c, d], { tag: 'vc_cd', cShock: true, cFull: false, dShock: true, dFull: true }),
        ],
        alt: [
          fact(`${pName(a)}: BP 120/76, pulse 82, Full Code. ${pName(b)}: BP 78/44, pulse 138, verified Full Code.`, [a, b], { tag: 'vc_ab', aShock: false, aFull: true, bShock: true, bFull: true }),
          fact(`${pName(c)}: BP 84/50, pulse 132, verified Full Code. ${pName(d)}: BP 86/52, pulse 130, verified signed Comfort-Only DNR.`, [c, d], { tag: 'vc_cd', cShock: true, cFull: true, dShock: true, dFull: false }),
        ],
      }),
      makeCard({
        index: 5,
        time: '01:30',
        wing: 'Lobby',
        wingIndex: 0,
        label: 'Cleared Bays',
        shown: [
          fact(`${pName(e)} has a minor ankle sprain — cleared to go home.`, [e], { tag: 'safe', calm: true }),
          fact(`${pName(f)} is waiting for routine stitches only.`, [f], { tag: 'safe', calm: true }),
        ],
      }),
    ];

    const evaluate = (resolved) => {
      const pos = tagSet(resolved, 'scan_pos');
      const shock = new Set();
      const full = new Set();
      for (const f of factsByTag(resolved, 'vc_ab')) {
        if (f.aShock) shock.add(a);
        if (f.aFull) full.add(a);
        if (f.bShock) shock.add(b);
        if (f.bFull) full.add(b);
      }
      for (const f of factsByTag(resolved, 'vc_cd')) {
        if (f.cShock) shock.add(c);
        if (f.cFull) full.add(c);
        if (f.dShock) shock.add(d);
        if (f.dFull) full.add(d);
      }
      const targets = uniqueSortedIds(
        [a, b, c, d].filter((id) => pos.has(id) && shock.has(id) && full.has(id))
      );
      return {
        targets,
        proof: `Putting scan updates, hidden-shock vitals (BP < 90 or HR ≥ 130), and Full-Code ethics together locks onto ${formatList(targets)}.`,
        rival: buildRivalInfo(targets, [a, b, c, d], (r) => {
          if (!pos.has(r)) return `${pName(r)}'s STAT scans came back clean, overturning early guesses.`;
          if (!full.has(r)) return `${pName(r)} has a verified Comfort-Only DNR that must be respected.`;
          return `${pName(r)} is not currently showing shock vitals.`;
        }),
      };
    };

    return {
      scenario: {
        title: 'Full Trauma Chief Workup',
        dispatch: 'Weigh early odds, STAT scan updates, hidden-shock vitals, and code status all at once.',
      },
      order: 'Roll to OR EVERY patient who is Scan-POSITIVE, in active shock (BP < 90 or pulse ≥ 130), AND Full Code.',
      detail: 'Combine STAT Scans with 01:25 Live Monitors & Code Status.',
      cards,
      evaluate,
      bayDefaultLabel: 'Chief Workup',
      bayLabels: {
        [a]: 'Full Workup',
        [b]: 'Full Workup',
        [c]: 'Full Workup',
        [d]: 'Full Workup',
        [e]: 'Cleared Home',
        [f]: 'Stitches Only',
      },
    };
  },
};
