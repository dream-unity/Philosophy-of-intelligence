'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname, '../common-earth'), 'app.js'), 'utf8');
const start = app.indexOf('  async function followCharter(');
const end = app.indexOf('  function nextObjective()', start);
assert.ok(start >= 0 && end > start);
const followCharter = new vm.Script(app.slice(start, end) + '\nfollowCharter');

function followHousingGoal(valid = true) {
  const cityStep = {kind:'city', siteId:'town', precinct:3, project:'homes'};
  let selected = {precinct:0, project:'food'};
  const firstVisible = [], notices = [];
  const city = {previewProject(precinct, project, reveal) {
    if (!valid) return false;
    selected = {precinct, project};
    reveal();
    return true;
  }};
  const screen = {
    window:{}, sim:{state:{activeId:'town', sites:[{id:'town'}]}}, city,
    cityController:()=>city, requestAnimationFrame(){},
    setView(view) { if (view === 'city') firstVisible.push({...selected}); },
    notify(message) { notices.push(message); }
  };
  return followCharter.runInNewContext(screen)(cityStep).then(()=>({firstVisible,notices}));
}

test('the first City proposal exposed by housing guidance is its requested precinct and project', async ()=>{
  assert.deepEqual((await followHousingGoal()).firstVisible, [{precinct:3, project:'homes'}]);
});
test('a stale goal never exposes a prior purchasable City proposal', async ()=>{
  const result = await followHousingGoal(false);
  assert.deepEqual(result.firstVisible, []);
  assert.equal(result.notices.length, 1);
});
