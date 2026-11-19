(function(root){
  'use strict';
  function mount(host,{sim,street,redraw,notify}){
    if(!host||!root.EarthPractice)return null;
    const model=root.EarthPractice,doc=host.ownerDocument;
    let subject='sport',route='solo',peer='',prediction=1,reviewer='',intention='',message='',priorIdentity='',epoch=0,working=false;
    function el(tag,text){const n=doc.createElement(tag);if(text!=null)n.textContent=text;return n;}
    function choice(title,options,value,change){
      const label=el('label',title),field=el('select');field.setAttribute('aria-label',title);
      for(const [id,title] of options){const o=el('option',title);o.value=id;field.append(o);}
      field.value=value;field.addEventListener('change',()=>{change(field.value);render();host.querySelector('[aria-label="'+title+'"]')?.focus({preventScroll:true});});
      label.append(field);host.append(label);
    }
    function button(title,fn,disabled=false){const b=el('button',title);b.type='button';b.disabled=disabled;b.addEventListener('click',fn);host.append(b);return b;}
    function line(text){if(text)host.append(el('p',text));}
    function run(action,data,where){
      const local=street(),site=sim.active(),world=sim.state,scene=local?.getState();
      if(!local||scene.mode!=='walk'||working||!site){notify('Return to your character on foot to continue.',true);return;}
      const myEpoch=++epoch,id=root.EarthAgency.actorId(site);
      const request={siteId:site.id,generation:site.foundingRevision||0,serial:site.practice?.serial||0,week:world.week,actor:id,action,...data};
      const current=()=>epoch===myEpoch&&!host.hidden&&!doc.hidden&&local===street()&&site.id===sim.active()?.id&&
        request.week===sim.state.week&&request.actor===root.EarthAgency.actorId(sim.active());
      const ref=where?.type==='person'?(site.residents.some(r=>r.id===where.id)?{type:'resident',residentId:where.id}:{type:'npc',npcId:where.id}):{type:'market'};
      function proof(){
        if(!current())return null;
        if(!where)return local.getState();
        if(where.type==='venue')return local.venueProof(where.venue,where.personId);
        if(where.type!=='plot')return local.meeting(ref,true);
        const plot=local.privateHomeProof(where.plot),row=model.live(site,id);
        if(plot&&row?.peer){
          const peer=local.actorScene(row.peer)?.targetPose;
          if(peer?.mode==='walk'&&Math.hypot(peer.x-plot.tx,peer.y-plot.ty)<1.75)plot.partnerAtPlot=row.peer;
        }
        if(plot&&row?.peer&&!plot.partnerAtPlot)message='Waiting for '+(root.EarthPersonas.profile(site,row.peer)?.name||'the other participant')+' at the building plot.';
        return plot;
      }
      async function finish(){
        if(!current())return;
        working=true;
        try{
          const result=await sim.perform('practiceSession',request,proof);
          if(!current())return;
          if(!result.ok&&where?.type==='plot'&&model.live(site,id)?.peer&&local.privateHomeProof(where.plot))message='The other participant must reach the building plot. Try the attempt when you see them arrive.';
          else message=result.message;
          if(result.ok)redraw();
        }finally{working=false;if(current())render();}
      }
      if(!where||proof()){finish();return;}
      const routed=where.type==='plot'?local.focusPrivateHome(where.plot,finish):where.type==='venue'?local.focusVenue(where.venue,where.personId,finish):local.focusStop(ref,finish);
      message=routed?(where.type==='plot'?'Walking to the building plot.':where.type==='person'?'Walking to meet '+(root.EarthPersonas.profile(site,where.id)?.name||'the participant')+'.':where.type==='venue'?'Walking to the '+where.venue+'.':'Walking to the exchange.'):'This location is currently unreachable.';
      render();
    }
    function journal(world,site,person){
      const rows=model.history(world,person);if(!rows.length)return;
      const wrap=el('details'),header=el('summary','Decision history · '+rows.length);
      const wasOpen=host.dataset.journalOpen==='true';wrap.open=wasOpen;
      wrap.addEventListener('toggle',()=>{if(wrap.isConnected)host.dataset.journalOpen=String(wrap.open);});
      wrap.append(header);
      const relevant=rows.slice(0,8);
      const people=new Map(relevant.flatMap(row=>[[row.actorKey,row.actorName],...(row.peerKey?[[row.peerKey,row.peerName]]:[])]));
      if(!people.has(reviewer))reviewer=person.identityKey||person.id;
      const label=el('label','Read from'),field=el('select');field.setAttribute('aria-label','Read from');
      for(const [id,name] of people){const o=el('option',name);o.value=id;field.append(o);}field.value=reviewer;
      field.onchange=()=>{reviewer=field.value;host.dataset.journalOpen='true';render();host.querySelector('[aria-label="Read from"]')?.focus({preventScroll:true});};
      label.append(field);wrap.append(label);
      for(const row of relevant.filter(r=>r.actorKey===reviewer||r.peerKey===reviewer)){
        const item=el('article');item.append(el('h4','Week '+row.week+' · '+model.tasks[row.subject].name),el('small',row.place+' · '+row.by));
        if(row.actorKey===reviewer){
          if(row.intention)item.append(el('p','Intention · '+row.intention));
          item.append(el('p','Expected · '+model.predictions[row.prediction]),el('p','First action · '+model.tasks[row.subject].choices[row.first]));
          if(row.choice!==row.first)item.append(el('p','Adjustment · '+model.tasks[row.subject].choices[row.choice]));
          item.append(el('p',row.result),el('small','Skill gained '+row.gain+' · Paid '+row.fee+' funds'));
        }else item.append(el('p',row.otherView),el('small','Worked with '+row.actorName));
        wrap.append(item);
      }
      host.append(wrap);
    }
    function render(){
      if(host.hidden)return;
      const site=sim.active(),w=sim.state;if(!site)return;
      const id=root.EarthAgency.actorId(site),person=root.EarthPersonas.profile(site,id);
      if(!person)return;
      const identity=site.id+'/'+(person.identityKey||id);
      if(identity!==priorIdentity){priorIdentity=identity;message='';intention='';reviewer='';peer='';}
      host.replaceChildren();
      const row=model.live(site,id);
      if(row){
        const q=model.offer(w,site,row.subject,row.route,row.peer,row);
        host.append(el('h4',model.tasks[row.subject].name),el('p',model.routes[row.route]+(q.peer?' · '+q.peer.name:'')));
        line(row.intention);line(q.field?.brief);line(q.reason);line(row.feedback);
        if(row.route==='commission')line('The resident will settle this booking at the close of week '+row.week+'. Payment and any materials are due upon delivery.');
        else if(q.ok){
          for(const [i,c] of model.tasks[row.subject].choices.entries())button(c,()=>run('attempt',{choice:i},model.target(site,row)),working);
        }
        button('Release this booking',()=>run('release',{},null),working);
      }else{
        choice('Activity',Object.entries(model.tasks).map(([id,d])=>[id,d.name]),subject,v=>{subject=v;message='';});
        choice('How to do it',Object.entries(model.routes),route,v=>{route=v;message='';});
        const needsPeer=route!=='solo'||['invitation','conversation','handover'].includes(subject);
        if(needsPeer){
          const list=model.participants(w,site,subject,route);
          if(!list.some(p=>p.id===peer))peer=list[0]?.id||'';
          choice(route==='together'?'Practise with':route==='commission'?'Work provider':subject==='handover'?'Hand over to':'Invite',list.map(p=>[p.id,p.name+' · '+model.tasks[subject].axis+' '+p.skill]),peer,v=>{peer=v;message='';});
        }else peer='';
        const q=model.offer(w,site,subject,route,peer);
        line(q.field?.brief);
        const history=model.latest(site,person).find(e=>e.subject===subject&&e.actorKey===(person.identityKey||person.id));
        if(history){line('Your previous attempt · '+history.result);if(q.confidence)line('Confidence · '+q.confidence.value+' / 100 across '+q.confidence.attempts+' recorded attempts.');}
        if(q.task){
          line('Your '+q.task.axis+' · '+q.skill+(q.fee?' · '+q.fee+' personal funds for '+q.peer.name:' · No labour fee')+(q.home?' · '+q.home.price+' for the material':''));
          if(route==='commission')line('The professional supplies the work and uses their own practice time.');
          if(subject==='invitation'&&route==='together')line('This is a rehearsal with a coach. A personal invitation is a separate decision for the people involved.');
          if(route==='together')line('Both people use a practice session. The learner can make an attempt and revise it with feedback.');
        }
        const reason=q.reason;
        choice('What do you expect?',model.predictions.map((p,i)=>[String(i),p]),String(prediction),v=>{prediction=Number(v);});
        const label=el('label','What do you want to achieve?'),field=el('input');field.type='text';field.maxLength=140;field.value=intention;field.placeholder='Optional';field.oninput=()=>{intention=field.value;};label.append(field);host.append(label);
        line(reason);
        button(needsPeer?'Meet and agree terms':'Begin this session',()=>run('book',{subject,route,peer,prediction,intention},needsPeer?{type:'person',id:peer}:null),!q.ok||working);
      }
      if(message){const status=el('p',message);status.setAttribute('role','status');host.append(status);}
      journal(w,site,person);
    }
    return {render,close(){epoch++;working=false;},invalidate(){epoch++;working=false;priorIdentity='';}};
  }
  root.EarthPracticeUI={mount};
})(globalThis);
