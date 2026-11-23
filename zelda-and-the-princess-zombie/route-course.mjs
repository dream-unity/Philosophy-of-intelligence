// A chart contains only routes the traveller has been given or surveyed. Each
// crossing joins the two banks explicitly, so a projection cannot cross the
// river through an inaccessible segment simply because its destination is near.
export function planCourse(w, map, landmarks, ground) {
  if ((!w.hasMap && w.route !== 'guided') || (w.gateClosedAt != null && !w.gateCrossed && w.lastBellCastAt == null)) return null;
  const p = [w.player.x, w.player.z],
    spot = (id) => landmarks.find((s) => s.id === id);
  const well = w.hasMap && !w.antidote && !w.ropeFallen && !w.gateCrossed && p[1] < 1035,
    goal = spot(well ? 'chapel' : 'hall'),
    end = [goal.x, goal.z];
  const fordKnown = w.hasMap || w.survey?.visits?.ford,
    graph = new Map(),
    segments = new Map();
  const key = (q) => q.join(','),
    dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], ground(...b) - ground(...a));
  function edge(a, b, via = [], crossing = '', both = true) {
    const from = key(a),
      to = key(b);
    if (from === to) return;
    const points = [a, ...via, b];
    let metres = 0;
    for (let i = 1; i < points.length; i++) metres += dist(points[i - 1], points[i]);
    const exits = graph.get(from) || [];
    exits.push({ to, points: points.slice(1), metres, crossing });
    graph.set(from, exits);
    if (!graph.has(to)) graph.set(to, []);
    if (both) edge(b, a, [...via].reverse(), crossing, false);
  }
  function path(name, points) {
    const lines = segments.get(name) || [];
    for (let i = 1; i < points.length; i++) {
      edge(points[i - 1], points[i]);
      lines.push([points[i - 1], points[i]]);
    }
    segments.set(name, lines);
  }
  const south = [30, 990],
    north = [30, 1045],
    fordSouth = [-125, 1007],
    fordNorth = [-125, 1035];
  path(
    'road',
    map.road.filter((q) => q[1] <= south[1])
  );
  path(
    'road',
    map.road.filter((q) => q[1] >= north[1])
  );
  const contacts = ['low', 'high', 'mid'].slice(Math.min(3, w.bells?.length || 0)).map((t) => {
    const a = w.actors?.find((o) => o.type === 'bell' && o.tone === t);
    return [a?.x ?? { low: 19, mid: 30, high: 41 }[t], (a?.z ?? 996) - 1.7];
  });
  const bridgeWay = [
    [30, 1007],
    [30, 1035],
  ];
  if (w.bridgeOpen) {
    path('road', [south, ...bridgeWay, north]);
  } else {
    edge(south, north, [...contacts, ...bridgeWay], 'sluice', false);
    if (p[1] >= 980 && p[1] < 1010 && Math.abs(p[0] - 30) < 24)
      edge(p, north, [...contacts, ...bridgeWay], 'sluice', false);
  }
  if (fordKnown) {
    path('riverbank', [south, [30, 1006], fordSouth]);
    path('riverbank', [fordNorth, [30, 1037], north]);
    const stones = Array.from({ length: 16 }, (_, i) => [-125 + Math.sin(i * 0.45) * 0.55, 1008 + i * 1.76]);
    edge(fordSouth, fordNorth, stones, 'ford');
    if (w.hasMap) {
      const a = map.trail.filter((q) => q[1] < 1010),
        b = map.trail.filter((q) => q[1] > 1032);
      path('pale', [...a, fordSouth]);
      path('pale', [fordNorth, ...b, [30, 1435], end[1] > 1435 ? end : [30, 1516]]);
      if (well && !graph.has(key(end))) path('pale', [a.at(-1), end]);
    }
  }
  const bank = (z) => (z < 1010 ? -1 : z > 1032 ? 1 : 0);
  // Put the player on the nearest reachable segment of each known path.
  // Crossing water to join a segment on the opposite bank is forbidden.
  const anchors = [];
  for (const lines of segments.values()) {
    let best = null;
    for (const [a, b] of lines) {
      const dx = b[0] - a[0],
        dz = b[1] - a[1],
        t = Math.min(1, Math.max(0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)));
      const q = [a[0] + t * dx, a[1] + t * dz],
        bp = bank(p[1]),
        bq = bank(q[1]);
      if (bp && bp !== bq) continue;
      const distance = dist(p, q);
      if (!best || distance < best.d) best = { a, b, q, d: distance };
    }
    if (best) anchors.push(best);
  }
  const nearest = Math.min(...anchors.map((a) => a.d));
  for (const a of anchors)
    if (a.d <= Math.max(20, nearest + 3)) {
      edge(p, a.q, [], '', false);
      edge(a.q, a.a, [], '', false);
      edge(a.q, a.b, [], '', false);
    }
  if (!bank(p[1])) {
    if (w.bridgeOpen && Math.abs(p[0] - 30) < 10) edge(p, north, [[30, 1035]], 'bridge', false);
    if (fordKnown && Math.abs(p[0] + 125) < 2) {
      edge(p, fordNorth, [], 'ford', false);
      edge(p, fordSouth, [], 'ford', false);
    }
  }
  const start = key(p),
    finish = key(end),
    cost = new Map([[start, 0]]),
    previous = new Map(),
    seen = new Set();
  for (;;) {
    let id = null,
      minimum = Infinity;
    for (const [k, d] of cost)
      if (!seen.has(k) && d < minimum) {
        minimum = d;
        id = k;
      }
    if (id === null || id === finish) break;
    seen.add(id);
    for (const e of graph.get(id) || [])
      if (minimum + e.metres < (cost.get(e.to) ?? Infinity)) {
        cost.set(e.to, minimum + e.metres);
        previous.set(e.to, { id, e });
      }
  }
  if (!cost.has(finish)) return null;
  const legs = [];
  for (let node = finish; node !== start; ) {
    const hit = previous.get(node);
    if (!hit) return null;
    legs.push(hit.e);
    node = hit.id;
  }
  legs.reverse();
  const points = [p, ...legs.flatMap((l) => l.points)],
    q = points.find((v) => Math.hypot(v[0] - p[0], v[1] - p[1]) > 0.8) || end;
  return {
    metres: Math.round(cost.get(finish)),
    bearing: Math.atan2(q[0] - p[0], q[1] - p[1]),
    points,
    crossing: legs.find((l) => l.crossing)?.crossing || '',
    goal: goal.id,
  };
}
