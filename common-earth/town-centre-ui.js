(function(root){
  'use strict';
  function mount({sim,inspected,focusPlot,focusPerson}){
    const doc=root.document,$=id=>doc.getElementById(id),control=$('ribbon-population'),sheet=$('town-centre-dialog');
    if(!control||!sheet)return null;
    const H=root.EarthHousing,C=root.EarthTownCentre,B=root.EarthBorders,life=root.EarthCommunityLife;
    const content=$('town-centre-body'),heading=$('town-centre-title'),status=$('town-centre-status'),tablist=$('town-centre-tabs');
    const elem=(tag,text,cls)=>{const e=doc.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
    const button=(text,fn)=>{const b=elem('button',text);b.type='button';b.addEventListener('click',fn);return b;};
    const para=(e,t)=>e.append(elem('p',t));
    const towns=()=>[...sim.state.sites,...sim.state.communityLife?.outposts||[]];
    let selected='',tab='housing',filter=false,selectedPerson='',signature='',pending=false,lastReceipt='',terms={};
    const town=()=>towns().find(s=>s.id===selected);
    function show(next,section='housing',person=''){
      if(!next?.housing)return;
      selected=next.id;tab=section;selectedPerson=person;filter=false;lastReceipt='';terms={};signature='';
      if(!sheet.open)sheet.showModal();draw(true);
    }
    function entry(parent,title,detail,actions=[]){
      const row=elem('article',null,'town-row'),description=elem('div');
      description.append(elem('strong',title));if(detail)description.append(elem('small',detail));
      row.append(description,...actions);parent.append(row);return row;
    }
    function map(s,t){
      sheet.close();focusPlot(s,H.position(s,t));
    }
    function people(s,target){
      const h=s.housing,homes=H.directory(s),byId=new Map(homes.map(t=>[t.id,t]));
      const check=elem('input');check.type='checkbox';check.checked=filter;
      const label=elem('label',null,'town-filter');label.append(check,doc.createTextNode(' Unhoused residents only'));target.append(label);
      check.addEventListener('change',()=>{filter=check.checked;draw(true);content.querySelector('.town-filter input')?.focus();});
      for(const [key,m] of Object.entries(h.members)){
        const t=byId.get(h.licences[key]);if(filter&&t)continue;
        const d=h.distress[key],p=root.EarthPersonas.profile(s,m.id),away=!life.present(s,m.id);
        const buttons=[button('Record',()=>{selectedPerson=m.id;tab='residents';draw(true);})];
        if(t)buttons.push(button('Show plot',()=>map(s,t)));
        else buttons.push(button('Town Centre',()=>{sheet.close();focusPlot(s,H.centre);}));
        entry(target,m.name,(away?'Away · ':'')+(t?H.label(t)+' · '+t.ownerName:d?.reason||'Awaiting allocation')+
          (d?' · condition '+d.health+'/100':'')+(p?.originRole?' · '+p.originRole:''),buttons);
      }
      if(h.other)para(target,h.other+' household members in the earlier census · '+h.otherUnhoused+' without a place. Their names were not recorded in this save.');
      if(filter&&!Object.keys(h.distress).length&&!h.otherUnhoused)para(target,'Every resident has a dwelling with residential rights.');
    }
    function housing(s){
      const h=s.housing,summary=H.summary(s),census=life.census(sim.state,s),summaryRow=elem('div',null,'town-numbers');
      for(const [label,n] of [['Residents',s.population],['Completed places',summary.capacity],['Occupied',summary.occupied],['Unhoused',summary.unhoused],['Visitors',census.visitors]]){
        const cell=elem('div');cell.append(elem('strong',n),elem('span',label));summaryRow.append(cell);
      }
      content.append(summaryRow,elem('h3','Construction and reservations'));para(content,h.reason);
      if(h.project){
        const j=h.project;entry(content,H.label(j),[j.phase==='delivery'?'Delivery pending':'Under construction',j.name+' · builder',
          j.materials+' materials committed',j.wage+' funds reserved',j.kind==='house'?'2 future places':'Retail frontage',
          j.reservedFor?'Reserved for '+j.ownerName:'Council title'].join(' · '),[button('Show worksite',()=>map(s,j))]);
      }
      for(const f of s.growth?.households||[])if(f.build)entry(content,f.name+' · '+(f.build.shop?'Shop frontage':f.build.extension),'Private contract · 2 materials reserved',[button('Show worksite',()=>{sheet.close();focusPlot(s,f.build.shop?root.EarthDistrictGrowth.shopPoint(s,f.build.lot):root.EarthDistrictGrowth.homePoint(s,f.plot));})]);
      for(const p of s.privateHomes||[])if(p.stage<3)entry(content,'Courtyard '+(p.plot+1),'Privately reserved · stage '+p.stage+' of 3 · 2 future places',[button('Show plot',()=>map(s,{kind:'courtyard',plot:p.plot}))]);
      content.append(elem('h3','Residents and dwellings'));people(s,content);
      content.append(elem('h3','Vacancies and property rights'));
      const vacancies=H.directory(s).filter(t=>t.vacant>0);
      if(!vacancies.length)para(content,'No vacant completed places.');
      for(const t of vacancies)entry(content,H.label(t),t.vacant+' vacant · '+t.ownerName+(t.owner==='council'||t.shared?' · accepting residents':' · private consent required'),[button('Show plot',()=>map(s,t))]);
      const recent=elem('details');recent.append(elem('summary','Town Centre decisions'));
      for(const event of h.history)para(recent,'Week '+event.week+' · '+event.text);
      content.append(recent);
    }
    function record(s){
      const members=Object.values(s.housing.members);if(!members.length){para(content,'No named residents are on this roll.');return;}
      if(!members.some(m=>m.id===selectedPerson))selectedPerson=members[0].id;
      const field=elem('select'),label=elem('label','Resident');label.append(field);content.append(label);
      for(const m of members)field.append(new Option(m.name,m.id));
      field.value=selectedPerson;field.onchange=()=>{selectedPerson=field.value;draw(true);};
      const m=members.find(m=>m.id===selectedPerson),p=root.EarthPersonas.profile(s,m.id);if(!p)return;
      const data=C.ledger(s,p),away=!life.present(s,p.id);
      entry(content,p.name,p.originRole+' · '+(p.birthCommunityName||s.name),away?[]:[button('Follow resident',()=>{sheet.close();focusPerson(s,p.id);})]);
      para(content,p.description);
      for(const [label,value] of [['Reliability',data.reliability==null?'Insufficient work evidence':data.reliability+'/100'],['Local work',data.completed+' development points'],['Demonstrated abilities',data.leading],['Learning rate',data.learning+'/100'],['Potential',data.potential+'/100'],['Reputation among contacts',data.reputation==null?'No recorded assessment':data.reputation+'/100'],['Personal funds',s.purses?.people?.[p.id]?.balance||0],['Documented history',data.record]])entry(content,label,value);
      for(const e of data.history)para(content,e);
      const g=s.communityLife.people[p.id];if(g?.sponsorName)para(content,g.sponsorName+' signed this resident’s introduction.');
      const promise=s.residents.find(r=>r.id===p.id)?.promise;if(promise)para(content,'A promise is due in week '+promise.dueWeek+'.');
      const intent=root.EarthAutonomy?.view(s,sim.state,p.id);if(intent){para(content,intent.reason);if(intent.dream)para(content,intent.dream.title+' · '+intent.dream.next);}
    }
    function profile(s){
      const w=sim.state,home=towns().find(t=>t.id===w.communityLife.homeId),a=B.assessment(w,s,w.communityLife.profile,home);
      content.append(elem('h3',a.type));para(content,a.detail);
      entry(content,B.customs[a.custom],a.outcome);
      entry(content,'Trust in '+w.communityLife.profile.name,a.personal+'/100 · '+a.personalWhy);
      entry(content,'Trust in '+home.name,a.homeTrust+'/100 · '+a.homeWhy);
      if(s!==home&&sim.active()?.id===home.id){
        content.append(button('Request an introduction',()=>transact(home,{action:'introduction',to:s.id})));
      }
      content.append(elem('h3','Reputation outside town'));
      for(const other of towns().filter(t=>t!==s&&t.communityLife?.cluster===s.communityLife?.cluster)){
        const r=other.border?.reports[s.id];
        entry(content,other.name,r?r.score+'/100 · '+(r.trend>0?'rising':r.trend<0?'falling':'steady')+' · '+r.count+' received report(s) · '+(r.count>=4?'established':'limited')+' evidence. Week '+r.week+' · '+r.witness+' reported: '+r.last:'No report has reached this town.');
      }
      const j=s.border?.party;
      if(j){const to=towns().find(t=>t.id===j.to);entry(content,'Border war · '+(to?.name||j.to),j.crew.map(p=>p.name).join(' and ')+' · '+j.phase,
        [button('Find party',()=>{sheet.close();const geo=root.EarthRegionalWorld.geography(w,s),t=geo.towns.find(t=>t.site.id===s.id),[x,y]=j.path[j.index].split(',').map(Number);
          focusPlot(s,root.EarthRegionalRender.localPoint(t,x*.5,y*.5));})]);}
      for(const e of s.border?.events||[])entry(content,'Week '+e.week+' · '+e.actor,e.text+' Witness: '+e.witness+'. '+(e.official?'Council-authorised.':'Individual conduct.'));
    }
    async function transact(s,command){
      if(pending)return;
      pending=true;const w=sim.state,query={site:s.id,week:w.week,serial:w.townCentres.next,round:s.growth?.round||0,...command};
      try{const r=await sim.perform('townCentre',query);lastReceipt=r.message;
        if(r.ok&&r.personId){selectedPerson=r.personId;tab='residents';}}
      finally{pending=false;draw(true);}
    }
    function recruitment(s){
      const offered={site:s.id,round:s.growth?.round||0,week:sim.state.week,serial:sim.state.townCentres.next,deficit:H.summary(s).unhoused+Number(!H.accessible(s))};
      const submit=command=>transact(s,{...offered,...command});
      const w=sim.state,h=H.summary(s),can=life.isHome(w,s)&&sim.active()?.id===s.id&&root.EarthAgency.actorId(s)==='steward';
      const action=(label,fn,enabled=true)=>{const b=button(label,fn);b.disabled=!enabled||!can||pending;return b;};
      if(!can)para(content,'This council makes its own admission decisions. Its register is open for inspection.');
      content.append(elem('h3','Regional applications'));
      const apps=C.applications(w,s);
      if(!apps.length)para(content,'No current regional applications. Residents reconsider work, housing and ties each calendar week.');
      for(const a of apps){
        const row=entry(content,a.name+' · '+a.fromName,a.ledger.leading+' · '+a.savings+' personal funds · '+a.terms.price+' for housing. '+a.reason,
          [action('Accept application',()=>submit({action:'accept',application:a.number}),a.available)]);
        const facts=elem('details');facts.append(elem('summary','Application record'));
        para(facts,a.profile.description);para(facts,'Reliability '+(a.ledger.reliability??'unknown')+' · references '+(a.ledger.reputation??'unknown')+' · learning '+a.ledger.learning+' · potential '+a.ledger.potential);
        para(facts,a.ledger.record);for(const history of a.ledger.history)para(facts,history);row.append(facts);
      }
      const deficit=h.unhoused+Number(!H.accessible(s));
      content.append(elem('h3','Invite from wider Earth'));para(content,'Free invitation. You commit before seeing the person. Projected unhoused after admission: '+deficit+'.');
      content.append(action('Commit to a blind invitation',()=>submit({action:'blind',price:0})));
      content.append(elem('h3','Commission targeted recruitment'));
      para(content,'Choose a range from 0 to 100 for each criterion. A narrower range increases the price. The person retains their own work and migration choices.');
      const criteria=elem('div',null,'town-criteria'),quote=elem('strong'),order=action('Commission search',()=>submit({action:'targeted',criteria:terms,price:C.price(terms)}));
      const update=()=>{const cost=C.price(terms);quote.textContent=cost==null?'Check the selected ranges.':'Search fee '+cost+' · treasury '+s.funds+' · projected unhoused '+deficit;
        order.disabled=!can||pending||cost==null||s.funds<cost;};
      for(const [k,title] of Object.entries(C.fields)){
        const row=elem('div'),ch=elem('input'),lo=elem('input'),hi=elem('input'),lab=elem('label');
        ch.type='checkbox';ch.checked=!!terms[k];lab.append(ch,doc.createTextNode(' '+title));
        for(const [input,caption,value] of [[lo,'minimum',terms[k]?.[0]??50],[hi,'maximum',terms[k]?.[1]??100]]){
          input.type='number';input.min='0';input.max='100';input.step='1';input.value=value;input.setAttribute('aria-label',title+' '+caption);input.disabled=!ch.checked;
        }
        const change=()=>{lo.disabled=hi.disabled=!ch.checked;if(ch.checked)terms[k]=[lo.valueAsNumber,hi.valueAsNumber];else delete terms[k];update();};
        ch.onchange=change;lo.oninput=change;hi.oninput=change;row.append(lab,lo,elem('span','to'),hi);criteria.append(row);
      }
      const spec=elem('details');spec.open=Object.keys(terms).length>0;spec.append(elem('summary','Personality, abilities and references'),criteria);
      content.append(spec,quote,order);update();
    }
    function draw(force=false){
      if(!sheet.open)return;
      const s=town();if(!s?.housing){sheet.close();return;}
      const w=sim.state,stamp=[selected,tab,selectedPerson,filter,w.week,w.actionRevision,w.productionSerial,w.workRevision,lastReceipt].join('/');
      if(stamp===signature&&!force)return;
      // Keep a focused number field, open disclosure or text selection intact
      // while the autonomous world advances. The command checks the latest quote.
      if(!force&&tab==='recruitment'&&content.contains(doc.activeElement)&&['INPUT','SELECT'].includes(doc.activeElement.tagName))return;
      signature=stamp;const scroll=content.scrollTop;heading.textContent=s.name+' Town Centre';
      for(const b of tablist.children)b.setAttribute('aria-pressed',String(b.dataset.tab===tab));
      status.textContent=lastReceipt;content.replaceChildren();
      if(tab==='housing')housing(s);else if(tab==='residents')record(s);else if(tab==='recruitment')recruitment(s);else profile(s);
      content.scrollTop=force?0:scroll;
    }
    function refresh(){
      const s=inspected();control.hidden=!s?.housing;
      if(s?.housing){const h=H.summary(s),label=s.name+' · '+s.population+'/'+h.capacity+' · '+h.unhoused+' unhoused';
        if(control.textContent!==label)control.textContent=label;control.setAttribute('aria-label','Population and housing in '+label);}
      draw();
    }
    for(const [k,title] of [['housing','Housing'],['residents','Resident records'],['recruitment','Recruitment'],['reception','Entry and reputation']]){
      const b=button(title,()=>{tab=k;draw(true);});b.dataset.tab=k;tablist.append(b);
    }
    $('town-centre-close').onclick=()=>sheet.close();control.onclick=()=>show(inspected());
    sheet.addEventListener('close',()=>{signature='';});
    return {show,refresh};
  }
  root.EarthTownCentreUI={mount};
})(globalThis);
