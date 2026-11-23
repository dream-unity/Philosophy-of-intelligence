// Keep a short-lived picture of the fall, separate from the roster used by combat.
export function fallenWitnesses(world, impact, nearby, rankPosition) {
  const { player } = world;
  const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
  function priority(body) {
    const dx = body.x - player.x, dz = body.z - player.z;
    const depth = dx * sin + dz * cos;
    const inView = depth > 0 && Math.abs(dx * cos - dz * sin) < depth * 1.7 + 1;
    return (inView ? 0 : 80) + Math.hypot(dx, dz) + 0.3 * Math.hypot(body.x - impact.x, body.z - impact.z);
  }
  const later = Object.create(world);
  later.elapsed = world.elapsed + 0.4;
  return nearby.map(body => ({body, priority: priority(body)}))
    .sort((a, b) => a.priority - b.priority || a.body.i - b.body.i)
    .slice(0, 32)
    .map(({body}) => {
      let heading = body.heading;
      if (!Number.isFinite(heading)) {
        const next = rankPosition(later, body.i);
        heading = Math.atan2(next.x - body.x, next.z - body.z);
      }
      return {i: body.i, x: body.x, z: body.z, heading};
    });
}
