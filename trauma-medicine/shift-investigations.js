// A check and its result stay together when the checks change order.
function caseWithCheck(c, title, phase, question, clues, checks) {
  const start = c.int(0, checks.length - 1);
  const ordered = [...checks.slice(start), ...checks.slice(0, start)];
  if (c.flip()) ordered.reverse();
  const results = ordered.map(check => check.result);
  return {
    title, phase, ...results[0],
    investigation: {
      question, clues, options: ordered.map(check => check.action),
      useful: ordered.flatMap((check, i) => check.useful ? [i] : []), results
    }
  };
}

function chestScan(c) {
  const [patient] = c.p;
  const side = c.flip() ? 'left' : 'right';
  const opposite = side === 'left' ? 'right' : 'left';
  const fluid = c.flip();
  const whySide = `Both explanations concern the ${side} lung. Finding no excess fluid on the ${opposite} side leaves the affected side untested.`;
  const fluidPrediction = 'A pocket of excess fluid restricts movement and would be visible around that lung.';
  const plugPrediction = 'An airway plug alone restricts movement without producing a pocket of excess fluid.';
  const options = ['A pocket of excess fluid around the lung', 'A plug in its airway', 'Both explanations still fit'];
  const interpret = (clues, answer, why) => ({question:'Which explanation fits the evidence you have?', clues, options, answer, why});
  return caseWithCheck(c, 'One side barely moves', 'During', 'Which check can separate the two explanations?', [
    `The team is supporting ${patient}. Their ${side} lung barely expands.`,
    'The team has narrowed it to a pocket of excess fluid around that lung or a plug in its airway. Only one applies.',
    'The scan would show that pocket on the side imaged.'
  ], [
    {action:`Scan around the ${side} lung`, useful:true, result:interpret([
      `One cause affects the ${side} lung. On that side, ${fluid ? 'a large fluid pocket is visible' : 'no excess fluid is visible'}.`,
      fluidPrediction, plugPrediction
    ], fluid ? 0 : 1, fluid ? 'The affected-side scan showed a large fluid pocket. A plug alone would not produce that pocket.' :
      'No excess fluid is visible around the poorly expanding lung. Of the two explanations in this case, the airway plug remains.')},
    {action:`Scan around the ${opposite} lung`, useful:false, result:interpret([
      `One cause affects the ${side} lung. On the ${opposite} scan, no excess fluid is visible.`,
      fluidPrediction, plugPrediction
    ], 2, whySide)},
    {action:'Measure chest movement again', useful:false, result:interpret([
      `Movement check only: the ${side} lung still barely expands. One cause is responsible.`,
      fluidPrediction, plugPrediction
    ], 2, 'Repeating the shared finding confirms the problem but cannot select its explanation. An excess pocket around the affected lung is where the accounts differ.')}
  ]);
}

function doubleVision(c) {
  const [patient] = c.p;
  const eye = c.flip() ? 'left' : 'right';
  const other = eye === 'left' ? 'right' : 'left';
  const singleEye = c.flip();
  const alignment = 'Different eye directions give two lights together, one with either eye alone.';
  const doubling = `If the ${eye} eye doubles images, two appear whenever it’s open. The ${other} eye alone sees one.`;
  const options = ['The eyes point differently', `The ${eye} eye doubles the image by itself`, 'Both accounts still fit'];
  const interpret = (clues, answer, why) => ({question:'Which account survives this check?', clues, options, answer, why});
  return caseWithCheck(c, 'Two ceiling lights', 'During', 'Which view gives the two accounts different predictions?', [
    `${patient} sees two lights with both eyes open. The team compares just two accounts.`,
    'If the eyes point differently, either eye alone sees one light.',
    `If the ${eye} eye doubles images itself, it sees two alone. The ${other} eye sees one.`
  ], [
    {action:`Look with the ${eye} eye alone`, useful:true, result:interpret([
      `${patient} saw two lights together. The ${eye} eye alone now sees ${singleEye ? 'two' : 'one'}.`,
      alignment, doubling
    ], singleEye ? 1 : 0, singleEye ? `Two lights remain with only the ${eye} eye in use. The two-eyes account predicted one.` :
      `The ${eye} eye sees one alone. A problem doubling its own image predicted two. The doubling requires both eyes here.`)},
    {action:`Look with the ${other} eye alone`, useful:false, result:interpret([
      `${patient} saw two lights together. The ${other} eye alone now sees one.`,
      alignment, doubling
    ], 2, `One light in the ${other} eye is expected both when the eyes point differently and when only the ${eye} eye doubles images.`)},
    {action:'Look with both eyes again', useful:false, result:interpret([
      `${patient} opens both eyes again and still sees two lights.`,
      alignment, doubling
    ], 2, `The repeated view leaves both predictions true. Using only the ${eye} eye would give them different predictions.`)}
  ]);
}

function pupilHistory(c) {
  const [patient] = c.p;
  const side = c.flip() ? 'left' : 'right';
  const always = c.flip();
  const histories = `One history says the ${side} pupil was always wider. The other says the pupils were equal until the fall.`;
  const options = ['The size difference predates the fall', 'Supports previously equal pupils', 'This source cannot distinguish the histories'];
  const interpret = (clues, answer, why) => ({question:'Which history can you support?', clues, options, answer, why});
  return caseWithCheck(c, 'The old eye drawing', 'During', 'Which source could distinguish the two histories?', [
    `${patient}’s ${side} pupil is larger. One relative says it was always larger. Another says both were equal before the fall.`,
    'An old clinic drawing records sizes in equal light. Yesterday’s “normal” check recorded light reaction only.',
    'The transfer note copied today’s exam.'
  ], [
    {action:'Read the old clinic drawing', useful:true, result:interpret([
      `Today ${patient}’s ${side} pupil is wider.`,
      histories,
      `Clinic drawing before the fall, in equal light: left ${always && side === 'left' ? 4 : 3} mm, right ${always && side === 'right' ? 4 : 3} mm.`
    ], always ? 0 : 1, always ? 'The old drawing independently documents the same difference. It supports the account that the difference was already present.' :
      'The earlier sizes were equal, which weighs against “always larger.” The drawing helps date the change without establishing its cause.')},
    {action:'Read yesterday’s normal check', useful:false, result:interpret([
      `Today the ${side} pupil is wider. Both pupils shrink in light.`,
      histories,
      'Yesterday’s check lists one measurement: left and right both shrank in light.'
    ], 2, 'Normal reaction can occur with unequal sizes, as today’s exam shows. The older date cannot supply the missing size measurement.')},
    {action:'Read the transfer note', useful:false, result:interpret([
      histories,
      `Today’s exam after the fall records left ${side === 'left' ? 5 : 3} mm and right ${side === 'right' ? 5 : 3} mm.`,
      'The transfer note quotes those figures from that same exam.'
    ], 2, 'The note repeats the present finding. It adds no observation from before the fall.')}
  ]);
}

function departureFilm(c) {
  const [patient] = c.p;
  const stamp = c.pick(['10:06','10:16','10:26']);
  const later = stamp.slice(0,4) + '8';
  const band = c.pick(['K4','K7']);
  const other = band === 'K4' ? 'K7' : 'K4';
  const moved = c.flip();
  const labels = c.pick([['Blue','Gold','Red'],['Red','Blue','Gold'],['Gold','Red','Blue']]);
  const [right,wrongPerson,wrongTime] = labels;
  const options = ['Their fingers moved at the check', 'Their fingers stayed still at the check', 'This clip cannot settle it'];
  const result = (clues, answer, why) => ({question:'What can you enter about the departure check?', clues, options, answer, why});
  return caseWithCheck(c, 'The departure film', 'After', 'Which clip can settle what happened at the check?', [
    `At ${stamp}, ${patient} was asked to move their fingers. Two notes disagree. Their wristband was ${band}.`,
    `${right} was filmed at ${stamp}, band ${band}. ${wrongPerson}: ${stamp}, band ${other}.`,
    `${wrongTime}: ${later}, band ${band}. Each clip clearly shows the hand throughout its own check.`
  ], [
    {action:`Watch ${right.toLowerCase()}`, useful:true, result:result([
      `${patient}’s check was at ${stamp}. Their band was ${band}.`,
      `Clip: band ${band}, time ${stamp}. The wrist and camera stay still.`,
      moved ? 'The fingertip slides from mark 2 to mark 3.' : 'The fingertip stays on mark 2 throughout the check.'
    ], moved ? 0 : 1, 'Both the wristband and time identify the disputed check. Describe the observed movement without inferring its cause.')},
    {action:`Watch ${wrongPerson.toLowerCase()}`, useful:false, result:result([
      `${patient}’s check was at ${stamp}. Their band was ${band}.`,
      `Clip: band ${other}, time ${stamp}. The wrist and camera stay still.`,
      'The fingertip slides from mark 2 to mark 3.'
    ], 2, 'The time matches. The wristband belongs to another person, whose movement says nothing about this patient’s hand.')},
    {action:`Watch ${wrongTime.toLowerCase()}`, useful:false, result:result([
      `${patient}’s check was at ${stamp}. Their band was ${band}.`,
      `Clip: band ${band}, time ${later}. The fingertip stays still throughout.`,
      'Finger movement can change between checks.'
    ], 2, 'The wristband matches, but the clip captures a later check. Its finding cannot establish what happened earlier.')}
  ]);
}

function newNumbness(c) {
  const [patient] = c.p;
  const prior = c.flip();
  const toe = c.pick(['big toe','little toe']);
  const splintPrediction = 'Your account puts the first numbness at splinting.';
  const injuryPrediction = 'Numbness from the injury can begin immediately or after a delay.';
  const options = ['The splint caused the first numbness', 'The first recorded numbness predates the splint', 'Either cause is still possible'];
  const result = (clues, answer, why) => ({question:'What can you establish about the first numbness?', clues, options, answer, why});
  return caseWithCheck(c, 'The numb toe', 'During', 'Which check could disprove your splint explanation?', [
    `The team is already examining ${patient}. You suspect the splint started numbness in their ${toe}.`,
    'The injury itself could cause numbness before or after splinting.',
    'There are toe-by-toe touch maps from just before the splint and two later checks.'
  ], [
    {action:'Read the pre-splint touch map', useful:true, result:result([
      `Splint applied 12:10. At 12:07 ${patient} ${prior ? 'could not feel' : 'felt'} touch on the ${toe}. It is numb now.`,
      splintPrediction, injuryPrediction
    ], prior ? 1 : 2, prior ? 'The numbness came first, so splinting could not have started it. That does not settle what affects the toe now.' :
      'The timing allows the splint explanation. The injury might also have produced numbness later, so timing alone cannot choose the cause.')},
    {action:'Read the first post-splint map', useful:false, result:result([
      `Splint applied 12:10. At 12:14 ${patient} could not feel touch on the ${toe}.`,
      splintPrediction, injuryPrediction
    ], 2, 'A post-splint observation fits both causes. A pre-splint finding could have contradicted your proposed start.')},
    {action:'Read the later post-splint map', useful:false, result:result([
      `Splint applied 12:10. At 12:40 ${patient} could not feel touch on the ${toe}.`,
      splintPrediction, injuryPrediction
    ], 2, 'Another later finding confirms the symptom. It leaves the timing of onset open.')}
  ]);
}

function wetFloor(c) {
  const [patient] = c.p;
  const wet = c.flip();
  const right = c.flip();
  const mat = right ? 'blue' : 'green';
  const other = right ? 'green' : 'blue';
  const waterPrediction = 'Water must be under the slipping foot at the instant of the fall to start it.';
  const kneePrediction = 'The injured knee can buckle on a dry mat or a wet one.';
  const options = ['Water started the fall', 'Water could not have started the fall', 'Either account still fits'];
  const result = (clues,answer,why) => ({question:'What can you conclude?', clues, options, answer, why});
  return caseWithCheck(c, 'The fall in the walking room', 'After', 'What could rule out the wet-mat account?', [
    `${patient} fell on the ${mat} mat during walking practice. You suspect water there started the fall.`,
    'Their injured knee could also give way on a wet or dry mat.',
    'Each mat records whether its surface was wet at each step. The floor was cleaned afterwards.'
  ], [
    {action:`Check the ${mat} mat at the fall`, useful:true, result:result([
      `${patient} fell on ${mat}. At that step, the ${mat} mat was ${wet ? 'wet' : 'dry'} underfoot.`,
      waterPrediction, kneePrediction
    ], wet ? 2 : 1, wet ? 'Water was present, which permits the wet-mat account. It does not disprove the knee account.' :
      'A dry surface at the slip contradicts the proposed water cause. The knee account still fits.')},
    {action:`Check the ${other} mat at the fall`, useful:false, result:result([
      `${patient} fell on ${mat}. At that step, the separate ${other} mat was wet.`,
      waterPrediction, kneePrediction
    ], 2, 'A wet neighbouring mat cannot establish what was under this patient’s foot.')},
    {action:`Check the ${mat} mat after cleaning`, useful:false, result:result([
      `${patient} fell on ${mat}. The ${mat} mat was dry when checked after cleaning.`,
      waterPrediction, kneePrediction
    ], 2, 'The location matches but the time does not. Cleaning could have removed earlier water.')}
  ]);
}

function compareGrips(c) {
  const [patient] = c.p;
  const needToday = c.flip();
  const olderWeak = !needToday && c.flip();
  const currentWeak = !needToday || c.flip();
  const comparison = weak => weak ? 'the left grip was weaker' : 'both grips were equally strong';
  const yesterday = 'Yesterday’s original exam: ' + comparison(olderWeak) + '.';
  const today = (needToday ? 'You test both hands today: ' : 'Today’s independent tests: ') + comparison(currentWeak) + '.';
  const currentEvidence = 'Two staff have separately tested both hands today. Both found the left grip weaker.';
  const unconfirmed = 'Today’s two notes both quote one unverified call about a weaker left grip.';
  const unclearPast = 'Yesterday’s handover says “stable” without recording grip on either side.';
  const options = ['The difference is new since yesterday.', 'The difference was present at both exams.',
    'The hands tested equal both days.', 'We still need a comparison.'];
  const response = (clues, answer, why) => ({question:'What can you tell the patient?', clues, options, answer, why});
  const answer = !currentWeak ? 2 : olderWeak ? 1 : 0;
  const why = answer === 2 ? 'Both hands tested equally strong on both days. The copied report of unequal grip did not hold up on examination.' :
    answer === 1 ? 'The source from yesterday records the same left-sided difference found today. The available exams cannot date its original onset.' :
    'The earlier exam found equal grips. An independent check now finds the left weaker. The difference appeared between those two exams.';
  const confirmed = response([yesterday, today], answer, why);
  return caseWithCheck(c, 'Is this weakness new?', 'During', 'Which check fills the gap?', [
    `“Is this difference new since yesterday?” asks ${patient} after a hand injury.`,
    needToday ? yesterday : unclearPast,
    needToday ? unconfirmed : currentEvidence
  ], [
    {action:'Compare both hands now', useful:needToday, result:needToday ? confirmed : response([
      today, unclearPast],3,'A further exam confirms today’s difference. The comparison still needs an earlier measurement of both hands.')},
    {action:'Open yesterday’s original exam', useful:!needToday, result:needToday ? response([
      yesterday, unconfirmed],3,'Yesterday’s grips are documented. Today’s two notes share one unverified source, so an independent current exam is still missing.') : confirmed},
    {action:'Read today’s two notes again', useful:false, result:response(needToday ? [yesterday,unconfirmed] : [unclearPast,currentEvidence],3,
      needToday ? 'Reading two copies leaves the reported current difference unverified. Compare both hands today.' :
        'Both observers tested the hands today. Reading their notes again cannot supply yesterday’s grip measurements.')}
  ]);
}

export const investigations = {
  1: chestScan,
  4: doubleVision,
  9: c => (c.flip() ? pupilHistory : departureFilm)(c),
  75: c => (c.flip() ? newNumbness : wetFloor)(c),
  80: compareGrips
};
