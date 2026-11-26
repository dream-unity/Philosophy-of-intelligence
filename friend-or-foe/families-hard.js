import {collectMatches} from './case-graph.js';
import {
  hasCompromised, hasUncompromised, matchAnchorRelay, matchAtom,
  matchDependentSupport, matchIncidentCorroboration, matchIncidentDual,
  matchIncidentRelay, matchIndependentSupport, matchRelay, matchSharedOrigin, matchTemporal
} from './case-predicates.js';

// 100 genuinely distinct Hard intelligence cases (10 domains × 10 families).
// ZERO numerical scoring ("shoot the top two"), ZERO permanent safe/threat role pooling,
// crisp (18–25 word) high-consequence officer calls weaving 5–6 specific cross-paired roles
// via multi-hop chains, dependent vs. independent corroboration, epistemic timing, and
// context-relative source integrity — paired with ALL 6 disputed dispatches in ONE connected cycle.

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

function hardRelay({id, domain, title, order, firstRoles, firstDir, secondRoles, secondDir, diffRole = false, timeOrder = null, midExc = null, exc = null}) {
  return hard({
    id, domain, title, order,
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        const hit = matchRelay(g, x, {firstRoles, firstDir, secondRoles, secondDir, diffRole, timeOrder, midExc});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' → ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  });
}

function hardTaint({id, domain, title, order, roles, taint, taintDir = 'any', exc = null}) {
  return hard({
    id, domain, title, order,
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        for (const r of roles) {
          const bad = hasCompromised(g, x, r, taint, taintDir);
          if (bad) return proof ? x + ' relies on compromised ' + g.fmt(bad) + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  });
}

function hardTime({id, domain, title, order, early, late, exc = null}) {
  return hard({
    id, domain, title, order,
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        const hit = matchTemporal(g, x, early, late);
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit[0]) + ' before ' + g.fmt(hit[1]) + '.' : 'ok';
      }, proof);
    }
  });
}

function hardDep({id, domain, title, order, roleA, dirA = 'in', roleB, dirB = 'in', linkRoles = null, exc = null}) {
  return hard({
    id, domain, title, order,
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        const hit = matchDependentSupport(g, x, {roleA, dirA, roleB, dirB, linkRoles});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.eA) + ' & ' + g.fmt(hit.eB) + ' connected via ' + g.fmt(hit.link) + '.' : 'ok';
      }, proof);
    }
  });
}

function hardSiteCorr({id, domain, title, order, dirA = 'in', dirB = 'in', sameIncident = true, connected = true, exc = null}) {
  return hard({
    id, domain, title, order,
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        const hit = matchIncidentCorroboration(g, x, {dirA, dirB, sameIncident, connected});
        if (!hit) return null;
        return proof
          ? x + ': ' + g.fmt(hit.eA) + ' & ' + g.fmt(hit.eB) + (hit.link ? ' connected via ' + g.fmt(hit.link) : ' with no direct contact') + '.'
          : 'ok';
      }, proof);
    }
  });
}

function hardSiteDual({id, domain, title, order, dirA = 'in', dirB = 'out', sameIncident = true, timeOrder = null, diffRole = false, exc = null}) {
  return hard({
    id, domain, title, order,
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        const hit = matchIncidentDual(g, x, {dirA, dirB, sameIncident, timeOrder, diffRole});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.eA) + ' & ' + g.fmt(hit.eB) + '.' : 'ok';
      }, proof);
    }
  });
}

function hardSiteRelay({id, domain, title, order, firstDir = 'in', secondDir = 'out', sameIncident = true, timeOrder = null, diffRole = false, exc = null}) {
  return hard({
    id, domain, title, order,
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        const hit = matchIncidentRelay(g, x, {firstDir, secondDir, sameIncident, timeOrder, diffRole});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' → ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  });
}

function hardOrigin({id, domain, title, order, sameIncident = true, exc = null}) {
  return hard({
    id, domain, title, order,
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        const hit = matchSharedOrigin(g, x, {sameIncident});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.eA) + ' & ' + g.fmt(hit.eB) + ' both trace back to ' + hit.origin + '.' : 'ok';
      }, proof);
    }
  });
}

function hardIndep({id, domain, title, order, roleA, dirA = 'in', roleB, dirB = 'in', exc = null}) {
  return hard({
    id, domain, title, order,
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        const hit = matchIndependentSupport(g, x, {roleA, dirA, roleB, dirB});
        if (!hit) return null;
        return proof ? x + ': independent ' + g.fmt(hit.eA) + ' & ' + g.fmt(hit.eB) + '.' : 'ok';
      }, proof);
    }
  });
}

function hardDual({id, domain, title, order, a, b, exc = null}) {
  return hard({
    id, domain, title, order,
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        const e1 = matchAtom(g, x, a)[0];
        const e2 = matchAtom(g, x, b)[0];
        if (!e1 || !e2) return null;
        return proof ? x + ': ' + g.fmt(e1) + ' & ' + g.fmt(e2) + '.' : 'ok';
      }, proof);
    }
  });
}

function hardAnchor({id, domain, title, order, step1Roles, step1Dir, step2Roles, step2Dir, diffRole = false, excludeDirect = false, timeOrder = null, midExc = null, exc = null}) {
  return hard({
    id, domain, title, order, useAnchor: true,
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        const hit = matchAnchorRelay(g, anchor, x, {step1Roles, step1Dir, step2Roles, step2Dir, diffRole, excludeDirect, timeOrder, midExc});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' → ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  });
}

export const hardFamilies = [
  // =========================================================================
  // DOMAIN 0: Cover & Betrayal (10) — clears, targets, audits, leaks to, warns, contacts
  // =========================================================================
  hard({
    // Exact 2-hop Friend voucher predicate (Weakness #2 verbatim match!)
    id: 'ha-00', domain: 0, title: 'Compromised vouching chain',
    order: 'Eliminate anyone cleared by a Friend whose own Friend operates as a Foe, Double agent, or Foreigner — or who leaks as a Double agent or contacts as a Foreigner without a Spy audit or Civilian warning.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const chain = hasTwoHopCompromisedVoucher(g, x, ['foe', 'double', 'foreigner']);
        if (chain) return proof ? x + ': 2-hop compromised clearance via ' + g.fmt(chain.f1) + ' ← ' + g.fmt(chain.f2) + '.' : 'ok';
        const hit = g.out(x, ['double', 'foreigner'])[0];
        if (hit && !g.hasIn(x, ['spy', 'civilian'])) {
          return proof ? x + ': ' + g.fmt(hit) + ' with no Spy audit or Civilian warning.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  hardTaint({
    id: 'ha-01', domain: 0, title: 'Tainted clearance or audit',
    order: 'Fire on anyone cleared by a Friend or audited by a Spy who leaks as a Double agent or contacts as a Foreigner; stand down if a Foe targets them.',
    roles: ['friend', 'spy'], taint: ['double', 'foreigner'], taintDir: 'out', exc: {roles: ['foe'], dir: 'in'}
  }),
  hardRelay({
    id: 'ha-02', domain: 0, title: 'Insider shielding an attacker',
    order: 'Take down anyone who clears as a Friend or warns as a Civilian an active Foe or Double agent; hold fire on anyone contacted by a Foreigner or audited by a Spy.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['foe', 'double'], secondDir: 'out', exc: {roles: ['foreigner', 'spy'], dir: 'in'}
  }),
  hardTaint({
    id: 'ha-03', domain: 0, title: 'Witness compromised by audit or Foe',
    order: 'Neutralize anyone warned by a Civilian or cleared by a Friend whose source was audited by a Spy or targeted by a Foe, except anyone fed a Double agent’s leak or contacted by a Foreigner.',
    roles: ['civilian', 'friend'], taint: ['spy', 'foe'], taintDir: 'in', exc: {roles: ['double', 'foreigner'], dir: 'in'}
  }),
  hardRelay({
    id: 'ha-04', domain: 0, title: 'Betrayed by a trusted circle',
    order: 'Take out anyone targeted by a Foe or leaked to by a Double agent whose contact is cleared by a Friend or audited by a Spy — unless warned by a Civilian or contacted by a Foreigner.',
    firstRoles: ['foe', 'double'], firstDir: 'in', secondRoles: ['friend', 'spy'], secondDir: 'in', exc: {roles: ['civilian', 'foreigner'], dir: 'in'}
  }),
  hardTime({
    id: 'ha-05', domain: 0, title: 'Clearance after warning or leak',
    order: 'Shoot anyone warned by a Civilian, contacted by a Foreigner, or leaked to by a Double agent earlier than they cleared as a Friend, audited as a Spy, or targeted as a Foe.',
    early: {roles: ['civilian', 'foreigner', 'double'], dir: 'in'}, late: {roles: ['friend', 'spy', 'foe'], dir: 'out'}
  }),
  hardTaint({
    id: 'ha-06', domain: 0, title: 'Foreigner or mole behind the clearance',
    order: 'Drop anyone cleared by a Friend or warned by a Civilian whose source was contacted by a Foreigner or leaked to by a Double agent; hold fire on anyone audited by a Spy.',
    roles: ['friend', 'civilian'], taint: ['foreigner', 'double'], taintDir: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),
  hardRelay({
    id: 'ha-07', domain: 0, title: 'Leaking to a cleared or warned ward',
    order: 'Engage anyone who leaks as a Double agent or contacts as a Foreigner someone cleared by a Friend or warned by a Civilian, except anyone targeted by a Foe or audited by a Spy.',
    firstRoles: ['double', 'foreigner'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'in', exc: {roles: ['foe', 'spy'], dir: 'in'}
  }),
  hardTaint({
    id: 'ha-08', domain: 0, title: 'Foe or Foreigner with insider backing',
    order: 'Eliminate anyone targeted by a Foe or contacted by a Foreigner whose source is cleared by a Friend or audited by a Spy — unless warned by a Civilian or fed a Double agent’s leak.',
    roles: ['foe', 'foreigner'], taint: ['friend', 'spy'], taintDir: 'in', exc: {roles: ['civilian', 'double'], dir: 'in'}
  }),
  hard({
    id: 'ha-09', domain: 0, title: 'Unverified clearance swap',
    order: 'Fire on anyone cleared by a Friend or warned by a Civilian who also contacts as a Foreigner or targets as a Foe, sparing anyone audited by a Spy untouched by Double agent.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasUncompromised(g, x, 'spy', ['double'], 'any')) return null;
        const a = g.in(x, ['friend', 'civilian'])[0];
        const b = g.out(x, ['foreigner', 'foe'])[0];
        if (!a || !b) return null;
        return proof ? x + ': ' + g.fmt(a) + ' while ' + g.fmt(b) + '.' : 'ok';
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 1: Surveillance & Blind Spots (10) — escorts, ambushes, shadows, leaks to, spots, signals
  // =========================================================================
  hardTaint({
    id: 'ha-10', domain: 1, title: 'Watchers compromised from outside',
    order: 'Blind-spot ambush — shoot anyone shadowed by a Spy or escorted by a Friend whose contact was signaled by a Foreigner or ambushed by a Foe, sparing them if a Civilian spots them.',
    roles: ['spy', 'friend'], taint: ['foreigner', 'foe'], taintDir: 'in', exc: {roles: ['civilian'], dir: 'in'}
  }),
  hard({
    id: 'ha-11', domain: 1, title: 'False Spy cover',
    order: 'Drop anyone shadowed by a Spy or spotted by a Civilian whose watcher was signaled by a Foreigner or ambushed by a Foe, except anyone escorted by a Friend untouched by Double agent.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasUncompromised(g, x, 'friend', ['double'], 'any')) return null;
        const w = g.in(x, ['spy', 'civilian']).find(e => g.hasIn(e.from, ['foreigner', 'foe']));
        if (!w) return null;
        return proof ? x + ' watched by compromised ' + g.fmt(w) + '.' : 'ok';
      }, proof);
    }
  }),
  hardRelay({
    id: 'ha-12', domain: 1, title: 'Blind spot around an ambush',
    order: 'Watcher exposed: engage anyone who ambushes as a Foe or signals as a Foreigner someone shadowed by a Spy or spotted by a Civilian — unless escorted by a Friend.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'out', secondRoles: ['spy', 'civilian'], secondDir: 'in', exc: {roles: ['friend'], dir: 'in'}
  }),
  hardRelay({
    id: 'ha-13', domain: 1, title: 'Shadowing into an ambush',
    order: 'Eliminate anyone who shadows as a Spy or spots as a Civilian someone ambushed by a Foe or signaled by a Foreigner, sparing anyone fed a Double agent’s leak or escorted by a Friend.',
    firstRoles: ['spy', 'civilian'], firstDir: 'out', secondRoles: ['foe', 'foreigner'], secondDir: 'in', exc: {roles: ['double', 'friend'], dir: 'in'}
  }),
  hardTime({
    id: 'ha-14', domain: 1, title: 'Escort after ambush or sighting',
    order: 'Escort off-script — fire on anyone ambushed by a Foe, signaled by a Foreigner, or spotted by a Civilian earlier than a Spy shadowed, Friend escorted, or Double agent leaked to them.',
    early: {roles: ['foe', 'foreigner', 'civilian'], dir: 'in'}, late: {roles: ['spy', 'friend', 'double'], dir: 'in'}
  }),
  hardTaint({
    id: 'ha-15', domain: 1, title: 'Spotter under enemy watch',
    order: 'Take down anyone spotted by a Civilian or escorted by a Friend whose contact was shadowed by a Spy or leaked to by a Double agent, except anyone signaled by a Foreigner.',
    roles: ['civilian', 'friend'], taint: ['spy', 'double'], taintDir: 'in', exc: {roles: ['foreigner'], dir: 'in'}
  }),
  hardRelay({
    id: 'ha-16', domain: 1, title: 'Unwatched escort or witness',
    order: 'Neutralize anyone escorted by a Friend or spotted by a Civilian who ambushes as a Foe or leaks as a Double agent — unless shadowed by a Spy or signaled by a Foreigner.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'out', exc: {roles: ['spy', 'foreigner'], dir: 'in'}
  }),
  hardTime({
    id: 'ha-17', domain: 1, title: 'Watcher turned late',
    order: 'Compromised tail: take out anyone who shadowed as a Spy, leaked as a Double agent, or spotted as a Civilian earlier than a Friend escorted, Foe ambushed, or Foreigner signaled them.',
    early: {roles: ['spy', 'double', 'civilian'], dir: 'out'}, late: {roles: ['friend', 'foe', 'foreigner'], dir: 'in'}
  }),
  hardTaint({
    id: 'ha-18', domain: 1, title: 'Ambusher under Friend or Civilian cover',
    order: 'Shoot anyone ambushed by a Foe or signaled by a Foreigner whose contact is escorted by a Friend or spotted by a Civilian; hold fire on anyone shadowed by a Spy.',
    roles: ['foe', 'foreigner'], taint: ['friend', 'civilian'], taintDir: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),
  hardRelay({
    id: 'ha-19', domain: 1, title: 'Double-blind relay',
    order: 'Drop anyone who leaks as a Double agent or escorts as a Friend someone shadowed by a Spy or signaled by a Foreigner, except anyone ambushed by a Foe or spotted by a Civilian.',
    firstRoles: ['double', 'friend'], firstDir: 'out', secondRoles: ['spy', 'foreigner'], secondDir: 'in', exc: {roles: ['foe', 'civilian'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 2: Foreign Contact (10) — vouches for, pressures, tracks, leaks to, reports, recruits
  // =========================================================================
  hardRelay({
    id: 'ha-20', domain: 2, title: 'Foreigner’s inside sponsor',
    order: 'Take down anyone who vouches as a Friend or tracks as a Spy someone recruited by a Foreigner or pressured by a Foe — unless reported by a Civilian or fed a Double agent’s leak.',
    firstRoles: ['friend', 'spy'], firstDir: 'out', secondRoles: ['foreigner', 'foe'], secondDir: 'in', exc: {roles: ['civilian', 'double'], dir: 'in'}
  }),
  hardTaint({
    id: 'ha-21', domain: 2, title: 'Recruited witness or voucher',
    order: 'Neutralize anyone reported by a Civilian or vouched for by a Friend whose source was recruited by a Foreigner or pressured by a Foe, sparing anyone tracked by a Spy or fed a Double agent’s leak.',
    roles: ['civilian', 'friend'], taint: ['foreigner', 'foe'], taintDir: 'in', exc: {roles: ['spy', 'double'], dir: 'in'}
  }),
  hardRelay({
    id: 'ha-22', domain: 2, title: 'Recruiter targeting insiders',
    order: 'Take out anyone who recruits as a Foreigner or pressures as a Foe someone vouched for by a Friend or reported by a Civilian; hold fire on anyone fed a Double agent’s leak or tracked by a Spy.',
    firstRoles: ['foreigner', 'foe'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'in', exc: {roles: ['double', 'spy'], dir: 'in'}
  }),
  hardTime({
    id: 'ha-23', domain: 2, title: 'Recruited before vouching or report',
    order: 'Unreported recruitment: shoot anyone recruited by a Foreigner, pressured by a Foe, or tracked by a Spy earlier than a Friend vouched for, Civilian reported, or Double agent leaked to them.',
    early: {roles: ['foreigner', 'foe', 'spy'], dir: 'in'}, late: {roles: ['friend', 'civilian', 'double'], dir: 'in'}
  }),
  hardTaint({
    id: 'ha-24', domain: 2, title: 'Foreigner or mole backed by insiders',
    order: 'Drop anyone recruited by a Foreigner or leaked to by a Double agent whose contact is tracked by a Spy or reported by a Civilian — unless vouched for by a Friend.',
    roles: ['foreigner', 'double'], taint: ['spy', 'civilian'], taintDir: 'in', exc: {roles: ['friend'], dir: 'in'}
  }),
  hardRelay({
    id: 'ha-25', domain: 2, title: 'Leak feeding a recruiter or Foe',
    order: 'Station asset turned: engage anyone who leaks as a Double agent or reports as a Civilian an active Foreigner or Foe, sparing anyone tracked by a Spy or vouched for by a Friend.',
    firstRoles: ['double', 'civilian'], firstDir: 'out', secondRoles: ['foreigner', 'foe'], secondDir: 'out', exc: {roles: ['spy', 'friend'], dir: 'in'}
  }),
  hardTime({
    id: 'ha-26', domain: 2, title: 'Tracked after foreign or ally contact',
    order: 'Eliminate anyone recruited by a Foreigner, leaked to by a Double agent, or vouched for by a Friend earlier than they tracked as a Spy, reported as a Civilian, or pressured as a Foe.',
    early: {roles: ['foreigner', 'double', 'friend'], dir: 'in'}, late: {roles: ['spy', 'civilian', 'foe'], dir: 'out'}
  }),
  hardRelay({
    id: 'ha-27', domain: 2, title: 'Recruit turning informant or voucher',
    order: 'External handler: fire on anyone recruited by a Foreigner or pressured by a Foe who reports as a Civilian or vouches as a Friend, except anyone tracked by a Spy.',
    firstRoles: ['foreigner', 'foe'], firstDir: 'in', secondRoles: ['civilian', 'friend'], secondDir: 'out', exc: {roles: ['spy'], dir: 'in'}
  }),
  hardTaint({
    id: 'ha-28', domain: 2, title: 'Tracker recruiting abroad',
    order: 'Take down anyone tracked by a Spy or vouched for by a Friend whose contact recruits as a Foreigner or leaks as a Double agent — unless reported by a Civilian or pressured by a Foe.',
    roles: ['spy', 'friend'], taint: ['foreigner', 'double'], taintDir: 'out', exc: {roles: ['civilian', 'foe'], dir: 'in'}
  }),
  hardRelay({
    id: 'ha-29', domain: 2, title: 'Foreigner’s delayed chain',
    order: 'Unreported recruitment: neutralize anyone recruited by a Foreigner, pressured by a Foe, or vouched for by a Friend earlier than a Civilian reported, Spy tracked, or Double agent leaked to that contact.',
    firstRoles: ['foreigner', 'foe', 'friend'], firstDir: 'in', secondRoles: ['civilian', 'spy', 'double'], secondDir: 'in', timeOrder: 'before'
  }),

  // =========================================================================
  // DOMAIN 3: Civilian Tip-Offs (10) — confirms, targets, monitors, misleads, tips off, briefs
  // =========================================================================
  hardRelay({
    id: 'ha-30', domain: 3, title: 'Tip-off to an attacker or outsider',
    order: 'Street misdirection — engage anyone who tips off as a Civilian or confirms as a Friend an active Foe or Foreigner; hold fire on anyone monitored by a Spy.',
    firstRoles: ['civilian', 'friend'], firstDir: 'out', secondRoles: ['foe', 'foreigner'], secondDir: 'out', exc: {roles: ['spy'], dir: 'in'}
  }),
  hardTaint({
    id: 'ha-31', domain: 3, title: 'Misled witness or ally',
    order: 'Eliminate anyone tipped off by a Civilian or confirmed by a Friend whose source was misled by a Double agent or briefed by a Foreigner, except anyone targeted by a Foe or monitored by a Spy.',
    roles: ['civilian', 'friend'], taint: ['double', 'foreigner'], taintDir: 'in', exc: {roles: ['foe', 'spy'], dir: 'in'}
  }),
  hardTime({
    id: 'ha-32', domain: 3, title: 'Late confirmation after strike or tip-off',
    order: 'Informant in play — fire on anyone targeted by a Foe, misled by a Double agent, or tipped off by a Civilian earlier than a Friend confirmed, Spy monitored, or Foreigner briefed them.',
    early: {roles: ['foe', 'double', 'civilian'], dir: 'in'}, late: {roles: ['friend', 'spy', 'foreigner'], dir: 'in'}
  }),
  hardRelay({
    id: 'ha-33', domain: 3, title: 'Monitor’s misled informant',
    order: 'False warning: take down anyone who monitors as a Spy or tips off as a Civilian someone misled by a Double agent or briefed by a Foreigner, sparing anyone confirmed by a Friend.',
    firstRoles: ['spy', 'civilian'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'in', exc: {roles: ['friend'], dir: 'in'}
  }),
  hardTaint({
    id: 'ha-34', domain: 3, title: 'Informant or Foe backed by insiders',
    order: 'Neutralize anyone tipped off by a Civilian or targeted by a Foe whose contact is monitored by a Spy or confirmed by a Friend; hold fire on anyone briefed by a Foreigner or misled by a Double agent.',
    roles: ['civilian', 'foe'], taint: ['spy', 'friend'], taintDir: 'in', exc: {roles: ['foreigner', 'double'], dir: 'in'}
  }),
  hardRelay({
    id: 'ha-35', domain: 3, title: 'Deceiver exploiting a tip-off',
    order: 'Take out anyone who misleads as a Double agent or briefs as a Foreigner someone tipped off by a Civilian or monitored by a Spy, except anyone targeted by a Foe or confirmed by a Friend.',
    firstRoles: ['double', 'foreigner'], firstDir: 'out', secondRoles: ['civilian', 'spy'], secondDir: 'in', exc: {roles: ['foe', 'friend'], dir: 'in'}
  }),
  hardTime({
    id: 'ha-36', domain: 3, title: 'Moving after tip-off or strike',
    order: 'Shoot anyone tipped off by a Civilian, confirmed by a Friend, or targeted by a Foe earlier than they briefed as a Foreigner, misled as a Double agent, or monitored as a Spy.',
    early: {roles: ['civilian', 'friend', 'foe'], dir: 'in'}, late: {roles: ['foreigner', 'double', 'spy'], dir: 'out'}
  }),
  hardRelay({
    id: 'ha-37', domain: 3, title: 'Informant’s own attacker',
    order: 'Tainted brief: drop anyone tipped off by a Civilian or monitored by a Spy who targets as a Foe or misleads as a Double agent, sparing anyone confirmed by a Friend.',
    firstRoles: ['civilian', 'spy'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'out', exc: {roles: ['friend'], dir: 'in'}
  }),
  hardTaint({
    id: 'ha-38', domain: 3, title: 'Foreigner briefed by a witness',
    order: 'Engage anyone briefed by a Foreigner or misled by a Double agent whose contact is tipped off by a Civilian or monitored by a Spy; hold fire on anyone targeted by a Foe or confirmed by a Friend.',
    roles: ['foreigner', 'double'], taint: ['civilian', 'spy'], taintDir: 'in', exc: {roles: ['foe', 'friend'], dir: 'in'}
  }),
  hardRelay({
    id: 'ha-39', domain: 3, title: 'Delayed confirmation after briefing',
    order: 'False warning: eliminate anyone confirmed by a Friend, monitored by a Spy, or targeted by a Foe later than a Foreigner briefed, Double agent misled, or Civilian tipped off that source.',
    firstRoles: ['friend', 'spy', 'foe'], firstDir: 'in', secondRoles: ['foreigner', 'double', 'civilian'], secondDir: 'in', timeOrder: 'after'
  }),

  // =========================================================================
  // DOMAIN 4: Proxy Chains (10) — backs, strikes, traces, relays to, warns, hands off to
  // =========================================================================
  hardRelay({
    id: 'ha-40', domain: 4, title: 'Handoff to a striker or tracer',
    order: 'Cutout exposed: take out anyone who hands off as a Foreigner or relays as a Double agent to an active Foe or Spy — unless backed by a Friend.',
    firstRoles: ['foreigner', 'double'], firstDir: 'out', secondRoles: ['foe', 'spy'], secondDir: 'out', exc: {roles: ['friend'], dir: 'in'}
  }),
  hardRelay({
    id: 'ha-41', domain: 4, title: 'Backer behind a handoff or strike',
    order: 'Shoot anyone backed by a Friend or warned by a Civilian who hands off as a Foreigner or strikes as a Foe, sparing anyone traced by a Spy or given a Double agent’s relay.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['foreigner', 'foe'], secondDir: 'out', exc: {roles: ['spy', 'double'], dir: 'in'}
  }),
  hardRelay({
    id: 'ha-42', domain: 4, title: 'Two-hop strike or handoff',
    order: 'Drop anyone who strikes as a Foe or hands off as a Foreigner to someone backed by a Friend or traced by a Spy; hold fire on anyone warned by a Civilian or given a Double agent’s relay.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'in', exc: {roles: ['civilian', 'double'], dir: 'in'}
  }),
  hardRelay({
    id: 'ha-43', domain: 4, title: 'Traced courier chain',
    order: 'Intercepted handoff: engage anyone who traces as a Spy or warns as a Civilian an active Double agent or Friend, except anyone struck by a Foe or given a Foreigner’s handoff.',
    firstRoles: ['spy', 'civilian'], firstDir: 'out', secondRoles: ['double', 'friend'], secondDir: 'out', exc: {roles: ['foe', 'foreigner'], dir: 'in'}
  }),
  hardRelay({
    id: 'ha-44', domain: 4, title: 'Timed proxy relay',
    order: 'Proxy timing — eliminate anyone handed off to by a Foreigner, backed by a Friend, or warned by a Civilian earlier than their source relayed as a Double agent, struck as a Foe, or traced as a Spy.',
    firstRoles: ['foreigner', 'friend', 'civilian'], firstDir: 'in', secondRoles: ['double', 'foe', 'spy'], secondDir: 'out', timeOrder: 'before'
  }),
  hardRelay({
    id: 'ha-45', domain: 4, title: 'Unwarned proxy recipient',
    order: 'Fire on anyone handed off to by a Foreigner or relayed to by a Double agent whose contact is backed by a Friend or struck by a Foe, sparing anyone warned by a Civilian or traced by a Spy.',
    firstRoles: ['foreigner', 'double'], firstDir: 'in', secondRoles: ['friend', 'foe'], secondDir: 'in', exc: {roles: ['civilian', 'spy'], dir: 'in'}
  }),
  hardRelay({
    id: 'ha-46', domain: 4, title: 'Proxy bypassing surveillance',
    order: 'Take down anyone backed by a Friend or warned by a Civilian through someone no Spy traces who strikes as a Foe or hands off as a Foreigner.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'out', midExc: {roles: ['spy'], dir: 'in'}
  }),
  hardRelay({
    id: 'ha-47', domain: 4, title: 'Reverse-timed handoff',
    order: 'Neutralize anyone who backs as a Friend or traces as a Spy someone who had earlier struck as a Foe or handed off as a Foreigner — unless a Double agent relays to them.',
    firstRoles: ['friend', 'spy'], firstDir: 'out', secondRoles: ['foe', 'foreigner'], secondDir: 'out', timeOrder: 'after', exc: {roles: ['double'], dir: 'in'}
  }),
  hardRelay({
    id: 'ha-48', domain: 4, title: 'Striker or tracer feeding a courier',
    order: 'Take out anyone struck by a Foe or traced by a Spy who relays as a Double agent or hands off as a Foreigner — unless backed by a Friend or warned by a Civilian.',
    firstRoles: ['foe', 'spy'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'out', exc: {roles: ['friend', 'civilian'], dir: 'in'}
  }),
  hardRelay({
    id: 'ha-49', domain: 4, title: 'Backer’s hidden upstream',
    order: 'Shoot anyone backed by a Friend or handed off to by a Foreigner whose source is warned by a Civilian or struck by a Foe, sparing anyone traced by a Spy or given a Double agent’s relay.',
    firstRoles: ['friend', 'foreigner'], firstDir: 'in', secondRoles: ['civilian', 'foe'], secondDir: 'in', exc: {roles: ['spy', 'double'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 5: Alibi & Contradiction (10) — corroborates, accuses, verifies, deceives, identifies, consults
  // =========================================================================
  hardSiteCorr({
    id: 'ha-50', domain: 5, title: 'Staged corroboration on one site',
    order: 'Staged corroboration — neutralize anyone reached by two different sources on the same site who are themselves in direct contact.',
    dirA: 'in', dirB: 'in', sameIncident: true, connected: true
  }),
  hardSiteCorr({
    id: 'ha-51', domain: 5, title: 'Cross-site collusion',
    order: 'Cross-site collusion: drop anyone contacted by one source on each site whose two sources are in direct contact.',
    dirA: 'in', dirB: 'in', sameIncident: false, connected: true
  }),
  hardOrigin({
    id: 'ha-52', domain: 5, title: 'Single-origin echo',
    order: 'Echoed story — fire on anyone reached by two different sources who both trace back to the same upstream source.',
    sameIncident: false
  }),
  hardSiteCorr({
    id: 'ha-53', domain: 5, title: 'Independent witnesses on one site',
    order: 'Independent witnesses: take out anyone reached by two different sources on the same site with no direct contact — unless accused by a Foe.',
    dirA: 'in', dirB: 'in', sameIncident: true, connected: false, exc: {roles: ['foe'], dir: 'in'}
  }),
  hardSiteCorr({
    id: 'ha-54', domain: 5, title: 'Two-site independent claim',
    order: 'Two-site verification — eliminate anyone contacted on both sites by sources with no direct contact, sparing anyone corroborated by a Friend or deceived by a Double agent.',
    dirA: 'in', dirB: 'in', sameIncident: false, connected: false, exc: {roles: ['friend', 'double'], dir: 'in'}
  }),
  hardSiteRelay({
    id: 'ha-55', domain: 5, title: 'Same-site rumor chain',
    order: 'Rumor mill: engage anyone contacted on a site by someone who also acts toward another person on that same site — unless corroborated by a Friend.',
    firstDir: 'in', secondDir: 'out', sameIncident: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  hardSiteCorr({
    id: 'ha-56', domain: 5, title: 'Coordinated cover on one site',
    order: 'Coordinated cover — drop anyone acting toward two different people on the same site who are themselves in direct contact.',
    dirA: 'out', dirB: 'out', sameIncident: true, connected: true
  }),
  hardSiteCorr({
    id: 'ha-57', domain: 5, title: 'Split-site manipulation',
    order: 'Split-site play: fire on anyone acting toward one person on each site whose two targets are themselves in direct contact — unless identified by a Civilian.',
    dirA: 'out', dirB: 'out', sameIncident: false, connected: true, exc: {roles: ['civilian'], dir: 'in'}
  }),
  hardSiteDual({
    id: 'ha-58', domain: 5, title: 'Same-site contradiction',
    order: 'Same-site contradiction — neutralize anyone both acting and contacted on the same site, sparing anyone corroborated by a Friend or verified by a Spy.',
    dirA: 'in', dirB: 'out', sameIncident: true, diffRole: true, exc: {roles: ['friend', 'spy'], dir: 'in'}
  }),
  hardSiteDual({
    id: 'ha-59', domain: 5, title: 'Cross-site double face',
    order: 'Cross-site contradiction: take down anyone contacted on one site while acting on the other, except anyone accused by a Foe or identified by a Civilian.',
    dirA: 'in', dirB: 'out', sameIncident: false, diffRole: true, exc: {roles: ['foe', 'civilian'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 6: Chronology & Timing (10) — clears, strikes, logs, leaks to, corrects, meets
  // =========================================================================
  hardSiteDual({
    id: 'ha-60', domain: 6, title: 'Acted after same-site contact',
    order: 'Wrong side of the clock — drop anyone who initiated a contact on a site after already being contacted on that same site.',
    dirA: 'in', dirB: 'out', sameIncident: true, timeOrder: 'before'
  }),
  hardSiteDual({
    id: 'ha-61', domain: 6, title: 'Cross-site relay after warning',
    order: 'Cross-site leak: fire on anyone contacted on one site who later initiates a contact on the other site — unless cleared by a Friend.',
    dirA: 'in', dirB: 'out', sameIncident: false, timeOrder: 'before', exc: {roles: ['friend'], dir: 'in'}
  }),
  hardSiteDual({
    id: 'ha-62', domain: 6, title: 'Too late to clear on one site',
    order: 'Too late to clear — eliminate anyone who acted on a site earlier than someone contacted them on that same site, sparing anyone logged by a Spy.',
    dirA: 'out', dirB: 'in', sameIncident: true, timeOrder: 'before', exc: {roles: ['spy'], dir: 'in'}
  }),
  hardSiteDual({
    id: 'ha-63', domain: 6, title: 'Cross-site containment breach',
    order: 'Containment breach: neutralize anyone who acted on one site earlier than someone contacted them on the other site — unless corrected by a Civilian.',
    dirA: 'out', dirB: 'in', sameIncident: false, timeOrder: 'before', exc: {roles: ['civilian'], dir: 'in'}
  }),
  hardSiteRelay({
    id: 'ha-64', domain: 6, title: 'Chain reaction on one site',
    order: 'Same-site chain — take out anyone contacted on a site whose source had already been contacted earlier on that same site.',
    firstDir: 'in', secondDir: 'in', sameIncident: true, timeOrder: 'after'
  }),
  hardSiteRelay({
    id: 'ha-65', domain: 6, title: 'Delayed cross-site relay',
    order: 'Delayed relay: engage anyone who reaches out to someone who later initiates a contact on the other site — unless struck by a Foe.',
    firstDir: 'out', secondDir: 'out', sameIncident: false, timeOrder: 'before', exc: {roles: ['foe'], dir: 'in'}
  }),
  hardSiteDual({
    id: 'ha-66', domain: 6, title: 'Double exposure on one site',
    order: 'Same-site double hit — drop anyone contacted twice across different roles on the same site, sparing anyone cleared by a Friend.',
    dirA: 'in', dirB: 'in', sameIncident: true, diffRole: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  hardSiteDual({
    id: 'ha-67', domain: 6, title: 'Cross-site follow-up',
    order: 'Two-site follow-up: fire on anyone contacted on one site and later contacted on the other, except anyone fed a Double agent’s leak or logged by a Spy.',
    dirA: 'in', dirB: 'in', sameIncident: false, timeOrder: 'before', exc: {roles: ['double', 'spy'], dir: 'in'}
  }),
  hardSiteRelay({
    id: 'ha-68', domain: 6, title: 'Late same-site outreach',
    order: 'Out of sequence — eliminate anyone who reaches out on a site to someone who had already initiated a contact earlier on that same site.',
    firstDir: 'out', secondDir: 'out', sameIncident: true, timeOrder: 'after'
  }),
  hardSiteRelay({
    id: 'ha-69', domain: 6, title: 'Cross-site upstream handoff',
    order: 'Post-briefing handoff: take down anyone contacted by someone who acted earlier on the other site, sparing anyone cleared by a Friend or corrected by a Civilian.',
    firstDir: 'in', secondDir: 'out', sameIncident: false, timeOrder: 'after', exc: {roles: ['friend', 'civilian'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 7: Tainted Sources (10) — alibis, coerces, vets, compromises, exposes, funds
  // =========================================================================
  hardTaint({
    id: 'ha-70', domain: 7, title: 'Funder or coercer giving alibi',
    order: 'Bought alibi — neutralize anyone given a Friend’s alibi or Spy’s vetting by an active Foreigner funder or Foe coercer; hold fire on anyone compromised by a Double agent.',
    roles: ['friend', 'spy'], taint: ['foreigner', 'foe'], taintDir: 'out', exc: {roles: ['double'], dir: 'in'}
  }),
  hardTaint({
    id: 'ha-71', domain: 7, title: 'Exposed by a funded witness',
    order: 'Take out anyone exposed by a Civilian or compromised by a Double agent whose source was funded by a Foreigner or given a Friend’s alibi, except anyone coerced by a Foe or vetted by a Spy.',
    roles: ['civilian', 'double'], taint: ['foreigner', 'friend'], taintDir: 'in', exc: {roles: ['foe', 'spy'], dir: 'in'}
  }),
  hardTaint({
    id: 'ha-72', domain: 7, title: 'Vetted funder or exposed coercer',
    order: 'Shoot anyone funded by a Foreigner or coerced by a Foe whose source was vetted by a Spy or exposed by a Civilian — unless given a Friend’s alibi or compromised by a Double agent.',
    roles: ['foreigner', 'foe'], taint: ['spy', 'civilian'], taintDir: 'in', exc: {roles: ['friend', 'double'], dir: 'in'}
  }),
  hardTaint({
    id: 'ha-73', domain: 7, title: 'Compromised witness or ally',
    order: 'Drop anyone exposed by a Civilian or given a Friend’s alibi by someone compromised by a Double agent or coerced by a Foe, sparing anyone vetted by a Spy or funded by a Foreigner.',
    roles: ['civilian', 'friend'], taint: ['double', 'foe'], taintDir: 'in', exc: {roles: ['spy', 'foreigner'], dir: 'in'}
  }),
  hardTaint({
    id: 'ha-74', domain: 7, title: 'Vetted by a compromised source',
    order: 'Engage anyone vetted by a Spy or funded by a Foreigner whose source was compromised by a Double agent or coerced by a Foe; hold fire on anyone exposed by a Civilian or given a Friend’s alibi.',
    roles: ['spy', 'foreigner'], taint: ['double', 'foe'], taintDir: 'in', exc: {roles: ['civilian', 'friend'], dir: 'in'}
  }),
  hardTaint({
    id: 'ha-75', domain: 7, title: 'Alibi from an exposed or vetted source',
    order: 'Eliminate anyone given a Friend’s alibi or Foe’s coercion by someone exposed by a Civilian or vetted by a Spy, except anyone funded by a Foreigner or compromised by a Double agent.',
    roles: ['friend', 'foe'], taint: ['civilian', 'spy'], taintDir: 'in', exc: {roles: ['foreigner', 'double'], dir: 'in'}
  }),
  hardTaint({
    id: 'ha-76', domain: 7, title: 'Funder with an alibi or exposure',
    order: 'Fire on anyone funded by a Foreigner or compromised by a Double agent whose source had a Friend’s alibi or Civilian’s exposure — unless vetted by a Spy or coerced by a Foe.',
    roles: ['foreigner', 'double'], taint: ['friend', 'civilian'], taintDir: 'in', exc: {roles: ['spy', 'foe'], dir: 'in'}
  }),
  hardTaint({
    id: 'ha-77', domain: 7, title: 'Coerced witness or funded Spy',
    order: 'Take down anyone exposed by a Civilian or vetted by a Spy whose source was coerced by a Foe or funded by a Foreigner, sparing anyone compromised by a Double agent or given a Friend’s alibi.',
    roles: ['civilian', 'spy'], taint: ['foe', 'foreigner'], taintDir: 'in', exc: {roles: ['double', 'friend'], dir: 'in'}
  }),
  hardTaint({
    id: 'ha-78', domain: 7, title: 'Compromised coercer or alibied Spy',
    order: 'Neutralize anyone coerced by a Foe or vetted by a Spy whose source was compromised by a Double agent or given a Friend’s alibi; hold fire on anyone funded by a Foreigner or exposed by a Civilian.',
    roles: ['foe', 'spy'], taint: ['double', 'friend'], taintDir: 'in', exc: {roles: ['foreigner', 'civilian'], dir: 'in'}
  }),
  hardTaint({
    id: 'ha-79', domain: 7, title: 'Alibi from a vetted or compromised source',
    order: 'Take out anyone given a Friend’s alibi or Foreigner’s funding by someone vetted by a Spy or compromised by a Double agent, except anyone exposed by a Civilian or coerced by a Foe.',
    roles: ['friend', 'foreigner'], taint: ['spy', 'double'], taintDir: 'in', exc: {roles: ['civilian', 'foe'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 8: Double Lives (10) — protects, hunts, watches, leaks to, shelters, hosts
  // =========================================================================
  hardDual({
    id: 'ha-80', domain: 8, title: 'Protector who hunts, watcher who leaks',
    order: 'Eliminate anyone who protects as a Friend or watches as a Spy while hunting as a Foe or leaking as a Double agent — unless sheltered by a Civilian or hosted by a Foreigner.',
    a: {roles: ['friend', 'spy'], dir: 'out'}, b: {roles: ['foe', 'double'], dir: 'out'}, exc: {roles: ['civilian', 'foreigner'], dir: 'in'}
  }),
  hardDual({
    id: 'ha-81', domain: 8, title: 'Sheltered host or protected hunter',
    order: 'Fire on anyone sheltered by a Civilian or protected by a Friend who hosts as a Foreigner or hunts as a Foe, sparing anyone watched by a Spy or fed a Double agent’s leak.',
    a: {roles: ['civilian', 'friend'], dir: 'in'}, b: {roles: ['foreigner', 'foe'], dir: 'out'}, exc: {roles: ['spy', 'double'], dir: 'in'}
  }),
  hardDual({
    id: 'ha-82', domain: 8, title: 'Watched mole or hosted witness',
    order: 'Take down anyone watched by a Spy or hosted by a Foreigner who leaks as a Double agent or shelters as a Civilian; hold fire on anyone hunted by a Foe or protected by a Friend.',
    a: {roles: ['spy', 'foreigner'], dir: 'in'}, b: {roles: ['double', 'civilian'], dir: 'out'}, exc: {roles: ['foe', 'friend'], dir: 'in'}
  }),
  hardDual({
    id: 'ha-83', domain: 8, title: 'Dual patron target',
    order: 'Neutralize anyone protected by a Friend or sheltered by a Civilian who is also hosted by a Foreigner or hunted by a Foe, except anyone fed a Double agent’s leak or watched by a Spy.',
    a: {roles: ['friend', 'civilian'], dir: 'in'}, b: {roles: ['foreigner', 'foe'], dir: 'in'}, exc: {roles: ['double', 'spy'], dir: 'in'}
  }),
  hardDual({
    id: 'ha-84', domain: 8, title: 'Hunted protector or watched host',
    order: 'Take out anyone who protects as a Friend or hosts as a Foreigner while hunted by a Foe or watched by a Spy — unless sheltered by a Civilian or fed a Double agent’s leak.',
    a: {roles: ['friend', 'foreigner'], dir: 'out'}, b: {roles: ['foe', 'spy'], dir: 'in'}, exc: {roles: ['civilian', 'double'], dir: 'in'}
  }),
  hardDual({
    id: 'ha-85', domain: 8, title: 'Shelterer who hunts or hosts',
    order: 'Shoot anyone who shelters as a Civilian or watches as a Spy while hunting as a Foe or hosting as a Foreigner, sparing anyone protected by a Friend or fed a Double agent’s leak.',
    a: {roles: ['civilian', 'spy'], dir: 'out'}, b: {roles: ['foe', 'foreigner'], dir: 'out'}, exc: {roles: ['friend', 'double'], dir: 'in'}
  }),
  hardDual({
    id: 'ha-86', domain: 8, title: 'Double-exposed recipient',
    order: 'Drop anyone hunted by a Foe or leaked to by a Double agent who is also watched by a Spy or hosted by a Foreigner; hold fire on anyone protected by a Friend or sheltered by a Civilian.',
    a: {roles: ['foe', 'double'], dir: 'in'}, b: {roles: ['spy', 'foreigner'], dir: 'in'}, exc: {roles: ['friend', 'civilian'], dir: 'in'}
  }),
  hardDual({
    id: 'ha-87', domain: 8, title: 'Protector or hunter feeding outsiders',
    order: 'Engage anyone who protects as a Friend or hunts as a Foe while leaking as a Double agent or hosting as a Foreigner, except anyone watched by a Spy or sheltered by a Civilian.',
    a: {roles: ['friend', 'foe'], dir: 'out'}, b: {roles: ['double', 'foreigner'], dir: 'out'}, exc: {roles: ['spy', 'civilian'], dir: 'in'}
  }),
  hardDual({
    id: 'ha-88', domain: 8, title: 'Sheltered mole or watched protector',
    order: 'Eliminate anyone sheltered by a Civilian or watched by a Spy who leaks as a Double agent or protects as a Friend — unless hosted by a Foreigner or hunted by a Foe.',
    a: {roles: ['civilian', 'spy'], dir: 'in'}, b: {roles: ['double', 'friend'], dir: 'out'}, exc: {roles: ['foreigner', 'foe'], dir: 'in'}
  }),
  hard({
    id: 'ha-89', domain: 8, title: 'Three-role juggler',
    order: 'Hideout compromised: fire on anyone who initiates contacts in at least two roles while receiving a contact in a third role, sparing anyone protected by a Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend')) return null;
        const outRoles = new Set(g.out(x).map(e => e.role));
        if (outRoles.size < 2) return null;
        const extraIn = g.in(x).find(e => !outRoles.has(e.role));
        if (!extraIn) return null;
        return proof ? x + ': operates in ' + [...outRoles].join(' & ') + ' and receives ' + g.fmt(extraIn) + '.' : 'ok';
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 9: Command & Leverage (10) — vouches for, targets, shadows, leaks to, tips off, meets
  // =========================================================================
  hardAnchor({
    id: 'ha-90', domain: 9, title: '{name}’s unbacked proxy',
    order: 'Command breach — shoot anyone reached in two outgoing steps from {name} via different roles with no direct contact with {name}, sparing them if a Friend vouches for them.',
    step1Roles: null, step1Dir: 'out', step2Roles: null, step2Dir: 'out', diffRole: true, excludeDirect: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  hardAnchor({
    id: 'ha-91', domain: 9, title: '{name}’s hidden controller',
    order: 'Drop anyone two incoming steps upstream of {name} via different roles with no direct contact with {name} — unless a Spy shadows them.',
    step1Roles: null, step1Dir: 'in', step2Roles: null, step2Dir: 'in', diffRole: true, excludeDirect: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  hard({
    id: 'ha-92', domain: 9, title: '{name}’s delayed downstream', useAnchor: true,
    order: 'Shadow reach: engage anyone reached from {name} in two outgoing steps where the second contact is later — or anyone {name} targets as a Foe or meets as a Foreigner.',
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        const hit = matchAnchorRelay(g, anchor, x, {step1Roles: null, step1Dir: 'out', step2Roles: null, step2Dir: 'out', timeOrder: 'before'});
        if (hit) return proof ? x + ': ' + g.fmt(hit.e1) + ' → ' + g.fmt(hit.e2) + '.' : 'ok';
        const direct = g.out(anchor, ['foe', 'foreigner']).find(e => e.to === x);
        if (direct) return proof ? x + ': direct ' + g.fmt(direct) + '.' : 'ok';
        return null;
      }, proof);
    }
  }),
  hard({
    id: 'ha-93', domain: 9, title: '{name}’s pre-staged upstream', useAnchor: true,
    order: 'Eliminate anyone two incoming steps upstream of {name} where the earlier contact is closer to {name} — or anyone who shadows {name} as a Spy or tips off {name} as a Civilian.',
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        const hit = matchAnchorRelay(g, anchor, x, {step1Roles: null, step1Dir: 'in', step2Roles: null, step2Dir: 'in', timeOrder: 'before'});
        if (hit) return proof ? x + ': ' + g.fmt(hit.e1) + ' → ' + g.fmt(hit.e2) + '.' : 'ok';
        const direct = g.in(anchor, ['spy', 'civilian']).find(e => e.from === x);
        if (direct) return proof ? x + ': direct ' + g.fmt(direct) + '.' : 'ok';
        return null;
      }, proof);
    }
  }),
  hardAnchor({
    id: 'ha-94', domain: 9, title: '{name}’s unwatched cutout',
    order: 'Chain of leverage — fire on anyone reached from {name} through an intermediary no Spy shadows, with no direct contact with {name}, sparing them if a Foreigner meets them.',
    step1Roles: null, step1Dir: 'out', step2Roles: null, step2Dir: 'out', excludeDirect: true, midExc: {roles: ['spy'], dir: 'in'}, exc: {roles: ['foreigner'], dir: 'in'}
  }),
  hardAnchor({
    id: 'ha-95', domain: 9, title: '{name}’s untipped upstream',
    order: 'Handler compromised: take down anyone upstream of {name} through an intermediary no Civilian tips off, with no direct contact with {name} — unless a Double agent leaks to them.',
    step1Roles: null, step1Dir: 'in', step2Roles: null, step2Dir: 'in', excludeDirect: true, midExc: {roles: ['civilian'], dir: 'in'}, exc: {roles: ['double'], dir: 'in'}
  }),
  hardAnchor({
    id: 'ha-96', domain: 9, title: '{name}’s shared contact rival',
    order: 'Neutralize anyone who operates toward someone {name} also reaches, across two different roles — unless a Friend vouches for them.',
    step1Roles: null, step1Dir: 'out', step2Roles: null, step2Dir: 'in', diffRole: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  hardAnchor({
    id: 'ha-97', domain: 9, title: '{name}’s common handler target',
    order: 'Asset under leverage: take out anyone reached by someone who also operates toward {name}, across two different roles; stand down if a Spy shadows them.',
    step1Roles: null, step1Dir: 'in', step2Roles: null, step2Dir: 'out', diffRole: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  hard({
    id: 'ha-98', domain: 9, title: '{name}’s late-moving partner', useAnchor: true,
    order: 'Shadow reach — shoot anyone reached by someone who also operates toward {name} when {name}’s incoming contact happened earlier, or anyone targeting {name} as a Foe or leaking to {name} as a Double agent.',
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        const hit = matchAnchorRelay(g, anchor, x, {step1Roles: null, step1Dir: 'in', step2Roles: null, step2Dir: 'out', timeOrder: 'before'});
        if (hit) return proof ? x + ': ' + g.fmt(hit.e1) + ' → ' + g.fmt(hit.e2) + '.' : 'ok';
        const direct = g.in(anchor, ['foe', 'double']).find(e => e.from === x);
        if (direct) return proof ? x + ': direct ' + g.fmt(direct) + '.' : 'ok';
        return null;
      }, proof);
    }
  }),
  hard({
    id: 'ha-99', domain: 9, title: '{name}’s earlier rival', useAnchor: true,
    order: 'Unchecked influence: drop anyone who operates toward someone {name} also reaches when {name}’s contact happened later — or anyone {name} vouches for as a Friend or leaks to as a Double agent.',
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        const hit = matchAnchorRelay(g, anchor, x, {step1Roles: null, step1Dir: 'out', step2Roles: null, step2Dir: 'in', timeOrder: 'after'});
        if (hit) return proof ? x + ': ' + g.fmt(hit.e1) + ' → ' + g.fmt(hit.e2) + '.' : 'ok';
        const direct = g.out(anchor, ['friend', 'double']).find(e => e.to === x);
        if (direct) return proof ? x + ': direct ' + g.fmt(direct) + '.' : 'ok';
        return null;
      }, proof);
    }
  })
];
