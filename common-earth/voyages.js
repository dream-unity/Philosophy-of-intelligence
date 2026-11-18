/* Expedition rules for Common Earth. World distances use the spherical great circle.
   Map arcs are schematic; stages and agreements are fictional. No network or clock dependency. */
(() => {
  'use strict';

  const briefs = {
    exchange:{label:'Exchange goods',description:'Carry a sample consignment. An on-time handover earns funds; a fair agreement builds trust.',funds:3,food:2},
    'mutual-aid':{label:'Carry mutual aid',description:'Bring extra provisions. Sharing them with consent strengthens trust at home and sends food to a linked destination.',funds:2,food:3},
    survey:{label:'Share a field survey',description:'Bring home material samples and observations. Ask permission before making local knowledge public.',funds:2,food:2}
  };
  const profiles = {
    direct:{days:1,supplies:-1,readiness:-1},
    share:{days:1,supplies:-2,goodwill:2},
    consult:{days:2,supplies:-1,goodwill:2,knowledge:1},
    study:{days:2,supplies:-1,knowledge:2},
    rest:{days:2,readiness:2},
    open:{days:2,goodwill:1},
    relay:{days:1,readiness:-1,goodwill:1},
    repair:{days:2,readiness:1,knowledge:1},
    reserve:{days:1,supplies:-1,readiness:1},
    split:{days:1,supplies:-1,goodwill:1}
  };
  // Every scene includes an option without a resource requirement. Choice ids
  // include the leg index so a delayed input cannot resolve the following scene.
  const scenes = {
    zanzibarCart:{title:'The cart at the waterfront',prompt:'In the Stone Town scenario, traders and a tool-sharing group have booked the same handcart. Only one load can reach the waterfront before departure.',options:[
      ['direct','Honour the first booking','The first booking reached the waterfront. The tools waited for another trip.'],
      ['split','Reserve space on both trips','You gave up part of the outbound load and guaranteed a return space for the tool group.'],
      ['open','Let the two groups choose the order','The two groups split the timetable themselves. Your expedition left a day later.']
    ]},
    melbourneVan:{title:'The van on the Yarra',prompt:'The Melbourne co-op has one van and two commitments. A kitchen needs food collected; a trader has already paid for the loading window.',options:[
      ['share','Borrow cargo space for the kitchen','The expedition gave up some provisions and carried the kitchen’s collection with its own.'],
      ['direct','Protect the paid window','The trader kept the promised slot. The kitchen arranged a separate collection.'],
      ['open','Let both groups revise the roster','The kitchen and trader changed the order together and passed the next slot back to your crew.']
    ]},
    mombasaSlot:{title:'A berth and a bench',prompt:'At the fictional Mombasa handover, a repair crew can mend a trolley today. The growers who need it have been given a different quay time.',options:[
      ['relay','Connect the growers and repairer','The two groups aligned their handovers by phone. Your watch stayed on duty to pass the changes along.'],
      ['consult','Bring both groups to the loading plan','One agreed schedule showed when the repaired trolley and the growers’ crates would meet.'],
      ['repair','Join the repair shift','The crew spent another day learning the repair and handed over a working trolley.']
    ]},
    valparaisoHill:{title:'The last uphill load',prompt:'In Valparaíso’s hillside setting, reaching the waterfront depot is a short trip for the traders and a long climb home for several residents.',options:[
      ['direct','Keep the waterfront handover','The shipment met its booked window. Residents took on the last uphill leg.'],
      ['share','Carry a share of the uphill load','The expedition set aside part of its stores to help deliver beyond the waterfront.'],
      ['open','Wait for a hillside collection','Residents arranged a shared uphill collection. Your departure moved to the next day.']
    ]},
    rotterdamHours:{title:'The price of a quiet quay',prompt:'In the Rotterdam scenario, the first loading slot falls before dawn. Workshop orders are waiting, and people live beside the loading area.',options:[
      ['direct','Take the first slot','The workshop got its parts early. Residents heard the handover before dawn.'],
      ['consult','Negotiate the noisy work window','Residents and repairers agreed when the loudest jobs could start. Both received the revised schedule.'],
      ['open','Move the load to daylight','The crew took a later slot and kept the quiet hours intact.']
    ]},
    suvaCargo:{title:'A hold for both directions',prompt:'In the Suva scenario, a visiting island co-op asks for return cargo space. The outward booking would fill the hold and pay the freight.',options:[
      ['split','Hold space for the return','The visiting co-op helped decide what the return journey would carry.'],
      ['study','Compare the costs both ways','Both crews documented who provided the vessel, storage and return cargo.'],
      ['open','Wait for the visiting group’s vote','The visiting group chose its return priorities before the expedition left.']
    ]},
    reykjavikWorkshop:{title:'Who keeps the light on?',prompt:'It is winter in the Reykjavík scenario. The crew can use the harbour workshop tonight; neighbours have already planned a gathering in the same room.',options:[
      ['direct','Use the booked workshop','The crew finished its loading checks on time. The gathering found another room.'],
      ['consult','Agree a shared evening','The crew and neighbours worked out how to divide the room and look after the last shift.'],
      ['rest','Give the neighbours the evening','The crew rested and returned to the workshop after the gathering.']
    ]},
    depot:{title:'One loading bay',prompt:'A borrowed loading bay has room for one cart at a time. A second crew arrives before you have finished.',options:[
      ['direct','Keep the booked slot','You handed over on schedule. The other crew reorganised its morning.'],
      ['consult','Agree a shared timetable','The crews wrote down who would go first today and who would have priority next time.'],
      ['open','Offer the first turn','The other crew unloaded first. Your own departure moved back a day.']
    ]},
    water:{title:'The watch change',prompt:'At the floating station, a visiting watchkeeper offers a local briefing. The next departure slot is close.',options:[
      ['study','Take the full briefing','The watchkeepers compared two accounts and marked where they disagreed.'],
      ['split','Trade a packed meal for a short handover','Both crews left with a contact and a short handover note.'],
      ['rest','Give the next watch time to rest','The station lent a quiet room. A rested watch took the next departure.']
    ]},
    highland:{title:'A seat at the handover',prompt:'The people who load the supplies also know which handovers routinely run late. They have been left off the planning call.',options:[
      ['direct','Use the printed schedule','The crew made its slot, relying on a timetable the loaders had no chance to revise.'],
      ['consult','Pay for time to hear the loaders','The loaders identified a transfer that needed more time. A revised note went to both crews.'],
      ['open','Share the next planning call','You moved the call to the following day so the loaders could attend.']
    ]},
    dates:{title:'Two dates on one manifest',prompt:'The map arc crosses the 180° meridian. Two fictional crews have written a meeting time using their own calendars. Both entries say “tomorrow”.',options:[
      ['study','Record both local dates and a shared time','You wrote both local dates beside one agreed time and tested the handover aloud.'],
      ['relay','Call the receiving lead','A handover lead confirmed the slot. The call cost the off-duty crew an hour of rest.'],
      ['open','Wait for written confirmation','The reply took longer. Each crew signed the same schedule before moving.']
    ]},
    polar:{title:'The quiet shift',prompt:'On this high-latitude leg, the fictional watch disagrees about whether to press on. The newest member has not spoken.',options:[
      ['direct','Keep the original watch','You reached the handover early with a tired watch.'],
      ['consult','Invite each watchkeeper to speak','The newest member named a missed check. The team revised its handover together.'],
      ['rest','Split the watch and rest','A later slot gave the crew a full rest before the next handover.']
    ]},
    openSea:{title:'A voice between harbours',prompt:'A neighbouring crew asks to compare two conflicting arrival estimates. Your own crew can spare time, stores or a short reply.',options:[
      ['share','Share a spare provision crate','Both crews could wait for a reliable handover without anyone missing a meal.'],
      ['relay','Relay both estimates now','A tired watch passed both estimates on and told the receiving crew why they differed.'],
      ['repair','Pause to check the calculation','An extra day let the crew examine the discrepancy and restore the watch rotation.']
    ]},
    inland:{title:'Two addresses for the same stop',prompt:'A dispatch sheet uses a warehouse number. The neighbourhood calls the same place by a landmark. A driver is waiting for an answer.',options:[
      ['direct','Send the warehouse number','The driver found the depot in time; the public notice still used a name few neighbours knew.'],
      ['consult','Verify both names with residents','The receiving crew published both labels and a point of contact.'],
      ['repair','Make a reusable handover card','You spent a day drawing a card. The next driver could use it in either direction.']
    ]},
    language:{title:'Whose words travel?',prompt:'Two teams use the same word for different kinds of approval. One hears an invitation; the other hears a signed agreement.',options:[
      ['relay','Call the two coordinators','Both coordinators heard the distinction directly. Preparing the call cut into the watch rotation.'],
      ['study','Document both meanings','You tested the revised wording with both teams and kept their translated explanations.'],
      ['open','Wait for each group to reply','Each group chose its own words before agreeing to proceed.']
    ]},
    distance:{title:'The missing return load',prompt:'A long exchange has been planned around the outbound cargo. Nobody has agreed who pays for the empty return space.',options:[
      ['consult','Renegotiate the return terms','Both crews put the return cost on the ledger and signed an amended agreement.'],
      ['split','Reserve part of your own load','You gave up some space so the other crew could send something back.'],
      ['rest','Give the dispatchers another day','The crew rested while the dispatchers found a later return slot.']
    ]},
    sample:{title:'An attractive sample',prompt:'A sample would make a striking exhibit, but its local name and its origin have not been checked.',options:[
      ['study','Document its origin','The crew recorded the source, the agreed name and the limits of what it could infer.'],
      ['relay','Ask the local custodian','The custodian supplied the missing context while the team prepared the next handover.'],
      ['rest','Leave the sample and take the later slot','You left the unverified object in place and rested the team.']
    ]},
    exchangeEnd:{title:'What counts as a fair exchange?',prompt:'The receiving group offers two agreements. A fast sale settles today; a slower arrangement lets both sides check the return terms.',options:[
      ['direct','Close the posted sale','The posted price was honoured. There was little time to compare what the two sides needed.'],
      ['consult','Co-write the return terms','Both groups agreed who would accept returns and who would carry the cost.'],
      ['open','Offer an open review period','You reserved time for feedback before closing the exchange.']
    ]},
    aidEnd:{title:'Who chooses the recipients?',prompt:'At the destination, volunteers disagree about who should receive the last supply. Some people who need it cannot attend the meeting.',options:[
      ['share','Set aside a delivery for people absent','A reserved portion reached people who could not attend. Volunteers documented their decisions.'],
      ['consult','Ask local organisers to set priorities','Local organisers named their priorities and chose who would hear an appeal.'],
      ['open','Wait for a representative handover','The final handover waited a day so absent households could be represented.']
    ]},
    surveyEnd:{title:'Permission to publish',prompt:'The notes contain knowledge entrusted to the expedition. A public copy might help others, but the original contributors have not approved it.',options:[
      ['study','Return annotated copies for review','Contributors corrected the field notes and marked what could be shared.'],
      ['split','Leave a working copy and credit the contributors','The group received its own copy and chose a contact for future questions.'],
      ['open','Keep the notes local for now','You left the notes with their contributors and agreed to seek permission later.']
    ]}
  };
  const localStops={
    'Stone Town':['zanzibarCart','At the Zanzibar waterfront, the people sharing the storeroom await your handover.'],
    Melbourne:['melbourneVan','At the Yarra-side handover, the co-op has recorded both the trader’s and the kitchen’s requests.'],
    Mombasa:['mombasaSlot','At the Indian Ocean handover, the growers and repair crew compare their schedules.'],
    'Valparaíso':['valparaisoHill','Beside the Pacific waterfront, some residents must still carry the final load uphill.'],
    Rotterdam:['rotterdamHours','At the delta workshop, residents and repairers are both represented.'],
    Suva:['suvaCargo','At the Viti Levu handover, the visiting co-op is also planning its return load.'],
    'Reykjavík':['reykjavikWorkshop','At the North Atlantic harbour, the shared workshop hosts the handover.']
  };
  function localStop(place) {
    if(place.water)return null;
    const name=window.EarthNavigation?.scenario(place)?.place;
    return Object.hasOwn(localStops,name)?localStops[name]:null;
  }
  const max={supplies:16,readiness:6,goodwill:12,knowledge:12};
  const labels={supplies:'provisions',readiness:'readiness',goodwill:'goodwill',knowledge:'observations',days:'route days'};
  const radians=Math.PI/180;
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const tidy=text=>String(text ?? '').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,72);
  const fail=message=>({ok:false,message});
  function point(input) {
    if(!input || !Number.isFinite(input.lat)||!Number.isFinite(input.lon)||Math.abs(input.lat)>90||Math.abs(input.lon)>180) return null;
    const candidateId=input.siteId ?? input.id;
    const id=typeof candidateId==='string'||typeof candidateId==='number'?candidateId:null;
    return {id,name:tidy(input.name)||'Selected location',region:tidy(input.region),lat:input.lat,lon:input.lon,water:!!input.water};
  }
  function sphere(p){
    const lat=p.lat*radians,lon=p.lon*radians,c=Math.cos(lat);
    return [c*Math.cos(lon),c*Math.sin(lon),Math.sin(lat)];
  }
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  function angle(a,b) {
    const aa=sphere(a),bb=sphere(b);
    return Math.atan2(Math.hypot(...cross(aa,bb)),clamp(dot(aa,bb),-1,1));
  }
  function position(a,b,fraction) {
    const f=clamp(fraction,0,1);
    if(f===0) return {lat:a.lat,lon:a.lon};
    if(f===1) return {lat:b.lat,lon:b.lon};
    const u=sphere(a),v=sphere(b),c=clamp(dot(u,v),-1,1);
    let tangent=v.map((value,i)=>value-c*u[i]),len=Math.hypot(...tangent);
    if(len<1e-12) {
      if(c>0) return {lat:a.lat,lon:a.lon};
      const axis=Math.abs(u[2])<0.8?[0,0,1]:[1,0,0];
      tangent=cross(axis,u);len=Math.hypot(...tangent);
    }
    const af=angle(a,b)*f;
    const p=u.map((x,i)=>Math.cos(af)*x+Math.sin(af)*tangent[i]/len);
    return {lat:Math.atan2(p[2],Math.hypot(p[0],p[1]))/radians,lon:Math.atan2(p[1],p[0])/radians};
  }
  function preview(source,destination,style='exchange') {
    const origin=point(source),target=point(destination);
    if(!origin||!target)return fail('Choose an origin and destination with valid Earth coordinates.');
    if(!Object.hasOwn(briefs,style))return fail('Choose an expedition brief.');
    const km=angle(origin,target)*6371.009;
    if(km<10 || (target.id!==null && origin.id===target.id))return fail('Choose a different destination at least 10 km away.');
    const legs=km<1600?2:km<7000?3:4;
    const brief=briefs[style],distance=Math.round(km);
    return {ok:true,origin,target,style,label:brief.label,description:brief.description,distance,legs,
      targetDays:Math.ceil(legs*1.5),cost:{funds:brief.funds+(legs===4?1:0),food:brief.food+(legs>2?1:0)},
      note:'Schematic great-circle arc. Route days belong to this expedition.'};
  }
  function itinerary(p) {
    const {origin,target,style,legs}=p;
    const mid=position(origin,target,.5),polar=Math.max(Math.abs(origin.lat),Math.abs(mid.lat),Math.abs(target.lat))>=60;
    const sea=origin.water||target.water;
    const first=localStop(origin)?.[0] || (origin.water?'water':origin.region&&target.region&&origin.region!==target.region?'highland':'depot');
    const interior=[];
    if(Math.abs(origin.lon-target.lon)>180) interior.push('dates');
    if(polar) interior.push('polar');
    if(sea) interior.push('openSea');
    if(style==='survey') interior.push('sample');
    if(p.distance>=7000) interior.push('distance');
    if(origin.region && target.region && origin.region!==target.region) interior.push('language');
    interior.push(sea?'language':'inland','distance');
    const final={exchange:'exchangeEnd','mutual-aid':'aidEnd',survey:'surveyEnd'}[style];
    return [first,...Array.from(new Set(interior)).slice(0,legs-2),final];
  }
  function start(source,destination,style='exchange') {
    const p=preview(source,destination,style);
    if(!p.ok)return p;
    const voyage={version:1,origin:p.origin,target:p.target,style:p.style,distance:p.distance,legs:p.legs,leg:0,targetDays:p.targetDays,
      itinerary:itinerary(p),arrivalNote:localStop(p.target)?.[1] || '',cost:p.cost,days:0,supplies:p.legs+1+(style==='mutual-aid'?2:0),readiness:3,goodwill:0,knowledge:0,
      position:position(p.origin,p.target,0),log:[]};
    return {ok:true,message:p.label+' expedition commissioned from '+p.origin.name+' to '+p.target.name+'.',cost:{...p.cost},voyage};
  }
  function scene(v) {
    const s=v && Number.isInteger(v.leg)&&v.leg>=0&&v.leg<v.legs && Array.isArray(v.itinerary) && scenes[v.itinerary[v.leg]];
    if(!s)return null;
    const prefix=v.leg+1===v.legs && v.arrivalNote?v.arrivalNote+' ':'';
    return {title:s.title,prompt:prefix+s.prompt,number:v.leg+1,total:v.legs};
  }
  function choices(v) {
    if(!scene(v)) return [];
    return scenes[v.itinerary[v.leg]].options.map(([type,label,narrative])=>{
      const effect=profiles[type],missing=Object.keys(effect).filter(k=>effect[k]<0 && v[k]<-effect[k]);
      const applied={};
      for(const [k,d] of Object.entries(effect)) applied[k]=k==='days'?d:clamp(v[k]+d,0,max[k])-v[k];
      const description=Object.entries(applied).filter(([,delta])=>delta!==0).map(([k,d])=>(d>0?'+':'')+d+' '+labels[k]).join(' · ');
      return {id:v.leg+':'+type,label,description,available:!missing.length,reason:missing.map(k=>'Requires '+(-effect[k])+' '+labels[k]+'.').join(' '),effects:applied,narrative};
    });
  }
  function complete(v) {
    const timely=v.days<=v.targetDays, trusted=v.goodwill>=Math.ceil(v.legs/2), informed=v.knowledge>=2;
    const reward={},targetReward={};
    let headline,lesson;
    if(v.style==='exchange') {
      reward.funds=v.cost.funds+(timely?2:0)+(trusted?1:0);
      if(trusted)reward.trust=1;
      if(v.target.id!==null)targetReward.materials=trusted?2:1;
      headline=trusted?'A deal both sides can explain':'The consignment changed hands';
      lesson=timely?'Meeting the agreed window earned a delivery premium.':'The later delivery covered its costs and missed the timing premium.';
      lesson+=trusted?' Shared terms also earned a trust dividend.':' A stronger agreement could have earned a trust dividend.';
    } else if(v.style==='mutual-aid') {
      reward.trust=1+Math.min(3,Math.floor(v.goodwill/2))+(timely&&trusted?1:0);
      if(informed)reward.materials=1;
      if(v.target.id!==null)targetReward.food=trusted?3:1;
      headline=trusted?'The receiving group shaped the handover':'A shipment reached its destination';
      lesson=trusted?'Giving the receiving group a say made the agreement easier to defend at home.':'The supplies arrived. Consultation would have strengthened the handover.';
      if(informed)lesson+=' Shared observations also brought home a reusable material sample.';
    } else {
      reward.materials=1+Math.min(4,v.knowledge)+(timely&&informed?1:0);
      if(trusted)reward.trust=1;
      if(v.target.id!==null)targetReward.trust=trusted?2:1;
      headline=informed?'A field record worth keeping':'A first set of field notes';
      lesson=informed?'Checked observations brought more usable samples home.':'The route produced a sample. Pausing to compare observations would have improved the record.';
      if(trusted)lesson+=' Community review strengthened trust.';
    }
    if(v.readiness===0)lesson+=v.style==='exchange'?' The tired crew used one fund to restore supplies.':' The crew finished exhausted and requested a better watch rotation.';
    // A depleted team needs to restore stores before the next departure.
    if(v.readiness===0&&v.style==='exchange')reward.funds=Math.max(0,reward.funds-1);
    return {origin:v.origin,target:v.target,style:v.style,distance:v.distance,days:v.days,targetDays:v.targetDays,legs:v.legs,
      position:v.position,headline,lesson,reward,targetReward,log:v.log.map(e=>({...e})),readiness:v.readiness,supplies:v.supplies,goodwill:v.goodwill,knowledge:v.knowledge};
  }
  function step(v,choiceId) {
    if(!scene(v))return fail('This expedition has already arrived or contains no current leg.');
    const pick=choices(v).find(c=>c.id===choiceId);
    if(!pick)return fail('Choose an option for the current leg.');
    if(!pick.available) return fail(pick.reason);
    const next={...v,leg:v.leg+1};
    for(const [key,change] of Object.entries(pick.effects))next[key]+=change;
    next.position=position(v.origin,v.target,next.leg/v.legs);
    const line={leg:next.leg,title:scene(v).title,choice:pick.label,text:pick.narrative,days:next.days};
    next.log=[...v.log,line];
    if(next.leg<v.legs) return {ok:true,message:pick.narrative,voyage:next,complete:false,reward:null,report:null};
    const report=complete(next);
    const goods=Object.entries(report.reward).map(([key,value])=>'+'+value+' '+key).join(', ');
    return {ok:true,message:'Arrived at '+v.target.name+'. '+report.headline+'. '+goods+' for '+v.origin.name+'.',voyage:next,complete:true,reward:report.reward,report};
  }
  const styles=Object.freeze(Object.entries(briefs).map(([id,b])=>Object.freeze({id,label:b.label,description:b.description})));
  function whole(n,min,max) {return Number.isSafeInteger(n) && n>=min && n<=max;}
  function shortText(value,limit) {return typeof value==='string' && value.length<=limit;}
  function savedPoint(p) {
    return !!point(p) && shortText(p.name,72) && shortText(p.region,72) && typeof p.water==='boolean'
      && (p.id===null || typeof p.id==='string' && p.id.length<=120 || Number.isSafeInteger(p.id));
  }
  function savedLog(log,n,days) {
    if(!Array.isArray(log) || log.length!==n)return false;
    let prior=0;
    for(const [i,line] of log.entries()){
      if(!line || line.leg!==i+1 || !shortText(line.title,140) || !shortText(line.choice,200) || !shortText(line.text,480)
          || !whole(line.days,prior+1,prior+2))return false;
      prior=line.days;
    }
    return prior===days;
  }
  function routeFacts(x) {
    if(!x || !savedPoint(x.origin) || !savedPoint(x.target) || !Object.hasOwn(briefs,x.style))return false;
    const p=preview(x.origin,x.target,x.style);
    return p.ok && x.distance===p.distance && x.legs===p.legs && x.targetDays===p.targetDays &&
      whole(x.days,0,2*x.legs) && whole(x.supplies,0,max.supplies) && whole(x.readiness,0,max.readiness)
      && whole(x.goodwill,0,max.goodwill) && whole(x.knowledge,0,max.knowledge) && !!point(x.position);
  }
  function valid(v) {
    if(!routeFacts(v) || v.version!==1 || !whole(v.leg,0,v.legs-1)
        || !Array.isArray(v.itinerary) || v.itinerary.length!==v.legs || !v.itinerary.every(id=>Object.hasOwn(scenes,id))
        || !savedLog(v.log,v.leg,v.days) || (v.arrivalNote!=null && !shortText(v.arrivalNote,256)))return false;
    const p=preview(v.origin,v.target,v.style),expected=position(v.origin,v.target,v.leg/v.legs);
    return !!v.cost && v.cost.funds===p.cost.funds && v.cost.food===p.cost.food && angle(expected,v.position)<1e-6;
  }
  function rewardShape(r) {
    return !!r && typeof r==='object' && !Array.isArray(r) &&
      Object.entries(r).every(([key,n])=>['funds','materials','food','trust'].includes(key) && whole(n,0,20));
  }
  function validReport(r) {
    return routeFacts(r) && savedLog(r.log,r.legs,r.days) && rewardShape(r.reward) && rewardShape(r.targetReward)
      && shortText(r.headline,160) && shortText(r.lesson,700) && angle(r.target,r.position)<1e-6;
  }
  window.EarthVoyages=Object.freeze({preview,start,step,scene,choices,styles,position,valid,validReport});
})();
