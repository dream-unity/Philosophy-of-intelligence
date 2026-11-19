(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const controls = (root, selector) => Array.from(root.querySelectorAll(selector));
  const node = (tag, cls, content) => {
    const result = document.createElement(tag);
    if (cls) result.className = cls;
    if (content != null) result.textContent = content;
    return result;
  };
  function button(label, callback, cls = 'secondary-button') {
    const result = node('button', cls, label);
    result.type = 'button';
    result.addEventListener('click', callback);
    return result;
  }
  const show = (id, visible) => { const el=$(id); if(el && el.hidden!==!visible)el.hidden=!visible; };
  const put = (id, value) => { const el=$(id),text=String(value??''); if(el && el.textContent!==text)el.textContent=text; };
  const listen = (id, event, fn) => $(id)?.addEventListener(event, fn);
  const nativeSheets=typeof HTMLElement.prototype.showPopover==='function';
  const groups = {people:'People',build:'Build',research:'Research',work:'Work',council:'Council',routes:'Routes'};
  const start = {name:'Stone Town',region:'Zanzibar, Tanzania',lat:-6.1622,lon:39.1922,water:false};
  const book=window.EarthSaves?.open();
  const sim=book?.sim||window.CommonEarthSim.create();
  let forecastView=window.EarthForecastView?.create(sim);
  const forecastDraws=new WeakMap();
  const savedWorlds=book && $('saved-worlds') ? book.mount($('saved-worlds'),{section:true}):null;
  const planning=window.EarthPlanner && $('planning-table') ? window.EarthPlanner.mount($('planning-table'),sim):null;
  const learning=window.EarthGoals && $('learning-goal') ? window.EarthGoals.mount($('learning-goal'),{sim,onResult:presentResult,onChange:render,onFollow:followCharter}):null;
  const personalWork=window.EarthPursuits?.mount($('personal-work'),{
    sim,onResult:presentResult,
    onChange:changes=>{
      if(changes.cart)street?.setSite(sim.active());
      if(changes.cart||changes.stores)render();
      else refreshSaveWarning();
    },
    onPickup:(person,arrive)=>meetResident(person,arrive),
    atMarket:()=>view==='street' && Boolean(street?.meeting({type:'market'})),
    captureScene:(action,model)=>{
      const expected=arrivalVersion,local=street,sceneEpoch=streetHud?.active()==='work'?streetHud.version():null;
      const venue=action==='collect'?{type:'market'}:
        action==='pickup'?{type:'resident',residentId:model.ticket.supplier.id}:null;
      return ()=>{
        if(view!=='street'||!local||local!==street||arrivalVersion!==expected||sceneEpoch!==null&&streetHud.version()!==sceneEpoch)return null;
        return venue?local.meeting(venue):local.getState();
      };
    },
    onMarket:arrive=>atVenue({type:'market'},'the market exchange',arrive)
  });
  let viewingShift=false,researchPage='eras',councilPage='agenda';
  let preparedSurvey=null,preparingSurvey=false,sponsorChoicesWorld=null,foundingSponsor=null,choosingFoundingPlace=false,handlineTimer=0,handlineDue=0;
  let selected = start, view = 'world', group = 'people', visiting = null, peers = false, encounter = null, placement = null, street = null;
  const works=window.EarthWorksitePanel?.mount({sim,inspect:openWorksite,watch:watchWorksite,
    chooseCrew:(origin,ids)=>{arrivalVersion++;crewOrders?.open(origin,ids);},onResult:presentResult,onChange:worksiteChanged});
  const crewOrders=works&&window.EarthCrewOrders?.mount({sim,onArm:armCrewOrder,onDisarm:()=>{
    street?.setCrewSelection?.([]);if(street)updateStreetInteract(street.getState());
  },
    describeWorker:works.workerInfo,onResult:presentResult,onChange:worksiteChanged});
  const agencyUI=window.EarthAgencyUI?.mount({sim,street:()=>view==='street'?street:null,
    version:()=>arrivalVersion,button,node,refresh:render,onResult:presentResult,
    resetEncounter:()=>{arrivalVersion++;crewOrders?.cancel();cancelPlacement();street?.cancelTravel();encounter=null;visiting=null;peers=false;viewingShift=false;group='people';}
  });
  const lifePanel=window.EarthLifePanel?.mount($('character-lives'),{
    sim,street:()=>view==='street'?street:null,version:()=>arrivalVersion,reviewWeek:()=>streetHud?.active()==='life'?streetHud.previewWeek():reviewWeek(),
    meet:meetForLife,playAs:sceneHandoff,onResult:presentResult,after:()=>{street?.setSite(sim.active());render();}
  });
  let lastOpening=null,arrivalVersion=0,commissioning=false,localWorkRate='',previewWorkRates='',goalWorkRates='',courseWorkRates='';
  let toastTimer, outcomeContext='', recordsPage='events',journalLimit=20,journalFilter='all';
  const getStreet=()=>view==='street'?street:null;
  const redrawStreet=()=>{if(view==='street')street?.setSite(sim.active());render();};
  const sceneWork=resource=>{
    if(streetHud?.openTool('work'))personalWork.open(resource);
    else personalWork?.open(resource);
  };
  let liveClock=null,clockSignal='',decisionKey='',decisionHold='',rememberFrame=0;
  const temporaryClockChoices=new Map();
  function clockPreference(value){
    const key='common-earth.clock.v1.'+(book?.current()?.id||'first');
    if(value!=null){
      const choice=value?'live':'manual';
      try{localStorage.setItem(key,choice);temporaryClockChoices.delete(key);}
      catch{temporaryClockChoices.set(key,choice);}
      return choice;
    }
    if(temporaryClockChoices.has(key))return temporaryClockChoices.get(key);
    try{return localStorage.getItem(key);}catch{return null;}
  }
  function resumeClock(previousTab){
    if(!sim.active()||!liveClock)return;
    const preference=clockPreference();
    if(preference==null&&previousTab===false)clockPreference(false);
    if(window.EarthLiveWeeks.enabledOnReturn(preference,previousTab))liveClock.start();
  }
  const streetHud=window.EarthStreetHUD?.mount($('street-hud'),{
    sim,getStreet,stageVersion:()=>arrivalVersion,meet:meetForLife,venue:atVenue,
    after:redrawStreet,advance:advanceWeek,readForecast,followGoal:followSceneGoal,changed:()=>{syncLiveClock();rememberStreetSoon();},personalWork:sceneWork,playAs:sceneHandoff,profile:id=>{if(streetHud.openTool('life'))lifePanel?.open(id);}
  });
  function sceneHandoff(id){
    const pane=streetHud?.active();
    if(pane==='original'){
      const epoch=streetHud.version();
      return agencyUI?.playAs(id,{host:$('scene-original'),returnFocus:$('scene-original-handoff'),
        current:()=>!document.hidden&&!districtDesk?.observing()&&streetHud.active()===pane&&streetHud.version()===epoch,
        switched:result=>{streetHud.notify(result.message);$('street-canvas').focus({preventScroll:true});}
      });
    }
    const surfaces={life:['life-person','life-profile'],goals:['scene-goal-person','scene-goal-detail'],talk:['scene-talk-person','scene-talk-handoff']};
    const surface=surfaces[pane];if(!surface)return agencyUI?.playAs(id);
    const epoch=streetHud.version(),field=$(surface[0]);
    return agencyUI?.playAs(id,{host:$(surface[1]),returnFocus:field,
      current:()=>!document.hidden&&streetHud.active()===pane&&streetHud.version()===epoch&&field.value===id,
      switched:result=>{streetHud.notify(result.message);$('street-canvas').focus({preventScroll:true});}
    });
  }
  const sceneContext={sim,getStreet,notify:(msg,error)=>streetHud?streetHud.notify(msg,error):notify(msg,error),close:()=>streetHud?.close(),
    refresh:result=>{if(result)presentResult(result);redrawStreet();}};
  $('district-membership-hint')?.addEventListener('click',()=>streetHud?.openTool('neighbours'));
  const districtDesk=streetHud&&window.EarthDistrictDesk?.mount({sim,hud:streetHud,street:getStreet,
    enterStreet:()=>{if(view!=='street')setView('street',false);},redraw:redrawStreet,notify,inspectWork:openWorksite,
    buildingAction:(kind,building,owner)=>{
      if(kind==='meet')streetHud.meetPerson(owner);
      else if(kind==='door'){
        const door={type:'activityVenue',homeSlot:building.homeSlot,householdPlot:building.householdPlot};
        atVenue(door,building.assetName,()=>districtDesk.inspectBuilding(building));
      }else if(kind==='shop'){if(streetHud.openTool('stores')&&!visitorScene('stores'))localMarket.openShop(building.plot);}
      else if(kind==='work'){selectGroup('work');focusActions();}
      else{
        const venue=kind==='market'?{type:'market'}:{type:'building',plot:building.plot,kind:building.buildingKind,label:building.assetName};
        atVenue(venue,kind==='market'?'the market exchange':building.assetName,event=>interactAt(event));
      }
    },
    travel:id=>{
      if(view!=='street')setView('street',false);
      if(streetHud.openTool('neighbours'))districtPanel?.travelTo(id);
    }});
  const districtPanel=window.EarthCommunityLifeUI?.mount($('scene-neighbours'),{sim,getStreet,atVenue,meet:meetForLife,playAs:id=>agencyUI?.playAs(id),
    watchTown:id=>districtDesk?.watch(id),
    refresh:redrawStreet,notify:(message,error)=>streetHud?.notify(message,error),
    arrive:(site,vehicle)=>{
      arrivalVersion++;cancelPlacement();street?.cancelTravel?.();encounter=null;visiting=null;peers=false;viewingShift=false;group='people';
      selectPlace(site,false);setView('street',false);redrawStreet();if(vehicle==='van')street?.arriveByVan();else if(street?.getState().vehicle==='van')street.toggleVehicle();streetHud?.close(false);
    }});
  if(districtPanel)streetHud?.registerTool('neighbours',districtPanel);
  const practice=window.EarthPracticeUI?.mount($('scene-practice'),{sim,street:getStreet,redraw:redrawStreet,notify});
  if(practice)streetHud?.registerTool('practice',practice);
  const originalLife=window.EarthOriginalLife?.mount($('scene-original'),{sim,playAs:sceneHandoff,
    observing:()=>districtDesk?.observing(),pantry:(action,target)=>districtPanel?.pantry(action,target),
    towns:id=>{if(streetHud.openTool('neighbours')&&id)districtPanel?.travelTo(id);},
    talk:id=>streetHud?.meetPerson(id)});
  if(originalLife)streetHud?.registerTool('original',originalLife);
  function visitorScene(id){
    const site=sim.active(),host=$('scene-'+id);if(!host)return false;
    const reason=sim.state.communityLife&&window.EarthCommunityLife?.visitReason(sim.state,site);
    let info=host.querySelector('[data-visitor-info]');
    if(!reason){
      info?.remove();
      for(const child of host.querySelectorAll('[data-visitor-hidden]')){child.style.display='';delete child.dataset.visitorHidden;}
      return false;
    }
    for(const child of host.children)if(child!==info&&!child.dataset.visitorHidden){child.style.display='none';child.dataset.visitorHidden='true';}
    if(!info){info=node('article','district-row');info.dataset.visitorInfo='true';host.append(info);}
    const details={stores:site.food+' food, '+site.materials+' materials and '+site.funds+' funds are held in local stores.',
      truck:'The local co-op controls its truck and delivery shifts.',fishing:'Residents manage the catch and the shared pantry.',
      work:'Local households assign their own work.',life:'You can speak to residents about their lives through Talk.'};
    info.replaceChildren(node('strong','','Visiting '+site.name),node('p','',details[id]+' '+reason),
      button('Meet the membership host',()=>streetHud.openTool('neighbours'),'secondary-button'));
    return true;
  }
  const waterfrontUI=window.EarthWaterfrontUI?.mount($('scene-fishing'),sceneContext);
  if(waterfrontUI)streetHud?.registerTool('fishing',{render:()=>{if(!visitorScene('fishing'))waterfrontUI.render();},onScene:()=>{if(!sim.state.communityLife||window.EarthCommunityLife.isHome(sim.state,sim.active()))waterfrontUI.render();},close:waterfrontUI.close});
  const localMarket=window.EarthMarketPanel?.mount($('local-market'),{
    sim,street:getStreet,version:()=>arrivalVersion+'/'+streetHud?.version(),meet:atVenue,quayProof,meetQuay,
    onResult:presentResult,after:redrawStreet,work:sceneWork,openFishing:()=>streetHud?.openTool('fishing')
  });
  districtDesk?.setMarket(localMarket);
  if(localMarket)streetHud?.registerTool('stores',{...localMarket,render:(...args)=>{if(!visitorScene('stores'))localMarket.render(...args);}});
  function attachSceneSection(id,section,module){
    const host=$('scene-'+id),original=section?.parentElement,next=section?.nextSibling;
    if(!module||!host||!original)return;
    streetHud?.registerTool(id,{
      render:()=>{if(id!=='work'&&visitorScene(id))return;if(section.parentElement!==host)host.append(section);module.render();},
      close:()=>{
        module.invalidate?.();
        if(section.tagName==='DETAILS')section.open=false;
        else if(id==='work'&&section.querySelector('details'))section.querySelector('details').open=false;
        if(section.parentElement!==original)original.insertBefore(section,next?.parentElement===original?next:null);
      }
    });
  }
  attachSceneSection('work',$('personal-work'),personalWork);
  attachSceneSection('life',$('character-lives'),lifePanel);
  const truckPanel=window.EarthTruckPanel;
  if(truckPanel&&streetHud){
    let truckPosition='',quoteKey='',quote=null;
    function renderTruck(force){
      const site=sim.active(),scene=getStreet()?.truckStatus?.();if(!scene||!site)return;
      if(sim.state.communityLife&&!window.EarthCommunityLife.isHome(sim.state,site)){if(force)visitorScene('truck');return;}
      if(force)visitorScene('truck');
      const key=[site.id,site.foundingRevision||0,scene.actor,sim.state.week,sim.state.actionRevision].join('/');
      if(key!==quoteKey){quoteKey=key;quote=sim.truckView();}
      const near=(p,r)=>!!p&&Math.hypot(scene.x-p.x,scene.y-p.y)<=r;
      const position=[key,scene.mode,scene.vehicle,scene.next,near(scene.truck,1.56),near(scene.truck,1.8),
        near(quote?.depot,1.8),near(quote?.next,1.8)].join('/');
      if(!force&&position===truckPosition)return;
      truckPosition=position;
      truckPanel.render($('scene-truck'),{...sceneContext,refresh:()=>{redrawStreet();if(streetHud.active()==='truck')renderTruck(true);}});
    }
    streetHud.registerTool('truck',{render:()=>renderTruck(true),onScene:()=>renderTruck(false),invalidate:()=>{quoteKey='';truckPosition='';}});
  }
  function clockState(){
    const site=sim.active(),state=sim.state,local=getStreet()?.getState(),pane=streetHud?.active();
    const key=[site?.id,site?.foundingRevision,state.week,state.actionRevision,sim.saveIssue].join('/');
    if(decisionKey!==key){decisionKey=key;decisionHold=sim.liveWeekHold();}
    const paneReasons={talk:'Finish the conversation.',stores:'Close the stores and exchange.',life:'Close character planning.',
      original:'Finish reviewing your original character’s commitments.',precinct:'Finish reviewing the neighbourhood project.',
      practice:'Finish the current practice decision.',work:'Close personal work.',truck:'Close co-op dispatch.',fishing:'Close the fishing controls.'};
    const hold=document.hidden?'Return to this browser tab.':!local?'Return to Street view.':
      document.body.hasAttribute('data-sheet-open')?'Close the open game sheet.':
      paneReasons[pane]|| (local.placement||document.body.hasAttribute('data-crew-order')?'Finish or cancel the current building or crew assignment.':
      local.mode==='boat'?'Return to shore.':local.mode==='drive'?'Park the vehicle and return to walking.':
      local.travelling?'Wait for the current journey to finish.':
      site.pursuits?.ticket?'Finish or release the active personal job.':
      local.waterfront&&site.handline?'Reel in the line or choose another activity.':
      site.fleet?.custody?.actor===local.actor?'Return the checked-out co-op truck.':
      $('actions-panel')?.contains(document.activeElement)&&['build','work','research','council','routes'].includes(group)?'Return from the current community decision to the street.':decisionHold);
    return {siteId:site?.id,generation:site?.foundingRevision||0,actorId:local?.actor||window.EarthAgency?.actorId(site),
      week:state.week,actionRevision:state.actionRevision||0,hold:hold||''};
  }
  function syncLiveClock(force=false,discard=false){
    if(!liveClock||!liveClock.enabled()&&!force)return;
    const view=clockState(),key=[view.siteId,view.generation,view.actorId,view.week,view.hold,streetHud?.active()==='live'].join('/');
    if(force||key!==clockSignal){clockSignal=key;liveClock.update({force,discard});}
  }
  // The household economy has a separate clock so fishing, a pending vote or a
  // street journey cannot freeze production in every other town.
  let productionPending=false,productionPaint=0,paintDue=false,paintSince=0;
  const inspectionPointers=new Set(),meter=window.EarthPerformance;
  const producing=()=>!document.hidden&&!!sim.active();
  function paintProduction(){
    clearTimeout(productionPaint);productionPaint=0;
    if(!paintDue||document.hidden)return;
    if(inspectionPointers.size&&performance.now()-paintSince<550){
      productionPaint=setTimeout(paintProduction,100);return;
    }
    paintDue=false;
    const began=meter?.now();
    if(view==='street')street?.setSite(sim.active());
    render();
    if(meter)meter.finish('productionUI',began);
  }
  function queueProductionPaint(){
    if(!paintDue){paintDue=true;paintSince=performance.now();}
    if(inspectionPointers.size){
      if(!productionPaint)productionPaint=setTimeout(paintProduction,100);
    }else paintProduction();
  }
  document.addEventListener('pointerdown',event=>{
    if(event.target?.matches?.('#street-canvas,#observer-canvas,#region-land'))inspectionPointers.add(event.pointerId);
  },{capture:true,passive:true});
  function releaseInspection(event){
    if(!inspectionPointers.delete(event.pointerId)||inspectionPointers.size||!paintDue)return;
    // Give the canvas its release frame before refreshing off-screen ledgers.
    clearTimeout(productionPaint);productionPaint=setTimeout(paintProduction,36);
  }
  for(const name of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(name,releaseInspection,{capture:true,passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)inspectionPointers.clear();else if(paintDue)queueProductionPaint();
  });
  setInterval(async()=>{
    if(productionPending||!producing()||!window.EarthDistrictGrowth.due(sim.state))return;
    productionPending=true;
    try{
      const serial=sim.state.productionSerial||0;
      if(forecastView?.prepareProduction&&!(await forecastView.prepareProduction(serial,producing)))return;
      const result=await sim.perform('production',serial,producing);
      if(result.ok)queueProductionPaint();
    }finally{productionPending=false;}
  },4000);
  function liveReview(){
    const site=sim.active(),scene=getStreet()?.getState();if(!site||!scene)return null;
    const hold=clockState().hold;if(!hold)return null;
    if(site.pursuits?.ticket)return {label:'Review personal work',run:()=>sceneWork()};
    if(site.fleet?.custody?.actor===scene.actor||scene.vehicle==='truck')return {label:'Review truck assignment',run:()=>streetHud.openTool('truck')};
    if(site.purses?.tickets?.[scene.actor]){
      return {label:'Review your paid stock check',run:()=>{
        if(streetHud.openTool('stores'))localMarket?.openPurse?.();
      }};
    }
    const entry=upcomingDeadlines()[0];
    if(entry)return {label:'Review · '+entry.label,run:async()=>{
      if(entry.person&&(entry.group==='shift'||entry.group==='people')){
        if(sim.active()?.id!==entry.site.id)await openSite(entry.site);
        const p=sim.active()?.residents.find(r=>r.id===entry.person.id);
        if(p){const ref={type:'resident',residentId:p.id};streetHud.openTalk(ref);meetForLife(ref,p.name,()=>streetHud.scene(street.getState()));}
      }else{streetHud.close(false);revisitDeadline(entry);}
    }};
    for(const town of sim.state.sites){
      const offer=Object.entries(town.careers||{}).find(([,life])=>life.application?.phase==='offer'&&!life.application?.autonomous);
      if(offer)return {label:'Review the job offer',run:async()=>{
        if(sim.active()?.id!==town.id)await openSite(town);
        if(sim.active()?.id===town.id&&streetHud.openTool('life'))lifePanel.open(offer[0]);
      }};
    }
    return null;
  }
  function refreshLiveReview(){
    const path=streetHud?.active()==='live'&&liveReview();show('scene-live-review',!!path);if(path)put('scene-live-review',path.label);
    const site=sim.active(),canSet=site&&sim.state.communityLife&&window.EarthCommunityLife.isHome(sim.state,site)&&!site.mandate&&!window.EarthLegacy?.governs(sim.state,site);
    show('scene-hearing-switch',!!canSet);
    if(canSet){
      const residentsVote=window.CommonEarthSim.residentHearing(sim.state,site);
      put('scene-hearing-switch',residentsVote?'Council votes at deadlines · switch to my vote':'Council waits for me · let residents vote');
      $('scene-hearing-switch')?.setAttribute('aria-pressed',String(residentsVote));
    }
  }
  function paintLiveClock(state){
    const duration=Math.floor(state.seconds/60)+':'+String(state.seconds%60).padStart(2,'0');
    const status=state.enabled?(state.hold?'Waiting · '+state.hold:state.pending?'Turning the shared calendar.':'The shared calendar is running.'):
      state.started?'Paused by you. Resume when you are ready.':'Manual play. Start the clock to let weeks advance here.';
    put('scene-live-status',status);put('scene-live-next','Week '+state.nextWeek+' · '+duration+' of Street time remaining');
    put('scene-live-switch',state.enabled?'Pause live weeks':state.started?'Resume live weeks':'Start live weeks');
    const switcher=$('scene-live-switch'),pressed=String(state.enabled);
    if(switcher&&switcher.getAttribute('aria-pressed')!==pressed)switcher.setAttribute('aria-pressed',pressed);
    const labels=[[/conversation/,'Talking'],[/journey|vehicle/,'Travelling'],[/assignment/,'Building'],[/shore|water|handline|fish/,'Fishing'],
      [/truck|dispatch/,'Dispatch'],[/stores|exchange/,'Trading'],[/stock check/,'Stock check'],[/job|work/,'Working'],[/council|vote/,'Council due'],
      [/promise/,'Promise due'],[/shift/,'Shared day'],[/booking|cooperative/,'Booking due'],[/offer|study|course|planning/,'Planning']];
    const label=state.hold?labels.find(([pattern])=>pattern.test(state.hold))?.[1]||'Waiting':duration;
    const observerClock=$('observer-clock');
    if(observerClock){
      const action=state.enabled?'Pause live weeks':state.started?'Resume live weeks':'Start live weeks';
      put('observer-clock',action+(state.enabled&&state.hold?' · '+label:''));
      observerClock.title=status;observerClock.setAttribute('aria-pressed',String(state.enabled));
    }
    if(state.hold||streetHud.active()==='live')refreshLiveReview();
  }
  async function commitLiveWeek(quote,guard){
    if(advancing)return {ok:false,message:'Another calendar action is underway. A new interval will begin.'};
    advancing=true;
    try{
      const result=await closeSharedWeek({live:quote,usePrepared:true},guard);
      if(result?.ok)lastAdvance=performance.now();
      return result;
    }finally{advancing=false;}
  }
  if(streetHud&&window.EarthLiveWeeks&&sim.liveWeekHold&&$('scene-live-switch')){
    liveClock=window.EarthLiveWeeks.create({read:clockState,advance:commitLiveWeek,paint:paintLiveClock,
      detail:()=>streetHud.active()==='live',notice:result=>{if(result?.ok)redrawStreet();if(result?.message)streetHud.notify(result.message);}});
    function calendarActivities(scene){
      const site=sim.active(),member=site&&(!sim.state.communityLife||window.EarthCommunityLife.isHome(sim.state,site));
      show('calendar-work',!!(site&&personalWork));
      show('calendar-study',!!(member&&lifePanel));
      show('calendar-fishing',!!(member&&waterfrontUI&&scene?.waterfront&&window.CommonEarthSim.waterfront(site)));
    }
    streetHud.registerTool('live',{render:scene=>{calendarActivities(scene);syncLiveClock(true);refreshLiveReview();},onScene:calendarActivities});
    listen('calendar-work','click',()=>sceneWork());
    listen('calendar-study','click',()=>{if(streetHud.openTool('life'))lifePanel.open();});
    listen('scene-live-review','click',()=>liveReview()?.run());
    listen('scene-hearing-switch','click',async()=>{
      const site=sim.active();if(!site)return;
      const result=await sim.perform('act',window.CommonEarthSim.residentHearing(sim.state,site)?'hearing:hold':'hearing:resident');
      if(result.ok){render();syncLiveClock(true);}
      streetHud.notify(result.message);
    });
    function toggleSharedClock(){
      if(liveClock.enabled())liveClock.pause();else liveClock.start();
      clockPreference(liveClock.enabled());rememberStreetSoon();
    }
    listen('scene-live-switch','click',toggleSharedClock);
    listen('observer-clock','click',()=>{if(districtDesk?.observing())toggleSharedClock();});
    document.addEventListener('visibilitychange',()=>syncLiveClock(true,!document.hidden));
    document.addEventListener('earthsheetchange',()=>syncLiveClock());
    document.addEventListener('focusin',()=>syncLiveClock());
    window.addEventListener('pageshow',()=>syncLiveClock(true,true));
  }
  function notify(message, error = false) {
    if(message&&view==='street'&&streetHud&&(streetHud.active()||$('street-stage')?.contains(document.activeElement))){
      streetHud.notify(message,error);return;
    }
    const box = $('toast');
    if (!message || !box) return;
    clearTimeout(toastTimer);
    box.textContent = message;
    box.hidden = false;
    box.dataset.state = error ? 'warning' : 'notice';
    box.classList.add('visible','is-visible');
    toastTimer = setTimeout(() => {box.classList.remove('visible','is-visible'); box.hidden = true;}, 8000);
  }
  function presentResult(result) {
    if (result?.message) {
      notify(result.message,!result.ok);
      if(view==='street'){
        outcomeContext=actionContext();
        put('action-outcome',result.message);show('action-outcome',true);
      }
    }
    return !!result?.ok;
  }
  function formatCoord(value, positive, negative) {
    return Math.abs(value).toFixed(2) + '° ' + (value < 0 ? negative : positive);
  }
  function coords(point) { return formatCoord(point.lat,'N','S')+'  ·  '+formatCoord(point.lon,'E','W'); }
  function regionAt(point){
    const base=sim.active(),model=window.EarthRegionalWorld;
    if(!base||!model||!point||!Number.isFinite(point.lon)||!Number.isFinite(point.lat))return null;
    const geo=model.geography(sim.state,base),p=geo.project(point),b=geo.bounds;
    return p.x>=b.minX&&p.x<=b.maxX&&p.y>=b.minY&&p.y<=b.maxY?{geo,...p}:null;
  }
  function known(point) {
    if(!point)return null;
    const sites=[...sim.state.sites,...(sim.state.communityLife?.outposts||[])];
    if(point.id){const exact=sites.find(s=>s.id===point.id);if(exact)return exact;}
    // Globe markers carry the settlement id. A geographic tap inside a
    // playable region selects its ground unless it lands within the town.
    const d=Math.PI/180;let closest=null,range=regionAt(point)?.geo?.cellSize??10;
    for(const site of sites){
      const h=Math.sin((site.lat-point.lat)*d/2)**2+Math.cos(site.lat*d)*Math.cos(point.lat*d)*Math.sin((site.lon-point.lon)*d/2)**2;
      const distance=12742*Math.asin(Math.sqrt(Math.min(1,h)));if(distance<range){range=distance;closest=site;}
    }
    return closest;
  }
  function hideDialog(id) {
    const el=$(id);
    if (!el)return;
    if(el.matches('[popover]') && el.hidePopover) el.hidePopover();
    else if(el.classList.contains('sheet-fallback'))el.querySelector('[popovertargetaction="hide"]')?.click();
    else if(el.open) el.close();
  }
  const stackedMap=matchMedia('(max-width: 730px), (max-width: 900px) and (orientation: portrait)');
  function focusActions() {
    if(view!=='street')return;
    const heading=$('actions-heading');
    heading.focus({preventScroll:true});
    if(stackedMap.matches){
      const top=heading.getBoundingClientRect().top;
      if(top<44 || top>innerHeight*.25)heading.scrollIntoView({block:'start',behavior:'instant'});
    }else if(innerHeight<536){
      const list=$('actions-list');
      const first=list.querySelector('button[data-action]:not(:disabled),button.action-button:not(:disabled)');
      if(!first){inView('actions-heading');return;}
      const rect=first.getBoundingClientRect(),clip=list.getBoundingClientRect();
      if(rect.bottom>Math.min(innerHeight,clip.bottom)||rect.top<Math.max(0,clip.top)){
        first.scrollIntoView({block:'center',behavior:'instant'});
      }
    }else inView('actions-heading');
  }
  function followStreet() {if(street?.getState().travelling)inView('street-stage');}
  function inView(id) {
    const el=$(id);
    if (!el) return;
    const top=el.getBoundingClientRect().top;
    if(top < 0 || top > innerHeight*.76) el.scrollIntoView({block:'nearest',behavior:'instant'});
  }
  const atlas = window.EarthAtlas.mount($('globe-canvas'),{
    active:false,lat:7,lon:32,zoom:1,
    onSelect:point => choosePlace(point,false),
    onPlaceLoading:()=>put('map-survey','Finding place…'),
    onPlaceError:()=>{inspect();notify('Place details could not load. Tap the map to try again.',true);},
    onReady:()=>{
      if(view==='street' && sim.active())street?.setSite(sim.active());
      else if(view==='world')inspect();
    },
    onError:() => notify('The globe artwork could not load. You can still choose a place using Places.',true)
  });
  let voyageStyle='exchange',planOpen=false,reportOpen=false,showBeacons=true,loadingPlan=null;
  function renderVoyage() {
    const el=$('voyage-console'),nav=window.EarthVoyages,site=sim.active();
    if(!el || !nav)return;
    el.replaceChildren();el.hidden=!site;
    if(!site)return;
    const v=sim.state.voyage;
    if(v) {
      const scene=nav.scene(v);
      el.append(node('small','kicker','Expedition · Stage '+scene.number+' of '+scene.total),
        node('p','voyage-note',v.origin.name+' → '+v.target.name),node('h3','',scene.title),node('p','',scene.prompt),
        node('p','voyage-stats','Day '+v.days+' / '+v.targetDays+' · Supplies '+v.supplies+' · Readiness '+v.readiness+' · Goodwill '+v.goodwill+' · Knowledge '+v.knowledge));
      for(const option of nav.choices(v)) {
        const b=button('',async()=>{
          const from={...v.position},result=await sim.perform('sail',option.id);
          if(!presentResult(result))return;
          const arrival=sim.state.voyage?.position||sim.state.lastVoyage.position;
          if(!sim.state.voyage){selected={...v.target};reportOpen=true;planOpen=false;}
          render();
          atlas.journey(from,arrival,{duration:950});
        },'voyage-choice');
        b.append(node('strong','',option.label),node('small','',option.available?option.description:option.reason));
        b.disabled=!option.available;el.append(b);
      }
      if(v.log.length)el.append(node('p','voyage-note',v.log.at(-1).text));
      return;
    }
    if(reportOpen&&sim.state.lastVoyage) {
      const last=sim.state.lastVoyage;
      const gains=goods=>Object.entries(goods||{}).filter(([,n])=>n).map(([k,v])=>(v>0?'+':'')+v+' '+k).join(' · ');
      el.append(node('small','kicker','Expedition report'),node('h3','',last.headline),
        node('p','voyage-note',last.origin.name+' → '+last.target.name+' · '+last.days+' days'),node('p','',last.lesson),
        node('p','voyage-stats',last.origin.name+' · '+(gains(last.reward)||'No change in resources.')));
      if(gains(last.targetReward))el.append(node('p','voyage-stats',last.target.name+' · '+gains(last.targetReward)));
      el.append(button('Close report',()=>{reportOpen=false;inspect();},'text-button'));
      return;
    }
    if(sim.state.lastVoyage && !planOpen)el.append(button('Last expedition report',()=>{reportOpen=true;renderVoyage();},'text-button'));
    const places=window.EarthNavigation;
    if(planOpen && places?.load){
      el.append(node('p','voyage-note','Loading the route geography…'));
      if(!loadingPlan){
        loadingPlan=places.load();
        loadingPlan.then(()=>{
          loadingPlan=null;
          if(planOpen && view==='world')renderVoyage();
        },()=>{
          loadingPlan=null;
          if(planOpen && view==='world')el.replaceChildren(button('Retry route geography',renderVoyage,'secondary-button'));
        });
      }
      return;
    }
    const target=known(selected)||selected;
    // Touch exploration needs only distance and eligibility until a route is opened.
    const plan=(planOpen?nav.preview:nav.terms||nav.preview)(site,target,voyageStyle);
    if(!plan.ok) {
      el.append(node('p','voyage-note','To plan an expedition from '+site.name+', select a destination at least 10 km away.'));
      return;
    }
    if(!planOpen) {
      el.append(button('Plan expedition here',()=>{planOpen=true;renderVoyage();},'secondary-button'));
      return;
    }
    el.append(node('small','kicker','Expedition'),node('h3','','From '+site.name));
    const label=node('label','', 'Purpose of the journey');
    const select=node('select','voyage-select');
    for(const style of nav.styles){const option=node('option','',style.label);option.value=style.id;select.append(option);}
    select.value=voyageStyle;select.addEventListener('change',()=>{voyageStyle=select.value;renderVoyage();el.querySelector('select')?.focus();});
    label.append(select);el.append(label,node('p','',plan.description),node('p','voyage-stats',plan.distance.toLocaleString()+' km · '+plan.legs+' stages · aim for '+plan.targetDays+' expedition days.'),
      node('small','voyage-note',plan.note));
    const startTrip=button('Depart · 1 effort, '+plan.cost.funds+' funds, '+plan.cost.food+' food',async()=>{
      if(presentResult(await sim.perform('beginVoyage',target,voyageStyle))) {reportOpen=false;render();atlas.focus(site.lat,site.lon,1.15);}
    },'primary');
    startTrip.disabled=sim.state.effort<1||site.funds<plan.cost.funds||site.food<plan.cost.food;
    el.append(startTrip);
    if(startTrip.disabled)el.append(node('p','voyage-note','Earn the listed resources or advance the week for more effort.'));
    el.append(button('Close plan',()=>{planOpen=false;renderVoyage();},'text-button'));
  }
  function markers() {
    const sites=[...sim.state.sites,...(sim.state.communityLife?.outposts||[])];
    const neighbours=sim.state.communityLife?window.EarthCommunityLife.neighbours(sim.state,sim.active()).filter(town=>town.distance<=70).slice(0,6):[];
    const nearest=new Map(neighbours.map((s,i)=>[s.id,i+1]));
    atlas.setSites(sites.map(s=>({id:s.id,name:s.name,lat:s.lat,lon:s.lon,water:s.water,region:s.region,
      nearbyRank:nearest.get(s.id)||0,active:s.id===sim.state.activeId})));
    const partners=window.EarthPartners?.list(sim.state,sim.active())||[];
    atlas.setBeacons?.(showBeacons?partners:[]);
    const sitesById=new Map(sim.state.sites.map(s=>[s.id,s]));
    const routes = sim.state.routes.map(route => ({
      from:sitesById.get(route.from || route.fromId || route.a),
      to:sitesById.get(route.to || route.toId || route.b)
    })).filter(r=>r.from&&r.to);
    if(sim.state.voyage)routes.push({from:sim.state.voyage.origin,to:sim.state.voyage.target,preview:true});
    atlas.setRoutes?.(routes);
    atlas.setSelection(selected);
  }
  function selectPlace(point,fly){
    selected=point;foundingSponsor=sim.state.activeId;planOpen=false;reportOpen=false;
    if($('commission-at-founding'))$('commission-at-founding').checked=false;
    if($('commission-brief'))$('commission-brief').open=false;
    if ($('found-name')) $('found-name').value='';
    if(fly) atlas.focus(point.lat,point.lon,1.6);
    atlas.setSelection(point);
  }
  function choosePlace(point,fly=true) {
    if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lon)) return;
    preparedSurvey=null;
    selectPlace(point,fly);
    hideDialog('places-dialog');
    if(view==='world')inspect();
    else setView('world');
    if(choosingFoundingPlace){
      choosingFoundingPlace=false;
      $('site-inspector').scrollIntoView({block:'start',behavior:'instant'});
      $('place-name').focus({preventScroll:true});
    }
  }
  function inspect() {
    const partner=selected.kind==='partner'&&sim.active()&&window.EarthPartners?.get(sim.state,sim.active(),selected.partnerId);
    const site=partner?null:known(selected);
    const ground=!partner&&!site&&regionAt(selected);
    const groundInfo=ground&&window.EarthRegionalWorld.terrain(ground.geo,ground.x,ground.y);
    show('inspect-region-selection',Boolean(groundInfo));
    const name=partner?.name||site?.name||groundInfo?.label||selected.name||'Selected location';
    put('map-survey',(site?'Visit ':partner?'Meet ':'Survey ')+name+' ↓');
    const partnerPanel=$('partner-inspector');
    const delegateOpen=partner&&partnerPanel?.querySelector('details[open]')?.dataset.delegate===partner.person?.id;
    if(partnerPanel){partnerPanel.hidden=!partner;partnerPanel.replaceChildren();}
    if(partner && partnerPanel){
      put('place-name',partner.name);put('place-type',partner.locality+' · Independent cooperative');
      put('place-coords',coords(partner));put('place-description',partner.interest);
      show('watch-selected-streets',false);show('found-area',false);show('visit-button',false);show('voyage-console',false);
      partnerPanel.append(node('p','resident-line',partner.delegate+' · '+partner.relation),node('blockquote','partner-voice',partner.voice),
        node('p','action-description','Offers '+partner.exportGood+' · Needs '+partner.importGood+'. Local reserve '+partner.reserve+' · Surplus '+partner.surplus+'.'),
        node('p','action-cost',partner.status),node('p','voyage-note',partner.activity||''));
      if(partner.person){
        const person=partner.person,profile=node('details','shift-guide');
        profile.dataset.delegate=person.id;profile.open=Boolean(delegateOpen);
        profile.append(node('summary','',person.name+'’s work and development'),
          node('p','action-description',person.personality+' Their strongest skill is '+person.strength.toLowerCase()+'.'),
          node('p','action-cost',person.skill+' · '+person.sessions+' of '+person.goal+' workplace sessions · '+(person.completed?'Now serving as ':'Preparing for ')+person.nextRole+'.'),
          node('p','action-description',person.next),node('p','voyage-note',partner.decision.reason));
        partnerPanel.append(profile);
      }
      const booking=partner.agreement?.phase==='pledge'?partner.agreement:partner.offer;
      if(booking && booking.homeId!==sim.state.activeId){
        const home=sim.state.sites.find(s=>s.id===booking.homeId);
        if(home)partnerPanel.append(button((partner.offer?'Continue talks from ':'Manage booking from ')+home.name,
          ()=>resumePartner(home,partner.partnerId),'secondary-button'));
      }
      for(const a of sim.actions('routes').filter(a=>a.partnerId===partner.partnerId))partnerPanel.append(actionRow(a));
      if(sim.state.voyage || reportOpen)renderVoyage();
      return;
    }
    if(groundInfo){
      put('place-name',groundInfo.label);put('place-coords',selected.lat.toFixed(4)+'°, '+selected.lon.toFixed(4)+'°');
      put('place-type',ground.geo.origin.name+' region');
      put('place-description',groundInfo.resource+' · Inspect this land and its current use, claims and exploration records.');
      for(const control of ['watch-selected-streets','found-area','visit-button','voyage-console'])show(control,false);
      return;
    }
    const scenario=window.EarthCampaigns?.preview(selected)||window.EarthNavigation.scenario(selected);
    put('commission-title',scenario?.title);put('commission-step',scenario?.firstStep||scenario?.question);
    show('commission-brief',!!scenario);
    put('place-name',site?.name||selected.name);
    const placeType=site ? (site.water?'Floating community':'Established community') :
      selected.region || (selected.water?'Open water':'Landfall');
    put('place-type',window.CommonEarthSim.waterfront(site || selected)?placeType+' · Waterfront':placeType);
    put('place-coords',coords(selected));
    put('place-description',site ? (site.population+' residents · '+site.era+'. Visit to meet the people who live here.') :
      (scenario ? 'Fictional opening · '+scenario.brief : '') || selected.caption || (selected.water ?
      'Found a floating community here. Its residents will depend on the food and supplies you can grow, recover or exchange.' :
      'Start a neighbourhood here. Meet its first residents and decide together what this place needs.'));
    show('found-area',!site); show('visit-button',!!site);
    show('watch-selected-streets',!!site&&site.id!==sim.state.activeId);
    if($('found-terms')){
      const sites=sim.state.sites,canChoose=!site && sites.length>1;
      const select=$('found-sponsor');
      show('sponsor-label',canChoose);show('found-sponsor',canChoose);
      if(!sites.some(s=>s.id===foundingSponsor))foundingSponsor=sim.state.activeId;
      if(canChoose && select){
        const world=sim.state,stamp=(world.actionRevision||0)+'/'+(world.workRevision||0);
        if(sponsorChoicesWorld!==world || select.dataset.stamp!==stamp){
          select.replaceChildren(...sites.map(candidate=>{
            const ready=sim.sponsorshipOffer(candidate.id).available;
            const option=node('option','',candidate.name+(ready?' · ready':' · needs preparation'));
            option.value=candidate.id;return option;
          }));
          sponsorChoicesWorld=world;select.dataset.stamp=stamp;
        }
        select.value=foundingSponsor;
      }else sponsorChoicesWorld=null;
      const offer=sim.foundingOffer?.(selected,foundingSponsor);
      show('prepare-founding',!site && Boolean(offer?.preparation));
      if(offer?.preparation)put('prepare-founding',offer.preparation.label);
      const localResources=!site&&window.EarthResources?.survey?.(selected)?.summary;
      put('found-terms',[offer?.reason,offer?.terms,localResources].filter(Boolean).join(' '));
      show('found-terms',!site&&Boolean(sim.active()||localResources));
      $('found-button').disabled=offer?(!site&&!offer.available):false;
    }
    if($('found-button')) {
      const original=$('found-button').firstChild;
      if(original?.nodeType===Node.TEXT_NODE)original.nodeValue=selected.water?'Found a floating community ':'Found a community ';
    }
    renderVoyage();
    if ($('found-name')) $('found-name').placeholder=selected.water?'Name your floating community':'Name your community';
  }
  function placeButton(p) {
    const b=button('',()=>choosePlace(p),'place-result');
    const detail=p.kind==='partner'?'Independent neighbour · '+p.locality:
      p.id&&known(p)?.id===p.id?(p.id===sim.state.communityLife?.homeId?'Home community · ':'Independent community · ')+p.region:p.caption||p.region||coords(p);
    b.append(node('strong','',p.name),node('small','',detail));
    return b;
  }
  const placeSearchKey=text=>String(text||'').normalize('NFKD').toLowerCase().replace(/\p{M}/gu,'')
    .replace(/[’']/g,'').replace(/[\p{P}\s]+/gu,' ').trim();
  let searchVersion=0,searchBusy=false;
  async function searchPlaces() {
    const version=++searchVersion;
    const query=$('place-search')?.value.trim()||'';
    if(!query){$('place-results').replaceChildren();return;}
    if(searchBusy)return;
    const list=$('place-results');
    list.replaceChildren(node('p','empty-state','Searching places…'));
    let places;
    searchBusy=true;
    try{
      places=await window.EarthNavigation.searchAsync(query,9);
    }catch{
      if(version===searchVersion)list.replaceChildren(node('p','empty-state','Place search could not load. Choose a starting point or use coordinates.'));
      return;
    }finally{
      searchBusy=false;
      if(version!==searchVersion && $('place-search')?.value.trim())searchPlaces();
    }
    if(version!==searchVersion)return;
    const needle=placeSearchKey(query),terms=needle.split(' ');
    const neighbours=window.EarthPartners?.list(sim.state,sim.active())||[];
    const matches=[];
    if(needle)for(const point of [...sim.state.sites,...(sim.state.communityLife?.outposts||[]),...neighbours]){
      const name=placeSearchKey(point.name),address=name+' '+placeSearchKey(point.locality||point.region);
      if(!terms.every(term=>address.includes(term)))continue;
      const rank=name===needle?0:name.startsWith(needle)?1:name.includes(needle)?2:3;
      matches.push({point,rank});
    }
    matches.sort((a,b)=>a.rank-b.rank || a.point.name.localeCompare(b.point.name));
    // A named community and a gazetteer pin can share coordinates. They open
    // different surveys, so keep both and identify their roles in the list.
    const exact=places.filter(p=>placeSearchKey(p.name)===needle);
    const results=[...matches.filter(m=>m.rank===0).map(m=>m.point),...exact,
      ...matches.filter(m=>m.rank>0).slice(0,5).map(m=>m.point),...places.filter(p=>!exact.includes(p))];
    $('place-results').replaceChildren(...results.map(placeButton));
    if(!results.length) $('place-results').append(node('p','empty-state','No match. Try another spelling or enter coordinates below.'));
  }
  function updateStreetInteract(state) {
    streetHud?.scene(state);syncLiveClock();
    const aboard=state.mode==='boat',crewOrder=document.body.hasAttribute('data-crew-order');
    show('street-seat',state.mode==='walk' && !state.placement && !crewOrder);
    put('street-seat',state.seated?'Stand up':'Find a seat');
    show('street-interact',!aboard);
    show('street-vehicle',!aboard);
    show('street-boat',state.waterfront && !state.placement && !crewOrder);
    put('street-boat',state.boarding?'Cancel boarding':state.returning?'Cancel return':aboard?'Return to shore':'Board boat');
    const canFish=state.waterfront && !state.returning && !state.boarding && !state.placement && !crewOrder && !state.seated;
    const line=canFish?sim.handlineOffer?.(state):null;
    show('street-handline',!!line);
    show('street-line-terms',!!line);
    if(line){
      put('street-handline',line.label);
      put('street-line-terms',line.text);
      $('street-handline').disabled=['sailing','wait','full','resting'].includes(line.action);
    }
    show('street-shoal',aboard && (state.sailingToShoal || line?.action==='cast' && line.food===1 && line.shoalUseful!==false));
    put('street-shoal',state.sailingToShoal?'Stop sailing':'Sail to shoal');
    const due=line?.wait?sim.active().handline.castAt:0;
    if(due!==handlineDue){
      clearTimeout(handlineTimer);handlineDue=due;
      if(line?.wait)handlineTimer=setTimeout(()=>{
        handlineDue=0;
        if(view==='street' && street){street.refreshFishingFloat();updateStreetInteract(street.getState());}
      },line.wait+25);
    }
    const hasNets=canFish && aboard && sim.active()?.buildings.some(b=>b.kind==='fishingDock');
    show('street-fish',hasNets);
    show('street-fishing-terms',hasNets);
    if(hasNets && $('street-fish')){
      const offer=sim.fishingOffer();
      $('street-fish').disabled=!offer.available;
      put('street-fishing-terms',offer.available?'Community nets · '+offer.food+' food per catch.':offer.reason);
    }
    put('street-mode',aboard?'On the water':'On the ground');
    const label=crewOrder?'Choose worksite':
      state.placement?'Commission on plot '+(state.plot+1):state.travelling?(state.mode==='drive'?'Brake':'Stop walking'):'Interact';
    put('street-interact',label);
  }
  function setView(next,scrollToMap=true) {
    districtDesk?.close();
    if(next!=='street'&&next!=='world')return;
    if(next!=='street')crewOrders?.cancel();
    const changed=next!==view;
    if (next!=='world' && !sim.active()) return;
    if(next!=='street' && view==='street') {arrivalVersion++;streetHud?.invalidate();street?.observePerson?.(null);agencyUI?.dismissReview();cancelPlacement();street?.cancelTravel?.();}
    view=next;syncLiveClock();
    document.body.dataset.mapView=view;
    const isStreet=view==='street',isWorld=view==='world';
    show('atlas-stage',isWorld);atlas.setActive?.(isWorld);show('street-stage',isStreet);show('street-controls',isStreet);show('street-actors',isStreet);
    show('site-inspector',isWorld);show('actions-panel',isStreet);
    for(const [id,isActive] of [['world-view',isWorld],['street-view',isStreet]]) {
      if(!$(id))continue;
      $(id).setAttribute('aria-pressed',String(isActive));
      $(id).classList.toggle('active',isActive);
    }
    if(isStreet) {
      if(!street) street=window.EarthStreet.mount($('street-canvas'),{
        getWeek:()=>sim.state.week,getWorld:()=>sim.state,
        getRegularRun:()=>sim.regularTruckView(),
        getTruckDispute:()=>sim.truckDisputeView?.(),
        onTruckDispute:(quote,proof)=>sim.perform('disputedTruck',quote,()=>view==='street'&&!document.hidden?proof():null),
        onNeighbourHelp:async(quote,proof)=>{
          const local=getStreet();
          const result=await sim.perform('neighbourAppointment',quote,()=>!document.hidden&&getStreet()===local?(proof?proof():local?.neighbourHelpProof?.(quote.actorId,quote.targetId)):null);
          if(result.ok&&getStreet()===local)redrawStreet();
          return result;
        },
        onRegularArrival:(quote,proof)=>sim.perform('regularTruck',quote,()=>view==='street'&&!document.hidden?proof():null),
        onObservation:seen=>streetHud?.setWatch(seen),onTruckInteract:()=>streetHud?.openTool('truck'),
        onBuilding:building=>{streetHud?.close(false);districtDesk?.inspectBuilding(building);},
        onTalkChoices:people=>streetHud?.openTalkChoices?.(people),
        onFishingMark:kind=>{if(streetHud?.openTool('fishing')){if(kind==='float')waterfrontUI?.act('line');else if(kind==='shoal')waterfrontUI?.act('shoal');}},
        onInteract:interactAt,onHandcart:()=>sceneWork(),onChooseCrewTarget:()=>crewOrders?.openTargets(),onAssignWorksite:id=>crewOrders?.assign(id),onCancelCrewSelection:()=>crewOrders?.cancel(),onPlace:point=>placeBuilding(point,true),onHint:text=>put('street-hint',text),
        onPlotPreview:plot=>{
          if(!placement)return;
          const preview=sim.previewBuild(placement.kind,plot);
          if($('actions-list').querySelector('.worksite-proposal'))works?.proposal($('actions-list'),placement,plot);
          put('street-hint',preview.available?preview.text+' Choose Commission on plot '+(plot+1)+' to start work.':preview.reason);
        },
        onStowLine:(id,castAt)=>sim.stowHandline(id,castAt),
        onState:state=>{
          districtPanel?.render();
          put('street-location',state.mode==='boat'?'Harbour waters':state.nearby?.label||'Local district');
          const driving=state.mode==='drive';
          updateStreetInteract(state);
          show('scene-van',state.mode!=='boat'&&state.vehicle!=='truck'&&!state.placement);
          put('scene-van',driving?'Exit van':state.boardingVan?'Walking to van…':'Enter van');
          const vehicle=$('street-vehicle');
          if(vehicle) {
            vehicle.setAttribute('aria-pressed',String(driving));
            vehicle.textContent=state.vehicle==='truck'?'Co-op truck controls':driving?'Leave public van':'Use public van';
            vehicle.setAttribute('title',state.vehicle==='truck'?'Open truck controls':driving?'Leave the public van':'Use the public van');
          }
          if(!state.placement && placement){placement=null;show('cancel-placement',false);renderActions();}
        }
      });
      const current=sim.active();
      put('street-title',current.name);street.setSite(current);
      // Older land saves can resume directly in Street view before the globe
      // opens. Classify the sea coast and freshwater shore from the small index.
      if((current.coastal==null||current.lakeShore==null) && !window.CommonEarthSim.waterfront(current) &&
        window.EarthAtlas.nearOceanShore?.(current.lat,current.lon)===null){
        window.EarthAtlas.geographyReady().then(()=>{
          if(view==='street'&&sim.active()===current&&window.CommonEarthSim.waterfront(current)){street?.setSite(current);render();}
        }).catch(()=>{ /* The atlas retries when next opened. */ });
      }
      requestAnimationFrame(()=>street.resize());
    } else requestAnimationFrame(()=>atlas.resize());
    render();
    if(changed && scrollToMap && stackedMap.matches) $(isStreet?'street-stage':'atlas-stage').scrollIntoView({block:'start',behavior:'instant'});
  }
  async function resumePartner(home,partnerId) {
    if(home.id!==sim.state.activeId){
      await openSite(home,'world');
      if(home.id!==sim.state.activeId)return;
    }
    const partner=window.EarthPartners?.get(sim.state,home,partnerId);
    if(!partner)return;
    choosePlace(partner);
    requestAnimationFrame(()=>{
      $('partner-inspector').scrollIntoView({block:'nearest',behavior:'instant'});
      $('partner-inspector').querySelector('button:not(:disabled)')?.focus({preventScroll:true});
    });
  }
  function travelFromAtlas(site){
    if(!site)return;
    const nearby=sim.state.communityLife&&window.EarthCommunityLife.neighbours(sim.state,sim.active()).some(n=>n.id===site.id);
    if(!nearby)return openSite(site);
    hideDialog('places-dialog');hideDialog('society-dialog');setView('street',false);
    if(streetHud?.openTool('neighbours'))districtPanel?.travelTo(site.id);
  }
  async function openSite(s,arrivalView='street') {
    if(!s) return;
    if(sim.state.communityLife?.outposts?.some(p=>p.id===s.id)){
      const entry=sim.state.sites.find(p=>p.id===s.communityLife?.cluster);
      if(!window.EarthCommunityLife.neighbours(sim.state,sim.active()).some(p=>p.id===s.id)&&entry)await openSite(entry,'street');
      hideDialog('places-dialog');hideDialog('society-dialog');setView('street',false);streetHud?.openTool('neighbours');
      districtPanel?.travelTo(s.id);return;
    }
    crewOrders?.cancel();
    const result=await sim.perform('visit',s.id,()=>street?.getState());
    if(result && !result.ok){presentResult(result);return;}
    const destination=sim.active();
    if(!destination || destination.id!==s.id)return;
    const sameStreet=view==='street' && arrivalView==='street';
    if(sameStreet){cancelPlacement();street?.cancelTravel?.();}
    visiting=null;peers=false;encounter=null;placement=null;viewingShift=false;group='people';
    selectPlace(destination,false);
    hideDialog('places-dialog');hideDialog('society-dialog');
    setView(arrivalView);
    if(sameStreet && stackedMap.matches)$('street-stage').scrollIntoView({block:'start',behavior:'instant'});
  }
  function validPreparedSurvey(draft){
    const p=draft?.point,sponsor=sim.state.sites.find(s=>s.id===draft?.sponsorId);
    return Boolean(sponsor && (sponsor.foundingRevision||0)===draft.generation &&
      sponsor.lat===draft.sponsorLat && sponsor.lon===draft.sponsorLon &&
      Number.isFinite(p?.lat) && Math.abs(p.lat)<=90 && Number.isFinite(p?.lon) && Math.abs(p.lon)<=180 &&
      typeof p.name==='string' && typeof p.water==='boolean' && !known(p) &&
      typeof draft.name==='string' && draft.name.length<=48 && typeof draft.commission==='boolean');
  }
  async function prepareFounding(){
    const sponsor=sim.state.sites.find(s=>s.id===foundingSponsor);
    if(!sponsor || preparingSurvey || !sim.foundingOffer(selected,foundingSponsor)?.preparation)return;
    const draft={point:{lat:selected.lat,lon:selected.lon,water:!!selected.water,name:selected.name||'Selected location',region:selected.region||''},
      sponsorId:sponsor.id,generation:sponsor.foundingRevision||0,sponsorLat:sponsor.lat,sponsorLon:sponsor.lon,
      name:$('found-name').value,commission:$('commission-at-founding').checked};
    preparedSurvey=draft;preparingSurvey=true;
    try{
      if(sponsor.id!==sim.state.activeId)await openSite(sponsor);
      else setView('street');
      if(sim.state.activeId!==sponsor.id || view!=='street' || preparedSurvey!==draft)return;
      // Visiting under a shared save lock may load work another player just finished.
      const step=sim.foundingOffer(draft.point,sponsor.id).preparation;
      if(!step){resumeFounding();return;}
      if(step.kind==='work'){personalWork?.open(step.key);return;}
      if(step.kind==='week'){reviewWeek();return;}
      if(step.kind==='actor'){$('street-actor')?.focus();return;}
      selectGroup('people');
      const person=sim.active().residents.find(p=>p.id===step.id);
      if(!person)return;
      if(street?.getState().mode==='boat'){
        street.toggleBoat();notify('Returning to shore. Choose Meet beside '+person.name+' in People.');return;
      }
      meetResident(person);
    }finally{preparingSurvey=false;}
  }
  function resumeFounding(){
    const draft=preparedSurvey;
    preparedSurvey=null;
    if(!validPreparedSurvey(draft)){setView('world');return;}
    selectPlace(draft.point,true);foundingSponsor=draft.sponsorId;
    $('found-name').value=draft.name;$('commission-at-founding').checked=draft.commission;
    setView('world',false);
    $('site-inspector').scrollIntoView({block:'start',behavior:'instant'});$('place-name').focus({preventScroll:true});
  }
  async function found() {
    if(known(selected)){openSite(known(selected));return;}
    const firstHome=sim.state.sites.length===0;
    const result=await sim.perform('found',{...selected},$('found-name').value.trim()||undefined,$('commission-at-founding')?.checked?'accept':'later',foundingSponsor??sim.state.activeId,()=>street?.getState(),{residentBallots:true});
    if(!presentResult(result))return;
    const site=sim.active();
    if(site){
      preparedSurvey=null;selected={...site};group='people';viewingShift=false;visiting=null;peers=false;encounter=null;
      setView('street');
      if(firstHome){clockPreference(true);liveClock?.start();rememberStreetSoon();}
    }
  }
  function selectGroup(next) {
    if(!groups[next])return;
    arrivalVersion++;crewOrders?.cancel();cancelPlacement();
    street?.cancelTravel?.();
    group=next;visiting=null;peers=false;encounter=null;viewingShift=false;
    renderActions();
  }
  function showPeople(page='residents') {
    arrivalVersion++;crewOrders?.cancel();
    street?.cancelTravel?.();
    visiting=null;encounter=null;
    peers=page==='projects';viewingShift=page==='shift';
    renderActions();
  }
  function cancelPlacement() {
    placement=null;street?.setPlacement(null);show('cancel-placement',false);
  }
  function liveVenue(venue){
    const expected=arrivalVersion,local=street,site=sim.active(),actor=window.EarthAgency?.actorId(site);
    return ()=>view==='street'&&local===street&&arrivalVersion===expected&&sim.state.activeId===site.id&&
      window.EarthAgency?.actorId(sim.active())===actor&&
      (venue.type==='resident'&&!venue.doorstep?Boolean(street.meeting(venue)):street.atStop(venue));
  }
  async function applyAction(action) {
    const venue=action.venue==='market'?{type:'market'}:
      action.residentId&&(action.group==='people'||action.venue==='resident')?{type:'resident',residentId:action.residentId}:null;
    const result=await sim.perform('act',action.id,undefined,action.group,venue?liveVenue(venue):null);
    if(presentResult(result)) {
      if(placement) cancelPlacement();
      street?.setSite(sim.active());
    }
    render();
    return result;
  }
  function confirmReclaim(plot) {
    const preview=sim.previewReclaim(plot),siteId=sim.state.activeId;
    if(!preview.available){notify(preview.reason,true);return;}
    const list=$('actions-list');list.replaceChildren(node('h3','',preview.label),node('p','action-description',preview.text));
    const start=button('Start dismantling and watch',async()=>{
      if(start.disabled)return;
      start.disabled=true;
      try{
        const result=await sim.perform('reclaim',plot,preview.buildingId);
        if(sim.state.activeId!==siteId)return;
        if(!presentResult(result)){render();return;}
        const job=works?.view().jobs.find(j=>j.kind==='dismantle'&&j.plot===plot);
        encounter=job?{type:'construction',jobId:job.id,plot}:null;
        street?.setSite(sim.active());render();
        if(job)watchWorksite(job.id);
      }finally{start.disabled=false;}
    },'action-button');
    list.append(start,button('Keep building',()=>renderActions(),'text-button'));
  }
  async function placeBuilding({plot},watch=false) {
    if(!placement||commissioning)return;
    const siteId=sim.state.activeId,action=placement;
    commissioning=true;
    try{
      const result=await sim.perform('act',action.id,plot,action.group);
      if(sim.state.activeId!==siteId)return;
      if(!presentResult(result)){render();return;}
      const stillChoosing=placement===action&&view==='street';
      const field=document.activeElement,editing=field?.matches('.worksite-role select');
      if(stillChoosing)cancelPlacement();
      const job=works?.view().jobs.find(j=>j.scope==='street'&&j.plot===plot);
      if(stillChoosing&&job)encounter={type:'construction',jobId:job.id,plot};
      street?.setSite(sim.active());render({keepCrewEditor:editing});
      if(editing&&stillChoosing){
        // A role menu opened while the save lock was pending takes precedence over changing views.
        const list=$('actions-list');
        for(const button of list.querySelectorAll('.plot-choice'))button.disabled=true;
        const roster=field.closest('.worksite-roster');
        const leave=event=>{
          if(roster.contains(event.relatedTarget))return;
          roster.removeEventListener('focusout',leave);
          queueMicrotask(()=>{if(roster.isConnected&&encounter?.jobId===job?.id)renderActions();});
        };
        roster.addEventListener('focusout',leave);
      }else if(stillChoosing&&job){
        if(watch)watchWorksite(job.id);
        else{
          const control=$('actions-list').querySelector('.worksite-actions button');
          control?.focus({preventScroll:true});control?.scrollIntoView({block:'nearest',behavior:'instant'});
        }
      }
    }finally{commissioning=false;}
  }
  function armCrewOrder(ids) {
    if(view!=='street')setView('street',false);
    if(street?.getState().mode==='boat'){
      crewOrders.cancel();
      notify('Return to shore to select a worksite on the map.',true);return;
    }
    cancelPlacement();
    street?.setCrewSelection?.(ids);if(street)updateStreetInteract(street.getState());
    requestAnimationFrame(()=>{
      if(!document.body.hasAttribute('data-crew-order'))return;
      street?.resize();street?.frameCrewTargets?.();
      $('street-stage').scrollIntoView({block:'start',behavior:'instant'});
      $('street-canvas').focus({preventScroll:true});
    });
  }
  function openWorksite(jobId) {
    arrivalVersion++;crewOrders?.cancel();
    const model=works?.view(),job=model?.jobs.find(j=>j.id===jobId);
    if(!job)return;
    cancelPlacement();group='build';visiting=null;peers=false;viewingShift=false;
    encounter={type:'construction',jobId:job.id,plot:job.plot};
    if(view!=='street')setView('street',false);
    else renderActions();
    focusActions();
  }
  function watchWorksite(jobId) {
    crewOrders?.cancel();
    const job=works?.view().jobs.find(j=>j.id===jobId);if(!job)return;
    if(view!=='street')setView('street',false);
    street?.focusWorksite?.(job.id);
    $('street-stage').scrollIntoView({block:'start',behavior:'instant'});
    $('street-canvas').focus({preventScroll:true});
  }
  function workRate(site,model) {
    if(!site)return '';
    const goods=['food','materials','funds'];
    const delta=model?Object.fromEntries(goods.map(key=>[key,model.workers.reduce((sum,w)=>sum+(w.weeklyDelta?.[key]||0),0)])):
      window.EarthConstruction?.weeklyAdjustment(site,sim.state)||{};
    return site.id+'/'+goods.map(key=>delta[key]||0).join(',');
  }
  function networkWorkRates(currentModel) {
    return sim.state.sites.map(site=>workRate(site,site.id===sim.state.activeId?currentModel:null)).join('|');
  }
  function refreshWorksites(model=works?.view(),forecastAlreadyRendered=false) {
    if(!model)return;
    const rate=workRate(sim.active(),model);
    if(rate!==localWorkRate && !forecastAlreadyRendered)put('forecast',sim.forecast?.()||sim.overview().forecast);
    localWorkRate=rate;
    const readingPreview=$('week-summary')?.closest('details')?.open,readingGoal=$('goal-details')?.open&&sim.state.learningGoals?.active;
    const readingCourse=lifePanel?.readingCalendar();
    if(readingPreview||readingGoal||readingCourse){
      const rates=networkWorkRates(model);
      if(readingPreview&&!forecastAlreadyRendered&&rates!==previewWorkRates){previewWorkRates=rates;renderForecastValues();}
      if(readingGoal&&rates!==goalWorkRates){goalWorkRates=rates;if(!forecastAlreadyRendered)learning?.render();}
      if(readingCourse&&rates!==courseWorkRates){courseWorkRates=rates;if(!forecastAlreadyRendered)lifePanel.refreshCalendar();}
    }
    if(!readingGoal)goalWorkRates='';
    if(!readingCourse)courseWorkRates='';
    crewOrders?.update(model);
    if(view==='street'){
      street?.setConstruction?.(model);
      const jobs=model.jobs,hud=$('street-works'),loadIssue=!jobs.length&&sim.worksiteLoadIssue?.(sim.active());
      hud.hidden=!jobs.length&&!loadIssue;
      show('street-work-label',!!jobs.length||!!loadIssue);
      if(jobs.length){
        const label=jobs.length===1?jobs[0].name+' · '+Math.floor(jobs[0].progress*100)+'%':jobs.length+' active worksites';
        put('street-work-label',label+' ↗');
        hud.setAttribute('aria-label','Inspect '+label);
      }else if(loadIssue){
        put('street-work-label','Saved work · Reload needed ↗');
        hud.setAttribute('aria-label','Inspect saved work. '+loadIssue);
      }
      works.update($('actions-list'),model);
    }
  }
  function worksiteChanged(result,preference=false) {
    if(preference){
      refreshWorksites();
      if(result?.ok){
        if(placement){works?.proposal($('actions-list'),placement,street?.getState().plot);works?.updateLots($('actions-list'),placement);}
        planning?.render();
      }
      return;
    }
    if(result?.ok && encounter?.type==='construction'&&!works.view().jobs.some(j=>j.id===encounter.jobId))encounter=null;
    street?.setSite(sim.active());render();
  }
  function quayProof(){
    const state=getStreet()?.getState();
    return state?.waterfront&&state.mode==='walk'&&!state.seated&&!state.placement&&
      state.x>=-.7&&state.x<=24.7&&state.y>=23.1&&state.y<=25.25?{...state,target:'quay'}:null;
  }
  function meetQuay(arrive){
    const local=getStreet(),site=sim.active(),actor=window.EarthAgency?.actorId(site),week=sim.state.week;
    if(!local||!site||local.getState().vehicle==='truck'||!local.getState().waterfront)return false;
    const trip=++arrivalVersion;
    if(quayProof()){local.cancelTravel?.();arrive();return true;}
    const started=local.approachFishing('shore',()=>{
      if(getStreet()===local&&sim.active()?.id===site.id&&window.EarthAgency?.actorId(sim.active())===actor&&
        sim.state.week===week&&arrivalVersion===trip&&quayProof())arrive();
    });
    if(started){notify('Travelling to the quay.');followStreet();}
    return started;
  }
  function atVenue(venue, destination, act) {
    if(street.getState().mode==='boat'){notify('Return to shore to reach '+destination+'.',true);return false;}
    const siteId=sim.state.activeId,week=sim.state.week,version=++arrivalVersion;
    if(street.atStop(venue)){
      street.cancelTravel?.();
      act(venue,false);
      return true;
    }
    notify('On the way to '+destination+'.');
    const routed=street.focusStop(venue,event=>{
      if(version!==arrivalVersion||view!=='street'||sim.state.activeId!==siteId)return;
      if(sim.state.week!==week){interactAt(event);return;}
      act(event,true);
    });
    if(routed)followStreet();
    else notify('Could not reach '+destination+'. Choose a new route on the district map.',true);
    return routed;
  }
  function meetResident(person,act=interactAt) {
    if(!person)return;
    if(person.id===sim.active()?.agency?.actor){notify('You are playing as '+person.name+'. Switch characters to meet them.');return;}
    const venue={type:'resident',residentId:person.id};
    if(sim.active().shift?.residentId===person.id && street.meeting(venue,true)){
      street.cancelTravel?.();act(venue,false);return;
    }
    if(street.getState().mode==='drive')street.toggleVehicle();
    atVenue(venue,person.name,act);
  }
  function meetForLife(ref,name,arrive){
    if(view!=='street'||!street)return false;
    const local=street,site=sim.active(),week=sim.state.week,trip=++arrivalVersion;
    if(local.getState().mode==='drive')local.toggleVehicle();
    if(local.getState().mode!=='walk')return false;
    local.cancelTravel?.();
    if(local.meeting(ref,true)){arrive();return true;}
    const started=local.focusStop(ref,()=>{
      if(view==='street'&&street===local&&sim.active()?.id===site.id&&sim.state.week===week&&arrivalVersion===trip)arrive();
    });
    if(started){notify('Walking to '+name+'.');followStreet();}
    return started;
  }
  function requestAction(action,keyboard=false) {
    crewOrders?.cancel();
    if(!action.available) {notify(action.reason || 'This choice is currently unavailable.',true);return;}
    if(action.id.startsWith('reclaim:')){confirmReclaim(action.plot);return;}
    if(action.group==='build') {
      if(street.getState().mode==='boat'){notify('Return to shore to choose a building plot.',true);return;}
      const plan=sim.buildPlanView();
      placement=action;street.setPlacement(action.kind||action.id.split(':').pop(),plan?.kind===action.kind?plan.plot:null);
      show('cancel-placement',true);
      notify('Choose a plot for '+action.label+'. Tap a lot to preview, or commission it from the list.');
      renderActions();
      const first=keyboard&&$('actions-list').querySelector('.plot-choice:not(:disabled)');
      if(first){first.focus({preventScroll:true});first.scrollIntoView({block:'nearest',behavior:'instant'});}
      else inView('street-stage');
      return;
    }
    if(action.venue==='market'||action.residentId&&(action.group==='people'||action.venue==='resident')){
      const onArrival=async(event,travelled)=>{
        openEncounter(event);
        await applyAction(action);
        if(travelled)focusActions();
      };
      if(action.venue==='market')atVenue({type:'market'},'the market',onArrival);
      else meetResident(sim.active().residents.find(p=>p.id===action.residentId),onArrival);
      return;
    }
    applyAction(action);
  }
  function openEncounter(event) {
    arrivalVersion++;crewOrders?.cancel();
    cancelPlacement();
    encounter=event;peers=false;viewingShift=false;
    visiting=event.type==='resident'?event.residentId:null;
    if(event.type==='resident'||event.type==='npc')group='people';
    else if(event.type==='market')group='work';
    else if(event.type==='building'||event.type==='construction')group='build';
  }
  function interactAt(event) {
    if(view!=='street'||!sim.active()||!['npc','resident','market','building','construction'].includes(event.type))return;
    openEncounter(event);
    if((event.type==='npc'||event.type==='resident')&&streetHud?.openTalk(event))return;
    if(event.type==='market'&&localMarket&&streetHud?.openTool('stores'))return;
    renderActions();focusActions();
  }
  function visitShiftStop(stop,day) {
    atVenue(stop.venue,stop.venueName,async event=>{
      encounter=event;group='people';visiting=day.residentId;peers=false;viewingShift=true;
      if(!stop.current){presentResult(await sim.perform('arriveShift',stop.id,liveVenue(stop.venue)));street.setSite(sim.active());}
      render();focusActions();
    });
  }
  const portraits=new WeakMap();
  function portrait(site,person) {
    const saved=portraits.get(person);
    if(saved)return saved;
    const canvas=node('canvas','resident-portrait');canvas.width=48;canvas.height=48;
    canvas.setAttribute('aria-hidden','true');window.EarthStreet.portrait(canvas,site,person);portraits.set(person,canvas);return canvas;
  }
  function actionRow(a) {
    const card=node('article','action-card');
    const title=node('strong','action-label',a.label);
    const descriptor=node('p','action-description',a.description||'');
    const verb=a.id.split(':')[0];
    const labels={listen:'Hear priorities',promise:'Make promise',fulfil:'Deliver supplies',revise:'Agree new terms',together:'Propose project',agreement:'Agree',build:'Choose plot',reclaim:'Review',research:'Research',route:'Open route',vote:'Vote',charter:'Adopt charter',work:'Work'};
    let label=labels[verb]||'Choose';
    if(a.id==='agreement:check')label='Check in';
    if(a.venue==='market')label=street?.atStop({type:'market'})?'Collect parcel':'Go & collect';
    if(a.venue==='resident')label=(sim.active()?.shift?.residentId===a.residentId||street?.atStop({type:'resident',residentId:a.residentId}))?'Hand over parcel':'Go & deliver';
    const resourceGate=!a.available && a.blocker==='supplies';
    const call=button(a.available?label:(a.blocker==='effort'?'Needs effort':resourceGate?'Needs supplies':'Locked'),event=>requestAction(a,event.detail===0&&!event.pointerType),'action-button');
    call.disabled=!a.available;
    call.setAttribute('aria-label',a.label);call.dataset.action=a.id;
    card.append(title,descriptor);
    const costs=[a.cost+' civic effort',...Object.entries(a.goods||{}).map(([key,value])=>value+' '+key)];
    card.append(node('small','action-cost',a.group==='work'?
      (a.id==='courier:pick'?'Paid on delivery':'On completion')+' · 1 personal fund · 1 development point · restore 1 civic effort (up to 4)':costs.join(' · ')));
    if(!a.available&&a.reason)card.append(node('small','action-reason',a.reason));
    card.append(call);
    const site=sim.active();
    if(resourceGate && verb!=='build' && personalWork){
      const gap=Object.entries(a.goods).find(([key,n])=>site[key]<n);
      if(gap)card.append(button('Find '+gap[0],()=>{if(view!=='street')setView('street',false);personalWork.open(gap[0]);},'text-button plan-link'));
    }
    if(a.pinnable && site.buildPlan!==a.kind){
      const pin=button(site.buildPlan?'Replace pinned plan':'Pin plan',()=>changeBuildPlan(site.id,a.kind,site.buildPlan||null),'text-button plan-link');
      pin.setAttribute('aria-label','Pin plan for '+a.label);
      card.append(pin);
    }
    return card;
  }
  async function changeBuildPlan(siteId,kind,expected){
    const result=await sim.perform('setBuildPlan',siteId,kind,expected);
    presentResult(result);render();
    if(result.ok && kind)$('build-plan')?.scrollIntoView({block:'nearest',behavior:'instant'});
  }
  function reviewWeek(){
    const preview=$('week-summary')?.closest('details');
    if(preview){preview.open=true;renderForecast();}
    const target=preview?.querySelector('summary')||$('advance-week');
    target.focus({preventScroll:true});target.scrollIntoView({block:'center',behavior:'instant'});
  }
  let lastPlanKey='',surveySite='',surveyRevision='';
  function surveyPlan(){
    if(!$('build-plan-survey')?.open)return;
    const site=sim.active(),plan=sim.buildPlanView();
    if(!plan)return;
    const selector=$('build-plan-lot');
    const lots=new Map(site.buildings.map(b=>[b.plot,b.name]));
    for(const job of site.construction||[])if(job.scope==='street')lots.set(job.plot,job.name+' worksite');
    const revision=JSON.stringify([site.id,plan.kind,[...lots],plan.plot]);
    if(revision!==surveyRevision){
      const previous=selector.value,identity=site.id+'/'+plan.kind;
      const options=Array.from({length:9},(_,plot)=>{
        const opt=node('option','', 'Lot '+(plot+1)+(lots.has(plot)?' · '+lots.get(plot):plot===plan.plot?' · marked':' · open'));
        opt.value=String(plot);return opt;
      });
      selector.replaceChildren(...options);
      selector.value=String(plan.plot??(surveySite===identity && previous!==''?previous:options.find(o=>!lots.has(Number(o.value)))?.value||0));
      surveyRevision=revision;surveySite=identity;
    }
    const plot=Number(selector.value),preview=sim.previewBuild(plan.kind,plot);
    put('build-plan-yield',preview.ok?preview.text:(lots.get(plot)||'Occupied')+' uses this lot. Choose an open lot to compare.');
    put('build-plan-mark',plan.plot===plot?'Marked for this plan':'Mark lot '+(plot+1));
    $('build-plan-mark').disabled=!preview.ok || plan.plot===plot;
  }
  listen('build-plan-survey','toggle',surveyPlan);
  listen('build-plan-lot','change',surveyPlan);
  listen('build-plan-mark','click',async()=>{
    const site=sim.active(),plan=sim.buildPlanView();
    if(!plan)return;
    const result=await sim.perform('markPlanLot',site.id,plan.kind,Number($('build-plan-lot').value),plan.plot);
    presentResult(result);render();
  });
  function renderBuildPlan(){
    const panel=$('build-plan'),site=sim.active(),plan=sim.buildPlanView?.();
    if(!panel)return;
    panel.hidden=!plan;
    if(!plan){lastPlanKey='';surveySite='';surveyRevision='';$('build-plan-survey').open=false;return;}
    surveyPlan();
    const key=JSON.stringify([site.id,plan,sim.state.effort===0]);
    if(lastPlanKey===key)return;
    lastPlanKey=key;
    put('build-plan-name','Building plan · '+plan.name+(plan.plot!=null?' · Lot '+(plan.plot+1):''));
    const terms=Object.entries(plan.goods).map(([k,n])=>Math.min(site[k],n)+'/'+n+' '+k).join(' · ');
    put('build-plan-status',terms+' · 1 civic effort'+(plan.gate?' · '+plan.gate:plan.occupied?' · Marked lot now occupied. Compare lots to choose another.':''));
    const steps=$('build-plan-steps');steps.replaceChildren();
    const add=(label,act)=>steps.append(button(label,act,'text-button'));
    if(plan.gate){
      if(plan.next==='lots'){
        add('Review occupied lots',()=>{selectGroup('build');const detail=$('actions-list').querySelector('.lot-review');if(detail){detail.open=true;detail.scrollIntoView({block:'center'});}else focusActions();});
      }else if(plan.next==='research')add('Review apprenticeship',()=>{researchPage='eras';selectGroup('research');focusActions();});
    }else if(plan.ready){
      add(plan.plot!=null && !plan.occupied?'Review lot '+(plan.plot+1):'Choose a plot',()=>{selectGroup('build');const action=sim.actions('build').find(a=>a.kind===plan.kind);if(action)requestAction(action);});
    }else{
      for(const gap of plan.missing)add((gap.key==='funds'?'Earn ':'Recover ')+gap.amount+' '+gap.key,()=>personalWork?.open(gap.key));
      if(!sim.state.effort)add('Review next week',reviewWeek);
    }
    add('Unpin',()=>changeBuildPlan(site.id,null,plan.kind));
  }
  function actionContext(){return [sim.state.activeId,group,visiting,peers,researchPage,councilPage].join('/');}
  function addConversation(list,ref){
    const id=ref.residentId||ref.npcId,site=sim.active(),person=site&&window.EarthAgency?.identity(site,id);
    if(!person||id===window.EarthAgency.actorId(site))return;
    if(!streetHud||!$('scene-topics')){agencyUI?.conversation(list,ref);return;}
    const siteId=site.id,actor=window.EarthAgency.actorId(site);
    list.append(button('Speak with '+person.name+' in Street view',()=>{
      if(view!=='street'||sim.active()?.id!==siteId||window.EarthAgency.actorId(sim.active())!==actor)return;
      if(streetHud.openTalk(ref))$('street-stage').scrollIntoView({block:'start',behavior:'instant'});
    },'secondary-button'));
  }
  function renderActions(workModel) {
    if(outcomeContext && outcomeContext!==actionContext()){
      show('action-outcome',false);put('action-outcome','');outcomeContext='';
    }
    const site=sim.active();
    if(!site || view!=='street') return;
    const list=$('actions-list');
    const panelKey=[site.id,group,placement?.kind,visiting,peers,encounter?.jobId||encounter?.plot,
      viewingShift&&site.shift?site.shift.stopId||'round':'',researchPage,councilPage].join('/');
    const samePanel=list.dataset.panelKey===panelKey;
    if(!samePanel){list.scrollTop=0;list.dataset.panelKey=panelKey;}
    const openDisclosures=samePanel?Array.from(list.querySelectorAll('details[data-worksite-disclosure][open]'),el=>el.dataset.worksiteDisclosure):[];
    const previous=samePanel&&list.contains(document.activeElement)?document.activeElement.dataset.action:null;
    if(previous)requestAnimationFrame(()=>{
      if(document.activeElement!==document.body && document.activeElement!==list)return;
      const retained=Array.from(list.querySelectorAll('[data-action]')).find(b=>b.dataset.action===previous&&!b.disabled);
      (retained||$('actions-heading'))?.focus({preventScroll:true});
    });
    if(openDisclosures.length)queueMicrotask(()=>{
      for(const detail of list.querySelectorAll('details[data-worksite-disclosure]')){
        if(openDisclosures.includes(detail.dataset.worksiteDisclosure))detail.open=true;
      }
    });
    list.replaceChildren();
    for(const tab of controls($('action-tabs'),'[data-group]')) {
      const active=tab.dataset.group===group;
      tab.setAttribute('aria-pressed',String(active));tab.classList.toggle('active',active);
    }
    put('actions-heading',groups[group]);
    if(group!=='work'&&sim.state.communityLife&&!window.EarthCommunityLife.isHome(sim.state,site)){
      show('decision-context',false);
      put('actions-heading','Visiting '+site.name);
      list.append(node('p','action-description',site.residents[2].name+' and the residents govern this district. You can speak to people, inspect their goals, work a trial shift or apply to join.'),
        button('Talk to a resident',()=>streetHud?.openTool('talk'),'secondary-button'),
        button('Review membership and nearby paths',()=>streetHud?.openTool('neighbours'),'secondary-button'));
      return;
    }
    if(placement) {
      show('decision-context',false);
      put('actions-heading','Choose a plot');
      list.append(node('p','action-description',placement.label+' · Tap a vacant plot to preview, then tap it again to commission. Choosing a plot below commissions it immediately.'),
        node('p','action-cost',[placement.cost+' effort',...Object.entries(placement.goods||{}).map(([key,value])=>value+' '+key)].join(' · ')));
      works?.proposal(list,placement,street?.getState().plot);
      const grid=node('div','quick-picks');
      for(let plot=0;plot<9;plot++){
        const preview=sim.previewBuild(placement.kind,plot);
        const b=button('',event=>placeBuilding({plot},event.detail>0||!!event.pointerType),'plot-choice');
        b.append(node('strong','',preview.ok?'Commission '+(plot+1):'Plot '+(plot+1)),
          node('small','',preview.ok?preview.forecast:'Occupied'));
        if(preview.fulfilled?.length)b.append(node('small','','Helps '+preview.fulfilled.join(' and ')+' when opened.'));
        b.setAttribute('title',preview.text);
        const description=preview.ok?'Commission '+placement.label+' on '+preview.text:preview.text;
        b.setAttribute('aria-label',description);
        if(preview.available&&works){
          const estimate=node('small','plot-crew');estimate.dataset.plotEstimate=String(plot);
          b.dataset.plotDescription=description;b.append(estimate);
        }
        b.disabled=!preview.available;
        grid.append(b);
      }
      works?.updateLots(grid,placement);
      list.append(grid,button('Cancel placement',()=>{cancelPlacement();renderActions();}));
      if(works)works.roster(list,workModel||works.view());
      return;
    }
    if(works && group==='build' && encounter?.type==='construction'){
      show('decision-context',false);
      const model=workModel||works.view(),job=model.jobs.find(j=>j.id===encounter.jobId);
      if(job){
        put('actions-heading','Worksite');
        list.append(works.jobCard(job,true,model));
        works.roster(list,model,{open:true});
      }else if(lastOpening?.id===encounter.jobId){
        put('actions-heading',lastOpening.name||'Worksite');
        list.append(node('p','action-description',lastOpening.message||(lastOpening.kind==='dismantle'?'The crew cleared the plot.':'The crew finished construction.')));
        works.roster(list,model,{open:true});
      }
      list.append(button('← All building projects',()=>selectGroup('build'),'text-button'));
      return;
    }
    const context=$('decision-context');
    if(context) {
      const notes=[];
      if(group==='council') {
        if(site.issue && councilPage==='agenda') notes.push(site.issue.title+' · Vote by week '+site.issue.deadline+'. '+site.issue.prompt);
        if(sim.state.charter && councilPage==='agenda') notes.push('Charter: '+sim.overview().charter.name+'. '+sim.overview().charter.text);
        for(const pending of site.pending) notes.push('The effects of a council vote will be known in week '+pending.week+'.');
        if(!site.issue && sim.state.charter && !site.pending.length) notes.push('The council has no open vote this week.');
      } else if(group==='routes') {
        for(const r of sim.state.routes.filter(r=>r.from===site.id||r.to===site.id)) {
          const target=sim.state.sites.find(s=>s.id===(r.from===site.id?r.to:r.from));
          notes.push(target.name+' · '+r.lastStatus);
        }
      } else if(group==='people') {
        for(const p of site.residents.filter(r=>r.promise)) notes.push('Promise to '+p.name+' · due week '+p.promise.dueWeek+'.');
      } else if(group==='work'&&site.delivery) {
        const person=site.residents.find(r=>r.id===site.delivery.residentId);
        notes.push('Parcel for '+person.name+(site.shift?.residentId===person.id?' · travelling with you.':' · choose Go & deliver to reach their current location.'));
      }
      context.replaceChildren(...notes.map(t=>node('p','',t)));context.hidden=!notes.length;
    }
    const day=window.EarthShifts?.view(site,sim.state.week);
    if(day&&viewingShift&&group==='people'){
      renderShift(list,site,day);return;
    }
    if(day){
      const stops=encounter?day.stops.filter(s=>(s.available||s.current)&&!s.visited&&window.EarthShifts.matches(s.venue,encounter)):[];
      for(const stop of stops)list.append(button('Join '+day.name+' · '+stop.label,()=>visitShiftStop(stop,day),'secondary-button'));
      if(group==='people')list.append(button('Resume day with '+day.name,()=>showPeople('shift'),'secondary-button'));
    }
    if(group==='people') {
      if(encounter?.type==='npc'&&!peers){
        put('actions-heading',encounter.label);
        list.append(button('All residents',()=>showPeople(),'text-button'));
        if(lifePanel)list.append(button('View character life',()=>lifePanel.open(encounter.npcId),'text-button'));
        addConversation(list,encounter);return;
      }
      const person=site.residents.find(r=>r.id===visiting);
      if(peers && window.EarthNeighbours){
        const work=window.EarthNeighbours.summary(site);
        put('actions-heading',work.title);
        list.append(button('← All residents',()=>showPeople(),'text-button'),node('p','action-description',work.body));
        const links=node('ul','peer-links');
        for(const pair of work.links){
          const link=node('li','',pair.names.join(' & ')+' · '+pair.status);
          if(pair.handover)link.append(node('small','peer-agreement',pair.handover));
          links.append(link);
        }
        list.append(links);
        const actions=sim.actions(group);
        const projectActions=actions.filter(a=>a.peerProject);
        if(projectActions.some(a=>a.id.startsWith('together:'))){
          for(const resident of site.residents.filter(p=>!p.heard)){
            const action=actions.find(a=>a.id==='listen:'+resident.id);
            if(!action)continue;
            const intro=button('Listen to '+resident.name+' · '+action.cost+' effort',()=>meetResident(resident,async(_event,travelled)=>{
              await applyAction(action);
              if(travelled)focusActions();
            }),'secondary-button');
            intro.disabled=!action.available;
            if(action.reason)intro.title=action.reason;
            list.append(intro);
          }
        }
        for(const a of projectActions)list.append(actionRow(a));
        if(work.history.length)list.append(node('p','resident-line',work.history[0].text));
        return;
      }
      if(!person) {
        list.append(node('p','action-description','Choose a resident to meet. Listen to hear what they need and how you can help.'));
        const currentWork=workModel||works?.view();
        for(const r of site.residents) {
          const item=node('article','action-card resident-card');
          if(window.EarthStreet.portrait)item.append(portrait(site,r));
          const status=r.promise?'Promise due week '+r.promise.dueWeek:r.heard?'Bond '+r.bond:'Ready to meet';
          const parcel=site.delivery?.residentId===r.id?' · awaiting parcel':'';
          const company=day?.residentId===r.id?' · with you':'';
          const info=node('p','action-description',(window.EarthCareers?.role(site,r.id)||r.role)+' · '+status+parcel+company);
          if(currentWork)info.append(works.residentSummary(r,currentWork));
          item.append(node('strong','action-label',r.name),info);
          if(r.id===site.agency?.actor)item.append(node('small','resident-line','Playing as '+r.name));
          else item.append(button('Meet '+r.name,()=>meetResident(r),'action-button'));
          if(lifePanel)item.append(button('View character life',()=>lifePanel.open(r.id),'text-button'));
          list.append(item);
        }
        agencyUI?.localsList(list,person=>{
          if(street.getState().mode==='drive')street.toggleVehicle();
          atVenue(person,person.label,interactAt);
        });
        if(window.EarthNeighbours)list.append(button('Shared projects between neighbours →',()=>showPeople('projects'),'secondary-button'));
        return;
      }
      list.append(button('← All residents',()=>showPeople(),'text-button'));
      put('actions-heading',person.name);
      const bio=node('div','resident-bio');
      if(window.EarthStreet.portrait)bio.append(portrait(site,person));
      const identity=node('p','resident-line',(window.EarthCareers?.role(site,person.id)||person.role)+' · '+person.value+' · Bond '+person.bond);
      const model=workModel||works?.view();
      if(works)identity.append(works.residentSummary(person,model));
      bio.append(identity);list.append(bio);
      if(lifePanel)list.append(button('View character life',()=>lifePanel.open(person.id),'text-button'));
      addConversation(list,{type:'resident',residentId:person.id});
      const delivery=(sim.actions('work')||[]).find(a=>a.id==='courier:deliver:'+person.id);
      if(delivery)list.append(actionRow(delivery));
      for(const a of sim.actions(group).filter(a=>a.residentId===person.id||a.id.includes(':'+person.id)))list.append(actionRow(a));
      if(works)works.roster(list,model,{personId:person.id});
      if(window.EarthNeighbours)list.append(button('Shared projects with other residents',()=>showPeople('projects'),'secondary-button'));
      if(window.EarthShifts&&!day){
        const gate=window.EarthShifts.gate(sim.state,site,person.id);
        const card=node('article','action-card');
        card.append(node('strong','action-label','A day with '+person.name),node('p','action-description','Join their six-hour round. Choose how to fit in paid work, care and their own plans.'));
        const b=button('Spend a day together',()=>atVenue({type:'resident',residentId:person.id},person.name,async event=>{
          if(presentResult(await sim.perform('beginShift',person.id,liveVenue({type:'resident',residentId:person.id})))){
            encounter=event;viewingShift=true;street.setSite(sim.active());render();focusActions();
          }
        }),'action-button');b.dataset.action='begin-day';b.disabled=!gate.available;if(!gate.available)card.append(node('small','action-reason',gate.reason));card.append(b);list.append(card);
      }
    } else {
      const actions=sim.actions(group);
      if(works && group==='build'){
        if(districtDesk)list.append(button('Neighbourhood projects',()=>streetHud.openTool('precinct'),'secondary-button'));
        const model=workModel||works.view();
        works.jobList(list,model);
        works.roster(list,model);
      }
      if(encounter?.type==='building'&&group==='build') {
        list.append(node('p','resident-line',encounter.label+' · Plot '+(encounter.plot+1)),button('Review dismantling',()=>confirmReclaim(encounter.plot),'text-button'));
      }
      if(group==='council' && window.EarthCampaigns) {
        const commission=window.EarthCampaigns.summary(sim.state,site);
        const legacy=window.EarthLegacy?.summary(sim.state,site);
        const pages=[['agenda','Agenda & charter'],['commission','Local commission']];
        if(legacy?.unlocked)pages.push(['legacy','Succession']);
        if(councilPage==='legacy'&&!legacy?.unlocked)councilPage='agenda';
        const choices=subnav(list,pages,councilPage,next=>{councilPage=next;renderActions();});
        if(choices==='agenda'&&sim.state.charter){
          const progress=window.EarthLegacy?.charterProgress?.(sim.state);
          if(progress){
            const details=node('details','charter-progress');details.open=progress.priority&&!progress.ratified;
            details.append(node('summary','','Charter progress'));
            for(const item of progress.rows){
              const row=node('div','charter-milestone');
              row.append(node('strong','',(item.met?'Met · ':'')+item.label),node('p','',item.detail));
              if(!item.met&&item.action)row.append(button(item.action.label,()=>followCharter(item.action),'text-button'));
              details.append(row);
            }
            list.append(details);
          }
        }
        if(choices==='legacy'){
          list.append(node('h3','',legacy.title),node('p','action-description',legacy.description));
          if(legacy.current)list.append(node('p','resident-line',legacy.current));
          if(legacy.comparison)list.append(node('p','action-description',legacy.comparison));
          for(const entry of legacy.decisions)list.append(node('p','action-description',entry));
          for(const archive of legacy.archives||[]){
            const history=node('details','shift-guide');history.append(node('summary','',archive.title));
            for(const entry of archive.lines)history.append(node('p','action-description',entry));list.append(history);
          }
        }
        if(choices==='commission'){
          list.append(node('h3','',commission.title),node('p','action-description',commission.brief),node('p','resident-line',commission.question));
          if(['active','ready','trial'].includes(commission.phase)){
            list.append(node('p','action-description',commission.requesters));
            const ms=node('ul','peer-links');
            for(const m of commission.milestones)ms.append(node('li','',(m.met?'Complete · ':'Open · ')+m.label+'. '+m.detail));
            list.append(ms,node('p','voyage-note',commission.support));
            if(commission.testimony.length){
              const voices=node('details','shift-guide');voices.append(node('summary','','What the residents said'));
              for(const voice of commission.testimony)voices.append(node('p','resident-line',voice.name+' · “'+voice.text+'”'));
              list.append(voices);
            }
          }
          if(commission.reviewWeek)list.append(node('p','', 'Council review in week '+commission.reviewWeek+'.'));
          if(commission.outcome)list.append(node('p','resident-line',commission.outcome));
        }
        for(const a of actions.filter(a=>choices==='legacy'?a.legacy:choices==='commission'?a.campaign:!a.campaign&&!a.legacy))list.append(actionRow(a));
        return;
      }
      if(group==='research'&&window.EarthStrategy){
        const summary=window.EarthStrategy.summary(sim.state,site);
        subnav(list,[['eras','Eras'],['roster','Crews'],['schools','Schools']],researchPage,next=>{researchPage=next;renderActions();});
        if(researchPage==='roster'){
          const ul=node('ul','peer-links');
          for(const crew of summary.crews){
            const delta=crew.delta>0?'+'+crew.delta:String(crew.delta);
            ul.append(node('li','',crew.name+' · '+crew.count+' · '+crew.lead+'. '+crew.yield+' · Current change '+delta+' versus balanced.'));
          }
          list.append(ul,node('p','resident-line',summary.rotation));
        } else if(researchPage==='schools'){
          if(summary.lesson)list.append(node('p','resident-line',summary.lesson));
          for(const school of summary.schools)list.append(node('p','action-description',school.name+' · '+school.status+' '+school.effect));
          if(summary.schools.some(s=>s.id==='larder'&&['learned','operating'].includes(s.state)))list.append(node('p','action-cost','Larder reserve '+summary.reserve+' / 6 food.'));
        }
        const filtered=actions.filter(a=>researchPage==='eras'?!a.strategyKind:researchPage==='roster'?a.strategyKind==='roster':['study','exchange'].includes(a.strategyKind));
        for(const a of filtered)list.append(actionRow(a));
        if(!filtered.length && researchPage==='eras')list.append(node('p','empty-state','All local eras have been reached.'));
        return;
      }
      const availableActions=actions.filter(a=>!a.partner);
      if(group==='work')availableActions.sort((a,b)=>Number(b.id.startsWith('courier:'))-Number(a.id.startsWith('courier:')));
      if(group==='routes'&&window.EarthPartners){
        list.append(button('Explore independent neighbours',()=>{
          $('society-open').click();
          requestAnimationFrame(()=>$('partner-list').querySelector('button')?.focus());
        },'secondary-button'));
      }
      const reclaim=availableActions.filter(a=>a.id.startsWith('reclaim:'));
      for(const action of availableActions){
        if(!action.id.startsWith('reclaim:'))list.append(actionRow(action));
      }
      if(reclaim.length){
        const lots=node('details','shift-guide lot-review');lots.open=site.buildings.length===9;
        lots.append(node('summary','','Review buildings to dismantle'));
        for(const action of reclaim)lots.append(actionRow(action));
        list.append(lots);
      }
      if(!availableActions.length) {
        const text=group==='routes' ? (sim.state.sites.length>1?'All available partners are linked.':'Found a second community on the Earth atlas to plan an exchange.') : group==='research'?'This community has completed its research.':group==='council'?'The next agenda opens as weeks pass.':'More choices open as the community develops.';
        list.append(node('p','empty-state',text));
      }
    }
  }
  function subnav(parent,options,active,change) {
    const bar=node('div','action-subnav');bar.setAttribute('role','group');
    for(const [id,label] of options){const b=button(label,()=>change(id),'place-chip');b.setAttribute('aria-pressed',String(id===active));bar.append(b);}
    parent.append(bar);return active;
  }
  function renderShift(list,site,day) {
    put('actions-heading',day.title);
    list.append(button('← All residents',()=>showPeople(),'text-button'));
    list.append(node('p','resident-line',day.name+' · '+day.clock+' · '+day.timeLeft+' left'),node('p','action-description',day.brief),
      node('p','action-cost',day.householdLabel),node('p','action-description',day.priorityLabel));
    const guide=node('details','shift-guide');guide.append(node('summary','','How the day works'),node('p','',day.guide));list.append(guide);
    if(day.currentStopId){
      const current=day.stops.find(s=>s.id===day.currentStopId);
      list.append(node('h3','',current.label),node('p','action-description',current.detail));
      for(const option of day.choices){
        const card=node('article','action-card');
        card.append(node('strong','action-label',option.label),node('p','action-description',option.detail),node('small','action-cost',option.available?option.terms:option.reason));
        const b=button('Choose',()=>atVenue(current.venue,current.venueName,async event=>{
          encounter=event;
          if(presentResult(await sim.perform('chooseShift',option.id))){street.setSite(sim.active());render();focusActions();}
        }),'action-button');
        b.setAttribute('aria-label',option.label);b.disabled=!option.available;card.append(b);list.append(card);
      }
    }
    for(const stop of day.stops.filter(s=>!s.current)){
      const card=node('article','action-card');
      card.append(node('strong','action-label',stop.label),node('p','action-description',stop.venueName+' · '+stop.window+' · '+stop.arrival));
      if(!stop.visited) {
        const check=node('details','shift-guide');check.append(node('summary','','Plan this stop'));
        for(const option of stop.choices)check.append(node('p','action-description',option.label+' · '+(option.available?option.terms:option.reason)));
        card.append(check);
      }
      const b=button(stop.visited?'Visit completed':'Go together',()=>visitShiftStop(stop,day),'action-button');
      b.setAttribute('aria-label','Visit '+stop.label);b.disabled=!stop.available;
      if(!stop.available)card.append(node('small','action-reason',stop.reason));card.append(b);list.append(card);
    }
    if(day.history.length)list.append(node('p','resident-line',day.history.map(item=>item.clock+' · '+item.label).join(' / ')));
    list.append(button(day.finishLabel,async()=>{
      street.cancelTravel?.();
      const local=street?.getState(),companion=local?.companion;
      const position=companion && local.siteId===site.id && companion.residentId===site.shift?.residentId ?
        {siteId:site.id,x:companion.x,y:companion.y}:undefined;
      if(presentResult(await sim.perform('finishShift',position))){viewingShift=false;visiting=null;encounter=null;street.setSite(sim.active());render();focusActions();}
    },'secondary-button'));
  }
  async function followCharter(step) {
    if(!step)return;
    step=window.EarthLegacy?.prepareStep(sim,step) || step;
    if(step.kind==='neighbours'){if(view!=='street')setView('street');streetHud?.openTool('neighbours');return;}
    if(step.kind==='week'){
      const button=$('advance-week');
      button.focus({preventScroll:true});
      button.scrollIntoView({block:'nearest',behavior:'instant'});
      return;
    }
    const target=sim.state.sites.find(s=>s.id===step.siteId);
    if(target && target.id!==sim.state.activeId){
      await openSite(target);
      if(sim.state.activeId!==target.id)return;
    }
    if(step.kind==='construction'){openWorksite(step.jobId);return;}
    if(step.kind==='atlas'){setView('world');$('places-open')?.click();return;}
    if(step.kind==='city'){
      if(view!=='street')setView('street');
      const ready=districtDesk?.project(step.precinct,step.project);
      if(!ready)notify('That neighbourhood proposal has changed. Check the current goal for its next step.',true);
      return;
    }
    if(view!=='street')setView('street');
    if(step.kind==='actor'){
      const picker=$('street-actor');
      picker.focus({preventScroll:true});picker.scrollIntoView({block:'nearest'});return;
    }
    if(step.kind==='personalWork'){personalWork?.open(step.resource);return;}
    if(step.page==='shift'){selectGroup('people');showPeople('shift');focusActions();return;}
    if(step.kind==='resident'){
      selectGroup('people');
      const person=sim.active()?.residents.find(r=>r.id===step.residentId);
      if(step.page!=='startShift'){meetResident(person);return;}
      meetResident(person,event=>{
        openEncounter(event);renderActions();
        const start=$('actions-list').querySelector('[data-action="begin-day"]');
        if(start&&!start.disabled){start.focus({preventScroll:true});start.scrollIntoView({block:'nearest',behavior:'instant'});}
        else focusActions();
      });
      return;
    }
    if(step.group==='council')councilPage=step.page || 'agenda';
    if(step.group==='research')researchPage='eras';
    selectGroup(step.group||'council');
    if(step.page==='projects'){peers=true;renderActions();focusActions();return;}
    const buttons=Array.from($('actions-list').querySelectorAll('[data-action]'));
    const control=buttons.find(row=>row.dataset.action===step.actionId ||
      (step.inspectVote && !row.disabled && row.dataset.action.startsWith('vote:')) ||
      (step.inspectPilot && !row.disabled && row.dataset.action.startsWith('commission:pilot:')) ||
      (step.inspectReclaim && row.dataset.action.startsWith('reclaim:')));
    if(!control){focusActions();return;}
    const disclosure=control.closest('details');if(disclosure)disclosure.open=true;
    const focusTarget=control.matches('select')?control:control.closest('article')||control;
    if(!focusTarget.matches('button,select,input,a[href]'))focusTarget.tabIndex=-1;
    focusTarget.focus({preventScroll:true});focusTarget.scrollIntoView({block:'nearest',behavior:'instant'});
  }
  function followSceneGoal(guide) {
    if(!guide)return;
    const step=window.EarthLegacy?.prepareStep(sim,guide)||guide;
    if(step.kind==='neighbours'){streetHud?.openTool('neighbours');return;}
    if(step.siteId&&step.siteId!==sim.state.activeId){followCharter(step);return;}
    if(step.kind==='week'){streetHud?.previewWeek();return;}
    const id=step.residentId||(step.page==='shift'?sim.active()?.shift?.residentId:null);
    if(id&&streetHud){
      const ref={type:'resident',residentId:id},person=sim.active()?.residents.find(p=>p.id===id);
      if(person&&streetHud.openTalk(ref)){meetForLife(ref,person.name,()=>streetHud.scene(street.getState()));return;}
    }
    if(step.kind==='personalWork'){sceneWork(step.resource);return;}
    streetHud?.close(false);followCharter(step);
  }
  function nextObjective() {
    const step=window.EarthLegacy?.guidance(sim);
    return step?{...step,action:()=>followCharter(step)}:null;
  }
  const resourceLabels={funds:'Funds',materials:'Materials',food:'Food',population:'Residents',trust:'Trust',wellbeing:'Wellbeing'};
  function refreshSaveWarning() {
    const storageIssue=sim.saveIssue;
    show('save-warning',storageIssue);
    if(storageIssue)put('save-warning-message',sim.saveMessage||'This world is in this tab only. Export a copy to keep your progress.');
  }
  function refreshObjective(overview=sim.overview()) {
    const guide=nextObjective();
    streetHud?.setObjective(guide,overview);
    put('objective',guide?.detail||overview.objective);
    if(guide)put('objective-action',guide.label);
    show('objective-action',!!guide);show('follow-objective',!!guide);
  }
  function render(options) {
    forecastView?.warm();
    const site=sim.active(), overview=sim.overview(), state=sim.state;
    const visitingDistrict=Boolean(site&&state.communityLife&&!window.EarthCommunityLife.isHome(state,site));
    if(visitingDistrict)document.body.dataset.visitingDistrict='true';else delete document.body.dataset.visitingDistrict;
    if(view==='street'){
      agencyUI?.update();if(!visitingDistrict)lifePanel?.render();
      const actorField=$('street-actor');if(actorField){actorField.disabled=visitingDistrict;actorField.title=visitingDistrict?'This district chooses its own work and representation.':'';}
      const memberHint=$('district-membership-hint');
      if(memberHint){memberHint.hidden=!visitingDistrict;if(visitingDistrict)memberHint.textContent='Visiting '+site.name+' · Review local membership';}
    }
    put('action-budget',site ? state.effort+' civic effort · '+site.funds+' funds · '+site.materials+' materials · '+site.food+' food' : '');
    refreshSaveWarning();
    put('week','Week '+state.week);put('effort',state.effort+' / '+window.CommonEarthSim.maxEffort);
    show('calendar-personal-work',Boolean(site && !state.effort && personalWork));
    put('era',overview.era||site?.era||'');put('forecast',overview.forecast);
    show('settlement-status',!!site);$('advance-week').disabled=!site;$('street-view').disabled=!site;
    districtDesk?.render(view==='world');
    if($('beacon-toggle'))$('beacon-toggle').disabled=!site;
    refreshObjective(overview);if(view==='street')streetHud?.render();syncLiveClock();
    if(preparedSurvey && !validPreparedSurvey(preparedSurvey))preparedSurvey=null;
    show('resume-founding',view==='street' && Boolean(preparedSurvey));
    if(preparedSurvey)put('resume-founding','Resume proposal for '+(preparedSurvey.name||preparedSurvey.point.name));
    if(view==='street'){personalWork?.render();renderBuildPlan();}
    if($('society-open')) $('society-open').disabled=!site;
    const resources=$('resource-strip');
    if(!site && resources.firstChild)resources.replaceChildren();
    if(site) for(const [key,label] of Object.entries(resourceLabels)){
      let value=resources.querySelector('[data-metric="'+key+'"]');
      if(!value){
        const metric=node('div','resource');value=node('strong','resource-value');value.dataset.metric=key;
        metric.append(node('span','resource-label',label),value);resources.append(metric);
      }
      if(value.textContent!==String(site[key]))value.textContent=site[key];
    }
    show('week-review-open',!!sim.lastWeek?.());
    if(sheetOpen('society-dialog'))renderSociety();
    if(sheetOpen('journal-dialog'))renderRecords();
    if(view==='world'){inspect();markers();}
    const workModel=works?.view();
    if(!options?.keepCrewEditor)renderActions(workModel);
    renderForecast();planning?.render();
    show('goal-details',!!site && !!learning);learning?.render();
    refreshWorksites(workModel,true);
  }
  function sheetOpen(id){
    const sheet=$(id);
    return !!sheet && (sheet.classList.contains('sheet-fallback') || (nativeSheets && sheet.matches(':popover-open')));
  }
  function renderSociety(){
    const state=sim.state;
    const sponsor=sim.active(),offer=sim.sponsorshipOffer();
    put('sponsor-summary',sponsor?(offer.reason || sponsor.name+' can send two volunteers and founding supplies.'):'Choose a place on Earth to begin.');
    const homeId=state.communityLife?.homeId;
    put('society-title',homeId?'Home and neighbouring communities':'Your communities');
    const nearIds=new Set(state.communityLife?window.EarthCommunityLife.neighbours(state,sponsor).map(n=>n.id):[]);
    const near=state.communityLife?.outposts.filter(s=>nearIds.has(s.id))||[];
    $('site-list').replaceChildren(...[...state.sites,...near].map(s=>{
      const b=button('',()=>travelFromAtlas(s),'site-entry');
      b.append(node('strong','',s.name),node('small','',(homeId?(s.id===homeId?'Your home · ':'Independent district · '):'')+s.region+' · '+s.population+' residents'));
      const row=node('div','community-entry');
      row.append(b);
      if(districtDesk&&s.id!==state.activeId)row.append(button('See streets',()=>{hideDialog('society-dialog');districtDesk.watch(s.id);},'secondary-button'));
      if(homeId&&s.id!==homeId)return row;
      for(const action of ['restart','delete']){
        if(action==='delete'&&homeId&&state.sites.length+(state.communityLife.outposts.length||0)>1)continue;
        const label=action==='restart'?'Restart':'Delete';
        const control=button(label,async()=>{
          const impact=action==='restart'?(homeId?'Start again here with founding supplies and the same member households.':'Start again here with founding supplies and 12 residents.'):'Remove this community from this world.';
          if(!window.confirm(label+' '+s.name+'? '+impact+' Its progress, routes and linked agreements will be lost.'))return;
          const result=await sim.perform('manageSite',s.id,action);
          if(!presentResult(result))return;
          street?.discardTerrain();
          arrivalVersion++;crewOrders?.cancel();cancelPlacement();street?.cancelTravel?.();
          visiting=null;encounter=null;viewingShift=false;lastOpening=null;
          selected=sim.active()||start;setView('world',false);
        },'text-button');
        control.setAttribute('aria-label',label+' '+s.name);row.append(control);
      }
      return row;
    }));
    if($('route-status')){
      const sitesById=new Map(state.sites.map(s=>[s.id,s]));
      const routes=state.routes.map(r=>{
        const from=sitesById.get(r.from),to=sitesById.get(r.to);
        const item=node('article','route-entry');
        item.append(node('strong','',from.name+' ↔ '+to.name),node('p','',r.lastStatus));return item;
      });
      $('route-status').replaceChildren(...routes);
    }
    const partners=window.EarthPartners?.list(state,sim.active())||[];
    const panel=$('partner-list');
    if(panel){
      panel.replaceChildren();
      if(partners.length){
        panel.append(node('h3','','Independent neighbours'));
        for(const p of partners){
          const b=button('',()=>{hideDialog('society-dialog');choosePlace(p);},'site-entry');
          b.append(node('strong','',p.name),node('small','',p.locality+' · '+p.distanceKm.toLocaleString()+' km · '+p.relation));panel.append(b);
        }
      }
    }
  }
  function renderRecords(){
    if(!$('records-views'))return;
    for(const b of controls($('records-views'),'[data-records]')){
      const active=b.dataset.records===recordsPage;b.setAttribute('aria-pressed',String(active));
      show('records-'+b.dataset.records,active);
    }
    const latest=sim.lastWeek?.();
    show('week-review-open',!!latest);
    if(recordsPage==='review'){
      const panel=$('records-review');panel.replaceChildren();
      if(!latest){panel.append(node('p','empty-state','Advance a week to see its outcome here.'));return;}
      panel.append(node('h3','','Week '+latest.week+' in review'));
      for(const item of latest.sites){
        const d=node('details','week-report-site');d.open=item.id===sim.state.activeId;
        d.append(node('summary','',item.name));
        const metrics=node('dl','report-ledger');
        for(const [key,label] of Object.entries(resourceLabels)){
          const delta=item.delta[key]||0;metrics.append(node('dt','',label),node('dd','',item.closing[key]+' ('+(delta>0?'+':'')+delta+')'));
        }
        d.append(metrics);
        if(item.arrivals||item.departures)d.append(node('p','action-cost',item.arrivals+' shipment arrivals · '+item.departures+' departures.'));
        for(const line of item.highlights)d.append(node('p','action-description',line));
        if(item.totalEvents>item.highlights.length)d.append(node('small','', 'More entries are recorded under Events.'));
        panel.append(d);
      }
      return;
    }
    if(recordsPage==='saves'){savedWorlds?.refresh();return;}
    if(recordsPage!=='events')return;
    show('journal-filter-label',sim.state.sites.length>1);
    const filter=$('journal-filter');
    if(!sim.state.sites.some(s=>s.id===journalFilter))journalFilter='all';
    const choices=[['all','All communities'],...sim.state.sites.map(s=>[s.id,s.name])];
    if(choices.length!==filter.options.length||choices.some(([id,name],i)=>filter.options[i]?.value!==id||filter.options[i]?.text!==name)){
      filter.replaceChildren(...choices.map(([id,name])=>{const o=node('option','',name);o.value=id;return o;}));
    }
    filter.value=journalFilter;
    const entries=sim.state.journal.filter(e=>journalFilter==='all'||e.siteId===journalFilter);
    $('journal-list').replaceChildren(...entries.slice(0,journalLimit).map(entry=>{
      const e=node('li','journal-entry');
      const place=sim.state.sites.find(s=>s.id===entry.siteId);
      e.append(node('small','','Week '+entry.week+(place&&sim.state.sites.length>1?' · '+place.name:'')),node('p','',entry.text));return e;
    }));
    if(!entries.length)$('journal-list').append(node('li','empty-state','No events recorded here yet.'));
    show('earlier-events',entries.length>journalLimit);
  }
  listen('records-views','click',e=>{
    const b=e.target.closest('[data-records]');if(b){recordsPage=b.dataset.records;renderRecords();}
  });
  listen('society-open','click',renderSociety);
  // Populate the Chronicle once each time it opens. Native popovers dispatch
  // beforetoggle after the opening button has selected the requested tab.
  if(nativeSheets)listen('journal-dialog','beforetoggle',e=>{if(e.newState==='open')renderRecords();});
  else listen('journal-open','click',()=>{if(sheetOpen('journal-dialog'))renderRecords();});
  listen('open-save-tools','click',()=>{
    recordsPage='saves';$('journal-open').click();
  });
  listen('journal-filter','change',()=>{journalFilter=$('journal-filter').value;journalLimit=20;renderRecords();});
  listen('earlier-events','click',()=>{journalLimit+=30;renderRecords();});
  listen('week-review-open','click',()=>{recordsPage='review';if(!nativeSheets&&sheetOpen('journal-dialog'))renderRecords();});
  function upcomingDeadlines() {
    const {week,sites}=sim.state, deadlines=[];
    for(const site of sites){
      for(const person of site.residents){
        if(person.promise?.dueWeek===week)deadlines.push({site,person,group:'people',label:'Promise to '+person.name});
      }
      if(site.issue?.deadline===week && !window.EarthLegacy?.governs(sim.state,site)){
        deadlines.push({site,group:'council',label:'Vote on “'+site.issue.title+'”'});
      }
      if(site.shift){
        const host=site.residents.find(p=>p.id===site.shift.residentId);
        if(host)deadlines.push({site,group:'shift',label:'Finish the day with '+host.name});
      }
    }
    for(const [id,record] of Object.entries(sim.state.partners||{})){
      const booking=record.agreement?.phase==='pledge'?record.agreement:record.offer;
      if(booking?.due!==week)continue;
      const site=sites.find(s=>s.id===booking.homeId);
      const partner=site && window.EarthPartners?.get(sim.state,site,id);
      if(partner)deadlines.push({site,partner,group:'routes',label:(record.offer?'Reply to ':'Settle the booking with ')+partner.name});
    }
    return deadlines;
  }
  async function revisitDeadline(entry) {
    const site=sim.state.sites.find(s=>s.id===entry.site.id);
    if(!site)return;
    $('week-summary').closest('details').open=false;
    if(entry.partner){await resumePartner(site,entry.partner.partnerId);return;}
    if(site.id!==sim.state.activeId){
      await openSite(site);
      if(site.id!==sim.state.activeId)return;
    }else if(view!=='street')setView('street');
    if(entry.group==='council')councilPage='agenda';
    selectGroup(entry.group==='shift'?'people':entry.group);
    if(entry.person){
      street.focusResident(entry.person.id);followStreet();
    }else{
      if(entry.group==='shift'){viewingShift=true;renderActions();}
      focusActions();
    }
  }
  function readForecast(container,visible){
    const token={};forecastDraws.set(container,token);
    container.setAttribute('aria-busy','true');
    if(!container.firstChild)container.append(node('p','scene-muted','Preparing the next week…'));
    async function draw(){
      if(forecastDraws.get(container)!==token||!visible())return;
      try{
        const forecast=forecastView?await forecastView.read():sim.forecastNext();
        if(forecastDraws.get(container)!==token||!visible())return;
        if(!forecast){requestAnimationFrame(draw);return;}
        if(window.EarthForecastView)window.EarthForecastView.paint(container,forecast,sim.state.activeId);
        else{
          const local=forecast.sites.find(s=>s.id===sim.state.activeId);
          container.replaceChildren(node('strong','','Week '+forecast.week+' in '+local.name),
            ...local.highlights.map(note=>node('p','scene-muted',note)));
        }
      }catch{
        if(forecastDraws.get(container)===token&&visible())container.replaceChildren(node('p','scene-muted','The preview could not load. Close and reopen it to try again.'));
      }finally{if(forecastDraws.get(container)===token)container.removeAttribute('aria-busy');}
    }
    draw();
  }
  function renderForecastValues() {
    const summary=$('week-summary'),details=summary?.closest('details');
    if(!sim.active()||!details?.open)return;
    let results=summary.querySelector('.forecast-outcomes');
    if(!results){results=node('div','forecast-outcomes');summary.append(results);}
    readForecast(results,()=>details.open&&results.isConnected);
  }
  function renderForecast() {
    const el=$('week-summary'),site=sim.active();if(!el)return;
    const details=el.closest('details'),deadlines=upcomingDeadlines();
    put('week-preview-label',deadlines.length?'Week preview · '+deadlines.length+' due':'Week preview');
    if(!details.open){previewWorkRates='';return;}
    if(!site){el.textContent='Found a community to see its first forecast.';previewWorkRates='';return;}
    let section=el.querySelector('.forecast-deadlines');
    if(!section){el.replaceChildren();section=node('div','forecast-deadlines');el.append(section);}
    // Worker shifts may alter forecast numbers while a person uses a deadline link.
    // Keep the link itself whenever its action still exists.
    const remaining=new Map(Array.from(section.querySelectorAll('button'),link=>[link.dataset.deadline,link]));
    if(!section.firstChild)section.append(node('strong','','Before this week ends'));
    section.hidden=!deadlines.length;
    for(const entry of deadlines){
      const key=[entry.site.id,entry.group,entry.person?.id,entry.partner?.partnerId,entry.label].join('/');
      const label=entry.label+(sim.state.sites.length>1?' · '+entry.site.name:'');
      let link=remaining.get(key);
      if(!link){
        link=button(label,()=>revisitDeadline(link.deadlineEntry),'text-button');
        link.dataset.deadline=key;section.append(link);
      }
      link.deadlineEntry=entry;link.textContent=label;remaining.delete(key);
    }
    for(const link of remaining.values()){
      if(document.activeElement===link)details.querySelector('summary')?.focus({preventScroll:true});
      link.remove();
    }
    previewWorkRates=networkWorkRates();renderForecastValues();
  }
  $('week-summary')?.closest('details')?.addEventListener('toggle',renderForecast);
  for(const id of ['objective-action','follow-objective'])listen(id,'click',()=>nextObjective()?.action());
  listen('beacon-toggle','change',()=>{showBeacons=$('beacon-toggle').checked;markers();});
  function setStreetExpanded(expanded,scroll=false){
    document.body.classList.toggle('street-expanded',expanded);
    const control=$('street-wide');
    control.setAttribute('aria-pressed',String(expanded));
    control.title=expanded?'Restore street view':'Expand street view';
    requestAnimationFrame(()=>{
      street?.resize();
      if(expanded&&scroll)$('street-stage')?.scrollIntoView({block:'start',behavior:'instant'});
    });
  }
  listen('street-wide','click',()=>{
    setStreetExpanded(!document.body.classList.contains('street-expanded'),true);rememberStreetSoon();
  });
  // A shorter masthead after rotation can clip the map controls despite the panel still fitting.
  window.matchMedia('(orientation: portrait)').addEventListener?.('change',()=>requestAnimationFrame(()=>{
    if(!document.body.matches('.street-expanded[data-map-view="street"]:not([data-sheet-open])'))return;
    const panel=$('street-stage').parentElement,focus=document.activeElement;
    if(focus && focus!==document.body && !panel.contains(focus) && focus.getClientRects().length)return;
    const frame=panel.getBoundingClientRect();
    const visible=Math.min(frame.bottom,innerHeight)-Math.max(frame.top,0);
    if(frame.height<=innerHeight && visible>=frame.height*.82 && visible<frame.height-1){
      $('street-stage').scrollIntoView({block:'start',behavior:'instant'});
    }
  }));
  listen('world-view','click',()=>preparedSurvey?resumeFounding():setView('world'));
  listen('resume-founding','click',resumeFounding);
  listen('prepare-founding','click',prepareFounding);
  listen('street-view','click',()=>setView('street'));
  listen('inspect-region-selection','click',()=>{
    const ground=regionAt(selected);if(!ground)return;
    setView('street');getStreet()?.inspectRegion?.(ground.x,ground.y,{picked:true});
  });
  listen('visit-button','click',()=>travelFromAtlas(known(selected)));
  listen('watch-selected-streets','click',()=>{const site=known(selected);if(site)districtDesk?.watch(site.id);});
  listen('found-another','click',()=>{
    choosingFoundingPlace=true;
    hideDialog('society-dialog');
    setView('world');
    $('place-search').value='';
    $('places-open').click();
    $('place-search').focus({preventScroll:true});
  });
  listen('found-sponsor','change',()=>{
    foundingSponsor=$('found-sponsor').value;
    inspect();
  });
  listen('found-button','click',e=>{e.preventDefault();found();});
  listen('found-name','keydown',e=>{if(e.key==='Enter'){e.preventDefault();found();}});
  listen('zoom-in','click',()=>atlas.zoomBy(1.45));listen('zoom-out','click',()=>atlas.zoomBy(1/1.45));
  listen('recenter','click',()=>atlas.focus(selected.lat,selected.lon,1));
  let advancing=false, lastAdvance=-Infinity;
  async function closeSharedWeek(options,guard){
    if(forecastView?.prepareAdvance&&!(await forecastView.prepareAdvance())){
      return {ok:false,message:'The world changed while the week was being prepared. Review the current week before advancing.'};
    }
    return sim.perform('advance',options,guard);
  }
  async function advanceWeek() {
    const now=performance.now();
    if(advancing || now-lastAdvance<450 || !sim.active())return;
    advancing=true;
    const button=$('advance-week'),label=button.firstChild;
    const originalLabel=label?.nodeType===3?label.nodeValue:null;
    button.setAttribute('aria-busy','true');
    if(originalLabel!==null)label.nodeValue='Settling week… ';
    try{
      if(presentResult(await closeSharedWeek({usePrepared:true}))){
        lastAdvance=performance.now();
        street?.cancelTravel?.();
        cancelPlacement();street?.setSite(sim.active());render();
      }
    }finally{
      advancing=false;button.removeAttribute('aria-busy');
      if(originalLabel!==null)label.nodeValue=originalLabel;
    }
  }
  listen('advance-week','click',advanceWeek);
  listen('calendar-personal-work','click',()=>{
    if(!sim.active())return;
    if(view!=='street')setView('street',false);
    personalWork?.open();
  });
  listen('action-tabs','click',e=>{const target=e.target.closest('[data-group]');if(target)selectGroup(target.dataset.group);});
  listen('street-interact','click',()=>{
    if(crewOrders?.openTargets())return;
    if(street?.getState().travelling)street.cancelTravel();
    else street?.interact();
  });
  listen('street-seat','click',()=>street?.useSeat());
  listen('scene-van','click',()=>street?.toggleVehicle());
  listen('street-vehicle','click',()=>street?.getState().vehicle==='truck'?streetHud?.openTool('truck'):street?.toggleVehicle());
  listen('street-boat','click',()=>street?.toggleBoat());
  let fishing=false;
  function fishingPosition(original){
    const scene=street?.getState();
    if(view!=='street' || !scene || scene.siteId!==original.siteId || scene.actor!==original.actor ||
      scene.mode!==original.mode || scene.returning || scene.boarding || scene.placement || scene.seated ||
      document.body.hasAttribute('data-crew-order') || Math.hypot(scene.x-original.x,scene.y-original.y)>.35)return null;
    return scene;
  }
  listen('street-shoal','click',()=>{
    if(waterfrontUI){streetHud?.openTool('fishing');waterfrontUI.act('shoal');return;}
    if(street?.getState().sailingToShoal)street.cancelTravel();
    else if(street?.approachFishing('shoal'))followStreet();
  });
  listen('street-handline','click',async()=>{
    if(waterfrontUI){streetHud?.openTool('fishing');waterfrontUI.act('line');return;}
    const state=street?.getState();
    if(fishing || view!=='street' || !state || state.returning || state.boarding || state.placement || state.seated || document.body.hasAttribute('data-crew-order'))return;
    const offer=sim.handlineOffer(state);
    if(!offer)return;
    if(offer.action==='shore'||offer.action==='return'){
      if(street.approachFishing(offer.action==='shore'?'shore':'line'))followStreet();
      return;
    }
    if(!['cast','land'].includes(offer.action))return;
    fishing=true;
    try{
      street.cancelTravel();
      const result=await sim.perform('useHandline',()=>fishingPosition(state),offer.action,offer.food);
      if(presentResult(result) && view==='street'){
        street.setSite(sim.active());
        render();
      }
    }finally{fishing=false;if(view==='street'&&street)updateStreetInteract(street.getState());}
  });
  listen('street-fish','click',async()=>{
    if(waterfrontUI){streetHud?.openTool('fishing');waterfrontUI.act('net');return;}
    const state=street?.getState();
    if(fishing || state?.mode!=='boat' || state.returning || view!=='street')return;
    const offer=sim.fishingOffer();
    if(!offer.available){notify(offer.reason,true);return;}
    fishing=true;
    try{
      street.cancelTravel();
      const result=await sim.perform('fish',state.siteId,()=>fishingPosition(state));
      if(presentResult(result)){if(view==='street')street?.showCatch(state.siteId);render();}
    }finally{fishing=false;if(street)updateStreetInteract(street.getState());}
  });
  const heldDirections=new Map();
  function steerPad(id,button){
    const previous=heldDirections.get(id);
    if(previous===button)return;
    heldDirections.set(id,button);
    if(previous&&!Array.from(heldDirections.values()).includes(previous)){
      previous.classList.remove('is-held');
      street?.releaseMove(previous.dataset.move);
    }
    if(button){button.classList.add('is-held');street?.holdMove(button.dataset.move);}
  }
  listen('street-controls','pointerdown',e=>{
    const b=e.target.closest('[data-move]');
    if(!b||!street||e.button!==0||heldDirections.has(e.pointerId))return;
    e.preventDefault();
    try{b.setPointerCapture(e.pointerId);}catch{}
    steerPad(e.pointerId,b);
  });
  function releasePad(e){
    if(!heldDirections.has(e.pointerId))return;
    steerPad(e.pointerId,null);
    heldDirections.delete(e.pointerId);
  }
  function clearPad(){
    for(const pointerId of heldDirections.keys())releasePad({pointerId});
  }
  window.addEventListener('pointermove',e=>{
    if(!heldDirections.has(e.pointerId))return;
    const next=document.elementFromPoint(e.clientX,e.clientY)?.closest('#street-controls [data-move]');
    steerPad(e.pointerId,next||null);
  });
  for(const event of ['pointerup','pointercancel'])window.addEventListener(event,releasePad);
  listen('street-controls','lostpointercapture',releasePad);
  window.addEventListener('blur',clearPad);
  document.addEventListener('earthsheetchange',clearPad);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearPad();});
  listen('street-controls','click',e=>{
    const b=e.target.closest('[data-move]');if(b&&e.detail===0)street?.move(b.dataset.move);
  });
  listen('cancel-placement','click',()=>{cancelPlacement();renderActions();});
  listen('street-open-actions','click',event=>{
    event.preventDefault();crewOrders?.cancel();streetHud?.close(false);renderActions();
    $('actions-panel').scrollIntoView({block:'start',behavior:'instant'});
    const tab=$('action-tabs').querySelector('[aria-pressed="true"]');
    tab?.focus({preventScroll:true});
  });
  listen('street-works','click',()=>{
    const jobs=works?.view().jobs||[];
    if(jobs.length===1)openWorksite(jobs[0].id);
    else if(jobs.length||sim.worksiteLoadIssue?.(sim.active())){selectGroup('build');focusActions();}
  });
  listen('back-to-street','click',()=>{
    $('street-stage').scrollIntoView({block:'start',behavior:'instant'});
    $('street-canvas').focus({preventScroll:true});
  });
  listen('map-survey','click',()=>{
    $('site-inspector').scrollIntoView({block:'start',behavior:'instant'});
    $('place-name').focus({preventScroll:true});
  });
  listen('place-search','input',searchPlaces);
  listen('places-open','click',searchPlaces);
  let coordinateRequest=0;
  listen('coords-form','submit',async e=>{
    e.preventDefault();
    const lat=$('latitude').valueAsNumber,lon=$('longitude').valueAsNumber;
    if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lon)||Math.abs(lon)>180) {notify('Use a latitude from −90 to 90 and a longitude from −180 to 180.',true);return;}
    const ticket=++coordinateRequest;
    function stillSelected(){
      return ticket===coordinateRequest && sheetOpen('places-dialog') && $('latitude').valueAsNumber===lat && $('longitude').valueAsNumber===lon;
    }
    try{
      await window.EarthAtlas.ready();
      if(!stillSelected())return;
      const point=atlas.locate(lat,lon);if(point)choosePlace(point);
    }catch{
      if(stillSelected())notify('Place details could not load. Choose Locate on globe to retry.',true);
    }
  });
  const starts=window.EarthNavigation.featured();
  // Give the floating-settlement route the same one-tap entry as a land start.
  starts.push({name:'Indian Ocean',region:'Indian',lat:-24,lon:75,water:true,kind:'water',caption:'Open-ocean anchorage'});
  $('quick-picks').replaceChildren(...starts.map(p=>button(p.name,()=>choosePlace(p),'place-chip')));
  searchPlaces();
  if(sim.active()) {
    selected={...sim.active()};atlas.focus(selected.lat,selected.lon,1);
  }
  sim.subscribe((_world,notice)=>{
    if(notice.construction){
      districtDesk?.refreshWork?.(notice.sites);
      refreshSaveWarning();
      const finished=notice.completed||[];
      if(finished.length){
        lifePanel?.refreshCalendar();
        lastOpening=finished.find(j=>j.id===encounter?.jobId)||lastOpening;
        const local=finished.filter(j=>j.siteId===sim.state.activeId);
        if(local.length){
          street?.setSite(sim.active());
          const message=local.map(j=>j.message||j.name+' finished construction.').join(' ');
          notify(message);
          const list=$('actions-list'),field=document.activeElement;
          if(view==='street'&&list.contains(field)&&field.matches('.worksite-role select')){
            const before=field.getBoundingClientRect();
            works.finishWhileEditing(list,local,works.view());
            render({keepCrewEditor:true});
            if(before.bottom>0&&before.top<innerHeight){
              // Staff coming off duty can shorten an earlier row while a role menu is open.
              if(list.scrollHeight>list.clientHeight)list.scrollTop+=field.getBoundingClientRect().top-before.top;
              const moved=field.getBoundingClientRect().top-before.top;
              if(Math.abs(moved)>1)window.scrollBy({top:moved,behavior:'instant'});
            }
          }else render();
        }else{
          // Another district may unlock a shared objective while this player is editing their own crew.
          refreshWorksites();refreshObjective();
          renderForecast();
          if(!$('planning-details').contains(document.activeElement))planning?.render();
          if(!$('goal-details').contains(document.activeElement))learning?.render();
        }
      }else refreshWorksites();
      return;
    }
    if(!notice.external)return;
    if(notice.productionOnly){if(view==='street')street?.setSite(sim.active());render();return;}
    arrivalVersion++;
    street?.discardTerrain();
    crewOrders?.cancel();
    if(notice.switched){
      forecastView?.close();
      forecastView=window.EarthForecastView?.create(sim);
      liveClock?.reset();clockSignal=decisionKey='';streetHud?.invalidate();lifePanel?.invalidate();
      preparedSurvey=null;lastOpening=null;
      journalFilter='all';journalLimit=20;
      districtDesk?.close();street?.destroy();street=null;group='people';researchPage='eras';councilPage='agenda';
      selected=sim.active()?{...sim.active()}:start;planOpen=false;reportOpen=false;
    }
    cancelPlacement();street?.cancelTravel?.();viewingShift=false;visiting=null;peers=false;encounter=null;
    if(notice.switched){
      setView('world');atlas.focus(selected.lat,selected.lon,1);put('action-outcome','');show('action-outcome',false);
      resumeClock();
    }else if(!sim.active()){selected=start;setView('world');}
    else {street?.setSite(sim.active());render();}
    if(notice.message)notify(notice.message);
  });
  // A phone can discard a background tab. Resume its view without replaying any command.
  const viewKey='common-earth.tab-view.v1';
  function rememberStreetSoon(){
    if(rememberFrame||view!=='street'||document.body.dataset.gameReady!=='true')return;
    rememberFrame=requestAnimationFrame(()=>{rememberFrame=0;if(view==='street')rememberView();});
  }
  function rememberView() {
    try{
      const site=sim.active();
      if(!site){sessionStorage.removeItem(viewKey);return;}
      const point={lat:selected.lat,lon:selected.lon,name:selected.name,region:selected.region,water:!!selected.water,
        partnerId:selected.partnerId,siteId:known(selected)?.id};
      const snapshot={slot:book?.current()?.id||'first',siteId:site.id,foundingRevision:site.foundingRevision,lat:site.lat,lon:site.lon,view,group,visiting,viewingShift,peers,
        researchPage,councilPage,worksiteId:encounter?.type==='construction'?encounter.jobId:null,point,foundingSponsor,preparedSurvey,foundName:$('found-name').value,commission:$('commission-at-founding').checked,atlas:atlas.getView(),street:street?.snapshotView?.(),
        reportOpen,planOpen,voyageStyle,exploration:districtDesk?.chart()};
      if(streetHud&&(view==='street'||liveClock?.enabled())){
        snapshot.scene=streetHud.snapshot?.();
        if(view==='street')snapshot.observer=districtDesk?.snapshot();
        snapshot.expanded=view==='street'&&document.body.classList.contains('street-expanded');snapshot.liveWeeks=liveClock?.enabled()===true;
      }
      sessionStorage.setItem(viewKey,JSON.stringify(snapshot));
    }catch{/* Browsing and world autosave work without tab storage. */}
  }
  function restoreTab() {
    let saved;
    try{saved=JSON.parse(sessionStorage.getItem(viewKey));}catch{return false;}
    const site=sim.active();
    if(!site||!saved||saved.slot!==(book?.current()?.id||'first')||saved.siteId!==site.id||
      (saved.foundingRevision??0)!==(site.foundingRevision??0)||saved.lat!==site.lat||saved.lon!==site.lon||!['world','street','city'].includes(saved.view))return false;
    const p=saved.point;
    if(p && Number.isFinite(p.lat)&&Math.abs(p.lat)<=90 && Number.isFinite(p.lon)&&Math.abs(p.lon)<=180 && typeof p.name==='string'){
      selected=window.EarthPartners?.get(sim.state,site,p.partnerId)||sim.state.sites.find(other=>other.id===p.siteId)||
        {lat:p.lat,lon:p.lon,name:p.name,region:typeof p.region==='string'?p.region:'',water:!!p.water};
    }
    if(validPreparedSurvey(saved.preparedSurvey))preparedSurvey=saved.preparedSurvey;
    if(typeof saved.foundName==='string')$('found-name').value=saved.foundName.slice(0,48);
    $('commission-at-founding').checked=saved.commission===true;
    if(sim.state.sites.some(s=>s.id===saved.foundingSponsor))foundingSponsor=saved.foundingSponsor;
    if(saved.atlas)atlas.focus(saved.atlas.lat,saved.atlas.lon,saved.atlas.zoom);
    if(Object.hasOwn(groups,saved.group))group=saved.group;
    if(saved.view==='street'&&group==='build'&&typeof saved.worksiteId==='string'){
      const job=works?.view().jobs.find(j=>j.id===saved.worksiteId);
      if(job)encounter={type:'construction',jobId:job.id,plot:job.plot};
    }
    const resumedActor=window.EarthAgency?.actorId(site)||'steward';
    const sameActor=(saved.street?.actor||'steward')===resumedActor;
    visiting=sameActor?site.residents.find(person=>person.id===saved.visiting&&person.id!==resumedActor)?.id||null:null;
    viewingShift=sameActor&&!!site.shift&&saved.viewingShift===true;
    peers=saved.peers===true;
    if(['eras','roster','schools'].includes(saved.researchPage))researchPage=saved.researchPage;
    if(['agenda','commission','legacy'].includes(saved.councilPage))councilPage=saved.councilPage;
    if(window.EarthVoyages?.styles.some(style=>style.id===saved.voyageStyle))voyageStyle=saved.voyageStyle;
    planOpen=saved.planOpen===true;reportOpen=saved.reportOpen===true && !!sim.state.lastVoyage;
    setView(saved.view==='city'?'street':saved.view,false);
    if(saved.view==='street'){
      if(sameActor&&streetHud?.matches?.(saved.scene)&&saved.expanded===true){
        setStreetExpanded(true);street?.resize();
      }
      if(saved.street&&street?.restoreView?.(saved.street))renderActions();
      if(sameActor&&!districtDesk?.restore(saved.observer))streetHud?.restore?.(saved.scene);
      if(typeof saved.exploration==='string')districtDesk?.selectChart(saved.exploration);
    }
    resumeClock(saved.liveWeeks);
    return true;
  }
  window.addEventListener('pagehide',()=>{rememberView();crewOrders?.cancel();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)rememberView();});
  const linkedStreet=window.location?.hash==='#street'&&!!sim.active();
  if(!restoreTab()){
    setView(linkedStreet?'street':'world',false);
    resumeClock();
  }else if(linkedStreet&&view!=='street')setView('street',false);
  window.EarthConstructionClock?.start(sim);
  document.body.dataset.gameReady='true';
})();
