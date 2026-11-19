/* An introduction is carried by its recipient. Help is considered only after
   the recipient visits the named contact and passes on the guide's name. */
(function(root){
  'use strict';
  const axes=['numeracy','music','communication','care','craft','stamina','organisation'];
  const maxRows=64,travelWeeks=3,cooperationWeeks=4;
  const number=(v,min,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
  const known=(site,id)=>typeof id==='string'&&(root.EarthAgency?.canPlay?.(site,id)||/^carrier-[0-8]-[0-8]$/.test(id));
  const actor=site=>root.EarthAgency.actorId(site);
  const local=(site,id)=>root.EarthCommunityLife?.present?.(site,id)!==false&&root.EarthCommunityLife?.residency?.(site,id)!=='visitor';
  const find=(site,id)=>root.EarthAgency.identity(site,id);
  const rows=site=>site?.introductions?.rows||[];
  const open=(row,week)=>row.status==='pending'&&week>=row.issuedWeek&&week<row.expiresWeek;
  const remembered=(row,week)=>row.status==='met'&&week>=row.metWeek&&week<row.metWeek+cooperationWeeks;
  const info=row=>({serial:row.serial,contactId:row.contactId,contactName:row.contactName,guideId:row.guideId,guideName:row.guideName,
    field:row.field,expiresWeek:row.expiresWeek});
  const refusal=message=>({ok:false,changed:false,message});
  const said=(name,words)=>({ok:true,message:name+' · “'+words+'”'});
  const skill=(site,p,axis)=>site.careers?.[p.id]?.skills?.[axis]??p.aptitudes?.[axis]??0;
  const pair=(row,a,b)=>row.from===a&&row.to===b||row.from===b&&row.to===a;
  function same(site,id,key,name){
    const p=root.EarthPersonas?.profile(site,id)||find(site,id);
    return !!p&&(key?p.identityKey===key:!name||p.name===name);
  }
  function toCurrentPeople(site,row){
    return same(site,row.actorId,row.actorKey)&&same(site,row.guideId,row.guideKey,row.guideName)&&same(site,row.contactId,row.contactKey,row.contactName);
  }
  function level(site,from,to,axis,week){
    const agreement=rows(site).find(row=>row.actorId===from&&row.contactId===to&&row.field===axis&&remembered(row,week)&&
      same(site,from,row.actorKey)&&same(site,to,row.contactKey,row.contactName));
    return agreement?(agreement.peers?1:2):0;
  }
  function pending(site,world,actorId){
    if(!site||world?.activeId!==site.id||actor(site)!==actorId)return null;
    const row=rows(site).find(r=>r.actorId===actorId&&open(r,world.week));
    if(!row)return null;
    const contact=find(site,row.contactId);
    return contact&&contact.available!==false&&local(site,row.contactId)&&toCurrentPeople(site,row)?info(row):null;
  }
  function fields(site,world,guide){
    const actual=root.EarthLocalProjects?.view(site,world,guide.id,root.EarthAutonomy?.intent(site,guide.id)),career=site.careers?.[guide.id];
    const jobs=root.EarthCareers?.catalog||[],job=jobs.find(j=>j.id===(career?.training?.targetId||career?.jobId))||
      jobs.find(j=>j.label.toLowerCase()===guide.role?.toLowerCase());
    const completed=(root.EarthLocalProjects?.completions(site)||[]).find(p=>p.ownerId===guide.id||p.partnerId===guide.id);
    return [...new Set([actual?.axis,completed?.axis,job?.skill,guide.strengths?.[0]].filter(f=>axes.includes(f)))].slice(0,2);
  }
  function strained(site,a,b,week){
    if((root.EarthAutonomy?.bond?.(site,a,b,week)||0)<=-2)return true;
    const left=site.residents.find(r=>r.id===a),right=site.residents.find(r=>r.id===b);
    return left&&right&&(site.neighbourWork?.links?.[[left.slot,right.slot].sort().join('-')]||0)<0;
  }
  function acquaintance(site,guide,id,contacts){
    const contact=contacts.get(id);
    if(contact)return ({support:'we helped one another cover the cost of a personal ambition',lesson:'we took time for a lesson together',
      kept:'we carried through an agreement together',office:'we worked on handover records together',cover:'we covered a round together',
      project:'we worked on a project together',visit:'we made time to meet',meal:'we shared a meal',listen:'we made time to hear each other out'})[contact.kind]||'we have worked together';
    const met=v=>pair(v,guide,id)&&[v.from,v.to].every(key=>(site.communityLife?.people?.[key]?.since||0)<=v.week)&&
      (!v.fromKey||same(site,v.from,v.fromKey))&&(!v.toKey||same(site,v.to,v.toKey));
    if(site.agency?.visits?.some(met))return 'we made time to talk';
    if(site.agency?.meals?.some(met))return 'we shared a meal';
    if(site.autonomy?.people?.[guide]?.history?.some(v=>['visit','host'].includes(v.kind)&&v.target===id))return 'we met on a visit';
    const town=site.civicInitiatives;
    if([town?.active,...(town?.history||[])].some(v=>v?.meetingWeek>0&&v.attendees.includes(guide)&&v.attendees.includes(id)))return 'we attended a town hearing together';
    const founding=id=>id==='steward'||site.residents.some(r=>r.id===id);
    return founding(guide)&&founding(id)?'we were on the founding team together':null;
  }
  function recommend(site,guide,learner,field,week){
    const finished=(root.EarthLocalProjects?.completions(site)||[]).filter(p=>p.axis===field&&(p.ownerId===guide.id||p.partnerId===guide.id));
    const contacts=new Map((root.EarthAutonomy?.contacts?.(site,guide.id,week)||[]).filter(r=>r.here&&r.strength>0).map(r=>[r.id,r]));
    let best=null;
    for(const p of root.EarthPersonas?.list(site)||[]){
      // These neighbours keep a reachable local presence when worksites change.
      if(!local(site,p.id)||!root.EarthAgency.canPlay(site,p.id)||p.id===learner.id||p.id===guide.id||strained(site,guide.id,p.id,week)||strained(site,learner.id,p.id,week))continue;
      const project=finished.find(work=>work.ownerId===p.id||work.partnerId===p.id);
      const basis=project?'we worked on “'+project.title+'” together':acquaintance(site,guide.id,p.id,contacts);
      const value=skill(site,p,field);
      if(!basis||!project&&value<skill(site,learner,field)+3)continue;
      const priority=value+(project?101:0);
      if(!best||priority>best.priority||priority===best.priority&&p.id<best.person.id)best={person:p,priority,basis,project};
    }
    return best;
  }
  function topics(site,world,targetId){
    if(!site||world?.activeId!==site.id)return [];
    const from=actor(site),guide=find(site,targetId);
    if(!guide||guide.available===false||from===targetId||!local(site,from)||!local(site,targetId))return [];
    const options=[],mine=rows(site).filter(row=>row.actorId===from&&toCurrentPeople(site,row));
    const arrived=mine.find(row=>row.contactId===targetId&&open(row,world.week));
    if(arrived)options.push({id:'intro:meet:'+arrived.serial,label:'Say '+arrived.guideName+' sent me about '+arrived.field});
    const issued=mine.find(row=>row.guideId===targetId&&(open(row,world.week)||remembered(row,world.week)));
    if(issued)options.push({id:'intro:withdraw:'+issued.serial,label:'Withdraw the introduction to '+issued.contactName});
    const past=mine.find(row=>row.contactId===targetId&&(row.metWeek!=null||row.declined));
    if(past)options.push({id:'intro:recall:'+past.serial,label:past.declined?'Why did you decline the introduction?':'Do you remember who introduced us?'});
    if(!mine.some(row=>open(row,world.week))&&!rows(site).some(row=>row.actorId===from&&row.issuedWeek===world.week)){
      for(const field of fields(site,world,guide))options.push({id:'intro:ask:'+field,label:'Who could help me with '+field+'?'});
    }
    return options;
  }
  function closeEnough(site,world,from,to,m){
    return site&&world?.activeId===site.id&&actor(site)===from&&from!==to&&m?.mode==='walk'&&m.siteId===site.id&&m.actor===from&&
      m.target===to&&[m.x,m.y,m.tx,m.ty].every(Number.isFinite)&&Math.hypot(m.x-m.tx,m.y-m.ty)<=1.56;
  }
  function converse(site,world,to,from,topic,meeting){
    if(!closeEnough(site,world,from,to,meeting))return refusal('Stand beside the named neighbour on foot to discuss this introduction.');
    const listener=find(site,to),speaker=find(site,from),week=world.week;
    if(!listener||listener.available===false||!speaker||!local(site,to)||!local(site,from))return refusal('This neighbour is currently away.');
    const match=/^intro:(ask|meet|recall|withdraw):([a-z]+|[1-9][0-9]*)$/.exec(topic);
    if(!match)return refusal('Choose a current introduction topic.');
    const [,action,key]=match,book=site.introductions;
    if(action==='ask'){
      if(!fields(site,world,listener).includes(key))return refusal('Their project or trade has changed. Ask about their current field.');
      if(rows(site).some(r=>r.actorId===from&&(r.issuedWeek===week||open(r,week)&&toCurrentPeople(site,r))))return refusal('Follow up the introduction already offered, or ask again next week.');
      if(strained(site,from,to,week))return said(listener.name,'Our last shared work was difficult. I would like to rebuild trust before I make an introduction.');
      const best=recommend(site,listener,speaker,key,week);
      if(!best)return said(listener.name,'I don’t know someone here I can recommend for '+key+'. You could ask another neighbour who works in that field.');
      const kept=rows(site).map(r=>r.actorId===from&&open(r,week)&&!toCurrentPeople(site,r)?{...r,status:'withdrawn',withdrawnWeek:week}:r);
      if(kept.length>=maxRows){
        const last=kept.findLastIndex(row=>row.issuedWeek<week&&!open(row,week)&&!remembered(row,week));
        if(last<0)return refusal('The introduction book is full of recent referrals. Ask again next week.');
        kept.splice(last,1);
      }
      const serial=(book?.serial||0)+1;
      if(!Number.isSafeInteger(serial))return refusal('The introduction book is full.');
      const contact=best.person,row={serial,actorId:from,guideId:to,guideName:listener.name,contactId:contact.id,contactName:contact.name,
        field:key,issuedWeek:week,expiresWeek:week+travelWeeks,status:'pending'};
      if(speaker.identityKey)row.actorKey=speaker.identityKey;
      if(listener.identityKey)row.guideKey=listener.identityKey;
      if(contact.identityKey)row.contactKey=contact.identityKey;
      // Old worlds may not yet have an agency ledger. Conversation validation
      // still applies to their first referral when the save is reloaded.
      site.agency||={actor:from,meals:[]};site.introductions={generation:site.foundingRevision||0,serial,rows:[row,...kept]};
      const helps=best.project?'They know what the project involved.':'Their '+key+' skill is further along than yours.';
      return {...said(listener.name,'Ask '+contact.name+'. '+best.basis[0].toUpperCase()+best.basis.slice(1)+'. '+helps+' Mention my name by week '+(row.expiresWeek-1)+'.'),
        changed:true,introduction:info(row)};
    }
    const row=rows(site).find(r=>r.serial===Number(key)&&r.actorId===from&&toCurrentPeople(site,r));
    if(!row)return refusal('This introduction belongs to another person or town.');
    if(action==='meet'){
      if(row.contactId!==to||!open(row,week))return refusal('This introduction is no longer waiting for a meeting with this neighbour.');
      const failed=strained(site,to,from,week)?'learner':strained(site,to,row.guideId,week)?'guide':'';
      if(failed){
        row.status='withdrawn';row.withdrawnWeek=week;row.declined=failed;
        const who=failed==='guide'?'My last agreement with '+row.guideName+' fell through. I’d like to work that out with them before I take their recommendation.':
          'I remember our last agreement. I’d like us to keep a smaller promise before I agree to help with '+row.field+'.';
        return {...said(listener.name,who),changed:true};
      }
      row.status='met';row.metWeek=week;
      if(skill(site,listener,row.field)<=skill(site,speaker,row.field)){
        row.peers=true;
        return {...said(listener.name,row.guideName+' sent you about '+row.field+'. You have caught up with me. I’d like to exchange ideas as peers if we can find a free session.'),changed:true};
      }
      return {...said(listener.name,'Thanks for coming. I’ll remember that '+row.guideName+' sent you about '+row.field+
        '. Through week '+(week+cooperationWeeks-1)+' I’m more open to working with you on that, if we can both make time.'),changed:true};
    }
    if(action==='withdraw'){
      if(row.guideId!==to||!open(row,week)&&!remembered(row,week))return refusal('This introduction has already closed.');
      row.status='withdrawn';row.withdrawnWeek=week;
      return {...said(listener.name,'I’ve withdrawn the introduction to '+row.contactName+'.'),changed:true};
    }
    if(row.contactId===to&&row.declined)return said(listener.name,'When you came in week '+row.withdrawnWeek+
      (row.declined==='guide'?' I wanted to repair my working relationship with '+row.guideName+' before taking their recommendation.':' I wanted to see us keep a smaller agreement together first.'));
    if(row.contactId!==to||row.metWeek==null)return refusal('You haven’t met this neighbour through that introduction.');
    return said(listener.name,row.guideName+' introduced us in week '+row.metWeek+'. You came to talk about '+row.field+'.');
  }
  function valid(site,week){
    const book=site.introductions;
    if(book===undefined)return true;
    if(!book||Array.isArray(book)||book.generation!==(site.foundingRevision||0)||!number(book.serial,1)||
      !Array.isArray(book.rows)||!book.rows.length||book.rows.length>maxRows||book.rows[0]?.serial!==book.serial)return false;
    const recent=new Set(),weeks=new Set();
    for(let i=0;i<book.rows.length;i++){
      const r=book.rows[i];
      if(!r||!number(r.serial,1,book.serial)||i>0&&r.serial>=book.rows[i-1].serial||
        !root.EarthAgency.canPlay(site,r.actorId)||!root.EarthAgency.canPlay(site,r.contactId)||!known(site,r.guideId)||
        new Set([r.actorId,r.guideId,r.contactId]).size!==3||![r.guideName,r.contactName].every(s=>typeof s==='string'&&s.trim().length&&s.length<=120)||
        !axes.includes(r.field)||!number(r.issuedWeek,1,week)||r.expiresWeek!==r.issuedWeek+travelWeeks||
        !['pending','met','withdrawn'].includes(r.status))return false;
      if(r.metWeek!=null&&!number(r.metWeek,r.issuedWeek,Math.min(week,r.expiresWeek-1)))return false;
      if([r.actorKey,r.guideKey,r.contactKey].some(s=>s!==undefined&&(typeof s!=='string'||!s.length||s.length>1040))||
        r.declined!==undefined&&(!['guide','learner'].includes(r.declined)||r.status!=='withdrawn'||r.metWeek!=null)||
        r.peers!==undefined&&(r.peers!==true||r.metWeek==null))return false;
      if(r.status==='pending'&&r.metWeek!=null||r.status==='met'&&r.metWeek==null||r.status!=='withdrawn'&&r.withdrawnWeek!=null)return false;
      if(r.status==='withdrawn'&&!number(r.withdrawnWeek,r.metWeek??r.issuedWeek,Math.min(week,r.metWeek!=null?r.metWeek+cooperationWeeks-1:r.expiresWeek-1)))return false;
      const key=r.actorId+'|'+r.issuedWeek;
      if(weeks.has(key)||open(r,week)&&recent.has(r.actorId))return false;
      weeks.add(key);if(open(r,week))recent.add(r.actorId);
    }
    return true;
  }
  root.EarthIntroductions=Object.freeze({topics,converse,pending,level,valid});
})(typeof window==='undefined'?globalThis:window);
