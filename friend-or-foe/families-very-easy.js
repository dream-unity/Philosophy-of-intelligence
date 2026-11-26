import {collectMatches} from './case-graph.js';
import {matchAnchorRelay, matchAtom, matchRelay, matchTemporal} from './case-predicates.js';

// 100 genuinely distinct Very Easy intelligence cases (10 domains × 10 families).
// Directional 2-step carry-over, intermediary checks, and temporal sequence across confirmed dispatches.
// Two-role entry steps ensure genuine 1–4 variable target counts, zero single-role shortcuts, and zero meta-UI terms.

function carry({id, domain, title, order, hint, firstRoles, firstDir, secondRoles, secondDir, noReturn = true, diffRole = false, timeOrder = null, exc = null}) {
  return {
    id, tier: 'very-easy', domain, title, order, hint, useAnchor: false,
    evaluate(g, _anchor, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        const hit = matchRelay(g, x, {firstRoles, firstDir, secondRoles, secondDir, noReturn, diffRole, timeOrder});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' → ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  };
}

function anchorCarry({id, domain, title, order, hint, step1Roles, step1Dir, step2Roles, step2Dir, diffRole = false, excludeDirect = false, timeOrder = null, exc = null}) {
  return {
    id, tier: 'very-easy', domain, title, order, hint, useAnchor: true,
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        const hit = matchAnchorRelay(g, anchor, x, {step1Roles, step1Dir, step2Roles, step2Dir, diffRole, excludeDirect, timeOrder});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' → ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  };
}

function timedRule({id, domain, title, order, hint, early, late, exc = null}) {
  return {
    id, tier: 'very-easy', domain, title, order, hint, useAnchor: false,
    evaluate(g, _anchor, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        const hit = matchTemporal(g, x, early, late);
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit[0]) + ' before ' + g.fmt(hit[1]) + '.' : 'ok';
      }, proof);
    }
  };
}

export const veryEasyFamilies = [
  // =========================================================================
  // DOMAIN 0: Cover & Betrayal (10)
  // =========================================================================
  carry({
    id: 've-00', domain: 0, title: 'Tainted voucher or informant',
    order: 'Shoot anyone vouched for by a Friend or tipped off by a Civilian who also leaks as a Double agent or meets as a Foreigner.',
    hint: 'Trace Friend vouching and Civilian tip-offs back to the actor, then check if they leak as a Double agent or meet as a Foreigner.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-01', domain: 0, title: 'Vouching for a mole',
    order: 'Shoot anyone who vouches as a Friend or shadows as a Spy someone who leaks as a Double agent or meets as a Foreigner.',
    hint: 'Follow Friend vouchers and Spy shadows to the contact, then check if that contact leaks as a Double agent or meets as a Foreigner.',
    firstRoles: ['friend', 'spy'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-02', domain: 0, title: 'Vouched by an attacker',
    order: 'Shoot anyone vouched for by a Friend or shadowed by a Spy who also targets someone as a Foe or leaks as a Double agent.',
    hint: 'Check who vouches in Friend or shadows in Spy, then see if that actor targets as a Foe or leaks as a Double agent.',
    firstRoles: ['friend', 'spy'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'out'
  }),
  carry({
    id: 've-03', domain: 0, title: 'Backing a striker',
    order: 'Shoot anyone who vouches as a Friend or tips off as a Civilian someone who targets as a Foe or meets as a Foreigner.',
    hint: 'Follow Friend vouchers and Civilian tip-offs to the contact, then check if they target as a Foe or meet as a Foreigner.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['foe', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-04', domain: 0, title: 'Leaked to a backed mark',
    order: 'Shoot anyone who leaks as a Double agent or targets as a Foe someone vouched for by a Friend or tipped off by a Civilian.',
    hint: 'Follow Double agent leaks and Foe attacks to the recipient, then check if a Friend vouches for or a Civilian tips them off.',
    firstRoles: ['double', 'foe'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'in'
  }),
  carry({
    id: 've-05', domain: 0, title: 'Vouched by a marked insider',
    order: 'Shoot anyone vouched for by a Friend or tipped off by a Civilian who is targeted by a Foe or shadowed by a Spy.',
    hint: 'Trace Friend vouchers and Civilian tip-offs back to the actor, then see if a Foe targets or a Spy shadows them.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'spy'], secondDir: 'in'
  }),
  carry({
    id: 've-06', domain: 0, title: 'Mole’s backed partner',
    order: 'Shoot anyone fed a Double agent’s leak or met by a Foreigner who also vouches as a Friend or tips off as a Civilian.',
    hint: 'Trace Double agent leaks and Foreigner meetings back to the actor, then check if they vouch as a Friend or tip off as a Civilian.',
    firstRoles: ['double', 'foreigner'], firstDir: 'in', secondRoles: ['friend', 'civilian'], secondDir: 'out'
  }),
  carry({
    id: 've-07', domain: 0, title: 'Ally of a leak recipient',
    order: 'Shoot anyone who vouches as a Friend or tips off as a Civilian someone fed a Double agent’s leak or met by a Foreigner.',
    hint: 'Follow Friend vouchers and Civilian tip-offs to the recipient, then see if a Double agent leaks to or a Foreigner meets them.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'in'
  }),
  carry({
    id: 've-08', domain: 0, title: 'Vouched by a leaked-to source',
    order: 'Shoot anyone vouched for by a Friend or shadowed by a Spy who receives a Double agent’s leak or is met by a Foreigner.',
    hint: 'Trace Friend vouchers and Spy shadows back to the actor, then see if they receive a Double agent leak or Foreigner meeting.',
    firstRoles: ['friend', 'spy'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'in'
  }),
  carry({
    id: 've-09', domain: 0, title: 'Shadow-backed attacker',
    order: 'Shoot anyone who targets as a Foe or meets as a Foreigner someone vouched for by a Friend or shadowed by a Spy.',
    hint: 'Follow Foe attacks and Foreigner meetings to the recipient, then check if a Friend vouches for or a Spy shadows them.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'in'
  }),

  // =========================================================================
  // DOMAIN 1: Surveillance & Blind Spots (10)
  // =========================================================================
  carry({
    id: 've-10', domain: 1, title: 'Watched by a mole',
    order: 'Shoot anyone shadowed by a Spy or met by a Foreigner who also leaks as a Double agent or targets as a Foe.',
    hint: 'Trace Spy shadows and Foreigner meetings back to the actor, then check if they leak as a Double agent or target as a Foe.',
    firstRoles: ['spy', 'foreigner'], firstDir: 'in', secondRoles: ['double', 'foe'], secondDir: 'out'
  }),
  carry({
    id: 've-11', domain: 1, title: 'Shadowing a striker',
    order: 'Shoot anyone who shadows as a Spy or tips off as a Civilian someone who leaks as a Double agent or targets as a Foe.',
    hint: 'Follow Spy watches and Civilian tip-offs to the contact, then check if they leak as a Double agent or target as a Foe.',
    firstRoles: ['spy', 'civilian'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'out'
  }),
  carry({
    id: 've-12', domain: 1, title: 'Watched by an attacker',
    order: 'Shoot anyone shadowed by a Spy or vouched for by a Friend who also targets as a Foe or meets as a Foreigner.',
    hint: 'Trace Spy shadows and Friend vouchers back to the actor, then check if they target as a Foe or meet as a Foreigner.',
    firstRoles: ['spy', 'friend'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-13', domain: 1, title: 'Shadowing a foreign contact',
    order: 'Shoot anyone who shadows as a Spy or vouches as a Friend someone met by a Foreigner or tipped off by a Civilian.',
    hint: 'Follow Spy watches and Friend vouchers to the contact, then check if a Foreigner meets or a Civilian tips them off.',
    firstRoles: ['spy', 'friend'], firstDir: 'out', secondRoles: ['foreigner', 'civilian'], secondDir: 'in'
  }),
  carry({
    id: 've-14', domain: 1, title: 'Watched attacker’s quarry',
    order: 'Shoot anyone targeted by a Foe or fed a Double agent’s leak by someone shadowed by a Spy or vouched for by a Friend.',
    hint: 'Trace Foe attacks and Double agent leaks back to the actor, then check if a Spy shadows or a Friend vouches for them.',
    firstRoles: ['foe', 'double'], firstDir: 'in', secondRoles: ['spy', 'friend'], secondDir: 'in'
  }),
  carry({
    id: 've-15', domain: 1, title: 'Leaking to a watched mark',
    order: 'Shoot anyone who leaks as a Double agent or targets as a Foe someone shadowed by a Spy or met by a Foreigner.',
    hint: 'Follow Double agent leaks and Foe attacks to the recipient, then check if a Spy shadows or a Foreigner meets them.',
    firstRoles: ['double', 'foe'], firstDir: 'out', secondRoles: ['spy', 'foreigner'], secondDir: 'in'
  }),
  carry({
    id: 've-16', domain: 1, title: 'Watched by a targeted Spy',
    order: 'Shoot anyone shadowed by a Spy or tipped off by a Civilian who is targeted by a Foe or met by a Foreigner.',
    hint: 'Trace Spy shadows and Civilian tip-offs back to the actor, then check if a Foe targets or a Foreigner meets them.',
    firstRoles: ['spy', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'in'
  }),
  carry({
    id: 've-17', domain: 1, title: 'Backed by a watcher',
    order: 'Shoot anyone vouched for by a Friend or tipped off by a Civilian who also shadows as a Spy or meets as a Foreigner.',
    hint: 'Trace Friend vouchers and Civilian tip-offs back to the actor, then check if they shadow as a Spy or meet as a Foreigner.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['spy', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-18', domain: 1, title: 'Shadowing a backed ward',
    order: 'Shoot anyone who shadows as a Spy or leaks as a Double agent to someone vouched for by a Friend or tipped off by a Civilian.',
    hint: 'Follow Spy watches and Double agent leaks to the recipient, then check if a Friend vouches for or a Civilian tips them off.',
    firstRoles: ['spy', 'double'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'in'
  }),
  carry({
    id: 've-19', domain: 1, title: 'Watched by an ally',
    order: 'Shoot anyone shadowed by a Spy or targeted by a Foe who also vouches as a Friend or tips off as a Civilian.',
    hint: 'Trace Spy shadows and Foe attacks back to the actor, then check if they vouch as a Friend or tip off as a Civilian.',
    firstRoles: ['spy', 'foe'], firstDir: 'in', secondRoles: ['friend', 'civilian'], secondDir: 'out'
  }),

  // =========================================================================
  // DOMAIN 2: Foreign Contact (10)
  // =========================================================================
  carry({
    id: 've-20', domain: 2, title: 'Foreigner’s mole link',
    order: 'Shoot anyone met by a Foreigner or tipped off by a Civilian who also leaks as a Double agent or targets as a Foe.',
    hint: 'Trace Foreigner meetings and Civilian tip-offs back to the actor, then check if they leak as a Double agent or target as a Foe.',
    firstRoles: ['foreigner', 'civilian'], firstDir: 'in', secondRoles: ['double', 'foe'], secondDir: 'out'
  }),
  carry({
    id: 've-21', domain: 2, title: 'Meeting a mole',
    order: 'Shoot anyone who meets as a Foreigner or vouches as a Friend someone who leaks as a Double agent or targets as a Foe.',
    hint: 'Follow Foreigner meetings and Friend vouchers to the contact, then check if they leak as a Double agent or target as a Foe.',
    firstRoles: ['foreigner', 'friend'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'out'
  }),
  carry({
    id: 've-22', domain: 2, title: 'Meeting a Friend’s ward',
    order: 'Shoot anyone who meets as a Foreigner or tips off as a Civilian someone vouched for by a Friend or shadowed by a Spy.',
    hint: 'Follow Foreigner meetings and Civilian tip-offs to the contact, then check if a Friend vouches for or a Spy shadows them.',
    firstRoles: ['foreigner', 'civilian'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'in'
  }),
  carry({
    id: 've-23', domain: 2, title: 'Met by an insider',
    order: 'Shoot anyone met by a Foreigner or fed a Double agent’s leak by someone who also vouches as a Friend or shadows as a Spy.',
    hint: 'Trace Foreigner meetings and Double agent leaks back to the actor, then check if they vouch as a Friend or shadow as a Spy.',
    firstRoles: ['foreigner', 'double'], firstDir: 'in', secondRoles: ['friend', 'spy'], secondDir: 'out'
  }),
  carry({
    id: 've-24', domain: 2, title: 'Foreigner meeting a watched contact',
    order: 'Shoot anyone who meets as a Foreigner or leaks as a Double agent to someone shadowed by a Spy or tipped off by a Civilian.',
    hint: 'Follow Foreigner meetings and Double agent leaks to the contact, then check if a Spy shadows or a Civilian tips them off.',
    firstRoles: ['foreigner', 'double'], firstDir: 'out', secondRoles: ['spy', 'civilian'], secondDir: 'in'
  }),
  carry({
    id: 've-25', domain: 2, title: 'Met by a watched outsider',
    order: 'Shoot anyone met by a Foreigner or targeted by a Foe who is shadowed by a Spy or tipped off by a Civilian.',
    hint: 'Trace Foreigner meetings and Foe attacks back to the actor, then check if a Spy shadows or a Civilian tips them off.',
    firstRoles: ['foreigner', 'foe'], firstDir: 'in', secondRoles: ['spy', 'civilian'], secondDir: 'in'
  }),
  carry({
    id: 've-26', domain: 2, title: 'Leaking to a foreign contact',
    order: 'Shoot anyone who leaks as a Double agent or shadows as a Spy someone met by a Foreigner or targeted by a Foe.',
    hint: 'Follow Double agent leaks and Spy watches to the recipient, then check if a Foreigner meets or a Foe targets them.',
    firstRoles: ['double', 'spy'], firstDir: 'out', secondRoles: ['foreigner', 'foe'], secondDir: 'in'
  }),
  carry({
    id: 've-27', domain: 2, title: 'Targeting a foreign contact',
    order: 'Shoot anyone who targets as a Foe or tips off as a Civilian someone met by a Foreigner or fed a Double agent’s leak.',
    hint: 'Follow Foe attacks and Civilian tip-offs to the contact, then check if a Foreigner meets or a Double agent leaks to them.',
    firstRoles: ['foe', 'civilian'], firstDir: 'out', secondRoles: ['foreigner', 'double'], secondDir: 'in'
  }),
  carry({
    id: 've-28', domain: 2, title: 'Met by an informant',
    order: 'Shoot anyone met by a Foreigner or vouched for by a Friend who also tips off as a Civilian or shadows as a Spy.',
    hint: 'Trace Foreigner meetings and Friend vouchers back to the actor, then check if they tip off as a Civilian or shadow as a Spy.',
    firstRoles: ['foreigner', 'friend'], firstDir: 'in', secondRoles: ['civilian', 'spy'], secondDir: 'out'
  }),
  carry({
    id: 've-29', domain: 2, title: 'Meeting a leak recipient',
    order: 'Shoot anyone who meets as a Foreigner or vouches as a Friend someone fed a Double agent’s leak or targeted by a Foe.',
    hint: 'Follow Foreigner meetings and Friend vouchers to the contact, then check if they receive a Double agent leak or Foe attack.',
    firstRoles: ['foreigner', 'friend'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'in'
  }),

  // =========================================================================
  // DOMAIN 3: Civilian Tip-Offs (10)
  // =========================================================================
  carry({
    id: 've-30', domain: 3, title: 'Tipped by a mole',
    order: 'Shoot anyone tipped off by a Civilian or targeted by a Foe who also leaks as a Double agent or meets as a Foreigner.',
    hint: 'Trace Civilian tip-offs and Foe attacks back to the actor, then check if they leak as a Double agent or meet as a Foreigner.',
    firstRoles: ['civilian', 'foe'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-31', domain: 3, title: 'Tipping off a striker',
    order: 'Shoot anyone who tips off as a Civilian or meets as a Foreigner someone who leaks as a Double agent or targets as a Foe.',
    hint: 'Follow Civilian tip-offs and Foreigner meetings to the contact, then check if they leak as a Double agent or target as a Foe.',
    firstRoles: ['civilian', 'foreigner'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'out'
  }),
  carry({
    id: 've-32', domain: 3, title: 'Tipped by a striker',
    order: 'Shoot anyone tipped off by a Civilian or fed a Double agent’s leak by someone who also targets as a Foe or meets as a Foreigner.',
    hint: 'Trace Civilian tip-offs and Double agent leaks back to the actor, then check if they target as a Foe or meet as a Foreigner.',
    firstRoles: ['civilian', 'double'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-33', domain: 3, title: 'Tipping off a shadow mark',
    order: 'Shoot anyone who tips off as a Civilian or shadows as a Spy someone met by a Foreigner or fed a Double agent’s leak.',
    hint: 'Follow Civilian tip-offs and Spy watches to the recipient, then check if a Foreigner meets or a Double agent leaks to them.',
    firstRoles: ['civilian', 'spy'], firstDir: 'out', secondRoles: ['foreigner', 'double'], secondDir: 'in'
  }),
  carry({
    id: 've-34', domain: 3, title: 'Tipped by a watched source',
    order: 'Shoot anyone tipped off by a Civilian or fed a Double agent’s leak by someone shadowed by a Spy or targeted by a Foe.',
    hint: 'Trace Civilian tip-offs and Double agent leaks back to the actor, then check if a Spy shadows or a Foe targets them.',
    firstRoles: ['civilian', 'double'], firstDir: 'in', secondRoles: ['spy', 'foe'], secondDir: 'in'
  }),
  carry({
    id: 've-35', domain: 3, title: 'Tipping off a backed ward',
    order: 'Shoot anyone who tips off as a Civilian or vouches as a Friend someone shadowed by a Spy or targeted by a Foe.',
    hint: 'Follow Civilian tip-offs and Friend vouchers to the recipient, then check if a Spy shadows or a Foe targets them.',
    firstRoles: ['civilian', 'friend'], firstDir: 'out', secondRoles: ['spy', 'foe'], secondDir: 'in'
  }),
  carry({
    id: 've-36', domain: 3, title: 'Tipped by an insider',
    order: 'Shoot anyone tipped off by a Civilian or targeted by a Foe who also vouches as a Friend or shadows as a Spy.',
    hint: 'Trace Civilian tip-offs and Foe attacks back to the actor, then check if they vouch as a Friend or shadow as a Spy.',
    firstRoles: ['civilian', 'foe'], firstDir: 'in', secondRoles: ['friend', 'spy'], secondDir: 'out'
  }),
  carry({
    id: 've-37', domain: 3, title: 'Leaking to an informant',
    order: 'Shoot anyone who leaks as a Double agent or meets as a Foreigner someone who tips off as a Civilian or vouches as a Friend.',
    hint: 'Follow Double agent leaks and Foreigner meetings to the recipient, then check if they tip off as a Civilian or vouch as a Friend.',
    firstRoles: ['double', 'foreigner'], firstDir: 'out', secondRoles: ['civilian', 'friend'], secondDir: 'out'
  }),
  carry({
    id: 've-38', domain: 3, title: 'Targeted by an informant',
    order: 'Shoot anyone targeted by a Foe or shadowed by a Spy who also tips off as a Civilian or leaks as a Double agent.',
    hint: 'Trace Foe attacks and Spy shadows back to the actor, then check if they tip off as a Civilian or leak as a Double agent.',
    firstRoles: ['foe', 'spy'], firstDir: 'in', secondRoles: ['civilian', 'double'], secondDir: 'out'
  }),
  carry({
    id: 've-39', domain: 3, title: 'Tipping off a targeted contact',
    order: 'Shoot anyone who tips off as a Civilian or leaks as a Double agent to someone targeted by a Foe or vouched for by a Friend.',
    hint: 'Follow Civilian tip-offs and Double agent leaks to the recipient, then check if a Foe targets or a Friend vouches for them.',
    firstRoles: ['civilian', 'double'], firstDir: 'out', secondRoles: ['foe', 'friend'], secondDir: 'in'
  }),

  // =========================================================================
  // DOMAIN 4: Proxy Chains (2-Step Operational Relays) (10)
  // =========================================================================
  carry({
    id: 've-40', domain: 4, title: 'Shadow handoff starter',
    order: 'Shoot anyone who leaks as a Double agent or targets as a Foe someone who then meets as a Foreigner or shadows as a Spy (no return).',
    hint: 'Follow a Double agent leak or Foe attack to the middleman, then follow them operating as Foreigner or Spy.',
    firstRoles: ['double', 'foe'], firstDir: 'out', secondRoles: ['foreigner', 'spy'], secondDir: 'out'
  }),
  carry({
    id: 've-41', domain: 4, title: 'Enemy handoff starter',
    order: 'Shoot anyone who targets as a Foe or meets as a Foreigner someone who then leaks as a Double agent or tips off as a Civilian (no return).',
    hint: 'Follow a Foe attack or Foreigner meeting to the middleman, then check if they leak as a Double agent or tip off as a Civilian.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'out', secondRoles: ['double', 'civilian'], secondDir: 'out'
  }),
  carry({
    id: 've-42', domain: 4, title: 'Shadow relay receiver',
    order: 'Shoot anyone met by a Foreigner or targeted by a Foe who received a Double agent’s leak or Civilian tip-off (no return).',
    hint: 'Trace a Foreigner meeting or Foe attack back to the actor, then check if they received a Double agent leak or Civilian tip-off.',
    firstRoles: ['foreigner', 'foe'], firstDir: 'in', secondRoles: ['double', 'civilian'], secondDir: 'in'
  }),
  carry({
    id: 've-43', domain: 4, title: 'Ally-to-Spy relay',
    order: 'Shoot anyone who vouches as a Friend or meets as a Foreigner someone who then shadows as a Spy or tips off as a Civilian (no return).',
    hint: 'Follow a Friend voucher or Foreigner meeting to the contact, then see if they shadow as a Spy or tip off as a Civilian.',
    firstRoles: ['friend', 'foreigner'], firstDir: 'out', secondRoles: ['spy', 'civilian'], secondDir: 'out'
  }),
  carry({
    id: 've-44', domain: 4, title: 'Mole-to-enemy receiver',
    order: 'Shoot anyone targeted by a Foe or shadowed by a Spy who received a Double agent’s leak or was met by a Foreigner (no return).',
    hint: 'Trace a Foe attack or Spy watch back to the actor, then check if a Double agent leaked to or a Foreigner met them.',
    firstRoles: ['foe', 'spy'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'in'
  }),
  carry({
    id: 've-45', domain: 4, title: 'Spy-to-mole starter',
    order: 'Shoot anyone who shadows as a Spy or tips off as a Civilian someone who then leaks as a Double agent or meets as a Foreigner (no return).',
    hint: 'Follow a Spy watch or Civilian tip-off to the contact, then check if they leak as a Double agent or meet as a Foreigner.',
    firstRoles: ['spy', 'civilian'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-46', domain: 4, title: 'Two-step danger receiver',
    order: 'Shoot anyone fed a Double agent’s leak or met by a Foreigner who was targeted by a Foe or shadowed by a Spy (no return).',
    hint: 'Trace a Double agent leak or Foreigner meeting back to the actor, then check if a Foe targets or a Spy shadows them.',
    firstRoles: ['double', 'foreigner'], firstDir: 'in', secondRoles: ['foe', 'spy'], secondDir: 'in'
  }),
  carry({
    id: 've-47', domain: 4, title: 'Cover-to-enemy receiver',
    order: 'Shoot anyone targeted by a Foe or tipped off by a Civilian who was vouched for by a Friend or met by a Foreigner (no return).',
    hint: 'Trace a Foe attack or Civilian tip-off back to the actor, then check if a Friend vouched for or a Foreigner met them.',
    firstRoles: ['foe', 'civilian'], firstDir: 'in', secondRoles: ['friend', 'foreigner'], secondDir: 'in'
  }),
  carry({
    id: 've-48', domain: 4, title: 'Tip-to-cover starter',
    order: 'Shoot anyone who tips off as a Civilian or leaks as a Double agent to someone who then vouches as a Friend or shadows as a Spy (no return).',
    hint: 'Follow a Civilian tip-off or Double agent leak to the recipient, then check if they vouch as a Friend or shadow as a Spy.',
    firstRoles: ['civilian', 'double'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'out'
  }),
  carry({
    id: 've-49', domain: 4, title: 'Cross-role relay starter',
    order: 'Shoot anyone who moves as a Friend or Civilian toward someone who then operates as a Foe or Double agent (no return).',
    hint: 'Follow a Friend or Civilian action, then check if the recipient operates as a Foe or Double agent.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['foe', 'double'], secondDir: 'out'
  }),

  // =========================================================================
  // DOMAIN 5: Alibi & Contradiction (10)
  // =========================================================================
  carry({
    id: 've-50', domain: 5, title: 'Protected by an enemy’s mark',
    order: 'Shoot anyone vouched for by a Friend or tipped off by a Civilian who is targeted by a Foe or fed a Double agent’s leak — unless a Spy shadows them.',
    hint: 'Find who a Friend backs or Civilian tips off whose actor was hit by a Foe or Double agent, then exclude anyone shadowed by a Spy.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),
  carry({
    id: 've-51', domain: 5, title: 'Targeted by a Friend’s partner',
    order: 'Shoot anyone targeted by a Foe or fed a Double agent’s leak by someone who also vouches as a Friend or shadows as a Spy.',
    hint: 'Trace Foe attacks and Double agent leaks back to the actor, then check if they also vouch as a Friend or shadow as a Spy.',
    firstRoles: ['foe', 'double'], firstDir: 'in', secondRoles: ['friend', 'spy'], secondDir: 'out'
  }),
  carry({
    id: 've-52', domain: 5, title: 'Leaked to by a watcher',
    order: 'Shoot anyone fed a Double agent’s leak or met by a Foreigner who also shadows as a Spy or targets as a Foe.',
    hint: 'Trace Double agent leaks and Foreigner meetings back to the actor, then check if they also shadow as a Spy or target as a Foe.',
    firstRoles: ['double', 'foreigner'], firstDir: 'in', secondRoles: ['spy', 'foe'], secondDir: 'out'
  }),
  carry({
    id: 've-53', domain: 5, title: 'Targeted by a watcher',
    order: 'Shoot anyone targeted by a Foe or vouched for by a Friend who also shadows as a Spy or leaks as a Double agent.',
    hint: 'Trace Foe attacks and Friend vouchers back to the actor, then check if they also shadow as a Spy or leak as a Double agent.',
    firstRoles: ['foe', 'friend'], firstDir: 'in', secondRoles: ['spy', 'double'], secondDir: 'out'
  }),
  carry({
    id: 've-54', domain: 5, title: 'Leaked to by an outsider',
    order: 'Shoot anyone fed a Double agent’s leak or shadowed by a Spy who also targets as a Foe or meets as a Foreigner.',
    hint: 'Trace Double agent leaks and Spy watches back to the actor, then check if they also target as a Foe or meet as a Foreigner.',
    firstRoles: ['double', 'spy'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-55', domain: 5, title: 'Targeted by a mole',
    order: 'Shoot anyone targeted by a Foe or met by a Foreigner who also leaks as a Double agent or vouches as a Friend.',
    hint: 'Trace Foe attacks and Foreigner meetings back to the actor, then check if they also leak as a Double agent or vouch as a Friend.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'in', secondRoles: ['double', 'friend'], secondDir: 'out'
  }),
  carry({
    id: 've-56', domain: 5, title: 'Backed by a tipped source',
    order: 'Shoot anyone vouched for by a Friend or met by a Foreigner who was tipped off by a Civilian or targeted by a Foe.',
    hint: 'Trace Friend vouchers and Foreigner meetings back to the actor, then check if a Civilian tipped them off or a Foe targeted them.',
    firstRoles: ['friend', 'foreigner'], firstDir: 'in', secondRoles: ['civilian', 'foe'], secondDir: 'in'
  }),
  carry({
    id: 've-57', domain: 5, title: 'Met by a mole’s target',
    order: 'Shoot anyone met by a Foreigner or tipped off by a Civilian who received a Double agent’s leak or Friend voucher.',
    hint: 'Trace Foreigner meetings and Civilian tip-offs back to the actor, then check if a Double agent leaked to or a Friend backed them.',
    firstRoles: ['foreigner', 'civilian'], firstDir: 'in', secondRoles: ['double', 'friend'], secondDir: 'in'
  }),
  carry({
    id: 've-58', domain: 5, title: 'Shadowed by a tipped Spy',
    order: 'Shoot anyone shadowed by a Spy or vouched for by a Friend who was tipped off by a Civilian or met by a Foreigner.',
    hint: 'Trace Spy shadows and Friend vouchers back to the actor, then check if a Civilian tipped them off or a Foreigner met them.',
    firstRoles: ['spy', 'friend'], firstDir: 'in', secondRoles: ['civilian', 'foreigner'], secondDir: 'in'
  }),
  carry({
    id: 've-59', domain: 5, title: 'Tipped by a backed source',
    order: 'Shoot anyone tipped off by a Civilian or shadowed by a Spy who is vouched for by a Friend or fed a Double agent’s leak.',
    hint: 'Trace Civilian tip-offs and Spy shadows back to the actor, then check if a Friend vouches for or a Double agent leaks to them.',
    firstRoles: ['civilian', 'spy'], firstDir: 'in', secondRoles: ['friend', 'double'], secondDir: 'in'
  }),

  // =========================================================================
  // DOMAIN 6: Chronology & Timing (10)
  // =========================================================================
  timedRule({
    id: 've-60', domain: 6, title: 'Vouched then betrayed',
    order: 'Shoot anyone vouched for by a Friend or tipped off by a Civilian before they leaked as a Double agent or met as a Foreigner.',
    hint: 'Compare dispatch times: Friend vouching or Civilian tip-off must come earlier than operating as a Double agent or Foreigner.',
    early: {roles: ['friend', 'civilian'], dir: 'in'}, late: {roles: ['double', 'foreigner'], dir: 'out'}
  }),
  timedRule({
    id: 've-61', domain: 6, title: 'Met before shadowed',
    order: 'Shoot anyone met by a Foreigner or fed a Double agent’s leak before a Spy shadowed them or a Friend vouched for them.',
    hint: 'Check dispatch times: the Foreigner meeting or leak must precede the Spy watch or Friend voucher.',
    early: {roles: ['foreigner', 'double'], dir: 'in'}, late: {roles: ['spy', 'friend'], dir: 'in'}
  }),
  timedRule({
    id: 've-62', domain: 6, title: 'Targeted after cover',
    order: 'Shoot anyone vouched for by a Friend or tipped off by a Civilian before a Foe targeted them or a Foreigner met them.',
    hint: 'Check dispatch times: Friend backing or Civilian tip-off must precede the Foe attack or Foreigner meeting.',
    early: {roles: ['friend', 'civilian'], dir: 'in'}, late: {roles: ['foe', 'foreigner'], dir: 'in'}
  }),
  timedRule({
    id: 've-63', domain: 6, title: 'Leaked then shadowed',
    order: 'Shoot anyone who leaked as a Double agent or targeted as a Foe before a Spy shadowed them or a Civilian tipped them off.',
    hint: 'Check dispatch times: operating as a Double agent or Foe must precede the Spy watch or Civilian tip-off.',
    early: {roles: ['double', 'foe'], dir: 'out'}, late: {roles: ['spy', 'civilian'], dir: 'in'}
  }),
  timedRule({
    id: 've-64', domain: 6, title: 'Shadowed then turned',
    order: 'Shoot anyone shadowed by a Spy or tipped off by a Civilian before they targeted as a Foe, leaked as a Double agent, or met as a Foreigner.',
    hint: 'Check dispatch times: the Spy watch or Civilian tip-off must precede operating as a Foe, Double agent, or Foreigner.',
    early: {roles: ['spy', 'civilian'], dir: 'in'}, late: {roles: ['foe', 'double', 'foreigner'], dir: 'out'}
  }),
  carry({
    id: 've-65', domain: 6, title: 'Delayed foreign handoff',
    order: 'Shoot anyone who moves as a Friend or Civilian toward someone who later operates as a Double agent or Foreigner (no return).',
    hint: 'Follow a Friend or Civilian link, then check that the second action happened at a later time.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'out', timeOrder: 'before'
  }),
  carry({
    id: 've-66', domain: 6, title: 'Pre-staged betrayal',
    order: 'Shoot anyone vouched for by a Friend or shadowed by a Spy who had ALREADY leaked as a Double agent or met as a Foreigner earlier.',
    hint: 'Trace Friend vouching or Spy watch back to the actor, then check that their Double agent or Foreigner action came earlier.',
    firstRoles: ['friend', 'spy'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'out', timeOrder: 'after'
  }),
  carry({
    id: 've-67', domain: 6, title: 'Late Spy catch',
    order: 'Shoot anyone shadowed by a Spy or tipped off by a Civilian who had ALREADY been targeted by a Foe or met by a Foreigner earlier.',
    hint: 'Check Spy shadows and Civilian tip-offs where the actor had earlier been targeted by a Foe or met by a Foreigner.',
    firstRoles: ['spy', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'in', timeOrder: 'after'
  }),
  timedRule({
    id: 've-68', domain: 6, title: 'Tipped before foreign drop',
    order: 'Shoot anyone tipped off by a Civilian or vouched for by a Friend before a Foreigner met them or a Double agent leaked to them.',
    hint: 'Check dispatch times: the Civilian tip-off or Friend voucher must precede the Foreigner meeting or Double agent leak.',
    early: {roles: ['civilian', 'friend'], dir: 'in'}, late: {roles: ['foreigner', 'double'], dir: 'in'}
  }),
  timedRule({
    id: 've-69', domain: 6, title: 'Strike before cover',
    order: 'Shoot anyone who targeted as a Foe or leaked as a Double agent before a Friend vouched for them or a Spy shadowed them.',
    hint: 'Check dispatch times: operating as a Foe or Double agent must precede Friend backing or Spy shadowing.',
    early: {roles: ['foe', 'double'], dir: 'out'}, late: {roles: ['friend', 'spy'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 7: Tainted Sources (10)
  // =========================================================================
  carry({
    id: 've-70', domain: 7, title: 'Vouched by a shadow contact',
    order: 'Shoot anyone vouched for by a Friend or tipped off by a Civilian who is tied anywhere in Double agent or Foreigner — unless a Spy shadows them.',
    hint: 'Check Friend vouchers and Civilian informants tied to Double agent or Foreigner, then rule out targets under Spy watch.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'any', exc: {roles: ['spy'], dir: 'in'}
  }),
  carry({
    id: 've-71', domain: 7, title: 'Tipped by a shadow contact',
    order: 'Shoot anyone tipped off by a Civilian or shadowed by a Spy who is tied anywhere in Foe or Foreigner — unless a Friend vouches for them.',
    hint: 'Check Civilian informants and Spies tied to Foe or Foreigner, then rule out targets backed by a Friend.',
    firstRoles: ['civilian', 'spy'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'any', exc: {roles: ['friend'], dir: 'in'}
  }),
  carry({
    id: 've-72', domain: 7, title: 'Shadowed by a mole-linked contact',
    order: 'Shoot anyone shadowed by a Spy or met by a Foreigner who is tied anywhere in Foe or Double agent — unless a Friend vouches for them.',
    hint: 'Check Spies and Foreigners tied to Foe or Double agent, then rule out targets backed by a Friend.',
    firstRoles: ['spy', 'foreigner'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'any', exc: {roles: ['friend'], dir: 'in'}
  }),
  carry({
    id: 've-73', domain: 7, title: 'Enemy via mole',
    order: 'Shoot anyone targeted by a Foe or met by a Foreigner who is tied anywhere in Double agent or Civilian — unless a Spy shadows them.',
    hint: 'Check Foes and Foreigners tied to Double agent or Civilian, then exclude targets under Spy watch.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'in', secondRoles: ['double', 'civilian'], secondDir: 'any', exc: {roles: ['spy'], dir: 'in'}
  }),
  carry({
    id: 've-74', domain: 7, title: 'Fed by an enemy-linked source',
    order: 'Shoot anyone fed a Double agent’s leak or targeted by a Foe who is tied anywhere in Foreigner or Spy — unless a Friend vouches for them.',
    hint: 'Check Double agents and Foes tied to Foreigner or Spy, then exclude targets backed by a Friend.',
    firstRoles: ['double', 'foe'], firstDir: 'in', secondRoles: ['foreigner', 'spy'], secondDir: 'any', exc: {roles: ['friend'], dir: 'in'}
  }),
  carry({
    id: 've-75', domain: 7, title: 'Met by an exposed outsider',
    order: 'Shoot anyone met by a Foreigner or vouched for by a Friend who is tied anywhere in Foe or Double agent — unless a Civilian tips them off.',
    hint: 'Check Foreigners and Friends tied to Foe or Double agent, then rule out targets tipped off by a Civilian.',
    firstRoles: ['foreigner', 'friend'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'any', exc: {roles: ['civilian'], dir: 'in'}
  }),
  carry({
    id: 've-76', domain: 7, title: 'Enemy’s inside mark',
    order: 'Shoot anyone who targets as a Foe or meets as a Foreigner someone tied to Friend or Spy — unless a Spy shadows them.',
    hint: 'Check Foes and Foreigners whose contact is tied to Friend or Spy, then exclude anyone under Spy watch.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'any', exc: {roles: ['spy'], dir: 'in'}
  }),
  carry({
    id: 've-77', domain: 7, title: 'Mole’s civilian mark',
    order: 'Shoot anyone who leaks as a Double agent or targets as a Foe someone tied to Civilian or Friend — unless a Spy shadows them.',
    hint: 'Check Double agents and Foes acting on someone tied to Civilian or Friend, then exclude those under Spy watch.',
    firstRoles: ['double', 'foe'], firstDir: 'out', secondRoles: ['civilian', 'friend'], secondDir: 'any', exc: {roles: ['spy'], dir: 'in'}
  }),
  carry({
    id: 've-78', domain: 7, title: 'Foreigner’s inside mark',
    order: 'Shoot anyone who meets as a Foreigner or shadows as a Spy someone tied to Friend or Civilian — unless a Friend vouches for them.',
    hint: 'Check Foreigners and Spies reaching someone tied to Friend or Civilian, then exclude those backed by a Friend.',
    firstRoles: ['foreigner', 'spy'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'any', exc: {roles: ['friend'], dir: 'in'}
  }),
  carry({
    id: 've-79', domain: 7, title: 'Unbacked informant’s target',
    order: 'Shoot anyone who tips off as a Civilian or vouches as a Friend someone tied to Foe or Foreigner — unless a Friend vouches for them.',
    hint: 'Check Civilian informants and Friends reaching someone tied to Foe or Foreigner, then exclude those backed by a Friend.',
    firstRoles: ['civilian', 'friend'], firstDir: 'out', secondRoles: ['foe', 'foreigner'], secondDir: 'any', exc: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 8: Double Lives (10)
  // =========================================================================
  carry({
    id: 've-80', domain: 8, title: 'Shadow-linked voucher',
    order: 'Shoot anyone who vouches as a Friend or shadows as a Spy someone who also operates as a Foe, Double agent, or Foreigner.',
    hint: 'Follow Friend vouching and Spy shadowing to the contact, then check if they operate as a Foe, Double agent, or Foreigner.',
    firstRoles: ['friend', 'spy'], firstDir: 'out', secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-81', domain: 8, title: 'Shadow-linked watcher',
    order: 'Shoot anyone who shadows as a Spy or targets as a Foe someone who also operates as a Friend or Civilian.',
    hint: 'Follow Spy shadowing and Foe targeting to the contact, then check if they operate as a Friend or Civilian.',
    firstRoles: ['spy', 'foe'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'out'
  }),
  carry({
    id: 've-82', domain: 8, title: 'Enemy targeting an insider',
    order: 'Shoot anyone who targets as a Foe or leaks as a Double agent to someone who vouches as a Friend or shadows as a Spy.',
    hint: 'Follow Foe targeting and Double agent leaks to the contact, then check if they operate as a Friend or Spy.',
    firstRoles: ['foe', 'double'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'out'
  }),
  carry({
    id: 've-83', domain: 8, title: 'Foreigner meeting an insider',
    order: 'Shoot anyone who meets as a Foreigner or shadows as a Spy someone who vouches as a Friend or tips off as a Civilian.',
    hint: 'Follow Foreigner meetings and Spy shadowing to the contact, then check if they operate as a Friend or Civilian.',
    firstRoles: ['foreigner', 'spy'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'out'
  }),
  carry({
    id: 've-84', domain: 8, title: 'Mole leaking to a watcher',
    order: 'Shoot anyone who leaks as a Double agent or tips off as a Civilian someone who shadows as a Spy or targets as a Foe.',
    hint: 'Follow Double agent leaks and Civilian tip-offs to the recipient, then check if they operate as a Spy or Foe.',
    firstRoles: ['double', 'civilian'], firstDir: 'out', secondRoles: ['spy', 'foe'], secondDir: 'out'
  }),
  carry({
    id: 've-85', domain: 8, title: 'Insider recipient of a shadow actor',
    order: 'Shoot anyone vouched for by a Friend or tipped off by a Civilian who also operates as a Foe or Foreigner.',
    hint: 'Trace Friend backing or Civilian tip-off back to the actor, then check if they operate as a Foe or Foreigner.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-86', domain: 8, title: 'Shadow target of an insider actor',
    order: 'Shoot anyone targeted by a Foe or met by a Foreigner who also vouches as a Friend or tips off as a Civilian.',
    hint: 'Trace Foe targeting or Foreigner meeting back to the actor, then check if they operate as a Friend or Civilian.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'in', secondRoles: ['friend', 'civilian'], secondDir: 'out'
  }),
  carry({
    id: 've-87', domain: 8, title: 'Spy’s shadow partner',
    order: 'Shoot anyone who shadows as a Spy or tips off as a Civilian someone fed a Double agent’s leak or targeted by a Foe.',
    hint: 'Follow Spy shadowing and Civilian tip-offs to the contact, then check if they receive a Double agent leak or Foe attack.',
    firstRoles: ['spy', 'civilian'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'in'
  }),
  carry({
    id: 've-88', domain: 8, title: 'Friend’s watched partner',
    order: 'Shoot anyone who vouches as a Friend or meets as a Foreigner someone shadowed by a Spy or targeted by a Foe.',
    hint: 'Follow Friend vouching and Foreigner meetings to the contact, then check if a Spy shadows or a Foe targets them.',
    firstRoles: ['friend', 'foreigner'], firstDir: 'out', secondRoles: ['spy', 'foe'], secondDir: 'in'
  }),
  carry({
    id: 've-89', domain: 8, title: 'Enemy’s watched victim',
    order: 'Shoot anyone who targets as a Foe or meets as a Foreigner someone shadowed by a Spy or fed a Double agent’s leak.',
    hint: 'Follow Foe targeting and Foreigner meetings to the contact, then check if a Spy shadows or a Double agent leaks to them.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'out', secondRoles: ['spy', 'double'], secondDir: 'in'
  }),

  // =========================================================================
  // DOMAIN 9: Command & Leverage (2-Step Anchor Relays) (10)
  // =========================================================================
  anchorCarry({
    id: 've-90', domain: 9, title: 'Two steps from {name}',
    order: 'Shoot anyone reached in two forward steps from {name} (not directly linked to {name}).',
    hint: 'Follow who {name} reaches, then follow who those people reach — skipping direct contacts of {name}.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out',
    excludeDirect: true
  }),
  anchorCarry({
    id: 've-91', domain: 9, title: 'Two steps into {name}',
    order: 'Shoot anyone who reaches {name} in two forward steps (not directly linked to {name}).',
    hint: 'Work backward from {name}: who initiates on {name}, and who initiates on them?',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in',
    excludeDirect: true
  }),
  anchorCarry({
    id: 've-92', domain: 9, title: '{name}’s shadow reach',
    order: 'Shoot anyone reached from {name} in two forward steps where the second contact is in Foe, Double agent, or Foreigner.',
    hint: 'Follow {name}’s outgoing contacts, then take a Foe, Double agent, or Foreigner step.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['foe', 'double', 'foreigner'], step2Dir: 'out'
  }),
  anchorCarry({
    id: 've-93', domain: 9, title: '{name}’s insider reach',
    order: 'Shoot anyone reached from {name} in two forward steps where the second contact is in Friend, Spy, or Civilian.',
    hint: 'Follow {name}’s outgoing contacts, then take a Friend, Spy, or Civilian step.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'spy', 'civilian'], step2Dir: 'out'
  }),
  anchorCarry({
    id: 've-94', domain: 9, title: 'Shared target with {name}',
    order: 'Shoot anyone else who initiates directly upon the same person {name} reaches.',
    hint: 'Find who {name} reaches, then see who else also reaches those same people.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in'
  }),
  anchorCarry({
    id: 've-95', domain: 9, title: 'Shared handler with {name}',
    order: 'Shoot anyone else reached by the same person who reaches {name}.',
    hint: 'Find who reaches {name}, then see who else that person reaches.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out'
  }),
  anchorCarry({
    id: 've-96', domain: 9, title: '{name}’s unbacked second-hop',
    order: 'Shoot anyone two contacts away from {name} (not directly linked to {name}) who has no Friend vouching for them.',
    hint: 'Trace two contacts from {name}, skip direct links, and rule out anyone backed by a Friend.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'any',
    excludeDirect: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  anchorCarry({
    id: 've-97', domain: 9, title: '{name}’s unwatched second-hop',
    order: 'Shoot anyone two contacts away from {name} (not directly linked to {name}) who is not shadowed by a Spy.',
    hint: 'Trace two contacts from {name}, skip direct links, and rule out anyone shadowed by a Spy.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'any',
    excludeDirect: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  anchorCarry({
    id: 've-98', domain: 9, title: 'Timed relay from {name}',
    order: 'Shoot anyone reached from {name} in two forward steps where the second dispatch happened LATER than the first.',
    hint: 'Follow two forward contacts from {name} and verify the second dispatch time is later.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out',
    timeOrder: 'before'
  }),
  anchorCarry({
    id: 've-99', domain: 9, title: 'Timed relay into {name}',
    order: 'Shoot anyone who reaches {name} in two forward steps where the first dispatch happened EARLIER than the contact into {name}.',
    hint: 'Work backward two steps from {name} and check that the first link occurred at an earlier time.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in',
    timeOrder: 'after'
  })
];
