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
        max:3,target:()=>3,hint:'Visit each resident in Street view and listen.'}
    ];
    const guards=[
      {key:'trust',label:'Protect district trust',measure:'District trust',value:site.trust,max:100},
      {key:'wellbeing',label:'Protect resident wellbeing',measure:'Resident wellbeing',value:site.wellbeing,max:100}
    ];
    if(city) {
      aims.splice(1,0,
        {key:'housing',label:'Make room for six more residents',measure:'Housing places',value:city.capacity,min:18,max:56,
          target:base=>Math.min(56,base+6),hint:'Courtyard homes open two weeks after commissioning and keep their current use until opening.'},
        {key:'reach',label:'Bring another precinct within 15 minutes',measure:'Precincts within 15 minutes',value:city.reachable,max:6,
          target:base=>Math.min(6,base+1),hint:'A transit cooperative serves its precinct and both neighbours. It opens after two weeks.'}
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
  function preview(world,siteId,aimKey,guardKey,weeks) {
    const site=siteById(world,siteId);
    if(!site || world.activeId!==siteId)return reject('Visit the district where you want to set this goal.');
    if(world.learningGoals?.active)return reject('The current goal has a review coming up in week '+world.learningGoals.active.dueWeek+'.');
    const {aim,guard}=metrics(site,aimKey,guardKey);
    if(!aim || !guard)return reject('Choose an aim and a safeguard available in this district.');
    if(aim.key===guard.key)return reject('Choose a different safeguard so you can follow two effects.');
    if(!integer(weeks,1,4))return reject('Choose a review in one to four weeks.');
    return {ok:true,siteId:site.id,siteName:site.name,startWeek:world.week,dueWeek:world.week+weeks,
      aim:{key:aim.key,label:aim.measure,base:aim.value,target:aim.target(aim.value),hint:aim.hint},
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

  function mount(container,{sim,onResult,onChange}={}) {
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
      const book=summary(state),last=book.history[0];
      if(outerTitle)outerTitle.textContent=book.active?'Your learning goal · due week '+book.active.dueWeek:last?'Review your learning goal':'Set a learning goal';
      if(!site){container.replaceChildren();lastSignature='';draftSite=null;return;}
      const opts=options(site);
      if(site.id!==draftSite){draftSite=site.id;aimKey='food';guardKey='trust';horizon=2;composing=false;}
      const signature=JSON.stringify([site.id,site.name,state.week,book,opts.aims.map(m=>m.value),opts.guards.map(m=>m.value),composing]);
      if(signature===lastSignature)return;
      lastSignature=signature;
      const focused=container.contains(document.activeElement)?document.activeElement.dataset.goalControl:null;
      const oldHistory=container.querySelector('.goal-history')?.open;
      const parts=[];
      if(book.active)parts.push(review(book.active,'Goal in progress'));
      if(!book.active && last)parts.push(review(last,'Latest goal review'));
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
    render();
    return {render,destroy(){container.replaceChildren();lastSignature='';}};
  }
  root.EarthGoals=Object.freeze({options,preview,valid,summary,start,tick,mount});
})(typeof window==='undefined'?globalThis:window);
