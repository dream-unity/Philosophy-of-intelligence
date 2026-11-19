/* Residential rights are kept by identity. Opening a directory only projects
   the current allocation. The shared calendar commits it for every district. */
(function(root){
  'use strict';

  const personalPrice=2;
  const funds=(site,id)=>site.purses?.people?.[id]?.balance||0;
  const local=(site,id)=>root.EarthCommunityLife.present(site,id);
  const profile=(site,id)=>root.EarthPersonas.profile(site,id);
  const foundation=site=>root.EarthCouncilHomes?.foundation(site)??18;
  const homeKey=(kind,n)=>kind+'-'+n;
  const blocks=[[1,3],[3,2],[3,3]];
  const integer=(n,low,high)=>Number.isSafeInteger(n)&&n>=low&&n<=high;
  function roll(world,site){
    const {ids,visitors}=root.EarthCommunityLife.census(world,site,true);
    // Historical census totals can include unnamed residents or predate a
    // larger named roster. Neither condition grants an extra tenancy.
    const rows=ids.map(id=>{
      const person=id==='steward'&&world.communityLife?.profile||profile(site,id);
      return {id,key:person?.identityKey||id,name:person?.name||id,away:!local(site,id)||id==='steward'&&world.activeId!==site.id};
    });
    return {rows,visitors};
  }
  function stock(site){
    const homes=[],works=[];
    function add(key,label,places,point,owner=null,ownerName='',available=true){
      homes.push({key,label,places,point,owner,ownerName,available,occupants:[],anonymous:0,reserved:[]});
    }
    const streets=site.growth?.households||[],baseBlocks=root.EarthShifts?.district.homes||blocks;
    for(let index=0;index<foundation(site);index++){
      const h=streets[index],block=baseBlocks[index%baseBlocks.length];
      const point=h?root.EarthDistrictGrowth.homePoint(site,index):{x:block[0]*6+3,y:block[1]*6+4};
      const label=h?'Street home on lot '+(index+1):'Founding block '+(index%3+1)+' · place '+(Math.floor(index/3)+1);
      add(homeKey('founding',index),label,1,point);
    }
    for(const h of streets.slice(foundation(site))){
      const point=root.EarthDistrictGrowth.homePoint(site,h.plot);
      if(h.home>=2)add(homeKey('property',h.plot),h.name+'’s home on lot '+(h.plot+1),1,point,h.owner,h.name,false);
      else if(h.build&&!h.build.shop)works.push({label:'Home on lot '+(h.plot+1),places:1,point,detail:h.last});
    }
    for(const house of site.civicLand?.homes||[]){
      const point=root.EarthCouncilHomes.plot(house.plot);
      add(homeKey('cottage',house.plot),'Council cottage C'+(house.plot+1),house.places,point);
    }
    const project=site.civicLand?.project;
    if(project)works.push({label:'Council cottage C'+(project.plot+1),places:2,point:root.EarthCouncilHomes.plot(project.plot),
      detail:project.reason+' '+(site.civicLand.delay||(project.workerName||'Awaiting a worker')+' · '+(project.phase==='delivery'?'delivering three reserved materials':project.built+' of 2 building shifts complete')+' · '+project.escrow+' funds in escrow.')});
    if(!project&&site.civicLand?.delay)works.push({label:'Proposed council cottage',places:0,
      point:root.EarthCouncilHomes.plot(site.civicLand.homes.length),detail:site.civicLand.delay});
    const precincts=site.city?.precincts||[];
    if(precincts.some(p=>p.use==='homes'||p.target==='homes')){
      const records=root.EarthCityModel.overview(site).records;
      for(const row of records){
        const point=root.EarthConstruction.streetPoint({scope:'city',precinct:row.id});
        if(row.use==='homes')add(homeKey('precinct',row.id),row.name+' courtyards',row.beds,point);
        if(row.target==='homes')works.push({label:row.name+' courtyards',places:row.terrain.id==='shelter'?8:6,point,
          detail:row.laborReady?'Crew finished · waiting for opening week':row.turns?'Construction · '+row.turns+' calendar weeks remaining':'Construction · waiting for the crew'});
      }
    }
    for(const house of site.privateHomes||[]){
      const person=profile(site,house.ownerId),point=root.EarthConstruction.privateHomeSite(house.plot);
      const label='Private courtyard '+(house.plot+1);
      if(house.stage===3)add(homeKey('private',house.plot),label,2,point,person?.identityKey||house.ownerId,person?.name||house.ownerId,false);
      else works.push({label,places:2,point,detail:(person?.name||'Owner')+' · '+house.stage+' of 3 stages complete'});
    }
    for(const h of site.growth?.households||[]){
      if(!h.guestRoom||!h.access)continue;
      const point=root.EarthDistrictGrowth.homePoint(site,h.plot);
      add(homeKey('guest',h.plot),h.name+'’s guest room, lot '+(h.plot+1),1,point,null,h.name,root.EarthCommunityLife.residency(site,h.guestRoom)==='member');
    }
    return {homes,works};
  }
  const remaining=h=>h.places-h.occupants.length-h.anonymous-h.reserved.length;
  function view(world,site){
    const {homes,works}=stock(site),{rows,visitors}=roll(world,site);
    const byKey=new Map(homes.map(h=>[h.key,h])),residents=new Map(rows.map(r=>[r.key,r]));
    // In rare pre-roster worlds the saved official count and the named roster
    // disagree. List the extra names explicitly without inventing occupants.
    const prior=new Map((site.housing?.rights||[]).map(a=>[a.key,a.home]));
    const ordered=[...rows].sort((a,b)=>Number(prior.has(b.key))-Number(prior.has(a.key)));
    const counted=new Set(ordered.slice(0,site.population));
    function allocate(r,h){
      if(!r||!counted.has(r)||r.home||!h||remaining(h)<=0)return false;
      r.home=h.key;h.occupants.push(r);return true;
    }
    // A deed conveys first occupancy to its owner. A listed or vacant private
    // second place requires its owner's consent, even when the town is full.
    for(const h of homes)if(h.owner)allocate(residents.get(h.owner),h);
    for(const r of ordered){
      const held=byKey.get(prior.get(r.key));
      if(held?.available||held?.key.startsWith('guest-'))allocate(r,held);
    }
    for(const lease of site.housing?.leases||[]){
      const h=byKey.get(lease.home);
      if(h&&h.owner===lease.owner&&lease.through>=world.week)allocate(residents.get(lease.tenant),h);
    }
    for(const h of homes.filter(h=>h.owner&&h.occupants.length)){
      const owner=profile(site,h.occupants[0].id);
      if(!owner||site.privateHomes?.find(v=>homeKey('private',v.plot)===h.key)?.offer)continue;
      const invited=ordered.find(r=>!r.home&&counted.has(r)&&r.key!==h.owner&&
        (root.EarthAutonomy?.bond?.(site,owner.id,r.id,world.week)||0)>=2&&owner.traits.sociability>=55);
      if(invited)allocate(invited,h);
    }
    const reservations=[],visiting=Object.entries(site.communityLife?.people||{}).filter(([id,g])=>g.status==='visitor'&&local(site,id)&&g.visitFrom&&
      !site.privateHomes?.some(h=>h.ownerId===id));
    function reserveRoom(id,guest,h){
      const origin=world.sites.find(s=>s.id===guest.visitFrom)||world.communityLife?.outposts.find(s=>s.id===guest.visitFrom);
      if(!origin||funds(origin,guest.visitSlot)<personalPrice||!h?.available||remaining(h)<1)return;
      const reservation={id,key:guest.profile.identityKey,name:guest.profile.name,origin:origin.id,sourceId:guest.visitSlot,home:h.key};
      h.reserved.push(reservation);reservations.push(reservation);
    }
    for(const old of site.housing?.reservations||[]){
      const applicant=visiting.find(([id,g])=>id===old.id&&g.profile.identityKey===old.key);
      if(applicant)reserveRoom(...applicant,byKey.get(old.home));
    }
    const later=r=>{
      const g=site.communityLife?.people?.[r.id];
      return Boolean(g?.profile.externalHistory)&&g.since===world.week&&!prior.has(r.key);
    };
    for(const h of (site.growth?.households||[]).slice(0,foundation(site))){
      const occupant=residents.get(h.owner);
      if(occupant&&!later(occupant))allocate(occupant,byKey.get(homeKey('founding',h.plot)));
    }
    const newest=[];
    for(const r of ordered){
      if(!counted.has(r))r.uncounted=true;
      else if(!r.home){
        if(later(r))newest.push(r);
        else allocate(r,homes.find(h=>h.available&&remaining(h)>0));
      }
      const condition=site.housing?.hardship?.find(x=>x.id===r.id&&x.key===r.key);
      if(condition&&!r.home){r.weeks=condition.weeks;r.strain=condition.strain;r.help=condition.help;r.crisis=condition.crisis;}
    }
    let unplaced=Math.max(0,site.population-counted.size);
    const anonymous=unplaced;
    for(const h of homes){
      if(!h.available||!unplaced)continue;
      h.anonymous=Math.min(unplaced,remaining(h));unplaced-=h.anonymous;
    }
    // A prospective member with a viable offer can reserve a communal place
    // during the inspection week. Visitors retain their original residence.
    for(const [id,guest] of visiting){
      if(reservations.some(r=>r.id===id))continue;
      reserveRoom(id,guest,homes.find(h=>h.available&&remaining(h)>0));
    }
    for(const r of newest)allocate(r,homes.find(h=>h.available&&remaining(h)>0));
    const namedMissing=[...counted].filter(r=>!r.home);
    const capacity=homes.reduce((n,h)=>n+h.places,0);
    const unmet=namedMissing.length+unplaced;
    return {population:site.population,capacity,unmet,occupied:site.population-unmet,visitors,homes,works,rows,anonymous,
      anonymousMissing:unplaced,namedMissing,reservations,vacant:homes.reduce((n,h)=>n+remaining(h),0),
      open:homes.reduce((n,h)=>n+(h.available?remaining(h):0),0)};
  }
  const frontage=(site,h)=>h.plot<foundation(site)||h.home>=2?'home':'lot';
  const additionalPlaces=site=>(site.growth?.households||[]).slice(foundation(site)).filter(h=>h.home>=2).length;
  function need(world,site){
    // Every one of the 18 founding places is a public right. Most towns do
    // not need a full private-rights calculation to rule out homelessness.
    const headroom=foundation(site)-site.population;
    if(headroom>=0&&(site.housing?.reservations?.length||0)<=headroom){
      const people=site.communityLife?.people||{};
      if(!Object.values(people).some(g=>g.profile?.externalHistory&&g.since===world.week)||
        Object.values(people).filter(g=>g.status==='visitor').length<=headroom)return 0;
    }
    return view(world,site).unmet;
  }
  function projected(world,site,count=1){
    const report=view(world,site);
    return report.unmet+Math.max(0,count-report.open);
  }
  function vacantPlot(site){
    const count=Math.min(6,3+(site.city?.precincts||[]).filter(row=>row.use==='homes').length);
    for(let plot=0;plot<count;plot++)if(!site.privateHomes?.some(h=>h.plot===plot))return plot;
  }
  function materialsAvailable(world,site){
    return site.materials-(root.EarthCivicInitiatives?.reserve(world,site)?.materials??3)
      -(root.EarthNeighbourErrands?.heldGoods?.(site,world.week)?.materials||0);
  }
  // A full town can still receive a visitor to inspect a listed home or a
  // serviced site. Binding price, crew and both consents are checked on arrival.
  function privateInspection(world,site,origin,id){
    const budget=id?funds(origin,id):Infinity;
    return (site.privateHomes||[]).some(h=>h.stage===3&&h.offer&&h.offer<=budget&&local(site,h.ownerId))||
      (budget>=10&&vacantPlot(site)!==undefined&&materialsAvailable(world,site)>=3);
  }
  function quote(world,site,origin,id){
    const report=view(world,site),held=report.reservations.find(r=>r.origin===origin.id&&r.sourceId===id);
    const guest=Object.entries(site.communityLife?.people||{}).find(([,g])=>g.status==='visitor'&&g.visitFrom===origin.id&&g.visitSlot===id);
    const buyerId=guest?.[0],owned=buyerId&&site.privateHomes?.find(h=>h.ownerId===buyerId);
    if(owned){
      const ready=owned.stage===3;
      return {available:ready,reason:ready?'':'The funded courtyard is still under construction.',kind:ready?'owned':'pending',price:0,
        balance:funds(origin,id),dwelling:homeKey('private',owned.plot),label:'Private courtyard '+(owned.plot+1),plot:owned.plot};
    }
    const publicHome=report.homes.find(h=>held?h.key===held.home:h.available&&remaining(h)>0);
    const balance=funds(origin,id),name=profile(origin,id)?.name||'The applicant';
    if(!publicHome){
      // A seller chooses to list a completed home. If the public roll is
      // full a willing applicant can buy this deed at its actual asking price.
      const offers=(site.privateHomes||[]).filter(h=>h.stage===3&&h.offer&&local(site,h.ownerId)&&
        profile(site,h.ownerId)?.identityKey!==profile(origin,id)?.identityKey).sort((a,b)=>a.offer-b.offer||a.plot-b.plot);
      const house=offers[0];
      if(house&&house.offer<=balance){
        const seller=site.purses?.people?.[house.ownerId],price=house.offer;
        const reason=balance<price?name+' needs '+price+' funds to purchase the listed courtyard.':
          !seller||!Number.isSafeInteger(seller.balance+price)||!Number.isSafeInteger((seller.productionIncome||0)+price)?'The seller cannot receive the price.':'';
        return {available:!reason,reason,price,balance,dwelling:homeKey('private',house.plot),label:'Private courtyard '+(house.plot+1),
          seller:house.ownerId,plot:house.plot};
      }
      if(buyerId){
        const plot=vacantPlot(site);
        if(plot!==undefined){
          const worker=constructionWorker(world,site,44);
          const reason=balance<10?name+' needs 10 personal funds for the plot, three material deliveries and three paid shifts.':
            materialsAvailable(world,site)<3?'The town needs three uncommitted materials to start this courtyard.':
            !worker?'No available builder can take the foundations shift.':
            !Number.isSafeInteger(site.funds+7)?'The town cannot receive the sale.':'';
          return {available:!reason,reason,kind:'finance',price:10,balance,plot,worker:worker?.id,buyerId,dwelling:homeKey('private',plot),
            label:'New private courtyard '+(plot+1)};
        }
      }
      return {available:false,reason:house?'The least expensive listed courtyard costs '+house.offer+' personal funds.':'No completed dwelling or serviced plot is available with residential rights.',balance,price:house?.offer??null};
    }
    const reason=balance<personalPrice?name+' needs '+personalPrice+' personal funds to buy a housing share; their purse holds '+balance+'.':
      !Number.isSafeInteger(site.funds+personalPrice)?'The town cannot receive the housing payment.':'';
    return {available:!reason,reason,price:personalPrice,balance,dwelling:publicHome.key,label:publicHome.label};
  }
  function pay(world,destination,origin,id,q){
    if(!q?.available)return false;
    if(q.kind==='owned')return true;
    const text=(profile(origin,id)?.name||'The applicant')+' bought '+q.label+' at '+destination.name+' for '+q.price+' personal funds.';
    if(!root.EarthPurses.productionReceipt(world,origin,id,-q.price,text))return false;
    if(q.seller)root.EarthPurses.productionReceipt(world,destination,q.seller,q.price,text);
    else destination.funds+=q.price;
    return true;
  }
  const store=site=>site.housing||={week:0,rights:[],hardship:[]};
  function constructionWorker(world,site,skill){
    const people=root.EarthPersonas.list(site);
    return people.find(p=>!root.EarthCommunityLife.commuting(site,p.id)&&root.EarthCommunityLife.residency(site,p.id)==='member'&&
      !(site.id===world.activeId&&p.id===root.EarthAgency.actorId(site))&&!site.communityLife?.people?.[p.id]?.status?.includes('visitor')&&
      (site.careers?.[p.id]?.skills?.craft??p.aptitudes.craft)>=skill&&
      !root.EarthPurses.workConflict(site,p.id,world.week)&&!root.EarthAutonomy?.sessionSpent(site,p.id,world.week)&&
      !root.EarthDistrictOrders.commitment(world,site,p)&&!root.EarthDistrictGrowth?.work(site,p.id)&&
      !site.civicInitiatives?.history?.some(c=>c.works?.week===world.week&&c.works.people.includes(p.id))&&
      Number.isSafeInteger(funds(site,p.id)+1)&&Number.isSafeInteger((site.purses?.people?.[p.id]?.productionIncome||0)+1));
  }
  function payBuilder(world,site,worker,text){
    root.EarthPurses.productionReceipt(world,site,worker.id,1,text);
    site.purses.people[worker.id].craftWeek=world.week;
    const housing=store(site);
    if(housing.shifts?.week!==world.week)housing.shifts={week:world.week,workers:[]};
    housing.shifts.workers.push(worker.id);
  }
  function finance(world,site,origin,originId,q){
    // The opening shift buys actual public materials and a site, then reserves
    // the remaining two wages in escrow. A later stage must find a free builder.
    const worker=profile(site,q.worker),text=(profile(origin,originId)?.name||'The applicant')+
      ' paid 10 funds for private courtyard '+(q.plot+1)+': one for the plot, six for three material lots, and three builder wages.';
    if(!worker||!root.EarthPurses.productionReceipt(world,origin,originId,-10,text))return {ok:false,message:'The courtyard payment could not be completed.'};
    site.funds+=7;site.materials-=3;
    payBuilder(world,site,worker,worker.name+' earned one reserved fund for laying the foundations on plot '+(q.plot+1)+'.');
    root.EarthPurses.noteDeed(world,site,q.buyerId,'Purchased plot '+(q.plot+1)+' and financed the courtyard.');
    (site.privateHomes||=[]).push({plot:q.plot,ownerId:q.buyerId,stage:1,started:world.week,lastWork:world.week,cost:3});
    const h=store(site),contracts=h.contracts||=[];
    contracts.push({key:profile(site,q.buyerId).identityKey,plot:q.plot,id:q.buyerId,wages:2,materials:2,worker:worker.id,week:world.week});
    return {ok:true,pending:true,message:text+' '+worker.name+' laid its foundations. Admission waits for the completed dwelling.'};
  }
  function buildWeek(world,site){
    const contracts=site.housing?.contracts;
    if(!contracts?.length)return [];
    const notes=[];
    for(const c of contracts){
      const h=site.privateHomes.find(h=>h.plot===c.plot);
      if(h.stage>=3||world.week<h.lastWork+(h.stage===1?3:4))continue;
      const worker=constructionWorker(world,site,h.stage===1?50:46);
      if(!worker)continue;
      c.wages--;c.materials--;c.worker=worker.id;c.week=world.week;
      h.stage++;h.lastWork=world.week;h.cost+=3;
      const text=worker.name+' earned one reserved fund and used one reserved material lot to '+(h.stage===2?'frame':'finish')+' courtyard '+(h.plot+1)+'.';
      payBuilder(world,site,worker,text);notes.push(text);
    }
    site.housing.contracts=contracts.filter(c=>c.wages);
    return notes;
  }
  function grant(world,site,id,q){
    const home=q.dwelling;
    if(q.seller){
      const house=site.privateHomes.find(h=>h.plot===q.plot);
      house.ownerId=id;house.acquired=world.week;delete house.offer;
      root.EarthPurses.noteDeed(world,site,id,'Acquired '+q.label+' for '+q.price+' personal funds.');
    }
    const p=profile(site,id),data=store(site);
    data.rights=data.rights.filter(r=>r.key!==p.identityKey);
    data.rights.push({key:p.identityKey,home});
    data.hardship=data.hardship.filter(r=>r.key!==p.identityKey);
  }
  function sync(world,site){
    const report=view(world,site),data=store(site);
    if(report.reservations.length)data.reservations=report.reservations.map(({id,key,home})=>({id,key,home}));
    else delete data.reservations;
    data.rights=report.rows.filter(r=>r.home).map(r=>({key:r.key,home:r.home}));
    const prior=new Map(data.hardship.map(r=>[r.key,r]));
    data.hardship=report.namedMissing.map(r=>prior.get(r.key)||{id:r.id,key:r.key,weeks:0,strain:0,help:''});
    return report;
  }
  // A recorded death and a person who was actually there can connect a
  // housing case to a particular loss. Reports from elsewhere are insufficient.
  function witnessedLoss(world,site,row){
    const witnesses=site.communityLife?.border?.records||[];
    const accounts=witnesses.filter(a=>a.week>=world.week-12&&a.people.includes(row.key));
    if(!accounts.length)return false;
    const towns=[...world.sites,...world.communityLife.outposts];
    return towns.some(t=>Object.values(t.communityLife?.border?.health||{}).some(h=>
      h.condition==='died'&&accounts.some(a=>a.week===h.week&&a.people.includes(h.key))));
  }
  function careRecord(data,row,week,text){
    const book=data.support||=[];book.unshift({key:row.key,week,text});book.length=Math.min(book.length,16);
  }
  function crisisSupport(world,site,data,row,report){
    const free=new Set(root.EarthCommunityLife.fieldCandidates(site,world));
    const helper=report.rows.find(p=>p.home&&!p.away&&free.has(p.id)&&
      !root.EarthDistrictGrowth?.work(site,p.id)&&!workHold(site,p.id)&&
      (root.EarthAutonomy.bond(site,p.id,row.id,world.week)>=2||
        data.relief==='emergency'&&profile(site,p.id).traits.sociability>=52));
    if(!helper)return '';
    const round=site.growth?.round||0;
    (data.care||=[]).push({id:helper.id,key:helper.key,person:row.key,week:world.week,round});
    return helper.name+' set aside their next ordinary shift to stay with '+row.name+' and help them find support.';
  }
  function tick(world,site){
    if(site.housing?.week===world.week||!world.communityLife)return [];
    const notes=buildWeek(world,site);
    let report=sync(world,site);
    const data=store(site);
    data.week=world.week;
    if(data.care)delete data.care;
    if(data.leases)data.leases=data.leases.filter(l=>l.through>=world.week&&report.homes.some(h=>h.key===l.home&&h.owner===l.owner)&&report.rows.some(r=>r.key===l.tenant));
    const relief=data.relief||'reserve';
    const held=data.hardship.length?root.EarthNeighbourErrands?.heldGoods(site,world.week)||{}:{};
    const floor=(relief==='emergency'?1:6)+(held.funds||0);
    if(relief!=='private'&&data.hardship.length&&site.funds>floor&&site.trust>=40){
      for(const h of report.homes){
        if(!data.hardship.length||site.funds<=floor)break;
        if(!h.owner||remaining(h)<1||site.privateHomes?.some(listing=>listing.offer&&homeKey('private',listing.plot)===h.key))continue;
        const owner=report.rows.find(r=>r.key===h.owner&&!r.away);
        if(!owner||profile(site,owner.id).traits.sociability<(relief==='emergency'?48:65))continue;
        const candidate=report.namedMissing.find(r=>!r.away&&!data.leases?.some(l=>l.tenant===r.key));
        if(!candidate)continue;
        const text=owner.name+' accepted one treasury fund to host '+candidate.name+' in '+h.label+' for four weeks.';
        if(!root.EarthPurses.productionReceipt(world,site,owner.id,1,text))continue;
        site.funds--;(data.leases||=[]).push({owner:h.owner,tenant:candidate.key,home:h.key,through:world.week+3});
        notes.push(text);
      }
      if(data.leases?.length)report=sync(world,site);
    }
    const donors=report.namedMissing.length?report.rows.filter(r=>r.home&&!r.away&&!r.uncounted&&
      funds(site,r.id)>=4&&profile(site,r.id)?.traits.sociability>=60):[];
    for(const difficulty of data.hardship){
      const row=report.namedMissing.find(r=>r.key===difficulty.key);
      if(row.away)continue;
      difficulty.weeks++;
      const donor=donors.shift();
      let help='';
      if(donor){
        const text=donor.name+' gave '+row.name+' one personal fund for emergency accommodation.';
        if(root.EarthPurses.transferPerson(world,site,donor.id,row.id,1,text).ok)help=text;
      }
      if(!help&&relief!=='private'&&(site.trust>=45||relief==='emergency')&&site.food>(held.food||0)+(relief==='emergency'?0:2*Math.ceil(site.population/5))){
        site.food--;help=site.name+' released one food from its reserve for '+row.name+'.';
      }
      if(!help&&relief==='emergency'&&site.funds>floor){
        const text=site.name+' paid one emergency fund to '+row.name+' for temporary shelter.';
        if(root.EarthPurses.productionReceipt(world,site,row.id,1,text)){site.funds--;help=text;}
      }
      const acute=difficulty.crisis!=null;
      if(!acute&&!help&&difficulty.strain>=7&&witnessedLoss(world,site,row)){
        difficulty.crisis=world.week;
        const message=row.name+' told the housing delegate they were in distress after witnessing a death and asked someone to stay with them.';
        careRecord(data,row,world.week,message);notes.push(message);root.EarthCommunityLife.recordWeek(site,world.week,message);
      }
      if(difficulty.crisis!=null&&!help)help=crisisSupport(world,site,data,row,report);
      if(help&&difficulty.crisis!=null){
        careRecord(data,row,world.week,help);
        notes.push(row.name+' received support after asking for help. The housing case stays open.');
        delete difficulty.crisis;
      }
      difficulty.help=help;
      difficulty.strain=help?Math.max(0,difficulty.strain-1):Math.min(20,difficulty.strain+1);
      difficulty.withoutMeals=!help&&site.food===0&&funds(site,row.id)===0?Math.min(20,(difficulty.withoutMeals||0)+1):0;
      const extended=difficulty.strain>=12&&difficulty.weeks>=16;
      const ties=site.autonomy?.people?.[row.id]?.ties||[];
      const personalCrisis=extended&&difficulty.strain>=18&&site.wellbeing<=20&&site.trust<25&&
        !ties.some(t=>t.strength>0)&&profile(site,row.id)?.traits.patience<38;
      const unsupported=difficulty.crisis!=null&&world.week-difficulty.crisis>=6&&difficulty.strain>=14;
      if((unsupported||extended&&(difficulty.withoutMeals>=8||personalCrisis))&&
        root.EarthCommunityLife.closeLife(world,site,row.id)){
        const text=unsupported?row.name+' died by suicide. The housing records preserve their request for company and the weeks it went unanswered.':personalCrisis?row.name+' died by suicide during a prolonged personal crisis. Earlier calls for shelter and support are recorded.':row.name+' died after '+difficulty.weeks+' weeks without stable housing, including a prolonged period without meals or assistance.';
        const losses=data.losses||=[];losses.unshift({week:world.week,id:row.id,key:row.key,name:row.name,text});losses.length=Math.min(16,losses.length);
        root.EarthCommunityLife.recordWeek(site,world.week,text);notes.push(text);
        site.trust=Math.max(0,site.trust-1);continue;
      }
      if(difficulty.weeks===1||help||[3,6,10].includes(difficulty.strain)){
        notes.push(help||row.name+(difficulty.strain>=3?' needs urgent support after '+difficulty.strain+' unrelieved weeks without shelter.':' is looking for shelter and cannot start an ordinary shift.'));
      }
    }
    if(data.losses?.[0]?.week===world.week)sync(world,site);
    if(data.hardship.some(r=>r.strain>=3))site.wellbeing=Math.max(0,site.wellbeing-1);
    return notes;
  }
  function setRelief(world,site,request){
    const value=request.level,prior=site.housing?.relief||'reserve';
    if(site.id!==world.communityLife?.homeId||world.activeId!==site.id||world.communityLife?.journey||
       (root.EarthAgency?.actorId(site)||'steward')!=='steward'||request.actor!=='steward'||
       request.generation!==(site.foundingRevision||0)||request.prior!==prior||!['reserve','emergency','private'].includes(value))
      return {ok:false,message:'The council or its relief terms changed. Reopen the housing directory.'};
    store(site).relief=value;
    const message='The council in '+site.name+' '+({reserve:'will protect food and funds in reserve while arranging relief.',
      emergency:'will fund available shelter and release emergency food when households lack housing.',
      private:'will rely on voluntary household support for now.'}[value]);
    root.EarthCommunityLife.recordWeek(site,world.week,message);
    return {ok:true,message};
  }
  function buildDuty(world,site,id){
    return site.housing?.shifts?.week===world.week&&site.housing.shifts.workers.includes(id)?'Building a courtyard under a funded housing contract':'';
  }
  function workHold(site,id){
    const health=site.communityLife?.border?.health?.[id];
    if(health?.condition==='injured'&&health.key===profile(site,id)?.identityKey)return 'Recovering from an injury before taking an ordinary shift';
    const care=site.housing?.care?.find(r=>r.id===id&&r.week===site.housing.week&&(site.growth?.round||0)<=r.round+1);
    if(care&&profile(site,id)?.identityKey===care.key)return 'Keeping a promised support visit before the next ordinary shift';
    const hardship=site.housing?.hardship?.find(r=>r.id===id);
    return hardship&&local(site,id)&&profile(site,id)?.identityKey===hardship.key?'Seeking shelter before taking another ordinary shift':'';
  }
  function valid(site,week){
    const h=site.housing;
    if(h==null)return true;
    const text=s=>typeof s==='string'&&s.length>0&&s.length<=1100;
    const list=(a,check)=>Array.isArray(a)&&a.length<=64&&a.every(check)&&new Set(a.map(r=>r.key)).size===a.length;
    if(h.shifts!=null&&(!integer(h.shifts?.week,1,week)||!Array.isArray(h.shifts.workers)||h.shifts.workers.length>6||!h.shifts.workers.every(text)||new Set(h.shifts.workers).size!==h.shifts.workers.length))return false;
    if(h.support!=null&&(!Array.isArray(h.support)||h.support.length>16||!h.support.every(r=>r&&text(r.key)&&text(r.text)&&integer(r.week,1,week))))return false;
    if(h.care!=null&&!list(h.care,r=>r&&text(r.id)&&text(r.key)&&text(r.person)&&integer(r.week,1,week)&&integer(r.round,0,site.growth?.round||0)))return false;
    if(h.losses!=null&&(!list(h.losses,r=>r&&text(r.key)&&text(r.id)&&text(r.name)&&text(r.text)&&integer(r.week,1,week))||h.losses.length>16))return false;
    if(h.reservations!=null&&!list(h.reservations,r=>r&&text(r.key)&&text(r.id)&&text(r.home)))return false;
    if(h.relief!=null&&!['reserve','emergency','private'].includes(h.relief))return false;
    if(h.leases!=null&&(!Array.isArray(h.leases)||h.leases.length>64||new Set(h.leases.map(l=>l?.tenant)).size!==h.leases.length||
      h.leases.some(l=>!l||!text(l.tenant)||!text(l.owner)||l.tenant===l.owner||!/^private-[0-5]$/.test(l.home)||!integer(l.through,1,week+3))))return false;
    if(h.contracts!=null&&(!list(h.contracts,c=>{
      if(!c||!text(c.key)||!text(c.id)||!text(c.worker)||!integer(c.plot,0,5)||!integer(c.week,1,week))return false;
      const house=site.privateHomes?.find(v=>v.plot===c.plot),guest=site.communityLife?.people?.[c.id];
      return house&&house.ownerId===c.id&&house.stage>=1&&house.stage<3&&c.wages===3-house.stage&&c.materials===c.wages&&
        guest?.profile?.identityKey===c.key&&guest.status==='visitor';
    })||new Set(h.contracts.map(c=>c.plot)).size!==h.contracts.length))return false;
    return integer(h.week,0,week)&&list(h.rights,r=>r&&text(r.key)&&typeof r.home==='string'&&/^(founding-(?:[0-9]|1[0-7])|precinct-[0-5]|private-[0-5]|(?:guest|property|cottage)-\d{1,4})$/.test(r.home))&&
      list(h.hardship,r=>r&&text(r.id)&&text(r.key)&&integer(r.weeks,0,week)&&integer(r.strain,0,20)&&(r.crisis==null||integer(r.crisis,1,week))&&(r.withoutMeals==null||integer(r.withoutMeals,0,20))&&typeof r.help==='string'&&r.help.length<=650)&&
      !h.hardship.some(r=>h.rights.some(a=>r.key===a.key));
  }
  root.EarthHousing=Object.freeze({frontage,additionalPlaces,view,need,projected,privateInspection,quote,pay,finance,buildDuty,setRelief,grant,sync,tick,workHold,valid});
})(typeof window==='undefined'?globalThis:window);
