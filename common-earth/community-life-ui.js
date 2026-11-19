(function(root){
  'use strict';
  function mount(host,{sim,getStreet,atVenue,meet,playAs,arrive,refresh,notify}){
    if(!host||!root.EarthCommunityLife)return null;
    const doc=host.ownerDocument;
    let key='',timer=0,busy=false,lastResult='',resultWeek=0,resultSite='';
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
        if(result.arrived)arrive(sim.active());
        else if(result.ok)refresh();
        notify?.(lastResult,!result.ok);key='';render();
      }finally{busy=false;}
    }
    function station(action,target,ref,label){
      const site=sim.active(),local=getStreet(),actor=root.EarthAgency.actorId(site),week=sim.state.week;
      if(!local||actor!=='steward')return issue('Return to your original character before making this decision.');
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
    function render(){
      const site=sim.active(),state=sim.state,c=state.communityLife;
      if(!site||!c||!c.journey)path?.hide();
      if(!site||!c||host.hidden)return;
      if(lastResult&&(resultWeek!==state.week||resultSite!==site.id))lastResult='';
      const stamp=[site.id,state.week,state.actionRevision,root.EarthAgency.actorId(site),Boolean(c.journey&&Date.now()>=c.journey.finish),lastResult].join('|');
      if(stamp===key)return;
      key=stamp;
      const v=root.EarthCommunityLife.view(state,site);
      host.replaceChildren();
      const summary=el('div',null,'district-summary');
      summary.append(el('strong',v.original.name+' · '+(v.member?'at home':'visiting')),el('p','Home in '+v.home+'. '+v.atHomeText));
      if(v.census)summary.append(el('p',v.census.summary));
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
          if(!met)buttons(box,btn('Meet '+a.host,()=>station('meet',null,hostRef,a.host)));
          else if(!a.checks[1].pass||a.apprentice&&!a.checks.at(-1).pass)buttons(box,btn('Work the trial shift · 1 effort',()=>station('help',null,market,'the exchange')));
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
        if(asSelf&&v.member&&!visitor.welcomed)buttons(box,btn('Welcome '+visitor.name,()=>station('welcome',visitor.id,{type:'npc',npcId:visitor.id},visitor.name)));
        host.append(box);
      }
      host.append(el('h4','Paths from '+v.region));
      for(const n of v.neighbours){
        const box=row(n.name+(n.home?' · home':''),n.distance.toFixed(1)+' km · '+n.lifestyle+'. '+n.host+' is looking for help '+n.need+'.');
        if(asSelf)buttons(box,btn((n.distance>70?'Take transport to ':site.water?'Cross to ':'Walk to ')+n.name,()=>station('walkTrail',n.id,market,'the exchange path')));
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
      if(v.purseSites.length)history.append(el('p','Local wage accounts · '+v.purseSites.map(p=>p.name+' '+p.balance).join(', ')+'.'));
      for(const vacancy of v.vacancies)history.append(el('p',vacancy.name+'’s former rota is one '+vacancy.good+' short per week through week '+vacancy.through+'.'));
      for(const entry of v.log)history.append(el('p','Week '+entry.week+' · '+entry.text));
      host.append(history);
    }
    doc.addEventListener('visibilitychange',()=>{if(!doc.hidden){key='';render();}});
    return {render,travelTo(id){
      const neighbour=root.EarthCommunityLife.neighbours(sim.state,sim.active()).find(n=>n.id===id);
      if(!neighbour){issue('Open the origin district to reach that path.');return;}
      station('walkTrail',id,{type:'market'},'the exchange path');
    },close(){key='';},invalidate(){clearTimeout(timer);timer=0;key='';lastResult='';path?.hide();}};
  }
  root.EarthCommunityLifeUI=Object.freeze({mount});
})(typeof window==='undefined'?globalThis:window);
