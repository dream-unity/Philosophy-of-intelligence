// Patient roster and authentic clinical scenarios spanning Before, Inside, and After trauma care.
// All names are short, distinct, culturally varied, and paired with bedside trauma tags.

export const PATIENTS = Object.freeze([
  { id: 'nadia', name: 'Nadia', code: 'BAY 01', tag: 'Airway', baseBpm: 84 },
  { id: 'caleb', name: 'Caleb', code: 'BAY 02', tag: 'Bleed', baseBpm: 92 },
  { id: 'priya', name: 'Priya', code: 'BAY 03', tag: 'Shock', baseBpm: 88 },
  { id: 'devon', name: 'Devon', code: 'BAY 04', tag: 'Neuro', baseBpm: 76 },
  { id: 'maren', name: 'Maren', code: 'BAY 05', tag: 'Thorax', baseBpm: 90 },
  { id: 'tomas', name: 'Tomas', code: 'BAY 06', tag: 'Crush', baseBpm: 86 },
  { id: 'hana', name: 'Hana', code: 'BAY 07', tag: 'Burn', baseBpm: 94 },
  { id: 'gideon', name: 'Gideon', code: 'BAY 08', tag: 'Sepsis', baseBpm: 96 },
  { id: 'selma', name: 'Selma', code: 'BAY 09', tag: 'Spine', baseBpm: 78 },
  { id: 'rory', name: 'Rory', code: 'BAY 10', tag: 'Toxic', baseBpm: 89 },
]);

export const PATIENT_BY_ID = Object.freeze(
  Object.fromEntries(PATIENTS.map((p) => [p.id, p]))
);

export const PATIENT_IDS = Object.freeze(PATIENTS.map((p) => p.id));

// 6 fixed structural channel slots (mapped to scenario-specific clinical labels and verbs).
export const CHANNEL_IDS = Object.freeze([
  'triage',
  'vitals',
  'labs',
  'imaging',
  'handoff',
  'consult',
]);

// 12 rich medical scenarios across the 3 phases of a trauma doctor's work.
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
      triage: { label: 'EMS Dispatch', verb: 'prioritized over', short: 'EMS' },
      vitals: { label: 'Field Vitals', verb: 'declined faster than', short: 'Vitals' },
      labs: { label: 'Blood Bank', verb: 'matched blood for', short: 'Blood' },
      imaging: { label: 'Field Ultrasound', verb: 'flagged bleed before', short: 'FAST' },
      handoff: { label: 'Transport Queue', verb: 'yielded rig to', short: 'Queue' },
      consult: { label: 'Trauma Lead', verb: 'assigned team to', short: 'Lead' },
    },
  },
  {
    id: 'helicopter-dispatch',
    phase: 'before',
    title: 'Air-Evac Allocation',
    dispatch: 'One medevac chopper left before storm ceiling closes.',
    setting: 'Regional Dispatch Desk',
    sites: ['Ridge Clinic', 'Harbor ER'],
    channels: {
      triage: { label: 'Flight Triage', verb: 'outweighed urgency of', short: 'Flight' },
      vitals: { label: 'O2 Telemetry', verb: 'dropped steeper than', short: 'O2' },
      labs: { label: 'Crossmatch', verb: 'reserved plasma for', short: 'Plasma' },
      imaging: { label: 'Portable Scan', verb: 'cleared runway ahead of', short: 'Scan' },
      handoff: { label: 'Medic Relay', verb: 'handed kit to', short: 'Relay' },
      consult: { label: 'Receiving Chief', verb: 'cleared OR for', short: 'Chief' },
    },
  },
  {
    id: 'surge-bed-budget',
    phase: 'before',
    title: 'ER Surge Time Budget',
    dispatch: 'Holiday night surge — scarce beds and tight minutes.',
    setting: 'Triage Control Board',
    sites: ['Red Zone', 'Yellow Zone'],
    channels: {
      triage: { label: 'Acuity Score', verb: 'outranked stability of', short: 'Acuity' },
      vitals: { label: 'Shock Index', verb: 'escalated ahead of', short: 'Shock' },
      labs: { label: 'Lactate Draw', verb: 'spiked earlier than', short: 'Lactate' },
      imaging: { label: 'Bedside Echo', verb: 'triggered alert before', short: 'Echo' },
      handoff: { label: 'Charge Nurse', verb: 'shifted monitor to', short: 'Charge' },
      consult: { label: 'Anesthesia', verb: 'held airway slot for', short: 'Airway' },
    },
  },
  {
    id: 'austere-disaster-triage',
    phase: 'before',
    title: 'Disaster Zone Resource Triage',
    dispatch: 'Aftershock field tent — oxygen and stretchers rationed.',
    setting: 'Field Casualty Tent',
    sites: ['East Tent', 'West Tent'],
    channels: {
      triage: { label: 'START Tag', verb: 'triaged ahead of', short: 'START' },
      vitals: { label: 'O2 Cylinder', verb: 'depleted faster than', short: 'O2' },
      labs: { label: 'Field Tourniquet', verb: 'stabilized bleed before', short: 'Bleed' },
      imaging: { label: 'Airway Kit', verb: 'reserved tube for', short: 'Airway' },
      handoff: { label: 'Evac Stretcher', verb: 'yielded slot to', short: 'Evac' },
      consult: { label: 'Field Commander', verb: 'routed surgeon to', short: 'Cmd' },
    },
  },

  // INSIDE: Active Trauma Situation
  {
    id: 'resuscitation-bay',
    phase: 'inside',
    title: 'Active Resuscitation Bay',
    dispatch: 'Two bays coding at once — act fast on live telemetry.',
    setting: 'Trauma Resuscitation',
    sites: ['Trauma Bay A', 'Trauma Bay B'],
    channels: {
      triage: { label: 'Airway Team', verb: 'intervened before', short: 'Airway' },
      vitals: { label: 'Arterial Line', verb: 'crashed ahead of', short: 'Art-Line' },
      labs: { label: 'Clotting Panel', verb: 'flagged risk for', short: 'Coag' },
      imaging: { label: 'Trauma CT', verb: 'ruled priority over', short: 'CT' },
      handoff: { label: 'Infusion Pump', verb: 'transferred line to', short: 'Pump' },
      consult: { label: 'Trauma Surgeon', verb: 'scrubbed first for', short: 'Surgery' },
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
      triage: { label: 'Antidote Desk', verb: 'dosed ahead of', short: 'Antidote' },
      vitals: { label: 'Cardiac Strip', verb: 'destabilized before', short: 'ECG' },
      labs: { label: 'Tox Screen', verb: 'linked exposure to', short: 'Tox' },
      imaging: { label: 'Chest Film', verb: 'showed edema before', short: 'X-Ray' },
      handoff: { label: 'Pharmacy', verb: 'rerouted vial to', short: 'Pharm' },
      consult: { label: 'Toxicologist', verb: 'cleared protocol for', short: 'Consult' },
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
      triage: { label: 'Tourniquet Log', verb: 'held pressure before', short: 'Bleed' },
      vitals: { label: 'BP Monitor', verb: 'plunged earlier than', short: 'BP' },
      labs: { label: 'Hemoglobin', verb: 'triggered pack for', short: 'Hgb' },
      imaging: { label: 'Angiogram', verb: 'located leak before', short: 'Angio' },
      handoff: { label: 'Blood Runner', verb: 'diverted cooler to', short: 'Runner' },
      consult: { label: 'Vascular Lead', verb: 'clamped vessel for', short: 'Vascular' },
    },
  },
  {
    id: 'multi-bay-arrest',
    phase: 'inside',
    title: 'Simultaneous Code Blue',
    dispatch: 'Back-to-back arrests across the corridor — verify every call.',
    setting: 'Critical Care Corridor',
    sites: ['Resus North', 'Resus South'],
    channels: {
      triage: { label: 'Code Leader', verb: 'called shock before', short: 'Code' },
      vitals: { label: 'Defib Pad', verb: 'read arrest ahead of', short: 'Defib' },
      labs: { label: 'ABG Draw', verb: 'flagged acidosis for', short: 'ABG' },
      imaging: { label: 'POCUS Echo', verb: 'spotted tamponade in', short: 'Echo' },
      handoff: { label: 'Crash Cart', verb: 'rolled meds to', short: 'Cart' },
      consult: { label: 'Cardiothoracic', verb: 'opened chest for', short: 'CT-Surg' },
    },
  },

  // AFTER: Family Conference, M&M Review & Forensic Autopsy
  {
    id: 'family-conference',
    phase: 'after',
    title: 'Family Conference & Consent',
    dispatch: 'Relatives waiting across two rooms — verify surrogates & updates.',
    setting: 'Post-Trauma Consultation',
    sites: ['Quiet Room 1', 'Quiet Room 2'],
    channels: {
      triage: { label: 'Directive File', verb: 'named surrogate for', short: 'Directive' },
      vitals: { label: 'Prognosis Note', verb: 'updated status of', short: 'Prognosis' },
      labs: { label: 'Ethics Record', verb: 'verified proxy for', short: 'Ethics' },
      imaging: { label: 'Care Summary', verb: 'briefed kin of', short: 'Summary' },
      handoff: { label: 'Social Work', verb: 'connected family to', short: 'Liaison' },
      consult: { label: 'Palliative MD', verb: 'guided talk for', short: 'Palliative' },
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
      triage: { label: 'Advance Wish', verb: 'restricted escalation for', short: 'Wish' },
      vitals: { label: 'Brainstem Exam', verb: 'confirmed status before', short: 'Neuro' },
      labs: { label: 'Donor Registry', verb: 'verified consent for', short: 'Donor' },
      imaging: { label: 'Kin Briefing', verb: 'notified relatives of', short: 'Kin' },
      handoff: { label: 'Chaplaincy', verb: 'accompanied family of', short: 'Support' },
      consult: { label: 'Ethics Chair', verb: 'ratified decision for', short: 'Ethics' },
    },
  },
  {
    id: 'mm-audit',
    phase: 'after',
    title: 'Morbidity & Mortality Review',
    dispatch: 'Post-shift safety review — trace what went wrong without blame.',
    setting: 'Hospital Quality Board',
    sites: ['Night Shift', 'Day Shift'],
    channels: {
      triage: { label: 'Chart Audit', verb: 'traced delay to', short: 'Audit' },
      vitals: { label: 'Event Strip', verb: 'predated alarm on', short: 'Strip' },
      labs: { label: 'Sample Chain', verb: 'misrouted tube of', short: 'Sample' },
      imaging: { label: 'Readback Log', verb: 'missed flag on', short: 'Readback' },
      handoff: { label: 'Shift Sign-Out', verb: 'passed error to', short: 'Sign-Out' },
      consult: { label: 'Safety Chair', verb: 'attributed root to', short: 'Safety' },
    },
  },
  {
    id: 'forensic-autopsy',
    phase: 'after',
    title: 'Forensic Autopsy Board',
    dispatch: 'Medical examiner review — reconstruct cause from sparse clues.',
    setting: 'Medical Examiner Suite',
    sites: ['Exam Table A', 'Exam Table B'],
    channels: {
      triage: { label: 'Injury Map', verb: 'preceded trauma in', short: 'Injury' },
      vitals: { label: 'Time-of-Death', verb: 'occurred before', short: 'TOD' },
      labs: { label: 'Post-Mortem Tox', verb: 'linked agent to', short: 'PM-Tox' },
      imaging: { label: 'Virtopsy Scan', verb: 'revealed clot before', short: 'Virtopsy' },
      handoff: { label: 'Chain Custody', verb: 'transferred slide to', short: 'Custody' },
      consult: { label: 'Pathologist', verb: 'ruled primary cause for', short: 'Pathology' },
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
