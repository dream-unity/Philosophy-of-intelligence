import {collectMatches} from './case-graph.js';
import {
  hasCompromised, hasUncompromised, matchAllTimeOrder, matchAnchorRelay, matchAtom,
  matchCutoutBridge, matchDependentSupport, matchIncidentCorroboration, matchIncidentDual,
  matchIncidentRelay, matchIndependentSupport, matchRelay, matchSharedOrigin, matchSiteTaint, matchTemporal
} from './case-predicates.js';

// 100 genuinely distinct Hard intelligence cases (10 domains × 10 families).
// ZERO numerical scoring ("shoot the top two"), ZERO permanent safe/threat role pooling,
// crisp (15–25 word) officer-grounded briefings engaging all 6 roles via operational sites,
// chronology, provenance, cutouts, and context-relative integrity — paired with ALL 6 disputed dispatches.

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

function hardCutout({id, domain, title, order, inRoles = null, outRoles = null, sameIncident = null, timeOrder = null, diffRole = false, unconnected = null, exc = null}) {
  return hard({
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

function hardSiteTaint({id, domain, title, order, roles1 = null, dir1 = 'in', roles2 = null, dir2 = 'in', sameIncident = null, timeOrder = null, exc = null}) {
  return hard({
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

function hardTimePriority({id, domain, title, order, rolesA = null, dirA = 'out', rolesB = null, dirB = 'in', relation = 'before_all', sameIncident = null, exc = null}) {
  return hard({
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
    order: 'Burned clearance: fire on anyone cleared by a Friend or audited by a Spy who also leaks or contacts abroad — unless a Foe targets them.',
    roles: ['friend', 'spy'], taint: ['double', 'foreigner'], taintDir: 'out', exc: {roles: ['foe'], dir: 'in'}
  }),
  hardCutout({
    id: 'ha-02', domain: 0, title: 'Hidden relay cutout',
    order: 'Hidden cutout — drop anyone who receives a contact and relays it later to someone their source never contacts directly.',
    timeOrder: 'before', unconnected: true
  }),
  hardCutout({
    id: 'ha-03', domain: 0, title: 'Withdrawn clearance',
    order: 'Withdrawn clearance: neutralize anyone who acts after a Civilian warns or Friend clears them — unless a Spy audits them.',
    inRoles: ['civilian', 'friend'], timeOrder: 'before', exc: {roles: ['spy'], dir: 'in'}
  }),
  hardSiteTaint({
    id: 'ha-04', domain: 0, title: 'Compromised insider circle',
    order: 'Tainted circle: take out anyone targeted by a Foe or leaked to by a Double agent whose source was reached earlier — unless cleared by a Friend.',
    roles1: ['foe', 'double'], dir1: 'in', dir2: 'in', timeOrder: 'after', exc: {roles: ['friend'], dir: 'in'}
  }),
  hardTimePriority({
    id: 'ha-05', domain: 0, title: 'Premature move',
    order: 'Premature move: shoot anyone who initiates a contact strictly earlier than every incoming contact they receive — unless audited by a Spy.',
    dirA: 'out', dirB: 'in', relation: 'before_all', exc: {roles: ['spy'], dir: 'in'}
  }),
  hardSiteTaint({
    id: 'ha-06', domain: 0, title: 'Compromised clearance source',
    order: 'Poisoned cover — drop anyone cleared by a Friend or warned by a Civilian whose source was contacted earlier on the other site.',
    roles1: ['friend', 'civilian'], dir1: 'in', dir2: 'in', sameIncident: false, timeOrder: 'after'
  }),
  hardCutout({
    id: 'ha-07', domain: 0, title: 'Closed betrayal loop',
    order: 'Closed loop: engage anyone bridging a sender and recipient on the same site who are already in direct contact.',
    sameIncident: true, unconnected: false
  }),
  hardCutout({
    id: 'ha-08', domain: 0, title: 'Cross-site shadow relay',
    order: 'Cross-site leak — eliminate anyone who receives a contact on one site and later reaches a stranger on the other site.',
    sameIncident: false, timeOrder: 'before', unconnected: true
  }),
  hard({
    id: 'ha-09', domain: 0, title: 'Unverified clearance swap',
    order: 'Unverified swap: fire on anyone cleared by a Friend or warned by a Civilian who acts as a Foe or Foreigner — unless audited by a Spy untouched by a Double agent.',
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
  hardSiteTaint({
    id: 'ha-10', domain: 1, title: 'Watcher compromised beforehand',
    order: 'Blind-spot breach: shoot anyone shadowed by a Spy or escorted by a Friend whose contact was reached earlier — unless ambushed by a Foe.',
    roles1: ['spy', 'friend'], dir1: 'in', dir2: 'in', timeOrder: 'after', exc: {roles: ['foe'], dir: 'in'}
  }),
  hard({
    id: 'ha-11', domain: 1, title: 'False Spy cover',
    order: 'False watch: drop anyone shadowed by a Spy or spotted by a Civilian whose watcher was hit by a Foe or Foreigner — unless escorted by a Friend untouched by a Double agent.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (hasUncompromised(g, x, 'friend', ['double'], 'any')) return null;
        const w = g.in(x, ['spy', 'civilian']).find(e => g.hasIn(e.from, ['foreigner', 'foe']));
        if (!w) return null;
        return proof ? x + ' watched by compromised ' + g.fmt(w) + '.' : 'ok';
      }, proof);
    }
  }),
  hardCutout({
    id: 'ha-12', domain: 1, title: 'Unseen surveillance cutout',
    order: 'Blind-spot cutout: engage anyone bridging two people with no direct contact across different roles — unless a Spy shadows them.',
    diffRole: true, unconnected: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  hardSiteTaint({
    id: 'ha-13', domain: 1, title: 'Cross-site tail',
    order: 'Cross-site tail: eliminate anyone reaching someone on one site who is contacted later on the other site.',
    dir1: 'out', dir2: 'in', sameIncident: false, timeOrder: 'before'
  }),
  hardTimePriority({
    id: 'ha-14', domain: 1, title: 'Escort arriving last',
    order: 'Late escort: fire on anyone escorted by a Friend or shadowed by a Spy later than every other contact they receive — unless spotted by a Civilian.',
    rolesA: ['friend', 'spy'], dirA: 'in', rolesB: null, dirB: 'in', relation: 'after_all', exc: {roles: ['civilian'], dir: 'in'}
  }),
  hardSiteTaint({
    id: 'ha-15', domain: 1, title: 'Cross-site tainted witness',
    order: 'Broken watch: take down anyone contacted on one site whose source was already contacted earlier on the other site.',
    dir1: 'in', dir2: 'in', sameIncident: false, timeOrder: 'after'
  }),
  hardTimePriority({
    id: 'ha-16', domain: 1, title: 'Unwatched late move',
    order: 'Unwatched move: neutralize anyone acting strictly later than every incoming contact they receive — unless a Spy shadows them.',
    dirA: 'out', dirB: 'in', relation: 'after_all', exc: {roles: ['spy'], dir: 'in'}
  }),
  hardTimePriority({
    id: 'ha-17', domain: 1, title: 'First mover on site',
    order: 'First to break cover: take out anyone acting strictly earlier than every incoming contact on that same site.',
    dirA: 'out', dirB: 'in', relation: 'before_all', sameIncident: true
  }),
  hardSiteTaint({
    id: 'ha-18', domain: 1, title: 'Ambusher under cover',
    order: 'Shielded ambusher — shoot anyone ambushed by a Foe or signaled by a Foreigner whose source was escorted or spotted.',
    roles1: ['foe', 'foreigner'], dir1: 'in', roles2: ['friend', 'civilian'], dir2: 'in'
  }),
  hardCutout({
    id: 'ha-19', domain: 1, title: 'Cross-site closed watch',
    order: 'Staged sighting: drop anyone bridging a sender and recipient on opposite sites who are already in direct contact.',
    sameIncident: false, unconnected: false
  }),

  // =========================================================================
  // DOMAIN 2: Foreign Contact (10) — vouches for, pressures, tracks, leaks to, reports, recruits
  // =========================================================================
  hardCutout({
    id: 'ha-20', domain: 2, title: 'Cross-border cutout',
    order: 'Border broker: take down anyone relaying from one site to a stranger on the other site — unless tracked by a Spy.',
    sameIncident: false, unconnected: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  hardSiteTaint({
    id: 'ha-21', domain: 2, title: 'Tainted foreign approach',
    order: 'Tainted recruiter: neutralize anyone recruited by a Foreigner or pressured by a Foe whose source was reached earlier — unless tracked by a Spy.',
    roles1: ['foreigner', 'foe'], dir1: 'in', dir2: 'in', timeOrder: 'after', exc: {roles: ['spy'], dir: 'in'}
  }),
  hardCutout({
    id: 'ha-22', domain: 2, title: 'Activated recruit',
    order: 'Activated recruit — take out anyone recruited by a Foreigner or pressured by a Foe who later initiates a contact of their own.',
    inRoles: ['foreigner', 'foe'], timeOrder: 'before'
  }),
  hardSiteDual({
    id: 'ha-23', domain: 2, title: 'Late vouching after approach',
    order: 'Unreported approach: shoot anyone contacted on one site who is contacted later on the other site — unless tracked by a Spy.',
    dirA: 'in', dirB: 'in', sameIncident: false, timeOrder: 'before', exc: {roles: ['spy'], dir: 'in'}
  }),
  hardSiteTaint({
    id: 'ha-24', domain: 2, title: 'Foreigner backed by witness',
    order: 'Inside backing: drop anyone recruited by a Foreigner or leaked to by a Double agent whose contact is tracked or reported — unless vouched for by a Friend.',
    roles1: ['foreigner', 'double'], dir1: 'in', roles2: ['spy', 'civilian'], dir2: 'in', exc: {roles: ['friend'], dir: 'in'}
  }),
  hardCutout({
    id: 'ha-25', domain: 2, title: 'Same-site blind channel',
    order: 'Hidden channel: engage anyone passing a contact onward on the same site to someone their source never contacts.',
    sameIncident: true, unconnected: true
  }),
  hardCutout({
    id: 'ha-26', domain: 2, title: 'Pre-recruitment move',
    order: 'Early leak: eliminate anyone who initiated a contact earlier than a Foreigner recruited or Foe pressured them — unless vouched for by a Friend.',
    inRoles: ['foreigner', 'foe'], timeOrder: 'after', exc: {roles: ['friend'], dir: 'in'}
  }),
  hardSiteTaint({
    id: 'ha-27', domain: 2, title: 'Recruit turning insider',
    order: 'Turned asset: fire on anyone recruited by a Foreigner or pressured by a Foe who vouches or reports — unless tracked by a Spy.',
    roles1: ['foreigner', 'foe'], dir1: 'in', roles2: ['friend', 'civilian'], dir2: 'out', exc: {roles: ['spy'], dir: 'in'}
  }),
  hardSiteTaint({
    id: 'ha-28', domain: 2, title: 'Cross-site inside sponsor',
    order: 'Two-site sponsor — take down anyone vouched for by a Friend or tracked by a Spy whose source acts on the other site.',
    roles1: ['friend', 'spy'], dir1: 'in', dir2: 'out', sameIncident: false
  }),
  hardSiteTaint({
    id: 'ha-29', domain: 2, title: 'Delayed cross-border chain',
    order: 'Delayed border chain: neutralize anyone reaching someone on one site who was already reached earlier on the other site.',
    dir1: 'out', dir2: 'in', sameIncident: false, timeOrder: 'after'
  }),

  // =========================================================================
  // DOMAIN 3: Civilian Tip-Offs (10) — confirms, targets, monitors, misleads, tips off, briefs
  // =========================================================================
  hardCutout({
    id: 'ha-30', domain: 3, title: 'Acted after civilian tip-off',
    order: 'Withdrawn tip-off: engage anyone who initiates a contact after a Civilian tips them off or Spy monitors them — unless confirmed by a Friend.',
    inRoles: ['civilian', 'spy'], timeOrder: 'before', exc: {roles: ['friend'], dir: 'in'}
  }),
  hardSiteTaint({
    id: 'ha-31', domain: 3, title: 'Poisoned witness source',
    order: 'Poisoned witness: eliminate anyone tipped off by a Civilian or confirmed by a Friend whose source was reached earlier anywhere.',
    roles1: ['civilian', 'friend'], dir1: 'in', dir2: 'in', timeOrder: 'after'
  }),
  hardCutout({
    id: 'ha-32', domain: 3, title: 'Moved before tip-off arrived',
    order: 'Ignored warning: fire on anyone who reached a third person earlier than a Civilian tipped them off or Spy monitored them — unless confirmed by a Friend.',
    inRoles: ['civilian', 'spy'], timeOrder: 'after', exc: {roles: ['friend'], dir: 'in'}
  }),
  hardSiteTaint({
    id: 'ha-33', domain: 3, title: 'Monitor’s misled informant',
    order: 'False warning: take down anyone who monitors or tips off someone misled by a Double agent or briefed by a Foreigner — unless confirmed by a Friend.',
    roles1: ['spy', 'civilian'], dir1: 'out', roles2: ['double', 'foreigner'], dir2: 'in', exc: {roles: ['friend'], dir: 'in'}
  }),
  hardSiteTaint({
    id: 'ha-34', domain: 3, title: 'Cross-site witness echo',
    order: 'Echoed tip-off — neutralize anyone tipped off by a Civilian or monitored by a Spy whose source also acts on the other site.',
    roles1: ['civilian', 'spy'], dir1: 'in', dir2: 'out', sameIncident: false
  }),
  hardCutout({
    id: 'ha-35', domain: 3, title: 'Acted after deception',
    order: 'False brief: take out anyone who initiates a contact after a Double agent misleads or Foreigner briefs them.',
    inRoles: ['double', 'foreigner'], timeOrder: 'before'
  }),
  hardCutout({
    id: 'ha-36', domain: 3, title: 'Acted before warning',
    order: 'Ahead of the warning — shoot anyone who initiated a contact earlier than a Civilian tipped them off or Spy monitored them.',
    inRoles: ['civilian', 'spy'], timeOrder: 'after'
  }),
  hardRelay({
    id: 'ha-37', domain: 3, title: 'Informant turned attacker',
    order: 'Tainted brief: drop anyone tipped off by a Civilian or monitored by a Spy who targets as a Foe or misleads as a Double agent — unless confirmed by a Friend.',
    firstRoles: ['civilian', 'spy'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'out', exc: {roles: ['friend'], dir: 'in'}
  }),
  hardSiteTaint({
    id: 'ha-38', domain: 3, title: 'Staged same-site tip-off',
    order: 'Staged tip-off: engage anyone contacted on a site by someone who acted earlier on that same site — unless confirmed by a Friend.',
    dir1: 'in', dir2: 'out', sameIncident: true, timeOrder: 'after', exc: {roles: ['friend'], dir: 'in'}
  }),
  hardCutout({
    id: 'ha-39', domain: 3, title: 'Late confirmation',
    order: 'Too late to confirm: eliminate anyone who initiated a contact earlier than a Friend confirmed or Foreigner briefed them.',
    inRoles: ['friend', 'foreigner'], timeOrder: 'after'
  }),

  // =========================================================================
  // DOMAIN 4: Proxy Chains (10) — backs, strikes, traces, relays to, warns, hands off to
  // =========================================================================
  hardCutout({
    id: 'ha-40', domain: 4, title: 'Hidden cross-site proxy',
    order: 'Cutout exposed: take out anyone bridging an incoming and outgoing contact on opposite sites whose endpoints never meet — unless backed by a Friend.',
    sameIncident: false, unconnected: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  hardCutout({
    id: 'ha-41', domain: 4, title: 'Same-site active proxy',
    order: 'Active proxy: shoot anyone backed by a Friend or warned by a Civilian who acts later on that same site.',
    inRoles: ['friend', 'civilian'], sameIncident: true, timeOrder: 'before'
  }),
  hardCutout({
    id: 'ha-42', domain: 4, title: 'Closed proxy triangle',
    order: 'Closed proxy ring: drop anyone bridging a sender and recipient who are already in direct contact — unless traced by a Spy.',
    unconnected: false, exc: {roles: ['spy'], dir: 'in'}
  }),
  hardSiteTaint({
    id: 'ha-43', domain: 4, title: 'Cross-site proxy handoff',
    order: 'Cross-site proxy: engage anyone acting on one site whose recipient also acts on the other site — unless backed by a Friend.',
    dir1: 'out', dir2: 'out', sameIncident: false, exc: {roles: ['friend'], dir: 'in'}
  }),
  hardSiteTaint({
    id: 'ha-44', domain: 4, title: 'Proxy timing breach',
    order: 'Proxy timing: eliminate anyone contacted earlier than their own source initiated another contact — unless warned by a Civilian.',
    dir1: 'in', dir2: 'out', timeOrder: 'before', exc: {roles: ['civilian'], dir: 'in'}
  }),
  hardSiteTaint({
    id: 'ha-45', domain: 4, title: 'Upstream courier trace',
    order: 'Upstream trace: fire on anyone handed off to by a Foreigner or relayed to by a Double agent whose source was reached earlier.',
    roles1: ['foreigner', 'double'], dir1: 'in', dir2: 'in', timeOrder: 'after'
  }),
  hardRelay({
    id: 'ha-46', domain: 4, title: 'Proxy bypassing surveillance',
    order: 'Off-grid proxy — take down anyone backed by a Friend or warned by a Civilian through someone no Spy traces who strikes or hands off.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'out', midExc: {roles: ['spy'], dir: 'in'}
  }),
  hardRelay({
    id: 'ha-47', domain: 4, title: 'Reverse-timed handoff',
    order: 'Late backing: neutralize anyone who backs as a Friend or traces as a Spy someone who earlier struck or handed off — unless relayed to by a Double agent.',
    firstRoles: ['friend', 'spy'], firstDir: 'out', secondRoles: ['foe', 'foreigner'], secondDir: 'out', timeOrder: 'after', exc: {roles: ['double'], dir: 'in'}
  }),
  hardCutout({
    id: 'ha-48', domain: 4, title: 'Post-strike cross-site relay',
    order: 'Post-strike relay — take out anyone struck by a Foe or traced by a Spy who acts later on the other site.',
    inRoles: ['foe', 'spy'], sameIncident: false, timeOrder: 'before'
  }),
  hardSiteTaint({
    id: 'ha-49', domain: 4, title: 'Unwarned same-site relay',
    order: 'Unwarned proxy: shoot anyone contacted on a site by someone who also acts on that same site — unless warned by a Civilian.',
    dir1: 'in', dir2: 'out', sameIncident: true, exc: {roles: ['civilian'], dir: 'in'}
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
  hardSiteTaint({
    id: 'ha-70', domain: 7, title: 'Bought alibi on site',
    order: 'Bought alibi: neutralize anyone given a Friend’s alibi or Spy’s vetting by someone active on the same site — unless compromised by a Double agent.',
    roles1: ['friend', 'spy'], dir1: 'in', dir2: 'out', sameIncident: true, exc: {roles: ['double'], dir: 'in'}
  }),
  hardSiteTaint({
    id: 'ha-71', domain: 7, title: 'Exposed by a tainted witness',
    order: 'Tainted witness: take out anyone exposed by a Civilian or compromised by a Double agent whose source was funded or alibied — unless vetted by a Spy.',
    roles1: ['civilian', 'double'], dir1: 'in', roles2: ['foreigner', 'friend'], dir2: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),
  hardSiteTaint({
    id: 'ha-72', domain: 7, title: 'Coerced by an earlier contact',
    order: 'Coerced vetting — shoot anyone funded by a Foreigner or coerced by a Foe whose source was reached earlier on the other site.',
    roles1: ['foreigner', 'foe'], dir1: 'in', dir2: 'in', sameIncident: false, timeOrder: 'after'
  }),
  hardSiteTaint({
    id: 'ha-73', domain: 7, title: 'Compromised alibi source',
    order: 'Poisoned alibi: drop anyone exposed by a Civilian or alibied by a Friend whose source was coerced or compromised — unless vetted by a Spy.',
    roles1: ['civilian', 'friend'], dir1: 'in', roles2: ['foe', 'double'], dir2: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),
  hardSiteTaint({
    id: 'ha-74', domain: 7, title: 'Vetted after earlier taint',
    order: 'Tainted vetting: engage anyone vetted by a Spy or funded by a Foreigner whose source was reached earlier — unless exposed by a Civilian.',
    roles1: ['spy', 'foreigner'], dir1: 'in', dir2: 'in', timeOrder: 'after', exc: {roles: ['civilian'], dir: 'in'}
  }),
  hardSiteTaint({
    id: 'ha-75', domain: 7, title: 'Alibi from a vetted source',
    order: 'Dirty vetting: eliminate anyone alibied by a Friend or coerced by a Foe whose source was vetted or exposed — unless funded by a Foreigner.',
    roles1: ['friend', 'foe'], dir1: 'in', roles2: ['spy', 'civilian'], dir2: 'in', exc: {roles: ['foreigner'], dir: 'in'}
  }),
  hardCutout({
    id: 'ha-76', domain: 7, title: 'Acting after dirty funding',
    order: 'Dirty funding: fire on anyone funded by a Foreigner or compromised by a Double agent who later reaches a third person — unless vetted by a Spy.',
    inRoles: ['foreigner', 'double'], timeOrder: 'before', exc: {roles: ['spy'], dir: 'in'}
  }),
  hardSiteTaint({
    id: 'ha-77', domain: 7, title: 'Coerced witness chain',
    order: 'Pressured witness: take down anyone exposed by a Civilian or vetted by a Spy whose source was coerced or funded — unless alibied by a Friend.',
    roles1: ['civilian', 'spy'], dir1: 'in', roles2: ['foe', 'foreigner'], dir2: 'in', exc: {roles: ['friend'], dir: 'in'}
  }),
  hardTimePriority({
    id: 'ha-78', domain: 7, title: 'Unvetted cross-site move',
    order: 'Unvetted move: neutralize anyone acting on one site strictly earlier than every incoming contact on the other site — unless vetted by a Spy.',
    dirA: 'out', dirB: 'in', relation: 'before_all', sameIncident: false, exc: {roles: ['spy'], dir: 'in'}
  }),
  hardSiteTaint({
    id: 'ha-79', domain: 7, title: 'Cross-site tainted alibi',
    order: 'Cross-site cover: take out anyone alibied by a Friend or funded by a Foreigner whose source acts later on the other site.',
    roles1: ['friend', 'foreigner'], dir1: 'in', dir2: 'out', sameIncident: false, timeOrder: 'before'
  }),

  // =========================================================================
  // DOMAIN 8: Double Lives (10) — protects, hunts, watches, leaks to, shelters, hosts
  // =========================================================================
  hardSiteDual({
    id: 'ha-80', domain: 8, title: 'Two-faced operator on site',
    order: 'Two masters: eliminate anyone initiating contacts in two different roles on the same site — unless sheltered by a Civilian.',
    dirA: 'out', dirB: 'out', sameIncident: true, diffRole: true, exc: {roles: ['civilian'], dir: 'in'}
  }),
  hardSiteDual({
    id: 'ha-81', domain: 8, title: 'Active on both sites',
    order: 'Double life: fire on anyone initiating contacts on both sites — unless watched by a Spy or protected by a Friend.',
    dirA: 'out', dirB: 'out', sameIncident: false, exc: {roles: ['spy', 'friend'], dir: 'in'}
  }),
  hardCutout({
    id: 'ha-82', domain: 8, title: 'Protected then acting on site',
    order: 'Shelter breached — take down anyone protected by a Friend or sheltered by a Civilian who acts later on the other site.',
    inRoles: ['friend', 'civilian'], sameIncident: false, timeOrder: 'before'
  }),
  hardSiteDual({
    id: 'ha-83', domain: 8, title: 'Caught on both sites',
    order: 'Split allegiance: neutralize anyone contacted on both sites — unless protected by a Friend or sheltered by a Civilian.',
    dirA: 'in', dirB: 'in', sameIncident: false, exc: {roles: ['friend', 'civilian'], dir: 'in'}
  }),
  hardCutout({
    id: 'ha-84', domain: 8, title: 'Watched before acting',
    order: 'Watched operator: take out anyone watched by a Spy or hunted by a Foe who initiates a contact afterward — unless sheltered by a Civilian.',
    inRoles: ['spy', 'foe'], timeOrder: 'before', exc: {roles: ['civilian'], dir: 'in'}
  }),
  hardTimePriority({
    id: 'ha-85', domain: 8, title: 'Last mover on site',
    order: 'Late operator: shoot anyone acting strictly later than every incoming contact on that same site — unless protected by a Friend.',
    dirA: 'out', dirB: 'in', relation: 'after_all', sameIncident: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  hardSiteDual({
    id: 'ha-86', domain: 8, title: 'Cross-site late contact',
    order: 'Hunted across sites: drop anyone who acts on one site and is contacted later on the other site — unless protected by a Friend.',
    dirA: 'out', dirB: 'in', sameIncident: false, timeOrder: 'before', exc: {roles: ['friend'], dir: 'in'}
  }),
  hardCutout({
    id: 'ha-87', domain: 8, title: 'Isolated double-life broker',
    order: 'Hidden broker: engage anyone bridging two strangers on the same site — unless watched by a Spy.',
    sameIncident: true, unconnected: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  hardCutout({
    id: 'ha-88', domain: 8, title: 'Acting before hosted or hunted',
    order: 'Pre-emptive cover: eliminate anyone acting earlier than a Foreigner hosts or Foe hunts them — unless sheltered by a Civilian.',
    inRoles: ['foreigner', 'foe'], timeOrder: 'after', exc: {roles: ['civilian'], dir: 'in'}
  }),
  hard({
    id: 'ha-89', domain: 8, title: 'Three-role juggler',
    order: 'Hideout compromised: fire on anyone initiating contacts in at least two roles while contacted in a third — unless protected by a Friend.',
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
