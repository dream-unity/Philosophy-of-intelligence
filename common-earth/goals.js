/* Voluntary district commitments. The same end-of-week observer runs in a
   rehearsal and in live play, after all resident and council effects settle. */
((root) => {
  'use strict';

  const HISTORY_LIMIT=4;
  const integer=(value,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
  const object=value=>value!==null && typeof value==='object' && !Array.isArray(value);
  const siteById=(world,id)=>world?.sites?.find(site=>site.id===id);
  const reject=message=>({ok:false,message});
  const improving=(metric,value,reference)=>metric.lower ? value<reference : value>reference;
  const holding=(metric,value,reference)=>value===reference || improving(metric,value,reference);

  function options(site) {
    if(!site)return {aims:[],guards:[]};
    const city=root.EarthCityModel?.overview(site);
    const aims=[
      {key:'food',label:'Add four food to the pantry',measure:'Food in store',value:site.food,
        target:base=>Math.min(Number.MAX_SAFE_INTEGER,base+4),hint:'A food cooperative, a garden or a shift tending the food beds can supply the pantry.'},
      {key:'voices',label:'Hear all three founding residents',measure:'Residents heard',value:site.residents.filter(person=>person.heard).length,
        max:3,target:()=>3,hint:'Open People in Street view, choose Meet beside each resident’s name, then listen.'}
    ];
    const guards=[
      {key:'trust',label:'Protect district trust',measure:'District trust',value:site.trust,max:100},
      {key:'wellbeing',label:'Protect resident wellbeing',measure:'Resident wellbeing',value:site.wellbeing,max:100}
    ];
    if(city) {
      aims.splice(1,0,
        {key:'housing',label:'Make room for six more residents',measure:'Housing places',value:city.capacity,min:18,max:56,
          target:base=>Math.min(56,base+6),hint:'Courtyard homes open after two weeks and a resident crew finishes the building. The existing land use continues until opening.'},
        {key:'reach',label:'Bring another precinct within 15 minutes',measure:'Precincts within 15 minutes',value:city.reachable,max:6,
          target:base=>Math.min(6,base+1),hint:'A transit cooperative serves its precinct and both neighbours. Opening takes at least two weekly closes plus the crew’s completed work.'}
      );
      guards.push({key:'shortage',label:'Protect access to housing',measure:'Residents without a housing place',
        value:Math.max(0,site.population-city.capacity),lower:true});
    }
    for(const p of site.residents) {
      const common={key:'bond:'+p.id,measure:'Bond with '+p.name,value:p.bond,max:10};
      aims.push({...common,label:'Build a stronger bond with '+p.name,
        target:base=>Math.min(10,base+2),hint:'Listen to '+p.name+', keep an agreement or complete a shift together.'});
      guards.push({...common,label:'Protect your bond with '+p.name});
    }
    return {aims,guards};
  }
  function metrics(site,aimKey,guardKey){
    const catalog=options(site);
    return {aim:catalog.aims.find(m=>m.key===aimKey),guard:catalog.guards.find(m=>m.key===guardKey)};
  }
  const cityAims={
    housing:{project:'homes',metric:'capacity'},
    reach:{project:'transit',metric:'reachable'}
  };
  function plannedCity(site,aimKey,weeks) {
    const baseRule=cityAims[aimKey],model=root.EarthCityModel;
    if(!baseRule || !model)return null;
    const rule={...baseRule,name:model.nameOf(site,baseRule.project)};
    const records=model.overview(site).records;
    const projection=(onlyFinished,keep)=>model.overview(site,records.map(p=>{
      if(!p.target || p.turns>weeks || keep?.(p))return p;
      if(onlyFinished && root.EarthConstruction && !p.laborReady)return p;
      return {...p,use:p.target,target:null,turns:0};
    }))[rule.metric];
    const retained=projection(false,p=>p.use===rule.project);
    return {rule,model,records,value:projection(false),ready:projection(true),retained};
  }
  function mealPossible(world,site,person){
    return Boolean(root.EarthAgency && person.bond<10 && (site.food>0 || root.EarthPursuits) &&
      !site.agency?.meals?.some(meal=>meal.week===world.week && meal.to===person.id));
  }
  function oneWeekBond(world,site,person,effort,target) {
    let maximum=person.bond+effort;
    // Each new paid activity can add one bond; a kept promise adds two.
    const canPromise=person.promise || world.week-person.lastPromise>=3;
    const hearing=person.heard?0:1;
    if(canPromise && effort>=hearing){
      const type=['garden','workshop','hall'][person.slot];
      if((site.construction || []).some(j=>j.scope==='street' && j.kind===type))maximum+=2;
      else if(effort>hearing)maximum++;
    }
    if(site.delivery?.residentId===person.id)maximum++;
    if(mealPossible(world,site,person))maximum++;
    if(site.shift?.residentId===person.id)maximum++;
    // Use a generous bound: any of these already-arranged decisions might name this resident.
    maximum+=site.pending.filter(v=>v.week<=world.week+1).length;
    if(site.commission?.phase==='trial')maximum++;
    if(site.neighbourWork?.active)maximum++;
    if(world.legacy?.term)maximum++;
    if(maximum<target)return reject('The remaining effort and arranged activities cannot add '+(target-person.bond)+' bond with '+person.name+' before this weekly close. Choose at least two weeks for another conversation, promise or shared day.');
    return null;
  }

  function closingPantry(world,site) {
    const sim=root.CommonEarthSim.create({storage:null,snapshot:JSON.stringify(world)});
    try{return sim.forecastNext().sites.find(s=>s.id===site.id).closing.food;}
    finally{sim.destroy();}
  }

  function hasFlexibleFood(world,site) {
    if(world.sites.length>1 || world.voyage || world.legacy?.term || site.shift || site.mandate ||
      site.neighbourWork?.active || site.strategy || site.commission?.phase==='trial' || site.pending.length)return true;
    if((site.construction || []).some(j=>j.scope==='street' &&
      ['garden','wetland','workshop'].includes(j.kind==='dismantle'?j.original?.kind:j.kind)))return true;
    return site.city?.precincts.some(r=>r.target && ['food','water'].some(use=>use===r.use || use===r.target));
  }

  function preview(world,siteId,aimKey,guardKey,weeks) {
    const site=siteById(world,siteId);
    if(!site || world.activeId!==siteId)return reject('Visit the district where you want to set this goal.');
    if(world.learningGoals?.active)return reject('The current goal has a review coming up in week '+world.learningGoals.active.dueWeek+'.');
    const {aim,guard}=metrics(site,aimKey,guardKey);
    if(!aim || !guard)return reject('Choose an aim and a safeguard available in this district.');
    if(aim.key===guard.key)return reject('Choose a different safeguard so you can follow two effects.');
    if(!integer(weeks,1,4))return reject('Choose a review in one to four weeks.');
    const extraEffort=world.sites.some(s=>s.shift && !s.shift.history.length)?1:0;
    const availableEffort=world.effort+extraEffort;
    let hint=aim.hint;
    if(aim.target(aim.value)>aim.value){
      const pending=plannedCity(site,aimKey,weeks);
      if(pending && pending.retained<aim.target(aim.value)){
        const project=pending.model.projects[pending.rule.project];
        if(weeks<project.turns)return reject('Opening a '+pending.rule.name.toLowerCase()+' project takes at least two weeks and a crew to finish. Choose a longer review or set this goal once the scheduled opening is within a week.');
        if(weeks===project.turns && availableEffort<project.effort)return reject('This review would require starting '+pending.rule.name.toLowerCase()+' this week. Starting the project costs '+project.effort+' effort. Choose at least '+(weeks+1)+' weeks or return after your effort refreshes.');
        if(weeks===project.turns && (site.funds<project.funds || site.materials<project.materials)){
          const budget='Commissioning this week costs '+project.effort+' effort, '+project.funds+' funds and '+project.materials+' materials. You have '+site.funds+' funds and '+site.materials+' materials.';
          const alternative=root.EarthPursuits || site.delivery || site.shift || world.voyage || site.construction?.length || pending.records.some(r=>r.target);
          if(availableEffort===project.effort && !alternative)return reject(budget+' Your remaining effort covers only the commission. Choose a longer review so you can raise the supplies first.');
          hint=budget+' Include time to raise or release supplies before this week closes. '+hint;
        }
      }
      if(weeks===1 && aimKey.startsWith('bond:') && availableEffort<=1){
        const person=site.residents.find(p=>aimKey==='bond:'+p.id);
        const limit=oneWeekBond(world,site,person,availableEffort,aim.target(aim.value));
        if(limit)return limit;
        hint='The review is at the next weekly close. You have '+world.effort+' effort left. A delivered parcel, a kept promise or a day spent together can also raise the bond. '+hint;
      }
      if(weeks===1 && aimKey==='food' && !availableEffort){
        const closing=closingPantry(world,site),target=aim.target(aim.value);
        if(closing<target){
          const current=root.EarthConstruction?.weeklyAdjustment(site,world).food || 0;
          // At most the repairer and exchange worker can add another food each.
          if(!root.EarthPursuits && !hasFlexibleFood(world,site) && closing-current+2<target)return reject('Closing now projects '+closing+' food against a target of '+target+'. With no effort left, even moving the whole local crew to food cannot fill the gap. Choose a longer review or return after your effort refreshes.');
          hint='Closing now projects '+closing+' food against a target of '+target+'. '+(root.EarthPursuits?'Personal work can bring in food before you advance, even with no effort left.':'There is no effort left for tending the beds. Check what staffed projects, incoming supplies or a move into food growing can deliver before review.');
        }
      }
      if(aimKey==='voices' && weeks===1){
        const unheard=site.residents.filter(p=>!p.heard).length;
        // A convenor can also hear one resident in a council session at the close.
        const sessions=world.legacy?.term?.slot===2?1:0;
        if(unheard>availableEffort+sessions)return reject(unheard+' residents still need a hearing. Listening takes one effort each. Choose a longer review or return next week.');
      }
    }
    return {ok:true,siteId:site.id,siteName:site.name,startWeek:world.week,dueWeek:world.week+weeks,
      aim:{key:aim.key,label:aim.measure,base:aim.value,target:aim.target(aim.value),hint},
      guard:{key:guard.key,label:guard.measure,base:guard.value,lower:!!guard.lower}};
  }
  function start(world,siteId,aimKey,guardKey,weeks) {
    const proposal=preview(world,siteId,aimKey,guardKey,weeks);
    if(!proposal.ok)return proposal;
    const {aim,guard}=proposal;
    world.learningGoals??={version:1,active:null,history:[]};
    world.learningGoals.active={siteId,startWeek:proposal.startWeek,dueWeek:proposal.dueWeek,checkedWeek:proposal.startWeek,
      aim:{key:aim.key,base:aim.base,target:aim.target},
      guard:{key:guard.key,base:guard.base,worst:null,worstWeek:null},ending:null};
    return {ok:true,message:'Learning goal set for '+proposal.siteName+'. Review both commitments in week '+proposal.dueWeek+'.'};
  }
  function assessment(world,entry) {
    const site=siteById(world,entry.siteId),{aim,guard}=metrics(site,entry.aim.key,entry.guard.key);
    if(!site || !aim || !guard)return null;
    const done=entry.ending!==null,aimValue=done?entry.ending.aim:aim.value,guardValue=done?entry.ending.guard:guard.value;
    const a=entry.aim,g=entry.guard;
    let aimStatus;
    if(aimValue>=a.target)aimStatus=a.base>=a.target?'Already met at the start':'Target reached';
    else aimStatus=aimValue>a.base?'Improved, below target':aimValue===a.base?'Unchanged, below target':'Fell below the starting value';
    if(a.base>=a.target && aimValue>=a.target && done)aimStatus='Already met and maintained at review';
    if(a.base>=a.target && aimValue<a.target)aimStatus='Started at target, below it now';
    const breached=g.worst!==null && !holding(guard,g.worst,g.base);
    const recovered=breached && holding(guard,guardValue,g.base);
    let guardStatus;
    if(breached)guardStatus=recovered?'Crossed the limit, then recovered':'Crossed the limit';
    else if(!done && g.worst===null)guardStatus='First weekly check pending';
    else guardStatus=improving(guard,guardValue,g.base)?'Held at every close and improved':'Held at every close';
    return {siteId:site.id,siteName:site.name,startWeek:entry.startWeek,dueWeek:entry.dueWeek,checkedWeek:entry.checkedWeek,done,
      aim:{label:aim.measure,base:a.base,target:a.target,value:aimValue,status:aimStatus},
      guard:{label:guard.measure,base:g.base,lower:!!guard.lower,value:guardValue,worst:g.worst,worstWeek:g.worstWeek,breached,status:guardStatus}};
  }
  function foodCrewStep(sim,site,shortfall) {
    if(shortfall<1 || shortfall>2)return null;
    const view=sim.constructionView?.(site.id);
    if(!view)return null;
    const free=view.workers.filter(w=>w.slot!==0 && !w.jobId && !['busy','resting'].includes(w.activity) && !(w.weeklyDelta.food>0));
    const travelling=free.filter(w=>w.occupation==='food' && w.preferenceDelta.food>0);
    if(free.length<shortfall)return null;
    const onTheWay=travelling.length>=shortfall;
    const worker=onTheWay?travelling[0]:free.find(w=>!travelling.includes(w));
    return {kind:'group',group:'build',siteId:site.id,actionId:'work-role:'+worker.residentId,
      label:onTheWay?'Check '+worker.name+'’s journey to work':'Review food growing with '+worker.name,
      detail:onTheWay?'A resident is on the way to food work. Keep the game visible until they arrive, then check the closing pantry again.':
        'The closing pantry is '+shortfall+' food below target. In Crew and work preferences, Food growing moves one weekly contribution from the resident’s customary trade to food once they reach work. Changing a preference uses no effort.'};
  }

  function bondActivity(sim,site,person) {
    const {id:siteId}=site,week=sim.state.week,days=root.EarthShifts;
    const courier=sim.actions('work',siteId).find(a=>a.id.startsWith('courier:') && a.residentId===person.id && a.available);
    if(courier)return {kind:'group',group:'work',siteId,actionId:courier.id,label:courier.label,detail:courier.description};
    if(site.shift?.residentId===person.id && days){
      const day=days.view(site,week),priority=day.stops.find(s=>s.id===day.priorityStopId);
      const connected=priority.visited && day.history.length>=2;
      const detail=connected?'You made time for the requested visit and a second stop. Choose Finish the day together to record one bond.':
        priority.visited || priority.available?day.priorityLabel:'The requested visit has closed for this day. Finish the day before looking for another way to build the bond.';
      return {kind:'group',group:'people',page:'shift',siteId,label:(connected?'Finish your day with ':'Review your day with ')+person.name,detail};
    }
    if(mealPossible(sim.state,site,person)){
      if(site.food<1)return {kind:'personalWork',siteId,resource:'food',label:'Gather food for a shared meal',
        detail:'Collect some food in Personal work, then meet '+person.name+' to share one food and build your bond.'};
      return {kind:'resident',siteId,group:'people',residentId:person.id,page:'meal',label:'Share a meal with '+person.name,
        detail:'Meet '+person.name+' in person and share one food from the pantry. A meal adds one bond and uses no weekly effort.'};
    }
    if(days?.gate(sim.state,site,person.id).available)return {kind:'resident',group:'people',siteId,residentId:person.id,page:'startShift',
      label:'Spend a day with '+person.name,detail:'Choose Spend a day together. Complete the visit they request and one other stop, then finish the day. That adds one bond.'};
    return null;
  }

  function nextStep(sim){
    const world=sim.state,entry=world.learningGoals?.active;
    if(!entry)return null;
    const site=siteById(world,entry.siteId),aim=metrics(site,entry.aim.key,entry.guard.key).aim;
    if(!aim)return null;
    const {siteId,dueWeek}=entry;
    const wait=detail=>({kind:'week',siteId,label:'Review the next week',detail});
    // Food can leave the pantry through consumption or shipping at the review itself.
    // Use the same weekly accounting as the calendar before suggesting the player wait.
    let closingFood;
    if(aim.key==='food' && dueWeek===world.week+1){
      const food=sim.forecastNext().sites.find(report=>report.id===siteId)?.closing.food;
      closingFood=food;
      if(food>=entry.aim.target)return wait('The pantry is projected to close at '+food+' food against a target of '+entry.aim.target+'. Check the safeguard before advancing.');
    }else if(aim.value>=entry.aim.target)return wait('Your aim is at target. Keep the safeguard through the week '+dueWeek+' review.');
    const city=plannedCity(site,aim.key,dueWeek-world.week);
    let step;
    if(city){
      if(city.value<entry.aim.target && city.retained>city.value){
        const loss=city.records.find(r=>r.use===city.rule.project && r.target && r.turns<=dueWeek-world.week);
        if(loss)return {kind:'city',siteId,precinct:loss.id,project:'cancel',label:'Review the conversion at '+loss.name,
          detail:'This project would remove existing '+city.rule.name.toLowerCase()+' before the review. You can cancel the conversion to retain that capacity, or offset the loss elsewhere.'};
      }
      if(city.ready>=entry.aim.target)return wait('The crew has finished the work needed for this target. The opening is scheduled by week '+dueWeek+'.');
      if(city.value>=entry.aim.target){
        const matching=city.records.filter(r=>r.target===city.rule.project && r.turns<=dueWeek-world.week && !r.laborReady);
        const work=root.EarthLegacy?.constructionStep(world,site,j=>j.scope==='city' && matching.some(r=>r.id===j.precinct));
        if(work)return work;
      }
      const {project,metric,name}=city.rule;
      if(dueWeek-world.week<city.model.projects[project].turns)return wait('A new '+name.toLowerCase()+' project takes two weeks to open. This goal is due in week '+dueWeek+'.');
      const orders=city.records.filter(r=>r.target);
      if(dueWeek-world.week===city.model.projects[project].turns && orders.length>=2){
        const canOpenNow=orders.filter(r=>r.turns===0);
        const ready=root.EarthLegacy?.constructionStep(world,site,j=>j.scope==='city' && canOpenNow.some(r=>r.id===j.precinct));
        if(ready)return {...ready,detail:ready.detail+' Opening this site now will free a precinct project slot before your deadline.'};
        // Waiting for even one more weekly close would make a new project too late.
        const reserved=orders.find(r=>r.use===project) || orders.find(r=>r.target!==project) || orders[0];
        return {kind:'city',siteId,precinct:reserved.id,project:'cancel',label:'Review the project at '+reserved.name,
          detail:'Both project slots are reserved. To meet this review, free a slot and commission '+name.toLowerCase()+' this week. Inspect the existing project and its cancellation terms before deciding.'};
      }
      const candidates=city.records.filter(r=>r.use!==project && !r.target)
        .map(r=>({r,plan:city.model.preview(site,world,r.id,project)}))
        .filter(({plan})=>plan.ok && (aim.key==='housing'?plan.beds:plan.reach)>0)
        .sort((a,b)=>Number(b.plan.available)-Number(a.plan.available) || Number(b.r.use==='open')-Number(a.r.use==='open') || b.plan.completedView[metric]-a.plan.completedView[metric]);
      if(!candidates.length)return root.EarthLegacy?.constructionStep(world,site,job=>job.scope==='city') ||
        wait('The current precinct projects must open or be reconsidered before another site can improve this aim.');
      const {r,plan}=candidates[0];
      step={kind:'city',siteId,precinct:r.id,project,startByWeek:dueWeek-city.model.projects[project].turns,label:'Inspect '+plan.title.toLowerCase()+' at '+r.name,detail:plan.forecast};
    }else if(aim.key==='food'){
      const foodWork=root.EarthLegacy?.constructionStep(world,site,j=>j.scope==='street' && j.kind==='garden' ||
        j.scope==='city' && ['food','water'].includes(j.kind) && root.EarthCityModel.overview(site).records[j.precinct].turns<=dueWeek-world.week);
      if(foodWork)return {...foodWork,detail:foodWork.detail+' Once it opens, the next weekly harvest can help stock the pantry. You can also tend the food beds now.'};
      if(!world.effort && Number.isFinite(closingFood)){
        const crew=foodCrewStep(sim,site,entry.aim.target-closingFood);
        if(crew)return crew;
      }
      if(!world.effort && root.EarthPursuits)return {kind:'personalWork',siteId,resource:'food',label:'Glean produce for '+site.name,
        detail:'Collect a produce load in Personal work, then check the closing pantry. You can repeat the job before the review.'};
      step={kind:'group',siteId,group:'work',actionId:'work:forage',label:'Tend the food beds in '+site.name,
        detail:aim.value>=entry.aim.target?'Household needs and deliveries are projected to bring the pantry below target at review.':aim.hint};
    }else{
      const person=aim.key==='voices'?site.residents.find(p=>!p.heard):site.residents.find(p=>aim.key==='bond:'+p.id);
      if(!person)return null;
      if(person.promise && aim.key!=='voices'){
        const work=root.EarthLegacy?.buildingPromiseStep(world,site,person);
        if(work)return work;
      }
      const action=person.promise?'fulfil':!person.heard || person.lastTalk!==world.week?'listen':world.week-person.lastPromise>=3?'promise':null;
      if(aim.key!=='voices' && (!action || !world.effort || site.delivery?.residentId===person.id)){
        const alternative=bondActivity(sim,site,person);
        if(alternative)return alternative;
      }
      if(!action)return wait('You already spoke this week. Check in with '+person.name+' again next week.');
      step={kind:'resident',siteId,group:'people',residentId:person.id,actionId:action+':'+person.id,label:'Visit '+person.name,detail:aim.hint};
    }
    return root.EarthLegacy?.prepareStep(sim,step) || step;
  }
  function summary(world) {
    const book=world?.learningGoals;
    return {active:book?.active?assessment(world,book.active):null,history:(book?.history||[]).map(entry=>assessment(world,entry)).filter(Boolean)};
  }
  function tick(world) {
    const book=world.learningGoals,entry=book?.active;
    if(!entry || world.week<=entry.checkedWeek)return [];
    const site=siteById(world,entry.siteId);
    if(!site)return [];
    const {aim,guard}=metrics(site,entry.aim.key,entry.guard.key),g=entry.guard;
    const wasHeld=g.worst===null || holding(guard,g.worst,g.base);
    entry.checkedWeek=world.week;
    if(g.worst===null || !holding(guard,guard.value,g.worst)) {
      g.worst=guard.value;g.worstWeek=world.week;
    }
    if(world.week>=entry.dueWeek) {
      entry.ending={aim:aim.value,guard:guard.value};
      const checked=assessment(world,entry);
      book.history.unshift(entry);book.history.length=Math.min(book.history.length,HISTORY_LIMIT);book.active=null;
      return [{siteId:site.id,text:'Learning goal review. '+checked.aim.label+' '+checked.aim.base+' → '+checked.aim.value+' (target '+checked.aim.target+'). '+checked.guard.label+' '+checked.guard.base+' → '+checked.guard.value+'. '+checked.guard.status+'.'}];
    }
    if(wasHeld && !holding(guard,g.worst,g.base))return [{siteId:site.id,text:'Learning goal safeguard crossed its limit. '+guard.measure+' closed at '+guard.value+' against the starting '+g.base+'. Review in week '+entry.dueWeek+'.'}];
    return [];
  }
  function valid(book,world) {
    if(book==null)return true;
    if(!object(book) || book.version!==1 || !Array.isArray(book.history) || book.history.length>HISTORY_LIMIT)return false;
    function entryOK(e,done) {
      if(!object(e) || !object(e.aim) || !object(e.guard) || (done?!object(e.ending):e.ending!==null))return false;
      const site=siteById(world,e.siteId);
      if(!site || !integer(e.startWeek,site.founded||1,world.week) || !integer(e.dueWeek,e.startWeek+1,e.startWeek+4))return false;
      if(done?e.dueWeek>world.week || e.checkedWeek!==e.dueWeek:e.dueWeek<=world.week || e.checkedWeek!==world.week)return false;
      const {aim,guard}=metrics(site,e.aim.key,e.guard.key);
      if(!aim || !guard || aim.key===guard.key)return false;
      const metricOK=(m,n)=>integer(n,m.min||0,m.max??Number.MAX_SAFE_INTEGER);
      if(!metricOK(aim,e.aim.base)|| !metricOK(aim,e.aim.target) || e.aim.target!==aim.target(e.aim.base) || !metricOK(guard,e.guard.base))return false;
      if(e.checkedWeek===e.startWeek) {
        if(e.guard.worst!==null || e.guard.worstWeek!==null)return false;
      } else if(!metricOK(guard,e.guard.worst)||!integer(e.guard.worstWeek,e.startWeek+1,e.checkedWeek))return false;
      return !done || (metricOK(aim,e.ending.aim) && metricOK(guard,e.ending.guard) && holding(guard,e.ending.guard,e.guard.worst));
    }
    if(book.active!==null && !entryOK(book.active,false))return false;
    let boundary=book.active?.startWeek ?? world.week;
    for(const e of book.history){
      if(!entryOK(e,true)||e.dueWeek>boundary)return false;
      boundary=e.startWeek;
    }
    return true;
  }

  function mount(container,{sim,onResult,onChange,onFollow}={}) {
    if(!container || !sim)return {render(){},destroy(){}};
    const outer=container.closest('details'), outerTitle=outer?.querySelector('summary');
    let draftSite=null,aimKey='food',guardKey='trust',horizon=2,lastSignature='',busy=false,composing=false;
    const el=(tag,text,className)=>{
      const element=document.createElement(tag);
      if(text!==undefined && text!==null)element.textContent=text;
      if(className)element.className=className;
      return element;
    };
    const button=(text,action,className)=>{
      const b=el('button',text,className);b.type='button';b.addEventListener('click',action);return b;
    };
    function field(label,values,selected,change,id) {
      const wrap=el('label',label,'goal-field'),select=el('select');
      select.dataset.goalControl=id;
      for(const row of values){const opt=el('option',row.label);opt.value=row.key;select.append(opt);}
      select.value=String(selected);select.addEventListener('change',()=>change(select.value));wrap.append(select);return wrap;
    }
    function review(result,heading) {
      const box=el('section',null,'goal-review'),title=el('h3',heading);
      title.tabIndex=-1;title.dataset.goalHeading='';box.append(title,el('p',result.siteName+' · Week '+result.startWeek+' to '+result.dueWeek,'goal-district'));
      for(const [kind,item] of [['Aim',result.aim],['Safeguard',result.guard]]) {
        const row=el('div',null,'goal-reading');
        row.append(el('strong',kind+' · '+item.label));
        const rule=kind==='Aim'?'target '+item.target:(item.lower?'at most ':'at least ')+item.base;
        row.append(el('p',item.base+' → '+item.value+' · '+rule,'goal-values'),el('p',item.status+'.'));
        if(kind==='Safeguard' && item.breached)row.append(el('p',(item.lower?'Highest':'Lowest')+' weekly close was '+item.worst+' in week '+item.worstWeek+'.'));
        box.append(row);
      }
      if(!result.done)box.append(el('p','Current readings can still change this week. The safeguard is checked at each weekly close.','goal-note'));
      return box;
    }
    function editor(site,opts) {
      const form=el('form',null,'goal-editor'),intro=el('p','What would you like to change in '+site.name+', and who should be protected as you work?');
      const previewArea=el('div',null,'goal-proposal');previewArea.setAttribute('aria-live','polite');
      const guardField=field('Safeguard',opts.guards,guardKey,key=>{guardKey=key;update();},'guard');
      const span=field('Review after',[1,2,3,4].map(n=>({key:n,label:n+(n===1?' week':' weeks')})),horizon,value=>{horizon=Number(value);update();},'horizon');
      const submit=el('button','Set this goal','secondary');submit.type='submit';submit.dataset.goalControl='submit';
      function update() {
        const select=guardField.querySelector('select');
        for(const o of select.options)o.disabled=o.value===aimKey;
        if(aimKey===guardKey){const next=opts.guards.find(g=>g.key!==aimKey);guardKey=next.key;select.value=guardKey;}
        const plan=preview(sim.state,site.id,aimKey,guardKey,horizon);
        previewArea.replaceChildren();submit.disabled=busy||!plan.ok;
        if(!plan.ok){previewArea.append(el('p',plan.message));return;}
        const a=plan.aim,g=plan.guard;
        const target=el('p');target.append(el('strong',a.label+' '),document.createTextNode(a.base+' → '+a.target+' by week '+plan.dueWeek+'.'));
        const limit=el('p');limit.append(el('strong',g.label+' '),document.createTextNode('must close at '+g.base+' or '+(g.lower?'less':'more')+' each week.'));
        previewArea.append(target,limit,el('p',a.base===a.target?'This aim is already met. The review will show whether it still holds.':a.hint,'goal-note'));
      }
      const aimField=field('Aim',opts.aims,aimKey,key=>{aimKey=key;update();},'aim');
      form.append(intro,aimField,guardField,span,previewArea,submit);update();
      form.addEventListener('submit',async event=>{
        event.preventDefault();
        if(busy || submit.disabled)return;
        busy=true;submit.disabled=true;
        try{
          const result=await sim.perform('beginGoal',site.id,aimKey,guardKey,horizon);
          onResult?.(result);
          if(!result.ok){previewArea.replaceChildren(el('p',result.message));return;}
          composing=false;onChange?.();render();
          container.querySelector('[data-goal-heading]')?.focus({preventScroll:true});
        }finally{busy=false;submit.disabled=false;}
      });
      return form;
    }
    function render() {
      const site=sim.active(),state=sim.state;
      const activeEntry=state.learningGoals?.active,hasReview=!!state.learningGoals?.history?.length;
      if(outerTitle)outerTitle.textContent=activeEntry?'Your learning goal · due week '+activeEntry.dueWeek:hasReview?'Review your learning goal':'Set a learning goal';
      if(!site){container.replaceChildren();lastSignature='';draftSite=null;return;}
      if(outer && !outer.open)return;
      const book=summary(state),last=book.history[0];
      const opts=options(site);
      if(site.id!==draftSite){draftSite=site.id;aimKey='food';guardKey='trust';horizon=2;composing=false;}
      const guide=book.active?nextStep(sim):null;
      const signature=JSON.stringify([site.id,site.name,state.week,state.effort,site.funds,site.materials,site.city?.precincts,book,guide,opts.aims.map(m=>m.value),opts.guards.map(m=>m.value),composing]);
      if(signature===lastSignature)return;
      lastSignature=signature;
      const focused=container.contains(document.activeElement)?document.activeElement.dataset.goalControl:null;
      const oldHistory=container.querySelector('.goal-history')?.open;
      const parts=[];
      if(book.active){
        const active=review(book.active,'Goal in progress'),step=guide;
        if(step && onFollow){
          if(step.detail)active.append(el('p',step.detail,'goal-note'));
          const follow=button(step.label,()=>onFollow(step),'secondary');follow.dataset.goalControl='follow';active.append(follow);
        }
        parts.push(active);
      }
      if(!book.active && last){
        const reached=last.aim.value>=last.aim.target;
        const verdict=reached?(last.guard.breached?'Aim reached, safeguard crossed':'Both commitments met'):(last.guard.breached?'Both commitments missed':'Safeguard held, aim fell short');
        parts.push(review(last,verdict));
      }
      if(!book.active && (!last || composing))parts.push(editor(site,opts));
      else if(!book.active && last) {
        const again=button('Set another goal',()=>{
          composing=true;render();container.querySelector('[data-goal-control="aim"]')?.focus();
        },'secondary');
        again.dataset.goalControl='new';parts.push(again);
      }
      const previous=book.active?book.history:book.history.slice(1);
      if(previous.length){
        const archive=el('details',null,'goal-history');
        archive.open=!!oldHistory;archive.append(el('summary',previous.length===1?'Previous goal review':'Previous goal reviews ('+previous.length+')'));
        for(const item of previous)archive.append(review(item,'Reviewed in week '+item.dueWeek));
        parts.push(archive);
      }
      container.classList.add('learning-goal');container.replaceChildren(...parts);
      if(focused)container.querySelector('[data-goal-control="'+focused+'"]')?.focus({preventScroll:true});
    }
    outer?.addEventListener('toggle',render);
    render();
    return {render,destroy(){outer?.removeEventListener('toggle',render);container.replaceChildren();lastSignature='';}};
  }
  root.EarthGoals=Object.freeze({options,preview,valid,summary,start,tick,nextStep,mount});
})(typeof window==='undefined'?globalThis:window);
