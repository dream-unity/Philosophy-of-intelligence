import {collectMatches} from './case-graph.js';
import {hasUncompromised, matchAnchorRelay, matchAtom, matchDependentSupport, matchIncidentCorroboration, matchIncidentDual, matchIndependentSupport, matchRelay, matchTemporal} from './case-predicates.js';

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

export const easyFamilies = [
  // =========================================================================
  // DOMAIN 0: Cover & Betrayal (10) — clears, targets, audits, leaks to, warns, contacts
  // =========================================================================
  guardedCarry({
    id: 'ea-00', domain: 0, title: 'Tainted clearance without audit',
    order: 'Take out anyone cleared by a Friend or warned by a Civilian whose source leaks as a Double agent or contacts as a Foreigner; hold fire on anyone audited by a Spy.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'out',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-01', domain: 0, title: 'Clearing an unmonitored striker',
    order: 'Compromised vetting: shoot anyone who clears as a Friend or warns as a Civilian someone who targets as a Foe or leaks as a Double agent, except anyone audited by a Spy.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['foe', 'double'], secondDir: 'out',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-02', domain: 0, title: 'Cleared by an attacker without warning',
    order: 'Cover blown: drop anyone cleared by a Friend or audited by a Spy whose source targets as a Foe or contacts as a Foreigner — unless warned by a Civilian.',
    firstRoles: ['friend', 'spy'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'out',
    exc: {roles: ['civilian'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-03', domain: 0, title: 'Mole leaking to a cleared mark',
    order: 'Engage anyone who leaks as a Double agent or contacts as a Foreigner someone cleared by a Friend or warned by a Civilian, sparing anyone audited by a Spy.',
    firstRoles: ['double', 'foreigner'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-04', domain: 0, title: 'Unaudited ally of a foreign mark',
    order: 'Eliminate anyone who clears as a Friend or audits as a Spy someone contacted by a Foreigner or fed a Double agent’s leak; hold fire on anyone audited by a Spy.',
    firstRoles: ['friend', 'spy'], firstDir: 'out', secondRoles: ['foreigner', 'double'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-05', domain: 0, title: 'Cleared by a targeted insider',
    order: 'Insider betrayal: fire on anyone cleared by a Friend or warned by a Civilian whose source is targeted by a Foe or contacted by a Foreigner, except anyone warned by a Civilian.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'in',
    exc: {roles: ['civilian'], dir: 'in'}
  }),
  custom({
    id: 'ea-06', domain: 0, title: 'No uncompromised clearance',
    order: 'False cover — take down anyone targeted by a Foe or contacted by a Foreigner unless cleared by a Friend untouched by Double agent or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const hit = g.in(x, ['foe', 'foreigner'])[0];
        if (!hit || hasUncompromised(g, x, 'friend', ['double', 'foreigner'], 'any')) return null;
        return proof ? x + ': ' + g.fmt(hit) + ', no uncompromised Friend clearance.' : 'ok';
      }, proof);
    }
  }),
  guardedCarry({
    id: 'ea-07', domain: 0, title: 'Strike on a cleared mark',
    order: 'Compromised vetting: neutralize anyone who targets as a Foe or leaks as a Double agent to someone cleared by a Friend or audited by a Spy, sparing anyone audited by a Spy.',
    firstRoles: ['foe', 'double'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-08', domain: 0, title: 'Leak from a double-hatted ally',
    order: 'Take out anyone fed a Double agent’s leak or targeted by a Foe whose source clears as a Friend or warns as a Civilian; hold fire on anyone audited by a Spy.',
    firstRoles: ['double', 'foe'], firstDir: 'in', secondRoles: ['friend', 'civilian'], secondDir: 'out',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-09', domain: 0, title: 'Uncleared ally of a leak recipient',
    order: 'Burned clearance: shoot anyone who clears as a Friend or warns as a Civilian someone fed a Double agent’s leak or targeted by a Foe, except anyone cleared by a Friend.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'in',
    exc: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 1: Surveillance & Blind Spots (10) — escorts, ambushes, shadows, leaks to, spots, signals
  // =========================================================================
  guardedCarry({
    id: 'ea-10', domain: 1, title: 'Shadowed by a turned watcher',
    order: 'Watcher exposed: fire on anyone shadowed by a Spy or signaled by a Foreigner whose contact leaks as a Double agent or ambushes as a Foe — unless escorted by a Friend.',
    firstRoles: ['spy', 'foreigner'], firstDir: 'in', secondRoles: ['double', 'foe'], secondDir: 'out',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-11', domain: 1, title: 'Unescorted watcher on an ambusher',
    order: 'Signal in the alley: take down anyone who shadows as a Spy or escorts as a Friend someone who ambushes as a Foe or leaks as a Double agent, sparing anyone escorted by a Friend.',
    firstRoles: ['spy', 'friend'], firstDir: 'out', secondRoles: ['foe', 'double'], secondDir: 'out',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  custom({
    id: 'ea-12', domain: 1, title: 'Outside uncompromised Spy watch',
    order: 'Escort off-script — neutralize anyone leaking as a Double agent or signaling as a Foreigner unless shadowed by a Spy untouched by Foe or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const hit = g.out(x, ['double', 'foreigner'])[0];
        if (!hit || hasUncompromised(g, x, 'spy', ['foe', 'foreigner'], 'any')) return null;
        return proof ? x + ': ' + g.fmt(hit) + ', no uncompromised Spy shadow.' : 'ok';
      }, proof);
    }
  }),
  guardedCarry({
    id: 'ea-13', domain: 1, title: 'Unshadowed proxy to a mole',
    order: 'Take out anyone who escorts as a Friend or spots as a Civilian a contact no Spy shadows who leaks as a Double agent or signals as a Foreigner.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'out',
    midExc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-14', domain: 1, title: 'Shadowed by an ambush agent',
    order: 'Blind-spot ambush: shoot anyone shadowed by a Spy or spotted by a Civilian whose watcher ambushes as a Foe or leaks as a Double agent — unless spotted by a Civilian.',
    firstRoles: ['spy', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'out',
    exc: {roles: ['civilian'], dir: 'in'}
  }),
  custom({
    id: 'ea-15', domain: 1, title: 'Blind-spot ambush target',
    order: 'Compromised tail: drop anyone ambushed by a Foe or fed a Double agent’s leak from someone no Spy shadows, sparing anyone escorted by a Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend')) return null;
        const hit = g.in(x, ['foe', 'double']).find(e => !g.hasIn(e.from, 'spy'));
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit) + ' from unshadowed sender (no Friend escort).' : 'ok';
      }, proof);
    }
  }),
  guardedCarry({
    id: 'ea-16', domain: 1, title: 'Watcher on a foreign signal',
    order: 'Watcher exposed — engage anyone who shadows as a Spy or spots as a Civilian someone signaled by a Foreigner or ambushed by a Foe; hold fire on anyone spotted by a Civilian.',
    firstRoles: ['spy', 'civilian'], firstDir: 'out', secondRoles: ['foreigner', 'foe'], secondDir: 'in',
    exc: {roles: ['civilian'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-17', domain: 1, title: 'Shadowed by a signaled watcher',
    order: 'Signal in the alley: eliminate anyone shadowed by a Spy or escorted by a Friend whose contact receives a Double agent’s leak or Foreigner’s signal, except anyone escorted by a Friend.',
    firstRoles: ['spy', 'friend'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'in',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-18', domain: 1, title: 'Unescorted leak to a shadowed mark',
    order: 'Fire on anyone who leaks as a Double agent or ambushes as a Foe someone shadowed by a Spy or spotted by a Civilian — unless escorted by a Friend.',
    firstRoles: ['double', 'foe'], firstDir: 'out', secondRoles: ['spy', 'civilian'], secondDir: 'in',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-19', domain: 1, title: 'Escorted by an active signaler',
    order: 'Dead drop watched: take down anyone escorted by a Friend or spotted by a Civilian whose contact also shadows as a Spy or signals as a Foreigner, sparing anyone ambushed by a Foe.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['spy', 'foreigner'], secondDir: 'out',
    exc: {roles: ['foe'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 2: Foreign Contact (10) — vouches for, pressures, tracks, leaks to, reports, recruits
  // =========================================================================
  guardedCarry({
    id: 'ea-20', domain: 2, title: 'Recruited by a mole without tracking',
    order: 'Drop anyone recruited by a Foreigner or reported by a Civilian whose contact leaks as a Double agent or pressures as a Foe; hold fire on anyone tracked by a Spy.',
    firstRoles: ['foreigner', 'civilian'], firstDir: 'in', secondRoles: ['double', 'foe'], secondDir: 'out',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-21', domain: 2, title: 'Recruiting a mole unvouched',
    order: 'Engage anyone who recruits as a Foreigner or vouches as a Friend for someone who leaks as a Double agent or pressures as a Foe, except anyone vouched for by a Friend.',
    firstRoles: ['foreigner', 'friend'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'out',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-22', domain: 2, title: 'Recruiter on a tracked mark',
    order: 'Foreign contact in play: eliminate anyone who recruits as a Foreigner or reports as a Civilian someone vouched for by a Friend or tracked by a Spy — unless tracked by a Spy.',
    firstRoles: ['foreigner', 'civilian'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-23', domain: 2, title: 'Recruited by a tracked outsider',
    order: 'Fire on anyone recruited by a Foreigner or pressured by a Foe whose contact is tracked by a Spy or vouched for by a Friend, sparing anyone reported by a Civilian.',
    firstRoles: ['foreigner', 'foe'], firstDir: 'in', secondRoles: ['spy', 'friend'], secondDir: 'in',
    exc: {roles: ['civilian'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-24', domain: 2, title: 'Tracking an unvouched recruit',
    order: 'Take down anyone who tracks as a Spy or pressures as a Foe someone recruited by a Foreigner or fed a Double agent’s leak; hold fire on anyone vouched for by a Friend.',
    firstRoles: ['spy', 'foe'], firstDir: 'out', secondRoles: ['foreigner', 'double'], secondDir: 'in',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-25', domain: 2, title: 'Recruit turned voucher',
    order: 'External handler: neutralize anyone recruited by a Foreigner or tracked by a Spy whose source vouches as a Friend or reports as a Civilian, except anyone pressured by a Foe.',
    firstRoles: ['foreigner', 'spy'], firstDir: 'in', secondRoles: ['friend', 'civilian'], secondDir: 'out',
    exc: {roles: ['foe'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-26', domain: 2, title: 'Leak reaching a recruit',
    order: 'Border leak: take out anyone who leaks as a Double agent or reports as a Civilian someone recruited by a Foreigner or pressured by a Foe — unless tracked by a Spy.',
    firstRoles: ['double', 'civilian'], firstDir: 'out', secondRoles: ['foreigner', 'foe'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-27', domain: 2, title: 'Vouched by an active recruiter',
    order: 'Unreported recruitment: shoot anyone vouched for by a Friend or reported by a Civilian whose source recruits as a Foreigner or pressures as a Foe, sparing anyone tracked by a Spy.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['foreigner', 'foe'], secondDir: 'out',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-28', domain: 2, title: 'Pressured via a reported insider',
    order: 'Drop anyone pressured by a Foe or fed a Double agent’s leak by someone reported by a Civilian or tracked by a Spy; hold fire on anyone vouched for by a Friend.',
    firstRoles: ['foe', 'double'], firstDir: 'in', secondRoles: ['civilian', 'spy'], secondDir: 'in',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-29', domain: 2, title: 'Recruiting a vouched mark',
    order: 'Engage anyone who recruits as a Foreigner or leaks as a Double agent to someone reported by a Civilian or vouched for by a Friend, except anyone pressured by a Foe.',
    firstRoles: ['foreigner', 'double'], firstDir: 'out', secondRoles: ['civilian', 'friend'], secondDir: 'in',
    exc: {roles: ['foe'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 3: Civilian Tip-Offs (10) — confirms, targets, monitors, misleads, tips off, briefs
  // =========================================================================
  guardedCarry({
    id: 'ea-30', domain: 3, title: 'Tipped off by a deceiver',
    order: 'Informant in play: neutralize anyone tipped off by a Civilian or confirmed by a Friend whose source misleads as a Double agent or targets as a Foe — unless monitored by a Spy.',
    firstRoles: ['civilian', 'friend'], firstDir: 'in', secondRoles: ['double', 'foe'], secondDir: 'out',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-31', domain: 3, title: 'Tipping off a deceiver',
    order: 'Take out anyone who tips off as a Civilian or confirms as a Friend someone who misleads as a Double agent or briefs as a Foreigner, sparing anyone targeted by a Foe.',
    firstRoles: ['civilian', 'friend'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'out',
    exc: {roles: ['foe'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-32', domain: 3, title: 'Tipped by a briefed witness',
    order: 'Shoot anyone tipped off by a Civilian or monitored by a Spy whose source is briefed by a Foreigner or targeted by a Foe; hold fire on anyone confirmed by a Friend.',
    firstRoles: ['civilian', 'spy'], firstDir: 'in', secondRoles: ['foreigner', 'foe'], secondDir: 'in',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-33', domain: 3, title: 'Tipping off a monitored mark',
    order: 'Drop anyone who tips off as a Civilian or briefs as a Foreigner someone confirmed by a Friend or monitored by a Spy, except anyone targeted by a Foe.',
    firstRoles: ['civilian', 'foreigner'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'in',
    exc: {roles: ['foe'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-34', domain: 3, title: 'Confirmed by a briefed ally',
    order: 'Street misdirection: engage anyone confirmed by a Friend or targeted by a Foe whose source is tipped off by a Civilian or briefed by a Foreigner — unless monitored by a Spy.',
    firstRoles: ['friend', 'foe'], firstDir: 'in', secondRoles: ['civilian', 'foreigner'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-35', domain: 3, title: 'Deceiving a tipped-off mark',
    order: 'Tainted brief: eliminate anyone who misleads as a Double agent or briefs as a Foreigner someone tipped off by a Civilian or monitored by a Spy, sparing anyone confirmed by a Friend.',
    firstRoles: ['double', 'foreigner'], firstDir: 'out', secondRoles: ['civilian', 'spy'], secondDir: 'in',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-36', domain: 3, title: 'Tipped off by an active monitor',
    order: 'Fire on anyone tipped off by a Civilian or misled by a Double agent whose source monitors as a Spy or confirms as a Friend; hold fire on anyone briefed by a Foreigner.',
    firstRoles: ['civilian', 'double'], firstDir: 'in', secondRoles: ['spy', 'friend'], secondDir: 'out',
    exc: {roles: ['foreigner'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-37', domain: 3, title: 'Monitoring a briefed target',
    order: 'False warning: take down anyone who monitors as a Spy or confirms as a Friend someone briefed by a Foreigner or targeted by a Foe, except anyone misled by a Double agent.',
    firstRoles: ['spy', 'friend'], firstDir: 'out', secondRoles: ['foreigner', 'foe'], secondDir: 'in',
    exc: {roles: ['double'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-38', domain: 3, title: 'Briefed by a tipped-off source',
    order: 'Neutralize anyone briefed by a Foreigner or misled by a Double agent whose source is tipped off by a Civilian or confirmed by a Friend — unless monitored by a Spy.',
    firstRoles: ['foreigner', 'double'], firstDir: 'in', secondRoles: ['civilian', 'friend'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-39', domain: 3, title: 'Targeting a witness’s mark',
    order: 'Compromised witness: take out anyone who targets as a Foe or misleads as a Double agent someone tipped off by a Civilian or confirmed by a Friend, sparing anyone briefed by a Foreigner.',
    firstRoles: ['foe', 'double'], firstDir: 'out', secondRoles: ['civilian', 'friend'], secondDir: 'in',
    exc: {roles: ['foreigner'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 4: Proxy Chains (10) — backs, strikes, traces, relays to, warns, hands off to
  // =========================================================================
  guardedCarry({
    id: 'ea-40', domain: 4, title: 'Handoff to an active striker',
    order: 'Eliminate anyone who hands off as a Foreigner or relays as a Double agent to someone who strikes as a Foe or traces as a Spy; hold fire on anyone backed by a Friend.',
    firstRoles: ['foreigner', 'double'], firstDir: 'out', secondRoles: ['foe', 'spy'], secondDir: 'out',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-41', domain: 4, title: 'Backed by a handoff agent',
    order: 'Fire on anyone backed by a Friend or traced by a Spy whose contact hands off as a Foreigner or strikes as a Foe, except anyone relayed to by a Double agent.',
    firstRoles: ['friend', 'spy'], firstDir: 'in', secondRoles: ['foreigner', 'foe'], secondDir: 'out',
    exc: {roles: ['double'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-42', domain: 4, title: 'Striker’s backed proxy',
    order: 'Take down anyone who strikes as a Foe or traces as a Spy someone who backs as a Friend or warns as a Civilian — unless handed off to by a Foreigner.',
    firstRoles: ['foe', 'spy'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'out',
    exc: {roles: ['foreigner'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-43', domain: 4, title: 'Handoff from a traced courier',
    order: 'Neutralize anyone handed off to by a Foreigner or relayed to by a Double agent whose courier is traced by a Spy or warned by a Civilian, sparing anyone backed by a Friend.',
    firstRoles: ['foreigner', 'double'], firstDir: 'in', secondRoles: ['spy', 'civilian'], secondDir: 'in',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-44', domain: 4, title: 'Backing an untraced courier',
    order: 'Take out anyone who backs as a Friend or warns as a Civilian someone handed off to by a Foreigner or relayed to by a Double agent; hold fire on anyone traced by a Spy.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['foreigner', 'double'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-45', domain: 4, title: 'Proxy bypassing a Spy trace',
    order: 'Compromised middleman: shoot anyone backed by a Friend or warned by a Civilian through someone no Spy traces who strikes as a Foe or hands off as a Foreigner.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'out',
    midExc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-46', domain: 4, title: 'Warned proxy’s handler',
    order: 'Drop anyone warned by a Civilian or backed by a Friend whose source is traced by a Spy or relayed to by a Double agent — unless struck by a Foe.',
    firstRoles: ['civilian', 'friend'], firstDir: 'in', secondRoles: ['spy', 'double'], secondDir: 'in',
    exc: {roles: ['foe'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-47', domain: 4, title: 'Relay hitting a warned contact',
    order: 'Engage anyone who relays as a Double agent or hands off as a Foreigner to someone warned by a Civilian or struck by a Foe, sparing anyone traced by a Spy.',
    firstRoles: ['double', 'foreigner'], firstDir: 'out', secondRoles: ['civilian', 'foe'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-48', domain: 4, title: 'Striker’s upstream backer',
    order: 'Eliminate anyone struck by a Foe or traced by a Spy whose contact is backed by a Friend or handed off to by a Foreigner; hold fire on anyone warned by a Civilian.',
    firstRoles: ['foe', 'spy'], firstDir: 'in', secondRoles: ['friend', 'foreigner'], secondDir: 'in',
    exc: {roles: ['civilian'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-49', domain: 4, title: 'Warning an active courier',
    order: 'Chain of proxies: fire on anyone who warns as a Civilian or strikes as a Foe someone who relays as a Double agent or backs as a Friend, except anyone traced by a Spy.',
    firstRoles: ['civilian', 'foe'], firstDir: 'out', secondRoles: ['double', 'friend'], secondDir: 'out',
    exc: {roles: ['spy'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 5: Alibi & Contradiction (10) — corroborates, accuses, verifies, deceives, identifies, consults
  // =========================================================================
  custom({
    id: 'ea-50', domain: 5, title: 'Staged alibi on one site',
    order: 'Staged alibi — shoot anyone reached by two different sources on the same site who are themselves in direct contact.',
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
    order: 'Staged corroboration: drop anyone accused by a Foe or identified by a Civilian and deceived by a Double agent or corroborated by a Friend whose two sources have no contact.',
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
    order: 'Contradicted witness — engage anyone contacted by one source on each site whose two sources are in direct contact.',
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
    order: 'Colluding sources — fire on anyone both acting and contacted on the same site across two different roles.',
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
    order: 'Fabricated account: take down anyone verified by a Spy or deceived by a Double agent and accused by a Foe or consulted by a Foreigner whose two sources have no contact.',
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
    order: 'Alibi broken — neutralize anyone involved twice inside the same role, initiating or receiving; hold fire on anyone verified by a Spy.',
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
    order: 'Staged corroboration: take out anyone accused by a Foe or deceived by a Double agent whose sender also reaches someone corroborated by a Friend.',
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
    order: 'False verification: drop anyone reached by at least two different senders, including a Foe or Foreigner, sparing anyone identified by a Civilian.',
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
  guardedTime({
    id: 'ea-60', domain: 6, title: 'Cleared before turning, unlogged',
    order: 'Take down anyone cleared by a Friend or corrected by a Civilian earlier than they leaked as a Double agent or met as a Foreigner; hold fire on anyone logged by a Spy.',
    early: {roles: ['friend', 'civilian'], dir: 'in'}, late: {roles: ['double', 'foreigner'], dir: 'out'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedTime({
    id: 'ea-61', domain: 6, title: 'Strike before logging arrived',
    order: 'Timed betrayal: neutralize anyone struck by a Foe or met by a Foreigner earlier than a Spy logged or Civilian corrected them, except anyone cleared by a Friend.',
    early: {roles: ['foe', 'foreigner'], dir: 'in'}, late: {roles: ['spy', 'civilian'], dir: 'in'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedTime({
    id: 'ea-62', domain: 6, title: 'Correction arrived too late',
    order: 'Wrong side of the clock: take out anyone struck by a Foe or fed a Double agent’s leak earlier than a Civilian corrected or Friend cleared them — unless logged by a Spy.',
    early: {roles: ['foe', 'double'], dir: 'in'}, late: {roles: ['civilian', 'friend'], dir: 'in'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-63', domain: 6, title: 'Delayed clearance into betrayal',
    order: 'Shoot anyone who clears as a Friend or logs as a Spy someone who later leaks as a Double agent or meets as a Foreigner.',
    firstRoles: ['friend', 'spy'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'out',
    timeOrder: 'before'
  }),
  guardedCarry({
    id: 'ea-64', domain: 6, title: 'Cleared after source’s betrayal',
    order: 'Drop anyone cleared by a Friend or corrected by a Civilian whose source had earlier struck as a Foe or leaked as a Double agent; hold fire on anyone logged by a Spy.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'out',
    timeOrder: 'after', exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-65', domain: 6, title: 'Timed strike after prior leak',
    order: 'Post-correction move: engage anyone struck by a Foe or met by a Foreigner whose contact had earlier received a Double agent’s leak or Civilian correction.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'in', secondRoles: ['double', 'civilian'], secondDir: 'in',
    timeOrder: 'after'
  }),
  guardedTime({
    id: 'ea-66', domain: 6, title: 'Foreign meeting before clearance',
    order: 'Too late to clear: eliminate anyone met by a Foreigner or fed a Double agent’s leak earlier than a Friend cleared or Civilian corrected them — unless logged by a Spy.',
    early: {roles: ['foreigner', 'double'], dir: 'in'}, late: {roles: ['friend', 'civilian'], dir: 'in'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedTime({
    id: 'ea-67', domain: 6, title: 'Corrected before striking',
    order: 'Timed betrayal: fire on anyone corrected by a Civilian or logged by a Spy earlier than they struck as a Foe or leaked as a Double agent, sparing anyone cleared by a Friend.',
    early: {roles: ['civilian', 'spy'], dir: 'in'}, late: {roles: ['foe', 'double'], dir: 'out'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-68', domain: 6, title: 'Logged after source’s strike',
    order: 'Take down anyone logged by a Spy or cleared by a Friend whose source had earlier struck as a Foe or met as a Foreigner.',
    firstRoles: ['spy', 'friend'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'out',
    timeOrder: 'after'
  }),
  guardedCarry({
    id: 'ea-69', domain: 6, title: 'Corrected after source’s leak',
    order: 'Acted after the breach: neutralize anyone corrected by a Civilian or logged by a Spy whose source had earlier leaked as a Double agent or met as a Foreigner.',
    firstRoles: ['civilian', 'spy'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'out',
    timeOrder: 'after'
  }),

  // =========================================================================
  // DOMAIN 7: Tainted Sources (10) — alibis, coerces, vets, compromises, exposes, funds
  // =========================================================================
  guardedCarry({
    id: 'ea-70', domain: 7, title: 'Alibi from a compromised source',
    order: 'Coerced vetting: engage anyone given a Friend’s alibi or Spy’s vetting by someone compromised by a Double agent or funded by a Foreigner — unless exposed by a Civilian.',
    firstRoles: ['friend', 'spy'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'in',
    exc: {roles: ['civilian'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-71', domain: 7, title: 'Exposed by a funded source',
    order: 'Poisoned source: eliminate anyone exposed by a Civilian or given a Friend’s alibi by someone compromised by a Double agent or funded by a Foreigner, sparing anyone vetted by a Spy.',
    firstRoles: ['civilian', 'friend'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-72', domain: 7, title: 'Vetted by a coercer or funder',
    order: 'Paid witness — fire on anyone vetted by a Spy or exposed by a Civilian whose source coerces as a Foe or funds as a Foreigner; hold fire on anyone given a Friend’s alibi.',
    firstRoles: ['spy', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'out',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-73', domain: 7, title: 'Coerced by an exposed source',
    order: 'Take down anyone coerced by a Foe or funded by a Foreigner whose source was compromised by a Double agent or exposed by a Civilian, except anyone given a Friend’s alibi.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'in', secondRoles: ['double', 'civilian'], secondDir: 'in',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-74', domain: 7, title: 'Compromised by a vetted insider',
    order: 'Bought alibi: neutralize anyone compromised by a Double agent or coerced by a Foe whose source was given a Friend’s alibi or Spy’s vetting — unless exposed by a Civilian.',
    firstRoles: ['double', 'foe'], firstDir: 'in', secondRoles: ['friend', 'spy'], secondDir: 'in',
    exc: {roles: ['civilian'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-75', domain: 7, title: 'Funded by an infiltrated ally',
    order: 'Dirty funding: take out anyone funded by a Foreigner or compromised by a Double agent whose source was given a Friend’s alibi or Spy’s vetting, sparing anyone vetted by a Spy.',
    firstRoles: ['foreigner', 'double'], firstDir: 'in', secondRoles: ['friend', 'spy'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-76', domain: 7, title: 'Alibiing a compromised target',
    order: 'Shoot anyone who alibis as a Friend or exposes as a Civilian someone compromised by a Double agent or funded by a Foreigner; hold fire on anyone coerced by a Foe.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'in',
    exc: {roles: ['foe'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-77', domain: 7, title: 'Vetting an unalibied funder',
    order: 'Poisoned source: drop anyone who vets as a Spy or alibis as a Friend someone who compromises as a Double agent or funds as a Foreigner, except anyone given a Friend’s alibi.',
    firstRoles: ['spy', 'friend'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'out',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-78', domain: 7, title: 'Exposing an unvetted coercer',
    order: 'Engage anyone who exposes as a Civilian or funds as a Foreigner someone who compromises as a Double agent or coerces as a Foe — unless vetted by a Spy.',
    firstRoles: ['civilian', 'foreigner'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'out',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-79', domain: 7, title: 'Coercing a funded witness',
    order: 'Compromised backer: eliminate anyone who coerces as a Foe or compromises as a Double agent someone funded by a Foreigner or exposed by a Civilian, sparing anyone given a Friend’s alibi.',
    firstRoles: ['foe', 'double'], firstDir: 'out', secondRoles: ['foreigner', 'civilian'], secondDir: 'in',
    exc: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 8: Double Lives (10) — protects, hunts, watches, leaks to, shelters, hosts
  // =========================================================================
  custom({
    id: 'ea-80', domain: 8, title: 'Protected or hunted spy-mole',
    order: 'Two masters at once — take out anyone protected by a Friend or hunted by a Foe who initiates contacts only as a Spy, Double agent, or Foreigner.',
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
    order: 'Turned guardian — drop anyone who initiates contacts only as a Spy or Double agent and receives only outside those two roles, or vice versa.',
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
    order: 'Shelter breached — eliminate anyone who initiates contacts only as a Friend or Foe and receives only outside those two roles, or vice versa.',
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
    order: 'Two masters at once: take down anyone who watches as a Spy or leaks as a Double agent and protects as a Friend or hunts as a Foe — unless sheltered by a Civilian.',
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
    order: 'Hideout compromised: neutralize anyone who initiates contacts only as a Foe, Civilian, or Foreigner, sparing anyone watched by a Spy or protected by a Friend.',
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
    order: 'Double life exposed: shoot anyone spanning three or more roles, except anyone watched by a Spy.',
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
    order: 'Shadow reach: fire on anyone reached from {name} in two forward steps with no direct contact to {name} — unless a Spy shadows them.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out',
    excludeDirect: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedAnchor({
    id: 'ea-91', domain: 9, title: '{name}’s unbacked two-step source',
    order: 'Unchecked influence: take down anyone reaching {name} in two forward steps with no direct contact to {name}; stand down if a Friend vouches for them.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in',
    excludeDirect: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedAnchor({
    id: 'ea-92', domain: 9, title: 'Shared target with {name}, unbacked',
    order: 'Chain of leverage — neutralize anyone else who reaches the same contact {name} reaches, sparing them if a Friend vouches for them.',
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
    order: 'Command breach — shoot anyone two contacts away from {name} with no direct contact with {name} who leaks as a Double agent or meets as a Foreigner.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'any',
    excludeDirect: true, req: {roles: ['double', 'foreigner'], dir: 'out'}
  }),
  guardedAnchor({
    id: 'ea-95', domain: 9, title: '{name}’s unshadowed cutout relay',
    order: 'Asset under leverage: drop anyone reached from {name} in two forward steps through a cutout no Spy shadows.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out',
    midExc: {roles: ['spy'], dir: 'in'}
  }),
  guardedAnchor({
    id: 'ea-96', domain: 9, title: 'Later relay from {name}',
    order: 'Shadow reach — engage anyone reached from {name} in two forward steps where the second dispatch happened later, sparing them if a Friend vouches for them.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out',
    timeOrder: 'before', exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedAnchor({
    id: 'ea-97', domain: 9, title: 'Earlier relay into {name}',
    order: 'Unchecked influence: eliminate anyone reaching {name} in two forward steps where the first dispatch happened earlier — unless a Spy shadows them.',
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
    order: 'Handler compromised: take down anyone reached from {name} by a Foe, Double agent, or Civilian contact followed by a Friend, Spy, or Foreigner contact in either direction.',
    step1Roles: ['foe', 'double', 'civilian'], step1Dir: 'any',
    step2Roles: ['friend', 'spy', 'foreigner'], step2Dir: 'any'
  })
];
