import { tick } from './world.mjs';

// The renderer may drop a frame, but the host, sword and footsteps still share
// the same fixed simulation clock. A long foreground stall repays its time over
// subsequent frames without locking the UI in one unbounded loop.
export function advanceGameClock(world, delta, remaining, input, pitchAxis = 0) {
  if (world.dialogue || world.ending || world.mapOpen) return 0;
  const step = 1 / 30;
  let debt = remaining + Math.max(0, Number.isFinite(delta) ? delta : 0);
  for (let n = 0; debt + 1e-8 >= step && n < 45; n++) {
    tick(world, step, input);
    debt -= step;
    if (world.dialogue || world.ending) return 0;
    if (!world.sequence && pitchAxis) {
      world.player.pitch = Math.max(-1.03, Math.min(1.04, world.player.pitch + pitchAxis * step * 1.25));
    }
  }
  return Math.max(0, debt);
}
