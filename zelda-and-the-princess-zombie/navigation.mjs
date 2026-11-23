import { LANDMARKS } from './geography.mjs';
import { rankPosition } from './world.mjs';
import { livingLead } from './host-vanguard.mjs';
const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export const compassPoint = (a) => directions[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
export function bearing(p, q) {
  return Math.atan2(q.x - p.x, q.z - p.z);
}
export const hasDirections = (w) => w.route === 'guided' || Boolean(w.hasMap);
export function survey(w) {
  const field = (w.survey ||= { visits: {}, trace: [], pins: [] });
  const p = w.player,
    last = field.trace.at(-1);
  if (!last || Math.hypot(p.x - last[0], p.z - last[1]) > 33) {
    field.trace.push([Math.round(p.x), Math.round(p.z)]);
    if (field.trace.length > 400) field.trace.splice(1, 1);
  }
  for (const site of LANDMARKS) {
    if (Math.hypot(p.x - site.x, p.z - site.z) < (site.id === 'gate' ? 31 : site.id === 'hall' ? 15 : 22))
      field.visits[site.id] = true;
  }
  return field;
}
const castleNotes = [
  { id: 'gallery', name: 'Bellfounder’s stair', x: 18, z: 1441 },
  { id: 'galleryOpen', name: 'Listening shutters', x: 9, z: 1460 },
  { id: 'register', name: 'Keeper’s register', x: 40, z: 1473 },
  { id: 'banquet', name: 'Banquet hall', x: 30, z: 1516 },
];
export function knownLandmarks(w) {
  const field = survey(w);
  const remembered = new Set((w.journal || []).map((item) => item.id));
  return [
    ...LANDMARKS.filter(
      (s) =>
        field.visits[s.id] || (!s.secret && hasDirections(w) && s.id !== 'hall') || (s.secret && w.hasMap)
    ),
    ...castleNotes.filter((s) => remembered.has(s.id)),
  ];
}
export function raceFront(w) {
  const lead = livingLead(w);
  if (!lead) return null;
  if (w.gateClosedAt != null) return rankPosition(w, lead.i, true);
  const relief = w.gateRelief;
  const reliefAvailable = relief && !w.hostFallen?.[relief.i] && !w.hostActors?.[relief.i];
  return rankPosition(w, lead.offset && reliefAvailable ? relief.i : lead.i);
}
export function describeRace(w, progress, front = raceFront(w)) {
  if (w.lastBellCastAt != null) return 'The march has fallen silent.';
  if (w.ropeFallen) return 'The host is turning away.';
  if (w.route === 'undecided' && !w.greeted && !w.milestones?.ridge) return '';
  if (w.milestones?.guestsAtTable) return 'The first guests have reached Xero’s table.';
  if (w.gateClosedAt != null) return 'The vanguard has reached the castle gate.';
  if (!front) return 'The march on the gate has stopped.';
  if (w.hostPauseUntil > w.elapsed) return 'The first rank has stopped to listen.';
  if (Math.hypot(front.x - 30, front.z - 1435) < 38) return 'The front rank is on the last ramp to the gate.';
  if (front.z > 1300) return 'The host is climbing the castle approach.';
  if (front.x > -100) return 'The host is crossing the downs.';
  return 'The host is marching from the west.';
}

export function hostReport(w, front) {
  if (w.lastBellCastAt != null) return 'No boots answer the castle bell.';
  const field = survey(w),
    seen = w.milestones?.ridge || w.milestones?.procession || field.visits.downs || w.journal?.some((n) => n.id === 'procession');
  if (w.ropeFallen) return seen ? 'The host has turned away from the gate.' : '';
  const sighting = lastWalkerSighting(w);
  const gap = sighting && Math.round(Math.hypot(sighting.x - w.player.x, sighting.z - w.player.z));
  const local = sighting
    ? 'Last sighting of a lone walker: ' + (gap < 5 ? 'here.' : gap + ' metres ' + compassPoint(bearing(w.player, sighting)) + ' of you.')
    : '';
  if (!seen || !front) return local;
  const refs = [
    ['you', w.player],
    ['the gate', LANDMARKS.find((s) => s.id === 'gate')],
  ];
  if (w.hasMap || field.visits.ford) refs.push(['Pale Ford', LANDMARKS.find((s) => s.id === 'ford')]);
  return (
    'Front rank: ' +
    refs
      .map(([name, site]) => {
        const d = Math.round(Math.hypot(front.x - site.x, front.z - site.z));
        return d < 8 ? 'at ' + name : d + ' metres ' + compassPoint(bearing(site, front)) + ' of ' + name;
      })
      .join(', ') +
    '.' + (local ? ' ' + local : '')
  );
}
export function lastWalkerSighting(w) {
  const q = w.hostSighting;
  return q && Number.isFinite(q.x) && Number.isFinite(q.z) && !w.ropeFallen && !w.hostFallen?.[q.id] ? q : null;
}
export function bridgeReport(w) {
  if (!w.bridgeOpen) return 'Lowered. The sluice must be operated before the road can cross.';
  if (w.bridgeRaisedAt != null && w.elapsed - w.bridgeRaisedAt < 1.8 * 0.95)
    return 'Rising. Wait for the deck to meet the bank.';
  return 'Raised. The road crosses the river.';
}
