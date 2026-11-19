/* The register belongs to the settlement. Looking at it never allocates a
   room or advances a contract. A deed, a completed dwelling and a tenancy
   are separate records. Identity keys remain stable when a street slot changes. */
(function(root){
  'use strict';
  const key=p=>p.identityKey||p.id;
  const centrePoint={x:21,y:3};
  const towns=w=>[...w.sites,...(w.communityLife?.outposts||[])];
  const balance=(site,id)=>site.purses?.people?.[id]?.balance||0;
  const natural=n=>Number.isSafeInteger(n)&&n>=0;
  const own=(o,k)=>Object.hasOwn(o,k);
  const clerk=site=>root.EarthCommunityLife.hostFor(site).name;
  const pointFor=i=>({x:1.7+(i%10)*2.2,y:-1.9-Math.floor(i/10)*1.75});
  const projectName=p=>p.kind==='home'?'Two-room dwelling':p.kind==='shop'?'Cooperative store':'Workshop';
  function roster(w,s){
    const c=s.communityLife||{},members=new Map();
    const get=id=>id==='steward'?w.communityLife.profile:root.EarthPersonas.profile(s,id);
    const add=id=>{const p=get(id);if(p)members.set(key(p),p);};
    for(const p of root.EarthPersonas.list(s)){
      if(p.id==='steward'||root.EarthCommunityLife.commuting(s,p.id)||root.EarthCommunityLife.residency(s,p.id)!=='member')continue;
      members.set(key(p),p);
    }
    if(w.communityLife.homeId===s.id)add('steward');
    for(const [id,to] of Object.entries(c.away||{})){
      if(id==='steward'||root.EarthCommunityLife.commuting(s,id))continue;
      if(['regional-field','regional-freight','regional-visit','regional-watch'].includes(to)){add(id);continue;}
      const target=w.sites.find(t=>t.id===to)||w.communityLife.outposts.find(t=>t.id===to);
      if(target&&Object.values(target.communityLife?.people||{}).some(g=>g.status==='visitor'&&g.visitFrom===s.id&&g.visitSlot===id))add(id);
    }
    return [...members.values()];
  }
  function note(w,s,text,person=null,kind='council'){
    const c=s.centre;
    c.history.unshift({week:w.week,round:s.growth?.round||0,kind,text,person});
    if(c.history.length>28)c.history.pop();
    c.revision++;
  }
  function establish(w,s,legacy=false){
    if(s.centre||!s.communityLife||!w.communityLife)return;
    if(!legacy&&/^(field|circle)-/.test(s.id)&&!s.exchange){
      // A newly founded exchange can trade only what its settlers brought.
      s.exchange={serial:1,lastWeek:w.week,till:0,shelf:{food:0,materials:0},locked:{funds:0,materials:0},history:[]};
    }
    const people=roster(w,s),rows=s.growth?.households||[];
    const c=s.centre={version:1,revision:0,plots:[],rights:{},distress:{},history:[],applications:[],serial:0,lastDecision:0};
    // A recovered save keeps its developed land, its full old housing allowance,
    // and the larger census rolls that pre-date named actors.
    let beds=legacy?Math.max(18,rows.length):s.id===w.communityLife.originId?18:s.population;
    if(!legacy&&s.id.startsWith('near-')&&s.id.endsWith('-0'))beds+=3;
    if(!legacy&&s.id.startsWith('near-')&&s.id.endsWith('-1'))beds++;
    const waiting=!legacy&&s.id.startsWith('near-')&&s.id.endsWith('-2');
    if(waiting)beds=Math.max(1,beds-1);
    const owners=[...rows.map(h=>({owner:h.owner,name:h.name,point:h.houseSite||pointFor(h.plot)}))];
    const existing=new Set(owners.map(p=>p.owner));
    for(const p of people)if(!existing.has(key(p)))owners.push({owner:key(p),name:p.name,point:pointFor(owners.length)});
    for(const person of owners.slice(0,beds)){
      const id=c.plots.length;
      c.plots.push({id,kind:'home',title:person.name+'’s dwelling',owner:person.owner,beds:1,...(!legacy&&id<3?{x:[9,21,21][id],y:[21,15,21][id],founding:true}:person.point)});
      if(people.some(p=>key(p)===person.owner))c.rights[person.owner]=id;
    }
    // Each remaining room is located in a named, publicly owned lodging house.
    if(c.plots.length<beds){
      const id=c.plots.length;c.plots.push({id,kind:'home',title:'Founders’ lodging house',owner:null,beds:beds-id,...pointFor(id)});
    }
    c.legacyHouseholds=Math.max(0,s.population-people.length);
    // Keep long-running anonymous census totals without inventing modern identities.
    if(c.legacyHouseholds){
      let left=c.legacyHouseholds;
      for(const d of c.plots){const used=Object.values(c.rights).filter(n=>n===d.id).length;
        d.legacy=Math.min(left,d.beds-used);left-=d.legacy;if(!left)break;}
      c.legacyUnhoused=left;
    }
    c.charter=s.communityLife.district==='works'||s.communityLife.district==='slipway'?'closed':
      s.communityLife.district==='gardens'||s.communityLife.district==='landing'?'hospitality':'introduction';
    c.history.push({week:w.week,round:0,kind:'charter',person:null,text:c.charter==='closed'?
      'After a forced removal from the old repair yard, the founders gave a boundary assembly authority to exclude uninvited parties. Several households argued for a guest pass.':
      c.charter==='hospitality'?'The founding households agreed to offer visitors a meal and hear applications in the Town Centre.':
      'The founding assembly asked visitors to meet a local sponsor before taking up work.'});
  }
  function allPlaces(s){
    const c=s.centre;if(!c)return [];
    const plots=c.plots.filter(p=>p.kind==='home').map(p=>({...p}));
    const access=new Map(plots.filter(p=>p.owner).map(p=>[p.owner,p]));
    for(const h of s.growth?.households||[])if(h.guestRoom&&h.access&&access.has(h.owner)){const d=access.get(h.owner);d.beds++;d.host=true;}
    for(const h of s.privateHomes||[])if(h.stage===3){
      const p=root.EarthPersonas.profile(s,h.ownerId),where=root.EarthConstruction?.privateHomeSite?.(h.plot);
      if(where)plots.push({id:'court-'+h.plot,kind:'home',title:'Courtyard '+(h.plot+1),owner:p&&key(p),beds:2,x:where.objectX,y:where.objectY});
    }
    for(const [i,p] of (s.city?.precincts||[]).entries())if(p.use==='homes'){
      const where=root.EarthConstruction?.streetPoint?.({scope:'city',precinct:i});
      plots.push({id:'precinct-'+i,kind:'home',title:'Precinct '+(i+1)+' housing',owner:null,beds:root.EarthCityModel.precinctBeds(s,i),x:where?.x??15,y:where?.y??15});
    }
    return plots;
  }
  function availableRooms(s){
    if(!s.centre)return 0;
    const used=new Map();
    for(const id of Object.values(s.centre.rights))used.set(id,(used.get(id)||0)+1);
    return allPlaces(s).reduce((n,d)=>n+(d.owner&&!d.host?0:Math.max(0,d.beds-(used.get(d.id)||0)-(d.legacy||0)-Number(s.centre.incoming?.plot===d.id))),0);
  }
  function baseCapacity(s){
    const c=s.centre;
    return c.plots.reduce((n,d)=>n+d.beds,0)+(root.EarthResidentShops?.housingPlaces(s)||0)+
      (s.growth?.households||[]).reduce((n,h)=>n+Number(Boolean(h.guestRoom&&h.access&&c.plots.some(d=>d.owner===h.owner))),0);
  }
  function capacity(s){
    return baseCapacity(s)+(s.city?.precincts||[]).reduce((n,p,i)=>n+(p.use==='homes'?root.EarthCityModel.precinctBeds(s,i):0),0);
  }
  function view(w,s,people=roster(w,s)){
    const c=s.centre,plots=allPlaces(s),byId=new Map(plots.map(d=>[d.id,d]));
    for(const d of plots)d.occupants=[];
    const residents=people.map(p=>{
      const k=key(p),d=byId.get(c.rights[k]);
      if(d)d.occupants.push(k);
      return {p,key:k,plot:d||null,distress:c.distress[k]||null,away:!root.EarthCommunityLife.present(s,p.id),cash:balance(s,p.id)};
    });
    const waiting=c.incoming,hasHold=d=>waiting&&waiting.plot===d.id;
    for(const d of plots){
      d.free=Math.max(0,d.beds-d.occupants.length-(d.legacy||0));
      d.reserved=Number(Boolean(d.free&&hasHold(d)));
      d.available=(!d.owner||d.host)?Math.max(0,d.free-d.reserved):0;
    }
    const unhoused=residents.filter(r=>!r.plot);
    const active=s.communityLife?.people||{};
    return {plots,residents,unhoused,missing:unhoused.length+(c.legacyUnhoused||0),visitors:Object.entries(active).filter(([id,g])=>root.EarthCommunityLife.residency(s,id)==='visitor').length,
      capacity:plots.reduce((n,d)=>n+d.beds,0),available:plots.reduce((n,d)=>n+d.available,0),
      vacant:plots.reduce((n,d)=>n+d.free,0),population:s.population,project:c.project,history:c.history};
  }
  function reconcile(w,s,people){
    const c=s.centre,v=view(w,s,people),keys=new Set(people.map(key)),validIds=new Set(v.plots.map(d=>d.id));
    for(const k of Object.keys(c.rights))if(!keys.has(k)||!validIds.has(c.rights[k]))delete c.rights[k];
    for(const k of Object.keys(c.distress))if(!keys.has(k))delete c.distress[k];
    for(const d of v.plots){
      let left=d.beds-(d.legacy||0);
      const registered=d.occupants.slice().sort((a,b)=>Number(b===d.owner)-Number(a===d.owner));
      for(const k of registered){if(--left<0||d.owner!==k&&d.owner&&!d.host&&!d.consent?.includes(k))delete c.rights[k];}
    }
    const taken=new Map();
    for(const id of Object.values(c.rights))taken.set(id,(taken.get(id)||0)+1);
    for(const person of people){
      const k=key(person);if(own(c.rights,k)){delete c.distress[k];continue;}
      const free=d=>d.beds>(taken.get(d.id)||0)+(d.legacy||0)+Number(c.incoming?.plot===d.id);
      const d=v.plots.find(d=>d.owner===k&&free(d))||v.plots.find(d=>(!d.owner||d.host||d.consent?.includes(k))&&free(d));
      if(d){c.rights[k]=d.id;taken.set(d.id,(taken.get(d.id)||0)+1);delete c.distress[k];c.revision++;}
      else c.distress[k]||={since:w.week,rounds:0,severity:0,last:'Seeking a room and assistance.'};
    }
    // Earlier editions kept some households only on the aggregate census.
    // A completed public dwelling can house them too, after named tenancies.
    if(c.legacyUnhoused){
      for(const d of c.plots){
        if(d.kind!=='home'||d.owner)continue;
        const held=Number(c.incoming?.plot===d.id),open=d.beds-(taken.get(d.id)||0)-(d.legacy||0)-held;
        const assigned=Math.min(Math.max(0,open),c.legacyUnhoused);
        if(assigned){d.legacy=(d.legacy||0)+assigned;c.legacyUnhoused-=assigned;c.revision++;}
        if(!c.legacyUnhoused)break;
      }
    }
  }
  function homePoint(s,h){
    if(!s.centre||!h)return null;
    if(s.centre.distress[h.owner])return {...centrePoint};
    const id=s.centre.rights[h.owner],d=s.centre.plots.find(d=>d.id===id);
    return d?{x:d.x,y:d.y}:typeof id==='string'?allPlaces(s).find(d=>d.id===id)||null:null;
  }
  function held(s,id){const j=s.centre?.project;return j?.worker===id?j:null;}
  function restriction(s,p){
    if(!s.centre)return '';
    if(s.centre.distress[key(p)])return 'Seeking stable housing and relief at the Town Centre';
    if(s.centre.departures?.[p.id])return 'Preparing a signed regional move';
    if(s.centre.spent&&s.centre.spent.round===s.growth?.round&&s.centre.spent.people.includes(p.id))return 'Completed a funded Town Centre shift';
    const scene=s.centre.boundaryScene;
    if(scene&&scene.guard.id===p.id&&scene.round+2>(s.growth?.round||0))return 'On watch at the boundary after a confrontation';
    if(held(s,p.id))return 'Committed to the Town Centre construction contract';
    if(s.centre.expedition?.crew.some(m=>m.id===p.id))return 'Away on the boundary assembly’s orders';
    if((s.centre.injuries?.[key(p)]||0)>(s.growth?.round||0))return 'Recovering after a confrontation';
    return '';
  }
  function projectWork(s,id){
    const j=held(s,id);if(!j)return null;
    const point={...j.point,label:'plot '+(j.plot+1)},store={x:21.1,y:17.46,label:'building store'};
    const carrying=j.stage===0;
    return {kind:'build',id:j.id,ownerId:id,workerName:j.workerName,name:projectName(j),phase:'build',step:j.stage+1,steps:3,
      from:carrying?store:point,to:point,point,destination:point.label,venue:'workshop',action:carrying?'Deliver reserved materials':'Build '+projectName(j).toLowerCase(),
      reason:j.reason,resource:'materials',resourceName:'building materials',orderGood:'materials',amount:4,payer:'Town Centre',price:3,
      tool:'builder’s tools',startedAt:j.at,travelMs:carrying?j.travelMs:0,workMs:3500};
  }
  function chooseWorker(w,s,people,exclude,appointments){
    const c=s.centre,households=new Map((s.growth?.households||[]).map(h=>[h.owner,h]));
    let best=null,score=-1;
    for(const p of people){const h=households.get(key(p));
      if(p.id===exclude||!root.EarthCommunityLife.present(s,p.id)||s.growth?.road?.ids?.includes(p.id)||h?.order||h?.build||h?.purchase||
        root.EarthDistrictOrders.commitment(w,s,p,appointments)||c.distress[key(p)])continue;
      const a=s.careers?.[p.id]?.skills?.craft??p.aptitudes.craft;
      if(a>=30&&a>score){best=p;score=a;}
    }return best;
  }
  function contract(w,s,people,floor,at,closing,entries,events,appointments){
    const c=s.centre,j=c.project,add=root.EarthDistrictOrders.record;
    if(j){
      const p=people.find(p=>p.id===j.worker&&key(p)===j.workerKey);
      if(!p||!root.EarthCommunityLife.present(s,p.id)||c.distress[j.workerKey]){
        j.worker=null;
        const next=chooseWorker(w,s,people,null,appointments);
        if(next){j.worker=next.id;j.workerKey=key(next);j.workerName=next.name;j.at=at;}
        else {c.stall='Funded contract held at plot '+(j.plot+1)+' until another builder is free.';return;}
      }
      const ms=j.stage===0?j.travelMs+3500:4800;
      if(!closing&&at>=j.at&&at-j.at<ms)return;
      if(j.stage===0){
        j.delivered=4;add(entries,'Building store reservation','Plot '+(j.plot+1),'materials',4,j.worker,j.id,'Materials delivered to construction');
        events.push(j.workerName+' delivered four materials to plot '+(j.plot+1)+'.');
      }
      j.stage++;j.at=at;c.revision++;
      if(j.stage<3)return;
      const reason=j.workerName+' received 3 funds for completing '+projectName(j).toLowerCase()+' on plot '+(j.plot+1)+'.';
      if(!root.EarthPurses.productionReceipt(w,s,j.worker,3,reason)){j.stage=2;c.stall='The reserved wage awaits a valid worker account.';return;}
      add(entries,'Construction wage escrow',j.workerName,'funds',3,j.worker,j.id,'Paid construction and delivery wage');
      const finished={id:j.plot,title:projectName(j)+' · plot '+(j.plot+1),kind:j.kind,owner:j.owner,beds:j.kind==='home'?2:0,
        x:j.point.x,y:j.point.y,opened:w.week,builder:j.workerName,contract:j.id};
      if(j.streetPlot!=null){
        finished.streetPlot=j.streetPlot;
        s.buildings.push({id:'civic-'+j.id,kind:j.kind==='shop'?'market':'workshop',plot:j.streetPlot,name:projectName(j)});
      }
      if(j.buyer&&c.incoming?.key===j.buyer){c.incoming.plot=j.plot;c.incoming.stage='preparing';}
      if(j.owner){const h=s.growth.households.find(h=>h.owner===j.owner);if(h)h.home=Math.max(1,h.home);}
      c.spent={round:s.growth.round,people:[j.worker]};
      c.plots.push(finished);delete c.project;c.stall='';
      note(w,s,reason,j.workerKey,'completed');events.push(reason);
      if(j.kind==='home')reconcile(w,s,people);
      return;
    }
    const v=view(w,s,people),civil=c.plots.filter(p=>p.contract);
    const deficit=v.missing+Number(!!c.incoming&&!v.available&&c.incoming.plot==null);
    const reserveRoom=v.available<2&&(s.population<22||v.missing);
    const frontage=Array.from({length:9},(_,n)=>n).find(n=>n!==s.buildPlanPlot&&!s.buildings.some(b=>b.plot===n)&&!s.construction?.some(j=>j.scope==='street'&&j.plot===n));
    const kind=deficit||reserveRoom?'home':civil.some(p=>p.kind==='home')&&!civil.some(p=>p.kind==='shop')&&s.population>=8?'shop':
      frontage!=null&&civil.some(p=>p.kind==='shop')&&!s.buildings.some(b=>b.kind==='workshop')&&s.materials<12?'workshop':null;
    if(!kind){c.stall='';return;}
    const reason=deficit?'Housing register shows '+deficit+' unmet place'+(deficit===1?'':'s')+'.':kind==='home'?'No room available for the next household.':kind==='shop'?'Households need a staffed local provisions store.':'The building store needs a repair workshop.';
    const worker=chooseWorker(w,s,people,s.id===w.activeId?(root.EarthAgency?.actorId(s)||'steward'):null,appointments);
    const purchaser=kind==='home'&&c.incoming?.route==='regional'&&c.incoming.plot==null?c.incoming:null;
    const owner=kind==='home'&&!purchaser?v.unhoused.find(r=>r.cash>=5):null;
    const advance=purchaser&&!purchaser.disbursed?purchaser.deposit:owner?5:0;
    const canFund=s.funds+advance-floor.funds>=3,canSupply=s.materials-floor.materials>=4;
    if(!worker||!canFund||!canSupply){
      c.stall=reason+' Waiting for '+[!worker&&'a free builder',!canFund&&'3 uncommitted wage funds',!canSupply&&'4 uncommitted materials'].filter(Boolean).join(' and ')+'.';return;
    }
    const id='centre-'+(++c.serial),plot=c.plots.length,streetPlot=kind==='home'?null:frontage??null;
    const point=streetPlot==null?pointFor(plot):{x:3+streetPlot%3*6,y:3+Math.floor(streetPlot/3)*6};
    let titleHolder=null;
    if(purchaser&&!purchaser.disbursed){
      s.funds+=purchaser.deposit;purchaser.disbursed=true;titleHolder=purchaser.key;
      add(entries,'Housing deposit escrow','Community treasury','funds',purchaser.deposit,purchaser.person,id,'Financed a serviced plot and house');
    }
    if(owner&&root.EarthPurses.productionReceipt(w,s,owner.p.id,-5,'Purchased a serviced plot and financed a dwelling.')){
      titleHolder=owner.key;s.funds+=5;add(entries,owner.p.name,'Community treasury','funds',5,owner.p.id,id,'Purchased land and financed construction');
    }
    s.funds-=3;s.materials-=4;
    const travelMs=root.EarthDistrictOrders.movement(s,{x:21.1,y:17.46},point);
    c.project={id,kind,plot,point,streetPlot,owner:titleHolder,buyer:purchaser?.key||null,worker:worker.id,workerKey:key(worker),workerName:worker.name,proposer:purchaser?.name||owner?.p.name||clerk(s),
      reason,stage:0,delivered:0,at,travelMs,commissioned:w.week};
    c.stall='';add(entries,'Community treasury','Construction wage escrow','funds',3,worker.id,id,'Reserved wages');
    add(entries,'Public building store','Building store reservation','materials',4,worker.id,id,'Earmarked materials for site delivery');
    const start=c.project.proposer+' commissioned '+worker.name+' to build '+projectName(c.project).toLowerCase()+' on plot '+(plot+1)+'. '+reason;
    note(w,s,start,key(worker),'commission');events.push(start);
  }
  function tradeAtStore(w,s,people,floor,entries,appointments){
    const c=s.centre,store=c.plots.find(d=>d.kind==='shop'&&(d.streetPlot==null||s.buildings.some(b=>b.id==='civic-'+d.contract)));
    if(!store||s.food<=floor.food||s.growth.round%3!==0)return;
    const free=people.filter(p=>root.EarthCommunityLife.present(s,p.id)&&!root.EarthDistrictOrders.commitment(w,s,p,appointments)&&
      !s.growth.households.some(h=>h.owner===key(p)&&(h.order||h.build||h.purchase))&&!s.growth.road?.ids?.includes(p.id)&&p.id!=='steward');
    const buyer=free.filter(p=>balance(s,p.id)>=3).sort((a,b)=>b.traits.initiative-a.traits.initiative)[0];
    const seller=free.filter(p=>p!==buyer).sort((a,b)=>b.aptitudes.communication-a.aptitudes.communication)[0];
    if(!buyer||!seller||balance(s,seller.id)>Number.MAX_SAFE_INTEGER-1)return;
    const id=store.contract,receipt=root.EarthDistrictOrders.record;
    if(!root.EarthPurses.productionReceipt(w,s,buyer.id,-2,'Bought provisions at '+store.title+'.'))return;
    if(!root.EarthPurses.productionReceipt(w,s,seller.id,1,'Earned a cooperative shop shift selling provisions.')){
      root.EarthPurses.productionReceipt(w,s,buyer.id,2,'Refunded the unfilled shop order.','housingRefund');return;
    }
    s.food--;s.funds++;
    const h=s.growth.households.find(h=>h.owner===key(buyer));if(h)h.pantry=(h.pantry||0)+1;
    const used=c.spent?.round===s.growth.round?c.spent.people:[];
    c.spent={round:s.growth.round,people:[...used,buyer.id,seller.id]};
    store.sales=(store.sales||0)+1;store.lastSale={week:w.week,buyer:key(buyer),clerk:key(seller),buyerName:buyer.name,clerkName:seller.name};
    receipt(entries,buyer.name,seller.name,'funds',1,seller.id,id,'Retail wage from customer payment');
    receipt(entries,buyer.name,'Community treasury','funds',1,buyer.id,id,'Cooperative store receipts');
    receipt(entries,'Public pantry',buyer.name,'food',1,buyer.id,id,'Cooperative provisions collected');
    note(w,s,seller.name+' sold provisions to '+buyer.name+'. One fund paid the clerk and one returned to the treasury.',key(seller),'sale');
  }
  function relieve(w,s,people,floor,entries){
    const c=s.centre;
    for(const p of people){
      const k=key(p),d=c.distress[k];if(!d)continue;
      d.rounds++;d.severity=Math.min(100,d.severity+4);d.last='Asked for assistance at the Town Centre.';
      const donor=people.find(a=>a.id!==p.id&&a.traits.sociability>=62&&balance(s,a.id)>=5&&!c.distress[key(a)]&&root.EarthCommunityLife.present(s,a.id));
      if(d.rounds%3===0&&donor&&root.EarthPurses.transferPerson(w,s,donor.id,p.id,1,'Gave housing relief to '+p.name+'.').ok){
        d.severity=Math.max(0,d.severity-9);d.last=donor.name+' donated one personal fund.';c.reliefShift=donor.id;
        root.EarthDistrictOrders.record(entries,donor.name,p.name,'funds',1,p.id,null,'Voluntary relief');
      }else if(d.rounds%2===0&&s.trust>=42&&s.food>floor.food){
        s.food--;d.severity=Math.max(0,d.severity-7);d.last='Council released one meal from the pantry.';
        root.EarthDistrictOrders.record(entries,'Public pantry',p.name,'food',1,p.id,null,'Housing relief meal');
      }
      if(d.severity>=48&&d.rounds%4===0){
        // A willing private owner can open a real empty place by name.
        const places=view(w,s,people).plots,offered=places.find(a=>a.free>a.reserved&&a.owner&&people.some(owner=>key(owner)===a.owner&&
          root.EarthCommunityLife.present(s,owner.id)&&owner.traits.sociability>=56&&!c.distress[a.owner]));
        const deed=offered&&c.plots.find(a=>a.id===offered.id);
        if(deed){(deed.consent||=[]).push(k);c.rights[k]=deed.id;delete c.distress[k];
          note(w,s,'The owner of '+deed.title+' offered '+p.name+' a room. Ordinary work can resume.',k,'shelter');continue;}
        d.last=p.traits.initiative>p.traits.patience?'A confrontation over relief interrupted work.':'The admission host requested a welfare visit.';
      }
      if(d.severity>=92&&p.id!=='steward'&&root.EarthCommunityLife.present(s,p.id)&&s.population>2&&root.EarthCommunityLife.fieldCandidates(s,w).includes(p.id)){
        const cause=d.rounds>=30&&p.traits.sociability<28&&p.traits.adaptability<30?'suicide during a prolonged housing crisis':'prolonged deprivation';
        if(root.EarthCommunityLife.retire(w,s,p.id,cause)){delete c.distress[k];note(w,s,p.name+' died following '+cause+'.',k,'death');}
      }
    }
  }
  function beginRound(w,s,people,floor,at,close,transfers,events,appointments){
    establish(w,s);if(!s.centre)return;
    const all=roster(w,s);
    reconcile(w,s,all);delete s.centre.reliefShift;
    relieve(w,s,all,floor,transfers);
    contract(w,s,all,floor,at,close,transfers,events,appointments);
    tradeAtStore(w,s,all,floor,transfers,appointments);
  }
  function assist(w,s,request){
    const p=roster(w,s).find(a=>key(a)===request.person),d=p&&s.centre.distress[key(p)];
    if(!d)return {ok:false,message:'This resident already has housing or moved away.'};
    if(s.food<1||d.aidRound===(s.growth?.round||0))return {ok:false,message:'No further meal is available for this resident this round.'};
    s.food--;d.aidRound=s.growth?.round||0;d.severity=Math.max(0,d.severity-12);
    d.last='The assembly provided a meal and arranged a housing review.';
    note(w,s,p.name+' received food from the public pantry. Their housing application stays open.',key(p),'relief');
    return {ok:true,message:d.last};
  }
  function valid(s){
    const c=s.centre;if(c==null)return true;
    const obj=v=>v&&typeof v==='object'&&!Array.isArray(v),str=v=>typeof v==='string'&&v.length>0&&v.length<=1200;
    if(!obj(c)||c.version!==1||!natural(c.revision)||!Array.isArray(c.plots)||!obj(c.rights)||!obj(c.distress)||
      !natural(c.serial)||!natural(c.lastDecision)||!Array.isArray(c.applications)||!Array.isArray(c.history)||c.history.length>28||
      !['closed','hospitality','introduction'].includes(c.charter)||!c.history.every(e=>obj(e)&&natural(e.week)&&natural(e.round)&&str(e.text)))return false;
    if(c.spent&&(!obj(c.spent)||!natural(c.spent.round)||!Array.isArray(c.spent.people)||!c.spent.people.every(str)))return false;
    if(!c.plots.every((d,i)=>obj(d)&&d.id===i&&['home','shop','workshop'].includes(d.kind)&&natural(d.beds)&&
      Number.isFinite(d.x)&&Number.isFinite(d.y)&&str(d.title)&&(d.owner===null||str(d.owner))&&
      (d.kind==='home'?d.beds>0:d.beds===0)&&(d.legacy==null||natural(d.legacy)&&d.legacy<=d.beds)&&
      (d.consent==null||Array.isArray(d.consent)&&d.consent.every(str))&&(d.streetPlot==null||natural(d.streetPlot)&&d.streetPlot<9)))return false;
    if(!Object.values(c.rights).every(id=>natural(id)&&id<c.plots.length&&c.plots[id].kind==='home'||typeof id==='string'&&/^(court|precinct)-[0-5]$/.test(id)))return false;
    if(!Object.values(c.distress).every(d=>obj(d)&&natural(d.since)&&natural(d.rounds)&&natural(d.severity)&&d.severity<=100))return false;
    const j=c.project;if(j&&(!obj(j)||!str(j.id)||!['home','shop','workshop'].includes(j.kind)||j.plot!==c.plots.length||!j.point||
      !Number.isFinite(j.point.x)||!Number.isFinite(j.point.y)||!natural(j.stage)||j.stage>2||!natural(j.at)||!natural(j.travelMs)||!str(j.workerName)||!str(j.workerKey)||!str(j.proposer)||!str(j.reason)||j.worker!=null&&!str(j.worker)||
      j.streetPlot!=null&&(!natural(j.streetPlot)||j.streetPlot>8||s.buildings.some(b=>b.plot===j.streetPlot))||
      j.delivered!==(j.stage===0?0:4)))return false;
    return true;
  }
  root.EarthTownCentre={centrePoint,establish,roster,view,reconcile,capacity,allPlaces,availableRooms,baseCapacity,assist,homePoint,projectWork,restriction,beginRound,note,held,valid,towns,balance};
})(typeof window==='undefined'?globalThis:window);
