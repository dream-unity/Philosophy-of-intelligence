// Automatic quality has hysteresis in both directions. A paused tab, a menu,
// or a world-clock reset must not lower the budget.
export function createQualityController(fallback = false) {
  let level = 1,
    mode = 'auto',
    previous = 0,
    slowSeconds = 0,
    fastSeconds = 0;
  const floor = fallback ? 0.55 : 0.66;
  function sample(now, requested = 'auto', work = 0) {
    if (requested !== mode) {
      mode = requested;
      slowSeconds = fastSeconds = 0;
      previous = 0;
    }
    if (mode === 'low') {
      level = floor;
      return level;
    }
    if (mode === 'high') {
      level = 1;
      return level;
    }
    const gap = previous ? (now - previous) / 1000 : 0;
    previous = now;
    // A long idle gap is distinct from a genuinely costly foreground frame.
    if (gap <= 0 || (gap > 0.2 && (work < 46 || gap * 1000 > work * 4))) {
      slowSeconds = fastSeconds = 0;
      return level;
    }
    const dt = Math.min(gap, 0.2);
    // A software frame is deliberately capped at 30. Native rendering may run
    // on either a 30 Hz or a 60 Hz composited surface.
    if (dt > 0.046 || work > 31) {
      slowSeconds += dt;
      fastSeconds = 0;
    } else if (dt < 0.037 && work < 24) {
      fastSeconds += dt;
      slowSeconds = Math.max(0, slowSeconds - dt);
    } else {
      slowSeconds = Math.max(0, slowSeconds - dt * 0.35);
      fastSeconds = Math.max(0, fastSeconds - dt * 0.5);
    }
    if (slowSeconds > 0.85) {
      level = Math.max(floor, Math.round((level - 0.11) * 100) / 100);
      slowSeconds = fastSeconds = 0;
    }
    if (fastSeconds > 3.2) {
      level = Math.min(1, Math.round((level + 0.08) * 100) / 100);
      slowSeconds = fastSeconds = 0;
    }
    return level;
  }
  return {
    sample,
    get level() {
      return level;
    },
  };
}
