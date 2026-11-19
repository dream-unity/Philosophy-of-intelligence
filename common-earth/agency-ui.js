(function(root){
  'use strict';
  function mount({sim,street,version,button,node,refresh,onResult,resetEncounter}){
    const agency=root.EarthAgency,actorSelect=document.getElementById('street-actor');
    const roleSelect=document.getElementById('street-actor-role');
    if(!agency||!actorSelect||!roleSelect)return null;
    let siteKey='',changing=false;
    function option(value,label){const opt=node('option','',label);opt.value=value;return opt;}
    function update(){
      const site=sim.active();
      if(!site)return;
      const people=[agency.identity(site,'steward'),...site.residents],key=JSON.stringify(people.map(p=>[p.id,p.name]));
      if(siteKey!==key){
        dismissReview();actorSelect.replaceChildren(...people.map(p=>option(p.id,p.name)));
        siteKey=key;
      }
      const actor=agency.actor(site);
      actorSelect.value=agency.actorId(site);
      document.getElementById('actor-role-label').hidden=!actor;
      if(!actor)return;
      if(!roleSelect.options.length){
        const preferences=root.EarthConstruction?.view(site,sim.state).preferences||[];
        roleSelect.replaceChildren(...preferences.map(p=>option(p.id,p.label)));
      }
      roleSelect.value=site.workforce?.members?.[actor.id]?.preference||'auto';
    }
    let review=null;
    function dismissReview(){review?.remove();review=null;}
    async function switchTo(id,quote){
      if(changing)return;
      const local=street(),actor=agency.actorId(sim.active()),siteId=sim.state.activeId,expected=version();
      if(!local)return;
      changing=true;actorSelect.disabled=true;dismissReview();
      try{
        const scene=()=>version()===expected&&street()===local&&siteId===sim.state.activeId&&actor===agency.actorId(sim.active())&&local.getState();
        const result=await sim.perform('changeActor',id,scene,quote);
        if(version()!==expected||street()!==local)return;
        if(result.finishQuote){
          review=node('div','actor-review');
          const finish=button('Finish day and switch',()=>switchTo(id,result.finishQuote),'secondary-button');
          const keep=button('Continue this day',()=>{dismissReview();actorSelect.focus();},'text-button');
          review.append(node('p','action-description',result.message),finish,keep);
          actorSelect.closest('.actor-controls').append(review);finish.focus({preventScroll:true});
        }else if(onResult(result)){
          resetEncounter();local.setSite(sim.active());refresh();
        }
        update();
      }finally{changing=false;actorSelect.disabled=false;}
    }
    actorSelect.addEventListener('change',()=>switchTo(actorSelect.value));
    roleSelect.addEventListener('change',async()=>{
      const site=sim.active(),id=site&&agency.actor(site)?.id,local=street(),expected=version();
      if(!id||!local)return;
      const stillPlaying=()=>version()===expected&&street()===local&&sim.state.activeId===site.id&&agency.actorId(sim.active())===id;
      roleSelect.disabled=true;
      try{
        const result=await sim.perform('setWorkPreference',id,roleSelect.value,null,stillPlaying);
        if(stillPlaying()&&onResult(result))refresh();
        update();
      }finally{roleSelect.disabled=false;}
    });
    function conversation(container,ref){
      const id=ref?.residentId||ref?.npcId,site=sim.active(),target=site&&agency.identity(site,id);
      if(!target||id===agency.actorId(site))return;
      const row=node('article','action-card'),reply=node('p','action-description');
      reply.setAttribute('aria-live','polite');
      const buttons=node('div','quick-picks');
      row.append(node('strong','action-label','Talk with '+target.name),reply,buttons);
      const source=agency.actorId(site);
      for(const [topic,label] of [['news','How are things?'],['work','What are you working on?'],['interests','Outside work'],['meal','Share a meal · 1 food']]){
        const talk=button(label,async()=>{
          const local=street();
          if(!local||sim.state.activeId!==site.id||agency.actorId(sim.active())!==source)return;
          const expected=version();
          const speak=async()=>{
            // Movement can continue while another tab holds the world lock.
            const liveMeeting=()=>version()===expected && street()===local && sim.state.activeId===site.id &&
              agency.actorId(sim.active())===source && local.meeting(ref,true);
            const result=await sim.perform('converse',id,topic,liveMeeting);
            if(version()!==expected||street()!==local)return;
            if(result.changed||topic==='meal'&&result.ok){onResult(result);refresh();}
            else if(reply.isConnected)reply.textContent=result.message;
          };
          if(local.meeting(ref)){await speak();return;}
          if(local.getState().mode==='drive')local.toggleVehicle();
          if(local.getState().mode!=='walk'||!local.focusStop(ref,speak)){
            onResult({ok:false,message:'Come ashore nearby to meet '+target.name+'.'});
          }else onResult({ok:true,message:'Walking to '+target.name+'.'});
        },'secondary-button');
        talk.dataset.talkTopic=topic;buttons.append(talk);
      }
      container.append(row);
    }
    function localsList(container,onMeet){
      const people=street()?.localPeople()||[];
      if(!people.length)return;
      const details=node('details','shift-guide');details.append(node('summary','','People on the street'));
      for(const person of people){
        const b=button('Meet '+person.label,()=>onMeet(person),'secondary-button');
        b.dataset.meetNpc=person.npcId;details.append(b);
      }
      container.append(details);
    }
    async function playAs(id){
      await switchTo(id);
      if(review)review.scrollIntoView({block:'center',behavior:'instant'});
    }
    return {update,conversation,localsList,dismissReview,playAs};
  }
  root.EarthAgencyUI=Object.freeze({mount});
})(typeof window==='undefined'?globalThis:window);
