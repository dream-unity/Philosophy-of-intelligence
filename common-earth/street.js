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
  const OFF_ROAD = Array.from({length:16},(_,i)=>{
    const x=i%4*BLOCK,y=Math.floor(i/4)*BLOCK;
    return [x+HALF_ROAD,y+HALF_ROAD,x+BLOCK-HALF_ROAD,y+BLOCK-HALF_ROAD];
  });
  const HOMES = window.EarthShifts?.district.homes || [[1,3],[3,2],[3,3]];
  const MARKET = window.EarthShifts?.district.market || [2,3];
  const marketDoor = () => entry(MARKET);
  const vanAtExchange = () => ({...add(marketDoor(),1.8,.7),dx:1,dy:0});
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
  // The physically lit figures are baked once in eight directions. The red channel
  // carries light, green identifies the material, and blue mixes the two materials
  // at a silhouette or seam. A 48×84 frame is tinted only the first time it is used.
  const figureTemplates = new Map(), figureLoads = new Map(), figureFrames = new Map();
  const lookPalettes = new Map(), pedestrianLooks = new Map();
  const heroLook = {skin:SKIN[0], hair:'#3d4237', style:0, cloth:['#ce984e','#996d3f','#e4c788'], slot:3};
  function remember(cache, key, value, limit) {
    cache.delete(key);
    cache.set(key,value);
    if (cache.size > limit) cache.delete(cache.keys().next().value);
    return value;
  }
  function figureTemplate(name, whenReady) {
    if (figureTemplates.has(name)) return remember(figureTemplates,name,figureTemplates.get(name),8);
    if (typeof Image !== 'function' || typeof document === 'undefined') return null;
    let listeners = figureLoads.get(name);
    if (!listeners) {
      listeners = new Set(); figureLoads.set(name,listeners);
      const image = new Image(); image.decoding = 'async';
      const finish = pixels => {
        remember(figureTemplates,name,pixels,8);
        figureLoads.delete(name);
        if (pixels) for (const fn of listeners) fn();
      };
      image.onload = () => {
        let pixels = null;
        const sheet = document.createElement('canvas');
        sheet.width = image.naturalWidth; sheet.height = image.naturalHeight;
        try {
          if (sheet.width===384 && sheet.height===564) {
            const paint = sheet.getContext('2d',{willReadFrequently:true});
            paint.drawImage(image,0,0);
            pixels = paint.getImageData(0,0,sheet.width,sheet.height);
          }
        } catch { /* A local-file origin may protect readback. The vector figure stays available. */ }
        sheet.width = sheet.height = 1; finish(pixels);
      };
      image.onerror = () => finish(null);
      image.src = `art/figure-${name}.webp`;
    }
    if (whenReady) listeners.add(whenReady);
    return null;
  }
  function fabricPalette(look) {
    const key = [look.slot,look.skin[0],look.hair,look.cloth[0]].join('/');
    if (lookPalettes.has(key)) return lookPalettes.get(key);
    const rgb = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
    const mix = (a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
    const warm = [246,220,178], cool = [31,39,46];
    const base = [null,look.skin[0],look.hair,look.cloth[0],look.slot===2?'#e2b266':look.cloth[2],
      '#41585b','#675044','#a77b4e',look.cloth[1],'#6d805e','#cbbf9e','#2d3433','#aebbb3',
      look.skin[1],'#e4dac5','#f5e8cf','#bc8f59','#504338',look.hair];
    const table = new Uint8ClampedArray(base.length*32*3);
    for (let material=1; material<base.length; material++) {
      const colour = rgb(base[material]);
      let dark = mix(colour,cool,.58), light = mix(colour,warm,.33);
      if (material===1) {dark=mix(rgb(look.skin[1]),cool,.31); light=mix(rgb(look.skin[2]),warm,.22);}
      if (material===2) {dark=mix(colour,[18,24,27],.60); light=mix(colour,warm,.17);}
      if (material===18) {for(let k=0;k<3;k++) colour[k]=colour[k]*.76+cool[k]*.24;dark=mix(colour,cool,.48);light=mix(colour,warm,.10);}
      if (material===13) {for(let k=0;k<3;k++)colour[k]=colour[k]*.60+[137,76,68][k]*.40;light=mix(colour,warm,.18);}
      for (let shade=0; shade<32;shade++) {
        const level = shade/31, t = level < .49 ? level/.49 : (level-.49)/.51;
        table.set(mix(level < .49 ? dark : colour,level < .49 ? colour : light,t),(material*32+shade)*3);
      }
    }
    return remember(lookPalettes,key,{key,table},32);
  }
  function figureFrame(look,heading,pose,whenReady,loaded=false,portraitView=false) {
    const rig = `${loaded?4:look.slot}-${look.style}`;
    const palette = fabricPalette(look);
    const key = `${rig}/${palette.key}/${portraitView?'portrait':heading+'/'+pose}`;
    if (figureFrames.has(key)) return remember(figureFrames,key,figureFrames.get(key),128);
    const source = figureTemplate(rig,whenReady);
    if (!source) return null;
    const x0 = portraitView?0:heading*48, y0 = portraitView?420:pose*84;
    const tile = document.createElement('canvas');
    tile.width=portraitView?144:48; tile.height=portraitView?144:84;
    const g=tile.getContext('2d'), image=g.createImageData(tile.width,tile.height);
    const dst=image.data, src=source.data, lut=palette.table;
    for (let y=0; y<tile.height; y++) {
      let i=((y+y0)*source.width+x0)*4, j=y*tile.width*4;
      for (let x=0; x<tile.width; x++,i+=4,j+=4) {
        if (!src[i+3]) continue;
        const shade=src[i]>>>3, first=Math.max(1,Math.min(18,Math.round(src[i+1]/14)));
        const a=(first*32+shade)*3, second=src[i+2]>>>3, fraction=(src[i+2]&7)/8;
        if (second && second<=18 && fraction>0) {
          const b=(second*32+shade)*3;
          for (let k=0;k<3;k++) dst[j+k]=lut[a+k]+(lut[b+k]-lut[a+k])*fraction;
        } else {dst[j]=lut[a];dst[j+1]=lut[a+1];dst[j+2]=lut[a+2];}
        dst[j+3]=src[i+3];
      }
    }
    g.putImageData(image,0,0);
    return remember(figureFrames,key,tile,128);
  }
  function pedestrianLook(coat) {
    if (pedestrianLooks.has(coat)) return pedestrianLooks.get(coat);
    const n=hash(coat), look={slot:1,style:(n>>>8)&1,hair:HAIR[(n>>>4)%6],skin:SKIN[n%6],cloth:[coat,'#61746c','#c8c4a8']};
    pedestrianLooks.set(coat,look); return look;
  }
  function paintResidentPortrait(canvas,look,whenReady) {
    const frame=figureFrame(look,0,0,whenReady,false,true);
    if (!frame) return false;
    canvas.width=canvas.height=144; canvas.style.imageRendering='auto';
    const g=canvas.getContext('2d');
    const wash=g.createLinearGradient(4,0,135,138);
    wash.addColorStop(0,'#8f9b88');wash.addColorStop(.50,'#536e68');wash.addColorStop(1,'#2c494a');
    g.fillStyle=wash; g.fillRect(0,0,144,144);
    g.drawImage(frame,0,0);
    if (look.glasses) {
      g.strokeStyle='#504b3e';g.lineWidth=1.55;
      for (const [x,y,rx] of [[71,63.5,9.5],[97,61.7,7.9]]) {
        g.beginPath();g.ellipse(x,y,rx,6.2,-.05,0,Math.PI*2);g.stroke();
      }
      g.beginPath();g.moveTo(80,62);g.quadraticCurveTo(85,59.5,89,61);g.moveTo(61,63);g.lineTo(50,61.5);g.stroke();
    }
    return true;
  }
  function portrait(canvas,site,resident){
    if(!canvas?.getContext||!site||!resident)return false;
    const a=appearance(site,resident),ctx=canvas.getContext('2d');if(!ctx)return false;
    if(paintResidentPortrait(canvas,a,()=>paintResidentPortrait(canvas,a)))return true;
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
    let ctx=canvas.getContext('2d',{alpha:false});
    const state={site:null,seed:0,lots:[],points:[],solids:[],trees:[],decor:[],links:[],looks:new Map(),traffic:null,preview:null,companion:null,shiftStops:[],placed:null,mode:'walk',player:{...marketDoor(),dx:0,dy:1},van:vanAtExchange(),route:[],destination:null,arrival:null,hover:null,active:null};
    let width=0,height=0,unit=30,zoom=1,pixelRatio=1,centreX=state.player.x,centreY=state.player.y;
    let frame=0,idleTimer=0,lastFrame=0,visualTime=0,dirty=true,alive=true,visible=true;
    let shortMessage='',messageUntil=0,cameraFollows=true;
    let priorPlacementView=null,overviewZoom=null,placingFocus=0,previewedPlot=null,dragging=null,pinch=null,groundCache=null;
    let miniCanvas=null,miniButton=null,miniTick=-1;
    let zoomTimer=0, backdropGradient=null, backdropSite=null;
    const compactTextures=typeof navigator!=='undefined' && navigator.deviceMemory>0 && navigator.deviceMemory<=4;
    // At a 40-unit bake the entire map fits in a 3,360 × 1,720 texture.
    const maxGroundUnit=compactTextures?32:40;
    const fitZoom=()=>clamp(Math.min(width/57,height/33)/baseUnit(),.29,1.55);
    const lightRig=window.EarthTownLight;
    let evening=false, streetLights=[];
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
    function followTarget() {
      if(state.placed)return {x:SIDE/2,y:SIDE/2};
      const p=state.player;
      // Leave a little more of the town in front of the camera at the outer kerbs.
      // Bound the shift in screen space so a narrow phone still frames the player.
      const x=(p.x-SIDE/2)*.28, y=(p.y-SIDE/2)*.28;
      const limit=Math.min(1, .15*width/(Math.abs(x-y)*unit||1), .13*height/(Math.abs(x+y)*unit*TILT||1));
      return {x:p.x-x*limit,y:p.y-y*limit};
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
    // Materials, foliage and street furniture share one street-only atlas.
    const groundMaterials = new Map();
    const treeFoot = [.379, .522, .479, .504];
    const treeHeight = [2.52,2.42,2.27,2.30];
    const materialPixels = compactTextures ? 128 : 160;
    let plantingAtlas = null;
    let plantingRequested = false;
    function requestPlantingAtlas() {
      if (plantingRequested || typeof Image !== 'function') return;
      plantingRequested = true;
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        if (!alive) return;
        plantingAtlas = image;
        clearGround();
        dirty = true;
        schedule();
      };
      image.src = 'town-landscape-v1.webp';
    }
    function groundMaterial(index) {
      if (!plantingAtlas) return null;
      if (groundMaterials.has(index)) return groundMaterials.get(index);
      const tile = document.createElement('canvas');
      tile.width = tile.height = materialPixels;
      const g = tile.getContext('2d');
      if (!g) return null;
      g.drawImage(plantingAtlas, (index % 4) * 256, (1 + Math.floor(index / 4)) * 256, 256, 256, 0, 0, materialPixels, materialPixels);
      const pattern = ctx.createPattern(tile, 'repeat');
      groundMaterials.set(index, pattern);
      return pattern;
    }
    // Apply the image in world space, so the size and direction of stone joints survive pan and zoom.
    function groundSurface(vertices, index, period, fallback, height = .008) {
      const material = groundMaterial(index);
      if (!material) { poly(vertices.map(([x,y]) => [x,y,height]), fallback); return; }
      const origin = screen(0,0,height);
      const scale = period * unit / materialPixels;
      ctx.save();
      ctx.transform(scale, scale*TILT, -scale, scale*TILT, origin[0], origin[1]);
      ctx.fillStyle = material;
      ctx.beginPath();
      const factor = materialPixels / period;
      vertices.forEach(([x,y], i) => {
        if (i) ctx.lineTo(x*factor, y*factor);
        else ctx.moveTo(x*factor, y*factor);
      });
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
    const castTrees = new Map();
    function treeSpecies(seed,palm) {
      const lat=Math.abs(state.site?.lat || 0);
      if(palm) return 0;
      if(lat>53 && seed%3!==0) return 3;
      return lat<30 ? 1 : 2;
    }
    function treeSize(size,species) { return unit*size*treeHeight[species]; }
    function castTree(tree) {
      const species=treeSpecies(tree.index,tree.palm), h=treeSize(tree.size,species);
      const p=screen(tree.x,tree.y,.09);
      if(!plantingAtlas){ellipse(p[0]+h*.14,p[1]+h*.034,h*.28,h*.088,'rgba(48,50,35,.21)');return;}
      if(!castTrees.has(species)) {
        const mask=document.createElement('canvas'); mask.width=mask.height=96;
        const g=mask.getContext('2d');
        if(!g)return;
        g.drawImage(plantingAtlas,species*256,0,256,256,0,0,96,96);
        g.globalCompositeOperation='source-in';g.fillStyle='#26352f';g.fillRect(0,0,96,96);
        castTrees.set(species,mask);
      }
      ctx.save();
      ctx.transform(.73,.016,-.49,-.19,p[0],p[1]);ctx.globalAlpha=.36;
      ctx.drawImage(castTrees.get(species),-h*treeFoot[species],-h*.9766,h,h);
      ctx.restore();
    }
    function plant(x,y,size,seed,palm=false) {
      const species=treeSpecies(seed,palm),h=treeSize(size,species),foot=screen(x,y,.086);
      ellipse(foot[0],foot[1],unit*size*.143,unit*size*.056,'rgba(49,48,32,.22)');
      if (plantingAtlas) {
        ctx.drawImage(plantingAtlas, species*256, 0, 256, 256, foot[0] - h*treeFoot[species], foot[1] - h*.9766, h, h);
        return;
      }
      // A network failure still leaves a complete and navigable district.
      line(x,y,0,x,y,1.04*size,'#6c6044',Math.max(1.1,unit*.096*size));
      const crown = screen(x,y,1.26*size);
      if (palm) {
        const tones = ['#667b40','#7e934e','#476c49','#52764a'];
        for (let i=0; i<8; i++) {
          const angle = i*Math.PI/4 + .12, dx = Math.cos(angle)*h*.37, dy = Math.sin(angle)*h*.15;
          path([crown,[crown[0]+dx*.56,crown[1]+dy*.48-h*.09],[crown[0]+dx,crown[1]+dy+h*.05],[crown[0]+dx*.5,crown[1]+dy*.52-h*.04]],tones[i%4]);
        }
      } else {
        ellipse(crown[0],crown[1],h*.32,h*.25,'#4c6b48');
        ellipse(crown[0]-h*.1,crown[1]-h*.06,h*.235,h*.19,'#748a53');
        ellipse(crown[0]-h*.14,crown[1]-h*.11,h*.15,h*.115,'#8ca267');
      }
    }
    function roofPanel(x,y,z,w,d) {
      rect(x,y,w,d,z,'#2c505d','#82a8a5',Math.max(.6,unit*.024));
      for(let i=1;i<4;i++)line(x+w*i/4,y,z+.003,x+w*i/4,y+d,z+.003,'#678793',Math.max(.5,unit*.018));
      line(x,y+d/2,z+.004,x+w,y+d/2,z+.004,'#678793',Math.max(.5,unit*.018));
    }
    function residence(item) {
      const {x,y,index:i}=item; const w=2.52,d=2.18,h=[1.46,2.08,1.63][i];const px=x-w/2,py=y-d/2;
      shadow(px,py,w,d,h);
      if(window.EarthTownArchitecture?.draw(ctx,state.site,'home',i,...screen(x,y),unit))return;
      box(px,py,w,d,0,h,'#bba682',['#b99877','#9bada0','#b7ac89'][i],['#887c6a','#728f85','#959278'][i]);
      // Eaves shade the upper facade, with a warmer bounce from the paving below.
      const wall=ctx.createLinearGradient(...screen(px+w/2,py+d,h),...screen(px+w/2,py+d,0));
      wall.addColorStop(0,'rgba(32,36,39,.35)');
      wall.addColorStop(.22,'rgba(51,43,37,.07)');
      wall.addColorStop(1,'rgba(242,197,138,.17)');
      poly([[px,py+d,0],[px+w,py+d,0],[px+w,py+d,h],[px,py+d,h]],wall);
      for(let row=.19;row<h;row+=.21){
        line(px,py+d,row,px+w,py+d,row,'rgba(70,63,53,.18)',Math.max(.55,unit*.019));
      }
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
      shadow(px,py,w,d,h);
      if(window.EarthTownArchitecture?.draw(ctx,state.site,small?'market':'exchange',0,...screen(x,y),unit))return;
      box(px,py,w,d,0,h,'#b6a37a','#b99971','#8d8368');
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
      shadow(px,py,w,d,h);
      if(window.EarthTownArchitecture?.draw(ctx,state.site,kind,0,...screen(x,y),unit))return;
      box(px,py,w,d,0,h,'#939d85',kind==='hall'?'#bdad87':'#9f9d82',kind==='hall'?'#9a947a':'#768a79');windows(px,py,w,d,.55,h,4);
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
    // Slot, projected dimensions and contact point for the bench, lamp, kiosk and noticeboard.
    const furnitureArt = [
      [1.18,.94,.506,.773], [1.42,1.76,.410,.965], [2.12,2.15,.495,.891], [1.55,1.29,.506,.742]
    ];
    function furniture(slot,x,y) {
      if(!plantingAtlas)return false;
      const [w,h,ax,ay]=furnitureArt[slot],p=screen(x,y,.073);
      const radius=[.46,.12,.63,.36][slot]*unit;
      ellipse(p[0]+radius*.28,p[1]+radius*.12,radius,radius*.22,'rgba(47,53,40,.22)');
      ctx.drawImage(plantingAtlas,512+slot*128,640,128,128,p[0]-w*unit*ax,p[1]-h*unit*ay,w*unit,h*unit);
      return true;
    }
    function bench(x,y) {
      if(furniture(0,x,y))return;
      for(let i=0;i<3;i++)box(x-.42,y-.19+i*.13,.84,.08,.18,.06,'#b7a17d','#8b775f','#776e59');
      line(x-.29,y-.07,0,x-.29,y-.07,.22,'#515f56',Math.max(1,unit*.055));line(x+.29,y-.07,0,x+.29,y-.07,.22,'#515f56',Math.max(1,unit*.055));
    }
    function kiosk(x,y) {
      if(furniture(2,x,y))return;
      box(x-.49,y-.37,.98,.74,0,1.05,'#7e9687','#a0aa91','#7c9281');
      rect(x-.66,y-.52,1.32,1.04,1.12,'#71867c');
      poly([[x-.32,y+.375,.45],[x+.32,y+.375,.45],[x+.32,y+.375,.88],[x-.32,y+.375,.88]],'#385553');
    }
    function lamp(x,y) {
      if(furniture(1,x,y))return;
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
        // Shallows and reflected light are anchored to the shore and baked into the ground tile.
        const coast=SIDE+1.25;
        for(let band=13;band>=0;band--){
          const depth=.3+band*.49, points=[[-1.4,coast,-.46],[SIDE+1.3,coast,-.46]];
          for(let j=32;j>=0;j--){
            const x=-1.4+j*(SIDE+2.7)/32;
            points.push([x,coast+depth*(1+.12*Math.sin(x*.83)+.09*Math.cos(x*1.42)),-.46]);
          }
          poly(points,'rgba(83,177,160,.045)');
        }
        for(let i=0;i<205;i++){
          const x=-1.2+noise(state.seed,i,711)*(SIDE+2);
          const y=coast+.13+noise(state.seed,i,712)**1.6*6;
          const length=.09+.48*noise(state.seed,i,713);
          line(x,y,-.44,x+length,y-length*.56,-.44,'rgba(194,231,208,.33)',Math.max(.55,unit*.025));
        }
        for(let k=0;k<4;k++) {
          const px=3+6*k,py=SIDE+1.12;
          const length=k===2?2.58:2.21;
          // The dock frame is below its deck. Its reflection runs along the shaded side of the pontoon.
          poly([[px-.40,py,-.45],[px+.72,py,-.45],[px+.78,py+length+.27,-.45],[px-.32,py+length+.23,-.45]],'rgba(36,68,65,.31)');
          box(px-.48,py,.96,length,-.29,.18,'#a69472','#746854','#625f50');
          groundSurface([[px-.46,py],[px+.46,py],[px+.46,py+length],[px-.46,py+length]],5,3.20,'#a79879',-.095);
          for(let post=0;post<3;post++) {
            for(const side of [-1,1]) {
              const x=px+side*.49,y=py+.12+post*(length-.21)/2;
              box(x-.045,y-.045,.105,.105,-.40,.69,'#c7b594','#897b61','#686656');
              box(x-.058,y-.059,.13,.13,.29,.045,'#b8aa8f','#8a836d','#756e5f');
              if(side>0 && post===1) {
                const tire=screen(x+.02,y+.04,-.18); const r=unit*.115;
                ctx.beginPath();ctx.ellipse(...tire,r*.72,r,0,0,Math.PI*2);
                ctx.lineWidth=Math.max(.8,unit*.044);ctx.strokeStyle='#4d5049';ctx.stroke();
              }
              if(side<0 && post<2) {
                const next=y+(length-.21)/2;
                path([screen(x,y,.22),screen(x,(y+next)/2,.11),screen(x,next,.22)],null,'#c1ad85',Math.max(.6,unit*.026));
              }
            }
          }
          if(k%2===1) {
            const coil=screen(px-.17,py+length-.29,-.083);
            for(const r of [.14,.10,.060])ellipse(...coil,unit*r,unit*r*.49,null,'#9a8361');
          }
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
      const art=window.EarthTownSurroundings;
      const indianOcean=state.site.lon>36 && state.site.lon<81 && state.site.lat>-22 && state.site.lat<19;
      if(large && art?.drawBoat?.(ctx,screen,unit,'canopy',x,y,.73,false))return;
      if(x<6 && indianOcean && art?.drawBoat?.(ctx,screen,unit,'lateen',x,y,.56,true))return;
      const a=large?1.31:.96, b=large?.41:.33;
      const outline=[[-1,0],[-.68,-.74],[-.14,-1],[.58,-.94],[.98,-.54],[.91,.54],[.48,.86],[-.18,1],[-.69,.68]];
      const hull=(scale,z,drift=0)=>outline.map(([xx,yy])=>[x+xx*a*scale,y+yy*b*scale+drift,z]);
      poly(hull(1.06,-.48,.10),'rgba(41,75,73,.35)');
      poly(hull(1,-.435),'#5b6156');poly(hull(1,-.35),paint);
      poly(hull(1,-.27),'#c5b492');poly(hull(.85,-.265),'#72674d');
      for(const place of [-.52,-.05,.46]) {
        const xx=x+place*a;
        box(xx-.045,y-.72*b,.12,b*1.38,-.265,.078,'#bc9d73','#9e805c','#77684e');
      }
      if(large) {
        box(x-.18,y-.66*b,a*.77,b*1.34,-.23,.37,'#c4c3a2','#82978f','#687e79');
        roofPanel(x-.11,y-.44*b,.151,a*.59,b*.77);
      } else {
        // Two crossed oars and a short painter pick out the scale of an open working skiff.
        line(x-.62*a,y+.68*b,-.14,x+.81*a,y-.39*b,-.10,'#a48a63',Math.max(.7,unit*.033));
        line(x-.60*a,y-.65*b,-.12,x+.50*a,y+.70*b,-.08,'#c2a57a',Math.max(.7,unit*.033));
        poly([[x+.53*a,y-.245*b,-.092],[x+.80*a,y-.44*b,-.092],[x+.93*a,y-.43*b,-.092],[x+.82*a,y-.28*b,-.092]],'#b79163');
        path([screen(x-.96*a,y,-.25),screen(x-1.09*a,y-.29,-.38),screen(x-1.43*a,y-.73,-.14)],null,'#b4a27b',Math.max(.5,unit*.019));
      }
    }
    function exchangeDetails(p){
      // Produce baskets and a public noticeboard make the market readable from the street.
      for(let i=0;i<3;i++){
        const x=p.x-1.63+i*.32,y=p.y+1.38;
        box(x,y,.27,.29,0,.17,'#af9265','#917a55','#7e7254');
        for(let k=0;k<3;k++)sphere(x+.06+k*.064,y+.12,.19,.055,.05,i%2?'#91aa74':'#d1a365');
      }
      const x=p.x+1.83,y=p.y+.5;
      if(furniture(3,x+.22,y))return;
      for(const off of [0,.61])line(x+off,y,.02,x+off,y,.99,'#6b6c54',Math.max(.9,unit*.054));
      poly([[x-.07,y,.43],[x+.69,y,.43],[x+.69,y,1.06],[x-.07,y,1.06]],'#a38e66','#69755e',Math.max(.65,unit*.035));
      for(let i=0;i<3;i++)poly([[x+.02+i*.2,y+.016,.63],[x+.18+i*.2,y+.016,.63],[x+.18+i*.2,y+.016,.9-i*.04],[x+.02+i*.2,y+.016,.9-i*.04]],i%2?'#9caca0':'#d6cca1');
    }
    function plazaOutline(cx,cy,half,corner) {
      return [[cx-half+corner,cy-half],[cx+half-corner,cy-half],[cx+half,cy-half+corner],[cx+half,cy+half-corner],
        [cx+half-corner,cy+half],[cx-half+corner,cy+half],[cx-half,cy+half-corner],[cx-half,cy-half+corner]];
    }
    function kerbStones(outline, marina) {
      const sun = marina ? '#bcab87' : '#dbcbac';
      const shade = marina ? '#806c52' : '#978a72';
      for (let k=0; k<outline.length; k++) {
        const a=outline[k], b=outline[(k+1)%outline.length], dx=b[0]-a[0], dy=b[1]-a[1];
        const length=Math.hypot(dx,dy);
        line(...a,.078,...b,.078, k<2||k===7 ? sun : shade, Math.max(.65,unit*.033));
        const stones=Math.max(1,Math.round(length/.52));
        for (let j=0; j<stones; j++) {
          const f=(j+.45)/stones, x=a[0]+dx*f, y=a[1]+dy*f;
          line(x,y,.078,x-dy*.094/length,y+dx*.094/length,.078,'rgba(75,65,51,.39)',Math.max(.5,unit*.015));
        }
      }
    }
    function shrub(x,y,species,size) {
      if(!plantingAtlas) return;
      const foot=screen(x,y,.092), h=size*unit;
      ellipse(foot[0]+h*.09,foot[1]+h*.013,h*.29,h*.088,'rgba(58,67,39,.24)');
      ctx.drawImage(plantingAtlas,512+species*128,512,128,128,foot[0]-h*.5,foot[1]-h*.969,h,h);
    }
    function wildParcel(p,cell) {
      const seed=state.seed^Math.imul(cell+3,374761393);
      const warm=Math.abs(state.site?.lat||0)<32;
      const variant=Math.floor(noise(seed,43,58)*4);
      if(variant===1 || variant===2) {
        // Grass gives way to a disturbed patch of earth. Each parcel keeps clear sightlines through its centre.
        const corner=variant===1 ? -1 : 1;
        const soil=[[p.x+corner*.39,p.y-1.53],[p.x+corner*1.39,p.y-1.61],[p.x+corner*1.58,p.y-1.1],
                    [p.x+corner*1.43,p.y-.62],[p.x+corner*.90,p.y-.98],[p.x+corner*.61,p.y-1.03]];
        ctx.save();ctx.globalAlpha=.62;
        groundSurface(soil,3,2.7,'#ab9876',.091);ctx.restore();
        for(let i=0;i<8;i++){
          const x=p.x+corner*(.72+.62*noise(seed,i,46)), y=p.y-1.15+(.5-noise(seed,i,52))*.43;
          const stone=screen(x,y,.097),radius=(.026+.045*noise(seed,i,16))*unit;
          ellipse(stone[0],stone[1],radius,radius*.42,'#847f64');
          ellipse(stone[0]-radius*.2,stone[1]-radius*.18,radius*.80,radius*.39,'#c2b495');
        }
      }
      const latitude=Math.abs(state.site?.lat || 0);
      for(let i=0;i<2+(variant%2);i++) {
        const side=i%2===0?-1:1;
        const x=p.x+side*(.86+.41*noise(seed,i,37));
        const y=p.y-.2+(noise(seed,i,92)-.5)*2.16;
        const species=i===0&&variant===3?(warm?1:3):i===1&&warm?2:latitude>53?3:0;
        shrub(x,y,species,.57+.38*noise(seed,i,99));
      }
    }
    function occupiedBerth(p,cell) {
      // The hull sits in a flooded well. The continuous outer boardwalk and front gangway keep the public entrance at y+2.04.
      const cut=plazaOutline(p.x,p.y,1.84,.18);
      poly(cut.map(([x,y])=>[x,y,.085]),'#625f50','#beaa85',Math.max(.65,unit*.04));
      const water=plazaOutline(p.x,p.y,1.78,.16);
      const a=screen(p.x-1.4,p.y-1.4),b=screen(p.x+1.7,p.y+1.7);
      const depth=ctx.createLinearGradient(...a,...b);
      depth.addColorStop(0,'#466f6a');depth.addColorStop(.45,'#508e86');depth.addColorStop(1,'#73aaa0');
      poly(water.map(([x,y])=>[x,y,.053]),depth);
      for(let i=0;i<21;i++){
        const xx=p.x+(noise(state.seed,cell*23+i,19)-.5)*3.21,yy=p.y+(noise(state.seed,cell*31+i,88)-.5)*3.21;
        const at=screen(xx,yy,.061),l=(.06+noise(state.seed,cell,i)*.18)*unit;
        path([[at[0]-l,at[1]],[at[0]+l*.23,at[1]-.33]],null,'rgba(184,224,205,.38)',Math.max(.5,unit*.019));
      }
      const front=p.y+2.02;
      box(p.x-.39,p.y+1.0,.78,1.02,.065,.09,'#9d8a69','#85775d','#6f6855');
      groundSurface([[p.x-.38,p.y+1],[p.x+.38,p.y+1],[p.x+.38,front],[p.x-.38,front]],5,2.03,'#b29e7a',.159);
      for(const side of [-1,1]) {
        box(p.x+side*.41-.04,p.y+1.80,.09,.09,.035,.33,'#bead8b','#7c735c','#696653');
        for(const offset of [-1.30,1.30]) {
          const foot=screen(p.x+side*1.75,p.y+offset,.054);
          ellipse(...foot,unit*.10,unit*.056,'#475951');
          ellipse(foot[0]-.01*unit,foot[1],unit*.044,unit*.023,'#638c80');
        }
      }
    }
    function emptyBerth(p,cell) {
      const deck=plazaOutline(p.x,p.y,1.71,.18);
      groundSurface(deck,5,2.65,'#aa9472',.085);
      const pad=plazaOutline(p.x,p.y,.74,.12);
      poly(pad.map(([x,y])=>[x,y,.094]),'rgba(75,74,58,.15)','rgba(87,82,62,.48)',Math.max(.6,unit*.022));
      for(const side of [-1,1]) {
        const x=p.x+side*1.10,y=p.y-1.21;
        box(x-.32,y-.26,.64,.52,.083,.14,'#a8936d','#937d5e','#736f55');
        rect(x-.25,y-.19,.50,.38,.225,'#6f7450');
        shrub(x,y,cell%2?0:2,.62);
      }
      const cleat=screen(p.x+.93,p.y+.98,.105);
      ellipse(...cleat,unit*.115,unit*.046,'#676c61');
      line(p.x+.84,p.y+.97,.11,p.x+1.04,p.y+.98,.15,'#b9b19b',Math.max(.7,unit*.042));
    }
    function parkPlanting(p,cell,marine) {
      // The planting is flat ground cover, so unbuilt parcels remain visibly open for construction.
      const seed=state.seed^Math.imul(cell+1,1664525);
      for (let bed=0; bed<5; bed++) {
        const angle=bed*1.257+noise(seed,bed,17)*.44;
        const x=p.x+Math.cos(angle)*(1.24+noise(seed,bed,18)*.35), y=p.y+Math.sin(angle)*(1.17+noise(seed,bed,19)*.35);
        for(let j=0;j<14;j++) {
          const xx=x+(noise(seed,j,bed+70)-.5)*.61, yy=y+(noise(seed,j,bed+81)-.5)*.58;
          const offset=.04+.10*noise(seed,j,bed+36), s=screen(xx,yy,.054);
          const shadow=screen(xx+.03,yy-.01,.05);
          ellipse(...shadow,unit*.055,unit*.022,'rgba(51,57,36,.32)');
          line(xx,yy,.06,xx+offset*.34,yy,.06+offset, j%3?'#667b4a':'#8c9658',Math.max(.5,unit*.034));
          if(j%5===1&&bed%2===0) ellipse(s[0]+unit*.034,s[1]-unit*offset,unit*.035,unit*.025,marine?'#d9c580':'#e5d09c');
        }
      }
    }
    function drain(x,y,across,wood) {
      const w=across?.34:.12,d=across?.12:.34;
      rect(x,y,w,d,.023,wood?'#746750':'#646b61');
      for(let j=0;j<5;j++) {
        const f=(j+.5)/5;
        if(across) line(x+w*f,y+.018,.025,x+w*f,y+d-.018,.025,'#3e4946',Math.max(.52,unit*.019));
        else line(x+.018,y+d*f,.025,x+w-.018,y+d*f,.025,'#3e4946',Math.max(.52,unit*.019));
      }
    }
    function ground() {
      requestPlantingAtlas();
      const s=state.site,water=Boolean(s?.water);
      const surroundings=window.EarthTownSurroundings;
      if(surroundings) surroundings.paint(ctx,screen,unit,s,state.seed,plant);
      if(water || !surroundings) landscape();
      const cold=Math.abs(s?.lat||0)>57;
      const zanzibar=surroundings?.profile ? surroundings.profile(s)==='zanzibar' : Math.abs((s?.lat??90)+6.163)<.046 && Math.abs((s?.lon??0)-39.189)<.036;
      const top=-1.26,end=SIDE+1.26,span=end-top;
      // The sea wall and the low foundation stand below the usable quay and streets.
      box(top-.08,top-.08,span+.16,span+.16,-.44,.40,water?'#8f816b':'#998e71',water?'#7a715e':'#8a816c',water?'#5d625b':'#766e5c');
      groundSurface([[top,top],[end,top],[end,end],[top,end]],water?5:zanzibar?1:2,water?3.8:zanzibar?2.45:3.1,water?'#9a8b72':zanzibar?'#8e8b77':'#70726a',0);
      if(zanzibar) {
        // The broad quay carries deliveries, while the smaller lanes have hand-laid stone setts.
        groundSurface([[top,SIDE-.89],[end,SIDE-.89],[end,end],[top,end]],2,3.1,'#70726a',.002);
        groundSurface([[12-.89,top],[12+.89,top],[12+.89,end],[12-.89,end]],2,3.1,'#70726a',.002);
      }
      if (water || zanzibar) {
        for(let j=0;j<46;j++) {
          const a=top+j*span/46;
          line(a,end+.053,-.35,a-.025,end+.053,-.055,'rgba(54,62,54,.42)',Math.max(.55,unit*.024));
          if(water && j%6===2)box(a,end+.04,.14,.12,-.55,.60,'#ac9776','#756d58','#5e604f');
        }
      }
      for(let by=0;by<4;by++)for(let bx=0;bx<4;bx++) {
        const block=[bx,by],p=centre(block),cell=by*4+bx,lot=state.lots.find(l=>sameBlock(l.block,block));
        const marketBlock=sameBlock(block,MARKET),home=HOMES.some(b=>sameBlock(b,block));
        const hard=marketBlock||home||['market','hall','workshop','pier'].includes(lot?.building?.kind);
        const park=!lot && !home && !marketBlock;
        const kerb=plazaOutline(p.x,p.y,BLOCK/2-HALF_ROAD,.31), interior=plazaOutline(p.x,p.y,1.75,.22);
        // Preserve the bevel and narrow contact shadow even when the raster has not arrived.
        poly(kerb.map(([x,y])=>[x+.035,y+.012,-.01]),water?'#756e5e':'#4b524c');
        poly(kerb.map(([x,y])=>[x,y,.04]),water?'#93876d':'#b5aa92');
        groundSurface(kerb,water?5:0,water?3.2:3.0,water?'#b6a17f':zanzibar?'#d2c0a1':'#bcae94',.075);
        kerbStones(kerb,water);
        if(hard) {
          const finish=water?5:marketBlock?1:0;
          const vessel=water && (home || marketBlock || ['market','hall','workshop'].includes(lot?.building?.kind));
          if(vessel)occupiedBerth(p,cell);
          else groundSurface(interior,finish,marketBlock?2.72:2.2,water?'#b3a283':marketBlock?'#9b947d':'#c4b596',.078);
          if(home && !water && plantingAtlas) {
            const species=zanzibar&&cell!==15 ? 1 : cold ? 3 : 0;
            shrub(p.x-1.38,p.y+1.26,species,.87);
            if(cell%2)shrub(p.x-1.64,p.y+.89,cold?3:0,.56);
          }
          if(!water && (marketBlock||lot?.building?.kind==='market')) {
            // A stone sett apron leads the player to the same market entrance used by the simulation.
            for(const side of [-1,1])line(p.x+side*.94,p.y+1.35,.082,p.x+side*.94,p.y+2.0,.082,'rgba(225,209,173,.57)',Math.max(.8,unit*.041));
            const inset=screen(p.x,p.y+1.76,.084);
            ellipse(...inset,unit*.28,unit*.122,'rgba(108,104,81,.42)','#c9bd98');
            for(let ray=0;ray<8;ray++){
              const a=ray*Math.PI/4;
              path([inset,[inset[0]+Math.cos(a)*unit*.23,inset[1]+Math.sin(a)*unit*.091]],null,'rgba(218,200,154,.78)',Math.max(.55,unit*.021));
            }
          }
        } else if(water && lot && !lot.building) {
          emptyBerth(p,cell);
        } else {
          // Verge and meadow meet the pavement at a built edge.
          poly(interior.map(([x,y])=>[x,y,.083]),water?'#827a58':'#918c68');
          groundSurface(plazaOutline(p.x,p.y,1.69,.19),4,3.4, cold?'#95a18b':'#8f9b70',.085);
          const patch=Math.floor(noise(state.seed,cell,183)*5);
          if(!water && !park && !lot?.building && patch===2) {
            // An open sandy lot and recovering meadow read differently from an established park.
            const inside=plazaOutline(p.x,p.y,1.67,.19);
            ctx.save();ctx.globalAlpha=zanzibar?.72:.42;groundSurface(inside,3,2.7,'#ab9876',.087);ctx.restore();
          } else if(patch===0)poly(interior.map(([x,y])=>[x,y,.088]),'rgba(216,181,107,.14)');
          else if(patch===4)poly(interior.map(([x,y])=>[x,y,.088]),'rgba(61,96,68,.14)');
          if(cold)poly(interior.map(([x,y])=>[x,y,.088]),'rgba(184,211,194,.17)');
          if(park) {
            const route=[[p.x-.57,p.y-1.69],[p.x-.27,p.y-1.69],[p.x+.05,p.y-.81],[p.x-.13,p.y+.38],[p.x+.44,p.y+1.69],[p.x+.13,p.y+1.69],[p.x-.48,p.y+.4],[p.x-.26,p.y-.8]];
            groundSurface(route,3,2,'#b3a17e',.09);
          }
          if(!lot?.building)wildParcel(p,cell);
          parkPlanting(p,cell,water);
          if(lot&&!lot.building)for(const xx of [-1,1])for(const yy of [-1,1]){
            const x=p.x+xx*1.50,y=p.y+yy*1.50;
            line(x,y,.091,x-xx*.18,y,.091,'#d4c7a0',Math.max(.65,unit*.032));
            line(x,y,.091,x,y-yy*.18,.091,'#d4c7a0',Math.max(.65,unit*.032));
          }
        }
        // Crossing bars stop at the road gutter; remaining corners stay quiet and legible.
        if((!zanzibar && (bx+by)%2===0) || marketBlock || zanzibar && bx===1 && by%2===0)for(let j=0;j<5;j++) {
          const f=1.12+j*.15;
          if(bx<3)rect((bx+1)*BLOCK-.63,by*BLOCK+f,1.26,.075,.014,water?'#c8baa0':'#c9c7b5');
          if(by<3)rect(bx*BLOCK+f,(by+1)*BLOCK-.63,.075,1.26,.014,water?'#c8baa0':'#c9c7b5');
        }
        drain(bx*BLOCK+.71,by*BLOCK+2.04,false,water);
        drain(bx*BLOCK+3.78,by*BLOCK+.72,true,water);
      }
      // Market and garden streets are through routes. Residential lanes use a quieter shared surface.
      for(const axis of [1,2,4])for(let j=0;j<4;j++)for(let k=0;k<2;k++) {
        const a=j*BLOCK+2.36+k*1.09,b=axis*BLOCK;
        const paint=water?'rgba(225,213,175,.48)':'rgba(232,216,164,.68)';
        if(!zanzibar||axis===4)rect(a,b-.022,.39,.044,.016,paint);
        if(!zanzibar||axis===2)rect(b-.022,a,.044,.39,.016,paint);
      }
      for(const tree of state.trees){
        const lot=state.lots.find(record=>record.block[0]===Math.floor(tree.x/BLOCK)&&record.block[1]===Math.floor(tree.y/BLOCK));
        if(!lot || lot.building){
          const foot=screen(tree.x,tree.y,.091);
          ellipse(...foot,unit*.205,unit*.097,water?'#796e51':'#8a8063');
          ellipse(...foot,unit*.14,unit*.063,'#655f43');
        }
        castTree(tree);
      }
      streetName(15,24.44,'EXCHANGE ST','x');streetName(6.4,9,'GARDEN WALK','y');streetName(8.9,12.43,'COMMONS RD','x');
    }
    function clearGround() {
      if(!groundCache)return;
      if(typeof groundCache.tile.close==='function')groundCache.tile.close();
      else {groundCache.tile.width=1;groundCache.tile.height=1;}
      groundCache=null;
    }
    function cachedGround() {
      if(typeof document==='undefined'||!document.createElement){ground();return;}
      const targetUnit=clamp(16*Math.pow(Math.SQRT2,Math.round(Math.log(unit/16)/Math.log(Math.SQRT2))),8,maxGroundUnit);
      // Keep panning a single cached image while a pinch or scroll wheel is in motion.
      if(!groundCache||(!pinch&&!zoomTimer&&Math.abs(groundCache.unit-targetUnit)>.02)){
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
      if(state.site&&window.EarthTownSurroundings?.paintHorizon?.(ctx,screen,unit,width,height,state.site))return;
      if(!backdropGradient||backdropSite!==state.site?.id){
        const colors=window.EarthTownSurroundings?.background(state.site) || (state.site?.water?['#568984','#375f68']:['#758773','#526657']);
        backdropGradient=ctx.createLinearGradient(0,0,width,height);
        backdropGradient.addColorStop(0,colors[0]);backdropGradient.addColorStop(1,colors[1]);
        backdropSite=state.site?.id;
      }
      ctx.fillStyle=backdropGradient;ctx.fillRect(0,0,width,height);
    }
    function figuresLoaded() { if (alive) {dirty=true;schedule();} }
    function person(x,y,coat,angleX,angleY,walking,phase=0,player=false,look=null) {
      const heading=(Math.round(Math.atan2(angleY||0,angleX||0)/(Math.PI/4))+8)%8;
      const pose=walking&&!reduced ? 1+(Math.floor(phase/(Math.PI/2)+.5)%4+4)%4 : 0;
      const frame=figureFrame(look||(player?heroLook:pedestrianLook(coat)),heading,pose,figuresLoaded,player&&Boolean(state.site?.delivery));
      if (frame) {
        const p=screen(x,y), scale=unit*.0116;
        ellipse(p[0]+unit*.12,p[1]+unit*.04,unit*.23,unit*.075,'rgba(41,40,32,.17)');
        ellipse(p[0]+unit*.025,p[1]+unit*.016,unit*.13,unit*.050,'rgba(30,33,28,.30)');
        ctx.drawImage(frame,p[0]-24*scale,p[1]-74.4*scale,48*scale,84*scale);return;
      }
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
    // Orthographic bakes share the district camera's pitch. Steering selects a new heading
    // without rotating the painted highlights. Parked and laden vans use the same wheelbase.
    let transportSheet;
    function drawTransport(item, row, lit = false, occupied = false) {
      if (!transportSheet && typeof Image === 'function') {
        transportSheet = new Image();
        transportSheet.decoding = 'async';
        transportSheet.onload = () => { if (alive) { dirty = true; schedule(); } };
        transportSheet.src = 'art/transport.webp';
      }
      if (!transportSheet?.complete || !transportSheet.naturalWidth) return false;
      const angle = Math.atan2(item.dy || 0, item.dx || 0);
      const heading = (Math.round(angle / (Math.PI / 4)) + 8) % 8;
      const forwardX = Math.cos(heading * Math.PI / 4), forwardY = Math.sin(heading * Math.PI / 4);
      const [sx,sy] = screen(item.x,item.y);
      const tileWidth = unit * 3.27;
      const footprint = (along, across) => screen(item.x + along * forwardX - across * forwardY, item.y + along * forwardY + across * forwardX);
      const a = row === 2 ? .79 : .71, b = .32;
      const outline = [[-a,-b],[a*.87,-b],[a,-b*.72],[a,b*.76],[a*.86,b],[-a,b]].map(([u,v])=>footprint(u,v));
      path(outline.map(([x,y])=>[x+unit*.11,y+unit*.065]),'rgba(32,43,35,.18)');
      path(outline,'rgba(29,38,34,.29)');
      const paintRow = atlasRow => ctx.drawImage(transportSheet,heading*192,atlasRow*144,192,144,sx-tileWidth/2,sy-tileWidth*.491,tileWidth,tileWidth*.75);
      paintRow(row);
      if (occupied) {
        paintRow(3);
        if (state.companion) paintRow(4);
      }
      if (lit && forwardX + forwardY < -.1) {
        for (const side of [-1,1]) {
          const [lx,ly] = footprint(-.78,side*.23);
          ellipse(lx,ly-unit*.30,unit*.035,unit*.026,'#ffad65');
        }
      }
      return true;
    }
    function vehicle(item,driver) {
      if (drawTransport(item, driver && state.site?.delivery ? 1 : 0, false, driver)) return;
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
      if (drawTransport(q, 2, q.yielding || q.wait > 0)) return;
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
    function streetWalker(i) {
      if(i>=3){
        const crossing=pedestrianAt(i-3);
        return {...crossing,dx:0,pace:crossing.moves?.7:0,coat:i===3?'#c3a480':'#9bad94',phase:visualTime*5+i-3};
      }
      const t=((reduced?0:visualTime*.34)+i*2.91)%5.34;
      return {x:[2.03,8.01,14.11][i]+(t<2.67?t:5.34-t),y:[6.98,12.98,18.99][i],
        dx:t<2.67?1:-1,dy:0,pace:reduced?0:.55,coat:['#a9b99c','#c39c83','#8ca9ab'][i],phase:visualTime*4+i};
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
      const p=screen(q.x,q.y,.18),size=width<480?10.5:11.5;
      if(p[0]<0||p[0]>width||p[1]<0||p[1]>height)return;
      ctx.font=`600 ${size}px system-ui,sans-serif`;
      const maxWidth=Math.min(width*.55,240);
      if(ctx.measureText(label).width>maxWidth){
        while(label.length>1 && ctx.measureText(label+'…').width>maxWidth)label=label.slice(0,-1);
        label+='…';
      }
      const w=ctx.measureText(label).width+16,h=22;
      const onRight=p[0]+w+18<width-52;
      const x=clamp(onRight?p[0]+14:p[0]-14-w,6,width-w-6);
      const y=clamp(p[1]+5,6,height-h-7);
      path([[p[0],p[1]+3],[onRight?x:x+w,y+h*.5]],null,'#624c35',2.4);
      path([[p[0],p[1]+3],[onRight?x:x+w,y+h*.5]],null,'#f7e9c6',1.25);
      ctx.fillStyle='#213a37';ctx.beginPath();
      if(ctx.roundRect)ctx.roundRect(x,y,w,h,4);else ctx.rect(x,y,w,h);
      ctx.fill();ctx.strokeStyle='#d4c49e';ctx.lineWidth=1;ctx.stroke();
      text(x+w/2,y+h*.51,label,'#fff3d9',size);
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
    function residentFigure(point) {
      return {x:point.x+.47+(reduced?0:Math.sin(visualTime*.45+point.index)*.12),y:point.y-.21};
    }
    function draw() {
      if(!width||!height)return;
      ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);ctx.lineJoin='round';ctx.lineCap='round';background();
      if(!state.site)return;
      cachedGround();
      if(evening)lightRig?.paving(ctx,screen,unit,streetLights);
      if(state.placed){lotOverlay();showConnections();}routeRibbon();
      const list=[];
      const addItem=(x,y,depth,draw)=>{const p=screen(x,y);if(p[0]<-unit*4||p[0]>width+unit*4||p[1]<-unit*3||p[1]>height+unit*6)return;list.push({depth,draw});};
      // The two visible facades meet in front of the centre. Doorstep residents
      // are in front of the facade even when they stand left of its front corner.
      const blockDepth=p=>p.x+p.y+.35;
      {const p=centre(MARKET);addItem(p.x,p.y,blockDepth(p),()=>market(p));}
      {const p=centre(MARKET);addItem(p.x,p.y,p.x+p.y+2.68,()=>exchangeDetails(p));}
      if(state.site.water){for(let i=0;i<4;i++){const x=4.6+i*6,y=26.85;addItem(x,y,x+y+.14,()=>skiff(x,y,['#b77960','#799c94','#c3ac7e','#86a9ac'][i],i===2));}}
      HOMES.forEach((block,index)=>{const p=centre(block);addItem(p.x,p.y,blockDepth(p),()=>residence({...p,index}));});
      for(const lot of state.lots)if(lot.building){const item={...lot,kind:lot.building.kind};addItem(lot.x,lot.y,blockDepth(lot),()=>{
        if(!window.EarthTownProjects?.draw(ctx,state.site,item.kind,screen,item.x,item.y,unit))civic(item);
      });}
      for(const q of state.trees)addItem(q.x,q.y,q.x+q.y+.17,()=>plant(q.x,q.y,q.size,q.index,q.palm));
      for(const q of state.decor)addItem(q.x,q.y,q.x+q.y+.19,()=>({bench,lamp,kiosk}[q.type](q.x,q.y)));
      for(const light of streetLights){
        if(!light.market&&!evening)continue;
        addItem(light.x,light.y,light.x+light.y+.2,()=>{
          if(light.market)lightRig.lanternPost(ctx,screen,unit,light);
          if(evening)lightRig.halo(ctx,screen,unit,light);
        });
      }
      for(const q of state.points)if(q.type==='resident'&&q.residentId!==state.companion?.id){
        const {x,y}=residentFigure(q);
        addItem(x,y,x+y+.1,()=>person(x,y,COATS[q.index],1,0,0,q.index,false,state.looks.get(q.residentId)));
      }
      for(let i=0;i<5;i++){
        const w=streetWalker(i);
        addItem(w.x,w.y,w.x+w.y+(i<3?.01:.09),()=>person(w.x,w.y,w.coat,w.dx,w.dy,w.pace,w.phase));
      }
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
      if(evening)lightRig?.blueHour(ctx,width,height);
      if(state.placed)lotNumbers();else for(const point of state.points){
        const shiftStop=state.shiftStops.find(s=>window.EarthShifts.matches(s.venue,point));
        if(point.type==='building'&&state.active!==point&&!shiftStop)continue;
        pin(point,state.active===point,Boolean(shiftStop)||point.type==='resident'&&state.site.delivery?.residentId===point.residentId);
      }
      // A small diamond keeps the player's location readable behind rooflines.
      const cap=screen(p.x,p.y,state.mode==='drive'?1.11:.96);
      path([[cap[0],cap[1]-3.2],[cap[0]+3.7,cap[1]],[cap[0],cap[1]+3.2],[cap[0]-3.7,cap[1]]],'#f7cf86','#614f36',.9);
      if(!state.placed){
        if(state.hover)locationLabel(state.hover);
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
      if(traversable(target,driving))return {x:target.x,y:target.y};
      if(driving){
        // Park at the closest lane to an off-road tap inside the district.
        // A tap on the surrounding scenery must never send the van across town.
        if(target.x < -1 || target.x > SIDE+1 || target.y < -1 || target.y > SIDE+1)return null;
        const laneLimit=HALF_ROAD-.06,edge=.76;
        const along=(1-TILT*TILT)/(1+TILT*TILT);
        let best=null,bestError=Infinity;
        const consider=p=>{
          const dx=p.x-target.x,dy=p.y-target.y;
          const screenError=(dx-dy)**2+((dx+dy)*TILT)**2;
          if(screenError<bestError-1e-7||(Math.abs(screenError-bestError)<1e-7&&dist(p,state.player)<dist(best,state.player))){
            best=p;bestError=screenError;
          }
        };
        for(let lane=0;lane<=SIDE;lane+=BLOCK){
          const x=clamp(clamp(target.x,lane-laneLimit,lane+laneLimit),-edge,SIDE+edge);
          const y=clamp(clamp(target.y,lane-laneLimit,lane+laneLimit),-edge,SIDE+edge);
          consider({x,y:clamp(target.y+(x-target.x)*along,-edge,SIDE+edge)});
          consider({x:clamp(target.x+(y-target.y)*along,-edge,SIDE+edge),y});
        }
        return best;
      }
      let nearest=null,best=Infinity;
      for(let i=-7;i<=7;i++)for(let j=-7;j<=7;j++){
        const p={x:target.x+i*.23,y:target.y+j*.23},cost=Math.hypot(i,j);
        if(cost<best&&traversable(p,driving)){nearest=p;best=cost;}
      }
      return nearest;
    }
    // A route segment must stay on the actual surface even where a tapped point
    // falls between lattice nodes. Clip it against each axis-aligned footprint.
    function clearSegment(a,b) {
      const driving=state.mode==='drive',blocks=driving?OFF_ROAD:state.solids;
      const margin=driving?0:.095,dx=b.x-a.x,dy=b.y-a.y;
      return !blocks.some(([left,top,right,bottom])=>{
        left-=margin;top-=margin;right+=margin;bottom+=margin;
        if(Math.max(a.x,b.x)<=left||Math.min(a.x,b.x)>=right||
           Math.max(a.y,b.y)<=top||Math.min(a.y,b.y)>=bottom)return false;
        let enter=0,leave=1;
        if(dx){
          const u=(left-a.x)/dx,v=(right-a.x)/dx;
          enter=Math.max(enter,Math.min(u,v));leave=Math.min(leave,Math.max(u,v));
        }
        if(dy){
          const u=(top-a.y)/dy,v=(bottom-a.y)/dy;
          enter=Math.max(enter,Math.min(u,v));leave=Math.min(leave,Math.max(u,v));
        }
        return enter<leave;
      });
    }
    // A uniform lattice handles route finding. A heap keeps long street trips inexpensive.
    function makeRoute(start,target) {
      if(clearSegment(start,target))return [target];
      const N=58,origin=-.68;
      const fromIndex=i=>({x:origin+i%N*STEP,y:origin+Math.floor(i/N)*STEP});
      const count=N*N,cost=new Float64Array(count).fill(Infinity),parent=new Int32Array(count).fill(-1),pass=new Uint8Array(count),visited=new Uint8Array(count),heap=[];
      const valid=i=>{if(pass[i]===0)pass[i]=traversable(fromIndex(i))?2:1;return pass[i]===2;};
      function anchor(point) {
        const cx=Math.round((point.x-origin)/STEP),cy=Math.round((point.y-origin)/STEP);
        let nearest=-1,range=Infinity;
        for(let y=Math.max(0,cy-1);y<=Math.min(N-1,cy+1);y++){
          for(let x=Math.max(0,cx-1);x<=Math.min(N-1,cx+1);x++){
            const i=y*N+x;
            if(!valid(i))continue;
            const p=fromIndex(i),d=dist(point,p);
            if(d<range&&clearSegment(point,p)){nearest=i;range=d;}
          }
        }
        return nearest;
      }
      const startI=anchor(start),goalI=anchor(target);
      if(startI<0||goalI<0)return [];
      const push=(i,rank)=>{const n={i,rank};let k=heap.length;heap.push(n);while(k>0){const a=(k-1)>>1;if(heap[a].rank<=rank)break;heap[k]=heap[a];k=a;}heap[k]=n;};
      const pop=()=>{const first=heap[0].i,last=heap.pop();if(heap.length){let k=0;while(k*2+1<heap.length){let j=k*2+1;if(j+1<heap.length&&heap[j+1].rank<heap[j].rank)j++;if(heap[j].rank>=last.rank)break;heap[k]=heap[j];k=j;}heap[k]=last;}return first;};
      const offsets=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
      cost[startI]=0;push(startI,0);let reached=-1;
      while(heap.length){
        const i=pop();if(visited[i])continue;visited[i]=1;
        const px=i%N,py=Math.floor(i/N);
        if(i===goalI){reached=i;break;}
        for(const [dx,dy] of offsets){const nx=px+dx,ny=py+dy,j=ny*N+nx;
          if(nx<0||ny<0||nx>=N||ny>=N||visited[j]||!valid(j))continue;
          if(dx&&dy&&(!valid(py*N+nx)||!valid(ny*N+px)))continue;
          const stepCost=dx&&dy?1.414:1,nc=cost[i]+stepCost;
          if(nc>=cost[j])continue;cost[j]=nc;parent[j]=i;
          const q=fromIndex(j);push(j,nc+dist(q,target)/STEP);
        }
      }
      if(reached<0)return [];
      const raw=[];
      for(let n=reached;n>=0;n=parent[n])raw.push(fromIndex(n));
      raw.reverse();raw.push(target);
      const simplified=[];
      let from=start;
      for(let i=1;i<raw.length;i++){
        if(clearSegment(from,raw[i]))continue;
        from=raw[i-1];simplified.push(from);
      }
      simplified.push(target);
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
    function interactionRange() {return state.mode==='drive'?1.9:1.56;}
    function nearest() {
      let q=null,range=interactionRange();
      for(const point of state.points){const d=dist(state.player,point);if(d<range){range=d;q=point;}}
      return q;
    }
    function companionPoint() {
      const c=state.companion;
      if(!c)return null;
      const home=state.points.find(q=>q.residentId===c.id);
      return home?{...home,x:c.x,y:c.y,companion:true}:null;
    }
    function updateNearby() {
      const next=nearest();
      const shiftStop=next&&state.shiftStops.find(s=>window.EarthShifts.matches(s.venue,next));
      const delivery=next?.type==='resident'&&state.site?.delivery?.residentId===next.residentId;
      const key=[next?.type,next?.residentId,next?.plot,shiftStop?.id,Boolean(delivery),state.placed,state.mode,state.companion?.id].join('/');
      if(next===state.active&&key===state.hintKey)return;
      state.active=next;state.hintKey=key;
      if(!state.placed){
        if(shiftStop)options.onHint?.(`${shiftStop.label} · Interact to visit with ${state.site.residents.find(r=>r.id===state.site.shift.residentId).name}.`);
        else if(next?.type==='resident'){
          const resident=state.site.residents.find(r=>r.id===next.residentId);
          options.onHint?.(delivery?`Parcel for ${next.label}. Interact to deliver.`:`${next.label}${resident?.role?' · '+resident.role:''}. Interact to speak.`);
        }else if(next?.type==='market')options.onHint?.('At the exchange. Interact to check the market parcel.');
        else if(next?.type==='building')options.onHint?.(`${next.label} · Lot ${next.plot+1}. Interact to inspect.`);
        else if(state.companion)options.onHint?.(`Travelling with ${companionPoint()?.label||'your neighbour'}. Interact to speak together.`);
        else if(state.site)options.onHint?.(state.mode==='drive'?'Tap a road to drive. Drag to pan or pinch to zoom.':'Tap a neighbour to meet, or tap open ground to walk.');
      }
      emitState();dirty=true;
    }
    function stop() {state.route=[];state.arrival=null;state.destination=null;state.player.moving=false;}
    function clearInput() {
      pressed.clear();fingers.clear();dragging=null;pinch=null;
    }
    function cancelTravel() {
      clearInput();stop();dirty=true;emitState();
    }
    function choose(point) {
      if(!point)return;
      if(point.type==='vehicle'){toggleVehicle(cameraFollows);return;}
      state.active=point;dirty=true;
      const event=publicPoint(point);
      (point.onArrival||options.onInteract)?.(event);
      emitState();
    }
    function kerb(point) {return {x:point.x,y:Math.round(point.y/BLOCK)*BLOCK};}
    function navigate(target,arrival=null,followCamera=true) {
      if(!state.site||state.placed)return false;
      // A tap is a fresh destination, including when it lands on the player or outside the map.
      stop();pressed.clear();dirty=true;
      if(followCamera&&overviewZoom!==null)exitOverview();
      cameraFollows=followCamera;
      if(state.mode==='drive'&&arrival&&arrival.type!=='vehicle')target=kerb(arrival);
      const free=closestFree(target);
      if(!free){
        message(state.mode==='drive'?'Tap a road inside the district to drive there.':'Tap open ground or a doorstep inside the district.');
        emitState();return false;
      }
      if(dist(free,state.player)<.16){
        if(arrival)choose(arrival);else emitState();
        return true;
      }
      const route=makeRoute(state.player,free);
      if(!route.length){
        message(state.mode==='drive'?'Choose a connected street.':'That path is closed. Try another approach.');
        emitState();return false;
      }
      lastFrame=0;
      if(state.mode==='drive'&&!traversable(target,true))message('Nearest road selected. Tap another road to change course.');
      state.route=route;state.destination=free;state.arrival=arrival;emitState();return true;
    }
    function interact() {
      if(state.placed){const l=state.lots.find(q=>q.plot===placingFocus);if(l&&!l.building)options.onPlace?.({plot:l.plot,x:l.x,y:l.y});return Boolean(l&&!l.building);}
      const q=nearest()||companionPoint();
      if(q){stop();pressed.clear();choose(q);return true;}
      if(state.mode==='walk'&&dist(state.van,state.player)<1.6)return toggleVehicle();
      message(state.mode==='drive'?'Park by a doorstep or venue marker, then choose Interact.':'Walk to a marker to meet someone or use a venue.');return false;
    }
    function toggleVehicle(followCamera=cameraFollows) {
      if(!state.site)return false;
      if(state.placed)setPlacement(null);
      stop();pressed.clear();const p=state.player;
      if(state.mode==='drive'){
        state.van={...p};state.mode='walk';
        const q=closestFree(add(p,.46,.48),false);if(q)Object.assign(p,{x:q.x,y:q.y});
        message('On foot');
      }else if(dist(p,state.van)<1.65){
        Object.assign(p,state.van);state.mode='drive';message('Tap a road to drive. Use Interact when parked by a marker.');
      }else{
        message('Walking to the community van');return navigate(state.van,{type:'vehicle',x:state.van.x,y:state.van.y},followCamera);
      }
      cameraFollows=followCamera;dirty=true;updateNearby();emitState();return true;
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
      const oldX=p.x,oldY=p.y;p.x=candidate.x;p.y=candidate.y;p.dx=p.x-oldX;p.dy=p.y-oldY;p.moving=true;cameraFollows=true;return true;
    }
    function holdMove(direction) {
      if(!AXIS[direction]||!state.site)return false;
      if(state.placed){cyclePlot(direction==='left'||direction==='up'?-1:1);return true;}
      if(overviewZoom!==null)exitOverview();
      if(pressed.has(direction))return true;
      if(!moving())lastFrame=0;
      stop();pressed.add(direction);const v=AXIS[direction];manual(v[0],v[1],state.mode==='drive'?.45:.28);dirty=true;updateNearby();emitState();return true;
    }
    function releaseMove(direction){pressed.delete(direction);}
    function move(direction) {
      if(!AXIS[direction]||!state.site)return false;
      if(state.placed){cyclePlot(direction==='left'||direction==='up'?-1:1);return true;}
      if(overviewZoom!==null)exitOverview();
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
      if(cameraFollows&&!dragging&&!pinch){
        const target=followTarget(),rate=reduced?1:1-Math.exp(-dt*7.2);
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
      const current=empty.findIndex(l=>l.plot===placingFocus);placingFocus=empty[(current+direction+empty.length)%empty.length].plot;previewedPlot=null;dirty=true;emitState();options.onPlotPreview?.(placingFocus);
    }
    function setPlacement(kind) {
      if(!state.site||(!kind&&!state.placed))return;
      if(kind){
        const empty=state.lots.filter(l=>!l.building);if(!empty.length){message('Every plot is in use.');return;}
        if(!state.placed)priorPlacementView={zoom,overviewZoom,centreX,centreY,cameraFollows};
        overviewZoom=null;
        stop();clearInput();
        placingFocus=empty[0].plot;cameraFollows=false;centreX=12;centreY=12;
        zoom=fitZoom();
      }else if(priorPlacementView){
        ({zoom,overviewZoom,centreX,centreY,cameraFollows}=priorPlacementView);
        if(overviewZoom!==null)zoom=fitZoom();
        priorPlacementView=null;
      }
      unit=baseUnit()*zoom;state.placed=kind||null;state.hover=null;previewedPlot=null;miniTick=-1;dirty=true;emitState();
      if(kind)options.onPlotPreview?.(placingFocus);
    }
    function setSite(site) {
      const previous=state.site,previousKey=siteKey(previous),nextKey=siteKey(site);
      if(previousKey!==nextKey){
        if(previousKey)visits.set(previousKey,{player:{...state.player},van:{...state.van},mode:state.mode,zoom:priorPlacementView?.overviewZoom??priorPlacementView?.zoom??overviewZoom??zoom});
        stop();clearInput();state.placed=null;previewedPlot=null;state.active=null;state.hover=null;state.companion=null;priorPlacementView=null;overviewZoom=null;shortMessage='';cameraFollows=true;
        if(!nextKey)visits.clear();
        const stored=nextKey&&visits.get(nextKey);
        state.player=stored?.player||{...returnPoint(site),dx:0,dy:1};state.van=stored?.van||vanAtExchange();state.mode=stored?.mode||'walk';
        zoom=stored?.zoom||1;unit=baseUnit()*zoom;
        const target=followTarget();centreX=target.x;centreY=target.y;
      }
      state.site=site||null;state.seed=hash(`${site?.lat??0},${site?.lon??0},${site?.id||'district'}`);
      const nextFingerprint=JSON.stringify([nextKey,site?.water,site?.buildings,site?.residents?.map(r=>[r.id,r.name])]);
      if(previousKey!==nextKey || state.fingerprint!==nextFingerprint){
        const target=state.destination,arrival=state.arrival;
        districtData();streetLights=site&&lightRig?lightRig.lightsFor(state.decor,centre(MARKET)):[];state.fingerprint=nextFingerprint;
        if(state.placed&&state.lots[placingFocus]?.building){
          const vacant=state.lots.find(lot=>!lot.building);
          if(vacant){placingFocus=vacant.plot;previewedPlot=null;options.onPlotPreview?.(placingFocus);}
          else{setPlacement(null);message('Every plot is now in use.');}
        }
        if(site&&!traversable(state.player)){
          const free=closestFree(state.player);if(free){state.player.x=free.x;state.player.y=free.y;}
        }
        if(site&&target){
          const updated=arrival?.type==='vehicle'?arrival:resolveStop(arrival);
          stop();
          if(!arrival)navigate(target,null,cameraFollows);
          else if(updated&&updated.buildingId===arrival.buildingId){
            navigate(updated,arrival.onArrival?{...updated,onArrival:arrival.onArrival}:updated,cameraFollows);
          }
        }
      }
      prepareCompanion();unit=baseUnit()*zoom;dirty=true;updateNearby();emitState();schedule();
    }
    function actorPosition(actor) {
      return {x:actor.x,y:actor.y,dx:actor.dx,dy:actor.dy};
    }
    function snapshotView() {
      if(!state.site)return null;
      const camera=priorPlacementView||{zoom,overviewZoom,centreX,centreY,cameraFollows};
      return {v:1,site:siteKey(state.site),mode:state.mode,player:actorPosition(state.player),
        van:actorPosition(state.mode==='drive'?state.player:state.van),camera:{...camera}};
    }
    function restoreView(snapshot) {
      if(!state.site||snapshot?.v!==1||snapshot.site!==siteKey(state.site))return false;
      const {mode,player,van,camera}=snapshot;
      const between=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
      const validActor=(p,drive)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&
        between(p.dx,-1.001,1.001)&&between(p.dy,-1.001,1.001)&&traversable(p,drive);
      if((mode!=='walk'&&mode!=='drive')||!validActor(player,mode==='drive')||!validActor(van,true))return false;
      if(mode==='drive'&&dist(player,van)>.001)return false;
      if(!camera||typeof camera.cameraFollows!=='boolean'||!between(camera.zoom,.29,2.15)||
         !between(camera.centreX,-3,SIDE+3)||!between(camera.centreY,-3,SIDE+3))return false;
      if(camera.overviewZoom!==null&&(!between(camera.overviewZoom,.29,2.15)||camera.cameraFollows))return false;
      // Resume the player's position, never an unconfirmed activity or an old arrival callback.
      stop();clearInput();priorPlacementView=null;state.placed=null;previewedPlot=null;state.active=null;state.hover=null;
      state.mode=mode;state.player=actorPosition(player);state.van=actorPosition(van);
      state.companion=null;prepareCompanion();
      overviewZoom=camera.overviewZoom;zoom=overviewZoom===null?camera.zoom:fitZoom();unit=baseUnit()*zoom;
      centreX=camera.centreX;centreY=camera.centreY;cameraFollows=camera.cameraFollows;
      lastFrame=0;miniTick=-1;shortMessage='';dirty=true;updateNearby();emitState();return true;
    }
    function resolveStop(ref) {
      if(!ref)return null;
      return state.points.find(p=>p.type===ref.type&&(p.type==='market'||p.type==='resident'&&p.residentId===ref.residentId||p.type==='building'&&p.plot===ref.plot&&(!ref.kind||p.kind===ref.kind)));
    }
    function focusStop(ref,onArrival) {
      const q=resolveStop(ref);
      if(state.placed)return false;
      if(!q){cancelTravel();return false;}
      const arrival=onArrival?{...q,onArrival}:q;
      if(atStop(ref)){stop();pressed.clear();choose(arrival);return true;}
      return navigate(q,arrival);
    }
    function atStop(ref) {const q=resolveStop(ref);return Boolean(q&&dist(state.player,q)<interactionRange());}
    function focusMarket() {return focusStop({type:'market'});}
    function focusResident(id) {return focusStop({type:'resident',residentId:id});}
    function exitOverview() {
      if(overviewZoom===null)return;
      zoom=overviewZoom;overviewZoom=null;unit=baseUnit()*zoom;cameraFollows=true;
    }
    function toggleOverview() {
      if(!state.site||state.placed)return;
      if(overviewZoom!==null){exitOverview();recenter();}
      else {overviewZoom=zoom;zoom=fitZoom();unit=baseUnit()*zoom;centreX=12;centreY=12;cameraFollows=false;}
      miniTick=-1;dirty=true;schedule();
    }
    function recenter() {exitOverview();cameraFollows=true;const target=followTarget();centreX=target.x;centreY=target.y;miniTick=-1;dirty=true;schedule();}
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
    function keepUnderPointer(anchor,point){
      const after=world(point.x,point.y);
      centreX=clamp(centreX+anchor.x-after.x,-3,SIDE+3);
      centreY=clamp(centreY+anchor.y-after.y,-3,SIDE+3);
      cameraFollows=false;
    }
    function zoomBy(factor,point) {
      if(!Number.isFinite(factor)||factor<=0)return;
      overviewZoom=null;
      const prior=point&&world(point.x,point.y);zoom=clamp(zoom*factor,.29,2.15);unit=baseUnit()*zoom;
      if(prior){
        keepUnderPointer(prior,point);
        if(zoomTimer)clearTimeout(zoomTimer);
        zoomTimer=setTimeout(()=>{zoomTimer=0;dirty=true;schedule();},120);
      }
      dirty=true;schedule();
    }
    function figureDistance(actor,sx,sy) {
      const [x,y]=screen(actor.x,actor.y);
      return Math.hypot(sx-x,sy-clamp(sy,y-.81*unit,y-.08*unit));
    }
    function hit(sx,sy) {
      const w=world(sx,sy);
      if(state.placed){
        for(const lot of state.lots){const p=screen(lot.x,lot.y,.66);if(!lot.building&&(Math.hypot(sx-p[0],sy-p[1])<clamp(unit*.41,12,19)||(Math.abs(w.x-lot.x)<=2.17&&Math.abs(w.y-lot.y)<=2.17)))return {type:'plot',...lot};}
        return null;
      }
      if(state.mode==='walk'&&state.companion&&figureDistance(state.companion,sx,sy)<Math.max(7,unit*.23)){
        return companionPoint();
      }
      let selected=null,best=Infinity,building=null,topDepth=-Infinity;
      for(const q of state.points){
        const pinPos=screen(q.x,q.y,.9),foot=screen(q.x,q.y,.10);
        let score=Math.min(Math.hypot(sx-pinPos[0],sy-pinPos[1]),Math.hypot(sx-foot[0],sy-foot[1]));
        if(q.type==='resident'&&q.residentId!==state.companion?.id){
          score=Math.min(score,figureDistance(residentFigure(q),sx,sy));
        }
        if(score<best&&score<clamp(unit*.72,19,30)){best=score;selected=q;}
        const lot=centre(q.block),depth=lot.x+lot.y;
        if(depth<topDepth)continue;
        const base=screen(lot.x,lot.y),dx=sx-base[0],dy=sy-base[1];
        const kind=q.type==='resident'?'home':q.type==='market'?'exchange':q.kind;
        const inside=window.EarthTownArchitecture?.contains(state.site,kind,q.index,dx,dy,unit);
        // Geometric fallback also keeps the procedural, pre-load art interactive.
        if(inside??(Math.abs(dx)<unit*1.4&&Math.abs(dy+unit*.96)<unit*.82)){building=q;topDepth=depth;}
      }
      if(selected)return selected;
      if(state.traffic){const q=state.traffic,p=screen(q.x,q.y,.5);if(Math.hypot(sx-p[0],sy-p[1])<Math.max(11,unit*.64))return {type:'service',x:q.x,y:q.y,label:'Co-op deliveries'};}
      if(state.mode==='walk'){
        const v=screen(state.van.x,state.van.y,.5);
        if(Math.hypot(sx-v[0],sy-v[1])<Math.max(16,unit*.82))return {type:'vehicle',...state.van};
        // Only a tap on the passing figure itself should interrupt ground movement.
        for(let i=0;i<5;i++){
          const actor=streetWalker(i);
          if(figureDistance(actor,sx,sy)<clamp(unit*.18,3,9))return {type:'pedestrian',x:actor.x,y:actor.y,label:'Passing neighbour'};
        }
      }
      return building||{type:'ground',...w};
    }
    function passingHint(point) {
      const recipient=state.site.residents.find(r=>r.id===state.site.delivery?.residentId);
      if(recipient)return `Your parcel is for ${recipient.name}. Open Work to hand it over.`;
      if(state.companion)return 'Open the resident’s day in People to choose your next stop together.';
      const doors=state.points.filter(q=>q.type==='resident');
      if(!doors.length)return 'Tap the market marker to visit the exchange.';
      const closest=doors.reduce((a,b)=>dist(point,a)<dist(point,b)?a:b);
      return `Nearest resident: ${closest.label}. Tap their doorstep marker to meet.`;
    }
    function tap(p,device) {
      if(!state.site)return;
      if(!state.placed&&state.mode==='drive'){
        // Always honour a road tap, including where broad venue hitboxes overlap a kerb.
        const ground=world(p.x,p.y);
        if(traversable(ground,true)){navigate(ground,null,false);return;}
        // Only an actual visible marker can direct an off-road tap to a specific venue.
        // Other taps park on the closest visible lane; scenery beyond the map stops the van.
        let marker=null,range=clamp(unit*.37,8,13);
        for(const q of state.points){
          if(q.type==='building'&&state.active?.buildingId!==q.buildingId&&!state.shiftStops.some(s=>window.EarthShifts.matches(s.venue,q)))continue;
          const pin=screen(q.x,q.y,.86),d=Math.hypot(p.x-pin[0],p.y-pin[1]);
          if(d<range){marker=q;range=d;}
        }
        navigate(marker?kerb(marker):ground,null,false);return;
      }
      const q=hit(p.x,p.y);
      if(state.placed){
        if(!q){message('Choose a marked, vacant plot.');return;}
        placingFocus=q.plot;state.hover=null;dirty=true;
        if((device==='touch'||device==='pen')&&previewedPlot!==q.plot){
          previewedPlot=q.plot;emitState();options.onPlotPreview?.(q.plot);return;
        }
        previewedPlot=null;options.onPlace?.({plot:q.plot,x:q.x,y:q.y});return;
      }
      if(!q)return;
      if(q.type==='pedestrian'){stop();pressed.clear();message(passingHint(q));emitState();return;}
      if(q.type==='service'){const v=state.traffic;message(v.yielding?'The delivery driver is giving way.':`Co-op deliveries · next stop ${nextDelivery(v)}`);return;}
      if(q.type==='vehicle')return toggleVehicle(false);
      if(q.companion||(q.type!=='ground'&&dist(state.player,q)<interactionRange())){stop();pressed.clear();choose(q);return;}
      navigate(q,q.type==='ground'?null:q,false);
    }
    function resize() {
      const bounds=canvas.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
      const w=Math.round(bounds.width),h=Math.round(bounds.height),ratio=Math.min(typeof devicePixelRatio==='number'?devicePixelRatio:1,2,Math.sqrt(2200000/(w*h)));
      if(width===w&&height===h&&ratio===pixelRatio)return;
      width=w;height=h;pixelRatio=ratio;canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));
      if(state.placed||overviewZoom!==null)zoom=fitZoom();
      unit=baseUnit()*zoom;backdropGradient=null;dirty=true;schedule();
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
      miniCanvas=document.createElement('canvas');miniCanvas.width=148;miniCanvas.height=108;miniCanvas.setAttribute('aria-hidden','true');
      Object.assign(miniCanvas.style,{width:'100%',height:'100%',position:'static',display:'block',pointerEvents:'none'});miniButton.appendChild(miniCanvas);
      canvas.parentElement.appendChild(miniButton);listen(miniButton,'click',toggleOverview);cleanups.push(()=>miniButton.remove());
    }
    addMapControls();
    if(window.EarthTownProjects?.watch){
      cleanups.push(window.EarthTownProjects.watch(()=>{dirty=true;schedule();}));
    }
    if(window.EarthTownArchitecture?.watch){
      cleanups.push(window.EarthTownArchitecture.watch(()=>{dirty=true;schedule();}));
    }
    if(window.EarthTownSurroundings?.onReady){
      cleanups.push(window.EarthTownSurroundings.onReady(()=>{clearGround();dirty=true;schedule();}));
    }
    const eveningButton=canvas.parentElement?.querySelector?.('#street-evening');
    if(eveningButton)listen(eveningButton,'click',()=>{
      evening=!evening;
      eveningButton.setAttribute('aria-pressed',String(evening));
      eveningButton.title=evening?'Return to daylight':'Switch to evening light';
      dirty=true;
    });
    const previousStyle=canvas.style.touchAction,oldTab=canvas.getAttribute('tabindex'),oldLabel=canvas.getAttribute('aria-label');
    canvas.style.touchAction='none';if(oldTab===null)canvas.tabIndex=0;
    if(!oldLabel)canvas.setAttribute('aria-label','District streets. Tap to walk, drag to look around, or use the arrow keys. E interacts. V boards the van.');
    function beginPinch() {
      const [a,b]=fingers.values();
      const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      pinch={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom,anchor:world(mid.x,mid.y)};
      dragging=null;overviewZoom=null;
    }
    listen(canvas,'pointerdown',e=>{
      if(!state.site||e.button!==0||fingers.has(e.pointerId))return;
      state.hover=null;
      if(e.cancelable)e.preventDefault();
      if(e.pointerType!=='touch')canvas.focus({preventScroll:true});
      const p=coords(e,canvas);
      fingers.set(e.pointerId,p);
      try{canvas.setPointerCapture(e.pointerId);}catch{}
      if(fingers.size===1){
        dragging={id:e.pointerId,start:p,x:centreX,y:centreY,moved:false,device:e.pointerType,slop:e.pointerType==='touch'?12:5};
      }else if(fingers.size===2)beginPinch();
    });
    listen(canvas,'pointermove',e=>{
      const p=coords(e,canvas);
      if(!fingers.has(e.pointerId)){
        if(e.pointerType!=='touch'){
          const target=hit(p.x,p.y);state.hover=target?.type==='ground'?null:target;dirty=true;
        }
        return;
      }
      fingers.set(e.pointerId,p);
      if(pinch){
        const [a,b]=fingers.values(),distance=Math.hypot(a.x-b.x,a.y-b.y);
        zoom=clamp(pinch.zoom*distance/pinch.distance,.29,2.15);unit=baseUnit()*zoom;
        keepUnderPointer(pinch.anchor,{x:(a.x+b.x)/2,y:(a.y+b.y)/2});dirty=true;return;
      }
      if(dragging?.id!==e.pointerId)return;
      const dx=p.x-dragging.start.x,dy=p.y-dragging.start.y;
      if(!dragging.moved&&Math.hypot(dx,dy)<dragging.slop)return;
      dragging.moved=true;cameraFollows=false;
      centreX=clamp(dragging.x-(dx/unit+dy/(unit*TILT))/2,-3,SIDE+3);
      centreY=clamp(dragging.y-(dy/(unit*TILT)-dx/unit)/2,-3,SIDE+3);dirty=true;
    });
    function endPointer(e) {
      if(!fingers.delete(e.pointerId))return;
      if(pinch){
        if(fingers.size>=2){beginPinch();return;}
        pinch=null;
        if(fingers.size){
          const [id,p]=fingers.entries().next().value;
          // Continue panning with the remaining finger; its release cannot steer the van.
          dragging={id,start:p,x:centreX,y:centreY,moved:true};
        }
        dirty=true;return;
      }
      if(dragging?.id!==e.pointerId)return;
      const gesture=dragging;dragging=null;
      if(e.type!=='pointerup'||gesture.moved)return;
      const release=coords(e,canvas);
      if(Math.hypot(release.x-gesture.start.x,release.y-gesture.start.y)<gesture.slop)tap(gesture.start,gesture.device);
    }
    for(const event of ['pointerup','pointercancel','lostpointercapture'])listen(canvas,event,endPointer);
    listen(canvas,'pointerleave',()=>{state.hover=null;dirty=true;});
    listen(canvas,'wheel',e=>{if(!state.site)return;e.preventDefault();zoomBy(Math.exp(-clamp(e.deltaY,-150,150)*.0033),coords(e,canvas));},{passive:false});
    listen(canvas,'keydown',e=>{
      if(!state.site||e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key.length===1?e.key.toLowerCase():e.key;
      if(KEYS[k]){e.preventDefault();if(!e.repeat)holdMove(KEYS[k]);}
      else if(['e',' ','Enter','v','m','+','=','-','Home','Escape'].includes(k)){e.preventDefault();if(e.repeat)return;
        if(k==='v')toggleVehicle();else if(k==='m')toggleOverview();else if(k==='e'||k===' '||k==='Enter')interact();else if(k==='Home')recenter();else if(k==='Escape'){if(state.placed)setPlacement(null);else cancelTravel();}else zoomBy(k==='-'?1/1.2:1.2);}
    });
    listen(canvas,'keyup',e=>{const dir=KEYS[e.key.length===1?e.key.toLowerCase():e.key];if(dir){pressed.delete(dir);e.preventDefault();}});
    listen(canvas,'blur',()=>pressed.clear());
    if(typeof window!=='undefined')listen(window,'blur',()=>{pressed.clear();fingers.clear();dragging=null;pinch=null;});
    if(typeof document!=='undefined')listen(document,'visibilitychange',()=>{pressed.clear();if(document.hidden){fingers.clear();dragging=null;pinch=null;suspend();}else{lastFrame=0;dirty=true;schedule();}});
    const sizing=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;sizing?.observe(canvas);
    const showing=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>{
      visible=entries.some(e=>e.isIntersecting);
      if(canvas.parentElement?.hidden){cancelTravel();suspend();return;}
      if(visible){lastFrame=0;dirty=true;resize();}
      // Accessible route buttons keep working when the canvas scrolls out of view.
      if(visible||moving())schedule();else suspend();
    }):null;showing?.observe(canvas);
    if(typeof window!=='undefined')listen(window,'resize',resize);
    function destroy(){alive=false;if(zoomTimer)clearTimeout(zoomTimer);pressed.clear();fingers.clear();suspend();sizing?.disconnect();showing?.disconnect();cleanups.forEach(fn=>fn());clearGround();
      canvas.style.touchAction=previousStyle;if(oldTab===null)canvas.removeAttribute('tabindex');else canvas.setAttribute('tabindex',oldTab);
      if(oldLabel===null)canvas.removeAttribute('aria-label');else canvas.setAttribute('aria-label',oldLabel);}
    resize();schedule();
    return {setSite,setPlacement,move,holdMove,releaseMove,toggleOverview,interact,toggleVehicle,cancelTravel,resize,destroy,focusMarket,focusResident,focusStop,atStop,getState,snapshotView,restoreView,recenter,zoomBy};
  }
  window.EarthStreet=Object.freeze({mount,portrait});
})();

