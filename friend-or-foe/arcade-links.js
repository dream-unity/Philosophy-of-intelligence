// Each arrow reads left to right. A case uses the two highlighted kinds of
// relationship; its other four roles can vary without changing the solution.
const cast = ['Samp', 'Ivo', 'Luma', 'Mira', 'Nia', 'Orin', 'Pia', 'Sol', 'Tess', 'Vale'];
const words = {
  friend:   {label:'Friend of', single:'friend of', plural:'friends of'},
  foe:      {label:'Foe of', single:'foe of', plural:'foes of'},
  spy:      {label:'Spies on', single:'spy on', plural:'spies on'},
  double:   {label:'Double agent against', single:'double agent against', plural:'double agents against'},
  civilian: {label:'Civilian with', single:'civilian with', plural:'civilians with'},
  foreigner:{label:'Foreigner visiting', single:'foreigner visiting', plural:'foreigners visiting'}
};
const roles = Object.keys(words);
const families = ['trace','xor','split','cross'];
const uniq = items => [...new Set(items)];
const both = pair => pair.join(' and ');
const findSources = (card, refs) => uniq(card.links.filter(edge => refs.includes(edge.to)).map(edge => edge.from));
const findDestinations = (card, name) => uniq(card.links.filter(edge => edge.from === name).map(edge => edge.to));

function shuffled(items, random) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i],copy[j]] = [copy[j],copy[i]];
  }
  return copy;
}

function cue(role, pairs, random) {
  return {role,label:words[role].label, links:shuffled(pairs.map(([from,to]) => ({from,to})),random)};
}

// This verifier receives the very same cards and short order the player sees.
// It enumerates real public edges, including repeated subjects on a card.
export function solveArcadeTrial({cues, query}) {
  const [a,b] = cues;
  const empty = {pair:[],proof:[]};
  const first = findSources(a,[query.anchor]);
  if (first.length !== 2) return empty;
  const proof = [a.label + ' ' + query.anchor + ' gives ' + both(first) + '.'];
  let pair;
  if (query.family === 'trace') {
    pair = findSources(b,first);
    if (pair.length !== 2) return empty;
    proof.push(b.label + ' either of those two gives ' + both(pair) + '.');
  } else {
    const second = findSources(b,[query.contact]);
    if (second.length !== 2) return empty;
    const shared = first.filter(n => second.includes(n));
    if (shared.length !== 1) return empty;
    const common = shared[0];
    const onlyA = first.find(n => n !== common);
    const onlyB = second.find(n => n !== common);
    proof.push(b.label + ' ' + query.contact + ' gives ' + both(second) + '.');
    if (query.family === 'xor') {
      pair = [onlyA,onlyB];
      proof.push(common + ' fits both. Only ' + both(pair) + ' fit one apiece.');
    } else if (query.family === 'split') {
      const otherEnds = findDestinations(b,onlyA);
      if (otherEnds.length !== 1) return empty;
      pair = [common,otherEnds[0]];
      proof.push(common + ' fits both. Follow the second arrow from ' + onlyA + ', the other member of the first pair, to ' + pair[1] + '.');
    } else if (query.family === 'cross') {
      const otherEnds = findDestinations(b,common).filter(n => n !== query.contact);
      if (otherEnds.length !== 1) return empty;
      pair = [common,otherEnds[0]];
      proof.push(common + ' fits both. Their other ' + b.label.toLowerCase() + ' arrow leads to ' + pair[1] + '.');
    } else return empty;
  }
  return pair.length === 2 && pair[0] !== pair[1] ? {pair,proof} : empty;
}

function order(cues,q) {
  const first = words[cues[0].role];
  const second = words[cues[1].role];
  if (q.family === 'trace') {
    const either = cues[0].role === 'spy' ? 'either spy' : 'either one';
    return 'Find the ' + first.plural + ' ' + q.anchor + '. Shoot ' + second.plural + ' ' + either + '.';
  }
  if (q.family === 'xor') {
    return 'Shoot anyone who fits exactly one — ' + first.single + ' ' + q.anchor + ' or ' + second.single + ' ' + q.contact + '.';
  }
  if (q.family === 'cross') {
    return 'Which spy on ' + q.anchor + ' is ' + q.contact + '’s friend? Shoot that spy and their other friend.';
  }
  return 'Find the ' + first.plural + ' ' + q.anchor + '. One visits ' + q.contact + '. Shoot that visitor and the other’s host.';
}

// Each role has two members at a specific named reference. Only references in
// the order affect shooting. A third person can hold that role toward someone else.
function otherScopes(active, cues, random) {
  const occurrences = cast.map(name => active.filter(r => r.names.includes(name)).length);
  const unseen = cast.filter((n,i) => occurrences[i] === 0);
  const canRepeat = cast.filter((n,i) => occurrences[i] < 2);
  const remaining = shuffled(roles.filter(k => !active.some(r=>r.key===k)),random);
  for (let tryIndex=0; tryIndex<32; tryIndex++) {
    const stock = shuffled([...unseen,...shuffled(canRepeat,random).slice(0,8-unseen.length)],random);
    const assignment = active.slice();
    for (let i=0; i<4; i++) {
      const names = stock.slice(2*i,2*i+2);
      if (names[0] === names[1]) break;
      const role = remaining[i];
      const opposite = role === 'friend' ? 'foe' : role === 'foe' ? 'friend' : null;
      const forbidden = [];
      if (opposite) {
        const edges = cues.find(c => c.role === opposite)?.links ?? [];
        const scoped = assignment.find(r=>r.key===opposite);
        for (const edge of [...edges,...(scoped?.names ?? []).map(from=>({from,to:scoped.reference}))]) {
          if (names.includes(edge.from)) forbidden.push(edge.to);
          if (names.includes(edge.to)) forbidden.push(edge.from);
        }
      }
      const reference = shuffled(cast.filter(n => !names.includes(n) && !forbidden.includes(n)),random)[0];
      if (!reference) break;
      assignment.push({key:role,names,reference});
    }
    if (assignment.length === 6) {
      return roles.map(role => {
        const r = assignment.find(entry=>entry.key===role);
        return {...r,label:words[role].single + ' ' + r.reference};
      });
    }
  }
  return null;
}

function build(family, number, random, names = shuffled(cast,random)) {
  const [x,y,u,v,w,p,q,r] = names;
  const pool = shuffled(roles,random);
  const spyAndFriend = number === 1 || family === 'cross';
  const roleA = spyAndFriend ? 'spy' : family === 'split' ? pool.find(k=>k!=='foreigner') : pool[0];
  const roleB = spyAndFriend ? 'friend' : family === 'split' ? 'foreigner' : pool[1];
  const query = {family,anchor:x};
  let aLinks, bLinks, reference;
  if (family === 'trace') {
    // The same second card supports two different valid answers if the two
    // sources on the first card change. Neither card alone determines a pair.
    const [member,decoy] = random() < .5 ? [v,w] : [w,v];
    aLinks = [[u,x],[member,x],[decoy,y]];
    bLinks = [[p,u],[q,v],[r,w],[p,w]];
    reference = w;
  } else if (family === 'xor' || family === 'split') {
    const [common,onlyA] = random() < .5 ? [v,u] : [u,v];
    aLinks = [[u,x],[v,x],[w,y]];
    bLinks = [[common,p],[w,p],[onlyA,q]];
    query.contact = reference = p;
  } else {
    // Two spies on x. Two friends of p, each with a *different* second friend.
    // Both cards remain necessary even when the order asks for the other friend.
    const [common,onlyA] = random() < .5 ? [v,u] : [u,v];
    aLinks = [[u,x],[v,x],[w,y]];
    bLinks = [[common,p],[common,q],[w,p],[w,r]];
    query.contact = reference = p;
  }
  const cues = [cue(roleA,aLinks,random),cue(roleB,bLinks,random)];
  const solved = solveArcadeTrial({cues,query});
  if (solved.pair.length !== 2) return null;
  const active = [
    {key:roleA,reference:x,names:findSources(cues[0],[x])},
    {key:roleB,reference,names:findSources(cues[1],[reference])}
  ];
  const roleBoard = otherScopes(active,cues,random);
  if (!roleBoard) return null;
  return {number,roster:cast.slice(),family,order:order(cues,query),cues,query,roles:roleBoard,...solved};
}

export function makeArcadeTrial(previous=null, random=Math.random) {
  const number = (previous?.number ?? 0) + 1;
  let seed = (Math.floor(random()*4294967296) ^ Math.imul(number,0x9e3779b1)) >>> 0;
  const draw = () => { seed=(Math.imul(1664525,seed)+1013904223)>>>0; return seed/4294967296; };
  const family = number <= 4 ? families[number-1] : shuffled(families.filter(x=>x!==previous.family),draw)[0];
  const old = previous?.pair ?? [];
  for (let i=0; i<128; i++) {
    const trial = build(family,number,draw);
    if (trial && trial.pair.every(n=>!old.includes(n))) return trial;
  }
  // Rotate a verified deal through all ten names. At most four rotations can
  // collide with a previous two-name answer. Filler assignments cycle too.
  const safe = {number,roster:cast.slice(),family:'cross',query:{family:'cross',anchor:cast[0],contact:cast[5]}};
  for (let shift=0;shift<10;shift++) {
    const n = Array.from({length:10},(_,i)=>cast[(i+shift)%10]);
    const edges=(role,pairs)=>({role,label:words[role].label,links:pairs.map(([a,b])=>({from:n[a],to:n[b]}))});
    safe.query={family:'cross',anchor:n[0],contact:n[5]};
    safe.cues=[edges('spy',[[2,0],[3,0],[4,1]]),edges('friend',[[2,5],[2,6],[4,5],[4,7]])];
    const solved=solveArcadeTrial(safe);
    if(solved.pair.some(name=>old.includes(name)))continue;
    const slots={spy:[0,2,3],friend:[5,2,4],foe:[0,5,6],double:[1,0,7],civilian:[3,8,9],foreigner:[4,1,8]};
    safe.roles=roles.map(role=>{
      const [ref,a,b]=slots[role];
      return {key:role,reference:n[ref],label:words[role].single+' '+n[ref],names:[n[a],n[b]]};
    });
    return {...safe,order:order(safe.cues,safe.query),...solved};
  }
  throw new Error('Unable to rotate arcade case.');
}
