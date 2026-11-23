import { LANDMARKS } from './geography.mjs';
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
export function describeRace(w, progress) {
  if (w.ropeFallen) return 'The host is turning away.';
  if (w.route === 'undecided' && !w.greeted && !w.milestones?.ridge) return '';
  if (progress > 0.9) return 'The first ranks are approaching the gate.';
  if (progress > 0.7) return 'The host is on the castle approach.';
  if (progress > 0.4) return 'The host has crossed the downs.';
  return 'The host is marching from the west.';
}
