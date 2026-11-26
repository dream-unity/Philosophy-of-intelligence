import {collectMatches} from './case-graph.js?v=fof20';
import {
  matchAnchorRelay, matchAtom, matchCutoutBridge, matchIncidentCorroboration,
  matchIncidentDual, matchRelay, matchSiteTaint, matchTemporal
} from './case-predicates.js?v=fof20';

// 100 genuinely distinct Very Easy intelligence cases (10 domains × 10 families).
// Directional 2-step carry-over, operational-site cutouts, corroboration, and temporal sequence across confirmed dispatches.
// Every order matches its domain's exact operational verbs with zero "tied to" wording and zero role pooling.

function veSiteDual({id, domain, title, order, hint, rolesA = null, dirA = 'in', rolesB = null, dirB = 'out', sameIncident = true, timeOrder = null, diffRole = false, exc = null}) {
  return {
    id, tier: 'very-easy', domain, title, order, hint, useAnchor: false,
    evaluate(g, _anchor, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        const hit = matchIncidentDual(g, x, {rolesA, dirA, rolesB, dirB, sameIncident, timeOrder, diffRole});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.eA) + ' and ' + g.fmt(hit.eB) + '.' : 'ok';
      }, proof);
    }
  };
}

function veCutout({id, domain, title, order, hint, inRoles = null, outRoles = null, sameIncident = null, timeOrder = null, diffRole = false, unconnected = null, exc = null}) {
  return {
    id, tier: 'very-easy', domain, title, order, hint, useAnchor: false,
    evaluate(g, _anchor, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        const hit = matchCutoutBridge(g, x, {inRoles, outRoles, sameIncident, timeOrder, diffRole, unconnected});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' → ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  };
}

function veSiteCorr({id, domain, title, order, hint, rolesA = null, dirA = 'in', rolesB = null, dirB = 'in', sameIncident = true, connected = true, exc = null}) {
  return {
    id, tier: 'very-easy', domain, title, order, hint, useAnchor: false,
    evaluate(g, _anchor, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        const hit = matchIncidentCorroboration(g, x, {rolesA, dirA, rolesB, dirB, sameIncident, connected});
        if (!hit) return null;
        return proof
          ? x + ': ' + g.fmt(hit.eA) + ' & ' + g.fmt(hit.eB) + (hit.link ? ' (linked via ' + g.fmt(hit.link) + ').' : ' (no direct contact between them).')
          : 'ok';
      }, proof);
    }
  };
}

function veSiteTaint({id, domain, title, order, hint, roles1 = null, dir1 = 'in', roles2 = null, dir2 = 'in', sameIncident = null, timeOrder = null, exc = null}) {
  return {
    id, tier: 'very-easy', domain, title, order, hint, useAnchor: false,
    evaluate(g, _anchor, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        const hit = matchSiteTaint(g, x, {roles1, dir1, roles2, dir2, sameIncident, timeOrder});
        if (!hit) return null;
        return proof ? x + ': ' + g.fmt(hit.e1) + ' — source ' + hit.mid + ' has ' + g.fmt(hit.e2) + '.' : 'ok';
      }, proof);
    }
  };
}

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
  // DOMAIN 0: Cover & Betrayal (10) — clears, targets, audits, leaks to, warns, contacts
  // =========================================================================
  veCutout({
    id: 've-00', domain: 0, title: 'Same-site delayed relay',
    order: 'Drop anyone contacted on a site who later reaches a third person on that same site.',
    hint: 'Compare incoming and outgoing site tags and dispatch times for each suspect.',
    sameIncident: true, timeOrder: 'before'
  }),
  carry({
    id: 've-01', domain: 0, title: 'Clearing a mole or outsider',
    order: 'Engage anyone who clears as a Friend or audits as a Spy someone who leaks as a Double agent or contacts as a Foreigner.',
    hint: 'Follow Friend clearances and Spy audits to the recipient, then check their outgoing moves.',
    firstRoles: ['friend', 'spy'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'out'
  }),
  veSiteDual({
    id: 've-02', domain: 0, title: 'Contacted on both sites',
    order: 'Eliminate anyone contacted on both sites — unless cleared by a Friend.',
    hint: 'Check which suspects receive dispatches on both active sites, then spare anyone cleared by a Friend.',
    dirA: 'in', dirB: 'in', sameIncident: false, exc: {roles: ['friend'], dir: 'in'}
  }),
  carry({
    id: 've-03', domain: 0, title: 'Clearing a striker',
    order: 'Fire on anyone who clears as a Friend or warns as a Civilian someone who targets as a Foe or contacts as a Foreigner.',
    hint: 'Follow Friend clearances and Civilian warnings to the recipient, then check their outgoing moves.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['foe', 'foreigner'], secondDir: 'out'
  }),
  veSiteDual({
    id: 've-04', domain: 0, title: 'Active on both sites',
    order: 'Take down anyone initiating contacts on both sites — unless audited by a Spy.',
    hint: 'Find who initiates dispatches on both active sites, then spare anyone audited by a Spy.',
    dirA: 'out', dirB: 'out', sameIncident: false, exc: {roles: ['spy'], dir: 'in'}
  }),
  carry({
    id: 've-05', domain: 0, title: 'Cleared by a watched insider',
    order: 'Neutralize anyone cleared by a Friend or warned by a Civilian whose source is targeted by a Foe or audited by a Spy.',
    hint: 'Trace Friend clearances and Civilian warnings back to their sender, then check who reaches that sender.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'spy'], secondDir: 'in'
  }),
  veSiteDual({
    id: 've-06', domain: 0, title: 'Double contact on one site',
    order: 'Take out anyone contacted twice on the same site — unless warned by a Civilian.',
    hint: 'Look for suspects receiving two dispatches on the same site, sparing anyone warned by a Civilian.',
    dirA: 'in', dirB: 'in', sameIncident: true, exc: {roles: ['civilian'], dir: 'in'}
  }),
  carry({
    id: 've-07', domain: 0, title: 'Ally of a contacted mark',
    order: 'Shoot anyone who clears as a Friend or warns as a Civilian someone fed a Double agent’s leak or contacted by a Foreigner.',
    hint: 'Follow Friend clearances and Civilian warnings to the recipient, then check who reaches them.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'in'
  }),
  veCutout({
    id: 've-08', domain: 0, title: 'Same-site blind cutout',
    order: 'Drop anyone contacted on a site who reaches a third person there unconnected to their source.',
    hint: 'Find a same-site relay A → X → B where A and B have no direct contact.',
    sameIncident: true, unconnected: true
  }),
  carry({
    id: 've-09', domain: 0, title: 'Striking an audited mark',
    order: 'Engage anyone who targets as a Foe or contacts as a Foreigner someone cleared by a Friend or audited by a Spy.',
    hint: 'Follow Foe targets and Foreigner contacts to the recipient, then check who clears or audits them.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'in'
  }),

  // =========================================================================
  // DOMAIN 1: Surveillance & Blind Spots (10) — escorts, ambushes, shadows, leaks to, spots, signals
  // =========================================================================
  veCutout({
    id: 've-10', domain: 1, title: 'Cross-site delayed relay',
    order: 'Neutralize anyone contacted on one site who later reaches a third person on the other site.',
    hint: 'Check incoming then later outgoing dispatches across opposite sites without returning to the source.',
    sameIncident: false, timeOrder: 'before'
  }),
  carry({
    id: 've-11', domain: 1, title: 'Shadowing an ambusher',
    order: 'Take out anyone who shadows as a Spy or spots as a Civilian someone who leaks as a Double agent or ambushes as a Foe.',
    hint: 'Follow Spy shadows and Civilian sightings to the contact, then check their outgoing moves.',
    firstRoles: ['spy', 'civilian'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'out'
  }),
  veSiteDual({
    id: 've-12', domain: 1, title: 'Double move on one site',
    order: 'Shoot anyone initiating two contacts on the same site — unless shadowed by a Spy.',
    hint: 'Find who initiates two dispatches on the same site, then spare anyone shadowed by a Spy.',
    dirA: 'out', dirB: 'out', sameIncident: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  carry({
    id: 've-13', domain: 1, title: 'Escorting a signaled contact',
    order: 'Drop anyone who shadows as a Spy or escorts as a Friend someone signaled by a Foreigner or spotted by a Civilian.',
    hint: 'Follow Spy shadows and Friend escorts to the recipient, then check who reaches them.',
    firstRoles: ['spy', 'friend'], firstDir: 'out', secondRoles: ['foreigner', 'civilian'], secondDir: 'in'
  }),
  veSiteDual({
    id: 've-14', domain: 1, title: 'Acted after same-site contact',
    order: 'Engage anyone contacted on a site who acts later on that same site — unless escorted by a Friend.',
    hint: 'Compare incoming and later outgoing times on the same site, sparing anyone escorted by a Friend.',
    dirA: 'in', dirB: 'out', sameIncident: true, timeOrder: 'before', exc: {roles: ['friend'], dir: 'in'}
  }),
  carry({
    id: 've-15', domain: 1, title: 'Leaking to a shadowed mark',
    order: 'Eliminate anyone who leaks as a Double agent or ambushes as a Foe someone shadowed by a Spy or signaled by a Foreigner.',
    hint: 'Follow Double agent leaks and Foe ambushes to the recipient, then check who reaches them.',
    firstRoles: ['double', 'foe'], firstDir: 'out', secondRoles: ['spy', 'foreigner'], secondDir: 'in'
  }),
  veSiteDual({
    id: 've-16', domain: 1, title: 'Acted across sites after contact',
    order: 'Fire on anyone contacted on one site who acts later on the other — unless spotted by a Civilian.',
    hint: 'Compare incoming and later outgoing times across opposite sites, sparing anyone spotted by a Civilian.',
    dirA: 'in', dirB: 'out', sameIncident: false, timeOrder: 'before', exc: {roles: ['civilian'], dir: 'in'}
  }),
  carry({
    id: 've-17', domain: 1, title: 'Escorted by a signaler',
    order: 'Take down anyone escorted by a Friend or spotted by a Civilian whose contact also shadows as a Spy or signals as a Foreigner.',
    hint: 'Trace Friend escorts and Civilian sightings back to their sender, then check their outgoing moves.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['spy', 'foreigner'], secondDir: 'out'
  }),
  veCutout({
    id: 've-18', domain: 1, title: 'Cross-site blind cutout',
    order: 'Neutralize anyone contacted on one site who reaches a third person on the other unconnected to their source.',
    hint: 'Find a cross-site relay A → X → B where A and B have no direct contact.',
    sameIncident: false, unconnected: true
  }),
  carry({
    id: 've-19', domain: 1, title: 'Ambushed by an escort',
    order: 'Take out anyone shadowed by a Spy or ambushed by a Foe whose contact also escorts as a Friend or spots as a Civilian.',
    hint: 'Trace Spy shadows and Foe ambushes back to their sender, then check their outgoing moves.',
    firstRoles: ['spy', 'foe'], firstDir: 'in', secondRoles: ['friend', 'civilian'], secondDir: 'out'
  }),

  // =========================================================================
  // DOMAIN 2: Foreign Contact (10) — vouches for, pressures, tracks, leaks to, reports, recruits
  // =========================================================================
  veSiteDual({
    id: 've-20', domain: 2, title: 'Untracked cross-border contact',
    order: 'Eliminate anyone contacted on both sites — unless tracked by a Spy.',
    hint: 'Find suspects contacted on both active sites, then spare anyone tracked by a Spy.',
    dirA: 'in', dirB: 'in', sameIncident: false, exc: {roles: ['spy'], dir: 'in'}
  }),
  carry({
    id: 've-21', domain: 2, title: 'Recruiting a mole',
    order: 'Fire on anyone who recruits as a Foreigner or vouches as a Friend for someone who leaks as a Double agent or pressures as a Foe.',
    hint: 'Follow Foreigner recruits and Friend vouchers to the contact, then check their outgoing moves.',
    firstRoles: ['foreigner', 'friend'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'out'
  }),
  veSiteDual({
    id: 've-22', domain: 2, title: 'Border runner',
    order: 'Take down anyone initiating contacts on both sites — unless vouched for by a Friend.',
    hint: 'Find who initiates dispatches on both active sites, then spare anyone vouched for by a Friend.',
    dirA: 'out', dirB: 'out', sameIncident: false, exc: {roles: ['friend'], dir: 'in'}
  }),
  carry({
    id: 've-23', domain: 2, title: 'Recruited by a tracked outsider',
    order: 'Neutralize anyone recruited by a Foreigner or pressured by a Foe whose contact is tracked by a Spy or vouched for by a Friend.',
    hint: 'Trace Foreigner recruits and Foe pressure back to the sender, then check who reaches them.',
    firstRoles: ['foreigner', 'foe'], firstDir: 'in', secondRoles: ['spy', 'friend'], secondDir: 'in'
  }),
  veCutout({
    id: 've-24', domain: 2, title: 'Early same-site move',
    order: 'Take out anyone who reached a third person on a site earlier than someone contacted them there.',
    hint: 'Compare outgoing then later incoming dispatches on the same site without returning to the source.',
    sameIncident: true, timeOrder: 'after'
  }),
  carry({
    id: 've-25', domain: 2, title: 'Recruit turned voucher',
    order: 'Shoot anyone recruited by a Foreigner or tracked by a Spy whose contact also vouches as a Friend or reports as a Civilian.',
    hint: 'Trace Foreigner recruits and Spy tracks back to the sender, then check their outgoing moves.',
    firstRoles: ['foreigner', 'spy'], firstDir: 'in', secondRoles: ['friend', 'civilian'], secondDir: 'out'
  }),
  veCutout({
    id: 've-26', domain: 2, title: 'Pre-staged cross-border move',
    order: 'Drop anyone who reached a third person on one site earlier than someone contacted them on the other.',
    hint: 'Compare an earlier outgoing dispatch on one site against a later incoming dispatch on the other.',
    sameIncident: false, timeOrder: 'after'
  }),
  carry({
    id: 've-27', domain: 2, title: 'Vouched by a recruited source',
    order: 'Engage anyone vouched for by a Friend or reported by a Civilian whose source is recruited by a Foreigner or fed a Double agent’s leak.',
    hint: 'Trace Friend vouchers and Civilian reports back to the sender, then check who reaches them.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['foreigner', 'double'], secondDir: 'in'
  }),
  veSiteDual({
    id: 've-28', domain: 2, title: 'Early strike on site',
    order: 'Eliminate anyone who acted on a site earlier than someone contacted them there — unless reported by a Civilian.',
    hint: 'Compare earlier outgoing and later incoming times on the same site, sparing Civilian reports.',
    dirA: 'in', dirB: 'out', sameIncident: true, timeOrder: 'after', exc: {roles: ['civilian'], dir: 'in'}
  }),
  carry({
    id: 've-29', domain: 2, title: 'Recruiter reaching a reported mark',
    order: 'Fire on anyone who recruits as a Foreigner or leaks as a Double agent to someone reported by a Civilian or vouched for by a Friend.',
    hint: 'Follow Foreigner recruits and Double agent leaks to the recipient, then check who reaches them.',
    firstRoles: ['foreigner', 'double'], firstDir: 'out', secondRoles: ['civilian', 'friend'], secondDir: 'in'
  }),

  // =========================================================================
  // DOMAIN 3: Civilian Tip-Offs (10) — confirms, targets, monitors, misleads, tips off, briefs
  // =========================================================================
  veSiteDual({
    id: 've-30', domain: 3, title: 'Double dispatch on one site',
    order: 'Shoot anyone initiating two contacts on the same site — unless confirmed by a Friend.',
    hint: 'Find who initiates two dispatches on the same site, then spare anyone confirmed by a Friend.',
    dirA: 'out', dirB: 'out', sameIncident: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  carry({
    id: 've-31', domain: 3, title: 'Tipping off a deceiver',
    order: 'Drop anyone who tips off as a Civilian or confirms as a Friend someone who misleads as a Double agent or briefs as a Foreigner.',
    hint: 'Follow Civilian tip-offs and Friend confirmations to the recipient, then check their outgoing moves.',
    firstRoles: ['civilian', 'friend'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'out'
  }),
  veSiteDual({
    id: 've-32', domain: 3, title: 'Stacked sightings on site',
    order: 'Engage anyone contacted twice on the same site — unless monitored by a Spy.',
    hint: 'Find suspects receiving two dispatches on the same site, sparing anyone monitored by a Spy.',
    dirA: 'in', dirB: 'in', sameIncident: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  carry({
    id: 've-33', domain: 3, title: 'Tipping off a monitor or confirmer',
    order: 'Eliminate anyone who tips off as a Civilian or briefs as a Foreigner someone who confirms as a Friend or monitors as a Spy.',
    hint: 'Follow Civilian tip-offs and Foreigner briefings to the recipient, then check their outgoing moves.',
    firstRoles: ['civilian', 'foreigner'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'out'
  }),
  veSiteCorr({
    id: 've-34', domain: 3, title: 'Colluding same-site witnesses',
    order: 'Fire on anyone contacted on a site by two people who are already in direct contact.',
    hint: 'Find suspects with two incoming contacts on the same site whose senders also contact each other.',
    dirA: 'in', dirB: 'in', sameIncident: true, connected: true
  }),
  carry({
    id: 've-35', domain: 3, title: 'Deceiving a tipped-off mark',
    order: 'Take down anyone who misleads as a Double agent or briefs as a Foreigner someone tipped off by a Civilian or monitored by a Spy.',
    hint: 'Follow Double agent deceptions and Foreigner briefings to the recipient, then check who reaches them.',
    firstRoles: ['double', 'foreigner'], firstDir: 'out', secondRoles: ['civilian', 'spy'], secondDir: 'in'
  }),
  veSiteCorr({
    id: 've-36', domain: 3, title: 'Independent same-site reports',
    order: 'Neutralize anyone contacted on a site by two people with no direct contact — unless confirmed by a Friend.',
    hint: 'Find suspects with two same-site incoming senders who never contact each other, sparing Friend confirmations.',
    dirA: 'in', dirB: 'in', sameIncident: true, connected: false, exc: {roles: ['friend'], dir: 'in'}
  }),
  carry({
    id: 've-37', domain: 3, title: 'Monitoring a briefed contact',
    order: 'Take out anyone who monitors as a Spy or confirms as a Friend someone briefed by a Foreigner or targeted by a Foe.',
    hint: 'Follow Spy monitors and Friend confirmations to the recipient, then check who reaches them.',
    firstRoles: ['spy', 'friend'], firstDir: 'out', secondRoles: ['foreigner', 'foe'], secondDir: 'in'
  }),
  veSiteDual({
    id: 've-38', domain: 3, title: 'Acted before cross-site tip-off',
    order: 'Shoot anyone who acted on one site earlier than someone contacted them on the other — unless monitored by a Spy.',
    hint: 'Compare earlier outgoing and later incoming times across opposite sites, sparing Spy-monitored suspects.',
    dirA: 'in', dirB: 'out', sameIncident: false, timeOrder: 'after', exc: {roles: ['spy'], dir: 'in'}
  }),
  carry({
    id: 've-39', domain: 3, title: 'Targeting a monitored mark',
    order: 'Drop anyone who targets as a Foe or misleads as a Double agent someone tipped off by a Civilian or monitored by a Spy.',
    hint: 'Follow Foe targets and Double agent deceptions to the recipient, then check who reaches them.',
    firstRoles: ['foe', 'double'], firstDir: 'out', secondRoles: ['civilian', 'spy'], secondDir: 'in'
  }),

  // =========================================================================
  // DOMAIN 4: Proxy Chains (10) — backs, strikes, traces, relays to, warns, hands off to
  // =========================================================================
  veCutout({
    id: 've-40', domain: 4, title: 'Same-site role-switching cutout',
    order: 'Take down anyone contacted on a site who reaches a third person there in another role — unless backed by a Friend.',
    hint: 'Look for a same-site relay A → X → B across two different roles, sparing Friend-backed suspects.',
    sameIncident: true, diffRole: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  carry({
    id: 've-41', domain: 4, title: 'Two-hop relay into a proxy',
    order: 'Neutralize anyone backed by a Friend or traced by a Spy whose contact is handed off to by a Foreigner or struck by a Foe.',
    hint: 'Trace Friend backing and Spy traces back to the sender, then check who reaches them.',
    firstRoles: ['friend', 'spy'], firstDir: 'in', secondRoles: ['foreigner', 'foe'], secondDir: 'in'
  }),
  veCutout({
    id: 've-42', domain: 4, title: 'Cross-site role-switching cutout',
    order: 'Take out anyone contacted on one site who reaches a third person on the other in another role — unless traced by a Spy.',
    hint: 'Look for a cross-site relay A → X → B across two different roles, sparing Spy-traced suspects.',
    sameIncident: false, diffRole: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  carry({
    id: 've-43', domain: 4, title: 'Handoff from a traced courier',
    order: 'Shoot anyone handed off to by a Foreigner or relayed to by a Double agent whose courier is traced by a Spy or warned by a Civilian.',
    hint: 'Trace Foreigner handoffs and Double agent relays back to the courier, then check who reaches them.',
    firstRoles: ['foreigner', 'double'], firstDir: 'in', secondRoles: ['spy', 'civilian'], secondDir: 'in'
  }),
  veCutout({
    id: 've-44', domain: 4, title: 'Closed same-site proxy loop',
    order: 'Drop anyone contacted on a site who reaches a third person there already in direct contact with their source.',
    hint: 'Find a same-site relay A → X → B where A and B already contact each other directly.',
    sameIncident: true, unconnected: false
  }),
  carry({
    id: 've-45', domain: 4, title: 'Two-hop proxy across roles',
    order: 'Engage anyone who initiates a contact toward someone who then strikes as a Foe or hands off as a Foreigner in a different role.',
    hint: 'Take any outgoing step, then check if that contact strikes as a Foe or hands off as a Foreigner in another role.',
    firstRoles: ['friend', 'spy', 'civilian', 'double'], firstDir: 'out', secondRoles: ['foe', 'foreigner'], secondDir: 'out', diffRole: true
  }),
  veCutout({
    id: 've-46', domain: 4, title: 'Closed cross-site proxy loop',
    order: 'Eliminate anyone contacted on one site who reaches a third person on the other already in direct contact with their source.',
    hint: 'Find a cross-site relay A → X → B where A and B already contact each other directly.',
    sameIncident: false, unconnected: false
  }),
  carry({
    id: 've-47', domain: 4, title: 'Relay hitting a warned contact',
    order: 'Fire on anyone who relays as a Double agent or hands off as a Foreigner to someone warned by a Civilian or struck by a Foe.',
    hint: 'Follow Double agent relays and Foreigner handoffs to the recipient, then check who reaches them.',
    firstRoles: ['double', 'foreigner'], firstDir: 'out', secondRoles: ['civilian', 'foe'], secondDir: 'in'
  }),
  veCutout({
    id: 've-48', domain: 4, title: 'Blind proxy in two roles',
    order: 'Take down anyone contacted who reaches a third person in another role unconnected to their source — unless warned by a Civilian.',
    hint: 'Find a two-role relay A → X → B where A and B never contact each other, sparing Civilian warnings.',
    diffRole: true, unconnected: true, exc: {roles: ['civilian'], dir: 'in'}
  }),
  carry({
    id: 've-49', domain: 4, title: 'Warning an active courier',
    order: 'Neutralize anyone who warns as a Civilian or strikes as a Foe someone who relays as a Double agent or backs as a Friend.',
    hint: 'Follow Civilian warnings and Foe strikes to the recipient, then check their outgoing moves.',
    firstRoles: ['civilian', 'foe'], firstDir: 'out', secondRoles: ['double', 'friend'], secondDir: 'out'
  }),

  // =========================================================================
  // DOMAIN 5: Alibi & Contradiction (10) — corroborates, accuses, verifies, deceives, identifies, consults
  // =========================================================================
  veSiteCorr({
    id: 've-50', domain: 5, title: 'Colluding cross-site witnesses',
    order: 'Engage anyone contacted on both sites by two people who are already in direct contact.',
    hint: 'Find suspects contacted on both sites whose two senders also contact each other directly.',
    dirA: 'in', dirB: 'in', sameIncident: false, connected: true
  }),
  carry({
    id: 've-51', domain: 5, title: 'Corroborating an accuser',
    order: 'Eliminate anyone who corroborates as a Friend or verifies as a Spy someone who accuses as a Foe or deceives as a Double agent.',
    hint: 'Follow Friend corroborations and Spy verifications to the subject, then check their outgoing moves.',
    firstRoles: ['friend', 'spy'], firstDir: 'out', secondRoles: ['foe', 'double'], secondDir: 'out'
  }),
  veSiteCorr({
    id: 've-52', domain: 5, title: 'Independent cross-site reports',
    order: 'Fire on anyone contacted on both sites by two people with no direct contact — unless verified by a Spy.',
    hint: 'Find suspects contacted on both sites by two unconnected senders, sparing Spy verifications.',
    dirA: 'in', dirB: 'in', sameIncident: false, connected: false, exc: {roles: ['spy'], dir: 'in'}
  }),
  carry({
    id: 've-53', domain: 5, title: 'Verifying a consulted contact',
    order: 'Take down anyone who verifies as a Spy or identifies as a Civilian someone consulted by a Foreigner or accused by a Foe.',
    hint: 'Follow Spy verifications and Civilian identifications to the subject, then check who reaches them.',
    firstRoles: ['spy', 'civilian'], firstDir: 'out', secondRoles: ['foreigner', 'foe'], secondDir: 'in'
  }),
  veSiteCorr({
    id: 've-54', domain: 5, title: 'Tight same-site alibi circle',
    order: 'Neutralize anyone reaching two people on the same site who are already in direct contact.',
    hint: 'Find suspects reaching two people on the same site who also contact each other directly.',
    dirA: 'out', dirB: 'out', sameIncident: true, connected: true
  }),
  carry({
    id: 've-55', domain: 5, title: 'Accusing an active verifier',
    order: 'Take out anyone who accuses as a Foe or consults as a Foreigner someone who corroborates as a Friend or verifies as a Spy.',
    hint: 'Follow Foe accusations and Foreigner consultations to the subject, then check their outgoing moves.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'out'
  }),
  veSiteCorr({
    id: 've-56', domain: 5, title: 'Connected cross-site targets',
    order: 'Shoot anyone reaching one person on each site who are already in direct contact.',
    hint: 'Find suspects reaching two people across opposite sites who also contact each other directly.',
    dirA: 'out', dirB: 'out', sameIncident: false, connected: true
  }),
  carry({
    id: 've-57', domain: 5, title: 'Deceiving an active verifier',
    order: 'Drop anyone who deceives as a Double agent or accuses as a Foe someone who verifies as a Spy or identifies as a Civilian.',
    hint: 'Follow Double agent deceptions and Foe accusations to the subject, then check their outgoing moves.',
    firstRoles: ['double', 'foe'], firstDir: 'out', secondRoles: ['spy', 'civilian'], secondDir: 'out'
  }),
  veSiteCorr({
    id: 've-58', domain: 5, title: 'Split narrative on site',
    order: 'Engage anyone reaching two people on the same site with no direct contact — unless corroborated by a Friend.',
    hint: 'Find suspects reaching two unconnected people on the same site, sparing Friend corroborations.',
    dirA: 'out', dirB: 'out', sameIncident: true, connected: false, exc: {roles: ['friend'], dir: 'in'}
  }),
  carry({
    id: 've-59', domain: 5, title: 'Consulting an active witness',
    order: 'Eliminate anyone who consults as a Foreigner or deceives as a Double agent someone who corroborates as a Friend or identifies as a Civilian.',
    hint: 'Follow Foreigner consultations and Double agent deceptions to the subject, then check their outgoing moves.',
    firstRoles: ['foreigner', 'double'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'out'
  }),

  // =========================================================================
  // DOMAIN 6: Chronology & Timing (10) — clears, strikes, logs, leaks to, corrects, meets
  // =========================================================================
  timedRule({
    id: 've-60', domain: 6, title: 'Cleared before leaking',
    order: 'Take out anyone cleared by a Friend or corrected by a Civilian earlier than they leaked as a Double agent or met as a Foreigner.',
    hint: 'Compare dispatch times: Friend clearance or Civilian correction must precede their Double agent leak or Foreigner meeting.',
    early: {roles: ['friend', 'civilian'], dir: 'in'}, late: {roles: ['double', 'foreigner'], dir: 'out'}
  }),
  timedRule({
    id: 've-61', domain: 6, title: 'Struck before logging',
    order: 'Shoot anyone struck by a Foe or met by a Foreigner earlier than a Spy logged or Friend cleared them.',
    hint: 'Compare dispatch times: Foe strike or Foreigner meeting must precede the Spy log or Friend clearance.',
    early: {roles: ['foe', 'foreigner'], dir: 'in'}, late: {roles: ['spy', 'friend'], dir: 'in'}
  }),
  timedRule({
    id: 've-62', domain: 6, title: 'Struck after clearance',
    order: 'Drop anyone cleared by a Friend or corrected by a Civilian earlier than a Foe struck or Foreigner met them.',
    hint: 'Compare dispatch times: Friend clearance or Civilian correction must precede the Foe strike or Foreigner meeting.',
    early: {roles: ['friend', 'civilian'], dir: 'in'}, late: {roles: ['foe', 'foreigner'], dir: 'in'}
  }),
  timedRule({
    id: 've-63', domain: 6, title: 'Leaked then logged',
    order: 'Engage anyone who leaked as a Double agent or struck as a Foe earlier than a Spy logged or Civilian corrected them.',
    hint: 'Compare dispatch times: their Double agent leak or Foe strike must precede the Spy log or Civilian correction.',
    early: {roles: ['double', 'foe'], dir: 'out'}, late: {roles: ['spy', 'civilian'], dir: 'in'}
  }),
  timedRule({
    id: 've-64', domain: 6, title: 'Logged before turning',
    order: 'Eliminate anyone logged by a Spy or corrected by a Civilian earlier than they struck as a Foe or leaked as a Double agent.',
    hint: 'Compare dispatch times: Spy log or Civilian correction must precede their outgoing Foe strike or Double agent leak.',
    early: {roles: ['spy', 'civilian'], dir: 'in'}, late: {roles: ['foe', 'double'], dir: 'out'}
  }),
  carry({
    id: 've-65', domain: 6, title: 'Delayed foreign handoff',
    order: 'Fire on anyone who clears as a Friend or corrects as a Civilian someone who later leaks as a Double agent or meets as a Foreigner.',
    hint: 'Follow a Friend clearance or Civilian correction, then check that the recipient’s Double agent or Foreigner move happened later.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'out', timeOrder: 'before'
  }),
  carry({
    id: 've-66', domain: 6, title: 'Pre-staged betrayal',
    order: 'Take down anyone cleared by a Friend or logged by a Spy whose source had earlier leaked as a Double agent or met as a Foreigner.',
    hint: 'Trace Friend clearance or Spy log back to the sender, then check that their Double agent or Foreigner move came earlier.',
    firstRoles: ['friend', 'spy'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'out', timeOrder: 'after'
  }),
  carry({
    id: 've-67', domain: 6, title: 'Late Spy log',
    order: 'Neutralize anyone logged by a Spy or corrected by a Civilian whose source had earlier been struck by a Foe or met by a Foreigner.',
    hint: 'Trace Spy logs and Civilian corrections back to the sender, then check if a Foe struck or Foreigner met them earlier.',
    firstRoles: ['spy', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'in', timeOrder: 'after'
  }),
  timedRule({
    id: 've-68', domain: 6, title: 'Corrected before foreign drop',
    order: 'Take out anyone corrected by a Civilian or cleared by a Friend earlier than a Foreigner met or Double agent leaked to them.',
    hint: 'Compare dispatch times: Civilian correction or Friend clearance must precede the Foreigner meeting or Double agent leak.',
    early: {roles: ['civilian', 'friend'], dir: 'in'}, late: {roles: ['foreigner', 'double'], dir: 'in'}
  }),
  timedRule({
    id: 've-69', domain: 6, title: 'Strike before clearance',
    order: 'Shoot anyone who struck as a Foe or leaked as a Double agent earlier than a Friend cleared or Spy logged them.',
    hint: 'Compare dispatch times: their outgoing Foe strike or Double agent leak must precede the Friend clearance or Spy log.',
    early: {roles: ['foe', 'double'], dir: 'out'}, late: {roles: ['friend', 'spy'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 7: Tainted Sources (10) — alibis, coerces, vets, compromises, exposes, funds
  // =========================================================================
  veSiteTaint({
    id: 've-70', domain: 7, title: 'Same-site tainted alibi',
    order: 'Fire on anyone given a Friend’s alibi or Civilian’s exposure whose source was also contacted on that same site.',
    hint: 'Trace Friend alibis and Civilian exposures back to the source, then check same-site contacts into that source.',
    roles1: ['friend', 'civilian'], dir1: 'in', dir2: 'in', sameIncident: true
  }),
  carry({
    id: 've-71', domain: 7, title: 'Exposed by a funded witness',
    order: 'Take down anyone exposed by a Civilian or vetted by a Spy whose source was coerced by a Foe or funded by a Foreigner; hold fire on anyone given a Friend’s alibi.',
    hint: 'Trace Civilian exposures and Spy vettings back to the source, then spare Friend-alibied suspects.',
    firstRoles: ['civilian', 'spy'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'in', exc: {roles: ['friend'], dir: 'in'}
  }),
  veSiteTaint({
    id: 've-72', domain: 7, title: 'Cross-site tainted vetting',
    order: 'Neutralize anyone vetted by a Spy or funded by a Foreigner whose source was contacted on the other site.',
    hint: 'Trace Spy vettings and Foreigner funding back to the source, then check opposite-site contacts into that source.',
    roles1: ['spy', 'foreigner'], dir1: 'in', dir2: 'in', sameIncident: false
  }),
  carry({
    id: 've-73', domain: 7, title: 'Coerced by an exposed source',
    order: 'Take out anyone coerced by a Foe or funded by a Foreigner whose source was compromised by a Double agent or exposed by a Civilian — unless vetted by a Spy.',
    hint: 'Trace Foe coercion and Foreigner funding back to the source, then spare Spy-vetted suspects.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'in', secondRoles: ['double', 'civilian'], secondDir: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),
  veSiteTaint({
    id: 've-74', domain: 7, title: 'Active same-site source',
    order: 'Shoot anyone compromised by a Double agent or coerced by a Foe whose source reaches a third person on that same site.',
    hint: 'Trace Double agent compromises and Foe coercions back to the source, then check their same-site outgoing move.',
    roles1: ['double', 'foe'], dir1: 'in', dir2: 'out', sameIncident: true
  }),
  carry({
    id: 've-75', domain: 7, title: 'Funded by a coercer',
    order: 'Drop anyone funded by a Foreigner or given a Friend’s alibi by someone who coerces as a Foe or compromises as a Double agent; hold fire on anyone exposed by a Civilian.',
    hint: 'Trace Foreigner funding and Friend alibis back to the sender, then spare Civilian exposures.',
    firstRoles: ['foreigner', 'friend'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'out', exc: {roles: ['civilian'], dir: 'in'}
  }),
  veSiteTaint({
    id: 've-76', domain: 7, title: 'Same-site tainted mark',
    order: 'Engage anyone who coerces as a Foe or funds as a Foreigner someone also contacted on that same site.',
    hint: 'Follow Foe coercion and Foreigner funding to the mark, then check if anyone else contacts them on that site.',
    roles1: ['foe', 'foreigner'], dir1: 'out', dir2: 'in', sameIncident: true
  }),
  carry({
    id: 've-77', domain: 7, title: 'Compromising an exposed mark',
    order: 'Eliminate anyone who compromises as a Double agent or coerces as a Foe someone exposed by a Civilian or given a Friend’s alibi — unless vetted by a Spy.',
    hint: 'Follow Double agent compromises and Foe coercions to the mark, then spare Spy-vetted actors.',
    firstRoles: ['double', 'foe'], firstDir: 'out', secondRoles: ['civilian', 'friend'], secondDir: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),
  veSiteTaint({
    id: 've-78', domain: 7, title: 'Split-site handler',
    order: 'Fire on anyone given a Friend’s alibi or Spy’s vetting whose source reaches a third person on the other site.',
    hint: 'Trace Friend alibis and Spy vettings back to the source, then check their opposite-site outgoing move.',
    roles1: ['friend', 'spy'], dir1: 'in', dir2: 'out', sameIncident: false
  }),
  carry({
    id: 've-79', domain: 7, title: 'Exposing a funded mark',
    order: 'Take down anyone who exposes as a Civilian or alibis as a Friend someone coerced by a Foe or funded by a Foreigner; hold fire on anyone vetted by a Spy.',
    hint: 'Follow Civilian exposures and Friend alibis to the mark, then spare Spy-vetted actors.',
    firstRoles: ['civilian', 'friend'], firstDir: 'out', secondRoles: ['foe', 'foreigner'], secondDir: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 8: Double Lives (10) — protects, hunts, watches, leaks to, shelters, hosts
  // =========================================================================
  veSiteDual({
    id: 've-80', domain: 8, title: 'Double life on one site',
    order: 'Drop anyone both contacted and initiating a contact in another role on the same site — unless protected by a Friend.',
    hint: 'Look for an incoming and outgoing dispatch on the same site in two different roles, sparing Friend protection.',
    dirA: 'in', dirB: 'out', sameIncident: true, diffRole: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  carry({
    id: 've-81', domain: 8, title: 'Watcher on a sheltered guest',
    order: 'Engage anyone who watches as a Spy or hunts as a Foe someone protected by a Friend or sheltered by a Civilian.',
    hint: 'Follow Spy watches and Foe hunts to the contact, then check who protects or shelters them.',
    firstRoles: ['spy', 'foe'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'in'
  }),
  veSiteDual({
    id: 've-82', domain: 8, title: 'Cross-site double life',
    order: 'Eliminate anyone contacted on one site who initiates a contact in another role on the other site — unless sheltered by a Civilian.',
    hint: 'Look for an incoming dispatch on one site and outgoing move in another role on the other, sparing Civilian shelter.',
    dirA: 'in', dirB: 'out', sameIncident: false, diffRole: true, exc: {roles: ['civilian'], dir: 'in'}
  }),
  carry({
    id: 've-83', domain: 8, title: 'Hosting a protector',
    order: 'Fire on anyone who hosts as a Foreigner or watches as a Spy someone who protects as a Friend or shelters as a Civilian.',
    hint: 'Follow Foreigner hosting and Spy watches to the contact, then check their outgoing moves.',
    firstRoles: ['foreigner', 'spy'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'out'
  }),
  veSiteTaint({
    id: 've-84', domain: 8, title: 'Tainted shelter source',
    order: 'Take down anyone protected by a Friend or sheltered by a Civilian whose source was contacted earlier.',
    hint: 'Trace Friend protection and Civilian shelter back to the source, then check for an earlier incoming contact.',
    roles1: ['friend', 'civilian'], dir1: 'in', dir2: 'in', timeOrder: 'after'
  }),
  carry({
    id: 've-85', domain: 8, title: 'Protected by a hunter',
    order: 'Neutralize anyone protected by a Friend or sheltered by a Civilian whose protector hunts as a Foe or hosts as a Foreigner.',
    hint: 'Trace Friend protection and Civilian shelter back to the sender, then check their outgoing moves.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'out'
  }),
  veSiteTaint({
    id: 've-86', domain: 8, title: 'Hunter acting afterward',
    order: 'Take out anyone hunted by a Foe or hosted by a Foreigner whose source later reaches a third person.',
    hint: 'Trace Foe hunts and Foreigner hosting back to the source, then check for a later outgoing dispatch.',
    roles1: ['foe', 'foreigner'], dir1: 'in', dir2: 'out', timeOrder: 'before'
  }),
  carry({
    id: 've-87', domain: 8, title: 'Sheltering a hunted quarry',
    order: 'Shoot anyone who watches as a Spy or shelters as a Civilian someone fed a Double agent’s leak or hunted by a Foe.',
    hint: 'Follow Spy watches and Civilian shelter to the contact, then check who reaches them.',
    firstRoles: ['spy', 'civilian'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'in'
  }),
  veSiteDual({
    id: 've-88', domain: 8, title: 'Exposed on both sites',
    order: 'Drop anyone contacted on both sites — unless sheltered by a Civilian.',
    hint: 'Find suspects contacted on both active sites, then spare anyone sheltered by a Civilian.',
    dirA: 'in', dirB: 'in', sameIncident: false, exc: {roles: ['civilian'], dir: 'in'}
  }),
  carry({
    id: 've-89', domain: 8, title: 'Hunting a watched guest',
    order: 'Engage anyone who hunts as a Foe or hosts as a Foreigner someone watched by a Spy or fed a Double agent’s leak.',
    hint: 'Follow Foe hunts and Foreigner hosting to the contact, then check who reaches them.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'out', secondRoles: ['spy', 'double'], secondDir: 'in'
  }),

  // =========================================================================
  // DOMAIN 9: Command & Leverage (2-Step Anchor Relays) (10) — vouches for, targets, shadows, leaks to, tips off, meets
  // =========================================================================
  anchorCarry({
    id: 've-90', domain: 9, title: 'Two steps from {name}',
    order: 'Neutralize anyone reached in two forward steps from {name} with no direct contact with {name}.',
    hint: 'Follow who {name} reaches, then follow who those people reach — skipping direct contacts of {name}.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out',
    excludeDirect: true
  }),
  anchorCarry({
    id: 've-91', domain: 9, title: 'Two steps into {name}',
    order: 'Take out anyone who reaches {name} in two forward steps with no direct contact with {name}.',
    hint: 'Work backward from {name}: who initiates toward {name}, and who initiates toward them?',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in',
    excludeDirect: true
  }),
  anchorCarry({
    id: 've-92', domain: 9, title: '{name}’s strike or border reach',
    order: 'Shoot anyone reached from {name} in two forward steps where the second contact is by a Foe, Foreigner, or Spy.',
    hint: 'Follow {name}’s outgoing contacts, then take a Foe, Foreigner, or Spy step.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['foe', 'foreigner', 'spy'], step2Dir: 'out'
  }),
  anchorCarry({
    id: 've-93', domain: 9, title: '{name}’s voucher or leak reach',
    order: 'Drop anyone reached from {name} in two forward steps where the second contact is by a Friend, Double agent, or Civilian.',
    hint: 'Follow {name}’s outgoing contacts, then take a Friend, Double agent, or Civilian step.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'double', 'civilian'], step2Dir: 'out'
  }),
  anchorCarry({
    id: 've-94', domain: 9, title: 'Shared target with {name}',
    order: 'Engage anyone else who reaches the same contact {name} directly reaches.',
    hint: 'Find who {name} reaches, then see who else also reaches those same people.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in'
  }),
  anchorCarry({
    id: 've-95', domain: 9, title: 'Shared contact with {name}',
    order: 'Eliminate anyone else reached by the same person who directly reaches {name}.',
    hint: 'Find who reaches {name}, then see who else that person reaches.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out'
  }),
  anchorCarry({
    id: 've-96', domain: 9, title: '{name}’s unbacked second-hop',
    order: 'Fire on anyone two contacts away from {name} with no direct contact with {name} — unless a Friend vouches for them.',
    hint: 'Trace two contacts from {name}, skip direct contacts, and rule out anyone vouched for by a Friend.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'any',
    excludeDirect: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  anchorCarry({
    id: 've-97', domain: 9, title: '{name}’s unwatched second-hop',
    order: 'Take down anyone two contacts away from {name} with no direct contact with {name} — unless a Spy shadows them.',
    hint: 'Trace two contacts from {name}, skip direct contacts, and rule out anyone shadowed by a Spy.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'any',
    excludeDirect: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  anchorCarry({
    id: 've-98', domain: 9, title: 'Timed relay from {name}',
    order: 'Neutralize anyone reached from {name} in two forward steps where the second dispatch happened later than the first.',
    hint: 'Follow two forward contacts from {name} and verify the second dispatch time is later.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out',
    timeOrder: 'before'
  }),
  anchorCarry({
    id: 've-99', domain: 9, title: 'Timed relay into {name}',
    order: 'Take out anyone who reaches {name} in two forward steps where the first dispatch happened earlier than the contact into {name}.',
    hint: 'Work backward two steps from {name} and check that the first contact occurred at an earlier time.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in',
    timeOrder: 'after'
  })
];
