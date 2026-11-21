'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const dir = process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname, '../common-earth');

function createStorage() {
  const map = new Map();
  return {
    get length() { return map.size; },
    key: i => [...map.keys()][i] ?? null,
    getItem: k => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k)
  };
}

function loadRuntime(files) {
  const events = new Map();
  const c = vm.createContext({
    TextEncoder,
    TextDecoder,
    Date,
    Math,
    JSON,
    Number,
    String,
    Array,
    Object,
    Set,
    Map,
    WeakMap,
    Promise,
    Error,
    RegExp,
    Uint32Array,
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  });
  c.window = c;
  c.globalThis = c;
  c.addEventListener = (name, cb) => {
    if (!events.has(name)) events.set(name, new Set());
    events.get(name).add(cb);
  };
  c.removeEventListener = (name, cb) => events.get(name)?.delete(cb);
  for (const file of files) {
    vm.runInContext(fs.readFileSync(path.join(dir, file + '.js'), 'utf8'), c, { filename: file + '.js' });
  }
  return c;
}

test('EarthSaves supports rename, remove, first-world protection, active fallback and storage cleanup', async () => {
  const c = loadRuntime(['world-storage', 'simulation', 'saves']);
  const store = createStorage();
  let seq = 0;
  const book = c.EarthSaves.open({
    storage: store,
    session: null,
    locks: null,
    idGenerator: () => 'custom-slot-' + (++seq)
  });

  // Cannot rename or delete the first world.
  assert.equal((await book.rename('original', 'Renamed First')).ok, false);
  assert.equal((await book.remove('original')).ok, false);

  // Create two custom worlds and verify sizeBytes is reported.
  const firstCreated = await book.create('Coastal Charter');
  assert.equal(firstCreated.ok, true);
  assert.equal(book.current().id, firstCreated.id);

  const secondCreated = await book.create('Highland Valley');
  assert.equal(secondCreated.ok, true);
  assert.equal(book.list().length, 3);
  assert.ok(book.list().every(item => Number.isFinite(item.sizeBytes)));

  // Rename preserves uniqueness when colliding with another slot, and ignores self.
  const collide = await book.rename(secondCreated.id, 'Coastal Charter');
  assert.equal(collide.ok, true);
  assert.equal(collide.name, 'Coastal Charter (2)');

  const sameCase = await book.rename(secondCreated.id, 'coastal charter (2)');
  assert.equal(sameCase.ok, true);
  assert.equal(sameCase.name, 'coastal charter (2)');

  const blank = await book.rename(secondCreated.id, '   ');
  assert.equal(blank.ok, false);

  // Removing the currently active world falls back cleanly to original and deletes keys.
  assert.equal(book.current().id, secondCreated.id);
  const removedActive = await book.remove(secondCreated.id);
  assert.equal(removedActive.ok, true);
  assert.equal(book.current().id, 'original');
  assert.equal(book.list().length, 2);
  assert.equal(store.getItem('common-earth.slots.v1.' + secondCreated.id), null);
  assert.equal(store.getItem('common-earth.playthrough.v1.' + secondCreated.id), null);

  // Removing an inactive world leaves current open and cleans up storage.
  const removedInactive = await book.remove(firstCreated.id);
  assert.equal(removedInactive.ok, true);
  assert.equal(book.list().length, 1);
  assert.equal(book.current().id, 'original');
  assert.equal(store.getItem('common-earth.slots.v1.' + firstCreated.id), null);
  assert.equal(store.getItem('common-earth.playthrough.v1.' + firstCreated.id), null);

  book.dispose();
});

test('EarthBorderConflict clamps fatigued blows and guarantees street/campaign fights never exceed valid() round limit', () => {
  const c = loadRuntime([
    'personas', 'careers', 'purses', 'autonomy', 'community-life', 'civic-initiatives',
    'regional-world', 'border-conflict', 'simulation'
  ]);
  const sim = c.CommonEarthSim.create({ storage: null });
  assert.equal(sim.found({ name: 'Harbour Watch', lat: -6.1622, lon: 39.1922 }).ok, true);
  const w = sim.state;
  const home = sim.active();
  const outpost = w.communityLife.outposts[0];
  assert.ok(outpost, 'founding creates neighbouring outpost');

  // Force an extreme high-fatigue, low-skill street fight with max energy (110).
  const guardProfile = c.EarthPersonas.list(outpost)[0];
  const guestProfile = w.communityLife.profile;
  outpost.communityLife.border = outpost.communityLife.border || { records: [], health: {}, lost: 0 };
  outpost.communityLife.border.service = {
    [guardProfile.identityKey]: { step: w.regionalWorld?.step || 0, experience: 0, fatigue: 100 }
  };
  outpost.communityLife.border.street = {
    from: home.id,
    phase: 'fight',
    round: 0,
    resisting: false,
    nextStrike: 0,
    guard: { id: guardProfile.id, key: guardProfile.identityKey, name: guardProfile.name, stamina: 10, skill: 5, resolve: 10, energy: 110 },
    visitor: { id: 'steward', key: guestProfile.identityKey, name: guestProfile.name, stamina: 100, skill: 100, resolve: 100, energy: 110 }
  };
  w.activeId = outpost.id;

  // Run streetContact rounds until fight ends; verify round never exceeds 12 and valid() stays true every step.
  for (let i = 0; i < 15; i++) {
    const watch = outpost.communityLife.border.street;
    if (!watch || watch.phase !== 'fight') break;
    watch.nextStrike = 0;
    const res = c.EarthBorderConflict.streetContact(
      w,
      outpost,
      { target: watch.guard.key, round: watch.round },
      { siteId: outpost.id, actor: 'steward', mode: 'walk', x: 1, y: 1, gx: 1, gy: 1 }
    );
    assert.equal(res.ok, true);
    assert.ok(watch.round <= 12, 'round must never exceed 12, got ' + watch.round);
    assert.equal(c.EarthBorderConflict.valid(outpost, w.week), true, 'border state must remain valid after round ' + watch.round);
  }
  assert.notEqual(outpost.communityLife.border.street.phase, 'fight', 'fight must resolve within 12 rounds');
  sim.destroy();
});

test('EarthMilitaryBase bumps militaryBase.version when peace() or detach() clears captured buildings and falls back to present members in pay()', () => {
  const c = loadRuntime([
    'personas', 'agency', 'careers', 'purses', 'autonomy', 'community-life', 'civic-initiatives',
    'regional-world', 'border-conflict', 'base-field', 'military-base', 'simulation'
  ]);
  const sim = c.CommonEarthSim.create({ storage: null });
  assert.equal(sim.found({ name: 'Stone Town', lat: -6.1622, lon: 39.1922 }).ok, true);
  const w = sim.state;
  const home = sim.active();
  const peer = w.communityLife.outposts[0];
  assert.ok(peer);

  // Set captured building on home by peer with no active missions; peace() must still bump version.
  home.militaryBase = {
    serial: 0,
    version: 3,
    units: [],
    tech: [],
    missions: [],
    log: [],
    autonomous: true,
    captures: [{ id: 'exchange', by: peer.id }]
  };
  c.EarthMilitaryBase.peace(w, home, peer);
  assert.equal(home.militaryBase.captures.length, 0);
  assert.equal(home.militaryBase.version, 4);

  // detach() must also bump version when captures from removed town are cleared.
  home.militaryBase.captures = [{ id: 'home-0', by: peer.id }];
  c.EarthMilitaryBase.detach(w, peer.id);
  assert.equal(home.militaryBase.captures.length, 0);
  assert.equal(home.militaryBase.version, 5);

  // When all founding residents are temporarily away, pay() falls back to another present member so funds are conserved.
  for (const r of home.residents) home.communityLife.away[r.id] = 'Away on errand';
  const sumPurses = () => c.EarthPersonas.list(home).reduce((sum, p) => sum + (c.EarthPurses.view(w, home, p.id)?.balance || 0), 0);
  const beforeTotal = sumPurses();
  home.food = 20;
  home.materials = 20;
  home.funds = 20;
  const enlist = c.EarthMilitaryBase.command(w, { site: home.id, generation: home.foundingRevision || 0, action: 'enlist', type: 'guard' });
  assert.equal(enlist.ok, true);
  assert.equal(sumPurses(), beforeTotal + 2, 'a present local contractor should receive the 2 funds procurement wage');

  sim.destroy();
});

test('street.js has no duplicate Town Centre banner in paintExchangeDetails and index.html contains all unique new DOM IDs', () => {
  const streetSource = fs.readFileSync(path.join(dir, 'street.js'), 'utf8');
  const detailsStart = streetSource.indexOf('function paintExchangeDetails(p)');
  const detailsEnd = streetSource.indexOf('function plazaOutline', detailsStart);
  const detailsBody = streetSource.slice(detailsStart, detailsEnd);
  assert.equal(detailsBody.includes('Town Centre'), false, 'paintExchangeDetails should not draw a duplicate Town Centre sign');

  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const expectedIds = [
    'venue-phase',
    'station-timer',
    'station-timer-bar',
    'tetris-best',
    'tetris-callout',
    'scene-people-filter',
    'journal-search',
    'journal-categories',
    'journal-count'
  ];
  for (const id of expectedIds) {
    assert.ok(html.includes(`id="${id}"`), `index.html must include id="${id}"`);
  }
  const deskSource = fs.readFileSync(path.join(dir, 'district-desk.js'), 'utf8');
  assert.ok(deskSource.includes("peopleSearch.id='scene-people-search'"), 'district-desk.js must mount scene-people-search');
  assert.ok(deskSource.includes("peopleCount.id='scene-people-count'"), 'district-desk.js must mount scene-people-count');

  // Verify zero duplicate IDs in index.html.
  const seen = new Set();
  for (const match of html.matchAll(/\bid="([^"]+)"/g)) {
    const id = match[1];
    assert.equal(seen.has(id), false, `Duplicate HTML id found: ${id}`);
    seen.add(id);
  }
});

test('EarthDayClock.read stays monotonic when elapsed already passed until, and EarthPursuits never assigns actor as own supplier', () => {
  const c = loadRuntime(['day-clock', 'agency', 'pursuits']);
  const pastUntilWorld = { dayClock: { origin: 1000, at: 5000, elapsed: 650000, rate: 30, until: 600000 } };
  const t0 = c.EarthDayClock.read(pastUntilWorld, 5000);
  const t1 = c.EarthDayClock.read(pastUntilWorld, 6000);
  assert.equal(t0.time, 650000, 'elapsed should not jump backward when past until');
  assert.equal(t1.time, 651000, 'elapsed should advance at 1x after until has already passed');

  // Single-resident community where the resident is the active actor: supplier must be null, never self.
  const soloSite = {
    id: 'solo',
    name: 'Solo Cove',
    materials: 10,
    food: 10,
    funds: 10,
    residents: [{ id: 'r1', name: 'Amina', role: 'Grower' }],
    agency: { actor: 'r1' },
    pursuits: { serial: 1, cart: null, ticket: { kind: 'food', maker: 'Amina', makerId: 'r1', started: 1000 } }
  };
  const view = c.EarthPursuits.view(soloSite, 2000);
  assert.equal(view.ticket.supplier, null, 'supplier must never be the active actor themselves');
});

test('EarthTimeMachine.clearSlot purges recorded checkpoints for deleted world slots', async () => {
  const c = loadRuntime(['day-clock', 'time-machine']);
  const tm = c.EarthTimeMachine.create();
  const fakeWorld = { week: 2, actionRevision: 1, sites: [{ id: 's1' }], dayClock: { origin: 5000, at: 5000, elapsed: 0, rate: 1 } };
  await tm.capture('slot-del', fakeWorld, 'origin', 'Opening moment');
  await tm.capture('slot-keep', fakeWorld, 'origin', 'Kept moment');
  assert.equal((await tm.list('slot-del', 5000)).length, 1);
  assert.equal((await tm.list('slot-keep', 5000)).length, 1);

  assert.equal(await tm.clearSlot('slot-del'), true);
  assert.equal((await tm.list('slot-del', 5000)).length, 0, 'cleared slot must have no remaining checkpoints');
  assert.equal((await tm.list('slot-keep', 5000)).length, 1, 'other slots must remain untouched');
});
