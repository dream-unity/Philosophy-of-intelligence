import {collectMatches} from './case-graph.js';
import {matchAnchorRelay, matchAtom, matchRelay, matchTemporal} from './case-predicates.js';

// 100 genuinely distinct Very Easy intelligence cases (10 domains × 10 families).
// Directional 2-step carry-over, intermediary checks, and temporal sequence across confirmed dispatches.
// Every order matches its domain's exact operational verbs with zero "tied to" wording and zero role pooling.

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
  carry({
    id: 've-00', domain: 0, title: 'Tainted clearance or warning',
    order: 'Station breach — drop anyone cleared by a Friend or warned by a Civilian whose source leaks as a Double agent or contacts as a Foreigner.',
    hint: 'Trace Friend clearances and Civilian warnings back to the sender, then check if they leak as a Double agent or contact as a Foreigner.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-01', domain: 0, title: 'Clearing a mole or outsider',
    order: 'Insider betrayal: engage anyone who clears as a Friend or audits as a Spy someone who leaks as a Double agent or contacts as a Foreigner.',
    hint: 'Follow Friend clearances and Spy audits to the recipient, then check if they leak as a Double agent or contact as a Foreigner.',
    firstRoles: ['friend', 'spy'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-02', domain: 0, title: 'Cleared by an attacker',
    order: 'False cover — eliminate anyone cleared by a Friend or audited by a Spy whose source also targets as a Foe or leaks as a Double agent.',
    hint: 'Trace Friend clearances and Spy audits back to the sender, then check if they target as a Foe or leak as a Double agent.',
    firstRoles: ['friend', 'spy'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'out'
  }),
  carry({
    id: 've-03', domain: 0, title: 'Clearing a striker',
    order: 'Compromised vetting: fire on anyone who clears as a Friend or warns as a Civilian someone who targets as a Foe or contacts as a Foreigner.',
    hint: 'Follow Friend clearances and Civilian warnings to the contact, then check if they target as a Foe or contact as a Foreigner.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['foe', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-04', domain: 0, title: 'Leaking to a cleared mark',
    order: 'Take down anyone who leaks as a Double agent or targets as a Foe someone cleared by a Friend or warned by a Civilian.',
    hint: 'Follow Double agent leaks and Foe targets to the recipient, then check if a Friend clears or Civilian warns them.',
    firstRoles: ['double', 'foe'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'in'
  }),
  carry({
    id: 've-05', domain: 0, title: 'Cleared by a watched insider',
    order: 'Burned clearance: neutralize anyone cleared by a Friend or warned by a Civilian whose source is targeted by a Foe or audited by a Spy.',
    hint: 'Trace Friend clearances and Civilian warnings back to the sender, then see if a Foe targets or Spy audits them.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'spy'], secondDir: 'in'
  }),
  carry({
    id: 've-06', domain: 0, title: 'Mole’s trusted partner',
    order: 'Station breach — take out anyone fed a Double agent’s leak or contacted by a Foreigner whose source clears as a Friend or warns as a Civilian.',
    hint: 'Trace Double agent leaks and Foreigner contacts back to the sender, then check if they clear as a Friend or warn as a Civilian.',
    firstRoles: ['double', 'foreigner'], firstDir: 'in', secondRoles: ['friend', 'civilian'], secondDir: 'out'
  }),
  carry({
    id: 've-07', domain: 0, title: 'Ally of a contacted mark',
    order: 'Insider betrayal: shoot anyone who clears as a Friend or warns as a Civilian someone fed a Double agent’s leak or contacted by a Foreigner.',
    hint: 'Follow Friend clearances and Civilian warnings to the contact, then see if a Double agent leaks to or Foreigner contacts them.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'in'
  }),
  carry({
    id: 've-08', domain: 0, title: 'Cleared by a contacted source',
    order: 'False cover — drop anyone cleared by a Friend or audited by a Spy whose source receives a Double agent’s leak or Foreigner’s contact.',
    hint: 'Trace Friend clearances and Spy audits back to the sender, then see if they receive a leak or Foreigner contact.',
    firstRoles: ['friend', 'spy'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'in'
  }),
  carry({
    id: 've-09', domain: 0, title: 'Striking an audited mark',
    order: 'Engage anyone who targets as a Foe or contacts as a Foreigner someone cleared by a Friend or audited by a Spy.',
    hint: 'Follow Foe targets and Foreigner contacts to the recipient, then check if a Friend clears or Spy audits them.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'in'
  }),

  // =========================================================================
  // DOMAIN 1: Surveillance & Blind Spots (10) — escorts, ambushes, shadows, leaks to, spots, signals
  // =========================================================================
  carry({
    id: 've-10', domain: 1, title: 'Shadowed by a mole',
    order: 'Blind-spot ambush — neutralize anyone shadowed by a Spy or signaled by a Foreigner whose contact leaks as a Double agent or ambushes as a Foe.',
    hint: 'Trace Spy shadows and Foreigner signals back to the sender, then check if they leak as a Double agent or ambush as a Foe.',
    firstRoles: ['spy', 'foreigner'], firstDir: 'in', secondRoles: ['double', 'foe'], secondDir: 'out'
  }),
  carry({
    id: 've-11', domain: 1, title: 'Shadowing an ambusher',
    order: 'Compromised tail: take out anyone who shadows as a Spy or spots as a Civilian someone who leaks as a Double agent or ambushes as a Foe.',
    hint: 'Follow Spy shadows and Civilian sightings to the target, then check if they leak as a Double agent or ambush as a Foe.',
    firstRoles: ['spy', 'civilian'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'out'
  }),
  carry({
    id: 've-12', domain: 1, title: 'Escorted by an ambusher',
    order: 'Watcher exposed — shoot anyone shadowed by a Spy or escorted by a Friend whose contact also ambushes as a Foe or signals as a Foreigner.',
    hint: 'Trace Spy shadows and Friend escorts back to the sender, then check if they ambush as a Foe or signal as a Foreigner.',
    firstRoles: ['spy', 'friend'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-13', domain: 1, title: 'Escorting a signaled contact',
    order: 'Signal in the alley: drop anyone who shadows as a Spy or escorts as a Friend someone signaled by a Foreigner or spotted by a Civilian.',
    hint: 'Follow Spy shadows and Friend escorts to the recipient, then check if a Foreigner signals or Civilian spots them.',
    firstRoles: ['spy', 'friend'], firstDir: 'out', secondRoles: ['foreigner', 'civilian'], secondDir: 'in'
  }),
  carry({
    id: 've-14', domain: 1, title: 'Watched ambusher’s quarry',
    order: 'Engage anyone ambushed by a Foe or fed a Double agent’s leak by someone shadowed by a Spy or escorted by a Friend.',
    hint: 'Trace Foe ambushes and Double agent leaks back to the sender, then check if a Spy shadows or Friend escorts them.',
    firstRoles: ['foe', 'double'], firstDir: 'in', secondRoles: ['spy', 'friend'], secondDir: 'in'
  }),
  carry({
    id: 've-15', domain: 1, title: 'Leaking to a shadowed mark',
    order: 'Dead drop watched: eliminate anyone who leaks as a Double agent or ambushes as a Foe someone shadowed by a Spy or signaled by a Foreigner.',
    hint: 'Follow Double agent leaks and Foe ambushes to the recipient, then check if a Spy shadows or Foreigner signals them.',
    firstRoles: ['double', 'foe'], firstDir: 'out', secondRoles: ['spy', 'foreigner'], secondDir: 'in'
  }),
  carry({
    id: 've-16', domain: 1, title: 'Spotted by an ambushed watcher',
    order: 'Blind-spot ambush — fire on anyone shadowed by a Spy or spotted by a Civilian whose watcher is ambushed by a Foe or signaled by a Foreigner.',
    hint: 'Trace Spy shadows and Civilian sightings back to the watcher, then check if a Foe ambushes or Foreigner signals them.',
    firstRoles: ['spy', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'in'
  }),
  carry({
    id: 've-17', domain: 1, title: 'Escorted by a signaler',
    order: 'Compromised tail: take down anyone escorted by a Friend or spotted by a Civilian whose contact also shadows as a Spy or signals as a Foreigner.',
    hint: 'Trace Friend escorts and Civilian sightings back to the sender, then check if they shadow as a Spy or signal as a Foreigner.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['spy', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-18', domain: 1, title: 'Shadowing an escorted ward',
    order: 'Watcher exposed — neutralize anyone who shadows as a Spy or leaks as a Double agent to someone escorted by a Friend or spotted by a Civilian.',
    hint: 'Follow Spy shadows and Double agent leaks to the recipient, then check if a Friend escorts or Civilian spots them.',
    firstRoles: ['spy', 'double'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'in'
  }),
  carry({
    id: 've-19', domain: 1, title: 'Ambushed by an escort',
    order: 'Take out anyone shadowed by a Spy or ambushed by a Foe whose contact also escorts as a Friend or spots as a Civilian.',
    hint: 'Trace Spy shadows and Foe ambushes back to the sender, then check if they escort as a Friend or spot as a Civilian.',
    firstRoles: ['spy', 'foe'], firstDir: 'in', secondRoles: ['friend', 'civilian'], secondDir: 'out'
  }),

  // =========================================================================
  // DOMAIN 2: Foreign Contact (10) — vouches for, pressures, tracks, leaks to, reports, recruits
  // =========================================================================
  carry({
    id: 've-20', domain: 2, title: 'Foreigner’s mole contact',
    order: 'Cross-border breach — eliminate anyone recruited by a Foreigner or reported by a Civilian whose contact leaks as a Double agent or pressures as a Foe.',
    hint: 'Trace Foreigner recruits and Civilian reports back to the sender, then check if they leak as a Double agent or pressure as a Foe.',
    firstRoles: ['foreigner', 'civilian'], firstDir: 'in', secondRoles: ['double', 'foe'], secondDir: 'out'
  }),
  carry({
    id: 've-21', domain: 2, title: 'Recruiting a mole',
    order: 'External handler: fire on anyone who recruits as a Foreigner or vouches as a Friend for someone who leaks as a Double agent or pressures as a Foe.',
    hint: 'Follow Foreigner recruits and Friend vouchers to the contact, then check if they leak as a Double agent or pressure as a Foe.',
    firstRoles: ['foreigner', 'friend'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'out'
  }),
  carry({
    id: 've-22', domain: 2, title: 'Recruiting a tracked ward',
    order: 'Border leak — take down anyone who recruits as a Foreigner or reports as a Civilian someone vouched for by a Friend or tracked by a Spy.',
    hint: 'Follow Foreigner recruits and Civilian reports to the contact, then check if a Friend vouches for or Spy tracks them.',
    firstRoles: ['foreigner', 'civilian'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'in'
  }),
  carry({
    id: 've-23', domain: 2, title: 'Recruited by a tracked outsider',
    order: 'Unreported recruitment: neutralize anyone recruited by a Foreigner or pressured by a Foe whose contact is tracked by a Spy or vouched for by a Friend.',
    hint: 'Trace Foreigner recruits and Foe pressure back to the sender, then see if a Spy tracks or Friend vouches for them.',
    firstRoles: ['foreigner', 'foe'], firstDir: 'in', secondRoles: ['spy', 'friend'], secondDir: 'in'
  }),
  carry({
    id: 've-24', domain: 2, title: 'Tracking a foreign recruit',
    order: 'Take out anyone who tracks as a Spy or pressures as a Foe someone recruited by a Foreigner or fed a Double agent’s leak.',
    hint: 'Follow Spy tracks and Foe pressure to the recipient, then check if a Foreigner recruits or Double agent leaks to them.',
    firstRoles: ['spy', 'foe'], firstDir: 'out', secondRoles: ['foreigner', 'double'], secondDir: 'in'
  }),
  carry({
    id: 've-25', domain: 2, title: 'Recruit turned voucher',
    order: 'Station asset turned: shoot anyone recruited by a Foreigner or tracked by a Spy whose contact also vouches as a Friend or reports as a Civilian.',
    hint: 'Trace Foreigner recruits and Spy tracks back to the sender, then check if they vouch as a Friend or report as a Civilian.',
    firstRoles: ['foreigner', 'spy'], firstDir: 'in', secondRoles: ['friend', 'civilian'], secondDir: 'out'
  }),
  carry({
    id: 've-26', domain: 2, title: 'Leaking to a recruit',
    order: 'Cross-border breach — drop anyone who leaks as a Double agent or reports as a Civilian someone recruited by a Foreigner or pressured by a Foe.',
    hint: 'Follow Double agent leaks and Civilian reports to the recipient, then check if a Foreigner recruits or Foe pressures them.',
    firstRoles: ['double', 'civilian'], firstDir: 'out', secondRoles: ['foreigner', 'foe'], secondDir: 'in'
  }),
  carry({
    id: 've-27', domain: 2, title: 'Vouched by a recruited source',
    order: 'External handler: engage anyone vouched for by a Friend or reported by a Civilian whose source is recruited by a Foreigner or fed a Double agent’s leak.',
    hint: 'Trace Friend vouchers and Civilian reports back to the sender, then check if a Foreigner recruits or Double agent leaks to them.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['foreigner', 'double'], secondDir: 'in'
  }),
  carry({
    id: 've-28', domain: 2, title: 'Pressured by a double source',
    order: 'Border leak — eliminate anyone pressured by a Foe or fed a Double agent’s leak by someone reported by a Civilian or tracked by a Spy.',
    hint: 'Trace Foe pressure and Double agent leaks back to the sender, then check if a Civilian reports or Spy tracks them.',
    firstRoles: ['foe', 'double'], firstDir: 'in', secondRoles: ['civilian', 'spy'], secondDir: 'in'
  }),
  carry({
    id: 've-29', domain: 2, title: 'Recruiter reaching a reported mark',
    order: 'Fire on anyone who recruits as a Foreigner or leaks as a Double agent to someone reported by a Civilian or vouched for by a Friend.',
    hint: 'Follow Foreigner recruits and Double agent leaks to the recipient, then check if a Civilian reports or Friend vouches for them.',
    firstRoles: ['foreigner', 'double'], firstDir: 'out', secondRoles: ['civilian', 'friend'], secondDir: 'in'
  }),

  // =========================================================================
  // DOMAIN 3: Civilian Tip-Offs (10) — confirms, targets, monitors, misleads, tips off, briefs
  // =========================================================================
  carry({
    id: 've-30', domain: 3, title: 'Tipped off by a deceiver',
    order: 'Street misdirection — shoot anyone tipped off by a Civilian or confirmed by a Friend whose source misleads as a Double agent or targets as a Foe.',
    hint: 'Trace Civilian tip-offs and Friend confirmations back to the sender, then check if they mislead as a Double agent or target as a Foe.',
    firstRoles: ['civilian', 'friend'], firstDir: 'in', secondRoles: ['double', 'foe'], secondDir: 'out'
  }),
  carry({
    id: 've-31', domain: 3, title: 'Tipping off a deceiver',
    order: 'Tainted brief: drop anyone who tips off as a Civilian or confirms as a Friend someone who misleads as a Double agent or briefs as a Foreigner.',
    hint: 'Follow Civilian tip-offs and Friend confirmations to the recipient, then check if they mislead as a Double agent or brief as a Foreigner.',
    firstRoles: ['civilian', 'friend'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-32', domain: 3, title: 'Tipped by a briefer or striker',
    order: 'Informant in play — engage anyone tipped off by a Civilian or monitored by a Spy whose source briefs as a Foreigner or targets as a Foe.',
    hint: 'Trace Civilian tip-offs and Spy monitors back to the sender, then check if they brief as a Foreigner or target as a Foe.',
    firstRoles: ['civilian', 'spy'], firstDir: 'in', secondRoles: ['foreigner', 'foe'], secondDir: 'out'
  }),
  carry({
    id: 've-33', domain: 3, title: 'Tipping off a monitor or confirmer',
    order: 'False warning: eliminate anyone who tips off as a Civilian or briefs as a Foreigner someone who confirms as a Friend or monitors as a Spy.',
    hint: 'Follow Civilian tip-offs and Foreigner briefings to the recipient, then check if they confirm as a Friend or monitor as a Spy.',
    firstRoles: ['civilian', 'foreigner'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'out'
  }),
  carry({
    id: 've-34', domain: 3, title: 'Confirmed by a briefed ally',
    order: 'Fire on anyone confirmed by a Friend or targeted by a Foe whose source is tipped off by a Civilian or briefed by a Foreigner.',
    hint: 'Trace Friend confirmations and Foe targets back to the sender, then check if a Civilian tips them off or Foreigner briefs them.',
    firstRoles: ['friend', 'foe'], firstDir: 'in', secondRoles: ['civilian', 'foreigner'], secondDir: 'in'
  }),
  carry({
    id: 've-35', domain: 3, title: 'Deceiving a tipped-off mark',
    order: 'Compromised witness: take down anyone who misleads as a Double agent or briefs as a Foreigner someone tipped off by a Civilian or monitored by a Spy.',
    hint: 'Follow Double agent deceptions and Foreigner briefings to the recipient, then check if a Civilian tips them off or Spy monitors them.',
    firstRoles: ['double', 'foreigner'], firstDir: 'out', secondRoles: ['civilian', 'spy'], secondDir: 'in'
  }),
  carry({
    id: 've-36', domain: 3, title: 'Tipped off by an active monitor',
    order: 'Street misdirection — neutralize anyone tipped off by a Civilian or misled by a Double agent whose source monitors as a Spy or confirms as a Friend.',
    hint: 'Trace Civilian tip-offs and Double agent deceptions back to the sender, then check if they monitor as a Spy or confirm as a Friend.',
    firstRoles: ['civilian', 'double'], firstDir: 'in', secondRoles: ['spy', 'friend'], secondDir: 'out'
  }),
  carry({
    id: 've-37', domain: 3, title: 'Monitoring a briefed contact',
    order: 'Tainted brief: take out anyone who monitors as a Spy or confirms as a Friend someone briefed by a Foreigner or targeted by a Foe.',
    hint: 'Follow Spy monitors and Friend confirmations to the recipient, then check if a Foreigner briefs or Foe targets them.',
    firstRoles: ['spy', 'friend'], firstDir: 'out', secondRoles: ['foreigner', 'foe'], secondDir: 'in'
  }),
  carry({
    id: 've-38', domain: 3, title: 'Briefed by a tipped-off source',
    order: 'Informant in play — shoot anyone briefed by a Foreigner or misled by a Double agent whose source is tipped off by a Civilian or confirmed by a Friend.',
    hint: 'Trace Foreigner briefings and Double agent deceptions back to the sender, then check if a Civilian tips them off or Friend confirms them.',
    firstRoles: ['foreigner', 'double'], firstDir: 'in', secondRoles: ['civilian', 'friend'], secondDir: 'in'
  }),
  carry({
    id: 've-39', domain: 3, title: 'Targeting a monitored mark',
    order: 'Drop anyone who targets as a Foe or misleads as a Double agent someone tipped off by a Civilian or monitored by a Spy.',
    hint: 'Follow Foe targets and Double agent deceptions to the recipient, then check if a Civilian tips them off or Spy monitors them.',
    firstRoles: ['foe', 'double'], firstDir: 'out', secondRoles: ['civilian', 'spy'], secondDir: 'in'
  }),

  // =========================================================================
  // DOMAIN 4: Proxy Chains (10) — backs, strikes, traces, relays to, warns, hands off to
  // =========================================================================
  carry({
    id: 've-40', domain: 4, title: 'Handoff to an active striker',
    order: 'Cutout exposed — take down anyone who hands off as a Foreigner or relays as a Double agent to someone who strikes as a Foe or traces as a Spy.',
    hint: 'Follow Foreigner handoffs and Double agent relays to the recipient, then check if they strike as a Foe or trace as a Spy.',
    firstRoles: ['foreigner', 'double'], firstDir: 'out', secondRoles: ['foe', 'spy'], secondDir: 'out'
  }),
  carry({
    id: 've-41', domain: 4, title: 'Two-hop relay into a proxy',
    order: 'Compromised middleman: neutralize anyone backed by a Friend or traced by a Spy whose contact is handed off to by a Foreigner or struck by a Foe.',
    hint: 'Trace Friend backing and Spy traces back to the sender, then check if a Foreigner hands off to or Foe strikes them.',
    firstRoles: ['friend', 'spy'], firstDir: 'in', secondRoles: ['foreigner', 'foe'], secondDir: 'in'
  }),
  carry({
    id: 've-42', domain: 4, title: 'Striker’s backed cutout',
    order: 'Rogue relay — take out anyone who strikes as a Foe or traces as a Spy someone who backs as a Friend or warns as a Civilian.',
    hint: 'Follow Foe strikes and Spy traces to the recipient, then check if they back as a Friend or warn as a Civilian.',
    firstRoles: ['foe', 'spy'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'out'
  }),
  carry({
    id: 've-43', domain: 4, title: 'Handoff from a traced courier',
    order: 'Intercepted handoff: shoot anyone handed off to by a Foreigner or relayed to by a Double agent whose courier is traced by a Spy or warned by a Civilian.',
    hint: 'Trace Foreigner handoffs and Double agent relays back to the courier, then see if a Spy traces or Civilian warns them.',
    firstRoles: ['foreigner', 'double'], firstDir: 'in', secondRoles: ['spy', 'civilian'], secondDir: 'in'
  }),
  carry({
    id: 've-44', domain: 4, title: 'Backing a courier chain',
    order: 'Drop anyone who backs as a Friend or traces as a Spy someone handed off to by a Foreigner or relayed to by a Double agent.',
    hint: 'Follow Friend backing and Spy traces to the recipient, then check if a Foreigner hands off or Double agent relays to them.',
    firstRoles: ['friend', 'spy'], firstDir: 'out', secondRoles: ['foreigner', 'double'], secondDir: 'in'
  }),
  carry({
    id: 've-45', domain: 4, title: 'Two-hop proxy across roles',
    order: 'Chain of proxies: engage anyone who initiates a contact toward someone who then strikes as a Foe or hands off as a Foreigner in a different role.',
    hint: 'Take any outgoing step, then check if that contact strikes as a Foe or hands off as a Foreigner in another role.',
    firstRoles: ['friend', 'spy', 'civilian', 'double'], firstDir: 'out', secondRoles: ['foe', 'foreigner'], secondDir: 'out', diffRole: true
  }),
  carry({
    id: 've-46', domain: 4, title: 'Warned proxy’s handler',
    order: 'Cutout exposed — eliminate anyone warned by a Civilian or backed by a Friend whose source is traced by a Spy or relayed to by a Double agent.',
    hint: 'Trace Civilian warnings and Friend backing back to the sender, then check if a Spy traces or Double agent relays to them.',
    firstRoles: ['civilian', 'friend'], firstDir: 'in', secondRoles: ['spy', 'double'], secondDir: 'in'
  }),
  carry({
    id: 've-47', domain: 4, title: 'Relay hitting a warned contact',
    order: 'Compromised middleman: fire on anyone who relays as a Double agent or hands off as a Foreigner to someone warned by a Civilian or struck by a Foe.',
    hint: 'Follow Double agent relays and Foreigner handoffs to the recipient, then see if a Civilian warns or Foe strikes them.',
    firstRoles: ['double', 'foreigner'], firstDir: 'out', secondRoles: ['civilian', 'foe'], secondDir: 'in'
  }),
  carry({
    id: 've-48', domain: 4, title: 'Striker’s upstream backer',
    order: 'Rogue relay — take down anyone struck by a Foe or traced by a Spy whose contact is backed by a Friend or handed off to by a Foreigner.',
    hint: 'Trace Foe strikes and Spy traces back to the sender, then check if a Friend backs or Foreigner hands off to them.',
    firstRoles: ['foe', 'spy'], firstDir: 'in', secondRoles: ['friend', 'foreigner'], secondDir: 'in'
  }),
  carry({
    id: 've-49', domain: 4, title: 'Warning an active courier',
    order: 'Neutralize anyone who warns as a Civilian or strikes as a Foe someone who relays as a Double agent or backs as a Friend.',
    hint: 'Follow Civilian warnings and Foe strikes to the recipient, then check if they relay as a Double agent or back as a Friend.',
    firstRoles: ['civilian', 'foe'], firstDir: 'out', secondRoles: ['double', 'friend'], secondDir: 'out'
  }),

  // =========================================================================
  // DOMAIN 5: Alibi & Contradiction (10) — corroborates, accuses, verifies, deceives, identifies, consults
  // =========================================================================
  carry({
    id: 've-50', domain: 5, title: 'Alibi from an accused witness',
    order: 'Colluding sources — engage anyone corroborated by a Friend or identified by a Civilian whose witness is accused by a Foe or deceived by a Double agent.',
    hint: 'Trace Friend corroborations and Civilian identifications back to the witness, then see if a Foe accuses or Double agent deceives them.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'in'
  }),
  carry({
    id: 've-51', domain: 5, title: 'Corroborating an accuser',
    order: 'Fabricated account: eliminate anyone who corroborates as a Friend or verifies as a Spy someone who accuses as a Foe or deceives as a Double agent.',
    hint: 'Follow Friend corroborations and Spy verifications to the subject, then check if they accuse as a Foe or deceive as a Double agent.',
    firstRoles: ['friend', 'spy'], firstDir: 'out', secondRoles: ['foe', 'double'], secondDir: 'out'
  }),
  carry({
    id: 've-52', domain: 5, title: 'Accused by a verified insider',
    order: 'Alibi broken — fire on anyone accused by a Foe or deceived by a Double agent whose accuser verifies as a Spy or identifies as a Civilian.',
    hint: 'Trace Foe accusations and Double agent deceptions back to the sender, then see if they verify as a Spy or identify as a Civilian.',
    firstRoles: ['foe', 'double'], firstDir: 'in', secondRoles: ['spy', 'civilian'], secondDir: 'out'
  }),
  carry({
    id: 've-53', domain: 5, title: 'Verifying a consulted contact',
    order: 'Staged corroboration: take down anyone who verifies as a Spy or identifies as a Civilian someone consulted by a Foreigner or accused by a Foe.',
    hint: 'Follow Spy verifications and Civilian identifications to the subject, then check if a Foreigner consults or Foe accuses them.',
    firstRoles: ['spy', 'civilian'], firstDir: 'out', secondRoles: ['foreigner', 'foe'], secondDir: 'in'
  }),
  carry({
    id: 've-54', domain: 5, title: 'Consulted by a deceiver',
    order: 'Neutralize anyone consulted by a Foreigner or corroborated by a Friend whose contact deceives as a Double agent or accuses as a Foe.',
    hint: 'Trace Foreigner consultations and Friend corroborations back to the sender, then check if they deceive as a Double agent or accuse as a Foe.',
    firstRoles: ['foreigner', 'friend'], firstDir: 'in', secondRoles: ['double', 'foe'], secondDir: 'out'
  }),
  carry({
    id: 've-55', domain: 5, title: 'Accusing an active verifier',
    order: 'False verification: take out anyone who accuses as a Foe or consults as a Foreigner someone who corroborates as a Friend or verifies as a Spy.',
    hint: 'Follow Foe accusations and Foreigner consultations to the subject, then check if they corroborate as a Friend or verify as a Spy.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'out'
  }),
  carry({
    id: 've-56', domain: 5, title: 'Verified by a consultant',
    order: 'Colluding sources — shoot anyone verified by a Spy or identified by a Civilian whose source consults as a Foreigner or corroborates as a Friend.',
    hint: 'Trace Spy verifications and Civilian identifications back to the sender, then check if they consult as a Foreigner or corroborate as a Friend.',
    firstRoles: ['spy', 'civilian'], firstDir: 'in', secondRoles: ['foreigner', 'friend'], secondDir: 'out'
  }),
  carry({
    id: 've-57', domain: 5, title: 'Deceiving an active verifier',
    order: 'Fabricated account: drop anyone who deceives as a Double agent or accuses as a Foe someone who verifies as a Spy or identifies as a Civilian.',
    hint: 'Follow Double agent deceptions and Foe accusations to the subject, then check if they verify as a Spy or identify as a Civilian.',
    firstRoles: ['double', 'foe'], firstDir: 'out', secondRoles: ['spy', 'civilian'], secondDir: 'out'
  }),
  carry({
    id: 've-58', domain: 5, title: 'Identified by a verified peer',
    order: 'Alibi broken — engage anyone identified by a Civilian or consulted by a Foreigner whose source is verified by a Spy or corroborated by a Friend.',
    hint: 'Trace Civilian identifications and Foreigner consultations back to the sender, then check if a Spy verifies or Friend corroborates them.',
    firstRoles: ['civilian', 'foreigner'], firstDir: 'in', secondRoles: ['spy', 'friend'], secondDir: 'in'
  }),
  carry({
    id: 've-59', domain: 5, title: 'Consulting an active witness',
    order: 'Eliminate anyone who consults as a Foreigner or deceives as a Double agent someone who corroborates as a Friend or identifies as a Civilian.',
    hint: 'Follow Foreigner consultations and Double agent deceptions to the subject, then check if they corroborate as a Friend or identify as a Civilian.',
    firstRoles: ['foreigner', 'double'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'out'
  }),

  // =========================================================================
  // DOMAIN 6: Chronology & Timing (10) — clears, strikes, logs, leaks to, corrects, meets
  // =========================================================================
  timedRule({
    id: 've-60', domain: 6, title: 'Cleared before leaking',
    order: 'Out of sequence — take out anyone cleared by a Friend or corrected by a Civilian earlier than they leaked as a Double agent or met as a Foreigner.',
    hint: 'Compare dispatch times: Friend clearance or Civilian correction must precede their Double agent leak or Foreigner meeting.',
    early: {roles: ['friend', 'civilian'], dir: 'in'}, late: {roles: ['double', 'foreigner'], dir: 'out'}
  }),
  timedRule({
    id: 've-61', domain: 6, title: 'Struck before logging',
    order: 'Post-correction move: shoot anyone struck by a Foe or met by a Foreigner earlier than a Spy logged or Friend cleared them.',
    hint: 'Compare dispatch times: Foe strike or Foreigner meeting must precede the Spy log or Friend clearance.',
    early: {roles: ['foe', 'foreigner'], dir: 'in'}, late: {roles: ['spy', 'friend'], dir: 'in'}
  }),
  timedRule({
    id: 've-62', domain: 6, title: 'Struck after clearance',
    order: 'Too late to clear — drop anyone cleared by a Friend or corrected by a Civilian earlier than a Foe struck or Foreigner met them.',
    hint: 'Compare dispatch times: Friend clearance or Civilian correction must precede the Foe strike or Foreigner meeting.',
    early: {roles: ['friend', 'civilian'], dir: 'in'}, late: {roles: ['foe', 'foreigner'], dir: 'in'}
  }),
  timedRule({
    id: 've-63', domain: 6, title: 'Leaked then logged',
    order: 'Timed betrayal: engage anyone who leaked as a Double agent or struck as a Foe earlier than a Spy logged or Civilian corrected them.',
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
    order: 'Acted after the breach: fire on anyone who clears as a Friend or corrects as a Civilian someone who later leaks as a Double agent or meets as a Foreigner.',
    hint: 'Follow a Friend clearance or Civilian correction, then check that the recipient’s Double agent or Foreigner move happened later.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'out', timeOrder: 'before'
  }),
  carry({
    id: 've-66', domain: 6, title: 'Pre-staged betrayal',
    order: 'Out of sequence — take down anyone cleared by a Friend or logged by a Spy whose source had earlier leaked as a Double agent or met as a Foreigner.',
    hint: 'Trace Friend clearance or Spy log back to the sender, then check that their Double agent or Foreigner move came earlier.',
    firstRoles: ['friend', 'spy'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'out', timeOrder: 'after'
  }),
  carry({
    id: 've-67', domain: 6, title: 'Late Spy log',
    order: 'Post-correction move: neutralize anyone logged by a Spy or corrected by a Civilian whose source had earlier been struck by a Foe or met by a Foreigner.',
    hint: 'Trace Spy logs and Civilian corrections back to the sender, then check if a Foe struck or Foreigner met them earlier.',
    firstRoles: ['spy', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'in', timeOrder: 'after'
  }),
  timedRule({
    id: 've-68', domain: 6, title: 'Corrected before foreign drop',
    order: 'Too late to clear — take out anyone corrected by a Civilian or cleared by a Friend earlier than a Foreigner met or Double agent leaked to them.',
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
  carry({
    id: 've-70', domain: 7, title: 'Alibi from a compromised source',
    order: 'Bought alibi — fire on anyone given a Friend’s alibi or Civilian’s exposure by someone compromised by a Double agent or funded by a Foreigner, sparing anyone vetted by a Spy.',
    hint: 'Trace Friend alibis and Civilian exposures back to the source, check for Double agent or Foreigner taint, then rule out Spy-vetted suspects.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),
  carry({
    id: 've-71', domain: 7, title: 'Exposed by a funded witness',
    order: 'Take down anyone exposed by a Civilian or vetted by a Spy whose source was coerced by a Foe or funded by a Foreigner; hold fire on anyone given a Friend’s alibi.',
    hint: 'Trace Civilian exposures and Spy vettings back to the source, check for Foe or Foreigner pressure, then rule out Friend-alibied suspects.',
    firstRoles: ['civilian', 'spy'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'in', exc: {roles: ['friend'], dir: 'in'}
  }),
  carry({
    id: 've-72', domain: 7, title: 'Vetted by a coerced insider',
    order: 'Coerced vetting — neutralize anyone vetted by a Spy or funded by a Foreigner whose source was coerced by a Foe or compromised by a Double agent, except anyone given a Friend’s alibi.',
    hint: 'Trace Spy vettings and Foreigner funding back to the source, check for Foe or Double agent taint, then rule out Friend-alibied suspects.',
    firstRoles: ['spy', 'foreigner'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'in', exc: {roles: ['friend'], dir: 'in'}
  }),
  carry({
    id: 've-73', domain: 7, title: 'Coerced by an exposed source',
    order: 'Poisoned source: take out anyone coerced by a Foe or funded by a Foreigner whose source was compromised by a Double agent or exposed by a Civilian — unless vetted by a Spy.',
    hint: 'Trace Foe coercion and Foreigner funding back to the source, check for Double agent or Civilian links, then exclude Spy-vetted suspects.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'in', secondRoles: ['double', 'civilian'], secondDir: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),
  carry({
    id: 've-74', domain: 7, title: 'Compromised by a vetted source',
    order: 'Shoot anyone compromised by a Double agent or coerced by a Foe whose source was funded by a Foreigner or vetted by a Spy, sparing anyone given a Friend’s alibi.',
    hint: 'Trace Double agent compromises and Foe coercions back to the source, check for Foreigner or Spy links, then exclude Friend-alibied suspects.',
    firstRoles: ['double', 'foe'], firstDir: 'in', secondRoles: ['foreigner', 'spy'], secondDir: 'in', exc: {roles: ['friend'], dir: 'in'}
  }),
  carry({
    id: 've-75', domain: 7, title: 'Funded by a coercer',
    order: 'Drop anyone funded by a Foreigner or given a Friend’s alibi by someone who coerces as a Foe or compromises as a Double agent; hold fire on anyone exposed by a Civilian.',
    hint: 'Trace Foreigner funding and Friend alibis back to the sender, check if they coerce as a Foe or compromise as a Double agent, then rule out Civilian exposures.',
    firstRoles: ['foreigner', 'friend'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'out', exc: {roles: ['civilian'], dir: 'in'}
  }),
  carry({
    id: 've-76', domain: 7, title: 'Coercing a vetted mark',
    order: 'Bought alibi — engage anyone who coerces as a Foe or funds as a Foreigner someone given a Friend’s alibi or Spy’s vetting, except anyone vetted by a Spy.',
    hint: 'Follow Foe coercion and Foreigner funding to the mark, check for Friend alibi or Spy vetting, then rule out Spy-vetted actors.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),
  carry({
    id: 've-77', domain: 7, title: 'Compromising an exposed mark',
    order: 'Dirty funding: eliminate anyone who compromises as a Double agent or coerces as a Foe someone exposed by a Civilian or given a Friend’s alibi — unless vetted by a Spy.',
    hint: 'Follow Double agent compromises and Foe coercions to the mark, check for Civilian or Friend contact, then exclude Spy-vetted actors.',
    firstRoles: ['double', 'foe'], firstDir: 'out', secondRoles: ['civilian', 'friend'], secondDir: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),
  carry({
    id: 've-78', domain: 7, title: 'Funding an exposed witness',
    order: 'Coerced vetting — fire on anyone who funds as a Foreigner or vets as a Spy someone given a Friend’s alibi or exposed by a Civilian, sparing anyone given a Friend’s alibi.',
    hint: 'Follow Foreigner funding and Spy vetting to the recipient, check for Friend or Civilian contact, then exclude Friend-alibied actors.',
    firstRoles: ['foreigner', 'spy'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'in', exc: {roles: ['friend'], dir: 'in'}
  }),
  carry({
    id: 've-79', domain: 7, title: 'Exposing a funded mark',
    order: 'Take down anyone who exposes as a Civilian or alibis as a Friend someone coerced by a Foe or funded by a Foreigner; hold fire on anyone vetted by a Spy.',
    hint: 'Follow Civilian exposures and Friend alibis to the mark, check for Foe coercion or Foreigner funding, then exclude Spy-vetted actors.',
    firstRoles: ['civilian', 'friend'], firstDir: 'out', secondRoles: ['foe', 'foreigner'], secondDir: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 8: Double Lives (10) — protects, hunts, watches, leaks to, shelters, hosts
  // =========================================================================
  carry({
    id: 've-80', domain: 8, title: 'Protector shielding a hunter',
    order: 'Shelter breached — drop anyone who protects as a Friend or watches as a Spy someone who hunts as a Foe or hosts as a Foreigner.',
    hint: 'Follow Friend protection and Spy watches to the contact, then check if they hunt as a Foe or host as a Foreigner.',
    firstRoles: ['friend', 'spy'], firstDir: 'out', secondRoles: ['foe', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-81', domain: 8, title: 'Watcher on a sheltered guest',
    order: 'Protector playing both sides: engage anyone who watches as a Spy or hunts as a Foe someone protected by a Friend or sheltered by a Civilian.',
    hint: 'Follow Spy watches and Foe hunts to the contact, then check if a Friend protects or Civilian shelters them.',
    firstRoles: ['spy', 'foe'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'in'
  }),
  carry({
    id: 've-82', domain: 8, title: 'Hunting an insider protector',
    order: 'Two masters at once — eliminate anyone who hunts as a Foe or leaks as a Double agent to someone who protects as a Friend or watches as a Spy.',
    hint: 'Follow Foe hunts and Double agent leaks to the contact, then check if they protect as a Friend or watch as a Spy.',
    firstRoles: ['foe', 'double'], firstDir: 'out', secondRoles: ['friend', 'spy'], secondDir: 'out'
  }),
  carry({
    id: 've-83', domain: 8, title: 'Hosting a protector',
    order: 'Hideout compromised: fire on anyone who hosts as a Foreigner or watches as a Spy someone who protects as a Friend or shelters as a Civilian.',
    hint: 'Follow Foreigner hosting and Spy watches to the contact, then check if they protect as a Friend or shelter as a Civilian.',
    firstRoles: ['foreigner', 'spy'], firstDir: 'out', secondRoles: ['friend', 'civilian'], secondDir: 'out'
  }),
  carry({
    id: 've-84', domain: 8, title: 'Leaking to a hunter or watcher',
    order: 'Take down anyone who leaks as a Double agent or shelters as a Civilian someone who watches as a Spy or hunts as a Foe.',
    hint: 'Follow Double agent leaks and Civilian shelter to the recipient, then check if they watch as a Spy or hunt as a Foe.',
    firstRoles: ['double', 'civilian'], firstDir: 'out', secondRoles: ['spy', 'foe'], secondDir: 'out'
  }),
  carry({
    id: 've-85', domain: 8, title: 'Protected by a hunter',
    order: 'Double life exposed: neutralize anyone protected by a Friend or sheltered by a Civilian whose protector hunts as a Foe or hosts as a Foreigner.',
    hint: 'Trace Friend protection and Civilian shelter back to the sender, then check if they hunt as a Foe or host as a Foreigner.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'out'
  }),
  carry({
    id: 've-86', domain: 8, title: 'Hunted by a shelterer',
    order: 'Shelter breached — take out anyone hunted by a Foe or hosted by a Foreigner whose contact protects as a Friend or shelters as a Civilian.',
    hint: 'Trace Foe hunts and Foreigner hosting back to the sender, then check if they protect as a Friend or shelter as a Civilian.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'in', secondRoles: ['friend', 'civilian'], secondDir: 'out'
  }),
  carry({
    id: 've-87', domain: 8, title: 'Sheltering a hunted quarry',
    order: 'Protector playing both sides: shoot anyone who watches as a Spy or shelters as a Civilian someone fed a Double agent’s leak or hunted by a Foe.',
    hint: 'Follow Spy watches and Civilian shelter to the contact, then check if a Double agent leaks to or Foe hunts them.',
    firstRoles: ['spy', 'civilian'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'in'
  }),
  carry({
    id: 've-88', domain: 8, title: 'Protecting a watched quarry',
    order: 'Two masters at once — drop anyone who protects as a Friend or hosts as a Foreigner someone watched by a Spy or hunted by a Foe.',
    hint: 'Follow Friend protection and Foreigner hosting to the contact, then check if a Spy watches or Foe hunts them.',
    firstRoles: ['friend', 'foreigner'], firstDir: 'out', secondRoles: ['spy', 'foe'], secondDir: 'in'
  }),
  carry({
    id: 've-89', domain: 8, title: 'Hunting a watched guest',
    order: 'Engage anyone who hunts as a Foe or hosts as a Foreigner someone watched by a Spy or fed a Double agent’s leak.',
    hint: 'Follow Foe hunts and Foreigner hosting to the contact, then check if a Spy watches or Double agent leaks to them.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'out', secondRoles: ['spy', 'double'], secondDir: 'in'
  }),

  // =========================================================================
  // DOMAIN 9: Command & Leverage (2-Step Anchor Relays) (10) — vouches for, targets, shadows, leaks to, tips off, meets
  // =========================================================================
  anchorCarry({
    id: 've-90', domain: 9, title: 'Two steps from {name}',
    order: 'Command breach — neutralize anyone reached in two forward steps from {name} with no direct contact with {name}.',
    hint: 'Follow who {name} reaches, then follow who those people reach — skipping direct contacts of {name}.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out',
    excludeDirect: true
  }),
  anchorCarry({
    id: 've-91', domain: 9, title: 'Two steps into {name}',
    order: 'Asset under leverage: take out anyone who reaches {name} in two forward steps with no direct contact with {name}.',
    hint: 'Work backward from {name}: who initiates toward {name}, and who initiates toward them?',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in',
    excludeDirect: true
  }),
  anchorCarry({
    id: 've-92', domain: 9, title: '{name}’s strike or border reach',
    order: 'Shadow reach — shoot anyone reached from {name} in two forward steps where the second contact is by a Foe, Foreigner, or Spy.',
    hint: 'Follow {name}’s outgoing contacts, then take a Foe, Foreigner, or Spy step.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['foe', 'foreigner', 'spy'], step2Dir: 'out'
  }),
  anchorCarry({
    id: 've-93', domain: 9, title: '{name}’s voucher or leak reach',
    order: 'Unchecked influence: drop anyone reached from {name} in two forward steps where the second contact is by a Friend, Double agent, or Civilian.',
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
    order: 'Handler compromised: eliminate anyone else reached by the same person who directly reaches {name}.',
    hint: 'Find who reaches {name}, then see who else that person reaches.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out'
  }),
  anchorCarry({
    id: 've-96', domain: 9, title: '{name}’s unbacked second-hop',
    order: 'Command breach: fire on anyone two contacts away from {name} with no direct contact with {name} — unless a Friend vouches for them.',
    hint: 'Trace two contacts from {name}, skip direct links, and rule out anyone vouched for by a Friend.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'any',
    excludeDirect: true, exc: {roles: ['friend'], dir: 'in'}
  }),
  anchorCarry({
    id: 've-97', domain: 9, title: '{name}’s unwatched second-hop',
    order: 'Asset under leverage: take down anyone two contacts away from {name} with no direct contact with {name} — unless a Spy shadows them.',
    hint: 'Trace two contacts from {name}, skip direct links, and rule out anyone shadowed by a Spy.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'any',
    excludeDirect: true, exc: {roles: ['spy'], dir: 'in'}
  }),
  anchorCarry({
    id: 've-98', domain: 9, title: 'Timed relay from {name}',
    order: 'Shadow reach — neutralize anyone reached from {name} in two forward steps where the second dispatch happened later than the first.',
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
