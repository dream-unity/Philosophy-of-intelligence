/* A decision rehearsal uses a private copy of the full simulation and its rules. */
(() => {
  'use strict';
  const dimensions={food:'Food',funds:'Funds',materials:'Materials',trust:'Trust',wellbeing:'Wellbeing',population:'Residents'};
  const groups={work:'Work',people:'Relationships',build:'Construction',city:'Neighbourhood projects',council:'Council',research:'Research',routes:'Trade routes'};
  const idle='wait', cityMove='city-project', crewMove='crew-preference',cancelWork='worksite-cancel:';
  const pauseWork='worksite-pause:',resumeWork='worksite-resume:';
  const urbanMeasures={capacity:'Housing capacity',reachable:'Precincts within 15 minutes',pressure:'Precincts facing rent pressure',noise:'Precincts affected by industry'};
  const cityModel=()=>globalThis.EarthCityModel;
  function urbanOptions(sim, firstOnly=false) {
    const model=cityModel(),site=sim.active();
    if(!model||!site)return [];
    const rows=[];
    for(const precinct of model.overview(site).records){
      const location=precinct.id, projects=[];
      // Active crews can be recalled even with no effort left this week.
      const options=precinct.target?['cancel']:model.options;
      for(const id of options){
        if(id===precinct.use)continue;
        const preview=(model.terms||model.preview)(site,sim.state,location,id);
        if(!preview.available)continue;
        projects.push({id,preview});
        if(firstOnly)return [{location,precinct,projects}];
      }
      if(projects.length)rows.push({location,precinct,projects});
    }
    return rows;
  }
  function fork(state) {
    // Isolated scenarios read the same v1 save format and never write a browser slot.
    return globalThis.CommonEarthSim.create({storage:null,snapshot:JSON.stringify(state)});
  }
  function moves(sim) {
    const available=sim.actions().filter(a=>a.available&&groups[a.group]);
    for(const job of sim.active()?.construction || []){
      const location=job.scope==='street'?'lot '+(job.plot+1):'precinct '+(job.precinct+1);
      if(sim.setConstructionPaused)available.push({id:(job.paused?resumeWork:pauseWork)+job.id,group:'build',
        label:(job.paused?'Resume ':'Pause ')+job.name.toLowerCase()+' at '+location,cost:0});
      if(job.scope==='street' && sim.previewCancelConstruction(job.id).available)
        available.push({id:cancelWork+job.id,group:'build',label:'Cancel '+job.name.toLowerCase()+' on '+location,cost:0});
    }
    if(sim.active() && sim.setWorkPreference)available.push({id:crewMove,group:'work',label:'Change a resident’s work preference',cost:0});
    if(urbanOptions(sim,true).length)available.push({id:cityMove,group:'city',label:'Plan a precinct project',cost:null});
    return available;
  }
  function apply(sim,move) {
    if(!move || move.id===idle)return {ok:true,message:''};
    if(typeof move.id!=='string')return {ok:false,message:'Choose a rehearsal move.'};
    if(move.id.startsWith(pauseWork))return sim.setConstructionPaused(move.id.slice(pauseWork.length),true);
    if(move.id.startsWith(resumeWork))return sim.setConstructionPaused(move.id.slice(resumeWork.length),false);
    if(move.id.startsWith(cancelWork))return sim.cancelConstruction(move.id.slice(cancelWork.length));
    if(move.id===cityMove)return sim.planCity(move.location,move.project);
    if(move.id===crewMove)return sim.setWorkPreference(move.residentId,move.preference || 'build',move.jobId || null);
    return sim.act(move.id,move.plot);
  }
  function project(initial,plan,horizon,workSeconds=0) {
    if(!Number.isInteger(horizon)||horizon<1||horizon>4)return {ok:false,message:'Choose a horizon of one to four weeks.'};
    if(!Number.isInteger(workSeconds)||workSeconds<0||workSeconds>300)return {ok:false,message:'Choose up to five minutes of active work per week.'};
    const sim=fork(initial),effects=[];
    try {
      if(!sim.active())return {ok:false,message:'Found a community before rehearsing a decision.'};
      for(const m of plan){
        const r=apply(sim,m);
        if(!r.ok)return r;
        if(r.message)effects.push(r.message);
      }
      const site=sim.active(),people=site.residents.map(p=>({id:p.id,name:p.name}));
      for(let i=0;i<horizon;i++){
        if(workSeconds){
          const worked=sim.workConstruction(workSeconds);
          if(!worked.ok)return worked;
          if(worked.message)effects.push(worked.message);
        }
        const result=sim.advance({includeHighlights:true});
        if(!result.ok)return result;
        for(const note of result.highlights)effects.push(note);
      }
      const end=sim.active();
      return {ok:true,week:sim.state.week,name:end.name,openBuildings:end.buildings.length,ongoing:end.construction?.length || 0,site:Object.fromEntries(Object.keys(dimensions).map(k=>[k,end[k]])),
        city:cityModel()?.overview(end),
        links:globalThis.EarthNeighbours?.summary(end).links||[],
        people:people.map(p=>{const endPerson=end.residents.find(r=>r.id===p.id);return {...p,bond:endPerson?endPerson.bond:null,promise:endPerson?.promise?.dueWeek||null};}),
        sites:sim.state.sites.map(s=>({id:s.id,name:s.name,food:s.food,trust:s.trust,wellbeing:s.wellbeing})), effects};
    } finally {sim.destroy();}
  }
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
  const btn=(text,fn)=>{const n=el('button',text,'text-button');n.type='button';n.addEventListener('click',fn);return n;};
  function dropdown(caption) {
    const label=el('label',caption),select=el('select');label.append(select);return {label,select};
  }
  function mount(root,live) {
    let state,liveWorld,horizon=2,workSeconds=60,plans=[];
    const previousResults=new Map();
    function capture() {
      previousResults.clear();liveWorld=live.state;
      state=JSON.parse(JSON.stringify(liveWorld));
    }
    function fresh() {
      capture();
      const temp=fork(state);
      const available=moves(temp);
      const starter=available.find(m=>m.id==='build:garden')||available.find(m=>m.group==='work');
      temp.destroy();
      plans=[[{id:idle}],[{id:starter?.id||idle}]];
    }
    function drawBranch(index,controls) {
      const virtual=fork(state), box=el('fieldset',null,'plan-branch'), title=index===0?'Plan A':'Plan B';
      box.append(el('legend',title));
      try {
        for(let i=0;i<plans[index].length;i++) {
          const move=plans[index][i],{label,select}=dropdown(i===0?'First move':'Second move'),available=moves(virtual);
          const none=el('option','Continue without another action');none.value=idle;select.append(none);
          for(const [key,name] of Object.entries(groups)) {
            const list=available.filter(a=>a.group===key);if(!list.length)continue;
            const optgroup=el('optgroup');optgroup.label=name;
            for(const a of list){const o=el('option',a.cost==null?a.label:a.label+' · '+a.cost+' effort');o.value=a.id;optgroup.append(o);}
            select.append(optgroup);
          }
          if(!available.some(a=>a.id===move.id))move.id=idle;
          select.value=move.id;
          select.addEventListener('change',()=>{plans[index][i]={id:select.value};draw('move-'+index+'-'+i);});
          select.dataset.control='move-'+index+'-'+i;box.append(label);
          if(move.id.startsWith('build:')) {
            const pick=dropdown('Location'),kind=move.id.slice(6),candidates=[];
            for(let j=0;j<9;j++){
              const p=virtual.previewBuild(kind,j);if(!p.available)continue;
              candidates.push(j);const o=el('option','Plot '+(j+1)+' · '+p.forecast);o.value=j;pick.select.append(o);
            }
            if(!candidates.includes(move.plot))move.plot=candidates[0];
            pick.select.value=move.plot;pick.select.dataset.control='plot-'+index+'-'+i;
            pick.select.addEventListener('change',()=>{move.plot=Number(pick.select.value);draw('plot-'+index+'-'+i);});box.append(pick.label);
          }
          if(move.id===crewMove){
            const {jobs,workers,preferences}=virtual.constructionView();
            const worker=workers.find(w=>w.residentId===move.residentId) || workers.find(w=>!w.jobId && w.slot===1) || workers[0];
            if(!worker){
              box.append(el('p','No residents are available for work assignments in this plan.','action-reason'));
            }else{
              const person=dropdown('Resident'),role=dropdown('Work preference');
              move.residentId=worker.residentId;
              move.preference ||= jobs.length?'build':'food';
              for(const w of workers){
                const o=el('option',w.name+' · '+w.role);o.value=w.residentId;person.select.append(o);
              }
              for(const pref of preferences){
                const o=el('option',pref.label);o.value=pref.id;role.select.append(o);
              }
              person.select.value=move.residentId;role.select.value=move.preference;
              person.select.dataset.control='worker-'+index+'-'+i;role.select.dataset.control='role-'+index+'-'+i;
              person.select.addEventListener('change',()=>{move.residentId=person.select.value;draw(person.select.dataset.control);});
              role.select.addEventListener('change',()=>{move.preference=role.select.value;move.jobId=null;draw(role.select.dataset.control);});
              box.append(person.label,role.label);
              if(move.preference==='build' && jobs.length){
                const site=dropdown('Worksite');
                const any=el('option','Any available site');any.value='';site.select.append(any);
                for(const job of jobs){
                  const place=job.scope==='street'?'Lot '+(job.plot+1):'Precinct '+(job.precinct+1);
                  const o=el('option',job.name+' · '+place);o.value=job.id;site.select.append(o);
                }
                if(!jobs.some(j=>j.id===move.jobId))move.jobId=null;
                site.select.value=move.jobId || '';site.select.dataset.control='job-'+index+'-'+i;
                site.select.addEventListener('change',()=>{move.jobId=site.select.value || null;draw(site.select.dataset.control);});
                box.append(site.label);
              }else move.jobId=null;
              box.append(el('p','Residents travel to their new work and finish existing commitments. The time you allow before the week closes affects their contribution.','plan-consequence'));
            }
          }
          if(move.id===cityMove) {
            const available=urbanOptions(virtual);
            if(!available.length) {
              box.append(el('p','No precinct project is affordable with the resources and effort left in this plan.','action-reason'));
            } else {
              const area=dropdown('Precinct'),proposal=dropdown('Project');
              for(const row of available){const o=el('option',row.precinct.name);o.value=row.location;area.select.append(o);}
              const row=available.find(r=>r.location===move.location)||available[0];
              move.location=row.location;area.select.value=row.location;
              const selected=row.projects.find(p=>p.id===move.project)||row.projects[0];move.project=selected.id;
              for(const p of row.projects){
                const c=p.preview.cost;
                const o=el('option',p.preview.title+' · '+c.effort+' effort, '+c.funds+' funds, '+c.materials+' materials');
                o.value=p.id;proposal.select.append(o);
              }
              proposal.select.value=move.project;
              area.select.dataset.control='precinct-'+index+'-'+i;
              area.select.addEventListener('change',()=>{move.location=Number(area.select.value);draw(area.select.dataset.control);});
              proposal.select.dataset.control='project-'+index+'-'+i;
              proposal.select.addEventListener('change',()=>{move.project=proposal.select.value;draw(proposal.select.dataset.control);});
              const detail=selected.preview.cancel
                ? 'Return '+selected.preview.recovery.funds+' funds and '+selected.preview.recovery.materials+' materials. The existing land use continues.'
                : 'Earliest opening is week '+selected.preview.week+', after the crew finishes construction. '+selected.preview.people;
              box.append(area.label,proposal.label,el('p',detail,'plan-consequence'));
            }
          }
          const r=apply(virtual,move);
          if(!r.ok && (move.id!==cityMove||move.project))box.append(el('p',r.message,'action-reason'));
        }
        const edit=plans[index].length===1?btn('Add a second move',()=>{plans[index].push({id:idle});draw('move-'+index+'-1');}):
          btn('Remove second move',()=>{plans[index].pop();draw('move-'+index+'-0');});
        box.append(edit);controls.append(box);
      } finally {virtual.destroy();}
    }
    function draw(focus) {
      root.replaceChildren();
      if(!state.sites.length)return;
      const controls=el('div',null,'plan-controls');
      const h=dropdown('Compare after');
      for(let i=1;i<=4;i++){const o=el('option',i+' week'+(i>1?'s':''));o.value=i;h.select.append(o);}
      h.select.value=horizon;h.select.dataset.control='horizon';
      h.select.addEventListener('change',()=>{horizon=Number(h.select.value);draw('horizon');});
      const home=state.sites.find(s=>s.id===state.activeId);
      const clock=dropdown('Active play before each weekly close');
      for(const seconds of [0,15,30,60,120,300]){
        const option=el('option',seconds===0?'None · advance immediately':seconds<60?seconds+' seconds':(seconds/60)+' min');
        option.value=seconds;clock.select.append(option);
      }
      clock.select.value=workSeconds;clock.select.dataset.control='work-time';
      clock.select.addEventListener('change',()=>{workSeconds=Number(clock.select.value);draw('work-time');});
      const refresh=btn('Use current district conditions',()=>{capture();draw('refresh');});refresh.dataset.control='refresh';
      const copyBranch=btn('Copy Plan A → B',()=>{plans[1]=plans[0].map(m=>({...m}));draw('copy-branch');});copyBranch.dataset.control='copy-branch';
      const swapBranch=btn('Swap A ↔ B',()=>{[plans[0],plans[1]]=[plans[1],plans[0]];draw('swap-branch');});swapBranch.dataset.control='swap-branch';
      const toolbar=el('div',null,'plan-toolbar');toolbar.append(refresh,copyBranch,swapBranch);
      root.append(el('p','Compare two plans from the same moment in '+home.name+', week '+state.week+'. Choose how long the game stays visible before each calendar advance. Only staffed projects make progress during that time.','plan-intro'),h.label,clock.label,toolbar);
      drawBranch(0,controls);drawBranch(1,controls);root.append(controls);
      const keys=plans.map(plan=>JSON.stringify([horizon,workSeconds,plan]));
      for(const key of previousResults.keys())if(!keys.includes(key))previousResults.delete(key);
      const [a,b]=plans.map((plan,i)=>{
        if(!previousResults.has(keys[i]))previousResults.set(keys[i],project(state,plan,horizon,workSeconds));
        return previousResults.get(keys[i]);
      });
      if(a.ok&&b.ok){
        const table=el('table',null,'plan-table');
        table.append(el('caption','Projected conditions in week '+a.week));
        const head=el('thead'),hr=el('tr');['Measure','Today','Plan A','Plan B'].forEach(t=>hr.append(el('th',t)));head.append(hr);table.append(head);
        const body=el('tbody');
        function row(label,today,first,second) {
          const r=el('tr');r.append(el('th',label),el('td',today),el('td',first),el('td',second));
          if(first!==second)r.className='plan-difference';body.append(r);
        }
        for(const [key,label] of Object.entries(dimensions))row(label,home[key],a.site[key],b.site[key]);
        if(home.buildings.length!==a.openBuildings||home.buildings.length!==b.openBuildings)row('Open central buildings',home.buildings.length,a.openBuildings,b.openBuildings);
        const ongoing=home.construction?.length || 0;
        if(ongoing||a.ongoing||b.ongoing)row('Projects under construction',ongoing,a.ongoing,b.ongoing);
        if(a.city&&b.city) {
          const today=cityModel().overview(home);
          for(const [key,label] of Object.entries(urbanMeasures))if(a.city[key]!==b.city[key]||a.city[key]!==today[key])row(label,today[key],a.city[key],b.city[key]);
        }
        const beforeLinks=globalThis.EarthNeighbours?.summary(home).links||[];
        for(const pair of a.links){
          const before=beforeLinks.find(link=>link.id===pair.id),other=b.links.find(link=>link.id===pair.id);
          if(before&&other&&(pair.strength!==before.strength||pair.strength!==other.strength)){
            row(pair.names.join(' & '),before.status,pair.status,other.status);
          }
          if(before&&other&&(pair.handover!==before.handover||pair.handover!==other.handover)){
            row(pair.names.join(' & ')+' · agreement',before.handover||'None',pair.handover||'None',other.handover||'None');
          }
        }
        for(const p of a.people){
          const orig=home.residents.find(r=>r.id===p.id),other=b.people.find(r=>r.id===p.id);
          if(orig&&other&&(p.bond!==orig.bond||p.bond!==other.bond))row(p.name+' · bond',orig.bond,p.bond??'Away',other.bond??'Away');
        }
        const baseSites=new Map(state.sites.map(s=>[s.id,s])),otherSites=new Map(b.sites.map(s=>[s.id,s]));
        for(const dest of a.sites){
          if(dest.id===home.id)continue;
          const other=otherSites.get(dest.id),base=baseSites.get(dest.id);
          for(const key of ['food','trust','wellbeing'])if(dest[key]!==other[key])row(dest.name+' · '+key,base[key],dest[key],other[key]);
        }
        table.append(body);root.append(table);
        for(const [index,result] of [a,b].entries()){
          const d=el('details',null,'rehearsal-log');d.append(el('summary','What happens in plan '+(index===0?'A':'B')));
          d.addEventListener('toggle',()=>{
            if(!d.open||d.querySelector('ul'))return;
            const list=el('ul');
            for(const effect of result.effects)list.append(el('li',effect));
            if(!result.effects.length)list.append(el('li','Only routine production and household consumption take place.'));
            d.append(list);
          });
          root.append(d);
        }
      }else root.append(el('p',a.message||b.message,'action-reason'));
      if(focus)root.querySelector('[data-control="'+focus+'"]')?.focus({preventScroll:true});
    }
    const details=root.closest('details');
    function render() {
      if(details)details.hidden=!live.active();
      if(!live.active()||details&&!details.open)return;
      // Keep the selected branches stable while real crews work in the background.
      if(!state||liveWorld!==live.state||state.activeId!==live.state.activeId){fresh();draw();}
    }
    details?.addEventListener('toggle',render);
    function compareCity(location,project) {
      if(!live.active()||!details)return;
      const check=cityModel()?.preview(live.active(),live.state,location,project);
      if(!check?.available)return;
      fresh();horizon=Math.max(2,check.turns);
      plans=[[{id:idle}],[{id:cityMove,location,project}]];
      details.hidden=false;details.open=true;draw('project-1-0');
      details.scrollIntoView({block:'start',behavior:'instant'});
    }
    return {render,compareCity,destroy(){details?.removeEventListener('toggle',render);root.replaceChildren();}};
  }
  globalThis.EarthPlanner=Object.freeze({project,mount});
})();
