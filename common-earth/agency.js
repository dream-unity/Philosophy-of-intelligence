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
  const actor=site=>site?.residents?.find(r=>r.id===site.agency?.actor)||null;
  const actorId=site=>actor(site)?.id||founder.id;
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
  function valid(site,week){
    const a=site.agency;
    if(a==null)return true;
    if(typeof a!=='object'||Array.isArray(a)||!([founder.id,...site.residents.map(p=>p.id)].includes(a.actor)))return false;
    if(a.returningActor!=null && (a.actor!==founder.id || !site.residents.some(p=>p.id===a.returningActor)))return false;
    if(a.stewardPosition!=null&&!point(a.stewardPosition))return false;
    const knownRecipient=id=>id===founder.id||site.residents.some(p=>p.id===id)||id==='driver'||
      /^walker-[0-4]$/.test(id)||/^carrier-[0-8]-[0-8]$/.test(id);
    return Array.isArray(a.meals)&&a.meals.length<=90&&a.meals.every(m=>m&&typeof m.to==='string'&&knownRecipient(m.to)&&m.to!==m.from&&
      (m.from===founder.id||site.residents.some(p=>p.id===m.from))&&Number.isSafeInteger(m.week)&&m.week>0&&m.week<=week);
  }
  function ensure(site){return site.agency||={actor:founder.id,meals:[]};}
  function checkHandoff(site,id,scene){
    if(!site||!scene||scene.siteId!==site.id||scene.actor!==actorId(site))return reject('The character changed. Choose again.');
    if(scene.mode!=='walk'||!point(scene))return reject('Come ashore or step out of the van before changing characters.');
    if(id!==founder.id&&!site.residents.some(r=>r.id===id))return reject('Choose someone from this community.');
    if(actorId(site)===id)return {ok:true,message:'Already playing as '+identity(site,id).name+'.',unchanged:true};
    return {ok:true};
  }
  function releaseAt(site,person,scene){
    if(!scene||scene.siteId!==site.id||scene.actor!==person.id||scene.mode!=='walk'||!point(scene))return;
    const x=Math.max(0,Math.min(24,scene.x)),y=Math.max(0,Math.min(24,scene.y));
    root.EarthConstruction?.releaseFromShift(site,{residentId:person.id},{residentId:person.id,x,y});
  }
  function change(site,id,scene){
    const before=actor(site),state=ensure(site);
    if(before)releaseAt(site,before,scene);
    else state.stewardPosition={x:scene.x,y:scene.y};
    delete state.returningActor;
    state.actor=id;
    return {ok:true,message:'Playing as '+identity(site,id).name+'.'+(before?' '+before.name+' is choosing work again.':'')};
  }
  function depart(site,scene){
    const person=actor(site);
    // A shared shift or occupied vehicle stays paused at the same stop.
    if(!person||site.shift||scene?.siteId===site.id&&scene.mode!=='walk')return;
    releaseAt(site,person,scene);
    site.agency.returningActor=person.id;site.agency.actor=founder.id;
  }
  function resume(site){
    if(!site.agency?.returningActor)return;
    site.agency.actor=site.agency.returningActor;delete site.agency.returningActor;
  }
  function converse(site,world,targetId,topic,meeting){
    const week=world.week;
    const ridingTogether=site?.shift?.residentId===targetId && ['drive','boat'].includes(meeting?.mode) && meeting.companion===targetId;
    if(!site||!meeting||meeting.siteId!==site.id||meeting.actor!==actorId(site)||meeting.target!==targetId||
      (!ridingTogether&&meeting.mode!=='walk')||![meeting.x,meeting.y,meeting.tx,meeting.ty].every(Number.isFinite)||
      Math.hypot(meeting.x-meeting.tx,meeting.y-meeting.ty)>1.56)return reject('Stand beside this neighbour on foot to talk.');
    const target=identity(site,targetId),speaker=identity(site,actorId(site));
    if(!target||target.available===false||targetId===speaker.id)return reject('Find another person nearby.');
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
  root.EarthAgency=Object.freeze({actor,actorId,founder,identity,valid,checkHandoff,change,depart,resume,converse});
})(typeof window==='undefined'?globalThis:window);
