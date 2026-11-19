/* The directory, aptitude tables and career rules are evaluated only for an
   open profile. In-person proposals recheck the original person at commit. */
(function(root){
  'use strict';
  const title=text=>text?text.charAt(0).toUpperCase()+text.slice(1):'';
  function mount(panel,{sim,street,version,meet,playAs,after,onResult,reviewWeek}){
    if(!panel || !root.EarthPersonas || !root.EarthCareers || !root.EarthAutonomy)return null;
    const doc=panel.ownerDocument,personField=doc.getElementById('life-person'),profileBox=doc.getElementById('life-profile');
    const tabs=doc.getElementById('life-pages'),content=doc.getElementById('life-content'),status=doc.getElementById('life-feedback');
    const careers=root.EarthCareers,personas=root.EarthPersonas,autonomy=root.EarthAutonomy;
    let personId=null,targetId=null,page='career',siteKey='',renderKey='',personKey='',generation=0,busy=false,pendingTrip=null;
    function field(tag,text,cls){
      const el=doc.createElement(tag);
      if(text!=null)el.textContent=text;
      if(cls)el.className=cls;
      return el;
    }
    function control(label,onClick,key,cls='secondary-button'){
      const btn=field('button',label,cls);btn.type='button';btn.dataset.lifeControl=key;
      btn.addEventListener('click',onClick);return btn;
    }
    function note(text){status.textContent=text||'';status.hidden=!text;}
    function selectOptions(select,rows){
      select.replaceChildren(...rows.map(row=>{const option=field('option',row.label);option.value=row.id;return option;}));
    }
    function choose(id){
      if(personId!==id){generation++;targetId=null;pendingTrip=null;renderKey='';note('');}
      personId=id;
    }
    function open(id){
      if(!sim.active()||!street())return;
      const site=sim.active();
      if(id&&!personas.profile(site,id))return;
      panel.open=true;resetSite(site);choose(id||root.EarthAgency.actorId(site));
      render();panel.scrollIntoView({block:'start',behavior:'instant'});personField.focus({preventScroll:true});
    }
    function resetSite(site){
      const key=[site.id,site.foundingRevision||0,site.lat,site.lon].join('/');
      if(siteKey===key)return;
      siteKey=key;personKey='';generation++;personId=null;targetId=null;page='career';renderKey='';pendingTrip=null;note('');
    }
    function invalidate(){
      generation++;pendingTrip=null;siteKey='';renderKey='';personKey='';personId=null;targetId=null;page='career';note('');
    }
    panel.addEventListener('toggle',()=>{
      generation++;pendingTrip=null;
      if(panel.open)render();else note('');
    });
    doc.addEventListener('visibilitychange',()=>{
      if(doc.hidden){generation++;pendingTrip=null;}
    });
    personField.addEventListener('change',()=>{choose(personField.value);render();});
    tabs.addEventListener('click',event=>{
      const button=event.target.closest('[data-life-page]');
      if(!button||button.dataset.lifePage===page)return;
      page=button.dataset.lifePage;generation++;pendingTrip=null;renderKey='';note('');render();
    });
    function approachId(site,id){
      return site.residents.some(p=>p.id===id)?{type:'resident',residentId:id}:{type:'npc',npcId:id};
    }
    function submit(person,choice,domain,meetingId){
      if(busy||!choice.available||!panel.open||doc.hidden||!street())return;
      const site=sim.active(),actor=root.EarthAgency.actorId(site),week=sim.state.week,expectedGeneration=generation;
      const request={domain,action:choice.id,targetId:domain==='career'?(choice.targetId||targetId):null,expectedRevision:choice.expectedRevision,
        actorId:actor,siteId:site.id,generation:site.foundingRevision||0,week};
      if(choice.coverId)request.coverId=choice.coverId;
      if(domain==='term'){request.weeks=choice.weeks;request.actionRevision=choice.actionRevision;}
      const current=()=>panel.open&&!doc.hidden&&street()&&personId===person.id&&generation===expectedGeneration&&sim.state.week===week&&
        sim.state.activeId===site.id&&(sim.active()?.foundingRevision||0)===request.generation&&root.EarthAgency.actorId(sim.active())===actor;
      const ref=meetingId?approachId(site,meetingId):null;
      async function commit(){
        if(!current()||busy)return;
        pendingTrip=null;busy=true;content.setAttribute('aria-busy','true');
        const local=street(),trip=version();
        const guard=()=>{
          if(!current()||street()!==local||version()!==trip)return null;
          return ref?local.meeting(ref,true):local.getState();
        };
        try{
          const result=await sim.perform(domain==='term'?'studyTerm':'lifeAction',person.id,request,guard);
          if(domain==='term'&&result.ok){
            if(panel.open&&street()===local&&generation===expectedGeneration&&sim.active()?.id===site.id){
              note(result.message);onResult?.(result);after?.();renderKey='';render();
            }
            return;
          }
          if(!current()||street()!==local||version()!==trip)return;
          note(result.message);onResult?.(result);
          if(result.ok||result.changed)after?.();renderKey='';render();
        }catch{
          if(current())note('The decision could not be saved. Review the current choices and try again.');
        }finally{busy=false;content.removeAttribute('aria-busy');}
      }
      if(!ref||street().meeting(ref)?.mode==='walk')return commit();
      const whom=personas.profile(site,meetingId);if(!whom)return;
      const ticket={};pendingTrip=ticket;
      const started=meet(ref,whom.name,()=>{if(pendingTrip===ticket)return commit();});
      if(!started){pendingTrip=null;note('Reach '+whom.name+' on foot to have this conversation.');}
      else if(pendingTrip===ticket)note('Walking to '+whom.name+' for '+choice.label.toLowerCase()+'.');
    }
    function rankJobs(person,skills,jobs){
      const compatible=jobs.filter(job=>person.bounds[job.skill]&&Number.isFinite(job.requiredSkill));
      return compatible.sort((a,b)=>{
        const attainable=job=>careers.fits(person,job);
        const match=job=>(skills[job.skill]??person.aptitudes[job.skill])*2+(skills[job.secondary]??person.aptitudes[job.secondary]);
        return Number(attainable(b))-Number(attainable(a))||
          match(b)-match(a)||b.requiredSkill-a.requiredSkill||a.label.localeCompare(b.label);
      });
    }
    function offerRows(person,choices,domain,actor){
      const list=field('ul',null,'life-offers');
      for(const choice of choices){
        const offActor=actor!==person.id,mentor=choice.id==='mentor'&&domain==='career';
        const meetingId=offActor?person.id:mentor?choice.mentorId:null;
        const offMentor=offActor&&mentor;
        const label=offActor&&domain==='career'?'Propose · '+choice.label:choice.label;
        const row=field('li',null,'life-offer');
        const active=generation;
        const btn=control(label,()=>{
          if(active===generation&&row.isConnected)return submit(person,choice,domain,meetingId);
        },domain+'-'+choice.id);
        btn.disabled=offMentor||!choice.available;
        row.append(btn);
        if(choice.detail)row.append(field('p',choice.detail));
        const reason=offMentor?(choice.reason||'The learner and mentor need to meet in person.'):
          !choice.available?choice.reason:'';
        if(reason)row.append(field('p',reason,'life-reason'));
        list.append(row);
      }
      return list;
    }
    function specialistOpening(opening){
      const box=field('section',null,'life-term');
      const {free,capacity,team,waiters}=opening;
      box.append(field('h4',free+' of '+capacity+' specialist '+(capacity===1?'post':'posts')+' open'));
      if(opening.reason)box.append(field('p',opening.reason));
      if(team?.length){
        const status={appointed:'in post',notice:'serving notice',offer:'offer reserved'};
        box.append(field('p',team.map(p=>p.name+' · '+(status[p.status]||p.status)).join(' / '),'life-muted'));
      }
      if(waiters?.length)box.append(field('p','Waiting for a post · '+waiters.map(p=>p.name+' (since week '+p.since+')').join(', '),'life-muted'));
      if(Number.isInteger(opening.nextReview))box.append(field('p','Next hiring review · Week '+opening.nextReview,'life-role'));
      if(opening.relief){
        box.append(field('h4','Temporary relief duty'));
        if(opening.service)box.append(field('p',opening.service));
        if(opening.relief.reason)box.append(field('p',opening.relief.reason,'life-muted'));
      }
      return box;
    }
    function careerPage(site,person,model,job,ranked){
      const section=field('section',null,'life-section'),select=field('select');
      select.dataset.lifeControl='career-target';
      const label=field('label','Career to explore');label.append(select);
      selectOptions(select,[...careers.catalog].sort((a,b)=>a.label.localeCompare(b.label)));select.value=targetId;
      function explore(id){
        targetId=id;generation++;pendingTrip=null;renderKey='';note('');render();
        content.querySelector('[data-life-control="career-target"]')?.focus({preventScroll:true});
      }
      select.addEventListener('change',()=>explore(select.value));
      const lookup=field('details',null,'life-search'),filter=field('input'),matches=field('div');
      filter.type='search';filter.placeholder='E.g. nurse or garbage collector';
      const filterLabel=field('label','Career or employer');filterLabel.append(filter);
      lookup.append(field('summary','Find a career by name'),filterLabel,matches);
      const normalise=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
      filter.addEventListener('input',()=>{
        const needle=normalise(filter.value);
        if(!needle){matches.replaceChildren();return;}
        const jobs=careers.catalog.filter(j=>{
          const alias=j.id==='refuse'?'garbage collector waste collection':j.id==='teacher'?'high school teacher':'';
          const words=normalise(j.label+' '+j.employer+' '+alias);
          return needle.split(' ').every(word=>words.includes(word));
        });
        matches.replaceChildren(...jobs.map(j=>control(j.label,()=>explore(j.id),'search-'+j.id,'text-button')));
        if(!jobs.length)matches.append(field('p','No match. Try a profession or employer name.','life-muted'));
      });
      section.append(label,lookup);
      if(job){
        const skill=job.skill,level=model.skills[skill],ceiling=person.bounds[skill]?.max;
        section.append(field('p',job.employer+' · '+job.trainingWeeks+' course credits','life-role'));
        if(job.service)section.append(field('p',job.service,'life-muted'));
        const readings=field('dl',null,'life-skills');
        for(const [axis,entry] of [[skill,job.requiredSkill],[job.secondary,job.secondMinimum]]){
          const row=field('div');row.append(field('dt',title(axis)),field('dd','Skill '+model.skills[axis]+' · Entry '+entry+' · Limit '+person.bounds[axis].max));readings.append(row);
        }
        section.append(readings);
        if(!model.fits)section.append(field('p','This post exceeds '+person.name+'’s learning range. Practice can still build '+skill+' from '+level+' toward '+ceiling+' as a personal interest.','life-muted'));
        else if(ceiling<job.requiredSkill)section.append(field('p','Work samples can demonstrate up to 6 points toward the '+skill+' entry standard.','life-muted'));
        if(model.careerId!==job.id&&model.missing.length){
          section.append(field('p','Still needed · '+model.missing.join(' · '),'life-muted'));
        }
      }
      const best=ranked[0];
      if(best&&best.id!==targetId){
        const link=control('Compare '+best.label+' · strong fit in '+best.skill,()=>explore(best.id),'career-fit','text-button');
        section.append(link);
      }else if(best)section.append(field('p','Strong fit for '+person.name+'’s '+best.skill+' and '+best.secondary+'.','life-muted'));
      if(model.stage!=='employed'&&model.status)section.append(field('p',model.status));
      if(model.training?.phaseDetail)section.append(field('p',model.training.phaseDetail,'life-muted'));
      if(model.opening)section.append(specialistOpening(model.opening));
      section.append(offerRows(person,model.choices||[],'career',root.EarthAgency.actorId(site)));
      if(model.training&&!model.training.paused&&root.EarthAgency.actorId(site)===person.id&&sim.courseCalendar){
        const calendar=sim.courseCalendar(person.id),n=calendar.weeks;
        const term=field('section',null,'life-term');
        term.append(field('h4','Study calendar'),field('p','Every community advances together. Households use food, crews earn supplies and commitments come due.'));
        if(calendar.reason)term.append(field('p',calendar.reason,'life-muted'));
        const name=n?'Advance '+n+' '+(n===1?'week':'weeks')+' of study':'Advance to a study checkpoint';
        const termButton=control(name,()=>{
          if(term.isConnected)return submit(person,{...calendar,id:'term',label:name},'term',null);
        },'study-term');
        termButton.disabled=!calendar.available;term.append(termButton);section.append(term);
      }
      section.append(control('Review next week',reviewWeek,'week','text-button'));
      return section;
    }
    function abilitiesPage(person,model){
      const box=field('section',null,'life-section');
      box.append(field('h4','Abilities'),field('p','Current skill and personal learning range on a scale of 0–100.','life-muted'));
      const skills=field('dl',null,'life-skills');
      for(const axis of personas.axes){
        const b=person.bounds[axis];
        const row=field('div');row.append(field('dt',title(axis)),field('dd',(model.skills[axis]??person.aptitudes[axis])+' · range '+b.min+'–'+b.max));skills.append(row);
      }
      box.append(skills,field('h4','Temperament'));
      const traits=field('dl',null,'life-skills');
      for(const [key,value] of Object.entries(person.traits)){
        const row=field('div');row.append(field('dt',title(key)),field('dd',String(value)+' / 100'));traits.append(row);
      }
      box.append(traits);return box;
    }
    function weeksPage(site,person,model){
      const box=field('section',null,'life-section'),actor=root.EarthAgency.actorId(site);
      const intent=autonomy.view(site,sim.state,person.id);
      if(intent?.label){
        box.append(field('h4','Week '+sim.state.week+' · '+intent.label),field('p',intent.reason||''));
        if(intent.goal)box.append(field('p',intent.goal,'life-muted'));
      }
      const suggestions=autonomy.guidance(site,sim.state,person.id);
      const possibilities=(suggestions?.choices||[]).filter(choice=>actor!==person.id||choice.id==='hobbyPractice');
      if(possibilities.length){
        box.append(field('h4',actor===person.id?'Personal projects':'Discuss next week'));
        if(actor!==person.id)box.append(field('p','Meet '+person.name+' to offer advice or work together. They decide how it fits their priorities.','life-muted'));
        box.append(offerRows(person,possibilities,'autonomy',actor));
      }
      const decisions=autonomy.history(site,person.id).map(row=>({week:row.week,text:row.label,detail:row.reason}));
      const events=(model.history||[]).map(row=>({week:row.week,text:row.text||row.label,detail:row.detail}));
      const past=[...decisions,...events].filter(row=>row.text).sort((a,b)=>b.week-a.week).slice(0,12);
      box.append(field('h4','Recent weeks'));
      if(!past.length)box.append(field('p','The first weekly close will record a decision here.','life-muted'));
      else{
        const list=field('ol',null,'life-timeline');
        for(const row of past){const li=field('li');li.append(field('small','Week '+row.week),field('strong',row.text));if(row.detail)li.append(field('p',row.detail));list.append(li);}
        box.append(list);
      }
      return box;
    }
    function render(){
      const site=sim.active();if(!panel.open||!site||!street())return;
      resetSite(site);
      const stamp=[sim.state.week,sim.state.actionRevision||0,siteKey,personId,targetId,page].join('/');
      if(stamp===renderKey)return;
      const people=personas.list(site);
      const directory=people.map(p=>({id:p.id,label:p.name+' · '+(careers.role(site,p.id)||p.originRole)}));
      const newKey=JSON.stringify(directory);
      if(newKey!==personKey){selectOptions(personField,directory);personKey=newKey;}
      if(!people.some(p=>p.id===personId))choose(root.EarthAgency.actorId(site));
      const person=people.find(p=>p.id===personId);if(!person)return;
      personField.value=person.id;
      let model=careers.view(sim.state,site,person.id,targetId);
      const ranked=rankJobs(person,model.skills,careers.catalog);
      if(!careers.catalog.some(j=>j.id===targetId)){
        targetId=model.application?.targetId||model.training?.targetId||ranked[0]?.id||careers.catalog[0]?.id;
        model=careers.view(sim.state,site,person.id,targetId);
      }
      const action=doc.activeElement?.dataset.lifeControl;
      profileBox.replaceChildren(field('h3',person.name),field('p',[model.career,model.employer].filter(Boolean).join(' · '),'life-role'));
      if(page==='career'&&model.supplyLane?.description)profileBox.append(field('p',model.supplyLane.description,'life-muted'));
      profileBox.append(field('p',person.description),field('p','Strengths · '+person.strengths.map(title).join(', '),'life-muted'));
      if(person.interests?.length)profileBox.append(field('p','Interests · '+person.interests.join(', '),'life-muted'));
      const playable=root.EarthAgency.playables?.(site).some(p=>p.id===person.id)??(person.kind==='resident'||person.kind==='steward');
      if(playAs&&person.id!==root.EarthAgency.actorId(site)&&playable){
        const pick=control('Play as '+person.name,()=>{
          if(pick.isConnected&&personId===person.id)return playAs(person.id);
        },'play-character','text-button');
        profileBox.append(pick);
      }
      for(const btn of tabs.querySelectorAll('[data-life-page]'))btn.setAttribute('aria-pressed',String(page===btn.dataset.lifePage));
      const job=careers.catalog.find(j=>j.id===targetId);
      const selected=page==='abilities'?abilitiesPage(person,model):page==='weeks'?weeksPage(site,person,model):careerPage(site,person,model,job,ranked);
      content.replaceChildren(selected);
      renderKey=[sim.state.week,sim.state.actionRevision||0,siteKey,personId,targetId,page].join('/');
      if(action){
        const next=Array.from(content.querySelectorAll('[data-life-control]')).find(el=>el.dataset.lifeControl===action&&!el.disabled);
        (next||personField).focus({preventScroll:true});
      }
    }
    function readingCalendar(){
      if(!panel.open||!street()||page!=='career')return false;
      const site=sim.active(),course=site?.careers?.[personId]?.training;
      return !!course&&!course.paused&&personId===root.EarthAgency.actorId(site);
    }
    function refreshCalendar(){if(readingCalendar()){renderKey='';render();}}
    return {open,render,invalidate,readingCalendar,refreshCalendar};
  }
  root.EarthLifePanel=Object.freeze({mount});
})(typeof window==='undefined'?globalThis:window);
