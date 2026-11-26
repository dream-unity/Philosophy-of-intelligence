import {collectMatches} from './case-graph.js';
import {hasCleanFriend, hasCleanSpy, matchAnchorRelay, matchAtom, matchRelay, matchTemporal} from './case-predicates.js';

// 100 genuinely distinct Easy intelligence cases (10 domains × 10 families).
// Guarded 2-step relays, timing + cover checks, clean-vs-compromised source calls, and anchor chains —
// paired with 1 disputed dispatch settled via a leak-free symmetric (= / ≠) cross-check.
// Two-role entry steps guarantee balanced variable targets (1–4), zero column shortcuts, and crisp officer directives.

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

function guardedAnchor({id, domain, title, order, step1Roles, step1Dir, step2Roles, step2Dir, excludeDirect = false, timeOrder = null, midExc = null, req = null, exc = null}) {
  return {
    id, tier: 'easy', domain, title, order, hint: '', useAnchor: true,
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        if (req && !matchAtom(g, x, req).length) return null;
        const hit = matchAnchorRelay(g, anchor, x, {step1Roles, step1Dir, step2Roles, step2Dir, excludeDirect, timeOrder, midExc});
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
  // DOMAIN 0: Cover & Betrayal (10)
  // =========================================================================
  guardedCarry({
    id: 'ea-00', domain: 0, title: 'Tainted clearance without watch',
    order: 'Shoot anyone vouched for by a Friend or tipped off by a Civilian who leaks as a Double agent or meets as a Foreigner — unless a Spy shadows them.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'out',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-01', domain: 0, title: 'Backing a striker unmonitored',
    order: 'Shoot anyone who vouches as a Friend or tips off as a Civilian someone who targets as a Foe or leaks as a Double agent — unless a Spy shadows them.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['foe', 'double'], secondDir: 'out',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-02', domain: 0, title: 'Backed by an attacker without warning',
    order: 'Shoot anyone vouched for by a Friend or shadowed by a Spy who also targets as a Foe or meets as a Foreigner — unless a Civilian tips them off.',
    firstRoles: ['friend', 'spy'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'out',
    exc: {roles: ['civilian'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-03', domain: 0, title: 'Mole leaking to a backed operative',
    order: 'Shoot anyone who leaks as a Double agent or meets as a Foreigner someone backed by a Friend or tipped off by a Civilian — unless a Spy shadows them.',
    firstRoles: ['double', 'foreigner'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-04', domain: 0, title: 'Unwatched ally of a border contact',
    order: 'Shoot anyone who vouches as a Friend or shadows as a Spy someone met by a Foreigner or fed a Double agent’s leak — unless a Spy shadows them.',
    firstRoles: ['friend', 'spy'], firstDir: 'out', secondRoles: ['foreigner', 'double'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-05', domain: 0, title: 'Backed by a targeted source',
    order: 'Shoot anyone vouched for by a Friend or tipped off by a Civilian who is targeted by a Foe or met by a Foreigner — unless a Civilian tips them off.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'in',
    exc: {roles: ['civilian'], dir: 'in'}
  }),
  custom({
    id: 'ea-06', domain: 0, title: 'No clean Friend shield',
    order: 'Shoot anyone targeted by a Foe or met by a Foreigner with no clean Friend vouching for them (a Friend free of Double agent or Foreigner ties).',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const hit = g.in(x, ['foe', 'foreigner'])[0];
        if (!hit || hasCleanFriend(g, x)) return null;
        return proof ? x + ': ' + g.fmt(hit) + ', no clean Friend voucher.' : 'ok';
      }, proof);
    }
  }),
  guardedCarry({
    id: 'ea-07', domain: 0, title: 'Strike on a backed operative',
    order: 'Shoot anyone who targets as a Foe or leaks as a Double agent to someone backed by a Friend or shadowed by a Spy — unless a Spy shadows them.',
    firstRoles: ['foe', 'double'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-08', domain: 0, title: 'Leak from a double-hatted insider',
    order: 'Shoot anyone fed a Double agent’s leak or targeted by a Foe who also vouches as a Friend or tips off as a Civilian — unless a Spy shadows them.',
    firstRoles: ['double', 'foe'], firstDir: 'in', secondRoles: ['friend', 'civilian'], secondDir: 'out',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-09', domain: 0, title: 'Unbacked ally of a leak recipient',
    order: 'Shoot anyone who vouches as a Friend or tips off as a Civilian someone fed a Double agent’s leak or targeted by a Foe — unless a Friend vouches for them.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'in',
    exc: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 1: Surveillance & Blind Spots (10)
  // =========================================================================
  guardedCarry({
    id: 'ea-10', domain: 1, title: 'Watched by a turned Spy',
    order: 'Shoot anyone shadowed by a Spy or met by a Foreigner who also leaks as a Double agent or targets as a Foe — unless a Friend vouches for them.',
    firstRoles: ['spy', 'foreigner'], firstDir: 'in', secondRoles: ['double', 'foe'], secondDir: 'out',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-11', domain: 1, title: 'Unbacked watcher on a striker',
    order: 'Shoot anyone who shadows as a Spy or vouches as a Friend someone who targets as a Foe or leaks as a Double agent — unless a Friend vouches for them.',
    firstRoles: ['spy', 'friend'], firstDir: 'out', secondRoles: ['foe', 'double'], secondDir: 'out',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  custom({
    id: 'ea-12', domain: 1, title: 'Outside clean Spy watch',
    order: 'Shoot anyone leaking as a Double agent or meeting as a Foreigner without a clean Spy shadowing them (free of Foe, Double agent, or Foreigner ties).',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const hit = g.out(x, ['double', 'foreigner'])[0];
        if (!hit || hasCleanSpy(g, x)) return null;
        return proof ? x + ': ' + g.fmt(hit) + ', no clean Spy watch.' : 'ok';
      }, proof);
    }
  }),
  guardedCarry({
    id: 'ea-13', domain: 1, title: 'Unwatched proxy to a mole',
    order: 'Shoot anyone who vouches as a Friend or tips off as a Civilian an unwatched contact (no Spy shadow) who leaks as a Double agent or meets as a Foreigner.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'out',
    midExc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-14', domain: 1, title: 'Shadowed by a strike agent',
    order: 'Shoot anyone shadowed by a Spy or tipped off by a Civilian who also targets as a Foe or leaks as a Double agent — unless a Civilian tips them off.',
    firstRoles: ['spy', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'out',
    exc: {roles: ['civilian'], dir: 'in'}
  }),
  custom({
    id: 'ea-15', domain: 1, title: 'Blind-spot strike target',
    order: 'Shoot anyone targeted by an unwatched Foe or fed by an unwatched Double agent (no Spy on the actor) — unless a Friend vouches for them.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend')) return null;
        const hit = g.in(x, ['foe', 'double']).find(e => !g.hasIn(e.from, 'spy'));
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit) + ' from unwatched actor (no Friend backing).' : 'ok';
      }, proof);
    }
  }),
  guardedCarry({
    id: 'ea-16', domain: 1, title: 'Watcher on a foreign drop',
    order: 'Shoot anyone who shadows as a Spy or tips off as a Civilian someone met by a Foreigner or targeted by a Foe — unless a Civilian tips them off.',
    firstRoles: ['spy', 'civilian'], firstDir: 'out', secondRoles: ['foreigner', 'foe'], secondDir: 'in',
    exc: {roles: ['civilian'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-17', domain: 1, title: 'Watched by a compromised Spy',
    order: 'Shoot anyone shadowed by a Spy or vouched for by a Friend who receives a Double agent’s leak or Foreigner visit — unless a Friend vouches for them.',
    firstRoles: ['spy', 'friend'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'in',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-18', domain: 1, title: 'Unbacked leak to a watched mark',
    order: 'Shoot anyone who leaks as a Double agent or targets as a Foe someone shadowed by a Spy or tipped off by a Civilian — unless a Friend vouches for them.',
    firstRoles: ['double', 'foe'], firstDir: 'out', secondRoles: ['spy', 'civilian'], secondDir: 'in',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-19', domain: 1, title: 'Backed by an active watcher',
    order: 'Shoot anyone vouched for by a Friend or tipped off by a Civilian who also shadows as a Spy or meets as a Foreigner — unless targeted by a Foe.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['spy', 'foreigner'], secondDir: 'out',
    exc: {roles: ['foe'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 2: Foreign Contact (10)
  // =========================================================================
  guardedCarry({
    id: 'ea-20', domain: 2, title: 'Unwatched border recruit',
    order: 'Shoot anyone met by a Foreigner or tipped off by a Civilian who also leaks as a Double agent or targets as a Foe — unless a Spy shadows them.',
    firstRoles: ['foreigner', 'civilian'], firstDir: 'in', secondRoles: ['double', 'foe'], secondDir: 'out',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-21', domain: 2, title: 'Unwatched visitor to a striker',
    order: 'Shoot anyone who meets as a Foreigner or shadows as a Spy someone who leaks as a Double agent or targets as a Foe — unless a Spy shadows them.',
    firstRoles: ['foreigner', 'spy'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'out',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-22', domain: 2, title: 'Outsider meeting a backed ward',
    order: 'Shoot anyone who meets as a Foreigner or targets as a Foe someone backed by a Friend or tipped off by a Civilian — unless a Spy shadows them.',
    firstRoles: ['foreigner', 'foe'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-23', domain: 2, title: 'Unbacked foreign contact',
    order: 'Shoot anyone met by a Foreigner or fed a Double agent’s leak by someone who also vouches as a Friend or tips off as a Civilian — unless a Friend vouches for them.',
    firstRoles: ['foreigner', 'double'], firstDir: 'in', secondRoles: ['friend', 'civilian'], secondDir: 'out',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-24', domain: 2, title: 'Outsider reaching a warned mark',
    order: 'Shoot anyone who meets as a Foreigner or leaks as a Double agent to someone tipped off by a Civilian or shadowed by a Spy — unless a Spy shadows them.',
    firstRoles: ['foreigner', 'double'], firstDir: 'out', secondRoles: ['civilian', 'spy'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-25', domain: 2, title: 'Border link through a leaked-to source',
    order: 'Shoot anyone met by a Foreigner or targeted by a Foe who received a Double agent’s leak or Civilian tip-off — unless a Spy shadows them.',
    firstRoles: ['foreigner', 'foe'], firstDir: 'in', secondRoles: ['double', 'civilian'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-26', domain: 2, title: 'Mole feeding a border contact',
    order: 'Shoot anyone who leaks as a Double agent or shadows as a Spy someone met by a Foreigner or targeted by a Foe — unless a Friend vouches for them.',
    firstRoles: ['double', 'spy'], firstDir: 'out', secondRoles: ['foreigner', 'foe'], secondDir: 'in',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-27', domain: 2, title: 'Strike on a border contact',
    order: 'Shoot anyone who targets as a Foe or tips off as a Civilian someone met by a Foreigner or fed a Double agent’s leak — unless a Spy shadows them.',
    firstRoles: ['foe', 'civilian'], firstDir: 'out', secondRoles: ['foreigner', 'double'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-28', domain: 2, title: 'Unwarned contact of a watched outsider',
    order: 'Shoot anyone met by a Foreigner or targeted by a Foe who is shadowed by a Spy or vouched for by a Friend — unless a Civilian tips them off.',
    firstRoles: ['foreigner', 'foe'], firstDir: 'in', secondRoles: ['spy', 'friend'], secondDir: 'in',
    exc: {roles: ['civilian'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-29', domain: 2, title: 'Unbacked visitor to a Foe’s mark',
    order: 'Shoot anyone who meets as a Foreigner or vouches as a Friend someone targeted by a Foe or shadowed by a Spy — unless a Friend vouches for them.',
    firstRoles: ['foreigner', 'friend'], firstDir: 'out', secondRoles: ['foe', 'spy'], secondDir: 'in',
    exc: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 3: Civilian Tip-Offs (10)
  // =========================================================================
  guardedCarry({
    id: 'ea-30', domain: 3, title: 'Tipped by a mole without cover',
    order: 'Shoot anyone tipped off by a Civilian or targeted by a Foe who also leaks as a Double agent or meets as a Foreigner — unless a Friend vouches for them.',
    firstRoles: ['civilian', 'foe'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'out',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-31', domain: 3, title: 'Informant warning an attacker',
    order: 'Shoot anyone who tips off as a Civilian or meets as a Foreigner someone who targets as a Foe or leaks as a Double agent — unless a Spy shadows them.',
    firstRoles: ['civilian', 'foreigner'], firstDir: 'out', secondRoles: ['foe', 'double'], secondDir: 'out',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-32', domain: 3, title: 'Tipped by an unwatched attacker',
    order: 'Shoot anyone tipped off by a Civilian or fed a Double agent’s leak by someone who also targets as a Foe or meets as a Foreigner — unless a Spy shadows them.',
    firstRoles: ['civilian', 'double'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'out',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-33', domain: 3, title: 'Informant warning a border drop',
    order: 'Shoot anyone who tips off as a Civilian or vouches as a Friend someone met by a Foreigner or fed a Double agent’s leak — unless a Friend vouches for them.',
    firstRoles: ['civilian', 'friend'], firstDir: 'out', secondRoles: ['foreigner', 'double'], secondDir: 'in',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-34', domain: 3, title: 'Tipped by a marked informant',
    order: 'Shoot anyone tipped off by a Civilian or fed a Double agent’s leak by someone targeted by a Foe or shadowed by a Spy — unless a Spy shadows them.',
    firstRoles: ['civilian', 'double'], firstDir: 'in', secondRoles: ['foe', 'spy'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-35', domain: 3, title: 'Tipped by a compromised source',
    order: 'Shoot anyone tipped off by a Civilian or shadowed by a Spy who is met by a Foreigner or fed a Double agent’s leak — unless a Friend vouches for them.',
    firstRoles: ['civilian', 'spy'], firstDir: 'in', secondRoles: ['foreigner', 'double'], secondDir: 'in',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-36', domain: 3, title: 'Informant warning a marked suspect',
    order: 'Shoot anyone who tips off as a Civilian or leaks as a Double agent to someone targeted by a Foe or met by a Foreigner — unless a Spy shadows them.',
    firstRoles: ['civilian', 'double'], firstDir: 'out', secondRoles: ['foe', 'foreigner'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-37', domain: 3, title: 'Unwatched mole hitting an informant',
    order: 'Shoot anyone who leaks as a Double agent or targets as a Foe someone who tips off as a Civilian or vouches as a Friend — unless a Spy shadows them.',
    firstRoles: ['double', 'foe'], firstDir: 'out', secondRoles: ['civilian', 'friend'], secondDir: 'out',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-38', domain: 3, title: 'Targeted by an unbacked informant',
    order: 'Shoot anyone targeted by a Foe or shadowed by a Spy who also tips off as a Civilian or vouches as a Friend — unless a Friend vouches for them.',
    firstRoles: ['foe', 'spy'], firstDir: 'in', secondRoles: ['civilian', 'friend'], secondDir: 'out',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-39', domain: 3, title: 'Unbacked informant of a watched contact',
    order: 'Shoot anyone who tips off as a Civilian or meets as a Foreigner someone shadowed by a Spy or vouched for by a Friend — unless a Friend vouches for them.',
    firstRoles: ['civilian', 'foreigner'], firstDir: 'out', secondRoles: ['spy', 'friend'], secondDir: 'in',
    exc: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 4: Proxy Chains (Guarded 2-Step Relays) (10)
  // =========================================================================
  guardedCarry({
    id: 'ea-40', domain: 4, title: 'Unwatched shadow handoff',
    order: 'Shoot anyone who moves as a Foe or Double agent toward an unwatched cutout (no Spy shadow) who then operates as a Foreigner or Foe (no return).',
    firstRoles: ['foe', 'double'], firstDir: 'out', secondRoles: ['foreigner', 'foe'], secondDir: 'out',
    diffRole: true, midExc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-41', domain: 4, title: 'Unwatched cover-to-mole starter',
    order: 'Shoot anyone who vouches as a Friend or tips off as a Civilian someone who then leaks as a Double agent or meets as a Foreigner (no return) — unless a Spy shadows them.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'out',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-42', domain: 4, title: 'End of a mole-to-cover chain',
    order: 'Shoot anyone backed by a Friend or tipped off by a Civilian who received a Double agent leak or Foreigner visit (no return) — unless a Spy shadows them.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-43', domain: 4, title: 'Relay through an unbacked cutout',
    order: 'Shoot anyone who shadows as a Spy or leaks as a Double agent to an unbacked cutout (no Friend voucher) who then acts as a Foe or Foreigner (no return).',
    firstRoles: ['spy', 'double'], firstDir: 'out', secondRoles: ['foe', 'foreigner'], secondDir: 'out',
    diffRole: true, midExc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-44', domain: 4, title: 'End of a Spy-to-strike chain',
    order: 'Shoot anyone targeted by a Foe or met by a Foreigner who was shadowed by a Spy or tipped off by a Civilian (no return) — unless a Friend vouches for them.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'in', secondRoles: ['spy', 'civilian'], secondDir: 'in',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-45', domain: 4, title: 'Starter of a strike-to-cover relay',
    order: 'Shoot anyone who targets as a Foe or meets as a Foreigner someone who then vouches as a Friend or tips off as a Civilian (no return) — unless a Spy shadows them.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'out',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-46', domain: 4, title: 'Receiver of a cross-circle relay',
    order: 'Shoot anyone fed a Double agent’s leak or met by a Foreigner by someone who received a Foe attack or Civilian tip-off (no return).',
    firstRoles: ['double', 'foreigner'], firstDir: 'in', secondRoles: ['foe', 'civilian'], secondDir: 'in',
    diffRole: true
  }),
  guardedCarry({
    id: 'ea-47', domain: 4, title: 'Unwatched two-role starter',
    order: 'Shoot anyone who vouches as a Friend or shadows as a Spy an unwatched cutout (no Spy shadow) who then acts as a Foe or Double agent (no return).',
    firstRoles: ['friend', 'spy'], firstDir: 'out', secondRoles: ['foe', 'double'], secondDir: 'out',
    midExc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-48', domain: 4, title: 'Relay into an unwatched target',
    order: 'Shoot anyone fed a Double agent’s leak or targeted by a Foe who was backed by a Friend or tipped off by a Civilian (no return) — unless a Spy shadows them.',
    firstRoles: ['double', 'foe'], firstDir: 'in', secondRoles: ['friend', 'civilian'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-49', domain: 4, title: 'Unbacked informant-to-watcher relay',
    order: 'Shoot anyone who tips off as a Civilian or meets as a Foreigner someone who then vouches as a Friend or shadows as a Spy (no return) — unless a Friend vouches for them.',
    firstRoles: ['civilian', 'foreigner'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'out',
    exc: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 5: Alibi & Contradiction (10)
  // =========================================================================
  custom({
    id: 'ea-50', domain: 5, title: 'Mutual contact across roles',
    order: 'Shoot anyone who reaches a contact in one role while that same contact reaches back to them in a different role.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const e1 of g.out(x)) {
          const back = g.direct(e1.to, x).find(e2 => e2.role !== e1.role);
          if (back) return proof ? x + ': ' + g.fmt(e1) + ' countered by ' + g.fmt(back) + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  custom({
    id: 'ea-51', domain: 5, title: 'Same partner, two roles',
    order: 'Shoot anyone who initiates contact with the SAME partner in two different roles.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const outs = g.out(x);
        for (let i = 0; i < outs.length; i++) {
          for (let j = i + 1; j < outs.length; j++) {
            if (outs[i].to === outs[j].to && outs[i].role !== outs[j].role) {
              return proof ? x + ': ' + g.fmt(outs[i]) + ' and ' + g.fmt(outs[j]) + '.' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  custom({
    id: 'ea-52', domain: 5, title: 'Bridging Friend and Foe targets',
    order: 'Shoot anyone in direct contact with both a Friend-backed suspect AND a Foe-targeted suspect (two different people) — unless a Spy shadows them.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        const n = g.neighbors(x);
        for (const a of n) {
          if (!g.hasIn(a, 'friend')) continue;
          for (const b of n) {
            if (b !== a && g.hasIn(b, 'foe')) {
              return proof ? x + ' links Friend-backed ' + a + ' and Foe-targeted ' + b + '.' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  custom({
    id: 'ea-53', domain: 5, title: 'Hit by two different actors',
    order: 'Shoot anyone reached by two DIFFERENT actors in two different roles — unless a Friend vouches for them.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend')) return null;
        const ins = g.in(x);
        for (let i = 0; i < ins.length; i++) {
          for (let j = i + 1; j < ins.length; j++) {
            if (ins[i].from !== ins[j].from && ins[i].role !== ins[j].role) {
              return proof ? x + ': ' + g.fmt(ins[i]) + ' and ' + g.fmt(ins[j]) + '.' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  custom({
    id: 'ea-54', domain: 5, title: 'Split across two contacts',
    order: 'Shoot anyone reaching two DIFFERENT partners in two different roles — unless a Spy shadows them.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        const outs = g.out(x);
        for (let i = 0; i < outs.length; i++) {
          for (let j = i + 1; j < outs.length; j++) {
            if (outs[i].to !== outs[j].to && outs[i].role !== outs[j].role) {
              return proof ? x + ': ' + g.fmt(outs[i]) + ' and ' + g.fmt(outs[j]) + '.' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  custom({
    id: 'ea-55', domain: 5, title: 'Direct and cutout shortcut',
    order: 'Shoot anyone reaching another suspect both directly AND in two forward steps through a cutout (no return).',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const direct of g.out(x)) {
          for (const e1 of g.out(x)) {
            if (e1.to === direct.to) continue;
            const e2 = g.direct(e1.to, direct.to)[0];
            if (e2) return proof ? x + ' reaches ' + direct.to + ' directly (' + g.fmt(direct) + ') and via ' + e1.to + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  custom({
    id: 'ea-56', domain: 5, title: 'Double entry in one role',
    order: 'Shoot anyone involved twice inside the same role (acting or receiving).',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const role of g.roles) {
          const hits = g.touch(x, role);
          if (hits.length >= 2) return proof ? x + ' shows twice in ' + role + ' (' + g.fmt(hits[0]) + '; ' + g.fmt(hits[1]) + ').' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  custom({
    id: 'ea-57', domain: 5, title: 'Shared cutout with an ally',
    order: 'Shoot anyone targeted by a Foe, fed by a Double agent, or met by a Foreigner who also reaches a Friend-backed suspect.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const e1 of g.in(x, ['foe', 'double', 'foreigner'])) {
          const other = g.out(e1.from).find(e2 => e2.to !== x && g.hasIn(e2.to, 'friend'));
          if (other) return proof ? x + ': ' + g.fmt(e1) + '; actor also reaches Friend-backed ' + other.to + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  custom({
    id: 'ea-58', domain: 5, title: 'Conflicted insider actor',
    order: 'Shoot anyone operating as a Friend, Spy, or Civilian while receiving a Foe attack, Double agent leak, or Foreigner visit — unless a Spy shadows them.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        const o = g.out(x, ['friend', 'spy', 'civilian'])[0];
        const i = g.in(x, ['foe', 'double', 'foreigner'])[0];
        if (!o || !i) return null;
        return proof ? x + ': ' + g.fmt(o) + ' while ' + g.fmt(i) + '.' : 'ok';
      }, proof);
    }
  }),
  custom({
    id: 'ea-59', domain: 5, title: 'Unwarned dual exposure',
    order: 'Shoot anyone contacted by at least two different actors, including a Foe, Double agent, or Foreigner — with NO Civilian contact.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'civilian')) return null;
        const ins = g.in(x);
        const senders = new Set(ins.map(e => e.from));
        const shadow = ins.find(e => ['foe', 'double', 'foreigner'].includes(e.role));
        if (senders.size < 2 || !shadow) return null;
        return proof ? x + ' receives from ' + senders.size + ' contacts including ' + g.fmt(shadow) + '.' : 'ok';
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 6: Chronology & Timing (10)
  // =========================================================================
  guardedTime({
    id: 'ea-60', domain: 6, title: 'Cleared before turning, unwatched',
    order: 'Shoot anyone involved with Friend or Civilian earlier than their Double agent or Foreigner contact — unless a Spy shadows them.',
    early: {roles: ['friend', 'civilian']}, late: {roles: ['double', 'foreigner']}, exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedTime({
    id: 'ea-61', domain: 6, title: 'Betrayal before surveillance arrived',
    order: 'Shoot anyone involved with Foe, Double agent, or Foreigner earlier than a Spy shadowed them — unless a Friend vouches for them.',
    early: {roles: ['foe', 'double', 'foreigner']}, late: {roles: ['spy'], dir: 'in'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedTime({
    id: 'ea-62', domain: 6, title: 'Warning arrived too late',
    order: 'Shoot anyone involved with Foe or Foreigner earlier than a Civilian tipped them off or Friend vouched for them — unless a Spy shadows them.',
    early: {roles: ['foe', 'foreigner']}, late: {roles: ['civilian', 'friend'], dir: 'in'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-63', domain: 6, title: 'Delayed handoff into betrayal',
    order: 'Shoot anyone who vouches as a Friend or shadows as a Spy someone who LATER leaks as a Double agent or meets as a Foreigner (no return).',
    firstRoles: ['friend', 'spy'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'out',
    timeOrder: 'before'
  }),
  guardedCarry({
    id: 'ea-64', domain: 6, title: 'Backed after voucher’s betrayal',
    order: 'Shoot anyone vouched for by a Friend or tipped off by a Civilian who had EARLIER acted as a Foe, Double agent, or Foreigner — unless a Spy shadows them.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'out',
    timeOrder: 'after', exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-65', domain: 6, title: 'Timed strike after prior leak',
    order: 'Shoot anyone targeted by a Foe or met by a Foreigner who had EARLIER received a Double agent’s leak or Civilian tip-off (no return).',
    firstRoles: ['foe', 'foreigner'], firstDir: 'in', secondRoles: ['double', 'civilian'], secondDir: 'in',
    timeOrder: 'after'
  }),
  guardedTime({
    id: 'ea-66', domain: 6, title: 'Border contact before clearance',
    order: 'Shoot anyone involved with Foreigner or Double agent earlier than a Friend vouched for them or Civilian tipped them off — unless a Spy shadows them.',
    early: {roles: ['foreigner', 'double']}, late: {roles: ['friend', 'civilian'], dir: 'in'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedTime({
    id: 'ea-67', domain: 6, title: 'Warned before striking',
    order: 'Shoot anyone involved with Civilian or Spy earlier than their Foe or Double agent contact — unless a Friend vouches for them.',
    early: {roles: ['civilian', 'spy']}, late: {roles: ['foe', 'double']}, exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-68', domain: 6, title: 'Shadowed after watcher’s leak',
    order: 'Shoot anyone shadowed by a Spy or vouched for by a Friend who had EARLIER acted as a Foe, Double agent, or Foreigner.',
    firstRoles: ['spy', 'friend'], firstDir: 'in', secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'out',
    timeOrder: 'after'
  }),
  guardedCarry({
    id: 'ea-69', domain: 6, title: 'Warned after source’s betrayal',
    order: 'Shoot anyone tipped off by a Civilian or shadowed by a Spy who had EARLIER acted as a Foe, Double agent, or Foreigner.',
    firstRoles: ['civilian', 'spy'], firstDir: 'in', secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'out',
    timeOrder: 'after'
  }),

  // =========================================================================
  // DOMAIN 7: Tainted Sources (10)
  // =========================================================================
  guardedCarry({
    id: 'ea-70', domain: 7, title: 'Cleared by a compromised ally',
    order: 'Shoot anyone vouched for by a Friend or shadowed by a Spy who is also tied to Double agent or Foreigner — unless a Civilian tips them off.',
    firstRoles: ['friend', 'spy'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'any',
    exc: {roles: ['civilian'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-71', domain: 7, title: 'Tipped by a compromised source',
    order: 'Shoot anyone tipped off by a Civilian or vouched for by a Friend who is also tied to Double agent or Foreigner — unless a Spy shadows them.',
    firstRoles: ['civilian', 'friend'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'any',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-72', domain: 7, title: 'Watched by a compromised Spy',
    order: 'Shoot anyone shadowed by a Spy or tipped off by a Civilian who is also tied to Foe, Double agent, or Foreigner — unless a Friend vouches for them.',
    firstRoles: ['spy', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'any',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-73', domain: 7, title: 'Hit by a mole-linked striker',
    order: 'Shoot anyone targeted by a Foe or met by a Foreigner who is also tied to Double agent or Civilian — unless a Friend vouches for them.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'in', secondRoles: ['double', 'civilian'], secondDir: 'any',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-74', domain: 7, title: 'Fed by an insider mole',
    order: 'Shoot anyone fed a Double agent’s leak or targeted by a Foe who is also tied to Friend or Spy — unless a Friend vouches for them.',
    firstRoles: ['double', 'foe'], firstDir: 'in', secondRoles: ['friend', 'spy'], secondDir: 'any',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-75', domain: 7, title: 'Visited by an infiltrated outsider',
    order: 'Shoot anyone met by a Foreigner or fed a Double agent’s leak by someone also tied to Friend or Spy — unless a Spy shadows them.',
    firstRoles: ['foreigner', 'double'], firstDir: 'in', secondRoles: ['friend', 'spy'], secondDir: 'any',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-76', domain: 7, title: 'Vouching for an unwatched mole',
    order: 'Shoot anyone who vouches as a Friend or tips off as a Civilian someone tied to Double agent or Foreigner — unless a Spy shadows them.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'any',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-77', domain: 7, title: 'Shadowing an unbacked mole',
    order: 'Shoot anyone who shadows as a Spy or vouches as a Friend someone tied to Double agent or Foreigner — unless a Friend vouches for them.',
    firstRoles: ['spy', 'friend'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'any',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-78', domain: 7, title: 'Tipping off a mole or striker',
    order: 'Shoot anyone who tips off as a Civilian or meets as a Foreigner someone tied to Double agent or Foe — unless a Spy shadows them.',
    firstRoles: ['civilian', 'foreigner'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'any',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedCarry({
    id: 'ea-79', domain: 7, title: 'Striking a mole-linked contact',
    order: 'Shoot anyone who targets as a Foe or leaks as a Double agent to someone tied to Foreigner or Civilian — unless a Friend vouches for them.',
    firstRoles: ['foe', 'double'], firstDir: 'out', secondRoles: ['foreigner', 'civilian'], secondDir: 'any',
    exc: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 8: Double Lives (10)
  // =========================================================================
  custom({
    id: 'ea-80', domain: 8, title: 'Friend/Foe target, shadow actor',
    order: 'Shoot anyone receiving contact ONLY in Friend or Foe (at least once) while acting ONLY as a Spy, Double agent, or Foreigner (at least once).',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const ins = g.in(x);
        const outs = g.out(x);
        if (!ins.length || !outs.length) return null;
        if (!ins.every(e => ['friend', 'foe'].includes(e.role))) return null;
        if (!outs.every(e => ['spy', 'double', 'foreigner'].includes(e.role))) return null;
        return proof ? x + ': receives ' + g.fmt(ins[0]) + '; acts ' + g.fmt(outs[0]) + '.' : 'ok';
      }, proof);
    }
  }),
  custom({
    id: 'ea-81', domain: 8, title: 'Unbacked double-hatted operative',
    order: 'Shoot anyone receiving Spy, Double agent, or Foreigner contact while operating as a Friend, Foe, or Civilian — with NO Friend vouching for them.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend')) return null;
        const i = g.in(x, ['spy', 'double', 'foreigner'])[0];
        const o = g.out(x, ['friend', 'foe', 'civilian'])[0];
        if (!i || !o) return null;
        return proof ? x + ': ' + g.fmt(i) + ' and ' + g.fmt(o) + ' (no Friend backing).' : 'ok';
      }, proof);
    }
  }),
  custom({
    id: 'ea-82', domain: 8, title: 'Pure Spy/Mole split',
    order: 'Shoot anyone initiating ONLY as a Spy or Double agent (at least once) and receiving ONLY outside Spy and Double agent (at least once), or vice versa.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const outs = g.out(x);
        const ins = g.in(x);
        if (!outs.length || !ins.length) return null;
        const sd = r => r === 'spy' || r === 'double';
        const modeA = outs.every(e => sd(e.role)) && ins.every(e => !sd(e.role));
        const modeB = ins.every(e => sd(e.role)) && outs.every(e => !sd(e.role));
        if (!modeA && !modeB) return null;
        return proof ? x + ' splits Spy/Double agent (' + g.fmt(outs[0]) + ') from other contacts (' + g.fmt(ins[0]) + ').' : 'ok';
      }, proof);
    }
  }),
  custom({
    id: 'ea-83', domain: 8, title: 'Civilian/Foreigner split',
    order: 'Shoot anyone initiating ONLY as a Civilian or Foreigner (at least once) and receiving ONLY outside Civilian and Foreigner (at least once), or vice versa.',
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
    id: 'ea-84', domain: 8, title: 'Friend/Foe split',
    order: 'Shoot anyone initiating ONLY as a Friend or Foe (at least once) and receiving ONLY outside Friend and Foe (at least once), or vice versa.',
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
    id: 'ea-85', domain: 8, title: 'Cross-circle mark without insider role',
    order: 'Shoot anyone receiving both a Friend/Foe contact AND a Civilian/Foreigner contact — while NEVER operating as a Friend or Spy.',
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
    id: 'ea-86', domain: 8, title: 'Dual-hatted actor without warning',
    order: 'Shoot anyone operating as a Spy or Double agent AND as a Friend or Foe — while NEVER tipped off by a Civilian.',
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
    id: 'ea-87', domain: 8, title: 'Pure shadow actor without cover',
    order: 'Shoot anyone initiating ONLY as a Foe, Double agent, or Foreigner (at least once) with NO Spy shadowing or Friend vouching for them.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, ['spy', 'friend'])) return null;
        const outs = g.out(x);
        if (!outs.length || !outs.every(e => ['foe', 'double', 'foreigner'].includes(e.role))) return null;
        return proof ? x + ' acts only in Foe/Double agent/Foreigner (' + g.fmt(outs[0]) + ') without Spy/Friend cover.' : 'ok';
      }, proof);
    }
  }),
  custom({
    id: 'ea-88', domain: 8, title: 'Three-circle mole or visitor',
    order: 'Shoot anyone spanning three or more roles, including Friend or Civilian AND Double agent or Foreigner.',
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
    id: 'ea-89', domain: 8, title: 'Unwatched three-role operator',
    order: 'Shoot anyone spanning three or more roles — unless a Spy shadows them.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        const d = g.distinctRoles(x);
        if (d.size < 3) return null;
        return proof ? x + ' spans ' + d.size + ' roles with no Spy shadowing them.' : 'ok';
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 9: Command & Leverage (Guarded Anchor Chains) (10)
  // =========================================================================
  guardedAnchor({
    id: 'ea-90', domain: 9, title: '{name}’s unwatched two-step reach',
    order: 'Shoot anyone reached from {name} in two forward steps (not in direct contact with {name}) — unless a Spy shadows them.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out',
    excludeDirect: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedAnchor({
    id: 'ea-91', domain: 9, title: '{name}’s unbacked two-step source',
    order: 'Shoot anyone reaching {name} in two forward steps (not in direct contact with {name}) — unless a Friend vouches for them.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in',
    excludeDirect: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedAnchor({
    id: 'ea-92', domain: 9, title: 'Shared target with {name}, unbacked',
    order: 'Shoot anyone else who reaches the same contact {name} reaches — unless a Friend vouches for them.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedAnchor({
    id: 'ea-93', domain: 9, title: 'Shared actor with {name}, unwatched',
    order: 'Shoot anyone else reached by the same actor who reaches {name} — unless a Spy shadows them.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedAnchor({
    id: 'ea-94', domain: 9, title: '{name}’s shadow second-hop',
    order: 'Shoot anyone two contacts away from {name} (not in direct contact with {name}) who is involved with Double agent or Foreigner.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'any',
    excludeDirect: true, req: {roles: ['double', 'foreigner']}
  }),
  guardedAnchor({
    id: 'ea-95', domain: 9, title: '{name}’s unwatched cutout relay',
    order: 'Shoot anyone reached from {name} in two forward steps through an unwatched cutout (no Spy shadow).',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out',
    midExc: {roles: ['spy'], dir: 'in'}
  }),
  guardedAnchor({
    id: 'ea-96', domain: 9, title: 'Later relay from {name}',
    order: 'Shoot anyone reached from {name} in two forward steps where the second dispatch happened LATER — unless a Friend vouches for them.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out',
    timeOrder: 'before', exc: {roles: ['friend'], dir: 'in'}
  }),
  guardedAnchor({
    id: 'ea-97', domain: 9, title: 'Earlier relay into {name}',
    order: 'Shoot anyone reaching {name} in two forward steps where the first dispatch happened EARLIER — unless a Spy shadows them.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in',
    timeOrder: 'after', exc: {roles: ['spy'], dir: 'in'}
  }),
  guardedAnchor({
    id: 'ea-98', domain: 9, title: '{name}’s two-circle outbound chain',
    order: 'Shoot anyone reached from {name} by a Friend, Civilian, or Foreigner contact followed by a Foe, Double agent, or Spy contact (either way).',
    step1Roles: ['friend', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['foe', 'double', 'spy'], step2Dir: 'any'
  }),
  guardedAnchor({
    id: 'ea-99', domain: 9, title: '{name}’s two-circle return chain',
    order: 'Shoot anyone reached from {name} by a Foe, Double agent, or Civilian contact followed by a Friend, Spy, or Foreigner contact (either way).',
    step1Roles: ['foe', 'double', 'civilian'], step1Dir: 'any',
    step2Roles: ['friend', 'spy', 'foreigner'], step2Dir: 'any'
  })
];
