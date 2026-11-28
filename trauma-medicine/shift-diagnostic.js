// Every case gives the facts needed for this particular decision on its face.
const firstCases = {
  1(c) {
    const [patient] = c.p;
    const rib = c.flip(), shoulder = c.flip();
    return {
      title: 'Pain after the crash', phase: 'During', question: 'Which of the team’s predicted signs appeared?',
      clues: [
        `For ${patient}, the team is comparing a sore rib with a shoulder injury.`,
        'They expect rib pain with local pressure and shoulder pain when the arm lifts.',
        `Rib pressure ${rib ? 'reproduces the pain' : 'feels painless'}. Lifting the arm ${shoulder ? 'reproduces it' : 'feels painless'}.`
      ],
      options: ['Pain on rib pressure only', 'Pain on arm lift only', 'Both signs', 'Neither sign'],
      answer: rib ? (shoulder ? 2 : 0) : (shoulder ? 1 : 3),
      why: `Pressure ${rib ? 'reproduced' : 'didn’t reproduce'} the pain. Arm movement ${shoulder ? 'did reproduce it' : 'didn’t reproduce it'}. Each finding checks a different prediction.`
    };
  },
  2(c) {
    const [a, b] = c.p;
    const reciprocal = c.flip();
    return {
      title: 'The wrong X-ray', phase: 'During', question: 'Which mix-up best fits both records?',
      clues: [
        `${a} has an old metal plate. ${b} has an old screw. Each has just one implant.`,
        `Today’s X-ray filed under ${a} shows a screw.`,
        `The image under ${b} ${reciprocal ? 'shows a plate' : 'is the very same image, down to a scratch on the detector'}.`
      ],
      options: ['The two images traded names', `${b}’s image was filed twice`, `${a}’s image was filed twice`], answer: reciprocal ? 0 : 1,
      why: reciprocal ? `Each file shows the other person’s implant. A duplicate would show the same implant twice.` : `Both files contain the same screw image, which fits ${b}. A swap would leave a plate in one file.`
    };
  },
  3(c) {
    const [a,b,d] = c.p;
    const card = c.flip();
    return {
      title: 'The missing handover', phase: 'Before', question: 'Whose ambulance crew still needs to brief you?',
      clues: [
        `Exactly one of three crews still owes a handover. ${a}’s crew briefed you in person.`,
        `${b} arrived from the bridge. ${d} arrived from the station.`,
        `The nurse recorded a complete phone handover from the ${card ? 'bridge' : 'station'} crew.`
      ], options:[a,b,d], answer:card ? 2 : 1,
      why:`${a}’s crew spoke in person and ${card ? b : d}’s by phone. That leaves ${card ? d : b}’s crew.`
    };
  },
  4(c) {
    const cleared = c.pick(['sensor', 'cable', 'screen']);
    const answer = cleared === 'screen' ? 0 : cleared === 'sensor' ? 1 : 2;
    return {
      title:'Whose alarm?', phase:'During', question:'Where would one reading tell the two possible faults apart?',
      clues:[
        'On a practice dummy, the signal goes from sensor to cable to screen.',
        'One faulty part adds noise. Before that part the signal is clear. After it the signal is noisy.',
        `The technician has cleared the ${cleared}. Either other part could be faulty.`
      ],
      options:['Between sensor and cable', 'Between cable and screen', 'Either point works'], answer,
      why:cleared === 'cable' ? 'A sensor fault makes both points noisy. A screen fault leaves both points clear. Either reading separates them.' :
        cleared === 'sensor' ? 'After the cable, a noisy signal points to the cable and a clear one to the screen. Before the cable both faults give a clear reading.' :
        'After the sensor, noise points to the sensor and a clear signal to the cable. After the cable both faults give noise.'
    };
  },
  5(c) {
    const [a,b] = c.p;
    const follows = c.flip();
    return {
      title:'Cold on the way in', phase:'Before', question:'Which cause does the swap support?',
      clues:[
        `During an ambulance drill, ${a}’s practice wrap cooled faster than ${b}’s.`,
        `They swapped wraps between stretchers. The crew kept everything else the same.`,
        `The faster cooling ${follows ? 'moved to the other stretcher' : 'stayed on the same stretcher'}.`
      ],options:['Something about the wrap','Something about the stretcher','Both wraps cool equally on either stretcher'],answer:follows ? 0 : 1,
      why:follows ? 'Fast cooling travelled with the wrap when its position changed. A stretcher effect would have stayed put.' : 'Both wraps cooled faster on the same stretcher. A wrap effect alone would have moved with the wrap.'
    };
  },
  6(c) {
    const [right, wrong] = c.pick([['26','62'], ['71','17'], ['39','93'], ['84','48']]);
    const source = c.int(0,3);
    const entry = source === 0 ? wrong : source === 1 ? right : c.pick([right,wrong]);
    const card = source < 2 ? wrong : source === 2 ? right : c.pick([right,wrong]);
    const dialled = source === 3 ? right : wrong;
    return {
      title:'A family kept waiting', phase:'After', question:'Where did the number used for this call go wrong?',
      clues:[
        `Two phone numbers differ only in the last two digits. The family confirms ${right}.`,
        `The intake entry ends ${entry}. The handover card copied from it ends ${card}.`,
        `The doctor used the card. Dial history ends ${dialled}. The update went unanswered.`
      ],options:['At intake', 'At handover', 'At the phone', 'The number was right'],answer:source,
      why:source === 0 ? `The wrong digits, ${wrong}, appeared at intake. The card and the call both carried them forward.` :
        source === 1 ? `The intake entry was right. The digits changed to ${wrong} on the card and the doctor dialled those digits.` :
        source === 2 ? `The card said ${right}, the confirmed number. The digits changed to ${wrong} when the doctor dialled.` :
        `The doctor dialled the confirmed number. The unanswered call alone cannot tell you why the family missed the update.`
    };
  },
  7(c) {
    const upstream = c.flip();
    return {
      title:'The silent call bell', phase:'During', question:'Where did the call stop?',
      clues:[
        'Each bedside call lights the wall box. The box sends it to the desk, which then rings a pager.',
        `During a test, the wall box lit. The desk ${upstream ? 'stayed dark' : 'lit up'}.`,
        'The pager never rang. A single connection failed.'
      ],options:['Bed to wall box','Wall box to desk','Desk to pager'],answer:upstream ? 1 : 2,
      why:upstream ? 'The wall received the call, but the desk never did. The silent pager is a downstream effect.' : 'The call reached the desk, so both earlier connections worked. Only the last link can explain the silent pager.'
    };
  },
  8(c) {
    const [a] = c.p;
    const early = c.flip();
    return {
      title:'The torn sleeve', phase:'After', question:'Which interval can you document at the postmortem?',
      clues:[
        `A scene photo shows ${a}’s sleeve intact. It is torn in the ward photo.`,
        'The ambulance photo was taken between those two.',
        `In that middle photo, the sleeve is ${early ? 'already torn' : 'still intact'}.`
      ],options:['Scene photo to ambulance photo','Ambulance photo to ward photo','Before the scene photo'],answer:early ? 0 : 1,
      why:`The tear first appears in the ${early ? 'ambulance' : 'ward'} photo. That brackets when it appeared. The photos cannot identify who tore it.`
    };
  },
  9(c) {
    const [a] = c.p;
    const lead = c.pick([3,4,5]);
    const time = c.int(11,19);
    const slower = c.flip();
    const displayed = time + (slower ? -lead : lead);
    const exact = `10:${String(time).padStart(2,'0')}`;
    const raw = `10:${String(displayed).padStart(2,'0')}`;
    const before = `10:${String(time-1).padStart(2,'0')}`;
    return {
      title:'Time of arrival',phase:'After',question:`Which arrival time is best supported for ${a}?`,
      clues:[
        `The entry camera recorded ${a} at ${raw}. Its clock runs ${lead} minutes ${slower ? 'slow' : 'fast'}.`,
        `The receiving nurse independently wrote ${exact} on arrival, using the ward clock.`,
        `A later handover guessed ${before}.`
      ],options:[raw,exact,before],answer:1,
      why:`Correcting the camera gives ${exact}, the same time the nurse wrote independently. The later estimate has less direct support.`
    };
  },
  10(c) {
    const rare = c.pick([4,8,16]);
    const misses = 80 / rare;
    return {
      title:'When the screen flashes',phase:'During',question:'The screen flags a new arrival. Which group is likelier?',
      clues:[
        'Of 100 similar arrivals, 20 had a hidden injury and 80 did not.',
        'The screen flagged half of those with the injury.',
        `It also flagged 1 in ${rare} of those without it.`
      ],options:['Hidden injury','No hidden injury','Equally likely'],answer:misses === 10 ? 2 : misses > 10 ? 1 : 0,
      why:`Among flagged arrivals, 10 had the injury and ${misses} did not. Compare those groups after seeing the flag.`
    };
  },
  11(c) {
    const [a,b] = c.p;
    const kept = c.flip();
    return {
      title:'Just one scan slot',phase:'During',question:'Who is in the next scan slot?',
      clues:[
        `${a} and ${b} held the only two bookings, one now and one later.`,
        `${a} originally had the earlier slot. The printed board still shows that order.`,
        `The scanner team confirms the two patients ${kept ? 'swapped slots twice' : 'swapped slots once'} after printing.`
      ],options:[a,b,'The order is still unknown'],answer:kept ? 0 : 1,
      why:kept ? `Each swap exchanges the two slots. The second exchange put ${a} back in the earlier slot.` : `The one exchange moved ${b} into ${a}’s early slot. The printed board predates it.`
    };
  },
  12(c) {
    const quiet = c.flip();
    return {
      title:'A frightened child',phase:'During',question:'Which change alone separates every reply from every silence?',
      clues:[
        'Quiet room, familiar voice — the child replied.',
        `Quiet room, new voice — ${quiet ? 'the child replied' : 'no reply'}.`,
        `Noisy room, familiar voice — ${quiet ? 'no reply' : 'the child replied'}.`
      ],options:['Make the room quiet','Use a familiar voice','Always combine both changes'],answer:quiet ? 0 : 1,
      why:quiet ? 'The child replied to both voices in quiet. The familiar voice alone failed in noise. Quiet is the better pattern to try again.' : 'The familiar voice drew a reply in both rooms. Quiet alone failed with the new voice. Familiarity is the better pattern to try again.'
    };
  },
  13(c) {
    const [a] = c.p;
    const ward = c.pick(['East','West']);
    const outside = c.flip();
    return {
      title:'The quiet handover',phase:'After',question:`What can you promise ${a} about an interpreter?`,
      clues:[
        'Every patient on the supported list gets an interpreter at handover.',
        `Every transfer from ${ward} is on that list. Other transfers may be listed individually.`,
        `${a} is transferring from ${outside ? (ward === 'East' ? 'West' : 'East') : ward}.`
      ],options:['One is guaranteed','They cannot get one','Check the individual listing'],answer:outside ? 2 : 0,
      why:outside ? `${a} falls outside the group automatically listed. Individual listing is still possible, so check the record.` : `${a} belongs to the transfer group, everyone in that group is listed, and everyone listed gets an interpreter.`
    };
  },
  14(c) {
    const [a,b] = c.p;
    const overnight = c.flip();
    return {
      title:'The family phone tree',phase:'After',question:`Who did ${a} ask you to call next?`,
      clues:[
        `${a} said, “If I stay overnight, ring my sister. Otherwise ring my neighbour.”`,
        `The first plan was to send ${a} home to ${b}, the neighbour.`,
        `The signed decision ${overnight ? 'changed that to an overnight stay' : 'confirmed the trip home'}.`
      ],options:['The sister',`The neighbour, ${b}`,'Both contacts'],answer:overnight ? 0 : 1,
      why:`The signed plan activates the ${overnight ? 'overnight' : 'home'} branch of ${a}’s request. Being named in an earlier plan does not activate both branches.`
    };
  },
  15(c) {
    const [a,b,d,e] = c.p;
    const second = c.flip();
    return {
      title:'The next stretcher',phase:'Before',question:`Who goes ${second ? 'second' : 'third'} through the single doorway?`,
      clues:[`${b} has to go ahead of ${d}.`,`${e} follows ${d}.`,`${a} has to go ahead of ${b}.`],
      options:[a,b,d,e],answer:second ? 1 : 2,
      why:`Joining the three instructions gives ${a}, ${b}, ${d}, then ${e}. ${second ? b : d} takes the ${second ? 'second' : 'third'} place.`
    };
  },
  16(c) {
    const [a] = c.p;
    const elsewhere = c.flip();
    return {
      title:'The unlabelled transfer',phase:'Before',question:`Where can you locate ${a} with certainty?`,
      clues:[
        `Dispatch confirms ${a} took either the river ambulance or the hill ambulance.`,
        'The river crew went to East. The hill crew went to West.',
        elsewhere ? 'West checked every arrival. The patient never arrived there. Both crews completed delivery.' : 'East still has an unidentified arrival. West has not yet checked its arrivals.'
      ],options:['East only','West only','Either hospital is still possible'],answer:elsewhere ? 0 : 2,
      why:elsewhere ? `West has been excluded and both crews arrived. The river route to East is the only remaining route.` : 'An unidentified arrival makes East possible. Nothing rules West out or identifies the person at East.'
    };
  },
  17(c) {
    const [a] = c.p;
    const later = c.flip();
    const lead = c.int(2,5);
    const start = c.int(12,17);
    const end = start+lead;
    return {
      title:'A disputed handover',phase:'After',question:'Which line must you strike from the review?',
      clues:[
        `Verified camera times show ${a} entered the bay at 09:${start} and left at 09:${end}.`,
        'The witness says they spoke to the patient inside that bay. There was only one visit.',
        `The three proposed interview times are 09:${start}, 09:${start+1} and 09:${later ? end+1 : start-1}.`
      ],options:[`Spoke in the bay at 09:${start}`,`Spoke in the bay at 09:${start+1}`,`Spoke in the bay at 09:${later ? end+1 : start-1}`],answer:2,
      why:`At 09:${later ? end+1 : start-1}, ${a} ${later ? 'had already left' : 'had yet to arrive'}. Only that time contradicts the confirmed visit.`
    };
  },
  18(c) {
    const [source,one,two,other] = c.p;
    const last = c.flip();
    return {
      title:'A copied chart error',phase:'After',question:`Besides ${source}, whose charts need correction?`,
      clues:[
        `Every copy of ${source}’s mistaken note must be corrected, including copies made from copies.`,
        `${one}’s chart copied ${source}’s. ${two}’s chart copied ${one}’s.`,
        `${other}’s note ${last ? `was copied from ${two}’s` : 'was written independently'}.`
      ],options:[one,two,other],answer: last ? [0,1,2] : [0,1],
      why:`Follow the copies from ${source} to ${one}, then to ${two}${last ? `, then to ${other}` : `. ${other} has a separate note`}. Stopping at the first copy misses inherited errors.`
    };
  },
  19(c) {
    const [a] = c.p;
    const drivers = c.int(2,4);
    const escorts = c.int(2,3);
    const shared = c.flip();
    const total=drivers*escorts-(shared ? 1 : 0);
    const near=shared ? drivers*escorts : total-1;
    const distant=shared ? (c.flip() ? total-1 : total+2) : (c.flip() ? total+1 : total-2);
    return {
      title:'Build a transport crew',phase:'Before',question:'How many different driver–escort crews could leave?',
      clues:[
        'One person drives while a different person stays beside the patient.',
        `You have ${drivers} qualified drivers and ${escorts} qualified escorts.`,
        shared ? `${a} is on both lists. Everyone else appears just once.` : 'The lists contain different people. Everyone is available.'
      ],options:[String(near),String(total),String(distant)],answer:1,
      why:`${drivers} drivers paired with ${escorts} escorts give ${drivers*escorts} pairings. ${shared ? `Remove the one pairing that assigns ${a} both jobs, leaving ${total}.` : `Every pairing uses two different people, so all ${total} can work.`}`
    };
  },
  20(c) {
    const [a,b,d] = c.p;
    const switchRooms = c.flip();
    const hoist = switchRooms ? 'West' : 'East';
    const booth = switchRooms ? 'East' : 'West';
    return {
      title:'Three arrivals, three bays',phase:'Before',question:`Which bay can you give ${d} without displacing anyone?`,
      clues:[
        `${a} needs a ceiling lift. Only ${hoist} has one. Each bay holds one person.`,
        `${b}’s private exam can take place in ${hoist} or Centre.`,
        `${d} can use Centre or ${booth}. All three need a bay now.`
      ],options:['East','Centre','West'],answer:switchRooms ? 0 : 2,
      why:`${a} must take ${hoist}. That leaves Centre as ${b}’s only option, so ${d} needs ${booth}. Putting ${d} in Centre would leave ${b} no suitable bay.`
    };
  },
  21(c) {
    const shared = c.flip();
    return {
      title:'The missing results',phase:'During',question:'Which old incident gives you the closest lead?',
      clues:[
        'Once, two wards lost their messages when the relay they both used failed.',
        'Another time, one ward missed every message because its own receiver failed.',
        shared ? 'Today, two wards using the same route are missing results. A ward on another route gets them.' : 'Today, one ward misses results arriving by two routes. Other wards receive results on both routes.'
      ],options:['The shared relay incident','The single receiver incident','Both fit the pattern equally well'],answer:shared ? 0 : 1,
      why:shared ? 'The missing results follow one route across two destinations, just as the old relay failure did.' : 'Both routes work elsewhere. The common point is the ward where messages should arrive, like the earlier receiver failure.'
    };
  },
  22(c) {
    const [a,b,d] = c.p;
    const bad = c.int(0,2);
    const rise = c.flip();
    const names=[a,b,d];
    const times=names.map((_,i)=>{
      const base=(i+2)*5;
      const change=c.int(1,4)*(rise ? 1 : -1)*(i===bad ? -1 : 1);
      return `${base} to ${base+change}`;
    });
    return {
      title:'The waiting-room count',phase:'During',question:'Whose count needs checking against the door log?',
      clues:[
        `Three separate waiting rooms recorded only ${rise ? 'arrivals' : 'departures'} during the drill. Nobody ${rise ? 'left' : 'entered'}.`,
        `${a}’s headcount went from ${times[0]}. ${b}’s went from ${times[1]}.`,
        `${d}’s headcount went from ${times[2]}.`
      ],options:names,answer:bad,
      why:`Only ${names[bad]}’s count ${rise ? 'fell despite arrivals and no departures' : 'rose despite departures and no arrivals'}. The size of a change matters less than its direction here.`
    };
  },
  23(c) {
    const [a,b] = c.p;
    const duration=c.pick([6,7,8,9]);
    const available = duration*2 + (c.flip() ? 1 : -1);
    const conflict = available < duration*2;
    return {
      title:'Time for a goodbye',phase:'After',question:'What can you honestly promise both families?',
      clues:[
        `${a}’s and ${b}’s families each asked for ${duration} private minutes in the same room.`,
        `The room is available for the next ${available} minutes. It is empty now.`,
        'Both visits must finish before the room closes. Private visits cannot overlap.'
      ],options:['Both full private visits fit','Privacy and both full visits conflict','Only the arrival order matters'],answer:conflict ? 1 : 0,
      why:`Two private visits need ${2*duration} minutes in a single room. ${available} minutes ${conflict ? 'falls a minute short, whichever family enters first' : 'allows both visits and leaves one minute'}.`
    };
  },
  24(c) {
    const intake = c.flip();
    const next = intake ? ['shorter','longer'] : ['longer','shorter'];
    const other = intake ? ['longer','shorter'] : ['shorter','longer'];
    const correct=c.int(0,2);
    const one=(correct+1)%3;
    const repeats=(correct+2)%3;
    const plans=['A','B','C'];
    return {
      title:'Reverse the trade-off',phase:'During',question:'Which staffing plan reverses both effects of yesterday’s move?',
      clues:[
        `Yesterday, the wait at intake became ${next[0]} and the wait for a scan became ${next[1]}.`,
        `Plan ${plans[one]} made both waits ${other[0]}.`,
        `Plan ${plans[correct]} made intake ${other[0]} and scans ${other[1]}. Plan ${plans[repeats]} made intake ${next[0]} and scans ${next[1]}.`
      ],options:['Plan A','Plan B','Plan C'],answer:correct,
      why:`Reversing both effects means a ${other[0]} intake wait and a ${other[1]} scan wait. Plan ${plans[one]} reverses one effect. Plan ${plans[repeats]} repeats yesterday.`
    };
  },
  25(c) {
    const [a,b,d,e] = c.p;
    const first = c.flip();
    return {
      title:'One call, two roles',phase:'During',question:'Who can reach their backup and supervisor with one call?',
      clues:[
        `${a} reports to ${d}. ${b} reports to ${e}.`,
        `${first ? d : e} covers ${a} if a second doctor is needed.`,
        `${first ? d : e} also covers ${b}.`
      ],options:[a,b,'Both doctors'],answer:first ? 0 : 1,
      why:`${first ? a : b} both reports to and gets backup from ${first ? d : e}. The other doctor has two different people in those roles.`
    };
  },
  26(c) {
    const [a,b] = c.p;
    const big = c.flip();
    const clear = big ? 'lift' : 'ramp';
    return {
      title:'The blocked crossing',phase:'Before',question:'Which stretcher can enter without blocking the other crew?',
      clues:[
        'A rail crew keeps a crossing free by waiting until there is room beyond it.',
        `Your ward corridor is that crossing. ${a} needs the lift beyond it. ${b} needs the ramp.`,
        `Only the ${clear} has space. A stretcher stopping inside the corridor blocks both crews.`
      ],options:[a,b,'Send both together'],answer:big ? 0 : 1,
      why:`Like a train with a clear exit, ${big ? a : b} can cross and keep going. The other stretcher would have to stop inside the shared passage.`
    };
  },
  27(c) {
    const shared = c.flip();
    return {
      title:'What travels between shifts?',phase:'After',question:'Which lesson fits both incidents?',
      clues:shared ? [
        'Three beds received the same wrong name because one label sheet fed all three.',
        'Two families got the same wrong time because both calls used one outdated board.',
        'The review team wants a single change that could catch both errors.'
      ] : [
        'Two entries counted as family updates were playbacks of a single recorded message.',
        'Two alarm reports counted as injuries repeated the alert from a single fall.',
        'The review team wants a single change that could catch both errors.'
      ], options:['Check a shared source before copying it','Check whether separate reports describe one event','Make an extra copy of each report'],answer:shared ? 0 : 1,
      why:shared ? 'One bad source produced several wrong outputs in each incident. Checking that source protects all the recipients.' : 'Several signals were counted as independent events in each incident. Trace what each signal represents before counting.'
    };
  },
  28(c) {
    const [a,b,d] = c.p;
    const split=c.flip();
    return {
      title:'Who settles the lift booking?',phase:'Before',question:'Which is the lowest lead responsible for both crews?',
      clues:[
        `${a} leads Red and Blue. ${b} leads Gold and Green.`,
        `${d} supervises both leads.`,
        `Red and ${split ? 'Gold' : 'Blue'} both need the same patient lift.`
      ],options:[a,b,d],answer:split ? 2 : 0,
      why:split ? `Red and Gold belong to different leads. Their first common supervisor is ${d}.` : `${a} already leads both Red and Blue. Going to ${d} would climb one level higher than necessary.`
    };
  },
  29(c) {
    const [a] = c.p;
    const facingDoor = c.flip();
    const useLeft = c.flip();
    const liftSide = facingDoor !== useLeft;
    return {
      title:'A face they can see',phase:'During',question:`Where do you place the chair for ${a}’s visitor?`,
      clues:[
        'From the doorway facing the window, the lifts are on your left and the garden on your right.',
        `${a} sits facing the ${facingDoor ? 'doorway' : 'window'}.`,
        `They ask for their visitor on their ${useLeft ? 'left' : 'right'}, within easy view.`
      ],options:['Lift side','Garden side','Behind the chair'],answer:liftSide ? 0 : 1,
      why:`Facing the ${facingDoor ? 'doorway reverses' : 'window keeps'} the doorway observer’s left and right. ${a}’s ${useLeft ? 'left' : 'right'} is the ${liftSide ? 'lift' : 'garden'} side.`
    };
  },
  30(c) {
    const [a,b] = c.p;
    const start = c.int(12,19);
    const gap = c.int(3,5);
    const first = c.flip();
    const which = first ? a : b;
    const other = first ? b : a;
    return {
      title:'The unstaffed minute',phase:'During',question:'Whose promised bedside check needs cover?',
      clues:[
        `The outgoing nurse leaves at 10:${start}. The relief arrives at 10:${start+gap}.`,
        `${which}’s check is due one minute before the relief arrives.`,
        `${other}’s check is due one minute before the outgoing nurse leaves.`
      ],options:[a,b,'Both patients'],answer:first ? 0 : 1,
      why:`${which} is due at 10:${start+gap-1}, inside the gap. ${other} is due at 10:${start-1}, while the outgoing nurse is still there.`
    };
  }
};

// Additional settings change the underlying problem when a reasoning style returns.
const bedside = {
  1(c) {
    const [a] = c.p;
    const weak = c.flip();
    return {
      title:'A foot that will not lift', phase:'During', question:'Which explanation still fits the specialist’s findings?',
      clues:[
        `${a} cannot lift the front of one foot after a fall. The specialist has narrowed it to two nerve injuries.`,
        'Of these two injuries, only the one near the spine can also weaken movement sideways at the hip.',
        `When asked to move the leg sideways at the hip, ${a} is ${weak ? 'weak there too' : 'still strong'}.`
      ],options:['The knee injury fits better','The injury near the spine fits better','Both remain possible from this test'],answer:weak ? 1 : 2,
      why:weak ? 'The knee-level injury cannot explain hip weakness. The injury nearer the spine can explain both findings.' : 'A strong hip fits the knee-level injury. The injury nearer the spine can weaken the hip, but need not, so it remains possible.'
    };
  },
  2(c) {
    const [a] = c.p;
    const side = c.flip();
    return {
      title:'A voice at the bedside',phase:'During',question:'What best explains the pattern so far?',
      clues:[
        `${a} answered a sister who spoke from the left, but missed a nurse who spoke from the right.`,
        'They traded sides and repeated the same words at the same volume.',
        `This time ${a} answered ${side ? 'the nurse alone' : 'the sister alone'}.`
      ],options:['The side the voice came from','Which person was speaking','How loud they spoke'],answer:side ? 0 : 1,
      why:side ? 'The response stayed on the left even when the speaker changed. That makes the side worth checking next.' : 'The response followed the sister across sides while the volume stayed fixed. The identity of the speaker best fits these observations.'
    };
  },
  3(c) {
    const [a,b,d] = c.p;
    const relative=c.flip();
    return {
      title:'One bedside call unanswered',phase:'During',question:'Which patient still needs someone at their side?',
      clues:[
        `${a}, ${b} and ${d} called. A doctor and a nurse answered two different calls.`,
        `${a} came by bicycle. Only the cyclist is with the doctor.`,
        `Only ${relative ? b : d} has a visitor. The nurse is beside that visitor.`
      ],options:[a,b,d],answer:relative ? 2 : 1,
      why:`The doctor is with the cyclist, ${a}. The visitor puts the nurse with ${relative ? b : d}. That leaves ${relative ? d : b} alone.`
    };
  },
  4(c) {
    const [a,b] = c.p;
    const aBesideFamily = c.flip();
    const ruledOut = c.pick(['a whisper', 'an intercom fault', 'a hearing problem']);
    const familySide = aBesideFamily ? a : b;
    const bedside = aBesideFamily ? b : a;
    const both = ruledOut === 'an intercom fault';
    const witness = ruledOut === 'a whisper' ? bedside : familySide;
    return {
      title:'Speech behind the glass',phase:'During',question:'Whose account could distinguish the two remaining explanations?',
      clues:[
        'A whisper sounds faint on both sides. An intercom fault sounds faint only in the bay. A hearing problem affects only the patient.',
        `${familySide} was beside the family. ${bedside} was beside the patient in the bay. Both heard the message.`,
        `The patient heard faint speech. The team ruled out ${ruledOut}.`
      ],options:[`${a} only`, `${b} only`, 'Either one'],answer:both ? 2 : witness === a ? 0 : 1,
      why:both ? 'A whisper sounds faint to either witness. With a hearing problem, either witness hears normal speech. Both could distinguish those accounts.' :
        ruledOut === 'a whisper' ? `${bedside} would hear faint speech through a faulty intercom and normal speech if only the patient had trouble hearing. ${familySide} hears normal speech either way.` :
        `${familySide} would hear a whisper at its source. A faulty intercom leaves that side clear. ${bedside} hears faint speech in both cases.`
    };
  },
  5(c) {
    const changed = c.flip();
    return {
      title:'Itching under a dressing',phase:'After',question:'Which conclusion does this change support?',
      clues:[
        'A patient’s skin itched beneath a dressing held on by tape.',
        `At a scheduled change, the team changed ${changed ? 'the tape but kept the same dressing' : 'both tape and dressing'}.`,
        'The itching eased. The family asks which item was responsible.'
      ],options:['The change points toward the tape','The change points toward the dressing','This change cannot separate the two'],answer:changed ? 0 : 2,
      why:changed ? 'The tape changed while the dressing stayed fixed. That supports checking the tape, though improvement over time is still possible.' : 'Both items changed together. Improvement fits either item, and could also have happened with time.'
    };
  },
  6(c) {
    const stale = c.flip();
    return {
      title:'The patient who waited downstairs',phase:'After',question:'Which step first sent the team to the wrong floor?',
      clues:[
        'A stretcher waited downstairs while the transfer team searched upstairs.',
        'The team followed the floor printed on its call slip exactly.',
        stale ? 'Dispatch entered the right floor. The printer pulled the location from an older booking.' : 'The slip reproduced dispatch’s entry exactly. Dispatch had copied the location from an older booking.'
      ],options:['The dispatch entry','The printed slip','The team reading the slip'],answer:stale ? 1 : 0,
      why:stale ? 'The floor was correct at dispatch and wrong on paper. Fixing how the slip obtains its location tackles the first failure.' : 'The old floor entered the chain when dispatch copied it. The printout and the transfer team faithfully passed it along.'
    };
  },
  7(c) {
    const again = c.flip();
    return {
      title:'The swollen hand',phase:'During',question:again ? 'Which link explains why swelling can feed itself?' : 'What does the side drain change in this model?',
      clues:[
        'The specialist shows the family a hand model inside a rigid shell.',
        'Swelling raises pressure. Pressure can squeeze the veins carrying fluid away.',
        again ? 'When less fluid leaves, more stays in the hand.' : 'In the second model a side drain stays open, carrying the extra fluid away.'
      ],options:again ? ['Less leaves, so pressure can rise again','Pressure squeezes veins, so extra fluid escapes','The shell grows when the hand swells'] : ['The open drain breaks the build-up','The open drain increases the build-up','The shell itself produces more fluid'],answer:0,
      why:again ? 'Retained fluid increases swelling, which can squeeze the exit further. The consequence returns to amplify the original change.' : 'Pressure can still squeeze the veins, but the extra fluid can now leave by another route. That interrupts the reinforcing loop in this model.'
    };
  },
  8(c) {
    const [a] = c.p;
    const lift = c.flip();
    const offset=c.int(2,5);
    const door=c.int(20,25);
    const normal=door+(lift ? 1 : -1);
    return {
      title:'The last recorded words',phase:'After',question:`What can you tell ${a}’s family about the timing?`,
      clues:[
        `The lift camera shows ${a} entering at 11:${door} on the ward clock.`,
        `A recorder marked the instant they spoke at 11:${normal+offset}. Its clock ran ${offset} minutes fast.`,
        'You can confirm the recorder stayed with the patient.'
      ],options:['The words came before lift entry','The words came after lift entry','Both records show the same instant'],answer:lift ? 1 : 0,
      why:`Correcting the fast recorder places the words at 11:${normal}, one minute ${lift ? 'after' : 'before'} lift entry. Reading both display times literally misses the clock difference.`
    };
  },
  9(c) {
    const [a,b,d] = c.p;
    const independent=c.flip();
    return {
      title:'Who actually saw the fall?',phase:'After',question:'How many independent eyewitnesses support the review?',
      clues:[
        `${a} describes seeing the fall. ${b} gives the same account.`,
        `${b} ${independent ? 'also saw it from a doorway' : `was elsewhere and heard it from ${a}`}.`,
        `${d} read ${b}’s note aloud at handover but never saw the fall.`
      ],options:['One','Two','Three'],answer:independent ? 1 : 0,
      why:independent ? `${a} and ${b} each saw it. ${d} adds a retelling of an existing source.` : `All three reports trace to ${a}. Repetition never gave ${b} or ${d} a separate view.`
    };
  },
  10(c) {
    const [a,b] = c.p;
    const high=c.flip();
    const falseFlagsB = high ? 12 : 2;
    return {
      title:'Two flagged results',phase:'During',question:'Whose flagged result has the higher injury probability?',
      clues:[
        `Both screens flashed. Among 40 earlier arrivals like ${a}, 8 had injuries. Among 40 like ${b}, 4 did.`,
        'Every injured person was flagged in both groups.',
        `The screen also flagged 8 uninjured people in the first group and ${falseFlagsB} in the second.`
      ],options:[a,b,'The chances are equal'],answer:high ? 0 : 1,
      why:`Among flags like ${a}’s, 8 of 16 came from injured people. For ${b}, the fraction is 4 of ${4+falseFlagsB}. The larger proportion belongs to ${high ? a : b}’s group.`
    };
  },
  11(c) {
    const [a,b] = c.p;
    const first=c.flip();
    const missing=first ? a : b;
    return {
      title:'Into the scan room',phase:'During',question:'Who can you say definitely did not go inside?',
      clues:[
        'Every patient entering the scan room passed the door reader. The reader worked throughout.',
        `The reader recorded ${first ? b : a} but has no entry for ${missing}.`,
        'Patients sometimes passed the reader and then turned back outside the room.'
      ],options:[a,b,'Neither can be excluded'],answer:first ? 0 : 1,
      why:`Entering would have left a reading. ${missing} has none. The other patient passed the reader, but might still have turned back.`
    };
  },
  12(c) {
    const stillness=c.flip();
    return {
      title:'Did the words get through?',phase:'During',question:'Which pattern fits every reply so far?',
      clues:[
        'The patient understood two speakers who faced them in a quiet bay.',
        `They ${stillness ? 'missed' : 'understood'} a speaker facing them in a noisy bay.`,
        'They missed a speaker facing away in the quiet bay.'
      ],options:['Only facing in quiet worked in these trials','Facing worked in quiet and noise','Quiet worked whichever way the speaker faced'],answer:stillness ? 0 : 1,
      why:stillness ? 'Neither facing alone nor quiet alone worked in the comparisons. Together they worked twice, making that pairing worth repeating.' : 'Facing worked in both settings. Quiet alone failed when the speaker turned away. Facing has wider support across the observations.'
    };
  },
  13(c) {
    const [a] = c.p;
    const where=c.flip();
    return {
      title:'A signature on the transfer',phase:'Before',question:where ? 'What follows about the signatures?' : 'What follows about the packet’s location?',
      clues:[
        'Only sealed packets go in the red pouch. Every sealed packet has two signatures.',
        'Packets can have two signatures while still waiting to be sealed.',
        where ? `${a}’s packet is in the red pouch.` : `${a}’s packet has two signatures.`
      ],options:where ? ['Both signatures are in place','A signature is definitely missing','The signature count is uncertain'] : ['Definitely in the red pouch','Definitely outside the red pouch','Either location is possible'],answer:where ? 0 : 2,
      why:where ? 'The red pouch implies a seal, and a seal implies two signatures.' : 'Two signatures are required for a seal but do not prove a seal or a place in the red pouch.'
    };
  },
  14(c) {
    const [a,b,d,e] = c.p;
    const color=c.pick(['amber','violet']);
    return {
      title:'Turn over two transfer cards',phase:'After',question:'Which two cards could disprove the handover rule?',
      clues:[
        `Each card has a colour on one side and a signature count on the other. ${color} requires two signatures.`,
        `${a} shows ${color}. ${b} shows grey.`,
        `${d} shows two signatures. ${e} shows one.`
      ],options:[a,b,d,e],answer:[0,3],
      why:`Turn ${a} to check for a missing signature, and ${e} to check for ${color}. Grey has no requirement. Two signatures already satisfy the rule in either colour.`
    };
  },
  15(c) {
    const [a,b,d,e] = c.p;
    const least=c.flip();
    return {
      title:'Two teams cannot decide the middle',phase:'Before',question:`Who definitely goes ${least ? 'first' : 'last'} through the scanner?`,
      clues:[
        `${a} goes ahead of ${b} and ${d}.`,
        `${e} goes after ${b}.`,
        `${d} must go before ${e}. The middle two can trade places.`
      ],options:[a,b,d,e],answer:least ? 0 : 3,
      why:`Both possible middle orders put ${a} before the other three and ${e} after them. You can settle the ${least ? 'first' : 'last'} slot without fixing the middle.`
    };
  },
  16(c) {
    const [a,b,d] = c.p;
    const ruleOut=c.flip();
    return {
      title:'The only family message',phase:'After',question:'Which statement about the message can you give the family?',
      clues:[
        `Exactly one person received it. Dispatch confirms it was either ${a} or ${b}.`,
        `${d} was named in an earlier plan, before dispatch sent it.`,
        ruleOut ? `${a}’s account shows no delivery that day. Its log is complete.` : `${a}’s phone was silent. It can receive a message silently.`
      ],options:[`It went to ${b}`,'Both recipients are still possible',`It went to ${d}`],answer:ruleOut ? 0 : 1,
      why:ruleOut ? `${a} is excluded by the complete log and ${d} by the final dispatch list. Only ${b} remains.` : `Silence does not exclude ${a}. Both names on the final dispatch list remain possible, while ${d} is excluded.`
    };
  },
  17(c) {
    const [a,b] = c.p;
    const trueA=c.flip();
    const gender = trueA ? 'driver' : 'passenger';
    return {
      title:'Two different wristbands',phase:'After',question:'Which note clashes with the verified records?',
      clues:[
        `${a} drove and ${b} was the only passenger. Both arrived wearing different wristband numbers.`,
        `The entrance photo clearly shows band 31 on the ${gender}.`,
        'The other band is 13. The photographer could read both numbers.'
      ],options:[`${a} wore 31`,`${b} wore 31`,'There were two band numbers'],answer:trueA ? 1 : 0,
      why:`Band 31 was on ${trueA ? a : b}, the ${gender}. Assigning 31 to the other patient contradicts the photo and the distinct wristbands.`
    };
  },
  18(c) {
    const [a,b,d,e] = c.p;
    const early=c.flip();
    return {
      title:'Where the chart correction stops',phase:'After',question:`Besides ${a}, who wrote the wrong address in their notes?`,
      clues:[
        `${a} recorded the patient’s address incorrectly. Each colleague copied the last person’s note unless they checked first.`,
        `${a} passed the note to ${b}, then ${b} to ${d}, then ${d} to ${e}.`,
        `Only ${early ? d : e} asked the patient and wrote the corrected address.`
      ],options:[b,d,e],answer:early ? [0] : [0,1],
      why:`${b} copied the error${early ? '' : ` and passed it to ${d}`}. ${early ? d : e} verified the address, ending the chain before entering another wrong address.`
    };
  },
  19(c) {
    const [a,b,d] = c.p;
    const other=c.flip();
    return {
      title:'A crew that can do both jobs',phase:'Before',question:'Which pairs can transport the patient? Pick every fit.',
      clues:[
        'One person must drive and a different person must interpret for the patient.',
        `${a} can do both jobs. ${b} can only drive.`,
        `${d} can only ${other ? 'interpret' : 'drive'}.`
      ],options:[`${a} + ${b}`,`${a} + ${d}`,`${b} + ${d}`],answer:other ? [0,1,2] : [0,1],
      why:other ? `${a} can fill either job beside a specialist. ${b} and ${d} together also cover one job each.` : `${a} must interpret while either colleague drives. Pairing ${b} with ${d} leaves two drivers and no interpreter.`
    };
  },
  20(c) {
    const [a,b] = c.p;
    const urgent=c.flip();
    const target=urgent ? a : b;
    const partner=urgent ? b : a;
    const limit=c.pick([2,3,4]);
    return {
      title:'One lift to theatre',phase:'During',question:'Which move gets both patients there on time?',
      clues:[
        `The lift takes one stretcher. Each trip takes ${limit} minutes each way, including the empty return.`,
        `${target} must arrive within ${limit+1} minutes. ${partner} must arrive within ${3*limit} minutes.`,
        `Both are ready now. A porter offers to wait two minutes for a second helper.`
      ],options:[`${a} now, then ${b}`,`${b} now, then ${a}`,'Wait for the helper'],answer:urgent ? 0 : 1,
      why:`Leaving now delivers ${target} at minute ${limit} and ${partner} at minute ${3*limit}. Reversing misses the first deadline. Waiting two minutes also misses it.`
    };
  },
  21(c) {
    const [a,b] = c.p;
    const moving = c.flip();
    return {
      title:'Who can repeat that message?',phase:'During',question:'Which check reuses the lesson from the interpreter’s call?',
      clues:[
        'Yesterday an interpreter repeated a message accurately, but the family on the far end heard a different name.',
        'You found the last link by asking each person what they actually heard.',
        moving ? `Today ${a} spoke to the ambulance crew, who briefed ${b}. The two end accounts disagree.` : `Today ${a} recorded a voice note, forwarded unchanged to ${b}. ${a} and ${b} heard different names.`
      ],options:moving ? ['Ask the crew what name reached them','Ask both end speakers to vote','Count how many heard the handover'] : ['Compare the recording with each account','Ask which account sounds more confident','Count who agreed at handover'],answer:0,
      why:moving ? 'The crew is the intermediate link. Its account separates a change before the crew from a change after it.' : 'The unchanged recording is the intermediate link. It can locate where the two accounts diverged.'
    };
  },
  22(c) {
    const [a,b,d] = c.p;
    const at=c.int(0,2);
    const sign=c.flip() ? 1 : -1;
    const lows=[c.int(45,57),c.int(67,76),c.int(90,102)];
    const highs=lows.map((base,i)=>base+sign*(i===at ? -1 : 1)*c.int(3,8));
    return {
      title:'A tracing that breaks ranks',phase:'During',question:'Whose pulse moved against the other two?',
      clues:[
        `${a} went from ${lows[0]} to ${highs[0]} beats a minute.`,
        `${b} went from ${lows[1]} to ${highs[1]}. ${d} went from ${lows[2]} to ${highs[2]}.`,
        'The team is comparing direction of change across this drill.'
      ],options:[a,b,d],answer:at,
      why:`${[a,b,d][at]}’s pulse ${sign>0 ? 'fell while both others rose' : 'rose while both others fell'}. The highest final pulse need not have moved in the unusual direction.`
    };
  },
  23(c) {
    const [a] = c.p;
    const cousinChosen = c.flip();
    const sharedLine = c.flip();
    const possible = cousinChosen === sharedLine;
    return {
      title:'Two promises at the bedside',phase:'After',question:'Can you give the family update as requested today?',
      clues:[
        '“Update my sister today. If my cousin is my support person, tell them together. Otherwise tell her alone.”',
        `${a}’s support card names ${cousinChosen ? 'the cousin' : 'a neighbour'}.`,
        sharedLine ? 'Today’s only phone reaches the sister and cousin together on speaker.' : 'Today’s only phone reaches the sister alone. The cousin cannot join.'
      ],options:['Yes, call the sister privately','No, the requests conflict with today’s setup','Yes, tell both on one call'],answer:possible ? (sharedLine ? 2 : 0) : 1,
      why:possible ? (sharedLine ? 'The cousin is the chosen support person. The shared call reaches both people together, as requested.' : 'The cousin was not picked. The private call reaches exactly the person the patient asked you to tell.') : (sharedLine ? 'The cousin was not picked, but would hear the only call. Ask the patient how they want to proceed.' : 'The cousin was picked, so the patient wants both together. The only phone reaches the sister alone. Ask the patient about another arrangement.')
    };
  },
  24(c) {
    const [a,b,d] = c.p;
    const swap=c.flip();
    const alt = swap ? b : d;
    const partial= swap ? d : b;
    return {
      title:'A mirror recovery',phase:'During',question:`Whose change runs opposite to ${a}’s on both measures?`,
      clues:[
        `${a} can now walk farther and reports less pain than yesterday.`,
        `${alt} stops sooner and reports more pain.`,
        `${partial} also stops sooner, but reports less pain.`
      ],options:[b,d,'Both patients'],answer:swap ? 0 : 1,
      why:`${alt} reverses both walking distance and pain. ${partial} reverses distance alone, which only partly mirrors ${a}.`
    };
  },
  25(c) {
    const [a,b] = c.p;
    const cross=c.flip();
    const diff=c.int(2,5);
    const startA=c.int(15,18), startB=c.int(10,13);
    const nowA=startA-diff;
    const nowB=startB-(cross ? diff+1 : diff-1);
    return {
      title:'A widening contact gap',phase:'After',question:'Which family gained more time with the bedside team?',
      clues:[
        `${a}’s family used to wait ${startA} minutes for a bedside update. Now they wait ${nowA}.`,
        `${b}’s family went from ${startB} minutes to ${nowB}.`,
        'Every minute saved from waiting becomes a minute with the team.'
      ],options:[a,b,'They gained equally'],answer:cross ? 1 : 0,
      why:`Compare the changes, then compare families. ${a} gained ${diff} minutes and ${b} gained ${startB-nowB}. The shorter final wait alone cannot show who gained more.`
    };
  },
  26(c) {
    const [a,b] = c.p;
    const first=c.flip();
    const inRoom=first ? a : b;
    const porter=first ? b : a;
    return {
      title:'A pilot’s read-back',phase:'During',question:'Whose read-back tells you what reached the far end?',
      clues:[
        'A pilot repeats a runway assignment so the controller can check what the pilot understood.',
        `You told ${porter}, the porter. They passed your words to ${inRoom}, the receiving nurse.`,
        'The porter heard room six. The patient is waiting in room nine.'
      ],options:[`Hear ${a} repeat the destination`,`Hear ${b} repeat the destination`,'Repeat it again yourself'],answer:first ? 0 : 1,
      why:`The receiving clinician, ${inRoom}, plays the pilot’s role. Hearing the messenger repeat it would check only an intermediate link.`
    };
  },
  27(c) {
    const certainty=c.flip();
    return {
      title:'Two lessons from the night shift',phase:'After',question:'Which reasoning mistake ties these events together?',
      clues:certainty ? [
        'A missing pain score was entered as zero, though nobody had asked the patient.',
        'An empty falls log was read as proof nobody fell, though the logger was offline.',
        'The review needs one rule to prevent both mistakes.'
      ] : [
        'A nurse recorded a pain score of zero. A copied note turned it into “never had pain.”',
        'A clear corridor at 9 became “clear all shift” in the handover.',
        'The review needs one rule to prevent both mistakes.'
      ],options:['Treating missing observations as negative findings','Extending one observation across time','Counting one event under two names'],answer:certainty ? 0 : 1,
      why:certainty ? 'Both records lacked an observation. A blank cannot supply the negative finding the review needs.' : 'Both notes expanded a finding from one moment to an entire period without observations from the rest of that period.'
    };
  },
  28(c) {
    const [a,b,d] = c.p;
    const broad=c.flip();
    return {
      title:'Which desk owns the transfer?',phase:'After',question:'Whose list holds every file the review requests?',
      clues:[
        `${a} holds bus-crash files. ${b} holds rail-crash files.`,
        `${d} holds copies of both lists. Use the narrowest complete collection.`,
        broad ? 'The family liaison wants the bus file and the linked rail transfer.' : 'The family liaison asks only for the two bus-crash files.'
      ],options:[a,b,d],answer:broad ? 2 : 0,
      why:broad ? `Bus and rail sit in separate collections, both included under ${d}. Neither individual desk covers both.` : `${a}’s list already includes both bus files. The higher-level list includes them too, but is broader than requested.`
    };
  },
  29(c) {
    const [a] = c.p;
    const west=c.flip();
    const near=c.flip();
    const col=west ? 'left' : 'right';
    const row=near ? 'near the door' : 'near the window';
    return {
      title:'Find the call bell',phase:'During',question:`Which bell can ${a} reach after the bed turns?`,
      clues:[
        'A bed is centred in a square bay. Its corner bells are labelled as seen from the door.',
        `Before the turn, ${a} can reach only the ${west ? 'right' : 'left'} corner ${near ? 'near the window' : 'near the door'}.`,
        'The bed turns half a circle around its centre. The bells stay on the walls.'
      ],options:[`Left, near door`,`Right, near door`,`Left, near window`,`Right, near window`],answer:(near ? 0 : 2)+(west ? 0 : 1),
      why:`Half a turn reverses both directions. The reachable hand moves to the ${col} corner ${row}. Flipping just one direction would be a reflection.`
    };
  },
  30(c) {
    const [a,b] = c.p;
    const earlier=c.flip();
    const start=c.int(20,25), thisTime=start+c.pick([2,3]);
    const other=thisTime+(earlier ? 1 : -1);
    return {
      title:'Two promises to call back',phase:'After',question:'Which family’s promised time comes first?',
      clues:[
        `${a}’s family expects a call ${thisTime-start} minutes after arrival at 18:${start}.`,
        `${b}’s family expects a call two minutes before transfer at 18:${other+2}.`,
        'Both families are ready now. The promises refer to the same ward clock.'
      ],options:[a,b,'Both times coincide'],answer:earlier ? 0 : 1,
      why:`${a}’s time is 18:${thisTime}. Working back from transfer gives 18:${other} for ${b}. That makes ${earlier ? a : b} first by a minute.`
    };
  }
};

// Both settings remain available at every tier. Experienced players encounter the
// more demanding setting more often without memorising a fixed tier-to-case rule.
export const bankA = Object.fromEntries(Object.keys(firstCases).map(id => [id, context => {
  const threshold = (context.level || 1) >= 3 ? 65 : 35;
  return (context.int(1,100) <= threshold ? bedside[id] : firstCases[id])(context);
}]));
