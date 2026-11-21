/* Each Town Centre displays its own treasury and membership decisions. */
(function(root){
  'use strict';
  function mount(host,sim,onResult,openBase){
    const domain=root.EarthTownCentre;if(!host||!domain)return null;
    const doc=host.ownerDocument;
    const element=(tag,text)=>{const n=doc.createElement(tag);if(text!=null)n.textContent=text;return n;};
    const button=(name,act)=>{const b=element('button',name);b.type='button';b.onclick=act;return b;};
    const option=(key,name)=>{const o=element('option',name);o.value=key;return o;};
    const line=(parent,text)=>parent.append(element('p',text));
    function labelled(text,input){
      const l=element('label',text);l.append(input);return l;
    }
    function fold(parent,title){
      const d=element('details');d.append(element('summary',title));parent.append(d);return d;
    }
    const body=element('div'),place=element('select'),summary=element('p'),policy=element('p'),forms=element('div'),status=element('p');
    const arrivalRows=new Map(),history=element('div'),arrivalTitle=element('h4','Wider Earth arrivals'),regional=element('div'),random=element('div'),targeted=element('div');
    body.className='town-centre-body';status.setAttribute('role','status');
    arrivalTitle.hidden=true;history.append(arrivalTitle);
    forms.append(regional,random,targeted);body.append(labelled('Community',place),summary,policy,forms,history);host.append(body);
    const select=element('select'),low=element('input'),high=element('input'),rules=element('div'),cost=element('p');
    for(const field of domain.fields)select.append(option(field,domain.label(field)));
    for(const [field,value] of [[low,65],[high,100]]){field.type='number';field.min='0';field.max='100';field.value=String(value);}
    let selected='',expected='',busy=false,criteria={},districts='',lastLedger='',lastWorld=null,lastWeek=0;
    let blind=null,search=null,quotedWorld=null,quoteStamp='',rosterFull=false;
    const current=()=>[...sim.state.sites,...(sim.state.communityLife?.outposts||[])].find(s=>s.id===selected)||sim.active();
    const embassy=element('section'),embassyTitle=element('h3'),diplomacyList=element('div'),foreign=element('select'),relationText=element('p'),defence=element('p');
    diplomacyList.className='diplomacy-overview';diplomacyList.setAttribute('role','group');diplomacyList.setAttribute('aria-label','Relations with neighbouring communities');
    const decision=button('Declare war',async()=>{
      const world=sim.state,home=world.communityLife?.homeId;
      const target=foreign.value,relation=root.EarthBorderConflict.relation(world,home,target);
      const action=relation?.state==='war'?(relation.offer?'accept':'negotiate'):'declare';
      decision.disabled=true;
      try{
        const result=await sim.perform('diplomacy',{home,target,action});
        status.textContent=result.message;onResult?.(result);
      }finally{refresh(true);}
    });
    const cancelTalks=button('Cancel talks',async()=>{
      const world=sim.state;cancelTalks.disabled=true;
      try{
        const result=await sim.perform('diplomacy',{home:world.communityLife.homeId,target:foreign.value,action:'cancel'});
        status.textContent=result.message;onResult?.(result);
      }finally{refresh(true);}
    });
    embassy.append(embassyTitle,diplomacyList,labelled('Other community',foreign),relationText,decision,cancelTalks,defence);
    body.insertBefore(embassy,forms);
    let embassyKeys='',overviewKey='';
    function showDiplomacy(world,towns,s){
      const home=towns.find(t=>t.id===world.communityLife?.homeId);
      embassy.hidden=!home||!root.EarthBorderConflict||towns.length<2;if(embassy.hidden)return;
      embassyTitle.textContent='Diplomacy for '+home.name;
      const others=towns.filter(t=>t!==home),keys=others.map(t=>t.id+'|'+t.name).join('/');
      if(embassyKeys!==keys){
        const old=foreign.value;
        foreign.replaceChildren(...others.map(t=>option(t.id,t.name)));
        foreign.value=others.find(t=>t.id===old)?.id||others[0].id;embassyKeys=keys;
      }
      if(expected!==s.id&&s!==home)foreign.value=s.id;
      const other=others.find(t=>t.id===foreign.value)||others[0],r=root.EarthBorderConflict.relation(world,home.id,other.id);
      const rows=others.map(t=>{
        const rel=root.EarthBorderConflict.relation(world,home.id,t.id);
        const occupied=t.communityLife?.border?.occupiedBy===home.id?'Occupied':home.communityLife?.border?.occupiedBy===t.id?'Occupying home':'';
        const state=occupied||(rel?.state==='war'?(rel.offer?'Ceasefire offered':'At war'):'Peace');
        return {id:t.id,name:t.name,state,war:rel?.state==='war',offer:!!rel?.offer,active:t.id===other.id};
      });
      const nextOverview=JSON.stringify(rows);
      if(overviewKey!==nextOverview){
        overviewKey=nextOverview;
        diplomacyList.replaceChildren(...rows.map(item=>{
          const b=button(item.name+' · '+item.state,()=>{foreign.value=item.id;refresh(true);});
          b.className='diplomacy-chip'+(item.war?' is-war':'')+(item.offer?' is-offer':'');
          b.setAttribute('aria-pressed',String(item.active));
          return b;
        }));
      }
      relationText.textContent=home.name+' and '+other.name+(r?.state==='war'?' are at war.':' are at peace.')+
        (r?.offer?' Both councils will recall their watches, return occupied parcels and reopen passage.':'');
      decision.textContent=r?.state==='war'?(r.offer?'Accept ceasefire terms':'Negotiate peace'):'Declare war';
      decision.disabled=false;cancelTalks.hidden=!r?.offer;cancelTalks.disabled=false;
      const fort=s.communityLife.border?.defence;
      defence.textContent=fort?s.name+' · '+['Boundary walls and gate commissioned','Gateposts set','Boundary walls built','Walls and guarded gate completed'][fort.stage]+(fort.builder?' · '+fort.builder:''):'';
    }
    foreign.addEventListener('change',()=>refresh(true));
    const blindCommit=button('Commit to a blind invitation',()=>sign(blind,blindCommit));
    const paidCommit=button('Commission this search',()=>sign(search,paidCommit));
    const appFold=fold(regional,'Regional applications'),appList=element('div'),applicationRows=new Map(),empty=element('p','No visiting households are applying here this week.');
    appFold.append(appList);appList.append(empty);
    const blindFold=fold(random,'Free invitation from wider Earth'),blindText=element('p');
    const homeRegister=button('',()=>open(sim.state.communityLife.homeId));
    blindFold.append(blindText,blindCommit,homeRegister);
    body.insertBefore(status,forms);
    const targetFold=fold(targeted,'Targeted search from wider Earth');
    line(targetFold,'Choose the traits and abilities the recruiter must verify. Each range runs from 0 to 100.');
    const add=button('Apply range',()=>{
      const key=select.value,a=low.valueAsNumber,b=high.valueAsNumber;
      const trial=domain.specification({...criteria,[key]:[a,b]});
      if(!trial){status.textContent='Enter a range from 0 to 100. An ability cannot exceed its development potential.';return;}
      criteria=trial;status.textContent='';renderRanges();offers();
    });
    targetFold.append(labelled('Criterion',select),labelled('Minimum',low),labelled('Maximum',high),add,rules,cost,paidCommit);
    function renderRanges(){
      rules.replaceChildren();
      for(const [key,[a,b]] of Object.entries(criteria)){
        const row=element('p');row.append(element('span',domain.label(key)+' '+a+'–'+b+' '),
          button('Remove '+domain.label(key),()=>{delete criteria[key];renderRanges();offers();}));
        rules.append(row);
      }
    }
    function dossier(parent,p){
      const record=p.externalHistory;
      if(record){
        line(parent,record.serviceYears+' years at '+record.origin+'. '+record.record+' Previous savings '+record.savings+' funds.');line(parent,record.civicRecord);
        line(parent,['workEthic','reliability','reputation','aggression','learningRate'].map(k=>domain.label(k)+' '+record[k]).join(' · '));
      }else line(parent,p.description);
      line(parent,Object.entries(p.traits||{}).map(([k,v])=>domain.label(k)+' '+v).join(' · '));
      line(parent,'Ability / potential · '+Object.entries(p.aptitudes||{}).map(([k,v])=>domain.label(k)+' '+v+'/'+p.bounds?.[k]?.max).join(' · '));
    }
    function applicantList(w,s){
      const list=domain.applications(w,s),visible=new Set(list.map(a=>a.identity));
      appFold.querySelector('summary').textContent='Regional applications ('+list.length+')';empty.hidden=list.length>0;
      for(const [key,row] of applicationRows){
        if(!visible.has(key)){row.panel.remove();applicationRows.delete(key);}
      }
      for(const a of list){
        let row=applicationRows.get(a.identity);
        if(!row){
          const p=a.profile,panel=fold(appList,p.name+' · '+p.originRole),afford=element('p'),decision=element('p'),applicant=element('p');
          line(panel,'Visiting from '+a.origin+'.');dossier(panel,p);
          for(const item of a.evidence)line(panel,item);
          if(!a.evidence.length)line(panel,'The home register includes no recent work reference or named testimony.');
          row={panel,afford,decision,applicant,quote:null};
          row.accept=button('Accept regional application',()=>sign(row.quote,row.accept));
          panel.append(afford,applicant,decision,row.accept);applicationRows.set(a.identity,row);
        }
        const terms=a.housing?.kind==='finance'?' Pay for the plot and three stages of construction. Remain a visitor until the home is habitable.':
          a.housing?.seller?' Purchase the listed private deed.':a.housing?.kind==='owned'?' The funded home is ready to occupy.':'';
        row.afford.textContent='Personal funds '+a.balance+'. '+(a.housing?(a.housing.available?'Housing offer · '+a.housing.price+' funds for '+a.housing.label+'.'+terms:a.housing.reason):'The host will review available places.');
        row.applicant.textContent=a.fit.personalYes?'The applicant is willing to stay.':'The applicant prefers to return home under present conditions.';
        row.decision.textContent=a.fit.localYes?'The host supports admission.':a.fit.concerned?.length?'The host is reviewing household objections.':'The host has yet to agree a place and a role.';
        row.quote={actor:root.EarthAgency.actorId(sim.active()),route:'regional',site:s.id,generation:s.foundingRevision||0,week:w.week,id:a.id,identity:a.identity,terms:a.terms};
        row.accept.disabled=busy||!domain.authorised(w,s)||!a.fit.localYes||!a.fit.personalYes||a.housing?.available===false;
      }
    }
    function offers(){
      const w=sim.state,s=current();if(!s)return;
      const capacity=root.EarthCityModel.housingCapacity(s),blocked=domain.recruitmentBlock(w,s),actor=root.EarthAgency.actorId(sim.active());
      const stamp=[actor,s.id,s.foundingRevision,w.week,w.actionRevision,w.workRevision,w.productionSerial,s.population,capacity,w.widerEarth?.serial].join('/');
      if(stamp!==quoteStamp||w!==quotedWorld){
        blind={...domain.quote(w,s,'random',{}),actor};quoteStamp=stamp;quotedWorld=w;
        rosterFull=!root.EarthCommunityLife.freeGuestSlot(s);
      }
      search={...domain.quote(w,s,'targeted',criteria,blind.unhoused),actor};
      summary.textContent=s.name+' · '+s.population+' residents, '+capacity+' completed places. Community treasury · '+s.funds+' funds.';
      const review=s.communityLife?.townCentre?.review;
      policy.hidden=!review;
      if(review)policy.textContent='Council review, week '+review.week+' · '+({targeted:'Commissioned a search.',random:'Issued an open invitation.',deferred:'Deferred an invitation.'}[review.route])+' '+review.reason;
      const reason=blocked||(rosterFull?'Every street roster place is in use. A place must open before another person can join.':'');
      blindText.textContent='Invite one person to '+s.name+' before meeting them. Free of charge. Projected housing deficit after arrival: '+blind.unhoused+'.'+(reason?' '+reason:'');
      blindCommit.disabled=busy||!!reason;
      homeRegister.hidden=s.id===w.communityLife?.homeId;
      if(!homeRegister.hidden){
        const name=Array.from(place.options).find(o=>o.value===w.communityLife.homeId)?.textContent;
        homeRegister.textContent='Open '+name+' recruitment';
      }
      cost.textContent=(search.ok?'Search fee from '+s.name+'’s community treasury: '+search.price+' funds. Balance after payment: '+
        (s.funds>=search.price?(s.funds-search.price)+' funds.':'insufficient funds ('+(search.price-s.funds)+' more needed).')+
        ' Projected housing deficit: '+search.unhoused+'.':search.message)+(reason?' '+reason:'');
      paidCommit.disabled=busy||!!reason||!search.ok||s.funds<search.price;
    }
    function arrivals(s){
      const rows=s.communityLife?.townCentre?.arrivals||[],visible=new Set(rows.map(r=>r.person));
      arrivalTitle.hidden=!rows.length;
      for(const [id,block] of arrivalRows){
        if(!visible.has(id)){block.remove();arrivalRows.delete(id);}
      }
      let previous=arrivalTitle;
      for(const row of rows){
        let block=arrivalRows.get(row.person);
        if(!block){
          block=fold(history,row.name+' · week '+row.week);arrivalRows.set(row.person,block);
          line(block,row.route==='random'?'Open invitation · free.':'Targeted search · '+row.price+' public funds paid.');
          if(row.route==='targeted')line(block,'Verified search criteria · '+Object.entries(row.criteria).map(([k,[min,max]])=>domain.label(k)+' '+min+'–'+max).join(' · '));
          const p=s.communityLife.people[row.id]?.profile;
          if(p?.identityKey===row.person)dossier(block,p);
        }
        if(previous.nextElementSibling!==block)previous.after(block);
        previous=block;
      }
    }
    function refresh(force=false){
      if(!host.open||host.closest('[hidden]'))return;
      const w=sim.state,s=current();if(!s){body.hidden=true;return;}body.hidden=false;
      const towns=[...w.sites,...(w.communityLife?.outposts||[])];
      const keys=towns.map(t=>t.id+'|'+t.name).join('/');
      if(keys!==districts){place.replaceChildren(...towns.map(t=>option(t.id,t.name)));districts=keys;}
      if(selected!==s.id){selected=s.id;criteria={};renderRanges();status.textContent='';}
      place.value=selected;
      showDiplomacy(w,towns,s);offers();
      const ledger=s.communityLife?.townCentre;
      if(force||lastWorld!==w||lastLedger!==ledger?.serial||lastWeek!==w.week||expected!==s.id){
        arrivals(s);lastWorld=w;lastLedger=ledger?.serial;lastWeek=w.week;expected=s.id;
      }
      if(appFold.open)applicantList(w,s);
    }
    async function sign(q,trigger){
      if(busy||!q?.site||!host.open)return;
      busy=true;trigger.after(status);
      offers();
      try{
        const result=await sim.perform('communityLife',{...q,action:'townCentre'});
        status.textContent=result.message;onResult?.(result);
      }catch{status.textContent='The recruitment decision could not be saved. Reopen the register before retrying.';}
      finally{busy=false;refresh(true);}
    }
    appFold.addEventListener('toggle',()=>{if(appFold.open)applicantList(sim.state,current());});
    host.addEventListener('toggle',()=>refresh(true));
    place.addEventListener('change',()=>{selected=place.value;status.textContent='';criteria={};renderRanges();refresh(true);});
    if(openBase)body.append(button('Open military base',()=>openBase(selected)));
    function open(siteId){
      const next=siteId||sim.active()?.id||'';
      if(next!==selected){criteria={};status.textContent='';renderRanges();}
      selected=next;if(!host.open)host.showModal();refresh(true);
    }
    return {open,refresh};
  }
  root.EarthTownCentreUI=Object.freeze({mount});
})(typeof window==='undefined'?globalThis:window);
