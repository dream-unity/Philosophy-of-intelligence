/* The register belongs to the world. A wider-Earth person has an immutable
   birth address even before a town finds them through the recruiting service. */
(function(root){
  'use strict';
  const all=w=>[...w.sites,...w.communityLife.outposts];
  const find=(w,id)=>all(w).find(s=>s.id===id);
  const skills=['craft','care','organisation','communication','stamina','numeracy','music'];
  const traits=['initiative','patience','sociability','curiosity','adaptability'];
  const fields={aggression:'Aggression',workEthic:'Work ethic',reliability:'Reliability',reputation:'References',learning:'Learning rate',potential:'Development potential',
    ...Object.fromEntries([...traits,...skills].map(k=>[k,k[0].toUpperCase()+k.slice(1)]))};
  const first=['Issa','Sana','Jules','Mila','Pema','Ravi','Ana','Kit','Samira','Leo','Rowan','Ines','Ari','Vera','Yuki','Noel','Kei','Asha','Mai','Mina'];
  const last=['Merin','Park','Silva','Ward','Nouri','Bell','Sato','Moreau','Das','Sen','Alves','Rahman','Mensah','Roy','Kim','Linden','Cruz','Cole','Reyes','Lake'];
  const places=['Estuary Cooperative','Northbank Works','Eastern Orchard','Lake District','South Crossing','Far Harbour'];
  const roles={craft:'Joiner',care:'Garden steward',organisation:'Freight clerk',communication:'Interpreter',stamina:'Harbour worker',numeracy:'Survey assistant',music:'Instrument maker'};
  const fail=message=>({ok:false,message});
  const limit=n=>Math.min(100,Math.max(0,Math.round(n)));
  function hash(value){
    let h=2166136261;
    for(let i=0;i<value.length;i++)h=Math.imul(h^value.charCodeAt(i),16777619);
    return h>>>0;
  }
  const balance=(s,id)=>s.purses?.people?.[id]?.balance||0;
  const floor=(w,s)=>root.EarthCivicInitiatives?.reserve(w,s)||{funds:6,food:Math.ceil(s.population/5)*2,materials:3};
  function intervals(raw){
    if(raw==null)return {};
    if(typeof raw!=='object'||Array.isArray(raw))return null;
    const result={};
    for(const [k,v] of Object.entries(raw)){
      if(!Object.hasOwn(fields,k)||!Array.isArray(v)||v.length!==2||!v.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=100)||v[1]<v[0])return null;
      if(v[0]||v[1]!==100)result[k]=[...v];
    }
    return result;
  }
  function price(criteria){
    const terms=intervals(criteria);if(!terms)return null;
    const rows=Object.values(terms);
    let cost=3;
    for(const [lo,hi] of rows){
      const width=hi-lo+1,tail=Math.abs((lo+hi)/2-50)/50;
      cost+=2+Math.ceil(Math.log2(101/width)*(1.5+tail*2)+tail*2);
    }
    return cost+Math.ceil(rows.length*(rows.length-1)/3);
  }
  function address(seed,n,terms={}){
    const spec={};
    for(const k of Object.keys(fields)){
      const h=hash(seed+'|'+n+'|'+k),[lo,hi]=terms[k]||[0,100];
      spec[k]=lo+h%(hi-lo+1);
    }
    // Search identifies a member of a pre-existing demographic cohort. The
    // immutable coordinate contains the complete attribute vector and seed.
    return {number:n,seed,values:spec};
  }
  function dossier(entry){
    const {number:n,seed,values:v}=entry;
    const salt=hash(seed+'/'+n+'/'+Object.values(v).join('.')),pick=(a,k)=>a[hash(salt+'/'+k)%a.length];
    const name=pick(first,'first')+' '+pick(last,'last'),home=pick(places,'birth');
    const origin='earth-'+salt.toString(36)+'-'+n.toString(36),id='walker-0';
    const strengths=[...skills].sort((a,b)=>v[b]-v[a]),lead=strengths[0],role=roles[lead];
    const potential=v.potential,aptitudes={},bounds={};
    for(const k of skills){aptitudes[k]=v[k];bounds[k]={min:v[k],max:Math.round(v[k]+(100-v[k])*potential/100)};}
    const years=1+salt%18,record=v.reliability<16&&salt%3===0?'An adjudicated property offence at '+home+'.':'No conviction appears in the supplied local record.';
    const history=years+' years in '+home+' as a '+role.toLowerCase()+'. '+record;
    const personality=Object.fromEntries(traits.map(k=>[k,v[k]]));
    const personal={aggression:v.aggression,workEthic:v.workEthic,reliability:v.reliability,reputation:v.reputation,learning:v.learning,potential,history,record,years};
    const hobbyAxis=strengths[1];
    const profile={id,name,kind:'household',identityKey:root.EarthPersonas.identityKey(origin,id),birthCommunityId:origin,birthCommunityName:home,
      originRole:role,role,home,description:name+' worked in '+home+' for '+years+' years. '+(v.sociability>=55?'They seek introductions in a new town.':'They prefer a small circle of contacts.'),
      interests:[role,hobbyAxis],hobbyAxis,strengths:strengths.slice(0,2),traits:personality,aptitudes,bounds,outsideWork:'I like spending time on '+hobbyAxis+'.',background:personal};
    return {profile,origin,savings:1+hash(salt+'/cash')%12};
  }
  function initialise(w){
    if(!w.communityLife||w.townCentres)return;
    const home=w.sites[0],seed=[home.lat,home.lon,home.name].join('/');
    w.townCentres={version:1,seed,next:6,pool:Array.from({length:6},(_,i)=>address(seed,i)),applications:[],serial:0};
  }
  function ledger(s,p){
    const h=s.growth?.households.find(f=>f.owner===p.identityKey),career=s.careers?.[p.id],b=p.background;
    const completed=h?.points||0,missed=s.residents.find(x=>x.id===p.id)?.lastMissed?1:0;
    const reliability=b?limit(b.reliability+Math.min(12,Math.floor(completed/6))-missed*12):completed||missed?limit(55+Math.min(35,completed)-missed*16):null;
    const history=[b?.history,...(career?.history||[]).slice(0,2).map(e=>e.text),h?.last].filter(Boolean);
    const local=s.fleet?.records?.filter(e=>e.actor===p.id)||[];
    const ability={...p.aptitudes,...career?.skills};
    const axes=skills.slice().sort((a,b)=>ability[b]-ability[a]);
    return {reliability,history,record:b?.record||(local.length?'Local dispatch holds '+local.length+' recorded event(s).':'No criminal record supplied.'),
      ability,leading:axes.slice(0,2).map(k=>k+' '+ability[k]).join(', '),learning:b?.learning??p.traits.curiosity,potential:b?.potential??Math.max(...skills.map(k=>p.bounds[k].max)),
      reputation:b?.reputation??(completed?limit(50+completed/2):null),completed};
  }
  function apply(w){
    const b=w.townCentres,sites=all(w),life=root.EarthCommunityLife;
    const climates=new Map(sites.map(s=>[s.id,root.EarthBorders?.character(s)]));
    const openings=new Map(sites.filter(s=>s.housing).map(s=>[s.id,root.EarthHousing.accessible(s)]));
    b.applications=b.applications.filter(a=>a.until>=w.week&&find(w,a.from)?.housing?.members[a.key]&&find(w,a.to));
    for(const s of sites){
      if(s.population<=4||!s.housing)continue;
      const existing=new Set(b.applications.map(a=>a.key));
      let best=null;
      for(const id of life.fieldCandidates(s,w)){
        if(life.commuting(s,id))continue;
        const p=root.EarthPersonas.profile(s,id);if(!p||existing.has(p.identityKey))continue;
        const score=p.traits.curiosity+p.traits.adaptability-60+Number(!!s.housing.distress[p.identityKey])*70;
        if(score<43)continue;
        for(const d of sites){
          if(d===s||!d.housing||d.communityLife.cluster!==s.communityLife.cluster)continue;
          const need={food:'care',materials:'craft',funds:'organisation'}[d.specialty]||'craft';
          const reception=root.EarthBorders?.assessment(w,d,p,s,climates.get(d.id));
          const fit=score+p.aptitudes[need]/2+d.wellbeing/4+(openings.get(d.id)>0?15:0)-(reception?.closed?60:0);
          if(fit>=75&&(!best||fit>best.fit))best={fit,id,key:p.identityKey,name:p.name,from:s.id,to:d.id,need};
        }
      }
      if(best){
        const a={...best,number:++b.serial,week:w.week,until:w.week+4};b.applications.push(a);
        root.EarthHousing.log(w,s,a.name+' applied to '+find(w,a.to).name+' to use '+a.need+' skills there.');
      }
    }
  }
  function housingOffer(w,s,from,id){
    const money=balance(from,id);
    if(root.EarthHousing.accessible(s)>0)return {price:2,kind:'licence',ready:money>=2,reason:money>=2?'A completed place can be licensed.':'Two personal funds are needed for the housing licence.'};
    const reserve=floor(w,s),protectedGoods=root.EarthNeighbourErrands?.heldGoods(s,w.week)||{};
    const crew=root.EarthDistrictGrowth.members(s).find(p=>p.id!=='steward'&&p.aptitudes.craft>=34&&!root.EarthDistrictGrowth.work(s,p)&&
      !root.EarthDistrictOrders.commitment(w,s,p));
    const reason=money<7?'The applicant needs seven personal funds for the plot and construction.':s.housing.project?'The current building contract still holds the crew.':
      s.materials<reserve.materials+(protectedGoods.materials||0)+4?'Four uncommitted building materials are needed.':!crew?'No free qualified builder is available.':'A private plot and building contract are available.';
    return {price:7,kind:'build',ready:money>=7&&!s.housing.project&&s.materials>=reserve.materials+(protectedGoods.materials||0)+4&&!!crew,worker:crew?.id,reason};
  }
  function applications(w,s){
    return (w.townCentres?.applications||[]).filter(a=>a.to===s.id).map(a=>{
      const from=find(w,a.from),p=from&&root.EarthPersonas.profile(from,a.id);if(!p||from.housing?.members[a.key]?.id!==a.id)return null;
      const terms=housingOffer(w,s,from,a.id),busy=!root.EarthCommunityLife.present(from,a.id)||!root.EarthCommunityLife.canLeave(from,a.id,w)||root.EarthDistrictGrowth.work(from,p);
      return {...a,profile:p,fromName:from.name,savings:balance(from,a.id),ledger:ledger(from,p),terms,available:!busy&&terms.ready,reason:busy?'A home-town commitment needs a handover.':terms.reason};
    }).filter(Boolean);
  }
  function licence(w,s,from,id,moved,offer){
    const person=root.EarthPersonas.profile(s,moved.id);
    root.EarthPurses.productionReceipt(w,s,moved.id,-offer.price,person.name+' paid for '+(offer.kind==='build'?'a plot, building materials and contract.':'a residential licence.'));
    s.funds+=offer.price;
    if(offer.kind==='build'){
      const plot=s.housing.serial++,worker=root.EarthPersonas.profile(s,offer.worker);
      s.funds-=3;s.materials-=4;
      s.housing.project={id:'civic-'+plot,kind:'house',plot,phase:'delivery',at:w.lastProductionAt||0,worker:worker.id,name:worker.name,wage:3,materials:4,
        reason:person.name+' purchased the lot and financed a two-place home.',week:w.week,reservedFor:person.identityKey,ownerName:person.name};
    }
    root.EarthHousing.sync(w,s);return person;
  }
  function accept(w,s,number){
    const a=applications(w,s).find(a=>a.number===number);
    if(!a?.available)return fail(a?.reason||'That application has closed.');
    const from=find(w,a.from),r=root.EarthCommunityLife.movePerson(w,from,s,a.id);
    if(!r)return fail('Admission needs a free place on the street roster.');
    const p=licence(w,s,from,a.id,r,a.terms),message=p.name+' moved from '+from.name+' to '+s.name+' and paid '+a.terms.price+' personal funds for housing. '+from.name+' opened a workplace vacancy.';
    w.townCentres.applications=w.townCentres.applications.filter(row=>row.key!==a.key);
    root.EarthHousing.log(w,s,message);root.EarthHousing.log(w,from,message);
    welcome(w,s,p,from);return {ok:true,message,personId:p.id};
  }
  function welcome(w,s,p,from){
    const host=root.EarthCommunityLife.hostFor(s),worker=s.growth?.households.find(h=>h.owner===p.identityKey);
    if(host.id&&host.id!==p.id){
      const g=s.communityLife.people[p.id];if(g){g.sponsor=host.id;g.sponsorName=host.name;}
      root.EarthAutonomy?.remember(s,w.week,host.id,p.id,'visit');
      root.EarthBorders?.remember(w,s,p,from,4,host.name+' signed the admission and introduced '+p.name+'.',true);
    }
    if(worker)worker.last='Settling into '+s.name+' and reviewing local work.';
    s.housing.lastArrival={name:p.name,key:p.identityKey,id:p.id,week:w.week,origin:from?.name||p.birthCommunityName};
  }
  function invite(w,s,mode,raw,quoted){
    const b=w.townCentres,terms=intervals(raw),cost=mode==='targeted'?price(raw):0;
    if(!terms||cost!==quoted)return fail('Review the current recruitment price.');
    if(s.funds<cost)return fail('The treasury cannot cover the quoted search.');
    const n=b.next,record=mode==='targeted'?address(b.seed,n,terms):b.pool[0],found=dossier(record),p=found.profile;
    const id=root.EarthCommunityLife.guestSlot(s,p,found.origin,p.id,'member',w.week);
    if(!id)return fail('The local street roster is full. The invitation was not issued.');
    if(mode==='blind'){b.pool.shift();b.pool.push(address(b.seed,n));}
    b.next++;s.funds-=cost;s.population++;
    root.EarthPurses.productionReceipt(w,s,id,found.savings,p.name+' brought '+found.savings+' personal funds saved at '+p.home+'.');
    (b.receipts||=[]).push({town:s.id,number:n,week:w.week,name:p.name,capital:found.savings,fee:cost});
    if(b.receipts.length>48)b.receipts.shift();
    root.EarthHousing.sync(w,s);const person=root.EarthPersonas.profile(s,id);
    welcome(w,s,person,null);
    const house=s.housing.licences[p.identityKey],place=house?root.EarthHousing.label(root.EarthHousing.dwellings(s).find(t=>t.id===house)):'no habitable place';
    const message=s.name+' admitted '+p.name+' from '+p.home+' through '+(mode==='blind'?'a free blind invitation':'a '+cost+'-fund search')+'. '+p.name+' brought '+found.savings+' personal funds and has '+place+'.';
    root.EarthHousing.log(w,s,message);return {ok:true,message,personId:id};
  }
  function command(w,s,q){
    if(!w.townCentres||!s?.housing||!q||q.site!==s.id||q.week!==w.week||q.serial!==w.townCentres.next||q.round!==(s.growth?.round||0))return fail('The Town Centre has a newer register. Review the current offer.');
    if(!root.EarthCommunityLife.isHome(w,s)||root.EarthAgency.actorId(s)!=='steward')return fail('Only the original resident can authorise recruitment in their home community.');
    if(q.action==='introduction'){
      const to=find(w,q.to);
      if(!to||to===s||to.communityLife.cluster!==s.communityLife.cluster)return fail('Choose another community in this region.');
      return root.EarthBorders.request(w,to,w.communityLife.profile,s);
    }
    if(q.deficit!=null&&q.deficit!==root.EarthHousing.summary(s).unhoused+Number(!root.EarthHousing.accessible(s)))return fail('Housing availability changed. Review the current offer.');
    if(q.action==='accept')return accept(w,s,q.application);
    if(q.action==='blind'||q.action==='targeted')return invite(w,s,q.action,q.criteria,q.price);
    return fail('Choose a recruitment route.');
  }
  function decisions(w){
    if(!w.townCentres)return;
    for(const s of all(w)){
      if(!s.housing||s.id===w.communityLife.homeId)continue;
      const h=s.housing,round=s.growth?.round||0;
      if(round<3||round-(h.admittedRound??-8)<8||s.population>=Math.min(24,13+s.tech.length*3)||root.EarthHousing.accessible(s)<1||s.food<floor(w,s).food+3)continue;
      const a=applications(w,s).filter(a=>a.available&&a.profile.aptitudes[a.need]>=40).sort((a,b)=>b.fit-a.fit)[0];
      let r;
      if(a)r=accept(w,s,a.number);
      else{
        const axis={materials:'craft',food:'care',funds:'organisation'}[s.specialty],strict=root.EarthBorders?.custom(s)==='closed';
        const criteria=strict?{[axis]:[60,100],reliability:[60,100]}:{[axis]:[55,100]};
        const cost=price(criteria),search=s.funds>=floor(w,s).funds+cost+6&&(strict||s.specialty==='funds'||s.tech.length>=2);
        if(strict&&!search)continue;
        r=invite(w,s,search?'targeted':'blind',search?criteria:{},search?cost:0);
      }
      if(r.ok)h.admittedRound=round;
    }
  }
  function calendar(w){if(w.townCentres){apply(w);decisions(w);}}
  function valid(w){
    const b=w.townCentres;if(b===undefined)return true;
    const nat=n=>Number.isSafeInteger(n)&&n>=0,word=t=>typeof t==='string'&&t.length>0&&t.length<=1200;
    return b&&b.version===1&&word(b.seed)&&nat(b.next)&&nat(b.serial)&&Array.isArray(b.pool)&&b.pool.length===6&&
      b.pool.every(e=>e&&nat(e.number)&&e.number<b.next&&e.seed===b.seed&&e.values&&Object.keys(fields).every(k=>nat(e.values[k])&&e.values[k]<=100))&&
      (!b.receipts||Array.isArray(b.receipts)&&b.receipts.length<=48&&b.receipts.every(e=>e&&word(e.town)&&nat(e.number)&&nat(e.week)&&word(e.name)&&nat(e.capital)&&e.capital<=12&&nat(e.fee)))&&
      Array.isArray(b.applications)&&b.applications.every(a=>a&&nat(a.number)&&a.number<=b.serial&&word(a.key)&&word(a.from)&&word(a.to)&&word(a.id)&&word(a.name)&&nat(a.week)&&nat(a.until)&&skills.includes(a.need));
  }
  root.EarthTownCentre={fields,skills,price,ledger,initialise,command,calendar,decisions,valid,applications,housingOffer,licence};
})(globalThis);
