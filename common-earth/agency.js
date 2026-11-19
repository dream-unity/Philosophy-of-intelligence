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
  const streetActor=id=>id==='driver'||walkers.includes(id);
  const canPlay=(site,id)=>id===founder.id||streetActor(id)||Boolean(site?.residents?.some(r=>r.id===id));
  const actorId=site=>canPlay(site,site?.agency?.actor)?site.agency.actor:founder.id;
  const actor=site=>{
    const id=actorId(site);return id===founder.id?null:site.residents.find(p=>p.id===id)||identity(site,id);
  };
  const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=-1&&p.x<=25&&p.y>=-1&&p.y<=25;
  function identity(site,id){
    if(!site)return null;
    const profile=root.EarthPersonas?.profile(site,id);
    const occupation=root.EarthCareers?.role(site,id);
    if(/^carrier-[0-8]-[0-8]$/.test(id)){
      const [,from,to]=id.split('-').map(Number);
      const link=root.CommonEarthSim?.productiveLinks(site).find(l=>l.from===from&&l.to===to);
      if(!link)return profile?{...profile,role:occupation||profile.originRole,available:root.EarthPersonas.retainsPorter(site,id)}:null;
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
  function playables(site){
    if(!site)return [];
    return [founder.id,...site.residents.map(p=>p.id),...walkers,'driver'].map(id=>identity(site,id));
  }
  function valid(site,week){
    const a=site.agency;
    if(root.EarthDialogue && !root.EarthDialogue.valid(site,week))return false;
    if(a==null)return site.introductions===undefined;
    if(typeof a!=='object'||Array.isArray(a)||!canPlay(site,a.actor))return false;
    if(a.returningActor!=null && (a.actor!==founder.id || a.returningActor===founder.id || !canPlay(site,a.returningActor)))return false;
    if(a.stewardPosition!=null&&!point(a.stewardPosition))return false;
    if(a.handoffSerial!=null&&(!Number.isSafeInteger(a.handoffSerial)||a.handoffSerial<1))return false;
    const stamped=p=>point(p)&&Number.isSafeInteger(p.serial)&&p.serial>=1&&p.serial<=a.handoffSerial;
    if(streetActor(a.actor)&&!a.actorAt)return false;
    if(a.actorAt!=null&&(!streetActor(a.actor)||a.actorAt.id!==a.actor||!stamped(a.actorAt)))return false;
    if(a.localPositions!=null&&(typeof a.localPositions!=='object'||Array.isArray(a.localPositions)||
      !Object.entries(a.localPositions).every(([id,p])=>streetActor(id)&&stamped(p))))return false;
    const knownRecipient=id=>id===founder.id||site.residents.some(p=>p.id===id)||id==='driver'||
      /^walker-[0-4]$/.test(id)||/^carrier-[0-8]-[0-8]$/.test(id);
    return Array.isArray(a.meals)&&a.meals.length<=90&&a.meals.every(m=>m&&typeof m.to==='string'&&knownRecipient(m.to)&&m.to!==m.from&&
      canPlay(site,m.from)&&Number.isSafeInteger(m.week)&&m.week>0&&m.week<=week);
  }
  function ensure(site){return site.agency||={actor:founder.id,meals:[]};}
  function checkHandoff(site,id,scene){
    if(!site||!scene||scene.siteId!==site.id||scene.actor!==actorId(site))return reject('The character changed. Choose again.');
    if(scene.mode!=='walk'||!point(scene))return reject('Come ashore or step out of the van before changing characters.');
    if(!canPlay(site,id))return reject('Choose someone from this community.');
    if(actorId(site)===id)return {ok:true,message:'Already playing as '+identity(site,id).name+'.',unchanged:true};
    if(streetActor(id)){
      const incoming=scene.targetPose;
      if(!incoming||incoming.id!==id||!point(incoming))return reject('The person’s position changed. Choose them again in Street view.');
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
    if(!scene||scene.siteId!==site.id||scene.actor!==person.id||scene.mode!=='walk'||!point(scene))return;
    if(streetActor(person.id)){
      const positions=ensure(site).localPositions||={};
      positions[person.id]=position(site,scene);return;
    }
    const x=Math.max(0,Math.min(24,scene.x)),y=Math.max(0,Math.min(24,scene.y));
    root.EarthConstruction?.releaseFromShift(site,{residentId:person.id},{residentId:person.id,x,y});
  }
  function change(site,id,scene){
    const before=actor(site),state=ensure(site);
    if(before)releaseAt(site,before,scene);
    else state.stewardPosition={x:scene.x,y:scene.y};
    delete state.returningActor;
    state.actor=id;
    if(streetActor(id))state.actorAt={id,...position(site,scene.targetPose)};
    else delete state.actorAt;
    return {ok:true,message:'Playing as '+identity(site,id).name+'.'+(before?' '+before.name+' is choosing work again.':'')};
  }
  function depart(site,scene){
    const person=actor(site);
    // A shared shift or occupied vehicle stays paused at the same stop.
    if(!person||site.shift||scene?.siteId===site.id&&scene.mode!=='walk')return;
    const current=scene?.siteId===site.id&&scene.actor===person.id&&scene.mode==='walk'&&point(scene);
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
    if(topic!=='meal'&&root.EarthDialogue){
      const answer=root.EarthDialogue.describe(site,world,target,speaker,topic,meeting);
      if(answer)return answer;
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
      return {ok:true,changed:true,message:speaker.name+' shared food with '+target.name+'. The pantry used 1 food. '+target.name+' will remember your visit this week.'};
    }else return reject('Choose a conversation topic.');
    return {ok:true,message:prefix+'“'+words+'”'};
  }
  function topics(site,world,id){
    return root.EarthDialogue?.topics(site,world,id)||[['news','How are things?'],['work','What are you working on?'],['interests','Outside work'],['meal','Share a meal · 1 food']].map(([id,label])=>({id,label}));
  }
  root.EarthAgency=Object.freeze({actor,actorId,canPlay,playables,founder,identity,valid,checkHandoff,change,depart,resume,converse,topics});
})(typeof window==='undefined'?globalThis:window);
