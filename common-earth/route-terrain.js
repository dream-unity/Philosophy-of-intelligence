/* Common Earth · terrain along a schematic great-circle arc.
 * Public-domain Natural Earth land and lakes, aggregated from the atlas index.
 * These samples describe geography; they do not establish roads, navigability,
 * freight schedules, border access or the actual course of a ship. */
(function(root){
  'use strict';
  const WIDTH=1440,HEIGHT=WIDTH/2,RAD=Math.PI/180,RADIUS=6371.009;
  const lengths='BwMDBAUFBQUFBgYGBgYGBgcHBwcHBwcHBwcICAgICAgICAgICAgICAgICAgICAkJCAgJCQgJCAkJCQoJCQkJCQkJCgkJCQkJCQkKCgoJCgoLCQoKCQoJCQoJCQkKCgoKCgoKCQoKCgoKCgoKCwoKCgoKCgsKCgoKCgsLCwsLCwsKCgoKCgkKCgkKCgoJCgoKCgoKCgoJCgoKCgkJCgsJCgkKCgkKCgoJCQkKCQoKCgoJCQkKCgoJCQoKCQoKCgkKCgoKCgkJCgkKCwoKCQoJCgoKCgoKCwkKCgoKCgsKCgkJCgoLCwsLCwsLCwoLCwoMCgsLCwsKCgwLCwoKCgoLCg==';
  const runs='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';
  // Native-resolution footprints of small islands isolated from coarse-chart land.
  const smallIslands='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';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const wrap=v=>((v+180)%360+360)%360-180;
  const valid=p=>p&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&Number.isFinite(p.lon);
  const results=new Map();
  let rows,edges,islands;

  // Shorelines are stored as alternating row runs in a canonical Huffman stream.
  // Decode once, on the first survey. Pure water/land interiors need no pixels.
  function bytes(text){
    const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const out=new Uint8Array(Math.floor(text.replace(/=+$/,'').length*3/4));
    let carry=0,bits=0,at=0;
    for(const char of text){const v=alphabet.indexOf(char);if(v<0)break;carry=carry*64+v;bits+=6;
      if(bits>=8){bits-=8;out[at++]=carry>>bits;carry&=(1<<bits)-1;}
    }
    return out;
  }
  function unpack(){
    if(rows)return;
    const sizes=bytes(lengths),packed=bytes(runs),tree=[],tokens=[];
    sizes.forEach((size,symbol)=>{if(size)tokens.push([size,symbol]);});
    tokens.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    let code=0,previous=0,cursor=0;
    for(const [size,symbol] of tokens){
      code<<=size-previous;let node=tree;
      for(let n=size-1;n>0;n--){const side=(code>>n)&1;node=node[side]||(node[side]=[]);}
      node[code&1]=symbol;previous=size;code++;
    }
    function word(){
      let value=0,scale=1;
      for(;;){
        let node=tree;
        while(typeof node!=='number'){node=node[(packed[cursor>>3]>>(7-(cursor&7)))&1];cursor++;}
        value+=(node&127)*scale;if(node<128)return value;scale*=128;
      }
    }
    const bounds=[],start=new Uint32Array(HEIGHT+1);
    for(let y=0;y<HEIGHT;y++){
      start[y]=bounds.length;const count=word()*2;let x=0;
      for(let i=0;i<count;i++){x+=word();bounds.push(x);}
    }
    start[HEIGHT]=bounds.length;edges=Uint16Array.from(bounds);rows=start;
    islands=new Set();let flat=0,scale=1;
    for(const v of bytes(smallIslands)){
      flat+=(v&127)*scale;
      if(v&128)scale*=128;else{islands.add(flat);scale=1;}
    }
  }
  function land(x,y){
    if(y<0)return false;
    if(y>=HEIGHT)return true;
    if(x<0)x+=WIDTH;else if(x>=WIDTH)x-=WIDTH;
    let low=rows[y],high=rows[y+1],begin=low;
    while(low<high){const mid=(low+high)>>1;if(edges[mid]<=x)low=mid+1;else high=mid;}
    return ((low-begin)&1)===1;
  }
  function sample(p){
    const x=Math.floor((wrap(p.lon)+180)*WIDTH/360),y=clamp(Math.floor((90-p.lat)*HEIGHT/180),0,HEIGHT-1);
    const here=land(x,y);
    if(!here){
      const sx=Math.floor((wrap(p.lon)+180)*4096/360),sy=clamp(Math.floor((90-p.lat)*2048/180),0,2047);
      if(islands.has(sy*4096+sx))return {water:false,uncertain:true};
    }
    return {water:!here,uncertain:land(x-1,y)!==here||land(x+1,y)!==here||land(x,y-1)!==here||land(x,y+1)!==here};
  }

  // at(t) returns latitude/longitude. Distance is the central angle in radians.
  // Antipodes have many equally short arcs; retain the expedition's established
  // perpendicular convention so saved voyage positions and the chart agree.
  function arc(origin,target){
    if(!valid(origin)||!valid(target))return null;
    function unit(p){const phi=p.lat*RAD,lon=wrap(p.lon)*RAD,c=Math.cos(phi);return [c*Math.cos(lon),c*Math.sin(lon),Math.sin(phi)];}
    const u=unit(origin),v=unit(target),dot=clamp(u[0]*v[0]+u[1]*v[1]+u[2]*v[2],-1,1);
    const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const distance=Math.atan2(Math.hypot(...cross),dot);
    let tangent=v.map((x,i)=>x-dot*u[i]),length=Math.hypot(...tangent);
    const ambiguous=length<1e-12&&dot<0;
    if(ambiguous){tangent=Math.abs(u[2])<.8?[-u[1],u[0],0]:[0,-u[2],u[1]];length=Math.hypot(...tangent);}
    if(length>0)tangent=tangent.map(x=>x/length);
    return {distance,ambiguous,at(t){
      if(t<=0||distance<1e-12)return {lat:origin.lat,lon:wrap(origin.lon)};
      if(t>=1)return {lat:target.lat,lon:wrap(target.lon)};
      const a=distance*t,c=Math.cos(a),s=Math.sin(a);
      const x=c*u[0]+s*tangent[0],y=c*u[1]+s*tangent[1],z=c*u[2]+s*tangent[2];
      return {lat:Math.atan2(z,Math.hypot(x,y))/RAD,lon:Math.atan2(y,x)/RAD};
    }};
  }

  /** describe(a,b) accepts geographic degrees and returns null for invalid input.
   * distanceKm and longestWaterKm are approximate kilometres. waterShare is the
   * fraction [0,1] of the arc over water, including lakes. waterName is a sampled
   * marine name, or ''. segments partition [0,1] into {t0,t1,water,uncertain}.
   * uncertain marks short/coastal or antipodal interpretations. Category is one of
   * primarily-land, mixed-crossing, open-water or coastal-or-local. */
  function describe(origin,target){
    if(!valid(origin)||!valid(target))return null;
    const nameWater=root.EarthNavigation?.waterName;
    const key=[origin.lat,wrap(origin.lon),target.lat,wrap(target.lon)].join(',');
    const prior=results.get(key);if(prior&&prior.nameWater===nameWater)return prior.report;
    unpack();
    const route=arc(origin,target),km=route.distance*RADIUS,n=Math.max(8,Math.ceil(km/5));
    let water=0,coastal=0,current=0,longest=0,end=0;
    const segments=[];
    for(let i=0;i<n;i++){
      const s=sample(route.at((i+.5)/n)),previous=segments[segments.length-1];
      if(s.water){water++;current++;if(current>longest){longest=current;end=i+1;}}else current=0;
      if(s.uncertain)coastal++;
      if(previous&&previous.water===s.water&&previous.uncertain===s.uncertain)previous.t1=(i+1)/n;
      else segments.push({t0:i/n,t1:(i+1)/n,water:s.water,uncertain:s.uncertain});
    }
    const waterShare=water/n,longestWaterKm=longest*km/n;
    const local=km<45 || (km<185&&coastal/n>.13) || (km<320&&coastal/n>.67);
    const category=local?'coastal-or-local':waterShare>=.78?'open-water':waterShare<=.12&&longestWaterKm<130?'primarily-land':'mixed-crossing';
    let waterName='';
    if(longest&&nameWater){
      const scores=new Map();let best=0;
      for(let j=0;j<7;j++){
        const p=route.at((end-longest+longest*(j+.5)/7)/n),name=nameWater(p.lat,p.lon);
        if(name){const votes=(scores.get(name)||0)+1;scores.set(name,votes);if(votes>best){best=votes;waterName=name;}}
      }
    }
    for(const s of segments){if(local)s.uncertain=true;Object.freeze(s);}
    const report=Object.freeze({distanceKm:Math.round(km),waterShare,longestWaterKm:Math.round(longestWaterKm),waterName,
      category,uncertain:local||route.ambiguous,schematic:true,segments:Object.freeze(segments)});
    if(results.size>=32)results.delete(results.keys().next().value);
    results.set(key,{nameWater,report});return report;
  }
  root.EarthRouteTerrain=Object.freeze({describe,arc});
})(typeof window==='undefined'?globalThis:window);
