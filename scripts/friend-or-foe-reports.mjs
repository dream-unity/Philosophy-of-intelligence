import {groundedFact, linkSentence, oppositeRole, resolveEndpoint} from '../friend-or-foe/network-reports.js';

const allWorlds = Array.from({length:64}, (_,i) => i);
const flags = allWorlds.map(i => 1n << BigInt(i));
const full = (1n << 64n) - 1n;
const ambient = Array.from({length:6}, (_,scene) => allWorlds.reduce((mask,w) =>
  ((w >> scene) & 1) ? mask | flags[w] : mask, 0n));
const pick = (items, draw) => items[Math.floor(draw()*items.length)];
function shuffled(items, draw) {
  const list = items.slice();
  for (let i=list.length-1; i>0; i--) {
    const k = Math.floor(draw()*(i+1));
    [list[i],list[k]]=[list[k],list[i]];
  }
  return list;
}
function groundTable(evidence) {
  return evidence.incidents.map((s,i)=>[0,1].map(bit=>({
    mask:bit?ambient[i]:full^ambient[i],
    facts:[groundedFact(s,s.role,bit),groundedFact(s,oppositeRole(s.role),bit^1)]
  })));
}
function linkTable(evidence) {
  const table=new Map();
  const endpoints=evidence.incidents.map(s=>[s.role,oppositeRole(s.role)].flatMap(role=>
    ['actor','contact'].map(end=>({incident:s.id,role,end}))));
  for(let a=0;a<6;a++) for(let b=0;b<6;b++){
    if(a===b||evidence.incidents[a].type===evidence.incidents[b].type)continue;
    for(const left of endpoints[a])for(const right of endpoints[b]){
      if(left.end!=='contact' && right.end!=='contact')continue;
      let hits=0,mask=0n;
      for(let av=0;av<2;av++)for(let bv=0;bv<2;bv++){
        const w=(av<<a)|(bv<<b);
        if(resolveEndpoint(evidence,left,w)!==resolveEndpoint(evidence,right,w))continue;
        hits++;
        mask|=(av?ambient[a]:full^ambient[a]) & (bv?ambient[b]:full^ambient[b]);
      }
      // A unique overlap fixes two roles when true and has three explanations
      // when false. A second kind of overlap compares both possible contacts.
      if(hits!==1 && hits!==2)continue;
      const key=a+','+b+','+mask;
      if(!table.has(key))table.set(key,{a,b,mask,hits,variants:[]});
      table.get(key).variants.push({left,right});
    }
  }
  return [...table.values()];
}
const compiled=new WeakMap();
function predicates(board) {
  if(!compiled.has(board))compiled.set(board,{grounds:groundTable(board),links:linkTable(board)});
  return compiled.get(board);
}
export function reportChoices(board,winner) {
  const {grounds,links}=predicates(board), choices=new Map();
  const add=(mask,descriptor)=>{
    const existing=choices.get(mask);
    if(existing)existing.options.push(descriptor);
    else choices.set(mask,{mask,options:[descriptor]});
  };
  const bit=(index)=>(winner>>index)&1;
  for(let i=0;i<6;i++)for(let j=i+1;j<6;j++){
    const a=grounds[i][bit(i)],b=grounds[j][bit(j)];
    add(a.mask&b.mask,{kind:'two',record:true,a,b});
    for(const sign of [0,1]) {
      const x=grounds[i][sign],y=grounds[j][sign^bit(i)^bit(j)];
      add(full^(x.mask^y.mask),{kind:'plain',record:false,a:x,b:y});
      add(full^(x.mask^y.mask),{kind:'plain',record:false,a:y,b:x});
    }
  }
  for(const link of links) {
    const trueHere=!!(link.mask&flags[winner]);
    if(trueHere && link.hits===1)add(link.mask,{kind:'linked-record',record:true,link,negated:false});
    for(let i=0;i<6;i++){
      if(i===link.a || i===link.b)continue;
      for(const negate of [false,true]){
        const claimMask=negate?full^link.mask:link.mask;
        const cred=grounds[i][(trueHere!==negate)?bit(i):bit(i)^1];
        add(full^(cred.mask^claimMask),{kind:'linked-witness',record:false,a:cred,link,trueHere,negated:negate});
      }
    }
  }
  return [...choices.values()];
}
export function renderChoice(template,draw) {
  const fact = table => pick(table.facts,draw);
  if(template.link) {
    const {left,right}=pick(template.link.variants,draw);
    const short=linkSentence(left,right,template.negated);
    return {kind:template.record?'record':'witness',source:template.record?null:fact(template.a),
      claim:{kind:'link',left,right,negated:template.negated,text:short,short}};
  }
  return {kind:template.record?'record':'witness',source:fact(template.a),claim:fact(template.b)};
}
// Preserve only individual assignments proved so far. If a deduction only
// works by retaining a correlation between two unresolved stories, this
// simpler reader stalls. Then check that considering two reports together
// gives a playable way forward, without enumerating six unknown names.
function individuallyKnown(mask) {
  let implied=full;
  for(const positions of ambient){
    if((mask & positions)===0n)implied&=full^positions;
    else if((mask & positions)===mask)implied&=positions;
  }
  return implied;
}
function propagate(domain,pieces) {
  for(;;){
    let narrowed=domain;
    for(const subset of pieces)narrowed&=individuallyKnown(domain&subset);
    if(narrowed===domain)return domain;
    domain=narrowed;
  }
}
export function hasCoupledStep(reports) {
  const record=reports.find(r=>r.template.record).mask;
  const singles=reports.filter(r=>!r.template.record).map(r=>r.mask);
  const stalled=propagate(individuallyKnown(record),singles);
  if((stalled & (stalled-1n))===0n)return false;
  const pairs=singles.slice();
  for(let a=0;a<singles.length;a++)for(let b=0;b<a;b++)pairs.push(singles[a]&singles[b]);
  const solved=propagate(stalled,pairs);
  return (solved & (solved-1n))===0n;
}
export function buildReportSet(evidence,winner,{alternatives,draw=Math.random,attempts=32,requireCoupling=true}) {
  if(alternatives.length<4)return null;
  const choices=reportChoices(evidence,winner);
  const truth=flags[winner];
  for(let attempt=0;attempt<attempts;attempt++) {
    const count=alternatives.length>=5?5:4;
    const others=shuffled(alternatives,draw).slice(0,count);
    const rivals=others.reduce((mask,w)=>mask|flags[w],0n);
    const bins=others.map(w=>choices.filter(c=>(rivals & (full^c.mask))===flags[w]));
    if(bins.some(bin=>!bin.length))continue;
    for(let spin=0;spin<16;spin++) {
      const starter=spin%count;
      const selected=[];
      for(let j=0;j<count;j++){
        const record=j===starter;
        const bucket=bins[j].filter(c=>c.options.some(o=>o.record===record));
        if(!bucket.length)break;
        const withSharedPerson=bucket.filter(c=>c.options.some(o=>!o.record && o.kind==='linked-witness' && o.trueHere));
        const candidates=!record && withSharedPerson.length && draw()<.72 ? withSharedPerson : bucket;
        const c=pick(candidates,draw), opts=c.options.filter(o=>o.record===record);
        const preferred=opts.filter(o=>o.link && !o.negated);
        selected.push({mask:c.mask,template:pick(preferred.length && draw()<.8?preferred:opts,draw)});
      }
      if(selected.length!==count||selected.reduce((mask,r)=>mask&r.mask,full)!==truth)continue;
      if(selected.filter(r=>r.template.kind==='linked-witness' && r.template.link.hits===1).length<2)continue;
      if(requireCoupling&&!hasCoupledStep(selected))continue;
      const reports=shuffled(selected,draw).map(r=>renderChoice(r.template,draw));
      return reports;
    }
  }
  return null;
}
