/* Identity and visits use the settlement save. Movement and furniture stay in Street view. */
(function(root){
  'use strict';
  const founder={id:'steward',name:'Community steward',role:'Steward'};
  const locals=[
    {name:'Noor',role:'Baker',work:'I bake for the district. Food grown here can feed people or go into a meal you share with someone.'},
    {name:'Tomas',role:'Carpenter',work:'I fix what the neighbourhood uses. If a building crew is short, one resident can volunteer and another can cover repairs.'},
    {name:'Lina',role:'Seed keeper',work:'Watch what grows here. A garden beside a workshop gets help from the workshop crew.'},
    {name:'Ari',role:'Foot courier',work:'I walk the district with parcels. The market knows who is waiting for the next one.'},
    {name:'Sana',role:'Market trader',work:'I meet the arriving crews. A market beside a pier can earn extra funds.'}
  ];
  const reject=message=>({ok:false,message});
  const walkers=locals.map((_,i)=>'walker-'+i);
  function porter(id){
    if(root.EarthPersonas?.isPorterId)return root.EarthPersonas.isPorterId(id);
    if(typeof id!=='string'||!/^carrier-[0-8]-[0-8]$/.test(id))return false;
    const [,from,to]=id.split('-').map(Number);
    return Math.abs(from%3-to%3)+Math.abs(Math.floor(from/3)-Math.floor(to/3))===1;
  }
  const streetActor=id=>id==='driver'||walkers.includes(id)||porter(id);
  const links=site=>Array.isArray(site?.buildings)?root.CommonEarthSim?.productiveLinks?.(site)||[]:[];
  const savedPorter=(site,id)=>Array.isArray(site?.agency?.porters)&&site.agency.porters.includes(id);
  const linkId=link=>'carrier-'+link.from+'-'+link.to;
  const canPlay=(site,id)=>id===founder.id||id==='driver'||walkers.includes(id)||Boolean(site?.residents?.some(r=>r.id===id))||
    Boolean(site&&porter(id)&&(savedPorter(site,id)||root.EarthPersonas?.retainsPorter?.(site,id)||links(site).some(link=>linkId(link)===id)));

  const actorId=site=>canPlay(site,site?.agency?.actor)?site.agency.actor:founder.id;
  const actor=site=>{
    const id=actorId(site);return id===founder.id?null:site.residents.find(p=>p.id===id)||identity(site,id);
  };
  function point(p,site){
    if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x>25||p.y>25)return false;
    if(p.x>=-1&&p.y>=-1)return true;
    const outskirts=root.EarthDistrictGrowth?.extent?.(site);
    return !!outskirts&&p.x>=outskirts.west&&p.y>=outskirts.north&&(p.x>=-.78||p.y>=-.78);
  }
  const residentHere=(site,id)=>root.EarthCommunityLife?.present?.(site,id)!==false && root.EarthCommunityLife?.residency?.(site,id)!=='visitor';
  function identity(site,id,activeLinks,present=false){
    if(!site)return null;
    const profile=root.EarthPersonas?.profile(site,id);
    const occupation=root.EarthCareers?.role(site,id);
    if(root.EarthCommunityLife?.present?.(site,id)===false)return profile?{...profile,id,role:occupation||profile.originRole,available:false}:null;
    if(porter(id)){
      const guest=root.EarthCommunityLife?.profile?.(site,id);
      if(guest){
        const role=occupation||guest.role||guest.originRole||'Community member';
        const visiting=root.EarthCommunityLife?.residency?.(site,id)==='visitor';
        return {...guest,id,name:guest.name,role,available:true,
          work:visiting?'I am visiting from '+guest.home+'. I am finding out how '+role.toLowerCase()+' work fits here.':
            'My background is in '+(guest.originRole||role).toLowerCase()+' work in '+guest.home+'.'};
      }
      const [,from,to]=id.split('-').map(Number);
      const link=(activeLinks||links(site)).find(l=>l.from===from&&l.to===to);
      if(!link)return {...profile,id,name:profile?.name||'Supply porter · lots '+(from+1)+' and '+(to+1),role:occupation||profile?.originRole||'Supply porter',
        available:present||savedPorter(site,id)||Boolean(root.EarthPersonas?.retainsPorter?.(site,id))};
      const duty=link.resource==='food'?'Garden courier':'Exchange porter';
      return {...profile,id,name:profile?.name||duty+' · lots '+(from+1)+' and '+(to+1),role:occupation||duty,available:true,
        work:'I carry supplies between these lots. Keeping the two workplaces beside each other produces an extra '+(link.resource==='food'?'food.':'fund.')};
    }
    const resident=site.residents.find(p=>p.id===id);
    const local=locals.find((_,i)=>id==='walker-'+i);
    const initial=resident||local||(id===founder.id?founder:id==='driver'?{name:'Imani',role:'Co-op delivery driver'}:null);
    if(!initial)return null;
    if(!profile&&!occupation&&(resident||initial===founder))return initial;
    return {...initial,...profile,id,role:occupation||profile?.originRole||initial.role};
  }
  function shadowPass(site,world,id){
    const token=site?.agency?.shadow;
    if(!token||token.id!==id||token.week>world.week||world.week>token.week+1||site.id!==world.activeId||!residentHere(site,id))return false;
    return token.key===identity(site,id)?.identityKey;
  }
  function finishShadow(world,site){
    const token=site?.agency?.shadow;
    if(!token||world.activeId!==site.id||root.EarthCommunityLife?.isHome?.(world,site)||shadowPass(site,world,token.id))return null;
    const state=site.agency;delete state.shadow;
    if(actorId(site)!==token.id)return null;
    const name=identity(site,token.id)?.name||'The resident';
    if(state.actorAt&&streetActor(token.id))(state.localPositions||={})[token.id]={x:state.actorAt.x,y:state.actorAt.y,serial:state.actorAt.serial};
    state.actor='steward';delete state.actorAt;delete state.returningActor;
    if(world.communityLife.viewpointHistory?.until==null&&world.communityLife.viewpointHistory){
      const record=world.communityLife.viewpointHistory;record.changes=changesSince(world,site,record.before);record.until=world.week;
    }
    return name+' finished the round you agreed to share. You have returned to '+world.communityLife.profile.name+'.';
  }
  function playables(site){
    if(!site)return [];
    const routes=links(site),porters=root.EarthPersonas?.porterIds?.(site,routes)||[...new Set([...(site.agency?.porters||[]),...routes.map(linkId)])];
    return [founder.id,...site.residents.map(p=>p.id),...walkers,'driver',...porters].filter(id=>residentHere(site,id)).map(id=>{
      const person=identity(site,id,routes,true);
      const displayName=root.EarthCommunityLife?.personLabel?.(site,id,person.name)||person.name;
      return {...person,displayName};
    });
  }
  function valid(site,week){
    const a=site.agency;
    if(a?.porters!=null&&(!Array.isArray(a.porters)||a.porters.length>24||new Set(a.porters).size!==a.porters.length||!a.porters.every(porter)))return false;
    if(root.EarthDialogue && !root.EarthDialogue.valid(site,week))return false;
    if(a==null)return site.introductions===undefined;
    if(a.shadow!=null&&(!a.shadow||!canPlay(site,a.shadow.id)||a.shadow.id==='steward'||typeof a.shadow.key!=='string'||
      !a.shadow.key.length||a.shadow.key.length>1040||!Number.isSafeInteger(a.shadow.week)||a.shadow.week<1||a.shadow.week>week))return false;
    if(typeof a!=='object'||Array.isArray(a)||!canPlay(site,a.actor))return false;
    if(a.returningActor!=null && (a.actor!==founder.id || a.returningActor===founder.id || !canPlay(site,a.returningActor)))return false;
    if(porter(a.actor)&&!savedPorter(site,a.actor)||porter(a.returningActor)&&!savedPorter(site,a.returningActor))return false;
    if(a.stewardPosition!=null&&!point(a.stewardPosition,site))return false;
    if(a.handoffSerial!=null&&(!Number.isSafeInteger(a.handoffSerial)||a.handoffSerial<1))return false;
    const stamped=p=>point(p,site)&&Number.isSafeInteger(p.serial)&&p.serial>=1&&p.serial<=a.handoffSerial;
    if(streetActor(a.actor)&&!a.actorAt)return false;
    if(a.actorAt!=null&&(a.actor===founder.id||a.actorAt.id!==a.actor||!stamped(a.actorAt)))return false;
    if(a.localPositions!=null&&(typeof a.localPositions!=='object'||Array.isArray(a.localPositions)||
      !Object.entries(a.localPositions).every(([id,p])=>streetActor(id)&&(!porter(id)||savedPorter(site,id))&&stamped(p))))return false;
    const knownRecipient=id=>id===founder.id||site.residents.some(p=>p.id===id)||id==='driver'||
      /^walker-[0-4]$/.test(id)||porter(id);
    return Array.isArray(a.meals)&&a.meals.length<=90&&a.meals.every(m=>m&&typeof m.to==='string'&&knownRecipient(m.to)&&m.to!==m.from&&
      canPlay(site,m.from)&&(!porter(m.from)||savedPorter(site,m.from))&&Number.isSafeInteger(m.week)&&m.week>0&&m.week<=week);
  }
  function ensure(site){return site.agency||={actor:founder.id,meals:[]};}
  function checkHandoff(site,id,scene){
    if(!site||!scene||scene.siteId!==site.id||scene.actor!==actorId(site))return reject('The character changed. Choose again.');
    if(scene.mode!=='walk'||!point(scene,site))return reject('Come ashore or step out of the van before changing characters.');
    const originalVisitor=id===founder.id&&site.communityLife?.people?.[id]?.status==='anchor'&&root.EarthCommunityLife?.present?.(site,id);
    if(!canPlay(site,id)||!residentHere(site,id)&&!originalVisitor)return reject('Choose a current community member. Visitors decide for themselves where to live.');
    if(actorId(site)===id)return {ok:true,message:'Already playing as '+identity(site,id).name+'.',unchanged:true};
    if(streetActor(id)||id!==founder.id&&scene.targetPose){
      const incoming=scene.targetPose;
      if(!incoming||incoming.id!==id||!point(incoming,site))return reject('The person’s position changed. Choose them again in Street view.');
      if(incoming.mode!=='walk')return reject(id==='driver'?'The driver is aboard the truck. Take control when they are on foot.':'Wait until this neighbour is on foot.');
    }
    return {ok:true};
  }
  function position(site,scene){
    const state=ensure(site);
    state.handoffSerial=(state.handoffSerial||0)+1;
    return {x:scene.x,y:scene.y,serial:state.handoffSerial};
  }
  function releaseAt(site,person,scene){
    if(!scene||scene.siteId!==site.id||scene.actor!==person.id||scene.mode!=='walk'||!point(scene,site))return;
    if(streetActor(person.id)){
      const positions=ensure(site).localPositions||={};
      positions[person.id]=position(site,scene);return;
    }
    const x=Math.max(0,Math.min(24,scene.x)),y=Math.max(0,Math.min(24,scene.y));
    root.EarthConstruction?.releaseFromShift(site,{residentId:person.id},{residentId:person.id,x,y});
  }
  const skillNames=['care','communication','craft','music','numeracy','organisation','stamina'];
  function originalDistricts(world){
    const a=world.communityLife;
    return [...world.sites,...(a?.outposts||[])].filter(s=>s.id===a?.originId||s.id===a?.homeId||
      s.communityLife?.people?.steward?.status==='anchor');
  }
  function originalAccounts(world){
    return originalDistricts(world).map(s=>({name:s.name,balance:s.purses?.people?.steward?.balance||0})).filter(row=>row.balance);
  }
  function originalState(world,site){
    const life=world?.communityLife;
    if(!life||!site)return null;
    const person=identity(site,'steward'),career=site.careers?.steward;
    const cash=originalAccounts(world).reduce((n,account)=>Math.min(Number.MAX_SAFE_INTEGER,n+account.balance),0);
    return {week:world.week,place:site.id,home:life.homeId,cash,role:person?.role||'Steward',reliability:life.duty.reliability,
      skills:skillNames.map(k=>career?.skills?.[k]??person?.aptitudes?.[k]??0),
    };
  }
  function changesSince(world,site,before){
    if(!before)return [];
    const now=originalState(world,site);if(!now)return [];
    const rows=[],person=world.communityLife.profile.name,own=site.autonomy?.people?.steward,accounts=originalDistricts(world);
    if(before.home!==now.home){
      const home=accounts.find(s=>s.id===now.home);if(home)rows.push('Accepted membership in '+home.name+'.');
    }
    if(before.role!==now.role)rows.push('Changed from '+before.role.toLowerCase()+' work to '+now.role.toLowerCase()+'.');
    for(const town of accounts){
      for(const target of town.residents){
        const receipt=target.agreements?.find(r=>r.by==='steward'&&r.week>before.week);
        if(receipt)rows.push((receipt.status==='kept'?'Kept':'Missed')+' the promise to '+target.name+' in '+town.name+' in week '+receipt.week+'.');
      }
      for(const r of town.agency?.arrangements?.rows||[])if(r.actorId==='steward'&&r.finishedWeek>before.week&&['kept','missed'].includes(r.status))
        rows.push((r.status==='kept'?'Kept':'Missed')+' the agreement with '+(identity(town,r.requesterId)?.name||'a neighbour')+' in week '+r.finishedWeek+'.');
    }
    if(before.reliability!==now.reliability){
      const log=accounts.flatMap(t=>t.communityLife?.log||[]).filter(e=>e.week>before.week&&e.text.includes(person)&&e.text.includes('pantry round')).sort((a,b)=>b.week-a.week)[0];
      if(log)rows.push(log.text);
    }
    if(before.cash!==now.cash){
      const latest=accounts.flatMap(t=>t.purses?.people?.steward?.entries||[]).filter(e=>e.week>=before.week).sort((a,b)=>b.week-a.week)[0];
      rows.push('Personal funds went from '+before.cash+' to '+now.cash+'.'+(latest?.text?' '+latest.text:''));
    }
    const learned=skillNames.filter((k,i)=>now.skills[i]>before.skills[i]).map(k=>k+' +'+(now.skills[skillNames.indexOf(k)]-before.skills[skillNames.indexOf(k)]));
    if(learned.length)rows.push('Improved '+learned.join(', ')+'.');
    const heard=world.communityLife.fieldNotes?.find(n=>n.reader===world.communityLife.profile.identityKey&&n.week>before.week);
    if(heard)rows.push('Learned about parcel '+heard.cell+' from '+heard.from+'. The witness was '+heard.sourceName+'.');
    const progress=own?.history?.find(h=>h.week>before.week&&h.kind!=='player'&&h.kind!=='routine'&&h.kind!=='rest');
    if(progress&&rows.length<4)rows.push('Week '+progress.week+' · '+(progress.title||progress.reason));
    return [...new Set(rows)].slice(0,6);
  }
  function recall(world,site){
    const record=world?.communityLife?.viewpointHistory;
    if(!record)return null;
    return {since:record.before.week,until:record.until||world.week,active:record.until==null,changes:record.changes||changesSince(world,site,record.before)};
  }
  function validRecall(record,week){
    if(record==null)return true;
    const b=record.before,n=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
    const word=(v,len=512)=>typeof v==='string'&&v.length>0&&v.length<=len;
    return !!b&&n(b.week,1,week)&&word(b.place)&&word(b.home)&&n(b.cash,0,Number.MAX_SAFE_INTEGER)&&word(b.role,140)&&n(b.reliability,-6,6)&&
      Array.isArray(b.skills)&&b.skills.length===skillNames.length&&b.skills.every(v=>n(v,0,100))&&
      (record.until==null?record.changes==null:n(record.until,b.week,week)&&Array.isArray(record.changes)&&record.changes.length<=6&&record.changes.every(s=>word(s,1100)));
  }
  function change(site,id,scene,world){
    if(world?.communityLife){
      const previous=actorId(site),life=world.communityLife;
      if(previous==='steward'&&id!==previous)life.viewpointHistory={before:originalState(world,site)};
      else if(id==='steward'&&life.viewpointHistory?.until==null&&life.viewpointHistory){
        const record=life.viewpointHistory;
        record.changes=changesSince(world,site,record.before);record.until=world.week;
      }
    }
    const before=actor(site),state=ensure(site);
    if(before)releaseAt(site,before,scene);
    else state.stewardPosition={x:scene.x,y:scene.y};
    delete state.returningActor;
    if(porter(id)&&!savedPorter(site,id))(state.porters||=[]).push(id);
    state.actor=id;
    if(id!==founder.id&&scene.targetPose)state.actorAt={id,...position(site,scene.targetPose)};
    else delete state.actorAt;
    return {ok:true,message:'Playing as '+identity(site,id).name+'.'+(before?' '+before.name+' is choosing work again.':'')};
  }
  function depart(site,scene){
    const person=actor(site);
    // A shared shift or occupied vehicle stays paused at the same stop.
    if(!person||site.shift||scene?.siteId===site.id&&scene.mode!=='walk')return;
    const current=scene?.siteId===site.id&&scene.actor===person.id&&scene.mode==='walk'&&point(scene,site);
    if(streetActor(person.id)&&!current&&site.agency.actorAt){
      const positions=site.agency.localPositions||={};
      positions[person.id]=position(site,site.agency.actorAt);
    }else releaseAt(site,person,scene);
    site.agency.returningActor=person.id;site.agency.actor=founder.id;
    delete site.agency.actorAt;
  }
  function resume(site){
    if(!site.agency?.returningActor)return;
    const state=site.agency,id=state.returningActor;
    state.actor=id;delete state.returningActor;
    if(streetActor(id)&&state.localPositions?.[id])state.actorAt={id,...position(site,state.localPositions[id])};
  }
  function converse(site,world,targetId,topic,meeting){
    const week=world.week;
    const ridingTogether=site?.shift?.residentId===targetId && ['drive','boat'].includes(meeting?.mode) && meeting.companion===targetId;
    if(!site||!meeting||meeting.siteId!==site.id||meeting.actor!==actorId(site)||meeting.target!==targetId||
      (!ridingTogether&&meeting.mode!=='walk')||![meeting.x,meeting.y,meeting.tx,meeting.ty].every(Number.isFinite)||
      Math.hypot(meeting.x-meeting.tx,meeting.y-meeting.ty)>1.56)return reject('Stand beside this neighbour on foot to talk.');
    const target=identity(site,targetId),speaker=identity(site,actorId(site));
    if(!target||target.available===false||targetId===speaker.id)return reject('Find another person nearby.');
    const reception=root.EarthCommunityLife?.visitorReception?.(world,site,targetId);
    if(reception?.repels&&topic!=='visit-fit'){
      site.communityLife.visitorIncidents=Math.min(1000,(site.communityLife.visitorIncidents||0)+1);
      const visitor=world.communityLife?.profile,origin=visitor&&root.EarthTownCentre?.towns(world).find(s=>s.id===world.communityLife.homeId);
      if(site.centre&&origin&&origin!==site){
        const actor=root.EarthPersonas.profile(site,targetId),words=target.name+' shoved '+visitor.name+' during a conversation without a council mandate.';
        root.EarthBoundaryAssembly?.witness(world,site,origin,visitor,actor,false,'personal confrontation',words,-5);
      }
      return {ok:true,changed:true,repelled:true,message:target.name+' shoves you back and ends the exchange. Speak to '+root.EarthCommunityLife.hostFor(site).name+' in Towns for an introduction.'};
    }
    if(reception?.private&&['interests','dream','purpose','followup','shadow'].includes(topic))return {ok:false,message:target.name+' · '+reception.greeting};
    if(topic!=='meal'&&root.EarthDialogue){
      const answer=root.EarthDialogue.describe(site,world,target,speaker,topic,meeting);
      if(answer){
        if(answer.ok&&answer.changed&&topic==='listen')root.EarthAutonomy?.remember?.(site,week,speaker.id,target.id,'listen');
        return answer;
      }
    }
    const resident=site.residents.find(r=>r.id===targetId);
    const received=site.agency?.meals?.find(m=>m.to===targetId&&m.week===week);
    const prior=site.agency?.meals?.find(m=>m.to===speaker.id&&m.week===week);
    const prefix=target.name+' · ';
    let words;
    if(topic==='work'){
      const career=site.careers?.[targetId]&&root.EarthCareers?.view(world,site,targetId);
      const work=resident&&root.EarthConstruction?.workerRole(site,world,resident.id);
      if(career)words='I work as '+career.career.toLowerCase()+' at '+career.employer+'.'+
        (career.training?' I have '+career.training.credits+' course credits so far.':'')+
        (career.application?.phase==='notice'?' I am working my notice and preparing the handover.':'');
      else if(work)words='My work today is '+work.role.toLowerCase()+'. '+work.reason;
      else if(target.work)words=target.work;
      else if(targetId==='driver')words='I carry co-op orders round the district. At the exchange you can collect a parcel and deliver it to the resident named on it.';
      else words='I keep an eye on our stores and the choices coming up this week.';
    }else if(topic==='interests'){
      words=target.outsideWork||'I enjoy a quiet day catching up with the neighbours.';
    }else if(topic==='news'){
      if(received)words='I shared a meal with '+identity(site,received.from).name+' this week. It made time to catch up.';
      else if(prior&&prior.from===targetId)words='It was good to share that meal with you. How has the rest of your day been?';
      else if(target.promise)words='I am counting on the promise due in week '+target.promise.dueWeek+'. We can discuss it while we are here.';
      else if(site.careers?.[targetId]?.history?.length){
        const event=site.careers[targetId].history[0];
        words='The latest entry in my work record is from week '+event.week+'. It reads “'+event.text+'”';
      }else if(site.pursuits?.cart){
        const cart=site.pursuits.cart;
        const load=cart.fixture==='baskets'?'a pair of baskets':cart.fixture==='rack'?'a timber rack':'a flat bed';
        words=cart.builder+' built the handcart with '+load+'. You can find it in the district and change its fittings for your next job.';
      }
      else if(site.construction?.length)words='The crew is working on '+site.construction[0].name+'. You can walk to the site to see how the work is coming along.';
      else if(site.food<Math.ceil(site.population/5))words='The pantry is short for next week. A little work for food now would help our neighbours.';
      else words='There are '+site.food+' food in our shared stores. This week the '+site.population+' residents here need '+Math.ceil(site.population/5)+'.';
    }else if(topic==='meal'){
      if(received)return reject(target.name+' already shared a meal this week. You can still chat.');
      if(site.food<1)return reject('The pantry is empty. Gather some food, then meet again.');
      const state=ensure(site);
      site.food--;site.wellbeing=Math.min(100,site.wellbeing+1);
      if(resident)resident.bond=Math.min(10,resident.bond+1);
      state.meals=state.meals.filter(m=>m.week===week);
      state.meals.push({from:speaker.id,to:target.id,week});
      root.EarthAutonomy?.remember?.(site,week,speaker.id,target.id,'meal');
      return {ok:true,changed:true,message:speaker.name+' shared food with '+target.name+'. The pantry used 1 food. '+target.name+' will remember your visit this week.'};
    }else return reject('Choose a conversation topic.');
    return {ok:true,message:prefix+'“'+words+'”'};
  }
  function topics(site,world,id){
    return root.EarthDialogue?.topics(site,world,id)||[['news','How are things?'],['work','What are you working on?'],['interests','Outside work'],['meal','Share a meal · 1 food']].map(([id,label])=>({id,label}));
  }
  root.EarthAgency=Object.freeze({actor,actorId,canPlay,playables,founder,identity,valid,checkHandoff,change,originalAccounts,recall,validRecall,shadowPass,finishShadow,depart,resume,converse,topics});
})(typeof window==='undefined'?globalThis:window);
