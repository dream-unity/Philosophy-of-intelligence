(function(root){
  'use strict';
  function mount({sim,currentTown,focus,ledger,notify}){
    const doc=root.document,get=id=>doc.getElementById(id),control=get('town-population'),sheet=get('town-centre-sheet'),body=get('town-centre-content');
    if(!control||!sheet)return null;
    const centre=root.EarthTownCentre,office=root.EarthPopulationOffice,boundary=root.EarthBoundaryAssembly;
    const el=(tag,text,cls)=>{const n=doc.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
    const add=(tag,msg,parent=body)=>{const n=el(tag,msg);parent.append(n);return n;};
    const button=(label,fn)=>{const b=el('button',label);b.type='button';b.addEventListener('click',()=>{if(b.isConnected)fn();});return b;};
    const option=(text,value)=>{const o=el('option',text);o.value=value;return o;};
    const town=id=>centre.towns(sim.state).find(t=>t.id===id);
    let shown='',page='housing',filter=false,route='regional',person='',criteria={},pending=false,stamp='',ribbonStamp='',status='',visible=false,returnFocus=null;
    const tabs=get('town-centre-tabs'),selector=get('town-centre-select');
    function navigate(id,tab){
      const s=town(id);if(!s?.centre)return;
      if(shown!==id){criteria={};person='';filter=false;status='';}
      shown=id;page=tab;stamp='';draw();
    }
    function close(){
      visible=false;if(sheet.matches?.(':popover-open'))sheet.hidePopover();else sheet.hidden=true;
      returnFocus?.focus?.({preventScroll:true});
    }
    function open(s,tab='housing'){
      if(!s?.centre)return;returnFocus=doc.activeElement;visible=true;
      if(sheet.showPopover){if(!sheet.matches(':popover-open'))sheet.showPopover();}else sheet.hidden=false;
      const list=centre.towns(sim.state).filter(t=>t.centre);
      selector.replaceChildren(...list.map(t=>option(t.name,t.id)));selector.value=s.id;
      navigate(s.id,tab);get('town-centre-close').focus({preventScroll:true});
    }
    sheet.addEventListener('toggle',e=>{if(e.newState==='closed'&&!sheet.matches(':popover-open'))visible=false;});
    get('town-centre-close').addEventListener('click',close);
    selector.addEventListener('change',()=>navigate(selector.value,page));
    control.addEventListener('click',()=>open(currentTown()));
    tabs.addEventListener('click',e=>{const key=e.target.closest('button')?.dataset.townPage;if(key){status='';navigate(shown,key);}});
    function focusAt(s,p){close();focus(s,p);}
    function detail(parent,title,summary){
      const d=el('details'),head=el('summary',title);d.append(head);if(summary)add('p',summary,d);
      parent.append(d);return d;
    }
    function facts(parent,values){
      const list=el('dl',null,'centre-facts');
      for(const [k,v] of values){const cell=el('div');cell.append(el('dt',k),el('dd',String(v)));list.append(cell);}
      parent.append(list);
    }
    function personFacts(container,s,p){
      const d=office.dossier(s,p),scores=Object.entries(d.ability).sort((a,b)=>b[1]-a[1]);
      add('p',p.description,container);
      facts(container,[['Reliability',d.reliability==null?'Awaiting evidence':d.reliability+'/100'],['Assessed potential',d.potential+'/100'],
        ['Learning rate',d.learningRate==null?'No external assessment':d.learningRate+'/100'],['Prior reputation',d.priorReputation==null?'No reference':d.priorReputation+'/100']]);
      add('p',scores.map(([k,n])=>office.title(k)+' '+n).join(' · '),container);
      add('p',Object.entries(p.traits).map(([k,n])=>office.title(k)+' '+n).join(' · '),container);
      add('p',d.evidence+' '+d.record,container);
      if(d.references.length)for(const r of d.references)add('p',r.name+' · '+(r.trust>0?'positive':r.trust<0?'adverse':'neutral')+' reference. They '+r.reason+' in week '+r.week+'.',container);
      else add('p','No local references recorded.',container);
      for(const text of d.history)add('p',text,container);
    }
    function housing(s,v){
      facts(body,[['Residents',s.population],['Completed places',v.capacity],['Unhoused',v.missing],['Visitors',v.visitors]]);
      add('p',v.vacant+' vacant places · '+v.available+' open for allocation · '+v.plots.reduce((n,d)=>n+d.reserved,0)+' reserved.');
      const j=v.project;
      if(j){
        const job=detail(body,(j.kind==='home'?'Two-room dwelling':j.kind==='shop'?'Cooperative store':'Repair workshop')+' under construction · plot '+(j.plot+1),j.reason);job.open=true;
        add('p','Proposed by '+j.proposer+'. '+j.workerName+' is '+['delivering materials','building the frame','finishing the interior'][j.stage]+'. '+j.delivered+'/4 materials delivered · 3 funds in wage escrow.',job);
        job.append(button('Locate worksite',()=>focusAt(s,j.point)),button('Builder’s record',()=>{close();ledger(s,j.worker);}));
      }
      if(s.centre.stall)add('p',s.centre.stall);
      const line=el('label',null,'centre-filter'),box=el('input');box.type='checkbox';box.checked=filter;line.append(box,doc.createTextNode(' Show unhoused residents only'));
      box.addEventListener('change',()=>{filter=box.checked;stamp='';draw();body.querySelector('input')?.focus();});body.append(line);
      const list=el('div',null,'centre-directory');body.append(list);
      for(const r of v.residents.filter(r=>!filter||!r.plot)){
        const d=detail(list,r.p.name+' · '+(r.plot?r.plot.title:'Unhoused'),r.away?'Away from the settlement.':null);
        if(r.plot){add('p','Residential rights · '+(r.plot.owner===r.key?'owner':r.plot.owner?'private guest':'civic tenancy')+' · '+r.cash+' personal funds.',d);d.append(button('Locate dwelling',()=>focusAt(s,r.plot)));}
        else {
          add('p',(r.distress?.last||'Waiting for allocation.')+' Ordinary work resumes when housing is secured.',d);
          if(sim.active()?.id===s.id&&s.id===sim.state.communityLife.homeId)d.append(button('Authorise a relief meal',()=>issue(s,{action:'assist',person:r.key})));
        }
        d.addEventListener('toggle',()=>{
          if(!d.open||d.dataset.populated)return;d.dataset.populated='true';
          personFacts(d,s,r.p);d.append(button('Goals and work',()=>{close();ledger(s,r.p.id);}));
        });
      }
      if(filter&&!v.missing)add('p','Every resident has residential rights.',list);
      if(s.centre.legacyHouseholds)add('p',s.centre.legacyHouseholds+' household members recorded in the earlier census.',list);
      const places=detail(body,'Dwellings and vacancies');
      for(const d of v.plots){
        const row=el('p');row.append(doc.createTextNode(d.title+' · '+d.beds+' places · '+(d.beds-d.free)+' occupied · '+d.free+' vacant · '+d.available+' open. '),
          button('Locate',()=>focusAt(s,d)));places.append(row);
      }
    }
    async function issue(s,request){
      if(pending)return;pending=true;
      try{
        const result=await sim.perform('townCentre',{...request,siteId:s.id,revision:s.centre.revision});
        status=result.message;notify?.(status,!result.ok);
      }finally{pending=false;stamp='';draw();refresh();}
    }
    function recruitment(s,v){
      const c=s.centre,can=s.id===sim.state.communityLife.homeId&&sim.active()?.id===s.id;
      add('p',s.funds+' treasury funds · '+v.available+' open places · '+v.missing+' unhoused residents.');
      if(c.incoming){
        const a=c.incoming;
        add('h3',a.name+' · '+a.stage);
        add('p',a.route==='regional'?'Housing deposit '+a.deposit+' funds · '+a.reason:'Invitation accepted from wider Earth. '+(a.price||0)+' funds paid.');
        if(a.record)personFacts(body,s,office.profile(a.record));return;
      }
      const mode=el('label','Recruitment route'),pick=el('select');mode.append(pick);
      for(const [id,name] of [['regional','Review regional applications · free'],['random','Invite a random person · free'],['targeted','Commission targeted recruitment']])pick.append(option(name,id));
      pick.value=route;pick.addEventListener('change',()=>{route=pick.value;status='';stamp='';draw();});body.append(mode);
      let selected=null;
      if(route==='regional'){
        const rows=office.applications(sim.state,s);
        if(!rows.length){add('p','No applications are on file. Residents can apply as their work and housing needs change.');return;}
        selected=rows.find(a=>a.key===person)||rows[0];person=selected.key;
        const label=el('label','Applicant'),select=el('select');for(const a of rows)select.append(option(a.p.name+' · '+a.origin,a.key));
        select.value=selected.key;label.append(select);body.append(label);select.addEventListener('change',()=>{person=select.value;stamp='';draw();});
        add('p',selected.why+' Personal savings '+selected.cash+' funds.');personFacts(body,town(selected.from),selected.p);
      }else if(route==='targeted'){
        const active=Object.keys(criteria),row=el('div',null,'centre-criterion'),field=el('select');field.setAttribute('aria-label','Add a criterion');
        field.append(option('Choose a criterion',''),...office.fields.filter(f=>!active.includes(f)).map(f=>option(office.title(f),f)));
        field.addEventListener('change',()=>{if(field.value){criteria[field.value]=[65,100];stamp='';draw();}});body.append(field);
        for(const k of active){
          const block=el('fieldset');block.append(el('legend',office.title(k)));
          for(const [i,name] of ['Minimum','Maximum'].entries()){
            const entry=el('label',name),input=el('input');input.type='number';input.min='0';input.max='100';input.value=criteria[k][i];
            input.addEventListener('input',()=>{criteria[k][i]=input.value===''?NaN:Number(input.value);updateQuote();});entry.append(input);block.append(entry);
          }
          block.append(button('Remove',()=>{delete criteria[k];stamp='';draw();}));row.append(block);
        }body.append(row);
      }else add('p','Commit to the invitation before opening the person’s record. The newcomer brings their own savings, career and decisions.');
      const summary=el('p'),action=button('',()=>{
        const q=office.quote(sim.state,s,route,criteria);
        issue(s,{action:'recruit',route,criteria:Object.fromEntries(Object.entries(criteria).map(([k,b])=>[k,[...b]])),applicant:person,price:q.price,deficit:q.projected});
      });
      function updateQuote(){
        const q=office.quote(sim.state,s,route,criteria),poor=selected&&selected.cash<q.personalPrice;
        summary.textContent=q.price===null?'Enter a minimum and maximum between 0 and 100.':
          'Treasury charge '+q.price+' funds. '+(selected?'Applicant pays '+q.personalPrice+(v.available?' for a tenancy.':' to finance a plot and home; relocation waits for completion.'):
          'After arrival: '+(s.population+1)+' residents / '+v.capacity+' completed places. Projected unhoused: '+q.projected+'.');
        action.textContent=route==='regional'?'Accept application':route==='random'?'Commit to a random invitation':'Commission search · '+(q.price??'—')+' funds';
        action.disabled=!can||pending||q.price===null||s.funds<q.price||poor;
      }
      updateQuote();body.append(summary);
      if(can)body.append(action);else add('p','This town’s council decides whom to invite.');
    }
    function reception(s){
      const w=sim.state,origin=town(w.communityLife.homeId),p=w.communityLife.profile,a=boundary.assessment(w,s,p,origin.id),ch=boundary.character(s,w);
      add('h3',ch.type);add('p',ch.detail);add('p',s.centre.history.find(e=>e.kind==='charter')?.text||a.reason);
      facts(body,[['Aggression',ch.aggression+'/100'],['Authority’s aggression',ch.authority+'/100'],['Trust in '+p.name,a.personal+'/100'],['Trust in '+origin.name,a.homeTrust+'/100']]);
      add('h3',a.reception);add('p',a.reason);
      if(!a.own&&!a.pass&&sim.active()?.id===origin.id)body.append(button('Request a visitor pass',()=>issue(origin,{action:'pass',target:s.id})));
      add('h3','What neighbouring towns have heard');
      for(const peer of centre.towns(w).filter(t=>t!==s&&t.centre&&t.communityLife.cluster===s.communityLife.cluster)){
        const r=boundary.reportView(peer,s.id);
        add('p',peer.name+' · '+(r.count?r.score+'/100 · '+(r.trend>0?'+':'')+r.trend+' last change · '+r.confidence+'% confidence. '+r.reason:'Unknown. '+r.reason));
      }
      for(const e of s.centre.incidents||[]){const d=detail(body,e.words);add('p','Witness: '+e.witness+'. '+(e.authorized?'The assembly authorised this response.':'The individual acted without a mandate.'),d);}
    }
    function record(s){
      body.append(button('Locate Town Centre',()=>focusAt(s,centre.centrePoint)));
      if(s.centre.stall)add('p',s.centre.stall);
      for(const e of s.centre.history){const row=el('article');row.append(el('small','Week '+e.week+' · round '+e.round),el('p',e.text));body.append(row);}
      body.append(button('Open development ledger',()=>{close();ledger(s);}));
    }
    function draw(){
      if(!visible)return;const s=town(shown);if(!s?.centre){close();return;}
      const w=sim.state,id=[s.id,w.week,w.actionRevision,s.growth?.round,s.centre.revision,page,route,filter].join('/');
      if(stamp===id)return;
      const typing=doc.activeElement?.matches('input[type=number]')&&body.contains(doc.activeElement);
      if(typing&&stamp)return;
      stamp=id;
      const openDetails=new Set([...body.querySelectorAll('details[open]')].map(d=>d.firstElementChild.textContent));
      const scroll=body.scrollTop;body.replaceChildren();
      selector.value=s.id;for(const b of tabs.children)b.setAttribute('aria-pressed',String(b.dataset.townPage===page));
      if(page==='housing')housing(s,centre.view(w,s));
      else if(page==='recruitment')recruitment(s,centre.view(w,s));
      else if(page==='reception')reception(s);else record(s);
      if(status)add('p',status).setAttribute('role','status');
      for(const d of body.querySelectorAll('details'))if(openDetails.has(d.firstElementChild.textContent))d.open=true;
      body.scrollTop=scroll;
    }
    function refresh(){
      const s=currentTown();control.hidden=!s?.centre;if(!s?.centre)return;
      const w=sim.state,stamp=[s.id,w.week,w.actionRevision,w.productionSerial,s.centre.revision,s.population].join('/');
      if(ribbonStamp!==stamp){
        const v=centre.view(w,s);ribbonStamp=stamp;get('population-town').textContent=s.name;
        get('population-count').textContent=v.population+' / '+v.capacity+(v.missing?' · '+v.missing+' unhoused':'');
        control.setAttribute('aria-label',s.name+', '+v.population+' residents, '+v.capacity+' completed places, '+v.missing+' unhoused. Open housing directory.');
      }
      draw();
    }
    return {open,refresh};
  }
  root.EarthTownCentreUI={mount};
})(typeof window==='undefined'?globalThis:window);
