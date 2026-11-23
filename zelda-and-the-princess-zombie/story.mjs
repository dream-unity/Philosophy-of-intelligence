// The western bell gallery, the keeper's notes and Xero's final gestures share one clock with the journey.
import { fieldPassable, fieldTick, pealPhase, stable, kiln } from './story-field.mjs';
import { stillTheColumn } from './procession.mjs';
import { terrainHeight } from './geography.mjs';
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (t) => ((t = clamp(t)), t * t * (3 - 2 * t));
const near = (p, x, z) => Math.hypot(p.x - x, p.z - z);
const between = (v, a, b) => v >= a && v <= b;
const mix = (a, b, t) => a + (b - a) * t;
const away = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export const storyFates = {
  bound: {
    duration: 8.5,
    title: 'The borrowed hand',
    text: 'Your hand lifts her lantern for the next traveller. He takes the road towards you. When you open your mouth to warn him, you hear her welcome come out.',
  },
  feast: {
    duration: 5.9,
    title: 'The guest of honour',
    text: 'The blue knot catches between her teeth. Xero folds your arm against the table. Your pulse stops. She gathers the slack cord in one hand and rings again.',
  },
  saved: {
    duration: 10.6,
    title: 'The fourth dawn',
    text: 'The hart vanishes into the early light. Xero leaves the bell rope on the stones. Together you knot the torn blue ribbon round the hilt and walk home.',
  },
};
export const banquetText = (ready) =>
  'The stag is still alive. At each breath one hoof moves beneath the tablecloth. Xero wipes her fingers on the cloth, winds the loose end of the cord around her wrist and looks up at you. “You kept the ribbon.”' +
  (ready ? ' There is a cold patch on your glove where the silver stopper has leaked.' : '');

const journalEntries = {
  memory: [
    'Blue thread',
    'You and Xero used to play across the orchard: two knocks and a third, and whichever of you was lost would answer. She tied the blue cord to your hilt the winter the footbridge washed away.',
  ],
  witch: [
    'The traveller with the lantern',
    'The lantern-bearer offered a road to the keep, a drink to bear my grief, or leave to go on alone. I have only her word for what the bottle holds.',
  ],
  guided: [
    'The north road',
    'In my bag: a red ceramic phial, a twist of willow and a hollow bronze bottle. Her map marks the northern fork, Briar Hollow and the sluice.',
  ],
  wander: [
    'The scent trail',
    'The lantern moves aside. Beyond the clearing, wolves call to each other across the path.',
  ],
  satchel: [
    'Pale ink',
    'Between the dark roads a thin line climbs to the Moonwell. A silver vial sits in a mould cut to the shape of a hand.',
  ],
  spring: [
    'The blackened reed',
    'A drop falls from the vial. The reed uncurls from the tip down; green returns along the stem.',
  ],
  fork: [
    'The open shackle',
    'Xero’s blue ribbon is caught on the open iron at the milepost. It has the little second knot she tied on your sword.',
  ],
  ridge: [
    'The western host',
    'Across the western valley a dark rank moves, then another. From high ground you can follow the lines along the road to Castle Xero.',
  ],
  procession: [
    'The procession',
    'The dead walk shoulder to shoulder. From the edge of the road I can see the seams in their worn coats.',
  ],
  looseWalker: [
    'A walker off the road',
    'I saw one of the dead away from the main column. I marked the spot on my sketch.',
  ],
  guestsAtTable: [
    'A place at the table',
    'I saw a traveller from the road bend over the stag. The bell had called them to supper.',
  ],
  bowl: [
    'The wooden bowl',
    'One of the dead holds a wooden bowl against its ribs. It carries the bowl along the road to the keep.',
  ],
  register: [
    'The keeper’s register',
    '“Before first bell: two guards admitted with the patient in irons. Set one hand free for drinking. After first bell: two guards left west. Royal key still inside.” There is no signature on that line.',
  ],
  seal: [
    'Two signatures',
    'On the back of the order there is wax in the shape of a key. In the wax are three tiny cuts, exactly like the marks Xero left in our orchard bark.',
  ],
  gallery: [
    'The listening gallery',
    'Three cords link the dining hall to the western shutters. One still trembles after the tower’s voice has died.',
  ],
  galleryOpen: [
    'A current in the rope',
    'With the shutters raised, the loose cord twitches towards the hall. An iron shoe scrapes tile inside. Out in the valley the host hangs on each note.',
  ],
  banquet: [
    'An invitation',
    'The cord is looped around the princess’s own wrist. The stag beneath her hands is breathing. I had thought someone else was ringing.',
  ],
  control: [
    'A borrowed gesture',
    'The witch lifts her hand. Your own fingers close around the lantern handle.',
  ],
  expected: [
    'The raised lantern',
    'Her lantern rose before the first note came. I watched its light begin to climb the bark.',
  ],
  unbidden: ['The loose stone', 'This time the stone sounded first. Only then did the lantern swing around.'],
  smoke: [
    'Woodsmoke',
    'Inside the smoke, I heard the wolf cast back across its own tracks. The ash drifted sideways through my sleeves.',
  ],
  roof: [
    'Roof slates',
    'I slipped under the slates as the shadow came over. The beating of the wings continued past the eaves.',
  ],
  birdsWolf: [
    'The missing trill',
    'The low branch went quiet before the wolf reached it. One sharp warning came from the bird nearest the roots.',
  ],
  birdsBell: [
    'The whole branch',
    'At the peal the entire branch emptied together. After a moment the birds began coming back.',
  ],
  relaySilent: [
    'A missed peal',
    'I heard the line pull against the brake. This time the bronze gave no note.',
  ],
  relayWitness: [
    'The rear keeps walking',
    'At the missing note the leaders checked their step. Farther down the road shoulders were still moving.',
  ],
  doorKnock: [
    'The orchard knock',
    'Two close knocks, then a third. Inside the locked door a hand tapped back. A key turned.',
  ],
  recognition: [
    'Three taps on oak',
    'The fingers that were pulling the rope tapped the cloth three times. For a breath I saw Xero look straight at the knot on my hilt.',
  ],
  pony: [
    'The loose halter',
    'I slipped the pin. The pack pony found the opening and edged out of the pen of its own accord.',
  ],
};
const revisits = {
  seal: 'register',
  banquet: 'ridge',
  unbidden: 'expected',
  birdsBell: 'birdsWolf',
  birdsWolf: 'birdsBell',
  relayWitness: 'relaySilent',
  recognition: 'memory',
};
function remember(w, id) {
  const entry = journalEntries[id];
  if (!entry) return false;
  const journal = (w.journal ??= []);
  if (journal.some((e) => e.id === id)) return false;
  const [title, text] = entry;
  const previous = revisits[id];
  journal.push({
    id,
    title,
    text,
    at: w.elapsed,
    ...(previous && journal.some((e) => e.id === previous) ? { revises: previous } : {}),
  });
  return true;
}
function signal(w, type, text, x, z) {
  w.events.push({ type, text, x, z });
}
function notice(w, text, seconds = 4.8) {
  w.notice = text;
  w.noticeUntil = w.elapsed + seconds;
}
function watches(p, x, z, reach, arc = 0.68) {
  const dx = x - p.x,
    dz = z - p.z,
    d = Math.hypot(dx, dz);
  return (
    d < reach &&
    Math.abs(p.pitch || 0) < 0.53 &&
    (d < 0.5 || (Math.sin(p.yaw) * dx + Math.cos(p.yaw) * dz) / d > arc)
  );
}
export function allowCastlePeal(w) {
  if (!w.relayBraced) return true;
  w.relayBraced = false;
  w.silentPealAt = w.elapsed;
  stillTheColumn(w, 5);
  signal(w, 'relay', 'slip', 10.2, 1460.15);
  if (near(w.player, 10.2, 1460.15) < 14) remember(w, 'relaySilent');
  return false;
}
export function knockAtTable(w) {
  w.watchedTable = true;
  w.tableKnockAt = w.elapsed;
  signal(w, 'knock', 'orchard', w.player.x, w.player.z);
  w.tableReplyAt = w.elapsed + 1.25;
  notice(w, 'Two close knocks. Then the third. Her fingers stop moving over the cloth.', 3);
}
function hold(w, title, text) {
  w.dialogue = { kind: 'chronicle', speaker: title, text, choices: [] };
}
export function storyBeat(w, key) {
  if (remember(w, key)) {
    if (key === 'spring') {
      w.reedAt = w.elapsed;
      signal(w, 'reed', 'open', -155, 850);
    }
    if (key === 'wander') w.witchAsideAt = w.elapsed;
  }
}
export function storyFloor(x, z) {
  if (between(x, 8.6, 22.2) && between(z, 1457, 1463.8)) return 10.25;
  if (between(x, 16.05, 20.15) && between(z, 1441, 1457)) return (10.25 * (z - 1441)) / 16;
  return null;
}
export function storyPassable(x, z, w, fromX = x, fromZ = z) {
  if (!fieldPassable(w, x, z)) return false;
  if (between(x, 27.29, 34.14)) {
    const screenZ = 1519.82 - Math.max(0, 29.52 - x, x - 31.91) * 0.36;
    if (Math.abs(z - screenZ) < 0.29) return false;
  }
  if (z < 1438 || z > 1476 || x < 7 || x > 46) return true;
  if (between(x, 38.6, 41.4) && between(z, 1472.6, 1474.35)) return false;
  const fy = storyFloor(fromX, fromZ) ?? 0,
    ty = storyFloor(x, z) ?? 0;
  if (Math.abs(ty - fy) > 0.85) return false;
  if (between(z, 1441.6, 1456.96) && [16.05, 20.15].some((side) => Math.abs(x - side) < 0.17)) return false;
  if (between(x, 8.5, 22.3) && Math.abs(z - 1463.75) < 0.19) return false;
  if (between(z, 1457, 1463.82) && [8.68, 22.1].some((side) => Math.abs(x - side) < 0.18)) return false;
  if (between(x, 8.55, 22.18) && Math.abs(z - 1457.13) < 0.16 && (x < 16.22 || x > 19.98)) return false;
  if (between(x, 9.1, 10.08) && between(z, 1457.7, 1463)) return false;
  return true;
}
const furnishings = [
  { id: 'pebble', x: -3.7, z: 7.2, label: 'Drop a loose stone beside the kettle' },
  { id: 'kiln', x: kiln.x - 1.7, z: kiln.z - 2.7, label: 'Inspect the charcoal burner’s shelter' },
  { id: 'stable', x: stable.x, z: stable.z - 3.1, label: 'Slip the gate pin' },
  { id: 'door', x: 21.7, z: 1460.35, label: 'Knock on the keeper’s door' },
  { id: 'register', x: 40, z: 1472.6, label: 'Read the keeper’s register' },
  { id: 'gallery-mark', x: 18, z: 1441.5, label: 'Read the bellfounder’s stair-mark' },
  ...['low', 'mid', 'high'].map((tone, i) => ({
    id: 'lever-' + tone,
    tone,
    x: 10.2,
    z: 1458.15 + 2.0 * i,
    label: 'Brace the ' + ['deep', 'middle', 'high'][i] + ' relay',
  })),
].map((a) => ({ ...a, type: 'story', alive: true, reach: 2.8 }));
export function storyTarget(w) {
  const p = w.player;
  if (p.z > 1477 || (p.z > 15 && p.z < kiln.z - 5) || (p.z > kiln.z + 5 && p.z < 1436)) return null;
  let best = null,
    range = 2.85;
  for (const a of furnishings) {
    if (
      (a.id === 'stable' && w.ponyLooseAt != null) ||
      (a.id === 'door' && (w.keepersDoorAt != null || (storyFloor(p.x, p.z) ?? 0) > 2)) ||
      (a.id === 'pebble' && (!w.actors[0]?.alive || !w.greeted))
    )
      continue;
    if (a.tone && (storyFloor(p.x, p.z) ?? 0) < 9) continue;
    const dx = a.x - p.x,
      dz = a.z - p.z,
      d = Math.hypot(dx, dz);
    if (
      d > range ||
      (d > 0.48 && (Math.sin(p.yaw) * dx + Math.cos(p.yaw) * dz) / d < (a.id === 'pebble' ? 0.84 : 0.62))
    )
      continue;
    best = a;
    range = d;
  }
  if (best?.tone === 'mid' && w.galleryOpenedAt != null)
    return { ...best, label: w.relayBraced ? 'Release the brake' : 'Set the brake for one peal' };
  return best;
}
export function storyInteract(w, a) {
  if (a?.type !== 'story') return false;
  if (a.id === 'pebble') {
    if (w.pebbleAt != null && w.elapsed - w.pebbleAt < 1) return true;
    w.pebbleAt = w.elapsed;
    signal(w, 'pebble', 'fall', a.x, a.z);
    notice(w, 'The stone strikes the old copper with a bright, single note.', 2.3);
  } else if (a.id === 'kiln') {
    notice(
      w,
      'Black fleeces hang under the roof. Across the opening a thread of white ash shows which way the wind is running.',
      5
    );
  } else if (a.id === 'stable') {
    if (w.ponyLooseAt == null) {
      w.ponyLooseAt = w.elapsed;
      signal(w, 'latch', 'lift', a.x, a.z);
      notice(w, 'A brass pin comes free. The pony puts its nose against the gate.', 4);
    }
  } else if (a.id === 'door') {
    hold(
      w,
      'The keeper’s door',
      'Through the boards comes the scrape of a stool. A child has cut an orchard tree into the oak. Three notches mark its trunk.'
    );
    w.dialogue.kind = 'knock-door';
    w.dialogue.choices = [
      { id: 1, label: 'Knock twice, wait, then once' },
      { id: 2, label: 'Knock once' },
      { id: 3, label: 'Leave the door' },
    ];
  } else if (a.id === 'register') {
    remember(w, 'register');
    signal(w, 'shackle', 'register', a.x, a.z);
    hold(w, 'The keeper’s register', journalEntries.register[1]);
    w.dialogue.kind = 'register';
    w.dialogue.choices = [
      { id: 1, label: 'Turn the page to the wax seal' },
      { id: 2, label: 'Close the register' },
    ];
  } else if (a.id === 'gallery-mark') {
    remember(w, 'gallery');
    hold(
      w,
      'The bellfounder’s stair',
      'A line drawing shows the filled mouth of each of the three bells above a wooden shutter. Beneath it someone has scratched: “When the keep goes quiet, brace the cord that keeps moving.” The carved steps climb towards the western valley.'
    );
  } else if (a.tone) {
    w.relayTest = { tone: a.tone, at: w.elapsed };
    if (w.galleryOpenedAt != null && a.tone === 'mid') {
      w.relayBraced = !w.relayBraced;
      signal(w, 'relay', w.relayBraced ? 'brace' : 'slip', a.x, a.z);
      notice(
        w,
        w.relayBraced
          ? 'The brake bites. A tooth of the ratchet will let it go after one pull.'
          : 'The line runs free again.',
        5
      );
    } else if (w.galleryOpenedAt != null)
      notice(
        w,
        'Through the open shutters you can see the road below. The cord tugs towards the dining hall.'
      );
    else if (a.tone === 'mid') {
      w.galleryOpenedAt = w.elapsed;
      w.hostListeningUntil = Math.max(w.hostListeningUntil || 0, w.elapsed + 4.8);
      remember(w, 'galleryOpen');
      signal(w, 'gallery', 'free', a.x, a.z);
      notice(
        w,
        'The shutters lift. Beyond the drum a second loop disappears through the hall wall. A little iron brake fits over its teeth.',
        7
      );
    } else {
      signal(w, 'gallery', 'wrong', a.x, a.z);
      notice(w, 'The wheel rests in your hand. Beside it another cord still trembles.');
    }
  }
  return true;
}
export function storyAct(w, action) {
  if (
    w.sequence?.id === 'bound' &&
    ['interact', 'strike', 'thrust', 'guard', 'potion', 'resist'].includes(action)
  ) {
    const q = w.sequence;
    if (!q.resisted) {
      q.resisted = true;
      q.resistAt = q.time;
      signal(w, 'compel', 'resist', w.player.x, w.player.z);
    }
    return true;
  }
  if (w.dialogue || w.sequence || w.ending || w.mapOpen) return false;
  const a = (action === 'thrust' || action === 'strike') && storyTarget(w);
  return a?.tone ? storyInteract(w, a) : false;
}
export function storyChoose(w, n) {
  if (w.dialogue?.kind === 'knock-door' && [1, 2, 3].includes(n)) {
    w.dialogue = null;
    if (n === 3) return true;
    signal(w, 'knock', n === 1 ? 'orchard' : 'single', 21.7, 1460.35);
    if (n === 1) {
      w.keepersDoorAt = w.elapsed;
      w.replyAt = w.elapsed + 1.25;
    } else notice(w, 'Only your own knuckle sounds. Behind the boards the stool stays still.', 3);
    return true;
  }
  if (w.dialogue?.kind !== 'register' || ![1, 2].includes(n)) return false;
  if (n === 1) {
    remember(w, 'seal');
    hold(w, 'Inside the back cover', journalEntries.seal[1]);
  } else w.dialogue = null;
  return true;
}
export function storyLocation(w) {
  return (storyFloor(w.player.x, w.player.z) ?? 0) > 2 ? 'The Bellfounder’s Gallery' : null;
}

const mealBeats = [
  { t: 0, kind: 'breath' },
  { t: 2.25, kind: 'chew' },
  { t: 4.9, kind: 'hoof' },
];
export function storyTick(w, dt, marcherAt) {
  remember(w, 'memory');
  for (const key of ['fork', 'ridge', 'procession', 'bowl'])
    if (w.milestones[key] && remember(w, key) && key === 'fork') signal(w, 'shackle', 'milepost', 29, 220);
  if (w.route === 'guided' || w.route === 'wander') storyBeat(w, w.route);
  if (w.hasMap) storyBeat(w, 'satchel');
  if (w.antidote) storyBeat(w, 'spring');
  const witch = w.actors.find((a) => a.type === 'witch' && a.alive);
  if (w.sequence || w.ending) return;
  const p = w.player;
  fieldTick(
    w,
    dt,
    (id) => remember(w, id),
    (name, kind, x, z) => signal(w, name, kind, x, z)
  );
  if (witch && near(p, witch.x, witch.z) < 27) {
    const phase = pealPhase(w.elapsed);
    if (phase >= 35.7 && phase < 36.45) {
      w.witchListenUntil = w.elapsed + 0.9;
      w.witchListenYaw = 0;
      if (watches(p, witch.x, witch.z, 13)) remember(w, 'expected');
    } else if (w.pebbleAt != null && w.elapsed - w.pebbleAt >= 0.48 && w.elapsed - w.pebbleAt < 1.35) {
      w.witchListenUntil = w.elapsed + 0.48;
      w.witchListenYaw = Math.atan2(-3.7 - witch.x, 7.2 - witch.z);
      if (watches(p, witch.x, witch.z, 13)) remember(w, 'unbidden');
    }
  }
  if (w.ponyLooseAt != null && w.elapsed - w.ponyLooseAt > 2.7 && !w.ponyPastGate) {
    w.ponyPastGate = true;
    signal(w, 'latch', 'hoof', stable.x, stable.z - 3.6);
    if (watches(p, stable.x, stable.z - 4, 17, 0.35)) remember(w, 'pony');
  }
  if (w.replyAt != null && w.elapsed >= w.replyAt) {
    delete w.replyAt;
    signal(w, 'knock', 'reply', 21.7, 1460.35);
    if (near(p, 21.7, 1460.35) < 9) {
      notice(
        w,
        'Two knocks. A pause. A third. The little panel opens and a linen square appears: a tree with three crooked branches.',
        5
      );
      remember(w, 'doorKnock');
    }
  }
  if (w.tableReplyAt != null && w.elapsed >= w.tableReplyAt) {
    delete w.tableReplyAt;
    signal(w, 'knock', 'reply', 30, 1516);
    w.recognisedAt = w.elapsed;
    if (watches(p, 30, 1516, 9, 0.42)) {
      remember(w, 'recognition');
      notice(w, 'Her fingertips answer the knock on the oak. For a breath the rope hangs slack.', 4);
    }
  }
  if (
    marcherAt &&
    w.silentPealAt != null &&
    w.elapsed - w.silentPealAt > 0.35 &&
    w.elapsed - w.silentPealAt < 1.8 &&
    storyLocation(w) &&
    w.galleryOpenedAt != null &&
    Math.sin(p.yaw) < -0.25 &&
    !w.journal.some((e) => e.id === 'relayWitness')
  ) {
    const ranks = [marcherAt(w, 0), marcherAt(w, 48 * 58)];
    const see = ranks.every((q) => {
      if (!watches(p, q.x, q.z, 550, 0.6)) return false;
      const eye = terrainHeight(p.x, p.z) + 10.25 + 1.64,
        head = terrainHeight(q.x, q.z) + 1.55,
        d = near(p, q.x, q.z);
      if (Math.abs((p.pitch || 0) - Math.atan2(head - eye, d)) > 0.41) return false;
      for (let m = 8; m < d - 1; m += 8) {
        const f = m / d;
        if (terrainHeight(mix(p.x, q.x, f), mix(p.z, q.z, f)) > mix(eye, head, f) - 0.25) return false;
      }
      return true;
    });
    if (see) remember(w, 'relayWitness');
  }
  if (witch && w.witchAsideAt != null) {
    const motion = smooth((w.elapsed - w.witchAsideAt) / 1.5);
    witch.x = witch.homeX + 2.7 * motion;
    witch.z = witch.homeZ + 0.85 * motion;
  }
  if (w.ropeFallen) return;
  if (storyLocation(w) && remember(w, 'gallery'))
    notice(w, 'At this height you can see over the western wall. Three cords hang under the shutters.');
  if (near(p, 31.3, 1517) > 64) return;
  const period = 7.2;
  for (const beat of mealBeats) {
    const slot = Math.floor((w.elapsed - beat.t) / period);
    if (slot !== Math.floor((w.elapsed - dt - beat.t) / period)) signal(w, 'meal', beat.kind, 31.3, 1517);
  }
}
export function storyHandPose(w) {
  const q = w.sequence,
    t = q?.progress || 0;
  if (q?.id === 'feast')
    return {
      physical: true,
      reach: smooth(t / 0.26) * (1 - smooth((t - 0.63) / 0.28) * 0.6),
      clench: smooth((t - 0.36) / 0.16),
      ribbon: 1,
    };
  if (q?.id === 'saved')
    return {
      physical: true,
      reach: Math.max(Math.sin(Math.PI * clamp(t / 0.4)), smooth((t - 0.77) / 0.19)),
      clench: 1 - smooth((t - 0.18) / 0.15),
      ribbon: 1,
    };
  if (q?.id === 'bound')
    return {
      reach: smooth((t - 0.14) / 0.52),
      clench: clamp(
        smooth((t - 0.21) / 0.28) + (q.resisted ? Math.sin((q.time - q.resistAt) * 12) * 0.16 : 0)
      ),
      ribbon: 1,
    };
  return { reach: 0, clench: 0, ribbon: 1 };
}
function once(q, k, callback) {
  if (!q[k]) {
    q[k] = true;
    callback();
  }
}
export function stageStoryFate(w, dt, input = {}) {
  const q = w.sequence,
    p = w.player;
  if (!q) return;
  q.time += dt;
  w.elapsed += dt;
  q.duration = storyFates[q.id].duration;
  const t = (q.progress = clamp(q.time / q.duration)),
    sx = q.x,
    sz = q.z;
  const xero = w.actors.find((a) => a.type === 'princess'),
    trav = w.actors.find((a) => a.type === 'traveller');
  if (q.id === 'bound') {
    if (input.forward || input.strafe || input.turn) storyAct(w, 'resist');
    if (t > 0.12)
      once(q, 'command', () => {
        storyBeat(w, 'control');
        signal(w, 'compel', 'command', p.x, p.z);
        notice(w, 'Your fingers are uncurling. Try to pull your hand back.', 3);
      });
    if (t > 0.46)
      once(q, 'voice', () => {
        signal(w, 'compel', 'voice', p.x, p.z);
        notice(w, 'The next voice you hear is coming from your mouth.', 3);
      });
    const targetYaw = Math.atan2((trav?.x ?? -3) - sx, (trav?.z ?? -18) - sz);
    const turn = smooth((t - 0.3) / 0.56);
    if (!w.reducedMotion) {
      p.yaw = q.yaw + away(q.yaw, targetYaw) * turn;
      p.pitch = q.pitch * (1 - turn);
    }
    const walk = w.reducedMotion ? 0 : smooth((t - 0.68) / 0.32) * 1.65;
    p.x = sx + Math.sin(targetYaw) * walk;
    p.z = sz + Math.cos(targetYaw) * walk;
  } else if (xero) {
    const yaw = Math.atan2(xero.homeX - sx, xero.homeZ - sz);
    if (!w.reducedMotion) {
      p.yaw = q.yaw + away(q.yaw, yaw) * smooth(t / 0.24);
      p.pitch = q.pitch * (1 - smooth(t / 0.3));
    }
    if (q.id === 'feast') {
      const reach = smooth((t - 0.27) / 0.27),
        fall = w.reducedMotion ? 0 : smooth((t - 0.57) / 0.27);
      const contactYaw = w.reducedMotion ? q.yaw : yaw;
      xero.x = mix(xero.homeX, sx + Math.sin(contactYaw) * (0.75 - 0.34 * fall), reach);
      xero.z = mix(xero.homeZ, sz + Math.cos(contactYaw) * (0.75 - 0.34 * fall), reach);
      xero.heading = yaw + Math.PI;
      p.x = sx - Math.sin(yaw) * fall * 0.34;
      p.z = sz - Math.cos(yaw) * fall * 0.34;
      if (!w.reducedMotion) p.pitch -= fall * 0.58;
      if (t > 0.365)
        once(q, 'looseCuff', () => {
          w.tetherRelease = {
            at: w.elapsed,
            x: xero.x - 0.2 * Math.cos(p.yaw),
            height: 1.22,
            z: xero.z + 0.2 * Math.sin(p.yaw),
            cause: 'slip',
          };
          signal(w, 'shackle', 'slip', xero.x, xero.z);
        });
      if (t > 0.49)
        once(q, 'contact', () => {
          signal(w, 'hurt', 'bite', p.x, p.z);
          signal(w, 'meal', 'ribbon', xero.x, xero.z);
        });
    } else {
      if (t > 0.19)
        once(q, 'cure', () => {
          w.tetherRelease = {
            at: w.elapsed,
            x: xero.x - 0.2 * Math.cos(p.yaw),
            height: 1.32,
            z: xero.z + 0.2 * Math.sin(p.yaw),
            cause: 'release',
          };
          w.ropeFallen = true;
          w.dispersalAt = w.elapsed;
          xero.cured = true;
          signal(w, 'cure', 'silver', xero.x, xero.z);
        });
      if (t > 0.37)
        once(q, 'release', () => {
          signal(w, 'release', 'hart', 31.3, 1517);
          notice(w, 'She opens her fingers. The stag gathers its legs and climbs down.', 3);
        });
      const approach = smooth((t - 0.55) / 0.215),
        contactYaw = w.reducedMotion ? q.yaw : yaw;
      xero.x = mix(xero.homeX, sx + Math.sin(contactYaw) * 0.98, approach);
      xero.z = mix(xero.homeZ, sz + Math.cos(contactYaw) * 0.98, approach);
      if (!w.reducedMotion) p.pitch -= 0.14 * smooth((t - 0.64) / 0.23);
      if (t > 0.9)
        once(q, 'joined', () => {
          signal(w, 'touch', 'hand', xero.x, xero.z);
          notice(w, 'Her fingers meet yours beneath the blue ribbon.', 2.4);
        });
      if (t > 0.72)
        once(q, 'offer', () => {
          signal(w, 'recognition', 'blue-knot', xero.x, xero.z);
          notice(w, 'Two taps, then a third. Her hand lies open.', 3);
        });
    }
  }
  if (t >= 1) {
    if (q.id === 'feast') p.health = 0;
    w.ending = {
      id: q.id,
      title: storyFates[q.id].title,
      text:
        storyFates[q.id].text +
        (q.id === 'saved' && w.ponyPastGate
          ? ' Beyond the empty pen, your little pack pony is waiting. Xero takes the halter.'
          : ''),
    };
    w.sequence = null;
    w.dialogue = null;
    w.mapOpen = false;
    signal(w, 'ending', q.id, p.x, p.z);
  }
}
