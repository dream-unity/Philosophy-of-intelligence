/* A resident shift is a six-hour day. The simulation owns saves and applies every
   returned change atomically. These rules have no clock, storage or UI dependencies. */
(function(root){
  'use strict';

  const END=12; // Half hours from 09:00 to 15:00.
  const NEED=2;
  const district=Object.freeze({market:Object.freeze([2,3]),homes:Object.freeze([[1,3],[3,2],[3,3]].map(Object.freeze))});
  const stopIds=['earn','care','meaning'];
  const labels={funds:'funds',food:'food',materials:'materials',trust:'trust',wellbeing:'wellbeing'};
  const stories=[
    {
      title:'The second basket', priority:'care', craft:'garden', neighbour:1,
      brief:'“The buyer pays today. Two neighbours have no way to collect their food, and I promised to show someone how to save seed.”',
      stops:{
        earn:{name:'The early produce order',open:0,close:8,detail:'The buyer leaves at 13:00. A whole order pays enough to cover the household day.',choices:[
          {id:'pack',name:'Pack the wholesale order',time:5,pay:3,detail:'Grade and pack every tray. The buyer leaves the sound seconds for the shared pantry.',now:{food:1},after:{funds:1},story:'The buyer returned to the cooperative for another collection.'},
          {id:'share',name:'Split the packing shift',time:3,pay:1,detail:'Give the second half of the order to a neighbour who needs work.',after:{trust:1},story:'A second household was offered a share of the next packing shift.'}
        ]},
        care:{name:'The doorstep pantry',open:0,close:11,detail:'The repairer has a list of households that cannot carry the weekly baskets home.',choices:[
          {id:'baskets',name:'Carry two baskets upstairs',time:3,relief:1,detail:'Use one food from the district. In return, a neighbour provides the grower’s evening meal.',now:{food:-1},after:{wellbeing:2},story:'The doorstep deliveries reached households absent from the usual collection.'},
          {id:'rota',name:'Arrange the next pickup',time:2,detail:'Ask each household which pickup time fits. Leave the amended list for the next harvest.',after:{food:1},story:'An extra basket was collected before the food spoiled.'}
        ]},
        meaning:{name:'Seeds for another season',open:3,close:END,detail:'A learner wants to grow something with a history in this neighbourhood.',choices:[
          {id:'seed',name:'Teach the seed-saving method',time:4,facility:1,detail:'Set aside one food as seed. Sort the ripe heads with a learner and let them try the next tray.',now:{food:-1},after:{food:3},story:'The saved seed and the learner’s second tray replenished the shared beds.'},
          {id:'memory',name:'Record the grower’s field note',time:2,detail:'Write down who shared this seed and what each household calls it. Leave copies for neighbours.',after:{trust:1},story:'Neighbours recognised their own names and growing knowledge in the common record.'}
        ]}
      }
    },
    {
      title:'A tool someone else can use',priority:'meaning',craft:'workshop',neighbour:0,
      brief:'“There’s a paid job on the bench. My neighbour is hauling water by hand. I want someone else here who knows how to fix things when I’m away.”',
      stops:{
        earn:{name:'The carrier’s broken trolley',open:0,close:9,detail:'The carrier can pay for a complete repair, or pay less for a repair they finish themselves.',choices:[
          {id:'overhaul',name:'Overhaul the trolley',time:5,pay:3,detail:'Rebuild the axle for the carrier and reclaim the usable metal from the old assembly.',now:{materials:1},after:{funds:1},story:'The carrier bought the next service from the district workshop fund.'},
          {id:'diagnose',name:'Diagnose it together',time:3,pay:1,detail:'Teach the carrier to find the fault. They finish the job and bring the spare fittings back.',after:{materials:1},story:'The carrier returned the spare fittings rather than throwing them away.'}
        ]},
        care:{name:'Water at the grower’s door',open:0,close:9,detail:'The grower is carrying water by hand. The afternoon watering begins at 13:30.',choices:[
          {id:'pump',name:'Restore the hand pump',time:3,relief:1,detail:'Use one district material for a fitting. The grower shares tonight’s vegetables in exchange.',now:{materials:-1},after:{wellbeing:2},story:'Water could be drawn near the beds, easing the work for several neighbours.'},
          {id:'carry',name:'Share the next water run',time:2,detail:'Carry enough for today together and learn where the route is difficult.',after:{wellbeing:1},story:'The grower was able to work the next morning after sharing the heavy water run.'}
        ]},
        meaning:{name:'An apprentice at the bench',open:2,close:END,detail:'A learner has time before the evening shift and wants to finish a first repair.',choices:[
          {id:'teach',name:'Let the learner finish a repair',time:4,facility:1,detail:'Give up one material for a practice piece. Stay while the learner repeats the job independently.',now:{materials:-1},after:{materials:3},story:'The apprentice repaired three fittings that would otherwise have been replaced.'},
          {id:'card',name:'Make a shared repair card',time:2,detail:'Draw the sequence with the learner and leave it beside the community tool box.',after:{materials:1},story:'The repair card helped another household recover a usable fitting.'}
        ]}
      }
    },
    {
      title:'An empty chair',priority:'care',craft:'hall',neighbour:1,
      brief:'“I invoice by the hour. I also promised to get a neighbour into the meeting. And the stories we tell ourselves matter long after the room empties.”',
      stops:{
        earn:{name:'The buyer’s translation',open:0,close:7,detail:'Two traders need an interpreter. Their last departure is at 12:30.',choices:[
          {id:'interpret',name:'Interpret the full negotiation',time:5,pay:3,detail:'Stay through signatures. The cooperative receives a small service fee, separately from household pay.',now:{funds:1},after:{trust:1},story:'Both traders returned with the same understanding of the agreement.'},
          {id:'phrases',name:'Prepare a shared phrase sheet',time:3,pay:1,detail:'Help both sides explain the prices and quantities, then leave them to finish.',after:{funds:1},story:'The phrase sheet helped a new trader complete a small order.'}
        ]},
        care:{name:'A neighbour at the meeting',open:2,close:11,detail:'The repairer finishes late and has no way to make the ordinary meeting time.',choices:[
          {id:'ride',name:'Arrange a shared ride',time:3,relief:1,detail:'Spend one district fund for a group fare. One of the riders covers the convenor’s return trip.',now:{funds:-1},after:{trust:2},story:'The repairer and a neighbour spoke at the meeting after the shared ride arrived.'},
          {id:'statement',name:'Carry their words into the room',time:2,detail:'Ask what the repairer wants said and read it back before leaving.',after:{trust:1},story:'The minutes recorded the repairer’s own words and their requested change.'}
        ]},
        meaning:{name:'The memory circle',open:3,close:END,detail:'People have brought objects that remind them why this community exists.',choices:[
          {id:'circle',name:'Host the whole memory circle',time:4,facility:1,detail:'Stay long enough for everyone to tell a story, including the people who usually leave quietly.',after:{wellbeing:2},story:'Residents returned to the stories when they welcomed the next household.'},
          {id:'listen',name:'Sit with one person and one object',time:2,detail:'Give one person uninterrupted time. Ask whether their story may be shared.',after:{wellbeing:1},story:'A resident asked to bring their object back for another conversation.'}
        ]}
      }
    }
  ];

  const memories=[
    {pack:'I remember packing that whole order together. We could count the day’s pay before the buyer left.',share:'Splitting that job gave someone else a place at the table. It also made my own household budget tighter.',baskets:'You climbed those stairs with me. The baskets finally reached people who never make it to collection.',rota:'I still have the list we drew up at the doorstep. We asked people which pickup time they could actually keep.',seed:'You stayed while the learner sorted a second tray alone. That was when the lesson became theirs.',memory:'That seed has more than one name. You asked me who taught it to me and wrote their name down.'},
    {overhaul:'We got the carrier moving in time. I liked that we stopped to recover the sound metal, too.',diagnose:'The carrier found the fault themselves after we showed them where to look. They left knowing more than they arrived with.',pump:'We used one of our last fittings where someone was hauling water. I remember the grower’s relief.',carry:'Carrying that water together showed us exactly where the path causes trouble.',teach:'You waited while the apprentice tried again. They put the last fitting in with their own hands.',card:'I can still picture us drawing that repair card. Someone else can follow the sequence when I’m away.'},
    {interpret:'We stayed until both sides could explain the agreement back to each other. That took time I usually have to justify.',phrases:'The traders kept that phrase sheet. I liked that they finished the discussion in their own voices.',ride:'I remember arranging that ride together. The repairer could speak from their own chair at last.',statement:'You read those words back before we carried them into the room. That mattered to the person who trusted us with them.',circle:'You stayed through the quiet part of the circle. The last person spoke because nobody hurried to close it.',listen:'You asked who could hear that story before sharing it. Giving someone that choice made the conversation possible.'}
  ];

  const reject=message=>({ok:false,message});
  const integer=(n,min,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
  const person=(site,id)=>site?.residents?.find(r=>r.id===id);
  const home=id=>({type:'resident',residentId:id});
  const clock=n=>`${String(9+Math.floor(n/2)).padStart(2,'0')}:${n%2?'30':'00'}`;
  const duration=n=>n%2?`${Math.floor(n/2)?Math.floor(n/2)+' h ':''}30 min`:`${n/2} h`;
  const effects=delta=>Object.entries(delta||{}).map(([k,v])=>`${v>0?'+':'−'}${Math.abs(v)} ${labels[k]}`).join(', ');

  function matches(ref,event){
    if(!ref||!event||ref.type!==event.type)return false;
    if(ref.type==='market')return true;
    if(ref.type==='resident')return ref.residentId===event.residentId && (!ref.doorstep || event.doorstep===true);
    return ref.type==='building'&&ref.plot===event.plot&&(!ref.kind||!event.kind||ref.kind===event.kind);
  }
  function validVenue(site,q){
    return q?.type==='market'||(q?.type==='resident'&&Boolean(person(site,q.residentId)))||
      (q?.type==='building'&&integer(q.plot,0,8)&&['garden','workshop','hall'].includes(q.kind));
  }
  function block(site,ref){
    if(ref.type==='market')return district.market;
    if(ref.type==='resident')return district.homes[person(site,ref.residentId).slot];
    return [ref.plot%3,Math.floor(ref.plot/3)];
  }
  function travel(site,from,to){
    if(matches(from,to))return 0;
    const a=block(site,from),b=block(site,to),blocks=Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);
    return blocks>2?2:1;
  }
  function venueName(site,venue){
    if(venue.type==='market')return 'Market exchange';
    if(venue.type==='resident')return person(site,venue.residentId).name+'’s doorstep';
    const b=site.buildings.find(item=>item.plot===venue.plot);
    return `${b?.name||'Community project'} · plot ${venue.plot+1}`;
  }
  function shiftPerson(site){return person(site,site.shift?.residentId);}
  function course(site,shift){return stories[person(site,shift.residentId).slot];}
  function venue(site,shift,id){
    const ref=shift.venues[id];
    if(ref.type==='building'&&!site.buildings.some(b=>b.plot===ref.plot&&b.kind===ref.kind))return home(shift.residentId);
    return ref;
  }
  function pick(site,shift,step){return course(site,shift).stops[step.stopId].choices.find(c=>c.id===step.optionId);}
  function household(site,shift){
    let pay=0,relief=0;
    for(const step of shift.history){const choice=pick(site,shift,step);pay+=choice.pay||0;relief+=choice.relief||0;}
    const reserve=shift.reserve||0,total=reserve+pay+relief;
    return {pay,relief,reserve,needed:NEED,gap:Math.max(0,NEED-total),carry:Math.min(NEED,Math.max(0,total-NEED))};
  }
  function option(site,shift,id,c,arrival){
    const stop=course(site,shift).stops[id],place=venue(site,shift,id);
    const allocated=c.time-(c.facility&&place.type==='building'?c.facility:0);
    const begin=Math.max(arrival,stop.open),end=begin+allocated;
    const short=Object.entries(c.now||{}).find(([k,v])=>v<0&&site[k]<-v);
    let reason='';
    if(end>stop.close)reason=`The visit closes at ${clock(stop.close)}. This choice would finish at ${clock(end)}.`;
    else if(short)reason=`Needs ${-short[1]} district ${labels[short[0]]}.`;
    const terms=[`${duration(allocated)} · ${clock(begin)}–${clock(end)}`];
    if(begin>arrival)terms.push(`wait ${duration(begin-arrival)}`);
    if(c.pay)terms.push(`household pay +${c.pay}`);
    if(c.relief)terms.push(`1 household expense covered`);
    if(c.now)terms.push(`district now ${effects(c.now)}`);
    if(c.after)terms.push(`next week ${effects(c.after)}`);
    if(c.facility&&place.type==='building')terms.push('shared venue saves 30 min');
    return {id:c.id,label:c.name,detail:c.detail,terms:terms.join(' · '),available:!reason,reason,begin,end};
  }
  function stopView(site,shift,id){
    const item=course(site,shift).stops[id],place=venue(site,shift,id),trip=travel(site,shift.at,place);
    const visited=shift.history.some(step=>step.stopId===id),current=shift.stopId===id&&matches(shift.at,place);
    const arrival=shift.time+trip,choices=item.choices.map(c=>option(site,shift,id,c,arrival));
    const reason=visited?'This visit is complete.':choices.some(c=>c.available)?'':choices.every(c=>c.end>item.close)?`The available time before ${clock(item.close)} is too short.`:'The district cannot cover an available choice here.';
    return {id,label:item.name,detail:item.detail,venue:place.type==='resident'?{...place,doorstep:true}:place,venueName:venueName(site,place),window:`${clock(item.open)}–${clock(item.close)}`,arrival:`${clock(arrival)}${trip?' · '+duration(trip)+' to travel':' · here'}`,travel:trip,available:!reason,reason,current,visited,choices};
  }
  function gate(world,site,residentId){
    const resident=person(site,residentId);let reason='';
    if(!resident)reason='Choose a local resident.';
    else if(world.sites.some(s=>s.shift)){
      const active=world.sites.find(s=>s.shift),host=person(active,active.shift.residentId);
      reason=`Finish the shift with ${host?.name||'the resident'} in ${active.name} first.`;
    }
    else if(world.legacy?.term?.siteId===site.id && world.legacy.term.residentId===residentId){
      const term=world.legacy.term;
      reason=resident.name+' is chairing the council until week '+(term.start+4)+'. Plan a day with another resident or return after the handover.';
    }
    else if(site.lastShiftWeek===world.week)reason='This district has already hosted a shift this week.';
    else if(resident.lastShiftWeek&&world.week-resident.lastShiftWeek<3)reason=`${resident.name} can host another shift in week ${resident.lastShiftWeek+3}.`;
    else if(world.effort<1)reason='A resident shift needs 1 effort. Advance the week to refresh.';
    return {available:!reason,reason};
  }
  function start(world,site,residentId){
    const g=gate(world,site,residentId);if(!g.available)return reject(g.reason);
    const r=person(site,residentId),story=stories[r.slot],room=(site.buildings||[]).filter(b=>b.kind===story.craft).sort((a,b)=>a.plot-b.plot)[0];
    const reserve=integer(r.shiftMemory?.reserve,0,NEED)?r.shiftMemory.reserve:0;
    const shift={v:1,week:world.week,residentId,time:0,reserve,at:home(residentId),stopId:null,history:[],venues:{earn:{type:'market'},care:home(site.residents[story.neighbour].id),meaning:room?{type:'building',plot:room.plot,kind:room.kind}:home(residentId)}};
    return {ok:true,shift,message:`You joined ${r.name} at 09:00. Plan the day together before 15:00.`};
  }
  function live(site,week){return Boolean(site?.shift&&site.shift.week===week&&shiftPerson(site));}
  function view(site,week){
    if(!live(site,week))return null;
    const shift=site.shift,r=shiftPerson(site),story=stories[r.slot],budget=household(site,shift);
    const stops=stopIds.map(id=>stopView(site,shift,id)),current=stops.find(s=>s.current&&!s.visited),history=shift.history.map(step=>({label:pick(site,shift,step).name,clock:`${clock(step.begin)}–${clock(step.end)}`}));
    return {residentId:r.id,name:r.name,role:r.role,title:story.title,brief:story.brief,
      clock:clock(shift.time),timeLeft:duration(END-shift.time),location:venueName(site,shift.at),
      household:budget,householdLabel:`Household costs ${NEED} · reserve ${budget.reserve} · pay ${budget.pay} · covered by neighbours ${budget.relief}`,
      guide:'The clock moves when you arrive or choose an activity. Finish by 15:00. After a completed visit, covering 2 household credits adds 1 wellbeing next week. A shortfall costs 1 wellbeing. Up to 2 spare credits carry into this resident’s next shift.',
      priorityStopId:story.priority,priorityLabel:`${r.name} asked to make time for “${story.stops[story.priority].name}”. ${r.bond<10?'Combining that visit with another builds 1 bond.':'Your bond is already at 10.'}`,
      stops,currentStopId:current?.id||null,choices:current?.choices||[],history,
      finishLabel:shift.history.length?'Finish the day together':'Cancel day · recover 1 effort',canFinish:true};
  }
  function arrive(site,stopId,week){
    if(!live(site,week))return reject('There is no current resident shift.');
    if(!stopIds.includes(stopId))return reject('Choose one of the day’s stops.');
    const shift=site.shift,stop=stopView(site,shift,stopId);
    if(!stop.available)return reject(stop.reason);
    if(stop.current)return reject('You are already at this stop.');
    return {ok:true,shift:{...shift,time:shift.time+stop.travel,at:{...venue(site,shift,stopId)},stopId},message:`${clock(shift.time+stop.travel)} · You reached ${stop.venueName} with ${shiftPerson(site).name}.`};
  }
  function choose(site,optionId,week){
    if(!live(site,week))return reject('There is no current resident shift.');
    const shift=site.shift,stopId=shift.stopId;
    if(!stopIds.includes(stopId))return reject('Travel to a shift stop first.');
    const stop=stopView(site,shift,stopId);if(!stop.current)return reject('This group moved. Visit its current location first.');
    if(stop.visited)return reject('This visit is complete.');
    const raw=course(site,shift).stops[stopId].choices.find(c=>c.id===optionId),selected=stop.choices.find(c=>c.id===optionId);
    if(!selected)return reject('Choose an option offered at this stop.');
    if(!selected.available)return reject(selected.reason);
    const step={stopId,optionId,begin:selected.begin,end:selected.end};
    const next={...shift,time:selected.end,stopId:null,history:[...shift.history,step]};
    const due={week:week+1,residentId:shift.residentId,code:stopId+'/'+optionId};
    return {ok:true,shift:next,now:raw.now?{...raw.now}:{},followUps:[due],message:`${clock(selected.end)} · ${selected.label}. ${selected.terms}.`};
  }
  function finish(site,week){
    if(!live(site,week))return reject('There is no current resident shift.');
    const shift=site.shift,r=shiftPerson(site),story=stories[r.slot],budget=household(site,shift);
    if(!shift.history.length)return {ok:true,shift:null,message:`You ended the shift with ${r.name} before completing a visit.`};
    const connected=shift.history.length>=2&&shift.history.some(s=>s.stopId===story.priority),bonds=connected?[{residentId:r.id,amount:1}]:[];
    const followUps=[{week:week+1,residentId:r.id,code:budget.gap?'home-tight':'home-covered'}];
    const h=budget.gap?`${budget.gap} household credit${budget.gap===1?'':'s'} remained uncovered. Next week’s wellbeing falls by 1.`:`The household covered the day’s costs. Next week’s wellbeing rises by 1.`;
    const missed=stopIds.filter(id=>!shift.history.some(s=>s.stopId===id)).map(id=>story.stops[id].name);
    const remembered=shift.history.find(step=>step.stopId===story.priority)||shift.history[shift.history.length-1];
    const memory={residentId:r.id,week:shift.week,reserve:budget.carry,summary:pick(site,shift,remembered).name,quote:memories[r.slot][remembered.optionId]};
    return {ok:true,shift:null,bonds,followUps,memory,message:`${r.name}’s day ended at ${clock(shift.time)}. ${h}${budget.carry?' '+r.name+' set aside '+budget.carry+' credit'+(budget.carry===1?'':'s')+' for the next shift.':''}${connected?(r.bond<10?' Making time for the requested visit built 1 bond.':' You made time for the requested visit. Your bond is already at its maximum.'):''}${missed.length?' You left “'+missed.join('” and “')+'” for another day.':''}`};
  }
  function followEffect(site,f){
    const r=person(site,f.residentId);
    if(f.code==='home-tight')return {message:`After the shift, ${r.name} had to postpone a household expense.`,now:{wellbeing:-1}};
    if(f.code==='home-covered')return {message:`${r.name} covered the household day’s expenses through work or reciprocal help.`,now:{wellbeing:1}};
    const [id,optionId]=f.code.split('/'),choice=stories[r.slot].stops[id].choices.find(c=>c.id===optionId);
    return {message:`After ${r.name}’s shift, ${choice.story[0].toLowerCase()+choice.story.slice(1)}`,now:{...choice.after}};
  }
  function tick(site,week){
    let shift=site.shift||null;
    const pending=[...(site.shiftFollowUps||[])],events=[];
    if(shift&&shift.week<week){
      const end=finish(site,shift.week);
      if(end.ok){events.push({message:end.message,bonds:end.bonds||[],...(end.memory?{memory:end.memory}:{})});pending.push(...(end.followUps||[]));}
      shift=null;
    }
    const followUps=[];
    for(const f of pending){if(f.week<=week){if(validFollowUp(site,f))events.push(followEffect(site,f));}else followUps.push(f);}
    return {shift,followUps,events};
  }
  function validFollowUp(site,f){
    const r=person(site,f?.residentId);
    if(!r||!integer(f.week,1)||typeof f.code!=='string')return false;
    if(['home-tight','home-covered'].includes(f.code))return true;
    const bits=f.code.split('/');return bits.length===2&&stopIds.includes(bits[0])&&stories[r.slot].stops[bits[0]].choices.some(c=>c.id===bits[1]);
  }
  function validShift(site,s){
    const r=person(site,s?.residentId);
    if(!s||s.v!==1||!r||!integer(s.week,1)||!integer(s.time,0,END)||(s.reserve!==undefined&&!integer(s.reserve,0,NEED))||!validVenue(site,s.at)||!s.venues||!stopIds.every(id=>validVenue(site,s.venues[id]))||!Array.isArray(s.history)||s.history.length>3)return false;
    if(s.stopId!==null&&!stopIds.includes(s.stopId))return false;
    let previous=0;const used=new Set();
    for(const step of s.history){
      if(!step||!stopIds.includes(step.stopId)||used.has(step.stopId)||!integer(step.begin,previous,END)||!integer(step.end,step.begin+1,s.time)||!stories[r.slot].stops[step.stopId].choices.some(c=>c.id===step.optionId))return false;
      used.add(step.stopId);previous=step.end;
    }
    return !used.has(s.stopId);
  }
  root.EarthShifts=Object.freeze({district,gate,start,arrive,choose,finish,tick,view,matches,validShift,validFollowUp});
})(typeof window==='undefined'?globalThis:window);
