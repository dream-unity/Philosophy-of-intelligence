/* Preserving moves two real food into a named crate. A receipt describes part
   of the fresh pantry; it never carries food or pays a household by itself. */
(function(root){
  'use strict';
  const limit=6,portion=2;
  const int=(n,min,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
  const record=x=>x!=null&&typeof x==='object'&&!Array.isArray(x);
  function actors(site,id){
    if(typeof id!=='string'||!id||id.length>512)return false;
    if(id==='steward'||id==='driver'||/^walker-[0-4]$/.test(id)||site.residents?.some(p=>p.id===id))return true;
    if(!/^carrier-[0-8]-[0-8]$/.test(id))return false;
    const [,from,to]=id.split('-').map(Number);
    return Math.abs(from%3-to%3)+Math.abs(Math.floor(from/3)-Math.floor(to/3))===1;
  }
  function name(site,id){
    if(!id)return 'District garden';
    return root.EarthPersonas?.profile(site,id)?.name||root.EarthAgency?.identity?.(site,id)?.name||
      site.residents?.find(p=>p.id===id)?.name||(id.startsWith('carrier-')?'Supply porter':id==='steward'?'Community steward':'Local resident');
  }
  const actor=site=>root.EarthAgency?.actorId(site)||site.agency?.actor||'steward';
  const capacity=site=>Math.min(limit,1+(site.buildings||[]).reduce((n,b)=>n+({garden:1,market:1,fishingDock:2}[b.kind]||0),0));
  const fresh=()=>({serial:0,crates:[]});
  const book=site=>site.provisions||=fresh();
  const fail=message=>({ok:false,message});
  function traced(site,week,stock=site.food){
    const r=site.provisions?.receipt;if(!r||r.week!==week)return null;
    return Math.max(0,r.units-Math.max(0,r.stock-stock));
  }
  function receipt(site,week){
    const units=traced(site,week),r=site.provisions?.receipt;
    return units?{source:r.source,sourceBy:r.by,sourceUnits:Math.min(portion,units)}:null;
  }
  function reconcile(site,week){
    const d=site.provisions,r=d?.receipt;if(!r)return;
    const kept=traced(site,week);
    if(!kept){delete d.receipt;d.serial++;return;}
    if(kept!==r.units){r.units=kept;d.serial++;}
    r.stock=site.food;
  }
  function landing(world,site,by,amount){
    if(!site||!int(amount,1)||!actors(site,by))return;
    const d=book(site),last=d.landings;
    d.landings={week:world.week,by,amount,thisWeek:Math.min(Number.MAX_SAFE_INTEGER,(last?.week===world.week?last.thisWeek:0)+amount),
      total:Math.min(Number.MAX_SAFE_INTEGER,(last?.total||0)+amount)};
    d.serial++;
  }
  function credit(world,site,source,n,by,landedBeforeMeals=false){
    if(!site||!int(n,1)||!['catch','harvest'].includes(source)||!int(site.food,1)||(source==='catch'||by!=null)&&!actors(site,by))return;
    const d=book(site);
    const old=d.receipt?.source===source&&d.receipt?.by===(by||null)?traced(site,world.week,Math.max(0,site.food-n))||0:0;
    d.receipt={source,by:by||null,units:Math.min(portion*limit,n+old,site.food),stock:site.food,week:world.week};
    if(source==='catch'&&!landedBeforeMeals)landing(world,site,by,n);else d.serial++;
  }
  function provenance(site,crate){
    if(crate.source==='pantry')return 'Shared pantry food';
    const where=crate.source==='catch'?'Fish landed by '+name(site,crate.sourceBy):
      crate.sourceBy?'Produce collected by '+name(site,crate.sourceBy):'Harvest from the district garden';
    return where+(crate.sourceUnits<portion?' with shared pantry food':'');
  }
  function packingBlock(site,d){
    if(d.crates.length>=capacity(site))return 'The shelf is full. Open an existing crate, or add a garden, market or fishing dock.';
    if(site.food<portion)return 'Packing needs two fresh food. Glean produce for the exchange or use a handline at the quay.';
    if(site.materials<1)return 'Recover one material for the packing crate.';
    return '';
  }
  function view(world,site){
    if(!world||!site)return null;
    const d=site.provisions||fresh(),where=receipt(site,world.week)||{source:'pantry',sourceBy:null,sourceUnits:0};
    const crates=d.crates.map(c=>({id:c.id,name:'Provision crate '+c.id,remaining:c.remaining,origin:provenance(site,c),
      packedBy:name(site,c.by),week:c.week,reserved:c.reserved}));
    const blocked=packingBlock(site,d),options=[{action:'pack',label:'Pack two food',detail:provenance(site,where)+'. Uses two fresh food and one material.',available:!blocked,reason:blocked}];
    for(const c of crates){
      const opening=site.food>Number.MAX_SAFE_INTEGER-c.remaining?'The fresh pantry has no room for these provisions.':'';
      options.push({action:'open',crateId:c.id,label:'Open '+c.name.toLowerCase(),detail:'Return '+c.remaining+' food to the shared pantry.',available:!opening,reason:opening},
        {action:c.reserved?'hold':'reserve',crateId:c.id,label:c.reserved?'Keep '+c.name.toLowerCase()+' for manual use':'Reserve '+c.name.toLowerCase()+' for meals',
          detail:c.reserved?'Remove the automatic household allocation.':'Households draw only what is missing after production, arrivals and other relief.',available:true,reason:''});
    }
    return {siteId:site.id,generation:site.foundingRevision||0,actorId:actor(site),week:world.week,serial:d.serial,
      freshFood:site.food,materials:site.materials,capacity:capacity(site),used:crates.length,
      reservedFood:crates.reduce((n,c)=>n+(c.reserved?c.remaining:0),0),crates,options,
      lastLanding:d.landings?{...d.landings,name:name(site,d.landings.by)}:null,
      lastRelief:d.lastRelief?{...d.lastRelief,contributors:d.lastRelief.contributors.map(id=>name(site,id))}:null};
  }
  function onSite(site,id,p){
    if(!p||p.siteId!==site.id||p.actor!==id||p.mode!=='walk'||p.placement||p.boarding||p.returning||!Number.isFinite(p.x)||!Number.isFinite(p.y))return false;
    if(p.target==='quay')return Boolean(root.CommonEarthSim?.waterfront?.(site))&&p.x>=-.7&&p.x<=24.7&&p.y>=23.1&&p.y<=25.25;
    if(p.target!=='market'||![p.tx,p.ty].every(Number.isFinite))return false;
    const block=root.EarthShifts?.district?.market||[2,3],x=6*block[0]+3,y=6*block[1]+5.04;
    return Math.hypot(p.tx-x,p.ty-y)<.35 && Math.hypot(p.x-x,p.y-y)<=1.56;
  }
  function pack(world,site,by,reserved,carryFromClosingWeek=false){
    const d=book(site);
    // Crew allocations run at the transition, before the new harvest. The
    // measured remainder of yesterday's catch can still supply this crate.
    const source=receipt(site,world.week)||(carryFromClosingWeek&&receipt(site,world.week-1))||{source:'pantry',sourceBy:null,sourceUnits:0};
    const crate={id:++d.serial,by,week:world.week,remaining:portion,reserved,...source};
    site.food-=portion;site.materials--;reconcile(site,world.week);d.crates.push(crate);
    return crate;
  }
  function run(world,site,request,scene){
    if(!site||!request||request.siteId!==site.id||request.actorId!==actor(site)||request.generation!==(site.foundingRevision||0)||request.week!==world.week||
      request.serial!==(site.provisions?.serial||0))return fail('The town, worker or preserving shelf changed. Review the current crates.');
    const restricted=root.EarthCommunityLife?.permission?.(world,site,'provision',[request]);
    if(restricted)return fail(restricted);
    if(!onSite(site,request.actorId,scene))return fail('Stand on foot at your district exchange or on its waterfront quay.');
    const d=site.provisions||fresh();
    if(request.action==='pack'){
      const blocked=packingBlock(site,d);if(blocked)return fail(blocked);
      const c=pack(world,site,request.actorId,false);
      return {ok:true,message:name(site,c.by)+' packed two food in provision crate '+c.id+'. '+provenance(site,c)+'. One material was used.'};
    }
    const c=d.crates.find(c=>c.id===request.crateId);
    if(!c)return fail('Choose a crate that is still on the shelf.');
    if(request.action==='open'){
      if(site.food>Number.MAX_SAFE_INTEGER-c.remaining)return fail('The fresh pantry has no room for these provisions.');
      site.food+=c.remaining;d.crates.splice(d.crates.indexOf(c),1);d.serial++;
      return {ok:true,message:name(site,request.actorId)+' opened provision crate '+c.id+' and returned '+c.remaining+' food to the pantry.'};
    }
    if(!['reserve','hold'].includes(request.action)||c.reserved===(request.action==='reserve'))return fail('This allocation has changed. Review the crate.');
    c.reserved=request.action==='reserve';d.serial++;
    return {ok:true,message:'Provision crate '+c.id+(c.reserved?' is reserved for a household shortfall.':' will stay sealed until someone opens it.')};
  }
  function relieve(world,site,missing){
    const d=site?.provisions;
    if(!d||!int(missing,1)||d.lastRelief?.week===world.week)return '';
    let left=missing;const contributors=[];
    for(const c of d.crates){
      if(!left)break;if(!c.reserved)continue;
      const n=Math.min(c.remaining,left,Number.MAX_SAFE_INTEGER-site.food);if(!n)continue;
      c.remaining-=n;left-=n;site.food+=n;if(!contributors.includes(c.by))contributors.push(c.by);
    }
    const amount=missing-left;if(!amount)return '';
    d.crates=d.crates.filter(c=>c.remaining>0);d.lastRelief={week:world.week,amount,shortfall:missing,contributors};d.serial++;
    return 'Reserved provisions packed by '+contributors.map(id=>name(site,id)).join(' and ')+' supplied '+amount+' food for this week’s households.'+
      (left?' '+left+' food was still missing.':' The meal shortfall was covered.');
  }
  function volunteer(world,site,p){
    const d=site.provisions||fresh(),need=Math.ceil(site.population/5);
    if(root.EarthCommunityLife?.residency?.(site,p.id)&&root.EarthCommunityLife.residency(site,p.id)!=='member')return false;
    if(!p.free||p.row.energy<4||capacity(site)<2||d.autoWeek===world.week||packingBlock(site,d))return false;
    const promised=site.residents?.find(r=>r.slot===0)?.promise,foodFloor=Math.max(7,need*3)+(promised?Math.max(0,3-(promised.advance?.food||0)):0);
    const repair=site.residents?.find(r=>r.slot===1)?.promise;
    if(site.food-portion<foodFloor||site.materials-1<2+(repair?Math.max(0,2-(repair.advance?.materials||0)):0))return false;
    if(d.crates.reduce((sum,c)=>sum+(c.reserved?c.remaining:0),0)>=need)return false;
    const life=site.careers?.[p.id],role=root.EarthCareers?.role?.(site,p.id)||p.profile.originRole||p.profile.role;
    return /^(?:baker|cook|grower|seed keeper|gardener)$/i.test(role)||['cook','baker','grower','gardener'].some(key=>life?.qualifications?.[key]);
  }
  function putByCrew(world,site,p){
    if(!volunteer(world,site,p))return null;
    const c=pack(world,site,p.id,true,true);site.provisions.autoWeek=world.week;
    return {week:world.week,kind:'preserve',reason:'I packed two surplus food into reserved crate '+c.id+' for a week when households have too little.',venue:'market',target:null};
  }
  function valid(site,week){
    const d=site.provisions;if(d==null)return true;
    if(!record(d)||!int(d.serial,0)||!Array.isArray(d.crates)||d.crates.length>limit||
      d.autoWeek!=null&&!int(d.autoWeek,1,week))return false;
    const known=new Set();
    for(const c of d.crates){
      if(!record(c)||!int(c.id,1,d.serial)||known.has(c.id)||!actors(site,c.by)||!int(c.week,1,week)||!int(c.remaining,1,portion)||
        typeof c.reserved!=='boolean'||!['catch','harvest','pantry'].includes(c.source)||!int(c.sourceUnits,c.source==='pantry'?0:1,c.source==='pantry'?0:portion)||
        (c.source==='catch'&&!actors(site,c.sourceBy))||(c.source==='pantry'&&c.sourceBy!=null)||(c.sourceBy!=null&&!actors(site,c.sourceBy)))return false;
      known.add(c.id);
    }
    const r=d.receipt;
    if(r!=null&&(!record(r)||!['catch','harvest'].includes(r.source)||!int(r.units,1,portion*limit)||!int(r.stock,r.units)||
      !int(r.week,1,week)||r.source==='catch'&&!actors(site,r.by)||r.by!=null&&!actors(site,r.by)))return false;
    const f=d.landings;
    if(f!=null&&(!record(f)||!int(f.week,1,week)||!actors(site,f.by)||!int(f.amount,1)||!int(f.thisWeek,f.amount)||!int(f.total,f.thisWeek)))return false;
    const l=d.lastRelief;
    return l==null||record(l)&&int(l.week,1,week)&&int(l.amount,1,2*limit)&&int(l.shortfall,l.amount)&&Array.isArray(l.contributors)&&
      l.contributors.length>=1&&l.contributors.length<=Math.min(l.amount,limit)&&new Set(l.contributors).size===l.contributors.length&&l.contributors.every(id=>actors(site,id));
  }
  root.EarthProvisions=Object.freeze({view,run,credit,landing,traced,reconcile,relieve,volunteer,putByCrew,valid});
})(typeof window==='undefined'?globalThis:window);
