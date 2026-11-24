
'use strict';
const WIDTH=10, DEPTH=13, SIZE=30;
const sides=['Bottom','Left','Top','Right'];
const colours=['#c7f476','#6bdde1','#ff9d79','#c3a7ff'];
const shapes=[
 [[0,1],[1,1],[2,1],[3,1]], [[1,0],[2,0],[1,1],[2,1]],
 [[1,0],[0,1],[1,1],[2,1]], [[0,0],[0,1],[1,1],[2,1]],
 [[2,0],[0,1],[1,1],[2,1]], [[1,0],[2,0],[0,1],[1,1]],
 [[0,0],[1,0],[1,1],[2,1]]
];
const row=()=>Array(WIDTH).fill(false);
function bag(){const b=[0,1,2,3,4,5,6];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function piece(type){return {type,x:3,y:0,cells:shapes[type].map(c=>c.slice())}}
// The four entrances flare from the hub. A cell belongs to exactly one lane.
function insideLane(x,y){
  const inset=Math.max(0,3-y);
  return y>=0 && y<DEPTH && x>=inset && x<WIDTH-inset;
}
function fits(l,p){return p.cells.every(([a,b])=>{const x=p.x+a,y=p.y+b;return insideLane(x,y)&&!l.grid[y][x]})}
function step(l,dx,dy){const p={...l.p,x:l.p.x+dx,y:l.p.y+dy};if(!fits(l,p))return false;l.p=p;return true}
function turn(l,clockwise){if(l.p.type===1)return;const m=l.p.type===0?3:2;
const cells=l.p.cells.map(([x,y])=>clockwise?[m-y,x]:[y,m-x]);
for(const [dx,dy] of [[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1],[0,-2],[0,1]]){const p={...l.p,cells,x:l.p.x+dx,y:l.p.y+dy};if(fits(l,p)){l.p=p;return}}}
function project(s,x,y){const a=10+x,b=SIZE-DEPTH+y;
return [[a,b],[SIZE-1-b,a],[SIZE-1-a,SIZE-1-b],[b,SIZE-1-a]][s]}
function reset(){const first=bag();lanes=sides.map((_,i)=>({grid:Array.from({length:DEPTH},row),p:piece(first[i]),bag:[],clears:0}));mode='ready';score=lines=elapsed=last=0;loser=null;sync()}
function floor(l){while(step(l,0,1)){}}
function lock(s){const l=lanes[s];for(const [x,y] of l.p.cells)l.grid[y+l.p.y][x+l.p.x]=true;
const keep=l.grid.filter(r=>!r.every(Boolean)),n=DEPTH-keep.length;
l.grid=[...Array.from({length:n},row),...keep];score+=4+[0,100,300,500,800][n]*(1+Math.floor(lines/10));lines+=n;l.clears+=n;
if(!l.bag.length)l.bag=bag();l.p=piece(l.bag.pop());if(!fits(l,l.p)){mode='over';loser=s}sync()}
function advance(s){if(!step(lanes[s],0,1))lock(s)}
function tick(){for(let s=0;s<4&&mode==='play';s++)advance(s)}

const $ = id => document.getElementById(id);
const canvas = $('arena');
const ctx = canvas.getContext('2d');
const degreesPerMillisecond = 360 / 30000;
let angle = 0;
let spinDirection = Math.random() < 0.5 ? -1 : 1;
let spinTimeLeft = randomSpinInterval();
let lastSpinFrame;

let lanes, mode, score, lines, elapsed, last, loser;

// The four bindings on each pad always address that lane directly.
const padKeys = [
  ['KeyZ', 'KeyX', 'KeyC', 'KeyV'],
  ['KeyA', 'KeyS', 'KeyD', 'KeyF'],
  ['KeyQ', 'KeyW', 'KeyE', 'KeyR'],
  ['KeyJ', 'KeyK', 'KeyL', 'Semicolon']
];
const actions = ['minus', 'plus', 'rotate', 'drop'];
const bindings = new Map();
const held = new Map();

function act(side, action) {
  if (mode !== 'play') return;
  const lane = lanes[side];
  if (action === 'rotate') turn(lane, true);
  else if (action === 'drop') {
    floor(lane);
    lock(side);
  } else {
    const sign = action === 'plus' ? 1 : -1;
    step(lane, side >= 2 ? -sign : sign, 0);
  }
  draw();
}

function release(token) {
  const binding = held.get(token);
  if (!binding) return;
  held.delete(token);
  if (![...held.values()].includes(binding)) binding.button.classList.remove('held');
}

function releaseAll() {
  for (const token of held.keys()) release(token);
}

function press(token, binding) {
  if (mode !== 'play' || held.has(token)) return;
  const alreadyDown = [...held.values()].includes(binding);
  held.set(token, binding);
  if (alreadyDown) return;
  binding.button.classList.add('held');
  binding.repeatAt = performance.now() + 250;
  act(binding.side, binding.action);
}

function makePads() {
  for (const [side, name] of sides.entries()) {
    const pad = document.createElement('section');
    pad.className = 'pad ' + name.toLowerCase();
    pad.style.setProperty('--tone', colours[side]);
    pad.setAttribute('aria-label', name + ' keypad');
    const heading = document.createElement('h2');
    heading.textContent = name;
    const keys = document.createElement('div');
    keys.className = 'keys';
    const vertical = side % 2 === 1;
    const labels = [vertical ? '↑' : '←', vertical ? '↓' : '→', 'Turn', 'Drop'];
    const descriptions = [vertical ? 'slide up' : 'slide left', vertical ? 'slide down' : 'slide right', 'rotate clockwise', 'hard drop'];
    actions.forEach((action, i) => {
      const button = document.createElement('button');
      button.className = 'key';
      const code = padKeys[side][i];
      const key = code === 'Semicolon' ? ';' : code.slice(3);
      button.setAttribute('aria-label', name + ' ' + descriptions[i]);
      button.setAttribute('aria-keyshortcuts', key);
      button.textContent = labels[i];
      const shortcut = document.createElement('kbd');
      shortcut.textContent = key;
      button.append(shortcut);
      const binding = {side, action, button, repeatAt: 0};
      bindings.set(code, binding);
      button.onpointerdown = e => {
        if (e.button !== 0) return;
        e.preventDefault();
        button.setPointerCapture(e.pointerId);
        press(e.pointerId, binding);
      };
      button.onpointerup = button.onpointercancel = button.onlostpointercapture = e => release(e.pointerId);
      button.oncontextmenu = e => e.preventDefault();
      button.onclick = e => { if (e.detail === 0 && !e.pointerType) act(side, action); };
      keys.append(button);
    });
    pad.append(heading, keys);
    $('pads').append(pad);
  }
}

function sync() {
  if (mode !== 'play') releaseAll();
  for (const {button} of bindings.values()) button.disabled = mode !== 'play';
  $('score').textContent = score;
  $('lines').textContent = lines;
  $('level').textContent = 1 + Math.floor(lines / 10);
  $('board-message').hidden = mode !== 'paused' && mode !== 'over';
  $('board-message').textContent = mode === 'over' ? 'Game over' : 'Paused';
  $('run').textContent = {ready:'Start game', play:'Pause', paused:'Resume', over:'Play again'}[mode];
  $('status').textContent = mode === 'over' ? sides[loser] + ' reached the centre. Game over.' : mode;
  draw();
}

function paintRotation() {
  canvas.style.transform = 'rotate(' + angle + 'deg) scale(' + SIZE / Math.hypot(SIZE, WIDTH) + ')';
}

function randomSpinInterval() {
  return 3000 + Math.random() * 9000;
}

// The board has its own clock. Piece drops, pause and restart never reset it.
function animateBoard(now) {
  const delta = lastSpinFrame === undefined ? 0 : Math.min(now - lastSpinFrame, 150);
  lastSpinFrame = now;
  const beforeTurn = Math.min(delta, spinTimeLeft);
  angle += spinDirection * beforeTurn * degreesPerMillisecond;
  spinTimeLeft -= beforeTurn;
  if (spinTimeLeft <= 0) {
    spinDirection *= -1;
    const afterTurn = delta - beforeTurn;
    angle += spinDirection * afterTurn * degreesPerMillisecond;
    spinTimeLeft = randomSpinInterval() - afterTurn;
  }
  angle %= 360;
  paintRotation();
}

function toggleRun() {
  if (mode === 'over') reset();
  mode = mode === 'play' ? 'paused' : 'play';
  last = 0;
  sync();
}

function frame(now) {
  animateBoard(now);
  if (mode === 'play') {
    for (const binding of new Set(held.values())) {
      if ((binding.action === 'minus' || binding.action === 'plus') && now >= binding.repeatAt) {
        act(binding.side, binding.action);
        binding.repeatAt = now + 100;
      }
    }
    if (last) {
      const delta = Math.min(150, now - last);
      elapsed += delta;
    }
    last = now;
    const delay = Math.max(280, 1250 - Math.floor(lines / 10) * 85);
    if (elapsed >= delay) {
      elapsed -= delay;
      tick();
      draw();
    }
  }
  requestAnimationFrame(frame);
}

$('run').onclick = toggleRun;
const guide = $('guide');
$('help').onclick = () => {
  if (mode === 'play') toggleRun();
  guide.showModal();
};
$('close-help').onclick = () => guide.close();
// Some Android keyboards supply a printable key without a physical key code.
function shortcutCode(event) {
  if (bindings.has(event.code) || event.code === 'Space') return event.code;
  const key = event.key || '';
  if (key === ' ') return 'Space';
  if (key === ';') return 'Semicolon';
  if (/^[a-z]$/i.test(key)) return 'Key' + key.toUpperCase();
  return '';
}
document.addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey || e.isComposing || guide.open) return;
  const code = shortcutCode(e);
  if (code === 'Space' && !['help','fullscreen'].includes(e.target.id) && e.target.tagName !== 'A') {
    e.preventDefault();
    if (!e.repeat) toggleRun();
    return;
  }
  const binding = bindings.get(code);
  if (!binding || mode !== 'play') return;
  e.preventDefault();
  if (!e.repeat) press(code, binding);
});
document.addEventListener('keyup', e => release(shortcutCode(e)));
window.addEventListener('blur', releaseAll);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && mode === 'play') toggleRun();
});
if (document.fullscreenEnabled) {
  const full = $('fullscreen');
  full.hidden = false;
  full.onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { $('status').textContent = 'Full screen is unavailable in this browser.'; }
  };
  document.addEventListener('fullscreenchange', () => {
    full.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
  });
}
function draw(){if(!lanes)return;const pixels=Math.max(1,Math.round(canvas.clientWidth*Math.min(devicePixelRatio||1,2)));if(canvas.width!==pixels||canvas.height!==pixels){canvas.width=canvas.height=pixels}
const u=pixels/SIZE;ctx.setTransform(u,0,0,u,0,0);ctx.fillStyle='#11191c';ctx.fillRect(0,0,SIZE,SIZE);
for(let s=0;s<4;s++){const l=lanes[s],c=colours[s];
for(let y=0;y<DEPTH;y++)for(let x=0;x<WIDTH;x++){if(!insideLane(x,y))continue;const [a,b]=project(s,x,y);ctx.fillStyle='#21302f';ctx.fillRect(a+.025,b+.025,.95,.95);if(l.grid[y][x])tile(a,b,c,false)}
const ghost={...l.p};while(fits(l,{...ghost,y:ghost.y+1}))ghost.y++;
for(const [x,y] of ghost.cells){const [a,b]=project(s,x+ghost.x,y+ghost.y);ctx.strokeStyle=c;ctx.globalAlpha=.62;ctx.lineWidth=.07;ctx.setLineDash([.16,.12]);ctx.strokeRect(a+.09,b+.09,.82,.82);ctx.setLineDash([]);ctx.globalAlpha=1}
for(const [x,y] of l.p.cells){const [a,b]=project(s,x+l.p.x,y+l.p.y);tile(a,b,c,true)}
ctx.save();ctx.translate(15,15);ctx.rotate(s*Math.PI/2);ctx.fillStyle=c;ctx.fillRect(-5,14.78,10,.22);
ctx.beginPath();ctx.moveTo(-.3,1.25);ctx.lineTo(.3,1.25);ctx.lineTo(0,1.65);ctx.closePath();ctx.fill();ctx.restore()}
}
function tile(x,y,c,active){ctx.fillStyle=c;ctx.globalAlpha=active?1:.78;ctx.fillRect(x+.045,y+.045,.91,.91);ctx.globalAlpha=1;ctx.fillStyle='#ffffff62';ctx.fillRect(x+.1,y+.1,.8,.09);ctx.fillStyle='#13201d45';ctx.fillRect(x+.1,y+.81,.8,.09)}

makePads();
reset();
new ResizeObserver(draw).observe(canvas);
requestAnimationFrame(frame);
