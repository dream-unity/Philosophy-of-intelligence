import {collectMatches, collectPairs, pickTopTwo} from './case-graph.js';

// 100 genuinely distinct Hard operational families (10 domains × 10 families).
// Calibrated to 135–140+ IQ demand, paired with ALL 6 records disputed in irreducible
// coupled 2-SAT logic cycles (zero standalone Verified handouts).
// Every family integrates all six distinct categories (Friend, Foe, Spy, Double agent,
// Civilian, Foreigner) with distinct operational roles — never collapsible to binary Safe/Threat.

function makeHard({id, domain, title, order, useAnchor = false, evaluate}) {
  return {id, tier: 'hard', domain, title, order, hint: '', useAnchor, evaluate};
}

function makeHardRank({id, domain, title, order, useAnchor = false, scoreFn, minScore = -Infinity}) {
  return {
    id, tier: 'hard', domain, title, order, hint: '', useAnchor,
    evaluate(g, anchor, proof) {
      return pickTopTwo(g.people, x => scoreFn(g, x, anchor, proof), proof, minScore);
    }
  };
}

function sumWeights(g, x, weights, includeProof) {
  let score = 0;
  const parts = [];
  for (const e of g.touch(x)) {
    const dir = e.from === x ? 'out' : 'in';
    const key = e.role + '_' + dir;
    const w = weights[key] ?? weights[e.role] ?? 0;
    if (w !== 0) {
      score += w;
      if (includeProof) parts.push(g.fmt(e) + ' (' + (w > 0 ? '+' + w : w) + ')');
    }
  }
  return {score, parts};
}

// Helper: does suspect x have a "clean" Friend backer (a Friend who does NOT link to Double agent or Foreigner)?
function hasCleanFriend(g, x) {
  return g.in(x, 'friend').some(f => !g.hasTouch(f.from, ['double', 'foreigner']));
}

// Helper: does suspect x have a "clean" Spy watcher (a Spy who does NOT link to Foe, Double agent, or Foreigner)?
function hasCleanSpy(g, x) {
  return g.in(x, 'spy').some(s => !g.hasTouch(s.from, ['foe', 'double', 'foreigner']));
}

// Helper: shortest undirected distance from anchor to x (0..4, 99 if unreachable)
function distFrom(g, anchor) {
  const dist = new Map([[anchor, 0]]);
  const queue = [anchor];
  while (queue.length) {
    const cur = queue.shift();
    const d = dist.get(cur);
    for (const next of g.neighbors(cur)) {
      if (!dist.has(next)) {
        dist.set(next, d + 1);
        queue.push(next);
      }
    }
  }
  return dist;
}

export const hardFamilies = [
  // =========================================================================
  // DOMAIN 0: Cover, Betrayal & Corrupted Alibis (10 families)
  // =========================================================================
  makeHardRank({
    id: 'ha-00', domain: 0, title: 'Compromised vouching chain',
    order: 'Score each suspect: +3 if backed by a Friend whose backer sends a Foe, Double agent, or Foreigner arrow; +2 per outgoing Double agent/Foreigner arrow; +1 per outgoing Foe arrow; −2 per Spy watch received; −1 per Civilian arrow sent. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const taintedF = g.in(x, 'friend').some(f => g.hasOut(f.from, ['foe', 'double', 'foreigner'])) ? 3 : 0;
      const r = sumWeights(g, x, {double_out: 2, foreigner_out: 2, foe_out: 1, spy_in: -2, civilian_out: -1}, proof);
      const score = taintedF + r.score;
      if (proof && taintedF) r.parts.push('tainted Friend backer (+3)');
      return {score, reason: proof ? x + ' scores ' + score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-01', domain: 0, title: 'Betrayal exposure ledger',
    order: 'Score each suspect: +3 per Double agent link, +2 per Foreigner link, +2 per Foe arrow sent, +1 per Civilian link, −2 per clean Friend backer (not in Double agent/Foreigner), −2 per Spy watch received. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {double: 3, foreigner: 2, foe_out: 2, civilian: 1, spy_in: -2}, proof);
      const cleanF = g.in(x, 'friend').filter(f => !g.hasTouch(f.from, ['double', 'foreigner'])).length;
      const score = r.score - cleanF * 2;
      if (proof && cleanF) r.parts.push(cleanF + ' clean Friend (−' + (cleanF * 2) + ')');
      return {score, reason: proof ? x + ' scores ' + score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-02', domain: 0, title: 'Corrupted ally’s proxy',
    order: 'Score each suspect: +3 if they receive an arrow from someone backed by a Friend who also sends a Foe/Double agent/Foreigner arrow; +2 per outgoing Double agent or Foreigner arrow; +1 per incoming Civilian report; −2 per Spy watch received; −1 per Friend backing received. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const taintedProxy = g.in(x).some(e => g.hasIn(e.from, 'friend') && g.hasOut(e.from, ['foe', 'double', 'foreigner'])) ? 3 : 0;
      const r = sumWeights(g, x, {double_out: 2, foreigner_out: 2, civilian_in: 1, spy_in: -2, friend_in: -1}, proof);
      const score = taintedProxy + r.score;
      if (proof && taintedProxy) r.parts.push('fed by tainted Friend-backed source (+3)');
      return {score, reason: proof ? x + ' scores ' + score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHard({
    id: 'ha-03', domain: 0, title: 'Cover-breaking triangle',
    order: 'Shoot the two suspects who link (either way) to a Friend-backed suspect AND to a Foreigner/Double agent suspect (two different people) — excluding anyone with a clean Spy watcher or Civilian backing.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x) || g.hasIn(x, 'civilian')) return null;
        const n = g.neighbors(x);
        for (const a of n) {
          if (!g.hasIn(a, 'friend')) continue;
          for (const b of n) {
            if (b !== a && g.hasTouch(b, ['foreigner', 'double'])) {
              return proof ? x + ' links Friend-backed ' + a + ' and covert ' + b + ' (no clean Spy/Civilian shield).' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  makeHardRank({
    id: 'ha-04', domain: 0, title: 'Tainted voucher penalty',
    order: 'Score each suspect: +3 per link to anyone in Double agent or Foreigner, +2 per link to anyone in Foe, +1 per Civilian link, −2 if watched by a Spy, −2 if backed by a Friend whose backer is NOT in Foe/Double agent/Foreigner. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      let score = 0;
      const parts = [];
      for (const e of g.touch(x)) {
        const m = e.from === x ? e.to : e.from;
        if (g.hasTouch(m, ['double', 'foreigner'])) { score += 3; if (proof) parts.push('link to covert ' + m + ' (+3)'); }
        if (g.hasTouch(m, 'foe')) { score += 2; if (proof) parts.push('link to Foe ' + m + ' (+2)'); }
        if (e.role === 'civilian') { score += 1; if (proof) parts.push(g.fmt(e) + ' (+1)'); }
      }
      if (g.hasIn(x, 'spy')) { score -= 2; if (proof) parts.push('Spy watch (−2)'); }
      const cleanF = g.in(x, 'friend').some(f => !g.hasTouch(f.from, ['foe', 'double', 'foreigner']));
      if (cleanF) { score -= 2; if (proof) parts.push('clean Friend (−2)'); }
      return {score, reason: proof ? x + ' scores ' + score + ' (' + parts.join('; ') + ').' : ''};
    }
  }),
  makeHard({
    id: 'ha-05', domain: 0, title: 'Double-crossed ally network',
    order: 'Shoot the two suspects who back a Friend OR receive a Civilian report — while ALSO linking (in 1 or 2 steps, following arrows) to someone in Double agent or Foreigner, with NO Spy watch.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        const cov = g.out(x, 'friend')[0] || g.in(x, 'civilian')[0];
        if (!cov) return null;
        for (const e1 of g.out(x)) {
          if (g.hasTouch(e1.to, ['double', 'foreigner'])) return proof ? x + ': ' + g.fmt(cov) + ', 1-step to covert ' + e1.to + '.' : 'ok';
          for (const e2 of g.out(e1.to)) {
            if (e2.to !== x && g.hasTouch(e2.to, ['double', 'foreigner'])) return proof ? x + ': ' + g.fmt(cov) + ', 2-step ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeHardRank({
    id: 'ha-06', domain: 0, title: 'Traitor behind an ally',
    order: 'Score each suspect: +3 per outgoing Foe, Double agent, or Foreigner arrow hitting someone backed by a Friend; +2 per outgoing Foreigner or Double agent arrow; +1 per incoming Civilian report; −2 per Spy watch received; −2 per Friend backing received. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const hitAlly = g.out(x, ['foe', 'double', 'foreigner']).filter(e => g.hasIn(e.to, 'friend')).length * 3;
      const r = sumWeights(g, x, {foreigner_out: 2, double_out: 2, civilian_in: 1, spy_in: -2, friend_in: -2}, proof);
      const score = hitAlly + r.score;
      if (proof && hitAlly) r.parts.push('targets Friend-backed (+' + hitAlly + ')');
      return {score, reason: proof ? x + ' scores ' + score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-07', domain: 0, title: 'Full-spectrum betrayal index',
    order: 'Score each suspect: +3 per outgoing Double agent/Foreigner arrow, +2 per incoming Foe/Double agent arrow, +2 if appearing in BOTH Friend and any of (Foe, Double agent, Foreigner), −2 if watched by a Spy, −1 per Civilian report sent. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {double_out: 3, foreigner_out: 3, foe_in: 2, double_in: 2, spy_in: -2, civilian_out: -1}, proof);
      const split = g.hasTouch(x, 'friend') && g.hasTouch(x, ['foe', 'double', 'foreigner']) ? 2 : 0;
      const score = r.score + split;
      if (proof && split) r.parts.push('Friend+hostile split (+2)');
      return {score, reason: proof ? x + ' scores ' + score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-08', domain: 0, title: 'Hostile backer of a neutral',
    order: 'Score each suspect: +2 per outgoing arrow, +2 if they appear in Friend or Civilian while sending a Foe/Double agent/Foreigner arrow, +1 per Foreigner link, −2 per clean Friend backer (not in Foe/Double agent/Foreigner), −2 per Spy watch received. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const out = g.out(x).length * 2;
      const split = g.hasTouch(x, ['friend', 'civilian']) && g.hasOut(x, ['foe', 'double', 'foreigner']) ? 2 : 0;
      const cleanF = g.in(x, 'friend').some(f => !g.hasTouch(f.from, ['foe', 'double', 'foreigner'])) ? -2 : 0;
      const r = sumWeights(g, x, {foreigner: 1, spy_in: -2}, proof);
      const score = out + split + cleanF + r.score;
      return {score, reason: proof ? x + ' scores ' + score + ' (' + g.out(x).length + ' out, split ' + split + ', mods ' + (cleanF + r.score) + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-09', domain: 0, title: 'Cover-vs-exposure differential',
    order: 'Score each suspect: +3 per outgoing Foe, Double agent, or Foreigner arrow; +2 if they back someone (Friend) who sends a Double agent or Foreigner arrow; −2 per Spy watch received; −2 per Civilian arrow sent; −1 per Friend backing received. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {foe_out: 3, double_out: 3, foreigner_out: 3, spy_in: -2, civilian_out: -2, friend_in: -1}, proof);
      const badBack = g.out(x, 'friend').some(f => g.hasOut(f.to, ['double', 'foreigner'])) ? 2 : 0;
      const score = r.score + badBack;
      if (proof && badBack) r.parts.push('backs active mole/handler (+2)');
      return {score, reason: proof ? x + ' scores ' + score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),

  // =========================================================================
  // DOMAIN 1: Surveillance & Counter-Surveillance (10 families)
  // =========================================================================
  makeHardRank({
    id: 'ha-10', domain: 1, title: 'Compromised watch chain',
    order: 'Score each suspect: +3 if watched by a Spy whose watcher touches Foe/Double agent/Foreigner, +2 per outgoing Double agent/Foreigner/Foe arrow, +1 per incoming Civilian report, −3 if watched by a clean Spy, −2 if backed by a Friend. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const badSpy = g.in(x, 'spy').some(s => g.hasTouch(s.from, ['foe', 'double', 'foreigner'])) ? 3 : 0;
      const cleanS = hasCleanSpy(g, x) ? -3 : 0;
      const r = sumWeights(g, x, {double_out: 2, foreigner_out: 2, foe_out: 2, civilian_in: 1, friend_in: -2}, proof);
      const score = badSpy + cleanS + r.score;
      return {score, reason: proof ? x + ' scores ' + score + (badSpy ? ' (compromised Spy +3)' : cleanS ? ' (clean Spy −3)' : '') + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-11', domain: 1, title: 'Counter-surveillance threat score',
    order: 'Score each suspect: +3 if watching someone (Spy) who links to Foe/Double agent/Foreigner, +2 per Double agent or Foreigner link, +2 per Foe link, −2 per Friend backing received, −2 if watched by a clean Spy, +1 per Civilian link. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {double: 2, foreigner: 2, foe: 2, friend_in: -2, civilian: 1}, proof);
      const watchHot = g.out(x, 'spy').some(s => g.hasTouch(s.to, ['foe', 'double', 'foreigner'])) ? 3 : 0;
      const cleanS = hasCleanSpy(g, x) ? -2 : 0;
      const score = r.score + watchHot + cleanS;
      if (proof && watchHot) r.parts.push('watches hostile target (+3)');
      if (proof && cleanS) r.parts.push('clean Spy watch (−2)');
      return {score, reason: proof ? x + ' scores ' + score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-12', domain: 1, title: 'Blind-spot operator with cover',
    order: 'Score each suspect: +3 if they send a Friend or Civilian arrow into someone NOT watched by a Spy; +2 per outgoing Double agent/Foreigner/Foe arrow; −2 per Spy watch received; −2 per Friend backing received. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const blindCov = g.out(x, ['friend', 'civilian']).some(e => !g.hasIn(e.to, 'spy')) ? 3 : 0;
      const r = sumWeights(g, x, {double_out: 2, foreigner_out: 2, foe_out: 2, spy_in: -2, friend_in: -2}, proof);
      const score = blindCov + r.score;
      if (proof && blindCov) r.parts.push('cover arrow into unwatched contact (+3)');
      return {score, reason: proof ? x + ' scores ' + score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-13', domain: 1, title: 'Surveillance gap priority',
    order: 'Score each suspect: +2 per outgoing arrow across all six rows, +2 per Foreigner or Double agent touch, +1 per Civilian touch, −3 if watched by a Spy, −1 if backed by a Friend, +1 if opposed by a Foe. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const out = g.out(x).length * 2;
      const r = sumWeights(g, x, {foreigner: 2, double: 2, civilian: 1, spy_in: -3, friend_in: -1, foe_in: 1}, proof);
      const score = out + r.score;
      return {score, reason: proof ? x + ': ' + out + ' outgoing + ' + r.score + ' role modifiers = ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-14', domain: 1, title: 'Watching a double-backed threat',
    order: 'Score each suspect: +3 if they send an arrow into a Spy watcher (left of Spy), +2 per outgoing Foreigner or Double agent arrow, +2 per incoming Foe arrow, −2 per incoming Friend backing, −1 per outgoing Civilian report. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const hitSpy = g.out(x).some(e => g.hasOut(e.to, 'spy')) ? 3 : 0;
      const r = sumWeights(g, x, {foreigner_out: 2, double_out: 2, foe_in: 2, friend_in: -2, civilian_out: -1}, proof);
      const score = hitSpy + r.score;
      return {score, reason: proof ? x + ' scores ' + score + (hitSpy ? ' (targets a Spy +3)' : '') + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-15', domain: 1, title: 'Unwatched neighbor pressure',
    order: 'For each suspect, add +2 for every direct contact NOT watched by a Spy, +1 if the suspect appears in Foe/Double agent/Foreigner, −2 if watched by a Spy, −1 if backed by a Friend, −1 if in Civilian. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const unwatched = g.neighbors(x).filter(m => !g.hasIn(m, 'spy'));
      const bonus = g.hasTouch(x, ['foe', 'double', 'foreigner']) ? 1 : 0;
      const pen = (g.hasIn(x, 'spy') ? 2 : 0) + (g.hasIn(x, 'friend') ? 1 : 0) + (g.hasTouch(x, 'civilian') ? 1 : 0);
      const score = unwatched.length * 2 + bonus - pen;
      return {score, reason: proof ? x + ': ' + unwatched.length + ' unwatched contacts (+' + (unwatched.length * 2) + ') +' + bonus + ' −' + pen + ' = ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-16', domain: 1, title: 'Shadow-breaking relay',
    order: 'Score each suspect: +3 if they receive an arrow from someone watched by a Spy; +2 per outgoing Foe, Double agent, or Foreigner arrow; +1 per Civilian arrow received; −2 if watched by a Spy; −2 if backed by a Friend. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const fromWatched = g.in(x).some(e => g.hasIn(e.from, 'spy')) ? 3 : 0;
      const r = sumWeights(g, x, {foe_out: 2, double_out: 2, foreigner_out: 2, civilian_in: 1, spy_in: -2, friend_in: -2}, proof);
      const score = fromWatched + r.score;
      if (proof && fromWatched) r.parts.push('fed by watched source (+3)');
      return {score, reason: proof ? x + ' scores ' + score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-17', domain: 1, title: 'Watched-vs-unwatched balance',
    order: 'Score each suspect: +3 per Spy arrow sent, +2 per Double agent or Foreigner link, +2 per Foe arrow received, −2 per Friend link, −1 per Civilian link, −2 per Spy arrow received. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {spy_out: 3, double: 2, foreigner: 2, foe_in: 2, friend: -2, civilian: -1, spy_in: -2}, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHard({
    id: 'ha-18', domain: 1, title: 'Evading both watch and ally',
    order: 'Shoot the two suspects linked to at least THREE distinct people across the file — who have NEITHER a Spy watching them NOR a Friend backing them.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy') || g.hasIn(x, 'friend')) return null;
        const n = g.neighbors(x);
        if (n.length >= 3) return proof ? x + ' reaches ' + n.length + ' contacts (' + n.join(', ') + ') with no Spy watch or Friend backer.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeHardRank({
    id: 'ha-19', domain: 1, title: 'Counter-watch leverage',
    order: 'Score each suspect: +2 per distinct category they appear in, +2 if they watch someone (Spy) or handle someone (Foreigner), +1 if they leak (Double agent) or oppose (Foe), −2 if backed by a Friend, −1 if reported to by a Civilian. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const cats = g.distinctRoles(x).size * 2;
      const a = g.hasOut(x, ['spy', 'foreigner']) ? 2 : 0;
      const b = g.hasOut(x, ['double', 'foe']) ? 1 : 0;
      const pen = (g.hasIn(x, 'friend') ? 2 : 0) + (g.hasIn(x, 'civilian') ? 1 : 0);
      const score = cats + a + b - pen;
      return {score, reason: proof ? x + ': ' + cats + ' role-spread +' + (a + b) + ' ops −' + pen + ' = ' + score + '.' : ''};
    }
  }),

  // =========================================================================
  // DOMAIN 2: Foreign Infiltration & Deep Border Chains (10 families)
  // =========================================================================
  makeHardRank({
    id: 'ha-20', domain: 2, title: 'Foreign network reach',
    order: 'Score each suspect: +3 per Foreigner link, +2 if linked to someone in Foreigner (via another row), +2 per Double agent link, +1 per Foe link, −2 per clean Friend backer, −1 per Spy watch, −1 per Civilian link. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {foreigner: 3, double: 2, foe: 1, spy_in: -1, civilian: -1}, proof);
      const nearF = g.neighbors(x).some(m => g.touch(m, 'foreigner').some(e => e.from !== x && e.to !== x)) ? 2 : 0;
      const cleanF = hasCleanFriend(g, x) ? -2 : 0;
      const score = r.score + nearF + cleanF;
      if (proof && nearF) r.parts.push('touches Foreigner circle (+2)');
      if (proof && cleanF) r.parts.push('clean Friend (−2)');
      return {score, reason: proof ? x + ' scores ' + score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-21', domain: 2, title: 'Foreigner’s domestic asset',
    order: 'Score each suspect: +3 if handled by a Foreigner OR 1 outgoing step from a Foreigner handler; +2 per Friend or Civilian link; +2 per Double agent link; −2 per Spy watch received; −2 per incoming Foe arrow. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const nearH = g.hasIn(x, 'foreigner') || g.in(x).some(e => g.hasOut(e.from, 'foreigner')) ? 3 : 0;
      const r = sumWeights(g, x, {friend: 2, civilian: 2, double: 2, spy_in: -2, foe_in: -2}, proof);
      const score = nearH + r.score;
      return {score, reason: proof ? x + ' scores ' + score + (nearH ? ' (fed by Foreigner handler +3)' : '') + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-22', domain: 2, title: 'Border-to-mole fusion',
    order: 'Score each suspect: +3 per Foreigner arrow sent, +3 per Double agent arrow sent, +2 per Foreigner or Double agent arrow received, +1 per Spy link, −2 per Foe arrow received, −1 per Friend or Civilian link. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {foreigner_out: 3, double_out: 3, foreigner_in: 2, double_in: 2, spy: 1, foe_in: -2, friend: -1, civilian: -1}, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-23', domain: 2, title: 'Two-hop foreign recruitment',
    order: 'Score each suspect: +3 if reachable in 1 OR 2 outgoing arrows from someone in Foreigner, +2 per outgoing Double agent/Foe arrow, +1 per Spy link, −2 per incoming Friend backing, −2 per outgoing Civilian report. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      let fromF = false;
      for (const e1 of g.in(x)) {
        if (g.hasTouch(e1.from, 'foreigner')) { fromF = true; break; }
        if (g.in(e1.from).some(e0 => e0.from !== x && g.hasTouch(e0.from, 'foreigner'))) { fromF = true; break; }
      }
      const r = sumWeights(g, x, {double_out: 2, foe_out: 2, spy: 1, friend_in: -2, civilian_out: -2}, proof);
      const score = (fromF ? 3 : 0) + r.score;
      return {score, reason: proof ? x + ' scores ' + score + (fromF ? ' (≤2 steps downstream of Foreigner +3)' : '') + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-24', domain: 2, title: 'Infiltration depth score',
    order: 'Score each suspect: +3 if handled by a Foreigner, +2 per link to someone in Friend or Civilian, +2 per Double agent link, +1 per Foe link, −2 per Spy watch received, −2 per Foreigner arrow sent. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {foreigner_in: 3, double: 2, foe: 1, spy_in: -2, foreigner_out: -2}, proof);
      const domLinks = g.neighbors(x).filter(m => g.hasTouch(m, ['friend', 'civilian'])).length * 2;
      const score = r.score + domLinks;
      if (proof && domLinks) r.parts.push('domestic contacts (+' + domLinks + ')');
      return {score, reason: proof ? x + ' scores ' + score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-25', domain: 2, title: 'Foreigner shielded by witness',
    order: 'Score each suspect: +3 if they send an arrow to someone in Foreigner, +2 per incoming Civilian or Friend arrow, +2 per Double agent link, −2 per incoming Foe arrow, −2 per incoming Spy watch. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const toF = g.out(x).some(e => g.hasTouch(e.to, 'foreigner')) ? 3 : 0;
      const r = sumWeights(g, x, {civilian_in: 2, friend_in: 2, double: 2, foe_in: -2, spy_in: -2}, proof);
      const score = toF + r.score;
      return {score, reason: proof ? x + ' scores ' + score + (toF ? ' (points into Foreigner circle +3)' : '') + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-26', domain: 2, title: 'Border counter-ops balance',
    order: 'Score each suspect: +3 per outgoing Foreigner arrow, +2 per incoming Foreigner or Double agent arrow, +2 per incoming Civilian report, +1 per outgoing Friend arrow, −2 per incoming Spy watch, −2 per outgoing Foe arrow. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {foreigner_out: 3, foreigner_in: 2, double_in: 2, civilian_in: 2, friend_out: 1, spy_in: -2, foe_out: -2}, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-27', domain: 2, title: 'Border cut-out under cover',
    order: 'Score each suspect: +3 if they receive an arrow from Foreigner/Double agent AND send an arrow in another row, +2 per outgoing Friend/Spy/Civilian arrow, +1 per Foreigner link, −2 per incoming Foe arrow, −2 per incoming Spy watch. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const relay = g.in(x, ['foreigner', 'double']).some(e1 => g.out(x).some(e2 => e2.role !== e1.role && e2.to !== e1.from)) ? 3 : 0;
      const r = sumWeights(g, x, {friend_out: 2, spy_out: 2, civilian_out: 2, foreigner: 1, foe_in: -2, spy_in: -2}, proof);
      const score = relay + r.score;
      return {score, reason: proof ? x + ' scores ' + score + (relay ? ' (border cut-out relay +3)' : '') + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-28', domain: 2, title: 'Cross-border exposure matrix',
    order: 'Score each suspect: +2 per link in Foreigner, Foe, or Spy; +3 per Double agent link; −2 if backed by a Friend; −2 if reporting as a Civilian (left of Civilian). Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {foreigner: 2, foe: 2, spy: 2, double: 3, friend_in: -2, civilian_out: -2}, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-29', domain: 2, title: 'Foreigner’s silent target',
    order: 'Score each suspect: +2 per outgoing arrow, +3 if they receive an arrow from a Foreigner or Double agent, +2 per incoming Foe arrow, −2 per incoming Spy watch, −2 per incoming Friend backing, −1 per Civilian link. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {foreigner_in: 3, double_in: 3, foe_in: 2, spy_in: -2, friend_in: -2, civilian: -1}, proof);
      const score = g.out(x).length * 2 + r.score;
      return {score, reason: proof ? x + ': ' + g.out(x).length + ' out (+' + (g.out(x).length * 2) + ') + role mods ' + r.score + ' = ' + score + '.' : ''};
    }
  }),

  // =========================================================================
  // DOMAIN 3: Civilian Exposure & Witness Protection (10 families)
  // =========================================================================
  makeHardRank({
    id: 'ha-30', domain: 3, title: 'Civilian jeopardy index',
    order: 'Score each suspect: +3 per Civilian link, +2 per link to someone in Foe/Double agent/Foreigner, +1 per Spy link, −2 if backed by a Friend, −2 if watched by a clean Spy. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {civilian: 3, spy: 1, friend_in: -2}, proof);
      const hotN = g.neighbors(x).filter(m => g.hasTouch(m, ['foe', 'double', 'foreigner'])).length * 2;
      const cleanS = hasCleanSpy(g, x) ? -2 : 0;
      const score = r.score + hotN + cleanS;
      if (proof && hotN) r.parts.push('hostile contacts (+' + hotN + ')');
      if (proof && cleanS) r.parts.push('clean Spy (−2)');
      return {score, reason: proof ? x + ' scores ' + score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-31', domain: 3, title: 'Burned informant’s handler',
    order: 'Score each suspect: +3 if they receive a Civilian report from someone who also touches Foe/Double agent/Foreigner, +2 per outgoing Foreigner or Double agent arrow, +1 per outgoing Foe arrow, −2 per incoming Friend backing, −2 per incoming Spy watch. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const burned = g.in(x, 'civilian').some(c => g.hasTouch(c.from, ['foe', 'double', 'foreigner'])) ? 3 : 0;
      const r = sumWeights(g, x, {foreigner_out: 2, double_out: 2, foe_out: 1, friend_in: -2, spy_in: -2}, proof);
      const score = burned + r.score;
      return {score, reason: proof ? x + ' scores ' + score + (burned ? ' (burned Civilian source +3)' : '') + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-32', domain: 3, title: 'Witness-shield exploitation',
    order: 'Score each suspect: +3 per Civilian arrow received, +2 per Double agent arrow sent, +2 per Foreigner arrow sent, +1 per Foe link, −2 per Friend link, −1 per Spy arrow received. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {civilian_in: 3, double_out: 2, foreigner_out: 2, foe: 1, friend: -2, spy_in: -1}, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHard({
    id: 'ha-33', domain: 3, title: 'Unprotected witness chain',
    order: 'Follow two outgoing arrows (no return) starting from someone in Civilian — where the end target is NOT backed by a Friend and NOT watched by a Spy. Shoot the two at the end.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend') || g.hasIn(x, 'spy')) return null;
        for (const e2 of g.in(x)) {
          for (const e1 of g.in(e2.from)) {
            if (e1.from !== x && g.hasTouch(e1.from, 'civilian')) {
              return proof ? x + ': Civilian-linked ' + e1.from + ' → ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  makeHardRank({
    id: 'ha-34', domain: 3, title: 'Bystander fallout ledger',
    order: 'Score each suspect: +2 per link to someone in Civilian, +3 per Foe or Double agent arrow sent, +2 per Foreigner link, −2 per Friend backing received, −2 per Spy watch received. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {foe_out: 3, double_out: 3, foreigner: 2, friend_in: -2, spy_in: -2}, proof);
      const civN = g.neighbors(x).filter(m => g.hasTouch(m, 'civilian')).length * 2;
      const score = r.score + civN;
      if (proof && civN) r.parts.push('Civilian neighbors (+' + civN + ')');
      return {score, reason: proof ? x + ' scores ' + score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-35', domain: 3, title: 'Exposed informant relay',
    order: 'Score each suspect: +3 per outgoing Civilian or Friend arrow into someone who sends a Foe, Double agent, or Foreigner arrow; +2 per incoming Double agent or Foreigner arrow; +1 per outgoing Foe arrow; −2 per Spy watch received. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const feedHot = g.out(x, ['civilian', 'friend']).filter(e => g.hasOut(e.to, ['foe', 'double', 'foreigner'])).length * 3;
      const r = sumWeights(g, x, {double_in: 2, foreigner_in: 2, foe_out: 1, spy_in: -2}, proof);
      const score = feedHot + r.score;
      if (proof && feedHot) r.parts.push('feeds active hostile (+' + feedHot + ')');
      return {score, reason: proof ? x + ' scores ' + score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-36', domain: 3, title: 'Civilian-to-covert bridge score',
    order: 'Score each suspect: +3 if they touch BOTH Civilian and any of (Foe, Double agent, Foreigner), +2 per distinct category touched, −2 if watched by a Spy, −2 if backed by a Friend. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const bridge = g.hasTouch(x, 'civilian') && g.hasTouch(x, ['foe', 'double', 'foreigner']) ? 3 : 0;
      const cats = g.distinctRoles(x).size * 2;
      const pen = (g.hasIn(x, 'spy') ? 2 : 0) + (g.hasIn(x, 'friend') ? 2 : 0);
      const score = bridge + cats - pen;
      return {score, reason: proof ? x + ': ' + cats + ' role-spread +' + bridge + ' bridge −' + pen + ' = ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-37', domain: 3, title: 'Threat around a witness',
    order: 'Score each suspect: +3 per outgoing arrow hitting someone in Civilian, +2 per outgoing Foe/Double agent/Foreigner arrow, +1 per Friend arrow sent, −2 per incoming Spy watch, −2 per incoming Friend backing. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const hitCiv = g.out(x).filter(e => g.hasTouch(e.to, 'civilian')).length * 3;
      const r = sumWeights(g, x, {foe_out: 2, double_out: 2, foreigner_out: 2, friend_out: 1, spy_in: -2, friend_in: -2}, proof);
      const score = hitCiv + r.score;
      return {score, reason: proof ? x + ' scores ' + score + (hitCiv ? ' (targets Civilian circle +' + hitCiv + ')' : '') + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-38', domain: 3, title: 'Witness corruption ledger',
    order: 'Score each suspect: +3 per Civilian arrow sent, +2 per Foreigner or Double agent link, +1 per Friend arrow sent, −2 per Foe link, −2 per Spy watch received. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {civilian_out: 3, foreigner: 2, double: 2, friend_out: 1, foe: -2, spy_in: -2}, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHard({
    id: 'ha-39', domain: 3, title: 'Unwitnessed double-target',
    order: 'Shoot the two suspects NOT in Civilian who receive arrows from TWO DIFFERENT categories — when at least one sender is NOT backed by a Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'civilian')) return null;
        const inc = g.in(x);
        for (let i = 0; i < inc.length; i++) {
          for (let j = i + 1; j < inc.length; j++) {
            if (inc[i].role !== inc[j].role && (!g.hasIn(inc[i].from, 'friend') || !g.hasIn(inc[j].from, 'friend'))) {
              return proof ? x + ': ' + g.fmt(inc[i]) + ' · ' + g.fmt(inc[j]) + ' (no Civilian).' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 4: Deep Proxies, Cut-Outs & Cascading Chains (10 families)
  // =========================================================================
  makeHardRank({
    id: 'ha-40', domain: 4, title: 'Downstream command reach',
    order: 'For each suspect, count distinct people reachable in 1 OR 2 outgoing arrows (excluding self), +2 if they appear in Double agent or Foreigner, −2 if watched by a Spy, −1 if backed by a Friend, −1 if in Civilian. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const reach = new Set();
      for (const e1 of g.out(x)) {
        reach.add(e1.to);
        for (const e2 of g.out(e1.to)) if (e2.to !== x) reach.add(e2.to);
      }
      const bonus = g.hasTouch(x, ['double', 'foreigner']) ? 2 : 0;
      const pen = (g.hasIn(x, 'spy') ? 2 : 0) + (g.hasIn(x, 'friend') ? 1 : 0) + (g.hasTouch(x, 'civilian') ? 1 : 0);
      const score = reach.size + bonus - pen;
      return {score, reason: proof ? x + ' reaches ' + reach.size + ' in ≤2 hops +' + bonus + ' −' + pen + ' = ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-41', domain: 4, title: 'Upstream convergence target',
    order: 'For each suspect, count distinct people who can reach them in 1 OR 2 outgoing arrows (excluding self), +2 if they appear in Foe or Foreigner, −2 if backed by a Friend, −1 if watched by a Spy, −1 if in Civilian. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const src = new Set();
      for (const e1 of g.in(x)) {
        src.add(e1.from);
        for (const e2 of g.in(e1.from)) if (e2.from !== x) src.add(e2.from);
      }
      const bonus = g.hasTouch(x, ['foe', 'foreigner']) ? 2 : 0;
      const pen = (g.hasIn(x, 'friend') ? 2 : 0) + (g.hasIn(x, 'spy') ? 1 : 0) + (g.hasTouch(x, 'civilian') ? 1 : 0);
      const score = src.size + bonus - pen;
      return {score, reason: proof ? x + ' reached by ' + src.size + ' in ≤2 hops +' + bonus + ' −' + pen + ' = ' + score + '.' : ''};
    }
  }),
  makeHard({
    id: 'ha-42', domain: 4, title: 'Three-step covert cascade',
    order: 'Follow THREE outgoing arrows across at least TWO different categories (no repeated suspect) starting from someone in Foe, Double agent, or Foreigner. Shoot the two at the end not backed by a Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend')) return null;
        for (const e3 of g.in(x)) {
          for (const e2 of g.in(e3.from)) {
            if (e2.from === x) continue;
            for (const e1 of g.in(e2.from)) {
              if (e1.from === x || e1.from === e3.from) continue;
              if (g.hasTouch(e1.from, ['foe', 'double', 'foreigner']) && new Set([e1.role, e2.role, e3.role]).size >= 2) {
                return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + ' → ' + g.fmt(e3) + '.' : 'ok';
              }
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  makeHardRank({
    id: 'ha-43', domain: 4, title: 'Chokepoint centrality',
    order: 'For each suspect, count directed 2-step relays A → suspect → B (with A ≠ B and DIFFERENT categories), +2 if they appear in Double agent or Foreigner, −2 if watched by a Spy, −1 if backed by a Friend. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      let relays = 0;
      for (const e1 of g.in(x)) {
        for (const e2 of g.out(x)) {
          if (e1.from !== e2.to && e1.role !== e2.role) relays++;
        }
      }
      const bonus = g.hasTouch(x, ['double', 'foreigner']) ? 2 : 0;
      const pen = (g.hasIn(x, 'spy') ? 2 : 0) + (g.hasIn(x, 'friend') ? 1 : 0);
      const score = relays + bonus - pen;
      return {score, reason: proof ? x + ': ' + relays + ' cross-category relays +' + bonus + ' −' + pen + ' = ' + score + '.' : ''};
    }
  }),
  makeHard({
    id: 'ha-44', domain: 4, title: 'Unwatched 3-step sender',
    order: 'Follow THREE outgoing arrows across at least TWO different categories (no repeated suspect) where the middle two suspects are NOT watched by a Spy. Shoot the two starters.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const e1 of g.out(x)) {
          if (g.hasIn(e1.to, 'spy')) continue;
          for (const e2 of g.out(e1.to)) {
            if (e2.to === x || g.hasIn(e2.to, 'spy')) continue;
            for (const e3 of g.out(e2.to)) {
              if (e3.to === x || e3.to === e1.to) continue;
              if (new Set([e1.role, e2.role, e3.role]).size >= 2) {
                return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + ' → ' + g.fmt(e3) + ' (unwatched cut-outs).' : 'ok';
              }
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  makeHardRank({
    id: 'ha-45', domain: 4, title: 'Undirected 2-step footprint',
    order: 'For each suspect, count distinct people within 2 links (either arrow direction, excluding self), +2 per Double agent/Foreigner link, −2 if watched by a Spy, −2 if backed by a Friend. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const d = distFrom(g, x);
      let within2 = 0;
      for (const [p, dist] of d) if (p !== x && dist <= 2) within2++;
      const bonus = g.touch(x, ['double', 'foreigner']).length * 2;
      const pen = (g.hasIn(x, 'spy') ? 2 : 0) + (g.hasIn(x, 'friend') ? 2 : 0);
      const score = within2 + bonus - pen;
      return {score, reason: proof ? x + ': ' + within2 + ' within 2 links +' + bonus + ' covert −' + pen + ' = ' + score + '.' : ''};
    }
  }),
  makeHard({
    id: 'ha-46', domain: 4, title: 'Covert middleman without a shield',
    order: 'Shoot the two middlemen receiving an arrow in ANY category and sending an arrow in a DIFFERENT category (no return) — who touch Foe, Double agent, or Foreigner AND have neither Friend backing nor Spy watch.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend') || g.hasIn(x, 'spy') || !g.hasTouch(x, ['foe', 'double', 'foreigner'])) return null;
        for (const e1 of g.in(x)) {
          for (const e2 of g.out(x)) {
            if (e2.to !== e1.from && e2.role !== e1.role) return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + ' (unshielded).' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeHardRank({
    id: 'ha-47', domain: 4, title: 'Proxy reach with role weighting',
    order: 'For each suspect, add +2 for each outgoing arrow, +2 for each person 2 outgoing steps away (distinct from 1-step), +1 per Foreigner/Double agent touch, −2 per Friend backing received, −2 per Civilian link. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const s1 = new Set(g.out(x).map(e => e.to));
      const s2 = new Set();
      for (const m of s1) for (const e2 of g.out(m)) if (e2.to !== x && !s1.has(e2.to)) s2.add(e2.to);
      const r = sumWeights(g, x, {foreigner: 1, double: 1, friend_in: -2, civilian: -2}, proof);
      const score = g.out(x).length * 2 + s2.size * 2 + r.score;
      return {score, reason: proof ? x + ': ' + g.out(x).length + ' out, ' + s2.size + ' at 2-hop, mod ' + r.score + ' = ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-48', domain: 4, title: 'Two-hop strike from Friend or Civilian',
    order: 'Score each suspect: +3 if reachable in 1 OR 2 outgoing arrows from someone in Friend or Civilian, +2 per outgoing Double agent/Foreigner/Foe arrow, −2 per incoming Spy watch, −2 per incoming Friend backing. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      let fromCov = false;
      for (const e1 of g.in(x)) {
        if (g.hasTouch(e1.from, ['friend', 'civilian'])) { fromCov = true; break; }
        if (g.in(e1.from).some(e0 => e0.from !== x && g.hasTouch(e0.from, ['friend', 'civilian']))) { fromCov = true; break; }
      }
      const r = sumWeights(g, x, {double_out: 2, foreigner_out: 2, foe_out: 2, spy_in: -2, friend_in: -2}, proof);
      const score = (fromCov ? 3 : 0) + r.score;
      return {score, reason: proof ? x + ' scores ' + score + (fromCov ? ' (≤2 hops from cover +3)' : '') + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-49', domain: 4, title: 'Two-hop covert spillover',
    order: 'For each suspect, count how many people in Foe, Double agent, or Foreigner they can reach in 1 OR 2 outgoing arrows (excluding self), then subtract 1 if watched by a Spy and subtract 1 if backed by a Friend. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const reach = new Set();
      for (const e1 of g.out(x)) {
        if (g.hasTouch(e1.to, ['foe', 'double', 'foreigner'])) reach.add(e1.to);
        for (const e2 of g.out(e1.to)) {
          if (e2.to !== x && g.hasTouch(e2.to, ['foe', 'double', 'foreigner'])) reach.add(e2.to);
        }
      }
      const pen = (g.hasIn(x, 'spy') ? 1 : 0) + (g.hasIn(x, 'friend') ? 1 : 0);
      const score = reach.size - pen;
      return {score, reason: proof ? x + ' reaches ' + reach.size + ' hostile/covert targets in ≤2 hops −' + pen + ' = ' + score + '.' : ''};
    }
  }),

  // =========================================================================
  // DOMAIN 5: Alibi Contradictions & Conflicting Evidence (10 families)
  // =========================================================================
  makeHardRank({
    id: 'ha-50', domain: 5, title: 'Contradiction friction score',
    order: 'Score each suspect: +3 if they BOTH send and receive arrows in DIFFERENT categories, +2 for each direct contact who links to BOTH Friend/Civilian AND Foe/Double agent/Foreigner, −2 if watched by a Spy, −1 if backed by a Friend. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const both = g.out(x).some(o => g.in(x).some(i => i.role !== o.role)) ? 3 : 0;
      const splitN = g.neighbors(x).filter(m => g.hasTouch(m, ['friend', 'civilian']) && g.hasTouch(m, ['foe', 'double', 'foreigner']));
      const pen = (g.hasIn(x, 'spy') ? 2 : 0) + (g.hasIn(x, 'friend') ? 1 : 0);
      const score = both + splitN.length * 2 - pen;
      return {score, reason: proof ? x + ': ' + both + ' dual-flow +' + (splitN.length * 2) + ' split-contacts −' + pen + ' = ' + score + '.' : ''};
    }
  }),
  makeHard({
    id: 'ha-51', domain: 5, title: 'Shortcut contradiction (unwatched)',
    order: 'Find a direct arrow A → B where A also reaches B in two steps across other categories, OR two suspects linked directly in TWO DIFFERENT categories. Shoot those two.',
    evaluate(g, _a, proof) {
      const pairs = [];
      for (const d of g.edges) {
        for (const m of g.people) {
          if (m === d.from || m === d.to) continue;
          const e1 = g.direct(d.from, m).find(e => e.role !== d.role);
          const e2 = e1 && g.direct(m, d.to).find(e => e.role !== d.role);
          if (e1 && e2) pairs.push({a: d.from, b: d.to, reason: g.fmt(d) + ' contradicted by ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.'});
        }
      }
      for (let i = 0; i < g.people.length; i++) {
        for (let j = i + 1; j < g.people.length; j++) {
          const a = g.people[i], b = g.people[j];
          const links = g.between(a, b);
          if (new Set(links.map(e => e.role)).size >= 2) {
            pairs.push({a, b, reason: 'Dual link: ' + g.fmt(links[0]) + ' · ' + g.fmt(links.find(e => e.role !== links[0].role)) + '.'});
          }
        }
      }
      return collectPairs(pairs, proof);
    }
  }),
  makeHardRank({
    id: 'ha-52', domain: 5, title: 'Cross-category friction index',
    order: 'Score each suspect: +2 per distinct category they appear in, +2 if they appear in BOTH (Friend or Civilian) and (Foe, Double agent, or Foreigner), +1 per outgoing arrow, −2 if watched by a Spy, −1 if backed by a clean Friend. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const cats = g.distinctRoles(x).size * 2;
      const clash = g.hasTouch(x, ['friend', 'civilian']) && g.hasTouch(x, ['foe', 'double', 'foreigner']) ? 2 : 0;
      const out = g.out(x).length;
      const pen = (g.hasIn(x, 'spy') ? 2 : 0) + (hasCleanFriend(g, x) ? 1 : 0);
      const score = cats + clash + out - pen;
      return {score, reason: proof ? x + ': ' + cats + ' cats +' + clash + ' clash +' + out + ' out −' + pen + ' = ' + score + '.' : ''};
    }
  }),
  makeHard({
    id: 'ha-53', domain: 5, title: 'Triangle contradiction',
    order: 'Find three suspects forming a triangle (all three pairs linked in DIFFERENT categories). Shoot the two members of the triangle with the MOST total links across the file.',
    evaluate(g, _a, proof) {
      const nodes = new Set();
      let desc = '';
      for (let i = 0; i < g.people.length; i++) {
        for (let j = i + 1; j < g.people.length; j++) {
          const a = g.people[i], b = g.people[j];
          const abs = g.between(a, b);
          if (!abs.length) continue;
          for (let k = j + 1; k < g.people.length; k++) {
            const c = g.people[k];
            const acs = g.between(a, c);
            const bcs = g.between(b, c);
            if (!acs.length || !bcs.length) continue;
            let tri = null;
            for (const ab of abs) {
              for (const ac of acs) {
                if (ac.role === ab.role) continue;
                const bc = bcs.find(e => e.role !== ab.role && e.role !== ac.role);
                if (bc) { tri = [ab, ac, bc]; break; }
              }
              if (tri) break;
            }
            if (tri) {
              nodes.add(a); nodes.add(b); nodes.add(c);
              if (!desc) desc = g.fmt(tri[0]) + ' · ' + g.fmt(tri[1]) + ' · ' + g.fmt(tri[2]);
            }
          }
        }
      }
      if (!nodes.size) return {pair: [], proof: []};
      return pickTopTwo([...nodes], x => ({
        score: g.touch(x).length,
        reason: proof ? x + ' in triangle (' + desc + ') with ' + g.touch(x).length + ' total links.' : ''
      }), proof);
    }
  }),
  makeHardRank({
    id: 'ha-54', domain: 5, title: 'Conflicting incoming-outgoing ledger',
    order: 'Score each suspect: +2 per incoming Foe/Double agent/Foreigner arrow, +2 per outgoing Friend/Spy/Civilian arrow, +1 per outgoing Foe/Double agent/Foreigner arrow, −2 per incoming Friend arrow, −1 per incoming Spy arrow. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {
        foe_in: 2, double_in: 2, foreigner_in: 2,
        friend_out: 2, spy_out: 2, civilian_out: 2,
        foe_out: 1, double_out: 1, foreigner_out: 1,
        friend_in: -2, spy_in: -1
      }, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-55', domain: 5, title: 'Split-loyalty suspect',
    order: 'Score each suspect: +3 if they send an arrow in (Friend, Spy, or Civilian) AND send an arrow in (Foe, Double agent, or Foreigner), +2 per outgoing Double agent/Foreigner arrow, +1 per incoming Foe arrow, −2 per incoming Friend backing, −2 per incoming Spy watch. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const split = g.hasOut(x, ['friend', 'spy', 'civilian']) && g.hasOut(x, ['foe', 'double', 'foreigner']) ? 3 : 0;
      const r = sumWeights(g, x, {double_out: 2, foreigner_out: 2, foe_in: 1, friend_in: -2, spy_in: -2}, proof);
      const score = split + r.score;
      return {score, reason: proof ? x + ' scores ' + score + (split ? ' (split outgoing loyalty +3)' : '') + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-56', domain: 5, title: 'Broken alibi index',
    order: 'For each suspect, add +2 per link they have, +2 if they link to BOTH someone in Friend and someone in Foe/Double agent/Foreigner (distinct contacts), −3 if watched by a Spy, −2 if in Civilian. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const deg = g.touch(x).length * 2;
      const n = g.neighbors(x);
      let hasSplit = false;
      for (const fr of n) {
        if (!g.hasTouch(fr, 'friend')) continue;
        if (n.some(hot => hot !== fr && g.hasTouch(hot, ['foe', 'double', 'foreigner']))) {
          hasSplit = true;
          break;
        }
      }
      const split = hasSplit ? 2 : 0;
      const pen = (g.hasIn(x, 'spy') ? 3 : 0) + (g.hasTouch(x, 'civilian') ? 2 : 0);
      const score = deg + split - pen;
      return {score, reason: proof ? x + ': ' + deg + ' links +' + split + ' split-contacts −' + pen + ' = ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-57', domain: 5, title: 'Double-channel convergence',
    order: 'Score each suspect: +2 per outgoing arrow into someone in Foe/Double agent/Foreigner, +2 per incoming arrow from Foe/Double agent/Foreigner, +1 per Civilian link, −2 per incoming Spy watch, −2 per incoming Friend backing. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const outHot = g.out(x).filter(e => g.hasTouch(e.to, ['foe', 'double', 'foreigner'])).length * 2;
      const inHot = g.in(x).filter(e => g.hasTouch(e.from, ['foe', 'double', 'foreigner'])).length * 2;
      const r = sumWeights(g, x, {civilian: 1, spy_in: -2, friend_in: -2}, proof);
      const score = outHot + inHot + r.score;
      return {score, reason: proof ? x + ': +' + outHot + ' out-hot +' + inHot + ' in-hot + ' + r.score + ' = ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-58', domain: 5, title: 'Mutual-suspicion weight',
    order: 'Score each suspect: +2 per link to someone who appears in at least TWO categories, +2 per Double agent link, +1 per Foreigner link, −2 per Friend backing received, −2 per Spy watch received, −1 per Civilian link. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const heavy = g.neighbors(x).filter(m => g.distinctRoles(m).size >= 2).length * 2;
      const r = sumWeights(g, x, {double: 2, foreigner: 1, friend_in: -2, spy_in: -2, civilian: -1}, proof);
      const score = heavy + r.score;
      return {score, reason: proof ? x + ': ' + heavy + ' multi-role contacts + ' + r.score + ' role mods = ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-59', domain: 5, title: 'Corroborated rival target',
    order: 'For each suspect, add +2 for each outgoing arrow whose target ALSO receives an arrow from someone else, +2 per Double agent/Foreigner link, −2 per incoming Spy watch, −2 per incoming Friend backing, −1 per outgoing Civilian report. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const sharedTarget = g.out(x).filter(e => g.in(e.to).some(o => o.from !== x)).length * 2;
      const r = sumWeights(g, x, {double: 2, foreigner: 2, spy_in: -2, friend_in: -2, civilian_out: -1}, proof);
      const score = sharedTarget + r.score;
      return {score, reason: proof ? x + ': +' + sharedTarget + ' converged-targets + ' + r.score + ' = ' + score + '.' : ''};
    }
  }),

  // =========================================================================
  // DOMAIN 6: Perspective & Multi-Hop Scope around {name} (10 families)
  // =========================================================================
  makeHardRank({
    id: 'ha-60', domain: 6, title: 'Hostile shadow past {name}', useAnchor: true,
    order: 'Excluding {name}, score each suspect: +3 if 2 links from {name} (not 1), +2 per Double agent or Foreigner link, +1 per Foe link, +1 per Spy link, −2 if directly linked to {name}, −2 if backed by a Friend, −1 if in Civilian. Shoot the top two.',
    scoreFn(g, x, anchor, proof) {
      if (x === anchor) return null;
      const d = distFrom(g, anchor).get(x) ?? 99;
      const pos = d === 2 ? 3 : d === 1 ? -2 : 0;
      const r = sumWeights(g, x, {double: 2, foreigner: 2, foe: 1, spy: 1, friend_in: -2, civilian: -1}, proof);
      const score = pos + r.score;
      return {score, reason: proof ? x + ' (dist ' + d + ' from ' + anchor + ') scores ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-61', domain: 6, title: 'Rival vantage to {name}', useAnchor: true,
    order: 'Excluding {name}, score each suspect: +2 for each common contact shared with {name}, +2 per distinct category shared with {name}, +2 if in Double agent or Foreigner, −2 if watched by a Spy, −2 if backed by a Friend. Shoot the top two.',
    scoreFn(g, x, anchor, proof) {
      if (x === anchor) return null;
      const aN = new Set(g.neighbors(anchor));
      const aR = g.distinctRoles(anchor);
      const sharedN = g.neighbors(x).filter(m => aN.has(m)).length * 2;
      const sharedR = [...g.distinctRoles(x)].filter(r => aR.has(r)).length * 2;
      const cov = g.hasTouch(x, ['double', 'foreigner']) ? 2 : 0;
      const pen = (g.hasIn(x, 'spy') ? 2 : 0) + (g.hasIn(x, 'friend') ? 2 : 0);
      const score = sharedN + sharedR + cov - pen;
      return {score, reason: proof ? x + ': ' + sharedN + ' shared-contacts +' + sharedR + ' shared-roles +' + cov + ' −' + pen + ' = ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-62', domain: 6, title: 'Blind spot beyond {name}', useAnchor: true,
    order: 'Excluding {name}, score each suspect: +3 if ≥3 links away (or unreachable) from {name}, +2 per outgoing Double agent/Foreigner/Foe arrow, +1 per incoming Civilian report, −2 per incoming Spy watch, −2 per incoming Friend backing. Shoot the top two.',
    scoreFn(g, x, anchor, proof) {
      if (x === anchor) return null;
      const d = distFrom(g, anchor).get(x) ?? 99;
      const far = d >= 3 ? 3 : 0;
      const r = sumWeights(g, x, {double_out: 2, foreigner_out: 2, foe_out: 2, civilian_in: 1, spy_in: -2, friend_in: -2}, proof);
      const score = far + r.score;
      return {score, reason: proof ? x + ' (dist ' + (d === 99 ? '∞' : d) + ' from ' + anchor + ') scores ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-63', domain: 6, title: 'Asymmetric distance from {name}', useAnchor: true,
    order: 'Excluding {name}, score each suspect: +3 if directly linked to {name} via Foe/Double agent/Foreigner, +2 if 2 links from {name}, +1 per distinct category touched, −2 if directly linked to {name} via Friend/Spy/Civilian, −1 if watched by a Spy. Shoot the top two.',
    scoreFn(g, x, anchor, proof) {
      if (x === anchor) return null;
      const d = distFrom(g, anchor).get(x) ?? 99;
      let score = g.distinctRoles(x).size;
      if (d === 1) {
        if (g.between(anchor, x, ['foe', 'double', 'foreigner']).length) score += 3;
        if (g.between(anchor, x, ['friend', 'spy', 'civilian']).length) score -= 2;
      } else if (d === 2) {
        score += 2;
      }
      if (g.hasIn(x, 'spy')) score -= 1;
      return {score, reason: proof ? x + ' (dist ' + d + ' from ' + anchor + ') scores ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-64', domain: 6, title: 'Indirect lever against {name}', useAnchor: true,
    order: 'Excluding {name}, score each suspect: +3 if NOT directly linked to {name} yet pointing to one of {name}’s contacts, +2 per outgoing Double agent/Foreigner/Foe arrow, +1 per Spy arrow sent, −2 per incoming Friend backing, −1 per outgoing Civilian report. Shoot the top two.',
    scoreFn(g, x, anchor, proof) {
      if (x === anchor) return null;
      const direct = new Set(g.neighbors(anchor));
      const lever = !direct.has(x) && g.out(x).some(e => direct.has(e.to)) ? 3 : 0;
      const r = sumWeights(g, x, {double_out: 2, foreigner_out: 2, foe_out: 2, spy_out: 1, friend_in: -2, civilian_out: -1}, proof);
      const score = lever + r.score;
      return {score, reason: proof ? x + ' scores ' + score + (lever ? ' (indirect lever on ' + anchor + ' +3)' : '') + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-65', domain: 6, title: 'Covert perimeter around {name}', useAnchor: true,
    order: 'Excluding {name}, score each suspect: +2 per outgoing arrow, +2 if they can reach {name} in 1 OR 2 outgoing arrows, +2 per Double agent/Foreigner link, −2 per Friend backing received, −2 per Civilian link. Shoot the top two.',
    scoreFn(g, x, anchor, proof) {
      if (x === anchor) return null;
      const canReach = g.direct(x, anchor).length > 0 || g.out(x).some(e => g.direct(e.to, anchor).length > 0);
      const r = sumWeights(g, x, {double: 2, foreigner: 2, friend_in: -2, civilian: -2}, proof);
      const score = g.out(x).length * 2 + (canReach ? 2 : 0) + r.score;
      return {score, reason: proof ? x + ': ' + g.out(x).length + ' out' + (canReach ? ', reaches ' + anchor : '') + ', score ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-66', domain: 6, title: 'Downstream shadow from {name}', useAnchor: true,
    order: 'Excluding {name}, score each suspect: +3 if {name} can reach them in 1 OR 2 outgoing arrows, +2 per Foe/Double agent/Foreigner link, −2 if watched by a Spy, −1 if backed by a Friend, −1 if in Civilian. Shoot the top two.',
    scoreFn(g, x, anchor, proof) {
      if (x === anchor) return null;
      const reached = g.direct(anchor, x).length > 0 || g.out(anchor).some(e => g.direct(e.to, x).length > 0);
      const r = sumWeights(g, x, {foe: 2, double: 2, foreigner: 2, spy_in: -2, friend_in: -1, civilian: -1}, proof);
      const score = (reached ? 3 : 0) + r.score;
      return {score, reason: proof ? x + (reached ? ' (downstream of ' + anchor + ')' : '') + ' scores ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-67', domain: 6, title: 'Unlinked mirror of {name}', useAnchor: true,
    order: 'Excluding {name}, score each suspect: +2 for each outgoing category they have that {name} does NOT have, +2 if NOT directly linked to {name}, +2 per Double agent/Foreigner arrow sent, −2 per incoming Spy watch, −2 per incoming Friend backing. Shoot the top two.',
    scoreFn(g, x, anchor, proof) {
      if (x === anchor) return null;
      const aOut = g.distinctRoles(anchor, 'out');
      const freshOut = [...g.distinctRoles(x, 'out')].filter(r => !aOut.has(r)).length * 2;
      const unlinked = g.between(anchor, x).length === 0 ? 2 : 0;
      const r = sumWeights(g, x, {double_out: 2, foreigner_out: 2, spy_in: -2, friend_in: -2}, proof);
      const score = freshOut + unlinked + r.score;
      return {score, reason: proof ? x + ': +' + freshOut + ' fresh-out +' + unlinked + ' unlinked + ' + r.score + ' = ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-68', domain: 6, title: 'Counter-circle around {name}', useAnchor: true,
    order: 'Excluding {name}, score each suspect: +3 if ≥3 links away (or unreachable) from {name}, +2 per distinct category touched, +1 per Double agent or Foreigner link, −2 if watched by a Spy, −2 if backed by a Friend. Shoot the top two.',
    scoreFn(g, x, anchor, proof) {
      if (x === anchor) return null;
      const d = distFrom(g, anchor).get(x) ?? 99;
      const far = d >= 3 ? 3 : 0;
      const cats = g.distinctRoles(x).size * 2;
      const cov = g.touch(x, ['double', 'foreigner']).length;
      const pen = (g.hasIn(x, 'spy') ? 2 : 0) + (g.hasIn(x, 'friend') ? 2 : 0);
      const score = far + cats + cov - pen;
      return {score, reason: proof ? x + ' (dist ' + (d === 99 ? '∞' : d) + ' from ' + anchor + ') scores ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-69', domain: 6, title: 'Mutual contact pressure with {name}', useAnchor: true,
    order: 'Excluding {name}, score each suspect: +2 per outgoing arrow, +2 if they point to one of {name}’s contacts, +2 per outgoing Foe or Double agent arrow, +1 per Foreigner link, −2 per incoming Friend backing, −2 per incoming Spy watch, −1 per outgoing Civilian report. Shoot the top two.',
    scoreFn(g, x, anchor, proof) {
      if (x === anchor) return null;
      const aN = new Set(g.neighbors(anchor));
      const ptsCircle = g.out(x).some(e => aN.has(e.to)) ? 2 : 0;
      const r = sumWeights(g, x, {foe_out: 2, double_out: 2, foreigner: 1, friend_in: -2, spy_in: -2, civilian_out: -1}, proof);
      const score = g.out(x).length * 2 + ptsCircle + r.score;
      return {score, reason: proof ? x + ' scores ' + score + (ptsCircle ? ' (points into ' + anchor + '’s circle)' : '') + '.' : ''};
    }
  }),

  // =========================================================================
  // DOMAIN 7: Corroboration, Independence & Tainted Channels (10 families)
  // =========================================================================
  makeHardRank({
    id: 'ha-70', domain: 7, title: 'Independent channel dominance',
    order: 'Score each suspect: +3 per distinct category they appear in, +2 if they have links to ≥3 different suspects, −2 if watched by a Spy, −2 if backed by a Friend, −1 if in Civilian. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const cats = g.distinctRoles(x).size * 3;
      const spread = g.neighbors(x).length >= 3 ? 2 : 0;
      const pen = (g.hasIn(x, 'spy') ? 2 : 0) + (g.hasIn(x, 'friend') ? 2 : 0) + (g.hasTouch(x, 'civilian') ? 1 : 0);
      const score = cats + spread - pen;
      return {score, reason: proof ? x + ': ' + g.distinctRoles(x).size + ' categories, ' + g.neighbors(x).length + ' contacts, score ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-71', domain: 7, title: 'Tainted-corroboration score',
    order: 'For each suspect, add +2 for each incoming arrow from a DIFFERENT category, +2 for each sender who touches Foe/Double agent/Foreigner, −2 if backed by a Friend, −2 if watched by a Spy. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const inc = g.in(x);
      const cats = new Set(inc.map(e => e.role)).size * 2;
      const hotS = new Set(inc.filter(e => g.hasTouch(e.from, ['foe', 'double', 'foreigner'])).map(e => e.from)).size * 2;
      const pen = (g.hasIn(x, 'friend') ? 2 : 0) + (g.hasIn(x, 'spy') ? 2 : 0);
      const score = cats + hotS - pen;
      return {score, reason: proof ? x + ': ' + cats + ' in-cats +' + hotS + ' covert-senders −' + pen + ' = ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-72', domain: 7, title: 'Multi-channel suspect without clean cover',
    order: 'Score each suspect: +2 per distinct outgoing category, +2 per distinct incoming category, +2 per Double agent/Foreigner link, −3 per clean Friend backer (not in Double agent/Foreigner), −3 per clean Spy watcher (not in Foe/Double agent/Foreigner). Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const spread = (g.distinctRoles(x, 'out').size + g.distinctRoles(x, 'in').size) * 2;
      const cov = g.touch(x, ['double', 'foreigner']).length * 2;
      const pen = (hasCleanFriend(g, x) ? 3 : 0) + (hasCleanSpy(g, x) ? 3 : 0);
      const score = spread + cov - pen;
      return {score, reason: proof ? x + ': ' + spread + ' dir-roles +' + cov + ' covert −' + pen + ' clean-guards = ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-73', domain: 7, title: 'Corroborated sender pressure',
    order: 'For each suspect, add +2 for each outgoing arrow in a DIFFERENT category, +2 for each target they hit who appears in ≥2 categories, −2 if watched by a Spy, −1 if backed by a Friend, −1 if in Civilian. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const out = g.out(x);
      const cats = new Set(out.map(e => e.role)).size * 2;
      const heavyT = new Set(out.filter(e => g.distinctRoles(e.to).size >= 2).map(e => e.to)).size * 2;
      const pen = (g.hasIn(x, 'spy') ? 2 : 0) + (g.hasIn(x, 'friend') ? 1 : 0) + (g.hasTouch(x, 'civilian') ? 1 : 0);
      const score = cats + heavyT - pen;
      return {score, reason: proof ? x + ': ' + cats + ' out-cats +' + heavyT + ' hub-targets −' + pen + ' = ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-74', domain: 7, title: 'Unbacked neighborhood reach',
    order: 'For each suspect, count distinct contacts who are NOT backed by a Friend, add +2 if the suspect appears in Double agent or Foreigner, +1 if in Foe, −2 if watched by a Spy, −1 if in Civilian. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const unb = g.neighbors(x).filter(m => !g.hasIn(m, 'friend')).length;
      const bonus = (g.hasTouch(x, ['double', 'foreigner']) ? 2 : 0) + (g.hasTouch(x, 'foe') ? 1 : 0);
      const pen = (g.hasIn(x, 'spy') ? 2 : 0) + (g.hasTouch(x, 'civilian') ? 1 : 0);
      const score = unb + bonus - pen;
      return {score, reason: proof ? x + ': ' + unb + ' unbacked contacts +' + bonus + ' −' + pen + ' = ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-75', domain: 7, title: 'Category rarity score',
    order: 'Score each suspect: +3 per link in Double agent or Foreigner, +2 per link in Spy or Civilian, +1 per link in Foe, −2 per Friend backing received, +1 for each distinct neighbor beyond 2. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {double: 3, foreigner: 3, spy: 2, civilian: 2, foe: 1, friend_in: -2}, proof);
      const extra = Math.max(0, g.neighbors(x).length - 2);
      const score = r.score + extra;
      return {score, reason: proof ? x + ' scores ' + score + ' (role ' + r.score + ' + ' + extra + ' excess neighbors).' : ''};
    }
  }),
  makeHard({
    id: 'ha-76', domain: 7, title: 'Independent covert corroboration',
    order: 'Shoot the two suspects linked (either way) to at least THREE distinct people across at least THREE different categories — excluding anyone with a clean Spy watcher.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        const n = g.neighbors(x);
        const r = g.distinctRoles(x);
        if (n.length >= 3 && r.size >= 3) return proof ? x + ' spans ' + r.size + ' categories across ' + n.length + ' contacts (no clean Spy).' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeHardRank({
    id: 'ha-77', domain: 7, title: 'Cross-division corroboration',
    order: 'Score each suspect: +2 for each pair they send an arrow in (Friend/Foe, Spy/Double agent, Civilian/Foreigner), +2 per outgoing Double agent/Foreigner arrow, +1 per incoming Foe arrow, −2 per incoming Spy watch, −2 per incoming Friend backing. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const divs = (g.hasOut(x, ['friend', 'foe']) ? 1 : 0) + (g.hasOut(x, ['spy', 'double']) ? 1 : 0) + (g.hasOut(x, ['civilian', 'foreigner']) ? 1 : 0);
      const r = sumWeights(g, x, {double_out: 2, foreigner_out: 2, foe_in: 1, spy_in: -2, friend_in: -2}, proof);
      const score = divs * 2 + r.score;
      return {score, reason: proof ? x + ': ' + divs + ' active pairs (+' + (divs * 2) + ') + ' + r.score + ' = ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-78', domain: 7, title: 'Unwitnessed network density',
    order: 'For each suspect, sum the number of links held by ALL of their direct contacts, then subtract 3 if the suspect is watched by a Spy, subtract 3 if backed by a Friend, and subtract 2 if in Civilian. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      let nSum = 0;
      for (const m of g.neighbors(x)) nSum += g.touch(m).length;
      const pen = (g.hasIn(x, 'spy') ? 3 : 0) + (g.hasIn(x, 'friend') ? 3 : 0) + (g.hasTouch(x, 'civilian') ? 2 : 0);
      const score = nSum - pen;
      return {score, reason: proof ? x + ': neighbor-link sum ' + nSum + ' −' + pen + ' guard = ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-79', domain: 7, title: 'Multi-source exposure index',
    order: 'Score each suspect: +2 per link across all six rows, +2 if appearing in both incoming and outgoing roles, −3 if backed by a Friend, −2 if watched by a Spy, +1 per Foreigner or Double agent link. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const links = g.touch(x).length * 2;
      const both = g.in(x).length > 0 && g.out(x).length > 0 ? 2 : 0;
      const r = sumWeights(g, x, {foreigner: 1, double: 1, friend_in: -3, spy_in: -2}, proof);
      const score = links + both + r.score;
      return {score, reason: proof ? x + ': ' + links + ' links +' + both + ' dual-dir + ' + r.score + ' = ' + score + '.' : ''};
    }
  }),

  // =========================================================================
  // DOMAIN 8: Double Lives, Role Asymmetry & Undercover Anomalies (10 families)
  // =========================================================================
  makeHardRank({
    id: 'ha-80', domain: 8, title: 'Asymmetric operational aggression',
    order: 'For each suspect, compute (outgoing arrows × 2) minus (incoming arrows), then add +2 per Double agent/Foreigner link, +1 per Foe link, −2 per Friend backing received, −2 per Spy watch received. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const asym = g.out(x).length * 2 - g.in(x).length;
      const r = sumWeights(g, x, {double: 2, foreigner: 2, foe: 1, friend_in: -2, spy_in: -2}, proof);
      const score = asym + r.score;
      return {score, reason: proof ? x + ': ' + g.out(x).length + '×2 − ' + g.in(x).length + ' + ' + r.score + ' = ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-81', domain: 8, title: 'Asymmetric target exposure',
    order: 'For each suspect, compute (incoming arrows × 2) minus (outgoing arrows), then add +2 per Foe/Double agent/Foreigner link, −3 if backed by a Friend, −2 if watched by a Spy, −1 if in Civilian. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const asym = g.in(x).length * 2 - g.out(x).length;
      const r = sumWeights(g, x, {foe: 2, double: 2, foreigner: 2, friend_in: -3, spy_in: -2, civilian: -1}, proof);
      const score = asym + r.score;
      return {score, reason: proof ? x + ': ' + g.in(x).length + '×2 − ' + g.out(x).length + ' + ' + r.score + ' = ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-82', domain: 8, title: 'Three-pair double life (unwatched)',
    order: 'Score each suspect: +2 for each pair they touch (Friend/Foe, Spy/Double agent, Civilian/Foreigner), +2 per outgoing arrow, −2 per incoming Friend backing, −2 per incoming Spy watch, −1 per outgoing Civilian report. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const pairs = (g.hasTouch(x, ['friend', 'foe']) ? 1 : 0) + (g.hasTouch(x, ['spy', 'double']) ? 1 : 0) + (g.hasTouch(x, ['civilian', 'foreigner']) ? 1 : 0);
      const out = g.out(x).length * 2;
      const r = sumWeights(g, x, {friend_in: -2, spy_in: -2, civilian_out: -1}, proof);
      const score = pairs * 2 + out + r.score;
      return {score, reason: proof ? x + ': ' + pairs + ' pairs (+' + (pairs * 2) + ') +' + out + ' out + ' + r.score + ' = ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-83', domain: 8, title: 'Active-vs-passive role inversion',
    order: 'Score each suspect: +3 per outgoing Double agent, Foreigner, or Foe arrow; +2 per incoming Civilian or Friend arrow; −2 per incoming Spy arrow; −2 per outgoing Friend or Civilian arrow. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {
        double_out: 3, foreigner_out: 3, foe_out: 3,
        civilian_in: 2, friend_in: 2,
        spy_in: -2, friend_out: -2, civilian_out: -2
      }, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-84', domain: 8, title: 'Undercover role-switch score',
    order: 'Score each suspect: +3 per outgoing Spy or Friend arrow, +2 per incoming Double agent or Foreigner arrow, +1 per Foe link, −2 per incoming Friend arrow, −1 per Civilian link. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {
        spy_out: 3, friend_out: 3,
        double_in: 2, foreigner_in: 2,
        foe: 1, friend_in: -2, civilian: -1
      }, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHard({
    id: 'ha-85', domain: 8, title: 'Silent receiver across roles',
    order: 'Shoot the two suspects who RECEIVE more arrows than they SEND, appear in at least TWO categories, AND have NO Friend backing them.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend')) return null;
        if (g.in(x).length > g.out(x).length && g.distinctRoles(x).size >= 2) {
          return proof ? x + ' receives ' + g.in(x).length + ' vs sends ' + g.out(x).length + ' across ' + g.distinctRoles(x).size + ' roles (no Friend).' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeHard({
    id: 'ha-86', domain: 8, title: 'Dominant actor across roles',
    order: 'Shoot the two suspects who SEND more arrows than they RECEIVE, appear in at least TWO categories, AND are NOT watched by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        if (g.out(x).length > g.in(x).length && g.distinctRoles(x).size >= 2) {
          return proof ? x + ' sends ' + g.out(x).length + ' vs receives ' + g.in(x).length + ' across ' + g.distinctRoles(x).size + ' roles (unwatched).' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeHardRank({
    id: 'ha-87', domain: 8, title: 'Directional split tension',
    order: 'Score each suspect: +2 per outgoing arrow in (Foe, Spy, Foreigner), +2 per incoming arrow in (Double agent, Civilian, Foreigner), −2 per outgoing Friend arrow, −2 per incoming Spy arrow, +1 if appearing on BOTH sides of arrows. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {
        foe_out: 2, spy_out: 2, foreigner_out: 2,
        double_in: 2, civilian_in: 2, foreigner_in: 2,
        friend_out: -2, spy_in: -2
      }, proof);
      const both = g.out(x).length > 0 && g.in(x).length > 0 ? 1 : 0;
      const score = r.score + both;
      return {score, reason: proof ? x + ' scores ' + score + ' (' + r.parts.join('; ') + (both ? '; dual-side +1' : '') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-88', domain: 8, title: 'Cover-to-aggression ratio',
    order: 'Score each suspect: +3 per Double agent link, +2 per Foe arrow sent, +2 per Foreigner arrow received, +1 per Spy arrow sent, −2 per Friend backing received, −2 per Civilian arrow sent. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {
        double: 3, foe_out: 2, foreigner_in: 2, spy_out: 1, friend_in: -2, civilian_out: -2
      }, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-89', domain: 8, title: 'Six-role operational imbalance',
    order: 'Score each suspect: +3 per Foreigner arrow sent, +2 per Double agent arrow received, +2 per Foe arrow sent, +1 per Civilian arrow received, −2 per Friend arrow received, −2 per Spy arrow received. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {
        foreigner_out: 3, double_in: 2, foe_out: 2, civilian_in: 1, friend_in: -2, spy_in: -2
      }, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),

  // =========================================================================
  // DOMAIN 9: Full-File Six-Category Strategic Synthesis (10 families)
  // =========================================================================
  makeHardRank({
    id: 'ha-90', domain: 9, title: 'Full-dossier kill order',
    order: 'Score each suspect across all six rows: +4 Double agent, +3 Foreigner, +2 Foe, +1 Spy, −2 Friend, −1 Civilian (counting every link they touch). Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {double: 4, foreigner: 3, foe: 2, spy: 1, friend: -2, civilian: -1}, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-91', domain: 9, title: 'Directional kill ledger',
    order: 'Score outgoing arrows (+4 Double agent, +3 Foreigner, +2 Foe, +1 Spy, −2 Friend, −1 Civilian) PLUS incoming arrows (+2 Foreigner, +2 Double agent, +1 Foe, −2 Spy, −2 Friend, +1 Civilian). Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {
        double_out: 4, foreigner_out: 3, foe_out: 2, spy_out: 1, friend_out: -2, civilian_out: -1,
        foreigner_in: 2, double_in: 2, foe_in: 1, spy_in: -2, friend_in: -2, civilian_in: 1
      }, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-92', domain: 9, title: 'Network contagion index',
    order: 'Each suspect’s score = their own covert links (Double agent +2, Foreigner +2, Foe +1) PLUS +1 for every direct contact who touches Double agent, Foreigner, or Foe, MINUS 2 if backed by a Friend, MINUS 2 if watched by a Spy, MINUS 1 if in Civilian. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {double: 2, foreigner: 2, foe: 1, friend_in: -2, spy_in: -2, civilian: -1}, proof);
      const contag = g.neighbors(x).filter(m => g.hasTouch(m, ['double', 'foreigner', 'foe'])).length;
      const score = r.score + contag;
      return {score, reason: proof ? x + ': own ' + r.score + ' + ' + contag + ' hostile neighbors = ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-93', domain: 9, title: 'High-value mole extraction',
    order: 'Score each suspect: +3 per Double agent link, +3 per Spy link, +2 per Foreigner link, −2 per Foe link, −2 per Friend backing received, +1 per Civilian link. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {double: 3, spy: 3, foreigner: 2, foe: -2, friend_in: -2, civilian: 1}, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-94', domain: 9, title: 'Border-overt squeeze',
    order: 'Score each suspect: +3 per Foreigner link, +3 per Foe link, +2 per Civilian link, +1 per Double agent link, −3 per Friend link, −2 per Spy link. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {foreigner: 3, foe: 3, civilian: 2, double: 1, friend: -3, spy: -2}, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-95', domain: 9, title: 'Counter-espionage sweep',
    order: 'Score each suspect: +3 per Double agent link, +2 per Foreigner link, +2 per Friend arrow sent, +1 per Civilian arrow received, −2 per Spy arrow received, −2 per Foe arrow received. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumWeights(g, x, {double: 3, foreigner: 2, friend_out: 2, civilian_in: 1, spy_in: -2, foe_in: -2}, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-96', domain: 9, title: 'Second-order vulnerability',
    order: 'For each suspect, add +2 per contact in Double agent/Foreigner, +1 per contact in Foe/Civilian, +1 per own link in any row, −2 if watched by a Spy, −2 if backed by a Friend. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      let score = g.touch(x).length;
      for (const m of g.neighbors(x)) {
        if (g.hasTouch(m, ['double', 'foreigner'])) score += 2;
        if (g.hasTouch(m, ['foe', 'civilian'])) score += 1;
      }
      if (g.hasIn(x, 'spy')) score -= 2;
      if (g.hasIn(x, 'friend')) score -= 2;
      return {score, reason: proof ? x + ' scores ' + score + ' across own links and neighbor roles.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-97', domain: 9, title: 'Covert footprint minus protection',
    order: 'Score each suspect: +2 per outgoing arrow in any row, +2 per link in Double agent/Foreigner/Foe, −2 per incoming arrow in Friend/Spy/Civilian. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const out = g.out(x).length * 2;
      const hot = g.touch(x, ['double', 'foreigner', 'foe']).length * 2;
      const prot = g.in(x, ['friend', 'spy', 'civilian']).length * 2;
      const score = out + hot - prot;
      return {score, reason: proof ? x + ': ' + out + ' out +' + hot + ' covert −' + prot + ' incoming-shield = ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-98', domain: 9, title: 'Escalation chain priority',
    order: 'Score each suspect: +3 if they send an arrow into someone in Double agent/Foreigner, +2 if they receive an arrow from Foe/Double agent/Foreigner, +1 per distinct category touched, −2 if watched by a Spy, −1 if backed by a Friend, −1 if in Civilian. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const a = g.out(x).some(e => g.hasTouch(e.to, ['double', 'foreigner'])) ? 3 : 0;
      const b = g.in(x).some(e => g.hasTouch(e.from, ['foe', 'double', 'foreigner'])) ? 2 : 0;
      const cats = g.distinctRoles(x).size;
      const pen = (g.hasIn(x, 'spy') ? 2 : 0) + (g.hasIn(x, 'friend') ? 1 : 0) + (g.hasTouch(x, 'civilian') ? 1 : 0);
      const score = a + b + cats - pen;
      return {score, reason: proof ? x + ': ' + a + ' feed +' + b + ' targeted +' + cats + ' cats −' + pen + ' = ' + score + '.' : ''};
    }
  }),
  makeHardRank({
    id: 'ha-99', domain: 9, title: 'Whole-network kill synthesis',
    order: 'Score each suspect: +2 per distinct contact, +2 per Double agent or Foreigner link, +1 per Foe or Spy link, −2 per Friend backing received, −2 per Civilian report received, +1 if they send more arrows than they receive. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const deg = g.neighbors(x).length * 2;
      const r = sumWeights(g, x, {double: 2, foreigner: 2, foe: 1, spy: 1, friend_in: -2, civilian_in: -2}, proof);
      const act = g.out(x).length > g.in(x).length ? 1 : 0;
      const score = deg + r.score + act;
      return {score, reason: proof ? x + ': ' + deg + ' contacts + ' + r.score + ' roles +' + act + ' active = ' + score + '.' : ''};
    }
  })
];
