// The first choice is a working hypothesis or a handover action. Both are
// reasonable when made. It determines which subsequent question the player faces.
export function challengeOwnHypothesis(c) {
  const [patient] = c.p;
  const doorway = c.flip();
  const shared = {
    title: doorway ? 'Silence in the doorway' : 'The missing words',
    phase: 'During'
  };
  const intro = doorway ? {
    question:'Which explanation will you test first?',
    clues:[
      `${patient} is talking to the team. Their wireless monitor goes silent at the doorway.`,
      'A drained battery would fail throughout the ward. A radio dead spot would affect only this doorway.'
    ],
    options:['The monitor battery ran flat.', 'The doorway blocked the signal.']
  } : {
    question:'Which explanation will you test first?',
    clues:[
      `${patient} missed a question spoken by the ward door.`,
      'One idea is that the voice was too quiet. Another is that the patient could hear it but couldn’t understand the language.'
    ],
    options:['The voice was too quiet.', 'The language was unfamiliar.']
  };
  const follow = intro.options.map((belief,i) => doorway ? {
    question:'Which result would make you reconsider your call?',
    clues:[
      `Your working explanation: ${belief}`,
      'The team checks the same monitor both inside and outside the doorway.',
      'They can also compare it with a freshly charged monitor in the same spot.'
    ],
    options:['Both monitors work elsewhere and fail only in the doorway.', 'Only the old monitor fails, wherever it goes.', 'A second person heard the same silence.'],
    answer:i===0?0:1,
    why:i===0?'The original monitor works elsewhere on the same battery, and a charged unit fails at the doorway. A flat battery cannot explain that pairing.':'A charged unit works in the doorway while the old monitor fails everywhere. The fault follows the monitor as it moves.'
  } : {
    question:'Which finding most challenges your explanation?',
    clues:[
      `Your working explanation: ${belief}`,
      'The patient can answer by pointing to pictures.',
      'You can change the volume or use the patient’s familiar language while keeping the other condition fixed.'
    ],
    options:['At the same volume, only the familiar language gets a correct reply.', 'In the original language, a louder voice gets a correct reply.', 'The patient misses the original question a second time.'],
    answer:i===0?0:1,
    why:i===0?'Understanding returns when the language changes at the same volume. Quiet alone cannot account for the difference.':'Understanding returns when volume changes while language stays fixed. That challenges the idea that the language was unfamiliar.'
  });
  return {...shared, ...follow[0], intro, follow};
}

export function reviewOwnHandover(c) {
  const [p, q] = c.p;
  const room = c.pick(['the quiet room', 'Bay Two', 'the side room']);
  const common={title:'The handover you made',phase:'After'};
  const intro={
    question:'How will you pass on the new room?',
    clues:[
      `${p}’s family meeting has moved to ${room}.`,
      `${q} is the assigned interpreter. You can message them directly or update the shared booking.`,
      'Both channels are open. You have time for one message before the call.'
    ],
    options:[`Message ${q} directly.`,'Update the shared booking.']
  };
  const follow=[
    {
      question:'What would catch this miss next time?',
      clues:[
        `You messaged ${q}. They replied with the correct room.`,
        `A replacement came instead and went to the old room.`,
        'Replacements see the booking record. They cannot see another interpreter’s messages.'
      ],
      options:['Put the new room in the booking as well.', 'Ask the original interpreter to repeat the room.', 'Send the family another room reminder.'],
      answer:0,why:'The first interpreter already understood. The room change never reached the record that the replacement used.'
    },
    {
      question:'What would catch this miss next time?',
      clues:[
        `You put ${room} in the booking record.`,
        `${q} had already printed the old booking and went there.`,
        'The interpreter carries a working phone. A paper copy cannot receive changes.'
      ],
      options:['Put the new room in the booking a second time.', 'Ask the assigned interpreter to confirm the change by phone.', 'Ask the family to confirm their room again.'],
      answer:1,why:'The record already had the new room. A direct confirmation reaches the interpreter who is carrying the old paper copy.'
    }
  ];
  return {...common,...follow[0],intro,follow};
}
