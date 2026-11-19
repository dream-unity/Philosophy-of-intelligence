/* Land titles and residential licences survive absence, a change of occupation,
   and a change of camera. Only a completed building can supply a licence. */
(function(root){
  'use strict';
  const centre=Object.freeze({x:-1.9,y:23.3});
  const newPlot=n=>({x:23.35,y:-1.9-n*1.85});
  const townKey=p=>p.identityKey||p.id;
  const roll=site=>site.housing;
  const towns=w=>[...w.sites,...w.communityLife?.outposts||[]];
  const cash=(s,id)=>s.purses?.people?.[id]?.balance||0;
  const bounded=(v,l,h)=>Math.min(h,Math.max(l,v));
  function log(w,s,text){
    const rows=roll(s).history;
    rows.unshift({week:w.week,round:s.growth?.round||0,text});if(rows.length>20)rows.pop();
    root.EarthCommunityLife.recordWeek(s,w.week,text);
  }
  function namedMembers(w,s){
    const life=root.EarthCommunityLife,c=s.communityLife||{},result=[];
    const ids=new Set(['steward',...s.residents.map(p=>p.id),...Array.from({length:5},(_,i)=>'walker-'+i),'driver',...Object.keys(c.people||{}).sort()]);
    for(const id of ids){
      const g=c.people?.[id],away=c.away?.[id];
      if(id==='steward'){
        if(s.id!==w.communityLife.homeId)continue;
      }else if(g?.status==='former'||g?.status==='visitor'||life.commuting(s,id))continue;
      else if(away&&!['regional-field','regional-freight','regional-visit','border-duty'].includes(away)){
        const dest=towns(w).find(t=>t.id===away);
        if(!dest||!Object.values(dest.communityLife?.people||{}).some(v=>v.status==='visitor'&&v.visitFrom===s.id&&v.visitSlot===id))continue;
      }
      const p=id==='steward'?w.communityLife.profile:root.EarthPersonas.profile(s,id);
      if(p)result.push({id,key:townKey(p),name:p.name,away:!!away,profile:p});
    }
    return result;
  }
  function initialise(w,s,legacy=false){
    if(!w.communityLife||!s.communityLife||s.housing)return;
    const people=namedMembers(w,s),known=new Map(people.map(p=>[p.key,p]));
    const registered=s.growth?.households||[];
    // Honour named deeds even when the owner of an old save has already moved.
    const families=registered.map(h=>({key:h.owner,name:h.name,plot:h.plot}));
    const owners=new Set(families.map(f=>f.key));
    for(const p of people)if(!owners.has(p.key))families.push({...p,plot:families.length});
    const missing=Math.max(0,s.population-people.length);
    const h=s.housing={version:1,titles:[],licences:{},members:{},distress:{},history:[],serial:0,reason:'Town Centre is reviewing its housing roll.'};
    const shortage=!legacy&&s.id.startsWith('near-')&&s.id.endsWith('-0');
    for(const f of families){
      if(shortage&&f===families.at(-1))continue;
      const id='family-'+f.plot;
      h.titles.push({id,kind:'family',plot:f.plot,owner:f.key,ownerName:f.name,beds:1});
      if(known.has(f.key))h.licences[f.key]=id;
    }
    // Earlier worlds promised eighteen places before precinct or private works.
    // Put the outstanding places in a real, inspectable municipal lodging house.
    const inherited=legacy?Math.max(missing,18-h.titles.length):missing+(shortage?0:2);
    if(inherited)h.titles.push({id:'lodge',kind:'lodge',plot:0,owner:'council',ownerName:s.name+' council',beds:inherited});
    sync(w,s,people);
  }
  function sync(w,s,people=namedMembers(w,s)){
    const h=roll(s);if(!h)return;
    const members={};
    for(const p of people)members[p.key]={id:p.id,name:p.name};
    // Earlier saves sometimes recorded an aggregate census. Keep the occupants
    // visible as a group without inventing identities or changing that census.
    h.other=Math.max(0,s.population-people.length);
    for(const key of Object.keys(h.licences))if(!members[key])delete h.licences[key];
    for(const key of Object.keys(h.distress))if(!members[key])delete h.distress[key];
    h.members=members;
    reconcile(s);
  }
  function dwellings(s,precincts=s.city?.precincts||[]){
    const h=roll(s);if(!h)return [];
    const homes=h.titles.map(t=>({...t}));
    for(const t of homes)if(t.kind==='family'){
      const family=s.growth?.households[t.plot];
      if(family?.owner===t.owner&&family.guestRoom&&family.access){t.beds++;t.shared=true;}
    }
    for(const [i,p] of precincts.entries())if(p.use==='homes'){
      const beds=root.EarthCityModel.precinctBeds(s,i);
      homes.push({id:'precinct-'+i,kind:'precinct',plot:i,beds,owner:'council',ownerName:s.name+' council'});
    }
    for(const a of s.privateHomes||[])if(a.stage===3){
      const p=root.EarthPersonas.profile(s,a.ownerId);
      homes.push({id:'court-'+a.plot,kind:'courtyard',plot:a.plot,beds:2,owner:p?townKey(p):a.ownerId,ownerName:p?.name||a.ownerId});
    }
    return homes;
  }
  function reconcile(s){
    const h=roll(s),homes=dwellings(s),byId=new Map(homes.map(t=>[t.id,t])),used=new Map();
    const rights=h.licences;
    for(const [key,id] of Object.entries(rights)){
      const t=byId.get(id),n=used.get(id)||0;
      if(!t||n>=t.beds||t.owner!=='council'&&t.owner!==key&&!t.shared)delete rights[key];
      else used.set(id,n+1);
    }
    // Historical unnamed household members have the same prior claim each turn.
    let unallocated=h.other;
    for(const t of homes)if(t.owner==='council'&&unallocated){
      const n=Math.min(t.beds-(used.get(t.id)||0),unallocated);used.set(t.id,(used.get(t.id)||0)+n);unallocated-=n;
    }
    for(const [key,m] of Object.entries(h.members)){
      if(rights[key])continue;
      const t=homes.find(t=>t.owner===key&&(used.get(t.id)||0)<t.beds)||
        homes.find(t=>(t.owner==='council'||t.shared)&&(used.get(t.id)||0)<t.beds);
      if(t){rights[key]=t.id;used.set(t.id,(used.get(t.id)||0)+1);delete h.distress[key];}
      else h.distress[key]||={weeks:0,health:100,reason:m.name+' has no completed dwelling with residential rights.'};
    }
    for(const key of Object.keys(rights))delete h.distress[key];
    h.otherUnhoused=unallocated;
  }
  function summary(s){
    const h=roll(s);if(!h)return null;
    let capacity=0;
    for(const t of h.titles){
      capacity+=t.beds;
      const f=t.kind==='family'&&s.growth?.households[t.plot];
      if(f&&f.owner===t.owner&&f.access&&f.guestRoom)capacity++;
    }
    for(const [i,p] of (s.city?.precincts||[]).entries())if(p.use==='homes')capacity+=root.EarthCityModel.precinctBeds(s,i);
    for(const p of s.privateHomes||[])if(p.stage===3)capacity+=2;
    const occupied=Object.keys(h.licences).length+h.other-h.otherUnhoused;
    return {capacity,occupied,vacant:Math.max(0,capacity-occupied),unhoused:Object.keys(h.distress).length+h.otherUnhoused,
      future:h.project?.kind==='house'?2:0};
  }
  function directory(s){
    const h=roll(s),homes=dwellings(s),used=new Map();
    for(const [k,id] of Object.entries(h.licences)){const list=used.get(id)||[];list.push(h.members[k]?.name||k);used.set(id,list);}
    let anonymous=h.other-h.otherUnhoused;
    for(const t of homes){
      t.people=used.get(t.id)||[];t.other=t.owner==='council'?Math.min(anonymous,t.beds-t.people.length):0;anonymous-=t.other;
      t.vacant=t.beds-t.people.length-t.other;
    }
    return homes;
  }
  function position(s,t){
    if(t.kind==='family')return root.EarthDistrictGrowth.homePoint(s,t.plot);
    if(t.kind==='precinct')return root.EarthConstruction.streetPoint({scope:'city',precinct:t.plot});
    if(t.kind==='courtyard')return root.EarthConstruction.privateHomeSite(t.plot);
    if(t.kind==='lodge')return {x:-3.9,y:23.3};
    return newPlot(t.plot);
  }
  const label=t=>({family:'Residential lot '+(t.plot+1),house:'Council home '+(t.plot+1),lodge:'Municipal lodging house',
    precinct:'Housing precinct '+(t.plot+1),courtyard:'Courtyard '+(t.plot+1),shop:'Cooperative shop '+(t.plot+1)})[t.kind];
  function accessible(s){
    const h=s.housing,ids=new Set();let beds=0;
    for(const t of h.titles){
      const f=t.kind==='family'&&s.growth?.households[t.plot],shared=f&&f.owner===t.owner&&f.access&&f.guestRoom;
      if(t.owner==='council'||shared){ids.add(t.id);beds+=t.beds+Number(!!shared);}
    }
    for(const [i,p] of (s.city?.precincts||[]).entries())if(p.use==='homes'){
      ids.add('precinct-'+i);beds+=root.EarthCityModel.precinctBeds(s,i);
    }
    for(const id of Object.values(h.licences))if(ids.has(id))beds--;
    return Math.max(0,beds-h.other+h.otherUnhoused);
  }
  function reason(s,id){
    const key=root.EarthPersonas.profile(s,id)?.identityKey;
    return key&&s.housing?.distress[key]?.reason||'';
  }
  function reserved(s,id){
    return s.housing?.project?.worker===id?s.housing.project:null;
  }
  function jobView(s){
    const j=s.housing?.project;if(!j?.worker)return null;
    const dest={...newPlot(j.plot),label:label(j)},store={x:21.1,y:17.46,label:'Public building store'};
    const hauling=j.phase==='delivery',from=hauling?store:dest,to={...dest,y:dest.y+.55};
    return {kind:'build',id:j.id,ownerId:j.worker,workerName:j.name,name:label(j),phase:j.phase,step:hauling?1:2,steps:2,orderGood:'materials',
      source:from.label,from,to,point:to,destination:dest.label,venue:'workshop',action:hauling?'Deliver building materials':'Finish construction',
      reason:j.reason,resource:'materials',resourceName:'building materials',amount:j.materials,payer:s.name+' council',price:j.wage,
      tool:hauling?'handcart':'measuring rule',startedAt:j.at,travelMs:hauling?root.EarthDistrictOrders.movement(s,from,to):0,workMs:hauling?1200:6500};
  }
  function production(w,s,people,busy,floor,at,closeWeek,rows,events){
    const h=roll(s);if(!h)return;
    reconcile(s);
    const add=root.EarthDistrictOrders.record,publicStore='Public building store',publicFunds=root.EarthDistrictOrders.publicAccount;
    const name=s.name+' Town Centre',g=s.growth;
    let j=h.project;
    const employed=p=>!busy.has(p.id)&&!reason(s,p.id)&&!root.EarthDistrictOrders.commitment(w,s,p)&&
      !(s.id===w.activeId&&p.id===root.EarthAgency.actorId(s))&&!g.road?.ids?.includes(p.id)&&
      !g.households.some(f=>f.build?.person===p.id||f.order?.person===p.id||f.purchase?.person===p.id);
    const craft=p=>s.careers?.[p.id]?.skills?.craft??p.aptitudes.craft;
    const assign=()=>people.filter(p=>employed(p)&&craft(p)>=34).sort((a,b)=>craft(b)-craft(a)||a.id.localeCompare(b.id))[0];
    if(j){
      let worker=people.find(p=>p.id===j.worker);
      if(!worker||!employed(worker)){delete j.worker;worker=assign();if(worker){j.worker=worker.id;j.name=worker.name;j.at=at;}}
      if(!worker){h.reason='The funded worksite is waiting for a free builder. Supplies and wages remain reserved.';return;}
      busy.add(worker.id);
      const task=jobView(s);
      if(!closeWeek&&at>=j.at&&at<j.at+task.travelMs+task.workMs)return;
      if(j.phase==='delivery'){
        j.phase='building';j.at=at;add(rows,'Reserved building store',label(j),'materials',j.materials,worker.id,j.id,'Materials delivered to the plot');
        h.reason=worker.name+' delivered '+j.materials+' materials to '+label(j)+'. Construction is under way.';events.push(h.reason);return;
      }
      if(!root.EarthPurses.productionReceipt(w,s,worker.id,j.wage,worker.name+' earned '+j.wage+' funds completing '+label(j)+'.'))return;
      add(rows,'Town Centre wage reserve',worker.name,'funds',j.wage,worker.id,j.id,'Building contract completed');
      g.points+=4;const household=g.households.find(f=>f.owner===townKey(worker));if(household)household.points+=4;
      const title={id:j.id,kind:j.kind,plot:j.plot,owner:j.reservedFor||'council',ownerName:j.ownerName||s.name+' council',beds:j.kind==='house'?2:0,builder:worker.name,opened:w.week};
      if(j.kind==='shop')title.stock=0;
      h.titles.push(title);delete h.project;reconcile(s);
      const residents=Object.entries(h.licences).filter(([,id])=>id===title.id).map(([k])=>h.members[k].name);
      h.reason=worker.name+' opened '+label(title)+'. '+(residents.length?residents.join(' and ')+' moved in.':j.kind==='house'?'Two places opened for admission.':'The cooperative can stock and sell meals.');
      h.lastBuilt=g.round;log(w,s,h.reason);events.push(h.reason);return;
    }
    const state=summary(s),open=accessible(s);
    const needRoom=state.unhoused>0||open===0&&s.population<Math.min(25,12+s.tech.length*3)&&s.food>=floor.food+2;
    const needsShop=!h.titles.some(t=>t.kind==='shop')&&!g.households.some(f=>f.shop)&&g.round>=3&&s.food>floor.food+1;
    const kind=needRoom?'house':needsShop?'shop':null;
    if(!kind){h.reason='The council has reviewed its housing and trading places.';return;}
    const why=state.unhoused?state.unhoused+' without residential rights':needRoom?'no available home for the next recruit':'households need a local food shop';
    h.reason='Proposal for '+(kind==='house'?'a two-place home':'a cooperative shop')+' because '+why+'. ';
    const materials=kind==='house'?4:3,wage=3;
    if(s.materials-floor.materials<materials||s.funds-floor.funds<wage){h.reason+='Waiting for '+materials+' available materials and '+wage+' uncommitted treasury funds.';return;}
    const worker=assign();
    if(!worker){h.reason+='Every available builder is committed elsewhere.';return;}
    const plot=h.serial++,id='civic-'+plot;
    j=h.project={id,kind,plot,phase:'delivery',at,worker:worker.id,name:worker.name,wage,materials,reason:h.reason,week:w.week};
    s.materials-=materials;s.funds-=wage;busy.add(worker.id);
    add(rows,publicStore,'Reserved building store','materials',materials,worker.id,id,'Set aside for '+label(j));
    add(rows,publicFunds,'Town Centre wage reserve','funds',wage,worker.id,id,'Funded construction contract');
    h.reason+='The council assigned plot '+(plot+1)+' and contracted '+worker.name+'.';events.push(h.reason);log(w,s,h.reason);
  }
  function trade(w,s,people,busy,floor,rows){
    const shop=s.housing?.titles.find(t=>t.kind==='shop');if(!shop)return;
    const record=root.EarthDistrictOrders.record;
    const seller=people.find(p=>!busy.has(p.id)&&!reason(s,p.id)&&!root.EarthDistrictOrders.commitment(w,s,p)&&
      !root.EarthDistrictGrowth.work(s,p)&&!(s.id===w.activeId&&p.id===root.EarthAgency.actorId(s)));
    if(!seller)return;
    if(shop.stock<2&&s.food>floor.food+1){s.food--;shop.stock++;record(rows,'Public pantry',label(shop),'food',1,seller.id,shop.id,'Stocked cooperative counter');}
    const buyer=people.find(p=>p!==seller&&cash(s,p.id)>=2&&!busy.has(p.id)&&!root.EarthDistrictGrowth.work(s,p)&&!root.EarthDistrictOrders.commitment(w,s,p)&&
      !(s.id===w.activeId&&p.id===root.EarthAgency.actorId(s)));
    if(!buyer||!shop.stock)return;
    if(!root.EarthPurses.productionReceipt(w,s,buyer.id,-2,buyer.name+' bought a meal from '+label(shop)+'.'))return;
    root.EarthPurses.productionReceipt(w,s,seller.id,1,seller.name+' earned a cooperative sales wage.');
    s.funds++;shop.stock--;shop.sales=(shop.sales||0)+1;
    const family=s.growth.households.find(f=>f.owner===townKey(buyer));if(family)family.pantry=(family.pantry||0)+1;
    record(rows,buyer.name,seller.name,'funds',1,buyer.id,shop.id,'Counter wage');
    record(rows,buyer.name,root.EarthDistrictOrders.publicAccount,'funds',1,buyer.id,shop.id,'Cooperative receipts');
    record(rows,label(shop),buyer.name,'food',1,buyer.id,shop.id,'Meal parcel');
    busy.add(seller.id);busy.add(buyer.id);
  }
  function relief(w,s){
    const h=roll(s);if(!h)return;
    sync(w,s);
    for(const [key,d] of Object.entries(h.distress)){
      const m=h.members[key],p=root.EarthPersonas.profile(s,m.id);if(!p)continue;
      d.weeks++;const donors=root.EarthDistrictGrowth.members(s).filter(a=>h.licences[townKey(a)]&&cash(s,a.id)>=3&&a.traits.sociability>=55);
      const donor=donors[(d.weeks-1)%Math.max(1,donors.length)];
      const aided=donor&&root.EarthPurses.transferPerson(w,s,donor.id,m.id,1,donor.name+' gave '+m.name+' one fund at the Town Centre.').ok;
      const meal=d.weeks>=2&&s.food>Math.ceil(s.population/5)*2&&s.trust>=40;
      if(meal)s.food--;
      d.health=bounded(d.health+(meal?4:-9)+(aided?4:-3),0,100);
      d.reason=m.name+' is seeking shelter and assistance at the Town Centre. Week '+d.weeks+' without a licence. '+(aided?donor.name+' gave a fund. ':'')+(meal?'The council provided food.':'The pantry declined relief.');
      if(d.health===0&&m.id!=='steward'&&s.population>1&&root.EarthCommunityLife.canLeave(s,m.id,w)){
        root.EarthCommunityLife.loseResident(w,s,m.id,'died after prolonged deprivation');delete h.distress[key];
      }
    }
  }
  function structures(s){
    if(!s?.housing)return [];
    const h=s.housing,items=[{...centre,id:'town-centre',art:'hall',title:'Town Centre',use:'townCentre',info:'Housing licences, admission and the local assembly.'}];
    const existing=new Set((s.growth?.households||[]).filter(f=>f.home>0).map(f=>f.owner));
    for(const t of h.titles){
      if(t.kind==='family'&&existing.has(t.owner))continue;
      const at=position(s,t);items.push({...at,id:t.id,art:t.kind==='shop'?'market':'home',title:label(t),use:'housing',info:t.ownerName+' · '+(t.kind==='shop'?(t.sales||0)+' sales · '+(t.stock||0)+' meals stocked':t.beds+' completed residential place(s)')});
    }
    if(h.project){const j=h.project;items.push({...newPlot(j.plot),id:j.id,art:'worksite',title:label(j),use:'housing',info:j.name+' · '+j.phase+' · '+j.materials+' materials committed'});}
    return items;
  }
  function valid(s){
    const h=s.housing;if(!h)return h===undefined;
    const nat=n=>Number.isSafeInteger(n)&&n>=0,txt=x=>typeof x==='string'&&x.length>0&&x.length<=1200,obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
    if(h.version!==1||!Array.isArray(h.titles)||!Array.isArray(h.history)||h.history.length>20||!nat(h.serial)||!obj(h.members)||!obj(h.licences)||!obj(h.distress)||
      !nat(h.other)||!nat(h.otherUnhoused)||h.otherUnhoused>h.other||!txt(h.reason))return false;
    const ids=new Set();
    for(const t of h.titles){
      if(!t||!txt(t.id)||ids.has(t.id)||!['family','lodge','house','shop'].includes(t.kind)||!nat(t.plot)||!nat(t.beds)||!txt(t.owner)||!txt(t.ownerName))return false;
      ids.add(t.id);
    }
    const j=h.project;
    return (!j||obj(j)&&txt(j.id)&&!ids.has(j.id)&&['house','shop'].includes(j.kind)&&nat(j.plot)&&j.plot<h.serial&&['delivery','building'].includes(j.phase)&&nat(j.at)&&
      (!j.worker||txt(j.worker))&&txt(j.name)&&j.wage===3&&j.materials===(j.kind==='house'?4:3)&&txt(j.reason))&&
      Object.entries(h.members).every(([k,m])=>txt(k)&&obj(m)&&txt(m.name)&&txt(m.id))&&Object.entries(h.licences).every(([k,id])=>Object.hasOwn(h.members,k)&&txt(id))&&
      Object.entries(h.distress).every(([k,d])=>Object.hasOwn(h.members,k)&&!h.licences[k]&&obj(d)&&nat(d.weeks)&&nat(d.health)&&d.health<=100&&txt(d.reason))&&
      h.history.every(e=>obj(e)&&nat(e.week)&&nat(e.round)&&txt(e.text));
  }
  root.EarthHousing={centre,structures,initialise,sync,dwellings,directory,summary,position,label,accessible,reason,reserved,production,trade,relief,log,valid,jobView,newPlot,namedMembers};
})(globalThis);
