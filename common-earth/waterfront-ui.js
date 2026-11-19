/* The map and the lower Street controls share this fishing dispatcher. It
   samples the actual actor/boat again while the world save lock is held. */
(function(root){
  'use strict';
  function mount(container,{sim,getStreet,notify,refresh}){
    if(!container)return null;
    const doc=container.ownerDocument||document;
    function node(tag,cls){const el=doc.createElement(tag);el.className=cls;return el;}
    const card=node('section','waterfront-panel'),count=node('strong','waterfront-pantry'),status=node('p','waterfront-status'),
      result=node('p','waterfront-result'),buttons=node('div','waterfront-actions');
    status.id=(container.id||'waterfront')+'-conditions';status.setAttribute('role','status');result.setAttribute('role','status');card.setAttribute('aria-label','Waterfront fishing');
    card.append(count,status,buttons,result);container.append(card);
    function control(key){const b=node('button','secondary');b.type='button';b.dataset.fishing=key;b.addEventListener('click',()=>act(key));buttons.append(b);return b;}
    const lineButton=control('line'),shoalButton=control('shoal'),nets=control('net'),boat=control('boat');
    lineButton.setAttribute('aria-describedby',status.id);
    let busy='',due=null,timer=0,sceneKey=null,lastCast=null;
    const setText=(el,value)=>{if(el.textContent!==value)el.textContent=value;};
    const crew=()=>doc.body?.hasAttribute('data-crew-order');
    function stopTimer(){if(timer)root.clearTimeout(timer);timer=0;due=null;}
    function schedule(offer,site){
      const key=offer?.action==='wait'?site.id+'/'+site.handline.castAt:null;
      if(key===due)return;
      stopTimer();if(key===null)return;
      due=key;timer=root.setTimeout(()=>{timer=0;due=null;getStreet()?.refreshFishingFloat();render();},Math.max(1,offer.wait+20));
    }
    function render(state=getStreet()?.getState()){
      const site=sim.active();
      if(!state || !state.waterfront || !site || state.siteId!==site.id){card.hidden=true;stopTimer();return;}
      const key=site.id+'/'+(site.foundingRevision||0)+'/'+site.lat+'/'+site.lon;
      if(sceneKey!==key || lastCast!==null && lastCast!==site.handline?.castAt){sceneKey=key;lastCast=null;setText(result,'');}
      card.hidden=false;
      const offer=sim.handlineOffer(state),aboard=state.mode==='boat',blocked=state.placement||crew();
      schedule(offer,site);
      setText(count,'Community pantry · '+site.food+' food');
      const pending=state.boarding?'Walking to the mooring.':state.returning?'Returning to the quay.':state.findingLine?'Returning to the shared float.':state.findingQuay?'Walking to the fishing quay.':'';
      setText(status,busy|| (blocked?'Finish or cancel the current map assignment to fish.':pending|| (state.seated?'Stand up to reach the quay.':offer?.text||'This fishing spot is unavailable.')));
      const acting=busy||blocked||Boolean(pending);
      lineButton.disabled=acting||!offer||['wait','full','sailing'].includes(offer.action);
      setText(lineButton,state.seated?'Stand up to fish':offer?.action==='land'?'Reel in · '+offer.food+' food':offer?.action==='cast'?'Cast line · '+offer.food+' food':offer?.label||'Cast line');
      shoalButton.hidden=!aboard||!offer||!['sailing','cast'].includes(offer.action)||offer.food===2;
      shoalButton.disabled=busy||blocked||state.returning;
      setText(shoalButton,state.sailingToShoal?'Stop sailing':'Follow seabirds');
      const net=aboard&&site.buildings.some(b=>b.kind==='fishingDock')?sim.fishingOffer():null;
      nets.hidden=!net;nets.disabled=acting||!net?.available;setText(nets,net?.available?'Set nets · 4 food':'Nets unavailable');nets.title=net?.reason||'Costs 1 weekly effort';
      boat.disabled=busy||blocked;setText(boat,state.boarding?'Cancel boarding':state.returning?'Cancel return':state.findingQuay||state.findingLine?'Stop journey':aboard?'Return to quay':'Board a boat');
    }
    function report(message,error=false){setText(result,message);notify?.(message,error);}
    async function act(key){
      const street=getStreet(),start=street?.getState(),site=sim.active();
      if(busy||!start||!site||!start.waterfront||site.id!==start.siteId||start.placement||crew())return false;
      if(key==='boat'){
        if(start.findingQuay||start.findingLine){street.cancelTravel();render();return true;}
        const ok=street.toggleBoat();render();return ok;
      }
      if(start.boarding||start.returning||start.findingQuay||start.findingLine)return false;
      if(start.seated){street.standUp();render();return true;}
      const offer=sim.handlineOffer(start);if(!offer)return false;
      if(key==='shoal'){
        if(start.mode!=='boat')return false;
        if(start.sailingToShoal){street.cancelTravel();render();return true;}
        if(offer.action==='cast'&&offer.food===2)key='line';
        else{const ok=street.approachFishing('shoal');if(!ok)report('The moorings block that course. Steer into open water or cast from here.',true);render();return ok;}
      }
      if(key==='line'&&['return','shore'].includes(offer.action)){
        const ok=street.approachFishing(offer.action==='return'?'line':'shore');if(!ok)report('Choose another approach to the quay or float.',true);render();return ok;
      }
      const net=key==='net';
      if(net && (start.mode!=='boat'||!sim.fishingOffer().available) || !net && (key!=='line'||!['cast','land'].includes(offer.action)))return false;
      const castAt=site.handline?.castAt;
      const proof=()=>{
        const s=getStreet()===street&&street.getState();
        return s&&s.siteId===start.siteId&&s.actor===start.actor&&s.mode===start.mode&&!s.returning&&!s.boarding&&!s.placement&&!s.seated&&!crew()&&Math.hypot(start.x-s.x,start.y-s.y)<=.35?s:null;
      };
      busy=net?'Drawing the nets…':offer.action==='cast'?'Casting the handline…':'Reeling in the catch…';street.cancelTravel();render();
      try{
        const response=net?await sim.perform('fish',site.id,proof):await sim.perform('useHandline',proof,offer.action,offer.food,castAt);
        const local=getStreet()===street && sim.active()?.id===site.id;
        if(local){
          lastCast=response.ok && !net && offer.action==='cast'?sim.active()?.handline?.castAt??null:null;
          setText(result,response.message);
          if(response.ok && net)street.showCatch(site.id);
          street.refreshFishingFloat();
        }
        refresh?.(response);return response.ok;
      }finally{busy='';render();}
    }
    function close(){stopTimer();}
    function resume(){
      if(doc.hidden){stopTimer();return;}
      // Browser back/forward caches pause timers. Use the saved cast's
      // absolute deadline and current world's stock when the page returns.
      sim.sync?.();stopTimer();render();getStreet()?.refreshFishingFloat();
    }
    root.addEventListener?.('pageshow',resume);doc.addEventListener?.('visibilitychange',resume);
    return {render,act,close,destroy(){close();root.removeEventListener?.('pageshow',resume);doc.removeEventListener?.('visibilitychange',resume);card.remove();}};
  }
  root.EarthWaterfrontUI=Object.freeze({mount});
})(typeof window==='undefined'?globalThis:window);
