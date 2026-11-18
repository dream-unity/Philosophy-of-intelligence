'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const game = process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname,'../common-earth');
const browser = vm.createContext({});
browser.window = browser;
for (const file of ['route-terrain','navigation','voyages']) {
  vm.runInContext(fs.readFileSync(path.join(game,file+'.js'),'utf8'),browser,{filename:file+'.js'});
}
const terrain = browser.EarthRouteTerrain;
const point = (lat,lon) => ({lat,lon});
const melbourne=point(-37.8136,144.9631),suva=point(-18.133,178.4417);
const sydney=point(-33.8688,151.2093),london=point(51.5074,-.1278),paris=point(48.8566,2.3522);

// Reference values were measured independently. Sample each geodesic every
// 1.3 km on the original 4096 × 2048 atlas classification, including lakes.
// The first number is water's fraction of the arc and the second is its longest
// continuous water interval in km. The compact classifier has coarser shores.
const cases=[
  ['Melbourne to Suva',melbourne,suva,.867,3377,'open-water','South Pacific Ocean'],
  ['Melbourne to Sydney',melbourne,sydney,0,0,'primarily-land',''],
  ['London to Paris',london,paris,.313,108,'mixed-crossing','English Channel'],
  ['Lisbon to Halifax',point(38.7223,-9.1393),point(44.6488,-63.5752),.986,4394,'open-water','North Atlantic Ocean'],
  ['mid-Atlantic',point(29,-42),point(53,-32),1,2791,'open-water','North Atlantic Ocean'],
  ['Prague to Vienna',point(50.0755,14.4378),point(48.2082,16.3738),0,0,'primarily-land',''],
  ['across the date line',point(0,175),point(0,-175),1,1112,'open-water',/Pacific Ocean/],
  ['North Pole to Svalbard',point(90,57),point(78.2232,15.6267),.934,1193,'open-water','Arctic Ocean'],
  ['South Pole to Vostok',point(-90,57),point(-78.4657,106.837),0,0,'primarily-land',''],
  ['between polar antipodes',point(90,0),point(-90,0),.665,9626,'mixed-crossing',/Pacific Ocean/],
  ['Suva to Apia across small islands',suva,point(-13.8507,-171.7514),.949,656,'open-water',/Pacific Ocean/]
];
for(const [name,a,b,share,longest,category,waterName] of cases){
  test(name+' samples the terrain along the arc',()=>{
    const r=terrain.describe(a,b);
    assert(r.schematic);assert.equal(r.category,category);
    if(waterName instanceof RegExp)assert.match(r.waterName,waterName);else assert.equal(r.waterName,waterName);
    assert(Math.abs(r.waterShare-share)<.035);
    assert(Math.abs(r.longestWaterKm-longest)<55);
    let t=0,wet=0;
    for(const s of r.segments){
      assert.equal(s.t0,t);assert(s.t1>t);t=s.t1;
      if(s.water)wet+=s.t1-s.t0;
    }
    assert.equal(t,1);assert(Math.abs(wet-r.waterShare)<1e-9);
    assert.deepEqual(terrain.describe({...a,water:true},{...b,water:false}),r);
  });
}
test('local coasts and inland lakes disclose shoreline uncertainty',()=>{
  const short=[[point(-38.2675,144.6604),point(-38.3393,144.7407)], [point(51.1295,1.308),point(50.9513,1.8587)]];
  for(const [a,b] of short){
    const r=terrain.describe(a,b);assert.equal(r.category,'coastal-or-local');assert(r.uncertain);
    assert(r.segments.every(s=>s.uncertain));
  }
  const lake=terrain.describe(point(-.6,33),point(-2.1,32.7));
  assert(lake.waterShare>.85);assert.equal(lake.waterName,'');
});
test('polar and date-line geometry agrees with the expedition position formula',()=>{
  for(const [a,b] of [[point(90,0),point(-90,0)],[point(-40,7),point(40,-173)],[point(17,179),point(24,-173)]]){
    const arc=terrain.arc(a,b);
    for(const t of [0,.125,.25,.5,.75,.875,1]){
      const p=arc.at(t),q=browser.EarthVoyages.position(a,b,t);
      assert(Math.abs(p.lat-q.lat)<1e-7);
      if(Math.abs(p.lat)<89.99999)assert(Math.abs((p.lon-q.lon+540)%360-180)<1e-7);
    }
  }
  assert(terrain.describe(point(90,0),point(-90,0)).uncertain);
  assert.equal(terrain.describe(point(90,9),point(90,-75)).distanceKm,0);
  assert.equal(terrain.describe(null,melbourne),null);assert.equal(terrain.describe(point(91,5),sydney),null);
});
test('terrain can run independently and adopt marine names when the gazetteer arrives',()=>{
  const local = vm.createContext({});local.window=local;
  vm.runInContext(fs.readFileSync(path.join(game,'route-terrain.js'),'utf8'),local);
  const before=local.EarthRouteTerrain.describe(london,paris);
  assert.equal(before.waterName,'');assert.equal(before.category,'mixed-crossing');
  local.EarthNavigation=browser.EarthNavigation;
  const named=local.EarthRouteTerrain.describe(london,paris);
  assert.equal(named.waterName,'English Channel');assert.equal(before.waterShare,named.waterShare);
  assert.equal(local.EarthRouteTerrain.describe(paris,london).longestWaterKm,named.longestWaterKm);
  assert(Object.isFrozen(named));assert(Object.isFrozen(named.segments[0]));
});
