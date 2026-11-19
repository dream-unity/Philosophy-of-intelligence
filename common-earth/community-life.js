/* People carry their identities between districts. Membership, physical presence and
 * the character currently being experienced are deliberately stored separately. */
(function(root){
  'use strict';
  const walkIds=['walker-0','walker-1','walker-2','walker-3','walker-4'];
  const land=[
    {name:'Orchard Walk',district:'gardens',hosts:['Wren','Luca','Mae'],axis:'care',second:'stamina',need:'keeping the food rota',goods:'food',life:'quiet gardens and neighbours who share a meal',purpose:'a lunch rota for gardeners'},
    {name:'Foundry Lane',district:'works',hosts:['Ezra','Mara','Ivo'],axis:'craft',second:'numeracy',need:'repairing tools and keeping their measurements',goods:'materials',life:'shared workbenches and apprenticeships',purpose:'an open repair bench'}
  ];
  const water=[
    {...land[0],name:'Lantern Landing',district:'landing',life:'shared meals on sheltered pontoons',purpose:'a kitchen rota between boats'},
    {...land[1],name:'Slipway Circle',district:'slipway',life:'boat repairs and cooperative rigging crews',purpose:'a teaching berth'}
  ];
  // These work requests are drawn from the same habitat as the local stores.
  // Existing districts keep their saved names as their economy develops.
  const livelihoods={
    dry:[
      {name:'Cistern Walk',need:'sharing pulse harvests and counting the kitchen water',life:'early shifts, a quiet afternoon and neighbours who share a cistern'},
      {name:'Clay Court',need:'preparing earthen blocks and repairing shade frames',life:'a shaded builders’ yard where crews measure each course together'}
    ],
    cold:[
      {name:'Growing House',need:'tending sheltered mushroom racks and scheduling incoming staples',life:'warm indoor growing shifts and neighbours who plan the winter stores'},
      {name:'Stone Shelter',need:'fitting stone shelters and reusing boards from the depot',life:'an indoor repair rota and shared work before winter closes the roads'}
    ],
    woodland:[
      {name:'Berry Walk',need:'sorting berries and roots before the store closes',life:'woodland foraging rounds and a kitchen that preserves the summer crop'},
      {name:'Coppice Yard',need:'seasoning coppice timber and keeping the frame measurements',life:'a patient apprenticeship among timber crews'}
    ],
    coast:[
      {name:'Shore Allotments',need:'collecting shore greens and dividing the root harvest',life:'allotment work timed around the shore and the evening kitchen'},
      {name:'Reed Quay',need:'weaving load baskets and repairing the shore exchange',life:'cooperative work between the reed beds and the exchange'}
    ],
    lake:[
      {name:'Reed Landing',need:'organising staple deliveries and the floating kitchen rota',life:'quiet freshwater berths and household meals on the landing'},
      {name:'Pontoon Yard',need:'binding freshwater reed and repairing the pontoons',life:'a repair crew that keeps the berths open between supply boats'}
    ],
    lakeside:[
      {name:'Lakeside Beds',need:'tending lakeside plots and sharing the freshwater catch',life:'shore gardens and household meals beside the freshwater landing'},
      {name:'Landing Workshop',need:'keeping the landing open for basket, timber and food deliveries',life:'a workshop shared by the growers, carriers and boat crews'}
    ],
    ocean:[
      {name:'Lantern Landing',need:'scheduling the kelp harvest and sharing meals between boats',life:'shared pontoon meals and seaweed work around the tides'},
      {name:'Slipway Circle',need:'repairing rigging and salvaging sound boards for the fleet',life:'boat repairs and cooperative rigging crews'}
    ]
  };
  function livelihood(d,habitat){
    const supplied=livelihoods[habitat]?.[d.goods==='food'?0:1];
    return supplied?{...d,...supplied}:d;
  }
  const int=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
  const word=v=>typeof v==='string'&&v.length>0&&v.length<=500;
  const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
  const cap=(v,lo=0,hi=100)=>Math.max(lo,Math.min(hi,v));
  const copy=v=>JSON.parse(JSON.stringify(v));
  const linkId=(a,b)=>'carrier-'+a+'-'+b;
  const guestSlots=[];
  for(let a=0;a<9;a++)for(let b=0;b<9;b++)if(Math.abs(a%3-b%3)+Math.abs(Math.floor(a/3)-Math.floor(b/3))===1)guestSlots.push(linkId(a,b));
  const local=site=>site.communityLife||=( {people:{},away:{},visits:{},log:[]} );
  const stores=world=>[...world.sites,...(world.communityLife?.outposts||[])];
  const lookup=(world,id)=>world.sites.find(s=>s.id===id)||world.communityLife?.outposts.find(s=>s.id===id);
  function present(site,id){return !site?.communityLife?.away?.[id];}
  function residency(site,id){const g=site?.communityLife?.people?.[id];
    return !present(site,id)?'away':g?.status==='visitor'||g?.status==='anchor'&&g.residence==='visitor'?'visitor':'member';}
  function profile(site,id){return site?.communityLife?.people?.[id]?.profile||null;}
  function personLabel(site,id,name){
    const g=site?.communityLife?.people?.[id],p=g?.profile;
    name=name||p?.name||root.EarthPersonas?.profile?.(site,id)?.name||id;
    if(!g||g.status==='anchor'||g.originId===site.id)return name;
    const from=g.originName||p?.birthCommunityName;
    return from?name+' · '+from:name;
  }
  function isHome(world,site){return Boolean(site&&site.id===(world.communityLife?.homeId||world.sites[0]?.id));}
  function anchor(world){
    const a=world.communityLife,first=world.sites[0];
    if(!first)return null;
    const birth=a?.profile||root.EarthPersonas?.profile(first,'steward');
    const dutySite=lookup(world,a?.duty.siteId||a?.homeId||first.id),coverName=a?.duty.coveredBy&&root.EarthPersonas?.profile?.(dutySite,a.duty.coveredBy)?.name;
    return {id:'steward',originId:a?.originId||first.id,homeId:a?.homeId||first.id,name:birth?.name||'Community steward',
      dutySiteId:dutySite?.id,dutyPlace:dutySite?.name,coverName:coverName||null,due:a?.duty.due||first.founded+3,reliability:a?.duty.reliability??0,coveredBy:a?.duty.coveredBy||null,attended:a?.duty.attended||false};
  }
  const house=site=>root.EarthCityModel?.housingCapacity(site)??18;
  const meals=site=>Math.max(1,Math.ceil((site.population+1)/5));
  function room(site){return house(site)-site.population;}
  function kind(site){
    const id=site.communityLife?.district;
    const saved=[...land,...water].find(d=>d.district===id);
    if(saved)return livelihood(saved,site.communityLife?.habitat);
    return {axis:site.specialty==='materials'?'craft':site.specialty==='funds'?'organisation':'care',
      second:'communication',need:site.specialty==='materials'?'repairing shared equipment':site.specialty==='funds'?'coordinating the exchange':'feeding households',
      life:'neighbours who look after the shared stores',goods:site.specialty,purpose:'a reliable neighbourhood rota'};
  }
  function pointNear(site,index){
    const north=index?-3.4:2.1,east=index?4.9:-2.9,lat=cap(site.lat+north/111,-89.9,89.9);
    return {lat,lon:((site.lon+east/(111*Math.max(.08,Math.cos(lat*Math.PI/180)))+540)%360)-180,water:site.water,coastal:site.coastal};
  }
  function km(a,b){
    const r=Math.PI/180,d=Math.sin((a.lat-b.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((a.lon-b.lon)*r/2)**2;
    return 12742*Math.asin(Math.sqrt(cap(d,0,1)));
  }
  function writeLog(site,week,text){
    const l=local(site).log;l.unshift({week,text:text.slice(0,500)});if(l.length>9)l.pop();return text;
  }
  const seededRoles=['practice-nurse','surveyor'];
  function seedHouseholds(site,nativeCount,week){
    const c=local(site);
    c.foundingHouseholds=nativeCount;
    // Three elected residents are already registered. Open only the remaining
    // native positions before admitting any travellers or the original player.
    const slots=['driver',...walkIds],available=Math.max(0,nativeCount-site.residents.length);
    for(const [i,id] of slots.entries())if(i>=available)c.away[id]='outside-roster';
    const additional=Math.min(seededRoles.length,Math.max(0,available-slots.length));let complete=0;
    for(let i=0;i<additional;i++){
      const role=seededRoles[i];
      if(Object.values(c.people).some(g=>g.householdRole===role)){complete++;continue;}
      const occupied=new Set([...(root.EarthPersonas?.porterIds?.(site)||[]),...Object.keys(c.people)]);
      const id=[...guestSlots].reverse().find(key=>!occupied.has(key));
      const person=id&&root.EarthPersonas?.householdProfile?.(site,id,role);if(!person)continue;
      c.people[id]={profile:{...copy(person),birthCommunityName:site.name},status:'member',householdRole:role,originId:site.id,originSlot:id,originName:site.name,since:week};
      const agency=site.agency||={actor:'steward',meals:[]};
      (agency.porters||=[]).push(id);complete++;
    }
    c.foundingRosterReady=complete===additional;
  }
  function commuting(site,id){
    return guestSlots.includes(id)&&!site.communityLife?.people?.[id];
  }
  function census(world,site){
    if(!site)return null;
    const c=site.communityLife||{},a=world.communityLife;
    const members=new Set([...site.residents.map(p=>p.id),...walkIds,'driver',...Object.entries(c.people||{}).filter(([,g])=>g.status==='member').map(([id])=>id)]);
    let here=0,away=0;
    if((a?.homeId||world.sites[0]?.id)===site.id){members.add('steward');}
    for(const id of members){
      if(id==='steward'){
        if(world.activeId===site.id)here++;else away++;
        continue;
      }
      const dest=c.away?.[id],g=c.people?.[id];
      if(!dest){if(!g||g.status==='member')here++;continue;}
      if(dest==='outside-roster'||dest==='elsewhere')continue;
      const peer=lookup(world,dest);
      if(Object.values(peer?.communityLife?.people||{}).some(v=>v.status==='visitor'&&v.visitFrom===site.id&&v.visitSlot===id))away++;
    }
    const visitors=Object.entries(c.people||{}).filter(([id,g])=>present(site,id)&&(g.status==='visitor'||g.status==='anchor'&&g.residence==='visitor')).length;
    const commuters=(root.EarthPersonas?.porterIds?.(site)||[]).filter(id=>commuting(site,id)&&present(site,id)).length;
    const represented=here+away,anonymous=Math.max(0,site.population-represented);
    const clauses=[site.population+' residents on the household roll',here+' named residents here'];
    if(away)clauses.push(away+' resident'+(away===1?'':'s')+' away on a visit');
    if(anonymous)clauses.push(anonymous+' other household member'+(anonymous===1?'':'s')+(c.foundingHouseholds==null?' in the earlier census':' awaiting a street record'));
    if(represented>site.population)clauses.push('the earlier household count predates this street roster');
    if(visitors)clauses.push(visitors+' visiting');
    if(commuters)clauses.push(commuters+' regional shift worker'+(commuters===1?'':'s'));
    return {total:site.population,here,away,represented,anonymous,visitors,commuters,active:here+visitors+commuters,summary:clauses.join(' · ')};
  }
  function makeRegion(world,base,makeSite){
    const state=local(base);
    if(state.cluster)return;
    state.cluster=base.id;
    const catalogue=base.water?water:land,habitat=root.EarthResources?.environment?.(base);
    catalogue.forEach((template,i)=>{
      const d=livelihood(template,habitat);
      let name=d.name,id='near-'+base.id+'-'+i;
      if(stores(world).some(s=>s.name===name))name=base.name+' '+name;
      if(stores(world).some(s=>s.id===id))return;
      const point=pointNear(base,i);
      const other=makeSite({id,name,region:base.region,point,water:base.water,names:d.hosts,old:null,offer:{newPopulation:10+i}});
      other.specialty=d.goods;other.founded=world.week;seedHouseholds(other,other.population,world.week);
      other.food=14-i;other.materials=9+i;other.trust=58+i*5;other.wellbeing=61-i;
      Object.assign(local(other),{cluster:base.id,district:d.district,habitat:habitat||'mixed'});local(other).away.steward='elsewhere';
      world.communityLife.outposts.push(other);
    });
  }
  function keepLegacySteward(site,week){
    // Older editions generated a different steward per settlement. Keep advanced
    // local careers, savings and social memories with the actual local person.
    const oldCareer=site.careers?.steward,oldLife=site.autonomy?.people?.steward,oldPurse=site.purses?.people?.steward;
    const oldProject=site.autonomy?.projects?.owners?.steward;
    if(!oldCareer&&!oldLife&&!oldPurse&&!oldProject)return;
    const original=(root.EarthPersonas?.birthProfile||root.EarthPersonas?.profile)?.(site,'steward');
    if(!original)return;
    const id=guestSlot(site,copy(original),site.id,'legacy-steward','member',week);
    if(!id){
      // No free physical slot in this old town. Keep its earned work branches
      // available in the local archive; the incoming player gets their own record.
      local(site).previousSteward={profile:copy(original),career:oldCareer||null,life:oldLife||null};
      if(oldCareer)delete site.careers.steward;
      if(oldLife)delete site.autonomy.people.steward;
      return;
    }
    for(const book of [site.careers,site.autonomy?.people,site.autonomy?.projects?.owners,site.purses?.people,site.purses?.tickets]){
      if(book?.steward){book[id]=book.steward;delete book.steward;}
    }
    function revise(rows,fields){
      for(const row of rows||[])for(const key of fields)if(row?.[key]==='steward')row[key]=id;
    }
    revise(site.agency?.meals,['from','to']);revise(site.agency?.visits,['from','to']);
    revise(site.introductions?.rows,['actorId','guideId','contactId']);
    for(const a of Object.values(site.careers||{})){revise([a.application,a.departure],['coverId']);}
    for(const r of Object.values(site.autonomy?.people||{})){revise(r.history,['target']);revise([r.received],['ownerId']);}
    for(const r of Object.values(site.autonomy?.projects?.owners||{})){revise([r],['partnerId','beneficiaryId','carriedBy']);revise([r.volunteer],['from']);}
    revise(site.autonomy?.projects?.completed,['ownerId','partnerId','beneficiaryId','carriedBy']);
  }
  function initialise(world,makeSite,freshHome=false){
    if(!world.sites.length)return;
    if(!world.communityLife){
      const first=world.sites[0],actual=world.sites.find(s=>s.id===world.activeId)||first;
      const raw=root.EarthPersonas?.profile(first,'steward');
      if(!raw)return;
      world.communityLife={originId:first.id,originName:first.name,homeId:first.id,profile:copy(raw),outposts:[],
        duty:{due:world.week+3,reliability:0,attended:false,coveredBy:null},journey:null};
      for(const s of world.sites){
        const h=local(s);
        if(s!==first)keepLegacySteward(s,world.week);
        if(s.id===actual.id){
          h.people.steward={profile:copy(raw),status:'anchor',residence:s===first?'member':'visitor'};
          if(s!==first&&s.agency){s.agency.actor='steward';delete s.agency.actorAt;delete s.agency.returningActor;}
        }else h.away.steward='elsewhere';
      }
    }
    const a=world.communityLife;
    a.duty.siteId||=a.homeId;
    if(!a.profile.identityKey&&root.EarthPersonas?.identityKey)a.profile.identityKey=root.EarthPersonas.identityKey(a.originId,'steward');
    for(const district of stores(world))for(const g of Object.values(district.communityLife?.people||{})){
      if(g.status==='anchor'){
        g.profile.identityKey||=a.profile.identityKey;g.profile.birthCommunityName||=a.originName;continue;
      }
      if(!g.originId)continue;
      if(!g.profile.identityKey&&root.EarthPersonas?.identityKey)g.profile.identityKey=root.EarthPersonas.identityKey(g.originId,g.originSlot);
      g.originName||=lookup(world,g.originId)?.name||g.profile.birthCommunityName;
      g.profile.birthCommunityName||=g.originName;
    }
    for(const district of stores(world))if(district.communityLife?.district&&!district.communityLife.habitat){
      district.communityLife.habitat=root.EarthResources?.environment?.(district)||'mixed';
    }
    const home=lookup(world,a.homeId);
    for(const district of stores(world)){
      const h=district.communityLife;
      if(h?.foundingHouseholds!=null&&!h.foundingRosterReady)seedHouseholds(district,h.foundingHouseholds,district.founded);
    }
    if(freshHome&&home)seedHouseholds(home,home.population-1,world.week);
    if(home&&makeSite)makeRegion(world,home,makeSite);
    const here=world.sites.find(s=>s.id===world.activeId);
    if(here&&here!==home&&makeSite)makeRegion(world,here,makeSite);
  }
  function delegates(site){
    const founders=site.residents.filter(p=>residency(site,p.id)==='member').sort((a,b)=>b.slot-a.slot);
    const trained=(site.communityLife?.deputies||[]).filter(d=>present(site,d.id)&&residency(site,d.id)==='member');
    return [...founders,...trained];
  }
  const hostFor=site=>delegates(site)[0];
  const wasDelegate=(site,id)=>Boolean(site&&(site.residents.some(p=>p.id===id)||site.communityLife?.deputies?.some(p=>p.id===id)));
  function prepareDeputy(world,site,notify){
    const c=site.communityLife;
    if(!c?.cluster||delegates(site).length>=3&&!c.deputyTraining)return;
    const training=c.deputyTraining;
    if(training){
      if(world.week<training.ready)return;
      delete c.deputyTraining;
      if(!present(site,training.id)||residency(site,training.id)!=='member')return;
      (c.deputies||=[]).push({id:training.id,name:training.name,week:world.week});
      notify(site,writeLog(site,world.week,training.name+' completed two weeks of admission handovers. The district has another local member who can receive applications.'));
      return;
    }
    const home=site.residents.filter(p=>residency(site,p.id)==='member');if(home.length===3)return;
    const person=(root.EarthPersonas?.list?.(site)||[]).filter(p=>p.id!=='steward'&&!wasDelegate(site,p.id)&&present(site,p.id)&&
      residency(site,p.id)==='member'&&p.aptitudes.communication>=42&&!c.excursions?.[p.id]&&!site.purses?.tickets?.[p.id]&&
      !c.foundingPlan?.members?.includes(p.id)&&p.traits.sociability+p.traits.patience>=80)
      .sort((a,b)=>b.aptitudes.communication-a.aptitudes.communication||a.id.localeCompare(b.id))[0];
    if(!person)return;
    c.deputyTraining={id:person.id,name:person.name,ready:world.week+2};
    notify(site,writeLog(site,world.week,person.name+' volunteered to learn the admissions rota beside '+hostFor(site).name+'. The handover takes two weeks.'));
  }
  function neighbours(world,site){
    if(!site)return [];
    return stores(world).filter(s=>s.id!==site.id&&(km(s,site)<=70||s.id===world.communityLife?.homeId||s.id===world.communityLife?.duty.siteId||s.id===world.communityLife?.parcel?.to||s.id===world.communityLife?.parcel?.from)).map(s=>({
      id:s.id,name:s.name,distance:km(s,site),home:isHome(world,s),host:hostFor(s).name,need:kind(s).need,
      lifestyle:kind(s).life,rooms:Math.max(0,room(s)),water:s.water
    })).sort((a,b)=>a.distance-b.distance||a.name.localeCompare(b.name));
  }
  function links(site,id,week=site.autonomy?.week||site.founded||1){
    const result=new Set((root.EarthAutonomy?.contacts?.(site,id,week)||[]).filter(tie=>tie.here&&tie.strength>=2).map(tie=>tie.id));
    for(const row of site.agency?.visits||[])if(row.from===id||row.to===id)result.add(row.from===id?row.to:row.from);
    for(const row of site.agency?.meals||[])if(row.from===id||row.to===id)result.add(row.from===id?row.to:row.from);
    for(const row of site.introductions?.rows||[])if(row.actorId===id){result.add(row.guideId);result.add(row.contactId);}
    return [...result].filter(key=>key&&key!==id&&present(site,key));
  }
  function portable(site,id){
    const actor=root.EarthPersonas?.profile(site,id);
    if(!actor)return null;
    const work=root.EarthCareers?.work?.(site,id);
    return {...copy(actor),birthCommunityName:actor.birthCommunityName||site.name,role:work?.label||actor.role||actor.originRole,lastEmployer:work?.employer||actor.lastEmployer||null,
      demonstratedSkills:{...actor.aptitudes,...actor.demonstratedSkills,...site.careers?.[id]?.skills},
      qualificationIds:[...new Set([...(actor.qualificationIds||[]),...Object.keys(site.careers?.[id]?.qualifications||{}),...(work?[work.id]:[])])]};
  }
  function fit(site,person,known=false){
    const policy=kind(site),a=person.demonstratedSkills||person.aptitudes||{},t=person.traits||{};
    const skill=Math.max(a[policy.axis]||0,(a[policy.second]||0)-4);
    const earned=new Set(person.qualificationIds||[]);
    const vacancy=site.employers&&(root.EarthCareers?.catalog||[]).filter(job=>site.employers[job.id]?.open?.length&&
      (earned.has(job.id)||person.originRole?.toLowerCase()===job.label.toLowerCase())&&
      a[job.skill]>=job.requiredSkill&&a[job.secondary]>=job.secondMinimum)
      .sort((x,y)=>site.employers[x.id].open[0].opened-site.employers[y.id].open[0].opened)[0];
    const employer=vacancy?{name:vacancy.employer,role:vacancy.label,former:site.employers[vacancy.id].open[0].name}:null;
    const need=employer?'covering the '+employer.role.toLowerCase()+' vacancy left by '+employer.former:policy.need;
    const appeal=(skill>=53?2:skill>=38?1:0)+(site.trust>=50?1:0)+(site.wellbeing>=50?1:0)+
      Number(known)+Number((policy.axis==='care'?t.patience:t.curiosity)>=58)+Number(Boolean(vacancy));
    return {skill,appeal,match:skill>=38||Boolean(vacancy),likes:appeal>=4,policy,need,employer};
  }
  function journeyBlock(site){
    if(site.shift)return 'Finish the shared day before travelling.';
    if(site.handline)return 'Reel in or put away the line before travelling.';
    if(site.purses?.tickets?.steward)return 'Finish or cancel the paid stock check before leaving the district.';
    if(site.fleet?.custody?.actor==='steward')return 'Return the co-op vehicle before setting off.';
    return '';
  }
  function reception(world,site){
    const a=world.communityLife,v=site.communityLife?.visits?.steward||{},host=hostFor(site),f=fit(site,portable(lookup(world,a.homeId),'steward')||a.profile,Boolean(v.met));
    const checks=[
      {label:'Named sponsor',pass:Boolean(v.met),detail:v.met?(v.hostName||host.name)+' recorded your introduction.'+(v.hostId&&v.hostId!==host.id?' '+host.name+' receives the application after the handover.':''):'Meet '+host.name+' on the street.'},
      {label:'Useful contribution',pass:Boolean(v.help),detail:v.help?'Your trial shift is in the roster.':'Take a trial shift '+f.need+'.'},
      {label:'Time to decide',pass:Boolean(v.met&&world.week>v.met),detail:v.met?'The council can decide from week '+(v.met+1)+'.':'Members consider applications the week after an introduction.'},
      {label:'Housing and meals',pass:room(site)>=1&&site.food>=meals(site),detail:Math.max(0,room(site))+' places free. '+site.food+' food held, '+meals(site)+' needed for the enlarged household.'},
      {label:'Community agreement',pass:site.trust>=35,detail:site.trust>=35?'The council is hearing applications.':'Members have paused new admissions while resolving local disputes.'}
    ];
    if(!f.match)checks.push({label:'Skill and training fit',pass:(v.shifts||0)>=2,detail:'Your experience is outside the vacancy. A second supervised trial lets the host judge the fit.'});
    return {checks,available:checks.every(c=>c.pass),host:host.name,hostId:host.id,hostType:site.residents.some(p=>p.id===host.id)?'resident':'npc',apprentice:!f.match,employer:f.employer};
  }
  function awaySlot(site,id,dest){
    local(site).away[id]=dest;
    if(site.agency?.returningActor===id)delete site.agency.returningActor;
    if(site.agency?.actor===id){site.agency.actor='steward';delete site.agency.actorAt;}
  }
  function guestSlot(site,person,originId,originSlot,status,week){
    const c=local(site);
    const old=Object.entries(c.people).find(([,v])=>v.originId===originId&&v.originSlot===originSlot);
    const used=new Set([...(root.EarthPersonas?.porterIds(site)||[]),...(site.agency?.porters||[]),...Object.keys(c.people)]);
    const returning=originId===site.id&&(walkIds.includes(originSlot)||originSlot==='driver'||site.residents.some(p=>p.id===originSlot)||guestSlots.includes(originSlot));
    const id=returning?originSlot:old?.[0]||guestSlots.find(key=>!used.has(key));
    if(!id)return null;
    delete c.away[id];
    c.people[id]={profile:{...person,id},status,originId,originSlot,originName:person.birthCommunityName||null,since:week};
    const agency=site.agency||={actor:'steward',meals:[]};
    if(guestSlots.includes(id)&&!(agency.porters||=[]).includes(id))agency.porters.push(id);
    return id;
  }
  function departureReason(site,id,world){
    const now=world?.week||site.autonomy?.week||site.founded||1, resident=site.residents.find(p=>p.id===id);
    const name=key=>root.EarthPersonas?.profile?.(site,key)?.name||'a neighbour';
    const here=local(site),career=site.careers?.[id],fleet=site.fleet;
    if((world?.communityLife?.duty.siteId||world?.communityLife?.homeId)===site.id&&world.communityLife.duty.coveredBy===id)
      return 'Agreed to cover the home pantry round through week '+world.communityLife.duty.due+'.';
    if(here.deputyTraining?.id===id)return 'Learning the admissions rota beside '+hostFor(site).name+' until week '+here.deputyTraining.ready+'.';
    if(wasDelegate(site,id)&&delegates(site).length<=2)
      return 'The district needs its two admission witnesses. A trained local can take over the rota.';
    if(resident?.promise)return 'Waiting for the supplies promised by '+name(resident.promise.by||'steward')+' in week '+resident.promise.dueWeek+'.';
    if(site.shift?.residentId===id)return 'Committed to finish the shared workday.';
    if(site.delivery?.residentId===id)return 'Expecting the community parcel before leaving the district.';
    if(world?.legacy?.term?.siteId===site.id&&world.legacy.term.residentId===id)return 'Serving the community’s current council term.';
    if(resident){
      const assignment=site.workforce?.members?.[id]?.preferredJobId||(site.construction?.length&&root.EarthConstruction?.workerRole?.(site,world,id)?.jobId);
      if(assignment)return 'Assigned to '+(site.construction?.find(job=>job.id===assignment)?.name||'the current construction crew')+' until the handover.';
      const duty=root.EarthConstruction?.assignedDuty?.(site,world,id);if(duty)return duty;
    }
    if(fleet?.custody?.actor===id)return 'The transport cooperative is waiting for its vehicle to return.';
    if(fleet?.incident?.actor===id)return 'Owes a restitution shift to the displaced transport crew.';
    if(id==='driver'&&fleet?.custody)return 'Holding the dispatch handover until the truck returns.';
    if(fleet?.roster?.[id]?.ready>now)return 'Completing transport induction through week '+fleet.roster[id].ready+'.';
    const council=site.civicInitiatives?.active;
    if(council&&(council.leadId===id||council.votes?.some(v=>v.personId===id)))
      return 'Taking part in the council decision about '+(council.title||'the current proposal')+'.';
    const errand=(site.agency?.arrangements?.rows||[]).find(r=>['asked','agreed'].includes(r.status)&&
      (r.dueWeek>=now||r.workWeek===now)&&[r.actorId,r.requesterId,r.contactId].includes(id));
    if(errand)return 'Meeting '+name(errand.actorId===id?errand.requesterId:errand.actorId)+' for an errand due in week '+errand.dueWeek+'.';
    const creditor=site.residents.find(p=>p.promise?.by===id);
    if(creditor)return 'Promised '+creditor.name+' supplies by week '+creditor.promise.dueWeek+'.';
    const projects=site.autonomy?.projects?.owners||{},partner=Object.entries(projects).find(([other,p])=>p.volunteer&&(other===id||p.volunteer.from===id));
    if(partner)return 'Agreed to a project session with '+name(partner[0]===id?partner[1].volunteer.from:partner[0])+'.';
    if(id===site.agency?.actor)return 'You are experiencing this person’s day. Return to your original character to discuss travel.';
    if(site.purses?.tickets?.[id])return 'Has a paid stock check to settle at the local exchange.';
    if(career?.application)return 'Waiting for the local employer to review the application in week '+career.application.dueWeek+'.';
    if(career?.departure)return 'Serving the notice period at the current employer.';
    if(career?.specialistRelief?.week>=now)return 'Covering a specialist shift in week '+career.specialistRelief.week+'.';
    const colleague=Object.entries(site.careers||{}).find(([,c])=>c.application?.coverId===id||c.departure?.coverId===id);
    if(colleague)return 'Providing handover cover for '+name(colleague[0])+'.';
    if(site.autonomy?.people?.[id]?.received?.week===now)return 'Completing this week’s handoff with a neighbour.';
    return '';
  }
  function transferable(site,id,world){return !departureReason(site,id,world);}
  function candidates(site,world){
    const ids=[...walkIds,'driver',...site.residents.map(p=>p.id),...(root.EarthPersonas?.porterIds?.(site)||[]),...Object.keys(site.communityLife?.people||{})];
    return [...new Set(ids)].filter(id=>id!=='steward'&&present(site,id)&&residency(site,id)==='member'&&transferable(site,id,world));
  }
  function transferDevelopment(world,from,to,id,nextId){
    root.EarthPurses?.moveBalance?.(world,from,to,id,nextId);
    if(from.fleet?.roster)delete from.fleet.roster[id];
    const c=from.careers?.[id];
    if(c){
      // A new employer must assess a new application. Qualifications and learned skills travel.
      const moved=copy(c);for(const key of ['jobId','joinedWeek','application','departure','specialistRelief','relief','agreedPlan'])delete moved[key];
      if(moved.training)moved.training.paused=true;
      moved.revision++;moved.history.unshift({week:world.week,text:'Moved from '+from.name+'. Qualifications and practice came along. Local employers assess their own vacancies.'});moved.history.length=Math.min(moved.history.length,8);
      (to.careers||={})[nextId]=moved;delete from.careers[id];
    }
    const life=from.autonomy?.people?.[id];
    if(life){
      const moved=copy(life);
      delete moved.received;delete moved.advice;
      moved.history=moved.history.filter(h=>!h.target&&!h.civic&&!h.projectId&&!h.laneId);
      const book=to.autonomy||={week:world.week,people:{},effects:{}};
      book.week=Math.max(book.week,world.week);book.people[nextId]=moved;delete from.autonomy.people[id];
    }
  }
  function movePerson(world,from,to,id,existing){
    const profile=portable(from,id),old=from.communityLife?.people?.[id],livedHere=!commuting(from,id);
    if(!profile||from.population<=1)return null;
    const nextId=existing||guestSlot(to,profile,old?.originId||from.id,old?.originSlot||id,'member',world.week);
    if(!nextId)return null;
    const record=local(to).people[nextId];
    if(record){record.status='member';record.since=world.week;delete record.visitFrom;delete record.visitSlot;delete record.inspects;}
    delete local(to).away[nextId];awaySlot(from,id,to.id);
    const good=workGood(root.EarthCareers?.work(from,id)?.occupation||profile.originRole);
    root.EarthCareers?.departureForMove?.(world,from,id);
    const vacancies=local(from).vacancies||=[];
    vacancies.push({name:profile.name,good,through:world.week+2});
    transferDevelopment(world,from,to,id,nextId);if(livedHere)from.population--;to.population++;
    return {id:nextId,name:profile.name,role:root.EarthCareers?.role(to,nextId)||profile.originRole};
  }
  function tiesSummary(site,id){
    const keys=links(site,id),names=keys.slice(0,2).map(k=>root.EarthPersonas?.profile(site,k)?.name).filter(Boolean);
    return names.join(' and ');
  }
  function volunteers(site,world){
    if(!site)return [];
    const available=candidates(site,world).map(id=>({id,p:portable(site,id),ties:links(site,id).length})).filter(v=>v.p);
    // A supplies specialist and a repair/organisation specialist must *both* agree.
    const voters=delegates(site),voterIds=new Set(voters.map(p=>p.id));
    const pick=(axis,first)=>available.filter(v=>v.id!==first?.id&&voters.length-Number(voterIds.has(v.id))-Number(Boolean(first&&voterIds.has(first.id)))>=2).map(v=>({...v,skill:Math.max(v.p.demonstratedSkills[axis],v.p.demonstratedSkills[axis==='care'?'stamina':'organisation']-5)}))
      .filter(v=>v.skill>=40&&v.p.traits.initiative+v.p.traits.adaptability-v.ties*10>=65)
      .sort((a,b)=>b.skill-a.skill||a.id.localeCompare(b.id))[0];
    const first=pick('care'),second=pick('craft',first);
    return [first,second].filter(Boolean).map((v,i)=>({id:v.id,name:v.p.name,skill:i?'repairs and organisation':'food and daily care',role:v.p.role||v.p.originRole}));
  }
  function workGood(role){
    const value=String(role||'').toLowerCase();
    if(/nurs|medic|care|clinic|health|teach/.test(value))return 'wellbeing';
    if(/conven|counc|police|steward/.test(value))return 'trust';
    if(/food|cook|bak|garden|grow|seed|kitchen|fish|farm/.test(value))return 'food';
    if(/repair|craft|carpenter|build|salvage|engineer/.test(value))return 'materials';
    return 'funds';
  }
  function workforce(world,site){
    const result={};
    for(const v of site.communityLife?.vacancies||[]){
      if(world.week<=v.through)result[v.good]=Math.max(-2,(result[v.good]||0)-1);
    }
    return result;
  }
  function debt(person){
    const good=['food','materials','funds'][person.slot];
    return {good,amount:[3,2,3][person.slot]-(person.promise?.advance?.[good]||0)};
  }
  function personalPromises(world){
    const rows=[];
    for(const s of world.sites)for(const p of s.residents)if(p.promise?.by==='steward'&&s.id!==world.communityLife.homeId){
      rows.push({id:p.id,name:p.name,site:s.id,place:s.name,due:p.promise.dueWeek,start:p.promise.start,...debt(p)});
    }
    return rows;
  }
  function uncommitted(site,good){
    const protectedGoods=site.residents.filter(p=>p.promise).map(debt).filter(q=>q.good===good).reduce((n,q)=>n+q.amount,0);
    return Math.max(0,site[good]-protectedGoods-(good==='food'?Math.ceil(site.population/5):1));
  }
  function duty(world,site,a){
    if(world.week<a.due)return [];
    if(!site||site.id!==(a.siteId||world.communityLife.homeId))return [];
    const name=world.communityLife.profile.name,good=a.attended||Boolean(a.coveredBy&&present(site,a.coveredBy));
    const helper=a.coveredBy&&root.EarthPersonas?.profile(site,a.coveredBy)?.name;
    a.reliability=cap(a.reliability+(good?1:-1),-6,6);site.trust=cap(site.trust+(good?1:-1));
    const text=good?(helper?helper+' covered '+name+'’s agreed pantry round.':name+' completed the agreed pantry round.')+' Neighbours gained one trust.':
      name+'’s pantry round had no handover. The next shift did the count late. Trust fell by one.';
    delete local(site).pantryCover;
    a.due=world.week+3;a.siteId=world.communityLife.homeId;a.coveredBy=null;a.attended=false;
    return [writeLog(site,world.week,text)];
  }
  function beginInspection(world,from,to,id){
    const p=portable(from,id),old=local(from).people[id];
    if(!p||!present(from,id))return null;
    const next=guestSlot(to,p,old?.originId||from.id,old?.originSlot||id,'visitor',world.week);
    if(!next||!local(to).people[next])return null;
    const guest=local(to).people[next];guest.visitFrom=from.id;guest.visitSlot=id;guest.inspects=world.week+1;
    awaySlot(from,id,to.id);
    const text=p.name+' arrived from '+from.name+' to inspect '+to.name+'’s '+(kind(to).goods==='food'?'shared kitchen':'workplaces')+' and meet the households. '+p.name+' will decide after a week.';
    writeLog(from,world.week,p.name+' took a week away to inspect '+to.name+'.');writeLog(to,world.week,text);
    return text;
  }
  function visitorFit(world,site,id){
    const guest=site?.communityLife?.people?.[id];
    if(!world||!guest||guest.status!=='visitor'||!present(site,id))return null;
    const home=lookup(world,guest.visitFrom);if(!home)return null;
    const known=Boolean(guest.welcomed),match=fit(site,guest.profile,known);
    const ties=links(home,guest.visitSlot);
    const space=room(site)>0,food=site.food>=meals(site),open=site.trust>=42;
    return {homeId:home.id,homeName:home.name,reviewWeek:guest.inspects,known,space,food,open,
      skillMatch:match.match,need:match.need,lifestyle:match.policy.life,employer:match.employer,
      ties:ties.map(key=>({id:key,name:root.EarthPersonas?.profile(home,key)?.name||'a neighbour'})),
      localYes:space&&food&&open&&(match.match||known),
      personalYes:match.appeal+Number(known)+Number(home.trust<38)-Math.min(2,ties.length)>=4};
  }
  function reviewVisitors(world,site){
    const notes=[];
    for(const [id,g] of Object.entries(site.communityLife?.people||{})){
      if(g.status!=='visitor'||!present(site,id)||world.week<g.inspects)continue;
      const from=lookup(world,g.visitFrom);if(!from)continue;
      const review=visitorFit(world,site,id),{localYes,personalYes}=review;
      let text;
      if(localYes&&personalYes&&from.population>1&&movePerson(world,from,site,g.visitSlot,id)){
        text=g.profile.name+' accepted a place in '+site.name+'. The residents offered housing and valued help '+review.need+'. '+from.name+' has one fewer resident on its rota.';
      }else{
        const why=!localYes?(room(site)<=0?'no spare home is available':site.food<meals(site)?'the kitchen cannot cover another household':!review.skillMatch?'the vacancy needs a different skill':'the council has paused invitations'):
          (review.ties.length?'their friendships at home matter more than the opening':'the daily work and lifestyle suit them better at home');
        text=g.profile.name+' returned to '+from.name+' because '+why+'.';
        const returnSlot=g.visitSlot;awaySlot(site,id,from.id);g.status='former';delete g.visitFrom;delete g.visitSlot;delete g.inspects;
        delete local(from).away[returnSlot];
      }
      writeLog(from,world.week,text);notes.push(writeLog(site,world.week,text));
    }
    return notes;
  }
  function chooseDestination(world,site,id){
    const p=portable(site,id);if(!p)return null;
    return neighbours(world,site).filter(v=>v.distance<=70).map(v=>lookup(world,v.id)).filter(s=>room(s)>0&&s.food>=meals(s)&&s.trust>=42&&fit(s,p).match)
      .sort((a,b)=>fit(b,p).appeal-fit(a,p).appeal||b.trust-a.trust)[0]||null;
  }
  function groupSettlement(world,site,makeSite){
    const c=local(site),old=c.foundingPlan;
    if(!old){
      const people=volunteers(site,world),kit={food:4,materials:2,funds:2};
      if(people.length<2||site.population<5||!makeSite||Object.entries(kit).some(([k,n])=>uncommitted(site,k)<n))return '';
      for(const [k,n] of Object.entries(kit))site[k]-=n;
      c.foundingPlan={members:people.map(p=>p.id),kit,ready:world.week+2};
      const text=people.map(p=>p.name).join(' and ')+' asked nearby households about starting a settlement. The council released 4 food, 2 materials and 2 funds for their household shares after protecting home commitments. They will reconsider in week '+c.foundingPlan.ready+'.';
      return writeLog(site,world.week,text);
    }
    if(world.week<old.ready)return '';
    const free=old.members.every(id=>present(site,id)&&transferable(site,id,world));
    if(!free||c.strain<3||site.population<5){
      for(const [k,n] of Object.entries(old.kit))site[k]+=n;
      delete c.foundingPlan;c.lastExit=world.week;
      return writeLog(site,world.week,'The prospective founders chose to stay after reviewing the handovers and local conditions. Their reserved food, materials and funds returned to the stores.');
    }
    const p=portable(site,old.members[0]),name=p.name+'’s Crossing',id='circle-'+site.id+'-'+world.week;
    const point=pointNear(site,1);point.lat=cap(point.lat-.045,-89.9,89.9);
    const newHome=makeSite({id,name,region:site.region,point,water:site.water,names:['Cass','Min','Rae'],old:null,offer:{newPopulation:3}});
    newHome.founded=world.week;Object.assign(newHome,old.kit);seedHouseholds(newHome,newHome.population,world.week);
    Object.assign(local(newHome),{cluster:site.communityLife.cluster,district:'works',habitat:root.EarthResources?.environment?.(newHome)||'mixed'});local(newHome).away.steward='elsewhere';
    const moved=old.members.map(personId=>movePerson(world,site,newHome,personId));
    world.communityLife.outposts.push(newHome);delete c.foundingPlan;c.lastExit=world.week;
    const text=moved.map(person=>person.name).join(' and ')+' joined three neighbouring households to found '+name+'. They brought the food, repair stock and funds their former community had set aside. '+site.name+' has two fewer residents to cover its shifts.';
    writeLog(newHome,world.week,text);return writeLog(site,world.week,text);
  }
  function neighbourhoodDecision(world,site,makeSite,notify){
    const c=site.communityLife;if(!c?.cluster)return;
    c.strain=(site.trust<34||site.wellbeing<34||site.food<meals(site)||site.population>house(site)+2)?(c.strain||0)+1:0;
    if(c.foundingPlan||c.strain>=5&&site.trust<28&&(!c.lastExit||world.week-c.lastExit>=4)){
      const note=groupSettlement(world,site,makeSite);if(note)notify(site,note);
      if(note||c.foundingPlan)return;
    }
    if(c.strain<3||site.population<4||c.lastExit&&world.week-c.lastExit<4)return;
    const options=candidates(site,world).map(id=>({id,ties:links(site,id,world.week).length,p:portable(site,id)})).filter(v=>v.p)
      .sort((x,y)=>x.ties-y.ties||y.p.traits.adaptability-x.p.traits.adaptability);
    for(const {id,ties,p} of options){
      if(ties>=3&&site.trust>=23||p.traits.adaptability<26)continue;
      const dest=chooseDestination(world,site,id);if(!dest)continue;
      const text=beginInspection(world,site,dest,id);if(!text)continue;
      c.lastExit=world.week;notify(site,p.name+' left to inspect '+dest.name+' after '+c.strain+' difficult weeks.');notify(dest,text);break;
    }
  }
  function movingOptions(world,site){
    if(!site||!world.communityLife)return [];
    const eligible=new Set(candidates(site,world));
    return (root.EarthPersonas?.list?.(site)||[]).filter(p=>p.id!=='steward'&&residency(site,p.id)==='member').map(p=>{
      const destination=eligible.has(p.id)?chooseDestination(world,site,p.id):null,job=root.EarthCareers?.work?.(site,p.id);
      const ties=links(site,p.id,world.week),wait=local(site).excursions?.[p.id];
      const fitHere=fit(site,p),fitThere=destination?fit(destination,portable(site,p.id)):null;
      const curious=Boolean(fitThere&&(site.trust<38||site.food<meals(site)||site.population>house(site)||
        fitThere.appeal>=fitHere.appeal&&p.traits.curiosity+p.traits.adaptability-12*ties.length>=102));
      const tied=tiesSummary(site,p.id),booking=site.communityLife?.offers?.[p.id];
      const reason=wait?'Preparing to inspect '+(lookup(world,wait.to)?.name||'the neighbouring district')+' in week '+wait.due+'.':
        !eligible.has(p.id)?departureReason(site,p.id,world):
        !destination?'There is no nearby opening with housing, meals and a use for their skills.':
        tied?'Their ties with '+tied+' weigh against moving. '+destination.name+' offers '+kind(destination).life+'.':
        destination.name+' is seeking help '+kind(destination).need+'. They are weighing that work against their life in '+site.name+'.';
      return {id:p.id,name:personLabel(site,p.id,p.name),role:job?.label||p.role,eligible:eligible.has(p.id)&&!!destination&&!wait&&booking?.week!==world.week,
        curiosity:curious,to:destination?.id,place:destination?.name,reason,considered:booking?.week===world.week?booking.answer:null};
    });
  }
  function householdOffer(world,from,to){
    if(!from||!to||from.id===to.id)return [];
    const eligible=new Set(candidates(from,world)),plan=new Set(from.communityLife?.foundingPlan?.members||[]);
    return (root.EarthPersonas?.list?.(from)||[]).filter(p=>p.id!=='steward'&&residency(from,p.id)==='member').map(p=>{
      const profile=portable(from,p.id),f=fit(to,profile),ties=links(from,p.id,world.week);
      const free=eligible.has(p.id)&&!plan.has(p.id)&&!from.communityLife?.excursions?.[p.id];
      const willInspect=Boolean(free&&f.likes&&f.match&&p.traits.adaptability+Number(from.trust<35)*24-ties.length*9>=36);
      const reason=!free?departureReason(from,p.id,world)||(plan.has(p.id)?'Signed a founding handover with another group.':'Has already agreed to a different district visit.'):!f.match?'The current vacancies use different skills.':
        !f.likes?'The destination’s daily life is a poor fit.':!willInspect?'Prefers to stay near existing relationships.':
        'Would inspect the housing and a shift '+f.need+'.';
      return {id:p.id,name:personLabel(from,p.id,p.name),role:profile.role,willInspect,reason};
    });
  }
  function coordinateMoves(world,notify){
    const a=world.communityLife;if(!a.cohorts)return;
    a.cohorts=a.cohorts.filter(plan=>{
      const from=lookup(world,plan.from),to=lookup(world,plan.to);if(!from||!to||!plan.pending.length)return false;
      if(world.week>plan.expires){
        const message='The group visit from '+from.name+' closed. Households without an agreed handover or housing stayed at home.';
        notify(from,writeLog(from,world.week,message));notify(to,writeLog(to,world.week,message));return false;
      }
      if(room(to)<1||to.food<meals(to)||to.trust<35)return true;
      let seats=2;
      plan.pending=plan.pending.filter(id=>{
        if(!seats||!present(from,id)||!transferable(from,id,world)||from.communityLife?.excursions?.[id])return true;
        const message=beginInspection(world,from,to,id);if(!message)return true;
        seats--;notify(from,writeLog(from,world.week,root.EarthPersonas.profile(from,id).name+' followed the agreed group route to '+to.name+'.'));notify(to,message);return false;
      });
      return plan.pending.length>0;
    });
  }
  function excursions(world,site,notify){
    const c=site.communityLife;if(!c?.excursions)return;
    for(const [id,plan] of Object.entries(c.excursions)){
      if(plan.due>world.week)continue;
      delete c.excursions[id];
      const name=root.EarthPersonas?.profile(site,id)?.name||'A resident',dest=lookup(world,plan.to);
      if(!dest||!present(site,id)||!transferable(site,id,world)||room(dest)<1){
        notify(site,writeLog(site,world.week,name+' stayed after the handover or the destination’s housing changed.'));continue;
      }
      const message=beginInspection(world,site,dest,id);
      if(message){notify(site,writeLog(site,world.week,name+' set off to inspect '+dest.name+'.'));notify(dest,message);}
    }
  }
  function tick(world,makeSite){
    const a=world.communityLife;if(!a)return [];
    const notes=[],add=(site,text)=>{if(text&&world.sites.some(s=>s.id===site.id))notes.push({site,text});};
    const home=lookup(world,a.homeId);if(!home)return notes;
    for(const remote of a.outposts){
      // Nearby people keep practising, taking breaks, cultivating friendships and
      // working on dreams even before the visitor opens their Street scene.
      if(km(remote,home)<=70||km(remote,lookup(world,world.activeId)||home)<=70){
        root.EarthCareers?.tick?.(world,remote);root.EarthPurses?.tick?.(world,remote);
        root.EarthAutonomy?.settle?.(remote,world);
      }
      // Small independent districts run their own kitchen/repair rota before a visit.
      remote.food=cap(remote.food+(world.week%3===0?1:0),0,20);
      if(world.week%2===0)remote.materials=cap(remote.materials+1,0,18);
    }
    for(const site of stores(world)){
      const c=site.communityLife;
      if(c?.vacancies)c.vacancies=c.vacancies.filter(v=>v.through>=world.week);
      for(const text of reviewVisitors(world,site))add(site,text);
    }
    const rota=lookup(world,a.duty.siteId||a.homeId);
    for(const text of duty(world,rota,a.duty))add(rota,text);
    coordinateMoves(world,add);
    for(const site of stores(world)){prepareDeputy(world,site,add);excursions(world,site,add);neighbourhoodDecision(world,site,makeSite,add);}
    const c=local(home);
    if(world.week%4===3&&room(home)>0&&home.population>=3&&!Object.values(c.people).some(g=>g.status==='visitor')){
      const possible=neighbours(world,home).filter(n=>n.distance<=70).map(n=>lookup(world,n.id)).filter(s=>s.population>4);
      const from=possible[(Math.floor(world.week/4))%Math.max(1,possible.length)];
      if(from){
        const candidatesHere=candidates(from,world);
        const id=candidatesHere.find(id=>portable(from,id)?.traits.curiosity>=40)||candidatesHere[0];
        if(id)add(home,beginInspection(world,from,home,id));
      }
    }
    return notes;
  }
  function visitorLedger(site){
    return Object.entries(site.communityLife?.people||{}).filter(([id,v])=>v.status==='visitor'&&present(site,id))
      .map(([id,g])=>({id,name:g.profile.name,role:g.profile.role||g.profile.originRole,inspects:g.inspects,welcomed:!!g.welcomed}));
  }
  function travelIntent(site,id){
    const cover=site?.communityLife?.pantryCover;
    if(cover?.id===id)return {week:cover.due,kind:'care',venue:'market',destination:'market',goal:'Cover the pantry round',activity:'Checking the household order and pantry tally',reason:'Agreed to cover '+cover.owner+' through week '+cover.due+'.'};
    const promised=site?.communityLife?.excursions?.[id];
    if(promised)return {week:promised.due-1,kind:'visit',venue:'market',destination:'market',goal:'Prepare for a neighbourhood visit',
      activity:'Bringing the handover list to the exchange',reason:'This resident agreed to inspect another community next week.'};
    const g=site?.communityLife?.people?.[id];
    if(!g||g.status!=='visitor'||!present(site,id))return null;
    return {week:g.since,kind:'visit',venue:'market',destination:'market',goal:'Inspect the local exchange',activity:'Inspecting the exchange and meeting households',
      reason:g.profile.name+' is weighing local food, spare housing and the work available.',rationale:'Considering whether to move here.'};
  }
  function view(world,site){
    const a=world.communityLife;if(!a||!site)return null;
    const original=anchor(world),home=lookup(world,a.homeId),member=isHome(world,site),purseSites=world.sites.map(s=>({name:s.name,balance:s.purses?.people?.steward?.balance||0})).filter(p=>p.balance);
    const comp=member?volunteers(site,world):householdOffer(world,home,site);
    const rota=lookup(world,original.dutySiteId);
    return {original,census:census(world,site),home:home.name,region:site.name,member,viewId:root.EarthAgency?.actorId(site)||'steward',
      journey:a.journey?{...a.journey,targetName:lookup(world,a.journey.to)?.name}:null,neighbours:neighbours(world,site),
      visitors:visitorLedger(site),promises:personalPromises(world),parcel:a.parcel?{...a.parcel,place:lookup(world,a.parcel.to)?.name,source:lookup(world,a.parcel.from)?.name}:null,
      vacancies:site.communityLife?.vacancies||[],log:site.communityLife?.log||[],admission:member?null:reception(world,site),
      companions:comp,atRota:site.id===rota.id,canCover:rota.residents.find(p=>residency(rota,p.id)==='member'&&p.bond>=2&&p.heard&&!p.promise)?.id||null,host:hostFor(site),purseSites,
      atHomeText:original.attended?'Your round at '+rota.name+' is recorded.':original.coveredBy?original.coverName+' has agreed to cover your round at '+rota.name+'.':'Your pantry round at '+rota.name+' is due in week '+original.due+'.'};
  }
  const fail=message=>({ok:false,message});
  function arrive(world,from,to,makeSite){
    const a=world.communityLife;
    if(!a)return;
    if(from&&from.id!==to.id)awaySlot(from,'steward',to.id);
    const c=local(to);delete c.away.steward;
    c.people.steward={profile:portable(lookup(world,a.homeId),'steward')||copy(a.profile),status:'anchor',residence:isHome(world,to)?'member':'visitor'};
    const agency=to.agency||={actor:'steward',meals:[]};
    agency.actor='steward';delete agency.returningActor;delete agency.actorAt;
    world.activeId=to.id;if(makeSite)makeRegion(world,to,makeSite);
  }
  function moveAnchor(world,from,to){
    if(!from||from.id===to.id)return;
    root.EarthCareers?.departureForMove?.(world,from,'steward');
    transferDevelopment(world,from,to,'steward','steward');
    from.population=Math.max(1,from.population-1);to.population++;
    world.communityLife.duty.siteId||=from.id;
    world.communityLife.homeId=to.id;
    writeLog(from,world.week,world.communityLife.profile.name+' moved their home to '+to.name+'. Their old pantry and promises remain on the record.');
    const c=local(to);c.people.steward={profile:copy(world.communityLife.profile),status:'anchor',residence:'member'};
  }
  function founding(world,old,site,chosen,makeSite){
    // newSettlement already counted its two volunteers. Transfer their identities once.
    if(!world.communityLife){initialise(world,makeSite,true);return;}
    const state=world.communityLife;
    if(!old){initialise(world,makeSite);return;}
    old.population+=chosen.length;site.population-=chosen.length;seedHouseholds(site,site.population,world.week);
    for(const v of chosen)movePerson(world,old,site,v.id);
    local(site).cluster=old.communityLife?.cluster||old.id;
    moveAnchor(world,old,site);arrive(world,old,site);
    writeLog(site,world.week,chosen.map(v=>v.name).join(' and ')+' signed the founding rota with '+state.profile.name+'.');
    // Distant sponsorships need nearby places of their own, not a footpath across an ocean.
    if(km(old,site)>70){delete local(site).cluster;makeRegion(world,site,makeSite);}
  }
  function restart(world,before,fresh){
    const localBefore=before.communityLife||{},people=copy(localBefore.people||{}),away=copy(localBefore.away||{});
    // Restarting a district clears its physical plant. Its neighbours own their
    // decisions to leave, stay, or visit, so the census cannot be re-created.
    fresh.population=before.population;
    const c=local(fresh);
    c.people=people;c.away=away;c.log=copy(localBefore.log||[]);
    for(const key of ['cluster','district','habitat','foundingHouseholds','foundingRosterReady','deputies','pathVisits','pantryCover']){
      if(localBefore[key]!=null)c[key]=copy(localBefore[key]);
    }
    const a=world.communityLife;
    c.people.steward={profile:copy(a.profile),status:'anchor',residence:'member'};delete c.away.steward;
    const roster=(before.agency?.porters||[]).filter(id=>people[id]||away[id]);
    if(roster.length)fresh.agency={actor:'steward',meals:[],porters:roster};
    writeLog(fresh,world.week,'The district restarted local work and stores. Existing households and the decisions of visiting neighbours stayed on the membership record.');
  }
  function permission(world,site,cmd,args=[]){
    const a=world.communityLife;if(!a||!site)return '';
    if(a.journey&&!['communityLife','reset','workConstruction'].includes(cmd))return 'You are on the road. Open Neighbours to arrive or turn back.';
    if(cmd==='manageSite'){
      if(args[0]!==a.homeId)return 'This district governs itself. Only members can alter their home community.';
      if(args[1]==='delete'&&world.sites.length+(a.outposts?.length||0)>1)return 'Your original character and the neighbouring households live in this world. Use Saved worlds to begin again, or Neighbours to relocate.';
    }
    if(cmd==='found'&&(root.EarthAgency?.actorId(site)||'steward')!=='steward')return 'Return to '+a.profile.name+' to sign a founding proposal.';
    if(cmd==='beginGoal'&&args[0]!==a.homeId||cmd==='found'&&args[3]&&args[3]!==a.homeId)return 'Only your home community can sponsor that decision.';
    if(isHome(world,site))return '';
    if(['visit','advance','workConstruction','regularTruck','disputedTruck','neighbourAppointment','communityLife','reset'].includes(cmd))return '';
    if(cmd==='converse'&&['news','work','interests','purpose','dream','visit-fit','followup'].includes(args[1]))return '';
    return 'You are visiting '+site.name+'. Its residents decide here. Open Neighbours to meet the host, apply to join, or go home.';
  }
  function visitReason(world,site){
    return world.communityLife&&!isHome(world,site)?'This district governs itself. Meet its admission host in Neighbours.':'';
  }
  function detachedView(world){return root.EarthAgency?.actorId(lookup(world,world.activeId))||'steward';}
  const stops=[.23,.51,.78];
  function routeProgress(trip,now=Date.now()){
    const base=trip.base||0,limit=trip.hold??(Number.isInteger(trip.stop)?stops[trip.stop]:1);
    return Math.min(limit,base+(1-base)*cap((now-trip.start)/Math.max(1,trip.finish-trip.start),0,1));
  }
  function trail(world,trip){
    const from=lookup(world,trip.from),to=lookup(world,trip.to),via=trip.via||'commons';
    if(!from||!to)return null;
    const distant=trip.km>70,water=from.water||to.water,goods=kind(to).goods;
    const titles=distant?['Departure concourse',via==='work'?'Freight interchange':'Regional stop','Arrivals board']:
      water?['Mooring gate',via==='work'?'Repair pontoons':'Sheltered channel','Landing steps']:
      ['Exchange gate',via==='work'?'Tool yard':'Kitchen gardens','District noticeboard'];
    const notes=[
      from.name+' has '+from.food+' food for '+from.population+' people. Your pantry round at '+(lookup(world,world.communityLife.duty.siteId||world.communityLife.homeId)?.name||from.name)+' comes due in week '+world.communityLife.duty.due+'.',
      via==='work'?to.name+' holds '+to.materials+' materials. '+hostFor(to).name+' is looking for help '+kind(to).need+'.':
        to.name+' keeps '+to.food+' food. Even with a spare room, a new household needs a share of the next meals.',
      hostFor(to).name+' speaks at admissions. There '+(room(to)===1?'is one spare place':'are '+Math.max(0,room(to))+' spare places')+' and the local rota depends on '+goods+'.'
    ];
    return {from:from.name,to:to.name,water,distant,via,landmarks:titles.map((label,i)=>({label,id:i,fraction:stops[i],note:notes[i]}))};
  }
  function continueTrip(trip,progress,target){
    const time=Date.now();trip.base=progress;trip.start=time;
    trip.finish=time+Math.max(100,Math.round(cap(trip.km*650,2400,6200)*(1-progress)));
    delete trip.stop;delete trip.hold;
    if(target==='pause')trip.hold=progress;
    else if(target!=='direct'&&Number.isInteger(target))trip.stop=target;
  }
  function run(world,site,req,scene,makeSite,finishPromise){
    const a=world.communityLife;
    if(!a||!site||!req||req.site!==site.id||req.week!==world.week)return fail('The place or week changed. Open Neighbours again.');
    if(req.actor!==detachedView(world)||req.actor!=='steward')return fail('Return to '+a.profile.name+' before making a personal travel or membership decision.');
    const home=lookup(world,a.homeId),c=local(site),receipt=text=>({ok:true,message:writeLog(site,world.week,text)});
    const at=id=>scene?.siteId===site.id&&scene.actor==='steward'&&scene.mode==='walk'&&scene.target===id&&
      [scene.x,scene.y,scene.tx,scene.ty].every(Number.isFinite)&&Math.hypot(scene.x-scene.tx,scene.y-scene.ty)<=1.56;
    if(req.action==='depart'||req.action==='walkTrail'){
      if(a.journey)return fail('A journey is already under way.');
      if(!at('market'))return fail('Walk to the exchange path to start the crossing.');
      const block=journeyBlock(site);if(block)return fail(block);
      const dest=neighbours(world,site).find(n=>n.id===req.target);
      if(!dest)return fail('Choose a reachable neighbouring district.');
      const start=Date.now(),duration=Math.round(cap(dest.distance*620,1600,6200));
      a.journey={from:site.id,to:dest.id,start,finish:start+duration,km:dest.distance};
      if(req.action==='walkTrail')Object.assign(a.journey,{interactive:true,via:'commons',stop:0,seen:[]});
      return {ok:true,message:a.profile.name+' set out for '+dest.name+'.',journey:true};
    }
    if(req.action==='routeChoice'){
      const trip=a.journey;if(!trip||trip.from!==site.id)return fail('That crossing has ended.');
      const progress=routeProgress(trip),target=req.target,road=trail(world,trip);
      if(target==='commons'||target==='work'){
        if(progress>stops[1])return fail('You have passed the fork on this crossing.');
        trip.via=target;continueTrip(trip,progress,1);
      }else if(target==='inspect'){
        const i=stops.findIndex(v=>Math.abs(v-progress)<.035);
        if(i<0)return fail('Stop by a marked landmark to inspect it.');
        if(!(trip.seen||=[]).includes(i))trip.seen.push(i);
        continueTrip(trip,stops[i],'pause');
        return receipt(road.landmarks[i].label+' · '+road.landmarks[i].note);
      }else if(target==='pause')continueTrip(trip,progress,'pause');
      else if(target==='direct')continueTrip(trip,progress,'direct');
      else{
        const i=Number(target);
        if(!Number.isInteger(i)||i<0||i>2||stops[i]<=progress+.002)return fail('Choose a landmark farther along this route.');
        continueTrip(trip,progress,i);
      }
      trip.interactive=true;return {ok:true,message:target==='pause'?'You stopped on the path.':'Your route is set.'};
    }
    if(req.action==='cancel'){
      if(!a.journey)return fail('There is no crossing to turn back from.');
      a.journey=null;return receipt('Returned to the exchange path at '+site.name+'.');
    }
    if(req.action==='arrive'){
      const trip=a.journey;
      if(!trip||trip.from!==site.id||trip.to!==req.target)return fail('That journey has already changed.');
      if(routeProgress(trip)<.999)return fail('Continue along the path to reach the destination.');
      const dest=lookup(world,trip.to);
      if(!dest)return fail('The destination is no longer available.');
      if(!world.sites.some(s=>s.id===dest.id)){
        a.outposts=a.outposts.filter(s=>s.id!==dest.id);world.sites.push(dest);
      }
      if(trip.seen?.length){
        const route=trail(world,trip),seen=trip.seen.map(i=>route.landmarks[i].label).join(', ');
        writeLog(dest,world.week,a.profile.name+' inspected '+seen+' on the way from '+site.name+'.');
        const book=local(dest);book.pathVisits={week:world.week,seen:trip.seen.length,from:site.id};
      }
      a.journey=null;arrive(world,site,dest,makeSite);
      return {ok:true,arrived:true,message:writeLog(dest,world.week,a.profile.name+' arrived in '+dest.name+(isHome(world,dest)?' and returned to their home.':' as a visitor. '+hostFor(dest).name+' speaks for the admissions meeting.'))};
    }
    if(a.journey)return fail('Finish the current crossing first.');
    if(req.action==='pack'){
      if(!isHome(world,site)||!at('market')||a.parcel)return fail('Collect one commitment parcel at your home exchange.');
      const row=personalPromises(world).find(p=>p.id===req.target);
      if(!row||row.due<world.week)return fail('That personal promise is no longer outstanding.');
      if(uncommitted(site,row.good)<row.amount)return fail('Protect local meals and outstanding promises first. The exchange needs '+row.amount+' uncommitted '+row.good+'.');
      site[row.good]-=row.amount;a.parcel={from:site.id,to:row.site,id:row.id,name:row.name,start:row.start,due:row.due,good:row.good,amount:row.amount};
      return receipt(a.profile.name+' collected '+row.amount+' '+row.good+' for '+row.name+' at '+row.place+'. The parcel is travelling with you.');
    }
    if(req.action==='unpack'){
      const parcel=a.parcel;
      if(!parcel||parcel.from!==site.id||!at('market'))return fail('Return the parcel to the exchange that supplied it.');
      site[parcel.good]+=parcel.amount;delete a.parcel;
      return receipt('Returned '+parcel.amount+' '+parcel.good+' to '+site.name+'’s exchange.');
    }
    if(req.action==='deliver'){
      const parcel=a.parcel,p=site.residents.find(person=>person.id===req.target);
      if(!parcel||parcel.to!==site.id||parcel.id!==p?.id||!at(p.id))return fail('Walk to the person named on this commitment parcel.');
      if(!p.promise||p.promise.by!=='steward'||p.promise.start!==parcel.start||p.promise.dueWeek<world.week||debt(p).amount!==parcel.amount){
        return fail('The agreement has changed. Return the parcel to the exchange that supplied it.');
      }
      if(!finishPromise)return fail('The promise receipt could not be prepared. The parcel is still yours to carry.');
      const result=finishPromise(p,parcel);
      delete a.parcel;return receipt(result);
    }
    if(req.action==='round'){
      if(site.id!==(a.duty.siteId||a.homeId)||!at('market'))return fail('Your pantry round takes place at the exchange in '+lookup(world,a.duty.siteId||a.homeId).name+'.');
      if(a.duty.attended||a.duty.coveredBy)return fail('The current pantry round already has cover.');
      a.duty.attended=true;
      return receipt(a.profile.name+' counted the pantry and gave the next cook the household order for week '+a.duty.due+'.');
    }
    if(req.action==='cover'){
      if(site.id!==(a.duty.siteId||a.homeId)||a.duty.attended||a.duty.coveredBy)return fail('This round already has cover or belongs to a different district.');
      const p=site.residents.find(r=>r.id===req.target);
      if(!p||residency(site,p.id)!=='member'||!at(p.id)||p.bond<2||!p.heard||p.promise)return fail('Meet a trusted neighbour who has room on their rota and no outstanding promise.');
      a.duty.coveredBy=p.id;c.pantryCover={id:p.id,owner:a.profile.name,due:a.duty.due};return receipt(p.name+' agreed to count the pantry for '+a.profile.name+' before week '+a.duty.due+'.');
    }
    if(req.action==='suggestVisit'){
      if(!isHome(world,site)||!at(req.target))return fail('Meet the resident in your own district to ask about a visit.');
      const choice=movingOptions(world,site).find(p=>p.id===req.target);
      if(!choice||!choice.eligible)return fail(choice?.considered||choice?.reason||'That resident is unavailable.');
      const answer=choice.curiosity?choice.name+' agreed to inspect '+choice.place+' after a handover at the exchange. It is a visit, with a separate membership decision afterward.':
        choice.name+' chose to stay after considering '+choice.place+'. '+choice.reason;
      (c.offers||={})[choice.id]={week:world.week,answer};
      if(choice.curiosity)(c.excursions||={})[choice.id]={to:choice.to,due:world.week+1};
      return receipt(answer);
    }
    if(req.action==='welcome'){
      const g=c.people[req.target];
      if(!isHome(world,site)||!g||g.status!=='visitor'||!present(site,req.target)||!at(req.target))return fail('Find the visitor in your home district to offer an introduction.');
      if(g.welcomed)return fail(g.profile.name+' has already met you.');
      g.welcomed=true;
      return receipt(g.profile.name+' accepted an introduction to the local households. They will decide after seeing their own week here.');
    }
    if(isHome(world,site))return fail('You already belong to this community.');
    const admission=reception(world,site),host=hostFor(site);
    if(req.action==='meet'){
      if(!at(host.id))return fail('Meet '+host.name+' in person first.');
      const v=c.visits.steward||={};
      if(v.met)return fail(host.name+' already logged your introduction.');
      v.met=world.week;v.hostId=host.id;v.hostName=host.name;
      return receipt(host.name+' said, “We have a place to talk about '+kind(site).need+'. Come for the trial shift and tell us which commitments you would bring.”');
    }
    if(req.action==='help'){
      const v=c.visits.steward;
      if(!v?.met||!at('market'))return fail('Meet the host first, then work a trial shift at the exchange.');
      if(v.lastShift===world.week)return fail('The host has recorded this week’s trial. Return next week if another is needed.');
      if(!world.effort)return fail('A trial shift takes one effort. A new week renews your working time.');
      v.help=true;v.shifts=(v.shifts||0)+1;v.lastShift=world.week;world.effort--;
      const good=kind(site).goods;site[good]=Math.min(Number.MAX_SAFE_INTEGER,site[good]+1);
      return receipt(a.profile.name+' completed a supervised shift '+kind(site).need+'. '+host.name+' recorded one '+good+' in local stores.');
    }
    if(req.action==='apply'||req.action==='moveGroup'){
      if(!at(host.id))return fail('Bring the application to '+host.name+' in person.');
      if(!admission.available)return fail(host.name+' deferred admission. '+admission.checks.filter(x=>!x.pass).map(x=>x.detail).join(' '));
      const oldHome=home,group=req.action==='moveGroup',answers=group?householdOffer(world,oldHome,site):[];
      const willing=answers.filter(p=>p.willInspect);
      if(group&&willing.length)(a.cohorts||=[]).push({from:oldHome.id,to:site.id,opened:world.week,
        expires:world.week+Math.ceil(willing.length/2)+3,pending:willing.map(p=>p.id)});
      moveAnchor(world,oldHome,site);
      const outcome=group?' '+answers.length+' households considered the invitation. '+willing.length+' agreed to inspect in pairs after their handovers. Each visitor and the host meeting will decide separately.':'';
      return receipt(host.name+' and the local meeting welcomed '+a.profile.name+' as a member of '+site.name+'. '+oldHome.name+' now chooses its own affairs.'+outcome);
    }
    return fail('Choose a current neighbourhood action.');
  }
  function valid(world,validateSite){
    const a=world.communityLife;if(a==null)return true;
    if(!obj(a)||!Array.isArray(a.outposts)||!word(a.originId)||!word(a.originName)||!word(a.homeId)||!validProfile(a.profile,'steward')||
      !world.sites.some(s=>s.id===a.homeId)||!obj(a.duty)||!int(a.duty.due,world.week,world.week+3)||!int(a.duty.reliability,-6,6)||
      typeof a.duty.attended!=='boolean'||a.duty.coveredBy!=null&&!word(a.duty.coveredBy))return false;
    const districts=stores(world),ids=new Set(districts.map(s=>s?.id));
    if(ids.size!==districts.length||a.duty.siteId!=null&&!ids.has(a.duty.siteId)||a.outposts.some(s=>!validateSite(s,world,ids)))return false;
    if(a.cohorts&&(!Array.isArray(a.cohorts)||a.cohorts.some(g=>!obj(g)||!ids.has(g.from)||!ids.has(g.to)||g.from===g.to||
      !int(g.opened,1,world.week)||!int(g.expires,world.week)||!Array.isArray(g.pending)||g.pending.length>34||
      new Set(g.pending).size!==g.pending.length||!g.pending.every(word))))return false;
    if(a.parcel){
      const p=a.parcel;
      if(!obj(p)||!ids.has(p.from)||!ids.has(p.to)||p.from===p.to||!word(p.id)||!word(p.name)||!int(p.start,1,world.week)||!int(p.due,p.start)||
        !['food','funds','materials'].includes(p.good)||!int(p.amount,1,3))return false;
    }
    if(a.journey!=null){
      const t=a.journey;
      if(!obj(t)||t.from!==world.activeId||t.from===t.to||!ids.has(t.to)||!int(t.start)||!int(t.finish,t.start,t.start+6200)||!Number.isFinite(t.km)||t.km<0)return false;
      if(t.base!=null&&(!Number.isFinite(t.base)||t.base<0||t.base>1)||t.hold!=null&&(!Number.isFinite(t.hold)||t.hold<0||t.hold>1)||
         t.stop!=null&&!int(t.stop,0,2)||t.via!=null&&!['commons','work'].includes(t.via)||t.seen!=null&&(!Array.isArray(t.seen)||t.seen.length>3||!t.seen.every(i=>int(i,0,2))))return false;
    }
    for(const s of districts){
      const c=s.communityLife;if(!c)continue;
      if(!obj(c)||!obj(c.people)||!obj(c.away)||!obj(c.visits)||!Array.isArray(c.log)||c.log.length>9||c.log.some(n=>!obj(n)||!int(n.week,1,world.week)||!word(n.text)))return false;
      if(c.foundingHouseholds!=null&&!int(c.foundingHouseholds,3,12)||c.foundingRosterReady!=null&&typeof c.foundingRosterReady!=='boolean')return false;
      if(c.cluster!=null&&!word(c.cluster)||c.district!=null&&![...land,...water].some(d=>d.district===c.district)||c.strain!=null&&!int(c.strain)||c.lastExit!=null&&!int(c.lastExit,1,world.week))return false;
      if(!Object.entries(c.away).every(([id,dest])=>(id==='steward'||id==='driver'||walkIds.includes(id)||guestSlots.includes(id)||s.residents.some(r=>r.id===id))&&word(dest)))return false;
      for(const [id,p] of Object.entries(c.people)){
        if(!obj(p)||!validProfile(p.profile,id)||id==='steward'&&p.status!=='anchor'||id!=='steward'&&(!(guestSlots.includes(id)||(walkIds.includes(id)||id==='driver'||s.residents.some(r=>r.id===id))&&p.originId===s.id&&p.originSlot===id)||!['visitor','member','former'].includes(p.status)||!word(p.originId)||!word(p.originSlot)||!int(p.since,1,world.week)))return false;
        if(p.status==='visitor'&&(!ids.has(p.visitFrom)||!word(p.visitSlot)||!int(p.inspects,p.since+1,p.since+1)))return false;
      }
      if(c.deputies&&(!Array.isArray(c.deputies)||new Set(c.deputies.map(d=>d.id)).size!==c.deputies.length||
        c.deputies.some(d=>!obj(d)||!word(d.id)||!word(d.name)||!int(d.week,1,world.week))))return false;
      if(c.deputyTraining&&(!obj(c.deputyTraining)||!word(c.deputyTraining.id)||!word(c.deputyTraining.name)||!int(c.deputyTraining.ready,world.week,world.week+2)))return false;
      if(c.excursions&&(!obj(c.excursions)||!Object.values(c.excursions).every(v=>obj(v)&&ids.has(v.to)&&int(v.due,world.week,world.week+1))))return false;
      if(c.offers&&(!obj(c.offers)||!Object.values(c.offers).every(v=>obj(v)&&int(v.week,1,world.week)&&word(v.answer))))return false;
      if(c.foundingPlan){
        const plan=c.foundingPlan;
        if(!Array.isArray(plan.members)||plan.members.length!==2||new Set(plan.members).size!==2||!plan.members.every(word)||
           !int(plan.ready,world.week,world.week+2)||!obj(plan.kit)||plan.kit.food!==4||plan.kit.materials!==2||plan.kit.funds!==2)return false;
      }
      if(c.vacancies&&(!Array.isArray(c.vacancies)||c.vacancies.some(v=>!obj(v)||!word(v.name)||!['food','materials','funds','trust','wellbeing'].includes(v.good)||!int(v.through,world.week,world.week+2))))return false;
      if(c.pantryCover&&(!obj(c.pantryCover)||!word(c.pantryCover.id)||!word(c.pantryCover.owner)||!int(c.pantryCover.due,world.week,world.week+3)))return false;
      const v=c.visits.steward;
      if(v&&(!obj(v)||!int(v.met,1,world.week)||v.hostId!=null&&!word(v.hostId)||v.hostName!=null&&!word(v.hostName)||v.shifts!=null&&!int(v.shifts,1,world.week)||v.lastShift!=null&&!int(v.lastShift,v.met,world.week)))return false;
    }
    return true;
  }
  function validProfile(p,id){
    return obj(p)&&p.id===id&&word(p.name)&&word(p.originRole)&&word(p.description)&&obj(p.aptitudes)&&obj(p.traits)&&obj(p.bounds)&&
      ['numeracy','music','communication','care','craft','stamina','organisation'].every(k=>int(p.aptitudes[k],0,100)&&int(p.bounds[k]?.min,0,p.aptitudes[k])&&int(p.bounds[k]?.max,p.aptitudes[k],100));
  }
  root.EarthCommunityLife=Object.freeze({initialise,restart,valid,present,profile,personLabel,census,commuting,residency,anchor,isHome,neighbours,travelIntent,volunteers,founding,
    view,movingOptions,householdOffer,hostFor,wasDelegate,visitorFit,routeProgress,trail,arrive,tick,workforce,permission,visitReason,journeyBlock,run});
})(typeof window==='undefined'?globalThis:window);
