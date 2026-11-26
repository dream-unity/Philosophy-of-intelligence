import {collectMatches} from './case-graph.js';
import {
  hasCompromised, matchAllTimeOrder, matchAnchorRelay, matchAtom,
  matchCutoutBridge, matchDependentSupport, matchIncidentCorroboration, matchIncidentDual,
  matchIncidentRelay, matchIndependentSupport, matchRelay, matchSharedOrigin, matchSiteTaint, matchTemporal
} from './case-predicates.js';

// 100 genuinely distinct Moderate intelligence cases (10 domains × 10 families).
// De-pooled, role-specific, context-relative operational judgments: every family cross-pairs
// roles dynamically (Friend+Foe, Spy+Foreigner, Civilian+Double agent, etc.) across 4–5 roles
// so NO permanent safe/threat grouping exists while every board delivers rich same-size rivals.

function mod({id, domain, title, order, useAnchor = false, evaluate}) {
  return {id, tier: 'medium', domain, title, order, hint: '', useAnchor, evaluate};
}

function modRelay({id, domain, title, order, firstRoles, firstDir, secondRoles, secondDir, diffRole = false, timeOrder = null, midExc = null, exc = null}) {
  return mod({
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

function modTime({id, domain, title, order, early, late, exc = null}) {
  return mod({
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

function modTaint({id, domain, title, order, roles, taint, taintDir = 'any', exc = null}) {
  return mod({
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

function modDep({id, domain, title, order, roleA, dirA = 'in', roleB, dirB = 'in', linkRoles = null, exc = null}) {
  return mod({
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

function modSiteCorr({id, domain, title, order, dirA = 'in', dirB = 'in', sameIncident = true, connected = true, exc = null}) {
  return mod({
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

function modSiteDual({id, domain, title, order, dirA = 'in', dirB = 'out', sameIncident = true, timeOrder = null, diffRole = false, exc = null}) {
  return mod({
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

function modSiteRelay({id, domain, title, order, firstDir = 'in', secondDir = 'out', sameIncident = true, timeOrder = null, diffRole = false, exc = null}) {
  return mod({
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

function modIndep({id, domain, title, order, roleA, dirA = 'in', roleB, dirB = 'in', exc = null}) {
  return mod({
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

function modAnchor({id, domain, title, order, step1Roles, step1Dir, step2Roles, step2Dir, diffRole = false, excludeDirect = false, timeOrder = null, midExc = null, exc = null}) {
  return mod({
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

function modDual({id, domain, title, order, a, b, exc = null}) {
  return mod({
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

function modOrigin({id, domain, title, order, sameIncident = true, exc = null}) {
  return mod({
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

function modCutout({id, domain, title, order, inRoles = null, outRoles = null, sameIncident = null, timeOrder = null, diffRole = false, unconnected = null, exc = null}) {
  return mod({
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

function modSiteTaint({id, domain, title, order, roles1 = null, dir1 = 'in', roles2 = null, dir2 = 'in', sameIncident = null, timeOrder = null, exc = null}) {
  return mod({
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

function modTimePriority({id, domain, title, order, rolesA = null, dirA = 'out', rolesB = null, dirB = 'in', relation = 'before_all', sameIncident = null, exc = null}) {
  return mod({
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

export const moderateFamilies = [
  // =========================================================================
  // DOMAIN 0: Cover & Betrayal (10) — clears, targets, audits, leaks to, warns, contacts
  // =========================================================================
  modCutout({
    id: 'mo-00', domain: 0, title: 'Same-site blind cutout',
    order: 'Cover blown: take down anyone acting as a same-site cutout between two people with no direct contact — unless cleared by a Friend.',
    sameIncident: true, unconnected: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  modCutout({
    id: 'mo-01', domain: 0, title: 'Cross-site blind cutout',
    order: 'Burned clearance: neutralize anyone acting as a cross-site cutout between two people with no direct contact — unless audited by a Spy.',
    sameIncident: false, unconnected: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-02', domain: 0, title: 'Clearance from an active site source',
    order: 'False cover: shoot anyone cleared by a Friend or warned by a Civilian whose source acts again on that same site — unless audited by a Spy.',
    roles1: ['friend', 'civilian'], dir1: 'in', roles2: null, dir2: 'out', sameIncident: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-03', domain: 0, title: 'Audited by a contacted insider',
    order: 'Insider betrayal: drop anyone cleared by a Friend or audited by a Spy whose source was contacted on that same site — unless warned by a Civilian.',
    roles1: ['friend', 'spy'], dir1: 'in', roles2: null, dir2: 'in', sameIncident: true, exc: {roles: ['civilian'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-04', domain: 0, title: 'Reaching a pressured site mark',
    order: 'Compromised vetting: engage anyone acting on a site toward someone a Foe targets or Foreigner contacts on that same site — unless cleared by a Friend.',
    roles1: null, dir1: 'out', roles2: ['foe', 'foreigner'], dir2: 'in', sameIncident: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  modTimePriority({
    id: 'mo-05', domain: 0, title: 'Acted before every incoming call',
    order: 'Station breach: eliminate anyone contacted who still initiates a dispatch earlier than every contact they receive — unless warned by a Civilian.',
    dirA: 'out', dirB: 'in', relation: 'before_all', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-06', domain: 0, title: 'Cross-site mole or outsider source',
    order: 'Take out anyone contacted on one site by someone leaking as a Double agent or contacting as a Foreigner on the other — unless audited by a Spy.',
    roles1: null, dir1: 'in', roles2: ['double', 'foreigner'], dir2: 'out', sameIncident: false, exc: {roles: ['spy'], dir: 'in'}
  }),
  modCutout({
    id: 'mo-07', domain: 0, title: 'Closed same-site triangle',
    order: 'Fire on anyone bridging two people on the same site who are already in direct contact — unless warned by a Civilian.',
    sameIncident: true, unconnected: false, exc: {roles: ['civilian'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-08', domain: 0, title: 'Late clearance after source acted',
    order: 'Delayed cover: take down anyone cleared by a Friend or audited by a Spy after their source had already acted elsewhere — unless targeted by a Foe.',
    roles1: ['friend', 'spy'], dir1: 'in', roles2: null, dir2: 'out', timeOrder: 'after', exc: {roles: ['foe'], dir: 'in'}
  }),
  modTimePriority({
    id: 'mo-09', domain: 0, title: 'Acted after every same-site contact',
    order: 'Late response: neutralize anyone contacted on a site who initiates a dispatch later than every contact they receive on that site.',
    dirA: 'out', dirB: 'in', relation: 'after_all', sameIncident: true
  }),

  // =========================================================================
  // DOMAIN 1: Surveillance & Blind Spots (10) — escorts, ambushes, shadows, leaks to, spots, signals
  // =========================================================================
  modCutout({
    id: 'mo-10', domain: 1, title: 'Delayed cross-site cutout',
    order: 'Escort off-script: engage anyone contacted on one site who later reaches a third person on the other site — unless escorted by a Friend.',
    sameIncident: false, timeOrder: 'before', exc: {roles: ['friend'], dir: 'in'}
  }),
  modCutout({
    id: 'mo-11', domain: 1, title: 'Pre-positioned same-site relay',
    order: 'Dead drop watched: eliminate anyone who reached someone on a site earlier than a third person contacted them on that same site — unless spotted by a Civilian.',
    sameIncident: true, timeOrder: 'after', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-12', domain: 1, title: 'Shadowed before watcher was reached',
    order: 'Compromised tail: fire on anyone shadowed by a Spy or escorted by a Friend earlier than their watcher was contacted — unless spotted by a Civilian.',
    roles1: ['spy', 'friend'], dir1: 'in', roles2: null, dir2: 'in', timeOrder: 'before', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-13', domain: 1, title: 'Blind-spot signal relay',
    order: 'Take down anyone signaled by a Foreigner or ambushed by a Foe whose contact initiates another dispatch on the other site — unless shadowed by a Spy.',
    roles1: ['foreigner', 'foe'], dir1: 'in', roles2: null, dir2: 'out', sameIncident: false, exc: {roles: ['spy'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-14', domain: 1, title: 'Watcher targeting a contacted mark',
    order: 'Watcher exposed: neutralize anyone acting on a site toward someone already contacted earlier on that same site — unless shadowed by a Spy.',
    roles1: null, dir1: 'out', roles2: null, dir2: 'in', sameIncident: true, timeOrder: 'after', exc: {roles: ['spy'], dir: 'in'}
  }),
  modSiteRelay({
    id: 'mo-15', domain: 1, title: 'Cross-site ambush before watch',
    order: 'Signal in the alley: take out anyone acting on one site toward someone contacted later on the other site — unless escorted by a Friend.',
    firstDir: 'out', secondDir: 'in', sameIncident: false, timeOrder: 'before', exc: {roles: ['friend'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-16', domain: 1, title: 'Watched by a cross-site mole',
    order: 'Shoot anyone shadowed by a Spy or spotted by a Civilian whose watcher was contacted on the opposite site — unless signaled by a Foreigner.',
    roles1: ['spy', 'civilian'], dir1: 'in', roles2: null, dir2: 'in', sameIncident: false, exc: {roles: ['foreigner'], dir: 'in'}
  }),
  modCutout({
    id: 'mo-17', domain: 1, title: 'Unwatched closed cross-site triangle',
    order: 'Drop anyone bridging two people across different sites who are already in direct contact — unless escorted by a Friend.',
    sameIncident: false, unconnected: false, exc: {roles: ['friend'], dir: 'in'}
  }),
  modTimePriority({
    id: 'mo-18', domain: 1, title: 'First strike on a watched site',
    order: 'Engage anyone contacted on a site who initiates a dispatch earlier than every contact they receive on that same site — unless spotted by a Civilian.',
    dirA: 'out', dirB: 'in', relation: 'before_all', sameIncident: true, exc: {roles: ['civilian'], dir: 'in'}
  }),
  modCutout({
    id: 'mo-19', domain: 1, title: 'Double-role same-site cutout',
    order: 'Compromised tail: eliminate anyone bridging two strangers on the same site across two different roles — unless shadowed by a Spy.',
    sameIncident: true, diffRole: true, unconnected: true, exc: {roles: ['spy'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 2: Foreign Contact (10) — vouches for, pressures, tracks, leaks to, reports, recruits
  // =========================================================================
  modOrigin({
    id: 'mo-20', domain: 2, title: 'Echo chamber from one handler',
    order: 'Foreign contact in play: take out anyone reached by two sources who both received dispatches from the same upstream handler — unless tracked by a Spy.',
    sameIncident: false, exc: {roles: ['spy'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-21', domain: 2, title: 'Pressuring a cross-site contact',
    order: 'Shoot anyone acting on one site toward someone already contacted on the opposite site — unless reported by a Civilian.',
    roles1: null, dir1: 'out', roles2: null, dir2: 'in', sameIncident: false, exc: {roles: ['civilian'], dir: 'in'}
  }),
  modCutout({
    id: 'mo-22', domain: 2, title: 'Recruit or mole cutout',
    order: 'Drop anyone recruited by a Foreigner or tracked by a Spy who reaches a third person with no direct contact to their source — unless vouched for by a Friend.',
    inRoles: ['foreigner', 'spy'], unconnected: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-23', domain: 2, title: 'Recruiter reaching an active insider',
    order: 'External handler: engage anyone acting on a site toward someone who initiates another dispatch on the opposite site — unless tracked by a Spy.',
    roles1: null, dir1: 'out', roles2: null, dir2: 'out', sameIncident: false, exc: {roles: ['spy'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-24', domain: 2, title: 'Recruited earlier than source’s cover',
    order: 'Border leak: eliminate anyone contacted by someone who received a dispatch later on the same site — unless vouched for by a Friend.',
    roles1: null, dir1: 'in', roles2: null, dir2: 'in', sameIncident: true, timeOrder: 'before', exc: {roles: ['friend'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-25', domain: 2, title: 'Witness reached on both fronts',
    order: 'Fire on anyone reported by a Civilian or tracked by a Spy whose source was contacted on the opposite site — unless pressured by a Foe.',
    roles1: ['civilian', 'spy'], dir1: 'in', roles2: null, dir2: 'in', sameIncident: false, exc: {roles: ['foe'], dir: 'in'}
  }),
  modCutout({
    id: 'mo-26', domain: 2, title: 'Cross-site role-switching cutout',
    order: 'Take down anyone bridging two strangers across different sites in two different roles — unless reported by a Civilian.',
    sameIncident: false, diffRole: true, unconnected: true, exc: {roles: ['civilian'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-27', domain: 2, title: 'Recruited by a same-site proxy',
    order: 'Neutralize anyone recruited by a Foreigner or tracked by a Spy whose source initiates another dispatch on that same site — unless vouched for by a Friend.',
    roles1: ['foreigner', 'spy'], dir1: 'in', roles2: null, dir2: 'out', sameIncident: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  modTimePriority({
    id: 'mo-28', domain: 2, title: 'Cross-border move before inbound',
    order: 'Cross-border breach: take out anyone contacted on one site who acts on the other earlier than every contact they receive on the first.',
    dirA: 'out', dirB: 'in', relation: 'before_all', sameIncident: false
  }),
  modSiteCorr({
    id: 'mo-29', domain: 2, title: 'Independent pair across sites',
    order: 'Shoot anyone contacted by one source on each site when those two sources have no direct contact — unless pressured by a Foe.',
    dirA: 'in', dirB: 'in', sameIncident: false, connected: false, exc: {roles: ['foe'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 3: Civilian Tip-Offs (10) — confirms, targets, monitors, misleads, tips off, briefs
  // =========================================================================
  modCutout({
    id: 'mo-30', domain: 3, title: 'Delayed same-site cutout',
    order: 'Burned tip-off: fire on anyone contacted on a site who later reaches a third person on that same site — unless confirmed by a Friend.',
    sameIncident: true, timeOrder: 'before', exc: {roles: ['friend'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-31', domain: 3, title: 'Tipped off by a cross-site source',
    order: 'Take down anyone tipped off by a Civilian or confirmed by a Friend whose source was contacted on the opposite site — unless monitored by a Spy.',
    roles1: ['civilian', 'friend'], dir1: 'in', roles2: null, dir2: 'in', sameIncident: false, exc: {roles: ['spy'], dir: 'in'}
  }),
  modSiteCorr({
    id: 'mo-32', domain: 3, title: 'Independent outreach on one site',
    order: 'Neutralize anyone acting toward two people on the same site who have no direct contact — unless targeted by a Foe.',
    dirA: 'out', dirB: 'out', sameIncident: true, connected: false, exc: {roles: ['foe'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-33', domain: 3, title: 'Contacted after source’s cross-site act',
    order: 'Take out anyone contacted on one site by someone who had earlier initiated a dispatch on the other site — unless confirmed by a Friend.',
    roles1: null, dir1: 'in', roles2: null, dir2: 'out', sameIncident: false, timeOrder: 'after', exc: {roles: ['friend'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-34', domain: 3, title: 'Late tip-off after same-site move',
    order: 'Informant in play: shoot anyone tipped off by a Civilian or confirmed by a Friend after their source had already been contacted on that site.',
    roles1: ['civilian', 'friend'], dir1: 'in', roles2: null, dir2: 'in', sameIncident: true, timeOrder: 'after'
  }),
  modCutout({
    id: 'mo-35', domain: 3, title: 'Monitored cutout to an ally',
    order: 'False warning: drop anyone monitored by a Spy or briefed by a Foreigner who reaches a third person on the same site — unless misled by a Double agent.',
    inRoles: ['spy', 'foreigner'], sameIncident: true, exc: {roles: ['double'], dir: 'in'}
  }),
  modSiteCorr({
    id: 'mo-36', domain: 3, title: 'Cross-site coordinated outreach',
    order: 'Burned tip-off: engage anyone acting toward one person on each site who are themselves in direct contact — unless briefed by a Foreigner.',
    dirA: 'out', dirB: 'out', sameIncident: false, connected: true, exc: {roles: ['foreigner'], dir: 'in'}
  }),
  modCutout({
    id: 'mo-37', domain: 3, title: 'Pre-positioned cross-site bridge',
    order: 'Eliminate anyone who reached someone on one site earlier than a third person contacted them on the other site — unless monitored by a Spy.',
    sameIncident: false, timeOrder: 'after', exc: {roles: ['spy'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-38', domain: 3, title: 'Confirmed by a misled or briefed source',
    order: 'Street misdirection: fire on anyone confirmed by a Friend or monitored by a Spy whose source was misled by a Double agent or briefed by a Foreigner — unless tipped off by a Civilian.',
    roles1: ['friend', 'spy'], dir1: 'in', roles2: ['double', 'foreigner'], dir2: 'in', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modTimePriority({
    id: 'mo-39', domain: 3, title: 'Late cross-site response',
    order: 'Tainted brief: take down anyone contacted on one site who acts on the other later than every contact they receive on the first — unless confirmed by a Friend.',
    dirA: 'out', dirB: 'in', relation: 'after_all', sameIncident: false, exc: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 4: Proxy Chains (10) — backs, strikes, traces, relays to, warns, hands off to
  // =========================================================================
  modSiteRelay({
    id: 'mo-40', domain: 4, title: 'Same-site two-step handoff',
    order: 'Proxy breach: drop anyone acting on a site toward someone who initiates another dispatch on that same site — unless backed by a Friend.',
    firstDir: 'out', secondDir: 'out', sameIncident: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  modSiteRelay({
    id: 'mo-41', domain: 4, title: 'Cross-site relay into a backed mark',
    order: 'Engage anyone acting on one site toward someone who initiates a dispatch on the other site in a different role — unless warned by a Civilian.',
    firstDir: 'out', secondDir: 'out', sameIncident: false, diffRole: true, exc: {roles: ['civilian'], dir: 'in'}
  }),
  modCutout({
    id: 'mo-42', domain: 4, title: 'Traced courier switching sites',
    order: 'Eliminate anyone traced by a Spy or warned by a Civilian who reaches a third person on the opposite site — unless backed by a Friend.',
    inRoles: ['spy', 'civilian'], sameIncident: false, exc: {roles: ['friend'], dir: 'in'}
  }),
  modSiteRelay({
    id: 'mo-43', domain: 4, title: 'Same-site delayed handoff',
    order: 'Fire on anyone acting on a site toward someone who later initiates another dispatch on that same site — unless warned by a Civilian.',
    firstDir: 'out', secondDir: 'out', sameIncident: true, timeOrder: 'before', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-44', domain: 4, title: 'Backer behind an active tracer',
    order: 'Rogue relay: take down anyone backed by a Friend or handed off to by a Foreigner whose source initiates a same-site dispatch — unless struck by a Foe.',
    roles1: ['friend', 'foreigner'], dir1: 'in', roles2: null, dir2: 'out', sameIncident: true, exc: {roles: ['foe'], dir: 'in'}
  }),
  modCutout({
    id: 'mo-45', domain: 4, title: 'Warned or backed blind relay',
    order: 'Intercepted handoff: neutralize anyone warned by a Civilian or backed by a Friend who reaches a third person unconnected to their source — unless traced by a Spy.',
    inRoles: ['civilian', 'friend'], unconnected: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-46', domain: 4, title: 'Upstream chain across sites',
    order: 'Take out anyone contacted on one site by someone who was contacted earlier on the opposite site — unless warned by a Civilian.',
    roles1: null, dir1: 'in', roles2: null, dir2: 'in', sameIncident: false, timeOrder: 'after', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-47', domain: 4, title: 'Striker’s same-site upstream',
    order: 'Shoot anyone struck by a Foe or handed off to by a Foreigner whose source was contacted on that same site — unless a Double agent relays to them.',
    roles1: ['foe', 'foreigner'], dir1: 'in', roles2: null, dir2: 'in', sameIncident: true, exc: {roles: ['double'], dir: 'in'}
  }),
  modSiteRelay({
    id: 'mo-48', domain: 4, title: 'Handoff after same-site warning',
    order: 'Cutout exposed: drop anyone acting on a site toward someone who had earlier initiated a dispatch on that same site.',
    firstDir: 'out', secondDir: 'out', sameIncident: true, timeOrder: 'after'
  }),
  modSiteTaint({
    id: 'mo-49', domain: 4, title: 'Early same-site reach into a mark',
    order: 'Engage anyone acting on a site toward someone who is contacted later on that same site — unless warned by a Civilian.',
    roles1: null, dir1: 'out', roles2: null, dir2: 'in', sameIncident: true, timeOrder: 'before', exc: {roles: ['civilian'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 5: Alibi & Contradiction (10) — corroborates, accuses, verifies, deceives, identifies, consults
  // =========================================================================
  modSiteCorr({
    id: 'mo-50', domain: 5, title: 'Staged corroboration on one site',
    order: 'Staged alibi — neutralize anyone reached by two different sources on the same site who are themselves in direct contact.',
    dirA: 'in', dirB: 'in', sameIncident: true, connected: true
  }),
  modSiteCorr({
    id: 'mo-51', domain: 5, title: 'Cross-site colluding sources',
    order: 'False verification: take out anyone contacted by one source on each site whose two sources are in direct contact — unless accused by a Foe.',
    dirA: 'in', dirB: 'in', sameIncident: false, connected: true, exc: {roles: ['foe'], dir: 'in'}
  }),
  modIndep({
    id: 'mo-52', domain: 5, title: 'Independent accusation and cover',
    order: 'Shoot anyone corroborated by a Friend or identified by a Civilian and accused by a Foe or deceived by a Double agent when those two sources have no contact.',
    roleA: ['friend', 'civilian'], dirA: 'in', roleB: ['foe', 'double'], dirB: 'in'
  }),
  modIndep({
    id: 'mo-53', domain: 5, title: 'Two independent opposing claims',
    order: 'Fabricated account: drop anyone accused by a Foe or corroborated by a Friend and deceived by a Double agent or consulted by a Foreigner when those two sources have no contact.',
    roleA: ['foe', 'friend'], dirA: 'in', roleB: ['double', 'foreigner'], dirB: 'in'
  }),
  modSiteCorr({
    id: 'mo-54', domain: 5, title: 'Independent pair on one site',
    order: 'Alibi broken: engage anyone reached by two different sources on the same site who have no direct contact — unless verified by a Spy.',
    dirA: 'in', dirB: 'in', sameIncident: true, connected: false, exc: {roles: ['spy'], dir: 'in'}
  }),
  modIndep({
    id: 'mo-55', domain: 5, title: 'Independent verifier and witness',
    order: 'Eliminate anyone verified by a Spy or consulted by a Foreigner and identified by a Civilian or corroborated by a Friend whose two sources have no contact — unless accused by a Foe.',
    roleA: ['spy', 'foreigner'], dirA: 'in', roleB: ['civilian', 'friend'], dirB: 'in', exc: {roles: ['foe'], dir: 'in'}
  }),
  modSiteCorr({
    id: 'mo-56', domain: 5, title: 'Coordinated cover on one site',
    order: 'Rehearsed cover — fire on anyone acting toward two people on the same site who are themselves in direct contact.',
    dirA: 'out', dirB: 'out', sameIncident: true, connected: true
  }),
  modIndep({
    id: 'mo-57', domain: 5, title: 'Independent witness and foreign contact',
    order: 'Take down anyone identified by a Civilian or accused by a Foe and consulted by a Foreigner or deceived by a Double agent when those two sources have no contact.',
    roleA: ['civilian', 'foe'], dirA: 'in', roleB: ['foreigner', 'double'], dirB: 'in'
  }),
  modSiteDual({
    id: 'mo-58', domain: 5, title: 'Same-site contradiction',
    order: 'Double story: neutralize anyone both acting and contacted on the same site — unless corroborated by a Friend.',
    dirA: 'in', dirB: 'out', sameIncident: true, diffRole: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  modSiteDual({
    id: 'mo-59', domain: 5, title: 'Cross-site double face',
    order: 'Split allegiance: take out anyone contacted on one site while acting on the other — unless verified by a Spy.',
    dirA: 'in', dirB: 'out', sameIncident: false, diffRole: true, exc: {roles: ['spy'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 6: Chronology & Timing (10) — clears, strikes, logs, leaks to, corrects, meets
  // =========================================================================
  modSiteDual({
    id: 'mo-60', domain: 6, title: 'Acted after same-site contact',
    order: 'Wrong side of the clock — eliminate anyone who initiated a contact on a site after already being contacted on that same site.',
    dirA: 'in', dirB: 'out', sameIncident: true, timeOrder: 'before'
  }),
  modSiteDual({
    id: 'mo-61', domain: 6, title: 'Cross-site relay after briefing',
    order: 'Cross-site leak: fire on anyone contacted on one site who later initiates a contact on the other site — unless cleared by a Friend.',
    dirA: 'in', dirB: 'out', sameIncident: false, timeOrder: 'before', exc: {roles: ['friend'], dir: 'in'}
  }),
  modSiteDual({
    id: 'mo-62', domain: 6, title: 'Late same-site warning',
    order: 'Too late to clear: take down anyone who acted on a site earlier than someone contacted them on that same site — unless logged by a Spy.',
    dirA: 'out', dirB: 'in', sameIncident: true, timeOrder: 'before', exc: {roles: ['spy'], dir: 'in'}
  }),
  modSiteRelay({
    id: 'mo-63', domain: 6, title: 'Same-site chain reaction',
    order: 'Post-correction move: neutralize anyone contacted on a site whose source had already been contacted earlier on that same site.',
    firstDir: 'in', secondDir: 'in', sameIncident: true, timeOrder: 'after'
  }),
  modSiteRelay({
    id: 'mo-64', domain: 6, title: 'Delayed cross-site relay',
    order: 'Cross-site handoff: take out anyone who reaches out to someone who later initiates a contact on the other site — unless struck by a Foe.',
    firstDir: 'out', secondDir: 'out', sameIncident: false, timeOrder: 'before', exc: {roles: ['foe'], dir: 'in'}
  }),
  modTimePriority({
    id: 'mo-65', domain: 6, title: 'Acted later than every inbound',
    order: 'Timed betrayal: shoot anyone contacted who still initiates a dispatch later than every contact they receive — unless a Foreigner met them.',
    dirA: 'out', dirB: 'in', relation: 'after_all', exc: {roles: ['foreigner'], dir: 'in'}
  }),
  modSiteDual({
    id: 'mo-66', domain: 6, title: 'Cross-site move before inbound',
    order: 'Wrong side of the clock: drop anyone who acts on one site earlier than someone contacts them on the other site — unless logged by a Spy.',
    dirA: 'out', dirB: 'in', sameIncident: false, timeOrder: 'before', exc: {roles: ['spy'], dir: 'in'}
  }),
  modSiteRelay({
    id: 'mo-67', domain: 6, title: 'Same-site contact before source acted',
    order: 'Engage anyone contacted on a site earlier than their source initiates another dispatch on that same site — unless struck by a Foe.',
    firstDir: 'in', secondDir: 'out', sameIncident: true, timeOrder: 'before', exc: {roles: ['foe'], dir: 'in'}
  }),
  modSiteRelay({
    id: 'mo-68', domain: 6, title: 'Cross-site contact after source acted',
    order: 'Out of sequence: eliminate anyone contacted on one site whose source had already initiated a dispatch on the other — unless corrected by a Civilian.',
    firstDir: 'in', secondDir: 'out', sameIncident: false, timeOrder: 'after', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modSiteRelay({
    id: 'mo-69', domain: 6, title: 'Same-site contact after source acted',
    order: 'Post-correction move: fire on anyone contacted on a site whose source had already initiated another dispatch on that site — unless cleared by a Friend.',
    firstDir: 'in', secondDir: 'out', sameIncident: true, timeOrder: 'after', exc: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 7: Tainted Sources (10) — alibis, coerces, vets, compromises, exposes, funds
  // =========================================================================
  modSiteTaint({
    id: 'mo-70', domain: 7, title: 'Alibi from a cross-site actor',
    order: 'Paid witness: shoot anyone given a Friend’s alibi or Civilian’s exposure whose source acts on the opposite site — unless vetted by a Spy.',
    roles1: ['friend', 'civilian'], dir1: 'in', roles2: null, dir2: 'out', sameIncident: false, exc: {roles: ['spy'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-71', domain: 7, title: 'Vetted by a same-site pressured source',
    order: 'Compromised backer: drop anyone vetted by a Spy or compromised by a Double agent whose source was reached on that site — unless exposed by a Civilian.',
    roles1: ['spy', 'double'], dir1: 'in', roles2: null, dir2: 'in', sameIncident: true, exc: {roles: ['civilian'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-72', domain: 7, title: 'Exposed by a cross-site contacted witness',
    order: 'Engage anyone exposed by a Civilian or funded by a Foreigner whose source was contacted on the opposite site — unless given a Friend’s alibi.',
    roles1: ['civilian', 'foreigner'], dir1: 'in', roles2: null, dir2: 'in', sameIncident: false, exc: {roles: ['friend'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-73', domain: 7, title: 'Funded by an active same-site source',
    order: 'Eliminate anyone funded by a Foreigner or exposed by a Civilian whose source initiates another dispatch on that site — unless coerced by a Foe.',
    roles1: ['foreigner', 'civilian'], dir1: 'in', roles2: null, dir2: 'out', sameIncident: true, exc: {roles: ['foe'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-74', domain: 7, title: 'Coerced by an earlier-contacted source',
    order: 'Coerced vetting: fire on anyone coerced by a Foe or compromised by a Double agent after their source had already been contacted — unless funded by a Foreigner.',
    roles1: ['foe', 'double'], dir1: 'in', roles2: null, dir2: 'in', timeOrder: 'after', exc: {roles: ['foreigner'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-75', domain: 7, title: 'Compromised by a same-site actor',
    order: 'Poisoned source: take down anyone compromised by a Double agent or coerced by a Foe whose source acts on that same site — unless vetted by a Spy.',
    roles1: ['double', 'foe'], dir1: 'in', roles2: null, dir2: 'out', sameIncident: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-76', domain: 7, title: 'Alibi from a cross-site contacted source',
    order: 'Paid witness: neutralize anyone given a Friend’s alibi or Spy’s vetting whose source was contacted on the opposite site — unless exposed by a Civilian.',
    roles1: ['friend', 'spy'], dir1: 'in', roles2: null, dir2: 'in', sameIncident: false, exc: {roles: ['civilian'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-77', domain: 7, title: 'Vetted before source’s second move',
    order: 'Take out anyone vetted by a Spy or coerced by a Foe earlier than their source initiated another dispatch — unless compromised by a Double agent.',
    roles1: ['spy', 'foe'], dir1: 'in', roles2: null, dir2: 'out', timeOrder: 'before', exc: {roles: ['double'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-78', domain: 7, title: 'Bought alibi from a same-site source',
    order: 'Bought alibi: shoot anyone funded by a Foreigner or given a Friend’s alibi whose source was contacted on that same site — unless exposed by a Civilian.',
    roles1: ['foreigner', 'friend'], dir1: 'in', roles2: null, dir2: 'in', sameIncident: true, exc: {roles: ['civilian'], dir: 'in'}
  }),
  modSiteTaint({
    id: 'mo-79', domain: 7, title: 'Dirty funding from a cross-site actor',
    order: 'Dirty funding: drop anyone exposed by a Civilian or compromised by a Double agent whose source acts on the opposite site — unless coerced by a Foe.',
    roles1: ['civilian', 'double'], dir1: 'in', roles2: null, dir2: 'out', sameIncident: false, exc: {roles: ['foe'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 8: Double Lives (10) — protects, hunts, watches, leaks to, shelters, hosts
  // =========================================================================
  modSiteDual({
    id: 'mo-80', domain: 8, title: 'Two-front operator without shelter',
    order: 'Turned guardian: take down anyone initiating dispatches on both sites — unless sheltered by a Civilian.',
    dirA: 'out', dirB: 'out', sameIncident: false, exc: {roles: ['civilian'], dir: 'in'}
  }),
  modSiteDual({
    id: 'mo-81', domain: 8, title: 'Same-site dual operator',
    order: 'Neutralize anyone initiating two dispatches in different roles on the same site — unless hunted by a Foe.',
    dirA: 'out', dirB: 'out', sameIncident: true, diffRole: true, exc: {roles: ['foe'], dir: 'in'}
  }),
  modSiteDual({
    id: 'mo-82', domain: 8, title: 'Cross-site dual target',
    order: 'Take out anyone contacted on both sites across two different roles — unless watched by a Spy.',
    dirA: 'in', dirB: 'in', sameIncident: false, diffRole: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  modSiteDual({
    id: 'mo-83', domain: 8, title: 'Same-site dual contact',
    order: 'Protector playing both sides: shoot anyone contacted twice on the same site in different roles — unless sheltered by a Civilian.',
    dirA: 'in', dirB: 'in', sameIncident: true, diffRole: true, exc: {roles: ['civilian'], dir: 'in'}
  }),
  modCutout({
    id: 'mo-84', domain: 8, title: 'Two masters on one site',
    order: 'Two masters at once: drop anyone acting as a cutout on one site across two different roles — unless protected by a Friend.',
    sameIncident: true, diffRole: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  modCutout({
    id: 'mo-85', domain: 8, title: 'Cross-site double-role cutout',
    order: 'Engage anyone acting as a cutout across both sites in two different roles — unless hosted by a Foreigner.',
    sameIncident: false, diffRole: true, exc: {roles: ['foreigner'], dir: 'in'}
  }),
  modSiteDual({
    id: 'mo-86', domain: 8, title: 'Two-front role switcher',
    order: 'Eliminate anyone initiating dispatches on both sites across two different roles — unless a Double agent leaks to them.',
    dirA: 'out', dirB: 'out', sameIncident: false, diffRole: true, exc: {roles: ['double'], dir: 'in'}
  }),
  modCutout({
    id: 'mo-87', domain: 8, title: 'Closed triangle without hunter',
    order: 'Fire on anyone bridging two people who are already in direct contact across two different roles — unless hunted by a Foe.',
    diffRole: true, unconnected: false, exc: {roles: ['foe'], dir: 'in'}
  }),
  modCutout({
    id: 'mo-88', domain: 8, title: 'Blind cutout without watch',
    order: 'Take down anyone bridging two strangers across two different roles — unless watched by a Spy.',
    diffRole: true, unconnected: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  mod({
    id: 'mo-89', domain: 8, title: 'Pure recipient without shelter',
    order: 'Protector playing both sides: neutralize anyone receiving contacts in at least two roles who initiates none; hold fire on anyone protected by a Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend') || g.out(x).length > 0) return null;
        const inc = g.in(x);
        const roles = [...new Set(inc.map(e => e.role))];
        if (roles.length < 2) return null;
        return proof ? x + ': receives ' + roles.join(' & ') + ', initiates none, no Friend protection.' : 'ok';
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 9: Command & Leverage (10) — vouches for, targets, shadows, leaks to, tips off, meets
  // =========================================================================
  modAnchor({
    id: 'mo-90', domain: 9, title: '{name}’s two-step proxy',
    order: 'Chain of leverage — engage anyone reached in two outgoing steps from {name} with no direct contact with {name}, except anyone shadowed by a Spy.',
    step1Roles: null, step1Dir: 'out', step2Roles: null, step2Dir: 'out', excludeDirect: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  modAnchor({
    id: 'mo-91', domain: 9, title: '{name}’s hidden upstream',
    order: 'Handler compromised: eliminate anyone two incoming steps upstream of {name} with no direct contact with {name} — unless vouched for by a Friend.',
    step1Roles: null, step1Dir: 'in', step2Roles: null, step2Dir: 'in', excludeDirect: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  modAnchor({
    id: 'mo-92', domain: 9, title: '{name}’s Foe, Double agent, or Foreigner bridge',
    order: 'Fire on anyone reached by a Foe, Double agent, or Foreigner from someone {name} reaches directly, sparing anyone tipped off by a Civilian.',
    step1Roles: null, step1Dir: 'out', step2Roles: ['foe', 'double', 'foreigner'], step2Dir: 'out', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modAnchor({
    id: 'mo-93', domain: 9, title: '{name}’s delayed chain',
    order: 'Asset under leverage: take down anyone reached from {name} in two outgoing steps where the second contact happens later than the first.',
    step1Roles: null, step1Dir: 'out', step2Roles: null, step2Dir: 'out', timeOrder: 'before'
  }),
  modAnchor({
    id: 'mo-94', domain: 9, title: '{name}’s pre-positioned relay',
    order: 'Shadow reach — neutralize anyone reached from {name} in two outgoing steps where the second contact happened earlier than the first.',
    step1Roles: null, step1Dir: 'out', step2Roles: null, step2Dir: 'out', timeOrder: 'after'
  }),
  modAnchor({
    id: 'mo-95', domain: 9, title: '{name}’s shared ward',
    order: 'Unchecked influence: take out anyone reached by someone who also operates directly toward {name} — unless met by a Foreigner.',
    step1Roles: null, step1Dir: 'in', step2Roles: null, step2Dir: 'out', exc: {roles: ['foreigner'], dir: 'in'}
  }),
  modAnchor({
    id: 'mo-96', domain: 9, title: '{name}’s rival source',
    order: 'Chain of leverage — shoot anyone who operates toward someone {name} also reaches, sparing anyone shadowed by a Spy.',
    step1Roles: null, step1Dir: 'out', step2Roles: null, step2Dir: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),
  modAnchor({
    id: 'mo-97', domain: 9, title: '{name}’s unwatched cutout',
    order: 'Drop anyone reached from {name} through an intermediary no Spy shadows — excluding {name}’s direct contacts.',
    step1Roles: null, step1Dir: 'out', step2Roles: null, step2Dir: 'out', excludeDirect: true, midExc: {roles: ['spy'], dir: 'in'}
  }),
  modAnchor({
    id: 'mo-98', domain: 9, title: '{name}’s unbacked cutout',
    order: 'Command breach: engage anyone upstream of {name} through an intermediary no Friend vouches for — excluding {name}’s direct contacts.',
    step1Roles: null, step1Dir: 'in', step2Roles: null, step2Dir: 'in', excludeDirect: true, midExc: {roles: ['friend'], dir: 'in'}
  }),
  modAnchor({
    id: 'mo-99', domain: 9, title: '{name}’s cross-role reach',
    order: 'Asset under leverage: eliminate anyone reached from {name} in two outgoing steps across two different roles — unless a Foe targets them.',
    step1Roles: null, step1Dir: 'out', step2Roles: null, step2Dir: 'out', diffRole: true, exc: {roles: ['foe'], dir: 'in'}
  })
];
