// Constructive, social and reflective decisions for the trauma ward.
function twoPieceCase(content, labels, roles, validPairs) {
  return {
    ...content,
    options: labels,
    answer: validPairs[0],
    build: {
      goal: content.question,
      pieces: labels.map((text, i) => ({ text, tags: [roles[i]] })),
      accept: validPairs
    }
  };
}

const baseCases = {
  // Dialectical: keep the substance of two apparently incompatible requests.
  56(c) {
    const [patient, friend] = c.p;
    const newsFirst = c.flip();
    return {
      title: 'On the other side of the door', phase: 'After',
      question: 'When should the friend be in the room?',
      clues: [
        `${patient} wants to hear the scan result alone and would like company for the rest of the meeting.`,
        `${friend} would prefer to stay throughout but is happy to come for the part about helping at home.`,
        newsFirst ? 'The doctor will show the scan, then go over the plan for tonight.' : 'The doctor will go over the plan for tonight, then show the scan.'
      ],
      options: ['Join for the first part, then step out.', 'Wait outside, then join for the second part.', 'Stay for both parts and save questions until the end.'],
      answer: newsFirst ? 1 : 0,
      why: newsFirst ? `${patient} can hear the scan result alone. Joining afterward gives ${friend} a chance to ask how to help tonight.` : `${friend} can ask how to help tonight during the first part. Stepping out then gives ${patient} privacy for the scan result.`
    };
  },

  // First principles: derive what a record must establish to answer a question.
  57(c) {
    const [patient] = c.p;
    const delivery = c.flip();
    return {
      title: 'A record worth keeping', phase: 'After',
      question: 'What must the new record link?',
      clues: [
        `Two patients named ${patient} used the same bed today.`,
        'Each has a unique wristband number. Each message also has its own number.',
        delivery ? 'Tomorrow you must prove which patient actually received each message.' : 'Tomorrow you must prove which patient each unsent message was written for.'
      ],
      options: ['Message number + bed at sending', 'Message number + wristband checked at receipt', 'Message number + intended wristband at writing'],
      answer: delivery ? 1 : 2,
      why: delivery ? 'Receipt needs evidence at delivery. An intended recipient or a shared bed cannot establish who received the message.' : 'An unsent message has no recipient check yet. Its author can link it to the intended patient while writing.'
    };
  },

  // Lateral: move a different part of a seemingly fixed arrangement.
  58(c) {
    const [patient] = c.p;
    const freeCamera = c.flip();
    return {
      title: 'A live view', phase: 'During',
      question: 'How can the specialist see the live picture?',
      clues: [
        `${patient} and the scanner must stay in the bay.`,
        freeCamera ? 'The specialist must stay upstairs. The scanner has no network connection.' : 'No video link works. The specialist can come downstairs.',
        freeCamera ? 'A portable video phone can show the scanner screen.' : 'The lift carries people. The scanner will not fit.'
      ],
      options: ['Bring the specialist to the screen.', 'Carry the live picture upstairs by video.', 'Send the scanner upstairs.'],
      answer: freeCamera ? 1 : 0,
      why: freeCamera ? 'A separate camera can carry the picture while patient, scanner and specialist stay in place.' : 'Only the scanner and patient are fixed. Moving the viewer gives direct access to the live picture.'
    };
  },

  // Generative: construct a two-way exchange; more than one construction works.
  59(c) {
    const [patient] = c.p;
    const speaker = c.flip();
    const input = speaker ? 'can hear the speaker but cannot see your board' : 'can read your board but cannot hear the speaker';
    const options = ['Speak the question.', 'Hold up a written question.', 'Watch which answer they point to.', 'Read the answer they write.'];
    return twoPieceCase({
      title: 'Through the glass', phase: 'During',
      question: 'Build a way to ask and get an answer.',
      clues: [
        `Behind the glass, ${patient} ${input}.`,
        'They cannot speak. They can write or point to a yes/no card.',
        'You can see their hands and anything they write.'
      ],
      why: speaker ? 'Your voice gets the question in. Either pointing or writing brings the patient’s own answer back.' : 'Your board gets the question in. Either pointing or writing brings the patient’s own answer back.'
    }, options, ['question', 'question', 'reply', 'reply'], speaker ? [[0, 2], [0, 3]] : [[1, 2], [1, 3]]);
  },

  // Decomposition: identify the independent unknowns behind a single request.
  60(c) {
    const [patient, sibling] = c.p;
    const who = c.flip();
    const options = ['Check which wristband the image belongs to.', 'Confirm who may hear the result.', 'Ask the reader what the image shows.', 'Find who booked the scan.'];
    return {
      title: 'The envelope', phase: 'After',
      question: 'Which two checks would let you answer?',
      clues: [
        `${sibling} asks what ${patient}’s scan showed. You have one unread image.`,
        who ? `${patient} gave permission to tell ${sibling}.` : `The wristband on the image matches ${patient}.`,
        who ? 'The image came loose from its label.' : `${patient} has not said who may hear the result.`
      ],
      options, answer: who ? [0, 2] : [1, 2],
      why: who ? 'Permission is settled. You still need to identify the patient in the image and learn what it shows.' : 'Identity is settled. You still need the patient’s permission and an interpretation of the image.'
    };
  },

  // Emergence: two locally sensible actions produce a ward-wide outcome.
  61(c) {
    const exchange = c.flip();
    const east = c.flip();
    const start = east ? 'East' : 'West';
    const end = east ? 'West' : 'East';
    return exchange ? {
      title: 'Both teams are waiting', phase: 'During',
      question: 'Which action starts the transfer?',
      clues: [
        `${start} releases its stretcher only when ${end} reserves a bay.`,
        `${end}’s automatic reservation waits for ${start} to release the stretcher.`,
        'Signing a ward’s blue card reserves a bay on that ward. A call alerts its crew.'
      ],
      options: ['Sign East’s card.', 'Sign West’s card.', 'Call both crews.'],
      answer: east ? 1 : 0,
      why: `A signed ${end} card supplies the reservation ${start} is waiting for. An alert or a reservation on the sending ward leaves the circle intact.`
    } : {
      title: 'An echo on the family call', phase: 'During',
      question: 'Which link can you mute and still hear the family?',
      clues: [
        `The family’s microphone feeds ${start}. Their doctor hears only ${end}.`,
        'East passes everything it hears to West. West passes everything back to East.',
        'The first sentence keeps coming round as the family tries to speak.'
      ],
      options: ['Mute East’s feed to West.', 'Mute West’s feed to East.', 'Mute the family’s microphone.'],
      answer: east ? 1 : 0,
      why: `The voice still travels from ${start} to ${end}. Cutting the return link prevents the same words feeding back into the call.`
    };
  },

  // Interpersonal: choose the messenger who preserves both trust and privacy.
  62(c) {
    const [patient, nurse, sister, friend] = c.p;
    const friendInside = c.flip();
    return {
      title: 'Someone to sit with', phase: 'After',
      question: 'Who can you invite in now?',
      clues: [
        `${patient} asks for ${sister} or ${friend}, but wants the diagnosis kept from visitors.`,
        `${nurse} will give the update soon. Visitors must agree to step out for it.`,
        friendInside ? `${friend} agrees. ${sister} will come only if allowed to hear it.` : `${sister} agrees. ${friend} will come only if allowed to hear it.`
      ],
      options: [sister, friend, 'Both together'], answer: friendInside ? 1 : 0,
      why: `${friendInside ? friend : sister} offers the company ${patient} requested and accepts the boundary around the update.`
    };
  },

  // Mentalistic: infer someone's belief from the information they could access.
  63(c) {
    const [patient, sister] = c.p;
    const sawReturn = c.flip();
    return {
      title: 'What the family saw', phase: 'After',
      question: `What does ${sister} likely believe?`,
      clues: [
        `${sister} saw ${patient} go into the scan room.`,
        `While ${sister} was away, ${patient} returned to the ward.`,
        sawReturn ? `A porter then told ${sister}, “I just brought ${patient} back.”` : `${sister} has had no update and cannot see the ward.`
      ],
      options: ['The patient is still at the scanner.', 'The patient is back on the ward.', 'The scan result is ready.'],
      answer: sawReturn ? 1 : 0,
      why: sawReturn ? `${sister} has a direct update about the return. The porter said nothing about the result.` : `The last event ${sister} knows about is the trip into the scan room. That explains why they might still wait there.`
    };
  },

  // Motivation: vary one incentive while holding the other conditions fixed.
  64(c) {
    const [patient, friend] = c.p;
    const company = c.flip();
    return {
      title: 'An offer declined', phase: 'After',
      question: 'Which concern should you explore first?',
      clues: [
        `${patient} declines a follow-up across town when visiting alone.`,
        company ? `Same clinic, same time: ${patient} accepts when ${friend} can come.` : `With ${friend} able to come, ${patient} still declines the distant clinic.`,
        company ? 'A nearer appointment alone is also declined.' : `${patient} accepts a nearer appointment, even alone.`
      ],
      options: ['Making the trip', 'Going without company', 'Meeting this particular doctor'],
      answer: company ? 1 : 0,
      why: company ? 'The decision changes with company, even at the same clinic. Ask whether going alone is the concern.' : 'The decision changes with distance, even when company is available. Ask about the trip before assuming a motive.'
    };
  },

  // Moral: apply a stated fair principle despite a conspicuous competing claim.
  65(c) {
    const [first, missed, third] = c.p;
    const cancelledByWard = c.flip();
    return {
      title: 'The last family room', phase: 'After',
      question: 'Who gets the remaining private room?',
      clues: [
        'All three families have equal need. The ward promised to restore places it cancelled.',
        `${first} arrived first today. ${third} came last.`,
        cancelledByWard ? `The ward cancelled ${missed}’s earlier room. Otherwise arrival order applies.` : `${missed} gave up an earlier room by choice. Otherwise arrival order applies.`
      ],
      options: [first, missed, third], answer: cancelledByWard ? 1 : 0,
      why: cancelledByWard ? `Restoring ${missed}’s cancelled place keeps the ward’s promise. Arrival order breaks ties when no place is owed.` : `The ward owes no cancelled place. With equal need, its stated tie-break gives ${first} the room.`
    };
  },

  // Ethics: negotiate the patient's explicit wishes and a family's legitimate need.
  66(c) {
    const [patient, relative] = c.p;
    const share = c.flip();
    return {
      title: 'The call from home', phase: 'After',
      question: `What can you tell ${relative}?`,
      clues: [
        `${relative} asks for ${patient}’s result and when to pick them up.`,
        share ? `${patient} says, “Tell them when to come, but keep the result private.”` : `${patient} says, “I’ll tell them the time myself. You can share my result.”`,
        'The result and pickup time are both confirmed.'
      ],
      options: ['Give the pickup time only.', 'Give the result and offer the patient the phone.', 'Give both so the ride can be arranged.'],
      answer: share ? 0 : 1,
      why: share ? 'Giving the time helps with the ride and respects the patient’s privacy about the result.' : 'The patient agreed to share the result and reserved the pickup conversation for themselves. Passing the phone supports both.'
    };
  },

  // Pragmatic: match the real-world effect of a message to a hard constraint.
  67(c) {
    const [patient, relative] = c.p;
    const call = c.flip();
    return {
      title: 'Five minutes to the doors', phase: 'Before',
      question: 'How can you redirect the driver in time?',
      clues: [
        `${relative} is driving ${patient} in. A passenger handles directions.`,
        'They reach the fork in five minutes. The desk can send one message.',
        call ? 'The passenger answers calls now. Texts appear only at the hospital.' : 'Calls go to voicemail until arrival. Texts appear on the passenger’s screen now.'
      ],
      options: ['Text the passenger.', 'Call the passenger.', 'Leave directions at reception.'],
      answer: call ? 1 : 0,
      why: call ? 'A call reaches the passenger before the fork, while the driver can keep going.' : 'The passenger can see a text before the fork. The voicemail and the reception message arrive too late.'
    };
  },

  // Context: identical words can refer to a patient or to their surroundings.
  68(c) {
    const [patient] = c.p;
    const person = c.flip();
    return {
      title: '“Quiet again”', phase: 'During',
      question: 'Which detail belongs in your handover?',
      clues: [
        `The note outside ${patient}’s room says “quiet again.”`,
        person ? 'The note answers “Has the patient started speaking again?”' : 'The note answers “Can the family hear each other now?”',
        person ? 'The room stayed noisy. The patient spoke earlier, then fell silent.' : 'The patient kept talking. A noisy cart left the room.'
      ],
      options: ['The room became quieter.', 'The patient stopped speaking.', 'The patient fell asleep.'],
      answer: person ? 1 : 0,
      why: person ? 'The note answers a question about speech. It gives no evidence of sleep.' : 'The question concerns conversation in the room. The cart left and the patient kept speaking.'
    };
  },

  // Narrative: combine witness fragments without inventing a cause of death.
  69(c) {
    const [patient] = c.p;
    const warningFirst = c.flip();
    return {
      title: 'The family asks what happened', phase: 'After',
      question: 'Which account can you give the family?',
      clues: [
        `${patient} died after the team reached the room. The cause is unknown.`,
        warningFirst ? 'A visitor heard the bell, then saw the lights go out.' : 'A visitor saw the lights go out, then heard the bell.',
        warningFirst ? 'The team remembers entering just after the lights went out.' : 'The team remembers entering just after the bell sounded.'
      ],
      options: ['The visitor recalls the bell first, then darkness. The team recalls arriving later.', 'The visitor recalls darkness first, then the bell. The team recalls arriving later.', 'The visitor recalls both events. The team recalls arriving between them.'],
      answer: warningFirst ? 0 : 1,
      why: warningFirst ? 'The visitor puts the bell before the blackout. The team dates its arrival to just after the blackout. The cause of death is still unknown.' : 'The visitor puts the blackout before the bell. The team dates its arrival to just after the bell. The cause of death is still unknown.'
    };
  },

  // Perspective: reconcile two reliable accounts taken from different positions.
  70(c) {
    const [visitor, porter] = c.p;
    const observerNorth = c.flip();
    return {
      title: 'Two accounts of the transfer', phase: 'After',
      question: 'Which route fits both witnesses?',
      clues: [
        `${visitor} faced north. ${porter} faced south across the same corridor.`,
        `One trolley passed between them. ${visitor} says it moved ${observerNorth ? 'right' : 'left'}.`,
        `${porter} says it moved ${observerNorth ? 'left' : 'right'}. North-facing right is east.`
      ],
      options: ['East along the corridor.', 'West along the corridor.', 'The accounts require two trolleys.'],
      answer: observerNorth ? 0 : 1,
      why: observerNorth ? 'East is right for the north-facing visitor and left for the south-facing porter. Both describe the same movement.' : 'West is left for the north-facing visitor and right for the south-facing porter. Both describe the same movement.'
    };
  },

  // Metacognition: inspect the shortcut behind a decision; choose a targeted check.
  71(c) {
    const [first, second] = c.p;
    const delay = c.flip();
    return {
      title: 'Catch your own shortcut', phase: 'During',
      question: 'What should you check before committing?',
      clues: delay ? [
        `You picked ${first} because their scan slot starts first.`,
        `${second}’s slot starts later. The two journeys take different times.`,
        'Your job is to send the patient with the earliest necessary departure.'
      ] : [
        `You picked ${first} because two people reported their missing scan.`,
        `One person reported ${second}’s missing scan. You prioritise independent reports.`,
        'You have counted the voices but have not traced their sources.'
      ],
      options: ['Compare slot times minus travel times.', 'Find who originally saw each problem.', 'Repeat the count that gave your first choice.'],
      answer: delay ? 0 : 1,
      why: delay ? 'You ranked appointments, but travel determines when each trip must begin. Subtracting the journey tests the shortcut.' : 'Two people can repeat one observation. Tracing each report tests whether the count really measured independent evidence.'
    };
  },

  // Epistemic: distinguish what the record proves from competing possible events.
  72(c) {
    const [patient, sibling] = c.p;
    const roomFirst = c.flip();
    const timed = c.flip();
    const patientFirst = c.flip();
    const first = roomFirst ? 'room number' : 'pickup time';
    const second = roomFirst ? 'pickup time' : 'room number';
    const patientHeardRoom = roomFirst === patientFirst;
    return {
      title: 'Who heard the update?', phase: 'After',
      question: `Which part can you confirm ${patient} heard?`,
      clues: [
        `${patient} and ${sibling} each heard one part of the call. They passed the handset once, at 4:10.`,
        `The doctor gave the ${first} at 4:09 and the ${second} at 4:11.`,
        timed ? `A visitor saw ${sibling} holding the handset at ${patientFirst ? '4:11' : '4:09'}.` : `A visitor saw ${sibling} holding the handset during the call but cannot say when.`
      ],
      options: ['The room number.', 'The pickup time.', 'It could have been either part.'],
      answer: timed ? (patientHeardRoom ? 0 : 1) : 2,
      why: timed ? `The visitor places ${sibling} on the phone for the ${patientFirst ? second : first}. With one handoff, ${patient} heard the ${patientFirst ? first : second}.` : `The visitor confirms ${sibling} was on the call. Either person could have held the handset when the room number was given.`
    };
  },

  // Reflection: review what could reasonably have been known at the decision time.
  73(c) {
    const [patient] = c.p;
    const before = c.flip();
    return {
      title: 'After the missed pickup', phase: 'After',
      question: 'What is the earliest fix that could have helped?',
      clues: [
        `You took ${patient} to the pickup point listed on the board.`,
        'The driver had changed the point. The pickup was missed.',
        before ? 'The corrected location was already on the shift phone before you left.' : 'The correction reached the shift phone only after you left.'
      ],
      options: ['Check available corrections before leaving.', 'Arrange a way to receive changes en route.', 'Always use the other pickup point.'],
      answer: before ? 0 : 1,
      why: before ? 'The information was accessible when you chose. A last check would have caught this change.' : 'The board was the best information at departure. A live update would address what actually went wrong.'
    };
  },

  // Critical: test whether the groups compared allow the claim being made.
  74(c) {
    const newTeam = c.flip();
    const options = newTeam
      ? ['Compare forms using the same crews.', 'Compare crews using the same form.', 'Compare last winter with this summer.']
      : ['Compare one-patient with three-patient handovers.', 'Compare the forms at matching patient loads.', 'Compare busy nights with quiet mornings.'];
    return {
      title: 'The faster handover', phase: 'After',
      question: 'Which comparison would test the claim?',
      clues: [
        'Handover got faster after the ward changed its form.',
        newTeam ? 'At the same time, experienced crews replaced new crews.' : 'At the same time, one-patient handovers replaced three-patient handovers.',
        'The manager credits the new form alone.'
      ],
      options, answer: newTeam ? 0 : 1,
      why: newTeam ? 'Crew experience changed alongside the form. Keeping the crews constant isolates the difference between forms.' : 'The new form coincided with smaller handovers. Keeping the load constant isolates the difference between forms.'
    };
  },

  // Falsification: pick an observation that could contradict a universal claim.
  75(c) {
    const sender = c.flip();
    return {
      title: 'The vanishing calls', phase: 'After',
      question: 'Which record would overturn the claim?',
      clues: [
        sender ? 'The technician says, “Every lost call came from the lift.”' : 'The technician says, “Every call from the lift was lost.”',
        'Each record names the caller’s location and whether the call arrived.',
        'One reliable counterexample is enough.'
      ],
      options: ['A lost call made outside the lift.', 'A delivered call made from the lift.', 'A lost call made from the lift.'],
      answer: sender ? 0 : 1,
      why: sender ? 'A loss outside the lift disproves the claimed source of every loss. A successful lift call is compatible with that claim.' : 'A delivered lift call disproves the claimed fate of every lift call. A loss elsewhere is compatible with that claim.'
    };
  },

  // Heuristic: choose a fast proxy under an explicit time and error objective.
  76(c) {
    const badge = c.flip();
    return {
      title: 'A ten-second sweep', phase: 'During',
      question: 'Which quick cue should guide the first look?',
      clues: [
        'You can inspect one set of delayed transfers before handover.',
        badge ? 'Yesterday, six of eight amber tags meant a delay. Two of eight late clocks did.' : 'Yesterday, two of eight amber tags meant a delay. Six of eight late clocks did.',
        'The same mix is expected today. Opening a full record takes too long.'
      ],
      options: ['Start with the amber tags.', 'Start with the late clocks.', 'Open each full record first.'],
      answer: badge ? 0 : 1,
      why: `The ${badge ? 'amber tags' : 'late clocks'} give the higher observed hit rate within the time limit. Each flagged transfer still needs checking.`
    };
  },

  // Non-monotonic: retract or restore a default conclusion when an exception arrives.
  77(c) {
    const [patient, liaison] = c.p;
    const transfer = c.flip();
    return {
      title: 'Hold the call', phase: 'After',
      question: 'Who should make the family call now?',
      clues: [
        `${patient} usually chooses the bedside doctor. Yesterday they requested ${liaison}, the family liaison.`,
        `Today: “Keep yesterday’s caller unless I change wards. Then use my bedside doctor.”`,
        transfer ? `The move sheet takes ${patient} from East Ward to West Ward.` : `The move sheet takes ${patient} from Bed 2 to Bed 5, both on East Ward.`
      ],
      options: ['The bedside doctor.', liaison, 'Both should call separately.'],
      answer: transfer ? 0 : 1,
      why: transfer ? 'A change of ward activates today’s exception. The bedside doctor takes over the call.' : `A bed move within East leaves yesterday’s choice in force. ${liaison} still makes the call.`
    };
  },

  // Ontological: count the right kind of entity when records stand for events.
  78(c) {
    const [first, second] = c.p;
    const events = c.flip();
    return {
      title: 'Three lines in the incident book', phase: 'After',
      question: events ? 'How many separate falls need review?' : 'How many separate witness accounts can you request?',
      clues: [
        `${first} and ${second} each saw the same fall and wrote separate notes.`,
        `Later, ${first} saw a second fall and wrote about that one too.`,
        events ? 'The review opens one case per fall, even with several witnesses.' : 'Each note records one observation by its author.'
      ],
      options: ['One', 'Two', 'Three'], answer: events ? 1 : 2,
      why: events ? 'Two notes describe one fall. The later note describes a second fall, giving two events to review.' : 'There are two accounts of the first fall and one of the second. Counting witnesses or falls would merge separate accounts.'
    };
  },

  // Analogical abstraction: find a reusable relation that fits both source stories.
  79(c) {
    const confirmation = c.flip();
    return {
      title: 'What belongs in both checklists?', phase: 'After',
      question: 'Which change to a lab checklist would catch the same mistake?',
      clues: [
        confirmation ? 'A porter signed at the ward door. The lift broke and the patient came back, but the transfer showed as complete.' : 'A porter described a fall to two nurses. Their matching notes were counted as two sightings.',
        confirmation ? 'The doctor ticked off a family update. By evening the message was still in the outbox.' : 'The desk called a parent who told a brother. Staff took both family accounts as independent checks on the call.',
        'The lab checklist follows a tube from labelling at the bedside to arrival at the testing bench.'
      ],
      options: ['Pair the courier’s collection entry with a receipt from the lab.', 'For each account, name the person who actually saw the label go on.', 'Record the requested collection time alongside the actual time.'],
      answer: confirmation ? 0 : 1,
      why: confirmation ? 'The transfer and the update were closed on the sender’s evidence. A lab receipt would show that the tube reached the other end.' : 'The nurses heard one porter, and the brother heard the parent. Naming the bedside observer lets staff see when two lab accounts come from one sighting.'
    };
  },

  // Integration: combine permission, sequence and travel time in one decision.
  80(c) {
    const [patient, support] = c.p;
    const deadline = c.int(6, 9);
    const talk = c.int(2, 4);
    const latest = deadline - talk;
    const visit = latest + c.pick([-1, 0, 1, 2]);
    const call = latest + c.pick([-1, 0, 1, 2]);
    const permitsCall = c.flip();
    const canVisit = visit + talk <= deadline;
    const canCall = permitsCall && call + talk <= deadline;
    const answer = canVisit ? 0 : canCall ? 1 : 2;
    const visitEnd = visit + talk;
    const callEnd = call + talk;
    const why = canVisit
      ? `The face-to-face update finishes at minute ${visitEnd}, by the transfer at ${deadline}. It meets the patient’s first choice.`
      : canCall
        ? `In person finishes at minute ${visitEnd}, after transfer. The permitted phone update finishes at minute ${callEnd}, in time.`
        : permitsCall
          ? `In person finishes at minute ${visitEnd} and the call at ${callEnd}. Both miss transfer at ${deadline}, so use the booked room afterward.`
          : `An in-person update would finish at minute ${visitEnd}, after transfer. The patient wants it face to face. The booked room makes that possible.`;
    return {
      title: 'One conversation before transfer', phase: 'During',
      question: 'When and how should you arrange the family update?',
      clues: [
        `${patient} wants the full ${talk}-minute update with ${support} before transfer in ${deadline} minutes, preferably in person.`,
        `${support} can join in person in ${visit} minutes or by private phone in ${call}.`,
        permitsCall ? 'A phone update is acceptable too. A private room is booked after transfer if needed.' : 'The patient accepts only face-to-face updates. A private room is booked after transfer if needed.'
      ],
      options: ['Meet in person before transfer.', 'Use the private call before transfer.', 'Meet after transfer in the booked room.'],
      answer, why
    };
  }
};

// Later shifts vary the scene and the inference, retaining the same short read.
const advancedCases = {
  56(c) {
    const [patient, coach] = c.p;
    const limitsOnly = c.flip();
    return {
      title: 'After the match', phase: 'After',
      question: 'What joint plan can you propose?',
      clues: [
        `${coach} coaches ${patient} and needs to plan next week’s practice.`,
        limitsOnly ? `${patient} asks you to tell the coach the activity limits and keep the injury private.` : `${patient} wants to tell the coach personally and asks you to check the wording.`,
        `${coach} can plan from a short list of limits, whoever sends it.`
      ],
      options: ['Agree on limits the doctor can send.', 'Help the patient write the list to send.', 'Give the coach the full injury report.'],
      answer: limitsOnly ? 0 : 1,
      why: limitsOnly ? 'A doctor-sent list gives the coach what they need and respects the patient’s chosen messenger and boundary.' : 'Drafting together gives the coach an actionable list and keeps the patient in charge of telling them.'
    };
  },

  57(c) {
    const [patient, other] = c.p;
    const right = c.flip();
    const firstPair = c.flip();
    const side = right ? 'right' : 'left';
    const sleeve = (firstPair ? 0 : 2) + (right ? 1 : 0);
    return {
      title: 'A mark on the scan', phase: 'During',
      question: 'Which old image can show if the mark is new?',
      clues: [
        `Today a mark appears on ${patient}’s ${side} wrist.`,
        `Yesterday’s sleeves A and B belong to ${firstPair ? patient : other}. C and D belong to ${firstPair ? other : patient}.`,
        'Within each pair the left wrist was filed first, then the right.'
      ],
      options: ['Sleeve A', 'Sleeve B', 'Sleeve C', 'Sleeve D'],
      answer: sleeve,
      why: `Sleeve ${'ABCD'[sleeve]} is in ${patient}’s pair and shows the ${side} wrist. It lets you compare the same spot on both dates.`
    };
  },

  58(c) {
    const [patient] = c.p;
    const voice = c.flip();
    return {
      title: 'A name before the doors close', phase: 'During',
      question: 'How can the patient spell out the name?',
      clues: [
        `${patient} cannot talk, write or point. A blink means yes.`,
        voice ? 'They hear clearly but cannot see the alphabet card.' : 'They see clearly but cannot hear the spoken alphabet.',
        'You can run through the letters and pause at each one.'
      ],
      options: ['Point to each letter and watch for a blink.', 'Say each letter and watch for a blink.', 'Hand over the card and ask them to point.'],
      answer: voice ? 1 : 0,
      why: `You do the scanning. ${patient} only needs to ${voice ? 'hear' : 'see'} the desired letter and blink to select it.`
    };
  },

  59(c) {
    const [patient] = c.p;
    const voice = c.flip();
    // A plan connects one usable source of the patient's message to a
    // destination that can deliver it. Each route uses two different pieces.
    const options = ['Play their voice recording.', 'Show their written note.', 'Use the private bedside call.', 'Use the private family-room call.'];
    return twoPieceCase({
      title: 'Their own words', phase: 'After',
      question: 'Build a way to deliver the patient’s message.',
      clues: [
        `${patient} left both a recording and a note for their partner.`,
        voice ? 'The partner can hear either private call but cannot see its screen.' : 'The partner can see either private call but its sound is broken.',
        'Both rooms have video phones. The partner wants the patient’s original words.'
      ],
      why: `The ${voice ? 'recording carries the words by sound' : 'note carries the words on screen'}. Either private call can carry that message to the partner.`
    }, options, ['source', 'source', 'route', 'route'], voice ? [[0, 2], [0, 3]] : [[1, 2], [1, 3]]);
  },

  60(c) {
    const [patient] = c.p;
    const timed = c.flip();
    return {
      title: 'Before the transfer?', phase: 'After',
      question: 'Which two gaps must your review close?',
      clues: [
        `Two patients changed beds. The family asks if ${patient} got a visit before leaving.`,
        timed ? 'The visitor’s time is logged. The log gives only a bed number.' : `The visitor recognised ${patient}. No visit time was logged.`,
        'The move sheet records each patient’s bed history and departure.'
      ],
      options: ['Establish who occupied the visited bed.', 'Establish when the visit occurred.', 'Establish when the patient left.', 'Establish when the family asked.'],
      answer: timed ? [0, 2] : [1, 2],
      why: timed ? 'A bed number must be linked to a person at the visit time. Then compare that visit with the patient’s departure.' : 'The visitor settles identity. Comparing the visit time with departure settles which came first.'
    };
  },

  61(c) {
    const bays = c.flip();
    const first = c.flip();
    return {
      title: bays ? 'Two crews book the same bay' : 'One lost page becomes ten', phase: 'During',
      question: bays ? 'Which signal should reserve the chosen bay?' : 'How should the desk group these pages?',
      clues: bays ? [
        'Two crews choose seconds apart. Both see East free and head there. West stays empty.',
        'The board can reserve a bay from either of the driver’s signals. Both crews choose before either arrives.',
        first ? 'A driver radios when choosing a bay and taps the dashboard on arrival.' : 'A driver taps the dashboard when choosing a bay and radios on arrival.'
      ] : [
        'Every repeat jumps to the top as a new request. The team keeps turning back to the same patient.',
        first ? 'One patient’s call reads 31/A, then 31/B on repeat. The other patient’s call reads 42/B.' : 'One patient’s call reads 31/A, then 42/A on repeat. The other patient’s call reads 42/B.',
        'Each patient needs a separate place in the queue. A repeat should keep that place.'
      ],
      options: bays ? ['Reserve on the radio call.', 'Reserve on the dashboard tap.'] : ['Keep one place per number.', 'Keep one place per letter.', 'Keep one place per number–letter pair.'],
      answer: first ? 0 : 1,
      why: bays ? `The ${first ? 'radio call' : 'dashboard tap'} comes before the second crew chooses. It can reserve East in time for that crew to see West as the free bay.` : `The ${first ? 'number stays at 31' : 'letter stays at A'} across the repeat. It keeps the first patient’s place and gives the other patient a separate turn.`
    };
  },

  62(c) {
    const [friend, sister, nurse, porter] = c.p;
    const sisterCalls = c.flip();
    return {
      title: 'The person they will answer', phase: 'During',
      question: 'Whom should you ask to make the invitation?',
      clues: [
        `Your patient wants ${friend} beside them and permits their sister or nurse to make the invitation.`,
        `${sister} is the sister. ${nurse} is the nurse. ${porter} is the porter.`,
        `${friend}’s phone rings for the porter and the ${sisterCalls ? 'sister' : 'nurse'}. Other calls go straight to voicemail tonight.`
      ],
      options: [sister, nurse, porter], answer: sisterCalls ? 0 : 1,
      why: `${sisterCalls ? sister : nurse} is the ${sisterCalls ? 'sister' : 'nurse'}, so has permission and can make the phone ring. The porter can get through but lacks the patient’s permission.`
    };
  },

  63(c) {
    const [patient, sibling, doctor] = c.p;
    const overheard = c.flip();
    return {
      title: 'Looking for the wrong room', phase: 'After',
      question: `Where will ${doctor} expect ${sibling} to look?`,
      clues: [
        `${sibling} saw ${patient} in Bay 2. ${doctor} saw ${sibling} leave.`,
        `${patient} moved to Bay 5. A porter phoned ${sibling} with the change.`,
        overheard ? `${doctor} heard the entire call and ${sibling} repeat “Bay 5.”` : `${doctor} missed that call and thinks ${sibling} has heard nothing.`
      ],
      options: ['Bay 2', 'Bay 5', 'The transfer desk'], answer: overheard ? 1 : 0,
      why: overheard ? `${doctor} knows ${sibling} received the update, so expects a search in Bay 5.` : `${sibling} knows about Bay 5. ${doctor} still thinks ${sibling} only knows about Bay 2.`
    };
  },

  64(c) {
    const [patient] = c.p;
    const words = c.flip();
    return {
      title: 'The unsigned account', phase: 'After',
      question: 'Which concern best explains the refusals?',
      clues: [
        `${patient} declines a named interview about the crash.`,
        words ? 'An anonymous staff-led interview is declined too. A named interview using their own questions is accepted.' : 'Interviews using their own questions are declined if named. The same interview is accepted anonymously.',
        'The same person would receive every version.'
      ],
      options: ['Having their identity attached', 'Having somebody else shape the account', 'Who would receive the account'],
      answer: words ? 1 : 0,
      why: words ? 'Being named remains acceptable when the patient frames the questions. Ask how they would like to shape the conversation.' : 'The decision changes with anonymity across formats. Ask what being identified would mean to the patient.'
    };
  },

  65(c) {
    const [first, second] = c.p;
    const firstLoses = c.flip();
    return {
      title: 'One call each', phase: 'After',
      question: 'Who gets the doctor’s first call?',
      clues: [
        'Two families have equal need. You promised each one a private call today.',
        `${first} asked first. Either family can take the call now.`,
        `Only ${firstLoses ? second : first} can stay for the later slot. No other doctor is free.`
      ],
      options: [first, second, 'Draw lots now'], answer: firstLoses ? 0 : 1,
      why: `Calling ${firstLoses ? first : second} now preserves both families’ opportunity. The other family can still take the later slot.`
    };
  },

  66(c) {
    const [patient, partner] = c.p;
    const injury = c.flip();
    const atDoor = c.flip();
    return {
      title: 'The viewing room', phase: 'After',
      question: 'How should you prepare the partner?',
      clues: [
        `After ${patient}’s death, ${partner} asks you to come with them for the visit.`,
        injury ? '“I’d like to hear how their face looks now.”' : '“Who else will be there? Is there a chair beside them?”',
        atDoor ? 'They pause at the door. “Could we talk here first?”' : 'They take your hand. “I’d like to wait until I’m beside them to talk.”'
      ],
      options: ['Describe the room before you go in together.', 'Gently describe their appearance before going in.', 'Offer to explain once you are both inside.'],
      answer: atDoor ? (injury ? 1 : 0) : 2,
      why: atDoor ? (injury ? 'The partner asks about their loved one’s appearance and wants to talk at the door. A gentle description answers that request.' : 'The questions about the chair and company concern the room. The partner would like to hear the answers before entering.') : 'Accompany them now. They have named what they want to hear about and have chosen to talk once they are beside their loved one.'
    };
  },

  67(c) {
    const [patient] = c.p;
    const quickReturn = c.flip();
    return {
      title: 'A reply before wheels roll', phase: 'Before',
      question: 'Which route gets a reply before departure?',
      clues: [
        `${patient}’s ambulance leaves in four minutes. The crew must confirm the entrance.`,
        quickReturn ? 'Radio takes one minute each way. Text arrives instantly but replies take five.' : 'Radio takes three minutes each way. Text arrives in two; replies take one.',
        'Both routes reach the same crew.'
      ],
      options: ['Use the radio both ways.', 'Use text both ways.', 'Ask the desk to check after departure.'],
      answer: quickReturn ? 0 : 1,
      why: quickReturn ? 'Radio completes the exchange in two minutes. Instant text delivery still leaves a five-minute wait for confirmation.' : 'A text round trip takes three minutes. Radio needs six, beyond the four-minute departure.'
    };
  },

  68(c) {
    const [patient, visitor] = c.p;
    const speech = c.flip();
    return {
      title: 'What “talking” meant', phase: 'During',
      question: 'What change did the visitor actually report?',
      clues: [
        `${visitor} says ${patient} is “talking again” after the fall.`,
        'At home, “talking” includes both speech and choosing picture cards.',
        speech ? `The cards stayed in their box. ${visitor} heard ${patient} say their name.` : `${visitor} saw two cards chosen in reply and heard no voice.`
      ],
      options: ['Spoken words returned.', 'Replies by picture card returned.', 'Both ways of replying returned.'],
      answer: speech ? 0 : 1,
      why: speech ? 'The family’s word covers two abilities. Hearing the name supports a return of speech; the cards were never tried.' : 'The family’s word covers two abilities. The report establishes communication with cards, while speech is still unconfirmed.'
    };
  },

  69(c) {
    const wideFirst = c.flip();
    const chest = c.flip();
    const mark = chest ? 'chest' : 'shoulder';
    return {
      title: 'Before the postmortem meeting', phase: 'After',
      question: 'What can you tell the family about when the marks were first recorded?',
      clues: [
        'There are two photos. One was taken in the ambulance, the other at the postmortem. Neither can date an injury.',
        wideFirst ? 'The ambulance took the wide photo. The postmortem team took the close-up.' : 'The ambulance took the close-up. The postmortem team took the wide photo.',
        `The wide photo shows marks on the chest and shoulder. The close-up shows just the ${mark} mark.`
      ],
      options: ['The chest mark was recorded first.', 'The shoulder mark was recorded first.', 'Both marks appear in the earlier photo.'],
      answer: wideFirst ? 2 : (chest ? 0 : 1),
      why: wideFirst ? 'The wide photo came from the ambulance. Both marks were documented then. The photos cannot establish when either injury happened.' : `The ambulance close-up shows the ${mark} mark. The other mark first appears in the postmortem photo. Its time of injury remains unknown.`
    };
  },

  70(c) {
    const clockRuns = c.flip();
    return {
      title: '“It was twenty minutes”', phase: 'After',
      question: 'How could both accounts be accurate?',
      clues: [
        'A parent measures a twenty-minute wait from asking until meeting the doctor.',
        clockRuns ? 'The doctor says, “I came five minutes after the page.” Both describe the same arrival.' : 'The doctor says, “I was there five minutes after you asked.” The parent waited outside.',
        clockRuns ? 'The request went through a desk before the page.' : 'The doctor went straight to the patient before meeting the parent.'
      ],
      options: ['The desk took fifteen minutes to page.', 'The doctor saw the patient fifteen minutes before meeting the parent.', 'Their watches must differ by fifteen minutes.'],
      answer: clockRuns ? 0 : 1,
      why: clockRuns ? 'The parent starts counting at the request. The doctor starts at the page, fifteen minutes later.' : 'Both intervals start at the request. Their endpoints differ by the fifteen minutes between reaching the patient and meeting the parent.'
    };
  },

  71(c) {
    const [patient, technician, clerk] = c.p;
    const warm = c.flip();
    return {
      title: 'Before you say “improving”', phase: 'During',
      question: 'Whose check could overturn your first impression?',
      clues: [
        `Two machines each tested one tube from ${patient}. A 4 printed first, then a 7. You reported a rise.`,
        `${technician} can retest both samples on one machine. ${clerk} can look up when each tube was filled.`,
        warm ? 'The slips printed in collection order. The machines gave different readings on the same reference fluid.' : 'The two machines always agree on the same fluid. One of the tubes waited an hour before testing.'
      ],
      options: [`Ask ${technician}.`, `Ask ${clerk}.`],
      answer: warm ? 0 : 1,
      why: warm ? `${technician} can compare the samples under the same conditions. The apparent rise might come from a difference between the machines.` : `${clerk} can establish which tube came first. A wait before testing can make the older result print last.`
    };
  },

  72(c) {
    const [patient] = c.p;
    const confirmed = c.flip();
    return {
      title: 'A hand on the blanket', phase: 'After',
      question: 'What is the most you can confidently tell the family?',
      clues: [
        `Someone held ${patient}’s hand before death. The curtain hid ${patient}’s face.`,
        'The witness remembers the hand-holding but heard no words.',
        confirmed ? `During that visit, ${patient} wrote, “I can feel your hand.”` : 'The patient left no account of what they felt.'
      ],
      options: ['Someone was with them.', 'They said they could feel someone’s hand.', 'They felt no fear.'],
      answer: confirmed ? 1 : 0,
      why: confirmed ? 'The patient’s own message adds evidence of feeling the contact. It gives no answer about fear.' : 'The witness can establish companionship. The patient’s private experience remains unknown.'
    };
  },

  73(c) {
    const [patient] = c.p;
    const atDesk = c.flip();
    return {
      title: 'The interpreter who missed the meeting', phase: 'After',
      question: 'Which change addresses the actual failure?',
      clues: [
        `${patient}’s meeting was moved from Bay 3 to Bay 6.`,
        atDesk ? 'The doctor told the booking desk. The desk updated its board only.' : 'The doctor told the interpreter. The booking desk still listed Bay 3.',
        atDesk ? 'The interpreter takes assignments by phone, away from the board.' : 'A replacement interpreter followed the desk’s board.'
      ],
      options: ['Have the desk confirm changes with the assigned interpreter.', 'Have the doctor update the shared booking record.', 'Always book Bay 6.'],
      answer: atDesk ? 0 : 1,
      why: atDesk ? 'The shared record was right. The missing link was delivery to the person away from it.' : 'The first interpreter knew. Updating the shared record would also have reached whoever replaced them.'
    };
  },

  74(c) {
    const outcome = c.flip();
    return {
      title: 'A headline for the ward', phase: 'After',
      question: 'What weakens the headline’s conclusion?',
      clues: [
        '“Our new board cut missing handovers in half.” Both shifts handled equal numbers.',
        outcome ? 'On the new board, staff stopped recording a miss once someone called back.' : 'Before the change, staff measured night shifts. Afterward, they measured day shifts.',
        outcome ? 'The old board kept these cases marked as misses.' : 'Day shifts already missed fewer handovers on the old board.'
      ],
      options: ['The two counts used different definitions.', 'The two groups started with different risks.', 'One shift handled more handovers.'],
      answer: outcome ? 0 : 1,
      why: outcome ? 'A change in what counts can shrink the number even if misses occur just as often.' : 'A switch to a group with fewer usual misses can imitate a benefit from the board.'
    };
  },

  75(c) {
    const [east, west] = c.p;
    const only = c.flip();
    return {
      title: 'A claim about lost samples', phase: 'After',
      question: 'Which finding would disprove the claim?',
      clues: [
        only ? 'The lab says, “All lost samples came through East.”' : 'The lab says, “All samples through East were lost.”',
        `${east} only used East. ${west} only used West.`,
        'The receiving book can establish loss or arrival for each sample.'
      ],
      options: [`${east}’s sample arrived.`, `${west}’s sample was lost.`, `${east}’s sample was lost.`],
      answer: only ? 1 : 0,
      why: only ? `A lost sample from ${west} was sent through West, contradicting the claimed common origin of all losses.` : `A delivered sample from ${east} contradicts the claim that every East sample was lost.`
    };
  },

  76(c) {
    const cheap = c.flip();
    return {
      title: 'Which first pass?', phase: 'During',
      question: 'In six minutes, which finds more misses on average?',
      clues: [
        'Your next job is a quick screen for missing family updates.',
        cheap ? 'A door pass takes one minute and finds a miss half the time.' : 'A door pass takes two minutes and finds a miss half the time.',
        'A phone check takes three minutes and always finds one.'
      ],
      options: ['Spend the six minutes on door passes.', 'Spend the six minutes on phone checks.', 'Expect the two methods to tie.'],
      answer: cheap ? 0 : 1,
      why: cheap ? 'Six door passes find about three misses. Two phone checks find two. The quicker, less accurate cue can win on total yield.' : 'Three door passes find about 1.5 misses on average. Two phone checks find two. The more reliable cue wins within this time.'
    };
  },

  77(c) {
    const [patient, partner] = c.p;
    const blueGuest = c.flip();
    const blueMessage = c.flip();
    const invite = blueGuest === blueMessage;
    return {
      title: 'A changed invitation', phase: 'After',
      question: 'Who should be in this conversation?',
      clues: [
        `${patient} usually invites ${partner}. Today they want privacy unless ${partner} personally asks to join.`,
        `${partner} alone uses the ${blueGuest ? 'blue' : 'green'} phone. A visitor uses the other one.`,
        `A message from the ${blueMessage ? 'blue' : 'green'} phone says, “Could I come in?”`
      ],
      options: ['Keep the conversation private.', `Invite ${partner} back.`, 'Invite both visitors.'],
      answer: invite ? 1 : 0,
      why: invite ? `The phone identifies ${partner} as the person who asked. That meets today’s condition for inviting them.` : `The message came from the other visitor. Today’s privacy request stands because ${partner} has not asked to join.`
    };
  },

  78(c) {
    const specimens = c.flip();
    return {
      title: 'One tube, several labels', phase: 'After',
      question: specimens ? 'How many separate collections took place?' : 'How many separate portions went for testing?',
      clues: [
        'One blood draw fills a tube. The lab splits it into two portions.',
        'A second draw fills another tube, which goes for testing whole.',
        'A new label identifies each portion sent.'
      ],
      options: ['One', 'Two', 'Three'], answer: specimens ? 1 : 2,
      why: specimens ? 'Two draws produced the original samples. Splitting the first one does not create another collection.' : 'The first draw supplied two portions and the second supplied one, so three portions went for testing.'
    };
  },

  79(c) {
    const source = c.flip();
    return {
      title: 'Two mistakes, one lesson', phase: 'After',
      question: 'Which principle explains both?',
      clues: source ? [
        'Two nurses repeated one porter’s sighting. The review counted two witnesses.',
        'One clerk relayed two independent sightings. The review counted just one.',
        'Both reviews used the number of people speaking to the reviewer.'
      ] : [
        'A patient reached the scanner. The return journey was recorded as another patient.',
        'Two patients took one shared ride. The ride was recorded as one patient.',
        'Both reports tried to infer patient numbers from journeys.'
      ],
      options: ['Count original observers behind reports.', 'Count distinct patients across journeys.', 'Give each record a different number.'],
      answer: source ? 0 : 1,
      why: source ? 'The relay can multiply or merge accounts. Following each account back to its observer handles both errors.' : 'One person can make several journeys, and one journey can carry several people. Count the individuals the records refer to.'
    };
  },

  80(c) {
    const [first, second] = c.p;
    const imaging = c.int(2, 4);
    const ward = c.int(2, 4);
    const backFromImaging = c.int(1, 3);
    const backFromWard = c.int(1, 3);
    const wardSecond = imaging + backFromImaging + ward;
    const imagingSecond = ward + backFromWard + imaging;
    const imagingDue = imagingSecond + c.pick([-2, -1, 0, 1, 2]);
    const wardDue = wardSecond + c.pick([-2, -1, 0, 1, 2]);
    const imagingFirstWorks = imaging <= imagingDue && wardSecond <= wardDue;
    const wardFirstWorks = ward <= wardDue && imagingSecond <= imagingDue;
    const answer = imagingFirstWorks ? (wardFirstWorks ? 2 : 0) : (wardFirstWorks ? 1 : 3);
    return {
      title: 'Two arrivals, one escort', phase: 'Before',
      question: 'Which orders get both patients there on time?',
      clues: [
        `${first} is due in imaging by minute ${imagingDue}. ${second} is due on the ward by minute ${wardDue}.`,
        `One escort takes one patient. From here: imaging ${imaging} minutes, ward ${ward}.`,
        `To pick up the other patient, returning here takes ${backFromImaging} ${backFromImaging === 1 ? 'minute' : 'minutes'} from imaging or ${backFromWard} from the ward.`
      ],
      options: [`${first} must go first.`, `${second} must go first.`, 'Either order works.', 'Neither order. Request another escort.'],
      answer,
      why: `Imaging first puts ${second} on the ward at minute ${wardSecond}, due ${wardDue}. Ward first puts ${first} at imaging at minute ${imagingSecond}, due ${imagingDue}.`
    };
  }
};

export const bankC = Object.fromEntries(
  Object.keys(baseCases).map(id => [
    id,
    c => (c.level >= 3 && c.flip() ? advancedCases[id] : baseCases[id])(c)
  ])
);
