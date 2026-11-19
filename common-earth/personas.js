/* Personal histories are derived from founding information, so old settlements acquire
   the same people on every visit. A change of employer or building never rerolls a life. */
(function(root){
  'use strict';
  const axes=Object.freeze(['numeracy','music','communication','care','craft','stamina','organisation']);
  const traits=Object.freeze(['curiosity','sociability','patience','initiative','adaptability']);
  const work={
    steward:['Steward','organisation','communication','keeps a margin in the district ledger for questions that have yet to reach a meeting','public decisions'],
    grower:['Grower','care','stamina','sets aside the first basket of a harvest for neighbours who cannot make the collection','kitchen gardens'],
    repairer:['Repairer','numeracy','craft','sketches a broken mechanism and works out its tolerances before cutting a replacement','mechanical puzzles'],
    convenor:['Convenor','communication','organisation','collects questions from people who finish work too late to speak at the meeting','public speaking'],
    baker:['Baker','craft','organisation','tests a small batch of dough and notes what changed before committing a whole sack of flour','bread making'],
    carpenter:['Carpenter','craft','numeracy','marks every offcut with its length so the next apprentice can make use of it','joinery'],
    seedkeeper:['Seed keeper','care','organisation','writes the lender’s name on each seed envelope so the next harvest can find its way back','seed exchanges'],
    courier:['Foot courier','stamina','communication','remembers which callers will need an extra minute to reach the door','walking routes'],
    trader:['Market trader','numeracy','communication','sets a small sample beside each price card and listens to what customers ask about it','fair pricing'],
    driver:['Co-op delivery driver','organisation','craft','keeps a pencilled route card and leaves space for the return loads that are easy to forget','route planning'],
    carrier:['Supply porter','stamina','organisation','packs fragile goods on top and leaves a signed receipt at both ends of the run','packing and dispatch'],
    'practice-nurse':['Practice nurse','care','organisation','arranges follow-up appointments around the hours each household can actually come to the clinic','continuity of care'],
    surveyor:['Building surveyor','numeracy','craft','measures each doorway twice and asks the people using it where a repair would make the greatest difference','accessible buildings']
  };
  // A carpenter and a joiner can hold the same contract but take charge of
  // different parts of a job. These responsibilities are in the biography,
  // the weekly action and the person's comparison of possible careers.
  const assignments={
    steward:[
      ['Civic accounts','Check the balances proposed for the meeting','Protect funds already promised to a household','numeracy'],
      ['Household rota','Check who can attend the next collection','Make room for a household whose work shift changed','organisation'],
      ['Assembly minutes','Check which decisions still need a named volunteer','Give a resident an answer to last week’s question','communication']],
    grower:[
      ['Seedling beds','Check which seedlings are ready to move','Keep the next planting alive through the change of season','care'],
      ['Harvest allocation','Weigh the first picking for the kitchen','Send the ripest food to households that can use it today','numeracy'],
      ['Shared beds','Check the watering rota against the planting beds','Keep the new beds growing when a gardener is away','organisation']],
    repairer:[
      ['Tool calibration','Measure the worn tool against a sound fitting','Let the next crew cut a replacement to the right size','numeracy'],
      ['Spare parts','Sort serviceable parts from damaged stock','Give a broken tool a second working life','craft'],
      ['Public fittings','Test a loose fitting from the assembly hall','Return the fitting before the hall opens','craft']],
    convenor:[
      ['Evening assembly','Collect questions from households on late shifts','Bring their requests to the next meeting','communication'],
      ['Service timetable','Compare the meeting date with the collection rota','Make room for residents who would miss the vote','organisation'],
      ['Neighbour mediation','Record both accounts of a shared-work disagreement','Give each neighbour a choice they can act on','care']],
    baker:[
      ['Bread ovens','Check which batch is ready for the oven','Have loaves ready for the first collection','craft'],
      ['Kitchen orders','Set aside the portions promised to the late shift','Keep a household meal available after the counter closes','care'],
      ['Starter care','Check the starter before the next mixing shift','Keep tomorrow’s bake on schedule','organisation']],
    carpenter:[
      ['Joinery','Check an opening against the finished frame','Fit the new frame with one cut to the stored timber','numeracy'],
      ['Furniture repair','Test the loose joints in a chair from the hall','Keep a seat in use for the next neighbourhood meeting','craft'],
      ['Workshop teaching','Set out sound offcuts for the next apprentice','Let the learner complete a fitting without wasting a full board','communication']],
    seedkeeper:[
      ['Seed returns','Match returned seed to the lending record','Keep a viable sample available for the next borrower','organisation'],
      ['Germination checks','Sort a trial packet for the growing beds','Check a seed batch before another grower relies on it','care'],
      ['Seed drying','Check the drying trays before storing the seed','Protect the next planting from damp stock','care']],
    courier:[
      ['Market collections','Check the collection slips against the parcels','Deliver the outgoing orders before the exchange closes','organisation'],
      ['Household rounds','Sort parcels by the walking round','Reach the household at the far end before the next collection','stamina'],
      ['Route timing','Time the collection between two streets','Give the exchange a pickup window it can keep','numeracy']],
    trader:[
      ['Produce counter','Compare the food shelf with buyer reservations','Set aside the stocks already promised for collection','numeracy'],
      ['Customer orders','Ask which households still need a delivery','Find a buyer for the stock that will spoil first','communication'],
      ['Bulk bookings','Compare standing orders with incoming cargo','Keep regular deliveries within the buyers’ agreed terms','organisation']],
    driver:[
      ['Return loads','Pair the outgoing manifest with a return pickup','Bring the empty truck back with a useful load','organisation'],
      ['Vehicle checks','Check the truck before the next booked run','Avoid leaving a buyer waiting for a van that cannot run','craft'],
      ['Loading order','Arrange cargo in the order customers will receive it','Unload the first crate without shifting the whole return load','organisation']],
    'practice-nurse':[
      ['Clinic appointments','Arrange follow-ups around household working hours','Keep an appointment within reach of someone on a shift','care'],
      ['Neighbourhood visits','Check the return visits on the clinic rota','Keep a promised visit when local shifts change','organisation'],
      ['Clinic liaison','Confirm a clinic appointment with the household representative','Ensure the family knows when someone will call','communication']],
    surveyor:[
      ['Building access','Check access measurements at the repair opening','Fit the change to the people who use the building','numeracy'],
      ['Repair estimates','Check the timber estimate against the span measurements','Order the amount the workshop actually needs','craft'],
      ['Survey records','Update measurements after the crew changes a frame','Keep future repairs consistent with what was actually built','organisation']],
    engineer:[
      ['Design estimates','Check a drawing against the workshop material list','Keep the repair within its timber allowance','numeracy'],
      ['Maintenance design','Test how a fitting wears under use','Give the maintenance crew a repair they can repeat','craft'],
      ['Works coordination','Mark which street needs the first repair','Leave access open while the next crew works','organisation']],
    mathematician:[
      ['Demand estimates','Compare the store count with the last forecast','Reduce shortages after an unusually busy week','numeracy'],
      ['Workshop measurement','Check the measurement assumptions on a repair','Keep the builders from ordering the wrong span','craft'],
      ['Research teaching','Review a learner’s assumptions with them','Help a neighbour explain when an estimate will fail','communication']],
    police:[
      ['Neighbour liaison','Hear separate accounts of a neighbourhood complaint','Agree a follow-up each household understands','communication'],
      ['Meeting access','Check safe access to the public meeting','Leave the approach usable for residents with a late shift','organisation'],
      ['Community follow-up','Return to a household after a mediated dispute','Learn whether the agreed repair actually happened','care']],
    musician:[
      ['Ensemble rehearsal','Practise the ensemble’s entrance cues','Help new players enter together at the next rehearsal','music'],
      ['Neighbourhood concert','Fit a short programme to the hall booking','Have the set ready when late-shift neighbours arrive','organisation'],
      ['Beginner rehearsals','Play a difficult phrase for a new musician','Let a learner join the next ensemble session','communication']],
    teacher:[
      ['Practical lessons','Set out workshop examples for the next lesson','Give learners a task they can check themselves','craft'],
      ['Tutorials','Listen to a learner explain a difficult step','Find the part of the explanation that needs to change','communication'],
      ['Attendance and access','Match tutorial times with household care shifts','Keep evening learners in the course','organisation']],
    geneticist:[
      ['Seed archive','Compare the seed return with the planting record','Keep track of which varieties grew well here','organisation'],
      ['Field observations','Record differences among the trial beds','Give the growers observations from the same season','numeracy'],
      ['Grower liaison','Ask growers how they tended the trial beds','Read the harvest alongside the conditions people observed','communication']],
    cook:[
      ['Pantry menu','Plan a menu around produce that will spoil first','Feed households before the short-life stock is lost','organisation'],
      ['Meal service','Prepare portions for the next kitchen collection','Keep the early and late shifts equally supplied','craft'],
      ['Household orders','Check who needs a meal collected on their behalf','Reach residents who cannot visit the kitchen','care']],
    refuse:[
      ['Collection route','Check which collection points need the next run','Clear shared bins before the busiest market shift','organisation'],
      ['Material recovery','Sort reusable containers from the collection','Return sound material to the workshop','craft'],
      ['Household collections','Review bins left behind on the last round','Arrange a collection a resident can actually use','communication']]
  };
  assignments.nurse=assignments['practice-nurse'];
  assignments.gardener=assignments.grower;
  const responsibilities=Object.fromEntries(Object.entries(assignments).map(([key,rows])=>
    [key,Object.freeze(rows.map(([label,duty,goal,axis])=>Object.freeze({label,duty,goal,axis})))]));
  const dutiesFor=key=>Object.hasOwn(responsibilities,key)?responsibilities[key]:null;
  const validWorkFocus=focus=>focus!=null&&typeof focus==='object'&&axes.includes(focus.axis)&&
    ['label','duty','goal'].every(key=>typeof focus[key]==='string'&&focus[key].length>0&&focus[key].length<=180);
  // An outside interest can reveal a very different ability from a person's day job.
  const pastimes=[
    ['music','singing in a small choir','I learn a new harmony by singing it beside someone who knows the part.'],
    ['music','playing dance tunes','I like a tune that makes people tap a foot before they realise they know it.'],
    ['music','repairing and playing old instruments','I keep an old instrument playable. Getting one clear note out of it feels like a small victory.'],
    ['numeracy','logic puzzles','I make little number puzzles. If two answers fit I have to write a better clue.'],
    ['numeracy','charting seasonal prices','I keep a notebook of prices. I like working out whether a change will last.'],
    ['numeracy','scale models','I draw plans at a scale small enough to build a whole room from a sheet of paper.'],
    ['communication','oral history','I like recording stories in the speaker’s own words. I always read them back before I keep them.'],
    ['communication','amateur theatre','I like trying a line a second way and seeing whether the audience hears something different.'],
    ['communication','teaching beginners','I teach a little at a time. The part that interests me is which question somebody asks next.'],
    ['care','a neighbours’ supper club','I cook with neighbours. Someone usually brings a recipe written on the back of an envelope.'],
    ['care','keeping a shared herb garden','I keep spare herb cuttings so a beginner can lose one and still have another try.'],
    ['care','looking after rescue animals','I help settle frightened animals. Being willing to sit quietly is half the work.'],
    ['craft','bookbinding','I stitch damaged books back together. My favourite repairs leave the reader’s old notes in place.'],
    ['craft','making jointed toys','I carve little toys with moving parts. One loose joint can give a figure its whole expression.'],
    ['craft','mending clothes','I mend clothes for their owners and try to leave enough cloth for the next repair.'],
    ['stamina','distance running','I run a familiar circuit. Some days the achievement is keeping the same pace all the way home.'],
    ['stamina','long walks','I explore a new turn on a long walk, then draw a little map for a neighbour.'],
    ['stamina','social dancing','I could dance for hours. I enjoy finding a pace that keeps everyone in the group.'],
    ['organisation','running a lending library','I organise a shelf of things people can borrow. The best system is one a stranger can use without asking.'],
    ['organisation','planning community meals','I help plan shared meals. A spare place on the list makes it easier to welcome a late arrival.'],
    ['organisation','keeping an archive','I collect old notices and photograph them. The date and the person who wrote one matter to me.']
  ];
  // The owner's habits describe the same observable trait scores used by weekly decisions.
  const dispositions=[
    [[83,49,38,78,88],'tries an unfamiliar method on a small scale before recommending it'],
    [[54,32,85,48,49],'works quietly and will return to a difficult task several times'],
    [[61,86,64,69,52],'draws another person into a project early and asks what they would change'],
    [[44,55,80,69,37],'likes a familiar sequence and takes pride in doing each step carefully'],
    [[86,67,47,81,74],'asks how a problem arose and volunteers to try the first repair'],
    [[74,29,63,67,76],'prefers to investigate alone, then brings back a concrete suggestion'],
    [[51,71,77,36,70],'listens to the room before joining in and gives people time to catch up'],
    [[62,56,42,84,65],'starts work quickly and prefers a short trial to a long preliminary meeting'],
    [[42,38,76,47,52],'keeps notes on what worked last time and shares them when somebody asks'],
    [[70,78,55,57,84],'enjoys bringing people with different methods together to try something new']
  ];
  // These are fictional neighbours. Personal ability is selected independently of the name bank.
  const generalNames=('Robin Hale|Samira Osman|Joel Ferreira|Camila Ortiz|Nico Laurent|Amina Saleh|Rosa Moreno|Elian Reed|Anya Petrov|Kiran Mehta|Jun Park|Nadia Haddad|Tessa Grant|Mika Tan|Rowan Bell|Ilan Levy|Dara Quinn|Aya Nasser|Naila Shah|Iris Chen|Luca Marin|Pavel Novak|Sofia Costa|Tariq Ali|Alba Velez|Adrian Liu|Esme Walker|Salma Aziz|Andre Baptiste|Nora Green|Jin Kim|Maya Brooks|Tomas Vale|Leila Mensah|Ari Campos|Lina Vega|Ruth Morgan|Sacha Roy').split('|');
  const nameBanks=[
    [/stone town|zanzibar|tanzania|mombasa|kenya|dar es salaam/i,'Asha Juma|Salim Omar|Neema Said|Rehema Ali|Idd Hassan|Saada Mohamed|Baraka Bakari|Zuhura Salum|Hamisi Juma|Leila Rashid|Farida Yahya|Kassim Selemani'],
    [/melbourne|port phillip|sydney|hobart|australia|tasmania/i,'Alex Nguyen|Tali Walsh|Niamh Mason|Ravi Nair|Ellie Doyle|Elliot Chen|Mae Tran|Jasper Reid|Sana Malik|Lucy Hall|Leon Wu|Ruby Singh'],
    [/valpara[ií]so|santiago|chile|concepci[oó]n/i,'Elena Rojas|Matías Soto|Inés Araya|Celia Vega|Vicente Ruiz|Luz Paredes|Amparo Silva|Camilo Torres|Pilar Díaz|Rafael Lagos|Renata Flores|Sergio Moya'],
    [/rotterdam|amsterdam|utrecht|netherlands/i,'Sanne de Wit|Bas van Dijk|Lotte Smit|Nour El Idrissi|Milan Bakker|Femke Vos|Jules de Graaf|Daan Meijer|Maud Vermeer|Amir Said|Tessa Groen|Ruben Visser'],
    [/suva|viti levu|fiji/i,'Mere Vula|Jone Bale|Anita Prasad|Ratu Tawake|Laisa Nacewa|Kamal Singh|Litia Soro|Rakesh Kumar|Adi Tiko|Sera Rova|Rita Chand|Josaia Leka'],
    [/reykjav[ií]k|iceland|akureyri/i,'Elín Jónsdóttir|Ari Guðmundsson|Hildur Ólafsdóttir|Ómar Sigurðsson|Sara Einarsdóttir|Aron Pálsson|Birna Magnúsdóttir|Einar Helgason|Anna Björnsdóttir|Stefán Karlsson|Sóley Aradóttir|Haukur Stefánsson'],
    [/manaus|brazil|bras[ií]lia|s[aã]o paulo|rio de janeiro/i,'Lia Ramos|Rui Oliveira|Iara Costa|Bento Lima|Clara Nunes|Gil Rocha|Nina Santos|Tiago Dias|Vera Reis|Caio Lopes|Dora Alves|Ivo Martins'],
    [/tokyo|osaka|kyoto|japan|yokohama/i,'Aoi Sato|Ren Mori|Mei Kato|Nao Okada|Yuki Hayashi|Haru Ito|Rina Abe|Sora Kondo|Akira Kubo|Hana Ono|Kei Tanaka|Emi Takeda']
  ].map(([pattern,names])=>[pattern,names.split('|')]);
  const walkerRoles=['baker','carpenter','seedkeeper','courier','trader'];
  const baseSlots=[['steward','steward','steward'],...walkerRoles.map((role,i)=>['walker-'+i,role,'walker']),['driver','driver','driver']];
  for(let from=0;from<9;from++){
    for(let to=0;to<9;to++){
      if(Math.abs(from%3-to%3)+Math.abs(Math.floor(from/3)-Math.floor(to/3))===1)baseSlots.push(['carrier-'+from+'-'+to,'carrier','carrier']);
    }
  }
  const multiply=Math.imul;
  function hashChars(value,h=2166136261){
    for(let i=0;i<value.length;i++)h=multiply(h^value.charCodeAt(i),16777619);
    return h;
  }
  function hash(value,prefix){
    let h=hashChars(value,prefix);
    h=multiply(h^(h>>>16),0x85ebca6b);
    h=multiply(h^(h>>>13),0xc2b2ae35);
    return (h^(h>>>16))>>>0;
  }
  function shuffled(values,seed){
    const items=values.slice(),prefix=hashChars(seed+'#');
    for(let i=items.length-1;i>0;i--){
      const j=hash(String(i),prefix)%(i+1);
      [items[i],items[j]]=[items[j],items[i]];
    }
    return items;
  }
  const registries=new WeakMap(),foundings=new Map();
  const identityKey=(communityId,actorSlot)=>'birth:'+communityId.length+'/'+communityId+actorSlot;
  const cachedFoundings=96;
  const weakBuckets=typeof WeakRef==='function'?Array.from({length:256},()=>new Map()):null;
  let misses=0;
  function registry(site){
    if(!site||typeof site!=='object')return null;
    let reg=registries.get(site);
    if(reg)return reg;
    // Site objects retain these founding fields for life; a save import has a fresh object.
    const region=String(site.region||site.name||'the district');
    const pupils=site.residents||[];
    // Forecasts, save checks and other tabs use detached site objects. Reuse only
    // immutable birth profiles; the live roster and jobs are looked up separately.
    const birth=site.birthCoordinate||site;
    const fingerprint=JSON.stringify([site.id,site.foundingRevision,birth.lat,birth.lon,region,
      pupils.map(p=>[p.id,p.slot,p.name,p.role]),site.birthNames,site.workRotation]);
    const entry=foundings.get(fingerprint);
    if(entry){
      entry.seen=misses;
      foundings.delete(fingerprint);foundings.set(fingerprint,entry);
      registries.set(site,entry.reg);return entry.reg;
    }
    misses++;
    const bucket=weakBuckets?.[hash(fingerprint)%256];
    reg=bucket?.get(fingerprint)?.deref();
    if(!reg){
      reg=makeRegistry(site,region,pupils);
      if(bucket){
        bucket.set(fingerprint,new WeakRef(reg));
        if(bucket.size>4)bucket.delete(bucket.keys().next().value);
      }
    }
    // Scanning a world slightly larger than the strong cache must not evict
    // every frequently visited founding. Cold worlds still make room for new ones.
    const oldest=foundings.keys().next().value;
    if(foundings.size<cachedFoundings||misses-foundings.get(oldest).seen>cachedFoundings*2){
      if(foundings.size===cachedFoundings)foundings.delete(oldest);
      foundings.set(fingerprint,{reg,seen:misses});
    }
    registries.set(site,reg);
    return reg;
  }
  function makeRegistry(site,region,pupils){
    const birth=site.birthCoordinate||site;
    const seed=[site.id,birth.lat,birth.lon,region].join('|');
    const bank=nameBanks.find(([pattern])=>pattern.test(region))?.[1]||[];
    const local=shuffled(bank,seed+'local'),shared=shuffled(generalNames,seed+'shared');
    const names=new Set(pupils.map(p=>p.name));
    const slots=new Map();
    function nextName(index){
      const preferLocal=index%3!==2;
      let candidate;
      do{
        candidate=(preferLocal?local.pop():shared.pop())||shared.pop()||local.pop();
      }while(candidate&&names.has(candidate));
      names.add(candidate);
      return candidate;
    }
    baseSlots.forEach(([id,key,kind],index)=>{
      const generated=nextName(index),name=site.birthNames&&Object.hasOwn(site.birthNames,id)?site.birthNames[id]:generated;
      slots.set(id,{id,key,kind,ordinal:index,name});
    });
    pupils.forEach((person,index)=>{
      const slot=Number.isInteger(person.slot)?person.slot:index;
      const key=['grower','repairer','convenor'][slot]||'steward';
      slots.set(person.id,{id:person.id,name:person.name,key,kind:'resident',ordinal:baseSlots.length+slot,originRole:person.role});
    });
    const cohort=site.id.startsWith('near-')?Number(site.id.split('-').at(-1)):NaN;
    const birthTemperament=Number.isInteger(cohort)?[36,90,48][(cohort+Math.floor((Math.abs(birth.lat)+1)/10))%3]:48;
    return {seed,siteId:site.id,region,slots,birthTemperament,hasAssignments:site.birthNames!=null,workRotation:site.workRotation,profiles:new Map(),pastimes:shuffled(pastimes,seed+'interests'),
      musician:'walker-'+(hash(seed+'performer')%5)};
  }
  const families=names=>[...new Set(names.map(name=>name.slice(name.indexOf(' ')+1)))];
  function allocateBirthNames(site,districts){
    const existing=districts.find(s=>s.id===site.id);
    if(existing){
      // Restarting an existing district keeps its native workers, including
      // those whose names were generated before names were reserved globally.
      if(existing.birthNames)site.birthNames={...existing.birthNames};
      if(existing.workRotation!=null)site.workRotation=existing.workRotation;
      return;
    }
    const used=new Set();
    for(const other of districts){
      for(const slot of registry(other).slots.values())used.add(slot.name);
      for(const g of Object.values(other.communityLife?.people||{}))if(g?.profile)used.add(g.profile.name);
    }
    const birth=site.birthCoordinate||site;
    const seed=site.id+'|'+birth.lat+'|'+birth.lon;
    const local=nameBanks.find(([pattern])=>pattern.test(site.region||''))?.[1]||[];
    const surnames=shuffled(families([...local,...generalNames]),seed+'family');
    const middleNames=shuffled([...new Set([...local,...generalNames].map(n=>n.split(' ')[0]))],seed+'middle');
    function reserve(original,id){
      if(!used.has(original)){used.add(original);return original;}
      const first=original.split(' ')[0],offset=hash(seed+'|'+id)%surnames.length;
      for(let serial=0;;serial++){
        const parts=[first];
        for(let number=serial;number>0;number=Math.floor((number-1)/middleNames.length)){
          parts.push(middleNames[(number-1)%middleNames.length]);
        }
        const given=parts.join(' ');
        for(let i=0;i<surnames.length;i++){
          const next=given+' '+surnames[(offset+i)%surnames.length];
          if(!used.has(next)){used.add(next);return next;}
        }
      }
    }
    site.birthNames={};
    site.workRotation=districts.filter(other=>other.region===site.region).length%3;
    for(const member of site.residents)member.name=reserve(member.name,member.id);
    const founding=makeRegistry(site,site.region,site.residents);
    for(const [id] of baseSlots){
      const original=founding.slots.get(id).name,newName=reserve(original,id);
      if(newName!==original)site.birthNames[id]=newName;
    }
  }
  const nameSlots=new Set(baseSlots.map(([id])=>id));
  function validBirthNames(names){
    if(names===undefined)return true;
    if(!names||typeof names!=='object'||Array.isArray(names))return false;
    const entries=Object.entries(names);
    return entries.length<=nameSlots.size&&entries.every(([id,name])=>nameSlots.has(id)&&typeof name==='string'&&name.length>0&&name.length<=100)&&
      new Set(Object.values(names)).size===entries.length;
  }
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  function makeProfile(reg,slot){
    const {id,key,kind,ordinal,name}=slot;
    // Each inherited roll keeps its original seed bytes and terminal mixing.
    const birthPrefix=hashChars(reg.seed+'|'+id+'|');
    const roll=(tag,min,max)=>min+hash(tag,birthPrefix)%(max-min+1);
    const [job,lead,support,custom,workInterest]=work[key];
    const originRole=slot.originRole||job;
    let hobby=reg.pastimes[ordinal%reg.pastimes.length];
    if(id===reg.musician||key==='repairer')hobby=pastimes[roll('musical-interest',0,2)];
    const [hobbyAxis,hobbyName,saying]=hobby;
    const [pattern,habit]=dispositions[roll('disposition',0,dispositions.length-1)];
    const temperament=Object.freeze(Object.fromEntries(traits.map((trait,i)=>[trait,clamp(pattern[i]+roll(trait,-14,14),0,100)])));
    const skills={},bounds={};
    for(const axis of axes){
      let skill=roll(axis+'base',16,57);
      if(axis===lead)skill=roll(axis+'base',53,77);
      else if(axis===support)skill=roll(axis+'base',41,67);
      if(axis===hobbyAxis)skill=Math.max(skill,roll(axis+'practice',47,76));
      const ceiling=clamp(skill+roll(axis+'headroom',16,44),48,98);
      skills[axis]=skill;
      bounds[axis]={min:skill,max:ceiling};
    }
    function setRange(axis,low,high,capLow,capHigh){
      const value=roll(axis+'signature',low,high);
      skills[axis]=value;bounds[axis]={min:value,max:roll(axis+'cap',capLow,capHigh)};
    }
    // Accessible contrasting development paths. Other skills, interests and temperament
    // remain individual, including whether this repairer has the social skills to teach.
    if(key==='repairer'){
      setRange('numeracy',74,85,92,99);setRange('craft',59,73,82,95);
      setRange('organisation',41,60,70,91);
      setRange('music',10,26,55,66);
    }
    if(key==='practice-nurse'){
      setRange('care',74,86,88,99);setRange('organisation',56,71,76,93);
    }
    if(key==='surveyor'){
      setRange('numeracy',70,83,86,97);setRange('craft',56,72,78,94);
    }
    if(id===reg.musician)setRange('music',67,81,87,98);
    for(const axis of axes)Object.freeze(bounds[axis]);
    const strengths=Object.freeze(axes.slice().sort((a,b)=>skills[b]-skills[a]).slice(0,2));
    const interests=Object.freeze([workInterest,hobbyName]);
    const intro=name+' '+custom+'.';
    const description=intro+' '+name+' '+habit+'. Outside work, '+name+' enjoys '+hobbyName+'.';
    const outsideWork=key==='repairer'?'I enjoy '+hobbyName+'. I can work out a gear ratio in my head, but I have to learn a tune one phrase at a time.':saying;
    const person={id,name,kind,identityKey:identityKey(reg.siteId,id),birthCommunityId:reg.siteId,birthTemperament:reg.birthTemperament,role:originRole,originRole,home:reg.region,description,interests,hobbyAxis,
      strengths,traits:temperament,aptitudes:Object.freeze(skills),bounds:Object.freeze(bounds),outsideWork};
    if(reg.hasAssignments){
      let task;
      if(key==='carrier'){
        const [,from,to]=id.split('-').map(Number);
        task=['Supply run '+(from+1)+' to '+(to+1),'Check the load for the run between lots '+(from+1)+' and '+(to+1),'Keep the next parcel on the agreed route','organisation'];
      }else{
        const options=assignments[key];
        const index=reg.workRotation!=null?(hash(reg.region+'|'+key)+reg.workRotation)%options.length:roll('working-responsibility',0,options.length-1);
        task=options[index];
      }
      if(task){
        const [label,duty,goal,axis]=task;
        person.workFocus=Object.freeze({label,duty,goal,axis});
        person.description=description+' '+name+' took responsibility for '+label.toLowerCase()+' in their first team.';
      }
    }
    if(key==='practice-nurse')person.qualificationIds=Object.freeze(['practice-nurse','nurse']);
    if(key==='surveyor')person.qualificationIds=Object.freeze(['surveyor']);
    if(root.EarthDreams)person.ambitionId=root.EarthDreams.preference(person);
    return Object.freeze(person);
  }
  function birthProfile(site,id){
    const reg=registry(site),slot=reg?.slots.get(id);
    if(!slot)return null;
    let result=reg.profiles.get(id);
    if(!result){result=makeProfile(reg,slot);reg.profiles.set(id,result);}
    return result;
  }
  function householdProfile(site,id,key){
    const reg=registry(site),slot=reg?.slots.get(id);
    if(slot?.kind!=='carrier'||!['practice-nurse','surveyor'].includes(key))return null;
    return makeProfile(reg,{...slot,key,kind:'household'});
  }
  function profile(site,id){
    return root.EarthCommunityLife?.profile?.(site,id)||birthProfile(site,id);
  }
  const porterSlots=new Set(baseSlots.filter(slot=>slot[2]==='carrier').map(slot=>slot[0]));
  const isPorterId=id=>porterSlots.has(id);
  function recordedPorters(site){
    const recorded=new Set();
    const add=id=>{if(isPorterId(id))recorded.add(id);};
    const agency=site.agency,projects=site.autonomy?.projects;
    add(site.pursuits?.ticket?.makerId);
    for(const id of Array.isArray(agency?.porters)?agency.porters:[])add(id);
    for(const [id,career] of Object.entries(site.careers||{})){
      if(career?.jobId||career?.training||career?.application||career?.agreedPlan||career?.history?.length||
        Object.keys(career?.qualifications||{}).length)add(id);
      add(career?.application?.coverId);add(career?.departure?.coverId);
    }
    for(const [id,life] of Object.entries(site.autonomy?.people||{}))if(life?.history?.length||life?.pastime||life?.advice||life?.ties?.length||life?.dream||life?.nextDream)add(id);
    for(const [id,project] of Object.entries(projects?.owners||{})){
      if(project?.progress||project?.volunteer||project?.finished)add(id);
      add(project?.partnerId);add(project?.beneficiaryId);add(project?.volunteer?.from);
    }
    for(const result of projects?.completed||[]){add(result?.ownerId);add(result?.partnerId);add(result?.beneficiaryId);}
    for(const id of Object.keys(site.purses?.people||{}))add(id);
    for(const row of agency?.arrangements?.rows||[]){add(row.actorId);add(row.requesterId);add(row.contactId);}
    for(const visit of agency?.visits||[]){add(visit?.from);add(visit?.to);}
    for(const meal of agency?.meals||[]){add(meal?.from);add(meal?.to);}
    for(const introduction of site.introductions?.rows||[]){add(introduction?.actorId);add(introduction?.guideId);add(introduction?.contactId);}
    for(const crate of site.provisions?.crates||[]){add(crate?.by);add(crate?.sourceBy);}
    for(const entry of site.fleet?.records||[]){add(entry?.actor);add(entry?.otherId);}
    const incident=site.fleet?.incident;
    if(incident){add(incident.actor);for(const w of incident.witnesses||[])add(w.id);for(const row of incident.statements||[])add(row.listener.id);}
    for(const id of Object.keys(site.fleet?.roster||{}))add(id);
    return recorded;
  }
  function retainsPorter(site,id){
    if(!site||!isPorterId(id))return false;
    // A retained account is already conclusive. The wider search matters for
    // a former route worker remembered only as somebody else's contact.
    if(site.purses?.people?.[id]||site.agency?.porters?.includes(id))return true;
    const career=site.careers?.[id],life=site.autonomy?.people?.[id];
    if(career?.jobId||career?.training||career?.application||career?.agreedPlan||career?.history?.length||
       life?.history?.length||life?.pastime||life?.dream||life?.ties?.length)return true;
    return recordedPorters(site).has(id);
  }
  function porterIds(site,links){
    if(!site)return [];
    const ids=recordedPorters(site);
    const live=links||(Array.isArray(site.buildings)?root.CommonEarthSim?.productiveLinks?.(site):null)||[];
    for(const link of live){const id='carrier-'+link.from+'-'+link.to;if(isPorterId(id))ids.add(id);}
    return Array.from(ids).sort();
  }
  function list(site,{includeCommuters=true}={}){
    if(!registry(site))return [];
    let porters;
    if(includeCommuters)porters=porterIds(site);
    else{
      // Visiting and resident carriers have local identity records. A historic
      // commuter without one cannot contribute to the household roster.
      const local=site.communityLife?.people||{};
      const candidates=Object.keys(local).filter(id=>isPorterId(id)&&local[id]);
      if(candidates.every(id=>site.agency?.porters?.includes(id)||site.purses?.people?.[id]))porters=candidates.sort();
      else porters=porterIds(site).filter(id=>local[id]);
    }
    const ids=['steward',...(site.residents||[]).map(p=>p.id),...walkerRoles.map((_,i)=>'walker-'+i),'driver',...porters];
    return ids.filter(id=>root.EarthCommunityLife?.present?.(site,id)!==false).map(id=>profile(site,id)).filter(Boolean);
  }
  root.EarthPersonas=Object.freeze({axes,traits,profile,birthProfile,householdProfile,identityKey,allocateBirthNames,validBirthNames,dutiesFor,validWorkFocus,list,retainsPorter,porterIds,isPorterId});
})(typeof window==='undefined'?globalThis:window);
