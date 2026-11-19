/* A personal session uses the existing work calendar, skill ceilings, purses,
   housing register and social memory. Records follow identities across viewpoints. */
(function(root){
  'use strict';
  const tasks={
    housing:{name:'Build a home',axis:'craft',venue:'home',group:'Making',choices:['Set and check a level base','Brace the frame before loading it','Seal exposed joints before finishing']},
    design:{name:'Design a walking route',axis:'numeracy',venue:'market',group:'Design',choices:['Mark shelter and rest stops','Mark each change of direction','Mark access to the busiest destination']},
    sport:{name:'Pace a training circuit',axis:'stamina',venue:'bench',group:'Sport',choices:['Walk the turns and recover','Alternate easy and steady stretches','Hold an even pace for the circuit']},
    handover:{name:'Hand a shift to a colleague',axis:'organisation',venue:'market',group:'Professional',choices:['Name the person waiting and the deadline','Check the available tools and stock','Demonstrate the unfamiliar part of the job']},
    conversation:{name:'Make time for a conversation',axis:'communication',venue:'bench',group:'Social',choices:['Ask what they have time for','Invite them to tell the whole story','Reflect a concern and check you understood']},
    invitation:{name:'Invite someone to spend time together',axis:'care',venue:'bench',group:'Social',choices:['Offer a short walk','Suggest an activity you both enjoy','Leave the invitation open for another day']}
  };
  const routes={solo:'Do it independently',together:'Work alongside someone',commission:'Commission an experienced resident'};
  const predictions=['Needs another attempt','Works with some adjustment','Works on the first attempt'];
  const number=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
  const profile=(site,id)=>root.EarthPersonas?.profile(site,id);
  const actor=site=>root.EarthAgency.actorId(site);
  const eligible=(site,id)=>root.EarthCommunityLife?.residency?.(site,id)!=='away'&&root.EarthCommunityLife?.residency?.(site,id)!=='visitor';
  const ability=(site,p,axis)=>site.careers?.[p.id]?.skills?.[axis]??p.aptitudes?.[axis]??40;
  const relational=(site,a,b,week)=>root.EarthRelationships?.strength(site.autonomy?.people?.[a.id],b,week)||0;
  const key=p=>p.identityKey||p.id;
  const no=reason=>({ok:false,reason,message:reason});
  const live=(site,id)=>site.practice?.open?.find(row=>row.actor===id);
  const booked=(site,id)=>site.practice?.open?.some(row=>row.actor===id||row.peer===id);
  // The offer can inspect its own reservation while every competing action
  // sees the same participants as busy for the week.
  const evaluating=new WeakMap();
  function reserved(site,id,week){
    return !!site.practice?.open.some(r=>r!==evaluating.get(site)&&r.week===week&&(r.peer===id||r.route!=='commission'&&r.actor===id));
  }
  function during(site,row,fn){
    const previous=evaluating.get(site);
    if(row)evaluating.set(site,row);
    try{return fn();}finally{if(previous)evaluating.set(site,previous);else evaluating.delete(site);}
  }
  const latest=(site,person)=>site.practice?.events?.filter(e=>e.actorKey===key(person)||e.peerKey===key(person))||[];
  function history(world,person){
    const places=[...world.sites,...world.communityLife?.outposts||[]];
    return places.flatMap(s=>latest(s,person)).sort((a,b)=>b.week-a.week).slice(0,40);
  }
  function confidence(site,person,subject){
    const own=latest(site,person).filter(e=>e.actorKey===key(person)&&e.subject===subject&&e.route!=='commission');
    const change=own.reduce((n,e)=>n+(e.outcome===0?-4:e.route==='together'?2:e.outcome===1?4:7),0);
    return {value:Math.max(10,Math.min(95,50+change)),attempts:own.length};
  }
  const waymarked=(site,cell)=>!!site.practice?.wayfinding?.[cell];
  function designPlan(world,site){
    const region=root.EarthRegionalWorld,geo=region?.geography(world,site);
    const town=geo?.towns.find(t=>t.site.id===site.id);if(!town)return null;
    const roads=region.routes(world,site).filter(r=>r.siteId===site.id&&!r.closed);
    const size=geo.cellSize,idx=v=>Math.round(v/size);
    const permitted=p=>region.known(world,site,site.id,p.x,p.y)&&region.terrain(geo,p.x,p.y).kind!=='water'&&!waymarked(site,idx(p.x)+','+idx(p.y));
    const path=roads.flatMap(r=>r.points).filter(permitted);
    const points=path.length?path:Array.from({length:9},(_,i)=>({x:(idx(town.x)+i%3-1)*size,y:(idx(town.y)+Math.floor(i/3)-1)*size})).filter(permitted);
    if(!points.length||Object.keys(site.practice?.wayfinding||{}).length>=1024)return null;
    const point=points.at(-1),terrain=region.terrain(geo,point.x,point.y);
    return {cell:idx(point.x)+','+idx(point.y),place:terrain.label,lat:geo.locate(point.x,point.y).lat,lon:geo.locate(point.x,point.y).lon,
      busy:path.length>2,rest:site.wellbeing<55};
  }
  function conditions(world,site,person,peer,subject,route,home){
    const task=tasks[subject],strength=ability(site,person,task.axis),note=subject==='design'?designPlan(world,site):null,prior=latest(site,person).filter(e=>e.subject===subject)[0];
    const peerGoal=peer&&root.EarthAutonomy?.intent(site,peer.id);
    const deadline=peer&&(site.residents.some(r=>r.promise?.by===peer.id&&r.promise.dueWeek<=world.week+1)||peerGoal?.kind==='commitment');
    const tie=peer?relational(site,peer,person,world.week):0;
    const sameInterest=peer&&peer.hobbyAxis===person.hobbyAxis;
    const tired=site.wellbeing<45||strength<50;
    let best,brief,success,miss;
    if(subject==='housing'){
      best=(home?.stage||1)-1;
      brief=home?.title||'Inspect the serviced plots and available materials.';
      success=['The base sits level on its supports.','The diagonal stays square when the frame takes weight.','The sealed finish keeps the living space dry.'][best];
      miss=['The footing rocks when checked across the corners.','The frame shifts as soon as the load moves.','An exposed joint still lets water through.'][best];
    }else if(subject==='design'){
      best=note?.rest?0:note?.busy?2:1;
      brief=note?'The exchange has survey notes for '+note.place.toLowerCase()+' at '+note.lat.toFixed(3)+'°, '+note.lon.toFixed(3)+'°. '+(best===0?'Walkers report fatigue on this stretch.':best===1?'The turnings here have no directions.':'Crews already use this access route.'):'The exchange needs another dry-land survey before a route can be annotated.';
      success='The exchange filed your directions for this part of the route. Crews planning passage here can use them.';miss='Your draft leaves the reported difficulty unresolved.';
    }else if(subject==='sport'){
      best=tired?0:strength<70?1:2;
      brief='Current stamina '+strength+' · Community wellbeing '+site.wellbeing+'. '+(tired?'Your breathing is already uneven on the first turn.':strength<70?'The straight is comfortable. You slow at the turns.':'The first lap is comfortable at a steady pace.');
      success='You completed the circuit at a repeatable pace.';miss='Your pace and breathing fell out of step before the final turn.';
    }else if(subject==='handover'){
      best=deadline?0:site.materials<Math.ceil(site.population/2)||site.food<site.population?1:2;
      brief=deadline?'Someone is waiting for a promised handover.':best===1?'The next shift will start with a short inventory.':'The stock count is adequate. The incoming worker has not carried out this part of the assignment.';
      success=['The next worker knows who needs the delivery and when.','The next worker can make a plan from the actual inventory.','The next worker repeated the operation independently.'][best];miss='The incoming worker still had a question before taking over.';
    }else if(subject==='conversation'){
      best=deadline||peer?.traits.sociability<42?0:tie>1||peer?.traits.sociability>65?1:2;
      brief=(peer?.name||'Your partner')+(deadline?' keeps glancing toward the next shift.':best===0?' pauses for a moment and then looks back toward work.':best===1?' settles in and starts to expand on an earlier point.':' describes one concern and waits to hear what you understood.');
      success='They stayed with the conversation and confirmed you understood them.';miss='They paused to correct the direction the conversation had taken.';
    }else{
      const lastInvite=latest(site,person).find(e=>e.subject==='invitation'&&e.route==='solo'&&e.actorKey===key(person)&&e.peerKey===key(peer));
      const declined=lastInvite?.outcome===0&&world.week<lastInvite.week+3;
      best=deadline||tie<0||declined?2:sameInterest&&tie>0?1:0;
      brief=peer.name+(best===2?' says they would like some space this week.':best===1?' asks whether you still take part in your shared interest.':' says they have time for a short walk.');
      success=best===2?'You gave them space. They kept their plans for the day.':'They accepted the invitation on the terms you offered.';
      miss='They declined and went on with their own plans.';
    }
    return {best,brief,success,miss,prior,note};
  }
  function offer(world,site,subject,route,peerId,existing=null){
    if(!site)return no('Choose a community for the activity.');
    return during(site,existing,()=>evaluate(world,site,subject,route,peerId,existing));
  }
  function evaluate(world,site,subject,route,peerId,existing){
    if(!Object.hasOwn(tasks,subject)||!Object.hasOwn(routes,route)||!site)return no('Choose an activity and how to approach it.');
    const task=tasks[subject],id=existing?.actor||actor(site),person=profile(site,id),peer=peerId&&profile(site,peerId);
    if(!person||!eligible(site,id))return no('This resident must be home to organise a session.');
    const needsPeer=['conversation','invitation','handover'].includes(subject)||route!=='solo';
    if(needsPeer&&(!peer||peer.id===id||!eligible(site,peer.id)))return no('Choose another resident who is here.');
    const skill=ability(site,person,task.axis),other=peer?ability(site,peer,task.axis):0;
    const fee=route==='commission'?3:route==='together'?1:0;
    const home=subject==='housing'?root.EarthResidentShops.constructionOffer(world,site,person,route==='solo'?person:peer):null;
    const tutor=route==='together',performer=route==='commission'?peer:person;
    let why='';
    const calendar=root.EarthPurses;
    if(!existing&&[id,needsPeer&&peer?.id].some(who=>who&&booked(site,who)))why='A participant already has a session arranged.';
    if(!why)why=calendar.workConflict(site,performer.id,world.week);
    if(!why&&needsPeer&&peer.id!==performer.id)why=calendar.workConflict(site,peer.id,world.week);
    if(!why&&route==='commission')why=other<Math.max(45,skill)?'Choose someone with the demonstrated ability to deliver this work.':'';
    if(!why&&tutor){
      const lesson=root.EarthCareers.projectLesson(world,site,peer.id,id,task.axis);
      if(!lesson.ok)why=lesson.reason;
    }
    if(!why&&!tutor){
      const practice=root.EarthCareers.hobbyPractice(world,site,performer.id,task.axis);
      if(!practice.ok)why=practice.reason;
    }
    if(!why&&needsPeer&&relational(site,peer,person,world.week)<-2&&route!=='solo')why=peer.name+' is unwilling to take this booking after your previous dealings.';
    if(!why&&subject==='housing'&&!home?.available)why=home?.reason||'This household already has a finished home or the market lacks suitable supplies.';
    const cash=site.purses?.people?.[id]?.balance||0;
    if(!why&&fee&&(cash<fee+(home?.price||0)||!calendar.canTransfer(site,id,peer.id,fee)))why='The session needs '+(fee+(home?.price||0))+' personal funds for labour and supplies.';
    if(!why&&existing&&home&&(home.plot!==existing.plot||home.stage!==existing.stage||home.input!==existing.input||home.price!==existing.materialCost))why='The plot, material price or building stage changed. Release the booking and review the available work.';
    if(!why&&subject==='invitation'&&route==='commission')why='An invitation is personal. You can practise with a partner or make your own invitation.';
    const field=conditions(world,site,person,peer,subject,route,home);
    if(!why&&subject==='design'&&!field.note)why=field.brief;
    return {ok:!why,reason:why,person,peer,task,subject,route,fee,home,skill,other,needsPeer,field,confidence:confidence(site,person,subject)};
  }
  function participants(world,site,subject,route){
    const id=actor(site);
    return root.EarthPersonas.list(site).filter(p=>p.id!==id&&eligible(site,p.id)).map(p=>{
      const q=offer(world,site,subject,route,p.id);
      return {id:p.id,name:p.name,skill:ability(site,p,tasks[subject].axis),available:q.ok,reason:q.reason};
    }).sort((a,b)=>Number(b.available)-Number(a.available)||b.skill-a.skill||a.name.localeCompare(b.name));
  }
  const closeEnough=(proof,id,site)=>proof&&proof.actor===id&&proof.siteId===site.id&&proof.mode==='walk'&&
    [proof.x,proof.y,proof.tx,proof.ty].every(Number.isFinite)&&Math.hypot(proof.x-proof.tx,proof.y-proof.ty)<=1.7;
  function target(site,contract){
    if(contract.subject==='housing')return {type:'plot',plot:contract.plot};
    if(contract.peer)return {type:'person',id:contract.peer};
    const venue=tasks[contract.subject].venue;
    return venue==='market'?{type:'market'}:{type:'venue',venue,personId:contract.actor};
  }
  function validMeeting(site,row,proof){
    if(!closeEnough(proof,row.actor,site))return false;
    const at=target(site,row);
    if(at.type==='plot')return proof.homePlot===at.plot&&(!row.peer||proof.partnerAtPlot===row.peer);
    if(at.type==='person')return proof.target===at.id;
    if(at.type==='venue')return proof.venue===at.venue&&proof.personId===row.actor;
    return proof.target==='market';
  }
  function summary(text){return String(text||'').slice(0,360);}
  function addRecord(site,world,row,q,choice,outcome,gain,words){
    const b=site.practice,peer=q.peer,doer=q.route==='commission'?peer:q.person;
    const reply=row.subject==='invitation'?(outcome===0?'I declined the invitation and kept my existing plans.':q.field.best===2?'They gave me the space I asked for.':'I agreed to spend time together on the terms we discussed.'):
      row.subject==='conversation'?(outcome===0?'I had to correct what they understood.':'I felt heard and confirmed what I meant.'):'We completed the activity together.';
    const participant=peer&&(row.route==='commission'?'I supplied the work and received '+row.fee+' funds.':row.route==='together'?'I gave feedback and received '+row.fee+' fund.':reply);
    b.events.unshift({subject:row.subject,route:row.route,week:world.week,actorKey:row.actorKey,actorName:q.person.name,
      peerKey:row.peerKey,peerName:peer?.name||'',prediction:row.prediction,choice,first:row.first??choice,outcome,gain,
      fee:row.fee,intention:row.intention||'',brief:summary(q.field.brief),result:summary(words),otherView:summary(participant),place:site.name,
      by:doer.name});
    b.events.length=Math.min(b.events.length,40);
  }
  function release(site,row){site.practice.open=site.practice.open.filter(r=>r!==row);site.practice.serial++;}
  function settle(world,site,row,choice,automatic=false){
    return during(site,row,()=>finishWork(world,site,row,choice,automatic));
  }
  function finishWork(world,site,row,choice,automatic){
    const q=offer(world,site,row.subject,row.route,row.peer,row);
    if(!q.ok)return no(q.reason);
    if(key(q.person)!==row.actorKey||q.peer&&key(q.peer)!==row.peerKey)return no('The participants have moved. Arrange a new session.');
    const selected=automatic?q.field.best:choice;
    const succeeded=selected===q.field.best;
    if(!automatic&&!succeeded&&row.first==null&&row.subject!=='invitation'){
      row.first=selected;row.feedback=q.field.miss;site.practice.serial++;
      return {ok:true,message:q.field.miss+' You have time to adjust.'};
    }
    const outcome=succeeded?(row.first==null?2:1):0;
    // The housing register pays the material supplier, registers the deed, and
    // changes housing capacity only when the final stage has really opened.
    if(succeeded&&q.home){
      const built=root.EarthResidentShops.buildWith(world,site,q.person,q.home,row.route==='solo'?q.person:q.peer);
      if(!built.ok)return built;
    }
    if(succeeded&&q.field.note){
      const n=q.field.note,marks=site.practice.wayfinding||={};
      marks[n.cell]={by:key(row.route==='commission'?q.peer:q.person),week:world.week,choice:selected};
    }
    if(row.fee)root.EarthPurses.transferPerson(world,site,row.actor,row.peer,row.fee,
      q.person.name+' paid '+q.peer.name+' '+row.fee+' for '+q.task.name.toLowerCase()+'.');
    const lesson=row.route==='together'?root.EarthCareers.projectLesson(world,site,row.peer,row.actor,q.task.axis,true,succeeded?2:1):
      root.EarthCareers.hobbyPractice(world,site,row.route==='commission'?row.peer:row.actor,q.task.axis,true);
    if(q.peer&&succeeded&&row.route!=='together'&&(row.subject!=='invitation'||q.field.best!==2))root.EarthAutonomy.remember(site,world.week,row.actor,row.peer,row.subject==='invitation'?'visit':'project');
    const gain=row.route==='commission'?0:lesson.gain||0;
    const result=row.subject==='invitation'&&row.route==='together'?(succeeded?'The coach agreed that your rehearsal respected the other person’s stated preference.':'The coach asked you to reconsider the other person’s preference.'):(succeeded?q.field.success:q.field.miss);
    const words=result+(succeeded&&q.home?' '+q.home.title+' completed on plot '+(q.home.plot+1)+'.':'');
    addRecord(site,world,row,q,selected,outcome,gain,words);release(site,row);
    return {ok:true,message:words+(gain?' '+q.person.name+' gained '+gain+' '+q.task.axis+'.':'')};
  }
  function run(world,site,request,proof){
    if(!site||!request||request.siteId!==site.id||request.generation!==(site.foundingRevision||0)||request.actor!==actor(site)||request.week!==world.week||
      request.serial!==(site.practice?.serial||0))return no('The person, session or week changed. Review the current booking.');
    const id=actor(site),row=live(site,id);
    if(!proof||proof.actor!==id||proof.siteId!==site.id)return no('Return to your own street to continue.');
    if(request.action==='release'&&row){release(site,row);return {ok:true,message:'The session was released. The participants can make other plans.'};}
    if(request.action==='book'){
      if(row||!number(request.prediction,0,2))return no('Choose an expectation for this attempt.');
      const q=offer(world,site,request.subject,request.route,request.peer);
      if(!q.ok)return no(q.reason);
      if(q.needsPeer&&(!closeEnough(proof,id,site)||proof.target!==q.peer.id))return no('Meet the other resident before agreeing to a session.');
      const b=site.practice||={serial:0,open:[],events:[]};
      const booking={subject:q.subject,route:q.route,actor:id,actorKey:key(q.person),peer:q.needsPeer?q.peer.id:'',peerKey:q.needsPeer?key(q.peer):'',
        week:world.week,prediction:request.prediction,fee:q.fee,intention:typeof request.intention==='string'?request.intention.trim().slice(0,140):'',...(q.home?{plot:q.home.plot,stage:q.home.stage,materialCost:q.home.price,input:q.home.input}:{})};
      b.open.push(booking);b.serial++;
      return {ok:true,message:q.route==='commission'?q.peer.name+' accepted the commission. The work falls due at the weekly close.':'The session is booked. Go to the work location to make your attempt.'};
    }
    if(!row||request.action!=='attempt'||!number(request.choice,0,2))return no('Choose an action for the current session.');
    if(row.route==='commission')return no('The professional has accepted the work. Check back at the weekly close.');
    if(!validMeeting(site,row,proof))return no('Reach the agreed location before making this attempt.');
    return settle(world,site,row,request.choice);
  }
  function closeWeek(world,site){
    const events=[];
    for(const row of [...site.practice?.open||[]]){
      if(row.route==='commission'){
        const result=settle(world,site,row,0,true);
        if(result.ok){events.push(result.message);continue;}
        events.push('The commission could not finish. '+result.message);
      }else events.push('The booked '+tasks[row.subject].name.toLowerCase()+' session ended before the participants finished.');
      release(site,row);
    }
    return events;
  }
  function duty(site,id,week){
    const row=site.practice?.open.find(r=>r.peer===id&&r.week===week);
    if(!row)return null;
    const d=tasks[row.subject],title=routes[row.route]+' · '+d.name;
    return {week,kind:'project',title,goal:title,activity:row.subject==='housing'?'buildHome':'practice',
      agreedDuty:true,practiceSession:true,venue:d.venue,homePlot:row.plot,homeStage:row.stage,axis:d.axis,target:row.actor};
  }
  function valid(site,week){
    const b=site.practice;if(b===undefined)return true;
    if(!b||!number(b.serial,0,Number.MAX_SAFE_INTEGER)||!Array.isArray(b.open)||b.open.length>30||!Array.isArray(b.events)||b.events.length>40)return false;
    const word=(v,max)=>typeof v==='string'&&v.length<=max;
    const common=r=>r&&Object.hasOwn(tasks,r.subject)&&Object.hasOwn(routes,r.route)&&number(r.prediction,0,2)&&number(r.week,1,week)&&
      (r.intention==null||word(r.intention,140))&&word(r.actorKey,1040)&&word(r.peerKey,1040)&&number(r.fee,0,3);
    if(b.wayfinding!==undefined){
      const marks=b.wayfinding;
      if(!marks||typeof marks!=='object'||Array.isArray(marks)||Object.keys(marks).length>1024||
        !Object.entries(marks).every(([cell,n])=>/^-?\d{1,4},-?\d{1,4}$/.test(cell)&&n&&word(n.by,1040)&&number(n.week,1,week)&&number(n.choice,0,2)))return false;
    }
    const busy=new Set();
    for(const r of b.open){
      if(!common(r)||!word(r.actor,512)||!r.actor||!word(r.peer,512)||r.first!=null&&!number(r.first,0,2)||r.feedback!=null&&!word(r.feedback,360)||
        r.subject==='housing'&&(!number(r.plot,0,5)||!number(r.stage,1,3)||!word(r.input,32)||!number(r.materialCost,1,6)))return false;
      for(const id of [r.actor,r.peer].filter(Boolean)){if(busy.has(id))return false;busy.add(id);}
    }
    return b.events.every(e=>common(e)&&number(e.first,0,2)&&number(e.choice,0,2)&&number(e.outcome,0,2)&&number(e.gain,0,4)&&
      ['actorName','peerName','brief','result','otherView','place','by'].every(k=>word(e[k],360)));
  }
  root.EarthPractice={tasks,routes,predictions,participants,offer,target,run,live,duty,booked,reserved,closeWeek,valid,latest,history,waymarked};
})(globalThis);
