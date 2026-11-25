// node scripts/build-friend-or-foe-network.mjs --verify
// node scripts/build-friend-or-foe-network.mjs --start=0 --count=2000 --limit=8 --output=/tmp/network-data.js
// node scripts/build-friend-or-foe-network.mjs --existing --output=/tmp/network-regenerated.js
// --existing reuses the released incident geometries and orders and regenerates
// their testimony from scratch. --verify checks every stored presentation.
import {writeFile} from 'node:fs/promises';
import {describeFact,evaluateNetworkCandidate,materializeLayout,orderIds} from '../friend-or-foe/network-case.js';
import {networkFrames} from '../friend-or-foe/network-data.js';
import {linkSentence,reportHolds,varyTestimony} from '../friend-or-foe/network-reports.js';
import {buildReportSet} from './friend-or-foe-reports.mjs';
import {buildTwinReports} from './friend-or-foe-twins.mjs';

const roles=['friend','foe','spy','double','civilian','foreigner'];
const ids=['D1','D2','I1','I2','H1','H2'];
const worlds=Array.from({length:64},(_,i)=>i);
const args=new Map(process.argv.slice(2).map(a=>{
  const at=a.indexOf('=');
  return at<0?[a,true]:[a.slice(0,at),a.slice(at+1)];
}));
const disjoint=(a,b)=>a.every(name=>!b.includes(name));
const key=names=>names.slice().sort().join('/');
const opposite=role=>roles[roles.indexOf(role)^1];
function drawFrom(seed){
  return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
}
function packFact(f,board) {
  if(!f)return -1;
  const code=(s,index)=> (ids.indexOf(s.incident)*6+roles.indexOf(s.role))*2+index;
  if(f.kind==='link')return [code(f.left,Number(f.left.end==='contact')),code(f.right,Number(f.right.end==='contact')),Number(f.negated)];
  return code(f,board.incidents.find(s=>s.id===f.incident).members.indexOf(f.actor));
}
function unpackFact(f,board) {
  if(f===-1)return null;
  const selector=c=>({incident:ids[Math.floor(c/12)],role:roles[(c>>1)%6],end:c%2?'contact':'actor'});
  if(Array.isArray(f)){
    const left=selector(f[0]),right=selector(f[1]),negated=!!f[2],short=linkSentence(left,right,negated);
    return {kind:'link',left,right,negated,text:short,short};
  }
  const scene=board.incidents[Math.floor(f/12)];
  return describeFact(scene,scene.members[f%2],roles[(f>>1)%6]);
}
function who(board,sel,w){
  const i=ids.indexOf(sel.incident),scene=board.incidents[i];
  const j=((w>>i)&1)^Number(scene.role!==sel.role);
  return (sel.end==='actor'?scene.members:scene.contacts)[j];
}
function omissions(board,reports,alternatives) {
  return reports.map((_,i)=>alternatives.filter(u=>reports.every((r,j)=>i===j||reportHolds(board,r,u))));
}
// Each counted person or role must actually take part in a single changed
// attribution that permits a disjoint pair under the other original evidence.
function operandsPass(board,reports,w,others) {
  const people=new Set(),seenRoles=new Set();
  let endpointsMatter=false;
  for(const [i,report] of reports.entries())for(const u of others[i])for(const k of ['source','claim']){
    const fact=report[k];
    if(!fact)continue;
    if(fact.kind==='link')for(const field of ['left','right']){
      const original=fact[field];
      const alternatives=[{...original,role:opposite(original.role)},
        {...original,end:original.end==='actor'?'contact':'actor'}];
      for(const changed of alternatives){
        if(!reportHolds(board,{...report,[k]:{...fact,[field]:changed}},u))continue;
        seenRoles.add(original.role);
        people.add(who(board,original,w));people.add(who(board,original,u));people.add(who(board,changed,u));
        if(original.end!==changed.end)endpointsMatter=true;
      }
    }else if(reportHolds(board,{...report,[k]:{...fact,role:opposite(fact.role)}},u)){
      seenRoles.add(fact.role);people.add(fact.actor);people.add(fact.contact);
    }
  }
  return endpointsMatter && people.size===10 && seenRoles.size===6;
}
function allowedVoices(board,reports,w,alternatives) {
  const others=omissions(board,reports,alternatives);
  if(others.some(o=>!o.length))return 0;
  const witnesses=reports.map((r,i)=>r.kind==='witness'?i:-1).filter(i=>i>=0);
  let allowed=0;
  for(let seq=0;seq<(1<<witnesses.length);seq++){
    const mask=witnesses.reduce((v,i,j)=>v|(((seq>>j)&1)<<i),0);
    const variant=varyTestimony(board,reports,Math.random,mask);
    if(operandsPass(board,variant,w,others))allowed|=1<<seq;
  }
  return allowed;
}
// A blanket misreading of every named endpoint must never give only the right
// pair. Publicly possible worlds with another pair make the mistake detectable.
function endpointsMatterTogether(board,reports,w,pairs) {
  return ['actor','contact'].every(end=>{
    const flatten=fact=>fact?.kind==='link' ? {...fact,
      left:{...fact.left,end},right:{...fact.right,end}} : fact;
    const changed=reports.map(r=>({...r,source:flatten(r.source),claim:flatten(r.claim)}));
    const answers=new Set(worlds.filter(u=>pairs[u].length===2 &&
      changed.every(r=>reportHolds(board,r,u))).map(u=>key(pairs[u])));
    return answers.size!==1 || !answers.has(key(pairs[w]));
  });
}
function author(seed,q){
  const board=materializeLayout(seed);
  if(!board)return null;
  board.query=orderIds[q];
  const pairs=worlds.map(w=>evaluateNetworkCandidate(board,w)),keys=pairs.map(key);
  const eligible=worlds.filter(w=>pairs[w].length===2 && keys.filter(k=>k===keys[w]).length===1 &&
    key(evaluateNetworkCandidate(board,w,true))!==keys[w]);
  if(!args.has('--allow-unmatched')) {
    const validate=(reports,w,alternatives)=>endpointsMatterTogether(board,reports,w,pairs) && !!allowedVoices(board,reports,w,alternatives);
    for(const [index,w] of eligible.entries())for(const u of eligible.slice(index+1)){
      if(!disjoint(pairs[w],pairs[u]))continue;
      const draw=drawFrom((Math.imul(seed,80521)+w*56891+u*2713+q*19377)>>>0);
      const twins=buildTwinReports(board,w,u,pairs,draw,validate);
      if(!twins)continue;
      const entries=twins.map((reports,i)=>{
        const winner=i===0?w:u;
        const alts=worlds.filter(v=>pairs[v].length===2&&disjoint(pairs[v],pairs[winner]));
        const codes=reports.map(r=>[Number(r.kind==='witness'),packFact(r.source,board),packFact(r.claim,board)]);
        return [winner,codes,allowedVoices(board,reports,winner,alts)];
      });
      const common=entries[0][2]&entries[1][2];if(!common)continue;
      entries.forEach(e=>{e[2]=common;});
      return [seed,q,...entries];
    }
    return null;
  }
  const goals=[];
  for(const w of eligible){
    if(!eligible.some(u=>disjoint(pairs[w],pairs[u])))continue;
    const alternatives=worlds.filter(u=>pairs[u].length===2 && disjoint(pairs[u],pairs[w]));
    for(let spin=0;spin<14;spin++){
      const draw=drawFrom((seed*80521 + w*56891 + spin*9209 + q*19377)>>>0);
      const reports=buildReportSet(board,w,{alternatives,draw,attempts:36});
      if(!reports)continue;
      const allowed=allowedVoices(board,reports,w,alternatives);
      if(!allowed)continue;
      const codes=reports.map(r=>[Number(r.kind==='witness'),packFact(r.source,board),packFact(r.claim,board)]);
      goals.push([w,codes,allowed]);break;
    }
  }
  const accepted=goals.filter(([w])=>goals.some(([u])=>disjoint(pairs[w],pairs[u])));
  return accepted.length?[seed,q,...accepted]:null;
}
function unsigned(codes) {
  const term=c=>Array.isArray(c)?c.slice(0,2):c;
  return JSON.stringify(codes.map(([kind,a,b])=>[kind,term(a),term(b)]));
}
function verify(entry) {
  const [seed,q,...goals]=entry,board=materializeLayout(seed);board.query=orderIds[q];
  const pairs=worlds.map(w=>evaluateNetworkCandidate(board,w)),keys=pairs.map(key);
  if(!args.has('--allow-unmatched') && goals.length!==2)throw Error('Expected two matched forms for '+seed);
  for(const [w,codes,mask] of goals){
    const bad=()=>{throw Error('Invalid network at seed '+seed+', order '+q+', assignment '+w);};
    if(pairs[w].length!==2 || keys.filter(k=>k===keys[w]).length!==1 ||
        key(evaluateNetworkCandidate(board,w,true))===keys[w] || !goals.some(([u])=>disjoint(pairs[w],pairs[u])))bad();
    const reports=codes.map(([kind,a,b])=>({kind:kind?'witness':'record',source:unpackFact(a,board),claim:unpackFact(b,board)}));
    const exact=worlds.filter(u=>reports.every(r=>reportHolds(board,r,u)));
    if(exact.length!==1||exact[0]!==w)bad();
    if(!args.has('--allow-unmatched') && !endpointsMatterTogether(board,reports,w,pairs))bad();
    const alternatives=worlds.filter(u=>pairs[u].length===2&&disjoint(pairs[u],pairs[w]));
    const allowed=allowedVoices(board,reports,w,alternatives);
    if(!mask || (mask & allowed)!==mask)bad();
    if(!args.has('--allow-unmatched') && !goals.some(([u,alternate,voices])=>
      disjoint(pairs[w],pairs[u]) && mask===voices && unsigned(codes)===unsigned(alternate)))bad();
  }
}
if(args.has('--verify')){
  networkFrames.forEach(verify);
  console.log('Verified '+networkFrames.length+' network frames.');
}else{
  const output=args.get('--output');
  if(typeof output!=='string')throw Error('Supply --output=/path/to/network-data.js.');
  const start=Number(args.get('--start')??0),count=Number(args.get('--count')??2000);
  const limit=Number(args.get('--limit')??Infinity), jobs=[];
  if(args.has('--existing'))networkFrames.forEach(([s,q])=>jobs.push([s,q]));
  else for(let s=start;s<start+count;s++)for(let q=0;q<orderIds.length;q++)jobs.push([s,q]);
  const entries=[];
  for(const [seed,query] of jobs){
    const entry=author(seed,query);
    if(entry)entries.push(entry);
    if(entries.length>=limit)break;
  }
  if(!entries.length)throw Error('No qualifying frame in this seed range.');
  await writeFile(output,'export const networkFrames = [\n'+entries.map(e=>'  '+JSON.stringify(e)+',\n').join('')+'];\n');
  console.log('Wrote '+entries.length+(entries.length===1?' frame.':' frames.'));
}
