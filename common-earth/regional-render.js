/* One north-up projection connects the street's isometric metres to the atlas. */
(function(root){
  'use strict';
  const KM=.013, TILT=.51;
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
  function groundTile(geo,span,ix,iy,detail){
    const key=signature(geo)+'/'+span+'/'+ix+'/'+iy+'/'+detail;
    if(tiles.has(key)){const tile=tiles.get(key);tiles.delete(key);tiles.set(key,tile);return tile;}
    const canvas=document.createElement('canvas'),N=detail?64:48,S=Math.min(33,Math.max(9,Math.ceil(span/.12)+1));
    canvas.width=canvas.height=N;
    const g=canvas.getContext('2d'),data=g.createImageData(N,N);
    const samples=[];
    for(let j=0;j<S;j++)for(let i=0;i<S;i++){
      const x=(ix+i/(S-1))*span,y=(iy+1-j/(S-1))*span;
      const soil=root.EarthRegionalWorld.terrain(geo,x,y);
      const c=colour[soil.kind]||colour.meadow;
      // Relief and humidity alter the same surface through all zoom levels.
      const shade=limit((soil.height||0)*7,-5,8)+3*Math.sin(x*5.9+y*2.3)+2*Math.cos(y*9.2-x);
      samples.push([c[0]+shade,c[1]+shade,c[2]+shade,soil.height||0]);
    }
    for(let row=0;row<N;row++)for(let col=0;col<N;col++){
      const gx=(col+.5)*(S-1)/N,gy=(row+.5)*(S-1)/N,i=gx|0,j=gy|0,fx=gx-i,fy=gy-j;
      const a=samples[j*S+i],b=samples[j*S+i+1],c=samples[(j+1)*S+i],d=samples[(j+1)*S+i+1];
      const grain=(seed(ix*N+col,iy*N-row,12)-.5)*(detail?5:3);
      const k=(row*N+col)*4;
      const wa=(1-fx)*(1-fy),wb=fx*(1-fy),wc=(1-fx)*fy,wd=fx*fy;
      const height=a[3]*wa+b[3]*wb+c[3]*wc+d[3]*wd;
      if(height<.09){
        // The map traces the terrain height threshold also used for landings;
        // interpolating RGB alone makes shorelines look like square ponds.
        const wet=limit((height+.65)/.58,0,1);
        const sand=limit((height+.07)/.11,0,1);
        const deep=[49,99,114],shoal=[86,143,147],shore=[184,177,139];
        for(let ch=0;ch<3;ch++)data.data[k+ch]=(deep[ch]+(shoal[ch]-deep[ch])*wet)*(1-sand)+shore[ch]*sand+grain;
      }else for(let ch=0;ch<3;ch++)data.data[k+ch]=a[ch]*wa+b[ch]*wb+c[ch]*wc+d[ch]*wd+grain;
      data.data[k+3]=255;
    }
    g.putImageData(data,0,0);tiles.set(key,canvas);
    if(tiles.size>160){const first=tiles.keys().next().value;tiles.get(first).width=1;tiles.delete(first);}
    return canvas;
  }
  const inView=(v,x,y,gap=0)=>x>=v.minX-gap&&x<=v.maxX+gap&&y>=v.minY-gap&&y<=v.maxY+gap;
  const fields=new Map();
  function fieldTile(geo,span,ix,iy,base,atlas){
    const key=signature(geo)+'/'+span+'/'+ix+'/'+iy+'/'+Boolean(atlas);
    let tile=fields.get(key);if(tile){fields.delete(key);fields.set(key,tile);return tile;}
    tile=document.createElement('canvas');tile.width=208;tile.height=106;
    const g=tile.getContext('2d'),v=viewport((ix+.5)*span,(iy+.5)*span,tile.width,tile.height,tile.width/span,tile.height/span);
    g.drawImage(base,0,0,tile.width,tile.height);
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
  function soil(g,geo,v,detail=true,atlas=null){
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
    for(let ix=Math.floor(x0/span);ix<=Math.floor(x1/span);ix++)for(let iy=Math.floor(y0/span);iy<=Math.floor(y1/span);iy++){
      const a=v.screen(ix*span,(iy+1)*span),z=v.screen((ix+1)*span,iy*span);
      const base=groundTile(geo,span,ix,iy,detail);
      const tile=detail&&span<=1?fieldTile(geo,span,ix,iy,base,atlas):base;
      // The backdrop is drawn below device density. Snap opposite edges out
      // to its actual pixels so subpixel filtering never reveals a dark seam.
      const transform=g.getTransform?.(),rx=transform?.a||1,ry=transform?.d||1;
      const left=Math.floor(a.x*rx)/rx,top=Math.floor(a.y*ry)/ry;
      g.drawImage(tile,left,top,Math.ceil(z.x*rx)/rx-left+.5/rx,Math.ceil(z.y*ry)/ry-top+.5/ry);
    }
    g.restore();
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
    const step=geo.cellSize||.5,b=geo.bounds;
    const x0=Math.round(Math.max(v.minX,b.minX)/step),x1=Math.round(Math.min(v.maxX,b.maxX)/step);
    const y0=Math.round(Math.max(v.minY,b.minY)/step),y1=Math.round(Math.min(v.maxY,b.maxY)/step);
    // Fill only surveyed ground so that unsurveyed ground remains visible.
    // At continental zoom, query visible known cells directly when available.
    const cells=(x1-x0+1)*(y1-y0+1),stride=Math.max(1,Math.ceil(Math.sqrt(cells/2400)));
    g.fillStyle='rgba(248,205,95,.22)';g.beginPath();
    for(let j=y0;j<=y1;j+=stride)for(let i=x0;i<=x1;i+=stride){
      if(!root.EarthRegionalWorld.known(world,base,communityId,i*step,j*step))continue;
      const p=v.screen((i-.5)*step,(j+stride-.5)*step);g.rect(p.x,p.y,v.sx*step*stride,v.sy*step*stride);
    }
    g.fill();
  }
  function actors(g,world,base,v,mini,drawPerson){
    let count=0;
    const people=root.EarthRegionalWorld.travellers?.(world,base)||[];
    for(const t of people){
      if(!inView(v,t.x,t.y,.03))continue;
      count++;if(drawPerson?.(t))continue;
      const p=v.screen(t.x,t.y),r=mini?1.9:limit(v.sx*.0035,2.5,8);
      g.beginPath();g.arc(p.x,p.y,r,0,7);g.fillStyle='#f9cc72';g.fill();g.strokeStyle='#5d4831';g.lineWidth=1;g.stroke();
      if(!mini&&v.sx>90){g.fillStyle='#343d35';g.fillRect(p.x-r*.5,p.y+r*.7,r,r);}
    }
    return count;
  }
  function townPlan(g,town,v,mini){
    const s=town.site,p=v.screen(town.x,town.y),scale=v.sx*KM,small=mini||scale<.20;
    const proj=(x,y)=>{const pt=regionalPoint(town,x,y);return v.screen(pt.x,pt.y);};
    if(small){
      const r=limit(2.1+Math.sqrt((s.growth?.households?.length||s.population||1))*.26,2,5);
      g.strokeStyle='#3d5850';g.lineWidth=1;g.fillStyle='#e6c891';g.beginPath();g.moveTo(p.x,p.y-r);g.lineTo(p.x+r,p.y);g.lineTo(p.x,p.y+r);g.lineTo(p.x-r,p.y);g.closePath();g.fill();g.stroke();
    }else{
      const corners=[[0,0],[24,0],[24,24],[0,24]].map(([x,y])=>proj(x,y));
      g.fillStyle=s.water?'#a79570':'#a6ae89';g.beginPath();corners.forEach((pt,i)=>i?g.lineTo(pt.x,pt.y):g.moveTo(pt.x,pt.y));g.closePath();g.fill();
      g.lineWidth=Math.max(.7,scale*.62);g.strokeStyle='#7f8278';g.beginPath();
      for(let i=0;i<=24;i+=6){
        for(const [a,b] of [[[i,0],[i,24]],[[0,i],[24,i]]]){const z=proj(...a),d=proj(...b);g.moveTo(z.x,z.y);g.lineTo(d.x,d.y);}
      }g.stroke();
      const homes=[];
      for(const h of s.growth?.households||[]){
        const home=root.EarthDistrictGrowth?.homePoint?.(s,h.plot)||{x:1.7+h.plot%10*2.2,y:-1.9-Math.floor(h.plot/10)*1.75};
        homes.push([home.x,home.y]);
        const shop=h.shop&&root.EarthDistrictGrowth?.shopPoint?.(s,h.businessPlot);
        if(shop)homes.push([shop.x,shop.y]);
      }
      const sites=[[9,21],[21,15],[21,21],[15,21],...(s.buildings||[]).map(b=>[3+6*(b.plot%3),3+6*Math.floor(b.plot/3)]),...homes];
      g.fillStyle='#b78360';for(const [x,y] of sites){const z=proj(x,y);g.fillRect(z.x-scale,z.y-scale*.72,scale*2,scale*1.3);}
    }
    if(!mini){
      g.font='600 12px system-ui';g.textAlign='center';g.textBaseline='middle';const w=g.measureText(s.name).width+13;
      const y=p.y+Math.max(8,scale*15*v.sy/v.sx)+9;g.fillStyle='#20392fe8';g.fillRect(p.x-w/2,y-9,w,18);g.fillStyle='#f5e6cb';g.fillText(s.name,p.x,y);
    }
  }
  root.EarthRegionalRender={KM,TILT,regionalPoint,localPoint,viewport,fit,soil,inView,routeLayer,useLayer,explored,actors,townPlan};
})(typeof window==='undefined'?globalThis:window);
