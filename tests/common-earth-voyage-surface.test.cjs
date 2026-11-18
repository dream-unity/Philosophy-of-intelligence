'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const gameDir = process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname, '../common-earth');
const runtime = vm.createContext({});
runtime.window = runtime;
for (const name of ['navigation', 'voyages', 'route-terrain']) {
  vm.runInContext(fs.readFileSync(path.join(gameDir, name+'.js'), 'utf8'), runtime, { filename: name+'.js' });
}
const navigation = runtime.EarthNavigation;
const voyages = runtime.EarthVoyages;
function city(query) {
  const point = navigation.search(query)[0];
  assert.ok(point && !point.water, query+' should resolve to a land settlement');
  return point;
}

test('two land ports face a Pacific crossing decision and a calendar handover', () => {
  const origin=city('Sydney Australia'), destination=city('Honolulu Hawaii');
  const plan=voyages.preview(origin, destination);
  assert.equal(plan.terrain.category, 'open-water');
  assert.ok(plan.terrain.waterShare > .9);
  assert.match(plan.terrainText, /Pacific Ocean/);
  assert.match(plan.note, /Schematic great-circle/);
  const trip=voyages.start(origin, destination).voyage;
  assert.ok(trip.itinerary.includes('openSea'));
  assert.ok(trip.itinerary.includes('dates'));
  assert.ok(!trip.itinerary.includes('inland'));
});

test('short Bass Strait crossing offers cargo, crew or timing choices while inland trip keeps land handover', () => {
  const trip=voyages.start(city('Melbourne VIC'), city('Hobart TAS')).voyage;
  assert.equal(trip.legs, 2);
  assert.equal(trip.itinerary[0], 'transfer');
  const options=voyages.choices(trip);
  assert.ok(options.some(o => o.available && o.effects.supplies===-1 && o.effects.readiness===1));
  assert.ok(voyages.choices({...trip, supplies:0}).some(o => o.available));
  const inland=voyages.preview(city('Canberra ACT'),city('Albury NSW'));
  assert.equal(inland.terrain.category,'primarily-land');
  assert.deepEqual([...voyages.start(inland.origin,inland.target).voyage.itinerary],['depot','exchangeEnd']);
});

test('saved original voyage resumes its itinerary and completes with a valid report under the new rules', () => {
  const first=voyages.start(city('Sydney Australia'),city('Honolulu Hawaii')).voyage;
  first.itinerary=['highland','dates','distance','exchangeEnd'];
  assert.ok(voyages.valid(first));
  const before=voyages.step(first,voyages.choices(first)[0].id);
  const resumed=JSON.parse(JSON.stringify(before.voyage));
  assert.deepEqual(resumed.itinerary,[...first.itinerary]);
  assert.equal(voyages.scene(resumed).title,'Two dates on one manifest');
  let voyage=resumed;
  while(voyage.leg<voyage.legs) {
    const option=voyages.choices(voyage).find(choice=>choice.available);
    const result=voyages.step(voyage,option.id);
    assert.ok(result.ok);
    if(result.complete)assert.ok(voyages.validReport(result.report));
    voyage=result.voyage;
  }
});
