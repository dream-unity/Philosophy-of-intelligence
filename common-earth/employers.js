/* After an ordinary handover, the former employer still has a real post
   to fill. Applications, hired replacements and monthly relief are distinct. */
(function(root){
  'use strict';
  const int=(n,min,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
  const text=(t,max=160)=>typeof t==='string'&&t.length>0&&t.length<=max;
  const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
  const goods={food:'food',repair:'materials',exchange:'funds'};
  const post=id=>root.EarthCareers?.catalog.find(j=>j.id===id);
  const group=(site,id)=>site.employers&&Object.hasOwn(site.employers,id)?site.employers[id]:null;
  const due=(v,week)=>week>=v.opened+4&&(week-v.opened)%4===0;
  const recorded=(site,id)=>group(site,id)?.open.length||0;

  function open(world,site,person,old,appointed){
    const job=post(old.id);
    // Active supply corridors already account for their exact staffed run.
    if(!job||person.kind==='carrier'&&job.id==='courier')return null;
    const board=site.employers||={},listing=board[job.id]||={open:[]};
    if(listing.open.length>=34||listing.open.some(v=>v.opened===world.week&&v.formerId===person.id))return null;
    const vacancy={formerId:person.id,name:person.name,opened:world.week,baseline:!appointed,
      checked:world.week,covered:0,missed:0};
    listing.open.push(vacancy);return vacancy;
  }
  function fill(world,site,person,job){
    const listing=group(site,job.id);
    if(!listing?.open.length)return null;
    const vacancy=listing.open.shift(),old=site.careers?.[vacancy.formerId];
    if(old?.departure?.oldRole===job.label&&old.departure.throughWeek===vacancy.opened+1){
      delete old.departure;old.revision++;
    }
    listing.lastHire={by:person.id,name:person.name,week:world.week,formerId:vacancy.formerId,
      formerName:vacancy.name,opened:vacancy.opened,covered:vacancy.covered,missed:vacancy.missed};
    return job.employer+' filled the '+job.label.toLowerCase()+' vacancy left by '+vacancy.name+
      '. '+person.name+' starts after '+(world.week-vacancy.opened)+' open weeks.';
  }
  function transition(world,site,moves){
    if(!moves.length)return [];
    // Two people exchanging posts in the same week may fill each other's
    // vacancy regardless of their order in the save.
    for(const move of moves)open(world,site,move.person,move.from,move.appointed);
    const events=[];
    for(const move of moves){
      const message=fill(world,site,move.person,move.to);
      if(message)events.push(message);
    }
    return events;
  }
  function review(world,site){
    const week=world.week-1;
    for(const listing of Object.values(site.employers||{})){
      for(const vacancy of listing.open){
        if(week<=vacancy.checked)continue;
        if(due(vacancy,week)){
          if(vacancy.lastCover?.week===week)vacancy.covered++;
          else vacancy.missed++;
        }
        vacancy.checked=week;
      }
    }
  }
  function gaps(site,world){
    const list=[];
    for(const [id,employer] of Object.entries(site.employers||{})){
      const job=post(id);if(!job)continue;
      for(const v of employer.open){
        if(!due(v,world.week)||v.lastCover?.week===world.week)continue;
        list.push({personId:v.formerId,formerName:v.name,oldRole:job.label,occupation:job.occupation,
          venue:job.venue==='pier'?'dock':job.venue,opening:id,openedWeek:v.opened,employer:job.employer,coverId:null});
      }
    }
    return list;
  }
  function cover(site,world,person,gap){
    const vacancy=group(site,gap.opening)?.open.find(v=>v.formerId===gap.personId&&v.opened===gap.openedWeek);
    if(!vacancy||!due(vacancy,world.week)||vacancy.lastCover?.week===world.week||person.id===vacancy.formerId||
      !root.EarthCareers?.canCoverPost?.(site,person.id,gap.opening))return false;
    vacancy.lastCover={id:person.id,name:person.name,week:world.week};return true;
  }
  function rates(site,world){
    const loss=new Set(),extra=new Set();
    for(const [id,employer] of Object.entries(site.employers||{})){
      const job=post(id);if(!job)continue;
      for(const vacancy of employer.open){
        if(!due(vacancy,world.week))continue;
        const covered=vacancy.lastCover?.week===world.week;
        if(vacancy.baseline&&!covered)loss.add(goods[job.occupation]);
        // An appointed specialist's regular benefit already disappears on
        // departure. Only an actual qualified relief session restores output.
        if(!vacancy.baseline&&covered)extra.add(job.metric);
      }
    }
    const result={};
    for(const key of loss)result[key]=-1;
    for(const key of extra)result[key]=(result[key]||0)+1;
    return result;
  }
  function view(site,world,id){
    const employer=group(site,id),job=post(id);
    if(!employer||!job)return null;
    const rows=employer.open.map(v=>{
      const current=v.lastCover?.week===world.week;
      const next=v.opened+Math.max(4,Math.ceil((world.week-v.opened)/4)*4);
      return {formerId:v.formerId,name:v.name,opened:v.opened,age:world.week-v.opened,next,
        covered:v.covered,missed:v.missed,coverName:current?v.lastCover.name:null};
    });
    const applicants=Object.entries(site.careers||{}).filter(([,m])=>m.application?.targetId===id&&m.application.phase!=='deferred')
      .map(([who])=>root.EarthPersonas?.profile(site,who)?.name||who);
    const oldest=rows[0],last=employer.lastHire;
    const detail=oldest?job.employer+' still needs '+rows.length+' '+(rows.length===1?'replacement':'replacements')+
      '. '+oldest.name+' left in week '+oldest.opened+'. '+(oldest.coverName?oldest.coverName+' covers this month’s round.':
        'The next relief round is in week '+oldest.next+'.')+(oldest.missed?' '+oldest.missed+' earlier rounds went unfilled.':''):
      last?last.name+' filled '+last.formerName+'’s post in week '+last.week+'.':'';
    return {id,employer:job.employer,role:job.label,rows,applicants,lastHire:last?{...last}:null,detail};
  }
  function valid(site,week){
    const board=site.employers;if(board===undefined)return true;
    if(!object(board)||Object.keys(board).length>(root.EarthCareers?.catalog.length||0))return false;
    const known=id=>text(id,520)&&!!root.EarthPersonas?.profile(site,id);
    return Object.entries(board).every(([id,listing])=>{
      if(!post(id)||!object(listing)||!Array.isArray(listing.open)||listing.open.length>34)return false;
      const keys=new Set();
      for(const v of listing.open){
        if(!object(v)||!known(v.formerId)||!text(v.name)||!int(v.opened,1,week)||typeof v.baseline!=='boolean'||
          !int(v.checked,v.opened,week)||!int(v.covered,0,week)||!int(v.missed,0,week)||
          v.covered+v.missed>Math.floor((v.checked-v.opened)/4))return false;
        const key=v.formerId+'/'+v.opened;if(keys.has(key))return false;keys.add(key);
        const c=v.lastCover;
        if(c!==undefined&&(!object(c)||!known(c.id)||c.id===v.formerId||!text(c.name)||!int(c.week,v.opened+4,week)||!due(v,c.week)))return false;
      }
      const last=listing.lastHire;
      return last===undefined||object(last)&&known(last.by)&&known(last.formerId)&&text(last.name)&&text(last.formerName)&&
        int(last.opened,1,week)&&int(last.week,last.opened,week)&&int(last.covered,0,week)&&int(last.missed,0,week);
    });
  }
  root.EarthEmployers=Object.freeze({open,transition,review,gaps,cover,rates,view,recorded,valid});
})(typeof window==='undefined'?globalThis:window);
