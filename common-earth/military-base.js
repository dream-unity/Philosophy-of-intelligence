/* The base is a permanent public frontage. Its roster and assignments are paid
   from this district's stores and advance even when nobody is watching it. */
(function(root){
  'use strict';
  const place={x:27,y:12},gate={x:24.35,y:12,label:'Military base gate'};
  const goods=['food','materials','funds'];
  const unit=(name,food,materials,funds,power,pace,detail,tech=null)=>({name,cost:{food,materials,funds},power,pace,detail,tech});
  const units={
    guard:unit('Guard',1,1,2,3,2,'Holds the base or serves on an expedition.'),
    scout:unit('Scout',1,1,2,2,4,'Fast reconnaissance and short journeys.'),
    engineer:unit('Engineer',1,2,2,2,2,'Adds strength when reinforcing a community.'),
    medic:unit('Medic',2,1,2,1,2,'Helps a returning group recover sooner.'),
    tank:unit('Tank',0,4,5,8,2,'A strong ground vehicle.','armour'),
    jet:unit('Fighter jet',0,4,7,6,6,'A fast aircraft for independent or joint missions.','flight')
  };
  const research={
    doctrine:{name:'Command training',cost:{food:1,materials:2,funds:3},detail:'Adds one strength per unit on assignment.'},
    armour:{name:'Armoured engineering',cost:{materials:6,funds:7},first:'tank',detail:'Includes the first tank and opens the vehicle workshop.'},
    flight:{name:'Flight research',cost:{materials:7,funds:9},first:'jet',detail:'Includes the first fighter jet and opens the hangar.'},
    time:{name:'Time machine',cost:{materials:8,funds:10},detail:'Installs a working time machine. Open a recorded moment and play a different future.'}
  };
  const orders={attack:'Attack',assist:'Reinforce',scout:'Reconnoitre'};
  const towns=w=>[...w.sites,...(w.communityLife?.outposts||[])];
  const empty=()=>({serial:0,units:[],tech:[],missions:[],log:[],autonomous:true});
  const view=s=>s.militaryBase||empty();
  const step=w=>w.regionalWorld?.step||0;
  const fail=message=>({ok:false,message}),ok=message=>({ok:true,message});
  function balance(w,s){
    const held=root.EarthNeighbourErrands?.heldGoods?.(s,w.week)||{};
    return Object.fromEntries(goods.map(k=>[k,Math.max(0,s[k]-(held[k]||0))]));
  }
  function affordable(w,s,cost){const free=balance(w,s);return goods.every(k=>free[k]>=(cost[k]||0));}
  function pay(w,s,cost){
    if(!affordable(w,s,cost))return false;
    // Procurement pays a local contractor. Materials and provisions are consumed.
    const suppliers=s.residents.filter(p=>root.EarthCommunityLife.present(s,p.id));
    const offset=(view(s).version||0)%Math.max(1,suppliers.length);
    for(let i=0;i<suppliers.length;i++){
      const p=suppliers[(i+offset)%suppliers.length];
      if(root.EarthPurses.productionReceipt(w,s,p.id,cost.funds,'Military base procurement and training contract.'))break;
    }
    for(const k of goods)s[k]-=cost[k]||0;
    return true;
  }
  function entry(w,s,text){
    const b=s.militaryBase||=empty();b.log.unshift({week:w.week,step:step(w),text});b.log.length=Math.min(b.log.length,12);
    root.EarthCommunityLife.recordWeek(s,w.week,text);
  }
  const enlisted=(b,type)=>{const u={id:++b.serial,type,grade:0,ready:0};b.units.push(u);return u;};
  const assigned=(b,id)=>b.missions.some(m=>m.ids.includes(id));
  const ready=(w,s)=>{const b=view(s);return b.units.filter(u=>!assigned(b,u.id)&&u.ready<=step(w));};
  const displays=new WeakMap();
  function parked(s){
    const b=s.militaryBase;if(!b)return [];
    const prior=displays.get(b);if(prior?.version===b.version)return prior.types;
    const types=[...new Set(b.units.filter(u=>!assigned(b,u.id)).map(u=>u.type))];
    displays.set(b,{version:b.version,types});return types;
  }
  const strength=(b,u)=>units[u.type].power+u.grade+(b.tech.includes('doctrine')?1:0);
  function defence(w,s){
    let n=2+2*(s.communityLife?.border?.defence?.stage||0);
    for(const u of ready(w,s))n+=strength(view(s),u)+(u.type==='guard'?1:0);
    for(const ally of towns(w))for(const m of ally.militaryBase?.missions||[]){
      if(m.target!==s.id||m.phase!=='stationed')continue;
      const b=ally.militaryBase;
      for(const u of b.units)if(m.ids.includes(u.id))n+=strength(b,u)+(u.type==='engineer'?3:0);
    }
    return n;
  }
  function fraction(w,m,at=step(w)){return Math.min(1,Math.max(0,(at-m.start)/m.duration));}
  function recall(w,m){
    const progress=m.phase==='outbound'?fraction(w,m):1;
    m.progress=progress;m.start=step(w);m.duration=Math.max(1,Math.ceil(m.duration*progress));m.phase='returning';
  }
  function command(w,q,automatic=false){
    const s=root.EarthCommunityLife.lookup(w,q?.site);
    if(!s||q.generation!==(s.foundingRevision||0))return fail('Reopen this town’s current base.');
    const b=view(s);
    if(q.version!=null&&q.version!==(b.version||0))return fail('The base roster has changed. Review your order.');
    let message;
    if(q.action==='enlist'){
      const u=Object.hasOwn(units,q.type)&&units[q.type];if(!u||u.tech&&!b.tech.includes(u.tech))return fail('Research this vehicle at the base first.');
      if(!pay(w,s,u.cost))return fail('The district has insufficient available stores for this unit.');
      const recruit=enlisted(b,q.type);message=u.name+' '+recruit.id+' is ready at '+s.name+' military base.';
    }else if(q.action==='research'){
      const r=Object.hasOwn(research,q.type)&&research[q.type];if(!r||b.tech.includes(q.type))return fail('Choose an unfinished research project.');
      if(!pay(w,s,r.cost))return fail('The district cannot yet afford this research.');
      b.tech.push(q.type);if(r.first)enlisted(b,r.first);
      message=s.name+' completed '+r.name+'.'+(r.first?' Its first '+units[r.first].name.toLowerCase()+' is ready.':'');
    }else if(q.action==='train'){
      const u=ready(w,s).find(u=>u.id===q.id);if(!u||u.grade>=3)return fail('Choose an available unit below training level three.');
      if(!pay(w,s,{food:1,funds:2}))return fail('A drill costs 1 food and 2 funds.');
      u.grade++;message=units[u.type].name+' '+u.id+' reached training level '+u.grade+'.';
    }else if(q.action==='dispatch'){
      const t=root.EarthCommunityLife.lookup(w,q.target);
      if(!t||t===s||!Object.hasOwn(orders,q.order)||!Array.isArray(q.ids)||!q.ids.length)return fail('Choose a mission, units and another town.');
      const ids=new Set(q.ids),party=ready(w,s).filter(u=>ids.has(u.id));
      if(ids.size!==q.ids.length||party.length!==ids.size)return fail('One of the selected units is already on duty.');
      const war=root.EarthBorderConflict.relation(w,s.id,t.id)?.state==='war';
      if(q.order==='assist'&&war)return fail('A ceasefire is needed before these communities can reinforce each other.');
      if(q.order==='attack'&&!war){root.EarthBorderConflict.declare(w,s,t);root.EarthBorderConflict.relation(w,s.id,t.id).explicit=true;}
      const geo=root.EarthRegionalWorld.geography(w,s),a=geo?.towns.find(p=>p.site.id===s.id),z=geo?.towns.find(p=>p.site.id===t.id);
      const km=a&&z?Math.hypot(z.x-a.x,z.y-a.y):12;
      const pace=Math.min(...party.map(u=>units[u.type].pace));
      const path=a&&z&&!party.every(u=>u.type==='jet')?root.EarthRegionalWorld.crossingPath(w,s,t):null;
      const distance=path?.length>1?(path.length-1)*geo.cellSize:km;
      const duration=Math.max(1,Math.ceil(Math.min(18,Math.max(2,distance*1.5))/pace));
      b.missions.push({...(path?.length>1?{path}:{}),id:++b.serial,order:q.order,target:t.id,ids:[...ids],phase:'outbound',start:step(w),duration});
      message=s.name+' sent '+party.length+' '+(party.length===1?'unit':'units')+' to '+t.name+' · '+orders[q.order]+'.';
    }else if(q.action==='recall'){
      const m=b.missions.find(m=>m.id===q.id);if(!m||m.phase==='returning')return fail('This group is already home or returning.');
      recall(w,m);message='The group is returning to '+s.name+'.';
    }else if(q.action==='autonomy'){
      if(typeof q.enabled!=='boolean')return fail('Choose who directs this base.');
      b.autonomous=q.enabled;message=s.name+' base is under '+(q.enabled?'town':'player')+' command.';
    }else return fail('Choose a base action.');
    s.militaryBase=b;b.version=(b.version||0)+1;
    // A player order takes priority over future autonomous spending and dispatch.
    if(!automatic&&q.action!=='autonomy')b.autonomous=false;
    entry(w,s,message);return ok(message);
  }
  function finish(w,s,t,b,m){
    const party=b.units.filter(u=>m.ids.includes(u.id));
    if(m.order==='assist'){m.phase='stationed';entry(w,t,s.name+' reinforcements are defending '+t.name+'.');}
    else if(m.order==='scout'){entry(w,s,'Reconnaissance at '+t.name+' reported defence '+defence(w,t)+' and '+ready(w,t).length+' available units.');recall(w,m);}
    else{
      const attacking=party.reduce((n,u)=>n+strength(b,u),0),defending=defence(w,t),won=attacking>defending;
      const text=won?s.name+' captured the military base at '+t.name+' ('+attacking+' against '+defending+').':
        t.name+' repelled the attack from '+s.name+' ('+defending+' defence against '+attacking+').';
      if(won){
        const border=t.communityLife.border||={records:[],health:{},lost:0};border.occupiedBy=s.id;
        const home=s.communityLife.border;if(home?.occupiedBy===t.id)delete home.occupiedBy;
      }
      entry(w,s,text);entry(w,t,text);
      m.recovery=won||party.some(u=>u.type==='medic')?0:2;
      recall(w,m);
    }
    b.version=(b.version||0)+1;
  }
  function incoming(w,id){
    const groups=[];
    for(const site of towns(w))for(const mission of site.militaryBase?.missions||[]){
      if(mission.target===id&&mission.phase!=='returning')groups.push({site,mission});
    }
    return groups;
  }
  function settle(w,s){
    const b=s.militaryBase;if(!b)return;
    for(const m of [...b.missions]){
      const t=root.EarthCommunityLife.lookup(w,m.target),war=t&&root.EarthBorderConflict.relation(w,s.id,t.id)?.state==='war';
      if((!t||m.order==='attack'&&!war||m.order==='assist'&&war)&&m.phase!=='returning'){recall(w,m);b.version=(b.version||0)+1;}
      if(m.phase==='engaged'){
        if(step(w)>m.battleAt)finish(w,s,t,b,m);
        continue;
      }
      if(m.phase==='stationed'||fraction(w,m)<1)continue;
      if(m.phase==='outbound'){
        if(m.order==='attack'){
          m.phase='engaged';m.battleAt=step(w);b.version++;
          entry(w,t,s.name+' reached the east gate. The bases are engaged.');
        }else finish(w,s,t,b,m);
        continue;
      }
      for(const u of b.units)if(m.ids.includes(u.id))u.ready=step(w)+(m.recovery||0);
      b.missions.splice(b.missions.indexOf(m),1);b.version=(b.version||0)+1;entry(w,s,'Expedition '+m.id+' returned to '+s.name+'.');
    }
  }
  function advance(w){
    const group=towns(w);for(const s of group)settle(w,s);
    if(step(w)%12!==0)return;
    const enemies=new Map();
    for(const r of Object.values(w.communityLife.relations||{}))if(r.state==='war'){
      for(const [a,b] of [[r.from,r.to],[r.to,r.from]]){
        if(!enemies.has(a))enemies.set(a,[]);enemies.get(a).push(b);
      }
    }
    for(const s of group){
      const b=view(s);if(!b.autonomous||s.id===w.communityLife.homeId&&!s.militaryBase)continue;
      const rivals=enemies.get(s.id);
      if(!rivals?.length)continue;
      const req={site:s.id,generation:s.foundingRevision||0},free=balance(w,s),floor=root.EarthCivicInitiatives.reserve(w,s);
      const upgrade=['doctrine','armour','flight'].find(id=>!b.tech.includes(id));
      if(b.units.length>=2&&upgrade&&goods.every(k=>free[k]>=(floor[k]||0)+(research[upgrade].cost[k]||0)+7)){
        command(w,{...req,action:'research',type:upgrade},true);
      }else if(b.units.length<4&&goods.every(k=>free[k]>=(floor[k]||0)+(units.guard.cost[k]||0)+4)){
        command(w,{...req,action:'enlist',type:b.units.length%2?'scout':'guard'},true);
      }else if(!b.missions.length&&ready(w,s).length>=3&&root.EarthBorderConflict.hostile(w,s)){
        command(w,{...req,action:'dispatch',order:'attack',target:rivals[0],ids:ready(w,s).slice(0,3).map(u=>u.id)},true);
      }
    }
  }
  function peace(w,a,b){
    for(const [s,t] of [[a,b],[b,a]])for(const m of s.militaryBase?.missions||[]){
      if(m.order==='attack'&&m.target===t.id&&m.phase!=='returning'){recall(w,m);s.militaryBase.version++;}
    }
  }
  function detach(w,id){
    for(const s of towns(w))if(s.militaryBase){
      const b=s.militaryBase;if(b.missions.some(m=>m.target===id)){b.missions=b.missions.filter(m=>m.target!==id);b.version++;}
    }
  }
  function valid(b){
    if(b==null)return true;
    const n=v=>Number.isSafeInteger(v)&&v>=0,str=v=>typeof v==='string'&&v.length>0&&v.length<1600;
    if(!n(b.serial)||!n(b.version||0)||typeof b.autonomous!=='boolean'||!Array.isArray(b.units)||!Array.isArray(b.missions)||!Array.isArray(b.log)||
      !Array.isArray(b.tech)||new Set(b.tech).size!==b.tech.length||!b.tech.every(k=>Object.hasOwn(research,k)))return false;
    const ids=new Set(),missions=new Set(),busy=new Set();
    for(const u of b.units){
      if(!u||!n(u.id)||u.id<1||u.id>b.serial||ids.has(u.id)||!Object.hasOwn(units,u.type)||!n(u.grade)||u.grade>3||!n(u.ready))return false;
      ids.add(u.id);
    }
    for(const m of b.missions){
      if(!m||!n(m.id)||!m.id||m.id>b.serial||ids.has(m.id)||missions.has(m.id)||!str(m.target)||!Object.hasOwn(orders,m.order)||!['outbound','returning','stationed','engaged'].includes(m.phase)||
        m.phase==='engaged'&&(m.order!=='attack'||!n(m.battleAt))||m.path!=null&&(!Array.isArray(m.path)||m.path.length<2||m.path.length>4097||!m.path.every(c=>typeof c==='string'&&/^-?\d{1,5},-?\d{1,5}$/.test(c)))||
        !n(m.start)||!n(m.duration)||!m.duration||m.progress!=null&&(!Number.isFinite(m.progress)||m.progress<0||m.progress>1)||
        m.recovery!=null&&(!n(m.recovery)||m.recovery>2)||!Array.isArray(m.ids)||!m.ids.length||
        !m.ids.every(id=>ids.has(id)&&!busy.has(id)&&busy.add(id)))return false;
      missions.add(m.id);
    }
    return b.log.length<=12&&b.log.every(e=>e&&n(e.week)&&n(e.step)&&str(e.text));
  }
  function actors(w,geo){
    const rows=[];
    for(const a of geo.towns){
      const b=a.site.militaryBase;if(!b)continue;
      for(const m of b.missions){
        const z=geo.towns.find(t=>t.site.id===m.target);if(!z)continue;
        const time=root.EarthDayClock?.now(w)??Date.now(),partial=w.lastProductionAt?Math.max(0,Math.min(.98,(time-w.lastProductionAt)/root.EarthDistrictGrowth.period)):0;
        const f=m.phase==='stationed'||m.phase==='engaged'?1:m.phase==='outbound'?fraction(w,m,step(w)+partial):(m.progress??1)*(1-fraction(w,m,step(w)+partial));
        const unit=b.units.filter(u=>m.ids.includes(u.id)).sort((a,b)=>units[b.type].power-units[a.type].power)[0];
        const start=root.EarthRegionalRender?.regionalPoint?.(a,place.x,place.y)||a,end=root.EarthRegionalRender?.regionalPoint?.(z,place.x,place.y)||z;
        const route=m.path&&root.EarthRegionalWorld.tripPosition(w,a.site,{from:a.site.id,to:z.site.id,path:m.path},f);
        const x=route?route.x+(start.x-a.x)*(1-f)+(end.x-z.x)*f:start.x+(end.x-start.x)*f;
        const y=route?route.y+(start.y-a.y)*(1-f)+(end.y-z.y)*f:start.y+(end.y-start.y)*f;
        rows.push({x,y,dx:z.x-a.x,dy:z.y-a.y,kind:'military',unitKind:unit.type,siteId:a.site.id,
          name:a.site.name+' · '+units[unit.type].name,activity:orders[m.order],destination:z.site.name,detail:m.ids.length+' deployed · '+m.phase,phase:m.phase});
      }
    }
    return rows;
  }
  root.EarthMilitaryBase=Object.freeze({place,gate,units,research,orders,towns,view,ready,parked,incoming,balance,affordable,defence,command,advance,peace,detach,valid,actors});
})(globalThis);
