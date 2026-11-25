import {caseCatalog} from './case-catalog.js';
import {nearMisses} from './case-decoys.js';
import {alternate, caseRoles, edgesFor, layoutFor, shuffled, symbols} from './case-layout.js';
import {displayEdge,displayRole,evaluatePattern,patternBrief,patterns,variantsFor} from './case-patterns.js';
import {networkRoster} from './roster.js';

const roleLabels = ['Friend','Foe','Spy','Double agent','Civilian','Foreigner'];
const label = role => roleLabels[caseRoles.indexOf(role)];
const pick = (array, draw) => array[Math.floor(draw() * array.length)];
const pairKey = pair => pair.slice().sort().join('|');

function takeFromBag(items, old, draw, avoidRepeat = true) {
  if (old && old.index + 1 < old.order.length) return {...old, index:old.index + 1};
  const order = shuffled(items, draw);
  if (avoidRepeat && old && order.length > 1 && order[0] === old.order[old.index]) {
    const next = 1 + Math.floor(draw() * (order.length - 1));
    [order[0], order[next]] = [order[next], order[0]];
  }
  return {order, index:0};
}

function decodeTree(code) {
  return caseRoles.map((_, i) => Math.floor(code / (8 ** i)) % 8);
}

// A deleted observation frees its whole branch. Even a returning player who
// remembers the previous pair must still be able to believe the other branch.
function branchMask(parents, index) {
  return parents.reduce((mask, _, i) => {
    for (let ancestor = i; ancestor < parents.length; ancestor = parents[ancestor]) {
      if (ancestor === index) return mask | (1 << i);
    }
    return mask;
  }, 0);
}

function assignNames(previous, forbidden, draw) {
  if (!previous || previous.length !== 2 || !previous.every(name=>networkRoster.includes(name))) {
    return new Map(shuffled(networkRoster, draw).map((name,i)=>[symbols[i],name]));
  }
  const slots = [];
  symbols.forEach((a, i) => {
    for (const b of symbols.slice(i + 1)) if (!forbidden.has(pairKey([a,b]))) slots.push([a,b]);
  });
  const hosts = pick(slots, draw);
  const remaining = shuffled(networkRoster.filter(name => !previous.includes(name)), draw);
  const old = shuffled(previous, draw);
  return new Map(symbols.map(name=>[name, hosts.includes(name) ? old[hosts.indexOf(name)] : remaining.pop()]));
}

const matches = (a,b) => a.role===b.role && a.from===b.from && a.to===b.to;
const truth = (edges, claim) => edges.some(edge => matches(edge,claim));

function evidenceReports(rows, parents, draw) {
  function makeClaim(index) {
    const row = rows[index];
    const actual = row.links.map(link => ({role:row.role, ...link}));
    const other = row.links.map(link => ({role:row.role, ...alternate(link,row.alias)}));
    const value = draw() < .5;
    const [group, opposite] = value ? [actual, other] : [other, actual];
    return {clue:pick(group.filter(edge => !truth(opposite,edge)),draw), value};
  }
  const reports = [];
  parents.forEach((parent,i)=>{
    if (parent===7) return;
    const child = makeClaim(i);
    if (parent===6) {
      reports.push({left:null, right:child.clue, same:child.value});
    } else {
      const source = makeClaim(parent);
      const [left,right] = draw()<.5 ? [source, child] : [child, source];
      reports.push({left:left.clue, right:right.clue, same:left.value===right.value});
    }
  });
  return shuffled(reports,draw);
}

function explainRows(rows, reports, mask) {
  const pending = reports.slice();
  const known = new Set(rows.filter(row=>!row.disputed).map(row=>row.role));
  const steps = [];
  function describe(role) {
    const i = rows.findIndex(row => row.role===role);
    if (!(mask & (1 << i))) return label(role) + ' reads as printed';
    return rows[i].alias ? label(role) + ' swaps ' + rows[i].alias.join(' and ') : label(role) + ' reverses';
  }
  while (pending.length) {
    const i = pending.findIndex(r => !r.left || known.has(r.left.role) !== known.has(r.right.role));
    if (i < 0) break;
    const [r] = pending.splice(i,1);
    const parent = r.left && (known.has(r.left.role) ? r.left.role : r.right.role);
    const child = !r.left || parent === r.left.role ? r.right.role : r.left.role;
    const lead = parent ? 'From ' + label(parent) : r.same ? 'Verified link' : 'Ruled-out link';
    steps.push(lead + ' → ' + describe(child) + '.');
    known.add(child);
  }
  return steps;
}

export function solveCaseEvidence(evidence) {
  const {rows,reports,family,anchor} = evidence;
  const fixed = rows.reduce((mask,row,i)=>row.disputed ? mask : mask | (1 << i),0);
  let solution;
  for (let mask=0; mask < 1 << rows.length; mask++) {
    if (mask & fixed) continue;
    const edges = edgesFor(rows,mask);
    const agrees = report => {
      const left = !report.left || truth(edges,report.left);
      const right = truth(edges,report.right);
      return (left === right) === report.same;
    };
    if (!reports.every(agrees)) continue;
    const participants = new Set(edges.flatMap(edge=>[edge.from,edge.to]));
    if (evidence.roster?.some(name=>!participants.has(name))) continue;
    const answer = evaluatePattern(family,edges,anchor,true,evidence.variant);
    if (answer.pair.length !== 2) continue;
    if (solution && pairKey(solution.pair) !== pairKey(answer.pair)) return {pair:[],proof:[]};
    solution ??= {...answer,proof:[...answer.proof, ...explainRows(rows,reports,mask)]};
  }
  return solution || {pair:[],proof:[]};
}

export function makeCaseTrial(level,previous=null,draw=Math.random) {
  if (level === 'moderate') level = 'medium';
  if (!['very-easy','easy','medium','hard'].includes(level)) throw new RangeError('Unknown difficulty ' + level);
  const last = previous?.level===level ? previous.deck : null;
  const rules = takeFromBag(patterns.map(p=>p.id),last?.rules,draw);
  const id = rules.order[rules.index];
  const variants = variantsFor(id);
  // Balance both perspectives without making every future visit alternate.
  const readings = takeFromBag(variants.map((_,i)=>i),last?.readings?.[id],draw,false);
  const variant = variants[readings.order[readings.index]];
  const brief = patternBrief(id,variant);
  const entries = caseCatalog[id];
  const boards = takeFromBag(entries.map((_,i)=>i),last?.boards[id],draw);
  const [seed,anchorIndex,moderate,hard] = entries[boards.order[boards.index]];
  const deck = {rules,boards:{...last?.boards,[id]:boards},readings:{...last?.readings,[id]:readings}};
  const parents = level==='hard' ? decodeTree(hard) : level==='medium' ? decodeTree(moderate) : caseRoles.map(()=>7);
  if (level==='easy') {
    const tree = decodeTree(hard);
    const indices = caseRoles.map((_,i)=>i);
    const single = pick(indices.filter(i=>!tree.includes(i)),draw);
    parents[single] = pick(indices.filter(i=>i!==single),draw);
  }
  const raw = layoutFor(seed);
  const original = edgesFor(raw,0);
  const key = symbols[anchorIndex];
  const actualPair = evaluatePattern(id,original,key,false).pair;
  const forbidden = new Set([pairKey(actualPair)]);
  if (previous?.pair) parents.forEach((p,i)=>{
    if (p!==7) forbidden.add(pairKey(evaluatePattern(id,edgesFor(raw,branchMask(parents,i)),key,false).pair));
  });
  const names = assignNames(previous?.pair,forbidden,draw);
  const rename = ({from,to})=>({from:names.get(from),to:names.get(to)});
  const resolved = raw.map(row=>({
    role:row.role, links:row.links.map(rename), alias:row.alias?.map(name=>names.get(name))
  }));
  const reports = evidenceReports(resolved,parents,draw).map(({left,right,same})=>({
    left:left && displayEdge(left,variant),right:displayEdge(right,variant),same
  }));
  const rows = resolved.map((row,i)=>{
    const disputed = parents[i]!==7;
    const exchange = disputed && draw()<.5;
    const links = shuffled(row.links,draw).map(link=>{
      const arrow = exchange ? alternate(link,row.alias) : link;
      const {from,to} = displayEdge({...arrow,role:row.role},variant);
      return {from,to};
    });
    return {role:displayRole(row.role,variant),links,disputed,...(disputed && row.alias ? {alias:shuffled(row.alias,draw)} : {})};
  });
  let leads = [];
  if (level==='very-easy') {
    const alternatives = raw.map((_,i)=>edgesFor(raw,1 << i));
    const decoys = nearMisses(id,original,key,actualPair,alternatives);
    leads = shuffled([...actualPair,...decoys].map(name=>names.get(name)),draw);
  }
  const anchor = names.get(key);
  const roster = shuffled(networkRoster,draw);
  rows.sort((a,b)=>caseRoles.indexOf(a.role)-caseRoles.indexOf(b.role));
  const title = brief.title;
  const order = brief.order.replaceAll('{name}',anchor);
  const hint = brief.hint.replaceAll('{name}',anchor);
  const evidence = {level,roster,family:id,variant,title,order,hint,anchor,rows,reports,leads};
  const answer = solveCaseEvidence(evidence);
  if (answer.pair.length !== 2) throw new Error('Inconsistent case ' + id + '/' + seed);
  return {number:(previous?.number || 0)+1,level,roster,evidence,deck,...answer};
}
