import {collectMatches} from './case-graph.js';
import {
  hasCleanCivilian, hasCleanFriend, hasCleanSpy, hasTaintedFriend, hasTaintedSpy,
  matchAnchorRelay, matchAtom, matchRelay, matchTemporal
} from './case-predicates.js';

// 100 genuinely distinct Moderate intelligence cases (10 domains × 10 families).
// Multi-category cover/betrayal, clean-vs-tainted source discrimination, temporal betrayal,
// unwatched proxy relays, and asymmetric double lives — paired with 3 disputed files in
// coupled 3-node cycles or confirmed-anchored symmetric chains (ZERO Style-4 trees!).

function mod({id, domain, title, order, useAnchor = false, evaluate}) {
  return {id, tier: 'medium', domain, title, order, hint: '', useAnchor, evaluate};
}

function modCarry({id, domain, title, order, firstRoles, firstDir, secondRoles, secondDir, diffRole = false, timeOrder = null, midExc = null, midReq = null, cleanShield = null, exc = null, req = null}) {
  return mod({
    id, domain, title, order,
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        if (req && !matchAtom(g, x, req).length) return null;
        if (cleanShield === 'friend' && hasCleanFriend(g, x)) return null;
        if (cleanShield === 'spy' && hasCleanSpy(g, x)) return null;
        if (cleanShield === 'civilian' && hasCleanCivilian(g, x)) return null;
        if (cleanShield === 'friend+spy' && (hasCleanFriend(g, x) || hasCleanSpy(g, x))) return null;
        const hit = matchRelay(g, x, {firstRoles, firstDir, secondRoles, secondDir, diffRole, timeOrder, midExc, midReq});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' → ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  });
}

function modTime({id, domain, title, order, early, late, cleanShield = null, exc = null, req = null}) {
  return mod({
    id, domain, title, order,
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        if (req && !matchAtom(g, x, req).length) return null;
        if (cleanShield === 'friend' && hasCleanFriend(g, x)) return null;
        if (cleanShield === 'spy' && hasCleanSpy(g, x)) return null;
        if (cleanShield === 'friend+spy' && (hasCleanFriend(g, x) || hasCleanSpy(g, x))) return null;
        const hit = matchTemporal(g, x, early, late);
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit[0]) + ' before ' + g.fmt(hit[1]) + '.' : 'ok';
      }, proof);
    }
  });
}

function modAnchor({id, domain, title, order, step1Roles, step1Dir, step2Roles, step2Dir, excludeDirect = false, timeOrder = null, midExc = null, cleanShield = null, exc = null, req = null}) {
  return mod({
    id, domain, title, order, useAnchor: true,
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        if (req && !matchAtom(g, x, req).length) return null;
        if (cleanShield === 'friend' && hasCleanFriend(g, x)) return null;
        if (cleanShield === 'spy' && hasCleanSpy(g, x)) return null;
        const hit = matchAnchorRelay(g, anchor, x, {step1Roles, step1Dir, step2Roles, step2Dir, excludeDirect, timeOrder, midExc});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' → ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  });
}

export const moderateFamilies = [
  // =========================================================================
  // DOMAIN 0: Cover & Betrayal (10)
  // =========================================================================
  mod({
    id: 'mo-00', domain: 0, title: 'Tainted Friend alibi',
    order: 'Shoot anyone backed by a tainted Friend (one in Double agent or Foreigner) — unless shadowed by a clean Spy or tipped off by a Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x) || g.hasIn(x, 'civilian')) return null;
        const f = hasTaintedFriend(g, x);
        if (!f) return null;
        return proof ? x + ' relies on tainted voucher ' + g.fmt(f) + '.' : 'ok';
      }, proof);
    }
  }),
  modCarry({
    id: 'mo-01', domain: 0, title: 'Betrayed without clean watch',
    order: 'Shoot anyone vouched for by a Friend who targets someone as a Foe — unless shadowed by a clean Spy.',
    firstRoles: ['friend'], firstDir: 'in', secondRoles: ['foe'], secondDir: 'out', cleanShield: 'spy'
  }),
  modCarry({
    id: 'mo-02', domain: 0, title: 'Voucher backing an unwatched mole',
    order: 'Shoot anyone who vouches as a Friend for an unwatched suspect (no Spy shadow) who leaks as a Double agent or meets as a Foreigner.',
    firstRoles: ['friend'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'out',
    midExc: {roles: ['spy'], dir: 'in'}
  }),
  mod({
    id: 'mo-03', domain: 0, title: 'Compromised Friend shield',
    order: 'Shoot anyone targeted by a Foe or fed a Double agent’s leak who has no clean Friend voucher and no Spy shadowing them.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanFriend(g, x) || g.hasIn(x, 'spy')) return null;
        const hit = g.in(x, ['foe', 'double'])[0];
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit) + ', no clean Friend or Spy watch.' : 'ok';
      }, proof);
    }
  }),
  mod({
    id: 'mo-04', domain: 0, title: 'Covert mole without clean cover',
    order: 'Shoot anyone who leaks as a Double agent or targets as a Foe — unless backed by a clean Friend or shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanFriend(g, x) || hasCleanSpy(g, x)) return null;
        const hit = g.out(x, ['double', 'foe'])[0];
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit) + ', lacks clean Friend and clean Spy.' : 'ok';
      }, proof);
    }
  }),
  modCarry({
    id: 'mo-05', domain: 0, title: 'Enemy striking an unshielded ally',
    order: 'Shoot anyone who targets as a Foe someone backed by a Friend — unless shadowed by a clean Spy or tipped off by a Civilian.',
    firstRoles: ['foe'], firstDir: 'out', secondRoles: ['friend'], secondDir: 'in',
    cleanShield: 'spy', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modCarry({
    id: 'mo-06', domain: 0, title: 'Mole corrupting an ally’s circle',
    order: 'Shoot anyone who leaks as a Double agent or targets as a Foe someone backed by a Friend — excluding anyone backed by a clean Friend or shadowed by a Spy.',
    firstRoles: ['double', 'foe'], firstDir: 'out', secondRoles: ['friend'], secondDir: 'in',
    cleanShield: 'friend', exc: {roles: ['spy'], dir: 'in'}
  }),
  mod({
    id: 'mo-07', domain: 0, title: 'Only tainted overt cover',
    order: 'Shoot anyone backed by a Friend or tipped off by a Civilian where EVERY such Friend/Civilian appears in Foe, Double agent, or Foreigner — unless shadowed by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        const ovs = g.in(x, ['friend', 'civilian']);
        if (!ovs.length) return null;
        if (!ovs.every(e => g.hasTouch(e.from, ['foe', 'double', 'foreigner']))) return null;
        return proof ? x + ': every Friend/Civilian backing (' + ovs.map(e => e.from).join(', ') + ') is compromised.' : 'ok';
      }, proof);
    }
  }),
  modCarry({
    id: 'mo-08', domain: 0, title: 'Vouched by an enemy’s target',
    order: 'Shoot anyone vouched for by a Friend who is targeted by a Foe or met by a Foreigner — excluding anyone shadowed by a clean Spy.',
    firstRoles: ['friend'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'in',
    cleanShield: 'spy'
  }),
  modCarry({
    id: 'mo-09', domain: 0, title: 'Double-crossed informant’s ally',
    order: 'Shoot anyone who vouches as a Friend for someone tipped off by a Civilian AND targeted by a Foe or met by a Foreigner.',
    firstRoles: ['friend'], firstDir: 'out', secondRoles: ['foe', 'foreigner'], secondDir: 'in',
    midReq: {roles: ['civilian'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 1: Surveillance & Blind Spots (10)
  // =========================================================================
  mod({
    id: 'mo-10', domain: 1, title: 'Tainted surveillance',
    order: 'Shoot anyone shadowed by a tainted Spy (one in Foe, Double agent, or Foreigner) — unless backed by a clean Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanFriend(g, x)) return null;
        const s = hasTaintedSpy(g, x);
        if (!s) return null;
        return proof ? x + ' shadowed by tainted Spy ' + g.fmt(s) + '.' : 'ok';
      }, proof);
    }
  }),
  mod({
    id: 'mo-11', domain: 1, title: 'Every watcher or voucher tainted',
    order: 'Shoot anyone shadowed by a Spy or backed by a Friend where EVERY such Spy/Friend appears in Double agent or Foreigner — unless tipped off by a Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'civilian')) return null;
        const ss = g.in(x, ['spy', 'friend']);
        if (!ss.length) return null;
        if (!ss.every(s => g.hasTouch(s.from, ['double', 'foreigner']))) return null;
        return proof ? x + ': every watching Spy/Friend (' + ss.map(s => s.from).join(', ') + ') is compromised.' : 'ok';
      }, proof);
    }
  }),
  mod({
    id: 'mo-12', domain: 1, title: 'Unmonitored covert triangle',
    order: 'Shoot anyone named in at least two of Foe, Double agent, and Foreigner who has NO clean Spy shadowing them.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        const hits = g.touch(x, ['foe', 'double', 'foreigner']);
        const cats = new Set(hits.map(e => e.role));
        if (cats.size < 2) return null;
        return proof ? x + ' spans ' + [...cats].join(' + ') + ' with no clean Spy watch.' : 'ok';
      }, proof);
    }
  }),
  modCarry({
    id: 'mo-13', domain: 1, title: 'Spy watching an unbacked hostile',
    order: 'Shoot anyone who shadows as a Spy an unbacked suspect (no Friend voucher) who acts in Foe, Double agent, or Foreigner.',
    firstRoles: ['spy'], firstDir: 'out', secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'out',
    midExc: {roles: ['friend'], dir: 'in'}
  }),
  mod({
    id: 'mo-14', domain: 1, title: 'Blind-spot covert recipient',
    order: 'Shoot anyone fed a Double agent’s leak or met by a Foreigner by an unwatched contact (no Spy shadow on that actor) — unless backed by a clean Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanFriend(g, x)) return null;
        const hit = g.in(x, ['double', 'foreigner']).find(e => !g.hasIn(e.from, 'spy'));
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit) + ' from unwatched actor (no clean Friend).' : 'ok';
      }, proof);
    }
  }),
  mod({
    id: 'mo-15', domain: 1, title: 'Pure blind-spot operator',
    order: 'Shoot anyone who acts in Foe, Double agent, or Foreigner AND receives no Spy watch, no Friend backing, and no Civilian tip-off.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, ['spy', 'friend', 'civilian'])) return null;
        const hit = g.out(x, ['foe', 'double', 'foreigner'])[0];
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit) + ', zero incoming cover or watch.' : 'ok';
      }, proof);
    }
  }),
  modCarry({
    id: 'mo-16', domain: 1, title: 'Shadowing a double-exposed contact',
    order: 'Shoot anyone who shadows as a Spy someone met by a Foreigner AND targeted by a Foe or fed a Double agent’s leak.',
    firstRoles: ['spy'], firstDir: 'out', secondRoles: ['foe', 'double'], secondDir: 'in',
    midReq: {roles: ['foreigner'], dir: 'in'}
  }),
  mod({
    id: 'mo-17', domain: 1, title: 'Watched without Friend or Civilian',
    order: 'Shoot anyone shadowed by a Spy who also appears in Foe or Foreigner — excluding anyone in Friend or Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, ['friend', 'civilian'])) return null;
        const s = g.in(x, 'spy')[0];
        const c = g.touch(x, ['foe', 'foreigner'])[0];
        if (!s || !c) return null;
        return proof ? x + ': ' + g.fmt(s) + ' and ' + g.fmt(c) + ' (no Friend/Civilian).' : 'ok';
      }, proof);
    }
  }),
  modCarry({
    id: 'mo-18', domain: 1, title: 'Compromised Spy’s overt contact',
    order: 'Shoot anyone tipped off by a Civilian or backed by a Friend who is shadowed by a Spy appearing in Foe, Double agent, or Foreigner.',
    firstRoles: ['civilian', 'friend'], firstDir: 'in', secondRoles: ['spy'], secondDir: 'in',
    midReq: {roles: ['foe', 'double', 'foreigner'], dir: 'any'}
  }),
  mod({
    id: 'mo-19', domain: 1, title: 'Watcher caught in two hostile files',
    order: 'Shoot anyone who appears in Spy AND also appears in at least two of Foe, Double agent, and Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (!g.hasTouch(x, 'spy')) return null;
        const cats = new Set(g.touch(x, ['foe', 'double', 'foreigner']).map(e => e.role));
        if (cats.size < 2) return null;
        return proof ? x + ' links Spy with ' + [...cats].join(' + ') + '.' : 'ok';
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 2: Foreign Contact (10)
  // =========================================================================
  mod({
    id: 'mo-20', domain: 2, title: 'Unshielded foreign contact',
    order: 'Shoot anyone in Foreigner who has NO clean Friend voucher and NO clean Spy shadowing them.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const f = g.touch(x, 'foreigner')[0];
        if (!f || hasCleanFriend(g, x) || hasCleanSpy(g, x)) return null;
        return proof ? x + ': ' + g.fmt(f) + ', no clean Friend or Spy shield.' : 'ok';
      }, proof);
    }
  }),
  modCarry({
    id: 'mo-21', domain: 2, title: 'Foreigner reaching an unwatched mole',
    order: 'Shoot anyone who meets as a Foreigner an unwatched suspect (no Spy shadow) who appears in Double agent or Foe.',
    firstRoles: ['foreigner'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'any',
    midExc: {roles: ['spy'], dir: 'in'}
  }),
  modCarry({
    id: 'mo-22', domain: 2, title: 'Foreign drop via compromised insider',
    order: 'Shoot anyone met by a Foreigner who also vouches as a Friend or shadows as a Spy — excluding anyone tipped off by a Civilian.',
    firstRoles: ['foreigner'], firstDir: 'in', secondRoles: ['friend', 'spy'], secondDir: 'out',
    exc: {roles: ['civilian'], dir: 'in'}
  }),
  modCarry({
    id: 'mo-23', domain: 2, title: 'Foreigner meeting an ally’s ward',
    order: 'Shoot anyone who meets as a Foreigner someone backed by a Friend or tipped off by a Civilian — unless shadowed by a clean Spy.',
    firstRoles: ['foreigner'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'in',
    cleanShield: 'spy'
  }),
  mod({
    id: 'mo-24', domain: 2, title: 'Foreign-linked insider without watch',
    order: 'Shoot anyone linked (either way) to someone in Foreigner who also appears in Friend or Civilian — excluding anyone shadowed by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        if (!g.hasTouch(x, ['friend', 'civilian'])) return null;
        const m = g.neighbors(x).find(n => g.hasTouch(n, 'foreigner'));
        if (!m) return null;
        return proof ? x + ' holds overt cover and links to Foreigner-file contact ' + m + '.' : 'ok';
      }, proof);
    }
  }),
  modCarry({
    id: 'mo-25', domain: 2, title: 'Foreigner fed by a double life',
    order: 'Shoot anyone met by a Foreigner who received a Double agent’s leak or Civilian tip-off — unless backed by a clean Friend.',
    firstRoles: ['foreigner'], firstDir: 'in', secondRoles: ['double', 'civilian'], secondDir: 'in',
    cleanShield: 'friend'
  }),
  modCarry({
    id: 'mo-26', domain: 2, title: 'Hostile bridging to an unwatched outsider',
    order: 'Shoot anyone who leaks as a Double agent or targets as a Foe an unwatched contact (no Spy shadow) who appears in Foreigner.',
    firstRoles: ['double', 'foe'], firstDir: 'out', secondRoles: ['foreigner'], secondDir: 'any',
    midExc: {roles: ['spy'], dir: 'in'}
  }),
  modCarry({
    id: 'mo-27', domain: 2, title: 'Foe striking a foreign asset',
    order: 'Shoot anyone who targets as a Foe someone met by a Foreigner — excluding anyone backed by a clean Friend or clean Spy.',
    firstRoles: ['foe'], firstDir: 'out', secondRoles: ['foreigner'], secondDir: 'in',
    cleanShield: 'friend+spy'
  }),
  mod({
    id: 'mo-28', domain: 2, title: 'Foreign contact bridging Foe and Civilian',
    order: 'Shoot anyone linked (either way) to someone in Foreigner AND to someone in Civilian (two different people) — unless shadowed by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        const n = g.neighbors(x);
        for (const a of n) {
          if (!g.hasTouch(a, 'foreigner')) continue;
          for (const b of n) {
            if (b !== a && g.hasTouch(b, 'civilian')) {
              return proof ? x + ' bridges Foreigner-linked ' + a + ' and Civilian-linked ' + b + '.' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  modCarry({
    id: 'mo-29', domain: 2, title: 'Unbacked contact of a watched covert actor',
    order: 'Shoot anyone met by a Foreigner or fed a Double agent’s leak who is shadowed by a Spy — unless backed by a clean Friend.',
    firstRoles: ['foreigner', 'double'], firstDir: 'in', secondRoles: ['spy'], secondDir: 'in',
    cleanShield: 'friend'
  }),

  // =========================================================================
  // DOMAIN 3: Civilian Tip-Offs (10)
  // =========================================================================
  mod({
    id: 'mo-30', domain: 3, title: 'Tipped by a compromised Civilian',
    order: 'Shoot anyone tipped off by a Civilian who appears in Foe, Double agent, or Foreigner — unless shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        const c = g.in(x, 'civilian').find(e => g.hasTouch(e.from, ['foe', 'double', 'foreigner']));
        if (!c) return null;
        return proof ? x + ' tipped off by compromised Civilian ' + g.fmt(c) + '.' : 'ok';
      }, proof);
    }
  }),
  mod({
    id: 'mo-31', domain: 3, title: 'No clean Civilian warning',
    order: 'Shoot anyone targeted by a Foe or met by a Foreigner who has NO clean Civilian tip-off (not in Foe, Double agent, or Foreigner) and NO Spy shadow.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanCivilian(g, x) || g.hasIn(x, 'spy')) return null;
        const hit = g.in(x, ['foe', 'foreigner'])[0];
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit) + ', no clean Civilian warning or Spy watch.' : 'ok';
      }, proof);
    }
  }),
  modCarry({
    id: 'mo-32', domain: 3, title: 'Informant tipping an unwatched mole',
    order: 'Shoot anyone who tips off as a Civilian an unwatched suspect (no Spy shadow) who acts in Foe, Double agent, or Foreigner.',
    firstRoles: ['civilian'], firstDir: 'out', secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'out',
    midExc: {roles: ['spy'], dir: 'in'}
  }),
  modCarry({
    id: 'mo-33', domain: 3, title: 'Informant tipping an unbacked target',
    order: 'Shoot anyone who tips off as a Civilian an unbacked suspect (no Friend voucher) who is met by a Foreigner or fed a Double agent’s leak.',
    firstRoles: ['civilian'], firstDir: 'out', secondRoles: ['foreigner', 'double'], secondDir: 'in',
    midExc: {roles: ['friend'], dir: 'in'}
  }),
  mod({
    id: 'mo-34', domain: 3, title: 'Civilian exposed without clean cover',
    order: 'Shoot anyone in Civilian who also appears in Foe, Double agent, or Foreigner — unless backed by a clean Friend or clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanFriend(g, x) || hasCleanSpy(g, x)) return null;
        const c = g.touch(x, 'civilian')[0];
        const h = g.touch(x, ['foe', 'double', 'foreigner'])[0];
        if (!c || !h) return null;
        return proof ? x + ': ' + g.fmt(c) + ' and ' + g.fmt(h) + ', no clean Friend/Spy.' : 'ok';
      }, proof);
    }
  }),
  modCarry({
    id: 'mo-35', domain: 3, title: 'Tipped by a Friend-backed mole',
    order: 'Shoot anyone tipped off by a Civilian who is backed by a Friend AND appears in Foe, Double agent, or Foreigner.',
    firstRoles: ['civilian'], firstDir: 'in', secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'any',
    midReq: {roles: ['friend'], dir: 'in'}
  }),
  modCarry({
    id: 'mo-36', domain: 3, title: 'Unbacked mole hitting an informant',
    order: 'Shoot anyone who leaks as a Double agent or targets as a Foe someone who acts as a Civilian — unless backed by a clean Friend.',
    firstRoles: ['double', 'foe'], firstDir: 'out', secondRoles: ['civilian'], secondDir: 'out',
    cleanShield: 'friend'
  }),
  mod({
    id: 'mo-37', domain: 3, title: 'Only compromised informants or watchers',
    order: 'Shoot anyone tipped off by a Civilian or shadowed by a Spy where EVERY such Civilian/Spy appears in Foe, Double agent, or Foreigner — unless backed by a Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend')) return null;
        const cs = g.in(x, ['civilian', 'spy']);
        if (!cs.length) return null;
        if (!cs.every(c => g.hasTouch(c.from, ['foe', 'double', 'foreigner']))) return null;
        return proof ? x + ': every Civilian/Spy source (' + cs.map(c => c.from).join(', ') + ') is compromised.' : 'ok';
      }, proof);
    }
  }),
  modCarry({
    id: 'mo-38', domain: 3, title: 'Tipped by a targeted or leaked-to witness',
    order: 'Shoot anyone tipped off by a Civilian who is targeted by a Foe or fed a Double agent’s leak — excluding anyone backed by a clean Friend.',
    firstRoles: ['civilian'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'in',
    cleanShield: 'friend'
  }),
  modCarry({
    id: 'mo-39', domain: 3, title: 'Informant bridging Spy and Foreigner',
    order: 'Shoot anyone who tips off as a Civilian someone shadowed by a Spy AND linked to Foreigner or Double agent.',
    firstRoles: ['civilian'], firstDir: 'out', secondRoles: ['foreigner', 'double'], secondDir: 'any',
    midReq: {roles: ['spy'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 4: Proxy Chains (10)
  // =========================================================================
  modCarry({
    id: 'mo-40', domain: 4, title: 'Unwatched covert relay starter',
    order: 'Shoot anyone who acts in Foe, Double agent, or Foreigner toward an unwatched contact (no Spy shadow) who then acts in a DIFFERENT category (no return).',
    firstRoles: ['foe', 'double', 'foreigner'], firstDir: 'out',
    secondRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], secondDir: 'out',
    diffRole: true, midExc: {roles: ['spy'], dir: 'in'}
  }),
  modCarry({
    id: 'mo-41', domain: 4, title: 'Unbacked relay into covert act',
    order: 'Shoot anyone who acts in Friend, Spy, or Civilian toward an unbacked contact (no Friend voucher) who then acts in Foe, Double agent, or Foreigner (no return).',
    firstRoles: ['friend', 'spy', 'civilian'], firstDir: 'out',
    secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'out',
    midExc: {roles: ['friend'], dir: 'in'}
  }),
  modCarry({
    id: 'mo-42', domain: 4, title: 'Covert relay receiver without clean cover',
    order: 'Shoot anyone acted upon in Foe, Double agent, or Foreigner by someone who received a covert contact in a DIFFERENT category (no return) — unless backed by a clean Friend.',
    firstRoles: ['foe', 'double', 'foreigner'], firstDir: 'in',
    secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'in',
    diffRole: true, cleanShield: 'friend'
  }),
  mod({
    id: 'mo-43', domain: 4, title: 'Covert middleman without Spy watch',
    order: 'Shoot anyone receiving a Double agent leak or Foreigner meeting AND passing on a Foe, Spy, or Civilian contact (no return) — unless shadowed by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        for (const e1 of g.in(x, ['double', 'foreigner'])) {
          for (const e2 of g.out(x, ['foe', 'spy', 'civilian'])) {
            if (e2.to !== e1.from) return proof ? x + ' relays ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  mod({
    id: 'mo-44', domain: 4, title: 'Overt middleman feeding a threat',
    order: 'Shoot anyone receiving a Friend voucher or Civilian tip-off AND acting in Foe, Double agent, or Foreigner toward someone else (no return) — unless shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        for (const e1 of g.in(x, ['friend', 'civilian'])) {
          for (const e2 of g.out(x, ['foe', 'double', 'foreigner'])) {
            if (e2.to !== e1.from) return proof ? x + ' relays ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  modCarry({
    id: 'mo-45', domain: 4, title: 'Unwatched overt-to-overt starter',
    order: 'Shoot anyone who acts in Friend or Civilian toward an unwatched contact (no Spy shadow) who then acts in a DIFFERENT overt category (Friend, Spy, Civilian; no return).',
    firstRoles: ['friend', 'civilian'], firstDir: 'out',
    secondRoles: ['friend', 'spy', 'civilian'], secondDir: 'out',
    diffRole: true, midExc: {roles: ['spy'], dir: 'in'}
  }),
  modCarry({
    id: 'mo-46', domain: 4, title: 'Spy-bypassed hostile relay',
    order: 'Shoot anyone targeted by a Foe who had been tipped off by a Civilian or backed by a Friend (no return) — unless shadowed by a clean Spy.',
    firstRoles: ['foe'], firstDir: 'in', secondRoles: ['civilian', 'friend'], secondDir: 'in',
    cleanShield: 'spy'
  }),
  modCarry({
    id: 'mo-47', domain: 4, title: 'Two-step covert starter without cover',
    order: 'Shoot anyone who acts in Spy or Foreigner toward someone who then acts in Double agent or Foe (no return) — unless backed by a clean Friend.',
    firstRoles: ['spy', 'foreigner'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'out',
    cleanShield: 'friend'
  }),
  mod({
    id: 'mo-48', domain: 4, title: 'Three-step covert reach',
    order: 'Shoot anyone who can reach a suspect in Double agent or Foreigner in 1 or 2 forward steps — while appearing in Friend or Civilian and NOT shadowed by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy') || !g.hasTouch(x, ['friend', 'civilian'])) return null;
        for (const e1 of g.out(x)) {
          if (g.hasTouch(e1.to, ['double', 'foreigner'])) return proof ? x + ' reaches covert ' + e1.to + ' via ' + g.fmt(e1) + '.' : 'ok';
          for (const e2 of g.out(e1.to)) {
            if (e2.to !== x && g.hasTouch(e2.to, ['double', 'foreigner'])) {
              return proof ? x + ' reaches covert ' + e2.to + ' via ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  modCarry({
    id: 'mo-49', domain: 4, title: 'Hostile relay ending at an unwarned target',
    order: 'Shoot anyone acted upon in Double agent or Foreigner by someone targeted by a Foe or shadowed by a Spy (no return) — excluding anyone tipped off by a Civilian.',
    firstRoles: ['double', 'foreigner'], firstDir: 'in', secondRoles: ['foe', 'spy'], secondDir: 'in',
    exc: {roles: ['civilian'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 5: Alibi & Contradiction (10)
  // =========================================================================
  mod({
    id: 'mo-50', domain: 5, title: 'Cover-breaking triangle',
    order: 'Shoot anyone linked (either way) to a Friend-backed suspect AND to a Double agent or Foreigner suspect (two different people) — unless shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        const n = g.neighbors(x);
        for (const a of n) {
          if (!g.hasIn(a, 'friend')) continue;
          for (const b of n) {
            if (b !== a && g.hasTouch(b, ['double', 'foreigner'])) {
              return proof ? x + ' links Friend-backed ' + a + ' and covert ' + b + '.' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  mod({
    id: 'mo-51', domain: 5, title: 'Conflicting handler and ward',
    order: 'Shoot anyone who acts toward a contact in Friend, Spy, or Civilian while ALSO linked to that same contact in Foe, Double agent, or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const e1 of g.out(x, ['friend', 'spy', 'civilian'])) {
          const e2 = g.between(x, e1.to, ['foe', 'double', 'foreigner'])[0];
          if (e2) return proof ? x + ' and ' + e1.to + ': ' + g.fmt(e1) + ' conflicts with ' + g.fmt(e2) + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  mod({
    id: 'mo-52', domain: 5, title: 'Pure target without cover',
    order: 'Shoot anyone who NEVER initiates any contact anywhere AND is acted upon in Foe, Double agent, or Foreigner — unless backed by a Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.out(x).length > 0 || g.hasIn(x, 'friend')) return null;
        const hit = g.in(x, ['foe', 'double', 'foreigner'])[0];
        if (!hit) return null;
        return proof ? x + ' initiates no contacts and receives ' + g.fmt(hit) + '.' : 'ok';
      }, proof);
    }
  }),
  mod({
    id: 'mo-53', domain: 5, title: 'Pure instigator without watch',
    order: 'Shoot anyone who NEVER receives any contact anywhere AND acts in Foe, Double agent, or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.in(x).length > 0) return null;
        const hit = g.out(x, ['foe', 'double', 'foreigner'])[0];
        if (!hit) return null;
        return proof ? x + ' receives no contacts and initiates ' + g.fmt(hit) + '.' : 'ok';
      }, proof);
    }
  }),
  mod({
    id: 'mo-54', domain: 5, title: 'Asymmetric surveillance subject',
    order: 'Shoot anyone shadowed by a Spy who acts in Foe, Double agent, or Foreigner — while NEVER acting in Friend or Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasOut(x, ['friend', 'civilian'])) return null;
        const s = g.in(x, 'spy')[0];
        const c = g.out(x, ['foe', 'double', 'foreigner'])[0];
        if (!s || !c) return null;
        return proof ? x + ': ' + g.fmt(s) + ' while acting covertly (' + g.fmt(c) + ').' : 'ok';
      }, proof);
    }
  }),
  mod({
    id: 'mo-55', domain: 5, title: 'Three-party covert bridge',
    order: 'Shoot anyone linked (either way) to a Foe-linked suspect AND to a Spy-linked suspect (two different people) — excluding anyone backed by a Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend')) return null;
        const n = g.neighbors(x);
        for (const a of n) {
          if (!g.hasTouch(a, 'foe')) continue;
          for (const b of n) {
            if (b !== a && g.hasTouch(b, 'spy')) {
              return proof ? x + ' links Foe-contact ' + a + ' and Spy-contact ' + b + '.' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  mod({
    id: 'mo-56', domain: 5, title: 'Two-source contradiction',
    order: 'Shoot anyone acted upon by BOTH a Friend or Civilian AND a Foe or Foreigner (two different actors) — unless shadowed by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        for (const a of g.in(x, ['friend', 'civilian'])) {
          for (const b of g.in(x, ['foe', 'foreigner'])) {
            if (a.from !== b.from) return proof ? x + ': ' + g.fmt(a) + ' vs ' + g.fmt(b) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  mod({
    id: 'mo-57', domain: 5, title: 'Double-ended operative',
    order: 'Shoot anyone who acts in Friend or Spy AND acts in Foe, Double agent, or Foreigner toward two DIFFERENT people.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const a of g.out(x, ['friend', 'spy'])) {
          for (const b of g.out(x, ['foe', 'double', 'foreigner'])) {
            if (a.to !== b.to) return proof ? x + ': ' + g.fmt(a) + ' and ' + g.fmt(b) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  mod({
    id: 'mo-58', domain: 5, title: 'Undercut witness',
    order: 'Shoot anyone linked to the SAME person in two different categories — excluding anyone shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        for (const n of g.neighbors(x)) {
          const edges = g.between(x, n);
          if (new Set(edges.map(e => e.role)).size >= 2) {
            return proof ? x + ' and ' + n + ' collide across ' + g.fmt(edges[0]) + ' and ' + g.fmt(edges[1]) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  mod({
    id: 'mo-59', domain: 5, title: 'Overtly cleared, doubly exposed',
    order: 'Shoot anyone backed by a Friend or tipped off by a Civilian who ALSO appears in at least TWO of Foe, Double agent, and Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const cov = g.in(x, ['friend', 'civilian'])[0];
        if (!cov) return null;
        const cats = new Set(g.touch(x, ['foe', 'double', 'foreigner']).map(e => e.role));
        if (cats.size < 2) return null;
        return proof ? x + ': ' + g.fmt(cov) + ' despite ' + [...cats].join(' + ') + '.' : 'ok';
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 6: Chronology & Timing (10)
  // =========================================================================
  modTime({
    id: 'mo-60', domain: 6, title: 'Superseded Friend cover',
    order: 'Shoot anyone vouched for by a Friend BEFORE they appeared in Foe, Double agent, or Foreigner — unless shadowed by a clean Spy.',
    early: {roles: ['friend'], dir: 'in'}, late: {roles: ['foe', 'double', 'foreigner']}, cleanShield: 'spy'
  }),
  modTime({
    id: 'mo-61', domain: 6, title: 'Too-late surveillance',
    order: 'Shoot anyone who acted in Foe, Double agent, or Foreigner BEFORE a Spy shadowed them — unless backed by a clean Friend.',
    early: {roles: ['foe', 'double', 'foreigner'], dir: 'out'}, late: {roles: ['spy'], dir: 'in'}, cleanShield: 'friend'
  }),
  modTime({
    id: 'mo-62', domain: 6, title: 'Late Civilian alert',
    order: 'Shoot anyone in Foe, Double agent, or Foreigner BEFORE a Civilian tipped them off — unless backed by a clean Friend.',
    early: {roles: ['foe', 'double', 'foreigner']}, late: {roles: ['civilian'], dir: 'in'}, cleanShield: 'friend'
  }),
  modCarry({
    id: 'mo-63', domain: 6, title: 'Post-cover betrayal chain',
    order: 'Shoot anyone who acts in Friend or Civilian toward someone who LATER acts in Foe, Double agent, or Foreigner — excluding anyone shadowed by a Spy.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'out',
    timeOrder: 'before', exc: {roles: ['spy'], dir: 'in'}
  }),
  modCarry({
    id: 'mo-64', domain: 6, title: 'Pre-compromised voucher',
    order: 'Shoot anyone vouched for by a Friend who had EARLIER appeared in Double agent or Foreigner — unless tipped off by a Civilian.',
    firstRoles: ['friend'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'any',
    timeOrder: 'after', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modCarry({
    id: 'mo-65', domain: 6, title: 'Pre-compromised Spy',
    order: 'Shoot anyone shadowed by a Spy who had EARLIER appeared in Foe, Double agent, or Foreigner — unless backed by a clean Friend.',
    firstRoles: ['spy'], firstDir: 'in', secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'any',
    timeOrder: 'after', cleanShield: 'friend'
  }),
  modTime({
    id: 'mo-66', domain: 6, title: 'Covert first, overt second',
    order: 'Shoot anyone in Double agent or Foreigner BEFORE they appeared in Friend, Spy, or Civilian — excluding anyone backed by a clean Friend.',
    early: {roles: ['double', 'foreigner']}, late: {roles: ['friend', 'spy', 'civilian']}, cleanShield: 'friend'
  }),
  modCarry({
    id: 'mo-67', domain: 6, title: 'Delayed covert handoff',
    order: 'Shoot anyone who acts in Foe, Double agent, or Foreigner toward an unwatched contact (no Spy shadow) who LATER acts in another category (no return).',
    firstRoles: ['foe', 'double', 'foreigner'], firstDir: 'out',
    secondRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], secondDir: 'out',
    diffRole: true, timeOrder: 'before', midExc: {roles: ['spy'], dir: 'in'}
  }),
  mod({
    id: 'mo-68', domain: 6, title: 'Earliest covert actor',
    order: 'Shoot anyone whose EARLIEST contact in the entire dossier is in Foe, Double agent, or Foreigner — and who also appears in Friend, Spy, or Civilian later.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const all = g.touch(x);
        if (all.length < 2) return null;
        const minT = Math.min(...all.map(e => e.time));
        const earliest = all.filter(e => e.time === minT);
        if (!earliest.some(e => ['foe', 'double', 'foreigner'].includes(e.role))) return null;
        const laterOvert = all.find(e => e.time > minT && ['friend', 'spy', 'civilian'].includes(e.role));
        if (!laterOvert) return null;
        return proof ? x + ': earliest is ' + g.fmt(earliest[0]) + ', later ' + g.fmt(laterOvert) + '.' : 'ok';
      }, proof);
    }
  }),
  mod({
    id: 'mo-69', domain: 6, title: 'Latest covert turn',
    order: 'Shoot anyone whose LATEST contact in the entire dossier is in Foe, Double agent, or Foreigner — and who appeared in Friend or Civilian earlier.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const all = g.touch(x);
        if (all.length < 2) return null;
        const maxT = Math.max(...all.map(e => e.time));
        const latest = all.filter(e => e.time === maxT);
        if (!latest.some(e => ['foe', 'double', 'foreigner'].includes(e.role))) return null;
        const earlierOvert = all.find(e => e.time < maxT && ['friend', 'civilian'].includes(e.role));
        if (!earlierOvert) return null;
        return proof ? x + ': earlier ' + g.fmt(earlierOvert) + ', latest is ' + g.fmt(latest[0]) + '.' : 'ok';
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 7: Tainted Sources (10)
  // =========================================================================
  mod({
    id: 'mo-70', domain: 7, title: 'Unverified covert recipient',
    order: 'Shoot anyone fed a Double agent’s leak or met by a Foreigner who lacks BOTH a clean Friend voucher and a clean Spy watcher.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanFriend(g, x) || hasCleanSpy(g, x)) return null;
        const hit = g.in(x, ['double', 'foreigner'])[0];
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit) + ', no clean Friend or clean Spy.' : 'ok';
      }, proof);
    }
  }),
  modCarry({
    id: 'mo-71', domain: 7, title: 'Backed by a Foe-linked Friend',
    order: 'Shoot anyone vouched for by a Friend who appears in Foe — excluding anyone shadowed by a clean Spy.',
    firstRoles: ['friend'], firstDir: 'in', secondRoles: ['foe'], secondDir: 'any', cleanShield: 'spy'
  }),
  modCarry({
    id: 'mo-72', domain: 7, title: 'Fed by an insider mole',
    order: 'Shoot anyone fed a Double agent’s leak by someone in Friend or Civilian — excluding anyone shadowed by a clean Spy.',
    firstRoles: ['double'], firstDir: 'in', secondRoles: ['friend', 'civilian'], secondDir: 'any', cleanShield: 'spy'
  }),
  modCarry({
    id: 'mo-73', domain: 7, title: 'Targeted by a Foreigner-linked Foe',
    order: 'Shoot anyone targeted by a Foe who appears in Foreigner or Double agent — excluding anyone backed by a clean Friend.',
    firstRoles: ['foe'], firstDir: 'in', secondRoles: ['foreigner', 'double'], secondDir: 'any', cleanShield: 'friend'
  }),
  modCarry({
    id: 'mo-74', domain: 7, title: 'Shadowed by a Civilian-linked Spy',
    order: 'Shoot anyone shadowed by a Spy who also appears in Civilian or Friend — excluding anyone backed by a clean Friend.',
    firstRoles: ['spy'], firstDir: 'in', secondRoles: ['civilian', 'friend'], secondDir: 'any', cleanShield: 'friend'
  }),
  modCarry({
    id: 'mo-75', domain: 7, title: 'Vouching for a tainted Spy',
    order: 'Shoot anyone who vouches as a Friend for someone in Spy who ALSO appears in Foe, Double agent, or Foreigner.',
    firstRoles: ['friend'], firstDir: 'out', secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'any',
    midReq: {roles: ['spy'], dir: 'any'}
  }),
  modCarry({
    id: 'mo-76', domain: 7, title: 'Tipping off a tainted Friend',
    order: 'Shoot anyone who tips off as a Civilian someone in Friend who ALSO appears in Foe, Double agent, or Foreigner.',
    firstRoles: ['civilian'], firstDir: 'out', secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'any',
    midReq: {roles: ['friend'], dir: 'any'}
  }),
  modCarry({
    id: 'mo-77', domain: 7, title: 'Targeting a tainted Spy',
    order: 'Shoot anyone who targets as a Foe someone in Spy who ALSO appears in Double agent or Foreigner.',
    firstRoles: ['foe'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'any',
    midReq: {roles: ['spy'], dir: 'any'}
  }),
  mod({
    id: 'mo-78', domain: 7, title: 'Tainted Friend or tainted Spy',
    order: 'Shoot anyone whose Friend voucher OR watching Spy appears in Double agent or Foreigner — unless a clean Civilian tipped them off.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanCivilian(g, x)) return null;
        const f = hasTaintedFriend(g, x);
        if (f) return proof ? x + ' has tainted Friend ' + g.fmt(f) + '.' : 'ok';
        const s = g.in(x, 'spy').find(e => g.hasTouch(e.from, ['double', 'foreigner']));
        if (s) return proof ? x + ' has tainted Spy ' + g.fmt(s) + '.' : 'ok';
        return null;
      }, proof);
    }
  }),
  modCarry({
    id: 'mo-79', domain: 7, title: 'Handler of a compromised informant',
    order: 'Shoot anyone who acts in Foe, Double agent, or Foreigner toward a Civilian informant who also appears in Friend or Spy.',
    firstRoles: ['foe', 'double', 'foreigner'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'any',
    midReq: {roles: ['civilian'], dir: 'out'}
  }),

  // =========================================================================
  // DOMAIN 8: Double Lives (10)
  // =========================================================================
  mod({
    id: 'mo-80', domain: 8, title: 'Covert actor with zero overt peers',
    order: 'Shoot anyone acting in Double agent or Foreigner none of whose direct contacts appear in Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const hit = g.out(x, ['double', 'foreigner'])[0];
        if (!hit) return null;
        if (g.neighbors(x).some(n => g.hasTouch(n, 'friend'))) return null;
        return proof ? x + ': ' + g.fmt(hit) + ', no neighbor appears in Friend.' : 'ok';
      }, proof);
    }
  }),
  mod({
    id: 'mo-81', domain: 8, title: 'Overt cover hiding covert neighbors',
    order: 'Shoot anyone in Friend or Civilian who has NO covert file of their own, yet links directly to someone in Double agent AND someone in Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (!g.hasTouch(x, ['friend', 'civilian']) || g.hasTouch(x, ['double', 'foreigner'])) return null;
        const n = g.neighbors(x);
        const a = n.find(p => g.hasTouch(p, 'double'));
        const b = n.find(p => g.hasTouch(p, 'foreigner'));
        if (!a || !b) return null;
        return proof ? x + ' stays overt while linking Double agent ' + a + ' and Foreigner ' + b + '.' : 'ok';
      }, proof);
    }
  }),
  mod({
    id: 'mo-82', domain: 8, title: 'All-covert contacts, no overt cover',
    order: 'Shoot anyone appearing ONLY in Foe, Double agent, and Foreigner (at least two of those categories, with no Friend, Spy, or Civilian contact).',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const d = g.distinctRoles(x);
        if (d.size < 2) return null;
        if ([...d].some(r => !['foe', 'double', 'foreigner'].includes(r))) return null;
        return proof ? x + ' operates strictly inside ' + [...d].join(' + ') + '.' : 'ok';
      }, proof);
    }
  }),
  mod({
    id: 'mo-83', domain: 8, title: 'Three-category covert bridge',
    order: 'Shoot anyone appearing in at least THREE distinct categories including Spy AND at least one of Double agent or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const d = g.distinctRoles(x);
        if (d.size < 3 || !d.has('spy')) return null;
        if (!d.has('double') && !d.has('foreigner')) return null;
        return proof ? x + ' spans ' + d.size + ' categories linking Spy with covert activity.' : 'ok';
      }, proof);
    }
  }),
  mod({
    id: 'mo-84', domain: 8, title: 'Three-category Foe bridge',
    order: 'Shoot anyone appearing in at least THREE distinct categories including Foe — excluding anyone backed by a clean Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanFriend(g, x)) return null;
        const d = g.distinctRoles(x);
        if (d.size < 3 || !d.has('foe')) return null;
        return proof ? x + ' spans ' + d.size + ' categories including Foe without clean Friend cover.' : 'ok';
      }, proof);
    }
  }),
  mod({
    id: 'mo-85', domain: 8, title: 'Overt-in, covert-out split',
    order: 'Shoot anyone receiving contact in Friend, Spy, or Civilian AND acting in Foe, Double agent, or Foreigner — while NEVER acting in Friend or Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasOut(x, ['friend', 'civilian'])) return null;
        const i = g.in(x, ['friend', 'spy', 'civilian'])[0];
        const o = g.out(x, ['foe', 'double', 'foreigner'])[0];
        if (!i || !o) return null;
        return proof ? x + ' receives overt ' + g.fmt(i) + ' while acting covertly (' + g.fmt(o) + ').' : 'ok';
      }, proof);
    }
  }),
  mod({
    id: 'mo-86', domain: 8, title: 'Covert-in, overt-out split',
    order: 'Shoot anyone receiving contact in Foe, Double agent, or Foreigner AND acting in Friend, Spy, or Civilian — while NEVER backed by a clean Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanFriend(g, x)) return null;
        const i = g.in(x, ['foe', 'double', 'foreigner'])[0];
        const o = g.out(x, ['friend', 'spy', 'civilian'])[0];
        if (!i || !o) return null;
        return proof ? x + ' receives covert ' + g.fmt(i) + ' while acting overtly (' + g.fmt(o) + ').' : 'ok';
      }, proof);
    }
  }),
  mod({
    id: 'mo-87', domain: 8, title: 'More covert than overt files',
    order: 'Shoot anyone appearing in MORE categories among (Foe, Double agent, Foreigner) than among (Friend, Spy, Civilian) — excluding anyone backed by a Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend')) return null;
        const cov = new Set(g.touch(x, ['foe', 'double', 'foreigner']).map(e => e.role)).size;
        const ov = new Set(g.touch(x, ['friend', 'spy', 'civilian']).map(e => e.role)).size;
        if (cov <= ov || cov < 2) return null;
        return proof ? x + ' spans ' + cov + ' covert vs ' + ov + ' overt categories.' : 'ok';
      }, proof);
    }
  }),
  mod({
    id: 'mo-88', domain: 8, title: 'Dual-role Spy or Friend',
    order: 'Shoot anyone who BOTH acts AND receives contact inside (Friend, Spy, Civilian) while ALSO appearing in Foe, Double agent, or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const o = g.out(x, ['friend', 'spy', 'civilian'])[0];
        const i = g.in(x, ['friend', 'spy', 'civilian'])[0];
        const c = g.touch(x, ['foe', 'double', 'foreigner'])[0];
        if (!o || !i || !c) return null;
        return proof ? x + ': ' + g.fmt(o) + ', ' + g.fmt(i) + ', and ' + g.fmt(c) + '.' : 'ok';
      }, proof);
    }
  }),
  mod({
    id: 'mo-89', domain: 8, title: 'Dual-role covert agent',
    order: 'Shoot anyone who BOTH acts AND receives contact inside (Foe, Double agent, Foreigner) — excluding anyone shadowed by a clean Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanSpy(g, x)) return null;
        const o = g.out(x, ['foe', 'double', 'foreigner'])[0];
        const i = g.in(x, ['foe', 'double', 'foreigner'])[0];
        if (!o || !i) return null;
        return proof ? x + ': ' + g.fmt(o) + ' and ' + g.fmt(i) + ' (no clean Spy).' : 'ok';
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 9: Command & Leverage (10)
  // =========================================================================
  modAnchor({
    id: 'mo-90', domain: 9, title: '{name}’s unwatched covert cell',
    order: 'Shoot anyone reached from {name} in two forward steps through an unwatched middleman (no Spy shadow) — excluding anyone backed by a clean Friend.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out',
    midExc: {roles: ['spy'], dir: 'in'}, cleanShield: 'friend'
  }),
  modAnchor({
    id: 'mo-91', domain: 9, title: '{name}’s unbacked covert feeders',
    order: 'Shoot anyone who reaches {name} in two forward steps through an unbacked middleman (no Friend voucher) — excluding anyone shadowed by a clean Spy.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in',
    midExc: {roles: ['friend'], dir: 'in'}, cleanShield: 'spy'
  }),
  modAnchor({
    id: 'mo-92', domain: 9, title: '{name}’s timed covert relay',
    order: 'Shoot anyone linked in Foe, Double agent, or Foreigner to a direct contact of {name} AFTER that contact’s link with {name} (excluding {name}).',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['foe', 'double', 'foreigner'], step2Dir: 'any', timeOrder: 'before'
  }),
  modAnchor({
    id: 'mo-93', domain: 9, title: '{name}’s timed incoming threat',
    order: 'Shoot anyone linked in Foe, Double agent, or Foreigner to a direct contact of {name} BEFORE that contact’s link with {name} (excluding {name}).',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['foe', 'double', 'foreigner'], step2Dir: 'any', timeOrder: 'after'
  }),
  mod({
    id: 'mo-94', domain: 9, title: 'Outside {name}’s cover ring',
    order: 'Shoot anyone two contacts away from {name} (not directly linked to {name}) who appears in Foe, Double agent, or Foreigner and lacks a clean Friend voucher.',
    useAnchor: true,
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        if (hasCleanFriend(g, x) || !g.hasTouch(x, ['foe', 'double', 'foreigner'])) return null;
        const hit = matchAnchorRelay(g, anchor, x, {
          step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
          step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'any',
          excludeDirect: true
        });
        if (!hit) return null;
        return proof ? x + ': 2 hops from ' + anchor + ' via ' + hit.mid + ', covert without clean Friend.' : 'ok';
      }, proof);
    }
  }),
  mod({
    id: 'mo-95', domain: 9, title: 'Shared contact with {name}’s circle',
    order: 'Shoot anyone else who shares a direct neighbor with {name} AND appears in Double agent or Foreigner — excluding anyone shadowed by a clean Spy.',
    useAnchor: true,
    evaluate(g, anchor, proof) {
      const aN = new Set(g.neighbors(anchor));
      return collectMatches(g.people, x => {
        if (x === anchor || hasCleanSpy(g, x) || !g.hasTouch(x, ['double', 'foreigner'])) return null;
        const shared = g.neighbors(x).find(n => aN.has(n));
        if (!shared) return null;
        return proof ? x + ' shares contact ' + shared + ' with ' + anchor + ' (no clean Spy).' : 'ok';
      }, proof);
    }
  }),
  modAnchor({
    id: 'mo-96', domain: 9, title: '{name}’s shared-target rivals',
    order: 'Shoot anyone else who acts upon the same person {name} acts upon — excluding anyone backed by a clean Friend or shadowed by a Spy.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in',
    cleanShield: 'friend', exc: {roles: ['spy'], dir: 'in'}
  }),
  modAnchor({
    id: 'mo-97', domain: 9, title: '{name}’s shared-handler targets',
    order: 'Shoot anyone else acted upon by the same person who acts upon {name} — excluding anyone shadowed by a clean Spy or tipped off by a Civilian.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out',
    cleanShield: 'spy', exc: {roles: ['civilian'], dir: 'in'}
  }),
  mod({
    id: 'mo-98', domain: 9, title: 'Disconnected from {name}’s watch',
    order: 'Shoot anyone NOT directly linked to {name} who acts in Foe, Double agent, or Foreigner — excluding anyone backed by a clean Friend or shadowed by a clean Spy.',
    useAnchor: true,
    evaluate(g, anchor, proof) {
      const near = new Set([anchor, ...g.neighbors(anchor)]);
      return collectMatches(g.people, x => {
        if (near.has(x) || hasCleanFriend(g, x) || hasCleanSpy(g, x)) return null;
        const hit = g.out(x, ['foe', 'double', 'foreigner'])[0];
        if (!hit) return null;
        return proof ? x + ' (outside ' + anchor + '’s circle): ' + g.fmt(hit) + ', no clean cover.' : 'ok';
      }, proof);
    }
  }),
  mod({
    id: 'mo-99', domain: 9, title: 'Bridging {name} to covert files',
    order: 'Shoot anyone directly linked to {name} who ALSO links (either way) to someone in Double agent or Foreigner — unless shadowed by a clean Spy.',
    useAnchor: true,
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        if (x === anchor || hasCleanSpy(g, x) || !g.between(anchor, x).length) return null;
        const cov = g.neighbors(x).find(n => n !== anchor && g.hasTouch(n, ['double', 'foreigner']));
        if (!cov) return null;
        return proof ? x + ' bridges ' + anchor + ' to covert contact ' + cov + '.' : 'ok';
      }, proof);
    }
  })
];
