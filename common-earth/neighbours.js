/* Neighbours negotiate, carry work into the next week, and remember sharing a task.
   The simulation owns the clock, costs and persistence. Reading this module is side-effect free. */
(() => {
  'use strict';
  const PROJECTS = [
    {id:'tools',title:'A library of tools',pair:[0,1],request:'The grower has spare tools. The repairer can keep them working. A lending shelf could put both in reach of people who own neither.',value:'materials',yield:5,verb:'opened the lending shelf',snag:'a damaged tool came back without a name',repair:'set a repair day',handover:'tool-return agreement',terms:'Borrowers record a return day, and the repairer signs for damaged tools.'},
    {id:'meals',title:'A table after dark',pair:[0,2],request:'The grower can cook while the convenor knows which neighbours miss the evening meal. They want to try one shared night at the table.',value:'food',yield:6,verb:'served the first late supper',snag:'the last bus left before the washing-up was done',repair:'share the closing shift',handover:'closing rota',terms:'A named partner shares the last shift, and both know how they will get home.'},
    {id:'room',title:'A room for everyone',pair:[1,2],request:'The repairer wants a workspace. The convenor needs an evening meeting room. They could share a room if someone takes responsibility for changing it over.',value:'funds',yield:5,verb:'opened the shared room',snag:'the two groups booked the same evening',repair:'write a shared timetable',handover:'room handover timetable',terms:'Each group signs for the room, records its changeover time and names the person taking over.'}
  ];
  const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
  const base=()=>({links:{},handovers:{},active:null,nextWeek:0,completed:0,history:[]});
  const current=site=>site.neighbourWork || base();
  const writable=site=>site.neighbourWork || (site.neighbourWork=base());
  const linkKey=p=>p.pair.join('-');
  function linkValue(data,p) {return data.links[linkKey(p)] || 0;}
  const handoverWeek=(data,p)=>data.handovers?.[linkKey(p)] || 0;
  const pilotOutput=p=>Math.ceil(p.yield/2);
  function sign(data,p,week) {
    data.handovers ||= {};
    data.handovers[linkKey(p)]=week;
  }
  function withdraw(data,p) {
    if(data.handovers)delete data.handovers[linkKey(p)];
  }
  function remember(data,text,week) {
    data.history.unshift({week,text});
    data.history.length=Math.min(data.history.length,8);
  }
  function relation(value,signed=false) {
    return value<0?'strained':value===0?(signed?'ready to try again':'new to working together'):value<3?'on speaking terms':'trusted collaborators';
  }
  function roster(site) {
    const data=current(site);
    return PROJECTS.map(p=>({
      id:p.id,title:p.title,names:p.pair.map(i=>site.residents[i].name),status:relation(linkValue(data,p),handoverWeek(data,p)),
      strength:linkValue(data,p),handover:handoverWeek(data,p)?p.handover:'',
      handoverWeek:handoverWeek(data,p)
    }));
  }
  function summary(site) {
    const data=current(site), active=data.active;
    if(!active)return {title:'Shared projects',body:'Two neighbours can take on a project together. The agreement determines who controls the work and who carries its cost.',links:roster(site),history:data.history};
    const p=PROJECTS.find(p=>p.id===active.kind);
    let body=active.phase==='offered'?'Both neighbours have agreed to talk. Choose how the work will be organised by the end of week '+active.due+'.':
      active.agreement==='repair'?'Both neighbours are setting terms for another attempt. Their meeting closes in week '+active.due+'.':
      'The project is under way. Its first result is due in week '+active.due+'.';
    const signed=handoverWeek(data,p);
    if(active.agreement==='reuse')body+=' They are using their '+p.handover+'. '+p.terms;
    if(signed)body+=' Their '+p.handover+' from week '+signed+' can be used for one repeat. '+p.terms;
    return {title:p.title,body,links:roster(site),history:data.history};
  }
  function actions(world,site,add) {
    const data=current(site), active=data.active, members=site.residents;
    if(!active) {
      for(const p of PROJECTS) {
        const [first,second]=p.pair.map(i=>members[i]);
        const gate=world.week<data.nextWeek?'They are taking a week before the next proposal.':
          !first.heard||!second.heard?'First listen to '+[first,second].filter(x=>!x.heard).map(x=>x.name).join(' and ')+'.':'';
        add('people','together:'+p.id,p.title,p.request,{
          gate,peerProject:true,effort:1
        },()=>{
          const d=writable(site);
          d.active={kind:p.id,phase:'offered',due:world.week+1};
          const text=first.name+' and '+second.name+' agreed to discuss “'+p.title+'”. Choose a working agreement by week '+d.active.due+'.';
          remember(d,text,world.week);return text;
        });
      }
      return;
    }
    const p=PROJECTS.find(p=>p.id===active.kind);
    const [first,second]=p.pair.map(i=>members[i]);
    if(active.phase==='offered'){
      const strength=linkValue(data,p),strained=strength<0, trusted=strength>=3;
      const outcome=(amount)=>amount+' '+p.value+' next week';
      const limited=pilotOutput(p), signed=handoverWeek(data,p);
      const options=[
        {id:'lead',label:strained?'Let '+first.name+' run a smaller job alone':'Give one person the lead',
          desc:strained?second.name+' is holding back supplies after the last disagreement. '+first.name+' can take on '+outcome(limited)+' alone, with no extra effort or expense.':
            first.name+' will take the keys. '+outcome(p.yield)+' with no extra effort or expense. '+second.name+' will have less say.',
          effort:0,duration:1,limited:strained},
        {id:'rota',label:'Pay for a shared rota',desc:'Spend 3 funds and one effort. Both neighbours share the decision and the shift. They deliver '+p.yield+' '+p.value+' in two weeks.',effort:1,goods:{funds:3},duration:2},
        {id:'pilot',label:'Try a small joint pilot',desc:'Use one effort and one material. Expect '+outcome(limited)+'. Both neighbours can revise the design together.',effort:1,goods:{materials:1},duration:1}
      ];
      if(strained) options.push({
        id:'repair',label:'Meet to repair the working agreement',effort:1,duration:1,
        desc:'Give both neighbours one effort to write a '+p.handover+'. No stock is needed. They deliver no goods this week, and can try the written terms on their next job.'
      });
      if(signed) options.push({
        id:'reuse',label:'Use the '+p.handover,effort:trusted?0:1,duration:1,established:trusted,
        desc:'They signed these terms in week '+signed+'. '+p.terms+' '+
          (trusted?'Both trust the handover. No extra effort or stock is needed for a repeat covering '+outcome(p.yield-1)+'.':
            'They will try a small repeat with one effort and no new stock, covering '+outcome(limited)+'.')+
          ' After one use, both must review the terms to sign them again.'
      });
      for(const o of options) add('people','agreement:'+o.id,o.label,o.desc,{peerProject:true,effort:o.effort,goods:o.goods||{}},()=>{
        const d=writable(site);
        d.active={...d.active,phase:'working',agreement:o.id,due:world.week+o.duration,followed:false};
        // Store the scope they actually accepted. Previously saved projects
        // keep their original promises, even when their pair is strained.
        if(o.limited)d.active.limited=true;
        if(o.established)d.active.established=true;
        if(o.id==='reuse')withdraw(d,p);
        const text='“'+p.title+'” begins. '+o.label+'. The neighbours report back in week '+d.active.due+'.';
        remember(d,text,world.week);return text;
      });
    } else if(!active.followed && active.agreement!=='repair') {
      add('people','agreement:check','Check who is doing the unseen work',
        second.name+' can help the group '+p.repair+'. A check-in costs one effort. It protects the relationship when one person leads, or adds one unit to a joint result. Both sign a '+p.handover+' for a future repeat.',
        {peerProject:true},()=>{writable(site).active.followed=true;return second.name+' described the extra work. '+p.terms+' They will test and sign those terms when this job finishes.';});
    }
  }
  function tick(world,site) {
    const d=site.neighbourWork, a=d?.active;
    if(!a)return [];
    const p=PROJECTS.find(p=>p.id===a.kind);
    const [first,second]=p.pair.map(i=>site.residents[i]);
    if(a.phase==='offered'){
      if(a.due>=world.week)return [];
      d.active=null;d.nextWeek=world.week+1;
      const text='The meeting about “'+p.title+'” closed without an agreement. '+first.name+' and '+second.name+' are free to try again.';
      remember(d,text,world.week);return [text];
    }
    if(a.due>world.week)return [];
    const key=linkKey(p), previous=linkValue(d,p);
    if(a.agreement==='repair'){
      sign(d,p,world.week);
      d.links[key]=Math.min(0,previous+2);
      const text=first.name+' and '+second.name+' spent the shift writing a '+p.handover+'. '+p.terms+
        ' No goods were produced. Both are willing to test these terms on their next joint job.';
      d.active=null;d.nextWeek=world.week+1;remember(d,text,world.week);return [text];
    }
    const solo=a.agreement==='lead',pilot=a.agreement==='pilot',repeat=a.agreement==='reuse';
    let amount=p.yield;
    if(pilot || a.limited || (repeat && !a.established)) amount=pilotOutput(p);
    else if(repeat) amount=p.yield-1;
    if(a.followed && !solo) amount++;
    site[p.value]+=amount;
    const linkChange=solo?(a.followed?1:-1):repeat?Number(a.followed):pilot?1:2;
    d.links[key]=clamp(previous+linkChange,-3,6);
    if(!solo||a.followed){site.trust=clamp(site.trust+1,0,100);second.bond=clamp(second.bond+1,0,10);}
    else second.bond=clamp(second.bond-1,0,10);
    first.bond=clamp(first.bond+1,0,10);
    if(a.followed) sign(d,p,world.week);
    else if(solo) withdraw(d,p);
    let why;
    if(repeat) why='They used their '+p.handover+' for this repeat. '+(a.followed?'Both reviewed the terms and signed again.':'Another repeat needs a fresh review.');
    else if(a.followed) why='Both signed their '+p.handover+' for a future repeat. '+p.terms;
    else if(solo) why='When '+p.snag+', '+second.name+' had no say in the fix.';
    else why=pilot?'They kept the first attempt small enough for both to change it.':'Paying for the shift gave both neighbours time to decide together.';
    if(a.limited)why=second.name+' held back supplies after their earlier disagreement. '+why;
    const crew=a.limited?first.name:first.name+' and '+second.name;
    const text=crew+' '+p.verb+'. +'+amount+' '+p.value+'. '+why+' Their working relationship is '+relation(d.links[key],handoverWeek(d,p))+'.';
    d.active=null;d.completed++;d.nextWeek=world.week+1;remember(d,text,world.week);return [text];
  }
  function valid(site) {
    const data=site.neighbourWork;
    if(data==null)return true;
    const integer=(n,min,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
    const keys=PROJECTS.map(linkKey);
    if(typeof data!=='object'||!data.links||Array.isArray(data.links)||typeof data.links!=='object' ||
      !Object.entries(data.links).every(([key,value])=>keys.includes(key)&&integer(value,-3,6)) ||
      !integer(data.nextWeek,0)||!integer(data.completed,0) || !Array.isArray(data.history)||data.history.length>8 ||
      !data.history.every(e=>e&&integer(e.week,1)&&typeof e.text==='string'&&e.text.length<=1600))return false;
    if(data.handovers!==undefined && (!data.handovers || typeof data.handovers!=='object'||Array.isArray(data.handovers) ||
      !Object.entries(data.handovers).every(([key,week])=>keys.includes(key)&&integer(week,1))))return false;
    const a=data.active;
    if(a===null)return true;
    if(!a||!PROJECTS.some(p=>p.id===a.kind)||!integer(a.due,1))return false;
    if(a.phase==='offered')return true;
    return a.phase==='working'&&['lead','rota','pilot','repair','reuse'].includes(a.agreement)&&typeof a.followed==='boolean' &&
      (a.limited===undefined || a.agreement==='lead'&&typeof a.limited==='boolean') &&
      (a.established===undefined || a.agreement==='reuse'&&typeof a.established==='boolean');
  }
  globalThis.EarthNeighbours=Object.freeze({actions,tick,summary,valid});
})();
