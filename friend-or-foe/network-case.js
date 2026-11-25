import {factHolds, reportHolds, explainReport, linkSentence, varyTestimony} from './network-reports.js';
import {networkFrames} from './network-data.js';
// One binary choice resolves both personal roles at each incident. The six
// incidents are independent; there are 64 possible complete social networks.
const names = ['Dex','Ivo','Luma','Mira','Nia','Orin','Pia','Sol','Tess','Vale'];
export {names as networkRoster};
const roles = ['friend','foe','spy','double','civilian','foreigner'];
const roleLabel = {friend:'Friend',foe:'Foe',spy:'Spy',double:'Double agent',civilian:'Civilian',foreigner:'Foreigner'};
const ids = ['D1','D2','I1','I2','H1','H2'];
const types = ['dispute','dispute','inquiry','inquiry','haven','haven'];
const queries = {
  end:'Trace the longest chain alternating aid and alerts. Shoot the first and last person.',
  shield:'Who received an alert from one person and then aided another? Shoot both go-betweens.',
  warning:'Start in an inquiry and end with aid. Shoot the first and last person of the longest chain alternating alerts and aid.',
  aid:'Start in a haven and end with an alert. Shoot the first and last person of the longest chain alternating aid and alerts.',
  send:'Who offered aid to one person and alerted another? Shoot the two sources.',
  receive:'Who received aid and an alert from two different people? Shoot the two recipients.',
  relay:'Who received aid from one person and alerted another? Shoot both go-betweens.',
  protected:'Who received aid from someone alerted by a third person? Shoot the two aid recipients.',
  informants:'Who alerted someone who then aided a third person? Shoot the two original sources.',
  alarm:'Who received an alert from someone aided by a third person? Shoot the two alert recipients.',
  instigators:'Who aided someone who then alerted a third person? Shoot the two original helpers.'
};
const worlds = Array.from({length:64},(_,i)=>i);
const otherRole = role => roles[roles.indexOf(role)^1];
const select = (array,draw) => array[Math.floor(draw()*array.length)];
function shuffle(array,draw) {
  const copy = [...array];
  for(let i=copy.length-1;i>0;i--){
    const j = Math.floor(draw()*(i+1));
    [copy[i],copy[j]] = [copy[j],copy[i]];
  }
  return copy;
}
function random(seed) {
  return () => { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
}
const boardOf = trial => trial.evidence ?? trial;
const channel = {friend:'help',foe:'pressure',spy:'pressure',double:'pressure',civilian:'help',foreigner:'help'};

function factText(role,actor,contact,anchor) {
  switch(role) {
    case 'friend': return actor+' gave supplies to '+contact;
    case 'foe': return contact+' challenged '+actor;
    case 'spy': return actor+' observed '+contact+' for '+anchor;
    case 'double': return actor+' leaked a report to '+contact+' as well as '+anchor;
    case 'civilian': return contact+' sheltered '+actor;
    case 'foreigner': return actor+' carried a request from '+contact+' to '+anchor;
  }
}
function shortFact(role,actor,contact,anchor) {
  switch(role) {
    case 'friend': return actor+' helped '+contact;
    case 'foe': return contact+' challenged '+actor;
    case 'spy': return actor+' watched '+contact+' for '+anchor;
    case 'double': return actor+' briefed '+contact+' + '+anchor;
    case 'civilian': return contact+' sheltered '+actor;
    case 'foreigner': return actor+' took '+contact+'’s request to '+anchor;
  }
}
export function describeFact(scene,actor,role) {
  const contact = scene.contacts[scene.members.indexOf(actor)];
  return {actor,role,incident:scene.id,contact,anchor:scene.anchor,
    text:factText(role,actor,contact,scene.anchor),short:shortFact(role,actor,contact,scene.anchor)};
}
function actualRole(scene,index,world,person) {
  return scene.members[(world>>index)&1]===person ? scene.role : otherRole(scene.role);
}
function incidentEdges(board,world) {
  const all=[];
  board.incidents.forEach((scene,i)=>scene.members.forEach((actor,member)=>{
    const role=actualRole(scene,i,world,actor);
    const contact=scene.contacts[member], host=scene.anchor;
    const add=(from,to,verb)=>all.push({from,to,role,incident:scene.id,channel:channel[role],verb});
    switch(role) {
      case 'friend': add(actor,contact,'gave supplies to'); break;
      case 'foe': add(contact,actor,'issued a challenge to'); break;
      case 'spy': add(contact,actor,'alerted'); add(actor,host,'sent intelligence to'); break;
      case 'double': add(actor,contact,'leaked the report to'); add(actor,host,'sent a report to'); break;
      case 'civilian': add(contact,actor,'sheltered'); break;
      case 'foreigner': add(contact,actor,'entrusted a request to'); add(actor,host,'delivered the request to'); break;
    }
  }));
  return all;
}
function evaluate(board,world,includeReasons=false,untyped=false) {
  const edges=incidentEdges(board,world), answer=new Set(),reasons=[];
  if (['end','warning','aid'].includes(board.query)) {
    let maximum=0, candidates=new Map();
    const walk=(trail,seen,used)=>{
      const first=trail[0].from, last=trail.at(-1);
      const fits=untyped || board.query==='end' || (board.query==='warning' ? last.channel==='help' : last.channel==='pressure');
      if(fits && trail.length>=2 && trail.length>=maximum) {
        if(trail.length>maximum){candidates.clear();maximum=trail.length;}
        candidates.set([first,last.to].sort().join('/'),trail);
      }
      for(const next of edges) if(next.from===last.to && (untyped || last.channel!==next.channel) &&
        !used.includes(next.incident) && !seen.includes(next.to))
        walk([...trail,next],[...seen,next.to],[...used,next.incident]);
    };
    edges.filter(e=>untyped || board.query==='end' || (board.query==='warning' ? ['spy','double'] : ['civilian','foreigner']).includes(e.role))
      .forEach(e=>walk([e],[e.from,e.to],[e.incident]));
    if(candidates.size===1){
      const trail=[...candidates.values()][0];
      answer.add(trail[0].from);answer.add(trail.at(-1).to);
      if(includeReasons) reasons.push('The longest alternating chain runs '+[trail[0].from,...trail.map(a=>a.to)].join(' → ')+'.');
    }
  } else {
    for(const a of edges) for(const b of edges) {
      if((!untyped && a.channel===b.channel) || a.incident===b.incident)continue;
      let target;
      if(board.query==='relay' && (untyped||a.channel==='help') && a.to===b.from && a.from!==b.to) target=a.to;
      if(board.query==='shield' && (untyped||a.channel==='pressure') && a.to===b.from && a.from!==b.to) target=a.to;
      if(a.to===b.from && a.from!==b.to) {
        if((board.query==='protected' && (untyped||a.channel==='pressure')) || (board.query==='alarm' && (untyped||a.channel==='help'))) target=b.to;
        if((board.query==='informants' && (untyped||a.channel==='pressure')) || (board.query==='instigators' && (untyped||a.channel==='help'))) target=a.from;
      }
      if(board.query==='receive' && a.to===b.to && a.from!==b.from) target=a.to;
      if(board.query==='send' && a.from===b.from && a.to!==b.to) target=a.from;
      if(target && !answer.has(target)){
        answer.add(target);
        if(includeReasons) reasons.push(target+' — '+a.from+' '+a.verb+' '+a.to+', and '+b.from+' '+b.verb+' '+b.to+'.');
      }
    }
  }
  return {pair:[...answer].sort(),reasons};
}
function possible(board,omitIndex) {
  return worlds.filter(w => board.reports.every((r,i)=>i===omitIndex || reportHolds(board,r,w)));
}
function dutyPairs(board,w) {
  const roster=Object.fromEntries(roles.map(r=>[r,[]]));
  board.incidents.forEach((s,i)=>s.members.forEach(m=>roster[actualRole(s,i,w,m)].push(m)));
  return roster;
}
export function caseRoles(trial) {
  const board=boardOf(trial), candidates=possible(board);
  return candidates.length===1 ? dutyPairs(board,candidates[0]) : Object.fromEntries(roles.map(r=>[r,[]]));
}
export function possibleNetworkPairs(trial,omitIndex) {
  const board=boardOf(trial), answers=new Map();
  for(const w of possible(board,omitIndex)){
    const pair=evaluate(board,w).pair;
    if(pair.length===2 && pair.join('/')!==[...(board.previousPair??[])].sort().join('/'))answers.set(pair.join('/'),pair);
  }
  return [...answers.values()];
}

function descriptions(board,index,w) {
  const scene=board.incidents[index], slot=(w>>index)&1;
  return factText(scene.role,scene.members[slot],scene.contacts[slot],scene.anchor);
}
function explain(board,w) {
  const record=board.reports.find(r=>r.kind==='record');
  const base=worlds.filter(u=>reportHolds(board,record,u));
  const text = record.source ? record.source.short+' and '+record.claim.short : explainReport(board,record,w);
  const proof=['The verified record establishes that '+text.replace(/[.]$/,'')+'.'];
  const sourceName = r => r.source.actor+'’s '+r.source.incident+' account';
  const witnesses=board.reports.map((r,i)=>({r,i})).filter(({r})=>r!==record);
  for (const one of witnesses) {
    for (const two of witnesses) {
      if (two.i <= one.i) continue;
      const withOne=base.filter(u=>reportHolds(board,one.r,u)), withTwo=base.filter(u=>reportHolds(board,two.r,u));
      const withBoth=withOne.filter(u=>reportHolds(board,two.r,u));
      const free=(set,i)=>set.some(u=>((u^w)>>i)&1);
      const pivot=board.incidents.findIndex((_,i)=>free(withOne,i)&&free(withTwo,i)&&!free(withBoth,i));
      if(pivot<0)continue;
      const wrong=base.filter(u=>((u^w)>>pivot)&1);
      const a=wrong.filter(u=>reportHolds(board,one.r,u)), b=wrong.filter(u=>reportHolds(board,two.r,u));
      const conflict=board.incidents.findIndex((_,i)=>a.every(u=>!((u^a[0])>>i&1)) &&
        b.every(u=>!((u^b[0])>>i&1)) && ((a[0]^b[0])>>i&1));
      if(conflict>=0){
        proof.push('Suppose '+descriptions(board,pivot,w^(1<<pivot))+'. '+sourceName(one.r)+
          ' would then require that '+descriptions(board,conflict,a[0])+', while '+sourceName(two.r)+
          ' would require that '+descriptions(board,conflict,b[0])+'. Both cannot hold, so '+descriptions(board,pivot,w)+'.');
      }else{
        proof.push('Taken alone, '+sourceName(one.r)+' and '+sourceName(two.r)+' each allow either participant in '+
          board.incidents[pivot].id+'. Taken together they establish that '+descriptions(board,pivot,w)+'.');
      }
      break;
    }
    if(proof.length>1)break;
  }
  const mismatch=witnesses.find(({r})=>!factHolds(board,r.source,w));
  if(mismatch) proof.push(mismatch.r.source.actor+' falsely claimed to be the '+
    roleLabel[mismatch.r.source.role].toLowerCase()+'. '+explainReport(board,mismatch.r,w));
  return [...proof,...evaluate(board,w,true).reasons];
}
export function resolvedNetwork(trial) {
  const board=boardOf(trial), matches=possible(board);
  if(matches.length!==1)return [];
  const w=matches[0],edges=incidentEdges(board,w);
  return board.incidents.map((scene,i)=>({...scene,assignments:scene.members.map((name,j)=>{
    const role=actualRole(scene,i,w,name), contact=scene.contacts[j];
    return {name,role,contact,text:factText(role,name,contact,scene.anchor)};
  }),edges:edges.filter(e=>e.incident===scene.id)}));
}
export function winningNetworkRoutes(trial) {
  const board=boardOf(trial), matches=possible(board);
  return matches.length===1 ? evaluate(board,matches[0],true).reasons : [];
}
export function explainNetworkAnswer(trial) {
  return winningNetworkRoutes(trial).join(' ');
}
function correctedFact(board,fact,w) {
  if(fact.kind==='link')return explainReport(board,{claim:fact},w);
  const i=board.incidents.findIndex(s=>s.id===fact.incident),scene=board.incidents[i];
  const actual=actualRole(scene,i,w,fact.actor);
  return describeFact(scene,fact.actor,actual).text+'.';
}
export function explainNetworkConflict(trial,shotName) {
  const board=boardOf(trial), solutions=possible(board);
  if(solutions.length!==1)return '';
  const w=solutions[0], actual=evaluate(board,w);
  let nearest=null;
  for(const u of worlds) {
    const p=evaluate(board,u).pair;
    if(p.length!==2 || p.every(n=>actual.pair.includes(n)) || (shotName&&!p.includes(shotName)))continue;
    const broken=board.reports.filter(r=>!reportHolds(board,r,u));
    if(broken.length && (!nearest || broken.length<nearest.broken.length)) nearest={p,u,broken};
  }
  if(!nearest) return shotName ? 'No pair that fits this order includes '+shotName+'.' : '';
  const {p,u,broken}=nearest,r=broken[0];
  const opening='One route to '+p.join(' and ')+' contradicts ';
  if(r.kind==='record') {
    const contradicted=r.source && !factHolds(board,r.source,u) ? r.source : r.claim;
    return opening+'the verified record. It establishes that '+contradicted.short.replace(/[.]$/,'')+'.';
  }
  const trueSource=factHolds(board,r.source,u);
  const why=trueSource?' with a false statement. ':' with a true statement. ';
  const credential=trueSource?' a genuine ':' a false ';
  return 'One route to '+p.join(' and ')+' gives '+r.source.actor+credential+
    r.source.incident+' '+roleLabel[r.source.role]+' credential'+why+correctedFact(board,r.claim,u);
}
export function solveNetworkTrial(trial) {
  const board=boardOf(trial), matches=possible(board).filter(w=>evaluate(board,w).pair.length===2);
  if(matches.length!==1)return {pair:[],proof:[]};
  return {pair:evaluate(board,matches[0]).pair,proof:explain(board,matches[0])};
}
function randomFrame(draw) {
  const cast=shuffle(names,draw), bag=shuffle([...cast,...cast.slice(0,2)],draw);
  const incidents=[], seen=new Map();
  for(let i=0;i<6;i++){
    const members=bag.slice(2*i,2*i+2);
    if(members[0]===members[1]||members.some(n=>seen.get(n)?.group===(i>>1)))return null;
    const contacts=[];
    for(const member of members){
      const pool=cast.filter(n=>!members.includes(n) && !contacts.includes(n) && n!==seen.get(member)?.contact);
      contacts.push(select(pool,draw));
    }
    members.forEach((n,j)=>seen.set(n,{group:i>>1,contact:contacts[j]}));
    const anchor=select(cast.filter(n=>!members.includes(n)&&!contacts.includes(n)),draw);
    const label=types[i]==='dispute'?'Aid and accusation':types[i]==='inquiry'?'Observation and disclosure':'Shelter and passage';
    const actions={'dispute':['supplies to personal contact','challenge from personal contact'],'inquiry':['observe contact for handler','report to contact and handler'],'haven':['sheltered by personal contact','carry contact’s request to host']};
    incidents.push({id:ids[i],type:types[i],role:roles[i],members,contacts,anchor:types[i]==='dispute'?null:anchor,label,actions:actions[types[i]]});
  }
  return {roster:names.slice(),incidents};
}

// Neighbouring arrangements differ in several actual relationships. This
// supplies additional layouts for orders that are rare in random casts.
export function materializeLayout(code) {
  const scale=4294967296;
  const original=code<scale?code:Math.floor((code-scale)/65536);
  const base=randomFrame(random(Math.imul(original,2654435761)>>>0));
  if(!base || code<scale)return base;
  const draw=random((code-scale)%65536);
  const slots=shuffle(Array.from({length:18},(_,i)=>i),draw);
  let changes=0;
  for(const slot of slots) {
    const index=Math.floor(slot/3),part=slot%3,scene=base.incidents[index];
    if(part===2) {
      if(!scene.anchor)continue;
      scene.anchor=select(names.filter(n=>!scene.members.includes(n)&&!scene.contacts.includes(n)&&n!==scene.anchor),draw);
    }else{
      const name=scene.members[part];
      const elsewhere=base.incidents.filter(s=>s!==scene && s.members.includes(name)).map(s=>s.contacts[s.members.indexOf(name)]);
      const choices=names.filter(n=>!scene.members.includes(n)&&!scene.contacts.includes(n)&&!elsewhere.includes(n)&&n!==scene.anchor);
      scene.contacts[part]=select(choices,draw);
    }
    if(++changes===3)break;
  }
  return base;
}

// The offline author uses the same public interpretation of a possible cast.
export function evaluateNetworkCandidate(evidence,world,untyped=false) {
  return evaluate(evidence,world,false,untyped).pair;
}

// Stored report facts use the scene, role and endpoint, never a pre-rendered
// name. Renaming the cast or changing the display order preserves each claim.
export const orderIds=['end','shield','warning','aid','send','receive','relay','protected','informants','alarm','instigators'];
function readSelector(code,incidentNames) {
  return {incident:incidentNames[Math.floor(code/12)],role:roles[(code>>1)%6],end:code%2?'contact':'actor'};
}
function readFact(code,scenes,incidentNames) {
  if(code === -1)return null;
  if(Array.isArray(code)) {
    const left=readSelector(code[0],incidentNames),right=readSelector(code[1],incidentNames),negated=!!code[2];
    const text=linkSentence(left,right,negated);
    return {kind:'link',left,right,negated,text,short:text};
  }
  const scene=scenes[Math.floor(code/12)],member=code%2;
  return describeFact(scene,scene.members[member],roles[(code>>1)%6]);
}
function makeDeck(draw,priorQuery) {
  // Several orders can use the same underlying incidents. Deal each layout
  // seed once before the next shuffle, even when its reports or order differ.
  const seen=new Set(), byQuery=new Map();
  for(const i of shuffle(networkFrames.map((_,index)=>index),draw)) {
    const [seed,q]=networkFrames[i];
    if(seen.has(seed))continue;
    seen.add(seed);
    if(!byQuery.has(q))byQuery.set(q,[]);
    byQuery.get(q).push(i);
  }
  const deck=[], total=seen.size, recent=[];
  const weights=new Map([...byQuery].map(([q,g])=>[q,g.length]));
  let last=orderIds.indexOf(priorQuery);
  while(byQuery.size) {
    let decision,priority=-Infinity;
    for(const [query,group] of byQuery) {
      const weight=weights.get(query),dealt=weight-group.length;
      const deficit=(deck.length+1)*weight/total-dealt;
      const score=deficit + draw()*.35 - Number(query===last)*.18;
      if(score>priority){priority=score;decision=query;}
    }
    const group=byQuery.get(decision);
    const parentOf = index => {
      const code=networkFrames[index][0];
      return code<4294967296 ? code : Math.floor((code-4294967296)/65536);
    };
    const eligible=group.findLastIndex(index=>!recent.includes(parentOf(index)));
    const position=eligible<0?group.length-1:eligible;
    const chosen=group[position];
    group[position]=group.at(-1);group.pop();deck.push(chosen);
    recent.push(parentOf(chosen));if(recent.length>28)recent.shift();
    if(!group.length)byQuery.delete(decision);
    last=decision;
  }
  return deck;
}
const outcomesCache=new WeakMap();
function outcomesFor(entry,blueprint,query) {
  if(!outcomesCache.has(entry)) {
    outcomesCache.set(entry,worlds.map(w=>evaluate({...blueprint,query},w).pair));
  }
  return outcomesCache.get(entry);
}
function renameCast(entry,blueprint,query,previousPair,draw) {
  const shuffled=shuffle(names,draw);
  if(previousPair.length===2) {
    // Assign the old pair two positions that can never be a valid answer for
    // this particular order. No previous answer can remove a clue's rival.
    const possible=new Set(outcomesFor(entry,blueprint,query).filter(p=>p.length===2).map(p=>p.join('/')));
    const unused=[];
    names.forEach((a,i)=>names.slice(i+1).forEach(b=>{
      if(!possible.has([a,b].sort().join('/')))unused.push([a,b]);
    }));
    if(unused.length) {
      const slots=shuffle(select(unused,draw),draw);
      previousPair.forEach((person,i)=>{
        const from=shuffled.indexOf(person),to=names.indexOf(slots[i]);
        [shuffled[from],shuffled[to]]=[shuffled[to],shuffled[from]];
      });
    }
  }
  return Object.fromEntries(names.map((n,i)=>[n,shuffled[i]]));
}
export function makeNetworkTrial(previous=null,randomSource=Math.random) {
  const number=(previous?.number??0)+1;
  const draw=random((Math.floor(randomSource()*4294967296)^Math.imul(number,2654435761))>>>0);
  const previousPair=previous?.pair??[];
  const previousDeck=previous?.deck;
  const needsDeck=!previousDeck || previousDeck.next>=previousDeck.entries.length;
  const deck=needsDeck ? {entries:makeDeck(draw,previous?.evidence?.query),next:0} : previousDeck;
  const entry=networkFrames[deck.entries[deck.next]], query=orderIds[entry[1]];
  const blueprint=materializeLayout(entry[0]);
  const renaming=renameCast(entry,blueprint,query,previousPair,draw);
  const incidentNames=ids.map((id,i)=>id);
  for(let i=0;i<6;i+=2) if(draw()<.5)[incidentNames[i],incidentNames[i+1]]=[incidentNames[i+1],incidentNames[i]];
  const scenes=blueprint.incidents.map((s,i)=>({...s,id:incidentNames[i],members:s.members.map(n=>renaming[n]),
    contacts:s.contacts.map(n=>renaming[n]),anchor:s.anchor?renaming[s.anchor]:null}));
  const [,codes,allowedMasks]=select(entry.slice(2),draw);
  const canonicalReports=codes.map(([kind,source,claim])=>{
    const report={kind:kind?'witness':'record',source:readFact(source,scenes,incidentNames),claim:readFact(claim,scenes,incidentNames)};
    report.text=report.kind==='record'?'Verified at the scene.':'An authentic source tells the truth. An impostor lies.';
    return report;
  });
  const witnessRows=codes.map(([isWitness],i)=>isWitness?i:-1).filter(i=>i>=0);
  const choices=Array.from({length:1<<witnessRows.length},(_,i)=>i).filter(i=>((allowedMasks??1)>>i)&1);
  const choice=select(choices,draw);
  const surfaceMask=witnessRows.reduce((mask,index,n)=>mask|(((choice>>n)&1)<<index),0);
  const reports=shuffle(varyTestimony({incidents:scenes},canonicalReports,draw,surfaceMask),draw);
  const incidents=scenes.map(scene=>draw()<.5 ? {...scene,members:scene.members.slice().reverse(),contacts:scene.contacts.slice().reverse()} : scene)
    .sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id));
  const evidence={roster:names.slice(),incidents,reports,query,order:queries[query],previousPair:previousPair.slice()};
  const {pair,proof}=solveNetworkTrial(evidence);
  if(pair.length!==2)throw new Error('Invalid verified social case.');
  return {number,roster:evidence.roster.slice(),evidence,pair,proof,deck:{entries:deck.entries,next:deck.next+1}};
}
