'use strict';
const $ = id => document.getElementById(id);
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const TAU = Math.PI * 2;
const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const wrap = (x, n) => (x % n + n) % n;
const shortest = (a, b, n) => wrap(b - a + n / 2, n) - n / 2;
const radii = [23, 15, 9];
const values = [[100,135,200],[325,360,425],[500,535,600],[750,785,850]];
// Each entry describes the four large mines in one field. Descendants inherit the type.
const fields = ['0000','1000','2000','3000','1200','1300','2300','1100','2200','3300','1110','2220','3330'];
let width = 800, height = 600, scaleX = 1, scaleY = 1;
let phase = 'ready', paused = false, roster = [], active = 0;
let ship, seeds = [], mines = [], shots = [], bolts = [], sparks = [], layer;
let fieldTime = 0, phaseTime = 0, returned = false, seedingBonus = 0;
let sound = true, audio, displayTime = 0;
const held = new Map();
const controls = [...document.querySelectorAll('[data-act]')];
const keys = {ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'thrust',KeyW:'thrust',Space:'fire',KeyX:'escape'};
const stars = Array.from({length:75}, () => [Math.random(), Math.random(), rand(.35,1)]);
function pilot(){return roster[active]}
function resize(){
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const unit = 575 / Math.min(rect.width, rect.height);
  const w = rect.width * unit, h = rect.height * unit;
  for (const o of [ship,layer,...mines,...seeds,...shots,...bolts,...sparks]) {
    if (!o) continue;
    o.x *= w/width; o.y *= h/height;
  }
  width=w; height=h;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);
  scaleX=canvas.width/w;scaleY=canvas.height/h;
}
function initAudio(){
  if (!sound) return;
  try {audio ||= new (window.AudioContext || window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});} catch {}
}
function tone(hz,end,duration,vol=.035,shape='triangle'){
  if(!sound||audio?.state!=='running')return;
  const o=audio.createOscillator(), gain=audio.createGain(), t=audio.currentTime;
  o.type=shape;o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(end,t+duration);
  gain.gain.setValueAtTime(vol,t);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
  o.connect(gain);gain.connect(audio.destination);o.start();o.stop(t+duration);
}
function stats(){
  const p=pilot();$('score').textContent=p.score.toLocaleString();$('field').textContent=String(p.field).padStart(2,'0');
  $('ships').textContent=p.lives;$('player').hidden=roster.length===1;$('player').textContent='P'+(active+1);
}
function newShip(){return {x:width/2,y:height/2,a:-Math.PI/2,vx:0,vy:0,gun:0,jump:0,shield:1.5}}
function drive(o,dt){o.x=wrap(o.x+o.vx*dt,width);o.y=wrap(o.y+o.vy*dt,height)}
function delta(a,b){return [shortest(a.x,b.x,width),shortest(a.y,b.y,height)]}
function hit(a,b,r){const [x,y]=delta(a,b);return x*x+y*y<r*r}
function burst(o,colour,n=14){
  for(let i=0;i<n;i++){const a=rand(0,TAU),v=rand(24,155);sparks.push({x:o.x,y:o.y,vx:v*Math.cos(a),vy:v*Math.sin(a),ttl:rand(.18,.65),colour})}
}
function newSeed(size,type){
  let x,y;
  do {x=rand(0,width);y=rand(0,height)} while(Math.hypot(x-width/2,y-height/2)<65);
  return {x,y,size,type,visible:false};
}
function makeMine(seed){
  const a=rand(0,TAU),v=rand(13,28)+seed.size*7+Math.min(pilot().field,24)*1.5;
  return {...seed,a,vx:v*Math.cos(a),vy:v*Math.sin(a),speed:v,spin:rand(-1.1,1.1),warm:.45};
}
function activate(size,type){
  const i=seeds.findIndex(s=>s.size===size&&s.type===type);
  if(i>=0)mines.push(makeMine(seeds.splice(i,1)[0]));
}
function clearControls(){held.clear();for(const b of controls)b.classList.remove('down')}
function modal(title,detail,action,choose=false){
  $('headline').textContent=title;$('intro').textContent=detail;$('start').textContent=action;
  $('playerChoice').hidden=!choose;$('overlay').hidden=false;
}
function startField(){
  clearControls();ship=newShip();shots=[];bolts=[];sparks=[];mines=[];seeds=[];returned=false;
  fieldTime=phaseTime=seedingBonus=0;phase='seed';paused=false;
  const types=fields[Math.min(pilot().field,13)-1];
  for(const t of types)for(let s=0;s<3;s++)for(let n=0;n<2**s;n++)seeds.push(newSeed(s,Number(t)));
  layer={x:width*.5,y:-18,vx:0,vy:height/2};
  $('overlay').hidden=true;$('pause').disabled=false;$('pause').textContent='Pause';$('notice').textContent='FIELD '+String(pilot().field).padStart(2,'0');stats();tone(130,290,.28);
}
function startGame(){
  initAudio();active=0;roster=Array.from({length:Number($('count').value)},()=>({score:0,lives:5,field:1}));startField();
}
function startAction(){
  if(paused){togglePause();return}
  if(phase==='handoff'){startField();return}
  if(phase==='ready'||phase==='over')startGame();
}
function togglePause(){
  if(!['seed','fly','loss'].includes(phase))return;
  clearControls();paused=!paused;$('pause').textContent=paused?'Resume':'Pause';
  if(paused)modal('Paused','Field '+pilot().field+' · Player '+(active+1),'Resume');
  else {$('overlay').hidden=true;initAudio()}
}
function lose(){
  if(phase!=='fly')return;
  burst(ship,'#fbb48a',44);tone(170,28,.58,.11,'sawtooth');pilot().lives--;stats();
  phase='loss';phaseTime=0;clearControls();$('notice').textContent='Ship lost';
}
function nextPilot(){
  const survivor=roster.findIndex(p=>p.lives>0);
  if(survivor<0){
    phase='over';$('pause').disabled=true;$('notice').textContent='';
    modal('Game over',roster.map((p,i)=>(roster.length===2?'P'+(i+1)+' · ':'')+p.score.toLocaleString()+' points').join('   /   '),'Play again',true);
    return;
  }
  const other=(active+1)%roster.length;
  if(roster[other].lives>0&&other!==active){
    active=other;phase='handoff';$('pause').disabled=true;$('notice').textContent='';stats();
    modal('Player '+(active+1),'Field '+pilot().field+' · '+pilot().lives+' ships','Take controls');
  }else startField();
}
function fire(){
  const c=Math.cos(ship.a),s=Math.sin(ship.a);
  shots.push({x:wrap(ship.x+c*13,width),y:wrap(ship.y+s*13,height),vx:ship.vx+c*475,vy:ship.vy+s*475,ttl:1.12});
  ship.gun=.145;tone(740,145,.095,.034,'square');
}
function jump(){
  if(phase!=='fly'||paused||ship.jump>0)return;
  burst(ship,'#8fe3de');ship.x=rand(0,width);ship.y=rand(0,height);
  ship.jump=.85;ship.shield=.24;burst(ship,'#89cdd6');tone(165,1050,.22);
}
function destroyMine(index){
  const m=mines.splice(index,1)[0];
  pilot().score+=values[m.type][m.size];stats();burst(m,'#ffc293');tone(210-m.size*24,48,.17);
  if(m.type%2===1){
    const [x,y]=delta(m,ship),a=Math.atan2(y,x),v=135+Math.min(pilot().field,24)*3;
    bolts.push({x:m.x,y:m.y,vx:v*Math.cos(a),vy:v*Math.sin(a),ttl:4});
  }
  if(m.size<2){activate(m.size+1,m.type);activate(m.size+1,m.type)}
}
function runShots(dt){
  for(let i=shots.length-1;i>=0;i--){
    const o=shots[i];drive(o,dt);o.ttl-=dt;
    if(o.ttl<=0){shots.splice(i,1);continue}
    const m=mines.findIndex(m=>m.warm<=0&&hit(o,m,radii[m.size]+2));
    if(m>=0){shots.splice(i,1);destroyMine(m);continue}
    const b=bolts.findIndex(b=>hit(o,b,7));
    if(b>=0){burst(bolts[b],'#ffce91');bolts.splice(b,1);shots.splice(i,1);pilot().score+=110;stats();continue}
    if(layer&&hit(o,layer,21)){burst(layer,'#ffa776',25);layer=null;shots.splice(i,1);pilot().score+=1000;stats();tone(180,30,.3)}
  }
}
function simulate(dt){
  displayTime+=dt;
  if(paused||phase==='ready'||phase==='over'||phase==='handoff')return;
  phaseTime+=dt;
  for(const s of sparks){drive(s,dt);s.ttl-=dt}sparks=sparks.filter(s=>s.ttl>0);
  if(phase==='loss'){if(phaseTime>=1.15)nextPilot();return}
  if(phase==='seed'){
    layer.y=-20+(height+55)*phaseTime/2.1;
    for(const s of seeds)if(s.y<layer.y)s.visible=true;
    if(phaseTime>=2.1){
      layer=null;phase='fly';phaseTime=0;
      for(const t of fields[Math.min(pilot().field,13)-1])activate(0,Number(t));
      $('notice').textContent='';
    }return;
  }
  fieldTime+=dt;
  const buttons=new Set(held.values());
  ship.a+=((buttons.has('right')?1:0)-(buttons.has('left')?1:0))*4.5*dt;
  if(buttons.has('thrust')){ship.vx+=Math.cos(ship.a)*225*dt;ship.vy+=Math.sin(ship.a)*225*dt}
  const speed=Math.hypot(ship.vx,ship.vy);
  if(speed>290){ship.vx*=290/speed;ship.vy*=290/speed}
  drive(ship,dt);ship.gun-=dt;ship.jump-=dt;ship.shield-=dt;
  if(buttons.has('fire')&&ship.gun<=0)fire();
  if(!returned&&fieldTime>=16){
    returned=true;layer={x:0,y:rand(height*.15,height*.85),vx:width/5,vy:0};seedingBonus=1;
  }
  if(layer){
    layer.x+=layer.vx*dt;seedingBonus-=dt;
    if(seedingBonus<=0){mines.push(makeMine({x:layer.x,y:layer.y,type:0,size:2}));seedingBonus=2}
    if(layer.x>=width)layer=null;
  }
  for(const m of mines){
    m.a+=m.spin*dt;m.warm-=dt;
    if(m.type>=2){
      const [x,y]=delta(m,ship),len=Math.hypot(x,y)||1,acc=dt*.85;
      m.vx+=(m.speed*1.75*x/len-m.vx)*acc;m.vy+=(m.speed*1.75*y/len-m.vy)*acc;
    }drive(m,dt)
  }
  for(const b of bolts){drive(b,dt);b.ttl-=dt}bolts=bolts.filter(b=>b.ttl>0);
  runShots(dt);
  if(ship.shield<=0&&(mines.some(m=>m.warm<=0&&hit(m,ship,radii[m.size]+7))||bolts.some(b=>hit(b,ship,10))||(layer&&hit(layer,ship,23)))){lose();return}
  if(!mines.length&&!bolts.length&&!layer){if(pilot().field%4===0)pilot().lives++;pilot().field++;startField()}
}

// Draw a second copy at a seam while a vector outline straddles the opposite edge.
function copies(o,r,draw){
  const xs=[o.x],ys=[o.y];
  if(o.x<r)xs.push(o.x+width);if(o.x>width-r)xs.push(o.x-width);
  if(o.y<r)ys.push(o.y+height);if(o.y>height-r)ys.push(o.y-height);
  for(const x of xs)for(const y of ys){ctx.save();ctx.translate(x,y);draw();ctx.restore()}
}
function path(points,close=true){
  ctx.beginPath();ctx.moveTo(...points[0]);for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);
  if(close)ctx.closePath();ctx.stroke();
}
function ink(colour,line=1.6){ctx.lineWidth=line;ctx.strokeStyle=colour;ctx.shadowColor=colour;ctx.shadowBlur=3}
function ring(x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke()}
function drawShip(o,thrust){
  copies(o,22,()=>{
    ctx.rotate(o.a);ink('#bcfff1',1.9);
    path([[13,0],[-10,-8],[-6,-2],[-6,2],[-10,8]]);
    path([[-2,-3],[5,0],[-2,3]],false);
    if(thrust){ink('#ffb780');path([[-8,-3],[-15-3*Math.sin(displayTime*45),0],[-8,3]],false)}
    if(o.shield>0){ink('#68bfc2',1);ctx.setLineDash([4,6]);ring(0,0,18)}
  });
}
function drawMine(m){
  const r=radii[m.size];
  copies(m,r+3,()=>{
    ctx.rotate(m.a);ctx.scale(r,r);ink(m.type%2?'#ffb982':'#a0dded',1.7/r);
    if(m.warm>0)ctx.globalAlpha=.48;
    const tips=[6,5,4,8][m.type],points=[];
    for(let j=0;j<tips*2;j++){const a=j*Math.PI/tips,rr=j%2?.35:1;points.push([Math.cos(a)*rr,Math.sin(a)*rr])}
    path(points);
    if(m.type>=2)path([[0,-.34],[.3,0],[0,.34],[-.3,0]]);
    else ring(0,0,.15);
  });
}
function drawLayer(o){
  copies(o,36,()=>{
    ink('#ffd4a3',1.8);path([[-32,-5],[-17,-9],[-11,-14],[11,-14],[17,-9],[32,-5],[23,5],[9,8],[0,14],[-9,8],[-23,5]]);
    path([[-32,-5],[-16,-2],[16,-2],[32,-5]],false);path([[-12,-9],[-6,-11],[6,-11],[12,-9]],false);
    for(let x=-16;x<=16;x+=8){ctx.fillStyle='#ffd9b5';ctx.fillRect(x-1,2,2,2)}
  });
}
function render(){
  ctx.setTransform(scaleX,0,0,scaleY,0,0);ctx.clearRect(0,0,width,height);
  ctx.shadowBlur=0;ctx.lineJoin='round';ctx.lineCap='round';
  for(const [x,y,b] of stars){ctx.fillStyle='rgba(131,180,192,'+(b*.38)+')';ctx.fillRect(x*width,y*height,1.3,1.3)}
  if(pilot()?.field>13){
    ctx.fillStyle='#6b939c';for(const [x,y] of stars)ctx.fillRect(x*width,wrap(y*height+displayTime*50,height),1,3);
  }
  if(phase==='ready'){
    for(let i=0;i<7;i++){const a=TAU*i/7+displayTime*.025;
      drawMine({x:width*(.5+.37*Math.cos(a)),y:height*(.5+.38*Math.sin(a)),type:i%4,size:i%2,a:a+displayTime*.2})}
    drawShip({x:width*.2,y:height*.55,a:-.4,shield:0},true);return;
  }
  ctx.fillStyle='#6f999c';for(const s of seeds)if(s.visible)ctx.fillRect(s.x-1,s.y-1,2,2);
  if(layer)drawLayer(layer);
  for(const m of mines)drawMine(m);
  for(const b of bolts)copies(b,7,()=>{ink('#ffa561',2);path([[0,-5],[4,0],[0,5],[-4,0]])});
  for(const shot of shots)copies(shot,8,()=>{ink('#d1fff5',2);const v=Math.hypot(shot.vx,shot.vy)||1;path([[0,0],[-shot.vx*7/v,-shot.vy*7/v]],false)});
  if(phase==='fly')drawShip(ship,[...held.values()].includes('thrust'));
  for(const s of sparks){ctx.globalAlpha=Math.min(1,s.ttl*3);ctx.strokeStyle=s.colour;ctx.lineWidth=1.4;path([[s.x,s.y],[s.x-s.vx*.027,s.y-s.vy*.027]],false)}
  ctx.globalAlpha=1;
}
function refreshButtons(){
  const down=new Set(held.values());
  for(const b of controls)b.classList.toggle('down',down.has(b.dataset.act));
}
function press(id,action){
  if(paused||!['fly','seed'].includes(phase)||held.has(id))return;
  held.set(id,action);
  if(action==='escape')jump();
  if(action==='fire'&&phase==='fly'&&ship.gun<=0)fire();
  refreshButtons();
}
function release(id){if(held.delete(id))refreshButtons()}
for(const b of controls){
  b.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;e.preventDefault();b.setPointerCapture(e.pointerId);press(e.pointerId,b.dataset.act);
  });
  for(const evt of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(evt,e=>release(e.pointerId));
  b.oncontextmenu=e=>e.preventDefault();
  b.onclick=e=>{
    if(e.detail!==0||e.pointerType||phase!=='fly'||paused)return;
    const a=b.dataset.act;
    if(a==='escape')jump();else if(a==='fire'&&ship.gun<=0)fire();
    else if(a==='left'||a==='right')ship.a+=(a==='left'?-1:1)*.2;
    else if(a==='thrust'){ship.vx+=Math.cos(ship.a)*20;ship.vy+=Math.sin(ship.a)*20}
  };
}
function code(e){
  if(keys[e.code]||['KeyP','Enter'].includes(e.code))return e.code;
  const k=e.key||'';if(k===' ')return 'Space';return k.length===1?'Key'+k.toUpperCase():k;
}
document.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||$('instructions').open||e.target.tagName==='SELECT')return;
  const k=code(e);
  if(e.target.closest('button,a')&&['Space','Enter'].includes(k)&&(!['fly','seed'].includes(phase)||e.target=== $('pause')||e.target=== $('sound')||e.target=== $('help')))return;
  if(k==='KeyP'){e.preventDefault();if(!e.repeat)togglePause();return}
  if((k==='Enter'||k==='Space')&&!$('overlay').hidden){e.preventDefault();if(!e.repeat)startAction();return}
  if(keys[k]){e.preventDefault();if(!e.repeat)press(k,keys[k])}
});
document.addEventListener('keyup',e=>release(code(e)));
$('start').onclick=startAction;$('pause').onclick=()=>{togglePause();$('pause').blur()};
$('sound').onclick=()=>{sound=!sound;$('sound').setAttribute('aria-pressed',sound);$('sound').textContent=sound?'Sound on':'Sound off';if(sound)initAudio();$('sound').blur()};
$('help').onclick=()=>{if(!paused&&['seed','fly','loss'].includes(phase))togglePause();$('instructions').showModal()};
$('close').onclick=()=>$('instructions').close();
function suspend(){clearControls();if(!paused&&['seed','fly','loss'].includes(phase))togglePause()}
window.addEventListener('blur',suspend);
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend()});
new ResizeObserver(resize).observe(canvas);resize();
let lastTime,buffer=0;
function frame(now){
  if(lastTime!==undefined)buffer+=Math.min(.10,(now-lastTime)/1000);
  lastTime=now;
  while(buffer>=1/90){simulate(1/90);buffer-=1/90}
  render();requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
