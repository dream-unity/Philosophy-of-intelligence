const test = require('node:test');
const assert = require('node:assert/strict');
const base = '../zelda-and-the-princess-zombie/';

test('the restored Xero speaks to her father before his address and the crowd response in either layout', async () => {
  const { createRoyalCeremony } = await import(base + 'royal-ceremony.mjs');
  class Element {
    constructor() { this.style = {}; this.dataset = {}; this.children = []; this.hidden = false; }
    append(...items) { this.children.push(...items); }
    setAttribute(key, value) { this[key] = value; }
  }
  const oldImage = global.Image, oldDocument = global.document;
  const downloads = [];
  global.Image = class {
    set src(url) { this.url = url; downloads.push(url); }
    get src() { return this.url; }
    complete = true;
    naturalWidth = 1672;
  };
  global.document = { createElement: () => new Element() };
  try {
    const stage = new Element(), scene = createRoyalCeremony(stage);
    assert.equal(scene.render(undefined, false), false);
    assert.equal(downloads.length, 0);
    assert.equal(scene.render({ phase:'restoring', time:0 }, false), false);
    assert.deepEqual(downloads, ['royal-report.webp', 'royal-honours.webp']);
    assert.equal(scene.render({ phase:'report', time:2 }, false), true);
    const [sheet] = stage.children, [picture, caption] = sheet.children;
    const [art, ...streamers] = picture.children;
    assert.equal(art.src, 'royal-report.webp');
    assert.equal(caption.children[0].textContent, 'Princess Xero');
    assert.match(caption.children[1].textContent, /Father, it was Zelda/);
    assert.equal(scene.render({ phase:'honour', time:1 }, false), true);
    assert.equal(art.src,'royal-honours.webp');
    assert.match(art.alt,/Thousands/);
    assert.match(caption.children[1].textContent,/given me back my daughter/);
    scene.render({ phase:'honour', time:8.5 }, false);
    assert.equal(caption.children[1].textContent,'Zelda! Zelda!');
    assert.ok(streamers.some(r => !r.hidden));
    scene.render({ phase:'honour', time:8.5 }, true);
    assert.ok(streamers.every(r => r.hidden));
    assert.equal(picture.style.transform,'');
    scene.render({ phase:'complete', time:0 }, true);
    assert.equal(art.src, 'royal-honours.webp');
    assert.ok(caption.hidden);
    assert.equal(scene.render(undefined, true), false);
    assert.ok(sheet.hidden);
    assert.equal(downloads.length, 2);
  } finally { global.Image = oldImage; global.document = oldDocument; }
});

test('castle voices restart at the actual line position after a pause, restore or replay', async () => {
  const { createRoyalAudio } = await import(base + 'royal-audio.mjs');
  const oldWindow = global.window, oldFetch = global.fetch;
  const files = [], played = [], notes = [];
  global.window = {};
  global.fetch = async url => {
    const path = url.pathname.split('/').at(-1);
    files.push(path);
    return {ok:true, arrayBuffer: async () => path};
  };
  const ctx = {
    currentTime:0,
    decodeAudioData:async file => ({file, duration:file === 'royal-square.mp3' ? 12 : 7}),
    createGain: () => ({connect(bus){this.bus = bus;}, disconnect(){},
      gain:{setValueAtTime(){}, linearRampToValueAtTime(){}}}),
    createBufferSource: () => ({connect(node){this.node = node;}, disconnect(){}, stop(){this.stopped = true;},
      start(at, offset) { Object.assign(this,{at,offset}); played.push(this); }}),
  };
  try {
    const audio = createRoyalAudio(ctx,{effects:'effects',ambience:'ambience'},(...args) => notes.push(args));
    audio.update({phase:'restoring',time:3});
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(files.length,3);
    ctx.currentTime = 5;
    audio.update({phase:'report',time:1.38});
    assert.equal(played.at(-1).buffer.file,'royal-xero.mp3');
    assert.ok(Math.abs(played.at(-1).offset - 1) < 1e-8);
    assert.equal(played.at(-1).node.bus,'effects');
    audio.stop();
    assert.ok(played.at(-1).stopped);
    ctx.currentTime = 30;
    audio.update({phase:'honour',time:3.32});
    assert.deepEqual(played.slice(-2).map(p=>p.node.bus),['effects','ambience']);
    assert.ok(Math.abs(played.at(-2).offset - 3) < 1e-8);
    assert.equal(played.at(-1).offset,3.32);
    audio.update({phase:'complete',time:0});
    assert.ok(played.slice(-2).every(p=>p.stopped));
    audio.update({phase:'report',time:0});
    assert.ok(notes.some(n=>n[0]==='viola'));
    assert.equal(files.length,3);
  } finally { global.window = oldWindow; global.fetch = oldFetch; }
});
