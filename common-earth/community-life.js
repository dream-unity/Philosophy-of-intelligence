/* People carry their identities between districts. Membership, physical presence and
 * the character currently being experienced are deliberately stored separately. */
(function(root){
  'use strict';
  const walkIds=['walker-0','walker-1','walker-2','walker-3','walker-4'];
  const land=[
    {name:'Orchard Walk',district:'gardens',hosts:['Wren','Luca','Mae'],axis:'care',second:'stamina',need:'keeping the food rota',goods:'food',life:'quiet gardens and neighbours who share a meal',purpose:'a lunch rota for gardeners'},
    {name:'Foundry Lane',district:'works',hosts:['Ezra','Mara','Ivo'],axis:'craft',second:'numeracy',need:'repairing tools and keeping their measurements',goods:'materials',life:'shared workbenches and apprenticeships',purpose:'an open repair bench'}
  ];
  land.push({name:'Market Cross',district:'exchange-yard',hosts:['Ari','Noor','Tess'],axis:'organisation',second:'communication',need:'coordinating deliveries between households',goods:'funds',life:'shared market days',purpose:'a district delivery rota'});
  const water=[
    {...land[0],name:'Lantern Landing',district:'landing',life:'shared meals on sheltered pontoons',purpose:'a kitchen rota between boats'},
    {...land[1],name:'Slipway Circle',district:'slipway',life:'boat repairs and cooperative rigging crews',purpose:'a teaching berth'}
  ];
  water.push({...land[2],name:'Harbour Exchange',district:'harbour-market'});
  const founderPurposes=[
    {district:'growers-circle',suffix:'Growers’ Circle',axis:'care',second:'stamina',goods:'food',need:'keeping the seed rota and sharing the seasonal harvest',life:'shared growing rounds and a pantry held in common',purpose:'a seed-sharing kitchen'},
    {district:'repair-circle',suffix:'Repair Yard',axis:'craft',second:'numeracy',goods:'materials',need:'measuring repairs and passing on workshop techniques',life:'small repair crews who teach one apprentice at a time',purpose:'an open repair yard'},
    {district:'study-circle',suffix:'Learning House',axis:'numeracy',second:'communication',goods:'funds',need:'turning district measurements into practical lessons',life:'public notebooks, survey walks and an evening teaching rota',purpose:'a neighbourhood school of practical mathematics'},
    {district:'performance-circle',suffix:'Music Court',axis:'music',second:'communication',goods:'funds',need:'teaching rehearsal parts and organising paid evening performances',life:'shared rehearsal rooms and performances organised by neighbours',purpose:'a community rehearsal room'},
    {district:'care-circle',suffix:'Care Commons',axis:'care',second:'organisation',goods:'food',need:'coordinating household meals around a regular care round',life:'neighbours who plan care visits and prepare a shared meal',purpose:'a household care rota'},
    {district:'exchange-circle',suffix:'Exchange',axis:'organisation',second:'stamina',goods:'funds',need:'matching return loads and negotiating delivery times',life:'shift-based exchange work with a dependable goods rota',purpose:'a resident-run freight exchange'}
  ];
  function foundingPurpose(people){
    let choice=founderPurposes[0],top=-1;
    for(const project of founderPurposes){
      const skills=people.map(p=>p.demonstratedSkills||p.aptitudes);
      const first=Math.max(...skills.map(s=>s[project.axis])),next=Math.max(...skills.map(s=>s[project.second]));
      const shared=skills.reduce((n,s)=>n+Math.min(s[project.axis],s[project.second]),0)/skills.length;
      const interests=people.filter(p=>[project.axis,project.second].includes(p.hobbyAxis)).length;
      const score=first*.45+next*.35+shared*.2+interests*4;
      if(score>top){top=score;choice=project;}
    }
    return choice;
  }
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
    if(d.goods==='funds'&&supplied)return {...d,need:'coordinating deliveries for crews '+supplied.need};
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
  const inspectable=(world,host,from,id)=>room(host)>0||Boolean(root.EarthHousing?.privateInspection(world,host,from,id));
  function kind(site){
    const id=site.communityLife?.district;
    const purpose=founderPurposes.find(p=>p.district===id);if(purpose)return purpose;
    const saved=[...land,...water].find(d=>d.district===id);
    if(saved)return livelihood(saved,site.communityLife?.habitat);
    return {axis:site.specialty==='materials'?'craft':site.specialty==='funds'?'organisation':'care',
      second:'communication',need:site.specialty==='materials'?'repairing shared equipment':site.specialty==='funds'?'coordinating the exchange':'feeding households',
      life:'neighbours who look after the shared stores',goods:site.specialty,purpose:'a reliable neighbourhood rota'};
  }
  function pointNear(site,index,legacy=false){
    const north=[2.1,-3.4,5.6][index],east=[-2.9,4.9,3.2][index],lat=cap(site.lat+north/111,-89.9,89.9);
    if(!legacy&&Math.abs(site.lat)>85&&root.EarthRegionalWorld?.polarProjection)
      return {...root.EarthRegionalWorld.polarProjection(site).locate(east,north),water:site.water,coastal:site.coastal};
    return {lat,lon:((site.lon+east/(111*Math.max(.08,Math.cos(lat*Math.PI/180)))+540)%360)-180,water:site.water,coastal:site.coastal};
  }
  function founderSurvey(world,site){
    const occupied=stores(world),r=Math.PI/180,lat=site.lat*r,lon=site.lon*r;
    for(const radius of [11,14,24,36,49,62]){
      const arc=radius/6371;
      for(let step=0;step<12;step++){
        const bearing=(127+30*step)*r;
        const phi=Math.asin(cap(Math.sin(lat)*Math.cos(arc)+Math.cos(lat)*Math.sin(arc)*Math.cos(bearing),-1,1));
        const lambda=lon+Math.atan2(Math.sin(bearing)*Math.sin(arc)*Math.cos(lat),Math.cos(arc)-Math.sin(lat)*Math.sin(phi));
        const point={lat:phi/r,lon:((lambda/r+540)%360)-180,water:site.water,coastal:site.coastal};
        if(occupied.every(s=>km(s,point)>=10)){
          if(!root.EarthRegionalWorld)return point;
          const surveyed=root.EarthRegionalWorld.foundingGround(world,site,point);
          if(surveyed)return surveyed;
        }
      }
    }
    return null;
  }
  function km(a,b){
    const r=Math.PI/180,d=Math.sin((a.lat-b.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((a.lon-b.lon)*r/2)**2;
    return 12742*Math.asin(Math.sqrt(cap(d,0,1)));
  }
  function writeLog(site,week,text,founding=false){
    const l=local(site).log;
    l.unshift({week,text:text.slice(0,500),...(founding?{founding:true}:{})});
    if(l.length>9)l.splice(l.at(-1).founding?l.length-2:l.length-1,1);
    return text;
  }
  const seededRoles=['practice-nurse','surveyor'];
  function openHousehold(site,role,week){
    const c=local(site);
    if(Object.values(c.people).some(g=>g.householdRole===role))return true;
    const occupied=new Set([...(root.EarthPersonas?.porterIds?.(site)||[]),...Object.keys(c.people),...Object.keys(c.away),
      ...Object.keys(site.careers||{}),...Object.keys(site.autonomy?.people||{}),...Object.keys(site.purses?.people||{}),...Object.keys(site.workforce?.members||{})]);
    const id=[...guestSlots].reverse().find(key=>!occupied.has(key));
    const person=id&&root.EarthPersonas?.householdProfile?.(site,id,role);if(!person)return false;
    c.people[id]={profile:{...copy(person),birthCommunityName:site.name},status:'member',householdRole:role,originId:site.id,originSlot:id,originName:site.name,since:week};
    const agency=site.agency||={actor:'steward',meals:[]};
    (agency.porters||=[]).push(id);return true;
  }
  function seedHouseholds(site,nativeCount,week){
    const c=local(site);
    c.foundingHouseholds=nativeCount;
    const slots=['driver',...walkIds],available=Math.max(0,nativeCount-site.residents.length);
    for(const [i,id] of slots.entries())if(i>=available)c.away[id]='outside-roster';
    const additional=Math.min(seededRoles.length,Math.max(0,available-slots.length));
    c.foundingRosterReady=seededRoles.slice(0,additional).every(role=>openHousehold(site,role,week));
  }
  function recoverHouseholds(world,site){
    // Small early towns counted two additional households before they had named
    // street identities. Keep large historical census estimates and all named
    // commuters, travel slots, wages and career histories independently intact.
    if(!site||site.population<10||site.population>12||site.communityLife?.foundingHouseholds!=null)return;
    let missing=census(world,site).anonymous;
    if(missing<1||missing>2)return;
    for(const role of seededRoles){
      if(!missing)break;
      if(!Object.values(site.communityLife?.people||{}).some(g=>g.householdRole===role)&&openHousehold(site,role,world.week))missing--;
    }
  }
  function commuting(site,id){
    return guestSlots.includes(id)&&!site.communityLife?.people?.[id];
  }
  function census(world,site,rosterOnly=false){
    if(!site)return null;
    const c=site.communityLife||{},a=world.communityLife;
    const members=new Set([...site.residents.map(p=>p.id),...walkIds,'driver',...Object.entries(c.people||{}).filter(([,g])=>g.status==='member').map(([id])=>id)]);
    let here=0,away=0;
    const ids=rosterOnly?[]:null;
    if((a?.homeId||world.sites[0]?.id)===site.id){members.add('steward');}
    for(const id of members){
      if(id==='steward'){
        if(world.activeId===site.id)here++;else away++;
        ids?.push(id);
        continue;
      }
      const dest=c.away?.[id],g=c.people?.[id];
      if(!dest){if(!g||g.status==='member'){here++;ids?.push(id);}continue;}
      if(dest==='regional-field'||dest==='regional-freight'||dest==='regional-visit'||dest==='regional-watch'||dest==='recovering-at-home'){away++;ids?.push(id);continue;}
      if(dest==='outside-roster'||dest==='elsewhere')continue;
      const peer=lookup(world,dest);
      if(Object.values(peer?.communityLife?.people||{}).some(v=>v.status==='visitor'&&v.visitFrom===site.id&&v.visitSlot===id)){away++;ids?.push(id);}
    }
    const visitors=Object.entries(c.people||{}).filter(([id,g])=>present(site,id)&&(g.status==='visitor'||g.status==='anchor'&&g.residence==='visitor')).length;
    // Housing needs the legal residents and visitors. Reconstructing historical
    // freight crews belongs to the full census and cannot change this roll.
    if(rosterOnly)return {ids,visitors};
    const commuters=(root.EarthPersonas?.porterIds?.(site)||[]).filter(id=>commuting(site,id)&&present(site,id)).length;
    const represented=here+away,anonymous=Math.max(0,site.population-represented);
    const clauses=[site.population+' residents on the household roll',here+' named residents here'];
    if(away)clauses.push(away+' resident'+(away===1?'':'s')+' away from town');
    if(anonymous)clauses.push(anonymous+' other household member'+(anonymous===1?'':'s')+(c.foundingHouseholds==null?' in the earlier census':' awaiting a street record'));
    if(represented>site.population)clauses.push('the earlier household count predates this street roster');
    if(visitors)clauses.push(visitors+' visiting');
    if(commuters)clauses.push(commuters+' regional shift worker'+(commuters===1?'':'s'));
    return {total:site.population,here,away,represented,anonymous,visitors,commuters,active:here+visitors+commuters,summary:clauses.join(' · ')};
  }
  function makeRegion(world,base,makeSite){
    const state=local(base);
    if(state.cluster&&state.cluster!==base.id)return;
    state.cluster=base.id;
    const catalogue=base.water?water:land,habitat=root.EarthResources?.environment?.(base);
    catalogue.forEach((template,i)=>{
      const d=livelihood(template,habitat);
      let name=d.name,id='near-'+base.id+'-'+i;
      if(stores(world).some(s=>s.name===name))name=base.name+' '+name;
      if(stores(world).some(s=>s.id===id))return;
      const point=pointNear(base,i);
      const other=makeSite({id,name,region:base.region,point,water:base.water,names:d.hosts,old:null,offer:{newPopulation:i===2?10:10+i}});
      other.specialty=d.goods;other.founded=world.week;seedHouseholds(other,other.population,world.week);
      other.food=14-i;other.materials=9+i;other.trust=i===2?55:58+i*5;other.wellbeing=61-i;
      Object.assign(local(other),{cluster:base.id,district:d.district,habitat:habitat||'mixed',foundingPlaces:i===2?other.population-1:18});local(other).away.steward='elsewhere';
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
    else recoverHouseholds(world,home);
    if(makeSite)for(const base of stores(world).filter(s=>s.communityLife?.cluster===s.id||s===home))makeRegion(world,base,makeSite);
    const here=world.sites.find(s=>s.id===world.activeId);
    if(here&&here!==home){recoverHouseholds(world,here);if(makeSite)makeRegion(world,here,makeSite);}
  }
  function delegates(site){
    const founders=site.residents.filter(p=>residency(site,p.id)==='member').sort((a,b)=>b.slot-a.slot);
    const trained=(site.communityLife?.deputies||[]).filter(d=>present(site,d.id)&&residency(site,d.id)==='member');
    return [...founders,...trained];
  }
  const vacantHost=Object.freeze({id:null,name:'The local assembly',heard:false});
  const hostFor=site=>delegates(site)[0]||vacantHost;
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
  // Birth dispositions travel with a person. Current bonds and experiences
  // affect how that person receives strangers in their present community.
  function visitorStance(site,p){
    if(root.EarthBorderConflict){
      const value=root.EarthBorderConflict.force(site,p);
      return value>=62?'forceful':value>=42?'guarded':'welcoming';
    }
    const birth=p.birthCommunityId||site.communityLife?.people?.[p.id]?.originId||site.id;
    const cohort=birth.match(/-(\d+)$/),regional=birth.startsWith('near-')&&cohort;
    const baseline=p.externalHistory?.aggression??(regional?([36,75,51][Number(cohort[1])]??50):50);
    const traits=p.traits||{},resident=site.residents.find(r=>r.id===p.id);
    const ties=(site.agency?.meals||[]).filter(m=>m.from===p.id||m.to===p.id).length;
    const recent=site.autonomy?.people?.[p.id]?.history||[];
    const cooperation=recent.filter(event=>['visit','host','cover','project'].includes(event.kind)).length;
    const value=cap(Math.round(baseline-cooperation*3+((traits.initiative??50)-(traits.patience??50))*.32+
      (50-(traits.sociability??50))*.35+(52-site.trust)*.4+(50-site.wellbeing)*.22-
      Math.min(15,(resident?.bond||0)*3+ties*3)+(resident?.lastMissed?6:0)),0,100);
    return value>=62?'forceful':value>=42?'guarded':'welcoming';
  }
  // The founding articles stay in force until an assembly changes them.
  const entryRules={
    hosted:{label:'Hosted entry',terms:'The gate delegates may turn away unintroduced visitors. Access to paid work requires a sponsor or an established trade partner.',
      history:'The founding repair crews appointed a gate rota after outsiders removed tools from their shared workshop.'},
    exchange:{label:'Exchange hospitality',terms:'Visitors can work at the exchange. Private invitations come from individual households.',
      history:'The founding traders kept the exchange open to travelling suppliers and left household visits to the residents.'},
    welcome:{label:'Open reception',terms:'Visitors may meet residents and take local work. Permanent membership still requires a household review.',
      history:'The founding households agreed to receive visitors at the shared kitchen and review requests for residence together.'}
  };
  function foundingRule(site){
    const district=site.communityLife?.district;
    if(district==='works'||district==='slipway')return 'hosted';
    if(district==='exchange-yard'||district==='harbour-market')return 'exchange';
    return 'welcome';
  }
  const currentRule=site=>site.communityLife?.entryDecision?.rule||foundingRule(site);
  const encounters={
    introduction:{outside:3,inside:0,words:'accepted an introduction'},
    shift:{outside:5,inside:6,words:'completed a supervised local shift'},
    admission:{outside:7,inside:3,words:'secured an agreed place in the community'},
    declined:{outside:-3,inside:0,words:'was refused by the admissions meeting'},
    freight:{outside:4,inside:4,words:'delivered the promised consignment'},
    assault:{outside:-16,inside:0,words:'was attacked on arrival'},
    invasion:{outside:-22,inside:0,words:'reported a territorial attack by the watch'},
    trespass:{outside:0,inside:-10,words:'entered disputed land with an attacking party'},
    removal:{outside:-12,inside:0,words:'was physically turned back'}
  };
  function recordReception(world,site,origin,guest,kind,actor){
    if(!origin||!guest||!actor||origin.id===site.id||!encounters[kind])return;
    const records=local(site).entryRecords||=[];
    const guestKey=guest.identityKey||root.EarthPersonas.identityKey(origin.id,guest.id),actorId=actor.id||'assembly';
    if(records.some(e=>e.week===world.week&&e.guestKey===guestKey&&e.kind===kind&&e.actorId===actorId&&e.actorName===actor.name))return;
    // The visitor can testify to a confrontation. A register of names does
    // not imply that another resident witnessed the physical encounter.
    const official=!['removal','assault'].includes(kind)||currentRule(site)==='hosted'&&(kind==='assault'||delegates(site).some(d=>d.id===actor.id));
    const entry={week:world.week,originId:origin.id,guestKey,guestName:guest.name,kind,
      actorId,actorName:actor.name,official,
      reported:world.week+Math.max(1,Math.min(4,Math.ceil(km(site,origin)/6)))};
    records.unshift(entry);if(records.length>36)records.pop();
    return entry;
  }
  function confrontation(world,site,targetId){
    const host=hostFor(site),who=root.EarthPersonas.profile(site,targetId),a=world.communityLife;
    const entry=recordReception(world,site,lookup(world,a.homeId),a.profile,'removal',who);
    if(entry)site.communityLife.visitorIncidents=Math.min(1000,(site.communityLife.visitorIncidents||0)+1);
    const official=entry?.official??(currentRule(site)==='hosted'&&delegates(site).some(d=>d.id===targetId));
    return who.name+' shoves you back and ends the exchange. '+(official?'The gate rota authorised the removal.':'This was a resident’s own action. The admissions desk records your account.')+' Speak to '+host.name+' in Towns for an introduction.';
  }
  function personalAccess(world,site,visitor=world.communityLife.profile){
    const visit=visitor.identityKey===world.communityLife.profile.identityKey?site.communityLife?.visits?.steward:null;
    const voices=[],key=visitor.identityKey;
    let backing=0,opposition=0;
    for(const [id,row] of Object.entries(site.autonomy?.people||{})){
      if(!row.ties?.length||!present(site,id)||commuting(site,id)||residency(site,id)!=='member')continue;
      const strength=root.EarthRelationships?.strength(row,visitor,world.week)||0;
      if(Math.abs(strength)<2)continue;
      const name=root.EarthPersonas.profile(site,id)?.name;
      if(name){voices.push({name,strength});if(strength>0)backing++;else opposition++;}
    }
    const service=(site.communityLife?.entryRecords||[]).filter(e=>e.guestKey===key&&(e.kind==='shift'||e.kind==='freight')).length;
    const incursions=(site.communityLife?.entryRecords||[]).filter(e=>e.kind==='trespass'&&e.guestKey===key).length;
    if(incursions)voices.push({name:'Boundary register · '+incursions+' witnessed incursion'+(incursions===1?'':'s'),strength:-2});
    opposition+=incursions;
    const introduced=!!visit?.met||!!site.communityLife?.entryRecords?.some(e=>e.guestKey===key&&e.kind==='introduction');
    const known=introduced||service>0||backing>opposition;
    const score=cap(40+Math.min(18,backing*6)-Math.min(24,opposition*8)+(introduced?12:0)+
      Math.min(18,6*Math.max(service,visit?.shifts||0)));
    return {known,score,voices,service,visit};
  }
  function bilateralTrust(world,site,origin){
    const rule=currentRule(site),passage=root.EarthRegionalWorld?.passageAgreement?.(world,origin,site)!==false;
    let honoured=0,credit=0;
    for(const e of site.communityLife?.entryRecords||[]){
      if(e.originId!==origin.id||!encounters[e.kind].inside)continue;
      if(encounters[e.kind].inside>0)honoured++;credit+=encounters[e.kind].inside;
      if(rule==='exchange'&&e.kind==='freight'||rule==='hosted'&&e.kind==='shift'||rule==='welcome'&&e.kind==='admission')credit+=2;
    }
    const value=rule==='exchange'?'Completed return loads carry most weight here.':rule==='hosted'?'The gate meeting values supervised service.':'Making a home for a newcomer earns extra credit here.';
    return {score:cap(50+Math.min(24,credit)-(passage?0:24)),honoured,passage,value};
  }
  function entryRestriction(world,site,visitor=world.communityLife.profile){
    if(!site||isHome(world,site)||currentRule(site)!=='hosted')return null;
    const introduced=visitor.identityKey===world.communityLife.profile.identityKey&&site.communityLife?.visits?.steward?.met;
    if(introduced)return null;
    const objectors=objectionsTo(world,site,visitor);
    if(objectors.length<2)return null;
    const pass=site.communityLife?.entryPass;
    if(pass?.guestKey===visitor.identityKey&&world.week>=pass.opens&&world.week<=pass.until)return null;
    const pending=pass?.guestKey===visitor.identityKey&&world.week<pass.opens;
    const reason=pending?pass.host+' can receive you from week '+pass.opens+' to '+pass.until+'.':
      objectors.slice(0,2).join(' and ')+' reported earlier disagreements. The gate meeting requires a scheduled visit with the host.';
    return {pending,reason,host:hostFor(site)};
  }
  function hostedVisit(world,site){
    const required=entryRestriction(world,site);if(required)return required;
    if(!site||isHome(world,site)||currentRule(site)!=='hosted'||!root.EarthBorderConflict?.profile(site).closed)return null;
    const guest=world.communityLife.profile,pass=site.communityLife.entryPass;
    const origin=lookup(world,world.activeId)||lookup(world,world.communityLife.homeId);
    if(personalAccess(world,site,guest).known||bilateralTrust(world,site,origin).score>=66||pass?.guestKey===guest.identityKey&&world.week>=pass.opens&&world.week<=pass.until)return null;
    return {host:hostFor(site),optional:true,pending:pass?.guestKey===guest.identityKey&&world.week<pass.opens,
      reason:'The boundary watch will challenge an uninvited visitor. The admissions host offers a dated visit.'};
  }
  function testimonyValue(event,observerRule,relayed){
    // The same removal carries a different meaning under hosted entry.
    const effect=event.kind==='removal'&&event.official&&observerRule==='hosted'?-4:encounters[event.kind].outside;
    return relayed?Math.trunc(effect*.65):effect;
  }
  function reputationAt(world,destination,origin){
    if(!destination.communityLife?.entryRecords?.length)return 50;
    let value=50;
    const rule=currentRule(origin);
    for(const e of destination.communityLife?.entryRecords||[]){
      if(e.reported>world.week)continue;
      if(e.originId===origin.id)value+=testimonyValue(e,rule,false);
      else if(e.relays?.some(r=>r.to===origin.id))value+=testimonyValue(e,rule,true);
    }
    return cap(value);
  }
  function entryAssessment(world,site,origin=lookup(world,world.communityLife.homeId),visitor=world.communityLife.profile){
    const character=communityCharacter(site),rule=currentRule(site),host=hostFor(site),personal=personalAccess(world,site,visitor);
    const bilateral=bilateralTrust(world,site,origin),restriction=entryRestriction(world,site,visitor);
    const reputation=[];
    const reports=new Map();
    function report(to,e,received,carrier){
      if(!reports.has(to))reports.set(to,[]);
      reports.get(to).push({e,received,carrier});
    }
    for(const e of site.communityLife?.entryRecords||[]){
      if(e.reported<=world.week)report(e.originId,e,e.reported,null);
      for(const relay of e.relays||[])report(relay.to,e,relay.week,relay.carrier);
    }
    for(const [id,accounts] of reports){
      const peer=lookup(world,id);if(!peer)continue;
      const observerRule=currentRule(peer);
      // Both towns read the same signed account. A hosted town distinguishes
      // enforcement approved by the gate rota from a resident acting alone.
      function score(rows){
        return cap(50+rows.reduce((sum,{e,carrier})=>sum+testimonyValue(e,observerRule,carrier),0));
      }
      accounts.sort((a,b)=>b.received-a.received||b.e.week-a.e.week);
      const {e,received,carrier}=accounts[0],current=score(accounts),prior=score(accounts.filter(row=>row.received<received));
      const witnesses=new Set(accounts.map(row=>row.e.guestKey));
      const confidence=witnesses.size>2?'several witnesses':witnesses.size===2?'two witnesses':'one witness';
      reputation.push({observer:peer.name,score:current,trend:current>prior?'rising':current<prior?'falling':'steady',
        confidence:confidence+(accounts.every(row=>row.carrier)?', relayed reports':''),count:accounts.length,
        reason:e.guestName+' '+encounters[e.kind].words+' in week '+e.week+' ('+e.actorName+', '+(e.official?'under local authority':'acting personally')+'). '+
          (carrier?carrier+' brought the account in week '+received:'Report arrived in week '+received)+'.'});
    }
    return {character,rule:entryRules[rule],history:entryRules[foundingRule(site)].history,decision:site.communityLife?.entryDecision,
      host:host.name,personal,originTrust:bilateral.score,originName:origin.name,fulfilled:bilateral.honoured,passage:bilateral.passage,values:bilateral.value,reputation,
      expected:restriction?restriction.reason:isHome(world,site)?'You belong to this community.':personal.known?'A named introduction, completed service or local supporter opens the exchange.':
      rule==='hosted'&&bilateral.score>=66?'Your home community’s delivery and service record opens the exchange. Private introductions still go through '+host.name+'.':
      character.border?.closed?'The boundary watch confronts people who enter uninvited. A sponsor or a recognised trading relationship changes the reception.':
      rule==='hosted'?'Report to '+host.name+' before seeking work. Some residents physically turn away unintroduced strangers.':
      rule==='exchange'?'The exchange receives visitors. Individual households may ask for a sponsor.':'The kitchen receives visitors. Residents decide individually which invitations to offer.'};
  }
  function carryReceptionReport(world,from,to,carrier){
    const geo=root.EarthRegionalWorld?.geography(world,from);
    if(!geo||!carrier)return;
    let selected=null;
    for(const {site} of geo.towns){
      if(site.id===from.id||site.id===to.id)continue;
      for(const e of site.communityLife?.entryRecords||[]){
        if(e.originId!==from.id||e.reported>world.week||e.relays?.some(r=>r.to===to.id)||e.relays?.length>=3)continue;
        if(!selected||e.reported>selected.reported)selected=e;
        break;
      }
    }
    if(selected)(selected.relays||=[]).push({to:to.id,week:world.week,carrier});
  }
  function reviewEntryArticles(world,site){
    const c=site.communityLife;
    if(!c?.entryRecords?.length||world.week%4!==0||world.week-(c.entryDecision?.week||site.founded)<8)return '';
    const cutoff=Math.max(world.week-12,c.entryDecision?.week||0);
    const records=c.entryRecords.filter(e=>e.week>cutoff);
    if(new Set(records.map(e=>e.guestKey)).size<2||delegates(site).length<2)return '';
    const {tally}=communityCharacter(site),voters=tally.welcoming+tally.guarded+tally.forceful;
    const current=currentRule(site),term=world.legacy?.term;
    const leader=term?.siteId===site.id&&present(site,term.residentId)&&root.EarthPersonas.profile(site,term.residentId);
    const host=leader||hostFor(site),chair=leader||root.EarthPersonas.profile(site,host.id);
    const sponsor=chair&&visitorStance(site,chair);
    const welcomed=records.filter(e=>['admission','shift','freight'].includes(e.kind)).length;
    const opposed=records.filter(e=>e.kind==='removal').length;
    const next=tally.forceful*2>voters&&sponsor!=='welcoming'&&opposed>=2?'hosted':
      tally.welcoming*2>voters&&sponsor!=='forceful'&&welcomed>=2?'welcome':current;
    if(next===current)return '';
    c.entryDecision={week:world.week,rule:next,host:host.name};
    return writeLog(site,world.week,host.name+' recorded the assembly’s vote for '+entryRules[next].label.toLowerCase()+' after hearing '+welcomed+' reports of cooperation and '+opposed+' confrontations.');
  }
  function communityCharacter(site){
    const border=root.EarthBorderConflict?.profile(site);
    const tally=border?.tally||{welcoming:0,guarded:0,forceful:0};
    if(!border)for(const p of root.EarthPersonas?.list(site,{includeCommuters:false})||[]){
      if(!commuting(site,p.id)&&residency(site,p.id)==='member')tally[visitorStance(site,p)]++;
    }
    const count=tally.welcoming+tally.guarded+tally.forceful||1,force=tally.forceful/count,welcome=tally.welcoming/count;
    const type=force>.5?'Hostile to unintroduced visitors':welcome>.5?'Welcoming with introductions':tally.guarded/count>.5?'Guarded and private':'Divided over visitors';
    const trust=cap(Math.round(.55*site.trust+45*(welcome+.45*tally.guarded/count)),0,100);
    const reputation=cap(Math.round(50+24*(welcome-force)+.2*(site.wellbeing-50)+
      Math.min(18,(site.stats?.kept||0)*3+(site.stats?.deliveries||0))-Math.min(24,(site.communityLife?.visitorIncidents||0)*4)),0,100);
    const risk=border?.closed?'Closed border · physical entry risks a fight':entryRules[currentRule(site)].label;
    return {type,trust,reputation,tally,aggression:border?.score,border,summary:type+' · '+risk+(border?' · aggression '+border.score+'/100':''),
      detail:tally.welcoming+' welcoming, '+tally.guarded+' guarded, '+tally.forceful+' willing to use force.'};
  }
  function visitorReception(world,site,id){
    if(!world.communityLife||isHome(world,site)||root.EarthAgency?.actorId(site)!=='steward')return null;
    const p=root.EarthPersonas?.profile(site,id);if(!p)return null;
    const host=hostFor(site),visit=site.communityLife?.visits?.steward;
    if(id===host.id)return {greeting:'I receive visitors here. You can introduce yourself in Towns.'};
    if(visit?.help)return null;
    if(visit?.met)return {greeting:host.name+' has introduced you. What would you like to know?'};
    const stance=visitorStance(site,p);
    if(personalAccess(world,site).known)return {greeting:'Someone here has vouched for you. You can come to the exchange.'};
    if(stance==='forceful')return {greeting:'Keep your distance. Speak to '+host.name+' before approaching me.',repels:true};
    if(stance==='guarded')return {greeting:'I can talk about the district. Personal matters wait until '+host.name+' introduces you.',private:true};
    return {greeting:'Welcome to '+site.name+'. I can tell you about life here. '+host.name+' handles introductions.'};
  }
  function journeyBlock(site){
    if(site.shift)return 'Finish the shared day before travelling.';
    if(site.purses?.tickets?.steward)return 'Finish or cancel the paid stock check before leaving the district.';
    if(site.fleet?.custody?.actor==='steward')return 'Return the co-op vehicle before setting off.';
    return '';
  }
  function reception(world,site){
    const a=world.communityLife,v=site.communityLife?.visits?.steward||{},host=hostFor(site),own=lookup(world,a.homeId);
    const person=portable(own,'steward')||a.profile,f=fit(site,person,Boolean(v.met));
    const concerned=objectionsTo(world,site,person);
    const housing=root.EarthHousing?.quote(world,site,own,'steward');
    const residence=housing?(housing.reason||housing.label+' costs '+housing.price+' personal funds. You hold '+housing.balance+'.'):Math.max(0,room(site))+' places free.';
    const checks=[
      {label:'Named sponsor',pass:Boolean(v.met&&host.id),detail:!host.id?'The district is training an admissions delegate.':v.met?(v.hostName||host.name)+' recorded your introduction.'+(v.hostId&&v.hostId!==host.id?' '+host.name+' receives the application after the handover.':''):'Meet '+host.name+' on the street.'},
      {label:'Useful contribution',pass:Boolean(v.help),detail:v.help?'Your trial shift is in the roster.':'Take a trial shift '+f.need+'.'},
      {label:'Time to decide',pass:Boolean(v.met&&world.week>v.met),detail:v.met?'The council can decide from week '+(v.met+1)+'.':'Members consider applications the week after an introduction.'},
      {label:'Housing and meals',pass:(housing?housing.available:room(site)>=1)&&site.food>=meals(site),detail:residence+' '+site.food+' food held, '+meals(site)+' needed for the enlarged household.'},
      {label:'Community agreement',pass:site.trust>=35,detail:site.trust>=35?'The council is hearing applications.':'Members have paused new admissions while resolving local disputes.'}
    ];
    if(!f.match)checks.push({label:'Skill and training fit',pass:(v.shifts||0)>=2,detail:'Your experience is outside the vacancy. A second supervised trial lets the host judge the fit.'});
    if(concerned.length>=2)checks.push({label:'Rebuild local confidence',pass:(v.shifts||0)>=3,
      detail:concerned.slice(0,2).join(' and ')+' remember arrangements that fell through. The council asks for three separate trial shifts ('+(v.shifts||0)+'/3).'});
    return {checks,housing,needsTrial:(v.shifts||0)<Math.max(f.match?1:2,concerned.length>=2?3:1),available:checks.every(c=>c.pass),host:host.name,hostId:host.id,hostType:site.residents.some(p=>p.id===host.id)?'resident':'npc',apprentice:!f.match,employer:f.employer};
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
    if(root.EarthCouncilHomes?.work(site,id))return 'Has a paid cottage shift on the town building register.';
    const now=world?.week||site.autonomy?.week||site.founded||1, resident=site.residents.find(p=>p.id===id);
    const name=key=>root.EarthPersonas?.profile?.(site,key)?.name||'a neighbour';
    const here=local(site),career=site.careers?.[id],fleet=site.fleet;
    if(root.EarthPractice?.reserved?.(site,id,now))return 'Booked for a practice session with another resident this week.';
    if(here.hearing?.id===id&&now<here.hearing.due)return 'Asked to speak at the district meeting in week '+here.hearing.due+'.';
    if((world?.communityLife?.duty.siteId||world?.communityLife?.homeId)===site.id&&world.communityLife.duty.coveredBy===id)
      return 'Agreed to cover the home pantry round through week '+world.communityLife.duty.due+'.';
    if(here.freight?.signer===id)return 'Agreed to escort a district consignment through week '+here.freight.due+'.';
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
    if(fleet?.incident?.actor===id&&(root.EarthFleet?.identified?.(site,id)??true))return 'Owes a restitution shift to the displaced transport crew.';
    if(id==='driver'&&fleet?.custody)return 'Holding the dispatch handover until the truck returns.';
    if(fleet?.roster?.[id]?.ready>now)return 'Completing transport induction through week '+fleet.roster[id].ready+'.';
    const council=site.civicInitiatives?.active;
    if(council&&(council.leadId===id||council.votes?.some(v=>v.personId===id)))
      return 'Taking part in the council decision about '+(council.title||'the current proposal')+'.';
    const errand=(site.agency?.arrangements?.rows||[]).find(r=>['asked','agreed'].includes(r.status)&&
      (r.dueWeek>=now||r.workWeek===now)&&[r.actorId,r.requesterId,r.contactId].includes(id));
    if(errand)return 'Meeting '+name(errand.actorId===id?errand.requesterId:errand.actorId)+' for an errand due in week '+errand.dueWeek+'.';
    const booking=site.residents.find(p=>p.promise?.handover?.worker===id&&root.EarthNeighbourErrands?.deliveryWorker?.(site,p)===id);
    if(booking)return 'Booked to carry '+booking.name+'’s delivery in week '+booking.promise.dueWeek+'.';
    const creditor=site.residents.find(p=>p.promise?.by===id);
    if(creditor)return 'Promised '+creditor.name+' supplies by week '+creditor.promise.dueWeek+'.';
    const projects=site.autonomy?.projects?.owners||{},partner=Object.entries(projects).find(([other,p])=>p.volunteer&&(other===id||p.volunteer.from===id));
    if(partner)return 'Agreed to a project session with '+name(partner[0]===id?partner[1].volunteer.from:partner[0])+'.';
    if(id===site.agency?.actor)return 'You are experiencing this person’s day. Return to your original character to discuss travel.';
    if(site.purses?.tickets?.[id])return 'Has a paid stock check to settle at the local exchange.';
    if(career?.application&&['screening','offer','notice'].includes(career.application.phase))return 'Waiting for the local employer to review the application in week '+career.application.dueWeek+'.';
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
  function closeLife(world,site,id){
    // The same checks used for a lasting move protect the original character,
    // participants in active agreements and people still carrying goods.
    if(id==='steward'||site.population<=1||!candidates(site,world).includes(id)||root.EarthDistrictGrowth?.work(site,id)||
      site.housing?.contracts?.some(c=>c.id===id||c.worker===id&&c.week===world.week))return false;
    const c=local(site),person=root.EarthPersonas.profile(site,id);
    const good=workGood(root.EarthCareers?.work(site,id)?.occupation||person.originRole);
    root.EarthCareers?.departureForMove?.(world,site,id);
    (c.vacancies||=[]).push({name:person.name,good,through:world.week+2});
    awaySlot(site,id,'elsewhere');
    if(c.people[id])c.people[id].status='former';
    site.population--;
    return true;
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
    const round=site.autonomy?.people?.steward?.history?.find(h=>h.pantryRound===a.due&&h.week===a.due-1);
    const completedOnShift=round&&present(site,'steward')&&(!world.communityLife?.journey||world.communityLife.journey.from!==site.id);
    const name=world.communityLife.profile.name,good=a.attended||completedOnShift||Boolean(a.coveredBy&&present(site,a.coveredBy));
    const helper=a.coveredBy&&root.EarthPersonas?.profile(site,a.coveredBy)?.name;
    a.reliability=cap(a.reliability+(good?1:-1),-6,6);site.trust=cap(site.trust+(good?1:-1));
    const text=good?(helper?helper+' covered '+name+'’s agreed pantry round.':name+' completed the agreed pantry round.')+' Neighbours gained one trust.':
      name+'’s pantry round had no handover. The next shift did the count late. Trust fell by one.';
    delete local(site).pantryCover;
    a.due=world.week+3;a.siteId=world.communityLife.homeId;a.coveredBy=null;a.attended=false;
    return [writeLog(site,world.week,text)];
  }
  function beginInspection(world,from,to,id,{motive,plan,invited=false}={}){
    const p=portable(from,id),old=local(from).people[id];
    if(!p||!present(from,id))return null;
    const regional=root.EarthRegionalWorld;
    if(regional&&!regional.passageAgreement(world,from,to))return null;
    const path=plan?.path||regional?.crossingPath(world,from,to);if(path===null)return null;
    const refused=root.EarthBorderConflict?.entry(world,from,to,p,invited);
    if(refused){writeLog(from,world.week,refused);writeLog(to,world.week,refused);return null;}
    const next=guestSlot(to,p,old?.originId||from.id,old?.originSlot||id,'visitor',world.week);
    if(!next||!local(to).people[next])return null;
    const guest=local(to).people[next];guest.visitFrom=from.id;guest.visitSlot=id;guest.inspects=world.week+1;
    if(motive)guest.motive=motive.slice(0,500);
    awaySlot(from,id,to.id);
    if(path)regional.shareCrossing(world,from,to,id,p.name,path,plan?.travelIndex);
    const text=p.name+' arrived from '+from.name+' to inspect '+to.name+'’s '+(kind(to).goods==='food'?'shared kitchen':'workplaces')+' and meet the households. '+p.name+' will decide after a week.';
    writeLog(from,world.week,p.name+' took a week away to inspect '+to.name+'.');writeLog(to,world.week,text);
    return text;
  }
  function visitorFit(world,site,id){
    const guest=site?.communityLife?.people?.[id];
    if(!world||!guest||guest.status!=='visitor'||!present(site,id))return null;
    const home=lookup(world,guest.visitFrom);if(!home)return null;
    const contacts=tiesAt(world,home,guest.visitSlot,site),concerned=objectionsTo(world,site,guest.profile),known=Boolean(guest.welcomed||contacts.length),match=fit(site,guest.profile,known);
    const ties=links(home,guest.visitSlot);
    const housing=root.EarthHousing?.quote(world,site,home,guest.visitSlot);
    const space=housing?housing.available:room(site)>0,food=site.food>=meals(site),open=site.trust>=42;
    return {homeId:home.id,homeName:home.name,reviewWeek:guest.inspects,known,contacts,concerned,space,food,open,housing,
      skillMatch:match.match,need:match.need,lifestyle:match.policy.life,employer:match.employer,
      ties:ties.map(key=>({id:key,name:root.EarthPersonas?.profile(home,key)?.name||'a neighbour'})),
      localYes:space&&food&&open&&concerned.length<2&&(match.match||known),
      personalYes:match.appeal+Number(known)+Number(home.trust<38)-Math.min(2,ties.length)>=4};
  }
  function acceptVisitor(world,site,id,review=visitorFit(world,site,id)){
    const g=site?.communityLife?.people?.[id],from=g&&lookup(world,g.visitFrom);
    if(!review||!g||g.status!=='visitor'||!from||from.population<=1||!Number.isSafeInteger(site.population+1)||
      !portable(from,g.visitSlot)||!present(site,id))return {ok:false,message:'This visit is no longer eligible for admission.'};
    if(!review.localYes||!review.personalYes){
      const why=!review.localYes?(review.concerned.length>=2?review.concerned.slice(0,2).join(' and ')+' want to repair a past disagreement before sharing a household':
        review.housing?.reason||(!review.space?'no spare home is available':!review.food?'the kitchen cannot cover another household':!review.skillMatch?'the vacancy needs a different skill':'the council has paused invitations')):
        (review.ties.length?'their friendships at home matter more than the opening':'the daily work and lifestyle suit them better at home');
      return {ok:false,message:why};
    }
    const source=g.visitSlot;
    if(review.housing?.kind==='finance'){
      const result=root.EarthHousing.finance(world,site,from,source,review.housing);
      if(result.ok){writeLog(site,world.week,result.message);writeLog(from,world.week,result.message);}
      return result;
    }
    if(review.housing&&!root.EarthHousing.pay(world,site,from,source,review.housing))return {ok:false,message:'The applicant could not complete the housing payment.'};
    // This established visitor already owns a destination street slot. The
    // checks above are the only failure conditions in a handover to that slot.
    movePerson(world,from,site,source,id);
    if(review.housing){
      root.EarthHousing.grant(world,site,id,review.housing);
      root.EarthHousing.sync(world,from);root.EarthHousing.sync(world,site);
    }
    recordReception(world,site,from,g.profile,'admission',hostFor(site));
    const message=g.profile.name+' accepted a place in '+site.name+'. '+(review.housing?'They secured '+review.housing.label+' for '+review.housing.price+' personal funds. ':'')+
      'The residents offered housing and valued help '+review.need+'. '+from.name+' has one fewer resident on its rota.';
    writeLog(from,world.week,message);writeLog(site,world.week,message);
    return {ok:true,message,id};
  }
  function reviewVisitors(world,site){
    const notes=[];
    for(const [id,g] of Object.entries(site.communityLife?.people||{})){
      if(g.status!=='visitor'||!present(site,id)||world.week<g.inspects)continue;
      const from=lookup(world,g.visitFrom);if(!from)continue;
      if(site.housing?.contracts?.some(c=>c.id===id))continue;
      const review=visitorFit(world,site,id),result=acceptVisitor(world,site,id,review);
      if(result.ok){notes.push(result.message);continue;}
      if(review?.space&&review.food&&!review.localYes)recordReception(world,site,from,g.profile,'declined',hostFor(site));
      const text=g.profile.name+' returned to '+from.name+'. '+result.message;
      const returnSlot=g.visitSlot;awaySlot(site,id,from.id);g.status='former';delete g.visitFrom;delete g.visitSlot;delete g.inspects;
      delete local(from).away[returnSlot];
      writeLog(from,world.week,text);notes.push(writeLog(site,world.week,text));
    }
    return notes;
  }
  function objectionsTo(world,site,person){
    const opposed=[];
    for(const [id,row] of Object.entries(site.autonomy?.people||{})){
      if(commuting(site,id)||residency(site,id)!=='member'||!row.ties?.some(t=>t.strength<=-3))continue;
      if((root.EarthRelationships?.strength(row,person,world.week)||0)<=-3){
        const local=root.EarthPersonas?.profile(site,id);if(local)opposed.push(local.name);
      }
    }
    return opposed;
  }
  function tiesAt(world,from,id,to,peers){
    const row=from.autonomy?.people?.[id];
    if(!row?.ties?.length)return [];
    return (peers||root.EarthPersonas?.list(to,{includeCommuters:false})||[]).filter(peer=>residency(to,peer.id)==='member'&&!commuting(to,peer.id)&&
      (root.EarthRelationships?.strength(row,peer,world.week)||0)>=2).map(peer=>peer.name);
  }
  function availableDestinations(world,site){
    return neighbours(world,site).filter(v=>v.distance<=70).map(v=>lookup(world,v.id)).filter(dest=>dest.food>=meals(dest)&&dest.trust>=42&&inspectable(world,dest));
  }
  function chooseDestination(world,site,id,places=availableDestinations(world,site)){
    const p=portable(site,id);if(!p)return null;
    let best=null,top=-1;
    for(const dest of places){
      if(!inspectable(world,dest,site,id))continue;
      if(currentRule(dest)==='hosted'&&root.EarthBorderConflict?.profile(dest).closed){
        const pass=dest.communityLife.entryPass;
        const safe=pass?.guestKey===p.identityKey&&world.week>=pass.opens&&world.week<=pass.until;
        if(!safe&&!personalAccess(world,dest,p).known&&bilateralTrust(world,dest,site).score<66)continue;
      }
      const contacts=tiesAt(world,site,id,dest),match=fit(dest,p,contacts.length>0);
      // A marginal choice can turn on news that actually reached the person’s
      // town. Personal contacts still weigh more than a second-hand account.
      const experience=(reputationAt(world,dest,site)-50)/50;
      const score=match.appeal+Math.min(2,contacts.length)+experience;
      if(match.match&&(score>top||score===top&&dest.trust>best.trust)){best=dest;top=score;}
    }
    return best;
  }
  function settleFieldCamp(world,from,trip,point,makeSite){
    if(!makeSite||from.population<=trip.crew.length)return null;
    const profiles=trip.crew.map(p=>portable(from,p.id));
    if(profiles.some(p=>!p))return null;
    const purpose=foundingPurpose(profiles),id='field-'+world.regionalWorld.step+'-'+from.id;
    if(lookup(world,id))return null;
    const site=makeSite({id,name:profiles[0].name+'’s '+purpose.suffix,region:from.region,point,
      water:point.water,names:['Housing delegate','Work delegate','Admission delegate'],old:null,offer:{newPopulation:0}});
    site.founded=world.week;site.specialty=purpose.goods;
    Object.assign(site,trip.kit);
    if(root.EarthMarket)site.exchange=root.EarthMarket.foundingExchange(world.week);
    // Reserved street slots stay empty. Every household on this roll actually
    // came from the named crew, with its purse and qualifications.
    seedHouseholds(site,3,world.week);
    const c=local(site);Object.assign(c,{cluster:from.communityLife.cluster,district:purpose.district,foundingPlaces:Math.max(1,Math.min(18,trip.crew.length-1)),
      habitat:root.EarthResources?.environment?.(site)||'mixed',deputies:[]});
    c.away.steward='elsewhere';
    for(const placeholder of site.residents)c.away[placeholder.id]='outside-roster';
    for(const member of trip.crew){
      const moved=movePerson(world,from,site,member.id);
      if(moved)c.deputies.push({id:moved.id,name:moved.name,week:world.week});
    }
    world.communityLife.outposts.push(site);
    writeLog(site,world.week,trip.crew.map(p=>p.name).join(' and ')+' settled here with '+site.food+' food, '+site.materials+' materials and '+site.funds+' funds transferred from '+from.name+'.');
    return site;
  }
  function groupSettlement(world,site,makeSite){
    const c=local(site),old=c.foundingPlan;
    if(!old){
      const people=volunteers(site,world),kit={food:4,materials:2,funds:2};
      if(people.length<2||site.population<5||!makeSite||Object.entries(kit).some(([k,n])=>uncommitted(site,k)<n))return '';
      const candidate=founderSurvey(world,site);if(!candidate)return '';
      for(const [k,n] of Object.entries(kit))site[k]-=n;
      const {path,...point}=candidate;
      c.foundingPlan={members:people.map(p=>p.id),kit,ready:world.week+2,point};
      if(path)c.foundingPlan.path=path;
      const text=people.map(p=>p.name).join(' and ')+' asked nearby households about starting a settlement. The council released 4 food, 2 materials and 2 funds for their household shares after protecting home commitments. They will reconsider in week '+c.foundingPlan.ready+'.';
      return writeLog(site,world.week,text);
    }
    if(world.week<old.ready)return '';
    for(const id of old.members)if(c.away[id]==='regional-visit')delete c.away[id];
    const free=old.members.every(id=>present(site,id)&&transferable(site,id,world));
    if(!free||c.strain<3||site.population<5){
      for(const [k,n] of Object.entries(old.kit))site[k]+=n;
      delete c.foundingPlan;c.lastExit=world.week;
      return writeLog(site,world.week,'The prospective founders chose to stay after reviewing the handovers and local conditions. Their reserved food, materials and funds returned to the stores.');
    }
    const people=old.members.map(id=>portable(site,id)),purpose=foundingPurpose(people);
    const name=people[0].name+'’s '+purpose.suffix,id='circle-'+site.id+'-'+world.week;
    const point=old.point&&stores(world).every(s=>km(s,old.point)>=10)?old.point:founderSurvey(world,site);
    if(!point){
      for(const [k,n] of Object.entries(old.kit))site[k]+=n;
      delete c.foundingPlan;c.lastExit=world.week;
      return writeLog(site,world.week,'The founders found no unoccupied site within travelling distance. Their reserved supplies returned to the stores.');
    }
    const newHome=makeSite({id,name,region:site.region,point,water:site.water,names:['Cass','Min','Rae'],old:null,offer:{newPopulation:3}});
    if(root.EarthMarket)newHome.exchange=root.EarthMarket.foundingExchange(world.week);
    newHome.founded=world.week;newHome.specialty=purpose.goods;Object.assign(newHome,old.kit);seedHouseholds(newHome,newHome.population,world.week);
    Object.assign(local(newHome),{cluster:site.communityLife.cluster,district:purpose.district,foundingPlaces:3,habitat:root.EarthResources?.environment?.(newHome)||'mixed'});local(newHome).away.steward='elsewhere';
    const moved=old.members.map(personId=>movePerson(world,site,newHome,personId));
    world.communityLife.outposts.push(newHome);
    const course=point===old.point?old.path:point.path;
    if(course)root.EarthRegionalWorld?.shareCrossing(world,site,newHome,old.members[0],people[0].name,course,point===old.point?old.travelIndex:undefined);
    delete c.foundingPlan;c.lastExit=world.week;
    const text=moved.map(person=>person.name).join(' and ')+' joined three neighbouring households to found '+name+'. Their skills and interests shaped its first joint undertaking, '+purpose.purpose+'. They brought the food, repair stock and funds set aside for them. '+site.name+' has two fewer residents to cover its shifts.';
    writeLog(newHome,world.week,text,true);return writeLog(site,world.week,text);
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
    const places=availableDestinations(world,site);
    for(const {id,ties,p} of options){
      if(ties>=3&&site.trust>=23||p.traits.adaptability<26)continue;
      const dest=chooseDestination(world,site,id,places);if(!dest)continue;
      const text=beginInspection(world,site,dest,id);if(!text)continue;
      c.lastExit=world.week;notify(site,p.name+' left to inspect '+dest.name+' after '+c.strain+' difficult weeks.');notify(dest,text);break;
    }
  }
  function movingOptions(world,site){
    if(!site||!world.communityLife)return [];
    const eligible=new Set(candidates(site,world)),places=availableDestinations(world,site);
    return (root.EarthPersonas?.list?.(site)||[]).filter(p=>p.id!=='steward'&&residency(site,p.id)==='member').map(p=>{
      const destination=eligible.has(p.id)?chooseDestination(world,site,p.id,places):null,job=root.EarthCareers?.work?.(site,p.id);
      const ties=links(site,p.id,world.week),wait=local(site).excursions?.[p.id];
      const fitHere=fit(site,p),fitThere=destination?fit(destination,portable(site,p.id)):null;
      const curious=Boolean(fitThere&&(site.trust<38||site.food<meals(site)||site.population>house(site)||
        fitThere.appeal>=fitHere.appeal&&p.traits.curiosity+p.traits.adaptability-12*ties.length>=102));
      const tied=tiesSummary(site,p.id),contacts=destination?tiesAt(world,site,p.id,destination):[],booking=site.communityLife?.offers?.[p.id];
      const reason=wait?'Preparing to inspect '+(lookup(world,wait.to)?.name||'the neighbouring district')+' in week '+wait.due+'.':
        !eligible.has(p.id)?departureReason(site,p.id,world):
        !destination?'There is no nearby opening with housing, meals and a use for their skills.':
        contacts.length?'They know '+contacts.slice(0,2).join(' and ')+' in '+destination.name+'. '+(tied?'They also have ties to '+tied+' here.':'A familiar household could help them settle in.'):
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
      if(to.food<meals(to)||to.trust<35||!inspectable(world,to))return true;
      let seats=2;
      plan.pending=plan.pending.filter(id=>{
        if(!seats||!present(from,id)||!transferable(from,id,world)||from.communityLife?.excursions?.[id]||!inspectable(world,to,from,id))return true;
        const message=beginInspection(world,from,to,id,{invited:true});if(!message)return true;
        seats--;notify(from,writeLog(from,world.week,root.EarthPersonas.profile(from,id).name+' followed the agreed group route to '+to.name+'.'));notify(to,message);return false;
      });
      return plan.pending.length>0;
    });
  }
  function excursions(world,site,notify){
    const c=site.communityLife;if(!c?.excursions)return;
    for(const [id,plan] of Object.entries(c.excursions)){
      if(plan.due>world.week)continue;
      const name=root.EarthPersonas?.profile(site,id)?.name||'A resident',dest=lookup(world,plan.to);
      const region=root.EarthRegionalWorld;
      if(dest&&region){
        const course=plan.path?region.remainingCrossing(world,site,plan.path,plan.travelIndex):region.crossingPath(world,site,dest);
        if(course===null||!region.passageAgreement(world,site,dest)){
          plan.due=world.week+1;
          notify(site,writeLog(site,world.week,name+' is waiting for an accessible passage to '+dest.name+' before the agreed housing visit.'));continue;
        }
        if(course)plan.path=course;
      }
      delete c.excursions[id];
      if(c.away[id]==='regional-visit')delete c.away[id];
      if(!dest||!present(site,id)||!transferable(site,id,world)||!inspectable(world,dest,site,id)){
        notify(site,writeLog(site,world.week,name+' stayed after the handover or the destination’s housing changed.'));continue;
      }
      const message=beginInspection(world,site,dest,id,{plan});
      if(message){notify(site,writeLog(site,world.week,name+' set off to inspect '+dest.name+'.'));notify(dest,message);}
    }
  }
  const recentArrivals=(site,week)=>Object.entries(site.communityLife?.people||{}).filter(([id,g])=>
    g.status==='member'&&g.originId!==site.id&&present(site,id)&&week>=g.since&&week-g.since<=10);
  function householdLife(site,week){
    const recent=recentArrivals(site,week),rounds=site.communityLife?.settling||[];
    const forArrival=([id,g])=>rounds.find(pair=>pair.entrant===id&&pair.arrived===g.since);
    const pending=recent.filter(entry=>!forArrival(entry));
    const active=recent.map(forArrival).filter(pair=>pair?.sessions===1);
    return {newcomers:recent.length,waiting:pending.length,active,completed:rounds.filter(pair=>pair.sessions===2&&week-pair.last<=10),
      capacity:1+Number(site.buildings.some(b=>b.kind==='hall'))};
  }
  function welcomeOffers(world,site,people){
    const arrivals=recentArrivals(site,world.week);
    if(!arrivals.length)return [];
    const pairs=site.communityLife.settling||[],offers=[];
    const locals=people.filter(p=>p.free&&!commuting(site,p.id)&&p.row.received?.week!==world.week);
    for(const [id,g] of arrivals){
      const entrant=locals.find(p=>p.id===id);
      if(!entrant||entrant.id==='steward'||entrant.row.energy<2)continue;
      const pair=pairs.find(a=>a.entrant===id&&a.arrived===g.since);
      if(pair&&(pair.sessions===2||pair.last===world.week))continue;
      const second=!!pair;
      for(const guide of locals){
        if(guide===entrant||guide.id==='steward'||guide.row.energy<2||second&&guide.id!==pair.guide)continue;
        const arrived=site.communityLife.people[guide.id],trained=pairs.some(a=>a.entrant===guide.id&&a.sessions===2);
        if(arrived?.status==='member'&&arrived.originId!==site.id&&world.week-arrived.since<8&&!trained)continue;
        const familiarity=root.EarthAutonomy?.bond?.(site,guide.id,entrant.id,world.week)||0;
        if(familiarity<0||!second&&!trained&&guide.traits.patience+guide.traits.sociability+guide.profile.aptitudes.communication<150)continue;
        if(!second&&entrant.traits.curiosity+entrant.traits.sociability+familiarity*9<85)continue;
        const venue=!second?'market':site.buildings.some(b=>b.kind==='hall')?'hall':kind(site).goods==='materials'?'workshop':'garden';
        const score=(second?101:85)+Math.min(5,world.week-g.since)+Math.min(6,familiarity*2)+Number(trained)*3+
          (guide.traits.patience+entrant.traits.sociability)/25;
        offers.push({kind:'welcome',self:guide,partner:entrant,score,venue,arrived:g.since,second,
          reason:second?'I agreed to introduce '+entrant.name+' to the people on the '+venue+' rota.':
            entrant.name+' has just moved here. We would both like to walk the household collection route together.'});
      }
    }
    return offers;
  }
  function meetHousehold(world,site,offer){
    const c=local(site),pairs=c.settling||=[],g=c.people[offer.partner.id],guide=offer.self,entrant=offer.partner;
    if(!g||g.since!==offer.arrived||!present(site,guide.id)||!present(site,entrant.id))return null;
    let pair=pairs.find(p=>p.entrant===entrant.id&&p.arrived===g.since);
    if(pair&&(pair.sessions===2||pair.last===world.week||pair.guide!==guide.id)||!pair&&offer.second)return null;
    const week=world.week;
    if(!pair){
      pair={guide:guide.id,guideName:guide.name,entrant:entrant.id,entrantName:entrant.name,arrived:g.since,first:week,last:week,sessions:0};
      pairs.push(pair);
      if(pairs.length>16)pairs.shift();
    }
    pair.sessions++;pair.last=week;
    const done=pair.sessions===2,place=offer.venue;
    const who=done?'Introduce '+entrant.name+' to the '+place+' rota':'Show '+entrant.name+' the household collection route';
    const taken=done?'Meet the '+place+' crew with '+guide.name:'Learn the collection route with '+guide.name;
    const common={week,venue:place,householdSession:pair.sessions,goal:done?'Find a place on the local rota':'Find my way around the new neighbourhood'};
    const leader={...common,kind:'visit',target:entrant.id,title:who,activity:who,reason:offer.reason};
    const newcomer={...common,kind:'host',target:guide.id,title:taken,activity:taken,
      reason:done?'I want to know who needs the next shift covered, and whom to ask when I need help.':'I accepted '+guide.name+'’s offer. I want to know where the pantry collects our orders.'};
    const note=done?guide.name+' introduced '+entrant.name+' to the '+place+' rota. After two shared shifts, '+entrant.name+' can guide the next household. The town gained one trust.':
      guide.name+' and '+entrant.name+' reserved their shifts to walk the collection route together. Their next meeting is a workplace introduction.';
    return {leader,newcomer,done,note:writeLog(site,week,note)};
  }
  function districtProfile(world,site){
    if(!site)return null;
    const occupations=new Map(),origins=new Map(),roll=census(world,site);
    const add=(book,key)=>book.set(key,(book.get(key)||0)+1);
    for(const p of root.EarthPersonas?.list(site)||[]){
      if(commuting(site,p.id)||residency(site,p.id)!=='member')continue;
      add(occupations,root.EarthCareers?.role(site,p.id)||p.role||p.originRole);
    }
    for(const id of census(world,site,true).ids){
      const p=root.EarthPersonas?.profile(site,id);if(!p)continue;
      const recorded=site.communityLife?.people?.[id],foreign=recorded?.originId||p.birthCommunityId;
      add(origins,foreign&&foreign!==site.id?(recorded?.originName||p.birthCommunityName||lookup(world,foreign)?.name||'Other district'):site.name);
    }
    const sorted=map=>[...map].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
    const proposal=site.civicInitiatives?.active,order=site.construction?.[0],freight=site.communityLife?.freight;
    const works=order?order.name+' on lot '+(order.plot+1)+' · '+Math.round(order.work/order.total*100)+'% built':
      proposal?proposal.leadName+' proposed '+proposal.title+'. '+proposal.status:
      site.buildings?.length?site.buildings.map(b=>b.name).join(', ')+' open.':kind(site).need;
    const trade=freight?freight.name+' is taking '+freight.amount+' '+freight.good+' to '+(lookup(world,freight.to)?.name||'a neighbouring district')+'. The agreed return of '+freight.expected+' '+(freight.good==='food'?'materials':'food')+' is due in week '+freight.due+'.':null;
    const strain=site.communityLife?.strain||0;
    const pressures=[];
    if(site.trust<34)pressures.push('trust is '+site.trust);
    if(site.wellbeing<34)pressures.push('wellbeing is '+site.wellbeing);
    if(site.food<meals(site))pressures.push('the pantry cannot cover the next round');
    if(site.population>house(site)+2)pressures.push('households exceed available beds');
    return {pressure:strain&&pressures.length?strain+' difficult week'+(strain===1?'':'s')+' · '+pressures.join(', '):null,name:site.name,population:site.population,freeBeds:Math.max(0,room(site)),census:roll,food:site.food,materials:site.materials,funds:site.funds,
      households:householdLife(site,world.week),occupations:sorted(occupations),origins:sorted(origins),works,trade,completed:site.buildings.length,research:[...site.tech]};
  }
  function spareForTrade(world,site,good){
    const floor=root.EarthCivicInitiatives?.reserve?.(world,site)||{food:2*meals(site),materials:3};
    const promised=root.EarthNeighbourErrands?.heldGoods?.(site,world.week)?.[good]||0;
    const vote=site.civicInitiatives?.active?.pledged?.[good]||0;
    return Math.max(0,Math.min(uncommitted(site,good),site[good]-floor[good]-promised-vote));
  }
  function freightSigner(world,site){
    return (root.EarthPersonas?.list(site,{includeCommuters:false})||[]).filter(p=>p.id!=='steward'&&!commuting(site,p.id)&&residency(site,p.id)==='member'&&
      !local(site).foundingPlan?.members.includes(p.id)&&!local(site).excursions?.[p.id]&&!root.EarthPurses?.committed?.(site,p.id,world.week)&&
      !root.EarthCareers?.handoverDuty?.(site,p.id,world.week)&&transferable(site,p.id,world))
      .map(person=>({person,weight:person.aptitudes.organisation+person.traits.initiative*.3+
        (/courier|driver|trader|porter/i.test(root.EarthCareers?.role(site,person.id)||person.role)?28:0)}))
      .sort((a,b)=>b.weight-a.weight||a.person.id.localeCompare(b.person.id))[0]?.person;
  }
  function districtTrade(world,sites,notify){
    const message=(site,text)=>notify(site,writeLog(site,world.week,text));
    for(const site of sites){
      const c=site.communityLife,run=c?.freight;if(!run||run.due>world.week)continue;
      const dest=lookup(world,run.to),other=dest?.communityLife?.freight;
      if(!dest||!other)continue;
      const regional=root.EarthRegionalWorld;
      const access=!regional||regional.passageAgreement(world,site,dest);
      let path=run.path;
      if(path&&access&&regional?.routeOpen(world,site,path)===false)path=regional.crossingPath(world,site,dest);
      if(!access||path===null||dest[run.good]>Number.MAX_SAFE_INTEGER-run.amount||site[other.good]>Number.MAX_SAFE_INTEGER-other.amount){
        run.due=other.due=world.week+1;
        run.held=other.held=true;
        const text=!access||path===null?'The field parties suspended this crossing. Both sealed consignments are held until a passage agreement or an accessible route is available.':
          'The district exchange held both sealed loads for another week because a receiving store is full.';
        message(site,text);message(dest,text);continue;
      }
      // Both sides settle the same exchange. A later change of terms cannot
      // strand one side's cargo after its counterpart has already been paid.
      for(const [from,to,shipment,course] of [[site,dest,run,path],[dest,site,other,path?.slice().reverse()]]){
        to[shipment.good]+=shipment.amount;
        if(course)regional?.shareCrossing(world,from,to,shipment.signer,shipment.name,course);
        message(to,shipment.name+' delivered '+shipment.amount+' '+shipment.good+' from '+from.name+' under the two districts’ exchange agreement.');
        carryReceptionReport(world,from,to,shipment.name);
        recordReception(world,to,from,root.EarthPersonas.profile(from,shipment.signer),'freight',hostFor(to));
        const own=local(from);
        if(own.away[shipment.signer]==='regional-freight')delete own.away[shipment.signer];
        delete own.freight;
      }
    }
    if(world.week%3!==0)return;
    const clusters=new Map();
    for(const site of sites){
      const key=site.communityLife?.cluster;
      if(!key||isHome(world,site)||site.trust<42||site.communityLife.freight||world.week-site.founded<3)continue;
      if(!clusters.has(key))clusters.set(key,[]);
      clusters.get(key).push(site);
    }
    for(const group of clusters.values()){
      if(group.length<2)continue;
      const quotes=group.map(site=>{
        const food=spareForTrade(world,site,'food'),materials=spareForTrade(world,site,'materials');
        const foodTarget=2*meals(site),materialTarget=3+(site.civicInitiatives?.active?.goods?.materials||0);
        // A district values the shorter reserve more highly. The next two
        // meals and its own public commitments have already been excluded.
        const foodValue=food<foodTarget||food*2<materials?4:food<materials?3:food<2*materials?2:1;
        const materialValue=materials<materialTarget||materials*2<food?4:materials<food?3:materials<2*food?2:1;
        return {site,food,materials,foodValue,materialValue};
      });
      let best=null;
      for(const grower of quotes)for(const yard of quotes){
        if(grower===yard)continue;
        const foodDiff=grower.food-yard.food,materialsDiff=yard.materials-grower.materials;
        if(foodDiff<4||materialsDiff<4)continue;
        const distance=km(grower.site,yard.site);
        if(distance>70||root.EarthRegionalWorld?.passageAgreement(world,grower.site,yard.site)===false)continue;
        const maxFood=Math.min(3,grower.food,Math.floor(foodDiff/2)),maxMaterials=Math.min(3,yard.materials,Math.floor(materialsDiff/2));
        for(let food=1;food<=maxFood;food++)for(let materials=1;materials<=maxMaterials;materials++){
          const farmBenefit=materials*grower.materialValue-food*grower.foodValue;
          const yardBenefit=food*yard.foodValue-materials*yard.materialValue;
          if(farmBenefit<=0||yardBenefit<=0)continue;
          const gain=Math.min(farmBenefit,yardBenefit);
          if(!best||gain>best.gain||gain===best.gain&&distance<best.distance)best={grower:grower.site,yard:yard.site,gain,distance,food,materials};
        }
      }
      if(!best)continue;
      const {grower,yard,food,materials}=best,left=freightSigner(world,grower),right=freightSigner(world,yard);
      if(!left||!right)continue;
      const path=root.EarthRegionalWorld?.crossingPath(world,grower,yard);
      if(path===null)continue;
      const due=world.week+1;
      for(const [from,to,good,amount,other,expected,person] of [[grower,yard,'food',food,'materials',materials,left],[yard,grower,'materials',materials,'food',food,right]]){
        from[good]-=amount;
        local(from).freight={signer:person.id,name:person.name,good,amount,expected,to:to.id,due};
        if(path){
          local(from).freight.path=from===grower?path.slice():path.slice().reverse();
          local(from).freight.departedRound=world.regionalWorld?.step||0;
          local(from).away[person.id]='regional-freight';
        }
        message(from,person.name+' signed out '+amount+' '+good+' for '+to.name+'. The other council has sent '+expected+' '+other+' in return, due in week '+due+'. Both towns kept their own reserves.');
      }
    }
  }
  function recruit(world,sites,notify){
    // Invitations go to a particular neighbour. A reputation or qualification
    // needs a local witness, a real opening and a willing person to act on it.
    if(world.week%6!==2)return;
    for(const host of sites){
      const c=host.communityLife;
      if(!c?.cluster||isHome(world,host)||world.week-host.founded<7||host.trust<50||!inspectable(world,host)||
         host.food<2*meals(host)||Object.values(c.people).some(g=>g.status==='visitor')||c.lastInvitation&&world.week-c.lastInvitation<12)continue;
      const employers=Object.values(host.employers||{}).some(dept=>dept.open?.length);
      const locals=root.EarthPersonas?.list(host)||[];
      const linksKnown=locals.some(p=>host.autonomy?.people?.[p.id]?.ties?.length);
      if(!employers&&!linksKnown)continue;
      let best=null;
      for(const from of sites){
        if(host===from||from.communityLife?.cluster!==c.cluster||km(host,from)>70||from.population<6)continue;
        for(const id of candidates(from,world)){
          if(commuting(from,id)||from.communityLife?.foundingPlan?.members.includes(id)||from.communityLife?.excursions?.[id]||!inspectable(world,host,from,id))continue;
          const p=portable(from,id);if(!p)continue;
          const contacts=tiesAt(world,from,id,host,locals),fitHere=fit(host,p,contacts.length>0);
          if(!fitHere.employer&&!contacts.length||!fitHere.match||!fitHere.likes||objectionsTo(world,host,p).length>=2)continue;
          const homeLinks=links(from,id,world.week).length;
          const pull=(fitHere.employer?3:0)+Math.min(2,contacts.length)+Number(p.traits.curiosity>=55)+Number(p.traits.adaptability>=52)-Math.min(3,homeLinks);
          if(pull<2||best&&pull<=best.pull)continue;
          const reason=fitHere.employer?fitHere.employer.name+' invited '+p.name+' to inspect its '+fitHere.employer.role.toLowerCase()+' opening after '+fitHere.employer.former+' left.':
            contacts[0]+' already lives in '+host.name+'. '+p.name+' accepted an invitation to see whether a shared life here would suit them.';
          best={from,id,reason,pull};
        }
      }
      if(best){
        const text=beginInspection(world,best.from,host,best.id,{motive:best.reason,invited:true});
        if(text){c.lastInvitation=world.week;notify(host,writeLog(host,world.week,best.reason));notify(best.from,writeLog(best.from,world.week,best.reason));}
      }
    }
  }
  function concerns(world,site,id){
    const incident=site.fleet?.incident,books=site.autonomy?.people||{};
    if(!incident&&!Object.values(books).some(row=>row.ties?.some(t=>t.strength<=-2)))return null;
    const residents=(root.EarthPersonas?.list(site,{includeCommuters:false})||[]).filter(p=>!commuting(site,p.id)&&residency(site,p.id)==='member');
    const candidates=id?residents.filter(p=>p.id===id):residents;
    for(const p of candidates){
      const dispatch=incident?.actor===p.id&&(root.EarthFleet?.identified?.(site,p.id)??true);
      const witnesses=[];
      for(const peer of residents){
        if(peer.id===p.id)continue;
        const strength=root.EarthRelationships?.strength(books[peer.id],p,world.week)||0;
        if(strength<=-2)witnesses.push({id:peer.id,name:peer.name});
      }
      if(!dispatch&&witnesses.length<2)continue;
      if(dispatch&&!witnesses.some(w=>w.id==='driver')){
        const driver=residents.find(v=>v.id==='driver'&&v.id!==p.id);
        if(driver)witnesses.unshift({id:driver.id,name:driver.name});
      }
      return {id:p.id,name:p.name,issue:dispatch?'dispatch':'relationships',witnesses:witnesses.slice(0,3),
        detail:dispatch?'The cooperative recorded a truck taken without permission. The restitution shift is still outstanding.':
          witnesses.slice(0,2).map(w=>w.name).join(' and ')+' both report that their arrangements with '+p.name+' broke down.'};
    }
    return null;
  }
  function membershipReview(world,site,notify){
    const c=site.communityLife;
    if(!c?.cluster)return;
    const hearing=c.hearing;
    if(!hearing){
      if(c.lastHearing&&world.week-c.lastHearing.week<8)return;
      const concern=concerns(world,site);if(!concern)return;
      c.hearing={...concern,opened:world.week,due:world.week+2,heard:[]};
      notify(site,writeLog(site,world.week,'The district called a membership meeting with '+concern.name+' for week '+c.hearing.due+'. '+concern.detail));
      return;
    }
    if(world.week<hearing.due)return;
    const stillOwes=hearing.issue==='dispatch'&&site.fleet?.incident?.actor===hearing.id&&(root.EarthFleet?.identified?.(site,hearing.id)??true);
    const remaining=concerns(world,site,hearing.id)||(stillOwes?hearing:null),voice=(hearing.heard||[]).includes(hearing.id);
    const bothSides=voice&&hearing.witnesses.some(w=>hearing.heard.includes(w.id));
    let decision,summary;
    if(!remaining){
      decision='resolved';summary='The residents closed '+hearing.name+'’s meeting. '+(hearing.issue==='dispatch'?'The transport cooperative has recorded the return to good standing.':'The grievances no longer have two local witnesses.');
    }else if(bothSides&&!hearing.extended){
      hearing.extended=true;hearing.due=world.week+2;
      notify(site,writeLog(site,world.week,'Both sides were heard. The council gave '+hearing.name+' two more weeks to carry out a repair before deciding on membership.'));
      return;
    }else{
      decision='asked';summary='The residents asked '+hearing.name+' to consider leaving '+site.name+'. '+remaining.detail;
      const self=hearing.id==='steward',dest=!self&&chooseDestination(world,site,hearing.id);
      const p=portable(site,hearing.id),tied=links(site,hearing.id,world.week);
      if(self){summary+=' '+hearing.name+' retains the choice to repair the breach or approach another district.';}
      else if(!dest||!transferable(site,hearing.id,world)){
        summary+=' They will stay while outstanding handovers and a receiving household are settled.';
      }else if(p&&p.traits.adaptability+Math.max(0,48-site.trust)-tied.length*10>=48){
        const invitation=beginInspection(world,site,dest,hearing.id,{motive:'I was asked to consider another home. The households at '+dest.name+' must decide for themselves whether I can stay.'});
        if(invitation){summary+=' They agreed to inspect '+dest.name+'. Admission is up to its households.';notify(dest,invitation);}
        else summary+=' They stayed after the intended visit fell through.';
      }else summary+=' They chose to stay and work on their relationships here.';
    }
    c.lastHearing={week:world.week,id:hearing.id,name:hearing.name,decision,text:summary.slice(0,500)};
    delete c.hearing;notify(site,writeLog(site,world.week,summary));
  }
  function tick(world,makeSite){
    const a=world.communityLife;if(!a)return [];
    const notes=[],add=(site,text)=>{if(text&&world.sites.some(s=>s.id===site.id))notes.push({site,text});};
    const home=lookup(world,a.homeId);if(!home)return notes;
    const districts=stores(world);
    const activeSite=lookup(world,world.activeId),roundEnded=root.EarthAgency?.finishShadow?.(world,activeSite);
    if(roundEnded)add(activeSite,writeLog(activeSite,world.week,roundEnded));
    for(const site of districts){
      const c=site.communityLife;
      if(c?.vacancies)c.vacancies=c.vacancies.filter(v=>v.through>=world.week);
      for(const text of reviewVisitors(world,site))add(site,text);
    }
    const rota=lookup(world,a.duty.siteId||a.homeId);
    for(const text of duty(world,rota,a.duty))add(rota,text);
    coordinateMoves(world,add);
    districtTrade(world,districts,add);
    recruit(world,districts,add);
    for(const site of districts){const decision=reviewEntryArticles(world,site);if(decision)add(site,decision);membershipReview(world,site,add);prepareDeputy(world,site,add);excursions(world,site,add);neighbourhoodDecision(world,site,makeSite,add);}
    const c=local(home);
    if(world.week%4===3&&home.population>=3&&inspectable(world,home)&&!Object.values(c.people).some(g=>g.status==='visitor')){
      const possible=neighbours(world,home).filter(n=>n.distance<=70).map(n=>lookup(world,n.id)).filter(s=>s.population>4);
      const from=possible[(Math.floor(world.week/4))%Math.max(1,possible.length)];
      if(from){
        const candidatesHere=candidates(from,world).filter(id=>inspectable(world,home,from,id));
        const id=candidatesHere.find(id=>portable(from,id)?.traits.curiosity>=40)||candidatesHere[0];
        if(id)add(home,beginInspection(world,from,home,id,{invited:true}));
      }
    }
    return notes;
  }
  function visitorLedger(site){
    return Object.entries(site.communityLife?.people||{}).filter(([id,v])=>v.status==='visitor'&&present(site,id))
      .map(([id,g])=>({id,name:g.profile.name,role:g.profile.role||g.profile.originRole,inspects:g.inspects,welcomed:!!g.welcomed,motive:g.motive}));
  }
  function travelIntent(site,id){
    const run=site?.communityLife?.freight;
    if(run?.signer===id)return {week:run.due-1,kind:'freight',venue:'market',destination:'market',good:run.good,amount:run.amount,to:run.to,goal:'Honour the district exchange',
      activity:'Checking and loading '+run.amount+' '+run.good,reason:'I signed for this consignment. The other district has already sent its return cargo.'};
    const cover=site?.communityLife?.pantryCover;
    if(cover?.id===id)return {week:cover.due,kind:'care',venue:'market',destination:'market',goal:'Cover the pantry round',activity:'Checking the household order and pantry tally',reason:'Agreed to cover '+cover.owner+' through week '+cover.due+'.'};
    const promised=site?.communityLife?.excursions?.[id];
    if(promised)return {week:promised.due-1,kind:'visit',venue:'market',destination:'market',goal:'Prepare for a neighbourhood visit',
      activity:'Bringing the handover list to the exchange',reason:'This resident agreed to inspect another community next week.'};
    const g=site?.communityLife?.people?.[id];
    if(!g||g.status!=='visitor'||!present(site,id))return null;
    return {week:g.since,kind:'visit',venue:'market',destination:'market',goal:'Inspect the local exchange',activity:'Inspecting the exchange and meeting households',
      reason:g.motive||g.profile.name+' is weighing local food, spare housing and the work available.',rationale:'Considering whether to move here.'};
  }
  function coverCandidate(rota){
    return rota.residents.find(p=>residency(rota,p.id)==='member'&&p.bond>=2&&p.heard&&!p.promise);
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
      companions:comp,households:householdLife(site,world.week),hearing:site.communityLife?.hearing,lastHearing:site.communityLife?.lastHearing,atRota:site.id===rota.id,canCover:coverCandidate(rota)?.id||null,host:hostFor(site),purseSites,
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
    world.activeId=to.id;recoverHouseholds(world,to);if(makeSite)makeRegion(world,to,makeSite);
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
    fresh.population=before.population;
    if(before.communityLife)fresh.communityLife=copy(before.communityLife);
    const c=local(fresh),a=world.communityLife;
    c.people.steward={profile:copy(a.profile),status:'anchor',residence:'member'};delete c.away.steward;
    // Journeys, deeds and funded building contracts remain with their owners.
    for(const key of ['housing','privateHomes','civicLand'])if(before[key])fresh[key]=copy(before[key]);
    if(fresh.civicLand?.project)fresh.growth={round:before.growth.round,points:0,roads:0,vehicle:0,custom:'',households:[],history:[],sales:0};
    const roster=new Set([...(before.agency?.porters||[]),...Object.keys(before.purses?.people||{}).filter(id=>root.EarthPersonas?.isPorterId(id))]);
    if(roster.size)fresh.agency={actor:'steward',meals:[],porters:[...roster]};
    root.EarthPurses?.reopenSavings?.(world,before,fresh);
    if(before.housing)root.EarthHousing?.sync(world,fresh);
    writeLog(fresh,world.week,'The district restarted local work and stores. Existing households and the decisions of visiting neighbours stayed on the membership record.');
  }
  function permission(world,site,cmd,args=[]){
    const a=world.communityLife;if(!a||!site)return '';
    if(cmd==='production'||cmd==='stowHandline')return '';
    if(cmd==='visit'&&args[0]!==site.id){
      const restriction=hostedVisit(world,lookup(world,args[0]));
      if(restriction)return restriction.reason;
    }
    if(a.journey&&!['communityLife','reset','workConstruction'].includes(cmd))return 'You are on the road. Open Towns to arrive or turn back.';
    if(cmd==='manageSite'){
      if(args[0]!==a.homeId)return 'This district governs itself. Only members can alter their home community.';
      if(args[1]==='delete'&&world.sites.length+(a.outposts?.length||0)>1)return 'Your original character and the neighbouring households live in this world. Use Saved worlds to begin again, or Towns to relocate.';
    }
    if(cmd==='found'&&(root.EarthAgency?.actorId(site)||'steward')!=='steward')return 'Return to '+a.profile.name+' to sign a founding proposal.';
    if(cmd==='beginGoal'&&args[0]!==a.homeId||cmd==='found'&&args[3]&&args[3]!==a.homeId)return 'Only your home community can sponsor that decision.';
    if(cmd==='useTruck'&&args[0]?.action==='park'&&site.fleet?.custody?.actor===args[0].actorId)return '';
    if(isHome(world,site)||cmd==='changeActor'&&(args[0]==='steward'||root.EarthAgency?.shadowPass?.(site,world,args[0])))return '';
    if(['visit','advance','workConstruction','regularTruck','disputedTruck','neighbourAppointment','communityLife','reset'].includes(cmd))return '';
    const marketWork=cmd==='act'&&/^(?:work:|courier:)/.test(args[0])||cmd==='pursue'&&args[0]?.action==='start';
    if(marketWork&&currentRule(site)==='hosted'&&!personalAccess(world,site).known&&bilateralTrust(world,site,lookup(world,a.homeId)).score<66)
      return 'The local exchange requires a sponsor. Meet '+hostFor(site).name+' in Towns before taking a shift.';
    if(cmd==='act'&&/^(?:work:|courier:)/.test(args[0]))return '';
    if(cmd==='pursue'){
      const request=args[0],kind=request?.action==='start'?request.kind:site.pursuits?.ticket?.kind;
      if(['food','materials','funds'].includes(kind))return '';
    }
    if(cmd==='converse'&&['shadow','truck-testimony','truck-report'].includes(args[1]))return '';
    if(cmd==='converse'&&typeof args[1]==='string'&&args[1].startsWith('field:'))return '';
    if(cmd==='converse'&&(root.EarthDialogue?.readOnly?.(args[1])??['news','work','interests','purpose','dream','visit-fit','followup'].includes(args[1])))return '';
    return 'You are visiting '+site.name+'. Its residents decide here. Open Towns to meet the host, apply to join, or go home.';
  }
  function visitReason(world,site){
    return world.communityLife&&!isHome(world,site)?'This district governs itself. Meet its admission host in Towns.':'';
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
    const distant=trip.km>70,water=trip.vehicle!=='van'&&(from.water||to.water),goods=kind(to).goods;
    const titles=distant?['Departure concourse',via==='work'?'Freight interchange':'Regional stop','Arrivals board']:
      water?['Mooring gate',via==='work'?'Repair pontoons':'Sheltered channel','Landing steps']:
      ['Exchange gate',via==='work'?'Tool yard':'Kitchen gardens','District noticeboard'];
    const notes=[
      from.name+' has '+from.food+' food for '+from.population+' people. Your pantry round at '+(lookup(world,world.communityLife.duty.siteId||world.communityLife.homeId)?.name||from.name)+' comes due in week '+world.communityLife.duty.due+'.',
      via==='work'?to.name+' holds '+to.materials+' materials. '+hostFor(to).name+' is looking for help '+kind(to).need+'.':
        to.name+' keeps '+to.food+' food. Even with a spare room, a new household needs a share of the next meals.',
      hostFor(to).name+' speaks at admissions. There '+(room(to)===1?'is one spare place':'are '+Math.max(0,room(to))+' spare places')+' and the local rota depends on '+goods+'.'
    ];
    const region=root.EarthRegionalWorld,geo=trip.path?.length&&region?.geography(world,from);
    const landmarks=titles.map((label,i)=>{
      const fraction=stops[i],at=geo&&region.tripPosition(world,from,trip,fraction);
      if(!at)return {label,id:i,fraction,note:notes[i]};
      const ground=region.terrain(geo,at.x,at.y),p=geo.locate(at.x,at.y);
      const work=region.works(world,from).find(w=>Math.hypot(w.x-at.x,w.y-at.y)<=geo.cellSize*.55);
      const owner=work&&geo.towns.find(t=>t.site.id===work.siteId)?.site.name;
      return {label:(work?.label||ground.label)+' · '+(fraction*trip.km).toFixed(1)+' km',id:i,fraction,
        note:ground.label+' at '+p.lat.toFixed(3)+'°, '+p.lon.toFixed(3)+'°. '+ground.resource+' is found here.'+
          (work&&owner?' '+owner+' maintains the '+work.label+'.':'')};
    });
    return {from:from.name,to:to.name,water,distant,via,regional:!!geo,landmarks};
  }
  function continueTrip(trip,progress,target){
    const time=Date.now();trip.base=progress;trip.start=time;
    trip.finish=time+Math.max(100,Math.round((trip.baseDuration||cap(trip.km*650,2400,6200))*(trip.vehicle==='van'?.45:1)*(1-progress)));
    delete trip.stop;delete trip.hold;
    if(target==='pause')trip.hold=progress;
    else if(target!=='direct'&&Number.isInteger(target))trip.stop=target;
  }
  function run(world,site,req,scene,makeSite,finishPromise){
    const a=world.communityLife;
    if(!a||!site||!req||req.site!==site.id||req.week!==world.week)return fail('The place or week changed. Open Towns again.');
    if(req.actor!==detachedView(world)||req.actor!=='steward')return fail('Return to '+a.profile.name+' before making a personal travel or membership decision.');
    const home=lookup(world,a.homeId),c=local(site),receipt=text=>({ok:true,message:writeLog(site,world.week,text)});
    const at=id=>scene?.siteId===site.id&&scene.actor==='steward'&&scene.mode==='walk'&&scene.target===id&&
      [scene.x,scene.y,scene.tx,scene.ty].every(Number.isFinite)&&Math.hypot(scene.x-scene.tx,scene.y-scene.ty)<=1.56;
    if(req.action==='requestEntry'){
      if(a.journey||!at('market'))return fail('Send the request from the local exchange.');
      const dest=lookup(world,req.target);
      if(!dest||!neighbours(world,site).some(n=>n.id===dest.id))return fail('Choose a nearby admissions desk.');
      const restriction=hostedVisit(world,dest);
      if(!restriction)return fail('A scheduled visit is unnecessary here.');
      if(restriction.pending||!restriction.host.id)return fail(restriction.pending?restriction.reason:'The town is training an admissions delegate.');
      local(dest).entryPass={guestKey:a.profile.identityKey,host:restriction.host.name,opens:world.week+1,until:world.week+3};
      return receipt(restriction.host.name+' agreed to receive '+a.profile.name+' at '+dest.name+' between weeks '+(world.week+1)+' and '+(world.week+3)+'.');
    }
    const driving=req.action==='driveTrail';
    if(driving||req.action==='depart'||req.action==='walkTrail'){
      if(a.journey)return fail('A journey is already under way.');
      if(driving && !(scene?.siteId===site.id&&scene.actor===req.actor&&scene.mode==='drive'&&scene.vehicle==='van'))return fail('Board the public van to drive to another town.');
      if(!driving&&!at('market'))return fail('Walk to the exchange path to start the crossing.');
      const block=journeyBlock(site);if(block)return fail(block);
      const dest=neighbours(world,site).find(n=>n.id===req.target);
      if(!dest)return fail('Choose a reachable neighbouring district.');
      const restriction=entryRestriction(world,lookup(world,dest.id));
      if(restriction)return fail(restriction.reason);
      const path=root.EarthRegionalWorld?.crossingPath(world,site,lookup(world,dest.id),driving?'van':'walk');
      if(path===null)return fail('Present transport and passage agreements do not provide a crossing to '+dest.name+'.');
      const km=path?Math.max(dest.distance,(path.length-1)*.5):dest.distance;
      const effort=path?root.EarthRegionalWorld.routeEffort(world,site,path,driving?'van':'walk')*.5:km;
      const start=Date.now(),duration=Math.round(cap(effort*620,1600,6200));
      a.journey={from:site.id,to:dest.id,start,finish:start+(driving?Math.round(duration*.45):duration),km};
      if(path)Object.assign(a.journey,{path,baseDuration:duration});
      if(driving)Object.assign(a.journey,{vehicle:'van',interactive:true,via:'commons',seen:[]});
      if(req.action==='walkTrail')Object.assign(a.journey,{interactive:true,via:'commons',stop:0,seen:[]});
      return {ok:true,message:a.profile.name+' set out for '+dest.name+'.',journey:true};
    }
    if(req.action==='routeChoice'){
      const trip=a.journey;if(!trip||trip.from!==site.id)return fail('That crossing has ended.');
      const progress=routeProgress(trip),target=req.target,road=trail(world,trip);
      if(target==='commons'||target==='work'){
        if(progress>stops[1])return fail('You have passed the fork on this crossing.');
        if(root.EarthRegionalWorld?.changeBranch(world,site,trip,target,progress)===false)return fail('There is no other accessible crossing from the remaining route.');
        root.EarthRegionalWorld?.observeLeg(world,site,trip,progress);
        trip.via=target;continueTrip(trip,progress,1);
      }else if(target==='inspect'){
        const i=stops.findIndex(v=>Math.abs(v-progress)<.035);
        if(i<0)return fail('Stop by a marked landmark to inspect it.');
        root.EarthRegionalWorld?.observeLeg(world,site,trip,progress);
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
      root.EarthRegionalWorld?.observeLeg(world,site,a.journey,routeProgress(a.journey));
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
      if(trip.path)root.EarthRegionalWorld?.shareCrossing(world,site,dest,'steward',a.profile.name,trip.path,trip.observed);
      carryReceptionReport(world,site,dest,a.profile.name);
      a.journey=null;
      const attack=!isHome(world,dest)&&root.EarthBorderConflict?.entry(world,site,dest,a.profile,false);
      if(attack)return {ok:true,refused:true,arrived:false,message:writeLog(site,world.week,attack+' The watch turned you back to '+site.name+'. Request a hosted visit at the exchange.')};
      arrive(world,site,dest,makeSite);
      return {ok:true,arrived:true,vehicle:trip.vehicle,message:writeLog(dest,world.week,a.profile.name+' arrived in '+dest.name+(isHome(world,dest)?' and returned to their home.':' as a visitor. '+hostFor(dest).name+' speaks for the admissions meeting.'))};
    }
    if(a.journey)return fail('Finish the current crossing first.');
    if(req.action==='housingRelief')return root.EarthHousing?.setRelief(world,site,req)||fail('The housing register is unavailable.');
    if(req.action==='townCentre'){
      if(!isHome(world,site))return fail('Only the community you belong to can authorise recruitment.');
      return root.EarthTownCentre?.command(world,site,req)||fail('The Town Centre is unavailable.');
    }
    if(req.action==='hearResident'){
      const h=c.hearing;
      if(!isHome(world,site)||!h||world.week>=h.due)return fail('There is no current local membership hearing.');
      const speaker=req.target===h.id?{id:h.id,name:h.name}:h.witnesses.find(w=>w.id===req.target);
      if(!speaker||h.heard.includes(speaker.id)||!present(site,speaker.id)||!at(speaker.id==='steward'?'market':speaker.id))return fail('Meet a participant who has yet to speak on the street.');
      h.heard.push(speaker.id);
      const temperament=root.EarthPersonas?.profile(site,speaker.id)?.traits||{};
      const friends=tiesSummary(site,speaker.id);
      const words=speaker.id===h.id?(friends?'My life here includes '+friends+'. I would like to put things right before I consider another home.':
        (temperament.patience||0)>=60?'Give me the next shift to show you what I can put right. Moving house will not repair this.':'I will hear the proposal. I need to know what the others expect me to change.'):
        h.issue==='dispatch'?'I need the co-op to record the restitution, so the next driver has a truck when the shift starts.':'I need a change we can rely on at our next handover.';
      return receipt(speaker.name+' · “'+words+'” The council recorded their testimony.');
    }
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
      if(!host.id)return fail('The district is training a new admission host. Return after the handover.');
      if(!at(host.id))return fail('Meet '+host.name+' in person first.');
      const v=c.visits.steward||={};
      if(v.met)return fail(host.name+' already logged your introduction.');
      v.met=world.week;v.hostId=host.id;v.hostName=host.name;
      recordReception(world,site,home,a.profile,'introduction',host);
      return receipt(host.name+' said, “We have a place to talk about '+kind(site).need+'. Come for the trial shift and tell us which commitments you would bring.”');
    }
    if(req.action==='help'){
      const v=c.visits.steward;
      if(!v?.met||!at('market'))return fail('Meet the host first, then work a trial shift at the exchange.');
      if(v.lastShift===world.week)return fail('The host has recorded this week’s trial. Return next week if another is needed.');
      v.help=true;v.shifts=(v.shifts||0)+1;v.lastShift=world.week;
      recordReception(world,site,home,a.profile,'shift',host);
      const good=kind(site).goods;site[good]=Math.min(Number.MAX_SAFE_INTEGER,site[good]+1);
      const paid=root.EarthHousing&&site.funds>=2&&root.EarthPurses?.productionReceipt(world,home,'steward',2,'Paid supervised shift at '+site.name+'.');
      if(paid)site.funds-=2;
      return receipt(a.profile.name+' completed a supervised shift '+kind(site).need+'. '+host.name+' recorded one '+good+' in local stores.'+(paid?' The host treasury paid two personal funds.':''));
    }
    if(req.action==='apply'||req.action==='moveGroup'){
      if(!at(host.id))return fail('Bring the application to '+host.name+' in person.');
      if(!admission.available)return fail(host.name+' deferred admission. '+admission.checks.filter(x=>!x.pass).map(x=>x.detail).join(' '));
      const oldHome=home,group=req.action==='moveGroup',answers=group?householdOffer(world,oldHome,site):[];
      const housing=admission.housing;
      if(housing?.kind==='finance'){
        const result=root.EarthHousing.finance(world,site,oldHome,'steward',housing);
        return result.ok?receipt(result.message):fail(result.message);
      }
      if(housing&&!root.EarthHousing.pay(world,site,oldHome,'steward',housing))return fail('The personal housing payment could not be completed.');
      const willing=answers.filter(p=>p.willInspect);
      if(group&&willing.length)(a.cohorts||=[]).push({from:oldHome.id,to:site.id,opened:world.week,
        expires:world.week+Math.ceil(willing.length/2)+3,pending:willing.map(p=>p.id)});
      recordReception(world,site,oldHome,a.profile,'admission',host);
      moveAnchor(world,oldHome,site);
      if(housing){root.EarthHousing.grant(world,site,'steward',housing);root.EarthHousing.sync(world,oldHome);root.EarthHousing.sync(world,site);}
      const outcome=group?' '+answers.length+' households considered the invitation. '+willing.length+' agreed to inspect in pairs after their handovers. Each visitor and the host meeting will decide separately.':'';
      return receipt(host.name+' and the local meeting welcomed '+a.profile.name+' as a member of '+site.name+'. '+oldHome.name+' now chooses its own affairs.'+outcome);
    }
    return fail('Choose a current neighbourhood action.');
  }
  function valid(world,validateSite){
    const a=world.communityLife;if(a==null)return true;
    if(world.communityLife&&root.EarthAgency?.validRecall&&!root.EarthAgency.validRecall(world.communityLife.viewpointHistory,world.week))return false;
    if(root.EarthDialogue?.validFieldNotes&&!root.EarthDialogue.validFieldNotes(world))return false;
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
      if(t.vehicle!=null&&t.vehicle!=='van'||t.baseDuration!=null&&!int(t.baseDuration,1600,6200))return false;
      if(t.base!=null&&(!Number.isFinite(t.base)||t.base<0||t.base>1)||t.hold!=null&&(!Number.isFinite(t.hold)||t.hold<0||t.hold>1)||
         t.stop!=null&&!int(t.stop,0,2)||t.via!=null&&!['commons','work'].includes(t.via)||t.seen!=null&&(!Array.isArray(t.seen)||t.seen.length>3||!t.seen.every(i=>int(i,0,2))))return false;
    }
    for(const s of districts){
      const c=s.communityLife;if(!c)continue;
      if(!obj(c)||!obj(c.people)||!obj(c.away)||!obj(c.visits)||!Array.isArray(c.log)||c.log.length>9||c.log.some(n=>!obj(n)||!int(n.week,1,world.week)||!word(n.text)))return false;
      if(Object.values(c.people).some(p=>p?.motive!=null&&!word(p.motive)))return false;
      if(c.foundingHouseholds!=null&&!int(c.foundingHouseholds,3,12)||c.foundingRosterReady!=null&&typeof c.foundingRosterReady!=='boolean')return false;
      if(c.entryPass!=null&&(!obj(c.entryPass)||c.entryPass.guestKey!==a.profile.identityKey||!word(c.entryPass.host)||
        !int(c.entryPass.opens,2,world.week+1)||c.entryPass.until!==c.entryPass.opens+2))return false;
      if(c.entryDecision!=null&&(!obj(c.entryDecision)||!int(c.entryDecision.week,1,world.week)||
        !Object.hasOwn(entryRules,c.entryDecision.rule)||!word(c.entryDecision.host)))return false;
      if(c.entryRecords!=null&&(!Array.isArray(c.entryRecords)||c.entryRecords.length>36||
        !c.entryRecords.every(e=>obj(e)&&int(e.week,1,world.week)&&int(e.reported,e.week+1,e.week+4)&&ids.has(e.originId)&&
          e.originId!==s.id&&word(e.guestKey)&&word(e.guestName)&&word(e.actorId)&&word(e.actorName)&&typeof e.official==='boolean'&&Object.hasOwn(encounters,e.kind)&&
          (e.relays==null||Array.isArray(e.relays)&&e.relays.length<=3&&new Set(e.relays.map(r=>r?.to)).size===e.relays.length&&
            e.relays.every(r=>obj(r)&&ids.has(r.to)&&r.to!==s.id&&r.to!==e.originId&&word(r.carrier)&&int(r.week,e.reported,world.week))))))return false;
      if(c.visitorIncidents!=null&&!int(c.visitorIncidents,0,1000))return false;
      if(c.cluster!=null&&!word(c.cluster)||c.district!=null&&![...land,...water,...founderPurposes].some(d=>d.district===c.district)||c.strain!=null&&!int(c.strain)||c.lastExit!=null&&!int(c.lastExit,1,world.week))return false;
      if(!Object.entries(c.away).every(([id,dest])=>(id==='steward'||id==='driver'||walkIds.includes(id)||guestSlots.includes(id)||s.residents.some(r=>r.id===id))&&word(dest)))return false;
      for(const [id,p] of Object.entries(c.people)){
        if(!obj(p)||!validProfile(p.profile,id)||id==='steward'&&p.status!=='anchor'||id!=='steward'&&(!(guestSlots.includes(id)||(walkIds.includes(id)||id==='driver'||s.residents.some(r=>r.id===id))&&p.originId===s.id&&p.originSlot===id)||!['visitor','member','former'].includes(p.status)||!word(p.originId)||!word(p.originSlot)||!int(p.since,1,world.week)))return false;
        if(p.status==='visitor'&&(!ids.has(p.visitFrom)||!word(p.visitSlot)||!int(p.inspects,p.since+1,p.since+1)))return false;
      }
      if(c.freight){
        const f=c.freight,other=lookup(world,f.to)?.communityLife?.freight;
        if(!obj(f)||!['food','materials'].includes(f.good)||!int(f.amount,1,3)||!int(f.due,world.week+1,world.week+1)||
          !word(f.signer)||!word(f.name)||!ids.has(f.to)||f.to===s.id||!other||other.to!==s.id||other.due!==f.due||other.amount!==f.expected||other.expected!==f.amount||other.good===f.good)return false;
      }
      if(c.settling&&(!Array.isArray(c.settling)||c.settling.length>16||c.settling.some(p=>!obj(p)||!word(p.guide)||!word(p.entrant)||p.guide===p.entrant||
        !word(p.guideName)||!word(p.entrantName)||!int(p.sessions,1,2)||!int(p.arrived,1,world.week)||!int(p.first,p.arrived,world.week)||
        !int(p.last,p.first,world.week)||p.sessions===2&&p.last===p.first)))return false;
      if(c.hearing){
        const h=c.hearing;
        if(!obj(h)||!word(h.id)||!word(h.name)||!word(h.detail)||!['dispatch','relationships'].includes(h.issue)||
          !int(h.opened,1,world.week)||!int(h.due,world.week,world.week+2)||h.due!==h.opened+(h.extended?4:2)||
          h.extended!=null&&h.extended!==true||!Array.isArray(h.witnesses)||h.witnesses.length>3||!h.witnesses.every(w=>obj(w)&&word(w.id)&&word(w.name)&&w.id!==h.id)||
          !Array.isArray(h.heard)||new Set(h.heard).size!==h.heard.length||!h.heard.every(id=>id===h.id||h.witnesses.some(w=>w.id===id)))return false;
      }
      if(c.lastHearing){
        const h=c.lastHearing;
        if(!obj(h)||!word(h.id)||!word(h.name)||!word(h.text)||!int(h.week,1,world.week)||!['resolved','asked'].includes(h.decision))return false;
      }
      if(c.lastInvitation!=null&&!int(c.lastInvitation,1,world.week))return false;
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
      (p.workFocus==null||root.EarthPersonas?.validWorkFocus?.(p.workFocus))&&
      ['numeracy','music','communication','care','craft','stamina','organisation'].every(k=>int(p.aptitudes[k],0,100)&&int(p.bounds[k]?.min,0,p.aptitudes[k])&&int(p.bounds[k]?.max,p.aptitudes[k],100));
  }
  root.EarthCommunityLife=Object.freeze({initialise,restart,valid,present,profile,personLabel,census,commuting,residency,anchor,coverCandidate,isHome,neighbours,travelIntent,volunteers,founding,
    nearLocation:pointNear,guestSlot,recordReception,closeLife,personalAccess,visitorReception,confrontation,entryAssessment,entryRestriction,hostedVisit,communityCharacter,view,districtProfile,welcomeOffers,meetHousehold,recordWeek:writeLog,movingOptions,householdOffer,hostFor,wasDelegate,visitorFit,acceptVisitor,routeProgress,trail,arrive,tick,workforce,permission,visitReason,journeyBlock,fieldCandidates:candidates,settleFieldCamp,run});
})(typeof window==='undefined'?globalThis:window);
