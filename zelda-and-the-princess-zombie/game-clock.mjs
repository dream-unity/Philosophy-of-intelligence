import { tick, arrivalView } from './world.mjs';

const step = 1 / 30;
const frames = new WeakMap();

export function resetPresentation(world) {
  if (world) frames.delete(world);
}

function samples(world) {
  let state = frames.get(world);
  if (!state || state.player !== world.player) {
    // Keep one display world per journey so terrain and procession caches survive
    // successive frames. Prototypes expose current actors/items without copying them.
    const display = Object.create(world);
    display.player = Object.create(world.player);
    Object.defineProperties(display, {
      renderSource: { value: world },
      viewAspect: {
        get: () => world.viewAspect,
        set: (aspect) => {
          world.viewAspect = aspect;
        },
      },
    });
    state = { player: world.player, display, at: -Infinity, deltaYaw: 0, deltaPitch: 0 };
    frames.set(world, state);
  }
  return state;
}

// A foreground stall repays elapsed time in bounded batches. Physics remains
// authoritative for collisions, close finishes and hits irrespective of display Hz.
export function advanceGameClock(world, delta, remaining, input, pitchAxis = 0) {
  if (world.dialogue || world.ending || world.mapOpen) return 0;
  const state = samples(world),
    p = world.player;
  let debt = remaining + Math.max(0, Number.isFinite(delta) ? delta : 0);
  for (let n = 0; debt + 1e-8 >= step && n < 45; n++) {
    state.x = p.x;
    state.z = p.z;
    state.feetY = p.feetY;
    state.bob = p.gaitOffset || 0;
    const yaw = p.yaw,
      pitch = p.pitch;
    tick(world, step, input);
    debt -= step;
    if (world.dialogue || world.ending) {
      state.at = -Infinity;
      return 0;
    }
    if (!world.sequence && pitchAxis) {
      p.pitch = Math.max(-1.03, Math.min(1.04, p.pitch + pitchAxis * step * 1.25));
    }
    state.deltaYaw = p.yaw - yaw;
    state.deltaPitch = p.pitch - pitch;
    state.at = world.elapsed;
  }
  return Math.max(0, debt);
}

// Physics samples 30 times per second. Render between resolved positions, never
// extrapolate through a wall. Only fixed-step turning is delayed; a look gesture
// delivered between updates appears immediately on the very next picture.
export function presentationWorld(world, remaining) {
  const arrival = arrivalView(world);
  if (arrival !== world || world.sequence || world.dialogue || world.ending || world.mapOpen) return arrival;
  const state = samples(world);
  if (state.at !== world.elapsed) return world;
  const p = world.player,
    view = state.display,
    eye = view.player;
  const lag = 1 - Math.max(0, Math.min(1, remaining / step));
  eye.x = p.x - (p.x - state.x) * lag;
  eye.z = p.z - (p.z - state.z) * lag;
  eye.feetY = p.feetY - (p.feetY - state.feetY) * lag;
  eye.gaitOffset = (p.gaitOffset || 0) * (1 - lag) + state.bob * lag;
  eye.yaw = p.yaw - state.deltaYaw * lag;
  eye.pitch = p.pitch - state.deltaPitch * lag;
  view.elapsed = Math.max(0, world.elapsed - lag * step);
  return view;
}
