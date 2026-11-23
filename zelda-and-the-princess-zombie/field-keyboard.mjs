import { actionForKey } from './control-layout.mjs';

const motionKeys = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  KeyD: 'right',
  ArrowLeft: 'turnLeft',
  ArrowRight: 'turnRight',
  KeyI: 'lookUp',
  PageUp: 'lookUp',
  KeyK: 'lookDown',
  PageDown: 'lookDown',
  ShiftLeft: 'pace',
  ShiftRight: 'pace',
  AltLeft: 'walk',
  AltRight: 'walk',
};

const continuous = new Set(['run', ...Object.values(motionKeys)]);

export function createFieldKeyboard() {
  // Track physical switches individually: releasing the number row must not
  // release an action that is also held on a separate keyboard or numpad.
  const held = new Map();
  const downAt = new Map();
  const taps = new Map();
  let sprintPress = null;
  const active = (id) => {
    for (const action of held.values()) if (action === id) return true;
    return false;
  };
  function press(layout, code, time, repeat = false) {
    const action = actionForKey(layout, code) || motionKeys[code];
    if (!action) return null;
    if (repeat || held.has(code)) return { action, fresh: false };
    held.set(code, action);
    if (action === 'forward') {
      const lastRelease = taps.get(code);
      if (Number.isFinite(lastRelease) && time >= lastRelease && time - lastRelease <= 290)
        sprintPress = code;
      taps.delete(code);
      downAt.set(code, time);
    }
    if (action === 'back') {
      taps.clear();
      sprintPress = null;
    }
    return { action, fresh: true };
  }
  function release(code, time) {
    const action = held.get(code);
    if (action === 'forward') {
      // Only a short, completed first press arms the next one. Browser
      // autorepeat and a W held through a long jog are not double taps.
      if (!active('back') && time - downAt.get(code) <= 260 && sprintPress !== code) taps.set(code, time);
      if (sprintPress === code) sprintPress = null;
      downAt.delete(code);
    }
    return held.delete(code);
  }
  function reset() {
    held.clear();
    downAt.clear();
    taps.clear();
    sprintPress = null;
  }
  function sprinting() {
    return active('run') || active('pace') || sprintPress !== null;
  }
  function sample(stick, touchForward, touchSprint) {
    const forwards = active('forward'),
      backwards = active('back');
    const strafe = stick.strafe + Number(active('right')) - Number(active('left'));
    let forward = stick.forward + Number(forwards) - Number(backwards);
    // Give a held Run its own forward axis. Sideways steering keeps that
    // momentum; a backward direction or opposed W/S takes precedence.
    if (!forwards && !backwards && stick.forward >= -0.18 && (active('run') || touchForward)) forward = 1;
    return {
      forward,
      strafe,
      turn: Number(active('turnRight')) - Number(active('turnLeft')),
      sprint: touchSprint || sprinting(),
      walk: active('walk'),
      pitch: Number(active('lookUp')) - Number(active('lookDown')),
    };
  }
  return { press, release, reset, sample, sprinting };
}

export function isHeldAction(action) {
  return continuous.has(action);
}
