const { before, test } = require('node:test');
const assert = require('node:assert/strict');
let game, view, skin, travel, convoy;
before(async () => {
  [game, view, skin, travel, convoy] = await Promise.all(
    ['world', 'procession-view', 'marcher-body', 'travel', 'procession'].map(
      name => import('../zelda-and-the-princess-zombie/' + name + '.mjs')
    )
  );
});

test('a detached attacker is visible once at its fighting position, outside its former rank, through its fall', () => {
  const w = game.createWorld(), painters = view.createProcessionView();
  Object.assign(w.player, { x: 19, z: 221, yaw: 0 });
  w.elapsed = 55;
  const id = convoy.roadFileIds[0];
  const a = { i: id, x: 19, z: 224, heading: Math.PI, state: 'windup', since: 54.8, until: 56 };
  w.hostActors = { [id]: a };
  for (const includeColumn of [false, true]) {
    const frame = painters.near(w, 1.75, w.elapsed, 32, includeColumn);
    const bodies = frame.poses.filter(p => p.id === id);
    assert.equal(bodies.length, 1);
    assert.ok(frame.ids.has(id), 'its old point sprite must also be removed');
    const pose = bodies[0];
    assert.deepEqual([pose.x, pose.y, pose.z], [a.x, travel.footHeight(w, a.x, a.z), a.z]);
    assert.equal(pose.view, 'front');
    assert.equal(pose.state, 'windup');
    assert.equal(pose.h, skin.marcherHeight(id));
  }
  a.heading = 0;
  assert.equal(painters.near(w, 1.75, w.elapsed, 32, false).poses.find(p => p.id === id).view, 'back');
  a.state = 'fallen';
  w.hostFallen = { [id]: true };
  let frame = painters.near(w, 1.75, w.elapsed, 32);
  assert.equal(frame.poses.find(p => p.id === id).state, 'fallen');
  delete w.hostActors[id];
  frame = painters.near(w, 1.75, w.elapsed, 32);
  assert.ok(!frame.poses.some(p => p.id === id));
  assert.ok(frame.ids.has(id), 'a fallen guest may never reappear at a lower detail tier');
});

test('the skin draws back before reaching out, then drops onto the ground on defeat', () => {
  const p = { x: 0, z: 0 }, pose = {id: 7, x: 0, y: 2, z: 2.2, heading: Math.PI,
    h: skin.marcherHeight(7), w: 1, state: 'windup', since: 20, until: 21.2};
  assert.ok(skin.marcherLean(pose, 20.36) < -0.05);
  assert.ok(skin.marcherReach(pose, 21.1) > skin.marcherReach(pose, 20.36) + 0.4);
  const atlas = skin.marcherAtlasCell(7);
  function vertices(t) {
    const v = skin.marcherBodyFaces(pose, p, t, 0.75, atlas).flat();
    assert.ok(v.every(joint => joint.every(Number.isFinite)));
    assert.ok(v.every(joint => joint[3] >= atlas[0] && joint[3] <= 1 && joint[4] >= atlas[1] && joint[4] <= 1));
    return v;
  }
  assert.ok(Math.min(...vertices(21.1).map(v => v[2])) < Math.min(...vertices(20.36).map(v => v[2])) - 0.3);
  pose.state = 'fallen';
  assert.ok(Math.max(...vertices(21.1).map(v => v[1])) < pose.y + 0.25);
  const rolled = {id: 'host7', i: 7, state: 'feed'};
  assert.equal(skin.marcherLean(rolled,30),skin.marcherLean({id: 7, state: 'feed'},30));
});
