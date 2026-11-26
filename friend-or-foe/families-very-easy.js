import {collectMatches} from './case-graph.js';
import {matchAnchorRelay, matchAtom, matchRelay, matchTemporal} from './case-predicates.js';

// 100 genuinely distinct Very Easy intelligence cases (10 domains × 10 families).
// Directional 2-step carry-over, intermediary checks, and temporal sequence across confirmed files.
// Zero single-file shortcuts, zero directional sloppiness, zero meta-UI terms, variable targets (1–4).

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
    id: 've-00', domain: 0, title: 'Tainted voucher',
    order: 'Shoot anyone vouched for by a Friend who also leaks as a Double agent or meets as a Foreigner.',
    hint: 'Trace who vouches in Friend, then see if that voucher acts in Double agent or Foreigner.',
    firstRoles: ['friend'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-01', domain: 0, title: 'Vouching for a mole',
    order: 'Shoot anyone who vouches as a Friend for someone who leaks as a Double agent or meets as a Foreigner.',
    hint: 'Follow each Friend voucher to the person they back, then check if that person acts in Double agent or Foreigner.',
    firstRoles: ['friend'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-02', domain: 0, title: 'Vouched by an enemy',
    order: 'Shoot anyone vouched for by a Friend who also targets someone as a Foe.',
    hint: 'Check each Friend voucher, then see if that voucher also targets someone in Foe.',
    firstRoles: ['friend'], firstDir: 'in', secondRoles: ['foe'], secondDir: 'out'
  }),
  carry({
    id: 've-03', domain: 0, title: 'Backing a hostile',
    order: 'Shoot anyone who vouches as a Friend for someone who targets someone as a Foe.',
    hint: 'Follow Friend vouching to the backed person, then check if they target someone as a Foe.',
    firstRoles: ['friend'], firstDir: 'out', secondRoles: ['foe'], secondDir: 'out'
  }),
  carry({
    id: 've-04', domain: 0, title: 'Leaked to an ally',
    order: 'Shoot anyone who leaks as a Double agent to someone backed by a Friend.',
    hint: 'Follow each Double agent leak to its recipient, then check if a Friend vouches for that recipient.',
    firstRoles: ['double'], firstDir: 'out', secondRoles: ['friend'], secondDir: 'in'
  }),
  carry({
    id: 've-05', domain: 0, title: 'Vouched by a mark',
    order: 'Shoot anyone vouched for by a Friend who is targeted by a Foe or shadowed by a Spy.',
    hint: 'Look at each Friend voucher, then see if a Foe targets or a Spy shadows that voucher.',
    firstRoles: ['friend'], firstDir: 'in', secondRoles: ['foe', 'spy'], secondDir: 'in'
  }),
  carry({
    id: 've-06', domain: 0, title: 'Mole’s friend-backed partner',
    order: 'Shoot anyone who receives a Double agent’s leak from someone who vouches as a Friend or tips off as a Civilian.',
    hint: 'Trace each Double agent leak back to the mole, then check if that mole acts in Friend or Civilian.',
    firstRoles: ['double'], firstDir: 'in', secondRoles: ['friend', 'civilian'], secondDir: 'out'
  }),
  carry({
    id: 've-07', domain: 0, title: 'Ally of a leak recipient',
    order: 'Shoot anyone who vouches as a Friend for someone fed a Double agent’s leak or met by a Foreigner.',
    hint: 'Follow Friend vouching to the backed person, then see if they receive a leak or Foreigner meeting.',
    firstRoles: ['friend'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'in'
  }),
  carry({
    id: 've-08', domain: 0, title: 'Vouched by an exposed mole',
    order: 'Shoot anyone vouched for by a Friend who receives a Double agent’s leak or is met by a Foreigner.',
    hint: 'Check each Friend voucher, then see if that voucher receives a leak or Foreigner meeting.',
    firstRoles: ['friend'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'in'
  }),
  carry({
    id: 've-09', domain: 0, title: 'Covertly backed enemy',
    order: 'Shoot anyone who targets as a Foe someone vouched for by a Friend or tipped off by a Civilian.',
    hint: 'Follow each Foe target to the victim, then check if a Friend vouches for or a Civilian tips off that victim.',
    firstRoles: ['foe'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'in'
  }),

  // =========================================================================
  // DOMAIN 1: Surveillance & Blind Spots (10)
  // =========================================================================
  carry({
    id: 've-10', domain: 1, title: 'Watched by a mole',
    order: 'Shoot anyone shadowed by a Spy who also leaks as a Double agent or meets as a Foreigner.',
    hint: 'Find who is shadowing in Spy, then check if that Spy acts in Double agent or Foreigner.',
    firstRoles: ['spy'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-11', domain: 1, title: 'Shadowing a mole',
    order: 'Shoot anyone who shadows as a Spy someone who leaks as a Double agent or targets as a Foe.',
    hint: 'Follow each Spy watch to the watched person, then check if they act in Double agent or Foe.',
    firstRoles: ['spy'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'out'
  }),
  carry({
    id: 've-12', domain: 1, title: 'Watched by a hostile',
    order: 'Shoot anyone shadowed by a Spy who also targets someone as a Foe.',
    hint: 'Trace each Spy shadow back to the watcher, then check if that watcher targets someone in Foe.',
    firstRoles: ['spy'], firstDir: 'in', secondRoles: ['foe'], secondDir: 'out'
  }),
  carry({
    id: 've-13', domain: 1, title: 'Shadowing a foreign contact',
    order: 'Shoot anyone who shadows as a Spy someone met by a Foreigner or tipped off by a Civilian.',
    hint: 'Follow each Spy watch to the watched person, then check if a Foreigner meets or a Civilian tips them off.',
    firstRoles: ['spy'], firstDir: 'out', secondRoles: ['foreigner', 'civilian'], secondDir: 'in'
  }),
  carry({
    id: 've-14', domain: 1, title: 'Spy’s exposed quarry',
    order: 'Shoot anyone targeted by a Foe who is shadowed by a Spy.',
    hint: 'Trace each Foe attack back to the Foe, then check if a Spy shadows that Foe.',
    firstRoles: ['foe'], firstDir: 'in', secondRoles: ['spy'], secondDir: 'in'
  }),
  carry({
    id: 've-15', domain: 1, title: 'Leaking to a watched mark',
    order: 'Shoot anyone who leaks as a Double agent to someone shadowed by a Spy.',
    hint: 'Follow each Double agent leak to its recipient, then check if a Spy shadows that recipient.',
    firstRoles: ['double'], firstDir: 'out', secondRoles: ['spy'], secondDir: 'in'
  }),
  carry({
    id: 've-16', domain: 1, title: 'Watched by a targeted Spy',
    order: 'Shoot anyone shadowed by a Spy who is targeted by a Foe or met by a Foreigner.',
    hint: 'Trace each Spy shadow back to the Spy, then check if a Foe targets or a Foreigner meets that Spy.',
    firstRoles: ['spy'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'in'
  }),
  carry({
    id: 've-17', domain: 1, title: 'Vouched by a Spy',
    order: 'Shoot anyone vouched for by a Friend who also shadows someone as a Spy.',
    hint: 'Trace each Friend voucher, then check if that voucher also shadows someone in Spy.',
    firstRoles: ['friend'], firstDir: 'in', secondRoles: ['spy'], secondDir: 'out'
  }),
  carry({
    id: 've-18', domain: 1, title: 'Shadowing a Friend’s ward',
    order: 'Shoot anyone who shadows as a Spy someone vouched for by a Friend.',
    hint: 'Follow each Spy watch to the watched person, then check if a Friend vouches for them.',
    firstRoles: ['spy'], firstDir: 'out', secondRoles: ['friend'], secondDir: 'in'
  }),
  carry({
    id: 've-19', domain: 1, title: 'Watched by an ally',
    order: 'Shoot anyone shadowed by a Spy who also vouches as a Friend or tips off as a Civilian.',
    hint: 'Trace each Spy shadow back to the Spy, then check if that Spy acts in Friend or Civilian.',
    firstRoles: ['spy'], firstDir: 'in', secondRoles: ['friend', 'civilian'], secondDir: 'out'
  }),

  // =========================================================================
  // DOMAIN 2: Foreign Contact (10)
  // =========================================================================
  carry({
    id: 've-20', domain: 2, title: 'Foreigner’s mole link',
    order: 'Shoot anyone met by a Foreigner who also leaks as a Double agent or targets as a Foe.',
    hint: 'Trace each Foreigner meeting back to the Foreigner, then check if they act in Double agent or Foe.',
    firstRoles: ['foreigner'], firstDir: 'in', secondRoles: ['double', 'foe'], secondDir: 'out'
  }),
  carry({
    id: 've-21', domain: 2, title: 'Meeting a mole',
    order: 'Shoot anyone who meets as a Foreigner someone who leaks as a Double agent or targets as a Foe.',
    hint: 'Follow each Foreigner meeting to the contact, then check if that contact acts in Double agent or Foe.',
    firstRoles: ['foreigner'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'out'
  }),
  carry({
    id: 've-22', domain: 2, title: 'Meeting a Friend’s ward',
    order: 'Shoot anyone who meets as a Foreigner someone vouched for by a Friend.',
    hint: 'Follow each Foreigner meeting to the contact, then check if a Friend vouches for them.',
    firstRoles: ['foreigner'], firstDir: 'out', secondRoles: ['friend'], secondDir: 'in'
  }),
  carry({
    id: 've-23', domain: 2, title: 'Met by an insider',
    order: 'Shoot anyone met by a Foreigner who also vouches as a Friend or shadows as a Spy.',
    hint: 'Trace each Foreigner meeting back to the Foreigner, then check if they act in Friend or Spy.',
    firstRoles: ['foreigner'], firstDir: 'in', secondRoles: ['friend', 'spy'], secondDir: 'out'
  }),
  carry({
    id: 've-24', domain: 2, title: 'Foreigner meeting a watched suspect',
    order: 'Shoot anyone who meets as a Foreigner someone shadowed by a Spy or tipped off by a Civilian.',
    hint: 'Follow each Foreigner meeting to the contact, then check if a Spy shadows or a Civilian tips them off.',
    firstRoles: ['foreigner'], firstDir: 'out', secondRoles: ['spy', 'civilian'], secondDir: 'in'
  }),
  carry({
    id: 've-25', domain: 2, title: 'Met by a watched outsider',
    order: 'Shoot anyone met by a Foreigner who is shadowed by a Spy or targeted by a Foe.',
    hint: 'Trace each Foreigner meeting back to the Foreigner, then check if a Spy shadows or a Foe targets them.',
    firstRoles: ['foreigner'], firstDir: 'in', secondRoles: ['spy', 'foe'], secondDir: 'in'
  }),
  carry({
    id: 've-26', domain: 2, title: 'Leaking to a foreign contact',
    order: 'Shoot anyone who leaks as a Double agent to someone met by a Foreigner.',
    hint: 'Follow each Double agent leak to its recipient, then check if a Foreigner meets that recipient.',
    firstRoles: ['double'], firstDir: 'out', secondRoles: ['foreigner'], secondDir: 'in'
  }),
  carry({
    id: 've-27', domain: 2, title: 'Targeting a foreign contact',
    order: 'Shoot anyone who targets as a Foe someone met by a Foreigner.',
    hint: 'Follow each Foe target to the victim, then check if a Foreigner meets that victim.',
    firstRoles: ['foe'], firstDir: 'out', secondRoles: ['foreigner'], secondDir: 'in'
  }),
  carry({
    id: 've-28', domain: 2, title: 'Met by a civilian informant',
    order: 'Shoot anyone met by a Foreigner who also tips off someone as a Civilian.',
    hint: 'Trace each Foreigner meeting back to the Foreigner, then check if they tip off someone in Civilian.',
    firstRoles: ['foreigner'], firstDir: 'in', secondRoles: ['civilian'], secondDir: 'out'
  }),
  carry({
    id: 've-29', domain: 2, title: 'Meeting a leak recipient',
    order: 'Shoot anyone who meets as a Foreigner someone fed a Double agent’s leak or targeted by a Foe.',
    hint: 'Follow each Foreigner meeting to the contact, then check if they receive a leak or Foe attack.',
    firstRoles: ['foreigner'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'in'
  }),

  // =========================================================================
  // DOMAIN 3: Civilian Tip-Offs (10)
  // =========================================================================
  carry({
    id: 've-30', domain: 3, title: 'Tipped by a mole',
    order: 'Shoot anyone tipped off by a Civilian who also leaks as a Double agent or meets as a Foreigner.',
    hint: 'Trace each Civilian tip-off back to the informant, then check if they act in Double agent or Foreigner.',
    firstRoles: ['civilian'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-31', domain: 3, title: 'Tipping off a mole',
    order: 'Shoot anyone who tips off as a Civilian someone who leaks as a Double agent or targets as a Foe.',
    hint: 'Follow each Civilian tip-off to the recipient, then check if they act in Double agent or Foe.',
    firstRoles: ['civilian'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'out'
  }),
  carry({
    id: 've-32', domain: 3, title: 'Tipped by an enemy',
    order: 'Shoot anyone tipped off by a Civilian who also targets someone as a Foe.',
    hint: 'Trace each Civilian tip-off back to the informant, then check if that informant targets someone in Foe.',
    firstRoles: ['civilian'], firstDir: 'in', secondRoles: ['foe'], secondDir: 'out'
  }),
  carry({
    id: 've-33', domain: 3, title: 'Tipping off a foreign contact',
    order: 'Shoot anyone who tips off as a Civilian someone met by a Foreigner or fed a Double agent’s leak.',
    hint: 'Follow each Civilian tip-off to the recipient, then check if a Foreigner meets or a mole leaks to them.',
    firstRoles: ['civilian'], firstDir: 'out', secondRoles: ['foreigner', 'double'], secondDir: 'in'
  }),
  carry({
    id: 've-34', domain: 3, title: 'Tipped by a watched source',
    order: 'Shoot anyone tipped off by a Civilian who is shadowed by a Spy or targeted by a Foe.',
    hint: 'Trace each Civilian tip-off back to the informant, then check if a Spy shadows or a Foe targets them.',
    firstRoles: ['civilian'], firstDir: 'in', secondRoles: ['spy', 'foe'], secondDir: 'in'
  }),
  carry({
    id: 've-35', domain: 3, title: 'Tipping off a Friend’s ward',
    order: 'Shoot anyone who tips off as a Civilian someone vouched for by a Friend or shadowed by a Spy.',
    hint: 'Follow each Civilian tip-off to the recipient, then check if a Friend backs or a Spy shadows them.',
    firstRoles: ['civilian'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'in'
  }),
  carry({
    id: 've-36', domain: 3, title: 'Tipped by an insider',
    order: 'Shoot anyone tipped off by a Civilian who also vouches as a Friend or shadows as a Spy.',
    hint: 'Trace each Civilian tip-off back to the informant, then check if they act in Friend or Spy.',
    firstRoles: ['civilian'], firstDir: 'in', secondRoles: ['friend', 'spy'], secondDir: 'out'
  }),
  carry({
    id: 've-37', domain: 3, title: 'Leaking to an informant',
    order: 'Shoot anyone who leaks as a Double agent to someone who tips off as a Civilian.',
    hint: 'Follow each Double agent leak to its recipient, then check if that recipient acts in Civilian.',
    firstRoles: ['double'], firstDir: 'out', secondRoles: ['civilian'], secondDir: 'out'
  }),
  carry({
    id: 've-38', domain: 3, title: 'Targeted by an informant',
    order: 'Shoot anyone targeted by a Foe who also tips off someone as a Civilian.',
    hint: 'Trace each Foe attack back to the Foe, then check if that Foe also acts in Civilian.',
    firstRoles: ['foe'], firstDir: 'in', secondRoles: ['civilian'], secondDir: 'out'
  }),
  carry({
    id: 've-39', domain: 3, title: 'Tipping off a targeted suspect',
    order: 'Shoot anyone who tips off as a Civilian someone targeted by a Foe.',
    hint: 'Follow each Civilian tip-off to the recipient, then check if a Foe targets that recipient.',
    firstRoles: ['civilian'], firstDir: 'out', secondRoles: ['foe'], secondDir: 'in'
  }),

  // =========================================================================
  // DOMAIN 4: Proxy Chains (2-Step Operational Relays) (10)
  // =========================================================================
  carry({
    id: 've-40', domain: 4, title: 'Covert handoff starter',
    order: 'Shoot anyone who leaks as a Double agent to someone who then meets a contact as a Foreigner (no return).',
    hint: 'Follow a Double agent leak to the middleman, then follow that middleman acting in Foreigner.',
    firstRoles: ['double'], firstDir: 'out', secondRoles: ['foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-41', domain: 4, title: 'Hostile handoff starter',
    order: 'Shoot anyone who targets as a Foe someone who then leaks as a Double agent or meets as a Foreigner (no return).',
    hint: 'Follow a Foe target to the victim, then check if that victim acts in Double agent or Foreigner.',
    firstRoles: ['foe'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-42', domain: 4, title: 'Covert relay receiver',
    order: 'Shoot anyone met by a Foreigner who received a Double agent’s leak or Civilian tip-off (no return).',
    hint: 'Trace a Foreigner meeting back to the Foreigner, then check if they received a leak or tip-off.',
    firstRoles: ['foreigner'], firstDir: 'in', secondRoles: ['double', 'civilian'], secondDir: 'in'
  }),
  carry({
    id: 've-43', domain: 4, title: 'Ally-to-Spy relay',
    order: 'Shoot anyone who vouches as a Friend for someone who then shadows as a Spy or tips off as a Civilian (no return).',
    hint: 'Follow a Friend voucher to their ward, then see if that ward acts in Spy or Civilian.',
    firstRoles: ['friend'], firstDir: 'out', secondRoles: ['spy', 'civilian'], secondDir: 'out'
  }),
  carry({
    id: 've-44', domain: 4, title: 'Mole-to-hostile receiver',
    order: 'Shoot anyone targeted by a Foe who received a Double agent’s leak or was met by a Foreigner (no return).',
    hint: 'Trace a Foe attack back to the Foe, then check if a Double agent leaked to or a Foreigner met that Foe.',
    firstRoles: ['foe'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'in'
  }),
  carry({
    id: 've-45', domain: 4, title: 'Spy-to-mole starter',
    order: 'Shoot anyone who shadows as a Spy someone who then leaks as a Double agent or meets as a Foreigner (no return).',
    hint: 'Follow a Spy shadow to the watched person, then check if they act in Double agent or Foreigner.',
    firstRoles: ['spy'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-46', domain: 4, title: 'Two-step threat receiver',
    order: 'Shoot anyone who receives a Double agent’s leak from someone targeted by a Foe or shadowed by a Spy (no return).',
    hint: 'Trace a Double agent leak back to the mole, then check if a Foe targets or a Spy shadows that mole.',
    firstRoles: ['double'], firstDir: 'in', secondRoles: ['foe', 'spy'], secondDir: 'in'
  }),
  carry({
    id: 've-47', domain: 4, title: 'Cover-to-hostile receiver',
    order: 'Shoot anyone targeted by a Foe who was vouched for by a Friend (no return).',
    hint: 'Trace a Foe attack back to the Foe, then check if a Friend vouched for that Foe.',
    firstRoles: ['foe'], firstDir: 'in', secondRoles: ['friend'], secondDir: 'in'
  }),
  carry({
    id: 've-48', domain: 4, title: 'Tip-to-cover starter',
    order: 'Shoot anyone who tips off as a Civilian someone who then vouches as a Friend or shadows as a Spy (no return).',
    hint: 'Follow a Civilian tip-off to the recipient, then check if they act in Friend or Spy.',
    firstRoles: ['civilian'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'out'
  }),
  carry({
    id: 've-49', domain: 4, title: 'Cross-category relay starter',
    order: 'Shoot anyone who acts in Friend or Civilian toward someone who then acts in Foe or Double agent (no return).',
    hint: 'Follow a Friend or Civilian action, then check if the recipient acts in Foe or Double agent.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['foe', 'double'], secondDir: 'out'
  }),

  // =========================================================================
  // DOMAIN 5: Alibi & Contradiction (10)
  // =========================================================================
  carry({
    id: 've-50', domain: 5, title: 'Protected by an enemy’s mark',
    order: 'Shoot anyone vouched for by a Friend who is targeted by a Foe — excluding anyone shadowed by a Spy.',
    hint: 'Find who a Friend backs whose voucher is targeted by a Foe, then exclude anyone under Spy watch.',
    firstRoles: ['friend'], firstDir: 'in', secondRoles: ['foe'], secondDir: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),
  carry({
    id: 've-51', domain: 5, title: 'Targeted by a Friend’s partner',
    order: 'Shoot anyone targeted by a Foe who also vouches as a Friend.',
    hint: 'Trace each Foe attack back to the Foe, then check if that Foe vouches for someone in Friend.',
    firstRoles: ['foe'], firstDir: 'in', secondRoles: ['friend'], secondDir: 'out'
  }),
  carry({
    id: 've-52', domain: 5, title: 'Leaked to by a Spy',
    order: 'Shoot anyone who receives a Double agent’s leak from someone who also shadows as a Spy.',
    hint: 'Trace each Double agent leak back to the mole, then check if that mole shadows someone in Spy.',
    firstRoles: ['double'], firstDir: 'in', secondRoles: ['spy'], secondDir: 'out'
  }),
  carry({
    id: 've-53', domain: 5, title: 'Targeted by a Spy',
    order: 'Shoot anyone targeted by a Foe who also shadows someone as a Spy.',
    hint: 'Trace each Foe attack back to the Foe, then check if that Foe also shadows someone in Spy.',
    firstRoles: ['foe'], firstDir: 'in', secondRoles: ['spy'], secondDir: 'out'
  }),
  carry({
    id: 've-54', domain: 5, title: 'Leaked to by a hostile',
    order: 'Shoot anyone who receives a Double agent’s leak from someone who also targets as a Foe or meets as a Foreigner.',
    hint: 'Trace each Double agent leak back to the mole, then check if that mole acts in Foe or Foreigner.',
    firstRoles: ['double'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-55', domain: 5, title: 'Targeted by a mole',
    order: 'Shoot anyone targeted by a Foe who also leaks as a Double agent or meets as a Foreigner.',
    hint: 'Trace each Foe attack back to the Foe, then check if that Foe acts in Double agent or Foreigner.',
    firstRoles: ['foe'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-56', domain: 5, title: 'Backed by a Civilian’s mark',
    order: 'Shoot anyone vouched for by a Friend who was tipped off by a Civilian.',
    hint: 'Trace each Friend voucher, then check if a Civilian tipped off that voucher.',
    firstRoles: ['friend'], firstDir: 'in', secondRoles: ['civilian'], secondDir: 'in'
  }),
  carry({
    id: 've-57', domain: 5, title: 'Met by a mole’s target',
    order: 'Shoot anyone met by a Foreigner who received a Double agent’s leak.',
    hint: 'Trace each Foreigner meeting back to the Foreigner, then check if a Double agent leaked to them.',
    firstRoles: ['foreigner'], firstDir: 'in', secondRoles: ['double'], secondDir: 'in'
  }),
  carry({
    id: 've-58', domain: 5, title: 'Shadowed by a tipped Spy',
    order: 'Shoot anyone shadowed by a Spy who was tipped off by a Civilian or vouched for by a Friend.',
    hint: 'Trace each Spy shadow back to the Spy, then check if a Civilian tipped off or a Friend backed that Spy.',
    firstRoles: ['spy'], firstDir: 'in', secondRoles: ['civilian', 'friend'], secondDir: 'in'
  }),
  carry({
    id: 've-59', domain: 5, title: 'Tipped by a Friend-backed source',
    order: 'Shoot anyone tipped off by a Civilian who is vouched for by a Friend.',
    hint: 'Trace each Civilian tip-off back to the informant, then check if a Friend vouches for that informant.',
    firstRoles: ['civilian'], firstDir: 'in', secondRoles: ['friend'], secondDir: 'in'
  }),

  // =========================================================================
  // DOMAIN 6: Chronology & Timing (10)
  // =========================================================================
  timedRule({
    id: 've-60', domain: 6, title: 'Vouched then betrayed',
    order: 'Shoot anyone vouched for by a Friend before they leaked as a Double agent or met as a Foreigner.',
    hint: 'Compare dispatch times: Friend vouching must come earlier than acting in Double agent or Foreigner.',
    early: {roles: ['friend'], dir: 'in'}, late: {roles: ['double', 'foreigner'], dir: 'out'}
  }),
  timedRule({
    id: 've-61', domain: 6, title: 'Met before shadowed',
    order: 'Shoot anyone met by a Foreigner or fed a Double agent’s leak before a Spy shadowed them.',
    hint: 'Check dispatch times: the Foreigner meeting or leak must precede the Spy watch.',
    early: {roles: ['foreigner', 'double'], dir: 'in'}, late: {roles: ['spy'], dir: 'in'}
  }),
  timedRule({
    id: 've-62', domain: 6, title: 'Targeted after cover',
    order: 'Shoot anyone vouched for by a Friend or tipped off by a Civilian before a Foe targeted them.',
    hint: 'Check dispatch times: Friend backing or Civilian tip-off must precede the Foe attack.',
    early: {roles: ['friend', 'civilian'], dir: 'in'}, late: {roles: ['foe'], dir: 'in'}
  }),
  timedRule({
    id: 've-63', domain: 6, title: 'Leaked then shadowed',
    order: 'Shoot anyone who leaked as a Double agent or targeted as a Foe before a Spy shadowed them.',
    hint: 'Check dispatch times: acting in Double agent or Foe must precede the Spy watch.',
    early: {roles: ['double', 'foe'], dir: 'out'}, late: {roles: ['spy'], dir: 'in'}
  }),
  timedRule({
    id: 've-64', domain: 6, title: 'Shadowed then turned',
    order: 'Shoot anyone shadowed by a Spy before they targeted as a Foe, leaked as a Double agent, or met as a Foreigner.',
    hint: 'Check dispatch times: the Spy watch must precede acting in Foe, Double agent, or Foreigner.',
    early: {roles: ['spy'], dir: 'in'}, late: {roles: ['foe', 'double', 'foreigner'], dir: 'out'}
  }),
  carry({
    id: 've-65', domain: 6, title: 'Delayed foreign handoff',
    order: 'Shoot anyone who acts in Friend or Civilian toward someone who LATER acts in Double agent or Foreigner (no return).',
    hint: 'Follow a Friend or Civilian link, then check that the second action happened at a later time.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'out', timeOrder: 'before'
  }),
  carry({
    id: 've-66', domain: 6, title: 'Pre-staged betrayal',
    order: 'Shoot anyone vouched for by a Friend who had ALREADY leaked as a Double agent or met as a Foreigner earlier.',
    hint: 'Trace Friend vouching back to the voucher, then check that the voucher’s covert action came earlier.',
    firstRoles: ['friend'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'out', timeOrder: 'after'
  }),
  carry({
    id: 've-67', domain: 6, title: 'Late Spy catch',
    order: 'Shoot anyone shadowed by a Spy who had ALREADY been targeted by a Foe or met by a Foreigner earlier.',
    hint: 'Check Spy shadows where the Spy had earlier been targeted by a Foe or met by a Foreigner.',
    firstRoles: ['spy'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'in', timeOrder: 'after'
  }),
  timedRule({
    id: 've-68', domain: 6, title: 'Tipped before foreign drop',
    order: 'Shoot anyone tipped off by a Civilian before a Foreigner met them or a Double agent leaked to them.',
    hint: 'Check dispatch times: the Civilian tip-off must precede the Foreigner meeting or Double agent leak.',
    early: {roles: ['civilian'], dir: 'in'}, late: {roles: ['foreigner', 'double'], dir: 'in'}
  }),
  timedRule({
    id: 've-69', domain: 6, title: 'Hostile before cover',
    order: 'Shoot anyone who targeted as a Foe or leaked as a Double agent before a Friend vouched for them.',
    hint: 'Check dispatch times: acting in Foe or Double agent must precede Friend backing.',
    early: {roles: ['foe', 'double'], dir: 'out'}, late: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 7: Tainted Sources (10)
  // =========================================================================
  carry({
    id: 've-70', domain: 7, title: 'Vouched by a covert contact',
    order: 'Shoot anyone vouched for by a Friend who appears anywhere in Double agent or Foreigner — unless shadowed by a Spy.',
    hint: 'Check Friend vouchers appearing in Double agent or Foreigner, then rule out targets under Spy watch.',
    firstRoles: ['friend'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'any', exc: {roles: ['spy'], dir: 'in'}
  }),
  carry({
    id: 've-71', domain: 7, title: 'Tipped by a covert contact',
    order: 'Shoot anyone tipped off by a Civilian who appears anywhere in Foe or Foreigner — unless backed by a Friend.',
    hint: 'Check Civilian informants appearing in Foe or Foreigner, then rule out targets backed by a Friend.',
    firstRoles: ['civilian'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'any', exc: {roles: ['friend'], dir: 'in'}
  }),
  carry({
    id: 've-72', domain: 7, title: 'Shadowed by a covert contact',
    order: 'Shoot anyone shadowed by a Spy who appears anywhere in Foe or Double agent — unless backed by a Friend.',
    hint: 'Check Spies appearing in Foe or Double agent, then rule out targets backed by a Friend.',
    firstRoles: ['spy'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'any', exc: {roles: ['friend'], dir: 'in'}
  }),
  carry({
    id: 've-73', domain: 7, title: 'Hostile via mole',
    order: 'Shoot anyone targeted by a Foe who appears anywhere in Double agent — unless shadowed by a Spy.',
    hint: 'Check Foes appearing in Double agent, then exclude targets under Spy watch.',
    firstRoles: ['foe'], firstDir: 'in', secondRoles: ['double'], secondDir: 'any', exc: {roles: ['spy'], dir: 'in'}
  }),
  carry({
    id: 've-74', domain: 7, title: 'Fed by a hostile',
    order: 'Shoot anyone receiving a Double agent’s leak from someone in Foe or Foreigner — unless backed by a Friend.',
    hint: 'Check Double agents appearing in Foe or Foreigner, then exclude targets backed by a Friend.',
    firstRoles: ['double'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'any', exc: {roles: ['friend'], dir: 'in'}
  }),
  carry({
    id: 've-75', domain: 7, title: 'Met by an exposed outsider',
    order: 'Shoot anyone met by a Foreigner who appears anywhere in Foe or Double agent — unless backed by a Friend.',
    hint: 'Check Foreigners appearing in Foe or Double agent, then rule out targets backed by a Friend.',
    firstRoles: ['foreigner'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'any', exc: {roles: ['friend'], dir: 'in'}
  }),
  carry({
    id: 've-76', domain: 7, title: 'Hostile’s inside mark',
    order: 'Shoot anyone who targets as a Foe someone appearing in Friend or Spy — unless shadowed by a Spy.',
    hint: 'Check Foes whose victim appears in Friend or Spy, then exclude Foes under Spy watch.',
    firstRoles: ['foe'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'any', exc: {roles: ['spy'], dir: 'in'}
  }),
  carry({
    id: 've-77', domain: 7, title: 'Mole’s civilian mark',
    order: 'Shoot anyone who leaks as a Double agent to someone appearing in Civilian or Friend — unless shadowed by a Spy.',
    hint: 'Check Double agents leaking to someone in Civilian or Friend, then exclude those under Spy watch.',
    firstRoles: ['double'], firstDir: 'out', secondRoles: ['civilian', 'friend'], secondDir: 'any', exc: {roles: ['spy'], dir: 'in'}
  }),
  carry({
    id: 've-78', domain: 7, title: 'Foreigner’s inside mark',
    order: 'Shoot anyone who meets as a Foreigner someone appearing in Friend or Civilian — unless shadowed by a Spy.',
    hint: 'Check Foreigners meeting someone in Friend or Civilian, then exclude those under Spy watch.',
    firstRoles: ['foreigner'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'any', exc: {roles: ['spy'], dir: 'in'}
  }),
  carry({
    id: 've-79', domain: 7, title: 'Unwatched informant’s target',
    order: 'Shoot anyone who tips off as a Civilian someone appearing in Foe or Foreigner — unless backed by a Friend.',
    hint: 'Check Civilian informants tipping off someone in Foe or Foreigner, then exclude those backed by a Friend.',
    firstRoles: ['civilian'], firstDir: 'out', secondRoles: ['foe', 'foreigner'], secondDir: 'any', exc: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 8: Double Lives (10)
  // =========================================================================
  carry({
    id: 've-80', domain: 8, title: 'Covertly linked voucher',
    order: 'Shoot anyone who vouches as a Friend for someone who also acts in Foe, Double agent, or Foreigner.',
    hint: 'Follow Friend vouching to the ward, then check if that ward acts in Foe, Double agent, or Foreigner.',
    firstRoles: ['friend'], firstDir: 'out', secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-81', domain: 8, title: 'Covertly linked shadow',
    order: 'Shoot anyone who shadows as a Spy someone who also acts in Friend or Civilian.',
    hint: 'Follow Spy shadowing to the watched person, then check if they act in Friend or Civilian.',
    firstRoles: ['spy'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'out'
  }),
  carry({
    id: 've-82', domain: 8, title: 'Hostile targeting an actor',
    order: 'Shoot anyone who targets as a Foe someone who vouches as a Friend or shadows as a Spy.',
    hint: 'Follow Foe targeting to the victim, then check if that victim acts in Friend or Spy.',
    firstRoles: ['foe'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'out'
  }),
  carry({
    id: 've-83', domain: 8, title: 'Foreigner meeting an actor',
    order: 'Shoot anyone who meets as a Foreigner someone who vouches as a Friend or tips off as a Civilian.',
    hint: 'Follow Foreigner meetings to the contact, then check if that contact acts in Friend or Civilian.',
    firstRoles: ['foreigner'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'out'
  }),
  carry({
    id: 've-84', domain: 8, title: 'Mole leaking to a watcher',
    order: 'Shoot anyone who leaks as a Double agent to someone who shadows as a Spy or targets as a Foe.',
    hint: 'Follow Double agent leaks to the recipient, then check if they act in Spy or Foe.',
    firstRoles: ['double'], firstDir: 'out', secondRoles: ['spy', 'foe'], secondDir: 'out'
  }),
  carry({
    id: 've-85', domain: 8, title: 'Overt recipient of a covert actor',
    order: 'Shoot anyone vouched for by a Friend or tipped off by a Civilian who also acts in Foe or Foreigner.',
    hint: 'Trace Friend backing or Civilian tip-off back to the actor, then check if they act in Foe or Foreigner.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-86', domain: 8, title: 'Covert target of an overt actor',
    order: 'Shoot anyone targeted by a Foe or met by a Foreigner who also vouches as a Friend or tips off as a Civilian.',
    hint: 'Trace Foe targeting or Foreigner meeting back to the actor, then check if they act in Friend or Civilian.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'in', secondRoles: ['friend', 'civilian'], secondDir: 'out'
  }),
  carry({
    id: 've-87', domain: 8, title: 'Spy’s covert partner',
    order: 'Shoot anyone who shadows as a Spy someone fed a Double agent’s leak or targeted by a Foe.',
    hint: 'Follow Spy shadowing to the watched person, then check if they receive a leak or Foe attack.',
    firstRoles: ['spy'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'in'
  }),
  carry({
    id: 've-88', domain: 8, title: 'Friend’s watched partner',
    order: 'Shoot anyone who vouches as a Friend for someone shadowed by a Spy or targeted by a Foe.',
    hint: 'Follow Friend vouching to the ward, then check if a Spy shadows or a Foe targets them.',
    firstRoles: ['friend'], firstDir: 'out', secondRoles: ['spy', 'foe'], secondDir: 'in'
  }),
  carry({
    id: 've-89', domain: 8, title: 'Hostile’s watched victim',
    order: 'Shoot anyone who targets as a Foe someone shadowed by a Spy or fed a Double agent’s leak.',
    hint: 'Follow Foe targeting to the victim, then check if a Spy shadows or a Double agent leaks to them.',
    firstRoles: ['foe'], firstDir: 'out', secondRoles: ['spy', 'double'], secondDir: 'in'
  }),

  // =========================================================================
  // DOMAIN 9: Command & Leverage (2-Step Anchor Relays) (10)
  // =========================================================================
  anchorCarry({
    id: 've-90', domain: 9, title: 'Two steps from {name}',
    order: 'Shoot anyone reached in two forward steps from {name} (not directly linked to {name}).',
    hint: 'Follow who {name} acts upon, then follow who those people act upon — skipping direct contacts of {name}.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out',
    excludeDirect: true
  }),
  anchorCarry({
    id: 've-91', domain: 9, title: 'Two steps into {name}',
    order: 'Shoot anyone who reaches {name} in two forward steps (not directly linked to {name}).',
    hint: 'Work backward from {name}: who acts on {name}, and who acts on them?',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in',
    excludeDirect: true
  }),
  anchorCarry({
    id: 've-92', domain: 9, title: '{name}’s covert reach',
    order: 'Shoot anyone reached from {name} in two forward steps where the second contact is in Foe, Double agent, or Foreigner.',
    hint: 'Follow {name}’s outgoing contacts, then take a Foe, Double agent, or Foreigner step.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['foe', 'double', 'foreigner'], step2Dir: 'out'
  }),
  anchorCarry({
    id: 've-93', domain: 9, title: '{name}’s overt reach',
    order: 'Shoot anyone reached from {name} in two forward steps where the second contact is in Friend, Spy, or Civilian.',
    hint: 'Follow {name}’s outgoing contacts, then take a Friend, Spy, or Civilian step.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'spy', 'civilian'], step2Dir: 'out'
  }),
  anchorCarry({
    id: 've-94', domain: 9, title: 'Shared target with {name}',
    order: 'Shoot anyone else who acts directly upon the same person {name} acts upon.',
    hint: 'Find who {name} acts upon, then see who else also acts upon those same people.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in'
  }),
  anchorCarry({
    id: 've-95', domain: 9, title: 'Shared handler with {name}',
    order: 'Shoot anyone else acted upon by the same person who acts upon {name}.',
    hint: 'Find who acts upon {name}, then see who else that person acts upon.',
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
