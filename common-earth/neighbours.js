/* Neighbours negotiate, carry work into the next week, and remember sharing a task.
   The simulation owns the clock, costs and persistence. Reading this module is side-effect free. */
(() => {
  'use strict';
  const PROJECTS = [
    {id:'tools',title:'A library of tools',pair:[0,1],request:'The grower has spare tools. The repairer can keep them working. A lending shelf could put both in reach of people who own neither.',value:'materials',yield:5,verb:'opened the lending shelf',snag:'a damaged tool came back without a name',repair:'agree on a repair day'},
    {id:'meals',title:'A table after dark',pair:[0,2],request:'The grower can cook while the convenor knows which neighbours miss the evening meal. They want to try one shared night at the table.',value:'food',yield:6,verb:'served the first late supper',snag:'the last bus left before the washing-up was done',repair:'share the closing shift'},
    {id:'room',title:'A room for everyone',pair:[1,2],request:'The repairer wants a workspace. The convenor needs an evening meeting room. They could share a room if someone takes responsibility for changing it over.',value:'funds',yield:5,verb:'opened the shared room',snag:'the two groups booked the same evening',repair:'write a shared timetable'}
  ];
  const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
  const base=()=>({links:{},active:null,nextWeek:0,completed:0,history:[]});
  const current=site=>site.neighbourWork || base();
  const writable=site=>site.neighbourWork || (site.neighbourWork=base());
  const linkKey=p=>p.pair.join('-');
  function linkValue(data,p) {return data.links[linkKey(p)] || 0;}
  function remember(data,text,week) {
    data.history.unshift({week,text});
    data.history.length=Math.min(data.history.length,8);
  }
  function relation(value) {
    return value<0?'strained':value===0?'new to working together':value<3?'on speaking terms':'trusted collaborators';
  }
  function roster(site) {
    const data=current(site);
    return PROJECTS.map(p=>({
      id:p.id,title:p.title,names:p.pair.map(i=>site.residents[i].name),status:relation(linkValue(data,p)),
      strength:linkValue(data,p)
    }));
  }
  function summary(site) {
    const data=current(site), active=data.active;
    if(!active)return {title:'Shared projects',body:'Two neighbours can take on a project together. The agreement determines who controls the work and who carries its cost.',links:roster(site),history:data.history};
    const p=PROJECTS.find(p=>p.id===active.kind);
    return {title:p.title,body:active.phase==='offered'?'Both neighbours have agreed to talk. Choose how the work will be organised by the end of week '+active.due+'.':
      'The project is under way. Its first result is due in week '+active.due+'.',links:roster(site),history:data.history};
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
      const options=[
        {id:'lead',label:'Give one person the lead',desc:first.name+' will take the keys. The result arrives next week with no extra expense. '+second.name+' will have less say.',effort:0,duration:1},
        {id:'rota',label:'Pay for a shared rota',desc:'Spend 3 funds and one effort. Both neighbours share the decision and the shift. The result arrives in two weeks.',effort:1,goods:{funds:3},duration:2},
        {id:'pilot',label:'Try a small joint pilot',desc:'Use one effort and one material. A smaller result arrives next week. Both neighbours can revise the design together.',effort:1,goods:{materials:1},duration:1}
      ];
      for(const o of options) add('people','agreement:'+o.id,o.label,o.desc,{peerProject:true,effort:o.effort,goods:o.goods||{}},()=>{
        const d=writable(site);
        d.active={...d.active,phase:'working',agreement:o.id,due:world.week+o.duration,followed:false};
        const text='“'+p.title+'” begins. '+o.label+'. The neighbours report back in week '+d.active.due+'.';
        remember(d,text,world.week);return text;
      });
    } else if(!active.followed) {
      add('people','agreement:check','Check who is doing the unseen work',
        second.name+' can help the group '+p.repair+'. A check-in costs one effort. It protects the relationship if one person leads, or increases the joint result by one.',
        {peerProject:true},()=>{writable(site).active.followed=true;return second.name+' described the extra work. Together they agreed to '+p.repair+'.';});
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
    const solo=a.agreement==='lead',pilot=a.agreement==='pilot';
    const amount=(pilot?Math.ceil(p.yield/2):p.yield)+(a.followed&&!solo?1:0);
    site[p.value]+=amount;
    const linkChange=solo?(a.followed?1:-1):pilot?1:2;
    const key=linkKey(p);
    d.links[key]=clamp(linkValue(d,p)+linkChange,-3,6);
    if(!solo||a.followed){site.trust=clamp(site.trust+1,0,100);second.bond=clamp(second.bond+1,0,10);}
    else second.bond=clamp(second.bond-1,0,10);
    first.bond=clamp(first.bond+1,0,10);
    const why=solo&&!a.followed ? 'When '+p.snag+', '+second.name+' had no say in the fix.':
      a.followed?'They had already agreed how to '+p.repair+'.':
      pilot?'They kept the first attempt small enough for both to change it.':'Paying for the shift gave both neighbours time to decide together.';
    const text=first.name+' and '+second.name+' '+p.verb+'. +'+amount+' '+p.value+'. '+why+' Their working relationship is '+relation(d.links[key])+'.';
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
    const a=data.active;
    if(a===null)return true;
    if(!a||!PROJECTS.some(p=>p.id===a.kind)||!integer(a.due,1))return false;
    if(a.phase==='offered')return true;
    return a.phase==='working'&&['lead','rota','pilot'].includes(a.agreement)&&typeof a.followed==='boolean';
  }
  globalThis.EarthNeighbours=Object.freeze({actions,tick,summary,valid});
})();
