/* The wider census is addressable by birth district, cohort and recorded
   aptitudes. A commission searches a stratum of the census. It never changes
   a candidate's scores after an invitation. */
(function(root){
  'use strict';
  const skills=['numeracy','music','communication','care','craft','stamina','organisation'];
  const personal=['aggression','curiosity','sociability','patience','initiative','adaptability','workEthic','reliability','reputation','learningRate','potential'];
  const fields=[...personal,...skills],dimensions=new Set(fields);
  const titles={workEthic:'Work ethic',learningRate:'Learning rate',potential:'Development potential',reputation:'Prior reputation'};
  const title=k=>titles[k]||k[0].toUpperCase()+k.slice(1);
  const fail=message=>({ok:false,message}),ok=message=>({ok:true,message});
  const book=()=>root.EarthTownCentre;
  const life=()=>root.EarthCommunityLife;
  const key=p=>p.identityKey||p.id;
  const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
  function hash(str){
    let n=2166136261;for(let i=0;i<str.length;i++)n=Math.imul(n^str.charCodeAt(i),16777619);
    n=Math.imul(n^(n>>>16),0x45d9f3b);return (n^(n>>>16))>>>0;
  }
  function terms(bounds){
    if(!bounds||typeof bounds!=='object'||Array.isArray(bounds)||Object.keys(bounds).some(k=>!dimensions.has(k)))return null;
    let cost=4,count=0;
    for(const k of fields){
      const r=bounds[k];if(r==null)continue;
      if(!Array.isArray(r)||r.length!==2||!integer(r[0],0,100)||!integer(r[1],r[0],100))return null;
      const width=r[1]-r[0]+1,mid=(r[1]+r[0])/2;
      cost+=2+Math.ceil(Math.log2(101/width)*2+Math.abs(mid-50)/20);count++;
    }
    return count?cost+Math.floor(count*(count-1)/3):4;
  }
  function initialise(w){
    if(!w.communityLife||w.populationOffice)return;
    const origin=w.communityLife.originId;
    w.populationOffice={version:1,seed:hash('Earth census/'+origin),serial:0,outside:[],round:0};
    replenish(w);
  }
  function record(w,serial,bounds={}){
    const office=w.populationOffice,scores={};
    for(const k of fields){
      const [lo,hi]=bounds[k]||[0,100];
      scores[k]=lo+hash([office.seed,serial,k].join('/'))%(hi-lo+1);
    }
    const district='earth-'+office.seed.toString(36)+'-'+serial.toString(36)+'-'+fields.map(k=>scores[k].toString(36).padStart(2,'0')).join('');
    const birth=['Inland cooperative','Coastal exchange','Hill district','River settlement','Northern workshop'][hash(district)%5];
    return {district,serial,scores,birth,cash:2+hash(district+'savings')%11,experience:1+hash(district+'work')%17,
      record:hash(district+'record')%17===0?'One recorded conviction for theft; the sentence was completed.':'No conviction in the supplied district record.'};
  }
  function replenish(w){
    const office=w.populationOffice;
    while(office.outside.length<6)office.outside.push(record(w,++office.serial));
  }
  function profile(row){
    const slot='walker-'+row.serial%5;
    const base=root.EarthPersonas.birthProfile({id:row.district,name:row.birth,region:row.birth,lat:0,lon:0,residents:[]},slot);
    const traits={...base.traits},aptitudes={},bounds={},scores=row.scores;
    for(const k of root.EarthPersonas.traits)traits[k]=scores[k];
    for(const a of skills){
      aptitudes[a]=scores[a];bounds[a]={...base.bounds[a],min:Math.max(0,scores[a]-Math.ceil(scores.learningRate/7)),max:Math.max(scores[a],scores.potential)};
    }
    return {...base,traits,aptitudes,bounds,demonstratedSkills:{...aptitudes},strengths:skills.slice().sort((a,b)=>aptitudes[b]-aptitudes[a]).slice(0,2),
      birthCommunityName:row.birth,background:{...scores,workYears:row.experience,record:row.record},
      description:base.name+' worked for '+row.experience+' years in the '+row.birth.toLowerCase()+'. Their prior employer rated their reliability '+scores.reliability+'/100. Their strongest assessed skill is '+title(skills.reduce((a,b)=>aptitudes[a]>aptitudes[b]?a:b))+'.'};
  }
  function dossier(s,p){
    const b=p.background,local=root.EarthPersonas.profile(s,p.id)?.identityKey===key(p);
    const career=local?s.careers?.[p.id]:null,h=local?s.growth?.households.find(h=>h.owner===key(p)):null;
    const resident=local?s.residents.find(r=>r.id===p.id):null,week=s.autonomy?.week||s.founded||1;
    const references=local?(root.EarthAutonomy?.contacts(s,p.id,week)||[]).filter(r=>r.here).slice(0,4).map(r=>({
      name:r.name,trust:root.EarthAutonomy.bond(s,r.id,p.id,week),reason:r.reason,week:r.week
    })):[];
    const prior=b?.reliability,completed=h?.points||0,missed=resident?.lastMissed?1:0;
    const reliability=prior==null&&!completed&&!missed?null:Math.max(0,Math.min(100,Math.round((prior??50)+Math.min(18,completed/3)-missed*15)));
    return {reliability,references,ability:{...p.aptitudes,...career?.skills},potential:b?.potential??Math.max(...skills.map(a=>p.bounds[a].max)),learningRate:b?.learningRate,
      workEthic:b?.workEthic,traits:p.traits,record:b?.record||'No criminal-history report on file.',priorReputation:b?.reputation,
      history:[...(career?.history||[]).slice(0,2).map(x=>x.text),...(h?.last?[h.last]:[])],
      evidence:(b?b.workYears+' years in the prior district. ':'')+completed+' recorded local contribution points. '+(missed?'A missed promise is on file.':'')};
  }
  function findTown(w,id){return w.sites.find(s=>s.id===id)||w.communityLife?.outposts.find(s=>s.id===id);}
  function hasSlot(s){
    const used=new Set([...Object.keys(s.communityLife?.people||{}),...root.EarthPersonas.porterIds(s)]);
    let n=0;for(const id of used)if(root.EarthPersonas.isPorterId(id))n++;
    return n<24;
  }
  function openings(w,s){return book().view(w,s);}
  function applicant(w,s,a){
    const from=findTown(w,a.from),p=from&&root.EarthPersonas.profile(from,a.id);
    return p&&key(p)===a.key&&life().present(from,a.id)&&life().residency(from,a.id)==='member'&&!life().commuting(from,a.id)?{from,p}:null;
  }
  function applications(w,s){
    return s.centre.applications.flatMap(a=>{
      const candidate=applicant(w,s,a);if(!candidate)return [];
      const {p,from}=candidate;return [{...a,p,from:from.id,origin:from.name,cash:book().balance(from,p.id),dossier:dossier(from,p)}];
    });
  }
  function apply(w,sites){
    const round=w.populationOffice.round;
    const engaged=new Set(sites.flatMap(t=>t.centre?.incoming?.key?[t.centre.incoming.key]:[]));
    for(const target of sites){
      const c=target.centre;
      c.applications=c.applications.filter(a=>a.expires>=round&&applicant(w,target,a)&&!engaged.has(a.key));
      if(c.applications.length>=4)continue;
      const peers=sites.filter(s=>s!==target&&s.communityLife?.cluster===target.communityLife?.cluster&&s.population>=4);
      if(!peers.length)continue;
      const from=peers[(Math.floor(round/3)+hash(target.id))%peers.length];
      const role=target.specialty==='food'?'care':target.specialty==='materials'?'craft':'organisation';
      const rows=life().fieldCandidates(from,w).map(id=>root.EarthPersonas.profile(from,id)).filter(p=>p&&
        !life().commuting(from,p.id)&&!engaged.has(key(p))&&!c.applications.some(a=>a.key===key(p))&&
        from.centre?.project?.workerKey!==key(p)&&
        (p.traits.curiosity>=62||from.centre.distress[key(p)]||from.wellbeing+9<target.wellbeing)&&p.aptitudes[role]>=46);
      const p=rows.sort((a,b)=>b.aptitudes[role]-a.aptitudes[role]||a.id.localeCompare(b.id))[0];if(!p)continue;
      const why=from.centre.distress[key(p)]?'I need a secure home.':'I want work that uses my '+role+' experience.';
      c.applications.push({from:from.id,id:p.id,key:key(p),filed:round,expires:round+18,why});c.revision++;
    }
  }
  function quote(w,s,route,bounds={}){
    const v=openings(w,s);
    return {route,price:route==='targeted'?terms(bounds):0,projected:Math.max(0,v.missing+(v.available?0:1)),available:v.available,
      capacity:v.capacity,population:v.population,personalPrice:v.available?2:7};
  }
  function commission(w,s,request){
    const c=s.centre,r=request.route;
    if(!['regional','random','targeted'].includes(r))return fail('Choose a recruitment route.');
    if(c.incoming)return fail('The clerk is already settling a household.');
    if(!hasSlot(s))return fail('All named arrival places on this street are in use.');
    const q=quote(w,s,r,request.criteria);
    if(q.price===null||request.price!==q.price||request.deficit!==q.projected)return fail('The price or housing forecast changed. Review the new offer.');
    if(s.funds<q.price)return fail('The treasury cannot cover the search fee.');
    const office=w.populationOffice,view=openings(w,s),d=view.plots.find(p=>p.available>0);
    let incoming;
    if(r==='regional'){
      const a=c.applications.find(a=>a.key===request.applicant&&a.expires>=office.round),found=a&&applicant(w,s,a);
      if(!found)return fail('This application is no longer open.');
      const {from,p}=found,reason=life().departureReason(from,p.id,w);
      if(reason)return fail(p.name+' needs a handover. '+reason);
      if(root.EarthRegionalWorld?.passageAgreement(w,from,s)===false)return fail('A disputed crossing prevents this move.');
      if(book().balance(from,p.id)<q.personalPrice)return fail(p.name+' needs '+q.personalPrice+' personal funds to secure housing.');
      if(!root.EarthPurses.productionReceipt(w,from,p.id,-q.personalPrice,'Housing deposit held at '+s.name+' Town Centre.'))return fail('The deposit could not be reserved.');
      incoming={route:r,key:a.key,from:from.id,person:p.id,name:p.name,deposit:q.personalPrice,plot:d?.id??null,remaining:2,
        reason:a.why,stage:d?'preparing':'awaiting housing'};
      for(const site of book().towns(w))if(site.centre)site.centre.applications=site.centre.applications.filter(a=>a.key!==incoming.key);
      (from.centre.departures||={})[p.id]=s.id;
    }else{
      let row;
      if(r==='random'){row=office.outside.shift();replenish(w);}
      else{
        const match=office.outside.findIndex(candidate=>Object.entries(request.criteria||{}).every(([k,[lo,hi]])=>candidate.scores[k]>=lo&&candidate.scores[k]<=hi));
        if(match>=0){row=office.outside.splice(match,1)[0];replenish(w);}
        else row=record(w,++office.serial,request.criteria);
        s.funds-=q.price;office.searchFees=(office.searchFees||0)+q.price;
      }
      const p=profile(row);
      incoming={route:r,key:key(p),name:p.name,record:row,plot:d?.id??null,remaining:2,stage:'travelling',price:q.price};
    }
    c.incoming=incoming;
    const message=(r==='targeted'?q.price+' treasury funds paid for the search. ':'')+incoming.name+
      (incoming.stage==='awaiting housing'?' accepted conditional admission and is staying at home until a dwelling opens.':' accepted the invitation and will arrive after the journey.')+
      (q.projected?' Projected housing deficit '+q.projected+'.':'');
    book().note(w,s,message,incoming.key,'invitation');return ok(message);
  }
  function introductions(w,s,p){
    const others=root.EarthPersonas.list(s).filter(a=>a.id!==p.id&&!life().commuting(s,a.id)&&life().residency(s,a.id)==='member');
    const host=others.sort((a,b)=>b.traits.sociability-a.traits.sociability)[0];
    if(!host)return;
    (s.agency||={actor:'steward',meals:[]});
    // The durable settling record is the same one used by the existing
    // household handover and contact system.
    const group=s.communityLife.settling||=[];
    if(!group.some(g=>g.entrant===p.id)&&group.length<16)group.push({guide:host.id,guideName:host.name,entrant:p.id,entrantName:p.name,
      sessions:1,arrived:w.week,first:w.week,last:w.week});
    return host;
  }
  function progress(w,s){
    const c=s.centre,a=c.incoming;if(!a)return;
    const regional=a.route==='regional',from=regional&&findTown(w,a.from);
    if(regional&&(!from||from.centre?.departures?.[a.person]!==s.id))return;
    if(regional&&a.plot==null){
      const d=openings(w,s).plots.find(p=>p.available);
      if(!d){a.stage='awaiting housing';return;}a.plot=d.id;a.stage='preparing';
    }
    if(regional&&a.stage==='preparing'){
      if(root.EarthRegionalWorld?.passageAgreement(w,from,s)===false)return;
      const path=root.EarthRegionalWorld?.crossingPath(w,from,s);
      if(path===null)return;
      a.path=path||[];a.remaining=Math.max(2,Math.ceil((path?.length||4)/(2+(from.growth?.vehicle||0))));a.duration=a.remaining;
      from.communityLife.away[a.person]='regional-visit';a.stage='travelling';
    }
    if(--a.remaining>0){c.revision++;return;}
    if(!hasSlot(s)){a.remaining=1;a.stage='awaiting entry clerk';return;}
    let id,person;
    if(regional){
      if(root.EarthRegionalWorld?.passageAgreement(w,from,s)===false){a.remaining=1;a.stage='waiting for passage';return;}
      const moved=life().movePerson(w,from,s,a.person);if(!moved){a.remaining=1;return;}
      delete from.centre.departures[a.person];if(!a.disbursed)s.funds+=a.deposit;id=moved.id;
      book().note(w,from,a.name+' moved to '+s.name+'. Their employer released their post and their remaining savings travelled with them.',a.key,'departure');
    }else{
      person=profile(a.record);
      id=life().guestSlot(s,person,a.record.district,person.id,'member',w.week);
      if(!id){a.remaining=1;return;}
      s.population++;w.populationOffice.immigrantSavings=(w.populationOffice.immigrantSavings||0)+a.record.cash;root.EarthPurses.productionReceipt(w,s,id,a.record.cash,'Personal savings brought from '+a.record.birth+'.','arrivalSavings');
    }
    person=root.EarthPersonas.profile(s,id);
    if(a.plot!=null)c.rights[a.key]=a.plot;
    delete c.incoming;
    book().reconcile(w,s,book().roster(w,s));
    const host=introductions(w,s,person);
    const message=person.name+' settled from '+(regional?from.name:a.record.birth)+' with '+book().balance(s,id)+' personal funds.'+
      (c.rights[a.key]==null?' They are seeking housing.':' They moved into '+(a.plot!=null?'their reserved dwelling.':'available housing.'))+(host?' '+host.name+' offered an introduction.':'');
    if(host)root.EarthAutonomy?.remember(s,w.week,host.id,id,'visit');
    book().note(w,s,message,a.key,'arrival');life().recordWeek(s,w.week,message);c.lastArrival={key:a.key,name:person.name,route:a.route,week:w.week};
  }
  function advance(w){
    if(!w.communityLife)return;initialise(w);
    const o=w.populationOffice,sites=book().towns(w).filter(s=>s.centre);
    // A production-backed week is one shift. A calendar close cannot advance
    // the same contract or journey for a second time.
    const shift=sites.reduce((n,s)=>Math.max(n,s.growth?.round||0),0);
    if(o.lastShift===shift)return;o.lastShift=shift;o.round++;
    for(const s of sites)progress(w,s);
    if(o.round%3===0)apply(w,sites);
    for(const s of sites){
      if(life().isHome(w,s)||s.centre.incoming||o.round-(s.centre.lastDecision||0)<5||!hasSlot(s))continue;
      s.centre.lastDecision=o.round;
      const v=openings(w,s);
      const fundedHome=s.centre.project?.kind==='home'&&s.centre.project.stage>=1;
      if((!v.available&&!fundedHome)||v.missing>1||s.food<Math.ceil((s.population+1)/4)||s.population>=26)continue;
      const applicants=applications(w,s),a=applicants.find(a=>a.cash>=(v.available?2:7)&&!life().departureReason(findTown(w,a.from),a.id,w)&&
        (s.centre.charter!=='closed'||a.p.traits.patience>=64));
      let route=a?'regional':'random',criteria={};
      if(!a&&(s.centre.charter==='closed'||s.specialty==='materials')&&s.funds>=17){
        criteria={craft:[52,100]};route='targeted';
      }else if(!a&&s.centre.charter==='closed')continue;
      const offer=quote(w,s,route,criteria);
      commission(w,s,{route,criteria,price:offer.price,deficit:offer.projected,applicant:a?.key});
    }
  }
  function command(w,s,r){return r.action==='recruit'?commission(w,s,r):fail('Unknown Town Centre decision.');}
  function validSite(s){
    const c=s.centre;if(!c)return true;
    const a=c.incoming;
    if(c.departures&&(!c.departures||typeof c.departures!=='object'||Array.isArray(c.departures)||!Object.values(c.departures).every(id=>typeof id==='string')))return false;
    if(a?.path&&(!Array.isArray(a.path)||a.path.length>4097||!a.path.every(id=>typeof id==='string'&&/^-?\d{1,6},-?\d{1,6}$/.test(id))))return false;
    if(a?.duration!=null&&!integer(a.duration,1,8192))return false;
    if(!c.applications.every(v=>v&&typeof v.key==='string'&&typeof v.id==='string'&&typeof v.from==='string'&&Number.isSafeInteger(v.expires)))return false;
    if(!a)return true;
    return ['regional','random','targeted'].includes(a.route)&&typeof a.name==='string'&&typeof a.key==='string'&&Number.isSafeInteger(a.remaining)&&a.remaining>=0&&
      (a.route==='regional'?typeof a.person==='string'&&typeof a.from==='string'&&[2,7].includes(a.deposit):validRecord(a.record));
  }
  function validRecord(r){return r&&typeof r.district==='string'&&typeof r.birth==='string'&&typeof r.record==='string'&&Number.isSafeInteger(r.serial)&&r.serial>=1&&
    integer(r.experience,1,100)&&integer(r.cash,0,12)&&r.scores&&fields.every(k=>integer(r.scores[k],0,100));}
  function validWorld(w){const o=w.populationOffice;return !o||o.version===1&&[o.seed,o.serial,o.round,o.immigrantSavings??0,o.searchFees??0].every(n=>Number.isSafeInteger(n)&&n>=0)&&
    Array.isArray(o.outside)&&o.outside.length<=6&&o.outside.every(validRecord);}
  root.EarthPopulationOffice={initialise,fields,title,terms,profile,quote,dossier,applications,command,advance,validSite,validWorld};
})(typeof window==='undefined'?globalThis:window);
