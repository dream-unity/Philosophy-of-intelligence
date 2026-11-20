/* One north-up projection connects the street's isometric metres to the atlas. */
(function(root){
  'use strict';
  const KM=root.EarthRegionalWorld?.streetKilometres||.013, TILT=.51;
  const limit=(v,a,b)=>Math.max(a,Math.min(b,v));
  function regionalPoint(town,x,y){
    return {x:town.x+(x-y)*KM,y:town.y-(x+y-24)*KM};
  }
  function localPoint(town,x,y){
    const east=(x-town.x)/KM,north=(y-town.y)/KM;
    return {x:12+(east-north)/2,y:12-(east+north)/2};
  }
  function viewport(x,y,w,h,sx,sy,anchor=.5){
    const top=h*anchor;
    const screen=(p,q)=>({x:w*.5+(p-x)*sx,y:top-(q-y)*sy});
    const ground=(p,q)=>({x:x+(p-w*.5)/sx,y:y-(q-top)/sy});
    const nw=ground(0,0),se=ground(w,h);
    return {x,y,w,h,sx,sy,screen,ground,minX:nw.x,maxX:se.x,minY:se.y,maxY:nw.y};
  }
  function fit(geo,w,h){
    const b=geo.bounds,s=Math.min(w/(b.maxX-b.minX),h/(b.maxY-b.minY));
    return viewport((b.minX+b.maxX)/2,(b.minY+b.maxY)/2,w,h,s,s);
  }
  const colour={
    water:[53,112,127],shore:[187,178,137],meadow:[142,161,116],
    woodland:[99,137,99],rock:[144,143,132]
  };
  function seed(x,y,s){
    let n=(Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(s,144269))|0;
    n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;
  }
  const tiles=new Map(),regions=new WeakMap();
  function signature(geo){
    let key=regions.get(geo);
    if(!key){key=[geo.origin.lat,geo.origin.lon,geo.seed,geo.tidal,geo.atlasReady,...geo.surveys.map(t=>t.quay)].join(',')+'|'+geo.towns.map(t=>[t.site.id,t.x.toFixed(4),t.y.toFixed(4),+!!t.site.water,+!!t.site.coastal,+!!t.site.lakeShore].join(',')).join('|');regions.set(geo,key);}
    return key;
  }
  const tileKey=(geo,span,ix,iy,detail)=>signature(geo)+'/'+span+'/'+ix+'/'+iy+'/'+detail;
  function groundTile(geo,span,ix,iy,detail){
    const key=tileKey(geo,span,ix,iy,detail);
    if(tiles.has(key)){const tile=tiles.get(key);tiles.delete(key);tiles.set(key,tile);return tile;}
    const preview=detail==='preview';
    const canvas=document.createElement('canvas'),N=preview?20:detail?64:48,S=preview?9:Math.min(33,Math.max(9,Math.ceil(span/.12)+1));
    canvas.width=canvas.height=N;
    const g=canvas.getContext('2d'),data=g.createImageData(N,N);
    const samples=[],surface={};
    for(let j=0;j<S;j++)for(let i=0;i<S;i++){
      const x=(ix+i/(S-1))*span,y=(iy+1-j/(S-1))*span;
      const soil=root.EarthRegionalWorld.terrain(geo,x,y,surface);
      const c=colour[soil.kind]||colour.meadow;
      // Relief and humidity alter the same surface through all zoom levels.
      const shade=limit((soil.height||0)*7,-5,8)+3*Math.sin(x*5.9+y*2.3)+2*Math.cos(y*9.2-x);
      samples.push([c[0]+shade,c[1]+shade,c[2]+shade,soil.height||0]);
    }
    // Every row uses the same horizontal sample positions. Compute them once
    // per tile, keeping the original bilinear shoreline and deterministic grain.
    const cells=new Uint8Array(N),fractions=new Float64Array(N);
    for(let i=0;i<N;i++){
      const position=(i+.5)*(S-1)/N;
      cells[i]=Math.floor(position);fractions[i]=position-cells[i];
    }
    const pixels=data.data,noise=detail?5:3;
    for(let row=0;row<N;row++){
      const top=cells[row]*S,fy=fractions[row],bottom=top+S;
      for(let col=0;col<N;col++){
        const cell=cells[col],fx=fractions[col],k=(row*N+col)*4;
        const a=samples[top+cell],b=samples[top+cell+1],c=samples[bottom+cell],d=samples[bottom+cell+1];
        const wa=(1-fx)*(1-fy),wb=fx*(1-fy),wc=(1-fx)*fy,wd=fx*fy;
        const height=a[3]*wa+b[3]*wb+c[3]*wc+d[3]*wd;
        const grain=(seed(ix*N+col,iy*N-row,12)-.5)*noise;
        if(height<.09){
          // Interpolate deep water, shoals and sand across the landing threshold.
          const wet=limit((height+.65)/.58,0,1),sand=limit((height+.07)/.11,0,1),water=1-sand;
          pixels[k]=(49+37*wet)*water+184*sand+grain;
          pixels[k+1]=(99+44*wet)*water+177*sand+grain;
          pixels[k+2]=(114+33*wet)*water+139*sand+grain;
        }else{
          for(let ch=0;ch<3;ch++)pixels[k+ch]=a[ch]*wa+b[ch]*wb+c[ch]*wc+d[ch]*wd+grain;
        }
        pixels[k+3]=255;
      }
    }
    g.putImageData(data,0,0);tiles.set(key,canvas);
    if(tiles.size>160){const first=tiles.keys().next().value;tiles.get(first).width=1;tiles.delete(first);}
    return canvas;
  }
  const inView=(v,x,y,gap=0)=>x>=v.minX-gap&&x<=v.maxX+gap&&y>=v.minY-gap&&y<=v.maxY+gap;
  const fields=new Map();
  function fieldTile(geo,span,ix,iy,atlas){
    const key=tileKey(geo,span,ix,iy,Boolean(atlas));
    let tile=fields.get(key);if(tile){fields.delete(key);fields.set(key,tile);return tile;}
    tile=document.createElement('canvas');tile.width=208;tile.height=106;
    const g=tile.getContext('2d'),v=viewport((ix+.5)*span,(iy+.5)*span,tile.width,tile.height,tile.width/span,tile.height/span);
    g.drawImage(groundTile(geo,span,ix,iy,true),0,0,tile.width,tile.height);
    if(atlas){
      // Use the street's original grass, earth and stone for a survey about
      // to resolve into individual trees. Water keeps its own material.
      const n=4;
      for(let j=0;j<n;j++)for(let i=0;i<n;i++){
        const x=(ix+(i+.5)/n)*span,y=(iy+1-(j+.5)/n)*span;
        const ground=root.EarthRegionalWorld.terrain(geo,x,y),c=ground.kind;
        if(c==='water')continue;
        const k=c==='rock'?0:c==='shore'?3:4;
        g.globalAlpha=c==='woodland'?.16:c==='rock'?.22:.15;
        g.drawImage(atlas,(k%4)*256,256+Math.floor(k/4)*256,256,256,i*tile.width/n,j*tile.height/n,tile.width/n+.5,tile.height/n+.5);
      }
      g.globalAlpha=1;
    }
    surfaceFeatures(g,geo,v,atlas);
    fields.set(key,tile);
    if(fields.size>100){const oldest=fields.keys().next().value;fields.get(oldest).width=1;fields.delete(oldest);}
    return tile;
  }
  function soil(g,geo,v,detail=true,atlas=null,prepare=null){
    const b=geo.bounds;
    g.fillStyle='#263f42';g.fillRect(0,0,v.w,v.h);
    // Fixed dyadic tiles have stable world edges. Limit tile count even on
    // extremely wide displays and retain recently crossed tiles in the LRU.
    const target=detail?175:95;
    const span=Math.max(.03125,2**Math.ceil(Math.log2(Math.max(target/v.sx,target/v.sy))));
    const x0=Math.max(v.minX,b.minX),x1=Math.min(v.maxX,b.maxX),y0=Math.max(v.minY,b.minY),y1=Math.min(v.maxY,b.maxY);
    if(x1<=x0||y1<=y0)return;
    const topLeft=v.screen(x0,y1);
    g.save();g.beginPath();g.rect(topLeft.x,topLeft.y,(x1-x0)*v.sx,(y1-y0)*v.sy);g.clip();
    const transform=g.getTransform?.(),rx=transform?.a||1,ry=transform?.d||1;
    for(let ix=Math.floor(x0/span);ix<Math.ceil(x1/span);ix++)for(let iy=Math.floor(y0/span);iy<Math.ceil(y1/span);iy++){
      const a=v.screen(ix*span,(iy+1)*span),z=v.screen((ix+1)*span,iy*span);
      // Sample the same terrain at a lower resolution while the precise
      // texture and field detail are being prepared between frames.
      const field=detail&&span<=1;
      const stored=field?fields:tiles,key=tileKey(geo,span,ix,iy,field?Boolean(atlas):detail);
      const complete=()=>field?fieldTile(geo,span,ix,iy,atlas):groundTile(geo,span,ix,iy,detail);
      let tile;
      if(prepare&&!stored.has(key)){
        tile=groundTile(geo,span,ix,iy,'preview');prepare(complete);
      }else tile=complete();
      // The backdrop is drawn below device density. Snap opposite edges out
      // to its actual pixels so subpixel filtering never reveals a dark seam.
      const left=Math.floor(a.x*rx)/rx,top=Math.floor(a.y*ry)/ry;
      g.drawImage(tile,left,top,Math.ceil(z.x*rx)/rx-left+.5/rx,Math.ceil(z.y*ry)/ry-top+.5/ry);
    }
    g.restore();
  }
  // A superseded or invisible viewport never finishes work for an old view.
  // wake() is called again after the camera becomes visible.
  function tileRefinement(active,done){
    const idle=typeof root.requestIdleCallback==='function';
    if(!idle&&typeof setTimeout!=='function')return null;
    const jobs=[];let timer=null;
    function wake(){
      if(timer!==null||!jobs.length||!active())return;
      timer=idle?root.requestIdleCallback(run,{timeout:120}):setTimeout(run,16);
    }
    function run(deadline){
      timer=null;
      if(!jobs.length||!active())return;
      const clock=root.performance||Date,start=clock.now();
      // Even a saturated browser that only calls back after the timeout
      // can finish a tile. Yield before beginning a second expensive one.
      jobs.pop()();
      if(jobs.length&&clock.now()-start<4&&(!deadline||deadline.timeRemaining()>3))jobs.pop()();
      if(jobs.length)wake();else done();
    }
    function cancel(){
      jobs.length=0;
      if(timer!==null){if(idle)root.cancelIdleCallback?.(timer);else clearTimeout(timer);timer=null;}
    }
    return {add:job=>jobs.push(job),wake,cancel};
  }
  function surfaceFeatures(g,geo,v,atlas){
    // Flora, exposed stone and ripples occupy repeatable locations. Sparse
    // acreage at intermediate scales keeps large views within a fixed budget.
    const stride=.057,margin=.055;
    const x0=Math.floor((v.minX-margin)/stride),x1=Math.ceil((v.maxX+margin)/stride),
      y0=Math.floor((v.minY-margin)/stride),y1=Math.ceil((v.maxY+margin)/stride);
    for(let j=y1;j>=y0;j--)for(let i=x0;i<=x1;i++){
      const h=seed(i,j,74);
      if(v.sx<350&&h<.58||v.sx<800&&h<.27)continue;
      const x=(i+seed(i,j,2))*stride,y=(j+seed(i,j,3))*stride;
      if(geo.towns.some(t=>Math.abs(x-t.x)+Math.abs(y-t.y)<.42))continue;
      const t=root.EarthRegionalWorld.terrain(geo,x,y).kind,p=v.screen(x,y);
      const k=v.sx*.012;
      if(t==='water'){
        if(h>.42)continue;
        g.strokeStyle='#a1c4bd70';g.lineWidth=.7;g.beginPath();g.moveTo(p.x-k*.5,p.y);g.quadraticCurveTo(p.x,p.y+k*.12,p.x+k*.8,p.y);g.stroke();
      }else if(t==='woodland'||t==='meadow'&&h>.75){
        const r=Math.max(1,k*(.38+h*.37)),height=r*(1.4+h*.7);
        g.fillStyle='#3854414d';g.beginPath();g.ellipse(p.x+r*.50,p.y,r*1.22,r*.28,0,0,7);g.fill();
        if(atlas){
          const lat=Math.abs(geo.origin.lat),species=lat<30?(h>.65?0:1):lat>53&&h>.3?3:2;
          const size=v.sx*(.014+.016*h),foot=[.379,.522,.479,.504][species];
          g.drawImage(atlas,species*256,0,256,256,p.x-size*foot,p.y-size*.9766,size,size);continue;
        }
        g.fillStyle='#775f46';g.fillRect(p.x-r*.09,p.y-height,r*.18,height);
        g.fillStyle=h>.58?'#59784e':'#628456';g.beginPath();g.ellipse(p.x,p.y-height,r*.67,r*.89,0,0,7);g.fill();
        g.fillStyle='#8b9e67';g.beginPath();g.ellipse(p.x-r*.16,p.y-height-r*.35,r*.37,r*.42,-.6,0,7);g.fill();
      }else if(t==='rock'&&h>.28){
        g.fillStyle='#898a7a';g.beginPath();g.moveTo(p.x-k*.54,p.y);g.lineTo(p.x-k*.15,p.y-k*.32);g.lineTo(p.x+k*.4,p.y-k*.13);g.lineTo(p.x+k*.5,p.y);g.fill();
      }
    }
  }
  function routeLayer(g,world,base,v,mini){
    for(const route of root.EarthRegionalWorld.routes?.(world,base)||[]){
      if(!route.points?.length)continue;
      const visible=route.points.some(p=>inView(v,p.x,p.y,.6));
      if(!visible&&route.points.length>2&&v.sx>55)continue;
      g.beginPath();for(const [i,pt] of route.points.entries()){const p=v.screen(pt.x,pt.y);if(i)g.lineTo(p.x,p.y);else g.moveTo(p.x,p.y);}
      g.strokeStyle=route.closed?'#a77560':route.mode==='water'?'#b2d0c4':'#b8aa88';g.lineWidth=mini?1:limit(v.sx*.012,1.25,11);
      g.setLineDash(route.closed?[3,3]:[]);g.stroke();g.setLineDash([]);
    }
  }
  function useLayer(g,world,base,v,mini){
    for(const w of root.EarthRegionalWorld.works?.(world,base)||[]){
      if(!inView(v,w.x,w.y,.25))continue;
      const p=v.screen(w.x,w.y),r=mini?1.5:limit(v.sx*.047,2,100);
      if(w.kind==='garden'){
        g.fillStyle='#917950';g.fillRect(p.x-r,p.y-r*.5,2*r,r);
        g.strokeStyle='#aabd75';g.lineWidth=Math.max(.65,r*.07);g.beginPath();
        for(let i=-3;i<4;i++){g.moveTo(p.x+r*i*.25,p.y-r*.42);g.lineTo(p.x+r*i*.25+r*.08,p.y+r*.42);}g.stroke();
      }else if(w.kind==='forestry'){
        g.fillStyle='#737f55';g.fillRect(p.x-r,p.y-r*.42,r*2,r*.84);
        for(let n=0;n<4;n++){
          const x=p.x-r*.66+n*r*.32,y=p.y+r*.08;
          g.strokeStyle='#826348';g.lineWidth=Math.max(.7,r*.14);g.beginPath();g.moveTo(x,y);g.lineTo(x+r*.26,y-r*.38);g.stroke();
          g.fillStyle='#ceb47d';g.beginPath();g.arc(x,y,Math.max(.45,r*.072),0,7);g.fill();
        }
      }else if(w.kind==='quarry'){
        g.fillStyle='#a19a88';g.beginPath();g.moveTo(p.x-r,p.y);g.lineTo(p.x-r*.55,p.y-r*.38);g.lineTo(p.x+r*.7,p.y-r*.27);g.lineTo(p.x+r,p.y+r*.3);g.lineTo(p.x,p.y+r*.47);g.fill();
        g.strokeStyle='#706f65';g.lineWidth=Math.max(1,r*.06);g.beginPath();g.moveTo(p.x-r*.65,p.y+.08*r);g.lineTo(p.x+r*.43,p.y-r*.14);g.lineTo(p.x+r*.69,p.y+r*.04);g.stroke();
      }else if(w.kind==='landing'){
        g.fillStyle='#aa8c68';g.fillRect(p.x-r,p.y-r*.14,2*r,r*.28);
        g.fillStyle='#79684c';for(let n=-1;n<=1;n++){g.fillRect(p.x+n*.88*r,p.y-r*.21,Math.max(1,r*.085),r*.5);}
      }else{
        g.strokeStyle='#c7b998';g.lineWidth=Math.max(1,r*.16);g.beginPath();g.moveTo(p.x-r,p.y+r*.29);g.lineTo(p.x-r*.18,p.y+r*.05);g.lineTo(p.x+r,p.y-r*.19);g.stroke();
      }
    }
  }
  function explored(g,geo,world,base,v,communityId){
    if(!communityId)return;
    const step=geo.cellSize,half=step/2;
    // Draw each actual recorded survey and the town's original footprint.
    // A single distant discovery remains visible at any regional extent.
    const cells=root.EarthRegionalWorld.surveyedCells(world,base,communityId);
    g.fillStyle='rgba(248,205,95,.22)';g.beginPath();
    for(const at of cells){
      if(!inView(v,at.x,at.y,half))continue;
      const p=v.screen(at.x-half,at.y+half);g.rect(p.x,p.y,v.sx*step,v.sy*step);
    }
    g.fill();
  }
  function fieldActor(g,a,v,size,selected=false,night=false,time=0,mini=false){
    const art=root.EarthBaseArt;if(!art)return;
    const p=v.screen(a.x,a.y),pose={dx:a.dx-a.dy,dy:-a.dx-a.dy,walking:a.moving,driving:!!a.driver,
      passengers:a.passengers,phase:time*8+(Number(a.fieldId)||0),selected,night,mini};
    if(a.fire){
      const target=v.screen(a.fire.target.x,a.fire.target.y);
      target.y-=size*.65;
      const side=target.x<p.x?-1:1;pose.dx=side;pose.dy=0;pose.firing=true;
      if(!mini&&a.fire.bullet!=null){
        const start={x:p.x+side*size*.38,y:p.y-size*.49};
        const t=a.fire.bullet,tail=Math.max(0,t-.12);
        g.save();g.beginPath();g.moveTo(start.x+(target.x-start.x)*tail,start.y+(target.y-start.y)*tail);
        g.lineTo(start.x+(target.x-start.x)*t,start.y+(target.y-start.y)*t);
        g.strokeStyle='#ffda83';g.lineWidth=Math.max(2,size*.045);g.lineCap='round';g.stroke();g.restore();
      }
    }
    if(a.unitKind==='truck')art.truck?.(g,p.x,p.y,size,pose);
    else if(a.unitKind==='tank'||a.unitKind==='jet')art.marker(g,p.x,p.y,size,a.unitKind);
    else art.soldier?.(g,p.x,p.y,size,{id:a.fieldId,type:a.unitKind},pose);
  }
  function actors(g,world,base,v,mini,drawPerson,people=root.EarthRegionalWorld.travellers?.(world,base)||[]){
    let count=0;
    for(const t of people){
      if(t.kind==='military'&&root.EarthBaseField||!inView(v,t.x,t.y,.03))continue;
      count++;
      if(t.kind==='military'&&root.EarthBaseArt){
        const p=v.screen(t.x,t.y),size=mini?4:limit(v.sx*.022,6,25);
        if(t.phase==='engaged'){
          g.beginPath();g.arc(p.x,p.y,size*.8,0,Math.PI*2);g.strokeStyle='#ec815b';g.lineWidth=2;g.stroke();
        }
        root.EarthBaseArt.marker(g,p.x,p.y,size,t.unitKind);continue;
      }
      if(drawPerson?.(t))continue;
      const p=v.screen(t.x,t.y),r=mini?1.9:limit(v.sx*.0035,2.5,8);
      if(t.phase==='fighting'){
        // Two opponents stand closer together than one pixel on the minimap.
        // Fan their symbols around that position, facing each other.
        const side=t.fightSide,shift=mini?2.7:3.8;
        const x=p.x+side*shift,y=p.y+t.fightRow*shift*.72;
        g.beginPath();g.moveTo(x-side*r,y);g.lineTo(x+side*r,y-r);g.lineTo(x+side*r,y+r);g.closePath();
        g.fillStyle=side<0?'#ee8b65':'#abd6db';g.fill();g.strokeStyle='#392f30';g.lineWidth=.8;g.stroke();
        continue;
      }
      const moving=t.phase!=='working'&&Math.hypot(t.dx||0,t.dy||0)>.001;
      if(moving&&(mini||v.sx<95)){
        const angle=Math.atan2(-t.dy*v.sy,t.dx*v.sx);
        g.beginPath();g.moveTo(p.x+Math.cos(angle)*r*1.8,p.y+Math.sin(angle)*r*1.8);
        for(const turn of [2.35,-2.35])g.lineTo(p.x+Math.cos(angle+turn)*r*1.2,p.y+Math.sin(angle+turn)*r*1.2);
        g.closePath();
      }else{g.beginPath();g.arc(p.x,p.y,r,0,7);}
      g.fillStyle=t.kind==='border'?'#e25e4b':t.mode==='boat'?'#bbdfd3':'#f9cc72';g.fill();g.strokeStyle='#51452f';g.lineWidth=1;g.stroke();
      if(!mini&&v.sx>90){g.fillStyle='#343d35';g.fillRect(p.x-r*.5,p.y+r*.7,r,r);}
    }
    return count;
  }
  function townPlan(g,town,v,mini){
    const s=town.site,p=v.screen(town.x,town.y),scale=v.sx*KM,small=mini||scale<.20;
    const proj=(x,y)=>{const pt=regionalPoint(town,x,y);return v.screen(pt.x,pt.y);};
    if(small){
      const homes=s.growth?.households?.filter(h=>root.EarthHousing?.frontage?.(s,h)!=='lot').length||0;
      const courtyards=s.city?.precincts.filter(p=>p.use==='homes').length||0;
      const r=limit(2.1+Math.sqrt((homes||s.population||1)+courtyards*6)*.26,2,6);
      g.strokeStyle='#3d5850';g.lineWidth=1;g.fillStyle='#e6c891';g.beginPath();g.moveTo(p.x,p.y-r);g.lineTo(p.x+r,p.y);g.lineTo(p.x,p.y+r);g.lineTo(p.x-r,p.y);g.closePath();g.fill();g.stroke();
      if(s.cooperative?.project||s.civicLand?.project||s.construction?.length||s.growth?.households.some(h=>h.build)){
        g.strokeStyle='#594938';g.lineWidth=2.6;g.beginPath();g.moveTo(p.x+r-1,p.y-r+.5);g.lineTo(p.x+r+1.5,p.y-r-2);g.lineTo(p.x+r+4,p.y-r+.5);g.stroke();
        g.strokeStyle='#fbe6ac';g.lineWidth=1.3;g.stroke();
      }
    }else{
      const corners=[[0,0],[24,0],[24,24],[0,24]].map(([x,y])=>proj(x,y));
      g.fillStyle=s.water?'#a79570':'#a6ae89';g.beginPath();corners.forEach((pt,i)=>i?g.lineTo(pt.x,pt.y):g.moveTo(pt.x,pt.y));g.closePath();g.fill();
      g.lineWidth=Math.max(.7,scale*.62);g.strokeStyle='#7f8278';g.beginPath();
      for(let i=0;i<=24;i+=6){
        for(const [a,b] of [[[i,0],[i,24]],[[0,i],[24,i]]]){const z=proj(...a),d=proj(...b);g.moveTo(z.x,z.y);g.lineTo(d.x,d.y);}
      }g.stroke();
      if(root.EarthMilitaryBase){
        const at=root.EarthMilitaryBase.place,pt=proj(at.x,at.y);
        g.fillStyle='#526763';g.fillRect(pt.x-scale*1.5,pt.y-scale,scale*3,scale*2);
      }
      const homes=[];
      for(const h of s.growth?.households||[]){
        const home=root.EarthDistrictGrowth?.homePoint?.(s,h.plot)||{x:1.7+h.plot%10*2.2,y:-1.9-Math.floor(h.plot/10)*1.75};
        if(root.EarthHousing?.frontage?.(s,h)!=='lot')homes.push([home.x,home.y]);
        const shop=h.shop&&root.EarthDistrictGrowth?.shopPoint?.(s,h.businessPlot);
        if(shop)homes.push([shop.x,shop.y]);
      }
      for(const house of s.civicLand?.homes||[]){const pt=root.EarthCouncilHomes.plot(house.plot);homes.push([pt.x,pt.y]);}
      for(const [precinct,p] of (s.city?.precincts||[]).entries()){
        if(p.use!=='homes')continue;
        const court=root.EarthConstruction?.buildingPoint?.({scope:'city',precinct});
        if(court)homes.push([court.x,court.y]);
      }
      for(const house of s.privateHomes||[]){
        if(house.stage!==3)continue;
        const place=root.EarthConstruction?.privateHomeSite(house.plot);
        if(place)homes.push([place.objectX,place.objectY]);
      }
      const sites=[[9,21],[21,15],[21,21],[15,21],...(s.buildings||[]).map(b=>[3+6*(b.plot%3),3+6*Math.floor(b.plot/3)]),...homes];
      g.fillStyle='#b78360';for(const [x,y] of sites){const z=proj(x,y);g.fillRect(z.x-scale,z.y-scale*.72,scale*2,scale*1.3);}
    }
    if(!mini){
      g.font='600 12px system-ui';g.textAlign='center';g.textBaseline='middle';const w=g.measureText(s.name).width+13;
      const y=p.y+Math.max(8,scale*15*v.sy/v.sx)+9;g.fillStyle='#20392fe8';g.fillRect(p.x-w/2,y-9,w,18);g.fillStyle='#f5e6cb';g.fillText(s.name,p.x,y);
    }
  }
  root.EarthRegionalRender={KM,TILT,regionalPoint,localPoint,viewport,fit,soil,tileRefinement,inView,fieldActor,routeLayer,useLayer,explored,actors,townPlan};
})(typeof window==='undefined'?globalThis:window);
