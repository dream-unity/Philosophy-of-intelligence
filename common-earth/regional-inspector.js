/* Inspecting a point reads the same district the street draws. Only the explicit
   journey and proposal buttons can issue a command to the simulation. */
(function(root){
  'use strict';
  function mount({sim,street,watch,travel,returnStreet,refresh,ledger,buildingAction,townCentre,contextChanged}){
    const doc=root.document,id=key=>doc.getElementById(key),host=id('region-inspector');
    if(!host)return null;
    const detail=id('region-point-detail'),toggle=id('region-inspect-point');
    let selection=null,expanded=false,pending=false,lastStamp='',message='';
    const world=()=>sim.state;
    const town=key=>world().sites.find(s=>s.id===key)||world().communityLife?.outposts.find(s=>s.id===key);
    const activeTown=()=>selection?.siteId?town(selection.siteId):null;
    const element=(tag,text)=>{const el=doc.createElement(tag);el.textContent=text;return el;};
    function action(label,run,disabled=false){
      const b=element('button',label);b.type='button';b.disabled=disabled;b.addEventListener('click',run);detail.append(b);
    }
    function clear(){
      selection=null;expanded=false;message='';lastStamp='';host.hidden=true;
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
          if(event.use==='market')localAction('Visit the exchange','market');
          if(event.use==='project')localAction('Visit this project','project');
          if(event.use==='market'||event.use==='project')localAction('See available jobs','work');
        }
      }else if(event.kind==='asset'){
        const fleet=view&&event.assetId==='truck'&&root.EarthFleet?.assignment?.(w,view);
        line(typeof event.activity==='string'?event.activity:event.activity?.label);
        if(fleet){
          line([fleet.owner,fleet.operator?'Operator · '+fleet.operator:null,fleet.destination?'Destination · '+fleet.destination:null].filter(Boolean).join(' · '));
          line([fleet.reason,fleet.cargo,fleet.status].filter(Boolean).join(' · '));
        }
      }
      if(view){
        line(view.era+' · '+view.population+' residents · '+view.food+' food · '+view.materials+' materials · '+view.funds+' public funds');
        if(townCentre&&view.housing){
          action('Town Centre',()=>townCentre(view,event.use==='townCentre'?'recruitment':'housing'));
          action('Entry and reputation',()=>townCentre(view,'reception'));
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
