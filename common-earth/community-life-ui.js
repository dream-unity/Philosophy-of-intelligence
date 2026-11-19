(function(root){
  'use strict';
  function mount(host,{sim,getStreet,atVenue,meet,playAs,arrive,watchTown,refresh,notify}){
    if(!host||!root.EarthCommunityLife)return null;
    const doc=host.ownerDocument;
    let key='',timer=0,busy=false,lastResult='',resultWeek=0,resultSite='',destinationId='';
    function resultText(message){lastResult=message;resultWeek=sim.state.week;resultSite=sim.active()?.id||'';}
    const path=root.EarthDistrictPath?.mount(doc.getElementById('district-crossing'),sim,choice=>choice==='cancel'?command('cancel'):command('routeChoice',choice),id=>command('arrive',id));
    function el(tag,content,css){
      const n=doc.createElement(tag);if(css)n.className=css;if(content)n.textContent=content;return n;
    }
    function btn(text,click,title){
      const n=el('button',text);n.type='button';n.addEventListener('click',click);if(title)n.title=title;return n;
    }
    function issue(message){resultText(message);notify?.(message,true);key='';render();}
    async function command(action,target,proof){
      const site=sim.active(),actor=root.EarthAgency.actorId(site);
      if(busy||!site)return;
      busy=true;
      try{
        const result=await sim.perform('communityLife',{action,target,site:site.id,actor,week:sim.state.week},proof);
        resultText(result.message||'');
        if(result.arrived)arrive(sim.active(),result.vehicle);
        else if(result.ok)refresh();
        notify?.(lastResult,!result.ok);key='';render();
      }finally{busy=false;}
    }
    function station(action,target,ref,label){
      const site=sim.active(),local=getStreet(),actor=root.EarthAgency.actorId(site),week=sim.state.week;
      if(!local||actor!=='steward')return issue('Return to your original character before making this decision.');
      if(action==='walkTrail'&&local.getState().vehicle==='van'){
        local.cancelTravel();
        return command('driveTrail',target,()=>local.getState());
      }
      if(local.getState().mode==='drive'&&local.getState().vehicle!=='truck')local.toggleVehicle();
      if(local.getState().mode!=='walk')return issue('Return the vehicle or come ashore before this visit.');
      const weekHere=()=>sim.active()?.id===site.id&&root.EarthAgency.actorId(sim.active())===actor&&sim.state.week===week&&getStreet()===local;
      const isPerson=ref.type==='resident'||ref.type==='npc',id=ref.residentId||ref.npcId||ref.type;
      const proof=()=>{
        if(!weekHere())return null;
        return local.meeting(ref,true);
      };
      const reached=()=>{if(weekHere()&&proof())command(action,target,proof);};
      if(isPerson)meet(ref,label,reached);else atVenue(ref,label,reached);
    }
    function row(title,detail){const box=el('article',null,'district-row');box.append(el('strong',title),el('p',detail));return box;}
    function buttons(box,...items){const nav=el('div',null,'district-options');nav.append(...items);box.append(nav);}
    function onRoute(v){
      if(path){path.show();return;}
      const journey=v.journey,trip=el('div',null,'district-journey'),title=el('strong','On the path to '+journey.targetName),track=el('div',null,'district-track'),walker=el('span',v.original.name);
      track.append(walker);track.style.setProperty('--crossing-time',(journey.finish-journey.start)+'ms');
      track.style.setProperty('--crossing-elapsed',-Math.min(journey.finish-journey.start,Math.max(0,Date.now()-journey.start))+'ms');
      trip.append(title,el('p',v.region+' · '+journey.km.toFixed(1)+' km · '+journey.targetName),track);
      if(Date.now()>=journey.finish)buttons(trip,btn('Enter '+journey.targetName,()=>command('arrive',journey.to)),btn('Turn back',()=>command('cancel')));
      else{
        buttons(trip,btn('Turn back',()=>command('cancel')));
        clearTimeout(timer);
        timer=setTimeout(()=>{
          timer=0;
          if(!doc.hidden&&sim.state.communityLife?.journey?.start===journey.start)command('arrive',journey.to);
        },Math.max(30,journey.finish-Date.now()+35));
      }
      host.append(trip);
    }
    function appendHouseholds(box,h){
      if(!h?.newcomers&&!h?.completed?.length)return;
      const pending=h.waiting?' '+h.waiting+' still considering a guide.':'';
      box.append(el('p',h.newcomers+' recent arrival'+(h.newcomers===1?'':'s')+'. '+h.capacity+' shared meeting'+(h.capacity===1?'':'s')+' can fit into a week.'+pending));
      for(const pair of h.active)box.append(el('p',pair.guideName+' walked the pantry route with '+pair.entrantName+'. They are arranging a workplace introduction.'));
      for(const pair of h.completed.slice(-2))box.append(el('p',pair.entrantName+' finished both shifts with '+pair.guideName+' and can now guide a new arrival.'));
    }
    function destinations(v,site){
      if(!v.neighbours.length)return;
      const box=el('section',null,'district-destinations'),label=el('label','Nearby communities'),select=el('select'),facts=el('p'),actions=el('div',null,'district-options');
      label.htmlFor=select.id='district-destination';
      for(const place of v.neighbours){
        const option=el('option',place.name+(place.home?' · home':'')+' · '+place.distance.toFixed(1)+' km');
        option.value=place.id;select.append(option);
      }
      if(!v.neighbours.some(n=>n.id===destinationId))destinationId=v.neighbours[0].id;
      select.value=destinationId;
      const detail=el('details'),heading=el('summary','People, work and district stores');
      detail.append(heading);
      function showDistrict(){
        destinationId=select.value;
        const n=v.neighbours.find(n=>n.id===destinationId),target=[...sim.state.sites,...sim.state.communityLife.outposts].find(s=>s.id===destinationId);
        if(!target||!n)return;
        const m=root.EarthCommunityLife.districtProfile(sim.state,target);
        actions.replaceChildren();
        if(watchTown)actions.append(btn('See streets',()=>watchTown(n.id),'See '+n.name+' while your character stays in '+site.name+'.'));
        const gate=root.EarthCommunityLife.entryRestriction(sim.state,target);
        if(v.viewId==='steward'){
          if(gate){
            const request=btn('Request a hosted visit',()=>station('requestEntry',n.id,{type:'market'},'the exchange desk'));
            request.disabled=gate.pending||!gate.host.id;actions.append(request);
          }else actions.append(btn((getStreet()?.getState()?.vehicle==='van'?'Drive there':n.distance>70?'Take transport':site.water?'Cross by boat':'Walk there'),()=>station('walkTrail',n.id,{type:'market'},'the exchange path'),'Travel to '+n.name+'.'));
        }
        const character=root.EarthCommunityLife.communityCharacter(target);
        facts.textContent=character.summary+'. '+m.population+' residents · '+m.freeBeds+' open housing places. '+m.works;
        detail.replaceChildren(heading,el('p',n.host+' is looking for help '+n.need+'. Residents value '+n.lifestyle+'.'),
          el('p',character.detail),el('p',m.food+' food · '+m.materials+' materials · '+m.funds+' town funds.'));
        if(gate)facts.textContent+=' '+gate.reason;
        if(m.pressure)detail.append(el('p',m.pressure+'. Households weigh these conditions against their local ties.'));
        appendHouseholds(detail,m.households);
        if(m.trade)detail.append(el('p',m.trade));
        detail.append(el('p',m.census.summary));
        if(m.origins.length>1)detail.append(el('p','Where households here began · '+m.origins.map(r=>r.label+' ('+r.count+')').join(', ')+'.'));
        if(m.occupations.length)detail.append(el('p','Work among residents here · '+m.occupations.map(r=>r.label+' ('+r.count+')').join(', ')+'.'));
      }
      select.addEventListener('change',showDistrict);box.append(label,select,actions,facts,detail);host.append(box);showDistrict();
    }
    function render(){
      const site=sim.active(),state=sim.state,c=state.communityLife;
      if(!site||!c||!c.journey)path?.hide();
      if(!site||!c||host.hidden)return;
      if(lastResult&&(resultWeek!==state.week||resultSite!==site.id))lastResult='';
      const stamp=[getStreet()?.getState()?.vehicle,site.id,state.week,state.actionRevision,root.EarthAgency.actorId(site),Boolean(c.journey&&Date.now()>=c.journey.finish),lastResult].join('|');
      if(stamp===key)return;
      key=stamp;
      const v=root.EarthCommunityLife.view(state,site);
      host.replaceChildren();
      if(!v.journey)destinations(v,site);
      const summary=el('div',null,'district-summary');
      summary.append(el('strong',v.original.name+' · '+(v.member?'at home':'visiting')),el('p','Home in '+v.home+'. '+v.atHomeText));
      if(v.census)summary.append(el('p',v.census.summary));
      appendHouseholds(summary,v.households);
      host.append(summary);
      if(lastResult){const result=el('p',lastResult,'district-result');result.setAttribute('role','status');host.append(result);}
      if(v.journey){onRoute(v);return;}
      if(v.viewId!=='steward'){
        buttons(summary,btn('Return to '+v.original.name,async()=>{await playAs('steward');key='';render();}));
        summary.append(el('p','You are experiencing another resident’s day. Membership decisions and your pantry round belong to '+v.original.name+'.'));
      }
      const asSelf=v.viewId==='steward',market={type:'market'};
      if(v.atRota&&asSelf&&!v.original.attended&&!v.original.coveredBy){
        const duty=btn('Make my pantry round',()=>station('round',null,market,'the home exchange'));
        const helper=site.residents.find(p=>p.id===v.canCover&&!p.promise);
        buttons(summary,duty,...(helper?[btn('Ask '+helper.name+' to cover',()=>station('cover',helper.id,{type:'resident',residentId:helper.id},helper.name))]:[]));
      }
      if(v.hearing){
        const h=v.hearing,box=row('Membership meeting · '+h.name,h.detail+' The council hears the matter in week '+h.due+'.');
        const participants=[{id:h.id,name:h.name},...h.witnesses];
        for(const person of participants){
          const heard=h.heard.includes(person.id);
          if(heard)box.append(el('p',person.name+' has been heard.'));
          else if(asSelf&&v.member){
            const ref=person.id==='steward'?market:site.residents.some(r=>r.id===person.id)?{type:'resident',residentId:person.id}:{type:'npc',npcId:person.id};
            buttons(box,btn(person.id==='steward'?'Give my account at the exchange':'Hear '+person.name,()=>station('hearResident',person.id,ref,person.id==='steward'?'the exchange':person.name)));
          }
        }
        host.append(box);
      }
      if(v.parcel){
        const p=v.parcel,box=row('Carrying a promise for '+p.name,p.amount+' '+p.good+' from '+p.source+' · Due in week '+p.due+' at '+p.place+'.');
        if(asSelf&&site.id===p.to)buttons(box,btn('Bring the parcel to '+p.name,()=>station('deliver',p.id,{type:'resident',residentId:p.id},p.name)));
        if(asSelf&&site.id===p.from)buttons(box,btn('Return these supplies',()=>station('unpack',null,market,'the exchange')));
        host.append(box);
      }else if(v.member&&asSelf){
        for(const p of v.promises){
          const box=row('Your promise to '+p.name,p.place+' expects '+p.amount+' '+p.good+' by week '+p.due+'. Local meals and outstanding promises are kept in reserve.');
          buttons(box,btn('Collect '+p.amount+' '+p.good,()=>station('pack',p.id,market,'the exchange')));host.append(box);
        }
      }
      if(v.admission){
        const a=v.admission,box=row('Membership in '+v.region,a.host+' considers your application with local residents.');
        const list=el('ul',null,'district-checks');
        for(const c of a.checks)list.append(el('li',(c.pass?'Met · ':'Needed · ')+c.detail));
        box.append(list);
        if(a.employer)box.append(el('p',a.employer.name+' has an opening after '+a.employer.former+' left. Your qualification fits the vacancy. The employer conducts its own interview.'));
        if(asSelf){
          const hostRef=a.hostType==='resident'?{type:'resident',residentId:a.hostId}:{type:'npc',npcId:a.hostId},met=a.checks[0].pass;
          if(!met&&a.hostId)buttons(box,btn('Meet '+a.host,()=>station('meet',null,hostRef,a.host)));
          else if(met&&a.needsTrial)buttons(box,btn('Work the trial shift',()=>station('help',null,market,'the exchange')));
          const apply=btn('Ask to join',()=>station('apply',null,hostRef,a.host));
          apply.disabled=!a.available;
          const group=btn('Ask to move together',()=>station('moveGroup',null,hostRef,a.host));
          group.disabled=!a.available;
          buttons(box,apply,group);
          if(v.companions.length){
            const answers=el('details');answers.append(el('summary','Households considering a group move'));
            for(const person of v.companions)answers.append(el('p',person.name+' · '+person.reason));
            box.append(answers);
          }
        }
        host.append(box);
      }
      for(const visitor of v.visitors){
        const box=row(visitor.name+' · '+visitor.role,'Visiting until week '+visitor.inspects+'. '+(visitor.welcomed?'A household introduction is on the record.':'They are inspecting the exchange and housing.'));
        if(visitor.motive)box.append(el('p',visitor.motive));
        if(asSelf&&v.member&&!visitor.welcomed)buttons(box,btn('Welcome '+visitor.name,()=>station('welcome',visitor.id,{type:'npc',npcId:visitor.id},visitor.name)));
        host.append(box);
      }
      if(v.member){
        const choices=el('details'),summary=el('summary','Residents considering a move');choices.append(summary);
        choices.addEventListener('toggle',()=>{
          if(!choices.open||choices.childElementCount>1)return;
          for(const person of root.EarthCommunityLife.movingOptions(sim.state,site)){
            const box=row(person.name+' · '+person.role,person.considered||person.reason);
            if(asSelf&&person.eligible){
              const ref=site.residents.some(p=>p.id===person.id)?{type:'resident',residentId:person.id}:{type:'npc',npcId:person.id};
              buttons(box,btn('Ask about visiting '+person.place,()=>station('suggestVisit',person.id,ref,person.name)));
            }
            choices.append(box);
          }
        });
        host.append(choices);
      }
      const history=el('details'),label=el('summary','Membership record');history.append(label);
      history.append(el('p','Your original character’s reliability is '+v.original.reliability+'. Each pantry round can strengthen or weaken trust at home.'));
      if(v.lastHearing)history.append(el('p','Week '+v.lastHearing.week+' · '+v.lastHearing.text));
      if(v.purseSites.length)history.append(el('p','Local wage accounts · '+v.purseSites.map(p=>p.name+' '+p.balance).join(', ')+'.'));
      for(const vacancy of v.vacancies)history.append(el('p',vacancy.name+'’s former rota is one '+vacancy.good+' short per week through week '+vacancy.through+'.'));
      for(const entry of v.log)history.append(el('p','Week '+entry.week+' · '+entry.text));
      host.append(history);
    }
    doc.addEventListener('visibilitychange',()=>{if(!doc.hidden){key='';render();}});
    return {render,pantry(action,target){
      if(action==='round')station('round',null,{type:'market'},'the pantry exchange');
      else if(action==='cover'){
        const helper=sim.active()?.residents.find(p=>p.id===target);
        if(helper)station('cover',helper.id,{type:'resident',residentId:helper.id},helper.name);
      }
    },travelTo(id){
      const neighbour=root.EarthCommunityLife.neighbours(sim.state,sim.active()).find(n=>n.id===id);
      if(!neighbour){issue('Open the origin district to reach that path.');return;}
      station('walkTrail',id,{type:'market'},'the exchange path');
    },close(){key='';},invalidate(){clearTimeout(timer);timer=0;key='';lastResult='';path?.hide();}};
  }
  root.EarthCommunityLifeUI=Object.freeze({mount});
})(typeof window==='undefined'?globalThis:window);
