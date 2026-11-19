/* Street construction controls. Clock updates patch the existing fields so a player can keep reading or changing a role. */
(() => {
  'use strict';

  function mount({sim, inspect, watch, chooseCrew, onResult, onChange}) {
    const view=()=>sim.constructionView?.()||{jobs:[],workers:[],preferences:[]};
    const node=(tag,cls,text)=>{
      const element=document.createElement(tag);
      if(cls)element.className=cls;
      if(text!=null)element.textContent=text;
      return element;
    };
    const button=(label,fn,action,cls='secondary-button')=>{
      const b=node('button',cls,label);b.type='button';b.dataset.action=action;b.addEventListener('click',fn);return b;
    };
    const put=(el,text)=>{if(el && el.textContent!==text)el.textContent=text;};
    const location=job=>job.scope==='city'?'City precinct '+(job.precinct+1):'Street plot '+(job.plot+1);
    const seconds=n=>{
      const time=Math.max(1,Math.ceil(n));
      if(time<60)return time+' sec';
      const rem=time%60;
      return Math.floor(time/60)+' min'+(rem?' '+rem+' sec':'');
    };
    const workersOf=model=>model?.workers||model?.roster||[];

    function jobCard(job,expanded=false,model) {
      const card=node('article','worksite-card');
      card.dataset.worksite=job.id;
      card.append(node('small','worksite-location',location(job)),node('h3','',job.name));
      const progress=node('progress','worksite-progress');
      progress.max=100;progress.setAttribute('aria-label',job.name+' construction progress');
      const fields=node('div','worksite-stages');
      const percent=node('span','worksite-percent');percent.setAttribute('aria-hidden','true');
      fields.append(node('strong','worksite-stage'),percent);
      card.append(fields,progress,node('p','worksite-eta'),node('p','worksite-crew'));
      const actions=node('div','worksite-actions');
      actions.append(button(expanded?'See worksite':'Inspect worksite',()=>expanded?watch(job.id):inspect(job.id),'worksite:'+job.id));
      if(expanded){
        if(job.scope==='city')actions.append(button('See crew on street',()=>watch(job.id,true),'watch-gate:'+job.id));
        const pause=button('Pause work',async()=>{
          if(pause.dataset.pending)return;
          const next=pause.dataset.paused!=='true';
          pause.dataset.pending='true';pause.setAttribute('aria-busy','true');
          try{
            const result=await sim.perform('setConstructionPaused',job.id,next);
            onResult(result);onChange(result,true);
          }finally{delete pause.dataset.pending;pause.removeAttribute('aria-busy');}
        },'pause-worksite:'+job.id);
        pause.classList.add('worksite-pause');
        const assign=button('Assign on map',e=>chooseCrew(e.currentTarget,view().jobs.find(j=>j.id===job.id)?.workers||[]),'assign-worksite:'+job.id);
        assign.classList.add('worksite-assign');actions.append(assign,pause);
        const cancel=node('details','worksite-cancel');
        cancel.dataset.worksiteDisclosure='cancel:'+job.id;
        const summary=node('summary','',job.kind==='dismantle'?'Restore this facility':'Review cancellation');
        summary.dataset.action='cancel-review:'+job.id;
        const confirm=button(job.kind==='dismantle'?'Restore facility':'Cancel project',async()=>{
          if(confirm.dataset.pending)return;
          const quote=confirm.dataset.funds===undefined?undefined:{funds:Number(confirm.dataset.funds),materials:Number(confirm.dataset.materials)};
          confirm.dataset.pending='true';confirm.disabled=true;
          try{
            const result=await sim.perform('cancelConstruction',job.id,quote);
            onResult(result);onChange(result);
          }finally{delete confirm.dataset.pending;confirm.disabled=false;}
        },'cancel-worksite:'+job.id,'secondary-button');
        cancel.append(summary,node('p','worksite-refund'),confirm);
        card.append(actions,cancel);
      }else card.append(actions);
      updateCard(card,job,model);
      return card;
    }
    function updateCard(card,job,model) {
      const pct=Math.max(0,Math.min(100,Math.floor(job.progress*100)));
      const bar=card.querySelector('progress');
      if(bar.value!==pct)bar.value=pct;
      put(card.querySelector('.worksite-stage'),job.stage+' · '+job.status);
      put(card.querySelector('.worksite-percent'),pct+'%');
      const pause=card.querySelector('.worksite-pause');
      if(pause){
        put(pause,job.paused?'Resume work':'Pause work');pause.dataset.paused=String(!!job.paused);
        card.querySelector('.worksite-assign').disabled=!!job.paused;
      }
      put(card.querySelector('.worksite-eta'),job.loadIssue||(job.paused?'Progress is saved. Resume work when you need this project.':Number.isFinite(job.etaSeconds)?'About '+seconds(job.etaSeconds)+' of play with this crew.':'Work resumes when a builder is available.'));
      const states={travelling:'travelling',building:job.kind==='dismantle'?'dismantling':'building',resting:'on break'};
      const crew=(job.workers||[]).map((id,index)=>{
        const worker=workersOf(model).find(w=>w.residentId===id);
        const name=worker?.name||job.workerNames[index];
        return states[worker?.activity]?name+' ('+states[worker.activity]+')':name;
      });
      put(card.querySelector('.worksite-crew'),crew.length?'Crew · '+crew.join(', '):'Crew · No one assigned');
      const refund=card.querySelector('.worksite-refund');
      if(refund){
        const preview=sim.previewCancelConstruction(job.id);
        const amounts=preview.refund;
        const text=job.scope==='city'&&amounts?preview.text+' Recover '+amounts.funds+' funds and '+amounts.materials+' materials.':preview.text;
        put(refund,text||preview.reason);
        if(job.kind==='dismantle'){
          put(refund.closest('details').querySelector('summary'),preview.available?'Restore this facility':'Dismantling terms');
        }
        const control=card.querySelector('.worksite-cancel button');
        if(amounts){control.dataset.funds=String(amounts.funds);control.dataset.materials=String(amounts.materials);}
        control.disabled=!preview.available||Boolean(control.dataset.pending);
        control.hidden=job.kind==='dismantle'&&!preview.available;
      }
    }
    function jobList(list,model) {
      if(!model.jobs.length){
        const issue=sim.worksiteLoadIssue?.(sim.active());
        if(issue)list.append(node('p','worksite-explainer',issue));
        return;
      }
      const heading=node('div','worksite-queue-head');
      heading.append(node('h3','worksite-heading','Active worksites'),button('Assign on map',e=>chooseCrew(e.currentTarget,[]),'assign-worksites'));
      list.append(heading);
      for(const job of model.jobs)list.append(jobCard(job,false,model));
    }
    function workerInfo(worker,model) {
      const job=model.jobs.find(j=>j.id===worker.jobId);
      const place=job?.original?.name||job?.name;
      if(worker.activity==='busy'&&worker.physicalDuty&&worker.workplace)return worker.travelling?'Walking to '+worker.workplace.label+' · '+worker.role:worker.role+' · '+worker.workplace.label;
      if(worker.activity==='travelling'&&job)return 'Walking to '+place+(worker.travelLeft>0?' · '+seconds(worker.travelLeft):'');
      if(worker.activity==='building'&&job)return (job.kind==='dismantle'?'Dismantling ':'Building ')+place;
      if(worker.activity==='commuting'&&worker.workplace)return 'Walking to '+worker.workplace.label+(worker.travelLeft>0?' · '+seconds(worker.travelLeft):'');
      if(worker.activity==='working'&&worker.workplace)return worker.role+' · '+worker.workplace.label;
      if(worker.activity==='returning')return 'Walking back'+(worker.travelLeft>0?' · '+seconds(worker.travelLeft):'');
      if(worker.activity==='resting'&&job)return 'On break · next '+place+(worker.restLeft>0?' · '+seconds(worker.restLeft):'');
      return worker.activity==='usual'?'At home · '+worker.role:worker.role;
    }
    function residentSummary(person,model) {
      const note=node('small','resident-duty');
      note.dataset.residentDuty=person.id;
      const worker=workersOf(model).find(w=>w.residentId===person.id);
      if(worker)note.textContent=workerInfo(worker,model);
      return note;
    }
    function updateWorker(row,worker,model) {
      put(row.querySelector('.worksite-worker-status'),workerInfo(worker,model));
      put(row.querySelector('.worksite-worker-reason'),worker.reason);
      const present=Object.entries(worker.weeklyDelta||{}).filter(([,amount])=>amount);
      const expected=Object.entries(worker.preferenceDelta||{}).filter(([,amount])=>amount);
      const prospective=!present.length&&expected.length>0;
      const delta=(prospective?expected:present).map(([good,amount])=>(amount>0?'+':'')+amount+' '+good);
      const tradeoff=row.querySelector('.worksite-worker-yield');
      put(tradeoff,delta.length?(prospective?'When this work begins · ':'Weekly production · ')+delta.join(', '):'');
      tradeoff.hidden=!delta.length;
      const select=row.querySelector('select');
      for(const option of select.querySelectorAll('optgroup option')){
        const job=model.jobs.find(j=>'job:'+j.id===option.value);
        option.disabled=!job||!!job.paused;
        if(job)put(option,job.name+' · '+location(job)+(job.paused?' (paused)':''));
      }
      const value=worker.preference==='build'&&worker.preferredJobId?'job:'+worker.preferredJobId:worker.preference;
      if(select.value!==value && (document.activeElement!==select||select.selectedOptions[0]?.disabled))select.value=value;
    }
    function workerRow(worker,model) {
      const row=node('div','worksite-worker'); row.dataset.worker=worker.residentId;
      const name=node('strong','',worker.name),state=node('span','worksite-worker-status');
      const label=node('label','worksite-role'),select=node('select');
      select.dataset.action='work-role:'+worker.residentId;
      label.append(node('span','','Weekly community duty'),select);
      select.setAttribute('aria-label','Weekly duty for '+worker.name);
      for(const preference of model.preferences){
        const option=node('option','',preference.label);option.value=preference.id;select.append(option);
      }
      if(model.jobs.length){
        const group=node('optgroup');group.label='Request a particular worksite';
        for(const job of model.jobs){
          const option=node('option','',job.name+' · '+location(job));
          option.value='job:'+job.id;option.disabled=!!job.paused;group.append(option);
        }
        select.append(group);
      }
      select.addEventListener('change',async()=>{
        const choice=select.value;
        const jobId=choice.startsWith('job:')?choice.slice(4):null;
        const result=await sim.perform('setWorkPreference',worker.residentId,jobId?'build':choice,jobId);
        onResult(result);
        const latest=view(),saved=workersOf(latest).find(w=>w.residentId===worker.residentId);
        if(saved)select.value=saved.preference==='build'&&saved.preferredJobId?'job:'+saved.preferredJobId:saved.preference;
        update(document,latest);
        onChange(result,true);
      });
      row.append(name,state,node('p','worksite-worker-reason'),node('small','worksite-worker-yield'),label);
      updateWorker(row,worker,model);
      return row;
    }
    function roster(list,model,{personId,open=false}={}) {
      const workers=workersOf(model).filter(w=>!personId||w.residentId===personId);
      if(!workers.length)return;
      const group=node('details','worksite-roster');
      group.dataset.worksiteDisclosure='crew:'+(personId||'all');
      group.open=open;
      const title=personId?'Work and weekly duty':'Crew and weekly duties';
      const summary=node('summary','',title);summary.dataset.action=group.dataset.worksiteDisclosure;
      group.append(summary,node('p','worksite-explainer','Residents choose work around their commitments. You can request a different weekly duty or worksite.'));
      for(const worker of workers)group.append(workerRow(worker,model));
      if(personId&&model.jobs.length)group.append(button('Assign on map',e=>chooseCrew(e.currentTarget,[personId]),'assign-person:'+personId));
      list.append(group);
    }
    function estimate(action,plot) {
      const site=sim.active(),scheduler=window.EarthConstruction;
      if(!site||!scheduler||!Number.isInteger(plot))return null;
      const paid=action.goods||{};
      const projected={...site,funds:site.funds-(paid.funds||0),materials:site.materials-(paid.materials||0)};
      const result=scheduler.preview(projected,sim.state,{id:'preview',scope:'street',plot,kind:action.kind,name:action.label,paid},site);
      return result.ok?result.job:null;
    }
    function proposal(list,action,plot) {
      const job=estimate(action,plot);
      if(!job)return;
      const details=list.querySelector('.worksite-proposal')||node('div','worksite-proposal');
      const timing=Number.isFinite(job.etaSeconds)?'About '+seconds(job.etaSeconds)+' of active play.':'Waiting for a resident to take up the work.';
      details.replaceChildren(node('strong','','Map preview · Plot '+(plot+1)),node('p','',job.workerNames?.length?'Expected crew · '+job.workerNames.join(', '):'No one currently available'),node('small','',timing+' Benefits begin when the site opens.'));
      const changes=Object.entries(job.weeklyDelta||{}).filter(([,amount])=>amount)
        .map(([good,amount])=>(amount>0?'+':'')+amount+' '+good);
      if(changes.length)details.append(node('small','worksite-worker-yield','While building · '+changes.join(', ')+' per week.'));
      if(!details.parentElement)list.append(details);
    }
    function updateLots(list,action) {
      for(const note of list.querySelectorAll('[data-plot-estimate]')){
        const job=estimate(action,Number(note.dataset.plotEstimate));
        if(!job)continue;
        const names=job.workerNames?.join(', ');
        const time=Number.isFinite(job.etaSeconds)?seconds(job.etaSeconds):'';
        put(note,names?(names+(time?' · ~'+time:'')):'Needs a builder');
        const control=note.parentElement;
        control.setAttribute('aria-label',control.dataset.plotDescription.replace(/\.$/,'')+(names?'. Expected crew '+names+'. About '+time+'.':'. Waiting for a builder.'));
      }
    }
    function finishWhileEditing(root,completed,model) {
      const finished=new Map(completed.map(job=>[job.id,job]));
      for(const card of root.querySelectorAll('[data-worksite]')){
        const job=finished.get(card.dataset.worksite);
        if(!job)continue;
        // Keep the focused role field below the card at the same reading position.
        card.style.minHeight=card.getBoundingClientRect().height+'px';
        card.querySelector('progress').value=100;
        put(card.querySelector('.worksite-percent'),'100%');
        put(card.querySelector('.worksite-stage'),'Work complete');
        put(card.querySelector('.worksite-eta'),job.message||'The crew finished this site.');
        put(card.querySelector('.worksite-crew'),'');
        for(const control of card.querySelectorAll('button,details'))control.hidden=true;
      }
      update(root,model);
    }
    function update(root,model=view()) {
      const jobs=new Map(model.jobs.map(job=>[job.id,job])),workers=new Map(workersOf(model).map(w=>[w.residentId,w]));
      for(const card of root.querySelectorAll('[data-worksite]')){
        const job=jobs.get(card.dataset.worksite);
        if(job)updateCard(card,job,model);
      }
      for(const label of root.querySelectorAll('[data-resident-duty]')){
        const worker=workers.get(label.dataset.residentDuty);
        if(worker)put(label,workerInfo(worker,model));
      }
      for(const row of root.querySelectorAll('[data-worker]')){
        const worker=workers.get(row.dataset.worker);
        if(worker)updateWorker(row,worker,model);
      }
    }
    return {view,jobCard,jobList,roster,proposal,updateLots,update,finishWhileEditing,workerInfo,residentSummary};
  }
  window.EarthWorksitePanel={mount};
})();
