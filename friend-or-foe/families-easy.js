import {collectMatches} from './case-graph.js';
import {
  hasUncompromised, matchAllTimeOrder, matchAnchorRelay, matchAtom, matchCutoutBridge,
  matchDependentSupport, matchIncidentCorroboration, matchIncidentDual, matchIncidentRelay,
  matchIndependentSupport, matchRelay, matchSharedOrigin, matchSiteTaint, matchTemporal
} from './case-predicates.js';

// 100 genuinely distinct Easy intelligence cases (10 domains × 10 families).
// Guarded 2-step relays, timing + cover checks, epistemic independence/dependence, and anchor chains —
// paired with 1 disputed dispatch settled via a leak-free symmetric (= / ≠) cross-check.
// Every order matches its domain's exact operational verbs with zero "tied to" wording and zero role pooling.

function guardedCarry({id, domain, title, order, firstRoles, firstDir, secondRoles, secondDir, noReturn = true, diffRole = false, timeOrder = null, midExc = null, midReq = null, req = null, exc = null}) {
  return {
    id, tier: 'easy', domain, title, order, hint: '', useAnchor: false,
    evaluate(g, _anchor, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        if (req && !matchAtom(g, x, req).length) return null;
        const hit = matchRelay(g, x, {firstRoles, firstDir, secondRoles, secondDir, noReturn, diffRole, timeOrder, midExc, midReq});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' → ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  };
}

function guardedTime({id, domain, title, order, early, late, req = null, exc = null}) {
  return {
    id, tier: 'easy', domain, title, order, hint: '', useAnchor: false,
    evaluate(g, _anchor, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        if (req && !matchAtom(g, x, req).length) return null;
        const hit = matchTemporal(g, x, early, late);
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit[0]) + ' before ' + g.fmt(hit[1]) + '.' : 'ok';
      }, proof);
    }
  };
}

function guardedAnchor({id, domain, title, order, step1Roles, step1Dir, step2Roles, step2Dir, diffRole = false, excludeDirect = false, timeOrder = null, midExc = null, req = null, exc = null}) {
  return {
    id, tier: 'easy', domain, title, order, hint: '', useAnchor: true,
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        if (req && !matchAtom(g, x, req).length) return null;
        const hit = matchAnchorRelay(g, anchor, x, {step1Roles, step1Dir, step2Roles, step2Dir, diffRole, excludeDirect, timeOrder, midExc});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' → ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  };
}

function custom({id, domain, title, order, useAnchor = false, evaluate}) {
  return {id, tier: 'easy', domain, title, order, hint: '', useAnchor, evaluate};
}

function easyCutout({id, domain, title, order, inRoles = null, outRoles = null, sameIncident = null, timeOrder = null, diffRole = false, unconnected = null, exc = null}) {
  return custom({
    id, domain, title, order,
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        const hit = matchCutoutBridge(g, x, {inRoles, outRoles, sameIncident, timeOrder, diffRole, unconnected});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' → ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  });
}

function easySiteTaint({id, domain, title, order, roles1 = null, dir1 = 'in', roles2 = null, dir2 = 'in', sameIncident = null, timeOrder = null, exc = null}) {
  return custom({
    id, domain, title, order,
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        const hit = matchSiteTaint(g, x, {roles1, dir1, roles2, dir2, sameIncident, timeOrder});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' ← ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  });
}

function easySiteDual({id, domain, title, order, dirA = 'in', dirB = 'out', sameIncident = true, timeOrder = null, diffRole = false, exc = null}) {
  return custom({
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

function easySiteRelay({id, domain, title, order, firstDir = 'out', secondDir = 'out', sameIncident = true, timeOrder = null, diffRole = false, exc = null}) {
  return custom({
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

function easySiteCorr({id, domain, title, order, dirA = 'in', dirB = 'in', sameIncident = true, connected = true, exc = null}) {
  return custom({
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

function easyTimePriority({id, domain, title, order, rolesA = null, dirA = 'out', rolesB = null, dirB = 'in', relation = 'before_all', sameIncident = null, exc = null}) {
  return custom({
    id, domain, title, order,
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        const hit = matchAllTimeOrder(g, x, {rolesA, dirA, rolesB, dirB, relation, sameIncident});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.eA) + ' vs ' + g.fmt(hit.eB) + '.' : 'ok';
      }, proof);
    }
  });
}

function easyOrigin({id, domain, title, order, sameIncident = true, exc = null}) {
  return custom({
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

export const easyFamilies = [
  // =========================================================================
  // DOMAIN 0: Cover & Betrayal (10) — clears, targets, audits, leaks to, warns, contacts
  // =========================================================================
  easyCutout({
    id: 'ea-00', domain: 0, title: 'Same-site blind cutout',
    order: 'Take out anyone contacted on a site who reaches a third person there unconnected to their source — unless audited by a Spy.',
    sameIncident: true, unconnected: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  easySiteTaint({
    id: 'ea-01', domain: 0, title: 'Clearing an active site contact',
    order: 'Shoot anyone cleared by a Friend or warned by a Civilian whose source initiates another dispatch on that same site — unless audited by a Spy.',
    roles1: ['friend', 'civilian'], dir1: 'in', roles2: null, dir2: 'out', sameIncident: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  easyCutout({
    id: 'ea-02', domain: 0, title: 'Cross-site blind cutout',
    order: 'Drop anyone contacted on one site who reaches a third person on the other unconnected to their source — unless warned by a Civilian.',
    sameIncident: false, unconnected: true, exc: {roles: ['civilian'], dir: 'in'}
  }),
  easySiteTaint({
    id: 'ea-03', domain: 0, title: 'Reaching a contacted site mark',
    order: 'Engage anyone acting on a site toward someone already contacted on that same site — unless audited by a Spy.',
    roles1: null, dir1: 'out', roles2: null, dir2: 'in', sameIncident: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  easySiteDual({
    id: 'ea-04', domain: 0, title: 'Two-front operator',
    order: 'Eliminate anyone initiating dispatches on both sites — unless audited by a Spy.',
    dirA: 'out', dirB: 'out', sameIncident: false, exc: {roles: ['spy'], dir: 'in'}
  }),
  easySiteTaint({
    id: 'ea-05', domain: 0, title: 'Cleared by a contacted insider',
    order: 'Fire on anyone cleared by a Friend or audited by a Spy whose source was contacted on that same site — unless warned by a Civilian.',
    roles1: ['friend', 'spy'], dir1: 'in', roles2: null, dir2: 'in', sameIncident: true, exc: {roles: ['civilian'], dir: 'in'}
  }),
  custom({
    id: 'ea-06', domain: 0, title: 'No uncompromised clearance',
    order: 'Take down anyone targeted by a Foe or contacted by a Foreigner unless cleared by a Friend untouched by Double agent or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const hit = g.in(x, ['foe', 'foreigner'])[0];
        if (!hit || hasUncompromised(g, x, 'friend', ['double', 'foreigner'], 'any')) return null;
        return proof ? x + ': ' + g.fmt(hit) + ', no uncompromised Friend clearance.' : 'ok';
      }, proof);
    }
  }),
  easySiteRelay({
    id: 'ea-07', domain: 0, title: 'Same-site two-step chain',
    order: 'Neutralize anyone acting on a site toward someone who initiates another dispatch on that same site — unless audited by a Spy.',
    firstDir: 'out', secondDir: 'out', sameIncident: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  easyCutout({
    id: 'ea-08', domain: 0, title: 'Closed same-site triangle',
    order: 'Take out anyone contacted on a site who reaches a third person there already in direct contact with their source — unless audited by a Spy.',
    sameIncident: true, unconnected: false, exc: {roles: ['spy'], dir: 'in'}
  }),
  easySiteDual({
    id: 'ea-09', domain: 0, title: 'Cross-site receiver and actor',
    order: 'Shoot anyone contacted on one site who initiates a dispatch on the other site — unless cleared by a Friend.',
    dirA: 'in', dirB: 'out', sameIncident: false, exc: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 1: Surveillance & Blind Spots (10) — escorts, ambushes, shadows, leaks to, spots, signals
  // =========================================================================
  easyCutout({
    id: 'ea-10', domain: 1, title: 'Delayed cross-site cutout',
    order: 'Fire on anyone contacted on one site who later reaches a third person on the other site — unless escorted by a Friend.',
    sameIncident: false, timeOrder: 'before', exc: {roles: ['friend'], dir: 'in'}
  }),
  easySiteTaint({
    id: 'ea-11', domain: 1, title: 'Shadowed by a cross-site contact',
    order: 'Take down anyone shadowed by a Spy or escorted by a Friend whose contact was reached on the opposite site — unless spotted by a Civilian.',
    roles1: ['spy', 'friend'], dir1: 'in', roles2: null, dir2: 'in', sameIncident: false, exc: {roles: ['civilian'], dir: 'in'}
  }),
  custom({
    id: 'ea-12', domain: 1, title: 'Outside uncompromised Spy watch',
    order: 'Neutralize anyone leaking as a Double agent or signaling as a Foreigner unless shadowed by a Spy untouched by Foe or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const hit = g.out(x, ['double', 'foreigner'])[0];
        if (!hit || hasUncompromised(g, x, 'spy', ['foe', 'foreigner'], 'any')) return null;
        return proof ? x + ': ' + g.fmt(hit) + ', no uncompromised Spy shadow.' : 'ok';
      }, proof);
    }
  }),
  easySiteTaint({
    id: 'ea-13', domain: 1, title: 'Contacted on both sides of watch',
    order: 'Take out anyone contacted on one site by someone who initiates another dispatch on the other site — unless shadowed by a Spy.',
    roles1: null, dir1: 'in', roles2: null, dir2: 'out', sameIncident: false, exc: {roles: ['spy'], dir: 'in'}
  }),
  easyCutout({
    id: 'ea-14', domain: 1, title: 'Delayed same-site cutout',
    order: 'Shoot anyone contacted on a site who later reaches a third person on that same site — unless spotted by a Civilian.',
    sameIncident: true, timeOrder: 'before', exc: {roles: ['civilian'], dir: 'in'}
  }),
  custom({
    id: 'ea-15', domain: 1, title: 'Blind-spot ambush target',
    order: 'Drop anyone ambushed by a Foe or fed a Double agent’s leak from someone no Spy shadows — unless escorted by a Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend')) return null;
        const hit = g.in(x, ['foe', 'double']).find(e => !g.hasIn(e.from, 'spy'));
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit) + ' from unshadowed sender (no Friend escort).' : 'ok';
      }, proof);
    }
  }),
  easySiteTaint({
    id: 'ea-16', domain: 1, title: 'Acting into a cross-site contact',
    order: 'Engage anyone acting on one site toward someone contacted on the opposite site — unless spotted by a Civilian.',
    roles1: null, dir1: 'out', roles2: null, dir2: 'in', sameIncident: false, exc: {roles: ['civilian'], dir: 'in'}
  }),
  easySiteDual({
    id: 'ea-17', domain: 1, title: 'Same-site dual recipient',
    order: 'Eliminate anyone contacted twice on the same site in different roles — unless escorted by a Friend.',
    dirA: 'in', dirB: 'in', sameIncident: true, diffRole: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  easyCutout({
    id: 'ea-18', domain: 1, title: 'Cross-site closed triangle',
    order: 'Fire on anyone contacted on one site who reaches a third person on the other already in direct contact with their source — unless escorted by a Friend.',
    sameIncident: false, unconnected: false, exc: {roles: ['friend'], dir: 'in'}
  }),
  easySiteDual({
    id: 'ea-19', domain: 1, title: 'Same-site dual operator',
    order: 'Take down anyone initiating two dispatches in different roles on the same site — unless ambushed by a Foe.',
    dirA: 'out', dirB: 'out', sameIncident: true, diffRole: true, exc: {roles: ['foe'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 2: Foreign Contact (10) — vouches for, pressures, tracks, leaks to, reports, recruits
  // =========================================================================
  easyOrigin({
    id: 'ea-20', domain: 2, title: 'Two sources from one handler',
    order: 'Drop anyone reached by two sources who both received dispatches from the same upstream handler — unless tracked by a Spy.',
    sameIncident: false, exc: {roles: ['spy'], dir: 'in'}
  }),
  easySiteTaint({
    id: 'ea-21', domain: 2, title: 'Recruited by an active site source',
    order: 'Engage anyone recruited by a Foreigner or vouched for by a Friend whose source initiates another dispatch on that same site — unless tracked by a Spy.',
    roles1: ['foreigner', 'friend'], dir1: 'in', roles2: null, dir2: 'out', sameIncident: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  easySiteCorr({
    id: 'ea-22', domain: 2, title: 'Independent outreach across sites',
    order: 'Eliminate anyone acting toward one person on each site who have no direct contact — unless tracked by a Spy.',
    dirA: 'out', dirB: 'out', sameIncident: false, connected: false, exc: {roles: ['spy'], dir: 'in'}
  }),
  easySiteTaint({
    id: 'ea-23', domain: 2, title: 'Recruited by a same-site contact',
    order: 'Fire on anyone recruited by a Foreigner or pressured by a Foe whose source was contacted on that same site — unless reported by a Civilian.',
    roles1: ['foreigner', 'foe'], dir1: 'in', roles2: null, dir2: 'in', sameIncident: true, exc: {roles: ['civilian'], dir: 'in'}
  }),
  easySiteRelay({
    id: 'ea-24', domain: 2, title: 'Cross-site two-step handoff',
    order: 'Take down anyone acting on one site toward someone who initiates another dispatch on the opposite site — unless vouched for by a Friend.',
    firstDir: 'out', secondDir: 'out', sameIncident: false, exc: {roles: ['friend'], dir: 'in'}
  }),
  easyCutout({
    id: 'ea-25', domain: 2, title: 'Recruit bridging strangers',
    order: 'Neutralize anyone recruited by a Foreigner or tracked by a Spy who reaches a third person unconnected to their source — unless pressured by a Foe.',
    inRoles: ['foreigner', 'spy'], unconnected: true, exc: {roles: ['foe'], dir: 'in'}
  }),
  easySiteDual({
    id: 'ea-26', domain: 2, title: 'Cross-site dual target',
    order: 'Take out anyone contacted on both sites across two different roles — unless tracked by a Spy.',
    dirA: 'in', dirB: 'in', sameIncident: false, diffRole: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  easySiteTaint({
    id: 'ea-27', domain: 2, title: 'Vouched by a cross-site actor',
    order: 'Shoot anyone vouched for by a Friend or reported by a Civilian whose source acts on the opposite site — unless tracked by a Spy.',
    roles1: ['friend', 'civilian'], dir1: 'in', roles2: null, dir2: 'out', sameIncident: false, exc: {roles: ['spy'], dir: 'in'}
  }),
  easySiteCorr({
    id: 'ea-28', domain: 2, title: 'Independent pair across sites',
    order: 'Drop anyone contacted by one source on each site when those two sources have no direct contact — unless vouched for by a Friend.',
    dirA: 'in', dirB: 'in', sameIncident: false, connected: false, exc: {roles: ['friend'], dir: 'in'}
  }),
  easyCutout({
    id: 'ea-29', domain: 2, title: 'Same-site role-switching cutout',
    order: 'Engage anyone contacted on a site who reaches a third person there in a different role — unless pressured by a Foe.',
    sameIncident: true, diffRole: true, exc: {roles: ['foe'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 3: Civilian Tip-Offs (10) — confirms, targets, monitors, misleads, tips off, briefs
  // =========================================================================
  easySiteTaint({
    id: 'ea-30', domain: 3, title: 'Tipped off by a cross-site source',
    order: 'Neutralize anyone tipped off by a Civilian or confirmed by a Friend whose source was contacted on the opposite site — unless monitored by a Spy.',
    roles1: ['civilian', 'friend'], dir1: 'in', roles2: null, dir2: 'in', sameIncident: false, exc: {roles: ['spy'], dir: 'in'}
  }),
  easySiteCorr({
    id: 'ea-31', domain: 3, title: 'Independent outreach on one site',
    order: 'Take out anyone acting toward two people on the same site who have no direct contact — unless targeted by a Foe.',
    dirA: 'out', dirB: 'out', sameIncident: true, connected: false, exc: {roles: ['foe'], dir: 'in'}
  }),
  easySiteTaint({
    id: 'ea-32', domain: 3, title: 'Tipped by a same-site actor',
    order: 'Shoot anyone tipped off by a Civilian or monitored by a Spy whose source initiates another dispatch on that same site — unless confirmed by a Friend.',
    roles1: ['civilian', 'spy'], dir1: 'in', roles2: null, dir2: 'out', sameIncident: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  easySiteCorr({
    id: 'ea-33', domain: 3, title: 'Coordinated outreach on one site',
    order: 'Drop anyone acting toward two people on the same site who are themselves in direct contact — unless targeted by a Foe.',
    dirA: 'out', dirB: 'out', sameIncident: true, connected: true, exc: {roles: ['foe'], dir: 'in'}
  }),
  easyCutout({
    id: 'ea-34', domain: 3, title: 'Cross-site role-switching cutout',
    order: 'Engage anyone contacted on one site who reaches a third person on the other in a different role — unless monitored by a Spy.',
    sameIncident: false, diffRole: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  easySiteCorr({
    id: 'ea-35', domain: 3, title: 'Independent pair on one site',
    order: 'Eliminate anyone contacted by two sources on the same site who have no direct contact — unless confirmed by a Friend.',
    dirA: 'in', dirB: 'in', sameIncident: true, connected: false, exc: {roles: ['friend'], dir: 'in'}
  }),
  easySiteTaint({
    id: 'ea-36', domain: 3, title: 'Tipped off by an earlier-contacted source',
    order: 'Fire on anyone tipped off by a Civilian or misled by a Double agent after their source had already been contacted — unless briefed by a Foreigner.',
    roles1: ['civilian', 'double'], dir1: 'in', roles2: null, dir2: 'in', timeOrder: 'after', exc: {roles: ['foreigner'], dir: 'in'}
  }),
  easySiteCorr({
    id: 'ea-37', domain: 3, title: 'Cross-site coordinated outreach',
    order: 'Take down anyone acting toward one person on each site who are themselves in direct contact — unless misled by a Double agent.',
    dirA: 'out', dirB: 'out', sameIncident: false, connected: true, exc: {roles: ['double'], dir: 'in'}
  }),
  easyCutout({
    id: 'ea-38', domain: 3, title: 'Briefed cutout switching sites',
    order: 'Neutralize anyone briefed by a Foreigner or misled by a Double agent who reaches a third person on the opposite site — unless monitored by a Spy.',
    inRoles: ['foreigner', 'double'], sameIncident: false, exc: {roles: ['spy'], dir: 'in'}
  }),
  easySiteDual({
    id: 'ea-39', domain: 3, title: 'Two-front role switcher',
    order: 'Take out anyone initiating dispatches on both sites across two different roles — unless briefed by a Foreigner.',
    dirA: 'out', dirB: 'out', sameIncident: false, diffRole: true, exc: {roles: ['foreigner'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 4: Proxy Chains (10) — backs, strikes, traces, relays to, warns, hands off to
  // =========================================================================
  easyCutout({
    id: 'ea-40', domain: 4, title: 'Blind cutout in different roles',
    order: 'Eliminate anyone contacted who reaches a third person in a different role unconnected to their source — unless backed by a Friend.',
    diffRole: true, unconnected: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  easySiteTaint({
    id: 'ea-41', domain: 4, title: 'Backed by a same-site actor',
    order: 'Fire on anyone backed by a Friend or traced by a Spy whose source initiates another dispatch on that same site — unless a Double agent relays to them.',
    roles1: ['friend', 'spy'], dir1: 'in', roles2: null, dir2: 'out', sameIncident: true, exc: {roles: ['double'], dir: 'in'}
  }),
  easyCutout({
    id: 'ea-42', domain: 4, title: 'Closed triangle in different roles',
    order: 'Take down anyone contacted who reaches a third person in a different role already in direct contact with their source — unless handed off to by a Foreigner.',
    diffRole: true, unconnected: false, exc: {roles: ['foreigner'], dir: 'in'}
  }),
  easySiteRelay({
    id: 'ea-43', domain: 4, title: 'Same-site upstream chain',
    order: 'Neutralize anyone contacted on a site whose source was also contacted on that same site — unless backed by a Friend.',
    firstDir: 'in', secondDir: 'in', sameIncident: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  easySiteRelay({
    id: 'ea-44', domain: 4, title: 'Cross-site upstream chain',
    order: 'Take out anyone contacted on one site whose source was contacted on the opposite site — unless traced by a Spy.',
    firstDir: 'in', secondDir: 'in', sameIncident: false, exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-45', domain: 4, title: 'Proxy bypassing a Spy trace',
    order: 'Shoot anyone backed by a Friend or warned by a Civilian through someone no Spy traces who strikes as a Foe or hands off as a Foreigner.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'out',
    midExc: {roles: ['spy'], dir: 'in'}
  }),
  easyTimePriority({
    id: 'ea-46', domain: 4, title: 'Early same-site move before inbound',
    order: 'Drop anyone contacted on a site who initiates a dispatch earlier than every contact they receive on that same site — unless struck by a Foe.',
    dirA: 'out', dirB: 'in', relation: 'before_all', sameIncident: true, exc: {roles: ['foe'], dir: 'in'}
  }),
  easyCutout({
    id: 'ea-47', domain: 4, title: 'Warned or backed same-site cutout',
    order: 'Engage anyone warned by a Civilian or backed by a Friend who reaches a third person on that same site — unless traced by a Spy.',
    inRoles: ['civilian', 'friend'], sameIncident: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  easySiteRelay({
    id: 'ea-48', domain: 4, title: 'Same-site source acting again',
    order: 'Eliminate anyone contacted on a site whose source initiates another dispatch on that same site — unless warned by a Civilian.',
    firstDir: 'in', secondDir: 'out', sameIncident: true, exc: {roles: ['civilian'], dir: 'in'}
  }),
  easySiteRelay({
    id: 'ea-49', domain: 4, title: 'Cross-site role-switching relay',
    order: 'Fire on anyone acting on one site toward someone who acts on the other in a different role — unless traced by a Spy.',
    firstDir: 'out', secondDir: 'out', sameIncident: false, diffRole: true, exc: {roles: ['spy'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 5: Alibi & Contradiction (10) — corroborates, accuses, verifies, deceives, identifies, consults
  // =========================================================================
  custom({
    id: 'ea-50', domain: 5, title: 'Staged alibi on one site',
    order: 'Shoot anyone reached by two different sources on the same site who are themselves in direct contact.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const hit = matchIncidentCorroboration(g, x, {dirA: 'in', dirB: 'in', sameIncident: true, connected: true});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.eA) + ' & ' + g.fmt(hit.eB) + ' connected via ' + g.fmt(hit.link) + '.' : 'ok';
      }, proof);
    }
  }),
  custom({
    id: 'ea-51', domain: 5, title: 'Two independent accusers',
    order: 'Drop anyone accused by a Foe or identified by a Civilian and deceived by a Double agent or corroborated by a Friend whose two sources have no contact.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const hit = matchIndependentSupport(g, x, {roleA: ['foe', 'civilian'], dirA: 'in', roleB: ['double', 'friend'], dirB: 'in'});
        if (!hit) return null;
        return proof ? x + ': independent ' + g.fmt(hit.eA) + ' & ' + g.fmt(hit.eB) + '.' : 'ok';
      }, proof);
    }
  }),
  custom({
    id: 'ea-52', domain: 5, title: 'Cross-site colluding pair',
    order: 'Engage anyone contacted by one source on each site whose two sources are in direct contact.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const hit = matchIncidentCorroboration(g, x, {dirA: 'in', dirB: 'in', sameIncident: false, connected: true});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.eA) + ' & ' + g.fmt(hit.eB) + ' connected via ' + g.fmt(hit.link) + '.' : 'ok';
      }, proof);
    }
  }),
  custom({
    id: 'ea-53', domain: 5, title: 'Independent cover and consultation',
    order: 'Eliminate anyone corroborated by a Friend or verified by a Spy and consulted by a Foreigner or identified by a Civilian whose two sources have no contact.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const hit = matchIndependentSupport(g, x, {roleA: ['friend', 'spy'], dirA: 'in', roleB: ['foreigner', 'civilian'], dirB: 'in'});
        if (!hit) return null;
        return proof ? x + ': independent ' + g.fmt(hit.eA) + ' & ' + g.fmt(hit.eB) + '.' : 'ok';
      }, proof);
    }
  }),
  custom({
    id: 'ea-54', domain: 5, title: 'Same-site double role',
    order: 'Fire on anyone both acting and contacted on the same site across two different roles.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const hit = matchIncidentDual(g, x, {dirA: 'in', dirB: 'out', sameIncident: true, diffRole: true});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.eA) + ' & ' + g.fmt(hit.eB) + '.' : 'ok';
      }, proof);
    }
  }),
  custom({
    id: 'ea-55', domain: 5, title: 'Independent doubt on a witness',
    order: 'Take down anyone verified by a Spy or deceived by a Double agent and accused by a Foe or consulted by a Foreigner whose two sources have no contact.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const hit = matchIndependentSupport(g, x, {roleA: ['spy', 'double'], dirA: 'in', roleB: ['foe', 'foreigner'], dirB: 'in'});
        if (!hit) return null;
        return proof ? x + ': independent ' + g.fmt(hit.eA) + ' & ' + g.fmt(hit.eB) + '.' : 'ok';
      }, proof);
    }
  }),
  custom({
    id: 'ea-56', domain: 5, title: 'Double entry in one role',
    order: 'Neutralize anyone involved twice inside the same role, initiating or receiving; hold fire on anyone verified by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        for (const role of g.roles) {
          const hits = g.touch(x, role);
          if (hits.length >= 2) return proof ? x + ' appears twice in ' + role + ' (' + g.fmt(hits[0]) + '; ' + g.fmt(hits[1]) + ').' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  custom({
    id: 'ea-57', domain: 5, title: 'Shared accuser with a corroborated ally',
    order: 'Take out anyone accused by a Foe or deceived by a Double agent whose sender also reaches someone corroborated by a Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const e1 of g.in(x, ['foe', 'double'])) {
          const other = g.out(e1.from).find(e2 => e2.to !== x && g.hasIn(e2.to, 'friend'));
          if (other) return proof ? x + ': ' + g.fmt(e1) + '; sender also reaches Friend-corroborated ' + other.to + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  custom({
    id: 'ea-58', domain: 5, title: 'Conflicted verifier or accuser',
    order: 'Shoot anyone who corroborates as a Friend or accuses as a Foe while deceived by a Double agent or consulted by a Foreigner — unless verified by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        const o = g.out(x, ['friend', 'foe'])[0];
        const i = g.in(x, ['double', 'foreigner'])[0];
        if (!o || !i) return null;
        return proof ? x + ': ' + g.fmt(o) + ' while ' + g.fmt(i) + '.' : 'ok';
      }, proof);
    }
  }),
  custom({
    id: 'ea-59', domain: 5, title: 'Unidentified dual exposure',
    order: 'Drop anyone reached by at least two different senders, including a Foe or Foreigner, sparing anyone identified by a Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'civilian')) return null;
        const ins = g.in(x);
        const senders = new Set(ins.map(e => e.from));
        const key = ins.find(e => e.role === 'foe' || e.role === 'foreigner');
        if (senders.size < 2 || !key) return null;
        return proof ? x + ' reached by ' + senders.size + ' senders including ' + g.fmt(key) + '.' : 'ok';
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 6: Chronology & Timing (10) — clears, strikes, logs, leaks to, corrects, meets
  // =========================================================================
  easyTimePriority({
    id: 'ea-60', domain: 6, title: 'Acted before every incoming call',
    order: 'Take down anyone contacted who still initiates a dispatch earlier than every contact they receive — unless logged by a Spy.',
    dirA: 'out', dirB: 'in', relation: 'before_all', exc: {roles: ['spy'], dir: 'in'}
  }),
  easyTimePriority({
    id: 'ea-61', domain: 6, title: 'Acted after every incoming call',
    order: 'Neutralize anyone contacted who initiates a dispatch later than every contact they receive — unless cleared by a Friend.',
    dirA: 'out', dirB: 'in', relation: 'after_all', exc: {roles: ['friend'], dir: 'in'}
  }),
  easySiteDual({
    id: 'ea-62', domain: 6, title: 'Acted after same-site contact',
    order: 'Take out anyone who initiates a dispatch on a site after already being contacted on that same site — unless logged by a Spy.',
    dirA: 'in', dirB: 'out', sameIncident: true, timeOrder: 'before', exc: {roles: ['spy'], dir: 'in'}
  }),
  easySiteDual({
    id: 'ea-63', domain: 6, title: 'Cross-site move after inbound',
    order: 'Shoot anyone contacted on one site who later initiates a dispatch on the opposite site — unless cleared by a Friend.',
    dirA: 'in', dirB: 'out', sameIncident: false, timeOrder: 'before', exc: {roles: ['friend'], dir: 'in'}
  }),
  easySiteDual({
    id: 'ea-64', domain: 6, title: 'Acted before same-site warning',
    order: 'Drop anyone who acts on a site earlier than someone contacts them on that same site — unless logged by a Spy.',
    dirA: 'out', dirB: 'in', sameIncident: true, timeOrder: 'before', exc: {roles: ['spy'], dir: 'in'}
  }),
  easySiteRelay({
    id: 'ea-65', domain: 6, title: 'Same-site delayed handoff',
    order: 'Engage anyone acting on a site toward someone who later initiates another dispatch on that same site.',
    firstDir: 'out', secondDir: 'out', sameIncident: true, timeOrder: 'before'
  }),
  easySiteDual({
    id: 'ea-66', domain: 6, title: 'Cross-site move before inbound',
    order: 'Eliminate anyone who acts on one site earlier than someone contacts them on the other site — unless logged by a Spy.',
    dirA: 'out', dirB: 'in', sameIncident: false, timeOrder: 'before', exc: {roles: ['spy'], dir: 'in'}
  }),
  easySiteRelay({
    id: 'ea-67', domain: 6, title: 'Cross-site delayed handoff',
    order: 'Fire on anyone acting on one site toward someone who later initiates a dispatch on the other site — unless cleared by a Friend.',
    firstDir: 'out', secondDir: 'out', sameIncident: false, timeOrder: 'before', exc: {roles: ['friend'], dir: 'in'}
  }),
  easySiteRelay({
    id: 'ea-68', domain: 6, title: 'Same-site chain after prior contact',
    order: 'Take down anyone contacted on a site whose source had already been contacted earlier on that same site.',
    firstDir: 'in', secondDir: 'in', sameIncident: true, timeOrder: 'after'
  }),
  easySiteRelay({
    id: 'ea-69', domain: 6, title: 'Acted after source’s cross-site move',
    order: 'Neutralize anyone contacted on one site whose source had already initiated a dispatch on the other site.',
    firstDir: 'in', secondDir: 'out', sameIncident: false, timeOrder: 'after'
  }),

  // =========================================================================
  // DOMAIN 7: Tainted Sources (10) — alibis, coerces, vets, compromises, exposes, funds
  // =========================================================================
  easySiteTaint({
    id: 'ea-70', domain: 7, title: 'Alibi before source was reached',
    order: 'Engage anyone given a Friend’s alibi or Spy’s vetting earlier than their source was contacted — unless exposed by a Civilian.',
    roles1: ['friend', 'spy'], dir1: 'in', roles2: null, dir2: 'in', timeOrder: 'before', exc: {roles: ['civilian'], dir: 'in'}
  }),
  easySiteTaint({
    id: 'ea-71', domain: 7, title: 'Exposed before source was reached',
    order: 'Eliminate anyone exposed by a Civilian or given a Friend’s alibi earlier than their source was contacted — unless vetted by a Spy.',
    roles1: ['civilian', 'friend'], dir1: 'in', roles2: null, dir2: 'in', timeOrder: 'before', exc: {roles: ['spy'], dir: 'in'}
  }),
  easySiteTaint({
    id: 'ea-72', domain: 7, title: 'Vetted by a cross-site actor',
    order: 'Fire on anyone vetted by a Spy or exposed by a Civilian whose source acts on the opposite site — unless given a Friend’s alibi.',
    roles1: ['spy', 'civilian'], dir1: 'in', roles2: null, dir2: 'out', sameIncident: false, exc: {roles: ['friend'], dir: 'in'}
  }),
  easySiteTaint({
    id: 'ea-73', domain: 7, title: 'Coerced by an earlier-acting source',
    order: 'Take down anyone coerced by a Foe or funded by a Foreigner after their source had already initiated another dispatch — unless given a Friend’s alibi.',
    roles1: ['foe', 'foreigner'], dir1: 'in', roles2: null, dir2: 'out', timeOrder: 'after', exc: {roles: ['friend'], dir: 'in'}
  }),
  easySiteTaint({
    id: 'ea-74', domain: 7, title: 'Compromised by a same-site source',
    order: 'Neutralize anyone compromised by a Double agent or coerced by a Foe whose source was contacted on that same site — unless exposed by a Civilian.',
    roles1: ['double', 'foe'], dir1: 'in', roles2: null, dir2: 'in', sameIncident: true, exc: {roles: ['civilian'], dir: 'in'}
  }),
  easySiteTaint({
    id: 'ea-75', domain: 7, title: 'Funded by an active same-site source',
    order: 'Take out anyone funded by a Foreigner or compromised by a Double agent whose source acts again on that same site — unless vetted by a Spy.',
    roles1: ['foreigner', 'double'], dir1: 'in', roles2: null, dir2: 'out', sameIncident: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  easySiteTaint({
    id: 'ea-76', domain: 7, title: 'Alibi from an earlier-acting source',
    order: 'Shoot anyone given a Friend’s alibi or Civilian’s exposure after their source had already acted elsewhere — unless coerced by a Foe.',
    roles1: ['friend', 'civilian'], dir1: 'in', roles2: null, dir2: 'out', timeOrder: 'after', exc: {roles: ['foe'], dir: 'in'}
  }),
  easySiteTaint({
    id: 'ea-77', domain: 7, title: 'Vetted before source’s second move',
    order: 'Drop anyone vetted by a Spy or given a Friend’s alibi earlier than their source initiates another dispatch — unless coerced by a Foe.',
    roles1: ['spy', 'friend'], dir1: 'in', roles2: null, dir2: 'out', timeOrder: 'before', exc: {roles: ['foe'], dir: 'in'}
  }),
  easySiteTaint({
    id: 'ea-78', domain: 7, title: 'Exposed by an active same-site source',
    order: 'Engage anyone exposed by a Civilian or funded by a Foreigner whose source initiates another dispatch on that same site — unless vetted by a Spy.',
    roles1: ['civilian', 'foreigner'], dir1: 'in', roles2: null, dir2: 'out', sameIncident: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  easySiteTaint({
    id: 'ea-79', domain: 7, title: 'Coerced by a cross-site actor',
    order: 'Eliminate anyone coerced by a Foe or compromised by a Double agent whose source acts on the opposite site — unless given a Friend’s alibi.',
    roles1: ['foe', 'double'], dir1: 'in', roles2: null, dir2: 'out', sameIncident: false, exc: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 8: Double Lives (10) — protects, hunts, watches, leaks to, shelters, hosts
  // =========================================================================
  custom({
    id: 'ea-80', domain: 8, title: 'Protected or hunted spy-mole',
    order: 'Take out anyone protected by a Friend or hunted by a Foe who initiates contacts only as a Spy, Double agent, or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const ins = g.in(x, ['friend', 'foe']);
        const outs = g.out(x);
        if (!ins.length || !outs.length) return null;
        if (!outs.every(e => ['spy', 'double', 'foreigner'].includes(e.role))) return null;
        return proof ? x + ': receives ' + g.fmt(ins[0]) + '; operates ' + g.fmt(outs[0]) + '.' : 'ok';
      }, proof);
    }
  }),
  custom({
    id: 'ea-81', domain: 8, title: 'Unprotected double-hatted agent',
    order: 'Shoot anyone watched by a Spy, fed a Double agent’s leak, or hosted by a Foreigner who protects as a Friend, hunts as a Foe, or shelters as a Civilian, except anyone protected by a Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend')) return null;
        const i = g.in(x, ['spy', 'double', 'foreigner'])[0];
        const o = g.out(x, ['friend', 'foe', 'civilian'])[0];
        if (!i || !o) return null;
        return proof ? x + ': ' + g.fmt(i) + ' and ' + g.fmt(o) + ' (no Friend protection).' : 'ok';
      }, proof);
    }
  }),
  custom({
    id: 'ea-82', domain: 8, title: 'Pure Spy and Mole split',
    order: 'Drop anyone who initiates contacts only as a Spy or Double agent and receives only outside those two roles, or vice versa.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const outs = g.out(x);
        const ins = g.in(x);
        if (!outs.length || !ins.length) return null;
        const sd = r => r === 'spy' || r === 'double';
        const modeA = outs.every(e => sd(e.role)) && ins.every(e => !sd(e.role));
        const modeB = ins.every(e => sd(e.role)) && outs.every(e => !sd(e.role));
        if (!modeA && !modeB) return null;
        return proof ? x + ' splits Spy/Double agent (' + g.fmt(outs[0]) + ') from other roles (' + g.fmt(ins[0]) + ').' : 'ok';
      }, proof);
    }
  }),
  custom({
    id: 'ea-83', domain: 8, title: 'Civilian and Foreigner split',
    order: 'Engage anyone who initiates contacts only as a Civilian or Foreigner and receives only outside those two roles, or vice versa.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const outs = g.out(x);
        const ins = g.in(x);
        if (!outs.length || !ins.length) return null;
        const cf = r => r === 'civilian' || r === 'foreigner';
        const modeA = outs.every(e => cf(e.role)) && ins.every(e => !cf(e.role));
        const modeB = ins.every(e => cf(e.role)) && outs.every(e => !cf(e.role));
        if (!modeA && !modeB) return null;
        return proof ? x + ' splits Civilian/Foreigner from other roles (' + g.fmt(outs[0]) + '; ' + g.fmt(ins[0]) + ').' : 'ok';
      }, proof);
    }
  }),
  custom({
    id: 'ea-84', domain: 8, title: 'Friend and Foe split',
    order: 'Eliminate anyone who initiates contacts only as a Friend or Foe and receives only outside those two roles, or vice versa.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const outs = g.out(x);
        const ins = g.in(x);
        if (!outs.length || !ins.length) return null;
        const ff = r => r === 'friend' || r === 'foe';
        const modeA = outs.every(e => ff(e.role)) && ins.every(e => !ff(e.role));
        const modeB = ins.every(e => ff(e.role)) && outs.every(e => !ff(e.role));
        if (!modeA && !modeB) return null;
        return proof ? x + ' splits Friend/Foe from other roles (' + g.fmt(outs[0]) + '; ' + g.fmt(ins[0]) + ').' : 'ok';
      }, proof);
    }
  }),
  custom({
    id: 'ea-85', domain: 8, title: 'Cross-circle guest without cover',
    order: 'Fire on anyone protected by a Friend or hunted by a Foe who is also sheltered by a Civilian or hosted by a Foreigner — unless they protect as a Friend or watch as a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasOut(x, ['friend', 'spy'])) return null;
        const a = g.in(x, ['friend', 'foe'])[0];
        const b = g.in(x, ['civilian', 'foreigner'])[0];
        if (!a || !b) return null;
        return proof ? x + ': ' + g.fmt(a) + ' and ' + g.fmt(b) + '.' : 'ok';
      }, proof);
    }
  }),
  custom({
    id: 'ea-86', domain: 8, title: 'Dual-hatted operative without shelter',
    order: 'Take down anyone who watches as a Spy or leaks as a Double agent and protects as a Friend or hunts as a Foe — unless sheltered by a Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'civilian')) return null;
        const a = g.out(x, ['spy', 'double'])[0];
        const b = g.out(x, ['friend', 'foe'])[0];
        if (!a || !b) return null;
        return proof ? x + ': ' + g.fmt(a) + ' and ' + g.fmt(b) + '.' : 'ok';
      }, proof);
    }
  }),
  custom({
    id: 'ea-87', domain: 8, title: 'Unprotected hunter or host',
    order: 'Neutralize anyone who initiates contacts only as a Foe, Civilian, or Foreigner, sparing anyone watched by a Spy or protected by a Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, ['spy', 'friend'])) return null;
        const outs = g.out(x);
        if (!outs.length || !outs.every(e => ['foe', 'civilian', 'foreigner'].includes(e.role))) return null;
        return proof ? x + ' operates only in Foe/Civilian/Foreigner (' + g.fmt(outs[0]) + ') without Spy or Friend cover.' : 'ok';
      }, proof);
    }
  }),
  custom({
    id: 'ea-88', domain: 8, title: 'Three-circle protector or host',
    order: 'Take out anyone spanning three or more roles, including Friend or Civilian and Double agent or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const d = g.distinctRoles(x);
        if (d.size < 3) return null;
        if (!(d.has('friend') || d.has('civilian'))) return null;
        if (!(d.has('double') || d.has('foreigner'))) return null;
        return proof ? x + ' spans ' + d.size + ' roles bridging Friend/Civilian and Double agent/Foreigner.' : 'ok';
      }, proof);
    }
  }),
  custom({
    id: 'ea-89', domain: 8, title: 'Unwatched three-role operative',
    order: 'Shoot anyone spanning three or more roles, except anyone watched by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        const d = g.distinctRoles(x);
        if (d.size < 3) return null;
        return proof ? x + ' spans ' + d.size + ' roles with no Spy watching them.' : 'ok';
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 9: Command & Leverage (10) — vouches for, targets, shadows, leaks to, tips off, meets
  // =========================================================================
  guardedAnchor({
    id: 'ea-90', domain: 9, title: '{name}’s unwatched two-step reach',
    order: 'Fire on anyone reached from {name} in two forward steps with no direct contact to {name} — unless a Spy shadows them.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out',
    excludeDirect: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedAnchor({
    id: 'ea-91', domain: 9, title: '{name}’s unbacked two-step source',
    order: 'Take down anyone reaching {name} in two forward steps with no direct contact to {name}; stand down if a Friend vouches for them.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in',
    excludeDirect: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedAnchor({
    id: 'ea-92', domain: 9, title: 'Shared target with {name}, unbacked',
    order: 'Neutralize anyone else who reaches the same contact {name} reaches, sparing them if a Friend vouches for them.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedAnchor({
    id: 'ea-93', domain: 9, title: 'Shared contact with {name}, unwatched',
    order: 'Take out anyone else reached by the same sender who reaches {name} — unless a Spy shadows them.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedAnchor({
    id: 'ea-94', domain: 9, title: '{name}’s foreign or mole second-hop',
    order: 'Shoot anyone two contacts away from {name} with no direct contact with {name} who leaks as a Double agent or meets as a Foreigner.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'any',
    excludeDirect: true, req: {roles: ['double', 'foreigner'], dir: 'out'}
  }),
  guardedAnchor({
    id: 'ea-95', domain: 9, title: '{name}’s unshadowed cutout relay',
    order: 'Drop anyone reached from {name} in two forward steps through a cutout no Spy shadows.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out',
    midExc: {roles: ['spy'], dir: 'in'}
  }),
  guardedAnchor({
    id: 'ea-96', domain: 9, title: 'Later relay from {name}',
    order: 'Engage anyone reached from {name} in two forward steps where the second dispatch happened later, sparing them if a Friend vouches for them.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out',
    timeOrder: 'before', exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedAnchor({
    id: 'ea-97', domain: 9, title: 'Earlier relay into {name}',
    order: 'Eliminate anyone reaching {name} in two forward steps where the first dispatch happened earlier — unless a Spy shadows them.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in',
    timeOrder: 'after', exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedAnchor({
    id: 'ea-98', domain: 9, title: '{name}’s two-circle outbound chain',
    order: 'Fire on anyone reached from {name} by a Friend, Civilian, or Foreigner contact followed by a Foe, Double agent, or Spy contact in either direction.',
    step1Roles: ['friend', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['foe', 'double', 'spy'], step2Dir: 'any'
  }),
  guardedAnchor({
    id: 'ea-99', domain: 9, title: '{name}’s two-circle return chain',
    order: 'Take down anyone reached from {name} by a Foe, Double agent, or Civilian contact followed by a Friend, Spy, or Foreigner contact in either direction.',
    step1Roles: ['foe', 'double', 'civilian'], step1Dir: 'any',
    step2Roles: ['friend', 'spy', 'foreigner'], step2Dir: 'any'
  })
];
