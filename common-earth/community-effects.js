/* The street history follows recorded outcomes. Older unlabelled inputs remain
   anonymous, and changing a goal never invents a completed result. */
(function(root){
  'use strict';
  function view(world,site,focus=null){
    if(!world||!site)return [];
    const entries=[],names=new Map();
    function person(id){
      if(!names.has(id))names.set(id,root.EarthPersonas?.profile(site,id)?.name||site.residents.find(r=>r.id===id)?.name||null);
      return names.get(id);
    }
    function add(week,title,result,ids){
      if(!Number.isInteger(week)||week>world.week||!result)return;
      const people=[...new Set(ids.filter(Boolean))].map(id=>({id,name:person(id)})).filter(p=>p.name);
      if(focus&&!people.some(p=>p.id===focus))return;
      entries.push({week,title,result,people});
    }
    for(const e of root.EarthLocalProjects?.completions(site)||[]){
      add(e.week,e.title,e.result,[e.ownerId,e.partnerId,e.input?.ownerId,e.beneficiaryId]);
    }
    for(const p of root.EarthCivicInitiatives?.view(world,site)?.history||[]){
      const approved=['built','commissioned','adopted'].includes(p.phase);
      const sources=p.evidence?' The committee used '+p.evidence.ownerName+'’s project “'+p.evidence.title+'”.':'';
      const text=p.status+(approved?' The town committed '+p.goods.funds+' funds and '+p.goods.materials+' materials.':'')+sources;
      add(p.closedWeek,p.title,text,[p.leadId,p.beneficiaryId,p.evidence?.ownerId,...p.contributions.map(c=>c.personId)]);
    }
    const relief=site.provisions?.lastRelief;
    if(relief){
      add(relief.week,'Food reached households',relief.amount+' reserved food covered '+relief.amount+' of '+relief.shortfall+
        ' missing portions. The crates were packed by '+relief.contributors.map(person).filter(Boolean).join(' and ')+'.',relief.contributors);
    }
    for(const note of site.fleet?.records||[])add(note.week,'Co-op dispatch',note.text,[note.actor,note.otherId]);
    for(const [id,life] of Object.entries(site.careers||{})){
      const old=life.departure,reference=life.latestReference;
      if(!old||!reference)continue;
      const leaving=person(id),cover=old.coverId&&person(old.coverId);
      const text=leaving+' left the '+old.oldRole.toLowerCase()+' post at '+old.oldEmployer+'. '+
        (cover?cover+' agreed to cover that team through week '+old.throughWeek+'.':'The former team needed temporary cover through week '+old.throughWeek+'.');
      add(reference.week,'A workplace changed hands',text,[id,old.coverId]);
    }
    for(const p of site.residents){
      if(p.lastMissed)add(p.lastMissed.week,'A promised delivery was missed',p.name+' was waiting for '+p.value.toLowerCase()+
        '. The '+(p.lastMissed.revised?'revised ':'')+'agreement expired before the supplies arrived.',[p.id]);
    }
    return entries.sort((a,b)=>b.week-a.week).slice(0,5);
  }
  root.EarthCommunityEffects=Object.freeze({view});
})(typeof window==='undefined'?globalThis:window);
