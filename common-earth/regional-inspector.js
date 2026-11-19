/* Inspecting a point reads the same district the street draws. Only the explicit
   journey and proposal buttons can issue a command to the simulation. */
(function(root){
  'use strict';
  function mount({sim,street,watch,travel,returnStreet,refresh,ledger,buildingAction,openTownCentre,contextChanged}){
    const doc=root.document,id=key=>doc.getElementById(key),host=id('region-inspector');
    if(!host)return null;
    const detail=id('region-point-detail'),toggle=id('region-inspect-point');
    let selection=null,expanded=false,pending=false,lastStamp='',message='';
    const world=()=>sim.state;
    const town=key=>world().sites.find(s=>s.id===key)||world().communityLife?.outposts.find(s=>s.id===key);
    const activeTown=()=>selection?.siteId?town(selection.siteId):null;
    // Panning within a town changes terrain and coordinates on every frame.
    // The admissions register changes only when the simulation commits work.
    let entryCache=null;
    function communityEntry(w,site){
      const revision=[w.week,w.actionRevision,w.productionSerial,w.workRevision].join('/');
      if(entryCache?.world!==w||entryCache.site!==site||entryCache.revision!==revision){
        entryCache={world:w,site,revision,result:root.EarthCommunityLife.entryAssessment(w,site)};
      }
      return entryCache.result;
    }
    const element=(tag,text)=>{const el=doc.createElement(tag);el.textContent=text;return el;};
    function action(label,run,disabled=false){
      const b=element('button',label);b.type='button';b.disabled=disabled;b.addEventListener('click',run);detail.append(b);
    }
    function clear(){
      selection=null;expanded=false;message='';lastStamp='';entryCache=null;host.hidden=true;
      delete doc.body.dataset.regionRoaming;delete doc.body.dataset.regionDetail;
    }
    function redraw(){
      if(!selection||!sim.active())return;
      const local=sim.active(),view=activeTown(),event=selection,w=world(),region=root.EarthRegionalWorld;
      const anchor=root.EarthCommunityLife?.anchor(w),home=town(anchor?.homeId)||local;
      const base=town(event.originSiteId)||local;
      const inspectingOther=event.siteId!==base.id;
      const overlay=id('region-overlay')?.value;
      const chartId=town(overlay)?.id||home.id;
      const key=[event.kind,event.siteId,event.personId,event.assetId,event.activity?.label||event.activity?.activity||event.activity,
        event.choices?.map(c=>[c.kind,c.siteId,c.personId||c.assetId].join(':')).join(','),
        Math.round(event.x*20),Math.round(event.y*20),expanded,chartId,w.week,w.actionRevision,w.productionSerial,pending,message].join('/');
      if(key===lastStamp)return;
      lastStamp=key;
      if(!inspectingOther&&!event.picked){clear();return;}
      host.hidden=false;
      doc.body.toggleAttribute('data-region-roaming',inspectingOther);
      doc.body.toggleAttribute('data-region-detail',true);
      const read=event.inspection&&event.inspectedAtWeek===w.week&&event.inspectedRevision===w.actionRevision?event.inspection:expanded&&event.kind!=='building'?region?.inspect?.(w,base,event.x,event.y,chartId):null;
      id('region-anchor').textContent=(anchor?.name||'Original resident')+' · home in '+home.name;
      id('region-context-name').textContent=event.personName||event.assetName||view?.name||read?.label||event.terrain?.label||event.inspection?.label||'Open ground';
      toggle.textContent=expanded?'Hide details':event.kind==='resident'?'Inspect resident':event.kind==='building'?'Inspect building':event.kind==='asset'?'Inspect assignment':view?'Inspect community':'Inspect ground';
      toggle.setAttribute('aria-expanded',String(expanded));detail.hidden=!expanded;
      if(!expanded)return;
      const geo=region?.geography(w,base);
      detail.replaceChildren();
      const line=t=>{if(t)detail.append(element('p',t));};
      const heading=t=>detail.append(element('h4',t));
      if(event.choices?.length>1){
        const label=element('label','At this point'),field=doc.createElement('select');
        field.setAttribute('aria-label','Choose what to inspect at this point');
        event.choices.forEach((choice,index)=>{
          const name=choice.personName||choice.assetName||choice.activity?.label||choice.kind;
          const option=element('option',name+(choice.siteName?' · '+choice.siteName:''));
          option.value=String(index);option.selected=choice.siteId===event.siteId&&choice.kind===event.kind&&
            (choice.assetId?choice.assetId===event.assetId:choice.personId===event.personId);field.append(option);
        });
        field.addEventListener('change',()=>{
          const choice=event.choices[Number(field.value)];if(!choice||selection!==event)return;
          inspect({detail:{...event,personId:null,assetId:null,personName:'',assetName:'',inTransit:false,...choice,picked:true}});
          detail.querySelector('select')?.focus({preventScroll:true});
        });
        label.append(field);detail.append(label);
      }
      if(view&&event.kind==='resident'&&event.personId){
        const p=root.EarthPersonas.profile(view,event.personId);
        const goal=p&&root.EarthAutonomy?.view(view,w,event.personId);
        const work=p&&root.EarthDistrictGrowth?.goal(view,p)?.h;
        const order=p&&root.EarthDialogue?.workOrder?.(view,event.personId)?.order;
        const actual=typeof event.activity==='string'?event.activity:event.activity?.label||event.activity?.activity;
        line([p?.role||p?.originRole,actual||work?.last,goal?.reason].filter(Boolean).join(' · '));
        if(order?.reason&&order.reason!==actual)line(order.reason);
        if(goal?.dream)line(goal.dream.title+' · '+goal.dream.next);
        if(p){
          heading('Skills and work record');
          const career=view.careers?.[p.id],study=career?.training;
          const skills=Object.entries({...p.aptitudes,...p.demonstratedSkills,...career?.skills}).sort((a,b)=>b[1]-a[1]);
          for(const [axis,value] of skills.slice(0,2))line(axis+' · '+value+' now, potential '+(p.bounds?.[axis]?.max??value)+'.');
          if(study)line('Course record · '+study.credits+' credits. '+(study.paused?'Study is paused.':study.pace==='intensive'?'Two credits per study week.':'One credit per study week.'));
          else if(p.externalHistory)line('Recruitment assessment · '+p.externalHistory.learningRate+'/100 learning rate.');
          else line('No current course attendance to judge learning pace.');
          if(career?.history?.length)line('Week '+career.history[0].week+' · '+career.history[0].text);
          line('Current aggression '+root.EarthBorderConflict.force(view,p)+'/100'+(p.externalHistory?' · wider Earth reference '+p.externalHistory.aggression+'/100.':'.'));
          heading('Reliability and local testimony');
          if(p.externalHistory)line(p.externalHistory.origin+' reference · '+p.externalHistory.reliability+'/100 reliability and '+p.externalHistory.reputation+'/100 reputation. '+p.externalHistory.serviceYears+' years of work. '+p.externalHistory.record);
          const record=root.EarthCommunityLife.personalAccess(w,view,p);
          const opinions=record.voices;
          if(opinions.length)for(const voice of opinions.slice(0,3))line(voice.name+' · '+(voice.strength>0?'vouches for ':'has reservations about ')+p.name+' ('+voice.strength+' relationship).');
          else line('No named resident has recorded a strong opinion about this person.');
          if(record.service)line(record.service+' signed service or delivery records here.');
          const joined=view.communityLife?.people?.[p.id]?.since||0;
          const agreements=(view.agency?.arrangements?.rows||[]).filter(r=>r.actorId===p.id&&r.week>=joined&&['kept','missed'].includes(r.status));
          if(agreements.length){
            const kept=agreements.filter(r=>r.status==='kept').length;
            line('Local commitments · '+kept+' kept, '+(agreements.length-kept)+' missed.');
          }
          const conduct=(view.communityLife?.entryRecords||[]).find(r=>r.actorId===p.id&&r.actorName===p.name&&r.week>=joined&&r.kind==='removal');
          if(conduct)line('Week '+conduct.week+' · '+conduct.guestName+' reported a physical removal. '+(conduct.official?'The gate rota authorised it.':'The resident acted without the gate rota’s authority.'));
          if(root.EarthFleet?.identified(view,p.id))line('Dispatch identified '+p.name+' in the report of an unbooked truck. Their access is suspended.');
        }
        if(event.inTransit){
          const trip=event.activity;
          line(trip?.destination?'Destination · '+trip.destination+(Number.isFinite(trip.remainingKm)?' · '+trip.remainingKm.toFixed(1)+' km remaining':''):'Away on a regional journey.');
          line(trip?.detail);
          const loaded=Object.entries(trip?.cargo||{}).filter(([,n])=>n>0).map(([good,n])=>n+' '+good);
          if(loaded.length)line('Carrying '+loaded.join(' and ')+'.');
        }
        else if(view.id===local.id)action('Meet in the street',()=>{clear();returnStreet();doc.getElementById('street-stage').dispatchEvent(new CustomEvent('earthregionalmeet',{detail:{id:event.personId}}));});
        else if(p)action('Follow '+p.name,()=>{if(!street()?.inspectRegionalPerson?.(p.id,view.id))watch(view.id,{person:p.id});});
      }else if(view&&event.kind==='building'){
        line(event.activity);
        const owner=event.ownerId||(event.ownerKey&&root.EarthPersonas?.list(view).find(p=>(p.identityKey||p.id)===event.ownerKey)?.id);
        const localAction=(label,kind)=>action(label,()=>{clear();buildingAction(kind,event,owner);});
        if(view.id===local.id){
          if(owner&&owner!==root.EarthAgency?.actorId(view)&&root.EarthCommunityLife?.present(view,owner)!==false)
            localAction('Meet '+(root.EarthPersonas?.profile(view,owner)?.name||'the resident'),'meet');
          if(event.use==='home')localAction('Go to the door','door');
          if(event.use==='shop')localAction('Browse this shop','shop');
          if(event.use==='market'){localAction('Visit the exchange','market');localAction('Open the Town Centre','townCentre');}
          if(event.use==='project')localAction('Visit this project','project');
          if(event.use==='market'||event.use==='project')localAction('See available jobs','work');
        }else if(event.use==='market'&&openTownCentre)action('Inspect the Town Centre',()=>openTownCentre(view.id));
      }else if(event.kind==='asset'){
        const fleet=view&&event.assetId==='truck'&&root.EarthFleet?.assignment?.(w,view);
        line(typeof event.activity==='string'?event.activity:event.activity?.label);
        if(fleet){
          line([fleet.owner,fleet.operator?'Operator · '+fleet.operator:null,fleet.destination?'Destination · '+fleet.destination:null].filter(Boolean).join(' · '));
          line([fleet.reason,fleet.cargo,fleet.status].filter(Boolean).join(' · '));
        }
      }
      if(view){
        if(event.kind==='town'&&openTownCentre)action('Inspect the Town Centre',()=>openTownCentre(view.id));
        const march=geo?.towns.find(t=>{
          const c=t.site.communityLife?.border?.campaign;
          return c&&(t.site.id===view.id||c.against===view.id);
        });
        if(march)action('Observe the expedition',()=>{
          const party=root.EarthBorderConflict.actors(w,geo).find(a=>a.siteId===march.site.id);
          if(party){clear();street()?.inspectRegion?.(party.x,party.y,{zoom:1.5,picked:true});}
        });
        const border=view.communityLife?.border;
        if(border?.campaign){
          const c=border.campaign;
          line('Boundary war · '+c.attacker.name+' · '+c.phase+' · parcel '+c.cell+(c.defender?' · opposing resident '+c.defender.name:''));
        }
        if(border?.records?.length)line('Boundary record · '+border.records[0].text);
        line(view.era+' · '+view.population+' residents · '+view.food+' food · '+view.materials+' materials · '+view.funds+' public funds');
        if(event.kind==='town'&&w.communityLife){
          const entry=communityEntry(w,view);
          heading('Entry and local divisions');
          line(entry.character.type+'. '+entry.character.detail);
          const watch=entry.character.border;
          if(watch){
            line('Aggression '+watch.score+'/100 · '+watch.militant+' of '+watch.count+' residents strongly favour force · '+watch.opposed+' strongly oppose it.');
            line(watch.expansionist?watch.chair+' and the gate assembly authorise boundary expeditions by the watch.':watch.closed?
              watch.chair+' and the gate assembly authorise the watch to confront uninvited entries.':watch.chair+' receives disputes under the current entry articles.');
          }
          line(entry.rule.label+' · '+entry.rule.terms+' '+entry.host+' receives applications.');
          line(entry.history);
          if(entry.decision)line('Week '+entry.decision.week+' · '+entry.decision.host+' recorded the latest change in the entry articles.');
          if(view.id!==home.id){
            heading('Trust at arrival');
            line(anchor.name+' · '+entry.personal.score+'/100. '+entry.expected);
            const witnesses=entry.personal.voices;
            if(witnesses.length)line(witnesses.slice(0,3).map(v=>v.name+(v.strength>0?' vouches for you':' recalls a disagreement')).join('. ')+'.');
            if(!witnesses.length&&!entry.personal.visit?.met&&!entry.personal.service)line('No prior personal contact on file. The starting assessment is provisional.');
            if(entry.personal.visit?.met)line('Introduced in week '+entry.personal.visit.met+'.');
            if(entry.personal.service)line(entry.personal.service+' completed shifts or freight deliveries on record.');
            line(entry.originName+' · '+entry.originTrust+'/100. '+entry.fulfilled+' completed services, admissions or consignments. '+entry.values+(entry.passage?'':' Passage is disputed.'));
          }
          heading('What other communities report');
          if(!entry.reputation.length)line('No eyewitness report has reached a neighbouring community.');
          for(const r of entry.reputation)line(r.observer+' · '+r.score+'/100, '+r.trend+' · '+r.confidence+'. '+r.reason);
        }
        action('Development ledger',()=>ledger(view,event.personId));
        if(view.id!==local.id)action('Plan a visit',()=>{clear();returnStreet();travel(view.id);});
      }else if(read){
        line(read.summary);
        const known=region.known(w,base,chartId,event.x,event.y);
        line((town(chartId)?.name||home.name)+(known?' has surveyed this ground.':' has no survey of this ground.'));
        if(read.uses?.length)line('Recorded use · '+read.uses.map(u=>u.name+' ('+u.count+')').join(', '));
        if(read.knowledge?.length)line('First surveyed · '+read.knowledge.map(k=>k.name+' in week '+k.week).join(', '));
        const note=home.practice?.wayfinding?.[read.id];
        if(note)line(home.name+' has directions for this part of the route, filed in week '+note.week+'.');
        const point=geo?.locate(event.x,event.y);if(point)line(point.lat.toFixed(4)+'°, '+point.lon.toFixed(4)+'°');
        const choices=read.choices||[],reasons=new Set();
        for(const c of choices){
          const canPropose=local.id===home.id&&root.EarthAgency.actorId(local)==='steward';
          action(c.label,async()=>{
            if(pending||!geo||!doc.contains(detail)||selection!==event)return;
            pending=true;message='';redraw();
            try{
              const q={kind:c.kind,x:event.x,y:event.y,siteId:home.id,originId:geo.origin.id,week:w.week};
              const result=await sim.perform('regionalWork',q);
              if(selection===event)message=result.message;
              if(result.ok)refresh();
            }finally{pending=false;redraw();}
          },pending||!canPropose||!c.available);
          if(!c.available&&c.reason)reasons.add(c.reason);
        }
        for(const reason of reasons)line(reason);
        if(choices.length&&(local.id!==home.id||root.EarthAgency.actorId(local)!=='steward'))line('Your original resident can bring regional proposals to their home community.');
      }
      if(message)line(message);
    }
    function inspect(event){
      const d=event.detail;if(!d||!Number.isFinite(d.x)||!Number.isFinite(d.y))return;
      const prior=selection?.siteId,changed=!selection||selection.siteId!==d.siteId||selection.kind!==d.kind;
      if(!d.picked&&selection?.kind==='building'&&selection.siteId===d.siteId)return;
      if(!d.picked&&selection?.picked&&!changed&&Math.hypot(d.x-selection.x,d.y-selection.y)<.025)return;
      selection={...d,inspectedAtWeek:world().week,inspectedRevision:world().actionRevision};if(changed||d.picked){message='';expanded=!!d.picked;}
      redraw();if(prior!==selection?.siteId)contextChanged();
    }
    id('street-stage').addEventListener('earthregionalinspect',inspect);
    toggle.addEventListener('click',()=>{expanded=!expanded;redraw();});
    id('region-return').addEventListener('click',()=>{clear();returnStreet();contextChanged();});
    function inspectBuilding(building){
      const siteId=sim.active()?.id;if(siteId)inspect({detail:{...building,picked:true,siteId,originSiteId:siteId,x:0,y:0}});
    }
    return {clear,redraw,inspectBuilding,town:activeTown,openGround:()=>!!selection&&!selection.siteId,roaming:()=>!!selection&&selection.siteId!==selection.originSiteId};
  }
  root.EarthRegionalInspector={mount};
})(globalThis);
