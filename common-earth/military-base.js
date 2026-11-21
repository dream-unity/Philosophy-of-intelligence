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
    for(const u of ready(w,s))if(!u.aboard&&(!u.field||!root.EarthBaseField.moved(w,s,u.id)))n+=strength(view(s),u)+(u.type==='guard'?1:0);
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
  const clock=w=>root.EarthDayClock?.now(w)??Date.now();
  const volley=1100,flight=420;
  function hasBuilding(t,id){
    if(id==='militaryBase'||id==='exchange')return true;
    if(t.buildings?.some(b=>b.id===id)||t.cooperative?.project?.id===id)return true;
    if(root.EarthNightlife?.venues.some(v=>'leisure-'+v.id===id))return true;
    if(/^home-[0-2]$/.test(id))return true;
    if(t.civicLand?.homes.some(h=>'cottage-'+h.plot===id)||t.privateHomes?.some(h=>h.stage>0&&'private-'+h.plot===id))return true;
    if(t.growth?.households.some(h=>'household-'+h.plot===id&&root.EarthHousing?.frontage(t,h)!=='lot'||h.shop&&'shop-'+h.businessPlot===id))return true;
    return !!t.city?.precincts.some(p=>p.use==='homes'&&'courtyard-'+p.id===id);
  }
  const short=v=>typeof v==='string'&&v.length>0&&v.length<1600;
  function validObjective(o){
    return !!o&&short(o.name)&&Number.isSafeInteger(o.generation)&&o.generation>=0&&
      Number.isFinite(o.x)&&Number.isFinite(o.y)&&Math.abs(o.x)<50000&&Math.abs(o.y)<50000&&
      (o.kind==='unit'?Number.isSafeInteger(o.id)&&o.id>0:o.kind==='resident'?short(o.id)&&short(o.key):o.kind==='building'&&short(o.id));
  }
  function targetAvailable(w,s,t,o){
    if(!t||t===s)return false;
    if(!o)return t.communityLife?.border?.occupiedBy!==s.id;
    if(!validObjective(o)||o.generation!==(t.foundingRevision||0))return false;
    if(o.kind==='unit'){
      const u=t.militaryBase?.units.find(u=>u.id===o.id);
      return !!u&&!u.aboard&&u.ready<=step(w);
    }
    if(o.kind==='resident'){
      const p=root.EarthPersonas?.profile(t,o.id);
      return p?.identityKey===o.key&&root.EarthCommunityLife.present(t,o.id)&&t.communityLife?.border?.health?.[o.id]?.condition!=='injured';
    }
    return hasBuilding(t,o.id)&&!t.militaryBase?.captures?.some(c=>c.id===o.id&&c.by===s.id);
  }
  function targetHp(w,t,o){
    if(!o)return (defence(w,t)+1)*3;
    if(o.kind==='resident')return 12;
    if(o.kind==='building')return 30;
    const u=t.militaryBase.units.find(u=>u.id===o.id);
    return 12+strength(t.militaryBase,u)*4;
  }
  function attackParty(w,s,t,o){
    if(!t||t.id===s.id)return [];
    const location=o?.kind==='unit'?root.EarthBaseField.townAt(w,t,root.EarthBaseField.position(w,t,o.id)):t;
    if(!location)return [];
    const b=view(s),field=root.EarthBaseField;
    return b.units.filter(u=>field.personnel(u)&&!u.aboard&&!u.boarding&&u.ready<=step(w)&&
      !b.missions.some(m=>m.ids.includes(u.id)&&!m.manual)&&
      field.townAt(w,s,field.position(w,s,u.id))?.id===location.id);
  }
  function shot(w,m,id,time=clock(w)){
    const age=time-m.fireAt-(id%7)*65;
    const hits=Math.max(0,1+Math.floor((age-flight)/volley));
    const phase=age%volley/flight;
    return {hits,bullet:age>=0&&phase<=1?phase:null};
  }
  function battle(w,s,m,time=clock(w)){
    const b=view(s),hp=m.remaining??m.defence;
    let damage=0,power=0;
    for(const u of b.units)if(m.ids.includes(u.id)){
      const force=strength(b,u);power+=force;damage+=shot(w,m,u.id,time).hits*force;
    }
    // Wake when the last needed volley lands. Time away or a reload uses the same clock.
    const end=m.fireAt+Math.max(0,Math.ceil(hp/Math.max(1,power))-1)*volley+6*65+flight;
    return {health:Math.max(0,hp-damage),end,done:damage>=hp};
  }
  function engage(w,s,b,m,t){
    m.phase='engaged';m.battleAt=step(w);m.fireAt=clock(w);m.defence=targetHp(w,t,m.objective);
    b.version=(b.version||0)+1;entry(w,t,s.name+' opened fire at '+(m.objective?.name||'the military base')+'.');
  }
  function command(w,q,automatic=false){
    const s=root.EarthCommunityLife.lookup(w,q?.site);
    if(!s||q.generation!==(s.foundingRevision||0))return fail('Reopen this town’s current base.');
    const b=view(s);
    if(q.version!=null&&q.version!==(b.version||0))return fail('The base roster has changed. Review your order.');
    let message;
    const field=root.EarthBaseField;
    if(field?.actions.has(q.action)){
      const result=field.command(w,s,b,q);if(!result.ok)return result;
      s.militaryBase=b;b.version=(b.version||0)+1;b.autonomous=false;
      if(q.action==='unload')settle(w,s);
      return result;
    }else if(q.action==='stopAttack'){
      if(!Array.isArray(q.ids))return fail('Select the soldiers to stop.');
      const ids=new Set(q.ids);
      const active=b.missions.filter(m=>m.fireAt!=null);
      const stopping=new Set(active.flatMap(m=>m.ids.filter(id=>ids.has(id))));
      if(!stopping.size)return fail('These soldiers are holding position.');
      field.releaseAssignments(w,s,b,stopping);message='Soldiers stopped firing.';
    }else if(q.action==='attackHere'){
      const t=root.EarthCommunityLife.lookup(w,q.target),available=attackParty(w,s,t,q.objective);
      const ids=q.ids==null?available.map(u=>u.id):q.ids;
      if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||!ids.every(id=>available.some(u=>u.id===id))){
        return fail('Drop off ready soldiers in the town you want to attack.');
      }
      let objective=q.objective;
      if(!targetAvailable(w,s,t,objective))return fail('That target is no longer available.');
      if(objective?.id==='militaryBase'&&objective.kind==='building'){
        objective=null;if(!targetAvailable(w,s,t))return fail('Your soldiers already hold that base.');
      }
      const same=b.missions.find(m=>m.fireAt!=null&&m.target===t.id&&m.objective?.kind===objective?.kind&&m.objective?.id===objective?.id);
      const changing=ids.filter(id=>!same?.ids.includes(id));
      if(!changing.length)return fail('These soldiers are already attacking that target.');
      if(same){
        same.remaining=battle(w,s,same).health;same.fireAt=clock(w);
      }
      field.releaseAssignments(w,s,b,new Set(changing));
      if(root.EarthBorderConflict.relation(w,s.id,t.id)?.state!=='war'){
        root.EarthBorderConflict.declare(w,s,t);root.EarthBorderConflict.relation(w,s.id,t.id).explicit=true;
      }
      if(same){same.ids.push(...changing);same.delivered.push(...changing);}
      else{
        const m={id:++b.serial,order:'attack',target:t.id,ids:[...ids],delivered:[...ids],manual:true,start:step(w),duration:1};
        if(objective)m.objective={kind:objective.kind,id:objective.id,name:objective.name,x:objective.x,y:objective.y,
          generation:objective.generation,...(objective.kind==='resident'?{key:objective.key}:{})};
        b.missions.push(m);engage(w,s,b,m,t);
      }
      message='Attacking '+(objective?.name||t.name)+'.';
    }else if(q.action==='settleCombat'){
      if(!b.missions.some(m=>m.fireAt!=null&&(battle(w,s,m).done||!targetAvailable(w,s,root.EarthCommunityLife.lookup(w,m.target),m.objective))))return fail('The battle is still in progress.');
      settle(w,s);return ok('Battle resolved.');
    }else if(q.action==='takeField'){
      const u=b.units.find(v=>v.id===q.id),m=u&&b.missions.find(m=>!m.manual&&m.ids.includes(u.id));
      if(!m)return fail('This unit is already available for field orders.');
      const p=field.position(w,s,u.id);u.field={x:p.x,y:p.y,dx:p.dx,dy:p.dy};
      m.ids=m.ids.filter(id=>id!==u.id);if(!m.ids.length)b.missions.splice(b.missions.indexOf(m),1);
      message=units[u.type].name+' '+u.id+' holds position under your command.';
    }else if(q.action==='enlist'){
      const u=Object.hasOwn(units,q.type)&&units[q.type];if(!u||u.tech&&!b.tech.includes(u.tech))return fail('Research this vehicle at the base first.');
      if(!pay(w,s,u.cost))return fail('The district has insufficient available stores for this unit.');
      const recruit=enlisted(b,q.type);message=u.name+' '+recruit.id+' is ready at '+s.name+' military base.';
    }else if(q.action==='research'){
      const r=Object.hasOwn(research,q.type)&&research[q.type];if(!r||b.tech.includes(q.type))return fail('Choose an unfinished research project.');
      if(!pay(w,s,r.cost))return fail('The district cannot yet afford this research.');
      b.tech.push(q.type);if(r.first)enlisted(b,r.first);
      message=s.name+' completed '+r.name+'.'+(r.first?' Its first '+units[r.first].name.toLowerCase()+' is ready.':'');
    }else if(q.action==='train'){
      const u=ready(w,s).find(u=>u.id===q.id);if(!u||u.grade>=3||u.aboard||u.field&&field.moved(w,s,u.id))return fail('Choose an available unit below training level three.');
      if(!pay(w,s,{food:1,funds:2}))return fail('A drill costs 1 food and 2 funds.');
      u.grade++;message=units[u.type].name+' '+u.id+' reached training level '+u.grade+'.';
    }else if(q.action==='dispatch'){
      const t=root.EarthCommunityLife.lookup(w,q.target);
      if(!t||t===s||!Object.hasOwn(orders,q.order)||!Array.isArray(q.ids)||!q.ids.length)return fail('Choose a mission, units and another town.');
      const ids=new Set(q.ids),party=ready(w,s).filter(u=>ids.has(u.id));
      if(automatic&&party.some(u=>u.aboard||u.boarding||u.field&&field.moved(w,s,u.id)))return fail('The expedition needs units at the base.');
      if(ids.size!==q.ids.length||party.length!==ids.size)return fail('One of the selected units is already on duty.');
      const war=root.EarthBorderConflict.relation(w,s.id,t.id)?.state==='war';
      if(q.order==='assist'&&war)return fail('A ceasefire is needed before these communities can reinforce each other.');
      if(q.order==='attack'&&!war){root.EarthBorderConflict.declare(w,s,t);root.EarthBorderConflict.relation(w,s.id,t.id).explicit=true;}
      if(!automatic){
        b.missions.push({id:++b.serial,order:q.order,target:t.id,ids:[...ids],manual:true,phase:'awaiting',start:step(w),duration:1});
        message=orders[q.order]+' order prepared. Load the units, drive the military truck to '+t.name+' and unload near its east gate.';
      }else{
        const geo=root.EarthRegionalWorld.geography(w,s),a=geo?.towns.find(p=>p.site.id===s.id),z=geo?.towns.find(p=>p.site.id===t.id);
        const km=a&&z?Math.hypot(z.x-a.x,z.y-a.y):12;
        const pace=Math.min(...party.map(u=>units[u.type].pace));
        const path=a&&z&&!party.every(u=>u.type==='jet')?root.EarthRegionalWorld.crossingPath(w,s,t):null;
        const distance=path?.length>1?(path.length-1)*geo.cellSize:km;
        const duration=Math.max(1,Math.ceil(Math.min(18,Math.max(2,distance*1.5))/pace));
        b.missions.push({...(path?.length>1?{path}:{}),id:++b.serial,automatic:true,order:q.order,target:t.id,ids:[...ids],phase:'outbound',start:step(w),duration});
        message=s.name+' sent '+party.length+' '+(party.length===1?'unit':'units')+' to '+t.name+' · '+orders[q.order]+'.';
      }
    }else if(q.action==='recall'){
      const m=b.missions.find(m=>m.id===q.id);if(!m||m.phase==='returning')return fail('This group is already home or returning.');
      if(m.manual){b.missions.splice(b.missions.indexOf(m),1);message='Assignment ended. The units hold their current positions.';}
      else{recall(w,m);message='The group is returning to '+s.name+'.';}
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
    else if(m.order==='scout'){entry(w,s,'Reconnaissance at '+t.name+' reported defence '+defence(w,t)+' and '+ready(w,t).length+' available units.');if(!m.manual)recall(w,m);}
    else if(m.objective){
      const o=m.objective;
      if(targetAvailable(w,s,t,o)&&battle(w,s,m).health===0){
        let text;
        if(o.kind==='building'){
          const targetBase=t.militaryBase||=empty(),captures=targetBase.captures||=[];
          targetBase.captures=captures.filter(c=>c.id!==o.id).concat({id:o.id,by:s.id});
          targetBase.version=(targetBase.version||0)+1;text=s.name+' captured '+o.name+'.';
        }else if(o.kind==='unit'){
          const targetBase=t.militaryBase,u=targetBase.units.find(v=>v.id===o.id);
          const p=root.EarthBaseField.position(w,t,u.id);
          root.EarthBaseField.releaseAssignments(w,t,targetBase,new Set([u.id]));
          if(targetBase.departure?.ids.includes(u.id))delete targetBase.departure;
          delete u.boarding;u.field={x:p.x,y:p.y};u.ready=step(w)+3;
          targetBase.version=(targetBase.version||0)+1;text=o.name+' was disabled and is recovering.';
        }else{
          root.EarthBorderConflict.homecoming(w,t,{trauma:{id:o.id,key:o.key,fatal:false,reason:'Injured during the attack by '+s.name+'.'}});
          text=o.name+' withdrew injured.';
        }
        entry(w,s,text);entry(w,t,text);
      }
    }else{
      const attacking=party.reduce((n,u)=>n+strength(b,u),0),defending=m.defence==null?defence(w,t):m.defence/3-1;
      const won=m.fireAt==null?attacking>defending:battle(w,s,m).health===0;
      const text=won?s.name+' captured the military base at '+t.name+' ('+attacking+' against '+defending+').':
        t.name+' repelled the attack from '+s.name+' ('+defending+' defence against '+attacking+').';
      if(won){
        const border=t.communityLife.border||={records:[],health:{},lost:0};border.occupiedBy=s.id;
        const home=s.communityLife.border;if(home?.occupiedBy===t.id)delete home.occupiedBy;
      }
      entry(w,s,text);entry(w,t,text);
      m.recovery=won||party.some(u=>u.type==='medic')?0:2;
      if(!m.manual)recall(w,m);
    }
    if(m.manual&&m.order!=='assist'){
      for(const u of party)u.ready=step(w)+(m.recovery||0);
      b.missions.splice(b.missions.indexOf(m),1);
    }
    b.version=(b.version||0)+1;
  }
  function incoming(w,id){
    const groups=[];
    for(const site of towns(w))for(const mission of site.militaryBase?.missions||[]){
      if(mission.target===id&&mission.phase!=='returning'&&mission.phase!=='awaiting')groups.push({site,mission});
    }
    return groups;
  }
  function settle(w,s){
    const b=s.militaryBase;if(!b)return;
    for(const m of [...b.missions]){
      const t=root.EarthCommunityLife.lookup(w,m.target),war=t&&root.EarthBorderConflict.relation(w,s.id,t.id)?.state==='war';
      if(m.manual){
        if(!t||m.order==='attack'&&!war||m.order==='assist'&&war){b.missions.splice(b.missions.indexOf(m),1);b.version++;continue;}
        if(m.phase==='awaiting'&&root.EarthBaseField.arrived(w,s,m,t)){
          if(m.order==='attack')engage(w,s,b,m,t);
          else finish(w,s,t,b,m);
        }else if(m.phase==='engaged'&&m.fireAt!=null&&!targetAvailable(w,s,t,m.objective)){
          b.missions.splice(b.missions.indexOf(m),1);b.version++;
        }else if(m.phase==='engaged'&&(m.fireAt==null?step(w)>m.battleAt:battle(w,s,m).done))finish(w,s,t,b,m);
        continue;
      }
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
    const group=towns(w);for(const s of group){
      if(root.EarthBaseField?.settleBoarding(w,s))s.militaryBase.version++;
      settle(w,s);
    }
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
    for(const [s,t] of [[a,b],[b,a]])if(s.militaryBase?.captures){
      s.militaryBase.captures=s.militaryBase.captures.filter(c=>c.by!==t.id);
    }
    for(const [s,t] of [[a,b],[b,a]])for(const m of [...(s.militaryBase?.missions||[])]){
      if(m.order==='attack'&&m.target===t.id&&m.phase!=='returning'){
        if(m.manual)s.militaryBase.missions.splice(s.militaryBase.missions.indexOf(m),1);else recall(w,m);
        s.militaryBase.version++;
      }
    }
  }
  function detach(w,id){
    for(const s of towns(w))if(s.militaryBase){
      const b=s.militaryBase;if(b.captures)b.captures=b.captures.filter(c=>c.by!==id);
      if(b.missions.some(m=>m.target===id)){b.missions=b.missions.filter(m=>m.target!==id);b.version++;}
    }
  }
  function valid(b){
    if(b==null)return true;
    const n=v=>Number.isSafeInteger(v)&&v>=0,str=v=>typeof v==='string'&&v.length>0&&v.length<1600;
    if(!n(b.serial)||!n(b.version||0)||typeof b.autonomous!=='boolean'||!Array.isArray(b.units)||!Array.isArray(b.missions)||!Array.isArray(b.log)||
      !Array.isArray(b.tech)||new Set(b.tech).size!==b.tech.length||!b.tech.every(k=>Object.hasOwn(research,k)))return false;
    if(b.captures!=null&&(!Array.isArray(b.captures)||!b.captures.every(c=>c&&short(c.id)&&short(c.by))))return false;
    const ids=new Set(),missions=new Set(),busy=new Set();
    for(const u of b.units){
      if(!u||!n(u.id)||u.id<1||u.id>b.serial||ids.has(u.id)||!Object.hasOwn(units,u.type)||!n(u.grade)||u.grade>3||!n(u.ready))return false;
      ids.add(u.id);
    }
    for(const m of b.missions){
      if(!m||!n(m.id)||!m.id||m.id>b.serial||ids.has(m.id)||missions.has(m.id)||!str(m.target)||!Object.hasOwn(orders,m.order)||!(m.manual?['awaiting','stationed','engaged']:['outbound','returning','stationed','engaged']).includes(m.phase)||m.manual!=null&&typeof m.manual!=='boolean'||m.delivered!=null&&(!Array.isArray(m.delivered)||!Array.isArray(m.ids)||m.delivered.length>m.ids.length||!m.delivered.every(id=>m.ids.includes(id)))||
        m.objective!=null&&(!validObjective(m.objective)||m.fireAt==null)||m.remaining!=null&&(!n(m.remaining)||m.remaining>m.defence)||
        m.fireAt!=null&&(!n(m.fireAt)||!n(m.defence)||!m.defence||m.phase!=='engaged')||m.phase==='engaged'&&(m.order!=='attack'||!n(m.battleAt))||m.path!=null&&(!Array.isArray(m.path)||m.path.length<2||m.path.length>4097||!m.path.every(c=>typeof c==='string'&&/^-?\d{1,5},-?\d{1,5}$/.test(c)))||
        !n(m.start)||!n(m.duration)||!m.duration||m.progress!=null&&(!Number.isFinite(m.progress)||m.progress<0||m.progress>1)||
        m.recovery!=null&&(!n(m.recovery)||m.recovery>2)||!Array.isArray(m.ids)||!m.ids.length||
        !m.ids.every(id=>ids.has(id)&&!busy.has(id)&&busy.add(id)))return false;
      missions.add(m.id);
    }
    return (!root.EarthBaseField||root.EarthBaseField.valid(b))&&b.log.length<=12&&b.log.every(e=>e&&n(e.week)&&n(e.step)&&str(e.text));
  }
  function missionPoint(w,s,m){
    const g=root.EarthRegionalWorld.geography(w,s),t=root.EarthCommunityLife.lookup(w,m.target);
    if(!t)return root.EarthBaseField.gate(w,s);
    const a=g.project(s),z=g.project(t),start=root.EarthBaseField.gate(w,s),end=root.EarthBaseField.gate(w,s,t);
    const time=root.EarthDayClock?.now(w)??Date.now(),partial=w.lastProductionAt?Math.max(0,Math.min(.98,(time-w.lastProductionAt)/root.EarthDistrictGrowth.period)):0;
    const f=m.phase==='stationed'||m.phase==='engaged'?1:m.phase==='outbound'?fraction(w,m,step(w)+partial):(m.progress??1)*(1-fraction(w,m,step(w)+partial));
    const route=m.path&&root.EarthRegionalWorld.tripPosition(w,s,{from:s.id,to:t.id,path:m.path},f);
    return {x:route?route.x+(start.x-a.x)*(1-f)+(end.x-z.x)*f:start.x+(end.x-start.x)*f,
      y:route?route.y+(start.y-a.y)*(1-f)+(end.y-z.y)*f:start.y+(end.y-start.y)*f,
      dx:z.x-a.x,dy:z.y-a.y,moving:m.phase==='outbound'||m.phase==='returning'};
  }
  function actors(w,geo){
    const rows=[];
    for(const a of geo.towns){
      const b=a.site.militaryBase;if(!b)continue;
      for(const m of b.missions){
        if(m.manual)continue;
        const z=geo.towns.find(t=>t.site.id===m.target);if(!z)continue;
        const unit=b.units.filter(u=>m.ids.includes(u.id)).sort((a,b)=>units[b.type].power-units[a.type].power)[0];
        rows.push({...missionPoint(w,a.site,m),kind:'military',unitKind:unit.type,siteId:a.site.id,
          name:a.site.name+' · '+units[unit.type].name,activity:orders[m.order],destination:z.site.name,detail:m.ids.length+' deployed · '+m.phase,phase:m.phase});
      }
    }
    return rows;
  }
  function restoreField(w){
    const field=root.EarthBaseField;if(!field)return;
    for(const s of towns(w)){
      field.restoreTrip(w,s);
      const b=s.militaryBase;if(!b||b.autonomous)continue;
      for(const m of [...b.missions]){
        if(m.manual||m.automatic)continue;
        const t=root.EarthCommunityLife.lookup(w,m.target);if(!t)continue;
        const p=missionPoint(w,s,m);
        m.ids.forEach((id,i)=>{b.units.find(u=>u.id===id).field={x:p.x+.009*(i%4),y:p.y-.009*Math.floor(i/4)};});
        if(m.phase==='returning'){b.missions.splice(b.missions.indexOf(m),1);continue;}
        m.manual=true;if(m.phase==='outbound')m.phase='awaiting';else m.delivered=[...m.ids];
      }
    }
  }
  root.EarthMilitaryBase=Object.freeze({place,gate,units,research,orders,towns,view,ready,parked,attackParty,targetAvailable,battle,shot,incoming,balance,affordable,defence,command,advance,peace,detach,valid,actors,missionPoint,restoreField});
})(globalThis);
