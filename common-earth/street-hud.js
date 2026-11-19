/* On-scene controls. Only the opened pane reads detailed models. Passing
   neighbours can change the range indicator, never the selected interlocutor. */
(function(root){
  'use strict';
  function mount(host,{sim,getStreet,stageVersion,meet,venue,after,advance,readForecast,followGoal,personalWork,profile,playAs,changed}){
    if(!host)return null;
    const doc=host.ownerDocument,$=id=>doc.getElementById(id);
    const card=$('scene-card');if(!card)return null;
    const scroll=card.querySelector('.scene-scroll')||card,toolbox=new Map(),panes=[...card.querySelectorAll('[data-scene-pane]')];
    const openers=[...host.querySelectorAll('[data-scene-open]')],talkField=$('scene-talk-person'),goalField=$('scene-goal-person');
    let pane=null,talkId=null,goalId='',identity='',revision=0,lastDraw='',listKey='',lastContact='',reply='',busy=false,opener=null;
    let goal=null,overview=null,stripKey='',civicKey='',civic=null,rangeTimer=0,noticeTimer=0,watching=null,speech=null,placementKey='';
    const talkTopics=new Set(),contactButtons=new Map(),transcript=[];
    let pickPeople=[],lastPrompt='',spokenContact=null,spokenStore=false,invitation=null,nearSignature='',invitationWeek='';
    const invitationsSeen=new Set(),invitedBySite=new WeakMap();
    const present=(site,id)=>root.EarthCommunityLife?.present?.(site,id)!==false;
    const visitor=(site,id)=>root.EarthCommunityLife?.residency?.(site,id)==='visitor';
    const street=()=>getStreet(),actorId=()=>root.EarthAgency.actorId(sim.active());
    const name=id=>root.EarthAgency.identity(sim.active(),id)?.name||root.EarthPersonas?.profile(sim.active(),id)?.name||'Neighbour';
    const personLabel=(site,id,realName)=>root.EarthCommunityLife?.personLabel?.(site,id,realName)||realName;
    function text(node,value){const s=String(value??'');if(node&&node.textContent!==s)node.textContent=s;}
    function show(node,on){if(node&&node.hidden===on)node.hidden=!on;}
    function make(tag,value,css){
      const el=doc.createElement(tag);if(value!=null)el.textContent=value;if(css)el.className=css;return el;
    }
    function press(label,fn,disabled=false,key=''){
      const b=make('button',label);b.type='button';b.disabled=disabled;if(key)b.dataset.streetCommand=key;
      const scope=revision;
      b.addEventListener('click',()=>{if(scope===revision&&b.isConnected&&!b.disabled)return fn();});return b;
    }
    function option(id,label){const o=make('option',label);o.value=id;return o;}
    function info(h,detail){const box=make('div',null,'scene-action');box.append(make('h4',h));if(detail)box.append(make('p',detail));return box;}
    function clearSpeech(){
      speech=null;show($('scene-speech'),false);
    }
    function speakerWords(message,id){
      const prefix=name(id)+' · ',spoken=String(message||'');
      if(!spoken.startsWith(prefix))return '';
      const full=spoken.substring(prefix.length).replace(/^[“"]|[”"]$/g,'').trim();
      const sentence=full.match(/^.+?[.!?](?:\s|$)/u)?.[0].trim()||full;
      if(sentence.length<=88)return sentence;
      return sentence.slice(0,87).replace(/\s+\S*$/u,'').trimEnd()+'…';
    }
    function faceToFaceLayout(meeting){
      const local=street();
      if(pane!=='talk'||!local?.personAnchor||!meeting){
        clearSpeech();delete host.dataset.talkDock;placementKey='';return;
      }
      const stage=host.getBoundingClientRect();if(!stage.width||!stage.height)return;
      const head=local.personAnchor(talkId),self=local.personAnchor(actorId());
      if(!head?.visible||!self?.visible){clearSpeech();delete host.dataset.talkDock;placementKey='';return;}
      const width=stage.width,height=stage.height,margin=20,left=Math.min(head.x,self.x)-margin,right=width-Math.max(head.x,self.x)-margin;
      const side=Math.max(left,right),enoughWidth=side>=Math.min(265,Math.max(208,width*.36));
      const below=height-Math.max(head.y,self.y)-Math.min(36,height*.09)-12;
      const above=Math.min(head.y,self.y)-70;
      let dock=right>=left?'right':'left',size=Math.min(315,Math.max(148,side-10));
      // Give the map its width during conversation. On a short landscape
      // display the shelf moves aside only if it would cover the two speakers.
      if(below>=Math.min(160,height*.34)||!enoughWidth&&Math.max(above,below)>=88){
        dock=below>=above?'bottom':'top';size=Math.max(88,Math.min(dock==='bottom'?below:above,height*.48,285));
      }
      const key=dock+'/'+Math.round(size/4)*4;
      if(key!==placementKey){
        placementKey=key;host.dataset.talkDock=dock;host.style?.setProperty('--talk-size',Math.round(size/4)*4+'px');
      }
      const bubble=$('scene-speech');if(!speech||!bubble)return;
      if(speech.id!==talkId||(root.performance?.now?.()??Date.now())>=speech.until){clearSpeech();return;}
      show(bubble,true);
      const bw=bubble.offsetWidth||170,bh=bubble.offsetHeight||34;
      const min=dock==='left'?size+15:8,max=dock==='right'?width-size-15:width-8;
      const middle=Math.min(max-bw/2,Math.max(min+bw/2,head.x));
      let x=Math.max(6,Math.min(width-bw-6,middle-bw/2)),y=Math.max(3,Math.min(height-bh-8,head.y-bh-9));
      let direction='down',tip=Math.max(8,Math.min(bw-8,head.x-x));
      if(head.y<bh+10){
        const toRight=max-Math.max(head.x,self.x)>Math.min(head.x,self.x)-min;
        direction=toRight?'left':'right';
        x=Math.max(5,Math.min(width-bw-5,toRight?Math.max(head.x,self.x)+14:Math.min(head.x,self.x)-bw-14));
        y=Math.max(4,Math.min(height-bh-5,head.y-bh/2));tip=Math.max(6,Math.min(bh-6,head.y-y));
      }
      const position=[direction,Math.round(x),Math.round(y),Math.round(tip)].join('/');
      if(speech.position!==position){
        speech.position=position;bubble.dataset.tip=direction;
        if(bubble.style){bubble.style.transform='translate('+Math.round(x)+'px,'+Math.round(y)+'px)';bubble.style.setProperty('--speech-tip',Math.round(tip)+'px');}
      }
    }
    function beginSpeech(id,message){
      const excerpt=speakerWords(message,id);if(!$('scene-speech')||!$('scene-speech-words')||!excerpt||id!==talkId||!contact()||!street()?.personAnchor)return;
      const local=street();
      if(!local.personAnchor(id)?.visible||!local.personAnchor(actorId())?.visible)local.recenter?.();
      text($('scene-speech-words'),excerpt);speech={id,until:(root.performance?.now?.()??Date.now())+9000,position:''};tick();
    }
    function transcriptView(){
      const list=$('scene-transcript-lines'),details=$('scene-transcript');
      if(!list||!details)return;
      list.replaceChildren(...transcript.map(turn=>{
        const entry=make('li');if(turn.prompt)entry.append(make('strong',turn.prompt));
        entry.append(make('p',turn.words));return entry;
      }));
      show(details,transcript.length>0);
      if(!transcript.length)details.open=false;
    }
    function replyWith(message,prompt=''){
      spokenContact=null;spokenStore=false;
      if(!message){transcript.length=0;lastPrompt='';}
      else if(reply&&reply!==String(message)){
        transcript.push({prompt:lastPrompt,words:reply});if(transcript.length>4)transcript.shift();
      }
      lastPrompt=prompt;transcriptView();
      reply=String(message||'');if(!reply)clearSpeech();text($('scene-reply'),reply);show($('scene-reply'),!!reply);
      if(reply&&$('scene-reply')){
        const row=$('scene-reply'),area=scroll.getBoundingClientRect(),rect=row.getBoundingClientRect();
        if(rect.top<area.top||rect.bottom>area.bottom)scroll.scrollTop+=rect.top-area.top-4;
      }
    }
    function clearInvitation(){invitation?.remove();invitation=null;}
    function notify(message){
      if(!message||!street())return;
      if(pane==='talk'&&String(message)===reply)return;
      clearInvitation();clearTimeout(noticeTimer);text($('scene-notice-text'),message);show($('scene-notice'),true);
      noticeTimer=setTimeout(()=>show($('scene-notice'),false),6500);
    }
    $('scene-dismiss-notice')?.addEventListener('click',()=>{clearInvitation();clearTimeout(noticeTimer);show($('scene-notice'),false);});
    function hearNeighbour(state){
      const notice=$('scene-notice');
      if(pane||watching||doc.hidden||!notice||state?.mode!=='walk'||state.travelling||state.placement||state.boarding)return;
      const person=state.nearby?.npcId||state.nearby?.residentId,site=sim.active();
      if(!site||!person){nearSignature='';return;}
      const own=actorId(),week=sim.state.week,period=site.id+'/'+(site.foundingRevision||0)+'/'+week;
      const key=period+'/'+own+'/'+person+'/'+(sim.state.actionRevision||0);
      if(key===nearSignature)return;nearSignature=key;
      if(period!==invitationWeek){invitationWeek=period;invitationsSeen.clear();}
      if(!notice.hidden||person===own||!present(site,person)||sim.state.communityLife&&root.EarthCommunityLife?.isHome?.(sim.state,site)===false)return;
      const resident=site.residents.find(r=>r.id===person),promise=resident?.promise;
      const request=root.EarthNeighbourErrands?.greeting?.(site,sim.state,own,person)||
        (promise?.by===own&&promise.dueWeek<=week+1?{key:'promise-'+promise.dueWeek,topic:'news',words:'I’ve kept time for the delivery we agreed on. Do you have a moment?'}:null);
      const seen=own+'/'+person+'/'+request?.key;
      if(!request||invitationsSeen.has(seen)||request.initiated&&invitedBySite.get(site)===week||!street()?.meeting(subjectRef(person)))return;
      invitationsSeen.add(seen);if(request.initiated)invitedBySite.set(site,week);
      const label=name(person);
      notify(label+' · “'+request.words+'”');
      invitation=press('Talk to '+label,()=>{
        if(sim.active()?.id!==site.id||actorId()!==own||sim.state.week!==week||!present(site,person))return;
        if(!openTalk(subjectRef(person)))return;
        const hear=()=>{
          const ctx=liveContext(),reply=sim.converse?.(person,request.topic,ctx.proof);
          if(ctx.current()&&reply?.ok){replyWith(reply.message,'You stopped to listen');beginSpeech(person,reply.message);}
        };
        if(contact())hear();else walkTo(person,hear);
      },false,'hear-neighbour');
      invitation.dataset.streetInvitation='true';notice.append(invitation);
    }
    function subjectRef(id){
      if(!id)return null;
      return sim.active()?.residents.some(p=>p.id===id)?{type:'resident',residentId:id}:{type:'npc',npcId:id};
    }
    function contact(){const ref=subjectRef(talkId);return ref&&street()?.meeting(ref);}
    function registerTool(id,tool){toolbox.set(id,tool);scene(street()?.getState());}
    function setObjective(value,report){
      const changed=goal?.label!==value?.label||goal?.detail!==value?.detail||overview?.forecast!==report?.forecast;
      goal=value;overview=report;
      if(changed&&pane==='goals'&&!goalId){lastDraw='';render();}
    }
    function setWatch(observation){
      const previous=watching?.id;watching=observation;
      show($('scene-watching'),!!observation);
      if(observation){
        text($('scene-watched-action'),[observation.name,observation.label,observation.venue].filter(Boolean).join(' · '));
        $('scene-meet-watched')?.setAttribute('aria-label','Walk to meet '+observation.name);
      }
      if(previous!==observation?.id)changed?.();
    }
    $('scene-meet-watched')?.addEventListener('click',()=>{
      const person=watching?.id;if(!person||!street())return;
      street().observePerson?.(null);setWatch(null);
      if(openTalk(subjectRef(person)))walkTo(person,()=>updateContact());
    });
    $('scene-stop-watch')?.addEventListener('click',()=>{street()?.observePerson?.(null);setWatch(null);});
    function clearTimer(){clearTimeout(rangeTimer);rangeTimer=0;}
    function tick(){
      clearTimer();
      if(!pane||doc.hidden||!street())return;
      if(pane==='talk'){const meeting=updateContact();faceToFaceLayout(meeting);}
      if(pane==='goals'&&goalId)updateActivity();
      if(pane==='truck')toolbox.get('truck')?.onScene?.(street().getState());
      if(pane==='talk'||pane==='truck'||pane==='goals'&&goalId)rangeTimer=setTimeout(tick,speech?180:450);
    }
    function close(restore=true){
      clearSpeech();delete host.dataset.talkDock;delete host.dataset.faceToFace;placementKey='';pickPeople=[];
      const previous=pane;revision++;pane=null;clearTimer();lastDraw='';lastContact='';
      if(previous)toolbox.get(previous)?.close?.();
      for(const b of openers)b.setAttribute('aria-expanded','false');
      card.hidden=true;changed?.();
      if(restore)(opener?.isConnected&&!opener.hidden?opener:$('street-canvas'))?.focus({preventScroll:true});
      opener=null;
    }
    function invalidate(){
      close(false);clearInvitation();nearSignature='';invitationsSeen.clear();listKey='';stripKey='';civicKey='';civic=null;identity='';talkId=null;goalId='';replyWith('');setWatch(null);clearTimeout(noticeTimer);show($('scene-notice'),false);
      for(const tool of toolbox.values())tool.invalidate?.();
    }
    function openTool(id,source=null,focus=true){
      if(!street()||!sim.active()||!panes.some(p=>p.dataset.scenePane===id))return false;
      if(id==='fishing'&&!street().getState().waterfront)return false;
      if(id==='talk'&&!$('scene-topics')||id==='goals'&&!$('scene-goal-detail'))return false;
      if(!['goals','talk','stores'].includes(id)&&!toolbox.has(id))return false;
      if(pane!==id){
        clearSpeech();delete host.dataset.talkDock;placementKey='';
        if(pane)toolbox.get(pane)?.close?.();
        revision++;pane=id;lastDraw='';lastContact='';scroll.scrollTop=0;
      }
      opener=source||openers.find(b=>b.dataset.sceneOpen===id)||opener;
      for(const b of openers)b.setAttribute('aria-expanded',String(b.dataset.sceneOpen===(id==='goals'&&goalId?'person':id)));
      for(const p of panes)p.hidden=p.dataset.scenePane!==id;
      card.hidden=false;clearInvitation();show($('scene-notice'),false);
      text($('scene-title'),({goals:'Goals and people',talk:'Street conversation',neighbours:'Neighbouring communities',stores:'Community stores',fishing:'Waterfront',truck:'Co-op truck',work:'Personal work',life:'Character lives',live:'Live weeks'})[id]);
      render(true);tick();changed?.();if(focus)$('scene-title')?.focus({preventScroll:true});return true;
    }
    function openTalk(ref){
      if(!street())return false;
      pickPeople=[];
      const id=ref?.residentId||ref?.npcId;
      if(id&&id!==actorId()){
        if(talkId!==id){revision++;talkId=id;lastContact='';lastDraw='';replyWith('');}
      }
      return openTool('talk');
    }
    function openTalkChoices(refs){
      const site=sim.active(),choices=new Map();
      if(!site||!street())return false;
      for(const ref of refs||[]){
        const id=ref?.residentId||ref?.npcId;
        if(id&&id!==actorId()&&present(site,id)&&root.EarthAgency.identity(site,id))choices.set(id,ref);
      }
      if(!choices.size)return false;
      if(choices.size===1||!$('scene-nearby-people'))return openTalk(choices.values().next().value);
      pickPeople=[...choices.keys()];
      if(!openTool('talk')){pickPeople=[];return false;}
      $('scene-nearby-people')?.querySelector('button')?.focus({preventScroll:true});
      return true;
    }
    function drawPicker(){
      const picker=$('scene-nearby-people');if(!picker)return;
      host.dataset.pickingNeighbour=pickPeople.length>1?'true':'false';
      picker.replaceChildren();show(picker,pickPeople.length>1);
      if(pickPeople.length<=1)return;
      picker.append(make('h4','Who did you mean?'));
      for(const id of pickPeople){
        const p=root.EarthAgency.identity(sim.active(),id);
        if(!p||!present(sim.active(),id))continue;
        picker.append(press(personLabel(sim.active(),id,p.name)+' · '+(root.EarthCareers?.role?.(sim.active(),id)||p.role),()=>{
          pickPeople=[];openTalk(subjectRef(id));
          if(!contact())walkTo(id,()=>updateContact());
        },false,'choose-neighbour-'+id));
      }
    }
    for(const b of openers)b.addEventListener('click',()=>{
      const id=b.dataset.sceneOpen;
      if(id==='goals'||id==='person'){
        const person=id==='person'?actorId():'';
        if(pane==='goals'&&goalId===person)close();else selectPurpose(person,b);
        return;
      }
      if(id===pane)close();else openTool(id,b);
    });
    $('scene-close')?.addEventListener('click',()=>close());
    host.parentElement.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&pane){event.preventDefault();event.stopPropagation();close();}
    },true);
    doc.addEventListener('visibilitychange',()=>{
      if(doc.hidden){revision++;lastDraw='';clearTimer();clearSpeech();}else if(pane){render(true);tick();}
    });
    function residents(){
      const s=sim.active(),people=root.EarthPersonas?.list(s)||s.residents;
      const labels=people.map(p=>personLabel(s,p.id,p.name)),key=JSON.stringify(people.map((p,i)=>[p.id,labels[i]]));
      if(key!==listKey){
        listKey=key;goalField?.replaceChildren(option('','Community'),...people.map((p,i)=>option(p.id,labels[i])));
      }
      return people;
    }
    function talkDirectory(people){
      const site=sim.active(),possible=people.filter(p=>p.id!==actorId()&&present(site,p.id)),roles=possible.map(p=>root.EarthCareers?.role?.(site,p.id)||p.role);
      const labels=possible.map(p=>personLabel(site,p.id,p.name)),key=JSON.stringify(possible.map((p,i)=>[p.id,labels[i],roles[i],visitor(site,p.id)]));
      if(talkField&&talkField.dataset.people!==key){
        talkField.dataset.people=key;talkField.replaceChildren(...possible.map((p,i)=>option(p.id,labels[i]+' · '+roles[i]+(visitor(site,p.id)?' · Visiting':''))));
      }
      if(!possible.some(p=>p.id===talkId)){
        const near=street().getState().nearby,id=near?.npcId||near?.residentId;
        talkId=possible.some(p=>p.id===id)?id:possible[0]?.id||null;replyWith('');lastContact='';
      }
      if(talkField)talkField.value=talkId||'';
    }
    talkField?.addEventListener('change',()=>{
      revision++;pickPeople=[];talkId=talkField.value;lastDraw='';lastContact='';replyWith('');render(true);tick();changed?.();
      if(talkId&&!contact()&&street()?.getState().mode==='walk')walkTo(talkId,()=>updateContact());
    });
    goalField?.addEventListener('change',()=>{
      revision++;goalId=goalField.value;lastDraw='';
      for(const b of openers)b.setAttribute('aria-expanded',String(b.dataset.sceneOpen===(goalId?'person':'goals')));
      render(true);tick();changed?.();
    });
    function walkTo(id,onArrive){
      const ref=subjectRef(id),local=street(),scope=revision,site=sim.active(),actor=actorId();
      if(!ref||!local)return false;
      if(local.getState().vehicle==='truck'){openTool('truck');return false;}
      if(local.getState().mode==='boat'){
        const moving=local.toggleBoat();
        notify(moving?'Returning to shore. Choose Walk to meet once ashore.':'Choose a berth to return to shore.');return false;
      }
      const started=meet(ref,name(id),()=>{
        if(scope===revision&&local===street()&&site.id===sim.active()?.id&&actor===actorId())onArrive?.();
      });
      if(!started)notify('The route to '+name(id)+' is unavailable here. Move to a clear footpath and try again.');
      return started;
    }
    $('scene-approach')?.addEventListener('click',()=>{
      if(talkId&&walkTo(talkId,()=>{lastContact='';updateContact();}))updateContact();
    });
    function updateContact(){
      if(pane!=='talk'||!talkId||!street())return;
      const local=street(),s=local.getState(),proof=contact(),near=!!proof;
      const key=[talkId,near,s.mode,s.vehicle,!!s.travelling,busy].join('/');
      if(key===lastContact)return proof;lastContact=key;
      host.dataset.faceToFace=near?'true':'false';
      if(!near){clearSpeech();delete host.dataset.talkDock;placementKey='';}
      text($('scene-title'),pickPeople.length>1?'Choose a neighbour':'Talk with '+name(talkId));
      text($('scene-contact'),near?(proof.mode==='walk'?'Together on foot.':'Travelling together.'):
        s.mode==='boat'?'Out of earshot. Return to shore before meeting.':s.vehicle==='truck'?'Park the co-op truck through dispatch before walking over.':s.travelling?'On the way. Conversation opens when you reach '+name(talkId)+'.':'Out of earshot. Walk over to speak in person.');
      text($('scene-approach'),s.mode==='boat'?'Return to shore':s.vehicle==='truck'?'Open truck controls':'Walk to '+name(talkId));show($('scene-approach'),!near);
      for(const b of talkTopics)b.disabled=!near||busy;
      for(const [b,available] of contactButtons)b.disabled=!available||!near||busy;
      return proof;
    }
    function liveContext(){
      const person=talkId,local=street(),s=sim.active(),actor=actorId(),scope=revision,view=stageVersion(),week=sim.state.week;
      const current=()=>pane==='talk'&&!doc.hidden&&scope===revision&&local===street()&&s.id===sim.active()?.id&&
        (s.foundingRevision||0)===(sim.active()?.foundingRevision||0)&&person===talkId&&actor===actorId()&&view===stageVersion()&&week===sim.state.week;
      return {current,proof:()=>current()?local.meeting(subjectRef(person),true):null,local};
    }
    async function performTalk(run,speaker,prompt){
      if(busy||pane!=='talk'||!street())return;
      const ctx=liveContext(),before=sim.state.actionRevision;busy=true;lastContact='';updateContact();
      try{
        const result=await run(ctx);
        if(!ctx.current())return;
        if(result?.message){
          replyWith(result.message,prompt);spokenContact=result.followContact||null;spokenStore=result.followStore===true;
          drawArrangement(sim.active(),talkId);
        }
        if(result?.ok&&result.neighbourHelp){
          const cue=result.neighbourHelp;
          ctx.local.showNeighbourHelp?.(cue.actorId,cue.targetId,cue.kind,cue.method);
        }
        if(result?.changed||before!==sim.state.actionRevision){after?.(result);render();}
        if(speaker&&result?.ok)beginSpeech(speaker,result.message);else clearSpeech();
      }catch{if(ctx.current())replyWith('The conversation could not be saved. Check your place and try again.');}
      finally{busy=false;lastContact='';updateContact();}
    }
    function actionRow(row,call,group){
      const box=make('div',null,'scene-action'),b=press(row.label,call,!row.available,group+'-'+row.id);
      if(group==='people'||group==='work'||group==='startShift')contactButtons.set(b,row.available);
      box.append(b);
      if(row.description||row.detail)box.append(make('p',row.description||row.detail));
      if(row.reason&&!row.available)box.append(make('small',row.reason));
      else if(row.cost!=null||row.terms)box.append(make('small',row.terms||[row.cost+' effort',...Object.entries(row.goods||{}).map(([k,n])=>n+' '+k)].join(' · ')));
      return box;
    }
    function drawDay(site,person){
      const section=$('scene-day'),box=$('scene-shift-actions'),domain=root.EarthShifts;
      if(!section||!box)return;
      box.replaceChildren();show(section,!!person&&!!domain);if(!person||!domain)return;
      const day=domain.view(site,sim.state.week);
      if(!day||day.residentId!==person.id){
        const gate=domain.gate(sim.state,site,person.id),row={...gate,id:person.id,label:'Spend a day with '+person.name,cost:1,description:'Travel together and choose how to fit in work, care and the stops they requested.'};
        box.append(actionRow(row,()=>performTalk(c=>sim.perform('beginShift',person.id,c.proof)),'startShift'));return;
      }
      box.append(make('p',day.clock+' · '+day.timeLeft+' left. '+day.priorityLabel));
      const current=day.stops.find(s=>s.id===day.currentStopId);
      if(current)for(const choice of day.choices){
        box.append(actionRow(choice,()=>performTalk(c=>sim.perform('chooseShift',choice.id,()=>c.current()&&c.local.atStop(current.venue))),'shift'));
      }
      for(const stop of day.stops.filter(s=>!s.visited&&!s.current)){
        const scope=revision;
        box.append(actionRow({...stop,detail:stop.venueName+' · '+stop.window+' · '+stop.arrival},()=>{
          venue(stop.venue,stop.venueName,()=>{
            if(pane==='talk'&&scope===revision)performTalk(c=>sim.perform('arriveShift',stop.id,()=>c.current()&&c.local.atStop(stop.venue)));
          });
        },'shift'));
      }
      box.append(press(day.finishLabel,()=>performTalk(c=>{
        const companion=c.local.getState().companion;
        const pos=companion?.residentId===person.id?{siteId:site.id,x:companion.x,y:companion.y}:undefined;
        return sim.perform('finishShift',pos,()=>c.current()&&sim.active()?.shift?.residentId===person.id);
      }),false,'finish-day'));
    }
    function lifeRequest(site,choice,domain='autonomy'){
      return {domain,action:choice.id,targetId:choice.targetId,expectedRevision:choice.expectedRevision,actorId:actorId(),
        week:sim.state.week,siteId:site.id,generation:site.foundingRevision||0};
    }
    function showReferral(site,id){
      const card=$('scene-referral'),source=actorId(),generation=site.foundingRevision||0,pending=root.EarthIntroductions?.pending?.(site,sim.state,source);
      if(!card)return;card.replaceChildren();show(card,!!pending&&pending.guideId===id);
      if(!pending||pending.guideId!==id)return;
      const current=()=>sim.active()?.id===site.id&&(sim.active()?.foundingRevision||0)===generation&&actorId()===source&&
        root.EarthIntroductions.pending(sim.active(),sim.state,source)?.serial===pending.serial;
      card.append(press('Meet '+pending.contactName,()=>{
        if(!current()){notify('The introduction has changed. Ask for the current contact.');return;}
        openTalk(subjectRef(pending.contactId));walkTo(pending.contactId,()=>{
          updateContact();render(true);
          if(!current())notify('The introduction expired. You can still talk in person.');
        });
      },false,'meet-referral'));
    }
    function drawArrangement(site,id){
      const area=$('scene-agreement-route');if(!area)return;
      const from=actorId();
      const row=root.EarthDialogue?.arrangements?.(site,sim.state,from)?.find(r=>
        (r.status==='agreed'||r.status==='asked')&&r.dueWeek>=sim.state.week&&(r.requesterId===id||r.contactId===id));
      area.replaceChildren();show(area,!!row||!!spokenContact||spokenStore);
      if(spokenStore)area.append(press('Check the stores and prices',()=>openTool('stores'),false,'conversation-stores'));
      if(spokenContact&&present(site,spokenContact)){
        const next=spokenContact;
        area.append(press('Ask '+name(next)+' about their side',()=>{
          openTalk(subjectRef(next));walkTo(next,()=>updateContact());
        },false,'meet-other-perspective'));
      }
      if(!row)return;
      area.append(make('small',row.title+' · '+(row.status==='agreed'?'Due week '+row.dueWeek:'Awaiting terms')+
        (row.dateDecision==='agreed'?' · Moved from week '+(row.week+2):row.dateDecision==='declined'?' · Original date kept':'')));
      if(row.nextId!==id&&present(site,row.nextId)){
        area.append(press('Walk to '+name(row.nextId),()=>{
          const who=row.nextId,verb=row.status==='asked'?'terms':'recall';
          openTalk(subjectRef(who));
          walkTo(who,()=>{
            updateContact();
            // Arriving from a named introduction is enough context for the
            // neighbour to explain their side, just as the two meet on screen.
            if(busy||!contact()||!sim.converse)return;
            const ctx=liveContext(),greeting=sim.converse(who,'errand:'+verb+':'+row.id,ctx.proof);
            if(ctx.current()&&greeting?.ok){
              replyWith(greeting.message,verb==='terms'?'What has already been promised?':'Where did we leave this?');
              beginSpeech(who,greeting.message);
            }
          });
        },false,'meet-agreement'));
      }else if(!present(site,row.nextId))area.append(make('p',name(row.nextId)+' is away from the district.'));
    }
    function drawTalk(site){
      talkTopics.clear();contactButtons.clear();lastContact='';
      if(!talkId)return;
      const foreign=sim.state.communityLife&&root.EarthCommunityLife?.isHome?.(sim.state,site)===false;
      const person=foreign?null:site.residents.find(p=>p.id===talkId),refId=talkId,buttons=$('scene-topics'),actions=$('scene-person-actions');
      if(!buttons)return;drawPicker();
      const formerMore=buttons.querySelector('details')?.open===true;
      buttons.replaceChildren();actions?.replaceChildren();
      const topics=root.EarthAgency.topics?.(site,sim.state,talkId)||[
        {id:'news',label:'How are things?'},{id:'work',label:'What are you working on?'},{id:'interests',label:'Outside work'},{id:'meal',label:'Share a meal · 1 food'}];
      const more=make('details'),extra=make('div',null,'scene-topic-list');
      more.append(make('summary','More to discuss'),extra);more.open=formerMore;
      for(const topic of topics){
        const b=press(topic.label,()=>performTalk(c=>{
          // Inspecting another life does not need to queue behind a save in a
          // second tab. Both paths still recheck the real face-to-face meeting.
          return root.EarthDialogue?.readOnly?.(topic.id)&&sim.converse?sim.converse(refId,topic.id,c.proof):sim.perform('converse',refId,topic.id,c.proof);
        },refId,topic.label),false,'topic-'+topic.id);
        talkTopics.add(b);
        const immediate=topic.context||['news','work','dream','visit-fit'].includes(topic.id)||topic.id.startsWith('intro:meet:');
        if(topic.context)b.dataset.dialogueContext='true';
        (immediate?buttons:extra).append(b);
      }
      if(extra.children.length)buttons.append(more);
      drawArrangement(site,refId);
      show($('scene-commitments'),!!person);
      if(person&&actions){
        const offers=sim.actions('people').filter(a=>a.residentId===person.id);
        const parcel=sim.actions('work').find(a=>a.id==='courier:deliver:'+person.id);
        if(parcel)offers.push(parcel);
        for(const a of offers)actions.append(actionRow(a,()=>performTalk(c=>sim.perform('act',a.id,undefined,a.group,()=>!!c.proof())),a.group));
        show($('scene-commitments'),offers.length>0);
      }
      const plans=$('scene-advice-actions'),choices=foreign||visitor(site,refId)?[]:root.EarthAutonomy?.guidance?.(site,sim.state,refId)?.choices||[];
      plans?.replaceChildren();show($('scene-plans'),!foreign&&!visitor(site,refId)&&(choices.length>0||!!profile));
      for(const choice of choices){
        const r=lifeRequest(site,choice);
        plans?.append(actionRow(choice,()=>performTalk(c=>sim.perform('lifeAction',refId,r,c.proof)),'people'));
      }
      if(profile)plans?.append(press('Explore work, skills and study',()=>profile(refId),false,'open-life'));
      showReferral(site,refId);drawCivicDiscussion(site,refId);
      if(foreign)show($('scene-civic-dialogue'),false);
      drawDay(site,person);updateContact();
    }
    function civicModel(site){
      if(!root.EarthCivicInitiatives)return null;
      const key=[site.id,site.foundingRevision||0,sim.state.week,sim.state.actionRevision||0,site.civicInitiatives?.revision,site.buildings?.length,site.construction?.length].join('/');
      if(civicKey!==key){
        civicKey=key;civic=sim.civicView?.()||root.EarthCivicInitiatives.view(sim.state,site);
      }
      return civic;
    }
    function civicGoods(goods){
      return Object.entries(goods||{}).filter(([key,n])=>['funds','materials','food'].includes(key)&&Number.isFinite(n)&&n>0)
        .map(([key,n])=>n+' '+key).join(', ');
    }
    function drawCivicDiscussion(site,id){
      const section=$('scene-civic-dialogue'),box=$('scene-civic-actions'),civics=root.EarthCivicInitiatives;
      if(!section||!box)return;
      const proposal=civicModel(site)?.active,guidance=proposal&&civics.guidance(sim.state,site);
      box.replaceChildren();show(section,!!guidance&&guidance.contactId===id);
      if(!guidance||guidance.contactId!==id)return;
      box.append(info(proposal.title,proposal.reason),make('p',proposal.status||proposal.benefit));
      for(const choice of guidance.choices||[]){
        const request=lifeRequest(site,choice,'civic');
        box.append(actionRow(choice,()=>performTalk(c=>sim.perform('lifeAction',id,request,c.proof)),'people'));
      }
    }
    function civicProject(box,model){
      const p=model?.active,history=model?.history||[];
      if(!p&&!history.length)return;
      if(p){
        box.append(info(p.title,p.leadName+' · '+p.reason));
        if(p.benefit)box.append(make('p',(p.beneficiaryName?'For '+p.beneficiaryName+' · ':'')+p.benefit));
        if(p.status)box.append(make('p',p.status,'scene-muted'));
        const delegate=root.EarthCivicInitiatives.guidance(sim.state,sim.active()).contactId;
        if(delegate)box.append(press('Discuss with '+name(delegate),()=>{
          openTalk(subjectRef(delegate));const discussion=$('scene-civic-dialogue');if(discussion)discussion.open=true;
          walkTo(delegate,()=>updateContact());
        },false,'meet-civic-lead'));
        const details=make('details'),rows=make('div',null,'scene-more-projects');
        details.append(make('summary','Votes, evidence and costs'),rows);
        details.addEventListener('toggle',()=>{
          if(!details.open||!details.isConnected||rows.children.length)return;
          const budget=[civicGoods(p.goods),p.effort?p.effort+' civic effort':''].filter(Boolean).join(' · ');
          if(budget)rows.append(make('p','Proposal cost · '+budget));
          const pledged=[civicGoods(p.pledged),p.labour?p.labour+' labour':''].filter(Boolean).join(' · ');
          if(pledged)rows.append(make('p','Contributed so far · '+pledged));
          for(const contribution of p.contributions||[]){
            const share=[civicGoods(contribution),contribution.labour?contribution.labour+' labour':''].filter(Boolean).join(' · ');
            if(share)rows.append(press(contribution.name+' · '+share,()=>selectPurpose(contribution.personId),false,'civic-help-'+contribution.personId));
          }
          if(p.evidence)rows.append(info('Evidence · '+p.evidence.title,[p.evidence.ownerName,'Week '+p.evidence.week].filter(Boolean).join(' · ')));
          for(const v of p.votes||[])rows.append(info(v.name+' · '+v.stance,v.reason));
        });
        box.append(details);
      }
      if(history.length){
        const latest=history[0];
        box.append(info('Latest town decision · '+latest.title,latest.status||latest.benefit));
      }
    }
    function updateActivity(){
      const label=$('scene-live-activity'),current=street()?.activityOf?.(goalId);
      if(label&&current)text(label,[current.label,current.venue].filter(Boolean).join(' · '));
    }
    function previewWeek(){
      selectPurpose('');
      const details=$('scene-week-preview');if(details){details.open=true;details.querySelector('summary')?.focus({preventScroll:true});}
    }
    function selectPurpose(id,source){
      goalId=id||'';revision++;openTool('goals',source||openers.find(b=>b.dataset.sceneOpen===(goalId?'person':'goals')));if(goalField)goalField.value=goalId;
    }
    function townNeed(site,civic){
      const meals=Math.ceil(site.population/5),promised=site.residents.filter(r=>r.promise).sort((a,b)=>a.promise.dueWeek-b.promise.dueWeek)[0],plan=sim.buildPlanView?.();
      if(site.food<meals)return {label:'Stock '+(meals-site.food)+' food',
        detail:'The pantry holds '+site.food+' food. Current households use '+meals+' in a week. A personal food job can add supplies today.',resource:'food'};
      if(promised)return {label:'Keep '+promised.name+'’s promise',detail:promised.name+' is counting on the agreement by week '+promised.promise.dueWeek+'.',person:promised.id};
      const lot=root.EarthResources?.expiringPublicLot?.(site,sim.state.week);
      if(lot)return {label:'Use the '+lot.label,detail:lot.amount+' '+lot.label+' in the public store will spoil at the start of week '+lot.until+'. Open Stores to check what the kitchen can prepare or what the market will buy.'};
      if(civic?.active){
        const p=civic.active;
        return {label:p.title,detail:[p.leadName&&p.leadName+' is organising '+p.title+'.',p.status||p.benefit].filter(Boolean).join(' ')||
          'The residents are considering a shared proposal.'};
      }
      const job=site.construction?.find(j=>!j.paused);
      if(job){
        const progress=Math.round(100*job.work/job.total),verb=job.kind==='dismantle'?'Dismantle ':'Finish ';
        return {label:verb+job.name,detail:job.name+' is '+progress+'% complete. The crew’s work on site determines when '+(job.kind==='dismantle'?'the plot can be reused.':'the community can start using it.')};
      }
      if(plan){
        const gap=plan.missing?.[0];
        return {label:plan.name,detail:gap?'The '+plan.name.toLowerCase()+' plan needs '+gap.amount+' more '+gap.key+' before work can start.':
          'The community has set aside a plan for '+plan.name.toLowerCase()+'. '+(plan.gate||'Review the lot and crew before commissioning.'),resource:gap?.key};
      }
      const vacant=Object.keys(site.employers||{}).find(key=>site.employers[key].open.length);
      const hiring=vacant&&root.EarthEmployers?.view?.(site,sim.state,vacant);
      if(hiring)return {label:'Recruit a '+hiring.role.toLowerCase(),detail:hiring.detail};
      if(sim.state.charter&&site.tech?.length<3&&sim.actions&&(!sim.state.communityLife||root.EarthCommunityLife?.isHome?.(sim.state,site))){
        const research=sim.actions('research').find(r=>r.id.startsWith('research:'));
        if(research)return {label:research.label,detail:research.available?research.description:research.reason};
      }
      if(overview?.charter&&!overview.charter.met)return {label:overview.charter.name,detail:overview.charter.text};
      return {label:'Meals for '+site.population,detail:'Keep '+site.population+' residents fed. They use '+meals+' food per week and the pantry currently holds '+site.food+'.',resource:'food'};
    }
    function updateStrip(site,who){
      const key=[who,sim.state.week,sim.state.actionRevision||0,site.construction?.[0]?.work||0,site.food,site.materials,site.funds,site.population].join('/');
      if(key===stripKey)return;stripKey=key;
      const town=townNeed(site,civicModel(site)),self=actorId(),plan=root.EarthAutonomy?.view(site,sim.state,self),person=root.EarthPersonas?.profile(site,self);
      const career=site.careers?.[self],aspiring=career?.application?.targetId||career?.training?.targetId;
      const job=aspiring&&root.EarthCareers?.catalog?.find(j=>j.id===aspiring);
      const own=plan?.personalHobby||plan?.ownProject||plan?.project;
      const obligation=root.EarthDialogue?.arrangements?.(site,sim.state,self)?.find(r=>r.status==='agreed'&&r.dueWeek>=sim.state.week);
      const aim=obligation?obligation.title+' · week '+obligation.dueWeek:plan?.kind==='dream'&&plan.dream?plan.dream.title:job?(career.application?'Apply for ':'Study for ')+job.label:own?.title||
        (plan?.dream?.title||(person?.hobbyAxis?'Practise '+person.hobbyAxis:'Choose a personal project'));
      text($('scene-goal-summary'),town.label);text($('scene-person-summary'),aim);
      const townButton=$('scene-open-goals'),personButton=$('scene-open-person');
      const anchor=root.EarthInterdependence?.anchor?.(sim.state,site),original=$('scene-original-return');
      show(original,!!anchor&&(!anchor.yours||!anchor.atHome));
      text($('scene-original-status'),anchor?.nearest?'Due week '+anchor.nearest.due:
        anchor?.dutyWeek&&!anchor.roundCovered?'Pantry · week '+anchor.dutyWeek:anchor?.name||'');
      if(original&&anchor){original.title=anchor.status;original.setAttribute('aria-label','Original character, '+anchor.name+'. '+anchor.status);}
      text($('scene-person-label'),anchor&&!anchor.yours&&person?.name?person.name+'’s aim':'My aim');
      if(townButton)townButton.title=[town.detail,typeof anchor==='string'?anchor:anchor?.status].filter(Boolean).join(' ');if(personButton)personButton.title=(person?.name||'Your character')+' · '+aim;
      text($('scene-store-summary'),site.food+' food · '+site.materials+' materials · '+site.funds+' funds');
    }
    function localProjects(box,site,people,resource){
      const projects=new Map(),kind=resource==='food'?'food':resource==='materials'?'build':null;
      for(const p of people){
        const intent=root.EarthAutonomy?.view(site,sim.state,p.id);
        for(const project of [intent?.project,intent?.ownProject]){
          if(project&&!projects.has(project.id))projects.set(project.id,project);
        }
      }
      if(!projects.size){
        for(const r of site.residents){
          const work=street()?.activityOf?.(r.id);
          if(work&&r.id!==actorId())box.append(press(r.name+' · '+work.label,()=>selectPurpose(r.id),false,'worker-'+r.id));
        }
        return;
      }
      const score=p=>(p.finishedWeek?-8:0)+(p.kind===kind?3:0)+(p.progress>0?3:0)+(p.volunteerId?2:0);
      const ordered=[...projects.values()].sort((a,b)=>score(b)-score(a)||a.ownerName.localeCompare(b.ownerName));
      function row(p){
        const r=make('div',null,'scene-action'),who=p.beneficiaryName||p.partnerName;
        r.append(press(p.ownerName+' · '+p.title,()=>selectPurpose(p.ownerId),false,'project-'+p.id),
          make('small',p.phase+(who?' · '+(p.beneficiaryName?'For ':'With ')+who:'')));
        return r;
      }
      box.append(make('h4','Local projects'),...ordered.slice(0,2).map(row));
      if(ordered.length<=2)return;
      const more=make('details'),items=make('div',null,'scene-more-projects');
      more.append(make('summary','Other local projects · '+(ordered.length-2)),items);
      more.addEventListener('toggle',()=>{
        if(more.open&&more.isConnected&&!items.children.length)items.append(...ordered.slice(2).map(row));
      });
      box.append(more);
    }
    function recentEffects(box,site,id){
      const receipts=root.EarthCommunityEffects?.view(sim.state,site,id);
      if(!receipts?.length)return;
      const details=make('details'),list=make('div',null,'scene-more-projects');
      details.id='scene-recent-effects';details.append(make('summary','Recent effects'),list);
      details.addEventListener('toggle',()=>{
        if(!details.open||!details.isConnected||list.children.length)return;
        for(const row of receipts.slice(0,5)){
          const card=info('Week '+row.week+' · '+row.title,row.result);
          const people=make('div',null,'scene-links');
          for(const person of row.people||[]){
            if(root.EarthPersonas?.profile(site,person.id)){
              people.append(press(person.name,()=>selectPurpose(person.id),false,'effect-person-'+person.id));
            }else if(person.name)people.append(make('span',person.name));
          }
          if(people.children.length)card.append(people);
          list.append(card);
        }
      });
      box.append(details);
    }
    function drawGoals(site,people){
      const foreign=sim.state.communityLife&&root.EarthCommunityLife?.isHome?.(sim.state,site)===false;
      if(goalId&&!people.some(p=>p.id===goalId))goalId='';
      if(goalField)goalField.value=goalId;const box=$('scene-goal-detail');if(!box)return;box.replaceChildren();
      if(!goalId){
        const civic=civicModel(site),need=townNeed(site,civic);
        box.append(info(site.name+' · Week '+sim.state.week,need.detail));
        root.EarthInterdependence?.appendTown?.(box,{site,world:sim.state,people,select:selectPurpose,openTool,activity:id=>street()?.activityOf?.(id)});
        const routes=make('div',null,'scene-links');
        if(!foreign&&need.resource)routes.append(press(need.resource==='funds'?'Earn funds':'Supply '+need.resource,()=>personalWork(need.resource),false,'supply-town'));
        routes.append(press('Open stores',()=>openTool('stores'),false,'open-stores'));
        if(!foreign)routes.append(press('Personal work',()=>personalWork(),false,'personal-work'));
        box.append(routes);
        if(!foreign&&!sim.state.effort)box.append(make('p','Weekly civic effort is spent. Personal work can still bring food, materials or funds into these stores.','scene-muted'));
        if(need.person)box.append(press('Meet '+name(need.person),()=>{openTalk(subjectRef(need.person));walkTo(need.person,()=>updateContact());},false,'meet-promise'));
        if(overview?.forecast)box.append(make('p','Regular production · '+overview.forecast,'scene-muted'));
        civicProject(box,civic);
        if(!foreign&&goal?.label){
          box.append(info('Next civic decision',goal.detail||overview?.objective));
          box.append(press(goal.label,()=>followGoal(goal),false,'next-goal'));
        }
        localProjects(box,site,people,need.resource);recentEffects(box,site,null);
        const buttons=make('div',null,'scene-links');
        buttons.append(press('Advance one week',()=>advance(),false,'advance-week'));
        const forecast=make('details'),summary=make('summary','Preview the next week'),results=make('div',null,'scene-action');
        forecast.id='scene-week-preview';forecast.append(summary,results);
        forecast.addEventListener('toggle',()=>{
          if(!forecast.open||!forecast.isConnected)return;
          if(readForecast){readForecast(results,()=>forecast.open&&forecast.isConnected);return;}
          if(!sim.forecastNext)return;
          const next=sim.forecastNext();results.replaceChildren();
          for(const town of next.sites){
            const changes=Object.entries(town.delta||{}).filter(([,n])=>n).map(([k,n])=>(n>0?'+':'')+n+' '+k);
            results.append(info(town.name+' · Week '+next.week,[changes.join(' · ')||'No net change',...(town.highlights||[])].join('. ')));
          }
        });
        box.append(forecast,buttons);return;
      }
      const p=people.find(p=>p.id===goalId),plan=root.EarthAutonomy?.view(site,sim.state,p.id);
      const career=root.EarthCareers?.view(sim.state,site,p.id),job=root.EarthCareers?.catalog.find(r=>r.id===career?.careerId);
      const project=plan?.project;
      box.append(info(personLabel(site,p.id,p.name),career?[career.career,career.employer].join(' · '):p.originRole||p.role));
      const seen=new Set();
      function freshText(value){
        const parts=String(value||'').match(/[^.!?]+[.!?]*/gu)||[],fresh=[];
        for(const part of parts){
          const sentence=part.trim(),key=sentence.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
          if(key&&!seen.has(key)){seen.add(key);fresh.push(sentence);}
        }
        return fresh.join(' ');
      }
      if(plan)box.append(info(freshText(plan.goal||plan.label),freshText(plan.reason)));
      root.EarthInterdependence?.appendPerson?.(box,{site,world:sim.state,people,id:p.id,select:selectPurpose});
      if(plan?.dream){
        const d=plan.dream;
        const ambition=info(d.title,[d.progressText,d.next].filter(Boolean).join(' '));
        function visitResult(card,id,label){
          if(!['balcony','orchard','ensemble'].includes(id)||!street()?.focusAchievement)return;
          card.append(press(label,()=>{
            if(street()?.focusAchievement(p.id,id)){close(false);$('street-canvas')?.focus({preventScroll:true});}
            else notify('This achievement can’t be seen from the current street.');
          },false,'see-achievement-'+id));
        }
        if(d.earned)visitResult(ambition,d.id,'See in Street');
        box.append(ambition);
        const earlier=(d.achievements||[]).filter(w=>w.id!==d.id);
        if(earlier.length){
          const log=make('details');log.append(make('summary','Earlier ambitions'));
          for(const w of earlier){
            const achievement=info(w.earned,'Week '+w.week+' · '+w.place);
            if(w.place===site.name)visitResult(achievement,w.id,'See in Street');
            log.append(achievement);
          }
          box.append(log);
        }
      }
      const moves=make('div',null,'scene-links');box.append(moves);
      if(plan&&Number.isFinite(plan.energy))box.append(make('p','Energy '+plan.energy+' / 8 · Need for company '+plan.contact+' / 8.','scene-muted'));
      const purse=sim.purseView?.(p.id);
      if(purse){
        const entry=purse.entries?.[0],funds=info('Personal funds · '+purse.balance,entry?'Week '+entry.week+' · '+entry.text:'');
        if(purse.shift?.clerkName)funds.append(make('small','Current paid errand · '+purse.shift.clerkName));
        if(!foreign&&p.id===actorId())funds.append(press('Personal funds and shifts',()=>{
          if(openTool('stores'))toolbox.get('stores')?.openPurse?.();
        },false,'own-purse'));
        box.append(funds);
      }
      if(plan?.contribution){
        const gift=plan.contribution;
        box.append(press('Helped '+name(gift.ownerId)+' · Week '+gift.week,()=>selectPurpose(gift.ownerId),false,'contributed-to'));
        if(gift.activity)box.append(make('p',gift.activity));
      }
      if(plan?.received){
        const from=plan.received;
        box.append(press('Received food from '+name(from.ownerId)+' · Week '+from.week,()=>selectPurpose(from.ownerId),false,'received-from'));
      }
      const activity=make('p',plan?.label||'In the district.','scene-muted');activity.id='scene-live-activity';box.append(activity);updateActivity();
      if(job)box.append(info('Contribution',job.service));
      const personal=site.residents.find(r=>r.id===p.id);
      if(personal?.promise)box.append(make('p','You promised supplies or a project to '+p.name+' by week '+personal.promise.dueWeek+'.'));
      if(plan?.personalHobby&&plan.personalHobby.id!==project?.id&&plan.personalHobby.id!==plan.ownProject?.id){
        const hobby=plan.personalHobby;box.append(info(hobby.title+' · '+hobby.progress+' / '+hobby.total,hobby.next));
      }
      if(plan?.ownProject&&plan.ownProject.id!==project?.id){
        const own=plan.ownProject;
        box.append(info('Their own project · '+own.title,[own.why,own.next].filter(Boolean).join(' ')));
      }
      if(project){
        const title=freshText(project.title),progress=project.progress+' / '+project.total;
        box.append(info((title?title+' · ':'Project · ')+progress,[freshText(project.goal),freshText(project.why)].filter(Boolean).join(' ')));
        box.append(make('p',[project.role,project.phase,freshText(project.next),freshText(project.effect)].filter(Boolean).join(' · ')));
        if(project.materialCost&&project.progress===0)box.append(make('p','To start · '+project.materialCost+' community materials.','scene-muted'));
        if(project.volunteerName)box.append(press('Volunteered · '+project.volunteerName,()=>selectPurpose(project.volunteerId),false,'volunteer'));
        const links=make('div',null,'scene-links');
        for(const [label,id,n] of [['Lead',project.ownerId,project.ownerName],['Partner',project.partnerId,project.partnerName],['Beneficiary',project.beneficiaryId,project.beneficiaryName]]){
          if(id&&n)links.append(id===p.id?make('span',label+' · '+n):press(label+' · '+n,()=>selectPurpose(id),false,'link-'+label));
        }
        box.append(links);
      }else if(plan?.target&&plan.target!==p.id)box.append(press('Connected with '+name(plan.target),()=>selectPurpose(plan.target),false,'linked-person'));
      const actions=moves;
      if(profile)actions.append(press('Work, skills and study',()=>profile(p.id),false,'open-life'));
      if(p.id!==actorId()){
        actions.append(press('Meet '+p.name,()=>{openTalk(subjectRef(p.id));walkTo(p.id,()=>updateContact());},false,'meet'));
        const playable=root.EarthAgency.playables?.(site).some(person=>person.id===p.id)??(p.kind==='resident'||p.kind==='steward');
        if(!foreign&&playAs&&playable&&!visitor(site,p.id)&&present(site,p.id))actions.append(press('Play as '+p.name,()=>playAs(p.id),false,'play-as'));
        if(street()?.observePerson)actions.append(press('Watch '+p.name,()=>{
          if(!street().observePerson(p.id)){notify('This person is unavailable to watch at the moment.');return;}
          const seen=street().activityOf(p.id);if(seen)setWatch(seen);
          close(false);$('street-canvas').focus({preventScroll:true});
        },false,'watch'));
      }else if(!foreign){
        const personalChoices=root.EarthAutonomy?.guidance?.(site,sim.state,p.id)?.choices||[];
        for(const practice of personalChoices.filter(row=>row.personal||['hobbyPractice','dreamPractice'].includes(row.id))){
          const proposal=lifeRequest(site,practice),scope=revision,local=street(),trip=stageVersion();
          actions.append(actionRow(practice,()=>{
            const current=()=>!doc.hidden&&pane==='goals'&&revision===scope&&goalId===p.id&&actorId()===p.id&&
              street()===local&&stageVersion()===trip&&sim.state.week===proposal.week&&sim.active()?.id===proposal.siteId;
            const destination=practice.id==='dreamPractice'?(practice.venue||plan?.dream?.venue):null;
            const proof=()=>!current()?null:destination?local.venueProof?.(destination,p.id):local.getState();
            const complete=async()=>{
              if(!current())return;
              const result=await sim.perform('lifeAction',p.id,proposal,proof);
              if(!current())return;notify(result.message);
              if(result.ok||result.changed){after?.(result);render();}
            };
            if(destination&&!proof()){
              if(!local.focusVenue?.(destination,p.id,complete))notify('Walk to the '+destination+' on foot to take up this part of your plan.');
              else notify('On your way to the '+destination+' for “'+practice.label+'”.');
              return;
            }
            return complete();
          },'hobby'));
        }
        actions.append(press('Find personal work',()=>personalWork(),false,'own-work'));
      }
      recentEffects(box,site,p.id);
    }
    function render(force=false){
      const site=sim.active(),local=street();if(!site||!local)return;
      const who=[site.id,site.foundingRevision||0,actorId()].join('/');
      if(identity!==who){if(identity)invalidate();identity=who;lastDraw='';}
      updateStrip(site,who);
      if(!pane)return;
      const stamp=[who,pane,sim.state.week,sim.state.actionRevision||0,talkId,goalId].join('/');
      if(!force&&stamp===lastDraw)return;
      const focused=doc.activeElement?.dataset.streetCommand;
      if(pane==='talk'||pane==='goals'){
        const people=residents();if(pane==='talk'){talkDirectory(people);drawTalk(site);}else drawGoals(site,people);
      }else toolbox.get(pane)?.render?.(local.getState());
      lastDraw=[who,pane,sim.state.week,sim.state.actionRevision||0,talkId,goalId].join('/');
      if(focused&&(!doc.activeElement?.isConnected||doc.activeElement===doc.body)){
        const match=[...card.querySelectorAll('[data-street-command]')].find(b=>b.dataset.streetCommand===focused&&!b.disabled);
        (match||$('scene-title'))?.focus({preventScroll:true});
      }
    }
    function scene(state){
      if(!state)return;
      if(!pane)hearNeighbour(state);
      show($('scene-open-fishing'),!!state.waterfront&&toolbox.has('fishing'));
      show($('scene-open-truck'),toolbox.has('truck'));
      if(pane==='talk')updateContact();
      if(pane==='fishing')toolbox.get('fishing')?.onScene?.(state);
      if(pane==='truck')toolbox.get('truck')?.onScene?.(state);
    }
    const restorable=new Set(['goals','stores','talk','fishing','truck','live','neighbours']);
    function snapshot(){
      const site=sim.active();if(!site)return null;
      return {v:1,siteId:site.id,name:site.name,generation:site.foundingRevision||0,actor:actorId(),
        handoff:site.agency?.handoffSerial||0,pane:restorable.has(pane)?pane:null,
        subject:pane==='goals'?goalId:pane==='talk'?talkId:null,watch:watching?.id||null,
        store:pane==='stores'?toolbox.get('stores')?.snapshot?.():null};
    }
    function matches(saved){
      const site=sim.active();
      return !!site&&saved?.v===1&&saved.siteId===site.id&&saved.name===site.name&&saved.generation===(site.foundingRevision||0)&&
        saved.actor===actorId()&&saved.handoff===(site.agency?.handoffSerial||0);
    }
    function restore(saved){
      const local=street();if(!local||!matches(saved))return false;
      invalidate();render();
      if(typeof saved.watch==='string'&&saved.watch!==actorId()&&local.observePerson?.(saved.watch)){
        const observed=local.activityOf?.(saved.watch);if(observed)setWatch(observed);
      }
      if(!restorable.has(saved.pane))return true;
      if(saved.pane==='goals'||saved.pane==='talk'){
        const known=typeof saved.subject==='string'&&residents().some(p=>p.id===saved.subject);
        if(saved.pane==='goals')goalId=known?saved.subject:'';
        else if(known&&saved.subject!==actorId())talkId=saved.subject;
        else return true;
      }
      if(openTool(saved.pane,null,false)&&saved.pane==='stores')toolbox.get('stores')?.restore?.(saved.store);
      return true;
    }
    return {registerTool,openTool,openTalk,openTalkChoices,close,render,scene,invalidate,notify,setObjective,setWatch,
      version:()=>revision,active:()=>pane,selectPurpose,previewWeek,snapshot,restore,matches};
  }
  root.EarthStreetHUD=Object.freeze({mount});
})(typeof window==='undefined'?globalThis:window);
