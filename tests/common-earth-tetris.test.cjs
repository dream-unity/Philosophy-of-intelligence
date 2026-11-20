const test=require('node:test');
const assert=require('node:assert/strict');
require('../common-earth/tetris.js');
const {Game,rotations}=globalThis.EarthTetris;

test('two consecutive bags contain every tetromino and hold is limited to once per piece',()=>{
  const game=new Game(()=>.4),draws=[game.type,game.next];
  while(draws.length<14)draws.push(game.draw());
  for(const bag of [draws.slice(0,7),draws.slice(7)])assert.deepEqual(bag.sort(),Object.keys(rotations).sort());
  const first=game.type,second=game.next;
  game.act('hold');assert.equal(game.held,first);assert.equal(game.type,second);
  game.act('hold');assert.equal(game.held,first);assert.equal(game.type,second);
  game.act('drop');const third=game.type,next=game.next;
  game.act('hold');assert.equal(game.type,first);assert.equal(game.held,third);assert.equal(game.next,next);
});

test('gravity falls one row, the landing locks after a grace period, and the game ends on a blocked spawn',()=>{
  const game=new Game();
  game.advance(799);assert.equal(game.y,0);game.advance(1);assert.equal(game.y,1);
  while(!game.grounded())game.act('down');
  const floor=game.y;
  game.advance(499);assert.equal(game.y,floor);
  game.advance(1);assert.equal(game.board.flat().filter(Boolean).length,4);
  for(let i=0;i<10;i++)game.act('left');
  const [dx,dy]=rotations[game.next][0][0];
  const spawnX=game.next==='O'?4:3;game.board[dy][spawnX+dx]='L';
  game.act('drop');assert.equal(game.over,true);
  const final=game.score;game.act('drop');game.advance(2000);assert.equal(game.score,final);
});

test('an I piece kicks at the wall, clears four filled lines and advances the level',()=>{
  const game=new Game();game.spawn('I');game.act('clockwise');
  for(let i=0;i<10;i++)game.act('left');
  assert.equal(game.x,-2);game.act('counterclockwise');assert.equal(game.rotation,0);
  assert.ok(game.fits(game.x,game.y,game.rotation));
  game.act('clockwise');
  for(let i=0;i<10;i++)game.act('left');
  for(const row of game.board.slice(-4))row.fill('O',1);
  game.board[15][5]='T';game.lines=6;
  const distance=game.landing()-game.y;
  game.act('drop');assert.equal(game.lines,10);assert.equal(game.level,2);
  assert.equal(game.score,800+2*distance);assert.equal(game.board[19][5],'T');
  assert.equal(game.board.flat().filter(Boolean).length,1);assert.ok(game.wait<800);
});

test('a grounded piece has a bounded number of lock delay resets',()=>{
  const game=new Game();game.spawn('T');
  while(!game.grounded())game.act('down');
  for(let i=0;i<15;i++){
    game.advance(490);game.act(i%2?'left':'right');assert.equal(game.wait,500);
  }
  game.advance(490);game.act('left');assert.equal(game.wait,10);
  game.advance(10);assert.equal(game.board.flat().filter(Boolean).length,4);
});
