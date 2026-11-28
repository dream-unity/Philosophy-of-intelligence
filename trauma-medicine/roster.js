// Patient roster, phase-specific medical emergencies, and 12 authentic clinical scenarios
// spanning Before (pre-hospital triage), Inside (active resuscitation), and After (family, ethics, M&M, autopsy).
// Every single verb reads naturally as a genuine clinical comparison between two real patients:
// "[First-named higher-priority patient] [clinical verb] [Second-named compared patient]".

export const PATIENTS = Object.freeze([
  { id: 'nadia', name: 'Nadia', code: 'BAY 01', tag: 'Collapsed Lung', baseBpm: 92 },
  { id: 'caleb', name: 'Caleb', code: 'BAY 02', tag: 'Severe Leg Bleed', baseBpm: 98 },
  { id: 'priya', name: 'Priya', code: 'BAY 03', tag: 'Blood Infection', baseBpm: 94 },
  { id: 'devon', name: 'Devon', code: 'BAY 04', tag: 'Brain Bleed', baseBpm: 76 },
  { id: 'maren', name: 'Maren', code: 'BAY 05', tag: 'Crushed Chest', baseBpm: 90 },
  { id: 'tomas', name: 'Tomas', code: 'BAY 06', tag: 'Crushed Leg', baseBpm: 86 },
  { id: 'hana', name: 'Hana', code: 'BAY 07', tag: 'Burned Airway', baseBpm: 96 },
  { id: 'gideon', name: 'Gideon', code: 'BAY 08', tag: 'Internal Bleed', baseBpm: 95 },
  { id: 'selma', name: 'Selma', code: 'BAY 09', tag: 'Neck Injury', baseBpm: 78 },
  { id: 'rory', name: 'Rory', code: 'BAY 10', tag: 'Smoke Inhalation', baseBpm: 88 },
]);

export const PATIENT_CONDITIONS_BY_PHASE = Object.freeze({
  before: Object.freeze({
    nadia: 'Collapsed Lung',
    caleb: 'Severe Leg Bleed',
    priya: 'Blood Infection',
    devon: 'Brain Bleed',
    maren: 'Crushed Chest',
    tomas: 'Crushed Leg',
    hana: 'Burned Airway',
    gideon: 'Internal Bleed',
    selma: 'Neck Injury',
    rory: 'Smoke Inhalation',
  }),
  inside: Object.freeze({
    nadia: 'Blocked Airway',
    caleb: 'Deep Hip Bleed',
    priya: 'Severe Blood Loss',
    devon: 'Swelling Brain',
    maren: 'Blood in Chest',
    tomas: 'Torn Main Artery',
    hana: 'Allergic Shock',
    gideon: 'Squeezed Heart',
    selma: 'Heart Stopped',
    rory: 'Chemical Poisoning',
  }),
  after: Object.freeze({
    nadia: 'Family Disagreement',
    caleb: 'Blood Supply Audit',
    priya: 'Living Will Check',
    devon: 'Brain Recovery Test',
    maren: 'Shift Handoff Check',
    tomas: 'Autopsy Review',
    hana: 'Organ Donor Check',
    gideon: 'Missed Warning Audit',
    selma: 'Waiting Room Talk',
    rory: 'Autopsy Lab Report',
  }),
});

export function getPatientCondition(patientId, phase = 'before') {
  return PATIENT_CONDITIONS_BY_PHASE[phase]?.[patientId] || PATIENT_BY_ID[patientId]?.tag || 'Trauma Case';
}

export const PATIENT_BY_ID = Object.freeze(
  Object.fromEntries(PATIENTS.map((p) => [p.id, p]))
);

export const PATIENT_IDS = Object.freeze(PATIENTS.map((p) => p.id));

// 6 fixed structural clinical chart slots (mapped to scenario-specific clinical reports and verbs).
export const CHANNEL_IDS = Object.freeze([
  'triage',
  'vitals',
  'labs',
  'imaging',
  'handoff',
  'consult',
]);

// 12 authentic trauma medicine scenarios across Before, Inside, and After clinical care.
export const SCENARIOS = Object.freeze([
  // BEFORE: Pre-Hospital & Triage
  {
    id: 'mass-casualty-intake',
    phase: 'before',
    title: 'Highway Pileup Triage',
    dispatch: 'Multi-car rain pileup — ambulances stacking on both ramps.',
    setting: 'Ambulance Bay Intake',
    sites: ['North Ramp', 'South Ramp'],
    channels: {
      triage: { label: 'EMS Triage', verb: 'needs resuscitation before', short: 'EMS' },
      vitals: { label: 'Field Vitals', verb: 'is losing BP faster than', short: 'Vitals' },
      labs: { label: 'Blood Bank', verb: 'needs O-neg blood before', short: 'Blood' },
      imaging: { label: 'FAST Ultrasound', verb: 'has heavier internal bleed than', short: 'FAST' },
      handoff: { label: 'Airway Queue', verb: 'needs intubation ahead of', short: 'Airway' },
      consult: { label: 'Surgical Priority', verb: 'outranks OR urgency of', short: 'Surgery' },
    },
  },
  {
    id: 'helicopter-dispatch',
    phase: 'before',
    title: 'Medevac Airlift Allocation',
    dispatch: 'One medevac chopper left before storm ceiling closes.',
    setting: 'Regional Dispatch Desk',
    sites: ['Ridge Clinic', 'Harbor ER'],
    channels: {
      triage: { label: 'Flight Triage', verb: 'needs airlift sooner than', short: 'Flight' },
      vitals: { label: 'Pulse Oximetry', verb: 'is dropping SpO2 faster than', short: 'SpO2' },
      labs: { label: 'Plasma Reserve', verb: 'needs clotting plasma before', short: 'Plasma' },
      imaging: { label: 'Portable Scan', verb: 'shows worse organ injury than', short: 'Scan' },
      handoff: { label: 'Evac Manifest', verb: 'holds flight priority over', short: 'Evac' },
      consult: { label: 'Receiving OR', verb: 'is queued for OR ahead of', short: 'OR' },
    },
  },
  {
    id: 'surge-bed-budget',
    phase: 'before',
    title: 'ER Surge Time Budget',
    dispatch: 'Holiday night surge — scarce ICU beds and tight minutes.',
    setting: 'Triage Control Board',
    sites: ['Red Zone', 'Yellow Zone'],
    channels: {
      triage: { label: 'ESI Acuity', verb: 'has higher shock index than', short: 'Acuity' },
      vitals: { label: 'Telemetry Strip', verb: 'is destabilizing faster than', short: 'Vitals' },
      labs: { label: 'Lactate Panel', verb: 'has higher blood lactate than', short: 'Lactate' },
      imaging: { label: 'Bedside Echo', verb: 'shows weaker heart pump than', short: 'Echo' },
      handoff: { label: 'ICU Bed Queue', verb: 'needs the ICU bed before', short: 'ICU Bed' },
      consult: { label: 'Anesthesia Call', verb: 'needs airway tube ahead of', short: 'Airway' },
    },
  },
  {
    id: 'austere-disaster-triage',
    phase: 'before',
    title: 'Disaster Field Tent Triage',
    dispatch: 'Aftershock field tent — oxygen and ventilators rationed.',
    setting: 'Field Casualty Tent',
    sites: ['East Tent', 'West Tent'],
    channels: {
      triage: { label: 'START Triage', verb: 'has tighter survival window than', short: 'START' },
      vitals: { label: 'Oxygen Ration', verb: 'is burning O2 supply faster than', short: 'O2' },
      labs: { label: 'Tourniquet Audit', verb: 'has heavier arterial bleed than', short: 'Bleed' },
      imaging: { label: 'Ventilator Queue', verb: 'needs the ventilator before', short: 'Vent' },
      handoff: { label: 'Convoy Evac', verb: 'must evacuate by convoy before', short: 'Convoy' },
      consult: { label: 'Field Surgery', verb: 'needs damage-control OR before', short: 'Surgery' },
    },
  },

  // INSIDE: Active Trauma Situation
  {
    id: 'resuscitation-bay',
    phase: 'inside',
    title: 'Active Resuscitation Bay',
    dispatch: 'Multiple bays deteriorating at once — act fast on live telemetry.',
    setting: 'Trauma Resuscitation',
    sites: ['Trauma Bay A', 'Trauma Bay B'],
    channels: {
      triage: { label: 'Airway Status', verb: 'is losing airway faster than', short: 'Airway' },
      vitals: { label: 'Arterial Line', verb: 'is dropping systolic BP faster than', short: 'Art-Line' },
      labs: { label: 'Clotting Panel', verb: 'has worse coagulopathy than', short: 'Coag' },
      imaging: { label: 'Trauma CT', verb: 'has faster-expanding bleed than', short: 'CT' },
      handoff: { label: 'Pressor Drip', verb: 'needs vasopressors sooner than', short: 'Pressors' },
      consult: { label: 'Trauma Surgery', verb: 'needs emergency OR sooner than', short: 'Surgery' },
    },
  },
  {
    id: 'toxicology-crisis',
    phase: 'inside',
    title: 'Chemical Exposure Ward',
    dispatch: 'Industrial rail leak — limited antidotes and rising hypoxia.',
    setting: 'Acute Toxicology',
    sites: ['Decon Wing', 'ICU Pod'],
    channels: {
      triage: { label: 'Antidote Queue', verb: 'needs antidote bolus sooner than', short: 'Antidote' },
      vitals: { label: 'Cardiac Strip', verb: 'has more unstable rhythm than', short: 'ECG' },
      labs: { label: 'Tox Assay', verb: 'carries higher toxin load than', short: 'Tox' },
      imaging: { label: 'Chest X-Ray', verb: 'shows faster lung edema than', short: 'X-Ray' },
      handoff: { label: 'Decon Intake', verb: 'had heavier chemical dose than', short: 'Decon' },
      consult: { label: 'Dialysis Desk', verb: 'needs toxin clearance before', short: 'Dialysis' },
    },
  },
  {
    id: 'hemorrhage-cascade',
    phase: 'inside',
    title: 'Massive Hemorrhage Call',
    dispatch: 'Massive transfusion protocol active — blood coolers low.',
    setting: 'Operating Suite',
    sites: ['OR Suite 1', 'OR Suite 2'],
    channels: {
      triage: { label: 'Bleed Control', verb: 'is hemorrhaging faster than', short: 'Bleed' },
      vitals: { label: 'BP Telemetry', verb: 'is crashing in BP sooner than', short: 'BP' },
      labs: { label: 'Hemoglobin Stat', verb: 'has lower hemoglobin than', short: 'Hgb' },
      imaging: { label: 'Angiography', verb: 'has a larger vessel tear than', short: 'Angio' },
      handoff: { label: 'Blood Cooler', verb: 'needs transfusion pack before', short: 'Blood' },
      consult: { label: 'Vascular Suite', verb: 'needs vessel clamping before', short: 'Vascular' },
    },
  },
  {
    id: 'multi-bay-arrest',
    phase: 'inside',
    title: 'Simultaneous Code Blue',
    dispatch: 'Back-to-back cardiac arrests across the corridor — verify every call.',
    setting: 'Critical Care Corridor',
    sites: ['Resus North', 'Resus South'],
    channels: {
      triage: { label: 'Code Timer', verb: 'went pulseless earlier than', short: 'Code' },
      vitals: { label: 'Defib Strip', verb: 'has worse shockable rhythm than', short: 'Defib' },
      labs: { label: 'Arterial Gas', verb: 'has deeper blood acidosis than', short: 'ABG' },
      imaging: { label: 'POCUS Echo', verb: 'has tighter pericardial squeeze than', short: 'Echo' },
      handoff: { label: 'Crash Cart', verb: 'needs epinephrine dose before', short: 'Meds' },
      consult: { label: 'Thoracotomy', verb: 'needs chest opening sooner than', short: 'CT-Surg' },
    },
  },

  // AFTER: Family Conference, Ethics, M&M Review & Forensic Autopsy
  {
    id: 'family-conference',
    phase: 'after',
    title: 'Family Conference & Consent',
    dispatch: 'Relatives waiting across two rooms — verify directives & updates.',
    setting: 'Post-Trauma Consultation',
    sites: ['Quiet Room 1', 'Quiet Room 2'],
    channels: {
      triage: { label: 'Advance Directive', verb: 'has stricter care limits than', short: 'Directive' },
      vitals: { label: 'Prognosis Shift', verb: 'faces a sharper decline than', short: 'Prognosis' },
      labs: { label: 'Surrogate File', verb: 'has more urgent consent need than', short: 'Surrogate' },
      imaging: { label: 'Family Waitlist', verb: 'has waited longer for MD than', short: 'Waitlist' },
      handoff: { label: 'Social Work', verb: 'has higher family distress than', short: 'Liaison' },
      consult: { label: 'Palliative Talk', verb: 'needs goals-of-care talk before', short: 'Palliative' },
    },
  },
  {
    id: 'breaking-bad-news',
    phase: 'after',
    title: 'Breaking Bad News & Ethics',
    dispatch: 'High-stakes family talks — balance compassion, wishes, and truth.',
    setting: 'Family Liaison Suite',
    sites: ['Chapel Wing', 'Consult Room'],
    channels: {
      triage: { label: 'Living Will', verb: 'restricts escalation more than', short: 'Will' },
      vitals: { label: 'Brainstem Exam', verb: 'shows deeper neuro loss than', short: 'Neuro' },
      labs: { label: 'Organ Donor', verb: 'has a tighter donor window than', short: 'Donor' },
      imaging: { label: 'Kin Notification', verb: 'needs family outreach before', short: 'Kin' },
      handoff: { label: 'Chaplaincy', verb: 'needs bereavement care sooner than', short: 'Support' },
      consult: { label: 'Ethics Board', verb: 'has a sharper proxy dispute than', short: 'Ethics' },
    },
  },
  {
    id: 'mm-audit',
    phase: 'after',
    title: 'Morbidity & Mortality Review',
    dispatch: 'Post-shift safety review — trace clinical delays without blame.',
    setting: 'Hospital Quality Board',
    sites: ['Night Shift', 'Day Shift'],
    channels: {
      triage: { label: 'Timeline Audit', verb: 'suffered a longer delay than', short: 'Audit' },
      vitals: { label: 'Alarm Strip', verb: 'had an unheeded alarm before', short: 'Alarms' },
      labs: { label: 'Lab Turnaround', verb: 'waited longer for critical lab than', short: 'Labs' },
      imaging: { label: 'Handoff Audit', verb: 'lost more vital context than', short: 'Handoff' },
      handoff: { label: 'Medication Log', verb: 'faced a bigger dosing gap than', short: 'Meds' },
      consult: { label: 'Safety Board', verb: 'exposes a deeper care failure than', short: 'Safety' },
    },
  },
  {
    id: 'forensic-autopsy',
    phase: 'after',
    title: 'Forensic Autopsy Board',
    dispatch: 'Medical examiner review — reconstruct fatal sequence from clues.',
    setting: 'Medical Examiner Suite',
    sites: ['Exam Table A', 'Exam Table B'],
    channels: {
      triage: { label: 'Injury Sequence', verb: 'sustained fatal blow earlier than', short: 'Injury' },
      vitals: { label: 'Time-of-Death', verb: 'passed away earlier than', short: 'TOD' },
      labs: { label: 'Post-Mortem Tox', verb: 'had higher lethal toxin than', short: 'PM-Tox' },
      imaging: { label: 'Virtopsy CT', verb: 'shows older internal clot than', short: 'Virtopsy' },
      handoff: { label: 'Histology Slide', verb: 'shows earlier tissue necrosis than', short: 'Tissue' },
      consult: { label: 'ME Ruling', verb: 'has stronger cause-of-death proof than', short: 'Pathology' },
    },
  },
]);

export const SCENARIOS_BY_PHASE = Object.freeze({
  before: SCENARIOS.filter((s) => s.phase === 'before'),
  inside: SCENARIOS.filter((s) => s.phase === 'inside'),
  after: SCENARIOS.filter((s) => s.phase === 'after'),
});

export function getScenarioById(id) {
  return SCENARIOS.find((s) => s.id === id) || SCENARIOS[0];
}
