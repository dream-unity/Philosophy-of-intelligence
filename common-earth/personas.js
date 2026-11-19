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
    carrier:['Supply porter','stamina','organisation','packs fragile goods on top and leaves a signed receipt at both ends of the run','packing and dispatch']
  };
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
    const fingerprint=JSON.stringify([site.id,site.foundingRevision,site.lat,site.lon,region,
      pupils.map(p=>[p.id,p.slot,p.name,p.role])]);
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
    const seed=[site.id,site.lat,site.lon,region].join('|');
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
    baseSlots.forEach(([id,key,kind],index)=>slots.set(id,{id,key,kind,ordinal:index,name:nextName(index)}));
    pupils.forEach((person,index)=>{
      const slot=Number.isInteger(person.slot)?person.slot:index;
      const key=['grower','repairer','convenor'][slot]||'steward';
      slots.set(person.id,{id:person.id,name:person.name,key,kind:'resident',ordinal:baseSlots.length+slot,originRole:person.role});
    });
    return {seed,region,slots,profiles:new Map(),pastimes:shuffled(pastimes,seed+'interests'),
      musician:'walker-'+(hash(seed+'performer')%5)};
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
    if(id===reg.musician)setRange('music',67,81,87,98);
    for(const axis of axes)Object.freeze(bounds[axis]);
    const strengths=Object.freeze(axes.slice().sort((a,b)=>skills[b]-skills[a]).slice(0,2));
    const interests=Object.freeze([workInterest,hobbyName]);
    const intro=name+' '+custom+'.';
    const description=intro+' '+name+' '+habit+'. Outside work, '+name+' enjoys '+hobbyName+'.';
    const outsideWork=key==='repairer'?'I enjoy '+hobbyName+'. I can work out a gear ratio in my head, but I have to learn a tune one phrase at a time.':saying;
    return Object.freeze({id,name,kind,role:originRole,originRole,home:reg.region,description,interests,hobbyAxis,
      strengths,traits:temperament,aptitudes:Object.freeze(skills),bounds:Object.freeze(bounds),outsideWork});
  }
  function profile(site,id){
    const reg=registry(site),slot=reg?.slots.get(id);
    if(!slot)return null;
    let result=reg.profiles.get(id);
    if(!result){result=makeProfile(reg,slot);reg.profiles.set(id,result);}
    return result;
  }
  const porterSlots=new Set(baseSlots.filter(slot=>slot[2]==='carrier').map(slot=>slot[0]));
  const isPorterId=id=>porterSlots.has(id);
  function recordedPorters(site){
    const recorded=new Set();
    const add=id=>{if(isPorterId(id))recorded.add(id);};
    const agency=site.agency,projects=site.autonomy?.projects;
    for(const id of Array.isArray(agency?.porters)?agency.porters:[])add(id);
    for(const [id,career] of Object.entries(site.careers||{})){
      if(career?.jobId||career?.training||career?.application||career?.agreedPlan||career?.history?.length||
        Object.keys(career?.qualifications||{}).length)add(id);
      add(career?.application?.coverId);add(career?.departure?.coverId);
    }
    for(const [id,life] of Object.entries(site.autonomy?.people||{}))if(life?.history?.length||life?.pastime||life?.advice)add(id);
    for(const [id,project] of Object.entries(projects?.owners||{})){
      if(project?.progress||project?.volunteer||project?.finished)add(id);
      add(project?.partnerId);add(project?.beneficiaryId);add(project?.volunteer?.from);
    }
    for(const result of projects?.completed||[]){add(result?.ownerId);add(result?.partnerId);add(result?.beneficiaryId);}
    for(const id of Object.keys(site.purses?.people||{}))add(id);
    for(const visit of agency?.visits||[]){add(visit?.from);add(visit?.to);}
    for(const meal of agency?.meals||[]){add(meal?.from);add(meal?.to);}
    for(const introduction of site.introductions?.rows||[]){add(introduction?.actorId);add(introduction?.guideId);add(introduction?.contactId);}
    for(const crate of site.provisions?.crates||[]){add(crate?.by);add(crate?.sourceBy);}
    for(const entry of site.fleet?.records||[]){add(entry?.actor);add(entry?.otherId);}
    for(const id of Object.keys(site.fleet?.roster||{}))add(id);
    return recorded;
  }
  function retainsPorter(site,id){
    return Boolean(site&&isPorterId(id)&&recordedPorters(site).has(id));
  }
  function porterIds(site,links){
    if(!site)return [];
    const ids=recordedPorters(site);
    const live=links||(Array.isArray(site.buildings)?root.CommonEarthSim?.productiveLinks?.(site):null)||[];
    for(const link of live){const id='carrier-'+link.from+'-'+link.to;if(isPorterId(id))ids.add(id);}
    return Array.from(ids).sort();
  }
  function list(site){
    if(!registry(site))return [];
    const ids=['steward',...(site.residents||[]).map(p=>p.id),...walkerRoles.map((_,i)=>'walker-'+i),'driver',...porterIds(site)];
    return ids.map(id=>profile(site,id)).filter(Boolean);
  }
  root.EarthPersonas=Object.freeze({axes,traits,profile,list,retainsPorter,porterIds,isPorterId});
})(typeof window==='undefined'?globalThis:window);
