/* Recruitment uses the same street identities, purses and school records as
   existing residents. A matching service searches birth cohorts indexed by
   trait and skill ranges. Its address fixes an individual's prior history,
   including when the same calendar turn runs in a detached forecast. */
(function(root){
  'use strict';
  const axes=['numeracy','music','communication','care','craft','stamina','organisation'];
  const temperament=['curiosity','sociability','patience','initiative','adaptability','aggression'];
  const references=['workEthic','reliability','reputation','learningRate','aggression'];
  const fields=[...temperament.filter(t=>!references.includes(t)),...references,...axes,...axes.map(a=>a+'Potential')];
  const label=key=>({workEthic:'Work ethic',learningRate:'Learning rate'}[key]||
    (key.endsWith('Potential')?key.slice(0,-9)+' potential':key).replace(/^./,c=>c.toUpperCase()));
  const origins=[
    ['Harbour Cooperative','Kenya'],['Valley Workshop','Chile'],['Estuary Exchange','Australia'],
    ['Island Producers’ Guild','Fiji'],['Canal Cooperative','Netherlands'],['Northern Repair Yard','Iceland']
  ];
  const sourceSlots=['walker-0','walker-1','walker-2','walker-3','walker-4','driver'];
  const int=(n,lo,hi=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=lo&&n<=hi;
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const fail=message=>({ok:false,message});
  function hash(value){
    let n=2166136261;
    for(let i=0;i<value.length;i++)n=Math.imul(n^value.charCodeAt(i),16777619);
    return n>>>0;
  }
  const ledger=site=>site.communityLife?.townCentre;
  const revision=site=>ledger(site)?.serial||0;
  function specification(input){
    if(!object(input)||Object.keys(input).some(k=>!fields.includes(k)))return null;
    const selected={};
    for(const k of fields){
      if(!Object.hasOwn(input,k))continue;
      const pair=input[k];
      if(!Array.isArray(pair)||pair.length!==2||!int(pair[0],0,100)||!int(pair[1],pair[0],100))return null;
      if(pair[0]||pair[1]!==100)selected[k]=[...pair];
    }
    for(const a of axes)if((selected[a]?.[0]||0)>(selected[a+'Potential']?.[1]??100))return null;
    return selected;
  }
  function price(criteria){
    if(!criteria)return null;
    // Narrow and outlying intervals require more public search time.
    let cost=3,count=0;
    for(const [lo,hi] of Object.values(criteria)){
      const tail=Math.max(0,lo-50,50-hi);
      cost+=1+Math.ceil((100-hi+lo)/16)+Math.ceil(tail/18)+count++;
    }
    return cost;
  }
  // Each interval names a fixed band of the wider population. All towns
  // share its cursor. Reading a quote leaves every candidate at home.
  function address(criteria){
    return Object.entries(criteria).map(([key,[min,max]])=>[fields.indexOf(key),min,max].join('.')).join('/')||'open';
  }
  function poolSeed(world){
    if(world.widerEarth)return world.widerEarth.seed;
    const origin=world.sites.find(s=>s.id===world.communityLife.originId)||world.sites[0];
    const birth=origin.birthCoordinate||origin;
    return hash([world.communityLife.originId,world.communityLife.originName,world.communityLife.profile?.name,birth.lat,birth.lon].join('|')).toString(36);
  }
  function externalProfile(world,criteria){
    const cohort=address(criteria),index=(world.widerEarth?.cursors?.[cohort]||0)+1;
    const seed=[poolSeed(world),cohort,index].join('|');
    const roll=(key,lo,hi)=>lo+(hash(seed+'#'+key)%(hi-lo+1));
    const selected=(key,ordinary)=>criteria[key]?roll(key,...criteria[key]):ordinary;
    const [place,region]=origins[roll('origin',0,origins.length-1)];
    const sourceId='earth-'+seed;
    const source={id:sourceId,name:place,region,lat:0,lon:0,residents:[]};
    const slot=sourceSlots[roll('occupation',0,sourceSlots.length-1)];
    const birth=root.EarthPersonas.birthProfile(source,slot);
    const p={...birth,birthCommunityName:place,traits:{},aptitudes:{},bounds:{}};
    for(const t of temperament)p.traits[t]=selected(t,t==='aggression'?root.EarthBorderConflict.disposition(birth):birth.traits[t]);
    for(const a of axes){
      const band=criteria[a]||[0,100],ceiling=criteria[a+'Potential']||[0,100];
      const high=Math.min(band[1],ceiling[1]);
      const skill=criteria[a]?roll(a,band[0],high):Math.min(birth.aptitudes[a],high);
      const min=Math.max(skill,ceiling[0]);
      const max=criteria[a+'Potential']?roll(a+'Potential',min,ceiling[1]):Math.max(skill,birth.bounds[a].max);
      p.aptitudes[a]=skill;p.bounds[a]={min:skill,max};
    }
    const dossier={origin:place,cohort,index,serviceYears:roll('years',1,18),savings:roll('savings',2,12)};
    for(const k of references)dossier[k]=k==='aggression'?p.traits.aggression:selected(k,roll(k,18,94));
    const recordCode=roll('register',0,19);
    dossier.civicRecord=recordCode===0?'Completed restitution on a recorded theft conviction.':
      recordCode<5?'No court register was supplied with this application.':'No conviction is recorded in the supplied district register.';
    dossier.record=roll('previous-contract',0,9)===0?'One earlier delivery contract ended after a missed handover.':'A former employer confirmed the completed placement.';
    p.externalHistory=dossier;
    p.strengths=[...axes].sort((a,b)=>p.aptitudes[b]-p.aptitudes[a]).slice(0,2);
    p.description=p.name+' spent '+dossier.serviceYears+' years working as a '+p.originRole.toLowerCase()+' at '+place+'. '+dossier.record;
    return p;
  }
  function projected(world,site){
    return root.EarthHousing?.projected?.(world,site,1)??Math.max(0,site.population+1-root.EarthCityModel.housingCapacity(site));
  }
  function quote(world,site,route,input={},projectedUnhoused){
    const criteria=specification(input);
    if(!criteria||!['random','targeted'].includes(route)||route==='random'&&Object.keys(criteria).length)return fail('Choose valid recruitment criteria.');
    if(route==='targeted'&&!Object.keys(criteria).length)return fail('Choose at least one range for the search.');
    const cost=route==='random'?0:price(criteria);
    return {ok:true,route,criteria,price:cost,unhoused:projectedUnhoused??projected(world,site),revision:revision(site),cursor:world.widerEarth?.cursors?.[address(criteria)]||0,
      site:site.id,week:world.week,generation:site.foundingRevision||0};
  }
  function invite(world,site,request){
    const q=quote(world,site,request.route,request.criteria);
    if(!q.ok)return q;
    if(request.week!==q.week||request.site!==q.site||request.generation!==q.generation||request.revision!==q.revision||
      request.cursor!==q.cursor||request.price!==q.price||request.unhoused!==q.unhoused)return fail('The population, search terms or housing offer changed. Review the invitation again.');
    return admit(world,site,q);
  }
  function admit(world,site,q){
    if(site.funds<q.price)return fail('The treasury needs '+q.price+' funds for this search.');
    if(!Number.isSafeInteger(q.revision+1)||!Number.isSafeInteger(site.population+1))return fail('The town register cannot take another entry.');
    if(!Number.isSafeInteger((world.widerEarth?.serial||0)+1))return fail('The wider Earth register has no further entries.');
    const person=externalProfile(world,q.criteria);
    // Stage the three small books touched by admission. Failed slot or
    // purse allocation must leave even the arrival cursor and roster intact.
    const old=site.communityLife,agency=site.agency,purses=site.purses;
    const receiving={...site,communityLife:{...old,away:{...old.away},people:{...old.people}},
      agency:agency&&{...agency,porters:[...(agency.porters||[])]},purses:purses&&{...purses,people:{...purses.people}}};
    const id=root.EarthCommunityLife.guestSlot(receiving,person,person.birthCommunityId,person.id,'member',world.week);
    if(!id)return fail('The street roster has no free place for a new identity.');
    // guestSlot reserves a new playable identity before any funds change hands.
    const saved=person.externalHistory.savings;
    if(!root.EarthPurses.receiveArrivalSavings(world,receiving,id))
      return fail('The incoming personal account could not receive the savings.');
    site.communityLife=receiving.communityLife;site.agency=receiving.agency;site.purses=receiving.purses;
    const pool=world.widerEarth||={seed:poolSeed(world),serial:0,cursors:{}};
    pool.cursors[person.externalHistory.cohort]=person.externalHistory.index;pool.serial++;
    site.population++;site.funds-=q.price;
    pool.importedFunds=(pool.importedFunds||0)+saved;pool.fees=(pool.fees||0)+q.price;
    root.EarthHousing?.sync?.(world,site);
    const d=site.communityLife.townCentre||={serial:0,arrivals:[]};d.serial++;
    const host=root.EarthCommunityLife.hostFor(site);
    if(host.id&&host.id!==id)root.EarthAutonomy?.remember(site,world.week,host.id,id,'visit');
    d.arrivals.unshift({week:world.week,number:d.serial,id,person:person.identityKey,name:person.name,route:q.route,price:q.price,criteria:q.criteria});
    d.arrivals.length=Math.min(8,d.arrivals.length);
    const text=person.name+' joined '+site.name+' from '+person.birthCommunityName+' with '+saved+' personal funds. '+
      (q.price?'The Town Centre paid '+q.price+' treasury funds for the search.':'The open invitation was free.')+
      (q.unhoused?' The town now needs housing for '+q.unhoused+'.':'');
    root.EarthCommunityLife.recordWeek(site,world.week,text);
    return {ok:true,message:text,id};
  }
  function visitorKey(guest){
    return guest.profile.identityKey||root.EarthPersonas.identityKey(guest.originId,guest.originSlot);
  }
  function housingTerms(offer){
    if(!offer)return '';
    return JSON.stringify([offer.kind||(offer.seller?'sale':'share'),offer.dwelling,offer.price,offer.seller,offer.worker]);
  }
  function applications(world,site){
    return Object.entries(site?.communityLife?.people||{}).filter(([,guest])=>guest.status==='visitor').flatMap(([id,guest])=>{
      const fit=root.EarthCommunityLife.visitorFit(world,site,id);
      if(!fit)return [];
      const origin=world.sites.find(t=>t.id===fit.homeId)||world.communityLife.outposts.find(t=>t.id===fit.homeId);
      if(!origin)return [];
      const housing=fit.housing,attestations=root.EarthCommunityLife.personalAccess(world,origin,guest.profile);
      const work=origin.careers?.[guest.visitSlot]?.history?.[0];
      const agreements=(origin.agency?.arrangements?.rows||[]).filter(r=>r.actorId===guest.visitSlot&&['kept','missed'].includes(r.status));
      const evidence=attestations.voices.slice(0,3).map(v=>v.name+(v.strength>0?' vouches for this applicant.':' has reservations about this applicant.'));
      if(agreements.length)evidence.push(agreements.filter(r=>r.status==='kept').length+' kept and '+agreements.filter(r=>r.status==='missed').length+' missed agreements recorded by the home town.');
      if(work)evidence.push('Week '+work.week+' · '+work.text);
      return [{id,identity:visitorKey(guest),profile:guest.profile,fit,housing,terms:housingTerms(housing),evidence,origin:origin.name,
        balance:origin.purses?.people?.[guest.visitSlot]?.balance||0}];
    });
  }
  function recruitmentBlock(world,site){
    const life=world.communityLife;
    if(!site||!life)return 'Found a home community to issue invitations.';
    if(!root.EarthCommunityLife.isHome(world,site)){
      const home=world.sites.find(t=>t.id===life.homeId)||life.outposts.find(t=>t.id===life.homeId);
      return site.name+' decides on its own invitations. Your home Town Centre is in '+home.name+'.';
    }
    if(life.journey)return 'Finish your journey and return to '+site.name+' to issue invitations.';
    if(world.activeId!==site.id)return 'Travel back to '+site.name+' through Towns to issue an invitation here.';
    const actor=root.EarthAgency?.actorId(site)||'steward';
    if(root.EarthCommunityLife.residency(site,actor)!=='member'||root.EarthCommunityLife.commuting(site,actor))return 'Choose a resident of '+site.name+' to sign the invitation.';
    return '';
  }
  function authorised(world,site){return !recruitmentBlock(world,site);}
  function command(world,site,request){
    const blocked=recruitmentBlock(world,site);
    if(blocked)return fail(blocked);
    if(request.actor!==(root.EarthAgency?.actorId(site)||'steward')||request.site!==site.id||request.week!==world.week||
      request.generation!==(site.foundingRevision||0))return fail('The signer, community or week changed. Review the invitation again.');
    if(request.route==='regional'){
      const guest=site.communityLife.people[request.id];
      if(guest?.status!=='visitor'||request.identity!==visitorKey(guest))return fail('This application is no longer current.');
      const review=root.EarthCommunityLife.visitorFit(world,site,request.id);
      if(!review||housingTerms(review.housing)!==request.terms)return fail('The housing offer changed. Review the dwelling, price and terms before accepting.');
      return root.EarthCommunityLife.acceptVisitor(world,site,request.id,review);
    }
    return invite(world,site,request);
  }
  function newCottage(site){
    const home=site.civicLand?.homes.at(-1),arrived=ledger(site)?.arrivals?.[0]?.week||0;
    return home&&home.completed>arrived?home:null;
  }
  function recruitmentPlan(world,site){
    const cottage=newCottage(site);
    const vacancy=root.EarthCareers.catalog.find(job=>site.employers?.[job.id]?.open?.length);
    const precincts=site.city?.precincts||[],developed=precincts.some(p=>p.use==='homes');
    const broker=site.growth?.broker;
    const freight=broker?.parcel>0&&broker.cash>=3&&site.growth.history.some(round=>round.wages>0);
    const reason=cottage?'Council cottage C'+(cottage.plot+1)+' opened with room for another resident.':vacancy?vacancy.employer+' has an unfilled '+vacancy.label.toLowerCase()+' post.':
      freight?'The freight exchange has '+broker.parcel+' uncollected parcels and '+broker.cash+' funds for delivery shifts.':
      developed?'The town has opened a residential precinct.':'';
    if(!reason)return {reason:'The employers reported no vacancy or funded freight backlog, and no new housing precinct requires settlers.'};
    if(site.trust<45)return {reason:'The council deferred invitations while local trust stands at '+site.trust+'/100.'};
    const foodFloor=3*Math.ceil((site.population+1)/5);
    if(site.food<foodFloor)return {reason:'The kitchen has '+site.food+' food. The town needs '+foodFloor+' for three household rounds after an arrival.'};
    const applicant=Object.values(site.communityLife.people).find(g=>g.status==='visitor');
    if(applicant)return {reason:applicant.profile.name+' is already inspecting a local opening. The town will hear this regional application first.'};
    const unhoused=projected(world,site);
    // A council can accept one temporary deficit for an actual vacancy if a
    // public home is already built and only awaits its calendar opening.
    const opening=precincts.some(p=>p.target==='homes'&&p.laborReady&&p.turns<=1);
    const canBridge=unhoused===1&&vacancy&&opening&&site.trust>=60&&site.food>=2*foodFloor;
    if(unhoused>0&&!canBridge)return {reason:reason+' Inviting another person would leave '+unhoused+' residents without housing rights.'};
    const character=root.EarthCommunityLife.communityCharacter(site);
    if(character.tally.forceful>character.tally.welcoming+character.tally.guarded&&!vacancy)
      return {reason:'The local majority requires a named employer vacancy before inviting an unfamiliar person from wider Earth.'};
    const criteria=vacancy?{[vacancy.skill]:[vacancy.requiredSkill,100],[vacancy.secondary]:[vacancy.secondMinimum,100]}:{};
    const protectedCash=root.EarthCivicInitiatives.reserve(world,site).funds+(root.EarthNeighbourErrands?.heldGoods?.(site,world.week)?.funds||0);
    const targeted=vacancy&&site.funds>=price(criteria)+protectedCash+4;
    const terms=quote(world,site,targeted?'targeted':'random',targeted?criteria:{},unhoused);
    return {terms,reason:reason+(canBridge?' A completed housing crew is awaiting next week’s opening.':'')};
  }
  function productionReview(world,site){
    const round=site.growth?.round||0;
    if(!round||round%6||!site.communityLife?.cluster||root.EarthCommunityLife.isHome(world,site))return;
    const prior=ledger(site)?.review;
    if(prior?.week===world.week||prior?.round===round)return;
    const {terms,reason}=recruitmentPlan(world,site);
    if(!terms?.ok)return;
    const result=admit(world,site,terms);
    if(result.ok)site.communityLife.townCentre.review={week:world.week,round,route:terms.route,reason};
  }
  function tick(world,site){
    const age=world.week-site.founded;
    if(!site.communityLife?.cluster||root.EarthCommunityLife.isHome(world,site)||(!newCottage(site)&&(age<8||age%8!==0))||ledger(site)?.review?.week===world.week)return [];
    const d=site.communityLife.townCentre||={serial:0,arrivals:[]};
    const {terms,reason}=recruitmentPlan(world,site);
    d.review={week:world.week,route:'deferred',reason};
    if(!terms?.ok)return [];
    const result=admit(world,site,terms);
    if(!result.ok){d.review.reason=reason+' '+result.message;return [];}
    d.review.route=terms.route;
    return [reason+' '+result.message];
  }
  function validPool(pool){
    if(!object(pool)||typeof pool.seed!=='string'||!/^[0-9a-z]{1,8}$/.test(pool.seed)||!int(pool.serial,1)||!object(pool.cursors))return false;
    if(pool.importedFunds!=null&&!int(pool.importedFunds,0)||pool.fees!=null&&!int(pool.fees,0))return false;
    let sum=0;
    for(const [cohort,last] of Object.entries(pool.cursors)){
      if(!int(last,1)||cohort.length>fields.length*11)return false;
      if(cohort!=='open'){
        const input={};
        for(const triplet of cohort.split('/')){
          const [i,min,max]=triplet.split('.').map(Number);
          if(!int(i,0,fields.length-1))return false;
          input[fields[i]]=[min,max];
        }
        const parsed=specification(input);if(!parsed||address(parsed)!==cohort)return false;
      }
      sum+=last;
    }
    return sum===pool.serial;
  }
  function valid(world,site){
    if(world.sites?.[0]===site&&world.widerEarth!=null&&!validPool(world.widerEarth))return false;
    const d=ledger(site);
    if(d?.review!=null&&(!object(d.review)||!int(d.review.week,1,world.week)||!['deferred','random','targeted'].includes(d.review.route)||
      typeof d.review.reason!=='string'||!d.review.reason.length||d.review.reason.length>650))return false;
    if(d!=null&&(!object(d)||!int(d.serial,0)||!d.serial&&!d.review||!Array.isArray(d.arrivals)||d.arrivals.length!==Math.min(8,d.serial)||
      !d.arrivals.every((r,i)=>object(r)&&int(r.week,1,i?d.arrivals[i-1].week:world.week)&&r.number===d.serial-i&&
        root.EarthPersonas.isPorterId(r.id)&&typeof r.name==='string'&&r.name.length>0&&r.name.length<=100&&
        typeof r.person==='string'&&r.person.startsWith('birth:')&&r.person.length<=1100&&
        object(r.criteria)&&specification(r.criteria)!==null&&
        (r.route==='random'?r.price===0&&!Object.keys(r.criteria).length:
          r.route==='targeted'&&Object.keys(r.criteria).length>0&&r.price===price(specification(r.criteria))))))return false;
    for(const guest of Object.values(site.communityLife?.people||{})){
      const h=guest?.profile?.externalHistory;if(h==null)continue;
      if(!object(h)||!origins.some(([s])=>s===h.origin)||!int(h.serviceYears,1,18)||!int(h.savings,2,12)||
        typeof h.cohort!=='string'||!int(h.index,1,world.widerEarth?.cursors?.[h.cohort]||0)||!references.every(k=>int(h[k],0,100))||typeof h.record!=='string'||h.record.length>180||
        typeof h.civicRecord!=='string'||h.civicRecord.length>180)return false;
      const origin='earth-'+world.widerEarth.seed+'|'+h.cohort+'|'+h.index;
      if(guest.profile.birthCommunityId!==origin||guest.originId!==origin||!sourceSlots.includes(guest.originSlot)||
        guest.profile.identityKey!==root.EarthPersonas.identityKey(origin,guest.originSlot))return false;
    }
    return true;
  }
  root.EarthTownCentre=Object.freeze({productionReview,fields,label,price,specification,quote,command,applications,authorised,recruitmentBlock,tick,valid});
})(typeof window==='undefined'?globalThis:window);
