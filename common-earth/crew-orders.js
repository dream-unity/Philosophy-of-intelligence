/* A crew order only becomes a simulation command after the player chooses a worksite. */
(() => {
  'use strict';
  function mount({sim,onArm,onDisarm,onResult,onChange,describeWorker}){
    const get=id=>document.getElementById(id);
    const dialog=get('crew-order-dialog'),hud=get('crew-order-hud'),picker=get('crew-order-workers');
    const targets=get('crew-order-targets'),armButton=get('crew-order-arm'),status=get('crew-order-status');
    const selected=new Set();
    let mode='idle',siteId=null,invoker=null,targetsKey='',pending=false,generation=0;
    const active=()=>sim.constructionView?.()||{jobs:[],workers:[]};
    const isOpen=()=>dialog.classList.contains('sheet-fallback') ||
      (typeof HTMLElement.prototype.showPopover==='function' && dialog.matches(':popover-open'));
    const put=(el,text)=>{if(el.textContent!==text)el.textContent=text;};
    const location=job=>job.scope==='street'?'Plot '+(job.plot+1):'City precinct '+(job.precinct+1);
    const element=(tag,cls,text)=>{
      const item=document.createElement(tag);
      if(cls)item.className=cls;if(text)item.textContent=text;return item;
    };
    function cancel(restore=false,hideSheet=true){
      if(mode==='idle')return;
      const origin=invoker;
      generation++;mode='idle';siteId=null;invoker=null;selected.clear();pending=false;targetsKey='';
      document.body.removeAttribute('data-crew-order');
      hud.hidden=true;
      onDisarm();
      if(hideSheet&&isOpen())dialog.hidePopover();
      if(restore && origin?.isConnected)requestAnimationFrame(()=>{
        if(!document.body.hasAttribute('data-sheet-open'))origin.focus({preventScroll:true});
      });
    }
    function chosenNames(model){
      return model.workers.filter(worker=>selected.has(worker.residentId)).map(worker=>worker.name);
    }
    function update(model=active()){
      if(mode==='idle')return;
      if(sim.state.activeId!==siteId){cancel();return;}
      if(!model.jobs.length){cancel();return;}
      const names=chosenNames(model);
      if(mode==='map'){
        put(get('crew-order-names'),names.join(', '));
        return;
      }
      put(status,pending?'Sending crew request…':names.length?names.length+' selected':'Select one or more residents.');
      armButton.disabled=pending||!names.length;
      for(const row of picker.children){
        const worker=model.workers.find(person=>person.residentId===row.dataset.resident);
        if(!worker)continue;
        row.querySelector('input').disabled=pending;
        const current=describeWorker(worker,model);
        put(row.querySelector('.crew-order-duty'),current);
        put(row.querySelector('.crew-order-limit'),worker.reason||'');
      }
      const topology=model.jobs.map(job=>job.id).join('/');
      if(targetsKey!==topology){
        targetsKey=topology;targets.replaceChildren();
        for(const job of model.jobs){
          const b=element('button','secondary',job.name+' · '+location(job));
          b.type='button';b.dataset.crewTarget=job.id;
          b.addEventListener('click',()=>assign(job.id));targets.append(b);
        }
      }
      for(const b of targets.children)b.disabled=pending||!names.length;
    }
    function open(origin,initial=[],listOpen=false){
      const model=active();
      if(!model.jobs.length)return;
      if(mode==='idle'){
        invoker=origin;selected.clear();
        for(const id of initial)if(model.workers.some(w=>w.residentId===id))selected.add(id);
      }
      siteId=sim.state.activeId;mode='pick';pending=false;targetsKey='';
      document.body.removeAttribute('data-crew-order');hud.hidden=true;onDisarm();
      picker.replaceChildren();
      for(const worker of model.workers){
        const row=element('label','crew-order-person'),box=element('input');
        row.dataset.resident=worker.residentId;
        box.type='checkbox';box.checked=selected.has(worker.residentId);
        box.setAttribute('aria-label','Select '+worker.name);
        box.addEventListener('change',()=>{
          if(box.checked)selected.add(worker.residentId);else selected.delete(worker.residentId);
          update();
        });
        const copy=element('span','crew-order-copy');
        copy.append(element('strong','',worker.name),element('span','crew-order-duty'),element('small','crew-order-limit'));
        row.append(box,copy);picker.append(row);
      }
      get('crew-order-listing').open=listOpen;
      update(model);
      if(!isOpen())dialog.showPopover();
    }
    async function assign(jobId){
      if(pending||mode==='idle'||sim.state.activeId!==siteId||!selected.size)return;
      const model=active(),job=model.jobs.find(item=>item.id===jobId);
      if(!job){update(model);onResult({ok:false,message:'That worksite has closed. Choose another active project.'});return;}
      const orderedSite=siteId,ticket=generation;
      pending=true;update(model);
      try{
        const result=await sim.perform('assignBuilders',[...selected],jobId);
        if(orderedSite!==sim.state.activeId||ticket!==generation)return;
        if(result.ok)cancel();
        onResult(result);
        if(result.ok)onChange(result,true);
      }finally{pending=false;update();}
    }
    armButton.addEventListener('click',()=>{
      if(mode!=='pick'||armButton.disabled)return;
      mode='map';
      document.body.setAttribute('data-crew-order','');
      hud.hidden=false;update();
      dialog.hidePopover();
      onArm([...selected]);
    });
    get('crew-order-cancel').addEventListener('click',()=>{
      cancel();get('street-canvas').focus({preventScroll:true});
    });
    get('crew-order-sites').addEventListener('click',e=>open(e.currentTarget,[],true));
    // Native and fallback sheets both report their open/closed state here.
    document.addEventListener('earthsheetchange',()=>{
      if(mode==='pick'&&!document.body.hasAttribute('data-sheet-open'))cancel(true,false);
      else if(mode==='map'&&document.body.hasAttribute('data-sheet-open'))cancel();
    });
    document.addEventListener('keydown',event=>{
      if(mode==='map'&&event.key==='Escape'){event.preventDefault();cancel();get('street-canvas').focus({preventScroll:true});}
    });
    return {open,assign,cancel,update};
  }
  window.EarthCrewOrders={mount};
})();
