/* A decision rehearsal uses a private copy of the full simulation and its rules. */
(() => {
  'use strict';
  const dimensions={food:'Food',funds:'Funds',materials:'Materials',trust:'Trust',wellbeing:'Wellbeing',population:'Residents'};
  const groups={work:'Work',people:'Relationships',build:'Construction',city:'City planning',council:'Council',research:'Research',routes:'Trade routes'};
  const idle='wait', cityMove='city-project';
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
        const preview=model.preview(site,sim.state,location,id);
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
    if(urbanOptions(sim,true).length)available.push({id:cityMove,group:'city',label:'Plan a precinct project',cost:null});
    return available;
  }
  function apply(sim,move) {
    if(!move || move.id===idle)return {ok:true,message:''};
    if(move.id===cityMove)return sim.planCity(move.location,move.project);
    return sim.act(move.id,move.plot);
  }
  function project(initial,plan,horizon) {
    if(!Number.isInteger(horizon)||horizon<1||horizon>4)return {ok:false,message:'Choose a horizon of one to four weeks.'};
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
        const result=sim.advance({includeHighlights:true});
        if(!result.ok)return result;
        for(const note of result.highlights)effects.push(note);
      }
      const end=sim.active();
      return {ok:true,week:sim.state.week,name:end.name,site:Object.fromEntries(Object.keys(dimensions).map(k=>[k,end[k]])),
        city:cityModel()?.overview(end),
        links:globalThis.EarthNeighbours?.summary(end).links||[],
        people:people.map(p=>{const endPerson=end.residents.find(r=>r.id===p.id);return {...p,bond:endPerson.bond,promise:endPerson.promise?.dueWeek||null};}),
        sites:sim.state.sites.map(s=>({id:s.id,name:s.name,food:s.food,trust:s.trust,wellbeing:s.wellbeing})), effects};
    } finally {sim.destroy();}
  }
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
  const btn=(text,fn)=>{const n=el('button',text,'text-button');n.type='button';n.addEventListener('click',fn);return n;};
  function dropdown(caption) {
    const label=el('label',caption),select=el('select');label.append(select);return {label,select};
  }
  function mount(root,live) {
    let state, fingerprint='', horizon=2, plans=[];
    function fresh() {
      state=JSON.parse(JSON.stringify(live.state));
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
                : 'Opens in week '+selected.preview.week+'. '+selected.preview.people;
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
      root.append(el('p','Try two plans for '+home.name+' from week '+state.week+'. Both start with today’s resources. After your chosen moves, the same number of weeks pass with no further player action.','plan-intro'),h.label);
      drawBranch(0,controls);drawBranch(1,controls);root.append(controls);
      const [a,b]=plans.map(plan=>project(state,plan,horizon));
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
          if(p.bond!==orig.bond||p.bond!==other.bond)row(p.name+' · bond',orig.bond,p.bond,other.bond);
        }
        for(const dest of a.sites.filter(x=>x.id!==home.id)){
          const other=b.sites.find(x=>x.id===dest.id),base=state.sites.find(x=>x.id===dest.id);
          for(const key of ['food','trust','wellbeing'])if(dest[key]!==other[key])row(dest.name+' · '+key,base[key],dest[key],other[key]);
        }
        table.append(body);root.append(table);
        for(const [index,result] of [a,b].entries()){
          const d=el('details',null,'rehearsal-log');d.append(el('summary','What happens in plan '+(index===0?'A':'B')));
          const list=el('ul');
          for(const effect of result.effects)list.append(el('li',effect));
          if(!result.effects.length)list.append(el('li','Only routine production and household consumption take place.'));d.append(list);root.append(d);
        }
      }else root.append(el('p',a.message||b.message,'action-reason'));
      if(focus)root.querySelector('[data-control="'+focus+'"]')?.focus({preventScroll:true});
    }
    const details=root.closest('details');
    function render() {
      if(details)details.hidden=!live.active();
      if(!live.active()||details&&!details.open)return;
      const next=JSON.stringify(live.state);
      if(next!==fingerprint){fresh();fingerprint=next;draw();}
    }
    details?.addEventListener('toggle',render);
    function compareCity(location,project) {
      if(!live.active()||!details)return;
      const check=cityModel()?.preview(live.active(),live.state,location,project);
      if(!check?.available)return;
      fresh();fingerprint=JSON.stringify(live.state);horizon=Math.max(2,check.turns);
      plans=[[{id:idle}],[{id:cityMove,location,project}]];
      details.hidden=false;details.open=true;draw('project-1-0');
      details.scrollIntoView({block:'start',behavior:'instant'});
    }
    return {render,compareCity,destroy(){details?.removeEventListener('toggle',render);root.replaceChildren();}};
  }
  globalThis.EarthPlanner=Object.freeze({project,mount});
})();
