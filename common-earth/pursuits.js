/* Personal work continues between weekly decisions. Only starting, collecting or
   releasing a job changes the save. Opening the page never awards offline income. */
(function(root){
  'use strict';
  const jobs={
    food:{label:'Glean produce',seconds:9,item:'food',base:2,fixture:'baskets'},
    materials:{label:'Recover crate timber',seconds:10,item:'materials',base:2,fixture:'rack'},
    funds:{label:'Handle a market delivery',seconds:12,item:'funds',base:2},
    cart:{label:'Build a handcart',seconds:16,price:2},
    baskets:{label:'Fit produce baskets',seconds:7},
    rack:{label:'Fit a timber rack',seconds:7}
  };
  const fittingNames={flat:'a flat bed',baskets:'produce baskets',rack:'a timber rack'};
  const person=site=>root.EarthAgency?.identity?.(site,root.EarthAgency?.actorId?.(site)||'steward')?.name || root.EarthAgency?.actor(site)?.name || 'Community steward';
  const actorId=site=>root.EarthAgency?.actorId(site)||'steward';
  const nameOK=s=>typeof s==='string' && s.trim().length>0 && s.length<=512;
  const integer=n=>Number.isSafeInteger(n) && n>=0;
  const nope=message=>({ok:false,message});
  function reward(site,id){
    const job=jobs[id],cart=site.pursuits?.cart;
    if(!job?.item)return 0;
    if(!cart)return job.base;
    return job.base+1+(job.fixture===cart.fixture?1:0);
  }
  function supplier(site,kind){
    const residents=site.residents||[],actor=actorId(site);
    if(!residents.length)return null;
    const slot=kind==='food'||kind==='baskets'?0:kind==='funds'?2:1;
    const preferred=residents[slot];
    if(preferred&&preferred.id!==actor)return preferred;
    for(let i=1;i<residents.length;i++){
      const candidate=residents[(slot+i)%residents.length];
      if(candidate&&candidate.id!==actor)return candidate;
    }
    return null;
  }
  function secondsLeft(ticket,now){
    const duration=ticket.helper?Math.min(4,jobs[ticket.kind].seconds):jobs[ticket.kind].seconds;
    return Math.max(0,Math.min(duration,Math.ceil((ticket.started+duration*1000-now)/1000)));
  }
  function valid(site){
    const work=site.pursuits;
    if(work===undefined)return true;
    if(!work||typeof work!=='object'||Array.isArray(work)||!integer(work.serial)||work.serial<1)return false;
    if(work.cart!=null && (!nameOK(work.cart.builder)||!Object.hasOwn(fittingNames,work.cart.fixture)))return false;
    const ticket=work.ticket;
    if(ticket==null)return true;
    if(typeof ticket!=='object'||Array.isArray(ticket)||!Object.hasOwn(jobs,ticket.kind)||!nameOK(ticket.maker)||ticket.makerId!=null&&!root.EarthAgency?.canPlay(site,ticket.makerId)||!integer(ticket.started)||!integer(ticket.started+jobs[ticket.kind].seconds*1000))return false;
    if(ticket.helper!=null && !site.residents.some(r=>r.id===ticket.helper))return false;
    if(ticket.kind==='cart' && work.cart)return false;
    if(['baskets','rack'].includes(ticket.kind) && (!work.cart || work.cart.fixture===ticket.kind))return false;
    return true;
  }
  function offer(site,kind){
    if(!Object.hasOwn(jobs,kind))return null;
    const job=jobs[kind],cart=site.pursuits?.cart;
    if(kind==='cart' && cart)return null;
    if(['baskets','rack'].includes(kind) && (!cart||cart.fixture===kind))return null;
    const output=reward(site,kind),price=job.price||0,hold=root.EarthHousing?.workHold(site,actorId(site))||'';
    const terms=job.item?'+'+output+(job.item==='funds'?' treasury funds':' community '+job.item):
      kind==='cart'?'2 materials · carry more on every personal job':
      kind==='baskets'?'Food loads carry 4 food':'Timber loads carry 4 materials';
    return {kind,label:job.label,seconds:job.seconds,terms,output,price,
      reason:hold,available:!hold&&!site.pursuits?.ticket && site.materials>=price && (site.pursuits?.serial||0)<Number.MAX_SAFE_INTEGER};
  }
  function view(site,now=Date.now()){
    if(!site)return null;
    const work=site.pursuits,job=work?.ticket;
    const remaining=job?secondsLeft(job,now):0;
    return {siteId:site.id,generation:site.foundingRevision||0,serial:work?.serial||0,actor:person(site),actorId:actorId(site),
      cart:work?.cart||null,ticket:job?{...job,label:jobs[job.kind].label,remaining,supplier:supplier(site,job.kind)}:null,
      choices:job?[]:Object.keys(jobs).map(id=>offer(site,id)).filter(Boolean)};
  }
  function run(site,request,scene,now=Date.now()){
    if(!site||!request||site.id!==request.siteId||(site.foundingRevision||0)!==request.generation)return nope('Open personal work in the current community.');
    const work=site.pursuits;
    if((work?.serial||0)!==request.serial || request.actorId!==actorId(site))return nope('The person or job has changed. Review the current work.');
    const actor=person(site),ticket=work?.ticket;
    if(request.action==='start'){
      if(ticket)return nope('Finish the current job or release it first.');
      const task=offer(site,request.kind);
      if(!task || !task.available)return nope(task?.reason||'Review the current materials and handcart before starting.');
      site.materials-=task.price;
      const book=site.pursuits??={serial:0,cart:null};
      book.serial++;
      book.ticket={kind:task.kind,maker:actor,makerId:request.actorId,started:now};
      return {ok:true,message:actor+' started '+task.label.toLowerCase()+'. Return in '+task.seconds+' seconds.'};
    }
    if(!ticket)return nope('There is no personal job awaiting collection.');
    const task=jobs[ticket.kind];
    if(request.action==='pickup'){
      const helper=supplier(site,ticket.kind),meeting=scene;
      if(ticket.helper || !helper || !meeting || meeting.actor!==request.actorId || meeting.target!==helper.id ||
        meeting.siteId!==site.id || meeting.mode!=='walk' || ![meeting.x,meeting.y,meeting.tx,meeting.ty].every(Number.isFinite) ||
        Math.hypot(meeting.x-meeting.tx,meeting.y-meeting.ty)>1.56)return nope('Meet the named supplier in person to pick up this job.');
      ticket.helper=helper.id;
      return {ok:true,message:helper.name+(task.item?' contributed an extra unit to the load.':' prepared the parts.')+' Bring it to the market.'};
    }
    if(request.action==='release'){
      if(task.price&&site.materials>Number.MAX_SAFE_INTEGER-task.price)
        return nope('Make room for the '+task.price+' reserved materials, or finish the handcart.');
      if(task.price)site.materials+=task.price;
      work.ticket=null;
      return {ok:true,message:'Job released.'+(task.price?' The reserved materials returned to the store.':'')};
    }
    if(request.action!=='collect')return nope('Choose a current work action.');
    if(!scene||scene.siteId!==site.id||scene.actor!==actorId(site)||scene.target!=='market'||
      !['walk','drive'].includes(scene.mode)||![scene.x,scene.y,scene.tx,scene.ty].every(Number.isFinite)||
      Math.hypot(scene.x-scene.tx,scene.y-scene.ty)>=(scene.mode==='drive'?1.9:1.56))
      return nope('Bring the finished work to the market exchange to collect it.');
    if(secondsLeft(ticket,now)>0)return nope('This work is still in progress.');
    let message;
    if(task.item){
      const units=reward(site,ticket.kind)+(ticket.helper?1:0);
      if(site[task.item]>Number.MAX_SAFE_INTEGER-units)
        return nope('Use or sell some '+task.item+' to make room for the full load of '+units+'. It will wait at the exchange.');
      site[task.item]+=units;
      const contributor=site.residents.find(p=>p.id===ticket.helper);
      const handoff=contributor?' with '+contributor.name+'’s extra load':ticket.maker===actor?'':' after '+ticket.maker+' prepared the load';
      message=actor+' brought in '+units+' '+task.item+' for '+site.name+handoff+'.';
    }else if(ticket.kind==='cart'){
      work.cart={builder:ticket.maker,fixture:'flat'};
      message=ticket.maker+' built the community handcart. Every resident can now bring home one more unit per personal job.';
    }else{
      work.cart.fixture=ticket.kind;
      message=ticket.maker+' fitted '+fittingNames[ticket.kind]+'. The next '+(ticket.kind==='baskets'?'produce':'timber')+' load carries four.';
    }
    work.ticket=null;
    return {ok:true,message};
  }
  function mount(container,{sim,onResult,onChange,onMarket,atMarket,onPickup,captureScene}){
    if(!container)return null;
    const doc=container.ownerDocument||root.document;
    const make=(tag,content,className)=>{
      const el=doc.createElement(tag);
      if(content!=null)el.textContent=content;
      if(className)el.className=className;
      return el;
    };
    const details=make('details'),heading=make('summary'),body=make('div',null,'personal-work-body');
    details.append(heading,body);container.append(details);
    let timer=null,screenKey='',exhaustedKey='',running=false,drawn=null,worldVersion=0,visibilityVersion=0;
    let progressLabel=null,collectButton=null,requestedResource=null;
    function stopTimer(){
      if(timer!==null)root.clearTimeout(timer);
      timer=null;
    }
    function tick(){
      stopTimer();
      const site=sim.active(),ticket=site?.pursuits?.ticket;
      if(!ticket||!drawn?.ticket||site.id!==drawn.siteId||site.pursuits.serial!==drawn.serial || doc.hidden || container.closest('[hidden]'))return;
      const remaining=secondsLeft(ticket,Date.now());
      heading.textContent=remaining?'Personal work · '+drawn.ticket.label:'Personal work · ready to collect';
      if(progressLabel)progressLabel.textContent=remaining?'Ready in '+remaining+'s':'Ready to collect';
      if(collectButton){
        const travel=Boolean(onMarket && atMarket && !atMarket());
        collectButton.textContent=remaining&&travel?'Walk to market':onMarket?'Collect at market':'Collect finished work';
        collectButton.disabled=remaining>0 && !travel;
      }
      if(remaining)timer=root.setTimeout(tick,details.open?1000:remaining*1000);
    }
    async function submit(action,kind,model){
      if(running || model.worldVersion!==worldVersion || doc.hidden || container.closest('[hidden]'))return;
      const visibleAt=visibilityVersion,readScene=captureScene(action,model);
      const current=()=>model.worldVersion===worldVersion && visibleAt===visibilityVersion && !doc.hidden &&
        !container.closest('[hidden]') && sim.state.activeId===model.siteId && actorId(sim.active())===model.actorId;
      const evidence=()=>current()?readScene():null;
      running=true;
      try{
        const result=await sim.perform('pursue',{action,kind,siteId:model.siteId,generation:model.generation,serial:model.serial,actorId:model.actorId},evidence);
        if(!current())return;
        onResult?.(result);
        const kindOfJob=model.ticket?.kind||kind;
        const changesCart=result?.ok && action==='collect' && !jobs[kindOfJob]?.item;
        const changesStores=result?.ok && ((action==='collect' && jobs[kindOfJob]?.item) ||
          (kindOfJob==='cart' && ['start','release'].includes(action)));
        onChange?.({cart:changesCart,stores:changesStores});
        render();
        if(result?.ok && (action==='collect'||action==='pickup') && model.worldVersion===worldVersion)open(requestedResource);
      }finally{running=false;}
    }
    function control(label,action,kind,model){
      const el=make('button',label);
      el.type='button';el.dataset.pursuit=kind||action;
      el.addEventListener('click',()=>{
        if(model.worldVersion!==worldVersion || doc.hidden || container.closest('[hidden]'))return;
        const visibleAt=visibilityVersion;
        const current=()=>visibleAt===visibilityVersion && model.worldVersion===worldVersion && !doc.hidden;
        const finish=()=>{if(current())return submit(action,kind,model);};
        if(action==='pickup' && onPickup)onPickup(model.ticket.supplier,finish);
        else if(action==='collect' && onMarket)onMarket(()=>{
          if(!current())return;
          const ticket=sim.active()?.pursuits?.ticket;
          if(ticket && secondsLeft(ticket,Date.now())>0){open(requestedResource);return;}
          finish();
        });
        else finish();
      });
      return el;
    }
    function render(){
      const site=sim.active(),model=view(site);
      if(!model){container.hidden=true;stopTimer();return;}
      container.hidden=false;
      const noEffort=!sim.state.effort;
      model.worldVersion=worldVersion;
      const stateKey=JSON.stringify([site.id,site.name,model.generation,model.serial,model.ticket?.kind,model.ticket?.started,model.ticket?.helper,model.actorId,model.actor,model.cart,site.materials>=2,noEffort,sim.state.week]);
      if(stateKey===screenKey){if(model.ticket && timer===null)tick();return;}
      const priorFocus=body.contains(doc.activeElement)?doc.activeElement.dataset.pursuit:null;
      function restoreFocus(){
        if(!priorFocus)return;
        const previous=Array.from(body.querySelectorAll('[data-pursuit]')).find(b=>b.dataset.pursuit===priorFocus&&!b.disabled);
        (previous||body.querySelector('button:not(:disabled)')||heading).focus({preventScroll:true});
      }
      screenKey=stateKey;stopTimer();drawn=model;
      const switchKey=site.id+'/'+model.generation+'/'+sim.state.week;
      if(noEffort && exhaustedKey!==switchKey){details.open=true;exhaustedKey=switchKey;}
      body.replaceChildren();progressLabel=collectButton=null;
      heading.textContent=noEffort?'Personal work · available without effort':'Personal work · earn or make';
      if(model.ticket){
        const ticket=model.ticket;
        body.append(make('p',ticket.maker+' · '+ticket.label));
        progressLabel=make('span',null,'personal-time');
        collectButton=control(onMarket?'Collect at market':'Collect finished work','collect',null,model);
        collectButton.disabled=ticket.remaining>0;
        const release=control('Release job','release',null,model);
        if(ticket.kind==='cart')release.textContent='Release and recover materials';
        if(onPickup && ticket.supplier && !ticket.helper){
          body.append(control((jobs[ticket.kind].item?'Pick up an extra unit from ':'Collect parts from ')+ticket.supplier.name,'pickup',null,model));
        }
        body.append(progressLabel,collectButton,release);
        tick();restoreFocus();return;
      }
      body.append(make('p',model.actor+' can take one job for '+site.name+'. Collect finished work for 1 development point and up to 1 civic effort. The exchange pays the worker 1 personal fund when its till can cover the wage.'));
      if(model.cart)body.append(make('p','Community handcart · made by '+model.cart.builder+' · '+fittingNames[model.cart.fixture]+'.','personal-cart'));
      const grid=make('div',null,'personal-work-grid');
      for(const task of model.choices){
        if(!jobs[task.kind].item&&sim.state.communityLife&&!root.EarthCommunityLife.isHome(sim.state,site))continue;
        const button=control('', 'start',task.kind,model);
        button.append(make('strong',task.label),make('small',task.seconds+'s · '+task.terms));
        button.disabled=!task.available;
        if(!task.available && task.kind==='cart')button.append(make('small','Recover crate timber first.'));
        grid.append(button);
      }
      body.append(grid);restoreFocus();
    }
    function open(resource){
      requestedResource=['food','materials','funds'].includes(resource)?resource:null;
      details.open=true;render();tick();
      const target=body.querySelector('[data-pursuit="'+(requestedResource||'food')+'"]:not(:disabled)')||
        body.querySelector('[data-pursuit="collect"]:not(:disabled)')||heading;
      target.focus({preventScroll:true});target.scrollIntoView({block:'nearest',behavior:'instant'});
    }
    sim.subscribe((_world,notice)=>{
      if(notice.switched){
        worldVersion++;screenKey='';exhaustedKey='';drawn=null;requestedResource=null;stopTimer();
      }
    });
    details.addEventListener('toggle',tick);
    doc.addEventListener('visibilitychange',()=>{visibilityVersion++;tick();});
    return {render,open};
  }
  root.EarthPursuits=Object.freeze({valid,view,run,mount});
})(typeof window==='undefined'?globalThis:window);
