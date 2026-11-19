(function(root){
  'use strict';
  const pending=new WeakSet();
  const parking=new WeakSet();
  async function park(context){
    const {sim,getStreet,notify}=context,street=getStreet(),offer=sim.truckView();
    if(!street||parking.has(street)||!offer||street.getState().vehicle!=='truck')return false;
    const {siteId,actorId,generation,week,serial}=offer;
    const current=()=>getStreet()===street&&sim.active()?.id===siteId&&root.EarthAgency.actorId(sim.active())===actorId&&
      (sim.active().foundingRevision||0)===generation&&street.getState().vehicle==='truck';
    parking.add(street);
    try{
      street.cancelTravel();
      if(!street.serviceTruckDoor()){notify?.('Pull forward to give the truck door room.',true);return false;}
      const result=await sim.perform('useTruck',{siteId,actorId,generation,week,serial,action:'park'},
        ()=>current()&&street.serviceTruckDoor()?street.truckStatus():null);
      if(!current())return false;
      if(!result.ok){notify?.(result.message,true);return false;}
      const exited=street.releaseServiceTruck();
      if(exited)notify?.('Truck parked. You can re-enter it here.');
      return exited;
    }finally{parking.delete(street);}
  }
  function render(container,context){
    const {sim,getStreet,notify,refresh}=context,street=getStreet(),offer=sim.truckView(),scene=street?.truckStatus();
    const doc=container.ownerDocument;
    const el=(tag,text)=>{const node=doc.createElement(tag);if(text!=null)node.textContent=text;return node;};
    container.replaceChildren();
    if(!offer||!scene){container.append(el('p','Enter a community to find its co-op truck.'));return;}
    const held=offer.custody,owner=held?.actor===offer.actorId;
    const near=(p,r=1.56)=>Math.hypot(scene.x-p.x,scene.y-p.y)<=r;
    const riding=scene.mode==='drive'&&scene.vehicle==='truck';
    const generation=offer.generation,siteId=offer.siteId,actorId=offer.actorId,week=offer.week;
    const visible=()=>container.isConnected&&!container.hidden&&!container.closest('[hidden]')&&!doc.hidden;
    const current=()=>visible()&&getStreet()===street&&sim.active()?.id===siteId&&
      root.EarthAgency.actorId(sim.active())===actorId&&(sim.active().foundingRevision||0)===generation&&sim.state.week===week;
    const msg=(text,bad=false)=>{notify?.(text,bad);};
    const button=(text,fn,disabled=false)=>{
      const b=el('button',text);b.type='button';b.className='secondary-button';b.disabled=disabled;b.addEventListener('click',fn);return b;
    };
    const approach=(at)=>{
      if(!current())return;
      const done=()=>{if(current()){refresh?.();msg('At the '+(at==='truck'?'blue co-op truck':at==='stop'?offer.next.name:offer.depot.name)+'. Choose an action.');}};
      const ok=at==='truck'?street.hailTruck(done):street.followTruckDelivery(at==='stop'?offer.next:offer.depot,done);
      if(ok){if(!near(at==='truck'?scene.truck:at==='stop'?offer.next:offer.depot))msg('On the way to '+(at==='truck'?'the blue truck':at==='stop'?offer.next.name:offer.depot.name)+'.');}
      else msg(scene.mode==='boat'?'Moor and come ashore to meet dispatch.':'The route is blocked. Try approaching from the next kerb.',true);
    };
    async function transact(action){
      if(!current()||pending.has(container))return;
      if(action==='park'){await park(context);if(visible())refresh?.();return;}
      pending.add(container);
      try{
        const result=await sim.perform('useTruck',{siteId,actorId,generation,week,serial:offer.serial,action},()=>current()?street.truckStatus():null);
        if(result.ok&&getStreet()===street&&sim.active()?.id===siteId&&root.EarthAgency.actorId(sim.active())===actorId){
          if(action==='checkout'||action==='take')street.boardServiceTruck();
          else if(action==='return')street.releaseServiceTruck();
        }
        if(visible())msg(result.message,!result.ok);
      }finally{pending.delete(container);if(visible())refresh?.();}
    }
    const header=el('p',offer.owner+' · '+offer.role);container.append(header);
    container.append(el('p',held?held.kind==='theft'?'The regular pickup is overdue. Dispatch is tracking the missing truck.':
      'Assigned freight for '+offer.next.name+(held.delivered?' has been unloaded.':'.'):
      scene.status==='standby'?'Parked at the market exchange. '+(scene.reason||'Dispatch is waiting for an order.'):
      scene.status==='returning'?'Returning to the market exchange. '+scene.reason:
      offer.driver+' is assigned '+(scene.good?'one '+scene.good+' for ':'to ')+scene.next+'.'));
    if(!held||owner&&!riding){
      if(!near(scene.truck)||scene.mode!=='walk')container.append(button('Meet the blue truck',()=>approach('truck'),scene.mode==='boat'));
      if(owner&&scene.mode==='walk'&&near(scene.truck))container.append(button('Board your checked-out truck',()=>{
        if(current()&&street.boardServiceTruck()){msg('At the wheel of the blue truck.');refresh?.();}
      }));
    }
    for(const c of offer.choices){
      const row=el('div');row.className='hud-option';
      const target=c.at==='depot'?offer.depot:c.at==='stop'?offer.next:scene.truck;
      const place=c.at==='truck'?'the blue truck':target.name;
      const requiresTravel=!near(target,c.at==='truck'?1.56:1.8);
      const modeOk=owner?riding:scene.mode==='walk';
      const description=el('small',c.reason||c.detail);
      if(!c.available){row.append(el('strong',c.label),description);}
      else if(!modeOk||requiresTravel){
        if(owner&&!riding||scene.mode==='boat'||!owner&&scene.mode==='drive')row.append(el('strong',c.label),el('small',owner?'Board the checked-out truck first.':scene.mode==='boat'?'Moor and come ashore first.':'Step out of the public van first.'));
        else row.append(button((riding?'Drive to ':'Walk to ')+place+' · '+c.label,()=>approach(c.at)),description);
      }else row.append(button(c.label,()=>transact(c.action),pending.has(container)),description);
      container.append(row);
    }
    const last=offer.history[0];
    if(last)container.append(el('small','Dispatch log · Week '+last.week+' · '+last.text));
  }
  root.EarthTruckPanel=Object.freeze({render,park});
})(typeof window==='undefined'?globalThis:window);
