/* Regional chart, fetched only after leaving world scale. Public-domain Natural
 * Earth geography: QGIS's 1:10m-derived countries and coastlines, 1:10m rivers
 * and 1:50m lakes. Cell clipping edges are excluded from visible boundaries. */
(function(root){
  'use strict';
  const script=typeof document==='undefined'?null:document.currentScript;
  const version=script?.dataset?.atlasVersion || (script?.src ? new URL(script.src).searchParams.get('v') : '') || '';
  const RAD=Math.PI/180, step=60/65535, cache=new Map(),pending=new Map(),failed=new Map();
  const wrap=n=>((n+180)%360+360)%360-180;
  const clip=(v,a,b)=>Math.max(a,Math.min(b,v));
  const column=lon=>Math.min(5,Math.floor((wrap(lon)+180)/60));
  const row=lat=>clip(Math.floor((lat+90)/60),0,2);
  function geometry(points,col,r){
    const xyz=new Float32Array(points.length/2*3),bounds=[Infinity,Infinity,-Infinity,-Infinity];
    const lonBase=-180+col*60,latBase=-90+r*60;
    for(let i=0,j=0;i<points.length;i+=2,j+=3){
      const lon=lonBase+points[i]*step,lat=latBase+points[i+1]*step,cp=Math.cos(lat*RAD);
      xyz[j]=Math.cos(lon*RAD)*cp;xyz[j+1]=Math.sin(lat*RAD);xyz[j+2]=Math.sin(lon*RAD)*cp;
      bounds[0]=Math.min(bounds[0],lon);bounds[1]=Math.min(bounds[1],lat);bounds[2]=Math.max(bounds[2],lon);bounds[3]=Math.max(bounds[3],lat);
    }
    return {points,xyz,bounds};
  }
  function parse(buffer,col,r){
    const d=new DataView(buffer),text=new TextDecoder();let at=4;
    if(d.getUint32(0)!==0x43455231)throw Error('Regional chart signature');
    const u16=()=>{const n=d.getUint16(at,true);at+=2;return n;};
    const names=[],features=[],countNames=u16(),countFeatures=u16();
    for(let i=0;i<countNames;i++){const len=u16();names.push(text.decode(new Uint8Array(buffer,at,len)));at+=len;}
    for(let k=0;k<countFeatures;k++){
      const kind=d.getUint8(at++),rank=d.getUint8(at++),name=names[u16()],cnt=u16(),parts=[];
      for(let j=0;j<cnt;j++){
        const n=d.getUint32(at,true);at+=4;
        if(n<2 || n>(d.byteLength-at)/4)throw Error('Incomplete regional geometry');
        const xy=new Uint16Array(n*2);
        for(let i=0;i<xy.length;i++)xy[i]=u16();
        parts.push(geometry(xy,col,r));
      }
      features.push({kind,rank,name,parts,bounds:parts[0].bounds});
    }
    const edge=[],count=80,put=(x,y)=>edge.push(Math.round(x*65535),Math.round(y*65535));
    for(let i=0;i<count;i++)put(i/count,0);
    for(let i=0;i<count;i++)put(1,i/count);
    for(let i=0;i<count;i++)put(1-i/count,1);
    for(let i=0;i<count;i++)put(0,1-i/count);
    put(0,0);
    return {features,frame:geometry(new Uint16Array(edge),col,r),col,r};
  }
  function fetchCell(base,col,r){
    const key=col+'-'+r;
    if(cache.has(key))return Promise.resolve(cache.get(key));
    if(pending.has(key))return pending.get(key);
    if((failed.get(key)||0)>Date.now())return null;
    const url=new URL('regions/'+key+'.bin',base);
    if(version)url.searchParams.set('v',version);
    const signal=typeof AbortSignal==='undefined' ? undefined : AbortSignal.timeout?.(45000);
    const request=fetch(url,{signal}).then(response=>{
      if(!response.ok)throw Error('Regional chart unavailable');
      return response.arrayBuffer();
    }).then(buffer=>{
      const tile=parse(buffer,col,r);cache.set(key,tile);failed.delete(key);return tile;
    }).catch(()=>{failed.set(key,Date.now()+60000);return null;}).finally(()=>pending.delete(key));
    pending.set(key,request);return request;
  }
  function contains(poly,x,y){
    const v=poly.points;let inside=false;
    for(let i=0,j=v.length-2;i<v.length;j=i,i+=2){
      if((v[i+1]>y)!==(v[j+1]>y) && x<(v[j]-v[i])*(y-v[i+1])/(v[j+1]-v[i+1])+v[i])inside=!inside;
    }
    return inside;
  }
  function lookup(lat,lon) {
    lon=wrap(lon);const col=column(lon),r=row(lat),tile=cache.get(col+'-'+r);if(!tile)return null;
    if(lat<=-89.99999)return {water:false,name:'Antarctica'};
    const x=clip((lon+180-col*60)/step,.001,65534.999),y=clip((lat+90-r*60)/step,.001,65534.999);
    let country='';
    for(const f of tile.features){
      if(f.kind>1)continue;const [west,south,east,north]=f.bounds;
      if(lon<west-.001||lon>east+.001||lat<south-.001||lat>north+.001)continue;
      if(contains(f.parts[0],x,y) && !f.parts.slice(1).some(p=>contains(p,x,y))){
        if(f.kind===1)return {water:true,name:f.name||'Inland water'};
        country=f.name;
      }
    }
    return country?{water:false,name:country}:{water:true,name:''};
  }
  function mount(base,invalidate){
    let needed=new Set(),hits=[],waterLabels=[],dead=false,cityCache=null;
    const waiting=new Set();
    function draw(ctx,view,w,h,radius){
      hits=[];waterLabels=[];needed=new Set();
      const cap=Math.asin(clip(Math.hypot(w/2,h/2)/radius,0,1))/RAD+1;
      const lo=Math.max(-90,view.lat-cap),hi=Math.min(90,view.lat+cap);
      const span=hi>=90 || lo<=-90 ? 180:Math.asin(Math.min(1,Math.sin(cap*RAD)/Math.max(.00001,Math.cos(view.lat*RAD))))/RAD+1;
      const tiles=[];
      for(let r=row(lo);r<=row(hi);r++)for(let col=0;col<6;col++){
        if(Math.abs(wrap((-150+col*60)-view.lon))>span+30)continue;
        const key=col+'-'+r;needed.add(key);
        if(cache.has(key)){tiles.push(cache.get(key));continue;}
        if(!waiting.has(key)){
          const request=fetchCell(base,col,r);
          if(request){
            waiting.add(key);
            request.then(tile=>{waiting.delete(key);if(tile&&!dead&&needed.has(key))invalidate();});
          }
        }
      }
      const visibility=clip((view.zoom-4.25)/2.5,0,1);
      if(!tiles.length || visibility<=0)return;
      const cv=Math.cos(view.lat*RAD),sv=Math.sin(view.lat*RAD),cl=Math.cos(view.lon*RAD),sl=Math.sin(view.lon*RAD);
      function xy(v,j){
        const side=cl*v[j]+sl*v[j+2];
        return {x:w/2+radius*(cl*v[j+2]-sl*v[j]),y:h/2-radius*(cv*v[j+1]-sv*side),z:sv*v[j+1]+cv*side};
      }
      function trace(dest,path,outline=false){
        const v=path.xyz,local=path.points;
        let pen=false,buffered=false,lastX=0,lastY=0,outside=0;
        function flush(){if(buffered){dest.lineTo(lastX,lastY);buffered=false;}}
        for(let j=0,i=0;j<v.length;j+=3,i+=2){
          const x=v[j],y=v[j+1],z=v[j+2],side=cl*x+sl*z,front=sv*y+cv*side;
          if(front<0){flush();pen=false;continue;}
          const xx=w/2+radius*(cl*z-sl*x),yy=h/2-radius*(cv*y-sv*side);
          // A chain wholly outside one edge may be replaced by its chord:
          // it contributes the same winding and no visible line to the map.
          const code=(xx< -12?1:xx>w+12?2:0)|(yy< -12?4:yy>h+12?8:0);
          const cut=outline && i>0 && ((local[i]===local[i-2]&&(local[i]===0||local[i]===65535))||(local[i+1]===local[i-1]&&(local[i+1]===0||local[i+1]===65535)));
          if(!pen||cut){flush();dest.moveTo(xx,yy);pen=true;outside=code;continue;}
          if(outside&code){buffered=true;lastX=xx;lastY=yy;outside&=code;continue;}
          flush();dest.lineTo(xx,yy);outside=code;
        }
        flush();
      }
      function intersects([west,south,east,north]){
        return north>=lo && south<=hi && Math.abs(wrap((west+east)*.5-view.lon))<=span+(east-west)*.5;
      }
      ctx.save();ctx.globalAlpha=visibility;
      for(const tile of tiles){
        const ocean=new Path2D(),land=new Path2D(),banks=new Path2D(),border=new Path2D(),lakes=new Path2D(),river=new Path2D(),major=new Path2D(),coast=new Path2D();
        trace(ocean,tile.frame);ocean.closePath();
        for(const f of tile.features){
          if(!intersects(f.bounds))continue;
          for(const part of f.parts){
            if(f.kind===0){
              trace(land,part);land.closePath();trace(border,part,true);
            }else if(f.kind===1){
              trace(lakes,part);lakes.closePath();trace(banks,part,true);
            }else if(f.kind===2){
              if(view.zoom<7 && f.rank>6)continue;
              trace(f.rank<5?major:river,part);
              if(f.name && (f.rank<=5 || view.zoom>=15)){
                const mid=Math.floor(part.xyz.length/6)*3,point=xy(part.xyz,mid);
                if(point.z>0 && point.x>30 && point.x<w-30 && point.y>20 && point.y<h-22)waterLabels.push({name:f.name,...point,rank:f.rank});
              }
            }else trace(coast,part,true);
          }
        }
        ocean.addPath(land);ctx.fillStyle='rgba(14,47,64,.78)';ctx.fill(ocean,'evenodd');
        ctx.fillStyle='rgba(113,156,134,.38)';ctx.fill(land,'evenodd');
        ctx.strokeStyle='rgba(92,84,60,.87)';ctx.lineWidth=.95;ctx.setLineDash([3,2.4]);ctx.stroke(border);ctx.setLineDash([]);
        ctx.strokeStyle='#a3c3ae';ctx.lineWidth=view.zoom>=10?1.3:1;ctx.stroke(coast);
        ctx.fillStyle='#376e84';ctx.fill(lakes,'evenodd');ctx.strokeStyle='#83bdd0';ctx.lineWidth=.8;ctx.stroke(banks);
        ctx.strokeStyle='rgba(119,198,219,.94)';ctx.lineWidth=view.zoom>=10?1.15:.85;ctx.stroke(river);
        ctx.strokeStyle='#8dd5e2';ctx.lineWidth=view.zoom>=10?1.8:1.3;ctx.stroke(major);
      }
      ctx.restore();
    }
    function labels(ctx,project,view,w,h,radius,occupied){
      hits=[];
      if(view.zoom<4.5 || !root.EarthNavigation?.nearbyCities)return;
      const cap=Math.asin(clip(Math.hypot(w/2,h/2)/radius,0,1))/RAD+1;
      const drift=cityCache?Math.hypot((view.lat-cityCache.lat),(wrap(view.lon-cityCache.lon)*Math.cos(view.lat*RAD))):Infinity;
      if(!cityCache || drift>cap*.12 || Math.abs(cap-cityCache.cap)>Math.max(.1,cap*.12)){
        cityCache={lat:view.lat,lon:view.lon,cap,cities:root.EarthNavigation.nearbyCities(view.lat,view.lon,cap*1.23,80)};
      }
      const limit=Math.min(35,Math.max(5,Math.floor(w*h/(view.zoom>=13?7800:11700))));
      const free=(x,y,ww,hh)=> x>=5 && y>=4 && x+ww<=w-3 && y+hh<=h-4 && !occupied.some(o=>Math.abs(x+ww/2-o.x)<(ww+o.w)/2+4 && Math.abs(y+hh/2-o.y)<(hh+o.h)/2+3);
      ctx.save();
      for(const city of cityCache.cities){
        if(hits.length>=limit)break;
        const p=project(city.lat,city.lon);if(p.z<=.05||p.x<4||p.x>w-4||p.y<5||p.y>h-5)continue;
        const major=city.importance>=10;
        ctx.font=(major?'600 ':'500 ')+(major?12:11)+'px system-ui';ctx.textBaseline='middle';ctx.textAlign='left';
        const width=ctx.measureText(city.name).width+2;
        const positions=[[p.x+7,p.y-6],[p.x-width-7,p.y-6],[p.x-width/2,p.y+7],[p.x-width/2,p.y-21]];
        const at=positions.find(([x,y])=>free(x,y,width,13));if(!at)continue;
        const [x,y]=at;
        ctx.beginPath();ctx.arc(p.x,p.y,major?2.8:2,0,2*Math.PI);ctx.fillStyle='#eadba6';ctx.fill();ctx.lineWidth=1;ctx.strokeStyle='#243f42';ctx.stroke();
        ctx.lineJoin='round';ctx.lineWidth=3;ctx.strokeStyle='rgba(14,36,42,.93)';ctx.strokeText(city.name,x,y+6.5);ctx.fillStyle='#f3efdb';ctx.fillText(city.name,x,y+6.5);
        occupied.push({x:x+width/2,y:y+6.5,w:width,h:13});
        hits.push({x:x-2,y:y-2,w:width+4,h:17,dx:p.x,dy:p.y,city});
      }
      if(view.zoom>=8){
        const seen=new Set();let count=0;
        for(const river of waterLabels.sort((a,b)=>a.rank-b.rank)){
          if(count>=Math.max(2,limit/4)||seen.has(river.name))continue;
          const text=river.name;ctx.font='italic 11px Georgia,serif';const wid=ctx.measureText(text).width;
          if(!free(river.x+5,river.y-7,wid,13))continue;
          const x=river.x+5,y=river.y;
          ctx.lineWidth=2;ctx.strokeStyle='#163c4d';ctx.strokeText(text,x,y);ctx.fillStyle='#b3e4eb';ctx.fillText(text,x,y);
          occupied.push({x:x+wid/2,y,w:wid,h:13});seen.add(text);count++;
        }
      }
      ctx.restore();
    }
    function hit(p,padding=0){
      let city=null,best=padding;
      for(const a of hits){
        const dx=Math.max(a.x-p.x,0,p.x-a.x-a.w),dy=Math.max(a.y-p.y,0,p.y-a.y-a.h);
        const gap=Math.min(Math.hypot(dx,dy),Math.hypot(p.x-a.dx,p.y-a.dy)-6);
        if(gap<=0)return a.city;
        if(gap<best){best=gap;city=a.city;}
      }
      return city;
    }
    return {draw,labels,hit,destroy(){dead=true;needed.clear();hits=[];}};
  }
  root.EarthRegions=Object.freeze({mount,lookup,version});
})(typeof window==='undefined'?globalThis:window);
