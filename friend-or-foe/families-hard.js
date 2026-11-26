import {collectMatches} from './case-graph.js';
import {
  hasCleanCivilian, hasCleanFriend, hasCleanSpy, hasTaintedFriend, hasTaintedSpy,
  matchAnchorRelay, matchAtom, matchRelay, matchTemporal
} from './case-predicates.js';

// 100 genuinely distinct Hard intelligence cases (10 domains × 10 families).
// ZERO weighted arithmetic scoring ("+3/+2/-1 Shoot the top two")!
// Every Hard case is a concise (15–28 word), high-consequence, 4-to-6-category structural,
// epistemic, temporal, or causal officer judgment — paired with ALL 6 disputed files in ONE
// single connected 6-node coupled 2-SAT cycle (ZERO split clusters, ZERO Style-4 trees!).

function hard({id, domain, title, order, useAnchor = false, evaluate}) {
  return {id, tier: 'hard', domain, title, order, hint: '', useAnchor, evaluate};
}

// Helper: does suspect x have a Friend voucher whose own Friend voucher acts in `roles`?
function hasTwoHopCompromisedVoucher(g, x, roles) {
  for (const f1 of g.in(x, 'friend')) {
    for (const f2 of g.in(f1.from, 'friend')) {
      if (g.hasOut(f2.from, roles)) return {f1, f2};
    }
  }
  return null;
}

// Helper: any clean shield among specified clean shields
function hasAnyShield(g, x, shields) {
  if (shields.includes('cleanFriend') && hasCleanFriend(g, x)) return true;
  if (shields.includes('cleanSpy') && hasCleanSpy(g, x)) return true;
  if (shields.includes('cleanCivilian') && hasCleanCivilian(g, x)) return true;
  if (shields.includes('friend') && g.hasIn(x, 'friend')) return true;
  if (shields.includes('spy') && g.hasIn(x, 'spy')) return true;
  if (shields.includes('civilian') && g.hasIn(x, 'civilian')) return true;
  return false;
}

export const hardFamilies = [
  // =========================================================================
  // DOMAIN 0: Cover & Betrayal (10)
  // =========================================================================
  hard({
    // FIXED verbatim match for Compromised vouching chain (2-hop Friend voucher check!)
    id: 'ha-00', domain: 0, title: 'Compromised vouching chain',
    order: 'Shoot anyone backed by a Friend whose own Friend voucher acts in Foe, Double agent, or Foreigner — or who leaks as a Double agent without a clean Spy shadow or Civilian tip-off.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const chain = hasTwoHopCompromisedVoucher(g, x, ['foe', 'double', 'foreigner']);
        if (chain) return proof ? x + ': 2-hop compromised voucher via ' + g.fmt(chain.f1) + ' ← ' + g.fmt(chain.f2) + '.' : 'ok';
        const leak = g.out(x, 'double')[0];
        if (leak && !hasCleanSpy(g, x) && !g.hasIn(x, 'civilian')) {
          return proof ? x + ': ' + g.fmt(leak) + ' with no clean Spy shadow or Civilian tip-off.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  hard({
    id: 'ha-01', domain: 0, title: 'Unshielded covert actor',
    order: 'Shoot anyone who acts in Foe, Double agent, or Foreigner without a clean Friend voucher, clean Spy shadow, or Civilian tip-off.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy', 'civilian'])) return null;
        const hit = g.out(x, ['foe', 'double', 'foreigner'])[0];
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit) + ', zero clean cover or Civilian tip.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-02', domain: 0, title: 'Exposed covert recipient',
    order: 'Shoot anyone targeted by a Foe, fed a Double agent’s leak, or met by a Foreigner — unless backed by a clean Friend, shadowed by a clean Spy, or tipped off by a clean Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy', 'cleanCivilian'])) return null;
        const hit = g.in(x, ['foe', 'double', 'foreigner'])[0];
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit) + ', zero clean shield across Friend, Spy, and Civilian.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-03', domain: 0, title: 'Tainted cover under fire',
    order: 'Shoot anyone backed by a tainted Friend (in Double agent or Foreigner) OR targeted by a Foe — unless shadowed by a clean Spy or tipped off by a clean Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanSpy', 'cleanCivilian'])) return null;
        const tf = hasTaintedFriend(g, x);
        if (tf) return proof ? x + ' backed by tainted Friend ' + g.fmt(tf) + '.' : 'ok';
        const foe = g.in(x, 'foe')[0];
        if (foe) return proof ? x + ': ' + g.fmt(foe) + ', no clean Spy/Civilian shield.' : 'ok';
        return null;
      }, proof);
    }
  }),
  hard({
    id: 'ha-04', domain: 0, title: 'Double-crossed ally or informant',
    order: 'Shoot anyone who vouches as a Friend or tips off as a Civilian someone in Foe or Double agent — unless shadowed by a clean Spy or appearing in Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x) || g.hasTouch(x, 'foreigner')) return null;
        const hit = matchRelay(g, x, {firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['foe', 'double'], secondDir: 'any'});
        if (!hit) return null;
        return proof ? x + ' backs compromised contact: ' + g.fmt(hit.e1) + ' → ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-05', domain: 0, title: 'Hollow Friend alibi',
    order: 'Shoot anyone whose Friend voucher appears in Foe, Double agent, or Foreigner — excluding anyone with a second clean Friend, clean Spy, or clean Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy', 'cleanCivilian'])) return null;
        const bad = g.in(x, 'friend').find(f => g.hasTouch(f.from, ['foe', 'double', 'foreigner']));
        if (!bad) return null;
        return proof ? x + ' relies on compromised Friend ' + g.fmt(bad) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-06', domain: 0, title: 'Mole with overt disguise',
    order: 'Shoot anyone in Friend or Civilian who also acts in Foe, Double agent, or Foreigner — unless shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        const ov = g.touch(x, ['friend', 'civilian'])[0];
        const cov = g.out(x, ['foe', 'double', 'foreigner'])[0];
        if (!ov || !cov) return null;
        return proof ? x + ': overt ' + g.fmt(ov) + ' masking ' + g.fmt(cov) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-07', domain: 0, title: 'Compromised voucher’s target',
    order: 'Shoot anyone targeted by a Foe or fed a Double agent’s leak by someone backed by a Friend or tipped off by a Civilian — unless shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        const hit = matchRelay(g, x, {firstRoles: ['foe', 'double'], firstDir: 'in', secondRoles: ['friend', 'civilian'], secondDir: 'in'});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' from overtly backed actor (' + g.fmt(hit.e2) + ').' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-08', domain: 0, title: 'Ally corrupted by mole or outsider',
    order: 'Shoot anyone vouched for by a Friend who also appears in Foe, Double agent, or Foreigner — excluding anyone shadowed by a clean Spy or tipped off by a Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanSpy', 'civilian'])) return null;
        const f = g.in(x, 'friend')[0];
        const c = g.touch(x, ['foe', 'double', 'foreigner'])[0];
        if (!f || !c) return null;
        return proof ? x + ': ' + g.fmt(f) + ' yet ' + g.fmt(c) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-09', domain: 0, title: 'Betrayal across overt lines',
    order: 'Shoot anyone who acts in Foe, Double agent, or Foreigner toward someone in Friend or Civilian — unless shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        const hit = matchRelay(g, x, {firstRoles: ['foe', 'double', 'foreigner'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'any'});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' hitting overt ' + hit.mid + '.' : 'ok';
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 1: Surveillance & Blind Spots (10)
  // =========================================================================
  hard({
    id: 'ha-10', domain: 1, title: 'Watchdog turned traitor',
    order: 'Shoot anyone who shadows as a Spy AND appears in Foe, Double agent, or Foreigner — unless backed by a clean Friend or tipped off by a clean Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanCivilian'])) return null;
        const s = g.out(x, 'spy')[0];
        const c = g.touch(x, ['foe', 'double', 'foreigner'])[0];
        if (!s || !c) return null;
        return proof ? x + ': ' + g.fmt(s) + ' while compromised by ' + g.fmt(c) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-11', domain: 1, title: 'False Spy cover',
    order: 'Shoot anyone shadowed ONLY by compromised Spies (appearing in Foe, Double agent, or Foreigner) — unless backed by a clean Friend or tipped off by a clean Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanCivilian'])) return null;
        const ss = g.in(x, 'spy');
        if (!ss.length || !ss.every(s => g.hasTouch(s.from, ['foe', 'double', 'foreigner']))) return null;
        return proof ? x + ' shadowed only by compromised Spy (' + ss.map(s => s.from).join(', ') + ').' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-12', domain: 1, title: 'Unwatched covert link',
    order: 'Shoot anyone named in Double agent or Foreigner who has NO Spy contact at all — unless backed by a clean Friend and tipped off by a Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'spy')) return null;
        if (hasCleanFriend(g, x) && g.hasIn(x, 'civilian')) return null;
        const c = g.touch(x, ['double', 'foreigner'])[0];
        if (!c) return null;
        return proof ? x + ': ' + g.fmt(c) + ', invisible to Spy and lacks Friend+Civilian cover.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-13', domain: 1, title: 'Blind-spot hostile network',
    order: 'Shoot anyone linked (either way) to an unwatched suspect (no Spy shadow) in Double agent or Foreigner — unless backed by a clean Friend or clean Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanCivilian'])) return null;
        const hit = matchRelay(g, x, {
          firstRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], firstDir: 'any',
          secondRoles: ['double', 'foreigner'], secondDir: 'any',
          midExc: {roles: ['spy'], dir: 'in'}
        });
        if (!hit) return null;
        return proof ? x + ' links to unwatched covert ' + hit.mid + ' (' + g.fmt(hit.e1) + ').' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-14', domain: 1, title: 'Spy shadowing an enemy’s ally',
    order: 'Shoot anyone who shadows as a Spy someone in Foe, Double agent, or Foreigner — while ALSO appearing in Friend or Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (!g.hasTouch(x, ['friend', 'civilian'])) return null;
        const hit = matchRelay(g, x, {firstRoles: ['spy'], firstDir: 'out', secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'any'});
        if (!hit) return null;
        return proof ? x + ' shadows covert ' + hit.mid + ' while appearing in Friend/Civilian.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-15', domain: 1, title: 'Compromised watcher’s quarry',
    order: 'Shoot anyone shadowed by a tainted Spy (in Foe, Double agent, or Foreigner) OR targeted by a Foe — unless backed by a clean Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanFriend(g, x)) return null;
        const ts = hasTaintedSpy(g, x);
        if (ts) return proof ? x + ' watched by tainted Spy ' + g.fmt(ts) + '.' : 'ok';
        const f = g.in(x, 'foe')[0];
        if (f) return proof ? x + ': ' + g.fmt(f) + ' without clean Friend.' : 'ok';
        return null;
      }, proof);
    }
  }),
  hard({
    id: 'ha-16', domain: 1, title: 'Spy blind to double exposure',
    order: 'Shoot anyone appearing in at least two of Foe, Double agent, and Foreigner — unless shadowed by a clean Spy or backed by a clean Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanSpy', 'cleanFriend'])) return null;
        const cats = new Set(g.touch(x, ['foe', 'double', 'foreigner']).map(e => e.role));
        if (cats.size < 2) return null;
        return proof ? x + ' spans ' + [...cats].join(' + ') + ' with no clean Spy or Friend.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-17', domain: 1, title: 'Unwatched overt intermediary',
    order: 'Shoot anyone who acts in Friend or Civilian toward someone in Foe, Double agent, or Foreigner — unless shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        const hit = matchRelay(g, x, {firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'any'});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' into covert ' + hit.mid + ' (no clean Spy).' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-18', domain: 1, title: 'Watched yet unshielded',
    order: 'Shoot anyone shadowed by a Spy who is ALSO targeted by a Foe, fed a Double agent’s leak, or met by a Foreigner — excluding anyone backed by a clean Friend or tipped off by a Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'civilian'])) return null;
        const s = g.in(x, 'spy')[0];
        const c = g.in(x, ['foe', 'double', 'foreigner'])[0];
        if (!s || !c) return null;
        return proof ? x + ': ' + g.fmt(s) + ' and ' + g.fmt(c) + ' without Friend/Civilian.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-19', domain: 1, title: 'Unbacked watch near covert circles',
    order: 'Shoot anyone in Spy or Civilian who has NO clean Friend voucher AND links directly to someone in Foe, Double agent, or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (!g.hasTouch(x, ['spy', 'civilian']) || hasCleanFriend(g, x)) return null;
        const cov = g.neighbors(x).find(n => g.hasTouch(n, ['foe', 'double', 'foreigner']));
        if (!cov) return null;
        return proof ? x + ' (Spy/Civilian, no clean Friend) links directly to covert ' + cov + '.' : 'ok';
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 2: Foreign Contact (10)
  // =========================================================================
  hard({
    id: 'ha-20', domain: 2, title: 'Foreigner’s unshielded insider',
    order: 'Shoot anyone in Foreigner who also appears in Friend, Spy, or Civilian — unless backed by a clean Friend or shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy'])) return null;
        const f = g.touch(x, 'foreigner')[0];
        const o = g.touch(x, ['friend', 'spy', 'civilian'])[0];
        if (!f || !o) return null;
        return proof ? x + ': ' + g.fmt(f) + ' while holding ' + g.fmt(o) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-21', domain: 2, title: 'Foreign cut-out network',
    order: 'Shoot anyone in Foreigner OR linked to a Foreigner who acts in Foe or Double agent — excluding anyone backed by a clean Friend or shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy'])) return null;
        const directF = g.touch(x, 'foreigner')[0];
        if (directF) return proof ? x + ' in Foreigner (' + g.fmt(directF) + ') without clean cover.' : 'ok';
        const hit = matchRelay(g, x, {
          firstRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], firstDir: 'any',
          secondRoles: ['foe', 'double'], secondDir: 'out',
          midReq: {roles: ['foreigner'], dir: 'any'}
        });
        if (!hit) return null;
        return proof ? x + ' links to hostile Foreigner-file contact ' + hit.mid + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-22', domain: 2, title: 'Foreigner meeting an unwarned ally',
    order: 'Shoot anyone who meets as a Foreigner someone in Friend, Spy, or Civilian — unless shadowed by a clean Spy or tipped off by a clean Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanSpy', 'cleanCivilian'])) return null;
        const hit = matchRelay(g, x, {firstRoles: ['foreigner'], firstDir: 'out', secondRoles: ['friend', 'spy', 'civilian'], secondDir: 'any'});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' targeting overt ' + hit.mid + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-23', domain: 2, title: 'Foreign-funded betrayal',
    order: 'Shoot anyone fed a Double agent’s leak OR met by a Foreigner who ALSO acts in Friend, Foe, or Civilian — unless shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        const i = g.in(x, ['double', 'foreigner'])[0];
        const o = g.out(x, ['friend', 'foe', 'civilian'])[0];
        if (!i || !o) return null;
        return proof ? x + ': ' + g.fmt(i) + ' while acting via ' + g.fmt(o) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-24', domain: 2, title: 'Foreign drop without clean watch',
    order: 'Shoot anyone linked (either way) to someone met by a Foreigner — while appearing in Foe or Double agent and lacking a clean Friend or clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy']) || !g.hasTouch(x, ['foe', 'double'])) return null;
        const m = g.neighbors(x).find(n => g.hasIn(n, 'foreigner'));
        if (!m) return null;
        return proof ? x + ' (in Foe/Double agent) links to Foreigner contact ' + m + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-25', domain: 2, title: 'Foreigner or mole bypassing alerts',
    order: 'Shoot anyone met by a Foreigner or fed a Double agent’s leak who has NO Civilian tip-off, NO clean Friend voucher, and NO clean Spy shadow.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['civilian', 'cleanFriend', 'cleanSpy'])) return null;
        const f = g.in(x, ['foreigner', 'double'])[0];
        if (!f) return null;
        return proof ? x + ': ' + g.fmt(f) + ', no Civilian warning or clean shield.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-26', domain: 2, title: 'Outsider’s covert proxy',
    order: 'Shoot anyone who acts in Double agent or Foe toward someone in Foreigner — unless shadowed by a clean Spy or backed by a clean Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanSpy', 'cleanFriend'])) return null;
        const hit = matchRelay(g, x, {firstRoles: ['double', 'foe'], firstDir: 'out', secondRoles: ['foreigner'], secondDir: 'any'});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' into Foreigner-file ' + hit.mid + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-27', domain: 2, title: 'Foreign reach into Friend circles',
    order: 'Shoot anyone backed by a Friend who links directly to someone in Foreigner — unless shadowed by a clean Spy or tipped off by a clean Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanSpy', 'cleanCivilian']) || !g.hasIn(x, 'friend')) return null;
        const m = g.neighbors(x).find(n => g.hasTouch(n, 'foreigner'));
        if (!m) return null;
        return proof ? x + ' (Friend-backed) links to Foreigner contact ' + m + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-28', domain: 2, title: 'Foreigner’s tainted handler',
    order: 'Shoot anyone met by a Foreigner whose Foreigner contact also appears in Foe, Double agent, or Spy — unless backed by a clean Friend or tipped off by a Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'civilian'])) return null;
        const hit = matchRelay(g, x, {firstRoles: ['foreigner'], firstDir: 'in', secondRoles: ['foe', 'double', 'spy'], secondDir: 'any'});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' from compromised outsider (' + g.fmt(hit.e2) + ').' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-29', domain: 2, title: 'Double-exposed foreign link',
    order: 'Shoot anyone in Foreigner who also appears in Foe, Double agent, or Civilian — excluding anyone with BOTH a Friend voucher and a Spy shadow.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend') && g.hasIn(x, 'spy')) return null;
        const f = g.touch(x, 'foreigner')[0];
        const o = g.touch(x, ['foe', 'double', 'civilian'])[0];
        if (!f || !o) return null;
        return proof ? x + ': ' + g.fmt(f) + ' and ' + g.fmt(o) + ' (lacks dual Friend+Spy shield).' : 'ok';
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 3: Civilian Tip-Offs (10)
  // =========================================================================
  hard({
    id: 'ha-30', domain: 3, title: 'Compromised informant chain',
    order: 'Shoot anyone tipped off by a Civilian who appears in Foe, Double agent, or Foreigner — unless backed by a clean Friend or shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy'])) return null;
        const hit = matchRelay(g, x, {firstRoles: ['civilian'], firstDir: 'in', secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'any'});
        if (!hit) return null;
        return proof ? x + ' tipped off by compromised Civilian: ' + g.fmt(hit.e1) + ' → ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-31', domain: 3, title: 'Unshielded witness',
    order: 'Shoot anyone in Civilian who is targeted by a Foe, fed a Double agent’s leak, or met by a Foreigner — unless backed by a clean Friend or shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy']) || !g.hasTouch(x, 'civilian')) return null;
        const hit = g.in(x, ['foe', 'double', 'foreigner'])[0];
        if (!hit) return null;
        return proof ? x + ' (Civilian) exposed to ' + g.fmt(hit) + ' with no clean shield.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-32', domain: 3, title: 'Informant tipping a covert actor',
    order: 'Shoot anyone who tips off as a Civilian someone who acts in Foe, Double agent, or Foreigner — unless backed by a clean Friend or shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy'])) return null;
        const hit = matchRelay(g, x, {firstRoles: ['civilian'], firstDir: 'out', secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'out'});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' warning covert actor ' + hit.mid + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-33', domain: 3, title: 'Exposed Civilian without Friend cover',
    order: 'Shoot anyone in Civilian who links directly to someone in Foe, Double agent, or Foreigner — excluding anyone backed by a clean Friend or shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy']) || !g.hasTouch(x, 'civilian')) return null;
        const m = g.neighbors(x).find(n => g.hasTouch(n, ['foe', 'double', 'foreigner']));
        if (!m) return null;
        return proof ? x + ' (Civilian) links to covert contact ' + m + ' with no clean shield.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-34', domain: 3, title: 'Tipped off then betrayed',
    order: 'Shoot anyone tipped off by a Civilian who ALSO appears in Foe, Double agent, or Foreigner — unless backed by a clean Friend or shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy'])) return null;
        const c = g.in(x, 'civilian')[0];
        const h = g.touch(x, ['foe', 'double', 'foreigner'])[0];
        if (!c || !h) return null;
        return proof ? x + ': ' + g.fmt(c) + ' and ' + g.fmt(h) + ', no clean Friend/Spy.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-35', domain: 3, title: 'False Civilian shield',
    order: 'Shoot anyone tipped off ONLY by compromised Civilians (in Foe, Double agent, or Foreigner) — unless backed by a clean Friend or shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy'])) return null;
        const cs = g.in(x, 'civilian');
        if (!cs.length || !cs.every(c => g.hasTouch(c.from, ['foe', 'double', 'foreigner']))) return null;
        return proof ? x + ' tipped off only by compromised Civilians (' + cs.map(c => c.from).join(', ') + ').' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-36', domain: 3, title: 'Covert strike on an informant’s circle',
    order: 'Shoot anyone who acts in Foe, Double agent, or Foreigner toward someone in Civilian — unless backed by a clean Friend or shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy'])) return null;
        const hit = matchRelay(g, x, {firstRoles: ['foe', 'double', 'foreigner'], firstDir: 'out', secondRoles: ['civilian'], secondDir: 'any'});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' into Civilian ' + hit.mid + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-37', domain: 3, title: 'Unwarned operative in two covert files',
    order: 'Shoot anyone appearing in at least two of Foe, Double agent, and Foreigner who has NO clean Civilian tip-off and NO clean Friend voucher.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanCivilian', 'cleanFriend'])) return null;
        const cats = new Set(g.touch(x, ['foe', 'double', 'foreigner']).map(e => e.role));
        if (cats.size < 2) return null;
        return proof ? x + ' spans ' + [...cats].join(' + ') + ' with no clean Civilian or Friend.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-38', domain: 3, title: 'Informant bridging Friend and threat',
    order: 'Shoot anyone in Civilian who links to a Friend-backed suspect AND to a Foe, Double agent, or Foreigner suspect (two different people).',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (!g.hasTouch(x, 'civilian')) return null;
        const n = g.neighbors(x);
        for (const a of n) {
          if (!g.hasIn(a, 'friend')) continue;
          for (const b of n) {
            if (b !== a && g.hasTouch(b, ['foe', 'double', 'foreigner'])) {
              return proof ? x + ' (Civilian) links Friend-backed ' + a + ' and covert ' + b + '.' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  hard({
    id: 'ha-39', domain: 3, title: 'Unwatched overt cover on a covert lead',
    order: 'Shoot anyone in Foe, Double agent, or Foreigner who is tipped off by an unwatched Civilian or backed by an unwatched Friend (no Spy shadow on that source).',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (!g.hasTouch(x, ['foe', 'double', 'foreigner'])) return null;
        const c = g.in(x, ['civilian', 'friend']).find(e => !g.hasIn(e.from, 'spy'));
        if (!c) return null;
        return proof ? x + ' (covert) relies on unwatched source ' + g.fmt(c) + '.' : 'ok';
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 4: Proxy Chains (10)
  // =========================================================================
  hard({
    id: 'ha-40', domain: 4, title: 'Unwatched two-step covert relay',
    order: 'Shoot anyone who reaches a Foe, Double agent, or Foreigner action in two forward steps through an unwatched middleman (no Spy shadow) — unless backed by a clean Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanFriend(g, x)) return null;
        const hit = matchRelay(g, x, {
          firstRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], firstDir: 'out',
          secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'out',
          diffRole: true, midExc: {roles: ['spy'], dir: 'in'}
        });
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' → ' + g.fmt(hit.e2) + ' (unwatched proxy, no clean Friend).' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-41', domain: 4, title: 'Covert relay into overt cover',
    order: 'Shoot anyone who acts in Foe, Double agent, or Foreigner toward an unbacked contact (no Friend voucher) who then acts in Friend, Spy, or Civilian (no return).',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const hit = matchRelay(g, x, {
          firstRoles: ['foe', 'double', 'foreigner'], firstDir: 'out',
          secondRoles: ['friend', 'spy', 'civilian'], secondDir: 'out',
          midExc: {roles: ['friend'], dir: 'in'}
        });
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' → ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-42', domain: 4, title: 'Overt relay into covert strike',
    order: 'Shoot anyone who acts in Friend, Spy, or Civilian toward an unwatched contact (no Spy shadow) who then acts in Foe, Double agent, or Foreigner (no return).',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const hit = matchRelay(g, x, {
          firstRoles: ['friend', 'spy', 'civilian'], firstDir: 'out',
          secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'out',
          midExc: {roles: ['spy'], dir: 'in'}
        });
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' → ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-43', domain: 4, title: 'End of a covert-to-covert chain',
    order: 'Shoot anyone acted upon in Foe, Double agent, or Foreigner by someone acted upon in a DIFFERENT covert category (no return) — unless backed by a clean Friend or shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy'])) return null;
        const hit = matchRelay(g, x, {
          firstRoles: ['foe', 'double', 'foreigner'], firstDir: 'in',
          secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'in',
          diffRole: true
        });
        if (!hit) return null;
        return proof ? x + ': end of covert chain ' + g.fmt(hit.e2) + ' → ' + g.fmt(hit.e1) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-44', domain: 4, title: 'Unwatched covert conduit',
    order: 'Shoot anyone receiving contact in Foe, Double agent, or Foreigner AND passing on a contact in Friend, Spy, or Civilian (no return) — unless shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        for (const e1 of g.in(x, ['foe', 'double', 'foreigner'])) {
          for (const e2 of g.out(x, ['friend', 'spy', 'civilian'])) {
            if (e2.to !== e1.from) return proof ? x + ' conduits ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  hard({
    id: 'ha-45', domain: 4, title: 'Overt conduit feeding covert action',
    order: 'Shoot anyone receiving contact in Friend, Spy, or Civilian AND passing on a contact in Foe, Double agent, or Foreigner (no return) — unless backed by a clean Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanFriend(g, x)) return null;
        for (const e1 of g.in(x, ['friend', 'spy', 'civilian'])) {
          for (const e2 of g.out(x, ['foe', 'double', 'foreigner'])) {
            if (e2.to !== e1.from) return proof ? x + ' conduits ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  hard({
    id: 'ha-46', domain: 4, title: 'Two-step covert reach from overt cover',
    order: 'Shoot anyone in Friend or Civilian who reaches someone in Double agent or Foreigner in 1 or 2 forward steps — unless shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x) || !g.hasTouch(x, ['friend', 'civilian'])) return null;
        for (const e1 of g.out(x)) {
          if (g.hasTouch(e1.to, ['double', 'foreigner'])) return proof ? x + ' (overt) reaches covert ' + e1.to + ' directly.' : 'ok';
          for (const e2 of g.out(e1.to)) {
            if (e2.to !== x && g.hasTouch(e2.to, ['double', 'foreigner'])) {
              return proof ? x + ' (overt) reaches covert ' + e2.to + ' via ' + e1.to + '.' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  hard({
    id: 'ha-47', domain: 4, title: 'Relay through a tainted Friend',
    order: 'Shoot anyone acted upon in any category by someone whose Friend voucher appears in Double agent or Foreigner — unless shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        for (const e1 of g.in(x)) {
          const tf = hasTaintedFriend(g, e1.from);
          if (tf) return proof ? x + ' reached by ' + e1.from + ' (' + g.fmt(e1) + '), whose voucher is tainted.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  hard({
    id: 'ha-48', domain: 4, title: 'Relay through a tainted Spy’s target',
    order: 'Shoot anyone who acts in any category toward someone shadowed by a tainted Spy (in Foe, Double agent, or Foreigner) — unless backed by a clean Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanFriend(g, x)) return null;
        for (const e1 of g.out(x)) {
          const ts = hasTaintedSpy(g, e1.to);
          if (ts) return proof ? x + ': ' + g.fmt(e1) + ' into suspect watched by tainted Spy ' + ts.from + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  hard({
    id: 'ha-49', domain: 4, title: 'Three-category chain receiver',
    order: 'Shoot anyone acted upon in Friend, Spy, or Civilian by an unwatched contact (no Spy shadow) who received a Foe, Double agent, or Foreigner contact (no return).',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const hit = matchRelay(g, x, {
          firstRoles: ['friend', 'spy', 'civilian'], firstDir: 'in',
          secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'in',
          midExc: {roles: ['spy'], dir: 'in'}
        });
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e2) + ' → ' + g.fmt(hit.e1) + ' (unwatched proxy).' : 'ok';
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 5: Alibi & Contradiction (10)
  // =========================================================================
  hard({
    id: 'ha-50', domain: 5, title: 'Broken cover triangle',
    order: 'Shoot anyone linked (either way) to a Friend-backed suspect AND to a Double agent or Foreigner suspect (two different people) — unless backed by a clean Friend or shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy'])) return null;
        const n = g.neighbors(x);
        for (const a of n) {
          if (!g.hasIn(a, 'friend')) continue;
          for (const b of n) {
            if (b !== a && g.hasTouch(b, ['double', 'foreigner'])) {
              return proof ? x + ' links Friend-backed ' + a + ' and covert ' + b + ' without clean cover.' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  hard({
    id: 'ha-51', domain: 5, title: 'Overt and covert collision',
    order: 'Shoot anyone who acts in Friend, Spy, or Civilian toward someone ALSO linked to them in Foe, Double agent, or Foreigner — or who receives both overt and covert contact from two different actors without a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const e1 of g.out(x, ['friend', 'spy', 'civilian'])) {
          const e2 = g.between(x, e1.to, ['foe', 'double', 'foreigner'])[0];
          if (e2) return proof ? x + ' collides with ' + e1.to + ': ' + g.fmt(e1) + ' vs ' + g.fmt(e2) + '.' : 'ok';
        }
        if (hasCleanSpy(g, x)) return null;
        for (const a of g.in(x, ['friend', 'civilian'])) {
          for (const b of g.in(x, ['foe', 'double', 'foreigner'])) {
            if (a.from !== b.from) return proof ? x + ' caught between ' + g.fmt(a) + ' and ' + g.fmt(b) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  hard({
    id: 'ha-52', domain: 5, title: 'Contradicted clearance',
    order: 'Shoot anyone backed by a Friend AND targeted by a Foe, fed a Double agent’s leak, or met by a Foreigner — excluding anyone shadowed by a clean Spy or tipped off by a clean Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanSpy', 'cleanCivilian'])) return null;
        const f = g.in(x, 'friend')[0];
        const c = g.in(x, ['foe', 'double', 'foreigner'])[0];
        if (!f || !c) return null;
        return proof ? x + ': ' + g.fmt(f) + ' contradicted by ' + g.fmt(c) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-53', domain: 5, title: 'Covert actor with conflicting cover',
    order: 'Shoot anyone who acts in Foe, Double agent, or Foreigner while ALSO receiving contact in Friend or Civilian — unless shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        const o = g.out(x, ['foe', 'double', 'foreigner'])[0];
        const i = g.in(x, ['friend', 'civilian'])[0];
        if (!o || !i) return null;
        return proof ? x + ': ' + g.fmt(o) + ' while receiving ' + g.fmt(i) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-54', domain: 5, title: 'Two-sided covert exposure',
    order: 'Shoot anyone acting in Foe, Double agent, or Foreigner AND receiving contact in a DIFFERENT covert category — unless backed by a clean Friend or shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy'])) return null;
        for (const o of g.out(x, ['foe', 'double', 'foreigner'])) {
          const i = g.in(x, ['foe', 'double', 'foreigner']).find(e => e.role !== o.role);
          if (i) return proof ? x + ': ' + g.fmt(o) + ' and ' + g.fmt(i) + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  hard({
    id: 'ha-55', domain: 5, title: 'Shared covert handler with an ally',
    order: 'Shoot anyone acted upon in Foe, Double agent, or Foreigner by someone who ALSO acts upon a Friend-backed or Civilian-tipped suspect — unless shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        for (const e1 of g.in(x, ['foe', 'double', 'foreigner'])) {
          const other = g.out(e1.from).find(e2 => e2.to !== x && g.hasIn(e2.to, ['friend', 'civilian']));
          if (other) return proof ? x + ' shares handler ' + e1.from + ' with ' + other.to + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  hard({
    id: 'ha-56', domain: 5, title: 'Silent mark without clean shield',
    order: 'Shoot anyone who initiates NO contacts anywhere AND receives contact in Foe, Double agent, or Foreigner — excluding anyone backed by a clean Friend or shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.out(x).length > 0 || hasAnyShield(g, x, ['cleanFriend', 'cleanSpy'])) return null;
        const c = g.in(x, ['foe', 'double', 'foreigner'])[0];
        if (!c) return null;
        return proof ? x + ' initiates no contacts and receives ' + g.fmt(c) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-57', domain: 5, title: 'Cross-file double contact',
    order: 'Shoot anyone acting toward two DIFFERENT people across overt (Friend, Spy, Civilian) and covert (Foe, Double agent, Foreigner) categories — unless shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        for (const a of g.out(x, ['friend', 'spy', 'civilian'])) {
          for (const b of g.out(x, ['foe', 'double', 'foreigner'])) {
            if (a.to !== b.to) return proof ? x + ': ' + g.fmt(a) + ' and ' + g.fmt(b) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  hard({
    id: 'ha-58', domain: 5, title: 'Dual-source covert target',
    order: 'Shoot anyone acted upon by two DIFFERENT people in Foe, Double agent, or Foreigner — unless backed by a clean Friend or tipped off by a clean Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanCivilian'])) return null;
        const ins = g.in(x, ['foe', 'double', 'foreigner']);
        const senders = new Set(ins.map(e => e.from));
        if (senders.size < 2) return null;
        return proof ? x + ' hit by ' + senders.size + ' covert actors without clean Friend/Civilian.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-59', domain: 5, title: 'Compromised dual-link pair',
    order: 'Shoot anyone linked (either way) to a Spy-watched suspect AND to a Foe or Foreigner suspect (two different people) — excluding anyone backed by a clean Friend or tipped off by a clean Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanCivilian'])) return null;
        const n = g.neighbors(x);
        for (const a of n) {
          if (!g.hasIn(a, 'spy')) continue;
          for (const b of n) {
            if (b !== a && g.hasTouch(b, ['foe', 'foreigner'])) {
              return proof ? x + ' links Spy-watched ' + a + ' and hostile ' + b + '.' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 6: Chronology & Timing (10)
  // =========================================================================
  hard({
    id: 'ha-60', domain: 6, title: 'Betrayed after Friend clearance',
    order: 'Shoot anyone in Friend or Civilian EARLIER than they appear in Foe, Double agent, or Foreigner — unless shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        const hit = matchTemporal(g, x, {roles: ['friend', 'civilian']}, {roles: ['foe', 'double', 'foreigner']});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit[0]) + ' before ' + g.fmt(hit[1]) + ' (no clean Spy).' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-61', domain: 6, title: 'Covert move before surveillance',
    order: 'Shoot anyone in Foe, Double agent, or Foreigner EARLIER than they appear in Spy — excluding anyone backed by a clean Friend or tipped off by a clean Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanCivilian'])) return null;
        const hit = matchTemporal(g, x, {roles: ['foe', 'double', 'foreigner']}, {roles: ['spy']});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit[0]) + ' preceded ' + g.fmt(hit[1]) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-62', domain: 6, title: 'Late cover after covert exposure',
    order: 'Shoot anyone in Foe, Double agent, or Foreigner EARLIER than a Friend vouched for them or a Civilian tipped them off — unless shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        const hit = matchTemporal(g, x, {roles: ['foe', 'double', 'foreigner']}, {roles: ['friend', 'civilian'], dir: 'in'});
        if (!hit) return null;
        return proof ? x + ': covert ' + g.fmt(hit[0]) + ' came before ' + g.fmt(hit[1]) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-63', domain: 6, title: 'Escalating relay into betrayal',
    order: 'Shoot anyone who acts in Friend, Spy, or Civilian toward someone who LATER acts in Foe, Double agent, or Foreigner (no return) — unless backed by a clean Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanFriend(g, x)) return null;
        const hit = matchRelay(g, x, {
          firstRoles: ['friend', 'spy', 'civilian'], firstDir: 'out',
          secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'out',
          timeOrder: 'before'
        });
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' followed later by ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-64', domain: 6, title: 'Backed by an already-compromised source',
    order: 'Shoot anyone backed by a Friend or tipped off by a Civilian who had EARLIER appeared in Foe, Double agent, or Foreigner — unless shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        const hit = matchRelay(g, x, {
          firstRoles: ['friend', 'civilian'], firstDir: 'in',
          secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'any',
          timeOrder: 'after'
        });
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' after source’s ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-65', domain: 6, title: 'Backing an already-compromised contact',
    order: 'Shoot anyone who vouches as a Friend or tips off as a Civilian someone who had EARLIER appeared in Foe, Double agent, or Foreigner — unless shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        const hit = matchRelay(g, x, {
          firstRoles: ['friend', 'civilian'], firstDir: 'out',
          secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'any',
          timeOrder: 'after'
        });
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' after contact’s ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-66', domain: 6, title: 'Earliest file covert, later file overt',
    order: 'Shoot anyone whose EARLIEST dossier contact is in Foe, Double agent, or Foreigner AND who later appears in Friend, Spy, or Civilian — unless backed by a clean Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanFriend(g, x)) return null;
        const all = g.touch(x);
        if (all.length < 2) return null;
        const minT = Math.min(...all.map(e => e.time));
        const first = all.find(e => e.time === minT && ['foe', 'double', 'foreigner'].includes(e.role));
        const later = all.find(e => e.time > minT && ['friend', 'spy', 'civilian'].includes(e.role));
        if (!first || !later) return null;
        return proof ? x + ': earliest ' + g.fmt(first) + ', later ' + g.fmt(later) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-67', domain: 6, title: 'Latest file covert, earlier file overt',
    order: 'Shoot anyone whose LATEST dossier contact is in Foe, Double agent, or Foreigner AND who earlier appeared in Friend, Spy, or Civilian — unless shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        const all = g.touch(x);
        if (all.length < 2) return null;
        const maxT = Math.max(...all.map(e => e.time));
        const last = all.find(e => e.time === maxT && ['foe', 'double', 'foreigner'].includes(e.role));
        const earlier = all.find(e => e.time < maxT && ['friend', 'spy', 'civilian'].includes(e.role));
        if (!last || !earlier) return null;
        return proof ? x + ': earlier ' + g.fmt(earlier) + ', latest ' + g.fmt(last) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-68', domain: 6, title: 'Timed covert-to-covert chain',
    order: 'Shoot anyone who acts in Foe, Double agent, or Foreigner toward someone who LATER acts in another category (no return) — unless backed by a clean Friend or shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy'])) return null;
        const hit = matchRelay(g, x, {
          firstRoles: ['foe', 'double', 'foreigner'], firstDir: 'out',
          secondRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], secondDir: 'out',
          diffRole: true, timeOrder: 'before'
        });
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' followed later by ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-69', domain: 6, title: 'Shadowed or backed after compromise',
    order: 'Shoot anyone shadowed by a Spy or backed by a Friend who had EARLIER appeared in Foe, Double agent, or Foreigner — excluding anyone tipped off by a clean Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanCivilian(g, x)) return null;
        const hit = matchRelay(g, x, {
          firstRoles: ['spy', 'friend'], firstDir: 'in',
          secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'any',
          timeOrder: 'after'
        });
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' after source’s ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 7: Tainted Sources (10)
  // =========================================================================
  hard({
    id: 'ha-70', domain: 7, title: 'Tainted triad of cover',
    order: 'Shoot anyone whose Friend voucher, watching Spy, OR Civilian informant appears in Double agent or Foreigner — unless they hold at least one clean Friend or clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy'])) return null;
        const bad = g.in(x, ['friend', 'spy', 'civilian']).find(e => g.hasTouch(e.from, ['double', 'foreigner']));
        if (!bad) return null;
        return proof ? x + ' relies on compromised source ' + g.fmt(bad) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-71', domain: 7, title: 'Tainted source under Foe pressure',
    order: 'Shoot anyone whose Friend voucher, watching Spy, OR Civilian informant appears in Foe — excluding anyone with a clean Friend or clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy'])) return null;
        const bad = g.in(x, ['friend', 'spy', 'civilian']).find(e => g.hasTouch(e.from, 'foe'));
        if (!bad) return null;
        return proof ? x + ' relies on Foe-linked source ' + g.fmt(bad) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-72', domain: 7, title: 'Zero clean overt sources',
    order: 'Shoot anyone receiving contact in Friend, Spy, or Civilian where EVERY such actor appears in Foe, Double agent, or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const ins = g.in(x, ['friend', 'spy', 'civilian']);
        if (!ins.length) return null;
        if (!ins.every(e => g.hasTouch(e.from, ['foe', 'double', 'foreigner']))) return null;
        return proof ? x + ': every overt source (' + ins.map(e => e.from).join(', ') + ') is covertly compromised.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-73', domain: 7, title: 'Covertly fed by an overt insider',
    order: 'Shoot anyone targeted by a Foe, fed a Double agent’s leak, or met by a Foreigner by someone who ALSO appears in Friend, Spy, or Civilian — unless backed by a clean Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanFriend(g, x)) return null;
        const hit = matchRelay(g, x, {
          firstRoles: ['foe', 'double', 'foreigner'], firstDir: 'in',
          secondRoles: ['friend', 'spy', 'civilian'], secondDir: 'any'
        });
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' from overt insider (' + g.fmt(hit.e2) + ').' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-74', domain: 7, title: 'Backing a compromised insider',
    order: 'Shoot anyone who acts in Friend, Spy, or Civilian toward someone appearing in BOTH an overt (Friend, Spy, Civilian) and a covert (Foe, Double agent, Foreigner) category.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const e of g.out(x, ['friend', 'spy', 'civilian'])) {
          if (g.hasTouch(e.to, ['foe', 'double', 'foreigner']) &&
              g.touch(e.to, ['friend', 'spy', 'civilian']).some(o => o.role !== e.role)) {
            return proof ? x + ': ' + g.fmt(e) + ' toward double-file contact ' + e.to + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  hard({
    id: 'ha-75', domain: 7, title: 'Two-hop tainted cover',
    order: 'Shoot anyone backed by a Friend whose own contact (either way) appears in Double agent or Foreigner — unless shadowed by a clean Spy or tipped off by a clean Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanSpy', 'cleanCivilian'])) return null;
        for (const f of g.in(x, 'friend')) {
          const cov = g.neighbors(f.from).find(n => n !== x && g.hasTouch(n, ['double', 'foreigner']));
          if (cov) return proof ? x + ' backed by ' + f.from + ', who links to covert ' + cov + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  hard({
    id: 'ha-76', domain: 7, title: 'Two-hop tainted surveillance',
    order: 'Shoot anyone shadowed by a Spy whose own contact (either way) appears in Double agent or Foreigner — unless backed by a clean Friend or tipped off by a clean Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanCivilian'])) return null;
        for (const s of g.in(x, 'spy')) {
          const cov = g.neighbors(s.from).find(n => n !== x && g.hasTouch(n, ['double', 'foreigner']));
          if (cov) return proof ? x + ' shadowed by ' + s.from + ', who links to covert ' + cov + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  hard({
    id: 'ha-77', domain: 7, title: 'Compromised informant’s second link',
    order: 'Shoot anyone tipped off by a Civilian whose own contact (either way) appears in Foe, Double agent, or Foreigner — unless backed by a clean Friend or shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy'])) return null;
        for (const c of g.in(x, 'civilian')) {
          const cov = g.neighbors(c.from).find(n => n !== x && g.hasTouch(n, ['foe', 'double', 'foreigner']));
          if (cov) return proof ? x + ' tipped off by ' + c.from + ', who links to covert ' + cov + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  hard({
    id: 'ha-78', domain: 7, title: 'Unverified Foe target',
    order: 'Shoot anyone targeted by a Foe who has NO clean Friend voucher, NO clean Spy watcher, and NO clean Civilian tip-off.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy', 'cleanCivilian'])) return null;
        const f = g.in(x, 'foe')[0];
        if (!f) return null;
        return proof ? x + ': ' + g.fmt(f) + ' with zero clean overt protection.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-79', domain: 7, title: 'Handler of a tainted asset',
    order: 'Shoot anyone who acts in Foe, Double agent, or Foreigner toward someone with a tainted Friend or tainted Spy — unless backed by a clean Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanFriend(g, x)) return null;
        for (const e of g.out(x, ['foe', 'double', 'foreigner'])) {
          if (hasTaintedFriend(g, e.to) || hasTaintedSpy(g, e.to)) {
            return proof ? x + ': ' + g.fmt(e) + ' toward compromised asset ' + e.to + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 8: Double Lives (10)
  // =========================================================================
  hard({
    id: 'ha-80', domain: 8, title: 'Deep cover across three files',
    order: 'Shoot anyone appearing in at least THREE distinct categories including at least one overt (Friend, Spy, Civilian) and one covert (Foe, Double agent, Foreigner) — unless shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        const d = g.distinctRoles(x);
        if (d.size < 3) return null;
        const hasOv = ['friend', 'spy', 'civilian'].some(r => d.has(r));
        const hasCov = ['foe', 'double', 'foreigner'].some(r => d.has(r));
        if (!hasOv || !hasCov) return null;
        return proof ? x + ' spans ' + d.size + ' categories across overt and covert files.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-81', domain: 8, title: 'Covert predominance',
    order: 'Shoot anyone appearing in MORE covert categories (Foe, Double agent, Foreigner) than overt categories (Friend, Spy, Civilian) — excluding anyone backed by a clean Friend or clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy'])) return null;
        const cov = new Set(g.touch(x, ['foe', 'double', 'foreigner']).map(e => e.role)).size;
        const ov = new Set(g.touch(x, ['friend', 'spy', 'civilian']).map(e => e.role)).size;
        if (cov <= ov) return null;
        return proof ? x + ' has ' + cov + ' covert vs ' + ov + ' overt categories (no clean cover).' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-82', domain: 8, title: 'Overt predominance hiding a mole',
    order: 'Shoot anyone appearing in MORE overt categories (Friend, Spy, Civilian) than covert categories (Foe, Double agent, Foreigner), yet still acting in Double agent or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const hit = g.out(x, ['double', 'foreigner'])[0];
        if (!hit) return null;
        const cov = new Set(g.touch(x, ['foe', 'double', 'foreigner']).map(e => e.role)).size;
        const ov = new Set(g.touch(x, ['friend', 'spy', 'civilian']).map(e => e.role)).size;
        if (ov <= cov) return null;
        return proof ? x + ' holds ' + ov + ' overt vs ' + cov + ' covert files while ' + g.fmt(hit) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-83', domain: 8, title: 'Strict covert-out, overt-in split',
    order: 'Shoot anyone who acts ONLY in Foe, Double agent, or Foreigner (at least once) and receives ONLY in Friend, Spy, or Civilian (at least once).',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const outs = g.out(x);
        const ins = g.in(x);
        if (!outs.length || !ins.length) return null;
        if (!outs.every(e => ['foe', 'double', 'foreigner'].includes(e.role))) return null;
        if (!ins.every(e => ['friend', 'spy', 'civilian'].includes(e.role))) return null;
        return proof ? x + ' receives strictly overt (' + g.fmt(ins[0]) + ') while acting strictly covert (' + g.fmt(outs[0]) + ').' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-84', domain: 8, title: 'Strict overt-out, covert-in split',
    order: 'Shoot anyone who acts ONLY in Friend, Spy, or Civilian (at least once) and receives ONLY in Foe, Double agent, or Foreigner (at least once).',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const outs = g.out(x);
        const ins = g.in(x);
        if (!outs.length || !ins.length) return null;
        if (!outs.every(e => ['friend', 'spy', 'civilian'].includes(e.role))) return null;
        if (!ins.every(e => ['foe', 'double', 'foreigner'].includes(e.role))) return null;
        return proof ? x + ' acts strictly overt (' + g.fmt(outs[0]) + ') while receiving strictly covert (' + g.fmt(ins[0]) + ').' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-85', domain: 8, title: 'Unwatched covert specialist',
    order: 'Shoot anyone appearing ONLY in Foe, Double agent, or Foreigner (no Friend, Spy, or Civilian contact at all) who also acts toward someone in Friend, Spy, or Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, ['friend', 'spy', 'civilian'])) return null;
        const hit = g.out(x, ['foe', 'double', 'foreigner']).find(e => g.hasTouch(e.to, ['friend', 'spy', 'civilian']));
        if (!hit) return null;
        return proof ? x + ' stays purely covert yet acts on overt ' + hit.to + ' (' + g.fmt(hit) + ').' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-86', domain: 8, title: 'Overt specialist surrounded by covert contacts',
    order: 'Shoot anyone appearing ONLY in Friend, Spy, or Civilian (no Foe, Double agent, or Foreigner contact) whose direct contacts include BOTH Double agent and Foreigner (or Foe and Foreigner).',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, ['foe', 'double', 'foreigner'])) return null;
        const n = g.neighbors(x);
        const hasFor = n.some(p => g.hasTouch(p, 'foreigner'));
        const hasHost = n.some(p => g.hasTouch(p, ['double', 'foe']));
        if (!hasFor || !hasHost) return null;
        return proof ? x + ' stays purely overt while linked to both Foreigner and Foe/Double agent circles.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-87', domain: 8, title: 'Four-category operator',
    order: 'Shoot anyone appearing in at least THREE distinct categories with NO clean Friend voucher and NO clean Spy shadow.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy'])) return null;
        const d = g.distinctRoles(x);
        if (d.size < 3) return null;
        return proof ? x + ' spans ' + d.size + ' categories with no clean Friend or Spy shield.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-88', domain: 8, title: 'Balanced overt-covert double agent',
    order: 'Shoot anyone appearing in the SAME number of overt categories (Friend, Spy, Civilian) and covert categories (Foe, Double agent, Foreigner) — at least 1 each, excluding anyone shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        const cov = new Set(g.touch(x, ['foe', 'double', 'foreigner']).map(e => e.role)).size;
        const ov = new Set(g.touch(x, ['friend', 'spy', 'civilian']).map(e => e.role)).size;
        if (cov < 1 || cov !== ov) return null;
        return proof ? x + ' balances ' + ov + ' overt and ' + cov + ' covert categories (no clean Spy).' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-89', domain: 8, title: 'Unmonitored covert receiver-actor',
    order: 'Shoot anyone who acts in Foe, Double agent, or Foreigner AND receives contact in Friend, Spy, or Civilian — excluding anyone with a clean Friend voucher or clean Civilian tip-off.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanCivilian'])) return null;
        const o = g.out(x, ['foe', 'double', 'foreigner'])[0];
        const i = g.in(x, ['friend', 'spy', 'civilian'])[0];
        if (!o || !i) return null;
        return proof ? x + ': ' + g.fmt(o) + ' while receiving ' + g.fmt(i) + ' (no clean Friend/Civilian).' : 'ok';
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 9: Command & Leverage (10)
  // =========================================================================
  hard({
    id: 'ha-90', domain: 9, title: '{name}’s unwatched covert reach',
    order: 'Shoot anyone reached from {name} in two forward steps through an unwatched middleman (no Spy shadow) — excluding anyone backed by a clean Friend or tipped off by a clean Civilian.',
    useAnchor: true,
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanCivilian'])) return null;
        const hit = matchAnchorRelay(g, anchor, x, {
          step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
          step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out',
          midExc: {roles: ['spy'], dir: 'in'}
        });
        if (!hit) return null;
        return proof ? x + ': 2-step from ' + anchor + ' via unwatched ' + hit.mid + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-91', domain: 9, title: '{name}’s unbacked incoming network',
    order: 'Shoot anyone who reaches {name} in two forward steps through an unbacked middleman (no Friend voucher) — excluding anyone shadowed by a clean Spy or tipped off by a clean Civilian.',
    useAnchor: true,
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanSpy', 'cleanCivilian'])) return null;
        const hit = matchAnchorRelay(g, anchor, x, {
          step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
          step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in',
          midExc: {roles: ['friend'], dir: 'in'}
        });
        if (!hit) return null;
        return proof ? x + ' reaches ' + anchor + ' via unbacked ' + hit.mid + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-92', domain: 9, title: 'Covert link outside {name}’s circle',
    order: 'Shoot anyone NOT directly linked to {name} who appears in at least two of Foe, Double agent, and Foreigner — unless backed by a clean Friend or shadowed by a clean Spy.',
    useAnchor: true,
    evaluate(g, anchor, proof) {
      const near = new Set([anchor, ...g.neighbors(anchor)]);
      return collectMatches(g.people, x => {
        if (near.has(x) || hasAnyShield(g, x, ['cleanFriend', 'cleanSpy'])) return null;
        const cats = new Set(g.touch(x, ['foe', 'double', 'foreigner']).map(e => e.role));
        if (cats.size < 2) return null;
        return proof ? x + ' (outside ' + anchor + '’s circle) spans ' + [...cats].join(' + ') + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-93', domain: 9, title: '{name}’s covert ring',
    order: 'Shoot anyone two contacts away from {name} (not directly linked to {name}) who acts in Foe, Double agent, or Foreigner — unless backed by a clean Friend or shadowed by a clean Spy.',
    useAnchor: true,
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy']) || !g.hasOut(x, ['foe', 'double', 'foreigner'])) return null;
        const hit = matchAnchorRelay(g, anchor, x, {
          step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
          step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'any',
          excludeDirect: true
        });
        if (!hit) return null;
        return proof ? x + ': 2 hops from ' + anchor + ', active covert without clean cover.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-94', domain: 9, title: 'Timed relay from {name} without shield',
    order: 'Shoot anyone reached from {name} in two forward steps where the second dispatch is LATER — excluding anyone backed by a clean Friend or shadowed by a clean Spy.',
    useAnchor: true,
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy'])) return null;
        const hit = matchAnchorRelay(g, anchor, x, {
          step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
          step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out',
          timeOrder: 'before'
        });
        if (!hit) return null;
        return proof ? x + ': timed relay ' + g.fmt(hit.e1) + ' → ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-95', domain: 9, title: 'Timed relay into {name} without shield',
    order: 'Shoot anyone who reaches {name} in two forward steps where the first dispatch is EARLIER — excluding anyone backed by a clean Friend or shadowed by a clean Spy.',
    useAnchor: true,
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        if (hasAnyShield(g, x, ['cleanFriend', 'cleanSpy'])) return null;
        const hit = matchAnchorRelay(g, anchor, x, {
          step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
          step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in',
          timeOrder: 'after'
        });
        if (!hit) return null;
        return proof ? x + ': timed relay ' + g.fmt(hit.e2) + ' → ' + g.fmt(hit.e1) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-96', domain: 9, title: '{name}’s compromised intermediaries',
    order: 'Shoot anyone directly linked to {name} who ALSO links to someone in Foe, Double agent, or Foreigner — unless backed by a clean Friend or shadowed by a clean Spy.',
    useAnchor: true,
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        if (x === anchor || hasAnyShield(g, x, ['cleanFriend', 'cleanSpy']) || !g.between(anchor, x).length) return null;
        const cov = g.neighbors(x).find(n => n !== anchor && g.hasTouch(n, ['foe', 'double', 'foreigner']));
        if (!cov) return null;
        return proof ? x + ' links ' + anchor + ' to covert ' + cov + ' with no clean shield.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-97', domain: 9, title: 'Shared covert circle with {name}',
    order: 'Shoot anyone else sharing a direct neighbor with {name} who appears in Foe, Double agent, or Foreigner — unless backed by a clean Friend or tipped off by a clean Civilian.',
    useAnchor: true,
    evaluate(g, anchor, proof) {
      const aN = new Set(g.neighbors(anchor));
      return collectMatches(g.people, x => {
        if (x === anchor || hasAnyShield(g, x, ['cleanFriend', 'cleanCivilian'])) return null;
        if (!g.hasTouch(x, ['foe', 'double', 'foreigner'])) return null;
        const shared = g.neighbors(x).find(n => aN.has(n));
        if (!shared) return null;
        return proof ? x + ' shares contact ' + shared + ' with ' + anchor + ' while covert.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-98', domain: 9, title: '{name}’s covert-to-overt targets',
    order: 'Shoot anyone reached from {name} by a covert link (Foe, Double agent, Foreigner) followed by an overt link (Friend, Spy, Civilian) — excluding anyone backed by a clean Friend.',
    useAnchor: true,
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanFriend(g, x)) return null;
        const hit = matchAnchorRelay(g, anchor, x, {
          step1Roles: ['foe', 'double', 'foreigner'], step1Dir: 'any',
          step2Roles: ['friend', 'spy', 'civilian'], step2Dir: 'any'
        });
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' → ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  }),
  hard({
    id: 'ha-99', domain: 9, title: '{name}’s overt-to-covert targets',
    order: 'Shoot anyone reached from {name} by an overt link (Friend, Spy, Civilian) followed by a covert link (Foe, Double agent, Foreigner) — excluding anyone shadowed by a clean Spy.',
    useAnchor: true,
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        const hit = matchAnchorRelay(g, anchor, x, {
          step1Roles: ['friend', 'spy', 'civilian'], step1Dir: 'any',
          step2Roles: ['foe', 'double', 'foreigner'], step2Dir: 'any'
        });
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' → ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  })
];
