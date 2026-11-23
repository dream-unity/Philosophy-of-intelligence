import { roadFileIds, castleGuests, stragglerSchedule } from './procession.mjs';

const files = 48,
  ranks = 64;
// Detached files can be far from their neighbours. Test them even when
// a spear-length or a thrown bottle is nowhere near the main procession.
const detached = new Set(roadFileIds);
for (let row = 0; row < ranks; row++) {
  for (const file of [46, 47]) {
    const i = row * files + file;
    if (stragglerSchedule(i)) detached.add(i);
  }
}

/** Living bodies inside a world-space disc, whether marching or pursuing. */
export function hostWithin(w, centre, radius, rankAt) {
  if (w.lastBellCastAt != null || w.ropeFallen) return [];
  const actors = w.hostActors,
    fallen = w.hostFallen,
    found = [];
  const outOfRank = new Set(castleGuests(w));
  if (w.gateRelief) outOfRank.add(w.gateRelief.i);
  const radius2 = radius * radius;
  function add(q, i) {
    if ((q.x - centre.x) ** 2 + (q.z - centre.z) ** 2 <= radius2) found.push({ ...q, i });
  }
  function sample(i) {
    if (!actors?.[i] && !fallen?.[i]) add(rankAt(w, i), i);
  }
  if (actors) {
    for (const q of Object.values(actors)) if (!fallen?.[q.i] && q.hp > 0) add(q, q.i);
  }
  for (const i of detached) sample(i);
  for (const i of outOfRank) if (!detached.has(i)) sample(i);
  // The main column stays on the northern plain. A normal row is at most
  // 24 lanes wide on either side, with space for sidesteps and the broken cart.
  if (centre.z + radius < 1000) return found;
  const rowReach2 = (radius + 32) ** 2;
  for (let row = 0; row < ranks; row++) {
    const first = row * files,
      anchor = rankAt(w, first, true);
    if ((anchor.x - centre.x) ** 2 + (anchor.z - centre.z) ** 2 > rowReach2) continue;
    for (let i = first; i < first + files; i++) {
      if (!detached.has(i) && !outOfRank.has(i)) sample(i);
    }
  }
  return found;
}
