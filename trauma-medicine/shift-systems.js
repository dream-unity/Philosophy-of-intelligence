// Each case gives the player every assumption used by its answer.
function brief(title, phase, question, clues, options, answer, why) {
  return {title, phase, question, clues, options, answer, why};
}

function minutesOnClock(total) {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const firstStories = {
  // Structural reasoning: localise a fault using shared and separate paths.
  31(c) {
    const [name] = c.p;
    const both = c.flip();
    const side = c.pick(['thumb', 'little-finger']);
    const other = side === 'thumb' ? 'little-finger' : 'thumb';
    return brief('The split on the scan', 'During', `Where could one blockage explain ${name}’s scan?`, [
      'Dye follows one vessel to the wrist, then splits into two branches.',
      'Dye reached a marker just before the split.',
      both ? 'Neither branch filled beyond the split.' : `The ${side} branch filled. The ${other} branch stayed empty.`
    ], ['Between the marker and the split', 'Inside the thumb branch', 'Inside the little-finger branch'],
    both ? 0 : (other === 'thumb' ? 1 : 2), both ? 'Both branches lost dye. Only the short stretch after the marker feeds both.' : `Dye reached the ${side} branch, so the shared stretch was open. A blockage in the ${other} branch fits.`);
  },

  // Semantic reasoning: preserve the meaning and time reference of chart language.
  32(c) {
    const [name] = c.p;
    const easier = c.flip();
    const earlier = easier ? 'easier' : 'harder';
    return brief('“Stable” since when?', 'After', `What can you tell ${name}’s sister about their breathing?`, [
      'At noon the nurse wrote “stable since ten.”',
      'Here “stable” means unchanged over the stated time.',
      `From eight to ten, breathing became ${earlier}.`
    ], ['It stayed the same all morning.', 'It eased, then held steady.', 'It worsened, then held steady.'], easier ? 1 : 2,
    `“Since ten” sets the comparison. Breathing became ${earlier} before ten and stayed at that level until noon.`);
  },

  // Probability of at least one success, including ties.
  33(c) {
    const relay = c.pick([{rate:'3 in 4',answer:0}, {rate:'9 in 10',answer:1}, {rate:'5 in 6',answer:2}]);
    return brief('Out of radio range', 'Before', 'Which kit gives the best chance of calling the ward?', [
      'On this rescue route the radio works on 2 in 3 runs.',
      'The backup phone works on half the runs where the radio fails.',
      `A relay alone works on ${relay.rate} runs. Each kit weighs the same.`
    ], ['Radio and backup phone', 'Relay alone', 'Both kits have the same chance'], relay.answer,
    `Across six typical runs, four connect by radio and one more by phone. Compare 5 in 6 with the relay’s ${relay.rate}.`);
  },

  // Compare matched groups rather than pooled totals. Includes a split result.
  34(c) {
    const [first, second] = c.p;
    const swap = c.flip();
    const [a,b] = swap ? [second,first] : [first,second];
    const split = c.flip();
    return brief('The recovery audit', 'After', 'Whose team had the higher healing rate in both injury groups?', [
      `Small wounds healed: ${a}’s team 18 of 20, ${b}’s team 5 of 5.`,
      `Large wounds healed: ${a}’s team 2 of 5, ${b}’s team ${split ? 7 : 9} of 20.`
    ], [`${first}’s team`, `${second}’s team`, 'Neither team'], split ? 2 : (swap ? 0 : 1),
    split ? `${b}’s team leads on small wounds (100% vs 90%). ${a}’s leads on large wounds (40% vs 35%).` : `${b}’s team leads within both groups: 100% vs 90%, and 45% vs 40%. ${a}’s team treated more small wounds.`);
  },

  // Counterfactual intervention on one event while the other requirement stays fixed.
  35(c) {
    const [name] = c.p;
    const start = 14 * 60 + c.int(0, 18);
    const stretcher = start + 4;
    const escort = start + 8;
    const delay = c.pick([2, 4, 6, 8]);
    const changed = stretcher + delay;
    const left = Math.max(changed, escort);
    const times = [escort, escort + 2, escort + 4];
    return brief('Four wheels, one escort', 'During', `When would ${name}’s transfer have left?`, [
      'It left the moment both the stretcher and escort were there.',
      `Stretcher arrived ${minutesOnClock(stretcher)}. Escort arrived ${minutesOnClock(escort)}.`,
      `Imagine only the stretcher arrived ${delay} minutes later.`
    ], times.map(minutesOnClock), times.indexOf(left),
    `The stretcher would arrive at ${minutesOnClock(changed)}. The escort still arrives at ${minutesOnClock(escort)}. Both are ready at ${minutesOnClock(left)}.`);
  },

  // Reason inside an explicitly imagined world with a difference between the worlds.
  36(c) {
    const [patient, sister] = c.p;
    const one = c.flip();
    const canCome = c.flip();
    const choice = one ? 0 : (canCome ? 1 : 2);
    return brief('Before you open the scan', 'During', `One break is confirmed. Suppose the second mark is ${one ? 'a shadow' : 'another break'}. Who should hear the result?`, [
      `${patient}: “For one break, tell me alone. For two, include my sister ${sister}.”`,
      '“Bring her in if she can get here. Otherwise call her with me.”',
      canCome ? `${sister} has arrived at the ward.` : `${sister} can answer her phone but cannot reach the ward.`
    ], [`Speak with ${patient} alone`, `Invite ${sister} into the room`, `Phone ${sister} together`], choice,
    one ? 'The imagined result activates the request for privacy. The sister’s availability only matters for two breaks.' : `Two breaks activate the request to include ${sister}. ${canCome ? 'She is already at the ward.' : 'A call is the available way to include her.'}`);
  },

  // Predict the next transition of a monitor with memory and a reset.
  37(c) {
    const [a,b] = c.p;
    const lastA = c.flip();
    const both = c.flip();
    const lastB = both ? lastA : !lastA;
    // If both counters reset, the interesting question is two beats ahead.
    const two = !lastA && !lastB;
    return brief('The next chime', 'During', two ? 'Which bedside alarm will sound two readings from now?' : 'Which bedside alarm will sound on the next reading?', [
      'Two low readings in a row trigger a call. A normal reading resets the count.',
      `${a}’s last reading was ${lastA ? 'low' : 'normal'}. ${b}’s was ${lastB ? 'low' : 'normal'}.`,
      two ? 'The next two readings at both beds will be low.' : 'The next reading at both beds will be low. Neither alarm has fired yet.'
    ], [a, b, 'Both beds'], lastA === lastB ? 2 : (lastA ? 0 : 1), two ? 'Both counts start at zero. Both reach two on the second new reading.' : (both ? 'Each bed already has one low reading. The next low completes both pairs.' : `${lastA ? a : b} already has one low reading. The other bed starts a fresh pair.`));
  },

  // Prognosis refers to a future patient outcome and distinguishes endpoint from trajectory.
  38(c) {
    const [a,b] = c.p;
    const steadyFirst = c.flip();
    const common = c.int(5, 9);
    const steady = `${common - 3}, ${common - 1}, ${common}`;
    const setback = `${common - 2}, ${common + 2}, ${common}`;
    return brief('First steps after a fall', 'After', 'Who is more likely to walk unaided tomorrow, on this evidence?', [
      'After two straight gains, 8 in 10 similar patients walked unaided the next day.',
      'After a gain then a setback, 3 in 10 walked unaided the next day.',
      `Steps walked at three checks: ${a} (${steadyFirst ? steady : setback}); ${b} (${steadyFirst ? setback : steady}).`
    ], [a,b,'Their chances look equal'], steadyFirst ? 0 : 1,
    `Both ended on ${common} steps. ${steadyFirst ? a : b} improved at both checks, the pattern with the higher recovery rate.`);
  },

  // Extrapolate an observed rate and compare it with a second event.
  39(c) {
    const [name] = c.p;
    const rise = c.pick([5,10,15]);
    const first = c.pick([10,15,20]);
    const current = first + 2 * rise;
    const steps = c.int(1,3);
    const limit = current + steps * rise;
    return brief('The filling bottle', 'During', `When will ${name}’s bottle fill compared with the spare arriving?`, [
      `Readings ten minutes apart: ${first}, ${first + rise}, then ${current} mL now.`,
      `The bottle holds ${limit} mL. The spare arrives in 20 minutes.`,
      'Assume it keeps filling at the observed rate.'
    ], ['Before the spare', 'As the spare arrives', 'After the spare'], steps - 1,
    `The level rises ${rise} mL every ten minutes. The remaining ${limit - current} mL takes ${steps * 10} minutes.`);
  },

  // Compare relative changes to unequal starting areas.
  40(c) {
    const [a,b] = c.p;
    const swap = c.flip();
    const tie = c.flip();
    const large = [12,6];
    const small = [8,tie ? 4 : 3];
    const [x,y] = swap ? [small, large] : [large, small];
    return brief('The wound photos', 'After', 'Whose wound lost the larger share of its original area?', [
      `Each square on the wound photos covers the same area.`,
      `${a}: ${x[0]} squares at first, ${x[1]} today.`,
      `${b}: ${y[0]} squares at first, ${y[1]} today.`
    ], [a,b,'The shares are equal'], tie ? 2 : (swap ? 0 : 1),
    tie ? 'Six of twelve and four of eight are both one half. The larger wound lost more squares.' : `The larger wound lost 6 of 12, half its area. ${swap ? a : b} lost 5 of 8, more than half.`);
  },

  // Subtract two combined weights; the blanket cancels only when present in both readings.
  41(c) {
    const [child] = c.p;
    const parent = c.int(57,76);
    const weight = c.int(12,24);
    const blanket = 2;
    const position = c.pick(['both','first','second']);
    const total = parent + weight + (position === 'second' ? 0 : blanket);
    const second = parent + (position === 'first' ? 0 : blanket);
    const difference = total - second;
    const options = [difference, difference - blanket, difference + blanket];
    return brief('Two readings, one child', 'During', `What weight belongs on ${child}’s chart?`, [
      `Parent holding ${child}${position === 'second' ? ', without a blanket' : ' and a blanket'}: ${total} kg.`,
      `Parent again${position === 'first' ? ', without the blanket' : ', holding the blanket'}: ${second} kg.`,
      `The blanket weighs ${blanket} kg.`
    ], options.map(n => `${n} kg`), options.indexOf(weight),
    position === 'both' ? `Parent and blanket appear in both readings. Subtracting cancels both and leaves ${weight} kg.` :
    (position === 'first' ? `The ${difference} kg difference includes the blanket. Take off 2 kg to get ${weight}.` : `Subtracting the second reading takes off a blanket missing from the first. Add those 2 kg back to get ${weight}.`));
  },

  // Identify the feedback path and intervene without losing the staff alert.
  42(c) {
    const [name] = c.p;
    const light = c.flip();
    const cue = light ? 'flash' : 'chime';
    const other = light ? 'chime' : 'flash';
    return brief('The scan that keeps restarting', 'During', 'Which alert should go only to the operator’s desk?', [
      'A blurred scan triggers a bedside flash and a chime. Movement blurs the next scan.',
      `Test the ${other} alone: ${name} stays still. Test the ${cue} alone: they flinch.`,
      'The desk can receive either alert privately while scanning continues.'
    ], ['Move the flash', 'Move the chime', 'Leave both at the bedside'], light ? 0 : 1,
    `Blur triggers the ${cue}, which makes ${name} move and causes more blur. Moving the ${other} leaves that loop intact.`);
  },

  // Plan for downstream work that can overlap with a second scan.
  43(c) {
    const [a,b] = c.p;
    const specialist = c.flip() ? a : b;
    const first = specialist === a ? 0 : 1;
    const slowPickup = c.flip();
    const due = slowPickup ? 11 : 8;
    return brief('The waiting transfer', 'During', 'Which scan order gets both patients ready before pickup?', [
      `One scanner. ${a} and ${b} each need three minutes in it.`,
      `${specialist} then needs four minutes with the transfer doctor. The other can travel immediately.`,
      `Both must be ready by minute ${due}. The doctor can work during the other scan.`
    ], [`${a} first`,`${b} first`,'Either order works'], slowPickup ? 2 : first,
    `${specialist} finishes the review at minute 7 if scanned first, minute 10 if second. The pickup is at minute ${due}.`);
  },

  // Anticipate the partner's best response after your visible move.
  44(c) {
    const east = c.flip();
    const near = east ? 'east' : 'west';
    const far = east ? 'west' : 'east';
    const wait = c.pick([1,4]);
    return brief('Two gates at the crash', 'Before', 'Which gate can you take so each patient gets a crew?', [
      'Rescue drill: one patient per gate. Your partner sees your choice, then takes their own quickest route.',
      `For your partner, ${near} takes 2 minutes and ${far} takes 5.`,
      `Following your crew through the same gate adds ${wait} ${wait === 1 ? 'minute' : 'minutes'} to their trip.`
    ], ['East gate','West gate','Either gate'], wait === 4 ? 2 : (east ? 1 : 0),
    wait === 4 ? `Taking ${near} makes it 6 minutes for your partner; they take ${far} in 5. Taking ${far} leaves them the quick ${near} gate.` : `Your partner still takes ${near} even if you choose it: 3 minutes beats 5. You must take ${far}.`);
  },

  // The drill controller chooses the failure after seeing the route.
  45(c) {
    const [name] = c.p;
    const safe = c.pick(['Blue','Amber','Green']);
    const alternatives = ['Blue','Amber','Green'].filter(x => x !== safe);
    const [a,b] = c.flip() ? alternatives : alternatives.reverse();
    const limit = c.int(4,6);
    return brief('The evacuation drill', 'Before', `Which route gets ${name} to the staffed bay whatever the controller chooses?`, [
      `Once you choose a route, the drill controller blocks the lift or cuts power. You have ${limit} minutes.`,
      `Lift blocked: ${a} 2, ${safe} ${limit}, ${b} ${limit + 2} minutes.`,
      `Power cut: ${a} ${limit + 1}, ${safe} ${limit - 1}, ${b} 3 minutes.`
    ], ['Blue route','Amber route','Green route'], ['Blue','Amber','Green'].indexOf(safe),
    `${safe} takes at most ${limit} minutes. The controller can defeat ${a} by cutting power and ${b} by blocking the lift.`);
  },

  // Choose a pair that maximises completed patient priorities with a scarce visit.
  46(c) {
    const [name] = c.p;
    const win = c.flip();
    const times = win ? [3,2,4] : [4,3,2];
    const values = [5,3,4];
    const tasks = ['Walk to the chair','Practise the steps','Dress one-handed'];
    return brief('One last rehab visit', 'After', `Which two activities earn the most of ${name}’s own priority points?`, [
      `You have six minutes. ${name} earns points only for finished activities.`,
      `Chair: ${times[0]} min, ${values[0]} points. Steps: ${times[1]} min, ${values[1]} points.`,
      `Dressing: ${times[2]} min, ${values[2]} points. All activities are suitable today.`
    ], tasks, win ? [0,1] : [0,2],
    win ? 'Chair plus steps fits in five minutes and earns 8 points. Steps plus dressing earns 7; chair plus dressing takes seven minutes.' : 'Chair plus dressing uses six minutes and earns 9 points. Steps plus dressing earns 7; chair plus steps takes seven minutes.');
  },

  // Decode a patient's agreed gestures through a tested relay.
  47(c) {
    const [name] = c.p;
    const yesLeft = c.flip();
    const normal = c.flip();
    const leftSignal = normal ? 1 : 2;
    const profile = c.pick(['working', 'working', 'same signals']);
    const rightSignal = profile === 'working' ? 3 - leftSignal : leftSignal;
    const flashes = n => n === 1 ? 'one flash' : 'two flashes';
    const yes = yesLeft ? leftSignal : rightSignal;
    const no = yesLeft ? rightSignal : leftSignal;
    const answer = yes === no ? 2 : (yes === 1 ? 0 : 1);
    return brief('An answer you can see', 'During', 'Which response card can you use at the desk?', [
      `${name} cannot speak. They agreed to press ${yesLeft ? 'left' : 'right'} for yes and ${yesLeft ? 'right' : 'left'} for no.`,
      `Bedside test: the left pad sends ${flashes(leftSignal)} to your desk. The right pad sends ${flashes(rightSignal)}.`,
      'You can see the desk light, but cannot see which pad they press.'
    ], ['One means yes, two means no', 'Two means yes, one means no', 'Neither card separates the replies'], answer,
    yes === no ? `Both pads produce ${flashes(yes)}. You cannot tell an agreement from a refusal using this light.` :
      `Trace yes from the ${yesLeft ? 'left' : 'right'} pad to ${flashes(yes)}, and no from the other pad to ${flashes(no)}.`);
  },

  // Trace a choice through the child's reaction to a second effect on the scan.
  48(c) {
    const [child,first,second] = c.p;
    const calms = c.flip() ? first : second;
    const goes = calms === first ? second : first;
    return brief('Who fetches the pass?', 'During', 'Who should fetch the pass while the scan continues?', [
      `Only ${first} or ${second} may collect it. Both are here with ${child}.`,
      `${child} keeps still when hearing ${calms} read. The other adult’s voice has not settled them.`,
      'Twice, a break in the reading made the child move and the scan had to restart.'
    ], [first,second,'Send both together'], calms === first ? 1 : 0,
    `Send ${goes}. Removing ${calms} would interrupt the reading, which has led to movement and then a repeat scan.`);
  },

  // Apply a stated risk limit before considering the patient's preferred distance.
  49(c) {
    const [name] = c.p;
    const cap = c.pick([1,2,3]);
    return brief('Back on their feet', 'After', `Which walking route best fits ${name}’s choice?`, [
      `“Use the trial counts. I’ll accept up to ${cap} ${cap === 1 ? 'fall' : 'falls'} per 20 walks, then I want the longest route.”`,
      'In 20 similar supervised walks per route: garden 1 fall, hall 2, ramp 3.',
      'Garden is 8 metres, hall 12, ramp 16.'
    ], ['Garden','Hall','Ramp'], cap - 1,
    `With a limit of ${cap} in 20, the ${['garden','hall','ramp'][cap - 1]} is the longest eligible route. The fall count is a trial estimate.`);
  },

  // Use the patient's own utilities, not a clinician-imposed ranking or risk aversion.
  50(c) {
    const [name] = c.p;
    const tomorrow = c.pick([3,4,5]);
    return brief('What would you choose?', 'After', `Which discharge plan has the higher average score for ${name}?`, [
      `${name} rates home today 8 points, home tomorrow ${tomorrow}, and an extra two nights 0.`,
      'The ward plan means home tomorrow for sure.',
      'The transfer plan has equal chances of home today or an extra two nights. Both plans are available.'
    ], ['Ward plan','Transfer plan','The scores tie'], tomorrow < 4 ? 1 : (tomorrow > 4 ? 0 : 2),
    `Half of 8 plus half of 0 gives the transfer plan 4 points on average. The ward plan gives ${tomorrow} for sure.`);
  },

  // Re-enter an ordered procedure at the earliest check invalidated by an edit.
  51(c) {
    const goldFirst = c.flip();
    const swapped = c.flip();
    const identity = swapped ? 'Blue' : 'Gold';
    const travel = swapped ? 'Gold' : 'Blue';
    const edit = c.pick(['name', 'birth date', 'pickup bay', 'visiting time']);
    const first = goldFirst ? 'Gold' : 'Blue';
    const second = goldFirst ? 'Blue' : 'Gold';
    const desks = {name:first, 'birth date':identity, 'pickup bay':travel};
    const next = desks[edit];
    const why = edit === 'name'
      ? `Both desks checked the name. Restart at ${first}, the earlier desk.`
      : next ? `Only ${next} checked the ${edit}. Its cleared check must be repeated.`
      : 'Neither desk used visiting time. Both completed checks still hold, so the form can go.';
    return brief('Before the record leaves', 'After', 'Where should this transfer form go now?', [
      `${identity} checks name and birth date. ${travel} checks name and pickup bay.`,
      `Today’s order is ${first} then ${second}. After an edit, restart at the earliest desk using that field, or send if neither does.`,
      `Both checks passed. Then the clerk changed the ${edit}.`
    ], ['Gold desk', 'Blue desk', 'Send form'], next === 'Gold' ? 0 : (next === 'Blue' ? 1 : 2), why);
  },

  // Work back through a conversation preceded by two parallel preparations.
  52(c) {
    const [name] = c.p;
    const end = 15 * 60 + c.int(20,45);
    const talk = c.int(5,8);
    const walk = c.int(5,7);
    const call = c.int(2,4);
    const setup = c.pick(['parallel','in order','already here']);
    const last = end - talk - (setup === 'parallel' ? walk : (setup === 'in order' ? walk + call : call));
    const choices = [end - talk - walk - call, end - talk - walk, end - talk - call];
    const details = {
      parallel:'They can get ready together. Both must attend the whole discussion.',
      'in order':'Family can connect only after the interpreter reaches the ward. Both attend the whole discussion.',
      'already here':'The interpreter has already arrived. Only the family still needs to connect.'
    };
    return brief('Before the doors close', 'Before', 'When is the latest you can start arranging the discussion?', [
      `${name} wants a ${talk}-minute discussion ending by ${minutesOnClock(end)}.`,
      `The interpreter’s walk takes ${walk} minutes. The family call takes ${call} minutes to connect.`,
      details[setup]
    ], choices.map(minutesOnClock), choices.indexOf(last),
    `Work back ${talk} minutes for the discussion, then ${setup === 'parallel' ? walk + ' for the longer of the two preparations' : setup === 'in order' ? (walk + call) + ' for the two preparations in order' : call + ' for the call'}. The latest start is ${minutesOnClock(last)}.`);
  },

  // Construct a communication plan. Four distinct combinations can meet both goals.
  53(c) {
    const [name] = c.p;
    const pain = c.flip();
    const pieces = pain ? [
      {text:'Point on a body outline',tags:['place']}, {text:'Point to their own body',tags:['place']},
      {text:'Show one to five fingers',tags:['strength']}, {text:'Point along a low–high scale',tags:['strength']},
      {text:'Point to the ward clock',tags:['time']}
    ] : [
      {text:'Mark the spot on a map',tags:['place']}, {text:'Point to a doorway photo',tags:['place']},
      {text:'Point to a clock face',tags:['time']}, {text:'Write the time in digits',tags:['time']},
      {text:'Circle a pain score',tags:['strength']}
    ];
    const goal = pain ? 'Show where it hurts and how strongly.' : 'Show which doorway and what time.';
    const answerSets = [[0,2],[0,3],[1,2],[1,3]];
    const item = brief(pain ? 'Give pain a voice' : 'Rebuild the last memory', pain ? 'During' : 'After',
      pain ? 'Build a two-part way for your patient to report their pain.' : 'Build a two-part way for your patient to describe the fall.',
      pain ? [`${name} can point, recognise pictures and show numbers with one hand. Speech is difficult.`, 'You need both the painful spot and the strength of the pain.'] :
        [`${name} remembers the doorway and exact time. They can point or write digits, but cannot speak.`, 'The map and photos show each doorway clearly. Record both the place and time.'],
      pieces.map(p => p.text), answerSets[0], pain ? 'A location method and an intensity method make a complete report. Two ways to point out the spot still leave the strength unknown.' : 'A location method and a time method together recover the account. Two location clues leave the timing unknown.');
    item.build = {goal,pieces,accept:answerSets};
    return item;
  },

  // Three plausible candidates. Independent constraints converge on one solution.
  54(c) {
    const [name] = c.p;
    const side = c.flip() ? 'left' : 'right';
    const other = side === 'left' ? 'right' : 'left';
    const which = c.pick(['Blue','Green','Amber']);
    const [a,b] = ['Blue','Green','Amber'].filter(x => x !== which);
    return brief('A splint for the journey', 'During', `Which removable support meets both needs for ${name}’s journey?`, [
      `The hand team specified a ${side}-hand support with room for a bulky dressing.`,
      `${a} and ${which} fit the ${side} hand. ${b} fits only the ${other}.`,
      `${b} and ${which} leave room for the dressing. ${a} is too narrow.`
    ], ['Blue','Green','Amber'], ['Blue','Green','Amber'].indexOf(which),
    `Only ${which} fits both the hand and the dressing. ${a} fits the hand but pinches the dressing; ${b} has room but fits the opposite hand.`);
  },

  // Combine the patient's hearing, observations of their replies and the room layout into a new plan.
  55(c) {
    const [name] = c.p;
    const good = c.flip() ? 'left' : 'right';
    const poor = good === 'left' ? 'right' : 'left';
    return brief('The reassuring nod', 'After', 'How should you explain the discharge plan?', [
      `${name} hears clearly only on the ${good}.`,
      `Staff stand on the ${poor}. ${name} nods, then asks family what was said.`,
      'Family see the same nod when words are clear and when words are missed.'
    ], [`Use the ${good}. Ask for the plan back.`, `Use the ${good}. Check for a nod.`, `Use the ${poor}. Ask for the plan back.`], 0,
    `The ${good} side addresses hearing. Asking for the plan back addresses the ambiguous nod. Each alternative fixes just one part.`);
  }
};


// Alternate situations change the task as well as the names and measurements.
const secondStories = {
  31(c) {
    const all = c.flip();
    return brief('Count the returning patients', 'After',
      all ? 'Where can one observer count every patient exactly once?' : 'Where can one observer count only those sent for pictures?', [
        'From the ward, patients go straight to recovery or stop once in X-ray first.',
        'Everyone enters recovery once. From there they leave by either lift or ramp.'
      ], ['X-ray entrance','Recovery entrance','Lift doors'], all ? 1 : 0,
      all ? 'Both routes meet at recovery. X-ray misses direct arrivals and the lift misses those using the ramp.' :
      'Only the X-ray route passes the X-ray entrance. The two routes have already merged by recovery.');
  },

  32(c) {
    const [name] = c.p;
    const first = c.flip();
    return brief('What did “almost” mean?', 'During', `What sequence should you record for ${name}?`, [
      `${name}: “Before I fell, I ${first ? 'almost fainted' : 'fainted'}.”`,
      `Witness: “After the fall, you ${first ? 'fainted' : 'almost fainted'}.”`,
      'Here “almost fainted” means they stayed conscious. Both accounts are accurate.'
    ], ['Lost consciousness only before the fall','Lost consciousness only after the fall','Lost consciousness both times'], first ? 1 : 0,
    `Only the ${first ? 'after' : 'before'} account describes a loss of consciousness. “Almost” changes what can go in the timeline.`);
  },

  33(c) {
    const [name] = c.p;
    const total = 12;
    const together = c.pick([1,2,3]);
    const lift = c.pick([9,10,11]);
    const open = total - together;
    return brief('A route to the waiting team', 'Before', `Which route is likelier to get ${name} through?`, [
      'The trolley can try two gates. In 12 comparable trips, each gate jammed on four.',
      `Both jammed on the same trip ${together} ${together === 1 ? 'time' : 'times'}. Either open gate gets you through.`,
      `The lift worked on ${lift} of those 12 trips.`
    ], ['Take the gates','Take the lift','The chances match'], open > lift ? 0 : (open < lift ? 1 : 2),
    `The gates fail only when both jam: ${together} of 12 trips. They worked on ${open}, compared with ${lift} for the lift.`);
  },

  34(c) {
    const [a,b] = c.p;
    const swap = c.flip();
    const target = c.pick([4,5,6]);
    const fast = [3,25,target,2,9];
    const steady = [7,2,8,5,4];
    const [first,second] = swap ? [steady,fast] : [fast,steady];
    const goal = target === 5 ? 2 : ((target < 5) !== swap ? 0 : 1);
    return brief('“What’s the usual wait?”', 'Before', 'Which team had the shorter middle wait for an X-ray?', [
      `${a}’s last five waits: ${first.join(', ')} minutes.`,
      `${b}’s: ${second.join(', ')} minutes.`,
      'Sort each five. The family is asking about the middle wait.'
    ], [a,b,'Their middle waits match'], goal,
    `The middle wait for ${swap ? b : a}’s team is ${target} minutes. The other team’s is 5. The 25-minute delay affects the average more than the middle.`);
  },

  35(c) {
    const [name] = c.p;
    const active = c.flip();
    const second = c.pick(['bedside bell','door button']);
    const first = second === 'bedside bell' ? 'door button' : 'bedside bell';
    return brief('Would the call still have gone out?', 'After', `Suppose only the ${first} had failed. What would the desk have received?`, [
      `At ${name}’s bed, either button sends the same call. Two together still send one call.`,
      `The ${first} was pressed. A witness saw the ${second} ${active ? 'pressed too' : 'untouched'}.`
    ], ['One call','Two calls','No call'], active ? 0 : 2,
    active ? `The ${second} alone would still send one call. Removing a redundant cause need not change the result.` :
      `The ${second} stayed untouched. Removing the only pressed button removes the call.`);
  },

  36(c) {
    const [a,b] = c.p;
    const fog = c.flip();
    const right = c.flip();
    const route = right ? 'river' : 'hill';
    const other = right ? 'hill' : 'river';
    return brief('If the fog rolls in', 'Before', `Suppose dispatch reports ${fog ? 'fog' : 'clear skies'}. Who reaches the ward first?`, [
      `${a} is on the ${route} route. ${b} is on the ${other} route.`,
      'In clear skies, river takes 8 minutes and hill takes 12.',
      'Fog adds 6 minutes on river and 1 on hill. Both crews leave together.'
    ], [a,b,'They arrive together'], (fog ? !right : right) ? 0 : 1,
    fog ? `In fog, hill takes 13 minutes and river 14. ${right ? b : a} is on the hill route.` :
      `With clear skies the river route takes 8 minutes to the hill’s 12. ${right ? a : b} is on the river route.`);
  },

  37(c) {
    const [a,b] = c.p;
    const swap = c.flip();
    const [early,late] = swap ? [b,a] : [a,b];
    const turn = c.pick([2,3,4]);
    return brief('Who enters the quiet room?', 'During', 'Who will the nurse bring in next?', [
      'Only one can enter. At minute 3 the room opens. A patient back from X-ray by then goes first.',
      `${early} is waiting now. ${late} will return from X-ray at minute ${turn}.`,
      'An arrival stamped minute 3 joins before the nurse chooses.'
    ], [a,b,'They enter together'], (turn <= 3 ? late : early) === a ? 0 : 1,
    turn <= 3 ? `${late} is back by the check and gets the return slot. ${early} arrived first but is still waiting.` :
      `${late} is not back at the check. ${early} enters before the return rule can apply.`);
  },

  38(c) {
    const [a,b] = c.p;
    const swap = c.flip();
    const [both,one] = swap ? [b,a] : [a,b];
    return brief('Breakfast without help', 'After', 'Who is likelier to manage a spoon unaided tomorrow?', [
      'Among similar injuries, 6 of 8 with grip and wrist turning used a spoon alone the next day.',
      'With grip alone, 2 of 8 did so the next day.',
      `${one} grips harder but cannot turn their wrist. ${both} grips a spoon and turns it over.`
    ], [a,b,'Their chances look equal'], swap ? 1 : 0,
    `${both} matches the two-ability group. ${one}’s stronger grip still leaves the second ability missing.`);
  },

  39(c) {
    const [name] = c.p;
    const base = c.int(1,4);
    const gap = c.int(2,4);
    const walk = [base,base + gap,base + gap + gap + 1,base + 3*gap + 3];
    const next = walk[3] + gap + 3;
    const goal = next + c.pick([-1,0,1]);
    return brief('The chalk marks', 'After', `If the pattern holds, how will ${name} do against the ${goal}-step goal next time?`, [
      `Steps taken in four sessions: ${walk.join(', ')}.`,
      'Each gain has been one step bigger than the preceding gain.',
      'Use that same change for one more session.'
    ], ['Fall short','Meet it exactly','Pass it'], next < goal ? 0 : (next === goal ? 1 : 2),
    `The gains are ${gap}, ${gap + 1}, ${gap + 2}. Another gain of ${gap + 3} gives ${next} steps against a goal of ${goal}.`);
  },

  40(c) {
    const [a,b] = c.p;
    const second = c.pick([3,4,5]);
    const swap = c.flip();
    const [x,y] = swap ? [b,a] : [a,b];
    return brief('The enlarged photographs', 'After', 'Which cut was actually longer?', [
      `${x}’s cut spans 12 squares in a photo enlarged to 3 squares per real centimetre.`,
      `${y}’s spans ${second * 2} squares in a photo enlarged to 2 squares per real centimetre.`
    ], [a,b,'They were the same length'], second === 4 ? 2 : ((second < 4) !== swap ? 0 : 1),
    `${x}’s cut measures 12 ÷ 3 = 4 cm. ${y}’s measures ${second * 2} ÷ 2 = ${second} cm. Count the ruler units for each photo.`);
  },

  41(c) {
    const [name] = c.p;
    const leg = c.int(6,14);
    const extra = c.int(2,5);
    const roundTrip = c.flip();
    const oneWay = roundTrip ? leg : leg * 2;
    const total = 2 * leg + extra;
    return brief('The missing distance', 'After', 'How far was the bed from the door?', [
      roundTrip ? `${name} walked from the bed to the door and back along the same line.` :
        `${name} walked from the bed to the door. The nurse wheeled them back, without any more steps.`,
      `They then walked ${extra} more metres to the chair. Total distance walked: ${total} metres.`
    ], [`${leg} m`,`${leg*2} m`,`${total} m`], roundTrip ? 0 : 1,
    `Take off the final ${extra} metres. ${roundTrip ? 'The remaining ' + (2*leg) + ' includes two equal legs' : 'The entire remaining distance was walked on the outward leg'}. The door was ${oneWay} metres away.`);
  },

  42(c) {
    const capacity = c.int(2, 4);
    const families = capacity + c.int(1, capacity === 2 ? 1 : 2);
    const helpers = c.int(1, families);
    const clerkCalls = families - helpers;
    const sent = Math.max(0, capacity - clerkCalls);
    const remaining = families - sent;
    const answer = sent === 0 ? 0 : (remaining >= capacity ? 1 : 2);
    const outcome = sent === 0
      ? `Calls fill all ${capacity} slots. Nobody gets written news, so all ${families} families call again.`
      : `${sent} ${sent === 1 ? 'family gets' : 'families get'} news. That leaves ${remaining} ${remaining === 1 ? 'caller' : 'callers'} next round. ` +
        (remaining >= capacity
          ? `They fill all ${capacity} slots. Updates stall again.`
          : `With ${capacity} slots, another update fits. Each update frees more time next round.`);
    return brief('The waiting-room phones', 'During', 'Will one round of phone help break the cycle?', [
      `${families} families ring once every round until given written news. Phone answers alone bring no news.`,
      `The clerk has ${capacity} slots per round. Calls use one each first. Each spare slot updates one family.`,
      `${helpers} ${helpers === 1 ? 'helper takes' : 'helpers each take'} one call this round only. No new families join.`
    ], ['No written news goes out.', 'Some get news, then updates stall.', 'Updates continue until everyone gets news.'], answer, outcome);
  },

  43(c) {
    const [a,b] = c.p;
    const [forCall,other] = c.flip() ? [a,b] : [b,a];
    const window = c.pick([4,8]);
    return brief('The one family call', 'After', 'Who must you visit first to finish both conversations?', [
      `Both visits last four minutes. ${forCall} wants a relative on the line throughout theirs.`,
      `The relative can stay on the line only until minute ${window}. ${other} is free for eight minutes.`,
      'You can begin either visit now.'
    ], [a,b,'Either can go first'], window === 8 ? 2 : (forCall === a ? 0 : 1),
    `Visiting ${forCall} second would end the call at minute 8. Their relative can stay until minute ${window}.`);
  },

  44(c) {
    const slow = c.flip() ? 'north' : 'south';
    const fast = slow === 'north' ? 'south' : 'north';
    const gap = c.pick([2,4]);
    const target = c.flip() ? slow : fast;
    const answer = gap === 4 ? (target === fast ? 2 : 3) : (target === 'north' ? 0 : 1);
    return brief('Which bedside visit comes first?', 'During', `Which call gets the second clinician to ${target} first?`, [
      'Both patients are equally stable. The clinician will see the shorter visit first after your prep.',
      `Without prep, ${fast} takes 6 minutes and ${slow} takes ${6 + gap}.`,
      'Calling one patient now takes their history, shortening that visit by 3 minutes.'
    ], ['Call north','Call south','Either call','Neither call'], answer,
    gap === 4 ? `Even after prep, ${slow} takes 7 minutes against 6 at ${fast}. The clinician always visits ${fast} first.` :
    `Prep at ${slow} makes it 5 minutes against 6 at ${fast}. Prep at ${fast} makes it 3 against 8. The call decides their choice.`);
  },

  45(c) {
    const unique = c.pick(['Touch','Grip','Turn']);
    const [x,y] = ['Touch','Grip','Turn'].filter(k => k !== unique);
    return brief('Beat the drill examiner', 'During', 'Which single test identifies the case even if the examiner picks the hardest pair?', [
      `Scores for practice hands A, B, C in that order: ${x} gives 1, 1, 2.`,
      `${unique}: 1, 3, 2. ${y}: 3, 1, 1.`,
      'You name a test. The examiner then secretly chooses either case from any pair.'
    ], ['Touch','Grip','Turn'], ['Touch','Grip','Turn'].indexOf(unique),
    `${unique} gives three different scores. ${x} confuses A with B, and ${y} confuses B with C.`);
  },

  46(c) {
    const [name] = c.p;
    const roles = c.pick([['Nurse','Therapist','Doctor'], ['Therapist','Doctor','Nurse'], ['Doctor','Nurse','Therapist']]);
    const [a,b,d] = roles;
    const options = ['Nurse','Therapist','Doctor'];
    return brief('Two visits before home', 'After', `Which two visits cover all four things ${name} wants to practise?`, [
      `Today ${a} covers stairs and showering. ${b} covers showering and dressing.`,
      `${d} covers dressing and opening food packets. Only two visits fit.`
    ], options, [options.indexOf(a),options.indexOf(d)].sort((i,j) => i-j),
    `Only ${a} covers stairs and only ${d} covers packets. Together they also cover showering and dressing.`);
  },

  47(c) {
    const [name] = c.p;
    const hand = c.pick(['count', 'length', 'both']);
    const bulb = c.pick(['count', 'length']);
    const valid = hand === 'both' || hand === bulb;
    const handFact = {
      count: 'They can squeeze once or twice, always for the same length of time.',
      length: 'They can squeeze short or long, but cannot repeat a squeeze reliably.',
      both: 'They can change both how long and how many times they squeeze.'
    }[hand];
    const signal = bulb === 'count'
      ? 'At your desk each squeeze makes one identical flash, regardless of how long it lasts.'
      : 'Your desk shows how long the first squeeze lasts. Further squeezes are ignored.';
    const shared = bulb === 'count' ? 'the number of squeezes' : 'the length of a squeeze';
    const why = valid
      ? `The patient can change ${shared}, and the bulb preserves it. Two active signals keep sleep distinct from a reply.`
      : 'The bulb erases the only difference the patient can make. Silence might mean sleep, so a different channel is needed.';
    return brief('A voice through the glass', 'During', 'Which yes/no code can you actually distinguish?', [
      `${name} cannot speak. Silent spells may mean sleep, so each answer needs an active signal.`,
      handFact, signal
    ], ['One or two squeezes', 'A short or a long squeeze', 'A squeeze or silence', 'Use a different channel'], valid ? (bulb === 'count' ? 0 : 1) : 3, why);
  },

  48(c) {
    const [a,b,d] = c.p;
    const waits = c.flip() ? b : d;
    const independent = waits === b ? d : b;
    return brief('Who else would wait?', 'During', `If the interpreter leaves now, whose scan is delayed besides ${a}’s handover?`, [
      `${a} stays in the scan room until the interpreter explains the transfer.`,
      `${waits} needs the same room next. ${independent} uses the empty room next door.`,
      'The interpreter is called to another floor before the explanation.'
    ], [b,d,'Both waiting patients'], waits === b ? 0 : 1,
    `The interpreter’s absence keeps ${a} in the room. That blocks ${waits}. ${independent} uses a separate room.`);
  },

  49(c) {
    const [name] = c.p;
    const ceiling = c.pick([2,3]);
    const swap = c.flip();
    const [a,b] = swap ? ['hall','garden'] : ['garden','hall'];
    const shorter = ceiling === 2 ? b : a;
    return brief('Rain before the walk', 'After', `Which route fits ${name}’s risk limit in either weather?`, [
      `${name}: “I prefer the shorter route within my limit. Allow at most ${ceiling} falls per 20 comparable walks, even in rain.”`,
      `${a} is shorter: 1 fall dry, 3 wet. ${b} is longer: 2 dry, 2 wet.`,
      'Both routes are supervised. Each count covers 20 walks. There is no forecast.'
    ], ['Garden','Hall','Neither route'], shorter === 'garden' ? 0 : 1,
    ceiling === 2 ? `The ${a} route exceeds the limit when wet. The ${b} stays at 2 in 20 in both settings.` :
      `Both meet the limit even when wet, so the patient’s preference for the shorter ${a} route decides.`);
  },

  50(c) {
    const [name] = c.p;
    const base = c.int(2,4);
    const penalty = c.pick([2,4,6]);
    const score = base + penalty / 2;
    const safe = base + 2;
    return brief('Make it home for visiting time', 'After', `Which pickup gives ${name} the shorter average wait?`, [
      `The ward car arrives in ${safe} minutes for sure.`,
      `The family car takes ${base} minutes if its gate is open, ${base + penalty} if shut. Each is equally likely.`,
      `${name} cares about average waiting time. Both rides are suitable.`
    ], ['Ward car','Family car','Average waits are equal'], safe < score ? 0 : (score < safe ? 1 : 2),
    `The family car averages ${score} minutes: halfway between ${base} and ${base + penalty}. The ward car takes ${safe}.`);
  },

  51(c) {
    const [a,b,d] = c.p;
    const loop = c.flip();
    return brief('Who saw the patient fall?', 'After', 'Where does your witness-tracing procedure lead?', [
      'Start with the first contact. Follow referrals until an eyewitness answers. A repeated name means seek a fresh witness.',
      `Start at ${a}, who refers you to ${b}. ${b} refers you to ${d}.`,
      loop ? `${d} refers you back to ${b}.` : `${d} saw the fall directly.`
    ], [`Record ${d}’s eyewitness account`, `Start again with ${a}`, 'Seek a fresh witness'], loop ? 2 : 0,
    loop ? `The path returns to ${b}, so another pass will repeat the same referrals. Take the loop exit and seek a fresh witness.` :
      `${d} satisfies the stopping rule by directly witnessing the fall. Restarting would discard the account you traced.`);
  },

  52(c) {
    const [a,b,d] = c.p;
    const order = c.flip();
    const two = order ? [[0,1],[1,2]] : [[1,2],[0,1]];
    const now = [a,b,d];
    const target = c.int(0,2);
    let original = target;
    for(const [left,right] of [...two].reverse()) {
      if(original === left) original = right;
      else if(original === right) original = left;
    }
    return brief('The watch left behind', 'After', `Which bay holds ${now[target]}’s belongings?`, [
      `Each bag stayed in its owner’s original bay. Patients in bays ${two[0][0] + 1} and ${two[0][1] + 1} swapped places.`,
      `Then patients in bays ${two[1][0] + 1} and ${two[1][1] + 1} swapped.`,
      `Now bay 1 holds ${a}, bay 2 ${b}, bay 3 ${d}.`
    ], ['Bay 1','Bay 2','Bay 3'], original,
    `Start in bay ${target + 1} where ${now[target]} is now. Undo the last swap first, then the earlier one. You reach bay ${original + 1}.`);
  },

  54(c) {
    const [a,b,d] = c.p;
    const family = c.flip();
    const actual = family ? b : d;
    return brief('The unnamed family message', 'After', 'Which patient does the caller’s message belong to?', [
      `Caller: “My relative came in after ${a}.”`,
      `${b} and ${d} both arrived later. One went through the side door, the other through reception.`,
      `${b} used reception. The caller saw their relative enter through ${family ? 'reception' : 'the side door'}.`
    ], [a,b,d], family ? 1 : 2,
    `Arrival time leaves ${b} and ${d}. ${family ? b + ' used reception' : b + ' using reception leaves the side door for ' + d}, so ${actual} fits both facts.`);
  },

  55(c) {
    const [name] = c.p;
    const room = c.flip();
    return brief('Two true accounts', 'After', 'Which explanation and check fit the whole handover?', [
      `${name} heard the bedside phone. Staff say the door buzzer went unheard.`,
      'The buzzer runs from door switch to desk relay to room speaker. The phone rings directly.',
      room ? 'The relay caught every buzz. The room speaker failed its own sound test.' :
        'The relay caught no buzz. The room speaker passed its own sound test.'
    ], ['Separate signals. Check the room speaker.', 'Separate signals. Check the switch-to-relay path.', 'One shared ringer. Check the phone.'], room ? 0 : 1,
    room ? 'The relay received the signal, but the speaker cannot play it. The phone has a separate ringer, so its calls still got through.' :
      'The speaker works but the relay recorded nothing upstream. The phone rings by a different path, so both accounts can be true.');
  }
};

// Some paired stories have a longer inference chain. Give those more weight on senior shifts.
const deeperVersions = {31:1, 33:1, 36:2, 39:2, 43:1, 44:2, 46:1, 52:2};
export const bankB = Object.fromEntries(Object.keys(firstStories).map(id => [
  id,
  c => {
    if (!secondStories[id]) return firstStories[id](c);
    const versions = [firstStories[id], secondStories[id]];
    const deeper = deeperVersions[id];
    if (!deeper || !c.level || c.level === 3) return versions[c.int(0,1)](c);
    const chooseDeeper = c.int(1,4) <= (c.level > 3 ? 3 : 1);
    return versions[chooseDeeper ? deeper - 1 : 2 - deeper](c);
  }
]));
