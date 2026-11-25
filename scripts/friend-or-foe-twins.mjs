// Two dossiers use the same case layout, order, verified record, speakers and
// role claims. Only affirmative/negative testimony can separate their pairs.
import {factHolds, linkSentence} from '../friend-or-foe/network-reports.js';
import {hasCoupledStep, renderChoice, reportChoices} from './friend-or-foe-reports.mjs';

const worlds = Array.from({length:64}, (_,i) => i);
const flags = worlds.map(w => 1n << BigInt(w));
const all = (1n << 64n) - 1n;
const choose = (list, draw) => list[Math.floor(draw() * list.length)];

function rivalWorlds(pairs, winner) {
  const chosen = pairs[winner];
  return worlds.filter(w => pairs[w].length === 2 && pairs[w].every(name => !chosen.includes(name)));
}
function maskOf(list) {
  return list.reduce((mask, world) => mask | flags[world], 0n);
}
function atLeast(mask, count) {
  while (count > 0 && mask) {
    mask &= mask - 1n;
    count--;
  }
  return count === 0;
}
function alternateWording(board, report, world) {
  if (report.kind === 'record' || factHolds(board, report.source, world) === factHolds(board, report.claim, world)) return report;
  const claim = report.claim;
  if (claim.kind !== 'link') throw new Error('A twin may only reverse cross-case testimony.');
  const negated = !claim.negated;
  const text = linkSentence(claim.left, claim.right, negated);
  return {...report, claim:{...claim, negated, text, short:text}};
}

// Carry the surviving assignments along with separate witnesses to the
// necessity of every already-selected row. The next row must leave at least
// one disjoint counterexample alive for each of those earlier rows.
function addRow(state, allowed, rivals) {
  const withoutNewRow = state.live & rivals & ~allowed;
  if (!withoutNewRow) return null;
  const otherOmissions = state.omissions.map(mask => mask & allowed);
  if (otherOmissions.includes(0n)) return null;
  return {live:state.live & allowed, omissions:[...otherOmissions, withoutNewRow]};
}
function voiceChoices(board, first, second) {
  const records = [], witnesses = [];
  for (const candidate of reportChoices(board, first)) {
    const same = Boolean(candidate.mask & flags[second]);
    const record = candidate.options.filter(o => o.record);
    if (record.length && same) records.push({first:candidate.mask, second:candidate.mask, options:record});
    const linked = candidate.options.filter(o => o.kind === 'linked-witness');
    const plain = candidate.options.filter(o => !o.record);
    const options = linked.length ? linked : same ? plain : [];
    if (options.length) witnesses.push({
      first:candidate.mask, second:same ? candidate.mask : all ^ candidate.mask, options
    });
  }
  return {records,witnesses};
}

export function buildTwinReports(board, first, second, pairs, draw, validate) {
  if (pairs[first].length !== 2 || pairs[second].length !== 2 || pairs[first].some(n => pairs[second].includes(n))) return null;
  const rivalLists = [rivalWorlds(pairs, first), rivalWorlds(pairs, second)];
  const [rivalsA, rivalsB] = rivalLists.map(maskOf);
  const {records, witnesses} = voiceChoices(board, first, second);
  if (!records.length || witnesses.length < 3) return null;

  function realize(rows) {
    for (const side of ['first','second']) {
      const masks = rows.map((row,i) => ({mask:row[side], template:{record:i===0}}));
      if (!hasCoupledStep(masks)) return null;
    }
    for (let attempt=0; attempt<24; attempt++) {
      const wording = rows.map(row => choose(row.options, draw));
      if (wording.filter(o => o.kind === 'linked-witness' && o.link.hits === 1).length < 2) continue;
      const a = wording.map(o => renderChoice(o, draw));
      const b = a.map(report => alternateWording(board, report, second));
      if (validate(a, first, rivalLists[0]) && validate(b, second, rivalLists[1])) return [a,b];
    }
    return null;
  }

  let budget = 3000;
  function search(rows, a, b, remaining) {
    if (--budget < 0) return null;
    if (!remaining) return a.live === flags[first] && b.live === flags[second] ? realize(rows) : null;
    if (!atLeast(a.live & rivalsA, remaining) || !atLeast(b.live & rivalsB, remaining)) return null;
    const offset = Math.floor(draw() * witnesses.length);
    for (let i=0; i<witnesses.length && budget>0; i++) {
      const row = witnesses[(offset+i) % witnesses.length];
      const nextA = addRow(a, row.first, rivalsA);
      if (!nextA) continue;
      const nextB = addRow(b, row.second, rivalsB);
      if (!nextB) continue;
      const result = search([...rows,row], nextA, nextB, remaining-1);
      if (result) return result;
    }
    return null;
  }
  for (let pass=0; pass<35 && budget>0; pass++) {
    const remaining = pass%3 === 0 ? 4 : 3;
    const options = records.filter(r => atLeast(r.first & rivalsA, remaining) &&
      atLeast(r.second & rivalsB, remaining) && (rivalsA & ~r.first) && (rivalsB & ~r.second));
    if (!options.length) continue;
    const r = choose(options, draw);
    const a = {live:r.first, omissions:[rivalsA & ~r.first]};
    const b = {live:r.second, omissions:[rivalsB & ~r.second]};
    const result = search([r],a,b,remaining);
    if (result) return result;
  }
  return null;
}
