// The western bell gallery, the keeper's notes and Xero's final gestures share one clock with the journey.
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
    text: 'The blue knot catches between her teeth. Xero folds your arm against the table. Your pulse stops. From the far side of the oak doors comes the soft knock of a wooden bowl.',
  },
  saved: {
    duration: 10.6,
    title: 'The fourth dawn',
    text: 'The hart vanishes into the early light. Xero leaves the bell rope on the stones. Together you knot the torn blue ribbon round the hilt and walk home.',
  },
};
export const banquetText = (ready) =>
  'The stag is still alive. The three notes come from the cord around Xero’s wrist. Between mouthfuls she listens for the answer. She draws your old blue knot through her fingers and offers you her hand.' +
  (ready ? ' The silver vial warms against your palm.' : '');

const journalEntries = {
  memory: [
    'Blue thread',
    'You and Xero used to play across the orchard: two knocks and a third, and whichever of you was lost would answer. She tied the blue cord to your hilt the winter the footbridge washed away.',
  ],
  witch: [
    'The traveller with the lantern',
    'The witch offers a road to Xero, strength to let her go, or the woods. When she raises the green bottle, the moth on its cork folds its wings.',
  ],
  guided: [
    'The north road',
    'The witch marks a fork beyond Lanternwood, a troll in Briar Hollow, and a sluice below Castle Xero. Listen to the keep before crossing the water.',
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
  bowl: [
    'The wooden bowl',
    'One of the dead holds a wooden bowl against its ribs. It carries the bowl along the road to the keep.',
  ],
  register: [
    'The keeper’s register',
    'Two guards brought Xero in bound after the bites. The warder released one wrist to let her drink. At the first peal the guards ran for the west road. The inward-facing lock was turned with a royal key.',
  ],
  seal: [
    'Two signatures',
    'Beneath the keeper’s order the smaller signature belongs to Xero. The seal has the little three-point scratch she used to put in the orchard bark. She had a key to this place.',
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
    'The princess has called the host to her table. The stag beneath her hands still breathes.',
  ],
  control: [
    'A borrowed gesture',
    'The witch lifts her hand. Your own fingers close around the lantern handle.',
  ],
};
function remember(w, id) {
  const entry = journalEntries[id];
  if (!entry) return false;
  const journal = (w.journal ??= []);
  if (journal.some((e) => e.id === id)) return false;
  const [title, text] = entry;
  journal.push({ id, title, text, at: w.elapsed });
  return true;
}
function signal(w, type, text, x, z) {
  w.events.push({ type, text, x, z });
}
function notice(w, text, seconds = 4.8) {
  w.notice = text;
  w.noticeUntil = w.elapsed + seconds;
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
  if (p.z < 1436 || p.z > 1477) return null;
  let best = null,
    range = 2.85;
  for (const a of furnishings) {
    if (a.tone && (storyFloor(p.x, p.z) ?? 0) < 9) continue;
    const dx = a.x - p.x,
      dz = a.z - p.z,
      d = Math.hypot(dx, dz);
    if (d > range || (d > 0.48 && (Math.sin(p.yaw) * dx + Math.cos(p.yaw) * dz) / d < 0.62)) continue;
    best = a;
    range = d;
  }
  if (best?.tone === 'mid' && w.galleryOpenedAt == null)
    return { ...best, label: 'Brace the middle relay · its cord trembles' };
  return best;
}
export function storyInteract(w, a) {
  if (a?.type !== 'story') return false;
  if (a.id === 'register') {
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
    if (w.galleryOpenedAt != null)
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
        'The middle line catches. The shutters rise onto the host below. The rope is being worked from inside the dining hall.',
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
export function storyTick(w, dt) {
  remember(w, 'memory');
  if (w.greeted) storyBeat(w, 'witch');
  for (const key of ['fork', 'ridge', 'procession', 'bowl'])
    if (w.milestones[key] && remember(w, key) && key === 'fork') signal(w, 'shackle', 'milepost', 29, 220);
  if (w.route === 'guided' || w.route === 'wander') storyBeat(w, w.route);
  if (w.hasMap) storyBeat(w, 'satchel');
  if (w.antidote) storyBeat(w, 'spring');
  const witch = w.actors.find((a) => a.type === 'witch' && a.alive);
  if (witch && w.witchAsideAt != null) {
    const motion = smooth((w.elapsed - w.witchAsideAt) / 1.5);
    witch.x = witch.homeX + 2.7 * motion;
    witch.z = witch.homeZ + 0.85 * motion;
  }
  if (w.sequence || w.ending || w.ropeFallen) return;
  const p = w.player;
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
    w.ending = { id: q.id, title: storyFates[q.id].title, text: storyFates[q.id].text };
    w.sequence = null;
    w.dialogue = null;
    w.mapOpen = false;
    signal(w, 'ending', q.id, p.x, p.z);
  }
}
