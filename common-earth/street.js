/* The district is built in local map units. Plot numbers are stable across visits. */
(() => {
  'use strict';

  const SIDE = 24;
  const BLOCK = 6;
  const HALF_ROAD = .87;
  const STEP = .45;
  const WALK_SPEED = 3.15;
  const DRIVE_SPEED = 6.7;
  const TILT = .51;
  const AXIS = {up:[-1,-1], down:[1,1], left:[-1,1], right:[1,-1]};
  const KEYS = {ArrowUp:'up', w:'up', ArrowDown:'down', s:'down', ArrowLeft:'left', a:'left', ArrowRight:'right', d:'right'};
  const PLOTS = Array.from({length:9},(_,i)=>[i%3,Math.floor(i/3)]);
  const HOMES = window.EarthShifts?.district.homes || [[1,3],[3,2],[3,3]];
  const MARKET = window.EarthShifts?.district.market || [2,3];
  const marketDoor = () => entry(MARKET);
  const vanAtExchange = () => ({...add(marketDoor(),1.8,.7),dx:1,dy:0});
  const ELMS = ['#549487','#478979','#668d78','#87a27a'];
  const COATS = ['#e6ac77','#94b7d0','#db9794'];
  // The cooperative's supply vehicle follows the streets and serves four kerbs.
  const SERVICE_LOOP=[[15,24,'Market exchange'],[9,24,'Pantry stop'],[6,24],[6,12],[0,12],[0,0],[18,0],[18,18],[21,18,'Repair stop'],[24,18],[24,24],[21,24,'Assembly stop']];
  const clamp = (n, min, max) => Math.min(max, Math.max(min,n));
  const dist = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);
  const centre = block => ({x:block[0]*BLOCK+3,y:block[1]*BLOCK+3});
  const entry = block => ({x:block[0]*BLOCK+3, y:block[1]*BLOCK+5.04});
  const add = (p,x,y) => ({x:p.x+x,y:p.y+y});
  function hash(str) {
    let n = 2166136261;
    for (const char of String(str)) n = Math.imul(n ^ char.charCodeAt(0), 16777619);
    return n >>> 0;
  }
  const SKIN=[['#c49170','#a7795e','#d5a784'],['#aa7556','#895c48','#b88865'],['#dfb698','#bc9074','#e9c6a5'],['#95674e','#795342','#ab7d5d'],['#bd8a67','#a17156','#ca9f79'],['#ca9778','#ad7a60','#d8ad8c']];
  const HAIR=['#453d36','#4c4b42','#6f5240','#6b665b','#3c3b36','#9b9584'];
  const CLOTH=[['#d99d68','#a97856','#e9bb83'],['#8ca9c0','#627f95','#adcad4'],['#ce9090','#9c6d70','#e4aea4']];
  function appearance(site,r){
    const seed=hash(`${r.name}/${r.id}/${site.id}`),slot=Number.isInteger(r.slot)?r.slot:Math.max(0,site.residents?.findIndex(p=>p.id===r.id)||0);
    return {skin:SKIN[(hash(site.id)+slot*2+((seed>>>7)&1))%SKIN.length],hair:HAIR[(seed>>>5)%HAIR.length],style:((seed>>>11)+slot)%4,glasses:((seed>>>14)%7)===0,cloth:CLOTH[slot%3],slot};
  }
  function portrait(canvas,site,resident){
    if(!canvas?.getContext||!site||!resident)return false;
    const a=appearance(site,resident),ctx=canvas.getContext('2d');if(!ctx)return false;
    canvas.width=48;canvas.height=48;canvas.style.imageRendering='pixelated';ctx.imageSmoothingEnabled=false;
    const r=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
    const shape=(pts,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)ctx.lineTo(...pts[i]);ctx.closePath();ctx.fill();};
    r(0,0,48,48,'#294444');r(0,0,48,2,'#537167');r(0,31,48,17,'#233b3a');
    // The portrait and world sprite use the same complexion, hairstyle and work clothes.
    shape([[3,48],[3,43],[7,43],[7,38],[16,35],[20,34],[28,34],[34,36],[40,39],[44,43],[44,48]],a.cloth[1]);
    shape([[7,48],[7,43],[10,43],[10,39],[18,36],[25,37],[30,36],[38,38],[39,41],[42,42],[42,48]],a.cloth[0]);
    r(19,29,10,9,a.skin[1]);r(21,29,7,7,a.skin[0]);
    if(a.slot===0){shape([[13,38],[16,37],[19,43],[29,43],[32,37],[35,38],[33,48],[15,48]],'#677e68');r(21,45,7,2,'#91a184');}
    if(a.slot===1){shape([[16,35],[20,35],[25,39],[21,42]],a.cloth[2]);shape([[29,35],[33,36],[27,42],[25,39]],a.cloth[1]);r(33,42,4,2,a.cloth[2]);}
    if(a.slot===2){shape([[15,36],[19,34],[23,38],[29,36],[31,35],[32,38],[27,41],[19,40]],'#c6ab74');r(20,40,3,8,'#b09266');}
    shape([[13,12],[15,8],[19,7],[20,6],[29,6],[32,8],[35,12],[35,22],[33,27],[32,29],[29,32],[21,33],[18,31],[16,28],[14,27],[13,22]],a.hair);
    r(12,18,4,6,a.skin[1]);r(32,18,4,6,a.skin[1]);
    shape([[15,14],[17,11],[29,11],[32,14],[33,16],[33,23],[31,28],[28,31],[23,32],[19,30],[16,27],[15,23]],a.skin[0]);
    shape([[30,13],[33,15],[33,23],[31,28],[28,31],[22,32],[20,30],[26,30],[29,27],[30,23]],a.skin[1]);
    r(16,16,8,2,a.skin[2]);r(18,19,5,1,a.hair);r(27,19,4,1,a.hair);r(20,21,2,2,'#3e3a32');r(28,21,2,2,'#3e3a32');r(24,23,2,2,a.skin[1]);r(22,27,5,1,'#875e50');r(23,28,3,1,a.skin[2]);
    if(a.style===0){shape([[13,16],[14,10],[17,7],[22,6],[29,7],[33,9],[34,14],[31,13],[31,11],[25,11],[23,14],[17,14],[17,18],[14,19]],a.hair);}
    if(a.style===1){for(const [x,y] of [[13,12],[14,8],[18,6],[23,5],[28,6],[31,9],[32,12]]){r(x,y,5,5,a.hair);r(x+1,y-1,3,7,a.hair);}r(14,14,3,5,a.hair);}
    if(a.style===2){shape([[13,15],[13,11],[15,8],[20,5],[28,5],[33,8],[35,14],[32,16],[30,12],[27,10],[23,12],[17,13],[16,17]],a.hair);r(32,7,5,5,a.hair);r(33,8,5,3,a.hair);}
    if(a.style===3){shape([[13,14],[14,10],[16,8],[21,6],[28,6],[32,8],[34,12],[34,15],[30,11],[25,10],[20,13],[16,14],[16,17]],a.hair);r(14,11,6,2,a.cloth[2]);r(20,9,7,2,a.cloth[2]);r(27,10,5,2,a.cloth[2]);}
    if(a.glasses){for(const x of [17,26]){r(x,20,6,1,'#556361');r(x,23,6,1,'#556361');r(x,20,1,4,'#556361');r(x+5,20,1,4,'#556361');}r(23,21,3,1,'#556361');}
    return true;
  }
  function noise(seed,x,y=0) {
    let h = Math.imul((x*7919)|0,374761393)^Math.imul((y*6607)|0,668265263)^seed;
    h=Math.imul(h^(h>>>13),1274126177);
    return ((h^(h>>>16))>>>0)/4294967296;
  }
  function streetDistance(n) { return Math.abs(n - Math.round(n / BLOCK) * BLOCK); }
  function road(x,y) { return streetDistance(x) < HALF_ROAD || streetDistance(y) < HALF_ROAD; }
  function returnPoint(site) {
    const at=site?.shift?.at;
    if(at?.type==='resident'){
      const slot=site.residents.find(r=>r.id===at.residentId)?.slot;
      if(HOMES[slot])return entry(HOMES[slot]);
    }
    if(at?.type==='building'&&PLOTS[at.plot])return entry(PLOTS[at.plot]);
    return marketDoor();
  }
  function siteKey(s) { return s?`${s.id}/${s.lat}/${s.lon}`:null; }
  function sameBlock(a,b) { return a[0]===b[0] && a[1]===b[1]; }
  function coords(event,canvas) {
    const bounds=canvas.getBoundingClientRect();
    return {x:event.clientX-bounds.left,y:event.clientY-bounds.top};
  }

  function mount(canvas, options={}) {
    if (!canvas || !canvas.getContext) throw new TypeError('EarthStreet needs a canvas.');
    let ctx=canvas.getContext('2d');
    const state={site:null,seed:0,lots:[],points:[],solids:[],trees:[],decor:[],links:[],looks:new Map(),traffic:null,preview:null,companion:null,shiftStops:[],placed:null,mode:'walk',player:{...marketDoor(),dx:0,dy:1},van:vanAtExchange(),route:[],destination:null,arrival:null,hover:null,active:null};
    let width=0,height=0,unit=30,zoom=1,pixelRatio=1,centreX=state.player.x,centreY=state.player.y;
    let frame=0,idleTimer=0,lastFrame=0,visualTime=0,dirty=true,alive=true,visible=true;
    let shortMessage='',messageUntil=0,hovering=false;
    let savedZoom=null,overviewZoom=null,placingFocus=0,dragging=null,pinch=null,groundCache=null;
    let miniCanvas=null,miniButton=null,miniTick=-1;
    const fitZoom=()=>clamp(Math.min(width/57,height/33)/baseUnit(),.29,1.55);
    const fingers=new Map(),pressed=new Set();
    const reduced=typeof matchMedia==='function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const visits=new Map();
    const cleanups=[];
    const listen=(element,name,fn,opts)=>{
      const update=event=>{fn(event);if(dirty)schedule();};
      element.addEventListener(name,update,opts);cleanups.push(()=>element.removeEventListener(name,update,opts));
    };
    const baseUnit=()=>clamp(width*.028+height*.014,19,37);
    function screen(x,y,z=0) {
      const sx=width*.5+(x-y-centreX+centreY)*unit;
      const sy=height*.53+(x+y-centreX-centreY)*unit*TILT-z*unit;
      return [sx,sy];
    }
    function world(px,py) {
      const u=(px-width*.5)/unit, v=(py-height*.53)/(unit*TILT);
      return {x:centreX+(u+v)/2,y:centreY+(v-u)/2};
    }
    const path=(points,fill,stroke,lw=1)=>{
      if (!points.length) return;
      ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
      for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
      if(fill){ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}
    };
    const poly=(vertices,fill,stroke,lw=1)=>path(vertices.map(v=>screen(v[0],v[1],v[2]||0)),fill,stroke,lw);
    const rect=(x,y,w,d,z,fill,stroke,lw=1)=>poly([[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z]],fill,stroke,lw);
    const line=(x1,y1,z1,x2,y2,z2,color,lw=1)=>path([screen(x1,y1,z1),screen(x2,y2,z2)],null,color,lw);
    function ellipse(x,y,rx,ry,fill,stroke) {
      ctx.beginPath();ctx.ellipse(x,y,Math.max(.05,rx),Math.max(.05,ry),0,0,Math.PI*2);
      if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
    }
    function sphere(x,y,z,rx,ry,fill) { const p=screen(x,y,z);ellipse(p[0],p[1],unit*rx,unit*ry,fill); }
    function text(x,y,label,color,size=11,weight=600) {
      ctx.font=`${weight} ${size}px system-ui, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(label,x,y);
    }
    function box(x,y,w,d,z,h,top,left,right) {
      poly([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]],left);
      poly([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]],right);
      rect(x,y,w,d,z+h,top);
    }
    function shadow(x,y,w,d,h) {
      poly([[x+.15,y+.2],[x+w+.12,y+.18],[x+w+.62*h,y+d+.16*h],[x+.48*h,y+d+.35*h],[x,y+d]],'rgba(6,24,30,.25)');
    }
    function windows(x,y,w,d,z,h,count=3) {
      const ww=w/(count*2+.6), wh=Math.min(.48,h*.4);
      for(let i=0;i<count;i++){
        const a=x+(i+.48)*w/count-ww/2, b=y+(i+.55)*d/count-ww/2;
        poly([[a,y+d+.012,z],[a+ww,y+d+.012,z],[a+ww,y+d+.012,z+wh],[a,y+d+.012,z+wh]],i%3===0?'#e8c38c':'#375e63');
        line(a+ww*.49,y+d+.016,z,a+ww*.49,y+d+.016,z+wh,'#73887a',Math.max(.55,unit*.035));
        poly([[x+w+.012,b,z],[x+w+.012,b+ww,z],[x+w+.012,b+ww,z+wh],[x+w+.012,b,z+wh]],i%2?'#aeb19a':'#4c7170');
      }
    }
    function gable(x,y,w,d,h,eave,roofA,roofB) {
      const oy=.13, ox=.13, mid=y+d/2;
      poly([[x+w,y,h],[x+w,y+d,h],[x+w,mid,h+eave]],'#aa9b7e');
      poly([[x-ox,y-oy,h],[x+w+ox,y-oy,h],[x+w+ox,mid,h+eave],[x-ox,mid,h+eave]],roofA);
      poly([[x-ox,mid,h+eave],[x+w+ox,mid,h+eave],[x+w+ox,y+d+oy,h],[x-ox,y+d+oy,h]],roofB);
      for(let t=.24;t<w;t+=.34)line(x+t,mid,h+eave+.01,x+t,y+d+oy,h+.015,'rgba(16,38,44,.20)',Math.max(.5,unit*.02));
      line(x-ox,mid,h+eave,x+w+ox,mid,h+eave,'#c4b292',Math.max(.7,unit*.035));
    }
    function plant(x,y,size,seed,palm=false) {
      const [sx,sy]=screen(x+.21*size,y+.07*size);
      ellipse(sx,sy,unit*.64*size,unit*.22*size,'rgba(13,38,37,.20)');
      line(x,y,0,x,y,.98*size,'#665d47',Math.max(1.3,unit*.105*size));
      if(palm){
        const crown=screen(x,y,1.12*size),c=ELMS[seed%4];
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4, dx=Math.cos(a)*size*unit*.7, dy=Math.sin(a)*size*unit*.38;
          path([crown,[crown[0]+dx*.55-dy*.18,crown[1]+dy*.55-dx*.18-size*unit*.18],[crown[0]+dx,crown[1]+dy+size*unit*.13],[crown[0]+dx*.52+dy*.08,crown[1]+dy*.55+dx*.08]],i%2?c:'#375f54');
        }
      }else{
        sphere(x,y,1.07*size,.61*size,.63*size,'#365e56');
        sphere(x-.13*size,y+.03*size,1.24*size,.48*size,.5*size,ELMS[seed%4]);
        sphere(x-.27*size,y,1.43*size,.25*size,.18*size,'rgba(186,196,140,.23)');
      }
    }
    function roofPanel(x,y,z,w,d) {
      rect(x,y,w,d,z,'#2c505d','#82a8a5',Math.max(.6,unit*.024));
      for(let i=1;i<4;i++)line(x+w*i/4,y,z+.003,x+w*i/4,y+d,z+.003,'#678793',Math.max(.5,unit*.018));
      line(x,y+d/2,z+.004,x+w,y+d/2,z+.004,'#678793',Math.max(.5,unit*.018));
    }
    function residence(item) {
      const {x,y,index:i}=item; const w=2.52,d=2.18,h=[1.46,2.08,1.63][i];const px=x-w/2,py=y-d/2;
      shadow(px,py,w,d,h);box(px,py,w,d,0,h,'#bba682',['#b99877','#9bada0','#b7ac89'][i],['#887c6a','#728f85','#959278'][i]);
      windows(px,py,w,d,.49,h,i===1?3:2);if(i===1)windows(px,py,w,d,1.45,h,3);
      if(i===1){rect(px-.12,py-.12,w+.24,d+.24,h+.07,'#76948e');roofPanel(px+.25,py+.2,h+.09,1.45,.86);box(px+.42,py+1.29,.65,.45,h+.09,.28,'#aba48d','#7c8c84','#617974');}
      else{gable(px,py,w,d,h,.64,i===0?'#bc815e':'#77978d',i===0?'#995f4b':'#55766f');box(px+w*.7,py+d*.66,.25,.28,h+.25,.48,'#b2a58d','#9b8774','#786e64');}
      const doorX=px+w*.53;
      poly([[doorX,py+d+.022,0],[doorX+.4,py+d+.022,0],[doorX+.4,py+d+.022,.84],[doorX,py+d+.022,.84]],'#445d55');
      box(doorX-.15,py+d+.03,.69,.3,0,.14,'#ccbd9a','#a69883','#887e70');
      if(i===0||i===2){box(px+.02,py+d+.015,.68,.24,.43,.18,'#6c9270','#86745c','#77654e');}
    }
    function market(item,small=false) {
      const {x,y}=item, w=small?2.4:3.05,d=small?1.7:2.12,h=small?1.03:1.48,px=x-w/2,py=y-d/2;
      shadow(px,py,w,d,h);box(px,py,w,d,0,h,'#b6a37a','#b99971','#8d8368');
      windows(px,py,w,d,.46,h,3);gable(px,py,w,d,h,.42,'#75857a','#536e66');
      for(let i=0;i<8;i++){const q=px+w*i/8;poly([[q,py+d+.01,h-.18],[q+w/8,py+d+.01,h-.18],[q+w/8,py+d+.72,h-.45],[q,py+d+.72,h-.45]],i%2?'#d6c399':'#b66f50');}
      [px+.12,px+w-.12].forEach(q=>line(q,py+d+.65,.03,q,py+d+.65,h-.4,'#8e7557',Math.max(1.2,unit*.055)));
      box(px+.18,py+d+.14,w-.36,.39,0,.48,'#b39468','#8c7354','#6c5d49');
      for(let i=0;i<5;i++)box(px+.21+i*(w-.38)/5,py+d+.16,(w-.55)/5,.32,.48,.12,['#d0a25f','#a5ac6e','#aa7353'][i%3],'#8e7351','#76694c');
    }
    function civic(item) {
      const {x,y,kind}=item;
      if(kind==='garden'){
        for(let row=0;row<4;row++){
          const a=x-1.58+row*.78;box(a,y-1.46,.6,2.93,0,.15,'#786f4e','#726a51','#5a614d');
          for(let col=0;col<9;col++)sphere(a+.3,y-1.25+col*.30,.22,.16,.11,['#73985c','#92a871','#bf9c69','#72927a'][row]);
        }return;
      }
      if(kind==='wetland'){
        const [sx,sy]=screen(x,y);ellipse(sx,sy,unit*1.74,unit*.91,'#4b8b89','#8cab95');
        for(let i=0;i<24;i++){const a=i*2.4,b=.68+noise(state.seed,i,72)*.65,c=x+Math.cos(a)*b,e=y+Math.sin(a)*b;
          line(c,e,.02,c+.04,e-.08,.24+noise(state.seed,i)*.27,'#9ead78',Math.max(.8,unit*.04));}
        rect(x-1.65,y+1.16,3.4,.47,.12,'#b49c77');return;
      }
      if(kind==='market')return market(item,true);
      if(kind==='pier'){
        for(let i=0;i<12;i++)box(x-1.68+i*.28,y-.54,.252,1.4,0,.31,'#bcaa85','#7b7762','#8b8067');
        for(let i=0;i<4;i++)for(const sy of [-.63,.95])box(x-1.56+i*1.01,y+sy,.095,.095,0,.87,'#c4ac7f','#897e64','#746c57');
        for(const sy of [-.58,1.0])line(x-1.52,y+sy,.8,x+1.5,y+sy,.8,'#baa57d',Math.max(1,unit*.05));return;
      }
      const w=kind==='hall'?2.85:2.7,d=kind==='hall'?2.15:2.4,h=kind==='hall'?1.85:1.36,px=x-w/2,py=y-d/2;
      shadow(px,py,w,d,h);box(px,py,w,d,0,h,'#939d85',kind==='hall'?'#bdad87':'#9f9d82',kind==='hall'?'#9a947a':'#768a79');windows(px,py,w,d,.55,h,4);
      if(kind==='hall'){
        box(px-.1,py-.1,w+.2,d+.2,h,.12,'#7d998b','#647e73','#5d746a');
        box(x-.47,y-.45,.94,.9,h+.13,.55,'#a3a997','#aa9c81','#898c78');gable(x-.47,y-.45,.94,.9,h+.68,.36,'#c59569','#a57a58');
        for(let i=0;i<3;i++)box(px+.21+i*.95,py+d+.09,.14,.18,0,1.1,'#c5bc9c','#aba184','#948774');
        rect(px+.05,py+d-.03,w-.1,.55,1.13,'#aab7a0');
      }else{
        rect(px-.07,py-.07,w+.14,d+.14,h+.035,'#728b80');roofPanel(px+.17,py+.19,h+.05,w*.67,d*.6);
        for(let j=0;j<2;j++)box(px+w-.45,py+.38+j*.7,.27,.32,h,.58,'#b4b39b','#8c9180','#737f72');
        poly([[px+.3,py+d+.01,0],[px+1.6,py+d+.01,0],[px+1.6,py+d+.01,.98],[px+.3,py+d+.01,.98]],'#5d7168');
        for(let q=.1;q<.9;q+=.15)line(px+.3,py+d+.014,q,px+1.6,py+d+.014,q,'#78877b',Math.max(.6,unit*.025));
      }
    }
    function bench(x,y) {
      for(let i=0;i<3;i++)box(x-.42,y-.19+i*.13,.84,.08,.18,.06,'#b7a17d','#8b775f','#776e59');
      line(x-.29,y-.07,0,x-.29,y-.07,.22,'#515f56',Math.max(1,unit*.055));line(x+.29,y-.07,0,x+.29,y-.07,.22,'#515f56',Math.max(1,unit*.055));
    }
    function kiosk(x,y) {
      box(x-.49,y-.37,.98,.74,0,1.05,'#7e9687','#a0aa91','#7c9281');
      rect(x-.66,y-.52,1.32,1.04,1.12,'#71867c');
      poly([[x-.32,y+.375,.45],[x+.32,y+.375,.45],[x+.32,y+.375,.88],[x-.32,y+.375,.88]],'#385553');
    }
    function lamp(x,y) {
      line(x,y,.03,x,y,1.33,'#53685b',Math.max(1,unit*.052));
      line(x,y,1.32,x+.21,y,1.45,'#687869',Math.max(.8,unit*.049));sphere(x+.22,y,1.42,.105,.057,'#e6c98e');
    }
    function districtData() {
      const s=state.site,seed=state.seed;
      state.lots=PLOTS.map((block,plot)=>({block,plot,...centre(block),building:(s?.buildings||[]).find(b=>Number(b.plot)===plot)||null}));
      state.solids=[];state.points=[];state.trees=[];state.decor=[];state.links=s?(window.CommonEarthSim?.productiveLinks?.(s)||[]):[];state.preview=null;
      state.looks=new Map((s?.residents||[]).map(r=>[r.id,appearance(s,r)]));
      if(!s){state.lots=[];state.traffic=null;clearGround();return;}
      if(state.traffic?.site!==siteKey(s)){
        const n=8,p=SERVICE_LOOP[n];state.traffic={site:siteKey(s),leg:n,distance:0,x:p[0],y:p[1]+.29,dx:1,dy:0,speed:0,wait:1.6,yielding:false};
      }
      const solid=(p,w,d)=>state.solids.push([p.x-w/2,p.y-d/2,p.x+w/2,p.y+d/2]);
      const point=(type,block,extra={})=>{const p=entry(block);state.points.push({type,block,...p,...extra});};
      solid(centre(MARKET),3.1,2.9);point('market',MARKET,{label:'Market exchange',actionId:'courier:pick',icon:'market'});
      HOMES.forEach((block,i)=>{
        const p=centre(block),r=s?.residents?.[i];solid(p,2.54,2.25);
        if(r)point('resident',block,{residentId:r.id,label:r.name||'Neighbour',icon:'person',index:i});
      });
      for(const lot of state.lots){
        if(lot.building){
          const {kind,id,name}=lot.building;
          if(!['wetland','garden','pier'].includes(kind))solid(lot,3.12,2.84);
          point('building',lot.block,{buildingId:id,plot:lot.plot,kind,label:name||kind,icon:'building'});
        }
      }
      for(let by=0;by<4;by++)for(let bx=0;bx<4;bx++){
        const block=[bx,by],cell=by*4+bx, p=centre(block), lot=state.lots.find(l=>sameBlock(l.block,block));
        const park=!lot&&!sameBlock(block,MARKET)&&!HOMES.some(home=>sameBlock(home,block));
        const n=park?7:(!lot||lot.building)?1:2;
        for(let i=0;i<n;i++){
          const tx=park?p.x-1.7+noise(seed,cell*23+i,11)*3.4:p.x+(i%2?1:-1)*(1.37+noise(seed,cell,9)*.45);
          const ty=park?p.y-1.66+noise(seed,cell*37+i,23)*3.2:p.y-1.5+noise(seed,cell*29+i,33)*.62;
          if(park&&Math.abs(tx-p.x)<.55)continue;
          state.trees.push({x:tx,y:ty,size:(park?.86:.70)+noise(seed,cell+i*11,2)*.47,index:Math.floor(noise(seed,cell,i)*4),palm:Math.abs(s?.lat??40)<27&&i%3===0});
        }
        if(park){state.decor.push({type:'bench',x:p.x+.42,y:p.y+.85});if(bx===3&&by===0)state.decor.push({type:'kiosk',x:p.x+.07,y:p.y-.4});}
        if(bx%2===by%2)state.decor.push({type:'lamp',x:p.x+2.06,y:p.y+1.94});
      }
      clearGround();dirty=true;
    }
    function landscape() {
      // The same exchange opens onto a working waterfront or an inland green belt.
      if(state.site?.water){
        for(let k=0;k<4;k++){
          const px=3+6*k,py=SIDE+1.12;
          for(let i=0;i<9;i++)rect(px-.46,py+i*.26,.94,.236,-.13,'#9c9277');
          for(const sx of [-.48,.48])for(const sy of [.12,1.13,2.19])box(px+sx,py+sy,.09,.09,-.42,.69,'#c2b696','#7d816c','#656d60');
          line(px-.44,py+.18,.17,px-.44,py+2.24,.17,'#b7b09a',Math.max(.5,unit*.04));
        }
        return;
      }
      const cold=Math.abs(state.site?.lat||0)>57;
      for(let tier=0;tier<2;tier++){
        const margin=6.77-tier*1.16, contour=[];
        for(let edge=0;edge<4;edge++)for(let k=0;k<12;k++){
          const x=-margin+k*(SIDE+margin*2)/12,y=SIDE+margin+.9*noise(state.seed,edge*12+k,64+tier);
          const v=edge===0?[x,y]:edge===1?[y,SIDE-x]:edge===2?[SIDE-x,SIDE-y]:[SIDE-y,x];contour.push([...v,-.47]);
        }
        poly(contour,tier?'#536f60':'#3b564a');
      }
      for(let edge=0;edge<4;edge++)for(let k=0;k<4;k++){
        const n=k*BLOCK,depth=2+noise(state.seed,edge,10+k)*1.45;
        const verts=[[n-1.03,SIDE+1.23],[n+4.9,SIDE+1.23],[n+4.56,SIDE+depth+1.27],[n+3.44,SIDE+depth+2.15],[n+1.12,SIDE+depth+2.42],[n-.76,SIDE+depth+1.26]];
        const rot=([x,y])=>edge===0?[x,y]:edge===1?[SIDE-y,x]:edge===2?[SIDE-x,SIDE-y]:[y,SIDE-x];
        const ring=verts.map(rot);poly(ring.map(v=>[...v,-.41]),cold?'#788d83':(k+edge)%2?'#647f6a':'#6e876f');
        if((k+edge)%3===0){
          for(let row=0;row<10;row++){const a=rot([n-.38+row*.47,SIDE+1.63]),b=rot([n-.38+row*.47,SIDE+depth+1.03]);
            line(...a,-.36,...b,-.36,'#9aa382',Math.max(.8,unit*.087));}
        }else{
          for(let i=0;i<8;i++){const xx=n+noise(state.seed,i+k*16,edge+1)*4.28-.3,yy=SIDE+1.55+noise(state.seed,i*11+edge,k+3)*1.76;
            const [x,y]=rot([xx,yy]);line(x,y,-.35,x+.09,y,-.15,'#99a480',Math.max(.7,unit*.044));}
        }
      }
    }
    function skiff(x,y,paint,large) {
      const a=large?1.34:.89,b=large?.42:.31;
      // Scale and wake distinguish the daily ferry from work boats.
      const shape=[[x-a,y],[x-a*.57,y-b],[x+a*.65,y-b],[x+a,y-b*.38],[x+a,y+b*.45],[x+a*.57,y+b],[x-a*.54,y+b]];
      poly(shape.map(([xx,yy])=>[xx,yy+.07,-.49]),'#749991');
      poly(shape.map(([xx,yy])=>[xx,yy,-.41]),'#354f53');
      poly(shape.map(([xx,yy])=>[xx,yy,-.27]),paint,'#b1bdab',Math.max(.6,unit*.031));
      box(x-a*.25,y-b*.63,a*.88,b*1.2,-.25,large?.36:.2,'#dfd1a4','#8caca1','#6f9188');
      if(large){roofPanel(x-a*.14,y-b*.51,.115,a*.58,b*.79);for(let i=0;i<4;i++)rect(x-a*.81+i*.15,y-b*.38,.09,.25,-.24,'#a98b62');}
    }
    function exchangeDetails(p){
      // Produce baskets and a public noticeboard make the market readable from the street.
      for(let i=0;i<3;i++){
        const x=p.x-1.63+i*.32,y=p.y+1.38;
        box(x,y,.27,.29,0,.17,'#af9265','#917a55','#7e7254');
        for(let k=0;k<3;k++)sphere(x+.06+k*.064,y+.12,.19,.055,.05,i%2?'#91aa74':'#d1a365');
      }
      const x=p.x+1.83,y=p.y+.5;
      for(const off of [0,.61])line(x+off,y,.02,x+off,y,.99,'#6b6c54',Math.max(.9,unit*.054));
      poly([[x-.07,y,.43],[x+.69,y,.43],[x+.69,y,1.06],[x-.07,y,1.06]],'#a38e66','#69755e',Math.max(.65,unit*.035));
      for(let i=0;i<3;i++)poly([[x+.02+i*.2,y+.016,.63],[x+.18+i*.2,y+.016,.63],[x+.18+i*.2,y+.016,.9-i*.04],[x+.02+i*.2,y+.016,.9-i*.04]],i%2?'#9caca0':'#d6cca1');
    }
    function ground() {
      landscape();
      const s=state.site,water=Boolean(s?.water),dry=Math.abs(s?.lat||40)<32;
      const cold=Math.abs(s?.lat||0)>57;
      const grass=water?'#92a295':cold?'#a9b9a5':dry?'#a2a77a':'#89a68a';
      const rim=water?'#5b827d':'#658678';
      const top=-1.26,span=SIDE+2.52;
      box(top-.14,top-.14,span+.28,span+.28,-.48,.42,rim,'#55756d','#486a66');
      rect(top,top,span,span,-.03,grass);
      if(water){for(let i=0;i<5;i++)for(let j=0;j<3;j++)box(i*BLOCK-.34+j*.25,SIDE+1.29,.19,.17,-.39,.41,'#a9a28c','#6f8179','#586e69');}
      for(let i=0;i<5;i++){
        const p=i*BLOCK;
        rect(p-1.14,top,2.28,span,0,'#a7ac98');rect(top,p-1.14,span,2.28,0,'#a7ac98');
      }
      for(let i=0;i<5;i++){
        const p=i*BLOCK;
        rect(p-HALF_ROAD,top,HALF_ROAD*2,span,.003,'#546b66');rect(top,p-HALF_ROAD,span,HALF_ROAD*2,.003,'#546b66');
      }
      for(let by=0;by<4;by++)for(let bx=0;bx<4;bx++){
        const block=[bx,by],p=centre(block),lot=state.lots.find(l=>sameBlock(l.block,block));
        const hard=sameBlock(block,MARKET)||HOMES.some(b=>sameBlock(b,block))||['market','hall','workshop'].includes(lot?.building?.kind);
        const base=hard?'#b6b69c':water?((bx+by)%2?'#a3a991':'#aab298'):cold?((bx+by)%2?'#aec1af':'#b3c2ac'):(bx+by)%2?'#92a68a':'#9dad8d';
        rect(p.x-1.84,p.y-1.84,3.68,3.68,.005,base);
        if(hard){for(let a=-1.47;a<1.8;a+=.45)line(p.x-1.82,p.y+a,.007,p.x+1.82,p.y+a,.007,'rgba(107,117,97,.15)',.7);}
        if(lot&&!lot.building){
          for(let i=0;i<24;i++){const a=p.x-1.73+noise(state.seed,lot.plot*101+i,4)*3.43,b=p.y-1.73+noise(state.seed,lot.plot*101+i,8)*3.43;
            line(a,b,.01,a+.07,b,.10,'rgba(77,110,77,.34)',Math.max(.7,unit*.027));}
          for(const xx of [-1,1])for(const yy of [-1,1]){line(p.x+xx*1.57,p.y+yy*1.57,.01,p.x+xx*1.33,p.y+yy*1.57,.01,'#c9c39e',Math.max(.7,unit*.045));line(p.x+xx*1.57,p.y+yy*1.57,.01,p.x+xx*1.57,p.y+yy*1.33,.01,'#c9c39e',Math.max(.7,unit*.045));}
        }
        for(let j=0;j<4;j++){
          const f=.98+j*.18;
          if(by<4&&bx<3)rect((bx+1)*BLOCK-.71,by*BLOCK+f,1.42,.085,.012,'#c6c4aa');
          if(bx<4&&by<3)rect(bx*BLOCK+f,(by+1)*BLOCK-.71,.085,1.42,.012,'#c6c4aa');
        }
      }
      for(let i=0;i<5;i++)for(let j=0;j<4;j++)for(let k=0;k<3;k++){
        const a=j*BLOCK+2.04+k*.94,b=i*BLOCK;
        rect(a,b-.026,.48,.052,.012,'#a7a992');rect(b-.026,a,.052,.48,.012,'#a7a992');
      }
      streetName(15,24.44,'EXCHANGE ST','x');streetName(6.4,9,'GARDEN WALK','y');streetName(8.9,12.43,'COMMONS RD','x');
      for(let i=0;i<4;i++){
        const p=i*BLOCK+3;rect(p-.66,SIDE+1.15,1.32,.14,.07,'#bba982');rect(SIDE+1.15,p-.66,.14,1.32,.07,'#bba982');
      }
    }
    function clearGround() {
      if(!groundCache)return;
      if(typeof groundCache.tile.close==='function')groundCache.tile.close();
      else {groundCache.tile.width=1;groundCache.tile.height=1;}
      groundCache=null;
    }
    function cachedGround() {
      if(typeof document==='undefined'||!document.createElement){ground();return;}
      const targetUnit=clamp(16*Math.pow(Math.SQRT2,Math.round(Math.log(unit/16)/Math.log(Math.SQRT2))),8,50);
      if(!groundCache||Math.abs(groundCache.unit-targetUnit)>.02){
        clearGround();
        const prior={w:width,h:height,x:centreX,y:centreY,u:unit,ctx};
        const gw=Math.ceil(84*targetUnit),gh=Math.ceil(43*targetUnit);
        const bitmapCapable=typeof OffscreenCanvas==='function'&&typeof OffscreenCanvas.prototype.transferToImageBitmap==='function';
        const tile=bitmapCapable?new OffscreenCanvas(gw,gh):document.createElement('canvas');
        if(!bitmapCapable){tile.width=gw;tile.height=gh;}
        const tileCtx=tile.getContext('2d');
        if(!tileCtx){ground();return;}
        ctx=tileCtx;width=gw;height=gh;unit=targetUnit;centreX=12;centreY=12;
        try{ground();}finally{width=prior.w;height=prior.h;unit=prior.u;centreX=prior.x;centreY=prior.y;ctx=prior.ctx;}
        const texture=bitmapCapable?tile.transferToImageBitmap():tile;
        groundCache={unit:targetUnit,tile:texture,w:gw,h:gh};
      }
      const p=screen(12,12),scale=unit/groundCache.unit,w=groundCache.w*scale,h=groundCache.h*scale;
      const left=p[0]-w*.5,top=p[1]-h*.53,x=Math.max(0,left),y=Math.max(0,top);
      const dw=Math.min(width,left+w)-x,dh=Math.min(height,top+h)-y;
      if(dw>0&&dh>0)ctx.drawImage(groundCache.tile,(x-left)/scale,(y-top)/scale,dw/scale,dh/scale,x,y,dw,dh);
    }

    function streetName(x,y,name,direction){
      if(unit<16)return;
      const p=screen(x,y,.014);ctx.save();ctx.translate(...p);ctx.rotate(direction==='x'?Math.atan(TILT):-Math.atan(TILT));
      ctx.font=`600 ${clamp(unit*.22,4.5,11)}px system-ui,sans-serif`;ctx.fillStyle='rgba(232,227,198,.61)';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(name,0,0);ctx.restore();
    }
    function background() {
      const water=state.site?.water, a=water?'#244b56':'#293e3a',b=water?'#173b49':'#1d3433';
      const grad=ctx.createLinearGradient(0,0,width,height);grad.addColorStop(0,a);grad.addColorStop(1,b);ctx.fillStyle=grad;ctx.fillRect(0,0,width,height);
      if(water){
        for(let i=0;i<90;i++){const sx=noise(state.seed,i,990)*width,sy=noise(state.seed,i,661)*height,t=reduced?0:visualTime*.42+i;
          const len=3+12*noise(state.seed,i,34);path([[sx-len,sy],[sx,sy+Math.sin(t)*.9],[sx+len*.32,sy-.6]],null,'rgba(147,185,181,.18)',1);}
      }else{
        const color='rgba(135,166,138,.085)';
        for(let i=-4;i<10;i++){const u=i*100;ctx.beginPath();ctx.moveTo(u,-12);ctx.bezierCurveTo(u+92,height*.36,u-100,height*.56,u+65,height+14);ctx.strokeStyle=color;ctx.lineWidth=1;ctx.stroke();}
      }
    }
    function person(x,y,coat,angleX,angleY,walking,phase=0,player=false,look=null) {
      const [sx,sy]=screen(x,y);const k=unit, bob=reduced?0:Math.sin(phase)*walking*.022*k;
      ellipse(sx+.06*k,sy+.01*k,k*.21,k*.09,'rgba(12,34,34,.38)');
      const stride=Math.sin(phase)*walking*.08*k;
      path([[sx-.07*k,sy-.24*k+bob],[sx-.082*k-stride,sy-.025*k]],null,'#394742',Math.max(1.6,k*.105));
      path([[sx+.061*k,sy-.24*k+bob],[sx+.08*k+stride,sy-.025*k]],null,'#42534e',Math.max(1.6,k*.103));
      ellipse(sx,sy-.35*k+bob,k*.154,k*.197,look?.cloth[0]||coat);
      if(look?.slot===0)path([[sx-.086*k,sy-.42*k+bob],[sx+.07*k,sy-.42*k+bob],[sx+.087*k,sy-.25*k+bob],[sx-.067*k,sy-.25*k+bob]],'#687f67');
      if(look?.slot===2)path([[sx-.086*k,sy-.45*k+bob],[sx+.084*k,sy-.41*k+bob]],null,'#c6ab74',Math.max(1,k*.05));
      const headX=sx+clamp(angleX-angleY,-1,1)*.032*k;
      ellipse(headX,sy-.605*k+bob,k*.103,k*.117,look?.skin[0]||(player?'#d1a281':['#c69c7f','#a77d63','#c6ac92'][coat.charCodeAt(1)%3]));
      ellipse(headX-.018*k,sy-.672*k+bob,k*.106,k*.061,look?.hair||(player?'#38483f':'#615e52'));
      if(look?.style===2)ellipse(headX-k*.087,sy-.677*k+bob,k*.051,k*.05,look.hair);
      if(look?.style===3)path([[headX-.09*k,sy-.658*k+bob],[headX+.08*k,sy-.668*k+bob]],null,look.cloth[2],Math.max(.8,k*.034));
      if(player){
        path([[sx-.073*k,sy-.462*k+bob],[sx+.073*k,sy-.30*k+bob]],null,'#f4dfa5',Math.max(1,k*.055));
        if(state.site?.delivery){const ox=sx+k*.075,oy=sy-k*.26+bob;path([[ox,oy],[ox+k*.16,oy-k*.045],[ox+k*.21,oy+k*.045],[ox+k*.05,oy+k*.10]],'#b58e5d','#7b6d52',Math.max(.6,k*.022));}
      }
    }
    function vehicle(item,driver) {
      const {x,y,dx,dy}=item;const alongY=Math.abs(dy)>Math.abs(dx);
      const w=alongY?.67:1.33,d=alongY?1.33:.67,px=x-w/2,py=y-d/2;
      shadow(px,py,w,d,.54);
      for(const f of [.19,.79]){
        if(alongY){const p=screen(px+w+.01,py+d*f,.16);ellipse(p[0],p[1],unit*.105,unit*.123,'#354943');}
        else{const p=screen(px+w*f,py+d+.01,.16);ellipse(p[0],p[1],unit*.105,unit*.123,'#354943');}
      }
      box(px,py,w,d,.16,.35,'#c68e65','#ab704e','#825d48');
      const cw=w*(alongY?.89:.8),cd=d*(alongY?.8:.89), cx=x-cw*.5,cy=y-cd*.5;
      box(cx,cy,cw,cd,.49,.34,'#dbc99c','#9a997f','#73877d');
      if(alongY){poly([[cx+.06,cy+cd+.01,.56],[cx+cw-.06,cy+cd+.01,.56],[cx+cw-.06,cy+cd+.01,.76],[cx+.06,cy+cd+.01,.76]],'#435e60');}
      else{poly([[cx+cw+.01,cy+.05,.56],[cx+cw+.01,cy+cd-.04,.56],[cx+cw+.01,cy+cd-.04,.76],[cx+cw+.01,cy+.05,.76]],'#435e60');}
      if(driver){
        rect(cx+cw*.26,cy+cd*.25,cw*.48,cd*.50,.84,'#dcbe86');
        if(state.companion)sphere(cx+cw*.78,cy+cd*.91,.68,.065,.062,COATS[state.companion.slot]);
        if(state.site?.delivery){box(cx+cw*.32,cy+cd*.29,cw*.36,cd*.42,.85,.14,'#cfad78','#9e805d','#897356');line(cx+cw*.51,cy+cd*.29,.99,cx+cw*.51,cy+cd*.71,.99,'#e0cd99',Math.max(.55,unit*.032));}
      }
    }
    function serviceVehicle(q) {
      const {x,y,dx,dy}=q,side=Math.abs(dy)>Math.abs(dx),w=side?.64:1.64,d=side?1.64:.64,px=x-w/2,py=y-d/2;
      shadow(px,py,w,d,.65);
      for(const f of [.17,.80]){const p=side?screen(px+w+.013,py+d*f,.17):screen(px+w*f,py+d+.013,.17);ellipse(...p,unit*.107,unit*.134,'#2f4541');}
      box(px,py,w,d,.16,.38,'#a5b6a2','#668c81','#57776e');
      const cabX=px+(dx<0?.02:.71)*w,cabY=py+(dy<0?.02:.71)*d;
      if(side){box(px+.045,cabY,w-.09,d*.28,.53,.27,'#c4c5aa','#799a91','#627f79');}
      else{box(cabX,py+.045,w*.28,d-.09,.53,.27,'#c4c5aa','#799a91','#627f79');}
      const cargoX=side?px+.055:px+(dx<0?.35:.04)*w,cargoY=side?py+(dy<0?.35:.04)*d:py+.055;
      const cw=side?w-.11:w*.61,cd=side?d*.61:d-.11;
      box(cargoX,cargoY,cw,cd,.52,.38,'#9aaf98','#739889','#668478');
      rect(cargoX+cw*.1,cargoY+cd*.1,cw*.8,cd*.8,.905,'#74998c');line(cargoX+cw*.49,cargoY,.911,cargoX+cw*.49,cargoY+cd,.911,'#c9ba90',Math.max(.8,unit*.042));
      if(q.yielding||q.wait>0){sphere(px+w+.015,py+d*.9,.35,.048,.035,'#e19b75');sphere(px+w*.86,py+d+.015,.35,.048,.035,'#e19b75');}
    }
    function pedestrianAt(i){
      const t=((reduced?0:visualTime)+i*3.43)%16;
      const portion=t<3?0:t<6.7?(t-3)/3.7:t<10.5?1:t<14.2?(14.2-t)/3.7:0;
      const x=i?7.27:13.27, y=(i?12:18)-1.08+2.16*portion;
      return {x,y,moves:!reduced&&((t>3&&t<6.7)||(t>10.5&&t<14.2)),dy:t<10.5?1:-1};
    }
    function nextDelivery(q){for(let i=1;i<=SERVICE_LOOP.length;i++){const label=SERVICE_LOOP[(q.leg+i)%SERVICE_LOOP.length][2];if(label)return label;}return 'Market exchange';}
    function stepTraffic(dt){
      const q=state.traffic;if(!q||reduced)return;
      if(q.wait>0){q.wait-=dt;return;}
      const a=SERVICE_LOOP[q.leg],b=SERVICE_LOOP[(q.leg+1)%SERVICE_LOOP.length],dx=Math.sign(b[0]-a[0]),dy=Math.sign(b[1]-a[1]);
      const inFront=p=>{const x=p.x-q.x,y=p.y-q.y,along=x*dx+y*dy;return along>-.2&&along<2.05&&Math.abs(x*dy-y*dx)<.68;};
      q.yielding=inFront(state.player)||inFront(pedestrianAt(0))||inFront(pedestrianAt(1));
      const wanted=q.yielding?0:3.95;q.speed+=clamp(wanted-q.speed,-dt*20,dt*3.6);q.distance+=q.speed*dt;
      const length=Math.abs(b[0]-a[0])+Math.abs(b[1]-a[1]);
      if(q.distance>=length){q.leg=(q.leg+1)%SERVICE_LOOP.length;q.distance=0;q.wait=b[2]?1.75:.05;q.speed=b[2]?0:q.speed;}
      const node=SERVICE_LOOP[q.leg],next=SERVICE_LOOP[(q.leg+1)%SERVICE_LOOP.length];q.dx=Math.sign(next[0]-node[0]);q.dy=Math.sign(next[1]-node[1]);
      q.x=node[0]+q.dx*q.distance-q.dy*.31;q.y=node[1]+q.dy*q.distance+q.dx*.31;
    }
    function pin(point,selected=false,mission=false) {
      const [x,y]=screen(point.x,point.y,.86),k=clamp(unit*.37,8,13),color=mission?'#f6c47c':selected?'#f5deaa':'#e0d8b5';
      path([[x,y+k*.91],[x-k*.38,y+.3*k],[x+k*.38,y+.3*k]],'#203c3c');ellipse(x,y-k*.1,k*.74,k*.74,'#284746',color);
      const cy=y-k*.1,r=k*.41,sw=Math.max(1.15,k*.135);
      if(point.icon==='person'){ellipse(x,cy-r*.36,r*.36,r*.36,color);ctx.beginPath();ctx.arc(x,cy+r*.63,r*.62,Math.PI,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=sw;ctx.stroke();}
      else if(point.icon==='market'){path([[x-r,cy],[x-r*.75,cy-r*.68],[x+r*.75,cy-r*.68],[x+r,cy]],null,color,sw);path([[x-r*.71,cy],[x-r*.71,cy+r*.73],[x+r*.71,cy+r*.73],[x+r*.71,cy]],null,color,sw);}
      else{path([[x-r,cy],[x,cy-r*.75],[x+r,cy],[x+r*.58,cy],[x+r*.58,cy+r*.73],[x-r*.58,cy+r*.73],[x-r*.58,cy]],null,color,sw);}
    }
    function locationLabel(q) {
      if(!q||q.type==='ground'||q.type==='plot')return;
      const person=q.type==='resident'&&state.site?.residents.find(r=>r.id===q.residentId);
      let label=q.type==='vehicle'?'Community van':q.label;
      if(person){label=person.name+(person.role?' · '+person.role:'');if(person.promise)label+=' · due week '+person.promise.dueWeek;}
      const shiftStop=state.shiftStops.find(s=>window.EarthShifts.matches(s.venue,q));
      if(shiftStop)label=shiftStop.label;
      if(!label)return;
      const p=screen(q.x,q.y,q.type==='vehicle'?1.14:1.54),size=clamp(unit*.42,10,12);
      ctx.font=`600 ${size}px system-ui,sans-serif`;
      const w=Math.min(width-16,ctx.measureText(label).width+16),h=23;
      const x=clamp(p[0]-w/2,8,width-8-w),y=clamp(p[1]-h,8,height-h-8);
      ctx.fillStyle='#284440';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#9aa990';ctx.lineWidth=.8;ctx.strokeRect(x+.4,y+.4,w-.8,h-.8);
      text(x+w/2,y+h*.51,label,'#f3e8c5',size);
    }
    function lotOverlay() {
      for(const lot of state.lots){if(lot.building)continue;
        const chosen=(state.hover?.plot??placingFocus)===lot.plot, c=chosen?'#fce0a5':'#edbf7c';
        rect(lot.x-1.61,lot.y-1.61,3.22,3.22,.03,chosen?'rgba(246,207,132,.58)':'rgba(247,205,131,.25)',c,chosen?2.4:1.3);
      }
    }
    function linkedLots(focus) {
      if(!focus||focus.building||!state.placed)return [];
      const key=state.placed+'-'+focus.plot;
      if(state.preview?.key===key)return state.preview.links;
      const previewSite={...state.site,buildings:[...state.site.buildings,{kind:state.placed,plot:focus.plot}]};
      const links=(window.CommonEarthSim?.productiveLinks?.(previewSite)||[]).filter(l=>l.from===focus.plot||l.to===focus.plot);
      state.preview={key,links};return links;
    }
    function corridor(link) {
      const a=state.lots[link.from],b=state.lots[link.to];if(!a||!b)return null;
      const dx=Math.sign(b.x-a.x),dy=Math.sign(b.y-a.y);
      return {a:add(a,dx*1.72+dy*.32,dy*1.72-dx*.32),b:add(b,-dx*1.72+dy*.32,-dy*1.72-dx*.32),dx,dy};
    }
    function showConnections() {
      const focus=state.lots[state.hover?.plot??placingFocus];
      for(const l of linkedLots(focus)){
        const way=corridor(l);if(!way)continue;const {a,b}=way;
        const target=state.lots[l.from===focus.plot?l.to:l.from];
        rect(target.x-1.64,target.y-1.64,3.28,3.28,.04,'rgba(119,203,177,.17)','#bbebce',1.45);
        const p=screen(a.x,a.y,.045),q=screen(b.x,b.y,.045);
        ctx.save();ctx.setLineDash([3,3]);path([p,q],null,'#e4f3c0',2);ctx.restore();
      }
    }
    function linkedWorker(link,index,addItem) {
      const way=corridor(link);if(!way)return;
      const t=((reduced?2.3:visualTime)+index*3.9)%12;
      const phase=t<1?0:t<5?(t-1)/4:t<7?1:t<11?(11-t)/4:0;
      const {a,b,dx,dy}=way,x=a.x+(b.x-a.x)*phase,y=a.y+(b.y-a.y)*phase;
      const moving=!reduced&&((t>1&&t<5)||(t>7&&t<11));const dir=t<7?1:-1;
      addItem(x,y,x+y+.15,()=>{
        person(x,y,link.resource==='food'?'#829967':'#ba926a',dx*dir,dy*dir,moving?1:0,visualTime*5+index);
        const xx=x+.27*dx,yy=y+.27*dy;box(xx-.14,yy-.15,.29,.3,.04,.23,'#c19d68','#9a7c58','#857452');
        if(link.resource==='food'){sphere(xx,yy,.29,.13,.075,'#9aaf78');}else{rect(xx-.08,yy-.14,.08,.3,.285,'#cfc2a0');}
      });
    }
    function lotNumbers() {
      for(const lot of state.lots){if(lot.building)continue;const [x,y]=screen(lot.x,lot.y,.66),r=clamp(unit*.34,8,13);
        ellipse(x,y,r,r,'#294842','#f1cc8c');text(x,y+.3,String(lot.plot+1),'#f5deaa',clamp(r*1.16,10,15));}
    }
    function routeRibbon() {
      if(!state.route.length)return;
      const points=[screen(state.player.x,state.player.y,.05),...state.route.map(p=>screen(p.x,p.y,.05))];
      ctx.save();ctx.setLineDash([4,5]);path(points,null,'#f4d48d',1.6);ctx.restore();
      const end=points.at(-1);ellipse(end[0],end[1],unit*.18,unit*.1,'#e6bb7c');
    }
    function draw() {
      if(!width||!height)return;
      ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);ctx.lineJoin='round';ctx.lineCap='round';background();
      if(!state.site)return;
      cachedGround();if(state.placed){lotOverlay();showConnections();}routeRibbon();
      const list=[];
      const addItem=(x,y,depth,draw)=>{const p=screen(x,y);if(p[0]<-unit*4||p[0]>width+unit*4||p[1]<-unit*3||p[1]>height+unit*4)return;list.push({depth,draw});};
      const blockDepth=(p,w,d)=>p.x+p.y+w/2+d/2;
      {const p=centre(MARKET);addItem(p.x,p.y,blockDepth(p,3,2.2),()=>market(p));}
      {const p=centre(MARKET);addItem(p.x,p.y,p.x+p.y+2.68,()=>exchangeDetails(p));}
      if(state.site.water){for(let i=0;i<4;i++){const x=4.6+i*6,y=26.85;addItem(x,y,x+y+.14,()=>skiff(x,y,['#b77960','#799c94','#c3ac7e','#86a9ac'][i],i===2));}}
      HOMES.forEach((block,index)=>{const p=centre(block);addItem(p.x,p.y,blockDepth(p,2.52,2.18),()=>residence({...p,index}));});
      for(const lot of state.lots)if(lot.building){const item={...lot,kind:lot.building.kind};addItem(lot.x,lot.y,blockDepth(lot,2.7,2.25),()=>civic(item));}
      for(const q of state.trees)addItem(q.x,q.y,q.x+q.y+.17,()=>plant(q.x,q.y,q.size,q.index,q.palm));
      for(const q of state.decor)addItem(q.x,q.y,q.x+q.y+.19,()=>({bench,lamp,kiosk}[q.type](q.x,q.y)));
      for(const q of state.points)if(q.type==='resident'&&q.residentId!==state.companion?.id){
        const sx=q.x+.47+(reduced?0:Math.sin(visualTime*.45+q.index)*.12),sy=q.y-.21;
        addItem(sx,sy,sx+sy+.1,()=>person(sx,sy,COATS[q.index],1,0,0,q.index,false,state.looks.get(q.residentId)));
      }
      for(let i=0;i<3;i++){
        const t=((reduced?0:visualTime*.34)+i*2.91)%5.34;
        const aa=t<2.67?t:5.34-t,a=[2.03,8.01,14.11,19.99][i],b=[6.98,12.98,18.99,6.98][i];
        const sx=a+aa,sy=b;addItem(sx,sy,sx+sy+.01,()=>person(sx,sy,['#a9b99c','#c39c83','#8ca9ab','#bcac93'][i],t<2.67?1:-1,0,reduced?0:.55,visualTime*4+i));
      }
      for(let i=0;i<2;i++){const w=pedestrianAt(i);addItem(w.x,w.y,w.x+w.y+.09,()=>person(w.x,w.y,i?'#9bad94':'#c3a480',0,w.dy,w.moves?.7:0,visualTime*5+i));}
      if(state.traffic){const q=state.traffic;addItem(q.x,q.y,q.x+q.y+.5,()=>serviceVehicle(q));}
      state.links.forEach((link,i)=>linkedWorker(link,i,addItem));
      const p=state.player,rp=screen(p.x,p.y,.015);
      ellipse(rp[0],rp[1],unit*(state.mode==='drive'?.87:.43),unit*(state.mode==='drive'?.37:.21),'rgba(239,204,137,.20)','#ead19b');
      const v=state.mode==='drive'?p:state.van;
      addItem(v.x,v.y,v.x+v.y+.45,()=>vehicle(v,state.mode==='drive'));
      if(state.mode==='walk')addItem(p.x,p.y,p.x+p.y+.075,()=>person(p.x,p.y,'#dbab68',p.dx,p.dy,p.moving?1:0,visualTime*11,true));
      if(state.companion&&state.mode==='walk'){
        const c=state.companion;addItem(c.x,c.y,c.x+c.y+.075,()=>person(c.x,c.y,COATS[c.slot],p.dx,p.dy,p.moving?1:0,visualTime*10+c.slot,false,state.looks.get(c.id)));
      }
      list.sort((a,b)=>a.depth-b.depth).forEach(d=>d.draw());
      if(state.placed)lotNumbers();else for(const point of state.points){
        const shiftStop=state.shiftStops.find(s=>window.EarthShifts.matches(s.venue,point));
        if(point.type==='building'&&state.active!==point&&!shiftStop)continue;
        pin(point,state.active===point,Boolean(shiftStop)||point.type==='resident'&&state.site.delivery?.residentId===point.residentId);
      }
      // A small diamond keeps the player's location readable behind rooflines.
      const cap=screen(p.x,p.y,state.mode==='drive'?1.11:.96);
      path([[cap[0],cap[1]-3.2],[cap[0]+3.7,cap[1]],[cap[0],cap[1]+3.2],[cap[0]-3.7,cap[1]]],'#f7cf86','#614f36',.9);
      if(!state.placed){
        const label=state.hover||(!p.moving&&!state.route.length?state.active:null);if(label)locationLabel(label);
      }
      drawMini();
      if(shortMessage&&visualTime<messageUntil){
        ctx.font='600 12px system-ui,sans-serif';const textWidth=Math.min(width-24,ctx.measureText(shortMessage).width+22), x=width*.5-textWidth*.5, y=height-38;
        ctx.fillStyle='rgba(26,48,45,.94)';ctx.fillRect(x,y,textWidth,24);text(width/2,y+12,shortMessage,'#f0dfb8',Math.min(12,(textWidth-12)/Math.max(1,shortMessage.length)*1.75));
      }
    }
    function traversable(p, driving=state.mode==='drive') {
      if(p.x<-.78||p.y<-.78||p.x>SIDE+.78||p.y>SIDE+.78)return false;
      if(driving)return road(p.x,p.y);
      const margin=.095;
      return !state.solids.some(([x1,y1,x2,y2])=>p.x>x1-margin&&p.x<x2+margin&&p.y>y1-margin&&p.y<y2+margin);
    }
    function closestFree(target,driving=state.mode==='drive') {
      if(traversable(target,driving))return {...target};
      let nearest=null,best=Infinity;
      for(let i=-7;i<=7;i++)for(let j=-7;j<=7;j++){
        const p={x:target.x+i*.23,y:target.y+j*.23},cost=Math.hypot(i,j);
        if(cost<best&&traversable(p,driving)){nearest=p;best=cost;}
      }
      return nearest;
    }
    // A uniform lattice handles route finding. A heap keeps long street trips inexpensive.
    function makeRoute(start,target) {
      const N=58, origin=-.68, toIndex=p=>clamp(Math.round((p.y-origin)/STEP),0,N-1)*N+clamp(Math.round((p.x-origin)/STEP),0,N-1);
      const fromIndex=i=>({x:origin+i%N*STEP,y:origin+Math.floor(i/N)*STEP});
      const startI=toIndex(start),goalI=toIndex(target);
      if(startI===goalI)return [target];
      const count=N*N,cost=new Float64Array(count).fill(Infinity),parent=new Int32Array(count).fill(-1),pass=new Uint8Array(count),visited=new Uint8Array(count),heap=[];
      const valid=i=>{if(pass[i]===0)pass[i]=traversable(fromIndex(i))?2:1;return pass[i]===2;};
      const push=(i,rank)=>{const n={i,rank};let k=heap.length;heap.push(n);while(k>0){const a=(k-1)>>1;if(heap[a].rank<=rank)break;heap[k]=heap[a];k=a;}heap[k]=n;};
      const pop=()=>{const first=heap[0].i,last=heap.pop();if(heap.length){let k=0;while(k*2+1<heap.length){let j=k*2+1;if(j+1<heap.length&&heap[j+1].rank<heap[j].rank)j++;if(heap[j].rank>=last.rank)break;heap[k]=heap[j];k=j;}heap[k]=last;}return first;};
      const offsets=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
      cost[startI]=0;push(startI,0);let reached=-1;
      while(heap.length){
        const i=pop();if(visited[i])continue;visited[i]=1;
        const px=i%N,py=Math.floor(i/N),here=fromIndex(i);
        if(i===goalI||(dist(here,target)<STEP*.85&&traversable(target))){reached=i;break;}
        for(const [dx,dy] of offsets){const nx=px+dx,ny=py+dy,j=ny*N+nx;
          if(nx<0||ny<0||nx>=N||ny>=N||visited[j]||!valid(j))continue;
          if(dx&&dy&&(!valid(py*N+nx)||!valid(ny*N+px)))continue;
          const stepCost=dx&&dy?1.414:1,nc=cost[i]+stepCost;
          if(nc>=cost[j])continue;cost[j]=nc;parent[j]=i;
          const q=fromIndex(j);push(j,nc+dist(q,target)/STEP);
        }
      }
      if(reached<0)return [];
      const raw=[];for(let n=reached;n!==startI&&n>=0;n=parent[n])raw.push(fromIndex(n));raw.reverse();raw.push(target);
      const simplified=[];let prior=start,lastDirection='';
      for(const p of raw){const d=`${Math.sign(Math.round((p.x-prior.x)*100))},${Math.sign(Math.round((p.y-prior.y)*100))}`;
        if(d===lastDirection)simplified[simplified.length-1]=p;else simplified.push(p);prior=p;lastDirection=d;}
      return simplified;
    }
    function getState() {
      return {mode:state.mode,siteId:state.site?.id||null,plot:placingFocus,placement:state.placed,nearby:state.active?publicPoint(state.active):null,x:state.player.x,y:state.player.y,travelling:state.route.length>0,zoom};
    }
    function publicPoint(q) {
      if(!q)return null;
      const {type,label,x,y,residentId,buildingId,plot,kind}=q;
      const e={type,label,x,y};
      if(residentId!=null)e.residentId=residentId;
      if(buildingId!=null)e.buildingId=buildingId;
      if(plot!=null)e.plot=plot;if(kind)e.kind=kind;
      if(type==='market')e.actionId='courier:pick';
      if(type==='resident'&&state.site?.delivery?.residentId===residentId)e.actionId=`courier:deliver:${residentId}`;
      return e;
    }
    function emitState() {options.onState?.(getState());schedule();}
    function message(label) {shortMessage=label;messageUntil=visualTime+3.1;options.onHint?.(label);dirty=true;schedule();}
    function nearest(stopDistance) {
      let q=null,range=stopDistance;
      for(const point of state.points){const d=dist(state.player,point);if(d<range){range=d;q=point;}}
      return q;
    }
    function updateNearby() {
      const next=nearest(state.mode==='drive'?1.8:1.53);
      const shiftStop=next&&state.shiftStops.find(s=>window.EarthShifts.matches(s.venue,next));
      const delivery=next?.type==='resident'&&state.site?.delivery?.residentId===next.residentId;
      const key=[next?.type,next?.residentId,next?.plot,shiftStop?.id,Boolean(delivery),state.placed].join('/');
      if(next===state.active&&key===state.hintKey)return;
      state.active=next;state.hintKey=key;
      if(!state.placed){
        if(shiftStop)options.onHint?.(`${shiftStop.label} · Interact to visit with ${state.site.residents.find(r=>r.id===state.site.shift.residentId).name}.`);
        else if(next?.type==='resident'){
          const resident=state.site.residents.find(r=>r.id===next.residentId);
          options.onHint?.(delivery?`Parcel for ${next.label}. Interact to deliver.`:`${next.label}${resident?.role?' · '+resident.role:''}. Interact to speak.`);
        }else if(next?.type==='market')options.onHint?.('At the exchange. Interact to check the market parcel.');
        else if(next?.type==='building')options.onHint?.(`${next.label} · Lot ${next.plot+1}. Interact to inspect.`);
        else if(state.site)options.onHint?.('Tap a marker to visit, or tap open ground to travel there.');
      }
      emitState();dirty=true;
    }
    function stop() {state.route=[];state.arrival=null;state.destination=null;state.player.moving=false;}
    function choose(point) {
      if(!point)return;
      if(point.type==='vehicle'){toggleVehicle();return;}
      state.active=point;dirty=true;
      const event=publicPoint(point);options.onInteract?.(event);emitState();
    }
    function navigate(target,arrival=null) {
      if(!state.site||state.placed)return false;
      if(overviewZoom!==null)exitOverview();
      if(state.mode==='drive'&&arrival&&arrival.type!=='vehicle'){
        // Aim for the public kerb outside the venue. People can speak from the van.
        const q={x:arrival.x,y:Math.round(arrival.y/BLOCK)*BLOCK};target=q;
      }
      const free=closestFree(target);
      if(!free){message('Choose a street or open ground.');return false;}
      if(dist(free,state.player)<.23){if(arrival)choose(arrival);return true;}
      const route=makeRoute(state.player,free);
      if(!route.length){message(state.mode==='drive'?'Choose a connected street.':'That path is closed. Try another approach.');return false;}
      if(!moving())lastFrame=0;
      state.route=route;state.destination=free;state.arrival=arrival;hovering=false;dirty=true;emitState();return true;
    }
    function interact() {
      if(state.placed){const l=state.lots.find(q=>q.plot===placingFocus);if(l&&!l.building)options.onPlace?.({plot:l.plot,x:l.x,y:l.y});return Boolean(l&&!l.building);}
      const q=nearest(state.mode==='drive'?1.9:1.56);
      if(q){stop();choose(q);return true;}
      if(state.mode==='walk'&&dist(state.van,state.player)<1.6)return toggleVehicle();
      message('Walk to a marker to meet someone or use a venue.');return false;
    }
    function toggleVehicle() {
      if(!state.site)return false;
      if(state.placed)setPlacement(null);
      stop();const p=state.player;
      if(state.mode==='drive'){
        state.van={...p};state.mode='walk';
        const q=closestFree(add(p,.46,.48),false);if(q)Object.assign(p,{x:q.x,y:q.y});
        message('On foot');
      }else if(dist(p,state.van)<1.65){
        Object.assign(p,state.van);state.mode='drive';message('Driving the community van');
      }else{
        message('Walking to the community van');navigate(state.van,{type:'vehicle',x:state.van.x,y:state.van.y});return true;
      }
      hovering=false;dirty=true;updateNearby();emitState();return true;
    }
    function manual(dx,dy,length) {
      if(!dx&&!dy)return false;
      const mag=Math.hypot(dx,dy),px=dx/mag,py=dy/mag,p=state.player;
      let candidate=add(p,px*length,py*length);
      if(!traversable(candidate)){
        const a=add(p,px*length,0),b=add(p,0,py*length);
        if(traversable(a)&&Math.abs(px)>.08&&(!traversable(b)||Math.abs(px)>=Math.abs(py)))candidate=a;
        else if(traversable(b)&&Math.abs(py)>.08)candidate=b;else return false;
      }
      const oldX=p.x,oldY=p.y;p.x=candidate.x;p.y=candidate.y;p.dx=p.x-oldX;p.dy=p.y-oldY;p.moving=true;hovering=false;return true;
    }
    function holdMove(direction) {
      if(!AXIS[direction]||!state.site)return false;
      if(state.placed){cyclePlot(direction==='left'||direction==='up'?-1:1);return true;}
      if(overviewZoom!==null)exitOverview();
      if(pressed.has(direction))return true;
      if(!moving())lastFrame=0;
      stop();pressed.add(direction);const v=AXIS[direction];manual(v[0],v[1],state.mode==='drive'?.45:.28);dirty=true;updateNearby();schedule();return true;
    }
    function releaseMove(direction){pressed.delete(direction);}
    function move(direction) {
      if(!AXIS[direction]||!state.site)return false;
      if(state.placed){cyclePlot(direction==='left'||direction==='up'?-1:1);return true;}
      stop();const v=AXIS[direction];const result=manual(v[0],v[1],state.mode==='drive'?.80:.48);dirty=true;updateNearby();emitState();return result;
    }
    function follow(dt) {
      const p=state.player;
      p.moving=false;
      if(!state.placed&&pressed.size){let dx=0,dy=0;for(const dir of pressed){dx+=AXIS[dir][0];dy+=AXIS[dir][1];}stop();manual(dx,dy,dt*(state.mode==='drive'?DRIVE_SPEED:WALK_SPEED));}
      else if(!state.placed&&state.route.length){
        let budget=dt*(state.mode==='drive'?DRIVE_SPEED:WALK_SPEED);
        while(budget>.0001&&state.route.length){const q=state.route[0],d=dist(p,q);
          if(d<.001){state.route.shift();continue;}
          const dx=(q.x-p.x)/d,dy=(q.y-p.y)/d,step=Math.min(d,budget);p.x+=dx*step;p.y+=dy*step;p.dx=dx;p.dy=dy;p.moving=true;budget-=step;
          if(step>=d-.000001)state.route.shift();
        }
        if(!state.route.length){const visit=state.arrival;stop();updateNearby();if(visit)choose(visit);else emitState();}
      }
      if(p.moving)updateNearby();
      followCompanion();stepTraffic(dt);
      if(!hovering&&!dragging&&!pinch){
        const target=state.placed?{x:12,y:12}:p,rate=reduced?1:1-Math.exp(-dt*7.2);
        centreX+=(target.x-centreX)*rate;centreY+=(target.y-centreY)*rate;
      }
    }
    function prepareCompanion() {
      const site=state.site,resident=site?.residents?.find(r=>r.id===site.shift?.residentId);
      state.shiftStops=resident&&window.EarthShifts?(window.EarthShifts.view(site,site.shift.week)?.stops||[]).filter(s=>s.available):[];
      if(!resident){state.companion=null;return;}
      if(state.companion?.id===resident.id)return;
      const p=state.player,start=closestFree(add(p,.49,-.36),false)||p;
      state.companion={id:resident.id,slot:resident.slot,x:start.x,y:start.y,trail:[],onboard:state.mode==='drive'};
    }
    function followCompanion() {
      const c=state.companion;if(!c)return;
      const p=state.player;
      if(state.mode==='drive'){c.x=p.x;c.y=p.y;c.trail.length=0;c.onboard=true;return;}
      if(c.onboard){const q=closestFree(add(p,-.45,.38),false)||p;c.x=q.x;c.y=q.y;c.onboard=false;}
      if(!p.moving)return;
      if(!c.trail.length)c.trail.push({x:c.x,y:c.y});
      if(dist(c.trail[c.trail.length-1],p)>.13)c.trail.push({x:p.x,y:p.y});
      let length=0;for(let i=c.trail.length-1;i>0;i--){
        length+=dist(c.trail[i],c.trail[i-1]);
        if(length>=.7){c.x=c.trail[i-1].x;c.y=c.trail[i-1].y;if(i>1)c.trail.splice(0,i-1);break;}
      }
    }
    function cyclePlot(direction) {
      const empty=state.lots.filter(l=>!l.building);
      if(!empty.length)return;
      const current=empty.findIndex(l=>l.plot===placingFocus);placingFocus=empty[(current+direction+empty.length)%empty.length].plot;dirty=true;emitState();
    }
    function setPlacement(kind) {
      if(!state.site)return;
      if(overviewZoom!==null)exitOverview();
      if(kind){
        const empty=state.lots.filter(l=>!l.building);if(!empty.length){message('Every plot is in use.');return;}
        if(!state.placed)savedZoom=zoom;
        stop();pressed.clear();placingFocus=empty[0].plot;hovering=false;centreX=12;centreY=12;
        zoom=fitZoom();
      }else if(state.placed&&savedZoom!==null){zoom=savedZoom;savedZoom=null;}
      unit=baseUnit()*zoom;state.placed=kind||null;state.hover=null;dirty=true;emitState();
    }
    function setSite(site) {
      const previous=state.site,previousKey=siteKey(previous),nextKey=siteKey(site);
      if(previousKey!==nextKey){
        if(previousKey)visits.set(previousKey,{player:{...state.player},van:{...state.van},mode:state.mode,zoom:savedZoom??zoom});
        stop();pressed.clear();state.placed=null;state.active=null;state.hover=null;state.companion=null;savedZoom=null;overviewZoom=null;shortMessage='';hovering=false;
        if(!nextKey)visits.clear();
        const stored=nextKey&&visits.get(nextKey);
        state.player=stored?.player||{...returnPoint(site),dx:0,dy:1};state.van=stored?.van||vanAtExchange();state.mode=stored?.mode||'walk';
        zoom=stored?.zoom||1;centreX=state.player.x;centreY=state.player.y;
      }
      state.site=site||null;state.seed=hash(`${site?.lat??0},${site?.lon??0},${site?.id||'district'}`);
      const nextFingerprint=JSON.stringify([nextKey,site?.water,site?.buildings,site?.residents?.map(r=>[r.id,r.name])]);
      if(previousKey!==nextKey || state.fingerprint!==nextFingerprint){
        const target=state.destination,arrival=state.arrival;
        districtData();state.fingerprint=nextFingerprint;
        if(site&&!traversable(state.player)){
          const free=closestFree(state.player);if(free){state.player.x=free.x;state.player.y=free.y;}
        }
        if(site&&target){
          stop();const updated=arrival?.type==='vehicle'?arrival:state.points.find(q=>q.type===arrival?.type&&q.residentId===arrival?.residentId&&q.plot===arrival?.plot);
          if(!arrival||updated)navigate(target,updated||null);
        }
      }
      prepareCompanion();unit=baseUnit()*zoom;dirty=true;updateNearby();emitState();schedule();
    }
    function resolveStop(ref) {
      if(!ref)return null;
      return state.points.find(p=>p.type===ref.type&&(p.type==='market'||p.type==='resident'&&p.residentId===ref.residentId||p.type==='building'&&p.plot===ref.plot&&(!ref.kind||p.kind===ref.kind)));
    }
    function focusStop(ref) {const q=resolveStop(ref);return q?navigate(q,q):false;}
    function atStop(ref) {const q=resolveStop(ref);return Boolean(q&&dist(state.player,q)<(state.mode==='drive'?1.9:1.57));}
    function focusMarket() {const q=state.points.find(p=>p.type==='market');return q?navigate(q,q):false;}
    function focusResident(id) {const q=state.points.find(p=>p.type==='resident'&&p.residentId===id);return q?navigate(q,q):false;}
    function exitOverview() {
      if(overviewZoom===null)return;
      zoom=overviewZoom;overviewZoom=null;unit=baseUnit()*zoom;hovering=false;
    }
    function toggleOverview() {
      if(!state.site||state.placed)return;
      if(overviewZoom!==null){exitOverview();recenter();}
      else {overviewZoom=zoom;zoom=fitZoom();unit=baseUnit()*zoom;centreX=12;centreY=12;hovering=true;}
      miniTick=-1;dirty=true;schedule();
    }
    function recenter() {exitOverview();hovering=false;centreX=state.placed?12:state.player.x;centreY=state.placed?12:state.player.y;miniTick=-1;dirty=true;schedule();}
    function drawMini() {
      if(!miniCanvas||!miniButton)return;
      miniButton.hidden=Boolean(state.placed);if(state.placed||Math.floor(visualTime*6)===miniTick)return;
      miniTick=Math.floor(visualTime*6);
      const g=miniCanvas.getContext('2d'),w=74,h=54,u=1.23,v=.64;
      const xy=(x,y)=>[w*.5+(x-y)*u,h*.5+(x+y-SIDE)*v];
      const line=(a,b,color,width)=>{g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke();};
      g.setTransform(2,0,0,2,0,0);g.clearRect(0,0,w,h);g.fillStyle='#223b38';g.beginPath();
      for(const [i,p] of [[0,0],[SIDE,0],[SIDE,SIDE],[0,SIDE]].entries()){const q=xy(...p);if(i)g.lineTo(...q);else g.moveTo(...q);}g.closePath();g.fill();
      for(let i=0;i<=4;i++){const k=i*6;line(xy(k,0),xy(k,SIDE),'#65796c',.65);line(xy(0,k),xy(SIDE,k),'#65796c',.65);}
      for(const q of state.points){const m=xy(q.x,q.y),size=q.type==='market'?2.8:2;g.fillStyle=q.type==='resident'?'#c8af84':q.type==='market'?'#e3ba78':'#90b9a1';g.fillRect(m[0]-size/2,m[1]-size/2,size,size);}
      const p=xy(state.player.x,state.player.y);
      if(state.destination){const dst=xy(state.destination.x,state.destination.y);line(p,dst,'#eab969',1);g.strokeStyle='#eab969';g.strokeRect(dst[0]-2,dst[1]-2,4,4);}
      g.fillStyle='#fff0bf';g.strokeStyle='#523e2b';g.lineWidth=.8;g.beginPath();g.arc(p[0],p[1],2.55,0,Math.PI*2);g.fill();g.stroke();
      g.font='600 6.5px system-ui,sans-serif';g.textAlign='right';g.fillStyle='#c5d3bd';g.fillText('N',w-4,8);line([w-12,10],[w-9,8],'#c5d3bd',.9);
      miniButton.setAttribute('aria-pressed',String(overviewZoom!==null));miniButton.title=overviewZoom===null?'Show whole district':'Return to street scale';
    }
    function zoomBy(factor,point) {
      if(!Number.isFinite(factor)||factor<=0)return;
      overviewZoom=null;
      const prior=point&&world(point.x,point.y);zoom=clamp(zoom*factor,.29,2.15);unit=baseUnit()*zoom;
      if(prior&&hovering){const next=world(point.x,point.y);centreX+=prior.x-next.x;centreY+=prior.y-next.y;}
      dirty=true;schedule();
    }
    function hit(sx,sy) {
      const w=world(sx,sy);
      if(state.placed){
        for(const lot of state.lots){const p=screen(lot.x,lot.y,.66);if(!lot.building&&(Math.hypot(sx-p[0],sy-p[1])<clamp(unit*.41,12,19)||(Math.abs(w.x-lot.x)<=2.17&&Math.abs(w.y-lot.y)<=2.17)))return {type:'plot',...lot};}
        return null;
      }
      let selected=null,best=Infinity;
      for(const q of state.points){
        const pinPos=screen(q.x,q.y,.9),foot=screen(q.x,q.y,.10), centrePoint=centre(q.block), roof=screen(centrePoint.x,centrePoint.y,.96);
        const score=Math.min(Math.hypot(sx-pinPos[0],sy-pinPos[1]),Math.hypot(sx-foot[0],sy-foot[1]),(Math.abs(sx-roof[0])<unit*1.4&&Math.abs(sy-roof[1])<unit*.82)?13:Infinity);
        if(score<best&&score<clamp(unit*.72,17,30)){best=score;selected=q;}
      }
      if(selected)return selected;
      if(state.traffic){const q=state.traffic,p=screen(q.x,q.y,.5);if(Math.hypot(sx-p[0],sy-p[1])<Math.max(11,unit*.64))return {type:'service',x:q.x,y:q.y,label:'Co-op deliveries'};}
      if(state.mode==='walk'){const v=screen(state.van.x,state.van.y,.5);if(Math.hypot(sx-v[0],sy-v[1])<Math.max(16,unit*.82))return {type:'vehicle',...state.van};}
      return {type:'ground',...w};
    }
    function tap(event) {
      if(!state.site)return;const p=coords(event,canvas),q=hit(p.x,p.y);
      if(state.placed){if(q){placingFocus=q.plot;options.onPlace?.({plot:q.plot,x:q.x,y:q.y});dirty=true;}else message('Choose a marked, vacant plot.');return;}
      if(!q)return;
      if(q.type==='service'){const v=state.traffic;message(v.yielding?'The delivery driver is giving way.':`Co-op deliveries · next stop ${nextDelivery(v)}`);return;}
      if(q.type==='vehicle')return toggleVehicle();
      if(q.type!=='ground'&&dist(state.player,q)<(state.mode==='drive'?1.9:1.54)){stop();choose(q);return;}
      navigate(q,q.type==='ground'?null:q);
    }
    function resize() {
      const bounds=canvas.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
      const w=Math.round(bounds.width),h=Math.round(bounds.height),ratio=Math.min(typeof devicePixelRatio==='number'?devicePixelRatio:1,2);
      if(width===w&&height===h&&ratio===pixelRatio)return;
      width=w;height=h;pixelRatio=ratio;canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));
      if(state.placed||overviewZoom!==null)zoom=fitZoom();
      unit=baseUnit()*zoom;clearGround();dirty=true;schedule();
    }
    function moving(){return Boolean(pressed.size||state.route.length);}
    function cancelIdle(){if(idleTimer){clearTimeout(idleTimer);idleTimer=0;}}
    function suspend(){cancelIdle();if(frame){cancelAnimationFrame(frame);frame=0;}}
    function schedule(){
      cancelIdle();
      if(alive&&!frame&&!canvas.parentElement?.hidden&&(visible||moving())&&typeof requestAnimationFrame==='function'&&(typeof document==='undefined'||!document.hidden))frame=requestAnimationFrame(tick);
    }
    function tick(now) {
      frame=0;if(!alive||canvas.parentElement?.hidden||(!visible&&!moving())||(typeof document!=='undefined'&&document.hidden))return;
      const delta=lastFrame?now-lastFrame:36;
      if(dirty||delta>=32){
        const maxStep=state.route.length ? 1 : pressed.size ? 0.3 : 0.1;
        const elapsed=clamp(delta/1000,0,maxStep);
        // Slow devices may miss paints. Small movement steps preserve travel speed and street collisions.
        const steps=Math.max(1,Math.ceil(elapsed/.075)),dt=elapsed/steps;
        lastFrame=now;
        for(let i=0;i<steps;i++){visualTime+=dt;if(state.site)follow(dt);}
        if(visible)draw();dirty=false;
      }
      if(!state.site||frame)return;
      if(moving()||dragging||pinch){schedule();return;}
      if(visible&&(!reduced||shortMessage&&visualTime<messageUntil)){
        // The idle service van and pedestrians can run at 12 fps; an input wakes the next paint immediately.
        if(typeof setTimeout==='function')idleTimer=setTimeout(()=>{idleTimer=0;schedule();},70);
        else schedule();
      }
    }
    function addMapControls() {
      if(!canvas.parentElement || typeof document==='undefined')return;
      const group=document.createElement('div');group.className='atlas-tools district-tools';
      group.setAttribute('role','group');group.setAttribute('aria-label','District map controls');
      const controls=[['Zoom in on district','i-plus',()=>zoomBy(1.32)],['Zoom out of district','i-minus',()=>zoomBy(1/1.32)],['Centre on player','i-target',recenter]];
      for(const [label,icon,action] of controls){
        const button=document.createElement('button');button.type='button';button.className='icon-button';button.title=label;button.setAttribute('aria-label',label);
        const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),use=document.createElementNS('http://www.w3.org/2000/svg','use');
        svg.setAttribute('aria-hidden','true');use.setAttribute('href','#'+icon);svg.appendChild(use);button.appendChild(svg);group.appendChild(button);listen(button,'click',action);
      }
      canvas.parentElement.appendChild(group);cleanups.push(()=>group.remove());
      miniButton=document.createElement('button');miniButton.type='button';miniButton.className='district-overview';
      miniButton.setAttribute('aria-label','Toggle district overview');miniButton.title='Show whole district';
      Object.assign(miniButton.style,{position:'absolute',bottom:'10px',left:'10px',width:'77px',height:'55px',padding:'0',border:'1px solid #6a8173',background:'#112927e8',zIndex:'1'});
      miniCanvas=document.createElement('canvas');miniCanvas.width=148;miniCanvas.height=108;miniCanvas.setAttribute('aria-hidden','true');
      Object.assign(miniCanvas.style,{width:'100%',height:'100%',position:'static',display:'block',pointerEvents:'none'});miniButton.appendChild(miniCanvas);
      canvas.parentElement.appendChild(miniButton);listen(miniButton,'click',toggleOverview);cleanups.push(()=>miniButton.remove());
    }
    addMapControls();
    const previousStyle=canvas.style.touchAction,oldTab=canvas.getAttribute('tabindex'),oldLabel=canvas.getAttribute('aria-label');
    canvas.style.touchAction='none';if(oldTab===null)canvas.tabIndex=0;
    if(!oldLabel)canvas.setAttribute('aria-label','District streets. Tap to walk, drag to look around, or use the arrow keys. E interacts. V boards the van.');
    listen(canvas,'pointerdown',e=>{
      if(!state.site||e.button!==0)return;state.hover=null;canvas.focus({preventScroll:true});const p=coords(e,canvas);fingers.set(e.pointerId,p);
      try{canvas.setPointerCapture(e.pointerId);}catch{}
      if(fingers.size===2){const [a,b]=Array.from(fingers.values());pinch={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom};dragging=null;}
      else dragging={id:e.pointerId,start:p,x:centreX,y:centreY,moved:false};
    });
    listen(canvas,'pointermove',e=>{
      const p=coords(e,canvas);
      if(!fingers.has(e.pointerId)){
        const target=hit(p.x,p.y);state.hover=target?.type==='ground'?null:target;dirty=true;return;
      }
      fingers.set(e.pointerId,p);
      if(pinch&&fingers.size>=2){const [a,b]=Array.from(fingers.values());const d=Math.hypot(a.x-b.x,a.y-b.y);
        zoom=clamp(pinch.zoom*d/pinch.distance,.29,2.15);unit=baseUnit()*zoom;dirty=true;return;}
      if(dragging?.id!==e.pointerId)return;
      const dx=p.x-dragging.start.x,dy=p.y-dragging.start.y;
      if(!dragging.moved&&Math.hypot(dx,dy)<6)return;
      dragging.moved=true;hovering=true;
      centreX=clamp(dragging.x-(dx/unit+dy/(unit*TILT))/2,-3,SIDE+3);centreY=clamp(dragging.y-(dy/(unit*TILT)-dx/unit)/2,-3,SIDE+3);dirty=true;
    });
    listen(canvas,'pointerup',e=>{
      const wasDrag=Boolean(dragging?.moved),wasPinch=Boolean(pinch),valid=fingers.has(e.pointerId);
      fingers.delete(e.pointerId);if(dragging?.id===e.pointerId)dragging=null;
      if(!fingers.size)pinch=null;
      if(valid&&!wasDrag&&!wasPinch)tap(e);
    });
    const cancelPointer=e=>{fingers.delete(e.pointerId);if(dragging?.id===e.pointerId)dragging=null;if(!fingers.size)pinch=null;};
    listen(canvas,'pointercancel',cancelPointer);listen(canvas,'lostpointercapture',cancelPointer);
    listen(canvas,'pointerleave',()=>{state.hover=null;dirty=true;});
    listen(canvas,'wheel',e=>{if(!state.site)return;e.preventDefault();zoomBy(Math.exp(-clamp(e.deltaY,-150,150)*.0033),coords(e,canvas));},{passive:false});
    listen(canvas,'keydown',e=>{
      if(!state.site||e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key.length===1?e.key.toLowerCase():e.key;
      if(KEYS[k]){e.preventDefault();if(!e.repeat)holdMove(KEYS[k]);}
      else if(['e',' ','Enter','v','m','+','=','-','Home','Escape'].includes(k)){e.preventDefault();if(e.repeat)return;
        if(k==='v')toggleVehicle();else if(k==='m')toggleOverview();else if(k==='e'||k===' '||k==='Enter')interact();else if(k==='Home')recenter();else if(k==='Escape'){if(state.placed)setPlacement(null);else stop();}else zoomBy(k==='-'?1/1.2:1.2);}
    });
    listen(canvas,'keyup',e=>{const dir=KEYS[e.key.length===1?e.key.toLowerCase():e.key];if(dir){pressed.delete(dir);e.preventDefault();}});
    listen(canvas,'blur',()=>pressed.clear());
    if(typeof document!=='undefined')listen(document,'visibilitychange',()=>{pressed.clear();if(document.hidden)suspend();else{lastFrame=0;dirty=true;schedule();}});
    const sizing=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;sizing?.observe(canvas);
    const showing=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>{
      visible=entries.some(e=>e.isIntersecting);
      if(canvas.parentElement?.hidden){pressed.clear();stop();suspend();return;}
      if(visible){lastFrame=0;dirty=true;resize();}
      // Accessible route buttons keep working when the canvas scrolls out of view.
      if(visible||moving())schedule();else suspend();
    }):null;showing?.observe(canvas);
    if(typeof window!=='undefined')listen(window,'resize',resize);
    function destroy(){alive=false;pressed.clear();fingers.clear();suspend();sizing?.disconnect();showing?.disconnect();cleanups.forEach(fn=>fn());clearGround();
      canvas.style.touchAction=previousStyle;if(oldTab===null)canvas.removeAttribute('tabindex');else canvas.setAttribute('tabindex',oldTab);
      if(oldLabel===null)canvas.removeAttribute('aria-label');else canvas.setAttribute('aria-label',oldLabel);}
    resize();schedule();
    return {setSite,setPlacement,move,holdMove,releaseMove,toggleOverview,interact,toggleVehicle,resize,destroy,focusMarket,focusResident,focusStop,atStop,getState,recenter,zoomBy};
  }
  window.EarthStreet=Object.freeze({mount,portrait});
})();
