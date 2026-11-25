import {collectMatches, collectPairs, pickTopTwo} from './case-graph.js';

// 100 genuinely distinct Moderate operational families (10 domains × 10 families).
// Calibrated to 125–130 IQ (capable 18-year-old) paired with 3 disputed records in
// irreducible coupled 2-SAT cross-checks (zero standalone Verified handouts).
// Every order is grounded in espionage decisions across all six distinct categories.

function makeMod({id, domain, title, order, useAnchor = false, evaluate}) {
  return {id, tier: 'medium', domain, title, order, hint: '', useAnchor, evaluate};
}

function makeModRank({id, domain, title, order, useAnchor = false, scoreFn, minScore = -Infinity}) {
  return {
    id, tier: 'medium', domain, title, order, hint: '', useAnchor,
    evaluate(g, anchor, proof) {
      return pickTopTwo(g.people, x => scoreFn(g, x, anchor, proof), proof, minScore);
    }
  };
}

function edgesByDir(g, name, roles, dir) {
  if (dir === 'out') return g.out(name, roles);
  if (dir === 'in') return g.in(name, roles);
  return g.touch(name, roles);
}

function sumReachScore(g, x, weights, includeProof) {
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

export const moderateFamilies = [
  // =========================================================================
  // DOMAIN 0: Cover & Betrayal (10 families)
  // =========================================================================
  makeMod({
    id: 'mo-00', domain: 0, title: 'Tainted alibi chain',
    order: 'Shoot the two suspects backed by a Friend OR reported to by a Civilian whose contact sends a Foe, Double agent, or Foreigner arrow — unless a Spy watches the suspect.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        for (const f of g.in(x, ['friend', 'civilian'])) {
          const bad = g.out(f.from, ['foe', 'double', 'foreigner'])[0];
          if (bad) return proof ? x + ': ' + g.fmt(f) + ' tainted by ' + g.fmt(bad) + ' (no Spy watch).' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-01', domain: 0, title: 'Betraying an ally’s contact',
    order: 'Shoot the two suspects leaking (Double agent) or opposing (Foe) someone linked to a Friend — excluding anyone watched by a Spy or linked to a Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy') || g.hasTouch(x, 'civilian')) return null;
        for (const e of g.out(x, ['double', 'foe'])) {
          const fr = g.touch(e.to, 'friend')[0];
          if (fr) return proof ? x + ': ' + g.fmt(e) + ' hits Friend-linked ' + e.to + ' (' + g.fmt(fr) + ').' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-02', domain: 0, title: 'False shield',
    order: 'Shoot the two suspects who back a Friend OR report as a Civilian to someone who links to BOTH a Spy/Civilian and a Foe/Double agent/Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const e of g.out(x, ['friend', 'civilian'])) {
          const m = e.to;
          const a = g.touch(m, ['spy', 'civilian']).find(t => t !== e);
          const b = g.touch(m, ['foe', 'double', 'foreigner'])[0];
          if (a && b) return proof ? x + ': ' + g.fmt(e) + ' into compromised ' + m + ' (' + g.fmt(a) + ' · ' + g.fmt(b) + ').' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-03', domain: 0, title: 'Unmonitored turncoat',
    order: 'Shoot the two suspects with a Friend link AND a link in Foe, Double agent, or Foreigner — unless watched by a Spy whose watcher is NOT in Double agent or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const fr = g.touch(x, 'friend')[0];
        const hot = g.touch(x, ['foe', 'double', 'foreigner'])[0];
        if (!fr || !hot) return null;
        const cleanWatcher = g.in(x, 'spy').some(s => !g.hasTouch(s.from, ['double', 'foreigner']));
        if (cleanWatcher) return null;
        return proof ? x + ': ' + g.fmt(fr) + ' & ' + g.fmt(hot) + ' without a clean Spy watcher.' : 'ok';
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-04', domain: 0, title: 'Covertly steered ally',
    order: 'Shoot the two suspects backed by a Friend OR reported to by a Civilian whose contact is steered (incoming arrow) by a Foreigner, Double agent, Spy, or Foe — excluding anyone watched by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        for (const f of g.in(x, ['friend', 'civilian'])) {
          const steer = g.in(f.from, ['foreigner', 'double', 'spy', 'foe'])[0];
          if (steer) return proof ? x + ': ' + g.fmt(f) + ', source steered via ' + g.fmt(steer) + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-05', domain: 0, title: 'Ally of an active traitor',
    order: 'Shoot the two suspects linked (either way) in Friend or Spy to someone who sends an arrow in Double agent or Foreigner — unless a Foe opposes that suspect.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'foe')) return null;
        for (const e of g.touch(x, ['friend', 'spy'])) {
          const m = e.from === x ? e.to : e.from;
          const act = g.out(m, ['double', 'foreigner'])[0];
          if (act) return proof ? x + ': ' + g.fmt(e) + ' · ' + g.fmt(act) + ' (unopposed by Foe).' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-06', domain: 0, title: 'Double-crossed partner',
    order: 'Shoot the two suspects who back someone (Friend) or report to someone (Civilian) who ALSO sends or receives a Foe, Double agent, or Foreigner arrow — while the suspect is NOT backed by a Friend and NOT watched by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend') || g.hasIn(x, 'spy')) return null;
        for (const f of g.out(x, ['friend', 'civilian'])) {
          const bad = g.touch(f.to, ['foe', 'double', 'foreigner'])[0];
          if (bad) return proof ? x + ': ' + g.fmt(f) + ' · ' + g.fmt(bad) + ' (unshielded).' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-07', domain: 0, title: 'Compromised voucher network',
    order: 'Shoot the two suspects linked in Civilian or Friend to someone whose direct contacts include BOTH a Double agent/Foreigner AND a Foe/Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const e of g.touch(x, ['civilian', 'friend'])) {
          const m = e.from === x ? e.to : e.from;
          const a = g.touch(m, ['double', 'foreigner'])[0];
          const b = g.touch(m, ['foe', 'spy'])[0];
          if (a && b) return proof ? x + ': ' + g.fmt(e) + ' via ' + m + ' (' + g.fmt(a) + ' · ' + g.fmt(b) + ').' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeModRank({
    id: 'mo-08', domain: 0, title: 'Deepest betrayal score',
    order: 'Score each suspect: +3 per Double agent link, +2 per Foreigner or Foe link, +1 per Friend backing received, −2 if watched by a Spy, −1 per Civilian link. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumReachScore(g, x, {double: 3, foreigner: 2, foe: 2, friend_in: 1, spy_in: -2, civilian: -1}, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeMod({
    id: 'mo-09', domain: 0, title: 'Shielded mole’s sponsor',
    order: 'Shoot the two suspects who appear in Friend OR Civilian and link (in any row) to someone who appears in Double agent OR Foreigner — excluding anyone watched by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy') || !g.hasTouch(x, ['friend', 'civilian'])) return null;
        for (const e of g.touch(x)) {
          const m = e.from === x ? e.to : e.from;
          const bad = g.touch(m, ['double', 'foreigner']).find(t => t !== e);
          if (bad) return proof ? x + ': ' + g.fmt(e) + ' → ' + g.fmt(bad) + ' (unwatched).' : 'ok';
        }
        return null;
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 1: Surveillance & Blind Spots (10 families)
  // =========================================================================
  makeMod({
    id: 'mo-10', domain: 1, title: 'Corrupted surveillance',
    order: 'Shoot the two suspects watched by a Spy whose watcher links to Foe, Double agent, or Foreigner — OR who have NO Spy watch yet link to Double agent and Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const s of g.in(x, 'spy')) {
          const bad = g.touch(s.from, ['foe', 'double', 'foreigner'])[0];
          if (bad) return proof ? x + ': watcher ' + s.from + ' compromised (' + g.fmt(s) + ' · ' + g.fmt(bad) + ').' : 'ok';
        }
        if (!g.hasIn(x, 'spy') && g.hasTouch(x, 'double') && g.hasTouch(x, 'foreigner')) {
          return proof ? x + ' links to both Double agent and Foreigner with no Spy watch.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-11', domain: 1, title: 'Unwatched covert bridge',
    order: 'Shoot the two suspects NOT watched by a Spy who appear in at least TWO categories among Foe, Double agent, Civilian, and Foreigner — and are NOT backed by a Friend.',
    evaluate(g, _a, proof) {
      const set = ['foe', 'double', 'civilian', 'foreigner'];
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy') || g.hasIn(x, 'friend')) return null;
        const hits = set.filter(r => g.hasTouch(x, r));
        if (hits.length >= 2) return proof ? x + ' spans ' + hits.join(', ') + ' with no Spy watch or Friend backing.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-12', domain: 1, title: 'Watcher turned blind',
    order: 'Shoot the two suspects linked (either way) in Foe, Double agent, or Foreigner to a Spy (left of Spy) — unless that suspect is backed by a Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend')) return null;
        for (const e of g.touch(x, ['foe', 'double', 'foreigner'])) {
          const m = e.from === x ? e.to : e.from;
          const sp = g.out(m, 'spy')[0];
          if (sp) return proof ? x + ': ' + g.fmt(e) + ' tied to Spy ' + m + ' (' + g.fmt(sp) + ').' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-13', domain: 1, title: 'Shadowed by a hostile’s contact',
    order: 'Shoot the two suspects watched by a Spy OR linked to a Civilian whose contact is linked to someone in Foe or Foreigner — excluding anyone in Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'friend')) return null;
        for (const e of [...g.in(x, 'spy'), ...g.touch(x, 'civilian')]) {
          const m = e.from === x ? e.to : e.from;
          const bad = g.touch(m, ['foe', 'foreigner'])[0];
          if (bad) return proof ? x + ': ' + g.fmt(e) + ' · ' + g.fmt(bad) + ' (no Friend link).' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-14', domain: 1, title: 'Slipping past the watch',
    order: 'Shoot the two suspects sending an arrow in Foe, Double agent, or Foreigner to someone NOT watched by a Spy — when the sender also appears in Friend or Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (!g.hasTouch(x, ['friend', 'civilian'])) return null;
        for (const e of g.out(x, ['foe', 'double', 'foreigner'])) {
          if (!g.hasIn(e.to, 'spy')) return proof ? x + ': ' + g.fmt(e) + ' into unwatched ' + e.to + ' while holding cover.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-15', domain: 1, title: 'Compromised watch list',
    order: 'Shoot the two suspects who link to someone watched by a Spy — when the suspect is NOT in Friend and has a link in Foe, Double agent, or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'friend') || !g.hasTouch(x, ['foe', 'double', 'foreigner'])) return null;
        for (const e of g.touch(x)) {
          const m = e.from === x ? e.to : e.from;
          const sp = g.in(m, 'spy').find(s => s !== e);
          if (sp) return proof ? x + ': ' + g.fmt(e) + ' touches watched ' + m + ' (' + g.fmt(sp) + ').' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-16', domain: 1, title: 'Surveillance counter-move',
    order: 'Shoot the two suspects watched by a Spy who ALSO send an arrow (in any category) to someone in Foe, Double agent, or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const sp = g.in(x, 'spy')[0];
        if (!sp) return null;
        for (const e of g.out(x)) {
          const bad = g.touch(e.to, ['foe', 'double', 'foreigner']).find(t => t !== e);
          if (bad) return proof ? x + ': ' + g.fmt(sp) + ', sends ' + g.fmt(e) + ' → ' + g.fmt(bad) + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-17', domain: 1, title: 'Unwatched recruiter',
    order: 'Shoot the two suspects with at least TWO outgoing arrows across DIFFERENT categories, neither watched by a Spy nor backed by a Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy') || g.hasIn(x, 'friend')) return null;
        const out = g.out(x);
        const roles = new Set(out.map(e => e.role));
        if (roles.size >= 2) return proof ? x + ' acts in ' + roles.size + ' categories (' + out.map(g.fmt).join('; ') + ') with no Spy/Friend guard.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeModRank({
    id: 'mo-18', domain: 1, title: 'Blind-spot threat index',
    order: 'Score each suspect: +3 per Spy link, +2 per Foreigner or Double agent link, +1 per Foe link, −2 per Friend backing received, −1 per Civilian report sent. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumReachScore(g, x, {spy: 3, foreigner: 2, double: 2, foe: 1, friend_in: -2, civilian_out: -1}, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeMod({
    id: 'mo-19', domain: 1, title: 'Watcher’s leaked target',
    order: 'Shoot the two suspects receiving a Spy watch OR Civilian report from someone who ALSO appears in Double agent, Foreigner, or Friend — excluding anyone opposed by a Foe.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'foe')) return null;
        for (const e of g.in(x, ['spy', 'civilian'])) {
          const extra = g.touch(e.from, ['double', 'foreigner', 'friend'])[0];
          if (extra) return proof ? x + ': ' + g.fmt(e) + ' · ' + g.fmt(extra) + ' (unopposed by Foe).' : 'ok';
        }
        return null;
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 2: Foreign Infiltration (10 families)
  // =========================================================================
  makeMod({
    id: 'mo-20', domain: 2, title: 'Foreign chain into domestic cover',
    order: 'Shoot the two suspects linked (either way) to someone handled by a Foreigner — when that suspect ALSO appears in Friend, Spy, or Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (!g.hasTouch(x, ['friend', 'spy', 'civilian'])) return null;
        for (const e of g.touch(x)) {
          const m = e.from === x ? e.to : e.from;
          const fh = g.in(m, 'foreigner').find(t => t !== e);
          if (fh) return proof ? x + ': ' + g.fmt(e) + ' reaches foreign asset ' + m + ' (' + g.fmt(fh) + ').' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-21', domain: 2, title: 'Handler’s hidden reach',
    order: 'Shoot the two suspects two arrows away (following arrow direction, no return) from a Foreigner handler (left of Foreigner) — excluding anyone watched by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        for (const e2 of g.in(x)) {
          for (const e1 of g.in(e2.from)) {
            if (e1.from !== x && g.hasOut(e1.from, 'foreigner')) {
              return proof ? x + ': Foreigner ' + e1.from + ' → ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-22', domain: 2, title: 'Border-to-mole conduit',
    order: 'Shoot the two suspects linked (either way) to BOTH someone in Foreigner AND someone in Double agent (two different contacts) — or appearing in both themselves.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'foreigner') && g.hasTouch(x, 'double')) {
          return proof ? x + ' directly bridges Foreigner and Double agent.' : 'ok';
        }
        const n = g.neighbors(x);
        for (const f of n) {
          if (!g.hasTouch(f, 'foreigner')) continue;
          for (const d of n) {
            if (d !== f && g.hasTouch(d, 'double')) {
              return proof ? x + ' connects Foreigner-linked ' + f + ' and Double agent-linked ' + d + '.' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-23', domain: 2, title: 'Foreigner shielding a Foe',
    order: 'Shoot the two suspects linked (either way) in Foe or Double agent to someone linked to a Foreigner — unless a Civilian links to that suspect.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'civilian')) return null;
        for (const e of g.touch(x, ['foe', 'double'])) {
          const m = e.from === x ? e.to : e.from;
          const f = g.touch(m, 'foreigner')[0];
          if (f) return proof ? x + ': ' + g.fmt(e) + ' · ' + g.fmt(f) + ' (no Civilian link).' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-24', domain: 2, title: 'Domestic recruiter for abroad',
    order: 'Shoot the two suspects who back (Friend), watch (Spy), or report to (Civilian) someone linked to a Foreigner — excluding anyone opposed by a Foe.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'foe')) return null;
        for (const e of g.out(x, ['friend', 'spy', 'civilian'])) {
          const f = g.touch(e.to, 'foreigner')[0];
          if (f) return proof ? x + ': ' + g.fmt(e) + ' → ' + g.fmt(f) + ' (unopposed by Foe).' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-25', domain: 2, title: 'Foreign contact under false cover',
    order: 'Shoot the two suspects linked to a Foreigner (either way) whose Foreigner contact ALSO appears in Friend, Spy, or Civilian — excluding anyone in Foe.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'foe')) return null;
        for (const e of g.touch(x)) {
          const m = e.from === x ? e.to : e.from;
          if (!g.hasTouch(m, 'foreigner')) continue;
          const cov = g.touch(m, ['friend', 'spy', 'civilian']).find(t => t !== e);
          if (cov) return proof ? x + ': ' + g.fmt(e) + ' to covered Foreigner contact ' + m + ' (' + g.fmt(cov) + ').' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-26', domain: 2, title: 'Unmonitored foreign leak',
    order: 'Shoot the two suspects receiving a link (in any category) from someone in Foreigner OR Double agent — excluding anyone backed by a Friend or watched by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend') || g.hasIn(x, 'spy')) return null;
        for (const e of g.in(x)) {
          const fd = g.touch(e.from, ['foreigner', 'double']).find(t => t !== e);
          if (fd) return proof ? x + ': ' + g.fmt(e) + ' from ' + e.from + ' (' + g.fmt(fd) + ').' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-27', domain: 2, title: 'Border infiltration hub',
    order: 'Shoot the two suspects with links in at least TWO categories (not counting Foreigner) who ALSO link to someone in Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const nonF = new Set(g.touch(x).filter(e => e.role !== 'foreigner').map(e => e.role));
        if (nonF.size < 2) return null;
        for (const e of g.touch(x)) {
          const m = e.from === x ? e.to : e.from;
          const f = g.touch(m, 'foreigner').find(t => t !== e);
          if (f) return proof ? x + ' spans ' + [...nonF].join(', ') + ' and links to ' + m + ' (' + g.fmt(f) + ').' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeModRank({
    id: 'mo-28', domain: 2, title: 'Border penetration score',
    order: 'Score each suspect: +3 per Foreigner link, +2 per Double agent leak sent or received, +2 per Civilian link, −1 per Spy watch received, −2 per Foe link. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumReachScore(g, x, {foreigner: 3, double: 2, civilian: 2, spy_in: -1, foe: -2}, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeMod({
    id: 'mo-29', domain: 2, title: 'Cross-border cut-out',
    order: 'Shoot the two middlemen receiving a Foreigner or Foe arrow and sending a Friend, Spy, or Civilian arrow (no return) — OR receiving a Double agent arrow and sending a Foreigner arrow.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const e1 of g.in(x, ['foreigner', 'foe'])) {
          for (const e2 of g.out(x, ['friend', 'spy', 'civilian'])) {
            if (e2.to !== e1.from) return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
          }
        }
        for (const e1 of g.in(x, 'double')) {
          for (const e2 of g.out(x, 'foreigner')) {
            if (e2.to !== e1.from) return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 3: Civilian Exposure (10 families)
  // =========================================================================
  makeMod({
    id: 'mo-30', domain: 3, title: 'Burned witness network',
    order: 'Shoot the two suspects linked (either way) to someone in Civilian whose Civilian contact ALSO links to Foe, Double agent, or Foreigner — excluding anyone watched by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        for (const e of g.touch(x)) {
          const m = e.from === x ? e.to : e.from;
          if (!g.hasTouch(m, 'civilian')) continue;
          const bad = g.touch(m, ['foe', 'double', 'foreigner']).find(t => t !== e);
          if (bad) return proof ? x + ': ' + g.fmt(e) + ' via exposed witness ' + m + ' (' + g.fmt(bad) + ').' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-31', domain: 3, title: 'Unprotected witness handler',
    order: 'Shoot the two suspects receiving a Civilian report whose witness is NOT backed by a Friend — OR sending a Civilian report to someone in Foe, Double agent, or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const c of g.in(x, 'civilian')) {
          if (!g.hasIn(c.from, 'friend')) return proof ? x + ': ' + g.fmt(c) + ' (witness ' + c.from + ' unbacked by Friend).' : 'ok';
        }
        for (const c of g.out(x, 'civilian')) {
          const bad = g.touch(c.to, ['foe', 'double', 'foreigner'])[0];
          if (bad) return proof ? x + ': ' + g.fmt(c) + ' into compromised ' + c.to + ' (' + g.fmt(bad) + ').' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-32', domain: 3, title: 'Civilian shield over a threat',
    order: 'Shoot the two suspects who send or receive a Foe, Double agent, or Foreigner arrow AND link to someone in Civilian — excluding anyone watched by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        const hot = g.touch(x, ['foe', 'double', 'foreigner'])[0];
        if (!hot) return null;
        for (const e of g.touch(x)) {
          const m = e.from === x ? e.to : e.from;
          if (g.hasTouch(m, 'civilian')) return proof ? x + ': ' + g.fmt(hot) + ' shielded via ' + g.fmt(e) + ' (unwatched).' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-33', domain: 3, title: 'Silent bystander’s leak',
    order: 'Shoot the two suspects NOT in Civilian who receive a link from someone in Civilian — when the suspect also sends an arrow in Foe, Double agent, or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'civilian')) return null;
        const act = g.out(x, ['foe', 'double', 'foreigner'])[0];
        if (!act) return null;
        for (const e of g.in(x)) {
          if (g.hasTouch(e.from, 'civilian')) return proof ? x + ': ' + g.fmt(e) + ' from Civilian-linked ' + e.from + ', acts via ' + g.fmt(act) + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-34', domain: 3, title: 'Exposed local ally',
    order: 'Shoot the two suspects linked in Friend or Spy to someone in Civilian — when that Civilian-linked contact is NOT watched by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const e of g.touch(x, ['friend', 'spy'])) {
          const m = e.from === x ? e.to : e.from;
          if (g.hasTouch(m, 'civilian') && !g.hasIn(m, 'spy')) {
            return proof ? x + ': ' + g.fmt(e) + ' to unwatched Civilian contact ' + m + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-35', domain: 3, title: 'Cross-category witness leak',
    order: 'Shoot the two suspects who link to TWO DIFFERENT people: one in Civilian and another in Double agent or Foreigner — excluding anyone backed by a Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend')) return null;
        const n = g.neighbors(x);
        for (const c of n) {
          if (!g.hasTouch(c, 'civilian')) continue;
          for (const b of n) {
            if (b !== c && g.hasTouch(b, ['double', 'foreigner'])) {
              return proof ? x + ' links Civilian-side ' + c + ' with covert ' + b + ' (no Friend backing).' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-36', domain: 3, title: 'Threatening a witness’s circle',
    order: 'Shoot the two suspects sending a Foe, Double agent, or Foreigner arrow to someone who links (either way) to a Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const e of g.out(x, ['foe', 'double', 'foreigner'])) {
          const c = g.touch(e.to, 'civilian')[0];
          if (c) return proof ? x + ': ' + g.fmt(e) + ' threatens Civilian contact ' + e.to + ' (' + g.fmt(c) + ').' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-37', domain: 3, title: 'Compromised informant chain',
    order: 'Follow a Civilian or Friend arrow, then a Spy or Double agent arrow (no return). Shoot the two at the end who are NOT backed by a Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend')) return null;
        for (const e2 of g.in(x, ['spy', 'double'])) {
          for (const e1 of g.in(e2.from, ['civilian', 'friend'])) {
            if (e1.from !== x) return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + ' (no Friend backing).' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeModRank({
    id: 'mo-38', domain: 3, title: 'Witness exposure index',
    order: 'Score each suspect: +3 per Civilian link, +2 per Foe or Double agent link, +1 per Foreigner link, −2 per Friend backing received, −1 per Spy watch received. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumReachScore(g, x, {civilian: 3, foe: 2, double: 2, foreigner: 1, friend_in: -2, spy_in: -1}, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeMod({
    id: 'mo-39', domain: 3, title: 'Civilian cover breached',
    order: 'Shoot the two suspects appearing in Civilian OR Spy who receive an arrow in Foe, Double agent, or Foreigner — OR send an arrow to someone in Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (!g.hasTouch(x, ['civilian', 'spy'])) return null;
        const hit = g.in(x, ['foe', 'double', 'foreigner'])[0];
        if (hit) return proof ? x + ' (in Civilian/Spy) hit by ' + g.fmt(hit) + '.' : 'ok';
        for (const e of g.out(x)) {
          const f = g.touch(e.to, 'foreigner').find(t => t !== e);
          if (f) return proof ? x + ' (in Civilian/Spy) sends ' + g.fmt(e) + ' → ' + g.fmt(f) + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 4: Proxy & Cut-Outs (10 families)
  // =========================================================================
  makeMod({
    id: 'mo-40', domain: 4, title: 'Unwatched 3-step covert chain',
    order: 'Follow THREE outgoing arrows across at least TWO different categories (no repeated suspect). Shoot the two at the end who are NOT watched by a Spy and NOT backed by a Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy') || g.hasIn(x, 'friend')) return null;
        for (const e3 of g.in(x)) {
          const c = e3.from;
          for (const e2 of g.in(c)) {
            const b = e2.from;
            if (b === x) continue;
            for (const e1 of g.in(b)) {
              const a = e1.from;
              if (a === x || a === c) continue;
              if (new Set([e1.role, e2.role, e3.role]).size >= 2) {
                return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + ' → ' + g.fmt(e3) + '.' : 'ok';
              }
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-41', domain: 4, title: 'Cut-out turning overt to covert',
    order: 'Shoot the two middlemen who receive an arrow in Friend or Civilian and send an arrow in Double agent or Foreigner (no return) — OR receive a Spy arrow and send a Foe arrow.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const e1 of g.in(x, ['friend', 'civilian'])) {
          for (const e2 of g.out(x, ['double', 'foreigner'])) {
            if (e2.to !== e1.from) return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
          }
        }
        for (const e1 of g.in(x, 'spy')) {
          for (const e2 of g.out(x, 'foe')) {
            if (e2.to !== e1.from) return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-42', domain: 4, title: 'Proxy relay through a Foe or Spy',
    order: 'Follow an arrow into a middleman in Foe or Spy, then a DIFFERENT-category arrow out (no return). Shoot the two senders who are NOT backed by a Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend')) return null;
        for (const e1 of g.out(x)) {
          if (!g.hasTouch(e1.to, ['foe', 'spy'])) continue;
          for (const e2 of g.out(e1.to)) {
            if (e2.to !== x && e2.role !== e1.role) return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-43', domain: 4, title: 'Two-hop covert leak target',
    order: 'Start from someone in Double agent or Foreigner, follow two outgoing arrows in DIFFERENT categories (no return). Shoot the two at the end who are NOT in Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'friend')) return null;
        for (const e2 of g.in(x)) {
          for (const e1 of g.in(e2.from)) {
            if (e1.from !== x && e1.role !== e2.role && g.hasTouch(e1.from, ['double', 'foreigner'])) {
              return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + ' (started by covert ' + e1.from + ').' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-44', domain: 4, title: 'Chokepoint between two roles',
    order: 'Shoot the two middlemen receiving an arrow from someone in Friend/Civilian AND sending an arrow to someone in Foe/Double agent/Foreigner (distinct people).',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const e1 of g.in(x)) {
          if (!g.hasTouch(e1.from, ['friend', 'civilian'])) continue;
          for (const e2 of g.out(x)) {
            if (e2.to !== e1.from && g.hasTouch(e2.to, ['foe', 'double', 'foreigner'])) {
              return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-45', domain: 4, title: 'Cut-out bypassing surveillance',
    order: 'Follow two outgoing arrows in DIFFERENT categories where NEITHER the starter nor middleman is watched by a Spy (no return). Shoot the two at the end.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const e2 of g.in(x)) {
          if (g.hasIn(e2.from, 'spy')) continue;
          for (const e1 of g.in(e2.from)) {
            if (e1.from !== x && e1.role !== e2.role && !g.hasIn(e1.from, 'spy')) {
              return proof ? x + ': unwatched chain ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-46', domain: 4, title: 'Reverse-cover courier',
    order: 'Follow a Foe, Double agent, or Foreigner arrow, then a Friend or Civilian arrow (no return). Shoot the two senders whose target at the end is NOT watched by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const e1 of g.out(x, ['foe', 'double', 'foreigner'])) {
          for (const e2 of g.out(e1.to, ['friend', 'civilian'])) {
            if (e2.to !== x && !g.hasIn(e2.to, 'spy')) {
              return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + ' (unwatched end).' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-47', domain: 4, title: 'Relay with a double-backed middleman',
    order: 'Shoot the two suspects sending an arrow to a middleman who appears in at least THREE categories — excluding anyone in Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'civilian')) return null;
        for (const e of g.out(x)) {
          if (g.distinctRoles(e.to).size >= 3) {
            return proof ? x + ': ' + g.fmt(e) + ' into 3-category hub ' + e.to + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-48', domain: 4, title: 'Two-channel origin',
    order: 'Follow two outgoing arrows in DIFFERENT categories (no return) ending at someone in Foreigner or Foe. Shoot the two senders not in Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'friend')) return null;
        for (const e1 of g.out(x)) {
          for (const e2 of g.out(e1.to)) {
            if (e2.to !== x && e2.role !== e1.role && g.hasTouch(e2.to, ['foreigner', 'foe'])) {
              return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  makeModRank({
    id: 'mo-49', domain: 4, title: 'Cut-out leverage score',
    order: 'For each suspect, count distinct people reachable in 1 OR 2 outgoing arrows (excluding self), then subtract 1 if watched by a Spy and subtract 1 if backed by a Friend. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const reach = new Set();
      for (const e1 of g.out(x)) {
        reach.add(e1.to);
        for (const e2 of g.out(e1.to)) if (e2.to !== x) reach.add(e2.to);
      }
      const penSpy = g.hasIn(x, 'spy') ? 1 : 0;
      const penFr = g.hasIn(x, 'friend') ? 1 : 0;
      const score = reach.size - penSpy - penFr;
      return {score, reason: proof ? x + ' reaches ' + reach.size + ' in ≤2 hops (−' + (penSpy + penFr) + ' guard) = ' + score + '.' : ''};
    }
  }),

  // =========================================================================
  // DOMAIN 5: Alibi & Contradiction (10 families)
  // =========================================================================
  makeMod({
    id: 'mo-50', domain: 5, title: 'Directed 3-suspect closed loop',
    order: 'Find a closed 3-step loop A → B → C → A across DIFFERENT categories. Shoot the two members of the loop who appear in the MOST total categories across the file.',
    evaluate(g, _a, proof) {
      const loopNodes = new Set();
      let loopDesc = '';
      for (const e1 of g.edges) {
        for (const e2 of g.out(e1.to)) {
          if (e2.to === e1.from || e2.role === e1.role) continue;
          for (const e3 of g.direct(e2.to, e1.from)) {
            if (e3.role !== e1.role && e3.role !== e2.role) {
              loopNodes.add(e1.from); loopNodes.add(e1.to); loopNodes.add(e2.to);
              if (!loopDesc) loopDesc = g.fmt(e1) + ' → ' + g.fmt(e2) + ' → ' + g.fmt(e3);
            }
          }
        }
      }
      if (!loopNodes.size) return {pair: [], proof: []};
      return pickTopTwo([...loopNodes], x => ({
        score: g.distinctRoles(x).size * 10 + g.touch(x).length,
        reason: proof ? x + ' in loop (' + loopDesc + ') with ' + g.distinctRoles(x).size + ' categories.' : ''
      }), proof);
    }
  }),
  makeMod({
    id: 'mo-51', domain: 5, title: 'Direct vs indirect covert clash',
    order: 'Find a direct arrow A → B where A also reaches B (or B reaches A) in TWO steps across other categories. Shoot A and B.',
    evaluate(g, _a, proof) {
      const pairs = [];
      for (const d of g.edges) {
        for (const m of g.people) {
          if (m === d.from || m === d.to) continue;
          const f1 = g.direct(d.from, m).find(e => e.role !== d.role);
          const f2 = f1 && g.direct(m, d.to).find(e => e.role !== d.role);
          if (f1 && f2) pairs.push({a: d.from, b: d.to, reason: g.fmt(d) + ' vs ' + g.fmt(f1) + ' → ' + g.fmt(f2) + '.'});
          const b1 = g.direct(d.to, m).find(e => e.role !== d.role);
          const b2 = b1 && g.direct(m, d.from).find(e => e.role !== d.role);
          if (b1 && b2) pairs.push({a: d.from, b: d.to, reason: g.fmt(d) + ' countered by ' + g.fmt(b1) + ' → ' + g.fmt(b2) + '.'});
        }
      }
      return collectPairs(pairs, proof);
    }
  }),
  makeMod({
    id: 'mo-52', domain: 5, title: 'Mutual covert triangle',
    order: 'Find two suspects who BOTH link (either way) to the SAME third suspect, AND are ALSO directly linked to each other in a THIRD category. Shoot the two who are NOT backed by a Friend.',
    evaluate(g, _a, proof) {
      const cands = new Set();
      const reasons = new Map();
      for (let i = 0; i < g.people.length; i++) {
        for (let j = i + 1; j < g.people.length; j++) {
          const a = g.people[i], b = g.people[j];
          const abs = g.between(a, b);
          if (!abs.length) continue;
          for (const c of g.people) {
            if (c === a || c === b) continue;
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
              const desc = g.fmt(tri[0]) + ' · ' + g.fmt(tri[1]) + ' · ' + g.fmt(tri[2]) + '.';
              for (const n of [a, b, c]) if (!g.hasIn(n, 'friend')) { cands.add(n); reasons.set(n, n + ': triangle ' + desc); }
            }
          }
        }
      }
      const pair = [...cands].sort();
      return {pair, proof: proof ? [...new Set(pair.map(n => reasons.get(n)))] : []};
    }
  }),
  makeMod({
    id: 'mo-53', domain: 5, title: 'Same pair, opposite intentions',
    order: 'Find two suspects linked directly in TWO DIFFERENT categories, OR sharing TWO DIFFERENT common contacts. Shoot both.',
    evaluate(g, _a, proof) {
      const pairs = [];
      for (let i = 0; i < g.people.length; i++) {
        for (let j = i + 1; j < g.people.length; j++) {
          const a = g.people[i], b = g.people[j];
          const links = g.between(a, b);
          if (new Set(links.map(e => e.role)).size >= 2) {
            pairs.push({a, b, reason: 'Direct double link: ' + g.fmt(links[0]) + ' · ' + g.fmt(links.find(e => e.role !== links[0].role)) + '.'});
            continue;
          }
          const na = new Set(g.neighbors(a));
          const shared = g.neighbors(b).filter(p => p !== a && p !== b && na.has(p));
          if (shared.length >= 2) {
            pairs.push({a, b, reason: a + ' & ' + b + ' share contacts ' + shared.slice(0, 2).join(' and ') + '.'});
          }
        }
      }
      return collectPairs(pairs, proof);
    }
  }),
  makeMod({
    id: 'mo-54', domain: 5, title: 'Conflicting testimony on one suspect',
    order: 'Shoot the two suspects who BOTH receive an arrow in Friend, Spy, or Civilian AND receive an arrow in Foe, Double agent, or Foreigner — from TWO DIFFERENT people.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const a = g.in(x, ['friend', 'spy', 'civilian']);
        const b = g.in(x, ['foe', 'double', 'foreigner']);
        for (const e1 of a) {
          for (const e2 of b) {
            if (e1.from !== e2.from) return proof ? x + ': ' + g.fmt(e1) + ' vs ' + g.fmt(e2) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-55', domain: 5, title: 'Two-faced operator',
    order: 'Shoot the two suspects who BOTH send an arrow in Friend, Spy, or Civilian AND send an arrow in Foe, Double agent, or Foreigner — to TWO DIFFERENT people.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const a = g.out(x, ['friend', 'spy', 'civilian']);
        const b = g.out(x, ['foe', 'double', 'foreigner']);
        for (const e1 of a) {
          for (const e2 of b) {
            if (e1.to !== e2.to) return proof ? x + ': ' + g.fmt(e1) + ' vs ' + g.fmt(e2) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-56', domain: 5, title: 'Broken alibi of a friend',
    order: 'Shoot the two suspects who appear in Friend OR Civilian AND whose direct contacts include BOTH someone in Foe and someone in Double agent/Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (!g.hasTouch(x, ['friend', 'civilian'])) return null;
        const n = g.neighbors(x);
        for (const f of n) {
          if (!g.hasTouch(f, 'foe')) continue;
          for (const df of n) {
            if (df !== f && g.hasTouch(df, ['double', 'foreigner'])) {
              return proof ? x + ' holds Friend/Civilian cover while linking to Foe-contact ' + f + ' and covert ' + df + '.' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-57', domain: 5, title: 'Contradictory middleman',
    order: 'Shoot the two suspects whose direct contacts include someone backed by a Friend AND someone opposed by a Foe (two different contacts) — excluding anyone in Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'spy')) return null;
        const n = g.neighbors(x);
        for (const a of n) {
          if (!g.hasIn(a, 'friend')) continue;
          for (const b of n) {
            if (b !== a && g.hasIn(b, 'foe')) {
              return proof ? x + ' touches Friend-backed ' + a + ' and Foe-opposed ' + b + ' (no Spy record).' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-58', domain: 5, title: 'Double-channel contradiction',
    order: 'Shoot the two suspects receiving an arrow from someone who ALSO sends an arrow to a THIRD person in a DIFFERENT category — while the suspect is NOT watched by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        for (const e1 of g.in(x)) {
          const split = g.out(e1.from).find(e2 => e2.to !== x && e2.role !== e1.role);
          if (split) return proof ? x + ': ' + g.fmt(e1) + ', while ' + e1.from + ' splits via ' + g.fmt(split) + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-59', domain: 5, title: 'Echoed opposition',
    order: 'Find two suspects who BOTH point to the SAME target across TWO DIFFERENT categories — where neither is backed by a Friend. Shoot both.',
    evaluate(g, _a, proof) {
      const pairs = [];
      for (const t of g.people) {
        const inc = g.in(t).filter(e => !g.hasIn(e.from, 'friend'));
        for (let i = 0; i < inc.length; i++) {
          for (let j = i + 1; j < inc.length; j++) {
            if (inc[i].from !== inc[j].from && inc[i].role !== inc[j].role) {
              pairs.push({a: inc[i].from, b: inc[j].from, reason: g.fmt(inc[i]) + ' & ' + g.fmt(inc[j]) + ' converge on ' + t + '.'});
            }
          }
        }
      }
      return collectPairs(pairs, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 6: Perspective & Scope around {name} (10 families)
  // =========================================================================
  makeMod({
    id: 'mo-60', domain: 6, title: 'Unwatched threat past {name}', useAnchor: true,
    order: 'Find outsiders (not directly linked to {name}) who link to {name}’s contacts via Foe, Double agent, or Foreigner — excluding anyone watched by a Spy. Shoot those two.',
    evaluate(g, anchor, proof) {
      const direct = new Set(g.neighbors(anchor));
      return collectMatches(g.people, x => {
        if (x === anchor || direct.has(x) || g.hasIn(x, 'spy')) return null;
        for (const m of direct) {
          const e = g.between(x, m, ['foe', 'double', 'foreigner'])[0];
          if (e) return proof ? x + ' (outsider, unwatched): ' + g.fmt(e) + ' into ' + anchor + '’s contact ' + m + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-61', domain: 6, title: 'Hidden bridge into {name}’s circle', useAnchor: true,
    order: 'Shoot the two outsiders (not directly linked to {name}) who link to at least TWO of {name}’s contacts — OR link to one of {name}’s contacts AND appear in Foreigner.',
    evaluate(g, anchor, proof) {
      const direct = new Set(g.neighbors(anchor));
      return collectMatches(g.people, x => {
        if (x === anchor || direct.has(x)) return null;
        const shared = g.neighbors(x).filter(m => direct.has(m));
        if (shared.length >= 2) return proof ? x + ' touches two of ' + anchor + '’s contacts (' + shared.join(', ') + ').' : 'ok';
        if (shared.length === 1 && g.hasTouch(x, 'foreigner')) {
          return proof ? x + ' (Foreigner) touches ' + anchor + '’s contact ' + shared[0] + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-62', domain: 6, title: 'Blind side of {name}', useAnchor: true,
    order: 'Shoot the two suspects NOT linked to {name} (neither directly nor in 2 steps via any arrow direction) who appear in Foe, Double agent, or Foreigner.',
    evaluate(g, anchor, proof) {
      const d1 = new Set(g.neighbors(anchor));
      const d2 = new Set([anchor, ...d1]);
      for (const m of d1) for (const n of g.neighbors(m)) d2.add(n);
      return collectMatches(g.people, x => {
        if (d2.has(x)) return null;
        const hot = g.touch(x, ['foe', 'double', 'foreigner'])[0];
        if (hot) return proof ? x + ' sits >2 steps from ' + anchor + ' with ' + g.fmt(hot) + '.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-63', domain: 6, title: 'Counter-circle around {name}', useAnchor: true,
    order: 'Start from anyone who points TO {name} (in any category). Follow ONE outgoing arrow from them (skipping {name}) to someone NOT backed by a Friend. Shoot those two.',
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        if (x === anchor || g.hasIn(x, 'friend')) return null;
        for (const e1 of g.in(anchor)) {
          const e2 = g.direct(e1.from, x)[0];
          if (e2) return proof ? x + ': ' + e1.from + ' points to ' + anchor + ' (' + g.fmt(e1) + ') and ' + g.fmt(e2) + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-64', domain: 6, title: 'Divergent rival of {name}', useAnchor: true,
    order: 'Shoot the two suspects (excluding {name}) who share a category with {name} (same role row), are NOT directly linked to {name}, and are NOT watched by a Spy.',
    evaluate(g, anchor, proof) {
      const aRoles = g.distinctRoles(anchor);
      const direct = new Set(g.neighbors(anchor));
      return collectMatches(g.people, x => {
        if (x === anchor || direct.has(x) || g.hasIn(x, 'spy')) return null;
        const shared = [...g.distinctRoles(x)].filter(r => aRoles.has(r));
        if (shared.length) return proof ? x + ' shares ' + shared.join(', ') + ' with ' + anchor + ' (unlinked & unwatched).' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-65', domain: 6, title: 'Unchecked approach toward {name}', useAnchor: true,
    order: 'Follow two outgoing arrows ending at {name} (no return) where the middleman is NOT watched by a Spy. Shoot the two starters.',
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        if (x === anchor) return null;
        for (const e2 of g.in(anchor)) {
          if (g.hasIn(e2.from, 'spy')) continue;
          for (const e1 of g.direct(x, e2.from)) {
            return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + ' (unwatched middleman).' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-66', domain: 6, title: 'Shadow past {name}’s allies', useAnchor: true,
    order: 'Find everyone linked to {name} (either way). Shoot the two outsiders (not linked to {name}) who point TO those contacts — excluding anyone in Friend.',
    evaluate(g, anchor, proof) {
      const direct = new Set(g.neighbors(anchor));
      return collectMatches(g.people, x => {
        if (x === anchor || direct.has(x) || g.hasTouch(x, 'friend')) return null;
        for (const m of direct) {
          const e = g.direct(x, m)[0];
          if (e) return proof ? x + ': ' + g.fmt(e) + ' into ' + anchor + '’s contact ' + m + ' (not in Friend).' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-67', domain: 6, title: 'Exposed downstream of {name}', useAnchor: true,
    order: 'Start at {name}, follow two outgoing arrows across DIFFERENT categories (no return). Shoot the two at the end who are NOT in Civilian.',
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        if (x === anchor || g.hasTouch(x, 'civilian')) return null;
        for (const e1 of g.out(anchor)) {
          for (const e2 of g.direct(e1.to, x)) {
            if (e2.role !== e1.role) return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-68', domain: 6, title: 'Asymmetric tie to {name}', useAnchor: true,
    order: 'Shoot the two suspects (not {name}) who share a common contact with {name}, appear in Double agent, Foreigner, or Foe, and do NOT appear in Friend.',
    evaluate(g, anchor, proof) {
      const aN = new Set(g.neighbors(anchor));
      return collectMatches(g.people, x => {
        if (x === anchor || g.hasTouch(x, 'friend')) return null;
        const hot = g.touch(x, ['double', 'foreigner', 'foe'])[0];
        if (!hot) return null;
        const shared = g.neighbors(x).find(m => aN.has(m));
        if (shared) return proof ? x + ' shares contact ' + shared + ' with ' + anchor + ' and has ' + g.fmt(hot) + '.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeModRank({
    id: 'mo-69', domain: 6, title: 'Hostile proximity to {name}', useAnchor: true,
    order: 'Excluding {name}, score each suspect: +3 if 2 links from {name} (not 1), +2 per Double agent or Foreigner link, +1 per Foe link, −2 if directly linked to {name}, −1 if backed by a Friend. Shoot the top two.',
    scoreFn(g, x, anchor, proof) {
      if (x === anchor) return null;
      const d1 = new Set(g.neighbors(anchor));
      const is1 = d1.has(x);
      const is2 = !is1 && g.neighbors(x).some(m => d1.has(m));
      const r = sumReachScore(g, x, {double: 2, foreigner: 2, foe: 1, friend_in: -1}, proof);
      const score = r.score + (is2 ? 3 : 0) - (is1 ? 2 : 0);
      return {score, reason: proof ? x + ' scores ' + score + (is2 ? ' (2-step from ' + anchor + ')' : is1 ? ' (direct to ' + anchor + ')' : '') + '.' : ''};
    }
  }),

  // =========================================================================
  // DOMAIN 7: Tainted Testimony & Independent Channels (10 families)
  // =========================================================================
  makeMod({
    id: 'mo-70', domain: 7, title: 'Triple-category suspect without a Friend',
    order: 'Shoot the two suspects appearing in at least THREE different categories across the file — excluding anyone backed by a Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend')) return null;
        const roles = [...g.distinctRoles(x)];
        if (roles.length >= 3) return proof ? x + ' spans ' + roles.length + ' categories (' + roles.join(', ') + ') with no Friend backing.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-71', domain: 7, title: 'Triple-category suspect without surveillance',
    order: 'Shoot the two suspects appearing in at least THREE different categories across the file — excluding anyone watched by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        const roles = [...g.distinctRoles(x)];
        if (roles.length >= 3) return proof ? x + ' spans ' + roles.length + ' categories (' + roles.join(', ') + ') unwatched by Spy.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-72', domain: 7, title: 'Corroborated covert receiver',
    order: 'Shoot the two suspects receiving arrows from at least TWO different people across DIFFERENT categories — where at least one sender appears in Double agent or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const inc = g.in(x);
        for (let i = 0; i < inc.length; i++) {
          for (let j = i + 1; j < inc.length; j++) {
            if (inc[i].from !== inc[j].from && inc[i].role !== inc[j].role &&
                (g.hasTouch(inc[i].from, ['double', 'foreigner']) || g.hasTouch(inc[j].from, ['double', 'foreigner']))) {
              return proof ? x + ': ' + g.fmt(inc[i]) + ' · ' + g.fmt(inc[j]) + '.' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-73', domain: 7, title: 'Cross-channel operator',
    order: 'Shoot the two suspects linked to at least THREE distinct people across the file — including at least one via Foe/Double agent/Foreigner — and NO Civilian link.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'civilian')) return null;
        const n = g.neighbors(x);
        const hot = g.touch(x, ['foe', 'double', 'foreigner'])[0];
        if (n.length >= 3 && hot) return proof ? x + ' links to ' + n.length + ' suspects including ' + g.fmt(hot) + ' (no Civilian).' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-74', domain: 7, title: 'Tainted corroboration',
    order: 'Shoot the two suspects receiving arrows from TWO different people, where BOTH senders appear in at least TWO categories themselves.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const heavy = g.in(x).filter(e => g.distinctRoles(e.from).size >= 2);
        const senders = new Set(heavy.map(e => e.from));
        if (senders.size >= 2) return proof ? x + ' targeted by multi-role senders: ' + heavy.slice(0, 2).map(g.fmt).join(' · ') + '.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-75', domain: 7, title: 'Four-role footprint',
    order: 'Shoot the two suspects appearing in the MOST different categories across the file — counting ONLY categories where they link to someone NOT backed by a Friend.',
    evaluate(g, _a, proof) {
      return pickTopTwo(g.people, x => {
        const roles = new Set();
        for (const e of g.touch(x)) {
          const other = e.from === x ? e.to : e.from;
          if (!g.hasIn(other, 'friend')) roles.add(e.role);
        }
        return {score: roles.size, reason: proof ? x + ' links to unbacked suspects in ' + roles.size + ' categories (' + [...roles].join(', ') + ').' : ''};
      }, proof, 1);
    }
  }),
  makeMod({
    id: 'mo-76', domain: 7, title: 'Independent witness & covert hit',
    order: 'Shoot the two suspects linked (either way) to TWO DIFFERENT people: one in Friend or Spy, and another in Foe, Double agent, or Foreigner — excluding anyone watched by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        for (const a of g.touch(x, ['friend', 'spy'])) {
          const p1 = a.from === x ? a.to : a.from;
          for (const b of g.touch(x, ['foe', 'double', 'foreigner'])) {
            const p2 = b.from === x ? b.to : b.from;
            if (p1 !== p2) return proof ? x + ': ' + g.fmt(a) + ' · ' + g.fmt(b) + ' (unwatched).' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-77', domain: 7, title: 'Lone-channel exception',
    order: 'Shoot the two suspects who appear in ONLY ONE category across the entire file — AND whose single contact appears in at least THREE categories.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.distinctRoles(x).size !== 1) return null;
        const hub = g.neighbors(x).find(m => g.distinctRoles(m).size >= 3);
        if (hub) return proof ? x + ' appears in 1 category only, tied to 3-category hub ' + hub + '.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-78', domain: 7, title: 'Unverified multi-sender',
    order: 'Shoot the two suspects sending arrows to at least TWO different people whose targets BOTH appear in Foe, Spy, Double agent, or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const hits = g.out(x).filter(e => g.hasTouch(e.to, ['foe', 'spy', 'double', 'foreigner']));
        const targets = new Set(hits.map(e => e.to));
        if (targets.size >= 2) return proof ? x + ' sends into covert/hostile targets: ' + hits.slice(0, 2).map(g.fmt).join(' · ') + '.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeModRank({
    id: 'mo-79', domain: 7, title: 'Broadest unshielded spread',
    order: 'Count distinct contacts of each suspect (either direction), +1 bonus if they appear in Double agent or Foreigner, −2 if watched by a Spy, −1 if in Civilian. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const deg = g.neighbors(x).length;
      const bonus = g.hasTouch(x, ['double', 'foreigner']) ? 1 : 0;
      const pen = (g.hasIn(x, 'spy') ? 2 : 0) + (g.hasTouch(x, 'civilian') ? 1 : 0);
      const score = deg + bonus - pen;
      return {score, reason: proof ? x + ': ' + deg + ' contacts +' + bonus + ' covert −' + pen + ' guard = ' + score + '.' : ''};
    }
  }),

  // =========================================================================
  // DOMAIN 8: Double Lives & Asymmetry (10 families)
  // =========================================================================
  makeMod({
    id: 'mo-80', domain: 8, title: 'Active covert agent',
    order: 'Shoot the two suspects who SEND more arrows than they RECEIVE across the entire file — AND appear in Double agent or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (!g.hasTouch(x, ['double', 'foreigner'])) return null;
        const o = g.out(x).length, i = g.in(x).length;
        if (o > i) return proof ? x + ' sends ' + o + ' vs receives ' + i + ' and appears in Double agent/Foreigner.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-81', domain: 8, title: 'Passive covert magnet',
    order: 'Shoot the two suspects who RECEIVE more arrows than they SEND across the entire file — AND appear in Double agent or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (!g.hasTouch(x, ['double', 'foreigner'])) return null;
        const o = g.out(x).length, i = g.in(x).length;
        if (i > o) return proof ? x + ' receives ' + i + ' vs sends ' + o + ' and appears in Double agent/Foreigner.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-82', domain: 8, title: 'Balanced operator in covert rows',
    order: 'Shoot the two suspects who BOTH send AND receive at least ONE arrow in DIFFERENT categories, appear in Spy or Double agent, and do NOT appear in Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'friend') || !g.hasTouch(x, ['spy', 'double'])) return null;
        for (const o of g.out(x)) {
          for (const i of g.in(x)) {
            if (o.role !== i.role) return proof ? x + ' bridges ' + g.fmt(i) + ' & ' + g.fmt(o) + ' (no Friend).' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-83', domain: 8, title: 'Pure aggressor without backing',
    order: 'Shoot the two suspects who SEND at least TWO arrows, RECEIVE ZERO arrows across the entire file — OR send in Foe/Double agent while receiving zero in Friend/Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const o = g.out(x), i = g.in(x);
        if (o.length >= 2 && i.length === 0) return proof ? x + ' sends ' + o.length + ' arrows and receives none.' : 'ok';
        if (g.hasOut(x, ['foe', 'double']) && !g.hasIn(x, ['friend', 'spy']) && o.length >= 2) {
          return proof ? x + ' acts in Foe/Double agent (' + o.length + ' outgoing) with no Friend/Spy incoming.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-84', domain: 8, title: 'Pure target without cover',
    order: 'Shoot the two suspects who RECEIVE at least TWO arrows from different categories and SEND ZERO arrows — excluding anyone backed by a Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend') || g.out(x).length > 0) return null;
        const roles = new Set(g.in(x).map(e => e.role));
        if (roles.size >= 2) return proof ? x + ' receives in ' + roles.size + ' categories with 0 outgoing and no Friend.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-85', domain: 8, title: 'Overt sender, covert receiver',
    order: 'Shoot the two suspects who send an arrow in Friend or Civilian AND receive an arrow in Spy, Double agent, or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const o = g.out(x, ['friend', 'civilian'])[0];
        const i = g.in(x, ['spy', 'double', 'foreigner'])[0];
        if (o && i) return proof ? x + ': ' + g.fmt(o) + ' while targeted by ' + g.fmt(i) + '.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-86', domain: 8, title: 'Covert sender, overt receiver',
    order: 'Shoot the two suspects who send an arrow in Spy, Double agent, or Foreigner AND receive an arrow in Friend, Foe, or Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const o = g.out(x, ['spy', 'double', 'foreigner'])[0];
        const i = g.in(x, ['friend', 'foe', 'civilian'])[0];
        if (o && i) return proof ? x + ': acts via ' + g.fmt(o) + ' while receiving ' + g.fmt(i) + '.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-87', domain: 8, title: 'Cross-division double life',
    order: 'Shoot the two suspects who appear in at least ONE of (Friend, Foe), at least ONE of (Spy, Double agent), AND at least ONE of (Civilian, Foreigner).',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const a = g.touch(x, ['friend', 'foe'])[0];
        const b = g.touch(x, ['spy', 'double'])[0];
        const c = g.touch(x, ['civilian', 'foreigner'])[0];
        if (a && b && c) return proof ? x + ' spans all three pairs: ' + g.fmt(a) + ' · ' + g.fmt(b) + ' · ' + g.fmt(c) + '.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-88', domain: 8, title: 'Mirror role-pair',
    order: 'Shoot the two suspects who appear ONLY on the LEFT of arrows (never on the right) across at least TWO different categories.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.in(x).length > 0) return null;
        const roles = g.distinctRoles(x, 'out');
        if (roles.size >= 2) return proof ? x + ' appears only on the left across ' + roles.size + ' categories.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeMod({
    id: 'mo-89', domain: 8, title: 'Asymmetric surveillance subject',
    order: 'Shoot the two suspects who appear ONLY on the RIGHT of arrows (never on the left) across at least TWO different categories — excluding anyone backed by a Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.out(x).length > 0 || g.hasIn(x, 'friend')) return null;
        const roles = g.distinctRoles(x, 'in');
        if (roles.size >= 2) return proof ? x + ' appears only on the right across ' + roles.size + ' categories (no Friend).' : 'ok';
        return null;
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 9: Network Leverage & Non-Binary Risk Assessment (10 families)
  // =========================================================================
  makeModRank({
    id: 'mo-90', domain: 9, title: 'Counter-intelligence priority',
    order: 'Score each suspect: +3 per Double agent link, +2 per Foreigner link, +1 per Spy link, +1 per Foe link, −2 per Friend backing received, −1 per Civilian link. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumReachScore(g, x, {double: 3, foreigner: 2, spy: 1, foe: 1, friend_in: -2, civilian: -1}, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeModRank({
    id: 'mo-91', domain: 9, title: 'Outgoing operational heat',
    order: 'Score outgoing arrows only: +3 Double agent, +3 Foreigner, +2 Foe, +1 Spy, −1 Friend, −1 Civilian. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumReachScore(g, x, {double_out: 3, foreigner_out: 3, foe_out: 2, spy_out: 1, friend_out: -1, civilian_out: -1}, proof);
      return {score: r.score, reason: proof ? x + ' outgoing score ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeModRank({
    id: 'mo-92', domain: 9, title: 'Incoming vulnerability score',
    order: 'Score incoming arrows only: +3 Foreigner, +2 Double agent, +2 Foe, −2 Friend, −1 Spy, +1 Civilian. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumReachScore(g, x, {foreigner_in: 3, double_in: 2, foe_in: 2, friend_in: -2, spy_in: -1, civilian_in: 1}, proof);
      return {score: r.score, reason: proof ? x + ' incoming score ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeModRank({
    id: 'mo-93', domain: 9, title: 'Spy-vs-Friend balance',
    order: 'Score each suspect: +2 per outgoing arrow in any row, +2 per Double agent/Foreigner touch, −2 if watched by a Spy, −2 if backed by a Friend, −1 per Civilian touch. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const out = g.out(x).length * 2;
      const df = g.touch(x, ['double', 'foreigner']).length * 2;
      const pen = (g.hasIn(x, 'spy') ? 2 : 0) + (g.hasIn(x, 'friend') ? 2 : 0) + g.touch(x, 'civilian').length;
      const score = out + df - pen;
      return {score, reason: proof ? x + ': ' + out + ' outgoing +' + df + ' covert −' + pen + ' guards = ' + score + '.' : ''};
    }
  }),
  makeModRank({
    id: 'mo-94', domain: 9, title: 'Second-order risk score',
    order: 'For each suspect, add +2 for each direct contact in Double agent or Foreigner, +1 for each direct contact in Foe or Spy, and −2 if the suspect is watched by a Spy or backed by a Friend. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      let score = 0;
      const parts = [];
      for (const m of g.neighbors(x)) {
        if (g.hasTouch(m, ['double', 'foreigner'])) { score += 2; if (proof) parts.push(m + ' (+2)'); }
        if (g.hasTouch(m, ['foe', 'spy'])) { score += 1; if (proof) parts.push(m + ' (+1)'); }
      }
      if (g.hasIn(x, 'spy') || g.hasIn(x, 'friend')) { score -= 2; if (proof) parts.push('guarded (−2)'); }
      return {score, reason: proof ? x + ' scores ' + score + ' (' + parts.join(', ') + ').' : ''};
    }
  }),
  makeModRank({
    id: 'mo-95', domain: 9, title: 'Category diversity under shadow',
    order: 'Score each suspect: +2 per distinct category they appear in, +2 if they link to a Foreigner or Double agent, −2 if backed by a Friend, −1 if in Civilian. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const cats = g.distinctRoles(x).size * 2;
      const hot = g.neighbors(x).some(m => g.hasTouch(m, ['foreigner', 'double'])) ? 2 : 0;
      const pen = (g.hasIn(x, 'friend') ? 2 : 0) + (g.hasTouch(x, 'civilian') ? 1 : 0);
      const score = cats + hot - pen;
      return {score, reason: proof ? x + ': ' + cats + ' role-spread +' + hot + ' covert-contact −' + pen + ' = ' + score + '.' : ''};
    }
  }),
  makeModRank({
    id: 'mo-96', domain: 9, title: 'Unwatched operational weight',
    order: 'Score each suspect: +3 per Foe link, +2 per Double agent link, +2 per Civilian link, +1 per Friend link, −3 if watched by a Spy, −2 if handled by a Foreigner. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumReachScore(g, x, {foe: 3, double: 2, civilian: 2, friend: 1, spy_in: -3, foreigner_in: -2}, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeModRank({
    id: 'mo-97', domain: 9, title: 'Handler & watcher leverage',
    order: 'Score each suspect: +3 per Foreigner arrow SENT, +2 per Spy arrow SENT, +2 per Double agent arrow SENT, +1 per Friend arrow SENT, −2 per Foe arrow RECEIVED, −1 per Civilian arrow RECEIVED. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumReachScore(g, x, {foreigner_out: 3, spy_out: 2, double_out: 2, friend_out: 1, foe_in: -2, civilian_in: -1}, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  }),
  makeModRank({
    id: 'mo-98', domain: 9, title: 'Compromised contact count',
    order: 'For each suspect, count how many of their direct contacts appear in at least TWO categories (add +1 if the suspect appears in Foe/Double agent/Foreigner, subtract 1 if watched by a Spy). Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const heavy = g.neighbors(x).filter(m => g.distinctRoles(m).size >= 2);
      const bonus = g.hasTouch(x, ['foe', 'double', 'foreigner']) ? 1 : 0;
      const pen = g.hasIn(x, 'spy') ? 1 : 0;
      const score = heavy.length + bonus - pen;
      return {score, reason: proof ? x + ': ' + heavy.length + ' multi-role contacts (' + heavy.join(', ') + ') +' + bonus + ' −' + pen + ' = ' + score + '.' : ''};
    }
  }),
  makeModRank({
    id: 'mo-99', domain: 9, title: 'Full-dossier suspect pressure',
    order: 'Score each suspect: +2 per link in Friend or Foe, +3 per link in Double agent, +2 per link in Foreigner, −2 per Spy watch received, −1 per Civilian link. Shoot the top two.',
    scoreFn(g, x, _a, proof) {
      const r = sumReachScore(g, x, {friend: 2, foe: 2, double: 3, foreigner: 2, spy_in: -2, civilian: -1}, proof);
      return {score: r.score, reason: proof ? x + ' scores ' + r.score + ' (' + r.parts.join('; ') + ').' : ''};
    }
  })
];
