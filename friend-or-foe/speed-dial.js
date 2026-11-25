import {fastestCrossingSeconds} from './arcade-range.js?v=speed';

export function bindSpeedDial(input, value, hint) {
  const min = Number(input.min), max = Number(input.max), step = Number(input.step);
  const sweep = 270;
  let drag = null;

  function render() {
    const speed = input.valueAsNumber;
    const seconds = Number(fastestCrossingSeconds(speed).toFixed(1));
    value.textContent = speed + '×';
    hint.textContent = 'First arrival in ' + seconds + ' s';
    input.setAttribute('aria-valuetext', speed === 1 ? 'Normal speed' : speed + ' times normal speed');
    input.parentElement.style.setProperty('--sweep', ((speed - min) / (max - min)) * sweep + 'deg');
  }

  function setAngle(angle) {
    const bounded = Math.min(sweep, Math.max(0, angle));
    const ticks = Math.round(bounded / sweep * (max - min) / step);
    input.value = String(min + ticks * step);
    render();
    return bounded;
  }

  function bearing(event) {
    return Math.atan2(event.clientX - drag.x, drag.y - event.clientY) * 180 / Math.PI;
  }

  input.addEventListener('input', render);
  input.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    input.focus({preventScroll: true});
    input.setPointerCapture(event.pointerId);
    const box = input.getBoundingClientRect();
    const x = box.left + box.width / 2, y = box.top + box.height / 2;
    // A thumb starting near the centre can drag straight up or down.
    const vertical = Math.hypot(event.clientX - x, event.clientY - y) < box.width / 4;
    drag = {id: event.pointerId, x, y, vertical, lastY: event.clientY,
      angle: (input.valueAsNumber - min) / (max - min) * sweep};
    drag.lastBearing = bearing(event);
    if (!vertical) drag.angle = setAngle(drag.lastBearing + sweep / 2);
  });
  input.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    if (drag.vertical) {
      drag.angle = setAngle(drag.angle + (drag.lastY - event.clientY) * 2);
      drag.lastY = event.clientY;
    } else {
      const current = bearing(event);
      const delta = (current - drag.lastBearing + 540) % 360 - 180;
      drag.angle = setAngle(drag.angle + delta);
      drag.lastBearing = current;
    }
  });
  input.addEventListener('lostpointercapture', () => { drag = null; });
  render();
}
