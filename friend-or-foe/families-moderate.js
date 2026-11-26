import {collectMatches} from './case-graph.js';
import {
  hasCompromised, matchAnchorRelay, matchAtom,
  matchDependentSupport, matchIndependentSupport, matchRelay, matchTemporal
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
        return proof ? x + ': ' + g.fmt(hit.eA) + ' & ' + g.fmt(hit.eB) + ' linked via ' + g.fmt(hit.link) + '.' : 'ok';
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

export const moderateFamilies = [
  // =========================================================================
  // DOMAIN 0: Cover & Betrayal (10) — clears, targets, audits, leaks to, warns, contacts
  // =========================================================================
  modTaint({
    id: 'mo-00', domain: 0, title: 'Tainted clearance or audit',
    order: 'Cover blown — take down anyone cleared by a Friend or audited by a Spy who leaks as a Double agent or contacts as a Foreigner; stand down if a Civilian warns them.',
    roles: ['friend', 'spy'], taint: ['double', 'foreigner'], taintDir: 'out', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-01', domain: 0, title: 'Cover for an attacker or outsider',
    order: 'Burned clearance: neutralize anyone who clears as a Friend or warns as a Civilian an active Foe or Foreigner; hold fire on anyone audited by a Spy.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['foe', 'foreigner'], secondDir: 'out', exc: {roles: ['spy'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-02', domain: 0, title: 'Insider shielding a contacted mark',
    order: 'Take out anyone who clears as a Friend or warns as a Civilian someone contacted by a Foreigner or leaked to by a Double agent, except anyone targeted by a Foe.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['foreigner', 'double'], secondDir: 'in', exc: {roles: ['foe'], dir: 'in'}
  }),
  modTaint({
    id: 'mo-03', domain: 0, title: 'Audited by an insider backer',
    order: 'Insider betrayal: shoot anyone audited by a Spy or warned by a Civilian who also clears as a Friend or targets as a Foe — unless contacted by a Foreigner.',
    roles: ['spy', 'civilian'], taint: ['friend', 'foe'], taintDir: 'out', exc: {roles: ['foreigner'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-04', domain: 0, title: 'Mole or outsider reaching an active voucher',
    order: 'False cover — drop anyone who leaks as a Double agent or contacts as a Foreigner an active Friend or Spy, sparing anyone targeted by a Foe.',
    firstRoles: ['double', 'foreigner'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'out', exc: {roles: ['foe'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-05', domain: 0, title: 'Foe or Foreigner hitting a cleared mark',
    order: 'Compromised vetting: engage anyone who targets as a Foe or contacts as a Foreigner someone cleared by a Friend or audited by a Spy; hold fire on anyone warned by a Civilian.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'in', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modTaint({
    id: 'mo-06', domain: 0, title: 'Clearance under pressure',
    order: 'Cover blown — eliminate anyone cleared by a Friend or warned by a Civilian who was contacted by a Foreigner or targeted by a Foe, except anyone audited by a Spy.',
    roles: ['friend', 'civilian'], taint: ['foreigner', 'foe'], taintDir: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-07', domain: 0, title: 'Double agent or Foe reaching a witness',
    order: 'Fire on anyone who leaks as a Double agent or targets as a Foe someone warned by a Civilian or cleared by a Friend — unless audited by a Spy.',
    firstRoles: ['double', 'foe'], firstDir: 'out', secondRoles: ['civilian', 'friend'], secondDir: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),
  modTaint({
    id: 'mo-08', domain: 0, title: 'Witness or voucher audited by a Spy',
    order: 'Station breach — take down anyone warned by a Civilian or targeted by a Foe who was audited by a Spy or cleared by a Friend, sparing anyone contacted by a Foreigner.',
    roles: ['civilian', 'foe'], taint: ['spy', 'friend'], taintDir: 'in', exc: {roles: ['foreigner'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-09', domain: 0, title: 'Delayed clearance after leak or strike',
    order: 'Insider betrayal: neutralize anyone who clears as a Friend or audits as a Spy someone who had earlier leaked as a Double agent or targeted as a Foe.',
    firstRoles: ['friend', 'spy'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'out', timeOrder: 'after'
  }),

  // =========================================================================
  // DOMAIN 1: Surveillance & Blind Spots (10) — escorts, ambushes, shadows, leaks to, spots, signals
  // =========================================================================
  modRelay({
    id: 'mo-10', domain: 1, title: 'Shadowing an ambushed or signaled mark',
    order: 'Escort off-script — engage anyone who shadows as a Spy or spots as a Civilian someone ambushed by a Foe or signaled by a Foreigner, except anyone escorted by a Friend.',
    firstRoles: ['spy', 'civilian'], firstDir: 'out', secondRoles: ['foe', 'foreigner'], secondDir: 'in', exc: {roles: ['friend'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-11', domain: 1, title: 'Ambushed watcher or escort',
    order: 'Dead drop watched: eliminate anyone ambushed by a Foe or leaked to by a Double agent who shadows as a Spy or escorts as a Friend — unless spotted by a Civilian.',
    firstRoles: ['foe', 'double'], firstDir: 'in', secondRoles: ['spy', 'friend'], secondDir: 'out', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modTaint({
    id: 'mo-12', domain: 1, title: 'Signal or ambush inside the watch',
    order: 'Fire on anyone shadowed by a Spy or escorted by a Friend who was signaled by a Foreigner or ambushed by a Foe, sparing anyone spotted by a Civilian.',
    roles: ['spy', 'friend'], taint: ['foreigner', 'foe'], taintDir: 'in', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-13', domain: 1, title: 'Unwatched signal or ambush relay',
    order: 'Compromised tail: take down anyone signaled by a Foreigner or ambushed by a Foe who leaks as a Double agent or spots as a Civilian; hold fire on anyone shadowed by a Spy.',
    firstRoles: ['foreigner', 'foe'], firstDir: 'in', secondRoles: ['double', 'civilian'], secondDir: 'out', exc: {roles: ['spy'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-14', domain: 1, title: 'Escort or spotter walking into danger',
    order: 'Watcher exposed — neutralize anyone who escorts as a Friend or spots as a Civilian someone ambushed by a Foe or leaked to by a Double agent, except anyone shadowed by a Spy.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['foe', 'double'], secondDir: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-15', domain: 1, title: 'Ambushed or signaled before watch',
    order: 'Signal in the alley: take out anyone who ambushes as a Foe or signals as a Foreigner someone a Civilian spotted or Spy shadowed only later.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'out', secondRoles: ['civilian', 'spy'], secondDir: 'in', timeOrder: 'before'
  }),
  modRelay({
    id: 'mo-16', domain: 1, title: 'Shadowed or spotted by an escort’s ward',
    order: 'Escort off-script — shoot anyone shadowed by a Spy or spotted by a Civilian whose watcher is escorted by a Friend or ambushed by a Foe, sparing anyone signaled by a Foreigner.',
    firstRoles: ['spy', 'civilian'], firstDir: 'in', secondRoles: ['friend', 'foe'], secondDir: 'in', exc: {roles: ['foreigner'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-17', domain: 1, title: 'Watcher tracking a mole or Foreigner',
    order: 'Drop anyone who spots as a Civilian or shadows as a Spy someone leaking as a Double agent or signaling as a Foreigner; hold fire on anyone escorted by a Friend.',
    firstRoles: ['civilian', 'spy'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'out', exc: {roles: ['friend'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-18', domain: 1, title: 'Signaled by a watched outsider',
    order: 'Engage anyone signaled by a Foreigner or leaked to by a Double agent whose contact is shadowed by a Spy or escorted by a Friend, except anyone spotted by a Civilian.',
    firstRoles: ['foreigner', 'double'], firstDir: 'in', secondRoles: ['spy', 'friend'], secondDir: 'in', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modTaint({
    id: 'mo-19', domain: 1, title: 'Escort or spotter working in shadow',
    order: 'Compromised tail: eliminate anyone escorted by a Friend or spotted by a Civilian who also ambushes as a Foe or signals as a Foreigner — unless shadowed by a Spy.',
    roles: ['friend', 'civilian'], taint: ['foe', 'foreigner'], taintDir: 'out', exc: {roles: ['spy'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 2: Foreign Contact (10) — vouches for, pressures, tracks, leaks to, reports, recruits
  // =========================================================================
  modRelay({
    id: 'mo-20', domain: 2, title: 'Recruiter or Foe with inside backing',
    order: 'Foreign contact in play — take out anyone recruited by a Foreigner or pressured by a Foe whose contact is vouched for by a Friend or reported by a Civilian, sparing anyone tracked by a Spy.',
    firstRoles: ['foreigner', 'foe'], firstDir: 'in', secondRoles: ['friend', 'civilian'], secondDir: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-21', domain: 2, title: 'Pressuring a recruit or tracked mark',
    order: 'Shoot anyone who pressures as a Foe or leaks as a Double agent to someone recruited by a Foreigner or tracked by a Spy; hold fire on anyone reported by a Civilian.',
    firstRoles: ['foe', 'double'], firstDir: 'out', secondRoles: ['foreigner', 'spy'], secondDir: 'in', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-22', domain: 2, title: 'Recruit or mole turning active',
    order: 'Drop anyone recruited by a Foreigner or tracked by a Spy who leaks as a Double agent or pressures as a Foe, except anyone vouched for by a Friend.',
    firstRoles: ['foreigner', 'spy'], firstDir: 'in', secondRoles: ['double', 'foe'], secondDir: 'out', exc: {roles: ['friend'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-23', domain: 2, title: 'Recruiting a witness or voucher',
    order: 'External handler: engage anyone who recruits as a Foreigner or pressures as a Foe someone who reports as a Civilian or vouches as a Friend — unless tracked by a Spy.',
    firstRoles: ['foreigner', 'foe'], firstDir: 'out', secondRoles: ['civilian', 'friend'], secondDir: 'out', exc: {roles: ['spy'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-24', domain: 2, title: 'Recruited before tracking or reporting',
    order: 'Border leak — eliminate anyone recruited by a Foreigner or leaked to by a Double agent earlier than a Spy tracked or Civilian reported that contact.',
    firstRoles: ['foreigner', 'double'], firstDir: 'in', secondRoles: ['spy', 'civilian'], secondDir: 'in', timeOrder: 'before'
  }),
  modTaint({
    id: 'mo-25', domain: 2, title: 'Witness or tracker recruited abroad',
    order: 'Fire on anyone reported by a Civilian or tracked by a Spy who was recruited by a Foreigner or leaked to by a Double agent; hold fire on anyone pressured by a Foe.',
    roles: ['civilian', 'spy'], taint: ['foreigner', 'double'], taintDir: 'in', exc: {roles: ['foe'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-26', domain: 2, title: 'Insider backing an active Foreigner or Foe',
    order: 'Foreign contact in play — take down anyone who vouches as a Friend or tracks as a Spy an active Foreigner or Foe, except anyone reported by a Civilian.',
    firstRoles: ['friend', 'spy'], firstDir: 'out', secondRoles: ['foreigner', 'foe'], secondDir: 'out', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-27', domain: 2, title: 'Recruited by a pressured contact',
    order: 'Neutralize anyone recruited by a Foreigner or tracked by a Spy whose contact was pressured by a Foe or leaked to by a Double agent — unless vouched for by a Friend.',
    firstRoles: ['foreigner', 'spy'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'in', exc: {roles: ['friend'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-28', domain: 2, title: 'Mole or witness feeding a recruiter',
    order: 'Cross-border breach — take out anyone who leaks as a Double agent or reports as a Civilian an active Foreigner or Spy, sparing anyone pressured by a Foe.',
    firstRoles: ['double', 'civilian'], firstDir: 'out', secondRoles: ['foreigner', 'spy'], secondDir: 'out', exc: {roles: ['foe'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-29', domain: 2, title: 'Tracked or vouched recruiter',
    order: 'Shoot anyone tracked by a Spy or vouched for by a Friend who recruits as a Foreigner or leaks as a Double agent; hold fire on anyone pressured by a Foe.',
    firstRoles: ['spy', 'friend'], firstDir: 'in', secondRoles: ['foreigner', 'double'], secondDir: 'out', exc: {roles: ['foe'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 3: Civilian Tip-Offs (10) — confirms, targets, monitors, misleads, tips off, briefs
  // =========================================================================
  modRelay({
    id: 'mo-30', domain: 3, title: 'Tip-off to a targeted or misled mark',
    order: 'Burned tip-off — fire on anyone who tips off as a Civilian or monitors as a Spy someone targeted by a Foe or misled by a Double agent, except anyone confirmed by a Friend.',
    firstRoles: ['civilian', 'spy'], firstDir: 'out', secondRoles: ['foe', 'double'], secondDir: 'in', exc: {roles: ['friend'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-31', domain: 3, title: 'Misled informant or voucher',
    order: 'Take down anyone tipped off by a Civilian or confirmed by a Friend whose source was misled by a Double agent or briefed by a Foreigner — unless monitored by a Spy.',
    firstRoles: ['civilian', 'friend'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-32', domain: 3, title: 'Confirming a tipped or briefed suspect',
    order: 'Neutralize anyone who confirms as a Friend or monitors as a Spy someone tipped off by a Civilian or briefed by a Foreigner, sparing anyone targeted by a Foe.',
    firstRoles: ['friend', 'spy'], firstDir: 'out', secondRoles: ['civilian', 'foreigner'], secondDir: 'in', exc: {roles: ['foe'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-33', domain: 3, title: 'Briefed or monitored witness',
    order: 'Take out anyone tipped off by a Civilian or targeted by a Foe whose contact was briefed by a Foreigner or monitored by a Spy; hold fire on anyone confirmed by a Friend.',
    firstRoles: ['civilian', 'foe'], firstDir: 'in', secondRoles: ['foreigner', 'spy'], secondDir: 'in', exc: {roles: ['friend'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-34', domain: 3, title: 'Late tip-off after strike or deception',
    order: 'Informant in play — shoot anyone tipped off by a Civilian or confirmed by a Friend later than a Foe targeted or Double agent misled that source.',
    firstRoles: ['civilian', 'friend'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'in', timeOrder: 'after'
  }),
  modRelay({
    id: 'mo-35', domain: 3, title: 'Monitor’s civilian or ally source',
    order: 'False warning: drop anyone monitored by a Spy or briefed by a Foreigner who tips off as a Civilian or confirms as a Friend — unless misled by a Double agent.',
    firstRoles: ['spy', 'foreigner'], firstDir: 'in', secondRoles: ['civilian', 'friend'], secondDir: 'out', exc: {roles: ['double'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-36', domain: 3, title: 'Foe or Double agent hunting a witness',
    order: 'Burned tip-off — engage anyone who targets as a Foe or misleads as a Double agent an active Civilian or Spy, sparing anyone briefed by a Foreigner.',
    firstRoles: ['foe', 'double'], firstDir: 'out', secondRoles: ['civilian', 'spy'], secondDir: 'out', exc: {roles: ['foreigner'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-37', domain: 3, title: 'Deceiver fooling a witness or ally',
    order: 'Eliminate anyone who misleads as a Double agent or briefs as a Foreigner someone tipped off by a Civilian or confirmed by a Friend; hold fire on anyone monitored by a Spy.',
    firstRoles: ['double', 'foreigner'], firstDir: 'out', secondRoles: ['civilian', 'friend'], secondDir: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),
  modTaint({
    id: 'mo-38', domain: 3, title: 'Confirmed by a misled or briefed Friend',
    order: 'Street misdirection — fire on anyone confirmed by a Friend or monitored by a Spy who was misled by a Double agent or briefed by a Foreigner, except anyone tipped off by a Civilian.',
    roles: ['friend', 'spy'], taint: ['double', 'foreigner'], taintDir: 'in', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-39', domain: 3, title: 'Foreigner or Foe briefing a witness',
    order: 'Tainted brief: take down anyone who briefs as a Foreigner or targets as a Foe someone who tips off as a Civilian or monitors as a Spy — unless confirmed by a Friend.',
    firstRoles: ['foreigner', 'foe'], firstDir: 'out', secondRoles: ['civilian', 'spy'], secondDir: 'out', exc: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 4: Proxy Chains (10) — backs, strikes, traces, relays to, warns, hands off to
  // =========================================================================
  modRelay({
    id: 'mo-40', domain: 4, title: 'Foreign handoff to a striker or tracer',
    order: 'Proxy breach — drop anyone who hands off as a Foreigner or warns as a Civilian an active Foe or Spy, sparing anyone backed by a Friend.',
    firstRoles: ['foreigner', 'civilian'], firstDir: 'out', secondRoles: ['foe', 'spy'], secondDir: 'out', exc: {roles: ['friend'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-41', domain: 4, title: 'Relay through a backed or traced contact',
    order: 'Engage anyone who relays as a Double agent or strikes as a Foe someone backed by a Friend or traced by a Spy; hold fire on anyone warned by a Civilian.',
    firstRoles: ['double', 'foe'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'in', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-42', domain: 4, title: 'Traced or warned courier',
    order: 'Eliminate anyone traced by a Spy or warned by a Civilian who hands off as a Foreigner or relays as a Double agent, except anyone backed by a Friend.',
    firstRoles: ['spy', 'civilian'], firstDir: 'in', secondRoles: ['foreigner', 'double'], secondDir: 'out', exc: {roles: ['friend'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-43', domain: 4, title: 'Striker or tracer hitting a courier',
    order: 'Fire on anyone who strikes as a Foe or traces as a Spy someone who relays as a Double agent or hands off as a Foreigner — unless warned by a Civilian.',
    firstRoles: ['foe', 'spy'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'out', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-44', domain: 4, title: 'Backer behind a tracer or witness',
    order: 'Rogue relay — take down anyone backed by a Friend or handed off to by a Foreigner whose source traces as a Spy or warns as a Civilian, sparing anyone struck by a Foe.',
    firstRoles: ['friend', 'foreigner'], firstDir: 'in', secondRoles: ['spy', 'civilian'], secondDir: 'out', exc: {roles: ['foe'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-45', domain: 4, title: 'Warned or backed suspect turning active',
    order: 'Intercepted handoff: neutralize anyone warned by a Civilian or backed by a Friend who hands off as a Foreigner or strikes as a Foe; hold fire on anyone traced by a Spy.',
    firstRoles: ['civilian', 'friend'], firstDir: 'in', secondRoles: ['foreigner', 'foe'], secondDir: 'out', exc: {roles: ['spy'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-46', domain: 4, title: 'Relay from a traced or backed source',
    order: 'Take out anyone relayed to by a Double agent or struck by a Foe whose source is traced by a Spy or backed by a Friend, except anyone warned by a Civilian.',
    firstRoles: ['double', 'foe'], firstDir: 'in', secondRoles: ['spy', 'friend'], secondDir: 'in', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-47', domain: 4, title: 'Striker’s backed or warned cutout',
    order: 'Shoot anyone struck by a Foe or handed off to by a Foreigner whose source is backed by a Friend or warned by a Civilian — unless a Double agent relays to them.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'in', secondRoles: ['friend', 'civilian'], secondDir: 'in', exc: {roles: ['double'], dir: 'in'}
  }),
  modRelay({
    id: 'mo-48', domain: 4, title: 'Handoff after warning or trace',
    order: 'Cutout exposed — drop anyone who hands off as a Foreigner or relays as a Double agent to someone a Civilian warned or Spy traced earlier.',
    firstRoles: ['foreigner', 'double'], firstDir: 'out', secondRoles: ['civilian', 'spy'], secondDir: 'in', timeOrder: 'after'
  }),
  modRelay({
    id: 'mo-49', domain: 4, title: 'Tracer following an active backer or striker',
    order: 'Engage anyone who traces as a Spy or relays as a Double agent to someone who backs as a Friend or strikes as a Foe; hold fire on anyone warned by a Civilian.',
    firstRoles: ['spy', 'double'], firstDir: 'out', secondRoles: ['friend', 'foe'], secondDir: 'out', exc: {roles: ['civilian'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 5: Alibi & Contradiction (10) — corroborates, accuses, verifies, deceives, identifies, consults
  // =========================================================================
  modDep({
    id: 'mo-50', domain: 5, title: 'Circular insider alibi',
    order: 'Contradicted witness — neutralize anyone corroborated by a Friend or accused by a Foe and verified by a Spy or identified by a Civilian when those two sources are linked.',
    roleA: ['friend', 'foe'], dirA: 'in', roleB: ['spy', 'civilian'], dirB: 'in'
  }),
  modDep({
    id: 'mo-51', domain: 5, title: 'Coordinated witness and outsider',
    order: 'False verification: take out anyone identified by a Civilian or verified by a Spy and accused by a Foe or consulted by a Foreigner when those two sources are linked.',
    roleA: ['civilian', 'spy'], dirA: 'in', roleB: ['foe', 'foreigner'], dirB: 'in'
  }),
  modIndep({
    id: 'mo-52', domain: 5, title: 'Independent accusation and cover',
    order: 'Shoot anyone corroborated by a Friend or identified by a Civilian and accused by a Foe or deceived by a Double agent when those two sources have no contact.',
    roleA: ['friend', 'civilian'], dirA: 'in', roleB: ['foe', 'double'], dirB: 'in'
  }),
  modIndep({
    id: 'mo-53', domain: 5, title: 'Two unlinked opposing claims',
    order: 'Fabricated account: drop anyone accused by a Foe or corroborated by a Friend and deceived by a Double agent or consulted by a Foreigner when those two sources have no contact.',
    roleA: ['foe', 'friend'], dirA: 'in', roleB: ['double', 'foreigner'], dirB: 'in'
  }),
  modDep({
    id: 'mo-54', domain: 5, title: 'Linked verifier and opponent',
    order: 'Alibi broken — engage anyone verified by a Spy or corroborated by a Friend and accused by a Foe or deceived by a Double agent when those two are linked.',
    roleA: ['spy', 'friend'], dirA: 'in', roleB: ['foe', 'double'], dirB: 'in'
  }),
  modIndep({
    id: 'mo-55', domain: 5, title: 'Independent verifier and witness',
    order: 'Eliminate anyone verified by a Spy or consulted by a Foreigner and identified by a Civilian or corroborated by a Friend whose two sources have no contact — unless accused by a Foe.',
    roleA: ['spy', 'foreigner'], dirA: 'in', roleB: ['civilian', 'friend'], dirB: 'in', exc: {roles: ['foe'], dir: 'in'}
  }),
  modDep({
    id: 'mo-56', domain: 5, title: 'Rehearsed foreign cover',
    order: 'Contradicted witness — fire on anyone consulted by a Foreigner or deceived by a Double agent and corroborated by a Friend or verified by a Spy when those two are linked.',
    roleA: ['foreigner', 'double'], dirA: 'in', roleB: ['friend', 'spy'], dirB: 'in'
  }),
  modIndep({
    id: 'mo-57', domain: 5, title: 'Unlinked witness and foreign contact',
    order: 'Take down anyone identified by a Civilian or accused by a Foe and consulted by a Foreigner or deceived by a Double agent when those two sources have no contact.',
    roleA: ['civilian', 'foe'], dirA: 'in', roleB: ['foreigner', 'double'], dirB: 'in'
  }),
  modDep({
    id: 'mo-58', domain: 5, title: 'Linked accuser and witness',
    order: 'Colluding sources — neutralize anyone deceived by a Double agent or identified by a Civilian and accused by a Foe or consulted by a Foreigner when those two are linked.',
    roleA: ['double', 'civilian'], dirA: 'in', roleB: ['foe', 'foreigner'], dirB: 'in'
  }),
  modIndep({
    id: 'mo-59', domain: 5, title: 'Unlinked verifier and outsider',
    order: 'Take out anyone verified by a Spy or deceived by a Double agent and consulted by a Foreigner or accused by a Foe whose two sources have no contact — unless corroborated by a Friend.',
    roleA: ['spy', 'double'], dirA: 'in', roleB: ['foreigner', 'foe'], dirB: 'in', exc: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 6: Chronology & Timing (10) — clears, strikes, logs, leaks to, corrects, meets
  // =========================================================================
  modTime({
    id: 'mo-60', domain: 6, title: 'Cleared after correction or strike',
    order: 'Wrong side of the clock — eliminate anyone corrected by a Civilian or struck by a Foe earlier than they cleared as a Friend or leaked as a Double agent, sparing anyone logged by a Spy.',
    early: {roles: ['civilian', 'foe'], dir: 'in'}, late: {roles: ['friend', 'double'], dir: 'out'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  modTime({
    id: 'mo-61', domain: 6, title: 'Leaked or met after clearance',
    order: 'Fire on anyone cleared by a Friend or logged by a Spy earlier than they leaked as a Double agent or met as a Foreigner; hold fire on anyone struck by a Foe.',
    early: {roles: ['friend', 'spy'], dir: 'in'}, late: {roles: ['double', 'foreigner'], dir: 'out'}, exc: {roles: ['foe'], dir: 'in'}
  }),
  modTime({
    id: 'mo-62', domain: 6, title: 'Struck or leaked before logging',
    order: 'Take down anyone who struck as a Foe or leaked as a Double agent earlier than a Spy logged or Friend cleared them, except anyone corrected by a Civilian.',
    early: {roles: ['foe', 'double'], dir: 'out'}, late: {roles: ['spy', 'friend'], dir: 'in'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  modTime({
    id: 'mo-63', domain: 6, title: 'Active Foreigner or Foe after warning',
    order: 'Post-correction move: neutralize anyone corrected by a Civilian or logged by a Spy earlier than they met as a Foreigner or struck as a Foe — unless cleared by a Friend.',
    early: {roles: ['civilian', 'spy'], dir: 'in'}, late: {roles: ['foreigner', 'foe'], dir: 'out'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  modTime({
    id: 'mo-64', domain: 6, title: 'Logged after foreign meeting or strike',
    order: 'Too late to clear — take out anyone met by a Foreigner or struck by a Foe earlier than a Spy logged or Civilian corrected them; stand down if a Double agent leaked to them.',
    early: {roles: ['foreigner', 'foe'], dir: 'in'}, late: {roles: ['spy', 'civilian'], dir: 'in'}, exc: {roles: ['double'], dir: 'in'}
  }),
  modTime({
    id: 'mo-65', domain: 6, title: 'Cleared or corrected after strike',
    order: 'Timed betrayal: shoot anyone struck by a Foe or fed a Double agent’s leak earlier than a Friend cleared or Civilian corrected them, sparing them if a Foreigner met them.',
    early: {roles: ['foe', 'double'], dir: 'in'}, late: {roles: ['friend', 'civilian'], dir: 'in'}, exc: {roles: ['foreigner'], dir: 'in'}
  }),
  modTime({
    id: 'mo-66', domain: 6, title: 'Late Civilian correction or strike',
    order: 'Wrong side of the clock — drop anyone who leaked as a Double agent or met as a Foreigner earlier than a Civilian corrected or Foe struck them, except anyone logged by a Spy.',
    early: {roles: ['double', 'foreigner'], dir: 'out'}, late: {roles: ['civilian', 'foe'], dir: 'in'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  modTime({
    id: 'mo-67', domain: 6, title: 'Foreigner or mole before clearing',
    order: 'Engage anyone met by a Foreigner or fed a Double agent’s leak earlier than they cleared as a Friend or logged as a Spy — unless struck by a Foe.',
    early: {roles: ['foreigner', 'double'], dir: 'in'}, late: {roles: ['friend', 'spy'], dir: 'out'}, exc: {roles: ['foe'], dir: 'in'}
  }),
  modTime({
    id: 'mo-68', domain: 6, title: 'Logged or cleared before strike',
    order: 'Out of sequence — eliminate anyone logged by a Spy or cleared by a Friend earlier than a Foe struck or Foreigner met them; stand down if a Civilian corrected them.',
    early: {roles: ['spy', 'friend'], dir: 'in'}, late: {roles: ['foe', 'foreigner'], dir: 'in'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  modTime({
    id: 'mo-69', domain: 6, title: 'Leak or correction before Foreigner',
    order: 'Post-correction move: fire on anyone fed a Double agent’s leak or corrected by a Civilian earlier than a Foreigner met or Foe struck them; hold fire on anyone cleared by a Friend.',
    early: {roles: ['double', 'civilian'], dir: 'in'}, late: {roles: ['foreigner', 'foe'], dir: 'in'}, exc: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 7: Tainted Sources (10) — alibis, coerces, vets, compromises, exposes, funds
  // =========================================================================
  modTaint({
    id: 'mo-70', domain: 7, title: 'Alibi from a foreign funder or mole',
    order: 'Paid witness — shoot anyone given a Friend’s alibi or Civilian’s exposure by someone who funds as a Foreigner or compromises as a Double agent, except anyone vetted by a Spy.',
    roles: ['friend', 'civilian'], taint: ['foreigner', 'double'], taintDir: 'out', exc: {roles: ['spy'], dir: 'in'}
  }),
  modTaint({
    id: 'mo-71', domain: 7, title: 'Vetted by a coerced or funded Spy',
    order: 'Compromised backer: drop anyone vetted by a Spy or compromised by a Double agent whose source was coerced by a Foe or funded by a Foreigner — unless exposed by a Civilian.',
    roles: ['spy', 'double'], taint: ['foe', 'foreigner'], taintDir: 'in', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modTaint({
    id: 'mo-72', domain: 7, title: 'Exposed by a compromised or coerced witness',
    order: 'Engage anyone exposed by a Civilian or funded by a Foreigner whose source was compromised by a Double agent or coerced by a Foe, sparing anyone given a Friend’s alibi.',
    roles: ['civilian', 'foreigner'], taint: ['double', 'foe'], taintDir: 'in', exc: {roles: ['friend'], dir: 'in'}
  }),
  modTaint({
    id: 'mo-73', domain: 7, title: 'Funded by a vetted or alibied source',
    order: 'Eliminate anyone funded by a Foreigner or exposed by a Civilian whose source was vetted by a Spy or given a Friend’s alibi; hold fire on anyone coerced by a Foe.',
    roles: ['foreigner', 'civilian'], taint: ['spy', 'friend'], taintDir: 'in', exc: {roles: ['foe'], dir: 'in'}
  }),
  modTaint({
    id: 'mo-74', domain: 7, title: 'Coerced by an exposed or vetted source',
    order: 'Coerced vetting — fire on anyone coerced by a Foe or compromised by a Double agent whose source was exposed by a Civilian or vetted by a Spy, except anyone funded by a Foreigner.',
    roles: ['foe', 'double'], taint: ['civilian', 'spy'], taintDir: 'in', exc: {roles: ['foreigner'], dir: 'in'}
  }),
  modTaint({
    id: 'mo-75', domain: 7, title: 'Compromised by an alibied or funded source',
    order: 'Poisoned source: take down anyone compromised by a Double agent or coerced by a Foe whose source had a Friend’s alibi or Foreigner’s funding — unless vetted by a Spy.',
    roles: ['double', 'foe'], taint: ['friend', 'foreigner'], taintDir: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),
  modTaint({
    id: 'mo-76', domain: 7, title: 'Alibi from a coerced or compromised source',
    order: 'Paid witness — neutralize anyone given a Friend’s alibi or Spy’s vetting by someone coerced by a Foe or compromised by a Double agent, sparing anyone exposed by a Civilian.',
    roles: ['friend', 'spy'], taint: ['foe', 'double'], taintDir: 'in', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modTaint({
    id: 'mo-77', domain: 7, title: 'Vetted by an exposed or alibied source',
    order: 'Take out anyone vetted by a Spy or coerced by a Foe whose source was exposed by a Civilian or given a Friend’s alibi; hold fire on anyone compromised by a Double agent.',
    roles: ['spy', 'foe'], taint: ['civilian', 'friend'], taintDir: 'in', exc: {roles: ['double'], dir: 'in'}
  }),
  modTaint({
    id: 'mo-78', domain: 7, title: 'Funded by a compromised or coerced source',
    order: 'Bought alibi — shoot anyone funded by a Foreigner or given a Friend’s alibi by someone compromised by a Double agent or coerced by a Foe, except anyone exposed by a Civilian.',
    roles: ['foreigner', 'friend'], taint: ['double', 'foe'], taintDir: 'in', exc: {roles: ['civilian'], dir: 'in'}
  }),
  modTaint({
    id: 'mo-79', domain: 7, title: 'Exposed by a funded or vetted source',
    order: 'Dirty funding: drop anyone exposed by a Civilian or compromised by a Double agent whose source was funded by a Foreigner or vetted by a Spy — unless coerced by a Foe.',
    roles: ['civilian', 'double'], taint: ['foreigner', 'spy'], taintDir: 'in', exc: {roles: ['foe'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 8: Double Lives (10) — protects, hunts, watches, leaks to, shelters, hosts
  // =========================================================================
  modDual({
    id: 'mo-80', domain: 8, title: 'Protector or watcher who hunts',
    order: 'Turned guardian — take down anyone who protects as a Friend or watches as a Spy while also hunting as a Foe or hosting as a Foreigner, sparing anyone sheltered by a Civilian.',
    a: {roles: ['friend', 'spy'], dir: 'out'}, b: {roles: ['foe', 'foreigner'], dir: 'out'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  modDual({
    id: 'mo-81', domain: 8, title: 'Watcher or shelterer leaking',
    order: 'Neutralize anyone who watches as a Spy or shelters as a Civilian while leaking as a Double agent or hosting as a Foreigner; hold fire on anyone hunted by a Foe.',
    a: {roles: ['spy', 'civilian'], dir: 'out'}, b: {roles: ['double', 'foreigner'], dir: 'out'}, exc: {roles: ['foe'], dir: 'in'}
  }),
  modDual({
    id: 'mo-82', domain: 8, title: 'Sheltered or protected yet hunted',
    order: 'Take out anyone sheltered by a Civilian or protected by a Friend who is also hosted by a Foreigner or hunted by a Foe, except anyone watched by a Spy.',
    a: {roles: ['civilian', 'friend'], dir: 'in'}, b: {roles: ['foreigner', 'foe'], dir: 'in'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  modDual({
    id: 'mo-83', domain: 8, title: 'Hunter or mole under insider cover',
    order: 'Protector playing both sides: shoot anyone protected by a Friend or watched by a Spy who also hunts as a Foe or leaks as a Double agent — unless sheltered by a Civilian.',
    a: {roles: ['friend', 'spy'], dir: 'in'}, b: {roles: ['foe', 'double'], dir: 'out'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  modDual({
    id: 'mo-84', domain: 8, title: 'Host or hunter under watch',
    order: 'Two masters at once — drop anyone watched by a Spy or sheltered by a Civilian who also hosts as a Foreigner or hunts as a Foe, sparing anyone protected by a Friend.',
    a: {roles: ['spy', 'civilian'], dir: 'in'}, b: {roles: ['foreigner', 'foe'], dir: 'out'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  modDual({
    id: 'mo-85', domain: 8, title: 'Shelterer or protector who leaks',
    order: 'Engage anyone who shelters as a Civilian or protects as a Friend while leaking as a Double agent or hunting as a Foe; hold fire on anyone hosted by a Foreigner.',
    a: {roles: ['civilian', 'friend'], dir: 'out'}, b: {roles: ['double', 'foe'], dir: 'out'}, exc: {roles: ['foreigner'], dir: 'in'}
  }),
  modDual({
    id: 'mo-86', domain: 8, title: 'Hunted or hosted watcher',
    order: 'Eliminate anyone hunted by a Foe or hosted by a Foreigner who is also watched by a Spy or protected by a Friend — unless a Double agent leaks to them.',
    a: {roles: ['foe', 'foreigner'], dir: 'in'}, b: {roles: ['spy', 'friend'], dir: 'in'}, exc: {roles: ['double'], dir: 'in'}
  }),
  modDual({
    id: 'mo-87', domain: 8, title: 'Hosted or leaked to yet protected',
    order: 'Fire on anyone hosted by a Foreigner or leaked to by a Double agent who is also protected by a Friend or watched by a Spy — unless hunted by a Foe.',
    a: {roles: ['foreigner', 'double'], dir: 'in'}, b: {roles: ['friend', 'spy'], dir: 'in'}, exc: {roles: ['foe'], dir: 'in'}
  }),
  modDual({
    id: 'mo-88', domain: 8, title: 'Double agent or Foe target with shelter',
    order: 'Take down anyone leaked to by a Double agent or hunted by a Foe who is also protected by a Friend or sheltered by a Civilian, sparing anyone watched by a Spy.',
    a: {roles: ['double', 'foe'], dir: 'in'}, b: {roles: ['friend', 'civilian'], dir: 'in'}, exc: {roles: ['spy'], dir: 'in'}
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
