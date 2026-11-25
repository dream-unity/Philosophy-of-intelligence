import {makeNetworkTrial, materializeLayout, solveNetworkTrial} from './network-case.js';
import {networkFrames} from './network-data.js';
import {easyLayouts,mediumLayouts} from './practice-layouts.js';

// Take the encounter with the personal contact from each role in a Hard layout.
// Arrows always follow the direction in which aid or an alert travels.
const roles = [
  {role:'friend', label:'Friend', verb:'helped', channel:'aid', actorSends:true},
  {role:'foe', label:'Foe', verb:'challenged', channel:'alert', actorSends:false},
  {role:'spy', label:'Spy', verb:'alerted the spy', channel:'alert', actorSends:false},
  {role:'double', label:'Double agent', verb:'briefed', channel:'alert', actorSends:true},
  {role:'civilian', label:'Civilian', verb:'sheltered', channel:'aid', actorSends:false},
  {role:'foreigner', label:'Foreigner', verb:'gave a request to', channel:'aid', actorSends:false}
];
const twoSteps = [['aid','alert'], ['alert','aid']];
const threeSteps = [
  ['aid','alert','aid'], ['alert','aid','alert'],
  ['aid','aid','alert'], ['alert','alert','aid'],
  ['aid','alert','alert'], ['alert','aid','aid']
];
const layouts = [...new Map(networkFrames.map(frame => [frame[0],frame])).values()];
const choice = (items,draw) => items[Math.floor(draw()*items.length)];

function shuffle(items,draw) {
  const values=items.slice();
  for (let i=values.length-1;i>0;i--) {
    const j=Math.floor(draw()*(i+1));
    [values[i],values[j]]=[values[j],values[i]];
  }
  return values;
}

function random(seed) {
  return () => {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    return seed/4294967296;
  };
}

function personalLinks(layout,world) {
  const rows=roles.map(({role,label,verb,channel}) => ({role,label,verb,channel,links:[],disputed:false}));
  layout.incidents.forEach((scene,i) => {
    const primary=(world>>i)&1;
    scene.members.forEach((actor,j) => {
      const roleIndex=j===primary ? i : i^1;
      const contact=scene.contacts[j];
      const link=roles[roleIndex].actorSends ? {from:actor,to:contact} : {from:contact,to:actor};
      rows[roleIndex].links.push(link);
    });
  });
  return rows;
}

function routesFor(rows,steps) {
  const routes=[];
  function extend(names,i) {
    if (i===steps.length) { routes.push(names); return; }
    for (const row of rows) {
      if (row.channel!==steps[i]) continue;
      for (const {from,to} of row.links) {
        if (!i) extend([from,to],1);
        else if (from===names.at(-1) && !names.includes(to)) extend([...names,to],i+1);
      }
    }
  }
  extend([],0);
  return routes;
}

const namesAt=(routes,pick) => [...new Set(routes.map(route => route[pick]))].sort();
const pairKey=names => names.slice().sort().join('/');
function swapReceivers(row) {
  return {...row,links:row.links.map(({from},i) => ({from,to:row.links[1-i].to}))};
}

function crediblySwappable({links:[a,b]}) {
  return a.from!==b.from && a.to!==b.to && a.from!==b.to && b.from!==a.to;
}

function orderText(steps,pick) {
  const positions=steps.length===2 ? ['senders at the start','people in the middle','final receivers'] :
    ['senders at the start','people after step one','people after step two','final receivers'];
  return 'Follow '+steps.join(' → ')+'. Shoot both '+positions[pick]+'.';
}

// Resolve only what the player can see. The disputed row publishes two sets;
// neither the ordering of the receivers nor the order of the witnesses is evidence.
export function solveLevelEvidence(evidence) {
  if (!evidence.level || evidence.level==='hard') return solveNetworkTrial(evidence);
  const proof=[];
  let rows=evidence.rows;
  if (evidence.level==='medium') {
    const disputed=rows.find(row => row.disputed);
    const confirmed=rows.find(row => row.role===evidence.trust.role && !row.disputed);
    const witness=confirmed?.links.find(link => link.to===evidence.trust.to)?.from;
    const report=evidence.reports.find(line => line.speaker===witness);
    if (!disputed || !report) return {pair:[],proof:[]};
    const linked=disputed.links.find(link => link.from===report.from);
    if (!linked || !disputed.links.some(link => link.to===report.to)) return {pair:[],proof:[]};
    if (linked.to!==report.to) rows=rows.map(row => row===disputed ? swapReceivers(row) : row);
    proof.push(witness+' sent to '+evidence.trust.to+' in the '+confirmed.label+' row. That confirms '+report.from+' → '+report.to+' in the disputed row.');
  }
  const routes=routesFor(rows,evidence.steps);
  const pair=namesAt(routes,evidence.pick);
  for (const name of pair) {
    const route=routes.find(path => path[evidence.pick]===name);
    let path=route[0];
    for (const [i,step] of evidence.steps.entries()) path+=' —'+step+'→ '+route[i+1];
    proof.push(name+' · '+path);
  }
  return {pair,proof};
}

function findOrder(rows,level,draw,previousOrder) {
  const simplePairs=new Set(rows.flatMap(row => ['from','to'].map(end => pairKey(row.links.map(link=>link[end])))));
  const medium=level==='medium';
  const swaps=medium ? shuffle(rows.filter(crediblySwappable),draw).map(row => ({
    row, alternate:rows.map(r=>r===row ? swapReceivers(row) : r)
  })) : [];
  const candidates=[];
  for (const steps of (medium ? threeSteps : twoSteps)) {
    const routes=routesFor(rows,steps);
    if (routes.length<2) continue;
    const prefix=routesFor(rows,steps.slice(0,-1)), suffix=routesFor(rows,steps.slice(1));
    const alternatives=swaps.map(swap => ({row:swap.row,routes:routesFor(swap.alternate,steps)}));
    for (let pick=0;pick<=steps.length;pick++) {
      const pair=namesAt(routes,pick);
      if (pair.length!==2 || simplePairs.has(pairKey(pair))) continue;
      // Shortening the trail at either end must introduce a decoy whenever
      // the marked position still exists in the shortened trail.
      if (pick<steps.length && namesAt(prefix,pick).length<=2) continue;
      if (pick>0 && namesAt(suffix,pick-1).length<=2) continue;
      if (!medium) candidates.push({steps,pick,pair});
      else for (const alternative of alternatives) {
        const other=namesAt(alternative.routes,pick);
        if (other.length===2 && !other.some(name=>pair.includes(name))) {
          candidates.push({steps,pick,pair,rival:other,dispute:alternative.row.role});
        }
      }
    }
  }
  const fresh=candidates.filter(item => orderText(item.steps,item.pick)!==previousOrder);
  return choice(fresh.length?fresh:candidates,draw);
}

function nameRows(rows,roster,query,previousPair,draw) {
  const cast=shuffle(roster,draw);
  const plausible=[query.pair,...(query.rival ? [query.rival] : [])];
  const repeat=previousPair && plausible.find(pair=>pairKey(pair.map(n=>cast[roster.indexOf(n)]))===pairKey(previousPair));
  if (repeat) {
    const inside=roster.indexOf(choice(repeat,draw));
    const outsiders=roster.filter(n=>!plausible.some(pair=>pair.includes(n)));
    const outside=roster.indexOf(choice(outsiders,draw));
    [cast[inside],cast[outside]]=[cast[outside],cast[inside]];
  }
  const rename=new Map(roster.map((name,i)=>[name,cast[i]]));
  return rows.map(row => ({...row,links:shuffle(row.links.map(({from,to})=>({from:rename.get(from),to:rename.get(to)})),draw)}));
}

function addTestimony(evidence,dispute,draw) {
  const uncertain=evidence.rows.find(row=>row.role===dispute);
  const supported=choice(evidence.rows.filter(row=>row!==uncertain &&
    row.links[0].from!==row.links[1].from && row.links[0].to!==row.links[1].to),draw);
  const [reliable,other]=shuffle(supported.links,draw);
  const [fact,rival]=shuffle(uncertain.links,draw);
  evidence.trust={role:supported.role,to:reliable.to,text:'Trust the sender to '+reliable.to+' in the '+supported.label+' row.'};
  evidence.reports=shuffle([
    {speaker:reliable.from,from:fact.from,to:fact.to},
    {speaker:other.from,from:fact.from,to:rival.to}
  ],draw);
  // Sort each column independently, so even inspecting the public raw data
  // supplies no additional information about which two links are genuine.
  const senders=uncertain.links.map(l=>l.from).sort(), receivers=uncertain.links.map(l=>l.to).sort();
  uncertain.links=senders.map((from,i)=>({from,to:receivers[i]}));
  uncertain.disputed=true;
}

// Keep each person's two roles on different encounters. For a new practice
// layout only the personal contacts change; the direction of each role stays
// exactly as it does on Hard.
function practiceLayout(code) {
  const index=code%layouts.length, entry=layouts[index], variant=Math.floor(code/layouts.length);
  const geometry=materializeLayout(entry[0]);
  const draw=random((Math.imul(code+1,2654435761)^0xa12df123)>>>0);
  if (variant>1) {
    const seen=new Map();
    for (const scene of geometry.incidents) {
      const contacts=[];
      for (const actor of scene.members) {
        const options=geometry.roster.filter(name=>!scene.members.includes(name) && !contacts.includes(name) &&
          name!==scene.anchor && name!==seen.get(actor));
        const contact=choice(options,draw);
        contacts.push(contact);
        seen.set(actor,contact);
      }
      scene.contacts=contacts;
    }
  }
  return {rows:personalLinks(geometry,entry[2+(variant%2)][0]),roster:geometry.roster};
}

function candidateFor(code,level,draw,previousOrder) {
  const {rows,roster}=practiceLayout(code);
  const query=findOrder(rows,level,draw,previousOrder);
  return query ? {query,rows,roster} : null;
}

export function makeLevelTrial(level,previous=null,randomSource=Math.random) {
  if (level==='hard') return makeNetworkTrial(previous?.level && previous.level!=='hard' ? null : previous,randomSource);
  if (level!=='easy' && level!=='medium') throw new RangeError('Choose Easy, Medium or Hard.');
  if (previous?.level!==level) previous=null;
  const number=(previous?.number??0)+1;
  const draw=random((Math.floor(randomSource()*4294967296)^Math.imul(number,2654435761))>>>0);
  const previousDeck=previous?.level===level ? previous.deck : null;
  const newDeck=!previousDeck || previousDeck.next>=previousDeck.entries.length;
  const deck=newDeck ? {entries:shuffle(level==='medium'?mediumLayouts:easyLayouts,draw),next:0} : previousDeck;
  const code=deck.entries[deck.next];
  const candidate=candidateFor(code,level,draw,previous?.evidence?.order);
  if (!candidate) throw new Error('The practice layout no longer matches its certified order.');
  const {query,rows,roster}=candidate;
  const evidence={
    level, roster:roster.slice(), order:orderText(query.steps,query.pick),
    steps:query.steps.slice(), pick:query.pick, rows:nameRows(rows,roster,query,previous?.pair,draw),
    trust:null, reports:[]
  };
  if (level==='medium') addTestimony(evidence,query.dispute,draw);
  const {pair,proof}=solveLevelEvidence(evidence);
  return {level,number,roster:evidence.roster.slice(),evidence,pair,proof,deck:{entries:deck.entries,next:deck.next+1}};
}
