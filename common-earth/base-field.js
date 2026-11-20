/* Field locations are kilometre coordinates in the owning base's regional projection.
   A journey persists its polyline and clock anchor so looking away never moves a unit. */
(function(root){
  'use strict';
  const km=.013,truckId='truck',pickup=.105,arrival=.24;
  const personnel=u=>u&&!['tank','jet'].includes(u.type);
  const now=w=>root.EarthDayClock?.now(w)??Date.now();
  const geography=(w,s)=>root.EarthRegionalWorld.geography(w,s);
  const lookup=(w,id)=>root.EarthCommunityLife.lookup(w,id);
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const copy=p=>({x:p.x,y:p.y});
  const project=(a,b,p)=>a.origin.id===b.origin.id?copy(p):b.project(a.locate(p.x,p.y));
  const local=(t,p)=>({x:12+(p.x-t.x-p.y+t.y)/(2*km),y:12-(p.x-t.x+p.y-t.y)/(2*km)});
  const regional=(t,x,y)=>({x:t.x+(x-y)*km,y:t.y-(x+y-24)*km});
  const validPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<50000&&Math.abs(p.y)<50000;
  function gate(w,s,t=s){
    const g=geography(w,s),destination=geography(w,t);
    return project(destination,g,regional(destination.project(t),25,12));
  }
  function yard(w,s,id){
    const pin=geography(w,s).project(s);
    if(id===truckId)return regional(pin,24.6,14.4);
    const slot=id-1,col=slot%6,row=Math.floor(slot/6);
    return regional(pin,25.45+col*.63,13.25+(row%12)*.68+Math.floor(row/12)*.17);
  }
  function travelled(r,time){
    return (r.spent||0)+Math.max(0,Math.min(time,r.until??time)-r.at);
  }
  function position(w,s,id,time=now(w)){
    const b=s.militaryBase,u=id===truckId?null:b?.units.find(v=>v.id===id);
    if(u?.aboard)return position(w,s,truckId,time);
    const mission=u&&b.missions.find(m=>!m.manual&&m.ids.includes(id));
    if(mission){
      const p=root.EarthMilitaryBase.missionPoint(w,s,mission),i=mission.ids.indexOf(id);
      return {...p,x:p.x+.009*(i%4),y:p.y-.009*Math.floor(i/4)};
    }
    const p=(id===truckId?b?.truck:u?.field)||yard(w,s,id);
    const r=p.route;if(!r)return {...copy(p),dx:p.dx??1,dy:p.dy??0,moving:false};
    const elapsed=travelled(r,time);
    let left=elapsed>=r.ms?Infinity:elapsed/r.ms*r.length,from=p;
    for(const to of r.points){
      const d=dist(from,to);
      if(d>0 && left<d){const f=left/d;return {x:from.x+(to.x-from.x)*f,y:from.y+(to.y-from.y)*f,dx:(to.x-from.x)/d,dy:(to.y-from.y)/d,moving:r.until==null||time<r.until};}
      left-=d;from=to;
    }
    const before=r.points.at(-2)||p,d=dist(before,from)||1;
    return {...copy(from),dx:(from.x-before.x)/d,dy:(from.y-before.y)/d,moving:false};
  }
  function validLocation(p){
    if(!validPoint(p)||p.dx!=null&&!Number.isFinite(p.dx)||p.dy!=null&&!Number.isFinite(p.dy))return false;
    const r=p.route;
    return !r || Number.isSafeInteger(r.at)&&r.at>=0&&Number.isFinite(r.ms)&&r.ms>0&&Number.isFinite(r.length)&&r.length>0&&
      (r.until==null||Number.isSafeInteger(r.until)&&r.until>=r.at&&Number.isFinite(r.spent)&&r.spent>=0&&r.spent<=r.ms)&&
      Array.isArray(r.points)&&r.points.length>0&&r.points.length<=4097&&r.points.every(validPoint);
  }
  function valid(b){
    if(b.lastDrop!=null&&(!Array.isArray(b.lastDrop)||!b.lastDrop.every(id=>b.units.some(u=>u.id===id))))return false;
    if(b.truck&&!validLocation(b.truck))return false;
    if(b.units.some(u=>u.field&&!validLocation(u.field)||u.aboard!=null&&typeof u.aboard!=='boolean'||
      u.boarding!=null&&(u.boarding!==true||u.aboard||!u.field?.route)))return false;
    if(b.departure!=null&&(!validPoint(b.departure.point)||!Number.isSafeInteger(b.departure.at)||b.departure.at<0||
      !Array.isArray(b.departure.ids)||!b.departure.ids.length||!b.departure.ids.every(id=>b.units.some(u=>u.id===id&&(u.aboard||u.boarding)))||
      !b.units.some(u=>u.id===b.departure.driver&&personnel(u))||!b.departure.ids.includes(b.departure.driver)))return false;
    return b.driver==null||b.units.some(u=>u.id===b.driver&&u.aboard&&personnel(u));
  }
  const manualMission=(b,id)=>b.missions.find(m=>m.manual&&m.ids.includes(id));
  const available=(b,id)=>!b.missions.some(m=>!m.manual&&m.ids.includes(id));
  function nearTown(g,p){
    return g.towns.find(t=>{const q=local(t,p);return q.x>=-1&&q.x<=30&&q.y>=-1&&q.y<=26;});
  }
  // Use the same six-tile streets as the local van. Off-road taps in town
  // approach the nearest street at the selected block.
  function townLeg(t,a,b,points){
    const start=local(t,a),end=local(t,b);
    const lane=n=>Math.max(0,Math.min(24,Math.round(n/6)*6));
    const snap=p=>Math.abs(p.x-lane(p.x))<Math.abs(p.y-lane(p.y))?{x:lane(p.x),y:p.y}:{x:p.x,y:lane(p.y)};
    const from=snap(start),to=snap(end);
    const put=p=>points.push(regional(t,p.x,p.y));
    put(from);
    const horizontal=from.y===lane(from.y);
    if(horizontal && to.x===lane(to.x))put({x:to.x,y:from.y});
    else if(!horizontal && to.y===lane(to.y))put({x:from.x,y:to.y});
    else if(horizontal){const x=lane((from.x+to.x)/2);put({x,y:from.y});put({x,y:to.y});}
    else{const y=lane((from.y+to.y)/2);put({x:from.x,y});put({x:to.x,y});}
    put(to);
  }
  function route(w,s,a,z,driving){
    const g=geography(w,s),start=nearTown(g,a),end=nearTown(g,z),points=[];
    if(start&&start===end){townLeg(start,a,z,points);if(!driving||local(end,z).x>24)points.push(z);}
    else{
      if(start)townLeg(start,a,regional(start,24,12),points);
      if(start&&end){
        const path=root.EarthRegionalWorld.crossingPath(w,start.site,end.site);
        if(path?.length>2)for(const p of root.EarthRegionalWorld.tripLine(w,s,{from:start.site.id,to:end.site.id,path}).slice(1,-1))points.push(copy(p));
      }
      if(end){const gate=regional(end,24,12);points.push(gate);townLeg(end,gate,z,points);if(!driving||local(end,z).x>24)points.push(z);}
      else points.push(z);
    }
    return points.filter((p,i)=>dist(p,i?points[i-1]:a)>.00001);
  }
  function steerTruck(g,start,end){
    const t=nearTown(g,start)||nearTown(g,end);if(!t)return end;
    const a=local(t,start),b=local(t,end),dx=b.x-a.x,dy=b.y-a.y;
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.24));
    const free=(x,y)=>x<0||y<0||x>24||y>24||Math.min(Math.abs(x-Math.round(x/6)*6),Math.abs(y-Math.round(y/6)*6))<=.87;
    let x=a.x,y=a.y;
    for(let i=0;i<steps;i++){
      const nx=x+dx/steps,ny=y+dy/steps;
      if(free(nx,ny)){x=nx;y=ny;}
      else if(free(nx,y)&&Math.abs(dx)>.001)x=nx;
      else if(free(x,ny)&&Math.abs(dy)>.001)y=ny;
      else break;
    }
    return regional(t,x,y);
  }
  function moved(w,s,id){return dist(position(w,s,id),gate(w,s))>arrival;}
  function townAt(w,s,p){
    let best=null,distance=.64;
    for(const t of root.EarthMilitaryBase.towns(w)){const d=dist(p,gate(w,s,t));if(d<distance){best=t;distance=d;}}
    return best;
  }
  function status(w,s,u){
    const b=s.militaryBase,p=position(w,s,u.id);
    if(u.aboard)return b.driver===u.id?'At the wheel of the military truck':personnel(u)?'Aboard the military truck':'Escorting the military truck';
    if(u.boarding)return 'Walking to the military truck';
    if(p.moving)return 'On the move';
    if(!u.field)return 'At the east gate';
    const nearest=townAt(w,s,p);
    return nearest?'In '+nearest.name:'In the region';
  }
  function actors(w,geo){
    const rows=[],time=now(w);
    for(const s of root.EarthMilitaryBase.towns(w)){
      const b=s.militaryBase,g=geography(w,s);
      const firing=new Map();
      for(const m of b?.missions||[]){
        if(m.fireAt==null)continue;
        const t=lookup(w,m.target);if(!t)continue;
        const tg=geography(w,t),target=project(tg,geo,regional(tg.project(t),27,12));
        for(const id of m.ids)firing.set(id,{target,bullet:root.EarthMilitaryBase.shot(w,m,id,time).bullet});
      }
      const add=(id,u)=>{
        const p=position(w,s,id,time),at=project(g,geo,p);
        const truck=id===truckId,kind=truck?'truck':u.type;
        rows.push({...at,dx:p.dx,dy:p.dy,moving:p.moving,kind:'field',unitKind:kind,fieldId:id,siteId:s.id,
          fire:firing.get(id),selectable:!truck&&personnel(u)&&canBoard(w,b,u),
          name:truck?'Military truck':root.EarthMilitaryBase.units[kind].name+' '+u.id,
          passengers:truck?b?.units.filter(v=>v.aboard&&personnel(v)&&v.id!==b.driver).length||0:0,driver:truck?b?.driver:null});
      };
      add(truckId);
      if(b)for(const u of b.units)if(!u.aboard)add(u.id,u);
    }
    return rows;
  }
  function canBoard(w,b,u){
    return !!u&&!u.aboard&&!u.boarding&&available(b,u.id)&&
      !['engaged','stationed'].includes(manualMission(b,u.id)?.phase);
  }
  function boardUnit(u){
    u.aboard=true;delete u.field;delete u.boarding;
  }
  function startTruck(w,s,b,from,point,target,time){
    const points=dist(from,point)<.00001?[]:route(w,s,from,point,true);
    const length=points.reduce((sum,p,i)=>sum+dist(i?points[i-1]:from,p),0);
    b.truck={...copy(from),dx:from.dx,dy:from.dy,target};
    if(length>.00001)b.truck.route={at:time,points,length,ms:Math.max(250,Math.min(24000,length*4200))};
  }
  function depart(w,s,b){
    const trip=b.departure;
    if(!trip||!trip.ids.every(id=>b.units.some(u=>u.id===id&&u.aboard)))return false;
    const from=position(w,s,truckId);
    b.driver=trip.driver;
    startTruck(w,s,b,from,trip.point,trip.target,trip.at);
    delete b.departure;return true;
  }
  function settleBoarding(w,s,departing=false){
    const b=s.militaryBase;
    if(!b?.units.some(u=>u.boarding))return 0;
    const at=position(w,s,truckId);
    let boarded=0;
    for(const u of b.units){
      if(!u.boarding)continue;
      const p=position(w,s,u.id);
      if(!p.moving&&!at.moving&&dist(p,at)<=pickup){
        boardUnit(u);boarded++;
      }else if(departing){
        u.field=copy(p);delete u.boarding;
      }
    }
    if(!departing)depart(w,s,b);
    return boarded;
  }
  function callToTruck(w,s,b,ids,at){
    if(at.moving)return {ok:false,message:'Stop the truck before calling units to board.'};
    if(!Array.isArray(ids)||!ids.length)return {ok:false,message:'Choose at least one unit to board.'};
    const wanted=new Set(ids),party=b.units.filter(u=>wanted.has(u.id));
    if(party.length!==ids.length||party.some(u=>!canBoard(w,b,u)))return {ok:false,message:'The roster changed. Choose available units to board.'};
    const time=now(w);
    for(const u of party)walkToTruck(w,s,u,at,time);
    const walking=party.filter(u=>u.boarding).length;
    const summary=[];
    if(party.length>walking)summary.push((party.length-walking)+' aboard');
    if(walking)summary.push(walking+' walking to the truck');
    return {ok:true,message:summary.join(' · ')+'.'};
  }
  function walkToTruck(w,s,u,at,time){
    const p=position(w,s,u.id,time),distance=dist(p,at);
    if(distance<=.025){boardUnit(u);return;}
    const points=distance<=pickup?[copy(at)]:route(w,s,p,at,false);
    const length=points.reduce((sum,to,i)=>sum+dist(i?points[i-1]:p,to),0);
    u.field={...copy(p),route:{at:time,points,length,ms:Math.max(100,Math.min(14000,length*22000))}};
    u.boarding=true;
  }
  function releaseAssignments(w,s,b,ids){
    // Keep the on-map positions of soldiers who were travelling on town orders.
    for(const m of [...b.missions]){
      if(!m.ids.some(id=>ids.has(id)))continue;
      if(!m.manual)for(const id of m.ids.filter(id=>ids.has(id))){
        const u=b.units.find(v=>v.id===id);u.field=copy(position(w,s,id));
      }
      m.ids=m.ids.filter(id=>!ids.has(id));
      if(m.delivered)m.delivered=m.delivered.filter(id=>!ids.has(id));
      if(!m.ids.length)b.missions.splice(b.missions.indexOf(m),1);
    }
  }
  function sendTruck(w,s,b,point,target,recall=false){
    const time=now(w),at=position(w,s,truckId,time),soldiers=b.units.filter(personnel);
    const candidates=recall?soldiers:soldiers.filter(u=>u.aboard||u.boarding||canBoard(w,b,u));
    const driver=candidates.find(u=>u.id===b.driver)||candidates.find(u=>u.aboard)||candidates.find(u=>u.boarding)||
      candidates.reduce((best,u)=>!best||dist(position(w,s,u.id),at)<dist(position(w,s,best.id),at)?u:best,null);
    if(!driver)return {ok:false,message:'Enlist a guard at the military base to drive the truck.'};
    const party=recall?soldiers:b.units.filter(u=>u.id===driver.id||u.boarding||u.aboard);
    if(recall)releaseAssignments(w,s,b,new Set(party.map(u=>u.id)));
    // A new recall stops even a stranded or moving truck at its actual position.
    b.truck={...copy(at),dx:at.dx,dy:at.dy};
    let last=time;
    for(const u of party){
      if(u.aboard)continue;
      walkToTruck(w,s,u,at,time);
      if(u.boarding)last=Math.max(last,Math.ceil(time+u.field.route.ms));
    }
    b.departure={ids:party.map(u=>u.id),driver:driver.id,at:last,point:copy(point),target};
    const name=lookup(w,target)?.name||'the selected point';
    const going=depart(w,s,b);
    return {ok:true,message:going?'Driving to '+name+'.':'Picking up soldiers, then driving to '+name+'.'};
  }
  const actions=new Set(['moveField','stopField','driveTown','returnBase','board','boardParty','reboard','finishBoarding','drive','unload']);
  function command(w,s,b,q){
    const fail=message=>({ok:false,message}),ok=message=>({ok:true,message});
    const id=q.id,u=b.units.find(v=>v.id===id),truck=id===truckId,at=position(w,s,truckId);
    const mobile=u&&available(b,u.id)&&u.ready<=(w.regionalWorld?.step||0);

    if(q.action==='returnBase')return sendTruck(w,s,b,yard(w,s,truckId),s.id,true);
    if(q.action==='driveTown'){
      const town=lookup(w,q.target);
      if(!town)return fail('Choose a town to drive to.');
      return sendTruck(w,s,b,town===s?yard(w,s,truckId):gate(w,s,town),town.id);
    }
    if(b.departure&&q.action!=='finishBoarding'&&q.action!=='stopField')return fail('The truck is gathering soldiers. Stop to change the pickup.');
    if(b.departure&&q.action==='stopField'){
      delete b.departure;for(const rider of b.units)if(rider.boarding){
        rider.field=copy(position(w,s,rider.id));delete rider.boarding;
      }
      return ok('Pickup stopped.');
    }
    if(q.action==='reboard'){
      if(at.moving)return fail('Wait for the truck to park.');
      const party=b.units.filter(v=>b.lastDrop?.includes(v.id)&&!v.aboard&&!v.boarding);
      if(!party.length)return fail('The dropped-off squad is already with the truck.');
      releaseAssignments(w,s,b,new Set(party.map(v=>v.id)));
      const time=now(w);for(const v of party)walkToTruck(w,s,v,at,time);
      return ok('Squad called back to the truck.');
    }
    if(q.action==='boardParty')return callToTruck(w,s,b,q.ids,at);
    if(q.action==='finishBoarding'){
      const count=settleBoarding(w,s);
      return count?ok(count+' boarded the military truck.'):fail('No units have arrived yet.');
    }
    if(q.action==='board'||q.action==='drive'){
      if(!mobile||q.action==='drive'&&!personnel(u))return fail('An available enlisted soldier must take the wheel.');
      if(at.moving)return fail('Stop the military truck before boarding.');
      if(dist(position(w,s,id),at)>pickup)return fail('Bring the soldier and truck together before boarding.');
      if(u.aboard&&q.action==='board')return fail('This unit is already with the truck.');
      if(manualMission(b,id)?.phase==='stationed'||manualMission(b,id)?.phase==='engaged')return fail('End the assignment before boarding.');
      boardUnit(u);
      if(q.action==='drive')b.driver=id;
      return ok(q.action==='drive'?'Soldier at the wheel. Choose a town and tap Drive.':personnel(u)?'Soldier aboard.':'Vehicle attached to the convoy.');
    }
    if(q.action==='unload'){
      if(at.moving)return fail('Stop the truck before unloading.');
      const riders=b.units.filter(v=>v.aboard&&(truck||v.id===id));
      if(!riders.length)return fail('Choose an occupied truck or a passenger.');
      b.lastDrop=riders.map(v=>v.id);
      for(const [i,v] of riders.entries()){
        v.field={x:at.x+.016*(1+i%6),y:at.y-.016*(1+Math.floor(i/6)%6)};delete v.aboard;
        if(b.driver===v.id)delete b.driver;
        const m=manualMission(b,v.id),t=m&&lookup(w,m.target);
        if(m?.phase==='awaiting'&&t&&dist(at,gate(w,s,t))<=arrival){m.delivered||=[];if(!m.delivered.includes(v.id))m.delivered.push(v.id);}
      }
      return ok('Unloaded '+riders.length+' at the truck’s current position.');
    }
    if(truck&&!(q.action==='moveField'&&!q.steer)&&!b.units.some(v=>v.id===b.driver&&v.aboard&&personnel(v)))return fail('Seat an enlisted soldier at the wheel first.');
    if(!truck&&(!mobile||u.aboard||['engaged','stationed'].includes(manualMission(b,id)?.phase)))return fail('Choose a unit on foot and free to move.');
    const a=truck?at:position(w,s,id);
    let destination;
    if(q.action==='moveField'){
      const area=lookup(w,q.area),g=area&&geography(w,area);
      if(!g||!validPoint(q.point))return fail('Choose a point on the regional map.');
      destination=project(g,geography(w,s),q.point);
      if(!q.steer&&(q.point.x<g.bounds.minX||q.point.x>g.bounds.maxX||q.point.y<g.bounds.minY||q.point.y>g.bounds.maxY)&&dist(a,destination)>1)return fail('Choose a point on the regional map.');
    }
    const field={...copy(a),dx:a.dx,dy:a.dy};
    if(destination){
      if(truck&&!q.steer)return sendTruck(w,s,b,destination,null);
      if(q.steer&&dist(a,destination)>.14)return fail('Steer one length of road at a time.');
      if(q.steer&&truck)destination=steerTruck(geography(w,s),a,destination);
      const points=q.steer?[destination]:route(w,s,a,destination,truck);
      const length=points.reduce((sum,p,i)=>sum+dist(p,i?points[i-1]:a),0);
      if(length>.00001){
        const time=now(w);
        field.route={at:time,points:points.map(copy),length,ms:Math.max(100,Math.min(900000,length*(truck?6500:22000)))};
      }
    }
    if(truck){
      if(q.steer&&field.route)settleBoarding(w,s,true);
      b.truck=field;
    }else{delete u.boarding;u.field=field;}
    return ok(destination?(truck?'Steering.':'Moving to the selected point.'):'Stopped.');
  }
  root.EarthBaseField={releaseAssignments,courseOpen:(w,b)=>!!b.truck?.route&&travelled(b.truck.route,now(w))<b.truck.route.ms,actions,personnel,canBoard,settleBoarding,gate,townAt,position,project,regional,valid,actors,status,moved,command,
    arrived:(w,s,m,t)=>m.ids.every(id=>m.delivered?.includes(id)&&!s.militaryBase.units.find(u=>u.id===id)?.aboard&&dist(position(w,s,id),gate(w,s,t))<=arrival+.09)};
})(globalThis);
