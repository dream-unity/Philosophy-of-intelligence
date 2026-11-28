// Bedside decisions with estimates and preferences supplied by the individual case.
export const bedsideCases = {
  38(c) {
    const [a, b] = c.p;
    const aIsRising = c.flip();
    const checkpoint = c.int(0, 2);
    const minutes = [5, 10, 15][checkpoint];
    const rising = [2, 5, 7][checkpoint];
    const steady = [4, 5, 6][checkpoint];
    const equal = rising === steady;
    const aHigher = aIsRising === (rising > steady);
    const target = aHigher ? a : b;
    return {
      title: 'Breathing before pickup', phase: 'During', question: 'Who is likelier to need breathing support by pickup?',
      clues: [
        'After similar chest injuries, crews checked breathing support at minutes 5, 10 and 15.',
        'With rising effort, 2, 5 then 7 in 10 needed support by those times. With steady effort, 4, 5 then 6 in 10 did.',
        `${a}’s effort is ${aIsRising ? 'rising' : 'steady'}. ${b}’s is ${aIsRising ? 'steady' : 'rising'}. Pickup is ${minutes} minutes away.`
      ], options: [a, b, 'Both forecasts are equal'], answer: equal ? 2 : aHigher ? 0 : 1,
      why: `By minute ${minutes}, support was needed in ${rising} of 10 rising cases and ${steady} of 10 steady cases. ${equal ? 'At this checkpoint the estimates coincide.' : 'Using the other end of the time window would reverse the order.'}`,
      outcome: equal ? 'You brief the transport team that both patients have the same estimated chance by pickup.' : `You have breathing support ready at ${target}’s bedside for the wait.`
    };
  },

  46(c) {
    const [a, b] = c.p;
    // Even first benefits and smaller odd second benefits give a unique optimum.
    const firstA = c.pick([4, 6, 8]);
    const firstB = c.pick([4, 6, 8]);
    const nextA = c.pick([1, 3, 5, 7].filter(value => value < firstA));
    const nextB = c.pick([1, 3, 5, 7].filter(value => value < firstB));
    const totals = [firstA + nextA, firstA + firstB, firstB + nextB];
    const descending = [...totals].sort((x, y) => y - x);
    const answer = totals.indexOf(descending[0]);
    return {
      title: 'Two extra blankets', phase: 'Before', question: 'Where would two extra blankets spare the most shivering?',
      clues: [
        'Both patients are already being warmed. The crew estimates minutes of shivering each extra blanket could spare on the ride.',
        `${a}’s first saves ${firstA} minutes. A second adds ${nextA}.`,
        `${b}’s first saves ${firstB} minutes. A second adds ${nextB}.`
      ], options: [`Both with ${a}`, 'One with each', `Both with ${b}`], answer,
      why: `Both with ${a} spare ${totals[0]} minutes, splitting spares ${totals[1]}, and both with ${b} spare ${totals[2]}. Count only the extra benefit of a second blanket.`,
      outcome: `Between the patients, the crew expects to spare ${descending[0]} minutes of shivering on the ride.`
    };
  },

  48(c) {
    const [a, b] = c.p;
    const aCanPress = c.flip();
    const mode = c.pick(['push', 'voice', 'both']);
    const either = mode === 'both';
    const button = mode === 'push';
    const target = aCanPress === button ? a : b;
    const other = target === a ? b : a;
    return {
      title: 'A call that still gets through', phase: 'During', question: 'Whose bedside assistant can join you for wound care?',
      clues: [
        'Two injured patients cannot reach the wall bell. Their assistants relay calls for help to the desk.',
        `${aCanPress ? a : b} can press but cannot speak. ${aCanPress ? b : a} can speak but cannot press.`,
        either ? 'One portable bell summons the desk by voice or by touch. It can go beside either patient.' : button ? 'You now have one portable push button. Pressing it summons the desk directly.' : 'You now have one voice bell. Speaking into it summons the desk directly.'
      ], options: [`${a}’s assistant`, `${b}’s assistant`, 'Either assistant'], answer: either ? 2 : target === a ? 0 : 1,
      why: either ? 'Place the bell at whichever bed the assistant leaves. Either patient has a way to use it and the other assistant stays in place.' : `${target} can summon the desk by ${button ? 'pressing the button' : 'speaking into the bell'}. Removing ${other}’s assistant would break that patient’s only route to help.`,
      outcome: `You gain a second pair of hands. Calls can still reach the desk from both beds.`
    };
  },

  49(c) {
    const [a, b] = c.p;
    const worsenA = c.pick([4, 8, 12]);
    const worsenB = c.pick([4, 8]);
    const divisorB = c.pick([2, 4]);
    const silentA = worsenA / 2;
    const silentB = worsenB / divisorB;
    const scaledB = silentB * 2;
    const answer = silentA === scaledB ? 2 : silentA > scaledB ? 0 : 1;
    return {
      title: 'Who might worsen silently?', phase: 'During', question: 'Who is likelier to worsen and go unheard between checks?',
      clues: [
        'One observer is free. Without one, a change between checks is noticed only if the patient calls.',
        `Of 20 earlier patients like ${a}, ${worsenA} worsened. Half of those could not call.`,
        `Of 10 like ${b}, ${worsenB} worsened. One in ${divisorB} of those could not call.`
      ], options: [`${a} has the higher risk`, `${b} has the higher risk`, 'Both risks are equal'], answer,
      why: `${silentA} of 20 like ${a} worsened unheard. For ${b}, ${silentB} of 10 is ${scaledB} of 20. Compare those counts on the same scale.`,
      outcome: answer === 2 ? 'The observer can cover either bedside at the same estimated risk of a missed change.' : `You assign the observer to ${answer === 0 ? a : b}, whose change is more likely to go unheard.`
    };
  },

  50(c) {
    const [a] = c.p;
    const comfort = c.pick([2, 4, 6, 8]);
    const alert = c.pick([2, 4, 6, 8]);
    const quickAlert = c.int(1, 3);
    const gentleComfort = c.int(1, 3);
    const quickTotal = 4 * comfort + quickAlert * alert;
    const gentleTotal = gentleComfort * comfort + 4 * alert;
    const answer = quickTotal === gentleTotal ? 2 : quickTotal > gentleTotal ? 0 : 1;
    return {
      title: 'Comfort or a clear head?', phase: 'During', question: `Which dressing plan scores higher for ${a} on average?`,
      clues: [
        `${a} gives comfort ${comfort} points and staying alert ${alert} points. Add both when both happen.`,
        `Quick relief in four similar dressings: all four were comfortable and ${quickAlert} stayed alert.`,
        `Gentler relief in four: ${gentleComfort} were comfortable and all four stayed alert. Both plans are suitable.`
      ], options: ['Quick relief', 'Gentler relief', 'Equal average scores'], answer,
      why: `Counting both things ${a} values gives quick relief ${quickTotal} points across four dressings, against ${gentleTotal} for gentler relief. The averages are ${quickTotal / 4} and ${gentleTotal / 4}.`,
      outcome: answer === 2 ? `You can offer ${a} either plan at the same expected score.` : `You can explain why ${answer === 0 ? 'quick' : 'gentler'} relief best fits ${a}’s own priorities.`
    };
  },

  65(c) {
    const [a, b, visitor1, visitor2] = c.p;
    const firstVisitorForA = c.flip();
    const aAcceptsStaff = c.flip();
    const firstVisitorIsHere = c.flip();
    const visitorA = firstVisitorForA ? visitor1 : visitor2;
    const visitorB = firstVisitorForA ? visitor2 : visitor1;
    const here = firstVisitorIsHere ? visitor1 : visitor2;
    const missingA = visitorA !== here;
    const waiting = missingA ? a : b;
    const needsStaff = missingA === aAcceptsStaff;
    const answer = needsStaff ? (missingA ? 0 : 1) : 2;
    return {
      title: 'Someone just for them', phase: 'During', question: 'Where should you offer a staff member for company?',
      clues: [
        `Burn dressings start together. For company, ${a} chose ${visitorA} and ${b} chose ${visitorB}.`,
        `${aAcceptsStaff ? a : b} asks for staff company if their visitor is absent. ${aAcceptsStaff ? b : a} wants privacy if theirs is absent.`,
        `Only ${here} has arrived. Both dressing teams are ready.`
      ], options: [`${a}’s bed only`, `${b}’s bed only`, 'Neither bed needs extra company'], answer,
      why: needsStaff ? `${waiting}’s visitor is absent and they asked for staff in that case. ${here} is already with the other patient.` : `${waiting}’s visitor is absent and they asked for privacy in that case. ${here} can sit with the other patient.`,
      outcome: needsStaff ? `You arrange bedside company for ${waiting} through the dressing.` : 'One patient has their chosen visitor. The other has the privacy they requested.'
    };
  }
};
