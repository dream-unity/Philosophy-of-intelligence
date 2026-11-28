import { challengeOwnHypothesis, reviewOwnHandover } from './working-hypothesis.js';

// Short cases that can also be replayed with one decisive fact changed.
function dispatch(c) {
  const [a, b] = c.p;
  const aLimit = c.int(5, 7);
  const bLimit = aLimit + c.int(2, 4);
  const us = aLimit - 1;
  const rescueA = c.flip();
  const spare = c.int(1, 3);
  const aTime = rescueA ? aLimit - spare : aLimit + 1;
  const bTime = rescueA ? bLimit + 1 : bLimit - spare;
  const target = rescueA ? b : a;
  const other = rescueA ? a : b;
  const otherTime = rescueA ? aTime : bTime;
  const tooLate = rescueA ? bTime : aTime;
  return {
    title: 'Two calls from the bridge', phase: 'Before',
    question: 'Who should your crew go to?',
    clues: [
      `${a} needs a crew within ${aLimit} minutes. ${b} can wait ${bLimit}.`,
      `Each crew takes one patient. Yours reaches either in ${us} minutes.`,
      `The other crew reaches ${a} in ${aTime} minutes or ${b} in ${bTime}.`
    ],
    options: [`Go to ${a}`, `Go to ${b}`], answer: rescueA ? 1 : 0,
    outcome: 'Both crews arrive in time.',
    why: `Your crew reaches ${target} in ${us} minutes. The other reaches ${other} in ${otherTime}. Swap them and ${target} waits ${tooLate} minutes, one too long.`
  };
}

function airPocket(c) {
  const [patient] = c.p;
  const low = c.flip();
  return {
    title: 'The dimming signal', phase: 'During',
    question: 'Which explanation should you check first?',
    clues: [
      `${patient}’s finger sensor shows a sudden drop in its oxygen reading.`,
      'The team compares two explanations. A loose clip would affect one hand. A body-wide fall would affect both.',
      low ? 'A separate sensor on the other hand shows the same fall.' : 'A separate sensor on the other hand holds steady.'
    ],
    options: ['A loose finger clip', 'A real fall in oxygen'],
    answer: low ? 1 : 0,
    why: low ? 'Two separate sensors fall together. A loose clip on one finger only explains one reading.' : 'The other hand stays steady. The loose clip can account for that difference.'
  };
}

function leadingReport(c) {
  const [patient] = c.p;
  const witnessed = c.flip();
  return {
    title: 'Two voices on the radio', phase: 'Before',
    question: 'What can you tell the receiving doctor?',
    clues: [
      `The caller says ${patient} blacked out before the crash.`,
      'The ambulance note says the same thing.',
      witnessed ? 'The note quotes a passenger who saw the blackout. The caller saw it from the pavement.' : 'The note names the caller as its only source. No one else saw the blackout.'
    ],
    options: ['Two witnesses describe a blackout.', 'One witness describes a blackout.', 'The crash caused the blackout.'],
    answer: witnessed ? 0 : 1,
    why: witnessed ? 'The passenger and caller had separate views. Their accounts support the timing. Neither establishes the cause.' : 'The ambulance note repeats the caller. A second document adds no second witness, and the cause is still open.'
  };
}

function tubeRoute(c) {
  const [p] = c.p;
  const damaged = c.flip();
  return {
    title: 'The spare monitor', phase: 'During',
    question: 'Where does the fault appear to be?',
    clues: [
      `At ${p}’s bedside, a sensor sends its signal through a lead to a screen.`,
      'You change one part at a time. Exactly one part is faulty.',
      damaged ? 'A new lead restores the picture. The old lead also fails on a working setup.' : 'A new lead changes nothing. The same sensor and lead work on a spare screen.'
    ],
    options: ['The sensor', 'The lead', 'The screen'], answer: damaged ? 1 : 2,
    why: damaged ? 'The failure travels with the old lead, even to an otherwise working setup.' : 'The sensor and lead work together on the spare screen. Only the original screen is left.'
  };
}

function eventWindow(c) {
  const [p] = c.p;
  const image = c.pick(['down', 'standing', 'hidden']);
  return {
    title: 'The missing minute', phase: 'After',
    question: 'What time of the fall can you report?',
    clues: [
      `${p} fell once and stayed down. An alarm sounded exactly one minute after the fall.`,
      'The log has two alarms, at 9:11 and 9:14. Only one was theirs.',
      image === 'hidden' ? 'At 9:12 the door camera shows the bay curtain closed.' :
        `At 9:12 the door camera shows ${p} ${image === 'down' ? 'already on the floor' : 'still standing'}.`
    ],
    options: ['9:10', '9:13', 'Either time still fits'],
    answer: image === 'down' ? 0 : image === 'standing' ? 1 : 2,
    why: 'The alarms put the fall at 9:10 or 9:13. ' + (image === 'down' ? 'Already down at 9:12 rules out the later fall.' : image === 'standing' ? 'Still standing at 9:12 rules out the earlier fall.' : 'The closed curtain cannot distinguish those two accounts.')
  };
}

function followPattern(c) {
  const [a,b] = c.p;
  const grows = c.flip();
  return {
    title: 'Under the dressing', phase: 'During',
    question: 'Whose dressing fits the earlier pattern?',
    clues: [
      grows ? 'Two reopened wounds had growing centre patches. A dressing with only new edge spots covered a dry wound.' : 'Two hidden leaks made fresh stains at the edge. A spreading stain in the centre had no leak beneath it.',
      `${a}’s stain is spreading in the centre. Nothing new at the edge.`,
      `${b}’s centre stain is unchanged. Fresh spots have appeared at the edge.`
    ],
    options: [`Recheck ${a}`, `Recheck ${b}`], answer: grows ? 0 : 1,
    why: grows ? `A growing centre patch appeared over both reopened wounds. ${a} fits that pattern. Checking the dressing can test the inference.` : `An edge stain distinguished the two earlier leaks. ${b} fits that observation. The past cases suggest where to look first.`
  };
}

function transferOrder(c) {
  const [a,b,d] = c.p;
  const first = c.flip();
  return {
    title: 'A lift for one stretcher', phase: 'During',
    question: 'Who must ride first?',
    clues: [
      first ? `${a} must reach theatre before ${b}.` : `${a} must reach theatre after ${b}.`,
      first ? `${d} can enter only after ${b}.` : `${d} must reach theatre before ${b}.`,
      'The only lift opens directly into theatre. One stretcher enters on each trip.'
    ],
    options:[a,b,d], answer:first?0:2,
    why:first ? `${a} must precede ${b}, and ${b} must precede ${d}. Sending ${b} now would break the first condition.` : `${d} must precede ${b}, and ${b} must precede ${a}. Only ${d} can leave now.`
  };
}

function changingCondition(c) {
  const [a,b] = c.p;
  const improved = c.flip();
  const base = c.int(4,7);
  return {
    title: 'The quieter voice', phase:'During',
    question:'Whose speech has worsened more?',
    clues:[
      `Before the smoke, ${a} and ${b} could say ${base+3} and ${base} words per breath respectively.`,
      `Now ${a} manages ${base+1} words per breath.`,
      `Now ${b} manages ${improved ? base-1 : base-3}.`
    ],
    options:[a,b], answer:improved?0:1,
    why:improved ? `${a} lost two words per breath, ${b} one. ${b} has the lower reading, but ${a} has changed more.` : `${b} lost three words per breath against ${a}’s two. The question asks whose own speech changed more.`
  };
}

function conflictingDuty(c) {
  const [patient, partner, cousin] = c.p;
  const ridingPartner = c.flip(), callerIsPartner = c.flip();
  const caller=callerIsPartner ? partner : cousin;
  const rode=callerIsPartner === ridingPartner;
  return {
    title:'At the family-room door', phase:'After',
    question:`What can you tell ${caller} now?`,
    clues:[
      `${patient} says, “Only my partner may hear my scan result. Only whoever rode with me may know my room.”`,
      `${partner} is their partner. ${cousin} is their cousin.`,
      `${ridingPartner ? partner : cousin} rode in the ambulance. The other visitor met it at the door.`
    ],
    options:['Give the room only.', 'Give the scan result only.', 'Share both.', 'Ask permission before sharing either.'],
    answer:callerIsPartner ? (rode ? 2 : 1) : (rode ? 0 : 3),
    why:`${caller} is the ${callerIsPartner ? 'partner' : 'cousin'} and ${rode ? 'rode in the ambulance' : 'met it at the door'}. Permission for the result follows the patient’s relationship. Permission for the room follows the journey.`
  };
}

function secondCheck(c) {
  const [p] = c.p;
  const independent = c.flip();
  return {
    title:'Who saw the change?', phase:'After',
    question:'Which check could overturn your first account?',
    clues:[
      `Your report says ${p} was already awake when the crew arrived.`,
      'The ward note copied your report. You want a check that could prove it wrong.',
      independent ? 'The driver saw the arrival. The porter came later and read the ward note.' : 'The porter saw the arrival. The driver came later and read the ward note.'
    ],
    options:['Ask the driver.', 'Ask the porter.', 'Re-read the ward note.'],answer:independent?0:1,
    why:`Only the ${independent?'driver':'porter'} saw the arrival independently. The copied note would return your original claim to you.`
  };
}


function buildSignalModel(c) {
  const [patient] = c.p;
  const circles = c.pick([0, 1, 2]);
  const first = c.flip() ? 'blue' : 'green';
  const second = first === 'blue' ? 'green' : 'blue';
  const options = [`Feed ${first} from the sensor`, `Feed ${second} from the sensor`,
    `Have ${first} copy ${second}`, `Have ${second} copy ${first}`];
  const accept = circles === 0 ? [[0,1],[0,3],[1,2]] : circles === 1 ? [[1,2]] : [[0,3]];
  return {
    title:'One pulse, two screens', phase:'During',
    question:'Build a possible source for each screen’s reading.',
    clues:[
      `${patient} wears the only live sensor. Both screens show their changing pulse.`,
      'Each screen takes one input, either the live sensor or a copy of the other screen.',
      circles === 0 ? 'Both receivers and the link between screens work.' :
        `The ${circles === 1 ? first : second} screen’s sensor receiver is unplugged. The link between screens works.`
    ],
    options, answer:accept[0],
    build:{pieces:options.map(text=>({text})),accept},
    why: circles === 0 ? 'Each screen needs a route back to the live sensor. Two direct feeds or one direct feed with a copy work. A loop of copies has no source.' :
      `The ${circles === 1 ? second : first} screen must take the live feed. The unplugged screen can copy it. Two screens copying each other would have no source.`
  };
}

export const fieldCases = {1:airPocket, 7:tubeRoute, 8:eventWindow, 9:leadingReport, 12:followPattern, 15:transferOrder, 25:changingCondition, 43:dispatch, 59:buildSignalModel, 66:conflictingDuty, 71:challengeOwnHypothesis, 73:reviewOwnHandover, 75:secondCheck};
